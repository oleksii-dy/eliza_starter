import { Action, IAgentRuntime, logger, Memory, composePromptFromState } from '@elizaos/core';
import { z } from 'zod';
import { callLLMWithTimeout } from '../utils/llmHelpers.js';
import { getFarmingPoolDetailsTemplate } from '../templates/getFarmingPoolDetailsTemplate.js';
import { initializeQuickswapClient } from '../utils/quickswapClient.js';

interface GetFarmingPoolDetailsParams {
  poolId?: string;
  token0SymbolOrAddress?: string;
  token1SymbolOrAddress?: string;
}

/**
 * M5-16: Fetches details for a specific Quickswap farming pool, identified by ID or token pair.
 */
export const getFarmingPoolDetailsAction: Action = {
  name: 'getFarmingPoolDetails',
  similes: [
    'CHECK_FARMING_POOL_INFO',
    'FARM_DETAILS',
    'LIQUIDITY_MINING_STATS',
    'POOL_REWARDS_INFO',
  ],
  description:
    'Retrieves comprehensive details and metrics for a specified Quickswap farming pool.',
  validate: async (runtime: IAgentRuntime, message: Memory) => {
    return true;
  },
  handler: async (runtime: IAgentRuntime, message: Memory) => {
    logger.info(
      `[getFarmingPoolDetailsAction] Handler called for message: "${message.content?.text}"`
    );

    let params: GetFarmingPoolDetailsParams;

    try {
      const llmResult = await callLLMWithTimeout<GetFarmingPoolDetailsParams & { error?: string }>(
        runtime,
        null,
        getFarmingPoolDetailsTemplate,
        'getFarmingPoolDetailsAction',
        message.content?.text || ''
      );

      logger.info('[getFarmingPoolDetailsAction] LLM result:', JSON.stringify(llmResult));

      if (
        llmResult?.error ||
        (!llmResult?.poolId &&
          (!llmResult?.token0SymbolOrAddress || !llmResult?.token1SymbolOrAddress))
      ) {
        throw new Error('Required pool ID or token pair not found by LLM');
      }
      params = llmResult;
    } catch (error) {
      logger.warn('[getFarmingPoolDetailsAction] LLM extraction failed, trying regex fallback');

      const text = message.content?.text || '';
      const poolIdMatch = text.match(/(?:pool|farm)\s+(?:id|number)\s+(\d+)/i);
      const tokenPairMatch = text.match(
        /(?:pool|farm)\s+for\s+([a-zA-Z0-9]+)\s+and\s+([a-zA-Z0-9]+)/i
      );

      if (poolIdMatch && poolIdMatch.length >= 2) {
        params = {
          poolId: poolIdMatch[1],
        };
      } else if (tokenPairMatch && tokenPairMatch.length >= 3) {
        params = {
          token0SymbolOrAddress: tokenPairMatch[1],
          token1SymbolOrAddress: tokenPairMatch[2],
        };
      } else {
        const errorMessage =
          'Please specify the farming pool ID or both token symbols/addresses (e.g., "get farming pool details for pool ID 1" or "details for WMATIC-USDC farm").';
        logger.error(`[getFarmingPoolDetailsAction] Parameter extraction failed`);
        return {
          text: `❌ **Error**: ${errorMessage}\n\nExamples:\n• "Get farming pool details for pool ID 1"\n• "Show me the details of the WMATIC-USDC farm"\n\n**Required parameters:**\n- Pool ID (or) Token 0 Symbol/Address AND Token 1 Symbol/Address`,
          actions: ['getFarmingPoolDetails'],
          data: { error: errorMessage },
        };
      }
    }

    try {
      const quickswapClient = await initializeQuickswapClient(runtime);
      const poolDetailsResult = await quickswapClient.getFarmingPoolDetails(params);

      if (poolDetailsResult && poolDetailsResult.success) {
        const responseText = `🌾 **Farming Pool Details for ${params.poolId || `${params.token0SymbolOrAddress}-${params.token1SymbolOrAddress}`}**\n\n• **Pool ID**: ${poolDetailsResult.poolId || 'N/A'}\n• **Tokens**: ${poolDetailsResult.token0Symbol?.toUpperCase() || 'N/A'}-${poolDetailsResult.token1Symbol?.toUpperCase() || 'N/A'}\n• **APR**: ${poolDetailsResult.apr?.toFixed(2) || 'N/A'}%\n• **Total Staked**: ${poolDetailsResult.totalStakedAmount?.toFixed(2) || 'N/A'} LP\n• **Rewards Token**: ${poolDetailsResult.rewardsTokenSymbol?.toUpperCase() || 'N/A'}\n• **Platform**: Quickswap`;

        return {
          text: responseText,
          actions: ['getFarmingPoolDetails'],
          data: {
            success: true,
            poolId: poolDetailsResult.poolId,
            token0Symbol: poolDetailsResult.token0Symbol,
            token1Symbol: poolDetailsResult.token1Symbol,
            apr: poolDetailsResult.apr,
            totalStakedAmount: poolDetailsResult.totalStakedAmount,
            rewardsTokenSymbol: poolDetailsResult.rewardsTokenSymbol,
            timestamp: new Date().toISOString(),
          },
        };
      } else {
        const errorMessage = poolDetailsResult?.error || 'Failed to fetch farming pool details.';
        return {
          text: `❌ **Error**: ${errorMessage}\n\nPlease verify pool ID or token pair and try again.`,
          actions: ['getFarmingPoolDetails'],
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
          : 'Unknown error occurred while fetching farming pool details';
      logger.error(`[getFarmingPoolDetailsAction] Error fetching farming pool details:`, error);

      return {
        text: `❌ **Error**: ${errorMessage}\n\nPlease check your configuration and try again.`,
        actions: ['getFarmingPoolDetails'],
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
          text: 'Get farming pool details for pool ID 1',
        },
      },
      {
        name: '{{user2}}',
        content: {
          text: 'Fetching farming pool details...',
          action: 'getFarmingPoolDetails',
        },
      },
    ],
    [
      {
        name: '{{user1}}',
        content: {
          text: 'Show me the details of the WMATIC-USDC farm',
        },
      },
      {
        name: '{{user2}} ',
        content: {
          text: 'Fetching farming pool details...',
          action: 'getFarmingPoolDetails',
        },
      },
    ],
  ],
};
