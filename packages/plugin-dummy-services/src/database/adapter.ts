import {
  type IDatabaseAdapter,
  DatabaseAdapter,
  type Memory,
  type Entity,
  type UUID,
  type Room,
  type World,
  type Component,
  type Participant,
  type Agent,
  type Relationship,
  type Task,
  type Log,
  type Metadata,
  type Plugin,
} from '@elizaos/core';

/**
 * Mock Database Adapter for testing purposes
 * Implements all required methods from IDatabaseAdapter interface
 */
export class MockDatabaseAdapter extends DatabaseAdapter<any> implements IDatabaseAdapter {
  public db: any = {};
  private agents = new Map<UUID, Agent>();
  private entities = new Map<UUID, Entity>();
  private memories = new Map<UUID, Memory>();
  private rooms = new Map<UUID, Room>();
  private worlds = new Map<UUID, World>();
  private components = new Map<UUID, Component>();
  private participants = new Map<UUID, UUID[]>(); // roomId -> entityIds
  private relationships = new Map<string, Relationship>();
  private tasks = new Map<UUID, Task>();
  private logs = new Map<UUID, Log>();
  private cache = new Map<string, any>();
  private isInitialized = false;
  private participantStates = new Map<string, 'FOLLOWED' | 'MUTED' | null>();

  async initialize(config?: any): Promise<void> {
    this.isInitialized = true;
  }

  async init(): Promise<void> {
    this.isInitialized = true;
  }

  async runMigrations(schema?: any, pluginName?: string): Promise<void> {
    // Mock implementation - no actual migrations needed
  }

  async isReady(): Promise<boolean> {
    return this.isInitialized;
  }

  async waitForReady(timeoutMs: number = 30000): Promise<void> {
    const startTime = Date.now();
    while (!this.isInitialized && Date.now() - startTime < timeoutMs) {
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
    if (!this.isInitialized) {
      throw new Error('Database initialization timeout');
    }
  }

  async close(): Promise<void> {
    this.isInitialized = false;
  }

  async getConnection(): Promise<any> {
    return this.db;
  }

  // Agent methods
  async getAgent(agentId: UUID): Promise<Agent | null> {
    return this.agents.get(agentId) || null;
  }

  async getAgents(): Promise<Partial<Agent>[]> {
    return Array.from(this.agents.values());
  }

  async createAgent(agent: Partial<Agent>): Promise<boolean> {
    if (agent.id) {
      this.agents.set(agent.id, agent as Agent);
      return true;
    }
    return false;
  }

  async updateAgent(agentId: UUID, agent: Partial<Agent>): Promise<boolean> {
    const existing = this.agents.get(agentId);
    if (existing) {
      this.agents.set(agentId, { ...existing, ...agent });
      return true;
    }
    return false;
  }

  async deleteAgent(agentId: UUID): Promise<boolean> {
    return this.agents.delete(agentId);
  }

  async ensureEmbeddingDimension(dimension: number): Promise<void> {
    // Mock implementation
  }

  // Entity methods
  async getEntitiesByIds(entityIds: UUID[]): Promise<Entity[] | null> {
    const entities = entityIds
      .map((id) => this.entities.get(id))
      .filter((entity) => entity !== undefined) as Entity[];
    return entities.length > 0 ? entities : null;
  }

  async getEntitiesForRoom(roomId: UUID, includeComponents?: boolean): Promise<Entity[]> {
    return Array.from(this.entities.values()).filter((entity) => entity.agentId === roomId);
  }

  async createEntities(entities: Entity[]): Promise<boolean> {
    entities.forEach((entity) => {
      if (entity.id) {
        this.entities.set(entity.id, entity);
      }
    });
    return true;
  }

  async updateEntity(entity: Entity): Promise<void> {
    if (entity.id) {
      this.entities.set(entity.id, entity);
    }
  }

  // Component methods
  async getComponent(
    entityId: UUID,
    type: string,
    worldId?: UUID,
    sourceEntityId?: UUID
  ): Promise<Component | null> {
    return (
      Array.from(this.components.values()).find(
        (comp) => comp.entityId === entityId && comp.type === type
      ) || null
    );
  }

  async getComponents(entityId: UUID, worldId?: UUID, sourceEntityId?: UUID): Promise<Component[]> {
    return Array.from(this.components.values()).filter((comp) => comp.entityId === entityId);
  }

  async createComponent(component: Component): Promise<boolean> {
    this.components.set(component.id, component);
    return true;
  }

  async updateComponent(component: Component): Promise<void> {
    this.components.set(component.id, component);
  }

  async deleteComponent(componentId: UUID): Promise<void> {
    this.components.delete(componentId);
  }

  // Memory methods
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
    let memories = Array.from(this.memories.values());

    if (params.roomId) {
      memories = memories.filter((m) => m.roomId === params.roomId);
    }
    if (params.entityId) {
      memories = memories.filter((m) => m.entityId === params.entityId);
    }
    if (params.agentId) {
      memories = memories.filter((m) => m.agentId === params.agentId);
    }

    return memories.slice(0, params.count);
  }

