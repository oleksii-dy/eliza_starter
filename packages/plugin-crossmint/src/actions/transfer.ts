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
 * Transfer Action for CrossMint
 * Enables agents to transfer tokens using CrossMint's MPC wallets
 */
export const transferAction: Action = {
  name: 'CROSSMINT_TRANSFER',
  similes: ['SEND_TOKENS', 'TRANSFER_FUNDS', 'SEND_PAYMENT'],
  description:
    'Transfer tokens using CrossMint MPC wallets. Can be chained with CHECK_PAYMENT_STATUS to verify completion or CREATE_CROSSMINT_WALLET to create recipient wallet first',

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

      // Extract transfer details from message using LLM
      const transferDetailsPrompt = `
        Extract transfer details from this message: "${message.content.text}"
        
        Return JSON with these fields:
        {
          "to": "recipient address",
          "amount": "amount to transfer",
          "currency": "token symbol (ETH, USDC, SOL, etc.)",
          "network": "blockchain network (ethereum, polygon, solana, etc.)",
          "memo": "optional memo or note"
        }
        
        If any required field is missing, indicate with null.
      `;

      const response = await runtime.useModel(ModelType.TEXT_SMALL, {
        prompt: transferDetailsPrompt,
        maxTokens: 200,
      });

      let transferDetails;
      try {
        transferDetails = JSON.parse(response);
      } catch {
        throw new CrossMintError('Could not parse transfer details from message');
      }

      // Validate required fields
      if (!transferDetails.to || !transferDetails.amount) {
        throw new CrossMintError(
          'Missing required transfer details (recipient address and amount)'
        );
      }

      // Set defaults
      transferDetails.network = transferDetails.network || 'ethereum';
      transferDetails.currency = transferDetails.currency || 'ETH';

      // Validate network support
      if (!crossmintService.isChainSupported(transferDetails.network)) {
        throw new CrossMintError(
          `Network ${transferDetails.network} is not supported by CrossMint`
        );
      }

      // Execute transfer
      const result = await crossmintService.transfer({
        to: transferDetails.to,
        amount: transferDetails.amount,
        chain: transferDetails.network,
        tokenAddress:
          transferDetails.currency === 'ETH' || transferDetails.currency === 'SOL'
            ? undefined
            : transferDetails.currency,
        memo: transferDetails.memo,
      });

      const responseText = `✅ Transfer Initiated

**Transaction Hash:** ${result.hash}
**Status:** ${result.status}
**Network:** ${result.chain}
**Amount:** ${transferDetails.amount} ${transferDetails.currency}
**To:** ${transferDetails.to}
${transferDetails.memo ? `**Memo:** ${transferDetails.memo}` : ''}

${
  result.status === 'confirmed'
    ? 'Transaction confirmed on blockchain.'
    : 'Transaction submitted and pending confirmation.'
}`;

      await callback?.({
        text: responseText,
        thought: `Initiated transfer of ${transferDetails.amount} ${transferDetails.currency} to ${transferDetails.to}`,
        actions: ['CROSSMINT_TRANSFER'],
      });

      return {
        data: {
          actionName: 'CROSSMINT_TRANSFER',
          transactionResult: result,
          transferDetails,
          transactionHash: result.hash,
          status: result.status,
          network: result.chain,
          amount: transferDetails.amount,
          currency: transferDetails.currency,
          recipient: transferDetails.to,
        },
        values: {
          success: true,
          transactionHash: result.hash,
          amount: transferDetails.amount,
          recipient: transferDetails.to,
          status: result.status,
        },
      };
    } catch (error) {
      logger.error('Error executing CrossMint transfer:', error);

      const errorMessage = `❌ Transfer failed: ${error instanceof Error ? error.message : 'Unknown error'}`;

      await callback?.({
        text: errorMessage,
        thought: 'Failed to execute CrossMint transfer',
        actions: ['CROSSMINT_TRANSFER'],
      });

      return {
        data: {
          actionName: 'CROSSMINT_TRANSFER',
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
    // Multi-action: Create wallet then transfer
    [
      {
        name: '{{user}}',
        content: {
          text: 'Create a new wallet for Alice and send her 50 USDC',
        },
      },
      {
        name: '{{agent}}',
        content: {
          text: "I'll create a new wallet for Alice and then transfer 50 USDC to it.",
          thought:
            'User wants me to create a wallet for Alice first, then transfer USDC to that new wallet. I need to chain CREATE_CROSSMINT_WALLET followed by CROSSMINT_TRANSFER using the wallet address from the first action.',
          actions: ['CREATE_CROSSMINT_WALLET', 'CROSSMINT_TRANSFER'],
        },
      },
    ],
    // Multi-action: Transfer then check status
    [
      {
        name: '{{user}}',
        content: {
          text: 'Send 2 ETH to 0x742d35Cc6639C0532fBa4c81D63eD2c0c57C1234 and verify the transaction',
        },
      },
      {
        name: '{{agent}}',
        content: {
          text: "I'll send 2 ETH to the address and verify the transaction status.",
          thought:
            'User wants me to transfer ETH and then check the payment status. I should first execute the transfer with CROSSMINT_TRANSFER, then use the transaction hash from that result to check status with CHECK_PAYMENT_STATUS.',
          actions: ['CROSSMINT_TRANSFER', 'CHECK_PAYMENT_STATUS'],
        },
      },
    ],
    // Multi-action: Create recipient wallet, transfer, then monitor
    [
      {
        name: '{{user}}',
        content: {
          text: 'Set up a new wallet for Bob, send him 1000 USDC, and monitor the payment',
        },
      },
      {
        name: '{{agent}}',
        content: {
          text: "I'll create a new wallet for Bob, transfer 1000 USDC to it, and monitor the payment status.",
          thought:
            'This requires a three-step workflow: 1) Create wallet for Bob with CREATE_CROSSMINT_WALLET, 2) Transfer 1000 USDC to the new wallet address using CROSSMINT_TRANSFER, 3) Monitor the transaction with CHECK_PAYMENT_STATUS using the transaction hash.',
          actions: ['CREATE_CROSSMINT_WALLET', 'CROSSMINT_TRANSFER', 'CHECK_PAYMENT_STATUS'],
        },
      },
    ],
    [
      {
        name: '{{user}}',
        content: {
          text: 'Send 100 USDC to 0x742d35Cc6639C0532fBa4c81D63eD2c0c57C1234 on Ethereum',
        },
      },
      {
        name: '{{agent}}',
        content: {
          text: '✅ Transfer Initiated\n\n**Transaction Hash:** 0xabc123...\n**Status:** pending\n**Network:** ethereum\n**Amount:** 100 USDC\n**To:** 0x742d35Cc6639C0532fBa4c81D63eD2c0c57C1234\n\nTransaction submitted and pending confirmation.',
          thought: 'Initiated transfer of 100 USDC to 0x742d35Cc6639C0532fBa4c81D63eD2c0c57C1234',
          actions: ['CROSSMINT_TRANSFER'],
        },
      },
    ],
    [
      {
        name: '{{user}}',
        content: {
          text: 'Transfer 0.5 SOL to 9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM with memo "payment for services"',
        },
      },
      {
        name: '{{agent}}',
        content: {
          text: '✅ Transfer Initiated\n\n**Transaction Hash:** abc123...\n**Status:** pending\n**Network:** solana\n**Amount:** 0.5 SOL\n**To:** 9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM\n**Memo:** payment for services\n\nTransaction submitted and pending confirmation.',
          thought: 'Initiated transfer of 0.5 SOL to 9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM',
          actions: ['CROSSMINT_TRANSFER'],
        },
      },
    ],
  ],
};
