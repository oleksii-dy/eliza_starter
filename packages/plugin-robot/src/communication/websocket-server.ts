import { WebSocketServer, WebSocket } from 'ws';
import { logger } from '@elizaos/core';
import { RobotService } from '../services/robot-service';
import { EventEmitter } from 'events';
import * as http from 'http';

export interface WebSocketConfig {
  port?: number;
  host?: string;
  path?: string;
  authentication?: boolean;
  maxClients?: number;
  heartbeatInterval?: number;
}

export interface RemoteCommand {
  type:
    | 'move_joint'
    | 'set_mode'
    | 'execute_motion'
    | 'emergency_stop'
    | 'get_state'
    | 'subscribe'
    | 'unsubscribe';
  data?: any;
  id?: string;
}

export interface RemoteResponse {
  type: 'response' | 'state_update' | 'error' | 'event';
  data?: any;
  id?: string;
  timestamp: number;
}

export class RobotWebSocketServer extends EventEmitter {
  private wss: WebSocketServer | null = null;
  private server: http.Server | null = null;
  private robotService: RobotService;
  private config: WebSocketConfig;
  private clients: Map<string, WebSocket> = new Map();
  private subscriptions: Map<string, Set<string>> = new Map();
  private heartbeatInterval: NodeJS.Timeout | null = null;

  constructor(robotService: RobotService, config: WebSocketConfig = {}) {
    super();
    this.robotService = robotService;
    this.config = {
      port: config.port || 8080,
      host: config.host || '0.0.0.0',
      path: config.path || '/robot',
      authentication: config.authentication || false,
      maxClients: config.maxClients || 10,
      heartbeatInterval: config.heartbeatInterval || 30000,
    };
  }

  async start(): Promise<void> {
    // Create HTTP server
    this.server = http.createServer();

    // Create WebSocket server
    this.wss = new WebSocketServer({
      server: this.server,
      path: this.config.path,
    });

    // Set up WebSocket handlers
    this.wss.on('connection', this.handleConnection.bind(this));

    // Start HTTP server
    await new Promise<void>((resolve, reject) => {
      this.server!.listen(this.config.port, this.config.host!, () => {
        logger.info(
          `[WebSocketServer] Listening on ws://${this.config.host}:${this.config.port}${this.config.path}`
        );
        resolve();
      });

      this.server!.on('error', reject);
    });

    // Start heartbeat
    this.startHeartbeat();

    // Subscribe to robot state updates
    this.robotService.on('stateUpdate', this.broadcastStateUpdate.bind(this));
  }

  async stop(): Promise<void> {
    logger.info('[WebSocketServer] Stopping server');

    // Stop heartbeat
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }

    // Unsubscribe from robot events
    this.robotService.off('stateUpdate', this.broadcastStateUpdate.bind(this));

    // Close all client connections
    for (const [_clientId, ws] of this.clients) {
      ws.close(1000, 'Server shutting down');
    }
    this.clients.clear();
    this.subscriptions.clear();

    // Close WebSocket server
    if (this.wss) {
      await new Promise<void>((resolve) => {
        this.wss!.close(() => resolve());
      });
      this.wss = null;
    }

