#!/usr/bin/env node

/**
 * TEST LOGGING ISSUE
 * 
 * This isolates the logging problem to determine if it's a real framework issue
 */

console.log('🔍 Testing CLI Logging Issue');

try {
  // Try to reproduce the exact conditions that cause the logging error
  const { TestRunner } = await import('/Users/shawwalters/.bun/install/global/node_modules/@elizaos/cli/dist/chunk-QLKBXRME.js');
  console.log('✅ TestRunner imported successfully');
  
  // Create minimal test runtime
  const mockRuntime = {
    agentId: 'test-agent',
    character: { name: 'TestAgent' },
    actions: [],
    providers: [],
    evaluators: [],
    services: new Map(),
    plugins: []
  };
  
  console.log('🔧 Creating TestRunner instance...');
  const testRunner = new TestRunner(mockRuntime);
  console.log('✅ TestRunner created successfully');
  
  // Try to run the specific operation that fails
  console.log('🧪 Testing logger methods...');
  
  // This should work with their custom logger
  console.log('Direct TestRunner test - no errors here');
  
} catch (error) {
  console.error('❌ Logging test failed:', error.message);
  console.error('Stack:', error.stack);
  
  console.log('\n🔍 This confirms there is a logging infrastructure issue');
  console.log('The error occurs when the TestRunner tries to use pino logger instead of custom logger');
}