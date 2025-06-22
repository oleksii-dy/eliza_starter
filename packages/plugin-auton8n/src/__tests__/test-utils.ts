// Test utilities for plugin-auton8n using centralized mock system
import { vi } from 'vitest';
import type {
  IAgentRuntime,
  Memory,
  State,
  UUID,
  Content,
  Entity,
  Component,
  World,
  Room,
  Relationship,
  ModelType,
} from '@elizaos/core';
import {
  createMockRuntime as baseMockRuntime,
  createMockMemory as baseMockMemory,
  createMockState as baseMockState,
  createMockContent as baseMockContent,
  createMockComponent as baseMockComponent,
  createMockEntity as baseMockEntity,
  createMockWorld as baseMockWorld,
  createMockRoom as baseMockRoom,
  createMockRelationship as baseMockRelationship,
  createMockUUID,
} from '@elizaos/core/test-utils';

/**
 * Creates a mock runtime for plugin-auton8n tests
 * Extends the centralized mock runtime with auton8n-specific overrides
 */
export function createMockRuntime(overrides: Partial<IAgentRuntime> = {}): IAgentRuntime {
  return baseMockRuntime({
    character: {
      name: 'TestAgent',
      bio: ['Test bio for plugin-auton8n'],
      system: 'Test system prompt',
      messageExamples: [],
      postExamples: [],
      topics: ['plugin creation', 'automation'],
      adjectives: ['helpful', 'creative'],
      knowledge: [],
      plugins: ['@elizaos/plugin-auton8n'],
      settings: {
        modelProvider: 'openai',
        model: 'gpt-4',
      },
    },

    // Plugin-specific settings
    getSetting: vi.fn((key: string) => {
      const settings: Record<string, string> = {
        ANTHROPIC_API_KEY: 'test-anthropic-key',
        OPENAI_API_KEY: 'test-openai-key',
        N8N_API_URL: 'http://localhost:5678',
        N8N_API_KEY: 'test-n8n-key',
        PLUGIN_CREATION_TIMEOUT: '300000',
        MAX_RETRIES: '3',
        ...overrides.settings,
      };
      return settings[key];
    }),

    // Plugin-specific services
    getService: vi.fn((name: string) => {
      const services: Record<string, any> = {
        'plugin-creation': {
          start: vi.fn(),
          stop: vi.fn(),
          createPlugin: vi.fn().mockResolvedValue({
            id: createMockUUID(),
            name: 'test-plugin',
            status: 'completed',
            files: [],
          }),
          getPluginStatus: vi.fn().mockResolvedValue({ status: 'in_progress' }),
          cancelPluginCreation: vi.fn().mockResolvedValue(true),
          verifyPlugin: vi.fn().mockResolvedValue({ valid: true }),
          isReady: vi.fn().mockReturnValue(true),
        },
        'job-queue': {
          start: vi.fn(),
          stop: vi.fn(),
          addJob: vi.fn().mockResolvedValue({ id: 'job-1' }),
          getJob: vi.fn().mockResolvedValue({ id: 'job-1', status: 'pending' }),
          updateJob: vi.fn().mockResolvedValue(true),
        },
        ...overrides.services,
      };
      return services[name];
    }),

    // Plugin-specific model responses
    useModel: vi.fn().mockImplementation(async (modelType: ModelType, params: any) => {
      switch (modelType) {
        case ModelType.TEXT_LARGE:
          return 'Mock LLM response for plugin creation';
        case ModelType.TEXT_EMBEDDING:
          return new Array(1536).fill(0).map(() => Math.random());
        default:
          return 'Mock model response';
      }
    }),

    // Plugin-specific state composition
    composeState: vi.fn().mockResolvedValue({
      values: {
        pluginCreationInProgress: false,
        lastPluginCreated: null,
      },
      data: {},
      text: 'Current state composed',
    }),

    ...overrides,
  });
}

/**
 * Creates a mock memory for auton8n tests
 * Uses the centralized mock with auton8n-specific defaults
 */
