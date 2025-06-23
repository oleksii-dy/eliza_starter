#!/usr/bin/env tsx

import { simpleTestScenario } from './src/plugin-tests/00-simple-test.js';
import { RealScenarioTestRunner } from './src/real-test-runner.js';

async function testSingle() {
  console.log('🚀 Testing single scenario...\n');
  
  const runner = new RealScenarioTestRunner();
  
  try {
    const result = await runner.runAllScenarios({}, [simpleTestScenario]);
    
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

testSingle().catch(console.error);