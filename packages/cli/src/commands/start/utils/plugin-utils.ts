import { getCliInstallTag, installPlugin, loadPluginModule } from '@/src/utils';
import { detectPluginContext, provideLocalPluginGuidance } from '@/src/utils/plugin-context';
import { logger, type Plugin } from '@elizaos/core';
import { PluginValidation } from '../types';
import { dynamicImport, getEnvironmentConfig } from '@/src/utils/environment-normalization';

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
 * Map of short plugin names to full package names
 */
const pluginNameMapping: Record<string, string> = {
  todo: '@elizaos/plugin-todo',
  trust: '@elizaos/plugin-trust',
  rolodex: '@elizaos/plugin-rolodex',
  bootstrap: '@elizaos/plugin-message-handling',
  openai: '@elizaos/plugin-openai',
  anthropic: '@elizaos/plugin-anthropic',
  sql: '@elizaos/plugin-sql',
  'message-handling': '@elizaos/plugin-message-handling',
  messageHandling: '@elizaos/plugin-message-handling',
  knowledge: '@elizaos/plugin-knowledge',
  research: '@elizaos/plugin-research',
  'web-search': '@elizaos/plugin-web-search',
  planning: '@elizaos/plugin-planning',
  goals: '@elizaos/plugin-goals',
  stagehand: '@elizaos/plugin-stagehand',
  'plugin-manager': '@elizaos/plugin-plugin-manager',
  github: '@elizaos/plugin-github',
  solana: '@elizaos/plugin-solana',
  evm: '@elizaos/plugin-evm',
  'secrets-manager': '@elizaos/plugin-secrets-manager',
  shell: '@elizaos/plugin-shell',
  mcp: '@elizaos/plugin-mcp',
  ngrok: '@elizaos/plugin-ngrok',
  agentkit: '@elizaos/plugin-agentkit',
  autocoder: '@elizaos/plugin-autocoder',
};

/**
 * Load a plugin module with environment-aware import handling
 */
async function loadPluginModuleWithEnvironment(pluginName: string): Promise<any> {
  // const envConfig = getEnvironmentConfig(); // Available for future environment-based plugin filtering

  try {
    // First try the standard loadPluginModule
    const module = await loadPluginModule(pluginName);
    if (module) {
      return module;
    }
  } catch {
    logger.debug(
      `Standard plugin loading failed for ${pluginName}, trying environment-aware loading`
    );
  }

  // Try environment-aware dynamic import
  try {
    // Handle local plugin paths
    if (pluginName.startsWith('./') || pluginName.startsWith('../')) {
      return await dynamicImport(pluginName);
    }

    // Handle package imports
    return await import(pluginName);
  } catch (error) {
    logger.debug(`Environment-aware loading failed for ${pluginName}:`, error);
    return null;
  }
}

/**
 * Load and prepare a plugin for use
 *
 * Handles both local development plugins and published plugins, with automatic installation if needed.
 */
export async function loadAndPreparePlugin(pluginName: string): Promise<Plugin | null> {
  const version = getCliInstallTag();
  let pluginModule: any;

  // Map short plugin names to full package names
  const resolvedPluginName = pluginNameMapping[pluginName] || pluginName;

  const context = detectPluginContext(resolvedPluginName);
  const envConfig = getEnvironmentConfig();

  if (context.isLocalDevelopment) {
    try {
      pluginModule = await loadPluginModuleWithEnvironment(resolvedPluginName);
      if (!pluginModule) {
        logger.error(`Failed to load local plugin ${resolvedPluginName}.`);
        provideLocalPluginGuidance(resolvedPluginName, context);
        return null;
      }
    } catch (error) {
      logger.error(`Error loading local plugin ${resolvedPluginName}: ${error}`);
      provideLocalPluginGuidance(resolvedPluginName, context);

      // Provide additional guidance for common environment issues
      if (error instanceof Error && error.message.includes('Cannot find module')) {
        if (envConfig.requiresJsExtensions) {
          logger.info(
            'Hint: In the built CLI environment, make sure all relative imports have .js extensions'
          );
        }
        if (envConfig.isTypeScript) {
          logger.info('Hint: In TypeScript environment, you can import .ts files directly');
        }
      }

      return null;
    }
  } else {
    try {
      pluginModule = await loadPluginModuleWithEnvironment(resolvedPluginName);
      if (!pluginModule) {
        logger.info(`Plugin ${resolvedPluginName} not available, installing...`);
        await installPlugin(resolvedPluginName, process.cwd(), version);
        pluginModule = await loadPluginModuleWithEnvironment(resolvedPluginName);
      }
    } catch (error) {
      logger.error(`Failed to process plugin ${resolvedPluginName}: ${error}`);
      return null;
    }
  }

  if (!pluginModule) {
    logger.error(`Failed to load module for plugin ${resolvedPluginName}.`);
    return null;
  }

  const expectedFunctionName = `${resolvedPluginName
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
      // Set the name to match what was requested if using a short name
      if (pluginNameMapping[pluginName]) {
        potentialPlugin.name = resolvedPluginName;
      }
      return potentialPlugin as Plugin;
    }
  }

  logger.warn(`Could not find a valid plugin export in ${resolvedPluginName}.`);

  // Provide helpful debugging info
  if (envConfig.isMonorepo) {
    logger.info(
      'Running in monorepo context. Make sure the plugin is properly built if using TypeScript.'
    );
  }

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
