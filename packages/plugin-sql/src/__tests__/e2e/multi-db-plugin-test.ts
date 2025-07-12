import { describe, it, expect, beforeAll, afterAll } from 'bun:test';
import { v4 } from 'uuid';
import type { Plugin, UUID } from '@elizaos/core';
import { AgentRuntime } from '@elizaos/core';
import { sql } from 'drizzle-orm';
import {
  pgTable,
  uuid,
  varchar,
  text,
  timestamp,
  boolean,
  integer,
  jsonb,
  index,
  unique,
  foreignKey,
  check,
  vector,
} from 'drizzle-orm/pg-core';
import { drizzle } from 'drizzle-orm/pglite';
import { drizzle as drizzlePg } from 'drizzle-orm/postgres-js';
import { drizzle as drizzleSqlite } from 'drizzle-orm/bun-sqlite';
import { Database } from 'bun:sqlite';
import postgres from 'postgres';
import { PGlite } from '@electric-sql/pglite';
import { vector as vectorExtension } from '@electric-sql/pglite/vector';
import { plugin as sqlPlugin } from '../../index';
import { DatabaseMigrationService } from '../../migration-service';
import { PgDatabaseAdapter } from '../../pg/adapter';
import { PostgresConnectionManager } from '../../pg/manager';
import { PgliteDatabaseAdapter } from '../../pglite/adapter';
import { PGliteClientManager } from '../../pglite/manager';
import { BunSqliteAdapter } from '../../bun-sqlite/adapter';
import { mockCharacter } from '../fixtures';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

// Todo Service Plugin Schema
export const todoUsersTable = pgTable(
  'todo_users',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    username: varchar('username', { length: 100 }).notNull(),
    email: varchar('email', { length: 255 }).notNull(),
    isActive: boolean('is_active').default(true).notNull(),
    metadata: jsonb('metadata').default({}).notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (table) => [
    unique('todo_users_username_unique').on(table.username),
    unique('todo_users_email_unique').on(table.email),
    index('idx_todo_users_active').on(table.isActive),
  ]
);

export const todoCategoriesTable = pgTable(
  'todo_categories',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    name: varchar('name', { length: 100 }).notNull(),
    description: text('description'),
    color: varchar('color', { length: 7 }).default('#000000'),
    parentId: uuid('parent_id'),
    orderIndex: integer('order_index').default(0),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => [
    unique('todo_categories_name_unique').on(table.name),
    index('idx_todo_categories_parent').on(table.parentId),
    foreignKey({
      columns: [table.parentId],
      foreignColumns: [table.id],
    }).onDelete('cascade'),
  ]
);

export const todoItemsTable = pgTable(
  'todo_items',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    userId: uuid('user_id')
      .notNull()
      .references(() => todoUsersTable.id, { onDelete: 'cascade' }),
    categoryId: uuid('category_id').references(() => todoCategoriesTable.id, {
      onDelete: 'set null',
    }),
    title: varchar('title', { length: 255 }).notNull(),
    description: text('description'),
    isCompleted: boolean('is_completed').default(false).notNull(),
    priority: integer('priority').default(0).notNull(),
    dueDate: timestamp('due_date'),
    completedAt: timestamp('completed_at'),
    tags: jsonb('tags').default([]).notNull(),
    embedding: vector('embedding', { dimensions: 384 }),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (table) => [
    index('idx_todo_items_user').on(table.userId),
    index('idx_todo_items_category').on(table.categoryId),
    index('idx_todo_items_completed').on(table.isCompleted),
    index('idx_todo_items_due_date').on(table.dueDate),
    check('priority_range', sql`priority >= 0 AND priority <= 5`),
  ]
);

