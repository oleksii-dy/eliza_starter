import type {
  Action,
  Character,
  Evaluator,
  IAgentRuntime,
  Memory,
  Plugin,
  Provider,
  Route,
  State,
  UUID,
} from '@elizaos/core';
import { mock } from 'bun:test';

/**
 * Creates a comprehensive mock of the IAgentRuntime interface with sensible defaults
 * that can be overridden as needed for specific tests.
 *
 * @param overrides - Optional overrides for the default mock methods and properties
 * @returns A mock runtime for testing
 */
export function createMockRuntime(overrides: Partial<IAgentRuntime> = {}): IAgentRuntime {
  const defaultCharacter: Character = {
    id: 'test-agent-id' as UUID,
    name: 'Test Agent',
    bio: ['This is a test agent for task system unit tests'],
    messageExamples: [],
    postExamples: [],
    topics: [],
    knowledge: [],
    plugins: [],
  };

  const baseRuntime = {
    // Core properties
    agentId: 'test-agent-id' as UUID,
    character: overrides.character || defaultCharacter,
    providers: [] as Provider[],
    actions: [] as Action[],
    evaluators: [] as Evaluator[],
    plugins: [] as Plugin[],
    services: new Map(),
    events: new Map(),
    routes: [] as Route[],
    fetch: null,
    memory: null,

    // Core methods
    getSetting: mock().mockReturnValue('test-value'),
    getService: mock().mockReturnValue(null),
    useModel: mock().mockResolvedValue('mock response'),
    registerPlugin: mock().mockResolvedValue(undefined),
    initialize: mock().mockResolvedValue(undefined),

    // Database methods
    getConnection: mock().mockReturnValue(null),
    getDatabase: mock().mockReturnValue(null),
    getMemories: mock((params: any) => {
      // For facts provider tests
      if (params?.tableName === 'facts' && params?.entityId === 'test-entity-id') {
        return Promise.resolve([
          {
            id: 'memory-1' as UUID,
            entityId: 'entity-1' as UUID,
            agentId: 'agent-1' as UUID,
            roomId: 'room-1' as UUID,
            content: { text: 'User likes chocolate' },
            embedding: [0.1, 0.2, 0.3],
            createdAt: Date.now(),
          },
          {
            id: 'memory-2' as UUID,
            entityId: 'entity-1' as UUID,
            agentId: 'agent-1' as UUID,
            roomId: 'room-1' as UUID,
            content: { text: 'User dislikes spicy food' },
            embedding: [0.2, 0.3, 0.4],
            createdAt: Date.now(),
          },
        ]);
      }
      return Promise.resolve([]);
    }),
    searchMemories: mock().mockResolvedValue([]),
    createMemory: mock().mockResolvedValue('test-memory-id' as UUID),
    updateMemory: mock().mockResolvedValue(true),
    deleteMemory: mock().mockResolvedValue(true),
    getMemoryById: mock().mockResolvedValue(null),

    // Task methods
    getTasks: mock().mockResolvedValue([]),
    createTask: mock().mockResolvedValue(undefined),
    updateTask: mock().mockResolvedValue(undefined),
    completeTask: mock().mockResolvedValue(undefined),
    cancelTask: mock().mockResolvedValue(undefined),

    // Room methods
    getRoom: mock().mockResolvedValue(null),
    getRoomHistory: mock().mockResolvedValue([]),
    createRoom: mock().mockResolvedValue('test-room-id' as UUID),
    updateRoom: mock().mockResolvedValue(true),
    deleteRoom: mock().mockResolvedValue(true),

    // Entity methods
    getEntity: mock().mockResolvedValue(null),
    createEntity: mock().mockResolvedValue('test-entity-id' as UUID),
    updateEntity: mock().mockResolvedValue(true),
    deleteEntity: mock().mockResolvedValue(true),
    getEntitiesForRoom: mock().mockResolvedValue([]),

    // Component methods
    createComponent: mock().mockResolvedValue('test-component-id' as UUID),
    updateComponent: mock().mockResolvedValue(true),
    deleteComponent: mock().mockResolvedValue(true),
    getComponents: mock().mockResolvedValue([]),
    getComponent: mock().mockResolvedValue(null),

    // State methods
    composeState: mock().mockResolvedValue({
      values: {},
      data: {},
      text: '',
    } as State),
    updateState: mock().mockResolvedValue(true),

    // Message processing
    processMessage: mock().mockResolvedValue(undefined),
    processActions: mock().mockResolvedValue(undefined),
    evaluate: mock().mockResolvedValue(null),

    // Service methods
    getAllServices: mock().mockReturnValue(new Map()),
    getServicesByType: mock().mockReturnValue([]),
    removeService: mock().mockResolvedValue(undefined),
    registerService: mock().mockResolvedValue(undefined),

    // Task worker methods
    registerTaskWorker: mock().mockReturnValue(undefined),
    getTaskWorker: mock().mockReturnValue(undefined),
    getAllTaskWorkers: mock().mockReturnValue(new Map()),

    // Event methods
    on: mock().mockReturnValue(undefined),
    off: mock().mockReturnValue(undefined),
    emit: mock().mockResolvedValue(undefined),
    registerEvent: mock().mockReturnValue(undefined),
    getEvent: mock().mockReturnValue([]),
    emitEvent: mock().mockResolvedValue(undefined),

    // Model methods
    registerModel: mock().mockReturnValue(undefined),
    getModel: mock().mockReturnValue(undefined),
    generateText: mock().mockResolvedValue('generated text'),
    generateImage: mock().mockResolvedValue({ url: 'http://example.com/image.png' }),
    transcribe: mock().mockResolvedValue('transcribed text'),
    speak: mock().mockResolvedValue('audio buffer'),
    fetchEmbedding: mock().mockResolvedValue([0.1, 0.2, 0.3]),

    // Database adapter methods from IDatabaseAdapter
    db: null,
    init: mock().mockResolvedValue(undefined),
    runMigrations: mock().mockResolvedValue(undefined),
    isReady: mock().mockResolvedValue(true),
    waitForReady: mock().mockResolvedValue(undefined),
    close: mock().mockResolvedValue(undefined),
    ensureEmbeddingDimension: mock().mockResolvedValue(undefined),

    // Agent methods
    getAgent: mock().mockResolvedValue(null),
    getAgents: mock().mockResolvedValue([]),
    createAgent: mock().mockResolvedValue(true),
    updateAgent: mock().mockResolvedValue(true),
    deleteAgent: mock().mockResolvedValue(true),

    // Entity methods
    getEntitiesByIds: mock().mockResolvedValue([]),
    createEntities: mock().mockResolvedValue(true),

    // World methods
    createWorld: mock().mockResolvedValue('test-world-id' as UUID),
    getWorld: mock().mockResolvedValue(null),
    removeWorld: mock().mockResolvedValue(undefined),
    getAllWorlds: mock().mockResolvedValue([]),
    getWorlds: mock().mockResolvedValue([]),
    updateWorld: mock().mockResolvedValue(undefined),

    // Room methods
    getRoomsByIds: mock().mockResolvedValue([]),
    createRooms: mock().mockResolvedValue([]),
    deleteRoomsByWorldId: mock().mockResolvedValue(undefined),
    getRoomsByWorld: mock().mockResolvedValue([]),
    getRooms: mock().mockResolvedValue([]),

    // Participant methods
    removeParticipant: mock().mockResolvedValue(true),
    getParticipantsForEntity: mock().mockResolvedValue([]),
    getParticipantsForRoom: mock().mockResolvedValue([]),
    addParticipant: mock().mockResolvedValue(true),
    addParticipantsRoom: mock().mockResolvedValue(true),
    getRoomsForParticipant: mock().mockResolvedValue([]),
    getRoomsForParticipants: mock().mockResolvedValue([]),
    getParticipantUserState: mock().mockResolvedValue(null),
    setParticipantUserState: mock().mockResolvedValue(undefined),

    // Relationship methods
    createRelationship: mock().mockResolvedValue(true),
    updateRelationship: mock().mockResolvedValue(undefined),
    getRelationship: mock().mockResolvedValue(null),
    getRelationships: mock().mockResolvedValue([]),

    // Cache methods
    getCache: mock().mockResolvedValue(undefined),
    setCache: mock().mockResolvedValue(true),
    deleteCache: mock().mockResolvedValue(true),

    // Memory/search methods
    getCachedEmbeddings: mock().mockResolvedValue([]),
    getMemoriesByRoomIds: mock().mockResolvedValue([]),
    getMemoriesByIds: mock().mockResolvedValue([]),
    deleteManyMemories: mock().mockResolvedValue(undefined),
    deleteAllMemories: mock().mockResolvedValue(undefined),
    countMemories: mock().mockResolvedValue(0),
    getMemoriesByWorldId: mock().mockResolvedValue([]),
    getAllMemories: mock().mockResolvedValue([]),
    clearAllAgentMemories: mock().mockResolvedValue(undefined),
    addEmbeddingToMemory: mock().mockResolvedValue({} as Memory),

    // Logging methods
    log: mock().mockResolvedValue(undefined),
    getLogs: mock().mockResolvedValue([]),
    deleteLog: mock().mockResolvedValue(undefined),

    // Configuration methods
    getConfigurationManager: mock().mockReturnValue(null),
    registerDatabaseAdapter: mock().mockReturnValue(undefined),
    setSetting: mock().mockReturnValue(undefined),
    getConversationLength: mock().mockReturnValue(10),

    // Provider/Action/Evaluator methods
    registerProvider: mock().mockReturnValue(undefined),
    registerAction: mock().mockReturnValue(undefined),
    registerEvaluator: mock().mockReturnValue(undefined),

    // Connection methods
    ensureConnections: mock().mockResolvedValue(undefined),
    ensureConnection: mock().mockResolvedValue(undefined),
    ensureParticipantInRoom: mock().mockResolvedValue(undefined),
    ensureWorldExists: mock().mockResolvedValue(undefined),
    ensureRoomExists: mock().mockResolvedValue(undefined),

    // Run tracking
    createRunId: mock().mockReturnValue('test-run-id' as UUID),
    startRun: mock().mockReturnValue('test-run-id' as UUID),
    endRun: mock().mockReturnValue(undefined),
    getCurrentRunId: mock().mockReturnValue('test-run-id' as UUID),

    // Entity compat methods
    getEntityById: mock().mockResolvedValue(null),

    // Messaging methods
    registerSendHandler: mock().mockReturnValue(undefined),
    sendMessageToTarget: mock().mockResolvedValue(undefined),

    // Planning methods
    generatePlan: mock().mockResolvedValue({ actions: [] }),
    executePlan: mock().mockResolvedValue({ success: true }),
    validatePlan: mock().mockResolvedValue({ valid: true, issues: [] }),

    // Plugin configuration methods
    configurePlugin: mock().mockResolvedValue(undefined),
    enableComponent: mock().mockResolvedValue(undefined),
    disableComponent: mock().mockResolvedValue(undefined),

    // Stop method
    stop: mock().mockResolvedValue(undefined),

    // Logging
    logger: {
      info: mock(),
      warn: mock(),
      error: mock(),
      debug: mock(),
    },

    // Apply any overrides
    ...overrides,
  } as unknown as IAgentRuntime;

  return baseRuntime;
}

/**
 * Helper function to create a mock runtime with task-specific configurations
 */
export function createTaskMockRuntime(taskOverrides: any = {}): IAgentRuntime {
  return createMockRuntime({
    // Task-specific mock configurations can be added here
    ...taskOverrides,
  });
}

/**
 * Legacy export for backward compatibility
 */
export type MockRuntime = IAgentRuntime;

/**
 * Setup function for action tests - legacy compatibility
 */
export function setupActionTest() {
  const mockRuntime = createMockRuntime();
  const mockCallback = mock();

  // Create a proper mock message object that tests expect
  const mockMessage = {
    id: 'test-message-id' as UUID,
    entityId: 'test-entity-id' as UUID,
    agentId: 'test-agent-id' as UUID,
    roomId: 'test-room-id' as UUID,
    content: {
      text: 'test message',
      source: 'test',
    },
    createdAt: Date.now(),
  };

  // Create a proper mock state object
  const mockState = {
    values: {},
    data: {},
    text: '',
  };

  return {
    mockRuntime: mockRuntime as MockRuntime,
    mockCallback,
    callbackFn: mockCallback, // Alias for backward compatibility
    mockMessage,
    mockState,
  };
}