    // Close HTTP server
    if (this.server) {
      await new Promise<void>((resolve) => {
        this.server!.close(() => resolve());
      });
      this.server = null;
    }
  }

  private handleConnection(ws: WebSocket, request: http.IncomingMessage): void {
    const _clientId = this.generateClientId();

    // Check max clients
    if (this.clients.size >= this.config.maxClients!) {
      ws.close(1008, 'Max clients reached');
      return;
    }

    // Authenticate if required
    if (this.config.authentication) {
      // TODO: Implement authentication
      // For now, just check for a token in the query string
      const url = new URL(request.url!, `http://${request.headers.host}`);
      const token = url.searchParams.get('token');
      if (!token) {
        ws.close(1008, 'Authentication required');
        return;
      }
    }

    // Store client
    this.clients.set(clientId, ws);
    this.subscriptions.set(clientId, new Set());

    logger.info(`[WebSocketServer] Client connected: ${clientId}`);

    // Send welcome message
    this.sendToClient(clientId, {
      type: 'event',
      data: {
        event: 'connected',
        clientId,
        robotState: this.robotService.getState(),
      },
      timestamp: Date.now(),
    });

    // Set up client handlers
    ws.on('message', (data) => this.handleMessage(clientId, data));
    ws.on('close', () => this.handleDisconnect(clientId));
    ws.on('error', (error) => this.handleError(clientId, error));
    ws.on('pong', () => this.handlePong(clientId));
  }

  private async handleMessage(clientId: string, data: any): Promise<void> {
    try {
      const message: RemoteCommand = JSON.parse(data.toString());
      logger.debug(`[WebSocketServer] Received from ${clientId}:`, message);

      switch (message.type) {
        case 'move_joint':
          await this.handleMoveJoint(clientId, message);
          break;

        case 'set_mode':
          await this.handleSetMode(clientId, message);
          break;

        case 'execute_motion':
          await this.handleExecuteMotion(clientId, message);
          break;

        case 'emergency_stop':
          await this.handleEmergencyStop(clientId, message);
          break;

        case 'get_state':
          await this.handleGetState(clientId, message);
          break;

        case 'subscribe':
          await this.handleSubscribe(clientId, message);
          break;

        case 'unsubscribe':
          await this.handleUnsubscribe(clientId, message);
          break;

        default:
          this.sendError(clientId, 'Unknown command type', message.id);
      }
    } catch (error) {
      logger.error(`[WebSocketServer] Error handling message from ${clientId}:`, error);
      this.sendError(clientId, 'Invalid message format');
    }
  }

  private async handleMoveJoint(clientId: string, command: RemoteCommand): Promise<void> {
    try {
      const { jointName, position, speed } = command.data;

      if (!jointName || position === undefined) {
        throw new Error('Missing required parameters: jointName, position');
      }

      await this.robotService.moveJoint(jointName, position, speed);

      this.sendResponse(
        clientId,
        {
          success: true,
          jointName,
          position,
        },
        command.id
      );
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.sendError(clientId, `Failed to move joint: ${errorMessage}`, command.id);
    }
  }

  private async handleSetMode(clientId: string, command: RemoteCommand): Promise<void> {
    try {
      const { mode } = command.data;

      if (!mode) {
        throw new Error('Missing required parameter: mode');
      }

      await this.robotService.setMode(mode);

      this.sendResponse(
        clientId,
        {
          success: true,
          mode,
        },
        command.id
      );
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.sendError(clientId, `Failed to set mode: ${errorMessage}`, command.id);
    }
  }

  private async handleExecuteMotion(clientId: string, command: RemoteCommand): Promise<void> {
    try {
      const { motionName } = command.data;

      if (!motionName) {
        throw new Error('Missing required parameter: motionName');
      }

      await this.robotService.executeMotion(motionName);

      this.sendResponse(
        clientId,
        {
          success: true,
          motionName,
        },
        command.id
      );
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.sendError(clientId, `Failed to execute motion: ${errorMessage}`, command.id);
    }
  }

  private async handleEmergencyStop(clientId: string, command: RemoteCommand): Promise<void> {
    try {
      await this.robotService.emergencyStop();

      this.sendResponse(
        clientId,
        {
          success: true,
          message: 'Emergency stop activated',
        },
        command.id
      );

      // Broadcast emergency stop to all clients
      this.broadcast({
        type: 'event',
        data: {
          event: 'emergency_stop',
          activatedBy: clientId,
        },
        timestamp: Date.now(),
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.sendError(clientId, `Failed to activate emergency stop: ${errorMessage}`, command.id);
    }
  }

  private async handleGetState(clientId: string, command: RemoteCommand): Promise<void> {
    try {
      const state = this.robotService.getState();

      this.sendResponse(
        clientId,
        {
          state,
        },
        command.id
      );
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.sendError(clientId, `Failed to get state: ${errorMessage}`, command.id);
    }
  }

  private async handleSubscribe(clientId: string, command: RemoteCommand): Promise<void> {
    const { topics } = command.data;

    if (!Array.isArray(topics)) {
      this.sendError(clientId, 'Topics must be an array', command.id);
      return;
    }

    const clientSubs = this.subscriptions.get(clientId)!;
    for (const topic of topics) {
      clientSubs.add(topic);
    }

    this.sendResponse(
      clientId,
      {
        success: true,
        subscribed: topics,
      },
      command.id
    );
  }

  private async handleUnsubscribe(clientId: string, command: RemoteCommand): Promise<void> {
    const { topics } = command.data;

    if (!Array.isArray(topics)) {
      this.sendError(clientId, 'Topics must be an array', command.id);
      return;
    }

    const clientSubs = this.subscriptions.get(clientId)!;
    for (const topic of topics) {
      clientSubs.delete(topic);
    }

    this.sendResponse(
      clientId,
      {
        success: true,
        unsubscribed: topics,
      },
      command.id
    );
  }

  private handleDisconnect(clientId: string): void {
    logger.info(`[WebSocketServer] Client disconnected: ${clientId}`);
    this.clients.delete(clientId);
    this.subscriptions.delete(clientId);
  }

  private handleError(clientId: string, error: Error): void {
    logger.error(`[WebSocketServer] Client ${clientId} error:`, error);
  }

  private handlePong(clientId: string): void {
    // Client is alive
    logger.debug(`[WebSocketServer] Pong received from ${clientId}`);
  }

  private startHeartbeat(): void {
    this.heartbeatInterval = setInterval(() => {
      for (const [_clientId, ws] of this.clients) {
        if (ws.readyState === WebSocket.OPEN) {
          ws.ping();
        } else {
          // Remove dead clients
          this.clients.delete(clientId);
          this.subscriptions.delete(clientId);
        }
      }
    }, this.config.heartbeatInterval!);
  }

  private broadcastStateUpdate(state: RobotState): void {
    const message: RemoteResponse = {
      type: 'state_update',
      data: { state },
      timestamp: Date.now(),
    };

    // Send to all clients subscribed to state updates
    for (const [clientId, subscriptions] of this.subscriptions) {
      if (subscriptions.has('state_updates')) {
        this.sendToClient(clientId, message);
      }
    }
  }

  private broadcast(message: RemoteResponse): void {
    for (const [_clientId, ws] of this.clients) {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify(message));
      }
    }
  }

  private sendToClient(clientId: string, message: RemoteResponse): void {
    const ws = this.clients.get(clientId);
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(message));
    }
  }

  private sendResponse(clientId: string, data: any, requestId?: string): void {
    this.sendToClient(clientId, {
      type: 'response',
      data,
      id: requestId,
      timestamp: Date.now(),
    });
  }

  private sendError(clientId: string, error: string, requestId?: string): void {
    this.sendToClient(clientId, {
      type: 'error',
      data: { error },
      id: requestId,
      timestamp: Date.now(),
    });
  }

  private generateClientId(): string {
    return `client-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  getClientCount(): number {
    return this.clients.size;
  }

  getClients(): string[] {
    return Array.from(this.clients.keys());
  }
}
