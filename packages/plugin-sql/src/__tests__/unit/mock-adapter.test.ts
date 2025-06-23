import { describe, expect, it, beforeEach } from 'bun:test';
import { v4 as uuidv4 } from 'uuid';
import type { UUID, Entity, Memory, Relationship } from '@elizaos/core';
import { MockDatabaseAdapter } from '../mock-adapter';

describe('MockDatabaseAdapter', () => {
  let adapter: MockDatabaseAdapter;
  const agentId = uuidv4() as UUID;

  beforeEach(async () => {
    adapter = new MockDatabaseAdapter(agentId);
    await adapter.init();
  });

  describe('Entity Operations', () => {
    it('should create and retrieve an entity', async () => {
      const entity: Entity = {
        id: uuidv4() as UUID,
        names: ['Test Entity'],
        agentId,
      };

      const created = await adapter.createEntity(entity);
      expect(created).toBe(true);

      const retrieved = await adapter.getEntityById(entity.id!);
      expect(retrieved).toBeDefined();
      expect(retrieved!.names).toEqual(['Test Entity']);
    });

    it('should update an entity', async () => {
      const entity: Entity = {
        id: uuidv4() as UUID,
        names: ['Original Name'],
        agentId,
      };

      await adapter.createEntity(entity);

      const updatedEntity = {
        ...entity,
        names: ['Updated Name'],
      };

      await adapter.updateEntity(updatedEntity);

      const retrieved = await adapter.getEntityById(entity.id!);
      expect(retrieved!.names).toEqual(['Updated Name']);
    });

    it('should search entities by name', async () => {
      const entity1: Entity = {
        id: uuidv4() as UUID,
        names: ['John Doe'],
        agentId,
      };

      const entity2: Entity = {
        id: uuidv4() as UUID,
        names: ['Jane Smith'],
        agentId,
      };

      await adapter.createEntity(entity1);
      await adapter.createEntity(entity2);

      const results = await adapter.searchEntitiesByName('john');
      expect(results).toHaveLength(1);
      expect(results[0].names).toEqual(['John Doe']);
    });
  });

  describe('Memory Operations', () => {
    it('should create and retrieve memories', async () => {
      const roomId = uuidv4() as UUID;
      const memory: Memory = {
        entityId: agentId,
        roomId,
        content: {
          text: 'Test memory content',
        },
        createdAt: Date.now(),
      };

      const memoryId = await adapter.createMemory(memory);
      expect(memoryId).toBeDefined();

      const retrieved = await adapter.getMemory(memoryId);
      expect(retrieved).toBeDefined();
      expect(retrieved!.content.text).toBe('Test memory content');
    });

    it('should get memories by room', async () => {
      const roomId = uuidv4() as UUID;
      const memory1: Memory = {
        entityId: agentId,
        roomId,
        content: { text: 'Memory 1' },
        createdAt: Date.now(),
      };

      const memory2: Memory = {
        entityId: agentId,
        roomId,
        content: { text: 'Memory 2' },
        createdAt: Date.now(),
      };

      await adapter.createMemory(memory1);
      await adapter.createMemory(memory2);

      const memories = await adapter.getMemories({ roomId, count: 10 });
      expect(memories).toHaveLength(2);
    });

    it('should count memories correctly', async () => {
      const roomId = uuidv4() as UUID;

      for (let i = 0; i < 5; i++) {
        await adapter.createMemory({
          entityId: agentId,
          roomId,
          content: { text: `Memory ${i}` },
          createdAt: Date.now(),
        });
      }

      const count = await adapter.countMemories(roomId);
      expect(count).toBe(5);
    });
  });

  describe('Relationship Operations', () => {
    it('should create and retrieve relationships', async () => {
      const entity1Id = uuidv4() as UUID;
      const entity2Id = uuidv4() as UUID;

      const relationship: Relationship = {
        sourceEntityId: entity1Id,
        targetEntityId: entity2Id,
        tags: ['friend'],
        agentId,
        metadata: {},
      };

      const created = await adapter.createRelationship(relationship);
      expect(created).toBe(true);

      const retrieved = await adapter.getRelationship({
        sourceEntityId: entity1Id,
        targetEntityId: entity2Id,
      });

      expect(retrieved).toBeDefined();
      expect(retrieved!.tags).toEqual(['friend']);
    });

    it('should get relationships by entity and tags', async () => {
      const entity1Id = uuidv4() as UUID;
      const entity2Id = uuidv4() as UUID;
      const entity3Id = uuidv4() as UUID;

      await adapter.createRelationship({
        sourceEntityId: entity1Id,
        targetEntityId: entity2Id,
        tags: ['friend'],
        agentId,
        metadata: {},
      });

      await adapter.createRelationship({
        sourceEntityId: entity1Id,
        targetEntityId: entity3Id,
        tags: ['colleague'],
        agentId,
        metadata: {},
      });

      const friendRelations = await adapter.getRelationships({
        entityId: entity1Id,
        tags: ['friend'],
      });

      expect(friendRelations).toHaveLength(1);
      expect(friendRelations[0].targetEntityId).toBe(entity2Id);
    });
  });

  describe('Room Operations', () => {
    it('should create and manage rooms', async () => {
      const roomId = await adapter.createRoom({
        name: 'Test Room',
        source: 'test',
        type: 'GROUP' as any,
        agentId,
      });

      expect(roomId).toBeDefined();

      const room = await adapter.getRoom(roomId);
      expect(room).toBeDefined();
      expect(room!.name).toBe('Test Room');
    });

    it('should manage participants', async () => {
      const roomId = uuidv4() as UUID;
      const entityId = uuidv4() as UUID;

      await adapter.createRoom({
        id: roomId,
        name: 'Test Room',
        source: 'test',
        type: 'GROUP' as any,
        agentId,
      });

      const added = await adapter.addParticipant(entityId, roomId);
      expect(added).toBe(true);

      const participants = await adapter.getParticipantsForRoom(roomId);
      expect(participants).toContain(entityId);

      const removed = await adapter.removeParticipant(entityId, roomId);
      expect(removed).toBe(true);

      const participantsAfter = await adapter.getParticipantsForRoom(roomId);
      expect(participantsAfter).not.toContain(entityId);
    });
  });

  describe('Cache Operations', () => {
    it('should store and retrieve cache values', async () => {
      const key = 'test-key';
      const value = { data: 'test data' };

      const stored = await adapter.setCache(key, value);
      expect(stored).toBe(true);

      const retrieved = await adapter.getCache(key);
      expect(retrieved).toEqual(value);
    });

    it('should delete cache values', async () => {
      const key = 'test-key';
      const value = 'test value';

      await adapter.setCache(key, value);
      const deleted = await adapter.deleteCache(key);
      expect(deleted).toBe(true);

      const retrieved = await adapter.getCache(key);
      expect(retrieved).toBeNull();
    });
  });

  describe('Task Operations', () => {
    it('should create and manage tasks', async () => {
      const roomId = uuidv4() as UUID;
      const taskId = await adapter.createTask({
        name: 'test-task',
        description: 'Test task',
        roomId,
        tags: ['test'],
      });

      expect(taskId).toBeDefined();

      const task = await adapter.getTask(taskId);
      expect(task).toBeDefined();
      expect(task!.name).toBe('test-task');

      // Update task
      await adapter.updateTask(taskId, {
        description: 'Updated description',
      });

      const updatedTask = await adapter.getTask(taskId);
      expect(updatedTask!.description).toBe('Updated description');

      // Delete task
      const deleted = await adapter.deleteTask(taskId);
      expect(deleted).toBe(true);

      const deletedTask = await adapter.getTask(taskId);
      expect(deletedTask).toBeNull();
    });
  });

  describe('Adapter State', () => {
    it('should be ready after initialization', async () => {
      const isReady = await adapter.isReady();
      expect(isReady).toBe(true);
    });

    it('should clean up properly on close', async () => {
      const entity: Entity = {
        id: uuidv4() as UUID,
        names: ['Test'],
        agentId,
      };

      await adapter.createEntity(entity);
      
      // Verify entity exists
      let retrieved = await adapter.getEntityById(entity.id!);
      expect(retrieved).toBeDefined();

      // Close adapter
      await adapter.close();

      // Verify data is cleared
      retrieved = await adapter.getEntityById(entity.id!);
      expect(retrieved).toBeNull();
    });
  });
});