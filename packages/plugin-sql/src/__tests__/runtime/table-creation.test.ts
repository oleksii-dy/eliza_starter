import { describe, it, expect, beforeEach, afterEach, afterAll } from 'bun:test';
import { AgentRuntime, Character, type UUID, stringToUuid, logger } from '@elizaos/core';
import { sql } from 'drizzle-orm';
import plugin from '../../index';
// import { resolvePgliteDir } from '../../utils'; // No longer needed for PostgreSQL
import { PgManager } from '../../pg/manager';
import { PgAdapter } from '../../pg/adapter';
import { connectionRegistry } from '../../connection-registry';
import { schemaRegistry } from '../../schema-registry';
import { TestDbManager } from '../test-db-utils';

// Skip all runtime tests temporarily
describe.skip('SQL Plugin Runtime Table Creation Tests', () => {
  let runtime: AgentRuntime;
  let testAgentId: UUID;
  let activeManagers: PgManager[] = [];
  let dbManager: TestDbManager;

  // Set test environment to allow mock entities
  process.env.ELIZA_TESTING_PLUGIN = 'true';

  beforeEach(async () => {
    // Reset schema registry state to ensure fresh table creation
    schemaRegistry.resetCreatedTables();

    // Create test database manager
    dbManager = new TestDbManager();

    // Create a unique agent ID for each test to prevent adapter conflicts
    testAgentId = stringToUuid(`Test Agent ${Date.now()}-${Math.random()}`);
  });

  afterEach(async () => {
    // Cleanup runtime if exists
    if (runtime) {
      try {
        await runtime.stop();
      } catch (error) {
        // Ignore stop errors
      }
      runtime = null as any;
    }

    // Close all active managers
    for (const manager of activeManagers) {
      try {
        await manager.close();
      } catch (error) {
        // Ignore cleanup errors
      }
    }
    activeManagers = [];

    // Important: Clean up database adapters from the connection registry
    try {
      // Get the adapter from the registry and close it
      const adapter = connectionRegistry.getAdapter(testAgentId);
      if (adapter) {
        await adapter.close();
        connectionRegistry.removeAdapter(testAgentId);
      }
    } catch (error) {
      // Ignore cleanup errors
    }

    // Reset schema registry state
    schemaRegistry.resetCreatedTables();

    // Cleanup test databases
    await dbManager.cleanupAll();

    // Force garbage collection if available (helps with memory cleanup)
    if (global.gc) {
      global.gc();
    }
  });

  afterAll(async () => {
    // Final cleanup of all connections
    await connectionRegistry.cleanup();
  });

  describe('Plugin Initialization', () => {
    it('should handle table creation errors gracefully', async () => {
      // Create test database path
      const testDbPath = await dbManager.createTestDb('table-creation');

      // Create a manager with valid configuration
      const manager = new PgManager({ connectionString: testDbPath });
      activeManagers.push(manager);

      const adapter = new PgAdapter(testAgentId, manager);

      // The adapter's init() method should complete successfully
      await expect(adapter.init()).resolves.toBeUndefined();

      // Clean up
      await adapter.close();
    });
  });
});
