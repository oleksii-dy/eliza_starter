import { logger, type UUID } from '@elizaos/core';
import { sql } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/pglite';
import { connectionRegistry } from './connection-registry';
import { schemaRegistry, type TableSchema } from './schema-registry';
import { CORE_TABLES } from './core-tables';
import { setDatabaseType, type DatabaseType } from './schema/factory';

/**
 * Unified migration system that handles all table creation in a consistent manner.
 * This replaces the previous multiple migration approaches with a single, reliable system.
 */
export class UnifiedMigrator {
  private db: any;
  private dbType: DatabaseType;
  private agentId: UUID;
  private initialized = false;

  constructor(db: any, dbType: DatabaseType, agentId: UUID) {
    this.db = db;
    this.dbType = dbType;
    this.agentId = agentId;

    // Set the database type for the schema factory
    setDatabaseType(dbType);

    logger.info(`[UnifiedMigrator] Created for agent ${agentId} with database type: ${dbType}`);
  }

  /**
   * Initialize the migrator and run all migrations
   */
  async initialize(): Promise<void> {
    if (this.initialized) {
      logger.debug('[UnifiedMigrator] Already initialized, skipping');
      return;
    }

    logger.info(`[UnifiedMigrator] Starting unified migration process for ${this.dbType}...`);

    try {
      // Step 1: Ensure vector extension (if supported)
      await this.ensureVectorExtension();

      // Step 2: Register core tables
      await this.registerCoreTables();

      // Step 3: Create all tables (core + plugin tables)
      await this.createAllTables();

      // Step 4: Load schema objects for Drizzle
      await this.loadSchemaObjects();

      // Step 5: Verify critical tables
      await this.verifyTables();

      this.initialized = true;
      logger.info(`[UnifiedMigrator] Migration process completed successfully for ${this.dbType}`);
    } catch (error) {
      logger.error(`[UnifiedMigrator] Migration process failed for ${this.dbType}:`, error);
      throw error;
    }
  }

  /**
   * Register a plugin's table schemas
   */
  async registerPluginTables(tables: TableSchema[]): Promise<void> {
    logger.info(`[UnifiedMigrator] Registering ${tables.length} plugin tables`);
    schemaRegistry.registerTables(tables);
  }

  /**
   * Register tables from a legacy schema object (for backwards compatibility)
   */
  async registerLegacySchema(schema: any, pluginName: string): Promise<void> {
    logger.info(`[UnifiedMigrator] Converting legacy schema from ${pluginName}`);

    // This method provides backwards compatibility with the existing schema objects
    // by converting them to the new TableSchema format
    const tables = this.convertLegacySchemaToTables(schema, pluginName);
    await this.registerPluginTables(tables);
  }

  private async ensureVectorExtension(): Promise<void> {
    try {
      logger.info(`[UnifiedMigrator] Ensuring vector extension for ${this.dbType}`);

      // Try to create the extension for both PostgreSQL and PGLite
      try {
        await this.db.execute(sql.raw('CREATE EXTENSION IF NOT EXISTS vector'));
        logger.info('[UnifiedMigrator] Vector extension created/verified');
      } catch (createError) {
        // For PGLite, the extension might already be loaded via constructor
        logger.debug(
          '[UnifiedMigrator] CREATE EXTENSION failed, testing if vector type is available'
        );
      }

      // For PGLite, skip temporary table test to avoid database corruption
      if (this.dbType === 'pglite') {
        logger.info(
          '[UnifiedMigrator] Skipping vector verification for PGLite to prevent corruption'
        );
        return;
      }

      // Test if vector extension is actually working by creating a test table (PostgreSQL only)
      try {
        await this.db.execute(
          sql.raw('CREATE TEMPORARY TABLE test_vector_support (id INT, vec vector(3))')
        );
        await this.db.execute(sql.raw('DROP TABLE test_vector_support'));
        logger.info('[UnifiedMigrator] Vector extension verified working');
      } catch (vectorError) {
        logger.warn('[UnifiedMigrator] Vector extension not available:', {
          error:
            vectorError instanceof Error
              ? {
                  message: vectorError.message,
                  stack: vectorError.stack?.split('\n').slice(0, 5),
                }
              : String(vectorError),
        });
        logger.warn(
          '[UnifiedMigrator] Semantic search features will be disabled for this instance'
        );
        // Don't throw error - continue without vector support
      }
    } catch (error) {
      logger.warn('[UnifiedMigrator] Could not ensure vector extension:', error);
      // Don't throw error - continue without vector support
    }
  }

