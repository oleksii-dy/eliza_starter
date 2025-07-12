import { TestSuite, createMessageMemory, type UUID, asUUID } from '@elizaos/core';
import type { IAgentRuntime } from '@elizaos/core';
import { v4 as uuidv4 } from 'uuid';

/**
 * Real runtime integration tests for the SQL Plugin
 * This tests the plugin in the context of a full ElizaOS runtime
 */
export const SqlPluginRuntimeIntegrationTestSuite: TestSuite = {
  name: 'SQL Plugin Runtime Integration Tests',
  tests: [
    {
      name: 'should initialize plugin with all database adapters',
      fn: async (runtime: IAgentRuntime) => {
        console.log('🧪 Testing SQL plugin initialization...');

        // Verify database adapter is available
        if (!runtime.db) {
          throw new Error('Database adapter not available in runtime');
        }
        console.log('✓ Database adapter is available');

        // Test basic database readiness
        const isReady = await runtime.isReady();
        if (!isReady) {
          throw new Error('Database adapter not ready');
        }
        console.log('✓ Database adapter is ready');

        // Verify core schema tables exist by testing basic operations
        try {
          // Test entities table
          const testEntityId = asUUID(uuidv4());
          await runtime.createEntity({
            id: testEntityId,
            names: ['Test Entity'],
            agentId: runtime.agentId,
          });
          const entity = await runtime.getEntityById(testEntityId);
          if (!entity) {
            throw new Error('Failed to create and retrieve entity');
          }
          console.log('✓ Entities table operational');

          // Test rooms table
          const testRoomId = asUUID(uuidv4());
          await runtime.createRoom({
            id: testRoomId,
            name: 'Test Room',
            source: 'test',
            type: 'GROUP' as any,
          });
          const room = await runtime.getRoom(testRoomId);
          if (!room) {
            throw new Error('Failed to create and retrieve room');
          }
          console.log('✓ Rooms table operational');

          // Test memories table
          const testMemory = await runtime.createMemory(
            {
              entityId: testEntityId,
              agentId: runtime.agentId,
              roomId: testRoomId,
              content: {
                text: 'Test memory for SQL plugin validation',
                source: 'test',
              },
            },
            'messages'
          );
          if (!testMemory) {
            throw new Error('Failed to create memory');
          }
          console.log('✓ Memories table operational');

          // Test tasks table
          const testTaskId = await runtime.createTask({
            name: 'Test Task',
            description: 'Test task for SQL plugin validation',
            roomId: testRoomId,
            tags: ['test'],
          });
          if (!testTaskId) {
            throw new Error('Failed to create task');
          }
          const task = await runtime.getTask(testTaskId);
          if (!task) {
            throw new Error('Failed to retrieve task');
          }
          console.log('✓ Tasks table operational');

          // Clean up test data
          await runtime.deleteTask(testTaskId);
          await runtime.deleteRoom(testRoomId);
        } catch (error) {
          throw new Error(
            `Core schema validation failed: ${error instanceof Error ? error.message : String(error)}`
          );
        }

        console.log('✅ SQL plugin initialization test passed');
      },
    },
    {
      name: 'should handle complex database operations with real runtime',
      fn: async (runtime: IAgentRuntime) => {
        console.log('🧪 Testing complex database operations...');

        const testWorldId = asUUID(uuidv4());
        const testRoomId = asUUID(uuidv4());
        const testEntityId = asUUID(uuidv4());

        // Step 1: Create a world
        await runtime.createWorld({
          id: testWorldId,
          name: 'Test World',
          agentId: runtime.agentId,
          serverId: 'test-server',
        });
        console.log('✓ Created world');

        // Step 2: Create a room in the world
        await runtime.createRoom({
          id: testRoomId,
          name: 'Test Room',
          source: 'test',
          type: 'GROUP' as any,
          worldId: testWorldId,
        });
        console.log('✓ Created room in world');

        // Step 3: Create entity
        await runtime.createEntity({
          id: testEntityId,
          names: ['Test User', 'TestUser'],
          agentId: runtime.agentId,
        });
        console.log('✓ Created entity');

        // Step 4: Add participant to room
        await runtime.addParticipant(testEntityId, testRoomId);
        console.log('✓ Added participant to room');

        // Step 5: Create multiple memories with embeddings
        const memoryIds: UUID[] = [];
        for (let i = 0; i < 3; i++) {
          const memoryId = await runtime.createMemory(
            {
              entityId: testEntityId,
              agentId: runtime.agentId,
              roomId: testRoomId,
              worldId: testWorldId,
              content: {
                text: `Test message ${i + 1} for complex operations`,
                source: 'test',
                metadata: { index: i },
              },
              embedding: new Array(1536).fill(0).map(() => Math.random()), // Mock embedding
            },
            'messages'
          );
          memoryIds.push(memoryId);
        }
        console.log('✓ Created memories with embeddings');

        // Step 6: Create relationship
        await runtime.createRelationship({
          sourceEntityId: testEntityId,
          targetEntityId: runtime.agentId,
          tags: ['test-relationship'],
          metadata: { type: 'test' },
        });
        console.log('✓ Created relationship');

        // Step 7: Create components
        const componentId = asUUID(uuidv4());
        await runtime.createComponent({
          id: componentId,
          entityId: testEntityId,
          agentId: runtime.agentId,
          roomId: testRoomId,
          worldId: testWorldId,
          sourceEntityId: testEntityId,
          type: 'profile',
          createdAt: Date.now(),
          data: {
            bio: 'Test user profile',
            preferences: { theme: 'dark' },
          },
        });
        console.log('✓ Created component');

        // Step 8: Query operations
        const memories = await runtime.getMemories({
          roomId: testRoomId,
          count: 10,
          tableName: 'messages',
        });
        if (memories.length !== 3) {
          throw new Error(`Expected 3 memories, got ${memories.length}`);
        }
        console.log('✓ Retrieved memories');

        const participants = await runtime.getParticipantsForRoom(testRoomId);
        if (participants.length !== 1) {
          throw new Error(`Expected 1 participant, got ${participants.length}`);
        }
        console.log('✓ Retrieved participants');

        const relationships = await runtime.getRelationships({
          entityId: testEntityId,
        });
        if (relationships.length === 0) {
          throw new Error('No relationships found');
        }
        console.log('✓ Retrieved relationships');

        const components = await runtime.getComponents(testEntityId);
        if (components.length !== 1) {
          throw new Error(`Expected 1 component, got ${components.length}`);
        }
        console.log('✓ Retrieved components');

        // Step 9: Search operations
        if (memoryIds.length > 0) {
          const searchResults = await runtime.searchMemories({
            embedding: new Array(1536).fill(0).map(() => Math.random()),
            roomId: testRoomId,
            count: 2,
            match_threshold: 0.1, // Low threshold for test
            tableName: 'messages',
          });
          console.log(`✓ Search returned ${searchResults.length} results`);
        }

        // Step 10: Update operations
        await runtime.updateRoom({
          id: testRoomId,
          name: 'Updated Test Room',
          source: 'test',
          type: 'GROUP' as any,
          worldId: testWorldId,
        });
        const updatedRoom = await runtime.getRoom(testRoomId);
        if (!updatedRoom || updatedRoom.name !== 'Updated Test Room') {
          throw new Error('Room update failed');
        }
        console.log('✓ Updated room');

        // Step 11: Cache operations
        await runtime.setCache('test-key', { data: 'test-value' });
        const cachedValue = await runtime.getCache('test-key');
        if (!cachedValue || (cachedValue as any).data !== 'test-value') {
          throw new Error('Cache operations failed');
        }
        console.log('✓ Cache operations working');

        // Step 12: Clean up
        await runtime.deleteCache('test-key');
        await runtime.deleteComponent(componentId);
        await runtime.removeParticipant(testEntityId, testRoomId);
        await runtime.deleteRoom(testRoomId);
        await runtime.removeWorld(testWorldId);
        console.log('✓ Cleaned up test data');

        console.log('✅ Complex database operations test passed');
      },
    },
    {
      name: 'should handle database transactions and consistency',
      fn: async (runtime: IAgentRuntime) => {
        console.log('🧪 Testing database transactions and consistency...');

        const testEntityId = asUUID(uuidv4());
        const testRoomId = asUUID(uuidv4());

        try {
          // Test atomic operations
          await runtime.createEntity({
            id: testEntityId,
            names: ['Transaction Test Entity'],
            agentId: runtime.agentId,
          });

          await runtime.createRoom({
            id: testRoomId,
            name: 'Transaction Test Room',
            source: 'test',
            type: 'GROUP' as any,
          });

          // Create multiple related records that should be consistent
          const memoryPromises = [];
          for (let i = 0; i < 5; i++) {
            memoryPromises.push(
              runtime.createMemory(
                {
                  entityId: testEntityId,
                  agentId: runtime.agentId,
                  roomId: testRoomId,
                  content: {
                    text: `Concurrent message ${i}`,
                    source: 'test',
                  },
                },
                'messages'
              )
            );
          }

          const memoryIds = await Promise.all(memoryPromises);
          console.log(`✓ Created ${memoryIds.length} concurrent memories`);

          // Verify all memories were created
          const memories = await runtime.getMemories({
            roomId: testRoomId,
            count: 10,
            tableName: 'messages',
          });

          if (memories.length !== 5) {
            throw new Error(`Expected 5 memories, got ${memories.length}`);
          }
          console.log('✓ All concurrent operations completed successfully');

          // Test foreign key constraints by trying to create memory with invalid entity
          try {
            await runtime.createMemory(
              {
                entityId: asUUID(uuidv4()), // Non-existent entity
                agentId: runtime.agentId,
                roomId: testRoomId,
                content: {
                  text: 'This should fail',
                  source: 'test',
                },
              },
              'messages'
            );
            console.log(
              '⚠️ Foreign key constraint not enforced (may be expected for some adapters)'
            );
          } catch (error) {
            console.log('✓ Foreign key constraint properly enforced');
          }
        } catch (error) {
          throw new Error(
            `Transaction test failed: ${error instanceof Error ? error.message : String(error)}`
          );
        } finally {
          // Clean up
          try {
            await runtime.deleteRoom(testRoomId);
          } catch (error) {
            // Ignore cleanup errors
          }
        }

        console.log('✅ Database transactions and consistency test passed');
      },
    },
    {
      name: 'should handle plugin schema migrations and compatibility',
      fn: async (runtime: IAgentRuntime) => {
        console.log('🧪 Testing plugin schema migrations and compatibility...');

        // Test that the database can handle plugin-specific schemas
        // We'll simulate this by creating custom data in the database

        const testEntityId = asUUID(uuidv4());
        const testRoomId = asUUID(uuidv4());

        try {
          // Create base entities
          await runtime.createEntity({
            id: testEntityId,
            names: ['Plugin Test Entity'],
            agentId: runtime.agentId,
          });

          await runtime.createRoom({
            id: testRoomId,
            name: 'Plugin Test Room',
            source: 'test',
            type: 'GROUP' as any,
          });

          // Test component system (which plugins use for custom data)
          const componentTypes = ['profile', 'settings', 'custom-data'];
          const componentIds: UUID[] = [];

          for (const type of componentTypes) {
            const componentId = asUUID(uuidv4());
            await runtime.createComponent({
              id: componentId,
              entityId: testEntityId,
              agentId: runtime.agentId,
              roomId: testRoomId,
              worldId: asUUID(uuidv4()),
              sourceEntityId: testEntityId,
              type: type,
              createdAt: Date.now(),
              data: {
                pluginTest: true,
                type: type,
                created: new Date().toISOString(),
                customField: `Custom data for ${type}`,
              },
            });
            componentIds.push(componentId);
          }
          console.log(`✓ Created ${componentTypes.length} plugin components`);

          // Test retrieving components by type
          const profileComponents = await runtime.getComponent(testEntityId, 'profile');
          if (!profileComponents) {
            throw new Error('Failed to retrieve profile component');
          }
          console.log('✓ Retrieved component by type');

          // Test updating component data
          await runtime.updateComponent({
            id: componentIds[0],
            entityId: testEntityId,
            agentId: runtime.agentId,
            roomId: testRoomId,
            worldId: asUUID(uuidv4()),
            sourceEntityId: testEntityId,
            type: 'profile',
            createdAt: Date.now(),
            data: {
              ...profileComponents.data,
              updated: true,
              lastModified: new Date().toISOString(),
            },
          });
          console.log('✓ Updated component data');

          // Test complex metadata storage
          await runtime.createMemory(
            {
              entityId: testEntityId,
              agentId: runtime.agentId,
              roomId: testRoomId,
              content: {
                text: 'Memory with complex metadata',
                source: 'plugin-test',
                metadata: {
                  pluginData: {
                    version: '1.0.0',
                    features: ['feature1', 'feature2'],
                    config: {
                      enabled: true,
                      settings: {
                        timeout: 5000,
                        retries: 3,
                      },
                    },
                  },
                  timestamps: {
                    created: Date.now(),
                    processed: Date.now() + 1000,
                  },
                },
              },
            },
            'messages'
          );
          console.log('✓ Stored memory with complex metadata');

          // Test JSON querying capabilities (where supported)
          const memories = await runtime.getMemories({
            roomId: testRoomId,
            count: 10,
            tableName: 'messages',
          });

          const memoryWithMetadata = memories.find(
            (m) => m.content.metadata && (m.content.metadata as any).pluginData
          );

          if (!memoryWithMetadata) {
            throw new Error('Failed to retrieve memory with complex metadata');
          }
          console.log('✓ Retrieved memory with complex metadata');

          // Clean up components
          for (const componentId of componentIds) {
            await runtime.deleteComponent(componentId);
          }
          console.log('✓ Cleaned up components');
        } catch (error) {
          throw new Error(
            `Plugin schema test failed: ${error instanceof Error ? error.message : String(error)}`
          );
        } finally {
          // Clean up
          try {
            await runtime.deleteRoom(testRoomId);
          } catch (error) {
            // Ignore cleanup errors
          }
        }

        console.log('✅ Plugin schema migrations and compatibility test passed');
      },
    },
    {
      name: 'should handle database performance and scalability',
      fn: async (runtime: IAgentRuntime) => {
        console.log('🧪 Testing database performance and scalability...');

        const testRoomId = asUUID(uuidv4());
        const testEntityId = asUUID(uuidv4());

        try {
          // Create test entities
          await runtime.createEntity({
            id: testEntityId,
            names: ['Performance Test Entity'],
            agentId: runtime.agentId,
          });

          await runtime.createRoom({
            id: testRoomId,
            name: 'Performance Test Room',
            source: 'test',
            type: 'GROUP' as any,
          });

          console.log('Starting performance test...');
          const startTime = Date.now();

          // Test batch operations
          const batchSize = 20; // Reasonable size for testing
          const memoryIds: UUID[] = [];

          // Create memories in batches
          for (let i = 0; i < batchSize; i++) {
            const memoryId = await runtime.createMemory(
              {
                entityId: testEntityId,
                agentId: runtime.agentId,
                roomId: testRoomId,
                content: {
                  text: `Performance test message ${i + 1} with longer content to test storage efficiency`,
                  source: 'performance-test',
                  metadata: {
                    index: i,
                    timestamp: Date.now(),
                    batch: 'performance-test',
                  },
                },
              },
              'messages'
            );
            memoryIds.push(memoryId);
          }

          const createTime = Date.now() - startTime;
          console.log(`✓ Created ${batchSize} memories in ${createTime}ms`);

          // Test bulk retrieval
          const retrievalStart = Date.now();
          const allMemories = await runtime.getMemories({
            roomId: testRoomId,
            count: batchSize + 10, // Request more than available
            tableName: 'messages',
          });
          const retrievalTime = Date.now() - retrievalStart;

          if (allMemories.length !== batchSize) {
            throw new Error(`Expected ${batchSize} memories, got ${allMemories.length}`);
          }
          console.log(`✓ Retrieved ${allMemories.length} memories in ${retrievalTime}ms`);

          // Test pagination
          const pageSize = 5;
          const firstPage = await runtime.getMemories({
            roomId: testRoomId,
            count: pageSize,
            tableName: 'messages',
          });

          if (firstPage.length !== pageSize) {
            throw new Error(`Expected ${pageSize} memories in first page, got ${firstPage.length}`);
          }
          console.log(`✓ Pagination working (page size: ${pageSize})`);

          // Test search performance (if embeddings are supported)
          if (allMemories.some((m) => m.embedding)) {
            const searchStart = Date.now();
            const searchResults = await runtime.searchMemories({
              embedding: new Array(1536).fill(0).map(() => Math.random()),
              roomId: testRoomId,
              count: 5,
              match_threshold: 0.1,
              tableName: 'messages',
            });
            const searchTime = Date.now() - searchStart;
            console.log(
              `✓ Vector search completed in ${searchTime}ms (${searchResults.length} results)`
            );
          } else {
            console.log('⚠️ Vector search not tested (no embeddings found)');
          }

          // Test concurrent operations
          const concurrentStart = Date.now();
          const concurrentPromises = [];
          for (let i = 0; i < 5; i++) {
            concurrentPromises.push(
              runtime.getMemories({
                roomId: testRoomId,
                count: 3,
                tableName: 'messages',
              })
            );
          }
          await Promise.all(concurrentPromises);
          const concurrentTime = Date.now() - concurrentStart;
          console.log(`✓ 5 concurrent queries completed in ${concurrentTime}ms`);

          const totalTime = Date.now() - startTime;
          console.log(`✓ Total performance test time: ${totalTime}ms`);

          // Performance thresholds (reasonable for testing)
          if (createTime > 5000) {
            console.log(`⚠️ Create operations took ${createTime}ms (may be slow)`);
          }
          if (retrievalTime > 1000) {
            console.log(`⚠️ Retrieval took ${retrievalTime}ms (may be slow)`);
          }
        } catch (error) {
          throw new Error(
            `Performance test failed: ${error instanceof Error ? error.message : String(error)}`
          );
        } finally {
          // Clean up
          try {
            await runtime.deleteRoom(testRoomId);
          } catch (error) {
            // Ignore cleanup errors
          }
        }

        console.log('✅ Database performance and scalability test passed');
      },
    },
    {
      name: 'should test error handling and recovery',
      fn: async (runtime: IAgentRuntime) => {
        console.log('🧪 Testing error handling and recovery...');

        // Test handling of invalid UUIDs
        try {
          await runtime.getEntityById('invalid-uuid' as UUID);
          console.log('⚠️ Invalid UUID was accepted (may be expected)');
        } catch (error) {
          console.log('✓ Invalid UUID properly rejected');
        }

        // Test handling of non-existent records
        const nonExistentId = asUUID(uuidv4());
        const nonExistentEntity = await runtime.getEntityById(nonExistentId);
        if (nonExistentEntity !== null) {
          throw new Error('Expected null for non-existent entity');
        }
        console.log('✓ Non-existent records return null');

        // Test database connection recovery
        const isReady = await runtime.isReady();
        if (!isReady) {
          throw new Error('Database should be ready');
        }
        console.log('✓ Database connection is stable');

        // Test constraint violations (if enforced)
        try {
          await runtime.createEntity({
            id: asUUID(uuidv4()),
            names: [], // Empty names array might be invalid
            agentId: runtime.agentId,
          });
          console.log('⚠️ Empty names array was accepted (may be expected)');
        } catch (error) {
          console.log('✓ Invalid entity data properly rejected');
        }

        // Test memory with invalid room ID (foreign key constraint)
        try {
          await runtime.createMemory(
            {
              entityId: asUUID(uuidv4()),
              agentId: runtime.agentId,
              roomId: asUUID(uuidv4()), // Non-existent room
              content: {
                text: 'This should fail',
                source: 'test',
              },
            },
            'messages'
          );
          console.log('⚠️ Invalid room ID was accepted (foreign key not enforced)');
        } catch (error) {
          console.log('✓ Invalid foreign key properly rejected');
        }

        // Test large data handling
        try {
          const largeText = 'A'.repeat(10000); // 10KB text
          const testEntityId = asUUID(uuidv4());
          const testRoomId = asUUID(uuidv4());

          await runtime.createEntity({
            id: testEntityId,
            names: ['Large Data Test'],
            agentId: runtime.agentId,
          });

          await runtime.createRoom({
            id: testRoomId,
            name: 'Large Data Test Room',
            source: 'test',
            type: 'GROUP' as any,
          });

          const memoryId = await runtime.createMemory(
            {
              entityId: testEntityId,
              agentId: runtime.agentId,
              roomId: testRoomId,
              content: {
                text: largeText,
                source: 'test',
              },
            },
            'messages'
          );

          if (!memoryId) {
            throw new Error('Failed to create memory with large text');
          }
          console.log('✓ Large data handled successfully');

          // Clean up
          await runtime.deleteRoom(testRoomId);
        } catch (error) {
          throw new Error(
            `Large data test failed: ${error instanceof Error ? error.message : String(error)}`
          );
        }

        console.log('✅ Error handling and recovery test passed');
      },
    },
  ],
};

export default SqlPluginRuntimeIntegrationTestSuite;
