import { describe, it, expect, vi, beforeEach } from 'vitest';
import mcpPlugin from '../index';
import type { IAgentRuntime, Plugin } from '@elizaos/core';

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
      adjectives: [],
      knowledge: [],
      plugins: []
    },
    
    getSetting: vi.fn((key: string) => {
      if (key === 'mcp') {
        return JSON.stringify({ servers: {} });
      }
      return undefined;
    }),
    
    getService: vi.fn((name: string) => services.get(name)),
    
    registerPlugin: vi.fn(async (plugin: Plugin) => {
      // Register services
      if (plugin.services) {
        for (const ServiceClass of plugin.services) {
          const service = await ServiceClass.start({} as any);
          services.set(ServiceClass.serviceName || 'unknown', service);
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
    useModel: vi.fn(),
    generateText: vi.fn(),
    messageManager: {
      createMemory: vi.fn(),
      getMemories: vi.fn(),
      updateMemory: vi.fn(),
      deleteMemory: vi.fn(),
      searchMemories: vi.fn(),
      getLastMessages: vi.fn(),
    },
    composeState: vi.fn(),
    updateState: vi.fn(),
    evaluators: [],
    createComponent: vi.fn(),
    getComponents: vi.fn(),
    updateComponent: vi.fn(),
    db: {
      query: vi.fn(),
      execute: vi.fn(),
      getWorlds: vi.fn(),
      getWorld: vi.fn(),
    },
    logger: {
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
      debug: vi.fn(),
    },
    addEmbeddingToMemory: vi.fn(),
    createMemory: vi.fn(),
  } as any;
}

describe('MCP Plugin Integration', () => {
  let mockRuntime: IAgentRuntime;

  beforeEach(() => {
    vi.clearAllMocks();
    mockRuntime = createMockRuntime();
  });

  it('should have correct plugin metadata', () => {
    expect(mcpPlugin.name).toBe('mcp');
    expect(mcpPlugin.description).toBe('Plugin for connecting to MCP (Model Context Protocol) servers');
  });

  it('should register services when initialized', async () => {
    // Check that MCP service is defined in plugin
    expect(mcpPlugin.services).toBeDefined();
    expect(mcpPlugin.services?.length).toBeGreaterThan(0);
    
    // The service would be registered when the plugin is loaded in a real runtime
    // Here we just verify the service class exists
    const McpServiceClass = mcpPlugin.services?.[0];
    expect(McpServiceClass).toBeDefined();
    expect(McpServiceClass?.serviceType).toBe('mcp');
  });

  it('should register actions', () => {
    expect(mcpPlugin.actions).toBeDefined();
    expect(mcpPlugin.actions?.length).toBe(2);
    
    const actionNames = mcpPlugin.actions?.map(a => a.name) || [];
    expect(actionNames).toContain('CALL_TOOL');
    expect(actionNames).toContain('READ_RESOURCE');
  });

  it('should register providers', () => {
    expect(mcpPlugin.providers).toBeDefined();
    expect(mcpPlugin.providers?.length).toBe(1);
    
    const provider = mcpPlugin.providers?.[0];
    expect(provider?.name).toBe('MCP');
  });

  it('should register routes', () => {
    expect(mcpPlugin.routes).toBeDefined();
    expect(mcpPlugin.routes?.length).toBeGreaterThan(0);
    
    const routePaths = mcpPlugin.routes?.map(r => r.path) || [];
    expect(routePaths).toContain('/mcp/servers');
    expect(routePaths).toContain('/mcp/viewer');
    expect(routePaths).toContain('/mcp/viewer.js');
  });

  it('should have test suites defined', () => {
    expect(mcpPlugin.tests).toBeDefined();
    expect(mcpPlugin.tests?.length).toBe(1);
    
    const testSuite = mcpPlugin.tests?.[0];
    expect(testSuite).toBeDefined();
  });

  it('should validate action requirements', async () => {
    const callToolAction = mcpPlugin.actions?.find(a => a.name === 'CALL_TOOL');
    const readResourceAction = mcpPlugin.actions?.find(a => a.name === 'READ_RESOURCE');
    
    expect(callToolAction).toBeDefined();
    expect(readResourceAction).toBeDefined();
    
    // Create test message
    const testMessage = {
      id: 'test-msg-0000-0000-0000-000000000000' as any,
      entityId: 'test-entity-000-0000-0000-000000000000' as any,
      roomId: 'test-room-0000-0000-0000-000000000000' as any,
      agentId: mockRuntime.agentId,
      content: { text: 'test' },
      createdAt: Date.now()
    };
    
    // Without MCP service, actions should not validate
    const callToolValid = await callToolAction!.validate(mockRuntime, testMessage);
    const readResourceValid = await readResourceAction!.validate(mockRuntime, testMessage);
    
    expect(callToolValid).toBe(false);
    expect(readResourceValid).toBe(false);
  });

  it('should handle provider requests', async () => {
    const provider = mcpPlugin.providers?.[0];
    expect(provider).toBeDefined();
    
    // Create test message and state
    const testMessage = {
      id: 'test-msg-0000-0000-0000-000000000000' as any,
      entityId: 'test-entity-000-0000-0000-000000000000' as any,
      roomId: 'test-room-0000-0000-0000-000000000000' as any,
      agentId: mockRuntime.agentId,
      content: { text: 'test' },
      createdAt: Date.now()
    };
    
    const testState = {
      values: {},
      data: {},
      text: ''
    };
    
    // Get provider data
    const result = await provider!.get(mockRuntime, testMessage, testState);
    
    expect(result).toBeDefined();
    expect(result.text).toBeDefined();
    expect(typeof result.text).toBe('string');
  });
}); 