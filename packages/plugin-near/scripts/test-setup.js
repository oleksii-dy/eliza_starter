#!/usr/bin/env node

/**
 * NEAR Plugin Setup Verification Script
 * 
 * This script helps verify that your NEAR plugin is properly configured
 * and ready for testnet deployment.
 */

import { connect, keyStores, utils } from 'near-api-js';
import { config } from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { existsSync, readFileSync } from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
config();

// Color codes for terminal output
const colors = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  reset: '\x1b[0m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

async function checkEnvironment() {
  log('\n🔍 Checking Environment Configuration...', 'blue');
  
  const requiredEnvVars = [
    'NEAR_NETWORK',
    'NEAR_ADDRESS',
    'NEAR_WALLET_SECRET_KEY',
    'NEAR_WALLET_PUBLIC_KEY'
  ];
  
  let hasErrors = false;
  
  for (const varName of requiredEnvVars) {
    if (!process.env[varName]) {
      log(`❌ Missing required environment variable: ${varName}`, 'red');
      hasErrors = true;
    } else {
      log(`✅ ${varName} is set`, 'green');
    }
  }
  
  // Check network configuration
  const network = process.env.NEAR_NETWORK;
  if (network && !['testnet', 'mainnet'].includes(network)) {
    log(`⚠️  Invalid NEAR_NETWORK: ${network}. Should be 'testnet' or 'mainnet'`, 'yellow');
    hasErrors = true;
  }
  
  return !hasErrors;
}

async function checkAccount() {
  log('\n🔍 Checking NEAR Account...', 'blue');
  
  try {
    const keyStore = new keyStores.InMemoryKeyStore();
    const keyPair = utils.KeyPair.fromString(process.env.NEAR_WALLET_SECRET_KEY);
    await keyStore.setKey(process.env.NEAR_NETWORK, process.env.NEAR_ADDRESS, keyPair);
    
    const near = await connect({
      networkId: process.env.NEAR_NETWORK,
      keyStore,
      nodeUrl: process.env.NEAR_RPC_URL || 
        (process.env.NEAR_NETWORK === 'mainnet' 
          ? 'https://near.lava.build' 
          : 'https://neart.lava.build'),
    });
    
    const account = await near.account(process.env.NEAR_ADDRESS);
    const state = await account.state();
    
    log(`✅ Account ${process.env.NEAR_ADDRESS} exists`, 'green');
    log(`   Balance: ${utils.format.formatNearAmount(state.amount)} NEAR`, 'green');
    
    // Check if balance is sufficient
    const balance = parseFloat(utils.format.formatNearAmount(state.amount));
    if (balance < 1) {
      log(`⚠️  Low balance! Consider getting more testnet NEAR from https://near-faucet.io/`, 'yellow');
    }
    
    // Check access keys
    const accessKeys = await account.getAccessKeys();
    log(`   Access Keys: ${accessKeys.length}`, 'green');
    
    return true;
  } catch (error) {
    log(`❌ Account check failed: ${error.message}`, 'red');
    if (error.message.includes('does not exist')) {
      log(`   Create your account at https://wallet.${process.env.NEAR_NETWORK}.near.org`, 'yellow');
    }
    return false;
  }
}

async function checkNearSocialContract() {
  log('\n🔍 Checking NEAR Social Contract...', 'blue');
  
  try {
    const keyStore = new keyStores.InMemoryKeyStore();
    const near = await connect({
      networkId: process.env.NEAR_NETWORK,
      keyStore,
      nodeUrl: process.env.NEAR_RPC_URL || 
        (process.env.NEAR_NETWORK === 'mainnet' 
          ? 'https://near.lava.build' 
          : 'https://neart.lava.build'),
    });
    
    const socialContract = process.env.NEAR_NETWORK === 'mainnet' 
      ? 'social.near' 
      : 'v1.social08.testnet';
    
    const account = await near.account(process.env.NEAR_ADDRESS);
    
    // Try to call a view method on the social contract
    const result = await account.viewFunction({
      contractId: socialContract,
      methodName: 'get',
      args: { keys: [`${process.env.NEAR_ADDRESS}/**`] }
    });
    
    log(`✅ NEAR Social contract (${socialContract}) is accessible`, 'green');
    
    return true;
  } catch (error) {
    log(`⚠️  NEAR Social contract check failed: ${error.message}`, 'yellow');
    log(`   Storage features may not work properly`, 'yellow');
    return false;
  }
}

async function checkRefFinance() {
  log('\n🔍 Checking Ref Finance...', 'blue');
  
  try {
    const refContract = process.env.NEAR_NETWORK === 'mainnet'
      ? 'v2.ref-finance.near'
      : 'ref-finance-101.testnet';
    
    const response = await fetch(
      process.env.NEAR_NETWORK === 'mainnet'
        ? 'https://indexer.ref.finance/list-pools'
        : 'https://testnet-indexer.ref-finance.com/list-pools'
    );
    
    if (response.ok) {
      log(`✅ Ref Finance is accessible`, 'green');
      const pools = await response.json();
      log(`   Available pools: ${pools.length}`, 'green');
      return true;
    } else {
      throw new Error(`HTTP ${response.status}`);
    }
  } catch (error) {
    log(`⚠️  Ref Finance check failed: ${error.message}`, 'yellow');
    log(`   Swap features may not work properly`, 'yellow');
    return false;
  }
}

async function main() {
  log('🚀 NEAR Plugin Setup Verification', 'blue');
  log('================================\n', 'blue');
  
  // Check if .env file exists
  const envPath = join(process.cwd(), '.env');
  if (!existsSync(envPath)) {
    log('❌ No .env file found!', 'red');
    log('   Create one based on the deployment guide', 'yellow');
    process.exit(1);
  }
  
  let allChecks = true;
  
  // Run all checks
  allChecks &= await checkEnvironment();
  
  if (!process.env.NEAR_ADDRESS || !process.env.NEAR_WALLET_SECRET_KEY) {
    log('\n❌ Cannot proceed without required environment variables', 'red');
    process.exit(1);
  }
  
  allChecks &= await checkAccount();
  allChecks &= await checkNearSocialContract();
  allChecks &= await checkRefFinance();
  
  // Summary
  log('\n📊 Summary', 'blue');
  log('==========', 'blue');
  
  if (allChecks) {
    log('✅ All checks passed! Your NEAR plugin is ready for deployment.', 'green');
    log('\nNext steps:', 'blue');
    log('1. Create your agent character file', 'reset');
    log('2. Run: bun run start --character your-character.json', 'reset');
  } else {
    log('⚠️  Some checks failed. Please fix the issues above.', 'yellow');
    log('\nFor help, see the deployment guide or visit:', 'blue');
    log('- NEAR Discord: https://near.chat', 'reset');
    log('- ElizaOS GitHub: https://github.com/elizaos/eliza', 'reset');
  }
}

// Run the verification
main().catch(console.error); 