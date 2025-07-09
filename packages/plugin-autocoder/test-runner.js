#!/usr/bin/env node

// Simple test runner to debug the issue
const { spawn } = require('child_process');
const path = require('path');

async function runTest() {
  console.log('Starting AutoCoder Plugin Test...');
  console.log('Working directory:', process.cwd());
  
  // Set environment variables
  process.env.NODE_ENV = 'test';
  process.env.LOG_LEVEL = 'info';
  
  // Run elizaos test with proper project structure
  const testProcess = spawn('elizaos', ['test', '.'], {
    stdio: 'inherit',
    env: process.env,
    cwd: process.cwd()
  });
  
  testProcess.on('close', (code) => {
    console.log(`Test process exited with code ${code}`);
    process.exit(code);
  });
  
  testProcess.on('error', (error) => {
    console.error('Test process error:', error);
    process.exit(1);
  });
}

runTest().catch(console.error);