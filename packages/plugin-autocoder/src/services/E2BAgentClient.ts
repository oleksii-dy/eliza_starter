import { Service, elizaLogger } from '@elizaos/core';
import type { IAgentRuntime, UUID } from '@elizaos/core';
import WebSocket from 'ws';

interface ClientConfig {
  agentId: UUID;
  roomId: string;
  role: string;
  wsUrl: string;
}

interface PendingRequest {
  resolve: (response: any) => void;
  reject: (error: any) => void;
  timeout: NodeJS.Timeout;
}

/**
 * E2B Agent Client Service
 * Runs inside E2B sandboxes to enable communication with the main system
 */
export class E2BAgentClient extends Service {
  static _serviceName = 'e2b-agent-client';
  static serviceType = 'communication' as const;

  private ws: WebSocket | null = null;
  private clientConfig: ClientConfig;
  private isConnected: boolean = false;
  private reconnectInterval: NodeJS.Timeout | null = null;
  private messageQueue: any[] = [];
  private pendingRequests: Map<string, PendingRequest> = new Map();
  private heartbeatInterval: NodeJS.Timeout | null = null;

  capabilityDescription = 'Client service for E2B agents to communicate with the orchestrator';

  constructor(_runtime?: IAgentRuntime) {
    super(_runtime);

    // Get configuration from environment or runtime settings
    this.clientConfig = {
      agentId: (_runtime?.getSetting('AGENT_ID') || process.env.AGENT_ID || '') as UUID,
      roomId: _runtime?.getSetting('ROOM_ID') || process.env.ROOM_ID || '',
      role: _runtime?.getSetting('AGENT_ROLE') || process.env.AGENT_ROLE || '',
      wsUrl:
        _runtime?.getSetting('WEBSOCKET_URL') ||
        process.env.WEBSOCKET_URL ||
        'ws://host.docker.internal:8080',
    };
  }

  static async start(_runtime: IAgentRuntime): Promise<E2BAgentClient> {
    const service = new E2BAgentClient(_runtime);
    await service.initialize();
    elizaLogger.info('E2BAgentClient started successfully');
    return service;
  }

  private async initialize(): Promise<void> {
    try {
      elizaLogger.info('Initializing E2B Agent Client', this.clientConfig);

      if (!this.clientConfig.agentId || !this.clientConfig.roomId || !this.clientConfig.role) {
        throw new Error('Missing required configuration: agentId, roomId, or role');
      }

      // Connect to WebSocket server
      await this.connect();

      elizaLogger.info('E2B Agent Client initialized');
    } catch (_error) {
      elizaLogger.error('Failed to initialize E2BAgentClient:', _error);
      throw _error;
    }
  }

  private async connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        elizaLogger.info(`Connecting to WebSocket server at ${this.config.wsUrl}`);

        this.ws = new WebSocket(this.config.wsUrl);

        this.ws.on('open', async () => {
          elizaLogger.info('WebSocket connection established');
          this.isConnected = true;

          // Register with the server
          await this.register();

          // Send any queued messages
          await this.flushMessageQueue();

          // Start heartbeat
          this.startHeartbeat();

          resolve();
        });

        this.ws.on('message', (data: Buffer) => {
          this.handleMessage(data.toString());
        });

        this.ws.on('close', (code: number, reason: Buffer) => {
          elizaLogger.warn('WebSocket connection closed', { code, reason: reason.toString() });
          this.isConnected = false;
          this.stopHeartbeat();
          this.scheduleReconnect();
        });

        this.ws.on('error', (error: Error) => {
          elizaLogger.error('WebSocket error:', error);
          if (!this.isConnected) {
            reject(error);
          }
        });

