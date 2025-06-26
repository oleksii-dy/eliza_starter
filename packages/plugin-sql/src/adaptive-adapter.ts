import { logger, asUUID } from '@elizaos/core';
import type { IDatabaseAdapter, UUID } from '@elizaos/core';
import { PgAdapter } from './pg/adapter';
import { PgManager } from './pg/manager';
import { connectionRegistry } from './connection-registry';

export interface AdaptiveConfig {
  // PostgreSQL configuration
  postgresUrl?: string;
  fallbackPostgresUrl?: string;

  // Connection options
  ssl?: boolean;
  maxConnections?: number;

  // Vector configuration
  enableVectors?: boolean;
  vectorDimensions?: number;
}

/**
 * Simplified Database Adapter Factory for Bun + PostgreSQL + pgvector
 *
 * This factory creates PostgreSQL adapters optimized for Bun runtime
 * with pgvector support for enhanced vector operations.
 *
 * Features:
 * - Native PostgreSQL with pgvector extension
 * - Bun-optimized connection handling
 * - HNSW indexing for fast vector similarity search
 * - Connection pooling and health monitoring
 */
export async function createAdaptiveDatabaseAdapter(
  config: AdaptiveConfig,
  agentId: string
): Promise<IDatabaseAdapter> {
  const uuid = asUUID(agentId);

  logger.info('[Adaptive Database] Creating Bun PostgreSQL adapter with pgvector', {
    hasPostgresUrl: !!config.postgresUrl,
    enableVectors: config.enableVectors !== false,
    vectorDimensions: config.vectorDimensions,
  });

  // Get PostgreSQL connection URL
  const postgresUrl = config.postgresUrl || getDefaultPostgresUrl();

  if (!postgresUrl) {
    throw new Error(
      'PostgreSQL connection URL is required. ' +
        'Please provide POSTGRES_URL environment variable or pass postgresUrl in config.'
    );
  }

  try {
    // Create PostgreSQL manager with Bun optimizations
    const pgConfig = {
      connectionString: postgresUrl,
      ssl: config.ssl ?? false,
      max: config.maxConnections ?? 10,
    };

    const manager = new PgManager(pgConfig);
    await manager.connect();

    // Ensure pgvector extension is available
    if (config.enableVectors !== false) {
      try {
        await manager.query('CREATE EXTENSION IF NOT EXISTS vector');
        logger.info('[Adaptive Database] pgvector extension initialized');
      } catch (error) {
        logger.warn('[Adaptive Database] Failed to initialize pgvector extension:', error);
        logger.warn('[Adaptive Database] Vector operations may not be available');
      }
    }

    // Create adapter with pgvector support
    const adapter = new PgAdapter(uuid, manager, {
      enableVectors: config.enableVectors !== false,
      vectorDimensions: config.vectorDimensions || 1536, // Default to OpenAI embedding size
    });

    await adapter.init();

    // Register adapter for proper cleanup
    connectionRegistry.registerAdapter(uuid, adapter);

    logger.info('[Adaptive Database] PostgreSQL adapter initialized successfully', {
      url: postgresUrl.replace(/:[^@]*@/, ':***@'), // Hide password in logs
    });

    return adapter;
  } catch (error) {
    logger.error('[Adaptive Database] Failed to initialize PostgreSQL adapter:', error);

    // Provide helpful error messages
    if ((error as Error).message?.includes('ECONNREFUSED')) {
      throw new Error(
        'Failed to connect to PostgreSQL database. ' +
          `Please ensure PostgreSQL is running and accessible at: ${postgresUrl.replace(
            /:[^@]*@/,
            ':***@'
          )}`
      );
    }

    if ((error as Error).message?.includes('authentication')) {
      throw new Error(
        'PostgreSQL authentication failed. ' +
          'Please check your database credentials in POSTGRES_URL.'
      );
    }

    throw new Error(
      `Database initialization failed: ${(error as Error).message}. ` +
        'Please check your PostgreSQL connection and configuration.'
    );
  }
}

/**
 * Get default PostgreSQL URL from environment
 */
function getDefaultPostgresUrl(): string {
  return (
    process.env.POSTGRES_URL ||
    process.env.DATABASE_URL ||
    'postgresql://postgres:postgres@localhost:5432/eliza'
  );
}

/**
 * Get recommended configuration based on environment
 */
export function getRecommendedAdaptiveConfig(): AdaptiveConfig {
  const isProduction = process.env.NODE_ENV === 'production';
  const isTest = process.env.NODE_ENV === 'test' || process.env.VITEST === 'true';

  if (isProduction) {
    return {
      postgresUrl: getDefaultPostgresUrl(),
      ssl: true,
      maxConnections: 20,
      enableVectors: true,
      vectorDimensions: 1536,
    };
  }

  if (isTest) {
    return {
      postgresUrl: process.env.TEST_POSTGRES_URL || getDefaultPostgresUrl(),
      ssl: false,
      maxConnections: 5,
      enableVectors: true,
      vectorDimensions: 384, // Smaller for faster tests
    };
  }

  // Development
  return {
    postgresUrl: getDefaultPostgresUrl(),
    ssl: false,
    maxConnections: 10,
    enableVectors: true,
    vectorDimensions: 1536,
  };
}

/**
 * Create a simple PostgreSQL adapter for direct use
 */
export async function createPostgreSQLAdapter(
  connectionString: string,
  agentId: string
): Promise<IDatabaseAdapter> {
  return createAdaptiveDatabaseAdapter({ postgresUrl: connectionString }, agentId);
}

/**
 * Health check for PostgreSQL connection
 */
export async function checkDatabaseHealth(
  config: AdaptiveConfig
): Promise<{ healthy: boolean; error?: string; features: string[] }> {
  try {
    const postgresUrl = config.postgresUrl || getDefaultPostgresUrl();
    const manager = new PgManager({
      connectionString: postgresUrl,
      ssl: config.ssl ?? false,
    });

    await manager.connect();

    // Test basic connectivity
    await manager.query('SELECT 1');

    // Check for pgvector extension
    const extensions = await manager.query(
      "SELECT extname FROM pg_extension WHERE extname = 'vector'"
    );

    const features = ['postgresql'];
    if (extensions.length > 0) {
      features.push('pgvector');
    }

    await manager.close();

    return {
      healthy: true,
      features,
    };
  } catch (error) {
    return {
      healthy: false,
      error: (error as Error).message,
      features: [],
    };
  }
}
