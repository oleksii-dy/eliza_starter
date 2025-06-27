import { getSchemaFactory, createLazyTableProxy } from './factory.js';

/**
 * Lazy-loaded log table definition.
 * This function returns the log table schema when called,
 * ensuring the database type is set before schema creation.
 * Foreign key references are removed to avoid circular dependencies.
 */
function createLogTable() {
  const factory = getSchemaFactory();

  const tableColumns = {
    id: factory.uuid('id').primaryKey(),
    entityId: factory.uuid('entity_id').notNull(),
    roomId: factory.uuid('room_id'),
    agentId: factory.uuid('agent_id').notNull(),
    body: factory.json('body').notNull().default({}),
    type: factory.text('type').notNull(),
    createdAt: factory
      .timestamp('created_at', { mode: 'date' })
      .default(factory.defaultTimestamp())
      .notNull(),
    updatedAt: factory
      .timestamp('updated_at', { mode: 'date' })
      .default(factory.defaultTimestamp())
      .notNull(),
  };

  return factory.table('logs', tableColumns, (table) => ({
    entityIdx: factory.index('logs_entity_id_idx').on(table.entityId),
    roomIdx: factory.index('logs_room_id_idx').on(table.roomId),
    agentIdx: factory.index('logs_agent_id_idx').on(table.agentId),
    typeIdx: factory.index('logs_type_idx').on(table.type),
  }));
}

/**
 * Represents a table for storing log data.
 * Uses lazy initialization to ensure proper database type configuration.
 */
export const logTable = createLazyTableProxy(createLogTable);
