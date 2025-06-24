import { mock  } from 'bun:test';
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
    getMemories: mock().mockResolvedValue([]),
    saveMemory: mock().mockResolvedValue(undefined),
    updateMemory: mock().mockResolvedValue(undefined),

    // Entity operations
    getEntity: mock().mockResolvedValue(mockEntity),
    getEntityById: mock().mockResolvedValue(mockEntity),
    updateEntity: mock().mockResolvedValue(undefined),
    createEntity: mock().mockResolvedValue(mockEntity),

    // Room operations
    getRoom: mock().mockResolvedValue(mockRoom),
    getRooms: mock().mockResolvedValue([mockRoom]),
    createRoom: mock().mockResolvedValue(mockRoom),
    getEntitiesForRoom: mock().mockResolvedValue([mockEntity]),

    // Relationship operations
    getRelationships: mock().mockResolvedValue([]),
    saveRelationships: mock().mockResolvedValue(undefined),
    updateRelationship: mock().mockResolvedValue(undefined),
    getRelationshipsByEntityIds: mock().mockResolvedValue([]),

    // Component operations
    getComponents: mock().mockResolvedValue([]),
    createComponent: mock().mockResolvedValue({
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
    updateComponent: mock().mockResolvedValue(undefined),
    deleteComponent: mock().mockResolvedValue(undefined),

    // Task operations
    getTasks: mock().mockResolvedValue([]),
    getTask: mock().mockResolvedValue(null),
    createTask: mock().mockImplementation((task) => ({
      ...task,
      id: stringToUuid(`task-${Date.now()}`),
      createdAt: Date.now(),
    })),
    updateTask: mock().mockResolvedValue(undefined),
    deleteTask: mock().mockResolvedValue(undefined),

    // Service operations
    getService: mock((name: string) => {
      const services: Record<string, any> = {
        entity: {
          trackEntity: mock().mockResolvedValue({
            entityId: stringToUuid('test-entity-id'),
            agentId: stringToUuid('test-agent'),
            names: ['Test Entity'],
            type: 'person',
            summary: 'Test entity',
            tags: [],
            platforms: {},
            metadata: {},
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          }),
          searchEntities: mock().mockResolvedValue([]),
          getEntity: mock().mockResolvedValue(null),
        },
        entityGraph: {
          trackEntity: mock().mockResolvedValue({
            entityId: stringToUuid('test-entity-id'),
            agentId: stringToUuid('test-agent'),
            names: ['Test Entity'],
            type: 'person',
            summary: 'Test entity',
            tags: [],
            platforms: {},
            metadata: {},
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          }),
          searchEntities: mock().mockResolvedValue([]),
          getEntityRelationships: mock().mockResolvedValue([]),
          analyzeInteraction: mock().mockResolvedValue(null),
        },
        followup: {
          scheduleFollowUp: mock().mockResolvedValue({
            id: stringToUuid('test-followup-id'),
            entityId: stringToUuid('test-entity-id'),
            message: 'Test follow-up',
            scheduledFor: new Date().toISOString(),
            completed: false,
            metadata: {},
          }),
          getUpcomingFollowUps: mock().mockResolvedValue([]),
          completeFollowUp: mock().mockResolvedValue(undefined),
        },
      };
      return services[name] || null;
    }),

    // Model operations
    useModel: mock((modelType: any, params: any) => {
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
    getSetting: mock(),

    // Event operations
    emitEvent: mock().mockResolvedValue(undefined),

    // Other operations
    getParticipantUserState: mock().mockResolvedValue(null),
    setParticipantUserState: mock().mockResolvedValue(undefined),
    composeState: mock().mockResolvedValue({
      values: {},
      data: {},
      text: '',
    }),
    createRelationship: mock().mockImplementation((rel: Relationship) => ({
      ...rel,
      id: rel.id || stringToUuid(`rel-${Date.now()}`),
    })),
    getRoomsForParticipant: mock().mockResolvedValue([stringToUuid('test-room')]),
    getComponent: mock().mockResolvedValue(null),
    getEntitiesByIds: mock().mockResolvedValue([]),
    setCache: mock().mockResolvedValue(undefined),
    getCache: mock().mockResolvedValue(null),
    db: {
      query: mock().mockResolvedValue([]),
      execute: mock().mockResolvedValue({ changes: 1 }),
      getWorlds: mock().mockResolvedValue([]),
      getWorld: mock().mockResolvedValue(null),
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
    messages: [],
    memories: [],
    goals: [],
    facts: [],
    knowledge: [],
    recentMessages: [],
    recentMessagesData: [],
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
