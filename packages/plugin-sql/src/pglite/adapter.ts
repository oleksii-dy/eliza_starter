import { logger, type UUID } from '@elizaos/core';
import { type PgliteDatabase, drizzle } from 'drizzle-orm/pglite';
import { BaseDrizzleAdapter } from '../base';
import { DIMENSION_MAP, type EmbeddingDimensionColumn } from '../schema/embedding';
import type { PGliteClientManager } from './manager';
import { sql } from 'drizzle-orm';
import { connectionRegistry } from '../connection-registry';
import { UnifiedMigrator, createMigrator } from '../unified-migrator';
import { setDatabaseType } from '../schema/factory';
import * as schema from '../schema';

/**
 * PgliteDatabaseAdapter class represents an adapter for interacting with a PgliteDatabase.
 * Extends BaseDrizzleAdapter.
 *
 * @constructor
 * @param {UUID} agentId - The ID of the agent.
 * @param {PGliteClientManager} manager - The manager for the Pglite client.
 *
 * @method withDatabase
 * @param {() => Promise<T>} operation - The operation to perform on the database.
 * @return {Promise<T>} - The result of the operation.
 *
 * @method init
 * @return {Promise<void>} - A Promise that resolves when the initialization is complete.
 *
 * @method close
 * @return {void} - A Promise that resolves when the database is closed.
 */
export class PgliteDatabaseAdapter extends BaseDrizzleAdapter {
  private manager: PGliteClientManager;
  public db: PgliteDatabase<any>;
  private migrator: UnifiedMigrator | null = null;
  private dataDir: string;
  private migrationsComplete: boolean = false;

  /**
   * Constructor for creating an instance of a class.
   * @param {UUID} agentId - The unique identifier for the agent.
   * @param {PGliteClientManager} manager - The manager for the Pglite client.
   * @param {string} dataDir - The data directory path for connection registry.
   */
  constructor(agentId: UUID, manager: PGliteClientManager, dataDir?: string) {
    super(agentId);
    this.manager = manager;
    this.dataDir = dataDir || './pglite-data';

    // Debug: Track adapter creation
    logger.debug(`Creating PgliteDatabaseAdapter for agent ${agentId} with dataDir ${dataDir}`);

    // IMPORTANT: Set database type BEFORE creating drizzle instance
    // This ensures schema objects are properly initialized
    setDatabaseType('pglite');

    // Now create the drizzle instance with the schema
    this.db = drizzle(this.manager.getConnection() as any, { schema });

    // Register this adapter in the connection registry
    connectionRegistry.registerAdapter(agentId, this);
  }

  /**
   * Override to indicate this is a PGLite adapter
   */
  protected isPGLiteAdapter(): boolean {
    return true;
  }

  /**
   * Runs database migrations by creating core tables.
   * @returns {Promise<void>}
   */
  async runMigrations(): Promise<void> {
    logger.info(`[PgliteDatabaseAdapter] Starting unified migration process`);

    if (!this.migrator) {
      this.migrator = await createMigrator(this.agentId, 'pglite', this.dataDir);
    }

    await this.migrator.initialize();

    // Verify tables were actually created before marking complete
    try {
      await this.db.execute(sql`SELECT 1 FROM agents WHERE 1=0`);
      await this.db.execute(sql`SELECT 1 FROM entities WHERE 1=0`);
      this.migrationsComplete = true;
      logger.info(`[PgliteDatabaseAdapter] Unified migration completed and verified`);
    } catch (error) {
      logger.error(`[PgliteDatabaseAdapter] Migration verification failed:`, error);
      this.migrationsComplete = false;
      throw new Error('Migration completed but table verification failed');
    }
  }

  /**
   * Asynchronously runs the provided database operation while checking if the database is currently shutting down.
   * If the database is shutting down, a warning is logged and null is returned.
   *
   * @param {Function} operation - The database operation to be performed.
   * @returns {Promise<T>} A promise that resolves with the result of the database operation.
   */
  protected async withDatabase<T>(operation: () => Promise<T>): Promise<T> {
    if (this.manager.isShuttingDown()) {
      logger.warn('Database is shutting down, operation may fail');
      // Still execute the operation to maintain type contract
      // The operation itself should handle any errors appropriately
    }
    return operation();
  }

