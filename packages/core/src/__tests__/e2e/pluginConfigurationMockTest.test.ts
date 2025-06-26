/**
 * Plugin Configuration System Test with Mock Database
 * Tests complete plugin lifecycle while avoiding Drizzle circular reference issues
 * Uses mock database adapter to focus on plugin configuration functionality
 */

import { describe, it, expect, beforeEach, afterEach } from 'bun:test';
import { AgentRuntime } from '../../runtime';
import { Service } from '../../types/service';
import type {
  IAgentRuntime,
  Plugin,
  Action,
  Provider,
  Evaluator,
  Memory,
  State,
  HandlerCallback,
  Character,
  IDatabaseAdapter,
  UUID,
  Entity,
  Room,
  Component,
  Task,
  Agent,
  Participant,
  Relationship,
  World,
  Log,
} from '../../types';

// Mock Database Adapter to avoid Drizzle issues
class MockDatabaseAdapter implements IDatabaseAdapter {
  db = {}; // Add the required db property
  private data: Map<string, any> = new Map();
  private isInitialized = false;

  async init(): Promise<void> {
    this.isInitialized = true;
  }

  async initialize(): Promise<void> {
    this.isInitialized = true;
  }

  async runMigrations(): Promise<void> {
    // Mock implementation
  }

  async getConnection(): Promise<unknown> {
    return {};
  }

  async isReady(): Promise<boolean> {
    return this.isInitialized;
  }

  async close(): Promise<void> {
    this.data.clear();
    this.isInitialized = false;
  }

  // Mock implementations of all required database methods
  async createMemory(memory: Memory, tableName: string, unique?: boolean): Promise<UUID> {
    const id = memory.id || (`${Date.now()}-${Math.random().toString(36).substr(2, 9)}` as UUID);
    const key = `memory:${id}`;
    this.data.set(key, { ...memory, id });
    return id;
  }

  async getMemoryById(id: UUID): Promise<Memory | null> {
    return this.data.get(`memory:${id}`) || null;
  }

  async getMemoriesByIds(memoryIds: UUID[], tableName?: string): Promise<Memory[]> {
    const memories: Memory[] = [];
    for (const id of memoryIds) {
      const memory = this.data.get(`memory:${id}`);
      if (memory) {
        memories.push(memory);
      }
    }
    return memories;
  }

  async getMemories(params: any): Promise<Memory[]> {
    const memories: Memory[] = [];
    for (const [key, value] of this.data.entries()) {
      if (key.startsWith('memory:')) {
        memories.push(value);
      }
    }
    return memories.slice(0, params.count || 10);
  }

  async getMemoriesByRoomIds(params: {
    roomIds: UUID[];
    tableName: string;
    limit?: number;
  }): Promise<Memory[]> {
    const memories: Memory[] = [];
    for (const [key, value] of this.data.entries()) {
      if (key.startsWith('memory:') && params.roomIds.includes(value.roomId)) {
        memories.push(value);
      }
    }
    return memories.slice(0, params.limit || memories.length);
  }

  async updateMemory(memory: Partial<Memory> & { id: UUID }): Promise<boolean> {
    const key = `memory:${memory.id}`;
    if (this.data.has(key)) {
      const existing = this.data.get(key);
      this.data.set(key, { ...existing, ...memory });
      return true;
    }
    return false;
  }

  async deleteMemory(id: UUID): Promise<void> {
    this.data.delete(`memory:${id}`);
  }

  async deleteManyMemories(memoryIds: UUID[]): Promise<void> {
    for (const id of memoryIds) {
      this.data.delete(`memory:${id}`);
    }
  }

  async deleteAllMemories(roomId: UUID, tableName: string): Promise<void> {
    for (const [key, memory] of this.data.entries()) {
      if (key.startsWith('memory:') && memory.roomId === roomId) {
        this.data.delete(key);
      }
    }
  }

  async searchMemories(params: any): Promise<Memory[]> {
    return this.getMemories(params);
  }

  async getCachedEmbeddings(
    params: any
  ): Promise<{ embedding: number[]; levenshtein_score: number }[]> {
    return [];
  }

  // Entity methods
  async createEntity(entity: any): Promise<void> {
    this.data.set(`entity:${entity.id}`, entity);
  }

  async createEntities(entities: Entity[]): Promise<boolean> {
    for (const entity of entities) {
      this.data.set(`entity:${entity.id}`, entity);
    }
    return true;
  }

