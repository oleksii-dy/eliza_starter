import { sql } from 'drizzle-orm';
import { jsonb, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';
import { agentTable } from './agent';

/**
 * Represents a table schema for worlds in the database.
 *
 * @type {PgTable}
 */

export const worldTable = pgTable('worlds', {
  id: uuid('id')
    .notNull()
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  agent_id: uuid('agent_id')
    .notNull()
    .references(() => agentTable.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  metadata: jsonb('metadata'),
  server_id: text('server_id').notNull().default('local'),
  created_at: timestamp('created_at')
    .notNull()
    .$defaultFn(() => new Date()),
  updated_at: timestamp('updated_at')
    .notNull()
    .$defaultFn(() => new Date()),
});
