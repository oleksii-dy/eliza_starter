/**
 * End-to-End WebSocket Agent Integration Test
 * This test verifies the complete flow: WebSocket message → Agent processing → WebSocket response
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach, afterEach } from 'bun:test';
import { io as ioClient, Socket as ClientSocket } from 'socket.io-client';
import { AgentServer } from '../../index';
import type { IAgentRuntime, UUID, Character, Content, Memory } from '@elizaos/core';
import { SOCKET_MESSAGE_TYPE, ChannelType, AgentRuntime } from '@elizaos/core';
import { createDatabaseAdapter } from '@elizaos/plugin-sql';
import { messageHandlingPlugin } from '@elizaos/plugin-message-handling';
import path from 'node:path';
import fs from 'node:fs';
import { v4 as uuidv4 } from 'uuid';

describe('WebSocket Agent End-to-End Tests', () => {
  let agentServer: AgentServer;
  let port: number;
  let client: ClientSocket;
  let agent: IAgentRuntime;
  let testDbPath: string;
  let channelId: UUID;
  const serverId = '00000000-0000-0000-0000-000000000000' as UUID;

  beforeAll(async () => {
    // Setup test database
    testDbPath = path.join(__dirname, `test-db-websocket-e2e-${Date.now()}`);
    process.env.PGLITE_DATA_DIR = testDbPath;

    // Clean up environment variables
    delete process.env.POSTGRES_URL;
    delete process.env.POSTGRES_PASSWORD;
    delete process.env.POSTGRES_USER;
    delete process.env.POSTGRES_HOST;
    delete process.env.POSTGRES_PORT;
    delete process.env.POSTGRES_DATABASE;

    // Initialize agent server
    agentServer = new AgentServer();

    try {
      await agentServer.initialize({
        dataDir: testDbPath,
      });
    } catch (error) {
      console.error('Failed to initialize agent server:', error);
      if (fs.existsSync(testDbPath)) {
        fs.rmSync(testDbPath, { recursive: true, force: true });
      }
      throw error;
    }

    // Create character with message handling capabilities
    const testCharacter: Character = {
      id: 'websocket-test-agent' as UUID,
      name: 'WebSocket Test Agent',
      bio: ['An agent that responds through WebSocket'],
      topics: ['testing', 'websockets'],
      plugins: []
      system: 'You are a helpful test agent. Always respond promptly to messages.',
      settings: {
        secrets: {},
        model: 'gpt-3.5-turbo',
      },
      messageExamples: [
        [
          { name: 'user', content: { text: 'Hello' } as Content },
          {
            name: 'WebSocket Test Agent',
            content: { text: 'Hello! I can hear you through WebSocket.' } as Content,
          },
        ],
        [
          { name: 'user', content: { text: 'Are you connected?' } as Content },
          {
            name: 'WebSocket Test Agent',
            content: { text: 'Yes, I am connected and ready to chat!' } as Content,
          },
        ],
      ],
    } as Character;

    // Create database adapter
    const db = await createDatabaseAdapter(
      {
        dataDir: testDbPath,
      },
      'websocket-test-agent' as UUID
    );

    // Create agent runtime with message handling plugin
    agent = new AgentRuntime({
      agentId: 'websocket-test-agent' as UUID,
      character: testCharacter,
      adapter: db,
      token: process.env.OPENAI_API_KEY || 'test-token',
      serverUrl: 'http://localhost:3000',
      modelProvider: 'openai',
      plugins: [messageHandlingPlugin],
    } as any);

    // Initialize agent
    await agent.initialize();

    // Register agent with server
    await agentServer.registerAgent(agent);

    // Create test channel
    const channel = await agentServer.createChannel({
      name: 'WebSocket Test Channel',
      type: ChannelType.GROUP,
      serverId: serverId,
      metadata: {},
    });
    channelId = channel.id;

    // Add agent to channel as a participant
    await agentServer.addAgentToChannel(channelId, agent.agentId);

    // Also ensure the agent is following the channel
    await agent.setParticipantUserState(channelId, agent.agentId, 'FOLLOWED');

    // Start server
    port = 3200;
    agentServer.start(port);

    // Wait for server to be ready
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }, 60000); // 60 second timeout

  afterAll(async () => {
    // Cleanup
    if (client) client.close();

    if (agentServer) {
      await agentServer.stop();
    }

    if (fs.existsSync(testDbPath)) {
      fs.rmSync(testDbPath, { recursive: true, force: true });
    }
  });

  beforeEach(() => {
    // Create fresh client for each test
    client = ioClient(`http://localhost:${port}`, {
      autoConnect: false,
      transports: ['websocket'],
    });
  });

  afterEach(() => {
    // Disconnect client after each test
    if (client && client.connected) {
      client.disconnect();
    }
  });

  describe('WebSocket Agent Message Flow', () => {
    it('should connect, send message, and receive agent response through WebSocket', async () => {
      const userId = uuidv4() as UUID;
      const messageId = uuidv4() as UUID;

      // Connect to server
      const connectionPromise = new Promise((resolve) => {
        client.on('connection_established', (data) => {
          expect(data).toHaveProperty('socketId');
          resolve(data);
        });
      });

      client.connect();
      await connectionPromise;

      // Join channel
      const joinPromise = new Promise((resolve) => {
        client.on('channel_joined', (data) => {
          expect(data.channelId).toBe(channelId);
          resolve(data);
        });
      });

      client.emit(String(SOCKET_MESSAGE_TYPE.ROOM_JOINING), {
        channelId,
        entityId: userId,
        serverId,
      });

      await joinPromise;

      // Set up listener for agent response
      const agentResponsePromise = new Promise<any>((resolve) => {
        client.on('messageBroadcast', (message) => {
          // Check if this is the agent's response
          if (message.senderId === agent.agentId) {
            resolve(message);
          }
        });
      });

      // Send message to agent
      client.emit(String(SOCKET_MESSAGE_TYPE.SEND_MESSAGE), {
        channelId,
        senderId: userId,
        senderName: 'Test User',
        message: 'Hello WebSocket Agent, can you hear me?',
        serverId,
        messageId,
      });

      // Wait for agent response
      const agentResponse = await agentResponsePromise;

      // Verify agent response
      expect(agentResponse).toBeDefined();
      expect(agentResponse.senderId).toBe(agent.agentId);
      expect(agentResponse.senderName).toBe('WebSocket Test Agent');
      expect(agentResponse.text).toBeTruthy();
      expect(typeof agentResponse.text).toBe('string');
      expect(agentResponse.channelId).toBe(channelId);
    }, 30000); // 30 second timeout

    it('should maintain conversation context across multiple WebSocket messages', async () => {
      const userId = uuidv4() as UUID;
      const responses: any[] = [];

      // Connect and join channel
      await new Promise((resolve) => {
        client.on('connection_established', () => {
          client.emit(String(SOCKET_MESSAGE_TYPE.ROOM_JOINING), {
            channelId,
            entityId: userId,
            serverId,
          });
        });
        client.on('channel_joined', resolve);
        client.connect();
      });

      // Set up response collector
      client.on('messageBroadcast', (message) => {
        if (message.senderId === agent.agentId) {
          responses.push(message);
        }
      });

      // Send first message
      const firstMessageId = uuidv4() as UUID;
      client.emit(String(SOCKET_MESSAGE_TYPE.SEND_MESSAGE), {
        channelId,
        senderId: userId,
        senderName: 'Test User',
        message: 'My favorite programming language is TypeScript.',
        serverId,
        messageId: firstMessageId,
      });

      // Wait for first response
      await new Promise((resolve) => setTimeout(resolve, 3000));
      expect(responses).toHaveLength(1);

      // Send follow-up message
      const secondMessageId = uuidv4() as UUID;
      client.emit(String(SOCKET_MESSAGE_TYPE.SEND_MESSAGE), {
        channelId,
        senderId: userId,
        senderName: 'Test User',
        message: 'What programming language did I just mention?',
        serverId,
        messageId: secondMessageId,
      });

      // Wait for second response
      await new Promise((resolve) => setTimeout(resolve, 3000));
      expect(responses).toHaveLength(2);

      // Verify context was maintained
      const secondResponse = responses[1];
      expect(secondResponse.text.toLowerCase()).toContain('typescript');
    }, 30000);

    it('should handle multiple concurrent users through WebSocket', async () => {
      const user1Id = uuidv4() as UUID;
      const user2Id = uuidv4() as UUID;

      // Create second client
      const client2 = ioClient(`http://localhost:${port}`, {
        autoConnect: false,
        transports: ['websocket'],
      });

      try {
        // Connect both clients
        await Promise.all([
          new Promise((resolve) => {
            client.on('connection_established', () => {
              client.emit(String(SOCKET_MESSAGE_TYPE.ROOM_JOINING), {
                channelId,
                entityId: user1Id,
                serverId,
              });
            });
            client.on('channel_joined', resolve);
            client.connect();
          }),
          new Promise((resolve) => {
            client2.on('connection_established', () => {
              client2.emit(String(SOCKET_MESSAGE_TYPE.ROOM_JOINING), {
                channelId,
                entityId: user2Id,
                serverId,
              });
            });
            client2.on('channel_joined', resolve);
            client2.connect();
          }),
        ]);

        // Track responses for both users
        const user1Responses: any[] = [];
        const user2Responses: any[] = [];

        client.on('messageBroadcast', (message) => {
          if (message.senderId === agent.agentId) {
            user1Responses.push(message);
          }
        });

        client2.on('messageBroadcast', (message) => {
          if (message.senderId === agent.agentId) {
            user2Responses.push(message);
          }
        });

        // Both users send messages
        client.emit(String(SOCKET_MESSAGE_TYPE.SEND_MESSAGE), {
          channelId,
          senderId: user1Id,
          senderName: 'User 1',
          message: 'Hello from User 1!',
          serverId,
          messageId: uuidv4(),
        });

        client2.emit(String(SOCKET_MESSAGE_TYPE.SEND_MESSAGE), {
          channelId,
          senderId: user2Id,
          senderName: 'User 2',
          message: 'Hello from User 2!',
          serverId,
          messageId: uuidv4(),
        });

        // Wait for responses
        await new Promise((resolve) => setTimeout(resolve, 5000));

        // Both users should see agent responses
        expect(user1Responses.length).toBeGreaterThan(0);
        expect(user2Responses.length).toBeGreaterThan(0);

        // Responses should be broadcast to all channel participants
        expect(user1Responses.length).toBe(user2Responses.length);
      } finally {
        if (client2.connected) client2.disconnect();
      }
    }, 30000);

    it('should handle DM conversations through WebSocket', async () => {
      const userId = uuidv4() as UUID;
      const dmChannelId = uuidv4() as UUID;

      // Connect
      await new Promise((resolve) => {
        client.on('connection_established', resolve);
        client.connect();
      });

      // Set up response listener
      const responsePromise = new Promise<any>((resolve) => {
        client.on('messageBroadcast', (message) => {
          if (message.senderId === agent.agentId) {
            resolve(message);
          }
        });
      });

      // Send DM message (creates channel automatically)
      client.emit(String(SOCKET_MESSAGE_TYPE.SEND_MESSAGE), {
        channelId: dmChannelId,
        senderId: userId,
        senderName: 'DM User',
        message: 'This is a private message to the agent.',
        serverId,
        targetUserId: agent.agentId,
        metadata: {
          isDm: true,
          channelType: ChannelType.DM,
        },
      });

      // Wait for agent response
      const response = await responsePromise;

      expect(response).toBeDefined();
      expect(response.senderId).toBe(agent.agentId);
      expect(response.text).toBeTruthy();
      expect(response.channelId).toBe(dmChannelId);
    }, 30000);

    it('should properly handle errors and edge cases', async () => {
      const userId = uuidv4() as UUID;

      // Connect and join
      await new Promise((resolve) => {
        client.on('connection_established', () => {
          client.emit(String(SOCKET_MESSAGE_TYPE.ROOM_JOINING), {
            channelId,
            entityId: userId,
            serverId,
          });
        });
        client.on('channel_joined', resolve);
        client.connect();
      });

      // Test empty message
      const errorPromise = new Promise((resolve) => {
        client.on('messageError', resolve);
      });

      client.emit(String(SOCKET_MESSAGE_TYPE.SEND_MESSAGE), {
        channelId,
        senderId: userId,
        senderName: 'Test User',
        message: '', // Empty message
        serverId,
      });

      const error = await errorPromise;
      expect(error).toBeDefined();
      expect(error.error).toContain('Message content is required');
    });

    it('should verify complete message flow with database persistence', async () => {
      const userId = uuidv4() as UUID;
      const messageId = uuidv4() as UUID;
      const messageText = 'Test message for database persistence';

      // Connect and join
      await new Promise((resolve) => {
        client.on('connection_established', () => {
          client.emit(String(SOCKET_MESSAGE_TYPE.ROOM_JOINING), {
            channelId,
            entityId: userId,
            serverId,
          });
        });
        client.on('channel_joined', resolve);
        client.connect();
      });

      // Track agent response
      let agentResponseText: string | null = null;
      client.on('messageBroadcast', (message) => {
        if (message.senderId === agent.agentId) {
          agentResponseText = message.text;
        }
      });

      // Send message
      client.emit(String(SOCKET_MESSAGE_TYPE.SEND_MESSAGE), {
        channelId,
        senderId: userId,
        senderName: 'Test User',
        message: messageText,
        serverId,
        messageId,
      });

      // Wait for processing
      await new Promise((resolve) => setTimeout(resolve, 3000));

      // Verify response was received
      expect(agentResponseText).toBeTruthy();

      // Verify messages are persisted in database
      const messages = await agentServer.getMessagesForChannel(channelId);

      // Find user message
      const userMessage = messages.find((m) => m.id === messageId);
      expect(userMessage).toBeDefined();
      expect(userMessage?.content).toBe(messageText);
      expect(userMessage?.authorId).toBe(userId);

      // Find agent response
      const agentMessage = messages.find(
        (m) => m.authorId === agent.agentId && m.inReplyToRootMessageId === messageId
      );
      expect(agentMessage).toBeDefined();
      expect(agentMessage?.content).toBe(agentResponseText);
    }, 30000);
  });

  describe('WebSocket Event Handling', () => {
    it('should properly emit messageComplete events', async () => {
      const userId = uuidv4() as UUID;

      // Connect and join
      await new Promise((resolve) => {
        client.on('connection_established', () => {
          client.emit(String(SOCKET_MESSAGE_TYPE.ROOM_JOINING), {
            channelId,
            entityId: userId,
            serverId,
          });
        });
        client.on('channel_joined', resolve);
        client.connect();
      });

      // Listen for messageComplete event
      const completePromise = new Promise((resolve) => {
        client.on('messageComplete', resolve);
      });

      // Send message
      client.emit(String(SOCKET_MESSAGE_TYPE.SEND_MESSAGE), {
        channelId,
        senderId: userId,
        senderName: 'Test User',
        message: 'Test for message complete event',
        serverId,
      });

      // Wait for complete event
      const completeEvent = await completePromise;
      expect(completeEvent).toBeDefined();
    });

    it('should handle control messages for input state', async () => {
      const userId = uuidv4() as UUID;

      // Connect and join
      await new Promise((resolve) => {
        client.on('connection_established', () => {
          client.emit(String(SOCKET_MESSAGE_TYPE.ROOM_JOINING), {
            channelId,
            entityId: userId,
            serverId,
          });
        });
        client.on('channel_joined', resolve);
        client.connect();
      });

      // Track control messages
      const controlMessages: any[] = [];
      client.on('controlMessage', (msg) => {
        controlMessages.push(msg);
      });

      // Send message
      client.emit(String(SOCKET_MESSAGE_TYPE.SEND_MESSAGE), {
        channelId,
        senderId: userId,
        senderName: 'Test User',
        message: 'Test control messages',
        serverId,
      });

      // Wait for processing
      await new Promise((resolve) => setTimeout(resolve, 3000));

      // Should receive disable/enable input control messages
      const disableMsg = controlMessages.find((m) => m.action === 'disable_input');
      const enableMsg = controlMessages.find((m) => m.action === 'enable_input');

      expect(disableMsg).toBeDefined();
      expect(enableMsg).toBeDefined();
      expect(disableMsg.channelId).toBe(channelId);
      expect(enableMsg.channelId).toBe(channelId);
    });
  });
});
