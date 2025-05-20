import { sql } from 'drizzle-orm';
import { json, mysqlTable, timestamp, varchar } from 'drizzle-orm/mysql-core';
import type { Task, UUID } from '@elizaos/core';

/**
 * Represents a table schema for tasks in the database.
 */
export const taskTable = mysqlTable('tasks', {
  id: varchar('id', { length: 36 })
    .primaryKey()
    .default(sql`(UUID())`),
  name: varchar('name', { length: 255 }).notNull(),
  description: varchar('description', { length: 1000 }),
  roomId: varchar('roomId', { length: 36 }),
  worldId: varchar('worldId', { length: 36 }),
  entityId: varchar('entityId', { length: 36 }),
  agentId: varchar('agent_id', { length: 36 }).notNull(),
  // MySQL doesn't support arrays, using JSON instead
  tags: json('tags')
    .$type<string[]>()
    .default(sql`('[]')`),
  metadata: json('metadata')
    .$type<Record<string, unknown>>()
    .default(sql`('{}')`),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// Using modern type inference with $ prefix
export type SelectTask = typeof taskTable.$inferSelect;
export type InsertTask = typeof taskTable.$inferInsert;

/**
 * Maps a Drizzle task record to the core Task type
 */
export function mapToTask(taskRow: SelectTask): Task {
  return {
    id: taskRow.id as UUID,
    name: taskRow.name,
    description: taskRow.description || '',
    roomId: taskRow.roomId as UUID | undefined,
    worldId: taskRow.worldId as UUID | undefined,
    entityId: taskRow.entityId as UUID | undefined,
    tags: Array.isArray(taskRow.tags) ? taskRow.tags : [],
    metadata:
      typeof taskRow.metadata === 'object' && taskRow.metadata !== null ? taskRow.metadata : {},
  };
}

/**
 * Maps a core Task object to a Drizzle task record for database operations
 */
export function mapToTaskRow(task: Partial<Task>): InsertTask {
  const result: Partial<InsertTask> = {};

  // Copy only properties that exist in the task object
  if (task.id !== undefined) result.id = task.id;
  if (task.name !== undefined) result.name = task.name;
  if (task.description !== undefined) result.description = task.description;
  if (task.roomId !== undefined) result.roomId = task.roomId;
  if (task.worldId !== undefined) result.worldId = task.worldId;
  if (task.entityId !== undefined) result.entityId = task.entityId;
  if (task.tags !== undefined) result.tags = task.tags;
  if (task.metadata !== undefined) result.metadata = task.metadata;

  // For database operations
  if ('agentId' in task) result.agentId = task.agentId as UUID;
  if ('createdAt' in task) result.createdAt = new Date((task as any).createdAt);
  if ('updatedAt' in task) result.updatedAt = new Date((task as any).updatedAt);

  return result as InsertTask;
}
