import type { Plugin, UUID } from '@elizaos/core';
import { AgentRuntime } from '@elizaos/core';
import { sql } from 'drizzle-orm';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { v4 } from 'uuid';

// Import and set database type BEFORE importing anything that uses the schema
import { setDatabaseType } from '../schema/factory';

// Set database type based on environment variable at module load time
if (process.env.POSTGRES_URL) {
  setDatabaseType('postgres');
} else {
  setDatabaseType('pglite');
}

// Now import the rest
import { plugin as sqlPlugin } from '../index';
import { PgDatabaseAdapter } from '../pg/adapter';
import { PostgresConnectionManager } from '../pg/manager';
import { PgliteDatabaseAdapter } from '../pglite/adapter';
import { PGliteClientManager } from '../pglite/manager';
import { mockCharacter } from './fixtures';

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
    try {
      // PostgreSQL testing
      console.log('[TEST] Attempting to use PostgreSQL for test database');
      setDatabaseType('postgres');
      const connectionManager = new PostgresConnectionManager(process.env.POSTGRES_URL);
      const adapter = new PgDatabaseAdapter(testAgentId, connectionManager);
      // Don't init adapter yet - let the plugin do it

      const schemaName = `test_${testAgentId.replace(/-/g, '_')}`;
      const db = connectionManager.getDatabase();

      // Drop schema if it exists to ensure clean state
      await db.execute(sql.raw(`DROP SCHEMA IF EXISTS ${schemaName} CASCADE`));
      await db.execute(sql.raw(`CREATE SCHEMA IF NOT EXISTS ${schemaName}`));
      await db.execute(sql.raw(`SET search_path TO ${schemaName}, public`));

      // Create and initialize runtime - this will create tables via plugin init
      const runtime = new AgentRuntime({
        character: { ...mockCharacter, id: testAgentId },
        agentId: testAgentId,
        plugins: [sqlPlugin as Plugin, ...testPlugins],
        adapter: adapter, // Pass adapter in constructor
      });

      // Initialize the runtime - this will trigger plugin init and create tables
      await runtime.initialize();

      const cleanup = async () => {
        await db.execute(sql.raw(`DROP SCHEMA IF EXISTS ${schemaName} CASCADE`));
        await adapter.close();
      };

      return { adapter, runtime, cleanup };
    } catch (error) {
      console.warn('[TEST] Failed to connect to PostgreSQL, falling back to PGlite:', error);
      // Fall through to PGlite setup below
    }
  }

  // PGlite testing (fallback or when POSTGRES_URL not set)
  setDatabaseType('pglite');
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'eliza-test-'));
  const connectionManager = new PGliteClientManager({ dataDir: tempDir });
  await connectionManager.initialize();
  const adapter = new PgliteDatabaseAdapter(testAgentId, connectionManager);
  // Don't init adapter yet - let the plugin do it

  // Create and initialize runtime - this will create tables via plugin init
  const runtime = new AgentRuntime({
    character: { ...mockCharacter, id: testAgentId },
    agentId: testAgentId,
    plugins: [sqlPlugin as Plugin, ...testPlugins],
    adapter: adapter, // Pass adapter in constructor
  });

  // Initialize the runtime - this will trigger plugin init and create tables
  await runtime.initialize();

  const cleanup = async () => {
    await adapter.close();
    fs.rmSync(tempDir, { recursive: true, force: true });
  };

  return { adapter, runtime, cleanup };
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
    try {
      // PostgreSQL - use unique schema per test
      const schemaName = `test_${testId}_${Date.now()}`;
      console.log(`[TEST] Creating isolated PostgreSQL schema: ${schemaName}`);

      setDatabaseType('postgres');
      const connectionManager = new PostgresConnectionManager(process.env.POSTGRES_URL);
      const adapter = new PgDatabaseAdapter(testAgentId, connectionManager);
      // Don't init adapter yet - let the plugin do it

      const db = connectionManager.getDatabase();

      // Create isolated schema
      await db.execute(sql.raw(`CREATE SCHEMA ${schemaName}`));
      // Include public in search path so we can access the vector extension
      await db.execute(sql.raw(`SET search_path TO ${schemaName}, public`));

      // Create and initialize runtime - this will create tables via plugin init
      const runtime = new AgentRuntime({
        character: { ...mockCharacter, id: testAgentId },
        agentId: testAgentId,
        plugins: [sqlPlugin as Plugin, ...testPlugins],
        adapter: adapter, // Pass adapter in constructor
      });

      // Initialize the runtime - this will trigger plugin init and create tables
      await runtime.initialize();

      const cleanup = async () => {
        try {
          await db.execute(sql.raw(`DROP SCHEMA IF EXISTS ${schemaName} CASCADE`));
        } catch (error) {
          console.error(`[TEST] Failed to drop schema ${schemaName}:`, error);
        }
        await adapter.close();
      };

      return { adapter, runtime, cleanup, testAgentId };
    } catch (error) {
      console.warn('[TEST] Failed to connect to PostgreSQL, falling back to PGlite:', error);
      // Fall through to PGlite setup below
    }
  }

  // PGLite fallback
  // PGLite - use unique directory per test
  const tempDir = path.join(os.tmpdir(), `eliza-test-${testId}-${Date.now()}`);
  console.log(`[TEST] Creating isolated PGLite database: ${tempDir}`);

  setDatabaseType('pglite');
  const connectionManager = new PGliteClientManager({ dataDir: tempDir });
  await connectionManager.initialize();
  const adapter = new PgliteDatabaseAdapter(testAgentId, connectionManager);
  // Don't init adapter yet - let the plugin do it

  // Create and initialize runtime - this will create tables via plugin init
  const runtime = new AgentRuntime({
    character: { ...mockCharacter, id: testAgentId },
    agentId: testAgentId,
    plugins: [sqlPlugin as Plugin, ...testPlugins],
    adapter: adapter, // Pass adapter in constructor
  });

  // Initialize the runtime - this will trigger plugin init and create tables
  await runtime.initialize();

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
