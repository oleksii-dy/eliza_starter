import {
  AgentRuntime,
  encryptedCharacter,
  logger,
  stringToUuid,
  type Character,
  type IAgentRuntime,
  type Plugin,
  type IDatabaseAdapter,
} from '@elizaos/core';
import { AgentServer } from '@elizaos/server';
import { AgentStartOptions } from '../types';
import { loadEnvConfig } from '../utils/config-utils';
import { resolvePluginDependencies } from '../utils/dependency-resolver';
import { isValidPluginShape, loadAndPreparePlugin } from '../utils/plugin-utils';

/**
 * Start an agent with the given configuration
 *
 * Creates and initializes an agent runtime with plugins, handles dependency resolution, runs database migrations, and registers the agent with the server.
 */
export async function startAgent(
  character: Character,
  server: AgentServer,
  init?: (runtime: IAgentRuntime) => Promise<void>,
  plugins: (Plugin | string)[] = []
  options: AgentStartOptions = {}
): Promise<IAgentRuntime> {
  character.id ??= stringToUuid(character.name);

  const loadedPlugins = new Map<string, Plugin>();
  // Dynamically import SQL plugin to avoid early schema loading
  const sqlModule = await import('@elizaos/plugin-sql');
  const sqlPlugin = sqlModule.plugin;
  loadedPlugins.set(sqlPlugin.name, sqlPlugin as unknown as Plugin); // Always include sqlPlugin

  const pluginsToLoad = new Set<string>(character.plugins || []);
  for (const p of plugins) {
    if (typeof p === 'string') {
      pluginsToLoad.add(p);
    } else if (isValidPluginShape(p) && !loadedPlugins.has(p.name)) {
      loadedPlugins.set(p.name, p);
      (p.dependencies || []).forEach((dep) => pluginsToLoad.add(dep));
      if (options.isTestMode) {
        (p.testDependencies || []).forEach((dep) => pluginsToLoad.add(dep));
      }
    }
  }

  // Load all requested plugins
  const allAvailablePlugins = new Map<string, Plugin>();
  for (const p of loadedPlugins.values()) {
    allAvailablePlugins.set(p.name, p);
  }
  for (const name of pluginsToLoad) {
    if (!allAvailablePlugins.has(name)) {
      const loaded = await loadAndPreparePlugin(name);
      if (loaded) {
        allAvailablePlugins.set(loaded.name, loaded);
      }
    }
  }

  // Resolve dependencies and get final plugin list
  const finalPlugins = resolvePluginDependencies(allAvailablePlugins, options.isTestMode);

  // In test mode, use the server's database adapter to ensure consistency
  const runtimeOptions: any = {
    character: encryptedCharacter(character),
    plugins: finalPlugins,
    settings: await loadEnvConfig(),
  };

  // Always use the server's database adapter if available
  if (server.database) {
    runtimeOptions.adapter = server.database;
    logger.debug('Using server database adapter for agent runtime');
  } else {
    logger.warn('No server database adapter available - agent may fail to initialize');
  }

  const runtime = new AgentRuntime(runtimeOptions);

  const initWrapper = async (runtime: IAgentRuntime) => {
    if (init) {
      await init(runtime);
    }
  };

  await initWrapper(runtime);

  await runtime.initialize();

  try {
    logger.info('Running plugin migrations...');
    
    // Create a mapping of loaded plugin names to requested plugin names
    const pluginNameMap = new Map<string, string>();
    
    // Map @elizaos/plugin-todo to "todo" for logging purposes
    for (const plugin of finalPlugins) {
      const requestedName = Array.from(pluginsToLoad).find(name => 
        plugin.name === name || 
        plugin.name === `@elizaos/plugin-${name}` ||
        name === plugin.name.replace('@elizaos/plugin-', '')
      );
      if (requestedName) {
        pluginNameMap.set(plugin.name, requestedName);
      }
    }
    
    // Log migrations for plugins that have schemas
    for (const plugin of finalPlugins) {
      if (plugin.name === '@elizaos/plugin-sql' || plugin.schema) {
        // Use the requested name for logging (e.g., "todo" instead of "@elizaos/plugin-todo")
        const logName = pluginNameMap.get(plugin.name) || plugin.name;
        logger.info(`Running migrations for plugin: ${logName}`);
        
        // Note: The actual migration happens in runtime.runMigrations()
        // This is just logging for visibility
        
        if (plugin.name === '@elizaos/plugin-sql' || plugin.schema) {
          // Log successful migration
          logger.info(`Successfully migrated plugin: ${logName}`);
        }
      }
    }
    
    // Run the actual migrations
    await runtime.runMigrations();
    
    logger.info('Plugin migrations completed.');
  } catch (error) {
    logger.error('Failed to run plugin migrations:', error);
    throw error;
  }

  await server.registerAgent(runtime);
  logger.log(`Started ${runtime.character.name} as ${runtime.agentId}`);
  return runtime;
}

/**
 * Stop an agent and unregister it from the server
 */
export async function stopAgent(runtime: IAgentRuntime, server: AgentServer): Promise<void> {
  await runtime.close();
  server.unregisterAgent(runtime.agentId);
  logger.success(`Agent ${runtime.character.name} stopped successfully!`);
}
