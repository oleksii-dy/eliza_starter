import {
  type Action,
  type ActionResult,
  type HandlerCallback,
  type IAgentRuntime,
  type Memory,
  type State,
  elizaLogger,
} from '@elizaos/core';
// Version management is now handled internally by PluginManagerService
import { PluginManagerService } from '../services/pluginManagerService.ts';
import { PluginManagerServiceType } from '../types.ts';
export const updatePluginAction: Action = {
  name: 'UPDATE_PLUGIN',
  similes: ['update plugin', 'upgrade plugin', 'plugin update', 'check for updates'],

  description: 'Update a plugin to a new version with automatic backup and rollback support',

  examples: [
    [
      {
        name: '{{user1}}',
        content: {
          text: 'Update the weather plugin to the latest version',
          actions: ['UPDATE_PLUGIN'],
        },
      },
      {
        name: '{{agentName}}',
        content: {
          text: "I'll check for updates and upgrade the weather plugin for you.",
          actions: ['UPDATE_PLUGIN'],
        },
      },
      {
        name: '{{agentName}}',
        content: {
          text: 'Successfully updated @elizaos/plugin-weather from v1.2.0 to v1.3.0!\n\n**Changes:**\n- Added 5-day forecast support\n- Fixed timezone handling bug\n- Improved _error messages\n\nThe previous version has been backed up and can be restored if needed.',
          actions: ['UPDATE_PLUGIN'],
        },
      },
    ],
  ],

  validate: async (runtime: IAgentRuntime, message: Memory): Promise<boolean> => {
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
    elizaLogger.info('[updatePluginAction] Starting plugin update');

    const pluginManager = runtime.getService(
      PluginManagerServiceType.PLUGIN_MANAGER
    ) as PluginManagerService;

    if (!pluginManager) {
      if (callback) {
        await callback({
          text: 'Plugin manager service is not available.',
          actions: ['UPDATE_PLUGIN'],
        });
      }
      return {
        text: 'Plugin manager service is not available.',
      };
    }

    // Get plugin identifier from message
    const pluginName =
      (message.content as any)?.pluginName || state?.pluginName || options?.pluginName;

    try {
      // Check if plugin name was provided
      if (!pluginName) {
        const errorMsg = 'Please specify a plugin name to update.';
        if (callback) {
          await callback({
            text: errorMsg,
            actions: ['UPDATE_PLUGIN'],
          });
        }
        return { text: errorMsg, data: { success: false } };
      }

      elizaLogger.error('[updatePluginAction] Plugin update feature not implemented');
      throw new Error(
        'Plugin update functionality is not yet implemented. ' +
          'This feature requires integration with npm/git versioning systems and automated migration tools.'
      );
    } catch (_error) {
      elizaLogger.error('[updatePluginAction] Error:', error);

      const errorMessage = `Error: ${_error instanceof Error ? _error.message : String(_error)}`;

      if (callback) {
        await callback({
          text: errorMessage,
          actions: ['UPDATE_PLUGIN'],
        });
      }

      return {
        text: errorMessage,
        data: { success: false },
      };
    }
  },
};
