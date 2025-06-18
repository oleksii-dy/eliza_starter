import dotenv from 'dotenv';
import { z } from 'zod';
import { logger } from '@elizaos/core';
import { UserEnvironment } from './user-environment';
import { readEnvFile } from './env-prompt';

/**
 * Zod schema for core environment variables that ElizaOS recognizes
 */
const EnvironmentSchema = z.object({
  // Model Providers (at least one required)
  OPENAI_API_KEY: z.string().optional(),
  ANTHROPIC_API_KEY: z.string().optional(),
  OLLAMA_MODEL: z.string().optional(),
  LLAMACLOUD_API_KEY: z.string().optional(),
  GROQ_API_KEY: z.string().optional(),
  CLAUDE_API_KEY: z.string().optional(), // Legacy alias for ANTHROPIC_API_KEY
  
  // Database Configuration
  POSTGRES_URL: z.string().optional(),
  DATABASE_URL: z.string().optional(), // Alternative to POSTGRES_URL
  PGLITE_DATA_DIR: z.string().optional(),
  
  // Logging Configuration
  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace']).default('info'),
  
  // Discord Integration
  DISCORD_API_TOKEN: z.string().optional(),
  DISCORD_APPLICATION_ID: z.string().optional(),
  
  // Twitter Integration
  TWITTER_API_KEY: z.string().optional(),
  TWITTER_API_SECRET: z.string().optional(),
  TWITTER_ACCESS_TOKEN: z.string().optional(),
  TWITTER_ACCESS_TOKEN_SECRET: z.string().optional(),
  TWITTER_DRY_RUN: z.coerce.boolean().default(false),
  TWITTER_TARGET_USERS: z.string().optional(),
  
  // Telegram Integration
  TELEGRAM_BOT_TOKEN: z.string().optional(),
  
  // Blockchain Configuration
  EVM_PRIVATE_KEY: z.string().optional(),
  EVM_PUBLIC_KEY: z.string().optional(),
  SOLANA_PRIVATE_KEY: z.string().optional(),
  SOLANA_PUBLIC_KEY: z.string().optional(),
  WALLET_PRIVATE_KEY: z.string().optional(), // Legacy
  WALLET_PUBLIC_KEY: z.string().optional(), // Legacy
  
  // Character Scoped Environment Variables (dynamic, handled separately)
}).passthrough(); // Allow additional environment variables

type EnvironmentConfig = z.infer<typeof EnvironmentSchema>;

/**
 * Validation result for environment variables
 */
export interface ValidationResult {
  success: boolean;
  errors: string[];
  warnings: string[];
  hasModelProvider: boolean;
}

/**
 * Centralized environment variable loader for ElizaOS CLI
 * 
 * Provides type-safe access to environment variables with validation,
 * centralized dotenv loading, and plugin-specific validation rules.
 * 
 * Usage:
 * ```typescript
 * const env = EnvironmentLoader.getInstance();
 * await env.load();
 * const apiKey = env.get('OPENAI_API_KEY');
 * const logLevel = env.getRequired('LOG_LEVEL'); // Throws if missing
 * ```
 */
export class EnvironmentLoader {
  private static instance: EnvironmentLoader;
  private config: Record<string, string | undefined> = {};
  private loaded = false;
  private envFilePath?: string;

  private constructor() {}

  /**
   * Get the singleton instance of EnvironmentLoader
   */
  static getInstance(): EnvironmentLoader {
    if (!EnvironmentLoader.instance) {
      EnvironmentLoader.instance = new EnvironmentLoader();
    }
    return EnvironmentLoader.instance;
  }

  /**
   * Load environment variables from .env file and process.env
   * This should be called early in the application lifecycle
   * 
   * @param options Configuration options for loading
   */
  async load(options: { envPath?: string; force?: boolean } = {}): Promise<void> {
    if (this.loaded && !options.force) {
      return; // Already loaded, skip unless forced
    }

    try {
      // Get the correct .env file path using existing CLI utilities
      if (!this.envFilePath) {
        const userEnv = UserEnvironment.getInstance();
        const pathInfo = await userEnv.getPathInfo();
        this.envFilePath = options.envPath || pathInfo.envFilePath;
      }

      // Load .env file if it exists
      if (this.envFilePath) {
        const result = dotenv.config({ path: this.envFilePath });
        if (result.error) {
          logger.warn(`Could not load .env file from ${this.envFilePath}: ${result.error.message}`);
        } else {
          logger.debug(`Loaded environment variables from ${this.envFilePath}`);
        }
      }

      // Merge with process.env (process.env takes precedence)
      this.config = { ...process.env };
      this.loaded = true;

      logger.debug('Environment variables loaded successfully');
    } catch (error) {
      logger.error(`Failed to load environment variables: ${error}`);
      throw new Error(`Environment loading failed: ${error}`);
    }
  }

