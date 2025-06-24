import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { deepSeekPlugin } from '../index';
import { ModelType, type IAgentRuntime, type GenerateTextParams, type ObjectGenerationParams, logger } from '@elizaos/core';
import { DeepSeekAPI } from '../deepseek-api';

// Mock @elizaos/core logger
vi.mock('@elizaos/core', async (importOriginal) => {
  const original = await importOriginal<typeof import('@elizaos/core')>();
  return {
    ...original,
    logger: {
      info: vi.fn(),
      debug: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
      success: vi.fn(),
      fatal: vi.fn(),
    },
  };
});

// Mock DeepSeekAPI class
vi.mock('../deepseek-api', () => {
  const DeepSeekAPIMock = vi.fn();
  DeepSeekAPIMock.prototype.generateText = vi.fn();
  return { DeepSeekAPI: DeepSeekAPIMock };
});

// Mock environment validation
vi.mock('../environment', () => ({
  validateConfig: vi.fn((config) => ({
    DEEPSEEK_API_KEY: config.DEEPSEEK_API_KEY || 'mock-api-key',
    DEEPSEEK_BASE_URL: config.DEEPSEEK_BASE_URL || 'https://api.deepseek.com/v1',
    DEEPSEEK_CHAT_MODEL: config.DEEPSEEK_CHAT_MODEL || 'deepseek-chat-test',
  })),
}));


