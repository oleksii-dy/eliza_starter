import { describe, it, expect, vi, beforeEach } from 'vitest';
import { EventEmitter } from 'node:events';
import { a2aCommunicationPlugin } from '../index';
import { A2AService } from '../a2a-service';
import {
  A2AMessageType,
  A2AProtocolVersion,
  type A2AMessage,
  PROCESS_A2A_TASK_EVENT,
  type TaskResponsePayload,
  SupervisorTaskStatus
} from '../types';
import { ModelType, type IAgentRuntime, type Action, logger, Service, type Character } from '@elizaos/core';
import { v4 as uuidv4 } from 'uuid';

// Import the service we are integrating for the supervisor
import { SupervisorTaskDBService } from '@elizaos/plugin-supervisor-utils';

// --- Mocking Core ElizaOS and Dependencies ---
vi.mock('@elizaos/core', async (importOriginal) => {
  const original = await importOriginal<typeof import('@elizaos/core')>();
  return { ...original, logger: { info: vi.fn(), debug: vi.fn(), warn: vi.fn(), error: vi.fn(), success: vi.fn(), fatal: vi.fn() },
    Service: class MockService { runtime: IAgentRuntime; constructor(runtime: IAgentRuntime) { this.runtime = runtime; } static getService() {return undefined;} static serviceType = "MockService"; init() {} stop() {} },
  };
});

const mockA2AServiceSendMessage = vi.fn();
vi.mock('../a2a-service', () => ({
  A2AService: vi.fn().mockImplementation((runtime: IAgentRuntime) => ({ agentId: runtime.agentId, sendMessage: mockA2AServiceSendMessage, cleanup: vi.fn() })),
}));

vi.mock('uuid', () => ({ v4: vi.fn() }));

// --- Mock SupervisorTaskDBService ---
const mockRecordNewSubTask = vi.fn();
const mockUpdateTaskStatusByA2ARequestId = vi.fn();
const mockGetTaskByA2ARequestId = vi.fn();
const mockGetTasksByProjectAndStatus = vi.fn();
const mockGetTasksByProjectAndNames = vi.fn();

vi.mock('@elizaos/plugin-supervisor-utils', () => ({
  SupervisorTaskDBService: vi.fn().mockImplementation(() => ({
    recordNewSubTask: mockRecordNewSubTask,
    updateTaskStatusByA2ARequestId: mockUpdateTaskStatusByA2ARequestId,
    getTaskByA2ARequestId: mockGetTaskByA2ARequestId,
    getTasksByProjectAndStatus: mockGetTasksByProjectAndStatus,
    getTasksByProjectAndNames: mockGetTasksByProjectAndNames,
  })),
  SupervisorTaskStatus: {
    PENDING_DELEGATION: 'PENDING_DELEGATION', DELEGATION_SENT: 'DELEGATION_SENT',
    ACKNOWLEDGED: 'ACKNOWLEDGED', IN_PROGRESS: 'IN_PROGRESS',
    SUCCESS: 'SUCCESS', FAILURE: 'FAILURE',
    WAITING_FOR_DEPENDENCY: 'WAITING_FOR_DEPENDENCY',
  }
}));
// --- End SupervisorTaskDBService Mocking ---


