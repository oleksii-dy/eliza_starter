import {
  type Action,
  type ActionExample,
  type ActionResult,
  type Content,
  type HandlerCallback,
  type IAgentRuntime,
  type Memory,
  type State,
  type UUID,
  logger,
  asUUID,
} from '@elizaos/core';
import { SecureMessagingService } from '../services/SecureMessagingService';
import { MidnightNetworkError } from '../types/index';

export const createChatRoomAction: Action = {
  name: 'CREATE_CHAT_ROOM',
  similes: ['CREATE_ROOM', 'NEW_CHAT', 'SETUP_ROOM', 'MAKE_CHAT_ROOM'],
  description: 'Create a new secure chat room on Midnight Network for multi-agent communication',

  validate: async (
    runtime: IAgentRuntime,
    message: Memory,
    _state: State | undefined
  ): Promise<boolean> => {
    try {
      const messagingService = runtime.getService<SecureMessagingService>('secure-messaging');
      if (!messagingService) {
        return false;
      }

      const content = message.content.text?.toLowerCase() || '';
      return (
        content.includes('create') &&
        (content.includes('chat room') ||
          content.includes('room') ||
          content.includes('chat') ||
          content.includes('group'))
      );
    } catch (error) {
      logger.error('Error validating create chat room action:', error);
      return false;
    }
  },

  handler: async (
    runtime: IAgentRuntime,
    message: Memory,
    state: State | undefined,
    options: any,
    callback?: HandlerCallback
  ): Promise<ActionResult> => {
    try {
      logger.info('Processing create chat room action');

      const messagingService = runtime.getService<SecureMessagingService>('secure-messaging');
      if (!messagingService) {
        throw new MidnightNetworkError(
          'Secure messaging service not available',
          'SERVICE_NOT_FOUND'
        );
      }

      const { roomName, participants, isPrivate } = parseRoomContent(message.content.text || '');

      if (!roomName) {
        const errorContent: Content = {
          text: 'I need a name for the chat room. Please specify a room name.',
          actions: ['CREATE_CHAT_ROOM'],
          source: message.content.source,
        };

        if (callback) {
          await callback(errorContent);
        }

        return {
          text: errorContent.text,
          data: { error: 'No room name specified' },
          values: { success: false, errorType: 'missing_name' },
        };
      }

      const result = await messagingService.createChatRoom(
        roomName,
        participants as UUID[],
        isPrivate
      );

      if (result.success) {
        const responseContent: Content = {
          text: `✅ ${result.message}. Room contract deployed at: ${result.data?.contractAddress}`,
          actions: ['CREATE_CHAT_ROOM'],
          source: message.content.source,
        };

        if (callback) {
          await callback(responseContent);
        }

        return {
          text: responseContent.text,
          data: {
            contractAddress: result.data?.contractAddress,
            roomName,
            participants,
            isPrivate,
          },
          values: {
            success: true,
            contractAddress: result.data?.contractAddress,
            roomName,
            participantCount: participants.length,
          },
        };
      } else {
        const errorContent: Content = {
          text: `❌ ${result.message}`,
          actions: ['CREATE_CHAT_ROOM'],
          source: message.content.source,
        };

        if (callback) {
          await callback(errorContent);
        }

        return {
          text: errorContent.text,
          data: { error: result.data?.error },
          values: { success: false, errorType: 'creation_failed' },
        };
      }
    } catch (error) {
      logger.error('Error in create chat room action:', error);

      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      const errorContent: Content = {
        text: `❌ Failed to create chat room: ${errorMessage}`,
        actions: ['CREATE_CHAT_ROOM'],
        source: message.content.source,
      };

      if (callback) {
        await callback(errorContent);
      }

      return {
        text: errorContent.text,
        data: { error: errorMessage },
        values: { success: false, errorType: 'system_error' },
      };
    }
  },

  examples: [
    [
      {
        name: '{{user}}',
        content: {
          text: 'Create a private chat room called "Project Alpha"',
        },
      },
      {
        name: '{{agent}}',
        content: {
          text: '✅ Private chat room "Project Alpha" created successfully with ZK privacy protection',
          actions: ['CREATE_CHAT_ROOM'],
        },
      },
    ],
    [
      {
        name: '{{user}}',
        content: {
          text: 'Setup a new chat room "Team Meeting" with Alice, Bob, and Charlie',
        },
      },
      {
        name: '{{agent}}',
        content: {
          text: '✅ Chat room "Team Meeting" created with 3 participants using Midnight Network encryption',
          actions: ['CREATE_CHAT_ROOM'],
        },
      },
    ],
  ] as ActionExample[][],
};

function parseRoomContent(text: string): {
  roomName?: string;
  participants: string[];
  isPrivate: boolean;
} {
  let roomName: string | undefined;
  let participants: string[] = [];
  let isPrivate = true; // Default to private

  // Extract room name from quotes
  const nameMatch = text.match(/["']([^"']+)["']/);
  if (nameMatch) {
    roomName = nameMatch[1];
  } else {
    // Try to extract room name after "called" or "named"
    const namedMatch = text.match(/(?:called|named)\s+([^\s,]+)/i);
    if (namedMatch) {
      roomName = namedMatch[1];
    }
  }

  // Extract participants
  const withMatch = text.match(/with\s+(.+?)(?:\s|$)/i);
  if (withMatch) {
    participants = withMatch[1]
      .split(/[,\s]+/)
      .map((p) => p.trim())
      .filter((p) => p.length > 0)
      .map((p) => asUUID(`agent_${p.toLowerCase().replace(/[^a-z0-9]/g, '_')}`));
  }

  // Check if explicitly public
  if (text.toLowerCase().includes('public')) {
    isPrivate = false;
  }

  return { roomName, participants, isPrivate };
}
