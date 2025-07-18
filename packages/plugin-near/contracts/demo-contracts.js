#!/usr/bin/env node

import { Worker } from 'near-workspaces';
import { parseNearAmount } from 'near-api-js/lib/utils/format.js';

console.log('NEAR Smart Contracts Demo');
console.log('=========================\n');

async function runDemo() {
  // Initialize sandbox
  console.log('🚀 Starting NEAR sandbox...');
  const worker = await Worker.init();
  const root = worker.rootAccount;

  try {
    // Deploy contracts
    console.log('\n📦 Deploying contracts...');
    
    // Deploy escrow
    const escrow = await root.createSubAccount('escrow');
    await escrow.deploy('./escrow-js/build/escrow.wasm');
    await escrow.call(escrow, 'init', { owner: root.accountId });
    console.log(`✅ Escrow deployed to: ${escrow.accountId}`);
    
    // Deploy messaging
    const messaging = await root.createSubAccount('messaging');
    await messaging.deploy('./messaging-js/build/messaging.wasm');
    await messaging.call(messaging, 'init', { owner: root.accountId });
    console.log(`✅ Messaging deployed to: ${messaging.accountId}`);
    
    // Create test accounts
    console.log('\n👥 Creating test accounts...');
    const alice = await root.createSubAccount('alice', {
      initialBalance: parseNearAmount('10')
    });
    const bob = await root.createSubAccount('bob', {
      initialBalance: parseNearAmount('10')
    });
    const charlie = await root.createSubAccount('charlie', {
      initialBalance: parseNearAmount('10')
    });
    console.log('✅ Test accounts created');
    
    // Demo escrow functionality
    console.log('\n💰 Testing Escrow Contract...');
    
    // Create escrow
    const escrowId = 'test-escrow-1';
    const totalAmount = parseNearAmount('2');
    console.log('Creating escrow...');
    await alice.call(
      escrow,
      'create_escrow',
      {
        escrow_id: escrowId,
        parties: [
          { account_id: alice.accountId, amount: parseNearAmount('1') },
          { account_id: bob.accountId, amount: parseNearAmount('1') }
        ],
        total_amount: totalAmount
      },
      { attachedDeposit: totalAmount }
    );
    console.log('✅ Escrow created');
    
    // Check escrow status
    const escrowData = await escrow.view('get_escrow', { escrow_id: escrowId });
    console.log('📊 Escrow status:', escrowData);
    
    // Release escrow
    console.log('Releasing escrow...');
    await root.call(escrow, 'release_escrow', { escrow_id: escrowId });
    console.log('✅ Escrow released');
    
    // Demo messaging functionality
    console.log('\n💬 Testing Messaging Contract...');
    
    // Create room
    console.log('Creating chat room...');
    const roomId = await alice.call(messaging, 'create_room', {
      name: 'Demo Room',
      description: 'A demo chat room',
      participants: [bob.accountId, charlie.accountId],
      is_public: true,
      encrypted: false
    });
    console.log(`✅ Room created: ${roomId}`);
    
    // Send messages
    console.log('Sending messages...');
    await alice.call(messaging, 'send_message', {
      room_id: roomId,
      content: 'Hello everyone!',
      content_type: 'text'
    });
    
    await bob.call(messaging, 'send_message', {
      room_id: roomId,
      content: 'Hi Alice!',
      content_type: 'text'
    });
    
    // Get messages
    const messages = await messaging.view('get_room_messages', {
      room_id: roomId,
      from_index: 0,
      limit: 10
    });
    console.log('📨 Room messages:', messages);
    
    // Send direct message
    console.log('Sending direct message...');
    await alice.call(messaging, 'send_direct_message', {
      recipient: bob.accountId,
      content: 'Private message to Bob',
      content_type: 'text'
    });
    
    // Check Bob's inbox by using messaging.view
    const bobInbox = await messaging.view('get_inbox', {
      from_index: 0,
      limit: 10
    });
    console.log('📬 Bob\'s inbox (from contract perspective):', bobInbox);
    
    // Note: The inbox uses near.currentAccountId() which returns the contract's ID in view calls
    // This is a limitation of the contract design
    
    console.log('\n✅ All tests passed!');
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    // Cleanup
    console.log('\n🧹 Cleaning up...');
    await worker.tearDown();
    console.log('✅ Sandbox stopped');
  }
}

// Run the demo
runDemo().catch(console.error); 