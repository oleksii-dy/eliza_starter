import { logger } from '@elizaos/core';
import express from 'express';
import { existsSync, writeFileSync } from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import fs from 'fs/promises';
import { validateRequest } from '../shared/validation';
import { requireJWTAuth } from '../../middleware/JWTAuthMiddleware';

export type EnvVars = Record<string, string>;

/**
 * Parse an .env file and return the key-value pairs
 * @param filePath Path to the .env file
 * @returns Object containing the key-value pairs
 */
export async function parseEnvFile(filePath: string): Promise<EnvVars> {
  try {
    if (!existsSync(filePath)) {
      return {};
    }

    const content = await fs.readFile(filePath, 'utf-8');
    // Handle empty file case gracefully
    if (content.trim() === '') {
      return {};
    }
    return dotenv.parse(content);
  } catch (error: any) {
    console.error(`Error parsing .env file: ${error.message}`);
    return {};
  }
}

function serializeEnvObject(envObj: Record<string, string>): string {
  return Object.entries(envObj)
    .map(([key, val]) => `${key}=${val ?? ''}`)
    .join('\n\n');
}

function getLocalEnvPath(): string | null {
  const envPath = resolveEnvFile();
  return existsSync(envPath) ? envPath : null;
}

/**
 * Resolves the path to the nearest `.env` file.
 *
 * If no `.env` file is found when traversing up from the starting directory,
 * a path to `.env` in the starting directory is returned.
 *
 * @param startDir - The directory to start searching from. Defaults to the
 *   current working directory.
 * @returns The resolved path to the `.env` file.
 */
export function resolveEnvFile(startDir: string = process.cwd()): string {
  let currentDir = startDir;

  while (true) {
    const candidate = path.join(currentDir, '.env');
    if (existsSync(candidate)) {
      return candidate;
    }

    const parentDir = path.dirname(currentDir);
    if (parentDir === currentDir) {
      break;
    }
    currentDir = parentDir;
  }

  return path.join(startDir, '.env');
}

// List of sensitive environment variables that should NEVER be exposed
const SENSITIVE_ENV_VARS = [
  'SECRET_SALT',
  'SHARED_JWT_SECRET',
  'JWT_SECRET',
  'ELIZA_SERVER_AUTH_TOKEN',
  'POSTGRES_URL',
  'DATABASE_URL',
  'OPENAI_API_KEY',
  'ANTHROPIC_API_KEY',
  'GOOGLE_API_KEY',
  'ELEVENLABS_API_KEY',
  'DISCORD_TOKEN',
  'TELEGRAM_BOT_TOKEN',
  'TWITTER_ACCESS_TOKEN',
  'TWITTER_ACCESS_TOKEN_SECRET',
  'AWS_SECRET_ACCESS_KEY',
  'GITHUB_TOKEN',
  'SUPABASE_ANON_KEY',
  'SUPABASE_SERVICE_ROLE_KEY',
  'REDPILL_API_KEY',
  'SOLANA_PRIVATE_KEY',
  'EVM_PRIVATE_KEY',
  'WALLET_PRIVATE_KEY',
  'PRIVATE_KEY',
];

/**
 * Filters out sensitive environment variables for security
 */
function filterSensitiveEnvVars(envObj: Record<string, string>): Record<string, string> {
  const filtered: Record<string, string> = {};

  for (const [key, value] of Object.entries(envObj)) {
    // Check if the key matches any sensitive pattern
    const isSensitive = SENSITIVE_ENV_VARS.some(
      (sensitive) =>
        key.toUpperCase().includes(sensitive.toUpperCase()) ||
        key.toUpperCase().includes('PASSWORD') ||
        key.toUpperCase().includes('SECRET') ||
        key.toUpperCase().includes('TOKEN') ||
        key.toUpperCase().includes('KEY') ||
        key.toUpperCase().includes('PRIVATE')
    );

    if (!isSensitive) {
      filtered[key] = value;
    } else {
      // Log attempt to access sensitive data
      logger.warn(`[SECURITY] Filtered sensitive environment variable: ${key}`);
    }
  }

  return filtered;
}

/**
 * Validates environment variable names and values for security
 */
function validateEnvInput(envObj: Record<string, string>): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  for (const [key, value] of Object.entries(envObj)) {
    // Validate key format
    if (!/^[A-Z][A-Z0-9_]*$/i.test(key)) {
      errors.push(
        `Invalid environment variable name: ${key}. Must contain only letters, numbers, and underscores.`
      );
    }

    // Check for path traversal attempts
    if (value && (value.includes('../') || value.includes('..\\') || value.includes('%2e%2e'))) {
      errors.push(`Potential path traversal detected in value for ${key}`);
    }

    // Check for script injection attempts
    if (value && /<script|javascript:|vbscript:|data:/.test(value.toLowerCase())) {
      errors.push(`Potential script injection detected in value for ${key}`);
    }

    // Validate value length
    if (value && value.length > 1000) {
      errors.push(`Environment variable ${key} value is too long (max 1000 characters)`);
    }
  }

  return { valid: errors.length === 0, errors };
}

/**
 * Environment configuration management
 * SECURITY: Requires JWT authentication and restricts access to sensitive variables
 */
