import { vi } from 'vitest';
import type { IAgentRuntime, Memory, State, UUID, Provider, Action, Service } from '@elizaos/core';

/**
 * Creates a mock runtime for testing
 *
 * @param overrides - Optional overrides for the default mock methods and properties
 * @returns A mock runtime for testing
 */
export function createMockRuntime(overrides: Partial<IAgentRuntime> = {}): IAgentRuntime {
  return {
    // Core properties
    agentId: 'test-agent-id' as UUID,
    character: {
      name: 'TestAgent',
      bio: ['Test bio'],
      system: 'Test system prompt',
      messageExamples: []
      postExamples: []
      topics: []
      knowledge: []
      plugins: []
      ...overrides.character,
    },

    // Settings
    getSetting: vi.fn((key: string) => {
      const settings: Record<string, string> = {
        API_KEY: 'test-api-key',
        SECRET_KEY: 'test-secret',
        ...(overrides as any).settings,
      };
      return settings[key];
    }),

    // Services
    getService: vi.fn((name: string) => {
      const services: Record<string, any> = {
        'test-service': {
          start: vi.fn(),
          stop: vi.fn(),
          doSomething: vi.fn().mockResolvedValue('service result'),
        },
        hyperfy: createMockHyperfyService(),
        ...overrides.services,
      };
      return services[name];
    }),

    // Model/LLM
    useModel: vi.fn().mockResolvedValue('mock model response'),
    generateText: vi.fn().mockResolvedValue('generated text'),

    // Memory operations
    messageManager: {
      createMemory: vi.fn().mockResolvedValue({
        id: 'test-memory-id' as UUID,
        entityId: 'test-entity-id' as UUID,
        roomId: 'test-room-id' as UUID,
        agentId: 'test-agent-id' as UUID,
        content: { text: 'test message' },
        createdAt: Date.now(),
      }),
      getMemories: vi.fn().mockResolvedValue([]),
      updateMemory: vi.fn().mockResolvedValue(true),
      deleteMemory: vi.fn().mockResolvedValue(true),
      searchMemories: vi.fn().mockResolvedValue([]),
      getLastMessages: vi.fn().mockResolvedValue([]),
      ...(overrides as any).messageManager,
    },

    // Memory methods
    getMemories: vi.fn().mockResolvedValue([]),
    getMemoriesByEntityId: vi.fn().mockResolvedValue([]),
    createMemory: vi.fn().mockResolvedValue({
      id: 'test-memory-id' as UUID,
      entityId: 'test-entity-id' as UUID,
      roomId: 'test-room-id' as UUID,
      agentId: 'test-agent-id' as UUID,
      content: { text: 'test message' },
      createdAt: Date.now(),
    }),

    // State
    composeState: vi.fn().mockResolvedValue({
      values: {},
      data: {},
      text: '',
      hyperfyStatus: 'Connected to Hyperfy world',
    }),
    updateState: vi.fn().mockResolvedValue(true),

    // Actions & Providers
    actions: []
    providers: []
    evaluators: []

    // Components
    createComponent: vi.fn().mockResolvedValue(true),
    getComponents: vi.fn().mockResolvedValue([]),
    updateComponent: vi.fn().mockResolvedValue(true),

    // Database
    db: {
      query: vi.fn().mockResolvedValue([]),
      execute: vi.fn().mockResolvedValue({ changes: 1 }),
      getWorlds: vi.fn().mockResolvedValue([]),
      getWorld: vi.fn().mockResolvedValue(null),
    },

    // Additional methods
    getEntityById: vi.fn().mockResolvedValue(null),
    getRoom: vi.fn().mockResolvedValue({
      id: 'test-room-id',
      entities: []
    }),
    getEntitiesForRoom: vi.fn().mockResolvedValue([]),

    // Logging
    logger: {
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
      debug: vi.fn(),
    },

    // Entity management
    ensureConnection: vi.fn().mockResolvedValue({
      entityId: 'test-entity-id' as UUID,
      roomId: 'test-room-id' as UUID,
    }),

    // Event handling
    emitEvent: vi.fn(),
    on: vi.fn(),
    off: vi.fn(),

    // Process actions
    processActions: vi.fn().mockResolvedValue(undefined),

    // Evaluate
    evaluate: vi.fn().mockResolvedValue(null),

    // Entity operations
    updateEntity: vi.fn().mockResolvedValue(true),
    createEntity: vi.fn().mockResolvedValue(true),

    // Apply any overrides
    ...overrides,
  } as unknown as IAgentRuntime;
}

