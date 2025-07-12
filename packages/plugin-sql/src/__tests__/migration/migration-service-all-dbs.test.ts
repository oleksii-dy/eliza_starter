import { PGlite } from '@electric-sql/pglite';
import { vector as vectorExtension } from '@electric-sql/pglite/vector';
import { Database } from 'bun:sqlite';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'bun:test';
import { sql } from 'drizzle-orm';
import { drizzle as drizzleSqlite } from 'drizzle-orm/bun-sqlite';
import {
  boolean,
  check,
  date,
  decimal,
  doublePrecision,
  foreignKey,
  index,
  integer,
  jsonb,
  pgTable,
  primaryKey,
  real,
  text,
  time,
  timestamp,
  unique,
  uuid,
  varchar,
  vector,
} from 'drizzle-orm/pg-core';
import { drizzle } from 'drizzle-orm/pglite';
import { drizzle as drizzlePg } from 'drizzle-orm/postgres-js';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import postgres from 'postgres';
import { v4 } from 'uuid';
import { DatabaseMigrationService } from '../../migration-service';

// Comprehensive test schema covering all data types and relationships

// Table with all basic data types
export const allTypesTable = pgTable(
  'all_types',
  {
    id: uuid('id').primaryKey().notNull().defaultRandom(),
    // String types
    varcharCol: varchar('varchar_col', { length: 255 }),
    textCol: text('text_col'),
    // Numeric types
    integerCol: integer('integer_col'),
    decimalCol: decimal('decimal_col', { precision: 10, scale: 2 }),
    realCol: real('real_col'),
    doublePrecisionCol: doublePrecision('double_col'),
    // Boolean
    booleanCol: boolean('boolean_col'),
    // JSON
    jsonbCol: jsonb('jsonb_col'),
    // Timestamps
    timestampCol: timestamp('timestamp_col'),
    timestampTzCol: timestamp('timestamp_tz_col', { withTimezone: true }),
    // Date/Time
    dateCol: date('date_col'),
    timeCol: time('time_col'),
    // Vector column (384 dimensions) - will be skipped for SQLite
    embedding384: vector('embedding_384', { dimensions: 384 }),
  },
  (table) => ({
    // Add unique constraint on varchar column
    varcharUnique: unique('all_types_varchar_unique').on(table.varcharCol),
    // Add check constraint for positive integers
    integerPositive: check('integer_positive', sql`integer_col > 0`),
  })
);

