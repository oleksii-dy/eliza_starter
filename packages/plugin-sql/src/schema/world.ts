import { getSchemaFactory, createLazyTableProxy } from './factory';

/**
 * Lazy-loaded world table definition.
 * This function returns the world table schema when called,
 * ensuring the database type is set before schema creation.
 * Foreign key references are removed to avoid circular dependencies.
 */
function createWorldTable() {
  const factory = getSchemaFactory();

  const tableColumns = {
    id: factory.uuid('id').primaryKey(),
    name: factory.text('name'),
    agentId: factory.uuid('agent_id').notNull(),
    serverId: factory.uuid('server_id').notNull(),
    metadata: factory.json('metadata'),
    createdAt: factory
      .timestamp('created_at', { mode: 'date' })
      .default(factory.defaultTimestamp())
      .notNull(),
    updatedAt: factory
      .timestamp('updated_at', { mode: 'date' })
      .default(factory.defaultTimestamp())
      .notNull(),
  };

  return factory.table('worlds', tableColumns);
}

/**
 * Represents a table for storing world data.
 * Uses lazy initialization to ensure proper database type configuration.
 */
export const worldTable = createLazyTableProxy(createWorldTable);
