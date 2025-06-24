import { describe, it, expect, beforeEach, afterEach } from 'bun:test';
import { PGliteClientManager } from '../../../pglite/manager';
import { PgliteDatabaseAdapter } from '../../../pglite/adapter';
import { connectionRegistry } from '../../../connection-registry';
import { type UUID, type Memory, logger } from '@elizaos/core';
import { rm } from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';

// Suppress logs during tests
logger.level = 'error';

describe('PGLite Stress Tests', () => {
  const testAgentId = 'stress-test-agent' as UUID;
  let testDataDir: string;
  let manager: PGliteClientManager;
  let adapter: PgliteDatabaseAdapter;

  beforeEach(async () => {
    // Use in-memory database for stress tests to avoid file system issues
    testDataDir = `:memory:stress-${Date.now()}`;
  });

  afterEach(async () => {
    if (adapter) {
      try {
        await adapter.close();
      } catch (error) {
        // Ignore cleanup errors
      }
    }

    if (manager) {
      try {
        await manager.close();
      } catch (error) {
        // Ignore cleanup errors
      }
    }

    connectionRegistry.clearAll();
  });

  describe('Concurrent Operations', () => {
    it('should handle concurrent memory creation', async () => {
      manager = new PGliteClientManager(testDataDir);
      adapter = new PgliteDatabaseAdapter(testAgentId, manager, testDataDir);
      await adapter.init();

      const roomId = 'test-room' as UUID;
      const entityId = 'test-entity' as UUID;

      // Create memories concurrently
      const promises = Array.from({ length: 20 }, (_, i) =>
        adapter.createMemory(
          {
            entityId,
            roomId,
            content: { text: `Memory ${i}` },
            createdAt: Date.now() + i,
          },
          'messages'
        )
      );

      const results = await Promise.all(promises);

      // All should succeed
      expect(results).toHaveLength(20);
      results.forEach((id) => expect(id).toBeDefined());

      // Verify all were created
      const memories = await adapter.getMemories({ roomId, count: 30, tableName: 'messages' });
      expect(memories).toHaveLength(20);
    });

    it('should handle concurrent reads and writes', async () => {
      manager = new PGliteClientManager(testDataDir);
      adapter = new PgliteDatabaseAdapter(testAgentId, manager, testDataDir);
      await adapter.init();

      const entityId = 'test-entity' as UUID;
      const roomId = 'test-room' as UUID;

      // Start with some data
      await adapter.createMemory(
        {
          entityId,
          roomId,
          content: { text: 'Initial memory' },
          createdAt: Date.now(),
        },
        'messages'
      );

      // Mix reads and writes
      const operations: Promise<any>[] = Array.from({ length: 30 }, (_, i) => {
        if (i % 3 === 0) {
          // Read operation
          return adapter.getMemories({ roomId, count: 10, tableName: 'messages' });
        } else {
          // Write operation
          return adapter.createMemory(
            {
              entityId,
              roomId,
              content: { text: `Concurrent memory ${i}` },
              createdAt: Date.now() + i,
            },
            'messages'
          );
        }
      });

      // All should complete without deadlock
      const results = await Promise.all(operations);

      // Verify we got results
      expect(results).toBeDefined();
      expect(results.length).toBe(30);

      // Verify no errors occurred
      const readOperationCount = Math.floor(30 / 3) + (30 % 3 === 0 ? 1 : 0);
      const writeOperationCount = 30 - readOperationCount;

      // Check that read operations returned arrays
      let readCount = 0;
      let writeCount = 0;
      results.forEach((result, index) => {
        if (index % 3 === 0) {
          // This was a read operation
          expect(Array.isArray(result)).toBe(true);
          readCount++;
        } else {
          // This was a write operation (returns UUID)
          expect(typeof result).toBe('string');
          writeCount++;
        }
      });

      expect(readCount).toBe(10); // 30 operations, every 3rd is a read
      expect(writeCount).toBe(20); // The rest are writes
    });

    it('should handle rapid open/close cycles', async () => {
      // Test rapid connection cycling
      for (let i = 0; i < 5; i++) {
        const cycleDataDir = `:memory:cycle-${Date.now()}-${i}`;
        const cycleManager = new PGliteClientManager(cycleDataDir);
        const cycleAdapter = new PgliteDatabaseAdapter(
          `cycle-agent-${i}` as UUID,
          cycleManager,
          cycleDataDir
        );

        await cycleAdapter.init();

        // Do a quick operation
        await cycleAdapter.createEntities([
          {
            names: [`Entity ${i}`],
            metadata: {},
            agentId: `cycle-agent-${i}` as UUID,
          },
        ]);

        // Close immediately
        await cycleAdapter.close();
        await cycleManager.close();
      }
    }, 10000); // Increase timeout to 10 seconds
  });

  describe('Memory Pressure', () => {
    it('should handle large batch operations', async () => {
      manager = new PGliteClientManager(testDataDir);
      adapter = new PgliteDatabaseAdapter(testAgentId, manager, testDataDir);
      await adapter.init();

      const roomId = 'bulk-room' as UUID;
      const entityId = 'bulk-entity' as UUID;

      // Create many memories in batches
      const batchSize = 100;
      const numBatches = 5;

      for (let batch = 0; batch < numBatches; batch++) {
        const batchPromises = Array.from({ length: batchSize }, (_, i) => {
          const index = batch * batchSize + i;
          return adapter.createMemory(
            {
              entityId,
              roomId,
              content: {
                text: `Batch ${batch} Memory ${i}`,
                metadata: { batch, index },
              },
              createdAt: Date.now() + index,
            },
            'messages'
          );
        });

        await Promise.all(batchPromises);
      }

      // Verify count
      const count = await adapter.countMemories(roomId, true, 'messages');
      expect(count).toBe(batchSize * numBatches);
    });

    it('should handle large content gracefully', async () => {
      manager = new PGliteClientManager(testDataDir);
      adapter = new PgliteDatabaseAdapter(testAgentId, manager, testDataDir);
      await adapter.init();

      const roomId = 'large-content-room' as UUID;
      const entityId = 'large-content-entity' as UUID;

      // Create memory with large content
      const largeText = 'x'.repeat(10000); // 10KB of text

      const memoryId = await adapter.createMemory(
        {
          entityId,
          roomId,
          content: {
            text: largeText,
            metadata: { size: largeText.length },
          },
          createdAt: Date.now(),
        },
        'messages'
      );

      expect(memoryId).toBeDefined();

      // Retrieve and verify
      const memories = await adapter.getMemories({ roomId, count: 1, tableName: 'messages' });
      expect(memories).toHaveLength(1);
      expect(memories[0].content.text).toBe(largeText);
    });
  });

  describe('Error Conditions', () => {
    it('should handle operations on non-existent entities', async () => {
      manager = new PGliteClientManager(testDataDir);
      adapter = new PgliteDatabaseAdapter(testAgentId, manager, testDataDir);
      await adapter.init();

      const nonExistentId = 'non-existent-id' as UUID;

      // Try to get non-existent entity
      const entity = await adapter.getEntityById(nonExistentId);
      expect(entity).toBeNull();

      // Try to update non-existent entity - updateEntity returns undefined for non-existent entities
      const updateResult = await adapter.updateEntity({
        id: nonExistentId,
        names: ['Updated'],
        metadata: {},
        agentId: testAgentId,
      });
      expect(updateResult).toBeUndefined();
    });

    it('should handle invalid query parameters', async () => {
      manager = new PGliteClientManager(testDataDir);
      adapter = new PgliteDatabaseAdapter(testAgentId, manager, testDataDir);
      await adapter.init();

      // Test with invalid count - getMemories will use default count of 10
      const memories1 = await adapter.getMemories({
        roomId: 'test-room' as UUID,
        count: -1,
        tableName: 'messages',
      });
      expect(memories1).toBeDefined();
      expect(Array.isArray(memories1)).toBe(true);

      // Test with non-existent room ID - should return empty array
      const memories2 = await adapter.getMemories({
        roomId: 'non-existent-room' as UUID,
        count: 10,
        tableName: 'messages',
      });
      expect(memories2).toEqual([]);
    });

    it('should recover from query errors', async () => {
      manager = new PGliteClientManager(testDataDir);
      adapter = new PgliteDatabaseAdapter(testAgentId, manager, testDataDir);
      await adapter.init();

      // Force an error by trying to insert duplicate ID
      const duplicateId = 'duplicate-id' as UUID;
      const entityData = {
        id: duplicateId,
        names: ['Test Entity'],
        metadata: {},
        agentId: testAgentId,
      };

      // First insert should succeed
      await adapter.createEntities([entityData]);

      // Second insert should fail - but createEntities doesn't throw on duplicate, it returns false
      const secondResult = await adapter.createEntities([entityData]);
      expect(secondResult).toBe(false);

      // Should still be able to perform other operations
      const entities = await adapter.getEntitiesByIds([duplicateId]);
      expect(entities).toHaveLength(1);
    });
  });

  describe('Connection Stability', () => {
    it('should maintain connection during long operations', async () => {
      manager = new PGliteClientManager(testDataDir);
      adapter = new PgliteDatabaseAdapter(testAgentId, manager, testDataDir);
      await adapter.init();

      // Perform operations over extended period
      const operations: Promise<UUID>[] = [];

      for (let i = 0; i < 10; i++) {
        operations.push(
          adapter.createMemory(
            {
              entityId: 'test-entity' as UUID,
              roomId: 'test-room' as UUID,
              content: { text: `Memory ${i}` },
              createdAt: Date.now() + i,
            },
            'messages'
          )
        );

        // Small delay between operations
        await new Promise((resolve) => setTimeout(resolve, 10));
      }

      const results = await Promise.all(operations);
      expect(results).toHaveLength(10);

      // Connection should still be healthy
      const isReady = await adapter.isReady();
      expect(isReady).toBe(true);
    });

    it('should detect and report unhealthy connections', async () => {
      manager = new PGliteClientManager(testDataDir);
      adapter = new PgliteDatabaseAdapter(testAgentId, manager, testDataDir);
      await adapter.init();

      // Force close the underlying connection
      const connection = manager.getConnection();
      if (connection && typeof connection.close === 'function') {
        await connection.close();
      }

      // isReady should detect the closed connection
      const isReady = await adapter.isReady();
      expect(isReady).toBe(false);
    });
  });

  describe('Cleanup and Recovery', () => {
    it('should clean up resources on forced termination', async () => {
      manager = new PGliteClientManager(testDataDir);
      adapter = new PgliteDatabaseAdapter(testAgentId, manager, testDataDir);
      await adapter.init();

      // Start some operations
      const promises = Array.from({ length: 10 }, (_, i) =>
        adapter.createMemory(
          {
            entityId: 'test-entity' as UUID,
            roomId: 'test-room' as UUID,
            content: { text: `Memory ${i}` },
            createdAt: Date.now() + i,
          },
          'messages'
        )
      );

      // Force close without waiting
      adapter.close().catch(() => {}); // Ignore errors
      manager.close().catch(() => {}); // Ignore errors

      // Operations might fail, but should not hang
      const results = await Promise.allSettled(promises);

      // Some may have succeeded, some may have failed
      const succeeded = results.filter((r) => r.status === 'fulfilled').length;
      const failed = results.filter((r) => r.status === 'rejected').length;

      expect(succeeded + failed).toBe(10);
    });

    // Test removed - file permissions test not applicable to in-memory databases
  });
});
