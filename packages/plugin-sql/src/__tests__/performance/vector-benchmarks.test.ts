import { describe, test, expect, beforeAll, afterAll } from 'bun:test';
import { PgAdapter } from '../../pg/adapter';
import { PgManager } from '../../pg/manager';
import pgvector from 'pgvector';
import type { IAgentRuntime } from '@elizaos/core';

describe('Vector Performance Benchmarks', () => {
  let adapter: PgAdapter;
  let manager: PgManager;
  let runtime: IAgentRuntime;

  beforeAll(async () => {
    const testConfig = {
      connectionString: process.env.TEST_POSTGRES_URL || 'postgresql://localhost:5432/eliza_test',
      ssl: false,
    };

    manager = new PgManager(testConfig);
    await manager.connect();

    // Ensure pgvector extension is installed
    await manager.query('CREATE EXTENSION IF NOT EXISTS vector');

    adapter = new PgAdapter('benchmark-agent' as UUID, manager);
    runtime = createMockRuntime();

    await adapter.init();

    // Clean up any existing benchmark data
    await adapter.query('DELETE FROM memories WHERE content->>"text" LIKE \'benchmark_%\'');
  });

  afterAll(async () => {
    // Clean up benchmark data
    await adapter.query('DELETE FROM memories WHERE content->>"text" LIKE \'benchmark_%\'');
    await adapter.close();
    await manager.close();
  });

  describe('Vector Insert Performance', () => {
    test('should insert 1000 vectors in under 10 seconds', async () => {
      const vectorCount = 1000;
      const vectorDim = 384;

      console.log(`\n🚀 Benchmark: Inserting ${vectorCount} vectors of dimension ${vectorDim}`);

      const vectors = Array.from({ length: vectorCount }, (_, i) => ({
        id: `benchmark_insert_${i}`,
        entityId: 'benchmark-entity',
        roomId: 'benchmark-room',
        content: { text: `benchmark_insert_${i}` },
        dim_384: pgvector.toSql(Array.from({ length: vectorDim }, () => Math.random())),
        agentId: runtime.agentId,
      }));

      const startTime = performance.now();

      // Use transaction for optimal performance
      await adapter.db.transaction(async (tx) => {
        // Batch insert for better performance
        const batchSize = 100;
        for (let i = 0; i < vectors.length; i += batchSize) {
          const batch = vectors.slice(i, i + batchSize);
          await tx.insert(adapter.schema.memories).values(batch);
        }
      });

      const insertTime = performance.now() - startTime;
      const vectorsPerSecond = (vectorCount / insertTime) * 1000;

      console.log(`✅ Inserted ${vectorCount} vectors in ${insertTime.toFixed(2)}ms`);
      console.log(`📊 Performance: ${vectorsPerSecond.toFixed(2)} vectors/second`);

      expect(insertTime).toBeLessThan(10000); // Less than 10 seconds
      expect(vectorsPerSecond).toBeGreaterThan(100); // At least 100 vectors/second
    }, 15000); // Increase timeout for this test

    test('should handle different vector dimensions efficiently', async () => {
      const dimensions = [384, 768, 1536];
      const vectorsPerDim = 100;

      console.log('\n📏 Benchmark: Testing different vector dimensions');

      for (const dim of dimensions) {
        const vectors = Array.from({ length: vectorsPerDim }, (_, i) => ({
          id: `benchmark_dim_${dim}_${i}`,
          entityId: 'benchmark-entity',
          roomId: 'benchmark-room',
          content: { text: `benchmark_dim_${dim}_${i}` },
          [`dim_${dim}`]: pgvector.toSql(Array.from({ length: dim }, () => Math.random())),
          agentId: runtime.agentId,
        }));

        const startTime = performance.now();

        await adapter.db.transaction(async (tx) => {
          await tx.insert(adapter.schema.memories).values(vectors);
        });

        const insertTime = performance.now() - startTime;
        const vectorsPerSecond = (vectorsPerDim / insertTime) * 1000;

        console.log(
          `  ${dim}D: ${insertTime.toFixed(2)}ms (${vectorsPerSecond.toFixed(2)} vectors/sec)`
        );

        expect(insertTime).toBeLessThan(5000); // Should be fast for smaller batches
      }
    });
  });

  describe('Vector Search Performance', () => {
    test('should perform similarity search on 10k vectors in under 100ms', async () => {
      const vectorCount = 10000;
      const vectorDim = 384;

      console.log(`\n🔍 Benchmark: Similarity search on ${vectorCount} vectors`);

      // Insert test vectors
      console.log('📝 Preparing test dataset...');
      const vectors = Array.from({ length: vectorCount }, (_, i) => ({
        id: `benchmark_search_${i}`,
        entityId: 'search-entity',
        roomId: 'search-room',
        content: { text: `benchmark_search_${i}` },
        dim_384: pgvector.toSql(Array.from({ length: vectorDim }, () => Math.random())),
        agentId: runtime.agentId,
      }));

      await adapter.db.transaction(async (tx) => {
        const batchSize = 500;
        for (let i = 0; i < vectors.length; i += batchSize) {
          const batch = vectors.slice(i, i + batchSize);
          await tx.insert(adapter.schema.memories).values(batch);
        }
      });

      // Ensure HNSW index exists for optimal performance
      await adapter.query(`
        CREATE INDEX IF NOT EXISTS benchmark_hnsw_idx 
        ON memories USING hnsw (dim_384 vector_cosine_ops)
        WITH (m = 16, ef_construction = 64)
      `);

      // Wait for index to be built
      await new Promise((resolve) => setTimeout(resolve, 2000));

      // Perform similarity search
      const queryVector = Array.from({ length: vectorDim }, () => Math.random());

      const startTime = performance.now();

      const results = await adapter.searchMemoriesByEmbedding({
        embedding: queryVector,
        roomId: 'search-room',
        match_threshold: 0.1,
        count: 10,
      });

      const searchTime = performance.now() - startTime;

      console.log(`✅ Search completed in ${searchTime.toFixed(2)}ms`);
      console.log(`📊 Found ${results.length} similar vectors`);

      expect(searchTime).toBeLessThan(100); // Should be very fast with HNSW index
      expect(results.length).toBeGreaterThan(0);
      expect(results.length).toBeLessThanOrEqual(10);
    }, 30000); // Increase timeout for this large test

    test('should scale search performance with HNSW index', async () => {
      const searchCounts = [1, 5, 10, 50, 100];
      const queryVector = Array.from({ length: 384 }, () => Math.random());

      console.log('\n📈 Benchmark: Search scaling with different result counts');

      for (const count of searchCounts) {
        const startTime = performance.now();

        const results = await adapter.searchMemoriesByEmbedding({
          embedding: queryVector,
          roomId: 'search-room',
          match_threshold: 0.1,
          count,
        });

        const searchTime = performance.now() - startTime;

        console.log(`  k=${count}: ${searchTime.toFixed(2)}ms (${results.length} results)`);

        // Search time should scale sub-linearly with result count
        expect(searchTime).toBeLessThan(count * 2); // Max 2ms per result
        expect(results.length).toBeLessThanOrEqual(count);
      }
    });

    test('should compare HNSW vs exact search performance', async () => {
      const queryVector = Array.from({ length: 384 }, () => Math.random());
      const resultCount = 10;

      console.log('\n⚡ Benchmark: HNSW vs Exact search comparison');

      // HNSW search (approximate)
      const startTimeHNSW = performance.now();
      const hnswResults = await adapter.searchMemoriesByEmbedding({
        embedding: queryVector,
        roomId: 'search-room',
        match_threshold: 0.1,
        count: resultCount,
      });
      const hnswTime = performance.now() - startTimeHNSW;

      // Exact search (brute force) - simulate by disabling index temporarily
      await adapter.query('DROP INDEX IF EXISTS benchmark_hnsw_idx');

      const startTimeExact = performance.now();
      const exactResults = await adapter.searchMemoriesByEmbedding({
        embedding: queryVector,
        roomId: 'search-room',
        match_threshold: 0.1,
        count: resultCount,
      });
      const exactTime = performance.now() - startTimeExact;

      // Recreate index for future tests
      await adapter.query(`
        CREATE INDEX benchmark_hnsw_idx 
        ON memories USING hnsw (dim_384 vector_cosine_ops)
        WITH (m = 16, ef_construction = 64)
      `);

      console.log(`  HNSW (approximate): ${hnswTime.toFixed(2)}ms`);
      console.log(`  Exact (brute force): ${exactTime.toFixed(2)}ms`);
      console.log(`  Speedup: ${(exactTime / hnswTime).toFixed(2)}x`);

      // HNSW should be significantly faster
      expect(hnswTime).toBeLessThan(exactTime);
      expect(hnswResults.length).toBeGreaterThan(0);
      expect(exactResults.length).toBeGreaterThan(0);
    });
  });

  describe('Concurrent Operations Performance', () => {
    test('should handle concurrent vector searches efficiently', async () => {
      const concurrentSearches = 20;
      const queryVectors = Array.from({ length: concurrentSearches }, () =>
        Array.from({ length: 384 }, () => Math.random())
      );

      console.log(`\n🔄 Benchmark: ${concurrentSearches} concurrent searches`);

      const startTime = performance.now();

      const searchPromises = queryVectors.map((vector) =>
        adapter.searchMemoriesByEmbedding({
          embedding: vector,
          roomId: 'search-room',
          match_threshold: 0.1,
          count: 5,
        })
      );

      const results = await Promise.all(searchPromises);

      const totalTime = performance.now() - startTime;
      const avgTimePerSearch = totalTime / concurrentSearches;

      console.log(`✅ ${concurrentSearches} searches completed in ${totalTime.toFixed(2)}ms`);
      console.log(`📊 Average time per search: ${avgTimePerSearch.toFixed(2)}ms`);

      expect(totalTime).toBeLessThan(2000); // All searches should complete within 2 seconds
      expect(avgTimePerSearch).toBeLessThan(100); // Each search should average under 100ms
      expect(results.every((r) => r.length >= 0)).toBe(true);
    });

    test('should handle mixed read/write operations', async () => {
      const operations = 50;
      const mixedOps = [];

      console.log(`\n🔀 Benchmark: ${operations} mixed read/write operations`);

      for (let i = 0; i < operations; i++) {
        if (i % 3 === 0) {
          // Insert operation
          mixedOps.push(
            adapter.createMemory({
              id: `benchmark_mixed_${i}`,
              entityId: 'mixed-entity',
              roomId: 'mixed-room',
              content: { text: `benchmark_mixed_${i}` },
              dim_384: pgvector.toSql(Array.from({ length: 384 }, () => Math.random())),
              agentId: runtime.agentId,
            })
          );
        } else {
          // Search operation
          const queryVector = Array.from({ length: 384 }, () => Math.random());
          mixedOps.push(
            adapter.searchMemoriesByEmbedding({
              embedding: queryVector,
              roomId: 'search-room',
              match_threshold: 0.1,
              count: 3,
            })
          );
        }
      }

      const startTime = performance.now();
      const results = await Promise.allSettled(mixedOps);
      const totalTime = performance.now() - startTime;

      const successful = results.filter((r) => r.status === 'fulfilled').length;
      const failed = results.filter((r) => r.status === 'rejected').length;

      console.log(`✅ ${successful} operations succeeded, ${failed} failed`);
      console.log(`📊 Total time: ${totalTime.toFixed(2)}ms`);
      console.log(`⚡ Throughput: ${((operations / totalTime) * 1000).toFixed(2)} ops/second`);

      expect(successful).toBeGreaterThan(operations * 0.9); // At least 90% success rate
      expect(totalTime).toBeLessThan(10000); // Should complete within 10 seconds
    });
  });

  describe('Memory and Resource Usage', () => {
    test('should maintain stable memory usage during bulk operations', async () => {
      const initialMemory = process.memoryUsage();
      const iterations = 10;
      const vectorsPerIteration = 100;

      console.log('\n💾 Benchmark: Memory stability test');
      console.log(`Initial memory: ${(initialMemory.heapUsed / 1024 / 1024).toFixed(2)}MB`);

      for (let i = 0; i < iterations; i++) {
        const vectors = Array.from({ length: vectorsPerIteration }, (_, j) => ({
          id: `memory_test_${i}_${j}`,
          entityId: 'memory-entity',
          roomId: 'memory-room',
          content: { text: `memory_test_${i}_${j}` },
          dim_384: pgvector.toSql(Array.from({ length: 384 }, () => Math.random())),
          agentId: runtime.agentId,
        }));

        await adapter.db.transaction(async (tx) => {
          await tx.insert(adapter.schema.memories).values(vectors);
        });

        // Clean up to test memory deallocation
        await adapter.query("DELETE FROM memories WHERE entity_id = 'memory-entity'");

        // Force garbage collection if available
        if (global.gc) {
          global.gc();
        }
      }

      const finalMemory = process.memoryUsage();
      const memoryIncrease = finalMemory.heapUsed - initialMemory.heapUsed;

      console.log(`Final memory: ${(finalMemory.heapUsed / 1024 / 1024).toFixed(2)}MB`);
      console.log(`Memory increase: ${(memoryIncrease / 1024 / 1024).toFixed(2)}MB`);

      // Memory increase should be minimal (less than 100MB)
      expect(memoryIncrease).toBeLessThan(100 * 1024 * 1024);
    });
  });

  describe('Index Performance Analysis', () => {
    test('should analyze index usage and effectiveness', async () => {
      console.log('\n📊 Benchmark: Index performance analysis');

      // Get index statistics
      const indexStats = await adapter.query(`
        SELECT 
          indexname,
          idx_scan as scans,
          idx_tup_read as tuples_read,
          idx_tup_fetch as tuples_fetched
        FROM pg_stat_user_indexes 
        WHERE indexname LIKE '%hnsw%' 
        OR indexname LIKE '%vector%'
      `);

      console.log('Index usage statistics:');
      indexStats.forEach((stat) => {
        console.log(`  ${stat.indexname}: ${stat.scans} scans, ${stat.tuples_read} tuples read`);
      });

      // Get table size and index size
      const sizeStats = await adapter.query(`
        SELECT 
          schemaname,
          tablename,
          pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as table_size,
          pg_size_pretty(pg_indexes_size(schemaname||'.'||tablename)) as index_size
        FROM pg_tables 
        WHERE tablename = 'memories'
      `);

      console.log('Storage statistics:');
      sizeStats.forEach((stat) => {
        console.log(`  Table size: ${stat.table_size}, Index size: ${stat.index_size}`);
      });

      expect(indexStats.length).toBeGreaterThan(0);
      expect(sizeStats.length).toBe(1);
    });
  });
});

// Helper function to create a mock runtime for testing
function createMockRuntime(): IAgentRuntime {
  return {
    agentId: 'benchmark-agent',
    character: {
      name: 'BenchmarkAgent',
      bio: 'Agent for performance benchmarking',
    },
  } as IAgentRuntime;
}
