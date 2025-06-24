import { z } from 'zod';
import { logger } from '@elizaos/core';

// Default values
const DEFAULT_FORGE_PATH = 'forge';
const DEFAULT_SLITHER_PATH = 'slither';
const DEFAULT_HARDHAT_PATH = 'npx hardhat'; // npx is needed for hardhat CLI
// Placeholder Docker images - users should configure these based on their environment/available images
const DEFAULT_FOUNDRY_DOCKER_IMAGE = 'ghcr.io/foundry-rs/foundry:latest';
const DEFAULT_SLITHER_DOCKER_IMAGE = 'ghcr.io/crytic/slither:latest';
const DEFAULT_HARDHAT_DOCKER_IMAGE = 'node:18-slim'; // Generic Node image, Hardhat would be run via npx

export const AuditorPluginConfigSchema = z.object({
  FORGE_PATH: z.string().optional().default(DEFAULT_FORGE_PATH),
  SLITHER_PATH: z.string().optional().default(DEFAULT_SLITHER_PATH),
  HARDHAT_PATH: z.string().optional().default(DEFAULT_HARDHAT_PATH), // For non-Dockerized Hardhat

  DEFAULT_FOUNDRY_DOCKER_IMAGE: z.string().optional().default(DEFAULT_FOUNDRY_DOCKER_IMAGE),
  DEFAULT_SLITHER_DOCKER_IMAGE: z.string().optional().default(DEFAULT_SLITHER_DOCKER_IMAGE),
  DEFAULT_HARDHAT_DOCKER_IMAGE: z.string().optional().default(DEFAULT_HARDHAT_DOCKER_IMAGE),

  // Could add a global flag to enable/disable Docker sandboxing for testing/dev
  // USE_DOCKER_SANDBOXING: z.boolean().optional().default(true),
});

export type AuditorPluginConfig = z.infer<typeof AuditorPluginConfigSchema>;

// This global variable will hold the validated configuration for the plugin instance.
// It's populated by the plugin's init method.
export let currentConfig: AuditorPluginConfig;

/**
 * Validates and sets the plugin configuration.
 * Called by the plugin's init method.
 * @param {Record<string, any>} config - Configuration object from plugin init.
 * @returns {AuditorPluginConfig} The validated configuration.
 */
export function initializeAuditorConfig(config: Record<string, any> = {}): AuditorPluginConfig {
  try {
    const configToParse = {
      FORGE_PATH: config.FORGE_PATH || process.env.FORGE_PATH,
      SLITHER_PATH: config.SLITHER_PATH || process.env.SLITHER_PATH,
      HARDHAT_PATH: config.HARDHAT_PATH || process.env.HARDHAT_PATH,
      DEFAULT_FOUNDRY_DOCKER_IMAGE: config.DEFAULT_FOUNDRY_DOCKER_IMAGE || process.env.DEFAULT_FOUNDRY_DOCKER_IMAGE,
      DEFAULT_SLITHER_DOCKER_IMAGE: config.DEFAULT_SLITHER_DOCKER_IMAGE || process.env.DEFAULT_SLITHER_DOCKER_IMAGE,
      DEFAULT_HARDHAT_DOCKER_IMAGE: config.DEFAULT_HARDHAT_DOCKER_IMAGE || process.env.DEFAULT_HARDHAT_DOCKER_IMAGE,
    };

    currentConfig = AuditorPluginConfigSchema.parse(configToParse);
    logger.info('Blockchain Auditor Plugin configuration initialized and validated.');
    logger.debug('Blockchain Auditor Config:', currentConfig);
    return currentConfig;
  } catch (error) {
    if (error instanceof z.ZodError) {
      const errorMessages = error.errors.map(err => `${err.path.join('.') || 'config'}: ${err.message}`).join('; ');
      logger.error('Blockchain Auditor plugin configuration validation failed:', { errors: errorMessages });
      throw new Error(`Blockchain Auditor plugin config error: ${errorMessages}`);
    }
    logger.error('Unexpected error during Blockchain Auditor config validation:', error);
    throw error;
  }
}

// Helper to get the current config, ensuring it's initialized
export function getAuditorConfig(): AuditorPluginConfig {
  if (!currentConfig) {
    // This case should ideally not happen if plugin.init always calls initializeAuditorConfig
    logger.warn('Auditor config accessed before initialization. Attempting default init.');
    return initializeAuditorConfig(); // Initialize with defaults / env vars
  }
  return currentConfig;
}
