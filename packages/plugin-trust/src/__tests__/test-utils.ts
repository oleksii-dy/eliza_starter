import { mock  } from 'bun:test';
import type { IAgentRuntime, Memory, State, UUID } from '@elizaos/core';

/**
 * Create a mock runtime for trust plugin tests
 */
export function createMockRuntime(overrides: Partial<IAgentRuntime> = {}): IAgentRuntime {
  const mockTrustProfile = {
    entityId: 'entity-1',
    evaluatorId: 'test-agent',
    overallTrust: 75,
    confidence: 0.8,
    dimensions: {
      reliability: 80,
      competence: 75,
      integrity: 70,
      benevolence: 78,
      transparency: 72,
    },
    evidence: [],
    lastCalculated: Date.now(),
    calculationMethod: 'weighted_average',
    trend: {
      direction: 'stable',
      changeRate: 0,
      lastChangeAt: Date.now(),
    },
    interactionCount: 25,
  };

  const defaultRuntime: IAgentRuntime = {
    // Core properties
    agentId: 'test-agent' as UUID,
    character: {
      name: 'TestAgent',
      bio: ['Test bio'],
      system: 'Test system prompt',
      messageExamples: [],
      postExamples: [],
      topics: [],
      knowledge: [],
      plugins: [],
    },

    // Settings
    getSetting: mock((key: string) => {
      const settings: Record<string, string> = {
        API_KEY: 'test-api-key',
        SECRET_KEY: 'test-secret',
        ...(overrides as any).settings,
      };
      return settings[key];
    }),

    // Services
    getService: mock((name: string) => {
      const services: Record<string, any> = {
        'trust-engine': {
          evaluateTrust: mock().mockResolvedValue(mockTrustProfile),
          calculateTrust: mock().mockResolvedValue(mockTrustProfile),
          getTrustScore: mock().mockResolvedValue(75),
          updateTrust: mock().mockResolvedValue(true),
          checkPermission: mock().mockResolvedValue({ allowed: true }),
          detectThreats: mock().mockResolvedValue({ isThreat: false, threats: [] }),
          getRole: mock().mockResolvedValue('user'),
          updateRole: mock().mockResolvedValue(true),
        },
        trust: {
          evaluateTrust: mock().mockResolvedValue(mockTrustProfile),
          calculateTrust: mock().mockResolvedValue(mockTrustProfile),
          getTrustScore: mock().mockResolvedValue(75),
          updateTrust: mock().mockResolvedValue(true),
          checkPermission: mock().mockResolvedValue({ allowed: true }),
          detectThreats: mock().mockResolvedValue({ isThreat: false, threats: [] }),
          getRole: mock().mockResolvedValue('user'),
          updateRole: mock().mockResolvedValue(true),
          analyzeTrustEvidence: mock().mockResolvedValue({
            evidenceType: 'HELPFUL_ACTION',
            impact: 5,
            description: 'Helpful interaction',
            sentiment: 'positive',
            affectedDimensions: ['benevolence', 'reliability'],
            analysisConfidence: 0.8,
          }),
        },
        ...(overrides as any).services,
      };
      return services[name];
    }),

    // Cache
    getCache: mock().mockReturnValue({
      get: mock(),
      set: mock(),
      delete: mock(),
      clear: mock(),
    }),

    // Room
    getRoom: mock().mockReturnValue({
      id: 'room-1',
      name: 'Test Room',
    }),

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
    plugins: [],
    routes: [],

    // Components
    createComponent: mock().mockResolvedValue(true),
    getComponents: mock().mockResolvedValue([]),
    updateComponent: mock().mockResolvedValue(true),

    // Database
    db: {
      query: mock().mockResolvedValue([]),
      execute: mock((sql: string, params?: any[]) => {
        // Simple mock that returns empty array for SELECT queries
        if (sql.trim().toUpperCase().startsWith('SELECT')) {
          return Promise.resolve({ rows: [] });
        }
        // For INSERT/UPDATE/DELETE, return changes
        return Promise.resolve({ changes: 1 });
      }),
      getWorlds: mock().mockResolvedValue([]),
      getWorld: mock().mockResolvedValue(null),
    },

    // Logging
    logger: {
      info: mock(),
      warn: mock(),
      error: mock(),
      debug: mock(),
    },

    // Services Map
    services: new Map(),

    // Events
    events: new Map(),

    // Other required methods
    initialize: mock().mockResolvedValue(undefined),
    registerPlugin: mock().mockResolvedValue(undefined),
    processActions: mock().mockResolvedValue(undefined),
    evaluate: mock().mockResolvedValue(null),
    ensureRoomExists: mock().mockResolvedValue('room-1' as UUID),
    ensureUserExists: mock().mockResolvedValue('user-1' as UUID),
    registerTaskWorker: mock(),
    getTaskWorker: mock(),
    processMessage: mock().mockResolvedValue(undefined),

    // Apply any overrides
    ...overrides,
  } as unknown as IAgentRuntime;

  return defaultRuntime;
}

/**
 * Create a mock memory for trust plugin tests
 */
export function createMockMemory(
  text: string,
  entityId: UUID,
  overrides: Partial<Memory> = {}
): Memory {
  return {
    id: `memory-${Date.now()}` as UUID,
    entityId,
    agentId: 'test-agent' as UUID,
    roomId: 'room-1' as UUID,
    content: {
      text,
      source: 'test',
    },
    createdAt: Date.now(),
    ...overrides,
  } as Memory;
}

/**
 * Create a mock state for trust plugin tests
 */
export function createMockState(overrides: Partial<State> = {}): State {
  return {
    values: {},
    data: {},
    text: '',
    ...overrides,
  } as State;
}
