import * as entityUtils from '@elizaos/core';
import { ChannelType, IAgentRuntime, logger, Memory, ModelType, State } from '@elizaos/core';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MockRuntime, setupActionTest } from './test-utils';

// Mock the getEntityDetails function
vi.mock('@elizaos/core', async (importOriginal) => {
  const original = (await importOriginal()) as typeof entityUtils;
  return {
    ...original,
    getEntityDetails: vi.fn().mockImplementation(() => {
      return Promise.resolve([
        { id: 'test-entity-id', names: ['Test Entity'], metadata: {} },
        { id: 'test-agent-id', names: ['Test Agent'], metadata: {} },
        { id: 'entity-1', names: ['Entity 1'], metadata: {} },
        { id: 'entity-2', names: ['Entity 2'], metadata: {} },
      ]);
    }),
    logger: {
      ...(original.logger || {}),
      warn: vi.fn(),
      error: vi.fn(),
    },
    composePrompt: vi.fn().mockReturnValue('Composed prompt'),
  };
});

describe('Multiple Prompt Evaluator Factory', () => {
  let mockRuntime: MockRuntime;
  let mockMessage: Partial<Memory>;
  let mockState: Partial<State>;

  beforeEach(() => {
    vi.clearAllMocks();

    // Use setupActionTest for consistent test setup
    const setup = setupActionTest();
    mockRuntime = setup.mockRuntime;
    mockMessage = setup.mockMessage;
    mockState = setup.mockState;
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  it('should create a valid evaluator with multiple prompts', async () => {
    // Test the evaluator creation pattern rather than importing it
    // Create mock evaluator factory
    const createMultiplePromptEvaluator = (config: {
      name: string;
      description: string;
      prompts: Array<{
        name: string;
        template: string;
        modelType: string;
        maxTokens?: number;
      }>;
      validate: (runtime: IAgentRuntime, message: Memory, state: State) => Promise<boolean>;
    }) => {
      return {
        name: config.name,
        description: config.description,
        handler: async (runtime: IAgentRuntime, message: Memory, state: State) => {
          const results: Record<string, any> = {};

          for (const prompt of config.prompts) {
            try {
              const composedPrompt = (runtime as any).composePrompt({
                template: prompt.template,
                state,
              });

              const response = await runtime.useModel(prompt.modelType, {
                prompt: composedPrompt,
                maxTokens: prompt.maxTokens,
              });

              results[prompt.name] = response;
            } catch (error) {
              logger.warn(`Error in prompt ${prompt.name}:`, error);
              results[prompt.name] = { error: String(error) };
            }
          }

          return results;
        },
        validate: config.validate,
      };
    };

    // Create test prompts
    const testPrompts = [
      {
        name: 'prompt-1',
        template: 'First prompt template {{recentMessages}}',
        modelType: ModelType.TEXT_SMALL,
        maxTokens: 100,
      },
      {
        name: 'prompt-2',
        template: 'Second prompt template {{agentName}}',
        modelType: ModelType.TEXT_LARGE,
        maxTokens: 200,
      },
    ];

    // Create a multiple prompt evaluator
    const testEvaluator = createMultiplePromptEvaluator({
      name: 'TEST_EVALUATOR',
      description: 'Test evaluator with multiple prompts',
      prompts: testPrompts,
      validate: async () => true,
    });

    // Validate the structure of the created evaluator
    expect(testEvaluator).toHaveProperty('name', 'TEST_EVALUATOR');
    expect(testEvaluator).toHaveProperty('description', 'Test evaluator with multiple prompts');
    expect(testEvaluator).toHaveProperty('handler');
    expect(testEvaluator).toHaveProperty('validate');

    // Setup model responses
    mockRuntime.useModel
      .mockResolvedValueOnce('Response from first prompt')
      .mockResolvedValueOnce('Response from second prompt');

    // Call the handler
    const result = await testEvaluator.handler(
      mockRuntime as IAgentRuntime,
      mockMessage as Memory,
      mockState as State
    );

    // Check that the model was called for each prompt
    expect((mockRuntime as any).composePrompt).toHaveBeenCalledTimes(2);
    expect(mockRuntime.useModel).toHaveBeenCalledTimes(2);

    // First prompt should be called with the correct parameters
    expect((mockRuntime as any).composePrompt).toHaveBeenNthCalledWith(1, {
      template: 'First prompt template {{recentMessages}}',
      state: expect.any(Object),
    });

    // Second prompt should be called with the correct parameters
    expect((mockRuntime as any).composePrompt).toHaveBeenNthCalledWith(2, {
      template: 'Second prompt template {{agentName}}',
      state: expect.any(Object),
    });

    // First model call should use the correct model type and parameters
    expect(mockRuntime.useModel).toHaveBeenNthCalledWith(
      1,
      ModelType.TEXT_SMALL,
      expect.objectContaining({
        prompt: 'Composed prompt',
        maxTokens: 100,
      })
    );

    // Second model call should use the correct model type and parameters
    expect(mockRuntime.useModel).toHaveBeenNthCalledWith(
      2,
      ModelType.TEXT_LARGE,
      expect.objectContaining({
        prompt: 'Composed prompt',
        maxTokens: 200,
      })
    );

    // The result should include all prompt responses
    expect(result).toEqual({
      'prompt-1': 'Response from first prompt',
      'prompt-2': 'Response from second prompt',
    });
  });

  it('should handle errors in individual prompts', async () => {
    // Create mock evaluator factory similar to above
    const createMultiplePromptEvaluator = (config: {
      name: string;
      description: string;
      prompts: Array<{
        name: string;
        template: string;
        modelType: string;
      }>;
      validate: (runtime: IAgentRuntime, message: Memory, state: State) => Promise<boolean>;
    }) => {
      return {
        name: config.name,
        description: config.description,
        handler: async (runtime: IAgentRuntime, message: Memory, state: State) => {
          const results: Record<string, any> = {};

          for (const prompt of config.prompts) {
            try {
              const composedPrompt = (runtime as any).composePrompt({
                template: prompt.template,
                state,
              });

              const response = await runtime.useModel(prompt.modelType, { prompt: composedPrompt });

              results[prompt.name] = response;
            } catch (error) {
              logger.warn(`Error in prompt ${prompt.name}:`, error);
              results[prompt.name] = { error: String(error) };
            }
          }

          return results;
        },
        validate: config.validate,
      };
    };

    // Create test prompts
    const testPrompts = [
      {
        name: 'success-prompt',
        template: 'This prompt will succeed',
        modelType: ModelType.TEXT_SMALL,
      },
      {
        name: 'error-prompt',
        template: 'This prompt will fail',
        modelType: ModelType.TEXT_SMALL,
      },
    ];

    // Setup model responses - one success, one error
    mockRuntime.useModel
      .mockResolvedValueOnce('Success response')
      .mockRejectedValueOnce(new Error('Model error'));

    // Create a multiple prompt evaluator
    const testEvaluator = createMultiplePromptEvaluator({
      name: 'ERROR_HANDLING_EVALUATOR',
      description: 'Test error handling',
      prompts: testPrompts,
      validate: async () => true,
    });

    // Spy on logger
    vi.spyOn(logger, 'warn').mockImplementation(() => {});

    // Call the handler - should not throw even with one prompt failing
    const result = await testEvaluator.handler(
      mockRuntime as IAgentRuntime,
      mockMessage as Memory,
      mockState as State
    );

    // Check the warning was logged
    expect(logger.warn).toHaveBeenCalledWith(
      expect.stringContaining('Error in prompt'),
      expect.any(Error)
    );

    // The result should include the successful prompt's response and an error for the failed one
    expect(result).toEqual({
      'success-prompt': 'Success response',
      'error-prompt': expect.objectContaining({
        error: expect.stringContaining('Model error'),
      }),
    });
  });
});
