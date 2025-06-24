import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { EventEmitter } from 'node:events';
import { a2aCommunicationPlugin } from '../index';
import { A2AService } from '../a2a-service';
import { A2AMessageType, A2AProtocolVersion, type A2AMessage, A2A_INTERNAL_EVENT_TOPIC } from '../types';
import { ModelType, type IAgentRuntime, type Action, logger, Service } from '@elizaos/core';
import { v4 as uuidv4 } from 'uuid';

// Mock @elizaos/core logger
vi.mock('@elizaos/core', async (importOriginal) => {
  const original = await importOriginal<typeof import('@elizaos/core')>();
  return {
    ...original,
    logger: { // Mock logger methods
      info: vi.fn(), debug: vi.fn(), warn: vi.fn(), error: vi.fn(),
      success: vi.fn(), fatal: vi.fn(),
    },
    Service: class MockService { // Mock base Service class
        runtime: IAgentRuntime;
        constructor(runtime: IAgentRuntime) { this.runtime = runtime; }
        static getService(runtime: IAgentRuntime) { return runtime.getService(this.serviceType); }
        static serviceType = "MockService";
        init() {}
        stop() {}
    },
  };
});

// Mock A2AService more directly for finer control over its methods used by the plugin
const mockA2AServiceSendMessage = vi.fn();
const mockA2AServiceCleanup = vi.fn(); // Though cleanup isn't directly tested here

let mockServiceInstance: Partial<A2AService>;

// Mock uuid
vi.mock('uuid', () => ({
  v4: vi.fn(() => 'mock-uuid-v4'),
}));

// Import PROCESS_A2A_TASK_EVENT from types
import { PROCESS_A2A_TASK_EVENT } from '../types';

