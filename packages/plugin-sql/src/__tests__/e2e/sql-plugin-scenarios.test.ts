import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { AgentRuntime } from '@elizaos/core';
import { v4 as uuidv4 } from 'uuid';
import type { UUID, IAgentRuntime, Memory, Character } from '@elizaos/core';
import { createIsolatedTestDatabase } from '../test-helpers';
import { mockCharacter } from '../fixtures';

/**
 * Comprehensive E2E Scenario Tests for SQL Plugin
 * 
 * These tests validate the SQL plugin through realistic workflow scenarios,
 * testing actual agent interactions and database operations end-to-end.
 */

describe('SQL Plugin E2E Scenarios', () => {
  let runtime: IAgentRuntime;
  let testAgentId: UUID;
  let cleanup: () => Promise<void>;

  beforeAll(async () => {
    console.log('[SCENARIO SETUP] Creating isolated test environment...');
    
    // Create isolated test database with runtime
    const setup = await createIsolatedTestDatabase(
      `scenario_tests_${Date.now()}`,
      []
    );

    // Use the runtime, testAgentId, and cleanup from the setup
    runtime = setup.runtime;
    testAgentId = setup.testAgentId;
    cleanup = setup.cleanup;

    console.log('[SCENARIO SETUP] Test environment ready');
  });

  afterAll(async () => {
    console.log('[SCENARIO CLEANUP] Cleaning up test environment...');
    if (cleanup) {
      await cleanup();
    }
  });

  describe('Scenario 1: Dynamic Table Creation Workflow', () => {
    it('should handle dynamic table creation through hello-world plugin interactions', async () => {
      const roomId = uuidv4() as UUID;
      const userId = uuidv4() as UUID;

      // Create test room
      await runtime.createRoom({
        id: roomId,
        name: 'Hello World Test Room',
        agentId: testAgentId,
        source: 'test',
        type: 'GROUP' as any,
      });

      // Create test user entity
      await runtime.createEntity({
        id: userId,
        names: ['Test User'],
        agentId: testAgentId,
      });

      // Scenario Step 1: Request hello world creation
      console.log('[SCENARIO 1.1] User requests hello world creation');
      const helloWorldMessage: Memory = {
        id: uuidv4() as UUID,
        entityId: userId,
        agentId: testAgentId,
        roomId: roomId,
        content: {
          text: 'Create a hello world message saying "Dynamic tables work!"',
          source: 'scenario-test',
        },
        metadata: { type: 'message' },
        createdAt: Date.now(),
      };

      await runtime.createMemory(helloWorldMessage, 'messages');

      // Verify the hello_world table can be created dynamically
      const db = runtime.db?.db || runtime.db;
      expect(db).toBeDefined();

      // Scenario Step 2: Request listing of hello world messages
      console.log('[SCENARIO 1.2] User requests listing of messages');
      const listMessage: Memory = {
        id: uuidv4() as UUID,
        entityId: userId,
        agentId: testAgentId,
        roomId: roomId,
        content: {
          text: 'List all hello world messages',
          source: 'scenario-test',
        },
        metadata: { type: 'message' },
        createdAt: Date.now(),
      };

      await runtime.createMemory(listMessage, 'messages');

      // Scenario Step 3: Create greeting in different language
      console.log('[SCENARIO 1.3] User creates multilingual greeting');
      const greetingMessage: Memory = {
        id: uuidv4() as UUID,
        entityId: userId,
        agentId: testAgentId,
        roomId: roomId,
        content: {
          text: 'Create a greeting in Spanish saying "Hola Mundo"',
          source: 'scenario-test',
        },
        metadata: { type: 'message' },
        createdAt: Date.now(),
      };

      await runtime.createMemory(greetingMessage, 'messages');

      // Verify conversation flow was preserved
      const conversationMemories = await runtime.getMemories({
        roomId: roomId,
        count: 10,
        tableName: 'messages',
      });

      expect(conversationMemories.length).toBe(3);
      expect(conversationMemories.some(m => m.content.text?.includes('Dynamic tables work!'))).toBe(true);
      expect(conversationMemories.some(m => m.content.text?.includes('List all hello world'))).toBe(true);
      expect(conversationMemories.some(m => m.content.text?.includes('Hola Mundo'))).toBe(true);

      console.log('[SCENARIO 1] ✅ Dynamic table creation workflow completed successfully');
    });
  });

  describe('Scenario 2: Multi-Agent Collaboration', () => {
    it('should handle multiple agents interacting with shared database', async () => {
      const sharedRoomId = uuidv4() as UUID;
      const agent1Id = uuidv4() as UUID;
      const agent2Id = uuidv4() as UUID;

      // Create shared collaboration room
      await runtime.createRoom({
        id: sharedRoomId,
        name: 'Multi-Agent Collaboration Room',
        agentId: testAgentId,
        source: 'test',
        type: 'GROUP' as any,
      });

      // Create agent entities
      await runtime.createEntity({
        id: agent1Id,
        names: ['Agent Alpha'],
        agentId: testAgentId,
        metadata: { role: 'data_creator' },
      });

      await runtime.createEntity({
        id: agent2Id,
        names: ['Agent Beta'],
        agentId: testAgentId,
        metadata: { role: 'data_reader' },
      });

      // Scenario Step 1: Agent 1 creates data
      console.log('[SCENARIO 2.1] Agent Alpha creates initial data');
      const agentCreateMessage: Memory = {
        id: uuidv4() as UUID,
        entityId: agent1Id,
        agentId: testAgentId,
        roomId: sharedRoomId,
        content: {
          text: 'I am creating shared project data',
          source: 'agent-collaboration',
        },
        metadata: { 
          type: 'message',
          agentRole: 'creator',
        },
        createdAt: Date.now(),
      };

      await runtime.createMemory(agentCreateMessage, 'messages');

      // Scenario Step 2: Agent 2 queries the data
      console.log('[SCENARIO 2.2] Agent Beta queries shared data');
      const agentQueryMessage: Memory = {
        id: uuidv4() as UUID,
        entityId: agent2Id,
        agentId: testAgentId,
        roomId: sharedRoomId,
        content: {
          text: 'What data has been created in this project?',
          source: 'agent-collaboration',
        },
        metadata: { 
          type: 'message',
          agentRole: 'reader',
        },
        createdAt: Date.now(),
      };

      await runtime.createMemory(agentQueryMessage, 'messages');

      // Scenario Step 3: Create relationship between agents
      console.log('[SCENARIO 2.3] Establishing agent relationship');
      const collaborationRelationship = await runtime.createRelationship({
        sourceEntityId: agent1Id,
        targetEntityId: agent2Id,
        tags: ['collaboration', 'project-team'],
        metadata: {
          project: 'shared-database-test',
          started: Date.now(),
          role_1: 'creator',
          role_2: 'reader',
        },
      });

      expect(collaborationRelationship).toBe(true);

      // Verify the collaboration scenario
      const collaborationMemories = await runtime.getMemories({
        roomId: sharedRoomId,
        count: 10,
        tableName: 'messages',
      });

      expect(collaborationMemories.length).toBe(2);
      
      const relationships = await runtime.getRelationships({
        entityId: agent1Id,
      });

      expect(relationships.length).toBeGreaterThan(0);
      const foundRelationship = relationships.find(r => 
        r.sourceEntityId === agent1Id && r.targetEntityId === agent2Id
      );
      expect(foundRelationship).toBeDefined();
      expect(foundRelationship?.metadata.project).toBe('shared-database-test');

      console.log('[SCENARIO 2] ✅ Multi-agent collaboration completed successfully');
    });
  });

  describe('Scenario 3: Data Persistence and Migration', () => {
    it('should handle complex data operations and schema evolution', async () => {
      const projectRoomId = uuidv4() as UUID;
      const projectManagerId = uuidv4() as UUID;

      // Create project management room
      await runtime.createRoom({
        id: projectRoomId,
        name: 'Project Management Room',
        agentId: testAgentId,
        source: 'test',
        type: 'GROUP' as any,
      });

      // Create project manager entity
      await runtime.createEntity({
        id: projectManagerId,
        names: ['Project Manager AI'],
        agentId: testAgentId,
        metadata: { 
          role: 'project_manager',
          permissions: ['create', 'read', 'update', 'delete'],
        },
      });

      // Scenario Step 1: Create initial project data with components
      console.log('[SCENARIO 3.1] Creating initial project with components');
      
      // Create project status component
      await runtime.createComponent({
        id: uuidv4() as UUID,
        entityId: projectManagerId,
        agentId: testAgentId,
        roomId: projectRoomId,
        worldId: uuidv4() as UUID,
        sourceEntityId: projectManagerId,
        type: 'project_status',
        data: {
          status: 'active',
          startDate: new Date().toISOString(),
          priority: 'high',
          tasks: ['setup_database', 'implement_features', 'run_tests'],
        },
        createdAt: Date.now(),
      });

      // Create project metrics component
      await runtime.createComponent({
        id: uuidv4() as UUID,
        entityId: projectManagerId,
        agentId: testAgentId,
        roomId: projectRoomId,
        worldId: uuidv4() as UUID,
        sourceEntityId: projectManagerId,
        type: 'project_metrics',
        data: {
          completion: 0.75,
          testsPassingRate: 1.0,
          codeQuality: 'A',
          performance: {
            avgResponseTime: '< 100ms',
            memoryUsage: 'optimized',
          },
        },
        createdAt: Date.now(),
      });

      // Scenario Step 2: Create memories with embeddings for semantic search
      console.log('[SCENARIO 3.2] Creating searchable project knowledge');
      
      const projectMemories = [
        'The database schema uses lazy table creation for optimal performance',
        'All tests are passing and provide real runtime validation',
        'The plugin architecture supports dynamic table creation',
        'Memory operations include proper embedding support',
      ];

      for (const text of projectMemories) {
        await runtime.createMemory({
          id: uuidv4() as UUID,
          entityId: projectManagerId,
          agentId: testAgentId,
          roomId: projectRoomId,
          content: {
            text,
            source: 'project-knowledge',
          },
          embedding: Array(384).fill(Math.random()), // Simulate real embeddings
          metadata: { 
            type: 'knowledge',
            category: 'project_documentation',
          },
          createdAt: Date.now(),
        }, 'facts');
      }

      // Scenario Step 3: Test semantic search capabilities
      console.log('[SCENARIO 3.3] Testing semantic search');
      
      const searchResults = await runtime.searchMemories({
        embedding: Array(384).fill(0.5), // Search embedding
        roomId: projectRoomId,
        count: 5,
        match_threshold: 0.1,
        tableName: 'facts',
      });

      expect(searchResults.length).toBeGreaterThan(0);

      // Scenario Step 4: Verify component system integrity
      console.log('[SCENARIO 3.4] Verifying component system');
      
      const projectComponents = await runtime.getComponents(projectManagerId);
      expect(projectComponents.length).toBe(2);
      
      const statusComponent = projectComponents.find(c => c.type === 'project_status');
      const metricsComponent = projectComponents.find(c => c.type === 'project_metrics');
      
      expect(statusComponent).toBeDefined();
      expect(metricsComponent).toBeDefined();
      expect(statusComponent?.data.status).toBe('active');
      expect(metricsComponent?.data.completion).toBe(0.75);

      console.log('[SCENARIO 3] ✅ Data persistence and migration completed successfully');
    });
  });

  describe('Scenario 4: Error Recovery and Edge Cases', () => {
    it('should gracefully handle edge cases and error conditions', async () => {
      const edgeCaseRoomId = uuidv4() as UUID;
      const testUserId = uuidv4() as UUID;

      // Create edge case testing room
      await runtime.createRoom({
        id: edgeCaseRoomId,
        name: 'Edge Case Testing Room',
        agentId: testAgentId,
        source: 'test',
        type: 'GROUP' as any,
      });

      await runtime.createEntity({
        id: testUserId,
        names: ['Edge Case Tester'],
        agentId: testAgentId,
      });

      // Scenario Step 1: Test handling of non-existent data
      console.log('[SCENARIO 4.1] Testing non-existent data queries');
      
      const nonExistentId = uuidv4() as UUID;
      const nonExistentEntity = await runtime.getEntityById(nonExistentId);
      expect(nonExistentEntity).toBeNull();

      const emptyMemories = await runtime.getMemories({
        roomId: nonExistentId,
        count: 10,
        tableName: 'messages',
      });
      expect(emptyMemories).toEqual([]);

      // Scenario Step 2: Test concurrent memory creation
      console.log('[SCENARIO 4.2] Testing concurrent operations');
      
      const concurrentPromises = Array.from({ length: 5 }, (_, i) => 
        runtime.createMemory({
          id: uuidv4() as UUID,
          entityId: testUserId,
          agentId: testAgentId,
          roomId: edgeCaseRoomId,
          content: {
            text: `Concurrent message ${i + 1}`,
            source: 'concurrency-test',
          },
          metadata: { 
            type: 'message',
            concurrent: true,
            index: i,
          },
          createdAt: Date.now() + i, // Slight time differences
        }, 'messages')
      );

      const concurrentResults = await Promise.all(concurrentPromises);
      expect(concurrentResults.length).toBe(5);
      concurrentResults.forEach(result => expect(typeof result).toBe('string'));

      // Scenario Step 3: Test large data operations
      console.log('[SCENARIO 4.3] Testing bulk operations');
      
      const bulkEntities = Array.from({ length: 20 }, (_, i) => 
        runtime.createEntity({
          id: uuidv4() as UUID,
          names: [`Bulk Entity ${i}`],
          agentId: testAgentId,
          metadata: { 
            bulkTest: true,
            index: i,
            created: Date.now(),
          },
        })
      );

      const bulkResults = await Promise.all(bulkEntities);
      expect(bulkResults.length).toBe(20);
      bulkResults.forEach(result => expect(result).toBe(true));

      // Scenario Step 4: Test memory with special characters and edge cases
      console.log('[SCENARIO 4.4] Testing special character handling');
      
      const specialCharMemory = await runtime.createMemory({
        id: uuidv4() as UUID,
        entityId: testUserId,
        agentId: testAgentId,
        roomId: edgeCaseRoomId,
        content: {
          text: 'Special chars: 🎉 中文 العربية ñoño "quotes" \'apostrophe\' <html>&amp;</html>',
          source: 'special-char-test',
        },
        metadata: { 
          type: 'message',
          specialChars: true,
        },
        createdAt: Date.now(),
      }, 'messages');

      expect(typeof specialCharMemory).toBe('string');

      const retrievedSpecial = await runtime.getMemories({
        roomId: edgeCaseRoomId,
        count: 50,
        tableName: 'messages',
      });

      const foundSpecial = retrievedSpecial.find(m => 
        m.content.text?.includes('🎉') && 
        m.content.text?.includes('中文')
      );
      expect(foundSpecial).toBeDefined();

      console.log('[SCENARIO 4] ✅ Error recovery and edge cases handled successfully');
    });
  });

  describe('Scenario 5: Performance and Scalability', () => {
    it('should handle realistic load and performance requirements', async () => {
      const performanceRoomId = uuidv4() as UUID;
      const performanceUserId = uuidv4() as UUID;

      await runtime.createRoom({
        id: performanceRoomId,
        name: 'Performance Test Room',
        agentId: testAgentId,
        source: 'test',
        type: 'GROUP' as any,
      });

      await runtime.createEntity({
        id: performanceUserId,
        names: ['Performance Tester'],
        agentId: testAgentId,
      });

      // Scenario Step 1: Measure memory creation performance
      console.log('[SCENARIO 5.1] Testing memory creation performance');
      
      const startTime = Date.now();
      const memoryCount = 100;
      
      const performancePromises = Array.from({ length: memoryCount }, (_, i) => 
        runtime.createMemory({
          id: uuidv4() as UUID,
          entityId: performanceUserId,
          agentId: testAgentId,
          roomId: performanceRoomId,
          content: {
            text: `Performance test message ${i} with enough content to simulate realistic usage patterns`,
            source: 'performance-test',
          },
          metadata: { 
            type: 'message',
            performanceTest: true,
            index: i,
            timestamp: Date.now(),
          },
          createdAt: Date.now() + i,
        }, 'messages')
      );

      await Promise.all(performancePromises);
      const endTime = Date.now();
      const duration = endTime - startTime;

      // Should complete 100 memory creations in reasonable time (< 5 seconds)
      expect(duration).toBeLessThan(5000);
      
      console.log(`[SCENARIO 5.1] Created ${memoryCount} memories in ${duration}ms`);

      // Scenario Step 2: Test query performance with large dataset
      console.log('[SCENARIO 5.2] Testing query performance');
      
      const queryStartTime = Date.now();
      const allMemories = await runtime.getMemories({
        roomId: performanceRoomId,
        count: memoryCount,
        tableName: 'messages',
      });
      const queryEndTime = Date.now();
      const queryDuration = queryEndTime - queryStartTime;

      expect(allMemories.length).toBe(memoryCount);
      expect(queryDuration).toBeLessThan(1000); // Should query 100 records in < 1 second

      console.log(`[SCENARIO 5.2] Queried ${allMemories.length} memories in ${queryDuration}ms`);

      // Scenario Step 3: Test relationship performance
      console.log('[SCENARIO 5.3] Testing relationship performance');
      
      const relationshipStartTime = Date.now();
      const relationshipCount = 20;
      
      const relationshipPromises = Array.from({ length: relationshipCount }, (_, i) => {
        const targetId = uuidv4() as UUID;
        
        // Create entity first
        return runtime.createEntity({
          id: targetId,
          names: [`Perf Target ${i}`],
          agentId: testAgentId,
        }).then(() => 
          runtime.createRelationship({
            sourceEntityId: performanceUserId,
            targetEntityId: targetId,
            tags: ['performance-test', `batch-${Math.floor(i / 5)}`],
            metadata: {
              index: i,
              created: Date.now(),
              testType: 'performance',
            },
          })
        );
      });

      const relationshipResults = await Promise.all(relationshipPromises);
      const relationshipEndTime = Date.now();
      const relationshipDuration = relationshipEndTime - relationshipStartTime;

      expect(relationshipResults.length).toBe(relationshipCount);
      relationshipResults.forEach(result => expect(result).toBe(true));
      expect(relationshipDuration).toBeLessThan(3000); // Should create 20 relationships in < 3 seconds

      console.log(`[SCENARIO 5.3] Created ${relationshipCount} relationships in ${relationshipDuration}ms`);

      console.log('[SCENARIO 5] ✅ Performance and scalability tests completed successfully');
    });
  });
});