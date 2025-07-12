import { sql } from 'drizzle-orm';
import { jsonb, pgTable, text, primaryKey, timestamp, uuid } from 'drizzle-orm/pg-core';
import { agentTable } from './agent';

/**
 * Represents a PostgreSQL table for caching data.
 *
 * @type {pgTable}
 */
export const cacheTable = pgTable(
  'cache',
  {
    key: text('key').notNull(),
    agent_id: uuid('agent_id')
      .notNull()
      .references(() => agentTable.id, { onDelete: 'cascade' }),
    value: jsonb('value').notNull(),
    created_at: timestamp('created_at', { withTimezone: true })
      .notNull()
      .$defaultFn(() => new Date()),
    expires_at: timestamp('expires_at', { withTimezone: true }),
  },
  (table) => ({
    pk: primaryKey({ columns: [table.key, table.agent_id] }),
  })
);
