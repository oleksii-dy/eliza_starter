import type { Plugin, UUID } from '@elizaos/core';
import { AgentRuntime, AgentStatus, stringToUuid } from '@elizaos/core';
import { sql } from 'drizzle-orm';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { v4 } from 'uuid';

// Import unified system components
import sqlPlugin, { connectionRegistry } from '../index';
import { PgDatabaseAdapter } from '../pg/adapter';
import { PgliteDatabaseAdapter } from '../pglite/adapter';
import { mockCharacter } from './fixtures';

/**
 * Creates a fully initialized database adapter and a corresponding AgentRuntime instance
 * for testing purposes. Uses the unified migration system and connection registry to
 * set up the schema for the core SQL plugin and any additional plugins provided.
 *
 * Automatically detects PostgreSQL (if POSTGRES_URL is set) or falls back to PGLite.
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
  // Generate a unique agent name for this test
  const agentName = `${mockCharacter.name}_${testAgentId.substring(0, 8)}`;

  // Use the same ID generation logic as the runtime
  const agentId = stringToUuid(agentName);

  if (process.env.POSTGRES_URL) {
    try {
      // PostgreSQL testing using unified connection registry
      console.log('[TEST] Attempting to use PostgreSQL for test database');
      const connectionManager = connectionRegistry.getPostgresManager(process.env.POSTGRES_URL);
      const adapter = new PgDatabaseAdapter(agentId, connectionManager, process.env.POSTGRES_URL);

      const schemaName = `test_${agentId.replace(/-/g, '_')}`;
      const db = connectionManager.getDatabase();

      // Drop schema if it exists to ensure clean state
      await db.execute(sql.raw(`DROP SCHEMA IF EXISTS ${schemaName} CASCADE`));
      await db.execute(sql.raw(`CREATE SCHEMA IF NOT EXISTS ${schemaName}`));
      await db.execute(sql.raw(`SET search_path TO ${schemaName}, public`));

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

      // Initialize adapter with migrations
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
        await db.execute(sql.raw(`DROP SCHEMA IF EXISTS ${schemaName} CASCADE`));
        await adapter.close();
        // Don't call connectionRegistry.cleanup() here as it closes ALL connections
        // Just remove this specific adapter from the registry
        connectionRegistry.removeAdapter(agentId);
      };

      return { adapter, runtime, cleanup };
    } catch (error) {
      console.warn('[TEST] Failed to connect to PostgreSQL, falling back to PGlite:', error);
      // Fall through to PGlite setup below
    }
  }

  // PGlite testing (fallback or when POSTGRES_URL not set)
  // Use unique memory database key to avoid sharing issues between tests
  const dataDir = `:memory:${agentId}`;
  console.log(`[TEST] Using PGlite database in memory: ${dataDir}`);

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

  // Initialize adapter with migrations
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
    await adapter.close();
    // No need to remove temp directory for :memory: database
    connectionRegistry.removeAdapter(agentId);
  };

  return { adapter, runtime, cleanup };
}

/**
 * Creates a properly isolated test database with automatic cleanup using the unified system.
 * This function ensures each test has its own isolated database state, with separate
 * schemas for PostgreSQL or separate directories for PGLite.
 *
 * Uses the unified migration system and connection registry for consistency.
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

  // Generate a unique test ID for this test
  const uniqueTestId = v4() as UUID;
  const testId = testName.replace(/[^a-zA-Z0-9]/g, '_').toLowerCase();

  // Generate a unique agent name for this test
  const agentName = `${mockCharacter.name}_${uniqueTestId.substring(0, 8)}`;

  // Use the same ID generation logic as the runtime
  const testAgentId = stringToUuid(agentName);

  if (process.env.POSTGRES_URL) {
    try {
      // PostgreSQL - use unique schema per test
      const schemaName = `test_${testId}_${Date.now()}`;
      console.log(`[TEST] Creating isolated PostgreSQL schema: ${schemaName}`);

      const connectionManager = connectionRegistry.getPostgresManager(process.env.POSTGRES_URL);
      const adapter = new PgDatabaseAdapter(
        testAgentId,
        connectionManager,
        process.env.POSTGRES_URL
      );

      const db = connectionManager.getDatabase();

      // Create isolated schema
      await db.execute(sql.raw(`CREATE SCHEMA ${schemaName}`));
      // Include public in search path so we can access the vector extension
      await db.execute(sql.raw(`SET search_path TO ${schemaName}, public`));

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
        try {
          await db.execute(sql.raw(`DROP SCHEMA IF EXISTS ${schemaName} CASCADE`));
        } catch (error) {
          console.error(`[TEST] Failed to drop schema ${schemaName}:`, error);
        }
        await adapter.close();
        // Don't call connectionRegistry.cleanup() here as it closes ALL connections
        // Just remove this specific adapter from the registry
        connectionRegistry.removeAdapter(testAgentId);
      };

      return { adapter, runtime, cleanup, testAgentId };
    } catch (error) {
      console.warn('[TEST] Failed to connect to PostgreSQL, falling back to PGlite:', error);
      // Fall through to PGlite setup below
    }
  }

  // PGLite fallback
  // PGLite - use unique memory database for each test to ensure isolation
  const dataDir = `:memory:${testId}_${Date.now()}`;
  console.log(`[TEST] Creating isolated PGLite database in memory: ${dataDir}`);

  // Use connection registry to ensure unified migrator uses same instance
  const connectionManager = connectionRegistry.getPGLiteManager(dataDir);
  await connectionManager.initialize();
  const adapter = new PgliteDatabaseAdapter(testAgentId, connectionManager, dataDir);

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

  // Initialize adapter with migrations
  await adapter.init();
  // Give the database a moment to fully settle after migrations
  await new Promise((resolve) => setTimeout(resolve, 500));

  // Verify database is ready
  const isReady = await adapter.isReady();
  if (!isReady) {
    throw new Error('[TEST] Database adapter not ready after migrations');
  }

  // Verify critical tables exist and are accessible
  try {
    await adapter.getAgents(); // This will test if agents table is accessible
    console.log('[DEBUG] Verified agents table is ready');
  } catch (error) {
    console.log('[DEBUG] Agents table verification failed:', error);
  }

  // Also verify entities table is ready
  try {
    await adapter.getEntitiesByIds(['test-id-that-does-not-exist']);
    console.log('[DEBUG] Verified entities table is ready');
  } catch (error) {
    console.log('[DEBUG] Entities table verification failed:', error);
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
    // No need to remove temp directory for :memory: database
    connectionRegistry.removeAdapter(testAgentId);
  };

  return { adapter, runtime, cleanup, testAgentId };
}
