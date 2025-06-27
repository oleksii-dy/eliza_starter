#!/usr/bin/env bun

/**
 * Main Scenario Test Runner
 * Runs both autocoder and GitHub todo workflow tests
 */

import { execSync } from 'child_process';

async function runScenarios() {
  console.log('🔄 Running ElizaOS Scenario Tests\n');

  const tests = [
    {
      name: 'Individual Scenarios with Success Rate Tracking',
      command: 'bun run scripts/test-individual-scenarios.ts',
      description: 'Runs all scenarios individually with 80%+ success rate validation',
    },
    {
      name: 'Autocoder Plugin (Legacy)',
      command: 'bun run scripts/test-autocoder.ts',
      description: 'Tests autocoder plugin functionality (legacy test)',
    },
    {
      name: 'GitHub Todo Workflow (Legacy)',
      command: 'bun run scripts/test-github-todo.ts',
      description: 'Tests GitHub todo integration workflow (legacy test)',
    },
  ];

  let passed = 0;
  let failed = 0;

  for (const test of tests) {
    console.log(`🧪 Running ${test.name} test...`);
    console.log(`   ${test.description}`);

    try {
      execSync(test.command, {
        stdio: 'inherit',
        timeout: 180000, // 3 minutes max per test
      });
      console.log(`✅ ${test.name} test PASSED\n`);
      passed++;
    } catch (error) {
      console.log(`❌ ${test.name} test FAILED\n`);
      failed++;
    }
  }

  console.log('='.repeat(50));
  console.log('📊 SCENARIO TEST RESULTS');
  console.log('='.repeat(50));
  console.log(`✅ Passed: ${passed}/${tests.length}`);
  console.log(`❌ Failed: ${failed}/${tests.length}`);

  if (failed === 0) {
    console.log('\n🎉 All scenario tests passed!');
    process.exit(0);
  } else {
    console.log('\n⚠️  Some scenario tests failed');
    process.exit(1);
  }
}

runScenarios().catch((error) => {
  console.error('💥 Scenario runner failed:', error);
  process.exit(1);
});
