import {
  logger,
  type IAgentRuntime,
  type Plugin,
  type Action,
  type Memory,
  type State,
  type HandlerCallback,
  ModelType,
} from '@elizaos/core';
import { v4 as uuidv4 } from 'uuid';
import { z } from 'zod';
import {
  A2AMessageSchema,
  type A2AMessage,
  A2AMessageType,
  A2AProtocolVersion,
  PROCESS_A2A_TASK_EVENT,
  type TaskResponsePayload,
  // TaskRequestPayloadSchema, // Not directly used in this file after changes
} from './types';
import { A2AService } from './a2a-service';

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
  inputSchema: z.object({
    receiver_agent_id: z.string().uuid("Receiver Agent ID must be a valid UUID."),
    message_type: z.nativeEnum(A2AMessageType),
    payload: z.record(z.any(), { description: "The content of the message, specific to the message_type." }),
    conversation_id: z.string().uuid("Optional: Conversation ID to group related messages.").optional(),
  }).strip(),

  async validate(runtime: IAgentRuntime, _message: Memory, _state: State, options?: any): Promise<boolean> {
    if (!options) {
      logger.warn('[SEND_A2A_MESSAGE] Action called without options.');
      return false;
    }
    try {
      this.inputSchema?.parse(options);
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
    _message: Memory,
    _state: State,
    options: any,
    callback: HandlerCallback,
    _responses: Memory[]
  ): Promise<void> {
    const a2aService = getA2AService(runtime);
    if (!a2aService) {
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
      sender_agent_id: runtime.agentId,
      receiver_agent_id: options.receiver_agent_id,
      conversation_id: options.conversation_id,
      message_type: options.message_type,
      payload: options.payload,
    };
    try {
      A2AMessageSchema.parse(a2aMessage);
    } catch (e) {
      logger.error('[SEND_A2A_MESSAGE] Constructed A2A message is invalid:', { errors: (e as z.ZodError).formErrors.fieldErrors });
      await callback({ text: "Error: Failed to construct a valid A2A message."});
      return;
    }
    logger.info(`[${runtime.agentId}] Executing SEND_A2A_MESSAGE to ${options.receiver_agent_id} of type ${options.message_type}`);
    a2aService.sendMessage(a2aMessage);
    await callback({ text: `A2A message of type ${options.message_type} sent to agent ${options.receiver_agent_id}. Message ID: ${a2aMessage.message_id}` });
  },
  examples: [/* ... */]
};

