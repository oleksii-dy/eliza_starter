// Test utilities for plugin-training
import { vi } from 'vitest';
import type { IAgentRuntime, Memory, State, UUID, Plugin } from '@elizaos/core';
import { elizaLogger } from '@elizaos/core';
import type { CustomReasoningService } from '../interfaces/CustomReasoningService.js';
import type { TrainingDataPoint, CustomModelType } from '../types.js';

/**
 * Creates a mock runtime for plugin-training tests
 */
export function createMockRuntime(overrides: Partial<IAgentRuntime> = {}): IAgentRuntime {
  const mockReasoningService = {
    shouldRespond: vi.fn().mockResolvedValue({
      decision: 'RESPOND',
      reasoning: 'Test reasoning',
      confidence: 0.95,
    }),
    planResponse: vi.fn().mockResolvedValue({
      thought: 'Test thought',
      actions: ['TEST_ACTION'],
      providers: ['TEST_PROVIDER'],
      text: 'Test response',
    }),
    generateCode: vi.fn().mockResolvedValue({
      code: 'elizaLogger.info("Hello, world!");',
      explanation: 'Simple hello world example',
      language: 'javascript',
    }),
    enableModel: vi.fn().mockResolvedValue(undefined),
    disableModel: vi.fn().mockResolvedValue(undefined),
    getModelStatus: vi.fn().mockResolvedValue({
      enabled: true,
      name: 'test-model',
      size: 'small',
      costPerHour: 0.1,
      isDeployed: true,
    }),
    collectTrainingData: vi.fn().mockResolvedValue(undefined),
    exportTrainingData: vi.fn().mockResolvedValue({
      modelType: 'should_respond',
      format: 'jsonl',
      samples: [],
      metadata: {
        exportedAt: Date.now(),
        agentId: 'test-agent-id' as UUID,
        totalSamples: 0,
      },
    }),
    getCostReport: vi.fn().mockResolvedValue({
      totalCost: 0.05,
      budgetUsed: 0.05,
      budgetLimit: 10.0,
      recentCosts: [],
    }),
    setBudgetLimit: vi.fn().mockResolvedValue(undefined),
    enableAutoShutdown: vi.fn().mockResolvedValue(undefined),
    serviceName: 'together-reasoning',
    capabilityDescription: 'Custom reasoning capabilities',
    stop: vi.fn().mockResolvedValue(undefined),
  } as unknown as CustomReasoningService;

  // Create the base mock runtime first
  const baseRuntime = {
    character: {
      name: 'TestAgent',
      bio: ['Test agent for custom reasoning'],
      system: 'Test system prompt',
      messageExamples: [],
      postExamples: [],
      topics: ['training', 'machine learning'],
      knowledge: [],
      plugins: ['@elizaos/plugin-training'],
    },

    // Logger (required by failing tests)
    logger: {
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
      debug: vi.fn(),
      log: vi.fn(),
    },

    // Training-specific settings
    getSetting: vi.fn((key: string) => {
      const mockSettings: Record<string, string> = {
        REASONING_SERVICE_ENABLED: 'true',
        REASONING_SERVICE_SHOULD_RESPOND_ENABLED: 'true',
        REASONING_SERVICE_PLANNING_ENABLED: 'true',
        REASONING_SERVICE_CODING_ENABLED: 'true',
        TOGETHER_AI_API_KEY: 'test-api-key',
        HUGGING_FACE_TOKEN: 'hf_test_token',
        ATROPOS_API_URL: 'http://localhost:8000',
        OPENAI_API_KEY: 'sk-test-key',
        POSTGRES_URL: 'postgresql://test:test@localhost:5432/test',
        ...(overrides as any).settings,
      };
      return mockSettings[key];
    }),

    // Training-specific services
    getService: vi.fn((name: string) => {
      if (name === 'together-reasoning') {
        return mockReasoningService;
      }
      const services: Record<string, any> = {
        training: {
          extractTrainingData: vi.fn().mockResolvedValue([]),
          prepareDataset: vi.fn().mockResolvedValue('./test-dataset'),
          uploadToHuggingFace: vi.fn().mockResolvedValue('https://huggingface.co/test'),
          startTraining: vi.fn().mockResolvedValue({ id: 'test-job-id', status: 'running' }),
          monitorTraining: vi.fn().mockResolvedValue({ id: 'test-job-id', status: 'running' }),
          getTrainingStats: vi.fn().mockResolvedValue({
            totalConversations: 100,
            totalMessages: 1000,
            averageConversationLength: 10,
            averageMessageLength: 50,
            participantCount: 10,
            timeSpan: { durationDays: 30 },
            actionStats: { totalActions: 50, successfulActions: 45, actionTypes: {} },
            qualityMetrics: { averageQuality: 0.8, highQualityCount: 80, lowQualityCount: 5 },
            topicDistribution: { programming: 50, ai: 30, general: 20 },
          }),
        },
        trust: {
          getTrustScore: vi.fn().mockResolvedValue(0.9),
        },
        ...overrides.services,
      };
      return services[name];
    }),

    // Core properties
    agentId: 'test-agent-id' as UUID,

    // Model/LLM
    useModel: vi.fn().mockResolvedValue('mock model response'),
    generateText: vi.fn().mockResolvedValue('generated text'),

    // Memory operations
    messageManager: {
      createMemory: vi.fn().mockResolvedValue(true),
      getMemories: vi.fn().mockResolvedValue([]),
      updateMemory: vi.fn().mockResolvedValue(true),
      deleteMemory: vi.fn().mockResolvedValue(true),
      searchMemories: vi.fn().mockResolvedValue([]),
      getLastMessages: vi.fn().mockResolvedValue([]),
    },

    // State
    composeState: vi.fn().mockResolvedValue({
      values: {},
      data: {},
      text: '',
    }),
    updateState: vi.fn().mockResolvedValue(true),

    // Actions & Providers
    actions: [],
    providers: [],
    evaluators: [],

    // Components
    createComponent: vi.fn().mockResolvedValue(true),
    getComponents: vi.fn().mockResolvedValue([]),
    updateComponent: vi.fn().mockResolvedValue(true),

    // Other methods
    registerPlugin: vi.fn().mockResolvedValue(undefined),
    initialize: vi.fn().mockResolvedValue(undefined),
    processActions: vi.fn().mockResolvedValue(undefined),
    evaluate: vi.fn().mockResolvedValue(null),
    registerTaskWorker: vi.fn(),
    getTaskWorker: vi.fn().mockReturnValue(undefined),

    ...overrides,
  };

  // Ensure database methods are available with proper spy setup
  (baseRuntime as any).db = {
    run: vi.fn().mockResolvedValue({ changes: 1, lastID: 1 }),
    get: vi.fn().mockResolvedValue({
      total: 150,
      avg_confidence: 0.87,
      avg_response_time: 245,
      total_cost: 0.0456,
      recent_samples: 25,
      by_model_type: JSON.stringify({
        should_respond: 75,
        planning: 50,
        coding: 25,
      }),
      by_date: JSON.stringify({
        '2024-01-15': 10,
        '2024-01-14': 15,
      }),
    }),
    all: vi.fn().mockImplementation((sql: string) => {
      // Return different data based on the query
      if (sql.includes('training_data')) {
        return Promise.resolve([
          {
            id: 'test-1',
            model_type: 'should_respond',
            input_data: JSON.stringify({ messageText: 'Hello' }),
            output_data: JSON.stringify({ decision: 'RESPOND' }),
            conversation_context: JSON.stringify([]),
            state_data: JSON.stringify({}),
            metadata: JSON.stringify({ roomId: 'room-1' }),
            tags: JSON.stringify(['model:should_respond']),
          },
          // Add more samples to meet minimum requirements
          ...Array.from({ length: 60 }, (_, i) => ({
            id: `test-${i + 2}`,
            model_type: 'should_respond',
            input_data: JSON.stringify({ messageText: `Message ${i}` }),
            output_data: JSON.stringify({ decision: 'RESPOND' }),
            conversation_context: JSON.stringify([]),
            state_data: JSON.stringify({}),
            metadata: JSON.stringify({ roomId: `room-${i}` }),
            tags: JSON.stringify(['model:should_respond']),
          })),
        ]);
      }
      if (sql.includes('SELECT model_type')) {
        return Promise.resolve([
          { model_type: 'should_respond', count: 75 },
          { model_type: 'planning', count: 50 },
          { model_type: 'coding', count: 25 },
        ]);
      }
      return Promise.resolve([]);
    }),
    exec: vi.fn().mockResolvedValue(undefined),
  };

  // Add plugins property
  (baseRuntime as any).plugins = overrides.plugins || [];

  return baseRuntime as IAgentRuntime;
}

