import { getCliInstallTag, installPlugin, loadPluginModule } from '@/src/utils';
import { detectPluginContext, provideLocalPluginGuidance } from '@/src/utils/plugin-context';
import {
  installPluginDependencies,
  validatePluginDependencies,
} from '@/src/utils/plugin-dependency-manager';
import { logger, type Plugin } from '@elizaos/core';
import { PluginValidation } from '../types';

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
 * Load and prepare a plugin for use
 *
 * Handles both local development plugins and published plugins, with automatic installation if needed.
 * Also ensures all plugin dependencies are installed before loading.
 */
export async function loadAndPreparePlugin(pluginName: string): Promise<Plugin | null> {
  const version = getCliInstallTag();
  let pluginModule: any;
  const context = detectPluginContext(pluginName);

  if (context.isLocalDevelopment) {
    try {
      // For local development, validate dependencies but don't auto-install
      const dependencyValidation = await validatePluginDependencies(pluginName);
      if (!dependencyValidation.isValid) {
        logger.warn(
          `Local plugin ${pluginName} has missing dependencies: ${dependencyValidation.missingDependencies.join(', ')}`
        );
        logger.info('Please install missing dependencies manually for local development plugins');
      }

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
    try {
      pluginModule = await loadPluginModule(pluginName);
      if (!pluginModule) {
        logger.info(`Plugin ${pluginName} not available, installing...`);
        await installPlugin(pluginName, process.cwd(), version);
        pluginModule = await loadPluginModule(pluginName);
      }

      // After plugin is available, check and install its dependencies
      if (pluginModule) {
        logger.debug(`Checking dependencies for plugin ${pluginName}...`);
        const dependenciesInstalled = await installPluginDependencies(pluginName);

        if (!dependenciesInstalled) {
          logger.error(`Failed to install dependencies for plugin ${pluginName}`);
          return null;
        }
      }
    } catch (error) {
      logger.error(`Failed to process plugin ${pluginName}: ${error}`);
      return null;
    }
  }

  if (!pluginModule) {
    logger.error(`Failed to load module for plugin ${pluginName}.`);
    return null;
  }

  const expectedFunctionName = `${pluginName
    .replace(/^@elizaos\/plugin-/, '')
    .replace(/^@elizaos\//, '')
    .replace(/-./g, (match) => match[1].toUpperCase())}Plugin`;

  const exportsToCheck = [
    pluginModule[expectedFunctionName],
    pluginModule.default,
    ...Object.values(pluginModule),
  ];

  for (const potentialPlugin of exportsToCheck) {
    if (isValidPluginShape(potentialPlugin)) {
      return potentialPlugin as Plugin;
    }
  }

  logger.warn(`Could not find a valid plugin export in ${pluginName}.`);
  return null;
}

/**
 * Validate a plugin object
 */
export function validatePlugin(plugin: any): PluginValidation {
  if (!plugin) {
    return { isValid: false, error: 'Plugin is null or undefined' };
  }

  if (!isValidPluginShape(plugin)) {
    return { isValid: false, error: 'Plugin does not have valid shape' };
  }

  return { isValid: true, plugin };
}
