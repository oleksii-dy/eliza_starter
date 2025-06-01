import { logger } from '@elizaos/core';
import type { IMessageQueue } from './index';

interface QueuedMessage {
  channel: string;
  message: any;
  timestamp: number;
}

interface BatchConfig {
  maxBatchSize: number;
  maxWaitTime: number;
  maxQueueSize: number; // Maximum messages to keep in buffer
  messageTimeout: number; // Max age of a message before dropping (ms)
}

/**
 * Ultra-fast in-memory message queue with batching and optimizations
 * Zero external dependencies - works out of the box
 * Includes automatic memory cleanup to prevent leaks
 */
export class FastMessageQueue implements IMessageQueue {
  private channels: Map<string, Set<(message: any) => Promise<void>>> = new Map();
  private messageBuffer: QueuedMessage[] = [];
  private processing = false;
  private batchTimer: NodeJS.Timeout | null = null;
  private processInterval: NodeJS.Timeout | null = null;
  private cleanupInterval: NodeJS.Timeout | null = null;
  private processedCount = 0;

  private readonly config: BatchConfig = {
    maxBatchSize: 100, // Process up to 100 messages at once
    maxWaitTime: 10, // Wait max 10ms before processing
    maxQueueSize: 10000, // Keep max 10k messages in buffer
    messageTimeout: 60000, // Drop messages older than 1 minute
  };

  constructor() {
    // Start the processing loop
    this.startProcessing();
    // Start cleanup loop
    this.startCleanup();
  }

  async publish(channel: string, message: any): Promise<void> {
    // Check queue size limit
    if (this.messageBuffer.length >= this.config.maxQueueSize) {
      logger.warn(`Message queue full (${this.config.maxQueueSize}), dropping oldest messages`);
      // Remove oldest 10% of messages
      const toRemove = Math.floor(this.config.maxQueueSize * 0.1);
      this.messageBuffer.splice(0, toRemove);
    }

    // Add to buffer
    this.messageBuffer.push({
      channel,
      message,
      timestamp: Date.now(),
    });

    // If we hit the batch size, process immediately
    if (this.messageBuffer.length >= this.config.maxBatchSize) {
      this.processBatch();
    } else if (!this.batchTimer) {
      // Otherwise, set a timer to process within maxWaitTime
      this.batchTimer = setTimeout(() => this.processBatch(), this.config.maxWaitTime);
    }
  }

  subscribe(channel: string, callback: (message: any) => Promise<void>): void {
    if (!this.channels.has(channel)) {
      this.channels.set(channel, new Set());
    }
    this.channels.get(channel)!.add(callback);
  }

  unsubscribe(channel: string, callback?: Function): void {
    if (!callback) {
      this.channels.delete(channel);
      return;
    }

    const callbacks = this.channels.get(channel);
    if (callbacks) {
      callbacks.delete(callback as any);
      if (callbacks.size === 0) {
        this.channels.delete(channel);
      }
    }
  }

  private async processBatch(): Promise<void> {
    if (this.processing || this.messageBuffer.length === 0) {
      return;
    }

    this.processing = true;

    // Clear the timer
    if (this.batchTimer) {
      clearTimeout(this.batchTimer);
      this.batchTimer = null;
    }

    // Extract messages to process (and remove them from buffer)
    const messagesToProcess = this.messageBuffer.splice(0, this.config.maxBatchSize);

    // Filter out expired messages
    const now = Date.now();
    const validMessages = messagesToProcess.filter((msg) => {
      const age = now - msg.timestamp;
      if (age > this.config.messageTimeout) {
        logger.debug(`Dropping expired message (age: ${age}ms)`);
        return false;
      }
      return true;
    });

    // Group messages by channel for efficient processing
    const messagesByChannel = new Map<string, any[]>();

    for (const { channel, message } of validMessages) {
      if (!messagesByChannel.has(channel)) {
        messagesByChannel.set(channel, []);
      }
      messagesByChannel.get(channel)!.push(message);
    }

    // Process each channel's messages
    const promises: Promise<void>[] = [];

    for (const [channel, messages] of messagesByChannel) {
      const callbacks = this.channels.get(channel);
      if (callbacks && callbacks.size > 0) {
        // Process each message for each callback
        for (const message of messages) {
          for (const callback of callbacks) {
            promises.push(
              callback(message).catch((err) =>
                logger.error(`Error processing message for channel ${channel}:`, err)
              )
            );
          }
        }
      }
    }

    // Wait for all processing to complete
    await Promise.all(promises);

    // Update processed count for stats
    this.processedCount += validMessages.length;

    this.processing = false;

    // If there are more messages, continue processing
    if (this.messageBuffer.length > 0) {
      setImmediate(() => this.processBatch());
    }
  }

  private startProcessing(): void {
    // Use setInterval as a fallback to ensure messages don't get stuck
    this.processInterval = setInterval(() => {
      if (this.messageBuffer.length > 0 && !this.processing) {
        this.processBatch();
      }
    }, this.config.maxWaitTime * 2);
  }

  private startCleanup(): void {
    // Run cleanup every 30 seconds
    this.cleanupInterval = setInterval(() => {
      const now = Date.now();
      const before = this.messageBuffer.length;

      // Remove expired messages from buffer
      this.messageBuffer = this.messageBuffer.filter((msg) => {
        const age = now - msg.timestamp;
        return age <= this.config.messageTimeout;
      });

      const removed = before - this.messageBuffer.length;
      if (removed > 0) {
        logger.debug(`Cleaned up ${removed} expired messages from queue`);
      }

      // Clean up empty channel subscriptions
      for (const [channel, callbacks] of this.channels.entries()) {
        if (callbacks.size === 0) {
          this.channels.delete(channel);
        }
      }
    }, 30000); // Every 30 seconds
  }

  async close(): Promise<void> {
    // Process any remaining messages
    if (this.messageBuffer.length > 0) {
      await this.processBatch();
    }

    if (this.batchTimer) {
      clearTimeout(this.batchTimer);
      this.batchTimer = null;
    }

    if (this.processInterval) {
      clearInterval(this.processInterval);
      this.processInterval = null;
    }

    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }

    this.channels.clear();
    this.messageBuffer = [];
  }

  // Performance stats
  getStats() {
    return {
      channelCount: this.channels.size,
      subscriberCount: Array.from(this.channels.values()).reduce((sum, set) => sum + set.size, 0),
      pendingMessages: this.messageBuffer.length,
      processedMessages: this.processedCount,
      isProcessing: this.processing,
      oldestMessageAge:
        this.messageBuffer.length > 0
          ? Date.now() - Math.min(...this.messageBuffer.map((m) => m.timestamp))
          : 0,
    };
  }
}
