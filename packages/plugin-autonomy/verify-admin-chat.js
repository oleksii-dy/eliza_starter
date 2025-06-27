#!/usr/bin/env node

/**
 * Simple verification script for Admin Chat functionality
 * This demonstrates the complete flow without complex test framework dependencies
 */

import { adminChatProvider, setAdminAction } from './dist/index.js';

// Mock UUID function
function asUUID(str) {
  if (!str) {
    // Generate a proper UUID format
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
      const r = (Math.random() * 16) | 0;
      const v = c == 'x' ? r : (r & 0x3) | 0x8;
      return v.toString(16);
    });
  }
  return str;
}

// Mock runtime
class MockRuntime {
  constructor() {
    this.agentId = asUUID('demo-agent-12345');
    this.character = {
      name: 'DemoAgent',
      bio: 'Demo agent for admin chat',
      settings: {},
    };
    this.memories = [];
  }

  getSetting(key) {
    return this.character.settings?.[key];
  }

  async getMemories(params) {
    if (params.entityId) {
      return this.memories.filter((m) => m.entityId === params.entityId);
    }
    if (params.roomId) {
      return this.memories.filter((m) => m.roomId === params.roomId);
    }
    return this.memories.slice(0, params.count || 10);
  }

  async createMemory(memory, tableName) {
    this.memories.push({
      ...memory,
      createdAt: memory.createdAt || Date.now(),
    });
  }

  getService(name) {
    return null;
  }
}

async function verifyAdminChat() {
  console.log('🚀 Starting Admin Chat Verification\n');

  const runtime = new MockRuntime();

  // Simulate web GUI user ID (proper UUID format like web browser would generate)
  const webGuiUserId = 'a1b2c3d4-5678-4abc-b123-123456789012';
  const roomId = asUUID('demo-room-001');

  console.log(`👤 Web GUI User ID: ${webGuiUserId}`);
  console.log(`🏠 Room ID: ${roomId}\n`);

  // Test 1: No admin configured
  console.log('TEST 1: AdminChat provider with no admin configured');
  console.log('-'.repeat(50));

  const testMessage = {
    id: asUUID('test-msg-001'),
    entityId: webGuiUserId,
    roomId,
    content: { text: 'Test message' },
  };

  let result = await adminChatProvider.get(runtime, testMessage, undefined);
  console.log('✓ Result:', `${result.text.substring(0, 100)}...`);
  console.log('✓ Admin configured:', result.data?.adminConfigured);
  console.log('');

  // Test 2: Set admin user
  console.log('TEST 2: Setting admin user');
  console.log('-'.repeat(50));

  const setAdminMessage = {
    id: asUUID('set-admin-msg'),
    entityId: webGuiUserId,
    roomId,
    content: { text: 'Set me as admin' },
  };

  let callbackResult = null;
  const mockCallback = async (response) => {
    callbackResult = response;
    return [];
  };

  // First check if the message validates
  const validates = await setAdminAction.validate(runtime, setAdminMessage);
  console.log('✓ Message validates:', validates);

  const adminSetSuccess = await setAdminAction.handler(
    runtime,
    setAdminMessage,
    undefined,
    undefined,
    mockCallback
  );

  console.log('✓ Set admin success:', adminSetSuccess);
  console.log('✓ Callback result:', `${callbackResult?.text?.substring(0, 50)}...`);
  console.log('✓ Admin ID set to:', runtime.character.settings?.ADMIN_USER_ID);
  console.log('');

  // Test 3: Add admin messages
  console.log('TEST 3: Adding admin messages');
  console.log('-'.repeat(50));

  const adminMessages = [
    {
      id: asUUID('admin-msg-1'),
      entityId: webGuiUserId,
      roomId,
      content: { text: 'Please monitor the system every hour' },
      createdAt: Date.now(),
    },
    {
      id: asUUID('admin-msg-2'),
      entityId: webGuiUserId,
      roomId,
      content: { text: 'Alert me of any security issues immediately' },
      createdAt: Date.now() + 1000,
    },
  ];

  for (const msg of adminMessages) {
    await runtime.createMemory(msg, 'memories');
    console.log(`✓ Added: "${msg.content.text}"`);
  }
  console.log('');

  // Test 4: AdminChat provider retrieval
  console.log('TEST 4: AdminChat provider retrieval');
  console.log('-'.repeat(50));

  const autonomousMessage = {
    id: asUUID('autonomous-msg'),
    entityId: runtime.agentId,
    roomId: asUUID(`autonomous-${runtime.agentId}`),
    content: {
      text: 'What should I do next?',
      providers: ['ADMIN_CHAT'],
    },
  };

  result = await adminChatProvider.get(runtime, autonomousMessage, undefined);

  console.log('✓ Admin configured:', result.data?.adminConfigured);
  console.log('✓ Message count:', result.data?.messageCount);
  console.log('✓ Contains "monitor":', result.text.includes('monitor'));
  console.log('✓ Contains "Admin:":', result.text.includes('Admin:'));
  console.log('');
  console.log('Full admin chat:');
  console.log(result.text);
  console.log('');

  // Test 5: Non-admin message filtering
  console.log('TEST 5: Non-admin message filtering');
  console.log('-'.repeat(50));

  const nonAdminMessage = {
    id: asUUID('non-admin-msg'),
    entityId: asUUID('other-user-9999'),
    roomId,
    content: { text: 'Hello from regular user!' },
    createdAt: Date.now() + 2000,
  };

  await runtime.createMemory(nonAdminMessage, 'memories');

  result = await adminChatProvider.get(runtime, autonomousMessage, undefined);

  console.log('✓ Still shows admin messages:', result.text.includes('monitor'));
  console.log('✓ Filters out non-admin:', !result.text.includes('regular user'));
  console.log('');

  // Final verification
  console.log('FINAL VERIFICATION');
  console.log('='.repeat(50));

  const checks = {
    adminSetup: runtime.character.settings?.ADMIN_USER_ID === webGuiUserId,
    messagesFound: (result.data?.messageCount || 0) >= 2,
    correctFiltering: result.text.includes('monitor') && !result.text.includes('regular user'),
    correctFormat: result.text.includes('Admin:'),
  };

  console.log('✓ Admin setup:', checks.adminSetup);
  console.log('✓ Messages found:', checks.messagesFound);
  console.log('✓ Correct filtering:', checks.correctFiltering);
  console.log('✓ Correct format:', checks.correctFormat);

  const allPassed = Object.values(checks).every((v) => v === true);
  console.log('');
  console.log(`🎉 RESULT: ${allPassed ? 'ALL TESTS PASSED' : 'SOME TESTS FAILED'}`);

  if (allPassed) {
    console.log('');
    console.log('🌟 Admin Chat is working correctly!');
    console.log('   - User can set themselves as admin');
    console.log('   - Admin messages are stored and retrieved');
    console.log('   - Agent can access admin conversation');
    console.log('   - Non-admin messages are filtered out');
  }

  return allPassed;
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  verifyAdminChat()
    .then((success) => {
      process.exit(success ? 0 : 1);
    })
    .catch((error) => {
      console.error('Verification failed:', error);
      process.exit(1);
    });
}

export { verifyAdminChat };
