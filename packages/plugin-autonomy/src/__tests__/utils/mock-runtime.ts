import { mock, expect  } from 'bun:test';
import type { IAgentRuntime, Memory, State, Character, UUID, Service } from '@elizaos/core';

// Define ModelType locally for testing
const ModelType = {
  TEXT_SMALL: 'TEXT_SMALL',
  TEXT_LARGE: 'TEXT_LARGE',
  TEXT_EMBEDDING: 'TEXT_EMBEDDING',
  TEXT_REASONING_LARGE: 'TEXT_REASONING_LARGE',
} as const;

/**
 * Configuration options for mock runtime behavior
 */
export interface MockRuntimeOptions {
  // Model responses
  modelResponses?: Record<string, string>;
  modelErrors?: Record<string, Error>;

  // Service mocks
  services?: Record<string, any>;

  // Memory operations
  memoryResults?: any[];
  memoryErrors?: Error[];

  // Settings/environment
  settings?: Record<string, any>;

  // Character configuration
  character?: Partial<Character>;

  // Error simulation
  simulateErrors?: boolean;
  networkTimeout?: boolean;
}

/**
 * Creates a comprehensive mock IAgentRuntime for unit testing
 */
export function createMockRuntime(options: MockRuntimeOptions = {}): IAgentRuntime {
  const {
    modelResponses = {},
    modelErrors = {},
    services = {},
    memoryResults = [],
    memoryErrors = [],
    settings = {},
    character = {},
    simulateErrors = false,
    networkTimeout = false,
  } = options;

  // Storage for created entities, worlds, and rooms
  const createdWorlds = new Map<UUID, any>();
  const createdRooms = new Map<UUID, any>();

  // Default character configuration
  const defaultCharacter: Character = {
    name: 'TestAgent',
    bio: ['Test bio for mock agent'],
    system: 'Test system prompt',
    messageExamples: [],
    postExamples: [],
    topics: [],
    knowledge: [],
    plugins: [],
    ...character,
  };

  // Mock agent ID
  const agentId = 'test-agent-id' as UUID;

  // Mock logger
  const mockLogger = {
    info: mock(),
    warn: mock(),
    error: mock(),
    debug: mock(),
    trace: mock(),
  };

  // Memory operation counters for tracking
  let memoryCreateCount = 0;
  let memoryQueryCount = 0;

  const mockRuntime: IAgentRuntime = {
    // Core properties
    agentId,
    character: defaultCharacter,
    logger: mockLogger,

    // Settings and configuration
    getSetting: mock((key: string) => {
      if (simulateErrors && key === 'ERROR_SETTING') {
        throw new Error('Setting access error');
      }
      return settings[key] || null;
    }),

    // Model operations
    useModel: mock(async (modelType: string, params: any) => {
      if (networkTimeout) {
        throw new Error('Network timeout');
      }

      if (modelErrors[modelType]) {
        throw modelErrors[modelType];
      }

      if (modelResponses[modelType]) {
        return modelResponses[modelType];
      }

      // Default responses by model type
      const defaultResponses = {
        [ModelType.TEXT_SMALL]: 'Mock small model response',
        [ModelType.TEXT_LARGE]: 'Mock large model response',
        [ModelType.TEXT_EMBEDDING]: [0.1, 0.2, 0.3], // Mock embedding vector
        [ModelType.TEXT_REASONING_LARGE]: 'Mock reasoning response',
      };

      return defaultResponses[modelType] || 'Mock model response';
    }),

    // Memory operations
    createMemory: mock(async (memory: Memory, tableName?: string) => {
      memoryCreateCount++;

      if (memoryErrors.length > 0 && memoryCreateCount <= memoryErrors.length) {
        throw memoryErrors[memoryCreateCount - 1];
      }

      const memoryId = `memory-${memoryCreateCount}` as UUID;
      return memoryId;
    }),

    getMemories: mock(async (params: any) => {
      memoryQueryCount++;

      if (simulateErrors && memoryQueryCount > 2) {
        throw new Error('Memory query error');
      }

      return memoryResults.slice(0, params.count || 10);
    }),

    searchMemories: mock(async (params: any) => {
      return memoryResults.filter((m) => m.similarity > (params.match_threshold || 0.5));
    }),

    getConversationLength: mock(() => {
      return memoryResults.length || 5; // Default conversation length
    }),

    // Entity and relationship operations
    getEntitiesForRoom: mock(async (roomId: UUID) => {
      return [
        {
          id: 'entity-1' as UUID,
          names: ['Test User'],
          metadata: { platform: 'test' },
          agentId,
        },
      ];
    }),

    // Task operations
    createTask: mock(async (task: any) => {
      if (simulateErrors && task.name.includes('ERROR')) {
        throw new Error('Task creation error');
      }
      return `task-${Date.now()}` as UUID;
    }),

    getTasks: mock(async (params: any) => {
      return [
        {
          id: 'task-1' as UUID,
          name: 'Test Task',
          description: 'Test task description',
          tags: ['test'],
          metadata: {},
        },
      ];
    }),

    updateTask: mock(async (taskId: UUID, updates: any) => {
      return true;
    }),

    deleteTask: mock(async (taskId: UUID) => {
      return true;
    }),

    // Service operations
    getService: mock(<T extends Service>(serviceName: string): T | null => {
      if (simulateErrors && serviceName === 'error-service') {
        return null;
      }
      return services[serviceName] || null;
    }),

    registerService: mock(async (service: any) => {
      services[service.serviceType] = service;
    }),

    // State composition
    composeState: mock(async (message: Memory, providers?: string[]): Promise<State> => {
      if (simulateErrors && providers?.includes('ERROR_PROVIDER')) {
        throw new Error('State composition error');
      }

      return {
        values: {
          currentDate: new Date().toISOString(),
          agentName: defaultCharacter.name,
          roomId: message.roomId,
          ...settings,
        },
        data: {
          message,
          providers: providers || [],
        },
        text: `Current context for ${defaultCharacter.name}`,
      };
    }),

    // Entity operations
    createEntity: mock(async (entity: any) => {
      return `entity-${Date.now()}` as UUID;
    }),

    getEntityById: mock(async (entityId: UUID) => {
      return {
        id: entityId,
        names: ['Test Entity'],
        metadata: {},
        agentId,
      };
    }),

    // Room operations
    createRoom: mock(async (room: any) => {
      const roomId = room.id || (`room-${Date.now()}` as UUID);
      return roomId;
    }),

    getRoom: mock(async (roomId: UUID) => {
      if (simulateErrors && roomId.includes('error')) {
        return null;
      }
      return {
        id: roomId,
        name: 'Test Room',
        agentId,
        source: 'test',
        type: 'SELF' as any,
        worldId: roomId.includes('room')
          ? roomId.replace('room', 'world')
          : ('test-world-id' as any),
      };
    }),

    // World operations
    createWorld: mock(async (world: any) => {
      const worldId = world.id || (`world-${Date.now()}` as UUID);
      return worldId;
    }),

    getWorld: mock(async (worldId: UUID) => {
      if (simulateErrors && worldId.includes('error')) {
        return null;
      }
      return {
        id: worldId,
        name: 'Test World',
        agentId,
        serverId: 'test-server',
        metadata: {},
      };
    }),

    // Event operations
    emitEvent: mock(async (eventType: string, payload: any) => {
      // Mock event emission
    }),

    // Component operations
    createComponent: mock(async (component: any) => {
      return `component-${Date.now()}` as UUID;
    }),

    getComponents: mock(async (entityId: UUID) => {
      return [];
    }),

    // Database operations (simplified)
    db: {
      query: mock(async (sql: string, params?: any[]) => {
        return [];
      }),
      run: mock(async (sql: string, params?: any[]) => {
        return { changes: 1, lastInsertRowid: 1 };
      }),
    } as any,

    // Additional mock methods that might be called
    processActions: mock(async () => {}),
    evaluate: mock(async () => []),
    registerAction: mock(),
    registerProvider: mock(),
    registerEvaluator: mock(),

    // Plugin operations
    plugins: [],
    actions: [],
    providers: [],
    evaluators: [],
    services: new Map(),

    // Mock any other methods that might be called
  } as any;

  return mockRuntime;
}

