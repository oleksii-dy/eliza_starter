import { pgTable, uuid, primaryKey } from 'drizzle-orm/pg-core';
import { messageServerTable } from './messageServer';
import { agentTable } from './agent';

export const serverAgentsTable = pgTable(
  'server_agents',
  {
    server_id: uuid('server_id')
      .notNull()
      .references(() => messageServerTable.id, { onDelete: 'cascade' }),
    agent_id: uuid('agent_id')
      .notNull()
      .references(() => agentTable.id, { onDelete: 'cascade' }),
  },
  (table) => ({
    pk: primaryKey({ columns: [table.server_id, table.agent_id] }),
  })
);
