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
import { PaymentService } from '../services/PaymentService';
import { MidnightNetworkError } from '../types/index';

/**
 * Action to send secure payments to other agents using Midnight Network
 */
export const sendPaymentAction: Action = {
  name: 'SEND_PAYMENT',
  similes: ['PAY', 'TRANSFER', 'SEND_MONEY', 'ZK_PAYMENT', 'SECURE_PAYMENT'],
  description:
    'Send a secure payment to another agent using Midnight Network with zero-knowledge privacy',

  validate: async (
    runtime: IAgentRuntime,
    message: Memory,
    _state: State | undefined
  ): Promise<boolean> => {
    try {
      // Check if payment service is available
      const paymentService = runtime.getService<PaymentService>('payment');
      if (!paymentService) {
        logger.warn('Payment service not available');
        return false;
      }

      // Check if the message content contains payment-related keywords
      const content = message.content.text?.toLowerCase() || '';

      const hasPaymentPattern =
        content.includes('send payment') ||
        content.includes('pay') ||
        content.includes('transfer') ||
        content.includes('send money') ||
        content.includes('zk payment') ||
        content.includes('secure payment') ||
        /\d+\s*(midnight|token|coin)/.test(content) ||
        /pay\s+\d+/.test(content) ||
        /send\s+\d+/.test(content);

      return hasPaymentPattern;
    } catch (error) {
      logger.error('Error validating send payment action:', error);
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
      logger.info('Processing send payment action');

      const paymentService = runtime.getService<PaymentService>('payment');
      if (!paymentService) {
        throw new MidnightNetworkError('Payment service not available', 'SERVICE_NOT_FOUND');
      }

      // Extract payment details
      const { recipient, amount, currency, paymentRequestId } = await parsePaymentContent(
        runtime,
        message,
        state
      );

      if (!recipient) {
        const errorContent: Content = {
          text: 'I need to know who you want to send the payment to. Please specify a recipient.',
          actions: ['SEND_PAYMENT'],
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

      if (!amount || amount <= 0) {
        const errorContent: Content = {
          text: 'I need to know how much you want to send. Please specify a valid amount.',
          actions: ['SEND_PAYMENT'],
          source: message.content.source,
        };

        if (callback) {
          await callback(errorContent);
        }

        return {
          text: errorContent.text,
          data: { error: 'Invalid amount specified' },
          values: { success: false, errorType: 'invalid_amount' },
        };
      }

      // Check balance before sending
      const balance = await paymentService.getBalance();
      if (balance.balance < BigInt(amount)) {
        const errorContent: Content = {
          text: `Insufficient balance. You have ${balance.balance} ${balance.currency}, but need ${amount} ${currency}.`,
          actions: ['SEND_PAYMENT'],
          source: message.content.source,
        };

        if (callback) {
          await callback(errorContent);
        }

        return {
          text: errorContent.text,
          data: { error: 'Insufficient balance' },
          values: { success: false, errorType: 'insufficient_balance' },
        };
      }

      // Send the payment
      const result = await paymentService.sendPayment(
        recipient as UUID,
        BigInt(amount),
        currency,
        paymentRequestId as UUID | undefined
      );

      if (result.success) {
        const responseContent: Content = {
          text: `✅ ${result.message}. Transaction hash: ${result.data?.transactionHash}`,
          actions: ['SEND_PAYMENT'],
          source: message.content.source,
        };

        if (callback) {
          await callback(responseContent);
        }

        return {
          text: responseContent.text,
          data: {
            transactionHash: result.data?.transactionHash,
            recipient,
            amount: amount.toString(),
            currency,
            proof: result.data?.proof,
          },
          values: {
            success: true,
            transactionHash: result.data?.transactionHash,
            amount: amount.toString(),
            currency,
            recipient,
          },
        };
      } else {
        const errorContent: Content = {
          text: `❌ ${result.message}`,
          actions: ['SEND_PAYMENT'],
          source: message.content.source,
        };

        if (callback) {
          await callback(errorContent);
        }

        return {
          text: errorContent.text,
          data: { error: result.data?.error },
          values: { success: false, errorType: 'payment_failed' },
        };
      }
    } catch (error) {
      logger.error('Error in send payment action:', error);

      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      const errorContent: Content = {
        text: `❌ Failed to send payment: ${errorMessage}`,
        actions: ['SEND_PAYMENT'],
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
          text: 'Send 100 MIDNIGHT to Agent_Bob for the consulting work',
        },
      },
      {
        name: '{{agent}}',
        content: {
          text: '✅ Payment of 100 MIDNIGHT sent successfully to Agent_Bob with zero-knowledge privacy protection',
          actions: ['SEND_PAYMENT'],
        },
      },
    ],
    [
      {
        name: '{{user}}',
        content: {
          text: 'Pay Alice 50 tokens for the service she provided',
        },
      },
      {
        name: '{{agent}}',
        content: {
          text: '✅ Secure payment of 50 MIDNIGHT sent to Alice with cryptographic proof verification',
          actions: ['SEND_PAYMENT'],
        },
      },
    ],
    [
      {
        name: '{{user}}',
        content: {
          text: 'Transfer 25 MIDNIGHT to Charlie as payment for the data analysis',
        },
      },
      {
        name: '{{agent}}',
        content: {
          text: '✅ ZK payment of 25 MIDNIGHT transferred to Charlie successfully',
          actions: ['SEND_PAYMENT'],
        },
      },
    ],
    [
      {
        name: '{{user}}',
        content: {
          text: 'Send 200 tokens to agent_12345 for completing the task',
        },
      },
      {
        name: '{{agent}}',
        content: {
          text: '✅ Payment of 200 MIDNIGHT sent to agent_12345 with privacy-preserving zero-knowledge proofs',
          actions: ['SEND_PAYMENT'],
        },
      },
    ],
  ] as ActionExample[][],
};

/**
 * Parse payment content to extract recipient, amount, currency, and optional payment request ID
 */
async function parsePaymentContent(
  runtime: IAgentRuntime,
  message: Memory,
  state: State | undefined
): Promise<{
  recipient?: string;
  amount?: number;
  currency: string;
  paymentRequestId?: string;
}> {
  const text = message.content.text || '';

  let recipient: string | undefined;
  let amount: number | undefined;
  let currency = 'MIDNIGHT'; // Default currency
  let paymentRequestId: string | undefined;

  // Pattern 1: "send [amount] [currency] to [recipient]"
  const pattern1 = /send\s+(\d+(?:\.\d+)?)\s+(\w+)\s+to\s+([^\s]+)/i;
  const match1 = text.match(pattern1);
  if (match1) {
    amount = parseFloat(match1[1]);
    currency = match1[2].toUpperCase();
    recipient = match1[3].trim();
  }

  // Pattern 2: "pay [recipient] [amount] [currency]"
  const pattern2 = /pay\s+([^\s]+)\s+(\d+(?:\.\d+)?)\s+(\w+)/i;
  const match2 = text.match(pattern2);
  if (match2) {
    recipient = match2[1].trim();
    amount = parseFloat(match2[2]);
    currency = match2[3].toUpperCase();
  }

  // Pattern 3: "transfer [amount] [currency] to [recipient]"
  const pattern3 = /transfer\s+(\d+(?:\.\d+)?)\s+(\w+)\s+to\s+([^\s]+)/i;
  const match3 = text.match(pattern3);
  if (match3) {
    amount = parseFloat(match3[1]);
    currency = match3[2].toUpperCase();
    recipient = match3[3].trim();
  }

  // Pattern 4: "pay [recipient] [amount]" (assume default currency)
  const pattern4 = /pay\s+([^\s]+)\s+(\d+(?:\.\d+)?)/i;
  const match4 = text.match(pattern4);
  if (match4) {
    recipient = match4[1].trim();
    amount = parseFloat(match4[2]);
  }

  // Pattern 5: "[amount] [currency] to [recipient]"
  const pattern5 = /(\d+(?:\.\d+)?)\s+(\w+)\s+to\s+([^\s]+)/i;
  const match5 = text.match(pattern5);
  if (match5) {
    amount = parseFloat(match5[1]);
    currency = match5[2].toUpperCase();
    recipient = match5[3].trim();
  }

  // Pattern 6: Extract payment request ID if mentioned
  const requestPattern = /request\s+([a-f0-9-]{36})/i;
  const requestMatch = text.match(requestPattern);
  if (requestMatch) {
    paymentRequestId = requestMatch[1];
  }

  // Normalize currency
  if (currency.toLowerCase() === 'tokens' || currency.toLowerCase() === 'token') {
    currency = 'MIDNIGHT';
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

  // Convert amount to integer (assuming base units)
  if (amount) {
    amount = Math.floor(amount * 1000000); // Convert to micro-units for precision
  }

  return {
    recipient: recipient as string | undefined,
    amount,
    currency,
    paymentRequestId: paymentRequestId as string | undefined,
  };
}
