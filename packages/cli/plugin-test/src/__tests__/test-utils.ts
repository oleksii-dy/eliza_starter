import type { IAgentRuntime, Memory, State } from '@elizaos/core';
import { createMockRuntime as createCoreMockRuntime } from '@elizaos/core/test-utils';
import { v4 as uuidv4 } from 'uuid';

/**
 * Creates a mock runtime for testing
 *
 * @param overrides - Optional overrides for the default mock methods and properties
 * @returns A mock runtime for testing
 */
export function createMockRuntime(overrides: Partial<IAgentRuntime> = {}): IAgentRuntime {
  // Use the unified mock runtime from core with starter-specific overrides
  return createCoreMockRuntime({
    // Starter plugin-specific settings
    getSetting: (key: string) => {
      const defaultSettings: Record<string, any> = {
        EXAMPLE_API_KEY: 'test-api-key',
        EXAMPLE_BASE_URL: 'https://api.example.com',
        EXAMPLE_TIMEOUT: '30000',
        LOG_LEVEL: 'info',
      };
      return defaultSettings[key] || null;
    },

    // Starter plugin-specific services
    getService: (name: string) => {
      const services: Record<string, any> = {
        example: {
          processData: async (data: any) => ({ processed: true, data }),
          validateInput: async (input: any) => ({ valid: true, input }),
          executeTask: async (task: any) => ({ success: true, result: 'completed' }),
        },
        ...(overrides as any)?.services,
      };
      return services[name];
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
    id: uuidv4(),
    entityId: uuidv4(),
    content: {
      text,
    },
    agentId: uuidv4(),
    roomId: uuidv4(),
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
