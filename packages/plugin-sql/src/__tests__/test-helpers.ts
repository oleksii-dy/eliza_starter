import type { Plugin, UUID } from '@elizaos/core';
import { AgentRuntime } from '@elizaos/core';
import { sql } from 'drizzle-orm';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { v4 } from 'uuid';
import { plugin as sqlPlugin } from '../index';
import { DatabaseMigrationService } from '../migration-service';
import { PgDatabaseAdapter } from '../pg/adapter';
import { PostgresConnectionManager } from '../pg/manager';
import { PgliteDatabaseAdapter } from '../pglite/adapter';
import { PGliteClientManager } from '../pglite/manager';
import { mockCharacter } from './fixtures';

/**
 * Drops all tables used by the SQL plugin to ensure clean test state
 */
async function dropAllTables(db: any) {
  try {
    // Drop tables in reverse dependency order
    const tablesToDrop = [
      'embeddings',
      'memories',
      'components',
      'participants',
      'relationships',
      'tasks',
      'logs',
      'cache',
      'rooms',
      'entities',
      'worlds',
      'agents',
    ];

    for (const table of tablesToDrop) {
      try {
        await db.execute(sql.raw(`DROP TABLE IF EXISTS ${table} CASCADE`));
      } catch (error) {
        console.warn(`[TEST] Failed to drop table ${table}:`, error);
      }
    }
  } catch (error) {
    console.error('[TEST] Failed to drop tables:', error);
  }
}

/**
 * Creates a fully initialized, in-memory PGlite database adapter and a corresponding
 * AgentRuntime instance for testing purposes. It uses the dynamic migration system
 * to set up the schema for the core SQL plugin and any additional plugins provided.
 *
 * This is the standard helper for all integration tests in `plugin-sql`.
 *
 * @param testAgentId - The UUID to use for the agent runtime and adapter.
 * @param testPlugins - An array of additional plugins to load and migrate.
 * @returns A promise that resolves to the initialized adapter and runtime.
 */
export async function createTestDatabase(
  testAgentId: UUID,
  testPlugins: Plugin[] = []
): Promise<{
  adapter: PgliteDatabaseAdapter | PgDatabaseAdapter;
  runtime: AgentRuntime;
  cleanup: () => Promise<void>;
}> {
  if (process.env.POSTGRES_URL) {
    // PostgreSQL testing
    console.log('[TEST] Using PostgreSQL for test database');
    const connectionManager = new PostgresConnectionManager(process.env.POSTGRES_URL);
    const adapter = new PgDatabaseAdapter(testAgentId, connectionManager);
    await adapter.init();

    const runtime = new AgentRuntime({
      character: { ...mockCharacter, id: undefined },
      agentId: testAgentId,
      plugins: [sqlPlugin, ...testPlugins],
    });
    runtime.registerDatabaseAdapter(adapter);

    const db = connectionManager.getDatabase();

    // Drop existing tables to ensure clean state
    await dropAllTables(db);

    // We're using public schema now, no need for test-specific schemas
    const migrationService = new DatabaseMigrationService();
    await migrationService.initializeWithDatabase(db);
    migrationService.discoverAndRegisterPluginSchemas([sqlPlugin, ...testPlugins]);
    await migrationService.runAllPluginMigrations();

    const agentCreated = await adapter.createAgent({
      ...mockCharacter,
      id: testAgentId, // Override mockCharacter's ID with testAgentId
    } as any);

    if (!agentCreated) {
      throw new Error(`Failed to create agent with ID ${testAgentId}`);
    }

    const cleanup = async () => {
      // Clean up test data
      await db.execute(sql`DELETE FROM agents WHERE id = ${testAgentId}`);
      await adapter.close();
    };

    return { adapter, runtime, cleanup };
  } else {
    // PGLite testing
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'eliza-test-'));

    // Import PGlite and extensions directly
    const { PGlite } = await import('@electric-sql/pglite');
    const { vector } = await import('@electric-sql/pglite/vector');
    const { fuzzystrmatch } = await import('@electric-sql/pglite/contrib/fuzzystrmatch');

    // Create PGLite instance directly with extensions
    const pgLite = new PGlite({
      dataDir: tempDir,
      extensions: {
        vector,
        fuzzystrmatch,
      },
    });

    const connectionManager = new PGliteClientManager({
      dataDir: tempDir,
    });
    const adapter = new PgliteDatabaseAdapter(testAgentId, connectionManager);
    await adapter.init();

    const runtime = new AgentRuntime({
      character: { ...mockCharacter, id: undefined },
      agentId: testAgentId,
      plugins: [sqlPlugin, ...testPlugins],
    });
    runtime.registerDatabaseAdapter(adapter);

    const migrationService = new DatabaseMigrationService();
    await migrationService.initializeWithDatabase(adapter.getDatabase());
    migrationService.discoverAndRegisterPluginSchemas([sqlPlugin, ...testPlugins]);
    await migrationService.runAllPluginMigrations();

    const agentCreated = await adapter.createAgent({
      ...mockCharacter,
      id: testAgentId, // Override mockCharacter's ID with testAgentId
    } as any);

    if (!agentCreated) {
      throw new Error(`Failed to create agent with ID ${testAgentId}`);
    }

    const cleanup = async () => {
      await adapter.close();
      fs.rmSync(tempDir, { recursive: true, force: true });
    };

    return { adapter, runtime, cleanup };
  }
}

