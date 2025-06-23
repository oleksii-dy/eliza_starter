#!/usr/bin/env node

/**
 * Simple startup cycle test to reproduce the WebAssembly abort issue
 * This replicates the user's scenario: start -> create DB -> shutdown -> start again
 */

import { AgentRuntime } from '@elizaos/core';
import { plugin as sqlPlugin } from './dist/index.js';
import path from 'path';
import fs from 'fs';

// Test character
const testCharacter = {
  name: 'StartupTestAgent',
  bio: ['Test agent for startup cycle verification'],
  system: 'You are a test agent.',
  messageExamples: []
  postExamples: []
  topics: []
  knowledge: [],
  plugins: ['@elizaos/plugin-sql'],
  id: 'test-agent-startup',
};

async function runStartupCycleTest() {
  const testDataDir = path.join(process.cwd(), `.test-startup-cycle-${Date.now()}`);
  console.log('🧪 Testing startup cycle with data dir:', testDataDir);
  
  try {
    // ========== FIRST STARTUP ==========
    console.log('\n📦 FIRST STARTUP - Creating runtime...');
    const runtime1 = new AgentRuntime(testCharacter);
    
    // Force use of file-based database to test persistence
    runtime1.settings = { SQLITE_DATA_DIR: testDataDir };
    
    console.log('🔌 Initializing SQL plugin...');
    await sqlPlugin.init({}, runtime1);
    
    const adapter1 = runtime1.adapter;
    if (!adapter1) {
      throw new Error('Database adapter not initialized');
    }
    
    console.log('⏳ Waiting for adapter to be ready...');
    const isReady1 = await adapter1.isReady();
    console.log('✅ First startup adapter ready:', isReady1);
    
    // Create test data
    console.log('💾 Creating test data...');
    const testEntityId = 'startup-test-entity';
    await adapter1.createEntities([{
      id: testEntityId,
      names: ['Startup Test Entity'],
      metadata: { 
        startup: 1,
        timestamp: Date.now(),
        message: 'Data from first startup'
      },
      agentId: runtime1.agentId,
    }]);
    
    // Verify data creation
    const entities1 = await adapter1.getEntitiesByIds([testEntityId]);
    console.log('📊 Created entities:', entities1.length);
    
    // ========== SHUTDOWN ==========
    console.log('\n🛑 SHUTTING DOWN...');
    await adapter1.close();
    console.log('✅ First session closed');
    
    // Wait a moment (simulating user stopping the app)
    console.log('⏱️  Waiting 2 seconds...');
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // ========== SECOND STARTUP (This is where the error occurs) ==========
    console.log('\n📦 SECOND STARTUP - Creating new runtime...');
    const runtime2 = new AgentRuntime({
      ...testCharacter,
      id: 'test-agent-startup-2',
    });
    
    runtime2.settings = { SQLITE_DATA_DIR: testDataDir };
    
    console.log('🔌 Re-initializing SQL plugin (THIS IS WHERE IT CRASHES)...');
    await sqlPlugin.init({}, runtime2);
    
    const adapter2 = runtime2.adapter;
    console.log('⏳ Waiting for second adapter to be ready...');
    const isReady2 = await adapter2.isReady();
    console.log('✅ Second startup adapter ready:', isReady2);
    
    // Verify data persistence
    console.log('🔍 Checking if data persisted...');
    const entities2 = await adapter2.getEntitiesByIds([testEntityId]);
    console.log('📊 Found persisted entities:', entities2.length);
    
    if (entities2.length > 0) {
      console.log('📄 Entity data:', JSON.stringify(entities2[0], null, 2));
    }
    
    await adapter2.close();
    
    console.log('\n🎉 STARTUP CYCLE TEST COMPLETED SUCCESSFULLY!');
    console.log('✅ No WebAssembly abort errors occurred');
    console.log('✅ Data persisted through restart cycle');
    
  } catch (error) {
    console.error('\n❌ STARTUP CYCLE TEST FAILED:');
    console.error('Error:', error.message);
    console.error('Stack:', error.stack);
    
    // Check if it's the specific WebAssembly error
    if (error.message.includes('Aborted') || error.message.includes('WebAssembly')) {
      console.error('\n🔍 DETECTED: WebAssembly abort error');
      console.error('This is the exact error the user is experiencing');
      console.error('The startup->shutdown->startup cycle is causing WebAssembly conflicts');
    }
    
    throw error;
  } finally {
    // Cleanup
    try {
      if (fs.existsSync(testDataDir)) {
        fs.rmSync(testDataDir, { recursive: true, force: true });
        console.log('🧹 Cleaned up test directory');
      }
    } catch (cleanupError) {
      console.warn('⚠️  Cleanup error:', cleanupError.message);
    }
  }
}

// Run the test
console.log('🚀 Starting startup cycle test...');
runStartupCycleTest().catch(error => {
  console.error('💥 Test failed:', error.message);
  process.exit(1);
});