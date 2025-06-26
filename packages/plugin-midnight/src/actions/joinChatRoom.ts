import {
  type Action,
  type ActionExample,
  type ActionResult,
  type Content,
  type HandlerCallback,
  type IAgentRuntime,
  type Memory,
  type State,
  logger,
} from '@elizaos/core';
import { SecureMessagingService } from '../services/SecureMessagingService.js';
import { MidnightNetworkError } from '../types/index.js';

export const joinChatRoomAction: Action = {
  name: 'JOIN_CHAT_ROOM',
  similes: ['JOIN_ROOM', 'ENTER_CHAT', 'CONNECT_ROOM', 'ACCESS_ROOM'],
  description: 'Join an existing secure chat room on Midnight Network using its contract address',

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
        content.includes('join') &&
        (content.includes('chat room') ||
          content.includes('room') ||
          content.includes('chat') ||
          content.includes('0x') || // Contract address
          /[a-f0-9]{40}/.test(content)) // Hex address pattern
      );
    } catch (error) {
      logger.error('Error validating join chat room action:', error);
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
      logger.info('Processing join chat room action');

      const messagingService = runtime.getService<SecureMessagingService>('secure-messaging');
      if (!messagingService) {
        throw new MidnightNetworkError(
          'Secure messaging service not available',
          'SERVICE_NOT_FOUND'
        );
      }

      const contractAddress = extractContractAddress(message.content.text || '');

      if (!contractAddress) {
        const errorContent: Content = {
          text: 'I need the contract address of the chat room you want to join. Please provide a valid contract address.',
          actions: ['JOIN_CHAT_ROOM'],
          source: message.content.source,
        };

        if (callback) {
          await callback(errorContent);
        }

        return {
          text: errorContent.text,
          data: { error: 'No contract address specified' },
          values: { success: false, errorType: 'missing_address' },
        };
      }

      const result = await messagingService.joinChatRoom(contractAddress);

      if (result.success) {
        const responseContent: Content = {
          text: `✅ ${result.message}. You can now send secure messages to this room.`,
          actions: ['JOIN_CHAT_ROOM'],
          source: message.content.source,
        };

        if (callback) {
          await callback(responseContent);
        }

        return {
          text: responseContent.text,
          data: {
            contractAddress: result.data?.contractAddress,
          },
          values: {
            success: true,
            contractAddress: result.data?.contractAddress,
          },
        };
      } else {
        const errorContent: Content = {
          text: `❌ ${result.message}`,
          actions: ['JOIN_CHAT_ROOM'],
          source: message.content.source,
        };

        if (callback) {
          await callback(errorContent);
        }

        return {
          text: errorContent.text,
          data: { error: result.data?.error },
          values: { success: false, errorType: 'join_failed' },
        };
      }
    } catch (error) {
      logger.error('Error in join chat room action:', error);

      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      const errorContent: Content = {
        text: `❌ Failed to join chat room: ${errorMessage}`,
        actions: ['JOIN_CHAT_ROOM'],
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
          text: 'Join chat room at contract address 0x1234567890abcdef1234567890abcdef12345678',
        },
      },
      {
        name: '{{agent}}',
        content: {
          text: '✅ Successfully joined chat room. You can now send secure messages to this room.',
          actions: ['JOIN_CHAT_ROOM'],
        },
      },
    ],
    [
      {
        name: '{{user}}',
        content: {
          text: 'Connect to room 0xabcdef1234567890abcdef1234567890abcdef12',
        },
      },
      {
        name: '{{agent}}',
        content: {
          text: '✅ Connected to chat room with ZK privacy protection enabled.',
          actions: ['JOIN_CHAT_ROOM'],
        },
      },
    ],
  ] as ActionExample[][],
};

function extractContractAddress(text: string): string | undefined {
  // Look for hex addresses (0x followed by 40 hex characters)
  const hexMatch = text.match(/0x[a-fA-F0-9]{40}/);
  if (hexMatch) {
    return hexMatch[0];
  }

  // Look for addresses without 0x prefix
  const addressMatch = text.match(/\b[a-fA-F0-9]{40}\b/);
  if (addressMatch) {
    return `0x${addressMatch[0]}`;
  }

  return undefined;
}
