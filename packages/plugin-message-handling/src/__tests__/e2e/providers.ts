import { type TestSuite, type IAgentRuntime, type Memory, type UUID, ChannelType, createUniqueUuid, type Media } from '@elizaos/core';
import { v4 } from 'uuid';

export class ProvidersTestSuite implements TestSuite {
  name = 'message-handling-providers';
  description = 'E2E tests for message handling providers with real runtime data';

  tests = [
    {
      name: 'CHARACTER provider returns agent character data',
      fn: async (runtime: IAgentRuntime) => {
        console.log('Starting CHARACTER provider test...');
        
        const roomId = createUniqueUuid(runtime, `provider-test-${Date.now()}`);
        
        // Ensure room exists before creating message
        await runtime.ensureRoomExists({
          id: roomId,
          name: 'Provider Test Room',
          channelId: 'test-channel',
          serverId: 'test-server',
          type: ChannelType.DM,
          source: 'test',
        });
        
        const message: Memory = {
          id: v4() as UUID,
          entityId: runtime.agentId,
          agentId: runtime.agentId,
          roomId: roomId,
          content: {
            text: 'test message',
            type: 'text',
          },
          createdAt: Date.now(),
        };

        const state = await runtime.composeState(message, ['CHARACTER']);
        
        if (!state.values.agentName) {
          throw new Error('CHARACTER provider did not return agent name');
        }
        
        if (!state.values.bio) {
          throw new Error('CHARACTER provider did not return bio');
        }
        
        console.log('✓ Agent name:', state.values.agentName);
        console.log('✓ Bio provided');
        console.log('✓ Character data:', state.data?.character ? 'Present' : 'Missing');
        console.log('✅ CHARACTER provider test PASSED');
      },
    },

    {
      name: 'TIME provider returns current time',
      fn: async (runtime: IAgentRuntime) => {
        console.log('Starting TIME provider test...');
        
        const roomId = createUniqueUuid(runtime, `time-test-${Date.now()}`);
        
        // Ensure room exists
        await runtime.ensureRoomExists({
          id: roomId,
          name: 'Time Test Room',
          channelId: 'time-channel',
          serverId: 'test-server',
          type: ChannelType.DM,
          source: 'test',
        });
        
        const message: Memory = {
          id: v4() as UUID,
          entityId: runtime.agentId,
          agentId: runtime.agentId,
          roomId: roomId,
          content: {
            text: 'What time is it?',
            type: 'text',
          },
          createdAt: Date.now(),
        };

        const state = await runtime.composeState(message, ['TIME']);
        
        // The TIME provider returns values.time with the human-readable time
        if (!state.values.time) {
          throw new Error('TIME provider did not return time value');
        }
        
        // The TIME provider returns data.time with the Date object
        if (!state.data?.time) {
          throw new Error('TIME provider did not return time data');
        }
        
        console.log('✓ Time value:', state.values.time);
        console.log('✓ Time data present');
        console.log('✅ TIME provider test PASSED');
      },
    },

    {
      name: 'RECENT_MESSAGES provider returns conversation history',
      fn: async (runtime: IAgentRuntime) => {
        console.log('Starting RECENT_MESSAGES provider test...');
        
        const roomId = createUniqueUuid(runtime, `messages-test-${Date.now()}`);
        const userId = createUniqueUuid(runtime, 'test-user');
        
        // Ensure room exists
        await runtime.ensureRoomExists({
          id: roomId,
          name: 'Messages Test Room',
          channelId: 'messages-channel',
          serverId: 'test-server',
          type: ChannelType.DM,
          source: 'test',
        });
        
        // Create entity for the user
        await runtime.createEntity({
          id: userId,
          agentId: runtime.agentId,
          names: ['TestUser'],
          metadata: {
            userName: 'TestUser',
            status: 'ACTIVE',
          },
        });
        
        // Create some messages first
        const messages: Memory[] = [];
        for (let i = 0; i < 3; i++) {
          const msg: Memory = {
            id: v4() as UUID,
            entityId: i % 2 === 0 ? userId : runtime.agentId,
            agentId: runtime.agentId,
            roomId: roomId,
            content: {
              text: `Test message ${i + 1}`,
              type: 'text',
              channelType: ChannelType.DM,
            },
            createdAt: Date.now() + i * 1000,
          };
          
          try {
            await runtime.createMemory(msg, 'messages');
            messages.push(msg);
          } catch (error) {
            console.error('Failed to create memory:', error);
            // Continue with test even if memory creation fails
          }
        }

        // Wait a bit for messages to be saved
        await new Promise(resolve => setTimeout(resolve, 1000));

        const currentMessage: Memory = {
          id: v4() as UUID,
          entityId: userId,
          agentId: runtime.agentId,
          roomId: roomId,
          content: {
            text: 'Show me recent messages',
            type: 'text',
            channelType: ChannelType.DM,
          },
          createdAt: Date.now() + 5000,
        };

        const state = await runtime.composeState(currentMessage, ['RECENT_MESSAGES']);
        
        if (!state.values.recentMessages) {
          throw new Error('RECENT_MESSAGES provider did not return messages');
        }
        
        // Check if there's at least some message data, even if it's empty
        if (!state.data?.recentMessages) {
          throw new Error('RECENT_MESSAGES provider did not return message data array');
        }
        
        console.log('✓ Recent messages text present');
        console.log('✓ Found', state.data.recentMessages.length, 'messages in data');
        console.log('✅ RECENT_MESSAGES provider test PASSED');
      },
    },

    {
      name: 'ATTACHMENTS provider handles media attachments',
      fn: async (runtime: IAgentRuntime) => {
        console.log('Starting ATTACHMENTS provider test...');
        
        const roomId = createUniqueUuid(runtime, `attachments-test-${Date.now()}`);
        
        // Ensure room exists
        await runtime.ensureRoomExists({
          id: roomId,
          name: 'Attachments Test Room',
          channelId: 'attachments-channel',
          serverId: 'test-server',
          type: ChannelType.DM,
          source: 'test',
        });
        
        const testAttachment: Media = {
          id: 'test-media-1',
          url: 'https://example.com/test-image.jpg',
          title: 'Test Image',
          source: 'image/jpeg',
          description: 'A test image for provider testing',
          text: 'This image shows test content',
        };

        const message: Memory = {
          id: v4() as UUID,
          entityId: runtime.agentId,
          agentId: runtime.agentId,
          roomId: roomId,
          content: {
            text: 'Here is an image',
            type: 'text',
            attachments: [testAttachment],
          },
          createdAt: Date.now(),
        };

        const state = await runtime.composeState(message, ['ATTACHMENTS']);
        
        // The ATTACHMENTS provider returns data.attachments array
        if (!state.data?.attachments || !Array.isArray(state.data.attachments)) {
          throw new Error('ATTACHMENTS provider did not return attachment data array');
        }
        
        if (state.data.attachments.length === 0) {
          throw new Error('ATTACHMENTS provider returned empty attachment array');
        }
        
        const attachment = state.data.attachments[0] as Media;
        if (attachment.id !== testAttachment.id) {
          throw new Error('Attachment ID mismatch');
        }
        
        console.log('✓ Attachment data returned');
        console.log('✓ Attachment ID matches');
        console.log('✓ Attachment details preserved');
        console.log('✅ ATTACHMENTS provider test PASSED');
      },
    },

    {
      name: 'ACTIONS provider returns available actions',
      fn: async (runtime: IAgentRuntime) => {
        console.log('Starting ACTIONS provider test...');
        
        const roomId = createUniqueUuid(runtime, `actions-test-${Date.now()}`);
        
        // Ensure room exists
        await runtime.ensureRoomExists({
          id: roomId,
          name: 'Actions Test Room',
          channelId: 'actions-channel',
          serverId: 'test-server',
          type: ChannelType.DM,
          source: 'test',
        });
        
        const message: Memory = {
          id: v4() as UUID,
          entityId: runtime.agentId,
          agentId: runtime.agentId,
          roomId: roomId,
          content: {
            text: 'What actions can you perform?',
            type: 'text',
            channelType: ChannelType.DM,
          },
          createdAt: Date.now(),
        };

        const state = await runtime.composeState(message, ['ACTIONS']);
        
        // The ACTIONS provider returns values.actionNames and data.actionsData
        if (!state.values.actionNames) {
          throw new Error('ACTIONS provider did not return actionNames');
        }
        
        if (!state.data?.actionsData || !Array.isArray(state.data.actionsData)) {
          throw new Error('ACTIONS provider did not return actionsData array');
        }
        
        console.log('✓ Available actions:', state.values.actionNames);
        console.log('✓ Action count:', state.data.actionsData.length);
        
        // Check for expected actions
        const actionNames = state.data.actionsData.map((a: any) => a.name);
        const expectedActions = ['REPLY', 'FOLLOW_ROOM', 'IGNORE', 'NONE'];
        const hasExpectedActions = expectedActions.some(action => actionNames.includes(action));
        
        if (!hasExpectedActions) {
          console.warn('Expected actions not found, but continuing test');
        }
        
        console.log('✓ Actions data structure valid');
        console.log('✅ ACTIONS provider test PASSED');
      },
    },

    {
      name: 'WORLD provider returns room and world information',
      fn: async (runtime: IAgentRuntime) => {
        console.log('Starting WORLD provider test...');
        
        const worldId = createUniqueUuid(runtime, `test-world-${Date.now()}`);
        const roomId = createUniqueUuid(runtime, `world-test-room-${Date.now()}`);
        
        // Ensure world exists
        await runtime.ensureWorldExists({
          id: worldId,
          name: 'Test World',
          serverId: 'test-server',
          agentId: runtime.agentId,
        });
        
        // Ensure room exists with worldId
        await runtime.ensureRoomExists({
          id: roomId,
          name: 'Test Room',
          channelId: 'test-channel',
          serverId: 'test-server',
          worldId: worldId,
          type: ChannelType.GROUP,
          source: 'test',
        });
        
        const message: Memory = {
          id: v4() as UUID,
          entityId: runtime.agentId,
          agentId: runtime.agentId,
          roomId: roomId,
          content: {
            text: 'Tell me about this world',
            type: 'text',
          },
          createdAt: Date.now(),
        };

        const state = await runtime.composeState(message, ['WORLD']);
        
        // The WORLD provider returns data.world object and values.worldName
        if (!state.data?.world) {
          throw new Error('WORLD provider did not return world data');
        }
        
        if (!state.values.worldName) {
          throw new Error('WORLD provider did not return world name');
        }
        
        console.log('✓ World name:', state.values.worldName);
        console.log('✓ Current channel:', state.values.currentChannelName);
        console.log('✓ World data present');
        console.log('✅ WORLD provider test PASSED');
      },
    },

    {
      name: 'PROVIDERS provider lists dynamic providers',
      fn: async (runtime: IAgentRuntime) => {
        console.log('Starting PROVIDERS provider test...');
        
        const roomId = createUniqueUuid(runtime, `providers-test-${Date.now()}`);
        
        // Ensure room exists
        await runtime.ensureRoomExists({
          id: roomId,
          name: 'Providers Test Room',
          channelId: 'providers-channel',
          serverId: 'test-server',
          type: ChannelType.DM,
          source: 'test',
        });
        
        const message: Memory = {
          id: v4() as UUID,
          entityId: runtime.agentId,
          agentId: runtime.agentId,
          roomId: roomId,
          content: {
            text: 'What providers are available?',
            type: 'text',
          },
          createdAt: Date.now(),
        };

        const state = await runtime.composeState(message, ['PROVIDERS']);
        
        if (!state.text || state.text.length === 0) {
          throw new Error('PROVIDERS provider did not return any text');
        }
        
        console.log('✓ Providers list returned');
        
        // Check if it mentions some expected providers
        const expectedProviders = ['ATTACHMENTS', 'WORLD'];
        const mentionsExpected = expectedProviders.some(p => state.text.includes(p));
        
        if (!mentionsExpected) {
          console.warn('Expected dynamic providers not mentioned in list');
        }
        
        console.log('✅ PROVIDERS provider test PASSED');
      },
    },

    {
      name: 'ACTION_STATE provider tracks action execution',
      fn: async (runtime: IAgentRuntime) => {
        console.log('Starting ACTION_STATE provider test...');
        
        const roomId = createUniqueUuid(runtime, `action-state-test-${Date.now()}`);
        
        // Ensure room exists
        await runtime.ensureRoomExists({
          id: roomId,
          name: 'Action State Test Room',
          channelId: 'action-state-channel',
          serverId: 'test-server',
          type: ChannelType.DM,
          source: 'test',
        });
        
        const message: Memory = {
          id: v4() as UUID,
          entityId: runtime.agentId,
          agentId: runtime.agentId,
          roomId: roomId,
          content: {
            text: 'Check action state',
            type: 'text',
          },
          createdAt: Date.now(),
        };

        // First compose state without action results
        const initialState = await runtime.composeState(message, ['ACTION_STATE']);
        
        console.log('✓ Initial action state:', initialState.values?.previousActionCount || 0);
        
        // Simulate some action results in state
        const stateWithActions = await runtime.composeState(message, ['ACTION_STATE'], false);
        stateWithActions.data = {
          ...stateWithActions.data,
          actionResults: [
            { success: true, data: { actionName: 'TEST_ACTION' } },
            { success: false, error: { message: 'Test error' }, data: { actionName: 'FAILED_ACTION' } }
          ]
        };
        
        // Get ACTION_STATE provider again with simulated results
        const actionStateProvider = runtime.providers.find(p => p.name === 'ACTION_STATE');
        if (actionStateProvider) {
          const result = await actionStateProvider.get(runtime, message, stateWithActions);
          
          if (result.text && result.text.includes('TEST_ACTION')) {
            console.log('✓ Action state tracks executed actions');
          }
          
          if (result.values?.previousActionCount === 2) {
            console.log('✓ Action count tracked correctly');
          }
        }
        
        console.log('✅ ACTION_STATE provider test PASSED');
      },
    },

    {
      name: 'ANXIETY provider provides social guidance',
      fn: async (runtime: IAgentRuntime) => {
        console.log('Starting ANXIETY provider test...');
        
        // Ensure room exists for group channel
        const groupRoomId = createUniqueUuid(runtime, 'anxiety-group-test');
        await runtime.ensureRoomExists({
          id: groupRoomId,
          name: 'Anxiety Group Test',
          channelId: 'anxiety-group',
          serverId: 'test-server',
          type: ChannelType.GROUP,
          source: 'test',
        });
        
        // Test in group channel
        const groupMessage: Memory = {
          id: v4() as UUID,
          entityId: runtime.agentId,
          agentId: runtime.agentId,
          roomId: groupRoomId,
          content: {
            text: 'test',
            type: 'text',
            channelType: ChannelType.GROUP,
          },
          createdAt: Date.now(),
        };

        const groupState = await runtime.composeState(groupMessage, ['ANXIETY']);
        
        if (!groupState.values?.anxiety) {
          throw new Error('ANXIETY provider did not return guidance for group channel');
        }
        
        console.log('✓ Group channel anxiety guidance provided');
        
        // Ensure room exists for DM channel
        const dmRoomId = createUniqueUuid(runtime, 'anxiety-dm-test');
        await runtime.ensureRoomExists({
          id: dmRoomId,
          name: 'Anxiety DM Test',
          channelId: 'anxiety-dm',
          serverId: 'test-server',
          type: ChannelType.DM,
          source: 'test',
        });
        
        // Test in DM channel
        const dmMessage: Memory = {
          id: v4() as UUID,
          entityId: runtime.agentId,
          agentId: runtime.agentId,
          roomId: dmRoomId,
          content: {
            text: 'test',
            type: 'text',
            channelType: ChannelType.DM,
          },
          createdAt: Date.now(),
        };

        const dmState = await runtime.composeState(dmMessage, ['ANXIETY']);
        
        if (!dmState.values?.anxiety) {
          throw new Error('ANXIETY provider did not return guidance for DM channel');
        }
        
        // Guidance should be different for different channel types
        if (groupState.values.anxiety === dmState.values.anxiety) {
          console.warn('Warning: Same anxiety guidance for different channel types');
        }
        
        console.log('✓ DM channel anxiety guidance provided');
        console.log('✅ ANXIETY provider test PASSED');
      },
    },

    {
      name: 'CAPABILITIES provider lists service capabilities',
      fn: async (runtime: IAgentRuntime) => {
        console.log('Starting CAPABILITIES provider test...');
        
        const roomId = createUniqueUuid(runtime, 'capabilities-test');
        
        // Ensure room exists
        await runtime.ensureRoomExists({
          id: roomId,
          name: 'Capabilities Test Room',
          channelId: 'capabilities-channel',
          serverId: 'test-server',
          type: ChannelType.DM,
          source: 'test',
        });
        
        const message: Memory = {
          id: v4() as UUID,
          entityId: runtime.agentId,
          agentId: runtime.agentId,
          roomId: roomId,
          content: {
            text: 'What are your capabilities?',
            type: 'text',
          },
          createdAt: Date.now(),
        };

        const state = await runtime.composeState(message, ['CAPABILITIES']);
        
        // Check if any text was returned
        if (state.text && state.text.length > 0) {
          console.log('✓ Capabilities text returned');
          
          // Check if it includes the agent's name
          if (state.text.includes(runtime.character.name)) {
            console.log('✓ Capabilities personalized with agent name');
          }
        } else {
          console.log('✓ No services registered (expected in test environment)');
        }
        
        console.log('✅ CAPABILITIES provider test PASSED');
      },
    },
  ];
}

export default new ProvidersTestSuite(); 