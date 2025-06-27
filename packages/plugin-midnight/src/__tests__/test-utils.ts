// Try to import from core test-utils, fall back to local implementation
let mock: any;
try {
  ({ mock } = require('@elizaos/core/test-utils'));
} catch {
  // Local mock implementation until core test-utils build issue is resolved
  mock = () => {
    const calls: any[][] = [];
    const fn = (...args: any[]) => {
      calls.push(args);
      if (typeof fn._implementation === 'function') {
        return fn._implementation(...args);
      }
      return fn._returnValue;
    };
    fn.calls = calls;
    fn._returnValue = undefined;
    fn._implementation = null;
    fn.mockReturnValue = (value: any) => { fn._returnValue = value; fn._implementation = null; return fn; };
    fn.mockResolvedValue = (value: any) => { fn._returnValue = Promise.resolve(value); fn._implementation = null; return fn; };
    fn.mockRejectedValue = (error: any) => { fn._returnValue = Promise.reject(error); fn._implementation = null; return fn; };
    fn.mockImplementation = (impl: any) => { fn._implementation = impl; fn._returnValue = undefined; return fn; };
    fn.mock = { calls, results: [] };
    return fn;
  };
}

import { spyOn } from 'bun:test';
import {
  Content,
  IAgentRuntime,
  Memory,
  ModelType,
  Service,
  State,
  UUID,
  logger,
} from '@elizaos/core';

/**
 * Creates a mock runtime for testing
 *
 * @param overrides - Optional overrides for the default mock methods and properties
 * @returns A mock runtime for testing
 */
export function createMockRuntime(overrides: Partial<MockRuntime> = {}): MockRuntime {
  // Create base mock runtime with defaults
  const mockRuntime: MockRuntime = {
    // Core properties
    agentId: 'test-agent-id' as UUID,
    character: {
      name: 'Test Character',
      bio: 'This is a test character for testing',
    },
    services: new Map(),

    // Core methods
    getService: mock().mockReturnValue(null),
    registerService: mock(),
    getSetting: mock().mockReturnValue(null),

    // Model methods
    useModel: mock().mockImplementation((modelType, params) => {
      if (modelType === ModelType.TEXT_SMALL) {
        return Promise.resolve('Never gonna give you up, never gonna let you down');
      } else if (modelType === ModelType.TEXT_LARGE) {
        return Promise.resolve('Never gonna make you cry, never gonna say goodbye');
      } else if (modelType === ModelType.OBJECT_LARGE) {
        return Promise.resolve({
          thought: 'I should respond in a friendly way',
          message: 'Hello there! How can I help you today?',
        });
      }
      return Promise.resolve('Default response');
    }),

    // Additional methods used in tests
    init: mock().mockResolvedValue(undefined),
    ...overrides,
  };

  // Merge with overrides
  return mockRuntime;
}

/**
 * Creates a mock Memory object for testing
 *
 * @param overrides - Optional overrides for the default memory properties
 * @returns A mock memory object
 */
export function createMockMemory(overrides: Partial<Memory> = {}): Partial<Memory> {
  return {
    id: 'test-message-id' as UUID,
    roomId: 'test-room-id' as UUID,
    entityId: 'test-entity-id' as UUID,
    agentId: 'test-agent-id' as UUID,
    content: {
      text: 'Test message',
      source: 'test',
    } as Content,
    createdAt: Date.now(),
    ...overrides,
  };
}

/**
 * Creates a mock State object for testing
 *
 * @param overrides - Optional overrides for the default state properties
 * @returns A mock state object
 */