export function createMockMemory(overrides: Partial<Memory> = {}): Memory {
  return baseMockMemory({
    content: {
      text: 'test message for plugin creation',
      source: 'test',
      type: 'text',
    },
    metadata: {
      type: 'message',
      source: 'test',
      timestamp: Date.now(),
    },
    ...overrides,
  });
}

/**
 * Creates a mock state for auton8n tests
 * Uses the centralized mock with auton8n-specific defaults
 */
export function createMockState(overrides: Partial<State> = {}): State {
  return baseMockState({
    values: {
      pluginName: null,
      pluginDescription: null,
      pluginStatus: null,
      ...overrides.values,
    },
    data: {
      plugins: [],
      currentTask: null,
      ...overrides.data,
    },
    text: 'Test state context',
    ...overrides,
  });
}

/**
 * Creates a mock content for auton8n tests
 * Uses the centralized mock with auton8n-specific defaults
 */
export function createMockContent(overrides: Partial<Content> = {}): Content {
  return baseMockContent({
    text: 'Test content',
    source: 'test',
    type: 'text',
    actions: [],
    providers: [],
    ...overrides,
  });
}

/**
 * Creates a mock component for auton8n tests
 * Uses the centralized mock with auton8n-specific defaults
 */
export function createMockComponent(overrides: Partial<Component> = {}): Component {
  return baseMockComponent({
    type: 'plugin-creation-task',
    data: {
      pluginName: 'test-plugin',
      status: 'pending',
    },
    ...overrides,
  });
}

/**
 * Creates a mock entity for auton8n tests
 * Uses the centralized mock with auton8n-specific defaults
 */
export function createMockEntity(overrides: Partial<Entity> = {}): Entity {
  return baseMockEntity({
    names: ['TestEntity'],
    ...overrides,
  });
}

/**
 * Creates a mock world for auton8n tests
 * Uses the centralized mock with auton8n-specific defaults
 */
export function createMockWorld(overrides: Partial<World> = {}): World {
  return baseMockWorld({
    name: 'TestWorld',
    serverId: 'test-server',
    ...overrides,
  });
}

/**
 * Creates a mock room for auton8n tests
 * Uses the centralized mock with auton8n-specific defaults
 */
export function createMockRoom(overrides: Partial<Room> = {}): Room {
  return baseMockRoom({
    name: 'TestRoom',
    source: 'test',
    type: 'GROUP',
    channelId: 'test-channel',
    serverId: 'test-server',
    ...overrides,
  });
}

/**
 * Creates a mock relationship for auton8n tests
 * Uses the centralized mock with auton8n-specific defaults
 */
export function createMockRelationship(overrides: Partial<Relationship> = {}): Relationship {
  return baseMockRelationship({
    tags: ['created_plugin', 'collaboration'],
    ...overrides,
  });
}

// Re-export the createMockUUID helper
export { createMockUUID };

// Helper for async delays in tests
export function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// Helper to create a mock plugin creation request
export interface MockPluginCreationRequest {
  name: string;
  description: string;
  features: string[];
  includeTests?: boolean;
  includeExamples?: boolean;
}

export function createMockPluginRequest(
  overrides: Partial<MockPluginCreationRequest> = {}
): MockPluginCreationRequest {
  return {
    name: 'test-plugin',
    description: 'A test plugin for unit testing',
    features: ['action handling', 'provider support'],
    includeTests: true,
    includeExamples: false,
    ...overrides,
  };
}

// Mock N8N workflow response
export function createMockN8nWorkflowResponse(status: 'success' | 'error' = 'success') {
  return {
    status,
    data: {
      workflowId: 'wf-123',
      executionId: 'exec-456',
      result:
        status === 'success'
          ? {
              pluginId: createMockUUID(),
              files: [
                { path: 'index.ts', content: 'export default plugin;' },
                { path: 'package.json', content: '{}' },
              ],
            }
          : null,
      error: status === 'error' ? 'Workflow execution failed' : null,
    },
  };
}

// Helper to reset all mocks
export function resetAllMocks() {
  vi.clearAllMocks();
}