import { DatabaseAdapter, type Plugin, type UUID, logger } from '@elizaos/core';
import { PgManager } from './pg/manager.js';
import { PgAdapter } from './pg/adapter.js';
import { connectionRegistry } from './connection-registry.js';
import {
  createAdaptiveDatabaseAdapter,
  getRecommendedAdaptiveConfig,
  type AdaptiveConfig,
} from './adaptive-adapter.js';

/**
 * Creates a PostgreSQL database adapter.
 * Uses the connection registry to ensure proper connection sharing.
 *
 * @param {object} config - The configuration object.
 * @param {string} config.postgresUrl - The URL for the PostgreSQL database.
 * @param {UUID} agentId - The unique identifier for the agent.
 * @returns {DatabaseAdapter} The created database adapter.
 */
export async function createDatabaseAdapter(
  config: {
    postgresUrl: string;
  },
  agentId: UUID
): Promise<DatabaseAdapter> {
  if (!config.postgresUrl) {
    throw new Error('PostgreSQL URL is required. Please provide postgresUrl in config.');
  }

  const manager = connectionRegistry.getPostgresManager(config.postgresUrl);
  return new PgAdapter(agentId, manager);
}

/**
 * Creates an adaptive database adapter that automatically selects the best
 * available database based on environment compatibility.
 *
 * This function provides automatic fallback from PGLite to PostgreSQL
 * when WebAssembly compatibility issues are detected.
 *
 * @param config - Adaptive configuration options
 * @param agentId - The unique identifier for the agent
 * @returns Promise<DatabaseAdapter> - The best available database adapter
 */
export async function createAdaptiveDatabaseAdapterV2(
  config: AdaptiveConfig = {},
  agentId: UUID
): Promise<DatabaseAdapter> {
  logger.info('[Adaptive Database V2] Starting adaptive adapter selection for agent:', agentId);

  try {
    const adapter = await createAdaptiveDatabaseAdapter(config, agentId);
    await adapter.init();

    logger.info('[Adaptive Database V2] Successfully initialized adaptive adapter:', {
      adapterType: adapter.constructor.name,
      agentId,
    });

    return adapter;
  } catch (error) {
    logger.error('[Adaptive Database V2] Failed to create adaptive adapter:', error);
    throw error;
  }
}

// Track initialization per runtime to prevent multiple initialization
const runtimeInitialized = new Map<string, boolean>();
const runtimeInitializationPromises = new Map<string, Promise<void>>();

export const plugin: Plugin = {
  name: '@elizaos/plugin-sql',
  description: 'A plugin for SQL database access with Drizzle ORM',
  priority: 0,
  actions: [],
  evaluators: [],
  providers: [],
  services: [],

  init: async (_, runtime) => {
    logger.info('[plugin-sql] Initializing SQL plugin...');

    const runtimeId = runtime.agentId;

    // Prevent multiple initialization for the same runtime
    if (runtimeInitialized.get(runtimeId)) {
      logger.info(`[plugin-sql] Plugin already initialized for runtime ${runtimeId}, skipping`);
      return;
    }

    // If initialization is in progress for this runtime, wait for it
    const existingPromise = runtimeInitializationPromises.get(runtimeId);
    if (existingPromise) {
      logger.info(
        `[plugin-sql] Initialization already in progress for runtime ${runtimeId}, waiting...`
      );
      await existingPromise;
      return;
    }

    // Create initialization promise to prevent concurrent initialization
    const initPromise = (async () => {
      try {
        await performInitialization(runtime);
      } finally {
        runtimeInitializationPromises.delete(runtimeId);
      }
    })();

    runtimeInitializationPromises.set(runtimeId, initPromise);
    await initPromise;

    // Mark as initialized for this specific runtime
    runtimeInitialized.set(runtimeId, true);

    logger.info(`[plugin-sql] SQL plugin initialized successfully for runtime ${runtimeId}`);
  },
};

