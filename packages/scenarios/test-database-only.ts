#!/usr/bin/env tsx

import { RuntimeTestHarness } from './src/runtime-test-harness.js';
import { stringToUuid, asUUID } from '@elizaos/core';
import chalk from 'chalk';

async function testDatabaseOnly() {
  console.log(chalk.cyan('🧪 Testing database-only functionality'));
  
  const testHarness = new RuntimeTestHarness('test-database-only');

  try {
    // Create a simple character that only uses SQL plugin
    const character = {
      id: asUUID(stringToUuid('test-character')),
      name: 'Database Test Agent',
      bio: ['I am a test agent for database functionality'],
      system: 'You are a helpful database test agent.',
      messageExamples: [],
      postExamples: [],
      topics: [],
      knowledge: [],
      plugins: [], // No plugins except SQL (which will be added automatically)
      settings: {},
    };

    console.log(chalk.yellow('Creating test runtime...'));
    const runtime = await testHarness.createTestRuntime({
      character,
      plugins: [], // Test with just the SQL plugin
      apiKeys: {},
    });

    console.log(chalk.green('✅ Runtime created successfully!'));
    console.log('Runtime details:');
    console.log(`  - Agent ID: ${runtime.agentId}`);
    console.log(`  - Character name: ${runtime.character.name}`);
    console.log(`  - Database adapter: ${runtime.adapter ? 'Available' : 'Not available'}`);
    console.log(`  - Actions: ${runtime.actions?.length || 0}`);
    console.log(`  - Providers: ${runtime.providers?.length || 0}`);
    
    // Test basic database operations
    console.log(chalk.yellow('\nTesting basic database operations...'));
    
    // Create a test memory
    const testMemory = await runtime.createMemory({
      entityId: runtime.agentId,
      roomId: asUUID(stringToUuid('test-room')),
      content: {
        text: 'This is a test message',
        source: 'test',
      },
    }, 'messages');
    
    console.log(chalk.green(`✅ Created test memory: ${testMemory}`));
    
    // Retrieve memories
    const memories = await runtime.getMemories({
      roomId: asUUID(stringToUuid('test-room')),
      count: 10,
    });
    
    console.log(chalk.green(`✅ Retrieved ${memories.length} memories`));
    
    // Test state composition
    const testMessage = {
      id: asUUID(stringToUuid('test-message')),
      entityId: runtime.agentId,
      roomId: asUUID(stringToUuid('test-room')),
      content: {
        text: 'Test state composition',
        source: 'test',
      },
      createdAt: Date.now(),
    };
    
    const state = await runtime.composeState(testMessage);
    console.log(chalk.green(`✅ Composed state successfully - providers: ${Object.keys(state.values).length}`));
    
    console.log(chalk.green('\n✅ Database functionality test completed successfully!'));
    
  } catch (error) {
    console.error(chalk.red('❌ Database test failed:'), error);
    process.exit(1);
  } finally {
    await testHarness.cleanup();
  }
}

testDatabaseOnly();