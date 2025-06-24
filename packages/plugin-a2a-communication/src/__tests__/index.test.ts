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
  DelegatedSubTaskStatus // Import for status checks
} from '../types';
import { ModelType, type IAgentRuntime, type Action, logger, Service, type Character } from '@elizaos/core';
import { v4 as uuidv4 } from 'uuid';

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

// --- Conceptual SQL Service Mocking ---
const mockSqlDbInsertExecute = vi.fn().mockResolvedValue({ changes: 1 });
const mockSqlDbUpdateExecute = vi.fn().mockResolvedValue({ changes: 1 });
const mockSqlDbSelectExecute = vi.fn().mockResolvedValue([]); // Default to no results for select
const mockSqlValues = vi.fn().mockReturnThis();
const mockSqlSet = vi.fn().mockReturnThis();
const mockSqlWhere = vi.fn().mockReturnThis();
const mockSqlLimit = vi.fn().mockReturnThis(); // For .limit()
const mockSqlFrom = vi.fn().mockReturnThis(); // For .from()

const mockSqlService = {
  db: {
    insert: vi.fn(() => ({ values: mockSqlValues, execute: mockSqlDbInsertExecute, returning: vi.fn().mockResolvedValue([]) })),
    update: vi.fn(() => ({ set: mockSqlSet, where: mockSqlWhere, execute: mockSqlDbUpdateExecute })),
    select: vi.fn(() => ({ from: mockSqlFrom, where: mockSqlWhere, limit: mockSqlLimit, execute: mockSqlDbSelectExecute })),
  }
};
// --- End SQL Service Mocking ---

