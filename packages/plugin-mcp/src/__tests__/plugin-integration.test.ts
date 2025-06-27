import { describe, it, expect, mock, beforeEach } from 'bun:test';
import mcpPlugin from '../index';
import type { IAgentRuntime, Plugin } from '@elizaos/core';

// Simplified TestSuite implementation for local use
class TestSuite {
  constructor(private name: string, private config: any) {}
  
  addTest(test: any) {
    it(test.name, async () => {
      const context = this.config.beforeEach ? this.config.beforeEach() : {};
      await test.fn(context);
    });
  }
  
  run() {
    // No-op, bun:test handles execution
  }
}

const createUnitTest = (config: { name: string; fn: (context?: any) => Promise<void> | void }) => config;

// Mock runtime for testing
function createMockRuntime(): IAgentRuntime {
  const services = new Map();
  const providers: any[] = [];
  const actions: any[] = [];
  const routes: any[] = [];

  return {
    agentId: 'test-agent-id',
    character: {
      name: 'Test Agent',
      bio: ['Test bio'],
      system: 'Test system',
      messageExamples: [],
      postExamples: [],
      topics: [],
      knowledge: [],
      plugins: [],
    },

    getSetting: mock((key: string) => {
      if (key === 'mcp') {
        return JSON.stringify({ servers: {} });
      }
      return undefined;
    }),

    getService: mock((name: string) => services.get(name)),

    registerPlugin: mock(async (plugin: Plugin) => {
      // Register services
      if (plugin.services) {
        for (const serviceItem of plugin.services) {
          // Handle both service class and service configuration object
          if (typeof serviceItem === 'function' && serviceItem.start) {
            const service = await serviceItem.start({} as any);
            services.set(serviceItem.serviceName || 'unknown', service);
          } else if (typeof serviceItem === 'object' && serviceItem.component) {
            const service = await serviceItem.component.start({} as any);
            services.set(serviceItem.component.serviceName || 'unknown', service);
          }
        }
      }

      // Register providers
      if (plugin.providers) {
        providers.push(...plugin.providers);
      }

      // Register actions
      if (plugin.actions) {
        actions.push(...plugin.actions);
      }

      // Register routes
      if (plugin.routes) {
        routes.push(...plugin.routes);
      }
    }),

    providers,
    actions,
    routes,
    services,

    // Other required methods
    useModel: mock(),
    generateText: mock(),
    messageManager: {
      createMemory: mock(),
      getMemories: mock(),
      updateMemory: mock(),
      deleteMemory: mock(),
      searchMemories: mock(),
      getLastMessages: mock(),
    },
    composeState: mock(),
    updateState: mock(),
    evaluators: [],
    createComponent: mock(),
    getComponents: mock(),
    updateComponent: mock(),
    db: {
      query: mock(),
      execute: mock(),
      getWorlds: mock(),
      getWorld: mock(),
    },
    logger: {
      info: mock(),
      warn: mock(),
      error: mock(),
      debug: mock(),
    },
    addEmbeddingToMemory: mock(),
    createMemory: mock(),
  } as any;
}

describe('MCP Plugin Integration', () => {
  const mcpPluginTestSuite = new TestSuite('MCP Plugin Integration', {
    beforeEach: () => {
      mock.restore();
      const mockRuntime = createMockRuntime();
      return { mockRuntime };
    },
  });

  mcpPluginTestSuite.addTest(
    createUnitTest({
      name: 'should validate action requirements correctly',
      fn: async ({ mockRuntime }: any) => {
        const callToolAction = mcpPlugin.actions?.find((a) => a.name === 'CALL_TOOL');
        const readResourceAction = mcpPlugin.actions?.find((a) => a.name === 'READ_RESOURCE');

        expect(callToolAction).toBeDefined();
        expect(readResourceAction).toBeDefined();

        // Create test message
        const testMessage = {
          id: 'test-msg-0000-0000-0000-000000000000' as any,
          entityId: 'test-entity-000-0000-0000-000000000000' as any,
          roomId: 'test-room-0000-0000-0000-000000000000' as any,
          agentId: mockRuntime.agentId,
          content: { text: 'test' },
          createdAt: Date.now(),
        };

        // Without MCP service, actions should not validate
        const callToolValid = await callToolAction!.validate(mockRuntime, testMessage);
        const readResourceValid = await readResourceAction!.validate(mockRuntime, testMessage);

        expect(callToolValid).toBe(false);
        expect(readResourceValid).toBe(false);
      },
    })
  );

  mcpPluginTestSuite.addTest(
    createUnitTest({
      name: 'should handle provider requests with proper error handling',
      fn: async ({ mockRuntime }: any) => {
        const provider = mcpPlugin.providers?.[0];
        expect(provider).toBeDefined();

        // Create test message and state
        const testMessage = {
          id: 'test-msg-0000-0000-0000-000000000000' as any,
          entityId: 'test-entity-000-0000-0000-000000000000' as any,
          roomId: 'test-room-0000-0000-0000-000000000000' as any,
          agentId: mockRuntime.agentId,
          content: { text: 'test' },
          createdAt: Date.now(),
        };

        const testState = {
          values: {},
          data: {},
          text: '',
        };

        // Get provider data - should handle missing service gracefully
        const result = await provider!.get(mockRuntime, testMessage, testState);

        expect(result).toBeDefined();
        expect(result.text).toBeDefined();
        expect(typeof result.text).toBe('string');
        expect(result.text).toContain('No MCP servers are available');
      },
    })
  );

  mcpPluginTestSuite.addTest(
    createUnitTest({
      name: 'should register all required components',
      fn: () => {
        // Verify actions are registered
        expect(mcpPlugin.actions).toBeDefined();
        expect(mcpPlugin.actions?.length).toBe(2);

        const actionNames = mcpPlugin.actions?.map((a) => a.name) || [];
        expect(actionNames).toContain('CALL_TOOL');
        expect(actionNames).toContain('READ_RESOURCE');

        // Verify provider is registered
        expect(mcpPlugin.providers).toBeDefined();
        expect(mcpPlugin.providers?.length).toBe(1);
        expect(mcpPlugin.providers?.[0].name).toBe('MCP');

        // Verify routes are registered
        expect(mcpPlugin.routes).toBeDefined();
        expect(mcpPlugin.routes?.length).toBeGreaterThan(0);

        const routePaths = mcpPlugin.routes?.map((r) => r.path) || [];
        expect(routePaths).toContain('/mcp/servers');
        expect(routePaths).toContain('/mcp/viewer');
        expect(routePaths).toContain('/mcp/viewer.js');

        // Verify service is defined
        expect(mcpPlugin.services).toBeDefined();
        expect(mcpPlugin.services?.length).toBeGreaterThan(0);
        const firstService = mcpPlugin.services?.[0];
        if (firstService && typeof firstService === 'function') {
          expect((firstService as any).serviceType).toBe('mcp');
        } else if (firstService && typeof firstService === 'object' && 'component' in firstService) {
          expect(firstService.component.serviceType).toBe('mcp');
        }
      },
    })
  );

  mcpPluginTestSuite.run();
});