  async getEntitiesByIds(ids: UUID[]): Promise<Entity[] | null> {
    const entities: Entity[] = [];
    for (const id of ids) {
      const entity = this.data.get(`entity:${id}`);
      if (entity) {
        entities.push(entity);
      }
    }
    return entities.length > 0 ? entities : null;
  }

  async getEntitiesForRoom(roomId: UUID, includeComponents?: boolean): Promise<Entity[]> {
    const entities: Entity[] = [];
    for (const [key, value] of this.data.entries()) {
      if (key.startsWith('entity:')) {
        entities.push(value);
      }
    }
    return entities;
  }

  async updateEntity(entity: Entity): Promise<void> {
    if (this.data.has(`entity:${entity.id}`)) {
      this.data.set(`entity:${entity.id}`, entity);
    }
  }

  // Room methods
  async createRoom(room: any): Promise<void> {
    this.data.set(`room:${room.id}`, room);
  }

  async createRooms(rooms: Room[]): Promise<UUID[]> {
    const ids: UUID[] = [];
    for (const room of rooms) {
      this.data.set(`room:${room.id}`, room);
      ids.push(room.id);
    }
    return ids;
  }

  async getRoom(id: string): Promise<any> {
    return this.data.get(`room:${id}`) || null;
  }

  async getRoomsByIds(ids: UUID[]): Promise<Room[] | null> {
    const rooms: Room[] = [];
    for (const id of ids) {
      const room = this.data.get(`room:${id}`);
      if (room) {
        rooms.push(room);
      }
    }
    return rooms.length > 0 ? rooms : null;
  }

  async getRoomsByWorld(worldId: UUID): Promise<Room[]> {
    const rooms: Room[] = [];
    for (const [key, value] of this.data.entries()) {
      if (key.startsWith('room:') && value.worldId === worldId) {
        rooms.push(value);
      }
    }
    return rooms;
  }

  async updateRoom(room: Room): Promise<void> {
    if (this.data.has(`room:${room.id}`)) {
      this.data.set(`room:${room.id}`, room);
    }
  }

  async deleteRoom(id: UUID): Promise<void> {
    this.data.delete(`room:${id}`);
  }

  async deleteRoomsByWorldId(worldId: UUID): Promise<void> {
    for (const [key, room] of this.data.entries()) {
      if (key.startsWith('room:') && room.worldId === worldId) {
        this.data.delete(key);
      }
    }
  }

  // Component methods
  async createComponent(component: Component): Promise<boolean> {
    this.data.set(`component:${component.id}`, component);
    return true;
  }

  async getComponent(
    entityId: UUID,
    type: string,
    worldId?: UUID,
    sourceEntityId?: UUID
  ): Promise<Component | null> {
    for (const [key, value] of this.data.entries()) {
      if (key.startsWith('component:') && value.entityId === entityId && value.type === type) {
        return value;
      }
    }
    return null;
  }

  async getComponents(entityId: UUID, worldId?: UUID, sourceEntityId?: UUID): Promise<Component[]> {
    const components: Component[] = [];
    for (const [key, value] of this.data.entries()) {
      if (key.startsWith('component:') && value.entityId === entityId) {
        components.push(value);
      }
    }
    return components;
  }

  async updateComponent(component: Component): Promise<void> {
    if (this.data.has(`component:${component.id}`)) {
      this.data.set(`component:${component.id}`, component);
    }
  }

  async deleteComponent(id: UUID): Promise<void> {
    this.data.delete(`component:${id}`);
  }

  // Participant methods
  async addParticipant(entityId: string, roomId: string): Promise<void> {
    const key = `participant:${entityId}:${roomId}`;
    this.data.set(key, { entityId, roomId });
  }

  async addParticipantsRoom(entityIds: UUID[], roomId: UUID): Promise<boolean> {
    for (const entityId of entityIds) {
      await this.addParticipant(entityId, roomId);
    }
    return true;
  }

  async removeParticipant(entityId: UUID, roomId: UUID): Promise<boolean> {
    this.data.delete(`participant:${entityId}:${roomId}`);
    return true;
  }

  async getParticipantsForRoom(roomId: UUID): Promise<UUID[]> {
    const participants: UUID[] = [];
    for (const [key, value] of this.data.entries()) {
      if (key.startsWith('participant:') && value.roomId === roomId) {
        participants.push(value.entityId);
      }
    }
    return participants;
  }

  async getRoomsForParticipant(entityId: UUID): Promise<UUID[]> {
    const roomIds: UUID[] = [];
    for (const [key, value] of this.data.entries()) {
      if (key.startsWith('participant:') && value.entityId === entityId) {
        roomIds.push(value.roomId);
      }
    }
    return roomIds;
  }

