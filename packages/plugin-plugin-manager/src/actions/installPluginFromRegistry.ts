import type {
  Action,
  ActionResult,
  HandlerCallback,
  IAgentRuntime,
  Memory,
  State,
} from '@elizaos/core';
import { PluginManagerService } from '../services/pluginManagerService.ts';
import { PluginManagerServiceType } from '../types.ts';
export const installPluginFromRegistryAction: Action = {
  name: 'installPluginFromRegistry.ts',
  description: 'Install a plugin from the ElizaOS plugin registry',
  similes: [
    'install plugin from registry',
    'add plugin from registry',
    'download plugin',
    'get plugin from registry',
  ],

  async handler(
    runtime: IAgentRuntime,
    message: Memory,
    state?: State,
    options?: any,
    callback?: HandlerCallback
  ): Promise<ActionResult> {
    const pluginManagerService = runtime.getService(
      PluginManagerServiceType.PLUGIN_MANAGER
    ) as PluginManagerService;

    if (!pluginManagerService) {
      if (callback) {
        await callback({
          text: 'Plugin manager service not available',
          error: true,
        });
      }
      return {
        text: 'Plugin manager service not available',
      };
    }

    // Get plugin name from structured data, not from parsing text
    const pluginName =
      (message.content as any)?.pluginName || state?.pluginName || options?.pluginName;

    if (!pluginName) {
      if (callback) {
        await callback({
          text: 'Please specify a plugin name to install.',
          error: true,
        });
      }
      return {
        text: 'Please specify a plugin name to install.',
      };
    }

    try {
      const pluginInfo = await pluginManagerService.installPluginFromRegistry(
        pluginName,
        undefined, // version
        (progress) => {
          // Progress callback - could be used to update UI
          console.log(`Installation progress: ${progress.phase} - ${progress.progress}%`);
        }
      );

      if (pluginInfo.status === 'needs_configuration') {
        const configMessage =
          `Plugin ${pluginInfo.name} has been installed but requires configuration:\n` +
          pluginInfo.requiredEnvVars
            .map((v) => `- ${v.name}: ${v.description}${v.sensitive ? ' (sensitive)' : ''}`)
            .join('\n') +
          '\n\nUse "configure plugin" to set up the required environment variables.';

        if (callback) {
          await callback({
            text: configMessage,
          });
        }

        return {
          text: configMessage,
        };
      }

      const successMessage =
        `Successfully installed plugin ${pluginInfo.name} v${pluginInfo.version}. ` +
        `Use "load plugin ${pluginName}" to activate it.`;

      if (callback) {
        await callback({
          text: successMessage,
        });
      }

      return {
        text: successMessage,
      };
    } catch (error: any) {
      const errorMessage = `Failed to install plugin: ${error.message}`;

      if (callback) {
        await callback({
          text: errorMessage,
          error: true,
        });
      }

      return {
        text: errorMessage,
      };
    }
  },

  async validate(runtime: IAgentRuntime, message: Memory, state?: State): Promise<boolean> {
    // Simply check if the plugin manager service is available
    const pluginManagerService = runtime.getService(
      PluginManagerServiceType.PLUGIN_MANAGER
    ) as PluginManagerService;
    return !!pluginManagerService;
  },
};
