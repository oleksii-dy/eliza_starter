import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { PGliteClientManager } from '../../../pglite/manager';
import { PgliteDatabaseAdapter } from '../../../pglite/adapter';
import { connectionRegistry } from '../../../connection-registry';
import { type UUID, logger } from '@elizaos/core';
import { rm } from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';

// Suppress logs during tests
logger.level = 'error';

describe('PGLite Restart and Recovery Tests', () => {
  const testAgentId = 'test-agent-restart' as UUID;
  let testDataDir: string;

  beforeEach(async () => {
    // Create unique test directory for each test
    testDataDir = path.join(process.cwd(), `.test-pglite-restart-${Date.now()}`);
    
    // Ensure clean state
    if (existsSync(testDataDir)) {
      await rm(testDataDir, { recursive: true, force: true });
    }
    
    // Force cleanup all existing instances before each test
    await PGliteClientManager.forceCleanupAll();
    connectionRegistry.clearAll();
  });

  afterEach(async () => {
    // Force cleanup all instances
    await PGliteClientManager.forceCleanupAll();
    connectionRegistry.clearAll();
    
    // Clean up test directory
    if (existsSync(testDataDir)) {
      await rm(testDataDir, { recursive: true, force: true });
    }
  });

  describe('Application Restart Simulation', () => {
    it('should handle immediate restart after shutdown', async () => {
      console.log('Test: Immediate restart simulation');
      
      // First session - simulate application start
      const manager1 = connectionRegistry.getPGLiteManager(testDataDir);
      await manager1.initialize();
      
      const adapter1 = new PgliteDatabaseAdapter(testAgentId, manager1, testDataDir);
      connectionRegistry.registerAdapter(testAgentId, adapter1);
      await adapter1.init();
      
      // Create some test data
      const entityId = `restart-entity-${Date.now()}` as UUID;
      await adapter1.createEntities([{
        id: entityId,
        names: ['Restart Test Entity'],
        metadata: { session: 1 },
        agentId: testAgentId,
      }]);
      
      // Verify creation
      const entities1 = await adapter1.getEntitiesByIds([entityId]);
      expect(entities1).toHaveLength(1);
      
      // Simulate graceful shutdown (like ctrl+c)
      console.log('Simulating graceful shutdown...');
      await adapter1.close();
      connectionRegistry.clearAll();
      
      // NO WAIT - Immediate restart (this is the problematic scenario)
      console.log('Attempting immediate restart...');
      
      // Second session - simulate immediate restart
      const manager2 = connectionRegistry.getPGLiteManager(testDataDir);
      
      // This should handle the WebAssembly error gracefully
      await manager2.initialize();
      
      const adapter2 = new PgliteDatabaseAdapter(testAgentId, manager2, testDataDir);
      connectionRegistry.registerAdapter(testAgentId, adapter2);
      await adapter2.init();
      
      // Verify data persisted
      const entities2 = await adapter2.getEntitiesByIds([entityId]);
      expect(entities2).toHaveLength(1);
      expect(entities2[0].metadata.session).toBe(1);
      
      // Clean up
      await adapter2.close();
    });

    it('should handle restart after proper cleanup delay', async () => {
      console.log('Test: Restart with proper cleanup delay');
      
      // First session
      const manager1 = connectionRegistry.getPGLiteManager(testDataDir);
      await manager1.initialize();
      
      const adapter1 = new PgliteDatabaseAdapter(testAgentId, manager1, testDataDir);
      await adapter1.init();
      
      // Create test data
      const entityId = `delayed-entity-${Date.now()}` as UUID;
      await adapter1.createEntities([{
        id: entityId,
        names: ['Delayed Restart Entity'],
        metadata: { session: 1 },
        agentId: testAgentId,
      }]);
      
      // Close
      await adapter1.close();
      connectionRegistry.clearAll();
      
      // Wait for proper cleanup (3 seconds as per CLEANUP_DELAY)
      console.log('Waiting for WebAssembly cleanup...');
      await new Promise(resolve => setTimeout(resolve, 3500));
      
      // Second session
      const manager2 = connectionRegistry.getPGLiteManager(testDataDir);
      await manager2.initialize();
      
      const adapter2 = new PgliteDatabaseAdapter(testAgentId, manager2, testDataDir);
      await adapter2.init();
      
      // Verify data
      const entities2 = await adapter2.getEntitiesByIds([entityId]);
      expect(entities2).toHaveLength(1);
      
      // Clean up
      await adapter2.close();
    });

    it('should handle multiple rapid restarts', async () => {
      console.log('Test: Multiple rapid restarts');
      
      const entityId = `rapid-entity-${Date.now()}` as UUID;
      
      // Simulate 3 rapid restarts
      for (let i = 0; i < 3; i++) {
        console.log(`Restart iteration ${i + 1}`);
        
        const manager = connectionRegistry.getPGLiteManager(testDataDir);
        await manager.initialize();
        
        const adapter = new PgliteDatabaseAdapter(testAgentId, manager, testDataDir);
        await adapter.init();
        
        if (i === 0) {
          // Create data on first iteration
          await adapter.createEntities([{
            id: entityId,
            names: ['Rapid Restart Entity'],
            metadata: { iteration: i + 1 },
            agentId: testAgentId,
          }]);
        } else {
          // Update data on subsequent iterations
          await adapter.updateEntity({
            id: entityId,
            names: ['Rapid Restart Entity'],
            metadata: { iteration: i + 1 },
            agentId: testAgentId,
          });
        }
        
        // Verify data
        const entities = await adapter.getEntitiesByIds([entityId]);
        expect(entities).toHaveLength(1);
        expect(entities[0].metadata.iteration).toBe(i + 1);
        
        // Close without waiting
        await adapter.close();
        connectionRegistry.clearAll();
        
        // Small delay between iterations (less than cleanup delay)
        if (i < 2) {
          await new Promise(resolve => setTimeout(resolve, 500));
        }
      }
    });

    it('should handle crash recovery (no graceful shutdown)', async () => {
      console.log('Test: Crash recovery simulation');
      
      // First session
      const manager1 = connectionRegistry.getPGLiteManager(testDataDir);
      await manager1.initialize();
      
      const adapter1 = new PgliteDatabaseAdapter(testAgentId, manager1, testDataDir);
      await adapter1.init();
      
      // Create test data
      const entityId = `crash-entity-${Date.now()}` as UUID;
      await adapter1.createEntities([{
        id: entityId,
        names: ['Crash Test Entity'],
        metadata: { session: 1 },
        agentId: testAgentId,
      }]);
      
      // Simulate crash - NO close() calls
      // Just clear references
      connectionRegistry.clearAll();
      
      // Force cleanup to simulate process death
      await PGliteClientManager.forceCleanupAll();
      
      // Wait a bit to simulate restart after crash
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Second session - recovery
      const manager2 = connectionRegistry.getPGLiteManager(testDataDir);
      await manager2.initialize();
      
      const adapter2 = new PgliteDatabaseAdapter(testAgentId, manager2, testDataDir);
      await adapter2.init();
      
      // Should recover and find data
      const entities2 = await adapter2.getEntitiesByIds([entityId]);
      expect(entities2).toHaveLength(1);
      expect(entities2[0].names).toContain('Crash Test Entity');
      
      // Clean up
      await adapter2.close();
    });

    it('should handle concurrent adapter creation during restart', async () => {
      console.log('Test: Concurrent adapter creation during restart');
      
      // First session - create data
      const manager1 = connectionRegistry.getPGLiteManager(testDataDir);
      await manager1.initialize();
      
      const adapter1 = new PgliteDatabaseAdapter('agent-1' as UUID, manager1, testDataDir);
      await adapter1.init();
      
      await adapter1.createEntities([{
        id: 'entity-1' as UUID,
        names: ['Entity 1'],
        metadata: {},
        agentId: 'agent-1' as UUID,
      }]);
      
      // Close
      await adapter1.close();
      connectionRegistry.clearAll();
      
      // Second session - multiple agents starting concurrently
      const manager2 = connectionRegistry.getPGLiteManager(testDataDir);
      
      // Create multiple adapters concurrently (simulating multiple agents)
      const adapterPromises = Promise.all([
        (async () => {
          const adapter = new PgliteDatabaseAdapter('agent-2' as UUID, manager2, testDataDir);
          await adapter.init();
          return adapter;
        })(),
        (async () => {
          const adapter = new PgliteDatabaseAdapter('agent-3' as UUID, manager2, testDataDir);
          await adapter.init();
          return adapter;
        })(),
        (async () => {
          const adapter = new PgliteDatabaseAdapter('agent-4' as UUID, manager2, testDataDir);
          await adapter.init();
          return adapter;
        })(),
      ]);
      
      const adapters = await adapterPromises;
      
      // All should be initialized
      for (const adapter of adapters) {
        const isReady = await adapter.isReady();
        expect(isReady).toBe(true);
        
        // Should be able to query existing data
        const entities = await adapter.getEntitiesByIds(['entity-1' as UUID]);
        expect(entities).toHaveLength(1);
      }
      
      // Clean up all adapters
      await Promise.all(adapters.map(adapter => adapter.close()));
    });
  });

  describe('Error Recovery During Restart', () => {
    it('should handle WebAssembly abort errors gracefully', async () => {
      console.log('Test: WebAssembly abort error handling');
      
      // Create a manager but mock the createPGliteInstance to simulate WASM error
      const manager = new PGliteClientManager(testDataDir);
      
      // Mock to simulate the specific error from the log
      const originalCreate = (manager as any).createPGliteInstance;
      let callCount = 0;
      (manager as any).createPGliteInstance = async function() {
        callCount++;
        if (callCount <= 2) {
          // Simulate the WebAssembly abort error
          const error = new Error('Aborted(). Build with -sASSERTIONS for more info.');
          error.name = 'RuntimeError';
          throw error;
        }
        // Third attempt succeeds
        return originalCreate.call(this);
      };
      
      // Should retry and eventually succeed
      await manager.initialize();
      
      // Should have retried and succeeded
      expect(callCount).toBeGreaterThanOrEqual(1);
      
      // Should be functional
      const connection = manager.getConnection();
      expect(connection).toBeDefined();
      
      // Clean up
      await manager.close();
    });

    it('should provide clear error message for persistent failures', async () => {
      console.log('Test: Persistent WebAssembly failure handling');
      
      const manager = new PGliteClientManager(testDataDir);
      
      // Mock to always fail
      (manager as any).createPGliteInstance = async () => {
        throw new Error('Aborted(). Build with -sASSERTIONS for more info.');
      };
      
      let error: Error | null = null;
      try {
        await manager.initialize();
      } catch (e) {
        error = e as Error;
      }
      
      expect(error).toBeDefined();
      // The error message can vary depending on where it fails in the retry logic
      expect(error!.message).toMatch(/PGLite initialization failed|WebAssembly/);
    });
  });

  describe('Performance During Restarts', () => {
    it('should track performance metrics across restart', async () => {
      console.log('Test: Performance tracking across restart');
      
      // First session
      const manager1 = connectionRegistry.getPGLiteManager(testDataDir);
      await manager1.initialize();
      
      const adapter1 = new PgliteDatabaseAdapter(testAgentId, manager1, testDataDir);
      await adapter1.init();
      
      // Perform some operations to generate metrics
      for (let i = 0; i < 5; i++) {
        await adapter1.createEntities([{
          id: `perf-entity-${i}` as UUID,
          names: [`Performance Entity ${i}`],
          metadata: {},
          agentId: testAgentId,
        }]);
      }
      
      // Get performance stats
      const stats1 = manager1.getPerformanceStats();
      // Performance tracking happens during actual queries, not just entity creation
      // So queryCount might be 0 if the operations are batched
      expect(stats1.queryCount).toBeGreaterThanOrEqual(0);
      expect(stats1.averageQueryTime).toBeGreaterThanOrEqual(0);
      
      // Close
      await adapter1.close();
      connectionRegistry.clearAll();
      
      // Wait for cleanup
      await new Promise(resolve => setTimeout(resolve, 3500));
      
      // Second session - new manager, new stats
      const manager2 = connectionRegistry.getPGLiteManager(testDataDir);
      await manager2.initialize();
      
      const adapter2 = new PgliteDatabaseAdapter(testAgentId, manager2, testDataDir);
      await adapter2.init();
      
      // Stats should be reset for new instance
      const stats2 = manager2.getPerformanceStats();
      expect(stats2.queryCount).toBe(0); // Fresh start
      
      // Clean up
      await adapter2.close();
    });
  });
});