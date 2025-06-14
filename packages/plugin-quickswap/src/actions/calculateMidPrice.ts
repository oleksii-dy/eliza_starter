import { Action, IAgentRuntime, logger, Memory, composePromptFromState } from '@elizaos/core';
import { z } from 'zod';
import { callLLMWithTimeout } from '../utils/llmHelpers.js';
import { calculateMidPriceTemplate } from '../templates/calculateMidPriceTemplate.js';
import { initializeQuickswapClient } from '../utils/quickswapClient.js';

interface CalculateMidPriceParams {
  token0SymbolOrAddress: string;
  token1SymbolOrAddress: string;
}

/**
 * M5-08: Calculates the mid-price of a token pair on Quickswap.
 */
export const calculateMidPriceAction: Action = {
  name: 'calculateMidPrice',
  similes: ['GET_MID_PRICE', 'CHECK_AVERAGE_PRICE', 'ESTIMATE_PAIR_PRICE'],
  description:
    'Calculates the mid-price (average of bid and ask prices) for a specified token pair on Quickswap.',
  validate: async (runtime: IAgentRuntime, message: Memory) => {
    return true;
  },
  handler: async (runtime: IAgentRuntime, message: Memory) => {
    logger.info(`[calculateMidPriceAction] Handler called for message: "${message.content?.text}"`);

    let token0SymbolOrAddress: string;
    let token1SymbolOrAddress: string;

    try {
      const llmResult = await callLLMWithTimeout<CalculateMidPriceParams & { error?: string }>(
        runtime,
        null,
        calculateMidPriceTemplate,
        'calculateMidPriceAction',
        message.content?.text || ''
      );

      logger.info('[calculateMidPriceAction] LLM result:', JSON.stringify(llmResult));

      if (
        llmResult?.error ||
        !llmResult?.token0SymbolOrAddress ||
        !llmResult?.token1SymbolOrAddress
      ) {
        throw new Error('Required token pair parameters not found by LLM');
      }
      token0SymbolOrAddress = llmResult.token0SymbolOrAddress;
      token1SymbolOrAddress = llmResult.token1SymbolOrAddress;
    } catch (error) {
      logger.warn('[calculateMidPriceAction] LLM extraction failed, trying regex fallback');

      const text = message.content?.text || '';
      const tokenMatches = text.match(/mid-price\s+for\s+([a-zA-Z0-9]+)\/([a-zA-Z0-9]+)/i);

      if (tokenMatches && tokenMatches.length >= 3) {
        token0SymbolOrAddress = tokenMatches[1];
        token1SymbolOrAddress = tokenMatches[2];
      } else {
        const errorMessage =
          'Please provide both token symbols or addresses for the pair (e.g., "calculate mid-price for WMATIC/USDC").';
        logger.error(`[calculateMidPriceAction] Parameter extraction failed`);

        return {
          text: `❌ **Error**: ${errorMessage}\n\nExamples:\n• "Calculate mid-price for WMATIC/USDC"\n• "What is the average price of DAI/ETH?"\n\n**Required parameters:**\n- Token A Symbol or Address\n- Token B Symbol or Address`,
          actions: ['calculateMidPrice'],
          data: { error: errorMessage },
        };
      }
    }

    try {
      const quickswapClient = await initializeQuickswapClient(runtime);
      // Simulate calculate mid-price logic
      const midPriceResult = await quickswapClient.simulateCalculateMidPrice(
        token0SymbolOrAddress,
        token1SymbolOrAddress
      );

      if (midPriceResult && midPriceResult.success) {
        const responseText = `✅ **Mid-Price Calculated Successfully**\n\n**Details:**\n• **Token A**: ${token0SymbolOrAddress.toUpperCase()}\n• **Token B**: ${token1SymbolOrAddress.toUpperCase()}\n• **Mid Price (A/B)**: ${midPriceResult.midPriceAB?.toFixed(8) || 'N/A'}\n• **Mid Price (B/A)**: ${midPriceResult.midPriceBA?.toFixed(8) || 'N/A'}\n• **Platform**: Quickswap`;

        return {
          text: responseText,
          actions: ['calculateMidPrice'],
          data: {
            success: true,
            midPrice: midPriceResult,
            timestamp: new Date().toISOString(),
          },
        };
      } else {
        const errorMessage =
          midPriceResult?.error ||
          `Calculating mid-price for '${token0SymbolOrAddress}/${token1SymbolOrAddress}' failed or is not supported.`;
        return {
          text: `❌ **Error**: ${errorMessage}\n\nPlease verify the token symbols/addresses and try again.`,
          actions: ['calculateMidPrice'],
          data: {
            success: false,
            error: errorMessage,
            token0SymbolOrAddress,
            token1SymbolOrAddress,
            timestamp: new Date().toISOString(),
          },
        };
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error
          ? error.message
          : 'Unknown error occurred while calculating mid-price';
      logger.error(`[calculateMidPriceAction] Error calculating mid-price:`, error);

      return {
        text: `❌ **Error**: ${errorMessage}\n\nPlease check your configuration and try again.`,
        actions: ['calculateMidPrice'],
        data: {
          error: errorMessage,
          token0SymbolOrAddress,
          token1SymbolOrAddress,
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
          text: 'Calculate the mid-price for WMATIC/USDC',
        },
      },
      {
        name: '{{user2}}',
        content: {
          text: 'Calculating mid-price...',
          action: 'calculateMidPrice',
        },
      },
    ],
    [
      {
        name: '{{user1}}',
        content: {
          text: 'What is the average price of DAI/ETH?',
        },
      },
      {
        name: '{{user2}} ',
        content: {
          text: 'Estimating mid-price...',
          action: 'calculateMidPrice',
        },
      },
    ],
  ],
};
