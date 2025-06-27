import { Service, elizaLogger } from '@elizaos/core';
import type { IAgentRuntime, UUID } from '@elizaos/core';
import { WebSocketServer, WebSocket } from 'ws';
import { createServer, Server as HTTPServer } from 'http';
import type { RoomState, RoomMessage } from './E2BAgentOrchestrator.ts';

interface AgentConnection {
  ws: WebSocket;
  agentId: UUID;
  roomId: string;
  role: string;
  lastHeartbeat: Date;
  isAlive: boolean;
}

interface WSMessage {
  type: 'register' | 'message' | 'heartbeat' | 'room-update' | 'request' | 'response';
  agentId?: UUID;
  roomId?: string;
  role?: string;
  content?: any;
  messageId?: string;
  correlationId?: string;
  timestamp: Date;
}

/**
 * WebSocket Server for Agent Communication
 * Enables real-time communication between E2B sandboxed agents
 */
export class WebSocketAgentServer extends Service {
  static _serviceName = 'websocket-agent-server';
  static serviceType = 'communication' as const;

  private server: HTTPServer | null = null;
  private wss: WebSocketServer | null = null;
  private connections: Map<UUID, AgentConnection> = new Map();
  private rooms: Map<string, Set<UUID>> = new Map();
  private messageQueue: Map<UUID, WSMessage[]> = new Map();
  private heartbeatInterval: NodeJS.Timeout | null = null;

  private port: number;
  private host: string;

  capabilityDescription = 'WebSocket server for real-time agent communication and coordination';

  constructor(_runtime?: IAgentRuntime) {
    super(_runtime);
    this.port = parseInt(_runtime?.getSetting('WEBSOCKET_PORT') || '8080');
    this.host = _runtime?.getSetting('WEBSOCKET_HOST') || '0.0.0.0';
  }

  static async start(_runtime: IAgentRuntime): Promise<WebSocketAgentServer> {
    const service = new WebSocketAgentServer(_runtime);
    await service.initialize();
    elizaLogger.info('WebSocketAgentServer started successfully');
    return service;
  }

  private async initialize(): Promise<void> {
    try {
      // Create HTTP server
      this.server = createServer();

      // Create WebSocket server
      this.wss = new WebSocketServer({ server: this.server });

      // Set up WebSocket event handlers
      this.wss.on('connection', this.handleConnection.bind(this));

      // Start the server
      await new Promise<void>((resolve, reject) => {
        this.server!.listen(this.port, this.host, () => {
          elizaLogger.info(`WebSocket server listening on ${this.host}:${this.port}`);
          resolve();
        });
        this.server!.on('error', reject);
      });

      // Start heartbeat monitoring
      this.startHeartbeatMonitoring();

      elizaLogger.info('WebSocket Agent Server initialized');
    } catch (_error) {
      elizaLogger.error('Failed to initialize WebSocketAgentServer:', _error);
      throw _error;
    }
  }

  private handleConnection(ws: WebSocket, request: any): void {
    elizaLogger.info('New WebSocket connection', {
      ip: request.socket.remoteAddress,
      url: request.url,
    });

    let agentConnection: AgentConnection | null = null;

    ws.on('message', async (data: Buffer) => {
      try {
        const message: WSMessage = JSON.parse(data.toString());
        message.timestamp = new Date(message.timestamp);

        switch (message.type) {
          case 'register':
            agentConnection = await this.handleRegister(ws, message);
            break;

          case 'message':
            if (agentConnection) {
              await this.handleMessage(agentConnection, message);
            }
            break;

          case 'heartbeat':
            if (agentConnection) {
              agentConnection.lastHeartbeat = new Date();
              agentConnection.isAlive = true;
              this.sendToAgent(agentConnection.agentId, {
                type: 'heartbeat',
                timestamp: new Date(),
              });
            }
            break;

          case 'room-update':
            if (agentConnection) {
              await this.handleRoomUpdate(agentConnection, message);
            }
            break;

          case 'request':
            if (agentConnection) {
              await this.handleRequest(agentConnection, message);
            }
            break;

          case 'response':
            if (agentConnection) {
              await this.handleResponse(agentConnection, message);
            }
            break;
        }
      } catch (error) {
        elizaLogger.error('Error handling WebSocket message:', error);
        ws.send(
          JSON.stringify({
            type: 'error',
            error: error instanceof Error ? error.message : 'Unknown error',
            timestamp: new Date(),
          })
        );
      }
    });

    ws.on('close', () => {
      if (agentConnection) {
        this.handleDisconnect(agentConnection);
      }
    });

    ws.on('error', (error) => {
      elizaLogger.error('WebSocket error:', error);
    });

    // Send welcome message
    ws.send(
      JSON.stringify({
        type: 'welcome',
        message: 'Connected to ElizaOS Agent Communication Server',
        timestamp: new Date(),
      })
    );
  }

