import { sql } from 'drizzle-orm';
import { index, jsonb, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';
import { agentTable } from './agent';

/**
 * Definition of the entities table in the database.
 * Entities represent various actors or objects that can interact within the system.
 * They can be users, AI agents, or other types of entities with metadata.
 */
export const entityTable = pgTable(
  'entities',
  {
    id: uuid('id').primaryKey().notNull(),
    agent_id: uuid('agent_id')
      .references(() => agentTable.id, { onDelete: 'cascade' })
      .notNull(),
    names: jsonb('names').$type<string[]>().notNull().default([]),
    metadata: jsonb('metadata').default({}),
    created_at: timestamp('created_at')
      .notNull()
      .$defaultFn(() => new Date()),
    updated_at: timestamp('updated_at')
      .notNull()
      .$defaultFn(() => new Date()),
  },
  (table) => [
    index('idx_entities_agent_id').on(table.agent_id),
    index('idx_entities_names').on(table.names),
  ]
);

export default entityTable;
