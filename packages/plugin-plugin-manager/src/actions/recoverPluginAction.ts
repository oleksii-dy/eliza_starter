import type {
  Action,
  ActionResult,
  HandlerCallback,
  IAgentRuntime,
  Memory,
  State,
} from '@elizaos/core';
import { elizaLogger } from '@elizaos/core';
import type { PluginManagerService } from '../services/PluginManagerService.ts';
import { PluginManagerServiceType } from '../types.ts';
import { HealthStatus } from '../types.ts';

export const recoverPluginAction: Action = {
  name: 'RECOVER_PLUGIN',
  similes: [
    'fix plugin',
    'restart plugin',
    'recover plugin',
    'repair plugin',
    'restore plugin',
    'reset plugin',
    'plugin recovery',
    'plugin restart',
    'fix crashed plugin',
    'rollback plugin',
    'rollback to previous',
    'rollback to the previous',
    'revert plugin',
    'undo plugin changes',
    'restore previous state',
    'can you rollback',
  ],
  description: 'Attempts to recover a crashed or unhealthy plugin by unloading and reloading it',

  examples: [
    [
      {
        name: '{{user1}}',
        content: {
          text: 'The weather plugin crashed, can you fix it?',
          actions: ['RECOVER_PLUGIN'],
        },
      },
      {
        name: '{{agentName}}',
        content: {
          text: "I'll attempt to recover the weather plugin by restarting it.",
          actions: ['RECOVER_PLUGIN'],
        },
      },
      {
        name: '{{agentName}}',
        content: {
          text: 'Successfully recovered the weather plugin. It is now healthy and operational again.',
          actions: ['RECOVER_PLUGIN'],
        },
      },
    ],
    [
      {
        name: '{{user1}}',
        content: {
          text: 'Please restart all unhealthy plugins',
          actions: ['RECOVER_PLUGIN'],
        },
      },
      {
        name: '{{agentName}}',
        content: {
          text: "I'll check for unhealthy plugins and attempt to recover them.",
          actions: ['RECOVER_PLUGIN'],
        },
      },
      {
        name: '{{agentName}}',
        content: {
          text: 'Found 2 unhealthy plugins. Successfully recovered plugin-twitter. Failed to recover plugin-solana - it may require manual intervention.',
          actions: ['RECOVER_PLUGIN'],
        },
      },
    ],
  ],

  validate: async (runtime: IAgentRuntime, message: Memory): Promise<boolean> => {
    const pluginManager = runtime.getService(
      PluginManagerServiceType.PLUGIN_MANAGER
    ) as PluginManagerService;
    if (!pluginManager) {return false;}

    // Check if the message text contains recovery/rollback keywords
    const text = message.content.text?.toLowerCase() || '';
    const hasRecoveryKeyword =
      text.includes('rollback') ||
      text.includes('recover') ||
      text.includes('fix') ||
      text.includes('restart') ||
      text.includes('restore') ||
      text.includes('revert') ||
      text.includes('previous state');
    const hasPluginContext = text.includes('plugin') || text.includes('causing issues');

    return hasRecoveryKeyword && hasPluginContext;
  },

  handler: async (
    runtime: IAgentRuntime,
    message: Memory,
    state?: State,
    options?: any,
    callback?: HandlerCallback
  ): Promise<ActionResult> => {
    elizaLogger.info('[recoverPluginAction] Starting plugin recovery');

    const pluginManager = runtime.getService(
      PluginManagerServiceType.PLUGIN_MANAGER
    ) as PluginManagerService;
    if (!pluginManager) {
      const errorMessage = 'Plugin manager service is not available.';
      if (callback) {
        await callback({
          text: errorMessage,
          actions: ['RECOVER_PLUGIN'],
        });
      }
      return {
        text: errorMessage,
        data: { success: false },
      };
    }

    try {
      // Extract plugin identifier from various sources
      const pluginIdentifier =
        options?.pluginId ||
        options?.pluginName ||
        (message.content as any)?.pluginId ||
        (message.content as any)?.pluginName ||
        state?.pluginId ||
        state?.pluginName;

      // Check if we should recover all unhealthy plugins
      const shouldRecoverAll =
        !pluginIdentifier &&
        (message.content?.text?.toLowerCase().includes('all') ||
          message.content?.text?.toLowerCase().includes('unhealthy') ||
          message.content?.text?.toLowerCase().includes('crashed'));

      if (!pluginIdentifier && !shouldRecoverAll) {
        // Try to extract plugin name from message text
        const match = message.content?.text?.match(
          /(?:recover|fix|restart|repair)\s+(?:the\s+)?(\S+)\s+plugin/i
        );
        if (match) {
          const pluginName = match[1];
          // Find plugin by name
          const metrics = await pluginManager.getPluginHealthMetrics();
          const found = metrics.find((m: any) =>
            m.pluginName.toLowerCase().includes(pluginName.toLowerCase())
          );
          if (found) {
            options = { ...options, pluginId: found.pluginId };
          }
        }
      }

      if (shouldRecoverAll) {
        // Recover all unhealthy plugins
        elizaLogger.info('[recoverPluginAction] Recovering all unhealthy plugins');

        const metrics = await pluginManager.getPluginHealthMetrics();

        const unhealthyPlugins = metrics.filter(
          (m: any) =>
            m.status === HealthStatus.UNHEALTHY ||
            m.status === HealthStatus.WARNING ||
            m.status === HealthStatus.UNKNOWN
        );

        if (unhealthyPlugins.length === 0) {
          const message = 'All plugins are healthy. No recovery needed.';
          if (callback) {
            await callback({
              text: message,
              actions: ['RECOVER_PLUGIN'],
            });
          }
          return {
            text: message,
            data: { success: true, recoveredCount: 0 },
          };
        }

        if (callback) {
          await callback({
            text: `Found ${unhealthyPlugins.length} unhealthy plugin${unhealthyPlugins.length > 1 ? 's' : ''}. Attempting recovery...`,
            actions: ['RECOVER_PLUGIN'],
          });
        }

        const recoveryPromises = unhealthyPlugins
          .map((m: any) => {
            const pluginId = m.pluginId;
            if (pluginId) {
              return pluginManager.recoverPlugin(pluginId);
            }
            return null;
          })
          .filter((p) => p !== null);

        const results = await Promise.allSettled(recoveryPromises);

        const successful = results.filter(
          (r) => r.status === 'fulfilled' && r.value.success
        ).length;
        const failed = results.length - successful;

        let resultMessage = `Recovery complete: ${successful} succeeded`;
        if (failed > 0) {
          resultMessage += `, ${failed} failed`;
        }

        const detailedResults = unhealthyPlugins.map((p: any, i: number) => {
          const result = results[i];
          return {
            pluginName: p.pluginName,
            success: result.status === 'fulfilled' && result.value.success,
            error: result.status === 'rejected' ? result.reason : undefined,
          };
        });

        if (callback) {
          await callback({
            text: resultMessage,
            actions: ['RECOVER_PLUGIN'],
          });
        }

        return {
          text: resultMessage,
          data: {
            success: failed === 0,
            recoveredCount: successful,
            failedCount: failed,
            results: detailedResults,
          },
        };
      } else if (options?.pluginId) {
        // Recover specific plugin
        const pluginId = options.pluginId;

        if (callback) {
          await callback({
            text: `Attempting to recover plugin ${pluginId}...`,
            actions: ['RECOVER_PLUGIN'],
          });
        }

        // Check if plugin exists
        const plugin = pluginManager.getPluginState(pluginId);
        if (!plugin) {
          throw new Error(`Plugin ${pluginId} not found`);
        }

        // Get health metrics for the plugin
        const metrics = await pluginManager.getPluginHealthMetrics(pluginId);
        const metric = metrics.length > 0 ? metrics[0] : null;

        if (metric) {
          elizaLogger.info('[recoverPluginAction] Plugin health status', {
            pluginId,
            status: metric.status,
            errors: metric.errors,
          });
        }

        // Attempt recovery
        try {
          const result = await pluginManager.recoverPlugin(pluginId);

          if (callback) {
            await callback({
              text: result.message,
              actions: ['RECOVER_PLUGIN'],
            });
          }

          return {
            text: result.message,
            data: {
              success: result.success,
              pluginId,
            },
          };
        } catch (_error) {
          elizaLogger.error('[recoverPluginAction] Error during recovery:', _error);

          const errorMessage = `Error during plugin recovery: ${_error instanceof Error ? _error.message : String(_error)}`;

          if (callback) {
            await callback({
              text: errorMessage,
              actions: ['RECOVER_PLUGIN'],
            });
          }

          return {
            text: errorMessage,
            data: { success: false },
          };
        }
      } else {
        const errorMessage =
          'Please specify which plugin to recover or use "all" to recover all unhealthy plugins.';
        if (callback) {
          await callback({
            text: errorMessage,
            actions: ['RECOVER_PLUGIN'],
          });
        }
        return {
          text: errorMessage,
          data: { success: false },
        };
      }
    } catch (_error) {
      elizaLogger.error('[recoverPluginAction] Error during recovery:', _error);

      const errorMessage = `Error during plugin recovery: ${_error instanceof Error ? _error.message : String(_error)}`;

      if (callback) {
        await callback({
          text: errorMessage,
          actions: ['RECOVER_PLUGIN'],
        });
      }

      return {
        text: errorMessage,
        data: { success: false },
      };
    }
  },
};
