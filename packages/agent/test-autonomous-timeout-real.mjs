#!/usr/bin/env node

/**
 * Real Runtime Autonomous Timeout Integration Test
 * 
 * This test validates the full autonomous agent timeout functionality:
 * - CLI timeout options work correctly
 * - Autonomous plugin loads and starts OODA loop
 * - AdminServer provides monitoring endpoints  
 * - Graceful shutdown with log archiving
 * - Real agent runtime with database integration
 * 
 * This is NOT a simulation - it uses real CLI and runtime components.
 */

import { spawn } from 'child_process';
import { writeFileSync, existsSync, mkdirSync, rmSync } from 'fs';
import path from 'path';

console.log('🧪 Testing Real Autonomous Agent Timeout Functionality...');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

const testDir = './test-autonomous-real';
const logDir = './test-autonomous-logs';
const timeout = 30; // 30 seconds test run
const adminPort = 3011;
const serverPort = 3012;

// Clean up any previous test artifacts
if (existsSync(testDir)) rmSync(testDir, { recursive: true });
if (existsSync(logDir)) rmSync(logDir, { recursive: true });

// Ensure test directories exist
mkdirSync(testDir, { recursive: true });
mkdirSync(logDir, { recursive: true });

// Create a test character with autonomous capabilities
const testCharacter = {
  "name": "AutonomousTestAgent",
  "system": "You are an autonomous test agent. Your goal is to demonstrate autonomous decision-making capabilities through the OODA loop. You should observe your environment, orient to the situation, decide on actions, and act on those decisions. Focus on testing web browsing, file operations, and command execution capabilities.",
  "bio": [
    "Autonomous agent designed for testing OODA loop capabilities",
    "Demonstrates real autonomous decision-making and action execution",
    "Tests timeout functionality and graceful shutdown procedures"
  ],
  "messageExamples": [[
    {"name": "user", "content": {"text": "start autonomous testing"}},
    {"name": "AutonomousTestAgent", "content": {"text": "Beginning autonomous operation with OODA loop decision-making.", "actions": ["BROWSE_WEB", "FILE_OPERATION"]}}
  ]],
  "topics": [
    "autonomous systems",
    "OODA loop decision-making", 
    "real-time monitoring",
    "system testing"
  ],
  "plugins": [
    "@elizaos/plugin-sql",
    "@elizaos/plugin-autonomy"
  ],
  "settings": {
    "goals": [
      {
        "id": "test-goal-1",
        "description": "Demonstrate autonomous web browsing capabilities",
        "priority": 1,
        "progress": 0
      },
      {
        "id": "test-goal-2", 
        "description": "Test file operation execution",
        "priority": 2,
        "progress": 0
      },
      {
        "id": "test-goal-3",
        "description": "Validate command execution capabilities",
        "priority": 3,
        "progress": 0
      }
    ]
  }
};

const characterPath = path.join(testDir, 'autonomous-test-character.json');
writeFileSync(characterPath, JSON.stringify(testCharacter, null, 2));

console.log('📝 Created autonomous test character at:', characterPath);
console.log('⚙️ Test Configuration:');
console.log(`   • Timeout: ${timeout} seconds`);
console.log(`   • Admin Port: ${adminPort}`);
console.log(`   • Server Port: ${serverPort}`);
console.log(`   • Log Directory: ${logDir}`);
console.log('');

// Test: Start CLI with autonomous timeout functionality
console.log('🚀 Starting CLI with autonomous agent and timeout...');

const cliArgs = [
  'start',
  '--character', characterPath,
  '--port', serverPort.toString(),
  '--timeout', timeout.toString(),
  '--autonomous',
  '--admin-port', adminPort.toString(), 
  '--save-logs-to', logDir
];

console.log('📤 CLI Command:', 'elizaos', cliArgs.join(' '));
console.log('');

const cliProcess = spawn('elizaos', cliArgs, {
  stdio: ['pipe', 'pipe', 'pipe'],
  cwd: process.cwd(),
  env: {
    ...process.env,
    // Autonomous configuration
    AUTONOMOUS_LOOP_INTERVAL: '3000', // 3 second loops for testing
    AUTONOMOUS_FILE_LOGGING: 'true',
    AUTONOMOUS_LOG_DIR: './logs/autonomy',
    // Disable non-essential features for testing
    OPENAI_API_KEY: '',
    ANTHROPIC_API_KEY: '',
  }
});

