import { logger } from '@elizaos/core';
import { 
  ConfigManager,
  loadConfiguration,
  validatePluginEnvironment,
  getEnvironmentVariable,
  resolveEnvironmentFile,
  type ElizaConfig,
  type RuntimeConfig
} from '@elizaos/server';
import { existsSync } from 'node:fs';
import path from 'node:path';

/**
 * CLI-specific configuration wrapper that delegates to server configuration management
 * This eliminates duplication between CLI and server configuration handling
 */

export class CLIConfigManager {
  private static instance: CLIConfigManager;
  private serverConfig: ConfigManager;

  private constructor() {
    this.serverConfig = ConfigManager.getInstance();
  }

  static getInstance(): CLIConfigManager {
    if (!CLIConfigManager.instance) {
      CLIConfigManager.instance = new CLIConfigManager();
    }
    return CLIConfigManager.instance;
  }

  /**
   * Initialize CLI configuration by delegating to server configuration
   */
  async initializeConfig(options?: {
    envPath?: string;
    packageJsonPath?: string;
    configOverrides?: Partial<RuntimeConfig>;
  }): Promise<RuntimeConfig> {
    logger.debug('Initializing CLI configuration using server configuration manager with package.json support');
    
    try {
      const config = await loadConfiguration(options);
      logger.info('CLI configuration initialized successfully from package.json and environment');
      return config;
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      logger.error(`Failed to initialize CLI configuration: ${errorMsg}`);
      throw error;
    }
  }

  /**
   * Get environment variable using server configuration management
   */
  getEnvVar<K extends keyof typeof import('@elizaos/server').ENVIRONMENT_REGISTRY>(
    key: K,
    defaultValue?: string
  ): string | undefined {
    return getEnvironmentVariable(key, defaultValue);
  }

  /**
   * Validate plugin environment using server configuration management
   */
  validatePluginEnv(pluginName: string): { valid: boolean; missing: string[] } {
    return validatePluginEnvironment(pluginName);
  }

  /**
   * Resolve environment file path using server configuration management
   */
  resolveEnvPath(startDir?: string): string {
    return resolveEnvironmentFile(startDir);
  }

  /**
   * Check if .env file exists at the resolved path
   */
  hasEnvFile(startDir?: string): boolean {
    const envPath = this.resolveEnvPath(startDir);
    return existsSync(envPath);
  }

  /**
   * Get current configuration from server
   */
  getCurrentConfig(): RuntimeConfig {
    return this.serverConfig.getConfig();
  }

  /**
   * CLI-specific configuration validation for command-line usage
   */
  async validateCLIEnvironment(requiredPlugins: string[] = []): Promise<{
    valid: boolean;
    issues: Array<{ plugin: string; missing: string[] }>;
  }> {
    const issues: Array<{ plugin: string; missing: string[] }> = [];
    
    // Validate each required plugin
    for (const plugin of requiredPlugins) {
      const validation = this.validatePluginEnv(plugin);
      if (!validation.valid) {
        issues.push({
          plugin,
          missing: validation.missing,
        });
      }
    }
    
    // Check for at least one AI provider
    const hasOpenAI = !!process.env.OPENAI_API_KEY;
    const hasAnthropic = !!process.env.ANTHROPIC_API_KEY;
    const hasLocalAI = !!process.env.LOCAL_AI_URL || !!process.env.LOCAL_AI_API_KEY;
    
    if (!hasOpenAI && !hasAnthropic && !hasLocalAI) {
      issues.push({
        plugin: 'ai-provider',
        missing: ['OPENAI_API_KEY or ANTHROPIC_API_KEY or LOCAL_AI configuration'],
      });
    }
    
    return {
      valid: issues.length === 0,
      issues,
    };
  }

  /**
   * CLI-specific database configuration helper
   */
  getDatabaseConfig(): { type: 'postgres' | 'pglite'; config: any } | null {
    const config = this.getCurrentConfig();
    
    if (config.database) {
      return config.database;
    }
    
    // Fallback to environment variables
    if (process.env.POSTGRES_URL) {
      return {
        type: 'postgres',
        config: { url: process.env.POSTGRES_URL },
      };
    }
    
    if (process.env.PGLITE_DATA_DIR) {
      return {
        type: 'pglite',
        config: { dataDir: process.env.PGLITE_DATA_DIR },
      };
    }
    
    return null;
  }

  /**
   * Get server configuration for CLI commands
   */
  getServerConfig(): { port: number; host: string } {
    const config = this.getCurrentConfig();
    
    return {
      port: config.server?.port || parseInt(process.env.PORT || '3000', 10),
      host: config.server?.host || process.env.HOST || 'localhost',
    };
  }

  /**
   * Validate port configuration
   */
  validatePort(port: number): boolean {
    return port >= 1 && port <= 65535 && Number.isInteger(port);
  }

  /**
   * CLI-specific logging configuration
   */
  getLogLevel(): string {
    const config = this.getCurrentConfig();
    return config.logging?.level || this.getEnvVar('LOG_LEVEL', 'info') || 'info';
  }


  /**
   * Reset configuration (for testing)
   */
  reset(): void {
    this.serverConfig.reset();
  }
}

// Export singleton instance and convenience functions
export const cliConfig = CLIConfigManager.getInstance();

/**
 * Convenience functions for CLI configuration access
 */

export async function initializeCLIConfig(options?: {
  envPath?: string;
  packageJsonPath?: string;
  configOverrides?: Partial<RuntimeConfig>;
}): Promise<RuntimeConfig> {
  return cliConfig.initializeConfig(options);
}

export function getCLIEnvVar<K extends keyof typeof import('@elizaos/server').ENVIRONMENT_REGISTRY>(
  key: K,
  defaultValue?: string
): string | undefined {
  return cliConfig.getEnvVar(key, defaultValue);
}

export function validateCLIPluginEnvironment(pluginName: string): { valid: boolean; missing: string[] } {
  return cliConfig.validatePluginEnv(pluginName);
}

export function resolveCLIEnvPath(startDir?: string): string {
  return cliConfig.resolveEnvPath(startDir);
}

export function hasCLIEnvFile(startDir?: string): boolean {
  return cliConfig.hasEnvFile(startDir);
}

export async function validateCLIEnvironment(requiredPlugins: string[] = []): Promise<{
  valid: boolean;
  issues: Array<{ plugin: string; missing: string[] }>;
}> {
  return cliConfig.validateCLIEnvironment(requiredPlugins);
}

export function getCLIDatabaseConfig(): { type: 'postgres' | 'pglite'; config: any } | null {
  return cliConfig.getDatabaseConfig();
}

export function getCLIServerConfig(): { port: number; host: string } {
  return cliConfig.getServerConfig();
}

export function getCLILogLevel(): string {
  return cliConfig.getLogLevel();
}

