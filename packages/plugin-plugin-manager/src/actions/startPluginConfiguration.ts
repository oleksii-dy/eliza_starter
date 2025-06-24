import {
  logger,
  elizaLogger,
  type Action,
  type ActionResult,
  type HandlerCallback,
  type IAgentRuntime,
  type Memory,
  type State,
} from '@elizaos/core';
import { PluginManagerService } from '../services/pluginManagerService.ts';
import {
  PluginManagerServiceType,
  PluginStatusValues,
  type PluginConfigurationRequest,
} from '../types.ts';

export const startPluginConfigurationAction: Action = {
  name: 'START_PLUGIN_CONFIGURATION',
  similes: ['CONFIGURE_PLUGIN', 'SETUP_PLUGIN'],
  description: 'Start the configuration process for a plugin that requires setup',

  validate: async (runtime: IAgentRuntime, _message: Memory, _state?: State): Promise<boolean> => {
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
      elizaLogger.info('[startPluginConfiguration] Starting plugin configuration flow');

      const pluginManager = runtime.getService(
        PluginManagerServiceType.PLUGIN_MANAGER
      ) as PluginManagerService;

      if (!pluginManager) {
        const errorMessage = 'Plugin Manager service is not available.';
        if (callback) {
          await callback({
            text: errorMessage,
            actions: ['START_PLUGIN_CONFIGURATION'],
          });
        }
        return {
          text: errorMessage,
        };
      }

      // Get plugin name from structured data
      const pluginName =
        (message.content as any)?.pluginName || state?.pluginName || options?.pluginName;

      if (!pluginName) {
        const message = 'Please specify which plugin you would like to configure.';
        if (callback) {
          await callback({
            text: message,
            actions: ['START_PLUGIN_CONFIGURATION'],
          });
        }
        return {
          text: message,
        };
      }

      // Get plugin state
      const pluginState = pluginManager.getPlugin(pluginName);
      if (!pluginState) {
        const message = `Plugin ${pluginName} not found.`;
        if (callback) {
          await callback({
            text: message,
            actions: ['START_PLUGIN_CONFIGURATION'],
          });
        }
        return {
          text: message,
        };
      }

      // Check if plugin needs configuration
      if (
        pluginState.status !== PluginStatusValues.NEEDS_CONFIGURATION &&
        (!pluginState.missingEnvVars || pluginState.missingEnvVars.length === 0)
      ) {
        const message = `Plugin ${pluginName} doesn't need configuration. Status: ${pluginState.status}`;
        if (callback) {
          await callback({
            text: message,
            actions: ['START_PLUGIN_CONFIGURATION'],
          });
        }
        return {
          text: message,
        };
      }

      // Create configuration dialog
      const configRequest: PluginConfigurationRequest = {
        pluginName: pluginState.name,
        requiredVars: pluginState.requiredConfiguration || [],
        missingVars: pluginState.missingEnvVars || [],
        optionalVars: [],
      };

      // Update plugin status
      pluginManager.updatePluginState(pluginState.id, {
        status: PluginStatusValues.CONFIGURATION_IN_PROGRESS,
      });

      // Emit configuration started event
      // Note: Event emission removed as EventType is not available
      // This should be handled at a higher level if needed

      const responseText = `Starting configuration for ${pluginName}.\n\nMissing environment variables:\n${
        pluginState.missingEnvVars?.map((v) => `- ${v}`).join('\n') || 'None'
      }\n\nI'll guide you through setting up each required variable.`;

      if (callback) {
        await callback({
          text: responseText,
          actions: ['START_PLUGIN_CONFIGURATION'],
        });
      }

      return {
        text: responseText,
        data: {
          pluginName: pluginState.name,
          configRequest,
        },
      };
    } catch (_error) {
      logger.error('[startPluginConfiguration] Error starting configuration:', _error);

      const errorMessage = `Error starting plugin configuration: ${
        _error instanceof Error ? _error.message : String(_error)
      }`;

      if (callback) {
        await callback({
          text: errorMessage,
          actions: ['START_PLUGIN_CONFIGURATION'],
        });
      }

      return {
        text: errorMessage,
        data: { error: String(_error) },
      };
    }
  },
};

// Helper function removed as we now get plugin name from structured data
