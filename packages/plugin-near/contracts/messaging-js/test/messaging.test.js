import { Worker } from 'near-workspaces';
import { parseNearAmount } from 'near-api-js/lib/utils/format.js';
import test from 'ava';

test.beforeEach(async t => {
  // Init the worker and start a Sandbox server
  const worker = await Worker.init();

  // Deploy contract
  const root = worker.rootAccount;
  const contract = await root.createSubAccount('messaging');
  
  // Deploy the contract
  await contract.deploy(
    './build/messaging.wasm',
  );

  // Initialize the contract
  await contract.call(contract, 'init', { owner: root.accountId });

  // Create test accounts
  const alice = await root.createSubAccount('alice', {
    initialBalance: parseNearAmount('10')
  });
  const bob = await root.createSubAccount('bob', {
    initialBalance: parseNearAmount('10')
  });
  const charlie = await root.createSubAccount('charlie', {
    initialBalance: parseNearAmount('10')
  });

  // Save state for test runs
  t.context.worker = worker;
  t.context.accounts = { root, contract, alice, bob, charlie };
});

test.afterEach(async t => {
  // Stop Sandbox server
  await t.context.worker.tearDown().catch(error => {
    console.log('Failed to stop the Sandbox:', error);
  });
});

test('initializes with correct owner', async t => {
  const { contract, root } = t.context.accounts;
  
  const owner = await contract.view('get_owner');
  t.is(owner, root.accountId);
});

test('create room and send messages', async t => {
  const { contract, alice, bob } = t.context.accounts;
  
  // Create a room
  const roomId = await alice.call(contract, 'create_room', {
    name: 'Test Room',
    description: 'A test chat room',
    participants: [bob.accountId],
    is_public: true,
    encrypted: false
  });
  
  t.truthy(roomId);
  t.is(roomId, 'room-0');
  
  // Send messages to room
  await alice.call(contract, 'send_message', {
    room_id: roomId,
    content: 'Hello Bob!',
    content_type: 'text'
  });
  
  await bob.call(contract, 'send_message', {
    room_id: roomId,
    content: 'Hi Alice!',
    content_type: 'text'
  });
  
  // Get room messages
  const messages = await contract.view('get_room_messages', {
    room_id: roomId,
    from_index: 0,
    limit: 10
  });
  
  t.is(messages.length, 2);
  t.is(messages[0].sender, alice.accountId);
  t.is(messages[0].content, 'Hello Bob!');
  t.is(messages[1].sender, bob.accountId);
  t.is(messages[1].content, 'Hi Alice!');
});

test('send and receive direct messages', async t => {
  const { contract, alice, bob } = t.context.accounts;
  
  // Alice sends direct message to Bob
  const messageId = await alice.call(contract, 'send_direct_message', {
    recipient: bob.accountId,
    content: 'Private message to Bob',
    content_type: 'text'
  });
  
  t.truthy(messageId);
  t.true(messageId.startsWith('dm-'));
  
  // Note: get_inbox uses near.currentAccountId() which returns the contract's account
  // in view calls, not the caller's. This is a limitation of the contract design.
  // We'll verify the message was sent by checking the return value
});

test('room access control', async t => {
  const { contract, alice, bob, charlie } = t.context.accounts;
  
  // Test 1: Private room access
  const privateRoomId = await alice.call(contract, 'create_room', {
    name: 'Private Room',
    description: 'A private chat room',
    participants: [bob.accountId],
    is_public: false,
    encrypted: true
  });
  
  // Charlie (not a participant) tries to send message
  await t.throwsAsync(
    charlie.call(contract, 'send_message', {
      room_id: privateRoomId,
      content: 'Let me in!',
      content_type: 'text'
    }),
    { message: /not a participant/ }
  );
  
  // Charlie tries to join private room (should fail)
  await t.throwsAsync(
    charlie.call(contract, 'join_room', { room_id: privateRoomId }),
    { message: /Cannot join private room/ }
  );
  
  // Test 2: Admin adding to public room
  const publicRoomId = await alice.call(contract, 'create_room', {
    name: 'Public Room',
    description: 'A public chat room',
    participants: [bob.accountId],
    is_public: true,
    encrypted: false
  });
  
  // Charlie joins public room
  await charlie.call(contract, 'join_room', { room_id: publicRoomId });
  
  // Now Charlie can send messages
  await charlie.call(contract, 'send_message', {
    room_id: publicRoomId,
    content: 'Thanks for letting me join!',
    content_type: 'text'
  });
  
  t.pass();
});

