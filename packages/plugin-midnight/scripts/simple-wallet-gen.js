#!/usr/bin/env node

/**
 * Simple wallet generator using just mnemonic generation
 * We'll generate the mnemonic and let the Midnight SDK handle address derivation when needed
 */

import { generateMnemonic } from 'bip39';
import fs from 'fs';
import path from 'path';

console.log('🔐 Generating Midnight Network test wallet...\n');

// Generate a new 12-word mnemonic
const mnemonic = generateMnemonic(128); // 128 bits = 12 words
console.log('✅ Generated 12-word mnemonic');
console.log(`📝 Mnemonic: ${mnemonic}\n`);

// Create environment configuration
const envConfig = `# Midnight Network Test Wallet Configuration
# Generated on ${new Date().toISOString()}

# Network Configuration
MIDNIGHT_NETWORK_URL=https://rpc.testnet.midnight.network
MIDNIGHT_INDEXER_URL=https://indexer.testnet.midnight.network
MIDNIGHT_INDEXER_WS_URL=wss://indexer.testnet.midnight.network/ws
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
console.log(`📄 Environment configuration saved to: ${envPath}`);

// Create wallet info file
const walletInfo = {
  mnemonic: mnemonic,
  networkId: 'testnet',
  createdAt: new Date().toISOString(),
  network: 'testnet',
  note: 'Address will be derived when wallet is initialized in the plugin',
};

const walletInfoPath = path.join(process.cwd(), 'wallet-info.json');
fs.writeFileSync(walletInfoPath, JSON.stringify(walletInfo, null, 2));
console.log(`💾 Wallet info saved to: ${walletInfoPath}`);

console.log('\n🎯 NEXT STEPS:');
console.log('1. The mnemonic has been saved to .env.local');
console.log('2. Start the agent to get the wallet address:');
console.log('   npm run build && elizaos start --character character-test.json');
console.log('3. The wallet address will be shown in logs when the plugin initializes');
console.log('4. Use that address in the Midnight Network faucet:');
console.log('   https://faucet.testnet.midnight.network');
console.log('5. Update API keys in .env.local');

console.log('\n✅ Wallet generation completed!');
