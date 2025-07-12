import type { IDatabaseAdapter, UUID } from '@elizaos/core';
import { type IAgentRuntime, type Plugin, logger } from '@elizaos/core';
import { PgliteDatabaseAdapter } from './pglite/adapter';
import { PGliteClientManager } from './pglite/manager';
import { PgDatabaseAdapter } from './pg/adapter';
import { PostgresConnectionManager } from './pg/manager';
import { resolvePgliteDir } from './utils';
import * as schema from './schema';

/**
 * Global Singleton Instances (Package-scoped)
 *
 * These instances are stored globally within the package scope to ensure a single shared instance across multiple adapters within this package.
 * This approach prevents multiple instantiations due to module caching or multiple imports within the same process.
 *
 * IMPORTANT:
 * - Do NOT directly modify these instances outside their intended initialization logic.
 * - These instances are NOT exported and should NOT be accessed outside this package.
 */
const GLOBAL_SINGLETONS = Symbol.for('@elizaos/plugin-sql/global-singletons');

interface GlobalSingletons {
  pgLiteClientManager?: PGliteClientManager;
  postgresConnectionManager?: PostgresConnectionManager;
}

const globalSymbols = global as unknown as Record<symbol, GlobalSingletons>;

if (!globalSymbols[GLOBAL_SINGLETONS]) {
  globalSymbols[GLOBAL_SINGLETONS] = {};
}

const globalSingletons = globalSymbols[GLOBAL_SINGLETONS];

/**
 * Creates a database adapter based on the provided configuration.
 * If a postgresUrl is provided in the config, a PgDatabaseAdapter is initialized using the PostgresConnectionManager.
 * Otherwise, a BunSqliteAdapter is used as the default unless forcePglite is true.
 * Falls back to PGLite if BunSqlite fails to load.
 *
 * @param {object} config - The configuration object.
 * @param {string} [config.dataDir] - The directory where data is stored. Defaults to "./.eliza/.elizadb".
 * @param {string} [config.postgresUrl] - The URL for the PostgreSQL database.
 * @param {boolean} [config.forcePglite] - Force the use of PGLite instead of BunSqlite.
 * @param {UUID} agentId - The unique identifier for the agent.
 * @returns {IDatabaseAdapter} The created database adapter.
 */
