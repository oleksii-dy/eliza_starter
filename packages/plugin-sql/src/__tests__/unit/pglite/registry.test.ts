import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { connectionRegistry } from '../../../connection-registry';
import { PGliteClientManager } from '../../../pglite/manager';
import { PgliteDatabaseAdapter } from '../../../pglite/adapter';
import { PostgresConnectionManager } from '../../../pg/manager';
import { PgDatabaseAdapter } from '../../../pg/adapter';
import { type UUID, logger } from '@elizaos/core';
import { rm } from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';

// Suppress logs during tests
logger.level = 'error';

describe('Connection Registry Tests', () => {
  const testDirs: string[] = [];

  beforeEach(() => {
    connectionRegistry.clearAll();
  });

  afterEach(async () => {
    // Clean up all test directories
    for (const dir of testDirs) {
      if (existsSync(dir)) {
        await rm(dir, { recursive: true, force: true });
      }
    }
    testDirs.length = 0;
    
    connectionRegistry.clearAll();
  });

  describe('PGLite Manager Registry', () => {
    it('should create singleton managers per directory', () => {
      const dir1 = path.join(process.cwd(), `.test-registry-1-${Date.now()}`);
      const dir2 = path.join(process.cwd(), `.test-registry-2-${Date.now()}`);
      testDirs.push(dir1, dir2);

      // Get managers for different directories
      const manager1a = connectionRegistry.getPGLiteManager(dir1);
      const manager1b = connectionRegistry.getPGLiteManager(dir1);
      const manager2 = connectionRegistry.getPGLiteManager(dir2);

      // Same directory should return same manager
      expect(manager1a).toBe(manager1b);
      
      // Different directories should return different managers
      expect(manager1a).not.toBe(manager2);
    });

    it('should normalize directory paths', () => {
      const baseDir = path.join(process.cwd(), `.test-registry-norm-${Date.now()}`);
      testDirs.push(baseDir);

      // Different path representations of same directory
      const manager1 = connectionRegistry.getPGLiteManager(baseDir);
      const manager2 = connectionRegistry.getPGLiteManager(`${baseDir}/`);
      const manager3 = connectionRegistry.getPGLiteManager(`${baseDir}/.`);

      // Should all be the same manager
      expect(manager1).toBe(manager2);
      expect(manager1).toBe(manager3);
    });

    it('should handle relative paths', () => {
      const relPath1 = './.test-registry-rel1';
      const relPath2 = './.test-registry-rel2';
      
      // Store absolute paths for cleanup
      testDirs.push(
        path.resolve(relPath1),
        path.resolve(relPath2)
      );

      const manager1 = connectionRegistry.getPGLiteManager(relPath1);
      const manager2 = connectionRegistry.getPGLiteManager(relPath2);

      expect(manager1).not.toBe(manager2);
    });

    it('should track manager lifecycle', async () => {
      const dir = path.join(process.cwd(), `.test-registry-lifecycle-${Date.now()}`);
      testDirs.push(dir);

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
      const dir = path.join(process.cwd(), `.test-adapter-reg-${Date.now()}`);
      testDirs.push(dir);

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
      const dir = path.join(process.cwd(), `.test-adapter-replace-${Date.now()}`);
      testDirs.push(dir);

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

    it('should handle mixed adapter types', () => {
      const dir = path.join(process.cwd(), `.test-mixed-adapters-${Date.now()}`);
      testDirs.push(dir);

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
      const dir1 = path.join(process.cwd(), `.test-clear-1-${Date.now()}`);
      const dir2 = path.join(process.cwd(), `.test-clear-2-${Date.now()}`);
      testDirs.push(dir1, dir2);

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
      const dir = path.join(process.cwd(), `.test-clear-active-${Date.now()}`);
      testDirs.push(dir);

      const manager = connectionRegistry.getPGLiteManager(dir);
      const adapter = new PgliteDatabaseAdapter('test-agent' as UUID, manager, dir);
      
      await adapter.init();

      // Start some operations
      const operations = Array.from({ length: 5 }, (_, i) =>
        adapter.createMemory({
          entityId: 'test-entity' as UUID,
          roomId: 'test-room' as UUID,
          content: { text: `Memory ${i}` },
          createdAt: Date.now() + i,
        }).catch(() => {}) // Ignore errors
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

    it('should handle special characters in paths', () => {
      const specialDir = path.join(process.cwd(), `.test-special-${Date.now()}-äöü-你好`);
      testDirs.push(specialDir);

      // Should handle without error
      const manager = connectionRegistry.getPGLiteManager(specialDir);
      expect(manager).toBeDefined();
    });

    it('should handle very long paths', () => {
      const longSegment = 'a'.repeat(50);
      const longPath = path.join(
        process.cwd(),
        `.test-long-${Date.now()}`,
        longSegment,
        longSegment,
        longSegment
      );
      testDirs.push(longPath);

      // Should handle without error
      const manager = connectionRegistry.getPGLiteManager(longPath);
      expect(manager).toBeDefined();
    });
  });

  describe('Concurrency', () => {
    it('should handle concurrent manager requests', async () => {
      const dir = path.join(process.cwd(), `.test-concurrent-${Date.now()}`);
      testDirs.push(dir);

      // Request same manager from multiple "threads"
      const promises = Array.from({ length: 10 }, () =>
        Promise.resolve(connectionRegistry.getPGLiteManager(dir))
      );

      const managers = await Promise.all(promises);

      // All should be the same instance
      const firstManager = managers[0];
      managers.forEach(manager => {
        expect(manager).toBe(firstManager);
      });
    });

    it('should handle concurrent adapter registration', async () => {
      const dir = path.join(process.cwd(), `.test-concurrent-adapters-${Date.now()}`);
      testDirs.push(dir);

      const manager = connectionRegistry.getPGLiteManager(dir);

      // Create adapters concurrently
      const adapterPromises = Array.from({ length: 10 }, (_, i) =>
        Promise.resolve(
          new PgliteDatabaseAdapter(`agent-${i}` as UUID, manager, dir)
        )
      );

      const adapters = await Promise.all(adapterPromises);

      // All should be registered
      adapters.forEach((adapter, i) => {
        expect(connectionRegistry.getAdapter(`agent-${i}` as UUID)).toBe(adapter);
      });
    });
  });
});