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
import { PluginManagerServiceType } from '../types.ts';
export const managePluginBranchAction: Action = {
  name: 'MANAGE_PLUGIN_BRANCH',
  similes: ['create branch', 'switch branch', 'list branches', 'branch plugin'],

  description: 'Manage git branches for plugin development and modifications',

  examples: [
    [
      {
        name: '{{user1}}',
        content: {
          text: 'Create a new branch for the weather plugin called feature-add-radar',
          actions: ['MANAGE_PLUGIN_BRANCH'],
        },
      },
      {
        name: '{{agentName}}',
        content: {
          text: 'Creating a new branch feature-add-radar for the weather plugin...',
          actions: ['MANAGE_PLUGIN_BRANCH'],
        },
      },
      {
        name: '{{agentName}}',
        content: {
          text: 'Successfully created branch feature-add-radar. You can now make modifications to the plugin on this branch.',
          actions: ['MANAGE_PLUGIN_BRANCH'],
        },
      },
    ],
    [
      {
        name: '{{user1}}',
        content: {
          text: 'List all branches for my weather plugin',
          actions: ['MANAGE_PLUGIN_BRANCH'],
        },
      },
      {
        name: '{{agentName}}',
        content: {
          text: 'Here are the branches for the weather plugin:\n\n* **main** (current)\n* feature-add-radar\n* fix-temperature-bug\n* experimental-ai-predictions',
          actions: ['MANAGE_PLUGIN_BRANCH'],
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
    elizaLogger.info('[managePluginBranchAction] Starting branch management');

    const pluginManager = runtime.getService(
      PluginManagerServiceType.PLUGIN_MANAGER
    ) as PluginManagerService;
    if (!pluginManager) {
      if (callback) {
        await callback({
          text: 'Plugin manager service is not available.',
          actions: ['MANAGE_PLUGIN_BRANCH'],
        });
      }
      return {
        text: 'Plugin manager service is not available.',
      };
    }

    // Extract operation and parameters from structured data
    const operation = (message.content as any)?.operation || state?.operation || options?.operation;
    const pluginId = (message.content as any)?.pluginId || state?.pluginId || options?.pluginId;
    const branchName =
      (message.content as any)?.branchName || state?.branchName || options?.branchName;
    const description =
      (message.content as any)?.description || state?.description || options?.description;

    if (!operation) {
      if (callback) {
        await callback({
          text: 'Please specify an operation: create, switch, or list',
          actions: ['MANAGE_PLUGIN_BRANCH'],
        });
      }
      return {
        text: 'Please specify an operation: create, switch, or list',
      };
    }

    if (!pluginId && operation !== 'list-all') {
      if (callback) {
        await callback({
          text: 'Please specify which plugin to manage branches for.',
          actions: ['MANAGE_PLUGIN_BRANCH'],
        });
      }
      return {
        text: 'Please specify which plugin to manage branches for.',
      };
    }

    try {
      let result: any;
      let responseText: string;

      switch (operation) {
        case 'create':
          if (!branchName) {
            throw new Error('Branch name is required for create operation');
          }

          if (callback) {
            await callback({
              text: `Creating branch ${branchName} for plugin ${pluginId}...`,
              actions: ['MANAGE_PLUGIN_BRANCH'],
            });
          }

          const newBranch = await pluginManager.createPluginBranch(
            pluginId,
            branchName,
            description
          );

          responseText = `Successfully created branch **${newBranch.name}**`;
          if (description) {
            responseText += `\n\nDescription: ${description}`;
          }
          responseText += '\n\nThe branch is now active. You can start making modifications.';

          result = {
            operation: 'create',
            branch: newBranch,
          };
          break;

        case 'switch':
          if (!branchName) {
            throw new Error('Branch name is required for switch operation');
          }

          if (callback) {
            await callback({
              text: `Switching to branch ${branchName}...`,
              actions: ['MANAGE_PLUGIN_BRANCH'],
            });
          }

          await pluginManager.switchPluginBranch(pluginId, branchName);

          responseText = `Successfully switched to branch **${branchName}**`;
          result = {
            operation: 'switch',
            branchName,
          };
          break;

        case 'list':
          const branches = await pluginManager.getPluginBranches(pluginId);
          const history = await pluginManager.getPluginVersionHistory(pluginId);

          responseText = `Branches for plugin ${pluginId}:\n\n`;
          branches.forEach((branch) => {
            responseText += branch.current
              ? `* **${branch.name}** (current)\n`
              : `* ${branch.name}\n`;
            if (branch.description) {
              responseText += `  Description: ${branch.description}\n`;
            }
            responseText += `  Last commit: ${branch.lastCommit}\n\n`;
          });

          if (history.versions.length > 0) {
            responseText += '\nRecent versions:\n';
            history.versions.slice(0, 5).forEach((version) => {
              responseText += `* v${version.version} - ${version.message} (${new Date(version.timestamp).toLocaleDateString()})\n`;
            });
          }

          result = {
            operation: 'list',
            branches,
            currentBranch: history.currentBranch,
            versions: history.versions.slice(0, 5),
          };
          break;

        default:
          throw new Error(`Unknown operation: ${operation}`);
      }

      if (callback) {
        await callback({
          text: responseText,
          actions: ['MANAGE_PLUGIN_BRANCH'],
        });
      }

      return {
        text: responseText,
        data: {
          success: true,
          ...result,
        },
      };
    } catch (_error) {
      elizaLogger.error('[managePluginBranchAction] Error managing branches:', _error);

      const errorMessage = `Error managing branches: ${_error instanceof Error ? _error.message : String(_error)}`;

      if (callback) {
        await callback({
          text: errorMessage,
          actions: ['MANAGE_PLUGIN_BRANCH'],
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
