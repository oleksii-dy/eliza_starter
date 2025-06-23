import { describe, it, expect, beforeAll, afterAll, afterEach } from 'bun:test';
import { createIsolatedTestDatabase } from '../test-helpers';
import { v4 as uuidv4 } from 'uuid';
import { type UUID } from '@elizaos/core';
import { PgDatabaseAdapter } from '../../pg/adapter';
import { PgliteDatabaseAdapter } from '../../pglite/adapter';
import { schemaRegistry, type TableSchema } from '../../schema-registry';
import { sql } from 'drizzle-orm';

describe('Schema Registry Basic Tests', () => {
  let adapter: PgliteDatabaseAdapter | PgDatabaseAdapter;
  let cleanup: () => Promise<void>;
  let testAgentId: UUID;

  beforeAll(async () => {
    const setup = await createIsolatedTestDatabase('schema-registry-basic-tests');
    adapter = setup.adapter;
    cleanup = setup.cleanup;
    testAgentId = setup.testAgentId;
  }, 30000);

  afterAll(async () => {
    if (cleanup) {
      await cleanup();
    }
  });

  afterEach(() => {
    // Clean up test tables
    const testTables = ['basic_test_table'];
    for (const tableName of testTables) {
      (schemaRegistry as any).tables.delete(tableName);
      (schemaRegistry as any).createdTables.delete(tableName);
    }
  });

  describe('Basic Schema Operations', () => {
    it('should register a simple table schema', () => {
      const basicSchema: TableSchema = {
        name: 'basic_test_table',
        pluginName: 'test-plugin',
        sql: `
          CREATE TABLE IF NOT EXISTS basic_test_table (
            id UUID PRIMARY KEY,
            name TEXT NOT NULL
          )
        `,
        fallbackSql: `
          CREATE TABLE IF NOT EXISTS basic_test_table (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL
          )
        `,
      };

      // Should not throw
      expect(() => {
        schemaRegistry.registerTable(basicSchema);
      }).not.toThrow();

      // Should be registered
      expect(schemaRegistry.getTable('basic_test_table')).toBeDefined();
      expect(schemaRegistry.getTableNames()).toContain('basic_test_table');
    });

    it('should create a registered table', async () => {
      const basicSchema: TableSchema = {
        name: 'basic_test_table',
        pluginName: 'test-plugin',
        sql: `
          CREATE TABLE IF NOT EXISTS basic_test_table (
            id UUID PRIMARY KEY,
            name TEXT NOT NULL
          )
        `,
        fallbackSql: `
          CREATE TABLE IF NOT EXISTS basic_test_table (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL
          )
        `,
      };

      schemaRegistry.registerTable(basicSchema);
      
      const db = adapter.getDatabase();
      const dbType = adapter instanceof PgliteDatabaseAdapter ? 'pglite' : 'postgres';
      
      // Should create table without throwing
      await expect(async () => {
        await schemaRegistry.createTables(db, dbType);
      }).not.toThrow();

      // Should be able to query the table
      const testQuery = 'SELECT 1 FROM basic_test_table WHERE 1=0';
      const result = await db.execute(sql.raw(testQuery));
      expect(result).toBeDefined();
    });

    it('should prevent duplicate registration from different plugins', () => {
      const schema1: TableSchema = {
        name: 'basic_test_table',
        pluginName: 'plugin1',
        sql: 'CREATE TABLE basic_test_table (id INT);',
      };

      const schema2: TableSchema = {
        name: 'basic_test_table',
        pluginName: 'plugin2',
        sql: 'CREATE TABLE basic_test_table (id INT);',
      };

      schemaRegistry.registerTable(schema1);

      expect(() => {
        schemaRegistry.registerTable(schema2);
      }).toThrow(/Table name conflict/);
    });

    it('should handle vector extension gracefully', async () => {
      const vectorSchema: TableSchema = {
        name: 'basic_test_table',
        pluginName: 'test-plugin',
        sql: `
          CREATE TABLE IF NOT EXISTS basic_test_table (
            id UUID PRIMARY KEY,
            embedding vector(384)
          )
        `,
        fallbackSql: `
          CREATE TABLE IF NOT EXISTS basic_test_table (
            id TEXT PRIMARY KEY,
            embedding TEXT
          )
        `,
      };

      schemaRegistry.registerTable(vectorSchema);
      
      const db = adapter.getDatabase();
      const dbType = adapter instanceof PgliteDatabaseAdapter ? 'pglite' : 'postgres';
      
      // Should create table regardless of vector support
      await expect(async () => {
        await schemaRegistry.createTables(db, dbType);
      }).not.toThrow();

      // Verify table exists
      const testQuery = 'SELECT 1 FROM basic_test_table WHERE 1=0';
      const result = await db.execute(sql.raw(testQuery));
      expect(result).toBeDefined();
    });
  });
});