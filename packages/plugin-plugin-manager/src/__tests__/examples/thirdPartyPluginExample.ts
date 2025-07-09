import {
  Service,
  type Plugin,
  type IAgentRuntime,
  type Action,
  type ServiceTypeName,
} from '@elizaos/core';
import { PluginManagerService } from '../../services/pluginManagerService.ts';
import { PluginManagerServiceType } from '../../types.ts';

/**
 * Example of how a third-party plugin would integrate with the Plugin Manager.
 *
 * This demonstrates best practices for using the Plugin Manager service
 * in your own plugins for autocoder, auton8n, or any other capability.
 */

// Example 1: A plugin that uses Plugin Manager for capability discovery
export const capabilityAwarePlugin: Plugin = {
  name: 'capability-aware-plugin',
  description: 'A plugin that adapts based on available capabilities',

  init: async (config: any, runtime: IAgentRuntime) => {
    // Get the plugin manager service
    const pluginManager = runtime.getService(
      PluginManagerServiceType.PLUGIN_MANAGER
    ) as PluginManagerService;

    if (!pluginManager) {
      console.warn('[CapabilityAware] Plugin Manager not available, running in basic mode');
      return;
    }

    // Analyze current capabilities
    const capabilities = await pluginManager.analyzeCurrentCapabilities();
    console.log('[CapabilityAware] Current capabilities:', capabilities.core);

    // Check if we have required capabilities
    const requiredCapabilities = ['database', 'http-client'];
    const missingCapabilities = requiredCapabilities.filter(
      (req) => !capabilities.core.some((cap) => cap.includes(req))
    );

    if (missingCapabilities.length > 0) {
      console.log('[CapabilityAware] Missing capabilities:', missingCapabilities);

      // Search for and suggest plugins
      for (const capability of missingCapabilities) {
        const searchResults = await pluginManager.searchPlugins(capability);
        if (searchResults.length > 0) {
          console.log(
            `[CapabilityAware] Suggested plugin for ${capability}: ${searchResults[0].plugin.name}`
          );
        }
      }
    }
  },

  actions: [
    {
      name: 'ADAPTIVE_ACTION',
      description: 'An action that adapts based on available plugins',
      similes: ['adapt', 'smart action'],
      validate: async () => true,
      handler: async (runtime: IAgentRuntime) => {
        const pluginManager = runtime.getService(
          PluginManagerServiceType.PLUGIN_MANAGER
        ) as PluginManagerService;

        if (!pluginManager) {
          return { text: 'Running in basic mode without plugin manager' };
        }

        // Check if specific plugins are loaded
        const plugins = pluginManager.getAllPlugins();
        const hasDatabase = plugins.some(
          (p) => p.status === 'loaded' && p.name.includes('database')
        );

        if (hasDatabase) {
          return { text: 'Executing with database support enabled' };
        } else {
          return { text: 'Executing without database support' };
        }
      },
      examples: [],
    },
  ],
};

// Example 2: A service that manages plugin lifecycle for workflows
export class WorkflowManagerService extends Service {
  static serviceType: ServiceTypeName = 'WORKFLOW_MANAGER' as ServiceTypeName;
  override capabilityDescription = 'Manages plugin lifecycle for workflow execution';

  private pluginManager: PluginManagerService | null = null;

  async initialize() {
    this.pluginManager = this.runtime.getService(
      PluginManagerServiceType.PLUGIN_MANAGER
    ) as PluginManagerService;

    if (!this.pluginManager) {
      throw new Error('WorkflowManager requires Plugin Manager service');
    }
  }

  async stop(): Promise<void> {
    // Cleanup
  }

  async prepareWorkflow(workflowSteps: Array<{ plugin: string; action: string }>) {
    if (!this.pluginManager) {
      throw new Error('Plugin Manager not initialized');
    }

    // Ensure all required plugins are available
    for (const step of workflowSteps) {
      const plugins = this.pluginManager.getAllPlugins();
      const plugin = plugins.find((p) => p.name === step.plugin);

      if (!plugin) {
        // Try to install from registry
        console.log(`[WorkflowManager] Installing required plugin: ${step.plugin}`);
        await this.pluginManager.installPluginFromRegistry(step.plugin);
      } else if (plugin.status !== 'loaded') {
        // Load the plugin
        console.log(`[WorkflowManager] Loading plugin: ${step.plugin}`);
        await this.pluginManager.loadPlugin({ pluginId: plugin.id });
      }
    }
  }

