import { getSchemaFactory, createLazyTableProxy } from './factory.js';

/**
 * Lazy-loaded relationship table definition.
 * This function returns the relationship table schema when called,
 * ensuring the database type is set before schema creation.
 * Foreign key references are removed to avoid circular dependencies.
 */
function createRelationshipTable() {
  const factory = getSchemaFactory();

  const tableColumns = {
    id: factory.uuid('id').primaryKey(),
    sourceEntityId: factory.uuid('source_entity_id').notNull(),
    targetEntityId: factory.uuid('target_entity_id').notNull(),
    agentId: factory.uuid('agent_id').notNull(),
    tags: factory.textArray('tags').default([]),
    metadata: factory.json('metadata').default({}),
    createdAt: factory
      .timestamp('created_at', { mode: 'date' })
      .default(factory.defaultTimestamp())
      .notNull(),
    updatedAt: factory
      .timestamp('updated_at', { mode: 'date' })
      .default(factory.defaultTimestamp())
      .notNull(),
    relationshipType: factory.text('relationship_type'),
    strength: factory.integer('strength'),
    lastInteractionAt: factory.timestamp('last_interaction_at', { mode: 'date' }),
    nextFollowUpAt: factory.timestamp('next_follow_up_at', { mode: 'date' }),
  };

  return factory.table('relationships', tableColumns, (table) => ({
    sourceIdx: factory.index('relationships_source_entity_id_idx').on(table.sourceEntityId),
    targetIdx: factory.index('relationships_target_entity_id_idx').on(table.targetEntityId),
    agentIdx: factory.index('relationships_agent_id_idx').on(table.agentId),
  }));
}

/**
 * Represents a table for storing relationship data.
 * Uses lazy initialization to ensure proper database type configuration.
 */
export const relationshipTable = createLazyTableProxy(createRelationshipTable);
