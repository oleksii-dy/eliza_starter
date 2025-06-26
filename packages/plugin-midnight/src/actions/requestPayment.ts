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
import { PaymentService } from '../services/PaymentService.js';
import { MidnightNetworkError } from '../types/index.js';

export const requestPaymentAction: Action = {
  name: 'REQUEST_PAYMENT',
  similes: ['ASK_PAYMENT', 'INVOICE', 'BILL', 'REQUEST_MONEY', 'CHARGE'],
  description: 'Request payment from another agent using Midnight Network with escrow protection',

  validate: async (
    runtime: IAgentRuntime,
    message: Memory,
    _state: State | undefined
  ): Promise<boolean> => {
    try {
      const paymentService = runtime.getService<PaymentService>('payment');
      if (!paymentService) {
        return false;
      }

      const content = message.content.text?.toLowerCase() || '';
      return (
        content.includes('request') &&
        (content.includes('payment') ||
          content.includes('money') ||
          content.includes('invoice') ||
          content.includes('bill') ||
          content.includes('charge'))
      );
    } catch (error) {
      logger.error('Error validating request payment action:', error);
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
      logger.info('Processing request payment action');

      const paymentService = runtime.getService<PaymentService>('payment');
      if (!paymentService) {
        throw new MidnightNetworkError('Payment service not available', 'SERVICE_NOT_FOUND');
      }

      let { recipient } = parsePaymentRequestContent(message.content.text || '');
      const { amount, currency, description, deadline } = parsePaymentRequestContent(
        message.content.text || ''
      );

      if (!recipient) {
        const errorContent: Content = {
          text: 'I need to know who to request payment from. Please specify a recipient.',
          actions: ['REQUEST_PAYMENT'],
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
          text: 'I need to know how much to request. Please specify a valid amount.',
          actions: ['REQUEST_PAYMENT'],
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

      // Try to resolve recipient as entity
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

      // Convert recipient to UUID if it's not already
      if (recipient && !recipient.match(/^[a-f0-9-]{36}$/i)) {
        recipient = asUUID(`agent_${recipient.toLowerCase().replace(/[^a-z0-9]/g, '_')}`);
      }

      const result = await paymentService.createPaymentRequest(
        recipient as UUID,
        BigInt(Math.floor(amount * 1000000)), // Convert to micro-units
        currency,
        description,
        deadline
      );

      if (result.success) {
        let responseText = `✅ ${result.message}`;
        if (deadline) {
          responseText += ` Payment deadline: ${deadline.toLocaleDateString()}`;
        }
        if (result.data?.contractAddress) {
          responseText += ` Escrow contract: ${result.data.contractAddress}`;
        }

        const responseContent: Content = {
          text: responseText,
          actions: ['REQUEST_PAYMENT'],
          source: message.content.source,
        };

        if (callback) {
          await callback(responseContent);
        }

        return {
          text: responseContent.text,
          data: {
            paymentId: result.data?.paymentId,
            contractAddress: result.data?.contractAddress,
            recipient,
            amount: amount.toString(),
            currency,
            description,
          },
          values: {
            success: true,
            paymentId: result.data?.paymentId,
            amount: amount.toString(),
            currency,
            recipient,
          },
        };
      } else {
        const errorContent: Content = {
          text: `❌ ${result.message}`,
          actions: ['REQUEST_PAYMENT'],
          source: message.content.source,
        };

        if (callback) {
          await callback(errorContent);
        }

        return {
          text: errorContent.text,
          data: { error: result.data?.error },
          values: { success: false, errorType: 'request_failed' },
        };
      }
    } catch (error) {
      logger.error('Error in request payment action:', error);

      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      const errorContent: Content = {
        text: `❌ Failed to request payment: ${errorMessage}`,
        actions: ['REQUEST_PAYMENT'],
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
          text: 'Request payment of 150 MIDNIGHT from Alice for the data analysis service',
        },
      },
      {
        name: '{{agent}}',
        content: {
          text: '✅ Payment request for 150 MIDNIGHT sent to Alice with escrow protection',
          actions: ['REQUEST_PAYMENT'],
        },
      },
    ],
    [
      {
        name: '{{user}}',
        content: {
          text: 'Invoice Bob for 75 tokens for consulting work, due in 7 days',
        },
      },
      {
        name: '{{agent}}',
        content: {
          text: '✅ Payment request for 75 MIDNIGHT created for Bob with 7-day deadline',
          actions: ['REQUEST_PAYMENT'],
        },
      },
    ],
  ] as ActionExample[][],
};

function parsePaymentRequestContent(text: string): {
  recipient?: string;
  amount?: number;
  currency: string;
  description?: string;
  deadline?: Date;
} {
  let recipient: string | undefined;
  let amount: number | undefined;
  let currency = 'MIDNIGHT';
  let description: string | undefined;
  let deadline: Date | undefined;

  // Pattern 1: "request payment of [amount] [currency] from [recipient]"
  const pattern1 = /request\s+payment\s+of\s+(\d+(?:\.\d+)?)\s+(\w+)\s+from\s+([^\s,]+)/i;
  const match1 = text.match(pattern1);
  if (match1) {
    amount = parseFloat(match1[1]);
    currency = match1[2].toUpperCase();
    recipient = match1[3].trim();
  }

  // Pattern 2: "invoice [recipient] for [amount] [currency]"
  const pattern2 = /invoice\s+([^\s,]+)\s+for\s+(\d+(?:\.\d+)?)\s+(\w+)/i;
  const match2 = text.match(pattern2);
  if (match2) {
    recipient = match2[1].trim();
    amount = parseFloat(match2[2]);
    currency = match2[3].toUpperCase();
  }

  // Pattern 3: "charge [recipient] [amount] [currency]"
  const pattern3 = /charge\s+([^\s,]+)\s+(\d+(?:\.\d+)?)\s+(\w+)/i;
  const match3 = text.match(pattern3);
  if (match3) {
    recipient = match3[1].trim();
    amount = parseFloat(match3[2]);
    currency = match3[3].toUpperCase();
  }

  // Extract description after "for"
  const descPattern = /for\s+(.+?)(?:\s*,|$)/i;
  const descMatch = text.match(descPattern);
  if (descMatch) {
    description = descMatch[1].trim();
    // Remove amount and currency from description if present
    description = description.replace(/\d+(?:\.\d+)?\s+\w+/, '').trim();
  }

  // Extract deadline
  const deadlinePattern = /(?:due\s+in\s+(\d+)\s+days?|deadline\s+(\d+)\s+days?)/i;
  const deadlineMatch = text.match(deadlinePattern);
  if (deadlineMatch) {
    const days = parseInt(deadlineMatch[1] || deadlineMatch[2], 10);
    deadline = new Date(Date.now() + days * 24 * 60 * 60 * 1000);
  }

  // Normalize currency
  if (currency.toLowerCase() === 'tokens' || currency.toLowerCase() === 'token') {
    currency = 'MIDNIGHT';
  }

  return { recipient, amount, currency, description, deadline };
}
