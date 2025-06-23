/**
 * @fileoverview GitHub Plugin Test Utilities
 *
 * This file provides GitHub-specific test utilities and extensions to the centralized
 * mock system from @elizaos/core/test-utils. It preserves all existing functionality
 * while leveraging the more comprehensive centralized system.
 */

import { vi } from 'vitest';
import {
  Content,
  IAgentRuntime,
  Memory,
  ModelType,
  Service,
  State,
  UUID,
  logger,
  Character,
} from '@elizaos/core';

// Local type definitions
export type MockMemoryOverrides = Partial<Memory>;
export type MockStateOverrides = Partial<State>;

// Base mock functions (locally defined instead of importing from core/test-utils)
function baseMockRuntime(overrides: Partial<IAgentRuntime> = {}): IAgentRuntime {
  const defaultCharacter: Character = {
    name: 'TestAgent',
    bio: ['A test agent'],
    messageExamples: [],
    postExamples: [],
    topics: [],
    knowledge: [],
    plugins: [],
  };

  const baseRuntime = {
    agentId: 'test-agent-id' as UUID,
    character: overrides.character || defaultCharacter,
    providers: [],
    actions: [],
    evaluators: [],
    plugins: [],
    services: new Map(),
    events: new Map(),
    routes: [],

    // Core methods
    getSetting: vi.fn().mockReturnValue('test-value'),
    useModel: vi.fn().mockResolvedValue('mock response'),
    composeState: vi.fn().mockResolvedValue({
      values: {},
      data: {},
      text: '',
    }),

    // Database methods
    getMemories: vi.fn().mockResolvedValue([]),
    createMemory: vi.fn().mockResolvedValue('test-memory-id' as UUID),

    // Service methods
    getService: vi.fn().mockReturnValue(null),

    // Apply overrides
    ...overrides,
  } as IAgentRuntime;

  return baseRuntime;
}

function baseMockMemory(overrides: MockMemoryOverrides = {}): Memory {
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

function baseMockState(overrides: MockStateOverrides = {}): State {
  return {
    values: {},
    data: {},
    text: '',
    ...overrides,
  } as State;
}

/**
 * GitHub-specific runtime overrides with sensible defaults for GitHub testing
 */
const GITHUB_RUNTIME_DEFAULTS: Partial<IAgentRuntime> = {
  getSetting: vi.fn((key: string) => {
    // Provide GitHub-specific fallback values
    const githubSettings: Record<string, string> = {
      GITHUB_TOKEN: 'ghp_test123456789012345678901234567890',
      GITHUB_OWNER: 'test-owner',
      GITHUB_REPO: 'test-repo',
      GITHUB_WEBHOOK_SECRET: 'test-webhook-secret',
    };
    return githubSettings[key] || null;
  }),

  useModel: vi.fn().mockImplementation((modelType, params) => {
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
};

/**
 * Creates a mock runtime for GitHub plugin testing with GitHub-specific defaults
 *
 * @param overrides - Optional overrides for the default mock methods and properties
 * @returns A mock runtime for testing with GitHub-specific settings
 */
export function createMockRuntime(overrides: Partial<IAgentRuntime> = {}): IAgentRuntime {
  // Merge GitHub defaults with any overrides
  const githubOverrides: Partial<IAgentRuntime> = {
    ...GITHUB_RUNTIME_DEFAULTS,
    ...overrides,

    // Handle character overrides specially
    character: {
      name: 'Test Character',
      bio: ['This is a test character for testing'],
      settings: {}, // Initialize empty settings object
      ...overrides.character, // Allow character overrides
    },
  };

  // Use the centralized mock runtime with GitHub-specific defaults
  const runtime = baseMockRuntime(githubOverrides);

  return runtime;
}

/**
 * Creates a mock Memory object for testing
 *
 * @param overrides - Optional overrides for the default memory properties
 * @returns A mock memory object
 */
export function createMockMemory(overrides: MockMemoryOverrides = {}): Memory {
  // Use the centralized mock memory function
  return baseMockMemory(overrides);
}

/**
 * Creates a mock State object for testing
 *
 * @param overrides - Optional overrides for the default state properties
 * @returns A mock state object
 */
export function createMockState(overrides: MockStateOverrides = {}): State {
  // Use the centralized mock state function with GitHub-specific defaults
  const githubStateDefaults: MockStateOverrides = {
    values: {
      recentMessages: 'User: Test message',
      ...overrides.values,
    },
    data: {
      ...overrides.data,
    },
  };

  return baseMockState({
    ...githubStateDefaults,
    ...overrides,
  });
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
    messageOverrides?: MockMemoryOverrides;
    stateOverrides?: MockStateOverrides;
  } = {}
) {
  // Create mock callback function
  const callbackFn = vi.fn();

  // Create a message
  const mockMessage = createMockMemory(overrides.messageOverrides || {});

  // Create a state object
  const mockState = createMockState(overrides.stateOverrides || {});

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
 *
 * @deprecated Use IAgentRuntime directly from @elizaos/core types.
 * This type is maintained for backward compatibility only.
 */
export interface MockRuntime {
  agentId: UUID;
  character: {
    name: string;
    bio: string | string[];
    settings?: any;
    [key: string]: any;
  };
  services: Map<string, Service>;
  getService: ReturnType<typeof vi.fn>;
  registerService: ReturnType<typeof vi.fn>;
  getSetting: ReturnType<typeof vi.fn>;
  useModel: ReturnType<typeof vi.fn>;
  init: ReturnType<typeof vi.fn>;
  [key: string]: any;
}

/**
 * Add spy on logger for common usage in tests
 *
 * @returns A function to restore the original logger methods
 */
export function setupLoggerSpies() {
  vi.spyOn(logger, 'info').mockImplementation(() => {});
  vi.spyOn(logger, 'error').mockImplementation(() => {});
  vi.spyOn(logger, 'warn').mockImplementation(() => {});
  vi.spyOn(logger, 'debug').mockImplementation(() => {});

  // allow tests to restore originals
  return () => vi.restoreAllMocks();
}
