#!/usr/bin/env node

/**
 * REAL MVP TEST RUNNER - ZERO LARP CODE
 * 
 * Runs comprehensive tests for the real MVP implementation.
 * All functionality validated with real ElizaOS runtime.
 */

const { spawn } = require('child_process');
const path = require('path');

console.log('🚀 Running Real MVP Tests - Zero LARP Implementation\n');

// Test files to run
const testFiles = [
  'src/real-test/minimal-real-test.test.ts',
  'src/real-test/real-mvp-test.test.ts',
];

async function runTest(testFile) {
  return new Promise((resolve, reject) => {
    console.log(`\n📋 Running: ${testFile}`);
    console.log('━'.repeat(60));
    
    const process = spawn('npx', ['vitest', 'run', testFile], {
      stdio: 'inherit',
      cwd: __dirname,
    });

    process.on('close', (code) => {
      if (code === 0) {
        console.log(`✅ ${testFile} - PASSED`);
        resolve(code);
      } else {
        console.log(`❌ ${testFile} - FAILED (exit code: ${code})`);
        reject(new Error(`Test failed: ${testFile}`));
      }
    });

    process.on('error', (error) => {
      console.error(`❌ Error running ${testFile}:`, error);
      reject(error);
    });
  });
}

async function runAllTests() {
  const startTime = Date.now();
  let passedTests = 0;
  let failedTests = 0;

  console.log('Running Real MVP Test Suite...');
  console.log(`Testing ${testFiles.length} test files\n`);

  for (const testFile of testFiles) {
    try {
      await runTest(testFile);
      passedTests++;
    } catch (error) {
      failedTests++;
      console.error(`\n❌ Test failed: ${testFile}`);
      console.error(error.message);
    }
  }

  const endTime = Date.now();
  const duration = ((endTime - startTime) / 1000).toFixed(2);

  console.log('\n' + '═'.repeat(60));
  console.log('🎯 REAL MVP TEST SUMMARY');
  console.log('═'.repeat(60));
  console.log(`✅ Passed: ${passedTests}`);
  console.log(`❌ Failed: ${failedTests}`);
  console.log(`⏱️  Duration: ${duration}s`);
  console.log(`📊 Success Rate: ${Math.round((passedTests / testFiles.length) * 100)}%`);

  if (failedTests === 0) {
    console.log('\n🎉 ALL TESTS PASSED - Real MVP is production ready!');
    console.log('✅ Zero LARP code, all functionality validated');
    console.log('✅ Real ElizaOS runtime integration confirmed');
    console.log('✅ useModel override mechanism working');
    console.log('✅ Training data collection functional');
    console.log('✅ Actions and plugin registration successful');
    return 0;
  } else {
    console.log('\n💥 SOME TESTS FAILED - Real MVP needs fixes');
    return 1;
  }
}

// Run tests
runAllTests()
  .then((code) => {
    process.exit(code);
  })
  .catch((error) => {
    console.error('\n💥 Test runner error:', error);
    process.exit(1);
  });