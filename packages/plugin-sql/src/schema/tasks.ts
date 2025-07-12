import { jsonb, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { agentTable } from './agent';

/**
 * Represents a table schema for tasks in the database.
 *
 * @type {PgTable}
 */
export const taskTable = pgTable('tasks', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull(),
  description: text('description'),
  room_id: uuid('room_id'),
  world_id: uuid('world_id'),
  entity_id: uuid('entity_id'),
  agent_id: uuid('agent_id')
    .notNull()
    .references(() => agentTable.id, { onDelete: 'cascade' }),
  tags: text('tags')
    .array()
    .default(sql`'{}'::text[]`),
  metadata: jsonb('metadata').default(sql`'{}'::jsonb`),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
});
