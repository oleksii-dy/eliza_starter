import {
  type Action,
  type ActionExample,
  type HandlerCallback,
  type IAgentRuntime,
  type Memory,
  ModelType,
  type State,
  composePromptFromState,
  logger,
  parseJSONObjectFromText,
} from '@elizaos/core';
import { PublicKey } from '@solana/web3.js';
import { JupiterDexService } from '../services/JupiterDexService.js';
import { TokenService } from '../services/TokenService.js';
import type { SolanaActionResult } from '../types';

/**
 * Respond with a JSON markdown block containing only the extracted values. Use null for any values that cannot be determined.
 *
 * Example response:
 * ```json
 * {
 *     "inputTokenSymbol": "SOL",
 *     "outputTokenSymbol": "USDC",
 *     "inputTokenCA": "So11111111111111111111111111111111111111112",
 *     "outputTokenCA": "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
 *     "amount": 1.5
 * }
 * ```
 *
 * {{recentMessages}}
 *
 * Given the recent messages and wallet information below:
 *
 * {{walletInfo}}
 *
 * Extract the following information about the requested token swap:
 * - Input token symbol (the token being sold)
 * - Output token symbol (the token being bought)
 * - Input token contract address if provided
 * - Output token contract address if provided
 * - Amount to swap
 *
 * Respond with a JSON markdown block containing only the extracted values. Use null for any values that cannot be determined.
 */
const swapTemplate = `Respond with a JSON markdown block containing only the extracted values. Use null for any values that cannot be determined.

Example response:
\`\`\`json
{
    "inputTokenSymbol": "SOL",
    "outputTokenSymbol": "USDC",
    "inputTokenCA": "So11111111111111111111111111111111111111112",
    "outputTokenCA": "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
    "amount": 1.5
}
\`\`\`

{{recentMessages}}

Given the recent messages and wallet information below:

{{walletInfo}}

Extract the following information about the requested token swap:
- Input token symbol (the token being sold)
- Output token symbol (the token being bought)
- Input token contract address if provided
- Output token contract address if provided
- Amount to swap

Respond with a JSON markdown block containing only the extracted values. Use null for any values that cannot be determined.`;

/**
 * Action for executing a token swap from one token to another on Solana.
 *
 * @type {Action}
 * @property {string} name - The name of the action ("SWAP_SOLANA").
 * @property {string[]} similes - Alternative names for the action.
 * @property {Function} validate - Asynchronous function to validate if Solana service is available.
 * @property {string} description - Description of the action.
 * @property {Function} handler - Asynchronous function to handle the token swap process.
 * @property {ActionExample[][]} examples - Examples demonstrating how to use the action.
 */

