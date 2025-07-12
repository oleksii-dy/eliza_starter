import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';
import { sql } from 'drizzle-orm';
import { v4 } from 'uuid';

// Agent table
export const agentTable = sqliteTable('agents', {
  id: text('id').primaryKey(),
  created_at: text('created_at')
    .notNull()
    .default(sql`(datetime('now'))`),
  updated_at: text('updated_at')
    .notNull()
    .default(sql`(datetime('now'))`),
  name: text('name').notNull(),
  username: text('username'),
  bio: text('bio').notNull(),
  system: text('system'),
  topics: text('topics').default('[]'),
  knowledge: text('knowledge').default('[]'),
  message_examples: text('message_examples').default('[]'),
  post_examples: text('post_examples').default('[]'),
  style: text('style').default('{}'),
  enabled: integer('enabled', { mode: 'boolean' }).default(true),
  status: text('status').default('active'),
  settings: text('settings').default('{}'),
  plugins: text('plugins').default('[]'),
});

// Cache table
export const cacheTable = sqliteTable('cache', {
  key: text('key').primaryKey(),
  agent_id: text('agent_id').notNull(),
  value: text('value').notNull(),
  created_at: text('created_at')
    .notNull()
    .default(sql`(datetime('now'))`),
  expires_at: text('expires_at'),
});

// Entity table
export const entityTable = sqliteTable('entities', {
  id: text('id').primaryKey(),
  agent_id: text('agent_id').notNull(),
  names: text('names').notNull().default('[]'),
  metadata: text('metadata').default('{}'),
  created_at: text('created_at')
    .notNull()
    .default(sql`(datetime('now'))`),
  updated_at: text('updated_at')
    .notNull()
    .default(sql`(datetime('now'))`),
});

// Room table
export const roomTable = sqliteTable('rooms', {
  id: text('id').primaryKey(),
  name: text('name'),
  agent_id: text('agent_id'),
  source: text('source').notNull(),
  type: text('type').notNull(),
  channel_id: text('channel_id'),
  server_id: text('server_id'),
  world_id: text('world_id'),
  metadata: text('metadata').default('{}'),
  created_at: text('created_at')
    .notNull()
    .default(sql`(datetime('now'))`),
  updated_at: text('updated_at')
    .notNull()
    .default(sql`(datetime('now'))`),
});

// Memory table
export const memoryTable = sqliteTable('memories', {
  id: text('id').primaryKey(),
  type: text('type').notNull(),
  entity_id: text('entity_id'),
  agent_id: text('agent_id').notNull(),
  room_id: text('room_id'),
  world_id: text('world_id'),
  content: text('content').notNull(),
  unique: integer('unique', { mode: 'boolean' }).default(false),
  metadata: text('metadata').default('{}'),
  embedding: text('embedding'), // JSON storage for embeddings when sqlite-vec not available
  created_at: text('created_at')
    .notNull()
    .default(sql`(datetime('now'))`),
});

// Embedding table (stores vectors as JSON)
export const embeddingTable = sqliteTable('embeddings', {
  id: text('id').primaryKey(),
  memory_id: text('memory_id').notNull(),
  dim_384: text('dim_384'),
  dim_512: text('dim_512'),
  dim_768: text('dim_768'),
  dim_1024: text('dim_1024'),
  dim_1536: text('dim_1536'),
  dim_3072: text('dim_3072'),
  created_at: text('created_at')
    .notNull()
    .default(sql`(datetime('now'))`),
});

// Relationship table
export const relationshipTable = sqliteTable('relationships', {
  id: text('id').primaryKey(),
  source_entity_id: text('source_entity_id').notNull(),
  target_entity_id: text('target_entity_id').notNull(),
  agent_id: text('agent_id').notNull(),
  tags: text('tags').notNull().default('[]'),
  metadata: text('metadata').default('{}'),
  created_at: text('created_at')
    .notNull()
    .default(sql`(datetime('now'))`),
  updated_at: text('updated_at')
    .notNull()
    .default(sql`(datetime('now'))`),
  relationship_type: text('relationship_type'),
  strength: integer('strength'),
  last_interaction_at: text('last_interaction_at'),
  next_follow_up_at: text('next_follow_up_at'),
});

