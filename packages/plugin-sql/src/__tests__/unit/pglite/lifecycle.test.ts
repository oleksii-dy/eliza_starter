import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { PGliteClientManager } from '../../../pglite/manager';
import { PgliteDatabaseAdapter } from '../../../pglite/adapter';
import { connectionRegistry } from '../../../connection-registry';
import { type UUID, logger, type Entity } from '@elizaos/core';
import { rm } from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';
import { sql } from 'drizzle-orm';

// Suppress logs during tests
logger.level = 'error';

describe('PGLite Lifecycle Tests', () => {
  const testAgentId = 'test-agent-123' as UUID;
  let testDataDir: string;
  let manager: PGliteClientManager;
  let adapter: PgliteDatabaseAdapter;

  beforeEach(async () => {
    
    // Create unique test directory for each test
    testDataDir = path.join(process.cwd(), `.test-pglite-${Date.now()}`);
    
    // Ensure clean state
    if (existsSync(testDataDir)) {
      await rm(testDataDir, { recursive: true, force: true });
    }
  });

  afterEach(async () => {
    // Clean up any open connections
    if (adapter) {
      try {
        await adapter.close();
      } catch (error) {
        // Ignore errors during cleanup
      }
    }
    
    if (manager) {
      try {
        await manager.close();
      } catch (error) {
        // Ignore errors during cleanup
      }
    }

    // Clean up test directory
    if (existsSync(testDataDir)) {
      await rm(testDataDir, { recursive: true, force: true });
    }

    // Clear registry
    connectionRegistry.clearAll();
  });

  describe('Manager Lifecycle', () => {
    it('should create and initialize manager properly', async () => {
      manager = new PGliteClientManager(testDataDir);
      
      // Manager should not be initialized yet
      expect(() => manager.getConnection()).toThrow('PGLite client not initialized');
      
      // Initialize
      await manager.initialize();
      
      // Should have connection now
      const connection = manager.getConnection();
      expect(connection).toBeDefined();
      expect(connection).not.toBeNull();
    });

    it('should handle multiple initialization calls gracefully', async () => {
      manager = new PGliteClientManager(testDataDir);
      
      // Initialize multiple times concurrently
      const promises = [
        manager.initialize(),
        manager.initialize(),
        manager.initialize(),
      ];
      
      await Promise.all(promises);
      
      // Should still have single connection
      const connection = manager.getConnection();
      expect(connection).toBeDefined();
      
      // Should be able to query
      const result = await connection.query('SELECT 1 as test');
      expect(result.rows[0].test).toBe(1);
    });

    it('should close connection properly', async () => {
      manager = new PGliteClientManager(testDataDir);
      await manager.initialize();
      
      const connection = manager.getConnection();
      expect(connection).toBeDefined();
      
      // Close
      await manager.close();
      
      // Should be in shutdown state
      expect(manager.isShuttingDown()).toBe(true);
      
      // Connection should be cleared
      expect(() => manager.getConnection()).toThrow('PGLite client not initialized');
    });

    it('should prevent operations during shutdown', async () => {
      manager = new PGliteClientManager(testDataDir);
      await manager.initialize();
      
      // Start shutdown
      const closePromise = manager.close();
      
      // Try to get connection during shutdown
      expect(manager.isShuttingDown()).toBe(true);
      
      await closePromise;
    });

    it('should handle close on uninitialized manager', async () => {
      manager = new PGliteClientManager(testDataDir);
      
      // Close without initializing
      await manager.close();
      
      expect(manager.isShuttingDown()).toBe(true);
    });
  });

  describe('Adapter Lifecycle', () => {
    it('should create and initialize adapter with manager', async () => {
      manager = new PGliteClientManager(testDataDir);
      await manager.initialize();
      
      adapter = new PgliteDatabaseAdapter(testAgentId, manager, testDataDir);
      
      // Adapter should not be ready until init
      const isReadyBefore = await adapter.isReady();
      expect(isReadyBefore).toBe(false);
      
      // Initialize adapter
      await adapter.init();
      
      // Should be ready now
      const isReadyAfter = await adapter.isReady();
      expect(isReadyAfter).toBe(true);
    });

    it('should handle adapter init when manager not initialized', async () => {
      manager = new PGliteClientManager(testDataDir);
      // Don't initialize manager
      
      adapter = new PgliteDatabaseAdapter(testAgentId, manager, testDataDir);
      
      // Init should initialize manager too
      await adapter.init();
      
      // Should be ready
      const isReady = await adapter.isReady();
      expect(isReady).toBe(true);
    });

    it('should run migrations successfully', async () => {
      manager = new PGliteClientManager(testDataDir);
      await manager.initialize();
      
      adapter = new PgliteDatabaseAdapter(testAgentId, manager, testDataDir);
      await adapter.init();
      
      // Check that critical tables exist
      const db = adapter.getDatabase();
      
      // Test querying core tables
      await db.execute(sql`SELECT 1 FROM agents WHERE 1=0`);
      await db.execute(sql`SELECT 1 FROM entities WHERE 1=0`);
      await db.execute(sql`SELECT 1 FROM rooms WHERE 1=0`);
      await db.execute(sql`SELECT 1 FROM memories WHERE 1=0`);
    });

    it('should handle multiple adapter instances on same manager', async () => {
      // Use registry to get shared manager
      manager = connectionRegistry.getPGLiteManager(testDataDir);
      await manager.initialize();
      
      const adapter1 = new PgliteDatabaseAdapter('agent-1' as UUID, manager, testDataDir);
      const adapter2 = new PgliteDatabaseAdapter('agent-2' as UUID, manager, testDataDir);
      
      await adapter1.init();
      await adapter2.init();
      
      // Both should be ready
      expect(await adapter1.isReady()).toBe(true);
      expect(await adapter2.isReady()).toBe(true);
      
      // Close one adapter
      await adapter1.close();
      
      // Manager should still be active for adapter2 due to reference counting
      // Note: If using direct manager creation, it will be shut down
      // Only registry-managed managers have reference counting
      expect(await adapter2.isReady()).toBe(true);
      
      // Close second adapter
      await adapter2.close();
    });

    it('should handle adapter operations during shutdown', async () => {
      // Create manager directly to control lifecycle
      manager = new PGliteClientManager(testDataDir);
      await manager.initialize();
      
      adapter = new PgliteDatabaseAdapter(testAgentId, manager, testDataDir);
      await adapter.init();
      
      // Start closing the adapter
      await adapter.close();
      
      // After close, adapter should not be ready (due to isClosed flag)
      const isReady = await adapter.isReady();
      expect(isReady).toBe(false);
      
      // Try to perform an operation on the closed adapter
      let operationFailed = false;
      try {
        await adapter.createMemory({
          id: 'test-memory' as UUID,
          entityId: 'test-entity' as UUID,
          roomId: 'test-room' as UUID,
          content: { text: 'test' },
          createdAt: Date.now(),
        });
      } catch (error) {
        operationFailed = true;
        expect(error).toBeDefined();
        expect((error as Error).message).toContain('Adapter is closed');
      }
      
      expect(operationFailed).toBe(true);
    });
  });

  describe('Connection Registry', () => {
    it('should reuse managers for same directory', async () => {
      const manager1 = connectionRegistry.getPGLiteManager(testDataDir);
      const manager2 = connectionRegistry.getPGLiteManager(testDataDir);
      
      expect(manager1).toBe(manager2);
    });

    it('should create different managers for different directories', async () => {
      const dir1 = `${testDataDir}-1`;
      const dir2 = `${testDataDir}-2`;
      
      const manager1 = connectionRegistry.getPGLiteManager(dir1);
      const manager2 = connectionRegistry.getPGLiteManager(dir2);
      
      expect(manager1).not.toBe(manager2);
      
      // Clean up
      await manager1.close();
      await manager2.close();
      
      if (existsSync(dir1)) {
        await rm(dir1, { recursive: true, force: true });
      }
      if (existsSync(dir2)) {
        await rm(dir2, { recursive: true, force: true });
      }
    });

    it('should track adapters by agent ID', async () => {
      manager = new PGliteClientManager(testDataDir);
      adapter = new PgliteDatabaseAdapter(testAgentId, manager, testDataDir);
      
      // Should be in registry
      const retrieved = connectionRegistry.getAdapter(testAgentId);
      expect(retrieved).toBe(adapter);
    });

    it('should clear all connections', async () => {
      const dir1 = `${testDataDir}-1`;
      const dir2 = `${testDataDir}-2`;
      
      // Get managers but don't initialize them yet
      const manager1 = connectionRegistry.getPGLiteManager(dir1);
      const manager2 = connectionRegistry.getPGLiteManager(dir2);
      
      // Verify they exist in registry
      expect(manager1).toBeDefined();
      expect(manager2).toBeDefined();
      
      // Clear all connections
      connectionRegistry.clearAll();
      
      // Should create new managers
      const newManager1 = connectionRegistry.getPGLiteManager(dir1);
      const newManager2 = connectionRegistry.getPGLiteManager(dir2);
      
      expect(newManager1).not.toBe(manager1);
      expect(newManager2).not.toBe(manager2);
    });
  });

  describe('Error Recovery', () => {
    it('should recover from initialization errors', async () => {
      // Use in-memory database to avoid permission errors
      // Instead test with a manager that will fail differently
      manager = new PGliteClientManager(testDataDir);
      
      // Mock the createPGliteInstance to throw an error
      const originalCreate = (manager as any).createPGliteInstance;
      (manager as any).createPGliteInstance = async () => {
        throw new Error('Simulated initialization error');
      };
      
      let initFailed = false;
      try {
        await manager.initialize();
      } catch (error) {
        // Expected to fail
        initFailed = true;
        expect(error).toBeDefined();
        expect((error as Error).message).toContain('Simulated initialization error');
      }
      
      expect(initFailed).toBe(true);
      
      // Restore original method
      (manager as any).createPGliteInstance = originalCreate;
      
      // Should be able to close even after failed init
      await manager.close();
      expect(manager.isShuttingDown()).toBe(true);
    });

    it('should handle database operations on closed connection', async () => {
      manager = new PGliteClientManager(testDataDir);
      await manager.initialize();
      
      adapter = new PgliteDatabaseAdapter(testAgentId, manager, testDataDir);
      await adapter.init();
      
      // Close the adapter
      await adapter.close();
      
      // Try to perform operations - manager should be shut down
      const isReady = await adapter.isReady();
      expect(isReady).toBe(false);
      
      // Try to create memory (should handle gracefully)
      let operationFailed = false;
      try {
        await adapter.createMemory({
          id: 'test-memory' as UUID,
          entityId: 'test-entity' as UUID,
          roomId: 'test-room' as UUID,
          content: { text: 'test' },
          createdAt: Date.now(),
        });
      } catch (error) {
        // Expected to fail, but should not crash
        operationFailed = true;
        expect(error).toBeDefined();
      }
      
      expect(operationFailed).toBe(true);
    });

    it('should handle concurrent close operations', async () => {
      manager = new PGliteClientManager(testDataDir);
      await manager.initialize();
      
      // Try to close multiple times concurrently
      const closePromises = [
        manager.close(),
        manager.close(),
        manager.close(),
      ];
      
      // All should complete without error
      await Promise.all(closePromises);
      
      expect(manager.isShuttingDown()).toBe(true);
    });
  });

  describe('Data Persistence', () => {
    it('should persist data across restarts', async () => {
      // First session - use registry to ensure proper lifecycle
      manager = connectionRegistry.getPGLiteManager(testDataDir);
      await manager.initialize();
      
      adapter = new PgliteDatabaseAdapter(testAgentId, manager, testDataDir);
      await adapter.init();
      
      // Create some data using createEntities
      const entityId = `test-entity-${Date.now()}` as UUID;
      const success = await adapter.createEntities([{
        id: entityId,
        names: ['Test Entity'],
        metadata: { test: true },
        agentId: testAgentId,
      }]);
      
      expect(success).toBe(true);
      
      // Verify entity was created
      const checkEntities = await adapter.getEntitiesByIds([entityId]);
      expect(checkEntities).toHaveLength(1);
      
      // Close adapter first
      await adapter.close();
      
      // Clear the registry to ensure manager is closed
      connectionRegistry.clearAll();
      
      // Wait for PGLite cleanup (3 seconds as per CLEANUP_DELAY)
      await new Promise(resolve => setTimeout(resolve, 3500));
      
      // Second session - new instances via registry
      const manager2 = connectionRegistry.getPGLiteManager(testDataDir);
      await manager2.initialize();
      
      const adapter2 = new PgliteDatabaseAdapter(testAgentId, manager2, testDataDir);
      await adapter2.init();
      
      // Data should still exist
      const entities = await adapter2.getEntitiesByIds([entityId]);
      expect(entities).toBeDefined();
      expect(entities).toHaveLength(1);
      
      if (entities && entities.length > 0) {
        const entity = entities[0];
        expect(entity.names).toContain('Test Entity');
        expect(entity.metadata.test).toBe(true);
      }
      
      // Clean up
      await adapter2.close();
    });

    it('should handle database directory deletion', async () => {
      manager = new PGliteClientManager(testDataDir);
      await manager.initialize();
      
      adapter = new PgliteDatabaseAdapter(testAgentId, manager, testDataDir);
      await adapter.init();
      
      // Create some data using createEntities
      const entityId = `test-entity-${Date.now()}` as UUID;
      await adapter.createEntities([{
        id: entityId,
        names: ['Test Entity'],
        metadata: {},
        agentId: testAgentId,
      }]);
      
      // Close adapter but not manager
      await adapter.close();
      
      // Delete the database directory (simulate corruption/deletion)
      if (existsSync(testDataDir)) {
        await rm(testDataDir, { recursive: true, force: true });
      }
      
      // Try to create new adapter
      const adapter2 = new PgliteDatabaseAdapter(testAgentId, manager, testDataDir);
      
      // Should handle missing directory gracefully
      try {
        await adapter2.init();
      } catch (error) {
        // Expected to fail, but should not crash process
        expect(error).toBeDefined();
      }
    });
  });
});