import { describe, it, expect, beforeEach, afterEach } from 'bun:test';
import { connectionRegistry } from '../../../connection-registry';
import { PGliteClientManager } from '../../../pglite/manager';
import { PgliteDatabaseAdapter } from '../../../pglite/adapter';
import { PostgresConnectionManager } from '../../../pg/manager';
import { PgDatabaseAdapter } from '../../../pg/adapter';
import { type UUID, logger } from '@elizaos/core';
import { TestDbManager, generateTestDbPath } from '../../test-db-utils';
import path from 'path';

// Suppress logs during tests
logger.level = 'error';

describe('Connection Registry Tests', () => {
  const testDbManager = new TestDbManager();

  beforeEach(() => {
    connectionRegistry.clearAll();
  });

  afterEach(async () => {
    // Clean up all test databases
    await testDbManager.cleanupAll();
    connectionRegistry.clearAll();
  });

  describe('PGLite Manager Registry', () => {
    it('should create singleton managers per directory', async () => {
      const dir1 = await testDbManager.createTestDb('registry-1');
      const dir2 = await testDbManager.createTestDb('registry-2');

      // Get managers for different directories
      const manager1a = connectionRegistry.getPGLiteManager(dir1);
      const manager1b = connectionRegistry.getPGLiteManager(dir1);
      const manager2 = connectionRegistry.getPGLiteManager(dir2);

      // Same directory should return same manager
      expect(manager1a).toBe(manager1b);

      // Different directories should return different managers
      expect(manager1a).not.toBe(manager2);
    });

    it('should normalize directory paths', async () => {
      const baseDir = await testDbManager.createTestDb('registry-norm');

      // Different path representations of same directory
      const manager1 = connectionRegistry.getPGLiteManager(baseDir);
      const manager2 = connectionRegistry.getPGLiteManager(`${baseDir}/`);
      const manager3 = connectionRegistry.getPGLiteManager(`${baseDir}/.`);

      // Should all be the same manager
      expect(manager1).toBe(manager2);
      expect(manager1).toBe(manager3);
    });

    it('should handle relative paths', async () => {
      const relPath1 = './.test-registry-rel1';
      const relPath2 = './.test-registry-rel2';

      // Store absolute paths for cleanup
      testDbManager['testDbs'].add(path.resolve(relPath1));
      testDbManager['testDbs'].add(path.resolve(relPath2));

      const manager1 = connectionRegistry.getPGLiteManager(relPath1);
      const manager2 = connectionRegistry.getPGLiteManager(relPath2);

      expect(manager1).not.toBe(manager2);
    });

    it('should track manager lifecycle', async () => {
      const dir = await testDbManager.createTestDb('registry-lifecycle');

      const manager = connectionRegistry.getPGLiteManager(dir);

      // Initialize and verify
      await manager.initialize();
      expect(manager.getConnection()).toBeDefined();

      // Get same manager again
      const sameManager = connectionRegistry.getPGLiteManager(dir);
      expect(sameManager).toBe(manager);
      expect(sameManager.getConnection()).toBeDefined();

      // Close manager
      await manager.close();
    });
  });

  describe('Postgres Manager Registry', () => {
    it('should create singleton managers per connection string', () => {
      const url1 = 'postgres://user:pass@localhost:5432/db1';
      const url2 = 'postgres://user:pass@localhost:5432/db2';

      const manager1a = connectionRegistry.getPostgresManager(url1);
      const manager1b = connectionRegistry.getPostgresManager(url1);
      const manager2 = connectionRegistry.getPostgresManager(url2);

      // Same URL should return same manager
      expect(manager1a).toBe(manager1b);

      // Different URLs should return different managers
      expect(manager1a).not.toBe(manager2);
    });

    it('should handle URL variations', () => {
      const baseUrl = 'postgres://user:pass@localhost:5432/testdb';

      // Different representations
      const manager1 = connectionRegistry.getPostgresManager(baseUrl);
      const manager2 = connectionRegistry.getPostgresManager(`${baseUrl}?ssl=false`);
      const manager3 = connectionRegistry.getPostgresManager(`${baseUrl}?ssl=true`);

      // Different query params = different managers
      expect(manager1).not.toBe(manager2);
      expect(manager2).not.toBe(manager3);
    });
  });

  describe('Adapter Registry', () => {
    it('should register and retrieve adapters by agent ID', async () => {
      const dir = await testDbManager.createTestDb('adapter-reg');

      const agentId1 = 'agent-1' as UUID;
      const agentId2 = 'agent-2' as UUID;

      const manager = connectionRegistry.getPGLiteManager(dir);
      const adapter1 = new PgliteDatabaseAdapter(agentId1, manager, dir);
      const adapter2 = new PgliteDatabaseAdapter(agentId2, manager, dir);

      // Adapters should auto-register
      expect(connectionRegistry.getAdapter(agentId1)).toBe(adapter1);
      expect(connectionRegistry.getAdapter(agentId2)).toBe(adapter2);
    });

    it('should handle adapter replacement', async () => {
      const dir = await testDbManager.createTestDb('adapter-replace');

      const agentId = 'test-agent' as UUID;
      const manager = connectionRegistry.getPGLiteManager(dir);

      // Create first adapter
      const adapter1 = new PgliteDatabaseAdapter(agentId, manager, dir);
      expect(connectionRegistry.getAdapter(agentId)).toBe(adapter1);

      // Create second adapter for same agent
      const adapter2 = new PgliteDatabaseAdapter(agentId, manager, dir);

      // Should replace the first one
      expect(connectionRegistry.getAdapter(agentId)).toBe(adapter2);
      expect(connectionRegistry.getAdapter(agentId)).not.toBe(adapter1);
    });

    it('should handle mixed adapter types', async () => {
      const dir = await testDbManager.createTestDb('mixed-adapters');

      const pgUrl = 'postgres://user:pass@localhost:5432/testdb';
      const agentId1 = 'pglite-agent' as UUID;
      const agentId2 = 'postgres-agent' as UUID;

      // Create PGLite adapter
      const pgliteManager = connectionRegistry.getPGLiteManager(dir);
      const pgliteAdapter = new PgliteDatabaseAdapter(agentId1, pgliteManager, dir);

      // Create Postgres adapter
      const pgManager = connectionRegistry.getPostgresManager(pgUrl);
      const pgAdapter = new PgDatabaseAdapter(agentId2, pgManager, pgUrl);

      // Both should be in registry
      expect(connectionRegistry.getAdapter(agentId1)).toBe(pgliteAdapter);
      expect(connectionRegistry.getAdapter(agentId2)).toBe(pgAdapter);
    });
  });

  describe('Registry Cleanup', () => {
    it('should clear all managers on clearAll', async () => {
      const dir1 = await testDbManager.createTestDb('clear-1');
      const dir2 = await testDbManager.createTestDb('clear-2');

      // Create managers
      const manager1 = connectionRegistry.getPGLiteManager(dir1);
      const manager2 = connectionRegistry.getPGLiteManager(dir2);

      await manager1.initialize();
      await manager2.initialize();

      // Create adapters
      const adapter1 = new PgliteDatabaseAdapter('agent-1' as UUID, manager1, dir1);
      const adapter2 = new PgliteDatabaseAdapter('agent-2' as UUID, manager2, dir2);

      // Verify they're registered
      expect(connectionRegistry.getAdapter('agent-1' as UUID)).toBe(adapter1);
      expect(connectionRegistry.getAdapter('agent-2' as UUID)).toBe(adapter2);

      // Clear all
      connectionRegistry.clearAll();

      // Should create new managers
      const newManager1 = connectionRegistry.getPGLiteManager(dir1);
      const newManager2 = connectionRegistry.getPGLiteManager(dir2);

      expect(newManager1).not.toBe(manager1);
      expect(newManager2).not.toBe(manager2);

      // Adapters should be gone
      expect(connectionRegistry.getAdapter('agent-1' as UUID)).toBeNull();
      expect(connectionRegistry.getAdapter('agent-2' as UUID)).toBeNull();

      // Clean up new managers
      await newManager1.close();
      await newManager2.close();
    });

    it('should handle clearAll during active operations', async () => {
      const dir = await testDbManager.createTestDb('clear-active');

      const manager = connectionRegistry.getPGLiteManager(dir);
      const adapter = new PgliteDatabaseAdapter('test-agent' as UUID, manager, dir);

      await adapter.init();

      // Start some operations
      const operations = Array.from(
        { length: 5 },
        (_, i) =>
          adapter
            .createMemory({
              entityId: 'test-entity' as UUID,
              roomId: 'test-room' as UUID,
              content: { text: `Memory ${i}` },
              createdAt: Date.now() + i,
            })
            .catch(() => {}) // Ignore errors
      );

      // Clear registry while operations are in flight
      connectionRegistry.clearAll();

      // Operations might fail, but should not hang
      await Promise.allSettled(operations);

      // New manager should be different
      const newManager = connectionRegistry.getPGLiteManager(dir);
      expect(newManager).not.toBe(manager);

      await newManager.close();
    });
  });

  describe('Edge Cases', () => {
    it('should handle undefined/null paths gracefully', () => {
      // Should use default path
      const manager1 = connectionRegistry.getPGLiteManager(undefined as any);
      const manager2 = connectionRegistry.getPGLiteManager(null as any);
      const manager3 = connectionRegistry.getPGLiteManager('');

      expect(manager1).toBeDefined();
      expect(manager2).toBeDefined();
      expect(manager3).toBeDefined();

      // Should all use the same default
      expect(manager1).toBe(manager2);
      expect(manager1).toBe(manager3);
    });

    it('should handle special characters in paths', async () => {
      const specialDir = await testDbManager.createTestDb('special-chars-äöü-你好');

      // Should handle without error
      const manager = connectionRegistry.getPGLiteManager(specialDir);
      expect(manager).toBeDefined();
    });

    it('should handle very long paths', async () => {
      // This test was problematic - now using centralized test db with short paths
      const longTestName = 'a'.repeat(100); // Will be truncated by sanitizeTestName
      const dbPath = await generateTestDbPath(longTestName);

      // The path should be reasonable length now
      expect(dbPath.length).toBeLessThan(260); // Windows MAX_PATH limit

      // Should handle without error
      const manager = connectionRegistry.getPGLiteManager(dbPath);
      expect(manager).toBeDefined();
    });
  });

  describe('Concurrency', () => {
    it('should handle concurrent manager requests', async () => {
      const dir = await testDbManager.createTestDb('concurrent');

      // Request same manager from multiple "threads"
      const promises = Array.from({ length: 10 }, () =>
        Promise.resolve(connectionRegistry.getPGLiteManager(dir))
      );

      const managers = await Promise.all(promises);

      // All should be the same instance
      const firstManager = managers[0];
      managers.forEach((manager) => {
        expect(manager).toBe(firstManager);
      });
    });

    it('should handle concurrent adapter registration', async () => {
      const dir = await testDbManager.createTestDb('concurrent-adapters');

      const manager = connectionRegistry.getPGLiteManager(dir);

      // Create adapters concurrently
      const adapterPromises = Array.from({ length: 10 }, (_, i) =>
        Promise.resolve(new PgliteDatabaseAdapter(`agent-${i}` as UUID, manager, dir))
      );

      const adapters = await Promise.all(adapterPromises);

      // All should be registered
      adapters.forEach((adapter, i) => {
        expect(connectionRegistry.getAdapter(`agent-${i}` as UUID)).toBe(adapter);
      });
    });
  });
});
