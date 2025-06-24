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
  DELEGATED_SUB_TASKS_TABLE_NAME, // Conceptual table name
  DelegatedSubTaskStatus,       // Enum for status
  type NewDelegatedSubTask,      // Type for DB interaction
  // DelegatedSubTaskSchema,    // Zod schema for DB records (if needed for validation here)
} from './types';
import { A2AService } from './a2a-service';

// --- Conceptual SQL Service Interaction ---
interface SQLService {
  db: {
    insert: (table: { name: string }) => ({
      values: (data: NewDelegatedSubTask | NewDelegatedSubTask[]) => ({
        execute: () => Promise<any>,
        returning?: () => Promise<any[]>,
      })
    });
    update: (table: { name: string }) => ({
      set: (data: Partial<NewDelegatedSubTask>) => ({
        where: (condition: any) => ({ execute: () => Promise<any> })
      })
    });
    select: (fields?: any) => ({ // Simplified select
        from: (table: { name: string }) => ({
            where: (condition: any) => ({
                limit: (count: number) => ({ execute: () => Promise<Array<any>> }),
                execute: () => Promise<Array<any>>,
            })
        })
    });
  };
}
const delegatedSubTasksSchema = { name: DELEGATED_SUB_TASKS_TABLE_NAME };
// Conceptual operators for Drizzle-like queries
const eq = (fieldIdentifier: string, value: any) => ({ type: 'eq', field: fieldIdentifier, value });
const and = (...conditions: any[]) => ({ type: 'and', conditions });
const or = (...conditions: any[]) => ({ type: 'or', conditions });
const inArray = (fieldIdentifier: string, values: any[]) => ({ type: 'inArray', field: fieldIdentifier, values });
// --- End Conceptual SQL Service Interaction ---


function getA2AService(runtime: IAgentRuntime): A2AService | undefined {
  try { return runtime.getService<A2AService>(A2AService.serviceType); }
  catch (e) { logger.warn(`[A2A Plugin - ${runtime.agentId}] A2AService not found. Error: ${e}`); return undefined; }
}

function getSQLService(runtime: IAgentRuntime): SQLService | undefined {
  try {
    const service = runtime.getService<SQLService>('@elizaos/plugin-sql');
    if (service && typeof service.db?.insert === 'function' &&
        typeof service.db?.update === 'function' &&
        typeof service.db?.select === 'function') { // Check for select
        return service;
    }
    logger.warn(`[A2A Plugin - Supervisor ${runtime.agentId}] SQLService ('@elizaos/plugin-sql') found but lacks expected db methods.`);
    return undefined;
  }
  catch (e) { logger.warn(`[A2A Plugin - Supervisor ${runtime.agentId}] SQLService ('@elizaos/plugin-sql') not available. Task persistence will be skipped. Error: ${e}`); return undefined; }
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
    } catch (e) { /* ... error logging ... */ return false; }
  },
  async handler(runtime: IAgentRuntime, _m: Memory, _s: State, options: any, callback: HandlerCallback, _rs: Memory[]): Promise<void> {
    const a2aService = getA2AService(runtime);
    if (!a2aService || !runtime.agentId) { /* ... error handling ... */ return; }
    const generatedMessageId = uuidv4();
    const a2aMessage: A2AMessage = {
      protocol_version: A2AProtocolVersion, message_id: generatedMessageId, timestamp: new Date().toISOString(),
      sender_agent_id: runtime.agentId, receiver_agent_id: options.receiver_agent_id,
      conversation_id: options.conversation_id, message_type: options.message_type, payload: options.payload,
    };
    try { A2AMessageSchema.parse(a2aMessage); }
    catch (e) { /* ... error handling ... */ return; }
    logger.info(`[${runtime.agentId}] Executing SEND_A2A_MESSAGE to ${options.receiver_agent_id} (MsgID: ${generatedMessageId})`);
    a2aService.sendMessage(a2aMessage);
    await callback({ text: `A2A message sent. ID: ${generatedMessageId}`, data: { messageId: generatedMessageId } });
  },
};

