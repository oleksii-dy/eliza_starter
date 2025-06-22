import { AgentRuntime } from '../../runtime';
import type { IAgentRuntime, Character, Plugin, UUID, IDatabaseAdapter, Memory } from '../../types';
import { createLogger } from '../../logger';
import { v4 as uuidv4 } from 'uuid';

// Working memory-based database adapter for testing
class InMemoryDatabaseAdapter implements IDatabaseAdapter {
  // Required by IDatabaseAdapter interface
  db: any = {};
  
  private data = {
    agents: new Map<UUID, any>(),
    memories: new Map<UUID, Memory>(),
    entities: new Map<UUID, any>(),
    relationships: new Map<UUID, any>(),
    rooms: new Map<UUID, any>(),
    participants: new Map<string, any>(),
    logs: new Array<any>(),
    cache: new Map<string, any>(),
    tasks: new Map<UUID, any>(),
    worlds: new Map<UUID, any>(),
    components: new Map<UUID, any>(),
  };

  async initialize(config?: any): Promise<void> {
    // Memory adapter is ready immediately
  }

  async init(): Promise<void> {
    // Memory adapter is ready immediately
  }

  async close(): Promise<void> {
    this.data = {
      agents: new Map(),
      memories: new Map(),
      entities: new Map(),
      relationships: new Map(),
      rooms: new Map(),
      participants: new Map(),
      logs: [],
      cache: new Map(),
      tasks: new Map(),
      worlds: new Map(),
      components: new Map(),
    };
  }

  async createAgent(agent: any): Promise<any> {
    this.data.agents.set(agent.id, agent);
    return agent;
  }

  async getAgent(agentId: UUID): Promise<any | null> {
    return this.data.agents.get(agentId) || null;
  }

  async updateAgent(agentId: UUID, agent: any): Promise<boolean> {
    this.data.agents.set(agentId, agent);
    return true;
  }

  async getAgents(): Promise<any[]> {
    return Array.from(this.data.agents.values());
  }

  async createMemory(memory: Memory, tableName = 'messages'): Promise<UUID> {
    const id = memory.id || (uuidv4() as UUID);
    this.data.memories.set(id, { ...memory, id });
    return id;
  }

