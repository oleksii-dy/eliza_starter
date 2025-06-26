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
  findEntityByName,
} from '@elizaos/core';
import { SecureMessagingService } from '../services/SecureMessagingService.js';
import { MidnightNetworkError } from '../types/index.js';

/**
 * Action to send secure messages to other agents using Midnight Network's zero-knowledge capabilities
 */
export const sendSecureMessageAction: Action = {
  name: 'SEND_SECURE_MESSAGE',
  similes: ['SECURE_MESSAGE', 'PRIVATE_MESSAGE', 'ZK_MESSAGE', 'ENCRYPTED_MESSAGE'],
  description:
    'Send a secure, private message to another agent using Midnight Network zero-knowledge proofs',

  validate: async (
    runtime: IAgentRuntime,
    message: Memory,
    _state: State | undefined
  ): Promise<boolean> => {
    try {
      // Check if secure messaging service is available
      const messagingService = runtime.getService<SecureMessagingService>('secure-messaging');
      if (!messagingService) {
        logger.warn('Secure messaging service not available');
        return false;
      }

      // Check if the message content contains a recipient and message
      const content = message.content.text?.toLowerCase() || '';

      // Look for patterns indicating secure messaging intent
      const hasSecureMessagePattern =
        content.includes('secure message') ||
        content.includes('private message') ||
        content.includes('encrypted message') ||
        content.includes('zk message') ||
        content.includes('send privately') ||
        content.includes('send securely');

      // Or check if there's a recipient mentioned
      const hasRecipient =
        content.includes('to ') || content.includes('agent ') || content.includes('@');

      return hasSecureMessagePattern || hasRecipient;
    } catch (error) {
      logger.error('Error validating send secure message action:', error);
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
      logger.info('Processing send secure message action');

      const messagingService = runtime.getService<SecureMessagingService>('secure-messaging');
      if (!messagingService) {
        throw new MidnightNetworkError(
          'Secure messaging service not available',
          'SERVICE_NOT_FOUND'
        );
      }

      // Extract recipient and message content
      const { recipient, messageContent, roomId } = await parseMessageContent(
        runtime,
        message,
        state
      );

      if (!recipient) {
        const errorContent: Content = {
          text: 'I need to know who you want to send the secure message to. Please specify a recipient.',
          actions: ['SEND_SECURE_MESSAGE'],
          source: message.content.source,
        };

        if (callback) {
          await callback(errorContent);
        }

        return {
          text: errorContent.text,
          data: { error: 'No recipient specified' },
          values: { success: false, errorType: 'missing_recipient' },
        };
      }

      if (!messageContent) {
        const errorContent: Content = {
          text: 'I need to know what message you want to send securely. Please provide the message content.',
          actions: ['SEND_SECURE_MESSAGE'],
          source: message.content.source,
        };

        if (callback) {
          await callback(errorContent);
        }

        return {
          text: errorContent.text,
          data: { error: 'No message content specified' },
          values: { success: false, errorType: 'missing_content' },
        };
      }

      // Send the secure message
      const result = await messagingService.sendSecureMessage(
        recipient as UUID,
        messageContent,
        roomId as UUID | undefined
      );

      if (result.success) {
        const responseContent: Content = {
          text: `✅ ${result.message}`,
          actions: ['SEND_SECURE_MESSAGE'],
          source: message.content.source,
        };

        if (callback) {
          await callback(responseContent);
        }

        return {
          text: responseContent.text,
          data: {
            messageId: result.data?.messageId,
            recipient,
            roomId,
            proof: result.data?.proof,
          },
          values: {
            success: true,
            messageId: result.data?.messageId,
            recipient,
            encrypted: true,
          },
        };
      } else {
        const errorContent: Content = {
          text: `❌ ${result.message}`,
          actions: ['SEND_SECURE_MESSAGE'],
          source: message.content.source,
        };

        if (callback) {
          await callback(errorContent);
        }

        return {
          text: errorContent.text,
          data: { error: result.data?.error },
          values: { success: false, errorType: 'send_failed' },
        };
      }
    } catch (error) {
      logger.error('Error in send secure message action:', error);

      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      const errorContent: Content = {
        text: `❌ Failed to send secure message: ${errorMessage}`,
        actions: ['SEND_SECURE_MESSAGE'],
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
          text: 'Send a secure message to Agent_Alice saying "Hello, this is a private test message"',
        },
      },
      {
        name: '{{agent}}',
        content: {
          text: '✅ Secure message sent successfully to Agent_Alice using zero-knowledge encryption',
          actions: ['SEND_SECURE_MESSAGE'],
        },
      },
    ],
    [
      {
        name: '{{user}}',
        content: {
          text: 'Can you privately message Bob to ask about the project status?',
        },
      },
      {
        name: '{{agent}}',
        content: {
          text: '✅ Private message sent to Bob asking about project status with ZK proof protection',
          actions: ['SEND_SECURE_MESSAGE'],
        },
      },
    ],
    [
      {
        name: '{{user}}',
        content: {
          text: 'Send encrypted message to room chat_room_123: "Meeting starts in 5 minutes"',
        },
      },
      {
        name: '{{agent}}',
        content: {
          text: '✅ Encrypted message sent to chat room with zero-knowledge privacy protection',
          actions: ['SEND_SECURE_MESSAGE'],
        },
      },
    ],
    [
      {
        name: '{{user}}',
        content: {
          text: 'ZK message to Charlie: "The secret code is 42"',
        },
      },
      {
        name: '{{agent}}',
        content: {
          text: '✅ Zero-knowledge message sent to Charlie with cryptographic proof verification',
          actions: ['SEND_SECURE_MESSAGE'],
        },
      },
    ],
  ] as ActionExample[][],
};

