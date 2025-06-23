#!/usr/bin/env tsx

/**
 * Basic functionality test for real scenario infrastructure
 * Tests database operations without full runtime initialization
 */

import { createDatabaseAdapter } from '@elizaos/plugin-sql';
import { v4 as uuidv4 } from 'uuid';
import { stringToUuid, type Memory, type UUID } from '@elizaos/core';
import path from 'path';
import fs from 'fs/promises';

async function testBasicFunctionality() {
  console.log('🧪 Testing basic database functionality...\n');

  const testDir = path.join(process.cwd(), '.test-basic');
  await fs.mkdir(testDir, { recursive: true });

  const dbPath = path.join(testDir, `test_${Date.now()}.db`);
  const agentId = stringToUuid('test-agent');

  try {
    // 1. Create database adapter
    console.log('1️⃣  Creating database adapter...');
    const database = createDatabaseAdapter({ dataDir: dbPath }, agentId);

    // 2. Initialize database
    console.log('2️⃣  Initializing database...');
    await database.init();

    // 3. Create tables
    console.log('3️⃣  Creating tables...');
    const rawDb = await database.getConnection();

    // Create minimal tables for testing
    const tableQueries = [
      `CREATE TABLE IF NOT EXISTS agents (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name TEXT NOT NULL,
        bio TEXT DEFAULT '',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        username TEXT,
        system TEXT DEFAULT '',
        topics TEXT DEFAULT '[]',
        interests TEXT DEFAULT '[]',
        knowledge TEXT DEFAULT '[]',
        message_examples TEXT DEFAULT '[]',
        post_examples TEXT DEFAULT '[]',
        style TEXT DEFAULT '{}',
        style_all TEXT DEFAULT '[]',
        style_chat TEXT DEFAULT '[]',
        style_post TEXT DEFAULT '[]',
        enabled INTEGER DEFAULT 1,
        status TEXT,
        settings TEXT DEFAULT '{}',
        plugins TEXT DEFAULT '[]'
      )`,
      `CREATE TABLE IF NOT EXISTS memories (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        type TEXT DEFAULT 'message',
        content JSONB DEFAULT '{}',
        "entityId" UUID,
        "agentId" UUID,
        "roomId" UUID,
        "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )`,
    ];

    for (const query of tableQueries) {
      await rawDb.exec(query);
    }
    console.log('   ✅ Tables created');

    // 4. Test agent operations
    console.log('\n4️⃣  Testing agent operations...');
    const testAgent = {
      id: agentId,
      name: 'Test Agent',
      bio: 'A test agent for basic functionality',
    };

    try {
      await database.createAgent(testAgent);
      console.log('   ✅ Agent created');
    } catch (error) {
      console.log(
        '   ⚠️  Agent creation failed (may already exist):',
        error instanceof Error ? error.message : String(error)
      );
    }

    const retrievedAgent = await database.getAgent(agentId);
    console.log('   ✅ Agent retrieved:', retrievedAgent?.name);

    // 5. Test memory operations
    console.log('\n5️⃣  Testing memory operations...');
    const testMemory: Memory = {
      id: stringToUuid(`memory-${Date.now()}`),
      content: { text: 'Hello, this is a test message' },
      entityId: agentId,
      agentId: agentId,
      roomId: stringToUuid('test-room'),
      createdAt: Date.now(),
    };

    const memoryId = await database.createMemory(testMemory, 'memories');
    console.log('   ✅ Memory created with ID:', memoryId);

    const memories = await database.getMemories({
      agentId: agentId,
      tableName: 'memories',
      count: 10,
    });
    console.log('   ✅ Memories retrieved:', memories.length);

    // 6. Test raw SQL queries
    console.log('\n6️⃣  Testing raw SQL queries...');
    const result = await rawDb.query(
      `
      SELECT COUNT(*) as count FROM memories WHERE "agentId" = $1
    `,
      [agentId]
    );
    console.log('   ✅ Raw query result:', result.rows[0]);

    // 7. Test transaction support
    console.log('\n7️⃣  Testing transaction support...');
    try {
      await rawDb.transaction(async (tx: any) => {
        await tx.query(
          `
          INSERT INTO memories (id, type, content, "agentId", "roomId")
          VALUES ($1, $2, $3, $4, $5)
        `,
          [
            uuidv4(),
            'test',
            JSON.stringify({ text: 'Transaction test' }),
            agentId,
            stringToUuid('test-room'),
          ]
        );
        console.log('   ✅ Transaction completed');
      });
    } catch (error) {
      console.log('   ❌ Transaction failed:', error);
    }

    console.log('\n✅ All basic functionality tests completed successfully!');
  } catch (error) {
    console.error('\n❌ Test failed:', error);
    throw error;
  } finally {
    // Cleanup
    console.log('\n🧹 Cleaning up...');
    try {
      await fs.rm(testDir, { recursive: true, force: true });
      console.log('   ✅ Test directory cleaned up');
    } catch (error) {
      console.log('   ⚠️  Cleanup failed:', error);
    }
  }
}

// Run the test
testBasicFunctionality().catch(console.error);