/**
 * Creates a mock memory object for testing
 */
export function createMockMemory(overrides: Partial<Memory> = {}): Memory {
  return {
    id: `memory-${Date.now()}` as UUID,
    entityId: 'test-entity' as UUID,
    agentId: 'test-agent' as UUID,
    roomId: 'test-room' as UUID,
    worldId: 'test-world' as UUID,
    content: {
      text: 'Test memory content',
      source: 'test',
    },
    createdAt: Date.now(),
    ...overrides,
  };
}

/**
 * Creates a mock state object for testing
 */
export function createMockState(overrides: Partial<State> = {}): State {
  return {
    values: {
      currentDate: new Date().toISOString(),
      agentName: 'TestAgent',
    },
    data: {},
    text: 'Test state context',
    ...overrides,
  };
}

/**
 * Creates a mock service for testing
 */
export function createMockService(serviceType: string, methods: Record<string, any> = {}) {
  return {
    serviceType,
    capabilityDescription: `Mock ${serviceType} service`,
    start: mock(async () => {}),
    stop: mock(async () => {}),
    ...methods,
  };
}

/**
 * Helper to verify mock calls with specific parameters
 */
export function expectMockCall(mockFn: any, callIndex: number, expectedArgs: any[]) {
  expect(mockFn.mock.calls.length).toBeGreaterThanOrEqual(callIndex + 1);
  expect(mockFn.mock.calls[callIndex]).toEqual(expectedArgs);
}

/**
 * Helper to reset all mocks in a runtime
 */
export function resetMockRuntime(runtime: IAgentRuntime) {
  Object.values(runtime).forEach((value) => {
    if (value && typeof value === 'object' && 'mockReset' in value) {
      (value as any).mockReset();
    }
  });

  if ((runtime as any).logger) {
    Object.values((runtime as any).logger).forEach((logMethod) => {
      if (logMethod && typeof logMethod === 'object' && 'mockReset' in logMethod) {
        (logMethod as any).mockReset();
      }
    });
  }
}
