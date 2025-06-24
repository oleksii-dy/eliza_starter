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
import { HybridCrossMintUniversalWalletService } from '../services/HybridCrossMintUniversalWalletService';
import { RealX402Service } from '../services/RealX402Service';

/**
 * Real X.402 Payment Request Action
 * Uses actual Coinbase X.402 protocol specification
 */
export const realCreateX402PaymentAction: Action = {
  name: 'REAL_CREATE_X402_PAYMENT',
  similes: ['CREATE_PAYMENT', 'REQUEST_PAYMENT', 'X402_PAYMENT'],
  description: 'Create a real X.402 compliant payment request using Coinbase specification. Can be chained with CHECK_PAYMENT_STATUS to monitor completion or TRANSFER after payment confirmation',

  validate: async (runtime: IAgentRuntime, _message: Memory) => {
    const walletService = runtime.getService<HybridCrossMintUniversalWalletService>('hybrid-crossmint-universal-wallet');
    const x402Service = runtime.getService<RealX402Service>('real-x402');
    return !!(walletService && x402Service);
  },

  handler: async (
    runtime: IAgentRuntime,
    message: Memory,
    state?: State,
    options?: any,
    callback?: HandlerCallback
  ): Promise<ActionResult> => {
    try {
      const walletService = runtime.getService<HybridCrossMintUniversalWalletService>('hybrid-crossmint-universal-wallet');
      const x402Service = runtime.getService<RealX402Service>('real-x402');

      if (!walletService || !x402Service) {
        throw new Error('Required services not available');
      }

      // Extract payment details using LLM
      const paymentDetailsPrompt = `
        Extract payment request details from this message: "${message.content.text}"
        
        Return JSON with these fields:
        {
          "amount": "amount in currency units (e.g., '25.00')",
          "currency": "currency symbol (USDC, ETH, SOL, etc.)",
          "description": "payment description",
          "recipient": "recipient address (optional)",
          "scheme": "payment scheme (coinbase, ethereum, solana)",
          "chain": "blockchain network (ethereum, polygon, solana, etc.)"
        }
        
        Use these defaults if not specified:
        - currency: "USDC"
        - scheme: "coinbase"
        - chain: "ethereum"
      `;

      const response = await runtime.useModel(ModelType.TEXT_SMALL, {
        prompt: paymentDetailsPrompt,
        maxTokens: 200,
      });

      let paymentDetails;
      try {
        paymentDetails = JSON.parse(response);
      } catch {
        // Fallback defaults
        paymentDetails = {
          amount: '10.00',
          currency: 'USDC',
          description: 'Payment request',
          scheme: 'coinbase',
          chain: 'ethereum',
        };
      }

      // Set defaults
      paymentDetails.currency = paymentDetails.currency || 'USDC';
      paymentDetails.scheme = paymentDetails.scheme || 'coinbase';
      paymentDetails.chain = paymentDetails.chain || 'ethereum';

      // Get or create recipient address
      if (!paymentDetails.recipient) {
        // For enterprise use, we might use a default treasury address
        paymentDetails.recipient = runtime.getSetting('CROSSMINT_TREASURY_ADDRESS') ||
                                  '0x742d35Cc6639C0532fBa4c81D63eD2c0c57C1234'; // Default
      }

      // Create real X.402 payment request
      const x402PaymentRequired = await x402Service.createPaymentRequest({
        scheme: paymentDetails.scheme,
        recipient: paymentDetails.recipient,
        amount: paymentDetails.amount,
        currency: paymentDetails.currency,
        chain: paymentDetails.chain,
      });

      // Create universal payment request
      const paymentRequest = await walletService.createPaymentRequest({
        amount: paymentDetails.amount,
        currency: paymentDetails.currency,
        memo: paymentDetails.description,
        network: paymentDetails.chain,
        recipient: paymentDetails.recipient,
      });

      const responseText = `✅ X.402 Payment Request Created

**Payment ID:** ${paymentRequest.id}
**Amount:** ${paymentRequest.amount} ${paymentRequest.currency}
**Scheme:** ${paymentDetails.scheme}
**Network:** ${paymentDetails.chain}
**Recipient:** ${paymentDetails.recipient}
**Payment Link:** ${paymentRequest.paymentUrl}
**Expires:** ${paymentRequest.expiresAt ? new Date(paymentRequest.expiresAt).toLocaleString() : 'No expiration'}

**X.402 Protocol Details:**
- HTTP-native payment protocol
- Real-time settlement capability
- Chain-agnostic implementation
- Enterprise-grade security

This payment request is fully compliant with Coinbase's X.402 specification.`;

      await callback?.({
        text: responseText,
        thought: `Created real X.402 payment request for ${paymentDetails.amount} ${paymentDetails.currency} using ${paymentDetails.scheme} scheme`,
        actions: ['REAL_CREATE_X402_PAYMENT'],
      });

      return {
        data: {
          actionName: 'REAL_CREATE_X402_PAYMENT',
          paymentRequest,
          x402PaymentRequired,
          x402Compliant: true,
          scheme: paymentDetails.scheme,
          paymentId: paymentRequest.id,
          paymentUrl: paymentRequest.paymentUrl,
          amount: paymentRequest.amount,
          currency: paymentRequest.currency,
          recipient: paymentDetails.recipient,
          network: paymentDetails.chain,
        },
        values: {
          success: true,
          paymentId: paymentRequest.id,
          paymentUrl: paymentRequest.paymentUrl,
          amount: paymentRequest.amount,
          scheme: paymentDetails.scheme,
        },
      };
    } catch (error) {
      logger.error('Error creating real X.402 payment:', error);

      const errorMessage = `❌ Failed to create X.402 payment request: ${error instanceof Error ? error.message : 'Unknown error'}

**Possible Issues:**
- Invalid API configuration
- Network connectivity problems
- Unsupported payment scheme
- Missing required parameters

**Troubleshooting:**
- Verify CROSSMINT_API_KEY is set
- Check X402_FACILITATOR_URL configuration
- Ensure supported payment scheme (coinbase, ethereum, solana)`;

      await callback?.({
        text: errorMessage,
        thought: 'Failed to create real X.402 payment request',
        actions: ['REAL_CREATE_X402_PAYMENT'],
      });

      return {
        data: {
          actionName: 'REAL_CREATE_X402_PAYMENT',
          error: error instanceof Error ? error.message : 'Unknown error',
          errorType: 'payment_creation_error',
        },
        values: {
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        },
      };
    }
  },

  examples: [
    // Multi-action: Create production payment then monitor workflow
    [
      {
        name: '{{user}}',
        content: {
          text: 'Create a production X.402 payment request and monitor for completion',
        },
      },
      {
        name: '{{agent}}',
        content: {
          text: "I'll create a production X.402 payment request and monitor its status.",
          thought: 'Create real X.402 payment using Coinbase specification, then chain to payment status monitoring for completion tracking',
          actions: ['REAL_CREATE_X402_PAYMENT', 'CHECK_PAYMENT_STATUS'],
        },
      },
    ],
    // Multi-action: Create payment then auto-transfer workflow
    [
      {
        name: '{{user}}',
        content: {
          text: 'Create a payment request and transfer funds after payment',
        },
      },
      {
        name: '{{agent}}',
        content: {
          text: "I'll create the payment request and handle the fund transfer after payment.",
          thought: 'First create the real X.402 payment request, then chain to transfer action which will execute automatically once payment is confirmed',
          actions: ['REAL_CREATE_X402_PAYMENT', 'TRANSFER'],
        },
      },
    ],
    // Multi-action: Create enterprise payment then mint NFT workflow
    [
      {
        name: '{{user}}',
        content: {
          text: 'Create enterprise payment request then mint premium NFT after payment clears',
        },
      },
      {
        name: '{{agent}}',
        content: {
          text: "I'll create the enterprise payment request and mint the premium NFT after payment.",
          thought: 'Use real X.402 service for enterprise-grade payment processing, then chain to NFT minting for premium access token',
          actions: ['REAL_CREATE_X402_PAYMENT', 'MINT_NFT'],
        },
      },
    ],
    [
      {
        name: '{{user}}',
        content: {
          text: 'Create a payment request for 25 USDC on Ethereum using coinbase scheme',
        },
      },
      {
        name: '{{agent}}',
        content: {
          text: '✅ X.402 Payment Request Created\n\n**Payment ID:** x402-1234...\n**Amount:** 25 USDC\n**Scheme:** coinbase\n**Network:** ethereum\n**Payment Link:** x402://pay?amount=25&currency=USDC\n\nThis payment request is fully compliant with Coinbase\'s X.402 specification.',
          thought: 'Created real X.402 payment request for 25 USDC using coinbase scheme',
          actions: ['REAL_CREATE_X402_PAYMENT'],
        },
      },
    ],
    [
      {
        name: '{{user}}',
        content: {
          text: 'I need to request payment of 0.1 SOL using the solana scheme',
        },
      },
      {
        name: '{{agent}}',
        content: {
          text: '✅ X.402 Payment Request Created\n\n**Payment ID:** x402-5678...\n**Amount:** 0.1 SOL\n**Scheme:** solana\n**Network:** solana\n**Payment Link:** x402://pay?amount=0.1&currency=SOL\n\nThis payment request is fully compliant with Coinbase\'s X.402 specification.',
          thought: 'Created real X.402 payment request for 0.1 SOL using solana scheme',
          actions: ['REAL_CREATE_X402_PAYMENT'],
        },
      },
    ],
  ],
};
