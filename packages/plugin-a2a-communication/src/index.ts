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
  type TaskRequestPayload,
} from './types';
import { A2AService } from './a2a-service';

import {
  SupervisorTaskDBService,
  type DelegatedSubTask,
  type InsertableDelegatedSubTask,
  SupervisorTaskStatus,
} from '@elizaos/plugin-supervisor-utils';


function getA2AService(runtime: IAgentRuntime): A2AService | undefined {
  try { return runtime.getService<A2AService>(A2AService.serviceType); }
  catch (e) { logger.warn(`[A2A Plugin - ${runtime.agentId}] A2AService not found. Error: ${e}`); return undefined; }
}

function getSupervisorTaskDBService(runtime: IAgentRuntime): SupervisorTaskDBService | undefined {
  try {
    const service = runtime.getService<SupervisorTaskDBService>(SupervisorTaskDBService.serviceType);
    if (service) return service;
    logger.warn(`[A2A Plugin - Supervisor ${runtime.agentId}] SupervisorTaskDBService not found. Task persistence will be skipped.`);
    return undefined;
  }
  catch (e) {
    logger.warn(`[A2A Plugin - Supervisor ${runtime.agentId}] Error getting SupervisorTaskDBService. Task persistence will be skipped. Error: ${(e as Error).message}`);
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
    if (!options) { logger.warn('[SEND_A2A_MESSAGE] Action called without options.'); return false; }
    try {
      this.inputSchema?.parse(options);
      if (!getA2AService(runtime)) { logger.error('[SEND_A2A_MESSAGE] A2AService unavailable.'); return false; }
      return true;
    } catch (e: any) {
        if (e instanceof z.ZodError) logger.warn('[SEND_A2A_MESSAGE] Invalid options provided:', { errors: e.formErrors.fieldErrors });
        else logger.warn('[SEND_A2A_MESSAGE] Validation error:', e.message);
        return false;
    }
  },
  async handler(runtime: IAgentRuntime, _m: Memory, _s: State, options: any, callback: HandlerCallback, _rs: Memory[]): Promise<void> {
    const a2aService = getA2AService(runtime);
    if (!a2aService) { await callback({ text: "Error: A2A Service unavailable."}); return; }
    if (!runtime.agentId) { await callback({ text: "Error: Sender Agent ID missing."}); return; }

    const generatedMessageId = uuidv4();
    const a2aMessage: A2AMessage = {
      protocol_version: A2AProtocolVersion, message_id: generatedMessageId, timestamp: new Date().toISOString(),
      sender_agent_id: runtime.agentId, receiver_agent_id: options.receiver_agent_id,
      conversation_id: options.conversation_id, message_type: options.message_type, payload: options.payload,
    };
    try { A2AMessageSchema.parse(a2aMessage); }
    catch (e: any) {
        logger.error('[SEND_A2A_MESSAGE] Constructed A2A message invalid:', { errors: (e as z.ZodError).formErrors.fieldErrors });
        await callback({ text: "Error: Failed to construct valid A2A message."}); return;
    }
    logger.info(`[${runtime.agentId}] Executing SEND_A2A_MESSAGE to ${options.receiver_agent_id} (MsgID: ${generatedMessageId})`);
    a2aService.sendMessage(a2aMessage);
    await callback({ text: `A2A message sent. ID: ${generatedMessageId}`, data: { messageId: generatedMessageId } });
  },
};

