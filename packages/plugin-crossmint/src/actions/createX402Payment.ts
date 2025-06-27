import {
  type Action,
  type ActionResult,
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
  description:
    'Create an X.402 compliant payment request using CrossMint. Can be chained with CHECK_PAYMENT_STATUS to monitor completion or REAL_CREATE_X402_PAYMENT for production payments',

  validate: async (runtime: IAgentRuntime, _message: Memory) => {
    const crossmintService = runtime.getService<CrossMintUniversalWalletService>(
      'crossmint-universal-wallet'
    );
    return !!crossmintService;
  },

  handler: async (
    runtime: IAgentRuntime,
    message: Memory,
    state?: State,
    options?: any,
    callback?: HandlerCallback
  ): Promise<ActionResult> => {
    try {
      const crossmintService = runtime.getService<CrossMintUniversalWalletService>(
        'crossmint-universal-wallet'
      );
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
      const expiresAt = Date.now() + paymentDetails.expiresIn * 60 * 60 * 1000;

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
        data: {
          actionName: 'CREATE_X402_PAYMENT',
          paymentRequest,
          x402Compliant: true,
          paymentId: paymentRequest.id,
          paymentUrl: paymentRequest.paymentUrl,
          amount: paymentRequest.amount,
          currency: paymentRequest.currency,
          network: paymentDetails.network,
          expiresAt,
        },
        values: {
          success: true,
          paymentId: paymentRequest.id,
          paymentUrl: paymentRequest.paymentUrl,
          amount: paymentRequest.amount,
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
        data: {
          actionName: 'CREATE_X402_PAYMENT',
          error: error instanceof Error ? error.message : 'Unknown error',
          errorType: error instanceof CrossMintError ? 'crossmint_error' : 'unknown_error',
        },
        values: {
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        },
      };
    }
  },

  examples: [
    // Multi-action: Create payment then monitor status workflow
    [
      {
        name: '{{user}}',
        content: {
          text: 'Create a payment request for 50 USDC and monitor when it gets paid',
        },
      },
      {
        name: '{{agent}}',
        content: {
          text: "I'll create the payment request and set up monitoring for payment completion.",
          thought:
            'First create the X.402 payment request, then chain to status monitoring to track payment completion in real-time',
          actions: ['CREATE_X402_PAYMENT', 'CHECK_PAYMENT_STATUS'],
        },
      },
    ],
    // Multi-action: Create test then production payment workflow
    [
      {
        name: '{{user}}',
        content: {
          text: 'Create a test payment first, then create the real payment request',
        },
      },
      {
        name: '{{agent}}',
        content: {
          text: "I'll create a test payment request first, then create the production payment.",
          thought:
            'Start with a test payment to validate the flow, then create the actual production payment request using the real X.402 service',
          actions: ['CREATE_X402_PAYMENT', 'REAL_CREATE_X402_PAYMENT'],
        },
      },
    ],
    // Multi-action: Create payment and mint NFT workflow
    [
      {
        name: '{{user}}',
        content: {
          text: 'Create a payment request for NFT purchase, then mint the NFT once paid',
        },
      },
      {
        name: '{{agent}}',
        content: {
          text: "I'll create the payment request and mint the NFT after payment confirmation.",
          thought:
            'Create payment request first, then chain to NFT minting which will only execute after payment verification',
          actions: ['CREATE_X402_PAYMENT', 'MINT_NFT'],
        },
      },
    ],
    [
      {
        name: '{{user}}',
        content: {
          text: 'Create a payment request for 25 USDC on Ethereum',
        },
      },
      {
        name: '{{agent}}',
        content: {
          text: '✅ X.402 Payment Request Created\n\n**Payment ID:** payment-123...\n**Amount:** 25 USDC\n**Network:** ethereum\n**Payment Link:** https://crossmint.io/pay/...\n**Expires:** Tomorrow at 3:00 PM\n\nThe payment request is X.402 compliant and can be used for HTTP-native payments.',
          thought: 'Created X.402 payment request for 25 USDC',
          actions: ['CREATE_X402_PAYMENT'],
        },
      },
    ],
    [
      {
        name: '{{user}}',
        content: {
          text: 'I need to request payment of 0.1 SOL from someone',
        },
      },
      {
        name: '{{agent}}',
        content: {
          text: '✅ X.402 Payment Request Created\n\n**Payment ID:** payment-456...\n**Amount:** 0.1 SOL\n**Network:** solana\n**Payment Link:** https://crossmint.io/pay/...\n**Expires:** Tomorrow at 3:00 PM\n\nThe payment request is X.402 compliant and can be used for HTTP-native payments.',
          thought: 'Created X.402 payment request for 0.1 SOL',
          actions: ['CREATE_X402_PAYMENT'],
        },
      },
    ],
  ],
};
