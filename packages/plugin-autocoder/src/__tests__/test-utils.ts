// Test utilities for plugin-autocoder
import { mock  } from 'bun:test';
import type { IAgentRuntime, Memory, State, UUID } from '@elizaos/core';

/**
 * Creates a mock runtime for plugin-autocoder tests
 */
export function createMockRuntime(overrides: Partial<IAgentRuntime> = { /* empty */ }): IAgentRuntime {
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
    getSetting: mock((key: string) => {
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
    getService: mock((name: string) => {
      const services: Record<string, any> = {
        docker: {
          ping: mock().mockResolvedValue(true),
          createContainer: mock().mockResolvedValue('container-id'),
          startContainer: mock().mockResolvedValue(undefined),
          stopContainer: mock().mockResolvedValue(undefined),
          removeContainer: mock().mockResolvedValue(undefined),
          getContainerStatus: mock().mockResolvedValue({
            id: 'container-id',
            state: 'running',
            health: 'healthy',
          }),
        },
        'container-orchestrator': {
          spawnSubAgent: mock().mockResolvedValue('container-id'),
          terminateSubAgent: mock().mockResolvedValue(undefined),
          getTaskContainers: mock().mockResolvedValue([]),
        },
        'communication-bridge': {
          sendToAgent: mock().mockResolvedValue(true),
          broadcastToTask: mock().mockResolvedValue(1),
          isAgentConnected: mock().mockReturnValue(true),
        },
        'task-manager': {
          createTask: mock().mockResolvedValue('task-id'),
          getTask: mock().mockResolvedValue({
            id: 'task-id',
            title: 'Test Task',
            status: 'pending',
          }),
          listTasks: mock().mockResolvedValue([]),
        },
        'secure-environment': {
          createTaskEnvironment: mock().mockResolvedValue({ /* empty */ }),
          provisionAgentCredentials: mock().mockResolvedValue({ /* empty */ }),
          getAgentEnvironment: mock().mockResolvedValue({ /* empty */ }),
        },
        'secrets-manager': {
          getSecret: mock().mockResolvedValue('secret-value'),
          validateSecret: mock().mockResolvedValue(true),
        },
        'trust-engine': {
          getTrustLevel: mock().mockResolvedValue(75),
        },
        ...overrides.services,
      };
      return services[name];
    }),

    // Add other required runtime methods
    logger: {
      info: mock(),
      warn: mock(),
      error: mock(),
      debug: mock(),
    },
    useModel: mock().mockResolvedValue('mock model response'),
    createMemory: mock().mockResolvedValue('memory-id' as UUID),
    getMemories: mock().mockResolvedValue([]),
    composeState: mock().mockResolvedValue({
      values: { /* empty */ },
      data: { /* empty */ },
      text: '',
    }),

    ...overrides,
  } as unknown as IAgentRuntime;
}

/**
 * Creates a mock memory for autocoder tests
 */
export function createMockMemory(overrides: Partial<Memory> = { /* empty */ }): Memory {
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
export function createMockState(overrides: Partial<State> = { /* empty */ }): State {
  return {
    values: { /* empty */ },
    data: { /* empty */ },
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
