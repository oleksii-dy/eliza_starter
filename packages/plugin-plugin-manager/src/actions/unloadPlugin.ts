import {
  type Action,
  type IAgentRuntime,
  type Memory,
  type State,
  logger,
  type HandlerCallback,
} from '@elizaos/core';
import { PluginManagerService } from '../services/pluginManagerService.ts';
import { PluginManagerServiceType } from '../types.ts';
import { type ActionResult } from '@elizaos/core';

export const unloadPluginAction: Action = {
  name: 'UNLOAD_PLUGIN',
  similes: ['unload plugin', 'disable plugin', 'deactivate plugin', 'stop plugin', 'remove plugin'],
  description: 'Unload a plugin that is currently loaded (except original plugins)',

  examples: [
    [
      {
        name: 'Autoliza',
        content: {
          text: 'I need to unload the example-plugin',
          actions: ['UNLOAD_PLUGIN'],
        },
      },
      {
        name: 'Autoliza',
        content: {
          text: 'Unloading the example-plugin now.',
          actions: ['UNLOAD_PLUGIN'],
          simple: true,
        },
      },
    ],
    [
      {
        name: 'Autoliza',
        content: {
          text: 'Disable the test plugin that is running',
          actions: ['UNLOAD_PLUGIN'],
        },
      },
      {
        name: 'Autoliza',
        content: {
          text: "I'll disable the test plugin for you.",
          actions: ['UNLOAD_PLUGIN'],
          simple: true,
        },
      },
    ],
  ],

  async validate(runtime: IAgentRuntime, message: Memory): Promise<boolean> {
    const pluginManager = runtime.getService(
      PluginManagerServiceType.PLUGIN_MANAGER
    ) as PluginManagerService;
    return !!pluginManager;
  },

  async handler(
    runtime: IAgentRuntime,
    message: Memory,
    state?: State,
    options?: Record<string, any>,
    callback?: HandlerCallback
  ): Promise<ActionResult> {
    const pluginManager = runtime.getService(
      PluginManagerServiceType.PLUGIN_MANAGER
    ) as PluginManagerService;

    if (!pluginManager) {
      if (callback) {
        await callback({
          text: 'Plugin Manager service is not available.',
          actions: ['UNLOAD_PLUGIN'],
        });
      }
      return {
        text: 'Plugin Manager service is not available.',
      };
    }

    try {
      // Get plugin name from structured data
      const pluginName =
        (message.content as any)?.pluginName || state?.pluginName || options?.pluginName;

      if (!pluginName) {
        if (callback) {
          await callback({
            text: 'Please specify which plugin you would like to unload.',
            actions: ['UNLOAD_PLUGIN'],
          });
        }
        return {
          text: 'Please specify which plugin you would like to unload.',
        };
      }

      // Find the plugin by name to get its ID
      const plugins = pluginManager.getAllPlugins();
      const pluginToUnload = plugins.find((p) => p.name === pluginName);

      if (!pluginToUnload) {
        const errorMessage = `Plugin "${pluginName}" not found.`;
        if (callback) {
          await callback({
            text: errorMessage,
            actions: ['UNLOAD_PLUGIN'],
          });
        }
        return {
          text: errorMessage,
        };
      }

      if (pluginToUnload.status !== 'loaded') {
        const errorMessage = `Plugin "${pluginName}" is not currently loaded (status: ${pluginToUnload.status}).`;
        if (callback) {
          await callback({
            text: errorMessage,
            actions: ['UNLOAD_PLUGIN'],
          });
        }
        return {
          text: errorMessage,
        };
      }

      logger.info(`[unloadPluginAction] Unloading plugin: ${pluginName}`);

      await pluginManager.unloadPlugin({ pluginId: pluginToUnload.id });

      const successMessage = `Successfully unloaded plugin: ${pluginName}`;
      if (callback) {
        await callback({
          text: successMessage,
          actions: ['UNLOAD_PLUGIN'],
        });
      }

      return {
        text: successMessage,
        data: {
          pluginName,
          status: 'unloaded',
        },
      };
    } catch (_error) {
      logger.error('[unloadPluginAction] Error unloading plugin:', _error);

      // Check if it's because it's an original plugin
      const errorMessage = _error instanceof Error ? _error.message : String(_error);
      const isOriginalPluginError = errorMessage.includes('Cannot unload original plugin');

      if (isOriginalPluginError) {
        const originalPluginMessage = 'Cannot unload this plugin because it\'s an original plugin that was loaded at startup. Only dynamically loaded plugins can be unloaded.';
        if (callback) {
          await callback({
            text: originalPluginMessage,
            actions: ['UNLOAD_PLUGIN'],
          });
        }
        return {
          text: originalPluginMessage,
          data: {
            status: 'error',
            error: 'original_plugin',
          },
        };
      } else {
        const failureMessage = `Failed to unload plugin: ${errorMessage}`;
        if (callback) {
          await callback({
            text: failureMessage,
            actions: ['UNLOAD_PLUGIN'],
          });
        }
        return {
          text: failureMessage,
          data: {
            status: 'error',
            error: errorMessage,
          },
        };
      }
    }
  },
};
