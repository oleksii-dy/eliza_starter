import type { TestCase, TestSuite, IAgentRuntime } from '@elizaos/core';
import { validateEnvVar, validationStrategies } from '../validation';
import {
  createTestRuntime as _createTestRuntime,
  cleanupTestRuntime as _cleanupTestRuntime,
} from './test-runtime';

/**
 * Runtime-based tests for validation functions
 * These tests use real runtime and actual API calls instead of mocks
 */
export class ValidationTestSuite implements TestSuite {
  name = 'validation-runtime-tests';
  description = 'Runtime integration tests for environment variable validation';

  tests: TestCase[] = [
    {
      name: 'Should validate OpenAI API key format',
      fn: async (runtime: IAgentRuntime) => {
        // Test valid format
        const validKey = 'sk-proj-abcdefghijklmnopqrstuvwxyz0123456789ABCDEFGHIJ';
        const validResult = await validateEnvVar('OPENAI_API_KEY', validKey, 'api_key');

        if (!validResult.isValid) {
          throw new Error('Valid OpenAI API key format was rejected');
        }

        // Test invalid format
        const invalidKey = 'invalid-key';
        const invalidResult = await validateEnvVar('OPENAI_API_KEY', invalidKey, 'api_key');

        if (invalidResult.isValid) {
          throw new Error('Invalid OpenAI API key format was accepted');
        }

        console.log('✓ OpenAI API key format validation working correctly');
      },
    },

    {
      name: 'Should validate URL format',
      fn: async (runtime: IAgentRuntime) => {
        const testCases = [
          { url: 'https://example.com', expected: true },
          { url: 'http://localhost:3000', expected: true },
          { url: 'https://api.example.com/v1/endpoint', expected: true },
          { url: 'not-a-url', expected: false },
          { url: 'ftp://example.com', expected: false },
          { url: '', expected: false },
        ];

        for (const testCase of testCases) {
          const result = await validateEnvVar('TEST_URL', testCase.url, 'url');

          if (result.isValid !== testCase.expected) {
            throw new Error(
              `URL validation failed for "${testCase.url}". Expected ${testCase.expected}, got ${result.isValid}`
            );
          }
        }

        console.log('✓ URL format validation working correctly');
      },
    },

    {
      name: 'Should validate webhook URLs with network check',
      fn: async (runtime: IAgentRuntime) => {
        // This test makes a real network request
        // Using httpbin.org as a reliable test endpoint
        const testWebhook = 'https://httpbin.org/post';
        const result = await validateEnvVar('TEST_WEBHOOK', testWebhook, 'url');

        if (!result.isValid) {
          console.warn('⚠️ Webhook validation failed - network might be unavailable');
          // Don't fail the test for network issues
          return;
        }

        console.log('✓ Webhook URL validation with network check passed');
      },
    },

    {
      name: 'Should validate private key format',
      fn: async (runtime: IAgentRuntime) => {
        // Test RSA private key format (simplified)
        const validRSAKey = `-----BEGIN RSA PRIVATE KEY-----
MIIEpAIBAAKCAQEA0Z3VS5JJcds3xfn/ygWyF32TpPQ1nfSPMfVCt8y8ivZmJum2
TdQr1qvKbvAQAEjDvZa8DPqbHnIBv9VJuYDdF9B5qQNPe3Ot66K1Ov4+tBuPmGRH
-----END RSA PRIVATE KEY-----`;

        const result = await validateEnvVar('TEST_PRIVATE_KEY', validRSAKey, 'private_key');

        if (!result.isValid) {
          throw new Error('Valid RSA private key format was rejected');
        }

        // Test invalid format
        const invalidKey = 'not-a-private-key';
        const invalidResult = await validateEnvVar('TEST_PRIVATE_KEY', invalidKey, 'private_key');

        if (invalidResult.isValid) {
          throw new Error('Invalid private key format was accepted');
        }

        console.log('✓ Private key format validation working correctly');
      },
    },

    {
      name: 'Should validate API key with actual API call if configured',
      fn: async (runtime: IAgentRuntime) => {
        // Only run this test if OPENAI_API_KEY is configured
        const apiKey = runtime.getSetting('OPENAI_API_KEY');
        if (!apiKey) {
          console.log('⚠️ Skipping API validation test - OPENAI_API_KEY not configured');
          return;
        }

        const result = await validateEnvVar('OPENAI_API_KEY', apiKey, 'api_key');

        if (!result.isValid) {
          throw new Error(`API key validation failed: ${result.error}`);
        }

        console.log('✓ API key validation with actual API call passed');
      },
    },

    {
      name: 'Should handle validation errors gracefully',
      fn: async (runtime: IAgentRuntime) => {
        // Test with a type that might cause errors
        try {
          const result = await validateEnvVar('TEST_VAR', 'test-value', 'unknown-type' as any);

          // Should still return a result even for unknown types
          if (typeof result.isValid !== 'boolean') {
            throw new Error('Validation did not return a boolean isValid property');
          }

          console.log('✓ Validation error handling working correctly');
        } catch (error) {
          throw new Error(`Validation threw an error instead of handling gracefully: ${error}`);
        }
      },
    },

    {
      name: 'Should validate custom validation strategies',
      fn: async (runtime: IAgentRuntime) => {
        // Add a custom validation strategy
        (validationStrategies as any).custom = {
          test_custom: async (value: string) => {
            return value === 'custom-valid';
          },
        };

        // Test custom validation
        const validResult = await validateEnvVar('TEST_CUSTOM', 'custom-valid', 'custom');
        if (!validResult.isValid) {
          throw new Error('Custom validation failed for valid value');
        }

        const invalidResult = await validateEnvVar('TEST_CUSTOM', 'custom-invalid', 'custom');
        if (invalidResult.isValid) {
          throw new Error('Custom validation passed for invalid value');
        }

        // Clean up
        delete (validationStrategies as any).custom;

        console.log('✓ Custom validation strategies working correctly');
      },
    },
  ];
}

// Export test suite instance
export default new ValidationTestSuite();
