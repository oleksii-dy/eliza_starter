import { type TestSuite, type IAgentRuntime, type Memory, type UUID, ChannelType, createUniqueUuid } from '@elizaos/core';
import { v4 } from 'uuid';

export class MessageFlowTestSuite implements TestSuite {
  name = 'message-handling-flow';
  description = 'E2E tests for message handling flow including shouldRespond and action processing';

  tests = [
    {
      name: 'Agent responds to direct message in DM channel',
      fn: async (runtime: IAgentRuntime) => {
        console.log('Starting DM response test...');
        
        // Create a DM room
        const roomId = createUniqueUuid(runtime, `dm-test-${Date.now()}`);
        const userId = createUniqueUuid(runtime, 'test-user');
        
        // Create DM message
        const message: Memory = {
          id: v4() as UUID,
          entityId: userId,
          agentId: runtime.agentId,
          roomId: roomId,
          content: {
            text: 'Hello, can you help me with something?',
            type: 'text',
            source: 'test',
            channelType: ChannelType.DM,
          },
          createdAt: Date.now(),
        };

        // Save and process the message
        await runtime.createMemory(message, 'messages');
        await runtime.emitEvent('MESSAGE_RECEIVED', {
          runtime,
          message,
          callback: async (response) => {
            console.log('Callback received response:', response);
          }
        });
        
        // Wait for processing
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        // Check for response
        const messages = await runtime.getMemories({
          roomId,
          count: 10,
          tableName: 'messages',
        });
        
        const agentResponse = messages.find(
          m => m.entityId === runtime.agentId && m.id !== message.id
        );
        
        if (!agentResponse) {
          throw new Error('Agent did not respond to DM message');
        }
        
        console.log('✓ Agent responded to DM:', agentResponse.content.text);
        console.log('✅ DM response test PASSED');
      },
    },

    {
      name: 'Agent uses shouldRespond logic in group channel',
      fn: async (runtime: IAgentRuntime) => {
        console.log('Starting shouldRespond test...');
        
        const roomId = createUniqueUuid(runtime, `group-test-${Date.now()}`);
        const userId = createUniqueUuid(runtime, 'test-user');
        
        // Test 1: Message without agent mention (should not respond)
        const casualMessage: Memory = {
          id: v4() as UUID,
          entityId: userId,
          agentId: runtime.agentId,
          roomId: roomId,
          content: {
            text: 'The weather is nice today',
            type: 'text',
            source: 'test',
            channelType: ChannelType.GROUP,
          },
          createdAt: Date.now(),
        };

        await runtime.createMemory(casualMessage, 'messages');
        await runtime.emitEvent('MESSAGE_RECEIVED', {
          runtime,
          message: casualMessage,
          callback: async (response) => {
            console.log('Callback for casual message:', response);
          }
        });
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        let messages = await runtime.getMemories({
          roomId,
          count: 10,
          tableName: 'messages',
        });
        
        let agentResponse = messages.find(
          m => m.entityId === runtime.agentId && 
              m.createdAt && casualMessage.createdAt && 
              m.createdAt > casualMessage.createdAt
        );
        
        if (agentResponse && agentResponse.content.text) {
          throw new Error('Agent responded when it should have ignored casual message');
        }
        
        console.log('✓ Agent correctly ignored casual message');
        
        // Test 2: Direct mention (should respond)
        const mentionMessage: Memory = {
          id: v4() as UUID,
          entityId: userId,
          agentId: runtime.agentId,
          roomId: roomId,
          content: {
            text: `Hey ${runtime.character.name}, what do you think about AI?`,
            type: 'text',
            source: 'test',
            channelType: ChannelType.GROUP,
          },
          createdAt: Date.now(),
        };

        await runtime.createMemory(mentionMessage, 'messages');
        await runtime.emitEvent('MESSAGE_RECEIVED', {
          runtime,
          message: mentionMessage,
          callback: async (response) => {
            console.log('Callback for mention message:', response);
          }
        });
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        messages = await runtime.getMemories({
          roomId,
          count: 10,
          tableName: 'messages',
        });
        
        agentResponse = messages.find(
          m => m.entityId === runtime.agentId && 
              m.createdAt && mentionMessage.createdAt && 
              m.createdAt > mentionMessage.createdAt
        );
        
        if (!agentResponse || !agentResponse.content.text) {
          throw new Error('Agent did not respond to direct mention');
        }
        
        console.log('✓ Agent responded to mention:', agentResponse.content.text);
        console.log('✅ shouldRespond test PASSED');
      },
    },

    {
      name: 'Agent processes actions correctly',
      fn: async (runtime: IAgentRuntime) => {
        console.log('Starting action processing test...');
        
        const roomId = createUniqueUuid(runtime, `action-test-${Date.now()}`);
        const userId = createUniqueUuid(runtime, 'test-user');
        
        // Create message that should trigger REPLY action
        const message: Memory = {
          id: v4() as UUID,
          entityId: userId,
          agentId: runtime.agentId,
          roomId: roomId,
          content: {
            text: `${runtime.character.name}, can you tell me a joke?`,
            type: 'text',
            source: 'test',
            channelType: ChannelType.DM,
          },
          createdAt: Date.now(),
        };

        await runtime.createMemory(message, 'messages');
        await runtime.emitEvent('MESSAGE_RECEIVED', {
          runtime,
          message,
          callback: async (response) => {
            console.log('Callback for joke request:', response);
          }
        });
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        const messages = await runtime.getMemories({
          roomId,
          count: 10,
          tableName: 'messages',
        });
        
        const agentResponse = messages.find(
          m => m.entityId === runtime.agentId && 
              m.createdAt && message.createdAt && 
              m.createdAt > message.createdAt
        );
        
        if (!agentResponse) {
          throw new Error('Agent did not process REPLY action');
        }
        
        // Check if response has action metadata
        if (!agentResponse.content.actions || !agentResponse.content.actions.includes('REPLY')) {
          throw new Error('Agent response did not include REPLY action');
        }
        
        console.log('✓ Agent executed REPLY action');
        console.log('✓ Response:', agentResponse.content.text);
        console.log('✓ Actions:', agentResponse.content.actions);
        console.log('✅ Action processing test PASSED');
      },
    },

    {
      name: 'Agent handles message with attachments',
      fn: async (runtime: IAgentRuntime) => {
        console.log('Starting attachment handling test...');
        
        const roomId = createUniqueUuid(runtime, `attachment-test-${Date.now()}`);
        const userId = createUniqueUuid(runtime, 'test-user');
        
        // Create message with attachment
        const message: Memory = {
          id: v4() as UUID,
          entityId: userId,
          agentId: runtime.agentId,
          roomId: roomId,
          content: {
            text: 'Check out this image',
            type: 'text',
            source: 'test',
            channelType: ChannelType.DM,
            attachments: [
              {
                id: 'test-attachment',
                url: 'https://example.com/test.jpg',
                title: 'Test Image',
                source: 'image/jpeg',
                description: 'A test image attachment',
                text: 'This is a test image showing a sample scene',
              },
            ],
          },
          createdAt: Date.now(),
        };

        await runtime.createMemory(message, 'messages');
        await runtime.emitEvent('MESSAGE_RECEIVED', {
          runtime,
          message,
          callback: async (response) => {
            console.log('Callback for attachment message:', response);
          }
        });
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        // Get agent's state to check if attachment was processed
        const state = await runtime.composeState(message, ['ATTACHMENTS']);
        
        if (!state.data?.attachments || state.data.attachments.length === 0) {
          throw new Error('Attachments were not processed in state');
        }
        
        const messages = await runtime.getMemories({
          roomId,
          count: 10,
          tableName: 'messages',
        });
        
        const agentResponse = messages.find(
          m => m.entityId === runtime.agentId && 
              m.createdAt && message.createdAt && 
              m.createdAt > message.createdAt
        );
        
        if (!agentResponse) {
          throw new Error('Agent did not respond to message with attachment');
        }
        
        console.log('✓ Agent processed attachment');
        console.log('✓ Attachment data available in state');
        console.log('✅ Attachment handling test PASSED');
      },
    },

    {
      name: 'Agent maintains conversation context',
      fn: async (runtime: IAgentRuntime) => {
        console.log('Starting conversation context test...');
        
        const roomId = createUniqueUuid(runtime, `context-test-${Date.now()}`);
        const userId = createUniqueUuid(runtime, 'test-user');
        
        // First message
        const message1: Memory = {
          id: v4() as UUID,
          entityId: userId,
          agentId: runtime.agentId,
          roomId: roomId,
          content: {
            text: 'My favorite color is blue',
            type: 'text',
            source: 'test',
            channelType: ChannelType.DM,
          },
          createdAt: Date.now(),
        };

        await runtime.createMemory(message1, 'messages');
        await runtime.emitEvent('MESSAGE_RECEIVED', {
          runtime,
          message: message1,
          callback: async (response) => {
            console.log('First message response:', response);
          }
        });
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        // Second message referencing first
        const message2: Memory = {
          id: v4() as UUID,
          entityId: userId,
          agentId: runtime.agentId,
          roomId: roomId,
          content: {
            text: 'What color did I just mention?',
            type: 'text',
            source: 'test',
            channelType: ChannelType.DM,
          },
          createdAt: Date.now() + 1000,
        };

        await runtime.createMemory(message2, 'messages');
        await runtime.emitEvent('MESSAGE_RECEIVED', {
          runtime,
          message: message2,
          callback: async (response) => {
            console.log('Second message response:', response);
          }
        });
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        const messages = await runtime.getMemories({
          roomId,
          count: 10,
          tableName: 'messages',
        });
        
        const responses = messages
          .filter(m => m.entityId === runtime.agentId && m.createdAt)
          .sort((a, b) => (a.createdAt || 0) - (b.createdAt || 0));
        
        if (responses.length < 2) {
          throw new Error('Agent did not respond to both messages');
        }
        
        const secondResponse = responses[1];
        if (!secondResponse.content.text?.toLowerCase().includes('blue')) {
          throw new Error('Agent did not maintain conversation context');
        }
        
        console.log('✓ Agent maintained context between messages');
        console.log('✓ Second response referenced first message');
        console.log('✅ Conversation context test PASSED');
      },
    },
  ];
}

export default new MessageFlowTestSuite(); 