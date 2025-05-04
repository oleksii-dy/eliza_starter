import { promises as fs } from 'node:fs';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { logger } from '@elizaos/core';
import colors from 'yoctocolors';
import { UserEnvironment } from './user-environment';
import { validatePluginEnvVars } from './env-prompt';

/**
 * Interface for the agent's configuration
 */
interface AgentConfig {
  lastUpdated: string;
  isDefault?: boolean; // Flag to indicate if this is a default config
}

/**
 * Path to the config file
 */
export async function getConfigFilePath(): Promise<string> {
  const userEnv = UserEnvironment.getInstance();
  const envInfo = await userEnv.getInfo();
  return envInfo.paths.configPath;
}

/**
 * Load the agent configuration if it exists
 * If no configuration exists, return a default empty configuration
 */
export async function loadConfig(): Promise<AgentConfig> {
  try {
    const configPath = await getConfigFilePath();
    if (!(await fs.exists(configPath))) {
      return {
        lastUpdated: new Date().toISOString(),
        isDefault: true, // Mark as default config
      };
    }

    const content = await fs.readFile(configPath, 'utf8');
    return JSON.parse(content) as AgentConfig;
  } catch (error) {
    logger.warn(`Error loading configuration: ${error}`);
    // Return default configuration on error
    return {
      lastUpdated: new Date().toISOString(),
      isDefault: true, // Mark as default config
    };
  }
}

/**
 * Save the agent configuration to disk
 */
export async function saveConfig(config: AgentConfig): Promise<void> {
  try {
    const configPath = await getConfigFilePath();
    const elizaDir = path.dirname(configPath);

    // Create .eliza directory if it doesn't exist
    if (!(await fs.exists(elizaDir))) {
      await fs.mkdir(elizaDir, { recursive: true });
    }

    // Update lastUpdated timestamp
    config.lastUpdated = new Date().toISOString();

    // Write config to file
    await fs.writeFile(configPath, JSON.stringify(config, null, 2), 'utf8');
    logger.info(`Configuration saved to ${configPath}`);
  } catch (error) {
    logger.error(`Error saving configuration: ${error}`);
  }
}

/**
 * Check if a plugin's requirements are met
 */
export async function checkPluginRequirements(pluginName: string): Promise<{
  valid: boolean;
  message: string;
}> {
  return validatePluginEnvVars(pluginName);
}

/**
 * Get the status of each plugin's environment variables
 */
export async function getPluginStatus(): Promise<Record<string, boolean>> {
  const configPath = await getConfigFilePath();
  if (!(await fs.exists(configPath))) {
    return {};
  }

  try {
    const configContent = await fs.readFile(configPath, 'utf-8');
    const config = JSON.parse(configContent);
    const status: Record<string, boolean> = {};

    // Check each plugin's environment variables
    for (const plugin of Object.keys(config.plugins ?? {})) {
      const check = await validatePluginEnvVars(plugin);
      status[plugin] = check.valid;
    }

    return status;
  } catch (error) {
    logger.error(`Error reading config file: ${error}`);
    return {};
  }
}
