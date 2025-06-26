import { describe, it, expect, beforeEach, afterEach } from 'bun:test';
import { PgAdapter } from '../pg/adapter';
import { PgManager } from '../pg/manager';
import { v4 as uuidv4 } from 'uuid';
import { ChannelType, type UUID } from '@elizaos/core';
import { setDatabaseType } from '../schema/factory';
import { eq } from 'drizzle-orm';
import { sql } from 'drizzle-orm';

// Set database type BEFORE importing schema to ensure proper lazy loading
setDatabaseType('postgres');

// Import schema and specific tables AFTER setting database type
import * as schema from '../schema';
import { memoryTable } from '../schema/memory';

describe('Debug Memory Simple Operations', () => {
  let adapter: PgAdapter;
  let manager: PgManager;
  let testAgentId: UUID;

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

    testAgentId = uuidv4() as UUID;

    manager = new PgManager({
      connectionString: postgresUrl,
      ssl: false,
    });

    await manager.connect();
    adapter = new PgAdapter(testAgentId, manager);
    await adapter.init();
  });

  afterEach(async () => {
    if (adapter) {
      await adapter.close();
    }
    if (manager) {
      await manager.close();
    }
  });

  it('should create and retrieve a simple memory', async () => {
    if (!adapter) {
      console.log('Test skipped - no adapter initialized');
      return;
    }

    const memoryId = uuidv4() as UUID;
    const entityId = uuidv4() as UUID;
    const roomId = uuidv4() as UUID;

    const memory = {
      id: memoryId,
      entityId,
      agentId: testAgentId,
      roomId,
      content: { text: 'Test memory content', type: 'test' },
      embedding: null,
      unique: false,
      createdAt: Date.now(),
    };

    // Create memory
    const createdId = await adapter.createMemory(memory, 'memories');
    expect(createdId).toBe(memoryId);

    // Retrieve memory
    const retrieved = await adapter.getMemoryById(memoryId);
    expect(retrieved).toBeDefined();
    expect(retrieved?.id).toBe(memoryId);
    expect(retrieved?.content.text).toBe('Test memory content');
  });

  it('should get memories by room', async () => {
    if (!adapter) {
      console.log('Test skipped - no adapter initialized');
      return;
    }

    const roomId = uuidv4() as UUID;
    const entityId = uuidv4() as UUID;

    // Create multiple memories for the room
    const memories = [];
    for (let i = 0; i < 3; i++) {
      const memory = {
        id: uuidv4() as UUID,
        entityId,
        agentId: testAgentId,
        roomId,
        content: { text: `Memory ${i}`, type: 'test' },
        embedding: null,
        unique: false,
        createdAt: Date.now() + i,
      };
      memories.push(memory);
      await adapter.createMemory(memory, 'memories');
    }

    // Get memories for the room
    const retrieved = await adapter.getMemories({ roomId, count: 10 });
    expect(retrieved.length).toBe(3);

    // Should be ordered by creation time descending
    expect(retrieved[0].content.text).toBe('Memory 2');
    expect(retrieved[1].content.text).toBe('Memory 1');
    expect(retrieved[2].content.text).toBe('Memory 0');
  });

  it('should count memories correctly', async () => {
    if (!adapter) {
      console.log('Test skipped - no adapter initialized');
      return;
    }

    const roomId = uuidv4() as UUID;
    const entityId = uuidv4() as UUID;

    // Initially should be 0
    const initialCount = await adapter.countMemories(roomId);
    expect(initialCount).toBe(0);

    // Create some memories
    for (let i = 0; i < 5; i++) {
      const memory = {
        id: uuidv4() as UUID,
        entityId,
        agentId: testAgentId,
        roomId,
        content: { text: `Memory ${i}`, type: 'test' },
        embedding: null,
        unique: false,
        createdAt: Date.now() + i,
      };
      await adapter.createMemory(memory, 'memories');
    }

    // Count should now be 5
    const finalCount = await adapter.countMemories(roomId);
    expect(finalCount).toBe(5);
  });
});
