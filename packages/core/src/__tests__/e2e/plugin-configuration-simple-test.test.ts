/**
 * Simple Plugin Configuration System Test
 * Tests plugin registration, service lifecycle, and component management
 * Focuses on core functionality without database dependencies
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
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
  UUID
} from '../../types';

// Simple Test Services
class TestConfigDatabaseService extends Service {
  static serviceName = 'test-config-database-service';
  static serviceType = 'data_storage' as any;
  capabilityDescription = 'Test configuration database service';
  
  private isStarted = false;
  private dbUrl: string = '';
  private apiKey: string = '';

  static async start(runtime: IAgentRuntime): Promise<TestConfigDatabaseService> {
    const dbUrl = runtime.getSetting('DATABASE_URL');
    const apiKey = runtime.getSetting('DATABASE_API_KEY');
    
    if (!dbUrl) {
      throw new Error('DATABASE_URL environment variable is required');
    }
    
    if (!apiKey) {
      throw new Error('DATABASE_API_KEY environment variable is required');
    }
    
    const service = new TestConfigDatabaseService(runtime);
    service.dbUrl = dbUrl;
    service.apiKey = apiKey;
    service.isStarted = true;
    
    console.log('TestConfigDatabaseService: Started successfully');
    return service;
  }

  getStats(): any {
    return {
      isStarted: this.isStarted,
      dbUrl: this.dbUrl,
      hasApiKey: !!this.apiKey
    };
  }

  async stop(): Promise<void> {
    this.isStarted = false;
    console.log('TestConfigDatabaseService: Stopped');
  }
}

class TestConfigAuthService extends Service {
  static serviceName = 'test-config-auth-service';
  static serviceType = 'security' as any;
  capabilityDescription = 'Test configuration authentication service';
  
  private isStarted = false;

  static async start(runtime: IAgentRuntime): Promise<TestConfigAuthService> {
    const service = new TestConfigAuthService(runtime);
    service.isStarted = true;
    console.log('TestConfigAuthService: Started successfully');
    return service;
  }

  getStats(): any {
    return {
      isStarted: this.isStarted
    };
  }

  async stop(): Promise<void> {
    this.isStarted = false;
    console.log('TestConfigAuthService: Stopped');
  }
}

// Simple Test Action
const testConfigAction: Action = {
  name: 'TEST_CONFIG_ACTION',
  similes: ['test_config', 'config_test'],
  description: 'Test configuration action',
  examples: [
    [
      { name: 'user', content: { text: 'test config action' } },
      { name: 'assistant', content: { text: 'Config action executed', actions: ['TEST_CONFIG_ACTION'] } }
    ]
  ],
  
  validate: async (runtime: IAgentRuntime, message: Memory): Promise<boolean> => {
    const dbService = runtime.getService('test-config-database-service');
    const authService = runtime.getService('test-config-auth-service');
    return !!(dbService && authService);
  },

  handler: async (
    runtime: IAgentRuntime,
    message: Memory,
    state?: State,
    options?: any,
    callback?: HandlerCallback
  ) => {
    const dbService = runtime.getService('test-config-database-service') as TestConfigDatabaseService;
    const authService = runtime.getService('test-config-auth-service') as TestConfigAuthService;
    
    const response = `Config action executed. DB: ${dbService?.getStats().isStarted}, Auth: ${authService?.getStats().isStarted}`;
    
    if (callback) {
      await callback({
        text: response,
        actions: ['TEST_CONFIG_ACTION'],
        thought: 'Config action completed successfully'
      });
    }
    
    return {
      text: response,
      data: {
        dbStats: dbService?.getStats(),
        authStats: authService?.getStats()
      }
    };
  }
};

// Simple Test Provider
const testConfigProvider: Provider = {
  name: 'TEST_CONFIG_PROVIDER',
  description: 'Test configuration provider',
  
  get: async (runtime: IAgentRuntime, message: Memory, state?: State) => {
    const dbService = runtime.getService('test-config-database-service') as TestConfigDatabaseService;
    const authService = runtime.getService('test-config-auth-service') as TestConfigAuthService;
    
    const stats = {
      database: dbService?.getStats() || { status: 'not_available' },
      auth: authService?.getStats() || { status: 'not_available' }
    };
    
    return {
      text: `[CONFIG STATS] DB: ${stats.database.isStarted ? 'RUNNING' : 'STOPPED'}, Auth: ${stats.auth.isStarted ? 'RUNNING' : 'STOPPED'}`,
      values: { configStats: stats },
      data: { fullConfigStats: stats }
    };
  }
};

// Simple Test Evaluator
const testConfigEvaluator: Evaluator = {
  name: 'TEST_CONFIG_EVALUATOR',
  description: 'Test configuration evaluator',
  examples: [
    {
      prompt: 'Config evaluation test',
      messages: [
        { name: 'user', content: { text: 'test config' } },
        { name: 'assistant', content: { text: 'Config tested' } }
      ],
      outcome: 'Config evaluation completed'
    }
  ],
  
  validate: async (runtime: IAgentRuntime, message: Memory): Promise<boolean> => {
    return true; // Always run for testing
  },

  handler: async (
    runtime: IAgentRuntime,
    message: Memory,
    state?: State,
    options?: any,
    callback?: HandlerCallback
  ) => {
    console.log('TEST_CONFIG_EVALUATOR: Running evaluation');
    return true; // Return boolean for evaluator
  }
};

// Plugin with Environment Variables
const testConfigPluginWithEnv: Plugin = {
  name: 'test-config-plugin-with-env',
  description: 'Test config plugin requiring environment variables',
  services: [TestConfigDatabaseService],
  actions: [testConfigAction],
  providers: [testConfigProvider],
  evaluators: [testConfigEvaluator],
  
  init: async (config: Record<string, string>, runtime: IAgentRuntime) => {
    console.log('test-config-plugin-with-env: Initializing');
    
    const required = ['DATABASE_URL', 'DATABASE_API_KEY'];
    const missing = required.filter(key => !runtime.getSetting(key));
    
    if (missing.length > 0) {
      throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
    }
    
    console.log('test-config-plugin-with-env: Environment variables validated');
  }
};

// Plugin without Environment Variables  
const testConfigPluginNoEnv: Plugin = {
  name: 'test-config-plugin-no-env',
  description: 'Test config plugin without environment variables',
  services: [TestConfigAuthService],
  actions: [],
  providers: [],
  evaluators: [],
  
  init: async (config: Record<string, string>, runtime: IAgentRuntime) => {
    console.log('test-config-plugin-no-env: Initializing (no env vars required)');
  }
};

// Mock Runtime for testing plugin registration without full database setup
class MockPluginRuntime {
  public agentId = `test-agent-${Date.now()}` as UUID;
  public services = new Map<string, Service>();
  public actions: Action[] = [];
  public providers: Provider[] = [];
  public evaluators: Evaluator[] = [];
  public plugins: Plugin[] = [];
  private settings: Record<string, any> = {};

  constructor(settings: Record<string, any> = {}) {
    this.settings = settings;
  }

  getSetting(key: string): any {
    return this.settings[key];
  }

  getService(name: string): Service | null {
    return this.services.get(name) || null;
  }

  async registerPlugin(plugin: Plugin): Promise<void> {
    console.log(`Registering plugin: ${plugin.name}`);
    
    // Call plugin init
    if (plugin.init) {
      await plugin.init({}, this as any);
    }
    
    // Register services
    if (plugin.services) {
      for (const ServiceClass of plugin.services) {
        const service = await ServiceClass.start(this as any);
        this.services.set(ServiceClass.serviceName, service);
        console.log(`Registered service: ${ServiceClass.serviceName}`);
      }
    }
    
    // Register actions
    if (plugin.actions) {
      this.actions.push(...plugin.actions);
      console.log(`Registered ${plugin.actions.length} actions`);
    }
    
    // Register providers
    if (plugin.providers) {
      this.providers.push(...plugin.providers);
      console.log(`Registered ${plugin.providers.length} providers`);
    }
    
    // Register evaluators
    if (plugin.evaluators) {
      this.evaluators.push(...plugin.evaluators);
      console.log(`Registered ${plugin.evaluators.length} evaluators`);
    }
    
    this.plugins.push(plugin);
    console.log(`Plugin ${plugin.name} registered successfully`);
  }

  async stopAllServices(): Promise<void> {
    for (const [name, service] of this.services.entries()) {
      try {
        await service.stop();
        console.log(`Stopped service: ${name}`);
      } catch (error) {
        console.warn(`Error stopping service ${name}:`, error);
      }
    }
    this.services.clear();
  }
}

describe('Simple Plugin Configuration System Tests', () => {
  let mockRuntime: MockPluginRuntime;

  beforeEach(() => {
    mockRuntime = new MockPluginRuntime({
      'DATABASE_URL': 'postgresql://test:test@localhost:5432/testdb',
      'DATABASE_API_KEY': 'test-api-key-12345',
    });
  });

  afterEach(async () => {
    if (mockRuntime) {
      await mockRuntime.stopAllServices();
    }
  });

  it('should register plugins with environment variable validation', async () => {
    console.log('🧪 Test 1: Plugin Registration with Environment Variables');
    
    // Register plugins
    await mockRuntime.registerPlugin(testConfigPluginWithEnv);
    await mockRuntime.registerPlugin(testConfigPluginNoEnv);
    
    // Verify services
    const dbService = mockRuntime.getService('test-config-database-service');
    const authService = mockRuntime.getService('test-config-auth-service');
    
    expect(dbService).toBeDefined();
    expect(authService).toBeDefined();
    
    expect((dbService as TestConfigDatabaseService).getStats().isStarted).toBe(true);
    expect((authService as TestConfigAuthService).getStats().isStarted).toBe(true);
    
    console.log('✅ Test 1 passed: Services registered and started correctly');
  });

  it('should validate environment variables and reject missing vars', async () => {
    console.log('🧪 Test 2: Environment Variable Validation');
    
    // Create runtime without required env vars
    const badRuntime = new MockPluginRuntime({});
    
    let failed = false;
    try {
      await badRuntime.registerPlugin(testConfigPluginWithEnv);
    } catch (error) {
      failed = true;
      const errorMessage = error instanceof Error ? error.message : String(error);
      expect(errorMessage).toContain('Missing required environment variables');
      expect(errorMessage).toContain('DATABASE_URL');
      expect(errorMessage).toContain('DATABASE_API_KEY');
    }
    
    expect(failed).toBe(true);
    console.log('✅ Test 2 passed: Environment variable validation works correctly');
  });

  it('should register actions, providers, and evaluators', async () => {
    console.log('🧪 Test 3: Component Registration');
    
    // Register plugins
    await mockRuntime.registerPlugin(testConfigPluginWithEnv);
    await mockRuntime.registerPlugin(testConfigPluginNoEnv);
    
    // Verify components
    expect(mockRuntime.actions.length).toBeGreaterThan(0);
    expect(mockRuntime.providers.length).toBeGreaterThan(0);
    expect(mockRuntime.evaluators.length).toBeGreaterThan(0);
    
    const action = mockRuntime.actions.find(a => a.name === 'TEST_CONFIG_ACTION');
    const provider = mockRuntime.providers.find(p => p.name === 'TEST_CONFIG_PROVIDER');
    const evaluator = mockRuntime.evaluators.find(e => e.name === 'TEST_CONFIG_EVALUATOR');
    
    expect(action).toBeDefined();
    expect(provider).toBeDefined();
    expect(evaluator).toBeDefined();
    
    console.log('✅ Test 3 passed: All components registered correctly');
  });

  it('should execute action with service dependencies', async () => {
    console.log('🧪 Test 4: Action Execution with Service Dependencies');
    
    // Register plugins
    await mockRuntime.registerPlugin(testConfigPluginWithEnv);
    await mockRuntime.registerPlugin(testConfigPluginNoEnv);
    
    const action = mockRuntime.actions.find(a => a.name === 'TEST_CONFIG_ACTION');
    expect(action).toBeDefined();
    
    if (!action) {
      throw new Error('TEST_CONFIG_ACTION not found');
    }
    
    const testMessage: Memory = {
      id: `test-msg-${Date.now()}` as UUID,
      entityId: `test-user-${Date.now()}` as UUID,
      roomId: `test-room-${Date.now()}` as UUID,
      agentId: mockRuntime.agentId as UUID,
      content: { text: 'test config action' },
      createdAt: Date.now()
    };
    
    // Validate action
    const isValid = await action.validate(mockRuntime as any, testMessage);
    expect(isValid).toBe(true);
    
    // Execute action
    const result = await action.handler(mockRuntime as any, testMessage);
    expect(result).toBeDefined();
    expect((result as any).text).toContain('Config action executed');
    expect((result as any).data?.dbStats?.isStarted).toBe(true);
    expect((result as any).data?.authStats?.isStarted).toBe(true);
    
    console.log('✅ Test 4 passed: Action executed successfully with service dependencies');
  });

  it('should execute provider with service dependencies', async () => {
    console.log('🧪 Test 5: Provider Execution with Service Dependencies');
    
    // Register plugins
    await mockRuntime.registerPlugin(testConfigPluginWithEnv);
    await mockRuntime.registerPlugin(testConfigPluginNoEnv);
    
    const provider = mockRuntime.providers.find(p => p.name === 'TEST_CONFIG_PROVIDER');
    expect(provider).toBeDefined();
    
    if (!provider) {
      throw new Error('TEST_CONFIG_PROVIDER not found');
    }
    
    const testMessage: Memory = {
      id: `test-msg-${Date.now()}` as UUID,
      entityId: `test-user-${Date.now()}` as UUID,
      roomId: `test-room-${Date.now()}` as UUID,
      agentId: mockRuntime.agentId as UUID,
      content: { text: 'get config stats' },
      createdAt: Date.now()
    };
    
    const result = await provider.get(mockRuntime as any, testMessage, {
      values: {},
      data: {},
      text: ''
    });
    expect(result).toBeDefined();
    expect(result.text).toContain('CONFIG STATS');
    expect(result.values?.configStats?.database?.isStarted).toBe(true);
    expect(result.values?.configStats?.auth?.isStarted).toBe(true);
    
    console.log('✅ Test 5 passed: Provider executed successfully with service dependencies');
  });

  it('should generate final plugin configuration report', async () => {
    console.log('🧪 Test 6: Final Plugin Configuration Report');
    
    // Register plugins
    await mockRuntime.registerPlugin(testConfigPluginWithEnv);
    await mockRuntime.registerPlugin(testConfigPluginNoEnv);
    
    const dbService = mockRuntime.getService('test-config-database-service') as TestConfigDatabaseService;
    const authService = mockRuntime.getService('test-config-auth-service') as TestConfigAuthService;
    
    console.log('📊 Final Plugin Configuration Stats:');
    console.log('- Total Plugins:', mockRuntime.plugins.length);
    console.log('- Total Services:', mockRuntime.services.size);
    console.log('- Total Actions:', mockRuntime.actions.length);
    console.log('- Total Providers:', mockRuntime.providers.length);
    console.log('- Total Evaluators:', mockRuntime.evaluators.length);
    console.log('- Database Service Stats:', dbService.getStats());
    console.log('- Auth Service Stats:', authService.getStats());
    
    // Verify all components are working
    expect(mockRuntime.plugins.length).toBe(2);
    expect(mockRuntime.services.size).toBe(2);
    expect(mockRuntime.actions.length).toBe(1);
    expect(mockRuntime.providers.length).toBe(1);
    expect(mockRuntime.evaluators.length).toBe(1);
    expect(dbService.getStats().isStarted).toBe(true);
    expect(authService.getStats().isStarted).toBe(true);
    
    console.log('🎉 All Simple Plugin Configuration System Tests Passed!');
  });
});

export { 
  TestConfigDatabaseService, 
  TestConfigAuthService, 
  testConfigAction, 
  testConfigProvider, 
  testConfigEvaluator,
  testConfigPluginWithEnv,
  testConfigPluginNoEnv,
  MockPluginRuntime
};