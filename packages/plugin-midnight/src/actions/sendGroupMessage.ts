import { type Action, type IAgentRuntime, type Memory, type State, logger } from '@elizaos/core';
import { NetworkMessagingService } from '../services/NetworkMessagingService';
import { type MidnightActionResult } from '../types/index';

/**
 * Action for sending messages to group chat via Midnight Network
 * This sends real messages through network contracts
 */
export const sendGroupMessage: Action = {
  name: 'SEND_GROUP_MESSAGE',
  similes: [
    'send group message',
    'send message to group',
    'chat in group',
    'message group',
    'send to everyone',
    'group chat',
    'broadcast message',
    'send to team',
    'send to all agents',
  ],
  description: 'Send a message to a group chat using Midnight Network zero-knowledge messaging',
  examples: [
    [
      {
        name: 'Alice',
        content: {
          text: 'Send a message to the development team: "Hello everyone, let\'s discuss the new features"',
        },
      },
      {
        name: 'Assistant',
        content: {
          text: "I'll send your message to the development team group chat using secure Midnight Network messaging.",
          actions: ['SEND_GROUP_MESSAGE'],
        },
      },
    ],
    [
      {
        name: 'Bob',
        content: {
          text: 'Can you send "Meeting at 3pm today" to all agents?',
        },
      },
      {
        name: 'Assistant',
        content: {
          text: "I'll broadcast that meeting reminder to all active agents on the network.",
          actions: ['SEND_GROUP_MESSAGE'],
        },
      },
    ],
    [
      {
        name: 'Charlie',
        content: {
          text: 'Group message: "Testing the new Midnight Network group chat functionality"',
        },
      },
      {
        name: 'Assistant',
        content: {
          text: 'Sending your test message to the group chat. All participants will receive it with zero-knowledge privacy protection.',
          actions: ['SEND_GROUP_MESSAGE'],
        },
      },
    ],
  ],

  validate: async (runtime: IAgentRuntime, message: Memory, _state?: State): Promise<boolean> => {
    logger.info('Validating SEND_GROUP_MESSAGE action');

    try {
      // Check if network messaging service is available
      const networkService = runtime.getService<NetworkMessagingService>('network-messaging');
      if (!networkService) {
        logger.warn('Network messaging service not available');
        return false;
      }

      // Check if message contains group messaging intent
      const text = message.content.text?.toLowerCase() || '';

      const groupKeywords = [
        'group message',
        'send to group',
        'send to everyone',
        'send to all',
        'broadcast',
        'team message',
        'group chat',
        'send to team',
        'message group',
        'send message to',
      ];

      const hasGroupIntent = groupKeywords.some((keyword) => text.includes(keyword));

      if (!hasGroupIntent) {
        // Also check for message content patterns
        const messagePatterns = [
          /send.*["'].*["']/i, // "send 'message'"
          /message.*["'].*["']/i, // "message 'content'"
          /tell.*everyone/i, // "tell everyone"
          /broadcast.*["'].*["']/i, // "broadcast 'message'"
        ];

        const hasMessagePattern = messagePatterns.some((pattern) => pattern.test(text));
        if (!hasMessagePattern) {
          return false;
        }
      }

      // Extract message content
      const messageContent = extractMessageContent(text);
      if (!messageContent || messageContent.length < 1) {
        logger.warn('No valid message content found');
        return false;
      }

      logger.info('SEND_GROUP_MESSAGE validation passed', {
        hasGroupIntent,
        messageLength: messageContent.length,
      });
      return true;
    } catch (error) {
      logger.error('Error validating SEND_GROUP_MESSAGE action:', error);
      return false;
    }
  },

  handler: async (
    runtime: IAgentRuntime,
    message: Memory,
    state?: State,
    options?: any,
    callback?: any
  ): Promise<boolean> => {
    logger.info('Executing SEND_GROUP_MESSAGE action');

    try {
      const networkService = runtime.getService<NetworkMessagingService>('network-messaging');
      if (!networkService) {
        if (callback) {
          callback({
            text: 'Network messaging service is not available. Please ensure the Midnight Network plugin is properly configured.',
            content: { error: 'Service not available' },
          });
        }
        return false;
      }

      const text = message.content.text || '';

      // Extract message content and topic
      const messageContent = extractMessageContent(text);
      const topic = extractTopic(text) || 'general';
      const recipients = extractRecipients(text, networkService);

      if (!messageContent) {
        if (callback) {
          callback({
            text: "I couldn't extract the message content. Please specify what you'd like to send to the group.",
            content: { error: 'No message content' },
          });
        }
        return false;
      }

      logger.info('Sending group message', {
        topic,
        messageLength: messageContent.length,
        recipientCount: recipients?.length || 0,
      });

      // Send the group message through network messaging
      const result: MidnightActionResult = await networkService.sendGroupMessage(
        topic,
        messageContent,
        recipients
      );

      if (result.success) {
        const stats = networkService.getNetworkStats();
        const activeAgents = networkService.getActiveAgents();

        if (callback) {
          callback({
            text: `✅ Group message sent successfully via Midnight Network!
            
📨 **Message**: "${messageContent}"
🏷️ **Topic**: ${topic}
👥 **Recipients**: ${recipients?.length || activeAgents.length} agents
🔐 **Privacy**: Zero-knowledge proof encryption
📡 **Network**: ${result.data?.transactionHash ? 'Confirmed on-chain' : 'Pending confirmation'}
${result.data?.transactionHash ? `🔗 **Transaction**: ${result.data.transactionHash}` : ''}

**Network Status**:
- Active Agents: ${stats.activeAgents}
- Verified Messages: ${stats.verifiedMessages}
- Message Topics: ${stats.topicsWithMessages}

All recipients will receive this message with complete privacy protection. The message content and recipient identities are hidden from network observers through zero-knowledge proofs.`,
            content: {
              success: true,
              messageId: result.data?.messageId,
              transactionHash: result.data?.transactionHash,
              topic,
              recipients: recipients || activeAgents,
              networkStats: stats,
              proof: result.data?.proof,
            },
          });
        }

        return true;
      } else {
        logger.error('Failed to send group message:', result.data?.error);

        if (callback) {
          callback({
            text: `❌ Failed to send group message: ${result.data?.error || 'Unknown error'}
            
Please check your Midnight Network connection and wallet configuration.`,
            content: {
              error: result.data?.error,
              success: false,
            },
          });
        }
        return false;
      }
    } catch (error) {
      logger.error('Error in SEND_GROUP_MESSAGE handler:', error);

      if (callback) {
        callback({
          text: `❌ Error sending group message: ${error instanceof Error ? error.message : 'Unknown error'}`,
          content: { error: error instanceof Error ? error.message : 'Unknown error' },
        });
      }
      return false;
    }
  },
};

/**
 * Extract message content from user input
 */
function extractMessageContent(text: string): string | null {
  // Look for quoted content first
  const quotedMatch = text.match(/["']([^"']+)["']/);
  if (quotedMatch) {
    return quotedMatch[1];
  }

  // Look for content after keywords
  const patterns = [
    /group message[:\s]+(.+)/i,
    /send.*?["']([^"']+)["']/i,
    /message[:\s]+(.+)/i,
    /broadcast[:\s]+(.+)/i,
    /tell everyone[:\s]+(.+)/i,
    /send to (?:group|everyone|all)[:\s]+(.+)/i,
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match && match[1]) {
      return match[1].trim();
    }
  }

  // If no specific pattern, try to extract after common prefixes
  const prefixes = ['send:', 'message:', 'broadcast:', 'say:'];
  for (const prefix of prefixes) {
    if (text.toLowerCase().includes(prefix)) {
      const content = text.substring(text.toLowerCase().indexOf(prefix) + prefix.length).trim();
      if (content.length > 0) {
        return content;
      }
    }
  }

  return null;
}

/**
 * Extract topic/channel from user input
 */
function extractTopic(text: string): string | null {
  // Look for topic indicators
  const topicPatterns = [
    /(?:to|in) (?:the )?([a-zA-Z0-9-_]+) (?:group|chat|channel|team)/i,
    /topic[:\s]+([a-zA-Z0-9-_]+)/i,
    /channel[:\s]+([a-zA-Z0-9-_]+)/i,
  ];

  for (const pattern of topicPatterns) {
    const match = text.match(pattern);
    if (match && match[1]) {
      return match[1].toLowerCase();
    }
  }

  // Check for common topic names
  const commonTopics = ['development', 'general', 'team', 'dev', 'test', 'discussion'];
  const textLower = text.toLowerCase();

  for (const topic of commonTopics) {
    if (textLower.includes(topic)) {
      return topic;
    }
  }

  return null;
}

/**
 * Extract specific recipients from user input
 */
function extractRecipients(
  text: string,
  _networkService: NetworkMessagingService
): string[] | undefined {
  // Look for specific agent mentions
  const mentionPatterns = [/to ([a-zA-Z0-9-_,\s]+) agents?/i, /send to ([a-zA-Z0-9-_,\s]+)/i];

  for (const pattern of mentionPatterns) {
    const match = text.match(pattern);
    if (match && match[1]) {
      const recipients = match[1]
        .split(/[,\s]+/)
        .map((name) => name.trim().toLowerCase())
        .filter((name) => name.length > 0);

      if (
        recipients.length > 0 &&
        !recipients.includes('everyone') &&
        !recipients.includes('all')
      ) {
        return recipients;
      }
    }
  }

  // If no specific recipients, return undefined to send to all
  return undefined;
}
