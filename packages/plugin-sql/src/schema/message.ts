import { getSchemaFactory, createLazyTableProxy } from './factory';

/**
 * Lazy-loaded message table definition.
 * This function returns the message table schema when called,
 * ensuring the database type is set before schema creation.
 * Foreign key references are removed to avoid circular dependencies.
 * The database constraints will be enforced at the application level.
 */
function createMessageTable() {
  const factory = getSchemaFactory();

  const tableColumns = {
    id: factory.uuid('id').primaryKey(),
    channelId: factory.uuid('channel_id').notNull(),
    authorId: factory.uuid('author_id').notNull(),
    content: factory.text('content').notNull(),
    rawMessage: factory.json('raw_message'),
    sourceType: factory.text('source_type'),
    sourceId: factory.text('source_id'),
    metadata: factory.json('metadata'),
    inReplyToRootMessageId: factory.uuid('in_reply_to_root_message_id'),
    createdAt: factory
      .timestamp('created_at', { mode: 'date' })
      .default(factory.defaultTimestamp())
      .notNull(),
    updatedAt: factory
      .timestamp('updated_at', { mode: 'date' })
      .default(factory.defaultTimestamp())
      .notNull(),
  };

  return factory.table('messages', tableColumns, (table) => ({
    channelIdx: factory.index('messages_channel_id_idx').on(table.channelId),
    authorIdx: factory.index('messages_author_id_idx').on(table.authorId),
  }));
}

/**
 * Represents a table for storing message data.
 * Uses lazy initialization to ensure proper database type configuration.
 */
export const messageTable = createLazyTableProxy(createMessageTable);
