import { Action, IAgentRuntime, logger, Memory, composePromptFromState } from '@elizaos/core';
import { z } from 'zod';
import { callLLMWithTimeout } from '../utils/llmHelpers.js';
import { removeLiquidityTemplate } from '../templates/removeLiquidityTemplate.js';
import { initializeQuickswapClient } from '../utils/quickswapClient.js';

interface RemoveLiquidityParams {
  token0SymbolOrAddress: string;
  token1SymbolOrAddress: string;
  lpTokensAmount: string;
}

/**
 * M5-05: Simulates removing liquidity from a Quickswap pool.
 */
export const removeLiquidityAction: Action = {
  name: 'removeLiquidity',
  similes: ['REMOVE_POOL_LIQUIDITY', 'WITHDRAW_LIQUIDITY', 'UNSTAKE_LP_TOKENS', 'LIQUIDITY_REMOVE'],
  description:
    'Simulates removing a specified amount of liquidity (LP tokens) from a Quickswap pool and receiving back the underlying tokens.',
  validate: async (runtime: IAgentRuntime, message: Memory) => {
    return true; // Defer detailed validation to handler after LLM extraction
  },
  handler: async (runtime: IAgentRuntime, message: Memory) => {
    logger.info(`[removeLiquidityAction] Handler called for message: "${message.content?.text}"`);

    let token0SymbolOrAddress: string;
    let token1SymbolOrAddress: string;
    let lpTokensAmount: string;

    try {
      // Use LLM to extract parameters
      const llmResult = await callLLMWithTimeout<RemoveLiquidityParams & { error?: string }>(
        runtime,
        null,
        removeLiquidityTemplate,
        'removeLiquidityAction',
        message.content?.text || ''
      );

      logger.info('[removeLiquidityAction] LLM result:', JSON.stringify(llmResult));

      if (
        llmResult?.error ||
        !llmResult?.token0SymbolOrAddress ||
        !llmResult?.token1SymbolOrAddress ||
        !llmResult?.lpTokensAmount
      ) {
        throw new Error('Required liquidity removal parameters not found by LLM');
      }
      token0SymbolOrAddress = llmResult.token0SymbolOrAddress;
      token1SymbolOrAddress = llmResult.token1SymbolOrAddress;
      lpTokensAmount = llmResult.lpTokensAmount;
    } catch (error) {
      logger.warn('[removeLiquidityAction] LLM extraction failed, trying regex fallback');

      // Fallback to regex extraction (simple, might need refinement)
      const text = message.content?.text || '';

      const matches = text.match(
        /remove\s+(\d+\.?\d*)\s+lp\s+tokens\s+from\s+([a-zA-Z0-9]+)\/([a-zA-Z0-9]+)/i
      );

      if (matches && matches.length >= 4) {
        lpTokensAmount = matches[1];
        token0SymbolOrAddress = matches[2];
        token1SymbolOrAddress = matches[3];
      } else {
        const errorMessage =
          'Please provide both token symbols/addresses and the amount of LP tokens to remove (e.g., "remove 10 LP tokens from USDC/WMATIC").';
        logger.error(`[removeLiquidityAction] Parameter extraction failed`);

        return {
          text: `❌ **Error**: ${errorMessage}\n\nExamples:\n• "Remove 10 LP tokens from USDC/WMATIC"\n• "Withdraw 5 LP tokens from ETH-DAI pool"\n\n**Required parameters:**\n- Two token symbols/addresses\n- Amount of LP tokens`,
          actions: ['removeLiquidity'],
          data: { error: errorMessage },
        };
      }
    }

    const parsedLPTokensAmount = parseFloat(lpTokensAmount);

    if (parsedLPTokensAmount <= 0) {
      return {
        message: 'LP tokens amount to remove must be greater than zero.',
        details: {
          status: 'error',
          error: 'Invalid LP tokens amount',
        },
      };
    }

    try {
      const quickswapClient = await initializeQuickswapClient(runtime);

      // Simulate remove liquidity logic using the client
      const removeLiquidityResult = await quickswapClient.simulateRemoveLiquidity(
        token0SymbolOrAddress,
        token1SymbolOrAddress,
        parsedLPTokensAmount
      );

      if (removeLiquidityResult && removeLiquidityResult.success) {
        const responseText = `✅ **Liquidity Removed Successfully**\n\n**Removal Details:**\n• **Token0**: ${token0SymbolOrAddress.toUpperCase()}\n• **Token1**: ${token1SymbolOrAddress.toUpperCase()}\n• **LP Tokens Removed**: ${lpTokensAmount}\n• **Token0 Received**: ${removeLiquidityResult.token0Received?.toFixed(4) || 'N/A'}\n• **Token1 Received**: ${removeLiquidityResult.token1Received?.toFixed(4) || 'N/A'}\n• **Transaction Hash**: ${removeLiquidityResult.transactionHash}\n• **Platform**: Quickswap\n• **Chain ID**: 137`;

        return {
          text: responseText,
          actions: ['removeLiquidity'],
          data: {
            success: true,
            removalDetails: removeLiquidityResult,
            timestamp: new Date().toISOString(),
          },
        };
      } else {
        const errorMessage =
          removeLiquidityResult?.error ||
          `Removing liquidity for '${token0SymbolOrAddress}/${token1SymbolOrAddress}' failed or is not supported.`;
        return {
          text: `❌ **Error**: ${errorMessage}\n\nPlease verify the token symbols/addresses, LP token amount, and try again.`,
          actions: ['removeLiquidity'],
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
        error instanceof Error ? error.message : 'Unknown error occurred while removing liquidity';
      logger.error(`[removeLiquidityAction] Error removing liquidity:`, error);

      return {
        text: `❌ **Error**: ${errorMessage}\n\nPlease check your configuration and try again. Make sure:\n• Quickswap API URL is properly configured\n• Network connection is stable`,
        actions: ['removeLiquidity'],
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
          text: 'Remove 10 LP tokens from USDC/WMATIC pool',
        },
      },
      {
        name: '{{user2}}',
        content: {
          text: 'Attempting to remove liquidity for USDC/WMATIC...',
          action: 'removeLiquidity',
        },
      },
    ],
    [
      {
        name: '{{user1}}',
        content: {
          text: 'Withdraw 5 LP tokens from WETH-DAI',
        },
      },
      {
        name: '{{user2}} ',
        content: {
          text: 'Processing your liquidity withdrawal...',
          action: 'removeLiquidity',
        },
      },
    ],
  ],
};
