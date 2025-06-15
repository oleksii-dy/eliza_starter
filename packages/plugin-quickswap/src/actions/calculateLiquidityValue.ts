import { Action, IAgentRuntime, logger, Memory } from '@elizaos/core';
import { initializeQuickswapClient } from '../utils/quickswapClient.js';
import { z } from 'zod';

/**
 * M5-07: Calculates the value of liquidity provided to a Quickswap pool.
 */
export const calculateLiquidityValueAction: Action = {
  name: 'calculateLiquidityValue',
  description:
    'Calculates the current value of provided liquidity (LP tokens) for a given token pair in a Quickswap pool.',
  validate: async (runtime: IAgentRuntime, message: Memory) => {
    try {
      z.object({
        token0SymbolOrAddress: z.string(),
        token1SymbolOrAddress: z.string(),
        lpTokensAmount: z.string(),
      }).parse(message.content);
      return true;
    } catch (error) {
      logger.warn(`[calculateLiquidityValueAction] Validation failed: ${error.message}`);
      return false;
    }
  },
  handler: async (runtime: IAgentRuntime, message: Memory) => {
    try {
      const parsedParams = z
        .object({
          token0SymbolOrAddress: z
            .string()
            .describe('The symbol or address of the first token in the pool.'),
          token1SymbolOrAddress: z
            .string()
            .describe('The symbol or address of the second token in the pool.'),
          lpTokensAmount: z
            .string()
            .describe('The amount of LP tokens to calculate the value for.'),
        })
        .parse(message.content);

      const { token0SymbolOrAddress, token1SymbolOrAddress, lpTokensAmount } = parsedParams;

      // Parse LP token amount to number
      const parsedLpTokensAmount = parseFloat(lpTokensAmount);
      if (isNaN(parsedLpTokensAmount) || parsedLpTokensAmount <= 0) {
        return {
          text: '❌ **Error**: Invalid LP token amount. Please provide a positive number.',
          actions: ['calculateLiquidityValue'],
        };
      }

      // Initialize Quickswap client
      const quickswapClient = await initializeQuickswapClient(runtime);

      // Execute calculate liquidity value logic
      const liquidityValueResult = await quickswapClient.CalculateLiquidityValue(
        token0SymbolOrAddress,
        token1SymbolOrAddress,
        parsedLpTokensAmount
      );

      if (liquidityValueResult.success) {
        const responseText = `✅ **Liquidity Value Calculated**\n\n**Details:**\n• **Token 0**: ${token0SymbolOrAddress.toUpperCase()}\n• **Token 1**: ${token1SymbolOrAddress.toUpperCase()}\n• **LP Tokens**: ${lpTokensAmount}\n• **Value in Token 0**: ${liquidityValueResult.token0Value}\n• **Value in Token 1**: ${liquidityValueResult.token1Value}`;
        return {
          text: responseText,
          actions: ['calculateLiquidityValue'],
          data: {
            success: true,
            liquidityValue: liquidityValueResult,
            timestamp: new Date().toISOString(),
          },
        };
      } else {
        return {
          text: `❌ **Error**: ${liquidityValueResult.error || 'Failed to calculate liquidity value.'}`,
          actions: ['calculateLiquidityValue'],
          data: {
            success: false,
            error: liquidityValueResult.error,
            token0SymbolOrAddress,
            token1SymbolOrAddress,
            lpTokensAmount,
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
            : 'Unknown error occurred while calculating liquidity value';
      logger.error(`[calculateLiquidityValueAction] Error calculating liquidity value:`, error);
      return {
        text: `❌ **Error**: ${errorMessage}`,
        actions: ['calculateLiquidityValue'],
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
          text: 'Calculate the value of 10 LP tokens for the USDC/WMATIC pool',
        },
      },
      {
        name: '{{user2}}',
        content: {
          text: 'Calculating liquidity value...',
          action: 'calculateLiquidityValue',
        },
      },
    ],
    [
      {
        name: '{{user1}}',
        content: {
          text: 'What is my 5 LP token value for DAI/ETH?',
        },
      },
      {
        name: '{{user2}} ',
        content: {
          text: 'Estimating LP token value...',
          action: 'calculateLiquidityValue',
        },
      },
    ],
  ],
};
