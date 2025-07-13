import {
  AgentRuntime,
  encryptedCharacter,
  logger,
  stringToUuid,
  type Character,
  type IAgentRuntime,
  type Plugin,
} from '@elizaos/core';
import { plugin as sqlPlugin } from '@elizaos/plugin-sql';
import { AgentServer } from '@elizaos/server';
import { AgentStartOptions } from '../types';
import {
  loadEnvConfig,
  hasCharacterSecrets,
  setDefaultSecretsFromEnv,
} from '../utils/config-utils';
import { resolvePluginDependencies } from '../utils/dependency-resolver';
import { isValidPluginShape, loadAndPreparePlugin } from '../utils/plugin-utils';

/**
 * Recursively collect all dependencies for a set of plugins
 *
 * @param pluginsToLoad Set of plugin names to load
 * @param loadedPlugins Map of already loaded plugin objects
 * @param isTestMode Whether to include test dependencies
 * @returns Set of all plugin names including dependencies
 */
async function collectAllDependencies(
  pluginsToLoad: Set<string>,
  loadedPlugins: Map<string, Plugin>,
  isTestMode: boolean = false
): Promise<Set<string>> {
  const allDeps = new Set<string>();
  const processed = new Set<string>();

  async function collectDepsRecursive(pluginName: string): Promise<void> {
    if (processed.has(pluginName)) {
      return;
    }

    processed.add(pluginName);
    allDeps.add(pluginName);

    let plugin = loadedPlugins.get(pluginName);

    // If plugin is not in loadedPlugins, try to load it
    if (!plugin) {
      try {
        plugin = await loadAndPreparePlugin(pluginName);
        if (plugin) {
          loadedPlugins.set(pluginName, plugin);
        }
      } catch (error) {
        logger.warn(`Failed to load plugin ${pluginName} for dependency analysis: ${error}`);
        return;
      }
    }

    if (plugin) {
      // Add regular dependencies
      for (const dep of plugin.dependencies || []) {
        if (!processed.has(dep)) {
          await collectDepsRecursive(dep);
        }
      }

      // Add test dependencies only in test mode
      if (isTestMode) {
        for (const dep of plugin.testDependencies || []) {
          if (!processed.has(dep)) {
            await collectDepsRecursive(dep);
          }
        }
      }
    }
  }

  // Process all initially requested plugins
  for (const pluginName of pluginsToLoad) {
    await collectDepsRecursive(pluginName);
  }

  return allDeps;
}

/**
 * Start an agent with the given configuration
 *
 * Creates and initializes an agent runtime with plugins, handles dependency resolution, runs database migrations, and registers the agent with the server.
 */
export async function startAgent(
  character: Character,
  server: AgentServer,
  init?: (runtime: IAgentRuntime) => Promise<void>,
  plugins: (Plugin | string)[] = [],
  options: AgentStartOptions = {}
): Promise<IAgentRuntime> {
  character.id ??= stringToUuid(character.name);

  // Handle secrets for character configuration
  if (!hasCharacterSecrets(character)) {
    await setDefaultSecretsFromEnv(character);
  }

  const loadedPlugins = new Map<string, Plugin>();
  // Type-cast to ensure compatibility with local types
  loadedPlugins.set(sqlPlugin.name, sqlPlugin as unknown as Plugin); // Always include sqlPlugin

  // Collect all plugin names to load (including dependencies)
  const pluginsToLoad = new Set<string>(character.plugins || []);
  for (const p of plugins) {
    if (typeof p === 'string') {
      pluginsToLoad.add(p);
    } else if (isValidPluginShape(p) && !loadedPlugins.has(p.name)) {
      loadedPlugins.set(p.name, p);
      pluginsToLoad.add(p.name);
    }
  }

  // Recursively collect all dependencies
  const allDependencies = await collectAllDependencies(
    pluginsToLoad,
    loadedPlugins,
    options.isTestMode
  );

  // Use the plugins already loaded during dependency collection
  const allAvailablePlugins = new Map<string, Plugin>(loadedPlugins);

  // Resolve dependencies and get final plugin list
  const finalPlugins = resolvePluginDependencies(allAvailablePlugins, options.isTestMode);

  const runtime = new AgentRuntime({
    character: encryptedCharacter(character),
    plugins: finalPlugins,
    settings: await loadEnvConfig(),
  });

  const initWrapper = async (runtime: IAgentRuntime) => {
    if (init) {
      await init(runtime);
    }
  };

  await initWrapper(runtime);

  await runtime.initialize();

  server.registerAgent(runtime);
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
