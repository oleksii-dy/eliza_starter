import { Action, IAgentRuntime, logger, Memory, composePromptFromState } from '@elizaos/core';
import { z } from 'zod';
import { callLLMWithTimeout } from '../utils/llmHelpers.js';
import { calculateTokenPriceTemplate } from '../templates/calculateTokenPriceTemplate.js';
import { initializeQuickswapClient } from '../utils/quickswapClient.js';

interface CalculateTokenPriceParams {
  tokenSymbolOrAddress: string;
  vsTokenSymbolOrAddress: string;
}

/**
 * M5-09: Calculates the price of a given token against another token on Quickswap.
 */
export const calculateTokenPriceAction: Action = {
  name: 'calculateTokenPrice',
  similes: ['GET_TOKEN_PRICE', 'CHECK_TOKEN_RATE', 'ESTIMATE_TOKEN_VALUE'],
  description:
    'Calculates the price of a specified token against another token on Quickswap (e.g., MATIC price in USDC).',
  validate: async (runtime: IAgentRuntime, message: Memory) => {
    return true;
  },
  handler: async (runtime: IAgentRuntime, message: Memory) => {
    logger.info(
      `[calculateTokenPriceAction] Handler called for message: "${message.content?.text}"`
    );

    let tokenSymbolOrAddress: string;
    let vsTokenSymbolOrAddress: string;

    try {
      const llmResult = await callLLMWithTimeout<CalculateTokenPriceParams & { error?: string }>(
        runtime,
        null,
        calculateTokenPriceTemplate,
        'calculateTokenPriceAction',
        message.content?.text || ''
      );

      logger.info('[calculateTokenPriceAction] LLM result:', JSON.stringify(llmResult));

      if (
        llmResult?.error ||
        !llmResult?.tokenSymbolOrAddress ||
        !llmResult?.vsTokenSymbolOrAddress
      ) {
        throw new Error('Required token parameters not found by LLM');
      }
      tokenSymbolOrAddress = llmResult.tokenSymbolOrAddress;
      vsTokenSymbolOrAddress = llmResult.vsTokenSymbolOrAddress;
    } catch (error) {
      logger.warn('[calculateTokenPriceAction] LLM extraction failed, trying regex fallback');

      const text = message.content?.text || '';
      const matches = text.match(/price\s+of\s+([a-zA-Z0-9]+)\s+in\s+([a-zA-Z0-9]+)/i);

      if (matches && matches.length >= 3) {
        tokenSymbolOrAddress = matches[1];
        vsTokenSymbolOrAddress = matches[2];
      } else {
        const errorMessage =
          'Please provide the token and the currency to price it against (e.g., "price of MATIC in USDC").';
        logger.error(`[calculateTokenPriceAction] Parameter extraction failed`);

        return {
          text: `❌ **Error**: ${errorMessage}\n\nExamples:\n• "What is the price of MATIC in USDC?"\n• "How much is 1 ETH worth in DAI?"\n\n**Required parameters:**\n- Token Symbol or Address\n- Vs Token Symbol or Address (currency to price against)`,
          actions: ['calculateTokenPrice'],
          data: { error: errorMessage },
        };
      }
    }

    try {
      const quickswapClient = await initializeQuickswapClient(runtime);
      // Simulate calculate token price logic
      const tokenPriceResult = await quickswapClient.simulateCalculateTokenPrice(
        tokenSymbolOrAddress,
        vsTokenSymbolOrAddress
      );

      if (tokenPriceResult && tokenPriceResult.success) {
        const responseText = `✅ **Token Price Calculated Successfully**\n\n**Details:**\n• **Token**: ${tokenSymbolOrAddress.toUpperCase()}\n• **Vs Token**: ${vsTokenSymbolOrAddress.toUpperCase()}\n• **Price**: ${tokenPriceResult.price?.toFixed(8) || 'N/A'} ${vsTokenSymbolOrAddress.toUpperCase()} per ${tokenSymbolOrAddress.toUpperCase()}\n• **Platform**: Quickswap`;

        return {
          text: responseText,
          actions: ['calculateTokenPrice'],
          data: {
            success: true,
            tokenPrice: tokenPriceResult,
            timestamp: new Date().toISOString(),
          },
        };
      } else {
        const errorMessage =
          tokenPriceResult?.error ||
          `Calculating price for '${tokenSymbolOrAddress}' in '${vsTokenSymbolOrAddress}' failed or is not supported.`;
        return {
          text: `❌ **Error**: ${errorMessage}\n\nPlease verify the token symbols/addresses and try again.`,
          actions: ['calculateTokenPrice'],
          data: {
            success: false,
            error: errorMessage,
            tokenSymbolOrAddress,
            vsTokenSymbolOrAddress,
            timestamp: new Date().toISOString(),
          },
        };
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error
          ? error.message
          : 'Unknown error occurred while calculating token price';
      logger.error(`[calculateTokenPriceAction] Error calculating token price:`, error);

      return {
        text: `❌ **Error**: ${errorMessage}\n\nPlease check your configuration and try again.`,
        actions: ['calculateTokenPrice'],
        data: {
          error: errorMessage,
          tokenSymbolOrAddress,
          vsTokenSymbolOrAddress,
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
          text: 'What is the price of MATIC in USDC?',
        },
      },
      {
        name: '{{user2}}',
        content: {
          text: 'Calculating MATIC/USDC price...',
          action: 'calculateTokenPrice',
        },
      },
    ],
    [
      {
        name: '{{user1}}',
        content: {
          text: 'How much is 1 ETH worth in DAI?',
        },
      },
      {
        name: '{{user2}} ',
        content: {
          text: 'Estimating ETH/DAI value...',
          action: 'calculateTokenPrice',
        },
      },
    ],
  ],
};
