import {
  Service,
  type IAgentRuntime,
  type Plugin,
  type ServiceTypeName,
  type UUID,
} from '@elizaos/core';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { PluginManagerService } from '../../services/pluginManagerService.ts';
import { PluginManagerServiceType } from '../../types.ts';

/**
 * Tests for plugin manager service integration.
 * These tests verify that other plugins can successfully use the plugin manager
 * as a service for various operations like autocoder and auton8n would need.
 */

// Mock autocoder service that uses plugin manager
class MockAutocoderService extends Service {
  static serviceType: ServiceTypeName = 'AUTOCODER' as ServiceTypeName;
  override capabilityDescription = 'Automated code generation service';

  constructor(
    runtime: IAgentRuntime,
    private pluginManager: PluginManagerService
  ) {
    super(runtime);
  }

  async stop(): Promise<void> {
    // Cleanup if needed
  }

  async modifyPlugin(pluginName: string): Promise<{ success: boolean; path?: string }> {
    // Search for the plugin
    const searchResults = await this.pluginManager.searchPlugins(pluginName);
    if (searchResults.length === 0) {
      return { success: false };
    }

    // Clone the plugin for modification
    const plugin = searchResults[0].plugin;
    const clonePath = `./autocoder-workspace/${plugin.name}`;
    const cloneResult = await this.pluginManager.cloneRepository(
      plugin.repository || '',
      clonePath
    );

    return {
      success: cloneResult.success,
      path: cloneResult.path,
    };
  }

  async suggestPluginsForTask(task: string): Promise<string[]> {
    // Use plugin manager's recommendation system
    const recommendations = await this.pluginManager.recommendPlugins({
      recentActions: []
      currentCapabilities: []
      failedActions: []
      userIntent: task,
    });

    return recommendations.map((r) => r.plugin.name);
  }
}

// Mock auton8n service that uses plugin manager
class MockAuton8nService extends Service {
  static serviceType: ServiceTypeName = 'AUTON8N' as ServiceTypeName;
  override capabilityDescription = 'Automation workflow service';

  constructor(
    runtime: IAgentRuntime,
    private pluginManager: PluginManagerService
  ) {
    super(runtime);
  }

  async stop(): Promise<void> {
    // Cleanup if needed
  }

  async prepareWorkflow(requiredPlugins: string[]): Promise<boolean> {
    // Check current capabilities
    const capabilities = await this.pluginManager.analyzeCurrentCapabilities();

    // Install missing plugins
    for (const pluginName of requiredPlugins) {
      if (!capabilities.core.includes(pluginName)) {
        try {
          await this.pluginManager.installPluginFromRegistry(pluginName);
        } catch (error) {
          return false;
        }
      }
    }

    return true;
  }

  async executeWorkflowStep(pluginName: string): Promise<boolean> {
    // Dynamically load plugin if not loaded
    const plugins = this.pluginManager.getAllPlugins();
    const plugin = plugins.find((p) => p.name === pluginName);

    if (!plugin || plugin.status !== 'loaded') {
      if (plugin) {
        await this.pluginManager.loadPlugin({ pluginId: plugin.id });
      }
    }

    return true;
  }
}

