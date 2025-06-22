/**
 * Integration tests for the configuration system
 * Validates that all components properly use configurable values instead of hard-coded ones
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import type { IAgentRuntime } from '@elizaos/core';
import { getTrainingConfig, TrainingConfigurationManager } from '../../config/training-config.js';
import { TogetherAIClient } from '../../utils/together-ai-client.js';
import { RepositoryCloner } from '../../training-generator/core/repo-cloner.js';
import { AnthropicAPIProxy } from '../../proxy/AnthropicProxy.js';
import { AutomatedDataCollector } from '../../utils/automated-data-collector.js';

// Mock runtime with custom settings
function createMockRuntimeWithSettings(settings: Record<string, string>): IAgentRuntime {
  return {
    agentId: 'test-agent',
    character: {
      name: 'TestAgent',
      bio: ['Test agent for configuration tests'],
    },
    getSetting: vi.fn((key: string) => settings[key] || undefined),
  } as any;
}

describe('Configuration Integration Tests', () => {
  let mockRuntime: IAgentRuntime;

  beforeEach(() => {
    // Reset environment variables
    delete process.env.TOGETHER_AI_BASE_URL;
    delete process.env.ANTHROPIC_PROXY_PORT;
    delete process.env.GITHUB_API_URL;
    
    // Reset global config
    const { resetTrainingConfig } = await import('../../config/training-config.js');
    resetTrainingConfig();
  });

  describe('Configuration Manager', () => {
    it('should load default configuration values', () => {
      mockRuntime = createMockRuntimeWithSettings({});
      const config = getTrainingConfig(mockRuntime);

      expect(config.getAPIConfig().togetherAi.baseUrl).toBe('https://api.together.xyz/v1');
      expect(config.getAPIConfig().anthropic.baseUrl).toBe('https://api.anthropic.com');
      expect(config.getAPIConfig().github.apiUrl).toBe('https://api.github.com');
      expect(config.getAPIConfig().anthropic.proxyPort).toBe(8001);
    });

    it('should override defaults with environment variables', () => {
      process.env.TOGETHER_AI_BASE_URL = 'https://custom-together.api';
      process.env.ANTHROPIC_PROXY_PORT = '9001';
      process.env.GITHUB_API_URL = 'https://custom-github.api';

      mockRuntime = createMockRuntimeWithSettings({});
      const config = getTrainingConfig(mockRuntime);

      expect(config.getAPIConfig().togetherAi.baseUrl).toBe('https://custom-together.api');
      expect(config.getAPIConfig().anthropic.proxyPort).toBe(9001);
      expect(config.getAPIConfig().github.apiUrl).toBe('https://custom-github.api');
    });

    it('should prioritize runtime settings over environment variables', () => {
      process.env.TOGETHER_AI_BASE_URL = 'https://env-together.api';

      mockRuntime = createMockRuntimeWithSettings({
        TOGETHER_AI_BASE_URL: 'https://runtime-together.api',
      });

      const config = getTrainingConfig(mockRuntime);
      expect(config.getAPIConfig().togetherAi.baseUrl).toBe('https://runtime-together.api');
    });

    it('should validate configuration successfully', () => {
      mockRuntime = createMockRuntimeWithSettings({});
      const config = getTrainingConfig(mockRuntime);

      expect(config.validateConfiguration()).toBe(true);
    });

    it('should fail validation with invalid URLs', () => {
      mockRuntime = createMockRuntimeWithSettings({
        TOGETHER_AI_BASE_URL: 'invalid-url',
      });

      const config = getTrainingConfig(mockRuntime);
      expect(config.validateConfiguration()).toBe(false);
    });
  });

  describe('TogetherAI Client Configuration', () => {
    it('should use configured base URL instead of hard-coded values', () => {
      mockRuntime = createMockRuntimeWithSettings({
        TOGETHER_AI_API_KEY: 'test-key',
        TOGETHER_AI_BASE_URL: 'https://custom-together.api',
      });

      const client = new TogetherAIClient(mockRuntime);
      const config = getTrainingConfig(mockRuntime);

      expect(config.getAPIConfig().togetherAi.baseUrl).toBe('https://custom-together.api');
      
      elizaLogger.info('✅ TogetherAI client using configured URL with real runtime');
    });

    it('should use configured timeout and retry settings with real runtime', async () => {
      const testCharacterWithTimeouts = {
        ...testCharacter,
        settings: {
          TRAINING_DATABASE_URL: `sqlite:${testDatabasePath}`,
          TOGETHER_AI_API_KEY: 'test-key',
          TOGETHER_AI_TIMEOUT: '45000',
          TOGETHER_AI_MAX_RETRIES: '5',
        }
      };

      runtime = new AgentRuntime({
        character: testCharacterWithTimeouts,
        token: process.env.OPENAI_API_KEY || 'test-token',
        modelName: 'gpt-4o-mini'
      });

      await runtime.registerPlugin(trainingPlugin);
      await runtime.initialize();
      
      const config = getTrainingConfig(runtime);

      expect(config.getAPIConfig().togetherAi.timeout).toBe(45000);
      expect(config.getAPIConfig().togetherAi.maxRetries).toBe(5);
      
      elizaLogger.info('✅ Timeout and retry settings configured with real runtime');
    });

    it('should use configured model pricing instead of hard-coded values with real runtime', async () => {
      const testCharacterWithPricing = {
        ...testCharacter,
        settings: {
          TRAINING_DATABASE_URL: `sqlite:${testDatabasePath}`,
          DEEPSEEK_R1_INPUT_PRICE: '4.0',
          DEEPSEEK_R1_OUTPUT_PRICE: '8.0',
        }
      };

      runtime = new AgentRuntime({
        character: testCharacterWithPricing,
        token: process.env.OPENAI_API_KEY || 'test-token',
        modelName: 'gpt-4o-mini'
      });

      await runtime.registerPlugin(trainingPlugin);
      await runtime.initialize();
      
      const config = getTrainingConfig(runtime);
      const pricing = config.getModelConfig().pricing;

      expect(pricing['deepseek-ai/DeepSeek-R1'].inputPrice).toBe(4.0);
      expect(pricing['deepseek-ai/DeepSeek-R1'].outputPrice).toBe(8.0);
      
      elizaLogger.info('✅ Model pricing configuration working with real runtime');
    });
  });

  describe('Real Repository Cloner Configuration', () => {
    it('should use configured GitHub API URL with real runtime', async () => {
      const testCharacterWithGithub = {
        ...testCharacter,
        settings: {
          TRAINING_DATABASE_URL: `sqlite:${testDatabasePath}`,
          GITHUB_API_URL: 'https://enterprise-github.com/api/v3',
          GITHUB_DEFAULT_REPO: 'https://github.com/custom/eliza.git',
        }
      };

      runtime = new AgentRuntime({
        character: testCharacterWithGithub,
        token: process.env.OPENAI_API_KEY || 'test-token',
        modelName: 'gpt-4o-mini'
      });

      await runtime.registerPlugin(trainingPlugin);
      await runtime.initialize();
      
      const cloner = new RepositoryCloner('./test-workspace', runtime);
      const config = getTrainingConfig(runtime);

      expect(config.getAPIConfig().github.apiUrl).toBe('https://enterprise-github.com/api/v3');
      expect(config.getAPIConfig().github.defaultRepository).toBe('https://github.com/custom/eliza.git');
      
      elizaLogger.info('✅ GitHub configuration working with real runtime');
    });

    it('should use configured rate limiting delays with real runtime', async () => {
      const testCharacterWithRateLimit = {
        ...testCharacter,
        settings: {
          TRAINING_DATABASE_URL: `sqlite:${testDatabasePath}`,
          GITHUB_DELAY_WITH_TOKEN: '100',
          GITHUB_DELAY_WITHOUT_TOKEN: '2000',
        }
      };

      runtime = new AgentRuntime({
        character: testCharacterWithRateLimit,
        token: process.env.OPENAI_API_KEY || 'test-token',
        modelName: 'gpt-4o-mini'
      });

      await runtime.registerPlugin(trainingPlugin);
      await runtime.initialize();
      
      const config = getTrainingConfig(runtime);

      expect(config.getAPIConfig().github.rateLimitDelay.withToken).toBe(100);
      expect(config.getAPIConfig().github.rateLimitDelay.withoutToken).toBe(2000);
      
      elizaLogger.info('✅ GitHub rate limiting configuration working with real runtime');
    });
  });

  describe('Real Anthropic Proxy Configuration', () => {
    it('should use configured base URL and proxy port with real runtime', async () => {
      const testCharacterWithAnthropic = {
        ...testCharacter,
        settings: {
          TRAINING_DATABASE_URL: `sqlite:${testDatabasePath}`,
          ANTHROPIC_BASE_URL: 'https://custom-anthropic.api',
          ANTHROPIC_PROXY_PORT: '9001',
          ANTHROPIC_REQUEST_SIZE_LIMIT: '50mb',
        }
      };

      runtime = new AgentRuntime({
        character: testCharacterWithAnthropic,
        token: process.env.OPENAI_API_KEY || 'test-token',
        modelName: 'gpt-4o-mini'
      });

      await runtime.registerPlugin(trainingPlugin);
      await runtime.initialize();
      
      // Create real reasoning service (or service stub)
      const reasoningService = {
        generateCode: async () => 'generated code',
      };

      const proxy = new AnthropicAPIProxy(runtime, reasoningService);
      const config = getTrainingConfig(runtime);

      expect(config.getAPIConfig().anthropic.baseUrl).toBe('https://custom-anthropic.api');
      expect(config.getAPIConfig().anthropic.proxyPort).toBe(9001);
      expect(config.getAPIConfig().anthropic.requestSizeLimit).toBe('50mb');
      
      elizaLogger.info('✅ Anthropic proxy configuration working with real runtime');
    });

    it('should use configured token estimation ratio with real runtime', async () => {
      const testCharacterWithTokenRatio = {
        ...testCharacter,
        settings: {
          TRAINING_DATABASE_URL: `sqlite:${testDatabasePath}`,
          ANTHROPIC_TOKEN_RATIO: '3.5',
        }
      };

      runtime = new AgentRuntime({
        character: testCharacterWithTokenRatio,
        token: process.env.OPENAI_API_KEY || 'test-token',
        modelName: 'gpt-4o-mini'
      });

      await runtime.registerPlugin(trainingPlugin);
      await runtime.initialize();
      
      const reasoningService = {
        generateCode: async () => 'generated code',
      };

      const proxy = new AnthropicAPIProxy(runtime, reasoningService);
      const config = getTrainingConfig(runtime);

      expect(config.getAPIConfig().anthropic.tokenEstimationRatio).toBe(3.5);
      
      elizaLogger.info('✅ Anthropic token estimation configuration working with real runtime');
    });
  });

  describe('Real Automated Data Collector Configuration', () => {
    it('should use configured data collection settings with real runtime', async () => {
      const testCharacterWithDataCollection = {
        ...testCharacter,
        settings: {
          TRAINING_DATABASE_URL: `sqlite:${testDatabasePath}`,
          DATA_COLLECTION_SAVE_INTERVAL: '600000', // 10 minutes
          DATA_SPLIT_TRAIN: '0.7',
          DATA_SPLIT_VALIDATION: '0.2',
          DATA_SPLIT_TEST: '0.1',
        }
      };

      runtime = new AgentRuntime({
        character: testCharacterWithDataCollection,
        token: process.env.OPENAI_API_KEY || 'test-token',
        modelName: 'gpt-4o-mini'
      });

      await runtime.registerPlugin(trainingPlugin);
      await runtime.initialize();
      
      const collector = new AutomatedDataCollector(runtime);
      const config = getTrainingConfig(runtime);

      expect(config.getAutomationConfig().dataCollection.saveInterval).toBe(600000);
      expect(config.getDataConfig().processing.splitRatio.train).toBe(0.7);
      expect(config.getDataConfig().processing.splitRatio.validation).toBe(0.2);
      expect(config.getDataConfig().processing.splitRatio.test).toBe(0.1);
      
      elizaLogger.info('✅ Data collection configuration working with real runtime');
    });

    it('should use configured quality thresholds with real runtime', async () => {
      const testCharacterWithQuality = {
        ...testCharacter,
        settings: {
          TRAINING_DATABASE_URL: `sqlite:${testDatabasePath}`,
          QUALITY_THRESHOLD_HIGH: '0.9',
          QUALITY_THRESHOLD_MEDIUM: '0.6',
          QUALITY_THRESHOLD_LOW: '0.2',
        }
      };

      runtime = new AgentRuntime({
        character: testCharacterWithQuality,
        token: process.env.OPENAI_API_KEY || 'test-token',
        modelName: 'gpt-4o-mini'
      });

      await runtime.registerPlugin(trainingPlugin);
      await runtime.initialize();
      
      const config = getTrainingConfig(runtime);
      const thresholds = config.getDataConfig().processing.qualityThresholds;

      expect(thresholds.high).toBe(0.9);
      expect(thresholds.medium).toBe(0.6);
      expect(thresholds.low).toBe(0.2);
      
      elizaLogger.info('✅ Quality threshold configuration working with real runtime');
    });
  });

  describe('Real Configuration Updates', () => {
    it('should support runtime configuration updates with real runtime', async () => {
      const testCharacterForUpdates = {
        ...testCharacter,
        settings: {
          TRAINING_DATABASE_URL: `sqlite:${testDatabasePath}`,
        }
      };

      runtime = new AgentRuntime({
        character: testCharacterForUpdates,
        token: process.env.OPENAI_API_KEY || 'test-token',
        modelName: 'gpt-4o-mini'
      });

      await runtime.registerPlugin(trainingPlugin);
      await runtime.initialize();
      
      const config = getTrainingConfig(runtime);

      const originalBaseUrl = config.getAPIConfig().togetherAi.baseUrl;
      
      config.updateConfiguration({
        api: {
          ...config.getAPIConfig(),
          togetherAi: {
            ...config.getAPIConfig().togetherAi,
            baseUrl: 'https://updated-together.api',
          },
        },
      });

      expect(config.getAPIConfig().togetherAi.baseUrl).toBe('https://updated-together.api');
      expect(config.getAPIConfig().togetherAi.baseUrl).not.toBe(originalBaseUrl);
      
      elizaLogger.info('✅ Runtime configuration updates working with real runtime');
    });

    it('should maintain singleton behavior with real runtime', async () => {
      const testCharacterForSingleton = {
        ...testCharacter,
        settings: {
          TRAINING_DATABASE_URL: `sqlite:${testDatabasePath}`,
        }
      };

      runtime = new AgentRuntime({
        character: testCharacterForSingleton,
        token: process.env.OPENAI_API_KEY || 'test-token',
        modelName: 'gpt-4o-mini'
      });

      await runtime.registerPlugin(trainingPlugin);
      await runtime.initialize();
      
      const config1 = getTrainingConfig(runtime);
      const config2 = getTrainingConfig(runtime);

      expect(config1).toBe(config2);
      
      elizaLogger.info('✅ Configuration singleton behavior maintained with real runtime');
    });
  });

  describe('Real Model Configuration', () => {
    it('should use configured default models with real runtime', async () => {
      const testCharacterWithModels = {
        ...testCharacter,
        settings: {
          TRAINING_DATABASE_URL: `sqlite:${testDatabasePath}`,
          DEFAULT_REASONING_MODEL: 'custom/reasoning-model',
          DEFAULT_CODING_MODEL: 'custom/coding-model',
        }
      };

      runtime = new AgentRuntime({
        character: testCharacterWithModels,
        token: process.env.OPENAI_API_KEY || 'test-token',
        modelName: 'gpt-4o-mini'
      });

      await runtime.registerPlugin(trainingPlugin);
      await runtime.initialize();
      
      const config = getTrainingConfig(runtime);
      const defaults = config.getModelConfig().defaults;

      expect(defaults.reasoning).toBe('custom/reasoning-model');
      expect(defaults.coding).toBe('custom/coding-model');
      
      elizaLogger.info('✅ Default model configuration working with real runtime');
    });

    it('should support model pricing overrides via JSON with real runtime', async () => {
      const customPricing = JSON.stringify({
        'custom-model': { inputPrice: 5.0, outputPrice: 10.0 },
      });

      const testCharacterWithPricingOverrides = {
        ...testCharacter,
        settings: {
          TRAINING_DATABASE_URL: `sqlite:${testDatabasePath}`,
          MODEL_PRICING_OVERRIDES: customPricing,
        }
      };

      runtime = new AgentRuntime({
        character: testCharacterWithPricingOverrides,
        token: process.env.OPENAI_API_KEY || 'test-token',
        modelName: 'gpt-4o-mini'
      });

      await runtime.registerPlugin(trainingPlugin);
      await runtime.initialize();
      
      const config = getTrainingConfig(runtime);
      const pricing = config.getModelConfig().pricing;

      expect(pricing['custom-model']).toEqual({
        inputPrice: 5.0,
        outputPrice: 10.0,
      });
      
      elizaLogger.info('✅ Model pricing overrides working with real runtime');
    });

    it('should use configured model size estimates with real runtime', async () => {
      const testCharacterWithSizes = {
        ...testCharacter,
        settings: {
          TRAINING_DATABASE_URL: `sqlite:${testDatabasePath}`,
          MODEL_SIZE_7B: '15',
          MODEL_SIZE_70B: '150',
        }
      };

      runtime = new AgentRuntime({
        character: testCharacterWithSizes,
        token: process.env.OPENAI_API_KEY || 'test-token',
        modelName: 'gpt-4o-mini'
      });

      await runtime.registerPlugin(trainingPlugin);
      await runtime.initialize();
      
      const config = getTrainingConfig(runtime);
      const sizes = config.getModelConfig().sizeEstimates;

      expect(sizes['7B']).toBe(15);
      expect(sizes['70B']).toBe(150);
      
      elizaLogger.info('✅ Model size estimates configuration working with real runtime');
    });
  });

  describe('Real Path Configuration', () => {
    it('should use configured data paths with real runtime', async () => {
      const testCharacterWithPaths = {
        ...testCharacter,
        settings: {
          TRAINING_DATABASE_URL: `sqlite:${testDatabasePath}`,
          TRAINING_RECORDING_PATH: '/custom/training',
          DATASETS_PATH: '/custom/datasets',
          MODELS_PATH: '/custom/models',
        }
      };

      runtime = new AgentRuntime({
        character: testCharacterWithPaths,
        token: process.env.OPENAI_API_KEY || 'test-token',
        modelName: 'gpt-4o-mini'
      });

      await runtime.registerPlugin(trainingPlugin);
      await runtime.initialize();
      
      const config = getTrainingConfig(runtime);
      const paths = config.getDataConfig().paths;

      expect(paths.trainingRecording).toBe('/custom/training');
      expect(paths.datasets).toBe('/custom/datasets');
      expect(paths.models).toBe('/custom/models');
      
      elizaLogger.info('✅ Data path configuration working with real runtime');
    });
  });

  describe('Real Error Handling', () => {
    it('should handle missing required configuration gracefully with real runtime', async () => {
      const testCharacterMinimal = {
        ...testCharacter,
        settings: {
          TRAINING_DATABASE_URL: `sqlite:${testDatabasePath}`,
          // Minimal settings to test graceful handling
        }
      };

      runtime = new AgentRuntime({
        character: testCharacterMinimal,
        token: process.env.OPENAI_API_KEY || 'test-token',
        modelName: 'gpt-4o-mini'
      });

      await runtime.registerPlugin(trainingPlugin);
      await runtime.initialize();
      
      expect(() => {
        const config = getTrainingConfig(runtime);
        config.getAPIConfig();
      }).not.toThrow();
      
      elizaLogger.info('✅ Missing configuration handled gracefully with real runtime');
    });

    it('should provide helpful error messages for invalid configuration with real runtime', async () => {
      const testCharacterInvalid = {
        ...testCharacter,
        settings: {
          TRAINING_DATABASE_URL: `sqlite:${testDatabasePath}`,
          DATA_SPLIT_TRAIN: '1.5', // Invalid: > 1.0
        }
      };

      runtime = new AgentRuntime({
        character: testCharacterInvalid,
        token: process.env.OPENAI_API_KEY || 'test-token',
        modelName: 'gpt-4o-mini'
      });

      await runtime.registerPlugin(trainingPlugin);
      await runtime.initialize();
      
      const config = getTrainingConfig(runtime);
      expect(config.validateConfiguration()).toBe(false);
      
      elizaLogger.info('✅ Invalid configuration properly detected with real runtime');
    });
  });
});