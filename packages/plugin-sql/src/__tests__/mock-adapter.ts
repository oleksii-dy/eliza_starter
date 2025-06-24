import type {
  Agent,
  Cache,
  Component,
  Entity,
  IDatabaseAdapter,
  Memory,
  Relationship,
  Room,
  Task,
  UUID,
  World
} from '@elizaos/core';

/**
 * Mock database adapter for testing that avoids PGLite WebAssembly issues
 */
export class MockDatabaseAdapter implements IDatabaseAdapter {
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
    return ids.map(id => this.entities.get(id)).filter(Boolean) as Entity[];
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
    return Array.from(this.entities.values()).filter(e =>
      e.names.some(n => n.toLowerCase().includes(name.toLowerCase()))
    );
  }

  async getEntitiesByNames(names: string[]): Promise<Entity[]> {
    return Array.from(this.entities.values()).filter(e =>
      e.names.some(n => names.includes(n))
    );
  }

  async getEntitiesForRoom(roomId: UUID): Promise<Entity[]> {
    const participantEntityIds = Array.from(this.participants.values())
      .filter(p => p.roomId === roomId)
      .map(p => p.entityId);
    return this.getEntityByIds(participantEntityIds);
  }

  // Memory operations
  async createMemory(memory: Memory, tableName?: string): Promise<UUID> {
    const id = memory.id || `memory-${Date.now()}-${Math.random()}` as UUID;
    this.memories.set(id, { ...memory, id });
    return id;
  }

  async getMemory(id: UUID): Promise<Memory | null> {
    return this.memories.get(id) || null;
  }

  async getMemories(params: {
    roomId: UUID;
    count?: number;
    unique?: boolean;
    tableName?: string;
  }): Promise<Memory[]> {
    const memories = Array.from(this.memories.values())
      .filter(m => m.roomId === params.roomId)
      .slice(0, params.count || 100);
    return params.unique ? memories.filter((m, i, arr) =>
      arr.findIndex(other => other.content.text === m.content.text) === i
    ) : memories;
  }

  async searchMemories(params: {
    embedding: number[];
    roomId?: UUID;
    count?: number;
    match_threshold?: number;
  }): Promise<Memory[]> {
    // Simple text-based search for mock
    return Array.from(this.memories.values())
      .filter(m => !params.roomId || m.roomId === params.roomId)
      .slice(0, params.count || 10);
  }

  async updateMemory(memory: Memory): Promise<void> {
    if (memory.id && this.memories.has(memory.id)) {
      this.memories.set(memory.id, memory);
    }
  }

  async deleteMemory(id: UUID): Promise<boolean> {
    return this.memories.delete(id);
  }

  async deleteAllMemories(roomId: UUID, tableName?: string): Promise<void> {
    for (const [id, memory] of this.memories) {
      if (memory.roomId === roomId) {
        this.memories.delete(id);
      }
    }
  }

  async countMemories(roomId: UUID, unique?: boolean): Promise<number> {
    const memories = await this.getMemories({ roomId, unique });
    return memories.length;
  }

  // Relationship operations
  async createRelationship(relationship: Relationship): Promise<boolean> {
    const key = `${relationship.sourceEntityId}-${relationship.targetEntityId}`;
    this.relationships.set(key, {
      ...relationship,
      id: relationship.id || `rel-${Date.now()}` as UUID,
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

  async getRelationships(params: {
    entityId: UUID;
    tags?: string[];
  }): Promise<Relationship[]> {
    return Array.from(this.relationships.values()).filter(rel => {
      const matchesEntity = rel.sourceEntityId === params.entityId ||
                           rel.targetEntityId === params.entityId;
      const matchesTags = !params.tags || params.tags.some(tag => rel.tags.includes(tag));
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
    const id = room.id || `room-${Date.now()}` as UUID;
    this.rooms.set(id, { ...room, id });
    return id;
  }

  async getRoom(id: UUID): Promise<Room | null> {
    return this.rooms.get(id) || null;
  }

  async getRooms(worldId?: UUID): Promise<Room[]> {
    return Array.from(this.rooms.values()).filter(r =>
      !worldId || r.worldId === worldId
    );
  }

  async updateRoom(room: Room): Promise<void> {
    if (room.id && this.rooms.has(room.id)) {
      this.rooms.set(room.id, room);
    }
  }

  async deleteRoom(id: UUID): Promise<boolean> {
    return this.rooms.delete(id);
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
      .filter(p => p.roomId === roomId)
      .map(p => p.entityId);
  }

  async getRoomsForParticipant(entityId: UUID): Promise<UUID[]> {
    return Array.from(this.participants.values())
      .filter(p => p.entityId === entityId)
      .map(p => p.roomId);
  }

  async getParticipantUserState(): Promise<string | null> {
    return null; // Mock implementation
  }

  async setParticipantUserState(): Promise<void> {
    // Mock implementation
  }

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
    return Array.from(this.components.values()).filter(c => c.entityId === entityId);
  }

  async updateComponent(component: Component): Promise<void> {
    const key = `${component.entityId}-${component.type}`;
    if (this.components.has(key)) {
      this.components.set(key, component);
    }
  }

  async deleteComponent(id: UUID): Promise<boolean> {
    for (const [key, component] of this.components) {
      if (component.id === id) {
        this.components.delete(key);
        return true;
      }
    }
    return false;
  }

  // World operations
  async createWorld(world: World): Promise<UUID> {
    const id = world.id || `world-${Date.now()}` as UUID;
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

  async removeWorld(id: UUID): Promise<boolean> {
    return this.worlds.delete(id);
  }

  // Task operations
  async createTask(task: Task): Promise<UUID> {
    const id = task.id || `task-${Date.now()}` as UUID;
    this.tasks.set(id, { ...task, id });
    return id;
  }

  async getTask(id: UUID): Promise<Task | null> {
    return this.tasks.get(id) || null;
  }

  async getTasks(params: { roomId?: UUID; tags?: string[] }): Promise<Task[]> {
    return Array.from(this.tasks.values()).filter(task => {
      const matchesRoom = !params.roomId || task.roomId === params.roomId;
      const matchesTags = !params.tags || params.tags.some(tag => task.tags.includes(tag));
      return matchesRoom && matchesTags;
    });
  }

  async updateTask(id: UUID, updates: Partial<Task>): Promise<void> {
    const task = this.tasks.get(id);
    if (task) {
      this.tasks.set(id, { ...task, ...updates });
    }
  }

  async deleteTask(id: UUID): Promise<boolean> {
    return this.tasks.delete(id);
  }

  // Cache operations
  async setCache(key: string, value: any): Promise<boolean> {
    this.cache.set(key, value);
    return true;
  }

  async getCache<T>(key: string): Promise<T | null> {
    return this.cache.get(key) || null;
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

  async addParticipantsRoom(): Promise<boolean> {
    return true;
  }

  async getMemoriesByRoomIds(): Promise<Memory[]> {
    return [];
  }
}