/**
 * Creates a mock memory for training tests
 * Uses the centralized mock with training-specific defaults
 */
export function createMockMemory(overrides: Partial<Memory> = {}): Memory {
  return {
    id: 'test-memory-id' as UUID,
    entityId: 'test-entity-id' as UUID,
    agentId: 'test-agent-id' as UUID,
    roomId: 'test-room-id' as UUID,
    createdAt: Date.now(),
    content: {
      text: 'Test message',
      source: 'test',
    },
    ...overrides,
  } as Memory;
}

/**
 * Creates a mock state for training tests
 * Uses the centralized mock with training-specific defaults
 */
export function createMockState(overrides: Partial<State> = {}): State {
  return {
    values: {},
    data: {},
    text: '',
    ...overrides,
  };
}

/**
 * Creates a mock training data point for testing
 */
export function createMockTrainingDataPoint(
  overrides: Partial<TrainingDataPoint> = {}
): TrainingDataPoint {
  return {
    id: 'test-data-point-id' as UUID,
    timestamp: Date.now(),
    modelType: 'should_respond' as CustomModelType,
    input: {
      prompt: 'Test prompt',
      messageText: 'Test message',
      conversationContext: [],
    },
    output: {
      decision: 'RESPOND',
      reasoning: 'Test reasoning',
      confidence: 0.95,
    },
    metadata: {
      agentId: 'test-agent-id' as UUID,
      roomId: 'test-room-id' as UUID,
      messageId: 'test-message-id' as UUID,
      responseTimeMs: 100,
      tokensUsed: 50,
      costUsd: 0.001,
    },
    ...overrides,
  };
}

