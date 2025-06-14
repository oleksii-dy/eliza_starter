import { Action, IAgentRuntime, logger, Memory, composePromptFromState } from '@elizaos/core';
import { z } from 'zod';
import { callLLMWithTimeout } from '../utils/llmHelpers.js';
import { calculateLiquidityValueTemplate } from '../templates/calculateLiquidityValueTemplate.js';
import { initializeQuickswapClient } from '../utils/quickswapClient.js';

interface CalculateLiquidityValueParams {
  token0SymbolOrAddress: string;
  token1SymbolOrAddress: string;
  lpTokensAmount: string;
}

/**
 * M5-07: Calculates the value of liquidity provided to a Quickswap pool.
 */
export const calculateLiquidityValueAction: Action = {
  name: 'calculateLiquidityValue',
  similes: ['GET_LIQUIDITY_VALUE', 'CHECK_LP_VALUE', 'ESTIMATE_LIQUIDITY'],
  description:
    'Calculates the current value of liquidity pool tokens in terms of the underlying assets for a specified token pair on Quickswap.',
  validate: async (runtime: IAgentRuntime, message: Memory) => {
    return true;
  },
  handler: async (runtime: IAgentRuntime, message: Memory) => {
    logger.info(
      `[calculateLiquidityValueAction] Handler called for message: "${message.content?.text}"`
    );

    let token0SymbolOrAddress: string;
    let token1SymbolOrAddress: string;
    let lpTokensAmount: string;

    try {
      const llmResult = await callLLMWithTimeout<
        CalculateLiquidityValueParams & { error?: string }
      >(
        runtime,
        null,
        calculateLiquidityValueTemplate,
        'calculateLiquidityValueAction',
        message.content?.text || ''
      );

      logger.info('[calculateLiquidityValueAction] LLM result:', JSON.stringify(llmResult));

      if (
        llmResult?.error ||
        !llmResult?.token0SymbolOrAddress ||
        !llmResult?.token1SymbolOrAddress ||
        !llmResult?.lpTokensAmount
      ) {
        throw new Error('Required liquidity value parameters not found by LLM');
      }
      token0SymbolOrAddress = llmResult.token0SymbolOrAddress;
      token1SymbolOrAddress = llmResult.token1SymbolOrAddress;
      lpTokensAmount = llmResult.lpTokensAmount;
    } catch (error) {
      logger.warn('[calculateLiquidityValueAction] LLM extraction failed, trying regex fallback');

      const text = message.content?.text || '';
      const matches = text.match(
        /calculate\s+liquidity\s+value\s+for\s+(\d+\.?\d*)\s+LP\s+tokens\s+of\s+([a-zA-Z0-9]+)\/([a-zA-Z0-9]+)/i
      );

      if (matches && matches.length >= 4) {
        lpTokensAmount = matches[1];
        token0SymbolOrAddress = matches[2];
        token1SymbolOrAddress = matches[3];
      } else {
        const errorMessage =
          'Please provide the amount of LP tokens and the token pair (e.g., "calculate liquidity value for 10 LP tokens of USDC/WMATIC").';
        logger.error(`[calculateLiquidityValueAction] Parameter extraction failed`);

        return {
          text: `❌ **Error**: ${errorMessage}\n\nExamples:\n• "Calculate liquidity value for 10 LP tokens of USDC/WMATIC"\n• "What is the value of 5 LP tokens for DAI/ETH?"\n\n**Required parameters:**\n- LP Tokens Amount\n- Token Pair (Token0 and Token1 Symbols/Addresses)`,
          actions: ['calculateLiquidityValue'],
          data: { error: errorMessage },
        };
      }
    }

    const parsedLPTokensAmount = parseFloat(lpTokensAmount);
    if (parsedLPTokensAmount <= 0) {
      return {
        text: 'LP token amount must be greater than zero.',
        data: {
          status: 'error',
          error: 'Invalid LP token amount',
        },
      };
    }

    try {
      const quickswapClient = await initializeQuickswapClient(runtime);
      // Simulate calculate liquidity value logic
      const liquidityValueResult = await quickswapClient.simulateCalculateLiquidityValue(
        token0SymbolOrAddress,
        token1SymbolOrAddress,
        parsedLPTokensAmount
      );

      if (liquidityValueResult && liquidityValueResult.success) {
        const responseText = `✅ **Liquidity Value Calculated Successfully**\n\n**Details:**\n• **LP Tokens**: ${lpTokensAmount}\n• **Token0 Value**: ${liquidityValueResult.token0Value?.toFixed(4) || 'N/A'} ${token0SymbolOrAddress.toUpperCase()}\n• **Token1 Value**: ${liquidityValueResult.token1Value?.toFixed(4) || 'N/A'} ${token1SymbolOrAddress.toUpperCase()}\n• **Total USD Value**: ${liquidityValueResult.totalUsdValue?.toFixed(4) || 'N/A'} USD\n• **Platform**: Quickswap`;

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
        const errorMessage =
          liquidityValueResult?.error ||
          `Calculating liquidity value for '${lpTokensAmount}' LP tokens of '${token0SymbolOrAddress}/${token1SymbolOrAddress}' failed or is not supported.`;
        return {
          text: `❌ **Error**: ${errorMessage}\n\nPlease verify the LP token amount, token symbols/addresses, and try again.`,
          actions: ['calculateLiquidityValue'],
          data: {
            success: false,
            error: errorMessage,
            token0SymbolOrAddress,
            token1SymbolOrAddress,
            lpTokensAmount,
            timestamp: new Date().toISOString(),
          },
        };
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error
          ? error.message
          : 'Unknown error occurred while calculating liquidity value';
      logger.error(`[calculateLiquidityValueAction] Error calculating liquidity value:`, error);

      return {
        text: `❌ **Error**: ${errorMessage}\n\nPlease check your configuration and try again.`,
        actions: ['calculateLiquidityValue'],
        data: {
          error: errorMessage,
          token0SymbolOrAddress,
          token1SymbolOrAddress,
          lpTokensAmount,
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
