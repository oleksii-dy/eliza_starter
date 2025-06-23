import { describe, it, expect, beforeAll, afterAll } from 'bun:test';
import { PgliteDatabaseAdapter } from '../../pglite/adapter';
import { PGliteClientManager } from '../../pglite/manager';
import { asUUID } from '@elizaos/core';
import { sql } from 'drizzle-orm';

describe('Plugin Migration Test', () => {
  let adapter: PgliteDatabaseAdapter;
  let manager: PGliteClientManager;

  beforeAll(async () => {
    const testAgentId = asUUID('00000000-0000-0000-0000-000000000001');
    manager = new PGliteClientManager({});
    adapter = new PgliteDatabaseAdapter(testAgentId, manager);
    await adapter.init();
  });

  afterAll(async () => {
    if (adapter) {
      await adapter.close();
    }
  });

  it('should show that plugin migration support exists', async () => {
    // This test shows that the runPluginMigrations method exists on the adapter
    expect(adapter.runPluginMigrations).toBeDefined();
    expect(typeof adapter.runPluginMigrations).toBe('function');

    // Show that we can create tables manually for now
    const db = adapter.getDatabase();

    // Create a test plugin table manually
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS todos (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        agent_id UUID NOT NULL,
        name TEXT NOT NULL,
        description TEXT,
        is_completed BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Verify table exists
    try {
      await db.execute(sql`SELECT 1 FROM todos WHERE 1=0`);
    } catch (error) {
      throw new Error('Table todos was not created');
    }

    // Insert test data
    const agentId = asUUID('00000000-0000-0000-0000-000000000001');
    await db.execute(sql`
      INSERT INTO agents (id, name, bio, system, created_at, updated_at)
      VALUES (${agentId}, 'Test Agent', 'Test bio', 'Test system', NOW(), NOW())
      ON CONFLICT (id) DO NOTHING
    `);

    await db.execute(sql`
      INSERT INTO todos (agent_id, name, description)
      VALUES (${agentId}, 'Test Todo', 'Test Description')
    `);

    // Query the data
    const result = await db.execute(sql`
      SELECT * FROM todos WHERE agent_id = ${agentId}
    `);

    expect(result.rows).toHaveLength(1);
    expect(result.rows[0].name).toBe('Test Todo');
    expect(result.rows[0].is_completed).toBe(false);

    // Clean up
    await db.execute(sql`DELETE FROM todos WHERE agent_id = ${agentId}`);
    await db.execute(sql`DROP TABLE IF EXISTS todos`);
  });

  it('should call runPluginMigrations without errors', async () => {
    // Define a simple plugin schema in the format the runtime expects
    const pluginSchema = {
      test_plugin_table: {
        id: 'uuid primary key default gen_random_uuid()',
        value: 'text not null',
      },
    };

    // This should not throw an error
    await expect(adapter.runPluginMigrations(pluginSchema, 'test-plugin')).resolves.toBeUndefined();
  });
});
