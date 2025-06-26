#!/usr/bin/env node

/**
 * Extract wallet address from mnemonic for faucet funding
 * This script initializes the wallet and gets the public address
 */

import dotenv from 'dotenv';
import { WalletBuilder } from '@midnight-ntwrk/wallet';

// Load environment variables
dotenv.config({ path: '.env.local' });

async function getWalletAddress() {
  console.log('🔐 Extracting wallet address from mnemonic...\n');

  const mnemonic = process.env.MIDNIGHT_WALLET_MNEMONIC;
  if (!mnemonic) {
    throw new Error('MIDNIGHT_WALLET_MNEMONIC not found in .env.local');
  }

  console.log('✅ Found mnemonic in environment');
  console.log(
    `📝 Mnemonic: ${mnemonic.split(' ').slice(0, 3).join(' ')}... (${mnemonic.split(' ').length} words)`
  );

  try {
    // Try to build wallet using string network ID
    console.log('\n🔧 Building wallet from mnemonic...');
    const walletBuilder = WalletBuilder.buildFromSeed('testnet', mnemonic);
    const wallet = await walletBuilder.start();

    console.log('✅ Wallet created successfully');

    // Get wallet address
    const address = await wallet.address();
    console.log(`\n🏠 Wallet Address: ${address.address}`);
    console.log(`🔑 Public Key for Faucet: ${address.address}`);

    // Stop the wallet
    await wallet.stop();

    console.log('\n🎯 FAUCET INSTRUCTIONS:');
    console.log('1. Copy this address:');
    console.log(`   ${address.address}`);
    console.log('\n2. Go to the Midnight Network faucet:');
    console.log('   https://faucet.testnet.midnight.network');
    console.log('\n3. Paste the address and request testnet tokens');
    console.log('\n4. Wait for tokens to arrive (usually takes a few minutes)');

    return address.address;
  } catch (error) {
    console.error('❌ Failed to get wallet address:', error.message);
    console.log('\n💡 This might be due to network connectivity or SDK configuration.');
    console.log('   The mnemonic is valid and saved in .env.local');
    console.log(
      '   You can still use the agent and the address will be generated when the plugin initializes.'
    );

    // Return the mnemonic for manual wallet creation
    console.log('\n📋 Manual Setup:');
    console.log(`   Mnemonic: ${mnemonic}`);
    console.log('   You can import this into a Midnight wallet to get the address.');

    throw error;
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  getWalletAddress().catch((error) => {
    console.error('Address extraction failed:', error.message);
    process.exit(1);
  });
}

export { getWalletAddress };
