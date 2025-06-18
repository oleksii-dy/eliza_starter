import { vi } from 'vitest';
import { Character, IAgentRuntime, Memory, State, UUID, Service, ServiceType } from '@elizaos/core';

/**
 * Creates a simplified mock of the IAgentRuntime interface for Alethea plugin testing
 */
export function createMockRuntime(overrides: Partial<MockRuntime> = {}): MockRuntime {
  const mockRuntime: MockRuntime = {
    // Core properties
    agentId: 'test-agent-id' as UUID,
    character: {
      name: 'Test Agent',
      bio: 'This is a test agent for unit tests',
      tone: 'helpful',
      templates: {
        reflectionTemplate: 'Test reflection template {{recentMessages}}',
        messageHandlerTemplate: 'Test message handler template {{recentMessages}}',
        shouldRespondTemplate: 'Test should respond template {{recentMessages}}',
      },
    } as Character,
    providers: [],
    actions: [],
    evaluators: [],
    plugins: [],
    services: new Map(),

    // Core methods
    registerPlugin: vi.fn().mockResolvedValue(undefined),
    initialize: vi.fn().mockResolvedValue(undefined),
    getService: vi.fn().mockReturnValue(null),
    getAllServices: vi.fn().mockReturnValue(new Map()),
    registerService: vi.fn(),
    registerAction: vi.fn(),
    registerProvider: vi.fn(),
    registerEvaluator: vi.fn(),
    setSetting: vi.fn(),
    getSetting: vi.fn().mockReturnValue(null),

    // Logger functionality
    logger: {
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
      debug: vi.fn(),
    },
  };

  return { ...mockRuntime, ...overrides };
}

/**
 * Creates a mock Memory object for testing
 */
export function createMockMemory(overrides: Partial<Memory> = {}): Partial<Memory> {
  return {
    id: 'test-message-id' as UUID,
    roomId: 'test-room-id' as UUID,
    entityId: 'test-entity-id' as UUID,
    agentId: 'test-agent-id' as UUID,
    content: {
      text: 'Test message',
    },
    createdAt: Date.now(),
    ...overrides,
  };
}

/**
 * Creates a mock State object for testing
 */
export function createMockState(overrides: Partial<State> = {}): Partial<State> {
  return {
    values: {
      agentName: 'Test Agent',
      recentMessages: 'User: Test message',
      ...overrides.values,
    },
    data: {
      room: {
        id: 'test-room-id',
        type: 'group',
        worldId: 'test-world-id',
        serverId: 'test-server-id',
      },
      ...overrides.data,
    },
    ...overrides,
  };
}

/**
 * Type definition for the mock runtime
 */
export type MockRuntime = Partial<IAgentRuntime> & {
  agentId: UUID;
  character: Character;
  providers: any[];
  actions: any[];
  evaluators: any[];
  plugins: any[];
  services: Map<string, Service>;

  // Mock function types
  registerPlugin: ReturnType<typeof vi.fn>;
  initialize: ReturnType<typeof vi.fn>;
  getService: ReturnType<typeof vi.fn>;
  getAllServices: ReturnType<typeof vi.fn>;
  registerService: ReturnType<typeof vi.fn>;
  registerAction: ReturnType<typeof vi.fn>;
  registerProvider: ReturnType<typeof vi.fn>;
  registerEvaluator: ReturnType<typeof vi.fn>;
  setSetting: ReturnType<typeof vi.fn>;
  getSetting: ReturnType<typeof vi.fn>;

  logger: {
    info: ReturnType<typeof vi.fn>;
    warn: ReturnType<typeof vi.fn>;
    error: ReturnType<typeof vi.fn>;
    debug: ReturnType<typeof vi.fn>;
  };
};
