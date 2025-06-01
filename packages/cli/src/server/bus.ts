import { logger } from '@elizaos/core';
import { createMessageQueue, type IMessageQueue } from './message-queue';

/**
 * High-performance message bus for distributing messages from the central server
 * to subscribed MessageBusService instances.
 *
 * Uses an optimized in-memory queue with batching for maximum performance.
 * Zero configuration required - works out of the box!
 */
class InternalMessageBus {
  private messageQueue: IMessageQueue | null = null;
  private initPromise: Promise<void> | null = null;

  // Keep track of event listeners for compatibility
  private eventListeners: Map<string, Set<Function>> = new Map();

  async initialize(): Promise<void> {
    if (this.initPromise) return this.initPromise;

    this.initPromise = (async () => {
      try {
        this.messageQueue = await createMessageQueue();
        logger.success('High-performance message bus initialized');
      } catch (error) {
        logger.error('Failed to initialize message queue:', error);
        throw error;
      }
    })();

    return this.initPromise;
  }

  async emit(event: string, data: any): Promise<void> {
    if (!this.messageQueue) {
      await this.initialize();
    }

    await this.messageQueue!.publish(event, data);
  }

  on(event: string, listener: (data: any) => void | Promise<void>): void {
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, new Set());
    }
    this.eventListeners.get(event)!.add(listener);

    // Wrap the listener to handle both sync and async functions
    const wrappedListener = async (data: any) => {
      try {
        await listener(data);
      } catch (error) {
        logger.error(`Error in event listener for ${event}:`, error);
      }
    };

    // Subscribe to the message queue
    if (!this.messageQueue) {
      this.initialize()
        .then(() => {
          this.messageQueue!.subscribe(event, wrappedListener);
        })
        .catch((err) => {
          logger.error('Failed to subscribe after initialization:', err);
        });
    } else {
      this.messageQueue.subscribe(event, wrappedListener);
    }
  }

  off(event: string, listener: Function): void {
    const listeners = this.eventListeners.get(event);
    if (listeners) {
      listeners.delete(listener);
      if (listeners.size === 0) {
        this.eventListeners.delete(event);
      }
    }

    // Unsubscribe from message queue
    if (this.messageQueue) {
      this.messageQueue.unsubscribe(event, listener);
    }
  }

  setMaxListeners(n: number): void {
    // This is kept for compatibility but not used in the new implementation
    logger.debug(`setMaxListeners called with ${n} (no-op in new implementation)`);
  }

  async close(): Promise<void> {
    if (this.messageQueue) {
      await this.messageQueue.close();
      this.messageQueue = null;
    }
    this.eventListeners.clear();
    this.initPromise = null;
  }

  // Get performance stats
  getStats(): any {
    if (this.messageQueue && 'getStats' in this.messageQueue) {
      return this.messageQueue.getStats();
    }
    return null;
  }
}

const internalMessageBus = new InternalMessageBus();

// Auto-initialize on first use
internalMessageBus.initialize().catch((err) => {
  logger.error('Failed to initialize message bus:', err);
});

export default internalMessageBus;
