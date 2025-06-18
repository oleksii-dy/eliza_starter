import dotenv from 'dotenv';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { z } from 'zod';
import { logger } from '@elizaos/core';

/**
 * Core configuration schemas for unified validation
 */

// Database configuration schemas
export const postgresConfigSchema = z.object({
  type: z.literal('postgres'),
  config: z.object({
    url: z.string().optional(),
    host: z.string().optional(),
    port: z.number().optional(),
    database: z.string().optional(),
    username: z.string().optional(),
    password: z.string().optional(),
  }),
});

export const pgliteConfigSchema = z.object({
  type: z.literal('pglite'),
  config: z.object({
    dataDir: z.string(),
  }),
});

export const databaseConfigSchema = z.union([postgresConfigSchema, pgliteConfigSchema]);

// Plugin configuration schema
export const pluginConfigSchema = z.object({
  name: z.string(),
  enabled: z.boolean().default(true),
  config: z.record(z.any()).optional(),
  requiredEnvVars: z.array(z.string()).optional(),
});

// Main configuration schema (to be embedded in package.json - for meta info only)
export const elizaConfigSchema = z.object({
  type: z.enum(['project', 'plugin']).optional(),
  characters: z.object({
    defaultPath: z.string().optional(),
    searchPaths: z.array(z.string()).optional(),
  }).optional(),
  // Project-specific configuration
  tee: z.object({
    enabled: z.boolean().optional(),
    provider: z.string().optional(),
  }).optional(),
});

// Package.json schema with eliza configuration
export const packageJsonWithElizaSchema = z.object({
  name: z.string(),
  version: z.string(),
  eliza: elizaConfigSchema.optional(),
  // Allow other package.json fields
}).passthrough();

// Runtime configuration schema (environment variables + computed values)
export const runtimeConfigSchema = z.object({
  database: databaseConfigSchema.optional(),
  plugins: z.array(pluginConfigSchema).optional(),
  logging: z.object({
    level: z.enum(['trace', 'debug', 'info', 'warn', 'error', 'fatal']).default('info'),
  }).optional(),
  server: z.object({
    port: z.number().min(1).max(65535).default(3000),
    host: z.string().default('localhost'),
  }).optional(),
  characters: z.object({
    defaultPath: z.string().optional(),
    searchPaths: z.array(z.string()).optional(),
  }).optional(),
});

export type ElizaConfig = z.infer<typeof elizaConfigSchema>;
export type RuntimeConfig = z.infer<typeof runtimeConfigSchema>;
export type DatabaseConfig = z.infer<typeof databaseConfigSchema>;
export type PluginConfig = z.infer<typeof pluginConfigSchema>;

/**
 * Environment variable registry with plugin-specific definitions
 */
export const ENVIRONMENT_REGISTRY = {
  // Core system variables
  LOG_LEVEL: {
    description: 'Logging level for the application',
    type: 'string' as const,
    default: 'info',
    validValues: ['trace', 'debug', 'info', 'warn', 'error', 'fatal'],
  },
  
  // Database variables
  POSTGRES_URL: {
    description: 'PostgreSQL connection URL',
    type: 'string' as const,
    plugin: 'database',
    required: false,
  },
  
  PGLITE_DATA_DIR: {
    description: 'PGLite data directory path',
    type: 'string' as const,
    plugin: 'database',
    required: false,
  },
  
  // AI Provider variables
  OPENAI_API_KEY: {
    description: 'OpenAI API key for GPT models',
    type: 'string' as const,
    plugin: 'openai',
    required: true,
    sensitive: true,
  },
  
  ANTHROPIC_API_KEY: {
    description: 'Anthropic API key for Claude models',
    type: 'string' as const,
    plugin: 'anthropic',
    required: true,
    sensitive: true,
  },
  
  // Platform integration variables
  DISCORD_APPLICATION_ID: {
    description: 'Discord application ID',
    type: 'string' as const,
    plugin: 'discord',
    required: false,
  },
  
  DISCORD_API_TOKEN: {
    description: 'Discord bot token',
    type: 'string' as const,
    plugin: 'discord',
    required: true,
    sensitive: true,
  },
  
  TWITTER_DRY_RUN: {
    description: 'Enable Twitter dry run mode',
    type: 'boolean' as const,
    plugin: 'twitter',
    default: 'false',
  },
  
  TELEGRAM_BOT_TOKEN: {
    description: 'Telegram bot token',
    type: 'string' as const,
    plugin: 'telegram',
    required: true,
    sensitive: true,
  },
} as const;

