/**
 * WebSocket Bridge for Sandbox-to-Host Communication
 * Enables sandbox agents to communicate with host server and shared rooms
 */

import type { IAgentRuntime, Service, Memory, Content } from '@elizaos/core';
import { logger } from '@elizaos/core';
import WebSocket from 'ws';

export interface BridgeConfig {
  hostUrl: string;
  roomId: string;
  sandboxId: string;
  agentId: string;
  role: string;
  reconnectInterval?: number;
  heartbeatInterval?: number;
}

export interface RoomMessage {
  id: string;
  roomId: string;
  agentId: string;
  content: Content;
  timestamp: Date;
  type: 'message' | 'file_sync' | 'task_update' | 'status';
}

export class WebSocketBridge extends Service {
  static serviceName = 'websocket-bridge';
  capabilityDescription = 'Bridges sandbox agents to host server via WebSocket';

  private ws: WebSocket | null = null;
  private config: BridgeConfig;
  private isConnected = false;
  private reconnectTimer: NodeJS.Timeout | null = null;
  private heartbeatTimer: NodeJS.Timeout | null = null;
  private messageQueue: RoomMessage[] = [];
  private listeners: Map<string, Function[]> = new Map();

  constructor(runtime: IAgentRuntime, config: BridgeConfig) {
    super();
    this.config = {
      reconnectInterval: 5000,
      heartbeatInterval: 30000,
      ...config,
    };
  }

  static async start(runtime: IAgentRuntime, config: BridgeConfig): Promise<WebSocketBridge> {
    logger.info(`Starting WebSocket Bridge for agent ${config.agentId}`);
    const bridge = new WebSocketBridge(runtime, config);
    await bridge.connect();
    return bridge;
  }