  async getRoomsForParticipants(userIds: UUID[]): Promise<UUID[]> {
    const roomIds = new Set<UUID>();
    for (const [key, value] of this.data.entries()) {
      if (key.startsWith('participant:') && userIds.includes(value.entityId)) {
        roomIds.add(value.roomId);
      }
    }
    return Array.from(roomIds);
  }

  async getParticipantsForEntity(entityId: UUID): Promise<Participant[]> {
    const participants: Participant[] = [];
    for (const [key, value] of this.data.entries()) {
      if (key.startsWith('participant:') && value.entityId === entityId) {
        participants.push(value);
      }
    }
    return participants;
  }

  async getParticipantUserState(
    roomId: UUID,
    entityId: UUID
  ): Promise<'FOLLOWED' | 'MUTED' | null> {
    return this.data.get(`userState:${roomId}:${entityId}`) || null;
  }

  async setParticipantUserState(
    roomId: UUID,
    entityId: UUID,
    state: 'FOLLOWED' | 'MUTED' | null
  ): Promise<void> {
    this.data.set(`userState:${roomId}:${entityId}`, state);
  }

  // Relationship methods
  async createRelationship(params: {
    sourceEntityId: UUID;
    targetEntityId: UUID;
    tags?: string[];
    metadata?: Record<string, unknown>;
  }): Promise<boolean> {
    const id = `${params.sourceEntityId}-${params.targetEntityId}`;
    this.data.set(`relationship:${id}`, params);
    return true;
  }

  async getRelationships(params: { entityId: UUID; tags?: string[] }): Promise<Relationship[]> {
    const relationships: Relationship[] = [];
    for (const [key, value] of this.data.entries()) {
      if (key.startsWith('relationship:')) {
        relationships.push(value);
      }
    }
    return relationships;
  }

  async getRelationship(params: {
    sourceEntityId: UUID;
    targetEntityId: UUID;
  }): Promise<Relationship | null> {
    const id = `${params.sourceEntityId}-${params.targetEntityId}`;
    return this.data.get(`relationship:${id}`) || null;
  }

  async updateRelationship(params: {
    sourceEntityId: UUID;
    targetEntityId: UUID;
    tags?: string[];
    metadata?: Record<string, unknown>;
  }): Promise<void> {
    const id = `${params.sourceEntityId}-${params.targetEntityId}`;
    if (this.data.has(`relationship:${id}`)) {
      this.data.set(`relationship:${id}`, params);
    }
  }

  // Cache methods
  async setCache<T>(key: string, value: T): Promise<boolean> {
    this.data.set(`cache:${key}`, value);
    return true;
  }

  async getCache<T>(key: string): Promise<T | undefined> {
    return this.data.get(`cache:${key}`);
  }

  async deleteCache(key: string): Promise<boolean> {
    this.data.delete(`cache:${key}`);
    return true;
  }

  // World methods
  async createWorld(world: World): Promise<UUID> {
    this.data.set(`world:${world.id}`, world);
    return world.id;
  }

  async getWorld(id: UUID): Promise<World | null> {
    return this.data.get(`world:${id}`) || null;
  }

  async getAllWorlds(): Promise<World[]> {
    const worlds: World[] = [];
    for (const [key, value] of this.data.entries()) {
      if (key.startsWith('world:')) {
        worlds.push(value);
      }
    }
    return worlds;
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
    return this.getAllWorlds();
  }

  async updateWorld(world: World): Promise<void> {
    if (this.data.has(`world:${world.id}`)) {
      this.data.set(`world:${world.id}`, world);
    }
  }

  async removeWorld(id: UUID): Promise<void> {
    this.data.delete(`world:${id}`);
  }

  // Task methods
  async createTask(task: Task): Promise<UUID> {
    const taskId = task.id || (`${Date.now()}-${Math.random().toString(36).substr(2, 9)}` as UUID);
    this.data.set(`task:${taskId}`, { ...task, id: taskId });
    return taskId;
  }

  async getTask(id: UUID): Promise<Task | null> {
    return this.data.get(`task:${id}`) || null;
  }

  async getTasks(params: { roomId?: UUID; tags?: string[]; entityId?: UUID }): Promise<Task[]> {
    const tasks: Task[] = [];
    for (const [key, value] of this.data.entries()) {
      if (key.startsWith('task:')) {
        tasks.push(value);
      }
    }
    return tasks;
  }