/**
 * Creates a mock Memory object for testing
 *
 * @param overrides - Optional overrides for the default memory properties
 * @returns A mock memory object
 */
export function createMockMemory(overrides: Partial<Memory> = {}): Memory {
  return {
    id: 'test-memory-id' as UUID,
    entityId: 'test-entity-id' as UUID,
    roomId: 'test-room-id' as UUID,
    agentId: 'test-agent-id' as UUID,
    content: {
      text: 'test message',
      source: 'test',
    },
    createdAt: Date.now(),
    ...overrides,
  } as Memory;
}

/**
 * Creates a mock State object for testing
 *
 * @param overrides - Optional overrides for the default state properties
 * @returns A mock state object
 */
export function createMockState(overrides: Partial<State> = {}): State {
  return {
    values: {},
    data: {},
    text: '',
    ...overrides,
  } as State;
}

/**
 * Creates a mock Service object for testing
 *
 * @param name - The name of the service
 * @param overrides - Optional overrides for the service properties
 * @returns A mock service object
 */
export function createMockService(name: string, overrides: any = {}): any {
  return {
    serviceName: name,
    capabilityDescription: `Mock ${name} service`,
    start: vi.fn().mockResolvedValue(undefined),
    stop: vi.fn().mockResolvedValue(undefined),
    isConnected: vi.fn().mockReturnValue(true),
    getWorld: vi.fn().mockReturnValue(null),
    ...overrides,
  };
}

/**
 * Creates a standardized setup for testing with consistent mock objects
 *
 * @param overrides - Optional overrides for default mock implementations
 * @returns An object containing mockRuntime, mockMessage, mockState, and callbackFn
 */
export function setupTest(
  overrides: {
    runtimeOverrides?: Partial<IAgentRuntime>;
    messageOverrides?: Partial<Memory>;
    stateOverrides?: Partial<State>;
  } = {}
) {
  // Create mock callback function
  const callbackFn = vi.fn();

  // Create a message
  const mockMessage = createMockMemory(overrides.messageOverrides);

  // Create a state object
  const mockState = createMockState(overrides.stateOverrides);

  // Create a mock runtime
  const mockRuntime = createMockRuntime({
    ...overrides.runtimeOverrides,
  });

  return {
    mockRuntime,
    mockMessage,
    mockState,
    callbackFn,
  };
}

/**
 * Creates a mock Hyperfy world object
 */
