import { Action, IAgentRuntime, logger, Memory, composePromptFromState } from '@elizaos/core';
import { z } from 'zod';
import { callLLMWithTimeout } from '../utils/llmHelpers.js';
import { claimFarmingRewardsTemplate } from '../templates/claimFarmingRewardsTemplate.js';
import { initializeQuickswapClient } from '../utils/quickswapClient.js';

interface ClaimFarmingRewardsParams {
  poolId?: string;
  token0SymbolOrAddress?: string;
  token1SymbolOrAddress?: string;
  walletAddress: string;
}

/**
 * M5-18: Claims farming rewards from a specified Quickswap farming pool.
 */
export const claimFarmingRewardsAction: Action = {
  name: 'claimFarmingRewards',
  similes: ['REDEEM_FARMING_REWARDS', 'COLLECT_YIELD', 'HARVEST_REWARDS', 'CLAIM_LP_REWARDS'],
  description:
    'Claims accumulated rewards from a specified Quickswap farming pool for a given wallet.',
  validate: async (runtime: IAgentRuntime, message: Memory) => {
    return true;
  },
  handler: async (runtime: IAgentRuntime, message: Memory) => {
    logger.info(
      `[claimFarmingRewardsAction] Handler called for message: "${message.content?.text}"`
    );

    let params: ClaimFarmingRewardsParams;

    try {
      const llmResult = await callLLMWithTimeout<ClaimFarmingRewardsParams & { error?: string }>(
        runtime,
        null,
        claimFarmingRewardsTemplate,
        'claimFarmingRewardsAction',
        message.content?.text || ''
      );

      logger.info('[claimFarmingRewardsAction] LLM result:', JSON.stringify(llmResult));

      if (
        llmResult?.error ||
        !llmResult?.walletAddress ||
        (!llmResult?.poolId &&
          (!llmResult?.token0SymbolOrAddress || !llmResult?.token1SymbolOrAddress))
      ) {
        throw new Error('Required wallet address and pool ID or token pair not found by LLM');
      }
      params = llmResult;
    } catch (error) {
      logger.warn('[claimFarmingRewardsAction] LLM extraction failed, trying regex fallback');

      const text = message.content?.text || '';
      const walletMatch = text.match(
        /(?:claim|collect|harvest)\s+(?:rewards|yield)\s+for\s+(0x[a-fA-F0-9]{40})/i
      );
      const poolIdMatch = text.match(/(?:pool|farm)\s+(?:id|number)\s+(\d+)/i);
      const tokenPairMatch = text.match(
        /(?:pool|farm)\s+for\s+([a-zA-Z0-9]+)\s+and\s+([a-zA-Z0-9]+)/i
      );

      if (walletMatch && walletMatch.length >= 2) {
        params = {
          walletAddress: walletMatch[1],
        };
        if (poolIdMatch && poolIdMatch.length >= 2) {
          params.poolId = poolIdMatch[1];
        } else if (tokenPairMatch && tokenPairMatch.length >= 3) {
          params.token0SymbolOrAddress = tokenPairMatch[1];
          params.token1SymbolOrAddress = tokenPairMatch[2];
        } else {
          const errorMessage =
            'Please specify the farming pool ID or both token symbols/addresses (e.g., "claim rewards for wallet 0x... from pool ID 1" or "claim rewards for wallet 0x... from WMATIC-USDC farm").';
          logger.error(`[claimFarmingRewardsAction] Parameter extraction failed`);
          return {
            text: `❌ **Error**: ${errorMessage}\n\nExamples:\n• "Claim farming rewards for wallet 0xAbc123...xyz from pool ID 1"\n• "Collect rewards for 0xDef456...uvw from the ETH-DAI farm"\n\n**Required parameters:**\n- Wallet Address\n- Pool ID (or) Token 0 Symbol/Address AND Token 1 Symbol/Address`,
            actions: ['claimFarmingRewards'],
            data: { error: errorMessage },
          };
        }
      } else {
        const errorMessage =
          'Please specify the wallet address (e.g., "claim rewards for wallet 0x123...abc").';
        logger.error(`[claimFarmingRewardsAction] Parameter extraction failed`);
        return {
          text: `❌ **Error**: ${errorMessage}\n\nExamples:\n• "Claim farming rewards for wallet 0xAbc123...xyz from pool ID 1"\n• "Collect rewards for 0xDef456...uvw from the ETH-DAI farm"\n\n**Required parameters:**\n- Wallet Address\n- Pool ID (or) Token 0 Symbol/Address AND Token 1 Symbol/Address`,
          actions: ['claimFarmingRewards'],
          data: { error: errorMessage },
        };
      }
    }

    try {
      const quickswapClient = await initializeQuickswapClient(runtime);
      const claimResult = await quickswapClient.claimFarmingRewards(params);

      if (claimResult && claimResult.success) {
        const responseText = `💰 **Rewards Claimed Successfully!**\n\n• **Wallet**: ${params.walletAddress.substring(0, 10)}...\n• **Pool ID**: ${params.poolId || 'N/A'}\n• **Tokens**: ${params.token0SymbolOrAddress?.toUpperCase() || 'N/A'}-${params.token1SymbolOrAddress?.toUpperCase() || 'N/A'}\n• **Amount Claimed**: ${claimResult.rewardsClaimed?.toFixed(4) || 'N/A'} ${claimResult.rewardsTokenSymbol?.toUpperCase() || 'N/A'}\n• **Transaction Hash**: ${claimResult.transactionHash || 'N/A'}\n• **Platform**: Quickswap`;

        return {
          text: responseText,
          actions: ['claimFarmingRewards'],
          data: {
            success: true,
            walletAddress: params.walletAddress,
            poolId: params.poolId,
            token0: params.token0SymbolOrAddress,
            token1: params.token1SymbolOrAddress,
            amountClaimed: claimResult.rewardsClaimed,
            rewardsToken: claimResult.rewardsTokenSymbol,
            transactionHash: claimResult.transactionHash,
            timestamp: new Date().toISOString(),
          },
        };
      } else {
        const errorMessage = claimResult?.error || 'Failed to claim farming rewards.';
        return {
          text: `❌ **Error**: ${errorMessage}\n\nPlease verify wallet address and pool details and try again.`,
          actions: ['claimFarmingRewards'],
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
          : 'Unknown error occurred while claiming farming rewards';
      logger.error(`[claimFarmingRewardsAction] Error claiming farming rewards:`, error);

      return {
        text: `❌ **Error**: ${errorMessage}\n\nPlease check your configuration and try again.`,
        actions: ['claimFarmingRewards'],
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
          text: 'Claim farming rewards for wallet 0xAbc1234567890123456789012345678901234567 from pool ID 1',
        },
      },
      {
        name: '{{user2}}',
        content: {
          text: 'Claiming rewards...',
          action: 'claimFarmingRewards',
        },
      },
    ],
    [
      {
        name: '{{user1}}',
        content: {
          text: 'Collect rewards for 0xDef4567890123456789012345678901234567890 from the ETH-DAI farm',
        },
      },
      {
        name: '{{user2}}',
        content: {
          text: 'Claiming rewards...',
          action: 'claimFarmingRewards',
        },
      },
    ],
  ],
};