export function createEnvironmentRouter(): express.Router {
  const router = express.Router();

  // SECURITY: Require JWT authentication for ALL environment operations
  router.use(requireJWTAuth as any);

  // Get local environment variables (filtered for security)
  (router as any).get('/local', async (req: express.Request, res: express.Response) => {
    try {
      // SECURITY: Check user role/permissions
      if (req.user?.role !== 'admin' && req.user?.role !== 'owner') {
        logger.warn(
          `[SECURITY] Unauthorized environment access attempt by user: ${req.user?.email}`
        );
        return res.status(403).json({
          success: false,
          error: {
            code: 'FORBIDDEN',
            message: 'Admin privileges required for environment access',
          },
        });
      }

      const localEnvPath = getLocalEnvPath();
      if (!localEnvPath) {
        return res.json({
          success: true,
          data: {},
        });
      }

      const localEnvs = await parseEnvFile(localEnvPath);

      // SECURITY: Filter out sensitive environment variables
      const filteredEnvs = filterSensitiveEnvVars(localEnvs);

      logger.info(`[ENV] User ${req.user?.email} accessed filtered environment variables`);

      res.json({
        success: true,
        data: filteredEnvs,
      });
    } catch (error) {
      logger.error('[ENVS GET] Error retrieving local envs', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'FETCH_ERROR',
          message: 'Failed to retrieve local envs',
          details: error instanceof Error ? error.message : String(error),
        },
      });
    }
  });

  // Update local environment variables (HIGHLY RESTRICTED)
  const envUpdateSchema = {
    body: {
      type: 'object' as const,
      required: true,
      properties: {
        content: {
          type: 'object' as const,
          required: true,
          maxProperties: 50, // Limit number of variables
        },
      },
    },
  };

  (router as any).post(
    '/local',
    validateRequest(envUpdateSchema),
    async (req: express.Request, res: express.Response) => {
      try {
        // SECURITY: Double-check authentication and authorization
        if (req.user?.role !== 'admin' && req.user?.role !== 'owner') {
          logger.warn(
            `[SECURITY] Unauthorized environment update attempt by user: ${req.user?.email}`
          );
          return res.status(403).json({
            success: false,
            error: {
              code: 'FORBIDDEN',
              message: 'Admin privileges required for environment modification',
            },
          });
        }

        const { content } = req.body;

        if (!content || typeof content !== 'object') {
          return res.status(400).json({
            success: false,
            error: {
              code: 'INVALID_INPUT',
              message: 'Missing or invalid "content" in request body',
            },
          });
        }

        // SECURITY: Validate the environment input
        const validation = validateEnvInput(content);
        if (!validation.valid) {
          logger.warn(
            `[SECURITY] Invalid environment input from ${req.user?.email}:`,
            validation.errors
          );
          return res.status(400).json({
            success: false,
            error: {
              code: 'VALIDATION_ERROR',
              message: 'Invalid environment variable format',
              details: validation.errors.join('; '),
            },
          });
        }

        // SECURITY: Check for attempts to set sensitive variables
        const sensitiveAttempts = Object.keys(content).filter((key) =>
          SENSITIVE_ENV_VARS.some(
            (sensitive) =>
              key.toUpperCase().includes(sensitive.toUpperCase()) ||
              key.toUpperCase().includes('PASSWORD') ||
              key.toUpperCase().includes('SECRET') ||
              key.toUpperCase().includes('TOKEN') ||
              key.toUpperCase().includes('KEY') ||
              key.toUpperCase().includes('PRIVATE')
          )
        );

        if (sensitiveAttempts.length > 0) {
          logger.warn(
            `[SECURITY] Attempt to set sensitive environment variables by ${req.user?.email}:`,
            sensitiveAttempts
          );
          return res.status(403).json({
            success: false,
            error: {
              code: 'FORBIDDEN',
              message: 'Cannot modify sensitive environment variables via API',
              details: `Blocked variables: ${sensitiveAttempts.join(', ')}`,
            },
          });
        }

        const localEnvPath = getLocalEnvPath();
        if (!localEnvPath) {
          throw new Error('Local .env file not found');
        }

        // Read existing environment variables to preserve sensitive ones
        const existingEnvs = await parseEnvFile(localEnvPath);

        // Merge non-sensitive updates with existing sensitive variables
        const mergedEnvs = { ...existingEnvs };

        // Only update non-sensitive variables
        for (const [key, value] of Object.entries(content)) {
          mergedEnvs[key] = String(value);
        }

        const envString = serializeEnvObject(mergedEnvs);
        writeFileSync(localEnvPath, envString, 'utf-8');

        logger.info(
          `[ENV] User ${req.user?.email} updated environment variables: ${Object.keys(content).join(', ')}`
        );

        res.json({
          success: true,
          message: 'Local env updated',
        });
      } catch (error) {
        logger.error('[ENVS POST] Error updating local envs', error);
        res.status(500).json({
          success: false,
          error: {
            code: 'UPDATE_ERROR',
            message: 'Failed to update local envs',
            details: error instanceof Error ? error.message : String(error),
          },
        });
      }
    }
  );

  return router;
}
