import {
  type Provider,
  type IAgentRuntime,
  type Memory,
  type State
} from '@elizaos/core';

import type { LendingService } from '../services/LendingService.js';
import { LendingProtocol } from '../types/index.js';

export const lendingInfoProvider: Provider = {
  name: 'LENDING_INFO',
  description: 'Provides information about DeFi lending protocols, available markets, user positions, and lending capabilities',
  position: 6,

  get: async (runtime: IAgentRuntime, message: Memory, state: State) => {
    try {
      const lendingService = runtime.getService('lending') as LendingService;
      if (!lendingService) {
        return {
          text: `[LENDING_INFO]
DeFi lending service not available
[/LENDING_INFO]`,
          values: {
            lendingAvailable: false
          }
        };
      }

      const supportedChains = lendingService.getSupportedChains();
      const supportedProtocols = lendingService.getSupportedProtocols();
      const walletAddress = lendingService.getWalletAddress();

      // Get market data for Ethereum (primary chain)
      let marketInfo = '';
      let userPositionInfo = '';
      let totalMarkets = 0;

      try {
        const ethereumMarkets = await lendingService.getMarkets(LendingProtocol.AAVE, 1);
        totalMarkets = ethereumMarkets.length;

        // Show top 3 markets
        const topMarkets = ethereumMarkets.slice(0, 3);
        marketInfo = topMarkets.map(market => 
          `- ${market.asset.symbol}: Supply ${market.supplyAPY}% APY, Borrow ${market.variableBorrowAPY}% APY`
        ).join('\n');

        // Get user positions
        const userPositions = await lendingService.getUserPositions(LendingProtocol.AAVE, 1, walletAddress);
        if (userPositions.length > 0) {
          userPositionInfo = `\nYour Current Positions:\n` + 
            userPositions.map(pos => 
              `- ${pos.asset.symbol}: Supplied ${formatTokenAmount(pos.supplied, pos.asset.decimals)}, Borrowed ${formatTokenAmount(pos.borrowed, pos.asset.decimals)}`
            ).join('\n');
        }
      } catch (error) {
        marketInfo = 'Market data temporarily unavailable';
      }

      const chainList = supportedChains.map(chain => 
        `- ${chain.name} (Chain ID: ${chain.id})`
      ).join('\n');

      const protocolList = supportedProtocols.map(protocol => 
        `- ${protocol.toUpperCase()}`
      ).join('\n');

      const text = `[LENDING_INFO]
DeFi lending and borrowing services are available across multiple protocols and chains.

Wallet Address: ${walletAddress}

Supported Protocols:
${protocolList}

Supported Chains:
${chainList}

Sample Market Rates (Ethereum Aave):
${marketInfo}
${userPositionInfo}

Available Operations:
- Supply/Deposit assets to earn yield
- Withdraw supplied assets
- Borrow assets against collateral
- Repay borrowed assets
- Manage collateral settings

Health Factor Management:
- Maintains positions above liquidation threshold
- Automatic health factor monitoring
- Risk assessment for all operations

Use commands like:
- "Supply 100 USDC to Aave"
- "Borrow 50 DAI variable rate"
- "Withdraw 0.5 ETH from lending"
- "Repay all USDT debt"
[/LENDING_INFO]`;

      return {
        text,
        values: {
          lendingAvailable: true,
          supportedChainCount: supportedChains.length,
          supportedProtocolCount: supportedProtocols.length,
          totalMarkets,
          walletAddress,
          supportedChains: supportedChains.map(c => ({
            id: c.id,
            name: c.name,
            currency: c.nativeCurrency.symbol
          })),
          supportedProtocols: supportedProtocols.map(p => p.toUpperCase())
        },
        data: {
          lendingService: 'available',
          protocols: supportedProtocols,
          supportedChains,
          primaryProtocol: LendingProtocol.AAVE,
          operations: ['supply', 'withdraw', 'borrow', 'repay'],
          features: [
            'multi_protocol_support',
            'health_factor_monitoring', 
            'collateral_management',
            'variable_and_stable_rates',
            'cross_chain_operations'
          ]
        }
      };
    } catch (error) {
      return {
        text: `[LENDING_INFO]
Error retrieving lending information: ${error?.message || 'Unknown error'}
[/LENDING_INFO]`,
        values: {
          lendingAvailable: false,
          error: error?.message || 'Unknown error'
        }
      };
    }
  }
};

// Helper function to format token amounts
function formatTokenAmount(amount: string, decimals: number, maxDecimals: number = 6): string {
  try {
    const value = BigInt(amount);
    const divisor = BigInt(10 ** decimals);
    const quotient = value / divisor;
    const remainder = value % divisor;

    if (remainder === 0n) {
      return quotient.toString();
    }

    const remainderStr = remainder.toString().padStart(decimals, '0');
    let trimmedRemainder = remainderStr.replace(/0+$/, '');
    
    if (trimmedRemainder.length > maxDecimals) {
      trimmedRemainder = trimmedRemainder.substring(0, maxDecimals);
    }

    if (trimmedRemainder === '') {
      return quotient.toString();
    }

    return `${quotient}.${trimmedRemainder}`;
  } catch (error) {
    return '0';
  }
}