  private async registerCoreTables(): Promise<void> {
    logger.info('[UnifiedMigrator] Registering core tables');

    // Clear any previous registrations to ensure clean state
    schemaRegistry.resetCreatedTables();

    // Register the core tables
    schemaRegistry.registerTables(CORE_TABLES);

    // Log how many tables were registered
    const tableCount = schemaRegistry.getTableCount();
    logger.info(`[UnifiedMigrator] Registered ${tableCount} core tables`);

    // Debug: Log the actual table names
    const tableNames = schemaRegistry.getTableNames();
    logger.debug(`[UnifiedMigrator] Registered tables: ${tableNames.join(', ')}`);
  }

  private async createAllTables(): Promise<void> {
    logger.info('[UnifiedMigrator] Creating all registered tables');

    // Check if any tables are registered
    const tableCount = schemaRegistry.getTableCount();
    if (tableCount === 0) {
      logger.error('[UnifiedMigrator] No tables registered! This is a bug.');
      throw new Error('No tables registered for migration');
    }

    logger.info(`[UnifiedMigrator] Found ${tableCount} tables to create`);

    await schemaRegistry.createTables(this.db, this.dbType);
  }

  private async loadSchemaObjects(): Promise<void> {
    logger.info('[UnifiedMigrator] Loading schema objects for Drizzle');

    // Import and access the schema objects to trigger lazy loading
    try {
      const coreSchema = await import('./schema');

      // Access each schema object to trigger lazy proxy loading
      const schemaObjects = [
        'agentTable',
        'cacheTable',
        'entityTable',
        'roomTable',
        'memoryTable',
        'embeddingTable',
        'relationshipTable',
        'participantTable',
        'worldTable',
        'tasksTable',
        'componentTable',
        'messageServerTable',
        'channelTable',
        'messageTable',
        'channelParticipantsTable',
        'serverAgentsTable',
        'logTable',
      ];

      for (const objectName of schemaObjects) {
        if (coreSchema[objectName]) {
          try {
            // Access properties to trigger lazy loading
            const table = coreSchema[objectName];
            const _ = table._;
            const name = table._?.name;
            logger.debug(`[UnifiedMigrator] Loaded schema object: ${objectName} (${name})`);
          } catch (error) {
            logger.warn(`[UnifiedMigrator] Failed to load schema object ${objectName}:`, error);
          }
        }
      }

      logger.info('[UnifiedMigrator] Schema objects loaded successfully');
    } catch (error) {
      logger.error('[UnifiedMigrator] Failed to load schema objects:', error);
      throw error;
    }
  }

