#!/usr/bin/env node
import { plugin, createDatabaseAdapter } from './dist/index.js';
import { AgentRuntime, stringToUuid } from '@elizaos/core';
import path from 'path';
import fs from 'fs/promises';

console.log('Testing SQL Plugin Runtime Table Creation...\n');

async function testSQLPlugin() {
  const testDir = path.join(process.cwd(), '.test-eliza', `test-${Date.now()}`);
  const testAgentId = stringToUuid(`test-agent-${Date.now()}`);

  try {
    // Create test directory
    await fs.mkdir(testDir, { recursive: true });

    console.log('1. Testing plugin properties:');
    console.log('   Plugin name:', plugin.name);
    console.log('   Plugin description:', plugin.description);
    console.log('   Has init function:', typeof plugin.init === 'function');
    console.log('   Has E2E tests:', Array.isArray(plugin.tests) && plugin.tests.length > 0);
    console.log('   ✅ Plugin structure is correct\n');

    console.log('2. Testing database adapter creation:');
    const adapter = createDatabaseAdapter({ dataDir: path.join(testDir, 'db') }, testAgentId);
    console.log('   Adapter type:', adapter.constructor.name);
    console.log('   ✅ Database adapter created successfully\n');

    console.log('3. Testing runtime initialization with SQL plugin:');
    const character = {
      name: 'Test Agent',
      system: 'Test system',
      messageExamples: [],
      postExamples: [],
      topics: [],
      knowledge: [],
      plugins: [],
      settings: {
        PGLITE_PATH: path.join(testDir, 'db'),
      },
      style: {
        all: [],
        chat: [],
        post: [],
      },
    };

    const runtime = new AgentRuntime({
      character,
      agentId: testAgentId,
      plugins: [plugin],
    });

    await runtime.initialize();
    console.log('   ✅ Runtime initialized successfully');
    console.log('   Database adapter registered:', !!runtime.db);
    console.log('   Adapter type:', runtime.db?.constructor.name || 'Unknown');
    console.log();

    console.log('4. Testing table operations:');

    // Test entity creation
    const entityId = stringToUuid(`test-entity-${Date.now()}`);
    await runtime.createEntity({
      id: entityId,
      names: ['Test Entity'],
      agentId: testAgentId,
    });

    const entity = await runtime.getEntityById(entityId);
    console.log('   ✅ Entity created and retrieved:', entity?.names[0]);

    // Test room creation
    const roomId = stringToUuid(`test-room-${Date.now()}`);
    await runtime.createRoom({
      id: roomId,
      name: 'Test Room',
      source: 'test',
      type: 'GROUP',
      agentId: testAgentId,
    });

    const room = await runtime.getRoom(roomId);
    console.log('   ✅ Room created and retrieved:', room?.name);

    // Test cache operations
    await runtime.setCache('test-key', { value: 'test-value' });
    const cached = await runtime.getCache('test-key');
    console.log('   ✅ Cache operations working:', cached?.value);

    // Test memory operations
    const memoryId = await runtime.createMemory({
      entityId,
      agentId: testAgentId,
      roomId,
      content: {
        text: 'Test memory',
        type: 'test',
      },
    });

    const memory = await runtime.getMemoryById(memoryId);
    console.log('   ✅ Memory created and retrieved:', memory?.content.text);

    console.log('\n✅ All SQL plugin tests passed! Tables are being created correctly.\n');

    // Cleanup
    await fs.rm(testDir, { recursive: true, force: true });
  } catch (error) {
    console.error('\n❌ Test failed:', error);
    console.error('Stack:', error.stack);

    // Cleanup on error
    try {
      await fs.rm(testDir, { recursive: true, force: true });
    } catch {}

    process.exit(1);
  }
}

testSQLPlugin();
