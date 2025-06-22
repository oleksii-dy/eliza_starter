import { logger, Service, ServiceType, AgentRuntime } from '@elizaos/core';
import type { Plugin, IAgentRuntime } from '@elizaos/core';
import { PgliteDatabaseAdapter } from './pglite/adapter';
import { PGliteClientManager } from './pglite/manager';
import { PgDatabaseAdapter } from './pg/adapter';
import { PostgresConnectionManager } from './pg/manager';
import { resolvePgliteDir } from './utils';
import { setDatabaseType } from './schema/factory';
import sqlPluginTestSuite from './__tests__/e2e/sql-plugin';
import helloWorldPluginTestSuite from './__tests__/e2e/hello-world-plugin.test';
import { DatabaseService } from './database-service.js';

// Import all schema exports
import * as schema from './schema/index';

// Type definitions
type UUID = string;

/**
 * Global Singleton Instances (Package-scoped)
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
 */
export function createDatabaseAdapter(
  config: {
    dataDir?: string;
    postgresUrl?: string;
  },
  agentId: UUID
): any {
  const dataDir = resolvePgliteDir(config.dataDir);

  if (config.postgresUrl) {
    // Set database type for PostgreSQL
    setDatabaseType('postgres');

    if (!globalSingletons.postgresConnectionManager) {
      globalSingletons.postgresConnectionManager = new PostgresConnectionManager(
        config.postgresUrl
      );
    }
    return new PgDatabaseAdapter(agentId as any, globalSingletons.postgresConnectionManager);
  }

  // Set database type for PGLite
  setDatabaseType('pglite');

  if (!globalSingletons.pgLiteClientManager) {
    globalSingletons.pgLiteClientManager = new PGliteClientManager({ dataDir });
  }

  return new PgliteDatabaseAdapter(agentId as any, globalSingletons.pgLiteClientManager);
}

/**
 * SQL Database Service
 * This service provides database functionality and handles dynamic schema loading
 */
class SqlDatabaseService extends DatabaseService {
  static override serviceName = 'database' as const;
  override serviceName = 'database' as const;

  private adapter: any;

  override get capabilityDescription(): string {
    return 'SQL database service with dynamic schema management';
  }

  constructor(runtime: IAgentRuntime, adapter?: any, db?: any) {
    // Call parent with runtime and db
    super(runtime, db);
    this.adapter = adapter;
  }

  static async start(runtime: IAgentRuntime): Promise<Service> {
    logger.info('[SqlDatabaseService] Starting database service...');

    // Get database configuration from runtime settings
    const postgresUrl = runtime.getSetting('POSTGRES_URL');
    const dataDir =
      runtime.getSetting('PGLITE_PATH') ||
      runtime.getSetting('DATABASE_PATH') ||
      './.eliza/.elizadb';

    const adapter = createDatabaseAdapter(
      {
        dataDir,
        postgresUrl,
      },
      runtime.agentId
    );

    // Get the actual database instance
    const db = (adapter as any).db || adapter;

    // Create the service instance
    const service = new SqlDatabaseService(runtime, adapter, db);

    // Register the adapter with the runtime
    runtime.registerDatabaseAdapter(adapter);

    logger.info('[SqlDatabaseService] Database service started successfully');
    return service;
  }

  async stop(): Promise<void> {
    logger.info('[SqlDatabaseService] Stopping database service...');
    // Cleanup if needed
  }

  getAdapter(): any {
    return this.adapter;
  }
}

/**
 * SQL plugin for database adapter using Drizzle ORM
 */
