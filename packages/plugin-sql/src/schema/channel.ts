import { getSchemaFactory, createLazyTableProxy } from './factory';

/**
 * Lazy-loaded channel table definition.
 * This function returns the channel table schema when called,
 * ensuring the database type is set before schema creation.
 * Foreign key references are removed to avoid circular dependencies.
 * The database constraints will be enforced at the application level.
 
 */
function createChannelTable() {
  const factory = getSchemaFactory();

  return factory.table('channels', {
    id: factory.uuid('id').primaryKey().notNull(),
    serverId: factory.uuid('server_id').notNull(),
    createdAt: factory.timestamp('created_at').notNull().default(factory.defaultTimestamp()),
    updatedAt: factory.timestamp('updated_at').notNull().default(factory.defaultTimestamp()),
    name: factory.text('name').notNull(),
    type: factory.text('type').notNull(),
    sourceType: factory.text('source_type'),
    sourceId: factory.text('source_id'),
    topic: factory.text('topic'),
    metadata: factory.json('metadata').default(factory.defaultJsonObject()).notNull(),
  });
}

/**
 * Represents a channel table in the database.
 * Uses lazy initialization to ensure proper database type configuration.
 
 */
export const channelTable = createLazyTableProxy(createChannelTable);