async function checkAndDelegateWaitingTasksSupervisorLogic(
    runtime: IAgentRuntime,
    projectConversationId: string
) {
    const supervisorTaskDBService = getSupervisorTaskDBService(runtime);
    if (!runtime.agentId || runtime.character?.name !== 'SupervisorAlpha' || !supervisorTaskDBService) {
        logger.warn(`[A2A Plugin - checkAndDelegate] Conditions not met for supervisor ${runtime.agentId} or DB service unavailable.`);
        return;
    }
    logger.info(`[A2A Plugin - Supervisor ${runtime.agentId}] Checking for waiting tasks in project ${projectConversationId}.`);

    const supervisorSettings = runtime.character?.settings?.supervisor_settings as any;
    const teamRoster = supervisorSettings?.team_roster as Array<{ agent_id: string; capabilities: string[]; agent_type: string }> || [];

    try {
        const waitingTasks = await supervisorTaskDBService.getTasksByProjectAndStatus(projectConversationId, SupervisorTaskStatus.WAITING_FOR_DEPENDENCY);

        for (const waitingTask of waitingTasks) {
            if (!waitingTask.id) { // Should always have an id from DB
                logger.error(`[A2A Plugin - Supervisor ${runtime.agentId}] Task ${waitingTask.subTaskName} is missing a DB ID, cannot process.`);
                continue;
            }
            const dependencies = waitingTask.dependenciesJson ? JSON.parse(waitingTask.dependenciesJson) as string[] : [];
            let allDependenciesMet = true;
            if (dependencies.length > 0) {
                const dependencyTasks = await supervisorTaskDBService.getTasksByProjectAndNames(projectConversationId, dependencies);
                if (dependencyTasks.length < dependencies.length || dependencyTasks.some(d => d.status !== SupervisorTaskStatus.SUCCESS)) {
                    allDependenciesMet = false;
                }
            }

            if (allDependenciesMet) {
                // The subTask.agent_type was from LLM, might not be directly on waitingTask if not stored.
                // We need to robustly get the agent_type, or match by capability.
                // For PoC, assume subTaskName can be used to find a capability.
                const targetAgentInfo = teamRoster.find(agent => agent.capabilities?.includes(waitingTask.subTaskName) || agent.agent_type === (waitingTask as any).agent_type_hint); // agent_type_hint if stored

                if (targetAgentInfo && waitingTask.id) {
                    logger.info(`[A2A Plugin - Supervisor ${runtime.agentId}] Dependencies MET for ${waitingTask.subTaskName}. Attempting to delegate to ${targetAgentInfo.agent_id}.`);

                    const taskPayload: TaskRequestPayload = {
                        task_name: waitingTask.subTaskName,
                        task_description: (waitingTask as any).task_description || `Execute task: ${waitingTask.subTaskName}`,
                        parameters: waitingTask.parametersJson ? JSON.parse(waitingTask.parametersJson) : {},
                        expected_response_format: (waitingTask as any).expected_response_format,
                    };

                    const actionResult = await runtime.performAction('SEND_A2A_MESSAGE', {
                        receiver_agent_id: targetAgentInfo.agent_id,
                        message_type: A2AMessageType.TASK_REQUEST,
                        payload: taskPayload,
                        conversation_id: projectConversationId,
                    }) as { data?: { messageId?: string }};
                    const newA2ARequestMessageId = actionResult?.data?.messageId;

                    if (newA2ARequestMessageId) {
                        await supervisorTaskDBService.updateTaskByDbId(
                            waitingTask.id,
                            {
                                status: SupervisorTaskStatus.DELEGATION_SENT,
                                a2aRequestMessageId: newA2ARequestMessageId,
                            }
                        );
                        logger.info(`[A2A Plugin - Supervisor ${runtime.agentId}] Re-delegated task ${waitingTask.subTaskName} (New A2A ID: ${newA2ARequestMessageId}) to ${targetAgentInfo.agent_id}. DB status updated.`);
                    } else {
                         logger.warn(`[A2A Plugin - Supervisor ${runtime.agentId}] Failed to get new A2A message ID for re-delegated task ${waitingTask.subTaskName}. Task remains WAITING.`);
                         await supervisorTaskDBService.updateTaskByDbId(waitingTask.id, { lastErrorMessage: "Failed to get A2A msg ID on re-delegation." });
                    }
                } else if (!targetAgentInfo) {
                     logger.warn(`[A2A Plugin - Supervisor ${runtime.agentId}] Still no suitable agent for re-delegating ${waitingTask.subTaskName}.`);
                     await supervisorTaskDBService.updateTaskByDbId(waitingTask.id, { status: SupervisorTaskStatus.FAILURE, lastErrorMessage: "No suitable agent found for re-delegation." });
                }
            }
        }
    } catch (dbError: any) {
        logger.error(`[A2A Plugin - Supervisor ${runtime.agentId}] Error checking/re-delegating waiting tasks for project ${projectConversationId}: ${dbError.message}`);
    }
}