export const TEST_CONSTANTS = {
  AGENT_ID: 'test-agent-id' as UUID,
  ROOM_ID: 'test-room-id' as UUID,
  MESSAGE_ID: 'test-message-id' as UUID,
  ENTITY_ID: 'test-entity-id' as UUID,
};

export function mockFileSystem() {
  const mockFs = {
    mkdir: vi.fn().mockResolvedValue(undefined),
    writeFile: vi.fn().mockResolvedValue(undefined),
    readFile: vi.fn().mockResolvedValue('{"test": "data"}'),
    readdir: vi
      .fn()
      .mockResolvedValue(['test-file-1.json', 'test-file-2.json', 'test-file-3.json']),
    stat: vi.fn().mockResolvedValue({
      size: 1024,
      birthtime: new Date(),
      isDirectory: vi.fn().mockReturnValue(false),
      isFile: vi.fn().mockReturnValue(true),
    }),
    unlink: vi.fn().mockResolvedValue(undefined),
    access: vi.fn().mockResolvedValue(undefined),
    rmdir: vi.fn().mockResolvedValue(undefined),
    rm: vi.fn().mockResolvedValue(undefined),
  };

  vi.doMock('fs', () => ({
    promises: mockFs,
  }));

  vi.doMock('fs/promises', () => mockFs);

  return mockFs;
}

export function expectTrainingDataStored(mockDb: any, expectedData: Partial<TrainingDataPoint>) {
  expect(mockDb.run.called).eq(true);
  const calls = mockDb.run.mock.calls;
  expect(calls.length).greaterThan(0);

  const insertCall = calls.find((call: any[]) => call[0]?.includes('INSERT INTO training_data'));
  expect(insertCall).not.undefined;
}

export function expectRecordingFileSaved(mockFs: any, expectedFilename: string) {
  expect(mockFs.writeFile.called).eq(true);
  const calls = mockFs.writeFile.mock.calls;
  expect(calls.length).greaterThan(0);

  const relevantCall = calls.find(
    (call: any[]) => call[0]?.includes(expectedFilename) && call[1]?.includes('"modelType"')
  );
  expect(relevantCall).not.undefined;
}

