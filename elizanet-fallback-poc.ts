#!/usr/bin/env ts-node
/**
 * ElizaNet LiteLLM Fallback POC
 * 
 * This script demonstrates the fallback mechanism to ElizaNet LiteLLM instance
 * when the primary model fails due to rate limiting or other errors.
 */

import { AgentRuntime } from './packages/core/src/runtime';
import { Character, ModelType } from './packages/core/src/types';

// Mock character for testing
const testCharacter: Character = {
  id: 'test-agent',
  name: 'Test Agent',
  username: 'testagent',
  system: 'You are a helpful assistant.',
  bio: 'A test agent for demonstrating ElizaNet fallback',
  lore: [],
  messageExamples: [],
  postExamples: [],
  people: [],
  topics: [],
  style: {
    all: ['helpful', 'informative'],
    chat: ['conversational'],
    post: ['brief'],
  },
  adjectives: ['helpful', 'intelligent'],
  settings: {
    // Enable ElizaNet fallback
    ELIZANET_FALLBACK_ENABLED: true,
    ELIZANET_BASE_URL: 'http://elizanet.up.railway.app',
    ELIZANET_TIMEOUT: '30000',
    // Optional: ELIZANET_API_KEY can be set for authenticated requests
  },
  secrets: {},
};

// Mock model that simulates rate limiting
const mockRateLimitedModel = async (runtime: any, params: any) => {
  console.log('🔴 Primary model called, simulating rate limit error...');
  const error = new Error('Rate limit exceeded. Please try again later.');
  (error as any).status = 429;
  throw error;
};

// Mock model that simulates network error
const mockNetworkErrorModel = async (runtime: any, params: any) => {
  console.log('🔴 Primary model called, simulating network error...');
  const error = new Error('Service unavailable');
  (error as any).status = 503;
  throw error;
};

// Mock model that works normally
const mockWorkingModel = async (runtime: any, params: any) => {
  console.log('🟢 Primary model called successfully');
  return 'This is a response from the primary model';
};

async function demonstrateFallback() {
  console.log('🚀 ElizaNet LiteLLM Fallback POC\n');
  
  // Create runtime instance
  const runtime = new AgentRuntime({
    character: testCharacter,
    conversationLength: 10,
  });

  // Test 1: Rate limiting fallback
  console.log('📋 Test 1: Rate limiting fallback');
  console.log('=====================================');
  
  try {
    // Register mock rate-limited model
    runtime.registerModel(ModelType.TEXT_SMALL, mockRateLimitedModel, 'mock-provider', 1000);
    
    const result = await runtime.useModel(ModelType.TEXT_SMALL, {
      prompt: 'Hello, this is a test message',
      maxTokens: 100,
      temperature: 0.7,
    });
    
    console.log('✅ Fallback successful:', result);
  } catch (error) {
    console.log('❌ Fallback failed:', error.message);
  }
  
  console.log('\n');
  
  // Test 2: Network error fallback
  console.log('📋 Test 2: Network error fallback');
  console.log('=====================================');
  
  try {
    // Register mock network error model
    runtime.registerModel(ModelType.TEXT_LARGE, mockNetworkErrorModel, 'mock-provider', 1000);
    
    const result = await runtime.useModel(ModelType.TEXT_LARGE, {
      messages: [{ role: 'user', content: 'This is a test with network error' }],
      maxTokens: 100,
      temperature: 0.7,
    });
    
    console.log('✅ Fallback successful:', result);
  } catch (error) {
    console.log('❌ Fallback failed:', error.message);
  }
  
  console.log('\n');
  
  // Test 3: Working model (no fallback needed)
  console.log('📋 Test 3: Working model (no fallback)');
  console.log('=====================================');
  
  try {
    // Register working model
    runtime.registerModel(ModelType.TEXT_EMBEDDING, mockWorkingModel, 'mock-provider', 1000);
    
    const result = await runtime.useModel(ModelType.TEXT_EMBEDDING, {
      text: 'This is a test embedding',
    });
    
    console.log('✅ Primary model successful:', result);
  } catch (error) {
    console.log('❌ Primary model failed:', error.message);
  }
  
  console.log('\n');
  
  // Test 4: Fallback disabled
  console.log('📋 Test 4: Fallback disabled');
  console.log('=====================================');
  
  try {
    // Disable fallback
    runtime.setSetting('ELIZANET_FALLBACK_ENABLED', false);
    
    const result = await runtime.useModel(ModelType.TEXT_SMALL, {
      prompt: 'This should fail without fallback',
      maxTokens: 100,
      temperature: 0.7,
    });
    
    console.log('✅ Unexpected success:', result);
  } catch (error) {
    console.log('❌ Expected failure (fallback disabled):', error.message);
  }
  
  console.log('\n🎉 POC demonstration complete!');
}

// Configuration examples
console.log('📖 Configuration Examples:');
console.log('============================');
console.log('Environment Variables:');
console.log('  ELIZANET_FALLBACK_ENABLED=true');
console.log('  ELIZANET_BASE_URL=http://elizanet.up.railway.app');
console.log('  ELIZANET_API_KEY=your-api-key-here (optional)');
console.log('  ELIZANET_TIMEOUT=30000');
console.log('');
console.log('Character Settings:');
console.log('  settings: {');
console.log('    ELIZANET_FALLBACK_ENABLED: true,');
console.log('    ELIZANET_BASE_URL: "http://elizanet.up.railway.app",');
console.log('    ELIZANET_TIMEOUT: "30000",');
console.log('  },');
console.log('  secrets: {');
console.log('    ELIZANET_API_KEY: "your-api-key-here",');
console.log('  }');
console.log('');

// Run the demonstration
demonstrateFallback().catch(console.error);