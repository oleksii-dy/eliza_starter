import { Action, IAgentRuntime, logger, Memory, composePromptFromState } from '@elizaos/core';
import { z } from 'zod';
import { callLLMWithTimeout } from '../utils/llmHelpers.js';
import { fetchHistoricalTokenPriceTemplate } from '../templates/fetchHistoricalTokenPriceTemplate.js';
import { initializeQuickswapClient } from '../utils/quickswapClient.js';

interface FetchHistoricalTokenPriceParams {
  tokenSymbolOrAddress: string;
  vsCurrencySymbolOrAddress: string;
  days: number;
}

/**
 * M5-14: Fetches historical price data for a given token against a specified currency.
 */
export const fetchHistoricalTokenPriceAction: Action = {
  name: 'fetchHistoricalTokenPrice',
  similes: [
    'GET_PAST_PRICES',
    'TOKEN_PRICE_HISTORY',
    'HISTORICAL_CHART_DATA',
    'PRICE_TREND_ANALYSIS',
  ],
  description:
    'Retrieves historical price data for a token against a reference currency for a specified period.',
  validate: async (runtime: IAgentRuntime, message: Memory) => {
    return true;
  },
  handler: async (runtime: IAgentRuntime, message: Memory) => {
    logger.info(
      `[fetchHistoricalTokenPriceAction] Handler called for message: "${message.content?.text}"`
    );

    let params: FetchHistoricalTokenPriceParams;

    try {
      const llmResult = await callLLMWithTimeout<
        FetchHistoricalTokenPriceParams & { error?: string }
      >(
        runtime,
        null,
        fetchHistoricalTokenPriceTemplate,
        'fetchHistoricalTokenPriceAction',
        message.content?.text || ''
      );

      logger.info('[fetchHistoricalTokenPriceAction] LLM result:', JSON.stringify(llmResult));

      if (
        llmResult?.error ||
        !llmResult?.tokenSymbolOrAddress ||
        !llmResult?.vsCurrencySymbolOrAddress ||
        !llmResult?.days
      ) {
        throw new Error('Required historical price parameters not found by LLM');
      }
      params = llmResult;
    } catch (error) {
      logger.warn('[fetchHistoricalTokenPriceAction] LLM extraction failed, trying regex fallback');

      const text = message.content?.text || '';
      const priceMatch = text.match(
        /(?:historical\s+price|price\s+history)\s+for\s+([a-zA-Z0-9]+)\s+against\s+([a-zA-Z0-9]+)\s+for\s+(\d+)\s+days/i
      );
      const simplePriceMatch = text.match(
        /(?:price\s+history|past\s+prices)\s+of\s+([a-zA-Z0-9]+)/i
      );

      if (priceMatch && priceMatch.length >= 4) {
        params = {
          tokenSymbolOrAddress: priceMatch[1],
          vsCurrencySymbolOrAddress: priceMatch[2],
          days: parseInt(priceMatch[3], 10),
        };
      } else if (simplePriceMatch && simplePriceMatch.length >= 2) {
        params = {
          tokenSymbolOrAddress: simplePriceMatch[1],
          vsCurrencySymbolOrAddress: 'USD', // Default to USD if not specified
          days: 7, // Default to 7 days if not specified
        };
      } else {
        const errorMessage =
          'Please specify the token, comparison currency, and number of days (e.g., "fetch historical price for WMATIC against USDC for 30 days").';
        logger.error(`[fetchHistoricalTokenPriceAction] Parameter extraction failed`);
        return {
          text: `❌ **Error**: ${errorMessage}\n\nExamples:\n• "Fetch historical price for WMATIC against USDC for 30 days"
• "Show me the price history of ETH for the last 7 days"
• "What were the past prices of BTC?"

**Required parameters:**
- Token Symbol/Address
- VS Currency Symbol/Address (defaults to USD)
- Number of Days (defaults to 7 days)`,
          actions: ['fetchHistoricalTokenPrice'],
          data: { error: errorMessage },
        };
      }
    }

    try {
      const quickswapClient = await initializeQuickswapClient(runtime);
      const historicalDataResult = await quickswapClient.simulateFetchHistoricalTokenPrice(
        params.tokenSymbolOrAddress,
        params.vsCurrencySymbolOrAddress,
        params.days
      );

      if (
        historicalDataResult &&
        historicalDataResult.success &&
        historicalDataResult.prices &&
        historicalDataResult.prices.length > 0
      ) {
        const pricePoints = historicalDataResult.prices
          .map((p) => `• ${new Date(p.timestamp).toLocaleDateString()}: ${p.price.toFixed(6)}`)
          .join('\n');
        const responseText = `📈 **Historical Price Data for ${params.tokenSymbolOrAddress.toUpperCase()} vs ${params.vsCurrencySymbolOrAddress.toUpperCase()} (${params.days} Days)**\n\n${pricePoints}\n\n• **Platform**: Quickswap (Simulated)`;

        return {
          text: responseText,
          actions: ['fetchHistoricalTokenPrice'],
          data: {
            success: true,
            token: params.tokenSymbolOrAddress,
            vsCurrency: params.vsCurrencySymbolOrAddress,
            days: params.days,
            prices: historicalDataResult.prices,
            timestamp: new Date().toISOString(),
          },
        };
      } else {
        const errorMessage =
          historicalDataResult?.error || 'Failed to fetch historical token price.';
        return {
          text: `❌ **Error**: ${errorMessage}\n\nPlease verify token, currency, and date range and try again.`,
          actions: ['fetchHistoricalTokenPrice'],
          data: {
            success: false,
            error: errorMessage,
            params,
            timestamp: new Date().toISOString(),
          },
        };
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error
          ? error.message
          : 'Unknown error occurred while fetching historical token price';
      logger.error(
        `[fetchHistoricalTokenPriceAction] Error fetching historical token price:`,
        error
      );

      return {
        text: `❌ **Error**: ${errorMessage}\n\nPlease check your configuration and try again.`,
        actions: ['fetchHistoricalTokenPrice'],
        data: {
          error: errorMessage,
          params,
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
          text: 'Fetch historical price for WMATIC against USDC for 30 days',
        },
      },
      {
        name: '{{user2}}',
        content: {
          text: 'Fetching historical price data...',
          action: 'fetchHistoricalTokenPrice',
        },
      },
    ],
    [
      {
        name: '{{user1}}',
        content: {
          text: 'Show me the price history of ETH for the last 7 days',
        },
      },
      {
        name: '{{user2}} ',
        content: {
          text: 'Fetching historical price data...',
          action: 'fetchHistoricalTokenPrice',
        },
      },
    ],
  ],
};