/**
 * Helper to create mock training conversations
 */
export function createMockTrainingConversations(count: number = 5) {
  return Array.from({ length: count }, (_, i) => ({
    id: `conv-${i}`,
    roomId: `room-${i}`,
    agentId: 'test-agent-id',
    participants: [`user-${i}`, 'test-agent-id'],
    messages: [
      {
        id: `msg-${i}-1`,
        role: 'user' as const,
        content: `User message ${i}`,
        timestamp: Date.now() - 1000,
        entityId: `user-${i}`,
      },
      {
        id: `msg-${i}-2`,
        role: 'assistant' as const,
        content: `Assistant response ${i}`,
        timestamp: Date.now(),
        entityId: 'test-agent-id',
        metadata: {
          actions: ['REPLY'],
          thought: `Thinking about response ${i}`,
        },
      },
    ],
    metadata: {
      startTime: Date.now() - 2000,
      endTime: Date.now(),
      messageCount: 2,
      actionCount: 1,
      successfulActions: 1,
      quality: 0.8,
    },
  }));
}

/**
 * Helper to create mock training config
 */
export function createMockTrainingConfig() {
  return {
    extractionConfig: {
      includeActions: true,
      includeProviders: true,
      includeEvaluators: true,
    },
    datasetConfig: {
      outputFormat: 'jsonl' as const,
      splitRatio: { train: 0.8, validation: 0.1, test: 0.1 },
      maxTokens: 512,
      deduplicate: true,
      minQuality: 0.5,
    },
    rlaifConfig: {
      judgeModel: 'gpt-4',
      preferenceDescription: 'helpful and harmless responses',
      maxResponseVariants: 3,
      scoringStrategy: 'pairwise' as const,
      rewardThreshold: 0.7,
    },
    atroposConfig: {
      apiUrl: 'http://localhost:8000',
      environment: 'test-environment',
      batchSize: 4,
      maxSteps: 100,
      learningRate: 1e-5,
      warmupSteps: 10,
      evalSteps: 5,
      saveSteps: 10,
    },
  };
}

/**
 * Mock fetch for testing HTTP requests
 */
export function mockFetch(responses: Record<string, any> = {}) {
  return vi.fn().mockImplementation((url: string) => {
    const response = responses[url] || { ok: true, json: () => Promise.resolve({}) };
    return Promise.resolve({
      ok: response.ok !== false,
      status: response.status || 200,
      json: () => Promise.resolve(response.json || response.data || {}),
      text: () => Promise.resolve(response.text || ''),
      ...response,
    });
  });
}

/**
 * Mock WebSocket for testing bridge communication
 */
export function mockWebSocket() {
  const mockWS = {
    send: vi.fn(),
    close: vi.fn(),
    on: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    readyState: 1, // OPEN
    CONNECTING: 0,
    OPEN: 1,
    CLOSING: 2,
    CLOSED: 3,
  };

  return mockWS;
}

/**
 * Mock child process for testing command execution
 */
export function mockChildProcess() {
  const mockProcess = {
    stdout: {
      on: vi.fn(),
    },
    stderr: {
      on: vi.fn(),
    },
    on: vi.fn(),
    kill: vi.fn(),
  };

  return mockProcess;
}

/**
 * Creates a test runtime for integration tests using real ElizaOS components
 */
export async function createTestRuntime(config: any = {}): Promise<IAgentRuntime> {
  // Import required modules
  const { AgentRuntime } = await import('@elizaos/core');
  const uuid = await import('uuid');

  const defaultCharacter = {
    id: config.agentId || uuid.v4(),
    name: 'TestAgent',
    bio: ['Test agent for integration testing'],
    system: 'You are a test agent for integration testing.',
    messageExamples: [],
    postExamples: [],
    topics: ['testing', 'ai'],
    knowledge: [],
    clients: [],
    plugins: ['@elizaos/plugin-sql'],
    settings: {},
    secrets: {},
    ...config.character,
  };

  // Create runtime with PGLite for testing
  const runtime = new AgentRuntime({
    character: defaultCharacter,
    databaseAdapter: undefined, // Will be provided by SQL plugin
    token: config.token || 'test-token',
    ...config,
  });

  return runtime;
}
