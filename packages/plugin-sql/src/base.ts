import {
  ChannelType,
  DatabaseAdapter,
  logger,
  VECTOR_DIMS,
  type Agent,
  type Component,
  type Entity,
  type Log,
  type Memory,
  type MemoryMetadata,
  type Participant,
  type Relationship,
  type Room,
  type RoomMetadata,
  type Task,
  type TaskMetadata,
  type UUID,
  type World,
} from '@elizaos/core';
import { and, desc, eq, gte, inArray, lt, lte, or, sql } from 'drizzle-orm';
import { v4 } from 'uuid';
import { DIMENSION_MAP, type EmbeddingDimensionColumn } from './schema/embedding';

import {
  agentTable,
  channelParticipantsTable,
  channelTable,
  componentTable,
  embeddingTable,
  entityTable,
  logTable,
  memoryTable,
  messageServerTable,
  messageTable,
  participantTable,
  relationshipTable,
  roomTable,
  serverAgentsTable,
  tasksTable,
  worldTable,
} from './schema/index';
// Migration is handled by UnifiedMigrator in the adapters

// Define the metadata type inline since we can't import it
/**
 * Represents metadata information about memory.
 * @typedef {Object} MemoryMetadata
 * @property {string} type - The type of memory.
 * @property {string} [source] - The source of the memory.
 * @property {UUID} [sourceId] - The ID of the source.
 * @property {string} [scope] - The scope of the memory.
 * @property {number} [timestamp] - The timestamp of the memory.
 * @property {string[]} [tags] - The tags associated with the memory.
 * @property {UUID} [documentId] - The ID of the document associated with the memory.
 * @property {number} [position] - The position of the memory.
 */

/**
 * Abstract class representing a base Drizzle adapter for working with databases.
 * This adapter provides a comprehensive set of methods for interacting with a database
 * using Drizzle ORM. It implements the DatabaseAdapter interface and handles operations
 * for various entity types including agents, entities, components, memories, rooms,
 * participants, relationships, tasks, and more.
 *
 * The adapter includes built-in retry logic for database operations, embedding dimension
 * management, and transaction support. Concrete implementations must provide the
 * withDatabase method to execute operations against their specific database.
 */
export abstract class BaseDrizzleAdapter extends DatabaseAdapter {
  public abstract db: any;
  protected readonly maxRetries: number = 3;
  protected readonly baseDelay: number = 1000;
  protected readonly maxDelay: number = 10000;
  protected readonly jitterMax: number = 1000;
  protected embeddingDimension: EmbeddingDimensionColumn = DIMENSION_MAP[VECTOR_DIMS.SMALL];
  protected pluginSchemas?: Map<string, any>;
  protected _vectorSupportChecked: boolean = false;
  protected _hasVectorSupport: boolean = false;

  protected abstract withDatabase<T>(operation: () => Promise<T>): Promise<T>;
  public abstract init(): Promise<void>;
  public abstract close(): Promise<void>;

  /**
   * Check if this adapter is a PGLite adapter
   * Override in PGLite adapter to return true
   */
  protected isPGLiteAdapter(): boolean {
    return false;
  }

  /**
   * Helper method to map memory row data to Memory object
   */
  protected mapMemoryRow(row: any): Memory {
    const metadata = row.metadata || {};
    if (row.type && !metadata.type) {
      metadata.type = row.type;
    }

    return {
      id: row.id as UUID,
      createdAt: row.createdAt instanceof Date ? row.createdAt.getTime() : row.createdAt,
      content: typeof row.content === 'string' ? JSON.parse(row.content) : row.content,
      entityId: row.entityId as UUID,
      agentId: row.agentId as UUID,
      roomId: row.roomId as UUID,
      worldId: row.worldId as UUID | undefined,
      unique: row.unique,
      metadata: metadata as MemoryMetadata,
      embedding: row.embedding ? Array.from(row.embedding) : undefined,
      similarity: row.similarity,
    };
  }

  /**
   * Check if the adapter is ready for operations
   * Must be implemented by concrete adapters
   */
  public abstract isReady(): Promise<boolean>;

  /**
   * Wait for the adapter to become ready within a timeout
   */
  public async waitForReady(timeoutMs: number = 30000): Promise<void> {
    const startTime = Date.now();

    while (Date.now() - startTime < timeoutMs) {
      if (await this.isReady()) {
        return;
      }

      // Wait 100ms before checking again
      await new Promise((resolve) => setTimeout(resolve, 100));
    }

    throw new Error(`Adapter failed to become ready within ${timeoutMs}ms`);
  }

  /**
   * Get capabilities information about the adapter
   */
  public async getCapabilities(): Promise<{
    isReady: boolean;
    tables: string[];
    hasVector: boolean;
  }> {
    const isReady = await this.isReady();

    if (!isReady) {
      return {
        isReady: false,
        tables: [],
        hasVector: false,
      };
    }

    try {
      const tables = await this.listTables();
      const hasVector = await this.checkVectorSupport();

      return {
        isReady: true,
        tables,
        hasVector,
      };
    } catch (error) {
      logger.warn('Failed to get capabilities:', error);
      return {
        isReady: false,
        tables: [],
        hasVector: false,
      };
    }
  }

  /**
   * Check if a specific table exists
   */
  public async hasTable(tableName: string): Promise<boolean> {
    try {
      const isReady = await this.isReady();
      if (!isReady) {
        return false;
      }

      // Try to query the table with a safe query that returns no rows
      await this.withDatabase(async () => {
        return this.db.execute(sql.raw(`SELECT 1 FROM "${tableName}" WHERE 1=0`));
      });

      return true;
    } catch (error) {
      // If the query fails, the table likely doesn't exist
      return false;
    }
  }

  /**
   * List all tables in the database
   * Must be implemented by concrete adapters based on their database type
   */
  protected abstract listTables(): Promise<string[]>;

  /**
   * Check if vector extension is available
   */
  protected async checkVectorSupport(): Promise<boolean> {
    try {
      // Check if we already know vector support is not available (cached result)
      if (this._vectorSupportChecked) {
        return this._hasVectorSupport;
      }

      // For PGLite, check if vector extension is loaded
      if (this.isPGLiteAdapter()) {
        try {
          await this.db.execute(sql.raw("SELECT 1 FROM pg_extension WHERE extname = 'vector'"));
          this._vectorSupportChecked = true;
          this._hasVectorSupport = true;
          return true;
        } catch {
          this._vectorSupportChecked = true;
          this._hasVectorSupport = false;
          return false;
        }
      }

      // For PostgreSQL, try to create a temporary vector column to test support
      await this.withDatabase(async () => {
        return this.db.execute(
          sql.raw('CREATE TEMPORARY TABLE test_vector_support (id INT, vec vector(3))')
        );
      });

      await this.withDatabase(async () => {
        return this.db.execute(sql.raw('DROP TABLE test_vector_support'));
      });

      this._vectorSupportChecked = true;
      this._hasVectorSupport = true;
      return true;
    } catch (error) {
      this._vectorSupportChecked = true;
      this._hasVectorSupport = false;
      return false;
    }
  }

  /**
   * Ensure that the specified tables are ready for use
   * This method checks if tables exist and are properly initialized
   * @param tableNames Array of table names to check
   * @returns Promise that resolves when all tables are ready
   */
  protected async ensureTablesReady(tableNames: string[]): Promise<void> {
    for (const tableName of tableNames) {
      const ready = await this.hasTable(tableName);
      if (!ready) {
        logger.warn(`Table ${tableName} is not ready or does not exist`);
        // Don't throw an error, just log - tables might be created later in the transaction
      }
    }
  }

  /**
   * Initialize method that can be overridden by implementations
   */
  public async initialize(): Promise<void> {
    await this.init();
  }

  /**
   * Run migrations for a plugin's schema
   * This is called by the runtime during initialization
   * @param schema The schema object from the plugin
   * @param pluginName The name of the plugin
   */
  public async runPluginMigrations(schema: any, pluginName: string): Promise<void> {
    logger.info(`[BaseDrizzleAdapter] Running migrations for plugin: ${pluginName}`);

    try {
      // For now, log that plugins need to handle their own migrations
      // The UnifiedMigrator system will be enhanced to handle plugin schemas in the future
      logger.info(
        `[BaseDrizzleAdapter] Plugin ${pluginName} should create its tables during init()`
      );

      // Store the schema for future reference
      if (!this.pluginSchemas) {
        this.pluginSchemas = new Map();
      }
      this.pluginSchemas.set(pluginName, schema);
    } catch (error) {
      logger.error(
        `[BaseDrizzleAdapter] Failed to process schema for plugin ${pluginName}:`,
        error
      );
      // Don't throw - let the plugin handle its own table creation
    }
  }

  /**
   * Get the underlying database instance for testing purposes
   */
  public getDatabase(): any {
    if (!this.db) {
      throw new Error('Database not initialized. Make sure to call init() first.');
    }
    return this.db;
  }

  protected agentId: UUID;

  /**
   * Constructor for creating a new instance of Agent with the specified agentId.
   *
   * @param {UUID} agentId - The unique identifier for the agent.
   */
  constructor(agentId: UUID) {
    super();
    this.agentId = agentId;
  }