/**
 * Parse message content to extract recipient, message, and optional room ID
 */
async function parseMessageContent(
  runtime: IAgentRuntime,
  message: Memory,
  state: State | undefined
): Promise<{
  recipient?: string;
  messageContent?: string;
  roomId?: string;
}> {
  const text = message.content.text || '';

  // Try to extract recipient from various patterns
  let recipient: string | undefined;
  let messageContent: string | undefined;
  let roomId: string | undefined;

  // Pattern 1: "send secure message to [recipient]: [message]"
  const pattern1 = /(?:send\s+(?:secure|private|encrypted|zk)\s+message\s+to\s+)([^:]+):\s*(.+)/i;
  const match1 = text.match(pattern1);
  if (match1) {
    recipient = match1[1].trim();
    messageContent = match1[2].trim();
  }

  // Pattern 2: "message [recipient] saying [message]"
  const pattern2 = /(?:message\s+)([^\s]+)(?:\s+saying\s+)(.+)/i;
  const match2 = text.match(pattern2);
  if (match2) {
    recipient = match2[1].trim();
    messageContent = match2[2].trim().replace(/['"]/g, '');
  }

  // Pattern 3: "to [recipient]: [message]"
  const pattern3 = /(?:to\s+)([^:]+):\s*(.+)/i;
  const match3 = text.match(pattern3);
  if (match3) {
    recipient = match3[1].trim();
    messageContent = match3[2].trim().replace(/['"]/g, '');
  }

  // Pattern 4: "room [room_id]: [message]"
  const pattern4 = /(?:room\s+)([^:]+):\s*(.+)/i;
  const match4 = text.match(pattern4);
  if (match4) {
    roomId = match4[1].trim();
    messageContent = match4[2].trim().replace(/['"]/g, '');
  }

  // Pattern 5: "[recipient] [message]" (simple format)
  if (!recipient && !roomId) {
    const parts = text.split(' ');
    if (parts.length >= 2) {
      // Look for agent names or IDs
      const potentialRecipient = parts.find(
        (part) =>
          part.toLowerCase().includes('agent') ||
          part.includes('@') ||
          part.match(/^[a-f0-9-]{36}$/i) // UUID pattern
      );

      if (potentialRecipient) {
        recipient = potentialRecipient;
        messageContent = text.replace(potentialRecipient, '').trim();
      }
    }
  }

  // Try to resolve recipient as entity if it's a name
  if (recipient && !recipient.match(/^[a-f0-9-]{36}$/i)) {
    try {
      const entity = await findEntityByName(
        runtime,
        message,
        state || {
          values: {},
          data: {},
          text: '',
        }
      );
      if (entity) {
        recipient = entity.id;
      }
    } catch (error) {
      logger.warn('Could not resolve recipient entity:', error);
    }
  }

  // Convert recipient to UUID if it's not already
  if (recipient && !recipient.match(/^[a-f0-9-]{36}$/i)) {
    // Generate a deterministic UUID for the recipient name
    recipient = asUUID(`agent_${recipient.toLowerCase().replace(/[^a-z0-9]/g, '_')}`);
  }

  // Convert roomId to UUID if provided
  if (roomId && !roomId.match(/^[a-f0-9-]{36}$/i)) {
    roomId = asUUID(`room_${roomId.toLowerCase().replace(/[^a-z0-9]/g, '_')}`);
  }

  return {
    recipient: recipient as string | undefined,
    messageContent,
    roomId: roomId as string | undefined,
  };
}
