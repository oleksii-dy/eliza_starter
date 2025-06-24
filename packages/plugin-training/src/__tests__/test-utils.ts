// Test utilities for plugin-training
import { mock, expect } from 'bun:test';
import type { IAgentRuntime, Memory, State, UUID, Plugin } from '@elizaos/core';
import { elizaLogger } from '@elizaos/core';
import type { CustomReasoningService } from '../interfaces/CustomReasoningService.js';
import type { TrainingDataPoint, CustomModelType } from '../types.js';

/**
 * Creates a mock runtime for plugin-training tests
 */
export function createMockRuntime(overrides: Partial<IAgentRuntime> = {}): IAgentRuntime {
  const mockReasoningService = {
    shouldRespond: mock().mockResolvedValue({
      decision: 'RESPOND',
      reasoning: 'Test reasoning',
      confidence: 0.95,
    }),
    planResponse: mock().mockResolvedValue({
      thought: 'Test thought',
      actions: ['TEST_ACTION'],
      providers: ['TEST_PROVIDER'],
      text: 'Test response',
    }),
    generateCode: mock().mockResolvedValue({
      code: 'elizaLogger.info("Hello, world!");',
      explanation: 'Simple hello world example',
      language: 'javascript',
    }),
    enableModel: mock().mockResolvedValue(undefined),
    disableModel: mock().mockResolvedValue(undefined),
    getModelStatus: mock().mockResolvedValue({
      enabled: true,
      name: 'test-model',
      size: 'small',
      costPerHour: 0.1,
      isDeployed: true,
    }),
    collectTrainingData: mock().mockResolvedValue(undefined),
    exportTrainingData: mock().mockResolvedValue({
      modelType: 'should_respond',
      format: 'jsonl',
      samples: [],
      metadata: {
        exportedAt: Date.now(),
        agentId: 'test-agent-id' as UUID,
        totalSamples: 0,
      },
    }),
    getCostReport: mock().mockResolvedValue({
      totalCost: 0.05,
      budgetUsed: 0.05,
      budgetLimit: 10.0,
      recentCosts: [],
    }),
    setBudgetLimit: mock().mockResolvedValue(undefined),
    enableAutoShutdown: mock().mockResolvedValue(undefined),
    serviceName: 'together-reasoning',
    capabilityDescription: 'Custom reasoning capabilities',
    stop: mock().mockResolvedValue(undefined),
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
      info: mock(),
      warn: mock(),
      error: mock(),
      debug: mock(),
      log: mock(),
    },

    // Training-specific settings
    getSetting: mock((key: string) => {
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
    getService: mock((name: string) => {
      if (name === 'together-reasoning') {
        return mockReasoningService;
      }
      const services: Record<string, any> = {
        training: {
          extractTrainingData: mock().mockResolvedValue([]),
          prepareDataset: mock().mockResolvedValue('./test-dataset'),
          uploadToHuggingFace: mock().mockResolvedValue('https://huggingface.co/test'),
          startTraining: mock().mockResolvedValue({ id: 'test-job-id', status: 'running' }),
          monitorTraining: mock().mockResolvedValue({ id: 'test-job-id', status: 'running' }),
          getTrainingStats: mock().mockResolvedValue({
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
          getTrustScore: mock().mockResolvedValue(0.9),
        },
        ...overrides.services,
      };
      return services[name];
    }),

    // Core properties
    agentId: 'test-agent-id' as UUID,

    // Model/LLM
    useModel: mock().mockResolvedValue('mock model response'),
    generateText: mock().mockResolvedValue('generated text'),

    // Memory operations
    messageManager: {
      createMemory: mock().mockResolvedValue(true),
      getMemories: mock().mockResolvedValue([]),
      updateMemory: mock().mockResolvedValue(true),
      deleteMemory: mock().mockResolvedValue(true),
      searchMemories: mock().mockResolvedValue([]),
      getLastMessages: mock().mockResolvedValue([]),
    },

    // State
    composeState: mock().mockResolvedValue({
      values: {},
      data: {},
      text: '',
    }),
    updateState: mock().mockResolvedValue(true),

    // Actions & Providers
    actions: [],
    providers: [],
    evaluators: [],

    // Components
    createComponent: mock().mockResolvedValue(true),
    getComponents: mock().mockResolvedValue([]),
    updateComponent: mock().mockResolvedValue(true),

    // Other methods
    registerPlugin: mock().mockResolvedValue(undefined),
    initialize: mock().mockResolvedValue(undefined),
    processActions: mock().mockResolvedValue(undefined),
    evaluate: mock().mockResolvedValue(null),
    registerTaskWorker: mock(),
    getTaskWorker: mock().mockReturnValue(undefined),

    ...overrides,
  };

  // Ensure database methods are available with proper spy setup
  (baseRuntime as any).db = {
    run: mock().mockResolvedValue({ changes: 1, lastID: 1 }),
    get: mock().mockResolvedValue({
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
    all: mock().mockImplementation((sql: string) => {
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
    exec: mock().mockResolvedValue(undefined),
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
    mkdir: mock().mockResolvedValue(undefined),
    writeFile: mock().mockResolvedValue(undefined),
    readFile: mock().mockResolvedValue('{"test": "data"}'),
    readdir: mock().mockResolvedValue(['test-file-1.json', 'test-file-2.json', 'test-file-3.json']),
    stat: mock().mockResolvedValue({
      size: 1024,
      birthtime: new Date(),
      isDirectory: mock().mockReturnValue(false),
      isFile: mock().mockReturnValue(true),
    }),
    unlink: mock().mockResolvedValue(undefined),
    access: mock().mockResolvedValue(undefined),
    rmdir: mock().mockResolvedValue(undefined),
    rm: mock().mockResolvedValue(undefined),
  };

  mock.module('fs', () => ({
    promises: mockFs,
  }));

  mock.module('fs/promises', () => mockFs);

  return mockFs;
}

export function expectTrainingDataStored(mockDb: any, expectedData: Partial<TrainingDataPoint>) {
  expect(mockDb.run).toHaveBeenCalled();
  const calls = mockDb.run.mock.calls;
  expect(calls.length).toBeGreaterThan(0);

  const insertCall = calls.find((call: any[]) => call[0]?.includes('INSERT INTO training_data'));
  expect(insertCall).toBeDefined();
}

export function expectRecordingFileSaved(mockFs: any, expectedFilename: string) {
  expect(mockFs.writeFile).toHaveBeenCalled();
  const calls = mockFs.writeFile.mock.calls;
  expect(calls.length).toBeGreaterThan(0);

  const relevantCall = calls.find(
    (call: any[]) => call[0]?.includes(expectedFilename) && call[1]?.includes('"modelType"')
  );
  expect(relevantCall).toBeDefined();
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
  return mock().mockImplementation((url: string) => {
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
    send: mock(),
    close: mock(),
    on: mock(),
    addEventListener: mock(),
    removeEventListener: mock(),
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
      on: mock(),
    },
    stderr: {
      on: mock(),
    },
    on: mock(),
    kill: mock(),
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
