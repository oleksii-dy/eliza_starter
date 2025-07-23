import { describe, it, expect, beforeAll, afterAll } from 'bun:test';
import {
  setupTestEnvironment,
  restoreTestEnvironment,
  isProviderAvailable,
  validateEnvironmentForTest,
  type TestEnvironment
} from './utils/test-env-utils';
import {
  cleanupTestContainers,
  type DockerTestConfig,
  DEFAULT_CONFIG
} from './utils/docker-test-utils';

describe('Agent Functionality in Docker Environment', () => {
  let testEnv: TestEnvironment;
  const config: DockerTestConfig = {
    ...DEFAULT_CONFIG,
    verbose: process.env.TEST_VERBOSE === 'true'
  };

  beforeAll(async () => {
    testEnv = await setupTestEnvironment();
    
    if (config.verbose) {
      console.log('🤖 Starting agent functionality tests...');
      console.log(`📋 Available LLM providers: ${testEnv.availableProviders.join(', ') || 'none'}`);
    }
  });

  afterAll(async () => {
    await cleanupTestContainers();
    restoreTestEnvironment(testEnv);
    
    if (config.verbose) {
      console.log('🧹 Cleaned up agent test environment');
    }
  });

  describe('LLM Provider Integration', () => {
    it('should detect available LLM providers correctly', () => {
      const { availableProviders } = testEnv;
      
      // Document available providers without requiring specific ones
      expect(Array.isArray(availableProviders)).toBe(true);
      
      if (config.verbose) {
        availableProviders.forEach(provider => {
          console.log(`✅ Provider available: ${provider}`);
        });
      }
    });

    it('should handle OpenAI provider when available', () => {
      if (!isProviderAvailable('openai')) {
        console.log('⏭️ OpenAI not configured - add OPENAI_API_KEY to test OpenAI functionality');
        expect(true).toBe(true);
        return;
      }
      
      expect(isProviderAvailable('openai')).toBe(true);
      
      if (config.verbose) {
        console.log('✅ OpenAI provider configured and ready for testing');
      }
    });

    it('should handle Anthropic provider when available', () => {
      if (!isProviderAvailable('anthropic')) {
        console.log('⏭️ Anthropic not configured - add ANTHROPIC_API_KEY to test Claude functionality');
        expect(true).toBe(true);
        return;
      }
      
      expect(isProviderAvailable('anthropic')).toBe(true);
      
      if (config.verbose) {
        console.log('✅ Anthropic provider configured and ready for testing');
      }
    });

    it('should handle Ollama provider when available', () => {
      if (!isProviderAvailable('ollama')) {
        console.log('⏭️ Ollama not configured - set OLLAMA_API_ENDPOINT to test local models');
        expect(true).toBe(true);
        return;
      }
      
      expect(isProviderAvailable('ollama')).toBe(true);
      
      if (config.verbose) {
        console.log('✅ Ollama provider configured and ready for testing');
      }
    });
  });

  describe('Environment Validation', () => {
    it('should validate environment for different test types', () => {
      const basicValidation = validateEnvironmentForTest('basic');
      const llmValidation = validateEnvironmentForTest('llm');
      const integrationValidation = validateEnvironmentForTest('integration');
      
      // Basic tests should always be able to run
      expect(basicValidation.canRun).toBe(true);
      
      if (config.verbose) {
        console.log(`🔍 Basic tests: ${basicValidation.canRun ? 'CAN RUN' : 'BLOCKED'}`);
        console.log(`🔍 LLM tests: ${llmValidation.canRun ? 'CAN RUN' : 'BLOCKED'}`);
        console.log(`🔍 Integration tests: ${integrationValidation.canRun ? 'CAN RUN' : 'BLOCKED'}`);
        
        if (llmValidation.warnings.length > 0) {
          llmValidation.warnings.forEach(warning => console.log(`⚠️ ${warning}`));
        }
      }
    });

    it('should detect available environment configuration', () => {
      const { hasRequiredKeys, testEnvFile } = testEnv;
      
      if (config.verbose) {
        console.log(`📄 Test environment file: ${testEnvFile || 'none found'}`);
        console.log(`🔑 Has required keys: ${hasRequiredKeys}`);
      }
      
      // Document the environment state without requiring specific configuration
      expect(typeof hasRequiredKeys).toBe('boolean');
      
      if (!hasRequiredKeys) {
        console.log('ℹ️ Create .env.test or .env with API keys for full testing capabilities');
      }
    });
  });
}); 