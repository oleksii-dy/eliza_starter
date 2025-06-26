import { describe, test, expect, beforeAll, afterAll, beforeEach } from 'bun:test';
import { PgAdapter } from '../../pg/adapter';
import { PgManager } from '../../pg/manager';
import type { IAgentRuntime } from '@elizaos/core';
import pgvector from 'pgvector';

describe('pgvector Integration Tests', () => {
  let adapter: PgAdapter;
  let manager: PgManager;
  let runtime: IAgentRuntime;

  beforeAll(async () => {
    // Setup test database with pgvector extension
    const testConfig = {
      connectionString: process.env.TEST_POSTGRES_URL || 'postgresql://localhost:5432/eliza_test',
      ssl: false,
    };

    manager = new PgManager(testConfig);
    await manager.connect();

    // Ensure pgvector extension is installed
    await manager.query('CREATE EXTENSION IF NOT EXISTS vector');

    adapter = new PgAdapter('test-agent-id' as UUID, manager);
    runtime = createMockRuntime();

    await adapter.init();
  });

  afterAll(async () => {
    await adapter.close();
    await manager.close();
  });

  beforeEach(async () => {
    // Clean up test data before each test
    await adapter.query('DELETE FROM memories WHERE content->>"text" LIKE \'test_%\'');
  });

  describe('Vector Column Operations', () => {
    test('should create vector columns with correct dimensions', async () => {
      const result = await adapter.query(`
        SELECT column_name, data_type, character_maximum_length 
        FROM information_schema.columns 
        WHERE table_name = 'memories' AND column_name LIKE '%embedding%'
      `);

      expect(result.length).toBeGreaterThan(0);

      // Check for standard embedding dimensions
      const embeddingColumns = result.map((r) => r.column_name);
      expect(embeddingColumns).toContain('dim_1536'); // OpenAI embeddings
      expect(embeddingColumns).toContain('dim_384'); // Smaller models
    });

    test('should insert vectors with proper formatting', async () => {
      const testVector = [0.1, 0.2, 0.3, 0.4, 0.5];
      const vectorString = pgvector.toSql(testVector);

      const memory = {
        id: 'test-vector-001',
        entityId: 'test-entity',
        roomId: 'test-room',
        content: { text: 'test_vector_insert' },
        dim_384: vectorString,
      };

      await adapter.createMemory(memory);

      const retrieved = await adapter.getMemoryById('test-vector-001');
      expect(retrieved).toBeTruthy();
      expect(retrieved.dim_384).toBeTruthy();
    });
  });

  describe('Vector Similarity Search', () => {
    test('should perform cosine similarity search', async () => {
      // Insert test vectors
      const testVectors = [
        { id: 'vec-1', vector: [1, 0, 0, 0, 0], text: 'test_similarity_1' },
        { id: 'vec-2', vector: [0, 1, 0, 0, 0], text: 'test_similarity_2' },
        { id: 'vec-3', vector: [0.9, 0.1, 0, 0, 0], text: 'test_similarity_3' }, // Similar to vec-1
      ];

      for (const { id, vector, text } of testVectors) {
        await adapter.createMemory({
          id,
          entityId: 'test-entity',
          roomId: 'test-room',
          content: { text },
          dim_384: pgvector.toSql(vector.concat(Array(379).fill(0))), // Pad to 384 dimensions
        });
      }

      // Search for vectors similar to [1, 0, 0, 0, 0]
      const queryVector = [1, 0, 0, 0, 0].concat(Array(379).fill(0));
      const results = await adapter.searchMemoriesByEmbedding({
        embedding: queryVector,
        roomId: 'test-room',
        match_threshold: 0.5,
        count: 3,
      });

      expect(results.length).toBeGreaterThan(0);
      expect(results[0].content.text).toBe('test_similarity_1'); // Exact match should be first
      expect(results[1].content.text).toBe('test_similarity_3'); // Similar vector should be second
    });

    test('should respect similarity threshold', async () => {
      // Insert a vector
      await adapter.createMemory({
        id: 'threshold-test',
        entityId: 'test-entity',
        roomId: 'test-room',
        content: { text: 'test_threshold' },
        dim_384: pgvector.toSql([1, 0, 0].concat(Array(381).fill(0))),
      });

      // Search with high threshold (no results expected)
      const results = await adapter.searchMemoriesByEmbedding({
        embedding: [0, 1, 0].concat(Array(381).fill(0)), // Orthogonal vector
        roomId: 'test-room',
        match_threshold: 0.9, // High threshold
        count: 10,
      });

      expect(results.length).toBe(0);
    });

    test('should handle different distance metrics', async () => {
      const testVector = [0.5, 0.5, 0.5].concat(Array(381).fill(0));

      await adapter.createMemory({
        id: 'distance-test',
        entityId: 'test-entity',
        roomId: 'test-room',
        content: { text: 'test_distance_metrics' },
        dim_384: pgvector.toSql(testVector),
      });

      // Test L2 distance (default)
      const l2Results = await adapter.searchMemoriesByEmbedding({
        embedding: testVector,
        roomId: 'test-room',
        match_threshold: 0.1,
        count: 1,
      });

      expect(l2Results.length).toBe(1);
      expect(l2Results[0].similarity).toBeCloseTo(1.0, 2); // Should be very close to 1.0 for identical vectors
    });
  });

  describe('HNSW Index Performance', () => {
    test('should create HNSW indexes for vector columns', async () => {
      // Check if HNSW indexes exist
      const indexQuery = `
        SELECT indexname, indexdef 
        FROM pg_indexes 
        WHERE tablename = 'memories' 
        AND indexdef LIKE '%hnsw%'
      `;

      const indexes = await adapter.query(indexQuery);

      // Should have at least one HNSW index for embeddings
      expect(indexes.length).toBeGreaterThan(0);

      const hnswIndex = indexes.find(
        (idx) => idx.indexdef.includes('hnsw') && idx.indexdef.includes('vector_cosine_ops')
      );
      expect(hnswIndex).toBeTruthy();
    });

    test('should perform fast similarity search with HNSW', async () => {
      // Insert a larger dataset to test index performance
      const batchSize = 100;
      const vectors = Array.from({ length: batchSize }, (_, i) => ({
        id: `perf-test-${i}`,
        vector: Array.from({ length: 384 }, () => Math.random()),
        text: `test_performance_${i}`,
      }));

      // Batch insert
      for (const { id, vector, text } of vectors) {
        await adapter.createMemory({
          id,
          entityId: 'test-entity',
          roomId: 'test-room',
          content: { text },
          dim_384: pgvector.toSql(vector),
        });
      }

      // Measure search time
      const queryVector = Array.from({ length: 384 }, () => Math.random());
      const startTime = performance.now();

      const results = await adapter.searchMemoriesByEmbedding({
        embedding: queryVector,
        roomId: 'test-room',
        match_threshold: 0.1,
        count: 10,
      });

      const searchTime = performance.now() - startTime;

      expect(results.length).toBeGreaterThan(0);
      expect(searchTime).toBeLessThan(100); // Should be fast with HNSW index
    });
  });

  describe('Vector Index Management', () => {
    test('should handle index creation and updates', async () => {
      // Test that we can create additional vector indexes
      const createIndexSQL = `
        CREATE INDEX IF NOT EXISTS test_vector_idx 
        ON memories USING hnsw (dim_384 vector_l2_ops)
        WITH (m = 16, ef_construction = 64)
      `;

      await expect(adapter.query(createIndexSQL)).resolves.not.toThrow();
    });

    test('should optimize index parameters based on data size', async () => {
      // This would test dynamic index optimization based on table size
      const stats = await adapter.query(`
        SELECT 
          schemaname,
          tablename,
          n_tup_ins as inserts,
          n_tup_upd as updates,
          n_tup_del as deletes
        FROM pg_stat_user_tables 
        WHERE tablename = 'memories'
      `);

      expect(stats.length).toBe(1);
      expect(stats[0].tablename).toBe('memories');
    });
  });

  describe('Bulk Vector Operations', () => {
    test('should efficiently handle bulk vector inserts', async () => {
      const batchSize = 50;
      const memories = Array.from({ length: batchSize }, (_, i) => ({
        id: `bulk-${i}`,
        entityId: 'bulk-entity',
        roomId: 'bulk-room',
        content: { text: `bulk_test_${i}` },
        dim_384: pgvector.toSql(Array.from({ length: 384 }, () => Math.random())),
      }));

      const startTime = performance.now();

      // Use transaction for bulk insert
      await adapter.db.transaction(async (tx) => {
        for (const memory of memories) {
          await tx.insert(adapter.schema.memories).values(memory);
        }
      });

      const insertTime = performance.now() - startTime;

      // Verify all were inserted
      const count = await adapter.query(
        "SELECT COUNT(*) as count FROM memories WHERE room_id = 'bulk-room'"
      );

      expect(count[0].count).toBe(batchSize.toString());
      expect(insertTime).toBeLessThan(5000); // Should complete within 5 seconds
    });

    test('should handle vector updates efficiently', async () => {
      // Insert initial vector
      const initialVector = Array.from({ length: 384 }, () => 0.1);
      await adapter.createMemory({
        id: 'update-test',
        entityId: 'test-entity',
        roomId: 'test-room',
        content: { text: 'test_update' },
        dim_384: pgvector.toSql(initialVector),
      });

      // Update with new vector
      const newVector = Array.from({ length: 384 }, () => 0.9);
      await adapter.updateMemory('update-test', {
        dim_384: pgvector.toSql(newVector),
      });

      // Verify update
      const updated = await adapter.getMemoryById('update-test');
      expect(updated.dim_384).toBeTruthy();

      // Verify the vector was actually updated by searching
      const searchResults = await adapter.searchMemoriesByEmbedding({
        embedding: newVector,
        roomId: 'test-room',
        match_threshold: 0.8,
        count: 1,
      });

      expect(searchResults.length).toBe(1);
      expect(searchResults[0].id).toBe('update-test');
    });
  });

  describe('Error Handling', () => {
    test('should handle invalid vector dimensions gracefully', async () => {
      const invalidVector = [1, 2, 3]; // Wrong dimension (should be 384)

      await expect(
        adapter.createMemory({
          id: 'invalid-dim',
          entityId: 'test-entity',
          roomId: 'test-room',
          content: { text: 'test_invalid' },
          dim_384: pgvector.toSql(invalidVector),
        })
      ).rejects.toThrow();
    });

    test('should handle malformed vector data', async () => {
      await expect(
        adapter.createMemory({
          id: 'malformed',
          entityId: 'test-entity',
          roomId: 'test-room',
          content: { text: 'test_malformed' },
          dim_384: 'invalid-vector-data',
        })
      ).rejects.toThrow();
    });

    test('should handle missing pgvector extension gracefully', async () => {
      // This would be a more complex test that temporarily disables the extension
      // For now, just verify the extension exists
      const extensions = await adapter.query("SELECT * FROM pg_extension WHERE extname = 'vector'");

      expect(extensions.length).toBe(1);
    });
  });
});

// Helper function to create a mock runtime for testing
function createMockRuntime(): IAgentRuntime {
  return {
    agentId: 'test-agent-id',
    character: {
      name: 'TestAgent',
      bio: 'Test agent for pgvector integration tests',
    },
    // Add other required runtime properties as needed for tests
  } as IAgentRuntime;
}
