import {
  type Action,
  type IAgentRuntime,
  type Memory,
  type State,
  logger,
  asUUID,
} from '@elizaos/core';
import { NetworkMessagingService } from '../services/NetworkMessagingService.js';
import { CostTrackingService } from '../services/CostTrackingService.js';
import { type MidnightActionResult } from '../types/index.js';

/**
 * Action for sharing secret messages with other agents using Midnight Network
 * Tracks costs and verifies message delivery for verification scenario
 */
export const shareSecretAction: Action = {
  name: 'SHARE_SECRET',
  similes: [
    'share secret',
    'share my secret',
    'tell secret',
    'reveal secret',
    'send secret message',
    'share secret message',
    'disclose secret',
    'transmit secret',
    'broadcast secret',
  ],
  description: 'Share secret message with other agents using secure Midnight Network messaging',
  examples: [
    [
      {
        name: 'Alice',
        content: {
          text: 'Share my secret with the other agents',
        },
      },
      {
        name: 'Assistant',
        content: {
          text: "I'll share your secret message with the other agents using secure Midnight Network messaging.",
          actions: ['SHARE_SECRET'],
        },
      },
    ],
    [
      {
        name: 'Bob',
        content: {
          text: "It's time to reveal my secret to everyone",
        },
      },
      {
        name: 'Assistant',
        content: {
          text: "I'll securely transmit your secret to all other agents with zero-knowledge privacy protection.",
          actions: ['SHARE_SECRET'],
        },
      },
    ],
    [
      {
        name: 'Charlie',
        content: {
          text: 'Tell my secret to Alice and Bob',
        },
      },
      {
        name: 'Assistant',
        content: {
          text: "I'll share your secret with Alice and Bob using encrypted Midnight Network messaging.",
          actions: ['SHARE_SECRET'],
        },
      },
    ],
  ],

  validate: async (runtime: IAgentRuntime, message: Memory, state?: State): Promise<boolean> => {
    logger.info('Validating SHARE_SECRET action');

    try {
      // Check if network messaging service is available
      const networkService = runtime.getService<NetworkMessagingService>('network-messaging');
      if (!networkService) {
        logger.warn('Network messaging service not available');
        return false;
      }

      // Check if message contains secret sharing intent
      const text = message.content.text?.toLowerCase() || '';

      const secretKeywords = [
        'share secret',
        'share my secret',
        'tell secret',
        'reveal secret',
        'send secret',
        'transmit secret',
        'disclose secret',
        'broadcast secret',
      ];

      const hasSecretIntent = secretKeywords.some((keyword) => text.includes(keyword));

      if (!hasSecretIntent) {
        // Also check for general sharing patterns
        const sharingPatterns = [
          /share.*with.*agents?/i,
          /tell.*everyone/i,
          /reveal.*to/i,
          /send.*to.*agents?/i,
        ];

        const hasSharing = sharingPatterns.some((pattern) => pattern.test(text));
        if (!hasSharing) {
          return false;
        }
      }

      // Check if agent has a secret to share (from provider)
      const secretProvider = state?.data?.SECRET_MESSAGE;
      if (!secretProvider || !secretProvider.secretMessage) {
        logger.warn('No secret message available to share');
        return false;
      }

      logger.info('SHARE_SECRET validation passed', {
        hasSecretIntent,
        hasSecret: !!secretProvider.secretMessage,
      });
      return true;
    } catch (error) {
      logger.error('Error validating SHARE_SECRET action:', error);
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
    logger.info('Executing SHARE_SECRET action');

    try {
      const networkService = runtime.getService<NetworkMessagingService>('network-messaging');
      const costService = runtime.getService<CostTrackingService>('cost-tracking');

      if (!networkService) {
        if (callback) {
          callback({
            text: 'Network messaging service is not available. Please ensure the Midnight Network plugin is properly configured.',
            content: { error: 'Service not available' },
          });
        }
        return false;
      }

      // Get secret message from provider
      const secretProvider = state?.data?.SECRET_MESSAGE;
      if (!secretProvider || !secretProvider.secretMessage) {
        if (callback) {
          callback({
            text: "I don't have a secret message to share. Please check the secret message provider.",
            content: { error: 'No secret message' },
          });
        }
        return false;
      }

      const secretMessage = secretProvider.secretMessage;
      const secretId = secretProvider.secretId;

      // Check if already shared
      if (secretProvider.hasShared) {
        if (callback) {
          callback({
            text: `I've already shared my secret message: "${secretMessage}". All other agents should have received it.`,
            content: {
              alreadyShared: true,
              secretMessage,
              secretId,
            },
          });
        }
        return true;
      }

      // Get active agents to share with
      const activeAgents = networkService.getActiveAgents();
      const recipients = activeAgents.filter((agentId) => agentId !== runtime.agentId);

      if (recipients.length === 0) {
        if (callback) {
          callback({
            text: 'No other agents found on the network to share the secret with.',
            content: { error: 'No recipients' },
          });
        }
        return false;
      }

      logger.info('Sharing secret message', {
        secretId,
        secretLength: secretMessage.length,
        recipientCount: recipients.length,
      });

      // Calculate estimated cost
      const costEstimate = costService?.calculateSecretMessageCost(
        secretMessage.length,
        recipients.length
      );

      // Format secret message for sharing
      const formattedMessage =
        `🔐 SECRET SHARED: ${secretMessage}\n\n` +
        `Secret ID: ${secretId}\n` +
        `From Agent: ${runtime.agentId}\n` +
        `Timestamp: ${new Date().toISOString()}\n` +
        `Recipients: ${recipients.length} agents\n` +
        'Privacy: Zero-knowledge proof encrypted';

      // Send the secret message through network messaging
      const result: MidnightActionResult = await networkService.sendGroupMessage(
        'secret-sharing',
        formattedMessage,
        recipients
      );

      if (result.success) {
        // Record the cost if cost service is available
        if (costService && result.data?.transactionHash) {
          await costService.recordSecretShareCost(
            secretMessage,
            recipients.length,
            result.data.transactionHash
          );
        }

        // Store memory of sharing the secret
        await runtime.createMemory(
          {
            id: asUUID(`secret-shared-${Date.now()}`),
            agentId: runtime.agentId,
            entityId: runtime.agentId,
            roomId: asUUID('secret-sharing'),
            content: {
              text: `Shared secret: ${secretMessage}`,
              source: 'secret-sharing',
              actions: ['SHARE_SECRET'],
              metadata: {
                secretId,
                transactionHash: result.data?.transactionHash,
                recipientCount: recipients.length,
                cost: costEstimate?.totalCost || 0,
              },
            },
            createdAt: Date.now(),
          },
          'memories'
        );

        // Generate cost report
        const costReport = costService
          ? await costService.generateCostReport()
          : 'Cost tracking not available';

        if (callback) {
          callback({
            text: `✅ Secret successfully shared with ${recipients.length} agents!

🔐 **Secret Message**: "${secretMessage}"
🆔 **Secret ID**: ${secretId}
👥 **Recipients**: ${recipients.join(', ')}
🔗 **Transaction**: ${result.data?.transactionHash || 'Pending'}
💰 **Estimated Cost**: ${costEstimate?.totalCost.toFixed(6) || 'Unknown'} MIDNIGHT

**Network Status**:
- Message encrypted with zero-knowledge proofs
- Recipients can verify authenticity without revealing content
- Privacy protection enabled for all participants

${costReport}

All agents should now have received my secret message in their memory stores!`,
            content: {
              success: true,
              secretMessage,
              secretId,
              transactionHash: result.data?.transactionHash,
              recipients,
              cost: costEstimate?.totalCost || 0,
              costBreakdown: costEstimate?.breakdown || {},
              networkStats: networkService.getNetworkStats(),
            },
          });
        }

        return true;
      } else {
        logger.error('Failed to share secret:', result.data?.error);

        if (callback) {
          callback({
            text: `❌ Failed to share secret: ${result.data?.error || 'Unknown error'}
            
Please check your Midnight Network connection and try again.`,
            content: {
              error: result.data?.error,
              success: false,
            },
          });
        }
        return false;
      }
    } catch (error) {
      logger.error('Error in SHARE_SECRET handler:', error);

      if (callback) {
        callback({
          text: `❌ Error sharing secret: ${error instanceof Error ? error.message : 'Unknown error'}`,
          content: { error: error instanceof Error ? error.message : 'Unknown error' },
        });
      }
      return false;
    }
  },
};
