import {
  ChannelType,
  type Agent,
  type Component,
  type Entity,
  type Memory,
  type UUID,
} from '@elizaos/core';
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { v4 as uuidv4 } from 'uuid';
import { PgAdapter } from '../../pg/adapter';
import { PgManager } from '../../pg/manager';

// Use PostgreSQL for testing
describe('PostgreSQL E2E Tests', () => {
  const createTestAdapter = async () => {
    // Skip test if no PostgreSQL URL is provided
    if (!process.env.POSTGRES_URL && !process.env.TEST_POSTGRES_URL) {
      throw new Error(
        'PostgreSQL connection required for tests. Please set POSTGRES_URL or TEST_POSTGRES_URL environment variable.'
      );
    }

    // Generate a unique agent ID for this test to ensure proper isolation
    const agentId = uuidv4() as UUID;

    const postgresUrl = process.env.TEST_POSTGRES_URL || process.env.POSTGRES_URL!;
    const manager = new PgManager({ connectionString: postgresUrl, ssl: false });
    await manager.connect();
    const adapter = new PgAdapter(agentId, manager);
    await adapter.init();

    return { adapter, agentId, manager };
  };

  describe('Connection Management', () => {
    it('should test connection successfully', async () => {
      const { adapter, manager } = await createTestAdapter();

      const isReady = await adapter.isReady();
      expect(isReady).toBe(true);

      await adapter.close();
      await manager.close();
    });

    it('should get connection', async () => {
      const { adapter, manager } = await createTestAdapter();

      const connection = await adapter.getConnection();
      expect(connection).toBeDefined();

      await adapter.close();
      await manager.close();
    });
  });

  describe('Agent Operations', () => {
    it('should create and retrieve an agent', async () => {
      const { adapter, agentId, manager } = await createTestAdapter();

      const agent: Agent = {
        id: agentId,
        name: `Test Agent ${Date.now()}`,
        username: `test_agent_${Date.now()}`,
        bio: 'A test agent for e2e tests',
        enabled: true,
        settings: {
          apiKey: 'test-key',
          model: 'gpt-4',
        },
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };

      const created = await adapter.createAgent(agent);
      expect(created).toBe(true);

      const retrieved = await adapter.getAgent(agentId);
      expect(retrieved).toBeDefined();
      expect(retrieved?.name).toBe(agent.name);
      expect(retrieved?.settings).toEqual(agent.settings || {});

      await adapter.close();
      await manager.close();
    });

    it('should update an agent', async () => {
      const { adapter, agentId, manager } = await createTestAdapter();

      const agent: Agent = {
        id: agentId,
        name: `Original Name ${Date.now()}`,
        username: `original_agent_${Date.now()}`,
        bio: 'Original bio',
        enabled: true,
        settings: {},
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };

      await adapter.createAgent(agent);

      const updated = await adapter.updateAgent(agentId, {
        name: `Updated Name ${Date.now()}`,
        settings: { newSetting: 'value' },
      });

      expect(updated).toBe(true);

      const retrieved = await adapter.getAgent(agentId);
      expect(retrieved?.name).toMatch(/^Updated Name/);
      expect(retrieved?.settings?.newSetting).toBe('value');

      await adapter.close();
      await manager.close();
    });

    it('should delete an agent', async () => {
      const { adapter, agentId, manager } = await createTestAdapter();

      const agent: Agent = {
        id: agentId,
        name: `To Delete ${Date.now()}`,
        username: `delete_agent_${Date.now()}`,
        bio: 'Agent to be deleted',
        enabled: true,
        settings: {},
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };

      await adapter.createAgent(agent);
      const deleted = await adapter.deleteAgent(agentId);
      expect(deleted).toBe(true);

      const retrieved = await adapter.getAgent(agentId);
      expect(retrieved).toBeNull();

      await adapter.close();
      await manager.close();
    });
  });

  describe('Entity Operations', () => {
    it('should create and retrieve entities', async () => {
      const { adapter, agentId, manager } = await createTestAdapter();

      // Create agent first
      await adapter.createAgent({
        id: agentId,
        name: 'Test Agent',
        username: 'test_agent',
        bio: 'Test agent for e2e tests',
        enabled: true,
        settings: {},
        createdAt: Date.now(),
        updatedAt: Date.now(),
      } as Agent);

      const entities: Entity[] = [
        {
          id: uuidv4() as UUID,
          agentId,
          names: ['Entity One'],
        },
        {
          id: uuidv4() as UUID,
          agentId,
          names: ['Entity Two'],
          metadata: { custom: 'data' },
        },
      ];

      const created = await adapter.createEntities(entities);
      expect(created).toBe(true);

      const entityIds = entities.map((e) => e.id).filter((id): id is UUID => id !== undefined);
      const retrieved = await adapter.getEntitiesByIds(entityIds);
      expect(retrieved).toHaveLength(2);

      // Sort by name to ensure consistent order
      const sortedRetrieved = retrieved?.sort((a, b) => a.names[0].localeCompare(b.names[0]));
      expect(sortedRetrieved?.[0].names).toContain('Entity One');
      expect(sortedRetrieved?.[1].metadata).toEqual({ custom: 'data' });

      await adapter.close();
      await manager.close();
    });

    it('should update an entity', async () => {
      const { adapter, agentId, manager } = await createTestAdapter();

      // Create agent first
      await adapter.createAgent({
        id: agentId,
        name: 'Test Agent',
        username: 'test_agent',
        bio: 'Test agent for e2e tests',
        enabled: true,
        settings: {},
        createdAt: Date.now(),
        updatedAt: Date.now(),
      } as Agent);

      const entity: Entity = {
        id: uuidv4() as UUID,
        agentId,
        names: ['Original'],
      };

      await adapter.createEntities([entity]);

      await adapter.updateEntity({
        ...entity,
        names: ['Updated'],
        metadata: { updated: true },
      });

      const retrieved = await adapter.getEntitiesByIds([entity.id!]);
      expect(retrieved?.[0].names).toContain('Updated');
      expect(retrieved?.[0].metadata).toEqual({ updated: true });

      await adapter.close();
      await manager.close();
    });
  });

  describe('Memory Operations', () => {
    let adapter: PgAdapter;
    let agentId: UUID;
    let roomId: UUID;
    let entityId: UUID;
    let manager: PgManager;

    beforeEach(async () => {
      const result = await createTestAdapter();
      adapter = result.adapter;
      agentId = result.agentId;
      manager = result.manager;

      // Create agent first
      await adapter.createAgent({
        id: agentId,
        name: 'Test Agent',
        username: 'test_agent',
        bio: 'Test agent for e2e tests',
        enabled: true,
        settings: {},
        createdAt: Date.now(),
        updatedAt: Date.now(),
      } as Agent);

      roomId = uuidv4() as UUID;
      entityId = uuidv4() as UUID;

      // Create room first
      await adapter.createRooms([
        {
          id: roomId,
          agentId,
          source: 'test',
          type: ChannelType.GROUP,
          name: 'Test Room',
        },
      ]);

      // Create required entity
      await adapter.createEntities([
        {
          id: entityId,
          agentId,
          names: ['Test Entity'],
        },
      ]);
    });

    afterEach(async () => {
      await adapter.close();
      await manager.close();
    });

    it('should create and retrieve memories', async () => {
      const memory: Memory = {
        id: uuidv4() as UUID,
        agentId,
        entityId,
        roomId,
        content: { text: 'Test memory content' },
        metadata: {
          type: 'custom',
        },
        createdAt: Date.now(),
      };

      const memoryId = await adapter.createMemory(memory, 'memories');
      expect(memoryId).toBeDefined();

      const retrieved = await adapter.getMemoryById(memoryId);
      expect(retrieved).toBeDefined();
      expect(retrieved?.content).toEqual({ text: 'Test memory content' });
    });

    it('should search memories by embedding', async () => {
      const embedding = Array(384).fill(0.1);
      const memory: Memory = {
        id: uuidv4() as UUID,
        agentId,
        entityId,
        roomId,
        content: { text: 'Searchable memory' },
        metadata: {
          type: 'custom',
        },
        embedding,
        createdAt: Date.now(),
      };

      await adapter.createMemory(memory, 'memories');

      const results = await adapter.searchMemories({
        tableName: 'memories',
        embedding,
        count: 10,
      });

      expect(results).toHaveLength(1);
      expect(results[0].content).toEqual({ text: 'Searchable memory' });
    });

    it('should update memory content', async () => {
      const memory: Memory = {
        id: uuidv4() as UUID,
        agentId,
        entityId,
        roomId,
        content: { text: 'Original content' },
        metadata: {
          type: 'custom',
        },
        createdAt: Date.now(),
      };

      const memoryId = await adapter.createMemory(memory, 'memories');

      const updated = await adapter.updateMemory({
        id: memoryId,
        content: { text: 'Updated content' },
        metadata: { type: 'custom', edited: true },
      });

      expect(updated).toBe(true);

      const retrieved = await adapter.getMemoryById(memoryId);
      expect(retrieved?.content).toEqual({ text: 'Updated content' });
      expect(retrieved?.metadata).toMatchObject({ type: 'custom', edited: true });
    });

    it('should delete memories', async () => {
      const memory: Memory = {
        id: uuidv4() as UUID,
        agentId,
        entityId,
        roomId,
        content: { text: 'To be deleted' },
        metadata: {
          type: 'custom',
        },
        createdAt: Date.now(),
      };

      const memoryId = await adapter.createMemory(memory, 'memories');
      await adapter.deleteMemory(memoryId);

      const retrieved = await adapter.getMemoryById(memoryId);
      expect(retrieved).toBeNull();
    });
  });

  describe('Component Operations', () => {
    let adapter: PgAdapter;
    let agentId: UUID;
    let entityId: UUID;
    let roomId: UUID;
    let worldId: UUID;
    let sourceEntityId: UUID;
    let manager: PgManager;

    beforeEach(async () => {
      const result = await createTestAdapter();
      adapter = result.adapter;
      agentId = result.agentId;
      manager = result.manager;

      // Create agent first
      await adapter.createAgent({
        id: agentId,
        name: 'Test Agent',
        username: 'test_agent',
        bio: 'Test agent for e2e tests',
        enabled: true,
        settings: {},
        createdAt: Date.now(),
        updatedAt: Date.now(),
      } as Agent);

      entityId = uuidv4() as UUID;
      roomId = uuidv4() as UUID;
      worldId = uuidv4() as UUID;
      sourceEntityId = uuidv4() as UUID;

      await adapter.createWorld({
        id: worldId,
        agentId,
        serverId: uuidv4() as UUID,
        name: 'Test World',
      });

      // Create room
      await adapter.createRooms([
        {
          id: roomId,
          agentId,
          source: 'test',
          type: ChannelType.GROUP,
          name: 'Test Room',
        },
      ]);

      await adapter.createEntities([
        {
          id: entityId,
          agentId,
          names: ['Component Test Entity'],
        },
        {
          id: sourceEntityId,
          agentId,
          names: ['Source Test Entity'],
        },
      ]);
    });

    afterEach(async () => {
      await adapter.close();
      await manager.close();
    });

    it('should create and retrieve components', async () => {
      const component: Component = {
        id: uuidv4() as UUID,
        entityId,
        agentId,
        roomId,
        worldId,
        sourceEntityId,
        type: 'test-component',
        data: { value: 'test data' },
        createdAt: Date.now(),
      };

      const created = await adapter.createComponent(component);
      expect(created).toBe(true);

      const retrieved = await adapter.getComponent(
        entityId,
        'test-component',
        worldId,
        sourceEntityId
      );
      expect(retrieved).toBeDefined();
      expect(retrieved?.data).toEqual({ value: 'test data' });
    });

    it('should update a component', async () => {
      const component: Component = {
        id: uuidv4() as UUID,
        entityId,
        agentId,
        roomId,
        worldId,
        sourceEntityId,
        type: 'update-test',
        data: { original: true },
        createdAt: Date.now(),
      };

      await adapter.createComponent(component);

      await adapter.updateComponent({
        ...component,
        data: { updated: true },
      });

      const retrieved = await adapter.getComponent(
        entityId,
        'update-test',
        worldId,
        sourceEntityId
      );
      expect(retrieved?.data).toEqual({ updated: true });
    });

    it('should delete a component', async () => {
      const component: Component = {
        id: uuidv4() as UUID,
        entityId,
        agentId,
        roomId,
        worldId,
        sourceEntityId,
        type: 'delete-test',
        data: {},
        createdAt: Date.now(),
      };

      await adapter.createComponent(component);
      await adapter.deleteComponent(component.id);

      const retrieved = await adapter.getComponent(
        entityId,
        'delete-test',
        worldId,
        sourceEntityId
      );
      expect(retrieved).toBeNull();
    });
  });

  describe('Transaction and Concurrency', () => {
    it('should handle concurrent operations', async () => {
      const { adapter, agentId, manager } = await createTestAdapter();

      // Create agent first
      await adapter.createAgent({
        id: agentId,
        name: 'Test Agent',
        username: 'test_agent',
        bio: 'Test agent for e2e tests',
        enabled: true,
        settings: {},
        createdAt: Date.now(),
        updatedAt: Date.now(),
      } as Agent);

      const operations = Array(5)
        .fill(null)
        .map((_, i) => {
          const entity: Entity = {
            id: uuidv4() as UUID,
            agentId,
            names: [`Concurrent Entity ${i}`],
          };
          return adapter.createEntities([entity]);
        });

      const results = await Promise.all(operations);
      expect(results.every((r) => r === true)).toBe(true);

      await adapter.close();
      await manager.close();
    });

    it('should handle large batch operations', async () => {
      const { adapter, agentId, manager } = await createTestAdapter();

      // Create agent first
      await adapter.createAgent({
        id: agentId,
        name: 'Test Agent',
        username: 'test_agent',
        bio: 'Test agent for e2e tests',
        enabled: true,
        settings: {},
        createdAt: Date.now(),
        updatedAt: Date.now(),
      } as Agent);

      const entities: Entity[] = Array(100)
        .fill(null)
        .map((_, i) => ({
          id: uuidv4() as UUID,
          agentId,
          names: [`Batch Entity ${i}`],
        }));

      const created = await adapter.createEntities(entities);
      expect(created).toBe(true);

      const entityIds = entities.map((e) => e.id).filter((id): id is UUID => id !== undefined);
      const retrieved = await adapter.getEntitiesByIds(entityIds);
      expect(retrieved).toHaveLength(100);

      await adapter.close();
      await manager.close();
    });
  });

  describe('Error Handling', () => {
    it('should handle duplicate agent creation', async () => {
      const { adapter, agentId, manager } = await createTestAdapter();

      const agent: Agent = {
        id: agentId,
        name: 'Duplicate Test',
        username: 'duplicate_test',
        bio: 'Agent for duplicate test',
        enabled: true,
        settings: {},
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };

      await adapter.createAgent(agent);
      const secondCreate = await adapter.createAgent(agent);
      expect(secondCreate).toBe(false);

      await adapter.close();
      await manager.close();
    });

    it('should handle non-existent entity retrieval', async () => {
      const { adapter, manager } = await createTestAdapter();

      const nonExistentId = uuidv4() as UUID;
      const result = await adapter.getEntitiesByIds([nonExistentId]);
      expect(result).toHaveLength(0);

      await adapter.close();
      await manager.close();
    });

    it('should handle invalid memory search', async () => {
      const { adapter, manager } = await createTestAdapter();

      const results = await adapter.searchMemories({
        tableName: 'memories',
        embedding: Array(384).fill(0),
        count: 0, // Invalid count
      });
      expect(results).toHaveLength(0);

      await adapter.close();
      await manager.close();
    });
  });
});
