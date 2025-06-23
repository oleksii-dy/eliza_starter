import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'bun:test';
import { v4 as uuidv4 } from 'uuid';
import {
  ChannelType,
  MemoryType,
  type Entity,
  type Memory,
  type Room,
  type UUID,
} from '@elizaos/core';
import { PgDatabaseAdapter } from '../../pg/adapter';
import { embeddingTable, memoryTable } from '../../schema';
import { createIsolatedTestDatabase } from '../test-helpers';

describe('PostgreSQL Vector Search Tests', () => {
  let adapter: PgDatabaseAdapter | null = null;
  let cleanup: (() => Promise<void>) | null = null;
  let testAgentId: UUID;
  let testEntityId: UUID;
  let testRoomId: UUID;

  beforeAll(async () => {
    // Skip these tests if POSTGRES_URL is not set
    if (!process.env.POSTGRES_URL) {
      console.log('Skipping PostgreSQL vector search tests - POSTGRES_URL not set');
      return;
    }

    try {
      const setup = await createIsolatedTestDatabase('postgres-vector-search');

      // Only run these tests if we got a PostgreSQL adapter
      if (setup.adapter.constructor.name !== 'PgDatabaseAdapter') {
        console.log('Skipping PostgreSQL vector search tests - not using PostgreSQL adapter');
        return;
      }

      adapter = setup.adapter as PgDatabaseAdapter;
      cleanup = setup.cleanup;
      testAgentId = setup.testAgentId;

      // Generate test data
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
    } catch (error) {
      console.error('Failed to setup PostgreSQL test:', error);
      throw error;
    }
  }, 30000);

  afterAll(async () => {
    if (cleanup) {
      await cleanup();
    }
  });

  beforeEach(async () => {
    if (!adapter) return;

    // Clear existing data
    await adapter.getDatabase().delete(embeddingTable);
    await adapter.getDatabase().delete(memoryTable);
  });

  it('should perform accurate vector similarity search', async () => {
    if (!adapter) {
      console.log('Test skipped - no PostgreSQL connection');
      return;
    }

    // Ensure we're using 384 dimensions
    await adapter.ensureEmbeddingDimension(384);

    // Create embeddings that simulate semantic similarity
    // These embeddings are designed to have known similarity relationships
    const createEmbedding = (values: number[] noise: number = 0.1): number[] => {
      const embedding = new Array(384).fill(0);

      // Set initial values
      for (let i = 0; i < Math.min(values.length, 384); i++) {
        embedding[i] = values[i];
      }

      // Add controlled noise
      for (let i = values.length; i < 384; i++) {
        embedding[i] = (Math.random() - 0.5) * noise;
      }

      // Normalize to unit vector
      const magnitude = Math.sqrt(embedding.reduce((sum, val) => sum + val * val, 0));
      return embedding.map((val) => val / magnitude);
    };

    // Create memories with carefully crafted embeddings
    const memories: Memory[] = [
      {
        id: uuidv4() as UUID,
        agentId: testAgentId,
        entityId: testEntityId,
        roomId: testRoomId,
        content: { text: 'hello world' },
        // Base embedding for "hello world"
        embedding: createEmbedding([0.9, 0.8, 0.7, 0.6, 0.5, 0.4, 0.3, 0.2]),
        createdAt: Date.now() - 3000,
        unique: false,
        metadata: { type: MemoryType.CUSTOM, category: 'greeting' },
      },
      {
        id: uuidv4() as UUID,
        agentId: testAgentId,
        entityId: testEntityId,
        roomId: testRoomId,
        content: { text: 'hi planet' },
        // Very similar to "hello world" (90% similarity)
        embedding: createEmbedding([0.88, 0.78, 0.68, 0.58, 0.48, 0.38, 0.28, 0.18]),
        createdAt: Date.now() - 2000,
        unique: false,
        metadata: { type: MemoryType.CUSTOM, category: 'greeting' },
      },
      {
        id: uuidv4() as UUID,
        agentId: testAgentId,
        entityId: testEntityId,
        roomId: testRoomId,
        content: { text: 'greetings earth' },
        // Somewhat similar (70% similarity)
        embedding: createEmbedding([0.7, 0.6, 0.5, 0.4, 0.3, 0.2, 0.1, 0.0]),
        createdAt: Date.now() - 1500,
        unique: false,
        metadata: { type: MemoryType.CUSTOM, category: 'greeting' },
      },
      {
        id: uuidv4() as UUID,
        agentId: testAgentId,
        entityId: testEntityId,
        roomId: testRoomId,
        content: { text: 'this is a towel' },
        // Very different embedding
        embedding: createEmbedding([0.1, 0.2, 0.1, 0.9, 0.8, 0.7, 0.6, 0.5]),
        createdAt: Date.now() - 1000,
        unique: false,
        metadata: { type: MemoryType.CUSTOM, category: 'object' },
      },
    ];

    // Create all memories
    for (const memory of memories) {
      await adapter.createMemory(memory, 'vector_test');
    }

    // Search with an embedding similar to "hello world"
    const searchEmbedding = createEmbedding([0.89, 0.79, 0.69, 0.59, 0.49, 0.39, 0.29, 0.19]);

    const searchResults = await adapter.searchMemories({
      embedding: searchEmbedding,
      roomId: testRoomId,
      match_threshold: 0.0, // Get all results to check ordering
      count: 10,
      tableName: 'vector_test',
    });

    // Verify results
    expect(searchResults).toBeDefined();
    expect(searchResults.length).toBe(4);

    // Check ordering - should be ordered by similarity
    expect(searchResults[0].content.text).toBe('hi planet'); // Most similar
    expect(searchResults[1].content.text).toBe('hello world'); // Second most similar
    expect(searchResults[2].content.text).toBe('greetings earth'); // Third
    expect(searchResults[3].content.text).toBe('this is a towel'); // Least similar

    // Verify similarity scores are in descending order
    for (let i = 1; i < searchResults.length; i++) {
      const prevSimilarity = searchResults[i - 1].similarity || 0;
      const currSimilarity = searchResults[i].similarity || 0;
      expect(prevSimilarity).toBeGreaterThanOrEqual(currSimilarity);
    }

    // Test with threshold filtering
    const filteredResults = await adapter.searchMemories({
      embedding: searchEmbedding,
      roomId: testRoomId,
      match_threshold: 0.7, // Only get highly similar results
      count: 10,
      tableName: 'vector_test',
    });

    // Should only get the most similar results
    expect(filteredResults.length).toBeLessThan(4);
    expect(filteredResults.every((r) => (r.similarity || 0) >= 0.7)).toBe(true);
  });

  it('should handle different embedding dimensions correctly', async () => {
    if (!adapter) {
      console.log('Test skipped - no PostgreSQL connection');
      return;
    }

    // Test with 768 dimensions
    await adapter.ensureEmbeddingDimension(768);

    const createEmbedding768 = (seed: number): number[] => {
      const embedding = new Array(768).fill(0);
      for (let i = 0; i < 768; i++) {
        embedding[i] = Math.sin(i * seed) * Math.cos(i * seed * 0.5);
      }
      // Normalize
      const magnitude = Math.sqrt(embedding.reduce((sum, val) => sum + val * val, 0));
      return embedding.map((val) => val / magnitude);
    };

    const memory: Memory = {
      id: uuidv4() as UUID,
      agentId: testAgentId,
      entityId: testEntityId,
      roomId: testRoomId,
      content: { text: 'Testing 768 dimension embedding' },
      embedding: createEmbedding768(0.123),
      createdAt: Date.now(),
      unique: false,
      metadata: { type: MemoryType.CUSTOM },
    };

    await adapter.createMemory(memory, 'dim_test_768');

    // Search with similar embedding
    const searchResults = await adapter.searchMemories({
      embedding: createEmbedding768(0.124), // Slightly different seed
      roomId: testRoomId,
      match_threshold: 0.5,
      count: 10,
      tableName: 'dim_test_768',
    });

    expect(searchResults.length).toBe(1);
    expect(searchResults[0].content.text).toBe('Testing 768 dimension embedding');
    expect(searchResults[0].embedding?.length).toBe(768);
  });

  it('should handle edge cases in vector search', async () => {
    if (!adapter) {
      console.log('Test skipped - no PostgreSQL connection');
      return;
    }

    await adapter.ensureEmbeddingDimension(384);

    // Test with zero vector
    const zeroVector = new Array(384).fill(0);
    zeroVector[0] = 1; // Make it non-zero to avoid division by zero

    // Test with very sparse vector
    const sparseVector = new Array(384).fill(0);
    sparseVector[10] = 1;
    sparseVector[100] = 1;
    sparseVector[200] = 1;

    // Normalize sparse vector
    const sparseMagnitude = Math.sqrt(3);
    const normalizedSparse = sparseVector.map((val) => val / sparseMagnitude);

    const edgeCaseMemory: Memory = {
      id: uuidv4() as UUID,
      agentId: testAgentId,
      entityId: testEntityId,
      roomId: testRoomId,
      content: { text: 'Edge case memory' },
      embedding: normalizedSparse,
      createdAt: Date.now(),
      unique: false,
      metadata: { type: MemoryType.CUSTOM },
    };

    await adapter.createMemory(edgeCaseMemory, 'edge_case_test');

    // Search with the same sparse vector should find it
    const results = await adapter.searchMemories({
      embedding: normalizedSparse,
      roomId: testRoomId,
      match_threshold: 0.9, // High threshold
      count: 10,
      tableName: 'edge_case_test',
    });

    expect(results.length).toBe(1);
    expect(results[0].content.text).toBe('Edge case memory');
    expect(results[0].similarity).toBeGreaterThan(0.99); // Should be nearly identical
  });
});
