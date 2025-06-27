import { describe, it, expect, beforeEach, afterEach } from 'bun:test';
import { v4 as uuidv4 } from 'uuid';
import { ChannelType, type UUID, type Memory } from '@elizaos/core';
import { sql } from 'drizzle-orm';
import { PgAdapter } from '../pg/adapter';
import { PgManager } from '../pg/manager';
import { setDatabaseType } from '../schema/factory';

// Set database type for PostgreSQL
setDatabaseType('postgres');

describe('Debug Memory Operations', () => {
  let adapter: PgAdapter;
  let manager: PgManager;
  let agentId: UUID;
  let roomId: UUID;
  let entityId: UUID;

  beforeEach(async () => {
    // Skip test if no PostgreSQL URL is provided
    if (!process.env.POSTGRES_URL && !process.env.TEST_POSTGRES_URL) {
      console.log('Skipping PostgreSQL test - no database URL provided');
      return;
    }

    const postgresUrl =
      process.env.TEST_POSTGRES_URL ||
      process.env.POSTGRES_URL ||
      'postgresql://postgres:postgres@localhost:5432/eliza_test';

    // Create unique test identifiers
    agentId = uuidv4() as UUID;
    roomId = uuidv4() as UUID;
    entityId = uuidv4() as UUID;

    manager = new PgManager({
      connectionString: postgresUrl,
      ssl: false,
    });

    await manager.connect();
    adapter = new PgAdapter(agentId, manager);
    await adapter.init();
  });

  afterEach(async () => {
    if (adapter) {
      // Clean up test data
      try {
        await adapter.query('DELETE FROM memories WHERE agent_id = $1', [agentId]);
      } catch (error) {
        console.warn('Error cleaning up test data:', error);
      }
      await adapter.close();
    }
    if (manager) {
      await manager.close();
    }
  });

  it('should create memory with embedding', async () => {
    if (!adapter) {
      console.log('Test skipped - no adapter initialized');
      return;
    }

    const memoryId = uuidv4() as UUID;
    const embedding = Array.from({ length: 1536 }, () => Math.random());

    const memory: Memory = {
      id: memoryId,
      entityId,
      agentId,
      roomId,
      content: { text: 'Memory with embedding', type: 'test' },
      embedding,
      unique: false,
      createdAt: Date.now(),
    };

    // Create memory
    const createdId = await adapter.createMemory(memory, 'memories');
    expect(createdId).toBe(memoryId);

    // Retrieve and verify
    const retrieved = await adapter.getMemoryById(memoryId);
    expect(retrieved).toBeDefined();
    expect(retrieved?.id).toBe(memoryId);
    expect(retrieved?.content.text).toBe('Memory with embedding');
  });

  it('should perform vector similarity search', async () => {
    if (!adapter) {
      console.log('Test skipped - no adapter initialized');
      return;
    }

    // Create base embedding
    const baseEmbedding = Array.from({ length: 384 }, (_, i) => Math.sin(i * 0.1));

    // Create similar embedding (slight variation)
    const similarEmbedding = baseEmbedding.map((val) => val + (Math.random() - 0.5) * 0.1);

    // Create very different embedding
    const differentEmbedding = Array.from({ length: 384 }, () => Math.random() * 2 - 1);

    // Create memories
    const memory1: Memory = {
      id: uuidv4() as UUID,
      entityId,
      agentId,
      roomId,
      content: { text: 'Similar memory 1', type: 'test' },
      embedding: baseEmbedding,
      unique: false,
      createdAt: Date.now(),
    };

    const memory2: Memory = {
      id: uuidv4() as UUID,
      entityId,
      agentId,
      roomId,
      content: { text: 'Similar memory 2', type: 'test' },
      embedding: similarEmbedding,
      unique: false,
      createdAt: Date.now() + 1,
    };

    const memory3: Memory = {
      id: uuidv4() as UUID,
      entityId,
      agentId,
      roomId,
      content: { text: 'Different memory', type: 'test' },
      embedding: differentEmbedding,
      unique: false,
      createdAt: Date.now() + 2,
    };

    // Create all memories
    await adapter.createMemory(memory1, 'memories');
    await adapter.createMemory(memory2, 'memories');
    await adapter.createMemory(memory3, 'memories');

    // Wait for pgvector to be ready
    await new Promise((resolve) => setTimeout(resolve, 100));

    // Search for similar memories
    const searchResults = await adapter.searchMemoriesByEmbedding(baseEmbedding, {
      roomId,
      match_threshold: 0.5,
      count: 10,
      tableName: 'memories',
    });

    expect(searchResults.length).toBeGreaterThan(0);

    // The first result should be the exact match or very similar
    const firstResult = searchResults[0];
    expect(firstResult.content.text).toContain('Similar');
  });

  it('should handle unique memory constraints', async () => {
    if (!adapter) {
      console.log('Test skipped - no adapter initialized');
      return;
    }

    const memoryId1 = uuidv4() as UUID;
    const memoryId2 = uuidv4() as UUID;

    const uniqueMemory1: Memory = {
      id: memoryId1,
      entityId,
      agentId,
      roomId,
      content: { text: 'Unique memory 1', type: 'unique' },
      embedding: undefined,
      unique: true,
      createdAt: Date.now(),
    };

    const uniqueMemory2: Memory = {
      id: memoryId2,
      entityId,
      agentId,
      roomId,
      content: { text: 'Unique memory 2', type: 'unique' },
      embedding: undefined,
      unique: true,
      createdAt: Date.now() + 1,
    };

    // Create both memories
    await adapter.createMemory(uniqueMemory1, 'memories');
    await adapter.createMemory(uniqueMemory2, 'memories');

    // Get memories with unique filter
    const uniqueMemories = await adapter.getMemories({
      roomId,
      count: 10,
      unique: true,
      tableName: 'memories',
    });

    expect(uniqueMemories.length).toBe(2);
    expect(uniqueMemories.every((m) => m.unique)).toBe(true);
  });
});