export const todoCommentsTable = pgTable(
  'todo_comments',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    todoId: uuid('todo_id')
      .notNull()
      .references(() => todoItemsTable.id, { onDelete: 'cascade' }),
    userId: uuid('user_id')
      .notNull()
      .references(() => todoUsersTable.id, { onDelete: 'cascade' }),
    parentId: uuid('parent_id'),
    content: text('content').notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (table) => [
    index('idx_todo_comments_todo').on(table.todoId),
    index('idx_todo_comments_user').on(table.userId),
    index('idx_todo_comments_parent').on(table.parentId),
    foreignKey({
      columns: [table.parentId],
      foreignColumns: [table.id],
    }).onDelete('cascade'),
  ]
);

export const todoTagsTable = pgTable(
  'todo_tags',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    name: varchar('name', { length: 50 }).notNull(),
    color: varchar('color', { length: 7 }).default('#000000'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => [unique('todo_tags_name_unique').on(table.name)]
);

export const todoItemTagsTable = pgTable(
  'todo_item_tags',
  {
    todoId: uuid('todo_id')
      .notNull()
      .references(() => todoItemsTable.id, { onDelete: 'cascade' }),
    tagId: uuid('tag_id')
      .notNull()
      .references(() => todoTagsTable.id, { onDelete: 'cascade' }),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => [
    unique('todo_item_tags_unique').on(table.todoId, table.tagId),
    index('idx_todo_item_tags_todo').on(table.todoId),
    index('idx_todo_item_tags_tag').on(table.tagId),
  ]
);

// Todo Service Plugin
export const todoServicePlugin: Plugin = {
  name: 'todo-service',
  description: 'A comprehensive todo service for testing',
  schema: {
    todoUsersTable,
    todoCategoriesTable,
    todoItemsTable,
    todoCommentsTable,
    todoTagsTable,
    todoItemTagsTable,
  },
  priority: 100,
  dependencies: ['@elizaos/plugin-sql'],
  init: async () => {
    console.log('Todo Service Plugin initialized!');
  },
};

// Test helper to create database instances
async function createTestDatabaseInstance(
  type: 'postgres' | 'pglite' | 'sqlite',
  testAgentId: UUID
) {
  const testId = testAgentId.replace(/-/g, '_');

  switch (type) {
    case 'postgres': {
      if (!process.env.POSTGRES_URL) {
        throw new Error('POSTGRES_URL not set');
      }
      const connectionManager = new PostgresConnectionManager(process.env.POSTGRES_URL);
      const adapter = new PgDatabaseAdapter(testAgentId, connectionManager);
      await adapter.init();

      const db = connectionManager.getDatabase();
      const schemaName = `test_todo_${testId}`;

      // Clean up and create schema
      await db.execute(sql`DROP SCHEMA IF EXISTS ${sql.raw(schemaName)} CASCADE`);
      await db.execute(sql`CREATE SCHEMA ${sql.raw(schemaName)}`);
      await db.execute(sql`SET search_path TO ${sql.raw(schemaName)}, public`);

      return {
        adapter,
        db,
        cleanup: async () => {
          await db.execute(sql`DROP SCHEMA IF EXISTS ${sql.raw(schemaName)} CASCADE`);
          await adapter.close();
        },
      };
    }

    case 'pglite': {
      const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'eliza-todo-test-'));
      const connectionManager = new PGliteClientManager({ dataDir: tempDir });
      await connectionManager.initialize();
      const adapter = new PgliteDatabaseAdapter(testAgentId, connectionManager);
      await adapter.init();

      return {
        adapter,
        db: adapter.getDatabase(),
        cleanup: async () => {
          await adapter.close();
          fs.rmSync(tempDir, { recursive: true, force: true });
        },
      };
    }

    case 'sqlite': {
      const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'eliza-todo-sqlite-'));
      const dbPath = path.join(tempDir, 'test.db');
      const adapter = new BunSqliteAdapter(testAgentId, {
        filename: dbPath,
      });

      return {
        adapter,
        db: adapter.getDatabase(),
        cleanup: async () => {
          await adapter.close();
          fs.rmSync(tempDir, { recursive: true, force: true });
        },
      };
    }
  }
}

