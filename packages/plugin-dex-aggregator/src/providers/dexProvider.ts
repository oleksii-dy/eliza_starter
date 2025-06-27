import {
  type Provider,
  type IAgentRuntime,
  type Memory,
  type State,
  type ProviderResult
} from '@elizaos/core';
import { DEXService } from '../services/DEXService.js';
import {
  MAINNET_CHAINS,
  COMMON_TOKENS,
  CHAIN_DEX_SUPPORT,
  DEXProtocol
} from '../types/index.js';
import { formatTokenAmount } from '../utils/formatters.js';

export const dexProvider: Provider = {
  name: 'DEX_INFO',
  description: 'Provides DEX aggregation context including supported chains, tokens, and current portfolio information',
  
  get: async (
    runtime: IAgentRuntime,
    message: Memory,
    state?: State
  ): Promise<ProviderResult> => {
    try {
      const dexService = runtime.getService<DEXService>('dex');
      
      if (!dexService) {
        return {
          text: '[DEX_INFO]\nDEX aggregation service not available\n[/DEX_INFO]',
          data: { available: false }
        };
      }

      // Build comprehensive DEX information
      let contextText = '[DEX_INFO]\n';
      contextText += 'DEX Aggregation Service Available ✅\n\n';

      // Supported chains and their DEX protocols
      contextText += '**Supported Chains & DEX Protocols:**\n';
      for (const [chainName, chainId] of Object.entries(MAINNET_CHAINS)) {
        const supportedDEXs = CHAIN_DEX_SUPPORT[chainId] || [];
        const dexList = supportedDEXs.map(dex => getDEXDisplayName(dex)).join(', ');
        contextText += `• ${chainName} (${chainId}): ${dexList || 'No DEXs configured'}\n`;
      }

      // Common tokens per chain
      contextText += '\n**Common Tokens by Chain:**\n';
      for (const [chainName, chainId] of Object.entries(MAINNET_CHAINS)) {
        const tokens = COMMON_TOKENS[chainId];
        if (tokens) {
          const tokenSymbols = Object.keys(tokens);
          contextText += `• ${chainName}: ${tokenSymbols.join(', ')}\n`;
        }
      }

      // Try to get portfolio information for major chains
      contextText += '\n**Portfolio Summary:**\n';
      const portfolioPromises = [
        MAINNET_CHAINS.ETHEREUM,
        MAINNET_CHAINS.POLYGON,
        MAINNET_CHAINS.ARBITRUM
      ].map(async (chainId) => {
        try {
          const portfolio = await dexService.getPortfolio(chainId);
          const nonZeroTokens = portfolio.tokens.filter(t => parseFloat(t.balance) > 0);
          
          if (nonZeroTokens.length > 0) {
            const chainName = getChainName(chainId);
            let chainSummary = `• ${chainName}: `;
            
            const tokenSummaries = nonZeroTokens.slice(0, 5).map(token => {
              const formattedBalance = formatTokenAmount(token.balance, token.token.decimals);
              return `${formattedBalance} ${token.token.symbol}`;
            });
            
            chainSummary += tokenSummaries.join(', ');
            if (nonZeroTokens.length > 5) {
              chainSummary += ` (+${nonZeroTokens.length - 5} more)`;
            }
            
            return chainSummary;
          }
          return null;
        } catch (error) {
          return `• ${getChainName(chainId)}: Unable to fetch portfolio`;
        }
      });

      const portfolioResults = await Promise.all(portfolioPromises);
      const validPortfolios = portfolioResults.filter(result => result !== null);
      
      if (validPortfolios.length > 0) {
        contextText += validPortfolios.join('\n');
      } else {
        contextText += '• No token balances found or unable to fetch portfolio data';
      }

      // Capabilities
      contextText += '\n\n**DEX Capabilities:**\n';
      contextText += '• Multi-protocol aggregation for best prices\n';
      contextText += '• Cross-chain token swapping\n';
      contextText += '• Real-time price quotes and route optimization\n';
      contextText += '• Slippage protection and price impact warnings\n';
      contextText += '• Portfolio tracking across multiple chains\n';

      // Current market conditions (mock data)
      contextText += '\n**Market Conditions:**\n';
      contextText += '• Gas prices: Ethereum (~20 gwei), Polygon (~30 gwei), Arbitrum (~0.1 gwei)\n';
      contextText += '• DEX liquidity: High across major pairs\n';
      contextText += '• Recommended slippage: 0.5% for stablecoins, 1-2% for volatile tokens\n';

      contextText += '[/DEX_INFO]';

      return {
        text: contextText,
        data: {
          available: true,
          supportedChains: Object.values(MAINNET_CHAINS),
          supportedProtocols: Object.values(DEXProtocol),
          commonTokens: COMMON_TOKENS,
          chainDexSupport: CHAIN_DEX_SUPPORT
        }
      };

    } catch (error) {
      runtime.logger.error('DEX provider error:', error);
      
      return {
        text: '[DEX_INFO]\nError fetching DEX information\n[/DEX_INFO]',
        data: { available: false, error: error instanceof Error ? error.message : 'Unknown error' }
      };
    }
  }
};

function getDEXDisplayName(protocol: DEXProtocol): string {
  const displayNames: { [key in DEXProtocol]: string } = {
    [DEXProtocol.ONE_INCH]: '1inch',
    [DEXProtocol.JUPITER]: 'Jupiter',
    [DEXProtocol.PARASWAP]: 'ParaSwap',
    [DEXProtocol.ZEROX]: '0x Protocol',
    [DEXProtocol.COWSWAP]: 'CoW Swap',
    [DEXProtocol.UNISWAP]: 'Uniswap',
    [DEXProtocol.SUSHISWAP]: 'SushiSwap',
    [DEXProtocol.KYBER]: 'Kyber Network',
    [DEXProtocol.BALANCER]: 'Balancer'
  };

  return displayNames[protocol] || protocol;
}

function getChainName(chainId: number): string {
  const chainNames: { [key: number]: string } = {
    [MAINNET_CHAINS.ETHEREUM]: 'Ethereum',
    [MAINNET_CHAINS.POLYGON]: 'Polygon',
    [MAINNET_CHAINS.ARBITRUM]: 'Arbitrum',
    [MAINNET_CHAINS.OPTIMISM]: 'Optimism',
    [MAINNET_CHAINS.BASE]: 'Base'
  };

  return chainNames[chainId] || `Chain ${chainId}`;
}