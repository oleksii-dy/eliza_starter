import { sql } from 'drizzle-orm';
import { jsonb, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';
import { agentTable } from './agent';
import { entityTable } from './entity';
import { roomTable } from './room';
import { worldTable } from './world';

/**
 * Represents a component table in the database.
 */
export const componentTable = pgTable('components', {
  id: uuid('id').primaryKey().defaultRandom(),

  // Foreign keys
  entity_id: uuid('entity_id')
    .references(() => entityTable.id, { onDelete: 'cascade' })
    .notNull(),
  agent_id: uuid('agent_id')
    .references(() => agentTable.id, { onDelete: 'cascade' })
    .notNull(),
  room_id: uuid('room_id')
    .references(() => roomTable.id, { onDelete: 'cascade' })
    .notNull(),
  world_id: uuid('world_id').references(() => worldTable.id, { onDelete: 'cascade' }),
  source_entity_id: uuid('source_entity_id').references(() => entityTable.id, {
    onDelete: 'cascade',
  }),

  // Data
  type: text('type').notNull(),
  data: jsonb('data').notNull(),

  // Timestamps
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull(),
});
