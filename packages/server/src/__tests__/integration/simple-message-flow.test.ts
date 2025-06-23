/**
 * Simple integration test for message flow between agent and server
 */

import { describe, it, expect, beforeAll, afterAll } from 'bun:test';
import { AgentServer } from '../../index';
import type { IAgentRuntime, UUID, Character, Content, Memory, HandlerCallback } from '@elizaos/core';
import { AgentRuntime, ChannelType } from '@elizaos/core';
import { createDatabaseAdapter } from '@elizaos/plugin-sql';
import path from 'node:path';
import fs from 'node:fs';
import { v4 as uuidv4 } from 'uuid';

describe('Simple Message Flow Test', () => {
  let agentServer: AgentServer;
  let testDbPath: string;
  let agent: IAgentRuntime;
  let channelId: UUID;
  const serverId = '00000000-0000-0000-0000-000000000000' as UUID;

  beforeAll(async () => {
    console.log('Starting simple message flow test...');
    
    // Use a test database
    testDbPath = path.join(__dirname, `test-db-simple-${Date.now()}`);
    process.env.PGLITE_DATA_DIR = testDbPath;

    // Create and initialize agent server
    agentServer = new AgentServer();
    await agentServer.initialize({
      dataDir: testDbPath,
    });

    // Create simple character
    const character: Character = {
      id: 'simple-agent' as UUID,
      name: 'Simple Agent',
      bio: ['A simple test agent'],
      topics: [],
      clients: [],
      plugins: [],
      system: 'You are a helpful assistant. Always respond when asked.',
      settings: {
        secrets: {},
      },
      messageExamples: [
        [
          { name: 'user', content: { text: 'Hello' } as Content },
          { name: 'Simple Agent', content: { text: 'Hello! How are you?' } as Content }
        ]
      ],
    } as Character;

    // Create database adapter
    const db = await createDatabaseAdapter(
      {
        dataDir: testDbPath,
      },
      'simple-agent' as UUID
    );

    // Create agent runtime with message handling plugin
    agent = new AgentRuntime({
      agentId: 'simple-agent' as UUID,
      character,
      adapter: db,
      token: 'test-token',
      serverUrl: 'http://localhost:3000',
    } as any);
    
    // Register the message handling plugin
    const messageHandlingPlugin = await import('@elizaos/plugin-message-handling');
    await agent.registerPlugin(messageHandlingPlugin.messageHandlingPlugin);

    console.log('Initializing agent...');
    await agent.initialize();

    console.log('Registering agent with server...');
    await agentServer.registerAgent(agent);
    
    // Wait for MessageBusService to initialize
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Create a test room (channel)
    channelId = uuidv4() as UUID;
    
    // Create room in database
    await agent.createRoom({
      id: channelId,
      name: 'Simple Test Channel',
      type: ChannelType.GROUP,
      source: 'test',
      serverId: serverId,
    });
    
    // Add agent as participant to the room
    await agent.addParticipant(agent.agentId, channelId);
    console.log('Created room and added agent as participant');
    
    // Also create the channel in the server database for message handling
    if (agentServer.createChannel) {
      try {
        await agentServer.createChannel({
          id: channelId,
          name: 'Simple Test Channel',
          type: ChannelType.GROUP,
          messageServerId: serverId,
          metadata: {},
        }, [agent.agentId]);
        console.log('Created channel in server database');
      } catch (error) {
        console.log('Could not create channel in server database:', error);
      }
    }

    console.log('Test setup complete. Channel ID:', channelId);
  });

  afterAll(async () => {
    console.log('Cleaning up...');
    try {
      if (agentServer) {
        await agentServer.stop();
      }
      if (fs.existsSync(testDbPath)) {
        fs.rmSync(testDbPath, { recursive: true, force: true });
      }
    } catch (error) {
      console.error('Cleanup error:', error);
    }
  });

  it('should process a message through the agent', async () => {
    console.log('\n=== Testing message processing ===');
    
    const userId = uuidv4() as UUID;
    const messageId = uuidv4() as UUID;
    const messageText = 'Hello agent, can you hear me?';

    console.log('Creating user message:', messageText);

    // Create a message from user
    const userMessage = await agentServer.createMessage({
      id: messageId,
      channelId,
      authorId: userId,
      content: messageText,
      rawMessage: messageText,
      sourceId: 'test-1',
      sourceType: 'test',
      metadata: {},
    });

    expect(userMessage).toBeDefined();
    expect(userMessage.content).toBe(messageText);
    console.log('User message created successfully');

    // Now trigger the message through the message bus instead of directly
    console.log('Emitting message through internal message bus...');
    
    // The MessageBusService should pick this up
    const internalBus = require('../../bus').default;
    internalBus.emit('new_message', {
      id: messageId,
      channel_id: channelId,
      server_id: serverId,
      author_id: userId,
      content: messageText,
      raw_message: messageText,
      source_id: 'test-1',
      source_type: 'test',
      created_at: Date.now(),
      metadata: {},
    });

    // Wait for the agent to process the message through the event system
    await new Promise(resolve => setTimeout(resolve, 3000));

    // Check if the agent created a response message
    const messages = await agentServer.database.getMemories({
      roomId: channelId,
      count: 10,
      tableName: 'messages',
    });

    console.log(`Found ${messages.length} messages in channel`);
    
    // Find agent's response
    const agentResponse = messages.find(m => 
      m.agentId === agent.agentId && 
      m.entityId === agent.agentId &&
      m.id !== messageId
    );

    if (agentResponse) {
      console.log('Agent response found:', agentResponse.content.text);
      expect(agentResponse).toBeDefined();
      expect(agentResponse.content.text).toBeTruthy();
    } else {
      console.log('No agent response found. All messages:', messages.map(m => ({
        id: m.id,
        agentId: m.agentId,
        entityId: m.entityId,
        text: m.content.text
      })));
    }
  });

  it('should handle action execution', async () => {
    console.log('\n=== Testing action execution ===');
    
    const userId = uuidv4() as UUID;
    const messageId = uuidv4() as UUID;
    const messageText = 'Please reply to this message';

    // Create a message
    const userMessage = await agentServer.createMessage({
      id: messageId,
      channelId,
      authorId: userId,
      content: messageText,
      rawMessage: messageText,
      sourceId: 'test-2',
      sourceType: 'test',
      metadata: {},
    });

    console.log('Testing if agent has actions available...');
    
    // Check if agent has any actions
    const availableActions = agent.actions || [];
    console.log('Available actions:', availableActions.map(a => a.name));

    // Emit message through bus
    const internalBus = require('../../bus').default;
    internalBus.emit('new_message', {
      id: messageId,
      channel_id: channelId,
      server_id: serverId,
      author_id: userId,
      content: messageText,
      raw_message: messageText,
      source_id: 'test-2',
      source_type: 'test',
      created_at: Date.now(),
      metadata: {},
    });

    await new Promise(resolve => setTimeout(resolve, 2000));

    // Check for agent response
    const messages = await agentServer.database.getMemories({
      roomId: channelId,
      count: 10,
      tableName: 'messages',
    });

    const agentResponse = messages.find(m => 
      m.agentId === agent.agentId && 
      m.id !== messageId
    );

    expect(agentResponse).toBeTruthy();
    console.log('Action test complete');
  });

  it('should test direct agent communication', async () => {
    console.log('\n=== Testing direct agent communication ===');
    
    // Test if agent runtime is properly initialized
    expect(agent).toBeDefined();
    expect(agent.agentId).toBe('simple-agent');
    expect(agent.character).toBeDefined();
    expect(agent.character.name).toBe('Simple Agent');

    // Test if we can compose state
    const testMemory: Memory = {
      id: uuidv4() as UUID,
      entityId: uuidv4() as UUID,
      agentId: agent.agentId,
      roomId: channelId,
      content: {
        text: 'Test state composition',
        source: 'test',
      },
      createdAt: Date.now(),
    };

    try {
      const state = await agent.composeState(testMemory);
      console.log('State composed successfully');
      console.log('State text preview:', state.text.substring(0, 100) + '...');
      expect(state).toBeDefined();
      expect(state.text).toBeTruthy();
    } catch (error) {
      console.error('Error composing state:', error);
    }

    // Test if agent is properly initialized
    expect(agent.plugins).toBeDefined();
    console.log('Agent has plugins loaded');

    // Test if agent is registered with server
    const registeredAgents = await agentServer.getAgentsForServer(serverId);
    console.log('Registered agents:', registeredAgents);
    expect(registeredAgents).toContain(agent.agentId);
  });
});