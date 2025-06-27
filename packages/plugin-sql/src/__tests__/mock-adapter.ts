import type {
  Agent,
  Component,
  Entity,
  IDatabaseAdapter,
  Memory,
  Relationship,
  Room,
  Task,
  UUID,
  World,
} from '@elizaos/core';

/**
 * Mock database adapter for testing that provides in-memory functionality
 */
export class MockDatabaseAdapter implements IDatabaseAdapter {
  // Required properties
  public db: any = {}; // Mock database instance
  
  // In-memory storage
  private entities = new Map<UUID, Entity>();
  private memories = new Map<UUID, Memory>();
  private relationships = new Map<string, Relationship>();
  private rooms = new Map<UUID, Room>();
  private components = new Map<string, Component>();
  private worlds = new Map<UUID, World>();
  private tasks = new Map<UUID, Task>();
  private cache = new Map<string, any>();
  private participants = new Map<string, { entityId: UUID; roomId: UUID }>();

  constructor(public agentId: UUID) {}

  async init(): Promise<void> {
    // No initialization needed for mock
  }

  async initialize(): Promise<void> {
    // Mock implementation
  }

  async runMigrations(): Promise<void> {
    // Mock implementation
  }

  async getConnection(): Promise<any> {
    return this.db;
  }

  async isReady(): Promise<boolean> {
    return true;
  }

  async close(): Promise<void> {
    // Clear all data
    this.entities.clear();
    this.memories.clear();
    this.relationships.clear();
    this.rooms.clear();
    this.components.clear();
    this.worlds.clear();
    this.tasks.clear();
    this.cache.clear();
    this.participants.clear();
  }

  // Entity operations
  async createEntity(entity: Entity): Promise<boolean> {
    this.entities.set(entity.id!, entity);
    return true;
  }

  async createEntities(entities: Entity[]): Promise<boolean> {
    for (const entity of entities) {
      await this.createEntity(entity);
    }
    return true;
  }

  async getEntityById(id: UUID): Promise<Entity | null> {
    return this.entities.get(id) || null;
  }

  async getEntityByIds(ids: UUID[]): Promise<Entity[]> {
    return ids.map((id) => this.entities.get(id)).filter(Boolean) as Entity[];
  }

  async updateEntity(entity: Entity): Promise<void> {
    if (entity.id && this.entities.has(entity.id)) {
      this.entities.set(entity.id, entity);
    }
  }

  async deleteEntity(id: UUID): Promise<boolean> {
    return this.entities.delete(id);
  }

  async searchEntitiesByName(name: string): Promise<Entity[]> {
    return Array.from(this.entities.values()).filter((e) =>
      e.names.some((n) => n.toLowerCase().includes(name.toLowerCase()))
    );
  }

  async getEntitiesByNames(names: string[]): Promise<Entity[]> {
    return Array.from(this.entities.values()).filter((e) => e.names.some((n) => names.includes(n)));
  }

  async getEntitiesForRoom(roomId: UUID): Promise<Entity[]> {
    const participantEntityIds = Array.from(this.participants.values())
      .filter((p) => p.roomId === roomId)
      .map((p) => p.entityId);
    return this.getEntityByIds(participantEntityIds);
  }

  // Memory operations - legacy method kept for compatibility

