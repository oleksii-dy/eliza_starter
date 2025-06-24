import { z } from 'zod';
import { logger } from '@elizaos/core';

// Default values
const DEFAULT_DEEPSEEK_BASE_URL = 'https://api.deepseek.com/v1';
// It's good practice to check DeepSeek's documentation for their recommended default model.
// Using a placeholder name, this should be verified.
const DEFAULT_DEEPSEEK_CHAT_MODEL = 'deepseek-chat'; // Or e.g., 'deepseek-coder' if that's more general

/**
 * Configuration schema for the DeepSeek plugin.
 * Validates environment variables or passed configuration.
 */
export const DeepSeekConfigSchema = z.object({
  DEEPSEEK_API_KEY: z.string().min(1, 'DeepSeek API key is required.'),
  DEEPSEEK_BASE_URL: z
    .string()
    .url('Invalid URL format for DeepSeek base URL.')
    .optional()
    .default(DEFAULT_DEEPSEEK_BASE_URL),
  DEEPSEEK_CHAT_MODEL: z
    .string()
    .optional()
    .default(DEFAULT_DEEPSEEK_CHAT_MODEL),
});

/**
 * Inferred TypeScript type from the Zod schema.
 */
export type DeepSeekConfig = z.infer<typeof DeepSeekConfigSchema>;

/**
 * Validates and parses the plugin configuration.
 * Reads from environment variables if direct config properties are missing.
 *
 * @param {Record<string, any>} config - The configuration object passed during plugin initialization.
 * @returns {DeepSeekConfig} The validated configuration object.
 * @throws {Error} If validation fails.
 */
export function validateConfig(config: Record<string, any> = {}): DeepSeekConfig {
  try {
    // Prioritize config passed directly, then environment variables
    const configToParse = {
      DEEPSEEK_API_KEY: config.DEEPSEEK_API_KEY || process.env.DEEPSEEK_API_KEY,
      DEEPSEEK_BASE_URL: config.DEEPSEEK_BASE_URL || process.env.DEEPSEEK_BASE_URL,
      DEEPSEEK_CHAT_MODEL: config.DEEPSEEK_CHAT_MODEL || process.env.DEEPSEEK_CHAT_MODEL,
    };

    logger.debug('Attempting to validate DeepSeek plugin configuration:', {
      hasApiKeyInConfig: !!config.DEEPSEEK_API_KEY,
      hasApiKeyInEnv: !!process.env.DEEPSEEK_API_KEY,
      baseUrlToParse: configToParse.DEEPSEEK_BASE_URL,
      modelToParse: configToParse.DEEPSEEK_CHAT_MODEL,
    });

    const validatedConfig = DeepSeekConfigSchema.parse(configToParse);

    logger.info('DeepSeek plugin configuration validated successfully.');
    return validatedConfig;
  } catch (error) {
    if (error instanceof z.ZodError) {
      const errorMessages = error.errors
        .map((err) => `${err.path.join('.') || 'config'}: ${err.message}`)
        .join('; ');
      logger.error('DeepSeek plugin configuration validation failed:', { errors: errorMessages });
      throw new Error(`DeepSeek configuration error: ${errorMessages}`);
    }
    logger.error('An unexpected error occurred during DeepSeek configuration validation:', {
      message: error instanceof Error ? error.message : String(error),
    });
    throw error; // Re-throw other errors
  }
}
