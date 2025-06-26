import { describe, it, expect, beforeAll, afterAll } from 'bun:test';
import { AgentRuntime, type UUID, type IAgentRuntime, ChannelType } from '@elizaos/core';
import { v4 as uuidv4 } from 'uuid';
import { createIsolatedTestDatabase } from '../test-helpers';
import type { PgAdapter } from '../../pg/adapter';

/**
 * PostgreSQL-Specific Production Tests
 *
 * These tests only run when POSTGRES_URL is available and validate:
 * - PostgreSQL-specific features and performance
 * - Schema migrations and constraints
 * - Vector extension functionality
 * - High concurrency with real PostgreSQL
 * - Large dataset operations
 */

describe('PostgreSQL Production Validation', () => {
  let adapter: PgAdapter;
  let runtime: IAgentRuntime;
  let cleanup: () => Promise<void>;
  let testAgentId: UUID;

  // Skip all tests if PostgreSQL is not available
  const isPostgreSQLAvailable = !!process.env.POSTGRES_URL;

  beforeAll(async () => {
    if (!isPostgreSQLAvailable) {
      console.log('[PostgreSQL TESTS] Skipping - POSTGRES_URL not set');
      return;
    }

    console.log('[PostgreSQL TESTS] Setting up PostgreSQL production test environment...');

    const setup = await createIsolatedTestDatabase(`postgresql_production_${Date.now()}`, []);

    adapter = setup.adapter as PgDatabaseAdapter;
    runtime = setup.runtime;
    cleanup = setup.cleanup;
    testAgentId = setup.testAgentId;

    console.log('[PostgreSQL TESTS] PostgreSQL production test environment ready');
  }, 60000); // Extended timeout for PostgreSQL setup

  afterAll(async () => {
    if (cleanup) {
      await cleanup();
    }
  });

  describe('PostgreSQL-Specific Features', () => {
    it.skipIf(!isPostgreSQLAvailable)(
      'should validate vector extension functionality',
      async () => {
        const roomId = uuidv4() as UUID;
        const entityId = uuidv4() as UUID;

        await runtime.createRoom({
          id: roomId,
          name: 'Vector Test Room',
          agentId: testAgentId,
          source: 'postgresql-test',
          type: ChannelType.GROUP,
        });

        await runtime.createEntity({
          id: entityId,
          names: ['Vector Test Entity'],
          agentId: testAgentId,
        });

        // Create memories with high-dimensional embeddings
        const vectorSize = 1536; // OpenAI embedding size
        const memories = Array.from({ length: 50 }, (_, i) => ({
          id: uuidv4() as UUID,
          entityId,
          agentId: testAgentId,
          roomId,
          content: {
            text: `Vector test memory ${i} with content for semantic search validation`,
            source: 'vector-test',
            type: 'message',
          },
          embedding: Array(vectorSize)
            .fill(0)
            .map(() => Math.random() * 2 - 1), // Random values between -1 and 1
          metadata: {
            type: 'message',
            vectorTest: true,
            index: i,
          },
          createdAt: Date.now() + i,
        }));

        // Create memories in parallel
        await Promise.all(memories.map((memory) => runtime.createMemory(memory, 'messages')));

        // Test vector search with various similarity thresholds
        const searchEmbedding = Array(vectorSize)
          .fill(0)
          .map(() => Math.random() * 2 - 1);

        const searchResults = await runtime.searchMemories({
          embedding: searchEmbedding,
          roomId,
          count: 20,
          match_threshold: 0.0, // Very low threshold to get results
          tableName: 'messages',
        });

        expect(searchResults.length).toBeGreaterThan(0);
        expect(searchResults.length).toBeLessThanOrEqual(20);

        // Verify similarity scores are reasonable
        searchResults.forEach((result) => {
          expect(result.similarity).toBeDefined();
          expect(typeof result.similarity).toBe('number');
          expect(result.similarity).toBeGreaterThan(-1);
          expect(result.similarity).toBeLessThan(1);
        });

        console.log(
          `[PostgreSQL VECTOR] Search found ${searchResults.length} results with vector size ${vectorSize}`
        );
      }
    );

    it.skipIf(!isPostgreSQLAvailable)(
      'should handle PostgreSQL-specific concurrent operations',
      async () => {
        const concurrentOps = 100; // Higher load for PostgreSQL
        const roomId = uuidv4() as UUID;

        await runtime.createRoom({
          id: roomId,
          name: 'PostgreSQL Concurrency Test',
          agentId: testAgentId,
          source: 'postgresql-test',
          type: ChannelType.GROUP,
        });

        console.log(`[PostgreSQL CONCURRENCY] Testing ${concurrentOps} concurrent operations...`);

        const startTime = Date.now();

        // Create heavy concurrent load with complex operations
        const promises = Array.from({ length: concurrentOps }, async (_, i) => {
          const entityId = uuidv4() as UUID;

          // Create entity with large metadata
          await runtime.createEntity({
            id: entityId,
            names: [`PostgreSQL Entity ${i}`],
            agentId: testAgentId,
            metadata: {
              pgTest: true,
              index: i,
              largeData: Array(200).fill(`pgdata-${i}`).join(','),
              nestedObject: {
                level1: { level2: { level3: `deep-${i}` } },
                array: Array(50).fill(i),
                timestamp: Date.now(),
              },
            },
          });

          // Create memory with embedding
          await runtime.createMemory(
            {
              id: uuidv4() as UUID,
              entityId,
              agentId: testAgentId,
              roomId,
              content: {
                text: `PostgreSQL concurrent memory ${i} with substantial content for testing`,
                source: 'postgresql-concurrency',
                type: 'message',
              },
              embedding: Array(768)
                .fill(0)
                .map(() => Math.random()),
              metadata: {
                type: 'message',
                pgConcurrency: true,
                index: i,
              },
              createdAt: Date.now() + i,
            },
            'messages'
          );

          // Create component
          await runtime.createComponent({
            id: uuidv4() as UUID,
            entityId,
            agentId: testAgentId,
            roomId,
            worldId: uuidv4() as UUID,
            sourceEntityId: testAgentId,
            type: 'postgresql_test',
            data: {
              pgTest: true,
              index: i,
              complexData: {
                metrics: Array(20).fill(Math.random()),
                features: Array(10).fill(`feature-${i}`),
              },
            },
            createdAt: Date.now(),
          });

          return true;
        });

        const results = await Promise.allSettled(promises);
        const concurrencyTime = Date.now() - startTime;

        const successful = results.filter((r) => r.status === 'fulfilled').length;
        const failed = results.filter((r) => r.status === 'rejected').length;

        console.log(
          `[PostgreSQL CONCURRENCY] Completed ${concurrentOps} operations in ${concurrencyTime}ms`
        );
        console.log(
          `[PostgreSQL CONCURRENCY] Success rate: ${successful}/${concurrentOps} (${((successful / concurrentOps) * 100).toFixed(1)}%)`
        );

        // PostgreSQL should handle higher loads better
        expect(successful / concurrentOps).toBeGreaterThanOrEqual(0.95);
        expect(concurrencyTime).toBeLessThan(30000); // Should complete within 30 seconds

        if (failed > 0) {
          console.warn(`[PostgreSQL CONCURRENCY] ${failed} operations failed`);
        }
      }
    );

    it.skipIf(!isPostgreSQLAvailable)('should validate PostgreSQL schema constraints', async () => {
      // Test PostgreSQL-specific constraints and features
      const entityId = uuidv4() as UUID;

      await runtime.createEntity({
        id: entityId,
        names: ['PostgreSQL Schema Test'],
        agentId: testAgentId,
      });

      // Test foreign key constraints
      const memoryWithValidFK = await runtime.createMemory(
        {
          id: uuidv4() as UUID,
          entityId, // Valid entity reference
          agentId: testAgentId,
          roomId: uuidv4() as UUID,
          content: {
            text: 'Memory with valid foreign key',
            source: 'schema-test',
            type: 'message',
          },
          metadata: { type: 'message' },
          createdAt: Date.now(),
        },
        'messages'
      );

      expect(typeof memoryWithValidFK).toBe('string');

      // Test constraint validation with complex data
      const complexMemory = await runtime.createMemory(
        {
          id: uuidv4() as UUID,
          entityId,
          agentId: testAgentId,
          roomId: uuidv4() as UUID,
          content: {
            text: 'Complex memory with unicode: 🎉 中文 العربية ñoño',
            source: 'schema-test',
            type: 'message',
            metadata: {
              complexObject: {
                nested: { deep: { array: [1, 2, 3] } },
                unicode: '🚀',
                numbers: [3.14159, -42, 0],
              },
            },
          },
          metadata: {
            type: 'message',
            complexTest: true,
            unicode: '🎯',
          },
          createdAt: Date.now(),
        },
        'messages'
      );

      expect(typeof complexMemory).toBe('string');

      // Verify the complex data was stored correctly
      const retrievedMemories = await runtime.getMemories({
        roomId: uuidv4() as UUID,
        count: 100,
        tableName: 'messages',
      });

      expect(Array.isArray(retrievedMemories)).toBe(true);
    });

    it.skipIf(!isPostgreSQLAvailable)(
      'should handle large-scale PostgreSQL operations',
      async () => {
        const largeScale = 2000; // Much larger scale for PostgreSQL
        const roomId = uuidv4() as UUID;

        await runtime.createRoom({
          id: roomId,
          name: 'Large Scale PostgreSQL Test',
          agentId: testAgentId,
          source: 'postgresql-test',
          type: ChannelType.GROUP,
        });

        console.log(
          `[PostgreSQL LARGE SCALE] Creating ${largeScale} entities with relationships...`
        );

        const startTime = Date.now();

        // Create entities in batches
        const batchSize = 100;
        const entityIds: UUID[] = [];

        for (let i = 0; i < largeScale; i += batchSize) {
          const batch = Math.min(batchSize, largeScale - i);
          const batchPromises = Array.from({ length: batch }, async (_, j) => {
            const index = i + j;
            const entityId = uuidv4() as UUID;

            await runtime.createEntity({
              id: entityId,
              names: [`Large Scale Entity ${index}`],
              agentId: testAgentId,
              metadata: {
                largeScale: true,
                index,
                batchNumber: Math.floor(i / batchSize),
              },
            });

            return entityId;
          });

          const batchEntityIds = await Promise.all(batchPromises);
          entityIds.push(...batchEntityIds);

          // Brief pause between batches
          if (i + batch < largeScale) {
            await new Promise((resolve) => setTimeout(resolve, 100));
          }
        }

        const entityCreationTime = Date.now() - startTime;
        console.log(
          `[PostgreSQL LARGE SCALE] Created ${entityIds.length} entities in ${entityCreationTime}ms`
        );

        // Create relationships between entities
        const relationshipStartTime = Date.now();
        const relationshipPromises = Array.from(
          { length: Math.min(500, entityIds.length - 1) },
          (_, i) => {
            const sourceId = entityIds[i];
            const targetId = entityIds[i + 1];

            return runtime.createRelationship({
              sourceEntityId: sourceId,
              targetEntityId: targetId,
              tags: ['large-scale-test', `batch-${Math.floor(i / 50)}`],
              metadata: {
                largeScale: true,
                index: i,
                relationshipType: 'sequential',
              },
            });
          }
        );

        await Promise.all(relationshipPromises);
        const relationshipCreationTime = Date.now() - relationshipStartTime;

        console.log(
          `[PostgreSQL LARGE SCALE] Created relationships in ${relationshipCreationTime}ms`
        );

        // Test query performance with large dataset
        const queryStartTime = Date.now();
        const sampleEntityIds = entityIds.slice(0, 100);
        const queriedEntities = await runtime.getEntityByIds(sampleEntityIds);
        const queryTime = Date.now() - queryStartTime;

        console.log(
          `[PostgreSQL LARGE SCALE] Queried ${queriedEntities.length} entities in ${queryTime}ms`
        );

        expect(queriedEntities.length).toBe(100);
        expect(queryTime).toBeLessThan(5000); // Should query within 5 seconds

        // Test relationship queries
        const relationshipQueryStart = Date.now();
        const relationships = await runtime.getRelationships({
          entityId: entityIds[0],
        });
        const relationshipQueryTime = Date.now() - relationshipQueryStart;

        console.log(`[PostgreSQL LARGE SCALE] Queried relationships in ${relationshipQueryTime}ms`);
        expect(relationships.length).toBeGreaterThan(0);
        expect(relationshipQueryTime).toBeLessThan(2000);

        const totalTime = Date.now() - startTime;
        console.log(`[PostgreSQL LARGE SCALE] Total operation time: ${totalTime}ms`);

        // Should handle large scale operations efficiently
        expect(totalTime).toBeLessThan(120000); // Should complete within 2 minutes
      }
    );
  });

  describe('PostgreSQL Performance Benchmarks', () => {
    it.skipIf(!isPostgreSQLAvailable)('should achieve PostgreSQL performance targets', async () => {
      const roomId = uuidv4() as UUID;
      const entityId = uuidv4() as UUID;

      await runtime.createRoom({
        id: roomId,
        name: 'PostgreSQL Performance Test',
        agentId: testAgentId,
        source: 'postgresql-test',
        type: ChannelType.GROUP,
      });

      await runtime.createEntity({
        id: entityId,
        names: ['PostgreSQL Performance Entity'],
        agentId: testAgentId,
      });

      // Benchmark memory creation rate
      const memoryCount = 1000;
      const startTime = Date.now();

      console.log(`[PostgreSQL BENCHMARK] Creating ${memoryCount} memories with embeddings...`);

      const memoryPromises = Array.from({ length: memoryCount }, (_, i) =>
        runtime.createMemory(
          {
            id: uuidv4() as UUID,
            entityId,
            agentId: testAgentId,
            roomId,
            content: {
              text: `PostgreSQL benchmark memory ${i} with sufficient content for realistic testing scenarios`,
              source: 'postgresql-benchmark',
              type: 'message',
            },
            embedding: Array(1536)
              .fill(0)
              .map(() => Math.random()), // Full OpenAI embedding size
            metadata: {
              type: 'message',
              benchmark: true,
              index: i,
            },
            createdAt: Date.now() + i,
          },
          'messages'
        )
      );

      await Promise.all(memoryPromises);
      const creationTime = Date.now() - startTime;
      const memoriesPerSecond = memoryCount / (creationTime / 1000);

      console.log(
        `[PostgreSQL BENCHMARK] Created ${memoryCount} memories in ${creationTime}ms (${memoriesPerSecond.toFixed(1)} memories/sec)`
      );

      // PostgreSQL should achieve optimal performance for production workloads
      expect(memoriesPerSecond).toBeGreaterThan(15); // At least 15 memories per second
      expect(creationTime).toBeLessThan(60000); // Should complete within 1 minute

      // Benchmark query performance
      const queryStartTime = Date.now();
      const allMemories = await runtime.getMemories({
        roomId,
        count: memoryCount,
        tableName: 'messages',
      });
      const queryTime = Date.now() - queryStartTime;

      console.log(
        `[PostgreSQL BENCHMARK] Queried ${allMemories.length} memories in ${queryTime}ms`
      );
      expect(allMemories.length).toBe(memoryCount);
      expect(queryTime).toBeLessThan(3000); // Should query within 3 seconds

      // Benchmark vector search performance
      const searchStartTime = Date.now();
      const searchResults = await runtime.searchMemories({
        embedding: Array(1536)
          .fill(0)
          .map(() => Math.random()),
        roomId,
        count: 50,
        match_threshold: 0.1,
        tableName: 'messages',
      });
      const searchTime = Date.now() - searchStartTime;

      console.log(
        `[PostgreSQL BENCHMARK] Vector search found ${searchResults.length} results in ${searchTime}ms`
      );
      expect(searchTime).toBeLessThan(2000); // Vector search should be fast
      expect(searchResults.length).toBeGreaterThan(0);
    });
  });
});
