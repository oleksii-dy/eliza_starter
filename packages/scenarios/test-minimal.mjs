#!/usr/bin/env tsx

/**
 * Minimal test to check if our infrastructure fixes work
 */

import { RuntimeTestHarness } from './src/runtime-test-harness.js';

async function main() {
  console.log('🔧 Testing infrastructure fixes...');
  
  try {
    // Test the runtime test harness creation
    const testHarness = new RuntimeTestHarness('minimal-test-001');
    
    console.log('✅ RuntimeTestHarness created successfully');
    
    // Test creating a simple character and runtime
    const testCharacter = {
      id: 'test-agent-001',
      name: 'Test Agent',
      bio: ['I am a test agent'],
      system: 'You are a helpful test agent.',
      messageExamples: [],
      postExamples: [],
      topics: [],
      knowledge: [],
      plugins: ['@elizaos/plugin-sql'], // Just the basic SQL plugin
      settings: {},
    };
    
    console.log('📝 Test character created');
    
    // Create runtime
    const runtime = await testHarness.createTestRuntime({
      character: testCharacter,
      plugins: ['@elizaos/plugin-sql'],
      apiKeys: {},
    });
    
    console.log('🤖 Test runtime created successfully');
    console.log(`   Agent ID: ${runtime.agentId}`);
    console.log(`   Character: ${runtime.character.name}`);
    console.log(`   Actions: ${runtime.actions.length}`);
    console.log(`   Providers: ${runtime.providers.length}`);
    console.log(`   Services: ${runtime.services.size}`);
    
    // Test basic state composition
    const testMessage = {
      id: 'test-msg-001',
      entityId: 'test-user-001',
      agentId: runtime.agentId,
      roomId: 'test-room-001',
      content: {
        text: 'Hello, test agent!',
        source: 'test',
      },
      createdAt: Date.now(),
    };
    
    const state = await runtime.composeState(testMessage);
    console.log('📊 State composition successful');
    console.log(`   State keys: ${Object.keys(state).join(', ')}`);
    
    // Clean up
    await testHarness.cleanup();
    console.log('🧹 Cleanup completed');
    
    console.log('🎉 Infrastructure test PASSED - Real agent runtime is working!');
    
  } catch (error) {
    console.error('💥 Infrastructure test FAILED:', error);
    console.error('Stack:', error.stack);
    process.exit(1);
  }
}

main().catch(console.error);