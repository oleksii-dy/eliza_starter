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
  type Metadata,
  type Participant,
  type Relationship,
  type Room,
  type RoomMetadata,
  type Task,
  type TaskMetadata,
  type UUID,
  type World,
} from '@elizaos/core';
import {
  and,
  count,
  desc,
  eq,
  gte,
  inArray,
  lt,
  lte,
  or,
  sql,
  type SQL,
  cosineDistance,
} from 'drizzle-orm';
import { v4 } from 'uuid';
import { DIMENSION_MAP, type EmbeddingDimensionColumn } from './schema/embedding';
import {
  agentTable,
  cacheTable,
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
  taskTable,
  worldTable,
} from './schema/index';
import {} from 'drizzle-orm';

const DEFAULT_VECTOR_SIZE = VECTOR_DIMS.LARGE;

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
export abstract class BaseDrizzleAdapter extends DatabaseAdapter<any> {
  protected readonly maxRetries: number = 3;
  protected readonly baseDelay: number = 1000;
  protected readonly maxDelay: number = 10000;
  protected readonly jitterMax: number = 1000;
  protected embeddingDimension: EmbeddingDimensionColumn = DIMENSION_MAP[VECTOR_DIMS.SMALL];

  protected abstract withDatabase<T>(operation: () => Promise<T>): Promise<T>;
  public abstract init(): Promise<void>;
  public abstract close(): Promise<void>;

  /**
   * Initialize the database connection and ensure required tables exist.
   * Subclasses should call this from their init() method.
   */
  public async initialize(): Promise<void> {
    await this.ensureEmbeddingDimension(DEFAULT_VECTOR_SIZE);
  }

  public getDatabase(): any {
    return this.db;
  }

  protected agentId: UUID;
  protected readonly logger = logger;
  declare public db: any; // Declare base property from DatabaseAdapter

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
   * Asynchronously ensures that the given embedding dimension is valid for the agent.
   *
   * @param {number} dimension - The dimension to ensure for the embedding.
   * @returns {Promise<void>} - Resolves once the embedding dimension is ensured.
   */
  async ensureEmbeddingDimension(dimension: number) {
    return this.withDatabase(async () => {
      // Check if embeddings table exists
      const embeddingResult = await this.db
        .select()
        .from(embeddingTable)
        .limit(0)
        .catch(() => null);

      if (embeddingResult === null) {
        logger.warn('Embeddings table not available, skipping dimension check');
        return;
      }

      // If we have existing memories with embeddings, check the dimension used
      const existingMemory = await this.db
        .select()
        .from(memoryTable)
        .innerJoin(embeddingTable, eq(embeddingTable.memory_id, memoryTable.id))
        .where(eq(memoryTable.agent_id, this.agentId))
        .limit(1);

      if (existingMemory.length > 0) {
        // Find the first non-null embedding column
        const usedDimension = Object.entries(DIMENSION_MAP).find(
          ([_, colName]) => (existingMemory[0] as any).embeddings[colName] !== null
        );
        // We don't actually need to use usedDimension for now, but it's good to know it's there.
      }

      // Type-safe assignment
      const dimensionKey = Object.keys(VECTOR_DIMS).find(
        (key) => VECTOR_DIMS[key as keyof typeof VECTOR_DIMS] === dimension
      );

      if (!dimensionKey) {
        throw new Error(`Unsupported embedding dimension: ${dimension}`);
      }

      this.embeddingDimension = DIMENSION_MAP[dimension as keyof typeof DIMENSION_MAP];
    });
  }

  /**
   * Asynchronously retrieves an agent by their ID from the database.
   * @param {UUID} agentId - The ID of the agent to retrieve.
   * @returns {Promise<Agent | null>} A promise that resolves to the retrieved agent or null if not found.
   */
  async getAgent(agentId: UUID): Promise<Agent | null> {
    return this.withDatabase(async () => {
      const rows = await this.db
        .select()
        .from(agentTable)
        .where(eq(agentTable.id, agentId))
        .limit(1);

      if (rows.length === 0) return null;

      const row = rows[0];
      return {
        ...row,
        username: row.username || '',
        id: row.id as UUID,
        system: !row.system ? undefined : row.system,
        bio: !row.bio ? '' : row.bio,
        createdAt: row.created_at ? row.created_at.getTime() : Date.now(),
        updatedAt: row.updatedAt ? row.updatedAt.getTime() : Date.now(),
      };
    });
  }

