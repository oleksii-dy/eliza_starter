import { logger, type Plugin } from '@elizaos/core';

/**
 * Check if an object has a valid plugin shape
 */
export function isValidPluginShape(obj: any): obj is Plugin {
  if (!obj || typeof obj !== 'object' || !obj.name) {
    return false;
  }
  return !!(
    obj.init ||
    obj.services ||
    obj.providers ||
    obj.actions ||
    obj.evaluators ||
    obj.description
  );
}

/**
 * Load a plugin module by name
 * Simplified version for server - doesn't handle automatic installation
 */
export async function loadPluginModule(pluginName: string): Promise<any> {
  try {
    // Handle scoped package names
    const modulePath = pluginName.startsWith('@') ? pluginName : `@elizaos/plugin-${pluginName}`;
    
    logger.debug(`Loading plugin module: ${modulePath}`);
    const pluginModule = await import(modulePath);
    
    return pluginModule;
  } catch (error) {
    logger.error(`Failed to load plugin module ${pluginName}:`, error);
    return null;
  }
}

/**
 * Load and prepare a plugin for use in server context
 * Simplified version without CLI-specific installation logic
 */
export async function loadAndPreparePlugin(pluginName: string): Promise<Plugin | null> {
  let pluginModule: any;

  try {
    pluginModule = await loadPluginModule(pluginName);
    if (!pluginModule) {
      logger.error(`Failed to load plugin ${pluginName}.`);
      return null;
    }
  } catch (error) {
    logger.error(`Error loading plugin ${pluginName}: ${error}`);
    return null;
  }

  if (!pluginModule) {
    logger.error(`Failed to load module for plugin ${pluginName}.`);
    return null;
  }

  // Try to find the plugin export using common naming patterns
  const expectedFunctionName = `${pluginName
    .replace(/^@elizaos\/plugin-/, '')
    .replace(/^@elizaos\//, '')
    .replace(/-./g, (match) => match[1].toUpperCase())}Plugin`;

  const exportsToCheck = [
    pluginModule.plugin, // Common export name
    pluginModule[expectedFunctionName],
    pluginModule.default,
    ...Object.values(pluginModule),
  ];

  for (const potentialPlugin of exportsToCheck) {
    if (isValidPluginShape(potentialPlugin)) {
      logger.debug(`Successfully loaded plugin: ${potentialPlugin.name}`);
      return potentialPlugin as Plugin;
    }
  }

  logger.warn(`Could not find a valid plugin export in ${pluginName}.`);
  return null;
}

/**
 * Simple dependency resolution for plugins
 * Returns plugins in dependency order
 */
export function resolvePluginDependencies(
  availablePlugins: Map<string, Plugin>,
  includeTestDependencies = false
): Plugin[] {
  const resolved: Plugin[] = [];
  const visited = new Set<string>();
  const visiting = new Set<string>();

  function visit(pluginName: string): void {
    if (visited.has(pluginName)) return;
    if (visiting.has(pluginName)) {
      logger.warn(`Circular dependency detected for plugin: ${pluginName}`);
      return;
    }

    const plugin = availablePlugins.get(pluginName);
    if (!plugin) {
      logger.warn(`Plugin not found: ${pluginName}`);
      return;
    }

    visiting.add(pluginName);

    // Visit dependencies first
    const dependencies = plugin.dependencies || [];
    const testDependencies = includeTestDependencies ? (plugin.testDependencies || []) : [];
    
    for (const dep of [...dependencies, ...testDependencies]) {
      visit(dep);
    }

    visiting.delete(pluginName);
    visited.add(pluginName);
    resolved.push(plugin);
  }

  // Visit all plugins
  for (const pluginName of availablePlugins.keys()) {
    visit(pluginName);
  }

  return resolved;
}

/**
 * Load multiple plugins by name with dependency resolution
 */
export async function loadPlugins(pluginNames: string[]): Promise<Plugin[]> {
  const loadedPlugins = new Map<string, Plugin>();
  
  // Load all requested plugins
  for (const pluginName of pluginNames) {
    const plugin = await loadAndPreparePlugin(pluginName);
    if (plugin) {
      loadedPlugins.set(plugin.name, plugin);
      
      // Add dependencies to load list
      const deps = plugin.dependencies || [];
      for (const dep of deps) {
        if (!loadedPlugins.has(dep)) {
          const depPlugin = await loadAndPreparePlugin(dep);
          if (depPlugin) {
            loadedPlugins.set(depPlugin.name, depPlugin);
          }
        }
      }
    }
  }
  
  // Resolve dependencies and return ordered list
  return resolvePluginDependencies(loadedPlugins);
}