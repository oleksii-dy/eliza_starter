import { describe, it, expect, beforeEach, afterEach } from 'bun:test';
import { v4 as uuidv4 } from 'uuid';
import { ChannelType, type UUID, type Memory } from '@elizaos/core';
import { sql } from 'drizzle-orm';
import { createIsolatedTestDatabase } from './test-helpers';
import { connectionRegistry } from '../connection-registry';
import type { PgliteDatabaseAdapter } from '../pglite/adapter';

describe('Debug Memory Operations', () => {
  let adapter: PgliteDatabaseAdapter;
  let agentId: UUID;
  let roomId: UUID;
  let entityId: UUID;
  let cleanup: () => Promise<void>;

  beforeEach(async () => {
    // Create unique test instance
    const testId = `memory-test-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    const setup = await createIsolatedTestDatabase(testId);

    adapter = setup.adapter as PgliteDatabaseAdapter;
    agentId = setup.testAgentId;
    cleanup = setup.cleanup;

    // Create test entities
    roomId = uuidv4() as UUID;
    entityId = uuidv4() as UUID;

    // The adapter's init() method should have already been called by createIsolatedTestDatabase

    // Create room
    await adapter.createRooms([
      {
        id: roomId,
        agentId,
        source: 'test',
        type: 'GROUP' as typeof ChannelType.GROUP,
        name: 'Test Room',
        channelId: uuidv4() as UUID,
      },
    ]);

    // Create entity
    await adapter.createEntities([
      {
        id: entityId,
        agentId,
        names: ['Test Entity'],
      },
    ]);
  });

  afterEach(async () => {
    try {
      if (cleanup) {
        await cleanup();
      }
    } catch (error) {
      console.error('Cleanup error:', error);
    }
    // Force clear all connections to prevent interference
    connectionRegistry.clearAll();
  });

  it('should check embeddings table columns', async () => {
    // Check what columns the embeddings table actually has
    const result = await (adapter as any).db.execute(sql`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'embeddings'
      ORDER BY column_name
    `);

    console.log('Embeddings table columns:', result.rows);
    expect(result.rows).toBeDefined();
  });

  it('should create memory without embedding', async () => {
    const memory: Memory = {
      id: uuidv4() as UUID,
      agentId,
      entityId,
      roomId,
      content: { text: 'Test memory without embedding' },
      metadata: {
        type: 'custom',
      },
      createdAt: Date.now(),
    };

    const memoryId = await adapter.createMemory(memory, 'memories');
    expect(memoryId).toBeDefined();

    const retrieved = await adapter.getMemoryById(memoryId);
    expect(retrieved).toBeDefined();
    expect(retrieved?.content).toEqual({ text: 'Test memory without embedding' });
  });

  it('should create memory with embedding', async () => {
    const embedding = Array(384).fill(0.1);
    const memory: Memory = {
      id: uuidv4() as UUID,
      agentId,
      entityId,
      roomId,
      content: { text: 'Test memory with embedding' },
      metadata: {
        type: 'custom',
      },
      embedding,
      createdAt: Date.now(),
    };

    console.log('Creating memory with embedding...');
    const memoryId = await adapter.createMemory(memory, 'memories');
    console.log('Memory created:', memoryId);

    expect(memoryId).toBeDefined();
  });

  it('should handle searchMemories without error', async () => {
    // First create a memory with embedding
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

    // Now try to search
    console.log('Searching memories...');
    const results = await adapter.searchMemories({
      tableName: 'memories',
      embedding,
      count: 10,
    });

    console.log('Search results:', results.length);
    // PGLite doesn't support vector similarity search, so it returns empty results
    expect(results).toHaveLength(0);
    expect(results).toEqual([]);
  });
});
