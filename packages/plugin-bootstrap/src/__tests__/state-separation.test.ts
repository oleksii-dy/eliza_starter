import { describe, expect, it, mock, beforeEach } from 'bun:test';
import { EventType, type Memory, type Content, type State, type IAgentRuntime } from '@elizaos/core';
import { bootstrapPlugin } from '../index';
import { createMockRuntime, createMockMemory, createMockState } from './test-utils';

describe('State Separation in Message Handler', () => {
  let mockRuntime: any;
  let mockMessage: Memory;
  let mockCallback: any;
  let mockState: State;
  let mockProviderState: State;

  beforeEach(() => {
    mock.restore();

    mockCallback = mock().mockResolvedValue(undefined);

    // Create a mock runtime with the necessary methods
    mockRuntime = createMockRuntime({
      // Mock composeState to return different states based on providers
      composeState: mock().mockImplementation(async (message: Memory, providers: string[]) => {
        if (providers.includes('ATTACHMENTS')) {
          // Return provider-modified state with attachments formatting
          return {
            ...mockState,
            values: {
              ...mockState.values,
              attachments: '# Attachments\n\nID: test-attachment\nName: test.txt\nURL: http://example.com/test.txt\nType: file\nDescription: Test file\nText: Test content\n',
            },
            data: {
              ...mockState.data,
              attachments: [
                {
                  id: 'test-attachment',
                  title: 'test.txt',
                  url: 'http://example.com/test.txt',
                  source: 'file',
                  description: 'Test file',
                  text: 'Test content',
                }
              ]
            }
          };
        }
        // Return original state for other providers
        return mockState;
      }),
      
      // Mock processActions to verify it receives the original state
      processActions: mock().mockImplementation(async (message: Memory, responseMessages: Memory[], state: State, callback: any) => {
        // This should receive the original state, not the provider-modified state
        expect(state.values.attachments).toBeUndefined();
        expect(state.data.attachments).toBeUndefined();
        await callback({ text: 'Test action response' });
      }),
      
      // Mock evaluate to verify it receives the provider state
      evaluate: mock().mockImplementation(async (message: Memory, state: State, shouldRespond: boolean, callback: any, responseMessages: Memory[]) => {
        // This should receive the provider-modified state
        if (state.values.attachments) {
          expect(state.values.attachments).toContain('# Attachments');
          expect(state.data.attachments).toBeDefined();
        }
        return [];
      }),
      
      // Mock useModel to return response with ATTACHMENTS provider
      useModel: mock().mockImplementation(async (modelType: string, params: any) => {
        if (params.template && params.template.includes('Should {{agentName}} respond')) {
          return 'yes';
        }
        return {
          thought: 'I should respond with attachments info',
          message: 'Here is the response with attachments',
          providers: ['ATTACHMENTS'],
          actions: ['REPLY']
        };
      }),
      
      // Mock other required methods
      getParticipantUserState: mock().mockResolvedValue('ACTIVE'),
      getRoom: mock().mockResolvedValue({ type: 'GROUP' }),
      addEmbeddingToMemory: mock().mockResolvedValue(undefined),
      createMemory: mock().mockResolvedValue(undefined),
      startRun: mock().mockReturnValue('test-run-id'),
      endRun: mock().mockReturnValue(undefined),
      emitEvent: mock().mockResolvedValue(undefined),
    });

    // Create a clean mock state
    mockState = createMockState({
      values: {
        agentName: 'TestAgent',
        recentMessages: 'User: Hello',
      },
      data: {
        room: {
          id: 'test-room-id',
          type: 'GROUP',
        }
      }
    });

    // Create a mock message
    mockMessage = createMockMemory({
      content: {
        text: 'Test message with attachment',
        attachments: [
          {
            id: 'test-attachment',
            title: 'test.txt',
            url: 'http://example.com/test.txt',
            source: 'file',
            description: 'Test file',
            text: 'Test content',
          }
        ]
      } as Content,
    });
  });

  it('should separate provider state from action state', async () => {
    // Get the message handler from the plugin
    const messageHandler = bootstrapPlugin.events?.[EventType.MESSAGE_RECEIVED]?.[0];
    expect(messageHandler).toBeDefined();

    if (messageHandler) {
      // Execute the message handler
      await messageHandler({
        runtime: mockRuntime,
        message: mockMessage,
        callback: mockCallback,
        source: 'test'
      });

      // Verify that processActions was called with the original state
      expect(mockRuntime.processActions).toHaveBeenCalledTimes(1);
      const processActionsCall = mockRuntime.processActions.mock.calls[0];
      const statePassedToActions = processActionsCall[2];
      
      // Actions should receive clean state without provider modifications
      expect(statePassedToActions.values.attachments).toBeUndefined();
      expect(statePassedToActions.data.attachments).toBeUndefined();

      // Verify that evaluate was called with the provider state
      expect(mockRuntime.evaluate).toHaveBeenCalledTimes(1);
      const evaluateCall = mockRuntime.evaluate.mock.calls[0];
      const statePassedToEvaluate = evaluateCall[1];
      
      // Evaluators should receive provider-modified state
      expect(statePassedToEvaluate.values.attachments).toContain('# Attachments');
      expect(statePassedToEvaluate.data.attachments).toBeDefined();
    }
  });

  it('should not interfere with custom action callbacks', async () => {
    // Create a mock custom action that checks state purity
    const customActionHandler = mock().mockImplementation(async (runtime: IAgentRuntime, message: Memory, state: State, callback: any) => {
      // Verify the state is clean and not modified by providers
      expect(state.values.attachments).toBeUndefined();
      expect(state.data.attachments).toBeUndefined();
      
      // Custom action should have access to original state values
      expect(state.values.agentName).toBe('TestAgent');
      expect(state.values.recentMessages).toBe('User: Hello');
      
      await callback({ text: 'Custom action response' });
    });

    // Mock a custom action
    const customAction = {
      name: 'CUSTOM_ACTION',
      description: 'A custom action for testing',
      validate: mock().mockResolvedValue(true),
      handler: customActionHandler,
    };

    // Add the custom action to the runtime
    mockRuntime.actions = [customAction];
    mockRuntime.processActions = mock().mockImplementation(async (message: Memory, responseMessages: Memory[], state: State, callback: any) => {
      // Simulate calling the custom action with the clean state
      await customAction.handler(mockRuntime, message, state, callback);
    });

    // Mock the response to trigger the custom action
    mockRuntime.useModel = mock().mockImplementation(async (modelType: string, params: any) => {
      if (params.template && params.template.includes('Should {{agentName}} respond')) {
        return 'yes';
      }
      return {
        thought: 'I should use the custom action',
        message: 'Using custom action',
        providers: ['ATTACHMENTS'],
        actions: ['CUSTOM_ACTION']
      };
    });

    // Get the message handler from the plugin
    const messageHandler = bootstrapPlugin.events?.[EventType.MESSAGE_RECEIVED]?.[0];
    expect(messageHandler).toBeDefined();

    if (messageHandler) {
      // Execute the message handler
      await messageHandler({
        runtime: mockRuntime,
        message: mockMessage,
        callback: mockCallback,
        source: 'test'
      });

      // Verify that the custom action was called with clean state
      expect(customActionHandler).toHaveBeenCalledTimes(1);
      expect(customActionHandler).toHaveBeenCalledWith(
        mockRuntime,
        mockMessage,
        expect.objectContaining({
          values: expect.not.objectContaining({
            attachments: expect.anything()
          })
        }),
        expect.any(Function)
      );
    }
  });

  it('should handle simple responses without provider state modification', async () => {
    // Mock a simple response without providers
    mockRuntime.useModel = mock().mockImplementation(async (modelType: string, params: any) => {
      if (params.template && params.template.includes('Should {{agentName}} respond')) {
        return 'yes';
      }
      return {
        thought: 'Simple response',
        message: 'This is a simple response',
        actions: ['REPLY']
      };
    });

    // Get the message handler from the plugin
    const messageHandler = bootstrapPlugin.events?.[EventType.MESSAGE_RECEIVED]?.[0];
    expect(messageHandler).toBeDefined();

    if (messageHandler) {
      // Execute the message handler
      await messageHandler({
        runtime: mockRuntime,
        message: mockMessage,
        callback: mockCallback,
        source: 'test'
      });

      // For simple responses, composeState should only be called once (initial state)
      expect(mockRuntime.composeState).toHaveBeenCalledTimes(1);
      
      // Callback should be called with the simple response
      expect(mockCallback).toHaveBeenCalledWith(
        expect.objectContaining({
          text: 'This is a simple response',
          simple: true
        })
      );
    }
  });

  it('should only create provider state when providers are present', async () => {
    // Mock response without providers
    mockRuntime.useModel = mock().mockImplementation(async (modelType: string, params: any) => {
      if (params.template && params.template.includes('Should {{agentName}} respond')) {
        return 'yes';
      }
      return {
        thought: 'Response without providers',
        message: 'No providers needed',
        actions: ['REPLY']
      };
    });

    // Get the message handler from the plugin
    const messageHandler = bootstrapPlugin.events?.[EventType.MESSAGE_RECEIVED]?.[0];
    expect(messageHandler).toBeDefined();

    if (messageHandler) {
      // Execute the message handler
      await messageHandler({
        runtime: mockRuntime,
        message: mockMessage,
        callback: mockCallback,
        source: 'test'
      });

      // composeState should only be called once for initial state composition, not for provider state
      expect(mockRuntime.composeState).toHaveBeenCalledTimes(1);
      
      // The call should be for the initial state, not provider state
      const composeStateCall = mockRuntime.composeState.mock.calls[0];
      expect(composeStateCall[1]).toEqual(['ANXIETY', 'SHOULD_RESPOND', 'ENTITIES', 'CHARACTER', 'RECENT_MESSAGES', 'ACTIONS']);
    }
  });

  it('should handle evaluators with provider state when providers are present', async () => {
    // Mock response with providers
    mockRuntime.useModel = mock().mockImplementation(async (modelType: string, params: any) => {
      if (params.template && params.template.includes('Should {{agentName}} respond')) {
        return 'yes';
      }
      return {
        thought: 'Response with providers',
        message: 'Using providers',
        providers: ['ATTACHMENTS'],
        actions: ['REPLY']
      };
    });

    // Get the message handler from the plugin
    const messageHandler = bootstrapPlugin.events?.[EventType.MESSAGE_RECEIVED]?.[0];
    expect(messageHandler).toBeDefined();

    if (messageHandler) {
      // Execute the message handler
      await messageHandler({
        runtime: mockRuntime,
        message: mockMessage,
        callback: mockCallback,
        source: 'test'
      });

      // composeState should be called twice: once for initial state, once for provider state
      expect(mockRuntime.composeState).toHaveBeenCalledTimes(2);
      
      // First call should be for initial state
      const firstCall = mockRuntime.composeState.mock.calls[0];
      expect(firstCall[1]).toEqual(['ANXIETY', 'SHOULD_RESPOND', 'ENTITIES', 'CHARACTER', 'RECENT_MESSAGES', 'ACTIONS']);
      
      // Second call should be for provider state
      const secondCall = mockRuntime.composeState.mock.calls[1];
      expect(secondCall[1]).toEqual(['ATTACHMENTS']);

      // Evaluate should be called with the provider state
      expect(mockRuntime.evaluate).toHaveBeenCalledTimes(1);
      const evaluateCall = mockRuntime.evaluate.mock.calls[0];
      const statePassedToEvaluate = evaluateCall[1];
      expect(statePassedToEvaluate.values.attachments).toContain('# Attachments');
    }
  });
});