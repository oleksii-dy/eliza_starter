import {
  type Action,
  type ActionResult,
  type HandlerCallback,
  type IAgentRuntime,
  type Memory,
  type State,
  elizaLogger,
} from '@elizaos/core';

import { PluginManagerService } from '../services/pluginManagerService.ts';
import { PluginManagerServiceType, PluginStatusValues } from '../types.ts';

export const publishPluginAction: Action = {
  name: 'PUBLISH_PLUGIN',
  similes: ['publish plugin', 'release plugin', 'deploy plugin', 'push plugin to registry'],

  description:
    'Publish a plugin to npm registry or create a pull request to add it to the Eliza plugin registry',

  examples: [
    [
      {
        name: '{{user1}}',
        content: {
          text: 'Publish my weather plugin to npm',
          actions: ['PUBLISH_PLUGIN'],
        },
      },
      {
        name: '{{agentName}}',
        content: {
          text: "I'll help you publish your weather plugin to npm.",
          actions: ['PUBLISH_PLUGIN'],
        },
      },
      {
        name: '{{agentName}}',
        content: {
          text: 'Successfully published @elizaos/plugin-weather to npm!\n\nVersion: 1.0.0\nRegistry: https://www.npmjs.com/package/@elizaos/plugin-weather\n\nNext steps:\n- Create a PR to add it to the official Eliza plugin registry\n- Update the README with installation instructions',
          actions: ['PUBLISH_PLUGIN'],
        },
      },
    ],
  ],

  validate: async (runtime: IAgentRuntime, _message: Memory): Promise<boolean> => {
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
    try {
      const pluginManager = runtime.getService(
        PluginManagerServiceType.PLUGIN_MANAGER
      ) as PluginManagerService;

      if (!pluginManager) {
        if (callback) {
          await callback({
            text: 'Plugin Manager service is not available.',
            actions: ['PUBLISH_PLUGIN'],
          });
        }
        return {
          text: 'Plugin Manager service is not available.',
        };
      }

      // Get plugin name from structured data
      const pluginName =
        (message.content as any)?.pluginName || state?.pluginName || options?.pluginName;

      if (!pluginName) {
        if (callback) {
          await callback({
            text: 'Please specify which plugin you would like to publish.',
            actions: ['PUBLISH_PLUGIN'],
          });
        }
        return {
          text: 'Please specify which plugin you would like to publish.',
        };
      }

      // Get plugin state
      const pluginState = pluginManager.getPlugin(pluginName);
      if (!pluginState) {
        if (callback) {
          await callback({
            text: `Plugin ${pluginName} not found.`,
            actions: ['PUBLISH_PLUGIN'],
          });
        }
        return {
          text: `Plugin ${pluginName} not found.`,
        };
      }

      // Check if plugin is loaded and ready
      if (pluginState.status !== PluginStatusValues.LOADED) {
        const message = `Plugin ${pluginName} must be loaded before publishing. Current status: ${pluginState.status}`;
        if (callback) {
          await callback({
            text: message,
            actions: ['PUBLISH_PLUGIN'],
          });
        }
        return {
          text: message,
        };
      }

      // Publish the plugin
      const result = await pluginManager.publishPlugin(pluginName);

      const responseText = result.success
        ? `✅ Successfully published plugin ${pluginName}!\n\nPackage: ${result.packageName} v${result.version}\n${result.npmUrl ? `NPM: ${result.npmUrl}\n` : ''}${result.registryPR ? `Registry PR: ${result.registryPR}` : ''}`
        : `❌ Failed to publish plugin ${pluginName}: ${result.error}`;

      if (callback) {
        await callback({
          text: responseText,
          actions: ['PUBLISH_PLUGIN'],
        });
      }

      return {
        text: responseText,
        data: result,
      };
    } catch (_error) {
      const errorMessage = `Error in publish plugin action: ${
        _error instanceof Error ? _error.message : String(_error)
      }`;
      elizaLogger.error('[publishPluginAction]', _error);

      if (callback) {
        await callback({
          text: errorMessage,
          actions: ['PUBLISH_PLUGIN'],
        });
      }

      return {
        text: errorMessage,
        data: { error: String(_error) },
      };
    }
  },
};
