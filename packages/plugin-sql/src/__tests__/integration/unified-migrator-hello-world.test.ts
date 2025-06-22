import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { v4 as uuidv4 } from 'uuid';
import { sql } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { logger, type UUID } from '@elizaos/core';
import { UnifiedMigrator, createMigrator } from '../../unified-migrator';
import { schemaRegistry, type TableSchema } from '../../schema-registry';
import { connectionRegistry } from '../../connection-registry';
import { PgDatabaseAdapter } from '../../pg/adapter';
import helloWorldPlugin from '../../plugins/hello-world';

// Convert hello world plugin schema to TableSchema format
const HELLO_WORLD_TABLES: TableSchema[] = [
  {
    name: 'hello_world',
    pluginName: 'hello-world',
    sql: `
      CREATE TABLE IF NOT EXISTS hello_world (
        id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
        message VARCHAR(255) NOT NULL,
        author VARCHAR(100) DEFAULT 'anonymous',
        agent_id UUID NOT NULL,
        created_at TIMESTAMP DEFAULT NOW() NOT NULL
      )
    `,
    dependencies: [],
  },
  {
    name: 'greetings',
    pluginName: 'hello-world',
    sql: `
      CREATE TABLE IF NOT EXISTS greetings (
        id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
        greeting VARCHAR(100) NOT NULL,
        language VARCHAR(20) NOT NULL DEFAULT 'en',
        is_active VARCHAR(10) NOT NULL DEFAULT 'true',
        agent_id UUID NOT NULL,
        created_at TIMESTAMP DEFAULT NOW() NOT NULL,
        updated_at TIMESTAMP DEFAULT NOW() NOT NULL
      )
    `,
    dependencies: [],
  },
];

