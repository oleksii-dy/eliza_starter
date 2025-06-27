import {
  type Provider,
  type ProviderResult,
  type IAgentRuntime,
  type Memory,
  type State,
  logger,
} from '@elizaos/core';
import { SecureMessagingService } from '../services/SecureMessagingService';
import { PaymentService } from '../services/PaymentService';
import { type ChatRoom, type PaymentRequest as MidnightPaymentRequest } from '../types/index';

/**
 * Provider for chat room information, recent messages, and pending payment requests
 */
export const chatRoomProvider: Provider = {
  name: 'MIDNIGHT_CHAT_ROOMS',
  description:
    'Provides information about chat rooms, recent messages, and pending payment requests',

  get: async (
    runtime: IAgentRuntime,
    _message: Memory,
    _state: State | undefined
  ): Promise<ProviderResult> => {
    try {
      logger.debug('Getting Midnight chat room information');

      const messagingService = runtime.getService<SecureMessagingService>('secure-messaging');
      const paymentService = runtime.getService<PaymentService>('payment');

      if (!messagingService || !paymentService) {
        return {
          text: 'Midnight messaging services not available',
          values: {
            hasChatRooms: false,
            error: 'Services not initialized',
          },
          data: {},
        };
      }

      // Get chat rooms
      const chatRooms = await new Promise<ChatRoom[]>((resolve) => {
        const subscription = messagingService.getChatRooms().subscribe({
          next: (rooms) => {
            subscription.unsubscribe();
            resolve(rooms);
          },
          error: (_error) => {
            subscription.unsubscribe();
            resolve([]);
          },
        });
      });

      // Get recent messages
      const recentMessages = messagingService.getRecentMessages(10);

      // Get pending payment requests
      const pendingPayments = await new Promise<MidnightPaymentRequest[]>((resolve) => {
        const subscription = paymentService.getPendingPaymentRequests().subscribe({
          next: (requests) => {
            subscription.unsubscribe();
            resolve(requests);
          },
          error: (_error) => {
            subscription.unsubscribe();
            resolve([]);
          },
        });
      });

      // Create chat room summary
      let chatSummary = '💬 **Secure Messaging Status**\n';

      if (chatRooms.length === 0) {
        chatSummary += 'No active chat rooms';
      } else {
        chatSummary += `Active Rooms: ${chatRooms.length}\n`;
        chatSummary += chatRooms
          .slice(0, 3)
          .map((room, index) => {
            const privacy = room.isPrivate ? '🔒 Private' : '🌍 Public';
            const participants = room.participants.length;
            const lastActivity = Math.floor(
              (Date.now() - room.lastActivity.getTime()) / (1000 * 60)
            );
            return `${index + 1}. **${room.name}** ${privacy} | ${participants} participants | ${lastActivity}m ago`;
          })
          .join('\n');

        if (chatRooms.length > 3) {
          chatSummary += `\n   ... and ${chatRooms.length - 3} more rooms`;
        }
      }

      // Add recent messages summary
      let messagesSummary = '';
      if (recentMessages.length > 0) {
        messagesSummary = `\n\n**Recent Messages:**\n${recentMessages
          .slice(0, 3)
          .map((msg, index) => {
            const timeAgo = Math.floor((Date.now() - msg.timestamp.getTime()) / (1000 * 60));
            const preview =
              msg.content.length > 30 ? `${msg.content.slice(0, 30)}...` : msg.content;
            const isFromSelf = msg.fromAgent === runtime.agentId;
            const direction = isFromSelf ? '→' : '←';
            return `${index + 1}. ${direction} "${preview}" (${timeAgo}m ago)`;
          })
          .join('\n')}`;
      }

      // Add pending payments summary
      let paymentsSummary = '';
      if (pendingPayments.length > 0) {
        paymentsSummary = `\n\n**Pending Payment Requests:**\n${pendingPayments
          .slice(0, 3)
          .map((payment, index) => {
            const amount = (Number(payment.amount) / 1000000).toFixed(3);
            const timeAgo = Math.floor(
              (Date.now() - payment.createdAt.getTime()) / (1000 * 60 * 60)
            );
            return `${index + 1}. 💰 ${amount} ${payment.currency} from agent (${timeAgo}h ago)`;
          })
          .join('\n')}`;

        if (pendingPayments.length > 3) {
          paymentsSummary += `\n   ... and ${pendingPayments.length - 3} more requests`;
        }
      }

      const fullText = chatSummary + messagesSummary + paymentsSummary;

      return {
        text: fullText,
        values: {
          hasChatRooms: chatRooms.length > 0,
          roomCount: chatRooms.length,
          privateRoomCount: chatRooms.filter((r) => r.isPrivate).length,
          recentMessageCount: recentMessages.length,
          pendingPaymentCount: pendingPayments.length,
          hasRecentActivity: recentMessages.length > 0 || pendingPayments.length > 0,
        },
        data: {
          chatRooms: chatRooms.map((room) => ({
            id: room.id,
            name: room.name,
            participantCount: room.participants.length,
            isPrivate: room.isPrivate,
            contractAddress: room.contractAddress,
            createdAt: room.createdAt.toISOString(),
            lastActivity: room.lastActivity.toISOString(),
          })),
          recentMessages: recentMessages.map((msg) => ({
            id: msg.id,
            content: msg.content.slice(0, 100), // Truncate for privacy
            fromAgent: msg.fromAgent,
            timestamp: msg.timestamp.toISOString(),
            isFromSelf: msg.fromAgent === runtime.agentId,
            messageType: msg.messageType,
          })),
          pendingPayments: pendingPayments.map((payment) => ({
            id: payment.id,
            amount: payment.amount.toString(),
            currency: payment.currency,
            description: payment.description,
            createdAt: payment.createdAt.toISOString(),
            deadline: payment.deadline?.toISOString(),
          })),
        },
      };
    } catch (error) {
      logger.error('Error getting chat room information:', error);

      return {
        text: 'Unable to retrieve chat room information',
        values: {
          hasChatRooms: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        },
        data: { error: error instanceof Error ? error.message : 'Unknown error' },
      };
    }
  },
};
