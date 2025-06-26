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
} from '../types';
import { ModelType, type IAgentRuntime, type Action, logger, Service, type Character } from '@elizaos/core';
import { v4 as uuidv4 } from 'uuid';

// Import the service and types we are integrating for the supervisor
import {
    SupervisorTaskDBService,
    SupervisorTaskStatus, // Use the enum from its source
    type DelegatedSubTask, // Use the type from its source
    type InsertableDelegatedSubTask
} from '@elizaos/plugin-supervisor-utils';

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
const mockUpdateTaskByDbId = vi.fn(); // Added this mock
const mockGetTasksByProjectAndStatus = vi.fn();
const mockGetTasksByProjectAndNames = vi.fn();

vi.mock('@elizaos/plugin-supervisor-utils', async (importOriginal) => {
    const actualSupervisorUtils = await importOriginal<typeof import('@elizaos/plugin-supervisor-utils')>();
    return {
        ...actualSupervisorUtils, // Keep actual enums, types if not redefining them here
        SupervisorTaskDBService: vi.fn().mockImplementation(() => ({
            recordNewSubTask: mockRecordNewSubTask,
            updateTaskStatusByA2ARequestId: mockUpdateTaskStatusByA2ARequestId,
            updateTaskByDbId: mockUpdateTaskByDbId, // Add to mock
            getTasksByProjectAndStatus: mockGetTasksByProjectAndStatus,
            getTasksByProjectAndNames: mockGetTasksByProjectAndNames,
        })),
        // No need to mock SupervisorTaskStatus if importing from actual source
    };
});
// --- End SupervisorTaskDBService Mocking ---


