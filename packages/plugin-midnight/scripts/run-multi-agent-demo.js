#!/usr/bin/env node

/**
 * Midnight Network Multi-Agent Demonstration
 * Runs Alice and Bob agents to demonstrate Midnight Network functionality
 */

import { spawn } from 'child_process';
import { writeFileSync, readFileSync } from 'fs';
import dotenv from 'dotenv';
import path from 'path';

// Load environment
dotenv.config({ path: '.env.local' });

console.log('🚀 Starting Midnight Network Multi-Agent Demonstration\n');

// Configuration for both agents
const agents = {
  alice: {
    name: 'AliceAgent',
    config: 'agent1-alice.json',
    port: 3000,
    role: 'Initiator with funded wallet',
    mnemonic: process.env.MIDNIGHT_WALLET_MNEMONIC,
  },
  bob: {
    name: 'BobAgent',
    config: 'agent2-bob.json',
    port: 3001,
    role: 'Responder with new wallet',
    mnemonic:
      'abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon art',
  },
};

// Display configuration
console.log('📋 Agent Configuration:');
console.log(`Alice: ${agents.alice.role} (Port ${agents.alice.port})`);
console.log(`  Wallet: ${agents.alice.mnemonic.split(' ').slice(0, 4).join(' ')}... (funded)`);
console.log(`Bob: ${agents.bob.role} (Port ${agents.bob.port})`);
console.log(`  Wallet: ${agents.bob.mnemonic.split(' ').slice(0, 4).join(' ')}... (new)`);

console.log('\n🎭 Demonstration Scenario:');
console.log('1. Both agents start and initialize Midnight Network wallets');
console.log('2. Agents discover each other on the network');
console.log('3. Alice sends secure message to Bob using zero-knowledge proofs');
console.log('4. Alice sends private payment to Bob (1.0 MIDNIGHT tokens)');
console.log('5. Bob confirms receipt of message and payment');
console.log('6. Agents demonstrate private chat room creation');

console.log('\n🔧 Starting Agent Processes:');

// Start Alice agent
console.log('Starting Alice Agent...');
const aliceProcess = spawn('elizaos', ['start', '--character', agents.alice.config], {
  stdio: ['pipe', 'pipe', 'pipe'],
  env: {
    ...process.env,
    SERVER_PORT: agents.alice.port,
    MIDNIGHT_WALLET_MNEMONIC: agents.alice.mnemonic,
  },
});

// Start Bob agent (with delay)
setTimeout(() => {
  console.log('Starting Bob Agent...');
  const bobProcess = spawn('elizaos', ['start', '--character', agents.bob.config], {
    stdio: ['pipe', 'pipe', 'pipe'],
    env: {
      ...process.env,
      SERVER_PORT: agents.bob.port,
      MIDNIGHT_WALLET_MNEMONIC: agents.bob.mnemonic,
    },
  });

  // Handle Bob output
  bobProcess.stdout.on('data', (data) => {
    console.log(`[Bob] ${data.toString().trim()}`);
  });

  bobProcess.stderr.on('data', (data) => {
    console.log(`[Bob Error] ${data.toString().trim()}`);
  });

  bobProcess.on('close', (code) => {
    console.log(`Bob agent exited with code ${code}`);
  });
}, 5000);

// Handle Alice output
aliceProcess.stdout.on('data', (data) => {
  console.log(`[Alice] ${data.toString().trim()}`);
});

aliceProcess.stderr.on('data', (data) => {
  console.log(`[Alice Error] ${data.toString().trim()}`);
});

aliceProcess.on('close', (code) => {
  console.log(`Alice agent exited with code ${code}`);
});

// Instructions for user interaction
setTimeout(() => {
  console.log('\n📱 INTERACTION INSTRUCTIONS:');
  console.log('The agents are now running! You can interact with them via:');
  console.log('');
  console.log('Alice Agent (Funded Wallet):');
  console.log(`  - Web Interface: http://localhost:${agents.alice.port}`);
  console.log('  - Try: "Discover other Midnight Network agents"');
  console.log('  - Try: "Send secure message to Bob"');
  console.log('  - Try: "Send 0.5 MIDNIGHT tokens to Bob"');
  console.log('');
  console.log('Bob Agent (Receiver):');
  console.log(`  - Web Interface: http://localhost:${agents.bob.port}`);
  console.log('  - Try: "Check my wallet balance"');
  console.log('  - Try: "Join private chat room"');
  console.log('');
  console.log('🎯 Test Scenarios:');
  console.log('1. Agent Discovery: Ask Alice to discover other agents');
  console.log('2. Secure Messaging: Ask Alice to send secure message to Bob');
  console.log('3. Private Payments: Ask Alice to send payment to Bob');
  console.log('4. Chat Rooms: Ask Alice to create private chat room');
  console.log('5. Network Status: Ask either agent about Midnight Network status');
  console.log('');
  console.log('🔐 Privacy Features:');
  console.log('- All messages use zero-knowledge proof encryption');
  console.log('- Payment amounts and recipients are hidden');
  console.log('- Chat rooms are end-to-end encrypted');
  console.log('- Network observers cannot see private content');
  console.log('');
  console.log('Press Ctrl+C to stop both agents');
}, 10000);

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\n🛑 Shutting down agents...');
  aliceProcess.kill('SIGINT');
  process.exit(0);
});

// Keep the script running
setInterval(() => {
  // Keep alive
}, 1000);
