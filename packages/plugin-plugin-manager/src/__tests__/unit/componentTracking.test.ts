import {
  type Action,
  type Evaluator,
  type IAgentRuntime,
  type Plugin,
  type Provider,
  Service,
  type ServiceTypeName,
} from '@elizaos/core';
import { v4 as uuidv4 } from 'uuid';
import { beforeEach, describe, expect, it, mock } from 'bun:test';
import { PluginManagerService } from '../../services/pluginManagerService.ts';

// Mock service for testing
class TestService extends Service {
  static serviceType: ServiceTypeName = 'TEST_SERVICE' as ServiceTypeName;
  override capabilityDescription = 'Test service for component tracking';
  static async start(runtime: IAgentRuntime): Promise<Service> {
    return new TestService(runtime);
  }
  async stop(): Promise<void> {}
}

const createMockRuntime = (): IAgentRuntime => {
  const runtime: any = {
    agentId: uuidv4() as any,
    plugins: [],
    actions: [],
    providers: [],
    evaluators: [],
    services: new Map(),
    registerAction: mock((action: Action) => {
      runtime.actions.push(action);
    }),
    registerProvider: mock((provider: Provider) => {
      runtime.providers.push(provider);
    }),
    registerEvaluator: mock((evaluator: Evaluator) => {
      runtime.evaluators.push(evaluator);
    }),
    getService: mock(),
    emitEvent: mock(),
    getSetting: mock(),
  };
  return runtime;
};

const createTestPlugin = (name: string): Plugin => ({
  name,
  description: `Test plugin ${name}`,
  actions: [{ name: `${name}_ACTION`, handler: mock() } as any],
  providers: [{ name: `${name}_PROVIDER`, get: mock() } as any],
  evaluators: [{ name: `${name}_EVALUATOR`, handler: mock() } as any],
  services: [TestService],
});

describe('Component Tracking (Consolidated)', () => {
  let runtime: IAgentRuntime;
  let pluginManager: PluginManagerService;

  beforeEach(() => {
    runtime = createMockRuntime();
    pluginManager = new PluginManagerService(runtime);
    runtime.services.set('PLUGIN_MANAGER' as ServiceTypeName, pluginManager);
  });

  it('should track and untrack all component types on load/unload', async () => {
    const plugin = createTestPlugin('test');
    const pluginId = await pluginManager.registerPlugin(plugin);

    // Load
    await pluginManager.loadPlugin({ pluginId });
    let components = pluginManager.getPluginComponents(pluginId);
    expect(components?.actions.size).toBe(1);
    expect(components?.providers.size).toBe(1);
    expect(components?.evaluators.size).toBe(1);
    expect(components?.services.size).toBe(1);

    // Unload
    await pluginManager.unloadPlugin({ pluginId });
    components = pluginManager.getPluginComponents(pluginId);
    expect(components?.actions.size).toBe(0);
    expect(components?.providers.size).toBe(0);
    expect(components?.evaluators.size).toBe(0);
    expect(components?.services.size).toBe(0);
  });
});
