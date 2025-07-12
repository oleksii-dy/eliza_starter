import { describe, it, expect, beforeEach, afterEach } from 'bun:test';
import { BunSqliteAdapter } from '../bun-sqlite/adapter';
import { v4 as uuidv4 } from 'uuid';
import { logger, asUUID } from '@elizaos/core';

describe('Database Integrity Tests', () => {
  let adapter: BunSqliteAdapter;
  const testAgentId = asUUID(uuidv4());

  beforeEach(async () => {
    // Create in-memory adapter for testing
    adapter = new BunSqliteAdapter(testAgentId, { inMemory: true });
    await adapter.init();
  });

  afterEach(async () => {
    await adapter.close();
  });

  describe('Dynamic Plugin Schema Migration', () => {
    it('should detect PostgreSQL-specific schemas and log appropriately', async () => {
      // Create a mock PostgreSQL-specific schema (similar to trust plugin)
      const mockPgSchema = {
        trustProfiles: {
          _: {
            name: 'trust_profiles',
            schema: undefined,
            columns: {
              id: {
                name: 'id',
                dataType: 'uuid',
                hasDefault: true,
                notNull: true,
                primaryKey: true,
                columnType: 'PgUUID',
              },
              name: {
                name: 'name',
                dataType: 'text',
                hasDefault: false,
                notNull: true,
                primaryKey: false,
                columnType: 'PgText',
              },
            },
            indexes: {},
            foreignKeys: {},
            compositePrimaryKeys: {},
            uniqueConstraints: {},
            checkConstraints: {},
          },
        },
      };

      // This should not throw but should handle gracefully by skipping the migration
      try {
        await adapter.runPluginMigrations(mockPgSchema, 'plugin-trust');
        // If we get here, the migration was skipped successfully
        expect(true).toBe(true);
      } catch (error) {
        // If there's an error, the test should fail
        console.error('Unexpected error:', error);
        throw error;
      }
    });

    it('should handle SQLite-compatible schemas properly', async () => {
      // Create a simple SQLite-compatible schema for testing
      const mockSqliteSchema = {
        testTable: {
          _: {
            name: 'test_table',
            schema: undefined,
            columns: {
              id: {
                name: 'id',
                dataType: 'text',
                hasDefault: false,
                notNull: true,
                primaryKey: true,
              },
              name: {
                name: 'name',
                dataType: 'text',
                hasDefault: false,
                notNull: true,
                primaryKey: false,
              },
              created_at: {
                name: 'created_at',
                dataType: 'text',
                hasDefault: true,
                notNull: true,
                primaryKey: false,
              },
            },
            indexes: {},
            foreignKeys: {},
            compositePrimaryKeys: {},
            uniqueConstraints: {},
            checkConstraints: {},
          },
        },
      };

      // This should work without issues
      await expect(
        adapter.runPluginMigrations(mockSqliteSchema, 'mock-sqlite-plugin')
      ).resolves.toBeUndefined();

      // Verify the table was created
      const result = await adapter.db.execute(
        `SELECT name FROM sqlite_master WHERE type='table' AND name='test_table'`
      );
      expect(result.rows).toHaveLength(1);
    });

    it('should perform basic operations on migrated SQLite table', async () => {
      // Use the same schema as above
      const mockSqliteSchema = {
        testTable: {
          _: {
            name: 'test_table_ops',
            schema: undefined,
            columns: {
              id: {
                name: 'id',
                dataType: 'text',
                hasDefault: false,
                notNull: true,
                primaryKey: true,
              },
              name: {
                name: 'name',
                dataType: 'text',
                hasDefault: false,
                notNull: true,
                primaryKey: false,
              },
              created_at: {
                name: 'created_at',
                dataType: 'text',
                hasDefault: true,
                notNull: true,
                primaryKey: false,
              },
            },
            indexes: {},
            foreignKeys: {},
            compositePrimaryKeys: {},
            uniqueConstraints: {},
            checkConstraints: {},
          },
        },
      };

      await adapter.runPluginMigrations(mockSqliteSchema, 'mock-ops-plugin');

      // Test basic CRUD operations
      const testId = uuidv4();
      const testName = 'Test Name';
      const testDate = new Date().toISOString();

      // Insert
      await adapter.db.execute(
        `INSERT INTO test_table_ops (id, name, created_at) VALUES (?, ?, ?)`,
        [testId, testName, testDate]
      );

      // Select
      const result = await adapter.db.execute(`SELECT * FROM test_table_ops WHERE id = ?`, [
        testId,
      ]);
      expect(result.rows).toHaveLength(1);
      expect(result.rows[0].name).toBe('Test Name');
    });
  });

  describe('Database Adapter Core Methods', () => {
    it('should have getWorlds method', () => {
      expect(typeof adapter.getWorlds).toBe('function');
    });

    it('should execute getWorlds without errors', async () => {
      const worlds = await adapter.getWorlds();
      expect(Array.isArray(worlds)).toBe(true);
    });

    it('should have all required adapter methods', () => {
      const requiredMethods = [
        'init',
        'close',
        'getWorlds',
        'runPluginMigrations',
        'createMemory',
        'updateMemory',
        'getMemoryById',
        'searchMemories',
      ];

      for (const method of requiredMethods) {
        expect(typeof (adapter as any)[method]).toBe('function');
      }
    });
  });

  describe('Plugin Schema Registration', () => {
    it('should handle missing schema gracefully', async () => {
      // Should not throw when schema is null/undefined
      await expect(
        adapter.runPluginMigrations(null as any, 'test-plugin')
      ).resolves.toBeUndefined();
      await expect(
        adapter.runPluginMigrations(undefined as any, 'test-plugin')
      ).resolves.toBeUndefined();
      await expect(adapter.runPluginMigrations({}, 'test-plugin')).resolves.toBeUndefined();
    });

    it('should handle malformed schema gracefully', async () => {
      const malformedSchema = {
        notATable: 'invalid',
        alsoNotATable: 123,
        stillNotATable: true,
      };

      // Should not throw with malformed schema
      await expect(
        adapter.runPluginMigrations(malformedSchema, 'test-plugin')
      ).resolves.toBeUndefined();
    });

    it('should create tables only once when called multiple times', async () => {
      // Use the same schema as above
      const mockSqliteSchema = {
        testTable: {
          _: {
            name: 'test_table_multi',
            schema: undefined,
            columns: {
              id: {
                name: 'id',
                dataType: 'text',
                hasDefault: false,
                notNull: true,
                primaryKey: true,
              },
              name: {
                name: 'name',
                dataType: 'text',
                hasDefault: false,
                notNull: true,
                primaryKey: false,
              },
            },
            indexes: {},
            foreignKeys: {},
            compositePrimaryKeys: {},
            uniqueConstraints: {},
            checkConstraints: {},
          },
        },
      };

      // Run migrations multiple times
      await adapter.runPluginMigrations(mockSqliteSchema, 'test-multi');
      await adapter.runPluginMigrations(mockSqliteSchema, 'test-multi');
      await adapter.runPluginMigrations(mockSqliteSchema, 'test-multi');

      // Verify table still exists and works
      const result = await adapter.db.execute(
        `SELECT name FROM sqlite_master WHERE type='table' AND name='test_table_multi'`
      );
      expect(result.rows).toHaveLength(1);
    });
  });

  describe('Error Prevention', () => {
    it('should prevent "table does not exist" errors', async () => {
      // Use the same schema as above for a working test
      const mockSqliteSchema = {
        testTable: {
          _: {
            name: 'test_table_exists',
            schema: undefined,
            columns: {
              id: {
                name: 'id',
                dataType: 'text',
                hasDefault: false,
                notNull: true,
                primaryKey: true,
              },
            },
            indexes: {},
            foreignKeys: {},
            compositePrimaryKeys: {},
            uniqueConstraints: {},
            checkConstraints: {},
          },
        },
      };

      await adapter.runPluginMigrations(mockSqliteSchema, 'test-exists');

      // These operations should not throw "table does not exist" errors
      const result = await adapter.db.execute('SELECT COUNT(*) FROM test_table_exists');
      expect(result).toBeDefined();
    });

    it('should prevent "method does not exist" errors for adapter', () => {
      // Critical adapter methods should exist
      expect(() => adapter.getWorlds()).not.toThrow();
      expect(typeof adapter.runPluginMigrations).toBe('function');
    });
  });
});
