import { describe, it, expect, vi, beforeEach } from 'vitest';
import { EventEmitter } from 'node:events';
import { a2aCommunicationPlugin } from '../index';
import { A2AService } from '../a2a-service';
import {
  A2AMessageType,
  A2AProtocolVersion,
  type A2AMessage,
  PROCESS_A2A_TASK_EVENT,
  type TaskResponsePayload
} from '../types';
import { ModelType, type IAgentRuntime, type Action, logger, Service, type Character } from '@elizaos/core';
import { v4 as uuidv4 } from 'uuid';

// --- Mocking Core ElizaOS and Dependencies ---
vi.mock('@elizaos/core', async (importOriginal) => {
  const original = await importOriginal<typeof import('@elizaos/core')>();
  return {
    ...original,
    logger: { info: vi.fn(), debug: vi.fn(), warn: vi.fn(), error: vi.fn(), success: vi.fn(), fatal: vi.fn() },
    Service: class MockService {
        runtime: IAgentRuntime; constructor(runtime: IAgentRuntime) { this.runtime = runtime; }
        static getService(runtime: IAgentRuntime) { return runtime.getService(this.serviceType); }
        static serviceType = "MockService"; init() {} stop() {}
    },
  };
});

const mockA2AServiceSendMessage = vi.fn();
vi.mock('../a2a-service', () => ({
  A2AService: vi.fn().mockImplementation((runtime: IAgentRuntime) => ({
    agentId: runtime.agentId, sendMessage: mockA2AServiceSendMessage, cleanup: vi.fn(),
  })),
}));

vi.mock('uuid', () => ({ v4: vi.fn() }));

// --- Conceptual SQL Service Mocking ---
const mockSqlDbInsert = vi.fn().mockReturnThis(); // for chaining .values()
const mockSqlDbUpdate = vi.fn().mockReturnThis(); // for chaining .set()
const mockSqlValues = vi.fn().mockReturnThis();
const mockSqlSet = vi.fn().mockReturnThis();
const mockSqlWhere = vi.fn().mockReturnThis();
const mockSqlExecute = vi.fn().mockResolvedValue({ changes: 1 }); // Simulate successful execution

const mockSqlService = {
  db: {
    insert: vi.fn(() => ({ values: mockSqlValues, execute: mockSqlExecute, returning: vi.fn().mockResolvedValue([]) })),
    update: vi.fn(() => ({ set: mockSqlSet, where: mockSqlWhere, execute: mockSqlExecute })),
  }
};
// --- End SQL Service Mocking ---