  /**
   * Asynchronously initializes the database by running migrations.
   *
   * @returns {Promise<void>} A Promise that resolves when the database initialization is complete.
   */
  async init(): Promise<void> {
    logger.info('PgliteDatabaseAdapter: Initializing');
    logger.debug(`Adapter init() called for agent ${this.agentId}`);
    logger.debug(`Migrations complete flag:`, this.migrationsComplete);
    logger.debug(`Database connection status:`, !!this.manager.getConnection());

    // Always ensure the manager is properly initialized first
    await this.manager.initialize();

    // Always verify tables exist AND are ready for transactions, regardless of migration flag
    // The migration flag can be stale if adapter was created but not properly verified
    try {
      await this.verifyTablesReady();
      logger.info('PgliteDatabaseAdapter: Tables verified working, initialization complete');
      this.migrationsComplete = true;
      return;
    } catch (error) {
      logger.warn(
        'PgliteDatabaseAdapter: Table verification failed, need to run migrations',
        error
      );
      this.migrationsComplete = false;
    }

    // Ensure migrations are run through the unified migrator before proceeding
    if (!this.migrationsComplete) {
      logger.info('PgliteDatabaseAdapter: Running migrations to ensure tables exist');
      await this.runMigrations();
    }

    // Final verification that all critical tables are accessible AND work for real operations
    try {
      await this.verifyTablesReady();
      this.migrationsComplete = true;
      logger.info(
        'PgliteDatabaseAdapter: All critical tables verified and working, initialization complete'
      );
    } catch (error) {
      logger.error('PgliteDatabaseAdapter: Critical tables verification failed:', error);
      this.migrationsComplete = false;
      throw new Error('Database initialization failed - critical tables not working properly');
    }
  }

  /**
   * Verifies that critical tables exist and are ready for operations
   * by checking table structure and columns.
   * @returns {Promise<void>} Throws if tables are not ready
   */
  private async verifyTablesReady(): Promise<void> {
    const criticalTables = ['agents', 'entities', 'rooms', 'memories'];

    // Verify basic table existence and schema with simple queries
    for (const table of criticalTables) {
      await this.db.execute(sql.raw(`SELECT 1 FROM ${table} WHERE 1=0`));
    }

    // Verify the entities table has the expected columns
    // This checks the schema without doing data operations that might cause PGLite issues
    try {
      await this.db.execute(
        sql.raw(`
        SELECT id, agent_id, names, metadata 
        FROM entities 
        WHERE 1=0
      `)
      );

      logger.info(`PgliteDatabaseAdapter: Table verification passed for agent ${this.agentId}`);
    } catch (error) {
      logger.error(
        `PgliteDatabaseAdapter: Table verification failed for agent ${this.agentId}:`,
        error
      );
      throw new Error(`Table schema verification failed: ${(error as Error).message}`);
    }
  }

  /**
   * Checks if the database connection is ready and active.
   * For PGLite, this checks if the client is not in a shutting down state and tables exist.
   * @returns {Promise<boolean>} A Promise that resolves to true if the connection is healthy.
   */
  async isReady(): Promise<boolean> {
    try {
      if (this.manager.isShuttingDown()) {
        return false;
      }

      // Try to execute a simple query to verify the connection is active
      const connection = this.manager.getConnection();
      await connection.query('SELECT 1');

      // Verify critical tables exist AND are ready for real operations
      try {
        await this.verifyTablesReady();
        return true;
      } catch (tableError) {
        logger.debug(
          'PgliteDatabaseAdapter: Table verification failed, not ready:',
          (tableError as Error).message
        );
        return false;
      }
    } catch (error) {
      // If any error occurs (including "PGlite is closed"), return false
      logger.debug('PgliteDatabaseAdapter: Connection check failed:', (error as Error).message);
      return false;
    }
  }

  /**
   * Asynchronously closes the database.
   */
  async close() {
    await this.manager.close();
  }

  /**
   * Runs core database migrations to ensure all tables exist
   * This is the public interface method called by the SQL plugin
   */
  async migrate(): Promise<void> {
    // Delegate to runMigrations for the actual implementation
    await this.runMigrations();
  }

  /**
   * Asynchronously retrieves the connection from the client.
   *
   * @returns {Promise<PGlite>} A Promise that resolves with the connection.
   */
  async getConnection() {
    return this.manager.getConnection();
  }

  /**
   * Get all worlds (implementation required by base class)
   */
  async getWorlds(): Promise<any[]> {
    // PGLite adapter doesn't implement worlds yet
    return [];
  }

  /**
   * Get the Drizzle database instance for direct access
   */
  getDatabase(): PgliteDatabase<any> {
    return this.db;
  }

  /**
   * List all tables in the PGLite database
   */
  protected async listTables(): Promise<string[]> {
    try {
      // PGLite uses PostgreSQL's information_schema
      const result = await this.db.execute(
        sql.raw(`SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'`)
      );

      // Handle different result formats from different database adapters
      const rows = Array.isArray(result) ? result : result.rows || [];
      return rows.map((row: any) => row.table_name);
    } catch (error) {
      logger.warn('Failed to list tables in PGLite:', error);
      return [];
    }
  }
}