  async getMemories(params: any): Promise<Memory[]> {
    const memories = Array.from(this.data.memories.values());
    let filtered = memories;

    if (params.roomId) {
      filtered = filtered.filter(m => m.roomId === params.roomId);
    }
    if (params.entityId) {
      filtered = filtered.filter(m => m.entityId === params.entityId);
    }

    // Sort by creation time, most recent first
    filtered.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));

    if (params.count) {
      filtered = filtered.slice(0, params.count);
    }

    return filtered;
  }

  async searchMemories(params: any): Promise<Memory[]> {
    // Simple search implementation - in real usage this would use vector similarity
    const memories = Array.from(this.data.memories.values());
    let filtered = memories;

    if (params.roomId) {
      filtered = filtered.filter(m => m.roomId === params.roomId);
    }

    if (params.embedding && filtered.length > 0) {
      // Simulate similarity search by returning memories with embeddings
      filtered = filtered.filter(m => m.embedding);
      
      // For testing, just return all matching memories
      filtered = filtered.slice(0, params.count || 10);
    }

    return filtered;
  }

  async updateMemory(memory: Partial<Memory> & { id: UUID }): Promise<boolean> {
    const existing = this.data.memories.get(memory.id);
    if (existing) {
      this.data.memories.set(memory.id, { ...existing, ...memory });
      return true;
    }
    return false;
  }

  async deleteMemory(memoryId: UUID): Promise<void> {
    this.data.memories.delete(memoryId);
  }

  async createEntity(entity: any): Promise<UUID> {
    const id = entity.id || (uuidv4() as UUID);
    this.data.entities.set(id, { ...entity, id });
    return id;
  }

  async getEntity(entityId: UUID): Promise<any | null> {
    return this.data.entities.get(entityId) || null;
  }

  async updateEntity(entity: any): Promise<void> {
    this.data.entities.set(entity.id, entity);
  }

  async getEntitiesByIds(entityIds: UUID[]): Promise<any[]> {
    return entityIds
      .map(id => this.data.entities.get(id))
      .filter(entity => entity !== undefined);
  }

  async getEntitiesForRoom(roomId: UUID, includeComponents?: boolean): Promise<any[]> {
    const participants = Array.from(this.data.participants.values())
      .filter(p => p.roomId === roomId)
      .map(p => p.entityId);
    
    const entities = participants
      .map(entityId => this.data.entities.get(entityId))
      .filter(entity => entity !== undefined);

    if (includeComponents) {
      // Add components to entities if requested
      for (const entity of entities) {
        entity.components = Array.from(this.data.components.values())
          .filter(c => c.entityId === entity.id);
      }
    }

    return entities;
  }

  async createEntities(entities: any[]): Promise<boolean> {
    for (const entity of entities) {
      const id = entity.id || (uuidv4() as UUID);
      this.data.entities.set(id, { ...entity, id });
    }
    return true;
  }

  async createRoom(room: any): Promise<UUID> {
    const id = room.id || (uuidv4() as UUID);
    this.data.rooms.set(id, { ...room, id });
    return id;
  }

  async getRoom(roomId: UUID): Promise<any | null> {
    return this.data.rooms.get(roomId) || null;
  }

  async getRooms(worldId?: UUID): Promise<any[]> {
    const rooms = Array.from(this.data.rooms.values());
    if (worldId) {
      return rooms.filter(r => r.worldId === worldId);
    }
    return rooms;
  }

  async updateRoom(room: any): Promise<void> {
    this.data.rooms.set(room.id, room);
  }

  async deleteRoom(roomId: UUID): Promise<void> {
    this.data.rooms.delete(roomId);
  }

  async getRoomsByIds(roomIds: UUID[]): Promise<any[]> {
    return roomIds
      .map(id => this.data.rooms.get(id))
      .filter(room => room !== undefined);
  }

  async createRooms(rooms: any[]): Promise<any[]> {
    const createdRooms = [];
    for (const room of rooms) {
      const id = room.id || (uuidv4() as UUID);
      const roomWithId = { ...room, id };
      this.data.rooms.set(id, roomWithId);
      createdRooms.push(roomWithId);
    }
    return createdRooms;
  }

  async createWorld(world: any): Promise<UUID> {
    const id = world.id || (uuidv4() as UUID);
    this.data.worlds.set(id, { ...world, id });
    return id;
  }

  async getWorld(worldId: UUID): Promise<any | null> {
    return this.data.worlds.get(worldId) || null;
  }

  async getWorlds(options?: any): Promise<any[]> {
    const worlds = Array.from(this.data.worlds.values());
    if (options?.agentId) {
      return worlds.filter(w => w.agentId === options.agentId);
    }
    return worlds;
  }

  async updateWorld(world: any): Promise<void> {
    this.data.worlds.set(world.id, world);
  }

  async removeWorld(worldId: UUID): Promise<void> {
    this.data.worlds.delete(worldId);
  }

  async addParticipant(entityId: UUID, roomId: UUID): Promise<void> {
    const key = `${entityId}-${roomId}`;
    this.data.participants.set(key, { entityId, roomId });
  }

  async removeParticipant(entityId: UUID, roomId: UUID): Promise<boolean> {
    const key = `${entityId}-${roomId}`;
    return this.data.participants.delete(key);
  }

  async getParticipantsForRoom(roomId: UUID): Promise<any[]> {
    const participants = Array.from(this.data.participants.values());
    return participants.filter(p => p.roomId === roomId);
  }

  async addParticipantsRoom(entityIds: UUID[], roomId: UUID): Promise<boolean> {
    for (const entityId of entityIds) {
      const key = `${entityId}-${roomId}`;
      this.data.participants.set(key, { entityId, roomId });
    }
    return true;
  }

  async setParticipantUserState(roomId: UUID, entityId: UUID, state: any): Promise<void> {
    const key = `${entityId}-${roomId}`;
    const existing = this.data.participants.get(key) || { entityId, roomId };
    this.data.participants.set(key, { ...existing, state });
  }

  async getParticipantUserState(roomId: UUID, entityId: UUID): Promise<any> {
    const key = `${entityId}-${roomId}`;
    const participant = this.data.participants.get(key);
    return participant?.state || null;
  }

  async createTask(task: any): Promise<UUID> {
    const id = task.id || (uuidv4() as UUID);
    this.data.tasks.set(id, { ...task, id });
    return id;
  }

  async getTask(taskId: UUID): Promise<any | null> {
    return this.data.tasks.get(taskId) || null;
  }

  async getTasks(params: any): Promise<any[]> {
    const tasks = Array.from(this.data.tasks.values());
    let filtered = tasks;

    if (params.roomId) {
      filtered = filtered.filter(t => t.roomId === params.roomId);
    }
    if (params.tags && params.tags.length > 0) {
      filtered = filtered.filter(t => 
        params.tags.some((tag: string) => t.tags?.includes(tag))
      );
    }

    return filtered;
  }

  async updateTask(taskId: UUID, updates: any): Promise<void> {
    const existing = this.data.tasks.get(taskId);
    if (existing) {
      this.data.tasks.set(taskId, { ...existing, ...updates });
    }
  }

  async deleteTask(taskId: UUID): Promise<void> {
    this.data.tasks.delete(taskId);
  }

  async createComponent(component: any): Promise<boolean> {
    const id = component.id || (uuidv4() as UUID);
    this.data.components.set(id, { ...component, id });
    return true;
  }

  async getComponent(entityId: UUID, type: string, worldId?: UUID, sourceEntityId?: UUID): Promise<any | null> {
    const components = Array.from(this.data.components.values());
    return components.find(c => 
      c.entityId === entityId && 
      c.type === type &&
      (!worldId || c.worldId === worldId) &&
      (!sourceEntityId || c.sourceEntityId === sourceEntityId)
    ) || null;
  }

  async getComponents(entityId: UUID, worldId?: UUID, sourceEntityId?: UUID): Promise<any[]> {
    const components = Array.from(this.data.components.values());
    return components.filter(c => 
      c.entityId === entityId &&
      (!worldId || c.worldId === worldId) &&
      (!sourceEntityId || c.sourceEntityId === sourceEntityId)
    );
  }

  async updateComponent(component: any): Promise<void> {
    this.data.components.set(component.id, component);
  }

  async deleteComponent(componentId: UUID): Promise<void> {
    this.data.components.delete(componentId);
  }

  async log(log: any): Promise<void> {
    this.data.logs.push(log);
  }

  async setCache(key: string, value: any): Promise<boolean> {
    this.data.cache.set(key, value);
    return true;
  }

  async getCache<T>(key: string): Promise<T | undefined> {
    return this.data.cache.get(key);
  }

  async deleteCache(key: string): Promise<boolean> {
    return this.data.cache.delete(key);
  }

  // Additional methods required by IDatabaseAdapter interface
  async createRelationship(relationship: any): Promise<boolean> {
    const id = relationship.id || (uuidv4() as UUID);
    this.data.relationships.set(id, { ...relationship, id });
    return true;
  }

  async getRelationships(params: any): Promise<any[]> {
    const relationships = Array.from(this.data.relationships.values());
    if (params.entityId) {
      return relationships.filter(r => 
        r.sourceEntityId === params.entityId || r.targetEntityId === params.entityId
      );
    }
    return relationships;
  }

  async updateRelationship(relationship: any): Promise<void> {
    this.data.relationships.set(relationship.id, relationship);
  }

  // Missing required methods
  async runMigrations(): Promise<void> { return; }
  async isReady(): Promise<boolean> { return true; }
  async getConnection(): Promise<any> { return {}; }
  async deleteAgent(agentId: UUID): Promise<boolean> { return true; }
  async getMemoryById(id: UUID): Promise<any | null> { return null; }
  async getMemoriesByIds(ids: UUID[]): Promise<any[]> { return []; }
  async getMemoriesByRoomIds(params: any): Promise<any[]> { return []; }
  async getCachedEmbeddings(params: any): Promise<any[]> { return []; }
  async getLogs(params: any): Promise<any[]> { return []; }
  async deleteLog(id: UUID): Promise<void> { return; }
  async deleteManyMemories(ids: UUID[]): Promise<void> { return; }
  async deleteAllMemories(roomId: UUID, tableName: string): Promise<void> { return; }
  async countMemories(roomId: UUID): Promise<number> { return 0; }
  async getAllWorlds(): Promise<any[]> { return []; }
  async deleteRoomsByWorldId(worldId: UUID): Promise<void> { return; }
  async getRoomsForParticipant(entityId: UUID): Promise<UUID[]> { return []; }
  async getRoomsForParticipants(entityIds: UUID[]): Promise<UUID[]> { return []; }
  async getRoomsByWorld(worldId: UUID): Promise<any[]> { return []; }
  async getParticipantsForEntity(entityId: UUID): Promise<any[]> { return []; }
  async getRelationship(params: any): Promise<any | null> { return null; }
  async getTasksByName(name: string): Promise<any[]> { return []; }
  async getMemoriesByWorldId(params: any): Promise<any[]> { return []; }
  async ensureEmbeddingDimension(dimension: number): Promise<void> { return; }

  // Add any other missing methods that are required by the interface
  [key: string]: any;
}

