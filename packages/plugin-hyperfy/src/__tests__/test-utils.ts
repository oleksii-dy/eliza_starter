import { mock  } from 'bun:test';
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
      messageExamples: [],
      postExamples: [],
      topics: [],
      knowledge: [],
      plugins: [],
      ...overrides.character,
    },

    // Settings
    getSetting: mock((key: string) => {
      const settings: Record<string, string> = {
        API_KEY: 'test-api-key',
        SECRET_KEY: 'test-secret',
        ...(overrides as any).settings,
      };
      return settings[key];
    }),

    // Services
    getService: mock((name: string) => {
      const services: Record<string, any> = {
        'test-service': {
          start: mock(),
          stop: mock(),
          doSomething: mock().mockResolvedValue('service result'),
        },
        hyperfy: createMockHyperfyService(),
        ...overrides.services,
      };
      return services[name];
    }),

    // Model/LLM
    useModel: mock().mockResolvedValue('mock model response'),
    generateText: mock().mockResolvedValue('generated text'),

    // Memory operations
    messageManager: {
      createMemory: mock().mockResolvedValue({
        id: 'test-memory-id' as UUID,
        entityId: 'test-entity-id' as UUID,
        roomId: 'test-room-id' as UUID,
        agentId: 'test-agent-id' as UUID,
        content: { text: 'test message' },
        createdAt: Date.now(),
      }),
      getMemories: mock().mockResolvedValue([]),
      updateMemory: mock().mockResolvedValue(true),
      deleteMemory: mock().mockResolvedValue(true),
      searchMemories: mock().mockResolvedValue([]),
      getLastMessages: mock().mockResolvedValue([]),
      ...(overrides as any).messageManager,
    },

    // Memory methods
    getMemories: mock().mockResolvedValue([]),
    getMemoriesByEntityId: mock().mockResolvedValue([]),
    createMemory: mock().mockResolvedValue({
      id: 'test-memory-id' as UUID,
      entityId: 'test-entity-id' as UUID,
      roomId: 'test-room-id' as UUID,
      agentId: 'test-agent-id' as UUID,
      content: { text: 'test message' },
      createdAt: Date.now(),
    }),

    // State
    composeState: mock().mockResolvedValue({
      values: {},
      data: {},
      text: '',
      hyperfyStatus: 'Connected to Hyperfy world',
    }),
    updateState: mock().mockResolvedValue(true),

    // Actions & Providers
    actions: [],
    providers: [],
    evaluators: [],

    // Components
    createComponent: mock().mockResolvedValue(true),
    getComponents: mock().mockResolvedValue([]),
    updateComponent: mock().mockResolvedValue(true),

    // Database
    db: {
      query: mock().mockResolvedValue([]),
      execute: mock().mockResolvedValue({ changes: 1 }),
      getWorlds: mock().mockResolvedValue([]),
      getWorld: mock().mockResolvedValue(null),
    },

    // Additional methods
    getEntityById: mock().mockResolvedValue(null),
    getRoom: mock().mockResolvedValue({
      id: 'test-room-id',
      entities: [],
    }),
    getEntitiesForRoom: mock().mockResolvedValue([]),

    // Logging
    logger: {
      info: mock(),
      warn: mock(),
      error: mock(),
      debug: mock(),
    },

    // Entity management
    ensureConnection: mock().mockResolvedValue({
      entityId: 'test-entity-id' as UUID,
      roomId: 'test-room-id' as UUID,
    }),

    // Event handling
    emitEvent: mock(),
    on: mock(),
    off: mock(),

    // Process actions
    processActions: mock().mockResolvedValue(undefined),

    // Evaluate
    evaluate: mock().mockResolvedValue(null),

    // Entity operations
    updateEntity: mock().mockResolvedValue(true),
    createEntity: mock().mockResolvedValue(true),

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
    start: mock().mockResolvedValue(undefined),
    stop: mock().mockResolvedValue(undefined),
    isConnected: mock().mockReturnValue(true),
    getWorld: mock().mockReturnValue(null),
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
  const callbackFn = mock();

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
        fromArray: mock(),
        toArray: mock().mockReturnValue([0, 0, 0]),
      },
      quaternion: {
        x: 0,
        y: 0,
        z: 0,
        w: 1,
        fromArray: mock(),
        toArray: mock().mockReturnValue([0, 0, 0, 1]),
      },
      scale: { x: 1, y: 1, z: 1, fromArray: mock(), toArray: mock().mockReturnValue([1, 1, 1]) },
    },
    root: {
      position: {
        x: 0,
        y: 0,
        z: 0,
        fromArray: mock(),
        toArray: mock().mockReturnValue([0, 0, 0]),
      },
      quaternion: {
        x: 0,
        y: 0,
        z: 0,
        w: 1,
        fromArray: mock(),
        toArray: mock().mockReturnValue([0, 0, 0, 1]),
      },
      scale: { x: 1, y: 1, z: 1, fromArray: mock(), toArray: mock().mockReturnValue([1, 1, 1]) },
    },
    destroy: mock(),
  });

  mockEntities.set('entity-2', {
    data: { id: 'entity-2', name: 'Sphere', type: 'sphere' },
    base: {
      position: {
        x: 5,
        y: 0,
        z: 5,
        fromArray: mock(),
        toArray: mock().mockReturnValue([5, 0, 5]),
      },
      quaternion: {
        x: 0,
        y: 0,
        z: 0,
        w: 1,
        fromArray: mock(),
        toArray: mock().mockReturnValue([0, 0, 0, 1]),
      },
      scale: { x: 1, y: 1, z: 1, fromArray: mock(), toArray: mock().mockReturnValue([1, 1, 1]) },
    },
    root: {
      position: {
        x: 5,
        y: 0,
        z: 5,
        fromArray: mock(),
        toArray: mock().mockReturnValue([5, 0, 5]),
      },
      quaternion: {
        x: 0,
        y: 0,
        z: 0,
        w: 1,
        fromArray: mock(),
        toArray: mock().mockReturnValue([0, 0, 0, 1]),
      },
      scale: { x: 1, y: 1, z: 1, fromArray: mock(), toArray: mock().mockReturnValue([1, 1, 1]) },
    },
    destroy: mock(),
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
      add: mock(),
      msgs: [],
    },
    controls: {
      goto: mock(),
      stopAllActions: mock(),
    },
    actions: {
      execute: mock(),
      getNearby: mock().mockReturnValue([]),
    },
    network: {
      upload: mock(),
      send: mock(),
    },
    assetsUrl: 'https://test.hyperfy.io/assets',
    blueprints: {
      add: mock(),
    },
  };
}

