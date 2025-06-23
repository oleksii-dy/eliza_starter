import {
  type Action,
  type ActionResult,
  type HandlerCallback,
  type IAgentRuntime,
  type Memory,
  type State,
  elizaLogger,
} from '@elizaos/core';
// Dependency resolution is now handled internally by PluginManagerService
import { PluginManagerService } from '../services/pluginManagerService.ts';
import { PluginManagerServiceType } from '../types.ts';
export const checkDependenciesAction: Action = {
  name: 'CHECK_DEPENDENCIES',
  similes: ['check dependencies', 'dependency check', 'resolve dependencies', 'check conflicts'],

  description: 'Check plugin dependencies and identify conflicts or missing dependencies',

  examples: [
    [
      {
        name: '{{user1}}',
        content: {
          text: 'Check dependencies for my loaded plugins',
          actions: ['CHECK_DEPENDENCIES'],
        },
      },
      {
        name: '{{agentName}}',
        content: {
          text: "I'll analyze the dependencies of your loaded plugins to identify any issues.",
          actions: ['CHECK_DEPENDENCIES'],
        },
      },
      {
        name: '{{agentName}}',
        content: {
          text: 'Dependency analysis complete:\n\n✅ All dependencies resolved successfully\n📦 Total plugins: 5\n🔗 Dependencies: 12\n\nNo conflicts or missing dependencies detected.',
          actions: ['CHECK_DEPENDENCIES'],
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
    elizaLogger.info('[checkDependenciesAction] Starting dependency check');

    const pluginManager = runtime.getService(
      PluginManagerServiceType.PLUGIN_MANAGER
    ) as PluginManagerService;

    if (!pluginManager) {
      if (callback) {
        await callback({
          text: 'Plugin manager service is not available.',
          actions: ['CHECK_DEPENDENCIES'],
        });
      }
      return {
        text: 'Plugin manager service is not available.',
      };
    }

    try {
      if (callback) {
        await callback({
          text: 'Analyzing plugin dependencies...',
          actions: ['CHECK_DEPENDENCIES'],
        });
      }

      // Get loaded plugins
      const loadedPlugins = pluginManager.getLoadedPlugins();
      const pluginNames = loadedPlugins.map((p) => p.name);

      if (pluginNames.length === 0) {
        if (callback) {
          await callback({
            text: 'No plugins are currently loaded. Load some plugins first to check their dependencies.',
            actions: ['CHECK_DEPENDENCIES'],
          });
        }
        return {
          text: 'No plugins loaded.',
          data: { success: true, pluginCount: 0 },
        };
      }

      // Resolve dependencies using plugin manager
      const resolution = await pluginManager.checkPluginDependencies(pluginNames, {
        checkCircular: true,
        findMinimalSet: true,
      });

      // Build response
      let responseText = `# Dependency Analysis Report\n\n`;
      responseText += `**Plugins analyzed:** ${pluginNames.length}\n`;
      responseText += `**Total dependencies:** ${resolution.graph.size}\n\n`;

      if (resolution.success) {
        responseText += `✅ **All dependencies resolved successfully!**\n\n`;

        if (resolution.minimalSet) {
          responseText += `## Minimal Plugin Set\n`;
          responseText += `The following ${resolution.minimalSet.length} plugins are actually needed:\n`;
          resolution.minimalSet.forEach((p) => {
            responseText += `- ${p}\n`;
          });

          const unnecessary = pluginNames.filter((p) => !resolution.minimalSet!.includes(p));
          if (unnecessary.length > 0) {
            responseText += `\n**Potentially unnecessary plugins:**\n`;
            unnecessary.forEach((p) => {
              responseText += `- ${p} (no other plugins depend on it)\n`;
            });
          }
        }

        responseText += `\n## Installation Order\n`;
        responseText += `If reinstalling, use this order:\n`;
        resolution.installOrder.forEach((p, i) => {
          responseText += `${i + 1}. ${p}\n`;
        });
      } else {
        responseText += `⚠️ **Dependency conflicts detected!**\n\n`;

        resolution.conflicts.forEach((conflict) => {
          responseText += `## Conflict: ${conflict.pluginName}\n`;
          responseText += `Requested by:\n`;
          conflict.requestedBy.forEach((req) => {
            responseText += `- ${req.plugin} requires ${req.constraint}\n`;
          });
          if (conflict.suggestion) {
            responseText += `**Suggestion:** ${conflict.suggestion}\n`;
          }
          responseText += '\n';
        });
      }

      // Get compatible plugin recommendations
      // Note: Recommendation feature not yet exposed through plugin manager
      // This could be added in the future

      if (callback) {
        await callback({
          text: responseText,
          actions: ['CHECK_DEPENDENCIES'],
        });
      }

      return {
        text: responseText,
        data: {
          success: resolution.success,
          pluginCount: pluginNames.length,
          dependencyCount: resolution.graph.size,
          conflicts: resolution.conflicts,
          minimalSet: resolution.minimalSet,
        },
      };
    } catch (error) {
      elizaLogger.error('[checkDependenciesAction] Error checking dependencies:', error);

      const errorMessage = `Error checking dependencies: ${error instanceof Error ? error.message : String(error)}`;

      if (callback) {
        await callback({
          text: errorMessage,
          actions: ['CHECK_DEPENDENCIES'],
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
