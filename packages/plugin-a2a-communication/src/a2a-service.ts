import { EventEmitter } from 'node:events';
import { logger, type IAgentRuntime, Service } from '@elizaos/core';
import { v4 as uuidv4 } from 'uuid';
import type { A2AMessage, A2AInternalEvent, TaskRequestPayload } from './types';
import { A2A_INTERNAL_EVENT_TOPIC, A2AMessageType, A2AProtocolVersion, PROCESS_A2A_TASK_EVENT } from './types';

// This is a simple in-memory message bus for A2A communication within the same process.
const globalInMemoryA2ABus = new EventEmitter();
// Increase max listeners if many agents might be running in the same process
globalInMemoryA2ABus.setMaxListeners(100);

interface AgentTaskQueueItem {
  taskId: string; // Typically the message_id of the TASK_REQUEST
  taskMessage: A2AMessage; // The full TASK_REQUEST message
  receivedAt: Date;
  status: 'pending' | 'processing';
}

export class A2AService extends Service {
  static readonly serviceType = 'A2AService';
  public capabilityDescription = 'Service for handling Agent-to-Agent (A2A) communication with task queuing.';
  private agentId: string;
  private runtime: IAgentRuntime;
  private taskQueue: AgentTaskQueueItem[] = [];
  private isProcessingTask: boolean = false;
  private taskProcessingInterval: NodeJS.Timeout | null = null;
  private _internalHandler: ((event: A2AInternalEvent) => void) | null = null;


  constructor(runtime: IAgentRuntime) {
    super(runtime);
    this.runtime = runtime;
    this.agentId = runtime.agentId;
    if (!this.agentId) {
        logger.fatal(`[A2A - constructor] Agent ID is undefined for A2AService. This is critical.`);
        // Throw an error or handle this case, as agentId is essential for message routing and task processing.
        // For now, let's assign a temporary one with a warning, but this needs robust handling.
        this.agentId = `unknown-agent-${uuidv4()}`;
        logger.warn(`[A2A - constructor] Assigned temporary ID to agent: ${this.agentId}`);
    }
    this.subscribeToMessages();
    this.startTaskProcessor();
  }

  static async start(runtime: IAgentRuntime): Promise<A2AService> {
    logger.info(`[A2A - ${runtime.agentId}] A2AService starting.`);
    if (!runtime.agentId) {
        logger.error(`[A2A - start] Cannot start A2AService without a valid agentId in runtime.`);
        throw new Error("A2AService requires a valid agentId in the runtime context.");
    }
    const service = new A2AService(runtime);
    return service;
  }

  static async stop(runtime: IAgentRuntime): Promise<void> {
    logger.info(`[A2A - ${runtime.agentId}] A2AService stopping.`);
    const service = runtime.getService<A2AService>(A2AService.serviceType);
    if (service) {
      service.cleanup();
    }
  }

  private subscribeToMessages() {
    // Ensure agentId is valid before subscribing
    if (!this.agentId || this.agentId.startsWith('unknown-agent')) {
        logger.error(`[A2A - ${this.agentId}] Cannot subscribe to messages due to invalid agentId.`);
        return;
    }

    const handler = (event: A2AInternalEvent) => {
      if (event.targetAgentId === this.agentId) {
        logger.debug(`[A2A - ${this.agentId}] Received message for this agent:`, { messageId: event.message.message_id, type: event.message.message_type, from: event.message.sender_agent_id });

        // Emit a generic event that the plugin's index.ts can listen to for ACKs etc.
        this.runtime.emit('a2a_message_received', event.message);

        // If it's a task request, enqueue it.
        if (event.message.message_type === A2AMessageType.TASK_REQUEST) {
          this.enqueueTask(event.message);
        } else {
          // For other message types (TASK_RESPONSE, INFO_SHARE, ACK), emit directly for agent logic to handle
          // This specific event can be listened to by the agent's core logic if it needs to react to non-task messages.
          this.runtime.emit(`${PROCESS_A2A_TASK_EVENT}_${event.message.message_type}`, event.message);
        }
      }
    };

    globalInMemoryA2ABus.on(A2A_INTERNAL_EVENT_TOPIC, handler);
    logger.info(`[A2A - ${this.agentId}] Subscribed to A2A message bus.`);
    this._internalHandler = handler;
  }

