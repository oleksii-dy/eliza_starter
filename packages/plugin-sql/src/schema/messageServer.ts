import { getSchemaFactory, createLazyTableProxy } from './factory.js';

/**
 * Lazy-loaded message server table definition.
 * This function returns the message server table schema when called,
 * ensuring the database type is set before schema creation.
 */
function createMessageServerTable() {
  const factory = getSchemaFactory();

  return factory.table('message_servers', {
    id: factory.text('id').primaryKey(), // UUID stored as text
    name: factory.text('name').notNull(),
    sourceType: factory.text('source_type').notNull(),
    sourceId: factory.text('source_id'),
    metadata: factory.json('metadata'),
    createdAt: factory
      .timestamp('created_at', { mode: 'date' })
      .default(factory.defaultTimestamp())
      .notNull(),
    updatedAt: factory
      .timestamp('updated_at', { mode: 'date' })
      .default(factory.defaultTimestamp())
      .notNull(),
  });
}

/**
 * Represents the message server table in the database.
 * Uses lazy initialization to ensure proper database type configuration.
 */
export const messageServerTable = createLazyTableProxy(createMessageServerTable);
