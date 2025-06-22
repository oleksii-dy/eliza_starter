import type { TestSuite, UUID } from '@elizaos/core';
import { stringToUuid } from '@elizaos/core';

export class SqlPluginTestSuite implements TestSuite {
  name = 'sql-plugin-e2e';
  description = 'End-to-end tests for SQL plugin table creation and operations';

  tests = [
    {
      name: 'Plugin should be registered and initialized',
      fn: async (runtime: any) => {
        // Check that database adapter is available
        if (!runtime.db) {
          throw new Error('Database adapter not found on runtime');
        }

        // Check adapter type
        const adapterName = runtime.db.constructor.name;
        if (!adapterName.includes('DatabaseAdapter')) {
          throw new Error(`Unexpected adapter type: ${adapterName}`);
        }

        console.log(`✅ SQL plugin initialized with adapter: ${adapterName}`);
      },
    },

    {
      name: 'Core tables should be created',
      fn: async (runtime: any) => {
        const db = runtime.db;
        
        // Test that we can query core tables
        const coreTableTests = [
          { table: 'agents', operation: () => db.getAgents() },
          { table: 'entities', operation: () => db.getEntitiesForAgent(runtime.agentId) },
          { table: 'rooms', operation: () => db.getRooms() },
          { table: 'memories', operation: () => db.getMemories({ count: 1 }) },
          { table: 'cache', operation: () => db.getCache('test-key') },
          { table: 'worlds', operation: () => db.getWorlds() },
          { table: 'tasks', operation: () => db.getTasks({ tags: ['test'] }) },
        ];

        for (const test of coreTableTests) {
          try {
            await test.operation();
            console.log(`✅ Table ${test.table} is accessible`);
          } catch (error) {
            throw new Error(`Failed to access table ${test.table}: ${(error as Error).message}`);
          }
        }
      },
    },

    {
      name: 'Should create and retrieve entities',
      fn: async (runtime: any) => {
        const entityId = stringToUuid('test-entity-' + Date.now());
        
        // Create entity
        await runtime.db.createEntities([{
          id: entityId,
          names: ['Test Entity E2E'],
          agentId: runtime.agentId,
          metadata: { test: true },
        }]);

        // Retrieve entity
        const entity = await runtime.getEntityById(entityId);
        if (!entity) {
          throw new Error('Failed to retrieve created entity');
        }

        if (!entity.names.includes('Test Entity E2E')) {
          throw new Error('Entity names do not match');
        }

        console.log('✅ Successfully created and retrieved entity');
      },
    },

    {
      name: 'Should create and retrieve rooms',
      fn: async (runtime: any) => {
        const roomId = stringToUuid('test-room-' + Date.now());
        
        // Create room
        await runtime.createRoom({
          id: roomId,
          name: 'Test Room E2E',
          source: 'test',
          type: 'GROUP',
          agentId: runtime.agentId,
        });

        // Retrieve room
        const room = await runtime.getRoom(roomId);
        if (!room) {
          throw new Error('Failed to retrieve created room');
        }

        if (room.name !== 'Test Room E2E') {
          throw new Error('Room name does not match');
        }

        console.log('✅ Successfully created and retrieved room');
      },
    },

    {
      name: 'Should handle cache operations',
      fn: async (runtime: any) => {
        const cacheKey = 'test-cache-key-' + Date.now();
        const cacheValue = { data: 'test-value', timestamp: Date.now() };
        
        // Set cache
        await runtime.setCache(cacheKey, cacheValue);

        // Get cache
        const retrieved = await runtime.getCache(cacheKey);
        if (!retrieved) {
          throw new Error('Failed to retrieve cached value');
        }

        if (retrieved.data !== cacheValue.data) {
          throw new Error('Cache value does not match');
        }

        // Delete cache
        await runtime.deleteCache(cacheKey);

        // Verify deletion
        const afterDelete = await runtime.getCache(cacheKey);
        if (afterDelete) {
          throw new Error('Cache was not deleted');
        }

        console.log('✅ Successfully performed cache operations');
      },
    },

    {
      name: 'Should create and manage relationships',
      fn: async (runtime: any) => {
        // Create two entities
        const entity1Id = stringToUuid('entity1-' + Date.now());
        const entity2Id = stringToUuid('entity2-' + Date.now());
        
        await runtime.db.createEntities([{
          id: entity1Id,
          names: ['Entity 1'],
          agentId: runtime.agentId,
        }]);

        await runtime.db.createEntities([{
          id: entity2Id,
          names: ['Entity 2'],
          agentId: runtime.agentId,
        }]);

        // Create relationship
        const relationshipId = await runtime.createRelationship({
          sourceEntityId: entity1Id,
          targetEntityId: entity2Id,
          agentId: runtime.agentId,
          tags: ['friend', 'test'],
        });

        if (!relationshipId) {
          throw new Error('Failed to create relationship');
        }

        // Get relationships
        const relationships = await runtime.getRelationships({
          entityId: entity1Id,
        });

        if (relationships.length === 0) {
          throw new Error('No relationships found');
        }

        const rel = relationships[0];
        if (!rel.tags.includes('friend')) {
          throw new Error('Relationship tags not correct');
        }

        console.log('✅ Successfully created and retrieved relationships');
      },
    },

    {
      name: 'Should handle memory operations with proper tables',
      fn: async (runtime: any) => {
        const entityId = stringToUuid('memory-entity-' + Date.now());
        const roomId = stringToUuid('memory-room-' + Date.now());
        
        // Create prerequisites
        await runtime.db.createEntities([{
          id: entityId,
          names: ['Memory Test Entity'],
          agentId: runtime.agentId,
        }]);

        await runtime.createRoom({
          id: roomId,
          name: 'Memory Test Room',
          source: 'test',
          type: 'GROUP',
          agentId: runtime.agentId,
        });

        // Create memory
        const memoryId = await runtime.createMemory({
          entityId: entityId,
          agentId: runtime.agentId,
          roomId: roomId,
          content: {
            text: 'Test memory content',
            type: 'test',
          },
        });

        if (!memoryId) {
          throw new Error('Failed to create memory');
        }

        // Retrieve memory
        const memory = await runtime.getMemoryById(memoryId);
        if (!memory) {
          throw new Error('Failed to retrieve memory');
        }

        if (memory.content.text !== 'Test memory content') {
          throw new Error('Memory content does not match');
        }

        console.log('✅ Successfully created and retrieved memory');
      },
    },

    {
      name: 'Should create and manage components',
      fn: async (runtime: any) => {
        const entityId = stringToUuid('component-entity-' + Date.now());
        const roomId = stringToUuid('component-room-' + Date.now());
        const worldId = stringToUuid('component-world-' + Date.now());
        
        // Create prerequisites
        await runtime.db.createEntities([{
          id: entityId,
          names: ['Component Test Entity'],
          agentId: runtime.agentId,
        }]);

        await runtime.createWorld({
          id: worldId,
          name: 'Component Test World',
          agentId: runtime.agentId,
          serverId: 'test-server',
        });

        await runtime.createRoom({
          id: roomId,
          name: 'Component Test Room',
          source: 'test',
          type: 'GROUP',
          agentId: runtime.agentId,
          worldId: worldId,
        });

        // Create component
        const componentId = stringToUuid('test-component-' + Date.now());
        await runtime.createComponent({
          id: componentId,
          entityId: entityId,
          agentId: runtime.agentId,
          roomId: roomId,
          worldId: worldId,
          sourceEntityId: runtime.agentId,
          type: 'test-component',
          data: { test: 'data' },
        });

        // Get components
        const components = await runtime.getComponents(entityId);
        if (components.length === 0) {
          throw new Error('No components found');
        }

        const component = components[0];
        if (component.type !== 'test-component') {
          throw new Error('Component type does not match');
        }

        console.log('✅ Successfully created and retrieved components');
      },
    },

    {
      name: 'Should handle participant operations',
      fn: async (runtime: any) => {
        const entityId = stringToUuid('participant-entity-' + Date.now());
        const roomId = stringToUuid('participant-room-' + Date.now());
        
        // Create prerequisites
        await runtime.db.createEntities([{
          id: entityId,
          names: ['Participant Test Entity'],
          agentId: runtime.agentId,
        }]);

        await runtime.createRoom({
          id: roomId,
          name: 'Participant Test Room',
          source: 'test',
          type: 'GROUP',
          agentId: runtime.agentId,
        });

        // Add participant
        await runtime.addParticipant(entityId, roomId);

        // Get participants
        const participants = await runtime.getParticipantsForRoom(roomId);
        const hasParticipant = participants.some(p => p === entityId);
        
        if (!hasParticipant) {
          throw new Error('Participant not found in room');
        }

        // Remove participant
        await runtime.removeParticipant(entityId, roomId);

        // Verify removal
        const afterRemoval = await runtime.getParticipantsForRoom(roomId);
        const stillHasParticipant = afterRemoval.some(p => p === entityId);
        
        if (stillHasParticipant) {
          throw new Error('Participant was not removed');
        }

        console.log('✅ Successfully managed participants');
      },
    },

    {
      name: 'Should handle concurrent operations',
      fn: async (runtime: any) => {
        // Test concurrent entity creation
        const promises: Promise<any>[] = [];
        for (let i = 0; i < 5; i++) {
          const entityId = stringToUuid(`concurrent-entity-${i}-${Date.now()}`);
          promises.push(
            runtime.db.createEntities([{
              id: entityId,
              names: [`Concurrent Entity ${i}`],
              agentId: runtime.agentId,
            }])
          );
        }

        await Promise.all(promises);

        // Verify all entities were created
        const entities = await runtime.getEntitiesForAgent(runtime.agentId);
        const concurrentEntities = entities.filter(e => 
          e.names.some(n => n.startsWith('Concurrent Entity'))
        );

        if (concurrentEntities.length < 5) {
          throw new Error(`Expected at least 5 concurrent entities, found ${concurrentEntities.length}`);
        }

        console.log('✅ Successfully handled concurrent operations');
      },
    },
  ];
}

export default new SqlPluginTestSuite();