/**
 * @fileoverview Mock implementations for IDatabaseAdapter and related database interfaces
 *
 * This module provides comprehensive mock implementations for database operations,
 * supporting both unit and integration testing scenarios.
 */

import { vi } from './vi-helper';
import type {
  IDatabaseAdapter,
  UUID,
  Memory,
  Entity,
  Component,
  Room,
  World,
  Relationship,
  Task,
  Agent,
} from '../../types';

/**
 * Type representing overrides for IDatabaseAdapter mock creation
 */
export type MockDatabaseOverrides = Partial<IDatabaseAdapter>;

/**
 * Create a comprehensive mock of IDatabaseAdapter with intelligent defaults
 *
 * This function provides a fully-featured database adapter mock that implements
 * all database operations with sensible defaults and proper return types.
 *
 * @param overrides - Partial object to override specific methods or properties
 * @returns Complete mock implementation of IDatabaseAdapter
 *
 * @example
 * ```typescript
 * import { createMockDatabase } from '@elizaos/core/test-utils';
 * import { vi } from './vi-helper';
 *
 * const mockDb = createMockDatabase({
 *   getMemories: vi.fn().mockResolvedValue([mockMemory]),
 *   createMemory: vi.fn().mockResolvedValue('memory-id')
 * });
 * ```
 */
export function createMockDatabase(overrides: MockDatabaseOverrides = {}): IDatabaseAdapter {
  // Mock database connection
  const mockConnection = {
    execute: vi.fn().mockResolvedValue([]),
    query: vi.fn().mockResolvedValue([]),
    run: vi.fn().mockResolvedValue({ changes: 1 }),
    all: vi.fn().mockResolvedValue([]),
    get: vi.fn().mockResolvedValue(null),
  };

  const baseDatabaseAdapter: IDatabaseAdapter = {
    // Core Database Properties
    db: overrides.db || mockConnection,

    // Core Lifecycle Methods
    init: vi.fn().mockResolvedValue(undefined),
    initialize: vi.fn().mockResolvedValue(undefined),
    isReady: vi.fn().mockResolvedValue(true),
    runMigrations: vi.fn().mockResolvedValue(undefined),
    close: vi.fn().mockResolvedValue(undefined),
    getConnection: vi.fn().mockResolvedValue(mockConnection),

    // Agent Management
    getAgent: vi.fn().mockResolvedValue(null),
    getAgents: vi.fn().mockResolvedValue([]),
    createAgent: vi.fn().mockResolvedValue(true),
    updateAgent: vi.fn().mockResolvedValue(true),
    deleteAgent: vi.fn().mockResolvedValue(true),

    // Entity Management
    getEntitiesByIds: vi.fn().mockResolvedValue([]),
    getEntitiesForRoom: vi.fn().mockResolvedValue([]),
    createEntities: vi.fn().mockResolvedValue(true),
    updateEntity: vi.fn().mockResolvedValue(undefined),

    // Component Management
    getComponent: vi.fn().mockResolvedValue(null),
    getComponents: vi.fn().mockResolvedValue([]),
    createComponent: vi.fn().mockResolvedValue(true),
    updateComponent: vi.fn().mockResolvedValue(undefined),
    deleteComponent: vi.fn().mockResolvedValue(undefined),

    // Memory Management
    getMemories: vi.fn().mockResolvedValue([]),
    getMemoryById: vi.fn().mockResolvedValue(null),
    getMemoriesByIds: vi.fn().mockResolvedValue([]),
    getMemoriesByRoomIds: vi.fn().mockResolvedValue([]),
    getMemoriesByWorldId: vi.fn().mockResolvedValue([]),
    getCachedEmbeddings: vi.fn().mockResolvedValue([]),
    searchMemories: vi.fn().mockResolvedValue([]),
    createMemory: vi.fn().mockResolvedValue('test-memory-id' as UUID),
    updateMemory: vi.fn().mockResolvedValue(true),
    deleteMemory: vi.fn().mockResolvedValue(undefined),
    deleteManyMemories: vi.fn().mockResolvedValue(undefined),
    deleteAllMemories: vi.fn().mockResolvedValue(undefined),
    countMemories: vi.fn().mockResolvedValue(0),
    ensureEmbeddingDimension: vi.fn().mockResolvedValue(undefined),

    // Logging
    log: vi.fn().mockResolvedValue(undefined),
    getLogs: vi.fn().mockResolvedValue([]),
    deleteLog: vi.fn().mockResolvedValue(undefined),

    // World Management
    createWorld: vi.fn().mockResolvedValue('test-world-id' as UUID),
    getWorld: vi.fn().mockResolvedValue(null),
    removeWorld: vi.fn().mockResolvedValue(undefined),
    getAllWorlds: vi.fn().mockResolvedValue([]),
    getWorlds: vi.fn().mockResolvedValue([]),
    updateWorld: vi.fn().mockResolvedValue(undefined),

    // Room Management
    getRoomsByIds: vi.fn().mockResolvedValue([]),
    createRooms: vi.fn().mockResolvedValue([]),
    deleteRoom: vi.fn().mockResolvedValue(undefined),
    deleteRoomsByWorldId: vi.fn().mockResolvedValue(undefined),
    updateRoom: vi.fn().mockResolvedValue(undefined),
    getRoomsForParticipant: vi.fn().mockResolvedValue([]),
    getRoomsForParticipants: vi.fn().mockResolvedValue([]),
    getRoomsByWorld: vi.fn().mockResolvedValue([]),

    // Participant Management
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

    // Apply overrides
    ...overrides,
  };

  return baseDatabaseAdapter;
}

/**
 * Create a simple mock database connection object
 *
 * @param overrides - Partial object to override specific methods
 * @returns Mock database connection
 */
export function createMockDbConnection(overrides: any = {}) {
  return {
    execute: vi.fn().mockResolvedValue([]),
    query: vi.fn().mockResolvedValue([]),
    run: vi.fn().mockResolvedValue({ changes: 1 }),
    all: vi.fn().mockResolvedValue([]),
    get: vi.fn().mockResolvedValue(null),
    prepare: vi.fn().mockReturnValue({
      get: vi.fn().mockReturnValue(null),
      all: vi.fn().mockReturnValue([]),
      run: vi.fn().mockReturnValue({ changes: 1 }),
    }),
    ...overrides,
  };
}