  async executeWorkflow(workflowSteps: Array<{ plugin: string; action: string }>) {
    await this.prepareWorkflow(workflowSteps);

    // Execute each step
    for (const step of workflowSteps) {
      console.log(`[WorkflowManager] Executing ${step.plugin}.${step.action}`);
      // In real implementation, would find and execute the action
    }
  }
}

// Example 3: An autocoder-style plugin that modifies other plugins
export const pluginModifierPlugin: Plugin = {
  name: 'plugin-modifier',
  description: 'Modifies and enhances other plugins',

  actions: [
    {
      name: 'ENHANCE_PLUGIN',
      description: 'Enhance a plugin with additional capabilities',
      similes: ['enhance', 'modify plugin', 'upgrade plugin'],
      validate: async () => true,
      handler: async (runtime: IAgentRuntime, message: any) => {
        const pluginManager = runtime.getService(
          PluginManagerServiceType.PLUGIN_MANAGER
        ) as PluginManagerService;

        if (!pluginManager) {
          return { text: 'Plugin Manager service not available' };
        }

        // Extract plugin name from message
        const pluginName = message.content?.text?.match(/enhance\s+(\S+)/i)?.[1];
        if (!pluginName) {
          return { text: 'Please specify which plugin to enhance' };
        }

        try {
          // Search for the plugin
          const searchResults = await pluginManager.searchPlugins(pluginName);
          if (searchResults.length === 0) {
            return { text: `Plugin ${pluginName} not found` };
          }

          const targetPlugin = searchResults[0].plugin;

          // Clone the plugin for modification
          const clonePath = `./enhanced-plugins/${targetPlugin.name}`;
          const cloneResult = await pluginManager.cloneRepository(
            targetPlugin.repository || '',
            clonePath
          );

          if (!cloneResult.success) {
            return { text: `Failed to clone plugin: ${cloneResult.error}` };
          }

          // In a real implementation, would:
          // 1. Analyze the plugin code
          // 2. Generate enhancements
          // 3. Test the modifications
          // 4. Create a pull request

          return {
            text: `Successfully cloned ${targetPlugin.name} to ${clonePath}. Ready for enhancement!`,
            data: {
              pluginName: targetPlugin.name,
              clonePath,
              nextSteps: [
                'Analyze plugin structure',
                'Generate enhancement code',
                'Run tests',
                'Create pull request',
              ],
            },
          };
        } catch (_error) {
          return {
            text: `Error enhancing plugin: ${_error instanceof Error ? _error.message : String(_error)}`,
          };
        }
      },
      examples: [],
    },
  ],
};

// Example 4: Integration patterns for common use cases
export const integrationPatterns = {
  // Pattern: Check if a capability exists before using it
  async ensureCapability(runtime: IAgentRuntime, capability: string): Promise<boolean> {
    const pluginManager = runtime.getService(
      PluginManagerServiceType.PLUGIN_MANAGER
    ) as PluginManagerService;
    if (!pluginManager) {
      return false;
    }

    const capabilities = await pluginManager.analyzeCurrentCapabilities();
    return capabilities.core.some((c) => c.includes(capability));
  },

  // Pattern: Install missing plugin automatically
  async ensurePlugin(runtime: IAgentRuntime, pluginName: string): Promise<boolean> {
    const pluginManager = runtime.getService(
      PluginManagerServiceType.PLUGIN_MANAGER
    ) as PluginManagerService;
    if (!pluginManager) {
      return false;
    }

    const plugins = pluginManager.getAllPlugins();
    const exists = plugins.some((p) => p.name === pluginName && p.status === 'loaded');

    if (!exists) {
      try {
        await pluginManager.installPluginFromRegistry(pluginName);
        const pluginId = plugins.find((p) => p.name === pluginName)?.id;
        if (pluginId) {
          await pluginManager.loadPlugin({ pluginId });
        }
        return true;
      } catch {
        return false;
      }
    }

    return true;
  },

  // Pattern: Get recommendations for a task
  async getRecommendations(runtime: IAgentRuntime, task: string): Promise<string[]> {
    const pluginManager = runtime.getService(
      PluginManagerServiceType.PLUGIN_MANAGER
    ) as PluginManagerService;
    if (!pluginManager) {
      return [];
    }

    const recommendations = await pluginManager.recommendPlugins({
      recentActions: [],
      currentCapabilities: [],
      failedActions: [],
      userIntent: task,
    });

    return recommendations.map((r) => r.plugin.name);
  },
};
