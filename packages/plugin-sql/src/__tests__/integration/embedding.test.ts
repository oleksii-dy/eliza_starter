import {
  AgentRuntime,
  ChannelType,
  MemoryType,
  type Entity,
  type Memory,
  type Room,
  type UUID,
} from '@elizaos/core';
import { v4 as uuidv4 } from 'uuid';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'bun:test';
import { PgDatabaseAdapter } from '../../pg/adapter';
import { PgliteDatabaseAdapter } from '../../pglite/adapter';
import { embeddingTable, memoryTable } from '../../schema';
import { createIsolatedTestDatabase } from '../test-helpers';
import { sql } from 'drizzle-orm';

describe('Embedding Integration Tests', () => {
  let adapter: PgliteDatabaseAdapter | PgDatabaseAdapter;
  let runtime: AgentRuntime;
  let cleanup: () => Promise<void>;
  let testAgentId: UUID;
  let testEntityId: UUID;
  let testRoomId: UUID;

  beforeAll(async () => {
    const setup = await createIsolatedTestDatabase('embedding-tests');
    adapter = setup.adapter;
    runtime = setup.runtime;
    cleanup = setup.cleanup;
    testAgentId = setup.testAgentId;

    // Generate random UUIDs for test data
    testEntityId = uuidv4() as UUID;
    testRoomId = uuidv4() as UUID;

    await adapter.createEntities([
      { id: testEntityId, agentId: testAgentId, names: ['Test Entity'] } as Entity,
    ]);
    await adapter.createRooms([
      {
        id: testRoomId,
        agentId: testAgentId,
        name: 'Test Room',
        source: 'test',
        type: ChannelType.GROUP,
      } as Room,
    ]);
  });

  afterAll(async () => {
    if (cleanup) {
      await cleanup();
    }
  });

  describe('Embedding Tests', () => {
    beforeEach(async () => {
      await adapter.getDatabase().delete(embeddingTable);
      await adapter.getDatabase().delete(memoryTable);
    });

    it('should create a memory with an embedding and retrieve it', async () => {
      await adapter.ensureEmbeddingDimension(384);
      const memory: Memory = {
        id: uuidv4() as UUID,
        agentId: testAgentId,
        entityId: testEntityId,
        roomId: testRoomId,
        content: { text: 'This memory has an embedding.' },
        embedding: Array.from({ length: 384 }, () => Math.random()),
        createdAt: Date.now(),
        unique: false,
        metadata: {
          type: MemoryType.CUSTOM,
          source: 'test',
        },
      };

      console.log('Creating memory with embedding length:', memory.embedding?.length);
      const memoryId = await adapter.createMemory(memory, 'embedding_test');
      expect(memoryId).toBe(memory.id as UUID);

      const retrieved = await adapter.getMemoryById(memoryId);
      console.log('Retrieved memory:', {
        id: retrieved?.id,
        hasEmbedding: !!retrieved?.embedding,
        embeddingLength: retrieved?.embedding?.length,
        content: retrieved?.content,
      });
      
      // Check if embeddings table has the data
      if (memoryId) {
        const db = adapter.getDatabase();
        const embeddingRows = await db.execute(sql.raw(`SELECT * FROM embeddings WHERE memory_id = '${memoryId}'`));
        console.log('Embedding rows:', embeddingRows);
      }
      
      expect(retrieved).toBeDefined();
      expect(retrieved?.embedding).toBeDefined();
      expect(retrieved?.embedding?.length).toBe(384);
    });

    it('should handle different embedding dimensions', async () => {
      // Test with 768 dimensions
      await adapter.ensureEmbeddingDimension(768);

      const memory768: Memory = {
        id: uuidv4() as UUID,
        agentId: testAgentId,
        entityId: testEntityId,
        roomId: testRoomId,
        content: { text: 'This memory has a 768-dimension embedding.' },
        embedding: Array.from({ length: 768 }, () => Math.random()),
        createdAt: Date.now(),
        unique: false,
        metadata: {
          type: MemoryType.CUSTOM,
          source: 'test',
        },
      };

      const memoryId = await adapter.createMemory(memory768, 'embedding_test_768');
      const retrieved = await adapter.getMemoryById(memoryId);
      expect(retrieved?.embedding?.length).toBe(768);
    });

    it('should perform vector similarity search with relevance ordering', async () => {
      // Use 384 dimensions for this test
      await adapter.ensureEmbeddingDimension(384);

      // Helper function to create a simple embedding that represents semantic similarity
      // For testing, we'll use embeddings that have controlled similarity
      const createTestEmbedding = (baseVector: number[], similarity: number = 1.0): number[] => {
        const embedding = new Array(384).fill(0);
        // Copy base vector values scaled by similarity
        for (let i = 0; i < Math.min(baseVector.length, 384); i++) {
          embedding[i] = baseVector[i] * similarity;
        }
        // Add some noise to make it more realistic
        for (let i = baseVector.length; i < 384; i++) {
          embedding[i] = (Math.random() - 0.5) * 0.1;
        }
        // Normalize the vector
        const magnitude = Math.sqrt(embedding.reduce((sum, val) => sum + val * val, 0));
        return embedding.map((val) => val / magnitude);
      };

      // Create base embedding for "hello world" concept
      const helloWorldBase = [0.8, 0.6, 0.4, 0.3, 0.2, 0.1, 0.9, 0.7];

      // Create test memories with different semantic similarities
      const memories: Memory[] = [
        {
          id: uuidv4() as UUID,
          agentId: testAgentId,
          entityId: testEntityId,
          roomId: testRoomId,
          content: { text: 'hi planet' }, // Should be most similar to "hello world"
          embedding: createTestEmbedding(helloWorldBase, 0.85), // 85% similar
          createdAt: Date.now() - 3000,
          unique: false,
          metadata: { type: MemoryType.CUSTOM, source: 'test' },
        },
        {
          id: uuidv4() as UUID,
          agentId: testAgentId,
          entityId: testEntityId,
          roomId: testRoomId,
          content: { text: 'greetings earth' }, // Should be somewhat similar
          embedding: createTestEmbedding(helloWorldBase, 0.7), // 70% similar
          createdAt: Date.now() - 2000,
          unique: false,
          metadata: { type: MemoryType.CUSTOM, source: 'test' },
        },
        {
          id: uuidv4() as UUID,
          agentId: testAgentId,
          entityId: testEntityId,
          roomId: testRoomId,
          content: { text: 'this is a towel' }, // Should be least similar
          embedding: createTestEmbedding([0.1, 0.2, 0.9, 0.8, 0.3, 0.4, 0.5, 0.6], 1.0), // Different base
          createdAt: Date.now() - 1000,
          unique: false,
          metadata: { type: MemoryType.CUSTOM, source: 'test' },
        },
      ];

      // Create all memories
      for (const memory of memories) {
        await adapter.createMemory(memory, 'vector_search_test');
      }

      // Create search embedding for "hello world"
      const searchEmbedding = createTestEmbedding(helloWorldBase, 1.0);

      // Perform vector similarity search
      const searchResults = await adapter.searchMemories({
        embedding: searchEmbedding,
        roomId: testRoomId,
        match_threshold: 0.0, // Accept all results to see ordering
        count: 10,
        tableName: 'vector_search_test',
      });

      // Verify we got results
      expect(searchResults).toBeDefined();
      expect(searchResults.length).toBeGreaterThan(0);

      // Verify the ordering - "hi planet" should be first (most similar)
      expect(searchResults[0].content.text).toBe('hi planet');

      // If we got more results, verify "greetings earth" is second
      if (searchResults.length > 1) {
        expect(searchResults[1].content.text).toBe('greetings earth');
      }

      // "this is a towel" should be last (least similar)
      if (searchResults.length > 2) {
        expect(searchResults[searchResults.length - 1].content.text).toBe('this is a towel');
      }

      // Verify similarity scores are in descending order
      for (let i = 1; i < searchResults.length; i++) {
        const prevSimilarity = searchResults[i - 1].similarity;
        const currSimilarity = searchResults[i].similarity;
        expect(prevSimilarity).toBeGreaterThanOrEqual(currSimilarity || 0);
      }
    });

    it('should respect match_threshold in vector search', async () => {
      await adapter.ensureEmbeddingDimension(384);

      // Create a base embedding
      const baseEmbedding = Array.from({ length: 384 }, (_, i) => Math.sin(i / 10));

      // Normalize it
      const magnitude = Math.sqrt(baseEmbedding.reduce((sum, val) => sum + val * val, 0));
      const normalizedBase = baseEmbedding.map((val) => val / magnitude);

      // Create memories with varying similarities
      const memories: Memory[] = [
        {
          id: uuidv4() as UUID,
          agentId: testAgentId,
          entityId: testEntityId,
          roomId: testRoomId,
          content: { text: 'Very similar memory' },
          embedding: normalizedBase.map((val) => val * 0.95 + (Math.random() - 0.5) * 0.05),
          createdAt: Date.now(),
          unique: false,
          metadata: { type: MemoryType.CUSTOM, source: 'test' },
        },
        {
          id: uuidv4() as UUID,
          agentId: testAgentId,
          entityId: testEntityId,
          roomId: testRoomId,
          content: { text: 'Somewhat similar memory' },
          embedding: normalizedBase.map((val) => val * 0.7 + (Math.random() - 0.5) * 0.3),
          createdAt: Date.now(),
          unique: false,
          metadata: { type: MemoryType.CUSTOM, source: 'test' },
        },
        {
          id: uuidv4() as UUID,
          agentId: testAgentId,
          entityId: testEntityId,
          roomId: testRoomId,
          content: { text: 'Not very similar memory' },
          embedding: Array.from({ length: 384 }, () => (Math.random() - 0.5) * 2),
          createdAt: Date.now(),
          unique: false,
          metadata: { type: MemoryType.CUSTOM, source: 'test' },
        },
      ];

      // Create all memories
      for (const memory of memories) {
        await adapter.createMemory(memory, 'threshold_test');
      }

      // Search with high threshold - should only get very similar results
      const strictResults = await adapter.searchMemories({
        embedding: normalizedBase,
        roomId: testRoomId,
        match_threshold: 0.8,
        count: 10,
        tableName: 'threshold_test',
      });

      // Should only get the very similar memory
      expect(strictResults.length).toBeLessThanOrEqual(2);
      if (strictResults.length > 0) {
        expect(strictResults[0].content.text).toContain('similar memory');
      }

      // Search with low threshold - should get all results
      const lenientResults = await adapter.searchMemories({
        embedding: normalizedBase,
        roomId: testRoomId,
        match_threshold: 0.1,
        count: 10,
        tableName: 'threshold_test',
      });

      // Should get more results with lower threshold
      expect(lenientResults.length).toBeGreaterThanOrEqual(strictResults.length);
    });
  });
});