describe('@elizaos/plugin-a2a-communication', () => {
  let mockRuntime: IAgentRuntime;
  let mockHandlerCallback: ReturnType<typeof vi.fn>;
  let runtimeEventEmitter: EventEmitter;

  const devAgentChar: Character = { name: 'DevAgent001', system: 'Dev', plugins:[], bio:[], topics:[], messageExamples:[], style:{} };
  const supervisorChar: Character = {
    name: 'SupervisorAlpha', system: 'Supervisor', plugins: ['@elizaos/plugin-sql'],
    bio:[], topics:[], messageExamples:[], style:{},
    settings: {
      supervisor_settings: {
        default_task_decomposition_prompt_template: "Goal: {user_goal}. Decompose into JSON array of objects (fields: task_name, agent_type, task_description, parameters, dependencies as string[], expected_response_format): ",
        team_roster: [
          { agent_id: 'dev-001', agent_type: 'DeveloperAgent', capabilities: ['GENERATE_CODE'] },
          { agent_id: 'audit-001', agent_type: 'BlockchainAuditorAgent', capabilities: ['PERFORM_AUDIT'] },
        ],
      },
    },
  };

  beforeEach(() => {
    vi.resetAllMocks();
    mockSqlValues.mockReturnThis(); mockSqlSet.mockReturnThis(); mockSqlWhere.mockReturnThis(); mockSqlLimit.mockReturnThis(); mockSqlFrom.mockReturnThis();
    mockSqlDbSelectExecute.mockResolvedValue([]); // Reset select mock
    mockHandlerCallback = vi.fn();
    runtimeEventEmitter = new EventEmitter();

    mockRuntime = {
      agentId: 'test-agent-id', character: supervisorChar,
      emit: vi.fn((event, ...args) => runtimeEventEmitter.emit(event, ...args)),
      on: vi.fn((event, listener) => runtimeEventEmitter.on(event, listener as (...args: any[]) => void)),
      getService: vi.fn().mockImplementation((serviceTypeOrClass: string | typeof Service | any) => {
        const type = typeof serviceTypeOrClass === 'string' ? serviceTypeOrClass : serviceTypeOrClass.serviceType;
        if (type === 'A2AService') return new (vi.mocked(A2AService))(mockRuntime);
        if (type === '@elizaos/plugin-sql') return mockSqlService;
        return undefined;
      }),
      useModel: vi.fn().mockResolvedValue("LLM_RESPONSE"),
      performAction: vi.fn().mockImplementation(async (actionName, options) => {
        if (actionName === 'SEND_A2A_MESSAGE') {
          const msgId = uuidv4();
          (mockRuntime.getService('A2AService') as A2AService)?.sendMessage({ message_id: msgId, receiver_agent_id: options.receiver_agent_id } as A2AMessage);
          return { data: { messageId: msgId } };
        }
        return { stdout: 'Mocked Action Result' };
      }),
    } as unknown as IAgentRuntime;
    (A2AService as any).serviceType = 'A2AService';
    (uuidv4 as ReturnType<typeof vi.fn>).mockImplementation(() => `mock-uuid-${Math.random().toString(36).substring(2, 8)}`);
    a2aCommunicationPlugin.init?.(mockRuntime, {});
  });

  describe('SupervisoryAgent Logic with Task Dependencies and DB Updates', () => {
    beforeEach(() => {
        mockRuntime.character = supervisorChar;
        mockRuntime.agentId = 'supervisor-001';
        a2aCommunicationPlugin.init?.(mockRuntime, {});
    });

    it('MANAGE_PROJECT_GOAL: should mark task as WAITING_FOR_DEPENDENCY if prerequisite is not SUCCESS', async () => {
      const goal = "Develop feature Y which depends on X.";
      const taskMsg: A2AMessage = { /* ... MANAGE_PROJECT_GOAL task ... */ } as A2AMessage;
      taskMsg.payload = { task_name: 'MANAGE_PROJECT_GOAL', goal_description: goal };
      taskMsg.message_type = A2AMessageType.TASK_REQUEST;
      taskMsg.conversation_id = 'proj-depend';

      const subTasksLLMResponse = JSON.stringify([
        { task_name: "DEV_X", agent_type: "DeveloperAgent", dependencies: [] },
        { task_name: "DEV_Y", agent_type: "DeveloperAgent", dependencies: ["DEV_X"] }
      ]);
      vi.mocked(mockRuntime.useModel).mockResolvedValueOnce(subTasksLLMResponse);
      // Mock DB select for DEV_X to show it's not yet SUCCESS
      mockSqlDbSelectExecute.mockImplementation(async () => {
          // This mock should specifically respond to the query for DEV_X's status
          // For simplicity, assume any select call here is the dependency check for DEV_X
          return [{ status: DelegatedSubTaskStatus.DELEGATION_SENT }]; // DEV_X is not SUCCESS
      });

      (uuidv4 as ReturnType<typeof vi.fn>) // Control UUIDs for this specific test
        .mockReturnValueOnce('devX-a2a-id')   // For DEV_X A2A message
        .mockReturnValueOnce('db-devX-id')    // For DEV_X DB record
        // No A2A id for DEV_Y as it should be waiting
        .mockReturnValueOnce('db-devY-id')    // For DEV_Y DB record (marked as waiting)
        .mockReturnValueOnce('supervisor-resp-id');

      runtimeEventEmitter.emit(PROCESS_A2A_TASK_EVENT, taskMsg);
      await new Promise(setImmediate);

      expect(mockSqlService.db.insert).toHaveBeenCalledTimes(2); // Both tasks recorded
      const devXCall = mockSqlValues.mock.calls.find(c => c[0].subTaskName === 'DEV_X');
      const devYCall = mockSqlValues.mock.calls.find(c => c[0].subTaskName === 'DEV_Y');

      expect(devXCall[0].status).toBe(DelegatedSubTaskStatus.PENDING_DELEGATION); // Will be updated to DELEGATION_SENT after performAction
      expect(devYCall[0].status).toBe(DelegatedSubTaskStatus.WAITING_FOR_DEPENDENCY);

      // Check that performAction was called for DEV_X but not DEV_Y initially
      expect(mockRuntime.performAction).toHaveBeenCalledTimes(1); // Only DEV_X delegated
      expect(vi.mocked(mockRuntime.performAction).mock.calls[0][1].payload.task_name).toBe("DEV_X");
    });

    it('on TASK_RESPONSE (SUCCESS): should update completed task and trigger delegation of waiting dependent tasks', async () => {
      const projectConvId = 'proj-depend-trigger';
      // 1. Setup: Supervisor has two tasks, DEV_Y depends on DEV_X. DEV_X is PENDING, DEV_Y is WAITING.
      // Mock DB state:
      const mockWaitingDevYTask = {
          id: 'db-devY-id', subTaskName: 'DEV_Y', projectConversationId: projectConvId,
          status: DelegatedSubTaskStatus.WAITING_FOR_DEPENDENCY,
          dependencies: JSON.stringify(['DEV_X']), // Assume dependencies are stored as JSON string
          parametersSent: JSON.stringify({ lang: 'ts' }) // Assume params are stored
      };
      mockSqlDbSelectExecute
          .mockResolvedValueOnce([]) // Initial check for DEV_X (no SUCCESS record yet)
          .mockResolvedValueOnce([mockWaitingDevYTask]); // When checkAndDelegateWaitingTasks queries for waiting tasks

      // Simulate Supervisor decomposing and initially trying to delegate
      const initialGoalTask: A2AMessage = { /* ... MANAGE_PROJECT_GOAL task ... */ } as A2AMessage;
      initialGoalTask.payload = { task_name: 'MANAGE_PROJECT_GOAL', goal_description: "Dep test" };
      initialGoalTask.message_type = A2AMessageType.TASK_REQUEST;
      initialGoalTask.conversation_id = projectConvId;
      const subTasksLLMResp = JSON.stringify([
        { task_name: "DEV_X", agent_type: "DeveloperAgent", dependencies: [] },
        { task_name: "DEV_Y", agent_type: "DeveloperAgent", dependencies: ["DEV_X"] }
      ]);
      vi.mocked(mockRuntime.useModel).mockResolvedValueOnce(subTasksLLMResp);
      (uuidv4 as ReturnType<typeof vi.fn>)
        .mockReturnValueOnce('devX-a2a-id-trigger')
        .mockReturnValueOnce('db-devX-id-trigger')
        .mockReturnValueOnce('db-devY-id-trigger')
        .mockReturnValueOnce('supervisor-resp-id-trigger');

      runtimeEventEmitter.emit(PROCESS_A2A_TASK_EVENT, initialGoalTask);
      await new Promise(setImmediate);
      vi.clearAllMocks(); // Clear mocks after initial setup processing

      // 2. Action: Supervisor receives TASK_RESPONSE (SUCCESS) for DEV_X
      const devXSuccessResponse: A2AMessage = {
        message_type: A2AMessageType.TASK_RESPONSE,
        payload: { original_task_name: "DEV_X", status: "SUCCESS", result: "//code", original_request_message_id: 'devX-a2a-id-trigger' },
        sender_agent_id: 'dev-001', receiver_agent_id: 'supervisor-001', message_id: 'devX-resp-id',
        protocol_version: A2AProtocolVersion, timestamp: new Date().toISOString(), conversation_id: projectConvId,
      };
      // Mock DB select for dependency check inside checkAndDelegateWaitingTasks:
      // First call for DEV_X status (now SUCCESS)
      mockSqlDbSelectExecute.mockResolvedValueOnce([{ status: DelegatedSubTaskStatus.SUCCESS }]);
      // Second call for finding waiting tasks (returns DEV_Y)
      // mockSqlDbSelectExecute.mockResolvedValueOnce([mockWaitingDevYTask]); // This was for initial setup, now it's for re-check
      // For the re-check of DEV_Y's dependencies, it will query for DEV_X again
      // Let's refine the mock for sqlService.db.select for more granular control
      const selectMock = vi.fn();
      selectMock.mockImplementation(async () => {
          // If querying for DEV_X status for dependency check of DEV_Y
          if (mockSqlWhere.mock.calls.some(c => c[0].field === 'subTaskName' && c[0].value === 'DEV_X')) {
              return [{ status: DelegatedSubTaskStatus.SUCCESS }];
          }
          // If querying for WAITING_FOR_DEPENDENCY tasks
          if (mockSqlWhere.mock.calls.some(c => c[0].field === 'status' && c[0].value === DelegatedSubTaskStatus.WAITING_FOR_DEPENDENCY)) {
              return [mockWaitingDevYTask];
          }
          return [];
      });
      mockSqlService.db.select = vi.fn(() => ({ from: mockSqlFrom, where: mockSqlWhere, limit: mockSqlLimit, execute: selectMock }));

      (uuidv4 as ReturnType<typeof vi.fn>)
        .mockReturnValueOnce('devY-re-delegated-a2a-id') // For re-delegating DEV_Y
        .mockReturnValueOnce('some-other-uuid'); // For any other UUID needs

      runtimeEventEmitter.emit('a2a_message_received', devXSuccessResponse);
      await new Promise(setImmediate);

      // Assertions:
      // DEV_X status updated to SUCCESS in DB
      expect(mockSqlService.db.update).toHaveBeenCalledWith(expect.objectContaining({ name: 'delegated_sub_tasks' }));
      const devXUpdateCall = mockSqlSet.mock.calls.find(c => c[0].status === DelegatedSubTaskStatus.SUCCESS);
      expect(devXUpdateCall).toBeDefined();
      expect(mockSqlWhere).toHaveBeenCalledWith(expect.objectContaining({ field: 'a2aRequestMessageId', value: 'devX-a2a-id-trigger' }));

      // checkAndDelegateWaitingTasks was called
      // DEV_Y was re-evaluated and delegated
      expect(mockRuntime.performAction).toHaveBeenCalledTimes(1); // For re-delegating DEV_Y
      expect(vi.mocked(mockRuntime.performAction).mock.calls[0][0]).toBe('SEND_A2A_MESSAGE');
      expect(vi.mocked(mockRuntime.performAction).mock.calls[0][1].payload.task_name).toBe('DEV_Y');

      // DEV_Y status updated from WAITING_FOR_DEPENDENCY to DELEGATION_SENT in DB
      const devYUpdateCall = mockSqlSet.mock.calls.find(c => c[0].status === DelegatedSubTaskStatus.DELEGATION_SENT && c[0].a2aRequestMessageId === 'devY-re-delegated-a2a-id');
      expect(devYUpdateCall).toBeDefined();
      expect(mockSqlWhere).toHaveBeenCalledWith(expect.objectContaining({ field: 'id', value: 'db-devY-id' }));
    });
  });
});
