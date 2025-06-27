#!/usr/bin/env tsx

import { RealBenchmarkRunner } from './real-benchmark-runner.js';

async function testScenario(scenarioNum: string) {
  const scenarioName = scenarioNum.substring(3).replace(/-/g, ' ');
  console.log(`🧪 Testing Scenario ${scenarioNum}`);

  const runner = new RealBenchmarkRunner({
    apiKeys: {},
    filter: scenarioName,
    verbose: true,
    timeoutMs: 180000,
  });

  try {
    const results = await runner.runBenchmarks();
    
    console.log('\n📊 Test Results:');
    results.forEach((result) => {
      console.log(`\n📈 Scenario: ${result.scenarioName}`);
      console.log(`   Status: ${result.status}`);
      console.log(`   Duration: ${result.duration}ms`);
      console.log(`   Errors: ${result.errors.length > 0 ? result.errors.join(', ') : 'None'}`);
      console.log(`   Metrics:`, result.metrics);
      console.log(`   Verification:`, result.verification);
    });

    process.exit(results.every(r => r.status === 'passed') ? 0 : 1);
  } catch (error) {
    console.error('❌ Test failed:', error);
    process.exit(1);
  }
}

// Get scenario number from command line or default to 65
const scenario = process.argv[2] || '65-payment-multi-agent';
testScenario(scenario); 