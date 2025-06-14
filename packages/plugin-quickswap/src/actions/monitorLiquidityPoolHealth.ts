import { Action, IAgentRuntime, logger, Memory, composePromptFromState } from '@elizaos/core';
import { z } from 'zod';
import { callLLMWithTimeout } from '../utils/llmHelpers.js';
import { monitorLiquidityPoolHealthTemplate } from '../templates/monitorLiquidityPoolHealthTemplate.js';
import { initializeQuickswapClient } from '../utils/quickswapClient.js';

interface MonitorLiquidityPoolHealthParams {
  token0SymbolOrAddress: string;
  token1SymbolOrAddress: string;
}

/**
 * M5-13: Monitors the health and key metrics of a specific liquidity pool on Quickswap.
 */
export const monitorLiquidityPoolHealthAction: Action = {
  name: 'monitorLiquidityPoolHealth',
  similes: [
    'CHECK_POOL_STATUS',
    'LIQUIDITY_POOL_AUDIT',
    'POOL_HEALTH_REPORT',
    'ANALYZE_LIQUIDITY_POOL',
  ],
  description:
    'Monitors the health and provides key metrics for a specified Quickswap liquidity pool.',
  validate: async (runtime: IAgentRuntime, message: Memory) => {
    return true;
  },
  handler: async (runtime: IAgentRuntime, message: Memory) => {
    logger.info(
      `[monitorLiquidityPoolHealthAction] Handler called for message: "${message.content?.text}"`
    );

    let params: MonitorLiquidityPoolHealthParams;

    try {
      const llmResult = await callLLMWithTimeout<
        MonitorLiquidityPoolHealthParams & { error?: string }
      >(
        runtime,
        null,
        monitorLiquidityPoolHealthTemplate,
        'monitorLiquidityPoolHealthAction',
        message.content?.text || ''
      );

      logger.info('[monitorLiquidityPoolHealthAction] LLM result:', JSON.stringify(llmResult));

      if (
        llmResult?.error ||
        !llmResult?.token0SymbolOrAddress ||
        !llmResult?.token1SymbolOrAddress
      ) {
        throw new Error('Required pool parameters not found by LLM');
      }
      params = llmResult;
    } catch (error) {
      logger.warn(
        '[monitorLiquidityPoolHealthAction] LLM extraction failed, trying regex fallback'
      );

      const text = message.content?.text || '';
      const poolMatch = text.match(
        /(?:monitor|check|health)\s+(?:pool|lp)\s+(?:for\s+)?([a-zA-Z0-9]+)\s+and\s+([a-zA-Z0-9]+)/i
      );

      if (poolMatch && poolMatch.length >= 3) {
        params = {
          token0SymbolOrAddress: poolMatch[1],
          token1SymbolOrAddress: poolMatch[2],
        };
      } else {
        const errorMessage =
          'Please specify both token symbols or addresses for the liquidity pool (e.g., "monitor pool health for WMATIC and USDC").';
        logger.error(`[monitorLiquidityPoolHealthAction] Parameter extraction failed`);
        return {
          text: `❌ **Error**: ${errorMessage}\n\nExamples:\n• "Monitor liquidity pool health for WMATIC and USDC"
• "Check the status of the ETH-DAI pool"

**Required parameters:**
- Token 0 Symbol/Address
- Token 1 Symbol/Address`,
          actions: ['monitorLiquidityPoolHealth'],
          data: { error: errorMessage },
        };
      }
    }

    try {
      const quickswapClient = await initializeQuickswapClient(runtime);
      const poolHealthResult = await quickswapClient.simulateMonitorLiquidityPoolHealth(
        params.token0SymbolOrAddress,
        params.token1SymbolOrAddress
      );

      if (poolHealthResult && poolHealthResult.success) {
        const responseText = `📊 **Liquidity Pool Health for ${params.token0SymbolOrAddress.toUpperCase()}-${params.token1SymbolOrAddress.toUpperCase()}**\n\n• **Total Liquidity**: ${poolHealthResult.totalLiquidityUSD?.toFixed(2) || 'N/A'} USD\n• **24h Volume**: ${poolHealthResult.dailyVolumeUSD?.toFixed(2) || 'N/A'} USD\n• **Fees Generated**: ${poolHealthResult.feesGeneratedUSD?.toFixed(2) || 'N/A'} USD (24h)\n• **Impermanent Loss Risk**: ${poolHealthResult.impermanentLossRisk || 'Low'}\n• **TVL Rank**: #${poolHealthResult.tvlRank || 'N/A'}\n• **Platform**: Quickswap`;

        return {
          text: responseText,
          actions: ['monitorLiquidityPoolHealth'],
          data: {
            success: true,
            token0: params.token0SymbolOrAddress,
            token1: params.token1SymbolOrAddress,
            totalLiquidityUSD: poolHealthResult.totalLiquidityUSD,
            dailyVolumeUSD: poolHealthResult.dailyVolumeUSD,
            feesGeneratedUSD: poolHealthResult.feesGeneratedUSD,
            impermanentLossRisk: poolHealthResult.impermanentLossRisk,
            tvlRank: poolHealthResult.tvlRank,
            timestamp: new Date().toISOString(),
          },
        };
      } else {
        const errorMessage = poolHealthResult?.error || 'Failed to monitor liquidity pool health.';
        return {
          text: `❌ **Error**: ${errorMessage}\n\nPlease verify token pair and try again.`,
          actions: ['monitorLiquidityPoolHealth'],
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
          : 'Unknown error occurred while monitoring liquidity pool health';
      logger.error(
        `[monitorLiquidityPoolHealthAction] Error monitoring liquidity pool health:`,
        error
      );

      return {
        text: `❌ **Error**: ${errorMessage}\n\nPlease check your configuration and try again.`,
        actions: ['monitorLiquidityPoolHealth'],
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
          text: 'Monitor liquidity pool health for WMATIC and USDC',
        },
      },
      {
        name: '{{user2}}',
        content: {
          text: 'Monitoring pool health...',
          action: 'monitorLiquidityPoolHealth',
        },
      },
    ],
    [
      {
        name: '{{user1}}',
        content: {
          text: 'Check the health of the ETH-DAI liquidity pool',
        },
      },
      {
        name: '{{user2}} ',
        content: {
          text: 'Monitoring pool health...',
          action: 'monitorLiquidityPoolHealth',
        },
      },
    ],
  ],
};
