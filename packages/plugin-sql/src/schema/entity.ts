import { getSchemaFactory, createLazyTableProxy } from './factory';

/**
 * Lazy-loaded entity table definition.
 * This function returns the entity table schema when called,
 * ensuring the database type is set before schema creation.
 * Foreign key references are removed to avoid circular dependencies.
 * The database constraints will be enforced at the application level.
 
 */
function createEntityTable() {
  const factory = getSchemaFactory();

  return factory.table(
    'entities',
    {
      id: factory.uuid('id').notNull().primaryKey(),
      agentId: factory.uuid('agent_id').notNull(),
      createdAt: factory.timestamp('created_at').default(factory.defaultTimestamp()).notNull(),
      names: factory.json('names').default(factory.defaultJsonArray()).notNull(),
      metadata: factory.json('metadata').default(factory.defaultJsonObject()).notNull(),
    },
    (table) => {
      // Use factory method for database-agnostic unique constraint
      return {
        idAgentIdUnique: factory.unique('id_agent_id_unique').on(table.id, table.agentId),
        agentIdIndex: factory.index('idx_entities_agent_id').on(table.agentId),
      };
    }
  );
}

/**
 * Represents an entity table in the database.
 * Includes columns for id, agentId, createdAt, names, and metadata.
 */
export const entityTable = createLazyTableProxy(createEntityTable);
