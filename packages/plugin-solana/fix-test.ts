#!/usr/bin/env bun

// Test fixer script - runs individual test files and helps fix them

import { spawn } from 'child_process';
import { join } from 'path';

const failingTests = [
  'src/__tests__/unit/TokenService.test.ts',
  'src/__tests__/unit/PriceOracleService.test.ts',
  'src/__tests__/unit/TransactionService.test.ts',
];

async function runTest(testFile: string): Promise<boolean> {
  return new Promise((resolve) => {
    console.log(`\n🧪 Running: ${testFile}\n`);
    
    const child = spawn('npx', ['vitest', 'run', testFile], {
      stdio: 'inherit',
      env: {
        ...process.env,
        FORCE_COLOR: '1',
      }
    });

    child.on('close', (code) => {
      if (code === 0) {
        console.log(`\n✅ PASSED: ${testFile}`);
        resolve(true);
      } else {
        console.log(`\n❌ FAILED: ${testFile}`);
        resolve(false);
      }
    });
  });
}

async function main() {
  const testFile = process.argv[2];
  
  if (testFile) {
    // Run specific test
    await runTest(testFile);
  } else {
    // Run all failing tests
    console.log('🔧 Running all failing tests...\n');
    let failCount = 0;
    
    for (const test of failingTests) {
      const passed = await runTest(test);
      if (!passed) failCount++;
    }
    
    console.log('\n' + '='.repeat(60));
    console.log(`Summary: ${failingTests.length - failCount} passed, ${failCount} failed`);
  }
}

main().catch(console.error); 