const sqlPlugin: Plugin = {
  name: '@elizaos/plugin-sql',
  description: 'A plugin for SQL database access with Drizzle ORM',
  priority: 0,
  tests: [sqlPluginTestSuite, helloWorldPluginTestSuite],

  // The plugin's own schema
  schema: schema,

  init: async (_, runtime: IAgentRuntime) => {
    logger.info('[plugin-sql] Initializing SQL plugin...');

    // Check if a database adapter is already registered
    const existingAdapter = (runtime as any).adapter || (runtime as any).databaseAdapter;
    if (existingAdapter) {
      logger.info('[plugin-sql] Database adapter already registered, will initialize schema');
      logger.debug('[plugin-sql] Existing adapter:', existingAdapter);

      // Initialize the adapter if not already initialized
      if (!(await existingAdapter.isReady())) {
        await existingAdapter.init();
      }

      // Get the actual database instance - try different ways
      logger.debug('[plugin-sql] Getting database instance from adapter...');
      let db = existingAdapter.db || existingAdapter.getDatabase?.() || existingAdapter;
      logger.debug('[plugin-sql] Initial db attempt:', !!db, typeof db?.execute);

      // For PGLite adapter, we need to get the db from the client
      if (!db || typeof db.execute !== 'function') {
        logger.debug('[plugin-sql] Trying alternative methods to get db...');
        if (existingAdapter.pgLiteClient) {
          db = existingAdapter.pgLiteClient;
          logger.debug('[plugin-sql] Got db from pgLiteClient');
        } else if (existingAdapter.connectionManager?.getDb) {
          db = await existingAdapter.connectionManager.getDb();
          logger.debug('[plugin-sql] Got db from connectionManager');
        }
      }

      if (!db || typeof db.execute !== 'function') {
        logger.error('[plugin-sql] Could not get database instance from existing adapter');
        logger.error('[plugin-sql] Adapter properties:', Object.keys(existingAdapter));
        throw new Error('Failed to get database instance from existing adapter');
      }

      logger.debug('[plugin-sql] Successfully got database instance');

      // Create database service and register it
      const dbService = new SqlDatabaseService(runtime, existingAdapter, db);

      // Register the service manually - check if services exists
      if ((runtime as any).services && typeof (runtime as any).services.set === 'function') {
        (runtime as any).services.set('database', dbService);
      }

      // Initialize our schema
      try {
        await dbService.initializePluginSchema('@elizaos/plugin-sql', schema);
        logger.info('[plugin-sql] SQL plugin schema initialized');
      } catch (error) {
        logger.error('[plugin-sql] Failed to initialize schema:', error);
        throw error;
      }
      return;
    }

    // If no adapter exists, create one
    const postgresUrl = runtime.getSetting('POSTGRES_URL');
    const dataDir =
      runtime.getSetting('PGLITE_PATH') ||
      runtime.getSetting('DATABASE_PATH') ||
      './.eliza/.elizadb';

    const dbAdapter = createDatabaseAdapter(
      {
        dataDir,
        postgresUrl,
      },
      runtime.agentId
    );

    // Register the adapter
    runtime.registerDatabaseAdapter(dbAdapter);
    logger.info('[plugin-sql] Database adapter created and registered');

    // Initialize the adapter
    await dbAdapter.init();
    logger.info('[plugin-sql] Database adapter initialized');

    // Get the actual database instance
    let db = dbAdapter.db || dbAdapter.getDatabase?.() || dbAdapter;

    if (!db || typeof db.execute !== 'function') {
      logger.error('[plugin-sql] Could not get database instance from adapter');
      throw new Error('Failed to get database instance from adapter');
    }

    // Create and register the database service
    const dbService = new SqlDatabaseService(runtime, dbAdapter, db);

    // Register the service manually since we're in init() - check if services exists
    if ((runtime as any).services && typeof (runtime as any).services.set === 'function') {
      (runtime as any).services.set('database', dbService);
      logger.info('[plugin-sql] Database service registered');
    }

    // Initialize our schema immediately
    await dbService.initializePluginSchema('@elizaos/plugin-sql', schema);
    logger.info('[plugin-sql] SQL plugin schema initialized');
  },
};

// Export the plugin
export const plugin = sqlPlugin;
export default plugin;

// Export utilities for direct use if needed
export { setDatabaseType } from './schema/factory';
export { resolvePgliteDir } from './utils';
export { DatabaseService } from './database-service.js';
export type { IDatabaseService } from './database-service.js';
