import {
  type Action,
  type IAgentRuntime,
  type Memory,
  type State,
  type HandlerCallback,
  type ActionResult,
  logger,
} from '@elizaos/core';
import { PluginManagerService } from '../services/pluginManagerService.ts';
import { PluginManagerServiceType, type PluginState, PluginStatus } from '../types.ts';

export const getPluginStateAction: Action = {
  name: 'GET_PLUGIN_STATE',
  description: 'Get the current state of all plugins including loaded status, missing environment variables, and errors',
  similes: ['plugin state', 'plugin status', 'show plugins', 'list plugins'],
  examples: [
    [
      {
        name: '{{user1}}',
        content: {
          text: 'Show plugin state',
        },
      },
      {
        name: '{{agentName}}',
        content: {
          text: 'I\'ll show you the current state of all plugins.',
          actions: ['GET_PLUGIN_STATE'],
        },
      },
    ],
    [
      {
        name: '{{user1}}',
        content: {
          text: 'List all plugins and their status',
        },
      },
      {
        name: '{{agentName}}',
        content: {
          text: 'Let me get the status of all registered plugins.',
          actions: ['GET_PLUGIN_STATE'],
        },
      },
    ],
    [
      {
        name: '{{user1}}',
        content: {
          text: 'Which plugins have errors?',
        },
      },
      {
        name: '{{agentName}}',
        content: {
          text: 'I\'ll check which plugins are experiencing errors.',
          actions: ['GET_PLUGIN_STATE'],
        },
      },
    ],
  ],

  validate: async (runtime: IAgentRuntime, message: Memory, state?: State) => {
    const pluginManager = runtime.getService(PluginManagerServiceType.PLUGIN_MANAGER);
    return !!pluginManager;
  },

  handler: async (
    runtime: IAgentRuntime,
    message: Memory,
    state?: State,
    options?: { [key: string]: unknown },
    callback?: HandlerCallback
  ): Promise<ActionResult> => {
    try {
      const pluginManager = runtime.getService(
        PluginManagerServiceType.PLUGIN_MANAGER
      ) as PluginManagerService;

      if (!pluginManager) {
        throw new Error('Plugin Manager service is not available');
      }

      const plugins = pluginManager.getAllPlugins();
      const loadedPlugins = plugins.filter((p) => p.status === PluginStatus.LOADED);
      const errorPlugins = plugins.filter((p) => p.status === PluginStatus.ERROR);
      const readyPlugins = plugins.filter((p) => p.status === PluginStatus.READY);
      const buildingPlugins = plugins.filter((p) => p.status === PluginStatus.BUILDING);

      // Format plugin information
      const formatPlugin = (plugin: PluginState) => {
        const parts: string[] = [`${plugin.name} (${plugin.status})`];

        if (plugin.missingEnvVars?.length > 0) {
          parts.push(`Missing ENV vars: ${plugin.missingEnvVars.join(', ')}`);
        }

        if (plugin.error) {
          parts.push(`Error: ${plugin.error}`);
        }

        if (plugin.loadedAt) {
          parts.push(`Loaded at: ${new Date(plugin.loadedAt).toLocaleString()}`);
        }

        return parts.join(' - ');
      };

      const sections: string[] = [];

      if (loadedPlugins.length > 0) {
        sections.push(
          '**Loaded Plugins:**\n' + loadedPlugins.map((p) => `- ${formatPlugin(p)}`).join('\n')
        );
      }

      if (errorPlugins.length > 0) {
        sections.push(
          '**Plugins with Errors:**\n' + errorPlugins.map((p) => `- ${formatPlugin(p)}`).join('\n')
        );
      }

      if (readyPlugins.length > 0) {
        sections.push(
          '**Ready to Load:**\n' + readyPlugins.map((p) => `- ${formatPlugin(p)}`).join('\n')
        );
      }

      if (buildingPlugins.length > 0) {
        sections.push(
          '**Building:**\n' + buildingPlugins.map((p) => `- ${formatPlugin(p)}`).join('\n')
        );
      }

      // Collect all missing environment variables
      const allMissingEnvVars = new Set<string>();
      plugins.forEach((p) => {
        p.missingEnvVars?.forEach((v) => allMissingEnvVars.add(v));
      });

      if (allMissingEnvVars.size > 0) {
        sections.push(
          `**All Missing Environment Variables:**\n${Array.from(allMissingEnvVars)
            .map((v) => `- ${v}`)
            .join('\n')}`
        );
      }

      const text =
        sections.length > 0
          ? sections.join('\n\n')
          : 'No plugins registered in the Plugin Manager.';

      // Check permissions for various actions
      const trustService = runtime.getService('TRUST') as any;
      const canLoad = trustService ? 
        await trustService.checkPermission(message.entityId, 'plugin:load') : 
        true;
      const canUnload = trustService ? 
        await trustService.checkPermission(message.entityId, 'plugin:unload') : 
        true;

      let actionText = text;
      const suggestions: string[] = [];

      if (readyPlugins.length > 0 && canLoad) {
        suggestions.push('Use LOAD_PLUGIN to load ready plugins');
      }
      if (loadedPlugins.length > 0 && canUnload) {
        suggestions.push('Use UNLOAD_PLUGIN to unload plugins');
      }
      if (allMissingEnvVars.size > 0) {
        suggestions.push('Use START_PLUGIN_CONFIGURATION to configure missing environment variables');
      }
      if (errorPlugins.length > 0) {
        suggestions.push('Use CHECK_PLUGIN_HEALTH for detailed error information');
      }

      if (suggestions.length > 0) {
        actionText += '\n\n**Available Actions:**\n' + suggestions.map(s => `- ${s}`).join('\n');
      }

      await callback?.({
        text: actionText,
        actions: ['GET_PLUGIN_STATE'],
        data: {
          totalPlugins: plugins.length,
          loadedCount: loadedPlugins.length,
          errorCount: errorPlugins.length,
          readyCount: readyPlugins.length,
          buildingCount: buildingPlugins.length,
          missingEnvVars: Array.from(allMissingEnvVars),
        },
      });

      return {
        text,
        data: {
          plugins: plugins.map((p) => ({
            id: p.id,
            name: p.name,
            status: p.status,
            error: p.error,
            missingEnvVars: p.missingEnvVars,
            createdAt: p.createdAt,
            loadedAt: p.loadedAt,
            unloadedAt: p.unloadedAt,
          })),
        },
        values: {
          totalPlugins: plugins.length,
          loadedCount: loadedPlugins.length,
          errorCount: errorPlugins.length,
          readyCount: readyPlugins.length,
          buildingCount: buildingPlugins.length,
          missingEnvVars: Array.from(allMissingEnvVars),
        },
      };
    } catch (error) {
      logger.error('[GET_PLUGIN_STATE] Error:', error);
      
      await callback?.({
        text: `Error getting plugin state: ${error instanceof Error ? error.message : String(error)}`,
        actions: ['GET_PLUGIN_STATE'],
      });

      throw error;
    }
  },
}; 