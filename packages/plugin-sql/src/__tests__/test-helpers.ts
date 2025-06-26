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
import { PgAdapter } from '../pg/adapter';
import { PgManager } from '../pg/manager';
import { mockCharacter } from './fixtures';

/**
 * Creates a fully initialized PostgreSQL database adapter and a corresponding AgentRuntime instance
 * for testing purposes. Uses the unified migration system and connection registry to
 * set up the schema for the core SQL plugin and any additional plugins provided.
 *
 * @param testAgentId - The UUID to use for the agent runtime and adapter.
 * @param testPlugins - An array of additional plugins to load and migrate.
 * @returns A promise that resolves to the initialized adapter and runtime.
 */
export async function createTestDatabase(
  testAgentId: UUID,
  testPlugins: Plugin[] = []
): Promise<{ adapter: PgAdapter; runtime: AgentRuntime; cleanup: () => Promise<void> }> {
  // Skip test if no PostgreSQL URL is provided
  if (!process.env.POSTGRES_URL && !process.env.TEST_POSTGRES_URL) {
    throw new Error(
      'PostgreSQL connection required for tests. Please set POSTGRES_URL or TEST_POSTGRES_URL environment variable.'
    );
  }

  const postgresUrl = process.env.TEST_POSTGRES_URL || process.env.POSTGRES_URL!;

  const manager = new PgManager({
    connectionString: postgresUrl,
    ssl: false,
  });

  await manager.connect();

  const adapter = new PgAdapter(testAgentId, manager);
  await adapter.init();

  // Register adapter in connection registry
  connectionRegistry.registerAdapter(testAgentId, adapter);

  // Create AgentRuntime with the adapter
  const runtime = new AgentRuntime({
    agentId: testAgentId,
    token: '',
    character: mockCharacter,
    databaseAdapter: adapter,
  });

  await runtime.initialize();

  // Initialize all test plugins
  const allPlugins = [sqlPlugin, ...testPlugins];
  for (const plugin of allPlugins) {
    if (plugin.init) {
      await plugin.init({}, runtime);
    }
  }

  const cleanup = async () => {
    try {
      // Clean up test data
      await adapter.query('DELETE FROM memories WHERE agent_id = $1', [testAgentId]);
      await adapter.query('DELETE FROM entities WHERE agent_id = $1', [testAgentId]);
      await adapter.query('DELETE FROM rooms WHERE agent_id = $1', [testAgentId]);
      await adapter.query('DELETE FROM agents WHERE id = $1', [testAgentId]);

      connectionRegistry.removeAdapter(testAgentId);
      await adapter.close();
      await manager.close();
    } catch (error) {
      console.warn('Error during test cleanup:', error);
    }
  };

  return { adapter, runtime, cleanup };
}

/**
 * Creates an isolated test database for testing purposes.
 * This is a simplified version that only creates the adapter.
 */
export async function createIsolatedTestDatabase(
  testName: string
): Promise<{ adapter: PgAdapter; cleanup: () => Promise<void> }> {
  // Skip test if no PostgreSQL URL is provided
  if (!process.env.POSTGRES_URL && !process.env.TEST_POSTGRES_URL) {
    throw new Error(
      'PostgreSQL connection required for tests. Please set POSTGRES_URL or TEST_POSTGRES_URL environment variable.'
    );
  }

  const testAgentId = stringToUuid(`test-${testName}-${Date.now()}`);
  const postgresUrl = process.env.TEST_POSTGRES_URL || process.env.POSTGRES_URL!;

  const manager = new PgManager({
    connectionString: postgresUrl,
    ssl: false,
  });

  await manager.connect();

  const adapter = new PgAdapter(testAgentId, manager);
  await adapter.init();

  const cleanup = async () => {
    try {
      // Clean up test data
      await adapter.query('DELETE FROM memories WHERE agent_id = $1', [testAgentId]);
      await adapter.query('DELETE FROM entities WHERE agent_id = $1', [testAgentId]);
      await adapter.query('DELETE FROM rooms WHERE agent_id = $1', [testAgentId]);
      await adapter.query('DELETE FROM agents WHERE id = $1', [testAgentId]);

      await adapter.close();
      await manager.close();
    } catch (error) {
      console.warn('Error during isolated test cleanup:', error);
    }
  };

  return { adapter, cleanup };
}

/**
 * Creates a test database adapter for testing with PostgreSQL.
 * Uses environment variables to determine connection.
 */
export async function createTestAdapter(agentId?: UUID): Promise<PgAdapter> {
  const testAgentId = agentId || stringToUuid(`test-${Date.now()}`);

  // Skip if no PostgreSQL URL is provided
  if (!process.env.POSTGRES_URL && !process.env.TEST_POSTGRES_URL) {
    throw new Error(
      'PostgreSQL connection required for tests. Please set POSTGRES_URL or TEST_POSTGRES_URL environment variable.'
    );
  }

  const postgresUrl = process.env.TEST_POSTGRES_URL || process.env.POSTGRES_URL!;

  const manager = new PgManager({
    connectionString: postgresUrl,
    ssl: false,
  });

  await manager.connect();

  const adapter = new PgAdapter(testAgentId, manager);
  await adapter.init();

  return adapter;
}

/**
 * Helper to skip tests when PostgreSQL is not available
 */
export function skipIfNoPostgres(): boolean {
  return !process.env.POSTGRES_URL && !process.env.TEST_POSTGRES_URL;
}

/**
 * Get the connection string for tests
 */
export function getTestConnectionString(): string {
  return process.env.TEST_POSTGRES_URL || process.env.POSTGRES_URL || '';
}

/**
 * Clean up test data for a specific agent
 */
export async function cleanupTestData(adapter: PgAdapter, agentId: UUID): Promise<void> {
  try {
    await adapter.query('DELETE FROM memories WHERE agent_id = $1', [agentId]);
    await adapter.query('DELETE FROM entities WHERE agent_id = $1', [agentId]);
    await adapter.query('DELETE FROM rooms WHERE agent_id = $1', [agentId]);
    await adapter.query('DELETE FROM agents WHERE id = $1', [agentId]);
  } catch (error) {
    console.warn('Error cleaning up test data:', error);
  }
}
