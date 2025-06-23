import {
  logger,
  type Agent,
  type Component,
  type Entity,
  type Memory,
  type UUID,
} from '@elizaos/core';
import { drizzle } from 'drizzle-orm/node-postgres';
import { sql } from 'drizzle-orm';
import { BaseDrizzleAdapter } from '../base';
import { DIMENSION_MAP, type EmbeddingDimensionColumn } from '../schema/embedding';
import type { PostgresConnectionManager } from './manager';
import { connectionRegistry } from '../connection-registry';
import { UnifiedMigrator, createMigrator } from '../unified-migrator';
import { setDatabaseType } from '../schema/factory';
import * as schema from '../schema';

/**
 * Adapter class for interacting with a PostgreSQL database.
 * Extends BaseDrizzleAdapter.
 */
export class PgDatabaseAdapter extends BaseDrizzleAdapter {
  public db: any;
  private manager: PostgresConnectionManager;
  private initialized: boolean = false;
  private migrationsComplete: boolean = false;
  private migrator: UnifiedMigrator | null = null;
  private postgresUrl: string;

  constructor(agentId: UUID, manager: PostgresConnectionManager, postgresUrl?: string) {
    super(agentId);
    this.manager = manager;
    this.db = manager.getDatabase();
    this.postgresUrl = postgresUrl || 'postgresql://localhost:5432/eliza';

    // Set database type for schema factory
    setDatabaseType('postgres');

    // Register this adapter in the connection registry
    connectionRegistry.registerAdapter(agentId, this);
  }

  /**
   * Ensures tables are created using the unified migration system
   * @returns {Promise<void>}
   */
  async ensureTables(): Promise<void> {
    await this.runMigrations();
    this.initialized = true;
  }

  /**
   * Runs database migrations using the unified migration system.
   * @returns {Promise<void>}
   */
  async runMigrations(): Promise<void> {
    logger.info(`[PgDatabaseAdapter] Starting unified migration process`);

    if (!this.migrator) {
      this.migrator = await createMigrator(this.agentId, 'postgres', this.postgresUrl);
    }

    await this.migrator.initialize();
    
    this.migrationsComplete = true;
    logger.info(`[PgDatabaseAdapter] Unified migration completed`);
  }

  /**
   * Executes the provided operation with a database connection.
   *
   * @template T
   * @param {() => Promise<T>} operation - The operation to be executed with the database connection.
   * @returns {Promise<T>} A promise that resolves with the result of the operation.
   */
  protected async withDatabase<T>(operation: () => Promise<T>): Promise<T> {
    // Only ensure tables if not already initialized
    if (!this.initialized) {
      await this.ensureTables();
    }

    return await this.withRetry(async () => {
      const client = await this.manager.getClient();
      try {
        // Cast to any to avoid type conflicts between different pg versions
        const db = drizzle(client as any, { schema });
        this.db = db;

        return await operation();
      } finally {
        client.release();
      }
    });
  }

  /**
   * Asynchronously initializes the PgDatabaseAdapter.
   *
   * @returns {Promise<void>} A promise that resolves when initialization is complete.
   */
  async init(): Promise<void> {
    logger.info('PgDatabaseAdapter: Initializing');

    // If already initialized and migrations complete, skip
    if (this.migrationsComplete && this.initialized) {
      logger.info('PgDatabaseAdapter: Already initialized, skipping');
      return;
    }

    // Run migrations if not already complete
    if (!this.migrationsComplete) {
      await this.runMigrations();
    }

    // Ensure pgvector extension exists
    try {
      await this.db.execute(sql`CREATE EXTENSION IF NOT EXISTS vector`);
      logger.info('PgDatabaseAdapter: pgvector extension ensured');
    } catch (error) {
      logger.warn('PgDatabaseAdapter: Could not create vector extension:', error);
    }

    this.initialized = true;
    logger.info('PgDatabaseAdapter: Initialization complete');
  }

  /**
   * Checks if the database connection is ready and active.
   * @returns {Promise<boolean>} A Promise that resolves to true if the connection is healthy.
   */
  async isReady(): Promise<boolean> {
    try {
      // Check if migrations are complete
      if (!this.migrationsComplete) {
        return false;
      }

      // Check if connection is healthy
      return await this.manager.testConnection();
    } catch (error) {
      logger.debug('[PgDatabaseAdapter] isReady check failed:', error);
      return false;
    }
  }

  /**
   * Asynchronously closes the manager associated with this instance.
   *
   * @returns A Promise that resolves once the manager is closed.
   */
  async close(): Promise<void> {
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
   * Asynchronously retrieves the connection from the manager.
   *
   * @returns {Promise<Pool>} A Promise that resolves with the connection.
   */
  async getConnection() {
    return this.manager.getConnection();
  }

  async createAgent(agent: Agent): Promise<boolean> {
    await this.ensureTables();
    return super.createAgent(agent);
  }

  getAgent(agentId: UUID): Promise<Agent | null> {
    return super.getAgent(agentId);
  }

  updateAgent(agentId: UUID, agent: Partial<Agent>): Promise<boolean> {
    return super.updateAgent(agentId, agent);
  }

  deleteAgent(agentId: UUID): Promise<boolean> {
    return super.deleteAgent(agentId);
  }

  createEntities(entities: Entity[]): Promise<boolean> {
    return super.createEntities(entities);
  }

  getEntitiesByIds(entityIds: UUID[]): Promise<Entity[]> {
    return super.getEntitiesByIds(entityIds).then((result) => result || []);
  }

  updateEntity(entity: Entity): Promise<void> {
    return super.updateEntity(entity);
  }

  createMemory(memory: Memory, tableName: string): Promise<UUID> {
    return super.createMemory(memory, tableName);
  }

  getMemoryById(memoryId: UUID): Promise<Memory | null> {
    return super.getMemoryById(memoryId);
  }

  searchMemories(params: any): Promise<any[]> {
    return super.searchMemories(params);
  }

  updateMemory(memory: Partial<Memory> & { id: UUID }): Promise<boolean> {
    return super.updateMemory(memory);
  }

  deleteMemory(memoryId: UUID): Promise<void> {
    return super.deleteMemory(memoryId);
  }

  createComponent(component: Component): Promise<boolean> {
    return super.createComponent(component);
  }

  getComponent(
    entityId: UUID,
    type: string,
    worldId?: UUID,
    sourceEntityId?: UUID
  ): Promise<Component | null> {
    return super.getComponent(entityId, type, worldId, sourceEntityId);
  }

  updateComponent(component: Component): Promise<void> {
    return super.updateComponent(component);
  }

  deleteComponent(componentId: UUID): Promise<void> {
    return super.deleteComponent(componentId);
  }

  getWorlds(): Promise<any[]> {
    return super.getAllWorlds();
  }


  /**
   * List all tables in the PostgreSQL database
   */
  protected async listTables(): Promise<string[]> {
    try {
      const result = await this.db.execute(
        sql.raw(`SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'`)
      );
      
      return result.map((row: any) => row.table_name);
    } catch (error) {
      logger.warn('Failed to list tables in PostgreSQL:', error);
      return [];
    }
  }
}
