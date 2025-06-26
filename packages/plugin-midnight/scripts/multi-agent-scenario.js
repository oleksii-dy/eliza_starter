#!/usr/bin/env node

/**
 * Multi-Agent Midnight Network Scenario Test
 * Tests two agents interacting on Midnight Network with transactions
 */

import dotenv from 'dotenv';
import { spawn } from 'child_process';
import { writeFileSync, readFileSync } from 'fs';
import path from 'path';
import { generateMnemonic } from 'bip39';

// Load environment variables
dotenv.config({ path: '.env.local' });

console.log('🚀 Midnight Network Multi-Agent Scenario Test\n');

// Create two agent configurations
const createAgentConfig = (name, username, mnemonic, port) => ({
  name,
  username,
  bio: [
    `I am ${name}, a Midnight Network agent specialized in secure, private communication and payments.`,
    `I can send encrypted messages, create private chat rooms, and process payments using zero-knowledge proofs.`,
    `I operate on the Midnight Network testnet for secure and private interactions.`,
    `My capabilities include secure messaging, payment processing, agent discovery, and chat room management.`,
  ],
  system: `You are ${name}, a specialized agent for the Midnight Network ecosystem. You have access to advanced privacy-preserving capabilities including:

1. Secure messaging with zero-knowledge proofs
2. Private payment processing  
3. Encrypted chat room creation and management
4. Decentralized agent discovery

You should:
- Prioritize user privacy and security in all interactions
- Explain the benefits of zero-knowledge proofs when relevant
- Help users understand Midnight Network's privacy features
- Guide users through secure messaging and payment processes
- Be helpful but always emphasize the importance of keeping private keys secure

You are currently running on the Midnight Network testnet for safe testing and demonstration purposes.`,
  messageExamples: [
    [
      {
        user: '{{user1}}',
        content: {
          text: 'Can you send a secure message?',
        },
      },
      {
        user: name,
        content: {
          text: `I can help you send secure, encrypted messages using Midnight Network's zero-knowledge proof technology. To send a secure message, I need:

1. The recipient's agent ID or address
2. The message content you want to send

The message will be encrypted and transmitted privately through the Midnight Network. Would you like me to send a secure message to someone?`,
        },
      },
    ],
    [
      {
        user: '{{user1}}',
        content: {
          text: 'How do payments work?',
        },
      },
      {
        user: name,
        content: {
          text: `Midnight Network payments are completely private using zero-knowledge proofs. Here's how they work:

• **Private amounts**: Transaction amounts are hidden from observers
• **Anonymous recipients**: Recipient addresses are protected  
• **Zero-knowledge proofs**: Cryptographic verification without revealing details
• **Testnet tokens**: I'm currently using testnet MIDNIGHT tokens for safe testing

I can help you send payments or request payments from other agents. The entire process is cryptographically secure and private. What would you like to do?`,
        },
      },
    ],
  ],
  knowledge: [],
  plugins: ['@elizaos/plugin-midnight'],
  settings: {
    secrets: {
      MIDNIGHT_WALLET_MNEMONIC: mnemonic,
      SERVER_PORT: port,
    },
    voice: {
      model: 'en_US-hfc_female-medium',
    },
  },
  style: {
    all: [
      'Be professional and security-focused',
      'Explain privacy benefits clearly',
      'Use technical terms when appropriate but explain them',
      'Emphasize the importance of privacy and security',
      'Be helpful and educational about Midnight Network features',
    ],
    chat: [
      'Keep responses concise but informative',
      'Ask clarifying questions when needed',
      'Provide step-by-step guidance for complex operations',
    ],
    post: [
      'Share insights about privacy-preserving technology',
      'Educate about zero-knowledge proofs',
      'Discuss Midnight Network capabilities',
    ],
  },
});

