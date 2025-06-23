import {
  type Action,
  type ActionResult,
  type HandlerCallback,
  type IAgentRuntime,
  type Memory,
  type State,
  elizaLogger,
} from '@elizaos/core';
import * as fs from 'fs/promises';
import * as path from 'node:path';
import { PluginManagerService } from '../services/pluginManagerService.ts';
import { PluginManagerServiceType, PluginStatus } from '../types.ts';

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
      if (pluginState.status !== PluginStatus.LOADED) {
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
    } catch (error) {
      const errorMessage = `Error in publish plugin action: ${
        error instanceof Error ? error.message : String(error)
      }`;
      elizaLogger.error('[publishPluginAction]', error);

      if (callback) {
        await callback({
          text: errorMessage,
          actions: ['PUBLISH_PLUGIN'],
        });
      }

      return {
        text: errorMessage,
        data: { error: String(error) },
      };
    }
  },
};

function extractPluginInfo(text: string): string | null {
  // Look for file paths
  const pathMatch = text.match(/[./][\w/-]+/);
  if (pathMatch) {
    return pathMatch[0];
  }

  // Look for plugin names
  const patterns = [/@elizaos\/plugin-[\w-]+/g, /plugin-[\w-]+/g];

  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) {
      return match[0];
    }
  }

  // Try to extract from natural language
  const words = text.toLowerCase().split(/\s+/);
  const publishIndex = words.findIndex((w) => w === 'publish');

  if (publishIndex !== -1) {
    // Look for plugin indicator
    for (let i = publishIndex + 1; i < words.length; i++) {
      if (words[i] === 'plugin' && i - 1 >= 0 && words[i - 1] !== 'the') {
        // Get the word before "plugin"
        return `plugin-${words[i - 1]}`;
      } else if (words[i].includes('plugin')) {
        return words[i];
      }
    }
  }

  return null;
}

async function resolvePluginPath(pluginInfo: string): Promise<string | null> {
  // Check if it's already a path
  if (pluginInfo.includes('/') || pluginInfo.includes('.')) {
    const absolutePath = path.resolve(pluginInfo);
    try {
      const stat = await fs.stat(absolutePath);
      if (stat.isDirectory()) {
        // Check for package.json
        await fs.access(path.join(absolutePath, 'package.json'));
        return absolutePath;
      }
    } catch {
      // Not a valid directory
    }
  }

  // Check common locations
  const possiblePaths = [
    path.join(process.cwd(), pluginInfo),
    path.join(process.cwd(), 'packages', pluginInfo),
    path.join(process.cwd(), 'cloned-plugins', pluginInfo),
    path.join(process.cwd(), '..', pluginInfo),
  ];

  for (const possiblePath of possiblePaths) {
    try {
      const stat = await fs.stat(possiblePath);
      if (stat.isDirectory()) {
        // Check for package.json
        await fs.access(path.join(possiblePath, 'package.json'));
        return possiblePath;
      }
    } catch {
      // Continue checking
    }
  }

  return null;
}
