import {
  logger,
  type IAgentRuntime,
  type Plugin,
  type Action,
  type Memory,
  type State,
  type HandlerCallback,
} from '@elizaos/core';
import { v4 as uuidv4 } from 'uuid';
import {
  A2AMessageSchema,
  type A2AMessage,
  A2AMessageType,
  A2AProtocolVersion,
  TaskRequestPayloadSchema, // For validating payload of SEND_TASK action
} from './types';
import { A2AService } from './a2a-service';

// Helper function to get the A2AService instance from the runtime
function getA2AService(runtime: IAgentRuntime): A2AService | undefined {
  try {
    // Plugins add services to the runtime by their class name or a specific key.
    // Assuming the service is registered with its static serviceType.
    return runtime.getService<A2AService>(A2AService.serviceType);
  } catch (e) {
    logger.warn(`A2AService not found in runtime for agent ${runtime.agentId}. It might not have been started or registered. Error: ${e}`);
    return undefined;
  }
}

const sendMessageAction: Action = {
  name: 'SEND_A2A_MESSAGE',
  description: 'Sends a message to another agent using the A2A protocol.',
  similes: ['MESSAGE_AGENT', 'TALK_TO_AGENT_A2A'],
  // Input schema for the action's options/payload when called by the LLM
  // This defines what the LLM should provide in the `options` field of its action call.
  inputSchema: z.object({
    receiver_agent_id: z.string().uuid("Receiver Agent ID must be a valid UUID."),
    message_type: z.nativeEnum(A2AMessageType),
    payload: z.record(z.any(), { description: "The content of the message, specific to the message_type." }),
    conversation_id: z.string().uuid("Optional: Conversation ID to group related messages.").optional(),
  }).strip(), // .strip() to remove any extra properties LLM might hallucinate

  async validate(runtime: IAgentRuntime, _message: Memory, _state: State, options?: any): Promise<boolean> {
    if (!options) {
      logger.warn('[SEND_A2A_MESSAGE] Action called without options.');
      return false;
    }
    try {
      // Validate the options provided by the LLM against the inputSchema
      this.inputSchema?.parse(options);
      // Additional validation: ensure the A2AService is available
      const a2aService = getA2AService(runtime);
      if (!a2aService) {
        logger.error('[SEND_A2A_MESSAGE] A2AService is not available. Cannot send message.');
        return false;
      }
      return true;
    } catch (e) {
      if (e instanceof z.ZodError) {
        logger.warn('[SEND_A2A_MESSAGE] Invalid options provided:', { errors: e.formErrors.fieldErrors });
      } else {
        logger.warn('[SEND_A2A_MESSAGE] Validation error:', e);
      }
      return false;
    }
  },

  async handler(
    runtime: IAgentRuntime,
    _message: Memory, // Original message that triggered this action
    _state: State,
    options: any, // These are the validated options from inputSchema
    callback: HandlerCallback, // Use this to send a response back to the user/world if needed
    _responses: Memory[]
  ): Promise<void> {
    const a2aService = getA2AService(runtime);
    if (!a2aService) {
      // This should ideally be caught by validate, but as a safeguard:
      logger.error('[SEND_A2A_MESSAGE] A2AService is not available. Message not sent.');
      await callback({ text: "Error: A2A communication service is not available." });
      return;
    }

    if (!runtime.agentId) {
      logger.error('[SEND_A2A_MESSAGE] Sender agent ID is not available in runtime. Cannot send message.');
      await callback({ text: "Error: Sender agent ID is missing." });
      return;
    }

    const a2aMessage: A2AMessage = {
      protocol_version: A2AProtocolVersion,
      message_id: uuidv4(),
      timestamp: new Date().toISOString(),
      sender_agent_id: runtime.agentId, // Get sender's ID from runtime
      receiver_agent_id: options.receiver_agent_id,
      conversation_id: options.conversation_id,
      message_type: options.message_type,
      payload: options.payload,
    };

    // Validate the constructed A2A message itself (optional, but good practice)
    try {
      A2AMessageSchema.parse(a2aMessage);
    } catch (e) {
      logger.error('[SEND_A2A_MESSAGE] Constructed A2A message is invalid:', { errors: (e as z.ZodError).formErrors.fieldErrors });
      await callback({ text: "Error: Failed to construct a valid A2A message."});
      return;
    }

    logger.info(`[${runtime.agentId}] Executing SEND_A2A_MESSAGE to ${options.receiver_agent_id} of type ${options.message_type}`);
    a2aService.sendMessage(a2aMessage);

    // Optionally, send an immediate response back to the originating world/user
    // For A2A, the "result" might be just an ack that it was sent,
    // actual task results would come via another A2A message.
    await callback({ text: `A2A message of type ${options.message_type} sent to agent ${options.receiver_agent_id}. Message ID: ${a2aMessage.message_id}` });
  },
  examples: [
    // Example of how an LLM might call this action:
    // {
    //   "action": "SEND_A2A_MESSAGE",
    //   "options": {
    //     "receiver_agent_id": "some-target-agent-uuid",
    //     "message_type": "TASK_REQUEST",
    //     "payload": {
    //       "task_name": "ANALYZE_DATA",
    //       "data_pointer": "db://table/id"
    //     }
    //   }
    // }
  ]
};


