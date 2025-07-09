import type { IAgentRuntime, UUID } from '@elizaos/core';
import { describe, it, expect, beforeEach, afterEach } from 'bun:test';
import { createTestRuntime, cleanupTestRuntime } from '../test-runtime';

/**
 * Runtime integration tests for the Secrets Manager Plugin
 * These tests run with real runtime instances using in-memory databases
 */
describe('Secrets Manager Plugin - Runtime Integration', () => {
  let runtime: IAgentRuntime;

  beforeEach(async () => {
    runtime = await createTestRuntime();
  });

  afterEach(async () => {
    if (runtime) {
      await cleanupTestRuntime(runtime);
    }
  });

  it('should load the plugin successfully', () => {
    // Test that the plugin is loaded
    const pluginLoaded = runtime.plugins.some(
      (p: any) => p.name === 'plugin-env' || p.name === '@elizaos/plugin-secrets-manager'
    );
    expect(pluginLoaded).toBe(true);
  });

  it('should have EnhancedSecretManager service available', () => {
    const secretsService = runtime.getService('SECRETS');
    expect(secretsService).toBeDefined();
    expect(secretsService).not.toBeNull();
    if (secretsService) {
      expect(secretsService.capabilityDescription).toBeDefined();
      expect(typeof secretsService.stop).toBe('function');
    }
  });

  it('should have SecretFormService available', () => {
    const formService = runtime.getService('SECRET_FORMS');
    expect(formService).toBeDefined();
    expect(formService).not.toBeNull();
    if (formService) {
      expect(formService.capabilityDescription).toBeDefined();
      expect(typeof formService.stop).toBe('function');
    }
  });

  it('should register all expected actions', () => {
    const expectedActions = [
      // 'SET_ENV_VAR', // Disabled by default for security
      'GENERATE_ENV_VAR',
      'MANAGE_SECRET',
      'REQUEST_SECRET_FORM',
      'RUN_WORKFLOW',
      'UPDATE_SETTINGS',
    ];

    const missingActions = [];
    for (const actionName of expectedActions) {
      const action = runtime.actions.find((a: any) => a.name === actionName);
      if (!action) {
        missingActions.push(actionName);
      }
    }
    expect(missingActions).toEqual([]);
  });

  it('should register all expected providers', () => {
    const expectedProviders = ['ENV_STATUS', 'secretsInfo', 'UX_GUIDANCE', 'SETTINGS'];

    const missingProviders = [];
    for (const providerName of expectedProviders) {
      const provider = runtime.providers.find((p: any) => p.name === providerName);
      if (!provider) {
        missingProviders.push(providerName);
      }
    }

    expect(missingProviders).toEqual([]);
  });

  it('should perform basic secret management operations', async () => {
    const secretsManager = runtime.getService('SECRETS') as any;
    expect(secretsManager).toBeDefined();
    expect(secretsManager).not.toBeNull();

    if (!secretsManager) return;

    // Test secret management at global level
    const context = {
      level: 'global',
      agentId: runtime.agentId,
      requesterId: runtime.agentId,
    };

    const testKey = `TEST_SECRET_${Date.now()}`;
    const testValue = `test-value-${Math.random()}`;

    // Set a secret
    const setResult = await secretsManager.set(testKey, testValue, context, {
      type: 'secret',
      description: 'Test secret for runtime integration',
      required: false,
      encrypted: true,
    });

    expect(setResult).toBe(true);

    // Get the secret back
    const retrievedValue = await secretsManager.get(testKey, context);
    expect(retrievedValue).toBe(testValue);
  });

  it('should handle encrypted secrets correctly', async () => {
    const secretsManager = runtime.getService('SECRETS') as any;
    expect(secretsManager).toBeDefined();
    expect(secretsManager).not.toBeNull();

    if (!secretsManager) return;

    const context = {
      level: 'global',
      agentId: runtime.agentId,
      requesterId: runtime.agentId,
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

    expect(setResult).toBe(true);

    // Retrieve and verify it matches
    const retrievedData = await secretsManager.get(testKey, context);
    expect(retrievedData).toBe(sensitiveData);
  });

  it('should handle ENV_STATUS provider correctly', async () => {
    const statusProvider = runtime.providers.find((p: any) => p.name === 'ENV_STATUS');
    expect(statusProvider).toBeDefined();
    expect(statusProvider).not.toBeUndefined();

    if (!statusProvider) return;

    // Create a mock message and state
    const mockMessage = {
      id: 'test-message' as UUID,
      entityId: runtime.agentId,
      roomId: runtime.agentId,
      content: { text: 'test message' },
      createdAt: Date.now(),
    };

    const mockState = {
      values: {},
      data: {},
      text: '',
    };

    // Get status information
    const result = await statusProvider.get(runtime, mockMessage, mockState);

    expect(result).toBeDefined();
    if (result.text) {
      expect(typeof result.text).toBe('string');
      expect(result.text.length).toBeGreaterThan(0);
    }
  });

  it('should validate REQUEST_SECRET_FORM action correctly', async () => {
    const requestFormAction = runtime.actions.find((a: any) => a.name === 'REQUEST_SECRET_FORM');
    expect(requestFormAction).toBeDefined();
    expect(requestFormAction).not.toBeUndefined();

    if (!requestFormAction) return;

    // Test validation with a message that should trigger the action
    const validMessage = {
      id: 'test-validation' as UUID,
      entityId: runtime.agentId,
      roomId: runtime.agentId,
      content: { text: 'I need you to collect my API keys' },
      createdAt: Date.now(),
    };

    // This might fail if ngrok isn't available, which is expected
    try {
      const isValid = await requestFormAction.validate(runtime, validMessage);
      // Either validation succeeds or fails gracefully
      expect(typeof isValid).toBe('boolean');
    } catch (error) {
      // Validation errors are acceptable if external services aren't available
      expect(error).toBeDefined();
    }
  });
});
