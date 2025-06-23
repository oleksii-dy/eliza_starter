import type { Plugin, UUID } from '@elizaos/core';
import { AgentRuntime, AgentStatus, stringToUuid } from '@elizaos/core';
import { sql } from 'drizzle-orm';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { v4 } from 'uuid';
import { v4 as uuidv4 } from 'uuid';

// Import unified system components
import sqlPlugin, { connectionRegistry } from '../index';
import { PgDatabaseAdapter } from '../pg/adapter';
import { PgliteDatabaseAdapter } from '../pglite/adapter';
import { mockCharacter } from './fixtures';
import { PGliteClientManager } from '../pglite/manager';
import { getTempDbPath } from '@elizaos/core';

/**
 * Creates a fully initialized database adapter and a corresponding AgentRuntime instance
 * for testing purposes. Uses the unified migration system and connection registry to
 * set up the schema for the core SQL plugin and any additional plugins provided.
 *
 * Uses the test schema for isolation from production data.
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
  // Force test environment
  process.env.NODE_ENV = 'test';
  process.env.VITEST = 'true';

  // Generate a unique agent name for this test
  const agentName = `${mockCharacter.name}_${testAgentId.substring(0, 8)}`;

  // Use the same ID generation logic as the runtime
  const agentId = stringToUuid(agentName);

  if (process.env.POSTGRES_URL) {
    try {
      // PostgreSQL testing using unified connection registry
      console.log('[TEST] Using PostgreSQL with test schema');
      const connectionManager = connectionRegistry.getPostgresManager(process.env.POSTGRES_URL);
      const adapter = new PgDatabaseAdapter(agentId, connectionManager, process.env.POSTGRES_URL);

      // The UnifiedMigrator will handle schema setup automatically

      // Create character with all required fields
      const testCharacter = {
        ...mockCharacter,
        id: agentId,
        name: agentName,
        bio: Array.isArray(mockCharacter.bio)
          ? mockCharacter.bio
          : [mockCharacter.bio || 'Test bio'],
        system: mockCharacter.system || 'You are a helpful assistant.',
        status: AgentStatus.ACTIVE,
        enabled: true,
        settings: {},
        plugins: [],
        knowledge: [],
        topics: [],
        messageExamples: [],
        postExamples: [],
      };

      // Initialize adapter with migrations (will use test schema)
      await adapter.init();

      // Give the database a moment to fully settle after migrations
      await new Promise((resolve) => setTimeout(resolve, 500));

      // Verify database is ready
      const isReady = await adapter.isReady();
      if (!isReady) {
        throw new Error('[TEST] Database adapter not ready after migrations');
      }

      // Create and initialize runtime with the fully-prepared adapter
      const runtime = new AgentRuntime({
        character: testCharacter,
        agentId: agentId,
        plugins: [sqlPlugin, ...testPlugins],
        adapter: adapter,
      });

      // Initialize the runtime - this will handle agent creation
      await runtime.initialize();

      const cleanup = async () => {
        // Clean up test schema data
        await adapter.close();
        connectionRegistry.removeAdapter(agentId);
      };

      return { adapter, runtime, cleanup };
    } catch (error) {
      console.warn('[TEST] Failed to connect to PostgreSQL, falling back to PGLite:', error);
      // Fall through to PGLite setup below
    }
  }

  // PGLite testing (fallback or when POSTGRES_URL not set)
  // Use shared test database
  const dataDir = getTempDbPath('eliza-test-db');
  console.log(`[TEST] Using PGLite database with test tables: ${dataDir}`);

  // Use connection registry to ensure unified migrator uses same instance
  const connectionManager = connectionRegistry.getPGLiteManager(dataDir);
  await connectionManager.initialize();
  const adapter = new PgliteDatabaseAdapter(agentId, connectionManager, dataDir);

  // Create character with all required fields
  const testCharacter = {
    ...mockCharacter,
    id: agentId,
    name: agentName,
    bio: Array.isArray(mockCharacter.bio) ? mockCharacter.bio : [mockCharacter.bio || 'Test bio'],
    system: mockCharacter.system || 'You are a helpful assistant.',
    status: AgentStatus.ACTIVE,
    enabled: true,
    settings: {},
    plugins: [],
    knowledge: [],
    topics: [],
    messageExamples: [],
    postExamples: [],
  };

  // Initialize adapter with migrations (will use test_ prefix for tables)
  await adapter.init();

  // Give the database a moment to fully settle after migrations
  await new Promise((resolve) => setTimeout(resolve, 500));

  // Verify database is ready
  const isReady = await adapter.isReady();
  if (!isReady) {
    throw new Error('[TEST] Database adapter not ready after migrations');
  }

  // Create runtime with the adapter directly to bypass plugin initialization issues
  console.log(`[TEST] Creating runtime with ${testPlugins.length} plugins (excluding sqlPlugin)`);
  console.log(
    `[TEST] Test plugins:`,
    testPlugins.map((p) => p.name)
  );
  const runtime = new AgentRuntime({
    character: testCharacter,
    agentId: agentId,
    plugins: [...testPlugins], // Don't include sqlPlugin to avoid duplicate adapter creation
    adapter: adapter, // Pass adapter directly to ensure it's used
  });

  // Initialize the runtime - this will handle agent creation
  await runtime.initialize();

  const cleanup = async () => {
    // Clean up test tables
    await adapter.close();
    connectionRegistry.removeAdapter(agentId);
  };

  return { adapter, runtime, cleanup };
}

/**
 * Creates a properly isolated test database with automatic cleanup using the unified system.
 * This function ensures each test has clean test schema/tables.
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
  // Set test environment flag early
  process.env.ELIZA_TESTING_PLUGIN = 'true';
  process.env.NODE_ENV = 'test';
  process.env.VITEST = 'true';

  // Generate a unique test ID for this test
  const uniqueTestId = v4() as UUID;
  const testId = testName.replace(/[^a-zA-Z0-9]/g, '_').toLowerCase();

  // Generate a unique agent name for this test
  const agentName = `${mockCharacter.name}_${uniqueTestId.substring(0, 8)}`;

  // Use the same ID generation logic as the runtime
  const testAgentId = stringToUuid(agentName);

  if (process.env.POSTGRES_URL) {
    try {
      // PostgreSQL - use test schema
      console.log(`[TEST] Creating isolated PostgreSQL test`);

      const connectionManager = connectionRegistry.getPostgresManager(process.env.POSTGRES_URL);
      const adapter = new PgDatabaseAdapter(
        testAgentId,
        connectionManager,
        process.env.POSTGRES_URL
      );

      const db = connectionManager.getDatabase();

      // Clean up test schema before starting

      // Create character with all required fields
      const testCharacter = {
        ...mockCharacter,
        id: testAgentId,
        name: agentName,
        bio: Array.isArray(mockCharacter.bio)
          ? mockCharacter.bio
          : [mockCharacter.bio || 'Test bio'],
        system: mockCharacter.system || 'You are a helpful assistant.',
        status: AgentStatus.ACTIVE,
        enabled: true,
        settings: {},
        plugins: [],
        knowledge: [],
        topics: [],
        messageExamples: [],
        postExamples: [],
      };

      // Initialize adapter with migrations
      await adapter.init();

      // Give the database a moment to fully settle after migrations
      await new Promise((resolve) => setTimeout(resolve, 500));

      // Verify database is ready
      const isReady = await adapter.isReady();
      if (!isReady) {
        throw new Error('[TEST] Database adapter not ready after migrations');
      }

      // Create runtime with the adapter directly
      console.log(
        `[TEST] Creating isolated runtime with ${testPlugins.length} plugins (excluding sqlPlugin)`
      );
      console.log(
        `[TEST] Test plugins:`,
        testPlugins.map((p) => p.name)
      );
      const runtime = new AgentRuntime({
        character: testCharacter,
        agentId: testAgentId,
        plugins: [...testPlugins], // Don't include sqlPlugin to avoid duplicate adapter creation
        adapter: adapter, // Pass adapter directly to ensure it's used
      });

      // Initialize the runtime - this will handle agent creation
      await runtime.initialize();

      const cleanup = async () => {
        await adapter.close();
        connectionRegistry.removeAdapter(testAgentId);
      };

      return { adapter, runtime, cleanup, testAgentId };
    } catch (error) {
      console.warn('[TEST] Failed to connect to PostgreSQL, falling back to PGLite:', error);
      // Fall through to PGLite setup below
    }
  }

  // PGLite fallback
  // Use unique test database for each test
  const testDbName = `eliza-test-db-${testId}-${Date.now()}`;
  const dataDir = getTempDbPath(testDbName);
  console.log(`[TEST] Creating isolated PGLite test database: ${dataDir}`);

  // Use connection registry to ensure unified migrator uses same instance
  const connectionManager = connectionRegistry.getPGLiteManager(dataDir);
  await connectionManager.initialize();
  const adapter = new PgliteDatabaseAdapter(testAgentId, connectionManager, dataDir);

  // Initialize adapter first so we can use its database
  await adapter.init();

  // Clean up test tables before starting
  const db = adapter.getDatabase();

  // Create character with all required fields
  const testCharacter = {
    ...mockCharacter,
    id: testAgentId,
    name: agentName,
    bio: Array.isArray(mockCharacter.bio) ? mockCharacter.bio : [mockCharacter.bio || 'Test bio'],
    system: mockCharacter.system || 'You are a helpful assistant.',
    status: AgentStatus.ACTIVE,
    enabled: true,
    settings: {},
    plugins: [],
    knowledge: [],
    topics: [],
    messageExamples: [],
    postExamples: [],
  };

  // Re-initialize adapter after cleanup to ensure fresh state
  await adapter.init();

  // Give the database a moment to fully settle after migrations
  await new Promise((resolve) => setTimeout(resolve, 500));

  // Verify database is ready
  const isReady = await adapter.isReady();
  if (!isReady) {
    throw new Error('[TEST] Database adapter not ready after migrations');
  }

  // Create runtime with the adapter directly to bypass plugin initialization issues
  const runtime = new AgentRuntime({
    character: testCharacter,
    agentId: testAgentId,
    plugins: [...testPlugins], // Don't include sqlPlugin to avoid duplicate adapter creation
    adapter: adapter, // Pass adapter directly to ensure it's used
  });

  // Initialize the runtime - this will handle agent creation
  await runtime.initialize();

  const cleanup = async () => {
    await adapter.close();
    connectionRegistry.removeAdapter(testAgentId);
  };

  return { adapter, runtime, cleanup, testAgentId };
}

export async function createTestAdapter(testSuffix?: string): Promise<{
  adapter: PgliteDatabaseAdapter;
  agentId: UUID;
  dataDir: string;
}> {
  // Force test environment
  process.env.NODE_ENV = 'test';
  process.env.VITEST = 'true';

  const agentId = uuidv4() as UUID;
  const dataDir = getTempDbPath('eliza-test-db');

  const manager = new PGliteClientManager({ dataDir });
  const adapter = new PgliteDatabaseAdapter(agentId, manager, dataDir);

  await adapter.init();

  return { adapter, agentId, dataDir };
}
