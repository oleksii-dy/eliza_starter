import { Action, IAgentRuntime, logger, Memory } from '@elizaos/core';
import { initializeQuickswapClient } from '../utils/quickswapClient.js';
import { z } from 'zod';

/**
 * M5-03: Swaps tokens on Quickswap.
 */
export const swapTokensAction: Action = {
  name: 'swapTokens',
  description: 'Swaps a specified amount of an input token for an output token on Quickswap.',
  validate: async (runtime: IAgentRuntime, message: Memory) => {
    try {
      z.object({
        inputTokenSymbolOrAddress: z.string(),
        outputTokenSymbolOrAddress: z.string(),
        amount: z.string(),
      }).parse(message.content);
      return true;
    } catch (error) {
      logger.warn(`[swapTokensAction] Validation failed: ${error.message}`);
      return false;
    }
  },
  handler: async (runtime: IAgentRuntime, message: Memory) => {
    try {
      const parsedParams = z
        .object({
          inputTokenSymbolOrAddress: z
            .string()
            .describe('The symbol or address of the input token (e.g., WMATIC, USDC, 0x...).'),
          outputTokenSymbolOrAddress: z
            .string()
            .describe('The symbol or address of the output token (e.g., WMATIC, USDC, 0x...).'),
          amount: z.string().describe('The amount of input token to swap.'),
        })
        .parse(message.content);

      const { inputTokenSymbolOrAddress, outputTokenSymbolOrAddress, amount } = parsedParams;

      // Parse amount to number
      const parsedAmount = parseFloat(amount);
      if (isNaN(parsedAmount) || parsedAmount <= 0) {
        return {
          text: '❌ **Error**: Invalid amount. Please provide a positive number.',
          actions: ['swapTokens'],
        };
      }

      // Initialize Quickswap client
      const quickswapClient = await initializeQuickswapClient(runtime);

      // Execute swap logic using the client
      const swapResult = await quickswapClient.Swap(
        inputTokenSymbolOrAddress,
        outputTokenSymbolOrAddress,
        parsedAmount
      );

      if (swapResult.success) {
        const responseText = `✅ **Swap Executed Successfully**\n\n**Swap Details:**\n• **Input Token**: ${inputTokenSymbolOrAddress.toUpperCase()}\n• **Output Token**: ${outputTokenSymbolOrAddress.toUpperCase()}\n• **Amount Swapped**: ${amount}\n• **Amount Received**: ${swapResult.amountReceived}\n• **Transaction Hash**: ${swapResult.transactionHash}`;
        return {
          text: responseText,
          actions: ['swapTokens'],
          data: {
            success: true,
            swapDetails: swapResult,
            timestamp: new Date().toISOString(),
          },
        };
      } else {
        return {
          text: `❌ **Error**: ${swapResult.error || 'Failed to execute swap.'}`,
          actions: ['swapTokens'],
          data: {
            success: false,
            error: swapResult.error,
            inputTokenSymbolOrAddress,
            outputTokenSymbolOrAddress,
            amount,
            timestamp: new Date().toISOString(),
          },
        };
      }
    } catch (error) {
      const errorMessage =
        error instanceof z.ZodError
          ? `Invalid parameters: ${error.errors.map((e) => e.message).join(', ')}`
          : error instanceof Error
            ? error.message
            : 'Unknown error occurred while executing swap';
      logger.error(`[swapTokensAction] Error executing swap:`, error);
      return {
        text: `❌ **Error**: ${errorMessage}`,
        actions: ['swapTokens'],
        data: {
          error: errorMessage,
          timestamp: new Date().toISOString(),
        },
      };
    }
  },
  examples: [
    [
      {
        name: '{{user1}}',
        content: {
          text: 'Swap 10 USDC for WMATIC',
        },
      },
      {
        name: '{{user2}}',
        content: {
          text: 'Attempting to swap 10 USDC for WMATIC...',
          action: 'swapTokens',
        },
      },
    ],
    [
      {
        name: '{{user1}}',
        content: {
          text: 'I want to exchange 5 WMATIC for DAI, with at least 4.9 DAI',
        },
      },
      {
        name: '{{user2}} ',
        content: {
          text: 'Processing your exchange for 5 WMATIC for DAI...',
          action: 'swapTokens',
        },
      },
    ],
  ],
};