// Participant table
export const participantTable = sqliteTable('participants', {
  id: text('id')
    .primaryKey()
    .$defaultFn(() => v4()),
  entity_id: text('entity_id').notNull(),
  room_id: text('room_id').notNull(),
  agent_id: text('agent_id').notNull(),
  room_state: text('room_state'), // Changed from user_state to match PostgreSQL schema
  created_at: text('created_at')
    .notNull()
    .default(sql`(datetime('now'))`),
  updated_at: text('updated_at')
    .notNull()
    .default(sql`(datetime('now'))`),
});

// World table
export const worldTable = sqliteTable('worlds', {
  id: text('id').primaryKey(),
  name: text('name'),
  agent_id: text('agent_id').notNull(),
  server_id: text('server_id').notNull(),
  metadata: text('metadata').default('{}'),
  created_at: text('created_at')
    .notNull()
    .default(sql`(datetime('now'))`),
  updated_at: text('updated_at')
    .notNull()
    .default(sql`(datetime('now'))`),
});

// Task table
export const tasksTable = sqliteTable('tasks', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  agent_id: text('agent_id').notNull(),
  status: text('status').notNull().default('new'),
  type: text('type').notNull().default('task'),
  created_at: text('created_at')
    .notNull()
    .default(sql`(datetime('now'))`),
  updated_at: text('updated_at')
    .notNull()
    .default(sql`(datetime('now'))`),
  metadata: text('metadata').default('{}'),
  description: text('description'),
  room_id: text('room_id'),
  world_id: text('world_id'),
  entity_id: text('entity_id'),
  tags: text('tags').default('[]'),
});

// Component table
export const componentTable = sqliteTable('components', {
  id: text('id').primaryKey(),
  entity_id: text('entity_id').notNull(),
  agent_id: text('agent_id').notNull(),
  room_id: text('room_id'),
  world_id: text('world_id'),
  source_entity_id: text('source_entity_id'),
  type: text('type').notNull(),
  created_at: text('created_at')
    .notNull()
    .default(sql`(datetime('now'))`),
  updated_at: text('updated_at')
    .notNull()
    .default(sql`(datetime('now'))`),
  data: text('data').default('{}'),
});

// Log table
export const logTable = sqliteTable('logs', {
  id: text('id').primaryKey(),
  entity_id: text('entity_id').notNull(),
  room_id: text('room_id'),
  agent_id: text('agent_id').notNull(),
  body: text('body').notNull().default('{}'),
  type: text('type').notNull(),
  created_at: text('created_at')
    .notNull()
    .default(sql`(datetime('now'))`),
  updated_at: text('updated_at')
    .notNull()
    .default(sql`(datetime('now'))`),
});

// Message server table
export const messageServerTable = sqliteTable('message_servers', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  source_type: text('source_type').notNull(),
  source_id: text('source_id'),
  metadata: text('metadata').default('{}'),
  created_at: text('created_at')
    .notNull()
    .default(sql`(datetime('now'))`),
  updated_at: text('updated_at')
    .notNull()
    .default(sql`(datetime('now'))`),
});

// Channel table
export const channelTable = sqliteTable('channels', {
  id: text('id').primaryKey(),
  server_id: text('server_id').notNull(),
  created_at: text('created_at')
    .notNull()
    .default(sql`(datetime('now'))`),
  updated_at: text('updated_at')
    .notNull()
    .default(sql`(datetime('now'))`),
  name: text('name').notNull(),
  type: text('type').notNull(),
  source_type: text('source_type'),
  source_id: text('source_id'),
  topic: text('topic'),
  metadata: text('metadata').default('{}'),
});

