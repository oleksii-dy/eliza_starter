import { sql } from 'drizzle-orm';
import { getSchemaFactory, createLazyTableProxy } from './factory';

/**
 * Lazy-loaded memory table definition.
 * This function returns the memory table schema when called,
 * ensuring the database type is set before schema creation.
 * Foreign key references are removed to avoid circular dependencies.
 * The database constraints will be enforced at the application level.

 */
function createMemoryTable() {
  const factory = getSchemaFactory();

  return factory.table(
    'memories',
    {
      id: factory.uuid('id').primaryKey().notNull(),
      type: factory.text('type').notNull(),
      createdAt: factory.timestamp('created_at').default(factory.defaultTimestamp()).notNull(),
      content: factory.json('content').notNull(),
      entityId: factory.uuid('entity_id'),
      agentId: factory.uuid('agent_id').notNull(),
      roomId: factory.uuid('room_id'),
      worldId: factory.uuid('world_id'),
      unique: factory.boolean('unique').default(true).notNull(),
      metadata: factory.json('metadata').default(factory.defaultJsonObject()).notNull(),
    },
    (table) => {
      // Use factory methods for database-agnostic constraints
      return [
        factory.index('idx_memories_type_room').on(table.type, table.roomId),
        factory.index('idx_memories_world_id').on(table.worldId),
        factory.index('idx_memories_entity_id').on(table.entityId),
        factory.index('idx_memories_agent_id').on(table.agentId),
        factory.index('idx_memories_room_id').on(table.roomId),
        factory
          .index('idx_memories_metadata_type')
          .on(factory.jsonFieldAccess(table.metadata, 'type')),
        factory
          .index('idx_memories_document_id')
          .on(factory.jsonFieldAccess(table.metadata, 'documentId')),
        factory
          .index('idx_fragments_order')
          .on(
            factory.jsonFieldAccess(table.metadata, 'documentId'),
            factory.jsonFieldAccess(table.metadata, 'position')
          ),
        factory.check(
          'fragment_metadata_check',
          sql`
                CASE 
                    WHEN ${factory.jsonFieldAccess(table.metadata, 'type')} = 'fragment' THEN
                        ${factory.jsonFieldExists(table.metadata, 'documentId')} AND 
                        ${factory.jsonFieldExists(table.metadata, 'position')}
                    ELSE true
                END
            `
        ),
        factory.check(
          'document_metadata_check',
          sql`
                CASE 
                    WHEN ${factory.jsonFieldAccess(table.metadata, 'type')} = 'document' THEN
                        ${factory.jsonFieldExists(table.metadata, 'timestamp')}
                    ELSE true
                END
            `
        ),
      ];
    }
  );
}

/**
 * Represents the memory table in the database.
 * Uses lazy initialization to ensure proper database type configuration.

 */
export const memoryTable = createLazyTableProxy(createMemoryTable);
