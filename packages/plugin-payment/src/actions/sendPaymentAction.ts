import {
  type Action,
  type IAgentRuntime,
  type Memory,
  type HandlerCallback,
  type State,
  elizaLogger as logger,
} from '@elizaos/core';
import { PaymentService } from '../services/PaymentService';
import { PaymentMethod } from '../types';
import { ethers } from 'ethers';

export const sendPaymentAction: Action = {
  name: 'SEND_PAYMENT',
  description: 'Send cryptocurrency to another address',
  similes: ['TRANSFER', 'SEND_CRYPTO', 'PAY', 'TRANSFER_FUNDS'],
  
  validate: async (runtime: IAgentRuntime, message: Memory): Promise<boolean> => {
    const text = message.content?.text?.toLowerCase() || '';
    return (
      (text.includes('send') || text.includes('transfer') || text.includes('pay')) &&
      (text.includes('eth') || text.includes('usdc') || text.includes('sol') || 
       text.includes('matic') || text.includes('to'))
    );
  },

  handler: async (
    runtime: IAgentRuntime,
    message: Memory,
    state?: State,
    options?: { [key: string]: unknown },
    callback?: HandlerCallback
  ): Promise<Memory[]> => {
    try {
      const paymentService = runtime.getService('payment') as PaymentService;
      if (!paymentService) {
        await callback?.({
          text: 'Payment service is not available. Please ensure the payment plugin is properly configured.',
          error: true,
        });
        return [];
      }

      // Extract payment details from the message
      const text = message.content?.text || '';
      const paymentDetails = extractPaymentDetails(text);

      if (!paymentDetails) {
        await callback?.({
          text: 'Could not parse payment details. Please specify amount, currency, and recipient address.',
          error: true,
        });
        return [];
      }

      logger.info('[SendPaymentAction] Processing payment', paymentDetails);

      // Parse amount to appropriate units
      const amount = ethers.parseUnits(
        paymentDetails.amount,
        paymentDetails.currency === 'ETH' ? 18 : 6
      );

      // Determine payment method based on currency
      let method: PaymentMethod;
      switch (paymentDetails.currency.toUpperCase()) {
        case 'ETH':
          method = PaymentMethod.ETH;
          break;
        case 'USDC':
          method = PaymentMethod.USDC_ETH;
          break;
        case 'SOL':
          method = PaymentMethod.SOL;
          break;
        case 'MATIC':
          method = PaymentMethod.MATIC;
          break;
        default:
          method = PaymentMethod.USDC_ETH;
      }

      // Process the payment
      const result = await paymentService.processPayment(
        {
          id: message.id!,
          userId: message.entityId,
          agentId: runtime.agentId,
          actionName: 'SEND_PAYMENT',
          amount,
          method,
          recipientAddress: paymentDetails.recipient,
          metadata: {
            originalRequest: text,
          },
        },
        runtime
      );

      if (result.status === 'COMPLETED') {
        await callback?.({
          text: `Payment sent successfully! Transaction hash: ${result.transactionHash}. ${paymentDetails.amount} ${paymentDetails.currency} has been sent to ${paymentDetails.recipient}.`,
          metadata: {
            transactionHash: result.transactionHash,
            amount: paymentDetails.amount,
            currency: paymentDetails.currency,
            recipient: paymentDetails.recipient,
          },
        });
      } else if (result.status === 'PENDING') {
        await callback?.({
          text: `Payment is pending approval. ${result.error || 'Please confirm the transaction.'}`,
          metadata: {
            paymentId: result.id,
            requiresConfirmation: true,
          },
        });
      } else {
        await callback?.({
          text: `Payment failed: ${result.error || 'Unknown error occurred'}`,
          error: true,
        });
      }

      return [];
    } catch (error) {
      logger.error('[SendPaymentAction] Error:', error);
      await callback?.({
        text: `Error processing payment: ${error instanceof Error ? error.message : 'Unknown error'}`,
        error: true,
      });
      return [];
    }
  },

  examples: [
    [
      {
        name: '{{user1}}',
        content: { text: 'Send 0.1 ETH to bob.eth' },
      },
      {
        name: '{{agent}}',
        content: { 
          text: 'I\'ll send 0.1 ETH to bob.eth. Processing the transaction now...',
        },
      },
    ],
    [
      {
        name: '{{user1}}',
        content: { text: 'Transfer 50 USDC to 0x742d35Cc6634C0532925a3b844Bc9e7595f7E123' },
      },
      {
        name: '{{agent}}',
        content: { 
          text: 'Processing transfer of 50 USDC to the specified address...',
        },
      },
    ],
  ],
};

/**
 * Extract payment details from text
 */
function extractPaymentDetails(text: string): {
  amount: string;
  currency: string;
  recipient: string;
} | null {
  // Match patterns like "send 0.1 ETH to address" or "transfer 50 USDC to bob.eth"
  const patterns = [
    /(?:send|transfer|pay)\s+(\d+(?:\.\d+)?)\s+(\w+)\s+to\s+(\S+)/i,
    /(\d+(?:\.\d+)?)\s+(\w+)\s+to\s+(\S+)/i,
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) {
      return {
        amount: match[1],
        currency: match[2],
        recipient: match[3],
      };
    }
  }

  return null;
} 