  private async handleRegister(ws: WebSocket, message: WSMessage): Promise<AgentConnection> {
    const { agentId, roomId, role } = message;

    if (!agentId || !roomId || !role) {
      throw new Error('Missing required registration fields');
    }

    elizaLogger.info('Registering agent', { agentId, roomId, role });

    // Create agent connection
    const connection: AgentConnection = {
      ws,
      agentId,
      roomId,
      role,
      lastHeartbeat: new Date(),
      isAlive: true,
    };

    // Store connection
    this.connections.set(agentId, connection);

    // Add to room
    if (!this.rooms.has(roomId)) {
      this.rooms.set(roomId, new Set());
    }
    this.rooms.get(roomId)!.add(agentId);

    // Send registration confirmation
    ws.send(
      JSON.stringify({
        type: 'registered',
        agentId,
        roomId,
        role,
        timestamp: new Date(),
      })
    );

    // Notify room members
    await this.broadcastToRoom(
      roomId,
      {
        type: 'agent-joined',
        agentId,
        role,
        timestamp: new Date(),
      },
      agentId
    );

    // Send any queued messages
    const queuedMessages = this.messageQueue.get(agentId) || [];
    for (const msg of queuedMessages) {
      ws.send(JSON.stringify(msg));
    }
    this.messageQueue.delete(agentId);

    return connection;
  }

