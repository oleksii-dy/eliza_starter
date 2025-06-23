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
 * Check Payment Status Action for CrossMint
 * Enables agents to check the status of X.402 payment requests
 */
export const checkPaymentStatusAction: Action = {
  name: 'CHECK_PAYMENT_STATUS',
  similes: ['PAYMENT_STATUS', 'CHECK_PAYMENT', 'VERIFY_PAYMENT'],
  description: 'Check the status of an X.402 payment request',

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

      // Extract payment ID from message using LLM
      const paymentIdPrompt = `
        Extract the payment ID from this message: "${message.content.text}"
        
        Look for patterns like:
        - payment-123...
        - Payment ID: xxx
        - ID: xxx
        - payment request xxx
        
        Return just the payment ID string, or null if not found.
      `;

      const response = await runtime.useModel(ModelType.TEXT_SMALL, {
        prompt: paymentIdPrompt,
        maxTokens: 100,
      });

      const paymentId = response.trim().replace(/["'`]/g, '');
      
      if (!paymentId || paymentId === 'null' || paymentId.length < 5) {
        throw new CrossMintError('Could not extract payment ID from message. Please provide a valid payment ID.');
      }

      // Verify payment
      const verification = await crossmintService.verifyPayment(paymentId);

      const statusEmoji = verification.valid ? '✅' : '❌';
      const statusText = verification.valid ? 'COMPLETED' : 'PENDING/FAILED';
      
      const responseText = `${statusEmoji} Payment Status: ${statusText}

**Payment ID:** ${verification.paymentId}
**Amount:** ${verification.amount} ${verification.currency}
**Network:** ${verification.network}
**Valid:** ${verification.valid ? 'Yes' : 'No'}
${verification.transactionHash ? `**Transaction Hash:** ${verification.transactionHash}` : ''}
**Confirmations:** ${verification.confirmations || 0}
${verification.settlementTime ? `**Settlement Time:** ${Math.round(verification.settlementTime / 1000 / 60)} minutes` : ''}
**X.402 Compliant:** ${verification.x402Compliant ? 'Yes' : 'No'}

${verification.valid 
  ? 'Payment has been successfully completed and verified on the blockchain.' 
  : 'Payment is still pending or has failed. Please check again later.'
}`;

      await callback?.({
        text: responseText,
        thought: `Checked payment status for ${paymentId}: ${verification.valid ? 'completed' : 'pending'}`,
        actions: ['CHECK_PAYMENT_STATUS'],
      });

      return {
        text: responseText,
        data: {
          verification,
          paymentId,
        },
      };
    } catch (error) {
      logger.error('Error checking payment status:', error);
      
      const errorMessage = `❌ Failed to check payment status: ${error instanceof Error ? error.message : 'Unknown error'}`;
      
      await callback?.({
        text: errorMessage,
        thought: 'Failed to check payment status',
        actions: ['CHECK_PAYMENT_STATUS'],
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
          text: 'Check the status of payment payment-123abc456def',
        },
      },
      {
        name: 'Agent',
        content: {
          text: '✅ Payment Status: COMPLETED\n\n**Payment ID:** payment-123abc456def\n**Amount:** 25 USDC\n**Network:** ethereum\n**Valid:** Yes\n**Transaction Hash:** 0xabc123...\n**Confirmations:** 12\n**Settlement Time:** 3 minutes\n**X.402 Compliant:** Yes\n\nPayment has been successfully completed and verified on the blockchain.',
          thought: 'Checked payment status for payment-123abc456def: completed',
          actions: ['CHECK_PAYMENT_STATUS'],
        },
      },
    ],
    [
      {
        name: 'User',
        content: {
          text: 'What is the status of my payment ID payment-789xyz?',
        },
      },
      {
        name: 'Agent',
        content: {
          text: '❌ Payment Status: PENDING/FAILED\n\n**Payment ID:** payment-789xyz\n**Amount:** 0.1 SOL\n**Network:** solana\n**Valid:** No\n**Confirmations:** 0\n**X.402 Compliant:** Yes\n\nPayment is still pending or has failed. Please check again later.',
          thought: 'Checked payment status for payment-789xyz: pending',
          actions: ['CHECK_PAYMENT_STATUS'],
        },
      },
    ],
  ],
};