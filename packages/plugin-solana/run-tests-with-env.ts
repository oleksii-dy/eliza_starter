#!/usr/bin/env bun

import { spawn } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';

// Set up environment variables for testing
const testEnv = {
    ...process.env,
    // Network configuration
    SOLANA_NETWORK: 'mainnet-beta',
    SOLANA_RPC_URL: process.env.SOLANA_RPC_URL || 'https://mainnet.helius-rpc.com/?api-key=a77d0001-8cc5-4af1-ace1-d96b912a93ef',
    
    // Required addresses
    SOL_ADDRESS: 'So11111111111111111111111111111111111111112',
    SLIPPAGE: '1',
    MIN_TRANSACTION_AMOUNT: '0.000001',
    
    // Wallet configuration
    WALLET_MASTER_SEED: 'test-integration-master-seed',
    WALLET_ENCRYPTION_KEY: 'test-integration-encryption-key',
    
    // API keys (empty for now, tests should handle missing keys gracefully)
    HELIUS_API_KEY: 'a77d0001-8cc5-4af1-ace1-d96b912a93ef',
    BIRDEYE_API_KEY: '',
    
    // Jupiter configuration
    JUPITER_API_URL: 'https://quote-api.jup.ag/v6',
    JUPITER_TOKEN_LIST_URL: 'https://token.jup.ag/all',
    
    // Test mode
    TEST_MODE: 'true',
    NODE_ENV: 'test',
    
    // Private key from environment
    SOLANA_PRIVATE_KEY: process.env.SOLANA_PRIVATE_KEY || ''
};

// Ensure logs directory exists
const logsDir = path.join(__dirname, 'logs');
if (!fs.existsSync(logsDir)) {
    fs.mkdirSync(logsDir, { recursive: true });
}

// Function to run tests with environment
async function runTests(testType?: string) {
    const timestamp = new Date().toISOString().replace(/:/g, '-').replace(/\./g, '-');
    const logFile = path.join(logsDir, `test-${testType || 'all'}-${timestamp}.log`);
    const logStream = fs.createWriteStream(logFile);
    
    console.log(`Running tests with proper environment...`);
    console.log(`Log file: ${logFile}`);
    console.log(`Environment variables set:`);
    console.log(`  - SOLANA_NETWORK: ${testEnv.SOLANA_NETWORK}`);
    console.log(`  - SOL_ADDRESS: ${testEnv.SOL_ADDRESS}`);
    console.log(`  - SLIPPAGE: ${testEnv.SLIPPAGE}`);
    console.log(`  - SOLANA_PRIVATE_KEY: ${testEnv.SOLANA_PRIVATE_KEY ? 'Set' : 'Not set'}`);
    
    // Determine command based on test type
    let command = 'npm';
    let args = ['run'];
    
    switch(testType) {
        case 'unit':
            args.push('test:unit');
            break;
        case 'integration':
            args.push('test:integration');
            break;
        case 'e2e':
            args.push('test:e2e');
            break;
        default:
            args.push('test');
    }
    
    return new Promise((resolve, reject) => {
        const child = spawn(command, args, {
            env: testEnv,
            shell: true
        });
        
        child.stdout.on('data', (data) => {
            const output = data.toString();
            process.stdout.write(output);
            logStream.write(output);
        });
        
        child.stderr.on('data', (data) => {
            const output = data.toString();
            process.stderr.write(output);
            logStream.write(output);
        });
        
        child.on('close', (code) => {
            logStream.end();
            console.log(`\nTest process exited with code ${code}`);
            console.log(`\nShowing last 100 lines of output:`);
            
            // Show last 100 lines
            const logContent = fs.readFileSync(logFile, 'utf8');
            const lines = logContent.split('\n');
            const lastLines = lines.slice(-100).join('\n');
            console.log(lastLines);
            
            resolve(code);
        });
        
        child.on('error', (err) => {
            logStream.end();
            reject(err);
        });
    });
}

// Get test type from command line
const testType = process.argv[2];

// Run tests
runTests(testType).catch(console.error); 