describe('@elizaos/plugin-a2a-communication', () => {
  let mockRuntime: IAgentRuntime;
  let mockHandlerCallback: ReturnType<typeof vi.fn>;
  let runtimeEventEmitter: EventEmitter;

  const devAgentChar: Character = { name: 'DevAgent001', system: 'Dev System Prompt', plugins:[], bio:[], topics:[], messageExamples:[], style:{} };
  const auditorChar: Character = { name: 'AuditBot001', system: 'Auditor System Prompt', plugins:[], bio:[], topics:[], messageExamples:[], style:{} };
  const supervisorChar: Character = {
    name: 'SupervisorAlpha', system: 'Supervisor System Prompt', plugins: ['@elizaos/plugin-sql', '@elizaos/plugin-supervisor-utils'],
    bio:[], topics:[], messageExamples:[], style:{},
    settings: {
      supervisor_settings: {
        default_task_decomposition_prompt_template: "Goal: {user_goal}. Decompose: ",
        team_roster: [
          { agent_id: 'dev-001', agent_type: 'DeveloperAgent', capabilities: ['GENERATE_CODE'] },
          { agent_id: 'audit-001', agent_type: 'BlockchainAuditorAgent', capabilities: ['PERFORM_AUDIT'] },
        ],
      },
    },
  };

  beforeEach(() => {
    vi.resetAllMocks();
    mockHandlerCallback = vi.fn();
    runtimeEventEmitter = new EventEmitter();

    mockRuntime = {
      agentId: 'test-agent-id', character: devAgentChar, // Default character
      emit: vi.fn((event, ...args) => runtimeEventEmitter.emit(event, ...args)),
      on: vi.fn((event, listener) => runtimeEventEmitter.on(event, listener as (...args: any[]) => void)),
      getService: vi.fn().mockImplementation((serviceTypeOrClass: string | typeof Service | any) => {
        const type = typeof serviceTypeOrClass === 'string' ? serviceTypeOrClass : serviceTypeOrClass.serviceType;
        if (type === 'A2AService') return new (vi.mocked(A2AService))(mockRuntime);
        if (type === SupervisorTaskDBService.serviceType || serviceTypeOrClass === SupervisorTaskDBService) { // Use static serviceType
            return new (vi.mocked(SupervisorTaskDBService))(mockRuntime);
        }
        return undefined;
      }),
      useModel: vi.fn().mockResolvedValue("LLM_RESPONSE"),
      performAction: vi.fn().mockImplementation(async (actionName, options) => {
        if (actionName === 'SEND_A2A_MESSAGE') {
          const msgId = uuidv4();
          (mockRuntime.getService(A2AService.serviceType) as A2AService)?.sendMessage({ message_id: msgId, receiver_agent_id: options.receiver_agent_id } as A2AMessage);
          return { data: { messageId: msgId } };
        }
        return { stdout: 'Mocked Action Result' };
      }),
    } as unknown as IAgentRuntime;
    (A2AService as any).serviceType = 'A2AService';
    (SupervisorTaskDBService as any).serviceType = 'SupervisorTaskDBService'; // Ensure static type is on the mock
    (uuidv4 as ReturnType<typeof vi.fn>).mockImplementation(() => `mock-uuid-${Math.random().toString(36).substring(2, 8)}`);
    // Plugin init is called per test suite (describe block) if needed with specific character
  });

  describe(`Handler for ${PROCESS_A2A_TASK_EVENT}`, () => {

    describe('DeveloperAgent Logic', () => {
        beforeEach(async () => {
            mockRuntime.character = devAgentChar;
            mockRuntime.agentId = 'dev-001';
            await a2aCommunicationPlugin.init?.(mockRuntime, {});
        });

        it('TASK_RESPONSE includes original_request_message_id', async () => {
            const taskRequestMessage: A2AMessage = {
                protocol_version: A2AProtocolVersion, message_id: 'dev-task-orig-id-check', timestamp: new Date().toISOString(),
                sender_agent_id: 'supervisor-001', receiver_agent_id: 'dev-001',
                message_type: A2AMessageType.TASK_REQUEST,
                payload: { task_name: 'GENERATE_CODE', task_description: 'Test original ID field.' },
            };
            vi.mocked(mockRuntime.useModel).mockResolvedValueOnce('// generated code');
            (uuidv4 as ReturnType<typeof vi.fn>).mockReturnValueOnce('dev-resp-id-for-orig-check');

            runtimeEventEmitter.emit(PROCESS_A2A_TASK_EVENT, taskRequestMessage);
            await new Promise(setImmediate);

            expect(mockA2AServiceSendMessage).toHaveBeenCalledOnce();
            const responseMessage = mockA2AServiceSendMessage.mock.calls[0][0] as A2AMessage;
            const responsePayload = responseMessage.payload as TaskResponsePayload;
            expect(responsePayload.original_request_message_id).toBe('dev-task-orig-id-check');
            expect(responsePayload.status).toBe('SUCCESS');
            expect(responsePayload.result).toBe('// generated code');
        });
    });

    describe('BlockchainAuditorAgent Logic', () => {
        beforeEach(async () => {
            mockRuntime.character = auditorChar;
            mockRuntime.agentId = 'audit-001';
            await a2aCommunicationPlugin.init?.(mockRuntime, {});
        });

        it('TASK_RESPONSE includes original_request_message_id', async () => {
            const taskRequestMessage: A2AMessage = {
                protocol_version: A2AProtocolVersion, message_id: 'audit-task-orig-id-check', timestamp: new Date().toISOString(),
                sender_agent_id: 'supervisor-001', receiver_agent_id: 'audit-001',
                message_type: A2AMessageType.TASK_REQUEST,
                payload: { task_name: 'PERFORM_AUDIT', parameters: { targetPath: '/test/path' } },
            };
            vi.mocked(mockRuntime.performAction).mockResolvedValue({ stdout: 'Tool output', stderr: '', exitCode: 0 });
            vi.mocked(mockRuntime.useModel).mockResolvedValueOnce('Audit summary from LLM');
            (uuidv4 as ReturnType<typeof vi.fn>).mockReturnValueOnce('audit-resp-id-for-orig-check');

            runtimeEventEmitter.emit(PROCESS_A2A_TASK_EVENT, taskRequestMessage);
            await new Promise(setImmediate);

            expect(mockA2AServiceSendMessage).toHaveBeenCalledOnce();
            const responseMessage = mockA2AServiceSendMessage.mock.calls[0][0] as A2AMessage;
            const responsePayload = responseMessage.payload as TaskResponsePayload;
            expect(responsePayload.original_request_message_id).toBe('audit-task-orig-id-check');
            expect(responsePayload.status).toBe('SUCCESS');
            expect(responsePayload.result.summary).toBe('Audit summary from LLM');
        });
    });

    describe('SupervisoryAgent Logic with SQL Persistence', () => {
        beforeEach(async () => {
            mockRuntime.character = supervisorChar;
            mockRuntime.agentId = 'supervisor-001';
            await a2aCommunicationPlugin.init?.(mockRuntime, {});
        });

        // Test for MANAGE_PROJECT_GOAL (decomposition and delegation)
        it('MANAGE_PROJECT_GOAL: should delegate tasks and insert records using SupervisorTaskDBService', async () => {
            const goal = "Supervise a project.";
            const manageProjectGoalTask: A2AMessage = {
                protocol_version: A2AProtocolVersion, message_id: 'sup-goal-msg-id', timestamp: new Date().toISOString(),
                sender_agent_id: 'human-user', receiver_agent_id: 'supervisor-001',
                message_type: A2AMessageType.TASK_REQUEST,
                payload: { task_name: 'MANAGE_PROJECT_GOAL', goal_description: goal },
                conversation_id: 'proj-supervise-123',
            };
            const decomposedSubTasks = [
                { task_name: "SUB_A", agent_type: "DeveloperAgent", dependencies: [], parameters: {detail:"A"}, task_description:"Desc A" },
                { task_name: "SUB_B", agent_type: "BlockchainAuditorAgent", dependencies: ["SUB_A"], parameters: {detail:"B"}, task_description:"Desc B" }
            ];
            vi.mocked(mockRuntime.useModel).mockResolvedValueOnce("```json\n" + JSON.stringify(decomposedSubTasks) + "\n```");

            // Mock performAction to return unique message IDs for sent A2A messages
            const subTaskAMsgId = 'sub-a-a2a-msg-id';
            vi.mocked(mockRuntime.performAction).mockResolvedValueOnce({ data: { messageId: subTaskAMsgId } });
            // SUB_B won't be delegated immediately due to dependency

            // Mock recordNewSubTask to return the task with a DB ID
            mockRecordNewSubTask.mockImplementation(async (taskData) => ({ ...taskData, id: `db-${taskData.subTaskName}` }));

            runtimeEventEmitter.emit(PROCESS_A2A_TASK_EVENT, manageProjectGoalTask);
            await new Promise(setImmediate);

            expect(mockRecordNewSubTask).toHaveBeenCalledWith(expect.objectContaining({
                subTaskName: "SUB_A", status: SupervisorTaskStatus.PENDING_DELEGATION // Will be updated to DELEGATION_SENT after action
            }));
            expect(mockRecordNewSubTask).toHaveBeenCalledWith(expect.objectContaining({
                subTaskName: "SUB_B", status: SupervisorTaskStatus.WAITING_FOR_DEPENDENCY
            }));

            // Check if SUB_A was delegated
            expect(mockRuntime.performAction).toHaveBeenCalledWith('SEND_A2A_MESSAGE',
                expect.objectContaining({ payload: expect.objectContaining({ task_name: "SUB_A" }) })
            );
            // Check if SUB_A's status was updated to DELEGATION_SENT
            expect(mockUpdateTaskStatusByA2ARequestId).toHaveBeenCalledWith(
                expect.any(String), // temp a2aRequestMessageId used during PENDING_DELEGATION
                SupervisorTaskStatus.DELEGATION_SENT,
                expect.objectContaining({ resultSummary: expect.stringContaining(subTaskAMsgId) })
            );
        });

        // Test for Supervisor receiving ACK and TASK_RESPONSE
        it('on a2a_message_received (ACK/TASK_RESPONSE by Supervisor): should update DB via SupervisorTaskDBService', async () => {
            const originalSentA2AMsgId = 'delegated-task-a2a-id';
            // ACK
            const ackMessage: A2AMessage = {
                message_type: A2AMessageType.ACK, payload: { original_message_id: originalSentA2AMsgId },
                /* other fields */ } as A2AMessage;
            runtimeEventEmitter.emit('a2a_message_received', ackMessage);
            await new Promise(setImmediate);
            expect(mockUpdateTaskStatusByA2ARequestId).toHaveBeenCalledWith(originalSentA2AMsgId, SupervisorTaskStatus.ACKNOWLEDGED, expect.anything());

            vi.clearAllMocks(); // Clear for next part

            // TASK_RESPONSE (SUCCESS)
            const taskResponseMessage: A2AMessage = {
                message_type: A2AMessageType.TASK_RESPONSE,
                payload: { original_request_message_id: originalSentA2AMsgId, status: "SUCCESS", result: "done" },
                 /* other fields */ } as A2AMessage;

            // Mock for checkAndDelegateWaitingTasks
            mockGetTasksByProjectAndStatus.mockResolvedValueOnce([]); // No waiting tasks to simplify

            runtimeEventEmitter.emit('a2a_message_received', taskResponseMessage);
            await new Promise(setImmediate);
            expect(mockUpdateTaskStatusByA2ARequestId).toHaveBeenCalledWith(originalSentA2AMsgId, SupervisorTaskStatus.SUCCESS, expect.objectContaining({ resultSummary: '"done"'}));
            expect(mockGetTasksByProjectAndStatus).toHaveBeenCalled(); // checkAndDelegate was called
        });
    });
  });
});
