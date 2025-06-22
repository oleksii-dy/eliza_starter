#!/usr/bin/env tsx

import { RealScenarioTestRunner } from './src/real-test-runner.js';

async function testAllScenarios() {
  console.log('🚀 Testing All Scenarios with Real Infrastructure...');
  
  const runner = new RealScenarioTestRunner();
  
  try {
    const result = await runner.runAllScenarios({
      verbose: true,
      continueOnError: true, // Continue testing even if some fail
    });
    
    console.log('\n🏁 ALL SCENARIOS TEST RESULTS:');
    console.log(`📦 Total Scenarios: ${result.totalScenarios}`);
    console.log(`✅ Passed: ${result.passed}`);
    console.log(`❌ Failed: ${result.failed}`);
    console.log(`⏭️  Skipped: ${result.skipped}`);
    console.log(`🔍 Validation Errors: ${result.validationErrors}`);
    console.log(`📊 Pass Rate: ${result.summary.passRate.toFixed(1)}%`);
    console.log(`⏱️  Total Duration: ${(result.duration / 1000).toFixed(1)}s`);
    
    console.log('\n📈 Category Breakdown:');
    Object.entries(result.summary.categories).forEach(([category, stats]) => {
      const total = stats.passed + stats.failed;
      const rate = total > 0 ? ((stats.passed / total) * 100).toFixed(1) : '0.0';
      console.log(`  ${category}: ${stats.passed}/${total} (${rate}%)`);
    });
    
    if (result.failed > 0) {
      console.log('\n❌ Failed Scenarios:');
      result.results
        .filter(r => r.status === 'failed')
        .forEach(result => {
          console.log(`  - ${result.scenario}: ${result.errors.join(', ')}`);
        });
    }
    
    if (result.passed > 0) {
      console.log('\n✅ Passed Scenarios:');
      result.results
        .filter(r => r.status === 'passed')
        .forEach(result => {
          console.log(`  - ${result.scenario}: ${(result.duration / 1000).toFixed(1)}s`);
        });
    }
    
    console.log(`\n🎯 SUMMARY: ${result.passed}/${result.totalScenarios} scenarios now working with real infrastructure!`);
    
    process.exit(result.failed > 0 ? 1 : 0);
  } catch (error) {
    console.error('💥 Test execution failed:', error);
    process.exit(1);
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  testAllScenarios();
}