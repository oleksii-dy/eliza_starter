import { sql } from 'drizzle-orm';
import { json, mysqlTable, varchar } from 'drizzle-orm/mysql-core';
import { agentTable } from './agent';
import { entityTable } from './entity';
import { roomTable } from './room';
import { numberTimestamp } from './types';
import { worldTable } from './world';
import type { Component, UUID } from '@elizaos/core';

/**
 * Definition of a table representing components in the database.
 */
export const componentTable = mysqlTable('components', {
  id: varchar('id', { length: 36 })
    .primaryKey()
    .default(sql`(UUID())`),
  entityId: varchar('entityId', { length: 36 })
    .notNull()
    .references(() => entityTable.id, { onDelete: 'cascade' }),
  agentId: varchar('agentId', { length: 36 })
    .notNull()
    .references(() => agentTable.id, { onDelete: 'cascade' }),
  roomId: varchar('roomId', { length: 36 })
    .notNull()
    .references(() => roomTable.id, { onDelete: 'cascade' }),
  worldId: varchar('worldId', { length: 36 }).references(() => worldTable.id, {
    onDelete: 'cascade',
  }),
  sourceEntityId: varchar('sourceEntityId', { length: 36 }).references(() => entityTable.id, {
    onDelete: 'cascade',
  }),
  type: varchar('type', { length: 50 }).notNull(),
  data: json('data')
    .$type<Record<string, unknown>>()
    .default(sql`('{}')`),
  createdAt: numberTimestamp('createdAt')
    .default(sql`CURRENT_TIMESTAMP`)
    .notNull(),
});

// Using modern type inference with $ prefix
export type SelectComponent = typeof componentTable.$inferSelect;
export type InsertComponent = typeof componentTable.$inferInsert;

// Type mapping utility to convert between Drizzle and Core types
export function mapToComponent(componentRow: SelectComponent): Component {
  // Explicit mapping of properties ensures type safety
  return {
    id: componentRow.id as UUID,
    entityId: componentRow.entityId as UUID,
    agentId: componentRow.agentId as UUID,
    roomId: componentRow.roomId as UUID,
    worldId: componentRow.worldId as UUID,
    sourceEntityId: componentRow.sourceEntityId as UUID,
    type: componentRow.type,
    data:
      typeof componentRow.data === 'object' && componentRow.data !== null ? componentRow.data : {},
    createdAt: Number(componentRow.createdAt),
  };
}

export function mapToComponentRow(component: Partial<Component>): InsertComponent {
  // Return a properly typed object with only the properties
  // that are defined in the database schema
  const result: Partial<InsertComponent> = {};

  // Only copy properties that exist in the component
  if (component.id !== undefined) result.id = component.id;
  if (component.entityId !== undefined) result.entityId = component.entityId;
  if (component.agentId !== undefined) result.agentId = component.agentId;
  if (component.roomId !== undefined) result.roomId = component.roomId;
  if (component.worldId !== undefined) result.worldId = component.worldId;
  if (component.sourceEntityId !== undefined) result.sourceEntityId = component.sourceEntityId;
  if (component.type !== undefined) result.type = component.type;
  if (component.data !== undefined) result.data = component.data;
  if (component.createdAt !== undefined) result.createdAt = component.createdAt;

  return result as InsertComponent;
}
