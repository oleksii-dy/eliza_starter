import { DatabaseAdapter, type Plugin, type UUID, logger } from '@elizaos/core';
import { PGliteClientManager } from './pglite/manager';
import { PgliteDatabaseAdapter } from './pglite/adapter';
import { PostgresConnectionManager } from './pg/manager';
import { PgDatabaseAdapter } from './pg/adapter';
import { connectionRegistry } from './connection-registry';
import { resolvePgliteDir } from './utils';
import './pglite/graceful-shutdown'; // Auto-registers shutdown handlers

/**
 * Creates a database adapter based on the provided configuration.
 * Uses the connection registry to ensure proper connection sharing.
 *
 * @param {object} config - The configuration object.
 * @param {string} [config.dataDir] - The directory where data is stored. Defaults to "./.eliza/.elizadb".
 * @param {string} [config.postgresUrl] - The URL for the PostgreSQL database.
 * @param {UUID} agentId - The unique identifier for the agent.
 * @returns {DatabaseAdapter} The created database adapter.
 */
export async function createDatabaseAdapter(
  config: {
    dataDir?: string;
    postgresUrl?: string;
  },
  agentId: UUID
): Promise<DatabaseAdapter> {
  const dataDir = resolvePgliteDir(config.dataDir);

  if (config.postgresUrl) {
    const manager = connectionRegistry.getPostgresManager(config.postgresUrl);
    return new PgDatabaseAdapter(agentId, manager, config.postgresUrl);
  }

  const manager = connectionRegistry.getPGLiteManager(dataDir);

  // Initialize the PGLite manager before creating the adapter
  logger.info('[createDatabaseAdapter] Initializing PGLite manager...');
  await manager.initialize();
  logger.info('[createDatabaseAdapter] PGLite manager initialized');

  return new PgliteDatabaseAdapter(agentId, manager, dataDir);
}

// Track initialization to prevent multiple initialization
let pluginInitialized = false;
let initializationPromise: Promise<void> | null = null;

/**
 * Factory function to create a database adapter for the runtime.
 * This is called by the runtime's plugin registration flow when it sees plugin.adapter.
 */
function createAdapterFactory(): DatabaseAdapter | null {
  // Return a special adapter that defers to the actual adapter created during init
  return {
    // This is a proxy adapter that will be replaced during plugin initialization
    __isProxyAdapter: true,
    init: async function () {
      logger.info('[SQL Plugin Proxy Adapter] init called - waiting for actual adapter');
      // The real adapter will be registered during plugin init
    },
    waitForReady: async function () {
      logger.info('[SQL Plugin Proxy Adapter] waitForReady called - waiting for actual adapter');
      // The real adapter will be registered during plugin init
    },
    // Add minimal implementations for required methods
    getAgents: async () => [],
    getAgent: async () => null,
    createAgent: async () => false,
    updateAgent: async () => false,
    deleteAgent: async () => false,
    ensureAgentExists: async (agent: any) => agent,
  } as any;
}

export const plugin: Plugin = {
  name: '@elizaos/plugin-sql',
  description: 'A plugin for SQL database access with Drizzle ORM',
  priority: 0,
  actions: [],
  evaluators: [],
  providers: [],
  services: [],

  // Export an adapter property that the runtime expects
  // This will be replaced by the actual adapter during init
  adapter: createAdapterFactory() as any,

  init: async (_, runtime) => {
    logger.info('[plugin-sql] Initializing SQL plugin...');

    // Prevent multiple initialization
    if (pluginInitialized) {
      logger.info('[plugin-sql] Plugin already initialized, skipping');
      return;
    }

    // If initialization is in progress, wait for it
    if (initializationPromise) {
      logger.info('[plugin-sql] Initialization already in progress, waiting...');
      await initializationPromise;
      return;
    }

    // Create initialization promise to prevent concurrent initialization
    initializationPromise = (async () => {
      try {
        await performInitialization(runtime);
      } finally {
        initializationPromise = null;
      }
    })();

    await initializationPromise;
  },
};

async function performInitialization(runtime: any): Promise<void> {
  // Double-check initialization after acquiring control
  if (pluginInitialized) {
    logger.info('[plugin-sql] Plugin already initialized during wait, skipping');
    return;
  }

  // Check if a database adapter is already registered in runtime
  const existingRuntimeAdapter = (runtime as any).adapter || (runtime as any).databaseAdapter;
  if (existingRuntimeAdapter && !(existingRuntimeAdapter as any).__isProxyAdapter) {
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

    pluginInitialized = true;
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
    pluginInitialized = true;
    return;
  }

  // Determine which adapter to use based on configuration
  const postgresUrl = runtime.getSetting('POSTGRES_URL');

  if (postgresUrl) {
    // Use PostgreSQL adapter
    logger.info('[plugin-sql] Using PostgreSQL adapter');
    const manager = connectionRegistry.getPostgresManager(postgresUrl);
    const adapter = new PgDatabaseAdapter(runtime.agentId, manager, postgresUrl);

    // Register adapter with runtime (replacing the proxy adapter)
    logger.info('[plugin-sql] Registering PostgreSQL adapter with runtime...');
    runtime.registerDatabaseAdapter(adapter);

    // Initialize adapter and wait for it to be ready
    logger.info('[plugin-sql] Initializing PostgreSQL adapter...');
    await adapter.init();
    await adapter.waitForReady();

    logger.info('[plugin-sql] PostgreSQL adapter initialized and ready');
    pluginInitialized = true;
  } else {
    // Use PGLite adapter
    logger.info('[plugin-sql] Using PGLite adapter');

    // Resolve PGLite directory
    const pglitePath = resolvePgliteDir(
      runtime.getSetting('PGLITE_PATH') || runtime.getSetting('DATABASE_PATH')
    );

    logger.info(`[plugin-sql] PGLite path: ${pglitePath}`);

    const manager = connectionRegistry.getPGLiteManager(pglitePath);

    // Initialize the manager first
    try {
      await manager.initialize();
    } catch (error) {
      logger.error('[plugin-sql] Failed to initialize PGLite manager:', error);
      throw error;
    }

    const adapter = new PgliteDatabaseAdapter(runtime.agentId, manager, pglitePath);

    // Register adapter with runtime (replacing the proxy adapter)
    logger.info('[plugin-sql] Registering PGLite adapter with runtime...');
    runtime.registerDatabaseAdapter(adapter);

    // Initialize adapter and wait for it to be ready
    logger.info('[plugin-sql] Initializing PGLite adapter...');
    await adapter.init();
    await adapter.waitForReady();

    logger.info('[plugin-sql] PGLite adapter initialized and ready');
    pluginInitialized = true;
  }

  logger.info('[plugin-sql] SQL plugin initialized successfully');
}

// Export unified migration system components
export { createMigrator, UnifiedMigrator } from './unified-migrator';
export { schemaRegistry } from './schema-registry';
export { connectionRegistry } from './connection-registry';
export { CORE_TABLES } from './core-tables';
export type { TableSchema } from './schema-registry';

export default plugin;
