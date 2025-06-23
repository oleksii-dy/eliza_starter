#!/usr/bin/env tsx

import { RealScenarioTestRunner } from './src/real-test-runner.js';
import { loadAllScenarios } from './src/scenarios-loader.js';

async function testFew() {
  console.log('🚀 Testing first 5 scenarios...\n');
  
  const runner = new RealScenarioTestRunner();
  const allScenarios = await loadAllScenarios();
  
  // Only test first 5 scenarios
  const testScenarios = allScenarios.slice(0, 5);
  console.log(`📦 Testing ${testScenarios.length} scenarios out of ${allScenarios.length} total\n`);
  
  try {
    const result = await runner.runAllScenarios({}, testScenarios);
    
    console.log('\n📊 Test Results:');
    console.log(`Total scenarios: ${result.total}`);
    console.log(`Passed: ${result.passed}`);
    console.log(`Failed: ${result.failed}`);
    console.log(`Crashed: ${result.crashed}`);
    
    if (result.failed > 0 || result.crashed > 0) {
      console.log('\n❌ Some tests failed');
      process.exit(1);
    } else {
      console.log('\n✅ All tests passed!');
      process.exit(0);
    }
  } catch (error) {
    console.error('Fatal error:', error);
    process.exit(1);
  }
}

testFew().catch(console.error);