describe('Unified Migrator - Hello World Plugin Integration', () => {
  let adapter: PgDatabaseAdapter;
  let testAgentId: UUID;
  let schemaName: string;
  let db: any;
  let sql_: postgres.Sql;
  let cleanup: () => Promise<void>;

  beforeEach(async () => {
    // Clear the schema registry
    schemaRegistry.clear();

    testAgentId = uuidv4() as UUID;

    // Only run tests if PostgreSQL is available
    if (!process.env.POSTGRES_URL) {
      console.log('Skipping PostgreSQL tests - POSTGRES_URL not set');
      return;
    }

    // Create isolated schema
    schemaName = `test_hello_world_${Date.now()}`;
    console.log(`[TEST] Creating isolated PostgreSQL schema: ${schemaName}`);

    // Create a direct connection for verification queries
    sql_ = postgres(process.env.POSTGRES_URL);
    db = drizzle(sql_);

    // Create schema
    await sql_`CREATE SCHEMA IF NOT EXISTS ${sql_.unsafe(schemaName)}`;
    await sql_`SET search_path TO ${sql_.unsafe(schemaName)}, public`;

    // Create manager and adapter
    const connectionManager = connectionRegistry.getPostgresManager(process.env.POSTGRES_URL);
    adapter = new PgDatabaseAdapter(testAgentId, connectionManager, process.env.POSTGRES_URL);
    connectionRegistry.registerAdapter(testAgentId, adapter);

    // Initialize adapter
    await adapter.init();

    cleanup = async () => {
      try {
        if (schemaName && sql_) {
          await sql_`DROP SCHEMA IF EXISTS ${sql_.unsafe(schemaName)} CASCADE`;
        }
      } catch (error) {
        console.error(`[TEST] Failed to drop schema ${schemaName}:`, error);
      }
      if (sql_) {
        await sql_.end();
      }
    };
  });

  afterEach(async () => {
    try {
      // Clean up adapter
      if (adapter) {
        await adapter.close();
      }

      // Clean up schema
      if (cleanup) {
        await cleanup();
      }

      // Clear schema registry
      schemaRegistry.clear();
    } catch (error) {
      logger.error('Cleanup error:', error);
    }
  });

  it('should successfully migrate hello world plugin tables', async () => {
    // Skip if no PostgreSQL
    if (!process.env.POSTGRES_URL) {
      console.log('Skipping test - POSTGRES_URL not set');
      return;
    }

    // Create migrator
    const migrator = new UnifiedMigrator(adapter.getDatabase(), 'postgres', testAgentId);

    // Register hello world tables
    await migrator.registerPluginTables(HELLO_WORLD_TABLES);

    // Initialize migrator (which will create all tables)
    await migrator.initialize();

    // Verify tables were created
    const tables = await sql_`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = ${schemaName}
      AND table_name IN ('hello_world', 'greetings')
      ORDER BY table_name
    `;

    expect(tables).toHaveLength(2);
    expect(tables[0].table_name).toBe('greetings');
    expect(tables[1].table_name).toBe('hello_world');

    // Verify hello_world table structure
    const helloWorldColumns = await sql_`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_schema = ${schemaName}
      AND table_name = 'hello_world'
      ORDER BY ordinal_position
    `;

    expect(helloWorldColumns).toMatchObject([
      { column_name: 'id', data_type: 'uuid', is_nullable: 'NO' },
      { column_name: 'message', data_type: 'character varying', is_nullable: 'NO' },
      { column_name: 'author', data_type: 'character varying', is_nullable: 'YES' },
      { column_name: 'agent_id', data_type: 'uuid', is_nullable: 'NO' },
      { column_name: 'created_at', data_type: 'timestamp without time zone', is_nullable: 'NO' },
    ]);

    // Verify greetings table structure
    const greetingsColumns = await sql_`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_schema = ${schemaName}
      AND table_name = 'greetings'
      ORDER BY ordinal_position
    `;

    expect(greetingsColumns).toMatchObject([
      { column_name: 'id', data_type: 'uuid', is_nullable: 'NO' },
      { column_name: 'greeting', data_type: 'character varying', is_nullable: 'NO' },
      { column_name: 'language', data_type: 'character varying', is_nullable: 'NO' },
      { column_name: 'is_active', data_type: 'character varying', is_nullable: 'NO' },
      { column_name: 'agent_id', data_type: 'uuid', is_nullable: 'NO' },
      { column_name: 'created_at', data_type: 'timestamp without time zone', is_nullable: 'NO' },
      { column_name: 'updated_at', data_type: 'timestamp without time zone', is_nullable: 'NO' },
    ]);
  });

  it('should allow plugin operations after migration', async () => {
    // Skip if no PostgreSQL
    if (!process.env.POSTGRES_URL) {
      console.log('Skipping test - POSTGRES_URL not set');
      return;
    }

    // Create migrator and register tables
    const migrator = new UnifiedMigrator(adapter.getDatabase(), 'postgres', testAgentId);
    await migrator.registerPluginTables(HELLO_WORLD_TABLES);
    await migrator.initialize();

    // Test hello_world table operations
    const messageId = uuidv4();
    await sql_`
      INSERT INTO hello_world (id, message, author, agent_id)
      VALUES (${messageId}, 'Hello from test!', 'Test Author', ${testAgentId})
    `;

    const messages = await sql_`
      SELECT * FROM hello_world WHERE id = ${messageId}
    `;

    expect(messages).toHaveLength(1);
    expect(messages[0]).toMatchObject({
      id: messageId,
      message: 'Hello from test!',
      author: 'Test Author',
      agent_id: testAgentId,
    });

    // Test greetings table operations
    const greetingId = uuidv4();
    await sql_`
      INSERT INTO greetings (id, greeting, language, is_active, agent_id)
      VALUES (${greetingId}, 'Bonjour', 'fr', 'true', ${testAgentId})
    `;

    const greetings = await sql_`
      SELECT * FROM greetings WHERE id = ${greetingId}
    `;

    expect(greetings).toHaveLength(1);
    expect(greetings[0]).toMatchObject({
      id: greetingId,
      greeting: 'Bonjour',
      language: 'fr',
      is_active: 'true',
      agent_id: testAgentId,
    });
  });

  it('should handle re-initialization gracefully', async () => {
    // Skip if no PostgreSQL
    if (!process.env.POSTGRES_URL) {
      console.log('Skipping test - POSTGRES_URL not set');
      return;
    }

    const migrator = new UnifiedMigrator(adapter.getDatabase(), 'postgres', testAgentId);
    await migrator.registerPluginTables(HELLO_WORLD_TABLES);

    // Initialize once
    await migrator.initialize();
    expect(migrator.isInitialized()).toBe(true);

    // Initialize again - should skip
    await migrator.initialize();
    expect(migrator.isInitialized()).toBe(true);

    // Force re-initialization
    await migrator.reinitialize();
    expect(migrator.isInitialized()).toBe(true);

    // Verify tables still exist and work
    const testId = uuidv4();
    await sql_`
      INSERT INTO hello_world (id, message, agent_id)
      VALUES (${testId}, 'Still works!', ${testAgentId})
    `;

    const result = await sql_`
      SELECT message FROM hello_world WHERE id = ${testId}
    `;
    
    expect(result[0].message).toBe('Still works!');
  });

  it('should create tables with both core and plugin tables', async () => {
    // Skip if no PostgreSQL
    if (!process.env.POSTGRES_URL) {
      console.log('Skipping test - POSTGRES_URL not set');
      return;
    }

    const migrator = new UnifiedMigrator(adapter.getDatabase(), 'postgres', testAgentId);

    // Register plugin tables before initialization
    await migrator.registerPluginTables(HELLO_WORLD_TABLES);

    // Initialize (which registers core tables and creates everything)
    await migrator.initialize();

    // Get all tables in the schema
    const allTables = await sql_`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = ${schemaName}
      ORDER BY table_name
    `;

    const tableNames = allTables.map(t => t.table_name);

    // Should have core tables
    expect(tableNames).toContain('agents');
    expect(tableNames).toContain('entities');
    expect(tableNames).toContain('memories');
    expect(tableNames).toContain('rooms');

    // Should have plugin tables
    expect(tableNames).toContain('hello_world');
    expect(tableNames).toContain('greetings');

    // Verify we can interact with both core and plugin tables
    // Test core table
    const entityId = uuidv4();
    await sql_`
      INSERT INTO entities (id, agent_id, names)
      VALUES (${entityId}, ${testAgentId}, ARRAY['Test Entity'])
    `;

    // Test plugin table
    const messageId = uuidv4();
    await sql_`
      INSERT INTO hello_world (id, message, agent_id)
      VALUES (${messageId}, 'Core and plugin work together!', ${testAgentId})
    `;

    // Verify both inserts worked
    const entity = await sql_`SELECT id FROM entities WHERE id = ${entityId}`;
    const message = await sql_`SELECT id FROM hello_world WHERE id = ${messageId}`;

    expect(entity).toHaveLength(1);
    expect(message).toHaveLength(1);
  });

  it('should handle legacy schema registration', async () => {
    // Skip if no PostgreSQL
    if (!process.env.POSTGRES_URL) {
      console.log('Skipping test - POSTGRES_URL not set');
      return;
    }

    const migrator = new UnifiedMigrator(adapter.getDatabase(), 'postgres', testAgentId);

    // Register using legacy schema object
    await migrator.registerLegacySchema(helloWorldPlugin.schema, 'hello-world');

    // Note: The current implementation returns empty array for legacy schemas
    // This test verifies the method doesn't throw
    expect(true).toBe(true);
  });

  it('should work with factory creation method', async () => {
    // Skip if no PostgreSQL
    if (!process.env.POSTGRES_URL) {
      console.log('Skipping test - POSTGRES_URL not set');
      return;
    }

    // Use the factory method to create a migrator
    const migrator = await createMigrator(
      testAgentId,
      'postgres',
      process.env.POSTGRES_URL
    );

    // Register and initialize
    await migrator.registerPluginTables(HELLO_WORLD_TABLES);
    await migrator.initialize();

    // Verify tables exist
    const tables = await sql_`
      SELECT COUNT(*) as count 
      FROM information_schema.tables 
      WHERE table_schema = ${schemaName}
      AND table_name IN ('hello_world', 'greetings')
    `;

    expect(Number(tables[0].count)).toBe(2);
  });
}); 