/**
 * Plugin Configuration System E2E Test Suite
 * Tests plugin lifecycle without database dependencies
 */

import { describe, it, expect, beforeEach, afterEach, mock } from 'bun:test';
import { AgentRuntime } from '../../runtime';
import { Service } from '../../types/service';
import type {
  IAgentRuntime,
  Plugin,
  Action,
  Provider,
  Evaluator,
  Memory,
  State,
  HandlerCallback,
  Character,
  IDatabaseAdapter,
} from '../../types';

// Simple Test Database Service
class TestDatabaseService extends Service {
  static serviceName = 'test-database-service';
  static serviceType = 'data_storage' as any;
  capabilityDescription = 'Test database service';

  private isStarted = false;

  static async start(runtime: IAgentRuntime): Promise<TestDatabaseService> {
    const service = new TestDatabaseService(runtime);
    await service.initialize();
    return service;
  }

  private async initialize(): Promise<void> {
    console.log('TestDatabaseService: Initializing...');
    this.isStarted = true;
    console.log('TestDatabaseService: Initialized');
  }

  isRunning(): boolean {
    return this.isStarted;
  }

  async stop(): Promise<void> {
    console.log('TestDatabaseService: Stopping...');
    this.isStarted = false;
    console.log('TestDatabaseService: Stopped');
  }
}

// Simple Test Action
const testAction: Action = {
  name: 'TEST_ACTION',
  similes: ['test_action'],
  description: 'Test action',
  examples: [],

  validate: async (runtime: IAgentRuntime, message: Memory): Promise<boolean> => {
    const service = runtime.getService('test-database-service') as TestDatabaseService;
    return service?.isRunning() || false;
  },

  handler: async (
    runtime: IAgentRuntime,
    message: Memory,
    state?: State,
    options?: any,
    callback?: HandlerCallback
  ) => {
    const service = runtime.getService('test-database-service') as TestDatabaseService;
    if (!service?.isRunning()) {
      throw new Error('Service not available');
    }

    return {
      text: 'Test action executed successfully',
      data: { serviceRunning: true },
    };
  },
};

// Simple Test Provider
const testProvider: Provider = {
  name: 'TEST_PROVIDER',
  description: 'Test provider',

  get: async (runtime: IAgentRuntime, message: Memory, state?: State) => {
    const service = runtime.getService('test-database-service') as TestDatabaseService;

    return {
      text: `[TEST PROVIDER] Service status: ${service?.isRunning() ? 'RUNNING' : 'STOPPED'}`,
      values: {
        serviceRunning: service?.isRunning() || false,
      },
    };
  },
};

// Simple Test Plugin
const testPlugin: Plugin = {
  name: 'test-plugin',
  description: 'Test plugin for configuration system',
  services: [TestDatabaseService],
  actions: [testAction],
  providers: [testProvider],
  evaluators: [],

  init: async (config: Record<string, string>, runtime: IAgentRuntime) => {
    console.log('test-plugin: Initializing...');
  },
};

