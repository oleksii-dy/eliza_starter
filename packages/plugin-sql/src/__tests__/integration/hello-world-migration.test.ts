import { describe, it, expect, beforeEach } from 'vitest';
import { v4 as uuidv4 } from 'uuid';
import { sql } from 'drizzle-orm';
import { logger, type UUID } from '@elizaos/core';
import { schemaRegistry, type TableSchema } from '../../schema-registry';
import { PgliteDatabaseAdapter } from '../../pglite/adapter';
import { connectionRegistry } from '../../connection-registry';

// Convert hello world plugin schema to TableSchema format
const HELLO_WORLD_TABLES: TableSchema[] = [
  {
    name: 'hello_world',
    pluginName: 'hello-world',
    sql: `
      CREATE TABLE IF NOT EXISTS hello_world (
        id TEXT PRIMARY KEY,
        message TEXT NOT NULL,
        author TEXT DEFAULT 'anonymous',
        agent_id TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
      )
    `,
    dependencies: [],
  },
  {
    name: 'greetings',
    pluginName: 'hello-world',
    sql: `
      CREATE TABLE IF NOT EXISTS greetings (
        id TEXT PRIMARY KEY,
        greeting TEXT NOT NULL,
        language TEXT NOT NULL DEFAULT 'en',
        is_active TEXT NOT NULL DEFAULT 'true',
        agent_id TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
      )
    `,
    dependencies: [],
  },
];

