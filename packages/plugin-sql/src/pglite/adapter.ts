import { logger, type UUID } from '@elizaos/core';
import { type PgliteDatabase, drizzle } from 'drizzle-orm/pglite';
import { BaseDrizzleAdapter } from '../base';
import { DIMENSION_MAP, type EmbeddingDimensionColumn } from '../schema/embedding';
import type { PGliteClientManager } from './manager';
import { sql } from 'drizzle-orm';

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
  protected embeddingDimension: EmbeddingDimensionColumn = DIMENSION_MAP[384];
  public db: PgliteDatabase<any>;

  /**
   * Constructor for creating an instance of a class.
   * @param {UUID} agentId - The unique identifier for the agent.
   * @param {PGliteClientManager} manager - The manager for the Pglite client.
   */
  constructor(agentId: UUID, manager: PGliteClientManager) {
    super(agentId);
    this.manager = manager;
    this.db = drizzle(this.manager.getConnection() as any);
  }

  /**
   * Override to indicate this is a PGLite adapter
   */
  protected isPGLiteAdapter(): boolean {
    return true;
  }

  /**
   * Runs database migrations. For PGLite, migrations are handled by the
   * migration service, not the adapter itself.
   * @returns {Promise<void>}
   */
  async runMigrations(): Promise<void> {
    logger.debug('PgliteDatabaseAdapter: Running migrations...');

    // Always create tables directly from schema
    // This avoids circular dependencies with the runtime
    logger.info('PgliteDatabaseAdapter: Creating tables from schema');

    // Import the schema
    const schema = await import('../schema');

    // Create a minimal DatabaseService instance to create tables
    const { DatabaseService } = await import('../database-service');
    // Pass the raw connection, not the Drizzle wrapper
    const connection = this.manager.getConnection();
    const tempService = new DatabaseService({} as any, connection);

    // Use the service to create tables from schema
    await tempService.initializePluginSchema('@elizaos/plugin-sql', schema);

    // Recreate the Drizzle instance after tables are created
    // This ensures the Drizzle instance is aware of the newly created tables
    this.db = drizzle(this.manager.getConnection() as any);

    logger.info('PgliteDatabaseAdapter: Tables created successfully');
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
      logger.warn('Database is shutting down');
      return null as unknown as T;
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

    // Create pgvector extension for PGLite
    try {
      await this.db.execute(sql`CREATE EXTENSION IF NOT EXISTS vector`);
      logger.info('PgliteDatabaseAdapter: pgvector extension created');
    } catch (error) {
      logger.warn('PgliteDatabaseAdapter: Failed to create pgvector extension', error);
    }

    // Run migrations
    await this.runMigrations();

    // For PGLite, we need to ensure the embeddings table has proper vector columns
    // Check if embeddings table exists and recreate it with proper vector types if needed
    try {
      const tableExists = await this.db.execute(sql`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_name = 'embeddings'
        )
      `);

      if (tableExists.rows[0]?.exists) {
        // Check if the columns are vector type
        const columnInfo = await this.db.execute(sql`
          SELECT column_name, udt_name 
          FROM information_schema.columns 
          WHERE table_name = 'embeddings' 
          AND column_name LIKE 'dim_%'
          LIMIT 1
        `);

        // If columns are not vector type, recreate the table
        if (columnInfo.rows.length > 0 && columnInfo.rows[0].udt_name !== 'vector') {
          logger.info(
            'PgliteDatabaseAdapter: Recreating embeddings table with proper vector columns'
          );

          // Drop the existing table
          await this.db.execute(sql`DROP TABLE IF EXISTS embeddings CASCADE`);

          // Create the table with proper vector columns
          await this.db.execute(sql`
            CREATE TABLE embeddings (
              id UUID PRIMARY KEY,
              memory_id UUID NOT NULL,
              dim_384 vector(384),
              dim_512 vector(512),
              dim_768 vector(768),
              dim_1024 vector(1024),
              dim_1536 vector(1536),
              dim_3072 vector(3072),
              created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
          `);

          // Create index on memory_id for faster lookups
          await this.db.execute(sql`
            CREATE INDEX IF NOT EXISTS idx_embeddings_memory_id 
            ON embeddings(memory_id)
          `);

          logger.info('PgliteDatabaseAdapter: Embeddings table recreated with vector columns');
        }
      }
    } catch (error) {
      logger.warn('PgliteDatabaseAdapter: Failed to check/recreate embeddings table', error);
    }

    logger.info('PgliteDatabaseAdapter: Initialization complete');
  }

  /**
   * Checks if the database connection is ready and active.
   * For PGLite, this checks if the client is not in a shutting down state.
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
      return true;
    } catch (error) {
      // If any error occurs (including "PGlite is closed"), return false
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
}