/**
 * Configuration loading and merging utilities
 */
export class ConfigManager {
  private static instance: ConfigManager;
  private config: RuntimeConfig = {};
  private packageJsonConfig: ElizaConfig = {};
  private envLoaded = false;

  private constructor() {}

  static getInstance(): ConfigManager {
    if (!ConfigManager.instance) {
      ConfigManager.instance = new ConfigManager();
    }
    return ConfigManager.instance;
  }

  /**
   * Resolve environment file path with monorepo support
   */
  static resolveEnvFile(startDir?: string): string {
    const searchDir = startDir || process.cwd();
    let currentDir = searchDir;
    
    // Search up the directory tree
    while (currentDir !== path.parse(currentDir).root) {
      const envPath = path.join(currentDir, '.env');
      if (existsSync(envPath)) {
        logger.debug(`Found .env file at: ${envPath}`);
        return envPath;
      }
      
      // Check if this is a monorepo root (has package.json with workspaces)
      const packageJsonPath = path.join(currentDir, 'package.json');
      if (existsSync(packageJsonPath)) {
        try {
          const packageJson = JSON.parse(require('fs').readFileSync(packageJsonPath, 'utf8'));
          if (packageJson.workspaces || packageJson.name === 'eliza') {
            // This is likely the monorepo root, use .env here even if it doesn't exist yet
            return path.join(currentDir, '.env');
          }
        } catch (e) {
          // Ignore JSON parse errors
        }
      }
      
      currentDir = path.dirname(currentDir);
    }
    
    // Fallback to current directory
    return path.join(searchDir, '.env');
  }

  /**
   * Resolve package.json file path with project detection
   */
  static resolvePackageJsonFile(startDir?: string): string {
    const searchDir = startDir || process.cwd();
    let currentDir = searchDir;
    
    // Search up the directory tree for package.json
    while (currentDir !== path.parse(currentDir).root) {
      const packageJsonPath = path.join(currentDir, 'package.json');
      if (existsSync(packageJsonPath)) {
        logger.debug(`Found package.json at: ${packageJsonPath}`);
        return packageJsonPath;
      }
      currentDir = path.dirname(currentDir);
    }
    
    // Fallback to current directory
    return path.join(searchDir, 'package.json');
  }

  /**
   * Load configuration from package.json eliza field
   */
  loadPackageJsonConfig(packageJsonPath?: string): ElizaConfig {
    const resolvedPath = packageJsonPath || ConfigManager.resolvePackageJsonFile();
    
    if (!existsSync(resolvedPath)) {
      logger.debug(`No package.json found at: ${resolvedPath}`);
      return {};
    }
    
    try {
      const packageJson = JSON.parse(require('fs').readFileSync(resolvedPath, 'utf8'));
      const validationResult = packageJsonWithElizaSchema.safeParse(packageJson);
      
      if (!validationResult.success) {
        logger.warn(`Invalid package.json structure at ${resolvedPath}: ${validationResult.error.message}`);
        return {};
      }
      
      const elizaConfig = validationResult.data.eliza || {};
      logger.debug(`Loaded eliza configuration from package.json: ${JSON.stringify(elizaConfig)}`);
      this.packageJsonConfig = elizaConfig;
      return elizaConfig;
    } catch (error) {
      logger.warn(`Failed to parse package.json at ${resolvedPath}: ${error}`);
      return {};
    }
  }

  /**
   * Load environment variables from .env file
   */
  loadEnvironment(envPath?: string): void {
    if (this.envLoaded) {
      return;
    }

    const resolvedEnvPath = envPath || ConfigManager.resolveEnvFile();
    
    if (existsSync(resolvedEnvPath)) {
      logger.debug(`Loading environment from: ${resolvedEnvPath}`);
      dotenv.config({ path: resolvedEnvPath });
    } else {
      logger.debug(`No .env file found at: ${resolvedEnvPath}`);
    }
    
    this.envLoaded = true;
  }

  /**
   * Get configuration value with type safety and validation
   */
  get<K extends keyof typeof ENVIRONMENT_REGISTRY>(
    key: K,
    defaultValue?: string
  ): string | undefined {
    this.loadEnvironment();
    
    const envDef = ENVIRONMENT_REGISTRY[key];
    const value = process.env[key] || defaultValue || ('default' in envDef ? envDef.default : undefined);
    
    if (!value && ('required' in envDef && envDef.required)) {
      throw new Error(`Required environment variable ${key} is not set`);
    }
    
    return value;
  }

