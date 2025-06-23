#!/usr/bin/env bun

// Quick test runner for fast iteration
// Usage: ./quick-test.ts [test-file-path]

import { spawn } from 'child_process';

const testFile = process.argv[2];

if (!testFile) {
  console.log('Usage: ./quick-test.ts <test-file-path>');
  console.log('Example: ./quick-test.ts src/__tests__/unit/TokenService.test.ts');
  process.exit(1);
}

console.log(`🚀 Running test: ${testFile}\n`);

const child = spawn('npx', ['vitest', testFile, '--watch'], {
  stdio: 'inherit',
  env: {
    ...process.env,
    FORCE_COLOR: '1',
  }
});

child.on('error', (error) => {
  console.error('❌ Error:', error);
  process.exit(1);
}); 