describe('@elizaos/plugin-deepseek', () => {
  let mockRuntime: IAgentRuntime;

  beforeEach(() => {
    // Reset mocks before each test
    vi.clearAllMocks();

    // Setup mock runtime
    mockRuntime = {
      // Mock any IAgentRuntime methods that your plugin might use directly
      // For now, model handlers don't use runtime directly, but good to have a placeholder
      getSetting: vi.fn(),
      useModel: vi.fn(),
    } as unknown as IAgentRuntime;

    // Mock the DeepSeekAPI's generateText method for successful calls
    // Mock the DeepSeekAPI's generateText method for successful calls
    (DeepSeekAPI.prototype.generateText as ReturnType<typeof vi.fn>).mockResolvedValue('Mocked DeepSeek Response');
  });

  // Helper to reset the plugin's internal state for testing initialization logic
  // This is needed because the plugin is a module-level singleton.
  const resetPluginState = () => {
    const pluginModule = require('../index');
    pluginModule.deepSeekApiInstance = null;
    pluginModule.pluginConfig = null;
  };

  describe('Plugin Initialization', () => {
    beforeEach(resetPluginState);

    it('should initialize successfully with valid configuration via direct params', async () => {
      const config = { DEEPSEEK_API_KEY: 'test-key-direct' };
      await expect(deepSeekPlugin.init?.(config)).resolves.toBeUndefined();
      expect(logger.success).toHaveBeenCalledWith('DeepSeek plugin initialized successfully.');
      expect(DeepSeekAPI).toHaveBeenCalledOnce();
      expect(DeepSeekAPI).toHaveBeenCalledWith(expect.objectContaining({
        DEEPSEEK_API_KEY: 'test-key-direct',
        DEEPSEEK_BASE_URL: 'https://api.deepseek.com/v1', // default
        DEEPSEEK_CHAT_MODEL: 'deepseek-chat-test', // from mock
      }));
    });

    it('should initialize successfully using environment variables if direct params are missing', async () => {
        process.env.DEEPSEEK_API_KEY = 'test-key-env';
        process.env.DEEPSEEK_CHAT_MODEL = 'env-chat-model';
        // Ensure direct config is empty for these
        const config = {};
        await expect(deepSeekPlugin.init?.(config)).resolves.toBeUndefined();
        expect(DeepSeekAPI).toHaveBeenCalledWith(expect.objectContaining({
            DEEPSEEK_API_KEY: 'test-key-env',
            DEEPSEEK_CHAT_MODEL: 'env-chat-model',
        }));
        delete process.env.DEEPSEEK_API_KEY;
        delete process.env.DEEPSEEK_CHAT_MODEL;
    });


    it('should throw an error if API key is missing and not in env', async () => {
      const originalApiKey = process.env.DEEPSEEK_API_KEY;
      delete process.env.DEEPSEEK_API_KEY; // Ensure env var is not set
      const config = {}; // Missing API key
      await expect(deepSeekPlugin.init?.(config)).rejects.toThrow('DeepSeek configuration error: DEEPSEEK_API_KEY: DeepSeek API key is required.');
      expect(logger.error).toHaveBeenCalledWith('DeepSeek plugin configuration validation failed:', {errors: "DEEPSEEK_API_KEY: DeepSeek API key is required."});
      if (originalApiKey) process.env.DEEPSEEK_API_KEY = originalApiKey; // Restore if it was set
    });
  });

  describe('Model Handlers', () => {
    beforeEach(async () => {
      resetPluginState();
      // Ensure plugin is initialized for model handler tests
      await deepSeekPlugin.init?.({ DEEPSEEK_API_KEY: 'test-key-for-models' });
    });

    describe('ModelType.TEXT_SMALL', () => {
      const modelType = ModelType.TEXT_SMALL;

      it('should call DeepSeekAPI.generateText with correct parameters', async () => {
        const params: GenerateTextParams = {
          prompt: 'Hello DeepSeek',
          modelType,
          temperature: 0.5,
          maxTokens: 100,
          topP: 0.9,
          system: 'System message here'
        };
        await deepSeekPlugin.models?.[modelType]?.(mockRuntime, params);
        expect(DeepSeekAPI.prototype.generateText).toHaveBeenCalledWith(
          'Hello DeepSeek',
          'deepseek-chat-test', // from mocked validateConfig in init
          {
            temperature: 0.5,
            max_tokens: 100,
            top_p: 0.9,
            system_prompt: 'System message here',
            request_json_response: undefined, // Not requested for TEXT_SMALL
          },
        );
      });

      it('should return the response from DeepSeekAPI', async () => {
        const params: GenerateTextParams = { prompt: 'Test prompt', modelType };
        const result = await deepSeekPlugin.models?.[modelType]?.(mockRuntime, params);
        expect(result).toBe('Mocked DeepSeek Response');
      });

      it('should propagate errors from DeepSeekAPI', async () => {
        (DeepSeekAPI.prototype.generateText as ReturnType<typeof vi.fn>).mockRejectedValueOnce(new Error('API Failure'));
        const params: GenerateTextParams = { prompt: 'Error test', modelType };
        await expect(deepSeekPlugin.models?.[modelType]?.(mockRuntime, params)).rejects.toThrow('API Failure');
      });
    });

    describe('ModelType.TEXT_LARGE', () => {
      const modelType = ModelType.TEXT_LARGE;

      it('should call DeepSeekAPI.generateText for TEXT_LARGE with specific params', async () => {
        const params: GenerateTextParams = { prompt: 'Large hello', modelType, system: "Act as a large model" };
        await deepSeekPlugin.models?.[modelType]?.(mockRuntime, params);
        expect(DeepSeekAPI.prototype.generateText).toHaveBeenCalledWith(
          'Large hello',
          'deepseek-chat-test',
          {
            temperature: undefined,
            max_tokens: undefined,
            top_p: undefined,
            system_prompt: "Act as a large model",
            request_json_response: undefined,
          },
        );
      });
    });

    describe('ModelType.OBJECT_SMALL', () => {
      const modelType = ModelType.OBJECT_SMALL;
      const schemaExample = { type: "object", properties: { key: { type: "string" } } };

      it('should request JSON, include schema in prompt, and parse the response', async () => {
        (DeepSeekAPI.prototype.generateText as ReturnType<typeof vi.fn>).mockResolvedValue('```json\n{"key": "value"}\n```');
        const params: ObjectGenerationParams = {
          prompt: 'Generate a JSON object',
          modelType,
          schema: schemaExample,
          system: "JSON mode active"
        };
        const result = await deepSeekPlugin.models?.[modelType]?.(mockRuntime, params);

        expect(result).toEqual({ key: 'value' });
        expect(DeepSeekAPI.prototype.generateText).toHaveBeenCalledWith(
          expect.stringContaining(`Respond ONLY with the JSON object.\n The output MUST be a valid JSON object adhering to the following JSON schema: \`\`\`json\n${JSON.stringify(params.schema, null, 2)}\n\`\`\``),
          'deepseek-chat-test',
          {
            temperature: undefined,
            max_tokens: undefined,
            top_p: undefined,
            system_prompt: "JSON mode active",
            request_json_response: true,
          },
        );
      });

      it('should correctly parse JSON even without markdown backticks', async () => {
        (DeepSeekAPI.prototype.generateText as ReturnType<typeof vi.fn>).mockResolvedValue('{"key": "value"}');
        const params: ObjectGenerationParams = { prompt: 'Generate JSON', modelType, schema: schemaExample };
        const result = await deepSeekPlugin.models?.[modelType]?.(mockRuntime, params);
        expect(result).toEqual({ key: 'value' });
      });


      it('should handle non-JSON response by throwing an error', async () => {
        (DeepSeekAPI.prototype.generateText as ReturnType<typeof vi.fn>).mockResolvedValue('This is not JSON.');
        const params: ObjectGenerationParams = { prompt: 'Generate JSON', modelType, schema: schemaExample };
        await expect(deepSeekPlugin.models?.[modelType]?.(mockRuntime, params))
          .rejects.toThrow('DeepSeek response was not valid JSON.');
      });
    });

    describe('Plugin Not Initialized', () => {
        beforeEach(resetPluginState); // Ensure plugin is not initialized

        it('should throw error for TEXT_SMALL if not initialized', async () => {
            const params: GenerateTextParams = { prompt: 'Test', modelType: ModelType.TEXT_SMALL };
            await expect(deepSeekPlugin.models?.[ModelType.TEXT_SMALL]?.(mockRuntime, params))
              .rejects.toThrow('DeepSeek plugin not initialized or configured.');
        });

        it('should throw error for OBJECT_SMALL if not initialized', async () => {
            const params: ObjectGenerationParams = { prompt: 'Test', modelType: ModelType.OBJECT_SMALL };
            await expect(deepSeekPlugin.models?.[ModelType.OBJECT_SMALL]?.(mockRuntime, params))
              .rejects.toThrow('DeepSeek plugin not initialized or configured.');
        });
    });
  });
});