async function performInitialization(runtime: any): Promise<void> {
  const runtimeId = runtime.agentId;

  // Check if a database adapter is already registered in runtime
  const existingRuntimeAdapter = (runtime as any).adapter || (runtime as any).databaseAdapter;
  if (existingRuntimeAdapter) {
    logger.info('[plugin-sql] Database adapter already registered in runtime');

    // Always check if tables exist, not just if adapter claims to be ready
    try {
      // Check if critical tables exist
      let tablesExist = false;
      try {
        // Try to query a critical table
        await existingRuntimeAdapter.getAgents();
        tablesExist = true;
        logger.info('[plugin-sql] Existing adapter has tables, checking if fully ready...');
      } catch (tableError) {
        logger.info('[plugin-sql] Existing adapter missing tables, will run migrations');
      }

      if (!tablesExist) {
        // Adapter exists but tables missing - let runtime handle initialization
        logger.info('[plugin-sql] Existing adapter has missing tables, runtime will initialize');
      } else {
        // Tables exist - adapter should be ready
        logger.info('[plugin-sql] Existing adapter has tables and is ready');
      }
    } catch (error) {
      logger.warn('[plugin-sql] Failed to verify existing adapter state:', error);
      // Don't return here - fall through to create a new adapter if needed
    }

    return;
  }

  // Check if an adapter is already registered in the connection registry for this agent
  const existingRegistryAdapter = connectionRegistry.getAdapter(runtime.agentId);
  if (existingRegistryAdapter) {
    logger.info(
      '[plugin-sql] Database adapter found in connection registry, registering with runtime'
    );
    runtime.registerDatabaseAdapter(existingRegistryAdapter);
    logger.info('[plugin-sql] Adapter from registry registered with runtime');
    return;
  }

  // Use adaptive adapter selection with automatic fallback
  logger.info('[plugin-sql] Starting adaptive adapter selection...');

  const postgresUrl = runtime.getSetting('POSTGRES_URL');
  const adaptiveConfig: AdaptiveConfig = {
    ...getRecommendedAdaptiveConfig(),
    postgresUrl,
    fallbackPostgresUrl: postgresUrl || runtime.getSetting('DATABASE_URL'),
  };

  try {
    const adapter = await createAdaptiveDatabaseAdapterV2(adaptiveConfig, runtime.agentId);

    // Register adapter with runtime
    logger.info('[plugin-sql] Registering adaptive adapter with runtime...');
    runtime.registerDatabaseAdapter(adapter);

    // Wait for adapter to be ready (if supported)
    if ('waitForReady' in adapter && typeof adapter.waitForReady === 'function') {
      await adapter.waitForReady();
    }

    logger.info('[plugin-sql] Adaptive adapter initialized and ready:', {
      adapterType: adapter.constructor.name,
    });
  } catch (adaptiveError) {
    logger.error(
      '[plugin-sql] Adaptive adapter failed, falling back to legacy logic:',
      adaptiveError
    );

    // Fallback to legacy logic if adaptive approach fails
    if (postgresUrl) {
      // Use PostgreSQL adapter
      logger.info('[plugin-sql] Using PostgreSQL adapter (legacy fallback)');
      const manager = connectionRegistry.getPostgresManager(postgresUrl);
      const adapter = new PgAdapter(runtime.agentId, manager);

      // Register adapter with runtime
      logger.info('[plugin-sql] Registering PostgreSQL adapter with runtime...');
      runtime.registerDatabaseAdapter(adapter);

      // Initialize adapter and wait for it to be ready
      logger.info('[plugin-sql] Initializing PostgreSQL adapter...');
      await adapter.init();
      await adapter.waitForReady();

      logger.info('[plugin-sql] PostgreSQL adapter initialized and ready');
    } else {
      throw new Error(
        'PostgreSQL connection required. Please set POSTGRES_URL environment variable. ' +
          'PGLite support has been removed in favor of PostgreSQL with pgvector.'
      );
    }
  }

  logger.info('[plugin-sql] SQL plugin initialized successfully');
}

// Export unified migration system components
export { createMigrator, UnifiedMigrator } from './unified-migrator.js';
export { schemaRegistry } from './schema-registry.js';
export { connectionRegistry } from './connection-registry.js';
export { CORE_TABLES } from './core-tables.js';
export { setDatabaseType } from './schema/factory.js';
export type { TableSchema } from './schema-registry.js';

export default plugin;
