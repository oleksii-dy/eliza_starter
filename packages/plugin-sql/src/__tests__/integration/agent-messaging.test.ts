import { describe, it, expect, beforeAll, afterAll } from 'bun:test';
import { AgentRuntime, type Memory, type UUID } from '@elizaos/core';
import { v4 as uuidv4 } from 'uuid';
import { createIsolatedTestDatabase } from '../test-helpers';
import type { PgliteDatabaseAdapter } from '../../pglite/adapter';
import type { PgDatabaseAdapter } from '../../pg/adapter';

describe('Agent Messaging with PGLite', () => {
  let adapter: PgliteDatabaseAdapter | PgDatabaseAdapter;
  let runtime: AgentRuntime;
  let cleanup: () => Promise<void>;
  let testAgentId: UUID;
  let roomId: UUID;
  let userId: UUID;

  beforeAll(async () => {
    // Create isolated test database
    const setup = await createIsolatedTestDatabase('agent-messaging');
    adapter = setup.adapter;
    runtime = setup.runtime;
    cleanup = setup.cleanup;
    testAgentId = setup.testAgentId;

    // Create test room and user
    roomId = uuidv4() as UUID;
    userId = uuidv4() as UUID;

    await adapter.createRoom({
      id: roomId,
      name: 'Test Chat Room',
      agentId: testAgentId,
      source: 'test',
      type: 'dm',
    });

    await adapter.createEntities([
      {
        id: userId,
        names: ['Test User'],
        agentId: testAgentId,
        metadata: { type: 'user' },
      },
    ]);
  }, 30000);

  afterAll(async () => {
    if (cleanup) {
      await cleanup();
    }
  });

  it('should allow agent to receive and respond to messages', async () => {
    console.log('[Test] Creating user message...');

    // User sends a message
    const userMessage: Memory = {
      id: uuidv4() as UUID,
      entityId: userId,
      roomId,
      agentId: testAgentId,
      content: {
        text: 'Hello agent, can you help me?',
        source: 'test',
      },
      createdAt: Date.now(),
    };

    // Store the user message
    await adapter.createMemory(userMessage, 'messages');

    // Verify message was stored
    const storedMessages = await adapter.getMemories({
      roomId,
      count: 10,
      tableName: 'messages',
    });

    expect(storedMessages).toHaveLength(1);
    expect(storedMessages[0].content.text).toBe('Hello agent, can you help me?');

    console.log('[Test] User message stored successfully');

    // Simulate agent processing and responding
    console.log('[Test] Creating agent response...');

    const agentResponse: Memory = {
      id: uuidv4() as UUID,
      entityId: testAgentId, // Agent's own ID
      roomId,
      agentId: testAgentId,
      content: {
        text: 'Hello! I would be happy to help you. What do you need assistance with?',
        source: 'agent',
        inReplyTo: userMessage.id,
      },
      createdAt: Date.now() + 1000, // 1 second later
    };

    // Store the agent response
    await adapter.createMemory(agentResponse, 'messages');

    // Verify both messages are in the conversation
    const conversation = await adapter.getMemories({
      roomId,
      count: 10,
      tableName: 'messages',
    });

    expect(conversation).toHaveLength(2);
    expect(conversation[0].entityId).toBe(userId);
    expect(conversation[0].content.text).toContain('Hello agent');
    expect(conversation[1].entityId).toBe(testAgentId);
    expect(conversation[1].content.text).toContain('happy to help');
    expect(conversation[1].content.inReplyTo).toBe(userMessage.id);

    console.log('[Test] Agent response stored successfully');
  });

  it('should handle multiple back-and-forth messages', async () => {
    const conversationRoomId = uuidv4() as UUID;

    await adapter.createRoom({
      id: conversationRoomId,
      name: 'Conversation Room',
      agentId: testAgentId,
      source: 'test',
      type: 'dm',
    });

    // Create a conversation
    const messages = [
      { entity: userId, text: 'What is the weather like today?' },
      {
        entity: testAgentId,
        text: "I don't have access to real-time weather data, but I can help you find weather information.",
      },
      { entity: userId, text: 'How can I check the weather?' },
      {
        entity: testAgentId,
        text: 'You can check weather websites like weather.com or use weather apps on your phone.',
      },
      { entity: userId, text: 'Thanks for the help!' },
      { entity: testAgentId, text: "You're welcome! Is there anything else I can help you with?" },
    ];

    // Store all messages
    for (let i = 0; i < messages.length; i++) {
      const message: Memory = {
        id: uuidv4() as UUID,
        entityId: messages[i].entity,
        roomId: conversationRoomId,
        agentId: testAgentId,
        content: {
          text: messages[i].text,
          source: messages[i].entity === userId ? 'user' : 'agent',
        },
        createdAt: Date.now() + i * 1000, // Space messages 1 second apart
      };

      await adapter.createMemory(message, 'messages');
    }

    // Retrieve the conversation
    const conversation = await adapter.getMemories({
      roomId: conversationRoomId,
      count: 20,
      tableName: 'messages',
    });

    expect(conversation).toHaveLength(6);

    // Verify alternating pattern
    for (let i = 0; i < messages.length; i++) {
      expect(conversation[i].entityId).toBe(messages[i].entity);
      expect(conversation[i].content.text).toBe(messages[i].text);
    }

    console.log('[Test] Multi-turn conversation verified successfully');
  });

  it('should handle sudden shutdown and restart', async () => {
    const testRoomId = uuidv4() as UUID;

    await adapter.createRoom({
      id: testRoomId,
      name: 'Shutdown Test Room',
      agentId: testAgentId,
      source: 'test',
      type: 'dm',
    });

    // Store a message before shutdown
    const messageBeforeShutdown: Memory = {
      id: uuidv4() as UUID,
      entityId: userId,
      roomId: testRoomId,
      agentId: testAgentId,
      content: {
        text: 'Message before shutdown',
        source: 'test',
      },
      createdAt: Date.now(),
    };

    await adapter.createMemory(messageBeforeShutdown, 'messages');

    console.log('[Test] Simulating sudden shutdown...');

    // Simulate sudden shutdown
    await adapter.close();

    // Verify adapter reports as not ready
    const isReadyAfterClose = await adapter.isReady();
    expect(isReadyAfterClose).toBe(false);

    console.log('[Test] Adapter closed. Simulating restart...');

    // For PGLite in-memory, we need to create a new adapter
    // In real scenarios with file-based PGLite, data would persist
    const isPGLite = adapter.constructor.name === 'PgliteDatabaseAdapter';

    if (isPGLite) {
      console.log(
        '[Test] Note: In-memory PGLite loses data on shutdown. In production, use file-based storage.'
      );
    }

    // Re-initialize the adapter
    await adapter.init();

    // Verify adapter is ready again
    const isReadyAfterRestart = await adapter.isReady();
    expect(isReadyAfterRestart).toBe(true);

    // Store a new message after restart
    const messageAfterRestart: Memory = {
      id: uuidv4() as UUID,
      entityId: testAgentId,
      roomId: testRoomId,
      agentId: testAgentId,
      content: {
        text: 'Agent is back online after restart',
        source: 'agent',
      },
      createdAt: Date.now() + 5000,
    };

    await adapter.createMemory(messageAfterRestart, 'messages');

    // Verify we can retrieve messages
    const messagesAfterRestart = await adapter.getMemories({
      roomId: testRoomId,
      count: 10,
      tableName: 'messages',
    });

    // For in-memory PGLite, we'll only have the new message
    // For file-based PGLite or PostgreSQL, we'd have both
    expect(messagesAfterRestart.length).toBeGreaterThan(0);

    console.log('[Test] Successfully handled shutdown and restart');
  });

  it('should handle rapid message sending', async () => {
    const rapidRoomId = uuidv4() as UUID;

    await adapter.createRoom({
      id: rapidRoomId,
      name: 'Rapid Messages Room',
      agentId: testAgentId,
      source: 'test',
      type: 'dm',
    });

    // Send 10 messages rapidly
    const messagePromises = [];
    for (let i = 0; i < 10; i++) {
      const message: Memory = {
        id: uuidv4() as UUID,
        entityId: i % 2 === 0 ? userId : testAgentId,
        roomId: rapidRoomId,
        agentId: testAgentId,
        content: {
          text: `Rapid message ${i}`,
          source: i % 2 === 0 ? 'user' : 'agent',
        },
        createdAt: Date.now() + i,
      };

      messagePromises.push(adapter.createMemory(message, 'messages'));
    }

    // Wait for all messages to be stored
    await Promise.all(messagePromises);

    // Verify all messages were stored
    const rapidMessages = await adapter.getMemories({
      roomId: rapidRoomId,
      count: 20,
      tableName: 'messages',
    });

    expect(rapidMessages).toHaveLength(10);

    // Verify message order
    for (let i = 0; i < 10; i++) {
      expect(rapidMessages[i].content.text).toContain(`Rapid message ${i}`);
    }

    console.log('[Test] Successfully handled rapid message sending');
  });

  it('should properly manage message search and retrieval', async () => {
    const searchRoomId = uuidv4() as UUID;

    await adapter.createRoom({
      id: searchRoomId,
      name: 'Search Test Room',
      agentId: testAgentId,
      source: 'test',
      type: 'dm',
    });

    // Create messages with different content
    const testMessages = [
      { text: 'Tell me about artificial intelligence', keywords: ['artificial', 'intelligence'] },
      { text: 'What is machine learning?', keywords: ['machine', 'learning'] },
      {
        text: 'How does natural language processing work?',
        keywords: ['natural', 'language', 'processing'],
      },
      { text: 'Can you explain deep learning?', keywords: ['deep', 'learning'] },
    ];

    for (const msg of testMessages) {
      const message: Memory = {
        id: uuidv4() as UUID,
        entityId: userId,
        roomId: searchRoomId,
        agentId: testAgentId,
        content: {
          text: msg.text,
          source: 'user',
        },
        createdAt: Date.now(),
      };

      await adapter.createMemory(message, 'messages');
    }

    // Test retrieval with count limit
    const limitedMessages = await adapter.getMemories({
      roomId: searchRoomId,
      count: 2,
      tableName: 'messages',
    });

    expect(limitedMessages).toHaveLength(2);

    // Test retrieval of all messages
    const allMessages = await adapter.getMemories({
      roomId: searchRoomId,
      count: 10,
      tableName: 'messages',
    });

    expect(allMessages).toHaveLength(4);

    // Verify message content
    const messageTexts = allMessages.map((m) => m.content.text);
    for (const testMsg of testMessages) {
      expect(messageTexts).toContain(testMsg.text);
    }

    console.log('[Test] Successfully tested message search and retrieval');
  });
});