  /**
   * Executes the given operation with retry logic.
   * @template T
   * @param {() => Promise<T>} operation - The operation to be executed.
   * @returns {Promise<T>} A promise that resolves with the result of the operation.
   */
  protected async withRetry<T>(operation: () => Promise<T>): Promise<T> {
    let lastError: Error = new Error('Unknown error');

    for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error as Error;

        if (attempt < this.maxRetries) {
          const backoffDelay = Math.min(this.baseDelay * 2 ** (attempt - 1), this.maxDelay);

          const jitter = Math.random() * this.jitterMax;
          const delay = backoffDelay + jitter;

          logger.warn(`Database operation failed (attempt ${attempt}/${this.maxRetries}):`, {
            error: error instanceof Error ? error.message : String(error),
            nextRetryIn: `${(delay / 1000).toFixed(1)}s`,
          });

          await new Promise((resolve) => setTimeout(resolve, delay));
        } else {
          logger.error('Max retry attempts reached:', {
            error: error instanceof Error ? error.message : String(error),
            totalAttempts: attempt,
          });
          throw error instanceof Error ? error : new Error(String(error));
        }
      }
    }

    throw lastError;
  }

  /**
   * Check if an error is a constraint violation (duplicate key, foreign key, etc.)
   * This provides better error handling than throwing on constraint violations
   */
  protected isConstraintViolationError(error: any): boolean {
    if (!error) return false;

    const errorMessage = error.message || String(error);
    const errorCode = error.code || error.constraint;

    // PostgreSQL constraint violation error codes
    const pgConstraintCodes = [
      '23505', // unique_violation
      '23503', // foreign_key_violation
      '23502', // not_null_violation
      '23514', // check_violation
      '23P01', // exclusion_violation
    ];

    // Check for PostgreSQL error codes
    if (errorCode && pgConstraintCodes.includes(errorCode)) {
      return true;
    }

    // Check for common constraint violation messages
    const constraintMessages = [
      'duplicate key value violates unique constraint',
      'violates foreign key constraint',
      'violates not-null constraint',
      'violates check constraint',
      'UNIQUE constraint failed',
      'FOREIGN KEY constraint failed',
      'NOT NULL constraint failed',
      'CHECK constraint failed',
    ];

    return constraintMessages.some((msg) => errorMessage.toLowerCase().includes(msg.toLowerCase()));
  }

  /**
   * Check if an error is specifically a schema mismatch (missing column, etc.)
   */
  protected isSchemaMismatchError(error: any): boolean {
    if (!error) return false;

    const errorMessage = error.message || String(error);
    const errorCode = error.code;

    // Check for PostgreSQL "column does not exist" errors
    if (errorCode === '42703') return true;

    // Check for common schema mismatch messages
    const schemaMismatchMessages = [
      'column',
      'does not exist',
      'relation',
      'does not exist',
      'table',
      'does not exist',
      'unknown column',
      'no such column',
    ];

    return schemaMismatchMessages.some((msg) =>
      errorMessage.toLowerCase().includes(msg.toLowerCase())
    );
  }

  /**
   * Check if vector/embeddings functionality is available
   */
  private async isEmbeddingSupported(): Promise<boolean> {
    try {
      // Try to check if embeddings table exists
      await this.db.execute(sql`SELECT 1 FROM embeddings LIMIT 1`);
      return true;
    } catch (error) {
      // If embeddings table doesn't exist or can't be queried, embeddings are not supported
      if (
        error instanceof Error &&
        (error.message.includes('relation "embeddings" does not exist') ||
          error.message.includes('no such table: embeddings'))
      ) {
        return false;
      }
      throw error;
    }
  }

  /**
   * Asynchronously ensures that the given embedding dimension is valid for the agent.
   *
   * @param {number} dimension - The dimension to ensure for the embedding.
   * @returns {Promise<void>} - Resolves once the embedding dimension is ensured.
   */
  async ensureEmbeddingDimension(dimension: number) {
    return this.withDatabase(async () => {
      // Check if embeddings are supported first
      const embeddingSupported = await this.isEmbeddingSupported();

      if (!embeddingSupported) {
        logger.warn(
          'Embeddings not supported in this database configuration, skipping dimension check'
        );
        // Still set the dimension for potential future use
        const dimensionKey = Object.keys(VECTOR_DIMS).find(
          (key) => VECTOR_DIMS[key as keyof typeof VECTOR_DIMS] === dimension
        );

        if (!dimensionKey) {
          throw new Error(`Unsupported embedding dimension: ${dimension}`);
        }

        this.embeddingDimension = DIMENSION_MAP[dimension as keyof typeof DIMENSION_MAP];
        logger.debug('Set embedding dimension (early return):', {
          dimension,
          embeddingDimension: this.embeddingDimension,
        });
        return;
      }

      try {
        // For PGLite, skip the Drizzle join query due to UUID type mismatches
        if (this.isPGLiteAdapter()) {
          logger.debug('Skipping embedding dimension check for PGLite (type compatibility)');
        } else {
          const existingMemory = await this.db
            .select()
            .from(memoryTable)
            .innerJoin(embeddingTable, eq(embeddingTable.memoryId, memoryTable.id))
            .where(eq(memoryTable.agentId, this.agentId))
            .limit(1);

          if (existingMemory.length > 0) {
            const usedDimension = Object.entries(DIMENSION_MAP).find(
              ([_, colName]) => (existingMemory[0] as any).embeddings[colName] !== null
            );
            // We don't actually need to use usedDimension for now, but it's good to know it's there.
          }
        }
      } catch (error) {
        // Handle case where embeddings table doesn't exist yet or type mismatches
        if (
          error instanceof Error &&
          (error.message.includes('relation "embeddings" does not exist') ||
            error.message.includes('no such table: embeddings') ||
            error.message.includes('operator does not exist: uuid = text'))
        ) {
          logger.warn(
            'Embeddings table not yet created or type mismatch, proceeding with dimension setup'
          );
        } else {
          throw error;
        }
      }

      // Map the dimension to the appropriate column name
      const dimensionKey = Object.keys(VECTOR_DIMS).find(
        (key) => VECTOR_DIMS[key as keyof typeof VECTOR_DIMS] === dimension
      );

      if (!dimensionKey) {
        throw new Error(`Unsupported embedding dimension: ${dimension}`);
      }

      this.embeddingDimension = DIMENSION_MAP[dimension as keyof typeof DIMENSION_MAP];
      logger.debug('Set embedding dimension (normal path):', {
        dimension,
        embeddingDimension: this.embeddingDimension,
      });
    });
  }

  /**
   * Asynchronously retrieves an agent by their ID from the database.
   * @param {UUID} agentId - The ID of the agent to retrieve.
   * @returns {Promise<Agent | null>} A promise that resolves to the retrieved agent or null if not found.
   */
  async getAgent(agentId: UUID): Promise<Agent | null> {
    return this.withDatabase(async () => {
      try {
        // Use raw SQL to avoid Drizzle schema loading issues
        const result = await this.db.execute(sql`
          SELECT * FROM agents WHERE id = ${agentId} LIMIT 1
        `);

        // Handle different result formats from different database adapters
        const rows = Array.isArray(result) ? result : result.rows || [];

        if (rows.length === 0) return null;

        const row = rows[0];

        // Parse JSON fields
        const settings =
          typeof row.settings === 'string' ? JSON.parse(row.settings) : row.settings || {};
        const plugins =
          typeof row.plugins === 'string' ? JSON.parse(row.plugins) : row.plugins || [];
        const topics = typeof row.topics === 'string' ? JSON.parse(row.topics) : row.topics || [];
        const knowledge =
          typeof row.knowledge === 'string' ? JSON.parse(row.knowledge) : row.knowledge || [];
        const messageExamples =
          typeof row.message_examples === 'string'
            ? JSON.parse(row.message_examples)
            : row.message_examples || [];
        const postExamples =
          typeof row.post_examples === 'string'
            ? JSON.parse(row.post_examples)
            : row.post_examples || [];
        const style = typeof row.style === 'string' ? JSON.parse(row.style) : row.style || {};

        return {
          id: row.id as UUID,
          name: row.name,
          username: row.username || '',
          bio: row.bio || '',
          system: row.system || undefined,
          enabled: row.enabled !== undefined ? row.enabled : true,
          status: row.status,
          settings,
          plugins,
          topics,
          knowledge,
          messageExamples,
          postExamples,
          style,
          createdAt:
            row.created_at instanceof Date
              ? row.created_at.getTime()
              : new Date(row.created_at).getTime(),
          updatedAt:
            row.updated_at instanceof Date
              ? row.updated_at.getTime()
              : new Date(row.updated_at).getTime(),
        };
      } catch (error) {
        // Handle case where agents table doesn't exist yet (during initialization)
        if (
          error instanceof Error &&
          (error.message.includes('relation "agents" does not exist') ||
            error.message.includes('no such table: agents') ||
            error.message.includes("doesn't exist") ||
            (error.message.includes('Failed query') && error.message.includes('from "agents"')))
        ) {
          logger.warn('Agents table not yet created, returning null for getAgent');
          return null;
        }
        throw error;
      }
    });
  }

  /**
   * Asynchronously retrieves a list of agents from the database.
   *
   * @returns {Promise<Partial<Agent>[]>} A Promise that resolves to an array of Agent objects.
   */
  async getAgents(): Promise<Partial<Agent>[]> {
    return this.withDatabase(async () => {
      try {
        const rows = await this.db
          .select({
            id: agentTable.id,
            name: agentTable.name,
            bio: agentTable.bio,
          })
          .from(agentTable);
        return rows.map((row) => ({
          ...row,
          id: row.id as UUID,
          bio: row.bio === null ? '' : row.bio,
        }));
      } catch (error) {
        // Handle case where agents table doesn't exist yet (during initialization)
        const errorMessage = error instanceof Error ? error.message : String(error);
        if (
          errorMessage.includes('relation "agents" does not exist') ||
          errorMessage.includes('no such table: agents') ||
          errorMessage.includes("doesn't exist") ||
          errorMessage.includes('Failed query') ||
          errorMessage.includes('select "id", "name", "bio" from "agents"') ||
          errorMessage.includes('table "agents"') ||
          errorMessage.includes('agents table') ||
          errorMessage.includes('"agents"') ||
          errorMessage.includes('agents') ||
          errorMessage.toLowerCase().includes('does not exist') ||
          errorMessage.toLowerCase().includes('not exist')
        ) {
          logger.warn('Agents table not yet created during initialization, returning empty array', {
            error: errorMessage,
          });
          return [];
        }

        logger.error('Unexpected error in getAgents', {
          error: (error as Error).message,
          stack: (error as Error).stack,
        });
        throw error;
      }
    });
  }

  /**
   * Asynchronously creates a new agent record in the database.
   *
   * @param {Partial<Agent>} agent The agent object to be created.
   * @returns {Promise<boolean>} A promise that resolves to a boolean indicating the success of the operation.
   */
  async createAgent(agent: Agent | Partial<Agent>): Promise<boolean> {
    return this.withDatabase(async () => {
      try {
        if (!agent.id) {
          agent.id = v4() as UUID;
        }

        // Check for existing agent by ID first
        const existing = await this.getAgent(agent.id);
        if (existing) {
          logger.warn('Attempted to create an agent with a duplicate ID.', {
            id: agent.id,
            name: agent.name,
          });
          return false;
        }

        // Check for existing agent by name
        if (agent.name) {
          const agents = await this.getAgents();
          const nameExists = agents.some((existingAgent) => existingAgent.name === agent.name);
          if (nameExists) {
            logger.warn('Attempted to create an agent with a duplicate name.', {
              id: agent.id,
              name: agent.name,
            });
            return false;
          }
        }

        // Prepare agent data for insertion with proper defaults
        const agentData = {
          id: agent.id,
          name: agent.name || 'Unnamed Agent',
          bio: Array.isArray(agent.bio)
            ? agent.bio.join('\n')
            : agent.bio || 'A helpful AI assistant.',
          system: agent.system || 'You are a helpful assistant.',
          settings: agent.settings || {},
          enabled: agent.enabled !== undefined ? agent.enabled : true,
          status: agent.status || 'active',
          topics: agent.topics || [],
          knowledge: agent.knowledge || [],
          messageExamples: agent.messageExamples || [],
          postExamples: agent.postExamples || [],
          style: agent.style || {},
          plugins: agent.plugins || [],
        };

        logger.debug(`[BaseDrizzleAdapter] Creating agent using Drizzle:`, agentData.name);

        // Use Drizzle ORM for proper schema handling - timestamps are handled by defaults
        await this.db.insert(agentTable).values(agentData);

        logger.debug('Agent created successfully:', {
          agentId: agent.id,
        });
        return true;
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);

        // Check if it's a constraint violation (duplicate)
        if (this.isConstraintViolationError(error)) {
          logger.warn('Agent creation failed due to constraint violation (duplicate):', {
            agentId: agent.id,
            name: agent.name,
            errorCode: (error as any).code,
            constraint: (error as any).constraint,
          });
          return false;
        }

        // Check if it's a schema mismatch error
        if (this.isSchemaMismatchError(error)) {
          logger.error('Agent creation failed due to schema mismatch:', {
            agentId: agent.id,
            name: agent.name,
            error: errorMessage,
            errorCode: (error as any).code,
            suggestion:
              'The database schema may be out of sync. Try recreating the database or running migrations.',
          });
          throw new Error(
            `Schema mismatch detected when creating agent: ${agent.name}. ${errorMessage}`
          );
        }

        logger.error('Failed to create agent:', {
          agentId: agent.id,
          name: agent.name,
          error: errorMessage,
          errorDetails: {
            name: error instanceof Error ? error.name : 'UnknownError',
            code: (error as any).code,
            constraint: (error as any).constraint,
            stack: error instanceof Error ? error.stack : 'No stack trace',
            cause: error instanceof Error ? error.cause : undefined,
          },
        });
        throw new Error(`Failed to create agent: ${agent.name}. ${errorMessage}`);
      }
    });
  }

  /**
   * Capability-aware version of createAgent that returns fallback values when not ready
   * @param {Agent} agent - The agent to create
   * @returns {Promise<boolean>} - false when not ready, actual result when ready
   */
  async createAgentSafe(agent: Agent): Promise<boolean> {
    try {
      const isReady = await this.isReady();
      if (!isReady) {
        logger.debug('Adapter not ready, returning fallback value for createAgentSafe');
        return false; // Fallback value when not ready
      }

      return await this.createAgent(agent);
    } catch (error) {
      logger.warn('createAgentSafe failed, returning fallback value:', error);
      return false; // Fallback value on error
    }
  }

  /**
   * Updates an agent in the database with the provided agent ID and data.
   * @param {UUID} agentId - The unique identifier of the agent to update.
   * @param {Partial<Agent>} agent - The partial agent object containing the fields to update.
   * @returns {Promise<boolean>} - A boolean indicating if the agent was successfully updated.
   */
  async updateAgent(agentId: UUID, agent: Partial<Agent>): Promise<boolean> {
    return this.withDatabase(async () => {
      try {
        if (!agentId) {
          throw new Error('Agent ID is required for update');
        }

        await this.db.transaction(async (tx) => {
          // Handle settings update if present
          if (agent?.settings) {
            agent.settings = await this.mergeAgentSettings(tx, agentId, agent.settings);
          }

          // Convert numeric timestamps to Date objects for database storage
          // The Agent interface uses numbers, but the database schema expects Date objects
          const updateData: any = { ...agent };
          if (updateData.createdAt) {
            if (typeof updateData.createdAt === 'number') {
              updateData.createdAt = new Date(updateData.createdAt);
            } else {
              delete updateData.createdAt; // Don't update createdAt if it's not a valid timestamp
            }
          }
          if (updateData.updatedAt) {
            if (typeof updateData.updatedAt === 'number') {
              updateData.updatedAt = new Date(updateData.updatedAt);
            } else {
              updateData.updatedAt = new Date(); // Use current time if invalid
            }
          } else {
            updateData.updatedAt = new Date(); // Always set updatedAt to current time
          }

          await tx.update(agentTable).set(updateData).where(eq(agentTable.id, agentId));
        });

        logger.debug('Agent updated successfully:', {
          agentId,
        });
        return true;
      } catch (error) {
        logger.error('Error updating agent:', {
          error: error instanceof Error ? error.message : String(error),
          agentId,
          agent,
        });
        return false;
      }
    });
  }

  /**
   * Merges updated agent settings with existing settings in the database,
   * with special handling for nested objects like secrets.
   * @param tx - The database transaction
   * @param agentId - The ID of the agent
   * @param updatedSettings - The settings object with updates
   * @returns The merged settings object
   * @private
   */
  private async mergeAgentSettings(tx: any, agentId: UUID, updatedSettings: any): Promise<any> {
    // First get the current agent data
    const currentAgent = await tx
      .select({ settings: agentTable.settings })
      .from(agentTable)
      .where(eq(agentTable.id, agentId))
      .limit(1);

    const currentSettings =
      currentAgent.length > 0 && currentAgent[0].settings ? currentAgent[0].settings : {};

    const deepMerge = (target: any, source: any): any => {
      // If source is explicitly null, it means the intention is to set this entire branch to null (or delete if top-level handled by caller).
      // For recursive calls, if a sub-object in source is null, it effectively means "remove this sub-object from target".
      // However, our primary deletion signal is a *property value* being null within an object.
      if (source === null) {
        // If the entire source for a given key is null, we treat it as "delete this key from target"
        // by returning undefined, which the caller can use to delete the key.
        return undefined;
      }

      // If source is an array or a primitive, it replaces the target value.
      if (Array.isArray(source) || typeof source !== 'object') {
        return source;
      }

      // Initialize output. If target is not an object, start with an empty one to merge source into.
      const output =
        typeof target === 'object' && target !== null && !Array.isArray(target)
          ? { ...target }
          : {};

      let isEmpty = true; // Flag to track if the resulting object is empty
      for (const key of Object.keys(source)) {
        // Iterate over source keys
        const sourceValue = source[key];

        if (sourceValue === null) {
          // If a value in source is null, delete the corresponding key from output.
          delete output[key];
        } else if (typeof sourceValue === 'object' && !Array.isArray(sourceValue)) {
          // If value is an object, recurse.
          const nestedMergeResult = deepMerge(output[key], sourceValue);
          if (nestedMergeResult === undefined) {
            // If recursive merge resulted in undefined (meaning the nested object should be deleted)
            delete output[key];
          } else {
            output[key] = nestedMergeResult;
            isEmpty = false; // The object is not empty if it has a nested object
          }
        } else {
          // Primitive or array value from source, assign it.
          output[key] = sourceValue;
          isEmpty = false; // The object is not empty
        }
      }

      // After processing all keys from source, check if output became empty.
      // An object is empty if all its keys were deleted or resulted in undefined.
      // This is a more direct check than iterating 'output' after building it.
      if (Object.keys(output).length === 0) {
        // If the source itself was not an explicitly empty object,
        // and the merge resulted in an empty object, signal deletion.
        if (!(typeof source === 'object' && source !== null && Object.keys(source).length === 0)) {
          return undefined; // Signal to delete this (parent) key if it became empty.
        }
      }

      return output;
    }; // End of deepMerge

    const finalSettings = deepMerge(currentSettings, updatedSettings);
    // If the entire settings object becomes undefined (e.g. all keys removed),
    // return an empty object instead of undefined/null to keep the settings field present.
    return finalSettings === undefined ? {} : finalSettings;
  }

  /**
   * Asynchronously deletes an agent with the specified UUID and all related entries.
   *
   * @param {UUID} agentId - The UUID of the agent to be deleted.
   * @returns {Promise<boolean>} - A boolean indicating if the deletion was successful.
   */
  async deleteAgent(agentId: UUID): Promise<boolean> {
    logger.debug(`[DB] Deleting agent with ID: ${agentId}`);

    return this.withDatabase(async () => {
      try {
        // Ensure required tables are ready before proceeding
        await this.ensureTablesReady(['agents', 'cache', 'memories', 'entities', 'rooms']);

        // Use raw SQL to avoid Drizzle schema loading issues
        await this.db.transaction(async (tx) => {
          // Helper function to safely delete from a table
          const safeDelete = async (tableName: string, condition: string) => {
            try {
              await tx.execute(sql.raw(`DELETE FROM ${tableName} WHERE ${condition}`));
              logger.debug(`[DB] Successfully deleted from ${tableName} for agent ${agentId}`);
            } catch (error) {
              const errorMessage = error instanceof Error ? error.message : String(error);
              if (
                errorMessage.includes('does not exist') ||
                errorMessage.includes('no such table')
              ) {
                logger.debug(`[DB] Table ${tableName} does not exist, skipping deletion`);
              } else {
                logger.warn(`[DB] Error deleting from ${tableName}:`, errorMessage);
                // Don't throw for non-critical tables to allow cascade delete to continue
              }
            }
          };

          // Delete in dependency order (child tables first)

          // Delete cache entries - cache uses key/value, not agent_id
          try {
            await tx.execute(sql`DELETE FROM cache WHERE agent_id = ${agentId}`);
          } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            if (
              !errorMessage.includes('does not exist') &&
              !errorMessage.includes('no such table')
            ) {
              logger.debug(`[DB] Cache table might not have agent_id column or doesn't exist`);
            }
          }

          // Delete embeddings for memories first (if table exists)
          try {
            await tx.execute(sql`
              DELETE FROM embeddings 
              WHERE memory_id IN (
                SELECT id FROM memories WHERE agent_id = ${agentId}
              )
            `);
          } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            if (
              !errorMessage.includes('does not exist') &&
              !errorMessage.includes('no such table')
            ) {
              logger.warn(`[DB] Error deleting embeddings:`, errorMessage);
            }
          }

          // Delete tasks that belong to rooms/worlds owned by this agent
          try {
            await tx.execute(sql`
              DELETE FROM tasks 
              WHERE room_id IN (SELECT id FROM rooms WHERE agent_id = ${agentId})
                 OR world_id IN (SELECT id FROM worlds WHERE agent_id = ${agentId})
            `);
          } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            if (
              !errorMessage.includes('does not exist') &&
              !errorMessage.includes('no such table')
            ) {
              logger.warn(`[DB] Error deleting tasks:`, errorMessage);
            }
          }

          await safeDelete('memories', `agent_id = '${agentId}'`);
          await safeDelete('relationships', `agent_id = '${agentId}'`);
          await safeDelete('participants', `agent_id = '${agentId}'`);
          await safeDelete('components', `agent_id = '${agentId}'`);
          await safeDelete('entities', `agent_id = '${agentId}'`);
          await safeDelete('rooms', `agent_id = '${agentId}'`);
          await safeDelete('worlds', `agent_id = '${agentId}'`);

          // Finally, delete the agent itself and check if it existed
          const result = await tx.execute(sql`
            DELETE FROM agents WHERE id = ${agentId} RETURNING id
          `);

          // Handle different result formats from different database adapters
          const rows = Array.isArray(result) ? result : result.rows || [];
          if (rows.length === 0) {
            logger.warn(`[DB] Agent ${agentId} not found`);
            throw new Error('Agent not found');
          }
        });

        logger.success(`[DB] Agent ${agentId} and all related data successfully deleted`);
        return true;
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        if (errorMessage === 'Agent not found') {
          return false;
        }
        logger.error(`[DB] Failed to delete agent ${agentId}:`, error);
        if (error instanceof Error) {
          logger.error(`[DB] Error details: ${error.name} - ${error.message}`);
          logger.error(`[DB] Stack trace: ${error.stack}`);
        }
        throw error;
      }
    });
  }

  /**
   * Count all agents in the database
   * Used primarily for maintenance and cleanup operations
   */
  /**
   * Asynchronously counts the number of agents in the database.
   * @returns {Promise<number>} A Promise that resolves to the number of agents in the database.
   */
  async countAgents(): Promise<number> {
    return this.withDatabase(async () => {
      try {
        // Use raw SQL to avoid Drizzle schema loading issues
        const result = await this.db.execute(sql`SELECT COUNT(*) as count FROM agents`);

        // Handle different result formats from different database adapters
        const rows = Array.isArray(result) ? result : result.rows || [];

        if (rows.length === 0) return 0;

        const countValue = rows[0]?.count;

        // Handle BigInt values (PGLite may return BigInt for COUNT)
        if (typeof countValue === 'bigint') {
          return Number(countValue);
        }

        // Convert to number if it's a string (some drivers return strings)
        if (typeof countValue === 'string') {
          return parseInt(countValue, 10);
        }

        // If it's already a number, return it
        if (typeof countValue === 'number') {
          return countValue;
        }

        // Fallback to 0 if we get an unexpected type
        logger.warn('Unexpected count value type:', typeof countValue, countValue);
        return 0;
      } catch (error) {
        logger.error('Error counting agents:', {
          error: error instanceof Error ? error.message : String(error),
        });
        return 0;
      }
    });
  }

  /**
   * Clean up the agents table by removing all agents
   * This is used during server startup to ensure no orphaned agents exist
   * from previous crashes or improper shutdowns
   */
  async cleanupAgents(): Promise<void> {
    return this.withDatabase(async () => {
      try {
        // Use raw SQL to avoid Drizzle schema loading issues
        await this.db.execute(sql`DELETE FROM agents`);
        logger.success('Successfully cleaned up agent table');
      } catch (error) {
        logger.error('Error cleaning up agent table:', {
          error: error instanceof Error ? error.message : String(error),
        });
        throw error;
      }
    });
  }

  /**
   * Asynchronously retrieves entities by their IDs (core interface method).
   * This method is required by the core DatabaseAdapter interface.
   * @param {UUID[]} entityIds - The unique identifiers of the entities to retrieve.
   * @returns {Promise<Entity[] | null>} A Promise that resolves to the entities with their components if found, null otherwise.
   */
  async getEntitiesByIds(entityIds: UUID[]): Promise<Entity[] | null> {
    return this.withDatabase(async () => {
      try {
        if (entityIds.length === 0) return [];

        // Ensure entities table is ready before proceeding
        await this.ensureTablesReady(['entities']);

        // Use raw SQL to avoid Drizzle schema loading issues
        // For single entity queries, use a simple approach
        let result;
        if (entityIds.length === 1) {
          result = await this.db.execute(sql`
            SELECT 
              e.id,
              e.agent_id,
              e.names,
              e.metadata,
              c.id as component_id,
              c.entity_id as component_entity_id,
              c.agent_id as component_agent_id,
              c.room_id as component_room_id,
              c.world_id as component_world_id,
              c.source_entity_id as component_source_entity_id,
              c.type as component_type,
              c.created_at as component_created_at,
              c.data as component_data
            FROM entities e
            LEFT JOIN components c ON c.entity_id = e.id
            WHERE e.id = ${entityIds[0]}
          `);
        } else {
          // For multiple entities, use IN clause with proper parameter binding
          result = await this.db.execute(sql`
            SELECT 
              e.id,
              e.agent_id,
              e.names,
              e.metadata,
              c.id as component_id,
              c.entity_id as component_entity_id,
              c.agent_id as component_agent_id,
              c.room_id as component_room_id,
              c.world_id as component_world_id,
              c.source_entity_id as component_source_entity_id,
              c.type as component_type,
              c.created_at as component_created_at,
              c.data as component_data
            FROM entities e
            LEFT JOIN components c ON c.entity_id = e.id
            WHERE ${
              this.isPGLiteAdapter()
                ? sql`e.id IN (${sql.join(
                    entityIds.map((id) => sql`${id}`),
                    sql`, `
                  )})`
                : sql`e.id = ANY(${entityIds}::uuid[])`
            }
          `);
        }

        // Handle different result formats from different database adapters
        const rows = Array.isArray(result) ? result : result.rows || [];
        if (rows.length === 0) {
          return [];
        }

        // Process the raw results into Entity objects
        return this.processRawEntityResults(result);
      } catch (error) {
        // Handle case where entities table doesn't exist yet (during initialization)
        const errorMessage = error instanceof Error ? error.message : String(error);
        if (
          errorMessage.includes('relation "entities" does not exist') ||
          errorMessage.includes('no such table: entities') ||
          errorMessage.includes("doesn't exist") ||
          errorMessage.includes('Failed query') ||
          errorMessage.includes('"entities"') ||
          errorMessage.toLowerCase().includes('does not exist') ||
          errorMessage.toLowerCase().includes('not exist')
        ) {
          logger.debug(
            'Entities table not yet created during initialization, returning empty array',
            {
              error: errorMessage,
              entityIds,
            }
          );
          return [];
        }
        throw error;
      }
    });
  }

  private processEntityResults(result: any[]): Entity[] {
    if (result.length === 0) return [];

    // Group components by entity
    const entities: Record<UUID, Entity> = {};
    const entityComponents: Record<UUID, Entity['components']> = {};
    for (const e of result) {
      const key = e.entity.id;
      entities[key] = e.entity;
      if (entityComponents[key] === undefined) entityComponents[key] = [];
      if (e.components) {
        // Handle both single component and array of components
        const componentsArray = Array.isArray(e.components) ? e.components : [e.components];
        entityComponents[key] = [...entityComponents[key], ...componentsArray];
      }
    }
    for (const k of Object.keys(entityComponents)) {
      entities[k].components = entityComponents[k];
    }

    return Object.values(entities);
  }

  private processRawEntityResults(result: any): Entity[] {
    // Handle different result formats from different database adapters
    const rows = Array.isArray(result) ? result : result.rows || [];
    if (rows.length === 0) return [];

    // Group components by entity
    const entities: Record<UUID, Entity> = {};
    const entityComponents: Record<UUID, Component[]> = {};

    for (const row of rows) {
      const entityId = row.id;

      // Create entity if it doesn't exist
      if (!entities[entityId]) {
        entities[entityId] = {
          id: row.id,
          agentId: row.agent_id,
          names: typeof row.names === 'string' ? JSON.parse(row.names) : row.names || [],
          metadata:
            typeof row.metadata === 'string' ? JSON.parse(row.metadata) : row.metadata || {},
          components: [],
        };
        entityComponents[entityId] = [];
      }

      // Add component if it exists
      if (row.component_id) {
        const component: Component = {
          id: row.component_id,
          entityId: row.component_entity_id,
          agentId: row.component_agent_id,
          roomId: row.component_room_id,
          worldId: row.component_world_id,
          sourceEntityId: row.component_source_entity_id,
          type: row.component_type,
          createdAt: row.component_created_at,
          data:
            typeof row.component_data === 'string'
              ? JSON.parse(row.component_data)
              : row.component_data || {},
        };
        entityComponents[entityId].push(component);
      }
    }

    // Attach components to entities
    for (const entityId of Object.keys(entityComponents)) {
      entities[entityId].components = entityComponents[entityId];
    }

    return Object.values(entities);
  }

  /**
   * Asynchronously retrieves all entities for a given room, optionally including their components.
   * @param {UUID} roomId - The unique identifier of the room to get entities for
   * @param {boolean} [includeComponents] - Whether to include component data for each entity
   * @returns {Promise<Entity[]>} A Promise that resolves to an array of entities in the room
   */
  async getEntitiesForRoom(roomId: UUID, includeComponents?: boolean): Promise<Entity[]> {
    return this.withDatabase(async () => {
      const query = this.db
        .select({
          entity: entityTable,
          ...(includeComponents && { components: componentTable }),
        })
        .from(participantTable)
        .leftJoin(
          entityTable,
          and(eq(participantTable.entityId, entityTable.id), eq(entityTable.agentId, this.agentId))
        );

      if (includeComponents) {
        query.leftJoin(componentTable, eq(componentTable.entityId, entityTable.id));
      }

      const result = await query.where(eq(participantTable.roomId, roomId));

      // Group components by entity if includeComponents is true
      const entitiesByIdMap = new Map<UUID, Entity>();

      for (const row of result) {
        if (!row.entity) continue;

        const entityId = row.entity.id as UUID;
        if (!entitiesByIdMap.has(entityId)) {
          const entity: Entity = {
            ...row.entity,
            id: entityId,
            agentId: row.entity.agentId as UUID,
            metadata: row.entity.metadata as { [key: string]: any },
            components: includeComponents ? [] : undefined,
          };
          entitiesByIdMap.set(entityId, entity);
        }

        if (includeComponents && row.components) {
          const entity = entitiesByIdMap.get(entityId);
          if (entity) {
            if (!entity.components) {
              entity.components = [];
            }
            entity.components.push(row.components);
          }
        }
      }

      return Array.from(entitiesByIdMap.values());
    });
  }

  /**
   * Asynchronously creates new entities in the database.
   * @param {Entity[]} entities - The entity objects to be created.
   * @returns {Promise<boolean>} A Promise that resolves to a boolean indicating the success of the operation.
   */
  async createEntities(entities: Entity[]): Promise<boolean> {
    return this.withDatabase(async () => {
      try {
        // Tables should be ready if adapter.init() completed successfully

        return await this.db.transaction(async (tx) => {
          // Use raw SQL to avoid Drizzle schema loading issues
          let hasConstraintViolation = false;

          for (const entity of entities) {
            try {
              // Try to insert the entity
              const result = await tx.execute(sql`
                INSERT INTO entities (id, agent_id, names, metadata)
                VALUES (
                  ${entity.id || v4()},
                  ${entity.agentId},
                  ${JSON.stringify(entity.names || [])},
                  ${JSON.stringify(entity.metadata || {})}
                )
                ON CONFLICT (id) DO NOTHING
                RETURNING id
              `);

              // Check if the insert actually succeeded
              const resultRows = Array.isArray(result) ? result : result.rows || [];
              if (resultRows.length === 0) {
                // No rows returned means conflict occurred (entity already exists)
                logger.debug('Entity already exists:', {
                  entityId: entity.id,
                  entityNames: entity.names,
                });
                hasConstraintViolation = true;
              }
            } catch (insertError) {
              // Debug: Log the actual error structure
              logger.debug('Insert error details:', {
                error: insertError,
                message: insertError instanceof Error ? insertError.message : String(insertError),
                code: (insertError as any)?.code,
                constraint: (insertError as any)?.constraint,
                isConstraintViolation: this.isConstraintViolationError(insertError),
              });

              // Check for constraint violations at the individual insert level
              if (this.isConstraintViolationError(insertError)) {
                logger.debug('Constraint violation during entity creation:', {
                  error: insertError instanceof Error ? insertError.message : String(insertError),
                  entityId: entity.id,
                  entityNames: entity.names,
                });
                hasConstraintViolation = true;
              } else {
                // Re-throw non-constraint errors
                throw insertError;
              }
            }
          }

          if (hasConstraintViolation) {
            return false;
          }

          logger.debug(entities.length, 'Entities created successfully');
          return true;
        });
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);

        // Check for constraint violations (duplicate key, foreign key, etc.)
        if (this.isConstraintViolationError(error)) {
          logger.debug('Constraint violation during entity creation:', {
            error: errorMessage,
            entities: entities.map((e) => ({ id: e.id, names: e.names })),
          });
          return false;
        }

        // For other errors, these indicate actual database issues
        logger.error('Error creating entities:', {
          error: errorMessage,
          entities,
        });
        throw error;
      }
    });
  }

  /**
   * Asynchronously ensures an entity exists, creating it if it doesn't
   * @param entity The entity to ensure exists
   * @returns Promise resolving to boolean indicating success
   */
  protected async ensureEntityExists(entity: Entity): Promise<boolean> {
    if (!entity.id) {
      logger.error('Entity ID is required for ensureEntityExists');
      return false;
    }

    try {
      const existingEntities = await this.getEntitiesByIds([entity.id]);

      if (!existingEntities || !existingEntities.length) {
        return await this.createEntities([entity]);
      }

      return true;
    } catch (error) {
      logger.error('Error ensuring entity exists:', {
        error: error instanceof Error ? error.message : String(error),
        entityId: entity.id,
      });
      return false;
    }
  }

  /**
   * Asynchronously updates an entity in the database.
   * @param {Entity} entity - The entity object to be updated.
   * @returns {Promise<void>} A Promise that resolves when the entity is updated.
   */
  async updateEntity(entity: Entity): Promise<void> {
    if (!entity.id) {
      throw new Error('Entity ID is required for update');
    }
    return this.withDatabase(async () => {
      await this.db
        .update(entityTable)
        .set({
          agentId: entity.agentId,
          names: entity.names,
          metadata: entity.metadata,
        })
        .where(eq(entityTable.id, entity.id as string));
    });
  }

  /**
   * Asynchronously deletes an entity from the database based on the provided ID.
   * @param {UUID} entityId - The ID of the entity to delete.
   * @returns {Promise<void>} A Promise that resolves when the entity is deleted.
   */
  async deleteEntity(entityId: UUID): Promise<void> {
    return this.withDatabase(async () => {
      await this.db.transaction(async (tx) => {
        // Delete related components first
        await tx
          .delete(componentTable)
          .where(
            or(eq(componentTable.entityId, entityId), eq(componentTable.sourceEntityId, entityId))
          );

        // Delete the entity
        await tx.delete(entityTable).where(eq(entityTable.id, entityId));
      });
    });
  }

  /**
   * Asynchronously retrieves entities by their names and agentId.
   * @param {Object} params - The parameters for retrieving entities.
   * @param {string[]} params.names - The names to search for.
   * @param {UUID} params.agentId - The agent ID to filter by.
   * @returns {Promise<Entity[]>} A Promise that resolves to an array of entities.
   */
  async getEntitiesByNames(params: { names: string[]; agentId: UUID }): Promise<Entity[]> {
    return this.withDatabase(async () => {
      const { names, agentId } = params;

      // First get all entities for this agent
      const allEntities = await this.db
        .select({
          id: entityTable.id,
          agentId: entityTable.agentId,
          names: entityTable.names,
          metadata: entityTable.metadata,
        })
        .from(entityTable)
        .where(eq(entityTable.agentId, agentId));

      // Then filter in JavaScript to avoid PGLite array operation issues
      const matchingEntities = allEntities.filter((entity: any) => {
        const entityNames = entity.names || [];
        // Check if any of the requested names match any of the entity's names
        return names.some((name) => entityNames.includes(name));
      });

      return matchingEntities.map((row: any) => ({
        id: row.id as UUID,
        agentId: row.agentId as UUID,
        names: row.names || [],
        metadata: row.metadata || {},
      }));
    });
  }

  /**
   * Asynchronously searches for entities by name with fuzzy matching.
   * @param {Object} params - The parameters for searching entities.
   * @param {string} params.query - The search query.
   * @param {UUID} params.agentId - The agent ID to filter by.
   * @param {number} params.limit - The maximum number of results to return.
   * @returns {Promise<Entity[]>} A Promise that resolves to an array of entities.
   */
  async searchEntitiesByName(params: {
    query: string;
    agentId: UUID;
    limit?: number;
  }): Promise<Entity[]> {
    return this.withDatabase(async () => {
      const { query, agentId, limit = 10 } = params;

      // Get all entities for this agent
      const allEntities = await this.db
        .select({
          id: entityTable.id,
          agentId: entityTable.agentId,
          names: entityTable.names,
          metadata: entityTable.metadata,
        })
        .from(entityTable)
        .where(eq(entityTable.agentId, agentId));

      // If query is empty, return all entities up to limit
      if (!query || query.trim() === '') {
        return allEntities.slice(0, limit).map((row: any) => ({
          id: row.id as UUID,
          agentId: row.agentId as UUID,
          names: row.names || [],
          metadata: row.metadata || {},
        }));
      }

      // Otherwise, filter by names containing the query (case-insensitive)
      const queryLower = query.toLowerCase();
      const matchingEntities = allEntities.filter((entity: any) => {
        const entityNames = entity.names || [];
        // Check if any name contains the query string
        return entityNames.some((name: string) => name.toLowerCase().includes(queryLower));
      });

      // Apply limit
      const limitedResults = matchingEntities.slice(0, limit);

      return limitedResults.map((row: any) => ({
        id: row.id as UUID,
        agentId: row.agentId as UUID,
        names: row.names || [],
        metadata: row.metadata || {},
      }));
    });
  }

  async getComponent(
    entityId: UUID,
    type: string,
    worldId?: UUID,
    sourceEntityId?: UUID
  ): Promise<Component | null> {
    return this.withDatabase(async () => {
      const conditions = [eq(componentTable.entityId, entityId), eq(componentTable.type, type)];

      if (worldId) {
        conditions.push(eq(componentTable.worldId, worldId));
      }

      if (sourceEntityId) {
        conditions.push(eq(componentTable.sourceEntityId, sourceEntityId));
      }

      const result = await this.db
        .select()
        .from(componentTable)
        .where(and(...conditions));

      if (result.length === 0) return null;

      const component = result[0];

      return {
        ...component,
        id: component.id as UUID,
        entityId: component.entityId as UUID,
        agentId: component.agentId as UUID,
        roomId: component.roomId as UUID,
        worldId: (component.worldId ?? '') as UUID,
        sourceEntityId: (component.sourceEntityId ?? '') as UUID,
        data: component.data as { [key: string]: any },
        createdAt: component.createdAt.getTime(),
      };
    });
  }

  /**
   * Asynchronously retrieves all components for a given entity, optionally filtered by world and source entity.
   * @param {UUID} entityId - The unique identifier of the entity to retrieve components for
   * @param {UUID} [worldId] - Optional world ID to filter components by
   * @param {UUID} [sourceEntityId] - Optional source entity ID to filter components by
   * @returns {Promise<Component[]>} A Promise that resolves to an array of components
   */
  async getComponents(entityId: UUID, worldId?: UUID, sourceEntityId?: UUID): Promise<Component[]> {
    return this.withDatabase(async () => {
      const conditions = [eq(componentTable.entityId, entityId)];

      if (worldId) {
        conditions.push(eq(componentTable.worldId, worldId));
      }

      if (sourceEntityId) {
        conditions.push(eq(componentTable.sourceEntityId, sourceEntityId));
      }

      const result = await this.db
        .select({
          id: componentTable.id,
          entityId: componentTable.entityId,
          type: componentTable.type,
          data: componentTable.data,
          worldId: componentTable.worldId,
          agentId: componentTable.agentId,
          roomId: componentTable.roomId,
          sourceEntityId: componentTable.sourceEntityId,
          createdAt: componentTable.createdAt,
        })
        .from(componentTable)
        .where(and(...conditions));

      if (result.length === 0) return [];

      const components = result.map((component) => ({
        ...component,
        id: component.id as UUID,
        entityId: component.entityId as UUID,
        agentId: component.agentId as UUID,
        roomId: component.roomId as UUID,
        worldId: (component.worldId ?? '') as UUID,
        sourceEntityId: (component.sourceEntityId ?? '') as UUID,
        data: component.data as { [key: string]: any },
        createdAt: component.createdAt.getTime(),
      }));

      return components;
    });
  }

  /**
   * Asynchronously creates a new component in the database.
   * @param {Component} component - The component object to be created.
   * @returns {Promise<boolean>} A Promise that resolves to a boolean indicating the success of the operation.
   */
  async createComponent(component: Component): Promise<boolean> {
    return this.withDatabase(async () => {
      await this.db.insert(componentTable).values({
        ...component,
        createdAt: new Date(component.createdAt),
      });
      return true;
    });
  }

  /**
   * Asynchronously updates an existing component in the database.
   * @param {Component} component - The component object to be updated.
   * @returns {Promise<void>} A Promise that resolves when the component is updated.
   */
  async updateComponent(component: Component): Promise<void> {
    return this.withDatabase(async () => {
      await this.db
        .update(componentTable)
        .set({
          ...component,
          createdAt: new Date(component.createdAt),
        })
        .where(eq(componentTable.id, component.id));
    });
  }

  /**
   * Asynchronously deletes a component from the database.
   * @param {UUID} componentId - The unique identifier of the component to delete.
   * @returns {Promise<void>} A Promise that resolves when the component is deleted.
   */
  async deleteComponent(componentId: UUID): Promise<void> {
    return this.withDatabase(async () => {
      await this.db.delete(componentTable).where(eq(componentTable.id, componentId));
    });
  }

  /**
   * Asynchronously retrieves memories from the database based on the provided parameters.
   * @param {Object} params - The parameters for retrieving memories.
   * @param {UUID} params.roomId - The ID of the room to retrieve memories for.
   * @param {number} [params.count] - The maximum number of memories to retrieve.
   * @param {boolean} [params.unique] - Whether to retrieve unique memories only.
   * @param {string} [params.tableName] - The name of the table to retrieve memories from.
   * @param {number} [params.start] - The start date to retrieve memories from.
   * @param {number} [params.end] - The end date to retrieve memories from.
   * @returns {Promise<Memory[]>} A Promise that resolves to an array of memories.
   */
  async getMemories(params: {
    entityId?: UUID;
    agentId?: UUID;
    count?: number;
    unique?: boolean;
    tableName: string;
    start?: number;
    end?: number;
    roomId?: UUID;
    worldId?: UUID;
  }): Promise<Memory[]> {
    const { entityId, agentId, roomId, worldId, tableName, count, unique, start, end } = params;

    if (!tableName) throw new Error('tableName is required');

    return this.withDatabase(async () => {
      const conditions = [eq(memoryTable.type, tableName)];

      if (start) {
        conditions.push(gte(memoryTable.createdAt, new Date(start)));
      }

      if (entityId) {
        conditions.push(eq(memoryTable.entityId, entityId));
      }

      if (roomId) {
        conditions.push(eq(memoryTable.roomId, roomId));
      }

      // Add worldId condition
      if (worldId) {
        conditions.push(eq(memoryTable.worldId, worldId));
      }

      if (end) {
        conditions.push(lte(memoryTable.createdAt, new Date(end)));
      }

      if (unique) {
        conditions.push(eq(memoryTable.unique, true));
      }

      if (agentId) {
        conditions.push(eq(memoryTable.agentId, agentId));
      }

      // First get memories without embeddings
      const query = this.db
        .select()
        .from(memoryTable)
        .where(and(...conditions))
        .orderBy(desc(memoryTable.createdAt));

      const rows = params.count ? await query.limit(params.count) : await query;

      // Then get embeddings for the memories if they exist
      const memoryIds = rows.map((row) => row.id);
      let embeddingsMap = new Map<string, number[]>();

      if (memoryIds.length > 0) {
        try {
          const embeddingRows = await this.db
            .select({
              memoryId: embeddingTable.memoryId,
              embedding: embeddingTable[this.embeddingDimension],
            })
            .from(embeddingTable)
            .where(inArray(embeddingTable.memoryId, memoryIds));

          for (const embRow of embeddingRows) {
            if (embRow.embedding) {
              embeddingsMap.set(embRow.memoryId, Array.from(embRow.embedding));
            }
          }
        } catch (embeddingError) {
          logger.debug('Failed to retrieve embeddings for memories:', {
            error:
              embeddingError instanceof Error ? embeddingError.message : String(embeddingError),
          });
        }
      }

      return rows.map((row) => ({
        id: row.id as UUID,
        type: row.type,
        createdAt: row.createdAt.getTime(),
        content: typeof row.content === 'string' ? JSON.parse(row.content) : row.content,
        entityId: row.entityId as UUID,
        agentId: row.agentId as UUID,
        roomId: row.roomId as UUID,
        worldId: row.worldId as UUID,
        unique: row.unique,
        metadata: row.metadata as MemoryMetadata,
        embedding: embeddingsMap.get(row.id),
      }));
    });
  }

  /**
   * Asynchronously retrieves memories from the database based on the provided parameters.
   * @param {Object} params - The parameters for retrieving memories.
   * @param {UUID[]} params.roomIds - The IDs of the rooms to retrieve memories for.
   * @param {string} params.tableName - The name of the table to retrieve memories from.
   * @param {number} [params.limit] - The maximum number of memories to retrieve.
   * @returns {Promise<Memory[]>} A Promise that resolves to an array of memories.
   */
  async getMemoriesByRoomIds(params: {
    roomIds: UUID[];
    tableName: string;
    limit?: number;
  }): Promise<Memory[]> {
    return this.withDatabase(async () => {
      if (params.roomIds.length === 0) return [];

      const conditions = [
        eq(memoryTable.type, params.tableName),
        inArray(memoryTable.roomId, params.roomIds),
      ];

      conditions.push(eq(memoryTable.agentId, this.agentId));

      const query = this.db
        .select({
          id: memoryTable.id,
          type: memoryTable.type,
          createdAt: memoryTable.createdAt,
          content: memoryTable.content,
          entityId: memoryTable.entityId,
          agentId: memoryTable.agentId,
          roomId: memoryTable.roomId,
          unique: memoryTable.unique,
          metadata: memoryTable.metadata,
        })
        .from(memoryTable)
        .where(and(...conditions))
        .orderBy(desc(memoryTable.createdAt));

      const rows = params.limit ? await query.limit(params.limit) : await query;

      return rows.map((row) => ({
        id: row.id as UUID,
        createdAt: row.createdAt.getTime(),
        content: typeof row.content === 'string' ? JSON.parse(row.content) : row.content,
        entityId: row.entityId as UUID,
        agentId: row.agentId as UUID,
        roomId: row.roomId as UUID,
        unique: row.unique,
        metadata: row.metadata,
      })) as Memory[];
    });
  }

  /**
   * Asynchronously retrieves a memory by its unique identifier.
   * @param {UUID} id - The unique identifier of the memory to retrieve.
   * @returns {Promise<Memory | null>} A Promise that resolves to the memory if found, null otherwise.
   */
  async getMemoryById(id: UUID): Promise<Memory | null> {
    return this.withDatabase(async () => {
      try {
        // First, get the memory without embedding
        const memoryResult = await this.db
          .select()
          .from(memoryTable)
          .where(eq(memoryTable.id, id))
          .limit(1);

        if (memoryResult.length === 0) return null;

        const memoryRow = memoryResult[0];

        // Then, try to get the embedding separately if it exists
        let embedding: number[] | undefined;
        try {
          logger.debug('Getting embedding with dimension column:', this.embeddingDimension);

          // For PGLite, use raw SQL to retrieve embeddings
          if (this.isPGLiteAdapter()) {
            const rawResult = await this.db.execute(
              sql.raw(
                `SELECT ${this.embeddingDimension} FROM embeddings WHERE memory_id = '${id}' LIMIT 1`
              )
            );

            const rows = Array.isArray(rawResult) ? rawResult : rawResult.rows || [];
            logger.debug('PGLite embedding raw query result:', {
              rowCount: rows.length,
              hasData: rows.length > 0 && !!rows[0][this.embeddingDimension],
            });

            if (rows.length > 0 && rows[0][this.embeddingDimension]) {
              const rawEmbedding = rows[0][this.embeddingDimension];
              if (Array.isArray(rawEmbedding)) {
                embedding = rawEmbedding;
              } else if (typeof rawEmbedding === 'string') {
                try {
                  embedding = JSON.parse(rawEmbedding);
                } catch {
                  embedding = undefined;
                }
              }
            }
          } else {
            // For PostgreSQL, use Drizzle schema
            const embeddingResult = await this.db
              .select({
                embedding: embeddingTable[this.embeddingDimension],
              })
              .from(embeddingTable)
              .where(eq(embeddingTable.memoryId, id))
              .limit(1);

            logger.debug('Embedding query result:', {
              length: embeddingResult.length,
              hasEmbedding: embeddingResult.length > 0 && !!embeddingResult[0].embedding,
              embeddingDimension: this.embeddingDimension,
            });

            if (embeddingResult.length > 0 && embeddingResult[0].embedding) {
              embedding = Array.from(embeddingResult[0].embedding);
            }
          }
        } catch (embeddingError) {
          // Log but don't fail if embedding retrieval fails
          logger.debug('Failed to retrieve embedding for memory:', {
            memoryId: id,
            error:
              embeddingError instanceof Error ? embeddingError.message : String(embeddingError),
          });
        }

        const metadata = memoryRow.metadata || {};
        if (memoryRow.type && !metadata.type) {
          metadata.type = memoryRow.type;
        }

        return {
          id: memoryRow.id as UUID,
          createdAt: memoryRow.createdAt.getTime(),
          content:
            typeof memoryRow.content === 'string'
              ? JSON.parse(memoryRow.content)
              : memoryRow.content,
          entityId: memoryRow.entityId as UUID,
          agentId: memoryRow.agentId as UUID,
          roomId: memoryRow.roomId as UUID,
          worldId: memoryRow.worldId as UUID | undefined,
          unique: memoryRow.unique,
          metadata: metadata as MemoryMetadata,
          embedding: embedding,
        };
      } catch (error) {
        logger.error('Error in getMemoryById:', {
          id,
          error: error instanceof Error ? error.message : String(error),
        });
        return null;
      }
    });
  }

  /**
   * Asynchronously retrieves memories from the database based on the provided parameters.
   * @param {Object} params - The parameters for retrieving memories.
   * @param {UUID[]} params.memoryIds - The IDs of the memories to retrieve.
   * @param {string} [params.tableName] - The name of the table to retrieve memories from.
   * @returns {Promise<Memory[]>} A Promise that resolves to an array of memories.
   */
  async getMemoriesByIds(memoryIds: UUID[], tableName?: string): Promise<Memory[]> {
    return this.withDatabase(async () => {
      if (memoryIds.length === 0) return [];

      const conditions = [inArray(memoryTable.id, memoryIds)];

      if (tableName) {
        conditions.push(eq(memoryTable.type, tableName));
      }

      // First get memories without embeddings
      const rows = await this.db
        .select()
        .from(memoryTable)
        .where(and(...conditions))
        .orderBy(desc(memoryTable.createdAt));

      // Then get embeddings for the memories if they exist
      let embeddingsMap = new Map<string, number[]>();

      if (rows.length > 0) {
        try {
          // For PGLite, use raw SQL to retrieve embeddings
          if (this.isPGLiteAdapter()) {
            const memoryIdList = memoryIds.map((id) => `'${id}'`).join(',');
            const rawResult = await this.db.execute(
              sql.raw(
                `SELECT memory_id, ${this.embeddingDimension} FROM embeddings WHERE memory_id IN (${memoryIdList})`
              )
            );

            const embeddingRows = Array.isArray(rawResult) ? rawResult : rawResult.rows || [];

            for (const embRow of embeddingRows) {
              const rawEmbedding = embRow[this.embeddingDimension];
              if (rawEmbedding) {
                if (Array.isArray(rawEmbedding)) {
                  embeddingsMap.set(embRow.memory_id, rawEmbedding);
                } else if (typeof rawEmbedding === 'string') {
                  try {
                    embeddingsMap.set(embRow.memory_id, JSON.parse(rawEmbedding));
                  } catch {}
                }
              }
            }
          } else {
            // For PostgreSQL, use Drizzle schema
            const embeddingRows = await this.db
              .select({
                memoryId: embeddingTable.memoryId,
                embedding: embeddingTable[this.embeddingDimension],
              })
              .from(embeddingTable)
              .where(inArray(embeddingTable.memoryId, memoryIds));

            for (const embRow of embeddingRows) {
              if (embRow.embedding) {
                embeddingsMap.set(embRow.memoryId, Array.from(embRow.embedding));
              }
            }
          }
        } catch (embeddingError) {
          logger.debug('Failed to retrieve embeddings for memories:', {
            error:
              embeddingError instanceof Error ? embeddingError.message : String(embeddingError),
          });
        }
      }

      return rows.map((row) => {
        const metadata = row.metadata || {};
        if (row.type && !metadata.type) {
          metadata.type = row.type;
        }

        return {
          id: row.id as UUID,
          createdAt: row.createdAt.getTime(),
          content: typeof row.content === 'string' ? JSON.parse(row.content) : row.content,
          entityId: row.entityId as UUID,
          agentId: row.agentId as UUID,
          roomId: row.roomId as UUID,
          worldId: row.worldId as UUID | undefined,
          unique: row.unique,
          metadata: metadata as MemoryMetadata,
          embedding: embeddingsMap.get(row.id),
        };
      });
    });
  }

  /**
   * Asynchronously retrieves cached embeddings from the database based on the provided parameters.
   * @param {Object} opts - The parameters for retrieving cached embeddings.
   * @param {string} opts.query_table_name - The name of the table to retrieve embeddings from.
   * @param {number} opts.query_threshold - The threshold for the levenshtein distance.
   * @param {string} opts.query_input - The input string to search for.
   * @param {string} opts.query_field_name - The name of the field to retrieve embeddings from.
   * @param {string} opts.query_field_sub_name - The name of the sub-field to retrieve embeddings from.
   * @param {number} opts.query_match_count - The maximum number of matches to retrieve.
   * @returns {Promise<{ embedding: number[]; levenshtein_score: number }[]>} A Promise that resolves to an array of cached embeddings.
   */
  async getCachedEmbeddings(opts: {
    query_table_name: string;
    query_threshold: number;
    query_input: string;
    query_field_name: string;
    query_field_sub_name: string;
    query_match_count: number;
  }): Promise<{ embedding: number[]; levenshtein_score: number }[]> {
    return this.withDatabase(async () => {
      try {
        // Both PGLite and PostgreSQL support embeddings and levenshtein through extensions
        const results = await (this.db as any).execute(sql`
                    WITH content_text AS (
                        SELECT
                            m.id,
                            COALESCE(
                                m.content->>${opts.query_field_sub_name},
                                ''
                            ) as content_text
                        FROM memories m
                        WHERE m.type = ${opts.query_table_name}
                            AND m.content->>${opts.query_field_sub_name} IS NOT NULL
                    ),
                    embedded_text AS (
                        SELECT
                            ct.content_text,
                            COALESCE(
                                e.dim_384,
                                e.dim_512,
                                e.dim_768,
                                e.dim_1024,
                                e.dim_1536,
                                e.dim_3072
                            ) as embedding
                        FROM content_text ct
                        LEFT JOIN embeddings e ON e.memory_id = ct.id
                        WHERE e.memory_id IS NOT NULL
                    )
                    SELECT
                        embedding,
                        levenshtein(${opts.query_input}, content_text) as levenshtein_score
                    FROM embedded_text
                    WHERE levenshtein(${opts.query_input}, content_text) <= ${opts.query_threshold}
                    ORDER BY levenshtein_score
                    LIMIT ${opts.query_match_count}
                `);

        return results.rows
          .map((row) => ({
            embedding: Array.isArray(row.embedding)
              ? row.embedding
              : typeof row.embedding === 'string'
                ? JSON.parse(row.embedding)
                : [],
            levenshtein_score: Number(row.levenshtein_score),
          }))
          .filter((row) => Array.isArray(row.embedding));
      } catch (error) {
        logger.error('Error in getCachedEmbeddings:', {
          error: error instanceof Error ? error.message : String(error),
          tableName: opts.query_table_name,
          fieldName: opts.query_field_name,
        });
        if (
          error instanceof Error &&
          error.message === 'levenshtein argument exceeds maximum length of 255 characters'
        ) {
          return [];
        }
        // Return empty array for PGLite or other errors
        return [];
      }
    });
  }

  /**
   * Asynchronously logs an event in the database.
   * @param {Object} params - The parameters for logging an event.
   * @param {Object} params.body - The body of the event to log.
   * @param {UUID} params.entityId - The ID of the entity associated with the event.
   * @param {UUID} params.roomId - The ID of the room associated with the event.
   * @param {string} params.type - The type of the event to log.
   * @returns {Promise<void>} A Promise that resolves when the event is logged.
   */
  async log(params: {
    body: { [key: string]: unknown };
    entityId: UUID;
    roomId: UUID;
    type: string;
  }): Promise<void> {
    return this.withDatabase(async () => {
      try {
        // Sanitize JSON body to prevent Unicode escape sequence errors
        const sanitizedBody = this.sanitizeJsonObject(params.body);

        // Serialize to JSON string first for an additional layer of protection
        // This ensures any problematic characters are properly escaped during JSON serialization
        const jsonString = JSON.stringify(sanitizedBody);

        await this.db.transaction(async (tx) => {
          await tx.insert(logTable).values({
            id: v4() as UUID,
            body: sql`${jsonString}::jsonb`,
            entityId: params.entityId,
            roomId: params.roomId,
            type: params.type,
            agentId: this.agentId,
          });
        });
      } catch (error) {
        logger.error('Failed to create log entry:', {
          error: error instanceof Error ? error.message : String(error),
          type: params.type,
          roomId: params.roomId,
          entityId: params.entityId,
        });
        throw error;
      }
    });
  }

  /**
   * Sanitizes a JSON object by replacing problematic Unicode escape sequences
   * that could cause errors during JSON serialization/storage
   *
   * @param value - The value to sanitize
   * @returns The sanitized value
   */
  private sanitizeJsonObject(value: unknown, seen: WeakSet<object> = new WeakSet()): unknown {
    if (value === null || value === undefined) {
      return value;
    }

    if (typeof value === 'string') {
      // Handle multiple cases that can cause PostgreSQL/PgLite JSON parsing errors:
      // 1. Remove null bytes (U+0000) which are not allowed in PostgreSQL text fields
      // 2. Escape single backslashes that might be interpreted as escape sequences
      // 3. Fix broken Unicode escape sequences (\u not followed by 4 hex digits)
      return value
        .replace(/\u0000/g, '') // Remove null bytes
        .replace(/\\(?!["\\/bfnrtu])/g, '\\\\') // Escape single backslashes not part of valid escape sequences
        .replace(/\\u(?![0-9a-fA-F]{4})/g, '\\\\u'); // Fix malformed Unicode escape sequences
    }

    if (typeof value === 'object') {
      if (seen.has(value as object)) {
        return null;
      } else {
        seen.add(value as object);
      }

      if (Array.isArray(value)) {
        return value.map((item) => this.sanitizeJsonObject(item, seen));
      } else {
        const result: Record<string, unknown> = {};
        for (const [key, val] of Object.entries(value)) {
          // Also sanitize object keys
          const sanitizedKey =
            typeof key === 'string'
              ? key.replace(/\u0000/g, '').replace(/\\u(?![0-9a-fA-F]{4})/g, '\\\\u')
              : key;
          result[sanitizedKey] = this.sanitizeJsonObject(val, seen);
        }
        return result;
      }
    }

    return value;
  }

  /**
   * Asynchronously retrieves logs from the database based on the provided parameters.
   * @param {Object} params - The parameters for retrieving logs.
   * @param {UUID} params.entityId - The ID of the entity associated with the logs.
   * @param {UUID} [params.roomId] - The ID of the room associated with the logs.
   * @param {string} [params.type] - The type of the logs to retrieve.
   * @param {number} [params.count] - The maximum number of logs to retrieve.
   * @param {number} [params.offset] - The offset to retrieve logs from.
   * @returns {Promise<Log[]>} A Promise that resolves to an array of logs.
   */
  async getLogs(params: {
    entityId: UUID;
    roomId?: UUID;
    type?: string;
    count?: number;
    offset?: number;
  }): Promise<Log[]> {
    const { entityId, roomId, type, count, offset } = params;
    return this.withDatabase(async () => {
      const result = await this.db
        .select()
        .from(logTable)
        .where(
          and(
            eq(logTable.entityId, entityId),
            roomId ? eq(logTable.roomId, roomId) : undefined,
            type ? eq(logTable.type, type) : undefined
          )
        )
        .orderBy(desc(logTable.createdAt))
        .limit(count ?? 10)
        .offset(offset ?? 0);

      const logs = result.map((log) => ({
        ...log,
        id: log.id as UUID,
        entityId: log.entityId as UUID,
        roomId: log.roomId as UUID,
        body: log.body as { [key: string]: unknown },
        createdAt: new Date(log.createdAt),
      }));

      if (logs.length === 0) return [];

      return logs;
    });
  }

  /**
   * Asynchronously deletes a log from the database based on the provided parameters.
   * @param {UUID} logId - The ID of the log to delete.
   * @returns {Promise<void>} A Promise that resolves when the log is deleted.
   */
  async deleteLog(logId: UUID): Promise<void> {
    return this.withDatabase(async () => {
      await this.db.delete(logTable).where(eq(logTable.id, logId));
    });
  }

  /**
   * Asynchronously searches for memories in the database based on the provided parameters.
   * @param {Object} params - The parameters for searching for memories.
   * @param {string} params.tableName - The name of the table to search for memories in.
   * @param {number[]} params.embedding - The embedding to search for.
   * @param {number} [params.match_threshold] - The threshold for the cosine distance.
   * @param {number} [params.count] - The maximum number of memories to retrieve.
   * @param {boolean} [params.unique] - Whether to retrieve unique memories only.
   * @param {string} [params.query] - Optional query string for potential reranking.
   * @param {UUID} [params.roomId] - Optional room ID to filter by.
   * @param {UUID} [params.worldId] - Optional world ID to filter by.
   * @param {UUID} [params.entityId] - Optional entity ID to filter by.
   * @returns {Promise<Memory[]>} A Promise that resolves to an array of memories.
   */
  async searchMemories(params: {
    tableName: string;
    embedding: number[];
    match_threshold?: number;
    count?: number;
    unique?: boolean;
    query?: string;
    roomId?: UUID;
    worldId?: UUID;
    entityId?: UUID;
  }): Promise<Memory[]> {
    return await this.searchMemoriesByEmbedding(params.embedding, {
      match_threshold: params.match_threshold,
      count: params.count,
      // Pass direct scope fields down
      roomId: params.roomId,
      worldId: params.worldId,
      entityId: params.entityId,
      unique: params.unique,
      tableName: params.tableName,
    });
  }

  /**
   * Asynchronously searches for memories in the database based on the provided parameters.
   * @param {number[]} embedding - The embedding to search for.
   * @param {Object} params - The parameters for searching for memories.
   * @param {number} [params.match_threshold] - The threshold for the cosine distance.
   * @param {number} [params.count] - The maximum number of memories to retrieve.
   * @param {UUID} [params.roomId] - Optional room ID to filter by.
   * @param {UUID} [params.worldId] - Optional world ID to filter by.
   * @param {UUID} [params.entityId] - Optional entity ID to filter by.
   * @param {boolean} [params.unique] - Whether to retrieve unique memories only.
   * @param {string} [params.tableName] - The name of the table to search for memories in.
   * @returns {Promise<Memory[]>} A Promise that resolves to an array of memories.
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
    return this.withDatabase(async () => {
      // Check if vector support is available
      const hasVector = await this.checkVectorSupport();
      if (!hasVector) {
        logger.debug('Vector support not available, returning empty results for semantic search');
        return [];
      }

      // For PGLite, we store embeddings as JSONB but can't do similarity search
      // Return empty results to avoid errors
      if (this.isPGLiteAdapter()) {
        logger.debug('PGLite adapter detected, vector similarity search not supported');
        return [];
      }

      const {
        roomId,
        worldId,
        entityId,
        match_threshold = 0.8,
        count = 10,
        unique = false,
        tableName,
      } = params;

      try {
        // Both PGLite and PostgreSQL now support vector similarity search
        const cleanVector = embedding.map((n) => (Number.isFinite(n) ? Number(n.toFixed(6)) : 0));

        // Format the vector as a PostgreSQL array string for proper casting
        const vectorString = `[${cleanVector.join(',')}]`;

        // Check if the embedding column exists
        const embeddingColumn = embeddingTable[this.embeddingDimension];
        if (!embeddingColumn) {
          throw new Error(`Invalid embedding dimension: ${this.embeddingDimension}`);
        }

        // Use raw SQL with explicit vector casting to ensure compatibility
        const similarity = sql<number>`1 - (${embeddingColumn} <=> ${vectorString}::vector)`;

        const conditions = [
          eq(memoryTable.type, tableName),
          eq(memoryTable.agentId, this.agentId),
          ...(roomId ? [eq(memoryTable.roomId, roomId)] : []),
          ...(worldId ? [eq(memoryTable.worldId, worldId)] : []),
          ...(entityId ? [eq(memoryTable.entityId, entityId)] : []),
          ...(unique ? [eq(memoryTable.unique, unique)] : []),
        ];

        if (match_threshold) {
          conditions.push(gte(similarity, match_threshold));
        }

        const joinCondition = this.isPGLiteAdapter()
          ? sql`${memoryTable.id}::text = ${embeddingTable.memoryId}::text`
          : eq(memoryTable.id, embeddingTable.memoryId);

        const results = await this.db
          .select({
            memory: memoryTable,
            similarity,
            embedding: embeddingColumn,
          })
          .from(embeddingTable)
          .innerJoin(memoryTable, joinCondition)
          .where(and(...conditions))
          .orderBy(desc(similarity))
          .limit(count);

        return results.map((row) => {
          const metadata = row.memory.metadata || {};
          if (row.memory.type && !metadata.type) {
            metadata.type = row.memory.type;
          }

          return {
            id: row.memory.id as UUID,
            createdAt: row.memory.createdAt.getTime(),
            content:
              typeof row.memory.content === 'string'
                ? JSON.parse(row.memory.content)
                : row.memory.content,
            entityId: row.memory.entityId as UUID,
            agentId: row.memory.agentId as UUID,
            roomId: row.memory.roomId as UUID,
            worldId: row.memory.worldId as UUID | undefined,
            unique: row.memory.unique,
            metadata: metadata as MemoryMetadata,
            embedding: row.embedding ?? undefined,
            similarity: row.similarity,
          };
        });
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);

        // Check if the error is due to missing vector support
        if (errorMessage.includes('operator does not exist') && errorMessage.includes('<=>')) {
          logger.warn('Vector similarity operator not available, returning empty results');
          return [];
        }

        // Check if the error is due to JSONB columns being used instead of vector
        if (errorMessage.includes('jsonb <=> vector')) {
          logger.warn(
            'Embeddings stored as JSONB, vector operations not supported, returning empty results'
          );
          return [];
        }

        // Check if embeddings table doesn't exist
        if (
          errorMessage.includes('relation "embeddings" does not exist') ||
          errorMessage.includes('no such table: embeddings')
        ) {
          logger.warn('Embeddings table not available, returning empty results');
          return [];
        }

        // Re-throw other errors
        throw error;
      }
    });
  }

  /**
   * Asynchronously creates a new memory in the database.
   * @param {Memory & { metadata?: MemoryMetadata }} memory - The memory object to create.
   * @param {string} tableName - The name of the table to create the memory in.
   * @returns {Promise<UUID>} A Promise that resolves to the ID of the created memory.
   */
  async createMemory(
    memory: Memory & { metadata?: MemoryMetadata },
    tableName: string
  ): Promise<UUID> {
    logger.debug('DrizzleAdapter createMemory:', {
      memoryId: memory.id,
      embeddingLength: memory.embedding?.length,
      contentLength: memory.content?.text?.length,
    });

    const memoryId = memory.id ?? (v4() as UUID);

    const existing = await this.getMemoryById(memoryId);
    if (existing) {
      logger.debug('Memory already exists, skipping creation:', {
        memoryId,
      });
      return memoryId;
    }

    let isUnique = true;

    if (memory.embedding && Array.isArray(memory.embedding)) {
      const similarMemories = await this.searchMemoriesByEmbedding(memory.embedding, {
        // Use the scope fields from the memory object for similarity check
        roomId: memory.roomId,
        worldId: memory.worldId,
        entityId: memory.entityId,
        match_threshold: 0.95,
        count: 1,
        tableName,
      });
      isUnique = similarMemories.length === 0;
    }

    const contentToInsert =
      typeof memory.content === 'string' ? JSON.parse(memory.content) : memory.content;

    await this.db.transaction(async (tx) => {
      await tx.insert(memoryTable).values([
        {
          id: memoryId,
          type: tableName,
          content: sql`${contentToInsert}::jsonb`,
          metadata: sql`${memory.metadata || {}}::jsonb`,
          entityId: memory.entityId,
          roomId: memory.roomId,
          worldId: memory.worldId, // Include worldId
          agentId: memory.agentId || this.agentId,
          unique: memory.unique ?? isUnique,
          createdAt: memory.createdAt ? new Date(memory.createdAt) : new Date(),
        },
      ]);

      // Store embeddings for both PGLite and PostgreSQL
      if (memory.embedding && Array.isArray(memory.embedding)) {
        const embeddingValues: Record<string, unknown> = {
          id: v4(),
          memoryId: memoryId,
          createdAt: memory.createdAt ? new Date(memory.createdAt) : new Date(),
        };

        const cleanVector = memory.embedding.map((n) =>
          Number.isFinite(n) ? Number(n.toFixed(6)) : 0
        );

        embeddingValues[this.embeddingDimension] = cleanVector;

        await tx.insert(embeddingTable).values([embeddingValues]);
      }
    });

    return memoryId;
  }

  /**
   * Updates an existing memory in the database.
   * @param memory The memory object with updated content and optional embedding
   * @returns Promise resolving to boolean indicating success
   */
  async updateMemory(
    memory: Partial<Memory> & { id: UUID; metadata?: MemoryMetadata }
  ): Promise<boolean> {
    return this.withDatabase(async () => {
      try {
        logger.debug('Updating memory:', {
          memoryId: memory.id,
          hasEmbedding: !!memory.embedding,
        });

        await this.db.transaction(async (tx) => {
          // Update memory content if provided
          if (memory.content) {
            const contentToUpdate =
              typeof memory.content === 'string' ? JSON.parse(memory.content) : memory.content;

            await tx
              .update(memoryTable)
              .set({
                content: sql`${contentToUpdate}::jsonb`,
                ...(memory.metadata && { metadata: sql`${memory.metadata}::jsonb` }),
              })
              .where(eq(memoryTable.id, memory.id));
          } else if (memory.metadata) {
            // Update only metadata if content is not provided
            await tx
              .update(memoryTable)
              .set({
                metadata: sql`${memory.metadata}::jsonb`,
              })
              .where(eq(memoryTable.id, memory.id));
          }

          // Update embedding if provided
          if (memory.embedding && Array.isArray(memory.embedding)) {
            const cleanVector = memory.embedding.map((n) =>
              Number.isFinite(n) ? Number(n.toFixed(6)) : 0
            );

            // Check if embedding exists
            const existingEmbedding = await tx
              .select({ id: embeddingTable.id })
              .from(embeddingTable)
              .where(eq(embeddingTable.memoryId, memory.id))
              .limit(1);

            if (existingEmbedding.length > 0) {
              // Update existing embedding
              const updateValues: Record<string, unknown> = {};
              updateValues[this.embeddingDimension] = cleanVector;

              await tx
                .update(embeddingTable)
                .set(updateValues)
                .where(eq(embeddingTable.memoryId, memory.id));
            } else {
              // Create new embedding
              const embeddingValues: Record<string, unknown> = {
                id: v4(),
                memoryId: memory.id,
                createdAt: new Date().getTime(),
              };
              embeddingValues[this.embeddingDimension] = cleanVector;

              await tx.insert(embeddingTable).values([embeddingValues]);
            }
          }
        });

        logger.debug('Memory updated successfully:', {
          memoryId: memory.id,
        });
        return true;
      } catch (error) {
        logger.error('Error updating memory:', {
          error: error instanceof Error ? error.message : String(error),
          memoryId: memory.id,
        });
        return false;
      }
    });
  }

  /**
   * Asynchronously deletes a memory from the database based on the provided parameters.
   * @param {UUID} memoryId - The ID of the memory to delete.
   * @returns {Promise<void>} A Promise that resolves when the memory is deleted.
   */
  async deleteMemory(memoryId: UUID): Promise<void> {
    return this.withDatabase(async () => {
      await this.db.transaction(async (tx) => {
        // See if there are any fragments that we need to delete
        await this.deleteMemoryFragments(tx, memoryId);

        // Then delete the embedding for the main memory
        try {
          await tx.delete(embeddingTable).where(eq(embeddingTable.memoryId, memoryId));
        } catch (error) {
          // Handle case where embeddings table doesn't exist
          if (
            error instanceof Error &&
            (error.message.includes('relation "embeddings" does not exist') ||
              error.message.includes('no such table: embeddings'))
          ) {
            logger.warn('Embeddings table not yet created, skipping embedding deletion');
          } else {
            throw error;
          }
        }

        // Finally delete the memory itself
        await tx.delete(memoryTable).where(eq(memoryTable.id, memoryId));
      });

      logger.debug('Memory and related fragments removed successfully:', {
        memoryId,
      });
    });
  }

  /**
   * Asynchronously deletes multiple memories from the database in a single batch operation.
   * @param {UUID[]} memoryIds - An array of UUIDs of the memories to delete.
   * @returns {Promise<void>} A Promise that resolves when all memories are deleted.
   */
  async deleteManyMemories(memoryIds: UUID[]): Promise<void> {
    if (memoryIds.length === 0) {
      return;
    }

    return this.withDatabase(async () => {
      await this.db.transaction(async (tx) => {
        // Process in smaller batches to avoid query size limits
        const BATCH_SIZE = 100;
        for (let i = 0; i < memoryIds.length; i += BATCH_SIZE) {
          const batch = memoryIds.slice(i, i + BATCH_SIZE);

          // Delete any fragments for document memories in this batch
          await Promise.all(
            batch.map(async (memoryId) => {
              await this.deleteMemoryFragments(tx, memoryId);
            })
          );

          // Delete embeddings for the batch
          await tx.delete(embeddingTable).where(inArray(embeddingTable.memoryId, batch));

          // Delete the memories themselves
          await tx.delete(memoryTable).where(inArray(memoryTable.id, batch));
        }
      });

      logger.debug('Batch memory deletion completed successfully:', {
        count: memoryIds.length,
      });
    });
  }

  /**
   * Deletes all memory fragments that reference a specific document memory
   * @param tx The database transaction
   * @param documentId The UUID of the document memory whose fragments should be deleted
   * @private
   */
  private async deleteMemoryFragments(tx: any, documentId: UUID): Promise<void> {
    const fragmentsToDelete = await this.getMemoryFragments(tx, documentId);

    if (fragmentsToDelete.length > 0) {
      const fragmentIds = fragmentsToDelete.map((f) => f.id) as UUID[];

      // Delete embeddings for fragments
      await tx.delete(embeddingTable).where(inArray(embeddingTable.memoryId, fragmentIds));

      // Delete the fragments
      await tx.delete(memoryTable).where(inArray(memoryTable.id, fragmentIds));

      logger.debug('Deleted related fragments:', {
        documentId,
        fragmentCount: fragmentsToDelete.length,
      });
    }
  }

  /**
   * Retrieves all memory fragments that reference a specific document memory
   * @param tx The database transaction
   * @param documentId The UUID of the document memory whose fragments should be retrieved
   * @returns An array of memory fragments
   * @private
   */
  private async getMemoryFragments(tx: any, documentId: UUID): Promise<{ id: UUID }[]> {
    try {
      const fragments = await tx
        .select({ id: memoryTable.id })
        .from(memoryTable)
        .where(
          and(
            eq(memoryTable.agentId, this.agentId),
            sql`${memoryTable.metadata}->>'documentId' = ${documentId}`
          )
        );

      return fragments.map((f) => ({ id: f.id as UUID }));
    } catch (error) {
      // If query fails (e.g., no memories exist), return empty array
      logger.debug('Failed to get memory fragments, likely no memories exist:', {
        documentId,
        error: error instanceof Error ? error.message : String(error),
      });
      return [];
    }
  }

  /**
   * Asynchronously deletes all memories from the database based on the provided parameters.
   * @param {UUID} roomId - The ID of the room to delete memories from.
   * @param {string} tableName - The name of the table to delete memories from.
   * @returns {Promise<void>} A Promise that resolves when the memories are deleted.
   */
  async deleteAllMemories(roomId: UUID, tableName: string): Promise<void> {
    return this.withDatabase(async () => {
      await this.db.transaction(async (tx) => {
        // 1) fetch all memory IDs for this room + table
        const rows = await tx
          .select({ id: memoryTable.id })
          .from(memoryTable)
          .where(and(eq(memoryTable.roomId, roomId), eq(memoryTable.type, tableName)));

        const ids = rows.map((r) => r.id);
        logger.debug('[deleteAllMemories] memory IDs to delete:', { roomId, tableName, ids });

        if (ids.length === 0) {
          return;
        }

        // 2) delete any fragments for "document" memories & their embeddings
        await Promise.all(
          ids.map(async (memoryId) => {
            await this.deleteMemoryFragments(tx, memoryId);
            await tx.delete(embeddingTable).where(eq(embeddingTable.memoryId, memoryId));
          })
        );

        // 3) delete the memories themselves
        await tx
          .delete(memoryTable)
          .where(and(eq(memoryTable.roomId, roomId), eq(memoryTable.type, tableName)));
      });

      logger.debug('All memories removed successfully:', { roomId, tableName });
    });
  }

  /**
   * Asynchronously counts the number of memories in the database based on the provided parameters.
   * @param {UUID} roomId - The ID of the room to count memories in.
   * @param {boolean} [unique] - Whether to count unique memories only.
   * @param {string} [tableName] - The name of the table to count memories in.
   * @returns {Promise<number>} A Promise that resolves to the number of memories.
   */
  async countMemories(roomId: UUID, unique = true, tableName = ''): Promise<number> {
    if (!tableName) throw new Error('tableName is required');

    return this.withDatabase(async () => {
      const conditions = [eq(memoryTable.roomId, roomId), eq(memoryTable.type, tableName)];

      if (unique) {
        conditions.push(eq(memoryTable.unique, true));
      }

      const result = await this.db
        .select({ count: sql<number>`count(*)` })
        .from(memoryTable)
        .where(and(...conditions));

      return Number(result[0]?.count ?? 0);
    });
  }

  /**
   * Asynchronously retrieves rooms from the database based on the provided parameters.
   * @param {UUID[]} roomIds - The IDs of the rooms to retrieve.
   * @returns {Promise<Room[] | null>} A Promise that resolves to the rooms if found, null otherwise.
   */
  async getRoomsByIds(roomIds: UUID[]): Promise<Room[] | null> {
    return this.withDatabase(async () => {
      const result = await this.db
        .select({
          id: roomTable.id,
          name: roomTable.name, // Added name
          channelId: roomTable.channelId,
          agentId: roomTable.agentId,
          serverId: roomTable.serverId,
          worldId: roomTable.worldId,
          type: roomTable.type,
          source: roomTable.source,
          metadata: roomTable.metadata, // Added metadata
        })
        .from(roomTable)
        .where(and(inArray(roomTable.id, roomIds), eq(roomTable.agentId, this.agentId)));

      // Map the result to properly typed Room objects
      const rooms = result.map((room) => ({
        ...room,
        id: room.id as UUID,
        name: room.name ?? undefined,
        agentId: room.agentId as UUID,
        serverId: room.serverId as UUID,
        worldId: room.worldId as UUID,
        channelId: room.channelId as UUID,
        type: room.type as (typeof ChannelType)[keyof typeof ChannelType],
        metadata: room.metadata as RoomMetadata,
      }));

      return rooms;
    });
  }

  /**
   * Asynchronously retrieves all rooms from the database based on the provided parameters.
   * @param {UUID} worldId - The ID of the world to retrieve rooms from.
   * @returns {Promise<Room[]>} A Promise that resolves to an array of rooms.
   */
  async getRoomsByWorld(worldId: UUID): Promise<Room[]> {
    return this.withDatabase(async () => {
      const result = await this.db.select().from(roomTable).where(eq(roomTable.worldId, worldId));
      const rooms = result.map((room) => ({
        ...room,
        id: room.id as UUID,
        name: room.name ?? undefined,
        agentId: room.agentId as UUID,
        serverId: room.serverId as UUID,
        worldId: room.worldId as UUID,
        channelId: room.channelId as UUID,
        type: room.type as (typeof ChannelType)[keyof typeof ChannelType],
        metadata: room.metadata as RoomMetadata,
      }));
      return rooms;
    });
  }

  /**
   * Asynchronously updates a room in the database based on the provided parameters.
   * @param {Room} room - The room object to update.
   * @returns {Promise<void>} A Promise that resolves when the room is updated.
   */
  async updateRoom(room: Room): Promise<void> {
    return this.withDatabase(async () => {
      await this.db
        .update(roomTable)
        .set({ ...room, agentId: this.agentId })
        .where(eq(roomTable.id, room.id));
    });
  }

  /**
   * Asynchronously creates a new room in the database based on the provided parameters.
   * @param {Room} room - The room object to create.
   * @returns {Promise<UUID>} A Promise that resolves to the ID of the created room.
   */
  async createRooms(rooms: Room[]): Promise<UUID[]> {
    return this.withDatabase(async () => {
      const roomsWithIds = rooms.map((room) => ({
        id: room.id || v4(), // ensure each room has a unique ID
        agentId: this.agentId,
        name: room.name,
        channelId: room.channelId,
        serverId: room.serverId,
        worldId: room.worldId,
        type: room.type,
        source: room.source,
        metadata: room.metadata,
      }));

      const insertedRooms = await this.db
        .insert(roomTable)
        .values(roomsWithIds)
        .onConflictDoNothing()
        .returning();
      const insertedIds = insertedRooms.map((r) => r.id as UUID);
      return insertedIds;
    });
  }

  /**
   * Asynchronously deletes a room from the database based on the provided parameters.
   * @param {UUID} roomId - The ID of the room to delete.
   * @returns {Promise<void>} A Promise that resolves when the room is deleted.
   */
  async deleteRoom(roomId: UUID): Promise<void> {
    if (!roomId) throw new Error('Room ID is required');
    return this.withDatabase(async () => {
      await this.db.transaction(async (tx) => {
        await tx.delete(roomTable).where(eq(roomTable.id, roomId));
      });
    });
  }

  /**
   * Asynchronously retrieves all rooms for a participant from the database based on the provided parameters.
   * @param {UUID} entityId - The ID of the entity to retrieve rooms for.
   * @returns {Promise<UUID[]>} A Promise that resolves to an array of room IDs.
   */
  async getRoomsForParticipant(entityId: UUID): Promise<UUID[]> {
    return this.withDatabase(async () => {
      // Use raw SQL to avoid Drizzle UUID type issues
      // PGLite doesn't need explicit UUID casting
      const isPGLite = this.isPGLiteAdapter();
      const result = isPGLite
        ? await this.db.execute(sql`
            SELECT p.room_id 
            FROM participants p
            INNER JOIN rooms r ON p.room_id = r.id
            WHERE p.entity_id = ${entityId} AND r.agent_id = ${this.agentId}
          `)
        : await this.db.execute(sql`
            SELECT p.room_id 
            FROM participants p
            INNER JOIN rooms r ON p.room_id = r.id
            WHERE p.entity_id = ${entityId}::uuid AND r.agent_id = ${this.agentId}::uuid
          `);

      // Handle different result formats
      const rows = Array.isArray(result) ? result : result.rows || [];
      return rows.map((row: any) => row.room_id as UUID);
    });
  }

  /**
   * Asynchronously retrieves all rooms for a list of participants from the database based on the provided parameters.
   * @param {UUID[]} entityIds - The IDs of the entities to retrieve rooms for.
   * @returns {Promise<UUID[]>} A Promise that resolves to an array of room IDs.
   */
  async getRoomsForParticipants(entityIds: UUID[]): Promise<UUID[]> {
    if (!entityIds || entityIds.length === 0) {
      return [];
    }

    return this.withDatabase(async () => {
      const isPGLite = this.isPGLiteAdapter();

      if (isPGLite) {
        // For PGLite, use individual queries since it doesn't support array operations well
        const results: Array<{ room_id: UUID }> = [];
        for (const entityId of entityIds) {
          const result = await this.db.execute(sql`
              SELECT DISTINCT p.room_id 
              FROM participants p
              INNER JOIN rooms r ON p.room_id = r.id
              WHERE p.entity_id = ${entityId} AND r.agent_id = ${this.agentId}
            `);
          const rows = Array.isArray(result) ? result : result.rows || [];
          results.push(...rows);
        }

        // Remove duplicates and return
        const roomIds = results.map((row: any) => row.room_id as UUID);
        const uniqueRoomIds = Array.from(new Set(roomIds));
        return uniqueRoomIds;
      } else {
        // For PostgreSQL, use the same approach as PGLite for simplicity and compatibility
        const results: any[] = [];
        for (const entityId of entityIds) {
          const result = await this.db.execute(sql`
            SELECT DISTINCT p.room_id 
            FROM participants p
            INNER JOIN rooms r ON p.room_id = r.id
            WHERE p.entity_id = ${entityId}::uuid AND r.agent_id = ${this.agentId}::uuid
          `);
          const rows = Array.isArray(result) ? result : result.rows || [];
          results.push(...rows);
        }

        // Remove duplicates and return
        const roomIds2 = results.map((row: any) => row.room_id as UUID);
        const uniqueRoomIds2 = Array.from(new Set(roomIds2));
        return uniqueRoomIds2;
      }
    });
  }

  /**
   * Asynchronously adds a participant to a room in the database based on the provided parameters.
   * @param {UUID} entityId - The ID of the entity to add to the room.
   * @param {UUID} roomId - The ID of the room to add the entity to.
   * @returns {Promise<boolean>} A Promise that resolves to a boolean indicating whether the participant was added successfully.
   */
  async addParticipant(entityId: UUID, roomId: UUID): Promise<boolean> {
    return this.withDatabase(async () => {
      try {
        // Use raw SQL to avoid Drizzle schema loading issues
        // PGLite doesn't need explicit UUID casting
        const isPGLite = this.isPGLiteAdapter();
        const result = isPGLite
          ? await this.db.execute(sql`
              INSERT INTO participants (entity_id, room_id, agent_id, created_at, updated_at)
              VALUES (${entityId}, ${roomId}, ${this.agentId}, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
              ON CONFLICT (entity_id, room_id) DO NOTHING
            `)
          : await this.db.execute(sql`
              INSERT INTO participants (entity_id, room_id, agent_id, created_at, updated_at)
              VALUES (${entityId}::uuid, ${roomId}::uuid, ${this.agentId}::uuid, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
              ON CONFLICT (entity_id, room_id) DO NOTHING
            `);

        // Check if a row was actually inserted (result might have a rowCount or changes property)
        const rowsAffected = result.rowCount || result.changes || 1; // Default to 1 for success

        logger.debug('Participant added:', {
          entityId,
          roomId,
          agentId: this.agentId,
          rowsAffected,
        });

        return rowsAffected > 0;
      } catch (error) {
        logger.error('Error adding participant', {
          error: error instanceof Error ? error.message : String(error),
          entityId,
          roomId,
          agentId: this.agentId,
        });
        return false;
      }
    });
  }

  async addParticipantsRoom(entityIds: UUID[], roomId: UUID): Promise<boolean> {
    return this.withDatabase(async () => {
      try {
        // Use raw SQL to avoid Drizzle schema loading issues
        const isPGLite = this.isPGLiteAdapter();

        logger.info(
          `[addParticipantsRoom] Starting - entityIds: ${entityIds.length}, roomId: ${roomId}, isPGLite: ${isPGLite}`
        );

        // First, ensure the unique constraint exists for PostgreSQL (not needed for PGLite)
        if (!isPGLite) {
          try {
            await this.db.execute(sql`
              ALTER TABLE participants ADD CONSTRAINT participants_entity_room_unique UNIQUE (entity_id, room_id)
            `);
            logger.info(`[addParticipantsRoom] Added unique constraint to participants table`);
          } catch (constraintError) {
            // Constraint already exists or other error - that's fine, continue
            logger.debug(
              `[addParticipantsRoom] Constraint add attempt:`,
              (constraintError as Error).message
            );
          }
        }

        // Insert multiple participants
        for (const entityId of entityIds) {
          try {
            logger.info(
              `[addParticipantsRoom] Inserting participant: ${entityId} into room: ${roomId}`
            );

            // Use appropriate syntax based on adapter type
            const result = isPGLite
              ? await this.db.execute(sql`
                  INSERT INTO participants (entity_id, room_id, agent_id, created_at, updated_at)
                  VALUES (${entityId}, ${roomId}, ${this.agentId}, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
                  ON CONFLICT (entity_id, room_id) DO NOTHING
                `)
              : await this.db.execute(sql`
                  INSERT INTO participants (entity_id, room_id, agent_id, created_at, updated_at)
                  VALUES (${entityId}::uuid, ${roomId}::uuid, ${this.agentId}::uuid, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
                  ON CONFLICT (entity_id, room_id) DO NOTHING
                `);
            logger.info(
              `[addParticipantsRoom] Successfully inserted/skipped participant: ${entityId}`
            );
          } catch (insertError) {
            // If ON CONFLICT fails (missing unique constraint), try alternative approach
            const errorMsg = (insertError as Error).message;
            logger.warn(
              `[addParticipantsRoom] INSERT failed for ${entityId}, trying fallback:`,
              errorMsg
            );

            // Fallback: Check if participant exists, then insert only if not
            const checkResult = await this.db.execute(
              isPGLite
                ? sql`SELECT 1 FROM participants WHERE entity_id = ${entityId} AND room_id = ${roomId} LIMIT 1`
                : sql`SELECT 1 FROM participants WHERE entity_id = ${entityId}::uuid AND room_id = ${roomId}::uuid LIMIT 1`
            );

            const rows = Array.isArray(checkResult) ? checkResult : checkResult.rows || [];
            if (rows.length === 0) {
              // Participant doesn't exist, safe to insert
              await this.db.execute(
                isPGLite
                  ? sql`
                      INSERT INTO participants (entity_id, room_id, agent_id, created_at, updated_at)
                      VALUES (${entityId}, ${roomId}, ${this.agentId}, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
                    `
                  : sql`
                      INSERT INTO participants (entity_id, room_id, agent_id, created_at, updated_at)
                      VALUES (${entityId}::uuid, ${roomId}::uuid, ${this.agentId}::uuid, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
                    `
              );
              logger.info(`[addParticipantsRoom] Fallback insert successful for: ${entityId}`);
            } else {
              logger.info(`[addParticipantsRoom] Participant already exists: ${entityId}`);
            }
          }
        }
        logger.info(
          `[addParticipantsRoom] Completed successfully - ${entityIds.length} entities processed`
        );
        return true;
      } catch (error) {
        logger.error('Error adding participants', {
          error: error instanceof Error ? error.message : String(error),
          entityIdSample: entityIds[0],
          roomId,
          agentId: this.agentId,
        });
        return false;
      }
    });
  }

  /**
   * Asynchronously removes a participant from a room in the database based on the provided parameters.
   * @param {UUID} entityId - The ID of the entity to remove from the room.
   * @param {UUID} roomId - The ID of the room to remove the entity from.
   * @returns {Promise<boolean>} A Promise that resolves to a boolean indicating whether the participant was removed successfully.
   */
  async removeParticipant(entityId: UUID, roomId: UUID): Promise<boolean> {
    return this.withDatabase(async () => {
      try {
        // First check if the participant exists
        const checkResult = await this.db.execute(sql`
          SELECT 1 FROM participants 
          WHERE entity_id = ${entityId} AND room_id = ${roomId}
          LIMIT 1
        `);

        const checkRows = Array.isArray(checkResult) ? checkResult : checkResult.rows || [];
        const participantExists = checkRows.length > 0;

        if (!participantExists) {
          logger.debug('Participant not found to remove:', {
            entityId,
            roomId,
          });
          return false;
        }

        // Use raw SQL to avoid Drizzle schema column mismatch issues
        const isPGLite = this.isPGLiteAdapter();
        const result = isPGLite
          ? await this.db.execute(sql`
              DELETE FROM participants 
              WHERE entity_id = ${entityId} AND room_id = ${roomId}
            `)
          : await this.db.execute(sql`
              DELETE FROM participants 
              WHERE entity_id = ${entityId}::uuid AND room_id = ${roomId}::uuid
            `);

        // For PGLite, we assume success if no error was thrown and participant existed
        const removed = participantExists;

        logger.debug(`Participant ${removed ? 'removed' : 'not found'}:`, {
          entityId,
          roomId,
          removed,
        });

        return removed;
      } catch (error) {
        logger.error('Failed to remove participant:', {
          error: error instanceof Error ? error.message : String(error),
          entityId,
          roomId,
        });
        return false;
      }
    });
  }

  /**
   * Asynchronously retrieves all participants for an entity from the database based on the provided parameters.
   * @param {UUID} entityId - The ID of the entity to retrieve participants for.
   * @returns {Promise<Participant[]>} A Promise that resolves to an array of participants.
   */
  async getParticipantsForEntity(entityId: UUID): Promise<Participant[]> {
    return this.withDatabase(async () => {
      // Use raw SQL to avoid Drizzle schema loading issues
      const result = await this.db.execute(sql`
        SELECT entity_id, room_id 
        FROM participants 
        WHERE entity_id = ${entityId}
      `);

      // Handle different result formats from different database adapters
      const rows = Array.isArray(result) ? result : result.rows || [];

      const entities = await this.getEntitiesByIds([entityId]);

      if (!entities || !entities.length) {
        return [];
      }

      return rows.map((row: any) => ({
        entityId: row.entity_id as UUID,
        roomId: row.room_id as UUID,
        entity: entities[0],
      }));
    });
  }

  /**
   * Asynchronously retrieves all participants for a room from the database based on the provided parameters.
   * @param {UUID} roomId - The ID of the room to retrieve participants for.
   * @returns {Promise<UUID[]>} A Promise that resolves to an array of entity IDs.
   */
  async getParticipantsForRoom(roomId: UUID): Promise<UUID[]> {
    return this.withDatabase(async () => {
      // Use raw SQL to avoid Drizzle schema loading issues
      const result = await this.db.execute(sql`
        SELECT entity_id 
        FROM participants 
        WHERE room_id = ${roomId}
      `);

      // Handle different result formats from different database adapters
      const rows = Array.isArray(result) ? result : result.rows || [];
      return rows.map((row: any) => row.entity_id as UUID);
    });
  }

  /**
   * Asynchronously retrieves the user state for a participant in a room from the database based on the provided parameters.
   * @param {UUID} roomId - The ID of the room to retrieve the participant's user state for.
   * @param {UUID} entityId - The ID of the entity to retrieve the user state for.
   * @returns {Promise<"FOLLOWED" | "MUTED" | null>} A Promise that resolves to the participant's user state.
   */
  async getParticipantUserState(
    roomId: UUID,
    entityId: UUID
  ): Promise<'FOLLOWED' | 'MUTED' | null> {
    return this.withDatabase(async () => {
      // Use raw SQL to avoid Drizzle schema loading issues
      // First try with agent_id filter
      const result = await this.db.execute(sql`
        SELECT user_state, agent_id 
        FROM participants 
        WHERE room_id = ${roomId} 
          AND entity_id = ${entityId} 
          AND agent_id = ${this.agentId}
        LIMIT 1
      `);

      // Handle different result formats from different database adapters
      let rows = Array.isArray(result) ? result : result.rows || [];

      if (rows.length === 0) {
        // If no result with agent_id, try without it (for backwards compatibility)
        const fallbackResult = await this.db.execute(sql`
          SELECT user_state, agent_id 
          FROM participants 
          WHERE room_id = ${roomId} 
            AND entity_id = ${entityId}
          LIMIT 1
        `);

        rows = Array.isArray(fallbackResult) ? fallbackResult : fallbackResult.rows || [];

        if (rows.length > 0 && rows[0]) {
          // Update the participant record to include this agent_id for future queries
          await this.db.execute(sql`
            UPDATE participants 
            SET agent_id = ${this.agentId}
            WHERE room_id = ${roomId} 
              AND entity_id = ${entityId}
              AND (agent_id IS NULL OR agent_id = ${this.agentId})
          `);
        }
      }

      return (rows[0]?.user_state as 'FOLLOWED' | 'MUTED' | null) ?? null;
    });
  }

  /**
   * Asynchronously sets the user state for a participant in a room in the database based on the provided parameters.
   * @param {UUID} roomId - The ID of the room to set the participant's user state for.
   * @param {UUID} entityId - The ID of the entity to set the user state for.
   * @param {string} state - The state to set the participant's user state to.
   * @returns {Promise<void>} A Promise that resolves when the participant's user state is set.
   */
  async setParticipantUserState(
    roomId: UUID,
    entityId: UUID,
    state: 'FOLLOWED' | 'MUTED' | null
  ): Promise<void> {
    return this.withDatabase(async () => {
      try {
        // First, try to update existing participant with agent_id
        const updateResult = await this.db.execute(sql`
          UPDATE participants 
          SET user_state = ${state}, updated_at = CURRENT_TIMESTAMP
          WHERE room_id = ${roomId} 
            AND entity_id = ${entityId} 
            AND agent_id = ${this.agentId}
        `);

        // Check if any rows were updated (result varies by adapter)
        const rowsAffected =
          updateResult?.rowCount ||
          updateResult?.changes ||
          (Array.isArray(updateResult) ? updateResult.length : 0);

        if (!rowsAffected || rowsAffected === 0) {
          // If no rows were updated, the participant might exist without agent_id
          // Try updating without the agent_id filter
          const fallbackResult = await this.db.execute(sql`
            UPDATE participants 
            SET user_state = ${state}, agent_id = ${this.agentId}, updated_at = CURRENT_TIMESTAMP
            WHERE room_id = ${roomId} 
              AND entity_id = ${entityId}
          `);

          const fallbackRowsAffected =
            fallbackResult?.rowCount ||
            fallbackResult?.changes ||
            (Array.isArray(fallbackResult) ? fallbackResult.length : 0);

          if (!fallbackRowsAffected || fallbackRowsAffected === 0) {
            // If still no rows updated, the participant doesn't exist
            logger.warn('No participant found to update state for:', {
              roomId,
              entityId,
              state,
              agentId: this.agentId,
            });
          }
        }
      } catch (error) {
        logger.error('Failed to set participant user state:', {
          roomId,
          entityId,
          state,
          error: error instanceof Error ? error.message : String(error),
        });
        throw error;
      }
    });
  }

  /**
   * Asynchronously creates a new relationship in the database based on the provided parameters.
   * @param {Object} params - The parameters for creating a new relationship.
   * @param {UUID} params.sourceEntityId - The ID of the source entity.
   * @param {UUID} params.targetEntityId - The ID of the target entity.
   * @param {string[]} [params.tags] - The tags for the relationship.
   * @param {Object} [params.metadata] - The metadata for the relationship.
   * @returns {Promise<boolean>} A Promise that resolves to a boolean indicating whether the relationship was created successfully.
   */
  async createRelationship(params: {
    sourceEntityId: UUID;
    targetEntityId: UUID;
    tags?: string[];
    metadata?: { [key: string]: unknown };
  }): Promise<boolean> {
    return this.withDatabase(async () => {
      const id = v4();
      const saveParams = {
        id,
        sourceEntityId: params.sourceEntityId,
        targetEntityId: params.targetEntityId,
        agentId: this.agentId,
        tags: params.tags || [],
        metadata: params.metadata || {},
      };
      try {
        await this.db.insert(relationshipTable).values(saveParams);
        return true;
      } catch (error) {
        logger.error('Error creating relationship:', {
          error: error instanceof Error ? error.message : String(error),
          saveParams,
        });
        return false;
      }
    });
  }

  /**
   * Asynchronously updates an existing relationship in the database based on the provided parameters.
   * @param {Relationship} relationship - The relationship object to update.
   * @returns {Promise<void>} A Promise that resolves when the relationship is updated.
   */
  async updateRelationship(relationship: Relationship): Promise<void> {
    return this.withDatabase(async () => {
      try {
        await this.db
          .update(relationshipTable)
          .set({
            tags: relationship.tags || [],
            metadata: relationship.metadata || {},
          })
          .where(eq(relationshipTable.id, relationship.id));
      } catch (error) {
        logger.error('Error updating relationship:', {
          error: error instanceof Error ? error.message : String(error),
          relationship,
        });
        throw error;
      }
    });
  }

  /**
   * Asynchronously retrieves a relationship from the database based on the provided parameters.
   * @param {Object} params - The parameters for retrieving a relationship.
   * @param {UUID} params.sourceEntityId - The ID of the source entity.
   * @param {UUID} params.targetEntityId - The ID of the target entity.
   * @returns {Promise<Relationship | null>} A Promise that resolves to the relationship if found, null otherwise.
   */
  async getRelationship(params: {
    sourceEntityId: UUID;
    targetEntityId: UUID;
  }): Promise<Relationship | null> {
    return this.withDatabase(async () => {
      const { sourceEntityId, targetEntityId } = params;
      const result = await this.db
        .select()
        .from(relationshipTable)
        .where(
          and(
            eq(relationshipTable.sourceEntityId, sourceEntityId),
            eq(relationshipTable.targetEntityId, targetEntityId)
          )
        );
      if (result.length === 0) return null;
      const relationship = result[0];
      return {
        ...relationship,
        id: relationship.id as UUID,
        sourceEntityId: relationship.source_entity_id as UUID,
        targetEntityId: relationship.target_entity_id as UUID,
        agentId: relationship.agent_id as UUID,
        tags: Array.isArray(relationship.tags)
          ? relationship.tags
          : typeof relationship.tags === 'string' && relationship.tags.startsWith('{')
            ? relationship.tags
                .slice(1, -1)
                .split(',')
                .map((tag: string) => tag.replace(/^"|"$/g, ''))
            : (relationship.tags ?? []),
        metadata: (relationship.metadata as { [key: string]: unknown }) ?? {},
        createdAt: relationship.created_at
          ? relationship.created_at instanceof Date
            ? relationship.created_at.toISOString()
            : new Date(relationship.created_at).toISOString()
          : new Date().toISOString(),
      };
    });
  }

  /**
   * Asynchronously retrieves relationships from the database based on the provided parameters.
   * @param {Object} params - The parameters for retrieving relationships.
   * @param {UUID} params.entityId - The ID of the entity to retrieve relationships for.
   * @param {string[]} [params.tags] - The tags to filter relationships by.
   * @returns {Promise<Relationship[]>} A Promise that resolves to an array of relationships.
   */
  async getRelationships(params: { entityId: UUID; tags?: string[] }): Promise<Relationship[]> {
    return this.withDatabase(async () => {
      const { entityId, tags } = params;

      // Always fetch all relationships and filter by tags in memory
      // This avoids PostgreSQL array operator compatibility issues
      const query = sql`
        SELECT * FROM ${relationshipTable}
        WHERE (${relationshipTable.sourceEntityId} = ${entityId} OR ${relationshipTable.targetEntityId} = ${entityId})
        AND ${relationshipTable.agentId} = ${this.agentId}
      `;

      const result = await this.db.execute(query);

      let relationships = result.rows.map((relationship: any) => ({
        ...relationship,
        id: relationship.id as UUID,
        sourceEntityId: relationship.source_entity_id as UUID,
        targetEntityId: relationship.target_entity_id as UUID,
        agentId: relationship.agent_id as UUID,
        tags: Array.isArray(relationship.tags)
          ? relationship.tags
          : typeof relationship.tags === 'string' && relationship.tags.startsWith('{')
            ? relationship.tags
                .slice(1, -1)
                .split(',')
                .map((tag: string) => tag.replace(/^"|"$/g, ''))
            : (relationship.tags ?? []),
        metadata:
          typeof relationship.metadata === 'string'
            ? JSON.parse(relationship.metadata)
            : ((relationship.metadata as { [key: string]: unknown }) ?? {}),
        createdAt: relationship.created_at
          ? relationship.created_at instanceof Date
            ? relationship.created_at.toISOString()
            : new Date(relationship.created_at).toISOString()
          : new Date().toISOString(),
      }));

      // Filter by tags in memory for all databases
      if (tags && tags.length > 0) {
        relationships = relationships.filter((rel) => {
          if (!rel.tags || !Array.isArray(rel.tags)) return false;
          return tags.some((tag) => rel.tags.includes(tag));
        });
      }

      return relationships;
    });
  }

  /**
   * Asynchronously retrieves a cache value from the database based on the provided key.
   * @param {string} key - The key to retrieve the cache value for.
   * @returns {Promise<T | undefined>} A Promise that resolves to the cache value if found, undefined otherwise.
   */
  async getCache<T>(key: string): Promise<T | undefined> {
    logger.info(`[BaseDrizzleAdapter] getCache called - key: ${key}, agentId: ${this.agentId}`);

    return this.withDatabase(async () => {
      try {
        logger.info(`[BaseDrizzleAdapter] Querying cache table for key: ${key}`);
        logger.info(`[BaseDrizzleAdapter] Query params: key="${key}", agentId="${this.agentId}"`);

        // Use raw SQL to avoid Drizzle schema loading issues
        const result = await this.db.execute(sql`
          SELECT value FROM cache 
          WHERE agent_id = ${this.agentId} AND key = ${key}
          LIMIT 1
        `);

        // Handle different result formats from different database adapters
        const rows = Array.isArray(result) ? result : result.rows || [];

        if (rows && rows.length > 0 && rows[0]) {
          logger.info(`[BaseDrizzleAdapter] ✓ Cache hit for key: ${key}`);
          // Parse the JSON value since setCache stores it as JSON
          try {
            const parsedValue = JSON.parse(rows[0].value);
            return parsedValue as T;
          } catch (e) {
            // If parsing fails, return the raw value (backwards compatibility)
            logger.warn(
              `[BaseDrizzleAdapter] Failed to parse cache value for key: ${key}, returning raw value`
            );
            return rows[0].value as T | undefined;
          }
        }

        logger.info(`[BaseDrizzleAdapter] Cache miss for key: ${key}`);
        return undefined;
      } catch (error) {
        logger.error('[BaseDrizzleAdapter] ✗ Error fetching cache', {
          error: error instanceof Error ? error.message : String(error),
          key: key,
          agentId: this.agentId,
        });
        return undefined;
      }
    });
  }

  /**
   * Asynchronously sets a cache value in the database based on the provided key and value.
   * @param {string} key - The key to set the cache value for.
   * @param {T} value - The value to set in the cache.
   * @returns {Promise<boolean>} A Promise that resolves to a boolean indicating whether the cache value was set successfully.
   */
  async setCache<T>(key: string, value: T): Promise<boolean> {
    logger.info(`[BaseDrizzleAdapter] setCache called - key: ${key}, agentId: ${this.agentId}`);

    return this.withDatabase(async () => {
      try {
        // Check if we're using PGLite
        const isPGLite = this.constructor.name === 'PgliteDatabaseAdapter';
        logger.info(`[BaseDrizzleAdapter] Using ${isPGLite ? 'PGLite' : 'PostgreSQL'} adapter`);

        // Use raw SQL to avoid Drizzle schema loading issues
        if (isPGLite) {
          logger.info('[BaseDrizzleAdapter] Using PGLite direct approach (no transaction)');

          // First delete any existing entry
          logger.info(`[BaseDrizzleAdapter] Deleting existing cache entry for key: ${key}`);
          await this.db.execute(sql`
            DELETE FROM cache 
            WHERE agent_id = ${this.agentId} AND key = ${key}
          `);
          logger.info(`[BaseDrizzleAdapter] Delete completed for key: ${key}`);

          // Then insert the new value
          logger.info(`[BaseDrizzleAdapter] Inserting new cache entry for key: ${key}`);
          logger.info(
            `[BaseDrizzleAdapter] Insert values: key="${key}", agentId="${this.agentId}", value=${JSON.stringify(value)}`
          );
          await this.db.execute(sql`
            INSERT INTO cache (key, agent_id, value, created_at, expires_at)
            VALUES (${key}, ${this.agentId}, ${JSON.stringify(value)}::jsonb, CURRENT_TIMESTAMP, NULL)
          `);
          logger.info(`[BaseDrizzleAdapter] Insert completed for key: ${key}`);

          // For PGLite, we need to ensure data is persisted
          // Add a small delay to allow PGLite to flush changes
          await new Promise((resolve) => setTimeout(resolve, 50));
          logger.info(`[BaseDrizzleAdapter] Post-insert wait completed for key: ${key}`);
        } else {
          // For PostgreSQL, use upsert with raw SQL
          await this.db.execute(sql`
            INSERT INTO cache (key, agent_id, value, created_at, expires_at)
            VALUES (${key}, ${this.agentId}, ${JSON.stringify(value)}::jsonb, CURRENT_TIMESTAMP, NULL)
            ON CONFLICT (key, agent_id) 
            DO UPDATE SET value = EXCLUDED.value, created_at = CURRENT_TIMESTAMP
          `);
        }

        logger.info(`[BaseDrizzleAdapter] ✓ Cache set successfully for key: ${key}`);
        return true;
      } catch (error) {
        logger.error('[BaseDrizzleAdapter] ✗ Error setting cache', {
          error: error instanceof Error ? error.message : String(error),
          key: key,
          agentId: this.agentId,
          stack: error instanceof Error ? error.stack : undefined,
        });
        return false;
      }
    });
  }

  /**
   * Asynchronously deletes a cache value from the database based on the provided key.
   * @param {string} key - The key to delete the cache value for.
   * @returns {Promise<boolean>} A Promise that resolves to a boolean indicating whether the cache value was deleted successfully.
   */
  async deleteCache(key: string): Promise<boolean> {
    return this.withDatabase(async () => {
      try {
        // Use raw SQL to avoid Drizzle schema loading issues
        await this.db.execute(sql`
          DELETE FROM cache 
          WHERE agent_id = ${this.agentId} AND key = ${key}
        `);
        return true;
      } catch (error) {
        logger.error('Error deleting cache', {
          error: error instanceof Error ? error.message : String(error),
          key: key,
          agentId: this.agentId,
        });
        return false;
      }
    });
  }

  /**
   * Asynchronously creates a new world in the database based on the provided parameters.
   * @param {World} world - The world object to create.
   * @returns {Promise<UUID>} A Promise that resolves to the ID of the created world.
   */
  async createWorld(world: World): Promise<UUID> {
    return this.withDatabase(async () => {
      const newWorldId = world.id || v4();
      await this.db.insert(worldTable).values({
        id: newWorldId,
        name: world.name || '',
        agentId: world.agentId,
        serverId: world.serverId,
        metadata: world.metadata,
      });
      return newWorldId;
    });
  }

  /**
   * Asynchronously retrieves a world from the database based on the provided parameters.
   * @param {UUID} id - The ID of the world to retrieve.
   * @returns {Promise<World | null>} A Promise that resolves to the world if found, null otherwise.
   */
  async getWorld(id: UUID): Promise<World | null> {
    return this.withDatabase(async () => {
      const result = await this.db.select().from(worldTable).where(eq(worldTable.id, id));
      return result.length > 0 ? (result[0] as World) : null;
    });
  }

  /**
   * Asynchronously retrieves all worlds from the database based on the provided parameters.
   * @returns {Promise<World[]>} A Promise that resolves to an array of worlds.
   */
  async getAllWorlds(): Promise<World[]> {
    return this.withDatabase(async () => {
      const result = await this.db
        .select()
        .from(worldTable)
        .where(eq(worldTable.agentId, this.agentId));
      return result as World[];
    });
  }

  /**
   * Asynchronously updates an existing world in the database based on the provided parameters.
   * @param {World} world - The world object to update.
   * @returns {Promise<void>} A Promise that resolves when the world is updated.
   */
  async updateWorld(world: World): Promise<void> {
    return this.withDatabase(async () => {
      await this.db
        .update(worldTable)
        .set({
          name: world.name,
          agentId: world.agentId,
          serverId: world.serverId,
          metadata: world.metadata,
        })
        .where(eq(worldTable.id, world.id));
    });
  }

  /**
   * Asynchronously removes a world from the database based on the provided parameters.
   * @param {UUID} id - The ID of the world to remove.
   * @returns {Promise<void>} A Promise that resolves when the world is removed.
   */
  async removeWorld(id: UUID): Promise<void> {
    return this.withDatabase(async () => {
      await this.db.delete(worldTable).where(eq(worldTable.id, id));
    });
  }

  /**
   * Asynchronously creates a new task in the database based on the provided parameters.
   * @param {Task} task - The task object to create.
   * @returns {Promise<UUID>} A Promise that resolves to the ID of the created task.
   */
  async createTask(task: Task): Promise<UUID> {
    if (!task.worldId) {
      throw new Error('worldId is required');
    }
    return this.withRetry(async () => {
      return this.withDatabase(async () => {
        const now = new Date();
        const metadata = task.metadata || {};

        const values = {
          id: task.id as UUID,
          name: task.name,
          description: task.description,
          roomId: task.roomId as UUID,
          worldId: task.worldId as UUID,
          tags: task.tags,
          metadata: metadata,
          createdAt: now,
          updatedAt: now,
          agentId: this.agentId as UUID,
        };

        const result = await this.db.insert(tasksTable).values(values).returning();

        return result[0].id as UUID;
      });
    });
  }

  /**
   * Asynchronously retrieves tasks based on specified parameters.
   * @param params Object containing optional roomId, tags, and entityId to filter tasks
   * @returns Promise resolving to an array of Task objects
   */
  async getTasks(params: {
    roomId?: UUID;
    tags?: string[];
    entityId?: UUID; // Added entityId parameter
  }): Promise<Task[]> {
    return this.withRetry(async () => {
      return this.withDatabase(async () => {
        // For PGLite compatibility, we'll fetch all tasks and filter in memory
        const isPGLite = this.constructor.name === 'PgliteDatabaseAdapter';

        if (isPGLite && params.tags && params.tags.length > 0) {
          // Fetch all tasks for the agent/room and filter by tags in memory
          const allTasks = await this.db
            .select()
            .from(tasksTable)
            .where(
              and(
                eq(tasksTable.agentId, this.agentId),
                ...(params.roomId ? [eq(tasksTable.roomId, params.roomId)] : [])
              )
            );

          // Filter by tags in memory
          const filteredTasks = allTasks.filter((task) => {
            if (!task.tags || !Array.isArray(task.tags)) return false;
            return params.tags!.every((tag) => task.tags.includes(tag));
          });

          return filteredTasks.map((row) => ({
            id: row.id as UUID,
            name: row.name,
            description: row.description ?? '',
            roomId: row.roomId as UUID,
            worldId: row.worldId as UUID,
            tags: row.tags || [],
            metadata: row.metadata as TaskMetadata,
          }));
        } else {
          // PostgreSQL or no tag filtering
          const result = await this.db
            .select()
            .from(tasksTable)
            .where(
              and(
                eq(tasksTable.agentId, this.agentId),
                ...(params.roomId ? [eq(tasksTable.roomId, params.roomId)] : []),
                ...(params.tags && params.tags.length > 0
                  ? [
                      sql`${tasksTable.tags} @> ARRAY[${sql.raw(
                        params.tags.map((t) => `'${t.replace(/'/g, "''")}'`).join(', ')
                      )}]::text[]`,
                    ]
                  : [])
              )
            );

          return result.map((row) => ({
            id: row.id as UUID,
            name: row.name,
            description: row.description ?? '',
            roomId: row.roomId as UUID,
            worldId: row.worldId as UUID,
            tags: row.tags || [],
            metadata: row.metadata as TaskMetadata,
          }));
        }
      });
    });
  }

  /**
   * Asynchronously retrieves a specific task by its name.
   * @param name The name of the task to retrieve
   * @returns Promise resolving to the Task object if found, null otherwise
   */
  async getTasksByName(name: string): Promise<Task[]> {
    return this.withRetry(async () => {
      return this.withDatabase(async () => {
        const result = await this.db
          .select()
          .from(tasksTable)
          .where(and(eq(tasksTable.name, name), eq(tasksTable.agentId, this.agentId)));

        return result.map((row) => ({
          id: row.id as UUID,
          name: row.name,
          description: row.description ?? '',
          roomId: row.roomId as UUID,
          worldId: row.worldId as UUID,
          tags: row.tags || [],
          metadata: (row.metadata || {}) as TaskMetadata,
        }));
      });
    });
  }

  /**
   * Asynchronously retrieves a specific task by its ID.
   * @param id The UUID of the task to retrieve
   * @returns Promise resolving to the Task object if found, null otherwise
   */
  async getTask(id: UUID): Promise<Task | null> {
    return this.withRetry(async () => {
      return this.withDatabase(async () => {
        const result = await this.db
          .select()
          .from(tasksTable)
          .where(and(eq(tasksTable.id, id), eq(tasksTable.agentId, this.agentId)))
          .limit(1);

        if (result.length === 0) {
          return null;
        }

        const row = result[0];
        return {
          id: row.id as UUID,
          name: row.name,
          description: row.description ?? '',
          roomId: row.roomId as UUID,
          worldId: row.worldId as UUID,
          tags: row.tags || [],
          metadata: (row.metadata || {}) as TaskMetadata,
        };
      });
    });
  }

  /**
   * Asynchronously updates an existing task in the database.
   * @param id The UUID of the task to update
   * @param task Partial Task object containing the fields to update
   * @returns Promise resolving when the update is complete
   */
  async updateTask(id: UUID, task: Partial<Task>): Promise<void> {
    await this.withRetry(async () => {
      await this.withDatabase(async () => {
        const updateValues: Partial<Task> = {};

        // Add fields to update if they exist in the partial task object
        if (task.name !== undefined) updateValues.name = task.name;
        if (task.description !== undefined) updateValues.description = task.description;
        if (task.roomId !== undefined) updateValues.roomId = task.roomId;
        if (task.worldId !== undefined) updateValues.worldId = task.worldId;
        if (task.tags !== undefined) updateValues.tags = task.tags;

        // Always update the updatedAt timestamp as a Date
        (updateValues as any).updatedAt = new Date();

        // Handle metadata updates - just set it directly without merging
        if (task.metadata !== undefined) {
          updateValues.metadata = task.metadata;
        }

        await this.db
          .update(tasksTable)
          // createdAt is hella borked, number / Date
          .set(updateValues as any)
          .where(and(eq(tasksTable.id, id), eq(tasksTable.agentId, this.agentId)));
      });
    });
  }

  /**
   * Asynchronously deletes a task from the database.
   * @param id The UUID of the task to delete
   * @returns Promise resolving when the deletion is complete
   */
  async deleteTask(id: UUID): Promise<void> {
    return this.withDatabase(async () => {
      await this.db.delete(tasksTable).where(eq(tasksTable.id, id));
    });
  }

  async getMemoriesByWorldId(params: {
    worldId: UUID;
    count?: number;
    tableName?: string;
  }): Promise<Memory[]> {
    return this.withDatabase(async () => {
      // First, get all rooms for the given worldId
      const rooms = await this.db
        .select({ id: roomTable.id })
        .from(roomTable)
        .where(and(eq(roomTable.worldId, params.worldId), eq(roomTable.agentId, this.agentId)));

      if (rooms.length === 0) {
        return [];
      }

      const roomIds = rooms.map((room) => room.id as UUID);

      const memories = await this.getMemoriesByRoomIds({
        roomIds,
        tableName: params.tableName || 'messages',
        limit: params.count,
      });

      return memories;
    });
  }

  async deleteRoomsByWorldId(worldId: UUID): Promise<void> {
    return this.withDatabase(async () => {
      const rooms = await this.db
        .select({ id: roomTable.id })
        .from(roomTable)
        .where(and(eq(roomTable.worldId, worldId), eq(roomTable.agentId, this.agentId)));

      if (rooms.length === 0) {
        logger.debug(
          `No rooms found for worldId ${worldId} and agentId ${this.agentId} to delete.`
        );
        return;
      }

      const roomIds = rooms.map((room) => room.id as UUID);

      if (roomIds.length > 0) {
        await this.db.delete(logTable).where(inArray(logTable.roomId, roomIds));
        logger.debug(`Deleted logs for ${roomIds.length} rooms in world ${worldId}.`);

        await this.db.delete(participantTable).where(inArray(participantTable.roomId, roomIds));
        logger.debug(`Deleted participants for ${roomIds.length} rooms in world ${worldId}.`);

        const memoriesInRooms = await this.db
          .select({ id: memoryTable.id })
          .from(memoryTable)
          .where(inArray(memoryTable.roomId, roomIds));
        const memoryIdsInRooms = memoriesInRooms.map((m) => m.id as UUID);

        if (memoryIdsInRooms.length > 0) {
          await this.db
            .delete(embeddingTable)
            .where(inArray(embeddingTable.memoryId, memoryIdsInRooms));
          logger.debug(
            `Deleted embeddings for ${memoryIdsInRooms.length} memories in world ${worldId}.`
          );
          await this.db.delete(memoryTable).where(inArray(memoryTable.id, memoryIdsInRooms));
          logger.debug(`Deleted ${memoryIdsInRooms.length} memories in world ${worldId}.`);
        }

        await this.db.delete(roomTable).where(inArray(roomTable.id, roomIds));
        logger.debug(`Deleted ${roomIds.length} rooms for worldId ${worldId}.`);
      }
    });
  }

  // Message Server Database Operations

  /**
   * Creates a new message server in the central database
   */
  async createMessageServer(data: {
    id?: UUID; // Allow passing a specific ID
    name: string;
    sourceType: string;
    sourceId?: string;
    metadata?: any;
  }): Promise<{
    id: UUID;
    name: string;
    sourceType: string;
    sourceId?: string;
    metadata?: any;
    createdAt: Date;
    updatedAt: Date;
  }> {
    return this.withDatabase(async () => {
      const newId = data.id || (v4() as UUID);
      const now = new Date();
      const serverToInsert = {
        id: newId,
        name: data.name,
        sourceType: data.sourceType,
        sourceId: data.sourceId,
        metadata: data.metadata,
        createdAt: now,
        updatedAt: now,
      };

      await this.db.insert(messageServerTable).values(serverToInsert).onConflictDoNothing(); // In case the ID already exists

      // If server already existed, fetch it
      if (data.id) {
        const existing = await this.db
          .select()
          .from(messageServerTable)
          .where(eq(messageServerTable.id, data.id))
          .limit(1);
        if (existing.length > 0) {
          return {
            id: existing[0].id as UUID,
            name: existing[0].name,
            sourceType: existing[0].sourceType,
            sourceId: existing[0].sourceId || undefined,
            metadata: existing[0].metadata || undefined,
            createdAt: existing[0].createdAt,
            updatedAt: existing[0].updatedAt,
          };
        }
      }

      return serverToInsert;
    });
  }

  /**
   * Gets all message servers
   */
  async getMessageServers(): Promise<
    Array<{
      id: UUID;
      name: string;
      sourceType: string;
      sourceId?: string;
      metadata?: any;
      createdAt: Date;
      updatedAt: Date;
    }>
  > {
    return this.withDatabase(async () => {
      try {
        const results = await this.db.select().from(messageServerTable);
        return results.map((r) => ({
          id: r.id as UUID,
          name: r.name,
          sourceType: r.sourceType,
          sourceId: r.sourceId || undefined,
          metadata: r.metadata || undefined,
          createdAt: r.createdAt,
          updatedAt: r.updatedAt,
        }));
      } catch (error) {
        if (
          error instanceof Error &&
          (error.message.includes('relation "messageServers" does not exist') ||
            error.message.includes('relation "message_servers" does not exist') ||
            (error.message.includes('select') && error.message.includes('message_servers')) ||
            (error.message.includes('Failed query') && error.message.includes('message_servers')))
        ) {
          logger.warn(
            'Message servers table not yet created during initialization, returning empty array'
          );
          return [];
        }
        throw error;
      }
    });
  }

  /**
   * Gets a message server by ID
   */
  async getMessageServerById(serverId: UUID): Promise<{
    id: UUID;
    name: string;
    sourceType: string;
    sourceId?: string;
    metadata?: any;
    createdAt: Date;
    updatedAt: Date;
  } | null> {
    return this.withDatabase(async () => {
      const results = await this.db
        .select()
        .from(messageServerTable)
        .where(eq(messageServerTable.id, serverId))
        .limit(1);
      return results.length > 0
        ? {
            id: results[0].id as UUID,
            name: results[0].name,
            sourceType: results[0].sourceType,
            sourceId: results[0].sourceId || undefined,
            metadata: results[0].metadata || undefined,
            createdAt: results[0].createdAt,
            updatedAt: results[0].updatedAt,
          }
        : null;
    });
  }

  /**
   * Creates a new channel
   */
  async createChannel(
    data: {
      id?: UUID; // Allow passing a specific ID
      serverId: UUID;
      name: string;
      type: string;
      sourceType?: string;
      sourceId?: string;
      topic?: string;
      metadata?: any;
    },
    participantIds?: UUID[]
  ): Promise<{
    id: UUID;
    serverId: UUID;
    name: string;
    type: string;
    sourceType?: string;
    sourceId?: string;
    topic?: string;
    metadata?: any;
    createdAt: Date;
    updatedAt: Date;
  }> {
    return this.withDatabase(async () => {
      const newId = data.id || (v4() as UUID);
      const now = new Date();
      // Ensure serverId is provided and valid
      if (!data.serverId) {
        throw new Error('serverId is required for channel creation');
      }

      const channelToInsert = {
        id: newId,
        serverId: data.serverId,
        name: data.name,
        type: data.type,
        sourceType: data.sourceType || null,
        sourceId: data.sourceId || null,
        topic: data.topic || null,
        metadata: data.metadata || {},
        createdAt: now,
        updatedAt: now,
      };

      await this.db.transaction(async (tx) => {
        await tx.insert(channelTable).values(channelToInsert);

        if (participantIds && participantIds.length > 0) {
          const participantValues = participantIds.map((userId) => ({
            channelId: newId,
            userId: userId,
          }));
          await tx.insert(channelParticipantsTable).values(participantValues).onConflictDoNothing();
        }
      });

      // Return the expected format
      return {
        id: newId,
        serverId: data.serverId,
        name: data.name,
        type: data.type,
        sourceType: data.sourceType,
        sourceId: data.sourceId,
        topic: data.topic,
        metadata: data.metadata,
        createdAt: now,
        updatedAt: now,
      };
    });
  }

  /**
   * Gets channels for a server
   */
  async getChannelsForServer(serverId: UUID): Promise<
    Array<{
      id: UUID;
      serverId: UUID;
      name: string;
      type: string;
      sourceType?: string;
      sourceId?: string;
      topic?: string;
      metadata?: any;
      createdAt: Date;
      updatedAt: Date;
    }>
  > {
    return this.withDatabase(async () => {
      const results = await this.db
        .select()
        .from(channelTable)
        .where(eq((channelTable as any).serverId, serverId));
      return results.map((r) => ({
        id: r.id as UUID,
        serverId: r.serverId as UUID,
        name: r.name,
        type: r.type,
        sourceType: r.sourceType || undefined,
        sourceId: r.sourceId || undefined,
        topic: r.topic || undefined,
        metadata: r.metadata || undefined,
        createdAt: r.createdAt,
        updatedAt: r.updatedAt,
      }));
    });
  }

  /**
   * Gets channel details
   */
  async getChannelDetails(channelId: UUID): Promise<{
    id: UUID;
    serverId: UUID;
    name: string;
    type: string;
    sourceType?: string;
    sourceId?: string;
    topic?: string;
    metadata?: any;
    createdAt: Date;
    updatedAt: Date;
  } | null> {
    return this.withDatabase(async () => {
      const results = await this.db
        .select()
        .from(channelTable)
        .where(eq(channelTable.id, channelId))
        .limit(1);
      return results.length > 0
        ? {
            id: results[0].id as UUID,
            serverId: results[0].serverId as UUID,
            name: results[0].name,
            type: results[0].type,
            sourceType: results[0].sourceType || undefined,
            sourceId: results[0].sourceId || undefined,
            topic: results[0].topic || undefined,
            metadata: results[0].metadata || undefined,
            createdAt: results[0].createdAt,
            updatedAt: results[0].updatedAt,
          }
        : null;
    });
  }

  /**
   * Creates a message
   */
  async createMessage(data: {
    channelId: UUID;
    authorId: UUID;
    content: string;
    rawMessage?: any;
    sourceType?: string;
    sourceId?: string;
    metadata?: any;
    inReplyToRootMessageId?: UUID;
  }): Promise<{
    id: UUID;
    channelId: UUID;
    authorId: UUID;
    content: string;
    rawMessage?: any;
    sourceType?: string;
    sourceId?: string;
    metadata?: any;
    inReplyToRootMessageId?: UUID;
    createdAt: Date;
    updatedAt: Date;
  }> {
    return this.withDatabase(async () => {
      const newId = v4() as UUID;
      const now = new Date();
      const messageToInsert = {
        id: newId,
        channelId: data.channelId,
        authorId: data.authorId,
        content: data.content,
        rawMessage: data.rawMessage,
        sourceType: data.sourceType,
        sourceId: data.sourceId,
        metadata: data.metadata,
        inReplyToRootMessageId: data.inReplyToRootMessageId,
        createdAt: now,
        updatedAt: now,
      };

      await this.db.insert(messageTable).values(messageToInsert);
      return messageToInsert;
    });
  }

  /**
   * Gets messages for a channel
   */
  async getMessagesForChannel(
    channelId: UUID,
    limit: number = 50,
    beforeTimestamp?: Date
  ): Promise<
    Array<{
      id: UUID;
      channelId: UUID;
      authorId: UUID;
      content: string;
      rawMessage?: any;
      sourceType?: string;
      sourceId?: string;
      metadata?: any;
      inReplyToRootMessageId?: UUID;
      createdAt: Date;
      updatedAt: Date;
    }>
  > {
    return this.withDatabase(async () => {
      const conditions = [eq(messageTable.channelId, channelId)];
      if (beforeTimestamp) {
        conditions.push(lt(messageTable.createdAt, beforeTimestamp));
      }

      const query = this.db
        .select()
        .from(messageTable)
        .where(and(...conditions))
        .orderBy(desc(messageTable.createdAt))
        .limit(limit);

      const results = await query;
      return results.map((r) => ({
        id: r.id as UUID,
        channelId: r.channelId as UUID,
        authorId: r.authorId as UUID,
        content: r.content,
        rawMessage: r.rawMessage || undefined,
        sourceType: r.sourceType || undefined,
        sourceId: r.sourceId || undefined,
        metadata: r.metadata || undefined,
        inReplyToRootMessageId: r.inReplyToRootMessageId as UUID | undefined,
        createdAt: r.createdAt,
        updatedAt: r.updatedAt,
      }));
    });
  }

  /**
   * Deletes a message
   */
  async deleteMessage(messageId: UUID): Promise<void> {
    return this.withDatabase(async () => {
      await this.db.delete(messageTable).where(eq(messageTable.id, messageId));
    });
  }

  /**
   * Updates a channel
   */
  async updateChannel(
    channelId: UUID,
    updates: { name?: string; participantCentralUserIds?: UUID[]; metadata?: any }
  ): Promise<{
    id: UUID;
    serverId: UUID;
    name: string;
    type: string;
    sourceType?: string;
    sourceId?: string;
    topic?: string;
    metadata?: any;
    createdAt: Date;
    updatedAt: Date;
  }> {
    return this.withDatabase(async () => {
      const now = new Date();

      await this.db.transaction(async (tx) => {
        // Update channel details
        const updateData: any = { updatedAt: now };
        if (updates.name !== undefined) updateData.name = updates.name;
        if (updates.metadata !== undefined) updateData.metadata = updates.metadata;

        await tx.update(channelTable).set(updateData).where(eq(channelTable.id, channelId));

        // Update participants if provided
        if (updates.participantCentralUserIds !== undefined) {
          // Remove existing participants
          await tx
            .delete(channelParticipantsTable)
            .where(eq(channelParticipantsTable.channelId, channelId));

          // Add new participants
          if (updates.participantCentralUserIds.length > 0) {
            const participantValues = updates.participantCentralUserIds.map((userId) => ({
              channelId: channelId,
              userId: userId,
            }));
            await tx
              .insert(channelParticipantsTable)
              .values(participantValues)
              .onConflictDoNothing();
          }
        }
      });

      // Return updated channel details
      const updatedChannel = await this.getChannelDetails(channelId);
      if (!updatedChannel) {
        throw new Error(`Channel ${channelId} not found after update`);
      }
      return updatedChannel;
    });
  }

  /**
   * Deletes a channel and all its associated data
   */
  async deleteChannel(channelId: UUID): Promise<void> {
    return this.withDatabase(async () => {
      await this.db.transaction(async (tx) => {
        // Delete all messages in the channel (cascade delete will handle this, but explicit is better)
        await tx.delete(messageTable).where(eq(messageTable.channelId, channelId));

        // Delete all participants (cascade delete will handle this, but explicit is better)
        await tx
          .delete(channelParticipantsTable)
          .where(eq(channelParticipantsTable.channelId, channelId));

        // Delete the channel itself
        await tx.delete(channelTable).where(eq(channelTable.id, channelId));
      });
    });
  }

  /**
   * Adds participants to a channel
   */
  async addChannelParticipants(channelId: UUID, userIds: UUID[]): Promise<void> {
    return this.withDatabase(async () => {
      if (!userIds || userIds.length === 0) return;

      const participantValues = userIds.map((userId) => ({
        channelId: channelId,
        userId: userId,
      }));

      await this.db
        .insert(channelParticipantsTable)
        .values(participantValues)
        .onConflictDoNothing();
    });
  }

  /**
   * Gets participants for a channel
   */
  async getChannelParticipants(channelId: UUID): Promise<UUID[]> {
    return this.withDatabase(async () => {
      const results = await this.db
        .select({ userId: channelParticipantsTable.userId })
        .from(channelParticipantsTable)
        .where(eq(channelParticipantsTable.channelId, channelId));

      return results.map((r) => r.userId as UUID);
    });
  }

  /**
   * Adds an agent to a server
   */
  async addAgentToServer(serverId: UUID, agentId: UUID): Promise<void> {
    return this.withDatabase(async () => {
      await this.db
        .insert(serverAgentsTable)
        .values({
          serverId,
          agentId,
        })
        .onConflictDoNothing();
    });
  }

  /**
   * Gets agents for a server
   */
  async getAgentsForServer(serverId: UUID): Promise<UUID[]> {
    return this.withDatabase(async () => {
      try {
        const results = await this.db
          .select({ agentId: serverAgentsTable.agentId })
          .from(serverAgentsTable)
          .where(eq(serverAgentsTable.serverId, serverId));

        return results.map((r) => r.agentId as UUID);
      } catch (error) {
        // Handle case where server_agents table doesn't exist yet (during initialization)
        const errorMessage = error instanceof Error ? error.message : String(error);
        if (
          errorMessage.includes('relation "server_agents" does not exist') ||
          errorMessage.includes('relation "serverAgents" does not exist') ||
          errorMessage.includes('no such table: server_agents') ||
          errorMessage.includes('no such table: serverAgents') ||
          errorMessage.includes("doesn't exist") ||
          errorMessage.includes('Failed query') ||
          errorMessage.includes('table "server_agents"') ||
          errorMessage.includes('table "serverAgents"') ||
          errorMessage.includes('server_agents table') ||
          errorMessage.includes('serverAgents table') ||
          errorMessage.includes('"server_agents"') ||
          errorMessage.includes('"serverAgents"') ||
          errorMessage.toLowerCase().includes('does not exist') ||
          errorMessage.toLowerCase().includes('not exist')
        ) {
          logger.warn(
            'Server agents table not yet created during initialization, returning empty array',
            {
              error: errorMessage,
            }
          );
          return [];
        }

        logger.error('Unexpected error in getAgentsForServer', {
          error: errorMessage,
          stack: error instanceof Error ? error.stack : undefined,
        });
        throw error;
      }
    });
  }

  /**
   * Removes an agent from a server
   */
  async removeAgentFromServer(serverId: UUID, agentId: UUID): Promise<void> {
    return this.withDatabase(async () => {
      await this.db
        .delete(serverAgentsTable)
        .where(
          and(eq(serverAgentsTable.serverId, serverId), eq(serverAgentsTable.agentId, agentId))
        );
    });
  }

  /**
   * Finds or creates a DM channel between two users
   */
  async findOrCreateDmChannel(
    user1Id: UUID,
    user2Id: UUID,
    serverId: UUID
  ): Promise<{
    id: UUID;
    serverId: UUID;
    name: string;
    type: string;
    sourceType?: string;
    sourceId?: string;
    topic?: string;
    metadata?: any;
    createdAt: Date;
    updatedAt: Date;
  }> {
    return this.withDatabase(async () => {
      const ids = [user1Id, user2Id].sort();
      const dmChannelName = `DM-${ids[0]}-${ids[1]}`;

      const existingChannels = await this.db
        .select()
        .from(channelTable)
        .where(
          and(
            eq(channelTable.type, ChannelType.DM),
            eq(channelTable.name, dmChannelName),
            eq((channelTable as any).serverId, serverId)
          )
        )
        .limit(1);

      if (existingChannels.length > 0) {
        return {
          id: existingChannels[0].id as UUID,
          serverId: existingChannels[0].serverId as UUID,
          name: existingChannels[0].name,
          type: existingChannels[0].type,
          sourceType: existingChannels[0].sourceType || undefined,
          sourceId: existingChannels[0].sourceId || undefined,
          topic: existingChannels[0].topic || undefined,
          metadata: existingChannels[0].metadata || undefined,
          createdAt: existingChannels[0].createdAt,
          updatedAt: existingChannels[0].updatedAt,
        };
      }

      // Create new DM channel
      return this.createChannel(
        {
          serverId,
          name: dmChannelName,
          type: ChannelType.DM,
          metadata: { user1: ids[0], user2: ids[1] },
        },
        ids
      );
    });
  }

  /**
   * Asynchronously retrieves a single entity by its ID.
   * This method is required by the core runtime interface.
   * @param {UUID} entityId - The unique identifier of the entity to retrieve.
   * @returns {Promise<Entity | null>} A Promise that resolves to the entity if found, null otherwise.
   */
  async getEntityById(entityId: UUID): Promise<Entity | null> {
    const entities = await this.getEntitiesByIds([entityId]);
    return entities && entities.length > 0 ? entities[0] : null;
  }
}

// Import tables at the end to avoid circular dependencies
