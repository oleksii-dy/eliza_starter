/**
 * @fileoverview Mock implementations for IAgentRuntime and related interfaces
 *
 * This module provides comprehensive mock implementations for the core runtime interfaces,
 * designed to support both unit testing and integration testing scenarios.
 */

import { vi } from './vi-helper';
import { ModelType } from '../../types';
import type {
  IAgentRuntime,
  IDatabaseAdapter,
  ModelHandler,
  UUID,
  Character,
  Provider,
  Action,
  Evaluator,
  Entity,
  Component,
  Room,
  World,
  Relationship,
  Memory,
  Service,
  Plugin,
  State,
  Task,
  Participant,
  Log,
} from '../../types';

/**
 * Type representing overrides for IAgentRuntime mock creation
 */
export type MockRuntimeOverrides = Partial<IAgentRuntime & IDatabaseAdapter>;

/**
 * Create a comprehensive mock of IAgentRuntime with intelligent defaults
 *
 * This function provides a fully-featured mock that implements both IAgentRuntime
 * and IDatabaseAdapter interfaces, ensuring compatibility with all test scenarios.
 *
 * @param overrides - Partial object to override specific methods or properties
 * @returns Complete mock implementation of IAgentRuntime
 *
 * @deprecated Use real runtime testing instead: import { createTestRuntime } from '@elizaos/core/test-utils'
 * 
 * @example Legacy Mock Testing (Deprecated)
 * ```typescript
 * import { createMockRuntime } from '@elizaos/core/test-utils';
 *
 * const mockRuntime = createMockRuntime({
 *   getSetting: () => 'test-api-key',
 *   useModel: () => Promise.resolve('mock response')
 * });
 * ```
 */
