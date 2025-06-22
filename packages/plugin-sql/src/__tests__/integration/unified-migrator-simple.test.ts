import { describe, it, expect } from 'vitest';
import { v4 as uuidv4 } from 'uuid';
import { sql } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { logger, type UUID } from '@elizaos/core';
import { UnifiedMigrator } from '../../unified-migrator';
import { schemaRegistry, type TableSchema } from '../../schema-registry';
import { createIsolatedTestDatabase } from '../test-helpers';

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

describe('Unified Migrator - Simple Hello World Test', () => {
  it('should successfully create hello world plugin tables using unified migrator', async () => {
    // Clear the schema registry first
    schemaRegistry.clear();

    // Skip if no PostgreSQL
    if (!process.env.POSTGRES_URL) {
      console.log('Skipping test - POSTGRES_URL not set');
      return;
    }

    // Create isolated test setup
    const { adapter, runtime, cleanup, testAgentId } = await createIsolatedTestDatabase(
      'unified_migrator_simple',
      [] // No extra plugins - we'll register tables manually
    );

    try {
      // Get the database instance from the adapter
      const db = adapter.getDatabase();

      // Create migrator
      const migrator = new UnifiedMigrator(db, 'postgres', testAgentId);

      // Register hello world tables
      await migrator.registerPluginTables(HELLO_WORLD_TABLES);

      // Initialize migrator (skip if already initialized by adapter)
      if (!migrator.isInitialized()) {
        await migrator.initialize();
      }

      // Create a direct connection to verify tables
      const schemaName = `test_unified_migrator_simple_${Date.now()}`.replace(/-/g, '_').slice(0, 63);
      const sql_ = postgres(process.env.POSTGRES_URL);
      const directDb = drizzle(sql_);

      try {
        // Verify tables were created by querying them directly
        const result1 = await db.execute(sql`
          INSERT INTO hello_world (id, message, author, agent_id)
          VALUES (${uuidv4()}, 'Test message', 'Test author', ${testAgentId})
          RETURNING id
        `);
        expect(result1.rows).toHaveLength(1);

        const result2 = await db.execute(sql`
          INSERT INTO greetings (id, greeting, language, agent_id)
          VALUES (${uuidv4()}, 'Hello', 'en', ${testAgentId})
          RETURNING id
        `);
        expect(result2.rows).toHaveLength(1);

        // Verify we can query the data
        const messages = await db.execute(sql`
          SELECT * FROM hello_world WHERE agent_id = ${testAgentId}
        `);
        expect(messages.rows).toHaveLength(1);
        expect(messages.rows[0].message).toBe('Test message');

        const greetings = await db.execute(sql`
          SELECT * FROM greetings WHERE agent_id = ${testAgentId}
        `);
        expect(greetings.rows).toHaveLength(1);
        expect(greetings.rows[0].greeting).toBe('Hello');

        logger.info('✅ Hello world plugin tables created and working successfully');
      } finally {
        await sql_.end();
      }
    } finally {
      await cleanup();
    }
  });

  it('should register and use plugin tables alongside core tables', async () => {
    // Clear the schema registry first
    schemaRegistry.clear();

    // Skip if no PostgreSQL
    if (!process.env.POSTGRES_URL) {
      console.log('Skipping test - POSTGRES_URL not set');
      return;
    }

    // Create isolated test setup
    const { adapter, runtime, cleanup, testAgentId } = await createIsolatedTestDatabase(
      'unified_migrator_with_core',
      []
    );

    try {
      const db = adapter.getDatabase();

      // Verify core tables exist (created by adapter initialization)
      const agents = await db.execute(sql`
        SELECT * FROM agents WHERE id = ${testAgentId}
      `);
      expect(agents.rows.length).toBeGreaterThan(0);

      // Create migrator and add plugin tables
      const migrator = new UnifiedMigrator(db, 'postgres', testAgentId);
      await migrator.registerPluginTables(HELLO_WORLD_TABLES);
      
      // Re-initialize to create plugin tables  
      await migrator.reinitialize();

      // Test plugin tables work
      const messageId = uuidv4();
      await db.execute(sql`
        INSERT INTO hello_world (id, message, agent_id)
        VALUES (${messageId}, 'Plugin table works!', ${testAgentId})
      `);

      // Test core and plugin tables can be queried together
      const coreCount = await db.execute(sql`SELECT COUNT(*) as count FROM entities`);
      const pluginCount = await db.execute(sql`SELECT COUNT(*) as count FROM hello_world`);
      
      expect(Number(coreCount.rows[0].count)).toBeGreaterThanOrEqual(0);
      expect(Number(pluginCount.rows[0].count)).toBeGreaterThanOrEqual(1);

      logger.info('✅ Core and plugin tables working together successfully');
    } finally {
      await cleanup();
    }
  });
}); 