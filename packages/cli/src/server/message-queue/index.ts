import { logger } from '@elizaos/core';
import { FastMessageQueue } from './fast-queue';

export interface IMessageQueue {
  publish(channel: string, message: any): Promise<void>;
  subscribe(channel: string, callback: (message: any) => Promise<void>): void;
  unsubscribe(channel: string, callback?: Function): void;
  close(): Promise<void>;
  getStats?: () => any;
}

/**
 * Creates a high-performance message queue that works out of the box
 * No Redis, no Docker, no configuration needed - just blazing fast performance
 */
export async function createMessageQueue(): Promise<IMessageQueue> {
  logger.info('Initializing high-performance in-memory message queue');
  return new FastMessageQueue();
}
