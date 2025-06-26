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
import pgvector from 'pgvector';
import { BaseDrizzleAdapter } from '../base';
import { DIMENSION_MAP, type EmbeddingDimensionColumn } from '../schema/embedding';
import type { PgManager } from './manager';
import { connectionRegistry } from '../connection-registry';
import { UnifiedMigrator, createMigrator } from '../unified-migrator';
import { setDatabaseType } from '../schema/factory';
import * as schema from '../schema';

export interface PgAdapterConfig {
  enableVectors?: boolean;
  vectorDimensions?: number;
  hnswM?: number; // HNSW index parameter
  hnswEfConstruction?: number; // HNSW index parameter
}

/**
 * Enhanced PostgreSQL adapter with pgvector support for Bun runtime.
 *
 * Features:
 * - Native pgvector integration with HNSW indexing
 * - Bun-optimized connection handling
 * - Advanced vector similarity search
 * - Bulk operations for high performance
 * - Connection health monitoring
 */
export class PgAdapter extends BaseDrizzleAdapter {
  public db: any;
  private manager: PgManager;
  private initialized: boolean = false;
  private migrationsComplete: boolean = false;
  private migrator: UnifiedMigrator | null = null;
  private config: PgAdapterConfig;

  constructor(agentId: UUID, manager: PgManager, config: PgAdapterConfig = {}) {
    super(agentId);
    this.manager = manager;
    this.db = manager.getDatabase();
    this.config = {
      enableVectors: true,
      vectorDimensions: 1536,
      hnswM: 16,
      hnswEfConstruction: 64,
      ...config,
    };

    // Set database type for schema factory
    setDatabaseType('postgres');

    // Register this adapter in the connection registry
    connectionRegistry.registerAdapter(this.agentId, this);
  }

  /**
   * Ensures tables are created using the unified migration system
   */
  async ensureTables(): Promise<void> {
    await this.runMigrations();
    this.initialized = true;
  }

  /**
   * Runs database migrations using the unified migration system.
   */
  async runMigrations(): Promise<void> {
    logger.info('[PgAdapter] Starting unified migration process');

    if (!this.migrator) {
      this.migrator = await createMigrator(
        this.agentId,
        'postgres',
        this.manager.getConnectionString()
      );
    }

    await this.migrator.initialize();

    this.migrationsComplete = true;
    logger.info('[PgAdapter] Unified migration completed');
  }

  /**
   * Enhanced initialization with pgvector support
   */
  async init(): Promise<void> {
    logger.info('[PgAdapter] Initializing PostgreSQL adapter with pgvector support');

    // If already initialized and migrations complete, skip
    if (this.migrationsComplete && this.initialized) {
      logger.info('[PgAdapter] Already initialized, skipping');
      return;
    }

    // Run migrations if not already complete
    if (!this.migrationsComplete) {
      await this.runMigrations();
    }

    // Initialize pgvector extension and create indexes
    if (this.config.enableVectors) {
      await this.initializeVectorSupport();
    }

    this.initialized = true;
    logger.info('[PgAdapter] Initialization complete');
  }

