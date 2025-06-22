import {
  pgTable,
  text,
  uuid,
  timestamp,
  jsonb,
  boolean,
  integer,
  index,
  uniqueIndex,
  vector,
} from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';

// Agents table
export const agentsTable = pgTable('agents', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull(),
  email: text('email'),
  avatar: text('avatar'),
  metadata: jsonb('metadata').default('{}').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// Cache table
export const cacheTable = pgTable('cache', {
  id: uuid('id').primaryKey().defaultRandom(),
  key: text('key').notNull().unique(),
  entityId: uuid('entity_id'),
  value: text('value').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  expiresAt: timestamp('expires_at'),
});

// Memories table
export const memoriesTable = pgTable(
  'memories',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    entityId: uuid('entity_id').notNull(),
    agentId: uuid('agent_id').notNull(),
    roomId: uuid('room_id').notNull(),
    worldId: uuid('world_id'),
    content: jsonb('content').notNull(),
    embedding: vector('embedding', { dimensions: 1536 }),
    metadata: jsonb('metadata').default('{}').notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => ({
    entityIdIdx: index('idx_memories_entity').on(table.entityId),
    agentIdIdx: index('idx_memories_agent').on(table.agentId),
    roomIdIdx: index('idx_memories_room').on(table.roomId),
    worldIdIdx: index('idx_memories_world').on(table.worldId),
    uniqueMemory: uniqueIndex('unique_memory').on(table.entityId, table.content),
  })
);

// Entities table
export const entitiesTable = pgTable('entities', {
  id: uuid('id').primaryKey().defaultRandom(),
  agentId: uuid('agent_id').notNull(),
  names: jsonb('names').notNull(),
  metadata: jsonb('metadata').default('{}').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// Relationships table
export const relationshipsTable = pgTable(
  'relationships',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    sourceEntityId: uuid('source_entity_id').notNull(),
    targetEntityId: uuid('target_entity_id').notNull(),
    tags: jsonb('tags').default('[]').notNull(),
    metadata: jsonb('metadata').default('{}').notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (table) => ({
    sourceIdx: index('idx_relationships_source').on(table.sourceEntityId),
    targetIdx: index('idx_relationships_target').on(table.targetEntityId),
    uniqueRelationship: uniqueIndex('unique_relationship').on(
      table.sourceEntityId,
      table.targetEntityId
    ),
  })
);

// Embeddings table
export const embeddingsTable = pgTable('embeddings', {
  id: text('id').primaryKey(),
  memoryId: text('memory_id').notNull(),
  embedding384: vector('embedding_384', { dimensions: 384 }),
  embedding768: vector('embedding_768', { dimensions: 768 }),
  embedding1024: vector('embedding_1024', { dimensions: 1024 }),
  embedding1536: vector('embedding_1536', { dimensions: 1536 }),
  embedding3072: vector('embedding_3072', { dimensions: 3072 }),
  createdAt: text('created_at')
    .default(sql`CURRENT_TIMESTAMP`)
    .notNull(),
});

// Logs table
export const logsTable = pgTable('logs', {
  id: text('id').primaryKey(),
  entityId: text('entity_id').notNull(),
  roomId: text('room_id'),
  agentId: text('agent_id').notNull(),
  body: text('body').notNull().default('{}'),
  type: text('type').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// Rooms table
export const roomsTable = pgTable(
  'rooms',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    name: text('name').notNull(),
    channelId: text('channel_id'),
    agentId: uuid('agent_id'),
    serverId: text('server_id'),
    worldId: uuid('world_id'),
    type: text('type'),
    source: text('source'),
    metadata: jsonb('metadata').default('{}').notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (table) => ({
    agentIdIdx: index('idx_rooms_agent').on(table.agentId),
    worldIdIdx: index('idx_rooms_world').on(table.worldId),
  })
);

// Participants table
export const participantsTable = pgTable(
  'participants',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    entityId: uuid('entity_id').notNull(),
    roomId: uuid('room_id').notNull(),
    userState: text('user_state'),
    metadata: jsonb('metadata').default('{}').notNull(),
    lastActiveAt: timestamp('last_active_at').defaultNow().notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => ({
    entityIdIdx: index('idx_participants_entity').on(table.entityId),
    roomIdIdx: index('idx_participants_room').on(table.roomId),
    uniqueParticipant: uniqueIndex('unique_participant').on(table.entityId, table.roomId),
  })
);

// Worlds table
export const worldsTable = pgTable('worlds', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull(),
  serverId: text('server_id'),
  metadata: jsonb('metadata').default('{}').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// Tasks table
export const tasksTable = pgTable(
  'tasks',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    name: text('name').notNull(),
    agentId: uuid('agent_id').notNull(),
    entityId: uuid('entity_id'),
    roomId: uuid('room_id'),
    status: text('status').notNull(),
    type: text('type').notNull(),
    tags: jsonb('tags').default('[]').notNull(),
    metadata: jsonb('metadata').default('{}').notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (table) => ({
    agentIdIdx: index('idx_tasks_agent').on(table.agentId),
    entityIdIdx: index('idx_tasks_entity').on(table.entityId),
    roomIdIdx: index('idx_tasks_room').on(table.roomId),
    statusIdx: index('idx_tasks_status').on(table.status),
  })
);

// Components table
export const componentsTable = pgTable(
  'components',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    entityId: uuid('entity_id').notNull(),
    sourceEntityId: uuid('source_entity_id'),
    worldId: uuid('world_id'),
    type: text('type').notNull(),
    data: jsonb('data').notNull(),
    metadata: jsonb('metadata').default('{}').notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (table) => ({
    entityIdIdx: index('idx_components_entity').on(table.entityId),
    sourceEntityIdIdx: index('idx_components_source').on(table.sourceEntityId),
    worldIdIdx: index('idx_components_world').on(table.worldId),
    typeIdx: index('idx_components_type').on(table.type),
    uniqueComponent: uniqueIndex('unique_component').on(
      table.entityId,
      table.type,
      table.worldId,
      table.sourceEntityId
    ),
  })
);

// Message servers table
export const messageServersTable = pgTable('message_servers', {
  id: uuid('id').primaryKey().defaultRandom(),
  serverId: text('server_id').notNull().unique(),
  serverName: text('server_name').notNull(),
  platform: text('platform').notNull(),
  metadata: jsonb('metadata').default('{}').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// Channels table
export const channelsTable = pgTable(
  'channels',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    channelId: text('channel_id').notNull(),
    serverId: text('server_id').notNull(),
    channelName: text('channel_name').notNull(),
    metadata: jsonb('metadata').default('{}').notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (table) => ({
    serverIdIdx: index('idx_channels_server').on(table.serverId),
    uniqueChannel: uniqueIndex('unique_channel').on(table.channelId, table.serverId),
  })
);

// Messages table
export const messagesTable = pgTable(
  'messages',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    messageId: text('message_id').notNull(),
    channelId: text('channel_id').notNull(),
    serverId: text('server_id').notNull(),
    authorId: text('author_id').notNull(),
    authorName: text('author_name').notNull(),
    content: text('content').notNull(),
    metadata: jsonb('metadata').default('{}').notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => ({
    channelIdIdx: index('idx_messages_channel').on(table.channelId),
    serverIdIdx: index('idx_messages_server').on(table.serverId),
    authorIdIdx: index('idx_messages_author').on(table.authorId),
    uniqueMessage: uniqueIndex('unique_message').on(
      table.messageId,
      table.channelId,
      table.serverId
    ),
  })
);

// Channel participants table
export const channelParticipantsTable = pgTable(
  'channel_participants',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    channelId: text('channel_id').notNull(),
    serverId: text('server_id').notNull(),
    userId: text('user_id').notNull(),
    userName: text('user_name').notNull(),
    role: text('role'),
    metadata: jsonb('metadata').default('{}').notNull(),
    joinedAt: timestamp('joined_at').defaultNow().notNull(),
    lastActiveAt: timestamp('last_active_at').defaultNow().notNull(),
  },
  (table) => ({
    channelIdIdx: index('idx_channel_participants_channel').on(table.channelId),
    serverIdIdx: index('idx_channel_participants_server').on(table.serverId),
    userIdIdx: index('idx_channel_participants_user').on(table.userId),
    uniqueParticipant: uniqueIndex('unique_channel_participant').on(
      table.channelId,
      table.serverId,
      table.userId
    ),
  })
);

// Server agents table
export const serverAgentsTable = pgTable(
  'server_agents',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    serverId: text('server_id').notNull(),
    agentId: uuid('agent_id').notNull(),
    isActive: boolean('is_active').default(true).notNull(),
    metadata: jsonb('metadata').default('{}').notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (table) => ({
    serverIdIdx: index('idx_server_agents_server').on(table.serverId),
    agentIdIdx: index('idx_server_agents_agent').on(table.agentId),
    uniqueServerAgent: uniqueIndex('unique_server_agent').on(table.serverId, table.agentId),
  })
);

// Export the core schema
export const coreSchema = {
  agents: agentsTable,
  cache: cacheTable,
  memories: memoriesTable,
  entities: entitiesTable,
  relationships: relationshipsTable,
  embeddings: embeddingsTable,
  logs: logsTable,
  rooms: roomsTable,
  participants: participantsTable,
  worlds: worldsTable,
  tasks: tasksTable,
  components: componentsTable,
  messageServers: messageServersTable,
  channels: channelsTable,
  messages: messagesTable,
  channelParticipants: channelParticipantsTable,
  serverAgents: serverAgentsTable,
};

export default coreSchema;
