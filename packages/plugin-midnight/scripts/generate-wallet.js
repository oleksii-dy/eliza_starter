#!/usr/bin/env node

/**
 * Generate a Midnight Network test wallet
 * This script creates a new wallet with mnemonic and extracts the public key for faucet funding
 */

import { generateMnemonic } from 'bip39';
import { WalletBuilder } from '@midnight-ntwrk/wallet';
import { getZswapNetworkId } from '@midnight-ntwrk/midnight-js-network-id';
import fs from 'fs';
import path from 'path';

async function generateTestWallet() {
  console.log('🔐 Generating Midnight Network test wallet...\n');

  try {
    // Generate a new 12-word mnemonic
    const mnemonic = generateMnemonic(128); // 128 bits = 12 words
    console.log('✅ Generated 12-word mnemonic');
    console.log(`📝 Mnemonic: ${mnemonic}\n`);

    // Get network configuration for testnet
    const networkId = getZswapNetworkId('testnet');
    console.log(`🌐 Network ID: ${networkId}`);

    // Build wallet from mnemonic
    console.log('🔧 Building wallet from mnemonic...');
    const walletBuilder = WalletBuilder.buildFromSeed(networkId, mnemonic);
    const wallet = await walletBuilder.start();

    console.log('✅ Wallet created successfully');

    // Get wallet address/public key
    const address = await wallet.address();
    console.log(`\n🏠 Wallet Address: ${address.address}`);
    console.log(`🔑 Public Key: ${address.address}`);

    // Create environment configuration
    const envConfig = `# Midnight Network Test Wallet Configuration
# Generated on ${new Date().toISOString()}

# Network Configuration
MIDNIGHT_NETWORK_URL=https://rpc.testnet.midnight.network
MIDNIGHT_INDEXER_URL=https://indexer.testnet.midnight.network
MIDNIGHT_INDEXER_WS_URL=wss://indexer.testnet.midnight.network
MIDNIGHT_NODE_URL=https://rpc.testnet.midnight.network
MIDNIGHT_PROOF_SERVER_URL=https://proof.testnet.midnight.network
MIDNIGHT_NETWORK_ID=testnet
MIDNIGHT_ZK_CONFIG_URL=https://zk-config.testnet.midnight.network
MIDNIGHT_ZK_CONFIG_PATH=./zk-config

# Wallet Configuration
MIDNIGHT_WALLET_MNEMONIC="${mnemonic}"

# API Keys (add your own)
OPENAI_API_KEY=sk-your-openai-key-here
ANTHROPIC_API_KEY=your-anthropic-key-here
`;

    // Write to .env.local
    const envPath = path.join(process.cwd(), '.env.local');
    fs.writeFileSync(envPath, envConfig);
    console.log(`\n📄 Environment configuration saved to: ${envPath}`);

    // Create wallet info file
    const walletInfo = {
      mnemonic: mnemonic,
      address: address.address,
      networkId: networkId,
      createdAt: new Date().toISOString(),
      network: 'testnet',
    };

    const walletInfoPath = path.join(process.cwd(), 'wallet-info.json');
    fs.writeFileSync(walletInfoPath, JSON.stringify(walletInfo, null, 2));
    console.log(`💾 Wallet info saved to: ${walletInfoPath}`);

    console.log('\n🎯 NEXT STEPS:');
    console.log('1. Use this address in the Midnight Network faucet:');
    console.log(`   ${address.address}`);
    console.log('\n2. Get testnet tokens from the faucet:');
    console.log('   https://faucet.testnet.midnight.network');
    console.log('\n3. Update API keys in .env.local');
    console.log('\n4. Run the plugin tests:');
    console.log('   npm test');

    // Stop the wallet
    await wallet.stop();

    return {
      mnemonic,
      address: address.address,
      networkId,
    };
  } catch (error) {
    console.error('❌ Failed to generate wallet:', error);
    throw error;
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  generateTestWallet().catch((error) => {
    console.error('Wallet generation failed:', error);
    process.exit(1);
  });
}

export { generateTestWallet };
