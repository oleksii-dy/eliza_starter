import { logger, asUUID } from '@elizaos/core';
import type { IDatabaseAdapter, UUID } from '@elizaos/core';
import { PgliteDatabaseAdapter } from './pglite/adapter';
import { PgDatabaseAdapter } from './pg/adapter';
import { testPGLiteCompatibility } from './pglite/webassembly-fix';
import { connectionRegistry } from './connection-registry';

export interface AdaptiveConfig {
  // Primary configuration (will try PGLite first if no postgresUrl)
  postgresUrl?: string;
  dataDir?: string;
  
  // Fallback configuration
  fallbackToPostgres?: boolean;
  fallbackPostgresUrl?: string;
  
  // Testing configuration
  skipCompatibilityTest?: boolean;
  forceAdapter?: 'pglite' | 'postgres';
}

/**
 * Adaptive Database Adapter Factory
 * 
 * This factory automatically selects the best available database adapter
 * based on environment compatibility and configuration.
 * 
 * Selection priority:
 * 1. If postgresUrl is provided -> PostgreSQL
 * 2. If forceAdapter is specified -> Use forced adapter
 * 3. Test PGLite compatibility -> PGLite if compatible
 * 4. Fallback to PostgreSQL if fallbackToPostgres is true
 * 5. Fail with clear error message
 */
export async function createAdaptiveDatabaseAdapter(
  config: AdaptiveConfig,
  agentId: string
): Promise<IDatabaseAdapter> {
  const uuid = asUUID(agentId);
  logger.info('[Adaptive Database] Starting adaptive adapter selection', {
    hasPostgresUrl: !!config.postgresUrl,
    hasDataDir: !!config.dataDir,
    fallbackToPostgres: config.fallbackToPostgres,
    forceAdapter: config.forceAdapter,
  });

  // 1. If PostgreSQL URL is explicitly provided, use PostgreSQL
  if (config.postgresUrl) {
    logger.info('[Adaptive Database] Using PostgreSQL (explicit URL provided)');
    const connectionManager = connectionRegistry.getPostgresManager(config.postgresUrl);
    return new PgDatabaseAdapter(uuid, connectionManager, config.postgresUrl);
  }

  // 2. If adapter is forced, use forced adapter
  if (config.forceAdapter) {
    logger.info(`[Adaptive Database] Using forced adapter: ${config.forceAdapter}`);
    
    if (config.forceAdapter === 'postgres') {
      const url = config.fallbackPostgresUrl || getDefaultPostgresUrl();
      const connectionManager = connectionRegistry.getPostgresManager(url);
      return new PgDatabaseAdapter(uuid, connectionManager, url);
    } else {
      const dataDir = config.dataDir || getDefaultDataDir();
      const connectionManager = connectionRegistry.getPGLiteManager(dataDir);
      return new PgliteDatabaseAdapter(uuid, connectionManager, dataDir);
    }
  }

  // 3. Test PGLite compatibility (unless skipped)
  if (!config.skipCompatibilityTest) {
    logger.info('[Adaptive Database] Testing PGLite compatibility...');
    
    try {
      const compatibility = await testPGLiteCompatibility();
      
      if (compatibility.compatible) {
        logger.info('[Adaptive Database] PGLite is compatible, using PGLite adapter', {
          extensions: compatibility.extensions,
        });
        const dataDir = config.dataDir || getDefaultDataDir();
        const connectionManager = connectionRegistry.getPGLiteManager(dataDir);
        return new PgliteDatabaseAdapter(uuid, connectionManager, dataDir);
      } else {
        logger.warn('[Adaptive Database] PGLite compatibility test failed', {
          error: compatibility.error,
        });
      }
    } catch (error) {
      logger.warn('[Adaptive Database] PGLite compatibility test error:', error);
    }
  } else {
    logger.info('[Adaptive Database] Skipping PGLite compatibility test');
  }

  // 4. Try PGLite without compatibility test (in case test is unreliable)
  if (!config.skipCompatibilityTest) {
    logger.info('[Adaptive Database] Attempting PGLite without compatibility test...');
    
    try {
      const dataDir = config.dataDir || getDefaultDataDir();
      const connectionManager = connectionRegistry.getPGLiteManager(dataDir);
      const adapter = new PgliteDatabaseAdapter(uuid, connectionManager, dataDir);
      
      // Try to initialize to verify it works
      await adapter.init();
      logger.info('[Adaptive Database] PGLite adapter initialized successfully');
      return adapter;
      
    } catch (error) {
      logger.warn('[Adaptive Database] PGLite adapter initialization failed:', error);
    }
  }

  // 5. Fallback to PostgreSQL if enabled
  if (config.fallbackToPostgres) {
    const postgresUrl = config.fallbackPostgresUrl || getDefaultPostgresUrl();
    
    logger.info('[Adaptive Database] Falling back to PostgreSQL', {
      url: postgresUrl.replace(/:[^@]*@/, ':***@'), // Hide password in logs
    });
    
    try {
      const connectionManager = connectionRegistry.getPostgresManager(postgresUrl);
      const adapter = new PgDatabaseAdapter(uuid, connectionManager, postgresUrl);
      await adapter.init();
      logger.info('[Adaptive Database] PostgreSQL fallback adapter initialized successfully');
      return adapter;
      
    } catch (error) {
      logger.error('[Adaptive Database] PostgreSQL fallback failed:', error);
      throw new Error(
        'Both PGLite and PostgreSQL adapters failed to initialize. ' +
        'Please check your database configuration and ensure PostgreSQL is available.'
      );
    }
  }

  // 6. No fallback available, fail with helpful message
  throw new Error(
    'No compatible database adapter available. ' +
    'PGLite failed to initialize due to WebAssembly compatibility issues, ' +
    'and PostgreSQL fallback is not configured. ' +
    'Please either:\n' +
    '1. Provide a POSTGRES_URL environment variable, or\n' +
    '2. Set fallbackToPostgres: true with a fallbackPostgresUrl, or\n' +
    '3. Fix the WebAssembly compatibility issue in your runtime environment.'
  );
}

/**
 * Get default PostgreSQL URL for fallback
 */
function getDefaultPostgresUrl(): string {
  // Try common environment variables
  return process.env.POSTGRES_URL || 
         process.env.DATABASE_URL || 
         'postgresql://localhost:5432/eliza';
}

/**
 * Get default data directory for PGLite
 */
function getDefaultDataDir(): string {
  return process.env.PGLITE_DATA_DIR || ':memory:';
}

/**
 * Get recommended configuration based on environment
 */
export function getRecommendedAdaptiveConfig(): AdaptiveConfig {
  const isProduction = process.env.NODE_ENV === 'production';
  const isTest = process.env.NODE_ENV === 'test' || process.env.VITEST === 'true';
  
  if (isProduction) {
    return {
      fallbackToPostgres: true,
      fallbackPostgresUrl: getDefaultPostgresUrl(),
      skipCompatibilityTest: false,
    };
  }
  
  if (isTest) {
    return {
      fallbackToPostgres: true,
      fallbackPostgresUrl: getDefaultPostgresUrl(),
      skipCompatibilityTest: true, // Skip in test environment where WebAssembly often fails
    };
  }
  
  // Development
  return {
    fallbackToPostgres: true,
    fallbackPostgresUrl: getDefaultPostgresUrl(),
    skipCompatibilityTest: false,
  };
}