/**
 * Creates a mock Hyperfy service
 */
export function createMockHyperfyService(): any {
  return {
    start: mock(),
    stop: mock(),
    isConnected: mock().mockReturnValue(true),
    getWorld: mock().mockReturnValue(createMockWorld()),
    getMessageManager: mock().mockReturnValue({
      sendMessage: mock(),
      handleMessage: mock(),
      getRecentMessages: mock().mockResolvedValue({
        formattedHistory: 'No messages yet',
        lastResponseText: '',
        lastActions: [],
      }),
    }),
    getEmoteManager: mock().mockReturnValue({
      playEmote: mock(),
      uploadEmotes: mock(),
    }),
    getBehaviorManager: mock().mockReturnValue({
      start: mock(),
      stop: mock(),
      isRunning: false,
    }),
    getBuildManager: mock().mockReturnValue({
      duplicate: mock(),
      translate: mock(),
      rotate: mock(),
      scale: mock(),
      delete: mock(),
      importEntity: mock(),
    }),
    getVoiceManager: mock().mockReturnValue({
      start: mock(),
      stop: mock(),
    }),
    currentWorldId: 'test-world-123',
    connect: mock().mockResolvedValue(true),
    disconnect: mock().mockResolvedValue(true),
  };
}

// Add spy on console for common usage in tests
export function setupLoggerSpies() {
  mock.spyOn(console, 'info').mockImplementation(() => {});
  mock.spyOn(console, 'error').mockImplementation(() => {});
  mock.spyOn(console, 'warn').mockImplementation(() => {});
  mock.spyOn(console, 'debug').mockImplementation(() => {});

  // allow tests to restore originals
  return () => mock.restore();
}
