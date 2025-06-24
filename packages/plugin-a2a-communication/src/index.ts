import {
  logger,
  type IAgentRuntime,
  type Plugin,
  type Action,
  type Memory,
  type State,
  type HandlerCallback,
  ModelType, // Required for LLM interaction
} from '@elizaos/core';
import { v4 as uuidv4 } from 'uuid';
import { z } from 'zod'; // Ensure zod is imported for inputSchema
import {
  A2AMessageSchema,
  type A2AMessage,
  A2AMessageType,
  A2AProtocolVersion,
  PROCESS_A2A_TASK_EVENT, // Import the new event name
  TaskRequestPayloadSchema,
  type TaskResponsePayload,
} from './types';
import { A2AService } from './a2a-service';

// Helper function to get the A2AService instance from the runtime
function getA2AService(runtime: IAgentRuntime): A2AService | undefined {
  try {
    return runtime.getService<A2AService>(A2AService.serviceType);
  } catch (e) {
    logger.warn(`[A2A Plugin - ${runtime.agentId}] A2AService not found. Error: ${e}`);
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
    /*
    {
      "action": "SEND_A2A_MESSAGE",
      "options": {
        "receiver_agent_id": "some-target-agent-uuid",
        "message_type": "TASK_REQUEST",
        "payload": {
          "task_name": "GENERATE_CODE",
          "task_description": "Write a Python function that adds two numbers.",
          "parameters": { "language": "python" }
        },
        "conversation_id": "conv-123"
      }
    }
    */
  ]
};


export const a2aCommunicationPlugin: Plugin = {
  name: 'a2a-communication',
  description: 'Enables Agent-to-Agent (A2A) communication with task queuing.',

  async init(runtime: IAgentRuntime, _config: Record<string, any>) {
    const agentId = runtime.agentId || 'unknownAgentOnInit';
    logger.info(`[A2A Plugin - ${agentId}] Initializing...`);

    // Ensure A2AService is started and available.
    // It's declared in `services` array, so ElizaOS runtime should manage its lifecycle.
    // The service constructor now handles its own subscriptions and starts the task processor.
    const a2aService = getA2AService(runtime);
    if (!a2aService) {
        // This might happen if service registration order is an issue,
        // or if the service failed to start. The service itself logs errors on start failure.
        logger.error(`[A2A Plugin - ${agentId}] A2AService could not be obtained during init. Task processing might not work.`);
    }

    // Listener for ALL A2A messages received by this agent (before queuing for TASK_REQUESTS)
    // This is useful for immediate reactions like logging or specific handling of non-task messages.
    // The A2AService emits 'a2a_message_received' when a message targets this agent.
    // The ACK for TASK_REQUEST is now handled by A2AService upon queuing.
    runtime.on('a2a_message_received', (message: A2AMessage) => {
      logger.info(`[A2A Plugin - ${agentId}] Raw A2A message sniffed: Type: ${message.message_type}, From: ${message.sender_agent_id}, ID: ${message.message_id}`);
      // Example: if other message types like INFO_SHARE need immediate plugin-level reaction
      if (message.message_type === A2AMessageType.INFO_SHARE) {
        logger.info(`[A2A Plugin - ${agentId}] INFO_SHARE received:`, message.payload);
        // Agent's core logic or other plugins would decide how to use this info.
      }
    });

    // Listener for dequeued TASK_REQUESTS that need processing by this agent's LLM/logic
    runtime.on(PROCESS_A2A_TASK_EVENT, async (taskMessage: A2AMessage) => {
      if (taskMessage.message_type !== A2AMessageType.TASK_REQUEST) return;

      const currentAgentId = runtime.agentId; // Crucial for sending response
      if (!currentAgentId) {
        logger.error(`[A2A Plugin - ${PROCESS_A2A_TASK_EVENT}] Agent ID is undefined. Cannot process task or respond.`);
        return;
      }

      logger.info(`[A2A Plugin - ${currentAgentId}] Event: Processing A2A Task: ${taskMessage.payload?.task_name || taskMessage.message_id} from ${taskMessage.sender_agent_id}`);

      // --- Placeholder for LLM Interaction & Task Execution ---
      // This is where the agent (e.g., DeveloperAgent, AuditorAgent) would use its LLM (DeepSeek)
      // to understand taskMessage.payload and generate a result.
      // For this generic A2A plugin, we'll simulate a simple "echo" or "not implemented" response.
      // In specialized agents (DeveloperAgent, AuditorAgent), this logic would be more sophisticated.

      let taskResult: any = `Task "${taskMessage.payload?.task_name}" processed by ${currentAgentId}. (Default Handler - Implement specific logic in agent)`;
      let taskStatus: TaskResponsePayload['status'] = 'SUCCESS';
      let errorMessage: string | null = null;

      // Example: Simulate LLM call for a "GENERATE_CODE" task (conceptual)
      if (taskMessage.payload?.task_name === 'GENERATE_CODE_EXAMPLE') {
        try {
          const codePrompt = `Based on the A2A task request:\n${JSON.stringify(taskMessage.payload, null, 2)}\nGenerate the requested code.`;
          // const generatedCode = await runtime.useModel(ModelType.TEXT_SMALL, { prompt: codePrompt }); // Agent uses its configured LLM
          // taskResult = generatedCode;
          // For PoC, simulate:
          taskResult = `// Simulated code for ${taskMessage.payload?.task_description}\nfunction example() { return "hello"; }`;
          logger.info(`[A2A Plugin - ${currentAgentId}] Simulated code generation for task.`);
        } catch (e: any) {
          logger.error(`[A2A Plugin - ${currentAgentId}] Error during simulated LLM call for task:`, e);
          taskStatus = 'FAILURE';
          errorMessage = e.message || "LLM processing failed";
          taskResult = null;
        }
      }
      // --- End Placeholder ---

      const responsePayload: TaskResponsePayload = {
        original_task_name: String(taskMessage.payload?.task_name || 'unknown_task'),
        status: taskStatus,
        result: taskResult,
        error_message: errorMessage,
      };

      const responseA2AMessage: A2AMessage = {
        protocol_version: A2AProtocolVersion,
        message_id: uuidv4(),
        timestamp: new Date().toISOString(),
        sender_agent_id: currentAgentId,
        receiver_agent_id: taskMessage.sender_agent_id, // Send back to original requester
        conversation_id: taskMessage.conversation_id,
        message_type: A2AMessageType.TASK_RESPONSE,
        payload: responsePayload,
      };

      const service = getA2AService(runtime);
      if (service) {
        logger.info(`[A2A Plugin - ${currentAgentId}] Sending TASK_RESPONSE for task ${taskMessage.payload?.task_name} to ${responseA2AMessage.receiver_agent_id}.`);
        service.sendMessage(responseA2AMessage);
      } else {
        logger.error(`[A2A Plugin - ${currentAgentId}] Failed to get A2AService to send TASK_RESPONSE.`);
      }
    });

    logger.success(`[A2A Plugin - ${agentId}] Initialized. Listening for raw A2A messages and processed tasks.`);
  },

  actions: [sendMessageAction],

  services: [A2AService],

  models: {},
  providers: [],
};

export default a2aCommunicationPlugin;
