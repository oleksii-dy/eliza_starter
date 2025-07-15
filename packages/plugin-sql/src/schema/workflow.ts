import { jsonb, pgTable, text, timestamp, uuid, varchar, integer } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { agentTable } from './agent';

/**
 * Represents a table schema for workflows in the database.
 *
 * @type {PgTable}
 */
export const workflowTable = pgTable('workflows', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull(),
  description: text('description'),
  agentId: uuid('agent_id')
    .notNull()
    .references(() => agentTable.id, { onDelete: 'cascade' }),
  status: varchar('status', { length: 20 }).notNull().default('DRAFT'),
  version: integer('version').notNull().default(1),
  triggers: jsonb('triggers').notNull().default(sql`'[]'::jsonb`),
  steps: jsonb('steps').notNull().default(sql`'[]'::jsonb`),
  configuration: jsonb('configuration').default(sql`'{}'::jsonb`),
  metadata: jsonb('metadata').default(sql`'{}'::jsonb`),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
});

/**
 * Represents a table schema for workflow executions in the database.
 *
 * @type {PgTable}
 */
export const workflowExecutionTable = pgTable('workflow_executions', {
  id: uuid('id').primaryKey().defaultRandom(),
  workflowId: uuid('workflow_id')
    .notNull()
    .references(() => workflowTable.id, { onDelete: 'cascade' }),
  agentId: uuid('agent_id')
    .notNull()
    .references(() => agentTable.id, { onDelete: 'cascade' }),
  status: varchar('status', { length: 20 }).notNull().default('PENDING'),
  triggerData: jsonb('trigger_data').default(sql`'{}'::jsonb`),
  context: jsonb('context').default(sql`'{}'::jsonb`),
  currentStepIndex: integer('current_step_index').default(0),
  history: jsonb('history').notNull().default(sql`'[]'::jsonb`),
  result: jsonb('result'),
  error: text('error'),
  startTime: timestamp('start_time', { withTimezone: true }).defaultNow(),
  endTime: timestamp('end_time', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
}); 