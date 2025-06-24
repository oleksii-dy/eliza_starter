import { EventEmitter } from 'node:events';
import { logger, type IAgentRuntime, Service } from '@elizaos/core';
import type { A2AMessage, A2AInternalEvent } from './types';
import { A2A_INTERNAL_EVENT_TOPIC } from './types';

// This is a simple in-memory message bus for A2A communication within the same process.
// For multi-process or distributed agents, a proper message queue (e.g., Redis, RabbitMQ) would be needed.
const globalInMemoryA2ABus = new EventEmitter();

export class A2AService extends Service {
  static readonly serviceType = 'A2AService';
  public capabilityDescription = 'Service for handling Agent-to-Agent (A2A) communication.';
  private agentId: string;
  private runtime: IAgentRuntime;

  constructor(runtime: IAgentRuntime) {
    super(runtime);
    this.runtime = runtime;
    // Each agent needs its own ID to filter messages.
    // This assumes the runtime or agent context can provide a unique ID.
    // For now, we'll require it to be passed or derive it if possible.
    this.agentId = runtime.agentId || 'unknown-agent'; // TODO: Ensure agentId is available and correct.

    this.subscribeToMessages();
  }

  static async start(runtime: IAgentRuntime): Promise<A2AService> {
    logger.info(`A2AService starting for agent ${runtime.agentId || 'unknown'}`);
    const service = new A2AService(runtime);
    // Register service with runtime if necessary, though ElizaOS might do this automatically
    // runtime.registerService(A2AService.serviceType, service);
    return service;
  }

  static async stop(runtime: IAgentRuntime): Promise<void> {
    logger.info(`A2AService stopping for agent ${runtime.agentId || 'unknown'}`);
    const service = runtime.getService<A2AService>(A2AService.serviceType);
    if (service) {
      service.cleanup();
    }
  }

  private subscribeToMessages() {
    const handler = (event: A2AInternalEvent) => {
      if (event.targetAgentId === this.agentId) {
        logger.debug(`[A2A - ${this.agentId}] Received message for this agent:`, { messageId: event.message.message_id, type: event.message.message_type });
        // Emit an event specific to this agent's runtime for its plugins to handle
        // This uses the agent's own runtime event emitter.
        this.runtime.emit(`a2a_message_received:${this.agentId}`, event.message);
        // Also, for more generic handling within the plugin (e.g. by an event handler in index.ts)
        this.runtime.emit('a2a_message_received', event.message);
      }
    };

    globalInMemoryA2ABus.on(A2A_INTERNAL_EVENT_TOPIC, handler);
    logger.info(`[A2A - ${this.agentId}] Subscribed to A2A message bus.`);

    // Store the handler to remove it later during cleanup
    this._internalHandler = handler;
  }

  private _internalHandler: ((event: A2AInternalEvent) => void) | null = null;

  public sendMessage(message: A2AMessage): void {
    logger.debug(`[A2A - ${this.agentId}] Sending message from ${message.sender_agent_id} to ${message.receiver_agent_id}:`, { messageId: message.message_id, type: message.message_type });

    const event: A2AInternalEvent = {
      targetAgentId: message.receiver_agent_id,
      message: message,
    };
    globalInMemoryA2ABus.emit(A2A_INTERNAL_EVENT_TOPIC, event);
  }

  public cleanup(): void {
    if (this._internalHandler) {
      globalInMemoryA2ABus.removeListener(A2A_INTERNAL_EVENT_TOPIC, this._internalHandler);
      logger.info(`[A2A - ${this.agentId}] Unsubscribed from A2A message bus.`);
      this._internalHandler = null;
    }
  }

  // Method for other plugins/actions to get this service instance via runtime
  public static getService(runtime: IAgentRuntime): A2AService | undefined {
    try {
      return runtime.getService<A2AService>(A2AService.serviceType);
    } catch (e) {
      logger.warn(`[A2A] A2AService not found in runtime for agent ${runtime.agentId}. It might not have been started or registered yet.`);
      return undefined;
    }
  }
}
