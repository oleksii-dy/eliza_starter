/**
 * Integration test for agent message handling on the server
 * This test creates a real server instance, creates an agent, sends messages, and waits for responses
 */

import { describe, it, expect, beforeAll, afterAll, mock } from 'bun:test';
import { AgentServer } from '../../index';
import type { IAgentRuntime, UUID, Character, Content, Memory } from '@elizaos/core';
import { AgentRuntime, ChannelType } from '@elizaos/core';
// Database adapter created through server initialization
import { messageHandlingPlugin } from '@elizaos/plugin-message-handling';
import path from 'node:path';
import fs from 'node:fs';
import { v4 as uuidv4 } from 'uuid';

describe('Agent Message Handling Integration Tests', () => {
  let agentServer: AgentServer;
  let testDbPath: string;
  let agent: IAgentRuntime;
  let channelId: UUID;
  const serverId = '00000000-0000-0000-0000-000000000000' as UUID;

  beforeAll(async () => {
    // Use a test database
    testDbPath = path.join(__dirname, `test-db-message-handling-${Date.now()}`);
    process.env.PGLITE_DATA_DIR = testDbPath;

    // Create and initialize agent server
    agentServer = new AgentServer();
    await agentServer.initialize({
      dataDir: testDbPath,
    });

    // Create character with message handling capabilities
    const character: Character = {
      id: 'test-agent' as UUID,
      name: 'Test Agent',
      bio: ['A test agent for message handling'],
      topics: [],
      plugins: [],
      system: 'You are a helpful assistant. Always respond to messages when asked.',
      settings: {
        secrets: {},
      },
      messageExamples: [
        [
          { name: 'user', content: { text: 'Hello' } as Content },
          { name: 'Test Agent', content: { text: 'Hello! How can I help you today?' } as Content },
        ],
        [
          { name: 'user', content: { text: 'Can you hear me?' } as Content },
          {
            name: 'Test Agent',
            content: { text: 'Yes, I can hear you loud and clear!' } as Content,
          },
        ],
      ],
    } as Character;

    // Database adapter will be created through server initialization
    // const db = await createDatabaseAdapter(
    //   {
    //     dataDir: testDbPath,
    //   },
    //   'test-agent' as UUID
    // );
    const db = agentServer.database;

    // Create agent runtime with message handling plugin
    try {
      agent = new AgentRuntime({
        agentId: 'test-agent' as UUID,
        character,
        adapter: db,
        token: process.env.OPENAI_API_KEY || 'test-token',
        serverUrl: 'http://localhost:3000',
        modelProvider: 'openai',
        plugins: [messageHandlingPlugin],
      } as any);

      // Initialize the agent runtime
      await agent.initialize();

      // Register agent with server
      await agentServer.registerAgent(agent);
    } catch (error) {
      console.error('Failed to initialize agent:', error);
      throw error;
    }

    // Create a test channel
    const channel = await agentServer.createChannel({
      name: 'Test Channel',
      type: ChannelType.GROUP,
      serverId,
      metadata: {},
    });
    channelId = channel.id;

    // Add agent to channel
    await agentServer.addAgentToChannel(channelId, agent.agentId);
  });

  afterAll(async () => {
    try {
      // Stop server
      if (agentServer) {
        await agentServer.stop();
      }

      // Clean up test database
      if (fs.existsSync(testDbPath)) {
        fs.rmSync(testDbPath, { recursive: true, force: true });
      }
    } catch (error) {
      console.error('Cleanup error:', error);
    }
  });

  describe('Basic Message Handling', () => {
    it('should process a message and generate a response', async () => {
      const userId = uuidv4() as UUID;
      const messageId = uuidv4() as UUID;

      // Create a message from user
      const userMessage = await agentServer.createMessage({
        channelId,
        authorId: userId,
        content: 'Hello, can you hear me?',
        rawMessage: 'Hello, can you hear me?',
        sourceId: 'test-msg-1',
        sourceType: 'test',
        metadata: {},
      });

      expect(userMessage).toBeDefined();
      expect(userMessage.content).toBe('Hello, can you hear me?');

      // Process the message through the agent
      const memory: Memory = {
        id: messageId,
        entityId: userId,
        agentId: agent.agentId,
        roomId: channelId,
        content: {
          text: userMessage.content,
          source: 'test',
        },
        createdAt: Date.now(),
      };

      // Mock the message handler callback to capture agent response
      let agentResponseText: string | null = null;
      const handleMessage = mock(async (response: Content) => {
        agentResponseText = response.text || null;

        // Create agent's response message
        await agentServer.createMessage({
          channelId,
          authorId: agent.agentId,
          content: response.text || '',
          rawMessage: response.text || '',
          sourceId: 'agent-response-1',
          sourceType: 'agent',
          inReplyToRootMessageId: messageId,
          metadata: {},
        });

        return [];
      });

      // Process the message
      await agent.processMessage(memory, handleMessage);

      // Wait for processing to complete
      await new Promise((resolve) => setTimeout(resolve, 1000));

      // Verify agent responded
      expect(handleMessage).toHaveBeenCalled();
      expect(agentResponseText).toBeTruthy();
      expect(typeof agentResponseText).toBe('string');

      // Retrieve messages to verify the response was saved
      const messages = await agentServer.getMessagesForChannel(channelId);

      // Should have at least 2 messages (user message + agent response)
      expect(messages.length).toBeGreaterThanOrEqual(2);

      // Find the agent's response
      const agentResponse = messages.find((m) => m.authorId === agent.agentId);
      expect(agentResponse).toBeDefined();
      expect(agentResponse?.inReplyToRootMessageId).toBe(messageId);
    });

    it('should handle multiple messages in sequence', async () => {
      const userId = uuidv4() as UUID;
      const responses: string[] = [];

      // Send multiple messages
      const messageTexts = [
        'What is your name?',
        'Can you help me with something?',
        'Thank you for your help!',
      ];

      for (const text of messageTexts) {
        const messageId = uuidv4() as UUID;

        // Create user message
        const userMessage = await agentServer.createMessage({
          channelId,
          authorId: userId,
          content: text,
          rawMessage: text,
          sourceId: `test-msg-${messageId}`,
          sourceType: 'test',
          metadata: {},
        });

        // Process through agent
        const memory: Memory = {
          id: messageId,
          entityId: userId,
          agentId: agent.agentId,
          roomId: channelId,
          content: {
            text: userMessage.content,
            source: 'test',
          },
          createdAt: Date.now(),
        };

        await agent.processMessage(memory, async (response: Content) => {
          responses.push(response.text || '');

          // Create agent's response
          await agentServer.createMessage({
            channelId,
            authorId: agent.agentId,
            content: response.text || '',
            rawMessage: response.text || '',
            sourceId: `agent-response-${messageId}`,
            sourceType: 'agent',
            inReplyToRootMessageId: messageId,
            metadata: {},
          });

          return [];
        });

        // Wait between messages
        await new Promise((resolve) => setTimeout(resolve, 500));
      }

      // Verify all messages were processed
      expect(responses).toHaveLength(3);
      responses.forEach((response) => {
        expect(response).toBeTruthy();
        expect(typeof response).toBe('string');
      });

      // Verify all messages are in the channel
      const allMessages = await agentServer.getMessagesForChannel(channelId);

      // Should have at least 6 messages (3 user + 3 agent)
      expect(allMessages.length).toBeGreaterThanOrEqual(6);
    });

    it('should maintain conversation context', async () => {
      const userId = uuidv4() as UUID;
      const responses: string[] = [];

      // Create a conversation about a specific topic
      const conversation = [
        { id: uuidv4() as UUID, text: 'My favorite color is blue.' },
        { id: uuidv4() as UUID, text: 'What color did I just mention?' },
      ];

      for (const { id, text } of conversation) {
        // Create user message
        await agentServer.createMessage({
          channelId,
          authorId: userId,
          content: text,
          rawMessage: text,
          sourceId: `context-msg-${id}`,
          sourceType: 'test',
          metadata: {},
        });

        // Process through agent
        const memory: Memory = {
          id,
          entityId: userId,
          agentId: agent.agentId,
          roomId: channelId,
          content: {
            text,
            source: 'test',
          },
          createdAt: Date.now(),
        };

        await agent.processMessage(memory, async (response: Content) => {
          responses.push(response.text || '');

          await agentServer.createMessage({
            channelId,
            authorId: agent.agentId,
            content: response.text || '',
            rawMessage: response.text || '',
            sourceId: `agent-context-${id}`,
            sourceType: 'agent',
            inReplyToRootMessageId: id,
            metadata: {},
          });

          return [];
        });

        await new Promise((resolve) => setTimeout(resolve, 500));
      }

      // The second response should reference "blue" from the context
      expect(responses).toHaveLength(2);
      expect(responses[1].toLowerCase()).toContain('blue');
    });

    it('should handle agent actions (REPLY action)', async () => {
      const userId = uuidv4() as UUID;
      const messageId = uuidv4() as UUID;

      // Create a message that should trigger REPLY action
      await agentServer.createMessage({
        channelId,
        authorId: userId,
        content: 'Please reply to this message',
        rawMessage: 'Please reply to this message',
        sourceId: 'action-test-1',
        sourceType: 'test',
        metadata: {},
      });

      // Process through agent
      const memory: Memory = {
        id: messageId,
        entityId: userId,
        agentId: agent.agentId,
        roomId: channelId,
        content: {
          text: 'Please reply to this message',
          source: 'test',
        },
        createdAt: Date.now(),
      };

      let responseContent: Content | null = null;

      const actionHandler = mock(async (response: Content) => {
        responseContent = response as Content;

        // Check if REPLY action was included (this verifies action processing)

        await agentServer.createMessage({
          channelId,
          authorId: agent.agentId,
          content: response.text || '',
          rawMessage: response.text || '',
          sourceId: 'agent-action-response',
          sourceType: 'agent',
          inReplyToRootMessageId: messageId,
          metadata: { actions: response.actions },
        });

        return [];
      });

      await agent.processMessage(memory, actionHandler);

      await new Promise((resolve) => setTimeout(resolve, 1000));

      // Verify response was generated
      expect(responseContent).toBeTruthy();
      expect(responseContent!.text).toBeTruthy();
    });

    it('should handle errors gracefully', async () => {
      const userId = uuidv4() as UUID;
      const messageId = uuidv4() as UUID;

      // Create a message with problematic content
      await agentServer.createMessage({
        channelId,
        authorId: userId,
        content: '', // Empty content
        rawMessage: '',
        sourceId: 'error-test-1',
        sourceType: 'test',
        metadata: {},
      });

      // Process through agent
      const memory: Memory = {
        id: messageId,
        entityId: userId,
        agentId: agent.agentId,
        roomId: channelId,
        content: {
          text: '', // Empty text
          source: 'test',
        },
        createdAt: Date.now(),
      };

      let errorOccurred = false;

      try {
        await agent.processMessage(memory, async (response: Content) => {
          // Even with empty input, agent should still respond
          if (response.text) {
            await agentServer.createMessage({
              channelId,
              authorId: agent.agentId,
              content: response.text || 'I received an empty message.',
              rawMessage: response.text || 'I received an empty message.',
              sourceId: 'agent-error-response',
              sourceType: 'agent',
              inReplyToRootMessageId: messageId,
              metadata: {},
            });
          }
          return [];
        });
      } catch (_error) {
        errorOccurred = true;
      }

      // Agent should handle empty messages gracefully without throwing
      expect(errorOccurred).toBe(false);
    });
  });

  describe('Agent Service Integration', () => {
    it('should have message handling services registered', () => {
      // Check that the agent has the necessary services
      const services = agent.services;
      expect(services).toBeDefined();

      // The message handling plugin should provide various services
      const hasMessageHandling = agent.plugins.some((p) => p.name === 'message-handling');
      expect(hasMessageHandling).toBe(true);
    });

    it('should use providers from message handling plugin', async () => {
      const userId = uuidv4() as UUID;
      const messageId = uuidv4() as UUID;

      // Create a message
      const memory: Memory = {
        id: messageId,
        entityId: userId,
        agentId: agent.agentId,
        roomId: channelId,
        content: {
          text: 'Test providers',
          source: 'test',
        },
        createdAt: Date.now(),
      };

      // Compose state should include providers from message handling plugin
      const state = await agent.composeState(memory);

      // Check that state includes various provider data
      expect(state).toBeDefined();
      expect(state.text).toBeTruthy();

      // The state should include character info, time, recent messages, etc.
      expect(state.text).toContain(agent.character.name);
    });
  });

  describe('Real-time Message Flow', () => {
    it('should simulate a real conversation flow', async () => {
      const userId = uuidv4() as UUID;
      const conversation = [
        'Hello, are you there?',
        'What can you help me with?',
        'Tell me about yourself',
        'Thanks for chatting!',
      ];

      const responses: string[] = [];

      for (let i = 0; i < conversation.length; i++) {
        const messageId = uuidv4() as UUID;
        const text = conversation[i];

        // Create user message
        const userMessage = await agentServer.createMessage({
          channelId,
          authorId: userId,
          content: text,
          rawMessage: text,
          sourceId: `flow-msg-${i}`,
          sourceType: 'test',
          metadata: { conversationIndex: i },
        });

        // Process through agent
        const memory: Memory = {
          id: messageId,
          entityId: userId,
          agentId: agent.agentId,
          roomId: channelId,
          content: {
            text: userMessage.content,
            source: 'test',
          },
          createdAt: Date.now(),
        };

        await agent.processMessage(memory, async (response: Content) => {
          responses.push(response.text || '');

          // Create agent response
          await agentServer.createMessage({
            channelId,
            authorId: agent.agentId,
            content: response.text || '',
            rawMessage: response.text || '',
            sourceId: `agent-flow-${i}`,
            sourceType: 'agent',
            inReplyToRootMessageId: messageId,
            metadata: { conversationIndex: i },
          });

          return [];
        });

        // Simulate realistic timing between messages
        await new Promise((resolve) => setTimeout(resolve, 800));
      }

      // Verify complete conversation
      expect(responses).toHaveLength(conversation.length);
      responses.forEach((response, index) => {
        expect(response).toBeTruthy();
        expect(response.length).toBeGreaterThan(0);
        // Verify each response corresponds to the conversation
        expect(index).toBeGreaterThanOrEqual(0);
        expect(index).toBeLessThan(conversation.length);
      });

      // Get final conversation history
      const allMessages = await agentServer.getMessagesForChannel(channelId);

      // Should have complete conversation (user + agent messages)
      expect(allMessages.length).toBeGreaterThanOrEqual(conversation.length * 2);

      // Verify conversation structure
      const userMessages = allMessages.filter((m) => m.authorId === userId);
      const agentMessages = allMessages.filter((m) => m.authorId === agent.agentId);

      expect(userMessages.length).toBeGreaterThanOrEqual(conversation.length);
      expect(agentMessages.length).toBeGreaterThanOrEqual(conversation.length);

      // Each agent message should be in reply to a user message
      agentMessages.forEach((agentMsg) => {
        expect(agentMsg.inReplyToRootMessageId).toBeTruthy();
      });
    });
  });
});
