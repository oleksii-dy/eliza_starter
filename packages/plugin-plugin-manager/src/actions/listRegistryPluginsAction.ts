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
import { PluginManagerServiceType } from '../types.ts';
import { TrustService } from '@elizaos/plugin-trust';

export const listRegistryPluginsAction: Action = {
  name: 'LIST_REGISTRY_PLUGINS',
  description: 'List available plugins from the ElizaOS registry',
  similes: ['registry plugins', 'available plugins', 'plugin registry', 'show registry'],
  examples: [
    [
      {
        name: '{{user1}}',
        content: {
          text: 'Show available plugins from registry',
        },
      },
      {
        name: '{{agentName}}',
        content: {
          text: "I'll list all available plugins from the ElizaOS registry.",
          actions: ['LIST_REGISTRY_PLUGINS'],
        },
      },
    ],
    [
      {
        name: '{{user1}}',
        content: {
          text: 'What plugins are in the registry?',
        },
      },
      {
        name: '{{agentName}}',
        content: {
          text: 'Let me check the plugin registry for you.',
          actions: ['LIST_REGISTRY_PLUGINS'],
        },
      },
    ],
    [
      {
        name: '{{user1}}',
        content: {
          text: 'List registry plugins',
        },
      },
      {
        name: '{{agentName}}',
        content: {
          text: "I'll fetch the list of plugins from the registry.",
          actions: ['LIST_REGISTRY_PLUGINS'],
        },
      },
    ],
  ],

  validate: async (runtime: IAgentRuntime, _message: Memory, _state?: State) => {
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

      const registry = await pluginManager.getAvailablePluginsFromRegistry();

      const plugins = Object.entries(registry).map(([name, entry]) => ({
        name,
        description: entry.description || 'No description available',
        repository: entry.repository,
      }));

      let text = '**Available Plugins from Registry:**\n\n';
      if (plugins.length === 0) {
        text += 'No plugins available in registry';
      } else {
        // Limit display to first 20 plugins to avoid overwhelming output
        const displayPlugins = plugins.slice(0, 20);
        for (const plugin of displayPlugins) {
          text += `- **${plugin.name}**: ${plugin.description}\n`;
        }

        if (plugins.length > 20) {
          text += `\n... and ${plugins.length - 20} more plugins available.\n`;
          text += '\nUse SEARCH_PLUGINS to find specific plugins by name or functionality.';
        }
      }

      // Also show installed plugins
      const installedPlugins = pluginManager.listInstalledPlugins();
      if (installedPlugins.length > 0) {
        text += '\n\n**Installed Registry Plugins:**\n';
        for (const plugin of installedPlugins) {
          text += `- **${plugin.name}** v${plugin.version} (${plugin.status})`;
          if (plugin.status === 'needs_configuration') {
            text += ' - Needs configuration';
          }
          text += '\n';
        }
      }

      // Check permissions
      const trustService = runtime.getService<TrustService>('TRUST');
      const canInstall = trustService
        ? await (trustService as any).checkPermission(message.entityId, 'plugin:install')
        : true;

      const suggestions: string[] = [];

      if (canInstall) {
        suggestions.push('Use INSTALL_PLUGIN_FROM_REGISTRY to install a plugin');
      }
      suggestions.push('Use SEARCH_PLUGINS to find specific plugins');

      if (installedPlugins.some((p) => p.status === 'needs_configuration')) {
        suggestions.push('Use START_PLUGIN_CONFIGURATION to configure installed plugins');
      }

      if (suggestions.length > 0) {
        text += `\n\n**Available Actions:**\n${suggestions.map((s) => `- ${s}`).join('\n')}`;
      }

      await callback?.({
        text,
        actions: ['LIST_REGISTRY_PLUGINS'],
        data: {
          availableCount: plugins.length,
          installedCount: installedPlugins.length,
        },
      });

      return {
        text,
        data: {
          availablePlugins: plugins,
          installedPlugins,
        },
        values: {
          availableCount: plugins.length,
          installedCount: installedPlugins.length,
        },
      };
    } catch (_error) {
      logger.error('[LIST_REGISTRY_PLUGINS] Error:', _error);

      await callback?.({
        text: `Error listing registry plugins: ${_error instanceof Error ? _error.message : String(_error)}`,
        actions: ['LIST_REGISTRY_PLUGINS'],
      });

      throw _error;
    }
  },
};