  async getMemory(id: UUID): Promise<Memory | null> {
    return this.memories.get(id) || null;
  }

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
    const memories = Array.from(this.memories.values())
      .filter((m) => !params.roomId || m.roomId === params.roomId)
      .filter((m) => !params.entityId || m.entityId === params.entityId)
      .filter((m) => !params.agentId || m.agentId === params.agentId)
      .slice(0, params.count || 100);
    return params.unique
      ? memories.filter(
          (m, i, arr) => arr.findIndex((other) => other.content.text === m.content.text) === i
        )
      : memories;
  }

  // Search memories method moved to end of class

  async updateMemory(memory: Partial<Memory> & { id: UUID; metadata?: any }): Promise<boolean> {
    if (this.memories.has(memory.id)) {
      const existingMemory = this.memories.get(memory.id)!;
      this.memories.set(memory.id, { ...existingMemory, ...memory });
      return true;
    }
    return false;
  }

  async deleteMemory(memoryId: UUID): Promise<void> {
    this.memories.delete(memoryId);
  }

  // Delete all memories method moved to end of class

  // Count memories method moved to end of class

  // Relationship operations
  async createRelationship(relationship: Relationship): Promise<boolean> {
    const key = `${relationship.sourceEntityId}-${relationship.targetEntityId}`;
    this.relationships.set(key, {
      ...relationship,
      id: relationship.id || (`rel-${Date.now()}` as UUID),
    });
    return true;
  }

  async getRelationship(params: {
    sourceEntityId: UUID;
    targetEntityId: UUID;
  }): Promise<Relationship | null> {
    const key = `${params.sourceEntityId}-${params.targetEntityId}`;
    return this.relationships.get(key) || null;
  }

  async getRelationships(params: { entityId: UUID; tags?: string[] }): Promise<Relationship[]> {
    return Array.from(this.relationships.values()).filter((rel) => {
      const matchesEntity =
        rel.sourceEntityId === params.entityId || rel.targetEntityId === params.entityId;
      const matchesTags = !params.tags || params.tags.some((tag) => rel.tags.includes(tag));
      return matchesEntity && matchesTags;
    });
  }

  async updateRelationship(relationship: Relationship): Promise<void> {
    const key = `${relationship.sourceEntityId}-${relationship.targetEntityId}`;
    if (this.relationships.has(key)) {
      this.relationships.set(key, relationship);
    }
  }

  // Room operations
  async createRoom(room: Room): Promise<UUID> {
    const id = room.id || (`room-${Date.now()}` as UUID);
    this.rooms.set(id, { ...room, id });
    return id;
  }

  async getRoom(id: UUID): Promise<Room | null> {
    return this.rooms.get(id) || null;
  }

  async getRooms(worldId?: UUID): Promise<Room[]> {
    return Array.from(this.rooms.values()).filter((r) => !worldId || r.worldId === worldId);
  }

  async updateRoom(room: Room): Promise<void> {
    if (room.id && this.rooms.has(room.id)) {
      this.rooms.set(room.id, room);
    }
  }

  async deleteRoom(roomId: UUID): Promise<void> {
    this.rooms.delete(roomId);
  }

  // Participant operations
  async addParticipant(entityId: UUID, roomId: UUID): Promise<boolean> {
    const key = `${entityId}-${roomId}`;
    this.participants.set(key, { entityId, roomId });
    return true;
  }

  async removeParticipant(entityId: UUID, roomId: UUID): Promise<boolean> {
    const key = `${entityId}-${roomId}`;
    return this.participants.delete(key);
  }

  async getParticipantsForRoom(roomId: UUID): Promise<UUID[]> {
    return Array.from(this.participants.values())
      .filter((p) => p.roomId === roomId)
      .map((p) => p.entityId);
  }

  async getRoomsForParticipant(entityId: UUID): Promise<UUID[]> {
    return Array.from(this.participants.values())
      .filter((p) => p.entityId === entityId)
      .map((p) => p.roomId);
  }

  async getParticipantUserState(roomId: UUID, entityId: UUID): Promise<'FOLLOWED' | 'MUTED' | null> {
    return null; // Mock implementation
  }

  // setParticipantUserState method moved to end of class

  // Component operations
  async createComponent(component: Component): Promise<boolean> {
    const key = `${component.entityId}-${component.type}`;
    this.components.set(key, component);
    return true;
  }

  async getComponent(entityId: UUID, type: string): Promise<Component | null> {
    const key = `${entityId}-${type}`;
    return this.components.get(key) || null;
  }

  async getComponents(entityId: UUID): Promise<Component[]> {
    return Array.from(this.components.values()).filter((c) => c.entityId === entityId);
  }

  async updateComponent(component: Component): Promise<void> {
    const key = `${component.entityId}-${component.type}`;
    if (this.components.has(key)) {
      this.components.set(key, component);
    }
  }

  async deleteComponent(componentId: UUID): Promise<void> {
    for (const [key, component] of this.components) {
      if (component.id === componentId) {
        this.components.delete(key);
        break;
      }
    }
  }

  // World operations
  async createWorld(world: World): Promise<UUID> {
    const id = world.id || (`world-${Date.now()}` as UUID);
    this.worlds.set(id, { ...world, id });
    return id;
  }

  async getWorld(id: UUID): Promise<World | null> {
    return this.worlds.get(id) || null;
  }

  async getAllWorlds(): Promise<World[]> {
    return Array.from(this.worlds.values());
  }

  async updateWorld(world: World): Promise<void> {
    if (world.id && this.worlds.has(world.id)) {
      this.worlds.set(world.id, world);
    }
  }

  async removeWorld(id: UUID): Promise<void> {
    this.worlds.delete(id);
  }

  // Task operations
  async createTask(task: Task): Promise<UUID> {
    const id = task.id || (`task-${Date.now()}` as UUID);
    this.tasks.set(id, { ...task, id });
    return id;
  }

  async getTask(id: UUID): Promise<Task | null> {
    return this.tasks.get(id) || null;
  }

  async getTasks(params: { roomId?: UUID; tags?: string[]; entityId?: UUID }): Promise<Task[]> {
    return Array.from(this.tasks.values()).filter((task) => {
      const matchesRoom = !params.roomId || task.roomId === params.roomId;
      const matchesTags = !params.tags || params.tags.some((tag) => task.tags.includes(tag));
      return matchesRoom && matchesTags;
    });
  }

  async updateTask(id: UUID, updates: Partial<Task>): Promise<void> {
    const task = this.tasks.get(id);
    if (task) {
      this.tasks.set(id, { ...task, ...updates });
    }
  }

  async deleteTask(id: UUID): Promise<void> {
    this.tasks.delete(id);
  }

  async getTasksByName(name: string): Promise<Task[]> {
    return Array.from(this.tasks.values()).filter((task) => task.name === name);
  }

  // Cache operations
  async setCache(key: string, value: any): Promise<boolean> {
    this.cache.set(key, value);
    return true;
  }

  async getCache<T>(key: string): Promise<T | undefined> {
    return this.cache.get(key);
  }

  async deleteCache(key: string): Promise<boolean> {
    return this.cache.delete(key);
  }

  // Other required methods
  async getAccountDetails(): Promise<any> {
    return null;
  }

  async getAgents(): Promise<Agent[]> {
    return [];
  }

  async ensureEmbeddingDimension(): Promise<void> {
    // Mock implementation
  }

  async ensureConnection(): Promise<void> {
    // Mock implementation
  }

  async ensureRoomExists(): Promise<UUID> {
    return 'mock-room-id' as UUID;
  }

  async ensureWorldExists(): Promise<UUID> {
    return 'mock-world-id' as UUID;
  }

  // addParticipantsRoom method moved to end of class

  async getMemoriesByRoomIds(): Promise<Memory[]> {
    return [];
  }

  // Missing required methods
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
    // Simple text-based search for mock
    return Array.from(this.memories.values())
      .filter((m) => !params.roomId || m.roomId === params.roomId)
      .slice(0, params.count || 10);
  }

  async createMemory(memory: Memory, tableName: string, unique?: boolean): Promise<UUID> {
    const id = memory.id || (`memory-${Date.now()}-${Math.random()}` as UUID);
    this.memories.set(id, { ...memory, id });
    return id;
  }

  async deleteAllMemories(roomId: UUID, tableName: string): Promise<void> {
    for (const [id, memory] of this.memories) {
      if (memory.roomId === roomId) {
        this.memories.delete(id);
      }
    }
  }

  async getMemoryById(id: UUID): Promise<Memory | null> {
    return this.memories.get(id) || null;
  }

  async getMemoriesByIds(ids: UUID[], tableName?: string): Promise<Memory[]> {
    return ids.map(id => this.memories.get(id)).filter(Boolean) as Memory[];
  }

  async countMemories(roomId: UUID, unique?: boolean, tableName?: string): Promise<number> {
    return Array.from(this.memories.values()).filter(m => m.roomId === roomId).length;
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
    return Array.from(this.worlds.values()).filter(w => w.agentId === params.agentId);
  }

  async getRoomsByIds(roomIds: UUID[]): Promise<Room[] | null> {
    return roomIds.map(id => this.rooms.get(id)).filter(Boolean) as Room[];
  }

  async createRooms(rooms: Room[]): Promise<UUID[]> {
    return Promise.all(rooms.map(room => this.createRoom(room)));
  }

  async deleteRoomsByWorldId(worldId: UUID): Promise<void> {
    for (const [id, room] of this.rooms) {
      if (room.worldId === worldId) {
        this.rooms.delete(id);
      }
    }
  }

  async getRoomsForParticipants(userIds: UUID[]): Promise<UUID[]> {
    return [];
  }

  async getRoomsByWorld(worldId: UUID): Promise<Room[]> {
    return Array.from(this.rooms.values()).filter(r => r.worldId === worldId);
  }

  async getParticipantsForEntity(entityId: UUID): Promise<any[]> {
    return [];
  }

  async addParticipantsRoom(entityIds: UUID[], roomId: UUID): Promise<boolean> {
    return true;
  }

  async setParticipantUserState(roomId: UUID, entityId: UUID, state: 'FOLLOWED' | 'MUTED' | null): Promise<void> {
    // Mock implementation
  }

  async getCachedEmbeddings(params: any): Promise<{ embedding: number[]; levenshtein_score: number }[]> {
    return [];
  }

  async log(params: any): Promise<void> {
    // Mock implementation
  }

  async getLogs(params: any): Promise<any[]> {
    return [];
  }

  async deleteLog(logId: UUID): Promise<void> {
    // Mock implementation
  }

  async deleteManyMemories(memoryIds: UUID[]): Promise<void> {
    memoryIds.forEach(id => this.memories.delete(id));
  }

  async getMemoriesByWorldId(params: {
    worldId: UUID;
    count?: number;
    tableName?: string;
  }): Promise<Memory[]> {
    return Array.from(this.memories.values())
      .filter(m => m.worldId === params.worldId)
      .slice(0, params.count || 100);
  }

  // Missing Agent methods
  async getAgent(id: UUID): Promise<Agent | null> {
    return null; // Mock implementation
  }

  async createAgent(agent: Partial<Agent>): Promise<boolean> {
    return true;
  }

  async updateAgent(agentId: UUID, agent: Partial<Agent>): Promise<boolean> {
    return true;
  }

  async deleteAgent(agentId: UUID): Promise<boolean> {
    return true;
  }

  async getEntitiesByIds(ids: UUID[]): Promise<Entity[]> {
    return ids.map(id => this.entities.get(id)).filter(Boolean) as Entity[];
  }
}
