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

// Mock A2AService and its interaction with the global bus
// This is a bit complex because A2AService uses a global EventEmitter.
// We'll mock the service itself and spy on its methods.
const mockSendMessage = vi.fn();
const mockCleanup = vi.fn();
let serviceInstance: A2AService | null = null;

vi.mock('../a2a-service', () => {
  return {
    A2AService: vi.fn().mockImplementation((runtime: IAgentRuntime) => {
      serviceInstance = {
        runtime,
        agentId: runtime.agentId || 'test-agent',
        sendMessage: mockSendMessage,
        cleanup: mockCleanup,
        // Mock other necessary methods/properties if your plugin index uses them
        // For now, the plugin index mainly uses sendMessage via getA2AService
        // and the service itself handles subscription in its constructor.
        // We need to simulate the event emission part for testing the listener in plugin.init
        _internalHandler: null, // to match the class property
        subscribeToMessages: vi.fn(), // Mock this as it's called in constructor
      } as unknown as A2AService;
      return serviceInstance;
    }),
  };
});


// Mock uuid
vi.mock('uuid', () => ({
  v4: vi.fn(() => 'mock-uuid-v4'),
}));

describe('@elizaos/plugin-a2a-communication', () => {
  let mockRuntime: IAgentRuntime;
  let mockHandlerCallback: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.clearAllMocks();
    mockHandlerCallback = vi.fn();

    const mockAgentId = 'agent-123';
    const runtimeEventEmitter = new EventEmitter(); // Each runtime has its own emitter

    mockRuntime = {
      agentId: mockAgentId,
      emit: vi.fn((event, ...args) => runtimeEventEmitter.emit(event, ...args)),
      on: vi.fn((event, listener) => runtimeEventEmitter.on(event, listener)),
      getService: vi.fn((serviceType: string | typeof Service) => {
        if (serviceType === A2AService.serviceType || serviceType === A2AService) {
            // Ensure A2AService constructor is called if we want to test its instantiation via getService
            // For these tests, we primarily care that our plugin *gets* the mocked service.
            if (!serviceInstance || serviceInstance.agentId !== mockAgentId) {
                 // This simulates the runtime creating/providing the service
                 new A2AService(mockRuntime); // This will assign to global `serviceInstance` due to mock
            }
            return serviceInstance;
        }
        return undefined;
      }) as any,
      // Add other IAgentRuntime mocks if needed by the plugin
    } as unknown as IAgentRuntime;

    // Reset the A2AService mock implementation for each test to ensure clean state
     // Ensure the mock constructor is called, which assigns to serviceInstance
    A2AService.getService = vi.fn().mockImplementation((runtime: IAgentRuntime) => {
        if (!serviceInstance || serviceInstance.agentId !== runtime.agentId) {
            return new (vi.mocked(A2AService))(runtime);
        }
        return serviceInstance;
    });
    A2AService.serviceType = 'A2AService'; // Ensure static property is set on the mock
  });

  describe('Plugin Initialization and Service Registration', () => {
    it('should initialize and set up event listener', async () => {
      await a2aCommunicationPlugin.init?.(mockRuntime, {});
      expect(logger.success).toHaveBeenCalledWith('A2A Communication Plugin initialized and listener set up.');
      // Check if runtime.on was called to listen for messages for this agent
      expect(mockRuntime.on).toHaveBeenCalledWith(`a2a_message_received:${mockRuntime.agentId}`, expect.any(Function));
    });

    it('should declare A2AService in its services array', () => {
        expect(a2aCommunicationPlugin.services).toContain(A2AService);
    });
  });

  describe('SEND_A2A_MESSAGE Action', () => {
    let sendAction: Action | undefined;

    beforeEach(async () => {
      // Initialize the plugin which should also make the service available via runtime.getService
      await a2aCommunicationPlugin.init?.(mockRuntime, {});
      sendAction = a2aCommunicationPlugin.actions?.find(a => a.name === 'SEND_A2A_MESSAGE');
      expect(sendAction).toBeDefined();
       // Ensure serviceInstance is created and linked to this runtime
      serviceInstance = new (vi.mocked(A2AService))(mockRuntime);
      vi.mocked(mockRuntime.getService).mockReturnValue(serviceInstance);

    });

    it('should validate options successfully', async () => {
      const options = {
        receiver_agent_id: uuidv4(),
        message_type: A2AMessageType.INFO_SHARE,
        payload: { data: 'test' },
      };
      const isValid = await sendAction?.validate?.(mockRuntime, {} as Memory, {} as State, options);
      expect(isValid).toBe(true);
    });

    it('should fail validation if options are invalid', async () => {
      const options = { receiver_agent_id: 'not-a-uuid', message_type: 'INVALID_TYPE' };
      const isValid = await sendAction?.validate?.(mockRuntime, {} as Memory, {} as State, options);
      expect(isValid).toBe(false);
      expect(logger.warn).toHaveBeenCalledWith('[SEND_A2A_MESSAGE] Invalid options provided:', expect.any(Object));
    });

    it('should fail validation if A2AService is not available', async () => {
      vi.mocked(mockRuntime.getService).mockReturnValue(undefined); // Simulate service not found
      const options = { receiver_agent_id: uuidv4(), message_type: A2AMessageType.INFO_SHARE, payload: {} };
      const isValid = await sendAction?.validate?.(mockRuntime, {} as Memory, {} as State, options);
      expect(isValid).toBe(false);
      expect(logger.error).toHaveBeenCalledWith('[SEND_A2A_MESSAGE] A2AService is not available. Cannot send message.');
    });


    it('handler should call A2AService.sendMessage with a correctly structured A2AMessage', async () => {
      const actionOptions = {
        receiver_agent_id: 'receiver-uuid-456',
        message_type: A2AMessageType.TASK_REQUEST,
        payload: { task_name: 'do_something', params: { foo: 'bar' } },
        conversation_id: 'conv-uuid-789',
      };
      vi.mocked(uuidv4).mockReturnValue('test-message-id'); // Control message_id

      await sendAction?.handler?.(mockRuntime, {} as Memory, {} as State, actionOptions, mockHandlerCallback, []);

      expect(mockSendMessage).toHaveBeenCalledOnce();
      const sentMessage = mockSendMessage.mock.calls[0][0] as A2AMessage;

      expect(sentMessage.protocol_version).toBe(A2AProtocolVersion);
      expect(sentMessage.message_id).toBe('test-message-id');
      expect(sentMessage.sender_agent_id).toBe(mockRuntime.agentId);
      expect(sentMessage.receiver_agent_id).toBe(actionOptions.receiver_agent_id);
      expect(sentMessage.message_type).toBe(actionOptions.message_type);
      expect(sentMessage.payload).toEqual(actionOptions.payload);
      expect(sentMessage.conversation_id).toBe(actionOptions.conversation_id);
      expect(typeof sentMessage.timestamp).toBe('string');

      expect(mockHandlerCallback).toHaveBeenCalledWith(
        expect.objectContaining({ text: `A2A message of type ${actionOptions.message_type} sent to agent ${actionOptions.receiver_agent_id}. Message ID: test-message-id` })
      );
    });

    it('handler should fail if sender_agent_id is not available', async () => {
        const oldAgentId = mockRuntime.agentId;
        mockRuntime.agentId = undefined; // Simulate missing agentId

        const actionOptions = { receiver_agent_id: 'receiver-uuid', message_type: A2AMessageType.INFO_SHARE, payload: {} };
        await sendAction?.handler?.(mockRuntime, {} as Memory, {} as State, actionOptions, mockHandlerCallback, []);

        expect(logger.error).toHaveBeenCalledWith('[SEND_A2A_MESSAGE] Sender agent ID is not available in runtime. Cannot send message.');
        expect(mockHandlerCallback).toHaveBeenCalledWith({ text: "Error: Sender agent ID is missing." });
        expect(mockSendMessage).not.toHaveBeenCalled();
        mockRuntime.agentId = oldAgentId; // Restore
    });
  });

  describe('A2A Message Reception Handling (within plugin.init)', () => {
    let runtimeEventEmitter: EventEmitter;

     beforeEach(async () => {
        runtimeEventEmitter = new EventEmitter();
        mockRuntime.on = vi.fn((event, listener) => runtimeEventEmitter.on(event, listener as (...args: any[]) => void));
        mockRuntime.emit = vi.fn((event, ...args) => runtimeEventEmitter.emit(event, ...args));

        // We need to re-initialize the plugin for each reception test to ensure the listener is fresh
        // and using the current test's runtimeEventEmitter.
        // The A2AService itself is mocked, so its global bus isn't directly used here.
        // We are testing the plugin's reaction to an event *it expects the service to emit on its runtime*.
        await a2aCommunicationPlugin.init?.(mockRuntime, {});
        serviceInstance = new (vi.mocked(A2AService))(mockRuntime); // Ensure serviceInstance is (re)created for this runtime
        vi.mocked(mockRuntime.getService).mockReturnValue(serviceInstance);
    });

    it('should log received TASK_REQUEST and send an ACK', () => {
      const incomingMessage: A2AMessage = {
        protocol_version: A2AProtocolVersion,
        message_id: 'original-msg-uuid',
        timestamp: new Date().toISOString(),
        sender_agent_id: 'sender-agent-uuid',
        receiver_agent_id: mockRuntime.agentId!,
        message_type: A2AMessageType.TASK_REQUEST,
        payload: { task_name: 'TEST_TASK' },
        conversation_id: 'conv-test-uuid',
      };
      vi.mocked(uuidv4).mockReturnValue('ack-msg-uuid'); // For the ACK message

      // Simulate the A2AService emitting the event on this agent's runtime
      runtimeEventEmitter.emit(`a2a_message_received:${mockRuntime.agentId}`, incomingMessage);

      expect(logger.info).toHaveBeenCalledWith(
        expect.stringContaining(`[A2A Plugin - ${mockRuntime.agentId}] Event: Received A2A message via specific runtime event`),
        expect.objectContaining({ messageId: 'original-msg-uuid', type: A2AMessageType.TASK_REQUEST })
      );
      expect(logger.info).toHaveBeenCalledWith(
        `[A2A Plugin - ${mockRuntime.agentId}] Task request received: TEST_TASK`
      );

      // Check if ACK was sent
      expect(mockSendMessage).toHaveBeenCalledOnce();
      const ackMessage = mockSendMessage.mock.calls[0][0] as A2AMessage;
      expect(ackMessage.message_type).toBe(A2AMessageType.ACK);
      expect(ackMessage.receiver_agent_id).toBe(incomingMessage.sender_agent_id);
      expect(ackMessage.sender_agent_id).toBe(mockRuntime.agentId);
      expect(ackMessage.message_id).toBe('ack-msg-uuid');
      expect(ackMessage.payload).toEqual({
        original_message_id: 'original-msg-uuid',
        status: 'RECEIVED',
      });
    });

     it('should handle INFO_SHARE messages by logging (no ACK defined for it currently)', () => {
      const incomingMessage: A2AMessage = {
        protocol_version: A2AProtocolVersion,
        message_id: 'info-msg-uuid',
        timestamp: new Date().toISOString(),
        sender_agent_id: 'sender-agent-uuid',
        receiver_agent_id: mockRuntime.agentId!,
        message_type: A2AMessageType.INFO_SHARE,
        payload: { info: 'FYI' },
      };

      runtimeEventEmitter.emit(`a2a_message_received:${mockRuntime.agentId}`, incomingMessage);

      expect(logger.info).toHaveBeenCalledWith(
        expect.stringContaining(`[A2A Plugin - ${mockRuntime.agentId}] Event: Received A2A message via specific runtime event`),
        expect.objectContaining({ messageId: 'info-msg-uuid', type: A2AMessageType.INFO_SHARE })
      );
      // No ACK is sent for INFO_SHARE in the current implementation
      expect(mockSendMessage).not.toHaveBeenCalled();
    });
  });
});