  async getMemoryById(id: UUID): Promise<Memory | null> {
    return this.memories.get(id) || null;
  }

  async getMemoriesByIds(ids: UUID[] tableName?: string): Promise<Memory[]> {
    return ids
      .map((id) => this.memories.get(id))
      .filter((memory) => memory !== undefined) as Memory[];
  }

  async getMemoriesByRoomIds(params: {
    tableName: string;
    roomIds: UUID[];
    limit?: number;
  }): Promise<Memory[]> {
    const memories = Array.from(this.memories.values())
      .filter((m) => params.roomIds.includes(m.roomId))
      .slice(0, params.limit);
    return memories;
  }

  async getMemoriesByWorldId(params: {
    worldId: UUID;
    count?: number;
    tableName?: string;
  }): Promise<Memory[]> {
    const memories = Array.from(this.memories.values())
      .filter((m) => m.worldId === params.worldId)
      .slice(0, params.count);
    return memories;
  }

  async getCachedEmbeddings(params: {
    query_table_name: string;
    query_threshold: number;
    query_input: string;
    query_field_name: string;
    query_field_sub_name: string;
    query_match_count: number;
  }): Promise<{ embedding: number[]; levenshtein_score: number }[]> {
    return [];
  }

  async searchMemories(params: {
    embedding: number[];
    match_threshold?: number;
    count?: number;
    unique?: boolean;
    tableName: string;
    query?: string;
    roomId?: UUID;
    worldId?: UUID;
    entityId?: UUID;
  }): Promise<Memory[]> {
    let memories = Array.from(this.memories.values());

    if (params.roomId) {
      memories = memories.filter((m) => m.roomId === params.roomId);
    }
    if (params.entityId) {
      memories = memories.filter((m) => m.entityId === params.entityId);
    }

    return memories.slice(0, params.count);
  }

  async createMemory(memory: Memory, tableName: string, unique?: boolean): Promise<UUID> {
    const id = memory.id || (`${Date.now()}-${Math.random()}` as UUID);
    const memoryWithId = { ...memory, id };
    this.memories.set(id, memoryWithId);
    return id;
  }

  async updateMemory(memory: Partial<Memory> & { id: UUID; metadata?: any }): Promise<boolean> {
    const existing = this.memories.get(memory.id);
    if (existing) {
      this.memories.set(memory.id, { ...existing, ...memory });
      return true;
    }
    return false;
  }

  async deleteMemory(memoryId: UUID): Promise<void> {
    this.memories.delete(memoryId);
  }

  async deleteManyMemories(memoryIds: UUID[]): Promise<void> {
    memoryIds.forEach((id) => this.memories.delete(id));
  }

  async deleteAllMemories(roomId: UUID, tableName: string): Promise<void> {
    Array.from(this.memories.entries()).forEach(([id, memory]) => {
      if (memory.roomId === roomId) {
        this.memories.delete(id);
      }
    });
  }

  async countMemories(roomId: UUID, unique?: boolean, tableName?: string): Promise<number> {
    return Array.from(this.memories.values()).filter((m) => m.roomId === roomId).length;
  }

  // World methods
  async createWorld(world: World): Promise<UUID> {
    const id = world.id;
    this.worlds.set(id, world);
    return id;
  }

  async getWorld(id: UUID): Promise<World | null> {
    return this.worlds.get(id) || null;
  }

  async removeWorld(id: UUID): Promise<void> {
    this.worlds.delete(id);
  }

  async getAllWorlds(): Promise<World[]> {
    return Array.from(this.worlds.values());
  }

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
    let worlds = Array.from(this.worlds.values()).filter((w) => w.agentId === params.agentId);

    if (params.serverId) {
      worlds = worlds.filter((w) => w.serverId === params.serverId);
    }
    if (params.name) {
      worlds = worlds.filter((w) => w.name === params.name);
    }