export const executeSwap: Action = {
  name: 'SWAP_SOLANA',
  similes: [
    'SWAP_SOL',
    'SWAP_TOKENS_SOLANA',
    'TOKEN_SWAP_SOLANA',
    'TRADE_TOKENS_SOLANA',
    'EXCHANGE_TOKENS_SOLANA',
  ],
  validate: async (runtime: IAgentRuntime, message: Memory) => {
    // Check if Jupiter DEX service is available
    const jupiterService = runtime.getService<JupiterDexService>('jupiter-dex');
    if (!jupiterService) {
      logger.warn('[Swap] Jupiter DEX service not available');
      return false;
    }

    // Check if this is a system/agent action
    if (message.entityId === runtime.agentId) {
      return true;
    }

    return true; // Allow all users to swap for now
  },
  description:
    'Perform a token swap from one token to another on Solana using Jupiter aggregator. Works with SOL and SPL tokens.',
  handler: async (
    runtime: IAgentRuntime,
    message: Memory,
    state: State | undefined,
    _options: { [key: string]: unknown } | undefined,
    callback?: HandlerCallback
  ): Promise<SolanaActionResult> => {
    state = await runtime.composeState(message, ['RECENT_MESSAGES']);

    try {
      const jupiterService = runtime.getService<JupiterDexService>('jupiter-dex');
      if (!jupiterService) {
        throw new Error('Jupiter DEX service not initialized');
      }

      const tokenService = runtime.getService<TokenService>('token-service');
      if (!tokenService) {
        throw new Error('Token service not initialized');
      }

      // Get wallet info for context using wallet provider
      const walletProvider = await runtime.providers
        .find((p) => p.name === 'solana-wallet')
        ?.get(runtime, message, state);
      state.values.walletInfo = walletProvider?.data || {};

      const swapPrompt = composePromptFromState({
        state,
        template: swapTemplate,
      });

      const result = await runtime.useModel(ModelType.TEXT_LARGE, {
        prompt: swapPrompt,
      });

      const response = parseJSONObjectFromText(result) as {
        inputTokenSymbol?: string;
        outputTokenSymbol?: string;
        inputTokenCA?: string;
        outputTokenCA?: string;
        amount?: number;
      };

      // Validate input
      if (!response.amount || response.amount <= 0) {
        callback?.({ text: 'Please specify a valid amount to swap' });
        return {
          success: false,
          message: 'Please specify a valid amount to swap',
          data: { error: 'Invalid amount' },
        };
      }

      if (!response.inputTokenSymbol && !response.inputTokenCA) {
        callback?.({ text: 'Please specify the token you want to swap from' });
        return {
          success: false,
          message: 'Please specify the token you want to swap from',
          data: { error: 'Input token not specified' },
        };
      }

      if (!response.outputTokenSymbol && !response.outputTokenCA) {
        callback?.({ text: 'Please specify the token you want to swap to' });
        return {
          success: false,
          message: 'Please specify the token you want to swap to',
          data: { error: 'Output token not specified' },
        };
      }

      // Use token symbols or addresses
      const inputToken = response.inputTokenCA || response.inputTokenSymbol || '';
      const outputToken = response.outputTokenCA || response.outputTokenSymbol || '';

      // Get swap quote
      callback?.({
        text: `Getting quote for swapping ${response.amount} ${inputToken} to ${outputToken}...`,
      });

      const quote = await jupiterService.getSwapQuote(
        inputToken,
        outputToken,
        response.amount,
        50 // 0.5% slippage
      );

      // Calculate price impact
      const priceImpact = await jupiterService.calculatePriceImpact(
        inputToken,
        outputToken,
        response.amount
      );

      // Show quote to user
      callback?.({
        text:
          `Quote received:\n` +
          `• Rate: 1 ${inputToken} = ${priceImpact.rate.toFixed(6)} ${outputToken}\n` +
          `• Expected output: ${priceImpact.minimumReceived.toFixed(6)} ${outputToken}\n` +
          `• Price impact: ${priceImpact.priceImpactPct.toFixed(2)}%\n` +
          `Executing swap...`,
      });

      // Get wallet public key from getWalletKey utility
      const { publicKey: walletPubkey } = await import('../keypairUtils.js').then((m) =>
        m.getWalletKey(runtime, false)
      );
      if (!walletPubkey) {
        throw new Error('Wallet public key not available');
      }

      // Execute swap
      const txSignature = await jupiterService.executeSwap(walletPubkey, quote);

      callback?.({
        text:
          `✅ Swap completed successfully!\n` +
          `Transaction: ${txSignature}\n` +
          `View on Solscan: https://solscan.io/tx/${txSignature}`,
        content: {
          success: true,
          transactionId: txSignature,
          inputToken,
          outputToken,
          amount: response.amount,
          outputAmount: priceImpact.minimumReceived,
        },
      });

      return {
        success: true,
        message: `Swap completed successfully! Transaction ID: ${txSignature}`,
        data: {
          transactionId: txSignature,
          inputTokenAddress: quote.inputMint,
          outputTokenAddress: quote.outputMint,
          amount: response.amount.toString(),
          outputAmount: priceImpact.minimumReceived.toString(),
          inputTokenSymbol: inputToken,
          outputTokenSymbol: outputToken,
          priceImpactPct: priceImpact.priceImpactPct,
          rate: priceImpact.rate,
        },
      };
    } catch (error) {
      if (error instanceof Error) {
        logger.error('Error during token swap:', error);
        callback?.({
          text: `❌ Swap failed: ${error.message}`,
          content: { error: error.message },
        });
        return {
          success: false,
          message: `Swap failed: ${error.message}`,
          data: { error: error.message },
        };
      }
      throw error;
    }
  },
  examples: [
    [
      {
        name: '{{name1}}',
        content: {
          text: 'Swap 0.1 SOL for USDC',
        },
      },
      {
        name: '{{name2}}',
        content: {
          text: "I'll help you swap 0.1 SOL for USDC",
          actions: ['SWAP_SOLANA'],
        },
      },
    ],
    [
      {
        name: '{{name1}}',
        content: {
          text: 'Trade 100 USDC to SOL',
        },
      },
      {
        name: '{{name2}}',
        content: {
          text: "I'll execute the trade of 100 USDC to SOL for you",
          actions: ['SWAP_SOLANA'],
        },
      },
    ],
    [
      {
        name: '{{name1}}',
        content: {
          text: 'Exchange 50 BONK for USDT',
        },
      },
      {
        name: '{{name2}}',
        content: {
          text: "I'll exchange 50 BONK for USDT",
          actions: ['SWAP_SOLANA'],
        },
      },
    ],
  ] as ActionExample[][],
};