describe('@elizaos/plugin-a2a-communication', () => {
  let mockRuntime: IAgentRuntime;
  let mockHandlerCallback: ReturnType<typeof vi.fn>;
  let runtimeEventEmitter: EventEmitter;

  const devAgentChar: Character = { name: 'DevAgent001', system: 'Dev System Prompt', plugins:[], bio:[], topics:[], messageExamples:[], style:{} };
  const auditorChar: Character = { name: 'AuditBot001', system: 'Auditor System Prompt', plugins:[], bio:[], topics:[], messageExamples:[], style:{} };
  const supervisorChar: Character = {
    name: 'SupervisorAlpha', system: 'Supervisor System Prompt',
    plugins: ['@elizaos/plugin-sql', '@elizaos/plugin-supervisor-utils'],
    bio:[], topics:[], messageExamples:[], style:{},
    settings: {
      supervisor_settings: {
        default_task_decomposition_prompt_template: "Goal: {user_goal}. Decompose into JSON array of objects (fields: task_name, agent_type, task_description, parameters, dependencies as string[] (task_names), expected_response_format): ",
        team_roster: [
          { agent_id: 'dev-001', agent_type: 'DeveloperAgent', capabilities: ['GENERATE_CODE', 'DEV_X', 'DEV_Y', 'DEV_Z'] },
          { agent_id: 'audit-001', agent_type: 'BlockchainAuditorAgent', capabilities: ['PERFORM_AUDIT', 'AUDIT_X'] },
        ],
      },
    },
  };

  beforeEach(() => {
    vi.resetAllMocks();
    mockHandlerCallback = vi.fn();
    runtimeEventEmitter = new EventEmitter();

    mockRuntime = {
      agentId: 'test-agent-id', character: supervisorChar,
      emit: vi.fn((event, ...args) => runtimeEventEmitter.emit(event, ...args)),
      on: vi.fn((event, listener) => runtimeEventEmitter.on(event, listener as (...args: any[]) => void)),
      getService: vi.fn().mockImplementation((serviceTypeOrClass: string | typeof Service | any) => {
        const type = typeof serviceTypeOrClass === 'string' ? serviceTypeOrClass : serviceTypeOrClass.serviceType;
        if (type === 'A2AService') return new (vi.mocked(A2AService))(mockRuntime);
        if (type === SupervisorTaskDBService.serviceType || serviceTypeOrClass === SupervisorTaskDBService) {
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
    (SupervisorTaskDBService as any).serviceType = 'SupervisorTaskDBService';
    (uuidv4 as ReturnType<typeof vi.fn>).mockImplementation(() => `mock-uuid-${Math.random().toString(36).substring(2, 8)}`);
    a2aCommunicationPlugin.init?.(mockRuntime, {});
  });

  describe('SupervisoryAgent Logic with Integrated SupervisorTaskDBService', () => {
    beforeEach(() => {
        mockRuntime.character = supervisorChar;
        mockRuntime.agentId = 'supervisor-001';
        a2aCommunicationPlugin.init?.(mockRuntime, {});
    });

    it('MANAGE_PROJECT_GOAL: records all sub-tasks, delegates ready tasks, and marks others as WAITING_FOR_DEPENDENCY', async () => {
        const goal = "Develop feature Y (depends on X) and Z.";
        const taskMsg: A2AMessage = {
            message_type: A2AMessageType.TASK_REQUEST, payload: { task_name: 'MANAGE_PROJECT_GOAL', goal_description: goal },
            sender_agent_id: 'user', receiver_agent_id: 'supervisor-001', message_id: 'goal-msg-id',
            protocol_version: A2AProtocolVersion, timestamp: new Date().toISOString(), conversation_id: 'proj-complex-deps'
        };
        const subTasksLLMResponse = JSON.stringify([
            { task_name: "DEV_X", agent_type: "DeveloperAgent", dependencies: [], parameters: {detail:"X"}, task_description:"Desc X" },
            { task_name: "DEV_Y", agent_type: "DeveloperAgent", dependencies: ["DEV_X"], parameters: {detail:"Y"}, task_description:"Desc Y" },
            { task_name: "DEV_Z", agent_type: "DeveloperAgent", dependencies: [], parameters: {detail:"Z"}, task_description:"Desc Z" }
        ]);
        vi.mocked(mockRuntime.useModel).mockResolvedValueOnce(subTasksLLMResponse);

        // Mock DB for dependency check for DEV_Y (DEV_X is not 'SUCCESS' yet)
        mockGetTasksByProjectAndNames.mockImplementation(async (projId, names) => {
            if (projId === 'proj-complex-deps' && names.includes("DEV_X")) return [{ subTaskName: "DEV_X", status: SupervisorTaskStatus.DELEGATION_SENT } as any];
            return [];
        });
        // Mock recordNewSubTask to return the task with a DB ID
        mockRecordNewSubTask.mockImplementation(async (taskData: InsertableDelegatedSubTask) => ({
            ...taskData, id: `db-id-${taskData.subTaskName}`, // Simulate DB generating an ID
            delegatedAt: new Date().toISOString(), lastStatusUpdateAt: new Date().toISOString()
        } as DelegatedSubTask));

        // Control UUIDs for A2A messages sent by SEND_A2A_MESSAGE action
        const devXA2AMsgId = 'devX-a2a-id';
        const devZA2AMsgId = 'devZ-a2a-id';
        // Ensure uuidv4 mock is reset or specifically sequenced if it's global
        const uuidMock = vi.mocked(uuidv4);
        uuidMock.mockReturnValueOnce(devXA2AMsgId);   // For sending DEV_X
        uuidMock.mockReturnValueOnce(devZA2AMsgId);  // For sending DEV_Z
        // Any further UUIDs for DB records or supervisor's response
        uuidMock.mockImplementation(() => `fallback-uuid-${Math.random()}`);


        runtimeEventEmitter.emit(PROCESS_A2A_TASK_EVENT, taskMsg);
        await new Promise(setImmediate);

        expect(mockRecordNewSubTask).toHaveBeenCalledTimes(3);
        expect(mockRecordNewSubTask).toHaveBeenCalledWith(expect.objectContaining({ subTaskName: "DEV_X", status: SupervisorTaskStatus.PENDING_DELEGATION }));
        expect(mockRecordNewSubTask).toHaveBeenCalledWith(expect.objectContaining({ subTaskName: "DEV_Y", status: SupervisorTaskStatus.WAITING_FOR_DEPENDENCY }));
        expect(mockRecordNewSubTask).toHaveBeenCalledWith(expect.objectContaining({ subTaskName: "DEV_Z", status: SupervisorTaskStatus.PENDING_DELEGATION }));

        expect(mockRuntime.performAction).toHaveBeenCalledTimes(2); // DEV_X and DEV_Z delegated

        // Check updateTaskByDbId for DEV_X
        expect(mockUpdateTaskByDbId).toHaveBeenCalledWith(`db-id-DEV_X`,
            expect.objectContaining({ status: SupervisorTaskStatus.DELEGATION_SENT, a2aRequestMessageId: devXA2AMsgId })
        );
        // Check updateTaskByDbId for DEV_Z
        expect(mockUpdateTaskByDbId).toHaveBeenCalledWith(`db-id-DEV_Z`,
            expect.objectContaining({ status: SupervisorTaskStatus.DELEGATION_SENT, a2aRequestMessageId: devZA2AMsgId })
        );
    });

    it('on TASK_RESPONSE (SUCCESS for DEV_X), should trigger re-evaluation and delegation of DEV_Y', async () => {
        const projectConvId = 'proj-depend-trigger-recheck-sql';
        mockRuntime.agentId = 'supervisor-001'; mockRuntime.character = supervisorChar;
        a2aCommunicationPlugin.init?.(mockRuntime, {});

        const waitingDevYTaskInDb: DelegatedSubTask = {
            id: 'db-id-devY-sql', projectConversationId: projectConvId, a2aRequestMessageId: 'deferred-devY-a2a-id-sql',
            subTaskName: 'DEV_Y', assignedAgentId: 'dev-001', status: SupervisorTaskStatus.WAITING_FOR_DEPENDENCY,
            dependenciesJson: JSON.stringify(['DEV_X']), parametersJson: JSON.stringify({ lang: 'ts' }),
            delegatedAt: "sometime", lastStatusUpdateAt: "sometime"
        };
        mockGetTasksByProjectAndStatus.mockResolvedValueOnce([waitingDevYTaskInDb]); // Find DEV_Y as waiting
        mockGetTasksByProjectAndNames.mockResolvedValueOnce([{ subTaskName: 'DEV_X', status: SupervisorTaskStatus.SUCCESS } as any]); // DEV_X is now SUCCESS

        const devXSuccessResponse: A2AMessage = {
            message_type: A2AMessageType.TASK_RESPONSE,
            payload: { original_task_name: "DEV_X", status: "SUCCESS", result: "//X done", original_request_message_id: 'devX-orig-req-id-sql' },
            sender_agent_id: 'dev-001', receiver_agent_id: 'supervisor-001', message_id: 'devX-resp-id-sql',
            protocol_version: A2AProtocolVersion, timestamp: new Date().toISOString(), conversation_id: projectConvId,
        };

        const newA2AMsgIdForDevY = 'new-devY-a2a-id-sql';
        vi.mocked(uuidv4).mockImplementation(() => newA2AMsgIdForDevY); // For the new A2A message for DEV_Y & any other needs

        runtimeEventEmitter.emit('a2a_message_received', devXSuccessResponse);
        await new Promise(setImmediate);

        expect(mockUpdateTaskStatusByA2ARequestId).toHaveBeenCalledWith('devX-orig-req-id-sql', SupervisorTaskStatus.SUCCESS, expect.anything());
        expect(mockGetTasksByProjectAndStatus).toHaveBeenCalledWith(projectConvId, SupervisorTaskStatus.WAITING_FOR_DEPENDENCY);
        expect(mockGetTasksByProjectAndNames).toHaveBeenCalledWith(projectConvId, ['DEV_X']);

        expect(mockRuntime.performAction).toHaveBeenCalledTimes(1); // For re-delegating DEV_Y
        expect(vi.mocked(mockRuntime.performAction).mock.calls[0][1].payload.task_name).toBe('DEV_Y');

        expect(mockUpdateTaskByDbId).toHaveBeenCalledWith('db-id-devY-sql',
            expect.objectContaining({ status: SupervisorTaskStatus.DELEGATION_SENT, a2aRequestMessageId: newA2AMsgIdForDevY })
        );
    });
  });
});
