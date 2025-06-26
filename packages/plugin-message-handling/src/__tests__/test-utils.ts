/**
 * Test utilities for plugin-message-handling
 * Re-exports test utilities from @elizaos/core to maintain consistency
 */

// Re-export all test utilities from core
export {
  // Mock creation functions from the mocks modules
  createMockRuntime,
  createMockMemory,
  createMockConversation,
  createMockConversationState,
  createMockCharacter,
  createMockDatabase,
  createMockState,

  // Factory functions from factories module
  createTestEnvironment,
  createTestAction,
  createTestProvider,
  createTestEvaluator,
  createPluginTestScenario,
  createMultiAgentScenario,
} from '@elizaos/core/test-utils';

import type { IAgentRuntime, State } from '@elizaos/core';
import { createMockRuntime, createMockState } from '@elizaos/core/test-utils';
import { mock } from 'bun:test';

// Type alias for MockRuntime for backward compatibility
export type MockRuntime = IAgentRuntime;

/**
 * Helper function to create a setup for action tests
 * This is specific to the message-handling plugin tests
 */
export function setupActionTest(
  options: {
    runtimeOverrides?: any;
    messageOverrides?: any;
    stateOverrides?: any;
  } = {}
) {
  const { runtimeOverrides = {}, messageOverrides = {}, stateOverrides = {} } = options;

  // Create mock runtime with message-handling specific defaults
  const mockRuntime = createMockRuntime({
    getSetting: mock().mockReturnValue('medium'),
    getParticipantUserState: mock().mockResolvedValue('ACTIVE'),
    composeState: mock().mockResolvedValue({
      values: {},
      data: {},
      text: '',
      ...stateOverrides,
    }),
    useModel: mock().mockResolvedValue('Mock response'),
    ...runtimeOverrides,
  });

  // Create a mock message with defaults
  const mockMessage = {
    id: 'test-message-id',
    roomId: 'test-room-id',
    entityId: 'test-user-id',
    content: {
      text: 'Test message',
      source: 'test',
    },
    createdAt: Date.now(),
    ...messageOverrides,
  };

  // Create a mock state with defaults
  const mockState = createMockState(stateOverrides) as State;

  // Create a mock callback function
  const callbackFn = mock().mockResolvedValue([]);

  return {
    mockRuntime,
    mockMessage,
    mockState,
    callbackFn,
  };
}
