import { describe, it, expect, vi, beforeEach } from 'vitest';
import { EventEmitter } from 'node:events';
import { a2aCommunicationPlugin } from '../index';
import { A2AService } from '../a2a-service';
import {
  A2AMessageType,
  A2AProtocolVersion,
  type A2AMessage,
  PROCESS_A2A_TASK_EVENT
} from '../types';
import { ModelType, type IAgentRuntime, type Action, logger, Service, type Character } from '@elizaos/core';
import { v4 as uuidv4 } from 'uuid';

vi.mock('@elizaos/core', async (importOriginal) => {
  const original = await importOriginal<typeof import('@elizaos/core')>();
  return {
    ...original,
    logger: {
      info: vi.fn(), debug: vi.fn(), warn: vi.fn(), error: vi.fn(),
      success: vi.fn(), fatal: vi.fn(),
    },
    Service: class MockService {
        runtime: IAgentRuntime;
        constructor(runtime: IAgentRuntime) { this.runtime = runtime; }
        static getService(runtime: IAgentRuntime) { return runtime.getService(this.serviceType); }
        static serviceType = "MockService";
        init() {}
        stop() {}
    },
  };
});

const mockA2AServiceSendMessage = vi.fn();
const mockA2AServiceCleanup = vi.fn();
let mockServiceInstanceSingleton: Partial<A2AService>;

vi.mock('../a2a-service', () => ({
  A2AService: vi.fn().mockImplementation((runtime: IAgentRuntime) => {
    mockServiceInstanceSingleton = {
      agentId: runtime.agentId,
      sendMessage: mockA2AServiceSendMessage,
      cleanup: mockA2AServiceCleanup,
    };
    return mockServiceInstanceSingleton;
  }),
}));

vi.mock('uuid', () => ({
  v4: vi.fn(() => 'mock-uuid-v4'),
}));