export function createMockRuntime(overrides: MockRuntimeOverrides = {}): IAgentRuntime {
  // Mock character with sensible defaults
  const defaultCharacter: Character = {
    id: 'test-character-id' as UUID,
    name: 'Test Character',
    username: 'test_character',
    system: 'You are a helpful test assistant.',
    bio: ['A character designed for testing purposes'],
    messageExamples: [],
    postExamples: [],
    topics: ['testing', 'development'],
    adjectives: ['helpful', 'reliable'],
    knowledge: [],
    plugins: [],
    settings: {
      model: 'gpt-4',
      secrets: {},
    },
    style: {
      all: ['be helpful', 'be concise'],
      chat: ['respond quickly'],
      post: ['be engaging'],
    },
  };

  // Mock database connection
  const mockDb = {
    execute: vi.fn().mockResolvedValue([]),
    query: vi.fn().mockResolvedValue([]),
    run: vi.fn().mockResolvedValue({ changes: 1 }),
    all: vi.fn().mockResolvedValue([]),
    get: vi.fn().mockResolvedValue(null),
  };

  // Create base runtime mock
  const baseRuntime: IAgentRuntime = {
    // Core Properties
    agentId: 'test-agent-id' as UUID,
    character: overrides.character || defaultCharacter,
    providers: overrides.providers || [],
    actions: overrides.actions || [],
    evaluators: overrides.evaluators || [],
    plugins: overrides.plugins || [],
    services: overrides.services || new Map(),
    events: overrides.events || new Map(),
    fetch: overrides.fetch || null,
    routes: overrides.routes || [],

    // Database Properties
    db: overrides.db || mockDb,

    // Core Runtime Methods
    registerPlugin: vi.fn().mockResolvedValue(undefined),
    initialize: vi.fn().mockResolvedValue(undefined),
    getConnection: vi.fn().mockResolvedValue(mockDb),
    getService: vi.fn().mockReturnValue(null),
    getAllServices: vi.fn().mockReturnValue(new Map()),
    registerService: vi.fn().mockResolvedValue(undefined),
    registerDatabaseAdapter: vi.fn(),
    setSetting: vi.fn(),
    getSetting: vi.fn((key: string) => {
      const defaultSettings: Record<string, any> = {
        TEST_API_KEY: 'test-api-key',
        MODEL_PROVIDER: 'openai',
        MODEL_NAME: 'gpt-4',
        ...overrides.character?.settings,
      };
      return defaultSettings[key];
    }),
    getConversationLength: vi.fn().mockReturnValue(10),
    processActions: vi.fn().mockResolvedValue(undefined),
    evaluate: vi.fn().mockResolvedValue([]),
    registerProvider: vi.fn(),
    registerAction: vi.fn(),
    registerEvaluator: vi.fn(),
    ensureConnections: vi.fn().mockResolvedValue(undefined),
    ensureConnection: vi.fn().mockResolvedValue(undefined),
    ensureParticipantInRoom: vi.fn().mockResolvedValue(undefined),
    ensureWorldExists: vi.fn().mockResolvedValue(undefined),
    ensureRoomExists: vi.fn().mockResolvedValue(undefined),
    composeState: vi.fn().mockResolvedValue({
      values: {},
      data: {},
      text: '',
    } as State),
    useModel: vi
      .fn()
      .mockImplementation((modelType: (typeof ModelType)[keyof typeof ModelType], params: any) => {
        // Provide intelligent defaults based on model type
        switch (modelType) {
          case ModelType.TEXT_LARGE:
          case ModelType.TEXT_SMALL:
            return Promise.resolve('Mock text response');
          case ModelType.TEXT_EMBEDDING:
            return Promise.resolve(new Array(1536).fill(0).map(() => Math.random()));
          case ModelType.OBJECT_LARGE:
          case ModelType.OBJECT_SMALL:
            return Promise.resolve({
              text: 'Mock object response',
              thought: 'Mock reasoning',
            });
          default:
            return Promise.resolve('Mock response');
        }
      }),
    registerModel: vi.fn(),
    getModel: vi.fn().mockReturnValue(undefined),
    registerEvent: vi.fn(),
    getEvent: vi.fn().mockReturnValue(undefined),
    emitEvent: vi.fn().mockResolvedValue(undefined),
    registerTaskWorker: vi.fn(),
    getTaskWorker: vi.fn().mockReturnValue(undefined),
    stop: vi.fn().mockResolvedValue(undefined),
    addEmbeddingToMemory: vi.fn().mockImplementation((memory: Memory) => Promise.resolve(memory)),
    createRunId: vi.fn().mockReturnValue('test-run-id' as UUID),
    startRun: vi.fn().mockReturnValue('test-run-id' as UUID),
    endRun: vi.fn(),
    getCurrentRunId: vi.fn().mockReturnValue('test-run-id' as UUID),
    registerSendHandler: vi.fn(),
    sendMessageToTarget: vi.fn().mockResolvedValue(undefined),

    // Database Adapter Methods - Agent Management
    init: vi.fn().mockResolvedValue(undefined),
    isReady: vi.fn().mockResolvedValue(true),
    runMigrations: vi.fn().mockResolvedValue(undefined),
    close: vi.fn().mockResolvedValue(undefined),
    getAgent: vi.fn().mockResolvedValue(null),
    getAgents: vi.fn().mockResolvedValue([]),
    createAgent: vi.fn().mockResolvedValue(true),
    updateAgent: vi.fn().mockResolvedValue(true),
    deleteAgent: vi.fn().mockResolvedValue(true),

    // Entity Management
    getEntityById: vi.fn().mockResolvedValue(null),
    getEntityByIds: vi.fn().mockResolvedValue([]),
    getEntitiesForRoom: vi.fn().mockResolvedValue([]),
    createEntity: vi.fn().mockResolvedValue('test-entity-id' as UUID),
    createEntities: vi.fn().mockResolvedValue(true),
    updateEntity: vi.fn().mockResolvedValue(undefined),

    // Component Management
    getComponent: vi.fn().mockResolvedValue(null),
    getComponents: vi.fn().mockResolvedValue([]),
    createComponent: vi.fn().mockResolvedValue('test-component-id' as UUID),
    updateComponent: vi.fn().mockResolvedValue(undefined),
    deleteComponent: vi.fn().mockResolvedValue(undefined),

    // Memory Management
    getMemories: vi.fn().mockResolvedValue([]),
    getMemoryById: vi.fn().mockResolvedValue(null),
    getMemoriesByIds: vi.fn().mockResolvedValue([]),
    getMemoriesByRoomIds: vi.fn().mockResolvedValue([]),
    getMemoriesByWorldId: vi.fn().mockResolvedValue([]),
    getCachedEmbeddings: vi.fn().mockResolvedValue([]),
    log: vi.fn().mockResolvedValue(undefined),
    getLogs: vi.fn().mockResolvedValue([]),
    deleteLog: vi.fn().mockResolvedValue(undefined),
    searchMemories: vi.fn().mockResolvedValue([]),
    createMemory: vi.fn().mockResolvedValue('test-memory-id' as UUID),
    updateMemory: vi.fn().mockResolvedValue(true),
    deleteMemory: vi.fn().mockResolvedValue(undefined),
    deleteManyMemories: vi.fn().mockResolvedValue(undefined),
    deleteAllMemories: vi.fn().mockResolvedValue(undefined),
    countMemories: vi.fn().mockResolvedValue(0),
    ensureEmbeddingDimension: vi.fn().mockResolvedValue(undefined),

    // World Management
    createWorld: vi.fn().mockResolvedValue('test-world-id' as UUID),
    getWorld: vi.fn().mockResolvedValue(null),
    removeWorld: vi.fn().mockResolvedValue(undefined),
    getWorlds: vi.fn().mockResolvedValue([]),
    getAllWorlds: vi.fn().mockResolvedValue([]),
    updateWorld: vi.fn().mockResolvedValue(undefined),

    // Room Management
    getRoom: vi.fn().mockResolvedValue(null),
    getRooms: vi.fn().mockResolvedValue([]),
    getRoomsByIds: vi.fn().mockResolvedValue([]),
    createRoom: vi.fn().mockResolvedValue('test-room-id' as UUID),
    createRooms: vi.fn().mockResolvedValue([]),
    deleteRoom: vi.fn().mockResolvedValue(undefined),
    deleteRoomsByWorldId: vi.fn().mockResolvedValue(undefined),
    updateRoom: vi.fn().mockResolvedValue(undefined),
    getRoomsForParticipant: vi.fn().mockResolvedValue([]),
    getRoomsForParticipants: vi.fn().mockResolvedValue([]),
    getRoomsByWorld: vi.fn().mockResolvedValue([]),

    // Participant Management
    addParticipant: vi.fn().mockResolvedValue(true),
    removeParticipant: vi.fn().mockResolvedValue(true),
    addParticipantsRoom: vi.fn().mockResolvedValue(true),
    getParticipantsForEntity: vi.fn().mockResolvedValue([]),
    getParticipantsForRoom: vi.fn().mockResolvedValue([]),
    getParticipantUserState: vi.fn().mockResolvedValue(null),
    setParticipantUserState: vi.fn().mockResolvedValue(undefined),

    // Relationship Management
    createRelationship: vi.fn().mockResolvedValue(true),
    updateRelationship: vi.fn().mockResolvedValue(undefined),
    getRelationship: vi.fn().mockResolvedValue(null),
    getRelationships: vi.fn().mockResolvedValue([]),

    // Cache Management
    getCache: vi.fn().mockResolvedValue(undefined),
    setCache: vi.fn().mockResolvedValue(true),
    deleteCache: vi.fn().mockResolvedValue(true),

    // Task Management
    createTask: vi.fn().mockResolvedValue('test-task-id' as UUID),
    getTasks: vi.fn().mockResolvedValue([]),
    getTask: vi.fn().mockResolvedValue(null),
    getTasksByName: vi.fn().mockResolvedValue([]),
    updateTask: vi.fn().mockResolvedValue(undefined),
    deleteTask: vi.fn().mockResolvedValue(undefined),

    // Trust/Identity/Payment providers
    getTrustProvider: vi.fn().mockReturnValue(null),
    registerTrustProvider: vi.fn(),
    getIdentityManager: vi.fn().mockReturnValue(null),
    registerIdentityManager: vi.fn(),
    getPaymentProvider: vi.fn().mockReturnValue(null),
    registerPaymentProvider: vi.fn(),

    // Planning
    generatePlan: vi.fn().mockResolvedValue({
      id: 'test-plan-id' as UUID,
      status: 'pending',
      steps: [],
      results: [],
      completedAt: null,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    }),
    executePlan: vi.fn().mockResolvedValue({
      plan: {
        id: 'test-plan-id' as UUID,
        status: 'completed',
        steps: [],
        results: [],
        completedAt: Date.now(),
        createdAt: Date.now(),
        updatedAt: Date.now(),
      },
      success: true,
      responses: [],
    }),
    validatePlan: vi.fn().mockResolvedValue({
      valid: true,
      issues: [],
    }),

    // Configuration Manager
    getConfigurationManager: vi.fn().mockReturnValue({
      get: vi.fn().mockReturnValue(null),
      set: vi.fn().mockResolvedValue(undefined),
      list: vi.fn().mockReturnValue([]),
      remove: vi.fn().mockResolvedValue(undefined),
    }),

    // Plugin Configuration
    configurePlugin: vi.fn().mockResolvedValue(undefined),
    enableComponent: vi.fn().mockResolvedValue(undefined),
    disableComponent: vi.fn().mockResolvedValue(undefined),

    // Apply overrides
    ...overrides,
  };

  return baseRuntime;
}

/**
 * Re-export vi for convenience
 */
export { vi } from './vi-helper';
