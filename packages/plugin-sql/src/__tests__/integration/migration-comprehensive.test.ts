import { type Plugin, type UUID, logger } from '@elizaos/core';
import { beforeEach, describe, expect, it, afterEach } from 'bun:test';
import { DatabaseMigrationService } from '../../migration-service';
import { createDatabaseAdapter } from '../../index';
import { v4 } from 'uuid';
import { tmpdir } from 'os';
import { join } from 'path';
import { mkdtempSync, rmSync } from 'fs';
import type { IDatabaseAdapter } from '@elizaos/core';
import { sql } from 'drizzle-orm';

// Helper function to handle database-specific SQL syntax
function executeSql(db: any, adapterName: string, query: string, params?: any[]): Promise<any> {
  // Bun SQLite uses ? placeholders and different syntax for some operations
  if (adapterName === 'Bun SQLite') {
    let sqliteQuery = query;
    let sqliteParams = [...(params || [])];

    // Handle PostgreSQL-style parameter replacement with expansion
    if (sqliteQuery.includes('$') && params) {
      const paramMatches = sqliteQuery.match(/\$\d+/g);
      if (paramMatches) {
        // Create a map of parameter positions to values
        const paramMap = new Map<number, any>();
        const allParamRefs = [...paramMatches]; // Keep all references, including duplicates

        // Build parameter map from unique parameter numbers
        const uniqueParams = [...new Set(paramMatches)].sort((a, b) => {
          const numA = parseInt(a.substring(1));
          const numB = parseInt(b.substring(1));
          return numA - numB;
        });

        for (const param of uniqueParams) {
          const paramNum = parseInt(param.substring(1));
          if (paramNum <= params.length) {
            paramMap.set(paramNum, params[paramNum - 1]);
          }
        }

        // Expand parameters to match the total number of references
        const expandedParams: any[] = [];
        for (const paramRef of allParamRefs) {
          const paramNum = parseInt(paramRef.substring(1));
          if (paramMap.has(paramNum)) {
            expandedParams.push(paramMap.get(paramNum));
          }
        }

        // Replace all parameter references with ? placeholders
        sqliteQuery = sqliteQuery.replace(/\$\d+/g, '?');
        sqliteParams = expandedParams;
      }
    }

    // Replace ARRAY_AGG with GROUP_CONCAT for SQLite
    sqliteQuery = sqliteQuery.replace(
      /ARRAY_AGG\s*\(\s*DISTINCT\s+([^)]+)\)/gi,
      'GROUP_CONCAT(DISTINCT $1)'
    );
    sqliteQuery = sqliteQuery.replace(/ARRAY_AGG\s*\(([^)]+)\)/gi, 'GROUP_CONCAT($1)');

    return db.execute(sqliteQuery, sqliteParams);
  }

  // PostgreSQL and PGLite: Build a simple parameterized query by direct substitution
  if (params && params.length > 0) {
    let finalQuery = query;

    // Replace each parameter placeholder with the properly formatted value
    for (let i = 0; i < params.length; i++) {
      const param = params[i];
      const placeholder = `$${i + 1}`;
      let paramValue: string;

      if (param === null || param === undefined) {
        paramValue = 'NULL';
      } else if (typeof param === 'string') {
        // Escape single quotes in strings
        paramValue = `'${param.replace(/'/g, "''")}'`;
      } else if (typeof param === 'number' || typeof param === 'boolean') {
        paramValue = String(param);
      } else if (Array.isArray(param)) {
        // Format array as PostgreSQL array literal
        const arrayItems = param.map((item) => {
          if (typeof item === 'string') {
            return `"${item.replace(/"/g, '\\"')}"`;
          }
          return String(item);
        });
        paramValue = `'{${arrayItems.join(',')}}'`;
      } else if (typeof param === 'object') {
        // Format object as JSON with proper escaping
        paramValue = `'${JSON.stringify(param).replace(/'/g, "''")}'`;
      } else {
        paramValue = String(param);
      }

      finalQuery = finalQuery.replaceAll(placeholder, paramValue);
    }

    return db.execute(sql.raw(finalQuery));
  }
  return db.execute(sql.raw(query));
}

