#!/usr/bin/env node

/**
 * Simple test script to run a single plugin scenario directly
 */

import { ConsolidatedScenarioTestRunner } from './src/test-runner.ts';

async function main() {
  console.log('🚀 Starting simple scenario test...');
  
  try {
    const runner = new ConsolidatedScenarioTestRunner();
    
    const options = {
      filter: 'research-knowledge',
      verbose: true,
      continueOnError: true,
      outputFormat: 'console',
    };
    
    const results = await runner.runAllScenarios(options);
    
    console.log(`\n📊 Test Results:`);
    console.log(`Total: ${results.totalScenarios}, Passed: ${results.passed}, Failed: ${results.failed}`);
    
    if (results.failed > 0) {
      console.log(`\n❌ Failures:`);
      results.results.filter(r => r.status === 'failed').forEach(result => {
        console.log(`  - ${result.scenario}: ${result.errors.join(', ')}`);
      });
      process.exit(1);
    } else {
      console.log(`\n✅ All tests passed!`);
      process.exit(0);
    }
  } catch (error) {
    console.error('💥 Test runner crashed:', error);
    process.exit(1);
  }
}

main().catch(console.error);