export const a2aCommunicationPlugin: Plugin = {
  name: 'a2a-communication',
  description: 'Enables Agent-to-Agent (A2A) communication.',

  async init(runtime: IAgentRuntime, _config: Record<string, any>) {
    logger.info('Initializing A2A Communication Plugin...');
    // The A2AService should be started and managed by the ElizaOS runtime if listed in `services`
    // If not automatically managed, we might need to instantiate or ensure it's started here.
    // For now, assuming A2AService.start is called elsewhere or the service is auto-started.
    // We just need to ensure this agent subscribes to its messages.

    const a2aService = A2AService.getService(runtime);
    if (!a2aService) {
        logger.warn(`[A2A Plugin Init - ${runtime.agentId}] A2AService not yet available during plugin init. It should be started by the runtime.`);
        // It's possible the service starts after the plugin. The service constructor handles subscription.
    }

    // Event listener for when this agent receives an A2A message
    // The A2AService emits this on the specific agent's runtime
    runtime.on(`a2a_message_received:${runtime.agentId}`, (message: A2AMessage) => {
      logger.info(`[A2A Plugin - ${runtime.agentId}] Event: Received A2A message via specific runtime event`, { messageId: message.message_id, type: message.message_type, from: message.sender_agent_id });
      // TODO: Process the received message.
      // This could involve:
      // 1. Storing it in a specific memory (e.g., an A2A inbox).
      // 2. Triggering other actions or LLM evaluations based on the message content.
      // 3. For TASK_REQUEST, it might mean adding it to a task queue for the agent.
      // For now, just log it.
      if (message.message_type === A2AMessageType.TASK_REQUEST) {
        logger.info(`[A2A Plugin - ${runtime.agentId}] Task request received: ${message.payload.task_name || 'Unknown Task'}`);
        // Example: Reply with ACK
        // This would require the agent to have an agentId.
        if (runtime.agentId) {
            const ackPayload = {
                original_message_id: message.message_id,
                status: "RECEIVED"
            };
            const ackMessage: A2AMessage = {
                protocol_version: A2AProtocolVersion,
                message_id: uuidv4(),
                timestamp: new Date().toISOString(),
                sender_agent_id: runtime.agentId,
                receiver_agent_id: message.sender_agent_id,
                conversation_id: message.conversation_id,
                message_type: A2AMessageType.ACK,
                payload: ackPayload,
            };
            const service = getA2AService(runtime);
            service?.sendMessage(ackMessage);
        }
      }
    });
    logger.success('A2A Communication Plugin initialized and listener set up.');
  },

  actions: [sendMessageAction],

  services: [A2AService], // Declare the service for the runtime to manage

  // No specific model interactions defined by this plugin itself
  models: {},

  // No specific providers defined by this plugin
  providers: [],
};

export default a2aCommunicationPlugin;
