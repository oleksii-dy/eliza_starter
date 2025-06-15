import { Action, IAgentRuntime, logger, Memory } from '@elizaos/core';
import { initializeQuickswapClient } from '../utils/quickswapClient.js';
import { z } from 'zod';

/**
 * M5-08: Calculates the mid price between two tokens in a Quickswap pool.
 */
export const calculateMidPriceAction: Action = {
  name: 'calculateMidPrice',
  description: 'Calculates the mid price of a token pair on Quickswap.',
  validate: async (runtime: IAgentRuntime, message: Memory) => {
    try {
      z.object({
        token0SymbolOrAddress: z.string(),
        token1SymbolOrAddress: z.string(),
      }).parse(message.content);
      return true;
    } catch (error) {
      logger.warn(`[calculateMidPriceAction] Validation failed: ${error.message}`);
      return false;
    }
  },
  handler: async (runtime: IAgentRuntime, message: Memory) => {
    try {
      const parsedParams = z
        .object({
          token0SymbolOrAddress: z.string().describe('The symbol or address of the first token.'),
          token1SymbolOrAddress: z.string().describe('The symbol or address of the second token.'),
        })
        .parse(message.content);

      const { token0SymbolOrAddress, token1SymbolOrAddress } = parsedParams;

      // Initialize Quickswap client
      const quickswapClient = await initializeQuickswapClient(runtime);

      // Execute calculate mid-price logic
      const midPriceResult = await quickswapClient.CalculateMidPrice(
        token0SymbolOrAddress,
        token1SymbolOrAddress
      );

      if (midPriceResult.success) {
        const responseText = `✅ **Mid Price Calculated**\n\n**Price Details:**\n• **Token 0**: ${token0SymbolOrAddress.toUpperCase()}\n• **Token 1**: ${token1SymbolOrAddress.toUpperCase()}\n• **Mid Price**: ${midPriceResult.midPrice}\n• **Inverted Price**: ${midPriceResult.invertedPrice}`;
        return {
          text: responseText,
          actions: ['calculateMidPrice'],
          data: {
            success: true,
            midPrice: midPriceResult.midPrice,
            invertedPrice: midPriceResult.invertedPrice,
            timestamp: new Date().toISOString(),
          },
        };
      } else {
        return {
          text: `❌ **Error**: ${midPriceResult.error || 'Failed to calculate mid price.'}`,
          actions: ['calculateMidPrice'],
          data: {
            success: false,
            error: midPriceResult.error,
            token0SymbolOrAddress,
            token1SymbolOrAddress,
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
            : 'Unknown error occurred while calculating mid price';
      logger.error(`[calculateMidPriceAction] Error calculating mid price:`, error);
      return {
        text: `❌ **Error**: ${errorMessage}`,
        actions: ['calculateMidPrice'],
        data: {
          error: errorMessage,
          timestamp: new Date().toISOString(),
        },
      };
    }
  },
};
