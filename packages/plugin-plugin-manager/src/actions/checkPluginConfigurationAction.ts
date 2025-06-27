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

export const checkPluginConfigurationAction: Action = {
  name: 'CHECK_PLUGIN_CONFIGURATION',
  description:
    'Check the configuration status of all plugins, including missing environment variables',
  examples: [
    [
      {
        name: '{{user1}}',
        content: {
          text: 'Check plugin configuration status',
        },
      },
      {
        name: '{{agentName}}',
        content: {
          text: "I'll check the configuration status of all plugins for you.",
          actions: ['CHECK_PLUGIN_CONFIGURATION'],
        },
      },
    ],
    [
      {
        name: '{{user1}}',
        content: {
          text: 'Which plugins need configuration?',
        },
      },
      {
        name: '{{agentName}}',
        content: {
          text: 'Let me check which plugins are missing configuration.',
          actions: ['CHECK_PLUGIN_CONFIGURATION'],
        },
      },
    ],
    [
      {
        name: '{{user1}}',
        content: {
          text: 'Show me unconfigured plugins',
        },
      },
      {
        name: '{{agentName}}',
        content: {
          text: "I'll identify all plugins that need configuration.",
          actions: ['CHECK_PLUGIN_CONFIGURATION'],
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

      const statusData: any = {
        available: true,
        plugins: [],
        totalPlugins: 0,
        configuredPlugins: 0,
        needsConfiguration: 0,
      };

      let statusText = '';

      const allPlugins = pluginManager.getAllPlugins();
      statusData.totalPlugins = allPlugins.length;

      for (const plugin of allPlugins) {
        const isConfigured = plugin.missingEnvVars.length === 0;
        const pluginStatus = {
          name: plugin.name,
          status: plugin.status,
          missingVars: plugin.missingEnvVars.length,
          configured: isConfigured,
          variables: plugin.missingEnvVars,
        };

        statusData.plugins.push(pluginStatus);

        if (isConfigured) {
          statusData.configuredPlugins++;
        } else {
          statusData.needsConfiguration++;
        }
      }

      // Build status text
      if (statusData.totalPlugins === 0) {
        statusText = 'No plugins are currently installed.';
      } else {
        statusText += 'Plugin Configuration Status:\n';
        statusText += `• Total plugins: ${statusData.totalPlugins}\n`;
        statusText += `• Fully configured: ${statusData.configuredPlugins}\n`;
        statusText += `• Need configuration: ${statusData.needsConfiguration}\n`;

        if (statusData.needsConfiguration > 0) {
          statusText += '\nPlugins needing configuration:\n';
          statusData.plugins
            .filter((p: any) => !p.configured)
            .forEach((plugin: any) => {
              statusText += `• ${plugin.name}: ${plugin.missingVars} missing variables (${plugin.variables.join(', ')})\n`;
            });
        }
      }

      // Check if user has permission to configure plugins
      const trustService = runtime.getService<TrustService>('TRUST');
      const canConfigure = trustService
        ? await (trustService as any).checkPermission(message.entityId, 'plugin:configure')
        : true; // Default to true if trust service not available

      if (statusData.needsConfiguration > 0 && canConfigure) {
        statusText += '\n\nYou can use START_PLUGIN_CONFIGURATION to configure these plugins.';
      } else if (statusData.needsConfiguration > 0 && !canConfigure) {
        statusText += "\n\nYou don't have permission to configure plugins. Contact an admin.";
      }

      await callback?.({
        text: statusText,
        actions: ['CHECK_PLUGIN_CONFIGURATION'],
        data: statusData,
      });

      return {
        text: statusText,
        data: statusData,
        values: {
          totalPlugins: statusData.totalPlugins,
          configuredPlugins: statusData.configuredPlugins,
          needsConfiguration: statusData.needsConfiguration,
          hasUnconfiguredPlugins: statusData.needsConfiguration > 0,
        },
      };
    } catch (_error) {
      logger.error('[CHECK_PLUGIN_CONFIGURATION] Error:', _error);

      await callback?.({
        text: `Error checking plugin configuration: ${_error instanceof Error ? _error.message : String(_error)}`,
        actions: ['CHECK_PLUGIN_CONFIGURATION'],
      });

      throw _error;
    }
  },
};