  /**
   * Get an environment variable value
   * 
   * @param key Environment variable name
   * @returns Value or undefined if not set
   */
  get(key: string): string | undefined {
    if (!this.loaded) {
      logger.warn('EnvironmentLoader.load() should be called before accessing environment variables');
      // Fallback to process.env for backward compatibility
      return process.env[key];
    }

    return this.config[key];
  }

  /**
   * Get a required environment variable value
   * Throws an error if the variable is not set or empty
   * 
   * @param key Environment variable name
   * @returns Value (guaranteed to be non-empty string)
   * @throws Error if variable is missing or empty
   */
  getRequired(key: string): string {
    const value = this.get(key);
    if (!value || value.trim() === '') {
      throw new Error(`Required environment variable '${key}' is not set or empty`);
    }
    return value;
  }

  /**
   * Get a boolean environment variable value
   * 
   * @param key Environment variable name
   * @param defaultValue Default value if not set
   * @returns Boolean value
   */
  getBoolean(key: string, defaultValue = false): boolean {
    const value = this.get(key);
    if (!value) return defaultValue;
    
    const normalized = value.toLowerCase().trim();
    return normalized === 'true' || normalized === '1' || normalized === 'yes';
  }

  /**
   * Get a numeric environment variable value
   * 
   * @param key Environment variable name
   * @param defaultValue Default value if not set or invalid
   * @returns Numeric value
   */
  getNumber(key: string, defaultValue = 0): number {
    const value = this.get(key);
    if (!value) return defaultValue;
    
    const parsed = parseInt(value, 10);
    return isNaN(parsed) ? defaultValue : parsed;
  }

  /**
   * Get all character-scoped environment variables for a specific character ID
   * Pattern: CHARACTER.{characterId}.{variableName}
   * 
   * @param characterId Character ID to get scoped variables for
   * @returns Record of scoped environment variables
   */
  getCharacterScoped(characterId: string): Record<string, string> {
    const prefix = `CHARACTER.${characterId}.`;
    const scoped: Record<string, string> = {};

    // Use config if loaded, otherwise fallback to process.env
    const envSource = this.loaded ? this.config : process.env;

    for (const [key, value] of Object.entries(envSource)) {
      if (key.startsWith(prefix) && value) {
        const scopedKey = key.slice(prefix.length);
        scoped[scopedKey] = value;
      }
    }

    return scoped;
  }

  /**
   * Validate environment variables according to ElizaOS requirements
   * 
   * @returns Validation result with errors and warnings
   */
  async validate(): Promise<ValidationResult> {
    const errors: string[] = [];
    const warnings: string[] = [];

    try {
      // Parse environment variables against schema
      const parseResult = EnvironmentSchema.safeParse(this.config);
      
      if (!parseResult.success) {
        for (const issue of parseResult.error.issues) {
          errors.push(`${issue.path.join('.')}: ${issue.message}`);
        }
      }

      // Check for at least one model provider
      const modelProviders = [
        'OPENAI_API_KEY',
        'ANTHROPIC_API_KEY', 
        'CLAUDE_API_KEY',
        'OLLAMA_MODEL',
        'LLAMACLOUD_API_KEY',
        'GROQ_API_KEY'
      ];

      const hasModelProvider = modelProviders.some(provider => {
        const value = this.get(provider);
        return value && value.trim() !== '' && value !== 'dummy_key';
      });

      if (!hasModelProvider) {
        errors.push('At least one model provider must be configured (OPENAI_API_KEY, ANTHROPIC_API_KEY, OLLAMA_MODEL, etc.)');
      }

      // Validate service-specific requirements
      await this.validateServiceRequirements(errors, warnings);

      return {
        success: errors.length === 0,
        errors,
        warnings,
        hasModelProvider
      };

    } catch (error) {
      return {
        success: false,
        errors: [`Validation failed: ${error}`],
        warnings: [],
        hasModelProvider: false
      };
    }
  }

