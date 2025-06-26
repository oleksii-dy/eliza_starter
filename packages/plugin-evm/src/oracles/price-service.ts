import { logger } from '@elizaos/core';

interface PriceData {
  price: number;
  timestamp: number;
}

export class PriceService {
  private cache = new Map<string, PriceData>();
  private cacheTTL = 60000; // 1 minute

  async getTokenPriceUSD(tokenAddress: string, chainId: number): Promise<number> {
    const cacheKey = `${chainId}-${tokenAddress.toLowerCase()}`;
    const cached = this.cache.get(cacheKey);

    if (cached && Date.now() - cached.timestamp < this.cacheTTL) {
      return cached.price;
    }

    try {
      // Try CoinGecko API (free tier)
      const chainName = this.getCoingeckoChainId(chainId);
      const url = `https://api.coingecko.com/api/v3/simple/token_price/${chainName}?contract_addresses=${tokenAddress}&vs_currencies=usd`;

      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`CoinGecko API error: ${response.status}`);
      }

      const data = await response.json();
      const price = data[tokenAddress.toLowerCase()]?.usd || 0;

      this.cache.set(cacheKey, {
        price,
        timestamp: Date.now(),
      });

      return price;
    } catch (_error) {
      logger.warn('Failed to fetch token price:', _error);

      // Fallback prices for common tokens
      return this.getFallbackPrice(tokenAddress, chainId);
    }
  }

  async getNativeTokenPriceUSD(chainId: number): Promise<number> {
    const cacheKey = `native-${chainId}`;
    const cached = this.cache.get(cacheKey);

    if (cached && Date.now() - cached.timestamp < this.cacheTTL) {
      return cached.price;
    }

    const nativeTokens: Record<number, string> = {
      1: 'ethereum',
      137: 'matic-network',
      42161: 'ethereum', // Arbitrum uses ETH
      10: 'ethereum', // Optimism uses ETH
      8453: 'ethereum', // Base uses ETH
      56: 'binancecoin',
      43114: 'avalanche-2',
    };

    const tokenId = nativeTokens[chainId];
    if (!tokenId) {
      return 0;
    }

    try {
      const response = await fetch(
        `https://api.coingecko.com/api/v3/simple/price?ids=${tokenId}&vs_currencies=usd`
      );

      if (!response.ok) {
        throw new Error(`CoinGecko API error: ${response.status}`);
      }

      const data = await response.json();
      const price = data[tokenId]?.usd || 0;

      this.cache.set(cacheKey, {
        price,
        timestamp: Date.now(),
      });

      return price;
    } catch (_error) {
      logger.warn('Failed to fetch native token price:', _error);

      // Fallback prices
      const fallbackPrices: Record<number, number> = {
        1: 2000, // ETH
        137: 0.8, // MATIC
        42161: 2000, // ETH on Arbitrum
        10: 2000, // ETH on Optimism
        8453: 2000, // ETH on Base
        56: 300, // BNB
        43114: 35, // AVAX
      };

      return fallbackPrices[chainId] || 0;
    }
  }

  private getCoingeckoChainId(chainId: number): string {
    const mapping: Record<number, string> = {
      1: 'ethereum',
      137: 'polygon-pos',
      42161: 'arbitrum-one',
      10: 'optimistic-ethereum',
      8453: 'base',
      56: 'binance-smart-chain',
      43114: 'avalanche',
      11155111: 'ethereum', // Sepolia uses mainnet prices
      84532: 'base', // Base Sepolia uses Base prices
    };

    return mapping[chainId] || 'ethereum';
  }

  private getFallbackPrice(tokenAddress: string, _chainId: number): number {
    // Common stablecoin addresses
    const stablecoins: Record<string, number> = {
      // Ethereum mainnet
      '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48': 1, // USDC
      '0xdac17f958d2ee523a2206206994597c13d831ec7': 1, // USDT
      '0x6b175474e89094c44da98b954eedeac495271d0f': 1, // DAI

      // Polygon
      '0x2791bca1f2de4661ed88a30c99a7a9449aa84174': 1, // USDC
      '0xc2132d05d31c914a87c6611c10748aeb04b58e8f': 1, // USDT

      // Arbitrum
      '0xff970a61a04b1ca14834a43f5de4533ebddb5cc8': 1, // USDC
      '0xfd086bc7cd5c481dcc9c85ebe478a1c0b69fcbb9': 1, // USDT
    };

    const lowerAddress = tokenAddress.toLowerCase();
    return stablecoins[lowerAddress] || 0;
  }

  clearCache(): void {
    this.cache.clear();
  }
}

// Singleton instance
let priceServiceInstance: PriceService | null = null;

export function getPriceService(): PriceService {
  if (!priceServiceInstance) {
    priceServiceInstance = new PriceService();
  }
  return priceServiceInstance;
}
