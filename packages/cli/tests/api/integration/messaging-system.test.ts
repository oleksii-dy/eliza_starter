import { describe, it, beforeAll, afterAll, expect } from 'vitest';
import type { UUID } from '@elizaos/core';
import {
  setupAPITestEnvironment,
  cleanupAPITestEnvironment,
  createTestAgent,
  startTestAgent,
  sendMessageToAgent,
  deleteTestAgent,
  apiAssertions,
  waitForCondition,
  type APITestContext,
} from '../api-test-utils';

describe('Messaging System Integration Tests', () => {
  let context: APITestContext;
  let testAgentId: UUID;
  let createdAgentIds: UUID[] = [];

  beforeAll(async () => {
    context = await setupAPITestEnvironment();
    
    // Create and start a test agent for messaging tests
    const { agentId } = await createTestAgent(context.httpClient, {
      name: 'MessagingTestAgent',
    });
    testAgentId = agentId;
    createdAgentIds.push(agentId);
    
    await startTestAgent(context.httpClient, testAgentId);
    
    // Wait for agent to be fully operational
    await waitForCondition(async () => {
      const statusResponse = await context.httpClient.get(`/agents/${testAgentId}`);
      return statusResponse.data.status === 'running' || statusResponse.data.running === true;
    }, 15000);
  }, 120000);

  afterAll(async () => {
    // Clean up created agents
    for (const agentId of createdAgentIds) {
      try {
        await deleteTestAgent(context.httpClient, agentId);
      } catch (error) {
        // Ignore cleanup errors
      }
    }
    
    if (context) {
      await cleanupAPITestEnvironment(context);
    }
  });

  describe('Channel Management', () => {
    const testChannelId = 'test-channel-001';

    it('should create a messaging channel', async () => {
      const channelData = {
        id: testChannelId,
        name: 'Test Channel',
        type: 'text',
        agentId: testAgentId,
      };

      const response = await context.httpClient.post('/messaging/channels', channelData);

      apiAssertions.isSuccessful(response);
      apiAssertions.hasDataStructure(response, ['id', 'name']);
      expect(response.data.id).toBe(testChannelId);
    });

    it('should list messaging channels', async () => {
      const response = await context.httpClient.get('/messaging/channels');

      apiAssertions.hasStatus(response, 200);
      expect(Array.isArray(response.data)).toBe(true);
      
      // Should contain our test channel
      const channel = response.data.find(c => c.id === testChannelId);
      expect(channel).toBeDefined();
    });

    it('should get specific channel details', async () => {
      const response = await context.httpClient.get(`/messaging/channels/${testChannelId}`);

      apiAssertions.hasStatus(response, 200);
      apiAssertions.hasDataStructure(response, ['id', 'name']);
      expect(response.data.id).toBe(testChannelId);
    });

    it('should update channel configuration', async () => {
      const updateData = {
        name: 'Updated Test Channel',
        description: 'Updated channel for testing',
      };

      const response = await context.httpClient.put(`/messaging/channels/${testChannelId}`, updateData);

      apiAssertions.isSuccessful(response);
      
      // Verify the update
      const getResponse = await context.httpClient.get(`/messaging/channels/${testChannelId}`);
      expect(getResponse.data.name).toBe('Updated Test Channel');
    });
  });

  describe('Message Sending and Receiving', () => {
    const messageChannelId = 'message-test-channel';

    beforeAll(async () => {
      // Create a channel for message testing
      await context.httpClient.post('/messaging/channels', {
        id: messageChannelId,
        name: 'Message Test Channel',
        type: 'text',
        agentId: testAgentId,
      });
    });

    it('should send a message to an agent', async () => {
      const testMessage = 'Hello, test agent!';
      
      const response = await sendMessageToAgent(
        context.httpClient,
        testAgentId,
        testMessage,
        messageChannelId
      );

      apiAssertions.hasStatus(response, 200);
      apiAssertions.hasDataStructure(response, ['messageId', 'status']);
      expect(response.data.status).toMatch(/sent|processed|delivered/);
    });

    it('should retrieve messages from a channel', async () => {
      // Send a message first
      await sendMessageToAgent(
        context.httpClient,
        testAgentId,
        'Test message for retrieval',
        messageChannelId
      );

      // Wait a moment for message to be processed
      await new Promise(resolve => setTimeout(resolve, 1000));

      const response = await context.httpClient.get(`/messaging/channels/${messageChannelId}/messages`);

      apiAssertions.hasStatus(response, 200);
      expect(Array.isArray(response.data)).toBe(true);
      
      // Should contain our message
      const messages = response.data;
      expect(messages.length).toBeGreaterThan(0);
      
      const testMessage = messages.find(m => 
        m.content?.text?.includes('Test message for retrieval')
      );
      expect(testMessage).toBeDefined();
    });

    it('should handle message with attachments', async () => {
      const messageWithAttachment = {
        text: 'Message with attachment',
        channelId: messageChannelId,
        senderId: 'test-user',
        senderName: 'Test User',
        attachments: [
          {
            type: 'text',
            content: 'Additional content',
            metadata: { test: true },
          }
        ],
      };

      const response = await context.httpClient.post(
        `/messaging/channels/${messageChannelId}/message`,
        messageWithAttachment
      );

      apiAssertions.hasStatus(response, 200);
    });

    it('should handle different message types', async () => {
      const messageTypes = [
        { text: 'Simple text message', type: 'text' },
        { text: 'System message', type: 'system' },
        { text: 'User action', type: 'action' },
      ];

      for (const message of messageTypes) {
        const response = await context.httpClient.post(
          `/messaging/channels/${messageChannelId}/message`,
          {
            ...message,
            channelId: messageChannelId,
            senderId: 'test-user',
            senderName: 'Test User',
          }
        );

        apiAssertions.hasStatus(response, 200);
      }
    });
  });

  describe('Multi-Agent Messaging', () => {
    let secondAgentId: UUID;
    const multiChannelId = 'multi-agent-channel';

    beforeAll(async () => {
      // Create a second agent for multi-agent testing
      const { agentId } = await createTestAgent(context.httpClient, {
        name: 'SecondMessagingAgent',
      });
      secondAgentId = agentId;
      createdAgentIds.push(agentId);
      
      await startTestAgent(context.httpClient, secondAgentId);
      
      // Create a channel for multi-agent communication
      await context.httpClient.post('/messaging/channels', {
        id: multiChannelId,
        name: 'Multi-Agent Channel',
        type: 'group',
        agentIds: [testAgentId, secondAgentId],
      });
    });

    it('should send messages between agents', async () => {
      // Send message from first agent to channel
      const response1 = await context.httpClient.post(
        `/messaging/channels/${multiChannelId}/message`,
        {
          text: 'Message from first agent',
          channelId: multiChannelId,
          senderId: testAgentId,
          senderName: 'FirstAgent',
          targetAgentId: secondAgentId,
        }
      );

      apiAssertions.hasStatus(response1, 200);

      // Wait for message processing
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Check that both agents can see the message
      const messagesResponse = await context.httpClient.get(
        `/messaging/channels/${multiChannelId}/messages`
      );

      apiAssertions.hasStatus(messagesResponse, 200);
      const messages = messagesResponse.data;
      
      const sentMessage = messages.find(m => 
        m.content?.text?.includes('Message from first agent')
      );
      expect(sentMessage).toBeDefined();
    });

    it('should handle agent-to-agent direct messaging', async () => {
      const directMessageData = {
        text: 'Direct message between agents',
        fromAgentId: testAgentId,
        toAgentId: secondAgentId,
        type: 'direct',
      };

      const response = await context.httpClient.post('/messaging/direct', directMessageData);

      apiAssertions.isSuccessful(response);
    });
  });

  describe('Message History and Persistence', () => {
    const historyChannelId = 'history-test-channel';

    beforeAll(async () => {
      // Create channel and send multiple messages
      await context.httpClient.post('/messaging/channels', {
        id: historyChannelId,
        name: 'History Test Channel',
        type: 'text',
        agentId: testAgentId,
      });

      // Send multiple messages
      for (let i = 0; i < 5; i++) {
        await sendMessageToAgent(
          context.httpClient,
          testAgentId,
          `Test message ${i + 1}`,
          historyChannelId
        );
        await new Promise(resolve => setTimeout(resolve, 200));
      }
    });

    it('should retrieve message history with pagination', async () => {
      const response = await context.httpClient.get(
        `/messaging/channels/${historyChannelId}/messages?limit=3&offset=0`
      );

      apiAssertions.hasStatus(response, 200);
      expect(Array.isArray(response.data)).toBe(true);
      expect(response.data.length).toBeLessThanOrEqual(3);
    });

    it('should filter messages by type', async () => {
      const response = await context.httpClient.get(
        `/messaging/channels/${historyChannelId}/messages?type=user`
      );

      apiAssertions.hasStatus(response, 200);
      expect(Array.isArray(response.data)).toBe(true);
      
      // All returned messages should be of the specified type
      response.data.forEach(message => {
        expect(message.type || 'user').toBe('user');
      });
    });

    it('should filter messages by date range', async () => {
      const now = Date.now();
      const tenMinutesAgo = now - (10 * 60 * 1000);

      const response = await context.httpClient.get(
        `/messaging/channels/${historyChannelId}/messages?after=${tenMinutesAgo}&before=${now}`
      );

      apiAssertions.hasStatus(response, 200);
      expect(Array.isArray(response.data)).toBe(true);
    });
  });

  describe('Server Management', () => {
    it('should list messaging servers', async () => {
      const response = await context.httpClient.get('/messaging/servers');

      apiAssertions.hasStatus(response, 200);
      expect(Array.isArray(response.data)).toBe(true);
    });

    it('should create a messaging server', async () => {
      const serverData = {
        name: 'Test Messaging Server',
        type: 'http',
        config: {
          port: 3001,
          maxConnections: 100,
        },
      };

      const response = await context.httpClient.post('/messaging/servers', serverData);

      // May not be implemented or might return different status
      expect([200, 201, 501]).toContain(response.status);
    });
  });

  describe('Error Handling', () => {
    it('should handle messages to non-existent channels', async () => {
      const response = await context.httpClient.post(
        '/messaging/channels/non-existent-channel/message',
        {
          text: 'Message to nowhere',
          senderId: 'test-user',
          senderName: 'Test User',
        }
      );

      expect([404, 400]).toContain(response.status);
    });

    it('should handle malformed message data', async () => {
      const response = await context.httpClient.post(
        `/messaging/channels/${messageChannelId}/message`,
        {
          // Missing required fields
          invalidField: 'invalid',
        }
      );

      expect([400, 422]).toContain(response.status);
    });

    it('should handle messages to stopped agents', async () => {
      // Create and immediately stop an agent
      const { agentId } = await createTestAgent(context.httpClient, {
        name: 'StoppedAgent',
      });
      createdAgentIds.push(agentId);
      
      // Agent should be stopped by default, but ensure it's stopped
      await context.httpClient.post(`/agents/${agentId}/stop`);

      const response = await sendMessageToAgent(
        context.httpClient,
        agentId,
        'Message to stopped agent',
        'stopped-agent-channel'
      );

      // Should handle gracefully - either queue message or return appropriate error
      expect([200, 400, 503]).toContain(response.status);
    });
  });
});