  /**
   * Validate service-specific environment variable requirements
   */
  private async validateServiceRequirements(errors: string[], warnings: string[]): Promise<void> {
    // Discord validation - both token and application ID required if either is provided
    const discordToken = this.get('DISCORD_API_TOKEN');
    const discordAppId = this.get('DISCORD_APPLICATION_ID');
    
    if (discordToken && !discordAppId) {
      errors.push('DISCORD_APPLICATION_ID is required when DISCORD_API_TOKEN is provided');
    } else if (!discordToken && discordAppId) {
      warnings.push('DISCORD_APPLICATION_ID is set but DISCORD_API_TOKEN is missing');
    }

    // Twitter validation - all credentials required if any are provided
    const twitterKeys = ['TWITTER_API_KEY', 'TWITTER_API_SECRET', 'TWITTER_ACCESS_TOKEN', 'TWITTER_ACCESS_TOKEN_SECRET'];
    const setTwitterKeys = twitterKeys.filter(key => {
      const value = this.get(key);
      return value && value.trim() !== '';
    });

    if (setTwitterKeys.length > 0 && setTwitterKeys.length < twitterKeys.length) {
      const missing = twitterKeys.filter(key => !setTwitterKeys.includes(key));
      errors.push(`Twitter integration requires all credentials. Missing: ${missing.join(', ')}`);
    }

    // Database validation - warn about conflicting database URLs
    const postgresUrl = this.get('POSTGRES_URL');
    const databaseUrl = this.get('DATABASE_URL');
    
    if (postgresUrl && databaseUrl && postgresUrl !== databaseUrl) {
      warnings.push('Both POSTGRES_URL and DATABASE_URL are set with different values. POSTGRES_URL will take precedence.');
    }

    // Legacy key warnings
    if (this.get('CLAUDE_API_KEY') && !this.get('ANTHROPIC_API_KEY')) {
      warnings.push('CLAUDE_API_KEY is deprecated. Please use ANTHROPIC_API_KEY instead.');
    }

    if (this.get('WALLET_PRIVATE_KEY') && !this.get('EVM_PRIVATE_KEY')) {
      warnings.push('WALLET_PRIVATE_KEY is deprecated. Please use EVM_PRIVATE_KEY instead.');
    }
  }

  /**
   * Get current environment file path
   */
  getEnvFilePath(): string | undefined {
    return this.envFilePath;
  }

  /**
   * Check if environment variables have been loaded
   */
  isLoaded(): boolean {
    return this.loaded;
  }

  /**
   * Get all environment variables (for debugging/inspection)
   * Filters out sensitive variables by default
   */
  getAll(includeSensitive = false): Record<string, string | undefined> {
    const sensitiveKeys = [
      'OPENAI_API_KEY', 'ANTHROPIC_API_KEY', 'CLAUDE_API_KEY',
      'DISCORD_API_TOKEN', 'TELEGRAM_BOT_TOKEN',
      'TWITTER_API_KEY', 'TWITTER_API_SECRET', 'TWITTER_ACCESS_TOKEN', 'TWITTER_ACCESS_TOKEN_SECRET',
      'EVM_PRIVATE_KEY', 'SOLANA_PRIVATE_KEY', 'WALLET_PRIVATE_KEY',
      'POSTGRES_URL', 'DATABASE_URL'
    ];

    // Use config if loaded, otherwise fallback to process.env
    const envSource = this.loaded ? this.config : process.env;

    if (includeSensitive) {
      return { ...envSource };
    }

    const filtered: Record<string, string | undefined> = {};
    for (const [key, value] of Object.entries(envSource)) {
      if (sensitiveKeys.some(sensitive => key.includes(sensitive))) {
        filtered[key] = value ? '[REDACTED]' : undefined;
      } else {
        filtered[key] = value;
      }
    }

    return filtered;
  }
}

/**
 * Default singleton instance for convenience
 * Usage: import { env } from './environment-loader'
 */
export const env = EnvironmentLoader.getInstance();