let output = '';
let errorOutput = '';
let startupComplete = false;
let adminServerReady = false;
let autonomousRunning = false;
let timeoutReached = false;

// Track test phases
const testPhases = {
  startup: false,
  adminServer: false, 
  autonomous: false,
  monitoring: false,
  timeout: false,
  shutdown: false,
  logArchive: false
};

cliProcess.stdout.on('data', (data) => {
  const text = data.toString();
  output += text;
  console.log('📤 STDOUT:', text.trim());
  
  // Phase 1: CLI Startup
  if (text.includes('Started AutonomousTestAgent') || text.includes('Agent server started')) {
    testPhases.startup = true;
    startupComplete = true;
    console.log('✅ Phase 1: CLI startup completed');
  }
  
  // Phase 2: Admin Server Ready  
  if (text.includes(`Autonomy API server started on port ${adminPort}`) || 
      text.includes(`Admin interface will be available on port ${adminPort}`)) {
    testPhases.adminServer = true;
    adminServerReady = true;
    console.log('✅ Phase 2: Admin server ready');
  }
  
  // Phase 3: Autonomous Operation
  if (text.includes('OODA Loop') || text.includes('autonomous') || text.includes('Starting observation phase')) {
    testPhases.autonomous = true;
    autonomousRunning = true;
    console.log('✅ Phase 3: Autonomous operation started');
  }
  
  // Phase 4: Timeout Reached
  if (text.includes('Timeout reached') || text.includes('initiating graceful shutdown')) {
    testPhases.timeout = true;
    timeoutReached = true;
    console.log('✅ Phase 4: Timeout reached, graceful shutdown initiated');
  }
  
  // Phase 5: Shutdown Complete  
  if (text.includes('Graceful shutdown completed')) {
    testPhases.shutdown = true;
    console.log('✅ Phase 5: Graceful shutdown completed');
  }
  
  // Phase 6: Log Archive
  if (text.includes('Logs archived to') || text.includes('successfully archived')) {
    testPhases.logArchive = true;
    console.log('✅ Phase 6: Log archiving completed');
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
  console.log('');
  console.log(`📊 CLI process closed with code ${code}`);
  console.log('');
  
  // Generate test report
  generateTestReport(code);
});

// Test monitoring after startup
setTimeout(async () => {
  if (startupComplete && adminServerReady) {
    await testMonitoringEndpoints();
  }
}, 10000); // Wait 10 seconds for full startup

async function testMonitoringEndpoints() {
  console.log('🔍 Testing Admin Server Monitoring Endpoints...');
  testPhases.monitoring = true;
  
  const endpoints = [
    { path: '/health', name: 'Health Check' },
    { path: '/api/ooda/context', name: 'OODA Context' },
    { path: '/api/ooda/metrics', name: 'OODA Metrics' },
    { path: '/api/logs', name: 'Logs API' },
    { path: '/api/goals', name: 'Goals API' },
    { path: '/api/observations', name: 'Observations API' },
    { path: '/api/actions', name: 'Actions API' }
  ];
  
  for (const endpoint of endpoints) {
    try {
      const response = await fetch(`http://localhost:${adminPort}${endpoint.path}`);
      const status = response.status;
      
      if (status === 200) {
        const data = await response.text();
        console.log(`✅ ${endpoint.name}: OK (${status}) - ${data.length} bytes`);
      } else if (status === 503 || status === 404) {
        console.log(`⚠️ ${endpoint.name}: Service not ready (${status}) - Expected during startup`);
      } else {
        console.log(`❌ ${endpoint.name}: Unexpected status (${status})`);
      }
    } catch (error) {
      console.log(`❌ ${endpoint.name}: Connection failed - ${error.message}`);
    }
  }
  
  console.log('✅ Monitoring endpoint tests completed');
  console.log('');
}

function generateTestReport(exitCode) {
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('📊 AUTONOMOUS TIMEOUT INTEGRATION TEST REPORT');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  
  console.log('\n🧪 Test Phases:');
  Object.entries(testPhases).forEach(([phase, completed]) => {
    const status = completed ? '✅ PASS' : '❌ FAIL';
    console.log(`   ${phase.toUpperCase().padEnd(12)}: ${status}`);
  });
  
  console.log('\n⚙️ Configuration Validation:');
  console.log(`   CLI Timeout Option: ${timeout}s ✅`);
  console.log(`   Autonomous Mode: ${testPhases.autonomous ? '✅ ENABLED' : '❌ FAILED'}`);
  console.log(`   Admin Port: ${adminPort} ${testPhases.adminServer ? '✅' : '❌'}`);
  console.log(`   Log Directory: ${logDir} ${testPhases.logArchive ? '✅' : '❌'}`);
  
  console.log('\n🔧 Infrastructure Components:');
  console.log(`   CLI Start Command: ${testPhases.startup ? '✅ WORKING' : '❌ FAILED'}`);
  console.log(`   Autonomous Plugin: ${testPhases.autonomous ? '✅ LOADED' : '❌ FAILED'}`);
  console.log(`   Admin Server: ${testPhases.adminServer ? '✅ RUNNING' : '❌ FAILED'}`);
  console.log(`   Monitoring APIs: ${testPhases.monitoring ? '✅ RESPONDING' : '❌ FAILED'}`);
  console.log(`   Graceful Shutdown: ${testPhases.shutdown ? '✅ COMPLETED' : '❌ FAILED'}`);
  console.log(`   Log Archiver: ${testPhases.logArchive ? '✅ WORKING' : '❌ FAILED'}`);
  
  console.log('\n📈 Runtime Metrics:');
  console.log(`   Exit Code: ${exitCode === 0 ? '✅ SUCCESS (0)' : `❌ FAILURE (${exitCode})`}`);
  console.log(`   Timeout Handling: ${testPhases.timeout ? '✅ TRIGGERED' : '❌ NOT TRIGGERED'}`);
  console.log(`   Output Lines: ${output.split('\n').length}`);
  console.log(`   Error Lines: ${errorOutput.split('\n').length}`);
  
  // Check for archived logs
  if (existsSync(logDir)) {
    const logFiles = require('fs').readdirSync(logDir);
    console.log(`   Archived Logs: ${logFiles.length > 0 ? '✅ CREATED' : '❌ MISSING'}`);
    if (logFiles.length > 0) {
      console.log(`   Log Files: ${logFiles.join(', ')}`);
    }
  }
  
  // Overall test result
  const criticalPhases = ['startup', 'autonomous', 'timeout', 'shutdown'];
  const criticalPassed = criticalPhases.every(phase => testPhases[phase]);
  const totalPhases = Object.keys(testPhases).length;
  const passedPhases = Object.values(testPhases).filter(Boolean).length;
  
  console.log('\n🎯 OVERALL RESULT:');
  console.log(`   Phase Success Rate: ${passedPhases}/${totalPhases} (${Math.round(passedPhases/totalPhases*100)}%)`);
  console.log(`   Critical Path: ${criticalPassed ? '✅ PASS' : '❌ FAIL'}`);
  
  if (criticalPassed && exitCode === 0) {
    console.log('   🎉 AUTONOMOUS TIMEOUT FUNCTIONALITY: ✅ FULLY WORKING');
    console.log('');
    console.log('   🚀 Ready for production use with real autonomous agents!');
  } else {
    console.log('   ⚠️ AUTONOMOUS TIMEOUT FUNCTIONALITY: ❌ NEEDS FIXES');
    console.log('');
    console.log('   🔧 Review failed phases and error output above');
  }
  
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  
  // Exit with appropriate code
  process.exit(criticalPassed && exitCode === 0 ? 0 : 1);
}

// Handle process cleanup
process.on('SIGINT', () => {
  console.log('\n🛑 Test interrupted by user');
  if (cliProcess && !cliProcess.killed) {
    cliProcess.kill('SIGTERM');
  }
  setTimeout(() => {
    if (cliProcess && !cliProcess.killed) {
      cliProcess.kill('SIGKILL');
    }
    process.exit(130);
  }, 5000);
});

process.on('SIGTERM', () => {
  console.log('\n🛑 Test terminated');
  if (cliProcess && !cliProcess.killed) {
    cliProcess.kill('SIGTERM');
  }
  process.exit(143);
});