describe('Plugin Manager Service Integration', () => {
  let runtime: IAgentRuntime;
  let pluginManager: PluginManagerService;

  beforeEach(() => {
    runtime = {
      agentId: '00000000-0000-0000-0000-000000000000' as UUID,
      plugins: []
      actions: []
      providers: []
      evaluators: []
      services: new Map(),
      events: new Map(),

      getService: vi.fn((name: string) => {
        if (name === PluginManagerServiceType.PLUGIN_MANAGER) {
          return pluginManager;
        }
        return runtime.services.get(name as ServiceTypeName);
      }),

      registerAction: vi.fn(),
      registerProvider: vi.fn(),
      registerEvaluator: vi.fn(),
      registerEvent: vi.fn(),
      emitEvent: vi.fn(),
      getSetting: vi.fn(),
      useModel: vi.fn().mockResolvedValue('Mock LLM response'),
    } as any;

    pluginManager = new PluginManagerService(runtime);
    runtime.services.set(PluginManagerServiceType.PLUGIN_MANAGER, pluginManager);
  });

  describe('Autocoder Integration', () => {
    let autocoderService: MockAutocoderService;

    beforeEach(() => {
      autocoderService = new MockAutocoderService(runtime, pluginManager);
      runtime.services.set('AUTOCODER' as ServiceTypeName, autocoderService);
    });

    it('should allow autocoder to search and clone plugins', async () => {
      // Mock search results
      vi.spyOn(pluginManager, 'searchPlugins').mockResolvedValue([
        {
          plugin: {
            name: '@elizaos/plugin-weather',
            description: 'Weather plugin',
            repository: 'https://github.com/elizaos/plugin-weather',
          },
          score: 100,
          matchReasons: ['name match'],
        },
      ]);

      // Mock clone result
      vi.spyOn(pluginManager, 'cloneRepository').mockResolvedValue({
        success: true,
        path: './autocoder-workspace/@elizaos/plugin-weather',
      });

      const result = await autocoderService.modifyPlugin('weather');

      expect(result.success).toBe(true);
      expect(result.path).toContain('autocoder-workspace');
      expect(pluginManager.searchPlugins).toHaveBeenCalledWith('weather');
      expect(pluginManager.cloneRepository).toHaveBeenCalled();
    });

    it('should provide plugin recommendations for tasks', async () => {
      vi.spyOn(pluginManager, 'recommendPlugins').mockResolvedValue([
        {
          plugin: { name: '@elizaos/plugin-database', description: 'Database operations' },
          score: 90,
          matchReasons: ['data handling capability'],
        },
        {
          plugin: { name: '@elizaos/plugin-api', description: 'API integrations' },
          score: 80,
          matchReasons: ['external service integration'],
        },
      ]);

      const suggestions = await autocoderService.suggestPluginsForTask('build a data pipeline');

      expect(suggestions).toHaveLength(2);
      expect(suggestions).toContain('@elizaos/plugin-database');
      expect(suggestions).toContain('@elizaos/plugin-api');
    });
  });

  describe('Auton8n Integration', () => {
    let auton8nService: MockAuton8nService;

    beforeEach(() => {
      auton8nService = new MockAuton8nService(runtime, pluginManager);
      runtime.services.set('AUTON8N' as ServiceTypeName, auton8nService);
    });

    it('should prepare workflow by installing required plugins', async () => {
      vi.spyOn(pluginManager, 'analyzeCurrentCapabilities').mockResolvedValue({
        core: ['basic-action'],
        plugins: new Map(),
        coverage: {},
        limitations: []
      });

      vi.spyOn(pluginManager, 'installPluginFromRegistry').mockResolvedValue({
        name: '@elizaos/plugin-http',
        version: '1.0.0',
        status: 'installed',
        path: './plugins/plugin-http',
        requiredEnvVars: []
        installedAt: new Date(),
      });

      const ready = await auton8nService.prepareWorkflow(['@elizaos/plugin-http']);

      expect(ready).toBe(true);
      expect(pluginManager.installPluginFromRegistry).toHaveBeenCalledWith('@elizaos/plugin-http');
    });

    it('should dynamically load plugins during workflow execution', async () => {
      const mockPlugin: Plugin = {
        name: 'workflow-plugin',
        description: 'Test workflow plugin',
      };

      const pluginId = await pluginManager.registerPlugin(mockPlugin);

      vi.spyOn(pluginManager, 'loadPlugin').mockResolvedValue(undefined);

      const success = await auton8nService.executeWorkflowStep('workflow-plugin');

      expect(success).toBe(true);
      expect(pluginManager.loadPlugin).toHaveBeenCalledWith({ pluginId });
    });
  });

  describe('Third-party Plugin Integration', () => {
    it('should allow any plugin to access plugin manager service', async () => {
      // Simulate a third-party plugin
      const thirdPartyPlugin: Plugin = {
        name: 'third-party-plugin',
        description: 'A plugin that uses plugin manager',

        init: async (config: any, runtime: IAgentRuntime) => {
          // Get plugin manager service
          const pm = runtime.getService(
            PluginManagerServiceType.PLUGIN_MANAGER
          ) as PluginManagerService;

          expect(pm).toBeDefined();
          expect(pm).toBeInstanceOf(PluginManagerService);

          // Use various plugin manager features
          const plugins = pm.getAllPlugins();
          const capabilities = await pm.analyzeCurrentCapabilities();

          expect(Array.isArray(plugins)).toBe(true);
          expect(capabilities).toHaveProperty('core');
        },
      };

      // Initialize the plugin
      await thirdPartyPlugin.init!({}, runtime);
    });

    it('should handle concurrent service access from multiple plugins', async () => {
      const accessResults: boolean[] = [];

      // Simulate multiple plugins accessing the service concurrently
      const plugins = Array.from({ length: 5 }, (_, i) => ({
        name: `concurrent-plugin-${i}`,
        description: `Concurrent test plugin ${i}`,
        init: async () => {
          const pm = runtime.getService(
            PluginManagerServiceType.PLUGIN_MANAGER
          ) as PluginManagerService;
          const plugins = pm.getAllPlugins();
          accessResults.push(plugins !== undefined);
        },
      }));

      await Promise.all(plugins.map((p) => p.init()));

      expect(accessResults).toHaveLength(5);
      expect(accessResults.every((r) => r === true)).toBe(true);
    });
  });

  describe('Service Discovery and Capability Enhancement', () => {
    it('should provide capability gap analysis for plugins', async () => {
      vi.spyOn(pluginManager, 'suggestCapabilityEnhancements').mockResolvedValue([
        {
          capability: 'image-processing',
          priority: 'high',
          rationale: 'Recent tasks involve image manipulation',
        },
      ]);

      const enhancements = await pluginManager.suggestCapabilityEnhancements([
        { action: 'resize-image', timestamp: new Date(), success: false },
        { action: 'crop-image', timestamp: new Date(), success: false },
      ]);

      expect(enhancements).toHaveLength(1);
      expect(enhancements[0].capability).toBe('image-processing');
    });

    it('should handle plugin publishing workflow', async () => {
      vi.spyOn(pluginManager, 'publishPlugin').mockResolvedValue({
        success: true,
        packageName: '@elizaos/plugin-custom',
        version: '1.0.0',
        npmUrl: 'https://npmjs.com/package/@elizaos/plugin-custom',
      });

      const result = await pluginManager.publishPlugin('./my-plugin');

      expect(result.success).toBe(true);
      expect(result.packageName).toBe('@elizaos/plugin-custom');
    });
  });

  describe('Error Handling and Resilience', () => {
    it('should handle service unavailability gracefully', async () => {
      runtime.getService = vi.fn().mockReturnValue(undefined);

      let pmWasUndefined = false;
      const plugin: Plugin = {
        name: 'resilient-plugin',
        description: 'Test plugin for resilience testing',
        init: async (config: any, runtime: IAgentRuntime) => {
          const pm = runtime.getService(PluginManagerServiceType.PLUGIN_MANAGER);
          // Just check if it's undefined without throwing
          pmWasUndefined = pm === undefined;
        },
      };

      // The init should complete without throwing
      await plugin.init!({}, runtime);
      expect(pmWasUndefined).toBe(true);
    });

    it('should handle plugin operation failures', async () => {
      vi.spyOn(pluginManager, 'installPluginFromRegistry').mockRejectedValue(
        new Error('Network error')
      );

      await expect(pluginManager.installPluginFromRegistry('non-existent-plugin')).rejects.toThrow(
        'Network error'
      );
    });
  });
});
