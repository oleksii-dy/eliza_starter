import { getSchemaFactory, createLazyTableProxy } from './factory';

/**
 * Lazy-loaded channel participants table definition.
 * This function returns the channel participants table schema when called,
 * ensuring the database type is set before schema creation.
 * Foreign key references are removed to avoid circular dependencies.
 * The database constraints will be enforced at the application level.
 */
function createChannelParticipantsTable() {
  const factory = getSchemaFactory();
  
  const tableColumns = {
    channelId: factory.uuid('channel_id').notNull(),
    userId: factory.uuid('user_id').notNull(),
  };

  return factory.table('channel_participants', tableColumns, (table) => ({
    pk: factory.primaryKey({ columns: [table.channelId, table.userId] }),
    channelIdx: factory.index('channel_participants_channel_id_idx').on(table.channelId),
    userIdx: factory.index('channel_participants_user_id_idx').on(table.userId),
  }));
}

/**
 * Represents a table for storing channel participant associations.
 * Uses lazy initialization to ensure proper database type configuration.
 */
export const channelParticipantsTable = createLazyTableProxy(createChannelParticipantsTable);
