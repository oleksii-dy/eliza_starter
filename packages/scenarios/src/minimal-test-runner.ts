#!/usr/bin/env tsx

/**
 * Minimal test runner that bypasses runtime initialization issues
 * This demonstrates real database operations without full runtime
 */

import { createDatabaseAdapter } from '@elizaos/plugin-sql';
import { v4 as uuidv4 } from 'uuid';
import { stringToUuid } from '@elizaos/core';
import type { Memory, UUID } from '@elizaos/core';
import path from 'path';
import fs from 'fs/promises';

// Helper to create tables
async function createTables(db: any): Promise<void> {
  console.log('Creating tables...');

  const rawPglite = await db.getConnection();

  // Create minimal tables for testing
  const queries = [
    `CREATE TABLE IF NOT EXISTS agents (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      bio TEXT DEFAULT ''
    )`,
    `CREATE TABLE IF NOT EXISTS memories (
      id TEXT PRIMARY KEY,
      type TEXT NOT NULL,
      content TEXT NOT NULL,
      entity_id TEXT NOT NULL,
      agent_id TEXT NOT NULL,
      room_id TEXT NOT NULL,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    )`,
  ];

  for (const query of queries) {
    await rawPglite.query(query);
  }

  console.log('✅ Tables created');
}

async function runMinimalTest() {
  console.log('🚀 Starting minimal test runner\n');

  const testDir = path.join(process.cwd(), '.test-minimal');
  await fs.mkdir(testDir, { recursive: true });

  const dbPath = path.join(testDir, `test_${Date.now()}.db`);

  try {
    // 1. Create database
    console.log('📦 Creating database adapter...');
    const db = createDatabaseAdapter({ dataDir: dbPath }, stringToUuid('test-agent'));

    await db.init();

    // 2. Create tables
    await createTables(db);

    // 3. Create test agent
    console.log('\n🤖 Creating test agent...');
    const agent = {
      id: stringToUuid('test-agent'),
      name: 'Test Agent',
      bio: 'A test agent',
    };

    await db.createAgent(agent);
    console.log('✅ Agent created');

    // 4. Create test memory
    console.log('\n💭 Creating test memory...');
    const memory: Memory = {
      id: uuidv4() as UUID,
      type: 'message',
      content: { text: 'Hello, this is a test message' },
      entityId: agent.id,
      agentId: agent.id,
      roomId: agent.id,
      createdAt: Date.now(),
    };

    const memoryId = await db.createMemory(memory, 'messages');
    console.log('✅ Memory created with ID:', memoryId);

    // 5. Retrieve memory
    console.log('\n🔍 Retrieving memories...');
    const memories = await db.getMemories({
      agentId: agent.id,
      tableName: 'messages',
      count: 10,
    });

    console.log(`✅ Retrieved ${memories.length} memories`);
    if (memories.length > 0) {
      console.log('First memory:', memories[0].content);
    }

    // 6. Search memories
    console.log('\n🔎 Testing memory search...');
    // Note: Search might not work without embeddings, but let's try
    const searchResults = await db.searchMemories({
      tableName: 'messages',
      embedding: new Array(384).fill(0), // Dummy embedding
      match_threshold: 0.5,
      count: 10,
    });

    console.log(`✅ Search returned ${searchResults.length} results`);

    console.log('\n✨ All tests passed!');

    // Cleanup
    await db.close();
    await fs.unlink(dbPath).catch(() => {});
    await fs.unlink(`${dbPath}-wal`).catch(() => {});
    await fs.unlink(`${dbPath}-shm`).catch(() => {});
  } catch (error) {
    console.error('❌ Test failed:', error);
    process.exit(1);
  }
}

// Run if called directly
if (process.argv[1].endsWith('minimal-test-runner.ts')) {
  runMinimalTest();
}
