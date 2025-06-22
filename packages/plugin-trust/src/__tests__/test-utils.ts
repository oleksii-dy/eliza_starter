import { vi } from 'vitest';
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
      transparency: 72
    },
    evidence: [],
    lastCalculated: Date.now(),
    calculationMethod: 'weighted_average',
    trend: {
      direction: 'stable',
      changeRate: 0,
      lastChangeAt: Date.now()
    },
    interactionCount: 25
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
      adjectives: [],
      knowledge: [],
      clients: [],
      plugins: [],
    },
    
    // Settings
    getSetting: vi.fn((key: string) => {
      const settings: Record<string, string> = {
        API_KEY: 'test-api-key',
        SECRET_KEY: 'test-secret',
        ...(overrides as any).settings,
      };
      return settings[key];
    }),

    // Services
    getService: vi.fn((name: string) => {
      const services: Record<string, any> = {
        'trust-engine': {
          evaluateTrust: vi.fn().mockResolvedValue(mockTrustProfile),
          calculateTrust: vi.fn().mockResolvedValue(mockTrustProfile),
          getTrustScore: vi.fn().mockResolvedValue(75),
          updateTrust: vi.fn().mockResolvedValue(true),
          checkPermission: vi.fn().mockResolvedValue({ allowed: true }),
          detectThreats: vi.fn().mockResolvedValue({ isThreat: false, threats: [] }),
          getRole: vi.fn().mockResolvedValue('user'),
          updateRole: vi.fn().mockResolvedValue(true),
        },
        'trust': {
          evaluateTrust: vi.fn().mockResolvedValue(mockTrustProfile),
          calculateTrust: vi.fn().mockResolvedValue(mockTrustProfile),
          getTrustScore: vi.fn().mockResolvedValue(75),
          updateTrust: vi.fn().mockResolvedValue(true),
          checkPermission: vi.fn().mockResolvedValue({ allowed: true }),
          detectThreats: vi.fn().mockResolvedValue({ isThreat: false, threats: [] }),
          getRole: vi.fn().mockResolvedValue('user'),
          updateRole: vi.fn().mockResolvedValue(true),
          analyzeTrustEvidence: vi.fn().mockResolvedValue({
            evidenceType: 'HELPFUL_ACTION',
            impact: 5,
            description: 'Helpful interaction',
            sentiment: 'positive',
            affectedDimensions: ['benevolence', 'reliability'],
            analysisConfidence: 0.8
          }),
        },
        ...(overrides as any).services,
      };
      return services[name];
    }),

    // Cache
    getCache: vi.fn().mockReturnValue({
      get: vi.fn(),
      set: vi.fn(),
      delete: vi.fn(),
      clear: vi.fn(),
    }),

    // Room
    getRoom: vi.fn().mockReturnValue({
      id: 'room-1',
      name: 'Test Room',
    }),

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
    plugins: [],
    routes: [],

    // Components
    createComponent: vi.fn().mockResolvedValue(true),
    getComponents: vi.fn().mockResolvedValue([]),
    updateComponent: vi.fn().mockResolvedValue(true),

    // Database
    db: {
      query: vi.fn().mockResolvedValue([]),
      execute: vi.fn((sql: string, params?: any[]) => {
        // Simple mock that returns empty array for SELECT queries
        if (sql.trim().toUpperCase().startsWith('SELECT')) {
          return Promise.resolve({ rows: [] });
        }
        // For INSERT/UPDATE/DELETE, return changes
        return Promise.resolve({ changes: 1 });
      }),
      getWorlds: vi.fn().mockResolvedValue([]),
      getWorld: vi.fn().mockResolvedValue(null),
    },

    // Logging
    logger: {
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
      debug: vi.fn(),
    },

    // Services Map
    services: new Map(),

    // Events
    events: new Map(),

    // Other required methods
    initialize: vi.fn().mockResolvedValue(undefined),
    registerPlugin: vi.fn().mockResolvedValue(undefined),
    processActions: vi.fn().mockResolvedValue(undefined),
    evaluate: vi.fn().mockResolvedValue(null),
    ensureRoomExists: vi.fn().mockResolvedValue('room-1' as UUID),
    ensureUserExists: vi.fn().mockResolvedValue('user-1' as UUID),
    registerTaskWorker: vi.fn(),
    getTaskWorker: vi.fn(),
    processMessage: vi.fn().mockResolvedValue(undefined),

    // Apply any overrides
    ...overrides,
  } as unknown as IAgentRuntime;

  return defaultRuntime;
}

/**
 * Create a mock memory for trust plugin tests
 */
export function createMockMemory(text: string, entityId: UUID, overrides: Partial<Memory> = {}): Memory {
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