  private async handleMessage(connection: AgentConnection, message: WSMessage): Promise<void> {
    const { content } = message;

    elizaLogger.debug('Handling message from agent', {
      agentId: connection.agentId,
      type: message.type,
    });

    // Create room message
    const roomMessage: RoomMessage = {
      id: `msg-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
      fromAgentId: connection.agentId,
      content: content?.text || JSON.stringify(content),
      type: 'update',
      timestamp: new Date(),
      metadata: content,
    };

    // Broadcast to room
    await this.broadcastToRoom(
      connection.roomId,
      {
        type: 'message',
        message: roomMessage,
        timestamp: new Date(),
      },
      connection.agentId
    );

    // Store in room state if orchestrator is available
    const orchestrator = this.runtime?.getService('e2b-agent-orchestrator') as any;
    if (orchestrator) {
      const roomState = await orchestrator.getRoomState(connection.roomId);
      if (roomState) {
        roomState.messages.push(roomMessage);
        // Keep only last 100 messages
        if (roomState.messages.length > 100) {
          roomState.messages = roomState.messages.slice(-100);
        }
      }
    }
  }

  private async handleRoomUpdate(connection: AgentConnection, message: WSMessage): Promise<void> {
    const { content } = message;

    elizaLogger.debug('Handling room update from agent', {
      agentId: connection.agentId,
      updateType: content?.updateType,
    });

    // Broadcast room update to all members
    await this.broadcastToRoom(connection.roomId, {
      type: 'room-update',
      agentId: connection.agentId,
      update: content,
      timestamp: new Date(),
    });
  }

  private async handleRequest(connection: AgentConnection, message: WSMessage): Promise<void> {
    const { content, messageId } = message;

    elizaLogger.debug('Handling request from agent', {
      agentId: connection.agentId,
      messageId,
      requestType: content?.type,
    });

    // Find target agent
    const targetAgentId = content?.targetAgentId;
    if (targetAgentId) {
      const targetConnection = this.connections.get(targetAgentId);
      if (targetConnection) {
        // Forward request to target agent
        targetConnection.ws.send(
          JSON.stringify({
            type: 'request',
            fromAgentId: connection.agentId,
            messageId,
            content,
            timestamp: new Date(),
          })
        );
      } else {
        // Queue message if target is offline
        if (!this.messageQueue.has(targetAgentId)) {
          this.messageQueue.set(targetAgentId, []);
        }
        this.messageQueue.get(targetAgentId)!.push(message);
      }
    } else {
      // Broadcast request to all room members if no specific target
      await this.broadcastToRoom(connection.roomId, message, connection.agentId);
    }
  }

  private async handleResponse(connection: AgentConnection, message: WSMessage): Promise<void> {
    const { content, correlationId } = message;

    elizaLogger.debug('Handling response from agent', {
      agentId: connection.agentId,
      correlationId,
    });

    // Find the original requester
    const targetAgentId = content?.targetAgentId;
    if (targetAgentId && correlationId) {
      const targetConnection = this.connections.get(targetAgentId);
      if (targetConnection) {
        targetConnection.ws.send(
          JSON.stringify({
            type: 'response',
            fromAgentId: connection.agentId,
            correlationId,
            content,
            timestamp: new Date(),
          })
        );
      }
    }
  }

  private handleDisconnect(connection: AgentConnection): void {
    elizaLogger.info('Agent disconnected', {
      agentId: connection.agentId,
      roomId: connection.roomId,
    });

    // Remove from connections
    this.connections.delete(connection.agentId);

    // Remove from room
    const room = this.rooms.get(connection.roomId);
    if (room) {
      room.delete(connection.agentId);
      if (room.size === 0) {
        this.rooms.delete(connection.roomId);
      }
    }

    // Notify room members
    this.broadcastToRoom(
      connection.roomId,
      {
        type: 'agent-left',
        agentId: connection.agentId,
        role: connection.role,
        timestamp: new Date(),
      },
      connection.agentId
    );
  }

  private async broadcastToRoom(
    roomId: string,
    message: any,
    excludeAgentId?: UUID
  ): Promise<void> {
    const room = this.rooms.get(roomId);
    if (!room) return;

    const messageStr = JSON.stringify(message);

    for (const agentId of room) {
      if (agentId !== excludeAgentId) {
        const connection = this.connections.get(agentId);
        if (connection && connection.ws.readyState === WebSocket.OPEN) {
          connection.ws.send(messageStr);
        }
      }
    }
  }

  private sendToAgent(agentId: UUID, message: any): void {
    const connection = this.connections.get(agentId);
    if (connection && connection.ws.readyState === WebSocket.OPEN) {
      connection.ws.send(JSON.stringify(message));
    } else {
      // Queue message if agent is offline
      if (!this.messageQueue.has(agentId)) {
        this.messageQueue.set(agentId, []);
      }
      this.messageQueue.get(agentId)!.push(message as WSMessage);
    }
  }

  private startHeartbeatMonitoring(): void {
    this.heartbeatInterval = setInterval(() => {
      const now = Date.now();

      for (const [agentId, connection] of this.connections) {
        if (!connection.isAlive) {
          // Connection failed heartbeat check
          elizaLogger.warn('Agent failed heartbeat check, disconnecting', { agentId });
          connection.ws.terminate();
          this.handleDisconnect(connection);
        } else {
          // Mark as not alive for next check
          connection.isAlive = false;
          connection.ws.send(
            JSON.stringify({
              type: 'ping',
              timestamp: new Date(),
            })
          );
        }
      }
    }, 30000); // Check every 30 seconds
  }

  async getRoomInfo(roomId: string): Promise<{
    agents: Array<{ agentId: UUID; role: string; connected: boolean }>;
    messageCount: number;
  }> {
    const room = this.rooms.get(roomId) || new Set();
    const agents = [];

    for (const agentId of room) {
      const connection = this.connections.get(agentId);
      if (connection) {
        agents.push({
          agentId: connection.agentId,
          role: connection.role,
          connected: connection.ws.readyState === WebSocket.OPEN,
        });
      }
    }

    // Get message count from orchestrator if available
    let messageCount = 0;
    const orchestrator = this.runtime?.getService('e2b-agent-orchestrator') as any;
    if (orchestrator) {
      const roomState = await orchestrator.getRoomState(roomId);
      if (roomState) {
        messageCount = roomState.messages.length;
      }
    }

    return { agents, messageCount };
  }

  async stop(): Promise<void> {
    elizaLogger.info('Stopping WebSocket Agent Server');

    // Stop heartbeat monitoring
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }

    // Close all connections
    for (const connection of this.connections.values()) {
      connection.ws.close(1000, 'Server shutting down');
    }

    // Close WebSocket server
    if (this.wss) {
      await new Promise<void>((resolve) => {
        this.wss!.close(() => {
          elizaLogger.info('WebSocket server closed');
          resolve();
        });
      });
    }

    // Close HTTP server
    if (this.server) {
      await new Promise<void>((resolve) => {
        this.server!.close(() => {
          elizaLogger.info('HTTP server closed');
          resolve();
        });
      });
    }

    // Clear all data
    this.connections.clear();
    this.rooms.clear();
    this.messageQueue.clear();

    elizaLogger.info('WebSocket Agent Server stopped');
  }
}