describe('@elizaos/plugin-a2a-communication', () => {
  let mockRuntime: IAgentRuntime;
  let mockHandlerCallback: ReturnType<typeof vi.fn>;
  let runtimeEventEmitter: EventEmitter;

  beforeEach(() => {
    vi.resetAllMocks(); // Use resetAllMocks to ensure mocks are clean
    mockHandlerCallback = vi.fn();

    const mockAgentId = 'agent-123';
    runtimeEventEmitter = new EventEmitter();

    mockServiceInstance = { // Define the shape of the mock service instance
        agentId: mockAgentId,
        sendMessage: mockA2AServiceSendMessage,
        cleanup: mockA2AServiceCleanup,
    };

    mockRuntime = {
      agentId: mockAgentId,
      emit: vi.fn((event, ...args) => runtimeEventEmitter.emit(event, ...args)),
      on: vi.fn((event, listener) => runtimeEventEmitter.on(event, listener as (...args: any[]) => void)),
      getService: vi.fn().mockImplementation((serviceType: string | typeof Service) => {
        // Ensure we check serviceType correctly, using the static property from the actual (but mocked) A2AService
        if (typeof serviceType === 'function' && (serviceType as any).serviceType === 'A2AService') {
            return mockServiceInstance as A2AService;
        }
        if (serviceType === 'A2AService') { // Fallback for string-based lookup if used
            return mockServiceInstance as A2AService;
        }
        return undefined;
      }),
      useModel: vi.fn().mockResolvedValue("Simulated LLM response for task processing"),
    } as unknown as IAgentRuntime;

    // Mock the A2AService class itself for instantiation if needed by `runtime.getService` logic elsewhere.
    // However, our `runtime.getService` mock above directly returns `mockServiceInstance`.
    vi.mock('../a2a-service', () => ({
        A2AService: vi.fn().mockImplementation(() => mockServiceInstance), // Mock constructor if called
    }));
    // Ensure static property is set on the (mocked) A2AService class for type-based getService calls
    if (A2AService && typeof A2AService === 'function') {
        (A2AService as any).serviceType = 'A2AService';
    }
  });

  describe('Plugin Initialization', () => {
    it('should initialize and set up event listeners for a2a_message_received and PROCESS_A2A_TASK_EVENT', async () => {
      await a2aCommunicationPlugin.init?.(mockRuntime, {});
      const agentId = mockRuntime.agentId || 'unknownAgentOnInit';
      expect(logger.success).toHaveBeenCalledWith(`[A2A Plugin - ${agentId}] Initialized. Listening for raw A2A messages and processed tasks.`);
      expect(mockRuntime.on).toHaveBeenCalledWith('a2a_message_received', expect.any(Function));
      expect(mockRuntime.on).toHaveBeenCalledWith(PROCESS_A2A_TASK_EVENT, expect.any(Function));
    });

    it('should declare A2AService in its services array for runtime management', () => {
        const hasA2AService = !!a2aCommunicationPlugin.services?.find(
            (s: any) => s.serviceType === 'A2AService' || s.name === 'A2AService' // Check by type or name
        );
        expect(hasA2AService).toBe(true);
    });
  });

  describe('SEND_A2A_MESSAGE Action', () => {
    let sendAction: Action | undefined;

    beforeEach(async () => {
      await a2aCommunicationPlugin.init?.(mockRuntime, {});
      sendAction = a2aCommunicationPlugin.actions?.find(a => a.name === 'SEND_A2A_MESSAGE');
      expect(sendAction).toBeDefined();
    });

    it('handler should call the mocked A2AService.sendMessage with correct parameters', async () => {
      const actionOptions = {
        receiver_agent_id: 'receiver-uuid-456',
        message_type: A2AMessageType.TASK_REQUEST,
        payload: { task_name: 'do_something', params: { foo: 'bar' } }
      };
      vi.mocked(uuidv4).mockReturnValueOnce('test-message-id-action');

      await sendAction?.handler?.(mockRuntime, {} as Memory, {} as State, actionOptions, mockHandlerCallback, []);

      expect(mockA2AServiceSendMessage).toHaveBeenCalledOnce();
      const sentMessage = mockA2AServiceSendMessage.mock.calls[0][0] as A2AMessage;
      expect(sentMessage.message_id).toBe('test-message-id-action');
      expect(sentMessage.sender_agent_id).toBe(mockRuntime.agentId);
      expect(sentMessage.receiver_agent_id).toBe(actionOptions.receiver_agent_id);
      // ... other relevant checks
      expect(mockHandlerCallback).toHaveBeenCalledWith(expect.objectContaining({
        text: `A2A message of type ${actionOptions.message_type} sent to agent ${actionOptions.receiver_agent_id}. Message ID: test-message-id-action`
      }));
    });
  });

  describe(`Handler for ${PROCESS_A2A_TASK_EVENT}`, () => {
    beforeEach(async () => {
      await a2aCommunicationPlugin.init?.(mockRuntime, {});
    });

    it('should process a TASK_REQUEST, simulate LLM call, and send TASK_RESPONSE', async () => {
      const taskRequestMessage: A2AMessage = {
        protocol_version: A2AProtocolVersion,
        message_id: 'task-req-id-001',
        timestamp: new Date().toISOString(),
        sender_agent_id: 'requester-agent-id',
        receiver_agent_id: mockRuntime.agentId!,
        message_type: A2AMessageType.TASK_REQUEST,
        payload: { task_name: 'GENERATE_CODE_EXAMPLE', task_description: 'Generate a simple function.' },
        conversation_id: 'conv-abc',
      };
      vi.mocked(uuidv4).mockReturnValueOnce('response-msg-id-task');
      vi.mocked(mockRuntime.useModel).mockResolvedValueOnce(`// Simulated code for ${taskRequestMessage.payload?.task_description}\nfunction example() { return "hello"; }`);


      // Simulate A2AService emitting the PROCESS_A2A_TASK_EVENT
      runtimeEventEmitter.emit(PROCESS_A2A_TASK_EVENT, taskRequestMessage);
      await new Promise(process.nextTick); // Allow promises in the event handler to resolve

      expect(logger.info).toHaveBeenCalledWith(
        `[A2A Plugin - ${mockRuntime.agentId}] Event: Processing A2A Task: ${taskRequestMessage.payload?.task_name || taskRequestMessage.message_id} from ${taskRequestMessage.sender_agent_id}`
      );
      // Check that a TASK_RESPONSE was sent via the service
      expect(mockA2AServiceSendMessage).toHaveBeenCalledOnce();
      const responseMessage = mockA2AServiceSendMessage.mock.calls[0][0] as A2AMessage;
      expect(responseMessage.message_type).toBe(A2AMessageType.TASK_RESPONSE);
      expect(responseMessage.receiver_agent_id).toBe(taskRequestMessage.sender_agent_id);
      expect(responseMessage.sender_agent_id).toBe(mockRuntime.agentId);
      expect(responseMessage.message_id).toBe('response-msg-id-task');
      expect(responseMessage.payload.status).toBe('SUCCESS');
      expect(responseMessage.payload.original_task_name).toBe('GENERATE_CODE_EXAMPLE');
      // This now checks the result from the mocked useModel call
      expect(responseMessage.payload.result).toBe(`// Simulated code for ${taskRequestMessage.payload?.task_description}\nfunction example() { return "hello"; }`);
    });
  });

  describe('Handling of a2a_message_received (raw messages)', () => {
     beforeEach(async () => {
      await a2aCommunicationPlugin.init?.(mockRuntime, {});
    });
    it('should log INFO_SHARE messages received on a2a_message_received event', () => {
      const infoMessage: A2AMessage = {
        protocol_version: A2AProtocolVersion, message_id: 'info-id-raw', timestamp: new Date().toISOString(),
        sender_agent_id: 'sender-agent-uuid', receiver_agent_id: mockRuntime.agentId!,
        message_type: A2AMessageType.INFO_SHARE, payload: { info: 'FYI raw' },
      };
      runtimeEventEmitter.emit('a2a_message_received', infoMessage);

      expect(logger.info).toHaveBeenCalledWith(
        expect.stringContaining(`[A2A Plugin - ${mockRuntime.agentId}] Raw A2A message sniffed:`),
        expect.objectContaining({ messageId: 'info-id-raw', type: A2AMessageType.INFO_SHARE })
      );
       expect(logger.info).toHaveBeenCalledWith(
        `[A2A Plugin - ${mockRuntime.agentId}] INFO_SHARE received:`, { info: 'FYI raw' }
      );
    });

    it('TASK_REQUEST on a2a_message_received should only log (no ACK from this handler)', () => {
        const taskRequestMessage: A2AMessage = {
            protocol_version: A2AProtocolVersion, message_id: 'task-req-raw', timestamp: new Date().toISOString(),
            sender_agent_id: 'sender-agent-uuid', receiver_agent_id: mockRuntime.agentId!,
            message_type: A2AMessageType.TASK_REQUEST, payload: { task_name: 'RAW_TASK' },
        };
        runtimeEventEmitter.emit('a2a_message_received', taskRequestMessage);
        expect(logger.info).toHaveBeenCalledWith(
            expect.stringContaining(`[A2A Plugin - ${mockRuntime.agentId}] Raw A2A message sniffed:`),
            expect.objectContaining({ messageId: 'task-req-raw', type: A2AMessageType.TASK_REQUEST })
        );
        // Crucially, mockA2AServiceSendMessage should NOT have been called by *this* handler for an ACK
        // because A2AService is now responsible for ACKing upon queuing.
        const callsToSendMessageForAck = mockA2AServiceSendMessage.mock.calls.filter(
            call => (call[0] as A2AMessage).message_type === A2AMessageType.ACK && (call[0] as A2AMessage).payload.original_message_id === 'task-req-raw'
        );
        expect(callsToSendMessageForAck.length).toBe(0);
    });
  });
});
});
