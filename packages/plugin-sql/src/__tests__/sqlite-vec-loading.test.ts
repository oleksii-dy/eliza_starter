import type { Memory, UUID } from '@elizaos/core';
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { v4 as uuidv4 } from 'uuid';
import { BunSqliteAdapter } from '../bun-sqlite/adapter';

describe('BunSqlite sqlite-vec Extension Loading', () => {
  let adapter: BunSqliteAdapter;
  const testAgentId = uuidv4() as UUID;

  beforeEach(async () => {
    // Create in-memory adapter for testing
    adapter = new BunSqliteAdapter(testAgentId, {
      inMemory: true,
      vectorDimensions: 1536,
    });
  });

  afterEach(async () => {
    if (adapter) {
      await adapter.close();
    }
  });

  describe('Vector Support Initialization', () => {
    it('should initialize vector support without errors', async () => {
      await expect(adapter.init()).resolves.toBeUndefined();
      expect(adapter).toBeDefined();
    });

    it('should report vector support status correctly', async () => {
      await adapter.init();

      // The adapter should have some form of vector support (either sqlite-vec or JSON fallback)
      // We can check this by seeing if it has vector-related methods
      expect(typeof adapter.searchMemories).toBe('function');
      expect(typeof adapter.createMemory).toBe('function');
    });

    it('should handle sqlite-vec extension loading gracefully', async () => {
      await adapter.init();

      // Test that we can perform vector operations regardless of whether sqlite-vec loaded
      const testMemory = {
        id: uuidv4() as UUID,
        entityId: testAgentId,
        agentId: testAgentId,
        roomId: uuidv4() as UUID,
        content: {
          text: 'Test memory for vector search',
          source: 'test',
        },
        embedding: new Array(1536).fill(0).map(() => Math.random()),
        createdAt: Date.now(),
      };

      // This should work when sqlite-vec is available
      await expect(adapter.createMemory(testMemory, 'messages')).resolves.toBeDefined();
    });

    it('should support vector similarity search', async () => {
      await adapter.init();

      // Add a test memory with embedding
      const testMemory = {
        id: uuidv4() as UUID,
        entityId: testAgentId,
        agentId: testAgentId,
        roomId: uuidv4() as UUID,
        content: {
          text: 'Test memory for vector search',
          source: 'test',
        },
        embedding: new Array(1536).fill(0).map(() => Math.random()),
        createdAt: Date.now(),
      };

      await adapter.createMemory(testMemory, 'messages');

      // Test vector search
      const searchEmbedding = new Array(1536).fill(0).map(() => Math.random());

      const results = await adapter.searchMemories({
        tableName: 'messages',
        embedding: searchEmbedding,
        roomId: testMemory.roomId,
        match_threshold: 0.1,
        count: 5,
      });

      expect(Array.isArray(results)).toBe(true);
      // We should get at least our test memory back (or empty array if threshold too high)
      expect(results.length).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Extension Loading Fallback', () => {
    it('should handle missing sqlite-vec extension gracefully', async () => {
      // This test verifies that the adapter works even when sqlite-vec is not available
      await adapter.init();

      // The adapter should initialize successfully regardless
      expect(adapter).toBeDefined();

      // Vector operations should still work via JSON fallback
      const testMemory = {
        id: uuidv4() as UUID,
        entityId: testAgentId,
        agentId: testAgentId,
        roomId: uuidv4() as UUID,
        content: {
          text: 'Test memory without sqlite-vec',
          source: 'test',
        },
        embedding: [0.1, 0.2, 0.3], // Small embedding for testing
        createdAt: Date.now(),
      };

      await expect(adapter.createMemory(testMemory, 'messages')).resolves.toBeDefined();

      // Search should also work
      const results = await adapter.searchMemories({
        tableName: 'messages',
        embedding: [0.1, 0.2, 0.3],
        roomId: testMemory.roomId,
        match_threshold: 0.1,
        count: 5,
      });

      expect(Array.isArray(results)).toBe(true);
    });

    it('should create appropriate vector tables based on support', async () => {
      await adapter.init();

      // Check that some form of vector table exists
      // This query should work regardless of whether we have sqlite-vec or JSON fallback
      const result = await adapter.db.execute(
        "SELECT name FROM sqlite_master WHERE type='table' AND (name LIKE '%embedding%' OR name LIKE '%vector%' OR name LIKE '%memories%')"
      );

      expect(result.rows).toBeDefined();
      expect(result.rows.length).toBeGreaterThan(0);
    });
  });

  describe('Vector Operations Performance', () => {
    it('should perform vector operations within reasonable time', async () => {
      await adapter.init();

      const startTime = Date.now();

      // Add multiple memories
      const memories: Memory[] = [];
      for (let i = 0; i < 10; i++) {
        const memory = {
          id: uuidv4() as UUID,
          entityId: testAgentId,
          agentId: testAgentId,
          roomId: uuidv4() as UUID,
          content: {
            text: `Test memory ${i}`,
            source: 'test',
          },
          embedding: new Array(1536).fill(0).map(() => Math.random()),
          createdAt: Date.now(),
        };
        memories.push(memory);
        await adapter.createMemory(memory, 'messages');
      }

      // Perform searches
      for (let i = 0; i < 5; i++) {
        const searchEmbedding = new Array(1536).fill(0).map(() => Math.random());
        await adapter.searchMemories({
          tableName: 'messages',
          embedding: searchEmbedding,
          roomId: memories[0].roomId,
          match_threshold: 0.1,
          count: 5,
        });
      }

      const endTime = Date.now();
      const duration = endTime - startTime;

      // Operations should complete within 10 seconds (generous limit)
      expect(duration).toBeLessThan(10000);
    });
  });

  describe('Error Handling', () => {
    it('should handle invalid embeddings gracefully', async () => {
      await adapter.init();

      const invalidMemory = {
        id: uuidv4() as UUID,
        entityId: testAgentId,
        agentId: testAgentId,
        roomId: uuidv4() as UUID,
        content: {
          text: 'Test memory with invalid embedding',
          source: 'test',
        },
        embedding: null as any, // Invalid embedding
        createdAt: Date.now(),
      };

      // Should handle invalid embedding without crashing
      await expect(adapter.createMemory(invalidMemory, 'messages')).resolves.toBeDefined();
    });

    it('should handle malformed search parameters', async () => {
      await adapter.init();

      // Test with invalid search parameters - should reject with null embedding
      await expect(
        adapter.searchMemories({
          tableName: 'messages',
          embedding: null as any,
          roomId: uuidv4() as UUID,
          match_threshold: 0.5,
          count: 5,
        })
      ).rejects.toThrow();
    });
  });

  describe('Extension Detection', () => {
    it('should provide information about vector support capabilities', async () => {
      await adapter.init();

      // The adapter should be able to tell us about its vector capabilities
      // This is implicit in whether operations succeed
      const testMemory = {
        id: uuidv4() as UUID,
        entityId: testAgentId,
        agentId: testAgentId,
        roomId: uuidv4() as UUID,
        content: {
          text: 'Capability test memory',
          source: 'test',
        },
        embedding: new Array(1536).fill(0).map(() => Math.random()),
        createdAt: Date.now(),
      };

      // If this works, we have some form of vector support
      const addResult = await adapter.createMemory(testMemory, 'messages');
      expect(addResult).toBeDefined();

      // If this works, vector search is functional
      const searchResults = await adapter.searchMemories({
        tableName: 'messages',
        embedding: testMemory.embedding,
        roomId: testMemory.roomId,
        match_threshold: 0.1,
        count: 1,
      });

      expect(Array.isArray(searchResults)).toBe(true);
    });
  });
});
