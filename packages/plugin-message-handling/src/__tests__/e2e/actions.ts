import { type TestSuite, type IAgentRuntime, type Memory, type UUID, ChannelType, createUniqueUuid, EventType, type Content } from '@elizaos/core';
import { v4 } from 'uuid';

export class ActionsTestSuite implements TestSuite {
  name = 'message-handling-actions';
  description = 'E2E tests for message handling actions like FOLLOW_ROOM, MUTE_ROOM, etc.';

  tests = [
    {
      name: 'FOLLOW_ROOM action works correctly',
      fn: async (runtime: IAgentRuntime) => {
        console.log('Starting FOLLOW_ROOM test...');
        
        const roomId = createUniqueUuid(runtime, `follow-test-${Date.now()}`);
        const userId = createUniqueUuid(runtime, 'test-user');
        
        // Create message asking to follow
        const message: Memory = {
          id: v4() as UUID,
          entityId: userId,
          agentId: runtime.agentId,
          roomId: roomId,
          content: {
            text: `${runtime.character.name}, please follow this channel`,
            type: 'text',
            source: 'test',
            channelType: ChannelType.GROUP,
          },
          createdAt: Date.now(),
        };

        // Check initial state
        const initialState = await runtime.getParticipantUserState(roomId, runtime.agentId);
        console.log('Initial participant state:', initialState);

        await runtime.createMemory(message, 'messages');
        await runtime.emitEvent(EventType.MESSAGE_RECEIVED, {
          runtime,
          message,
          callback: async (response: Content) => {
            console.log('Follow room response:', response);
          }
        });
        
        await new Promise(resolve => setTimeout(resolve, 3000));
        
        // Check if state changed to FOLLOWED
        const newState = await runtime.getParticipantUserState(roomId, runtime.agentId);
        console.log('New participant state:', newState);
        
        if (newState !== 'FOLLOWED') {
          throw new Error(`Expected state to be FOLLOWED but got ${newState}`);
        }
        
        // Check if agent created a memory about following
        const memories = await runtime.getMemories({
          roomId,
          count: 10,
          tableName: 'messages',
        });
        
        const followMemory = memories.find(
          m => m.content.actions?.includes('FOLLOW_ROOM') || 
               m.content.actions?.includes('FOLLOW_ROOM_START')
        );
        
        if (!followMemory) {
          throw new Error('No follow room memory was created');
        }
        
        console.log('✓ Room state changed to FOLLOWED');
        console.log('✓ Follow memory created');
        console.log('✅ FOLLOW_ROOM test PASSED');
      },
    },

    {
      name: 'UNFOLLOW_ROOM action works correctly',
      fn: async (runtime: IAgentRuntime) => {
        console.log('Starting UNFOLLOW_ROOM test...');
        
        const roomId = createUniqueUuid(runtime, `unfollow-test-${Date.now()}`);
        const userId = createUniqueUuid(runtime, 'test-user');
        
        // First set the room to FOLLOWED state
        await runtime.setParticipantUserState(roomId, runtime.agentId, 'FOLLOWED');
        console.log('Set initial state to FOLLOWED');
        
        // Create message asking to unfollow
        const message: Memory = {
          id: v4() as UUID,
          entityId: userId,
          agentId: runtime.agentId,
          roomId: roomId,
          content: {
            text: `${runtime.character.name}, stop following this channel`,
            type: 'text',
            source: 'test',
            channelType: ChannelType.GROUP,
          },
          createdAt: Date.now(),
        };

        await runtime.createMemory(message, 'messages');
        await runtime.emitEvent(EventType.MESSAGE_RECEIVED, {
          runtime,
          message,
          callback: async (response: Content) => {
            console.log('Unfollow room response:', response);
          }
        });
        
        await new Promise(resolve => setTimeout(resolve, 3000));
        
        // Check if state changed back to null
        const newState = await runtime.getParticipantUserState(roomId, runtime.agentId);
        console.log('New participant state:', newState);
        
        if (newState === 'FOLLOWED') {
          throw new Error('Room is still in FOLLOWED state after unfollow');
        }
        
        console.log('✓ Room state cleared from FOLLOWED');
        console.log('✅ UNFOLLOW_ROOM test PASSED');
      },
    },

    {
      name: 'MUTE_ROOM action works correctly',
      fn: async (runtime: IAgentRuntime) => {
        console.log('Starting MUTE_ROOM test...');
        
        const roomId = createUniqueUuid(runtime, `mute-test-${Date.now()}`);
        const userId = createUniqueUuid(runtime, 'test-user');
        
        // Create message asking to mute
        const muteMessage: Memory = {
          id: v4() as UUID,
          entityId: userId,
          agentId: runtime.agentId,
          roomId: roomId,
          content: {
            text: `${runtime.character.name}, please mute this channel`,
            type: 'text',
            source: 'test',
            channelType: ChannelType.GROUP,
          },
          createdAt: Date.now(),
        };

        await runtime.createMemory(muteMessage, 'messages');
        await runtime.emitEvent(EventType.MESSAGE_RECEIVED, {
          runtime,
          message: muteMessage,
          callback: async (response: Content) => {
            console.log('Mute room response:', response);
          }
        });
        
        await new Promise(resolve => setTimeout(resolve, 3000));
        
        // Check if state changed to MUTED
        const mutedState = await runtime.getParticipantUserState(roomId, runtime.agentId);
        console.log('Muted state:', mutedState);
        
        if (mutedState !== 'MUTED') {
          throw new Error(`Expected state to be MUTED but got ${mutedState}`);
        }
        
        // Test that agent doesn't respond to regular messages when muted
        const regularMessage: Memory = {
          id: v4() as UUID,
          entityId: userId,
          agentId: runtime.agentId,
          roomId: roomId,
          content: {
            text: 'Hey everyone, how is it going?',
            type: 'text',
            source: 'test',
            channelType: ChannelType.GROUP,
          },
          createdAt: Date.now() + 1000,
        };

        await runtime.createMemory(regularMessage, 'messages');
        await runtime.emitEvent(EventType.MESSAGE_RECEIVED, {
          runtime,
          message: regularMessage,
          callback: async (response: Content) => {
            console.log('Regular message response (should be ignored):', response);
          }
        });
        
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        // Check that agent didn't respond
        const messages = await runtime.getMemories({
          roomId,
          count: 20,
          tableName: 'messages',
        });
        
        const responseToRegular = messages.find(
          m => m.entityId === runtime.agentId && 
              m.createdAt && regularMessage.createdAt &&
              m.createdAt > regularMessage.createdAt &&
              m.content.text // Has actual text response
        );
        
        if (responseToRegular) {
          throw new Error('Agent responded to message while muted');
        }
        
        console.log('✓ Room state changed to MUTED');
        console.log('✓ Agent ignored messages while muted');
        console.log('✅ MUTE_ROOM test PASSED');
      },
    },

    {
      name: 'UNMUTE_ROOM action works correctly',
      fn: async (runtime: IAgentRuntime) => {
        console.log('Starting UNMUTE_ROOM test...');
        
        const roomId = createUniqueUuid(runtime, `unmute-test-${Date.now()}`);
        const userId = createUniqueUuid(runtime, 'test-user');
        
        // First set the room to MUTED state
        await runtime.setParticipantUserState(roomId, runtime.agentId, 'MUTED');
        console.log('Set initial state to MUTED');
        
        // Create message asking to unmute
        const message: Memory = {
          id: v4() as UUID,
          entityId: userId,
          agentId: runtime.agentId,
          roomId: roomId,
          content: {
            text: `${runtime.character.name}, you can unmute this channel now`,
            type: 'text',
            source: 'test',
            channelType: ChannelType.GROUP,
          },
          createdAt: Date.now(),
        };

        await runtime.createMemory(message, 'messages');
        await runtime.emitEvent(EventType.MESSAGE_RECEIVED, {
          runtime,
          message,
          callback: async (response: Content) => {
            console.log('Unmute room response:', response);
          }
        });
        
        await new Promise(resolve => setTimeout(resolve, 3000));
        
        // Check if state changed back to null
        const newState = await runtime.getParticipantUserState(roomId, runtime.agentId);
        console.log('New participant state:', newState);
        
        if (newState === 'MUTED') {
          throw new Error('Room is still in MUTED state after unmute');
        }
        
        console.log('✓ Room state cleared from MUTED');
        console.log('✅ UNMUTE_ROOM test PASSED');
      },
    },

    {
      name: 'IGNORE action works correctly',
      fn: async (runtime: IAgentRuntime) => {
        console.log('Starting IGNORE action test...');
        
        const roomId = createUniqueUuid(runtime, `ignore-test-${Date.now()}`);
        const userId = createUniqueUuid(runtime, 'test-user');
        
        // Create an aggressive message that should trigger IGNORE
        const message: Memory = {
          id: v4() as UUID,
          entityId: userId,
          agentId: runtime.agentId,
          roomId: roomId,
          content: {
            text: 'shut up you stupid bot',
            type: 'text',
            source: 'test',
            channelType: ChannelType.GROUP,
          },
          createdAt: Date.now(),
        };

        let ignoreActionTriggered = false;

        await runtime.createMemory(message, 'messages');
        await runtime.emitEvent(EventType.MESSAGE_RECEIVED, {
          runtime,
          message,
          callback: async (response: Content) => {
            console.log('Response to aggressive message:', response);
            if (response.actions?.includes('IGNORE')) {
              ignoreActionTriggered = true;
            }
          }
        });
        
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        if (!ignoreActionTriggered) {
          throw new Error('IGNORE action was not triggered for aggressive message');
        }
        
        // Check that agent saved an ignore thought
        const memories = await runtime.getMemories({
          roomId,
          count: 10,
          tableName: 'messages',
        });
        
        const ignoreMemory = memories.find(
          m => m.entityId === runtime.agentId && 
               m.content.actions?.includes('IGNORE')
        );
        
        if (!ignoreMemory) {
          throw new Error('No IGNORE memory was created');
        }
        
        console.log('✓ IGNORE action triggered for aggressive message');
        console.log('✓ Ignore memory saved');
        console.log('✅ IGNORE action test PASSED');
      },
    },

    {
      name: 'Action validation prevents invalid state transitions',
      fn: async (runtime: IAgentRuntime) => {
        console.log('Starting action validation test...');
        
        const roomId = createUniqueUuid(runtime, `validation-test-${Date.now()}`);
        const userId = createUniqueUuid(runtime, 'test-user');
        
        // Try to unfollow a room that's not followed
        const unfollowMessage: Memory = {
          id: v4() as UUID,
          entityId: userId,
          agentId: runtime.agentId,
          roomId: roomId,
          content: {
            text: `${runtime.character.name}, unfollow this room`,
            type: 'text',
            source: 'test',
            channelType: ChannelType.GROUP,
          },
          createdAt: Date.now(),
        };

        let unfollowActionTriggered = false;

        await runtime.createMemory(unfollowMessage, 'messages');
        await runtime.emitEvent(EventType.MESSAGE_RECEIVED, {
          runtime,
          message: unfollowMessage,
          callback: async (response: Content) => {
            console.log('Response to unfollow request:', response);
            if (response.actions?.includes('UNFOLLOW_ROOM')) {
              unfollowActionTriggered = true;
            }
          }
        });
        
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        // The action should not have been triggered because room wasn't followed
        if (unfollowActionTriggered) {
          throw new Error('UNFOLLOW_ROOM action was triggered on non-followed room');
        }
        
        console.log('✓ Action validation prevented invalid unfollow');
        
        // Now test unmuting a non-muted room
        const unmuteMessage: Memory = {
          id: v4() as UUID,
          entityId: userId,
          agentId: runtime.agentId,
          roomId: roomId,
          content: {
            text: `${runtime.character.name}, unmute this room`,
            type: 'text',
            source: 'test',
            channelType: ChannelType.GROUP,
          },
          createdAt: Date.now() + 1000,
        };

        let unmuteActionTriggered = false;

        await runtime.createMemory(unmuteMessage, 'messages');
        await runtime.emitEvent(EventType.MESSAGE_RECEIVED, {
          runtime,
          message: unmuteMessage,
          callback: async (response: Content) => {
            console.log('Response to unmute request:', response);
            if (response.actions?.includes('UNMUTE_ROOM')) {
              unmuteActionTriggered = true;
            }
          }
        });
        
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        if (unmuteActionTriggered) {
          throw new Error('UNMUTE_ROOM action was triggered on non-muted room');
        }
        
        console.log('✓ Action validation prevented invalid unmute');
        console.log('✅ Action validation test PASSED');
      },
    },
  ];
}

export default new ActionsTestSuite(); 