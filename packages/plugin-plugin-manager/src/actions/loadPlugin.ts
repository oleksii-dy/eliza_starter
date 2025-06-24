import {
  type Action,
  type ActionResult,
  type HandlerCallback,
  type IAgentRuntime,
  type Memory,
  type State,
  logger,
} from '@elizaos/core';
import { PluginManagerService } from '../services/pluginManagerService.ts';
import { PluginManagerServiceType } from '../types.ts';
export const loadPluginAction: Action = {
  name: 'LOAD_PLUGIN',
  similes: ['load plugin', 'enable plugin', 'activate plugin', 'start plugin', 'load the'],
  description: 'Load a plugin that is currently in the ready or unloaded state',

  examples: [
    [
      {
        name: 'Autoliza',
        content: {
          text: 'I need to load the shell plugin',
          actions: ['LOAD_PLUGIN'],
        },
      },
      {
        name: 'Autoliza',
        content: {
          text: 'Loading the shell plugin now.',
          actions: ['LOAD_PLUGIN'],
          simple: true,
        },
      },
    ],
    [
      {
        name: 'Autoliza',
        content: {
          text: 'Activate the example-plugin that is ready',
          actions: ['LOAD_PLUGIN'],
        },
      },
      {
        name: 'Autoliza',
        content: {
          text: "I'll activate the example-plugin for you.",
          actions: ['LOAD_PLUGIN'],
          simple: true,
        },
      },
    ],
    [
      {
        name: '{{user1}}',
        content: {
          text: 'Load the test-plugin-with-env plugin',
        },
      },
      {
        name: '{{agentName}}',
        content: {
          text: "I'll load the test-plugin-with-env plugin for you.",
          actions: ['LOAD_PLUGIN'],
        },
      },
      {
        name: '{{agentName}}',
        content: {
          text: "Cannot load plugin test-plugin-with-env because it's missing environment variables: API_KEY, SECRET_KEY. Please set these variables first.",
        },
      },
    ],
    [
      {
        name: '{{user1}}',
        content: {
          text: 'Load the non-existent-plugin',
        },
      },
      {
        name: '{{agentName}}',
        content: {
          text: "I'll try to load the non-existent-plugin.",
          actions: ['LOAD_PLUGIN'],
        },
      },
      {
        name: '{{agentName}}',
        content: {
          text: 'Plugin "non-existent-plugin" not found. Please check the plugin name or install it first.',
        },
      },
    ],
  ],

  async validate(runtime: IAgentRuntime, _message: Memory, _state?: State): Promise<boolean> {
    const pluginManager = runtime.getService(
      PluginManagerServiceType.PLUGIN_MANAGER
    ) as PluginManagerService;
    if (!pluginManager) {return false;}

    // Check if the message text contains load-related keywords
    const text = _message.content.text?.toLowerCase() || '';
    const hasLoadKeyword =
      text.includes('load') ||
      text.includes('enable') ||
      text.includes('activate') ||
      text.includes('start');
    const hasPluginKeyword =
      text.includes('plugin') ||
      !!text.match(/\b(test-plugin|non-existent-plugin|test-plugin-with-env)\b/);

    return hasLoadKeyword && hasPluginKeyword;
  },

  async handler(
    runtime: IAgentRuntime,
    message: Memory,
    state?: State,
    options?: Record<string, unknown>,
    callback?: HandlerCallback
  ): Promise<ActionResult> {
    const pluginManager = runtime.getService(
      PluginManagerServiceType.PLUGIN_MANAGER
    ) as PluginManagerService;

    if (!pluginManager) {
      if (callback) {
        await callback({
          text: 'Plugin Manager service is not available.',
          actions: ['LOAD_PLUGIN'],
        });
      }
      return {
        text: 'Plugin Manager service is not available.',
      };
    }

    try {
      // Get plugin name from structured data
      const requestedPluginName =
        (message.content as any)?.pluginName || state?.pluginName || options?.pluginName;

      // If no plugin name in structured data, try to extract from message text
      let pluginNameToUse = requestedPluginName;
      if (!pluginNameToUse && message.content.text) {
        // Extract plugin name from text like "Load the xxx plugin" or "Load xxx"
        const loadMatch = message.content.text.match(
          /(?:load|enable|activate|start)\s+(?:the\s+)?([a-zA-Z0-9-_]+)(?:\s+plugin)?/i
        );
        if (loadMatch) {
          pluginNameToUse = loadMatch[1];
        }
      }

      const plugins = pluginManager.getAllPlugins();

      // Find plugin to load
      let pluginToLoad: any = null;

      if (pluginNameToUse) {
        // Find by exact name match
        pluginToLoad = plugins.find(
          (p) => p.name === pluginNameToUse && (p.status === 'ready' || p.status === 'unloaded')
        );

        if (!pluginToLoad) {
          // Check if the plugin exists but is not loadable
          const existingPlugin = plugins.find((p) => p.name === pluginNameToUse);
          if (existingPlugin) {
            if (existingPlugin.status === 'loaded') {
              const message = `Plugin ${existingPlugin.name} is already loaded.`;
              if (callback) {
                await callback({
                  text: message,
                  actions: ['LOAD_PLUGIN'],
                });
              }
              return {
                text: message,
                data: {
                  pluginName: existingPlugin.name,
                  status: 'already_loaded',
                },
              };
            } else if (existingPlugin.status === 'error') {
              const message = `Plugin ${existingPlugin.name} has errors and cannot be loaded.`;
              if (callback) {
                await callback({
                  text: message,
                  actions: ['LOAD_PLUGIN'],
                });
              }
              return {
                text: message,
                data: {
                  pluginName: existingPlugin.name,
                  status: 'error',
                },
              };
            }
          } else {
            // Plugin doesn't exist
            const message = `Plugin "${pluginNameToUse}" not found. Please check the plugin name or install it first.`;
            if (callback) {
              await callback({
                text: message,
                actions: ['LOAD_PLUGIN'],
              });
            }
            return {
              text: message,
              data: {
                pluginName: pluginNameToUse,
                status: 'not_found',
              },
            };
          }
        }
      } else {
        // No plugin name specified, get the first loadable plugin
        pluginToLoad = plugins.find((p) => p.status === 'ready' || p.status === 'unloaded') || null;
      }

      if (!pluginToLoad) {
        const message =
          'No plugins are available to load. All plugins are either already loaded or have errors.';
        if (callback) {
          await callback({
            text: message,
            actions: ['LOAD_PLUGIN'],
          });
        }
        return {
          text: message,
          data: {
            status: 'no_plugins_to_load',
          },
        };
      }

      // Check for missing environment variables
      if (pluginToLoad.missingEnvVars && pluginToLoad.missingEnvVars.length > 0) {
        const message = `Cannot load plugin ${pluginToLoad.name} because it's missing environment variables: ${pluginToLoad.missingEnvVars.join(', ')}. Please set these variables first.`;
        if (callback) {
          await callback({
            text: message,
            actions: ['LOAD_PLUGIN'],
          });
        }
        return {
          text: message,
          data: {
            missingEnvVars: pluginToLoad.missingEnvVars,
          },
        };
      }

      logger.info(`[loadPluginAction] Loading plugin: ${pluginToLoad.name}`);

      await pluginManager.loadPlugin({ pluginId: pluginToLoad.id });

      const successMessage = `Successfully loaded plugin: ${pluginToLoad.name}`;
      if (callback) {
        await callback({
          text: successMessage,
          actions: ['LOAD_PLUGIN'],
        });
      }

      return {
        text: successMessage,
        data: {
          pluginName: pluginToLoad.name,
          status: 'loaded',
        },
      };
    } catch (_error) {
      logger.error('[loadPluginAction] Error loading plugin:', _error);

      const errorMessage = `Failed to load plugin: ${_error instanceof Error ? _error.message : String(_error)}`;
      if (callback) {
        await callback({
          text: errorMessage,
          actions: ['LOAD_PLUGIN'],
        });
      }

      return {
        text: errorMessage,
        data: {
          error: _error instanceof Error ? _error.message : String(_error),
        },
      };
    }
  },
};