// Parent table for relationships
export const parentTable = pgTable(
  'parent_entities',
  {
    id: uuid('id')
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    name: varchar('name', { length: 100 }).notNull(),
    type: varchar('type', { length: 50 }).notNull(),
    status: varchar('status', { length: 20 }).default('active').notNull(),
    metadata: jsonb('metadata').default({}).notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => [
    unique('parent_entities_name_type_unique').on(table.name, table.type),
    index('idx_parent_entities_status').on(table.status),
  ]
);

// Child table with foreign key
export const childTable = pgTable(
  'child_entities',
  {
    id: uuid('id')
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    parentId: uuid('parent_id')
      .notNull()
      .references(() => parentTable.id, { onDelete: 'cascade' }),
    name: varchar('name', { length: 100 }).notNull(),
    orderIndex: integer('order_index').default(0).notNull(),
    data: jsonb('data').default({}).notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => [
    index('idx_child_entities_parent').on(table.parentId),
    index('idx_child_entities_order').on(table.orderIndex),
  ]
);

// Self-referential table
export const hierarchicalTable = pgTable(
  'hierarchical_entities',
  {
    id: uuid('id')
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    parentId: uuid('parent_id'),
    name: varchar('name', { length: 100 }).notNull(),
    path: text('path').notNull(), // materialized path for efficient queries
    level: integer('level').default(0).notNull(),
    metadata: jsonb('metadata').default({}).notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => [
    index('idx_hierarchical_parent').on(table.parentId),
    index('idx_hierarchical_path').on(table.path),
    index('idx_hierarchical_level').on(table.level),
    foreignKey({
      columns: [table.parentId],
      foreignColumns: [table.id],
    }).onDelete('cascade'),
  ]
);

// Many-to-many junction table
export const manyToManyTable = pgTable(
  'parent_child_relations',
  {
    parentId: uuid('parent_id')
      .notNull()
      .references(() => parentTable.id, { onDelete: 'cascade' }),
    childId: uuid('child_id')
      .notNull()
      .references(() => childTable.id, { onDelete: 'cascade' }),
    relationType: varchar('relation_type', { length: 50 }).notNull().default('default'),
    strength: integer('strength').default(1).notNull(),
    metadata: jsonb('metadata').default({}).notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => [
    primaryKey({ columns: [table.parentId, table.childId] }),
    index('idx_parent_child_parent').on(table.parentId),
    index('idx_parent_child_child').on(table.childId),
    index('idx_parent_child_type').on(table.relationType),
    check('strength_range', sql`strength >= 1 AND strength <= 10`),
  ]
);

// Complex table with multiple foreign keys
export const complexRelationsTable = pgTable(
  'complex_relations',
  {
    id: uuid('id')
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    parentId: uuid('parent_id')
      .notNull()
      .references(() => parentTable.id),
    childId: uuid('child_id')
      .notNull()
      .references(() => childTable.id),
    hierarchicalId: uuid('hierarchical_id').references(() => hierarchicalTable.id),
    allTypesId: uuid('all_types_id').references(() => allTypesTable.id, { onDelete: 'set null' }),
    relationType: varchar('relation_type', { length: 50 }).notNull(),
    priority: integer('priority').default(0).notNull(),
    isActive: boolean('is_active').default(true).notNull(),
    config: jsonb('config').default({}).notNull(),
    notes: text('notes'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (table) => [
    unique('complex_relations_unique').on(table.parentId, table.childId, table.relationType),
    index('idx_complex_relations_parent').on(table.parentId),
    index('idx_complex_relations_child').on(table.childId),
    index('idx_complex_relations_active').on(table.isActive),
    check('priority_range', sql`priority >= 0 AND priority <= 100`),
  ]
);

// Test plugin with comprehensive schema
export const comprehensiveTestPlugin = {
  name: 'comprehensive-test',
  description: 'Comprehensive test plugin for migration service',
  schema: {
    allTypesTable,
    parentTable,
    childTable,
    hierarchicalTable,
    manyToManyTable,
    complexRelationsTable,
  },
  priority: 100,
  dependencies: ['@elizaos/plugin-sql'],
  init: async () => {
    console.log('Comprehensive Test Plugin initialized!');
  },
};

// Database setup helpers
async function setupPostgreSQL(testId: string) {
  if (!process.env.POSTGRES_URL) {
    throw new Error('POSTGRES_URL environment variable not set');
  }

  const client = postgres(process.env.POSTGRES_URL);
  const db = drizzlePg(client);

  // Use public schema now
  const schemaName = 'public';

  // Clean up any existing test tables
  const testTables = [
    'all_types',
    'parent_entities',
    'child_entities',
    'hierarchical_entities',
    'parent_child_relations',
    'complex_relations',
  ];

  for (const table of testTables) {
    await db.execute(sql`DROP TABLE IF EXISTS ${sql.raw(table)} CASCADE`);
  }

  // Ensure vector extension is available
  await db.execute(sql`CREATE EXTENSION IF NOT EXISTS vector`);

  return {
    db,
    client,
    schemaName,
    cleanup: async () => {
      // Clean up test tables
      for (const table of testTables) {
        await db.execute(sql`DROP TABLE IF EXISTS ${sql.raw(table)} CASCADE`);
      }
      await client.end();
    },
  };
}

async function setupPGLite(testId: string) {
  const pgLite = new PGlite({
    dataDir: ':memory:',
    extensions: {
      vector: vectorExtension,
    },
  });

  const db = drizzle(pgLite as any);

  // We're using public schema now, no need to create a plugin-specific schema
  const schemaName = 'public';

  return {
    db,
    client: pgLite,
    schemaName,
    cleanup: async () => {
      await pgLite.close();
    },
  };
}

async function setupBunSQLite(testId: string) {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), `eliza-migration-test-${testId}-`));
  const dbPath = path.join(tempDir, 'test.db');
  const sqlite = new Database(dbPath);
  const db = drizzleSqlite(sqlite) as any;

  // Add execute method for Bun SQLite if it doesn't exist
  if (!db.execute) {
    db.execute = async (query: any) => {
      let sqlString: string;
      let params: any[] = [];

      if (typeof query === 'string') {
        sqlString = query;
      } else if (query && typeof query === 'object') {
        // Debug log the query structure (commented out to reduce noise)
        if (query.sql && query.sql[0] && query.sql[0].includes('DELETE FROM')) {
          // Skip logging DELETE queries to reduce noise
        } else {
          // console.log('[BUN SQLITE] Query object type:', query.constructor?.name);
          // console.log('[BUN SQLITE] Query keys:', Object.keys(query));
          // if (query.strings) console.log('[BUN SQLITE] Query.strings:', query.strings);
          // if (query.values) console.log('[BUN SQLITE] Query.values:', query.values);

          // Extra debugging for CREATE TABLE
          if (
            query._ &&
            query._.strings &&
            query._.strings[0] &&
            query._.strings[0].includes('CREATE TABLE')
          ) {
            console.log('[BUN SQLITE] CREATE TABLE query._:', query._);
            console.log('[BUN SQLITE] CREATE TABLE query._.strings:', query._.strings);
          }
        }

        // Handle sql.raw() specifically
        if (query._ && query._.strings && Array.isArray(query._.strings)) {
          // This is a sql.raw() call
          sqlString = query._.strings.join('');
        }
        // Handle Drizzle SQL object with queryChunks
        else if (query.queryChunks && Array.isArray(query.queryChunks)) {
          // This is a Drizzle SQL template literal
          sqlString = '';
          let paramIndex = 0;

          // console.log('[BUN SQLITE] Processing queryChunks:', query.queryChunks.length);

          for (let i = 0; i < query.queryChunks.length; i++) {
            const chunk = query.queryChunks[i];
            // console.log(`[BUN SQLITE] Chunk ${i}:`, chunk);
            // console.log(`[BUN SQLITE] Chunk ${i} type:`, typeof chunk);

            if (typeof chunk === 'string') {
              console.log(`[BUN SQLITE] String chunk, adding as parameter`);
              params.push(chunk);
              sqlString += '?';
            } else if (chunk && typeof chunk === 'object') {
              if ('value' in chunk && Array.isArray(chunk.value)) {
                // StringChunk - value is an array of strings
                sqlString += chunk.value.join('');
              } else if ('value' in chunk && !Array.isArray(chunk.value)) {
                // This is a parameter value
                params.push(chunk.value);
                sqlString += '?';
                paramIndex++;
              } else if (chunk.type === 'raw' && chunk.value) {
                // Raw SQL chunk
                sqlString += chunk.value;
              } else if (chunk.sql) {
                // Nested SQL
                sqlString += chunk.sql;
              } else {
                // Unknown chunk type - might be a parameter
                console.log('[BUN SQLITE] Unknown chunk type:', chunk);
                // If it's a column object with a value property, use that as a parameter
                if (chunk.value !== undefined) {
                  params.push(chunk.value);
                  sqlString += '?';
                } else {
                  // Fallback
                  sqlString += '?';
                  params.push(chunk);
                }
              }
            } else {
              // Primitive value (string, number, etc.) - treat as parameter
              params.push(chunk);
              sqlString += '?';
            }
          }

          // console.log('[BUN SQLITE] Final SQL:', sqlString);
          // console.log('[BUN SQLITE] Final params:', params);
        }
        // Handle sql`` template tag (most common case)
        else if (query.strings && Array.isArray(query.strings) && query.values) {
          const strings = query.strings;
          const values = query.values;
          let builtSql = '';

          console.log('[BUN SQLITE] Processing SQL template with', values.length, 'values');

          for (let i = 0; i < strings.length; i++) {
            builtSql += strings[i];
            if (i < values.length) {
              const value = values[i];
              // Check if value is another SQL object (like sql.raw())
              if (value && typeof value === 'object' && value.getSQL) {
                const innerSql = value.getSQL();
                if (typeof innerSql === 'string') {
                  builtSql += innerSql;
                } else if (innerSql && innerSql.sql) {
                  builtSql += innerSql.sql;
                } else {
                  // It's a SQL identifier
                  builtSql += String(value);
                }
              } else {
                builtSql += '?';
                params.push(value);
              }
            }
          }
          sqlString = builtSql;
          console.log('[BUN SQLITE] Built SQL:', sqlString);
          console.log('[BUN SQLITE] Params:', params);
        }
        // Handle different Drizzle SQL object formats
        else if (query.values !== undefined && Array.isArray(query.values)) {
          // This is from drizzle-orm sql.raw()
          if (query.strings && Array.isArray(query.strings)) {
            // Template literal format
            const strings = query.strings;
            const values = query.values;
            let builtSql = '';

            for (let i = 0; i < strings.length; i++) {
              builtSql += strings[i];
              if (i < values.length) {
                // Check if value is a SQL identifier (table/column name)
                if (values[i] && values[i].constructor?.name === 'SQL') {
                  // This is a SQL identifier, not a parameter
                  builtSql += values[i].getSQL().sql || values[i].getSQL();
                } else {
                  builtSql += '?';
                  params.push(values[i]);
                }
              }
            }
            sqlString = builtSql;
          } else if (query.sql && Array.isArray(query.sql)) {
            // Alternative sql`` format
            const sqlParts = query.sql;
            const values = query.values || [];
            let builtSql = '';

            for (let i = 0; i < sqlParts.length; i++) {
              builtSql += sqlParts[i];
              if (i < values.length) {
                builtSql += '?';
                params.push(values[i]);
              }
            }
            sqlString = builtSql;
          } else {
            // Direct SQL string with values
            sqlString = String(query.values[0] || query.sql || query);
          }
        } else if ('getSQL' in query && typeof query.getSQL === 'function') {
          // Drizzle SQL object with getSQL method
          try {
            const sqlData = query.getSQL();
            if (typeof sqlData === 'string') {
              sqlString = sqlData;
            } else if (sqlData && sqlData.sql) {
              sqlString = sqlData.sql;
              params = sqlData.params || [];
            } else {
              // getSQL() might return the same SQL object - handle it recursively
              console.error('[BUN SQLITE] getSQL returned unexpected format:', sqlData);
              // Check if it's a StringChunk with value array
              if (sqlData && sqlData.value && Array.isArray(sqlData.value)) {
                sqlString = sqlData.value.join('');
                console.log(
                  '[BUN SQLITE] Extracted SQL from StringChunk in getSQL:',
                  sqlString.substring(0, 100)
                );
              } else {
                throw new Error('getSQL returned unexpected format');
              }
            }
          } catch (e) {
            console.error('[BUN SQLITE] Error calling getSQL:', e);
            throw new Error('Unable to get SQL from query object');
          }
        } else {
          // Last resort - try common patterns
          if (query._) {
            sqlString = query._;
          } else if (query.queryString) {
            sqlString = query.queryString;
          } else {
            console.error('[BUN SQLITE] Unhandled query format:', JSON.stringify(query, null, 2));
            throw new Error('Unable to parse SQL query');
          }
        }
      } else {
        throw new Error('Invalid query type: ' + typeof query);
      }

      // Clean up the SQL string
      sqlString = sqlString.trim();

      // Handle PostgreSQL-specific syntax for SQLite
      if (sqlString.includes('::jsonb')) {
        sqlString = sqlString.replace(/::jsonb/g, '');
      }
      if (sqlString.includes('::text[]')) {
        sqlString = sqlString.replace(/::text\[\]/g, '');
      }
      if (sqlString.includes('::vector')) {
        // SQLite doesn't support vectors, skip vector operations
        sqlString = sqlString.replace(/::vector\(\d+\)/g, '');
      }

      // Handle boolean values for SQLite (convert to 0/1)
      params = params.map((param) => {
        if (typeof param === 'boolean') {
          return param ? 1 : 0;
        }
        // Stringify objects (JSON) for SQLite
        if (param && typeof param === 'object' && !(param instanceof Date)) {
          return JSON.stringify(param);
        }
        return param;
      });

      try {
        // Handle PRAGMA statements
        if (sqlString.toLowerCase().startsWith('pragma')) {
          sqlite.exec(sqlString);
          return { rows: [], rowCount: 0 };
        }

        let result;
        const isSelect =
          sqlString.toLowerCase().startsWith('select') ||
          sqlString.toLowerCase().includes('returning');

        if (params.length > 0) {
          const stmt = sqlite.prepare(sqlString);
          result = isSelect ? stmt.all(...params) : stmt.run(...params);
        } else {
          result = isSelect ? sqlite.query(sqlString).all() : sqlite.run(sqlString);
        }

        // Format result to match expected structure
        return {
          rows: Array.isArray(result) ? result : [],
          rowCount: Array.isArray(result) ? result.length : result?.changes || 0,
        };
      } catch (error: any) {
        console.error('[BUN SQLITE] Query execution error:', error.message);
        console.error('[BUN SQLITE] SQL:', sqlString);
        console.error('[BUN SQLITE] Params:', params);
        throw error;
      }
    };
  }

  // Enable foreign keys
  sqlite.exec('PRAGMA foreign_keys = ON');

  // Add test to verify foreign keys are enabled
  const fkResult = sqlite.query('PRAGMA foreign_keys').get();
  console.log('[TEST] SQLite foreign keys enabled:', fkResult);

  return {
    db,
    client: sqlite,
    schemaName: 'main', // SQLite uses 'main' as default schema
    cleanup: async () => {
      sqlite.close();
      fs.rmSync(tempDir, { recursive: true, force: true });
    },
  };
}

describe('Migration Service Tests - All Databases', () => {
  const testCases = [
    {
      type: 'pglite' as const,
      name: 'PGLite',
      setup: setupPGLite,
    },
    ...(process.env.POSTGRES_URL
      ? [
          {
            type: 'postgres' as const,
            name: 'PostgreSQL',
            setup: setupPostgreSQL,
          },
        ]
      : []),
    ...(typeof Bun !== 'undefined'
      ? [
          {
            type: 'sqlite' as const,
            name: 'Bun SQLite',
            setup: setupBunSQLite,
          },
        ]
      : []),
  ];

  testCases.forEach(({ type, name, setup }) => {
    describe(`${name} Migration Service`, () => {
      let db: any;
      let cleanup: () => Promise<void>;
      let schemaName: string;
      let migrationService: DatabaseMigrationService;
      const testId = v4().replace(/-/g, '_').substring(0, 16);

      beforeAll(async () => {
        try {
          console.log(`[TEST] Setting up ${name} for migration service tests...`);
          const result = await setup(testId);
          db = result.db;
          cleanup = result.cleanup;
          schemaName = result.schemaName;

          if (!db) {
            throw new Error(`Database setup failed for ${name} - db is undefined`);
          }

          // Log database info
          if (type === 'sqlite') {
            console.log('[TEST] SQLite database object:', db);
          }

          // Initialize migration service
          migrationService = new DatabaseMigrationService();
          await migrationService.initializeWithDatabase(db);

          // Register plugin schemas
          migrationService.discoverAndRegisterPluginSchemas([comprehensiveTestPlugin]);

          // Run migrations
          await migrationService.runAllPluginMigrations();

          // Enable foreign keys for SQLite after migrations
          if (type === 'sqlite') {
            await db.execute(sql`PRAGMA foreign_keys = ON`);
          }

          // For SQLite, verify tables were created
          if (type === 'sqlite') {
            const tables = await db.execute(
              sql`SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'`
            );
            console.log(
              '[TEST] SQLite tables after migration:',
              tables.rows.map((r: any) => r.name)
            );

            // Also check if we can query the all_types table directly
            try {
              const testQuery = await db.execute(sql`SELECT COUNT(*) as count FROM all_types`);
              console.log('[TEST] all_types table exists, row count:', testQuery.rows[0].count);
            } catch (e: any) {
              console.log('[TEST] all_types table does not exist:', e.message);
            }
          }

          // Debug: Check what constraints were created for PGLite
          if (type === 'pglite') {
            const allConstraints = await db.execute(
              sql`SELECT conname, contype, conrelid::regclass::text as table_name 
                FROM pg_constraint 
                WHERE connamespace = 'public'::regnamespace
                ORDER BY table_name, conname`
            );
            console.log('[TEST] All constraints after migration:', allConstraints.rows);

            // Also check if unique constraints exist in system catalogs
            const uniqueIndexes = await db.execute(
              sql`SELECT indexname, tablename 
                FROM pg_indexes 
                WHERE schemaname = 'comprehensive_test' 
                AND indexname LIKE '%unique%'`
            );
            console.log('[TEST] Unique indexes:', uniqueIndexes.rows);
          }
        } catch (error) {
          console.error(`[TEST] Failed to set up ${name}:`, error);
          // For SQLite, check if db is still valid
          if (type === 'sqlite' && db) {
            try {
              const testQuery = await db.execute(sql`SELECT 1 as test`);
              console.log('[TEST] SQLite db still valid after error:', testQuery.rows);
            } catch (dbError) {
              console.error('[TEST] SQLite db is invalid after setup error:', dbError);
            }
          }
          throw error;
        }
      });

      afterAll(async () => {
        if (cleanup) {
          await cleanup();
        }
      });

      beforeEach(async () => {
        // Clean up test data before each test
        try {
          if (type === 'sqlite') {
            // SQLite cleanup
            const tables = [
              'complex_relations',
              'parent_child_relations',
              'child_entities',
              'hierarchical_entities',
              'parent_entities',
              'all_types',
            ];
            for (const table of tables) {
              try {
                await db.execute(sql.raw(`DELETE FROM ${table}`));
              } catch (e) {
                // Table might not exist yet
              }
            }
          } else {
            // PostgreSQL/PGLite cleanup - use truncate with cascade for efficiency
            try {
              await db.execute(
                sql.raw(`
                TRUNCATE TABLE 
                  complex_relations,
                  parent_child_relations,
                  child_entities,
                  hierarchical_entities,
                  parent_entities,
                  all_types
                CASCADE
              `)
              );
            } catch (e) {
              // If TRUNCATE fails, try DELETE
              const tables = [
                'complex_relations',
                'parent_child_relations',
                'child_entities',
                'hierarchical_entities',
                'parent_entities',
                'all_types',
              ];
              for (const table of tables) {
                try {
                  await db.execute(sql.raw(`DELETE FROM ${table}`));
                } catch (e) {
                  // Table might not exist yet
                }
              }
            }
          }
        } catch (error) {
          console.log('[TEST] Cleanup error (non-fatal):', error);
        }
      });

      describe('Table Creation', () => {
        it('should create all tables from the schema', async () => {
          const expectedTables = [
            'all_types',
            'parent_entities',
            'child_entities',
            'hierarchical_entities',
            'parent_child_relations',
            'complex_relations',
          ];

          for (const tableName of expectedTables) {
            let exists = false;

            if (type === 'sqlite') {
              const sqlQuery = sql`SELECT name FROM sqlite_master WHERE type='table' AND name=${tableName}`;
              console.log('[TEST] Checking table:', tableName);
              console.log('[TEST] SQL query object:', sqlQuery);
              const result = await db.execute(sqlQuery);
              exists = result.rows.length > 0;
              console.log(`[TEST] SQLite table ${tableName} exists:`, exists);
            } else {
              // For PostgreSQL/PGLite, use public schema
              const result = await db.execute(
                sql`SELECT table_name FROM information_schema.tables 
                    WHERE table_schema = 'public' AND table_name = ${tableName}`
              );
              // Handle different result formats
              exists = (result.rows || result).length > 0;
            }

            expect(exists).toBe(true);
          }
        });

        it('should create tables in correct dependency order', async () => {
          // Insert test data to verify tables exist
          const parentId = v4();
          const childId = v4();

          // Insert parent first
          if (type === 'sqlite') {
            await db.execute(
              sql`INSERT INTO parent_entities (id, name, type) VALUES (${parentId}, ${'test-parent'}, ${'test'})`
            );
            await db.execute(
              sql`INSERT INTO child_entities (id, parent_id, name, order_index, data) VALUES (${childId}, ${parentId}, ${'test-child'}, ${0}, ${JSON.stringify({})})`
            );
          } else {
            await db.execute(
              sql`INSERT INTO parent_entities (id, name, type) VALUES (${parentId}, ${'test-parent'}, ${'test'})`
            );
            await db.execute(
              sql`INSERT INTO child_entities (id, parent_id, name, order_index, data) VALUES (${childId}, ${parentId}, ${'test-child'}, ${0}, ${JSON.stringify({})})`
            );
          }

          // Verify insertion succeeded
          const result =
            type === 'sqlite'
              ? await db.execute(sql`SELECT * FROM child_entities WHERE id = ${childId}`)
              : await db.execute(sql`SELECT * FROM child_entities WHERE id = ${childId}`);

          expect((result.rows || result).length).toBe(1);
          expect((result.rows || result)[0].parent_id).toBe(parentId);
        });
      });

      describe('Data Types', () => {
        it('should correctly handle all data types', async () => {
          const id = v4();
          const testData = {
            varcharCol: 'Test string',
            textCol: 'Long text content here...',
            integerCol: 42,
            decimalCol: '123.45',
            realCol: 3.14159,
            doublePrecisionCol: 2.71828,
            booleanCol: true,
            jsonbCol: { key: 'value', nested: { data: true } },
          };

          if (type === 'sqlite') {
            // SQLite doesn't have all the same types, so we adapt
            const insertQuery = `INSERT INTO all_types (
                      id, varchar_col, text_col, integer_col, 
                      decimal_col, real_col, double_col, 
                      boolean_col, jsonb_col
                    ) VALUES (
                      '${id}', '${testData.varcharCol}', '${testData.textCol}', 
                      ${testData.integerCol}, ${testData.decimalCol}, 
                      ${testData.realCol}, ${testData.doublePrecisionCol}, 
                      ${testData.booleanCol ? 1 : 0}, '${JSON.stringify(testData.jsonbCol)}'::jsonb
                    )`;
            await db.execute(sql.raw(insertQuery));

            const result = await db.execute(sql`SELECT * FROM all_types WHERE id = ${id}`);

            expect((result.rows || result).length).toBe(1);
            const row = (result.rows || result)[0];
            expect(row.varchar_col).toBe(testData.varcharCol);
            expect(row.integer_col).toBe(testData.integerCol);
            expect(row.boolean_col).toBe(1); // SQLite stores as 0/1
          } else {
            const insertQuery = `INSERT INTO all_types (
                      id, varchar_col, text_col, integer_col, 
                      decimal_col, real_col, double_col, 
                      boolean_col, jsonb_col
                    ) VALUES (
                      '${id}', '${testData.varcharCol}', '${testData.textCol}', 
                      ${testData.integerCol}, ${testData.decimalCol}, 
                      ${testData.realCol}, ${testData.doublePrecisionCol}, 
                      ${testData.booleanCol}, '${JSON.stringify(testData.jsonbCol)}'::jsonb
                    )`;
            await db.execute(sql.raw(insertQuery));

            const result = await db.execute(sql`SELECT * FROM all_types WHERE id = ${id}`);

            expect((result.rows || result).length).toBe(1);
            const row = (result.rows || result)[0];
            expect(row.varchar_col).toBe(testData.varcharCol);
            expect(row.integer_col).toBe(testData.integerCol);
            expect(row.boolean_col).toBe(true);
          }
        });

        if (type !== 'sqlite') {
          it('should handle vector columns correctly', async () => {
            const id = v4();
            const vector384 = Array(384)
              .fill(0)
              .map(() => Math.random());

            // For PGLite and PostgreSQL, use parameterized query
            if (type === 'pglite') {
              // PGLite requires a specific approach for vectors
              const vectorStr = `[${vector384.join(',')}]`;
              await db.execute(
                sql`INSERT INTO all_types (
                      id, varchar_col, integer_col, boolean_col, jsonb_col, embedding_384
                    ) VALUES (
                      ${id}, ${'vector test'}, ${1}, ${false}, ${JSON.stringify({})}::jsonb, ${vectorStr}::vector(384)
                    )`
              );
            } else {
              // PostgreSQL: convert vector array to string format
              const vectorStr = `[${vector384.join(',')}]`;
              await db.execute(
                sql`INSERT INTO all_types (
                      id, varchar_col, integer_col, boolean_col, jsonb_col, embedding_384
                    ) VALUES (
                      ${id}, ${'vector test'}, ${1}, ${false}, ${JSON.stringify({})}, ${vectorStr}::vector(384)
                    )`
              );
            }

            // Test vector retrieval
            const result = await db.execute(
              sql`SELECT id, varchar_col 
                  FROM all_types 
                  WHERE id = ${id}`
            );

            expect((result.rows || result).length).toBe(1);
            expect((result.rows || result)[0].varchar_col).toBe('vector test');
          });
        }
      });

      describe('Constraints', () => {
        it('should enforce unique constraints', async () => {
          const id1 = v4();
          const id2 = v4();
          const uniqueValue = 'unique-test-value';

          // Debug: Check if unique constraint exists
          if (type === 'pglite') {
            const constraintCheck = await db.execute(
              sql`SELECT conname FROM pg_constraint 
                  WHERE conname = 'all_types_varchar_unique' 
                  AND contype = 'u'`
            );
            console.log('PGLite unique constraint check:', constraintCheck.rows);

            // Check all constraints on all_types table
            const allConstraints = await db.execute(
              sql`SELECT conname, contype FROM pg_constraint 
                  WHERE conrelid = 'all_types'::regclass`
            );
            console.log('All constraints on all_types:', allConstraints.rows);
          }

          // First insert should succeed
          if (type === 'sqlite') {
            await db.execute(
              sql`INSERT INTO all_types (id, varchar_col, integer_col, boolean_col, jsonb_col) 
                  VALUES (${id1}, ${uniqueValue}, ${1}, ${0}, ${JSON.stringify({})})`
            );
          } else {
            await db.execute(
              sql`INSERT INTO all_types (id, varchar_col, integer_col, boolean_col, jsonb_col) 
                  VALUES (${id1}, ${uniqueValue}, ${1}, ${false}, ${JSON.stringify({})})`
            );
          }

          // Second insert with same varchar_col should fail
          let errorThrown = false;
          try {
            if (type === 'sqlite') {
              await db.execute(
                sql`INSERT INTO all_types (id, varchar_col, integer_col, boolean_col, jsonb_col) 
                    VALUES (${id2}, ${uniqueValue}, ${1}, ${0}, ${JSON.stringify({})})`
              );
            } else {
              await db.execute(
                sql`INSERT INTO all_types (id, varchar_col, integer_col, boolean_col, jsonb_col) 
                    VALUES (${id2}, ${uniqueValue}, ${1}, ${false}, ${JSON.stringify({})})`
              );
            }
          } catch (error) {
            errorThrown = true;
            if (type === 'sqlite') {
              console.log('[TEST] SQLite unique constraint error:', error);
            }
          }

          if (type === 'sqlite' && !errorThrown) {
            // Check if both records were inserted
            const checkResult = await db.execute(
              sql`SELECT * FROM all_types WHERE varchar_col = ${uniqueValue}`
            );
            console.log('[TEST] SQLite records with same unique value:', checkResult.rows.length);
            console.log('[TEST] SQLite records:', checkResult.rows);
          }

          expect(errorThrown).toBe(true);
        });

        it('should enforce foreign key constraints', async () => {
          const childId = v4();
          const nonExistentParentId = v4();

          let errorThrown = false;
          try {
            if (type === 'sqlite') {
              await db.execute(sql`PRAGMA foreign_keys = ON`);
              await db.execute(
                sql`INSERT INTO child_entities (id, parent_id, name) 
                    VALUES (${childId}, ${nonExistentParentId}, ${'orphan'})`
              );
            } else {
              await db.execute(
                sql`INSERT INTO child_entities (id, parent_id, name) 
                    VALUES (${childId}, ${nonExistentParentId}, ${'orphan'})`
              );
            }
          } catch (error) {
            errorThrown = true;
          }

          expect(errorThrown).toBe(true);
        });

        it('should enforce check constraints', async () => {
          const id = v4();

          let errorThrown = false;
          try {
            if (type === 'sqlite') {
              await db.execute(
                sql`INSERT INTO all_types (id, varchar_col, integer_col) 
                    VALUES (${id}, ${'negative test'}, ${-1})`
              );
            } else {
              await db.execute(
                sql`INSERT INTO all_types (id, varchar_col, integer_col) 
                    VALUES (${id}, ${'negative test'}, ${-1})`
              );
            }
          } catch (error) {
            errorThrown = true;
          }

          expect(errorThrown).toBe(true);
        });

        it('should handle cascade deletes', async () => {
          const parentId = v4();
          const childId1 = v4();
          const childId2 = v4();

          if (type === 'sqlite') {
            await db.execute(sql`PRAGMA foreign_keys = ON`);

            // Insert parent
            await db.execute(
              sql`INSERT INTO parent_entities (id, name, type) 
                  VALUES (${parentId}, ${'cascade-parent'}, ${'test'})`
            );

            // Insert children
            await db.execute(
              sql`INSERT INTO child_entities (id, parent_id, name, order_index, data) 
                  VALUES (${childId1}, ${parentId}, ${'child1'}, ${0}, ${JSON.stringify({})})`
            );
            await db.execute(
              sql`INSERT INTO child_entities (id, parent_id, name, order_index, data) 
                  VALUES (${childId2}, ${parentId}, ${'child2'}, ${1}, ${JSON.stringify({})})`
            );

            // Delete parent
            await db.execute(sql`PRAGMA foreign_keys = ON`);
            await db.execute(sql`DELETE FROM parent_entities WHERE id = ${parentId}`);

            // Verify children are deleted
            const result = await db.execute(
              sql`SELECT * FROM child_entities WHERE parent_id = ${parentId}`
            );
            expect((result.rows || result).length).toBe(0);
          } else {
            // Insert parent
            await db.execute(
              sql`INSERT INTO parent_entities (id, name, type) 
                  VALUES (${parentId}, ${'cascade-parent'}, ${'test'})`
            );

            // Insert children
            await db.execute(
              sql`INSERT INTO child_entities (id, parent_id, name, order_index, data) 
                  VALUES (${childId1}, ${parentId}, ${'child1'}, ${0}, ${JSON.stringify({})})`
            );
            await db.execute(
              sql`INSERT INTO child_entities (id, parent_id, name, order_index, data) 
                  VALUES (${childId2}, ${parentId}, ${'child2'}, ${1}, ${JSON.stringify({})})`
            );

            // Delete parent
            await db.execute(sql`DELETE FROM parent_entities WHERE id = ${parentId}`);

            // Verify children are deleted
            const result = await db.execute(
              sql`SELECT * FROM child_entities WHERE parent_id = ${parentId}`
            );
            expect((result.rows || result).length).toBe(0);
          }
        });
      });

      describe('Complex Relationships', () => {
        it('should handle self-referential relationships', async () => {
          const rootId = v4();
          const childId1 = v4();
          const childId2 = v4();
          const grandchildId = v4();

          if (type === 'sqlite') {
            await db.execute(sql`PRAGMA foreign_keys = ON`);

            // Insert root
            await db.execute(
              sql`INSERT INTO hierarchical_entities (id, name, path, level) 
                  VALUES (${rootId}, ${'root'}, ${`/${rootId}`}, ${0})`
            );

            // Insert children
            await db.execute(
              sql`INSERT INTO hierarchical_entities (id, parent_id, name, path, level) 
                  VALUES (${childId1}, ${rootId}, ${'child1'}, ${`/${rootId}/${childId1}`}, ${1})`
            );
            await db.execute(
              sql`INSERT INTO hierarchical_entities (id, parent_id, name, path, level) 
                  VALUES (${childId2}, ${rootId}, ${'child2'}, ${`/${rootId}/${childId2}`}, ${1})`
            );

            // Insert grandchild
            await db.execute(
              sql`INSERT INTO hierarchical_entities (id, parent_id, name, path, level) 
                  VALUES (${grandchildId}, ${childId1}, ${'grandchild'}, ${`/${rootId}/${childId1}/${grandchildId}`}, ${2})`
            );

            // Query hierarchy
            const result = await db.execute(
              sql`SELECT * FROM hierarchical_entities WHERE path LIKE ${`/${rootId}%`} ORDER BY level, name`
            );

            expect((result.rows || result).length).toBe(4);
            expect((result.rows || result)[0].level).toBe(0);
            expect((result.rows || result)[1].level).toBe(1);
            expect((result.rows || result)[3].level).toBe(2);
          } else {
            // Insert root
            await db.execute(
              sql`INSERT INTO hierarchical_entities (id, name, path, level) 
                  VALUES (${rootId}, ${'root'}, ${`/${rootId}`}, ${0})`
            );

            // Insert children
            await db.execute(
              sql`INSERT INTO hierarchical_entities (id, parent_id, name, path, level) 
                  VALUES (${childId1}, ${rootId}, ${'child1'}, ${`/${rootId}/${childId1}`}, ${1})`
            );
            await db.execute(
              sql`INSERT INTO hierarchical_entities (id, parent_id, name, path, level) 
                  VALUES (${childId2}, ${rootId}, ${'child2'}, ${`/${rootId}/${childId2}`}, ${1})`
            );

            // Insert grandchild
            await db.execute(
              sql`INSERT INTO hierarchical_entities (id, parent_id, name, path, level) 
                  VALUES (${grandchildId}, ${childId1}, ${'grandchild'}, ${`/${rootId}/${childId1}/${grandchildId}`}, ${2})`
            );

            // Query hierarchy
            const result = await db.execute(
              sql`SELECT * FROM hierarchical_entities WHERE path LIKE ${`/${rootId}%`} ORDER BY level, name`
            );

            expect((result.rows || result).length).toBe(4);
            expect((result.rows || result)[0].level).toBe(0);
            expect((result.rows || result)[1].level).toBe(1);
            expect((result.rows || result)[3].level).toBe(2);
          }
        });

        it('should handle many-to-many relationships', async () => {
          const parentId1 = v4();
          const parentId2 = v4();
          const childId1 = v4();
          const childId2 = v4();

          // Clean up any existing test data first
          if (type === 'sqlite') {
            await db.execute(sql`DELETE FROM parent_child_relations`);
            await db.execute(sql`DELETE FROM child_entities`);
            await db.execute(sql`DELETE FROM parent_entities`);
          } else {
            await db.execute(sql`DELETE FROM parent_child_relations`);
            await db.execute(sql`DELETE FROM child_entities`);
            await db.execute(sql`DELETE FROM parent_entities`);
          }

          if (type === 'sqlite') {
            await db.execute(sql`PRAGMA foreign_keys = ON`);

            // Insert parents
            await db.execute(
              sql`INSERT INTO parent_entities (id, name, type) VALUES (${parentId1}, ${'parent1'}, ${'type1'})`
            );
            await db.execute(
              sql`INSERT INTO parent_entities (id, name, type) VALUES (${parentId2}, ${'parent2'}, ${'type2'})`
            );

            // Insert children
            await db.execute(
              sql`INSERT INTO child_entities (id, parent_id, name, order_index, data) VALUES (${childId1}, ${parentId1}, ${'child1'}, ${0}, ${JSON.stringify({})})`
            );
            await db.execute(
              sql`INSERT INTO child_entities (id, parent_id, name, order_index, data) VALUES (${childId2}, ${parentId1}, ${'child2'}, ${1}, ${JSON.stringify({})})`
            );

            // Create many-to-many relationships
            await db.execute(
              sql`INSERT INTO parent_child_relations (parent_id, child_id, relation_type, strength) 
                  VALUES (${parentId1}, ${childId1}, ${'primary'}, ${10})`
            );
            await db.execute(
              sql`INSERT INTO parent_child_relations (parent_id, child_id, relation_type, strength) 
                  VALUES (${parentId1}, ${childId2}, ${'secondary'}, ${5})`
            );
            await db.execute(
              sql`INSERT INTO parent_child_relations (parent_id, child_id, relation_type, strength) 
                  VALUES (${parentId2}, ${childId1}, ${'shared'}, ${7})`
            );

            // Query relationships
            const result = await db.execute(
              sql`SELECT p.name as parent_name, c.name as child_name, r.relation_type, r.strength
                  FROM parent_child_relations r
                  JOIN parent_entities p ON r.parent_id = p.id
                  JOIN child_entities c ON r.child_id = c.id
                  ORDER BY p.name, c.name`
            );

            expect((result.rows || result).length).toBe(3);
          } else {
            // Insert parents
            await db.execute(
              sql`INSERT INTO parent_entities (id, name, type) VALUES (${parentId1}, ${'parent1'}, ${'type1'})`
            );
            await db.execute(
              sql`INSERT INTO parent_entities (id, name, type) VALUES (${parentId2}, ${'parent2'}, ${'type2'})`
            );

            // Insert children
            await db.execute(
              sql`INSERT INTO child_entities (id, parent_id, name, order_index, data) VALUES (${childId1}, ${parentId1}, ${'child1'}, ${0}, ${JSON.stringify({})})`
            );
            await db.execute(
              sql`INSERT INTO child_entities (id, parent_id, name, order_index, data) VALUES (${childId2}, ${parentId1}, ${'child2'}, ${1}, ${JSON.stringify({})})`
            );

            // Create many-to-many relationships
            await db.execute(
              sql`INSERT INTO parent_child_relations (parent_id, child_id, relation_type, strength) 
                  VALUES (${parentId1}, ${childId1}, ${'primary'}, ${10})`
            );
            await db.execute(
              sql`INSERT INTO parent_child_relations (parent_id, child_id, relation_type, strength) 
                  VALUES (${parentId1}, ${childId2}, ${'secondary'}, ${5})`
            );
            await db.execute(
              sql`INSERT INTO parent_child_relations (parent_id, child_id, relation_type, strength) 
                  VALUES (${parentId2}, ${childId1}, ${'shared'}, ${7})`
            );

            // Query relationships
            const result = await db.execute(
              sql`SELECT p.name as parent_name, c.name as child_name, r.relation_type, r.strength
                  FROM parent_child_relations r
                  JOIN parent_entities p ON r.parent_id = p.id
                  JOIN child_entities c ON r.child_id = c.id
                  ORDER BY p.name, c.name`
            );

            expect((result.rows || result).length).toBe(3);
          }
        });
      });

      describe('Migration Idempotency', () => {
        it('should handle running migrations multiple times', async () => {
          // Run migrations again
          let errorThrown = false;
          try {
            await migrationService.runAllPluginMigrations();
          } catch (error) {
            errorThrown = true;
            console.error('Migration re-run error:', error);
          }

          expect(errorThrown).toBe(false);

          // Verify tables still exist and data is intact
          const tableCount =
            type === 'sqlite'
              ? (
                  await db.execute(
                    sql`SELECT COUNT(*) as count FROM sqlite_master WHERE type='table'`
                  )
                ).rows[0].count
              : ((
                  await db.execute(
                    sql`SELECT COUNT(*) as count FROM information_schema.tables WHERE table_schema = 'public'`
                  )
                ).rows ||
                  (await db.execute(
                    sql`SELECT COUNT(*) as count FROM information_schema.tables WHERE table_schema = 'public'`
                  )))[0].count;

          expect(Number(tableCount)).toBeGreaterThanOrEqual(6); // At least our 6 test tables
        });
      });

      describe('Retrieval Functions', () => {
        it('should retrieve data with complex joins', async () => {
          let result;

          if (type === 'sqlite') {
            // Complex join query
            result = await db.execute(
              sql`SELECT 
                    p.name as parent_name,
                    c.name as child_name,
                    h.name as hierarchical_name,
                    cr.relation_type,
                    cr.priority
                  FROM complex_relations cr
                  LEFT JOIN parent_entities p ON cr.parent_id = p.id
                  LEFT JOIN child_entities c ON cr.child_id = c.id
                  LEFT JOIN hierarchical_entities h ON cr.hierarchical_id = h.id
                  WHERE cr.is_active = ${1}
                  ORDER BY cr.priority DESC`
            );
          } else {
            result = await db.execute(
              sql`SELECT 
                    p.name as parent_name,
                    c.name as child_name,
                    h.name as hierarchical_name,
                    cr.relation_type,
                    cr.priority
                  FROM complex_relations cr
                  LEFT JOIN parent_entities p ON cr.parent_id = p.id
                  LEFT JOIN child_entities c ON cr.child_id = c.id
                  LEFT JOIN hierarchical_entities h ON cr.hierarchical_id = h.id
                  WHERE cr.is_active = true
                  ORDER BY cr.priority DESC`
            );
          }

          // Result structure should be valid even if empty
          expect(Array.isArray(result.rows || result)).toBe(true);
        });

        it('should perform aggregation queries', async () => {
          let result;

          if (type === 'sqlite') {
            result = await db.execute(
              sql`SELECT 
                    p.type,
                    COUNT(DISTINCT c.id) as child_count,
                    AVG(CAST(pcr.strength AS REAL)) as avg_strength
                  FROM parent_entities p
                  LEFT JOIN child_entities c ON p.id = c.parent_id
                  LEFT JOIN parent_child_relations pcr ON p.id = pcr.parent_id
                  GROUP BY p.type`
            );
          } else {
            result = await db.execute(
              sql`SELECT 
                    p.type,
                    COUNT(DISTINCT c.id) as child_count,
                    AVG(pcr.strength) as avg_strength
                  FROM parent_entities p
                  LEFT JOIN child_entities c ON p.id = c.parent_id
                  LEFT JOIN parent_child_relations pcr ON p.id = pcr.parent_id
                  GROUP BY p.type`
            );
          }

          expect(Array.isArray(result.rows || result)).toBe(true);
        });
      });
    });
  });
});
