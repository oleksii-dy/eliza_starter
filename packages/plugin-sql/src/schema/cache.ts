import { getSchemaFactory, createLazyTableProxy } from './factory';

/**
 * Lazy-loaded cache table definition.
 * This function returns the cache table schema when called,
 * ensuring the database type is set before schema creation.
 * Foreign key references are removed to avoid circular dependencies.
 * The database constraints will be enforced at the application level.
 
 */
function createCacheTable() {
  const factory = getSchemaFactory();

  // Get the table function from the factory
  const tableFn = factory.table;
  return tableFn(
    'cache',
    {
      key: factory.text('key').notNull(),
      agentId: factory.uuid('agent_id').notNull(),
      value: factory.json('value').notNull(),
      createdAt: factory
        .timestamp('created_at', { withTimezone: true })
        .default(factory.defaultTimestamp())
        .notNull(),
      expiresAt: factory.timestamp('expires_at', { withTimezone: true }),
    },
    (table) => {
      return {
        pk: factory.primaryKey({ columns: [table.key, table.agentId] }),
        agentIdIndex: factory.index('idx_cache_agent_id').on(table.agentId),
      };
    }
  );
}

/**
 * Represents a table for caching data.
 * Uses lazy initialization to ensure proper database type configuration.
 
 */
export const cacheTable = createLazyTableProxy(createCacheTable);