describe('Plugin Configuration System E2E Tests', () => {
  let runtime: AgentRuntime;

  beforeEach(async () => {
    // Create a minimal mock adapter
    const mockAdapter = {
      init: mock().mockResolvedValue(undefined),
      initialize: mock().mockResolvedValue(undefined),
      isReady: mock().mockResolvedValue(true),
      close: mock().mockResolvedValue(undefined),
      getAgent: mock().mockResolvedValue(null),
      createAgent: mock().mockResolvedValue(true),
      getEntitiesByIds: mock().mockImplementation((ids) => {
        // Return agent entity when requested
        return ids.map((id: string) => ({
          id,
          names: ['Test Agent'],
          metadata: {},
          agentId: id,
        }));
      }),
      createEntities: mock().mockResolvedValue(true),
      getRoomsByIds: mock().mockResolvedValue([]),
      createRoom: mock().mockResolvedValue('test-room-id'),
      createRooms: mock().mockResolvedValue(['test-room-id']),
      getRoom: mock().mockResolvedValue(null),
      getRooms: mock().mockResolvedValue([]),
      getMemories: mock().mockResolvedValue([]),
      createMemory: mock().mockResolvedValue('test-memory-id'),
      searchMemories: mock().mockResolvedValue([]),
      getCachedValue: mock().mockResolvedValue(null),
      setCachedValue: mock().mockResolvedValue(undefined),
      // Add other required methods as empty mocks
      getAgents: mock().mockResolvedValue([]),
      updateAgent: mock().mockResolvedValue(true),
      deleteAgent: mock().mockResolvedValue(true),
      getEntities: mock().mockResolvedValue([]),
      getEntity: mock().mockResolvedValue(null),
      getEntityById: mock().mockImplementation((id) => {
        // Return agent entity when requested
        return Promise.resolve({
          id,
          names: ['Test Agent'],
          metadata: {},
          agentId: id,
        });
      }),
      createEntity: mock().mockResolvedValue(undefined),
      updateEntity: mock().mockResolvedValue(undefined),
      deleteEntity: mock().mockResolvedValue(undefined),
      getRelationships: mock().mockResolvedValue([]),
      createRelationship: mock().mockResolvedValue(true),
      updateRoom: mock().mockResolvedValue(undefined),
      deleteRoom: mock().mockResolvedValue(undefined),
      addParticipant: mock().mockResolvedValue(undefined),
      addParticipantsRoom: mock().mockResolvedValue(true),
      removeParticipant: mock().mockResolvedValue(true),
      getParticipantsForRoom: mock().mockResolvedValue([]),
      getComponents: mock().mockResolvedValue([]),
      createComponent: mock().mockResolvedValue(true),
      updateComponent: mock().mockResolvedValue(undefined),
      deleteComponent: mock().mockResolvedValue(undefined),
      deleteCachedValue: mock().mockResolvedValue(undefined),
      removeMemory: mock().mockResolvedValue(undefined),
      removeAllMemories: mock().mockResolvedValue(undefined),
      getMemoriesByEntityId: mock().mockResolvedValue([]),
      db: null,
      runMigrations: mock().mockResolvedValue(undefined),
      getConnection: mock().mockReturnValue(null),
      ensureEmbeddingDimension: mock().mockResolvedValue(undefined),
    } as any as IDatabaseAdapter;

    // Create test character
    const testCharacter: Character = {
      name: 'TestAgent',
      bio: ['Test agent'],
      system: 'Test system',
      messageExamples: [],
      postExamples: [],
      topics: ['testing'],
      knowledge: [],
      plugins: ['test-plugin'],
      settings: {},
      secrets: {},
      pluginConfig: {
        'test-plugin': {
          enabled: true,
          services: {
            'test-database-service': { enabled: true, settings: {} },
          },
          actions: {
            TEST_ACTION: { enabled: true, settings: {} },
          },
          providers: {
            TEST_PROVIDER: { enabled: true, settings: {} },
          },
        },
      },
    };

    // Create runtime without initializing
    runtime = new AgentRuntime({
      character: testCharacter,
      adapter: mockAdapter,
    });

    // Initialize runtime to ensure it's ready
    await runtime.initialize();
  });

  afterEach(async () => {
    if (runtime) {
      // Stop all services
      for (const [serviceName, service] of runtime.services.entries()) {
        try {
          await service.stop();
        } catch (error) {
          console.warn(`Error stopping service ${serviceName}:`, error);
        }
      }
      runtime.services.clear();
    }
  });

  it('should register and initialize plugins', async () => {
    console.log('🧪 Test 1: Plugin Registration');

    // Register test plugin
    await runtime.registerPlugin(testPlugin);

    console.log('✅ Plugin registered successfully');

    // Wait a bit for service to start
    await new Promise((resolve) => setTimeout(resolve, 100));

    // Verify service started
    const service = runtime.getService('test-database-service') as TestDatabaseService;

    // The service should be registered and started
    expect(service).toBeDefined();
    expect(service?.isRunning()).toBe(true);

    // Verify actions and providers are registered
    expect(runtime.actions.length).toBeGreaterThan(0);
    expect(runtime.providers.length).toBeGreaterThan(0);

    console.log('✅ Test 1 passed: Plugin registered correctly');
  });

  it('should execute actions with service dependencies', async () => {
    console.log('🧪 Test 2: Action Execution');

    // Register plugin first
    await runtime.registerPlugin(testPlugin);

    // Wait for service to be ready
    await new Promise((resolve) => setTimeout(resolve, 100));

    const action = runtime.actions.find((a) => a.name === 'TEST_ACTION');
    expect(action).toBeDefined();

    const testMessage = {
      id: 'test-msg-1' as any,
      entityId: 'test-user' as any,
      roomId: 'test-room' as any,
      agentId: runtime.agentId,
      content: { text: 'test message' },
      createdAt: Date.now(),
    };

    const isValid = await action!.validate(runtime, testMessage);
    expect(isValid).toBe(true);

    const result = await action!.handler(runtime, testMessage);
    expect(result).toBeDefined();
    expect((result as any).text).toContain('Test action executed successfully');

    console.log('✅ Test 2 passed: Action executed successfully');
  });

  it('should test service lifecycle', async () => {
    console.log('🧪 Test 3: Service Lifecycle');

    // Register plugin first
    await runtime.registerPlugin(testPlugin);

    // Wait for service to be ready
    await new Promise((resolve) => setTimeout(resolve, 100));

    // Get the service
    const service = runtime.getService('test-database-service') as TestDatabaseService;
    expect(service).toBeDefined();
    expect(service.isRunning()).toBe(true);

    // Stop the service
    await service.stop();
    expect(service.isRunning()).toBe(false);

    // Re-register the service to start it again
    const newService = await TestDatabaseService.start(runtime);
    runtime.services.set('test-database-service' as any, newService);
    expect(newService.isRunning()).toBe(true);

    console.log('✅ Test 3 passed: Service lifecycle works correctly');
  });

  it('should test provider functionality', async () => {
    console.log('🧪 Test 4: Provider Functionality');

    // Register plugin first
    await runtime.registerPlugin(testPlugin);

    // Wait for service to be ready
    await new Promise((resolve) => setTimeout(resolve, 100));

    const provider = runtime.providers.find((p) => p.name === 'TEST_PROVIDER');
    expect(provider).toBeDefined();

    const testMessage = {
      id: 'test-msg-2' as any,
      entityId: 'test-user' as any,
      roomId: 'test-room' as any,
      agentId: runtime.agentId,
      content: { text: 'test message' },
      createdAt: Date.now(),
    };

    const result = await provider!.get(runtime, testMessage, {} as State);
    expect(result).toBeDefined();
    expect(result.text).toContain('Service status: RUNNING');
    expect(result.values?.serviceRunning).toBe(true);

    console.log('✅ Test 4 passed: Provider works correctly');
  });

  it('should handle plugin initialization errors', async () => {
    console.log('🧪 Test 5: Error Handling');

    // Create a plugin that fails to initialize
    const failingPlugin: Plugin = {
      name: 'failing-plugin',
      description: 'Plugin that fails to initialize',
      services: [],

      init: async () => {
        throw new Error('Plugin initialization failed');
      },
    };

    // This should fail
    let failed = false;
    try {
      await runtime.registerPlugin(failingPlugin);
    } catch (error) {
      failed = true;
      expect((error as Error).message).toContain('Plugin initialization failed');
    }

    expect(failed).toBe(true);
    console.log('✅ Test 5 passed: Error handling works correctly');
  });

  it('should test component registration', async () => {
    console.log('🧪 Test 6: Component Registration');

    // Register plugin first
    await runtime.registerPlugin(testPlugin);

    // Check initial state
    const initialActions = runtime.actions.map((a) => a.name);
    expect(initialActions).toContain('TEST_ACTION');

    // Check providers
    const initialProviders = runtime.providers.map((p) => p.name);
    expect(initialProviders).toContain('TEST_PROVIDER');

    // Check services
    const service = runtime.getService('test-database-service');
    expect(service).toBeDefined();

    console.log('✅ Test 6 passed: Component registration works correctly');
  });

  it('should generate system status report', async () => {
    console.log('🧪 Test 7: System Status Report');

    // Register plugin first
    await runtime.registerPlugin(testPlugin);

    // Wait for service to be ready
    await new Promise((resolve) => setTimeout(resolve, 100));

    const service = runtime.getService('test-database-service') as TestDatabaseService;

    console.log('📊 System Status:');
    console.log('- Service running:', service?.isRunning());
    console.log('- Actions:', runtime.actions.length);
    console.log('- Providers:', runtime.providers.length);
    console.log('- Services:', runtime.services.size);

    // Verify all components are working
    expect(service).toBeDefined();
    expect(service?.isRunning()).toBe(true);
    expect(runtime.actions.length).toBeGreaterThan(0);
    expect(runtime.providers.length).toBeGreaterThan(0);
    expect(runtime.services.size).toBeGreaterThan(0);

    console.log('🎉 All Plugin Configuration System Tests Passed!');
  });
});

export { TestDatabaseService, testAction, testProvider, testPlugin };