  private enqueueTask(taskMessage: A2AMessage) {
    const queueItem: AgentTaskQueueItem = {
      taskId: taskMessage.message_id,
      taskMessage,
      receivedAt: new Date(),
      status: 'pending',
    };
    this.taskQueue.push(queueItem);
    logger.info(`[A2A - ${this.agentId}] Task enqueued: ${taskMessage.payload?.task_name || taskMessage.message_id}. Queue size: ${this.taskQueue.length}`);

    // Immediate ACK for TASK_REQUEST upon queuing
    this.sendAck(taskMessage.sender_agent_id, taskMessage.message_id, taskMessage.conversation_id);
  }

  private sendAck(receiverId: string, originalMessageId: string, conversationId?: string) {
    if (!this.agentId || this.agentId.startsWith('unknown-agent')) {
        logger.error(`[A2A - ${this.agentId}] Cannot send ACK due to invalid sender agentId.`);
        return;
    }
    const ackMessage: A2AMessage = {
      protocol_version: A2AProtocolVersion,
      message_id: uuidv4(),
      timestamp: new Date().toISOString(),
      sender_agent_id: this.agentId,
      receiver_agent_id: receiverId,
      conversation_id: conversationId,
      message_type: A2AMessageType.ACK,
      payload: {
        original_message_id: originalMessageId,
        status: "TASK_QUEUED" // Or "MESSAGE_RECEIVED"
      },
    };
    this.sendMessage(ackMessage); // Use existing sendMessage to dispatch it
  }

  private startTaskProcessor() {
    if (this.taskProcessingInterval) {
      clearInterval(this.taskProcessingInterval);
    }
    // Process tasks every few seconds. This interval can be configurable.
    this.taskProcessingInterval = setInterval(async () => {
      if (!this.isProcessingTask && this.taskQueue.length > 0) {
        const item = this.taskQueue.shift(); // FIFO
        if (item) {
          this.isProcessingTask = true;
          item.status = 'processing';
          logger.info(`[A2A - ${this.agentId}] Processing task: ${item.taskMessage.payload?.task_name || item.taskId}`);
          try {
            // Emit an event on the agent's specific runtime for its core logic to pick up
            this.runtime.emit(PROCESS_A2A_TASK_EVENT, item.taskMessage);
          } catch (error) {
            logger.error(`[A2A - ${this.agentId}] Error emitting ${PROCESS_A2A_TASK_EVENT} for task ${item.taskId}:`, error);
            // Potentially re-queue or mark as failed. For now, just log.
          } finally {
            this.isProcessingTask = false;
          }
        }
      }
    }, 3000); // Check queue e.g. every 3 seconds
    logger.info(`[A2A - ${this.agentId}] Task processor started.`);
  }

  public sendMessage(message: A2AMessage): void {
    if (!this.agentId || this.agentId.startsWith('unknown-agent')) {
        logger.error(`[A2A - ${this.agentId}] Cannot send message due to invalid sender agentId.`);
        return;
    }
    // Ensure sender_agent_id is correctly set to this agent's ID
    const messageToSend = { ...message, sender_agent_id: this.agentId };

    logger.debug(`[A2A - ${this.agentId}] Sending message from ${messageToSend.sender_agent_id} to ${messageToSend.receiver_agent_id}:`, { messageId: messageToSend.message_id, type: messageToSend.message_type });

    const event: A2AInternalEvent = {
      targetAgentId: messageToSend.receiver_agent_id,
      message: messageToSend,
    };
    globalInMemoryA2ABus.emit(A2A_INTERNAL_EVENT_TOPIC, event);
  }

  public cleanup(): void {
    if (this._internalHandler) {
      globalInMemoryA2ABus.removeListener(A2A_INTERNAL_EVENT_TOPIC, this._internalHandler);
      logger.info(`[A2A - ${this.agentId}] Unsubscribed from A2A message bus.`);
      this._internalHandler = null;
    }
    if (this.taskProcessingInterval) {
      clearInterval(this.taskProcessingInterval);
      this.taskProcessingInterval = null;
      logger.info(`[A2A - ${this.agentId}] Task processor stopped.`);
    }
    this.taskQueue = []; // Clear queue on cleanup
  }

  public static getService(runtime: IAgentRuntime): A2AService | undefined {
    try {
      return runtime.getService<A2AService>(A2AService.serviceType);
    } catch (e) {
      logger.warn(`[A2A - ${runtime.agentId}] A2AService.getService() failed. Service might not be registered or runtime issue.`, e);
      return undefined;
    }
  }
}
