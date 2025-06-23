// Test utilities for plugin-autocoder
import { vi } from 'vitest';
import type { IAgentRuntime, Memory, State, UUID } from '@elizaos/core';

/**
 * Creates a mock runtime for plugin-autocoder tests
 */
export function createMockRuntime(overrides: Partial<IAgentRuntime> = {}): IAgentRuntime {
  return {
    agentId: 'test-agent-id' as UUID,
    character: {
      name: 'TestAgent',
      bio: ['Test bio'],
      system: 'Test system prompt',
      messageExamples: [],
      postExamples: [],
      topics: [],
      knowledge: [],
      plugins: ['@elizaos/plugin-autocoder'],
    },

    // Autocoder-specific settings
    getSetting: vi.fn((key: string) => {
      const settings: Record<string, string> = {
        DOCKER_HOST: 'unix:///var/run/docker.sock',
        COMMUNICATION_BRIDGE_PORT: '9000',
        ENCRYPTION_KEY: 'test-encryption-key',
        GITHUB_TOKEN: 'test-github-token',
        ...(overrides as any).settings,
      };
      return settings[key];
    }),

    // Autocoder-specific services
    getService: vi.fn((name: string) => {
      const services: Record<string, any> = {
        docker: {
          ping: vi.fn().mockResolvedValue(true),
          createContainer: vi.fn().mockResolvedValue('container-id'),
          startContainer: vi.fn().mockResolvedValue(undefined),
          stopContainer: vi.fn().mockResolvedValue(undefined),
          removeContainer: vi.fn().mockResolvedValue(undefined),
          getContainerStatus: vi.fn().mockResolvedValue({
            id: 'container-id',
            state: 'running',
            health: 'healthy',
          }),
        },
        'container-orchestrator': {
          spawnSubAgent: vi.fn().mockResolvedValue('container-id'),
          terminateSubAgent: vi.fn().mockResolvedValue(undefined),
          getTaskContainers: vi.fn().mockResolvedValue([]),
        },
        'communication-bridge': {
          sendToAgent: vi.fn().mockResolvedValue(true),
          broadcastToTask: vi.fn().mockResolvedValue(1),
          isAgentConnected: vi.fn().mockReturnValue(true),
        },
        'task-manager': {
          createTask: vi.fn().mockResolvedValue('task-id'),
          getTask: vi.fn().mockResolvedValue({
            id: 'task-id',
            title: 'Test Task',
            status: 'pending',
          }),
          listTasks: vi.fn().mockResolvedValue([]),
        },
        'secure-environment': {
          createTaskEnvironment: vi.fn().mockResolvedValue({}),
          provisionAgentCredentials: vi.fn().mockResolvedValue({}),
          getAgentEnvironment: vi.fn().mockResolvedValue({}),
        },
        'secrets-manager': {
          getSecret: vi.fn().mockResolvedValue('secret-value'),
          validateSecret: vi.fn().mockResolvedValue(true),
        },
        'trust-engine': {
          getTrustLevel: vi.fn().mockResolvedValue(75),
        },
        ...overrides.services,
      };
      return services[name];
    }),

    // Add other required runtime methods
    logger: {
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
      debug: vi.fn(),
    },
    useModel: vi.fn().mockResolvedValue('mock model response'),
    createMemory: vi.fn().mockResolvedValue('memory-id' as UUID),
    getMemories: vi.fn().mockResolvedValue([]),
    composeState: vi.fn().mockResolvedValue({
      values: {},
      data: {},
      text: '',
    }),

    ...overrides,
  } as unknown as IAgentRuntime;
}

/**
 * Creates a mock memory for autocoder tests
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
 * Creates a mock state for autocoder tests
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
 * Creates a mock container request for autocoder tests
 */
export function createMockContainerRequest() {
  return {
    name: 'test-agent',
    image: 'elizaos/autocoder-agent:latest',
    agentConfig: {
      agentId: 'test-agent-id' as any,
      containerId: '',
      agentName: 'test-agent',
      role: 'coder' as const,
      capabilities: ['code-generation'],
      communicationPort: 8000,
      healthPort: 8001,
      environment: { TEST: 'true' },
    },
  };
}