describe('@elizaos/plugin-a2a-communication', () => {
  let mockRuntime: IAgentRuntime;
  let mockHandlerCallback: ReturnType<typeof vi.fn>;
  let runtimeEventEmitter: EventEmitter;

  // Character definitions
  const devAgentChar: Character = { name: 'DevAgent001', system: 'Dev', plugins:[], bio:[], topics:[], msgEx:[], style:{} };
  const auditorChar: Character = { name: 'AuditBot001', system: 'Auditor', plugins:[], bio:[], topics:[], msgEx:[], style:{} };
  const supervisorChar: Character = {
    name: 'SupervisorAlpha', system: 'Supervisor', plugins: ['@elizaos/plugin-sql'],
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
    mockSqlValues.mockReturnThis(); mockSqlSet.mockReturnThis(); mockSqlWhere.mockReturnThis(); // Reset chaining
    mockHandlerCallback = vi.fn();
    runtimeEventEmitter = new EventEmitter();

    mockRuntime = {
      agentId: 'test-agent-id',
      character: supervisorChar, // Default to supervisor for most new tests
      emit: vi.fn((event, ...args) => runtimeEventEmitter.emit(event, ...args)),
      on: vi.fn((event, listener) => runtimeEventEmitter.on(event, listener as (...args: any[]) => void)),
      getService: vi.fn().mockImplementation((serviceTypeOrClass: string | typeof Service | any) => {
        const type = typeof serviceTypeOrClass === 'string' ? serviceTypeOrClass : serviceTypeOrClass.serviceType;
        if (type === 'A2AService') return new (vi.mocked(A2AService))(mockRuntime);
        if (type === '@elizaos/plugin-sql') return mockSqlService; // Return mocked SQL service
        return undefined;
      }),
      useModel: vi.fn().mockResolvedValue("LLM_RESPONSE"),
      performAction: vi.fn().mockImplementation(async (actionName, options) => {
        if (actionName === 'SEND_A2A_MESSAGE') {
          const msgId = uuidv4(); // Get the mocked UUID for this call
          (mockRuntime.getService('A2AService') as A2AService)?.sendMessage({
            message_id: msgId, receiver_agent_id: options.receiver_agent_id,
            /* other fields */ } as A2AMessage);
          return { data: { messageId: msgId } }; // Return the messageId
        }
        return { stdout: 'Mocked Action Result' };
      }),
    } as unknown as IAgentRuntime;
    (A2AService as any).serviceType = 'A2AService';
    (uuidv4 as ReturnType<typeof vi.fn>).mockImplementation(() => `mock-uuid-${Math.random()}`); // Ensure unique UUIDs per call
    a2aCommunicationPlugin.init?.(mockRuntime, {});
  });

  describe('SupervisoryAgent Logic with SQL Persistence', () => {
    beforeEach(() => {
      mockRuntime.character = supervisorChar; // Ensure supervisor character is set
      mockRuntime.agentId = 'supervisor-001'; // Set specific supervisor ID
      // Re-init plugin if runtime context changed in a way that affects init (like agentId)
      a2aCommunicationPlugin.init?.(mockRuntime, {});
    });

    it('MANAGE_PROJECT_GOAL: should delegate tasks and insert into DB', async () => {
      const goal = "Develop and audit feature X.";
      const taskMsg: A2AMessage = {
        message_type: A2AMessageType.TASK_REQUEST, payload: { task_name: 'MANAGE_PROJECT_GOAL', goal_description: goal },
        sender_agent_id: 'user', receiver_agent_id: 'supervisor-001', message_id: 'goal-msg-id',
        protocol_version: A2AProtocolVersion, timestamp: new Date().toISOString(), conversation_id: 'proj-conv-id'
      };
      const subTasksLLMResponse = JSON.stringify([
        { task_name: "DEV_X", agent_type: "DeveloperAgent", parameters: {p:1}, task_description: "Dev X" },
        { task_name: "AUDIT_X", agent_type: "BlockchainAuditorAgent", parameters: {p:2}, task_description: "Audit X" }
      ]);
      vi.mocked(mockRuntime.useModel).mockResolvedValueOnce(subTasksLLMResponse);

      // Mock UUIDs for delegated messages
      (uuidv4 as ReturnType<typeof vi.fn>)
        .mockReturnValueOnce('dev-task-a2a-msg-id') // for A2A to DevAgent
        .mockReturnValueOnce('db-id-for-dev-task')   // for DB record of dev task
        .mockReturnValueOnce('audit-task-a2a-msg-id')// for A2A to AuditorAgent
        .mockReturnValueOnce('db-id-for-audit-task') // for DB record of audit task
        .mockReturnValueOnce('supervisor-final-response-msg-id'); // for Supervisor's own response

      runtimeEventEmitter.emit(PROCESS_A2A_TASK_EVENT, taskMsg);
      await new Promise(setImmediate);

      expect(mockRuntime.useModel).toHaveBeenCalledTimes(1); // For decomposition
      expect(mockRuntime.performAction).toHaveBeenCalledTimes(2); // For 2 delegations
      expect(mockSqlService.db.insert).toHaveBeenCalledTimes(2);

      // Check DB insert for Dev task
      expect(mockSqlService.db.insert).toHaveBeenCalledWith(expect.objectContaining({ name: 'delegated_sub_tasks' }));
      const devTaskDbCall = mockSqlValues.mock.calls.find(call => call[0].subTaskName === 'DEV_X');
      expect(devTaskDbCall[0]).toMatchObject({
        projectConversationId: 'proj-conv-id',
        a2aRequestMessageId: 'dev-task-a2a-msg-id', // ID of message sent to DevAgent
        subTaskName: 'DEV_X',
        assignedAgentId: 'dev-001', // From team_roster
        status: 'DELEGATION_SENT',
      });

      // Check DB insert for Audit task
      const auditTaskDbCall = mockSqlValues.mock.calls.find(call => call[0].subTaskName === 'AUDIT_X');
      expect(auditTaskDbCall[0]).toMatchObject({
        projectConversationId: 'proj-conv-id',
        a2aRequestMessageId: 'audit-task-a2a-msg-id',
        subTaskName: 'AUDIT_X',
        assignedAgentId: 'audit-001',
        status: 'DELEGATION_SENT',
      });
      expect(mockA2AServiceSendMessage).toHaveBeenCalledTimes(3); // 2 delegations + 1 supervisor response
    });

    it('on a2a_message_received (ACK): should update task status in DB to ACKNOWLEDGED', async () => {
      const ackMsg: A2AMessage = {
        message_type: A2AMessageType.ACK, payload: { original_message_id: 'dev-task-a2a-msg-id', status: "TASK_QUEUED" },
        sender_agent_id: 'dev-001', receiver_agent_id: 'supervisor-001', message_id: 'ack-msg-id',
        protocol_version: A2AProtocolVersion, timestamp: new Date().toISOString(),
      };
      runtimeEventEmitter.emit('a2a_message_received', ackMsg);
      await new Promise(setImmediate);

      expect(mockSqlService.db.update).toHaveBeenCalledWith(expect.objectContaining({ name: 'delegated_sub_tasks' }));
      expect(mockSqlSet).toHaveBeenCalledWith(expect.objectContaining({ status: 'ACKNOWLEDGED' }));
      // This where clause check is conceptual due to simple eq mock
      expect(mockSqlWhere).toHaveBeenCalledWith(expect.objectContaining({ field: 'a2a_request_message_id', value: 'dev-task-a2a-msg-id' }));
      expect(mockSqlExecute).toHaveBeenCalled();
    });

    it('on a2a_message_received (TASK_RESPONSE): should update task status and result in DB', async () => {
      const taskRespMsg: A2AMessage = {
        message_type: A2AMessageType.TASK_RESPONSE,
        payload: {
            original_task_name: "DEV_X",
            status: "SUCCESS",
            result: "some code",
            original_request_message_id: 'dev-task-a2a-msg-id' // Crucial for lookup
        },
        sender_agent_id: 'dev-001', receiver_agent_id: 'supervisor-001', message_id: 'dev-resp-msg-id',
        protocol_version: A2AProtocolVersion, timestamp: new Date().toISOString(), conversation_id: 'proj-conv-id'
      };
      runtimeEventEmitter.emit('a2a_message_received', taskRespMsg);
      await new Promise(setImmediate);

      expect(mockSqlService.db.update).toHaveBeenCalledWith(expect.objectContaining({ name: 'delegated_sub_tasks' }));
      expect(mockSqlSet).toHaveBeenCalledWith(expect.objectContaining({
        status: 'SUCCESS',
        resultSummary: "some code",
      }));
      expect(mockSqlWhere).toHaveBeenCalledWith(expect.objectContaining({ field: 'a2a_request_message_id', value: 'dev-task-a2a-msg-id' }));
      expect(mockSqlExecute).toHaveBeenCalled();
    });
  });
  // ... other test suites for DevAgent, AuditorAgent, SEND_A2A_MESSAGE action, etc. remain ...
  // Ensure they are not broken by beforeEach changes if supervisorChar is not default.
  // For brevity, only showing supervisor specific tests here.
});
