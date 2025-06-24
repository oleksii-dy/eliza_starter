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
import { PluginManagerServiceType, HealthStatus, type HealthMetrics } from '../types.ts';

function formatMetrics(metrics: HealthMetrics[]): string {
  if (metrics.length === 0) {
    return 'No plugin health metrics available.';
  }

  const statusCounts = {
    healthy: 0,
    warning: 0,
    unhealthy: 0,
    unknown: 0,
  };

  metrics.forEach((m) => {
    switch (m.status) {
      case HealthStatus.HEALTHY:
        statusCounts.healthy++;
        break;
      case HealthStatus.WARNING:
        statusCounts.warning++;
        break;
      case HealthStatus.UNHEALTHY:
        statusCounts.unhealthy++;
        break;
      case HealthStatus.UNKNOWN:
        statusCounts.unknown++;
        break;
    }
  });

  let output = `**Plugin Health Status** (Total: ${metrics.length})\n\n`;
  output += `✅ Healthy: ${statusCounts.healthy}\n`;
  output += `⚠️ Warning: ${statusCounts.warning}\n`;
  output += `❌ Unhealthy: ${statusCounts.unhealthy}\n`;
  output += `❓ Unknown: ${statusCounts.unknown}\n\n`;

  // Show details for non-healthy plugins
  const nonHealthy = metrics.filter((m) => m.status !== HealthStatus.HEALTHY);
  if (nonHealthy.length > 0) {
    output += '**Plugins Requiring Attention:**\n';
    nonHealthy.forEach((metric) => {
      const statusName = HealthStatus[metric.status];
      output += `- ${(metric as any).pluginId || 'Unknown'}: ${statusName}`;
      if (metric.errors && metric.errors > 0) {
        output += ` (${metric.errors} errors)`;
      }
      if ((metric as any).lastError) {
        output += ` - Last error: ${(metric as any).lastError.message}`;
      }
      output += '\n';
    });
  }

  return output;
}

export const checkPluginHealthAction: Action = {
  name: 'CHECK_PLUGIN_HEALTH',
  description: 'Check the health status and metrics of loaded plugins',
  similes: ['plugin health', 'check health', 'plugin status', 'health check'],
  examples: [
    [
      {
        name: '{{user1}}',
        content: {
          text: 'Check plugin health',
        },
      },
      {
        name: '{{agentName}}',
        content: {
          text: 'I\'ll check the health status of all plugins.',
          actions: ['CHECK_PLUGIN_HEALTH'],
        },
      },
    ],
    [
      {
        name: '{{user1}}',
        content: {
          text: 'Show me unhealthy plugins',
        },
      },
      {
        name: '{{agentName}}',
        content: {
          text: 'Let me check for any unhealthy plugins.',
          actions: ['CHECK_PLUGIN_HEALTH'],
        },
      },
    ],
    [
      {
        name: '{{user1}}',
        content: {
          text: 'Check discord plugin health',
        },
      },
      {
        name: '{{agentName}}',
        content: {
          text: 'I\'ll check the health status of the discord plugin.',
          actions: ['CHECK_PLUGIN_HEALTH'],
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

      // Check if user is asking about a specific plugin
      const text = message.content?.text?.toLowerCase() || '';
      const pluginMatch = text.match(/plugin[- ]?(\w+)|(\w+)[- ]?plugin/);

      let metrics: HealthMetrics[];

      if (pluginMatch) {
        // Get metrics for specific plugin
        const pluginName = pluginMatch[1] || pluginMatch[2];
        // Try to find plugin ID by name
        const allPlugins = pluginManager.getAllPlugins();
        const matchingPlugin = allPlugins.find(p =>
          p.name.toLowerCase().includes(pluginName.toLowerCase())
        );

        if (matchingPlugin) {
          metrics = await pluginManager.getPluginHealthMetrics(matchingPlugin.id);
        } else {
          metrics = [];
        }
      } else {
        // Get all metrics
        metrics = await pluginManager.getPluginHealthMetrics();
      }

      // Calculate summary statistics
      const statusCounts = {
        total: metrics.length,
        healthy: metrics.filter((m) => m.status === HealthStatus.HEALTHY).length,
        warning: metrics.filter((m) => m.status === HealthStatus.WARNING).length,
        unhealthy: metrics.filter((m) => m.status === HealthStatus.UNHEALTHY).length,
        unknown: metrics.filter((m) => m.status === HealthStatus.UNKNOWN).length,
      };

      // Determine overall health
      let overallHealth = 'healthy';
      if (statusCounts.unhealthy > 0) {
        overallHealth = 'unhealthy';
      } else if (statusCounts.warning > 0) {
        overallHealth = 'warning';
      } else if (statusCounts.unknown > 0) {
        overallHealth = 'unknown';
      }

      // Get recent errors
      const recentErrors = metrics
        .filter((m) => (m as any).lastError)
        .map((m) => ({
          pluginId: (m as any).pluginId,
          error: (m as any).lastError?.message,
          time: (m as any).lastErrorTime,
        }))
        .sort((a, b) => (b.time || 0) - (a.time || 0))
        .slice(0, 5); // Last 5 errors

      const statusText = formatMetrics(metrics);

      // Check if user has permission to recover plugins
      const trustService = runtime.getService('TRUST') as any;
      const canRecover = trustService ?
        await trustService.checkPermission(message.entityId, 'plugin:recover') :
        true; // Default to true if trust service not available

      let actionText = statusText;
      if (statusCounts.unhealthy > 0 && canRecover) {
        actionText += '\n\nYou can use RECOVER_PLUGIN to attempt recovery of unhealthy plugins.';
      } else if (statusCounts.unhealthy > 0 && !canRecover) {
        actionText += '\n\nYou don\'t have permission to recover plugins. Contact an admin.';
      }

      await callback?.({
        text: actionText,
        actions: ['CHECK_PLUGIN_HEALTH'],
        data: {
          summary: statusCounts,
          overallStatus: overallHealth,
          recentErrors,
        },
      });

      return {
        text: statusText,
        data: {
          pluginHealth: metrics.reduce(
            (acc, m) => {
              const pluginId = (m as any).pluginId || 'unknown';
              acc[pluginId] = m;
              return acc;
            },
            {} as Record<string, HealthMetrics>
          ),
        },
        values: {
          summary: statusCounts,
          overallStatus: overallHealth,
          recentErrors,
          metricsCount: metrics.length,
          lastCheck: new Date().toISOString(),
        },
      };
    } catch (_error) {
      logger.error('[CHECK_PLUGIN_HEALTH] Error:', error);

      await callback?.({
        text: `Error checking plugin health: ${_error instanceof Error ? _error.message : String(_error)}`,
        actions: ['CHECK_PLUGIN_HEALTH'],
      });

      throw error;
    }
  },
};