// Helper function for Supervisor to check and delegate waiting tasks
async function checkAndDelegateWaitingTasks(runtime: IAgentRuntime, projectConversationId: string, sqlService: SQLService) {
    if (!runtime.agentId || runtime.character?.name !== 'SupervisorAlpha') return;
    logger.info(`[A2A Plugin - Supervisor ${runtime.agentId}] Checking for waiting tasks in project ${projectConversationId}.`);

    const supervisorSettings = runtime.character?.settings?.supervisor_settings as any;
    const teamRoster = supervisorSettings?.team_roster as Array<{ agent_id: string; capabilities: string[]; agent_type: string }> || [];

    try {
        // @ts-ignore - Conceptual DB call
        const waitingTasks = await sqlService.db.select()
            .from(delegatedSubTasksSchema)
            // @ts-ignore
            .where(and(
                eq('projectConversationId', projectConversationId),
                eq('status', DelegatedSubTaskStatus.WAITING_FOR_DEPENDENCY)
            ))
            .execute() as DelegatedSubTask[]; // Cast to type

        for (const waitingTask of waitingTasks) {
            // This is a simplified re-check; actual subTask details (like dependencies array) should be stored in DB or retrieved.
            // For PoC, assume we need to re-fetch/re-evaluate from a conceptual full project plan.
            // Here, we'll just log and conceptually try to delegate again if it were a real scenario.
            // A real implementation would parse waitingTask.dependencies (if stored) and check their status.
            logger.info(`[A2A Plugin - Supervisor ${runtime.agentId}] Re-evaluating task ${waitingTask.subTaskName} (ID: ${waitingTask.a2aRequestMessageId}) currently in WAITING_FOR_DEPENDENCY.`);

            // Simplified: Assume for PoC that if we are re-checking, we try to delegate again.
            // A full implementation needs to parse subTask.dependencies string (JSON array)
            // and query DB for status of each dependency.
            // This is a placeholder for that complex dependency check logic.
            const dependenciesMet = true; // Placeholder: In reality, query DB for statuses of dependencies.

            if (dependenciesMet) {
                const targetAgentInfo = teamRoster.find(agent => agent.agent_type === (waitingTask as any).agent_type || agent.capabilities?.includes(waitingTask.subTaskName)); // agent_type might not be on DelegatedSubTask type
                if (targetAgentInfo) {
                    logger.info(`[A2A Plugin - Supervisor ${runtime.agentId}] Dependencies MET for ${waitingTask.subTaskName}. Attempting to delegate to ${targetAgentInfo.agent_id}.`);

                    // Reconstruct payload for delegation (parameters should be stored in DB ideally)
                    const taskPayload: TaskRequestPayload = {
                        task_name: waitingTask.subTaskName,
                        // task_description, parameters, expected_response_format would need to be retrieved from DB or original plan.
                        // For PoC, these might be missing if not stored.
                        task_description: `(Re-delegated) ${waitingTask.subTaskName}`,
                        parameters: (waitingTask as any).parametersSent ? JSON.parse((waitingTask as any).parametersSent) : {},
                    };

                    const actionResult = await runtime.performAction('SEND_A2A_MESSAGE', {
                        receiver_agent_id: targetAgentInfo.agent_id,
                        message_type: A2AMessageType.TASK_REQUEST,
                        payload: taskPayload,
                        conversation_id: projectConversationId,
                    }) as { data?: { messageId?: string }};
                    const newA2AMessageId = actionResult?.data?.messageId || uuidv4();

                    // Update DB: status to DELEGATION_SENT, new a2aRequestMessageId (if it changes on retry)
                    // @ts-ignore
                    await sqlService.db.update(delegatedSubTasksSchema).set({
                        status: DelegatedSubTaskStatus.DELEGATION_SENT,
                        a2aRequestMessageId: newA2AMessageId, // Update with the new message ID
                        lastStatusUpdateAt: new Date().toISOString(),
                    // @ts-ignore
                    }).where(eq('id', waitingTask.id)).execute();
                    logger.info(`[A2A Plugin - Supervisor ${runtime.agentId}] Re-delegated task ${waitingTask.subTaskName} (New A2A ID: ${newA2AMessageId}) to ${targetAgentInfo.agent_id}. DB status updated.`);

                } else {
                     logger.warn(`[A2A Plugin - Supervisor ${runtime.agentId}] Still no suitable agent for re-delegating ${waitingTask.subTaskName}.`);
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
    // ... (A2AService retrieval)

    runtime.on('a2a_message_received', async (message: A2AMessage) => {
      const currentAgentName = runtime.character?.name || agentId;
      // ... (INFO_SHARE logging) ...

      if (currentAgentName === 'SupervisorAlpha' && (message.message_type === A2AMessageType.ACK || message.message_type === A2AMessageType.TASK_RESPONSE)) {
        const sqlService = getSQLService(runtime);
        if (sqlService && runtime.agentId) {
          try {
            let statusToSet: DelegatedSubTaskStatus | undefined = undefined;
            let resultSummaryToSet: string | undefined = undefined;
            let errorMessageToSet: string | undefined = undefined;
            let a2aRequestMessageIdToUpdate: string | undefined = undefined;
            let projectConversationIdForDepCheck: string | undefined = message.conversation_id;

            if (message.message_type === A2AMessageType.ACK && message.payload?.original_message_id) {
                statusToSet = DelegatedSubTaskStatus.ACKNOWLEDGED;
                a2aRequestMessageIdToUpdate = message.payload.original_message_id as string;
            } else if (message.message_type === A2AMessageType.TASK_RESPONSE) {
                const taskResponsePayload = message.payload as TaskResponsePayload;
                statusToSet = taskResponsePayload.status === 'SUCCESS' ? DelegatedSubTaskStatus.SUCCESS : DelegatedSubTaskStatus.FAILURE;
                resultSummaryToSet = typeof taskResponsePayload.result === 'string' ? taskResponsePayload.result : JSON.stringify(taskResponsePayload.result);
                errorMessageToSet = taskResponsePayload.error_message || undefined;
                a2aRequestMessageIdToUpdate = message.payload?.original_request_message_id as string;
            }

            if (statusToSet && a2aRequestMessageIdToUpdate) {
              // ... (DB update logic as before) ...
              const updateData: Partial<NewDelegatedSubTask> = { status: statusToSet, lastStatusUpdateAt: new Date().toISOString() };
              if (resultSummaryToSet !== undefined) updateData.resultSummary = resultSummaryToSet.substring(0, 2000);
              if (errorMessageToSet !== undefined) updateData.lastErrorMessage = errorMessageToSet;
              // @ts-ignore
              await sqlService.db.update(delegatedSubTasksSchema).set(updateData).where(eq('a2aRequestMessageId', a2aRequestMessageIdToUpdate)).execute();
              logger.info(`[A2A Plugin - Supervisor ${runtime.agentId}] Updated status for task (A2A Msg ID: ${a2aRequestMessageIdToUpdate}) to ${statusToSet} in DB.`);

              // If a task succeeded, check for dependent tasks
              if (statusToSet === DelegatedSubTaskStatus.SUCCESS && projectConversationIdForDepCheck) {
                await checkAndDelegateWaitingTasks(runtime, projectConversationIdForDepCheck, sqlService);
              }
            } else if (message.message_type === A2AMessageType.TASK_RESPONSE && !a2aRequestMessageIdToUpdate) {
                 logger.warn(`[A2A Plugin - Supervisor ${runtime.agentId}] TASK_RESPONSE from ${message.sender_agent_id} for task ${message.payload?.original_task_name} is missing 'original_request_message_id'. Cannot reliably update DB state by request ID.`);
            }
          } catch (dbError: any) { /* ... DB error logging ... */ }
        } else if (currentAgentName === 'SupervisorAlpha') { /* ... SQLService unavailable logging ... */ }
      }
    });

    runtime.on(PROCESS_A2A_TASK_EVENT, async (taskMessage: A2AMessage) => {
      // ... (Agent ID check) ...
      const currentAgentId = runtime.agentId!; // Should be valid here
      const agentName = runtime.character?.name || "UnknownAgent";
      let taskResult: any = /* ... default ... */;
      let taskStatus: TaskResponsePayload['status'] = 'FAILURE';
      let errorMessage: string | null = /* ... default ... */;

      // ... (DeveloperAgent and AuditBot001 logic as before) ...
      if (agentName === 'DevAgent001' && taskMessage.payload?.task_name === 'GENERATE_CODE') { /* ... */ }
      else if (agentName === 'AuditBot001' && taskMessage.payload?.task_name === 'PERFORM_AUDIT') { /* ... */ }
      else if (agentName === 'SupervisorAlpha' && taskMessage.payload?.task_name === 'MANAGE_PROJECT_GOAL') {
        logger.info(`[A2A Plugin - ${currentAgentId}] SupervisorAlpha processing MANAGE_PROJECT_GOAL.`);
        const goalDescription = taskMessage.payload.goal_description as string;
        const supervisorSettings = runtime.character?.settings?.supervisor_settings as any;
        const decompositionTemplate = supervisorSettings?.default_task_decomposition_prompt_template as string;
        const teamRoster = supervisorSettings?.team_roster as Array<{ agent_id: string; capabilities: string[]; agent_type: string }> || [];
        const sqlService = getSQLService(runtime);

        if (!goalDescription || !decompositionTemplate) { /* ... error handling ... */ }
        else {
          try {
            const decompositionPrompt = decompositionTemplate.replace("{user_goal}", goalDescription);
            const llmResponse = await runtime.useModel(ModelType.TEXT_LARGE, { prompt: decompositionPrompt, system: runtime.character?.system });
            let subTasks: Array<TaskRequestPayload & {agent_type?: string; dependencies?: string[]}> = [];
            try { /* ... JSON parsing for subTasks ... */
                const jsonRegex = /```(?:json)?\s*([\s\S]*?)\s*```/;
                const match = llmResponse.match(jsonRegex);
                const jsonString = match && match[1] ? match[1].trim() : llmResponse.trim();
                subTasks = JSON.parse(jsonString);
                if (!Array.isArray(subTasks)) throw new Error("LLM sub-task response not a JSON array.");
            } catch (parseError: any) { throw new Error(`LLM sub-task parsing error: ${parseError.message}`); }

            const conversationIdForProject = taskMessage.conversation_id || uuidv4();
            let delegationLog = `Decomposed goal into ${subTasks.length} sub-tasks for project ${conversationIdForProject}:\n`;
            let allDelegatedSuccessfully = true;

            for (const subTask of subTasks) {
              let canDelegate = true;
              if (sqlService && subTask.dependencies && subTask.dependencies.length > 0) {
                logger.debug(`[A2A Plugin - Supervisor ${currentAgentId}] Checking dependencies for sub-task: ${subTask.task_name}`);
                try {
                    // @ts-ignore - Conceptual DB call
                    const depStatuses = await sqlService.db.select({ status: (delegatedSubTasksSchema as any).status })
                        .from(delegatedSubTasksSchema)
                        // @ts-ignore
                        .where(and(
                            eq('projectConversationId', conversationIdForProject),
                            inArray('subTaskName', subTask.dependencies)
                        ))
                        .execute() as Array<{status: DelegatedSubTaskStatus}>;

                    if (depStatuses.length < subTask.dependencies.length || depStatuses.some(d => d.status !== DelegatedSubTaskStatus.SUCCESS)) {
                        canDelegate = false;
                        logger.info(`[A2A Plugin - Supervisor ${currentAgentId}] Dependencies not met for sub-task: ${subTask.task_name}. Will mark as WAITING_FOR_DEPENDENCY.`);
                    }
                } catch (dbDepError: any) {
                    logger.error(`[A2A Plugin - Supervisor ${currentAgentId}] DB error checking dependencies for ${subTask.task_name}: ${dbDepError.message}`);
                    canDelegate = false; // Err on the side of caution
                }
              }

              const targetAgentInfo = teamRoster.find(agent => agent.agent_type === subTask.agent_type || agent.capabilities?.includes(subTask.task_name!));
              if (!targetAgentInfo) {
                delegationLog += `- Task "${subTask.task_name}" SKIPPED: No suitable agent in roster.\n`;
                allDelegatedSuccessfully = false;
                continue;
              }

              const currentSubTaskStatus = canDelegate ? DelegatedSubTaskStatus.PENDING_DELEGATION : DelegatedSubTaskStatus.WAITING_FOR_DEPENDENCY;
              const now = new Date().toISOString();
              const dbRecordId = uuidv4();
              const a2aRequestMsgIdForDb = canDelegate ? uuidv4() : `deferred-${uuidv4()}`; // Real ID only if delegating now

              if (sqlService && currentAgentId) {
                try {
                  const newTaskRecord: NewDelegatedSubTask = {
                    id: dbRecordId, projectConversationId: conversationIdForProject,
                    a2aRequestMessageId: a2aRequestMsgIdForDb, subTaskName: subTask.task_name!,
                    assignedAgentId: targetAgentInfo.agent_id, status: currentSubTaskStatus,
                    delegatedAt: now, lastStatusUpdateAt: now,
                    // parametersSent: JSON.stringify(subTask.parameters), // Store params
                    // dependencies: JSON.stringify(subTask.dependencies || []), // Store dependencies
                  };
                  // @ts-ignore
                  await sqlService.db.insert(delegatedSubTasksSchema).values(newTaskRecord).execute();
                  delegationLog += `- Task "${subTask.task_name}" (DB ID: ${dbRecordId}) to ${targetAgentInfo.agent_type} status: ${currentSubTaskStatus}.\n`;
                } catch (dbError: any) { /* ... DB error logging ... */ allDelegatedSuccessfully = false; }
              } else { delegationLog += `- Task "${subTask.task_name}" to ${targetAgentInfo.agent_type}. SQLService N/A.\n`; }

              if (canDelegate) {
                const subTaskA2APayload: TaskRequestPayload = { /* ... subTask details ... */
                    task_name: subTask.task_name!, task_description: subTask.task_description,
                    parameters: subTask.parameters, expected_response_format: subTask.expected_response_format,
                };
                const actionResult = await runtime.performAction('SEND_A2A_MESSAGE', {
                  receiver_agent_id: targetAgentInfo.agent_id, message_type: A2AMessageType.TASK_REQUEST,
                  payload: subTaskA2APayload, conversation_id: conversationIdForProject,
                  // Pass the DB record ID or generated A2A message ID if needed by SEND_A2A_MESSAGE for its own return
                }) as { data?: { messageId?: string }};
                const actualSentA2AMessageId = actionResult?.data?.messageId;

                if (actualSentA2AMessageId && sqlService && currentAgentId && actualSentA2AMessageId !== a2aRequestMsgIdForDb) {
                    // Update DB record with the actual A2A message ID from SEND_A2A_MESSAGE action and set status to DELEGATION_SENT
                     // @ts-ignore
                    await sqlService.db.update(delegatedSubTasksSchema).set({
                        a2aRequestMessageId: actualSentA2AMessageId,
                        status: DelegatedSubTaskStatus.DELEGATION_SENT,
                        lastStatusUpdateAt: new Date().toISOString()
                    // @ts-ignore
                    }).where(eq('id', dbRecordId)).execute();
                    delegationLog = delegationLog.replace(`(DB ID: ${dbRecordId}) to ${targetAgentInfo.agent_type} status: ${DelegatedSubTaskStatus.PENDING_DELEGATION}`, `(A2A Msg ID: ${actualSentA2AMessageId}) to ${targetAgentInfo.agent_type} status: ${DelegatedSubTaskStatus.DELEGATION_SENT}`);
                } else if (actualSentA2AMessageId && sqlService && currentAgentId) {
                     // @ts-ignore
                     await sqlService.db.update(delegatedSubTasksSchema).set({
                        status: DelegatedSubTaskStatus.DELEGATION_SENT,
                        lastStatusUpdateAt: new Date().toISOString()
                    // @ts-ignore
                    }).where(eq('id', dbRecordId)).execute();
                     delegationLog = delegationLog.replace(`(DB ID: ${dbRecordId}) to ${targetAgentInfo.agent_type} status: ${DelegatedSubTaskStatus.PENDING_DELEGATION}`, `(A2A Msg ID: ${actualSentA2AMessageId}) to ${targetAgentInfo.agent_type} status: ${DelegatedSubTaskStatus.DELEGATION_SENT}`);
                }
              }
            }
            taskResult = { summary: delegationLog, sub_tasks_count: subTasks.length, project_conversation_id: conversationIdForProject };
            taskStatus = allDelegatedSuccessfully || subTasks.length === 0 ? 'SUCCESS' : 'FAILURE'; // Success if all tasks handled or no tasks
            errorMessage = allDelegatedSuccessfully ? null : "Some sub-tasks could not be processed or delegated.";
          } catch (e: any) { /* ... error handling ... */ }
        }
      }
      // ** END SupervisoryAgent Task Logic **

      // ... (response sending logic remains the same) ...
      const responsePayload: TaskResponsePayload = {
        original_task_name: String(taskMessage.payload?.task_name || 'unknown_task'),
        original_request_message_id: taskMessage.message_id,
        status: taskStatus,
        result: taskResult,
        error_message: errorMessage,
      };
      // ... (rest of response sending)
      const responseA2AMessage: A2AMessage = { /* ... */ } as A2AMessage; // simplified
      responseA2AMessage.protocol_version = A2AProtocolVersion;
      responseA2AMessage.message_id = uuidv4();
      responseA2AMessage.timestamp = new Date().toISOString();
      responseA2AMessage.sender_agent_id = currentAgentId;
      responseA2AMessage.receiver_agent_id = taskMessage.sender_agent_id;
      responseA2AMessage.conversation_id = taskMessage.conversation_id;
      responseA2AMessage.message_type = A2AMessageType.TASK_RESPONSE;
      responseA2AMessage.payload = responsePayload;

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
