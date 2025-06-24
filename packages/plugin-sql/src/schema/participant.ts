import { getSchemaFactory, createLazyTableProxy } from './factory';

/**
 * Lazy-loaded participant table definition.
 * This function returns the participant table schema when called,
 * ensuring the database type is set before schema creation.
 * Foreign key references are removed to avoid circular dependencies.
 * The database constraints will be enforced at the application level.

 */
function createParticipantTable() {
  const factory = getSchemaFactory();

  const tableColumns = {
    entityId: factory.uuid('entity_id').notNull(),
    roomId: factory.uuid('room_id').notNull(),
    agentId: factory.uuid('agent_id').notNull(),
    lastReadAt: factory.timestamp('last_read_at', { mode: 'date' }),
    userState: factory.text('user_state'),
    createdAt: factory.timestamp('created_at', { mode: 'date' })
      .default(factory.defaultTimestamp())
      .notNull(),
    updatedAt: factory.timestamp('updated_at', { mode: 'date' })
      .default(factory.defaultTimestamp())
      .notNull(),
  };

  return factory.table('participants', tableColumns, (table) => ({
    pk: factory.primaryKey({ columns: [table.entityId, table.roomId] }),
    entityIdx: factory.index('participants_entity_id_idx').on(table.entityId),
    roomIdx: factory.index('participants_room_id_idx').on(table.roomId),
    agentIdx: factory.index('participants_agent_id_idx').on(table.agentId),
  }));
}

/**
 * Represents a table for storing participant data.
 * Uses lazy initialization to ensure proper database type configuration.
 */
export const participantTable = createLazyTableProxy(createParticipantTable);
