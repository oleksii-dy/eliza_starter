import { vi } from 'vitest';
import {
  stringToUuid,
  type IAgentRuntime,
  type Memory,
  type State,
  type Entity,
  type Room,
  type Metadata,
  type UUID,
  type Relationship,
  ChannelType,
} from '@elizaos/core';

export function createMockRuntime(overrides?: Partial<IAgentRuntime>): IAgentRuntime {
  const mockRoom: Room = {
    id: stringToUuid('test-room'),
    agentId: stringToUuid('test-agent'),
    source: 'test',
    type: ChannelType.DM,
  };

  const mockEntity: Entity = {
    id: stringToUuid('test-entity'),
    agentId: stringToUuid('test-agent'),
    names: ['Test Entity'],
    metadata: {},
  };

  return {
    agentId: stringToUuid('test-agent'),
    // Memory operations
    getMemories: vi.fn().mockResolvedValue([]),
    saveMemory: vi.fn().mockResolvedValue(undefined),
    updateMemory: vi.fn().mockResolvedValue(undefined),

    // Entity operations
    getEntity: vi.fn().mockResolvedValue(mockEntity),
    getEntityById: vi.fn().mockResolvedValue(mockEntity),
    updateEntity: vi.fn().mockResolvedValue(undefined),
    createEntity: vi.fn().mockResolvedValue(mockEntity),

    // Room operations
    getRoom: vi.fn().mockResolvedValue(mockRoom),
    getRooms: vi.fn().mockResolvedValue([mockRoom]),
    createRoom: vi.fn().mockResolvedValue(mockRoom),
    getEntitiesForRoom: vi.fn().mockResolvedValue([mockEntity]),

    // Relationship operations
    getRelationships: vi.fn().mockResolvedValue([]),
    saveRelationships: vi.fn().mockResolvedValue(undefined),
    updateRelationship: vi.fn().mockResolvedValue(undefined),
    getRelationshipsByEntityIds: vi.fn().mockResolvedValue([]),

    // Component operations
    getComponents: vi.fn().mockResolvedValue([]),
    createComponent: vi.fn().mockResolvedValue({
      id: stringToUuid('test-component'),
      type: 'test',
      agentId: stringToUuid('test-agent'),
      entityId: stringToUuid('test-entity'),
      roomId: stringToUuid('test-room'),
      worldId: stringToUuid('test-world'),
      sourceEntityId: stringToUuid('test-agent'),
      data: {} as Metadata,
      createdAt: Date.now(),
    }),
    updateComponent: vi.fn().mockResolvedValue(undefined),
    deleteComponent: vi.fn().mockResolvedValue(undefined),

    // Task operations
    getTasks: vi.fn().mockResolvedValue([]),
    getTask: vi.fn().mockResolvedValue(null),
    createTask: vi.fn().mockImplementation((task) => ({
      ...task,
      id: stringToUuid(`task-${Date.now()}`),
      createdAt: Date.now(),
    })),
    updateTask: vi.fn().mockResolvedValue(undefined),
    deleteTask: vi.fn().mockResolvedValue(undefined),

    // Service operations
    getService: vi.fn((name: string) => {
      const services: Record<string, any> = {
        'entity': {
          trackEntity: vi.fn().mockResolvedValue({
            entityId: stringToUuid('test-entity-id'),
            agentId: stringToUuid('test-agent'),
            names: ['Test Entity'],
            type: 'person',
            summary: 'Test entity',
            tags: []
            platforms: {},
            metadata: {},
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          }),
          searchEntities: vi.fn().mockResolvedValue([]),
          getEntity: vi.fn().mockResolvedValue(null),
        },
        'entityGraph': {
          trackEntity: vi.fn().mockResolvedValue({
            entityId: stringToUuid('test-entity-id'),
            agentId: stringToUuid('test-agent'),
            names: ['Test Entity'],
            type: 'person',
            summary: 'Test entity',
            tags: []
            platforms: {},
            metadata: {},
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          }),
          searchEntities: vi.fn().mockResolvedValue([]),
          getEntityRelationships: vi.fn().mockResolvedValue([]),
          analyzeInteraction: vi.fn().mockResolvedValue(null),
        },
        'followup': {
          scheduleFollowUp: vi.fn().mockResolvedValue({
            id: stringToUuid('test-followup-id'),
            entityId: stringToUuid('test-entity-id'),
            message: 'Test follow-up',
            scheduledFor: new Date().toISOString(),
            completed: false,
            metadata: {},
          }),
          getUpcomingFollowUps: vi.fn().mockResolvedValue([]),
          completeFollowUp: vi.fn().mockResolvedValue(undefined),
        },
      };
      return services[name] || null;
    }),

    // Model operations
    useModel: vi.fn((modelType: any, params: any) => {
      // Check if it's a validation prompt
      if (params?.prompt?.toLowerCase().includes('answer only yes or no')) {
        return Promise.resolve('yes');
      }
      // Check if it's a follow-up intent detector
      if (params?.messages && params.messages[0]?.content?.includes('follow-up intent detector')) {
        return Promise.resolve('yes');
      }
      // Default response
      return Promise.resolve('test response');
    }),

    // Settings
    getSetting: vi.fn(),

    // Event operations
    emitEvent: vi.fn().mockResolvedValue(undefined),

    // Other operations
    getParticipantUserState: vi.fn().mockResolvedValue(null),
    setParticipantUserState: vi.fn().mockResolvedValue(undefined),
    composeState: vi.fn().mockResolvedValue({
      values: {},
      data: {},
      text: '',
    }),
    createRelationship: vi.fn().mockImplementation((rel: Relationship) => ({
      ...rel,
      id: rel.id || stringToUuid(`rel-${Date.now()}`),
    })),
    getRoomsForParticipant: vi.fn().mockResolvedValue([stringToUuid('test-room')]),
    getComponent: vi.fn().mockResolvedValue(null),
    getEntitiesByIds: vi.fn().mockResolvedValue([]),
    setCache: vi.fn().mockResolvedValue(undefined),
    getCache: vi.fn().mockResolvedValue(null),
    db: {
      query: vi.fn().mockResolvedValue([]),
      execute: vi.fn().mockResolvedValue({ changes: 1 }),
      getWorlds: vi.fn().mockResolvedValue([]),
      getWorld: vi.fn().mockResolvedValue(null),
    },

    ...overrides,
  } as unknown as IAgentRuntime;
}

export function createMockMemory(overrides?: Partial<Memory>): Memory {
  return {
    id: stringToUuid('test-message'),
    entityId: stringToUuid('test-user'),
    content: {
      text: 'Test message',
    },
    roomId: stringToUuid('test-room'),
    createdAt: Date.now(),
    ...overrides,
  };
}

export function createMockState(overrides?: Partial<State>): State {
  return {
    values: {},
    data: {},
    text: 'Test message',
    agentId: stringToUuid('test-agent'),
    roomId: stringToUuid('test-room'),
    userId: stringToUuid('test-user'),
    messages: []
    memories: []
    goals: []
    facts: []
    knowledge: []
    recentMessages: []
    recentMessagesData: []
    bio: 'Test agent bio',
    senderName: 'Test User',
    ...overrides,
  };
}

export function createMockEntity(name: string, id?: UUID): Entity {
  return {
    id: id || stringToUuid(`entity-${name}`),
    agentId: stringToUuid('test-agent'),
    names: [name],
    metadata: {},
  };
}
