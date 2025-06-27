// Test utilities for plugin-autocoder
import type { IAgentRuntime } from '@elizaos/core';
import { createMockRuntime as createCoreMockRuntime } from '@elizaos/core/test-utils';
import { mock } from 'bun:test';

/**
 * Creates a mock runtime for plugin-autocoder tests
 */
export function createMockRuntime(overrides: Partial<IAgentRuntime> = {}): IAgentRuntime {
  // Use the unified mock runtime from core with autocoder-specific overrides
  return createCoreMockRuntime({
    // Autocoder-specific settings - use a mock function that can be modified in tests
    getSetting: mock((key: string) => {
      const defaultSettings: Record<string, any> = {
        DOCKER_HOST: 'unix:///var/run/docker.sock',
        COMMUNICATION_BRIDGE_PORT: '9000',
        MCP_SERVER_TIMEOUT: '30000',
        N8N_WEBHOOK_URL: 'http://localhost:5678/webhook',
        N8N_API_KEY: 'test-n8n-api-key',
        PLATFORM_REGISTRY_URL: 'http://localhost:3000/api/platforms',
      };
      return defaultSettings[key] || null;
    }),

    // Autocoder-specific services
    getService: (name: string) => {
      const services: Record<string, any> = {
        'platform-registry': {
          listPlatforms: async () => [],
          getPlatform: async () => null,
          registerPlatform: async () => true,
        },
        'container-orchestration': {
          createContainer: async () => ({ id: 'test-container', status: 'running' }),
          stopContainer: async () => true,
          removeContainer: async () => true,
          listContainers: async () => [],
        },
        'workflow-automation': {
          createWorkflow: async () => ({ id: 'test-workflow', status: 'active' }),
          executeWorkflow: async () => ({ success: true, result: 'test-result' }),
          deleteWorkflow: async () => true,
        },
        research: {
          createResearchProject: async () => ({ id: 'research-1' }),
          getProject: async () => ({
            id: 'research-1',
            status: 'completed',
            report: 'Test research report',
            findings: [],
          }),
        },
        knowledge: {
          storeDocument: async () => ({ id: 'doc-1' }),
          getKnowledge: async () => [],
        },
        'env-manager': {
          getEnvVar: () => null,
        },
        'plugin-manager': {
          clonePlugin: async () => ({ path: '/tmp/test-project' }),
        },
        ...(overrides as any)?.services,
      };
      return services[name];
    },

    ...overrides,
  }) as any;
}

/**
 * Creates a mock Anthropic client for testing
 */
export function mockAnthropicClient() {
  return {
    messages: {
      create: mock().mockResolvedValue({
        content: [
          {
            type: 'text',
            text: `File: src/index.ts
\`\`\`typescript
export const plugin = {
  name: 'test-plugin',
  description: 'A test plugin',
  actions: [],
  providers: [],
};
\`\`\`

File: src/__tests__/index.test.ts
\`\`\`typescript
import { describe, it, expect  } from 'bun:test';
import { plugin } from '../index.ts';

describe('Plugin', () => {
  it('should be defined', () => {
    expect(plugin).toBeDefined();
  });
});
\`\`\``,
          },
        ],
      }),
    },
  };
}
