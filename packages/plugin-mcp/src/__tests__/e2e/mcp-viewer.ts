import type { TestSuite, IAgentRuntime } from '@elizaos/core';

export class McpViewerTestSuite implements TestSuite {
  name = 'mcp-viewer-e2e';
  description = 'E2E tests for MCP viewer functionality';

  tests = [
    {
      name: 'MCP service should handle server configuration',
      fn: async (runtime: IAgentRuntime) => {
        const mcpService = runtime.getService('mcp');

        if (!mcpService) {
          // Service might not be initialized if no config provided
          console.log('⚠️  MCP service not initialized - skipping test');
          return;
        }

        // Test that the service can retrieve server information
        const servers = (mcpService as any).getServers?.();

        if (!servers) {
          throw new Error('MCP service does not expose getServers method');
        }

        console.log(`✓ MCP service can retrieve ${servers.length} servers`);

        // Verify server structure if any exist
        if (servers.length > 0) {
          const server = servers[0];
          if (!server.name || typeof server.name !== 'string') {
            throw new Error('Server missing required name property');
          }
          if (
            !server.status ||
            !['connected', 'disconnected', 'connecting'].includes(server.status)
          ) {
            throw new Error('Server has invalid status');
          }
          console.log(`✓ Server structure is valid for: ${server.name}`);
        }
      },
    },

    {
      name: 'MCP provider should return contextual information',
      fn: async (runtime: IAgentRuntime) => {
        const mcpProvider = runtime.providers?.find((p) => p.name === 'MCP');

        if (!mcpProvider) {
          throw new Error('MCP provider not found');
        }

        // Create a test message
        const testMessage = {
          id: `test-msg-${Date.now()}`,
          entityId: `test-entity-${Date.now()}`,
          roomId: `test-room-${Date.now()}`,
          agentId: runtime.agentId,
          content: { text: 'What MCP tools are available?' },
          createdAt: Date.now(),
        } as any;

        const testState = {
          values: {},
          data: {},
          text: '',
        };

        // Get provider context
        const result = await mcpProvider.get(runtime, testMessage, testState);

        if (!result || typeof result.text !== 'string') {
          throw new Error('Provider did not return valid text response');
        }

        console.log('✓ MCP provider returned context information');
        console.log('  Provider response preview:', `${result.text.substring(0, 100)}...`);
      },
    },

    {
      name: 'CALL_TOOL action should validate correctly',
      fn: async (runtime: IAgentRuntime) => {
        const callToolAction = runtime.actions?.find((a) => a.name === 'CALL_TOOL');

        if (!callToolAction) {
          throw new Error('CALL_TOOL action not found');
        }

        const testMessage = {
          id: `test-msg-${Date.now()}`,
          entityId: `test-entity-${Date.now()}`,
          roomId: `test-room-${Date.now()}`,
          agentId: runtime.agentId,
          content: {
            text: 'Use the calculator tool to add 5 and 3',
            actions: ['CALL_TOOL'],
          },
          createdAt: Date.now(),
        } as any;

        // Validate should return false if no MCP service is available
        const isValid = await callToolAction.validate(runtime, testMessage);

        const mcpService = runtime.getService('mcp');
        if (!mcpService) {
          if (isValid) {
            throw new Error('CALL_TOOL validated without MCP service');
          }
          console.log('✓ CALL_TOOL correctly requires MCP service');
        } else {
          console.log(`✓ CALL_TOOL validation returned: ${isValid}`);
        }
      },
    },

    {
      name: 'READ_RESOURCE action should validate correctly',
      fn: async (runtime: IAgentRuntime) => {
        const readResourceAction = runtime.actions?.find((a) => a.name === 'READ_RESOURCE');

        if (!readResourceAction) {
          throw new Error('READ_RESOURCE action not found');
        }

        const testMessage = {
          id: `test-msg-${Date.now()}`,
          entityId: `test-entity-${Date.now()}`,
          roomId: `test-room-${Date.now()}`,
          agentId: runtime.agentId,
          content: {
            text: 'Read the config file resource',
            actions: ['READ_RESOURCE'],
          },
          createdAt: Date.now(),
        } as any;

        // Validate should return false if no MCP service is available
        const isValid = await readResourceAction.validate(runtime, testMessage);

        const mcpService = runtime.getService('mcp');
        if (!mcpService) {
          if (isValid) {
            throw new Error('READ_RESOURCE validated without MCP service');
          }
          console.log('✓ READ_RESOURCE correctly requires MCP service');
        } else {
          console.log(`✓ READ_RESOURCE validation returned: ${isValid}`);
        }
      },
    },

    {
      name: 'MCP routes should be accessible',
      fn: async (runtime: IAgentRuntime) => {
        const mcpRoutes = runtime.routes?.filter((r) => r.path.startsWith('/mcp/')) || [];

        if (mcpRoutes.length === 0) {
          throw new Error('No MCP routes found');
        }

        // Verify essential routes exist
        const essentialPaths = ['/mcp/servers', '/mcp/viewer', '/mcp/viewer.js'];
        for (const path of essentialPaths) {
          const route = mcpRoutes.find((r) => r.path === path);
          if (!route) {
            throw new Error(`Essential route ${path} not found`);
          }
        }

        console.log(`✓ All ${essentialPaths.length} essential MCP routes are registered`);

        // Verify route handlers are functions
        for (const route of mcpRoutes) {
          if (typeof route.handler !== 'function') {
            throw new Error(`Route ${route.path} has invalid handler`);
          }
        }

        console.log(`✓ All ${mcpRoutes.length} MCP routes have valid handlers`);
      },
    },
  ];
}

export default new McpViewerTestSuite();
