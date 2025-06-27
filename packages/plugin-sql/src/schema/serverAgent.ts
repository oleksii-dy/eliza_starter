import { getSchemaFactory, createLazyTableProxy } from './factory.js';

/**
 * Lazy-loaded server agents table definition.
 * This function returns the server agents table schema when called,
 * ensuring the database type is set before schema creation.
 */
function createServerAgentsTable() {
  const factory = getSchemaFactory();

  const tableColumns = {
    serverId: factory.text('server_id').notNull(),
    agentId: factory.text('agent_id').notNull(),
  };

  return factory.table('server_agents', tableColumns, (table) => ({
    pk: factory.primaryKey({ columns: [table.serverId, table.agentId] }),
  }));
}

/**
 * Represents a table for storing server-agent associations.
 * Uses lazy initialization to ensure proper database type configuration.
 */
export const serverAgentsTable = createLazyTableProxy(createServerAgentsTable);
