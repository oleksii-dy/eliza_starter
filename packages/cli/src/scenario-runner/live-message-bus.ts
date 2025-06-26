/**
 * Live Message Bus
 * Handles real-time message routing for multi-agent scenarios
 */

import { logger } from '@elizaos/core';
import { EventEmitter } from 'events';

export interface LiveMessageEvent {
  type: 'message' | 'action' | 'state_change';
  agentId: string;
  roomId: string;
  timestamp: number;
  data: any;
}

export class LiveMessageBus extends EventEmitter {
  private isInitialized = false;
  private messageHistory: LiveMessageEvent[] = [];
  private maxHistorySize = 1000;

  constructor() {
    super();
    if (!this.isInitialized) {
      logger.info('LiveMessageBus initialized for real-world benchmarking');
      this.isInitialized = true;
    }
  }

  publishMessage(event: Omit<LiveMessageEvent, 'timestamp'>): void {
    const fullEvent: LiveMessageEvent = {
      ...event,
      timestamp: Date.now(),
    };

    // Add to history
    this.messageHistory.push(fullEvent);
    if (this.messageHistory.length > this.maxHistorySize) {
      this.messageHistory.shift();
    }

    // Emit event
    this.emit('message', fullEvent);
    this.emit(`${event.type}:${event.agentId}`, fullEvent);

    logger.debug(`Published message: ${event.type} from ${event.agentId}`);
  }

  subscribeToAgent(agentId: string, callback: (event: LiveMessageEvent) => void): void {
    this.on(`message:${agentId}`, callback);
    this.on(`action:${agentId}`, callback);
    this.on(`state_change:${agentId}`, callback);
  }

  unsubscribeFromAgent(agentId: string): void {
    this.removeAllListeners(`message:${agentId}`);
    this.removeAllListeners(`action:${agentId}`);
    this.removeAllListeners(`state_change:${agentId}`);
  }

  getMessageHistory(agentId?: string, roomId?: string): LiveMessageEvent[] {
    return this.messageHistory.filter((event) => {
      if (agentId && event.agentId !== agentId) {
        return false;
      }
      if (roomId && event.roomId !== roomId) {
        return false;
      }
      return true;
    });
  }

  sendMessage(event: Omit<LiveMessageEvent, 'timestamp'>): void {
    this.publishMessage(event);
  }

  reset(): void {
    this.messageHistory = [];
    this.removeAllListeners();
    logger.debug('LiveMessageBus reset');
  }
}

export const liveMessageBus = new LiveMessageBus();
