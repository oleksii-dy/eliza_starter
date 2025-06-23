import type { TableSchema } from './schema-registry';

/**
 * Core table definitions that are provided by the SQL plugin.
 * These tables form the foundation of the ElizaOS data model.
 */
export const CORE_TABLES: TableSchema[] = [
  {
    name: 'agents',
    pluginName: '@elizaos/plugin-sql',
    sql: `CREATE TABLE IF NOT EXISTS "agents" (
      "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      "created_at" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updated_at" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "name" TEXT NOT NULL,
      "username" TEXT,
      "bio" TEXT NOT NULL,
      "system" TEXT,
      "topics" JSONB DEFAULT '[]',
      "knowledge" JSONB DEFAULT '[]',
      "message_examples" JSONB DEFAULT '[]',
      "post_examples" JSONB DEFAULT '[]',
      "style" JSONB DEFAULT '{}',
      "style_all" JSONB DEFAULT '[]',
      "style_chat" JSONB DEFAULT '[]',
      "style_post" JSONB DEFAULT '[]',
      "enabled" BOOLEAN DEFAULT true,
      "status" TEXT DEFAULT 'active',
      "settings" JSONB DEFAULT '{}',
      "plugins" JSONB DEFAULT '[]'
    )`,
    // Fallback SQL for PGLite (PostgreSQL-compatible syntax)
    fallbackSql: `CREATE TABLE IF NOT EXISTS agents (
      id TEXT PRIMARY KEY,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      name TEXT NOT NULL,
      username TEXT,
      bio TEXT NOT NULL,
      system TEXT,
      topics TEXT DEFAULT '[]',
      knowledge TEXT DEFAULT '[]',
      message_examples TEXT DEFAULT '[]',
      post_examples TEXT DEFAULT '[]',
      style TEXT DEFAULT '{}',
      style_all TEXT DEFAULT '[]',
      style_chat TEXT DEFAULT '[]',
      style_post TEXT DEFAULT '[]',
      enabled BOOLEAN DEFAULT true,
      status TEXT DEFAULT 'active',
      settings TEXT DEFAULT '{}',
      plugins TEXT DEFAULT '[]'
    )`,
  },

  {
    name: 'cache',
    pluginName: '@elizaos/plugin-sql',
    sql: `CREATE TABLE IF NOT EXISTS "cache" (
      "key" TEXT NOT NULL,
      "agent_id" UUID NOT NULL,
      "value" JSONB NOT NULL,
      "created_at" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "expires_at" TIMESTAMP,
      PRIMARY KEY ("key", "agent_id")
    )`,
    // Fallback SQL for PGLite (PostgreSQL-compatible)
    fallbackSql: `CREATE TABLE IF NOT EXISTS cache (
      key TEXT NOT NULL,
      agent_id TEXT NOT NULL,
      value TEXT NOT NULL,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      expires_at TIMESTAMP,
      PRIMARY KEY (key, agent_id)
    )`,
  },

  {
    name: 'entities',
    pluginName: '@elizaos/plugin-sql',
    sql: `CREATE TABLE IF NOT EXISTS "entities" (
      "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      "agent_id" UUID NOT NULL,
      "names" JSONB NOT NULL DEFAULT '[]',
      "metadata" JSONB DEFAULT '{}',
      "created_at" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updated_at" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
    )`,
    // Fallback SQL for PGLite (PostgreSQL-compatible)
    fallbackSql: `CREATE TABLE IF NOT EXISTS entities (
      id TEXT PRIMARY KEY,
      agent_id TEXT NOT NULL,
      names TEXT NOT NULL,
      metadata TEXT,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
    )`,
  },

  {
    name: 'rooms',
    pluginName: '@elizaos/plugin-sql',
    sql: `CREATE TABLE IF NOT EXISTS "rooms" (
      "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      "name" TEXT,
      "agent_id" UUID,
      "source" TEXT NOT NULL,
      "type" TEXT NOT NULL,
      "channel_id" TEXT,
      "server_id" TEXT,
      "world_id" UUID,
      "metadata" JSONB DEFAULT '{}',
      "created_at" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updated_at" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
    )`,
    // Fallback SQL for PGLite (PostgreSQL-compatible)
    fallbackSql: `CREATE TABLE IF NOT EXISTS rooms (
      id TEXT PRIMARY KEY,
      name TEXT,
      agent_id TEXT,
      source TEXT NOT NULL,
      type TEXT NOT NULL,
      channel_id TEXT,
      server_id TEXT,
      world_id TEXT,
      metadata TEXT,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
    )`,
  },

  {
    name: 'memories',
    pluginName: '@elizaos/plugin-sql',
    dependencies: ['entities', 'rooms'], // Depends on entities and rooms tables
    sql: `CREATE TABLE IF NOT EXISTS "memories" (
      "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      "type" TEXT NOT NULL,
      "entity_id" UUID,
      "agent_id" UUID NOT NULL,
      "room_id" UUID,
      "world_id" UUID,
      "content" JSONB NOT NULL,
      "unique" BOOLEAN DEFAULT false,
      "metadata" JSONB DEFAULT '{}',
      "created_at" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
    )`,
    // Fallback SQL for PGLite (PostgreSQL-compatible)
    fallbackSql: `CREATE TABLE IF NOT EXISTS memories (
      id TEXT PRIMARY KEY,
      type TEXT NOT NULL,
      entity_id TEXT,
      agent_id TEXT NOT NULL,
      room_id TEXT,
      world_id TEXT,
      content TEXT NOT NULL,
      "unique" BOOLEAN DEFAULT false,
      metadata JSONB DEFAULT '{}',
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
    )`,
  },

  {
    name: 'embeddings',
    pluginName: '@elizaos/plugin-sql',
    dependencies: ['memories'], // Depends on memories table
    sql: `CREATE TABLE IF NOT EXISTS "embeddings" (
      "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      "memory_id" UUID NOT NULL,
      "dim_384" vector(384),
      "dim_512" vector(512),
      "dim_768" vector(768),
      "dim_1024" vector(1024),
      "dim_1536" vector(1536),
      "dim_3072" vector(3072),
      "created_at" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
    )`,
    // Fallback SQL for PGLite - store embeddings as JSONB if vector extension is not available
    fallbackSql: `CREATE TABLE IF NOT EXISTS embeddings (
      id TEXT PRIMARY KEY,
      memory_id TEXT NOT NULL,
      dim_384 JSONB,
      dim_512 JSONB,
      dim_768 JSONB,
      dim_1024 JSONB,
      dim_1536 JSONB,
      dim_3072 JSONB,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
    )`,
  },

  {
    name: 'relationships',
    pluginName: '@elizaos/plugin-sql',
    dependencies: ['entities'], // Depends on entities table
    sql: `CREATE TABLE IF NOT EXISTS "relationships" (
      "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      "source_entity_id" UUID NOT NULL,
      "target_entity_id" UUID NOT NULL,
      "agent_id" UUID NOT NULL,
      "tags" TEXT[] NOT NULL DEFAULT '{}',
      "metadata" JSONB DEFAULT '{}',
      "created_at" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updated_at" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "relationship_type" TEXT,
      "strength" REAL,
      "last_interaction_at" TIMESTAMP,
      "next_follow_up_at" TIMESTAMP
    )`,
    // Fallback SQL for PGLite
    fallbackSql: `CREATE TABLE IF NOT EXISTS relationships (
      id TEXT PRIMARY KEY,
      source_entity_id TEXT NOT NULL,
      target_entity_id TEXT NOT NULL,
      agent_id TEXT NOT NULL,
      tags TEXT[] NOT NULL DEFAULT '{}',
      metadata TEXT DEFAULT '{}',
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      relationship_type TEXT,
      strength REAL,
      last_interaction_at TIMESTAMP,
      next_follow_up_at TIMESTAMP
    )`,
  },

  {
    name: 'participants',
    pluginName: '@elizaos/plugin-sql',
    dependencies: ['entities', 'rooms'], // Depends on entities and rooms tables
    sql: `CREATE TABLE IF NOT EXISTS "participants" (
      "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      "agent_id" UUID NOT NULL,
      "entity_id" UUID NOT NULL,
      "room_id" UUID NOT NULL,
      "joined_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      "left_at" TIMESTAMP,
      "last_message_read" UUID,
      "user_state" TEXT,
      "created_at" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updated_at" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
    )`,
    // Fallback SQL for PGLite - use TEXT instead of UUID and create composite primary key
    fallbackSql: `CREATE TABLE IF NOT EXISTS participants (
      entity_id TEXT NOT NULL,
      room_id TEXT NOT NULL,
      agent_id TEXT NOT NULL,
      joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      left_at TIMESTAMP,
      last_message_read TEXT,
      user_state TEXT,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (entity_id, room_id)
    )`,
  },

  {
    name: 'worlds',
    pluginName: '@elizaos/plugin-sql',
    sql: `CREATE TABLE IF NOT EXISTS "worlds" (
      "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      "name" TEXT,
      "agent_id" UUID NOT NULL,
      "server_id" TEXT NOT NULL,
      "metadata" JSONB DEFAULT '{}',
      "created_at" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updated_at" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
    )`,
    // Fallback SQL for PGLite
    fallbackSql: `CREATE TABLE IF NOT EXISTS worlds (
      id TEXT PRIMARY KEY,
      name TEXT,
      agent_id TEXT NOT NULL,
      server_id TEXT NOT NULL,
      metadata TEXT DEFAULT '{}',
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
    )`,
  },

  {
    name: 'tasks',
    pluginName: '@elizaos/plugin-sql',
    sql: `CREATE TABLE IF NOT EXISTS "tasks" (
      "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      "name" TEXT NOT NULL,
      "agent_id" UUID NOT NULL,
      "status" TEXT NOT NULL DEFAULT 'new',
      "type" TEXT NOT NULL DEFAULT 'task',
      "created_at" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updated_at" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "metadata" JSONB DEFAULT '{}',
      "description" TEXT,
      "room_id" UUID,
      "world_id" UUID,
      "entity_id" UUID,
      "tags" TEXT[] DEFAULT '{}'
    )`,
    // Fallback SQL for PGLite
    fallbackSql: `CREATE TABLE IF NOT EXISTS tasks (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      agent_id TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'new',
      type TEXT NOT NULL DEFAULT 'task',
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      metadata TEXT DEFAULT '{}',
      description TEXT,
      room_id TEXT,
      world_id TEXT,
      entity_id TEXT,
      tags TEXT[] DEFAULT '{}'
    )`,
  },

  {
    name: 'components',
    pluginName: '@elizaos/plugin-sql',
    dependencies: ['entities', 'rooms'], // Depends on entities and rooms tables
    sql: `CREATE TABLE IF NOT EXISTS "components" (
      "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      "entity_id" UUID NOT NULL,
      "agent_id" UUID NOT NULL,
      "room_id" UUID,
      "world_id" UUID,
      "source_entity_id" UUID,
      "type" TEXT NOT NULL,
      "created_at" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updated_at" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "data" JSONB DEFAULT '{}'
    )`,
    // Fallback SQL for PGLite
    fallbackSql: `CREATE TABLE IF NOT EXISTS components (
      id TEXT PRIMARY KEY,
      entity_id TEXT NOT NULL,
      agent_id TEXT NOT NULL,
      room_id TEXT,
      world_id TEXT,
      source_entity_id TEXT,
      type TEXT NOT NULL,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      data TEXT DEFAULT '{}'
    )`,
  },

  {
    name: 'message_servers',
    pluginName: '@elizaos/plugin-sql',
    sql: `CREATE TABLE IF NOT EXISTS "message_servers" (
      "id" TEXT PRIMARY KEY,
      "name" TEXT NOT NULL,
      "source_type" TEXT NOT NULL,
      "source_id" TEXT,
      "metadata" JSONB DEFAULT '{}',
      "created_at" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updated_at" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
    )`,
  },

  {
    name: 'channels',
    pluginName: '@elizaos/plugin-sql',
    dependencies: ['message_servers'], // Depends on message_servers table
    sql: `CREATE TABLE IF NOT EXISTS "channels" (
      "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      "agent_id" UUID NOT NULL,
      "server_id" UUID NOT NULL,
      "name" TEXT NOT NULL,
      "type" TEXT NOT NULL,
      "metadata" JSONB DEFAULT '{}',
      "created_at" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
    )`,
  },

  {
    name: 'messages',
    pluginName: '@elizaos/plugin-sql',
    dependencies: ['channels'], // Depends on channels table
    sql: `CREATE TABLE IF NOT EXISTS "messages" (
      "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      "channel_id" UUID NOT NULL,
      "author_id" UUID NOT NULL,
      "content" TEXT NOT NULL,
      "raw_message" JSONB,
      "source_type" TEXT,
      "source_id" TEXT,
      "metadata" JSONB,
      "in_reply_to_root_message_id" UUID,
      "created_at" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updated_at" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
    )`,
  },

  {
    name: 'channel_participants',
    pluginName: '@elizaos/plugin-sql',
    dependencies: ['channels'], // Depends on channels table
    sql: `CREATE TABLE IF NOT EXISTS "channel_participants" (
      "channel_id" UUID NOT NULL,
      "user_id" UUID NOT NULL,
      PRIMARY KEY ("channel_id", "user_id")
    )`,
  },

  {
    name: 'server_agents',
    pluginName: '@elizaos/plugin-sql',
    dependencies: ['message_servers'], // Depends on message_servers table
    sql: `CREATE TABLE IF NOT EXISTS "server_agents" (
      "server_id" TEXT NOT NULL,
      "agent_id" TEXT NOT NULL,
      PRIMARY KEY ("server_id", "agent_id")
    )`,
  },

  {
    name: 'logs',
    pluginName: '@elizaos/plugin-sql',
    dependencies: ['entities', 'rooms'], // Depends on entities and rooms tables
    sql: `CREATE TABLE IF NOT EXISTS "logs" (
      "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      "entity_id" UUID NOT NULL,
      "room_id" UUID,
      "agent_id" UUID NOT NULL,
      "body" JSONB NOT NULL DEFAULT '{}',
      "type" TEXT NOT NULL,
      "created_at" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updated_at" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
    )`,
    // Fallback SQL for PGLite (PostgreSQL-compatible)
    fallbackSql: `CREATE TABLE IF NOT EXISTS logs (
      id TEXT PRIMARY KEY,
      entity_id TEXT NOT NULL,
      room_id TEXT,
      agent_id TEXT NOT NULL,
      body TEXT NOT NULL DEFAULT '{}',
      type TEXT NOT NULL,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
    )`,
  },
];
