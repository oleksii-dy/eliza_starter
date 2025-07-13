import { logger, type Plugin } from '@elizaos/core';

/**
 * Resolve plugin dependencies with circular dependency detection
 *
 * Performs topological sorting of plugins to ensure dependencies are loaded in the correct order, with support for test dependencies.
 */
export function resolvePluginDependencies(
  availablePlugins: Map<string, Plugin>,
  isTestMode: boolean = false
): Plugin[] {
  const resolutionOrder: string[] = [];
  const visited = new Set<string>();
  const visiting = new Set<string>();
  const missingDeps = new Set<string>();

  function visit(pluginName: string) {
    if (!availablePlugins.has(pluginName)) {
      missingDeps.add(pluginName);
      return;
    }
    if (visited.has(pluginName)) return;
    if (visiting.has(pluginName)) {
      logger.error(`Circular dependency detected involving plugin: ${pluginName}`);
      return;
    }

    visiting.add(pluginName);
    const plugin = availablePlugins.get(pluginName);
    if (plugin) {
      // Use Set for deduplication of dependencies
      const deps = new Set([...(plugin.dependencies || [])]);
      if (isTestMode) {
        (plugin.testDependencies || []).forEach((dep) => deps.add(dep));
      }
      for (const dep of deps) {
        visit(dep);
      }
    }
    visiting.delete(pluginName);
    visited.add(pluginName);
    resolutionOrder.push(pluginName);
  }

  for (const name of availablePlugins.keys()) {
    if (!visited.has(name)) {
      visit(name);
    }
  }

  const finalPlugins = resolutionOrder
    .map((name) => availablePlugins.get(name))
    .filter((p) => p) as Plugin[];

  // Log missing dependencies for debugging
  if (missingDeps.size > 0) {
    logger.warn(`Missing dependencies: ${Array.from(missingDeps).join(', ')}`);
  }

  logger.info(`Final plugins being loaded: ${finalPlugins.map((p) => p.name).join(', ')}`);

  return finalPlugins;
}
