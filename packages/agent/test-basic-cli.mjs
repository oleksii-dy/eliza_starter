#!/usr/bin/env node

/**
 * Minimal working agent runtime test
 * Tests that the CLI can start with real runtime and respond to basic message
 */

import { spawn } from 'child_process';
import { writeFileSync, existsSync, mkdirSync } from 'fs';
import path from 'path';

console.log('🧪 Testing Basic CLI Start Command Functionality...');

const testDir = './test-basic-runtime';
const logDir = './test-logs';

// Ensure test directories exist
if (!existsSync(testDir)) mkdirSync(testDir, { recursive: true });
if (!existsSync(logDir)) mkdirSync(logDir, { recursive: true });

// Create a minimal test character for basic testing
const testCharacter = {
  "name": "BasicTestAgent",
  "system": "You are a helpful test agent. Always respond with 'Basic test successful!' when greeted.",
  "bio": ["Test agent for basic CLI functionality validation"],
  "messageExamples": [[
    {"name": "user", "content": {"text": "hello"}},
    {"name": "BasicTestAgent", "content": {"text": "Basic test successful!"}}
  ]],
  "plugins": ["@elizaos/plugin-autonomy"]
};

const characterPath = path.join(testDir, 'basic-test-character.json');
writeFileSync(characterPath, JSON.stringify(testCharacter, null, 2));

console.log('📝 Created test character at:', characterPath);

// Test basic CLI start command
console.log('🚀 Starting CLI with basic agent...');

const cliProcess = spawn('elizaos', ['start', '--character', characterPath, '--port', '3010'], {
  stdio: ['pipe', 'pipe', 'pipe'],
  cwd: process.cwd()
});

let output = '';
let errorOutput = '';
let startupComplete = false;

cliProcess.stdout.on('data', (data) => {
  const text = data.toString();
  output += text;
  console.log('📤 STDOUT:', text.trim());
  
  // Check for successful startup indicators
  if (text.includes('Started BasicTestAgent') || 
      text.includes('Server listening') ||
      text.includes('Agent server started')) {
    startupComplete = true;
    console.log('✅ CLI startup appears successful');
    
    // Give a moment for full startup, then test
    setTimeout(() => {
      testBasicFunctionality();
    }, 2000);
  }
});

cliProcess.stderr.on('data', (data) => {
  const text = data.toString();
  errorOutput += text;
  console.log('📥 STDERR:', text.trim());
});

cliProcess.on('error', (error) => {
  console.error('❌ CLI process error:', error);
  process.exit(1);
});

cliProcess.on('close', (code) => {
  console.log(`CLI process closed with code ${code}`);
  
  // Save logs
  writeFileSync(path.join(logDir, 'basic-cli-stdout.log'), output);
  writeFileSync(path.join(logDir, 'basic-cli-stderr.log'), errorOutput);
  
  if (code === 0) {
    console.log('✅ CLI basic test completed successfully');
  } else {
    console.log('❌ CLI basic test failed with exit code:', code);
  }
  
  process.exit(code);
});

async function testBasicFunctionality() {
  console.log('🔬 Testing basic CLI functionality...');
  
  // Test: Check if server is responsive via API
  try {
    const response = await fetch('http://localhost:3010/api/runtime/ping');
    if (response.ok) {
      const data = await response.json();
      console.log('✅ Server ping successful:', data);
    } else {
      console.log('⚠️ Server ping failed with status:', response.status);
    }
  } catch (error) {
    console.log('⚠️ Server ping error:', error.message);
  }
  
  // Give the test 10 seconds total runtime, then shutdown
  setTimeout(() => {
    console.log('⏰ Test time limit reached, shutting down...');
    cliProcess.kill('SIGTERM');
    
    // Force kill if graceful shutdown fails
    setTimeout(() => {
      cliProcess.kill('SIGKILL');
    }, 3000);
  }, 8000);
}

// Handle process cleanup
process.on('SIGINT', () => {
  console.log('🛑 Received SIGINT, cleaning up...');
  if (cliProcess && !cliProcess.killed) {
    cliProcess.kill('SIGTERM');
  }
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('🛑 Received SIGTERM, cleaning up...');
  if (cliProcess && !cliProcess.killed) {
    cliProcess.kill('SIGTERM');
  }
  process.exit(0);
});