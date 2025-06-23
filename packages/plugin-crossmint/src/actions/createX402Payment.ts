import {
  type Action,
  type IAgentRuntime,
  type Memory,
  type State,
  type HandlerCallback,
  logger,
  ModelType,
} from '@elizaos/core';
import { CrossMintUniversalWalletService } from '../services/CrossMintUniversalWalletService';
import { CrossMintError } from '../types/crossmint';

/**
 * Create X.402 Payment Request Action
 * Enables agents to create HTTP-native payment requests using CrossMint's X.402 implementation
 */
export const createX402PaymentAction: Action = {
  name: 'CREATE_X402_PAYMENT',
  similes: ['CREATE_PAYMENT', 'REQUEST_PAYMENT', 'X402_PAYMENT'],
  description: 'Create an X.402 compliant payment request using CrossMint',

  validate: async (runtime: IAgentRuntime, message: Memory) => {
    const crossmintService = runtime.getService<CrossMintUniversalWalletService>('crossmint-universal-wallet');
    return !!crossmintService;
  },

  handler: async (
    runtime: IAgentRuntime,
    message: Memory,
    state?: State,
    options?: any,
    callback?: HandlerCallback
  ) => {
    try {
      const crossmintService = runtime.getService<CrossMintUniversalWalletService>('crossmint-universal-wallet');
      if (!crossmintService) {
        throw new CrossMintError('CrossMint service not available');
      }

      // Extract payment details from message using LLM
      const paymentDetailsPrompt = `
        Extract payment request details from this message: "${message.content.text}"
        
        Return JSON with these fields:
        {
          "amount": "amount in currency units",
          "currency": "currency symbol (USDC, ETH, SOL, etc.)",
          "description": "payment description",
          "network": "blockchain network (ethereum, polygon, solana, etc.)",
          "expiresIn": "expiration in hours (default 24)"
        }
        
        If any required field is missing, set reasonable defaults.
      `;

      const response = await runtime.useModel(ModelType.TEXT_SMALL, {
        prompt: paymentDetailsPrompt,
        maxTokens: 200,
      });

      let paymentDetails;
      try {
        paymentDetails = JSON.parse(response);
      } catch {
        // Fallback if LLM doesn't return valid JSON
        paymentDetails = {
          amount: '10',
          currency: 'USDC',
          description: 'Payment request',
          network: 'ethereum',
          expiresIn: 24,
        };
      }

      // Create payment request
      const expiresAt = Date.now() + (paymentDetails.expiresIn * 60 * 60 * 1000);
      
      const paymentRequest = await crossmintService.createPaymentRequest({
        amount: paymentDetails.amount,
        currency: paymentDetails.currency,
        memo: paymentDetails.description,
        network: paymentDetails.network,
        expiresAt,
      });

      const responseText = `✅ X.402 Payment Request Created

**Payment ID:** ${paymentRequest.id}
**Amount:** ${paymentRequest.amount} ${paymentRequest.currency}
**Network:** ${paymentDetails.network}
**Payment Link:** ${paymentRequest.paymentUrl}
**Expires:** ${new Date(expiresAt).toLocaleString()}

The payment request is X.402 compliant and can be used for HTTP-native payments.`;

      await callback?.({
        text: responseText,
        thought: `Created X.402 payment request for ${paymentDetails.amount} ${paymentDetails.currency}`,
        actions: ['CREATE_X402_PAYMENT'],
      });

      return {
        text: responseText,
        data: {
          paymentRequest,
          x402Compliant: true,
        },
      };
    } catch (error) {
      logger.error('Error creating X.402 payment:', error);
      
      const errorMessage = `❌ Failed to create X.402 payment request: ${error instanceof Error ? error.message : 'Unknown error'}`;
      
      await callback?.({
        text: errorMessage,
        thought: 'Failed to create X.402 payment request',
        actions: ['CREATE_X402_PAYMENT'],
      });

      return {
        text: errorMessage,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  },

  examples: [
    [
      {
        name: 'User',
        content: {
          text: 'Create a payment request for 25 USDC on Ethereum',
        },
      },
      {
        name: 'Agent',
        content: {
          text: '✅ X.402 Payment Request Created\n\n**Payment ID:** payment-123...\n**Amount:** 25 USDC\n**Network:** ethereum\n**Payment Link:** https://crossmint.io/pay/...\n**Expires:** Tomorrow at 3:00 PM\n\nThe payment request is X.402 compliant and can be used for HTTP-native payments.',
          thought: 'Created X.402 payment request for 25 USDC',
          actions: ['CREATE_X402_PAYMENT'],
        },
      },
    ],
    [
      {
        name: 'User',
        content: {
          text: 'I need to request payment of 0.1 SOL from someone',
        },
      },
      {
        name: 'Agent',
        content: {
          text: '✅ X.402 Payment Request Created\n\n**Payment ID:** payment-456...\n**Amount:** 0.1 SOL\n**Network:** solana\n**Payment Link:** https://crossmint.io/pay/...\n**Expires:** Tomorrow at 3:00 PM\n\nThe payment request is X.402 compliant and can be used for HTTP-native payments.',
          thought: 'Created X.402 payment request for 0.1 SOL',
          actions: ['CREATE_X402_PAYMENT'],
        },
      },
    ],
  ],
};