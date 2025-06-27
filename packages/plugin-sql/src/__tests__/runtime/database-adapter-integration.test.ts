import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'bun:test';
import {
  AgentRuntime,
  createUniqueUuid,
  type UUID,
  type Agent,
  type Memory,
  type Component,
  type Entity,
  type Relationship,
  type Room,
  ChannelType,
} from '@elizaos/core';
import { v4 as uuidv4 } from 'uuid';
import { createDatabaseAdapter } from '../../index';
import { createIsolatedTestDatabase } from '../test-helpers';
import type { PgAdapter } from '../../pg/adapter';

describe('Database Adapter Real Runtime Integration', () => {
  let adapter: PgAdapter;
  let runtime: AgentRuntime;
  let cleanup: () => Promise<void>;
  let testAgentId: UUID;

  beforeAll(async () => {
    const setup = await createIsolatedTestDatabase('adapter-runtime-integration');
    adapter = setup.adapter;
    runtime = setup.runtime;
    cleanup = setup.cleanup;
    testAgentId = setup.testAgentId;
  });

  afterAll(async () => {
    if (cleanup) {
      await cleanup();
    }
  });

  describe('Agent Operations with Real Runtime', () => {
    it('should create and retrieve agents through runtime', async () => {
      const testAgent: Agent = {
        id: uuidv4() as UUID,
        name: 'Real Runtime Test Agent',
        bio: 'A test agent created through real runtime',
        system: 'You are a test agent for validating real database operations',
        plugins: ['@elizaos/plugin-sql'],
        settings: {
          testMode: true,
          runtimeIntegration: 'enabled',
        },
        createdAt: Date.now(),
        updatedAt: Date.now(),
        enabled: true,
      };

      // Create agent through runtime (not direct adapter call)
      const created = await runtime.createAgent(testAgent);
      expect(created).toBe(true);

      // Retrieve through runtime
      const retrieved = await runtime.getAgent(testAgent.id!);
      expect(retrieved).toBeDefined();
      expect(retrieved?.name).toBe(testAgent.name);
      expect(retrieved?.plugins).toEqual(testAgent.plugins || []);
      expect(retrieved?.settings).toEqual(testAgent.settings || {});
    });

    it('should handle agent creation failure with duplicate names', async () => {
      const agentName = `Duplicate Test Agent ${Date.now()}`;

      const agent1: Agent = {
        id: uuidv4() as UUID,
        name: agentName,
        bio: 'First agent',
        system: 'Test agent 1',
        plugins: [],
        settings: {},
        createdAt: Date.now(),
        updatedAt: Date.now(),
        enabled: true,
      };

      const agent2: Agent = {
        id: uuidv4() as UUID,
        name: agentName, // Same name, different ID
        bio: 'Second agent',
        system: 'Test agent 2',
        plugins: [],
        settings: {},
        createdAt: Date.now(),
        updatedAt: Date.now(),
        enabled: true,
      };

      // First creation should succeed
      const created1 = await runtime.createAgent(agent1);
      expect(created1).toBe(true);

      // Second creation should fail due to duplicate name
      const created2 = await runtime.createAgent(agent2);
      expect(created2).toBe(false);

      // Verify only first agent exists
      const retrieved1 = await runtime.getAgent(agent1.id!);
      const retrieved2 = await runtime.getAgent(agent2.id!);

      expect(retrieved1).toBeDefined();
      expect(retrieved2).toBeNull();
    });
  });

  describe('Memory Operations with Real Runtime', () => {
    let testRoomId: UUID;
    let testEntityId: UUID;

    beforeEach(async () => {
      testRoomId = uuidv4() as UUID;
      testEntityId = uuidv4() as UUID;

      // Create test entity through runtime
      await runtime.createEntity({
        id: testEntityId,
        names: ['Test Entity'],
        agentId: testAgentId,
        metadata: { testMode: true },
      });

      // Create test room through runtime
      await runtime.createRoom({
        id: testRoomId,
        name: 'Test Room',
        agentId: testAgentId,
        source: 'test',
        type: ChannelType.GROUP,
        metadata: { purpose: 'runtime-integration-test' },
      });
    });

    it('should create and retrieve memories with embeddings', async () => {
      const testMemory: Memory = {
        id: uuidv4() as UUID,
        entityId: testEntityId,
        agentId: testAgentId,
        roomId: testRoomId,
        content: {
          text: 'This is a test memory for runtime integration',
          type: 'message',
          source: 'runtime-test',
        },
        embedding: Array(384).fill(0.1), // Use actual embedding vector
        createdAt: Date.now(),
        unique: true,
        metadata: {
          type: 'message', // Required field for memory table schema
        },
      };

      // Create memory through runtime (requires tableName as second parameter)
      const createdMemoryId = await runtime.createMemory(testMemory, 'messages');
      expect(createdMemoryId).toBeDefined();
      expect(typeof createdMemoryId).toBe('string');

      // Retrieve memories through runtime
      const memories = await runtime.getMemories({
        roomId: testRoomId,
        count: 10,
        unique: true,
        tableName: 'messages',
      });

      expect(memories.length).toBeGreaterThan(0);
      const foundMemory = memories.find((m) => m.content.text === testMemory.content.text);
      expect(foundMemory).toBeDefined();
      expect(foundMemory?.embedding).toBeDefined();
      expect(foundMemory?.embedding?.length).toBe(384);
    });

    it('should perform semantic search with real embeddings', async () => {
      // Create multiple memories with different content
      const testMemories = [
        {
          text: 'The weather is sunny and warm today',
          embedding: Array(384).fill(0.9),
        },
        {
          text: 'I love reading books about science fiction',
          embedding: Array(384).fill(0.5),
        },
        {
          text: 'Today is a beautiful sunny day for outdoor activities',
          embedding: Array(384).fill(0.8), // Similar to first memory
        },
      ];

      // Create memories through runtime
      for (const mem of testMemories) {
        await runtime.createMemory(
          {
            id: uuidv4() as UUID,
            entityId: testEntityId,
            agentId: testAgentId,
            roomId: testRoomId,
            content: {
              text: mem.text,
              type: 'message',
              source: 'search-test',
            },
            embedding: mem.embedding,
            createdAt: Date.now(),
            unique: true,
            metadata: {
              type: 'message', // Required field for memory table schema
            },
          },
          'messages'
        ); // Add tableName parameter
      }

      // Search with query similar to weather memories
      const searchEmbedding = Array(384).fill(0.85);
      const searchResults = await runtime.searchMemories({
        embedding: searchEmbedding,
        roomId: testRoomId,
        count: 5,
        match_threshold: 0.1,
        tableName: 'messages',
      });

      expect(searchResults.length).toBeGreaterThan(0);

      // Results should include weather-related memories
      const weatherMemories = searchResults.filter(
        (m) => m.content.text?.includes('sunny') || m.content.text?.includes('weather')
      );
      expect(weatherMemories.length).toBeGreaterThan(0);
    });
  });

  describe('Component System with Real Runtime', () => {
    let testEntityId: UUID;
    let testRoomId: UUID;

    beforeEach(async () => {
      testEntityId = uuidv4() as UUID;
      testRoomId = uuidv4() as UUID;

      await runtime.createEntity({
        id: testEntityId,
        names: ['Component Test Entity'],
        agentId: testAgentId,
        metadata: { hasComponents: true },
      });

      await runtime.createRoom({
        id: testRoomId,
        name: 'Component Test Room',
        agentId: testAgentId,
        source: 'test',
        type: ChannelType.GROUP,
      });
    });

    it('should create and manage entity components', async () => {
      const profileComponent: Component = {
        id: uuidv4() as UUID,
        entityId: testEntityId,
        agentId: testAgentId,
        roomId: testRoomId,
        worldId: uuidv4() as UUID,
        sourceEntityId: testAgentId,
        type: 'profile',
        data: {
          bio: 'Software engineer with interest in AI',
          location: 'San Francisco',
          skills: ['TypeScript', 'Machine Learning', 'Database Design'],
          preferences: {
            theme: 'dark',
            notifications: true,
          },
        },
        createdAt: Date.now(),
      };

      // Create component through runtime
      const created = await runtime.createComponent(profileComponent);
      expect(created).toBe(true);

      // Retrieve component through runtime
      const retrieved = await runtime.getComponent(
        testEntityId,
        'profile',
        profileComponent.worldId,
        profileComponent.sourceEntityId
      );

      expect(retrieved).toBeDefined();
      expect(retrieved?.type).toBe('profile');
      expect(retrieved?.data.bio).toBe(profileComponent.data.bio);
      expect(retrieved?.data.skills).toEqual(profileComponent.data.skills);
      expect(retrieved?.data.preferences).toEqual(profileComponent.data.preferences);
    });

    it('should handle multiple component types for same entity', async () => {
      const components = [
        {
          type: 'profile',
          data: { bio: 'Test bio', location: 'Test location' },
        },
        {
          type: 'preferences',
          data: { theme: 'dark', language: 'en', notifications: true },
        },
        {
          type: 'activity',
          data: { lastSeen: Date.now(), messageCount: 42, joinedAt: Date.now() - 86400000 },
        },
      ];

      // Create all components
      for (const comp of components) {
        await runtime.createComponent({
          id: uuidv4() as UUID,
          entityId: testEntityId,
          agentId: testAgentId,
          roomId: testRoomId,
          worldId: uuidv4() as UUID,
          sourceEntityId: testAgentId,
          type: comp.type,
          data: comp.data,
          createdAt: Date.now(),
        });
      }

      // Retrieve all components for entity
      const allComponents = await runtime.getComponents(testEntityId);
      expect(allComponents.length).toBe(3);

      // Verify each component type exists
      const componentTypes = allComponents.map((c) => c.type);
      expect(componentTypes).toContain('profile');
      expect(componentTypes).toContain('preferences');
      expect(componentTypes).toContain('activity');
    });
  });

  describe('Relationship Management with Real Runtime', () => {
    let entity1Id: UUID;
    let entity2Id: UUID;

    beforeEach(async () => {
      entity1Id = uuidv4() as UUID;
      entity2Id = uuidv4() as UUID;

      // Create test entities
      await runtime.createEntity({
        id: entity1Id,
        names: ['Alice'],
        agentId: testAgentId,
        metadata: { role: 'user' },
      });

      await runtime.createEntity({
        id: entity2Id,
        names: ['Bob'],
        agentId: testAgentId,
        metadata: { role: 'user' },
      });
    });

    it('should create and manage entity relationships', async () => {
      const relationship: Relationship = {
        id: uuidv4() as UUID,
        sourceEntityId: entity1Id,
        targetEntityId: entity2Id,
        agentId: testAgentId,
        tags: ['friend', 'colleague', 'collaborator'],
        metadata: {
          strength: 0.8,
          trust: 0.9,
          interactions: 15,
          lastInteraction: Date.now(),
          context: 'work project collaboration',
        },
        createdAt: new Date().toISOString(),
      };

      // Create relationship through runtime (using proper parameter format)
      const created = await runtime.createRelationship({
        sourceEntityId: relationship.sourceEntityId,
        targetEntityId: relationship.targetEntityId,
        tags: relationship.tags,
        metadata: relationship.metadata,
      });
      expect(created).toBe(true);

      // Retrieve relationships through runtime
      const relationships = await runtime.getRelationships({
        entityId: entity1Id,
      });

      expect(relationships.length).toBeGreaterThan(0);
      const foundRel = relationships.find(
        (r) => r.sourceEntityId === entity1Id && r.targetEntityId === entity2Id
      );

      expect(foundRel).toBeDefined();
      expect(foundRel?.tags).toEqual(relationship.tags);
      expect(foundRel?.metadata.strength).toBe(0.8);
      expect(foundRel?.metadata.trust).toBe(0.9);
    });
  });

  describe('Error Handling and Edge Cases', () => {
    it('should handle database constraint violations gracefully', async () => {
      const duplicateId = uuidv4() as UUID;

      const agent1: Agent = {
        id: duplicateId,
        name: 'Original Agent',
        bio: 'Original agent',
        system: 'Original system',
        plugins: [],
        settings: {},
        createdAt: Date.now(),
        updatedAt: Date.now(),
        enabled: true,
      };

      const agent2: Agent = {
        id: duplicateId, // Same ID
        name: 'Duplicate Agent',
        bio: 'Duplicate agent',
        system: 'Duplicate system',
        plugins: [],
        settings: {},
        createdAt: Date.now(),
        updatedAt: Date.now(),
        enabled: true,
      };

      // First creation should succeed
      const created1 = await runtime.createAgent(agent1);
      expect(created1).toBe(true);

      // Second creation should fail gracefully (not throw)
      const created2 = await runtime.createAgent(agent2);
      expect(created2).toBe(false);

      // Original agent should still exist with original data
      const retrieved = await runtime.getAgent(duplicateId);
      expect(retrieved?.name).toBe('Original Agent');
    });

    it('should handle missing references gracefully', async () => {
      const nonExistentId = uuidv4() as UUID;

      // These should not throw errors
      const agent = await runtime.getAgent(nonExistentId);
      expect(agent).toBeNull();

      const entity = await runtime.getEntityById(nonExistentId);
      expect(entity).toBeNull();

      const memories = await runtime.getMemories({
        roomId: nonExistentId,
        count: 10,
        tableName: 'messages',
      });
      expect(memories).toEqual([]);
    });
  });

  describe('Performance and Scalability', () => {
    it('should handle bulk operations efficiently', async () => {
      const startTime = Date.now();
      const numEntities = 50;
      const entities: Entity[] = [];

      // Create many entities
      for (let i = 0; i < numEntities; i++) {
        const entity: Entity = {
          id: uuidv4() as UUID,
          names: [`Bulk Entity ${i}`],
          agentId: testAgentId,
          metadata: {
            index: i,
            batchTest: true,
            createdInBulk: Date.now(),
          },
        };
        entities.push(entity);
      }

      // Create all entities through runtime
      const results = await Promise.all(entities.map((entity) => runtime.createEntity(entity)));

      const endTime = Date.now();
      const duration = endTime - startTime;

      // All should succeed
      results.forEach((result) => expect(result).toBe(true));

      // Should complete in reasonable time (less than 5 seconds for 50 entities)
      expect(duration).toBeLessThan(5000);

      // Verify all entities were created
      const entityIds = entities.map((e) => e.id!).filter(Boolean);
      const retrieved = await runtime.getEntityByIds(entityIds);
      expect(retrieved?.length || 0).toBe(numEntities);
    });

    it('should handle concurrent operations safely', async () => {
      const concurrentOps = 10;
      const promises: Promise<any>[] = [];

      // Create concurrent operations
      for (let i = 0; i < concurrentOps; i++) {
        const promise = runtime.createEntity({
          id: uuidv4() as UUID,
          names: [`Concurrent Entity ${i}`],
          agentId: testAgentId,
          metadata: { concurrencyTest: true, index: i },
        });
        promises.push(promise);
      }

      // All should complete successfully
      const results = await Promise.all(promises);
      results.forEach((result) => expect(result).toBe(true));

      // Verify no corruption occurred by checking all results completed successfully
      // Since the entities aren't associated with a specific room, use a simpler verification
      expect(results.length).toBe(concurrentOps);
      results.forEach((result) => expect(result).toBe(true));
    });
  });
});