export async function createDatabaseAdapter(
  config: {
    dataDir?: string;
    postgresUrl?: string;
    forcePglite?: boolean;
    forceBunSqlite?: boolean;
  },
  agentId: UUID
): Promise<IDatabaseAdapter> {
  // 1. PostgreSQL has highest priority when URL is provided
  if (config.postgresUrl) {
    logger.info('[plugin-sql] Using PostgreSQL adapter (URL provided)');
    if (!globalSingletons.postgresConnectionManager) {
      globalSingletons.postgresConnectionManager = new PostgresConnectionManager(
        config.postgresUrl
      );
    }
    return new PgDatabaseAdapter(agentId, globalSingletons.postgresConnectionManager);
  }

  // 2. Explicit force flags take precedence
  if (config.forceBunSqlite) {
    logger.info('[plugin-sql] forceBunSqlite is true, using BunSqlite adapter');

    try {
      // Check if we're running in Bun
      const isBun = typeof Bun !== 'undefined';

      if (!isBun) {
        throw new Error('Not running in Bun environment for BunSqlite');
      }

      const { BunSqliteAdapter } = await import('./bun-sqlite/adapter');
      const bunConfig = {
        filename: config.dataDir ? `${config.dataDir}/bun-${agentId}.db` : undefined,
        inMemory: false,
      };

      logger.info('[plugin-sql] Using BunSqlite adapter (forced)');
      return new BunSqliteAdapter(agentId, bunConfig);
    } catch (error) {
      logger.error('[plugin-sql] Failed to load BunSqliteAdapter despite force flag:', error);
      throw new Error(
        `Failed to create BunSqlite adapter: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  if (config.forcePglite) {
    logger.info('[plugin-sql] forcePglite is true, using PGLite adapter');
    const dataDir = resolvePgliteDir(config.dataDir);

    if (!globalSingletons.pgLiteClientManager) {
      globalSingletons.pgLiteClientManager = new PGliteClientManager({ dataDir });
    }

    return new PgliteDatabaseAdapter(agentId, globalSingletons.pgLiteClientManager);
  }

  // 3. Default behavior: try PGLite first for better compatibility, fallback to BunSqlite
  // This provides better isomorphic support across different environments
  try {
    logger.info('[plugin-sql] Attempting PGLite adapter (default choice for compatibility)');
    const dataDir = resolvePgliteDir(config.dataDir);

    if (!globalSingletons.pgLiteClientManager) {
      globalSingletons.pgLiteClientManager = new PGliteClientManager({ dataDir });
    }

    const adapter = new PgliteDatabaseAdapter(agentId, globalSingletons.pgLiteClientManager);
    logger.info('[plugin-sql] Using PGLite adapter as default');
    return adapter;
  } catch (pgliteError) {
    logger.warn(
      '[plugin-sql] PGLite initialization failed, trying BunSqlite fallback:',
      pgliteError
    );

    // Fallback to BunSqlite if PGLite fails
    try {
      // Check if we're running in Bun
      const isBun = typeof Bun !== 'undefined';

      if (!isBun) {
        throw new Error('Not running in Bun environment for BunSqlite fallback');
      }

      const { BunSqliteAdapter } = await import('./bun-sqlite/adapter');
      const bunConfig = {
        filename: config.dataDir ? `${config.dataDir}/bun-${agentId}.db` : undefined,
        inMemory: false,
      };

      logger.info('[plugin-sql] Using BunSqlite adapter as fallback');
      return new BunSqliteAdapter(agentId, bunConfig);
    } catch (bunError) {
      logger.error('[plugin-sql] Both PGLite and BunSqlite failed to initialize:', {
        pgliteError: pgliteError instanceof Error ? pgliteError.message : String(pgliteError),
        bunError: bunError instanceof Error ? bunError.message : String(bunError),
      });

      // Re-throw the original PGLite error as it's more likely to succeed in production
      throw new Error(
        `Failed to create database adapter. PGLite error: ${pgliteError instanceof Error ? pgliteError.message : String(pgliteError)}`
      );
    }
  }
}

/**
 * SQL plugin for database adapter using Drizzle ORM with dynamic plugin schema migrations
 *
 * @typedef {Object} Plugin
 * @property {string} name - The name of the plugin
 * @property {string} description - The description of the plugin
 * @property {Function} init - The initialization function for the plugin
 * @param {any} _ - Input parameter
 * @param {IAgentRuntime} runtime - The runtime environment for the agent
 */
// Import test suites
import { testSuites as e2eTestSuites } from './__tests__/e2e';

export const plugin: Plugin = {
  name: '@elizaos/plugin-sql',
  description: 'A plugin for SQL database access with dynamic schema migrations',
  priority: 0,
  schema,
  tests: e2eTestSuites,
  init: async (_, runtime: IAgentRuntime) => {
    logger.info('plugin-sql init starting...');

    // Check if a database adapter is already registered
    try {
      // Try to access the database adapter to see if one exists
      const existingAdapter = (runtime as any).databaseAdapter;
      if (existingAdapter) {
        logger.info('Database adapter already registered, skipping creation');
        return;
      }
    } catch (error) {
      // No adapter exists, continue with creation
    }

    // Get database configuration from runtime settings
    const postgresUrl = runtime.getSetting('POSTGRES_URL');
    const dataDir =
      runtime.getSetting('PGLITE_PATH') ||
      runtime.getSetting('DATABASE_PATH') ||
      './.eliza/.elizadb';
    const forcePglite = runtime.getSetting('FORCE_PGLITE') === 'true';
    const forceBunSqlite = runtime.getSetting('FORCE_BUNSQLITE') === 'true';

    const dbAdapter = await createDatabaseAdapter(
      {
        dataDir,
        postgresUrl,
        forcePglite,
        forceBunSqlite,
      },
      runtime.agentId
    );

    // Initialize the adapter before registering it
    await dbAdapter.init();

    runtime.registerDatabaseAdapter(dbAdapter);
    logger.info('Database adapter created, initialized, and registered');

    // Note: DatabaseMigrationService is not registered as a runtime service
    // because migrations are handled at the server level before agents are loaded
  },
};

export default plugin;

// Export additional utilities that may be needed by consumers
export { DatabaseMigrationService } from './migration-service';
export { runPluginMigrations } from './custom-migrator';
export { schema };

// Export alias for backward compatibility
export const createAdaptiveDatabaseAdapterV2 = createDatabaseAdapter;

// Export schema factory functions for setting database type
export { setDatabaseType, getSchemaFactory } from './schema';
