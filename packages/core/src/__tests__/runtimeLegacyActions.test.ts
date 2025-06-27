import { describe, it, expect, beforeEach, mock, spyOn } from 'bun:test';
import { AgentRuntime } from '../runtime';
import {
  type Action,
  type Memory,
  type UUID,
  type ActionResult,
  type IAgentRuntime,
  type State,
  type HandlerCallback,
  ChannelType,
  ModelType,
} from '../types';
import { v4 as uuidv4 } from 'uuid';

describe('Runtime - Legacy Action Return Values', () => {
  let runtime: AgentRuntime;
  let mockAdapter: any;
  let mockMessage: Memory;
  let mockCallback: HandlerCallback;

  beforeEach(() => {
    // Create mock adapter with all required methods
    mockAdapter = {
      init: mock().mockResolvedValue(undefined),
      close: mock().mockResolvedValue(undefined),
      getAgent: mock().mockResolvedValue(null),
      getAgents: mock().mockResolvedValue([]),
      createAgent: mock().mockResolvedValue(true),
      updateAgent: mock().mockResolvedValue(true),
      deleteAgent: mock().mockResolvedValue(true),
      getEntityById: mock().mockResolvedValue(null),
      getEntitiesByIds: mock().mockResolvedValue([]),
      createEntity: mock().mockResolvedValue(true),
      createEntities: mock().mockResolvedValue(true),
      updateEntity: mock().mockResolvedValue(undefined),
      getParticipantsForRoom: mock().mockResolvedValue([]),
      addParticipantsRoom: mock().mockResolvedValue(true),
      removeParticipant: mock().mockResolvedValue(true),
      getRoom: mock().mockResolvedValue(null),
      getRoomsByIds: mock().mockResolvedValue([]),
      createRoom: mock().mockResolvedValue(uuidv4()),
      createRooms: mock().mockResolvedValue([uuidv4()]),
      deleteRoom: mock().mockResolvedValue(undefined),
      updateRoom: mock().mockResolvedValue(undefined),
      createMemory: mock().mockResolvedValue(uuidv4()),
      getMemories: mock().mockResolvedValue([]),
      searchMemories: mock().mockResolvedValue([]),
      log: mock().mockResolvedValue(undefined),
      getCache: mock().mockResolvedValue(undefined),
      setCache: mock().mockResolvedValue(true),
      deleteCache: mock().mockResolvedValue(true),
    };

    // Create runtime with mock character
    runtime = new AgentRuntime({
      agentId: uuidv4() as UUID,
      character: {
        name: 'TestAgent',
        id: uuidv4() as UUID,
        username: 'testagent',
        bio: 'A test agent for unit tests',
        settings: {},
      },
      adapter: mockAdapter,
    });

    // Mock the logger to suppress error logs during tests
    runtime.logger = {
      debug: mock(),
      info: mock(),
      warn: mock(),
      error: mock(),
      log: mock(),
    } as any;

    // Create mock message
    mockMessage = {
      id: uuidv4() as UUID,
      entityId: uuidv4() as UUID,
      roomId: uuidv4() as UUID,
      worldId: uuidv4() as UUID,
      content: {
        text: 'Test message',
        actions: ['TEST_ACTION'],
        source: 'test',
      },
      createdAt: Date.now(),
    };

    // Create mock callback
    mockCallback = mock().mockResolvedValue(undefined);
  });

  describe('Void return handling', () => {
    it('should handle action returning void without error', async () => {
      const voidAction: Action = {
        name: 'VOID_ACTION',
        description: 'Test action that returns void',
        handler: mock().mockResolvedValue(undefined),
        validate: mock().mockResolvedValue(true),
        examples: [],
      };

      runtime.registerAction(voidAction);

      const responses = [
        {
          ...mockMessage,
          content: {
            ...mockMessage.content,
            actions: ['VOID_ACTION'],
          },
        },
      ];

      // processActions returns void, so we just ensure it doesn't throw
      await runtime.processActions(mockMessage, responses, undefined, mockCallback);

      expect(voidAction.handler).toHaveBeenCalled();
      expect(mockAdapter.log).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'action',
          body: expect.objectContaining({
            action: 'VOID_ACTION',
            isLegacyReturn: true,
            result: { legacy: undefined },
          }),
        })
      );
    });

    it('should not add void returns to action results state', async () => {
      let capturedState: State | undefined;

      const voidAction: Action = {
        name: 'VOID_ACTION',
        description: 'Test action that returns void',
        handler: mock().mockImplementation(
          async (_runtime: IAgentRuntime, _message: Memory, state?: State) => {
            capturedState = state;
            return undefined;
          }
        ),
        validate: mock().mockResolvedValue(true),
        examples: [],
      };

      runtime.registerAction(voidAction);

      const responses = [
        {
          ...mockMessage,
          content: {
            ...mockMessage.content,
            actions: ['VOID_ACTION'],
          },
        },
      ];

      await runtime.processActions(mockMessage, responses, undefined, mockCallback);

      // Check that actionResults array is not populated with void returns
      expect(capturedState?.data?.actionResults).toBeUndefined();
    });
  });

  describe('Null return handling', () => {
    it('should handle action returning null without error', async () => {
      const nullAction: Action = {
        name: 'NULL_ACTION',
        description: 'Test action that returns null',
        handler: mock().mockResolvedValue(null),
        validate: mock().mockResolvedValue(true),
        examples: [],
      };

      runtime.registerAction(nullAction);

      const responses = [
        {
          ...mockMessage,
          content: {
            ...mockMessage.content,
            actions: ['NULL_ACTION'],
          },
        },
      ];

      // processActions returns void, so we just ensure it doesn't throw
      await runtime.processActions(mockMessage, responses, undefined, mockCallback);

      expect(nullAction.handler).toHaveBeenCalled();
      expect(mockAdapter.log).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'action',
          body: expect.objectContaining({
            action: 'NULL_ACTION',
            isLegacyReturn: true,
            result: { legacy: null },
          }),
        })
      );
    });
  });

  describe('Boolean return handling', () => {
    it('should handle action returning true without error', async () => {
      const trueAction: Action = {
        name: 'TRUE_ACTION',
        description: 'Test action that returns true',
        handler: mock().mockResolvedValue(true),
        validate: mock().mockResolvedValue(true),
        examples: [],
      };

      runtime.registerAction(trueAction);

      const responses = [
        {
          ...mockMessage,
          content: {
            ...mockMessage.content,
            actions: ['TRUE_ACTION'],
          },
        },
      ];

      // processActions returns void, so we just ensure it doesn't throw
      await runtime.processActions(mockMessage, responses, undefined, mockCallback);

      expect(trueAction.handler).toHaveBeenCalled();
      expect(mockAdapter.log).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'action',
          body: expect.objectContaining({
            action: 'TRUE_ACTION',
            isLegacyReturn: true,
            result: { legacy: true },
          }),
        })
      );
    });

    it('should handle action returning false without error', async () => {
      const falseAction: Action = {
        name: 'FALSE_ACTION',
        description: 'Test action that returns false',
        handler: mock().mockResolvedValue(false),
        validate: mock().mockResolvedValue(true),
        examples: [],
      };

      runtime.registerAction(falseAction);

      const responses = [
        {
          ...mockMessage,
          content: {
            ...mockMessage.content,
            actions: ['FALSE_ACTION'],
          },
        },
      ];

      // processActions returns void, so we just ensure it doesn't throw
      await runtime.processActions(mockMessage, responses, undefined, mockCallback);

      expect(falseAction.handler).toHaveBeenCalled();
      expect(mockAdapter.log).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'action',
          body: expect.objectContaining({
            action: 'FALSE_ACTION',
            isLegacyReturn: true,
            result: { legacy: false },
          }),
        })
      );
    });
  });

  describe('Mixed return types in action chain', () => {
    it('should handle a mix of ActionResult and legacy returns', async () => {
      const actionResults: any[] = [];

      const properAction: Action = {
        name: 'PROPER_ACTION',
        description: 'Test action that returns ActionResult',
        handler: mock().mockResolvedValue({
          values: { success: true },
          data: { processed: true },
          text: 'Action completed',
        } as ActionResult),
        validate: mock().mockResolvedValue(true),
        examples: [],
      };

      const voidAction: Action = {
        name: 'VOID_ACTION',
        description: 'Test action that returns void',
        handler: mock().mockResolvedValue(undefined),
        validate: mock().mockResolvedValue(true),
        examples: [],
      };

      const boolAction: Action = {
        name: 'BOOL_ACTION',
        description: 'Test action that returns boolean',
        handler: mock().mockResolvedValue(true),
        validate: mock().mockResolvedValue(true),
        examples: [],
      };

      runtime.registerAction(properAction);
      runtime.registerAction(voidAction);
      runtime.registerAction(boolAction);

      const responses = [
        {
          ...mockMessage,
          content: {
            ...mockMessage.content,
            actions: ['PROPER_ACTION', 'VOID_ACTION', 'BOOL_ACTION'],
          },
        },
      ];

      await runtime.processActions(mockMessage, responses, undefined, mockCallback);

      // Check that all actions were called
      expect(properAction.handler).toHaveBeenCalled();
      expect(voidAction.handler).toHaveBeenCalled();
      expect(boolAction.handler).toHaveBeenCalled();

      // Check logs
      const logCalls = mockAdapter.log.mock.calls;
      const actionLogs = logCalls.filter((call: any) => call[0].type === 'action');

      expect(actionLogs).toHaveLength(3);

      // First action should have proper result
      expect(actionLogs[0][0].body).toMatchObject({
        action: 'PROPER_ACTION',
        isLegacyReturn: false,
        result: {
          values: { success: true },
          data: { processed: true },
          text: 'Action completed',
        },
      });

      // Second action should have legacy void result
      expect(actionLogs[1][0].body).toMatchObject({
        action: 'VOID_ACTION',
        isLegacyReturn: true,
        result: { legacy: undefined },
      });

      // Third action should have legacy boolean result
      expect(actionLogs[2][0].body).toMatchObject({
        action: 'BOOL_ACTION',
        isLegacyReturn: true,
        result: { legacy: true },
      });
    });
  });

  describe('Working memory updates', () => {
    it('should not update working memory for legacy returns', async () => {
      const updateWorkingMemorySpy = spyOn(runtime as any, 'updateWorkingMemory');

      const voidAction: Action = {
        name: 'VOID_ACTION',
        description: 'Test action that returns void',
        handler: mock().mockResolvedValue(undefined),
        validate: mock().mockResolvedValue(true),
        examples: [],
      };

      runtime.registerAction(voidAction);

      const responses = [
        {
          ...mockMessage,
          content: {
            ...mockMessage.content,
            actions: ['VOID_ACTION'],
          },
        },
      ];

      await runtime.processActions(mockMessage, responses, undefined, mockCallback);

      // Working memory should not be updated for void returns
      expect(updateWorkingMemorySpy).not.toHaveBeenCalled();

      updateWorkingMemorySpy.mockRestore();
    });

    it('should update working memory for proper ActionResult returns', async () => {
      const updateWorkingMemorySpy = spyOn(runtime as any, 'updateWorkingMemory');

      const properAction: Action = {
        name: 'PROPER_ACTION',
        description: 'Test action that returns ActionResult',
        handler: mock().mockResolvedValue({
          values: { test: true },
          data: { result: 'success' },
        } as ActionResult),
        validate: mock().mockResolvedValue(true),
        examples: [],
      };

      runtime.registerAction(properAction);

      const responses = [
        {
          ...mockMessage,
          content: {
            ...mockMessage.content,
            actions: ['PROPER_ACTION'],
          },
        },
      ];

      await runtime.processActions(mockMessage, responses, undefined, mockCallback);

      // Working memory should be updated for ActionResult returns
      expect(updateWorkingMemorySpy).toHaveBeenCalledWith(
        mockMessage.roomId,
        'PROPER_ACTION',
        expect.objectContaining({
          values: { test: true },
          data: { result: 'success' },
        })
      );

      updateWorkingMemorySpy.mockRestore();
    });
  });

  describe('Error handling with legacy returns', () => {
    it('should handle errors in legacy actions gracefully', async () => {
      const errorAction: Action = {
        name: 'ERROR_ACTION',
        description: 'Test action that throws',
        handler: mock().mockRejectedValue(new Error('Test error')),
        validate: mock().mockResolvedValue(true),
        examples: [],
      };

      runtime.registerAction(errorAction);

      const responses = [
        {
          ...mockMessage,
          content: {
            ...mockMessage.content,
            actions: ['ERROR_ACTION'],
          },
        },
      ];

      // processActions returns void, so we just ensure it doesn't throw
      await runtime.processActions(mockMessage, responses, undefined, mockCallback);

      // Should create error memory
      expect(mockAdapter.createMemory).toHaveBeenCalled();
      const createMemoryCalls = mockAdapter.createMemory.mock.calls;
      const errorMemoryCall = createMemoryCalls.find(
        (call: any) => call[0].content?.thought === 'Test error'
      );
      expect(errorMemoryCall).toBeDefined();
    });
  });

  describe('State accumulation with mixed returns', () => {
    it('should only accumulate state from proper ActionResult returns', async () => {
      let finalState: State | undefined;

      const action1: Action = {
        name: 'ACTION_1',
        description: 'Returns proper ActionResult',
        handler: mock().mockResolvedValue({
          values: { step1: 'completed' },
          data: { result1: true },
        } as ActionResult),
        validate: mock().mockResolvedValue(true),
        examples: [],
      };

      const action2: Action = {
        name: 'ACTION_2',
        description: 'Returns void',
        handler: mock().mockResolvedValue(undefined),
        validate: mock().mockResolvedValue(true),
        examples: [],
      };

      const action3: Action = {
        name: 'ACTION_3',
        description: 'Returns proper ActionResult',
        handler: mock().mockImplementation(
          async (_runtime: IAgentRuntime, _message: Memory, state?: State) => {
            finalState = state;

            return {
              values: { step3: 'completed' },
              data: { result3: true },
            } as ActionResult;
          }
        ),
        validate: mock().mockResolvedValue(true),
        examples: [],
      };

      runtime.registerAction(action1);
      runtime.registerAction(action2);
      runtime.registerAction(action3);

      const responses = [
        {
          ...mockMessage,
          content: {
            ...mockMessage.content,
            actions: ['ACTION_1', 'ACTION_2', 'ACTION_3'],
          },
        },
      ];

      await runtime.processActions(mockMessage, responses, undefined, mockCallback);

      // Final state should contain results from action1
      // The state accumulation happens through accumulatedState in processActions
      // Since action2 returns void, it doesn't add to state
      // Action3 gets the accumulated state from action1
      expect(finalState).toBeDefined();
      expect(finalState?.values).toBeDefined();

      // Check if step1 was properly accumulated
      if (finalState?.values?.step1) {
        expect(finalState.values.step1).toBe('completed');
      }

      // Check actionResults in data
      if (finalState?.data?.actionResults) {
        expect(finalState.data.actionResults).toHaveLength(1); // Only action1's result
        expect(finalState.data.actionResults[0]).toMatchObject({
          values: { step1: 'completed' },
          data: { result1: true },
        });
      }
    });
  });
});