  /**
   * Asynchronously retrieves a list of agents from the database.
   *
   * @returns {Promise<Partial<Agent>[]>} A Promise that resolves to an array of Agent objects.
   */
  async getAgents(): Promise<Partial<Agent>[]> {
    return this.withDatabase(async () => {
      const rows = await this.db
        .select({
          id: agentTable.id,
          name: agentTable.name,
          bio: agentTable.bio,
        })
        .from(agentTable);
      return rows.map((row: any) => ({
        ...row,
        id: row.id as UUID,
        bio: row.bio === null ? '' : row.bio,
      }));
    });
  }
  /**
   * Asynchronously creates a new agent record in the database.
   *
   * @param {Partial<Agent>} agent The agent object to be created.
   * @returns {Promise<boolean>} A promise that resolves to a boolean indicating the success of the operation.
   */
  async createAgent(agent: Agent): Promise<boolean> {
    return this.withDatabase(async () => {
      try {
        // Check for existing agent with the same ID or name
        // Check for existing agent with the same ID or name
        const conditions: (SQL<unknown> | undefined)[] = [];
        if (agent.id) {
          conditions.push(eq(agentTable.id, agent.id));
        }
        if (agent.name) {
          conditions.push(eq(agentTable.name, agent.name));
        }

        const existing =
          conditions.length > 0
            ? await this.db
                .select({ id: agentTable.id })
                .from(agentTable)
                .where(or(...conditions))
                .limit(1)
            : [];

        if (existing.length > 0) {
          logger.warn('Attempted to create an agent with a duplicate ID or name.', {
            id: agent.id,
            name: agent.name,
          });
          return false;
        }

        await this.db.transaction(async (tx: any) => {
          await tx.insert(agentTable).values({
            id: agent.id,
            enabled: agent.enabled,
            status: agent.status,
            name: agent.name,
            username: agent.username,
            system: agent.system,
            bio: agent.bio,
            message_examples: agent.messageExamples,
            post_examples: agent.postExamples,
            topics: agent.topics,
            knowledge: agent.knowledge,
            plugins: agent.plugins,
            settings: agent.settings,
            style: agent.style,
            created_at: new Date(agent.createdAt || Date.now()),
            updated_at: new Date(agent.updatedAt || Date.now()),
          });
        });

        logger.debug('Agent created successfully:', {
          agentId: agent.id,
        });
        return true;
      } catch (error) {
        logger.error('Error creating agent:', {
          error: error instanceof Error ? error.message : String(error),
          agentId: agent.id,
          agent,
        });
        return false;
      }
    });
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

        await this.db.transaction(async (tx: any) => {
          // Handle settings update if present
          if (agent?.settings) {
            agent.settings = await this.mergeAgentSettings(tx, agentId, agent.settings);
          }

          // Map camelCase interface fields to snake_case database columns
          const updateData: any = {};

          if (agent.enabled !== undefined) updateData.enabled = agent.enabled;
          if (agent.status !== undefined) updateData.status = agent.status;
          if (agent.name !== undefined) updateData.name = agent.name;
          if (agent.username !== undefined) updateData.username = agent.username;
          if (agent.system !== undefined) updateData.system = agent.system;
          if (agent.bio !== undefined) updateData.bio = agent.bio;
          if (agent.messageExamples !== undefined)
            updateData.message_examples = agent.messageExamples;
          if (agent.postExamples !== undefined) updateData.post_examples = agent.postExamples;
          if (agent.topics !== undefined) updateData.topics = agent.topics;
          if (agent.knowledge !== undefined) updateData.knowledge = agent.knowledge;
          if (agent.plugins !== undefined) updateData.plugins = agent.plugins;
          if (agent.settings !== undefined) updateData.settings = agent.settings;
          if (agent.style !== undefined) updateData.style = agent.style;

          // Handle timestamps
          if (agent.createdAt) {
            if (typeof agent.createdAt === 'number') {
              updateData.created_at = new Date(agent.createdAt);
            }
          }
          if (agent.updatedAt) {
            if (typeof agent.updatedAt === 'number') {
              updateData.updated_at = new Date(agent.updatedAt);
            } else {
              updateData.updated_at = new Date(); // Use current time if invalid
            }
          } else {
            updateData.updated_at = new Date(); // Always set updated_at to current time
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
          }
        } else {
          // Primitive or array value from source, assign it.
          output[key] = sourceValue;
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
        // Simply delete the agent - all related data will be cascade deleted
        const result = await this.db
          .delete(agentTable)
          .where(eq(agentTable.id, agentId))
          .returning();

        if (result.length === 0) {
          logger.warn(`[DB] Agent ${agentId} not found`);
          return false;
        }

        logger.success(
          `[DB] Agent ${agentId} and all related data successfully deleted via cascade`
        );
        return true;
      } catch (error) {
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
        const result = await this.db.select({ count: count() }).from(agentTable);

        return result[0]?.count || 0;
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
        await this.db.delete(agentTable);
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
   * Asynchronously retrieves an entity and its components by entity IDs.
   * @param {UUID[]} entityIds - The unique identifiers of the entities to retrieve.
   * @returns {Promise<Entity[] | null>} A Promise that resolves to the entity with its components if found, null otherwise.
   */
  async getEntityByIds(entityIds: UUID[]): Promise<Entity[] | null> {
    return this.withDatabase(async () => {
      if (!entityIds || entityIds.length === 0) {
        return [];
      }

      // Use explicit field selection to avoid drizzle auto-generating camelCase field names
      const results = await this.db
        .select({
          // Entity fields - explicitly map to avoid camelCase issues
          entity_id: entityTable.id,
          entity_agent_id: entityTable.agent_id,
          entity_names: entityTable.names,
          entity_metadata: entityTable.metadata,
          // Component fields - explicitly map with snake_case names
          component_id: componentTable.id,
          component_entity_id: componentTable.entity_id,
          component_agent_id: componentTable.agent_id,
          component_room_id: componentTable.room_id,
          component_world_id: componentTable.world_id,
          component_source_entity_id: componentTable.source_entity_id,
          component_type: componentTable.type,
          component_data: componentTable.data,
          component_created_at: componentTable.created_at,
        })
        .from(entityTable)
        .leftJoin(componentTable, eq(componentTable.entity_id, entityTable.id))
        .where(and(inArray(entityTable.id, entityIds), eq(entityTable.agent_id, this.agentId)));

      if (results.length === 0) return [];

      // Group results by entity
      const entityMap = new Map<UUID, Entity>();
      results.forEach((row: any) => {
        // Convert the row data from snake_case to camelCase
        const convertedRow = {
          entityId: row.entity_id,
          entityAgentId: row.entity_agent_id,
          entityNames: row.entity_names,
          entityMetadata: row.entity_metadata,
          componentId: row.component_id,
          componentEntityId: row.component_entity_id,
          componentAgentId: row.component_agent_id,
          componentRoomId: row.component_room_id,
          componentWorldId: row.component_world_id,
          componentSourceEntityId: row.component_source_entity_id,
          componentType: row.component_type,
          componentData: row.component_data,
          componentCreatedAt: row.component_created_at,
        };

        const entityId = convertedRow.entityId as UUID;
        if (!entityMap.has(entityId)) {
          entityMap.set(entityId, {
            id: entityId,
            agentId: convertedRow.entityAgentId as UUID,
            names: convertedRow.entityNames,
            metadata: convertedRow.entityMetadata || {},
            components: [],
          });
        }

        // Add component if it exists
        if (convertedRow.componentId) {
          const entity = entityMap.get(entityId)!;
          if (entity.components) {
            entity.components.push({
              id: convertedRow.componentId as UUID,
              entityId: convertedRow.componentEntityId as UUID,
              agentId: convertedRow.componentAgentId as UUID,
              roomId: convertedRow.componentRoomId as UUID,
              worldId: convertedRow.componentWorldId as UUID,
              sourceEntityId: convertedRow.componentSourceEntityId as UUID,
              type: convertedRow.componentType,
              data: convertedRow.componentData as any,
              createdAt: convertedRow.componentCreatedAt
                ? new Date(convertedRow.componentCreatedAt).getTime()
                : Date.now(),
            });
          }
        }
      });

      return Array.from(entityMap.values());
    });
  }

  /**
   * Asynchronously retrieves all entities for a given room, optionally including their components.
   * @param {UUID} roomId - The unique identifier of the room to get entities for
   * @param {boolean} [includeComponents] - Whether to include component data for each entity
   * @returns {Promise<Entity[]>} A Promise that resolves to an array of entities in the room
   */
  async getEntitiesForRoom(roomId: UUID, includeComponents?: boolean): Promise<Entity[]> {
    return this.withDatabase(async () => {
      // Use explicit field selection to avoid drizzle auto-generating camelCase field names
      const selectFields = {
        // Entity fields
        entity_id: entityTable.id,
        entity_agent_id: entityTable.agent_id,
        entity_names: entityTable.names,
        entity_metadata: entityTable.metadata,
        // Component fields - only if needed
        ...(includeComponents && {
          component_id: componentTable.id,
          component_entity_id: componentTable.entity_id,
          component_agent_id: componentTable.agent_id,
          component_room_id: componentTable.room_id,
          component_world_id: componentTable.world_id,
          component_source_entity_id: componentTable.source_entity_id,
          component_type: componentTable.type,
          component_data: componentTable.data,
          component_created_at: componentTable.created_at,
        }),
      };

      let query = this.db
        .select(selectFields)
        .from(participantTable)
        .leftJoin(
          entityTable,
          and(
            eq(participantTable.entity_id, entityTable.id),
            eq(entityTable.agent_id, this.agentId)
          )
        );

      if (includeComponents) {
        query = query.leftJoin(componentTable, eq(componentTable.entity_id, entityTable.id));
      }

      const result = await query.where(eq(participantTable.room_id, roomId));

      // Group components by entity if includeComponents is true
      const entitiesByIdMap = new Map<UUID, Entity>();

      for (const row of result) {
        if (!row.entity_id) continue;

        const entityId = row.entity_id as UUID;
        if (!entitiesByIdMap.has(entityId)) {
          const entity: Entity = {
            id: entityId,
            agentId: row.entity_agent_id as UUID,
            names: row.entity_names,
            metadata: row.entity_metadata as { [key: string]: any },
            components: includeComponents ? [] : undefined,
          };
          entitiesByIdMap.set(entityId, entity);
        }

        if (includeComponents && row.component_id) {
          const entity = entitiesByIdMap.get(entityId);
          if (entity && entity.components) {
            entity.components.push({
              id: row.component_id as UUID,
              entityId: row.component_entity_id as UUID,
              agentId: row.component_agent_id as UUID,
              roomId: row.component_room_id as UUID,
              worldId: row.component_world_id as UUID,
              sourceEntityId: row.component_source_entity_id as UUID,
              type: row.component_type,
              data: row.component_data as any,
              createdAt: row.component_created_at
                ? new Date(row.component_created_at).getTime()
                : Date.now(),
            });
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
        return await this.db.transaction(async (tx: any) => {
          // Map Entity objects to database table format
          const entityValues = entities.map((entity) => ({
            id: entity.id,
            agent_id: entity.agentId, // Map agentId to agent_id
            names: entity.names,
            metadata: entity.metadata || {},
            created_at: new Date(),
            updated_at: new Date(),
          }));

          await tx.insert(entityTable).values(entityValues);

          logger.debug(`${entities.length} Entities created successfully`);

          return true;
        });
      } catch (error) {
        // Check if this is a primary key constraint violation (duplicate entity)
        const errorMessage = error instanceof Error ? error.message : String(error);

        // For debugging: always log the full error details for constraint issues
        logger.warn('Entity creation error - analyzing for constraint violations:', {
          errorMessage,
          errorType: error?.constructor?.name,
          entityId: entities[0]?.id,
          fullError: error,
        });

        // PostgreSQL error codes for unique/primary key violations
        if (
          errorMessage.includes('duplicate key value violates unique constraint') ||
          errorMessage.includes('unique_violation') ||
          errorMessage.includes('23505') || // PostgreSQL unique violation error code
          errorMessage.includes('UNIQUE constraint failed') || // SQLite unique constraint error
          errorMessage.includes('PRIMARY KEY must be unique') // Another SQLite variant
        ) {
          logger.debug('Entity creation failed due to duplicate key constraint:', {
            entityId: entities[0]?.id,
            error: errorMessage,
          });
          return false;
        }

        logger.error('Error creating entity:', {
          error: errorMessage,
          entityId: entities[0]?.id,
          entity: entities[0],
        });
        // trace the error
        logger.trace(error instanceof Error ? error.stack || error.message : String(error));
        return false;
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
      const existingEntities = await this.getEntityByIds([entity.id]);

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
      // Convert entity to database format with proper case conversion
      await this.db
        .update(entityTable)
        .set({
          agent_id: entity.agentId,
          names: entity.names,
          metadata: entity.metadata,
          updated_at: new Date(),
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
      await this.db.transaction(async (tx: any) => {
        await tx
          .delete(componentTable)
          .where(
            or(
              eq(componentTable.entity_id, entityId),
              eq(componentTable.source_entity_id, entityId)
            )
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
      if (params.names.length === 0) return [];

      // Use OR conditions for each name
      const nameConditions = params.names.map(
        (name) => sql`LOWER(${entityTable.names}::text) LIKE '%' || LOWER(${name}) || '%'`
      );

      const rows = await this.db
        .select()
        .from(entityTable)
        .where(and(eq(entityTable.agent_id, params.agentId), or(...nameConditions)));

      return rows.map(
        (row: any) =>
          ({
            ...row,
            id: row.id as UUID,
            agentId: row.agent_id as UUID,
            metadata: row.metadata as { [key: string]: any },
          }) as Entity
      );
    });
  }

  /**
   * Asynchronously searches for entities by name.
   * @param params - The search parameters.
   * @param params.query - The search query string.
   * @param params.agentId - The agent ID to search within.
   * @param params.limit - The maximum number of results to return.
   * @returns A Promise that resolves to an array of entities matching the search criteria.
   */
  async searchEntitiesByName(params: {
    query: string;
    agentId: UUID;
    limit?: number;
  }): Promise<Entity[]> {
    return this.withDatabase(async () => {
      const searchCondition = sql`LOWER(${entityTable.names}::text) LIKE '%' || LOWER(${params.query}) || '%'`;

      const query = this.db
        .select()
        .from(entityTable)
        .where(and(eq(entityTable.agent_id, params.agentId), searchCondition));

      if (params.limit) {
        query.limit(params.limit);
      }

      const rows = await query;

      return rows.map(
        (row: any) =>
          ({
            ...row,
            id: row.id as UUID,
            agentId: row.agent_id as UUID,
            metadata: row.metadata as { [key: string]: any },
          }) as Entity
      );
    });
  }

  async getComponent(
    entityId: UUID,
    type: string,
    worldId?: UUID,
    sourceEntityId?: UUID
  ): Promise<Component | null> {
    return this.withDatabase(async () => {
      const conditions = [eq(componentTable.entity_id, entityId), eq(componentTable.type, type)];

      if (worldId) {
        conditions.push(eq(componentTable.world_id, worldId));
      }

      if (sourceEntityId) {
        conditions.push(eq(componentTable.source_entity_id, sourceEntityId));
      }

      const result = await this.db
        .select()
        .from(componentTable)
        .where(and(...conditions))
        .limit(1);

      if (result.length === 0) return null;

      const component = result[0];
      return {
        ...component,
        id: component.id as UUID,
        entityId: component.entity_id as UUID,
        agentId: component.agent_id as UUID,
        roomId: component.room_id as UUID,
        worldId: component.world_id as UUID | undefined,
        sourceEntityId: component.source_entity_id as UUID | undefined,
        data: component.data as any,
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
      const conditions = [eq(componentTable.entity_id, entityId)];

      if (worldId) {
        conditions.push(eq(componentTable.world_id, worldId));
      }

      if (sourceEntityId) {
        conditions.push(eq(componentTable.source_entity_id, sourceEntityId));
      }

      const result = await this.db
        .select({
          id: componentTable.id,
          entityId: componentTable.entity_id,
          type: componentTable.type,
          data: componentTable.data,
          worldId: componentTable.world_id,
          agentId: componentTable.agent_id,
          roomId: componentTable.room_id,
          sourceEntityId: componentTable.source_entity_id,
          createdAt: componentTable.created_at,
        })
        .from(componentTable)
        .where(and(...conditions));

      if (result.length === 0) return [];

      const components = result.map((component: any) => ({
        ...component,
        id: component.id as UUID,
        entityId: component.entity_id as UUID,
        agentId: component.agent_id as UUID,
        roomId: component.room_id as UUID,
        worldId: (component.world_id ?? '') as UUID,
        sourceEntityId: (component.source_entity_id ?? '') as UUID,
        data: component.data as { [key: string]: any },
        createdAt: component.created_at.getTime(),
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
        id: component.id,
        entity_id: component.entityId,
        agent_id: component.agentId,
        room_id: component.roomId,
        world_id: component.worldId,
        source_entity_id: component.sourceEntityId,
        type: component.type,
        data: component.data,
        created_at: new Date(component.createdAt),
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
          entity_id: component.entityId,
          agent_id: component.agentId,
          room_id: component.roomId,
          world_id: component.worldId,
          source_entity_id: component.sourceEntityId,
          type: component.type,
          data: component.data,
          created_at: new Date(component.createdAt),
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
    const { entityId, agentId, roomId, worldId, tableName, unique, start, end } = params;

    if (!tableName) throw new Error('tableName is required');

    return this.withDatabase(async () => {
      const conditions = [eq(memoryTable.type, tableName)];

      if (start) {
        conditions.push(gte(memoryTable.created_at, new Date(start)));
      }

      if (entityId) {
        conditions.push(eq(memoryTable.entity_id, entityId));
      }

      if (roomId) {
        conditions.push(eq(memoryTable.room_id, roomId));
      }

      // Add worldId condition
      if (worldId) {
        conditions.push(eq(memoryTable.world_id, worldId));
      }

      if (end) {
        conditions.push(lte(memoryTable.created_at, new Date(end)));
      }

      if (unique) {
        conditions.push(eq(memoryTable.unique, true));
      }

      if (agentId) {
        conditions.push(eq(memoryTable.agent_id, agentId));
      }

      const query = this.db
        .select({
          memory: {
            id: memoryTable.id,
            type: memoryTable.type,
            createdAt: memoryTable.created_at,
            content: memoryTable.content,
            entityId: memoryTable.entity_id,
            agentId: memoryTable.agent_id,
            roomId: memoryTable.room_id,
            unique: memoryTable.unique,
            metadata: memoryTable.metadata,
          },
          embedding: embeddingTable[this.embeddingDimension],
        })
        .from(memoryTable)
        .leftJoin(embeddingTable, eq(embeddingTable.memory_id, memoryTable.id))
        .where(and(...conditions))
        .orderBy(desc(memoryTable.created_at));

      const rows = params.count ? await query.limit(params.count) : await query;

      return rows.map((row: any) => ({
        id: row.memory.id as UUID,
        type: row.memory.type,
        createdAt: row.memory.createdAt.getTime(),
        content:
          typeof row.memory.content === 'string'
            ? JSON.parse(row.memory.content)
            : row.memory.content,
        entityId: row.memory.entityId as UUID,
        agentId: row.memory.agentId as UUID,
        roomId: row.memory.roomId as UUID,
        unique: row.memory.unique,
        metadata: row.memory.metadata as MemoryMetadata,
        embedding: row.embedding ? Array.from(row.embedding) : undefined,
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
  async getMemoriesByRoomIds({
    roomIds,
    tableName = 'memories',
  }: {
    roomIds: UUID[];
    tableName?: string;
  }): Promise<Memory[]> {
    return this.withDatabase(async () => {
      const rows = await this.db
        .select()
        .from(memoryTable)
        .where(inArray(memoryTable.room_id, roomIds))
        .orderBy(desc(memoryTable.created_at));

      return rows.map((row: any) => ({
        id: row.id as UUID,
        createdAt: row.created_at ? new Date(row.created_at).getTime() : Date.now(),
        content: typeof row.content === 'string' ? JSON.parse(row.content) : row.content,
        entityId: row.entity_id as UUID,
        agentId: row.agent_id as UUID,
        roomId: row.room_id as UUID,
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
      const result = await this.db
        .select({
          memory: memoryTable,
          embedding: embeddingTable[this.embeddingDimension],
        })
        .from(memoryTable)
        .leftJoin(embeddingTable, eq(memoryTable.id, embeddingTable.memory_id))
        .where(eq(memoryTable.id, id))
        .limit(1);

      if (result.length === 0) return null;

      const row = result[0];
      return {
        id: row.memory.id as UUID,
        createdAt: row.memory.created_at.getTime(),
        content:
          typeof row.memory.content === 'string'
            ? JSON.parse(row.memory.content)
            : row.memory.content,
        entityId: row.memory.entity_id as UUID,
        agentId: row.memory.agent_id as UUID,
        roomId: row.memory.room_id as UUID,
        unique: row.memory.unique,
        metadata: row.memory.metadata as MemoryMetadata,
        embedding: row.embedding ?? undefined,
      };
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

      const rows = await this.db
        .select({
          memory: memoryTable,
          embedding: embeddingTable[this.embeddingDimension],
        })
        .from(memoryTable)
        .leftJoin(embeddingTable, eq(embeddingTable.memory_id, memoryTable.id))
        .where(and(...conditions))
        .orderBy(desc(memoryTable.created_at));

      return rows.map((row: any) => ({
        id: row.memory.id as UUID,
        createdAt: row.memory.created_at.getTime(),
        content:
          typeof row.memory.content === 'string'
            ? JSON.parse(row.memory.content)
            : row.memory.content,
        entityId: row.memory.entity_id as UUID,
        agentId: row.memory.agent_id as UUID,
        roomId: row.memory.room_id as UUID,
        unique: row.memory.unique,
        metadata: row.memory.metadata as MemoryMetadata,
        embedding: row.embedding ?? undefined,
      }));
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
          .map((row: any) => ({
            embedding: Array.isArray(row.embedding)
              ? row.embedding
              : typeof row.embedding === 'string'
                ? JSON.parse(row.embedding)
                : [],
            levenshtein_score: Number(row.levenshtein_score),
          }))
          .filter((row: any) => Array.isArray(row.embedding));
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
        throw error;
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

        await this.db.transaction(async (tx: any) => {
          await tx.insert(logTable).values({
            body: sql`${jsonString}::jsonb`,
            entity_id: params.entityId,
            room_id: params.roomId,
            agent_id: this.agentId,
            type: params.type,
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
        return value.map((item: any) => this.sanitizeJsonObject(item, seen));
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
            eq(logTable.entity_id, entityId),
            roomId ? eq(logTable.room_id, roomId) : undefined,
            type ? eq(logTable.type, type) : undefined
          )
        )
        .orderBy(desc(logTable.created_at))
        .limit(count ?? 10)
        .offset(offset ?? 0);

      const logs = result.map((log: any) => ({
        ...log,
        id: log.id as UUID,
        entityId: log.entity_id as UUID,
        roomId: log.room_id as UUID,
        body: log.body as { [key: string]: unknown },
        createdAt: new Date(log.created_at),
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
      const cleanVector = embedding.map((n: number) =>
        Number.isFinite(n) ? Number(n.toFixed(6)) : 0
      );

      const similarity = sql<number>`1 - (${cosineDistance(
        embeddingTable[this.embeddingDimension],
        cleanVector
      )})`;

      const conditions = [eq(memoryTable.type, params.tableName)];

      if (params.unique) {
        conditions.push(eq(memoryTable.unique, true));
      }

      conditions.push(eq(memoryTable.agent_id, this.agentId));

      // Add filters based on direct params
      if (params.roomId) {
        conditions.push(eq(memoryTable.room_id, params.roomId));
      }
      if (params.worldId) {
        conditions.push(eq(memoryTable.world_id, params.worldId));
      }
      if (params.entityId) {
        conditions.push(eq(memoryTable.entity_id, params.entityId));
      }

      if (params.match_threshold) {
        conditions.push(gte(similarity, params.match_threshold));
      }

      const results = await this.db
        .select({
          memory: memoryTable,
          similarity,
          embedding: embeddingTable[this.embeddingDimension],
        })
        .from(embeddingTable)
        .innerJoin(memoryTable, eq(memoryTable.id, embeddingTable.memory_id))
        .where(and(...conditions))
        .orderBy(desc(similarity))
        .limit(params.count ?? 10);

      return results.map((row: any) => ({
        id: row.memory.id as UUID,
        type: row.memory.type,
        createdAt: row.memory.created_at.getTime(),
        content:
          typeof row.memory.content === 'string'
            ? JSON.parse(row.memory.content)
            : row.memory.content,
        entityId: row.memory.entity_id as UUID,
        agentId: row.memory.agent_id as UUID,
        roomId: row.memory.room_id as UUID,
        worldId: row.memory.world_id as UUID | undefined,
        unique: row.memory.unique,
        metadata: row.memory.metadata as MemoryMetadata,
        embedding: row.embedding ?? undefined,
        similarity: row.similarity,
      }));
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
        tableName,
        // Use the scope fields from the memory object for similarity check
        roomId: memory.roomId,
        worldId: memory.worldId,
        entityId: memory.entityId,
        match_threshold: 0.95,
        count: 1,
      });
      isUnique = similarMemories.length === 0;
    }

    const contentToInsert =
      typeof memory.content === 'string' ? JSON.parse(memory.content) : memory.content;

    await this.db.transaction(async (tx: any) => {
      await tx.insert(memoryTable).values([
        {
          id: memoryId,
          type: tableName,
          content: sql`${contentToInsert}::jsonb`,
          metadata: sql`${memory.metadata || {}}::jsonb`,
          entity_id: memory.entityId,
          room_id: memory.roomId,
          world_id: memory.worldId,
          agent_id: memory.agentId || this.agentId,
          unique: memory.unique ?? isUnique,
          created_at: memory.createdAt ? new Date(memory.createdAt) : new Date(),
        },
      ]);

      if (memory.embedding && Array.isArray(memory.embedding)) {
        const embeddingValues: Record<string, unknown> = {
          id: v4(),
          memory_id: memoryId,
          created_at: memory.createdAt ? new Date(memory.createdAt) : new Date(),
        };

        const cleanVector = memory.embedding.map((n: number) =>
          Number.isFinite(n) ? Number(n.toFixed(6)) : 0
        );

        embeddingValues[this.embeddingDimension] = cleanVector;

        await tx.insert(embeddingTable).values([embeddingValues]);
      }
    });

    return memoryId;
  }

  /**
   * Updates an existing memory in the database
   * @param memory The memory object with updated values
   * @returns A Promise that resolves to a boolean indicating success
   */
  async updateMemory(
    memory: Partial<Memory> & { id: UUID; metadata?: MemoryMetadata }
  ): Promise<boolean> {
    return this.withDatabase(async () => {
      try {
        const contentToUpdate = memory.content
          ? typeof memory.content === 'string'
            ? JSON.parse(memory.content)
            : memory.content
          : undefined;

        await this.db.transaction(async (tx: any) => {
          const updateData: any = {};

          if (contentToUpdate !== undefined) {
            updateData.content = sql`${contentToUpdate}::jsonb`;
          }
          if (memory.metadata !== undefined) {
            updateData.metadata = sql`${memory.metadata || {}}::jsonb`;
          }
          if (memory.entityId !== undefined) {
            updateData.entity_id = memory.entityId;
          }
          if (memory.roomId !== undefined) {
            updateData.room_id = memory.roomId;
          }
          if (memory.worldId !== undefined) {
            updateData.world_id = memory.worldId;
          }
          if (memory.unique !== undefined) {
            updateData.unique = memory.unique;
          }

          await tx.update(memoryTable).set(updateData).where(eq(memoryTable.id, memory.id));

          // Update embedding if provided
          if (memory.embedding && Array.isArray(memory.embedding)) {
            const cleanVector = memory.embedding.map((n: number) =>
              Number.isFinite(n) ? Number(n.toFixed(6)) : 0
            );

            const embeddingValues: Record<string, unknown> = {
              [this.embeddingDimension]: cleanVector,
            };

            await tx
              .update(embeddingTable)
              .set(embeddingValues)
              .where(eq(embeddingTable.memory_id, memory.id));
          }
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
   * Deletes a memory from the database
   * @param memoryId The ID of the memory to delete
   * @returns A Promise that resolves when the memory is deleted
   */
  async deleteMemory(memoryId: UUID): Promise<void> {
    await this.withDatabase(async () => {
      const deleted = await this.withRetry(async () => {
        try {
          await this.db.transaction(async (tx: any) => {
            // Delete embedding first due to foreign key
            await tx.delete(embeddingTable).where(eq(embeddingTable.memory_id, memoryId));
            // Delete memory
            await tx.delete(memoryTable).where(eq(memoryTable.id, memoryId));
          });
          return true;
        } catch (error) {
          logger.error('Error deleting memory:', {
            error: error instanceof Error ? error.message : String(error),
            memoryId,
          });
          return false;
        }
      });
      if (!deleted) {
        throw new Error(`Failed to delete memory ${memoryId}`);
      }
    });
  }

  /**
   * Deletes multiple memories from the database
   * @param memoryIds Array of memory IDs to delete
   * @returns A Promise that resolves when the memories are deleted
   */
  async deleteManyMemories(memoryIds: UUID[]): Promise<void> {
    if (!memoryIds || memoryIds.length === 0) return;

    await this.withDatabase(async () => {
      const deleted = await this.withRetry(async () => {
        try {
          await this.db.transaction(async (tx: any) => {
            // Delete embeddings first due to foreign key
            await tx.delete(embeddingTable).where(inArray(embeddingTable.memory_id, memoryIds));
            // Delete memories
            await tx.delete(memoryTable).where(inArray(memoryTable.id, memoryIds));
          });
          return true;
        } catch (error) {
          logger.error('Error deleting memories:', {
            error: error instanceof Error ? error.message : String(error),
            count: memoryIds.length,
          });
          return false;
        }
      });
      if (!deleted) {
        throw new Error(`Failed to delete ${memoryIds.length} memories`);
      }
    });
  }

  /**
   * Deletes all memories for a specific room and table
   * @param roomId The room ID
   * @param tableName The table name
   * @returns A Promise that resolves when the memories are deleted
   */
  async deleteAllMemories(roomId: UUID, tableName: string): Promise<void> {
    await this.withDatabase(async () => {
      const deleted = await this.withRetry(async () => {
        try {
          const conditions = [eq(memoryTable.room_id, roomId), eq(memoryTable.type, tableName)];

          // Get memory IDs to delete embeddings
          const memoriesToDelete = await this.db
            .select({ id: memoryTable.id })
            .from(memoryTable)
            .where(and(...conditions));

          if (memoriesToDelete.length > 0) {
            const memoryIds = memoriesToDelete.map((m: any) => m.id);
            await this.db.transaction(async (tx: any) => {
              // Delete embeddings first
              await tx.delete(embeddingTable).where(inArray(embeddingTable.memory_id, memoryIds));
              // Delete memories
              await tx.delete(memoryTable).where(and(...conditions));
            });
          }
          return true;
        } catch (error) {
          logger.error('Error deleting all memories:', {
            error: error instanceof Error ? error.message : String(error),
            roomId,
            tableName,
          });
          return false;
        }
      });
      if (!deleted) {
        throw new Error(`Failed to delete all memories for room ${roomId} and table ${tableName}`);
      }
    });
  }

  /**
   * Counts memories based on the provided parameters
   * @param roomId The room ID
   * @param unique Whether to count only unique memories
   * @param tableName The table name
   * @returns A Promise that resolves to the count of memories
   */
  async countMemories(roomId: UUID, unique?: boolean, tableName?: string): Promise<number> {
    return this.withDatabase(async () => {
      try {
        const conditions = [
          eq(memoryTable.room_id, roomId),
          eq(memoryTable.agent_id, this.agentId),
        ];

        if (tableName) {
          conditions.push(eq(memoryTable.type, tableName));
        }
        if (unique !== undefined) {
          conditions.push(eq(memoryTable.unique, unique));
        }

        const result = await this.db
          .select({ count: count() })
          .from(memoryTable)
          .where(and(...conditions));

        return result[0]?.count || 0;
      } catch (error) {
        logger.error('Error counting memories:', {
          error: error instanceof Error ? error.message : String(error),
          roomId,
          unique,
          tableName,
        });
        return 0;
      }
    });
  }

  async addParticipant(entityId: UUID, roomId: UUID): Promise<boolean> {
    return this.withDatabase(async () => {
      try {
        // Check if we're using PostgreSQL (but not PGLite)
        const isPostgres = this.constructor.name === 'PgDatabaseAdapter';

        if (isPostgres) {
          // For PostgreSQL, use raw SQL to handle the unique constraint properly
          const { sql } = await import('drizzle-orm');
          const { v4 } = await import('uuid');
          const participantId = v4() as UUID;

          const query = sql`
            INSERT INTO participants (id, entity_id, room_id, agent_id, created_at)
            VALUES (
              ${participantId},
              ${entityId},
              ${roomId},
              ${this.agentId || null},
              ${sql.raw('NOW()')}
            )
          `;

          await this.db.execute(query);
        } else {
          // For other databases, use the standard insert
          await this.db
            .insert(participantTable)
            .values({
              entity_id: entityId,
              room_id: roomId,
              agent_id: this.agentId,
            })
            .onConflictDoNothing();
        }
        return true;
      } catch (error) {
        logger.error('Error adding participant', {
          error: error instanceof Error ? error.message : String(error),
          stack: error instanceof Error ? error.stack : undefined,
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
        const values = entityIds.map((id: UUID) => ({
          entity_id: id,
          room_id: roomId,
          agent_id: this.agentId,
          created_at: new Date(),
        }));
        await this.db.insert(participantTable).values(values).onConflictDoNothing().execute();
        logger.debug(`${entityIds.length} Entities linked successfully`);
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
   * Retrieves a world by its ID
   * @param worldId The ID of the world to retrieve
   * @returns A Promise that resolves to the world or null if not found
   */
  async getWorld(worldId: UUID): Promise<World | null> {
    return this.withDatabase(async () => {
      const rows = await this.db
        .select()
        .from(worldTable)
        .where(eq(worldTable.id, worldId))
        .limit(1);

      if (rows.length === 0) return null;

      const row = rows[0];
      return {
        ...row,
        id: row.id as UUID,
        metadata: row.metadata as { [key: string]: any },
        createdAt: row.created_at ? new Date(row.created_at).getTime() : Date.now(),
        updatedAt: row.updated_at ? new Date(row.updated_at).getTime() : undefined,
      };
    });
  }

  /**
   * Creates a new world in the database
   * @param world The world object to create
   * @returns A Promise that resolves to the world ID
   */
  async createWorld(world: World): Promise<UUID> {
    return this.withDatabase(async () => {
      try {
        const worldId = world.id || (v4() as UUID);
        await this.db.insert(worldTable).values({
          id: worldId,
          agent_id: world.agentId,
          name: world.name,
          metadata: world.metadata || null,
          server_id: world.serverId || 'local',
          created_at: new Date(Date.now()),
        });
        return worldId;
      } catch (error) {
        logger.error('Error creating world:', {
          error: error instanceof Error ? error.message : String(error),
          worldId: world.id,
        });
        throw error;
      }
    });
  }

  /**
   * Updates an existing world
   * @param world The world object with updated values
   * @returns A Promise that resolves when the world is updated
   */
  async updateWorld(world: World): Promise<void> {
    await this.withDatabase(async () => {
      try {
        await this.db
          .update(worldTable)
          .set({
            agent_id: world.agentId,
            name: world.name,
            metadata: world.metadata,
            server_id: world.serverId,
            updated_at: new Date(),
          })
          .where(eq(worldTable.id, world.id));
      } catch (error) {
        logger.error('Error updating world:', {
          error: error instanceof Error ? error.message : String(error),
          worldId: world.id,
        });
        throw error;
      }
    });
  }

  /**
   * Deletes a world from the database
   * @param worldId The ID of the world to delete
   * @returns A Promise that resolves to a boolean indicating success
   */
  async deleteWorld(worldId: UUID): Promise<boolean> {
    return this.withDatabase(async () => {
      try {
        const result = await this.db
          .delete(worldTable)
          .where(eq(worldTable.id, worldId))
          .returning();
        return result.length > 0;
      } catch (error) {
        logger.error('Error deleting world:', {
          error: error instanceof Error ? error.message : String(error),
          worldId,
        });
        return false;
      }
    });
  }

  /**
   * Removes a world from the database (alias for deleteWorld)
   * @param id The ID of the world to remove
   * @returns A Promise that resolves when the world is removed
   */
  async removeWorld(id: UUID): Promise<void> {
    const deleted = await this.deleteWorld(id);
    if (!deleted) {
      throw new Error(`Failed to remove world ${id}`);
    }
  }

  /**
   * Retrieves all worlds from the database
   * @returns A Promise that resolves to an array of worlds
   */
  async getAllWorlds(): Promise<World[]> {
    return this.withDatabase(async () => {
      const rows = await this.db.select().from(worldTable);
      return rows.map((row: any) => ({
        ...row,
        id: row.id as UUID,
        metadata: row.metadata as { [key: string]: any },
        createdAt: row.created_at ? new Date(row.created_at).getTime() : Date.now(),
        updatedAt: row.updated_at ? new Date(row.updated_at).getTime() : undefined,
      }));
    });
  }

  /**
   * Retrieve worlds for an agent with optional filtering and pagination
   * @param params Query parameters including agentId and filtering options
   * @returns Promise resolving to an array of World objects
   */
  async getWorlds(params: {
    agentId: UUID;
    serverId?: string;
    name?: string;
    activeOnly?: boolean;
    limit?: number;
    offset?: number;
    orderBy?: 'name' | 'createdAt' | 'lastActivityAt';
    orderDirection?: 'asc' | 'desc';
  }): Promise<World[]> {
    return this.withDatabase(async () => {
      const conditions = [eq(worldTable.agent_id, params.agentId)];

      if (params.serverId) {
        conditions.push(eq(worldTable.server_id, params.serverId));
      }

      if (params.name) {
        conditions.push(sql`LOWER(${worldTable.name}) LIKE LOWER('%' || ${params.name} || '%')`);
      }

      let query = this.db
        .select()
        .from(worldTable)
        .where(and(...conditions));

      // Apply ordering
      if (params.orderBy) {
        const orderColumn = params.orderBy === 'name' ? worldTable.name : worldTable.created_at;
        query =
          params.orderDirection === 'desc'
            ? query.orderBy(desc(orderColumn))
            : query.orderBy(orderColumn);
      }

      // Apply pagination
      if (params.limit) {
        query = query.limit(params.limit);
      }
      if (params.offset) {
        query = query.offset(params.offset);
      }

      const rows = await query;

      return rows.map((row: any) => ({
        ...row,
        id: row.id as UUID,
        agentId: row.agent_id as UUID,
        serverId: row.server_id,
        metadata: row.metadata as { [key: string]: any },
      }));
    });
  }

  /**
   * Retrieves a room by its ID
   * @param roomId The ID of the room to retrieve
   * @returns A Promise that resolves to the room or null if not found
   */
  async getRoom(roomId: UUID): Promise<Room | null> {
    return this.withDatabase(async () => {
      const rows = await this.db.select().from(roomTable).where(eq(roomTable.id, roomId)).limit(1);

      if (rows.length === 0) return null;

      const row = rows[0];
      return {
        ...row,
        id: row.id as UUID,
        agentId: row.agent_id as UUID,
        metadata: row.metadata as RoomMetadata,
        createdAt: row.created_at ? new Date(row.created_at).getTime() : Date.now(),
        updatedAt: row.updated_at ? new Date(row.updated_at).getTime() : undefined,
      };
    });
  }

  /**
   * Retrieves all rooms for an agent
   * @param agentId The ID of the agent
   * @returns A Promise that resolves to an array of rooms
   */
  async getRooms(agentId: UUID): Promise<Room[]> {
    return this.withDatabase(async () => {
      const rows = await this.db.select().from(roomTable).where(eq(roomTable.agent_id, agentId));

      return rows.map((row: any) => ({
        ...row,
        id: row.id as UUID,
        agentId: row.agent_id as UUID,
        metadata: row.metadata as RoomMetadata,
        createdAt: row.created_at ? new Date(row.created_at).getTime() : Date.now(),
        updatedAt: row.updated_at ? new Date(row.updated_at).getTime() : undefined,
      }));
    });
  }

  /**
   * Retrieves rooms by their IDs
   * @param roomIds The IDs of the rooms to retrieve
   * @returns A Promise that resolves to an array of rooms or null
   */
  async getRoomsByIds(roomIds: UUID[]): Promise<Room[] | null> {
    return this.withDatabase(async () => {
      if (!roomIds || roomIds.length === 0) return [];

      const rows = await this.db.select().from(roomTable).where(inArray(roomTable.id, roomIds));

      if (rows.length === 0) return [];

      return rows.map((row: any) => ({
        ...row,
        id: row.id as UUID,
        agentId: row.agent_id as UUID,
        metadata: row.metadata as RoomMetadata,
        createdAt: row.created_at ? new Date(row.created_at).getTime() : Date.now(),
        updatedAt: row.updated_at ? new Date(row.updated_at).getTime() : undefined,
      }));
    });
  }

  /**
   * Retrieves all rooms for a world
   * @param worldId The ID of the world
   * @returns A Promise that resolves to an array of rooms
   */
  async getRoomsByWorld(worldId: UUID): Promise<Room[]> {
    return this.withDatabase(async () => {
      const rows = await this.db.select().from(roomTable).where(eq(roomTable.world_id, worldId));

      return rows.map((row: any) => ({
        ...row,
        id: row.id as UUID,
        agentId: row.agent_id as UUID,
        worldId: row.world_id as UUID,
        metadata: row.metadata as RoomMetadata,
        createdAt: row.created_at ? new Date(row.created_at).getTime() : Date.now(),
        updatedAt: row.updated_at ? new Date(row.updated_at).getTime() : undefined,
      }));
    });
  }

  /**
   * Retrieves room IDs for a participant
   * @param entityId The ID of the entity
   * @returns A Promise that resolves to an array of room IDs
   */
  async getRoomsForParticipant(entityId: UUID): Promise<UUID[]> {
    return this.withDatabase(async () => {
      const rows = await this.db
        .select({ room_id: participantTable.room_id })
        .from(participantTable)
        .where(
          and(eq(participantTable.entity_id, entityId), eq(participantTable.agent_id, this.agentId))
        );

      return rows.map((row: any) => row.room_id as UUID);
    });
  }

  /**
   * Creates a new room
   * @param room The room object to create
   * @returns A Promise that resolves to a boolean indicating success
   */
  async createRoom(room: Room): Promise<boolean> {
    return this.withDatabase(async () => {
      try {
        await this.db.insert(roomTable).values({
          id: room.id,
          name: room.name,
          agent_id: room.agentId,
          source: room.source,
          type: room.type,
          channel_id: room.channelId,
          server_id: room.serverId,
          world_id: room.worldId,
          metadata: room.metadata || {},
          created_at: new Date(),
          updated_at: new Date(),
        });
        return true;
      } catch (error) {
        logger.error('Error creating room:', {
          error: error instanceof Error ? error.message : String(error),
          roomId: room.id,
        });
        return false;
      }
    });
  }

  /**
   * Creates multiple rooms
   * @param rooms The room objects to create
   * @returns A Promise that resolves to an array of room IDs
   */
  async createRooms(rooms: Room[]): Promise<UUID[]> {
    return this.withDatabase(async () => {
      try {
        const roomIds = rooms.map((room) => room.id || (v4() as UUID));
        const values = rooms.map((room, index) => ({
          id: roomIds[index],
          name: room.name,
          agent_id: room.agentId,
          source: room.source,
          type: room.type,
          channel_id: room.channelId,
          server_id: room.serverId,
          world_id: room.worldId,
          metadata: room.metadata || {},
          created_at: new Date(),
          updated_at: new Date(),
        }));

        // Check if we're using PostgreSQL by looking at the adapter class name
        const isPostgres = this.constructor.name.includes('Pg');
        logger.info(
          `[BaseDrizzleAdapter] createRooms - adapter type: ${this.constructor.name}, isPostgres: ${isPostgres}`
        );

        if (isPostgres) {
          // For PostgreSQL, handle JSONB columns and enum types differently
          const { sql } = await import('drizzle-orm');
          for (const room of values) {
            await this.db.execute(sql`
              INSERT INTO rooms (id, name, agent_id, source, type, channel_id, server_id, world_id, metadata, created_at, updated_at)
              VALUES (
                ${room.id},
                ${room.name || null},
                ${room.agent_id},
                ${room.source},
                ${room.type || 'DM'},
                ${room.channel_id || null},
                ${room.server_id || null},
                ${room.world_id || null},
                ${JSON.stringify(room.metadata || {})}::jsonb,
                ${room.created_at},
                ${room.updated_at}
              )
              ON CONFLICT (id) DO UPDATE SET
                name = EXCLUDED.name,
                metadata = EXCLUDED.metadata,
                updated_at = EXCLUDED.updated_at
            `);
          }
        } else {
          // For other databases, use the standard insert
          await this.db.insert(roomTable).values(values);
        }
        return roomIds;
      } catch (error) {
        logger.error('Error creating rooms:', {
          error: error instanceof Error ? error.message : String(error),
          count: rooms.length,
        });
        throw error;
      }
    });
  }

  /**
   * Updates an existing room
   * @param room The room object with updated values
   * @returns A Promise that resolves when the room is updated
   */
  async updateRoom(room: Room): Promise<void> {
    await this.withDatabase(async () => {
      try {
        await this.db
          .update(roomTable)
          .set({
            ...room,
            agent_id: room.agentId,
            updated_at: new Date(),
          })
          .where(eq(roomTable.id, room.id));
      } catch (error) {
        logger.error('Error updating room:', {
          error: error instanceof Error ? error.message : String(error),
          roomId: room.id,
        });
        throw error;
      }
    });
  }

  /**
   * Deletes a room from the database
   * @param roomId The ID of the room to delete
   * @returns A Promise that resolves when the room is deleted
   */
  async deleteRoom(roomId: UUID): Promise<void> {
    await this.withDatabase(async () => {
      try {
        const result = await this.db.delete(roomTable).where(eq(roomTable.id, roomId)).returning();
        if (result.length === 0) {
          logger.warn(`Room ${roomId} not found during deletion attempt`);
        }
      } catch (error) {
        logger.error('Error deleting room:', {
          error: error instanceof Error ? error.message : String(error),
          roomId,
        });
        throw error;
      }
    });
  }

  /**
   * Retrieves a relationship by source and target entity IDs
   * @param params The source and target entity IDs
   * @returns A Promise that resolves to the relationship or null if not found
   */
  async getRelationship(params: {
    sourceEntityId: UUID;
    targetEntityId: UUID;
  }): Promise<Relationship | null> {
    return this.withDatabase(async () => {
      const rows = await this.db
        .select()
        .from(relationshipTable)
        .where(
          and(
            eq(relationshipTable.source_entity_id, params.sourceEntityId),
            eq(relationshipTable.target_entity_id, params.targetEntityId),
            eq(relationshipTable.agent_id, this.agentId)
          )
        )
        .limit(1);

      if (rows.length === 0) return null;

      const row = rows[0];
      return {
        ...row,
        id: row.id as UUID,
        sourceEntityId: row.source_entity_id as UUID,
        targetEntityId: row.target_entity_id as UUID,
        agentId: row.agent_id as UUID,
        tags: row.tags || [],
        metadata: row.metadata || {},
        createdAt: row.created_at?.toISOString(),
      };
    });
  }

  /**
   * Retrieves all relationships for an entity
   * @param params The parameters including entity ID and optional tags
   * @returns A Promise that resolves to an array of relationships
   */
  async getRelationships(params: { entityId: UUID; tags?: string[] }): Promise<Relationship[]> {
    return this.withDatabase(async () => {
      const conditions = [
        and(
          eq(relationshipTable.agent_id, this.agentId),
          or(
            eq(relationshipTable.source_entity_id, params.entityId),
            eq(relationshipTable.target_entity_id, params.entityId)
          )
        ),
      ];

      const rows = await this.db
        .select()
        .from(relationshipTable)
        .where(and(...conditions));

      let results = rows.map((row: any) => ({
        ...row,
        id: row.id as UUID,
        sourceEntityId: row.source_entity_id as UUID,
        targetEntityId: row.target_entity_id as UUID,
        agentId: row.agent_id as UUID,
        tags: row.tags || [],
        metadata: row.metadata || {},
        createdAt: row.created_at?.toISOString(),
      }));

      // Filter by tags if provided
      if (params.tags && params.tags.length > 0) {
        results = results.filter((rel: any) => params.tags!.some((tag) => rel.tags.includes(tag)));
      }

      return results;
    });
  }

  /**
   * Creates a new relationship
   * @param params Object containing the relationship details
   * @returns A Promise that resolves to a boolean indicating success
   */
  async createRelationship(params: {
    sourceEntityId: UUID;
    targetEntityId: UUID;
    tags?: string[];
    metadata?: Metadata;
  }): Promise<boolean> {
    return this.withDatabase(async () => {
      try {
        const relationshipId = v4() as UUID;
        await this.db.insert(relationshipTable).values({
          id: relationshipId,
          source_entity_id: params.sourceEntityId,
          target_entity_id: params.targetEntityId,
          agent_id: this.agentId,
          tags: params.tags || [],
          metadata: params.metadata || {},
          createdAt: new Date(),
        });
        return true;
      } catch (error) {
        logger.error('Error creating relationship:', {
          error: error instanceof Error ? error.message : String(error),
          sourceEntityId: params.sourceEntityId,
          targetEntityId: params.targetEntityId,
        });
        return false;
      }
    });
  }

  /**
   * Updates an existing relationship
   * @param relationship The relationship object with updated data
   * @returns A Promise that resolves when the relationship is updated
   */
  async updateRelationship(relationship: Relationship): Promise<void> {
    await this.withDatabase(async () => {
      try {
        const updateData: any = {};
        if (relationship.tags !== undefined) {
          updateData.tags = relationship.tags;
        }
        if (relationship.metadata !== undefined) {
          updateData.metadata = relationship.metadata;
        }

        const result = await this.db
          .update(relationshipTable)
          .set(updateData)
          .where(
            and(
              eq(relationshipTable.source_entity_id, relationship.sourceEntityId),
              eq(relationshipTable.target_entity_id, relationship.targetEntityId),
              eq(relationshipTable.agent_id, this.agentId)
            )
          )
          .returning();

        if (result.length === 0) {
          throw new Error(
            `Relationship not found for entities ${relationship.sourceEntityId} and ${relationship.targetEntityId}`
          );
        }
      } catch (error) {
        logger.error('Error updating relationship:', {
          error: error instanceof Error ? error.message : String(error),
          sourceEntityId: relationship.sourceEntityId,
          targetEntityId: relationship.targetEntityId,
        });
        throw error;
      }
    });
  }

  /**
   * Deletes a relationship from the database
   * @param relationshipId The ID of the relationship to delete
   * @returns A Promise that resolves to a boolean indicating success
   */
  async deleteRelationship(relationshipId: UUID): Promise<boolean> {
    return this.withDatabase(async () => {
      try {
        const result = await this.db
          .delete(relationshipTable)
          .where(eq(relationshipTable.id, relationshipId))
          .returning();
        return result.length > 0;
      } catch (error) {
        logger.error('Error deleting relationship:', {
          error: error instanceof Error ? error.message : String(error),
          relationshipId,
        });
        return false;
      }
    });
  }

  /**
   * Retrieves a task by ID
   * @param taskId The ID of the task
   * @returns A Promise that resolves to the task or null if not found
   */
  async getTask(taskId: UUID): Promise<Task | null> {
    return this.withDatabase(async () => {
      const rows = await this.db.select().from(taskTable).where(eq(taskTable.id, taskId)).limit(1);

      if (rows.length === 0) return null;

      const row = rows[0];
      return {
        ...row,
        id: row.id as UUID,
        agentId: row.agent_id as UUID,
        assigneeId: row.assignee_id as UUID | undefined,
        parentId: row.parent_id as UUID | undefined,
        metadata: row.metadata as TaskMetadata,
        createdAt: row.created_at ? new Date(row.created_at).getTime() : Date.now(),
        updatedAt: row.updated_at ? new Date(row.updated_at).getTime() : undefined,
      };
    });
  }

  /**
   * Retrieves tasks based on the provided parameters
   * @param params The parameters for retrieving tasks
   * @returns A Promise that resolves to an array of tasks
   */
  async getTasks(params: { roomId?: UUID; tags?: string[]; entityId?: UUID }): Promise<Task[]> {
    return this.withDatabase(async () => {
      const conditions = [eq(taskTable.agent_id, this.agentId)];

      if (params.roomId) {
        conditions.push(eq(taskTable.room_id, params.roomId));
      }
      if (params.entityId) {
        conditions.push(eq(taskTable.entity_id, params.entityId));
      }

      const rows = await this.db
        .select()
        .from(taskTable)
        .where(and(...conditions));

      let results = rows.map((row: any) => ({
        id: row.id as UUID,
        name: row.name,
        description: row.description,
        roomId: row.room_id as UUID | undefined,
        worldId: row.world_id as UUID | undefined,
        entityId: row.entity_id as UUID | undefined,
        tags: row.tags || [],
        metadata: row.metadata as TaskMetadata,
        updatedAt: row.updatedAt?.getTime(),
      }));

      // Filter by tags if provided
      if (params.tags && params.tags.length > 0) {
        results = results.filter((task: any) =>
          params.tags!.some((tag) => task.tags.includes(tag))
        );
      }

      return results;
    });
  }

  /**
   * Creates a new task
   * @param task The task object to create
   * @returns A Promise that resolves to the task ID
   */
  async createTask(task: Task): Promise<UUID> {
    return this.withDatabase(async () => {
      try {
        const taskId = task.id || (v4() as UUID);
        await this.db.insert(taskTable).values({
          id: taskId,
          name: task.name,
          description: task.description,
          room_id: task.roomId,
          world_id: task.worldId,
          entity_id: task.entityId,
          agent_id: this.agentId,
          tags: task.tags || [],
          metadata: task.metadata || {},
          createdAt: new Date(),
          updatedAt: new Date(),
        });
        return taskId;
      } catch (error) {
        logger.error('Error creating task:', {
          error: error instanceof Error ? error.message : String(error),
          taskId: task.id,
        });
        throw error;
      }
    });
  }

  /**
   * Updates an existing task
   * @param id The ID of the task to update
   * @param task The partial task object with updated values
   * @returns A Promise that resolves when the task is updated
   */
  async updateTask(id: UUID, task: Partial<Task>): Promise<void> {
    await this.withDatabase(async () => {
      try {
        const updateData: any = {
          updatedAt: new Date(),
        };

        if (task.name !== undefined) updateData.name = task.name;
        if (task.description !== undefined) updateData.description = task.description;
        if (task.roomId !== undefined) updateData.roomId = task.roomId;
        if (task.worldId !== undefined) updateData.worldId = task.worldId;
        if (task.entityId !== undefined) updateData.entityId = task.entityId;
        if (task.tags !== undefined) updateData.tags = task.tags;
        if (task.metadata !== undefined) updateData.metadata = task.metadata;

        const result = await this.db
          .update(taskTable)
          .set(updateData)
          .where(eq(taskTable.id, id))
          .returning();

        if (result.length === 0) {
          throw new Error(`Task ${id} not found`);
        }
      } catch (error) {
        logger.error('Error updating task:', {
          error: error instanceof Error ? error.message : String(error),
          taskId: id,
        });
        throw error;
      }
    });
  }

  /**
   * Deletes a task from the database
   * @param id The ID of the task to delete
   * @returns A Promise that resolves when the task is deleted
   */
  async deleteTask(id: UUID): Promise<void> {
    await this.withDatabase(async () => {
      try {
        const result = await this.db.delete(taskTable).where(eq(taskTable.id, id)).returning();
        if (result.length === 0) {
          throw new Error(`Task ${id} not found`);
        }
      } catch (error) {
        logger.error('Error deleting task:', {
          error: error instanceof Error ? error.message : String(error),
          taskId: id,
        });
        throw error;
      }
    });
  }

  /**
   * Retrieves a participant by ID
   * @param participantId The ID of the participant
   * @returns A Promise that resolves to the participant or null if not found
   */
  async getParticipant(participantId: UUID): Promise<Participant | null> {
    return this.withDatabase(async () => {
      const rows = await this.db
        .select()
        .from(participantTable)
        .where(eq(participantTable.id, participantId))
        .limit(1);

      if (rows.length === 0) return null;

      const row = rows[0];
      return {
        ...row,
        id: row.id as UUID,
        entityId: row.entity_id as UUID,
        roomId: row.room_id as UUID,
        agentId: row.agent_id as UUID,
        createdAt: row.created_at ? new Date(row.created_at).getTime() : Date.now(),
      };
    });
  }

  /**
   * Retrieves all participants for a room
   * @param roomId The ID of the room
   * @returns A Promise that resolves to an array of participants
   */
  async getParticipants(roomId: UUID): Promise<Participant[]> {
    return this.withDatabase(async () => {
      const rows = await this.db
        .select()
        .from(participantTable)
        .where(eq(participantTable.room_id, roomId));

      return rows.map((row: any) => ({
        ...row,
        id: row.id as UUID,
        entityId: row.entity_id as UUID,
        roomId: row.room_id as UUID,
        agentId: row.agent_id as UUID,
        createdAt: row.created_at ? new Date(row.created_at).getTime() : Date.now(),
      }));
    });
  }

  /**
   * Removes a participant from a room
   * @param entityId The entity ID
   * @param roomId The room ID
   * @returns A Promise that resolves to a boolean indicating success
   */
  async removeParticipant(entityId: UUID, roomId: UUID): Promise<boolean> {
    return this.withDatabase(async () => {
      try {
        const result = await this.db
          .delete(participantTable)
          .where(
            and(eq(participantTable.entity_id, entityId), eq(participantTable.room_id, roomId))
          )
          .returning();
        return result.length > 0;
      } catch (error) {
        logger.error('Error removing participant:', {
          error: error instanceof Error ? error.message : String(error),
          entityId,
          roomId,
        });
        return false;
      }
    });
  }

  /**
   * Removes all participants from a room
   * @param roomId The room ID
   * @returns A Promise that resolves to a boolean indicating success
   */
  async removeAllParticipants(roomId: UUID): Promise<boolean> {
    return this.withDatabase(async () => {
      try {
        await this.db.delete(participantTable).where(eq(participantTable.room_id, roomId));
        return true;
      } catch (error) {
        logger.error('Error removing all participants:', {
          error: error instanceof Error ? error.message : String(error),
          roomId,
        });
        return false;
      }
    });
  }

  /**
   * Deletes all rooms associated with a world
   * @param worldId The ID of the world
   * @returns A Promise that resolves when rooms are deleted
   */
  async deleteRoomsByWorldId(worldId: UUID): Promise<void> {
    await this.withDatabase(async () => {
      try {
        await this.db.delete(roomTable).where(eq(roomTable.world_id, worldId));
      } catch (error) {
        logger.error('Error deleting rooms by world ID:', {
          error: error instanceof Error ? error.message : String(error),
          worldId,
        });
        throw error;
      }
    });
  }

  /**
   * Retrieves room IDs for multiple participants
   * @param userIds The IDs of the entities
   * @returns A Promise that resolves to an array of room IDs
   */
  async getRoomsForParticipants(userIds: UUID[]): Promise<UUID[]> {
    return this.withDatabase(async () => {
      if (!userIds || userIds.length === 0) return [];

      const rows = await this.db
        .select({ room_id: participantTable.room_id })
        .from(participantTable)
        .where(
          and(
            inArray(participantTable.entity_id, userIds),
            eq(participantTable.agent_id, this.agentId)
          )
        )
        .groupBy(participantTable.room_id);

      return rows.map((row: any) => row.room_id as UUID);
    });
  }

  /**
   * Retrieves all participants for an entity
   * @param entityId The ID of the entity
   * @returns A Promise that resolves to an array of participants
   */
  async getParticipantsForEntity(entityId: UUID): Promise<Participant[]> {
    return this.withDatabase(async () => {
      const rows = await this.db
        .select({
          participant: participantTable,
          entity: entityTable,
        })
        .from(participantTable)
        .innerJoin(entityTable, eq(participantTable.entity_id, entityTable.id))
        .where(eq(participantTable.entity_id, entityId));

      return rows.map((row: any) => ({
        id: row.participant.id as UUID,
        entity: {
          ...row.entity,
          id: row.entity.id as UUID,
          agentId: row.entity.agent_id as UUID,
          metadata: row.entity.metadata || {},
        },
      }));
    });
  }

  /**
   * Retrieves participant IDs for a room
   * @param roomId The ID of the room
   * @returns A Promise that resolves to an array of entity IDs
   */
  async getParticipantsForRoom(roomId: UUID): Promise<UUID[]> {
    return this.withDatabase(async () => {
      const rows = await this.db
        .select({ entity_id: participantTable.entity_id })
        .from(participantTable)
        .where(eq(participantTable.room_id, roomId));

      return rows.map((row: any) => row.entity_id as UUID);
    });
  }

  /**
   * Gets the user state for a participant in a room
   * @param roomId The room ID
   * @param entityId The entity ID
   * @returns A Promise that resolves to the user state or null
   */
  async getParticipantUserState(
    roomId: UUID,
    entityId: UUID
  ): Promise<'FOLLOWED' | 'MUTED' | null> {
    return this.withDatabase(async () => {
      const rows = await this.db
        .select({ room_state: participantTable.room_state })
        .from(participantTable)
        .where(
          and(
            eq(participantTable.room_id, roomId),
            eq(participantTable.entity_id, entityId),
            eq(participantTable.agent_id, this.agentId)
          )
        )
        .limit(1);

      if (rows.length === 0) return null;
      return rows[0].room_state as 'FOLLOWED' | 'MUTED' | null;
    });
  }

  /**
   * Sets the user state for a participant in a room
   * @param roomId The room ID
   * @param entityId The entity ID
   * @param state The user state to set
   * @returns A Promise that resolves when the state is updated
   */
  async setParticipantUserState(
    roomId: UUID,
    entityId: UUID,
    state: 'FOLLOWED' | 'MUTED' | null
  ): Promise<void> {
    await this.withDatabase(async () => {
      try {
        await this.db
          .update(participantTable)
          .set({ room_state: state })
          .where(
            and(
              eq(participantTable.room_id, roomId),
              eq(participantTable.entity_id, entityId),
              eq(participantTable.agent_id, this.agentId)
            )
          );
      } catch (error) {
        logger.error('Error setting participant user state:', {
          error: error instanceof Error ? error.message : String(error),
          roomId,
          entityId,
          state,
        });
        throw error;
      }
    });
  }

  /**
   * Retrieves memories by world ID
   * @param params The parameters for retrieving memories
   * @returns A Promise that resolves to an array of memories
   */
  async getMemoriesByWorldId(params: {
    worldId: UUID;
    count?: number;
    tableName?: string;
  }): Promise<Memory[]> {
    return this.withDatabase(async () => {
      const conditions = [
        eq(memoryTable.world_id, params.worldId),
        eq(memoryTable.agent_id, this.agentId),
      ];

      if (params.tableName) {
        conditions.push(eq(memoryTable.type, params.tableName));
      }

      const query = this.db
        .select({
          memory: memoryTable,
          embedding: embeddingTable[this.embeddingDimension],
        })
        .from(memoryTable)
        .leftJoin(embeddingTable, eq(embeddingTable.memory_id, memoryTable.id))
        .where(and(...conditions))
        .orderBy(desc(memoryTable.created_at));

      const rows = params.count ? await query.limit(params.count) : await query;

      return rows.map((row: any) => ({
        id: row.memory.id as UUID,
        type: row.memory.type,
        createdAt: row.memory.createdAt.getTime(),
        content:
          typeof row.memory.content === 'string'
            ? JSON.parse(row.memory.content)
            : row.memory.content,
        entityId: row.memory.entityId as UUID,
        agentId: row.memory.agentId as UUID,
        roomId: row.memory.roomId as UUID,
        worldId: row.memory.worldId as UUID,
        unique: row.memory.unique,
        metadata: row.memory.metadata as MemoryMetadata,
        embedding: row.embedding ?? undefined,
      }));
    });
  }

  /**
   * Get tasks by name
   * @param name The name of the tasks to retrieve
   * @returns A Promise that resolves to an array of tasks
   */
  async getTasksByName(name: string): Promise<Task[]> {
    return this.withDatabase(async () => {
      const rows = await this.db
        .select()
        .from(taskTable)
        .where(and(eq(taskTable.name, name), eq(taskTable.agent_id, this.agentId)));

      return rows.map((row: any) => ({
        id: row.id as UUID,
        name: row.name,
        description: row.description,
        roomId: row.room_id as UUID | undefined,
        worldId: row.world_id as UUID | undefined,
        entityId: row.entity_id as UUID | undefined,
        tags: row.tags || [],
        metadata: row.metadata as TaskMetadata,
        updatedAt: row.updatedAt?.getTime(),
      }));
    });
  }

  /**
   * Retrieves entities by their IDs (alias for getEntityByIds)
   * @param entityIds The IDs of the entities to retrieve
   * @returns A Promise that resolves to an array of entities or null
   */
  async getEntitiesByIds(entityIds: UUID[]): Promise<Entity[] | null> {
    return this.getEntityByIds(entityIds);
  }

  /**
   * Get cache value
   * @param key The cache key
   * @returns The cached value or undefined
   */
  async getCache<T>(key: string): Promise<T | undefined> {
    return this.withDatabase(async () => {
      const rows = await this.db.select().from(cacheTable).where(eq(cacheTable.key, key)).limit(1);

      if (rows.length === 0) return undefined;

      const row = rows[0];
      // Check if cache has expired
      if (row.expires_at && new Date(row.expires_at) < new Date()) {
        await this.deleteCache(key);
        return undefined;
      }

      return row.value as T;
    });
  }

  /**
   * Set cache value
   * @param key The cache key
   * @param value The value to cache
   * @returns A Promise that resolves to true if successful
   */
  async setCache<T>(key: string, value: T): Promise<boolean> {
    return this.withDatabase(async () => {
      try {
        await this.db
          .insert(cacheTable)
          .values({
            key,
            agent_id: this.agentId,
            value: value,
            created_at: new Date(),
            expires_at: null,
          })
          .onConflictDoUpdate({
            target: [cacheTable.key, cacheTable.agent_id],
            set: {
              value: value,
              created_at: new Date(),
            },
          });
        return true;
      } catch (error) {
        logger.error('Error setting cache:', {
          error: error instanceof Error ? error.message : String(error),
          key,
        });
        return false;
      }
    });
  }

  /**
   * Delete cache value
   * @param key The cache key
   * @returns A Promise that resolves to true if successful
   */
  async deleteCache(key: string): Promise<boolean> {
    return this.withDatabase(async () => {
      try {
        const result = await this.db.delete(cacheTable).where(eq(cacheTable.key, key)).returning();
        return result.length > 0;
      } catch (error) {
        logger.error('Error deleting cache:', {
          error: error instanceof Error ? error.message : String(error),
          key,
        });
        return false;
      }
    });
  }

  /**
   * Check if the database connection is ready
   * @returns A Promise that resolves to true if ready
   */
  async isReady(): Promise<boolean> {
    try {
      await this.withDatabase(async () => {
        // Try a simple query to check connection
        await this.db.select({ count: count() }).from(agentTable).limit(1);
      });
      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * Wait for the database to be ready
   * @param timeoutMs Maximum time to wait in milliseconds
   * @returns A Promise that resolves when ready
   */
  async waitForReady(timeoutMs: number = 30000): Promise<void> {
    const startTime = Date.now();
    while (Date.now() - startTime < timeoutMs) {
      if (await this.isReady()) {
        return;
      }
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }
    throw new Error(`Database not ready after ${timeoutMs}ms`);
  }

  /**
   * Get database connection
   * @returns A Promise that resolves to the database connection
   */
  async getConnection(): Promise<any> {
    return this.db;
  }

  /**
   * Run database migrations
   * @param schema Optional schema to use for migrations
   * @param pluginName Optional plugin name for logging
   * @returns A Promise that resolves when migrations are complete
   */
  async runMigrations(schema?: any, pluginName?: string): Promise<void> {
    // This is typically implemented by concrete adapters
    logger.info(`Running migrations${pluginName ? ` for ${pluginName}` : ''}`);
  }

  // Generic table operations
  async getFromTable<T = any>(params: {
    tableName: string;
    schema?: string;
    where?: Record<string, any>;
    orderBy?: { column: string; direction: 'asc' | 'desc' }[];
    limit?: number;
    offset?: number;
  }): Promise<T[]> {
    return this.withDatabase(async () => {
      // For generic operations, we'll use dynamic SQL since Drizzle is type-safe
      // and requires tables to be defined at compile time
      let sql = `SELECT * FROM ${params.schema ? `${params.schema}.` : ''}${params.tableName}`;
      const values: any[] = [];
      let placeholderCount = 0;

      // Build WHERE clause
      if (params.where && Object.keys(params.where).length > 0) {
        const conditions = Object.entries(params.where).map(([key, value]) => {
          placeholderCount++;
          values.push(value);
          return `${key} = $${placeholderCount}`;
        });
        sql += ` WHERE ${conditions.join(' AND ')}`;
      }

      // Build ORDER BY clause
      if (params.orderBy && params.orderBy.length > 0) {
        const orderClauses = params.orderBy.map(
          ({ column, direction }) => `${column} ${direction.toUpperCase()}`
        );
        sql += ` ORDER BY ${orderClauses.join(', ')}`;
      }

      // Build LIMIT and OFFSET
      if (params.limit) {
        sql += ` LIMIT ${params.limit}`;
      }

      if (params.offset) {
        sql += ` OFFSET ${params.offset}`;
      }

      const result = await this.db.execute(sql, values);
      return result.rows as T[];
    });
  }

  async getOneFromTable<T = any>(params: {
    tableName: string;
    schema?: string;
    where: Record<string, any>;
  }): Promise<T | null> {
    const results = await this.getFromTable<T>({
      ...params,
      limit: 1,
    });
    return results[0] || null;
  }

  async insertIntoTable<T = any>(params: {
    tableName: string;
    schema?: string;
    data: Partial<T> | Partial<T>[];
    returning?: string[];
  }): Promise<T[]> {
    return this.withDatabase(async () => {
      const dataArray = Array.isArray(params.data) ? params.data : [params.data];
      const results: T[] = [];

      for (const data of dataArray) {
        const keys = Object.keys(data);
        const values = Object.values(data);
        const placeholders = keys.map((_, idx) => `$${idx + 1}`).join(', ');

        let sql = `INSERT INTO ${params.schema ? `${params.schema}.` : ''}${params.tableName} (${keys.join(', ')}) VALUES (${placeholders})`;

        if (params.returning && params.returning.length > 0) {
          sql += ` RETURNING ${params.returning.join(', ')}`;
        }

        const result = await this.db.execute(sql, values);
        if (params.returning && result.rows[0]) {
          results.push(result.rows[0] as T);
        }
      }

      return results;
    });
  }

  async updateTable<T = any>(params: {
    tableName: string;
    schema?: string;
    where: Record<string, any>;
    data: Partial<T>;
    returning?: string[];
  }): Promise<T[]> {
    return this.withDatabase(async () => {
      const setKeys = Object.keys(params.data);
      const setValues = Object.values(params.data);
      const whereKeys = Object.keys(params.where);
      const whereValues = Object.values(params.where);
      const allValues = [...setValues, ...whereValues];

      let placeholderCount = 0;
      const setClauses = setKeys
        .map((key) => {
          placeholderCount++;
          return `${key} = $${placeholderCount}`;
        })
        .join(', ');

      const whereClauses = whereKeys
        .map((key) => {
          placeholderCount++;
          return `${key} = $${placeholderCount}`;
        })
        .join(' AND ');

      let sql = `UPDATE ${params.schema ? `${params.schema}.` : ''}${params.tableName} SET ${setClauses} WHERE ${whereClauses}`;

      if (params.returning && params.returning.length > 0) {
        sql += ` RETURNING ${params.returning.join(', ')}`;
      }

      const result = await this.db.execute(sql, allValues);
      return params.returning ? (result.rows as T[]) : [];
    });
  }

  async deleteFromTable(params: {
    tableName: string;
    schema?: string;
    where: Record<string, any>;
  }): Promise<number> {
    return this.withDatabase(async () => {
      const whereKeys = Object.keys(params.where);
      const whereValues = Object.values(params.where);

      const whereClauses = whereKeys.map((key, idx) => `${key} = $${idx + 1}`).join(' AND ');

      const sql = `DELETE FROM ${params.schema ? `${params.schema}.` : ''}${params.tableName} WHERE ${whereClauses}`;

      const result = await this.db.execute(sql, whereValues);
      return result.rowCount || 0;
    });
  }

  // Schema-aware operations
  async getTableSchema(
    tableName: string,
    schema?: string
  ): Promise<{
    columns: Array<{
      name: string;
      type: string;
      nullable: boolean;
      defaultValue?: any;
      primaryKey?: boolean;
    }>;
    indexes: Array<{
      name: string;
      columns: string[];
      unique: boolean;
    }>;
    foreignKeys: Array<{
      columns: string[];
      referencedTable: string;
      referencedColumns: string[];
    }>;
  }> {
    // This would need to be implemented based on the specific database type
    // For now, return a basic structure that can be overridden by concrete implementations
    return {
      columns: [],
      indexes: [],
      foreignKeys: [],
    };
  }

  // Plugin-specific helpers
  getPluginTableName(pluginName: string, tableName: string): string {
    return `${pluginName}_${tableName}`;
  }

  getPluginSchema(pluginName: string): string {
    return pluginName;
  }
}
