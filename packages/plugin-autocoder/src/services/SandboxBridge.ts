import { elizaLogger } from '@elizaos/core';
import WebSocket from 'ws';
import { EventEmitter } from 'events';

export interface ClaudeCodeOptions {
  prompt: string;
  systemPrompt?: string;
  maxTurns?: number;
  continueSession?: boolean;
  continueOnError?: boolean;
  outputFormat?: 'text' | 'json' | 'stream-json';
}

export interface ClaudeCodeResult {
  output: string;
  exitCode: number;
  success: boolean;
  apiCalls?: number;
  duration?: number;
  sessionId?: string;
}

export interface BridgeMessage {
  id: string;
  type: 'execute' | 'result' | 'error' | 'ping' | 'pong';
  data?: any;
}

export class SandboxBridge extends EventEmitter {
  private ws?: WebSocket;
  private connected: boolean = false;
  private messageQueue: BridgeMessage[] = [];
  private responseHandlers: Map<string, (result: any) => void> = new Map();
  private reconnectAttempts: number = 0;
  private maxReconnectAttempts: number = 5;
  private reconnectDelay: number = 1000;
  private pingInterval?: NodeJS.Timeout;
  private sandboxId?: string;

  constructor() {
    super();
  }

  async connect(sandboxId: string): Promise<void> {
    this.sandboxId = sandboxId;
    const wsUrl = process.env.SANDBOX_BRIDGE_URL || `ws://localhost:8080/sandbox/${sandboxId}`;

    return new Promise((resolve, reject) => {
      try {
        this.ws = new WebSocket(wsUrl);

        this.ws.on('open', () => {
          elizaLogger.info(`Connected to sandbox bridge for ${sandboxId}`);
          this.connected = true;
          this.reconnectAttempts = 0;

          // Start ping interval
          this.startPingInterval();

          // Flush queued messages
          this.flushMessageQueue();

          resolve();
        });

        this.ws.on('message', (data: Buffer) => {
          try {
            const message: BridgeMessage = JSON.parse(data.toString());
            this.handleMessage(message);
          } catch (error) {
            elizaLogger.error('Failed to parse bridge message', error);
          }
        });

        this.ws.on('error', (error) => {
          elizaLogger.error('WebSocket error', error);
          if (!this.connected) {
            reject(error);
          } else {
            this.emit('error', error);
          }
        });

        this.ws.on('close', () => {
          elizaLogger.info('WebSocket connection closed');
          this.connected = false;
          this.stopPingInterval();

          // Attempt reconnection
          if (this.reconnectAttempts < this.maxReconnectAttempts) {
            this.attemptReconnect();
          }
        });
      } catch (error) {
        reject(error);
      }
    });
  }

  async disconnect(): Promise<void> {
    this.stopPingInterval();

    if (this.ws) {
      this.ws.close();
      this.ws = undefined;
    }

    this.connected = false;
    this.messageQueue = [];
    this.responseHandlers.clear();
  }

  async executeClaudeCode(options: ClaudeCodeOptions): Promise<ClaudeCodeResult> {
    const messageId = this.generateMessageId();

    return new Promise((resolve, reject) => {
      // Set up response handler
      this.responseHandlers.set(messageId, (result) => {
        if (result.error) {
          reject(new Error(result.error));
        } else {
          resolve(result);
        }
      });

      // Build Claude command
      const args = this.buildClaudeArgs(options);

      // Send execution message
      this.sendMessage({
        id: messageId,
        type: 'execute',
        data: {
          command: 'claude',
          args,
          prompt: options.prompt,
          workingDir: '/home/user/workspace',
        },
      });

      // Set timeout
      setTimeout(() => {
        if (this.responseHandlers.has(messageId)) {
          this.responseHandlers.delete(messageId);
          reject(new Error('Claude Code execution timeout'));
        }
      }, 600000); // 10 minute timeout
    });
  }

  private buildClaudeArgs(options: ClaudeCodeOptions): string[] {
    const args = ['-p'];

    if (options.systemPrompt) {
      args.push('--system-prompt', options.systemPrompt);
    }

    if (options.maxTurns) {
      args.push('--max-turns', options.maxTurns.toString());
    }

    if (options.continueSession) {
      args.push('--continue');
    }

    args.push('--output-format', options.outputFormat || 'stream-json');

    // Add the prompt as the last argument
    args.push(options.prompt);

    return args;
  }

  private handleMessage(message: BridgeMessage): void {
    switch (message.type) {
      case 'result':
        const handler = this.responseHandlers.get(message.id);
        if (handler) {
          handler(message.data);
          this.responseHandlers.delete(message.id);
        }
        break;

      case 'error':
        const errorHandler = this.responseHandlers.get(message.id);
        if (errorHandler) {
          errorHandler({ error: message.data });
          this.responseHandlers.delete(message.id);
        }
        break;

      case 'pong':
        // Heartbeat response
        break;

      default:
        elizaLogger.warn(`Unknown message type: ${message.type}`);
    }
  }

  private sendMessage(message: BridgeMessage): void {
    if (this.connected && this.ws) {
      try {
        this.ws.send(JSON.stringify(message));
      } catch (error) {
        elizaLogger.error('Failed to send message', error);
        this.messageQueue.push(message);
      }
    } else {
      // Queue message for later
      this.messageQueue.push(message);
    }
  }

  private flushMessageQueue(): void {
    while (this.messageQueue.length > 0) {
      const message = this.messageQueue.shift();
      if (message) {
        this.sendMessage(message);
      }
    }
  }

  private startPingInterval(): void {
    this.pingInterval = setInterval(() => {
      if (this.connected) {
        this.sendMessage({
          id: this.generateMessageId(),
          type: 'ping',
        });
      }
    }, 30000); // Ping every 30 seconds
  }

  private stopPingInterval(): void {
    if (this.pingInterval) {
      clearInterval(this.pingInterval);
      this.pingInterval = undefined;
    }
  }

  private async attemptReconnect(): Promise<void> {
    this.reconnectAttempts++;
    const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1);

    elizaLogger.info(`Attempting reconnection in ${delay}ms (attempt ${this.reconnectAttempts})`);

    setTimeout(async () => {
      try {
        if (this.sandboxId) {
          await this.connect(this.sandboxId);
        }
      } catch (error) {
        elizaLogger.error('Reconnection failed', error);
      }
    }, delay);
  }

  private generateMessageId(): string {
    return `msg_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  }

  isConnected(): boolean {
    return this.connected;
  }

  getSandboxId(): string | undefined {
    return this.sandboxId;
  }
}