    return worlds.slice(params.offset || 0, params.limit);
  }

  async updateWorld(world: World): Promise<void> {
    this.worlds.set(world.id, world);
  }

  // Room methods
  async getRoomsByIds(roomIds: UUID[]): Promise<Room[] | null> {
    const rooms = roomIds
      .map((id) => this.rooms.get(id))
      .filter((room) => room !== undefined) as Room[];
    return rooms.length > 0 ? rooms : null;
  }

  async createRooms(rooms: Room[]): Promise<UUID[]> {
    const ids: UUID[] = [];
    rooms.forEach((room) => {
      this.rooms.set(room.id, room);
      ids.push(room.id);
    });
    return ids;
  }

  async deleteRoom(roomId: UUID): Promise<void> {
    this.rooms.delete(roomId);
  }

  async deleteRoomsByWorldId(worldId: UUID): Promise<void> {
    Array.from(this.rooms.entries()).forEach(([id, room]) => {
      if (room.worldId === worldId) {
        this.rooms.delete(id);
      }
    });
  }

  async updateRoom(room: Room): Promise<void> {
    this.rooms.set(room.id, room);
  }

  async getRoomsByWorld(worldId: UUID): Promise<Room[]> {
    return Array.from(this.rooms.values()).filter((r) => r.worldId === worldId);
  }

  // Participant methods
  async getRoomsForParticipant(entityId: UUID): Promise<UUID[]> {
    const roomIds: UUID[] = [];
    this.participants.forEach((participantIds, key) => {
      const [roomId, participantId] = key.split(':') as [UUID, UUID];
      if (participantId === entityId) {
        roomIds.push(roomId);
      }
    });
    return roomIds;
  }

  async getRoomsForParticipants(userIds: UUID[]): Promise<UUID[]> {
    const roomIds = new Set<UUID>();
    userIds.forEach((userId) => {
      this.getRoomsForParticipant(userId).then((ids) => {
        ids.forEach((id) => roomIds.add(id));
      });
    });
    return Array.from(roomIds);
  }

  async removeParticipant(entityId: UUID, roomId: UUID): Promise<boolean> {
    const key = `${roomId}:${entityId}`;
    const participants = this.participants.get(roomId);
    if (participants) {
      const index = participants.indexOf(entityId);
      if (index !== -1) {
        participants.splice(index, 1);
        this.participants.set(roomId, participants);
        return true;
      }
    }
    return false;
  }

  async getParticipantsForEntity(entityId: UUID): Promise<Participant[]> {
    const participants: Participant[] = [];

    // Find all rooms where this entity is a participant
    this.participants.forEach((participantIds, roomId) => {
      if (participantIds.includes(entityId)) {
        // Get all entities in this room
        participantIds.forEach((participantId) => {
          const entity = this.entities.get(participantId);
          if (entity) {
            // Check if we already added this participant
            if (!participants.some((p) => p.id === participantId)) {
              participants.push({
                id: participantId,
                entity: entity,
              });
            }
          }
        });
      }
    });

    return participants;
  }

  async getParticipantsForRoom(roomId: UUID): Promise<UUID[]> {
    const entityIds: UUID[] = [];
    this.participants.forEach((participantIds, key) => {
      const [participantRoomId, entityId] = key.split(':') as [UUID, UUID];
      if (participantRoomId === roomId) {
        entityIds.push(entityId);
      }
    });
    return entityIds;
  }

  async addParticipantsRoom(entityIds: UUID[] roomId: UUID): Promise<boolean> {
    const participants = this.participants.get(roomId) || [];

    for (const entityId of entityIds) {
      if (!participants.includes(entityId)) {
        participants.push(entityId);
      }
    }

    this.participants.set(roomId, participants);
    return true;
  }

  async getParticipantUserState(
    roomId: UUID,
    entityId: UUID
  ): Promise<'FOLLOWED' | 'MUTED' | null> {
    const participants = this.participants.get(roomId);
    if (!participants || !participants.includes(entityId)) {
      return null;
    }

    // Get the state from participantStates map
    const stateKey = `${roomId}:${entityId}`;
    return this.participantStates.get(stateKey) || null;
  }

  async setParticipantUserState(
    roomId: UUID,
    entityId: UUID,
    state: 'FOLLOWED' | 'MUTED' | null
  ): Promise<void> {
    const participants = this.participants.get(roomId);
    if (!participants || !participants.includes(entityId)) {
      return;
    }

    const stateKey = `${roomId}:${entityId}`;
    if (state === null) {
      this.participantStates.delete(stateKey);
    } else {
      this.participantStates.set(stateKey, state);
    }
  }

  // Relationship methods
  async createRelationship(params: {
    sourceEntityId: UUID;
    targetEntityId: UUID;
    tags?: string[];
    metadata?: Metadata;
  }): Promise<boolean> {
    const key = `${params.sourceEntityId}:${params.targetEntityId}`;
    const relationship: Relationship = {
      id: key as UUID,
      sourceEntityId: params.sourceEntityId,
      targetEntityId: params.targetEntityId,
      agentId: 'mock-agent' as UUID,
      tags: params.tags || []
      metadata: params.metadata || {},
    };
    this.relationships.set(key, relationship);
    return true;
  }

  async updateRelationship(relationship: Relationship): Promise<void> {
    const key = `${relationship.sourceEntityId}:${relationship.targetEntityId}`;
    this.relationships.set(key, relationship);
  }

  async getRelationship(params: {
    sourceEntityId: UUID;
    targetEntityId: UUID;
  }): Promise<Relationship | null> {
    const key = `${params.sourceEntityId}:${params.targetEntityId}`;
    return this.relationships.get(key) || null;
  }

  async getRelationships(params: { entityId: UUID; tags?: string[] }): Promise<Relationship[]> {
    const relationships: Relationship[] = [];
    this.relationships.forEach((rel) => {
      if (rel.sourceEntityId === params.entityId || rel.targetEntityId === params.entityId) {
        if (!params.tags || params.tags.some((tag) => rel.tags.includes(tag))) {
          relationships.push(rel);
        }
      }
    });
    return relationships;
  }

  // Cache methods
  async getCache<T>(key: string): Promise<T | undefined> {
    return this.cache.get(key);
  }

  async setCache<T>(key: string, value: T): Promise<boolean> {
    this.cache.set(key, value);
    return true;
  }

  async deleteCache(key: string): Promise<boolean> {
    return this.cache.delete(key);
  }

  // Task methods
  async createTask(task: Task): Promise<UUID> {
    const id = task.id || (`task-${Date.now()}-${Math.random()}` as UUID);
    const taskWithId = { ...task, id };
    this.tasks.set(id, taskWithId);
    return id;
  }

  async getTasks(params: { roomId?: UUID; tags?: string[]; entityId?: UUID }): Promise<Task[]> {
    let tasks = Array.from(this.tasks.values());

    if (params.roomId) {
      tasks = tasks.filter((t) => t.roomId === params.roomId);
    }
    if (params.entityId) {
      tasks = tasks.filter((t) => t.entityId === params.entityId);
    }
    if (params.tags) {
      tasks = tasks.filter((t) => params.tags!.some((tag) => t.tags.includes(tag)));
    }

    return tasks;
  }

  async getTask(id: UUID): Promise<Task | null> {
    return this.tasks.get(id) || null;
  }

  async getTasksByName(name: string): Promise<Task[]> {
    return Array.from(this.tasks.values()).filter((t) => t.name === name);
  }

  async updateTask(id: UUID, task: Partial<Task>): Promise<void> {
    const existing = this.tasks.get(id);
    if (existing) {
      this.tasks.set(id, { ...existing, ...task });
    }
  }

  async deleteTask(id: UUID): Promise<void> {
    this.tasks.delete(id);
  }

  // Log methods
  async log(params: {
    body: { [key: string]: unknown };
    entityId: UUID;
    roomId: UUID;
    type: string;
  }): Promise<void> {
    const log: Log = {
      id: `log-${Date.now()}-${Math.random()}` as UUID,
      entityId: params.entityId,
      roomId: params.roomId,
      body: params.body,
      type: params.type,
      createdAt: new Date(),
    };
    this.logs.set(log.id!, log);
  }

  async getLogs(params: {
    entityId: UUID;
    roomId?: UUID;
    type?: string;
    count?: number;
    offset?: number;
  }): Promise<Log[]> {
    let logs = Array.from(this.logs.values()).filter((log) => log.entityId === params.entityId);

    if (params.roomId) {
      logs = logs.filter((log) => log.roomId === params.roomId);
    }
    if (params.type) {
      logs = logs.filter((log) => log.type === params.type);
    }

    return logs.slice(params.offset || 0, (params.offset || 0) + (params.count || 10));
  }

  async deleteLog(logId: UUID): Promise<void> {
    this.logs.delete(logId);
  }
}

// Export the plugin
export const mockDatabasePlugin: Plugin = {
  name: 'mock-database',
  description: 'Mock database adapter for testing',
  adapter: new MockDatabaseAdapter(),
};

export default mockDatabasePlugin;
