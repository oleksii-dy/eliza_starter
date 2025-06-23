#!/usr/bin/env node
import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

// Load environment variables from .env file
dotenv.config();

// Force devnet for tests regardless of .env settings
process.env.SOLANA_NETWORK = 'devnet';
process.env.SOLANA_RPC_URL = 'https://api.devnet.solana.com';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Colors for output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

function log(message: string, color: string = colors.reset) {
  console.log(`${color}${message}${colors.reset}`);
}

function setupEnvironment() {
  log('\n🔧 Setting up environment variables...', colors.cyan);
  
  // Set required environment variables for tests
  process.env.SOL_ADDRESS = process.env.SOL_ADDRESS || 'So11111111111111111111111111111111111111112';
  process.env.SLIPPAGE = process.env.SLIPPAGE || '1';
  
  // Check if SOLANA_PRIVATE_KEY is set
  if (!process.env.SOLANA_PRIVATE_KEY && !process.env.WALLET_PRIVATE_KEY && !process.env.WALLET_SECRET_KEY) {
    log('❌ No wallet private key found!', colors.red);
    log('Please set one of: SOLANA_PRIVATE_KEY, WALLET_PRIVATE_KEY, or WALLET_SECRET_KEY', colors.yellow);
    process.exit(1);
  }
  
  // Set network to devnet for testing (tests expect devnet)
  process.env.SOLANA_NETWORK = process.env.SOLANA_NETWORK || 'devnet';
  process.env.SOLANA_RPC_URL = process.env.SOLANA_RPC_URL || 'https://api.devnet.solana.com';
  
  // Set minimal values for API keys (tests might not actually use them)
  process.env.HELIUS_API_KEY = process.env.HELIUS_API_KEY || 'test-key';
  process.env.BIRDEYE_API_KEY = process.env.BIRDEYE_API_KEY || 'test-key';
  
  // Ensure private key is available in all expected env vars
  const privateKey = process.env.SOLANA_PRIVATE_KEY || process.env.WALLET_PRIVATE_KEY || process.env.WALLET_SECRET_KEY;
  if (privateKey) {
    process.env.SOLANA_PRIVATE_KEY = privateKey;
    process.env.WALLET_PRIVATE_KEY = privateKey;
    process.env.WALLET_SECRET_KEY = privateKey;
  }
  
  log('✅ Environment variables set:', colors.green);
  log(`   SOL_ADDRESS: ${process.env.SOL_ADDRESS}`);
  log(`   SLIPPAGE: ${process.env.SLIPPAGE}`);
  log(`   SOLANA_NETWORK: ${process.env.SOLANA_NETWORK}`);
  log(`   SOLANA_RPC_URL: ${process.env.SOLANA_RPC_URL}`);
  log(`   SOLANA_PRIVATE_KEY: [SET]`);
  log(`   WALLET_PRIVATE_KEY: [SET]`);
  log(`   WALLET_SECRET_KEY: [SET]`);
}

function createLogsDir() {
  const logsDir = path.join(__dirname, 'logs');
  if (!fs.existsSync(logsDir)) {
    fs.mkdirSync(logsDir, { recursive: true });
  }
  return logsDir;
}

function runCommand(command: string, description: string): boolean {
  log(`\n📋 ${description}`, colors.bright + colors.blue);
  log(`   Command: ${command}`, colors.cyan);
  
  const logsDir = createLogsDir();
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const logFile = path.join(logsDir, `${description.toLowerCase().replace(/\s+/g, '-')}-${timestamp}.log`);
  
  try {
    const output = execSync(command, {
      encoding: 'utf8',
      stdio: 'pipe',
      env: { ...process.env },
    });
    
    fs.writeFileSync(logFile, output);
    log(`✅ ${description} passed!`, colors.green);
    log(`   Log saved to: ${logFile}`, colors.cyan);
    
    // Show summary of output
    const lines = output.split('\n');
    const testSummary = lines.find(line => line.includes('Tests:') || line.includes('test'));
    if (testSummary) {
      log(`   ${testSummary.trim()}`, colors.green);
    }
    
    return true;
  } catch (error: any) {
    const errorOutput = error.stdout || error.message;
    fs.writeFileSync(logFile, errorOutput);
    
    log(`❌ ${description} failed!`, colors.red);
    log(`   Log saved to: ${logFile}`, colors.cyan);
    
    // Extract test failure summary
    const lines = errorOutput.split('\n');
    const failureLines = lines.filter(line => 
      line.includes('FAIL') || 
      line.includes('✓') || 
      line.includes('✗') ||
      line.includes('Tests:') ||
      line.includes('error')
    ).slice(0, 10);
    
    if (failureLines.length > 0) {
      log('\n   Failure summary:', colors.yellow);
      failureLines.forEach(line => log(`   ${line}`, colors.yellow));
    }
    
    return false;
  }
}

async function main() {
  log('\n🚀 Solana Plugin Test Runner', colors.bright + colors.cyan);
  log('================================\n', colors.cyan);
  
  setupEnvironment();
  
  const results = {
    unit: false,
    integration: false,
    e2e: false,
    build: false,
  };
  
  // Build first
  log('\n📦 Building the plugin...', colors.cyan);
  results.build = runCommand('npm run build', 'Build');
  
  if (!results.build) {
    log('\n⚠️  Build failed, but continuing with tests...', colors.yellow);
  }
  
  // Run unit tests
  results.unit = runCommand('npm run test:unit', 'Unit Tests');
  
  // Run integration tests
  results.integration = runCommand('npm run test:integration', 'Integration Tests');
  
  // Run E2E tests
  results.e2e = runCommand('npm run test:e2e', 'E2E Tests');
  
  // Summary
  log('\n📊 Test Summary', colors.bright + colors.cyan);
  log('================', colors.cyan);
  
  const allPassed = Object.values(results).every(r => r);
  
  Object.entries(results).forEach(([name, passed]) => {
    const status = passed ? '✅ PASSED' : '❌ FAILED';
    const color = passed ? colors.green : colors.red;
    log(`${name.padEnd(15)} ${status}`, color);
  });
  
  if (allPassed) {
    log('\n🎉 All tests passed!', colors.bright + colors.green);
  } else {
    log('\n❌ Some tests failed. Check the logs directory for details.', colors.bright + colors.red);
    
    // Show how to view logs
    log('\nTo view logs:', colors.yellow);
    log(`  tail -f logs/*.log`, colors.cyan);
    log(`  cat logs/<test-name>-*.log | tail -100`, colors.cyan);
  }
  
  process.exit(allPassed ? 0 : 1);
}

main().catch(error => {
  log(`\n❌ Fatal error: ${error.message}`, colors.red);
  process.exit(1);
}); 