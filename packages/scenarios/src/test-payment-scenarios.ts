#!/usr/bin/env tsx

import { RealBenchmarkRunner } from './real-benchmark-runner.js';

async function testPaymentScenarios() {
  console.log('🧪 Testing All Payment Scenarios (60-65)');

  const scenarios = [
    '65-payment-multi-agent',
    '64-payment-multi-currency',
    '63-payment-insufficient-funds',
    '62-payment-confirmation-flow',
    '61-payment-trust-exemptions',
    '60-payment-basic-flow',
  ];

  const results = [];

  for (const scenario of scenarios) {
    console.log(`\n📊 Running scenario: ${scenario}`);
    
    const runner = new RealBenchmarkRunner({
      apiKeys: {},
      filter: scenario.substring(3).replace(/-/g, ' '), // Convert to readable filter
      verbose: true,
      timeoutMs: 180000,
    });

    try {
      const scenarioResults = await runner.runBenchmarks();
      results.push(...scenarioResults);
      
      const passed = scenarioResults.every(r => r.status === 'passed');
      console.log(passed ? `✅ ${scenario} PASSED` : `❌ ${scenario} FAILED`);
    } catch (error) {
      console.error(`❌ ${scenario} ERROR:`, error);
      results.push({
        scenarioName: scenario,
        status: 'error',
        errors: [error instanceof Error ? error.message : String(error)],
      });
    }
  }

  // Summary
  console.log('\n📈 PAYMENT SCENARIOS SUMMARY:');
  console.log('='.repeat(50));
  
  const passed = results.filter(r => r.status === 'passed').length;
  const total = results.length;
  
  results.forEach((result) => {
    console.log(`${result.status === 'passed' ? '✅' : '❌'} ${result.scenarioName}: ${result.status}`);
    if (result.errors?.length > 0) {
      console.log(`   Errors: ${result.errors.join(', ')}`);
    }
  });
  
  console.log(`\n📊 Total Pass Rate: ${((passed / total) * 100).toFixed(1)}% (${passed}/${total})`);

  process.exit(passed === total ? 0 : 1);
}

testPaymentScenarios().catch(console.error); 