// Test plugin with complex schema including all data types and relationships
const testPlugin: Plugin = {
  name: 'test-comprehensive-migration',
  description: 'Test plugin with comprehensive schema for migration testing',
  actions: [],
  evaluators: [],
  providers: [],
  services: [],
  schema: {
    // Users table with various data types
    users: {
      columns: {
        id: { type: 'uuid', primaryKey: true, default: 'gen_random_uuid()' },
        username: { type: 'text', unique: true, notNull: true },
        email: { type: 'text', unique: true, notNull: true },
        age: { type: 'integer' },
        score: { type: 'real' },
        balance: { type: 'numeric', precision: 10, scale: 2 },
        is_active: { type: 'boolean', default: true },
        metadata: { type: 'jsonb' },
        tags: { type: 'text[]' },
        embedding: { type: 'vector', dimensions: 1536 },
        created_at: { type: 'timestamp', default: 'NOW()' },
        updated_at: { type: 'timestamp', default: 'NOW()' },
        deleted_at: { type: 'timestamp' },
        bio: { type: 'text' },
        avatar_url: { type: 'text' },
        last_login: { type: 'timestamp' },
        login_count: { type: 'integer', default: 0 },
        settings: { type: 'jsonb', default: '{}' },
        permissions: { type: 'text[]', default: '{}' },
      },
      indexes: [
        { columns: ['username'] },
        { columns: ['email'] },
        { columns: ['created_at'] },
        { columns: ['is_active', 'deleted_at'] },
      ],
      checks: [
        { name: 'age_check', condition: 'age >= 0 AND age <= 150' },
        { name: 'balance_check', condition: 'balance >= 0' },
      ],
    },

    // Organizations table
    organizations: {
      columns: {
        id: { type: 'uuid', primaryKey: true, default: 'gen_random_uuid()' },
        name: { type: 'text', notNull: true },
        slug: { type: 'text', unique: true, notNull: true },
        description: { type: 'text' },
        metadata: { type: 'jsonb' },
        created_at: { type: 'timestamp', default: 'NOW()' },
        updated_at: { type: 'timestamp', default: 'NOW()' },
      },
      indexes: [{ columns: ['slug'] }, { columns: ['name'] }],
    },

    // User organizations junction table (many-to-many)
    user_organizations: {
      columns: {
        user_id: { type: 'uuid', notNull: true },
        organization_id: { type: 'uuid', notNull: true },
        role: { type: 'text', notNull: true, default: 'member' },
        joined_at: { type: 'timestamp', default: 'NOW()' },
      },
      foreignKeys: [
        {
          columns: ['user_id'],
          references: { table: 'users', columns: ['id'] },
          onDelete: 'CASCADE',
        },
        {
          columns: ['organization_id'],
          references: { table: 'organizations', columns: ['id'] },
          onDelete: 'CASCADE',
        },
      ],
      indexes: [
        { columns: ['user_id', 'organization_id'], unique: true },
        { columns: ['organization_id'] },
        { columns: ['role'] },
      ],
      checks: [{ name: 'role_check', condition: "role IN ('owner', 'admin', 'member', 'viewer')" }],
    },

    // Posts table (one-to-many with users)
    posts: {
      columns: {
        id: { type: 'uuid', primaryKey: true, default: 'gen_random_uuid()' },
        user_id: { type: 'uuid', notNull: true },
        organization_id: { type: 'uuid' },
        title: { type: 'text', notNull: true },
        content: { type: 'text' },
        status: { type: 'text', default: 'draft' },
        tags: { type: 'text[]' },
        metadata: { type: 'jsonb' },
        view_count: { type: 'integer', default: 0 },
        is_featured: { type: 'boolean', default: false },
        published_at: { type: 'timestamp' },
        created_at: { type: 'timestamp', default: 'NOW()' },
        updated_at: { type: 'timestamp', default: 'NOW()' },
      },
      foreignKeys: [
        {
          columns: ['user_id'],
          references: { table: 'users', columns: ['id'] },
          onDelete: 'CASCADE',
        },
        {
          columns: ['organization_id'],
          references: { table: 'organizations', columns: ['id'] },
          onDelete: 'SET NULL',
        },
      ],
      indexes: [
        { columns: ['user_id'] },
        { columns: ['organization_id'] },
        { columns: ['status'] },
        { columns: ['published_at'] },
        { columns: ['is_featured', 'published_at'] },
      ],
      checks: [
        { name: 'status_check', condition: "status IN ('draft', 'published', 'archived')" },
        { name: 'view_count_check', condition: 'view_count >= 0' },
      ],
    },

    // Comments table (self-referential relationship)
    comments: {
      columns: {
        id: { type: 'uuid', primaryKey: true, default: 'gen_random_uuid()' },
        post_id: { type: 'uuid', notNull: true },
        user_id: { type: 'uuid', notNull: true },
        parent_id: { type: 'uuid' }, // Self-referential for nested comments
        content: { type: 'text', notNull: true },
        is_edited: { type: 'boolean', default: false },
        likes: { type: 'integer', default: 0 },
        created_at: { type: 'timestamp', default: 'NOW()' },
        updated_at: { type: 'timestamp', default: 'NOW()' },
      },
      foreignKeys: [
        {
          columns: ['post_id'],
          references: { table: 'posts', columns: ['id'] },
          onDelete: 'CASCADE',
        },
        {
          columns: ['user_id'],
          references: { table: 'users', columns: ['id'] },
          onDelete: 'CASCADE',
        },
        {
          columns: ['parent_id'],
          references: { table: 'comments', columns: ['id'] },
          onDelete: 'CASCADE',
        },
      ],
      indexes: [
        { columns: ['post_id'] },
        { columns: ['user_id'] },
        { columns: ['parent_id'] },
        { columns: ['created_at'] },
      ],
    },

    // Categories table (hierarchical with self-referential relationship)
    categories: {
      columns: {
        id: { type: 'uuid', primaryKey: true, default: 'gen_random_uuid()' },
        name: { type: 'text', notNull: true },
        slug: { type: 'text', unique: true, notNull: true },
        parent_id: { type: 'uuid' },
        position: { type: 'integer', default: 0 },
        metadata: { type: 'jsonb' },
        created_at: { type: 'timestamp', default: 'NOW()' },
      },
      foreignKeys: [
        {
          columns: ['parent_id'],
          references: { table: 'categories', columns: ['id'] },
          onDelete: 'CASCADE',
        },
      ],
      indexes: [{ columns: ['slug'] }, { columns: ['parent_id'] }, { columns: ['position'] }],
    },

    // Post categories junction table
    post_categories: {
      columns: {
        post_id: { type: 'uuid', notNull: true },
        category_id: { type: 'uuid', notNull: true },
      },
      foreignKeys: [
        {
          columns: ['post_id'],
          references: { table: 'posts', columns: ['id'] },
          onDelete: 'CASCADE',
        },
        {
          columns: ['category_id'],
          references: { table: 'categories', columns: ['id'] },
          onDelete: 'CASCADE',
        },
      ],
      indexes: [
        { columns: ['post_id', 'category_id'], unique: true },
        { columns: ['category_id'] },
      ],
    },

    // Audit log table
    audit_logs: {
      columns: {
        id: { type: 'uuid', primaryKey: true, default: 'gen_random_uuid()' },
        table_name: { type: 'text', notNull: true },
        record_id: { type: 'uuid', notNull: true },
        action: { type: 'text', notNull: true },
        user_id: { type: 'uuid' },
        changes: { type: 'jsonb' },
        metadata: { type: 'jsonb' },
        created_at: { type: 'timestamp', default: 'NOW()' },
      },
      foreignKeys: [
        {
          columns: ['user_id'],
          references: { table: 'users', columns: ['id'] },
          onDelete: 'SET NULL',
        },
      ],
      indexes: [
        { columns: ['table_name', 'record_id'] },
        { columns: ['user_id'] },
        { columns: ['action'] },
        { columns: ['created_at'] },
      ],
      checks: [{ name: 'action_check', condition: "action IN ('CREATE', 'UPDATE', 'DELETE')" }],
    },
  },
};

