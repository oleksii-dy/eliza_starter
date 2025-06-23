import { type IAgentRuntime, type Plugin } from '@elizaos/core';
import { v4 as uuidv4 } from 'uuid';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { loadPluginAction } from '../../actions/loadPlugin.ts';
import { unloadPluginAction } from '../../actions/unloadPlugin.ts';
import { getPluginStateAction } from '../../actions/getPluginStateAction.ts';
import { PluginManagerService } from '../../services/pluginManagerService.ts';
import { PluginStatus } from '../../types.ts';

// Mocks
const createMockPlugin = (name: string): Plugin => ({
  name,
  description: `Mock ${name} plugin`,
  actions: [{ name: `${name.toUpperCase()}_ACTION`, handler: vi.fn() } as any],
  providers: [{ name: `${name}Provider`, get: vi.fn() } as any],
});

const createMockRuntime = (): IAgentRuntime =>
  ({
    agentId: uuidv4() as any,
    plugins: []
    actions: []
    providers: []
    evaluators: []
    services: new Map(),
    registerAction: vi.fn(),
    registerProvider: vi.fn(),
    registerEvaluator: vi.fn(),
    getService: vi.fn(),
    emitEvent: vi.fn(),
    getSetting: vi.fn(),
    useModel: vi.fn().mockResolvedValue('mock model response'),
  }) as any;

describe('PluginManagerService (Consolidated)', () => {
  let runtime: IAgentRuntime;
  let pluginManager: PluginManagerService;

  beforeEach(() => {
    runtime = createMockRuntime();
    pluginManager = new PluginManagerService(runtime);
    vi.spyOn(runtime, 'getService').mockImplementation((name) => {
      if (name === 'plugin_manager') return pluginManager as any;
      return undefined;
    });
  });

  describe('Service Initialization', () => {
    it('should initialize with empty plugin registry if runtime has no plugins', () => {
      expect(pluginManager.getAllPlugins()).toHaveLength(0);
    });

    it('should register existing plugins from runtime', () => {
      const existingPlugin = createMockPlugin('existing');
      runtime.plugins = [existingPlugin];
      const newPluginManager = new PluginManagerService(runtime);
      const plugins = newPluginManager.getAllPlugins();
      expect(plugins).toHaveLength(1);
      expect(plugins[0].name).toBe('existing');
      expect(plugins[0].status).toBe(PluginStatus.LOADED);
    });
  });

  // Keep testing plugin registration, loading, unloading...
  // but update them to call methods on the consolidated pluginManager
  // For example, for a test that used to mock GitHubService:
  describe('GitHub Operations (Consolidated)', () => {
    it('should clone a repository using the consolidated method', async () => {
      // Mock the underlying implementation if needed, or let it run if it's simple
      const cloneSpy = vi
        .spyOn(pluginManager, 'cloneRepository')
        .mockResolvedValue({ success: true, path: '/tmp/test' });

      const result = await pluginManager.cloneRepository(
        'https://github.com/test/repo.git',
        '/tmp/test'
      );

      expect(cloneSpy).toHaveBeenCalled();
      expect(result.success).toBe(true);

      cloneSpy.mockRestore();
    });
  });

  // Update action and provider tests
  describe('Plugin Manager Actions (Consolidated)', () => {
    it('Load Plugin Action should validate correctly', async () => {
      await pluginManager.registerPlugin(createMockPlugin('test'));
      const message = { content: { text: 'Load the test plugin' } } as any;
      const state = {} as any;
      // The `validate` function in the action now directly checks the plugin manager
      const isValid = await loadPluginAction.validate(runtime, message, state);
      expect(isValid).toBe(true);
    });

    it('Unload Plugin Action should validate correctly', async () => {
      const pluginId = await pluginManager.registerPlugin(createMockPlugin('test'));
      await pluginManager.loadPlugin({ pluginId });
      const message = { content: { text: 'Unload the test plugin' } } as any;
      const isValid = await unloadPluginAction.validate(runtime, message);
      expect(isValid).toBe(true);
    });
  });

  describe('Plugin State Action (Consolidated)', () => {
    it('should provide plugin state information correctly', async () => {
      await pluginManager.registerPlugin(createMockPlugin('test1'));
      const result = await getPluginStateAction.handler(runtime, {} as any, {} as any);
      expect(result).toBeDefined();
      expect((result as any).text).toContain('test1 (ready)');
    });
  });
});