export interface RealRuntimeOptions {
  plugins?: Plugin[];
  enableLLM?: boolean;
  databaseType?: 'memory';
  logLevel?: 'error' | 'debug' | 'info';
  character?: Partial<Character>;
  enablePlanning?: boolean;
  settings?: Record<string, any>;
}

export async function createRealTestRuntime(options: RealRuntimeOptions = {}): Promise<IAgentRuntime> {
  const {
    plugins = [],
    enableLLM = false,
    databaseType = 'memory',
    logLevel = 'error',
    enablePlanning = true,
    settings = {},
    character: characterOverrides = {},
  } = options;

  // Create core providers for real testing
  const coreProviders = [
    {
      name: 'CHARACTER',
      get: async (runtime: any, message: any, state: any) => ({
        text: `CHARACTER:\nName: ${runtime.character.name}\nBio: ${Array.isArray(runtime.character.bio) ? runtime.character.bio.join('\n') : runtime.character.bio || 'Test character'}\nSystem: ${runtime.character.system}`,
        values: {
          character: runtime.character,
          agentName: runtime.character.name,
        },
      }),
    },
    {
      name: 'TIME',
      get: async () => {
        const now = new Date();
        return {
          text: `TIME: ${now.toISOString()}`,
          values: { currentTime: now.toISOString() },
        };
      },
    },
    {
      name: 'RECENT_MESSAGES',
      get: async (runtime: any, message: any, state: any) => {
        const messages = await runtime.getMemories({
          roomId: message.roomId,
          tableName: 'messages',
          count: 5,
        });
        return {
          text: `RECENT_MESSAGES:\n${messages.map((m: any) => `${m.entityId === runtime.agentId ? 'Agent' : 'User'}: ${m.content.text}`).join('\n')}`,
          values: { recentMessages: messages },
        };
      },
    },
    {
      name: 'ACTIONS',
      get: async (runtime: any, message: any, state: any) => {
        const validActions = [];
        for (const action of runtime.actions) {
          try {
            const isValid = await action.validate(runtime, message, state);
            if (isValid) {
              validActions.push(action.name);
            }
          } catch (error) {
            // Skip invalid actions
          }
        }
        return {
          text: `ACTIONS:\nAvailable actions: ${validActions.join(', ')}`,
          values: { availableActions: validActions },
        };
      },
    },
  ];

  // Create real database adapter
  const adapter = new InMemoryDatabaseAdapter();
  await adapter.init();

  // Create test character with real configuration
  const character: Character = {
    name: 'TestAgent',
    bio: ['Real test agent for integration testing'],
    system: 'You are a helpful AI assistant designed for testing real runtime functionality.',
    messageExamples: [
      [
        { name: 'user', content: { text: 'Hello' } },
        { name: 'TestAgent', content: { text: 'Hello! How can I help you today?' } },
      ],
    ],
    postExamples: ['Working on real runtime testing'],
    topics: ['testing', 'integration', 'runtime'],
    adjectives: ['helpful', 'thorough', 'reliable'],
    knowledge: [],
    plugins: plugins.map(p => p.name),
    settings: {
      enablePlanning,
      TEST_MODE: 'true',
      ...settings,
    },
    secrets: {
      OPENAI_API_KEY: enableLLM ? process.env.OPENAI_API_KEY || 'test-key' : 'test-key',
      ...settings,
    },
    ...characterOverrides,
  };

  // Create runtime with real components
  const runtime = new AgentRuntime({
    agentId: uuidv4() as UUID,
    character,
    adapter,
    plugins,
    settings: {
      TEST_MODE: 'true',
      LOG_LEVEL: logLevel,
      ...settings,
    },
  });

  // Register core providers
  coreProviders.forEach(provider => runtime.registerProvider(provider));

  // Initialize runtime first
  await runtime.initialize();

  // Register test model handlers if not using real LLM
  if (!enableLLM) {
    // Register a proper TEXT_EMBEDDING model handler
    const mockEmbeddingHandler = async (runtime: any, params: any) => {
      const text = params?.text || '';
      const hash = text.split('').reduce((a: number, b: string) => {
        a = ((a << 5) - a) + b.charCodeAt(0);
        return a & a;
      }, 0);
      
      // Generate 1536-dimensional embedding (OpenAI ada-002 format)
      const embedding = new Array(1536).fill(0).map((_, i) => 
        Math.sin(hash + i) * 0.1
      );
      
      return embedding;
    };

    // Register the embedding handler
    (runtime as any).registerModel('TEXT_EMBEDDING', { 
      handler: mockEmbeddingHandler, 
      provider: 'test', 
      priority: 100 
    });

    // Also override useModel as backup
    const originalUseModel = runtime.useModel.bind(runtime);
    (runtime as any).useModel = async (modelType: any, params: any) => {
      // FIRST check for embedding - highest priority
      if (modelType === 'TEXT_EMBEDDING') {
        return await mockEmbeddingHandler(runtime, params);
      }
      
      // For testing, return predictable responses based on input
      if (modelType.includes('TEXT') || modelType.includes('REASONING')) {
        const prompt = params?.prompt || params?.text || '';
        
        // Handle planning requests
        if (prompt.includes('plan') || prompt.includes('steps')) {
          return '<plan><goal>Execute user request</goal><steps><step><id>' + uuidv4() + '</id><action>REPLY</action><parameters>{}</parameters></step></steps><executionModel>sequential</executionModel></plan>';
        }
        
        // Handle fact extraction
        if (prompt.includes('facts') || prompt.includes('extract')) {
          return JSON.stringify([
            {
              type: 'fact',
              claim: 'Test fact extracted from conversation',
              already_known: false,
            }
          ]);
        }
        
        // Handle action chaining scenarios
        if (prompt.includes('fetch and process user data') || prompt.includes('Please fetch and process user data')) {
          return JSON.stringify({
            text: "I'll fetch and process the user data for you.",
            thought: "The user wants me to fetch and process user data, I should start with fetching.",
            actions: ["FETCH_USER_DATA", "PROCESS_USER_DATA", "SAVE_USER_PROFILE"]
          });
        }
        
        if (prompt.includes('Fetch user data please') || prompt.includes('fetch user')) {
          return JSON.stringify({
            text: "I'll fetch the user data now.",
            thought: "The user wants me to fetch user data.",
            actions: ["FETCH_USER_DATA"]
          });
        }
        
        if (prompt.includes('Process the fetched data') || prompt.includes('process') && prompt.includes('data')) {
          return JSON.stringify({
            text: "I'll process the fetched data.",
            thought: "The user wants me to process the previously fetched data.",
            actions: ["PROCESS_USER_DATA"]
          });
        }
        
        if (prompt.includes('Complete full workflow') || prompt.includes('Complete workflow')) {
          return JSON.stringify({
            text: "I'll complete the full workflow for you.",
            thought: "The user wants the complete workflow executed.",
            actions: ["FETCH_USER_DATA", "PROCESS_USER_DATA", "SAVE_USER_PROFILE", "SUMMARIZE_WORKFLOW"]
          });
        }
        
        if (prompt.includes('Process and save user data')) {
          return JSON.stringify({
            text: "I'll process and save the user data.",
            thought: "The user wants data processing and saving.",
            actions: ["FETCH_USER_DATA", "PROCESS_USER_DATA", "SAVE_USER_PROFILE"]
          });
        }
        
        if (prompt.includes('Complete workflow and cleanup')) {
          return JSON.stringify({
            text: "I'll complete the workflow and clean up.",
            thought: "The user wants workflow completion with cleanup.",
            actions: ["FETCH_USER_DATA", "PROCESS_USER_DATA", "SAVE_USER_PROFILE"]
          });
        }
        
        if (prompt.includes('Execute chain with failure')) {
          return JSON.stringify({
            text: "I'll execute the chain including the failing action.",
            thought: "The user wants to test failure handling.",
            actions: ["FETCH_USER_DATA", "FAILING_CHAIN_ACTION", "PROCESS_USER_DATA"]
          });
        }
        
        if (prompt.includes('Process data without fetching')) {
          return JSON.stringify({
            text: "I'll try to process data without fetching first.",
            thought: "The user wants to test validation failure.",
            actions: ["PROCESS_USER_DATA"]
          });
        }
        
        // Handle action selection - return response that includes actions
        if (prompt.includes('favorite color is blue')) {
          return JSON.stringify({
            text: "I'll remember that your favorite color is blue.",
            thought: "The user is telling me their favorite color preference, I should store this.",
            actions: ["STORE_PREFERENCE"]
          });
        }
        
        if ((prompt.includes('what') && prompt.includes('color')) || 
            (prompt.includes('What is my favorite color'))) {
          return JSON.stringify({
            text: "Your favorite color is blue.",
            thought: "The user is asking about their color preference, I should recall it.",
            actions: ["RECALL_PREFERENCE"]
          });
        }
        
        if (prompt.includes('prefer')) {
          return JSON.stringify({
            text: "I'll store that preference for you.",
            thought: "The user is expressing a preference, I should store this.",
            actions: ["STORE_PREFERENCE"]
          });
        }
        
        // Handle general text generation (fallback)
        if (prompt.toLowerCase().includes('blue')) {
          return 'Yes, you mentioned that your favorite color is blue.';
        }
        
        return JSON.stringify({
          text: 'I understand your request and will help you accordingly.',
          thought: 'Responding to user message.',
          actions: []
        });
      }
      
      if (modelType === 'TEXT_EMBEDDING' || modelType.includes('EMBEDDING')) {
        return await mockEmbeddingHandler(runtime, params);
      }
      
      // Fallback to original implementation for any other model types
      return originalUseModel(modelType, params);
    };
  }

  return runtime;
}

