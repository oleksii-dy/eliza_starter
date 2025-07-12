import { sql } from 'drizzle-orm';
import { foreignKey, index, jsonb, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';
import { agentTable } from './agent';
import { worldTable } from './world';

/**
 * Represents a chat room or communication channel in the database.
 * Rooms can be associated with various platforms (Discord, Telegram, Twitter, etc.)
 * and contain metadata about the channel/room configuration.
 */
export const roomTable = pgTable(
  'rooms',
  {
    id: uuid('id').primaryKey(),
    name: text('name'),
    agent_id: uuid('agent_id')
      .references(() => agentTable.id, { onDelete: 'cascade' })
      .notNull(),
    source: text('source').notNull(),
    type: text('type').notNull(),
    channel_id: text('channel_id'),
    server_id: text('server_id'),
    world_id: uuid('world_id').references(() => worldTable.id, {
      onDelete: 'set null',
    }),
    metadata: jsonb('metadata').default({}).notNull(),
    created_at: timestamp('created_at')
      .notNull()
      .$defaultFn(() => new Date()),
    updated_at: timestamp('updated_at')
      .notNull()
      .$defaultFn(() => new Date()),
  },
  (table) => {
    return [
      index('idx_rooms_agent_id').on(table.agent_id),
      index('idx_rooms_world_id').on(table.world_id),
    ];
  }
);
