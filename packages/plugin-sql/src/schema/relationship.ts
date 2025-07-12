import { sql } from 'drizzle-orm';
import {
  foreignKey,
  index,
  jsonb,
  pgTable,
  text,
  timestamp,
  unique,
  uuid,
} from 'drizzle-orm/pg-core';
import { agentTable } from './agent';
import { entityTable } from './entity';

/**
 * Defines the relationshipTable containing information about relationships between entities and agents.
 * @type {import('knex').TableBuilder}
 */
export const relationshipTable = pgTable(
  'relationships',
  {
    id: uuid('id')
      .notNull()
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .$defaultFn(() => new Date()),
    source_entity_id: uuid('source_entity_id')
      .notNull()
      .references(() => entityTable.id, { onDelete: 'cascade' }),
    target_entity_id: uuid('target_entity_id')
      .notNull()
      .references(() => entityTable.id, { onDelete: 'cascade' }),
    agent_id: uuid('agent_id')
      .notNull()
      .references(() => agentTable.id, { onDelete: 'cascade' }),
    tags: text('tags').array(),
    metadata: jsonb('metadata'),
  },
  (table) => [
    index('idx_relationships_users').on(table.source_entity_id, table.target_entity_id),
    unique('unique_relationship').on(
      table.source_entity_id,
      table.target_entity_id,
      table.agent_id
    ),
    foreignKey({
      name: 'fk_user_a',
      columns: [table.source_entity_id],
      foreignColumns: [entityTable.id],
    }).onDelete('cascade'),
    foreignKey({
      name: 'fk_user_b',
      columns: [table.target_entity_id],
      foreignColumns: [entityTable.id],
    }).onDelete('cascade'),
  ]
);
