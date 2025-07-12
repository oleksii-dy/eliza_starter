import type { Plugin, Character } from '@elizaos/core';
import { pgTable, varchar, timestamp, uuid } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';

export const mockCharacter: Character = {
  id: '550e8400-e29b-41d4-a716-446655440000',
  name: `Test Agent ${Date.now()}`,
  bio: ['A test agent for running tests.'],
  system: 'You are a helpful test agent.',
  messageExamples: [],
  postExamples: [],
  topics: [],
  knowledge: [],
  plugins: [],
  settings: {},
  style: {},
};

export const helloWorldSchema = {
  helloWorldTable: pgTable('hello_world', {
    id: uuid('id').primaryKey().defaultRandom(),
    message: varchar('message', { length: 255 }).notNull(),
    author: varchar('author', { length: 100 }),
    createdAt: timestamp('created_at')
      .notNull()
      .$defaultFn(() => new Date()),
  }),
  greetingsTable: pgTable('greetings', {
    id: uuid('id').primaryKey().defaultRandom(),
    greeting: varchar('greeting', { length: 100 }).notNull(),
    language: varchar('language', { length: 20 }).default('en').notNull(),
    isActive: varchar('is_active', { length: 10 }).default('true').notNull(),
    updatedAt: timestamp('updated_at')
      .$defaultFn(() => new Date())
      .notNull(),
  }),
};

export const helloWorldPlugin: Plugin = {
  name: 'test-hello-world',
  description: 'A simple test plugin with a database schema.',
  schema: helloWorldSchema,
  init: async (_runtime) => {
    console.log('Hello World Plugin initialized!');
  },
};