  async getTasksByName(name: string): Promise<Task[]> {
    const tasks: Task[] = [];
    for (const [key, value] of this.data.entries()) {
      if (key.startsWith('task:') && value.name === name) {
        tasks.push(value);
      }
    }
    return tasks;
  }

  async updateTask(id: UUID, updates: Partial<Task>): Promise<void> {
    const task = this.data.get(`task:${id}`);
    if (task) {
      this.data.set(`task:${id}`, { ...task, ...updates });
    }
  }

  async deleteTask(id: UUID): Promise<void> {
    this.data.delete(`task:${id}`);
  }

  // Agent methods
  async getAgent(agentId: UUID): Promise<Agent | null> {
    return this.data.get(`agent:${agentId}`) || null;
  }

  async getAgents(): Promise<Partial<Agent>[]> {
    const agents: Partial<Agent>[] = [];
    for (const [key, value] of this.data.entries()) {
      if (key.startsWith('agent:')) {
        agents.push(value);
      }
    }
    return agents;
  }

  async createAgent(agent: Partial<Agent>): Promise<boolean> {
    this.data.set(`agent:${agent.id}`, agent);
    return true;
  }

  async updateAgent(agentId: UUID, agent: Partial<Agent>): Promise<boolean> {
    if (this.data.has(`agent:${agentId}`)) {
      this.data.set(`agent:${agentId}`, { ...this.data.get(`agent:${agentId}`), ...agent });
      return true;
    }
    return false;
  }

  async deleteAgent(agentId: UUID): Promise<boolean> {
    this.data.delete(`agent:${agentId}`);
    return true;
  }

  // Misc methods
  async ensureEmbeddingDimension(dimension: number): Promise<void> {
    // Mock implementation
  }

  async countMemories(roomId: UUID, unique?: boolean, tableName?: string): Promise<number> {
    let count = 0;
    for (const [key, memory] of this.data.entries()) {
      if (key.startsWith('memory:') && memory.roomId === roomId) {
        count++;
      }
    }
    return count;
  }

  async getMemoriesByWorldId(params: {
    worldId: UUID;
    count?: number;
    tableName?: string;
  }): Promise<Memory[]> {
    const memories: Memory[] = [];
    for (const [key, value] of this.data.entries()) {
      if (key.startsWith('memory:') && value.worldId === params.worldId) {
        memories.push(value);
      }
    }
    return memories.slice(0, params.count || memories.length);
  }

  // Log methods
  async log(params: {
    body: { [key: string]: unknown };
    entityId: UUID;
    roomId: UUID;
    type: string;
  }): Promise<void> {
    const id = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    this.data.set(`log:${id}`, { id, ...params });
  }

  async getLogs(params: {
    entityId: UUID;
    roomId?: UUID;
    type?: string;
    count?: number;
    offset?: number;
  }): Promise<Log[]> {
    const logs: Log[] = [];
    for (const [key, value] of this.data.entries()) {
      if (key.startsWith('log:') && value.entityId === params.entityId) {
        logs.push(value);
      }
    }
    return logs.slice(params.offset || 0, (params.offset || 0) + (params.count || logs.length));
  }

  async deleteLog(logId: UUID): Promise<void> {
    this.data.delete(`log:${logId}`);
  }
}

// Real Test Services with Environment Variable Validation
class TestDatabaseService extends Service {
  static serviceName = 'test-database-service';
  static serviceType = 'data_storage' as any;
  capabilityDescription = 'Test database service with environment variable requirements';

  private connections: Map<string, any> = new Map();
  private isStarted = false;
  private dbUrl: string = '';
  private apiKey: string = '';

  static async start(runtime: IAgentRuntime): Promise<TestDatabaseService> {
    const dbUrl = runtime.getSetting('DATABASE_URL');
    const apiKey = runtime.getSetting('DATABASE_API_KEY');

    if (!dbUrl) {
      throw new Error('DATABASE_URL environment variable is required for TestDatabaseService');
    }

    if (!apiKey) {
      throw new Error('DATABASE_API_KEY environment variable is required for TestDatabaseService');
    }

    const service = new TestDatabaseService(runtime);
    service.dbUrl = dbUrl;
    service.apiKey = apiKey;
    await service.initialize();
    return service;
  }

  private async initialize(): Promise<void> {
    console.log('TestDatabaseService: Connecting to test database...', this.dbUrl);

    this.connections.set('read', {
      host: this.dbUrl,
      status: 'connected',
      queries: 0,
    });
    this.connections.set('write', {
      host: this.dbUrl,
      status: 'connected',
      queries: 0,
    });

    this.isStarted = true;
    console.log(
      'TestDatabaseService: Successfully connected with',
      this.connections.size,
      'connection pools'
    );
  }

