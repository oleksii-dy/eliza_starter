#!/usr/bin/env tsx

import { autocoderIntegrationScenario } from './src/plugin-lifecycle/autocoder-integration.js';
import { RealScenarioTestRunner } from './src/real-test-runner.js';

// Temporarily replace the allScenarios import with just our scenario
const scenarios = [autocoderIntegrationScenario];

async function testAutocoderScenario() {
  console.log('🚀 Testing Autocoder Scenario Directly...');
  console.log(`📦 Testing scenario: ${autocoderIntegrationScenario.name}`);
  
  const runner = new RealScenarioTestRunner();
  
  try {
    const result = await runner.runAllScenarios({
      filter: 'autocoder',
      verbose: true,
      continueOnError: false,
    }, scenarios);
    
    console.log('\n🏁 AUTOCODER SCENARIO TEST RESULTS:');
    console.log(`✅ Passed: ${result.passed}`);
    console.log(`❌ Failed: ${result.failed}`);
    console.log(`⏭️  Skipped: ${result.skipped}`);
    console.log(`📊 Pass Rate: ${result.summary.passRate.toFixed(1)}%`);
    
    if (result.failed > 0) {
      console.log('\n❌ Failures:');
      result.results
        .filter(r => r.status === 'failed')
        .forEach(result => {
          console.log(`  - ${result.scenario}: ${result.errors.join(', ')}`);
        });
    }
    
    process.exit(result.failed > 0 ? 1 : 0);
  } catch (error) {
    console.error('💥 Test execution failed:', error);
    process.exit(1);
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  testAutocoderScenario();
}