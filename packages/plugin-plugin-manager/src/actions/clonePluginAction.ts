import {
  type Action,
  type ActionResult,
  type HandlerCallback,
  type IAgentRuntime,
  type Memory,
  type State,
  elizaLogger,
} from '@elizaos/core';
import * as path from 'node:path';
import { PluginManagerService } from '../services/pluginManagerService.ts';
import { PluginManagerServiceType } from '../types.ts';
export const clonePluginAction: Action = {
  name: 'CLONE_PLUGIN',
  similes: ['clone plugin', 'download plugin', 'get plugin source', 'fetch plugin code'],

  description: 'Clone a plugin repository for local development and modification',

  examples: [
    [
      {
        name: '{{user1}}',
        content: {
          text: 'Clone the weather plugin so I can modify it',
          actions: ['CLONE_PLUGIN'],
        },
      },
      {
        name: '{{agentName}}',
        content: {
          text: "I'll clone the weather plugin for you to modify locally.",
          actions: ['CLONE_PLUGIN'],
        },
      },
      {
        name: '{{agentName}}',
        content: {
          text: 'Successfully cloned @elizaos/plugin-weather to ./cloned-plugins/plugin-weather\n\nYou can now:\n- Edit the plugin code\n- Run tests with `npm test`\n- Build with `npm run build`\n- Use the plugin-autocoder to make modifications',
          actions: ['CLONE_PLUGIN'],
        },
      },
    ],
  ],

  validate: async (runtime: IAgentRuntime, message: Memory): Promise<boolean> => {
    // Simply check if the plugin manager service is available
    const pluginManager = runtime.getService(
      PluginManagerServiceType.PLUGIN_MANAGER
    ) as PluginManagerService;
    return !!pluginManager;
  },

  handler: async (
    runtime: IAgentRuntime,
    message: Memory,
    state?: State,
    options?: any,
    callback?: HandlerCallback
  ): Promise<ActionResult> => {
    elizaLogger.info('[clonePluginAction] Starting plugin clone');

    const pluginManager = runtime.getService(
      PluginManagerServiceType.PLUGIN_MANAGER
    ) as PluginManagerService;
    if (!pluginManager) {
      if (callback) {
        await callback({
          text: 'Plugin manager service is not available.',
          actions: ['CLONE_PLUGIN'],
        });
      }
      return {
        text: 'Plugin manager service is not available.',
      };
    }

    // Get plugin name from structured data, not from parsing text
    const pluginName =
      (message.content as any)?.pluginName || state?.pluginName || options?.pluginName;

    if (!pluginName) {
      if (callback) {
        await callback({
          text: 'Please specify which plugin you want to clone.',
          actions: ['CLONE_PLUGIN'],
        });
      }
      return {
        text: 'Please specify which plugin you want to clone.',
      };
    }

    try {
      if (callback) {
        await callback({
          text: `Cloning ${pluginName}...`,
          actions: ['CLONE_PLUGIN'],
        });
      }

      // Clone the plugin
      // For now, we'll use a simplified approach
      // In a real implementation, this would look up the plugin in the registry
      // and clone its repository
      const registryPlugins = await pluginManager.getAvailablePluginsFromRegistry();
      const pluginEntry = Object.values(registryPlugins).find(
        (p) =>
          p.name === pluginName ||
          p.name.endsWith(pluginName) ||
          p.name.includes(pluginName.replace('plugin-', ''))
      );

      if (!pluginEntry) {
        throw new Error(`Plugin ${pluginName} not found in registry`);
      }

      const clonePath = path.join(
        './cloned-plugins',
        pluginEntry.name.split('/').pop() || pluginName
      );
      const cloneResult = await pluginManager.cloneRepository(
        pluginEntry.repository || pluginEntry.git?.repo || '',
        clonePath
      );

      const result = {
        success: cloneResult.success,
        error: cloneResult.error,
        pluginName: pluginEntry.name,
        localPath: clonePath,
        hasTests: true, // Assume tests exist
        dependencies: {}, // Would need to read package.json
      };

      if (!result.success) {
        if (callback) {
          await callback({
            text: `Failed to clone plugin: ${result.error}`,
            actions: ['CLONE_PLUGIN'],
          });
        }
        return {
          text: `Failed to clone plugin: ${result.error}`,
          data: {
            success: false,
          },
        };
      }

      // Prepare response with helpful information
      let responseText = `Successfully cloned **${result.pluginName}** to \`${result.localPath}\`\n\n`;
      responseText += 'You can now:\n';
      responseText += '- Edit the plugin code in your preferred editor\n';
      responseText += '- Run tests with `npm test` or `pnpm test`\n';
      responseText += '- Build with `npm run build` or `pnpm build`\n';
      responseText += '- Use the plugin-autocoder to make AI-assisted modifications\n';

      if (result.hasTests) {
        responseText +=
          '\n**Note:** This plugin has existing tests. Run them to ensure everything works before making changes.';
      }

      if (result.dependencies && Object.keys(result.dependencies).length > 0) {
        responseText += '\n\n**Dependencies to install:**\n';
        responseText += '```bash\ncd ' + result.localPath + '\nnpm install\n```';
      }

      if (callback) {
        await callback({
          text: responseText,
          actions: ['CLONE_PLUGIN'],
        });
      }

      // Optionally register the cloned plugin for development
      let pluginId: string | undefined;
      if (result.localPath) {
        try {
          const absolutePath = path.resolve(result.localPath);
          const plugin = await import(absolutePath);
          if (plugin.default) {
            pluginId = await pluginManager.registerPlugin(plugin.default);
            elizaLogger.info(`[clonePluginAction] Registered cloned plugin with ID: ${pluginId}`);
          }
        } catch (error) {
          elizaLogger.warn('[clonePluginAction] Could not auto-register cloned plugin:', error);
        }
      }

      return {
        text: responseText,
        data: {
          success: true,
          pluginName: result.pluginName,
          localPath: result.localPath,
          pluginId: pluginId,
        },
      };
    } catch (error) {
      elizaLogger.error('[clonePluginAction] Error cloning plugin:', error);

      const errorMessage = `Error cloning plugin: ${error instanceof Error ? error.message : String(error)}`;

      if (callback) {
        await callback({
          text: errorMessage,
          actions: ['CLONE_PLUGIN'],
        });
      }

      return {
        text: errorMessage,
        data: {
          success: false,
        },
      };
    }
  },
};

// Removed extractPluginName function - plugin names should come from structured data
