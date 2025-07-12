import { sql } from 'drizzle-orm';
import { foreignKey, index, pgTable, text, timestamp, unique, uuid } from 'drizzle-orm/pg-core';
import { agentTable } from './agent';
import { entityTable } from './entity';
import { roomTable } from './room';

/**
 * Represents a participant in a room/conversation
 *
 * Links entities (users, agents, etc.) to specific rooms, allowing tracking of:
 * - Who is participating in which conversations
 * - When they joined/participated
 * - Their current state in the room
 *
 * This enables multi-entity conversations and proper message routing
 */
export const participantTable = pgTable(
  'participants',
  {
    id: uuid('id')
      .notNull()
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    created_at: timestamp('created_at', { withTimezone: true })
      .notNull()
      .$defaultFn(() => new Date()),
    entity_id: uuid('entity_id').references(() => entityTable.id, {
      onDelete: 'cascade',
    }),
    room_id: uuid('room_id').references(() => roomTable.id, {
      onDelete: 'cascade',
    }),
    agent_id: uuid('agent_id').references(() => agentTable.id, {
      onDelete: 'cascade',
    }),
    room_state: text('room_state'),
  },
  (table) => [
    unique('participants_user_room_unique').on(table.entity_id, table.room_id),
    index('idx_participants_user').on(table.entity_id),
    index('idx_participants_room').on(table.room_id),
    foreignKey({
      name: 'fk_room',
      columns: [table.room_id],
      foreignColumns: [roomTable.id],
    }).onDelete('cascade'),
    foreignKey({
      name: 'fk_user',
      columns: [table.entity_id],
      foreignColumns: [entityTable.id],
    }).onDelete('cascade'),
  ]
);
