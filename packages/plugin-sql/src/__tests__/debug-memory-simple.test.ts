import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { PgliteDatabaseAdapter } from '../pglite/adapter';
import { PGliteClientManager } from '../pglite/manager';
import { v4 as uuidv4 } from 'uuid';
import { ChannelType, type UUID } from '@elizaos/core';
import { setDatabaseType } from '../schema/factory';
import { eq } from 'drizzle-orm';
import { sql } from 'drizzle-orm';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

// Set database type BEFORE importing schema to ensure proper lazy loading
setDatabaseType('pglite');

// Import schema and specific tables AFTER setting database type
import * as schema from '../schema';
import { memoryTable } from '../schema/memory';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

describe('Debug Memory Simple Operations', () => {
  let adapter: PgliteDatabaseAdapter;
  let manager: PGliteClientManager;
  let agentId: UUID;
  let testDbPath: string;

  beforeEach(async () => {
    agentId = uuidv4() as UUID;
    
    // Create a unique temporary database directory for this test
    testDbPath = path.join(__dirname, '.test-db', `test-${Date.now()}-${Math.random().toString(36).slice(2)}`);
    
    // Ensure the directory exists
    if (!fs.existsSync(path.dirname(testDbPath))) {
      fs.mkdirSync(path.dirname(testDbPath), { recursive: true });
    }
    
    // Create and initialize the manager with file-based database
    manager = new PGliteClientManager({ dataDir: testDbPath });
    await manager.initialize();
    
    // Then create the adapter with the initialized manager
    adapter = new PgliteDatabaseAdapter(agentId, manager);

    // Initialize the adapter (this will run unified migrations automatically)
    await adapter.init();
    
    // Get database instance for queries
    const db = adapter.getDatabase();

    // Debug: Check what's in the schema object
    console.log('DEBUG: Schema object keys:', Object.keys(schema));
    console.log('DEBUG: Schema.memoryTable exists:', !!schema.memoryTable);
    console.log('DEBUG: Schema.agentTable exists:', !!schema.agentTable);
    console.log('DEBUG: Direct memoryTable import exists:', !!memoryTable);

    // Check if the memories table exists by running a simple query
    try {
      const result = await db.execute(sql`SELECT 1 FROM memories LIMIT 0`);
      console.log('Memories table exists');
    } catch (e) {
      console.error('Memories table does not exist:', e);
    }
  });

  afterEach(async () => {
    if (adapter) {
      await adapter.close();
    }
    
    // Clean up the test database directory
    if (testDbPath && fs.existsSync(testDbPath)) {
      try {
        fs.rmSync(testDbPath, { recursive: true, force: true });
      } catch (error) {
        console.error('Failed to clean up test database:', error);
      }
    }
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
    const entityId = uuidv4() as UUID; // Create a valid entity ID
    const memory = {
      id: memoryId,
      type: 'test',
      content: { text: 'Simple test' },
      metadata: {},
      entityId: entityId, // Use valid entity ID instead of null
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