export function createMockWorld(): any {
  const mockEntities = new Map();

  // Add some test entities
  mockEntities.set('entity-1', {
    data: { id: 'entity-1', name: 'Block', type: 'block' },
    base: {
      position: {
        x: 0,
        y: 0,
        z: 0,
        fromArray: vi.fn(),
        toArray: vi.fn().mockReturnValue([0, 0, 0]),
      },
      quaternion: {
        x: 0,
        y: 0,
        z: 0,
        w: 1,
        fromArray: vi.fn(),
        toArray: vi.fn().mockReturnValue([0, 0, 0, 1]),
      },
      scale: { x: 1, y: 1, z: 1, fromArray: vi.fn(), toArray: vi.fn().mockReturnValue([1, 1, 1]) },
    },
    root: {
      position: {
        x: 0,
        y: 0,
        z: 0,
        fromArray: vi.fn(),
        toArray: vi.fn().mockReturnValue([0, 0, 0]),
      },
      quaternion: {
        x: 0,
        y: 0,
        z: 0,
        w: 1,
        fromArray: vi.fn(),
        toArray: vi.fn().mockReturnValue([0, 0, 0, 1]),
      },
      scale: { x: 1, y: 1, z: 1, fromArray: vi.fn(), toArray: vi.fn().mockReturnValue([1, 1, 1]) },
    },
    destroy: vi.fn(),
  });

  mockEntities.set('entity-2', {
    data: { id: 'entity-2', name: 'Sphere', type: 'sphere' },
    base: {
      position: {
        x: 5,
        y: 0,
        z: 5,
        fromArray: vi.fn(),
        toArray: vi.fn().mockReturnValue([5, 0, 5]),
      },
      quaternion: {
        x: 0,
        y: 0,
        z: 0,
        w: 1,
        fromArray: vi.fn(),
        toArray: vi.fn().mockReturnValue([0, 0, 0, 1]),
      },
      scale: { x: 1, y: 1, z: 1, fromArray: vi.fn(), toArray: vi.fn().mockReturnValue([1, 1, 1]) },
    },
    root: {
      position: {
        x: 5,
        y: 0,
        z: 5,
        fromArray: vi.fn(),
        toArray: vi.fn().mockReturnValue([5, 0, 5]),
      },
      quaternion: {
        x: 0,
        y: 0,
        z: 0,
        w: 1,
        fromArray: vi.fn(),
        toArray: vi.fn().mockReturnValue([0, 0, 0, 1]),
      },
      scale: { x: 1, y: 1, z: 1, fromArray: vi.fn(), toArray: vi.fn().mockReturnValue([1, 1, 1]) },
    },
    destroy: vi.fn(),
  });

  return {
    entities: {
      player: {
        data: {
          id: 'player-id',
          name: 'TestAgent',
          position: { x: 10, y: 0, z: 10 },
          effect: {},
        },
        base: {
          position: { x: 10, y: 0, z: 10 },
        },
        root: {
          position: { x: 10, y: 0, z: 10 },
        },
      },
      items: mockEntities,
    },
    chat: {
      add: vi.fn(),
      msgs: []
    },
    controls: {
      goto: vi.fn(),
      stopAllActions: vi.fn(),
    },
    actions: {
      execute: vi.fn(),
      getNearby: vi.fn().mockReturnValue([]),
    },
    network: {
      upload: vi.fn(),
      send: vi.fn(),
    },
    assetsUrl: 'https://test.hyperfy.io/assets',
    blueprints: {
      add: vi.fn(),
    },
  };
}

/**
 * Creates a mock Hyperfy service
 */
export function createMockHyperfyService(): any {
  return {
    start: vi.fn(),
    stop: vi.fn(),
    isConnected: vi.fn().mockReturnValue(true),
    getWorld: vi.fn().mockReturnValue(createMockWorld()),
    getMessageManager: vi.fn().mockReturnValue({
      sendMessage: vi.fn(),
      handleMessage: vi.fn(),
      getRecentMessages: vi.fn().mockResolvedValue({
        formattedHistory: 'No messages yet',
        lastResponseText: '',
        lastActions: []
      }),
    }),
    getEmoteManager: vi.fn().mockReturnValue({
      playEmote: vi.fn(),
      uploadEmotes: vi.fn(),
    }),
    getBehaviorManager: vi.fn().mockReturnValue({
      start: vi.fn(),
      stop: vi.fn(),
      isRunning: false,
    }),
    getBuildManager: vi.fn().mockReturnValue({
      duplicate: vi.fn(),
      translate: vi.fn(),
      rotate: vi.fn(),
      scale: vi.fn(),
      delete: vi.fn(),
      importEntity: vi.fn(),
    }),
    getVoiceManager: vi.fn().mockReturnValue({
      start: vi.fn(),
      stop: vi.fn(),
    }),
    currentWorldId: 'test-world-123',
    connect: vi.fn().mockResolvedValue(true),
    disconnect: vi.fn().mockResolvedValue(true),
  };
}

// Add spy on console for common usage in tests
export function setupLoggerSpies() {
  vi.spyOn(console, 'info').mockImplementation(() => {});
  vi.spyOn(console, 'error').mockImplementation(() => {});
  vi.spyOn(console, 'warn').mockImplementation(() => {});
  vi.spyOn(console, 'debug').mockImplementation(() => {});

  // allow tests to restore originals
  return () => vi.restoreAllMocks();
}
