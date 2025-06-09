import { type Plugin, logger } from '@elizaos/core';
import { getCliInstallTag } from './display-banner';
import { detectPluginContext, provideLocalPluginGuidance } from './plugin-context';
import { installPlugin } from './install-plugin';
import { loadPluginModule } from './load-plugin';

export interface DependencyLoadingOptions {
  includeTestDependencies?: boolean;
  maxDepth?: number;
  visitedPlugins?: Set<string>;
}

export interface DependencyLoadingResult {
  plugins: Map<string, Plugin>;
  loadOrder: string[];
  errors: Array<{ plugin: string; error: string }>;
}

/**
 * Recursively loads plugin dependencies with deduplication and circular dependency detection
 */
export async function loadPluginDependenciesUnified(
  pluginNames: string[],
  options: DependencyLoadingOptions = {}
): Promise<DependencyLoadingResult> {
  const {
    includeTestDependencies = false,
    maxDepth = 10,
    visitedPlugins = new Set<string>(),
  } = options;

  const result: DependencyLoadingResult = {
    plugins: new Map<string, Plugin>(),
    loadOrder: [],
    errors: [],
  };

  const recursionStack = new Set<string>();

  async function loadPluginWithDependencies(pluginName: string, depth: number = 0): Promise<void> {
    if (depth > maxDepth) {
      result.errors.push({
        plugin: pluginName,
        error: `Maximum dependency depth (${maxDepth}) exceeded`,
      });
      return;
    }

    if (recursionStack.has(pluginName)) {
      const cycle = Array.from(recursionStack).concat([pluginName]).join(' -> ');
      result.errors.push({
        plugin: pluginName,
        error: `Circular dependency detected: ${cycle}`,
      });
      return;
    }

    if (result.plugins.has(pluginName) || visitedPlugins.has(pluginName)) {
      return;
    }

    visitedPlugins.add(pluginName);
    recursionStack.add(pluginName);

    try {
      logger.debug(`Loading plugin: ${pluginName} (depth: ${depth})`);

      // Load the plugin module
      const plugin = await loadAndPreparePlugin(pluginName);

      if (!plugin) {
        throw new Error('Failed to load plugin module');
      }

      // Collect dependencies to load
      const dependenciesToLoad: string[] = [];

      // Always include regular dependencies
      if (plugin.dependencies) {
        if (Array.isArray(plugin.dependencies)) {
          dependenciesToLoad.push(...plugin.dependencies);
        } else if (typeof plugin.dependencies === 'object') {
          dependenciesToLoad.push(...Object.keys(plugin.dependencies));
        }
      }

      // Include test dependencies if requested
      if (includeTestDependencies && plugin.testDependencies) {
        if (Array.isArray(plugin.testDependencies)) {
          dependenciesToLoad.push(...plugin.testDependencies);
        } else if (typeof plugin.testDependencies === 'object') {
          dependenciesToLoad.push(...Object.keys(plugin.testDependencies));
        }
      }

      // Recursively load dependencies first (topological order)
      for (const depName of dependenciesToLoad) {
        await loadPluginWithDependencies(depName, depth + 1);
      }

      // After attempting to load all dependencies, check if any errors occurred in the process.
      // We only add the plugin if its entire dependency chain is clean.
      const hasErrorsInChain = dependenciesToLoad.some((depName) =>
        result.errors.some((e) => e.plugin === depName)
      );

      const isCircular = result.errors.some(
        (e) => e.plugin === pluginName && e.error.includes('Circular')
      );

      if (!hasErrorsInChain && !isCircular) {
        result.plugins.set(pluginName, plugin);
        result.loadOrder.push(pluginName);
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      if (!result.errors.some((e) => e.plugin === pluginName)) {
        result.errors.push({ plugin: pluginName, error: errorMessage });
      }
    } finally {
      recursionStack.delete(pluginName);
    }
  }

  for (const pluginName of pluginNames) {
    await loadPluginWithDependencies(pluginName);
  }

  // Clean up the load order to remove any plugins that are part of a failed chain
  const erroredPlugins = new Set(result.errors.map((e) => e.plugin));
  result.loadOrder = result.loadOrder.filter((p) => !erroredPlugins.has(p));

  return result;
}

/**
 * Loads and prepares a plugin by its name.
 * This includes detecting local development, installing if necessary, and finding the plugin export.
 */
export async function loadAndPreparePlugin(pluginName: string): Promise<Plugin | null> {
  const version = getCliInstallTag();
  let pluginModule: any;

  // Check if this is a local development scenario BEFORE attempting any loading
  const context = detectPluginContext(pluginName);

  if (context.isLocalDevelopment) {
    logger.debug(`Local plugin development detected for: ${pluginName}`);

    // For local development, we should never try to install - just load directly
    try {
      pluginModule = await loadPluginModule(pluginName);
      if (!pluginModule) {
        logger.error(`Failed to load local plugin ${pluginName}.`);
        provideLocalPluginGuidance(pluginName, context);
        return null;
      }
    } catch (error) {
      logger.error(`Error loading local plugin ${pluginName}: ${error}`);
      provideLocalPluginGuidance(pluginName, context);
      return null;
    }
  } else {
    // External plugin - use existing logic
    try {
      // Use the centralized loader first
      pluginModule = await loadPluginModule(pluginName);

      if (!pluginModule) {
        // If loading failed, try installing and then loading again
        logger.info(`Plugin ${pluginName} not available, installing into ${process.cwd()}...`);
        try {
          await installPlugin(pluginName, process.cwd(), version);
          // Try loading again after installation using the centralized loader
          pluginModule = await loadPluginModule(pluginName);
        } catch (installError) {
          logger.error(`Failed to install plugin ${pluginName}: ${installError}`);
          return null; // Installation failed
        }

        if (!pluginModule) {
          logger.error(`Failed to load plugin ${pluginName} even after installation.`);
          return null; // Loading failed post-installation
        }
      }
    } catch (error) {
      // Catch any unexpected error during the combined load/install/load process
      logger.error(`An unexpected error occurred while processing plugin ${pluginName}: ${error}`);
      return null;
    }
  }

  if (!pluginModule) {
    // This check might be redundant now, but kept for safety.
    logger.error(`Failed to process plugin ${pluginName} (module is null/undefined unexpectedly)`);
    return null;
  }

  // Construct the expected camelCase export name (e.g., @elizaos/plugin-foo-bar -> fooBarPlugin)
  const expectedFunctionName = `${pluginName
    .replace(/^@elizaos\/plugin-/, '') // Remove prefix
    .replace(/^@elizaos-plugins\//, '') // Remove alternative prefix
    .replace(/-./g, (match) => match[1].toUpperCase())}Plugin`; // Convert kebab-case to camelCase and add 'Plugin' suffix

  // 1. Prioritize the expected named export if it exists
  const expectedExport = pluginModule[expectedFunctionName];
  if (isValidPluginShape(expectedExport)) {
    return expectedExport as Plugin;
  }

  // 2. Check the default export if the named one wasn't found or valid
  const defaultExport = pluginModule.default;
  if (isValidPluginShape(defaultExport)) {
    // Ensure it's not the same invalid object we might have checked above
    if (expectedExport !== defaultExport) {
      return defaultExport as Plugin;
    }
  }

  // 3. If neither primary method worked, search all exports aggressively
  for (const key of Object.keys(pluginModule)) {
    if (key === expectedFunctionName || key === 'default') {
      continue;
    }

    const potentialPlugin = pluginModule[key];
    if (isValidPluginShape(potentialPlugin)) {
      return potentialPlugin as Plugin;
    }
  }

  logger.warn(
    `Could not find a valid plugin export in ${pluginName}. Checked exports: ${expectedFunctionName} (if exists), default (if exists), and others. Available exports: ${Object.keys(pluginModule).join(', ')}`
  );
  return null;
}

/**
 * Validates if an object has the shape of a Plugin
 */
function isValidPluginShape(obj: any): obj is Plugin {
  if (!obj || typeof obj !== 'object' || !obj.name) {
    return false;
  }

  // Check for at least one functional property
  return !!(
    obj.init ||
    obj.services ||
    obj.providers ||
    obj.actions ||
    obj.evaluators ||
    obj.adapter ||
    obj.models ||
    obj.events ||
    obj.routes ||
    obj.tests ||
    obj.config ||
    obj.description
  );
}

/**
 * Helper function to get all dependencies (regular + test) from a plugin
 */
export function getAllDependencies(plugin: Plugin, includeTestDependencies = false): string[] {
  const dependencies = [...(plugin.dependencies || [])];

  if (includeTestDependencies && plugin.testDependencies) {
    dependencies.push(...plugin.testDependencies);
  }

  // Remove duplicates
  return Array.from(new Set(dependencies));
}

/**
 * Helper function to validate dependency loading result
 */
export function validateDependencyResult(result: DependencyLoadingResult): boolean {
  if (result.errors.length > 0) {
    logger.error('Plugin dependency loading encountered errors:');
    for (const error of result.errors) {
      logger.error(`  ${error.plugin}: ${error.error}`);
    }
    return false;
  }

  return true;
}