        // Set connection timeout
        setTimeout(() => {
          if (!this.isConnected) {
            reject(new Error('Connection timeout'));
          }
        }, 30000); // 30 second timeout
      } catch (error) {
        reject(error);
      }
    });
  }

  private async register(): Promise<void> {
    await this.send({
      type: 'register',
      agentId: this.config.agentId,
      roomId: this.config.roomId,
      role: this.config.role,
      timestamp: new Date(),
    });
  }

  private handleMessage(data: string): void {
    try {
      const message = JSON.parse(data);

      elizaLogger.debug('Received message', { type: message.type });

      switch (message.type) {
        case 'registered':
          elizaLogger.info('Successfully registered with server');
          break;

        case 'ping':
          // Respond to ping with heartbeat
          this.send({
            type: 'heartbeat',
            agentId: this.config.agentId,
            timestamp: new Date(),
          });
          break;

        case 'request':
          this.handleRequest(message);
          break;

        case 'response':
          this.handleResponse(message);
          break;

        case 'message':
          this.handleRoomMessage(message);
          break;

        case 'room-update':
          this.handleRoomUpdate(message);
          break;

        case 'agent-joined':
        case 'agent-left':
          this.handleAgentEvent(message);
          break;

        default:
          elizaLogger.debug('Unhandled message type', { type: message.type });
      }

      // Emit event for the runtime to handle
      if (this.runtime) {
        this.runtime.emit(`websocket:${message.type}`, message);
      }
    } catch (error) {
      elizaLogger.error('Error handling message:', error);
    }
  }

  private async handleRequest(message: any): Promise<void> {
    try {
      // Process the request based on content type
      const { content, messageId, fromAgentId } = message;

      elizaLogger.info('Handling request from agent', {
        fromAgentId,
        requestType: content?.type,
      });

      let response;

      // Handle different request types
      switch (content?.type) {
        case 'get-status':
          response = await this.getAgentStatus();
          break;

        case 'get-capabilities':
          response = await this.getAgentCapabilities();
          break;

        case 'execute-action':
          response = await this.executeAction(content.action, content.params);
          break;

        default:
          response = { error: 'Unknown request type' };
      }

      // Send response
      await this.send({
        type: 'response',
        correlationId: messageId,
        content: {
          ...response,
          targetAgentId: fromAgentId,
        },
        timestamp: new Date(),
      });
    } catch (error) {
      elizaLogger.error('Error handling request:', error);
    }
  }

  private handleResponse(message: any): void {
    const { correlationId, content } = message;

    const pending = this.pendingRequests.get(correlationId);
    if (pending) {
      clearTimeout(pending.timeout);
      pending.resolve(content);
      this.pendingRequests.delete(correlationId);
    }
  }

  private handleRoomMessage(message: any): void {
    const { message: roomMessage } = message;

    elizaLogger.info('Room message received', {
      from: roomMessage.fromAgentId,
      type: roomMessage.type,
    });

    // Add to agent's memory if available
    if (this.runtime) {
      // Store in context for agent to process
      this.runtime.emit('room:message', roomMessage);
    }
  }

  private handleRoomUpdate(message: any): void {
    const { update, agentId } = message;

    elizaLogger.info('Room update received', {
      from: agentId,
      updateType: update?.updateType,
    });

    // Update local room state if needed
    if (this.runtime) {
      this.runtime.emit('room:update', update);
    }
  }

  private handleAgentEvent(message: any): void {
    const { type, agentId, role } = message;

    elizaLogger.info('Agent event', { type, agentId, role });

    if (this.runtime) {
      this.runtime.emit(`agent:${type}`, { agentId, role });
    }
  }

  async send(message: any): Promise<void> {
    if (this.isConnected && this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(message));
    } else {
      // Queue message if not connected
      this.messageQueue.push(message);
      elizaLogger.debug('Message queued (not connected)', { type: message.type });
    }
  }

  async sendMessage(content: any): Promise<void> {
    await this.send({
      type: 'message',
      agentId: this.config.agentId,
      content,
      timestamp: new Date(),
    });
  }

  async sendRoomUpdate(update: any): Promise<void> {
    await this.send({
      type: 'room-update',
      agentId: this.config.agentId,
      content: update,
      timestamp: new Date(),
    });
  }

  async sendRequest(targetAgentId: UUID, content: any): Promise<any> {
    const messageId = `req-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;

    return new Promise((resolve, reject) => {
      // Set up timeout
      const timeout = setTimeout(() => {
        this.pendingRequests.delete(messageId);
        reject(new Error('Request timeout'));
      }, 30000); // 30 second timeout

      // Store pending request
      this.pendingRequests.set(messageId, { resolve, reject, timeout });

      // Send request
      this.send({
        type: 'request',
        agentId: this.config.agentId,
        messageId,
        content: {
          ...content,
          targetAgentId,
        },
        timestamp: new Date(),
      });
    });
  }

  private async flushMessageQueue(): Promise<void> {
    while (this.messageQueue.length > 0) {
      const message = this.messageQueue.shift();
      await this.send(message);
    }
  }

  private scheduleReconnect(): void {
    if (this.reconnectInterval) {
      return; // Already scheduled
    }

    elizaLogger.info('Scheduling reconnection attempt');

    this.reconnectInterval = setInterval(async () => {
      if (!this.isConnected) {
        try {
          await this.connect();

          if (this.reconnectInterval) {
            clearInterval(this.reconnectInterval);
            this.reconnectInterval = null;
          }
        } catch (error) {
          elizaLogger.error('Reconnection attempt failed:', error);
        }
      }
    }, 5000); // Try every 5 seconds
  }

  private startHeartbeat(): void {
    this.heartbeatInterval = setInterval(() => {
      if (this.isConnected) {
        this.send({
          type: 'heartbeat',
          agentId: this.config.agentId,
          timestamp: new Date(),
        });
      }
    }, 25000); // Send heartbeat every 25 seconds
  }

  private stopHeartbeat(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
  }

  private async getAgentStatus(): Promise<any> {
    return {
      agentId: this.config.agentId,
      role: this.config.role,
      roomId: this.config.roomId,
      connected: this.isConnected,
      uptime: process.uptime(),
      memory: process.memoryUsage(),
    };
  }

  private async getAgentCapabilities(): Promise<any> {
    const capabilities = [];

    // Get available actions from runtime
    if (this.runtime && this.runtime.actions) {
      capabilities.push(
        ...this.runtime.actions.map((action) => ({
          name: action.name,
          description: action.description,
        }))
      );
    }

    return { capabilities };
  }

  private async executeAction(actionName: string, params: any): Promise<any> {
    if (!this.runtime) {
      return { error: 'Runtime not available' };
    }

    const action = this.runtime.actions.find((a) => a.name === actionName);
    if (!action) {
      return { error: `Action ${actionName} not found` };
    }

    try {
      // Execute the action
      const result = await action.handler(this.runtime, { content: params } as any, {} as any);

      return { success: true, result };
    } catch (error) {
      return {
        error: error instanceof Error ? error.message : 'Action execution failed',
      };
    }
  }

  async stop(): Promise<void> {
    elizaLogger.info('Stopping E2B Agent Client');

    // Stop heartbeat
    this.stopHeartbeat();

    // Clear reconnect interval
    if (this.reconnectInterval) {
      clearInterval(this.reconnectInterval);
      this.reconnectInterval = null;
    }

    // Close WebSocket connection
    if (this.ws) {
      this.ws.close(1000, 'Client shutting down');
      this.ws = null;
    }

    // Clear pending requests
    for (const [id, pending] of this.pendingRequests) {
      clearTimeout(pending.timeout);
      pending.reject(new Error('Client shutting down'));
    }
    this.pendingRequests.clear();

    // Clear message queue
    this.messageQueue = [];

    elizaLogger.info('E2B Agent Client stopped');
  }
}
