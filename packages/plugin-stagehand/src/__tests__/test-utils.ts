import { mock, spyOn } from 'bun:test';
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
import { createMockRuntime as baseMockRuntime } from '../../../core/src/test-utils/mocks/runtime';
import { createMockMemory as baseMockMemory } from '../../../core/src/test-utils/mocks/memory';
import { createMockState as baseMockState } from '../../../core/src/test-utils/mocks/state';

/**
 * Creates a mock runtime for testing stagehand components
 * Extends the centralized mock runtime with stagehand-specific overrides
 *
 * @param overrides - Optional overrides for the default mock methods and properties
 * @returns A mock runtime for testing
 */
export function createMockRuntime(overrides: Partial<IAgentRuntime> = {}): IAgentRuntime {
  // Use the centralized mock runtime with stagehand-specific defaults
  return baseMockRuntime({
    character: {
      name: 'Stagehand Test Character',
      bio: ['This is a test character for testing stagehand functionality'],
      system: 'You are a test agent for stagehand automation',
      messageExamples: [],
      postExamples: [],
      topics: ['web-automation', 'testing'],
      knowledge: [],
      plugins: ['@elizaos/plugin-stagehand'],
    },

    // Model methods with stagehand-specific responses
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

    // Additional methods for stagehand testing
    init: mock().mockResolvedValue(undefined),

    ...overrides,
  });
}

/**
 * Creates a mock memory for stagehand tests
 * Uses the centralized mock with stagehand-specific defaults
 */
export function createMockMemory(overrides: Partial<Memory> = {}): Memory {
  return baseMockMemory({
    content: {
      text: 'Test message for stagehand automation',
      source: 'stagehand-test',
    },
    ...overrides,
  });
}

/**
 * Creates a mock state for stagehand tests
 * Uses the centralized mock with stagehand-specific defaults
 */
export function createMockState(overrides: Partial<State> = {}): State {
  return baseMockState({
    values: {
      testValue: 'stagehand test value',
    },
    text: 'Stagehand test context',
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
 * Stagehand-specific test helper functions
 */
export const createMockService = (overrides: Partial<Service> = {}): Service => {
  const mockService = {
    start: mock().mockResolvedValue(undefined),
    stop: mock().mockResolvedValue(undefined),
    getCapabilities: mock().mockReturnValue([]),
    ...overrides,
  } as unknown as Service;

  return mockService;
};

export const createMockContent = (overrides: Partial<Content> = {}): Content => {
  return {
    text: 'Test content for stagehand',
    source: 'stagehand-test',
    ...overrides,
  };
};

// Add spy on logger for common usage in tests
export function setupLoggerSpies() {
  spyOn(logger, 'info').mockImplementation(() => {});
  spyOn(logger, 'error').mockImplementation(() => {});
  spyOn(logger, 'warn').mockImplementation(() => {});
  spyOn(logger, 'debug').mockImplementation(() => {});

  // allow tests to restore originals
  return () => mock.restore();
}
