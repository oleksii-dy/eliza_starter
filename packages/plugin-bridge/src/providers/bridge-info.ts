import {
  type IAgentRuntime,
  type Memory,
  type Provider,
  type ProviderResult,
  type State,
} from '@elizaos/core';
import { BridgeService } from '../services/BridgeService.js';

export const bridgeInfoProvider: Provider = {
  name: 'BRIDGE_INFO',
  description: 'Provides information about available bridge routes, supported chains, and bridging capabilities',
  position: 5,

  get: async (
    runtime: IAgentRuntime,
    message: Memory,
    state: State
  ): Promise<ProviderResult> => {
    try {
      const bridgeService = runtime.getService<BridgeService>('bridge');
      if (!bridgeService) {
        return {
          text: '[BRIDGE_INFO]\nBridge service not available\n[/BRIDGE_INFO]',
          values: {
            bridgeAvailable: false,
          },
        };
      }

      const supportedChains = bridgeService.getSupportedChains();
      const walletAddress = bridgeService.getWalletAddress();

      const chainList = supportedChains
        .map(chain => `- ${chain.name} (Chain ID: ${chain.id})`)
        .join('\n');

      const text = `[BRIDGE_INFO]
Cross-chain bridging is available via multiple protocols including LiFi, Wormhole, Hop, and Synapse.

Wallet Address: ${walletAddress}

Supported Chains:
${chainList}

Available Features:
- Token bridging between supported chains
- Multi-protocol route aggregation
- Gas optimization
- Slippage protection
- Transaction status tracking

Common bridgeable tokens: ETH, USDC, USDT, WETH, and chain-native tokens.

Use commands like "bridge 100 USDC from Ethereum to Polygon" to initiate transfers.
[/BRIDGE_INFO]`;

      return {
        text,
        values: {
          bridgeAvailable: true,
          supportedChainCount: supportedChains.length,
          walletAddress,
          supportedChains: supportedChains.map(c => ({
            id: c.id,
            name: c.name,
            currency: c.nativeCurrency.symbol,
          })),
        },
        data: {
          bridgeService: 'available',
          protocols: ['lifi', 'wormhole', 'hop', 'synapse', 'across'],
          supportedChains,
        },
      };
    } catch (error) {
      return {
        text: '[BRIDGE_INFO]\nError retrieving bridge information\n[/BRIDGE_INFO]',
        values: {
          bridgeAvailable: false,
          error: (error as Error)?.message || 'Unknown error',
        },
      };
    }
  },
};