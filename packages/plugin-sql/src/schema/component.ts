import { getSchemaFactory, createLazyTableProxy } from './factory.js';

/**
 * Lazy-loaded component table definition.
 * This function returns the component table schema when called,
 * ensuring the database type is set before schema creation.
 * Foreign key references are removed to avoid circular dependencies.
 * The database constraints will be enforced at the application level.

 */
function createComponentTable() {
  const factory = getSchemaFactory();

  return factory.table(
    'components',
    {
      id: factory.uuid('id').primaryKey().notNull(),
      entityId: factory.uuid('entity_id').notNull(),
      agentId: factory.uuid('agent_id').notNull(),
      roomId: factory.uuid('room_id').notNull(),
      worldId: factory.uuid('world_id').notNull(),
      sourceEntityId: factory.uuid('source_entity_id').notNull(),
      type: factory.text('type').notNull(),
      createdAt: factory.timestamp('created_at').default(factory.defaultTimestamp()).notNull(),
      data: factory.json('data').notNull(),
    },
    (table) => {
      return [
        factory.index('idx_components_entity').on(table.entityId),
        factory.index('idx_components_agent').on(table.agentId),
        factory.index('idx_components_room').on(table.roomId),
        factory.index('idx_components_world').on(table.worldId),
        factory.index('idx_components_source_entity').on(table.sourceEntityId),
        factory.index('idx_components_type').on(table.type),
      ];
    }
  );
}

/**
 * Represents a component table in the database.
 * Uses lazy initialization to ensure proper database type configuration.

 */
export const componentTable = createLazyTableProxy(createComponentTable);
