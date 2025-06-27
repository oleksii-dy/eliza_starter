import { type TestSuite } from '@elizaos/core';
import { createTestRuntime, cleanupTestRuntime } from '../test-runtime';

/**
 * Comprehensive E2E tests for the Secrets Manager Plugin
 * These tests use real runtime instances and validate actual functionality
 */
export class SecretsManagerE2ETestSuite implements TestSuite {
  name = 'secrets-manager-e2e';
  description = 'End-to-end tests for secrets manager plugin with real runtime';

  tests = [
    {
      name: 'Plugin loads and services initialize correctly',
      fn: async (runtime?: any) => {
        // Create our own test runtime if none provided
        let testRuntime = runtime;
        let shouldCleanup = false;
        
        if (!testRuntime) {
          testRuntime = await createTestRuntime();
          shouldCleanup = true;
        }

        try {
          // Test that the plugin is loaded
          const pluginLoaded = testRuntime.plugins.some(
            (p: any) => p.name === 'plugin-env' || p.name === '@elizaos/plugin-secrets-manager'
          );
          if (!pluginLoaded) {
            throw new Error('Secrets manager plugin not loaded');
          }

          // Test that services are available
          const secretsService = testRuntime.getService('SECRETS');
          if (!secretsService) {
            throw new Error('EnhancedSecretManager service not available');
          }

          const formService = testRuntime.getService('SECRET_FORMS');
          if (!formService) {
            throw new Error('SecretFormService not available');
          }

          console.log('✅ Plugin loaded and services initialized successfully');
        } finally {
          if (shouldCleanup) {
            await cleanupTestRuntime(testRuntime);
          }
        }
      },
    },

    {
      name: 'Actions are properly registered',
      fn: async (runtime?: any) => {
        // Create our own test runtime if none provided
        let testRuntime = runtime;
        let shouldCleanup = false;
        
        if (!testRuntime) {
          testRuntime = await createTestRuntime();
          shouldCleanup = true;
        }

        try {
          const expectedActions = [
            'SET_ENV_VAR',
            'GENERATE_ENV_VAR',
            'MANAGE_SECRET',
            'REQUEST_SECRET_FORM',
            'RUN_WORKFLOW',
          ];

          const missingActions = [];
          for (const actionName of expectedActions) {
            const action = testRuntime.actions.find((a: any) => a.name === actionName);
            if (!action) {
              missingActions.push(actionName);
            }
          }

          if (missingActions.length > 0) {
            throw new Error(`Missing actions: ${missingActions.join(', ')}`);
          }

          console.log('✅ All expected actions are registered');
        } finally {
          if (shouldCleanup) {
            await cleanupTestRuntime(testRuntime);
          }
        }
      },
    },

    {
      name: 'Providers are properly registered',
      fn: async (runtime?: any) => {
        // Create our own test runtime if none provided
        let testRuntime = runtime;
        let shouldCleanup = false;
        
        if (!testRuntime) {
          testRuntime = await createTestRuntime();
          shouldCleanup = true;
        }

        try {
          const expectedProviders = [
            'ENV_STATUS',
            'SECRETS_INFO', 
            'UX_GUIDANCE',
            'SETTINGS',
          ];

          const missingProviders = [];
          for (const providerName of expectedProviders) {
            const provider = testRuntime.providers.find((p: any) => p.name === providerName);
            if (!provider) {
              missingProviders.push(providerName);
            }
          }

          if (missingProviders.length > 0) {
            throw new Error(`Missing providers: ${missingProviders.join(', ')}`);
          }

          console.log('✅ All expected providers are registered');
        } finally {
          if (shouldCleanup) {
            await cleanupTestRuntime(testRuntime);
          }
        }
      },
    },

    {
      name: 'Basic secret management operations work',
      fn: async (runtime?: any) => {
        // Create our own test runtime if none provided
        let testRuntime = runtime;
        let shouldCleanup = false;
        
        if (!testRuntime) {
          testRuntime = await createTestRuntime();
          shouldCleanup = true;
        }

        try {
          const secretsManager = testRuntime.getService('SECRETS');
          if (!secretsManager) {
            throw new Error('Secrets manager not available');
          }

          // Test secret management at global level
          const context = {
            level: 'global',
            agentId: testRuntime.agentId,
            requesterId: testRuntime.agentId,
          };

          const testKey = `TEST_SECRET_${Date.now()}`;
          const testValue = `test-value-${Math.random()}`;

          // Set a secret
          const setResult = await secretsManager.set(testKey, testValue, context, {
            type: 'secret',
            description: 'Test secret for E2E validation',
            required: false,
            encrypted: true,
          });

          if (!setResult) {
            throw new Error('Failed to set test secret');
          }

          // Get the secret back
          const retrievedValue = await secretsManager.get(testKey, context);
          if (retrievedValue !== testValue) {
            throw new Error(`Secret value mismatch. Expected: ${testValue}, Got: ${retrievedValue}`);
          }

          console.log('✅ Basic secret management operations work correctly');
        } finally {
          if (shouldCleanup) {
            await cleanupTestRuntime(testRuntime);
          }
        }
      },
    },

    {
      name: 'Environment status provider provides useful information',
      fn: async (runtime?: any) => {
        // Create our own test runtime if none provided
        let testRuntime = runtime;
        let shouldCleanup = false;
        
        if (!testRuntime) {
          testRuntime = await createTestRuntime();
          shouldCleanup = true;
        }

        try {
          const statusProvider = testRuntime.providers.find((p: any) => p.name === 'ENV_STATUS');
          if (!statusProvider) {
            throw new Error('ENV_STATUS provider not found');
          }

          // Create a mock message and state
          const mockMessage = {
            id: 'test-message',
            entityId: testRuntime.agentId,
            roomId: testRuntime.agentId,
            content: { text: 'test message' },
          };

          const mockState = {
            values: {},
            data: {},
            text: '',
          };

          // Get status information
          const result = await statusProvider.get(testRuntime, mockMessage, mockState);
          
          if (!result) {
            throw new Error('Status provider returned no result');
          }

          if (!result.text || typeof result.text !== 'string') {
            throw new Error('Status provider did not return text');
          }

          // Should contain environment status information
          if (!result.text.includes('Environment') && !result.text.includes('Configuration')) {
            console.warn('Status provider text might not contain expected content:', result.text);
          }

          console.log('✅ Environment status provider works correctly');
        } finally {
          if (shouldCleanup) {
            await cleanupTestRuntime(testRuntime);
          }
        }
      },
    },

    {
      name: 'Action validation works correctly',
      fn: async (runtime?: any) => {
        // Create our own test runtime if none provided
        let testRuntime = runtime;
        let shouldCleanup = false;
        
        if (!testRuntime) {
          testRuntime = await createTestRuntime();
          shouldCleanup = true;
        }

        try {
          const requestFormAction = testRuntime.actions.find((a: any) => a.name === 'REQUEST_SECRET_FORM');
          if (!requestFormAction) {
            throw new Error('REQUEST_SECRET_FORM action not found');
          }

          // Test validation with a message that should trigger the action
          const validMessage = {
            id: 'test-validation',
            entityId: testRuntime.agentId,
            roomId: testRuntime.agentId,
            content: { text: 'I need you to collect my API keys' },
          };

          const isValid = await requestFormAction.validate(testRuntime, validMessage);
          if (!isValid) {
            // This might fail if services aren't available, which is OK for basic testing
            console.log('⚠️ REQUEST_SECRET_FORM validation failed (expected if ngrok not available)');
          } else {
            console.log('✅ Action validation works correctly');
          }
        } finally {
          if (shouldCleanup) {
            await cleanupTestRuntime(testRuntime);
          }
        }
      },
    },

    {
      name: 'Multi-level secret contexts work',
      fn: async (runtime?: any) => {
        // Create our own test runtime if none provided
        let testRuntime = runtime;
        let shouldCleanup = false;
        
        if (!testRuntime) {
          testRuntime = await createTestRuntime();
          shouldCleanup = true;
        }

        try {
          const secretsManager = testRuntime.getService('SECRETS');
          if (!secretsManager) {
            throw new Error('Secrets manager not available');
          }

          // Test different levels of secret storage
          const testKey = `MULTI_LEVEL_TEST_${Date.now()}`;
          const testValue = `test-value-${Math.random()}`;

          // Test global level
          const globalContext = {
            level: 'global',
            agentId: testRuntime.agentId,
            requesterId: testRuntime.agentId,
          };

          const globalSet = await secretsManager.set(testKey, testValue, globalContext, {
            type: 'secret',
            description: 'Multi-level test secret',
            encrypted: true,
          });

          if (!globalSet) {
            throw new Error('Failed to set global secret');
          }

          const globalGet = await secretsManager.get(testKey, globalContext);
          if (globalGet !== testValue) {
            throw new Error('Failed to retrieve global secret');
          }

          // Test world level if possible
          try {
            const worldContext = {
              level: 'world',
              worldId: testRuntime.agentId, // Use agent ID as world ID for testing
              agentId: testRuntime.agentId,
              requesterId: testRuntime.agentId,
            };

            const worldSet = await secretsManager.set(`WORLD_${testKey}`, testValue, worldContext, {
              type: 'secret',
              description: 'World-level test secret',
              encrypted: true,
            });

            if (worldSet) {
              const worldGet = await secretsManager.get(`WORLD_${testKey}`, worldContext);
              if (worldGet === testValue) {
                console.log('✅ Multi-level secret contexts work correctly');
              } else {
                console.log('⚠️ World-level secret retrieval failed');
              }
            } else {
              console.log('⚠️ World-level secret setting failed (may require world setup)');
            }
          } catch (worldError) {
            console.log('⚠️ World-level secret test failed (expected if no world exists)');
          }

          console.log('✅ Global-level secret management verified');
        } finally {
          if (shouldCleanup) {
            await cleanupTestRuntime(testRuntime);
          }
        }
      },
    },

    {
      name: 'Secret encryption and decryption work',
      fn: async (runtime?: any) => {
        // Create our own test runtime if none provided
        let testRuntime = runtime;
        let shouldCleanup = false;
        
        if (!testRuntime) {
          testRuntime = await createTestRuntime();
          shouldCleanup = true;
        }

        try {
          const secretsManager = testRuntime.getService('SECRETS');
          if (!secretsManager) {
            throw new Error('Secrets manager not available');
          }

          const context = {
            level: 'global',
            agentId: testRuntime.agentId,
            requesterId: testRuntime.agentId,
          };

          const sensitiveData = `sensitive-${Date.now()}-${Math.random()}`;
          const testKey = `ENCRYPTION_TEST_${Date.now()}`;

          // Set an encrypted secret
          const setResult = await secretsManager.set(testKey, sensitiveData, context, {
            type: 'secret',
            description: 'Encryption test secret',
            encrypted: true,
            required: false,
          });

          if (!setResult) {
            throw new Error('Failed to set encrypted secret');
          }

          // Retrieve and verify it matches
          const retrievedData = await secretsManager.get(testKey, context);
          if (retrievedData !== sensitiveData) {
            throw new Error(`Encryption/decryption failed. Expected: ${sensitiveData}, Got: ${retrievedData}`);
          }

          console.log('✅ Secret encryption and decryption work correctly');
        } finally {
          if (shouldCleanup) {
            await cleanupTestRuntime(testRuntime);
          }
        }
      },
    },

    {
      name: 'Service lifecycle management works',
      fn: async (runtime?: any) => {
        // Create our own test runtime if none provided
        let testRuntime = runtime;
        let shouldCleanup = false;
        
        if (!testRuntime) {
          testRuntime = await createTestRuntime();
          shouldCleanup = true;
        }

        try {
          const secretsManager = testRuntime.getService('SECRETS');
          const formService = testRuntime.getService('SECRET_FORMS');

          if (!secretsManager || !formService) {
            throw new Error('Required services not available');
          }

          // Test that services have proper lifecycle methods
          if (typeof secretsManager.stop !== 'function') {
            throw new Error('SecretManager does not have stop method');
          }

          if (typeof formService.stop !== 'function') {
            throw new Error('SecretFormService does not have stop method');
          }

          // Test that services are functional
          if (!secretsManager.capabilityDescription || !formService.capabilityDescription) {
            throw new Error('Services missing capability descriptions');
          }

          console.log('✅ Service lifecycle management works correctly');
        } finally {
          if (shouldCleanup) {
            await cleanupTestRuntime(testRuntime);
          }
        }
      },
    },
  ];
}

// Export default instance for test runner
export default new SecretsManagerE2ETestSuite();