async function createMultiAgentScenario() {
  console.log('📝 Creating multi-agent configuration...');

  // Generate mnemonics for two agents
  const agent1Mnemonic = process.env.MIDNIGHT_WALLET_MNEMONIC || generateMnemonic(256);
  const agent2Mnemonic = generateMnemonic(256);

  // Create agent configurations
  const agent1Config = createAgentConfig('AliceAgent', 'alice_midnight', agent1Mnemonic, 3000);
  const agent2Config = createAgentConfig('BobAgent', 'bob_midnight', agent2Mnemonic, 3001);

  // Write agent config files
  writeFileSync('agent1-alice.json', JSON.stringify(agent1Config, null, 2));
  writeFileSync('agent2-bob.json', JSON.stringify(agent2Config, null, 2));

  console.log('✅ Created agent configurations:');
  console.log('   - agent1-alice.json (Alice - funded wallet)');
  console.log('   - agent2-bob.json (Bob - new wallet)');

  // Create environment files for each agent
  const baseEnv = readFileSync('.env.local', 'utf8');

  const agent1Env =
    baseEnv.replace(
      /MIDNIGHT_WALLET_MNEMONIC=".*"/,
      `MIDNIGHT_WALLET_MNEMONIC="${agent1Mnemonic}"`
    ) + '\nSERVER_PORT=3000\n';

  const agent2Env =
    baseEnv.replace(
      /MIDNIGHT_WALLET_MNEMONIC=".*"/,
      `MIDNIGHT_WALLET_MNEMONIC="${agent2Mnemonic}"`
    ) + '\nSERVER_PORT=3001\n';

  writeFileSync('.env.agent1', agent1Env);
  writeFileSync('.env.agent2', agent2Env);

  console.log('✅ Created environment configurations for both agents');

  return {
    agent1: { config: 'agent1-alice.json', env: '.env.agent1', mnemonic: agent1Mnemonic },
    agent2: { config: 'agent2-bob.json', env: '.env.agent2', mnemonic: agent2Mnemonic },
  };
}

async function runScenarioTest() {
  try {
    const agents = await createMultiAgentScenario();

    console.log('\n🎭 Multi-Agent Scenario Plan:');
    console.log('1. Alice (funded wallet) will discover Bob');
    console.log('2. Alice will send a secure message to Bob');
    console.log('3. Alice will send a payment to Bob');
    console.log('4. Bob will receive and acknowledge both');
    console.log('5. Both agents will demonstrate privacy features');

    console.log('\n📋 Agent Details:');
    console.log(
      `Alice Mnemonic: ${agents.agent1.mnemonic.split(' ').slice(0, 4).join(' ')}... (funded)`
    );
    console.log(
      `Bob Mnemonic: ${agents.agent2.mnemonic.split(' ').slice(0, 4).join(' ')}... (new)`
    );

    console.log('\n🚀 To run the scenario:');
    console.log('1. Start Alice: elizaos start --character agent1-alice.json --env .env.agent1');
    console.log('2. Start Bob: elizaos start --character agent2-bob.json --env .env.agent2');
    console.log('3. Both agents will initialize their Midnight Network wallets');
    console.log('4. Test interactions through their respective interfaces');

    console.log("\n💰 Funding Bob's Wallet:");
    console.log('- Bob will need testnet tokens to participate in transactions');
    console.log('- Alice can send tokens to Bob as part of the test scenario');
    console.log('- Or fund Bob separately via the faucet');

    console.log('\n🧪 Test Scenarios to Execute:');
    console.log('A. Agent Discovery - Alice finds Bob on the network');
    console.log('B. Secure Messaging - Alice sends encrypted message to Bob');
    console.log('C. Payment Transfer - Alice sends MIDNIGHT tokens to Bob');
    console.log('D. Chat Room Creation - Alice creates private room, invites Bob');
    console.log('E. Multi-party Communication - Both agents in shared room');

    return agents;
  } catch (error) {
    console.error('❌ Scenario setup failed:', error.message);
    throw error;
  }
}

// Export for testing or run directly
export { createMultiAgentScenario, runScenarioTest };

if (import.meta.url === `file://${process.argv[1]}`) {
  runScenarioTest().catch((error) => {
    console.error('Multi-agent scenario failed:', error.message);
    process.exit(1);
  });
}