  async query(sql: string, params: any[] = []): Promise<any[]> {
    if (!this.isStarted) {
      throw new Error('TestDatabaseService not started');
    }

    const connection = this.connections.get('read');
    if (!connection) {
      throw new Error('No read connection available');
    }

    connection.queries++;
    console.log(`TestDatabaseService: Executing query: ${sql.substring(0, 50)}...`);

    return [{ id: 1, result: 'test data', timestamp: new Date().toISOString() }];
  }

  getConnectionStats(): any {
    return {
      isStarted: this.isStarted,
      connections: Array.from(this.connections.entries()).map(([name, conn]) => ({
        name,
        status: conn.status,
        queries: conn.queries,
      })),
    };
  }

  async stop(): Promise<void> {
    console.log('TestDatabaseService: Stopping service...');
    this.connections.clear();
    this.isStarted = false;
    console.log('TestDatabaseService: Service stopped');
  }
}

class TestAuthService extends Service {
  static serviceName = 'test-auth-service';
  static serviceType = 'security' as any;
  capabilityDescription = 'Test authentication service';

  private sessions: Map<string, any> = new Map();
  private users: Map<string, any> = new Map();
  private isStarted = false;

  static async start(runtime: IAgentRuntime): Promise<TestAuthService> {
    const service = new TestAuthService(runtime);
    await service.initialize();
    return service;
  }

  private async initialize(): Promise<void> {
    console.log('TestAuthService: Initializing...');

    this.users.set('admin', {
      id: 'admin',
      username: 'admin',
      roles: ['admin', 'user'],
      createdAt: new Date().toISOString(),
    });

    this.isStarted = true;
    console.log('TestAuthService: Initialized with', this.users.size, 'users');
  }

