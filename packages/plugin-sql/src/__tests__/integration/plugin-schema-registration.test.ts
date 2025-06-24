import { describe, it, expect, beforeAll, afterAll, afterEach } from 'bun:test';
import { createIsolatedTestDatabase } from '../test-helpers';
import { v4 as uuidv4 } from 'uuid';
import { type UUID, type Plugin } from '@elizaos/core';
import { PgDatabaseAdapter } from '../../pg/adapter';
import { PgliteDatabaseAdapter } from '../../pglite/adapter';
import { schemaRegistry, type TableSchema } from '../../schema-registry';
import { sql } from 'drizzle-orm';

describe('Plugin Schema Registration Tests', () => {
  let adapter: PgliteDatabaseAdapter | PgDatabaseAdapter;
  let cleanup: () => Promise<void>;
  let testAgentId: UUID;

  beforeAll(async () => {
    const setup = await createIsolatedTestDatabase('plugin-schema-tests');
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
    // Clear any test schemas between tests to avoid conflicts
    const testTables = ['test_plugin_table', 'test_dependent_table', 'test_vector_table', 'circular_table_1', 'circular_table_2', 'test_unique_table'];
    for (const tableName of testTables) {
      // Force remove the table from registry
      (schemaRegistry as any).tables.delete(tableName);
      (schemaRegistry as any).createdTables.delete(tableName);
    }
  });

  describe('Plugin Schema Registration', () => {
    it('should register and create plugin tables correctly', async () => {
      // Create a test plugin with custom schema
      const testPluginSchema: TableSchema = {
        name: 'test_plugin_table',
        pluginName: 'test-plugin',
        sql: `
          CREATE TABLE IF NOT EXISTS test_plugin_table (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            agent_id UUID NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
            test_data JSONB NOT NULL DEFAULT '{}',
            created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
          )
        `,
        fallbackSql: `
          CREATE TABLE IF NOT EXISTS test_plugin_table (
            id TEXT PRIMARY KEY,
            agent_id TEXT NOT NULL,
            test_data TEXT NOT NULL DEFAULT '{}',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
          )
        `,
        dependencies: ['agents'], // Depends on agents table
      };

      // Register the test schema
      schemaRegistry.registerTable(testPluginSchema);

      // Verify the table was registered
      expect(schemaRegistry.getTable('test_plugin_table')).toBeDefined();
      expect(schemaRegistry.getTableNames()).toContain('test_plugin_table');

      // Create the table through the schema registry
      const db = adapter.getDatabase();
      await schemaRegistry.createTables(db, adapter instanceof PgliteDatabaseAdapter ? 'pglite' : 'postgres');

      // Verify the table exists and is usable
      const testId = uuidv4();
      const insertSql = adapter instanceof PgliteDatabaseAdapter
        ? `INSERT INTO test_plugin_table (id, agent_id, test_data) VALUES ('${testId}', '${testAgentId}', '{"test": true}')`
        : `INSERT INTO test_plugin_table (id, agent_id, test_data) VALUES ('${testId}', '${testAgentId}', '{"test": true}')`;

      await db.execute(sql.raw(insertSql));

      // Query the data back
      const selectSql = `SELECT * FROM test_plugin_table WHERE id = '${testId}'`;
      const queryResult = await db.execute(sql.raw(selectSql));

      // Handle both direct array results and query response objects
      const result = Array.isArray(queryResult) ? queryResult : queryResult.rows || [queryResult];

      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBeGreaterThan(0);
      expect(result[0].id).toBe(testId);
    });

    it('should handle plugin schema dependencies correctly', async () => {
      // First register the base table that the dependent table will reference
      const baseSchema: TableSchema = {
        name: 'test_plugin_table',
        pluginName: 'test-plugin',
        sql: `
          CREATE TABLE IF NOT EXISTS test_plugin_table (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            agent_id UUID NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
            test_data JSONB NOT NULL DEFAULT '{}'
          )
        `,
        fallbackSql: `
          CREATE TABLE IF NOT EXISTS test_plugin_table (
            id TEXT PRIMARY KEY,
            agent_id TEXT NOT NULL,
            test_data TEXT NOT NULL DEFAULT '{}'
          )
        `,
        dependencies: ['agents'],
      };

      schemaRegistry.registerTable(baseSchema);

      // Create test schemas with dependencies
      const dependentSchema: TableSchema = {
        name: 'test_dependent_table',
        pluginName: 'test-plugin',
        sql: `
          CREATE TABLE IF NOT EXISTS test_dependent_table (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            parent_id UUID NOT NULL REFERENCES test_plugin_table(id) ON DELETE CASCADE,
            data TEXT NOT NULL
          )
        `,
        fallbackSql: `
          CREATE TABLE IF NOT EXISTS test_dependent_table (
            id TEXT PRIMARY KEY,
            parent_id TEXT NOT NULL,
            data TEXT NOT NULL
          )
        `,
        dependencies: ['test_plugin_table'],
      };

      // Register the dependent schema
      schemaRegistry.registerTable(dependentSchema);

      // Get tables in dependency order
      const orderedTables = schemaRegistry.getTablesInOrder();
      const testPluginIndex = orderedTables.findIndex(t => t.name === 'test_plugin_table');
      const dependentIndex = orderedTables.findIndex(t => t.name === 'test_dependent_table');

      // Verify dependency order is correct
      expect(testPluginIndex).toBeGreaterThanOrEqual(0);
      expect(dependentIndex).toBeGreaterThanOrEqual(0);
      expect(testPluginIndex).toBeLessThan(dependentIndex);
    });

    it('should prevent duplicate table registration', async () => {
      // First register a unique table for this test
      const firstSchema: TableSchema = {
        name: 'test_unique_table',
        pluginName: 'first-plugin',
        sql: 'CREATE TABLE test_unique_table (id INT);',
      };

      schemaRegistry.registerTable(firstSchema);

      // Now try to register same table name from different plugin
      const duplicateSchema: TableSchema = {
        name: 'test_unique_table', // Same name as above
        pluginName: 'another-plugin',
        sql: 'CREATE TABLE test_unique_table (id INT);',
      };

      // Should throw an error for duplicate table name from different plugin
      expect(() => {
        schemaRegistry.registerTable(duplicateSchema);
      }).toThrow(/Table name conflict/);
    });

    it('should allow re-registration from same plugin', async () => {
      const samePluginSchema: TableSchema = {
        name: 'test_plugin_table',
        pluginName: 'test-plugin', // Same plugin name
        sql: 'CREATE TABLE test_plugin_table (id INT);',
      };

      // Should not throw error for same plugin re-registering
      expect(() => {
        schemaRegistry.registerTable(samePluginSchema);
      }).not.toThrow();
    });

    it('should detect circular dependencies', async () => {
      const circularSchema1: TableSchema = {
        name: 'circular_table_1',
        pluginName: 'test-plugin',
        sql: 'CREATE TABLE circular_table_1 (id INT);',
        dependencies: ['circular_table_2'],
      };

      const circularSchema2: TableSchema = {
        name: 'circular_table_2',
        pluginName: 'test-plugin',
        sql: 'CREATE TABLE circular_table_2 (id INT);',
        dependencies: ['circular_table_1'],
      };

      // Register both schemas
      schemaRegistry.registerTable(circularSchema1);
      schemaRegistry.registerTable(circularSchema2);

      // Should throw error when getting tables in order
      expect(() => {
        schemaRegistry.getTablesInOrder();
      }).toThrow(/Circular dependency detected/);
    });
  });

  describe('Vector Extension Handling', () => {
    it('should handle vector availability gracefully', async () => {
      const vectorSchema: TableSchema = {
        name: 'test_vector_table',
        pluginName: 'test-plugin',
        sql: `
          CREATE TABLE IF NOT EXISTS test_vector_table (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            embedding vector(384),
            text_content TEXT NOT NULL
          )
        `,
        fallbackSql: `
          CREATE TABLE IF NOT EXISTS test_vector_table (
            id TEXT PRIMARY KEY,
            embedding TEXT,
            text_content TEXT NOT NULL
          )
        `,
      };

      // Register the vector schema
      schemaRegistry.registerTable(vectorSchema);

      // Create the table (should use fallback for PGLite, regular for PostgreSQL)
      const db = adapter.getDatabase();

      // This should not throw regardless of vector support
      await expect(async () => {
        await schemaRegistry.createTables(db, adapter instanceof PgliteDatabaseAdapter ? 'pglite' : 'postgres');
      }).not.toThrow();

      // Verify table exists
      const testQuery = 'SELECT 1 FROM test_vector_table WHERE 1=0';
      const result = await db.execute(sql.raw(testQuery));
      expect(result).toBeDefined();
    });
  });
});
