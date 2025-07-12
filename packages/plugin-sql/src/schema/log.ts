import { sql } from 'drizzle-orm';
import { foreignKey, index, jsonb, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';
import { agentTable } from './agent';
import { entityTable } from './entity';
import { roomTable } from './room';

/**
 * Definition of the logs table in the database.
 * Logs store event information and debugging data for system operations.
 */
export const logTable = pgTable(
  'logs',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    entity_id: uuid('entity_id')
      .references(() => entityTable.id, { onDelete: 'cascade' })
      .notNull(),
    room_id: uuid('room_id').references(() => roomTable.id, { onDelete: 'cascade' }),
    agent_id: uuid('agent_id')
      .references(() => agentTable.id, { onDelete: 'cascade' })
      .notNull(),
    body: jsonb('body').notNull().default({}),
    type: text('type').notNull(),
    created_at: timestamp('created_at')
      .notNull()
      .$defaultFn(() => new Date()),
    updated_at: timestamp('updated_at')
      .notNull()
      .$defaultFn(() => new Date()),
  },
  (table) => [
    index('idx_logs_entity_id').on(table.entity_id),
    index('idx_logs_room_id').on(table.room_id),
    index('idx_logs_agent_id').on(table.agent_id),
    index('idx_logs_type').on(table.type),
  ]
);
