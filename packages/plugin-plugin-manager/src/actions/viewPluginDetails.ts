import {
  Action,
  Handler,
  State,
  IAgentRuntime,
  Memory,
  HandlerCallback,
  ActionExample,
  elizaLogger,
} from '@elizaos/core';
import * as fs from 'fs/promises';
import * as path from 'path';
import { PluginManagerService } from '../services/pluginManagerService';

interface PluginDetailsResponse {
  success: boolean;
  pluginName?: string;
  details?: {
    loaded: boolean;
    enabled?: boolean;
    version?: string;
    components?: {
      actions: number;
      providers: number;
      evaluators: number;
      services: number;
    };
    schema?: {
      exists: boolean;
      content?: any;
    };
  };
  error?: string;
}

const viewPluginDetailsHandler: Handler = async (
  runtime: IAgentRuntime,
  message: Memory,
  state?: State,
  options?: any,
  callback?: HandlerCallback
): Promise<boolean> => {
  const content = message.content as any;

  if (!content.plugin) {
    if (callback) {
      await callback({
        text: 'No plugin name provided',
      });
    }
    return false;
  }

  const pluginName = content.plugin.trim();

  // Basic validation for plugin name
  if (!pluginName || pluginName.length === 0) {
    if (callback) {
      await callback({
        text: 'Invalid plugin name format',
      });
    }
    return false;
  }

  try {
    const pluginService = runtime.getService('plugin') as PluginManagerService;
    if (!pluginService) {
      if (callback) {
        await callback({
          text: 'Plugin service not available',
        });
      }
      return false;
    }

    const loadedPlugins = await pluginService.getLoadedPlugins();
    const isLoaded = loadedPlugins.includes(pluginName);

    let pluginDetails: any = {
      loaded: isLoaded,
    };

    if (isLoaded) {
      // Get plugin from runtime
      const plugin = runtime.plugins.find((p) => p.name === pluginName);
      if (plugin) {
        pluginDetails.enabled = true;
        pluginDetails.version = (plugin as any).version || 'unknown';
        pluginDetails.components = {
          actions: plugin.actions?.length || 0,
          providers: plugin.providers?.length || 0,
          evaluators: plugin.evaluators?.length || 0,
          services: plugin.services?.length || 0,
        };
      }
    }

    // Check for schema file
    const pluginPath = path.join(process.cwd(), 'node_modules', pluginName);
    const schemaPath = path.join(pluginPath, 'plugin-config.schema.json');

    try {
      const schemaExists = await fs
        .access(schemaPath)
        .then(() => true)
        .catch(() => false);

      if (schemaExists) {
        const schemaContent = await fs.readFile(schemaPath, 'utf-8');
        pluginDetails.schema = {
          exists: true,
          content: JSON.parse(schemaContent),
        };
      } else {
        pluginDetails.schema = {
          exists: false,
        };
      }
    } catch (error) {
      // Schema check failed, but don't fail the whole operation
      pluginDetails.schema = {
        exists: false,
      };
    }

    if (callback) {
      await callback({
        text: `Plugin details for ${pluginName}:\n${JSON.stringify(pluginDetails, null, 2)}`,
      });
    }

    return true;
  } catch (error) {
    elizaLogger.error('Error viewing plugin details:', error);
    if (callback) {
      await callback({
        text: `Error viewing plugin details: ${error instanceof Error ? error.message : 'Unknown error occurred'}`,
      });
    }
    return false;
  }
};

const viewPluginDetailsAction: Action = {
  name: 'VIEW_PLUGIN_DETAILS',
  description: 'View detailed information about a plugin including its schema',
  validate: async (runtime: IAgentRuntime, message: Memory) => {
    const content = message.content as any;
    return !!content.plugin;
  },
  handler: viewPluginDetailsHandler,
  examples: [
    [
      {
        name: '{{user1}}',
        content: { text: 'Show me details about the solana plugin' },
      },
      {
        name: '{{agent}}',
        content: {
          text: "I'll get the details for the solana plugin.",
          action: 'VIEW_PLUGIN_DETAILS',
          plugin: '@elizaos/plugin-solana',
        },
      },
    ],
    [
      {
        name: '{{user1}}',
        content: { text: 'What information do you have about @elizaos/plugin-twitter?' },
      },
      {
        name: '{{agent}}',
        content: {
          text: 'Let me retrieve the details for the Twitter plugin.',
          action: 'VIEW_PLUGIN_DETAILS',
          plugin: '@elizaos/plugin-twitter',
        },
      },
    ],
  ] as ActionExample[][],
};

export { viewPluginDetailsAction };