  /**
   * Initialize pgvector extension and create optimal indexes
   */
  private async initializeVectorSupport(): Promise<void> {
    try {
      // Ensure pgvector extension exists
      await this.manager.query('CREATE EXTENSION IF NOT EXISTS vector');
      logger.info('[PgAdapter] pgvector extension ensured');

      // Create HNSW indexes for all vector dimensions
      await this.createVectorIndexes();

      logger.info('[PgAdapter] Vector support initialized successfully');
    } catch (error) {
      logger.warn('[PgAdapter] Failed to initialize vector support:', error);
      throw new Error(
        `Vector initialization failed: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  /**
   * Create optimized HNSW indexes for vector columns
   */
  private async createVectorIndexes(): Promise<void> {
    const dimensions = [384, 512, 768, 1024, 1536, 3072];

    for (const dim of dimensions) {
      try {
        // Create HNSW index for cosine similarity (most common for embeddings)
        const indexName = `memories_dim_${dim}_hnsw_cosine_idx`;
        const createIndexSQL = `
          CREATE INDEX IF NOT EXISTS ${indexName} 
          ON memories USING hnsw (dim_${dim} vector_cosine_ops)
          WITH (m = ${this.config.hnswM}, ef_construction = ${this.config.hnswEfConstruction})
        `;

        await this.manager.query(createIndexSQL);

        // Create additional index for L2 distance
        const l2IndexName = `memories_dim_${dim}_hnsw_l2_idx`;
        const createL2IndexSQL = `
          CREATE INDEX IF NOT EXISTS ${l2IndexName} 
          ON memories USING hnsw (dim_${dim} vector_l2_ops)
          WITH (m = ${this.config.hnswM}, ef_construction = ${this.config.hnswEfConstruction})
        `;

        await this.manager.query(createL2IndexSQL);

        logger.debug(`[PgAdapter] Created HNSW indexes for ${dim} dimensions`);
      } catch (error) {
        // Log but don't fail if index creation fails (might already exist)
        logger.debug(
          `[PgAdapter] Could not create index for ${dim} dimensions:`,
          (error as Error).message
        );
      }
    }
  }

  /**
   * Enhanced vector similarity search using pgvector
   */
  async searchMemoriesByEmbedding(
    embedding: number[],
    params: {
      match_threshold?: number;
      count?: number;
      roomId?: UUID;
      worldId?: UUID;
      entityId?: UUID;
      unique?: boolean;
      tableName: string;
    }
  ): Promise<Memory[]> {
    if (!this.config.enableVectors) {
      throw new Error('Vector search is disabled in this adapter configuration');
    }

    const {
      roomId,
      match_threshold = 0.7,
      count = 10,
      tableName = 'memories',
      unique,
      worldId,
      entityId,
    } = params;

    // Determine the appropriate vector column based on embedding dimensions
    const embeddingDim = embedding.length;
    const columnName = DIMENSION_MAP[embeddingDim as keyof typeof DIMENSION_MAP];

    if (!columnName) {
      throw new Error(`Unsupported embedding dimension: ${embeddingDim}`);
    }

    try {
      // Convert embedding to pgvector format
      const vectorString = pgvector.toSql(embedding);

      // Use cosine similarity with HNSW index optimization
      const searchQuery = `
        SELECT 
          id,
          entity_id,
          agent_id,
          content,
          room_id,
          world_id,
          unique_flag,
          created_at,
          ${columnName} as embedding,
          1 - (${columnName} <=> $1::vector) as similarity
        FROM ${tableName}
        WHERE 
          room_id = $2
          AND ${columnName} IS NOT NULL
          AND 1 - (${columnName} <=> $1::vector) >= $3
        ORDER BY ${columnName} <=> $1::vector ASC
        LIMIT $4
      `;

      const results = await this.manager.query(searchQuery, [
        vectorString,
        roomId,
        match_threshold,
        count,
      ]);

      // Convert results to Memory objects
      return results.map((row: any) => ({
        id: row.id,
        entityId: row.entity_id,
        agentId: row.agent_id,
        content: typeof row.content === 'string' ? JSON.parse(row.content) : row.content,
        roomId: row.room_id,
        worldId: row.world_id,
        unique: row.unique_flag,
        createdAt: row.created_at,
        embedding: row.embedding,
        similarity: row.similarity,
      }));
    } catch (error) {
      logger.error('[PgAdapter] Vector search failed:', error);
      throw new Error(
        `Vector search failed: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  /**
   * Bulk insert memories with vector optimization
   */
  async createMemoryBatch(memories: Memory[], tableName: string = 'memories'): Promise<UUID[]> {
    if (memories.length === 0) {
      return [];
    }

    try {
      return await this.db.transaction(async (tx: any) => {
        const insertedIds: UUID[] = [];

        // Process in batches for optimal performance
        const batchSize = 100;
        for (let i = 0; i < memories.length; i += batchSize) {
          const batch = memories.slice(i, i + batchSize);

          const batchValues = batch.map((memory) => {
            const memoryData = {
              id: memory.id,
              entityId: memory.entityId,
              agentId: memory.agentId,
              content: memory.content,
              roomId: memory.roomId,
              worldId: memory.worldId,
              unique: memory.unique,
              createdAt: memory.createdAt || Date.now(),
            };

            // Add vector columns if embeddings are present
            if (memory.embedding && this.config.enableVectors) {
              const dim = memory.embedding.length;
              const columnName = DIMENSION_MAP[dim as keyof typeof DIMENSION_MAP];
              if (columnName) {
                (memoryData as any)[columnName] = pgvector.toSql(memory.embedding);
              }
            }

            return memoryData;
          });

          const result = await tx
            .insert(schema.memoryTable)
            .values(batchValues)
            .returning({ id: schema.memoryTable.id });
          insertedIds.push(...result.map((r) => r.id));
        }

        return insertedIds;
      });
    } catch (error) {
      logger.error('[PgAdapter] Bulk memory creation failed:', error);
      throw new Error(`Bulk memory creation failed: ${(error as Error).message}`);
    }
  }

  /**
   * Executes operations with database connection and retry logic
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
   * Executes operations with retry logic
   */
  protected async withRetry<T>(operation: () => Promise<T>): Promise<T> {
    return await this.manager.withRetry(operation);
  }

  /**
   * Enhanced connection health check
   */
  async isReady(): Promise<boolean> {
    try {
      // Check if migrations are complete
      if (!this.migrationsComplete) {
        return false;
      }

      // Check if connection is healthy
      const isHealthy = await this.manager.testConnection();

      if (isHealthy && this.config.enableVectors) {
        // Verify pgvector extension is available
        try {
          await this.manager.query("SELECT extname FROM pg_extension WHERE extname = 'vector'");
        } catch (error) {
          logger.warn('[PgAdapter] pgvector extension not available');
          return false;
        }
      }

      return isHealthy;
    } catch (error) {
      logger.debug('[PgAdapter] isReady check failed:', error);
      return false;
    }
  }

  /**
   * Get adapter capabilities and health status
   */
  async getCapabilities(): Promise<{
    isReady: boolean;
    tables: string[];
    hasVector: boolean;
    vectorDimensions: number[];
  }> {
    try {
      const isReady = await this.isReady();
      const tables = await this.listTables();

      // Check which vector dimensions are supported
      const vectorDimensions: number[] = [];
      if (this.config.enableVectors) {
        const dimensionChecks = [384, 512, 768, 1024, 1536, 3072];
        for (const dim of dimensionChecks) {
          try {
            const columnName = DIMENSION_MAP[dim as keyof typeof DIMENSION_MAP];
            if (columnName) {
              const result = await this.manager.query(
                `SELECT column_name FROM information_schema.columns 
                 WHERE table_name = 'memories' AND column_name = '${columnName}'`
              );
              if (result.length > 0) {
                vectorDimensions.push(dim);
              }
            }
          } catch (error) {
            // Column doesn't exist, skip
          }
        }
      }

      return {
        isReady,
        tables,
        hasVector: (this.config.enableVectors ?? false) && vectorDimensions.length > 0,
        vectorDimensions,
      };
    } catch (error) {
      return {
        isReady: false,
        tables: [],
        hasVector: false,
        vectorDimensions: [],
      };
    }
  }

  /**
   * Close adapter and clean up connections
   */
  async close(): Promise<void> {
    await this.manager.close();
  }

  // Delegate all other methods to parent class
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
   * Migration interface compatibility
   */
  async migrate(): Promise<void> {
    await this.runMigrations();
  }

  /**
   * Get database connection
   */
  async getConnection() {
    return this.manager.getConnection();
  }

  /**
   * Raw query interface for advanced operations
   */
  async query(sqlQuery: string, params?: any[]): Promise<any[]> {
    return this.manager.query(sqlQuery, params);
  }

  /**
   * List all tables in the PostgreSQL database
   */
  protected async listTables(): Promise<string[]> {
    try {
      const result = await this.manager.query(
        "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'"
      );

      return result.map((row: any) => row.table_name);
    } catch (error) {
      logger.warn('Failed to list tables in PostgreSQL:', error);
      return [];
    }
  }
}
