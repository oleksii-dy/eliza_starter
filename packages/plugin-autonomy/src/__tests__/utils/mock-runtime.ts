import { vi } from 'vitest';
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
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
    trace: vi.fn(),
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
    getSetting: vi.fn((key: string) => {
      if (simulateErrors && key === 'ERROR_SETTING') {
        throw new Error('Setting access error');
      }
      return settings[key] || null;
    }),

    // Model operations
    useModel: vi.fn(async (modelType: string, params: any) => {
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
    createMemory: vi.fn(async (memory: Memory, tableName?: string) => {
      memoryCreateCount++;

      if (memoryErrors.length > 0 && memoryCreateCount <= memoryErrors.length) {
        throw memoryErrors[memoryCreateCount - 1];
      }

      const memoryId = `memory-${memoryCreateCount}` as UUID;
      return memoryId;
    }),

    getMemories: vi.fn(async (params: any) => {
      memoryQueryCount++;

      if (simulateErrors && memoryQueryCount > 2) {
        throw new Error('Memory query error');
      }

      return memoryResults.slice(0, params.count || 10);
    }),

    searchMemories: vi.fn(async (params: any) => {
      return memoryResults.filter((m) => m.similarity > (params.match_threshold || 0.5));
    }),

    getConversationLength: vi.fn(() => {
      return memoryResults.length || 5; // Default conversation length
    }),

    // Entity and relationship operations
    getEntitiesForRoom: vi.fn(async (roomId: UUID) => {
      return [
        {
          id: 'entity-1' as UUID,
          names: ['Test User'],
          metadata: { platform: 'test' },
          agentId: agentId,
        },
      ];
    }),

    // Task operations
    createTask: vi.fn(async (task: any) => {
      if (simulateErrors && task.name.includes('ERROR')) {
        throw new Error('Task creation error');
      }
      return `task-${Date.now()}` as UUID;
    }),

    getTasks: vi.fn(async (params: any) => {
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

    updateTask: vi.fn(async (taskId: UUID, updates: any) => {
      return true;
    }),

    deleteTask: vi.fn(async (taskId: UUID) => {
      return true;
    }),

    // Service operations
    getService: vi.fn(<T extends Service>(serviceName: string): T | null => {
      if (simulateErrors && serviceName === 'error-service') {
        return null;
      }
      return services[serviceName] || null;
    }),

    registerService: vi.fn(async (service: any) => {
      services[service.serviceType] = service;
    }),

    // State composition
    composeState: vi.fn(async (message: Memory, providers?: string[]): Promise<State> => {
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
    createEntity: vi.fn(async (entity: any) => {
      return `entity-${Date.now()}` as UUID;
    }),

    getEntityById: vi.fn(async (entityId: UUID) => {
      return {
        id: entityId,
        names: ['Test Entity'],
        metadata: {},
        agentId,
      };
    }),

    // Room operations
    createRoom: vi.fn(async (room: any) => {
      const roomId = room.id || (`room-${Date.now()}` as UUID);
      return roomId;
    }),

    getRoom: vi.fn(async (roomId: UUID) => {
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
    createWorld: vi.fn(async (world: any) => {
      const worldId = world.id || (`world-${Date.now()}` as UUID);
      return worldId;
    }),

    getWorld: vi.fn(async (worldId: UUID) => {
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
    emitEvent: vi.fn(async (eventType: string, payload: any) => {
      // Mock event emission
    }),

    // Component operations
    createComponent: vi.fn(async (component: any) => {
      return `component-${Date.now()}` as UUID;
    }),

    getComponents: vi.fn(async (entityId: UUID) => {
      return [];
    }),

    // Database operations (simplified)
    db: {
      query: vi.fn(async (sql: string, params?: any[]) => {
        return [];
      }),
      run: vi.fn(async (sql: string, params?: any[]) => {
        return { changes: 1, lastInsertRowid: 1 };
      }),
    } as any,

    // Additional mock methods that might be called
    processActions: vi.fn(async () => {}),
    evaluate: vi.fn(async () => []),
    registerAction: vi.fn(),
    registerProvider: vi.fn(),
    registerEvaluator: vi.fn(),

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
    start: vi.fn(async () => {}),
    stop: vi.fn(async () => {}),
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
