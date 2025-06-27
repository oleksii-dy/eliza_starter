import {
  type Action,
  type ActionExample,
  type ActionResult,
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
  description:
    'Send cryptocurrency to another address with automatic validation and confirmation. Supports action chaining by providing transaction data for receipt generation, tax reporting, or automated accounting workflows.',
  similes: ['TRANSFER', 'SEND_CRYPTO', 'PAY', 'TRANSFER_FUNDS'],

  validate: async (runtime: IAgentRuntime, message: Memory): Promise<boolean> => {
    const text = message.content?.text?.toLowerCase() || '';
    return (
      (text.includes('send') || text.includes('transfer') || text.includes('pay')) &&
      (text.includes('eth') ||
        text.includes('usdc') ||
        text.includes('sol') ||
        text.includes('matic') ||
        text.includes('to'))
    );
  },

  handler: async (
    runtime: IAgentRuntime,
    message: Memory,
    state?: State,
    options?: { [key: string]: unknown },
    callback?: HandlerCallback
  ): Promise<ActionResult> => {
    try {
      const paymentService = runtime.getService<PaymentService>('payment');
      if (!paymentService) {
        await callback?.({
          text: 'Payment service is not available. Please ensure the payment plugin is properly configured.',
          error: true,
        });
        return {
          text: 'Payment service is not available. Please ensure the payment plugin is properly configured.',
          values: { success: false, error: 'service_unavailable' },
          data: { action: 'SEND_PAYMENT' },
        };
      }

      // Extract payment details from the message
      const text = message.content?.text || '';
      const paymentDetails = extractPaymentDetails(text);

      if (!paymentDetails) {
        await callback?.({
          text: 'Could not parse payment details. Please specify amount, currency, and recipient address.',
          error: true,
        });
        return {
          text: 'Could not parse payment details. Please specify amount, currency, and recipient address.',
          values: { success: false, error: 'invalid_payment_details' },
          data: { action: 'SEND_PAYMENT' },
        };
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
        return {
          text: `Payment sent successfully! Transaction hash: ${result.transactionHash}. ${paymentDetails.amount} ${paymentDetails.currency} has been sent to ${paymentDetails.recipient}.`,
          values: {
            success: true,
            transactionHash: result.transactionHash,
            amount: paymentDetails.amount,
            currency: paymentDetails.currency,
            recipient: paymentDetails.recipient,
            status: 'completed',
          },
          data: {
            action: 'SEND_PAYMENT',
            transactionData: {
              hash: result.transactionHash,
              amount: amount.toString(),
              method,
              recipient: paymentDetails.recipient,
              timestamp: new Date().toISOString(),
            },
          },
        };
      } else if (result.status === 'PENDING') {
        await callback?.({
          text: `Payment is pending approval. ${result.error || 'Please confirm the transaction.'}`,
          metadata: {
            paymentId: result.id,
            requiresConfirmation: true,
          },
        });
        return {
          text: `Payment is pending approval. ${result.error || 'Please confirm the transaction.'}`,
          values: {
            success: false,
            status: 'pending',
            paymentId: result.id,
            requiresConfirmation: true,
          },
          data: {
            action: 'SEND_PAYMENT',
            paymentId: result.id,
            pendingReason: result.error,
          },
        };
      } else {
        await callback?.({
          text: `Payment failed: ${result.error || 'Unknown error occurred'}`,
          error: true,
        });
        return {
          text: `Payment failed: ${result.error || 'Unknown error occurred'}`,
          values: {
            success: false,
            error: result.error || 'unknown_error',
            status: 'failed',
          },
          data: {
            action: 'SEND_PAYMENT',
            errorType: 'payment_failed',
            errorDetails: result.error,
          },
        };
      }
    } catch (error) {
      logger.error('[SendPaymentAction] Error:', error);
      await callback?.({
        text: `Error processing payment: ${error instanceof Error ? error.message : 'Unknown error'}`,
        error: true,
      });
      return {
        text: `Error processing payment: ${error instanceof Error ? error.message : 'Unknown error'}`,
        values: {
          success: false,
          error: error instanceof Error ? error.message : 'unknown_error',
        },
        data: {
          action: 'SEND_PAYMENT',
          errorType: 'processing_error',
          errorDetails: error instanceof Error ? error.stack : undefined,
        },
      };
    }
  },

  examples: [
    [
      {
        name: '{{user}}',
        content: { text: 'Send 0.1 ETH to bob.eth' },
      },
      {
        name: '{{agent}}',
        content: {
          text: 'Payment sent successfully! Transaction hash: 0xabc123... 0.1 ETH has been sent to bob.eth.',
          actions: ['SEND_PAYMENT'],
        },
      },
    ],
    [
      {
        name: '{{user}}',
        content: { text: 'Transfer 50 USDC to alice.eth and then send her a confirmation message' },
      },
      {
        name: '{{agent}}',
        content: {
          text: "I'll transfer 50 USDC to alice.eth and then send her a confirmation message.",
          thought:
            'User wants me to send payment and follow up with a message - I should process the payment first, then use the transaction details in the message.',
          actions: ['SEND_PAYMENT'],
        },
      },
      {
        name: '{{agent}}',
        content: {
          text: 'Payment completed! Now sending confirmation message to Alice...',
          thought:
            'Payment successful with transaction hash. I can now send Alice a message with the transaction details.',
          actions: ['SEND_MESSAGE'],
        },
      },
    ],
    [
      {
        name: '{{user}}',
        content: {
          text: 'Pay the invoice for 100 USDC to vendor.eth and update our accounting records',
        },
      },
      {
        name: '{{agent}}',
        content: {
          text: "I'll process the invoice payment and update the accounting records.",
          thought:
            'User wants payment processing followed by accounting updates - I should send the payment first, then use the transaction data for bookkeeping.',
          actions: ['SEND_PAYMENT'],
        },
      },
      {
        name: '{{agent}}',
        content: {
          text: 'Invoice payment completed! Now updating accounting records with transaction details...',
          thought:
            'Payment processed successfully. I can now update the accounting system with the transaction hash and payment details.',
          actions: ['UPDATE_ACCOUNTING'],
        },
      },
    ],
  ] as ActionExample[][],
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
