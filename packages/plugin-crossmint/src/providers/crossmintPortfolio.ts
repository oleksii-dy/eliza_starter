import {
  type Provider,
  type IAgentRuntime,
  type Memory,
  type State,
  logger,
} from '@elizaos/core';
import { CrossMintUniversalWalletService } from '../services/CrossMintUniversalWalletService';

/**
 * CrossMint Portfolio Provider
 * Provides portfolio and balance information from CrossMint wallets
 */
export const crossmintPortfolioProvider: Provider = {
  name: 'CROSSMINT_PORTFOLIO',
  description: 'Provides comprehensive CrossMint portfolio data including token balances, asset valuations, DeFi positions, NFT holdings, and staked assets across multiple blockchain networks when agent needs to present wallet status or make informed investment decisions',
  dynamic: true, // Only when requested due to API calls
  position: 10,

  get: async (runtime: IAgentRuntime, _message: Memory, _state: State) => {
    try {
      const crossmintService = runtime.getService<CrossMintUniversalWalletService>('crossmint-universal-wallet');

      if (!crossmintService) {
        return {
          text: '',
          values: {},
        };
      }

      // Get portfolio information
      const portfolio = await crossmintService.getPortfolio();

      const totalValueText = portfolio.totalValueUsd > 0
        ? `$${portfolio.totalValueUsd.toFixed(2)}`
        : 'Unable to determine value';

      const assetsList = portfolio.assets
        .filter(asset => parseFloat(asset.balance) > 0)
        .map(asset =>
          `- ${asset.balanceFormatted} ${asset.symbol} on ${asset.chain}${asset.valueUsd ? ` ($${asset.valueUsd.toFixed(2)})` : ''}`
        )
        .join('\n');

      const text = `[CROSSMINT PORTFOLIO]
Total Portfolio Value: ${totalValueText}
Chains: ${portfolio.chains.join(', ')}

Asset Breakdown:
${assetsList || '- No assets with positive balances found'}

Portfolio Breakdown:
- Tokens: $${portfolio.breakdown.tokens.toFixed(2)}
- DeFi: $${portfolio.breakdown.defi.toFixed(2)}
- NFTs: $${portfolio.breakdown.nfts.toFixed(2)}
- Staked: $${portfolio.breakdown.staked.toFixed(2)}

Note: Portfolio values are estimated and may not reflect real-time market prices.
[/CROSSMINT PORTFOLIO]`;

      return {
        text,
        values: {
          crossmintTotalValue: portfolio.totalValueUsd,
          crossmintChains: portfolio.chains,
          crossmintAssetCount: portfolio.assets.length,
          crossmintActiveAssets: portfolio.assets.filter(a => parseFloat(a.balance) > 0).length,
        },
        data: {
          crossmintPortfolio: portfolio,
          crossmintAssets: portfolio.assets,
        },
      };
    } catch (error) {
      logger.error('Error in CrossMint portfolio provider:', error);

      return {
        text: '[CROSSMINT PORTFOLIO]\nPortfolio information temporarily unavailable\n[/CROSSMINT PORTFOLIO]',
        values: {
          crossmintTotalValue: 0,
          crossmintError: error instanceof Error ? error.message : 'Unknown error',
        },
      };
    }
  },
};