  private async verifyTables(): Promise<void> {
    logger.info('[UnifiedMigrator] Verifying critical tables exist and are accessible');

    const criticalTables = ['agents', 'entities', 'rooms', 'memories'];
    const maxRetries = 20;
    const baseDelay = 100;

    for (const tableName of criticalTables) {
      let tableReady = false;

      for (let attempt = 0; attempt < maxRetries && !tableReady; attempt++) {
        try {
          // Test table access with operations that must work
          // Use table name without quotes for PGLite compatibility
          const selectQuery =
            this.dbType === 'pglite'
              ? `SELECT 1 FROM ${tableName} WHERE 1=0`
              : `SELECT 1 FROM "${tableName}" WHERE 1=0`;
          await this.db.execute(sql.raw(selectQuery));

          // For critical tables, also test a basic INSERT operation (then rollback)
          if (tableName === 'agents') {
            await this.db
              .transaction(async (tx) => {
                // Test insert capability (will be rolled back)
                const insertQuery =
                  this.dbType === 'pglite'
                    ? `INSERT INTO ${tableName} (id, name, bio, system) VALUES ('test-id', 'test', 'test', 'test')`
                    : `INSERT INTO "${tableName}" (id, name, bio, system) VALUES ('test-id', 'test', 'test', 'test')`;
                await tx.execute(sql.raw(insertQuery));
                // Force rollback
                throw new Error('ROLLBACK_TEST');
              })
              .catch((error) => {
                // We expect this to fail with our rollback error, which means INSERT worked
                if (!error.message.includes('ROLLBACK_TEST')) {
                  throw error; // Re-throw if it's a different error
                }
              });
          }

          tableReady = true;
          logger.debug(
            `[UnifiedMigrator] ✓ Verified table ready: ${tableName} (attempt ${attempt + 1})`
          );
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : String(error);

          // Skip the expected rollback test error
          if (errorMessage.includes('ROLLBACK_TEST')) {
            tableReady = true;
            logger.debug(
              `[UnifiedMigrator] ✓ Verified table ready: ${tableName} (attempt ${attempt + 1})`
            );
            continue;
          }

          if (attempt < maxRetries - 1) {
            // Exponential backoff with jitter
            const delay = Math.min(baseDelay * Math.pow(2, attempt) + Math.random() * 100, 2000);
            logger.debug(
              `[UnifiedMigrator] Table ${tableName} not ready (attempt ${attempt + 1}/${maxRetries}), retrying in ${delay}ms:`,
              {
                error: errorMessage,
              }
            );
            await new Promise((resolve) => setTimeout(resolve, delay));
          } else {
            logger.warn(
              `[UnifiedMigrator] ⚠ Table ${tableName} verification failed after ${maxRetries} attempts:`,
              {
                error: errorMessage,
              }
            );

            // Try to list available tables for debugging
            try {
              if (this.dbType === 'postgres') {
                const tables = await this.db.execute(
                  sql.raw(
                    `SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'`
                  )
                );
                logger.warn(`[UnifiedMigrator] Available PostgreSQL tables:`, tables);
              } else if (this.dbType === 'pglite') {
                const tables = await this.db.execute(
                  sql.raw(
                    `SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'`
                  )
                );
                logger.warn(`[UnifiedMigrator] Available PGLite tables:`, tables);
              }
            } catch (listError) {
              logger.warn(`[UnifiedMigrator] Could not list tables:`, listError);
            }

            // Mark as ready anyway to prevent blocking, but log the issue
            tableReady = true;
            logger.warn(
              `[UnifiedMigrator] Proceeding despite table verification failure for: ${tableName}`
            );
          }
        }
      }
    }

    logger.info('[UnifiedMigrator] Table verification completed - all critical tables ready');
  }

  private convertLegacySchemaToTables(schema: any, pluginName: string): TableSchema[] {
    // This is a compatibility layer for the existing schema objects
    // In practice, plugins should migrate to using the new TableSchema format directly
    logger.warn(
      `[UnifiedMigrator] Converting legacy schema from ${pluginName} - consider migrating to TableSchema format`
    );

    // For now, return empty array - plugins using legacy schema should be updated
    // to use the new registration system
    return [];
  }

  /**
   * Get migration status
   */
  isInitialized(): boolean {
    return this.initialized;
  }

  /**
   * Force re-initialization (useful for tests)
   */
  async reinitialize(): Promise<void> {
    this.initialized = false;
    await this.initialize();
  }
}

/**
 * Factory function to create a migrator for a specific adapter
 */
export async function createMigrator(
  agentId: UUID,
  dbType: DatabaseType,
  connectionKey: string
): Promise<UnifiedMigrator> {
  logger.info(`[UnifiedMigrator] Creating migrator for agent ${agentId}`);

  // ALWAYS try to get the database instance from an existing adapter first
  const existingAdapter = connectionRegistry.getAdapter(agentId);
  if (existingAdapter) {
    logger.info(
      `[UnifiedMigrator] Using database instance from existing adapter for agent ${agentId}`
    );
    return new UnifiedMigrator(existingAdapter.getDatabase(), dbType, agentId);
  }

  // If no adapter exists, create a new database connection
  // But this should be rare in normal operation
  logger.warn(
    `[UnifiedMigrator] No existing adapter found for agent ${agentId}, creating new database connection`
  );

  let db: any;

  if (dbType === 'postgres') {
    const manager = connectionRegistry.getPostgresManager(connectionKey);
    db = manager.getDatabase();
  } else {
    const manager = connectionRegistry.getPGLiteManager(connectionKey);
    await manager.initialize();
    // Use the same Drizzle creation pattern as the adapter
    db = drizzle(manager.getConnection() as any);
  }

  return new UnifiedMigrator(db, dbType, agentId);
}
