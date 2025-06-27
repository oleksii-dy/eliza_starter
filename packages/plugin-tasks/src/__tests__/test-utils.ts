import type { IAgentRuntime, Memory, State, UUID, Task } from '@elizaos/core';
import { createMockRuntime as createCoreMockRuntime } from '@elizaos/core/test-utils';
import { v4 as uuidv4 } from 'uuid';
import { mock } from 'bun:test';

/**
 * Creates a comprehensive mock of the IAgentRuntime interface with sensible defaults
 * that can be overridden as needed for specific tests.
 *
 * @param overrides - Optional overrides for the default mock methods and properties
 * @returns A mock runtime for testing
 */
export function createMockRuntime(overrides: Partial<IAgentRuntime> = {}): IAgentRuntime {
  // Use the unified mock runtime from core with tasks-specific overrides
  return createCoreMockRuntime({
    // Tasks-specific settings
    getSetting: (key: string) => {
      const defaultSettings: Record<string, any> = {
        TASK_CLEANUP_INTERVAL: '3600000', // 1 hour
        MAX_TASKS_PER_ROOM: '100',
        TASK_EXECUTION_TIMEOUT: '300000', // 5 minutes
        LOG_LEVEL: 'info',
      };
      return defaultSettings[key] || null;
    },

    // Tasks-specific services and mock database operations
    getService: (name: string) => {
      const services: Record<string, any> = {
        tasks: {
          create: async (task: Partial<Task>) => ({
            id: uuidv4() as UUID,
            name: task.name || 'Test Task',
            description: task.description || 'Test task description',
            roomId: task.roomId || (uuidv4() as UUID),
            tags: task.tags || [],
            metadata: task.metadata || {},
            createdAt: new Date(),
            updatedAt: new Date(),
            ...task,
          }),
          findById: async (id: UUID) => null,
          findByRoom: async (roomId: UUID) => [],
          update: async (id: UUID, updates: Partial<Task>) => true,
          delete: async (id: UUID) => true,
          findByTags: async (tags: string[]) => [],
        },
        ...(overrides as any)?.services,
      };
      return services[name];
    },

    // Mock task operations
    createTask: async (task: Partial<Task>) => {
      return uuidv4() as UUID;
    },

    getTasks: async (params: { roomId?: UUID; tags?: string[] }) => {
      return [];
    },

    deleteTask: async (taskId: UUID) => {
      return true;
    },

    ...overrides,
  }) as any;
}

/**
 * Creates a mock memory object for testing
 */
export function createMockMemory(
  text: string = 'Test message',
  overrides: Partial<Memory> = {}
): Memory {
  return {
    id: uuidv4() as UUID,
    entityId: uuidv4() as UUID,
    content: {
      text,
    },
    agentId: uuidv4() as UUID,
    roomId: uuidv4() as UUID,
    createdAt: Date.now(),
    ...overrides,
  } as Memory;
}

/**
 * Creates a mock state object for testing
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
 * Creates a mock task object for testing
 */
export function createMockTask(overrides: Partial<Task> = {}): Task {
  return {
    id: uuidv4() as UUID,
    name: 'Test Task',
    description: 'A test task for unit testing',
    roomId: uuidv4() as UUID,
    tags: ['test'],
    metadata: {},
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  } as Task;
}

// Legacy exports for backward compatibility
export type MockRuntime = IAgentRuntime;

export function setupActionTest() {
  const mockRuntime = createMockRuntime();
  const mockMemory = createMockMemory();
  const mockState = createMockState();
  const callbackFn = mock().mockResolvedValue([]);

  return {
    mockRuntime,
    mockMemory,
    mockMessage: mockMemory, // Alias for compatibility
    mockState,
    callbackFn,
  };
}
