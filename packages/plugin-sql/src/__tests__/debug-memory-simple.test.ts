import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { PgliteDatabaseAdapter } from '../pglite/adapter';
import { PGliteClientManager } from '../pglite/manager';
import { v4 as uuidv4 } from 'uuid';
import { ChannelType, type UUID } from '@elizaos/core';
import { setDatabaseType } from '../schema/factory';
import { memoryTable } from '../schema/memory';
import { eq } from 'drizzle-orm';
import { sql } from 'drizzle-orm';

describe('Debug Memory Simple Operations', () => {
  let adapter: PgliteDatabaseAdapter;
  let manager: PGliteClientManager;
  let agentId: UUID;

  beforeEach(async () => {
    // Set database type before creating adapter
    setDatabaseType('pglite');

    agentId = uuidv4() as UUID;
    manager = new PGliteClientManager({ dataDir: ':memory:' });
    adapter = new PgliteDatabaseAdapter(agentId, manager);

    // Initialize the adapter which will create tables
    await adapter.init();

    // Get the database instance to verify tables exist
    const db = adapter.getDatabase();

    // Check if the memories table exists by running a simple query
    try {
      const result = await db.execute(sql`SELECT 1 FROM memories LIMIT 0`);
      console.log('Memories table exists');
    } catch (e) {
      console.error('Memories table does not exist:', e);
    }
  });

  afterEach(async () => {
    await adapter.close();
  });

  it('should access memory table without error', async () => {
    console.log('Memory table type:', typeof memoryTable);
    console.log('Memory table keys:', Object.keys(memoryTable));

    // Try to access table columns
    console.log('Accessing id column...');
    const idCol = memoryTable.id;
    console.log('ID column:', idCol);

    expect(idCol).toBeDefined();
  });

  it('should perform simple query without error', async () => {
    const db = adapter.getDatabase();

    // Insert a simple memory without using sql template literals
    const memoryId = uuidv4() as UUID;
    const memory = {
      id: memoryId,
      type: 'test',
      content: { text: 'Simple test' },
      metadata: {},
      entityId: null,
      agentId: agentId,
      roomId: null,
      worldId: null,
      unique: true,
      createdAt: new Date(),
    };

    console.log('Inserting memory...');
    await db.insert(memoryTable).values([memory]);
    console.log('Memory inserted successfully');

    // Try to retrieve it
    console.log('Retrieving memory...');
    const results = await db.select().from(memoryTable).where(eq(memoryTable.id, memoryId));

    console.log('Retrieved results:', results.length);
    expect(results).toHaveLength(1);
  });
});
