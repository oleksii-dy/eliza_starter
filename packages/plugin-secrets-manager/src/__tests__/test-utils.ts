import type { IAgentRuntime } from '@elizaos/core';
import { createMockRuntime as createCoreMockRuntime } from '@elizaos/core/test-utils';

export function createMockRuntime(overrides: Partial<IAgentRuntime> = {}): IAgentRuntime {
  // Use the unified mock runtime from core with plugin-specific overrides
  return createCoreMockRuntime({
    // Plugin-specific settings for secrets manager
    getSetting: (key: string) => {
      const defaultSettings: Record<string, any> = {
        ENCRYPTION_SALT: 'test-salt-12345',
        NGROK_AUTH_TOKEN: 'test-ngrok-token',
        ENCRYPTION_KEY: 'test-encryption-key-32-characters-long',
      };
      return defaultSettings[key] || null;
    },
    character: {
      id: 'agent-123',
      name: 'Test Agent',
      bio: 'Test agent for secrets manager',
      settings: {
        secrets: {},
      },
    },

    // Secrets manager-specific services
    getService: (name: string) => {
      const services: Record<string, any> = {
        SECRET_FORMS: {
          createSecretForm: async () => ({
            url: 'https://test.ngrok.io/form/123',
            sessionId: 'session-123',
          }),
          initialize: async () => undefined,
        },
        SECRETS: {
          get: async () => 'test-secret-value',
          set: async () => true,
          delete: async () => true,
          encrypt: (value: string) => `encrypted_${value}`,
          decrypt: (value: string) => value.replace('encrypted_', ''),
        },
        ENV_MANAGER: {
          get: async () => 'test-env-value',
          set: async () => true,
          getEnvironmentVariables: async () => ({}),
          setEnvironmentVariable: async () => true,
        },
        tunnel: {
          startTunnel: async () => ({ url: 'https://test.ngrok.io', port: 3000 }),
          stopTunnel: async () => true,
          getStatus: () => ({ active: true, url: 'https://test.ngrok.io' }),
        },
        ...(overrides as any)?.services,
      };
      return services[name];
    },

    ...overrides,
  }) as any;
}