// Message table
export const messageTable = sqliteTable('messages', {
  id: text('id').primaryKey(),
  channel_id: text('channel_id').notNull(),
  author_id: text('author_id').notNull(),
  content: text('content').notNull(),
  raw_message: text('raw_message'),
  source_type: text('source_type'),
  source_id: text('source_id'),
  metadata: text('metadata'),
  in_reply_to_root_message_id: text('in_reply_to_root_message_id'),
  created_at: text('created_at')
    .notNull()
    .default(sql`(datetime('now'))`),
  updated_at: text('updated_at')
    .notNull()
    .default(sql`(datetime('now'))`),
});

// Channel participants table
export const channelParticipantsTable = sqliteTable('channel_participants', {
  channel_id: text('channel_id').notNull(),
  user_id: text('user_id').notNull(),
});

// Server agents table
export const serverAgentsTable = sqliteTable('server_agents', {
  server_id: text('server_id').notNull(),
  agent_id: text('agent_id').notNull(),
});

// Todos table (from plugin-todo)
export const todosTable = sqliteTable('todos', {
  id: text('id')
    .primaryKey()
    .$defaultFn(() => v4()),
  agent_id: text('agent_id').notNull(),
  world_id: text('world_id').notNull(),
  room_id: text('room_id').notNull(),
  entity_id: text('entity_id').notNull(),
  name: text('name').notNull(),
  description: text('description'),
  type: text('type').notNull(),
  priority: integer('priority').default(4),
  is_urgent: integer('is_urgent', { mode: 'boolean' }).default(false),
  is_completed: integer('is_completed', { mode: 'boolean' }).default(false),
  due_date: text('due_date'),
  completed_at: text('completed_at'),
  created_at: text('created_at')
    .notNull()
    .default(sql`(datetime('now'))`),
  updated_at: text('updated_at')
    .notNull()
    .default(sql`(datetime('now'))`),
  metadata: text('metadata').default('{}'),
});

// Todo tags table (from plugin-todo)
export const todoTagsTable = sqliteTable('todo_tags', {
  id: text('id')
    .primaryKey()
    .$defaultFn(() => v4()),
  todo_id: text('todo_id').notNull(),
  tag: text('tag').notNull(),
  created_at: text('created_at')
    .notNull()
    .default(sql`(datetime('now'))`),
});

// Goals table (from plugin-goals)
export const goalsTable = sqliteTable('goals', {
  id: text('id')
    .primaryKey()
    .$defaultFn(() => v4()),
  agent_id: text('agent_id').notNull(),
  owner_type: text('owner_type').notNull(),
  owner_id: text('owner_id').notNull(),
  name: text('name').notNull(),
  description: text('description'),
  is_completed: integer('is_completed', { mode: 'boolean' }).default(false),
  completed_at: text('completed_at'),
  created_at: text('created_at')
    .notNull()
    .default(sql`(datetime('now'))`),
  updated_at: text('updated_at')
    .notNull()
    .default(sql`(datetime('now'))`),
  metadata: text('metadata').default('{}'),
});

// Goal tags table (from plugin-goals)
export const goalTagsTable = sqliteTable('goal_tags', {
  id: text('id')
    .primaryKey()
    .$defaultFn(() => v4()),
  goal_id: text('goal_id').notNull(),
  tag: text('tag').notNull(),
  created_at: text('created_at')
    .notNull()
    .default(sql`(datetime('now'))`),
});

// NOTE: Trust plugin tables are now dynamically created by plugin-trust schema
// via the dynamic migrator - removed hardcoded trust table definitions

// NOTE: All table schemas are defined locally above for SQLite compatibility.
// We do NOT export any tables from the main schema to avoid conflicts.
// The SQLite adapter uses the table definitions above which are optimized
// for SQLite's type system (TEXT instead of UUID, etc.)
