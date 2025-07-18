#!/usr/bin/env node

/**
 * NEAR Plugin Agent Demonstration
 * 
 * This script demonstrates how an agent with the NEAR plugin
 * receives messages, processes them, and responds.
 */

import { AgentRuntime, ModelManager } from '@elizaos/core';
import nearPlugin from './dist/index.js';
import readline from 'readline';

// Mock model provider for demonstration
const mockModelProvider = {
  name: 'mock-model',
  async generate(prompt, context) {
    // Simple pattern matching for demonstration
    const text = context.recentMessages?.[0]?.content?.text || '';
    
    if (text.includes('balance')) {
      return 'I\'ll check your NEAR wallet balance for you.';
    } else if (text.includes('send') && text.includes('NEAR')) {
      const match = text.match(/send\s+([\d.]+)\s+NEAR\s+to\s+(\S+)/i);
      if (match) {
        return `I'll help you send ${match[1]} NEAR to ${match[2]}.`;
      }
      return 'Please specify the amount and recipient address.';
    } else if (text.includes('hello') || text.includes('hi')) {
      return 'Hello! I can help you with NEAR transactions. You can ask me to check your balance or send NEAR tokens.';
    }
    return 'I can help you check your NEAR balance or send NEAR tokens. What would you like to do?';
  }
};

async function createDemoAgent() {
  console.log('🤖 NEAR Agent Demo Starting...\n');
  
  // Check for required environment variables
  if (!process.env.NEAR_ADDRESS || !process.env.NEAR_WALLET_SECRET_KEY) {
    console.error('❌ Missing required environment variables:');
    console.error('   - NEAR_ADDRESS');
    console.error('   - NEAR_WALLET_SECRET_KEY');
    console.error('\nPlease set these in your .env file');
    process.exit(1);
  }
  
  // Create character configuration
  const character = {
    id: 'near-demo-agent',
    name: 'NEAR Assistant',
    system: 'You are a helpful NEAR Protocol assistant that can check balances and send transactions.',
    modelProvider: 'mock-model',
  };
  
  // Create runtime
  const runtime = new AgentRuntime({
    character,
    plugins: [nearPlugin],
    providers: [mockModelProvider],
    conversationLength: 10,
  });
  
  // Initialize the runtime
  await runtime.initialize();
  
  console.log('✅ Agent initialized successfully');
  console.log(`💳 Wallet: ${process.env.NEAR_ADDRESS}\n`);
  
  // Demo: Check wallet balance
  console.log('📊 Checking wallet balance...');
  const walletProvider = nearPlugin.providers.find(p => p.name === 'near-wallet');
  if (walletProvider) {
    const balanceInfo = await walletProvider.get(runtime, {});
    console.log(balanceInfo.text);
  }
  
  // Create readline interface for interactive demo
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });
  
  console.log('\n💬 Interactive Demo - Type messages to the agent:');
  console.log('   Examples:');
  console.log('   - "What\'s my balance?"');
  console.log('   - "Send 0.1 NEAR to alice.testnet"');
  console.log('   - Type "exit" to quit\n');
  
  // Message handling loop
  const askQuestion = () => {
    rl.question('You: ', async (input) => {
      if (input.toLowerCase() === 'exit') {
        console.log('\n👋 Goodbye!');
        rl.close();
        process.exit(0);
      }
      
      // Create message
      const message = {
        id: Date.now().toString(),
        content: { text: input, source: 'user' },
        userId: 'demo-user',
        roomId: 'demo-room',
        createdAt: Date.now(),
      };
      
      // Process through actions
      let handled = false;
      
      // Check if any action can handle this
      for (const action of nearPlugin.actions) {
        if (await action.validate(runtime, message)) {
          console.log(`\n🔄 Processing with ${action.name}...`);
          
          try {
            await action.handler(runtime, message, undefined, undefined, async (response) => {
              if (response) {
                console.log(`Agent: ${response.text || 'Action completed'}`);
                handled = true;
              }
            });
          } catch (error) {
            console.log(`Agent: Sorry, there was an error: ${error.message}`);
            handled = true;
          }
          break;
        }
      }
      
      // If no action handled it, check providers
      if (!handled) {
        // Try wallet provider for balance queries
        if (input.toLowerCase().includes('balance')) {
          const result = await walletProvider.get(runtime, message);
          console.log(`Agent: ${result.text}`);
        } else {
          // Generate a response using the model
          const response = await runtime.generateResponse(message);
          console.log(`Agent: ${response}`);
        }
      }
      
      console.log('');
      askQuestion();
    });
  };
  
  askQuestion();
}

// Run the demo
createDemoAgent().catch(console.error); 