  async authenticate(
    username: string,
    password: string
  ): Promise<{ token: string; user: any } | null> {
    if (!this.isStarted) {
      throw new Error('TestAuthService not started');
    }

    const user = this.users.get(username);
    if (!user) {
      return null;
    }

    const token = `token_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    this.sessions.set(token, { userId: user.id, createdAt: new Date() });

    return { token, user };
  }

  getStats(): any {
    return {
      isStarted: this.isStarted,
      activeUsers: this.users.size,
      activeSessions: this.sessions.size,
    };
  }

  async stop(): Promise<void> {
    console.log('TestAuthService: Stopping...');
    this.sessions.clear();
    this.users.clear();
    this.isStarted = false;
    console.log('TestAuthService: Stopped');
  }
}

// Test Action with Service Dependencies
const testQueryAction: Action = {
  name: 'TEST_QUERY_DATABASE',
  similes: ['test_query_db', 'test_database_query'],
  description: 'Execute test database queries using the test database service',
  examples: [
    [
      { name: 'user', content: { text: 'test query the database' } },
      {
        name: 'assistant',
        content: {
          text: "I'll test query the database for you.",
          actions: ['TEST_QUERY_DATABASE'],
        },
      },
    ],
  ],

  validate: async (runtime: IAgentRuntime, message: Memory): Promise<boolean> => {
    const dbService = runtime.getService('test-database-service') as TestDatabaseService;
    const authService = runtime.getService('test-auth-service') as TestAuthService;

    if (!dbService || !authService) {
      console.log('TEST_QUERY_DATABASE validation failed: Required services not available');
      return false;
    }

    const dbStats = dbService.getConnectionStats();
    if (!dbStats.isStarted) {
      console.log('TEST_QUERY_DATABASE validation failed: TestDatabaseService not started');
      return false;
    }

    console.log('TEST_QUERY_DATABASE validation passed');
    return true;
  },

  handler: async (
    runtime: IAgentRuntime,
    message: Memory,
    state?: State,
    options?: any,
    callback?: HandlerCallback
  ) => {
    try {
      const dbService = runtime.getService('test-database-service') as TestDatabaseService;
      const authService = runtime.getService('test-auth-service') as TestAuthService;

      if (!dbService || !authService) {
        throw new Error('Required services not available');
      }

      const authResult = await authService.authenticate('admin', 'password');
      if (!authResult) {
        throw new Error('Authentication failed');
      }

      const results = await dbService.query('SELECT * FROM test_users WHERE active = ?', [true]);

      const response = `Test database query executed successfully. Found ${results.length} results. Auth token: ${authResult.token.substring(0, 20)}...`;

      if (callback) {
        await callback({
          text: response,
          actions: ['TEST_QUERY_DATABASE'],
          thought: 'Successfully executed test database query with authentication',
        });
      }

      return {
        text: response,
        data: {
          queryResults: results,
          authToken: authResult.token,
          timestamp: new Date().toISOString(),
        },
      };
    } catch (error) {
      const errorMessage = `Test database query failed: ${error instanceof Error ? error.message : 'Unknown error'}`;
      console.error('TEST_QUERY_DATABASE error:', error);

      if (callback) {
        await callback({
          text: errorMessage,
          actions: ['TEST_QUERY_DATABASE'],
          thought: 'Test database query failed due to error',
        });
      }

      throw error;
    }
  },
};

// Test Provider with Service Dependencies
const testStatsProvider: Provider = {
  name: 'TEST_SYSTEM_STATS',
  description: 'Provides real-time test system statistics from services',

  get: async (runtime: IAgentRuntime, message: Memory, state?: State) => {
    try {
      const dbService = runtime.getService('test-database-service') as TestDatabaseService;
      const authService = runtime.getService('test-auth-service') as TestAuthService;

      const stats: any = {
        timestamp: new Date().toISOString(),
        services: {
          database: dbService ? dbService.getConnectionStats() : { status: 'not_available' },
          auth: authService ? authService.getStats() : { status: 'not_available' },
        },
      };

      const text = `[TEST SYSTEM STATS]
Database Service: ${stats.services.database.isStarted ? 'RUNNING' : 'STOPPED'}
${stats.services.database.connections ? `Active Connections: ${stats.services.database.connections.length}` : ''}
Auth Service: ${stats.services.auth.isStarted ? 'RUNNING' : 'STOPPED'}
${stats.services.auth.activeUsers ? `Active Users: ${stats.services.auth.activeUsers}` : ''}
Timestamp: ${stats.timestamp}
[/TEST SYSTEM STATS]`;

      return {
        text,
        values: {
          systemStats: stats,
          servicesRunning:
            (dbService?.getConnectionStats().isStarted || false) &&
            (authService?.getStats().isStarted || false),
        },
        data: {
          fullStats: stats,
        },
      };
    } catch (error) {
      console.error('TEST_SYSTEM_STATS provider error:', error);
      return {
        text: `[TEST SYSTEM STATS ERROR: ${error instanceof Error ? error.message : 'Unknown error'}]`,
        values: { systemStats: null, servicesRunning: false },
      };
    }
  },
};

// Test Evaluator with Service Dependencies
const testPerformanceEvaluator: Evaluator = {
  name: 'TEST_PERFORMANCE_EVALUATOR',
  description: 'Evaluates test service performance and logs metrics',
  examples: [
    {
      prompt: 'Test system performance evaluation',
      messages: [
        { name: 'user', content: { text: 'How is the test system performing?' } },
        { name: 'assistant', content: { text: 'Let me check the test system performance.' } },
      ],
      outcome: 'Test performance metrics logged and evaluated',
    },
  ],

  validate: async (runtime: IAgentRuntime, message: Memory): Promise<boolean> => {
    // Run evaluation periodically
    const shouldRun = Math.random() < 0.5; // 50% chance for testing
    console.log('TEST_PERFORMANCE_EVALUATOR validate:', shouldRun ? 'will run' : 'skipping');
    return shouldRun;
  },

  handler: async (
    runtime: IAgentRuntime,
    message: Memory,
    state?: State,
    options?: any,
    callback?: HandlerCallback
  ) => {
    try {
      const dbService = runtime.getService('test-database-service') as TestDatabaseService;
      const authService = runtime.getService('test-auth-service') as TestAuthService;

      const metrics = {
        timestamp: new Date().toISOString(),
        messageId: message.id,
        roomId: message.roomId,
        services: {
          database: dbService ? dbService.getConnectionStats() : null,
          auth: authService ? authService.getStats() : null,
        },
        performance: {
          responseTime: Date.now() - (message.createdAt || Date.now()),
          memoryUsage: process.memoryUsage ? process.memoryUsage() : null,
        },
      };

      console.log('TEST_PERFORMANCE_EVALUATOR metrics:', JSON.stringify(metrics, null, 2));

      // Return boolean for evaluator
      return true;
    } catch (error) {
      console.error('TEST_PERFORMANCE_EVALUATOR error:', error);
      return false;
    }
  },
};

// Plugin with Environment Variable Requirements
const testPluginWithEnvVars: Plugin = {
  name: 'test-plugin-with-env-vars',
  description: 'Test plugin that requires specific environment variables',
  services: [TestDatabaseService],
  actions: [testQueryAction],
  providers: [testStatsProvider],
  evaluators: [testPerformanceEvaluator],

  init: async (config: Record<string, string>, runtime: IAgentRuntime) => {
    console.log('test-plugin-with-env-vars: Initializing with config:', Object.keys(config));

    const required = ['DATABASE_URL', 'DATABASE_API_KEY'];
    const missing = required.filter((key) => !runtime.getSetting(key));

    if (missing.length > 0) {
      throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
    }

    console.log('test-plugin-with-env-vars: All required environment variables present');
  },
};

// Plugin without Environment Variable Requirements
const testPluginNoEnvVars: Plugin = {
  name: 'test-plugin-no-env-vars',
  description: 'Test plugin that works without special environment variables',
  services: [TestAuthService],
  actions: [],
  providers: [],
  evaluators: [],

  init: async (config: Record<string, string>, runtime: IAgentRuntime) => {
    console.log('test-plugin-no-env-vars: Initializing (no env vars required)');
    console.log('test-plugin-no-env-vars: TestAuthService will be available for other plugins');
  },
};

describe('Plugin Configuration System Mock Tests', () => {
  let runtime: AgentRuntime;
  let mockAdapter: MockDatabaseAdapter;

  beforeEach(async () => {
    // Create mock database adapter
    mockAdapter = new MockDatabaseAdapter();
    await mockAdapter.init();
    await mockAdapter.initialize();

    // Create test character with environment variables
    const testCharacter: Character = {
      name: 'MockTestAgent',
      bio: ['I am a test agent for plugin configuration system testing with mock database'],
      system: 'You are a test agent designed to validate plugin configuration functionality.',
      messageExamples: [
        [
          { name: 'user', content: { text: 'test the database' } },
          {
            name: 'MockTestAgent',
            content: {
              text: "I'll test the database connection for you.",
              actions: ['TEST_QUERY_DATABASE'],
            },
          },
        ],
      ],
      postExamples: [],
      topics: ['testing', 'configuration', 'plugins'],
      knowledge: [],
      plugins: ['test-plugin-with-env-vars', 'test-plugin-no-env-vars'],
      settings: {
        DATABASE_URL: 'postgresql://test:test@localhost:5432/testdb',
        DATABASE_API_KEY: 'test-api-key-12345',
      },
      secrets: {},
    };

    // Create runtime with test character
    runtime = new AgentRuntime({
      character: testCharacter,
      adapter: mockAdapter,
    });

    // Set environment variables for this test
    (runtime as any).settings = {
      DATABASE_URL: 'postgresql://test:test@localhost:5432/testdb',
      DATABASE_API_KEY: 'test-api-key-12345',
    };

    await runtime.initialize();
  });

  afterEach(async () => {
    if (runtime) {
      // Stop all services
      for (const [serviceName, service] of runtime.services.entries()) {
        try {
          await service.stop();
        } catch (error) {
          console.warn(`Error stopping service ${serviceName}:`, error);
        }
      }
      runtime.services.clear();
    }

    // Close mock database
    if (mockAdapter) {
      await mockAdapter.close();
    }
  });

  it('should register and initialize plugins with environment variable validation', async () => {
    console.log('🧪 Test 1: Plugin Registration and Environment Variable Validation');

    // Register test plugins
    await runtime.registerPlugin(testPluginWithEnvVars);
    await runtime.registerPlugin(testPluginNoEnvVars);

    console.log('✅ Plugins registered successfully');

    // Verify services started
    const dbService = runtime.getService('test-database-service') as TestDatabaseService;
    const authService = runtime.getService('test-auth-service') as TestAuthService;

    expect(dbService).toBeDefined();
    expect(authService).toBeDefined();

    const dbStats = dbService.getConnectionStats();
    const authStats = authService.getStats();

    expect(dbStats.isStarted).toBe(true);
    expect(authStats.isStarted).toBe(true);

    console.log('✅ Test 1 passed: Services started correctly');
  });

  it('should execute actions with service dependencies', async () => {
    console.log('🧪 Test 2: Action Execution with Service Dependencies');

    // Register plugins first
    await runtime.registerPlugin(testPluginWithEnvVars);
    await runtime.registerPlugin(testPluginNoEnvVars);

    const queryAction = runtime.actions.find((a) => a.name === 'TEST_QUERY_DATABASE');
    expect(queryAction).toBeDefined();

    if (!queryAction) {
      throw new Error('TEST_QUERY_DATABASE action not found');
    }

    const testMessage: Memory = {
      id: `test-msg-1-${Date.now()}` as UUID,
      entityId: `test-user-${Date.now()}` as UUID,
      roomId: `test-room-${Date.now()}` as UUID,
      agentId: runtime.agentId,
      content: { text: 'test query the database for user data' },
      createdAt: Date.now(),
    };

    const isValid = await queryAction.validate(runtime, testMessage);
    expect(isValid).toBe(true);

    const result = await queryAction.handler(runtime, testMessage);
    expect(result).toBeDefined();
    expect((result as any).text).toContain('Test database query executed successfully');

    console.log('✅ Test 2 passed: Action executed successfully with service dependencies');
  });

  it('should test provider execution with service dependencies', async () => {
    console.log('🧪 Test 3: Provider Execution with Service Dependencies');

    // Register plugins first
    await runtime.registerPlugin(testPluginWithEnvVars);
    await runtime.registerPlugin(testPluginNoEnvVars);

    const statsProvider = runtime.providers.find((p) => p.name === 'TEST_SYSTEM_STATS');
    expect(statsProvider).toBeDefined();

    if (!statsProvider) {
      throw new Error('TEST_SYSTEM_STATS provider not found');
    }

    const testMessage: Memory = {
      id: `test-msg-3-${Date.now()}` as UUID,
      entityId: `test-user-${Date.now()}` as UUID,
      roomId: `test-room-${Date.now()}` as UUID,
      agentId: runtime.agentId,
      content: { text: 'get test system stats' },
      createdAt: Date.now(),
    };

    const providerResult = await statsProvider.get(runtime, testMessage, {
      values: {},
      data: {},
      text: '',
    });
    expect(providerResult).toBeDefined();
    expect(providerResult.text).toContain('TEST SYSTEM STATS');
    expect(providerResult.values?.systemStats).toBeDefined();

    console.log('✅ Test 3 passed: Provider executed successfully with service dependencies');
  });

  it('should validate environment variables and handle missing vars', async () => {
    console.log('🧪 Test 4: Environment Variable Validation');

    // Create a plugin that should fail due to missing env vars
    const pluginWithMissingEnvVars: Plugin = {
      name: 'test-plugin-missing-env-vars',
      description: 'Test plugin that requires missing environment variables',
      services: [],

      init: async (config: Record<string, string>, runtime: IAgentRuntime) => {
        const missingVar = runtime.getSetting('MISSING_ENV_VAR');
        if (!missingVar) {
          throw new Error('MISSING_ENV_VAR environment variable is required');
        }
      },
    };

    // This should fail
    let failed = false;
    try {
      await runtime.registerPlugin(pluginWithMissingEnvVars);
    } catch (error) {
      failed = true;
      expect(error instanceof Error ? error.message : String(error)).toContain('MISSING_ENV_VAR');
    }

    expect(failed).toBe(true);
    console.log('✅ Test 4 passed: Environment variable validation works correctly');
  });

  it('should generate final system statistics report', async () => {
    console.log('🧪 Test 5: Final System Statistics Report');

    // Register plugins first
    await runtime.registerPlugin(testPluginWithEnvVars);
    await runtime.registerPlugin(testPluginNoEnvVars);

    const dbService = runtime.getService('test-database-service') as TestDatabaseService;
    const authService = runtime.getService('test-auth-service') as TestAuthService;

    const finalDbStats = dbService.getConnectionStats();
    const finalAuthStats = authService.getStats();

    console.log('📊 Final Test System Stats:');
    console.log('- Database Service:', finalDbStats);
    console.log('- Auth Service:', finalAuthStats);
    console.log('- Actions:', runtime.actions.length);
    console.log('- Providers:', runtime.providers.length);
    console.log('- Evaluators:', runtime.evaluators.length);
    console.log('- Services:', runtime.services.size);

    // Verify all components are working
    expect(finalDbStats.isStarted).toBe(true);
    expect(finalAuthStats.isStarted).toBe(true);
    expect(runtime.actions.length).toBeGreaterThan(0);
    expect(runtime.providers.length).toBeGreaterThan(0);
    expect(runtime.evaluators.length).toBeGreaterThan(0);
    expect(runtime.services.size).toBeGreaterThan(0);

    console.log('🎉 All Plugin Configuration System Mock Tests Passed!');
  });
});

export {
  TestDatabaseService,
  TestAuthService,
  testQueryAction,
  testStatsProvider,
  testPerformanceEvaluator,
  testPluginWithEnvVars,
  testPluginNoEnvVars,
  MockDatabaseAdapter,
};