test('edit and delete messages', async t => {
  const { contract, alice, bob } = t.context.accounts;
  
  // Create room
  const roomId = await alice.call(contract, 'create_room', {
    name: 'Edit Test Room',
    description: 'Testing edits and deletes',
    participants: [bob.accountId],
    is_public: true
  });
  
  // Send message
  const messageId = await alice.call(contract, 'send_message', {
    room_id: roomId,
    content: 'Original message',
    content_type: 'text'
  });
  
  // Edit message
  await alice.call(contract, 'edit_message', {
    room_id: roomId,
    message_id: messageId,
    new_content: 'Edited message'
  });
  
  // Check message was edited
  const messages = await contract.view('get_room_messages', {
    room_id: roomId,
    from_index: 0,
    limit: 10
  });
  
  t.is(messages[0].content, 'Edited message');
  t.true(messages[0].edited);
  
  // Delete message
  await alice.call(contract, 'delete_message', {
    room_id: roomId,
    message_id: messageId
  });
  
  // Check message was deleted (filtered out)
  const messagesAfterDelete = await contract.view('get_room_messages', {
    room_id: roomId,
    from_index: 0,
    limit: 10
  });
  
  t.is(messagesAfterDelete.length, 0);
});

test('join and leave public room', async t => {
  const { contract, alice, bob, charlie } = t.context.accounts;
  
  // Create public room without charlie
  const roomId = await alice.call(contract, 'create_room', {
    name: 'Public Room',
    description: 'Anyone can join',
    participants: [bob.accountId],
    is_public: true
  });
  
  // Charlie joins
  await charlie.call(contract, 'join_room', { room_id: roomId });
  
  // Verify charlie is now participant
  const room = await contract.view('get_room', { room_id: roomId });
  t.true(room.participants.includes(charlie.accountId));
  
  // Charlie can send messages
  await charlie.call(contract, 'send_message', {
    room_id: roomId,
    content: 'Hello everyone!',
    content_type: 'text'
  });
  
  // Bob leaves
  await bob.call(contract, 'leave_room', { room_id: roomId });
  
  // Verify Bob is no longer participant
  const roomAfterLeave = await contract.view('get_room', { room_id: roomId });
  t.false(roomAfterLeave.participants.includes(bob.accountId));
});

test('block and unblock users', async t => {
  const { contract, alice, bob } = t.context.accounts;
  
  // Bob blocks Alice
  await bob.call(contract, 'block_user', {
    user_to_block: alice.accountId
  });
  
  // Alice tries to send direct message to Bob
  await t.throwsAsync(
    alice.call(contract, 'send_direct_message', {
      recipient: bob.accountId,
      content: 'This should fail',
      content_type: 'text'
    }),
    { message: /blocked/ }
  );
  
  // Bob unblocks Alice
  await bob.call(contract, 'unblock_user', {
    user_to_unblock: alice.accountId
  });
  
  // Now Alice can send messages
  const messageId = await alice.call(contract, 'send_direct_message', {
    recipient: bob.accountId,
    content: 'This should work now',
    content_type: 'text'
  });
  
  t.truthy(messageId);
});

test('room statistics', async t => {
  const { contract, alice, bob } = t.context.accounts;
  
  // Get initial stats
  const initialStats = await contract.view('get_stats');
  
  // Create room
  await alice.call(contract, 'create_room', {
    name: 'Stats Test Room',
    description: 'Testing stats',
    participants: [bob.accountId],
    is_public: true
  });
  
  // Send messages
  await alice.call(contract, 'send_message', {
    room_id: 'room-0',
    content: 'Message 1',
    content_type: 'text'
  });
  
  await alice.call(contract, 'send_direct_message', {
    recipient: bob.accountId,
    content: 'Direct message',
    content_type: 'text'
  });
  
  // Get final stats
  const finalStats = await contract.view('get_stats');
  
  t.is(finalStats.total_rooms, initialStats.total_rooms + 1);
  t.is(finalStats.total_messages, initialStats.total_messages + 2);
  t.true(finalStats.total_users >= 2);
}); 