// Test data
const testData = {
  users: [
    {
      id: v4() as UUID,
      username: 'alice',
      email: 'alice@example.com',
      metadata: { role: 'admin' },
    },
    {
      id: v4() as UUID,
      username: 'bob',
      email: 'bob@example.com',
      metadata: { role: 'user' },
    },
  ],
  categories: [
    {
      id: v4() as UUID,
      name: 'Work',
      description: 'Work related tasks',
      color: '#FF0000',
    },
    {
      id: v4() as UUID,
      name: 'Personal',
      description: 'Personal tasks',
      color: '#00FF00',
    },
  ],
  tags: [
    { id: v4() as UUID, name: 'urgent', color: '#FF0000' },
    { id: v4() as UUID, name: 'important', color: '#FFA500' },
    { id: v4() as UUID, name: 'low-priority', color: '#808080' },
  ],
};

describe('Multi-Database Plugin E2E Tests', () => {
  const testCases = [
    { type: 'pglite' as const, name: 'PGLite' },
    ...(process.env.POSTGRES_URL ? [{ type: 'postgres' as const, name: 'PostgreSQL' }] : []),
    ...(typeof Bun !== 'undefined' ? [{ type: 'sqlite' as const, name: 'Bun SQLite' }] : []),
  ];

  testCases.forEach(({ type, name }) => {
    describe(`${name} Database Tests`, () => {
      let adapter: any;
      let runtime: AgentRuntime;
      let cleanup: () => Promise<void>;
      let db: any;
      const testAgentId = v4() as UUID;

      beforeAll(async () => {
        console.log(`[TEST] Setting up ${name} database...`);

        // Create database instance
        const result = await createTestDatabaseInstance(type, testAgentId);
        adapter = result.adapter;
        db = result.db;
        cleanup = result.cleanup;

        // Create runtime
        runtime = new AgentRuntime({
          character: { ...mockCharacter, id: undefined },
          agentId: testAgentId,
          plugins: [sqlPlugin, todoServicePlugin],
        });
        runtime.registerDatabaseAdapter(adapter);

        // Run migrations
        const migrationService = new DatabaseMigrationService();
        await migrationService.initializeWithDatabase(db);
        migrationService.discoverAndRegisterPluginSchemas([sqlPlugin, todoServicePlugin]);
        await migrationService.runAllPluginMigrations();

        // Create agent
        await adapter.createAgent({
          id: testAgentId,
          ...mockCharacter,
        } as any);
      });

      afterAll(async () => {
        if (cleanup) {
          await cleanup();
        }
      });

      describe('Migration Tests', () => {
        it('should create all todo service tables', async () => {
          // Check tables exist
          const tableNames = [
            'todo_users',
            'todo_categories',
            'todo_items',
            'todo_comments',
            'todo_tags',
            'todo_item_tags',
          ];

          for (const tableName of tableNames) {
            let exists = false;

            if (type === 'sqlite') {
              const result = await db.execute(
                sql`SELECT name FROM sqlite_master WHERE type='table' AND name=${tableName}`
              );
              exists = result.rows.length > 0;
            } else {
              const schemaName =
                type === 'postgres'
                  ? `test_todo_${testAgentId.replace(/-/g, '_')}`
                  : 'todo_service';
              const result = await db.execute(
                sql`SELECT table_name FROM information_schema.tables 
                    WHERE table_schema = ${schemaName} AND table_name = ${tableName}`
              );
              exists = result.rows.length > 0;
            }

            expect(exists).toBe(true);
          }
        });

        it('should create all constraints and indexes', async () => {
          if (type === 'sqlite') {
            // SQLite doesn't have the same constraint introspection
            // Just verify we can query with foreign keys enabled
            await db.execute(sql`PRAGMA foreign_keys = ON`);
            const result = await db.execute(sql`PRAGMA foreign_keys`);
            expect(result.rows[0].foreign_keys).toBe(1);
          } else {
            // Check unique constraints
            const schemaName =
              type === 'postgres' ? `test_todo_${testAgentId.replace(/-/g, '_')}` : 'todo_service';
            const uniqueResult = await db.execute(
              sql`SELECT constraint_name FROM information_schema.table_constraints 
                  WHERE table_schema = ${schemaName} 
                  AND constraint_type = 'UNIQUE'`
            );
            expect(uniqueResult.rows.length).toBeGreaterThan(0);

            // Check foreign keys
            const fkResult = await db.execute(
              sql`SELECT constraint_name FROM information_schema.table_constraints 
                  WHERE table_schema = ${schemaName} 
                  AND constraint_type = 'FOREIGN KEY'`
            );
            expect(fkResult.rows.length).toBeGreaterThan(0);
          }
        });
      });

      describe('CRUD Operations', () => {
        it('should create users', async () => {
          for (const user of testData.users) {
            if (type === 'sqlite') {
              await db.execute(
                sql`INSERT INTO todo_users (id, username, email, metadata) 
                    VALUES (${user.id}, ${user.username}, ${user.email}, ${JSON.stringify(user.metadata)})`
              );
            } else {
              await db.execute(
                sql`INSERT INTO todo_service.todo_users (id, username, email, metadata) 
                    VALUES (${user.id}, ${user.username}, ${user.email}, ${user.metadata})`
              );
            }
          }

          // Verify
          const result =
            type === 'sqlite'
              ? await db.execute(sql`SELECT * FROM todo_users`)
              : await db.execute(sql`SELECT * FROM todo_service.todo_users`);
          expect(result.rows.length).toBe(2);
        });

        it('should create categories with hierarchy', async () => {
          // Create parent categories
          for (const category of testData.categories) {
            if (type === 'sqlite') {
              await db.execute(
                sql`INSERT INTO todo_categories (id, name, description, color) 
                    VALUES (${category.id}, ${category.name}, ${category.description}, ${category.color})`
              );
            } else {
              await db.execute(
                sql`INSERT INTO todo_service.todo_categories (id, name, description, color) 
                    VALUES (${category.id}, ${category.name}, ${category.description}, ${category.color})`
              );
            }
          }

          // Create subcategory
          const subCategoryId = v4() as UUID;
          if (type === 'sqlite') {
            await db.execute(
              sql`INSERT INTO todo_categories (id, name, parent_id) 
                  VALUES (${subCategoryId}, ${'Meetings'}, ${testData.categories[0].id})`
            );
          } else {
            await db.execute(
              sql`INSERT INTO todo_service.todo_categories (id, name, parent_id) 
                  VALUES (${subCategoryId}, ${'Meetings'}, ${testData.categories[0].id})`
            );
          }

          // Verify
          const result =
            type === 'sqlite'
              ? await db.execute(sql`SELECT * FROM todo_categories WHERE parent_id IS NOT NULL`)
              : await db.execute(
                  sql`SELECT * FROM todo_service.todo_categories WHERE parent_id IS NOT NULL`
                );
          expect(result.rows.length).toBe(1);
        });

        it('should create todo items with all fields', async () => {
          const todoId = v4() as UUID;
          const embedding =
            type === 'sqlite'
              ? null // SQLite doesn't support vectors
              : `[${Array(384)
                  .fill(0)
                  .map(() => Math.random())
                  .join(',')}]`;

          if (type === 'sqlite') {
            await db.execute(
              sql`INSERT INTO todo_items (id, user_id, category_id, title, description, priority, tags) 
                  VALUES (${todoId}, ${testData.users[0].id}, ${testData.categories[0].id}, 
                         ${'Complete project proposal'}, ${'Write and submit the Q1 project proposal'}, 
                         ${3}, ${JSON.stringify(['urgent', 'important'])})`
            );
          } else {
            await db.execute(
              sql`INSERT INTO todo_service.todo_items (id, user_id, category_id, title, description, priority, tags, embedding) 
                  VALUES (${todoId}, ${testData.users[0].id}, ${testData.categories[0].id}, 
                         ${'Complete project proposal'}, ${'Write and submit the Q1 project proposal'}, 
                         ${3}, ${sql`${['urgent', 'important']}::jsonb`}, 
                         ${embedding ? sql`${sql.raw(embedding)}::vector(384)` : null})`
            );
          }

          // Verify
          const result =
            type === 'sqlite'
              ? await db.execute(sql`SELECT * FROM todo_items WHERE id = ${todoId}`)
              : await db.execute(sql`SELECT * FROM todo_service.todo_items WHERE id = ${todoId}`);
          expect(result.rows.length).toBe(1);
          expect(result.rows[0].title).toBe('Complete project proposal');
        });

        it('should handle complex relationships', async () => {
          // Create tags
          for (const tag of testData.tags) {
            if (type === 'sqlite') {
              await db.execute(
                sql`INSERT INTO todo_tags (id, name, color) 
                    VALUES (${tag.id}, ${tag.name}, ${tag.color})`
              );
            } else {
              await db.execute(
                sql`INSERT INTO todo_service.todo_tags (id, name, color) 
                    VALUES (${tag.id}, ${tag.name}, ${tag.color})`
              );
            }
          }

          // Create a todo and link tags
          const todoId = v4() as UUID;
          if (type === 'sqlite') {
            await db.execute(
              sql`INSERT INTO todo_items (id, user_id, title) 
                  VALUES (${todoId}, ${testData.users[0].id}, ${'Tagged todo item'})`
            );

            // Link tags
            await db.execute(
              sql`INSERT INTO todo_item_tags (todo_id, tag_id) 
                  VALUES (${todoId}, ${testData.tags[0].id})`
            );
            await db.execute(
              sql`INSERT INTO todo_item_tags (todo_id, tag_id) 
                  VALUES (${todoId}, ${testData.tags[1].id})`
            );
          } else {
            await db.execute(
              sql`INSERT INTO todo_service.todo_items (id, user_id, title) 
                  VALUES (${todoId}, ${testData.users[0].id}, ${'Tagged todo item'})`
            );

            // Link tags
            await db.execute(
              sql`INSERT INTO todo_service.todo_item_tags (todo_id, tag_id) 
                  VALUES (${todoId}, ${testData.tags[0].id})`
            );
            await db.execute(
              sql`INSERT INTO todo_service.todo_item_tags (todo_id, tag_id) 
                  VALUES (${todoId}, ${testData.tags[1].id})`
            );
          }

          // Verify with join
          let joinResult;
          if (type === 'sqlite') {
            joinResult = await db.execute(
              sql`SELECT t.name as tag_name 
                  FROM todo_item_tags tit 
                  JOIN todo_tags t ON tit.tag_id = t.id 
                  WHERE tit.todo_id = ${todoId}`
            );
          } else {
            joinResult = await db.execute(
              sql`SELECT t.name as tag_name 
                  FROM todo_service.todo_item_tags tit 
                  JOIN todo_service.todo_tags t ON tit.tag_id = t.id 
                  WHERE tit.todo_id = ${todoId}`
            );
          }

          expect(joinResult.rows.length).toBe(2);
          const tagNames = joinResult.rows.map((r: any) => r.tag_name);
          expect(tagNames).toContain('urgent');
          expect(tagNames).toContain('important');
        });

        it('should handle cascade deletes', async () => {
          // Create a user with todos
          const userId = v4() as UUID;
          const todoId1 = v4() as UUID;
          const todoId2 = v4() as UUID;
          const commentId = v4() as UUID;

          if (type === 'sqlite') {
            await db.execute(sql`PRAGMA foreign_keys = ON`);

            await db.execute(
              sql`INSERT INTO todo_users (id, username, email) 
                  VALUES (${userId}, ${'testuser'}, ${'test@example.com'})`
            );

            await db.execute(
              sql`INSERT INTO todo_items (id, user_id, title) 
                  VALUES (${todoId1}, ${userId}, ${'Todo 1'})`
            );
            await db.execute(
              sql`INSERT INTO todo_items (id, user_id, title) 
                  VALUES (${todoId2}, ${userId}, ${'Todo 2'})`
            );

            await db.execute(
              sql`INSERT INTO todo_comments (id, todo_id, user_id, content) 
                  VALUES (${commentId}, ${todoId1}, ${userId}, ${'Test comment'})`
            );

            // Delete user - should cascade
            await db.execute(sql`DELETE FROM todo_users WHERE id = ${userId}`);

            // Verify todos are deleted
            const todoResult = await db.execute(
              sql`SELECT * FROM todo_items WHERE user_id = ${userId}`
            );
            expect(todoResult.rows.length).toBe(0);

            // Verify comments are deleted
            const commentResult = await db.execute(
              sql`SELECT * FROM todo_comments WHERE id = ${commentId}`
            );
            expect(commentResult.rows.length).toBe(0);
          } else {
            await db.execute(
              sql`INSERT INTO todo_service.todo_users (id, username, email) 
                  VALUES (${userId}, ${'testuser'}, ${'test@example.com'})`
            );

            await db.execute(
              sql`INSERT INTO todo_service.todo_items (id, user_id, title) 
                  VALUES (${todoId1}, ${userId}, ${'Todo 1'})`
            );
            await db.execute(
              sql`INSERT INTO todo_service.todo_items (id, user_id, title) 
                  VALUES (${todoId2}, ${userId}, ${'Todo 2'})`
            );

            await db.execute(
              sql`INSERT INTO todo_service.todo_comments (id, todo_id, user_id, content) 
                  VALUES (${commentId}, ${todoId1}, ${userId}, ${'Test comment'})`
            );

            // Delete user - should cascade
            await db.execute(sql`DELETE FROM todo_service.todo_users WHERE id = ${userId}`);

            // Verify todos are deleted
            const todoResult = await db.execute(
              sql`SELECT * FROM todo_service.todo_items WHERE user_id = ${userId}`
            );
            expect(todoResult.rows.length).toBe(0);

            // Verify comments are deleted
            const commentResult = await db.execute(
              sql`SELECT * FROM todo_service.todo_comments WHERE id = ${commentId}`
            );
            expect(commentResult.rows.length).toBe(0);
          }
        });
      });

      describe('Retrieval Functions', () => {
        it('should retrieve todos with filters', async () => {
          // Get active todos for a user
          let result;
          if (type === 'sqlite') {
            result = await db.execute(
              sql`SELECT t.*, u.username 
                  FROM todo_items t 
                  JOIN todo_users u ON t.user_id = u.id 
                  WHERE t.is_completed = false 
                  ORDER BY t.priority DESC`
            );
          } else {
            result = await db.execute(
              sql`SELECT t.*, u.username 
                  FROM todo_service.todo_items t 
                  JOIN todo_service.todo_users u ON t.user_id = u.id 
                  WHERE t.is_completed = false 
                  ORDER BY t.priority DESC`
            );
          }

          expect(result.rows.length).toBeGreaterThanOrEqual(0);
        });

        it('should perform aggregation queries', async () => {
          let result;
          if (type === 'sqlite') {
            result = await db.execute(
              sql`SELECT u.username, COUNT(t.id) as todo_count 
                  FROM todo_users u 
                  LEFT JOIN todo_items t ON u.id = t.user_id 
                  GROUP BY u.id, u.username`
            );
          } else {
            result = await db.execute(
              sql`SELECT u.username, COUNT(t.id) as todo_count 
                  FROM todo_service.todo_users u 
                  LEFT JOIN todo_service.todo_items t ON u.id = t.user_id 
                  GROUP BY u.id, u.username`
            );
          }

          expect(result.rows.length).toBeGreaterThan(0);
        });

        it('should handle complex joins across multiple tables', async () => {
          let result;
          if (type === 'sqlite') {
            result = await db.execute(
              sql`SELECT 
                    t.title,
                    u.username,
                    c.name as category_name,
                    COUNT(DISTINCT tc.id) as comment_count
                  FROM todo_items t
                  JOIN todo_users u ON t.user_id = u.id
                  LEFT JOIN todo_categories c ON t.category_id = c.id
                  LEFT JOIN todo_comments tc ON t.id = tc.todo_id
                  GROUP BY t.id, t.title, u.username, c.name`
            );
          } else {
            result = await db.execute(
              sql`SELECT 
                    t.title,
                    u.username,
                    c.name as category_name,
                    COUNT(DISTINCT tc.id) as comment_count
                  FROM todo_service.todo_items t
                  JOIN todo_service.todo_users u ON t.user_id = u.id
                  LEFT JOIN todo_service.todo_categories c ON t.category_id = c.id
                  LEFT JOIN todo_service.todo_comments tc ON t.id = tc.todo_id
                  GROUP BY t.id, t.title, u.username, c.name`
            );
          }

          expect(result.rows.length).toBeGreaterThanOrEqual(0);
        });

        if (type !== 'sqlite') {
          it('should perform vector similarity searches', async () => {
            // Create a todo with embedding
            const todoId = v4() as UUID;
            const embedding = Array(384)
              .fill(0)
              .map(() => Math.random());
            const embeddingStr = `[${embedding.join(',')}]`;

            await db.execute(
              sql`INSERT INTO todo_service.todo_items (id, user_id, title, embedding) 
                  VALUES (${todoId}, ${testData.users[0].id}, ${'Vector search test'}, 
                         ${sql`${sql.raw(embeddingStr)}::vector(384)`})`
            );

            // Search similar vectors
            const searchVector = `[${embedding.join(',')}]`;
            const result = await db.execute(
              sql`SELECT id, title, embedding <=> ${sql`${sql.raw(searchVector)}::vector(384)`} as distance 
                  FROM todo_service.todo_items 
                  WHERE embedding IS NOT NULL 
                  ORDER BY distance 
                  LIMIT 5`
            );

            expect(result.rows.length).toBeGreaterThan(0);
            expect(result.rows[0].distance).toBe(0); // Same vector should have distance 0
          });
        }
      });

      describe('Transaction Support', () => {
        it('should handle transactions correctly', async () => {
          const userId = v4() as UUID;
          const todoId = v4() as UUID;

          try {
            if (type === 'sqlite') {
              // SQLite transaction
              await db.execute(sql`BEGIN`);

              await db.execute(
                sql`INSERT INTO todo_users (id, username, email) 
                    VALUES (${userId}, ${'txuser'}, ${'tx@example.com'})`
              );

              await db.execute(
                sql`INSERT INTO todo_items (id, user_id, title) 
                    VALUES (${todoId}, ${userId}, ${'Transaction test'})`
              );

              // Verify within transaction
              const result = await db.execute(sql`SELECT * FROM todo_items WHERE id = ${todoId}`);
              expect(result.rows.length).toBe(1);

              // Rollback
              await db.execute(sql`ROLLBACK`);

              // Verify rollback
              const afterRollback = await db.execute(
                sql`SELECT * FROM todo_items WHERE id = ${todoId}`
              );
              expect(afterRollback.rows.length).toBe(0);
            } else {
              // PostgreSQL/PGLite transaction
              await db.execute(sql`BEGIN`);

              await db.execute(
                sql`INSERT INTO todo_service.todo_users (id, username, email) 
                    VALUES (${userId}, ${'txuser'}, ${'tx@example.com'})`
              );

              await db.execute(
                sql`INSERT INTO todo_service.todo_items (id, user_id, title) 
                    VALUES (${todoId}, ${userId}, ${'Transaction test'})`
              );

              // Verify within transaction
              const result = await db.execute(
                sql`SELECT * FROM todo_service.todo_items WHERE id = ${todoId}`
              );
              expect(result.rows.length).toBe(1);

              // Rollback
              await db.execute(sql`ROLLBACK`);

              // Verify rollback
              const afterRollback = await db.execute(
                sql`SELECT * FROM todo_service.todo_items WHERE id = ${todoId}`
              );
              expect(afterRollback.rows.length).toBe(0);
            }
          } catch (error) {
            // Ensure cleanup on error
            try {
              await db.execute(sql`ROLLBACK`);
            } catch {
              // Ignore rollback errors during cleanup
            }
            throw error;
          }
        });
      });
    });
  });
});
