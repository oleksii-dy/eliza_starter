#!/usr/bin/env bun

import { spawn } from 'child_process';
import { createWriteStream, existsSync, mkdirSync, readFileSync } from 'fs';
import { join } from 'path';

// Ensure logs directory exists
const logsDir = join(process.cwd(), 'logs');
if (!existsSync(logsDir)) {
  mkdirSync(logsDir, { recursive: true });
}

// Get test type from command line args
const testType = process.argv[2] || 'all';
const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
const logFile = join(logsDir, `test-${testType}-${timestamp}.log`);

console.log(`🚀 Starting ${testType} tests...`);
console.log(`📝 Logging to: ${logFile}`);
console.log('');

// Create write stream for log file
const logStream = createWriteStream(logFile);

// Function to run a command and stream output
function runCommand(command: string, args: string[]): Promise<number> {
  return new Promise((resolve) => {
    const child = spawn(command, args, {
      stdio: ['inherit', 'pipe', 'pipe'],
      shell: true,
      env: {
        ...process.env,
        FORCE_COLOR: '1',
        NODE_ENV: 'test',
      }
    });

    let output = '';

    // Stream stdout
    child.stdout?.on('data', (data) => {
      const text = data.toString();
      output += text;
      process.stdout.write(data);
      logStream.write(data);
    });

    // Stream stderr
    child.stderr?.on('data', (data) => {
      const text = data.toString();
      output += text;
      process.stderr.write(data);
      logStream.write(data);
    });

    child.on('close', (code) => {
      resolve(code || 0);
    });
  });
}

// Function to show last N lines of log
function showLastLines(filePath: string, lines: number = 100) {
  try {
    const content = readFileSync(filePath, 'utf-8');
    const allLines = content.split('\n');
    const lastLines = allLines.slice(-lines).join('\n');
    
    console.log('\n' + '='.repeat(80));
    console.log(`📋 Last ${lines} lines of output:`);
    console.log('='.repeat(80));
    console.log(lastLines);
    console.log('='.repeat(80));
    console.log(`\n✅ Full log written to: ${filePath}`);
    console.log(`📖 To view full log, run: cat ${filePath}`);
  } catch (error) {
    console.error('Error reading log file:', error);
  }
}

// Main test runner
async function runTests() {
  const startTime = Date.now();
  let exitCode = 0;

  try {
    // Write header to log
    logStream.write(`ElizaOS Solana Plugin Test Run\n`);
    logStream.write(`Test Type: ${testType}\n`);
    logStream.write(`Started: ${new Date().toISOString()}\n`);
    logStream.write(`${'='.repeat(80)}\n\n`);

    // Determine which tests to run
    switch (testType) {
      case 'unit':
        console.log('🧪 Running unit tests...\n');
        exitCode = await runCommand('npm', ['run', 'test:unit']);
        break;

      case 'integration':
        console.log('🔗 Running integration tests...\n');
        exitCode = await runCommand('npm', ['run', 'test:integration']);
        break;

      case 'e2e':
        console.log('🎯 Running e2e tests...\n');
        exitCode = await runCommand('npm', ['run', 'test:e2e']);
        break;

      case 'all':
      default:
        console.log('🏁 Running all tests...\n');
        
        // Run unit tests
        console.log('\n📦 Unit Tests:\n');
        logStream.write('\n--- UNIT TESTS ---\n');
        const unitCode = await runCommand('npm', ['run', 'test:unit']);
        
        // Run integration tests
        console.log('\n🔌 Integration Tests:\n');
        logStream.write('\n--- INTEGRATION TESTS ---\n');
        const integrationCode = await runCommand('npm', ['run', 'test:integration']);
        
        // Run e2e tests
        console.log('\n🎯 E2E Tests:\n');
        logStream.write('\n--- E2E TESTS ---\n');
        const e2eCode = await runCommand('npm', ['run', 'test:e2e']);
        console.log(`Exit code: ${e2eCode}\n`);
        
        exitCode = unitCode || integrationCode || e2eCode;
        break;
    }

    // Write footer to log
    const duration = Date.now() - startTime;
    logStream.write(`\n${'='.repeat(80)}\n`);
    logStream.write(`Completed: ${new Date().toISOString()}\n`);
    logStream.write(`Duration: ${(duration / 1000).toFixed(2)}s\n`);
    logStream.write(`Exit Code: ${exitCode}\n`);

  } catch (error) {
    console.error('\n❌ Test execution error:', error);
    exitCode = 1;
  } finally {
    logStream.end();
    
    // Wait a bit for stream to finish
    await new Promise(resolve => setTimeout(resolve, 100));
    
    // Show last lines of log
    showLastLines(logFile);
    
    // Exit with appropriate code
    process.exit(exitCode);
  }
}

// Run tests
runTests().catch(console.error); 