  /**
   * Validate environment variables for specific plugins
   */
  validatePluginEnvironment(pluginName: string): { valid: boolean; missing: string[] } {
    this.loadEnvironment();
    
    const missing: string[] = [];
    
    for (const [key, def] of Object.entries(ENVIRONMENT_REGISTRY)) {
      if ('plugin' in def && def.plugin === pluginName && 'required' in def && def.required && !process.env[key]) {
        missing.push(key);
      }
    }
    
    return {
      valid: missing.length === 0,
      missing,
    };
  }

  /**
   * Get all environment variables for a specific plugin
   */
  getPluginEnvironment(pluginName: string): Record<string, string> {
    this.loadEnvironment();
    
    const pluginEnv: Record<string, string> = {};
    
    for (const [key, def] of Object.entries(ENVIRONMENT_REGISTRY)) {
      if ('plugin' in def && def.plugin === pluginName && process.env[key]) {
        pluginEnv[key] = process.env[key];
      }
    }
    
    return pluginEnv;
  }

  /**
   * Load and validate complete configuration
   */
  async loadConfig(options: {
    envPath?: string;
    packageJsonPath?: string;
    configOverrides?: Partial<RuntimeConfig>;
  } = {}): Promise<RuntimeConfig> {
    this.loadEnvironment(options.envPath);
    
    // Load configuration from package.json first (meta info only)
    const packageJsonConfig = this.loadPackageJsonConfig(options.packageJsonPath);
    
    // Build runtime configuration from environment variables
    const envConfig: Partial<RuntimeConfig> = {
      logging: {
        level: (process.env.LOG_LEVEL as any) || 'info',
      },
      server: {
        port: process.env.PORT ? parseInt(process.env.PORT, 10) : 3000,
        host: process.env.HOST || 'localhost',
      },
    };
    
    // Database configuration from environment
    if (process.env.POSTGRES_URL) {
      envConfig.database = {
        type: 'postgres',
        config: { url: process.env.POSTGRES_URL },
      };
    } else if (process.env.PGLITE_DATA_DIR) {
      envConfig.database = {
        type: 'pglite',
        config: { dataDir: process.env.PGLITE_DATA_DIR },
      };
    }
    
    // Merge character paths from package.json into runtime config
    if (packageJsonConfig.characters) {
      envConfig.characters = packageJsonConfig.characters;
    }
    
    // Merge configurations: environment < overrides
    this.config = {
      ...envConfig,
      ...options.configOverrides,
    };
    
    // Deep merge objects like server, logging, characters
    if (envConfig.server && options.configOverrides?.server) {
      this.config.server = { ...envConfig.server, ...options.configOverrides.server };
    }
    if (envConfig.logging && options.configOverrides?.logging) {
      this.config.logging = { ...envConfig.logging, ...options.configOverrides.logging };
    }
    if (envConfig.characters && options.configOverrides?.characters) {
      this.config.characters = { 
        ...envConfig.characters,
        ...options.configOverrides.characters
      };
    }
    
    // Validate the final configuration
    const validationResult = runtimeConfigSchema.safeParse(this.config);
    if (!validationResult.success) {
      const errorDetails = validationResult.error.issues
        .map(issue => `${issue.path.join('.')}: ${issue.message}`)
        .join('; ');
      throw new Error(`Configuration validation failed: ${errorDetails}`);
    }
    
    this.config = validationResult.data;
    logger.info('Configuration loaded and validated successfully from package.json and environment');
    
    return this.config;
  }

  /**
   * Get current configuration
   */
  getConfig(): RuntimeConfig {
    return this.config;
  }

  /**
   * Get package.json eliza configuration
   */
  getPackageJsonConfig(): ElizaConfig {
    return this.packageJsonConfig;
  }


  /**
   * Reset configuration (mainly for testing)
   */
  reset(): void {
    this.config = {};
    this.envLoaded = false;
  }
}

/**
 * Convenience functions for direct access
 */
export const config = ConfigManager.getInstance();

export function getEnvironmentVariable<K extends keyof typeof ENVIRONMENT_REGISTRY>(
  key: K,
  defaultValue?: string
): string | undefined {
  return config.get(key, defaultValue);
}

export function validatePluginEnvironment(pluginName: string): { valid: boolean; missing: string[] } {
  return config.validatePluginEnvironment(pluginName);
}

export function loadConfiguration(options?: {
  envPath?: string;
  packageJsonPath?: string;
  configOverrides?: Partial<RuntimeConfig>;
}): Promise<RuntimeConfig> {
  return config.loadConfig(options);
}

