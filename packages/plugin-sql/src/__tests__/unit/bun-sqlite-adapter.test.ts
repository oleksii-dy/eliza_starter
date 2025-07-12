import { describe, it, expect, beforeEach, afterEach } from 'bun:test';
import { BunSqliteAdapter } from '../../bun-sqlite/adapter';
import { v4 as uuidv4 } from 'uuid';
import {
  type UUID,
  type Memory,
  type Agent,
  type Room,
  type Entity,
  AgentStatus,
  ChannelType,
} from '@elizaos/core';

describe('BunSqliteAdapter', () => {
  let adapter: BunSqliteAdapter;
  const agentId = uuidv4() as UUID;

  describe('Initialization', () => {
    beforeEach(async () => {
      adapter = new BunSqliteAdapter(agentId, {
        inMemory: true,
        vectorDimensions: 384,
      });
    });

    afterEach(async () => {
      await adapter.close();
    });

    it('should initialize successfully', async () => {
      await adapter.init();
      const isReady = await adapter.isReady();
      expect(isReady).toBe(true);
    });

    it('should have correct agentId', () => {
      expect(adapter['agentId']).toBe(agentId);
    });
  });

  describe('Basic Operations', () => {
    beforeEach(async () => {
      adapter = new BunSqliteAdapter(agentId, {
        inMemory: true,
        vectorDimensions: 384,
      });
      await adapter.init();
    });

    afterEach(async () => {
      await adapter.close();
    });

    it('should create and retrieve a memory', async () => {
      const memoryId = uuidv4() as UUID;
      const memory: Memory = {
        id: memoryId,
        entityId: uuidv4() as UUID,
        agentId,
        roomId: uuidv4() as UUID,
        content: { text: 'Test memory content' },
        createdAt: Date.now(),
        unique: false,
        metadata: { type: 'test' },
      };

      const createdId = await adapter.createMemory(memory, 'test');
      expect(createdId).toBe(memoryId);

      const retrieved = await adapter.getMemoryById(memoryId);
      expect(retrieved).toBeTruthy();
      expect(retrieved?.id).toBe(memoryId);
      expect(retrieved?.content).toEqual(memory.content);
    });

    it('should list tables', async () => {
      const tables = await adapter['listTables']();
      expect(tables).toContain('agents');
      expect(tables).toContain('memories');
      expect(tables).toContain('rooms');
      expect(tables).toContain('entities');
    });
  });

  describe('Vector Operations', () => {
    beforeEach(async () => {
      adapter = new BunSqliteAdapter(agentId, {
        inMemory: true,
        vectorDimensions: 384,
      });
      await adapter.init();
    });

    afterEach(async () => {
      await adapter.close();
    });

    it('should store and search embeddings', async () => {
      const embedding = Array(384)
        .fill(0)
        .map(() => Math.random());
      const memoryId = uuidv4() as UUID;
      const entityId = uuidv4() as UUID;

      const memory: Memory = {
        id: memoryId,
        entityId,
        agentId,
        roomId: uuidv4() as UUID,
        content: { text: 'Test memory with embedding' },
        createdAt: Date.now(),
        unique: false,
        metadata: { type: 'test' },
        embedding,
      };

      await adapter.createMemory(memory, 'test');

      // Search for similar memories
      const results = await adapter.searchMemoriesByEmbedding(embedding, {
        entityId,
        match_threshold: 0.5,
        count: 10,
        tableName: 'test',
      });

      expect(results).toHaveLength(1);
      expect(results[0].id).toBe(memoryId);
      expect(results[0].similarity).toBeGreaterThan(0.99); // Should be very similar since it's the same vector
    });
  });

  describe('Agent Operations', () => {
    beforeEach(async () => {
      adapter = new BunSqliteAdapter(agentId, {
        inMemory: true,
        vectorDimensions: 384,
      });
      await adapter.init();
    });

    afterEach(async () => {
      await adapter.close();
    });

    it('should create and retrieve an agent', async () => {
      const agent: Agent = {
        id: agentId,
        name: 'Test Agent',
        bio: 'A test agent',
        system: 'Test system prompt',
        settings: { testSetting: true },
        enabled: true,
        status: AgentStatus.ACTIVE,
        topics: ['test', 'development'],
        knowledge: ['fact1', 'fact2'],
        messageExamples: [],
        postExamples: [],
        style: {
          all: ['friendly'],
          chat: [],
          post: [],
        },
        plugins: ['plugin1', 'plugin2'],
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };

      const created = await adapter.createAgent(agent);
      expect(created).toBe(true);

      const retrieved = await adapter.getAgent(agentId);
      expect(retrieved).toBeTruthy();
      expect(retrieved?.id).toBe(agentId);
      expect(retrieved?.name).toBe(agent.name);
      expect(retrieved?.bio).toBe(agent.bio);
      expect(retrieved?.settings).toEqual(agent.settings || {});
    });
  });

  describe('Room Operations', () => {
    beforeEach(async () => {
      adapter = new BunSqliteAdapter(agentId, {
        inMemory: true,
        vectorDimensions: 384,
      });
      await adapter.init();
    });

    afterEach(async () => {
      await adapter.close();
    });

    it('should create and retrieve a room', async () => {
      const roomId = uuidv4() as UUID;
      const room: Room = {
        id: roomId,
        name: 'Test Room',
        channelId: 'channel123',
        agentId,
        serverId: 'server123',
        type: ChannelType.DM,
        source: 'discord',
        metadata: { custom: 'data' },
      };

      const createdIds = await adapter.createRooms([room]);
      expect(createdIds).toContain(roomId);

      // Test room retrieval through getRoomsByIds
      const retrievedRooms = await adapter.getRoomsByIds([roomId]);
      expect(retrievedRooms).toBeTruthy();
      expect(retrievedRooms).toHaveLength(1);
      expect(retrievedRooms?.[0]?.id).toBe(roomId);
    });
  });

  describe('Entity Operations', () => {
    beforeEach(async () => {
      adapter = new BunSqliteAdapter(agentId, {
        inMemory: true,
        vectorDimensions: 384,
      });
      await adapter.init();
    });

    afterEach(async () => {
      await adapter.close();
    });

    it('should create and retrieve an entity', async () => {
      const entityId = uuidv4() as UUID;
      const entity: Entity = {
        id: entityId,
        agentId,
        names: ['Test Entity', 'Entity Test'],
        metadata: { type: 'test' },
        components: [],
      };

      const created = await adapter.createEntities([entity]);
      expect(created).toBe(true);

      const retrieved = await adapter.getEntitiesByIds([entityId]);
      expect(retrieved).toBeTruthy();
      expect(retrieved).toHaveLength(1);
      expect(retrieved?.[0].id).toBe(entityId);
      expect(retrieved?.[0].names).toEqual(entity.names);
    });
  });

  describe('Error Handling', () => {
    beforeEach(async () => {
      adapter = new BunSqliteAdapter(agentId, {
        inMemory: true,
        vectorDimensions: 384,
      });
      await adapter.init();
    });

    afterEach(async () => {
      await adapter.close();
    });

    it('should handle missing memory gracefully', async () => {
      const nonExistentId = uuidv4() as UUID;
      const memory = await adapter.getMemoryById(nonExistentId);
      expect(memory).toBeNull();
    });

    it('should handle missing agent gracefully', async () => {
      const nonExistentId = uuidv4() as UUID;
      const agent = await adapter.getAgent(nonExistentId);
      expect(agent).toBeNull();
    });
  });
});