export function createMockState(overrides: Partial<State> = {}): Partial<State> {
  return {
    ...overrides,
    values: {
      recentMessages: 'User: Test message',
      ...overrides.values,
    },
    data: {
      ...overrides.data,
    },
    text: 'Mock state text',
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
    runtimeOverrides?: Partial<MockRuntime>;
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
 * Type definition for the mock runtime
 */
export interface MockRuntime {
  agentId: UUID;
  character: {
    name: string;
    bio: string;
    [key: string]: any;
  };
  services: Map<string, Service>;
  getService: ReturnType<typeof mock>;
  registerService: ReturnType<typeof mock>;
  getSetting: ReturnType<typeof mock>;
  useModel: ReturnType<typeof mock>;
  init: ReturnType<typeof mock>;
  [key: string]: any;
}

// Add spy on logger for common usage in tests
export function setupLoggerSpies() {
  const originalConsole = {
    info: console.info,
    error: console.error,
    warn: console.warn,
    debug: console.debug,
  };

  console.info = mock();
  console.error = mock();
  console.warn = mock();
  console.debug = mock();

  // allow tests to restore originals
  return () => {
    console.info = originalConsole.info;
    console.error = originalConsole.error;
    console.warn = originalConsole.warn;
    console.debug = originalConsole.debug;
  };
}

/**
 * Creates a realistic test runtime with actual ElizaOS interfaces
 * This provides a more realistic testing environment for complex services
 */
export async function createTestRuntime(): Promise<IAgentRuntime> {
  const runtime = {
    // Core properties
    agentId: 'test-agent-id' as UUID,
    character: {
      name: 'Test Agent',
      bio: ['Test agent for network messaging verification'],
      plugins: ['@elizaos/plugin-midnight'],
      knowledge: [],
      messageExamples: [],
      settings: {},
      secrets: {},
    },

    // Service management
    services: new Map(),

    // Core methods
    async initialize() {
      // Mock initialization
    },

    getService<T extends Service>(serviceType: string): T | null {
      return (runtime.services.get(serviceType as any) as T) || null;
    },

    async registerService(serviceClass: typeof Service): Promise<void> {
      const serviceType = (serviceClass as any).serviceType;
      if (serviceType) {
        const instance = await serviceClass.start(runtime as unknown as IAgentRuntime);
        runtime.services.set(serviceType, instance);
      }
    },

    getSetting(key: string): string | boolean | null {
      // Mock settings
      if (key === 'MIDNIGHT_NETWORK_URL') {
        return 'https://rpc.testnet.midnight.network';
      }
      if (key === 'MIDNIGHT_WALLET_MNEMONIC') {
        return 'abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about';
      }
      return null;
    },

    setSetting(key: string, value: string | boolean) {
      // Mock setting storage
    },

    // Memory operations
    async createMemory(memory: Memory, tableName?: string, unique?: boolean): Promise<UUID> {
      // Mock memory creation
      return memory.id || ('test-memory-id' as UUID);
    },

    async getMemories(params: {
      roomId: UUID;
      count?: number;
      unique?: boolean;
    }): Promise<Memory[]> {
      return [];
    },

    async searchMemories(params: {
      embedding: number[];
      roomId: UUID;
      match_threshold?: number;
    }): Promise<Memory[]> {
      return [];
    },

    async updateMemory(memory: Memory): Promise<void> {
      // Mock memory update
    },

    async deleteMemory(messageId: UUID): Promise<void> {
      // Mock memory deletion
    },

    // State and context
    async composeState(message: Memory, includeList?: string[]): Promise<State> {
      return {
        values: {},
        data: {},
        text: 'Mock state text',
      };
    },

    // Model integration
    async useModel(modelType: string, params: any): Promise<any> {
      // Mock model responses based on type
      if (modelType === 'TEXT_EMBEDDING') {
        return Array.from({ length: 1536 }, () => Math.random());
      }
      return 'Mock model response';
    },

    // Action processing
    async processActions(message: Memory, responses: Memory[], state?: State): Promise<void> {
      // Mock action processing
    },

    // Entity operations
    async createEntity(entity: any): Promise<UUID> {
      return 'test-entity-id' as UUID;
    },

    async getEntityById(entityId: UUID): Promise<any | null> {
      return null;
    },

    // Task operations
    registerTaskWorker(taskHandler: any): void {
      // Mock task worker registration
    },

    async createTask(task: any): Promise<UUID> {
      return 'test-task-id' as UUID;
    },

    async getTasks(params: { roomId?: UUID; tags?: string[] }): Promise<any[]> {
      return [];
    },

    // Additional required methods
    async addParticipant(entityId: UUID, roomId: UUID): Promise<void> {
      // Mock participant addition
    },

    async setParticipantUserState(
      roomId: UUID,
      entityId: UUID,
      state: string | null
    ): Promise<void> {
      // Mock participant state setting
    },
  } as unknown as IAgentRuntime;

  return runtime;
}