export const a2aCommunicationPlugin: Plugin = {
  name: 'a2a-communication',
  description: 'Enables Agent-to-Agent (A2A) communication with task queuing.',

  async init(runtime: IAgentRuntime, _config: Record<string, any>) {
    const agentId = runtime.agentId || 'unknownAgentOnInit';
    logger.info(`[A2A Plugin - ${agentId}] Initializing...`);
    const a2aService = getA2AService(runtime);
    if (!a2aService) {
        logger.error(`[A2A Plugin - ${agentId}] A2AService could not be obtained during init. Task processing might not work.`);
    }

    runtime.on('a2a_message_received', (message: A2AMessage) => {
      logger.info(`[A2A Plugin - ${agentId}] Raw A2A message sniffed: Type: ${message.message_type}, From: ${message.sender_agent_id}, ID: ${message.message_id}`);
      if (message.message_type === A2AMessageType.INFO_SHARE) {
        logger.info(`[A2A Plugin - ${agentId}] INFO_SHARE received:`, message.payload);
      }
      // Supervisor specific: listen for TASK_RESPONSE to track delegated tasks
      if (runtime.character?.name === 'SupervisorAlpha' && message.message_type === A2AMessageType.TASK_RESPONSE) {
        logger.info(`[A2A Plugin - Supervisor ${agentId}] Received TASK_RESPONSE from ${message.sender_agent_id} for task ${message.payload?.original_task_name}. Status: ${message.payload?.status}`);
        // TODO: Implement more robust state tracking for the supervisor.
        // For now, just logging. Could update an internal task list or use plugin-sql.
      }
    });

    runtime.on(PROCESS_A2A_TASK_EVENT, async (taskMessage: A2AMessage) => {
      if (taskMessage.message_type !== A2AMessageType.TASK_REQUEST) return;
      const currentAgentId = runtime.agentId;
      if (!currentAgentId) {
        logger.error(`[A2A Plugin - ${PROCESS_A2A_TASK_EVENT}] Agent ID is undefined. Cannot process task or respond.`);
        return;
      }
      logger.info(`[A2A Plugin - ${currentAgentId}] Event: Processing A2A Task: ${taskMessage.payload?.task_name || taskMessage.message_id} from ${taskMessage.sender_agent_id}`);

      let taskResult: any = `Task "${taskMessage.payload?.task_name}" not specifically handled by agent ${currentAgentId}.`;
      let taskStatus: TaskResponsePayload['status'] = 'FAILURE';
      let errorMessage: string | null = `No specific handler for task_name: ${taskMessage.payload?.task_name} by agent ${runtime.character?.name || 'UnknownAgent'}`;
      const agentName = runtime.character?.name || "UnknownAgent";

      if (agentName === 'DevAgent001' && taskMessage.payload?.task_name === 'GENERATE_CODE') {
        // ... DeveloperAgent logic from previous step (implemented) ...
        logger.info(`[A2A Plugin - ${currentAgentId}] DeveloperAgent processing GENERATE_CODE task.`);
        try {
          const taskParams = taskMessage.payload.parameters || {};
          const lang = taskParams.language || 'python';
          const desc = taskMessage.payload.task_description || 'Write some code.';
          const llmPrompt = `Task: Generate ${lang} code.\nDescription: ${desc}\nFunction Name (if any): ${taskParams.function_name || 'N/A'}\nSignature/Inputs (if any): ${taskParams.signature_hint || 'N/A'}\nAdditional Requirements: ${taskParams.requirements || 'None'}\n\nOutput only the code.`;
          const systemPrompt = runtime.character?.system || "You are a helpful coding assistant.";
          logger.debug(`[A2A Plugin - ${currentAgentId}] Calling LLM for GENERATE_CODE. Prompt snippet: ${llmPrompt.substring(0,100)}...`);
          const generatedCode = await runtime.useModel(ModelType.TEXT_LARGE, { prompt: llmPrompt, system: systemPrompt });
          taskResult = generatedCode;
          taskStatus = 'SUCCESS';
          errorMessage = null;
          logger.info(`[A2A Plugin - ${currentAgentId}] Successfully generated code for task.`);
        } catch (e: any) {
          logger.error(`[A2A Plugin - ${currentAgentId}] Error during GENERATE_CODE LLM call:`, e);
          taskStatus = 'FAILURE';
          errorMessage = e.message || "LLM processing failed for GENERATE_CODE";
          taskResult = null;
        }
      } else if (agentName === 'AuditBot001' && taskMessage.payload?.task_name === 'PERFORM_AUDIT') {
        // ... AuditBot001 logic from previous step (implemented) ...
        logger.info(`[A2A Plugin - ${currentAgentId}] AuditBot001 processing PERFORM_AUDIT task.`);
        const auditParams = taskMessage.payload.parameters || {};
        const targetPath = auditParams.targetPath || auditParams.contractPath || auditParams.filePath || auditParams.path;
        const projectPath = auditParams.projectPath || (targetPath && targetPath.includes('/') ? targetPath.substring(0, targetPath.lastIndexOf('/')) : targetPath);
        if (!targetPath) {
          taskStatus = 'FAILURE'; errorMessage = "Missing 'targetPath' for PERFORM_AUDIT task."; taskResult = null;
        } else {
          try {
            let slitherOutputText = "Slither analysis not run or failed.";
            let forgeTestOutputText = "Forge tests not run or failed.";
            try {
              const slitherOpts = { targetPath: targetPath, outputFormat: "json-human-compact" };
              const slitherActionResult = await runtime.performAction('RUN_SLITHER_ANALYSIS', slitherOpts) as any;
              if (slitherActionResult && slitherActionResult.stdout) {
                slitherOutputText = `Slither Analysis (Exit Code ${slitherActionResult.exitCode}):\n${slitherActionResult.stdout}${slitherActionResult.stderr ? `\nStderr:\n${slitherActionResult.stderr}` : ''}`;
              } else { slitherOutputText = `Slither raw: ${JSON.stringify(slitherActionResult)}`;}
            } catch (e:any) { slitherOutputText = `Error running Slither: ${e.message}`; }
            if (projectPath) {
              try {
                const forgeOpts = { projectPath: projectPath, verbosity: "vvv" };
                const forgeActionResult = await runtime.performAction('RUN_FORGE_TEST', forgeOpts) as any;
                if (forgeActionResult && typeof forgeActionResult.stdout === 'string') {
                  forgeTestOutputText = `Forge Test Output (Exit Code ${forgeActionResult.exitCode}):\n${forgeActionResult.stdout}${forgeActionResult.stderr ? `\nStderr:\n${forgeActionResult.stderr}` : ''}`;
                } else { forgeTestOutputText = `Forge raw: ${JSON.stringify(forgeActionResult)}`;}
              } catch (e:any) { forgeTestOutputText = `Error running Forge: ${e.message}`; }
            } else { forgeTestOutputText = "Forge tests skipped: projectPath not defined."; }
            const interpretationPrompt = `Review Slither: \`\`\`${slitherOutputText}\`\`\` and Forge: \`\`\`${forgeTestOutputText}\`\`\`. Summarize findings for ${targetPath}.`;
            const systemPrompt = runtime.character?.system || "You are an expert security analyst.";
            const auditSummary = await runtime.useModel(ModelType.TEXT_LARGE, { prompt: interpretationPrompt, system: systemPrompt });
            taskResult = { summary: auditSummary, slitherRaw: slitherOutputText, forgeRaw: forgeTestOutputText };
            taskStatus = 'SUCCESS'; errorMessage = null;
          } catch (e: any) {
            logger.error(`[A2A Plugin - ${currentAgentId}] Error during PERFORM_AUDIT:`, e);
            taskStatus = 'FAILURE'; errorMessage = e.message || "Audit execution or LLM interpretation failed."; taskResult = null;
          }
        }
      } else if (agentName === 'SupervisorAlpha' && taskMessage.payload?.task_name === 'MANAGE_PROJECT_GOAL') {
        logger.info(`[A2A Plugin - ${currentAgentId}] SupervisorAlpha processing MANAGE_PROJECT_GOAL.`);
        const goalDescription = taskMessage.payload.goal_description as string;
        const supervisorSettings = runtime.character?.settings?.supervisor_settings as any;
        const decompositionTemplate = supervisorSettings?.default_task_decomposition_prompt_template as string;
        const teamRoster = supervisorSettings?.team_roster as Array<{ agent_id: string; capabilities: string[]; agent_type: string }> || [];

        if (!goalDescription || !decompositionTemplate) {
          taskStatus = 'FAILURE';
          errorMessage = "Missing 'goal_description' or 'default_task_decomposition_prompt_template' for MANAGE_PROJECT_GOAL.";
          taskResult = null;
        } else {
          try {
            const decompositionPrompt = decompositionTemplate.replace("{user_goal}", goalDescription);
            const systemPrompt = runtime.character?.system || "You are a project manager.";
            logger.debug(`[A2A Plugin - ${currentAgentId}] Supervisor: Calling LLM for task decomposition. Goal: ${goalDescription.substring(0, 100)}...`);
            const llmResponse = await runtime.useModel(ModelType.TEXT_LARGE, { prompt: decompositionPrompt, system: systemPrompt });

            let subTasks: any[] = [];
            try {
              const jsonRegex = /```(?:json)?\s*([\s\S]*?)\s*```/;
              const match = llmResponse.match(jsonRegex);
              const jsonString = match && match[1] ? match[1].trim() : llmResponse.trim();
              subTasks = JSON.parse(jsonString);
              if (!Array.isArray(subTasks)) throw new Error("LLM sub-task response not a JSON array.");
              logger.info(`[A2A Plugin - ${currentAgentId}] Supervisor: Decomposed goal into ${subTasks.length} sub-tasks.`);
            } catch (parseError: any) {
              logger.error(`[A2A Plugin - ${currentAgentId}] Supervisor: Failed to parse LLM sub-task JSON. Error: ${parseError.message}. Raw: ${llmResponse}`);
              throw new Error(`LLM sub-task parsing error: ${parseError.message}`);
            }

            const conversationIdForProject = taskMessage.conversation_id || uuidv4();
            let delegationLog = `Decomposed goal into ${subTasks.length} sub-tasks. Delegating for project ${conversationIdForProject}:\n`;

            for (const subTask of subTasks) {
              const targetAgentInfo = teamRoster.find(agent => agent.agent_type === subTask.agent_type || agent.capabilities.includes(subTask.task_name));
              if (targetAgentInfo) {
                const subTaskA2APayload = {
                  task_name: subTask.task_name,
                  task_description: subTask.task_description,
                  parameters: subTask.parameters,
                  expected_response_format: subTask.expected_response_format,
                };
                await runtime.performAction('SEND_A2A_MESSAGE', {
                  receiver_agent_id: targetAgentInfo.agent_id,
                  message_type: A2AMessageType.TASK_REQUEST,
                  payload: subTaskA2APayload,
                  conversation_id: conversationIdForProject,
                });
                delegationLog += `- Task "${subTask.task_name}" sent to ${targetAgentInfo.agent_type} (${targetAgentInfo.agent_id}).\n`;
              } else {
                delegationLog += `- Task "${subTask.task_name}" (type ${subTask.agent_type}) SKIPPED: No suitable agent in roster.\n`;
                logger.warn(`[A2A Plugin - ${currentAgentId}] Supervisor: No agent for type "${subTask.agent_type}" / task "${subTask.task_name}".`);
              }
            }
            taskResult = { summary: delegationLog, sub_tasks_count: subTasks.length, conversation_id: conversationIdForProject };
            taskStatus = 'SUCCESS'; // Supervisor's decomposition & initial delegation = SUCCESS
            errorMessage = null;
          } catch (e: any) {
            logger.error(`[A2A Plugin - ${currentAgentId}] Error in MANAGE_PROJECT_GOAL:`, e);
            taskStatus = 'FAILURE'; errorMessage = e.message; taskResult = null;
          }
        }
      }
      // ** END SupervisoryAgent Task Logic **

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
        receiver_agent_id: taskMessage.sender_agent_id,
        conversation_id: taskMessage.conversation_id,
        message_type: A2AMessageType.TASK_RESPONSE,
        payload: responsePayload,
      };
      const service = getA2AService(runtime);
      if (service) {
        logger.info(`[A2A Plugin - ${currentAgentId}] Sending TASK_RESPONSE for task ${taskMessage.payload?.task_name} to ${responseA2AMessage.receiver_agent_id}. Status: ${taskStatus}`);
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
