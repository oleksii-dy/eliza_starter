#!/usr/bin/env bun

import { readdir } from 'node:fs/promises';
import { join } from 'node:path';
import { spawn } from 'node:child_process';

const TESTS_DIR = join(process.cwd(), 'src/__tests__/integration');

async function getTestFiles(): Promise<string[]> {
  try {
    const files = await readdir(TESTS_DIR);
    return files
      .filter(file => file.endsWith('.test.ts'))
      .map(file => join(TESTS_DIR, file));
  } catch (error) {
    console.error('Failed to read test directory:', error);
    return [];
  }
}

function runTest(testFile: string): Promise<number> {
  return new Promise((resolve) => {
    const testName = testFile.split('/').pop();
    console.log(`\n========================================`);
    console.log(`Running: ${testName}`);
    console.log(`========================================\n`);

    const child = spawn('bun', ['test', testFile], {
      stdio: 'inherit',
      env: { ...process.env }
    });

    child.on('close', (code) => {
      resolve(code || 0);
    });

    child.on('error', (error) => {
      console.error(`Failed to run test ${testFile}:`, error);
      resolve(1);
    });
  });
}

async function main() {
  console.log('Running SQL plugin integration tests sequentially...\n');
  
  const testFiles = await getTestFiles();
  
  if (testFiles.length === 0) {
    console.error('No test files found!');
    process.exit(1);
  }

  console.log(`Found ${testFiles.length} test files to run:\n`);
  testFiles.forEach(file => console.log(`  - ${file.split('/').pop()}`));
  console.log();

  let totalTests = 0;
  let failedTests = 0;
  const startTime = Date.now();

  for (const testFile of testFiles) {
    totalTests++;
    const exitCode = await runTest(testFile);
    
    if (exitCode !== 0) {
      failedTests++;
      console.error(`\n❌ Test failed: ${testFile.split('/').pop()}\n`);
    } else {
      console.log(`\n✅ Test passed: ${testFile.split('/').pop()}\n`);
    }
  }

  const duration = ((Date.now() - startTime) / 1000).toFixed(2);
  
  console.log('\n========================================');
  console.log('Test Summary');
  console.log('========================================');
  console.log(`Total tests: ${totalTests}`);
  console.log(`Passed: ${totalTests - failedTests}`);
  console.log(`Failed: ${failedTests}`);
  console.log(`Duration: ${duration}s`);
  console.log('========================================\n');

  if (failedTests > 0) {
    console.error('❌ Some tests failed!');
    process.exit(1);
  } else {
    console.log('✅ All tests passed!');
    process.exit(0);
  }
}

main().catch((error) => {
  console.error('Unexpected error:', error);
  process.exit(1);
});