export async function createMemoryWithEmbedding(
  runtime: IAgentRuntime,
  content: { text: string; [key: string]: any },
  entityId: UUID,
  roomId: UUID,
  tableName = 'messages'
) {
  const embedding = await runtime.useModel('TEXT_EMBEDDING', { text: content.text });
  
  return await runtime.createMemory({
    id: uuidv4() as UUID,
    entityId,
    roomId,
    content,
    embedding: Array.isArray(embedding) ? embedding : undefined,
    createdAt: Date.now(),
  }, tableName);
}

export function createTestMessage(overrides: any = {}) {
  return {
    id: uuidv4() as UUID,
    entityId: uuidv4() as UUID,
    roomId: uuidv4() as UUID,
    agentId: uuidv4() as UUID,
    content: {
      text: 'Test message',
      source: 'test',
    },
    createdAt: Date.now(),
    ...overrides,
  };
}

/**
 * Process a message through the complete pipeline: state composition, LLM response generation, action processing
 * This simulates how real message processing works in production
 */
export async function processMessageWithActions(
  runtime: IAgentRuntime,
  message: Memory,
  callback?: (content: any) => Promise<Memory[]>
): Promise<{ responses: Memory[]; actionResults: any[] }> {
  // 1. Create basic state context 
  const character = runtime.character;
  const bioText = Array.isArray(character.bio) ? character.bio.join('\n') : character.bio || 'Test character';
  const contextPrompt = `CHARACTER:\nName: ${character.name}\nBio: ${bioText}\nSystem: ${character.system}`;
  
  // 2. Generate LLM response with context
  const agentName = character?.name || 'TestAgent';
  const messageText = message?.content?.text || 'test message';
  const prompt = `${contextPrompt}\n\nUser: ${messageText}\n\nRespond as ${agentName}:`;
  
  const llmResponse = await runtime.useModel('TEXT_LARGE', {
    prompt,
    temperature: 0.7,
    maxTokens: 150,
  });
  
  // 3. Parse the LLM response 
  let responseContent: any;
  let actions: string[] = [];
  
  try {
    // Try to parse as JSON first (for structured responses)
    responseContent = JSON.parse(llmResponse);
    actions = responseContent.actions || [];
  } catch {
    // Fallback to text response
    responseContent = {
      text: llmResponse,
      thought: 'Generated response',
      actions: [],
    };
    
    // Try to extract actions from text patterns
    const actionMatches = llmResponse.match(/\[([\w_]+)\]/g);
    if (actionMatches) {
      actions = actionMatches.map(match => match.slice(1, -1));
      responseContent.actions = actions;
    }
  }
  
  // 4. Create response memory with actions
  const responseMemory: Memory = {
    id: uuidv4() as UUID,
    entityId: runtime.agentId,
    roomId: message.roomId,
    agentId: runtime.agentId,
    content: responseContent,
    createdAt: Date.now(),
  };
  
  const responses = [responseMemory];
  
  // 5. Execute callback if provided
  if (callback) {
    await callback(responseContent);
  }
  
  // 6. Process actions if any were found
  const actionResults: any[] = [];
  if (actions.length > 0) {
    try {
      // Create basic state for action processing
      const basicState = {
        values: {},
        data: {},
        text: contextPrompt,
      };
      
      await runtime.processActions(message, responses, basicState, callback);
      actionResults.push({ success: true, actions });
    } catch (error) {
      actionResults.push({ success: false, error: (error as Error).message, actions });
    }
  }
  
  return { responses, actionResults };
}