describe('Comprehensive Migration Tests', () => {
  const runTestsForAdapter = (
    adapterName: string,
    createAdapterFn: () => Promise<{ adapter: IDatabaseAdapter; cleanup: () => Promise<void> }>
  ) => {
    describe(`${adapterName} Adapter`, () => {
      let adapter: IDatabaseAdapter;
      let cleanup: () => Promise<void>;
      let migrationService: DatabaseMigrationService;
      let db: any;
      let execute: (query: string, params?: any[]) => Promise<any>;

      beforeEach(async () => {
        const result = await createAdapterFn();
        adapter = result.adapter;
        cleanup = result.cleanup;

        // Initialize adapter
        await adapter.init();

        // Create migration service
        migrationService = new DatabaseMigrationService();
        await migrationService.initializeWithDatabase((adapter as any).getDatabase());

        // Get database instance and create execute wrapper
        db = (adapter as any).getDatabase();
        execute = (query: string, params?: any[]) => executeSql(db, adapterName, query, params);
      });

      afterEach(async () => {
        await cleanup();
      });

      it('should run comprehensive migrations successfully', async () => {
        // Register test plugin schema
        migrationService.discoverAndRegisterPluginSchemas([testPlugin]);

        // Run migrations
        await migrationService.runAllPluginMigrations();

        // Verify migration completed successfully by checking if tables exist
        // Note: The migration service doesn't currently expose getMigrationRecord
        // so we verify success by checking table creation in the next test
      });

      it('should create all tables with correct schema', async () => {
        // Register and run migrations
        console.log(`[TEST DEBUG] About to register test plugin for ${adapterName}`);
        migrationService.discoverAndRegisterPluginSchemas([testPlugin]);
        console.log(`[TEST DEBUG] Test plugin registered for ${adapterName}`);

        // Debug: Check what tables exist before migration
        console.log(`[DEBUG] Adapter name: ${adapterName}`);
        console.log(`[DEBUG] Database type:`, typeof db);
        try {
          let preRes: any;
          if (adapterName === 'Bun SQLite') {
            console.log(`[DEBUG] Using SQLite query for adapter: ${adapterName}`);
            preRes = await db.execute(
              sql.raw(`SELECT name as table_name FROM sqlite_master WHERE type='table'`)
            );
          } else {
            console.log(`[DEBUG] Using PostgreSQL query for adapter: ${adapterName}`);
            // PostgreSQL and PGLite
            preRes = await db.execute(
              sql.raw(
                `SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'`
              )
            );
          }
          console.log(`[DEBUG] Tables before migration:`, preRes.rows);
        } catch (e) {
          console.log(`[DEBUG] Could not check pre-migration tables:`, e.message);
          console.log(`[DEBUG] Error details:`, e);
        }

        console.log(`[TEST DEBUG] About to run migrations for ${adapterName}`);
        await migrationService.runAllPluginMigrations();
        console.log(`[TEST DEBUG] Migrations complete for ${adapterName}`);

        // Debug: Check what tables exist after migration
        try {
          let postRes: any;
          if (adapterName === 'Bun SQLite') {
            postRes = await db.execute(
              sql.raw(`SELECT name as table_name FROM sqlite_master WHERE type='table'`)
            );
          } else {
            // PostgreSQL and PGLite
            postRes = await db.execute(
              sql.raw(
                `SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'`
              )
            );
          }
          console.log(`[DEBUG] Tables after migration:`, postRes.rows);
        } catch (e) {
          console.log(`[DEBUG] Could not check post-migration tables:`, e.message);
        }

        // Test data insertion to verify schema
        const testUserId = v4();
        const testOrgId = v4();
        const testPostId = v4();
        const testCategoryId = v4();
        const testCommentId = v4();

        // Insert test user
        await execute(
          `
          INSERT INTO users (id, username, email, age, score, balance, metadata, tags)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        `,
          [
            testUserId,
            'testuser',
            'test@example.com',
            25,
            98.5,
            '1234.56',
            JSON.stringify({ preferences: { theme: 'dark' } }),
            ['developer', 'tester'],
          ]
        );

        // Insert test organization
        await execute(
          `
          INSERT INTO organizations (id, name, slug, description)
          VALUES ($1, $2, $3, $4)
        `,
          [testOrgId, 'Test Organization', 'test-org', 'A test organization']
        );

        // Insert user-organization relationship
        await execute(
          `
          INSERT INTO user_organizations (user_id, organization_id, role)
          VALUES ($1, $2, $3)
        `,
          [testUserId, testOrgId, 'admin']
        );

        // Insert test category
        await execute(
          `
          INSERT INTO categories (id, name, slug, position)
          VALUES ($1, $2, $3, $4)
        `,
          [testCategoryId, 'Test Category', 'test-category', 1]
        );

        // Insert test post
        await execute(
          `
          INSERT INTO posts (id, user_id, organization_id, title, content, status, tags)
          VALUES ($1, $2, $3, $4, $5, $6, $7)
        `,
          [
            testPostId,
            testUserId,
            testOrgId,
            'Test Post',
            'This is test content',
            'published',
            ['test', 'migration'],
          ]
        );

        // Insert post-category relationship
        await execute(
          `
          INSERT INTO post_categories (post_id, category_id)
          VALUES ($1, $2)
        `,
          [testPostId, testCategoryId]
        );

        // Insert test comment
        await execute(
          `
          INSERT INTO comments (id, post_id, user_id, content)
          VALUES ($1, $2, $3, $4)
        `,
          [testCommentId, testPostId, testUserId, 'Great post!']
        );

        // Insert nested comment
        await execute(
          `
          INSERT INTO comments (post_id, user_id, parent_id, content)
          VALUES ($1, $2, $3, $4)
        `,
          [testPostId, testUserId, testCommentId, 'Thanks!']
        );

        // Insert audit log
        await execute(
          `
          INSERT INTO audit_logs (table_name, record_id, action, user_id, changes)
          VALUES ($1, $2, $3, $4, $5)
        `,
          ['posts', testPostId, 'CREATE', testUserId, JSON.stringify({ title: 'Test Post' })]
        );

        // Verify data integrity by querying with joins
        const result = await execute(
          `
          SELECT 
            u.username,
            o.name as org_name,
            uo.role,
            p.title,
            c.name as category_name
          FROM users u
          JOIN user_organizations uo ON u.id = uo.user_id
          JOIN organizations o ON uo.organization_id = o.id
          JOIN posts p ON p.user_id = u.id
          JOIN post_categories pc ON pc.post_id = p.id
          JOIN categories c ON pc.category_id = c.id
          WHERE u.id = $1
        `,
          [testUserId]
        );

        expect(result.rows.length).toBe(1);
        expect(result.rows[0].username).toBe('testuser');
        expect(result.rows[0].org_name).toBe('Test Organization');
        expect(result.rows[0].role).toBe('admin');
        expect(result.rows[0].title).toBe('Test Post');
        expect(result.rows[0].category_name).toBe('Test Category');
      });

      it('should handle constraint violations correctly', async () => {
        // Register and run migrations
        migrationService.discoverAndRegisterPluginSchemas([testPlugin]);
        await migrationService.runAllPluginMigrations();

        // Test unique constraint violation
        const duplicateUsername = 'duplicate_user';
        await execute(
          `
          INSERT INTO users (username, email) VALUES ($1, $2)
        `,
          [duplicateUsername, 'user1@example.com']
        );

        await expect(
          (async () => {
            await execute(
              `
              INSERT INTO users (username, email) VALUES ($1, $2)
            `,
              [duplicateUsername, 'user2@example.com']
            );
          })()
        ).rejects.toThrow();

        // Test foreign key constraint violation
        const nonExistentUserId = v4();
        await expect(
          (async () => {
            await execute(
              `
              INSERT INTO posts (user_id, title) VALUES ($1, $2)
            `,
              [nonExistentUserId, 'Orphan Post']
            );
          })()
        ).rejects.toThrow();

        // Test check constraint violation
        await expect(
          (async () => {
            await execute(
              `
              INSERT INTO users (username, email, age) VALUES ($1, $2, $3)
            `,
              ['validuser', 'valid@example.com', -5]
            );
          })()
        ).rejects.toThrow();

        // Test check constraint for enum-like field
        const userId = v4();
        await execute(
          `
          INSERT INTO users (id, username, email) VALUES ($1, $2, $3)
        `,
          [userId, 'enumtest', 'enum@example.com']
        );

        const postId = v4();
        await expect(
          (async () => {
            await execute(
              `
              INSERT INTO posts (id, user_id, title, status) VALUES ($1, $2, $3, $4)
            `,
              [postId, userId, 'Invalid Status Post', 'invalid_status']
            );
          })()
        ).rejects.toThrow();
      });

      it('should handle cascade deletes correctly', async () => {
        // Register and run migrations
        migrationService.discoverAndRegisterPluginSchemas([testPlugin]);
        await migrationService.runAllPluginMigrations();

        // Create test data
        const userId = v4();
        const postId = v4();
        const commentId = v4();

        await execute(
          `
          INSERT INTO users (id, username, email) VALUES ($1, $2, $3)
        `,
          [userId, 'cascade_test', 'cascade@example.com']
        );

        await execute(
          `
          INSERT INTO posts (id, user_id, title) VALUES ($1, $2, $3)
        `,
          [postId, userId, 'Cascade Test Post']
        );

        await execute(
          `
          INSERT INTO comments (id, post_id, user_id, content) VALUES ($1, $2, $3, $4)
        `,
          [commentId, postId, userId, 'Test comment']
        );

        // Delete user - should cascade delete posts and comments
        await execute(`DELETE FROM users WHERE id = $1`, [userId]);

        // Verify cascading deletes
        const posts = await execute(`SELECT * FROM posts WHERE user_id = $1`, [userId]);
        expect(posts.rows.length).toBe(0);

        const comments = await execute(`SELECT * FROM comments WHERE user_id = $1`, [userId]);
        expect(comments.rows.length).toBe(0);
      });

      it('should support complex queries with multiple joins', async () => {
        // Register and run migrations
        migrationService.discoverAndRegisterPluginSchemas([testPlugin]);
        await migrationService.runAllPluginMigrations();

        // Create complex test data
        const userId1 = v4();
        const userId2 = v4();
        const orgId = v4();
        const postId = v4();
        const categoryId1 = v4();
        const categoryId2 = v4();

        // Insert users
        await execute(
          `
          INSERT INTO users (id, username, email) VALUES 
          ($1, 'user1', 'user1@example.com'),
          ($2, 'user2', 'user2@example.com')
        `,
          [userId1, userId2]
        );

        // Insert organization
        await execute(
          `
          INSERT INTO organizations (id, name, slug) VALUES ($1, $2, $3)
        `,
          [orgId, 'Complex Org', 'complex-org']
        );

        // Link users to organization
        await execute(
          `
          INSERT INTO user_organizations (user_id, organization_id, role) VALUES 
          ($1, $3, 'owner'),
          ($2, $3, 'member')
        `,
          [userId1, userId2, orgId]
        );

        // Insert categories
        await execute(
          `
          INSERT INTO categories (id, name, slug) VALUES 
          ($1, 'Tech', 'tech'),
          ($2, 'News', 'news')
        `,
          [categoryId1, categoryId2]
        );

        // Insert post
        await execute(
          `
          INSERT INTO posts (id, user_id, organization_id, title, status, is_featured) 
          VALUES ($1, $2, $3, $4, $5, $6)
        `,
          [postId, userId1, orgId, 'Complex Post', 'published', true]
        );

        // Link post to categories
        await execute(
          `
          INSERT INTO post_categories (post_id, category_id) VALUES 
          ($1, $2),
          ($1, $3)
        `,
          [postId, categoryId1, categoryId2]
        );

        // Complex query with multiple joins and aggregations
        const result = await execute(`
          SELECT 
            p.title,
            u.username as author,
            o.name as organization,
            COUNT(DISTINCT pc.category_id) as category_count,
            ARRAY_AGG(DISTINCT c.name) as categories,
            uo.role as author_role
          FROM posts p
          JOIN users u ON p.user_id = u.id
          JOIN organizations o ON p.organization_id = o.id
          JOIN user_organizations uo ON uo.user_id = u.id AND uo.organization_id = o.id
          JOIN post_categories pc ON pc.post_id = p.id
          JOIN categories c ON pc.category_id = c.id
          WHERE p.is_featured = true
          GROUP BY p.id, p.title, u.username, o.name, uo.role
        `);

        expect(result.rows.length).toBe(1);
        expect(result.rows[0].title).toBe('Complex Post');
        expect(result.rows[0].author).toBe('user1');
        expect(result.rows[0].organization).toBe('Complex Org');
        // Handle different return types for COUNT between databases
        const categoryCount = result.rows[0].category_count;
        expect(categoryCount == 2 || categoryCount === '2').toBe(true);
        expect(result.rows[0].author_role).toBe('owner');

        // Handle different result formats for categories (array vs comma-separated string)
        const categories = result.rows[0].categories;
        if (typeof categories === 'string') {
          // SQLite returns GROUP_CONCAT as comma-separated string
          expect(categories).toContain('Tech');
          expect(categories).toContain('News');
        } else if (Array.isArray(categories)) {
          // PostgreSQL returns ARRAY_AGG as array
          expect(categories).toContain('Tech');
          expect(categories).toContain('News');
        } else {
          throw new Error(`Unexpected categories type: ${typeof categories}`);
        }
      });
    });
  };

  // Test PostgreSQL
  if (process.env.POSTGRES_URL) {
    runTestsForAdapter('PostgreSQL', async () => {
      const agentId = v4() as UUID;
      const adapter = await createDatabaseAdapter(
        { postgresUrl: process.env.POSTGRES_URL },
        agentId
      );

      const cleanup = async () => {
        // For PostgreSQL tests, don't close the connection manager between tests
        // since it's shared across all tests. Only clean up test data, not the tables.
        // The connection will be closed when the test process exits.
        const db = (adapter as any).getDatabase();
        try {
          // Clean up test data but keep the tables for the next test
          const tablesToClean = [
            'audit_logs',
            'post_categories',
            'comments',
            'posts',
            'categories',
            'user_organizations',
            'organizations',
            'users',
          ];

          for (const table of tablesToClean) {
            try {
              await db.execute(sql.raw(`DELETE FROM ${table}`));
            } catch (error) {
              // Ignore errors - table might not exist
            }
          }
        } catch (error) {
          // Ignore cleanup errors in tests
        }
        // Do NOT call adapter.close() here for PostgreSQL tests
      };

      return { adapter, cleanup };
    });
  }

  // Test PGLite
  runTestsForAdapter('PGLite', async () => {
    const tempDir = mkdtempSync(join(tmpdir(), 'eliza-pglite-test-'));
    const agentId = v4() as UUID;
    const adapter = await createDatabaseAdapter({ dataDir: tempDir, forcePglite: true }, agentId);

    const cleanup = async () => {
      // For PGLite tests, don't close the adapter between tests to avoid database corruption
      // Just clean up test data but keep the database open
      const db = (adapter as any).getDatabase();
      try {
        // Clean up test data but keep the tables for the next test
        const tablesToClean = [
          'audit_logs',
          'post_categories',
          'comments',
          'posts',
          'categories',
          'user_organizations',
          'organizations',
          'users',
        ];

        for (const table of tablesToClean) {
          try {
            await db.execute(sql.raw(`DELETE FROM "${table}"`));
          } catch (error) {
            // Ignore errors - table might not exist
          }
        }
      } catch (error) {
        // Ignore cleanup errors in tests
      }
      // Do NOT call adapter.close() here for PGLite tests to prevent corruption
    };

    return { adapter, cleanup };
  });

  // Test Bun SQLite
  runTestsForAdapter('Bun SQLite', async () => {
    const tempDir = mkdtempSync(join(tmpdir(), 'eliza-bunsqlite-test-'));
    const agentId = v4() as UUID;
    const adapter = await createDatabaseAdapter(
      { dataDir: tempDir, forceBunSqlite: true },
      agentId
    );

    const cleanup = async () => {
      await adapter.close();
      rmSync(tempDir, { recursive: true, force: true });
    };

    return { adapter, cleanup };
  });
});
