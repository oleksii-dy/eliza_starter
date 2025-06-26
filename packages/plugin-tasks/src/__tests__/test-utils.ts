import type { IAgentRuntime, UUID } from '@elizaos/core';
import { createMockRuntime as createCoreMockRuntime } from '@elizaos/core/test-utils';
import { mock } from 'bun:test';

/**
 * Creates a comprehensive mock of the IAgentRuntime interface with sensible defaults
 * that can be overridden as needed for specific tests.
 *
 * @param overrides - Optional overrides for the default mock methods and properties
 * @returns A mock runtime for testing
 */
export function createMockRuntime(overrides: Partial<IAgentRuntime> = {}): IAgentRuntime {
  // Use the unified mock runtime from core with task-specific customizations
  return createCoreMockRuntime({
    // Task-specific defaults
    character: {
      id: 'test-agent-id' as UUID,
      name: 'Test Agent',
      bio: 'This is a test agent for task system unit tests',
    },
    
    // Custom getMemories implementation for facts provider tests
    getMemories: async (params: any) => {
      // For facts provider tests
      if (params?.tableName === 'facts' && params?.entityId === 'test-entity-id') {
        return [
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
        ];
      }
      return [];
    },
    
    ...overrides,
  });
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