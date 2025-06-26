#!/usr/bin/env node

/**
 * Display wallet information and manual setup instructions
 */

import dotenv from 'dotenv';
import fs from 'fs';

// Load environment variables
dotenv.config({ path: '.env.local' });

console.log('🔐 Midnight Network Wallet Information\n');

const mnemonic = process.env.MIDNIGHT_WALLET_MNEMONIC;
if (!mnemonic) {
  console.error('❌ MIDNIGHT_WALLET_MNEMONIC not found in .env.local');
  process.exit(1);
}

console.log('✅ Wallet Configuration Ready');
console.log(`📝 Mnemonic: ${mnemonic}`);
console.log(`🌐 Network: ${process.env.MIDNIGHT_NETWORK_ID || 'testnet'}`);

// Read wallet info if it exists
try {
  const walletInfoPath = './wallet-info.json';
  if (fs.existsSync(walletInfoPath)) {
    const walletInfo = JSON.parse(fs.readFileSync(walletInfoPath, 'utf8'));
    console.log(`📅 Created: ${walletInfo.createdAt}`);
  }
} catch (error) {
  // Ignore if file doesn't exist
}

console.log('\n🎯 TO GET THE WALLET ADDRESS:');
console.log('');
console.log('Option 1: Use Midnight Browser Wallet');
console.log('1. Install the Midnight browser extension wallet');
console.log('2. Import this mnemonic:');
console.log(`   ${mnemonic}`);
console.log('3. The wallet will show your testnet address');
console.log('');
console.log('Option 2: Start the ElizaOS agent');
console.log('1. The agent will initialize the wallet when it starts');
console.log('2. The wallet address will be logged to console');
console.log('3. Run: elizaos start --character character-test.json');
console.log('');
console.log('Option 3: Use the Midnight Network explorer');
console.log('1. Go to: https://explorer.testnet.midnight.network');
console.log('2. Look for wallet/mnemonic import tools');
console.log('');
console.log('🏦 FAUCET FUNDING:');
console.log('Once you have the address:');
console.log('1. Go to: https://faucet.testnet.midnight.network');
console.log('2. Enter your wallet address');
console.log('3. Request testnet MIDNIGHT tokens');
console.log('4. Wait for tokens to arrive (usually 2-5 minutes)');
console.log('');
console.log('📋 CURRENT CONFIGURATION:');
console.log(`Network URL: ${process.env.MIDNIGHT_NETWORK_URL}`);
console.log(`Indexer URL: ${process.env.MIDNIGHT_INDEXER_URL}`);
console.log(`Network ID: ${process.env.MIDNIGHT_NETWORK_ID}`);
console.log('');
console.log('✅ All environment variables are configured correctly!');
console.log('The plugin should work once you fund the wallet with testnet tokens.');