describe('Hello World Plugin Migration with Unified Migrator', () => {
  let adapter: PgliteDatabaseAdapter;
  let testAgentId: UUID;

  beforeEach(() => {
    // Clear the schema registry before each test
    schemaRegistry.clear();
    testAgentId = uuidv4() as UUID;
  });

  it('should successfully migrate hello world plugin tables using PGLite', async () => {
    // Use unique memory database
    const dataDir = `:memory:hello_world_test_${Date.now()}`;
    
    try {
      // Create PGLite adapter
      const connectionManager = connectionRegistry.getPGLiteManager(dataDir);
      await connectionManager.initialize();
      adapter = new PgliteDatabaseAdapter(testAgentId, connectionManager, dataDir);

      // Initialize adapter - this will create core tables
      await adapter.init();

      // Now register and create plugin tables using the schema registry directly
      schemaRegistry.registerTables(HELLO_WORLD_TABLES);
      
      // Get the database instance and create plugin tables
      const db = adapter.getDatabase();
      await schemaRegistry.createTables(db, 'pglite');

      // Verify plugin tables were created by inserting data
      const messageId = uuidv4();
      await db.execute(sql`
        INSERT INTO hello_world (id, message, author, agent_id)
        VALUES (${messageId}, 'Hello from PGLite!', 'Test Author', ${testAgentId})
      `);

      const greetingId = uuidv4();
      await db.execute(sql`
        INSERT INTO greetings (id, greeting, language, agent_id)
        VALUES (${greetingId}, 'Bonjour', 'fr', ${testAgentId})
      `);

      // Query the data to verify it was inserted
      const messages = await db.execute(sql`
        SELECT * FROM hello_world WHERE id = ${messageId}
      `);
      expect(messages.rows).toHaveLength(1);
      expect(messages.rows[0].message).toBe('Hello from PGLite!');

      const greetings = await db.execute(sql`
        SELECT * FROM greetings WHERE id = ${greetingId}
      `);
      expect(greetings.rows).toHaveLength(1);
      expect(greetings.rows[0].greeting).toBe('Bonjour');

      logger.info('✅ Hello world plugin tables created and tested successfully with PGLite');
    } finally {
      if (adapter) {
        await adapter.close();
      }
      await connectionRegistry.cleanup();
    }
  });

  it('should demonstrate plugin registration workflow', async () => {
    const dataDir = `:memory:workflow_test_${Date.now()}`;
    
    try {
      // Step 1: Create adapter
      const connectionManager = connectionRegistry.getPGLiteManager(dataDir);
      await connectionManager.initialize();
      adapter = new PgliteDatabaseAdapter(testAgentId, connectionManager, dataDir);
      await adapter.init();

      // Step 2: Plugin registers its tables
      logger.info('📦 Plugin: Registering hello world tables...');
      schemaRegistry.registerTables(HELLO_WORLD_TABLES);

      // Step 3: Create the tables
      logger.info('🔨 Creating plugin tables...');
      const db = adapter.getDatabase();
      await schemaRegistry.createTables(db, 'pglite');

      // Step 4: Verify registration
      const registeredTables = schemaRegistry.getTableNames();
      expect(registeredTables).toContain('hello_world');
      expect(registeredTables).toContain('greetings');

      // Step 5: Use the tables
      const testData = [
        { id: uuidv4(), message: 'First message', agent_id: testAgentId },
        { id: uuidv4(), message: 'Second message', agent_id: testAgentId },
      ];

      for (const data of testData) {
        await db.execute(sql`
          INSERT INTO hello_world (id, message, agent_id)
          VALUES (${data.id}, ${data.message}, ${data.agent_id})
        `);
      }

      const count = await db.execute(sql`
        SELECT COUNT(*) as count FROM hello_world WHERE agent_id = ${testAgentId}
      `);
      expect(Number(count.rows[0].count)).toBe(2);

      logger.info('✅ Plugin registration workflow completed successfully');
    } finally {
      if (adapter) {
        await adapter.close();
      }
      await connectionRegistry.cleanup();
    }
  });

  it('should handle multiple plugins with table dependencies', async () => {
    const dataDir = `:memory:multi_plugin_test_${Date.now()}`;
    
    // Additional plugin tables that depend on hello_world
    const EXTENSION_TABLES: TableSchema[] = [
      {
        name: 'hello_world_stats',
        pluginName: 'hello-world-analytics',
        sql: `
          CREATE TABLE IF NOT EXISTS hello_world_stats (
            id TEXT PRIMARY KEY,
            hello_world_id TEXT NOT NULL,
            view_count INTEGER DEFAULT 0,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
          )
        `,
        dependencies: ['hello_world'],
      },
    ];

    try {
      // Create adapter
      const connectionManager = connectionRegistry.getPGLiteManager(dataDir);
      await connectionManager.initialize();
      adapter = new PgliteDatabaseAdapter(testAgentId, connectionManager, dataDir);
      await adapter.init();

      // Register both plugins' tables
      schemaRegistry.registerTables(HELLO_WORLD_TABLES);
      schemaRegistry.registerTables(EXTENSION_TABLES);

      // Create all tables (should respect dependencies)
      const db = adapter.getDatabase();
      await schemaRegistry.createTables(db, 'pglite');

      // Verify dependency order was respected by using the tables
      const helloId = uuidv4();
      await db.execute(sql`
        INSERT INTO hello_world (id, message, agent_id)
        VALUES (${helloId}, 'Message with stats', ${testAgentId})
      `);

      const statsId = uuidv4();
      await db.execute(sql`
        INSERT INTO hello_world_stats (id, hello_world_id, view_count)
        VALUES (${statsId}, ${helloId}, 5)
      `);

      // Query joined data
      const results = await db.execute(sql`
        SELECT h.message, s.view_count 
        FROM hello_world h
        JOIN hello_world_stats s ON s.hello_world_id = h.id
        WHERE h.id = ${helloId}
      `);

      expect(results.rows).toHaveLength(1);
      expect(results.rows[0].message).toBe('Message with stats');
      expect(Number(results.rows[0].view_count)).toBe(5);

      logger.info('✅ Multi-plugin table dependencies handled correctly');
    } finally {
      if (adapter) {
        await adapter.close();
      }
      await connectionRegistry.cleanup();
    }
  });
}); 