export const a2aCommunicationPlugin: Plugin = {
  name: 'a2a-communication',
  description: 'Enables Agent-to-Agent (A2A) communication with task queuing.',
  async init(runtime: IAgentRuntime, _config: Record<string, any>) {
    const agentId = runtime.agentId || `unknownAgentOnInit-${uuidv4()}`;
    logger.info(`[A2A Plugin - ${agentId}] Initializing...`);

    runtime.on('a2a_message_received', async (message: A2AMessage) => {
      const currentAgentName = runtime.character?.name || agentId;
      logger.info(`[A2A Plugin - ${currentAgentName}] Raw A2A message sniffed: Type: ${message.message_type}, From: ${message.sender_agent_id}, ID: ${message.message_id}`);

      if (message.message_type === A2AMessageType.INFO_SHARE) { /* ... */ }

      if (currentAgentName === 'SupervisorAlpha' && (message.message_type === A2AMessageType.ACK || message.message_type === A2AMessageType.TASK_RESPONSE)) {
        const supervisorTaskDBService = getSupervisorTaskDBService(runtime);
        if (supervisorTaskDBService && runtime.agentId) {
          try {
            let statusToSet: SupervisorTaskStatus | undefined = undefined;
            let resultSummaryToSet: string | undefined = undefined;
            let errorMessageToSet: string | undefined = undefined;
            let a2aRequestMessageIdToUpdate: string | undefined = undefined;
            let projectConvIdForDepCheck: string | undefined = message.conversation_id;

            if (message.message_type === A2AMessageType.ACK && message.payload?.original_message_id) {
                statusToSet = SupervisorTaskStatus.ACKNOWLEDGED;
                a2aRequestMessageIdToUpdate = message.payload.original_message_id as string;
            } else if (message.message_type === A2AMessageType.TASK_RESPONSE) {
                const taskResponsePayload = message.payload as TaskResponsePayload;
                statusToSet = taskResponsePayload.status === 'SUCCESS' ? SupervisorTaskStatus.SUCCESS : SupervisorTaskStatus.FAILURE;
                resultSummaryToSet = typeof taskResponsePayload.result === 'string' ? taskResponsePayload.result : JSON.stringify(taskResponsePayload.result);
                errorMessageToSet = taskResponsePayload.error_message || undefined;
                a2aRequestMessageIdToUpdate = message.payload?.original_request_message_id as string;
                 if (!a2aRequestMessageIdToUpdate && taskResponsePayload.original_task_name) {
                     logger.warn(`[A2A Plugin - Supervisor ${runtime.agentId}] TASK_RESPONSE from ${message.sender_agent_id} for task ${taskResponsePayload.original_task_name} missing 'original_request_message_id'. Update by this ID will fail.`);
                 }
            }

            if (statusToSet && a2aRequestMessageIdToUpdate) {
              await supervisorTaskDBService.updateTaskStatusByA2ARequestId(a2aRequestMessageIdToUpdate, statusToSet, { resultSummary: resultSummaryToSet, lastErrorMessage: errorMessageToSet });
              if (statusToSet === SupervisorTaskStatus.SUCCESS && projectConvIdForDepCheck) {
                await checkAndDelegateWaitingTasksSupervisorLogic(runtime, projectConvIdForDepCheck); // Pass runtime and projectConvId
              }
            }
          } catch (dbError: any) { logger.error(`[A2A Plugin - Supervisor ${runtime.agentId}] DB update error for msg ${message.message_id}: ${dbError.message}`); }
        } else if (currentAgentName === 'SupervisorAlpha') { logger.warn(`[A2A Plugin - Supervisor ${runtime.agentId}] SupervisorTaskDBService not available for msg ${message.message_id}.`); }
      }
    });

    runtime.on(PROCESS_A2A_TASK_EVENT, async (taskMessage: A2AMessage) => {
      if (taskMessage.message_type !== A2AMessageType.TASK_REQUEST) return;
      const currentAgentId = runtime.agentId!;
      const agentName = runtime.character?.name || "UnknownAgent";
      let taskResult: any = `Task "${taskMessage.payload?.task_name}" unhandled.`;
      let taskStatus: TaskResponsePayload['status'] = 'FAILURE';
      let errorMessage: string | null = `No handler for ${taskMessage.payload?.task_name} by ${agentName}`;

      if (agentName === 'DevAgent001' && taskMessage.payload?.task_name === 'GENERATE_CODE') { /* ... DevAgent logic ... */ }
      else if (agentName === 'AuditBot001' && taskMessage.payload?.task_name === 'PERFORM_AUDIT') { /* ... AuditBot logic ... */ }
      else if (agentName === 'SupervisorAlpha' && taskMessage.payload?.task_name === 'MANAGE_PROJECT_GOAL') {
        logger.info(`[A2A Plugin - ${currentAgentId}] SupervisorAlpha processing MANAGE_PROJECT_GOAL.`);
        const goalDescription = taskMessage.payload.goal_description as string;
        const supervisorSettings = runtime.character?.settings?.supervisor_settings as any;
        const decompositionTemplate = supervisorSettings?.default_task_decomposition_prompt_template as string;
        const teamRoster = supervisorSettings?.team_roster as Array<{ agent_id: string; capabilities: string[]; agent_type: string }> || [];
        const supervisorTaskDBService = getSupervisorTaskDBService(runtime);

        if (!goalDescription || !decompositionTemplate || !supervisorTaskDBService) {
          taskStatus = 'FAILURE'; errorMessage = "Supervisor: Config missing or DB service unavailable for MANAGE_PROJECT_GOAL."; taskResult = null;
        } else {
          try {
            const decompositionPrompt = decompositionTemplate.replace("{user_goal}", goalDescription);
            const llmResponse = await runtime.useModel(ModelType.TEXT_LARGE, { prompt: decompositionPrompt, system: runtime.character?.system });
            let subTasks: Array<TaskRequestPayload & {agent_type?: string; dependencies?: string[]; subTaskName?: string }> = [];
            try {
                const jsonRegex = /```(?:json)?\s*([\s\S]*?)\s*```/;
                const match = llmResponse.match(jsonRegex);
                const jsonString = match && match[1] ? match[1].trim() : llmResponse.trim();
                subTasks = JSON.parse(jsonString);
                if (!Array.isArray(subTasks)) throw new Error("LLM sub-task response not a JSON array.");
            } catch (parseError: any) { throw new Error(`LLM sub-task parsing error: ${parseError.message}`); }

            const conversationIdForProject = taskMessage.conversation_id || uuidv4();
            let delegationLog = `Decomposed goal into ${subTasks.length} for project ${conversationIdForProject}:\n`;

            for (const subTask of subTasks) {
              subTask.task_name = subTask.task_name || subTask.subTaskName;
              if(!subTask.task_name) { delegationLog += `- SKIPPED sub-task (missing task_name).\n`; continue; }

              let canDelegate = true;
              const dependencies = subTask.dependencies || [];
              if (dependencies.length > 0) {
                const depTasksFromDb = await supervisorTaskDBService.getTasksByProjectAndNames(conversationIdForProject, dependencies);
                if (depTasksFromDb.length < dependencies.length || depTasksFromDb.some(d => d.status !== SupervisorTaskStatus.SUCCESS)) {
                    canDelegate = false;
                }
              }

              const targetAgentInfo = teamRoster.find(agent => agent.agent_type === subTask.agent_type || agent.capabilities?.includes(subTask.task_name!));
              const initialStatus = canDelegate ? SupervisorTaskStatus.PENDING_DELEGATION : SupervisorTaskStatus.WAITING_FOR_DEPENDENCY;

              // Record all tasks first with a placeholder A2A ID if not immediately delegating
              const initialA2ARequestId = `deferred-${subTask.task_name}-${uuidv4()}`;
              const newDbTaskData: InsertableDelegatedSubTask = {
                projectConversationId: conversationIdForProject,
                a2aRequestMessageId: initialA2ARequestId,
                subTaskName: subTask.task_name,
                assignedAgentId: targetAgentInfo?.agent_id || 'NONE_FOUND',
                status: initialStatus,
                parametersJson: JSON.stringify(subTask.parameters || {}),
                dependenciesJson: JSON.stringify(dependencies),
                // id, delegatedAt, lastStatusUpdateAt will be set by service/DB
              };
              const recordedTask = await supervisorTaskDBService.recordNewSubTask(newDbTaskData);

              if (!recordedTask || !recordedTask.id) {
                  delegationLog += `- Task "${subTask.task_name}" FAILED to record in DB.\n`;
                  continue;
              }
              delegationLog += `- Task "${subTask.task_name}" (DB ID: ${recordedTask.id}) to ${targetAgentInfo?.agent_type || 'N/A'} initial status: ${initialStatus}.\n`;

              if (canDelegate && targetAgentInfo) {
                const subTaskA2APayload: TaskRequestPayload = {
                    task_name: subTask.task_name, task_description: subTask.task_description,
                    parameters: subTask.parameters, expected_response_format: subTask.expected_response_format,
                };
                const actionResult = await runtime.performAction('SEND_A2A_MESSAGE', {
                  receiver_agent_id: targetAgentInfo.agent_id, message_type: A2AMessageType.TASK_REQUEST,
                  payload: subTaskA2APayload, conversation_id: conversationIdForProject,
                }) as { data?: { messageId?: string }};
                const sentA2AMessageId = actionResult?.data?.messageId;

                if (sentA2AMessageId) {
                    // Update the existing DB record with the actual A2A message ID and DELEGATION_SENT status
                    await supervisorTaskDBService.updateTaskByDbId(recordedTask.id, {
                        a2aRequestMessageId: sentA2AMessageId,
                        status: SupervisorTaskStatus.DELEGATION_SENT,
                    });
                    delegationLog = delegationLog.replace(`status: ${SupervisorTaskStatus.PENDING_DELEGATION}`, `status: ${SupervisorTaskStatus.DELEGATION_SENT} (A2A ID: ${sentA2AMessageId})`);
                    logger.info(`[A2A Plugin - Supervisor] Delegated ${subTask.task_name} (A2A ID: ${sentA2AMessageId}) to ${targetAgentInfo.agent_id}. DB status: DELEGATION_SENT.`);
                } else {
                    delegationLog += `  -> FAILED to get sent A2A Msg ID for "${subTask.task_name}". Task remains ${initialStatus}.\n`;
                    await supervisorTaskDBService.updateTaskByDbId(recordedTask.id, { status: SupervisorTaskStatus.FAILURE, lastErrorMessage: "Failed to get A2A message ID upon delegation."});
                }
              } else if (!targetAgentInfo && canDelegate) { // Was ready but no agent
                delegationLog += `- Task "${subTask.task_name}" SKIPPED (was ready): No suitable agent.\n`;
                await supervisorTaskDBService.updateTaskByDbId(recordedTask.id, { status: SupervisorTaskStatus.FAILURE, lastErrorMessage: "No suitable agent found in roster."});
              }
            }
            taskResult = { summary: delegationLog, project_conversation_id: conversationIdForProject };
            taskStatus = 'SUCCESS'; errorMessage = null;
          } catch (e: any) {
            logger.error(`[A2A Plugin - ${currentAgentId}] Error in MANAGE_PROJECT_GOAL:`, e);
            taskStatus = 'FAILURE'; errorMessage = e.message; taskResult = null;
          }
        }
      }
      // ** END SupervisoryAgent Task Logic **

      const responsePayload: TaskResponsePayload = {
        original_task_name: String(taskMessage.payload?.task_name || 'unknown_task'),
        original_request_message_id: taskMessage.message_id,
        status: taskStatus,
        result: taskResult,
        error_message: errorMessage,
      };
      const responseA2AMessage: A2AMessage = {
        protocol_version: A2AProtocolVersion, message_id: uuidv4(), timestamp: new Date().toISOString(),
        sender_agent_id: currentAgentId, receiver_agent_id: taskMessage.sender_agent_id,
        conversation_id: taskMessage.conversation_id, message_type: A2AMessageType.TASK_RESPONSE,
        payload: responsePayload,
      };
      const service = getA2AService(runtime);
      if (service) { service.sendMessage(responseA2AMessage); }
      else { logger.error(`[A2A Plugin - ${currentAgentId}] Failed to get A2AService for TASK_RESPONSE.`); }
    });

    logger.success(`[A2A Plugin - ${agentId}] Initialized. Listening for raw A2A messages and processed tasks.`);
  },
  actions: [sendMessageAction],
  services: [A2AService], // SupervisorTaskDBService is used internally, not registered by this plugin
  models: {},
  providers: [],
};

export default a2aCommunicationPlugin;
