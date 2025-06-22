import { getSchemaFactory, createLazyTableProxy } from './factory';

/**
 * Lazy-loaded room table definition.
 * This function returns the room table schema when called,
 * ensuring the database type is set before schema creation.
 * Foreign key references are removed to avoid circular dependencies.
 * The database constraints will be enforced at the application level.
 
 */
function createRoomTable() {
  const factory = getSchemaFactory();
  
  const tableColumns = {
    id: factory.uuid('id').primaryKey(),
    name: factory.text('name'),
    channelId: factory.uuid('channel_id'),
    agentId: factory.uuid('agent_id'),
    serverId: factory.uuid('server_id'),
    worldId: factory.uuid('world_id'),
    type: factory.text('type').notNull(),
    source: factory.text('source').notNull(),
    metadata: factory.json('metadata'),
    createdAt: factory.timestamp('created_at', { mode: 'date' })
      .default(factory.defaultTimestamp())
      .notNull(),
    updatedAt: factory.timestamp('updated_at', { mode: 'date' })
      .default(factory.defaultTimestamp())
      .notNull(),
  };

  return factory.table('rooms', tableColumns);
}

/**
 * Represents a table for storing room data.
 * Uses lazy initialization to ensure proper database type configuration.
 
 */
export const roomTable = createLazyTableProxy(createRoomTable);
