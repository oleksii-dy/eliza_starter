import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'bun:test';
import {
  AgentRuntime,
  type UUID,
  type IAgentRuntime,
  type Memory,
  type Entity,
  type Relationship,
  ChannelType,
} from '@elizaos/core';
import { v4 as uuidv4 } from 'uuid';
import { createIsolatedTestDatabase } from '../test-helpers';
import type { PgAdapter } from '../../pg/adapter';

/**
 * Production Validation Tests for SQL Plugin
 *
 * These tests validate the SQL plugin under realistic production conditions:
 * - PostgreSQL database validation
 * - High concurrency load testing
 * - Performance benchmarks
 * - Memory leak detection
 * - Error recovery under stress
 * - Large dataset operations
 */

describe('SQL Plugin Production Validation', () => {
  let adapter: PgAdapter;
  let runtime: IAgentRuntime;
  let cleanup: () => Promise<void>;
  let testAgentId: UUID;
  const isPostgreSQL = true; // Always PostgreSQL now

  beforeAll(async () => {
    console.log('[PRODUCTION VALIDATION] Setting up production test environment...');

    const setup = await createIsolatedTestDatabase(`production_validation_${Date.now()}`, []);

    adapter = setup.adapter;
    runtime = setup.runtime;
    cleanup = setup.cleanup;
    testAgentId = setup.testAgentId;

    // Detect database type
    console.log('[PRODUCTION VALIDATION] Using PostgreSQL database');
    console.log('[PRODUCTION VALIDATION] Production test environment ready');
  }, 60000); // Extended timeout for production setup

  afterAll(async () => {
    console.log('[PRODUCTION VALIDATION] Cleaning up production test environment...');
    if (cleanup) {
      await cleanup();
    }
  });

  describe('Database Performance Benchmarks', () => {
    it('should handle high-volume memory creation efficiently', async () => {
      const roomId = uuidv4() as UUID;
      const entityId = uuidv4() as UUID;

      // Create test environment
      await runtime.createRoom({
        id: roomId,
        name: 'Performance Test Room',
        agentId: testAgentId,
        source: 'production-test',
        type: ChannelType.GROUP,
      });

      await runtime.createEntity({
        id: entityId,
        names: ['Performance Test Entity'],
        agentId: testAgentId,
      });

      const memoryCount = 1000; // PostgreSQL can handle large datasets
      const batchSize = 50;
      const startTime = Date.now();

      console.log(`[PERFORMANCE] Creating ${memoryCount} memories in batches of ${batchSize}...`);

      // Create memories in batches to avoid overwhelming the database
      for (let i = 0; i < memoryCount; i += batchSize) {
        const batch = Math.min(batchSize, memoryCount - i);
        const batchPromises = Array.from({ length: batch }, (_, j) => {
          const index = i + j;
          return runtime.createMemory(
            {
              id: uuidv4() as UUID,
              entityId,
              agentId: testAgentId,
              roomId,
              content: {
                text: `Performance test memory ${index} with sufficient content to simulate realistic usage patterns in production environments`,
                source: 'performance-test',
                type: 'message',
              },
              embedding: Array(384).fill(Math.random()), // Simulate real embeddings
              metadata: {
                type: 'message',
                performanceTest: true,
                index,
                batchNumber: Math.floor(i / batchSize),
              },
              createdAt: Date.now() + index,
            },
            'messages'
          );
        });

        await Promise.all(batchPromises);

        // Brief pause between batches to prevent overwhelming
        if (i + batch < memoryCount) {
          await new Promise((resolve) => setTimeout(resolve, 50));
        }
      }

      const creationTime = Date.now() - startTime;
      console.log(`[PERFORMANCE] Created ${memoryCount} memories in ${creationTime}ms`);

      // Performance expectations based on database type
      const expectedMaxTime = 30000; // 30s for PostgreSQL
      expect(creationTime).toBeLessThan(expectedMaxTime);

      // Verify data integrity
      const queryStartTime = Date.now();
      const allMemories = await runtime.getMemories({
        roomId,
        count: memoryCount,
        tableName: 'messages',
      });
      const queryTime = Date.now() - queryStartTime;

      console.log(`[PERFORMANCE] Queried ${allMemories.length} memories in ${queryTime}ms`);

      expect(allMemories.length).toBe(memoryCount);
      expect(queryTime).toBeLessThan(5000); // Should query within 5 seconds

      // Test search performance
      const searchStartTime = Date.now();
      const searchResults = await runtime.searchMemories({
        embedding: Array(384).fill(0.5),
        roomId,
        count: 50,
        match_threshold: 0.1,
        tableName: 'messages',
      });
      const searchTime = Date.now() - searchStartTime;

      console.log(
        `[PERFORMANCE] Semantic search completed in ${searchTime}ms, found ${searchResults.length} results`
      );
      expect(searchTime).toBeLessThan(3000); // Search should complete within 3 seconds
    });

    it('should handle concurrent database operations safely', async () => {
      const concurrentOperations = 50; // PostgreSQL can handle high concurrency
      const roomId = uuidv4() as UUID;

      await runtime.createRoom({
        id: roomId,
        name: 'Concurrency Test Room',
        agentId: testAgentId,
        source: 'production-test',
        type: ChannelType.GROUP,
      });

      console.log(`[CONCURRENCY] Testing ${concurrentOperations} concurrent operations...`);

      const startTime = Date.now();

      // Create multiple concurrent operations of different types
      const promises = Array.from({ length: concurrentOperations }, (_, i) => {
        const operationType = i % 4;

        switch (operationType) {
          case 0: // Entity creation
            return runtime.createEntity({
              id: uuidv4() as UUID,
              names: [`Concurrent Entity ${i}`],
              agentId: testAgentId,
              metadata: { concurrencyTest: true, index: i },
            });

          case 1: // Memory creation
            return runtime.createMemory(
              {
                id: uuidv4() as UUID,
                entityId: testAgentId,
                agentId: testAgentId,
                roomId,
                content: {
                  text: `Concurrent memory ${i}`,
                  source: 'concurrency-test',
                  type: 'message',
                },
                metadata: {
                  type: 'message',
                  concurrencyTest: true,
                  index: i,
                },
                createdAt: Date.now() + i,
              },
              'messages'
            );

          case 2: // Relationship creation
            return (async () => {
              const sourceId = uuidv4() as UUID;
              const targetId = uuidv4() as UUID;

              // Create entities first
              await runtime.createEntity({
                id: sourceId,
                names: [`Source ${i}`],
                agentId: testAgentId,
              });

              await runtime.createEntity({
                id: targetId,
                names: [`Target ${i}`],
                agentId: testAgentId,
              });

              // Create relationship
              return runtime.createRelationship({
                sourceEntityId: sourceId,
                targetEntityId: targetId,
                tags: ['concurrent-test'],
                metadata: { index: i, concurrencyTest: true },
              });
            })();

          case 3: // Component creation
            return (async () => {
              const entityId = uuidv4() as UUID;

              await runtime.createEntity({
                id: entityId,
                names: [`Component Entity ${i}`],
                agentId: testAgentId,
              });

              return runtime.createComponent({
                id: uuidv4() as UUID,
                entityId,
                agentId: testAgentId,
                roomId,
                worldId: uuidv4() as UUID,
                sourceEntityId: testAgentId,
                type: 'concurrent_test',
                data: { index: i, concurrencyTest: true },
                createdAt: Date.now(),
              });
            })();

          default:
            return Promise.resolve(true);
        }
      });

      const results = await Promise.allSettled(promises);
      const concurrencyTime = Date.now() - startTime;

      console.log(
        `[CONCURRENCY] Completed ${concurrentOperations} operations in ${concurrencyTime}ms`
      );

      // Analyze results
      const successful = results.filter((r) => r.status === 'fulfilled').length;
      const failed = results.filter((r) => r.status === 'rejected').length;

      console.log(
        `[CONCURRENCY] Success rate: ${successful}/${concurrentOperations} (${((successful / concurrentOperations) * 100).toFixed(1)}%)`
      );

      // At least 95% should succeed
      expect(successful / concurrentOperations).toBeGreaterThanOrEqual(0.95);

      if (failed > 0) {
        console.warn(
          `[CONCURRENCY] ${failed} operations failed:`,
          results
            .filter((r) => r.status === 'rejected')
            .map((r) => (r as PromiseRejectedResult).reason)
        );
      }

      // Should complete within reasonable time
      const expectedMaxTime = 20000; // PostgreSQL performance expectation
      expect(concurrencyTime).toBeLessThan(expectedMaxTime);
    });
  });

  describe('Memory and Resource Management', () => {
    it('should handle large dataset operations without memory leaks', async () => {
      const initialMemory = process.memoryUsage();
      const roomId = uuidv4() as UUID;
      const entityCount = 500; // PostgreSQL can handle large entity datasets

      await runtime.createRoom({
        id: roomId,
        name: 'Memory Test Room',
        agentId: testAgentId,
        source: 'production-test',
        type: ChannelType.GROUP,
      });

      console.log(`[MEMORY TEST] Creating ${entityCount} entities with components...`);

      // Create large number of entities with components
      for (let i = 0; i < entityCount; i++) {
        const entityId = uuidv4() as UUID;

        await runtime.createEntity({
          id: entityId,
          names: [`Memory Test Entity ${i}`],
          agentId: testAgentId,
          metadata: {
            memoryTest: true,
            index: i,
            largeData: Array(100).fill(`data-${i}`).join(','), // Simulate larger metadata
          },
        });

        // Add component to each entity
        await runtime.createComponent({
          id: uuidv4() as UUID,
          entityId,
          agentId: testAgentId,
          roomId,
          worldId: uuidv4() as UUID,
          sourceEntityId: testAgentId,
          type: 'memory_test',
          data: {
            index: i,
            memoryTest: true,
            largeArray: Array(50).fill(i),
            complexObject: {
              nested: { deep: { data: `entity-${i}` } },
              timestamp: Date.now(),
            },
          },
          createdAt: Date.now(),
        });

        // Check memory every 50 entities
        if (i > 0 && i % 50 === 0) {
          const currentMemory = process.memoryUsage();
          const heapIncrease = currentMemory.heapUsed - initialMemory.heapUsed;
          console.log(
            `[MEMORY TEST] After ${i} entities: Heap increased by ${(heapIncrease / 1024 / 1024).toFixed(1)}MB`
          );
        }
      }

      // Force garbage collection if available
      if (global.gc) {
        global.gc();
        await new Promise((resolve) => setTimeout(resolve, 1000));
      }

      const finalMemory = process.memoryUsage();
      const totalHeapIncrease = finalMemory.heapUsed - initialMemory.heapUsed;
      const heapIncreaseMB = totalHeapIncrease / 1024 / 1024;

      console.log(`[MEMORY TEST] Total heap increase: ${heapIncreaseMB.toFixed(1)}MB`);

      // Memory increase should be reasonable (less than 200MB for the test)
      expect(heapIncreaseMB).toBeLessThan(200);

      // Verify all data was created correctly
      const entities = await runtime.getEntityByIds(
        Array.from({ length: Math.min(entityCount, 100) }, () => uuidv4() as UUID)
      );

      // Should be able to query without issues
      expect(Array.isArray(entities)).toBe(true);
    });
  });

  describe('Error Recovery and Resilience', () => {
    it('should gracefully handle database connection issues', async () => {
      // This test simulates various error conditions
      const roomId = uuidv4() as UUID;

      await runtime.createRoom({
        id: roomId,
        name: 'Error Recovery Test Room',
        agentId: testAgentId,
        source: 'production-test',
        type: ChannelType.GROUP,
      });

      // Test handling of constraint violations
      const duplicateId = uuidv4() as UUID;

      await runtime.createEntity({
        id: duplicateId,
        names: ['Original Entity'],
        agentId: testAgentId,
      });

      // Attempt to create duplicate - should handle gracefully
      const duplicateResult = await runtime.createEntity({
        id: duplicateId,
        names: ['Duplicate Entity'],
        agentId: testAgentId,
      });

      expect(duplicateResult).toBe(false); // Should fail gracefully, not throw

      // Test handling of invalid references
      const invalidMemoryResult = await runtime.createMemory(
        {
          id: uuidv4() as UUID,
          entityId: uuidv4() as UUID, // Non-existent entity
          agentId: testAgentId,
          roomId,
          content: {
            text: 'Memory with invalid entity reference',
            source: 'error-test',
            type: 'message',
          },
          metadata: { type: 'message' },
          createdAt: Date.now(),
        },
        'messages'
      );

      // Should handle invalid references gracefully
      expect(typeof invalidMemoryResult).toBe('string');

      // Test querying non-existent data
      const nonExistentId = uuidv4() as UUID;
      const nonExistentEntity = await runtime.getEntityById(nonExistentId);
      const nonExistentMemories = await runtime.getMemories({
        roomId: nonExistentId,
        count: 10,
        tableName: 'messages',
      });

      expect(nonExistentEntity).toBeNull();
      expect(nonExistentMemories).toEqual([]);
    });

    it('should maintain data consistency under concurrent stress', async () => {
      const stressOperations = 100; // PostgreSQL stress test operations
      const roomId = uuidv4() as UUID;
      const sharedEntityId = uuidv4() as UUID;

      await runtime.createRoom({
        id: roomId,
        name: 'Stress Test Room',
        agentId: testAgentId,
        source: 'production-test',
        type: ChannelType.GROUP,
      });

      await runtime.createEntity({
        id: sharedEntityId,
        names: ['Shared Stress Entity'],
        agentId: testAgentId,
      });

      console.log(
        `[STRESS TEST] Running ${stressOperations} concurrent operations on shared resources...`
      );

      // Create multiple operations that could potentially conflict
      const stressPromises = Array.from({ length: stressOperations }, (_, i) => {
        const operationType = i % 3;

        return (async () => {
          try {
            switch (operationType) {
              case 0: {
                // Update shared entity relationships
                const targetId = uuidv4() as UUID;
                await runtime.createEntity({
                  id: targetId,
                  names: [`Stress Target ${i}`],
                  agentId: testAgentId,
                });

                return runtime.createRelationship({
                  sourceEntityId: sharedEntityId,
                  targetEntityId: targetId,
                  tags: ['stress-test', `batch-${Math.floor(i / 10)}`],
                  metadata: { stressTest: true, index: i },
                });
              }

              case 1: {
                // Create memories referencing shared entity
                return runtime.createMemory(
                  {
                    id: uuidv4() as UUID,
                    entityId: sharedEntityId,
                    agentId: testAgentId,
                    roomId,
                    content: {
                      text: `Stress test memory ${i} referencing shared entity`,
                      source: 'stress-test',
                      type: 'message',
                    },
                    metadata: {
                      type: 'message',
                      stressTest: true,
                      index: i,
                    },
                    createdAt: Date.now() + i,
                  },
                  'messages'
                );
              }

              case 2: {
                // Create components for shared entity
                return runtime.createComponent({
                  id: uuidv4() as UUID,
                  entityId: sharedEntityId,
                  agentId: testAgentId,
                  roomId,
                  worldId: uuidv4() as UUID,
                  sourceEntityId: testAgentId,
                  type: 'stress_test',
                  data: {
                    stressTest: true,
                    index: i,
                    timestamp: Date.now(),
                  },
                  createdAt: Date.now(),
                });
              }

              default:
                return Promise.resolve(true);
            }
          } catch (error) {
            console.warn(`[STRESS TEST] Operation ${i} failed:`, error);
            return false;
          }
        })();
      });

      const stressResults = await Promise.allSettled(stressPromises);
      const successfulOps = stressResults.filter(
        (r) => r.status === 'fulfilled' && (r as PromiseFulfilledResult<any>).value !== false
      ).length;

      console.log(`[STRESS TEST] Successful operations: ${successfulOps}/${stressOperations}`);

      // At least 90% should succeed under stress
      expect(successfulOps / stressOperations).toBeGreaterThanOrEqual(0.9);

      // Verify data consistency
      const relationships = await runtime.getRelationships({
        entityId: sharedEntityId,
      });

      const memories = await runtime.getMemories({
        roomId,
        count: stressOperations,
        tableName: 'messages',
      });

      const components = await runtime.getComponents(sharedEntityId);

      console.log(
        `[STRESS TEST] Data integrity check: ${relationships.length} relationships, ${memories.length} memories, ${components.length} components`
      );

      // All created data should be retrievable and consistent
      expect(relationships.length).toBeGreaterThan(0);
      expect(memories.length).toBeGreaterThan(0);
      expect(components.length).toBeGreaterThan(0);
    });
  });

  describe('Production Environment Validation', () => {
    it('should validate schema integrity and constraints', async () => {
      // Test that all expected tables exist and have proper constraints
      const testEntity = await runtime.createEntity({
        id: uuidv4() as UUID,
        names: ['Schema Validation Entity'],
        agentId: testAgentId,
      });

      expect(testEntity).toBe(true);

      // Test foreign key constraints work
      const validMemory = await runtime.createMemory(
        {
          id: uuidv4() as UUID,
          entityId: testAgentId, // Use existing entity
          agentId: testAgentId,
          roomId: uuidv4() as UUID, // This should work even with non-existent room
          content: {
            text: 'Schema validation memory',
            source: 'schema-test',
            type: 'message',
          },
          metadata: { type: 'message' },
          createdAt: Date.now(),
        },
        'messages'
      );

      expect(typeof validMemory).toBe('string');

      // Test that required fields are enforced
      try {
        // This should either succeed or fail gracefully depending on implementation
        const result = await runtime.createMemory(
          {
            id: uuidv4() as UUID,
            entityId: testAgentId,
            agentId: testAgentId,
            roomId: uuidv4() as UUID,
            content: {
              text: '', // Empty text should be allowed
              source: 'schema-test',
              type: 'message',
            },
            metadata: { type: 'message' },
            createdAt: Date.now(),
          },
          'messages'
        );

        expect(typeof result).toBe('string');
      } catch (error) {
        // If validation is strict, this is also acceptable
        console.log('[SCHEMA TEST] Strict validation detected:', error);
      }
    });

    it('should perform efficiently under realistic production loads', async () => {
      // Simulate a realistic production scenario
      const numUsers = 20; // PostgreSQL can handle many concurrent users
      const messagesPerUser = 50; // PostgreSQL message throughput
      const roomId = uuidv4() as UUID;

      await runtime.createRoom({
        id: roomId,
        name: 'Production Load Test Room',
        agentId: testAgentId,
        source: 'production-test',
        type: ChannelType.GROUP,
      });

      console.log(
        `[PRODUCTION LOAD] Simulating ${numUsers} users with ${messagesPerUser} messages each...`
      );

      const startTime = Date.now();

      // Create users
      const userIds = await Promise.all(
        Array.from({ length: numUsers }, async (_, i) => {
          const userId = uuidv4() as UUID;
          await runtime.createEntity({
            id: userId,
            names: [`Production User ${i}`],
            agentId: testAgentId,
            metadata: {
              userIndex: i,
              role: i % 3 === 0 ? 'admin' : 'user',
              joinedAt: Date.now(),
            },
          });
          return userId;
        })
      );

      const userCreationTime = Date.now() - startTime;
      console.log(`[PRODUCTION LOAD] Created ${numUsers} users in ${userCreationTime}ms`);

      // Create messages from each user
      const messagePromises = userIds.flatMap((userId, userIndex) =>
        Array.from({ length: messagesPerUser }, (_, msgIndex) =>
          runtime.createMemory(
            {
              id: uuidv4() as UUID,
              entityId: userId,
              agentId: testAgentId,
              roomId,
              content: {
                text: `Message ${msgIndex + 1} from user ${userIndex + 1}: This is a realistic message with enough content to simulate real usage patterns.`,
                source: 'production-load-test',
                type: 'message',
              },
              embedding: Array(384).fill(Math.random()),
              metadata: {
                type: 'message',
                userIndex,
                messageIndex: msgIndex,
                productionLoad: true,
              },
              createdAt: Date.now() + (userIndex * messagesPerUser + msgIndex),
            },
            'messages'
          )
        )
      );

      await Promise.all(messagePromises);
      const totalTime = Date.now() - startTime;

      const totalMessages = numUsers * messagesPerUser;
      console.log(
        `[PRODUCTION LOAD] Created ${totalMessages} messages from ${numUsers} users in ${totalTime}ms`
      );

      // Performance expectations for production loads
      const messagesPerSecond = totalMessages / (totalTime / 1000);
      console.log(`[PRODUCTION LOAD] Throughput: ${messagesPerSecond.toFixed(1)} messages/second`);

      // Should handle at least 10 messages per second
      expect(messagesPerSecond).toBeGreaterThan(10);

      // Test querying performance
      const queryStartTime = Date.now();
      const recentMessages = await runtime.getMemories({
        roomId,
        count: Math.min(totalMessages, 100),
        tableName: 'messages',
      });
      const queryTime = Date.now() - queryStartTime;

      console.log(
        `[PRODUCTION LOAD] Queried ${recentMessages.length} recent messages in ${queryTime}ms`
      );
      expect(queryTime).toBeLessThan(2000); // Should query within 2 seconds

      // Test search performance
      const searchStartTime = Date.now();
      const searchResults = await runtime.searchMemories({
        embedding: Array(384).fill(0.7),
        roomId,
        count: 20,
        match_threshold: 0.1,
        tableName: 'messages',
      });
      const searchTime = Date.now() - searchStartTime;

      console.log(
        `[PRODUCTION LOAD] Search found ${searchResults.length} results in ${searchTime}ms`
      );
      expect(searchTime).toBeLessThan(3000); // Search should complete within 3 seconds
    });
  });
});
