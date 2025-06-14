import { Action, IAgentRuntime, logger, Memory, composePromptFromState } from '@elizaos/core';
import { z } from 'zod';
import { callLLMWithTimeout } from '../utils/llmHelpers.js';
import { swapTemplate } from '../templates/swapTemplate.js';
import { initializeQuickswapClient } from '../utils/quickswapClient.js';

interface SwapTokensParams {
  inputTokenSymbolOrAddress: string;
  outputTokenSymbolOrAddress: string;
  amount: string;
  minOutputAmount?: string;
}

/**
 * M5-03: Simulates swapping tokens on Quickswap.
 */
export const swapTokensAction: Action = {
  name: 'swapTokens',
  similes: ['EXCHANGE_TOKENS', 'TRADE_TOKENS', 'PERFORM_SWAP', 'QUICKSWAP_TRADE', 'SWAP'],
  description:
    'Simulates swapping a specified amount of an input token for an output token on Quickswap.',
  validate: async (runtime: IAgentRuntime, message: Memory) => {
    return true; // Defer detailed validation to handler after LLM extraction
  },
  handler: async (runtime: IAgentRuntime, message: Memory) => {
    logger.info(`[swapTokensAction] Handler called for message: "${message.content?.text}"`);

    let inputTokenSymbolOrAddress: string;
    let outputTokenSymbolOrAddress: string;
    let amount: string;
    let minOutputAmount: string | undefined;

    try {
      // Use LLM to extract parameters
      const llmResult = await callLLMWithTimeout<SwapTokensParams & { error?: string }>(
        runtime,
        null,
        swapTemplate,
        'swapTokensAction',
        message.content?.text || ''
      );

      logger.info('[swapTokensAction] LLM result:', JSON.stringify(llmResult));

      if (
        llmResult?.error ||
        !llmResult?.inputTokenSymbolOrAddress ||
        !llmResult?.outputTokenSymbolOrAddress ||
        !llmResult?.amount
      ) {
        throw new Error('Required swap parameters not found by LLM');
      }
      inputTokenSymbolOrAddress = llmResult.inputTokenSymbolOrAddress;
      outputTokenSymbolOrAddress = llmResult.outputTokenSymbolOrAddress;
      amount = llmResult.amount;
      minOutputAmount = llmResult.minOutputAmount;
    } catch (error) {
      logger.warn('[swapTokensAction] LLM extraction failed, trying regex fallback');

      // Fallback to regex extraction (simple, might need refinement)
      const text = message.content?.text || '';

      const inputTokenMatch = text.match(/(?:swap|exchange)\s+(\d+\.?\d*)\s+([a-zA-Z0-9]+)/i);
      const outputTokenMatch = text.match(/(?:for|to)\s+([a-zA-Z0-9]+)/i);

      if (
        inputTokenMatch &&
        inputTokenMatch[1] &&
        inputTokenMatch[2] &&
        outputTokenMatch &&
        outputTokenMatch[1]
      ) {
        amount = inputTokenMatch[1];
        inputTokenSymbolOrAddress = inputTokenMatch[2];
        outputTokenSymbolOrAddress = outputTokenMatch[1];
      } else {
        const errorMessage =
          'Please provide input token, output token, and amount to swap (e.g., "swap 10 USDC for WMATIC").';
        logger.error(`[swapTokensAction] Parameter extraction failed`);

        return {
          text: `❌ **Error**: ${errorMessage}\n\nExamples:\n• "Swap 100 USDC for WMATIC"\n• "Exchange 5 WMATIC for DAI"\n\n**Required parameters:**\n- Input token symbol/address\n- Output token symbol/address\n- Amount to swap`,
          actions: ['swapTokens'],
          data: { error: errorMessage },
        };
      }
    }

    const parsedAmount = parseFloat(amount);
    if (parsedAmount <= 0) {
      return {
        message: 'Swap amount must be greater than zero.',
        details: {
          status: 'error',
          error: 'Invalid swap amount',
        },
      };
    }

    try {
      const quickswapClient = await initializeQuickswapClient(runtime);

      // Simulate swap logic using the client
      const swapResult = await quickswapClient.simulateSwap(
        inputTokenSymbolOrAddress,
        outputTokenSymbolOrAddress,
        parsedAmount
      );

      if (swapResult && swapResult.success) {
        const responseText = `✅ **Swap Simulated Successfully**\n\n**Swap Details:**\n• **Input Token**: ${inputTokenSymbolOrAddress.toUpperCase()}\n• **Output Token**: ${outputTokenSymbolOrAddress.toUpperCase()}\n• **Amount Swapped**: ${amount}\n• **Amount Received (Approx)**: ${swapResult.amountReceived.toFixed(4)}\n• **Transaction Hash**: ${swapResult.transactionHash}\n• **Platform**: Quickswap\n• **Chain ID**: 137`;

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
        const errorMessage =
          swapResult?.error ||
          `Swap for '${inputTokenSymbolOrAddress}/${outputTokenSymbolOrAddress}' failed or is not supported.`;
        return {
          text: `❌ **Error**: ${errorMessage}\n\nPlease verify the token symbols/addresses, amounts, and try again.`,
          actions: ['swapTokens'],
          data: {
            success: false,
            error: errorMessage,
            inputTokenSymbolOrAddress,
            outputTokenSymbolOrAddress,
            amount,
            timestamp: new Date().toISOString(),
          },
        };
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error occurred while simulating swap';
      logger.error(`[swapTokensAction] Error simulating swap:`, error);

      return {
        text: `❌ **Error**: ${errorMessage}\n\nPlease check your configuration and try again. Make sure:\n• Quickswap API URL is properly configured\n• Network connection is stable`,
        actions: ['swapTokens'],
        data: {
          error: errorMessage,
          inputTokenSymbolOrAddress,
          outputTokenSymbolOrAddress,
          amount,
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