  async stop(): Promise<void> {
    logger.info(`Stopping WebSocket Bridge for agent ${this.config.agentId}`);

    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
    }

    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
    }

    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }

    this.isConnected = false;
    this.listeners.clear();
  }

  /**
   * Connect to host server WebSocket
   */
  async connect(): Promise<void> {
    if (this.ws && this.isConnected) {
      return;
    }

    try {
      const wsUrl = `${this.config.hostUrl.replace(/^http/, 'ws')}/ws/sandbox`;
      logger.info(`Connecting to host WebSocket: ${wsUrl}`);

      this.ws = new WebSocket(wsUrl, {
        headers: {
          'X-Sandbox-Id': this.config.sandboxId,
          'X-Agent-Id': this.config.agentId,
          'X-Room-Id': this.config.roomId,
          'X-Agent-Role': this.config.role,
        },
      });

      this.setupWebSocketHandlers();

      return new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error('WebSocket connection timeout'));
        }, 10000);

        this.ws!.once('open', () => {
          clearTimeout(timeout);
          this.isConnected = true;
          this.startHeartbeat();
          this.flushMessageQueue();
          logger.info(`WebSocket connected for agent ${this.config.agentId}`);
          resolve();
        });

        this.ws!.once('error', (error) => {
          clearTimeout(timeout);
          reject(error);
        });
      });
    } catch (error) {
      logger.error('WebSocket connection failed:', error);
      this.scheduleReconnect();
      throw error;
    }
  }

  /**
   * Send message to shared room
   */
  async sendToRoom(content: Content, type: RoomMessage['type'] = 'message'): Promise<void> {
    const message: RoomMessage = {
      id: `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      roomId: this.config.roomId,
      agentId: this.config.agentId,
      content,
      timestamp: new Date(),
      type,
    };

    if (this.isConnected && this.ws) {
      this.sendMessage(message);
    } else {
      // Queue message for later delivery
      this.messageQueue.push(message);
      logger.debug(`Queued message from ${this.config.agentId} (not connected)`);
    }
  }

  /**
   * Send task progress update
   */
  async sendTaskUpdate(
    taskId: string,
    status: string,
    progress?: number,
    result?: any
  ): Promise<void> {
    await this.sendToRoom(
      {
        text: `Task Update: ${taskId}`,
        task: {
          id: taskId,
          status,
          progress,
          result,
          updatedBy: this.config.agentId,
          timestamp: new Date().toISOString(),
        },
      },
      'task_update'
    );
  }

  /**
   * Send file synchronization notification
   */
  async sendFileSync(
    files: Array<{ path: string; content: string; action: 'create' | 'update' | 'delete' }>
  ): Promise<void> {
    await this.sendToRoom(
      {
        text: `File sync from ${this.config.role}`,
        files,
        syncedBy: this.config.agentId,
      },
      'file_sync'
    );
  }

  /**
   * Send agent status update
   */
  async sendStatus(status: string, details?: any): Promise<void> {
    await this.sendToRoom(
      {
        text: `${this.config.role} status: ${status}`,
        status: {
          agent: this.config.agentId,
          role: this.config.role,
          status,
          details,
          timestamp: new Date().toISOString(),
        },
      },
      'status'
    );
  }

  /**
   * Listen for specific message types
   */
  onMessage(type: string, callback: (message: RoomMessage) => void): void {
    if (!this.listeners.has(type)) {
      this.listeners.set(type, []);
    }
    this.listeners.get(type)!.push(callback);
  }

  /**
   * Listen for room messages
   */
  onRoomMessage(callback: (message: RoomMessage) => void): void {
    this.onMessage('message', callback);
  }

  /**
   * Listen for task assignments
   */
  onTaskAssignment(callback: (task: any) => void): void {
    this.onMessage('task_assignment', (message) => {
      if (message.content.task && message.content.task.assignedTo === this.config.agentId) {
        callback(message.content.task);
      }
    });
  }

  /**
   * Listen for file sync events
   */
  onFileSync(callback: (files: any[]) => void): void {
    this.onMessage('file_sync', (message) => {
      if (message.content.files && message.content.syncedBy !== this.config.agentId) {
        callback(message.content.files);
      }
    });
  }

  // Private methods

  private setupWebSocketHandlers(): void {
    if (!this.ws) {
      return;
    }

    this.ws.on('message', (data: string) => {
      try {
        const message: RoomMessage = JSON.parse(data);
        this.handleIncomingMessage(message);
      } catch (error) {
        logger.error('Failed to parse WebSocket message:', error);
      }
    });

    this.ws.on('close', (code, reason) => {
      logger.warn(`WebSocket closed: ${code} ${reason}`);
      this.isConnected = false;
      this.scheduleReconnect();
    });

    this.ws.on('error', (error) => {
      logger.error('WebSocket error:', error);
      this.isConnected = false;
    });

    this.ws.on('ping', () => {
      if (this.ws) {
        this.ws.pong();
      }
    });
  }

  private handleIncomingMessage(message: RoomMessage): void {
    logger.debug(`Received ${message.type} message in room ${message.roomId}`);

    // Skip messages from self
    if (message.agentId === this.config.agentId) {
      return;
    }

    // Emit to type-specific listeners
    const listeners = this.listeners.get(message.type) || [];
    listeners.forEach((callback) => {
      try {
        callback(message);
      } catch (error) {
        logger.error('Message listener error:', error);
      }
    });

    // Emit to general message listeners
    const generalListeners = this.listeners.get('*') || [];
    generalListeners.forEach((callback) => {
      try {
        callback(message);
      } catch (error) {
        logger.error('General message listener error:', error);
      }
    });
  }

  private sendMessage(message: RoomMessage): void {
    if (this.ws && this.isConnected) {
      try {
        this.ws.send(JSON.stringify(message));
        logger.debug(`Sent ${message.type} message to room ${message.roomId}`);
      } catch (error) {
        logger.error('Failed to send WebSocket message:', error);
        this.messageQueue.push(message);
      }
    }
  }

  private flushMessageQueue(): void {
    if (this.messageQueue.length === 0) {
      return;
    }

    logger.info(`Flushing ${this.messageQueue.length} queued messages`);

    while (this.messageQueue.length > 0) {
      const message = this.messageQueue.shift()!;
      this.sendMessage(message);
    }
  }

  private startHeartbeat(): void {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
    }

    this.heartbeatTimer = setInterval(() => {
      if (this.ws && this.isConnected) {
        this.ws.ping();
      }
    }, this.config.heartbeatInterval!);
  }

  private scheduleReconnect(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
    }

    this.reconnectTimer = setTimeout(async () => {
      logger.info(`Attempting to reconnect WebSocket for agent ${this.config.agentId}`);
      try {
        await this.connect();
      } catch (error) {
        logger.error('Reconnection failed:', error);
        this.scheduleReconnect();
      }
    }, this.config.reconnectInterval!);
  }
}

/**
 * Utility function to create and start a WebSocket bridge
 */
export async function createWebSocketBridge(
  runtime: IAgentRuntime,
  config: BridgeConfig
): Promise<WebSocketBridge> {
  return WebSocketBridge.start(runtime, config);
}

/**
 * Bridge configuration loader from file
 */
export async function loadBridgeConfig(configPath: string): Promise<BridgeConfig> {
  try {
    const fs = await import('fs');
    const configData = await fs.promises.readFile(configPath, 'utf-8');
    return JSON.parse(configData);
  } catch (error) {
    throw new Error(`Failed to load bridge config from ${configPath}: ${error}`);
  }
}
