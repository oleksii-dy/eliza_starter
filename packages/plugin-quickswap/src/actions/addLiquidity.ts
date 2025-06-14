import { Action, IAgentRuntime, logger, Memory, composePromptFromState } from '@elizaos/core';
import { z } from 'zod';
import { callLLMWithTimeout } from '../utils/llmHelpers.js';
import { addLiquidityTemplate } from '../templates/addLiquidityTemplate.js';
import { initializeQuickswapClient } from '../utils/quickswapClient.js';

interface AddLiquidityParams {
  token0SymbolOrAddress: string;
  token1SymbolOrAddress: string;
  amount0: string;
  amount1: string;
}

/**
 * M5-04: Simulates adding liquidity to a Quickswap pool.
 */
export const addLiquidityAction: Action = {
  name: 'addLiquidity',
  similes: ['ADD_POOL_LIQUIDITY', 'SUPPLY_LIQUIDITY', 'PROVIDE_LIQUIDITY', 'LIQUIDITY_ADD'],
  description: 'Simulates adding liquidity for a specified token pair to a Quickswap pool.',
  validate: async (runtime: IAgentRuntime, message: Memory) => {
    return true; // Defer detailed validation to handler after LLM extraction
  },
  handler: async (runtime: IAgentRuntime, message: Memory) => {
    logger.info(`[addLiquidityAction] Handler called for message: "${message.content?.text}"`);

    let token0SymbolOrAddress: string;
    let token1SymbolOrAddress: string;
    let amount0: string;
    let amount1: string;

    try {
      // Use LLM to extract parameters
      const llmResult = await callLLMWithTimeout<AddLiquidityParams & { error?: string }>(
        runtime,
        null,
        addLiquidityTemplate,
        'addLiquidityAction',
        message.content?.text || ''
      );

      logger.info('[addLiquidityAction] LLM result:', JSON.stringify(llmResult));

      if (
        llmResult?.error ||
        !llmResult?.token0SymbolOrAddress ||
        !llmResult?.token1SymbolOrAddress ||
        !llmResult?.amount0 ||
        !llmResult?.amount1
      ) {
        throw new Error('Required liquidity parameters not found by LLM');
      }
      token0SymbolOrAddress = llmResult.token0SymbolOrAddress;
      token1SymbolOrAddress = llmResult.token1SymbolOrAddress;
      amount0 = llmResult.amount0;
      amount1 = llmResult.amount1;
    } catch (error) {
      logger.warn('[addLiquidityAction] LLM extraction failed, trying regex fallback');

      // Fallback to regex extraction (simple, might need refinement)
      const text = message.content?.text || '';

      const matches = text.match(
        /add\s+(\d+\.?\d*)\s+([a-zA-Z0-9]+)\s+and\s+(\d+\.?\d*)\s+([a-zA-Z0-9]+)\s+liquidity/i
      );

      if (matches && matches.length >= 5) {
        amount0 = matches[1];
        token0SymbolOrAddress = matches[2];
        amount1 = matches[3];
        token1SymbolOrAddress = matches[4];
      } else {
        const errorMessage =
          'Please provide both token symbols/addresses and their respective amounts to add as liquidity (e.g., "add 10 USDC and 5 WMATIC liquidity").';
        logger.error(`[addLiquidityAction] Parameter extraction failed`);

        return {
          text: `❌ **Error**: ${errorMessage}\n\nExamples:\n• "Add 10 USDC and 5 WMATIC liquidity"\n• "Provide 1 ETH and 2000 DAI to the pool"\n\n**Required parameters:**\n- Two token symbols/addresses\n- Amounts for each token`,
          actions: ['addLiquidity'],
          data: { error: errorMessage },
        };
      }
    }

    const parsedAmount0 = parseFloat(amount0);
    const parsedAmount1 = parseFloat(amount1);

    if (parsedAmount0 <= 0 || parsedAmount1 <= 0) {
      return {
        message: 'Liquidity amounts must be greater than zero.',
        details: {
          status: 'error',
          error: 'Invalid liquidity amount',
        },
      };
    }

    try {
      const quickswapClient = await initializeQuickswapClient(runtime);

      // Simulate add liquidity logic using the client
      const addLiquidityResult = await quickswapClient.simulateAddLiquidity(
        token0SymbolOrAddress,
        token1SymbolOrAddress,
        parsedAmount0,
        parsedAmount1
      );

      if (addLiquidityResult && addLiquidityResult.success) {
        const responseText = `✅ **Liquidity Added Successfully**\n\n**Liquidity Details:**\n• **Token0**: ${token0SymbolOrAddress.toUpperCase()}\n• **Token1**: ${token1SymbolOrAddress.toUpperCase()}\n• **Amount0 Added**: ${amount0}\n• **Amount1 Added**: ${amount1}\n• **LP Tokens Received**: ${addLiquidityResult.lpTokensReceived?.toFixed(4) || 'N/A'}\n• **Transaction Hash**: ${addLiquidityResult.transactionHash}\n• **Platform**: Quickswap\n• **Chain ID**: 137`;

        return {
          text: responseText,
          actions: ['addLiquidity'],
          data: {
            success: true,
            liquidityDetails: addLiquidityResult,
            timestamp: new Date().toISOString(),
          },
        };
      } else {
        const errorMessage =
          addLiquidityResult?.error ||
          `Adding liquidity for '${token0SymbolOrAddress}/${token1SymbolOrAddress}' failed or is not supported.`;
        return {
          text: `❌ **Error**: ${errorMessage}\n\nPlease verify the token symbols/addresses, amounts, and try again.`,
          actions: ['addLiquidity'],
          data: {
            success: false,
            error: errorMessage,
            token0SymbolOrAddress,
            token1SymbolOrAddress,
            amount0,
            amount1,
            timestamp: new Date().toISOString(),
          },
        };
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error occurred while adding liquidity';
      logger.error(`[addLiquidityAction] Error adding liquidity:`, error);

      return {
        text: `❌ **Error**: ${errorMessage}\n\nPlease check your configuration and try again. Make sure:\n• Quickswap API URL is properly configured\n• Network connection is stable`,
        actions: ['addLiquidity'],
        data: {
          error: errorMessage,
          token0SymbolOrAddress,
          token1SymbolOrAddress,
          amount0,
          amount1,
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
          text: 'Add 10 USDC and 5 WMATIC to the liquidity pool',
        },
      },
      {
        name: '{{user2}}',
        content: {
          text: 'Attempting to add liquidity for USDC and WMATIC...',
          action: 'addLiquidity',
        },
      },
    ],
    [
      {
        name: '{{user1}}',
        content: {
          text: 'Provide 1 ETH and 2000 DAI liquidity',
        },
      },
      {
        name: '{{user2}} ',
        content: {
          text: 'Processing your liquidity provision...',
          action: 'addLiquidity',
        },
      },
    ],
  ],
};
