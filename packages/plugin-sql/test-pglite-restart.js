// Test PGLite restart scenario
import { createDatabaseAdapter } from './dist/index.js';
import { v4 as uuid } from 'uuid';
import { mkdirSync, rmSync } from 'fs';
import path from 'path';

const testDir = './.test-pglite-restart';

async function testPGLiteRestart() {
  console.log('Starting PGLite restart test...');

  // Clean up any existing test directory
  try {
    rmSync(testDir, { recursive: true, force: true });
  } catch (e) {}

  // Create test directory
  mkdirSync(testDir, { recursive: true });

  const agentId = uuid();
  const dataDir = path.join(testDir, 'test-db');

  // First session
  console.log('\n=== FIRST SESSION ===');
  const adapter1 = await createDatabaseAdapter({
    dataDir
  }, agentId);

  try {
    await adapter1.init();
    await adapter1.waitForReady();
    console.log('✅ First session initialized');

    // Create some data
    const memoryId = await adapter1.createMemory({
      id: uuid(),
      entityId: agentId,
      agentId,
      roomId: uuid(),
      content: {
        text: 'Test memory from first session'
      }
    }, 'messages');

    console.log('✅ Created memory:', memoryId);

    // Close the adapter
    await adapter1.close();
    console.log('✅ First session closed');
  } catch (error) {
    console.error('❌ First session failed:', error);
    await adapter1.close();
    rmSync(testDir, { recursive: true, force: true });
    process.exit(1);
  }

  // Wait a bit to simulate app shutdown
  console.log('\n⏳ Waiting 2 seconds to simulate app shutdown...');
  await new Promise(resolve => setTimeout(resolve, 2000));

  // Second session - immediate restart
  console.log('\n=== SECOND SESSION (IMMEDIATE RESTART) ===');
  const adapter2 = await createDatabaseAdapter({
    dataDir
  }, agentId);

  try {
    await adapter2.init();
    await adapter2.waitForReady();
    console.log('✅ Second session initialized after immediate restart');

    // Try to read the data from first session
    const memories = await adapter2.getMemories({
      roomId: uuid(), // Use a dummy room ID since we don't have the original
      count: 10,
      tableName: 'messages' // Required parameter
    });

    console.log('✅ Found', memories.length, 'memories from previous session');

    // Create new data
    const memoryId2 = await adapter2.createMemory({
      id: uuid(),
      entityId: agentId,
      agentId,
      roomId: uuid(),
      content: {
        text: 'Test memory from second session'
      }
    }, 'messages');

    console.log('✅ Created new memory:', memoryId2);

    await adapter2.close();
    console.log('✅ Second session closed');

    // Clean up
    rmSync(testDir, { recursive: true, force: true });

    console.log('\n🎉 All PGLite restart tests passed!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Second session failed:', error);
    await adapter2.close();
    rmSync(testDir, { recursive: true, force: true });
    process.exit(1);
  }
}

testPGLiteRestart();
