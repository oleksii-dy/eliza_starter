import { pgTable, uuid, varchar, timestamp } from 'drizzle-orm/pg-core';

// Hello world table for testing dynamic creation
export const helloWorldTable = pgTable('hello_world', {
  id: uuid('id').defaultRandom().primaryKey(),
  message: varchar('message', { length: 255 }).notNull(),
  author: varchar('author', { length: 100 }).default('anonymous'),
  agentId: uuid('agent_id').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// Greetings table for multi-table testing
export const greetingsTable = pgTable('greetings', {
  id: uuid('id').defaultRandom().primaryKey(),
  greeting: varchar('greeting', { length: 100 }).notNull(),
  language: varchar('language', { length: 20 }).notNull().default('en'),
  isActive: varchar('is_active', { length: 10 }).notNull().default('true'),
  agentId: uuid('agent_id').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// Export schema for plugin
export const helloWorldSchema = {
  helloWorldTable,
  greetingsTable,
}; 