describe('@elizaos/plugin-a2a-communication', () => {
  let mockRuntime: IAgentRuntime;
  let mockHandlerCallback: ReturnType<typeof vi.fn>;
  let runtimeEventEmitter: EventEmitter;

  const devAgentCharacter: Character = {
    name: 'DevAgent001',
    system: 'You are DevAgent001. Your job is to generate code. Output only code.',
    plugins:[], bio:[], topics:[], messageExamples:[], style:{}
  };

  const auditorAgentCharacter: Character = {
    name: 'AuditBot001',
    system: 'You are AuditBot001. Your job is to audit contracts and report findings.',
    plugins:[], bio:[], topics:[], messageExamples:[], style:{}
  };

  const supervisorCharacter: Character = {
    name: 'SupervisorAlpha',
    system: 'You are SupervisorAlpha. Decompose goals and delegate tasks.',
    plugins: [], bio: [], topics: [], messageExamples: [], style: {},
    settings: {
        supervisor_settings: {
            default_task_decomposition_prompt_template: "Goal: {user_goal}. Decompose into JSON: ",
            team_roster: [
                { agent_id: 'dev-agent-id-for-test', agent_type: 'DeveloperAgent', capabilities: ['GENERATE_CODE'] },
                { agent_id: 'audit-agent-id-for-test', agent_type: 'BlockchainAuditorAgent', capabilities: ['PERFORM_AUDIT'] },
            ],
        },
    },
  };

  beforeEach(() => {
    vi.resetAllMocks();
    mockHandlerCallback = vi.fn();
    const mockAgentId = 'agent-123'; // Default agentId for runtime
    runtimeEventEmitter = new EventEmitter();

    mockRuntime = {
      agentId: mockAgentId,
      character: devAgentCharacter, // Default to DevAgent, overridden in specific tests
      emit: vi.fn((event, ...args) => runtimeEventEmitter.emit(event, ...args)),
      on: vi.fn((event, listener) => runtimeEventEmitter.on(event, listener as (...args: any[]) => void)),
      getService: vi.fn().mockImplementation((serviceTypeOrClass: string | typeof Service) => {
        const serviceTypeString = typeof serviceTypeOrClass === 'string' ? serviceTypeOrClass : (serviceTypeOrClass as any).serviceType;
        if (serviceTypeString === 'A2AService') {
            if (!mockServiceInstanceSingleton || (mockServiceInstanceSingleton as any).agentId !== mockRuntime.agentId) { // Use current mockRuntime.agentId
                 new (vi.mocked(A2AService))(mockRuntime);
            }
            return mockServiceInstanceSingleton as A2AService;
        }
        return undefined;
      }),
      useModel: vi.fn().mockResolvedValue("Simulated LLM response"),
      performAction: vi.fn().mockImplementation(async (actionName, options) => {
        // Mock performAction to simulate SEND_A2A_MESSAGE for supervisor tests
        if (actionName === 'SEND_A2A_MESSAGE') {
          // Simulate the action handler's call to the service
          const service = mockRuntime.getService(A2AService.serviceType);
          const a2aMessage: A2AMessage = {
            protocol_version: A2AProtocolVersion,
            message_id: uuidv4(),
            timestamp: new Date().toISOString(),
            sender_agent_id: mockRuntime.agentId!,
            receiver_agent_id: options.receiver_agent_id,
            conversation_id: options.conversation_id,
            message_type: options.message_type,
            payload: options.payload,
          };
          service?.sendMessage(a2aMessage);
          return { text: `Mocked SEND_A2A_MESSAGE action call for ${options.receiver_agent_id}` };
        }
        return { stdout: 'Mocked action result', stderr: '', exitCode: 0 }; // Default for other actions
      }),
    } as unknown as IAgentRuntime;

    (A2AService as any).serviceType = 'A2AService';
  });

  describe('Plugin Initialization', () => {
    it('should initialize and set up event listeners', async () => {
      await a2aCommunicationPlugin.init?.(mockRuntime, {});
      // Test if logger.success contains the agentId from mockRuntime
      expect(logger.success).toHaveBeenCalledWith(expect.stringContaining(`[A2A Plugin - ${mockRuntime.agentId}] Initialized.`));
      expect(mockRuntime.on).toHaveBeenCalledWith('a2a_message_received', expect.any(Function));
      expect(mockRuntime.on).toHaveBeenCalledWith(PROCESS_A2A_TASK_EVENT, expect.any(Function));
    });
  });


  describe(`Handler for ${PROCESS_A2A_TASK_EVENT}`, () => {

    describe('DeveloperAgent Logic', () => {
        // ... existing DeveloperAgent tests ...
        beforeEach(async () => {
            mockRuntime.character = devAgentCharacter; // Set character for these tests
            await a2aCommunicationPlugin.init?.(mockRuntime, {});
        });

        it('should process GENERATE_CODE task', async () => {
            const taskPayload = { task_name: 'GENERATE_CODE', task_description: 'Create a Python sum function.' };
            const taskRequestMessage: A2AMessage = {
                protocol_version: A2AProtocolVersion, message_id: 'dev-task-001', timestamp: new Date().toISOString(),
                sender_agent_id: 'supervisor-001', receiver_agent_id: mockRuntime.agentId!,
                message_type: A2AMessageType.TASK_REQUEST, payload: taskPayload,
            };
            vi.mocked(mockRuntime.useModel).mockResolvedValueOnce('def add(a,b): return a+b');
            runtimeEventEmitter.emit(PROCESS_A2A_TASK_EVENT, taskRequestMessage);
            await new Promise(process.nextTick);
            expect(mockRuntime.useModel).toHaveBeenCalled();
            expect(mockA2AServiceSendMessage).toHaveBeenCalledOnce();
        });
    });

    describe('BlockchainAuditorAgent Logic', () => {
        beforeEach(async () => {
            mockRuntime.character = auditorAgentCharacter;
            await a2aCommunicationPlugin.init?.(mockRuntime, {});
        });

        it('should process PERFORM_AUDIT task, call actions, interpret with LLM, and send TASK_RESPONSE', async () => {
            const taskPayload = {
                task_name: 'PERFORM_AUDIT',
                parameters: { targetPath: '/test/contracts/MyContract.sol', projectPath: '/test/contracts' },
            };
            const taskRequestMessage: A2AMessage = {
                protocol_version: A2AProtocolVersion, message_id: 'audit-task-001', timestamp: new Date().toISOString(),
                sender_agent_id: 'supervisor-001', receiver_agent_id: mockRuntime.agentId!,
                message_type: A2AMessageType.TASK_REQUEST, payload: taskPayload,
            };
            vi.mocked(mockRuntime.performAction)
                .mockResolvedValueOnce({ stdout: 'Slither output', stderr: '', exitCode: 0 })
                .mockResolvedValueOnce({ stdout: 'Forge output', stderr: '', exitCode: 0 });
            vi.mocked(mockRuntime.useModel).mockResolvedValueOnce('LLM Audit Summary');
            vi.mocked(uuidv4).mockReturnValueOnce('audit-resp-id');

            runtimeEventEmitter.emit(PROCESS_A2A_TASK_EVENT, taskRequestMessage);
            await new Promise(process.nextTick);

            expect(mockRuntime.performAction).toHaveBeenCalledWith('RUN_SLITHER_ANALYSIS', expect.any(Object));
            expect(mockRuntime.performAction).toHaveBeenCalledWith('RUN_FORGE_TEST', expect.any(Object));
            expect(mockRuntime.useModel).toHaveBeenCalledOnce(); // For the summary
            expect(mockA2AServiceSendMessage).toHaveBeenCalledOnce();
            const responseMsg = mockA2AServiceSendMessage.mock.calls[0][0] as A2AMessage;
            expect(responseMsg.payload.status).toBe('SUCCESS');
            expect(responseMsg.payload.result.summary).toBe('LLM Audit Summary');
        });
    });

    describe('SupervisoryAgent Logic', () => {
        beforeEach(async () => {
            mockRuntime.agentId = 'supervisor-alpha-id'; // Specific ID for supervisor
            mockRuntime.character = supervisorCharacter;
            await a2aCommunicationPlugin.init?.(mockRuntime, {});
        });

        it('should process MANAGE_PROJECT_GOAL, decompose, and delegate tasks', async () => {
            const goalDescription = "Develop a new feature and audit it.";
            const taskRequestMessage: A2AMessage = {
                protocol_version: A2AProtocolVersion, message_id: 'project-goal-001', timestamp: new Date().toISOString(),
                sender_agent_id: 'user-or-meta-agent', receiver_agent_id: mockRuntime.agentId!,
                message_type: A2AMessageType.TASK_REQUEST,
                payload: { task_name: 'MANAGE_PROJECT_GOAL', goal_description: goalDescription },
                conversation_id: 'main-project-conv-id',
            };

            const mockSubTasks = [
                { task_name: 'SUB_TASK_DEV', agent_type: 'DeveloperAgent', task_description: 'Develop part A', parameters: { lang: 'ts'} },
                { task_name: 'SUB_TASK_AUDIT', agent_type: 'BlockchainAuditorAgent', task_description: 'Audit part A', parameters: { path: 'partA'} }
            ];
            // LLM response for decomposition - ensure it's a JSON string, possibly in a markdown block
            vi.mocked(mockRuntime.useModel).mockResolvedValueOnce("```json\n" + JSON.stringify(mockSubTasks) + "\n```");

            // Mock UUID for conversation_id if new one is generated, and for delegated task messages
            vi.mocked(uuidv4)
                .mockReturnValueOnce('delegated-task1-id') // For first SEND_A2A_MESSAGE
                .mockReturnValueOnce('delegated-task2-id') // For second SEND_A2A_MESSAGE
                .mockReturnValueOnce('supervisor-response-id'); // For supervisor's own TASK_RESPONSE

            runtimeEventEmitter.emit(PROCESS_A2A_TASK_EVENT, taskRequestMessage);
            await new Promise(setImmediate); // Allow all async operations including performAction mocks to resolve

            // Verify LLM call for decomposition
            const expectedDecompositionPrompt = supervisorCharacter.settings!.supervisor_settings.default_task_decomposition_prompt_template.replace("{user_goal}", goalDescription);
            expect(mockRuntime.useModel).toHaveBeenCalledWith(ModelType.TEXT_LARGE, {
                prompt: expectedDecompositionPrompt, system: supervisorCharacter.system
            });

            // Verify delegation (SEND_A2A_MESSAGE action calls, which route to mockA2AServiceSendMessage)
            expect(mockA2AServiceSendMessage).toHaveBeenCalledTimes(3); // 2 delegations + 1 supervisor response

            const devTaskMessage = mockA2AServiceSendMessage.mock.calls.find(call => call[0].receiver_agent_id === 'dev-agent-id-for-test')[0] as A2AMessage;
            expect(devTaskMessage.message_type).toBe(A2AMessageType.TASK_REQUEST);
            expect(devTaskMessage.payload.task_name).toBe('SUB_TASK_DEV');
            expect(devTaskMessage.conversation_id).toBe('main-project-conv-id');


            const auditTaskMessage = mockA2AServiceSendMessage.mock.calls.find(call => call[0].receiver_agent_id === 'audit-agent-id-for-test')[0] as A2AMessage;
            expect(auditTaskMessage.message_type).toBe(A2AMessageType.TASK_REQUEST);
            expect(auditTaskMessage.payload.task_name).toBe('SUB_TASK_AUDIT');
            expect(auditTaskMessage.conversation_id).toBe('main-project-conv-id');

            // Verify supervisor's own TASK_RESPONSE (sent back to original requester of MANAGE_PROJECT_GOAL)
            const supervisorResponseMessage = mockA2AServiceSendMessage.mock.calls.find(call => call[0].receiver_agent_id === 'user-or-meta-agent')[0] as A2AMessage;
            expect(supervisorResponseMessage.message_type).toBe(A2AMessageType.TASK_RESPONSE);
            expect(supervisorResponseMessage.payload.status).toBe('SUCCESS');
            expect(supervisorResponseMessage.payload.original_task_name).toBe('MANAGE_PROJECT_GOAL');
            expect(supervisorResponseMessage.payload.result.summary).toContain("Decomposed goal into 2 sub-tasks. Delegating");
        });

        it('Supervisor should handle LLM failure during decomposition', async () => {
            const goalDescription = "A failing goal";
            const taskRequestMessage: A2AMessage = { /* ... */ } as A2AMessage; // Simplified
            taskRequestMessage.payload = { task_name: 'MANAGE_PROJECT_GOAL', goal_description: goalDescription };
            taskRequestMessage.message_type = A2AMessageType.TASK_REQUEST;
            taskRequestMessage.sender_agent_id = 'user';


            vi.mocked(mockRuntime.useModel).mockRejectedValueOnce(new Error("LLM Decomp Error"));
            vi.mocked(uuidv4).mockReturnValueOnce('supervisor-fail-resp-id');

            runtimeEventEmitter.emit(PROCESS_A2A_TASK_EVENT, taskRequestMessage);
            await new Promise(setImmediate);

            expect(mockA2AServiceSendMessage).toHaveBeenCalledOnce(); // Only supervisor's own failure response
            const supervisorResponseMessage = mockA2AServiceSendMessage.mock.calls[0][0] as A2AMessage;
            expect(supervisorResponseMessage.message_type).toBe(A2AMessageType.TASK_RESPONSE);
            expect(supervisorResponseMessage.payload.status).toBe('FAILURE');
            expect(supervisorResponseMessage.payload.error_message).toBe("LLM Decomp Error");
        });
    });
  });
});
