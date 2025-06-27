import { getSchemaFactory, createLazyTableProxy } from './factory.js';

/**
 * Lazy-loaded tasks table definition.
 * This function returns the tasks table schema when called,
 * ensuring the database type is set before schema creation.
 * Foreign key references are removed to avoid circular dependencies.
 * The database constraints will be enforced at the application level.
 */
function createTasksTable() {
  const factory = getSchemaFactory();

  return factory.table('tasks', {
    id: factory.uuid('id').primaryKey().notNull(),
    name: factory.text('name').notNull(),
    description: factory.text('description').notNull(),
    createdAt: factory.timestamp('created_at').default(factory.defaultTimestamp()).notNull(),
    updatedAt: factory.timestamp('updated_at').default(factory.defaultTimestamp()).notNull(),
    agentId: factory.uuid('agent_id').notNull(),
    roomId: factory.uuid('room_id'),
    worldId: factory.uuid('world_id'),
    entityId: factory.uuid('entity_id'),
    metadata: factory.json('metadata').default(factory.defaultJsonObject()).notNull(),
    tags: factory.textArray('tags').default(factory.defaultTextArray()).notNull(),
  });
}

/**
 * Represents the tasks table in the database.
 * Uses lazy initialization to ensure proper database type configuration.

 */
export const tasksTable = createLazyTableProxy(createTasksTable);