/**
 * Creates a properly isolated test database with automatic cleanup.
 * This function ensures each test has its own isolated database state.
 *
 * @param testName - A unique name for this test to ensure isolation
 * @param testPlugins - Additional plugins to load
 * @returns Database adapter, runtime, and cleanup function
 */
export async function createIsolatedTestDatabase(
  testName: string,
  testPlugins: Plugin[] = []
): Promise<{
  adapter: PgliteDatabaseAdapter | PgDatabaseAdapter;
  runtime: AgentRuntime;
  cleanup: () => Promise<void>;
  testAgentId: UUID;
}> {
  // Generate a unique agent ID for this test
  const testAgentId = v4() as UUID;
  const testId = testName.replace(/[^a-zA-Z0-9]/g, '_').toLowerCase();

  if (process.env.POSTGRES_URL) {
    // PostgreSQL - use public schema
    console.log(`[TEST] Creating test with PostgreSQL (public schema)`);

    const connectionManager = new PostgresConnectionManager(process.env.POSTGRES_URL);
    const adapter = new PgDatabaseAdapter(testAgentId, connectionManager);
    await adapter.init();

    const runtime = new AgentRuntime({
      character: { ...mockCharacter, id: undefined },
      agentId: testAgentId,
      plugins: [sqlPlugin, ...testPlugins],
    });
    runtime.registerDatabaseAdapter(adapter);

    const db = connectionManager.getDatabase();

    // Drop existing tables to ensure clean state
    await dropAllTables(db);

    // Run migrations in public schema
    const migrationService = new DatabaseMigrationService();
    await migrationService.initializeWithDatabase(db);
    migrationService.discoverAndRegisterPluginSchemas([sqlPlugin, ...testPlugins]);
    await migrationService.runAllPluginMigrations();

    // Create test agent
    const agentCreated = await adapter.createAgent({
      ...mockCharacter,
      id: testAgentId, // Override mockCharacter's ID with testAgentId
    } as any);

    if (!agentCreated) {
      throw new Error(`Failed to create agent with ID ${testAgentId}`);
    }

    const cleanup = async () => {
      try {
        // Clean up test data
        await db.execute(sql`DELETE FROM agents WHERE id = ${testAgentId}`);
      } catch (error) {
        console.error(`[TEST] Failed to clean up test data:`, error);
      }
      await adapter.close();
    };

    return { adapter, runtime, cleanup, testAgentId };
  } else {
    // PGLite - use unique directory per test
    const tempDir = path.join(os.tmpdir(), `eliza-test-${testId}-${Date.now()}`);

    const connectionManager = new PGliteClientManager({
      dataDir: tempDir,
    });
    await connectionManager.initialize();
    const adapter = new PgliteDatabaseAdapter(testAgentId, connectionManager);
    await adapter.init();

    const runtime = new AgentRuntime({
      character: { ...mockCharacter, id: undefined },
      agentId: testAgentId,
      plugins: [sqlPlugin, ...testPlugins],
    });
    runtime.registerDatabaseAdapter(adapter);

    // Run migrations
    const migrationService = new DatabaseMigrationService();
    await migrationService.initializeWithDatabase(adapter.getDatabase());
    migrationService.discoverAndRegisterPluginSchemas([sqlPlugin, ...testPlugins]);
    await migrationService.runAllPluginMigrations();

    // Create test agent
    const agentCreated = await adapter.createAgent({
      ...mockCharacter,
      id: testAgentId, // Override mockCharacter's ID with testAgentId
    } as any);

    if (!agentCreated) {
      throw new Error(`Failed to create agent with ID ${testAgentId}`);
    }

    const cleanup = async () => {
      await adapter.close();
      try {
        fs.rmSync(tempDir, { recursive: true, force: true });
      } catch (error) {
        console.error(`[TEST] Failed to remove temp directory ${tempDir}:`, error);
      }
    };

    return { adapter, runtime, cleanup, testAgentId };
  }
}
