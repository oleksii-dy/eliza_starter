import { DatabaseAdapter, type Plugin, type UUID, logger } from '@elizaos/core';
import { PGliteClientManager } from './pglite/manager';
import { PgliteDatabaseAdapter } from './pglite/adapter';
import { PostgresConnectionManager } from './pg/manager';
import { PgDatabaseAdapter } from './pg/adapter';
import { connectionRegistry } from './connection-registry';
import { resolvePgliteDir } from './utils';

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
export function createDatabaseAdapter(
  config: {
    dataDir?: string;
    postgresUrl?: string;
  },
  agentId: UUID
): DatabaseAdapter {
  const dataDir = resolvePgliteDir(config.dataDir);

  if (config.postgresUrl) {
    const manager = connectionRegistry.getPostgresManager(config.postgresUrl);
    return new PgDatabaseAdapter(agentId, manager, config.postgresUrl);
  }

  const manager = connectionRegistry.getPGLiteManager(dataDir);
  return new PgliteDatabaseAdapter(agentId, manager, dataDir);
}

// Track initialization to prevent multiple initialization
let pluginInitialized = false;

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

    // Prevent multiple initialization
    if (pluginInitialized) {
      logger.info('[plugin-sql] Plugin already initialized, skipping');
      return;
    }

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
      return;
    }

    // Determine which adapter to use based on configuration
    const postgresUrl = runtime.getSetting('POSTGRES_URL');

    if (postgresUrl) {
      // Use PostgreSQL adapter
      logger.info('[plugin-sql] Using PostgreSQL adapter');
      const manager = connectionRegistry.getPostgresManager(postgresUrl);
      const adapter = new PgDatabaseAdapter(runtime.agentId, manager, postgresUrl);

      // Register adapter with runtime - let runtime handle initialization
      logger.info('[plugin-sql] Registering PostgreSQL adapter with runtime...');
      runtime.registerDatabaseAdapter(adapter);
      logger.info('[plugin-sql] PostgreSQL adapter registered (runtime will initialize)');
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

      // Register adapter with runtime - let runtime handle initialization
      logger.info('[plugin-sql] Registering PGLite adapter with runtime...');
      runtime.registerDatabaseAdapter(adapter);
      logger.info('[plugin-sql] PGLite adapter registered (runtime will initialize)');
      pluginInitialized = true;
    }

    logger.info('[plugin-sql] SQL plugin initialized successfully');
  },
};

// Export unified migration system components
export { createMigrator, UnifiedMigrator } from './unified-migrator';
export { schemaRegistry } from './schema-registry';
export { connectionRegistry } from './connection-registry';
export { CORE_TABLES } from './core-tables';
export type { TableSchema } from './schema-registry';

export default plugin;
