import { IAgentRuntime, logger, Service } from '@elizaos/core';
import { PublicKey } from '@solana/web3.js';
import axios from 'axios';

interface TokenPrice {
  mint: string;
  symbol: string;
  price: number;
  priceChange24h: number;
  volume24h: number;
  marketCap: number;
  lastUpdated: Date;
}

interface PriceCache {
  [mint: string]: {
    data: TokenPrice;
    timestamp: number;
  };
}

export class PriceOracleService extends Service {
  static serviceName = 'price-oracle-service';
  static serviceType = 'price-oracle-service';
  private cache: PriceCache = {};
  private cacheTimeout = 60000; // 1 minute
  private jupiterPriceApi = 'https://price.jup.ag/v4/price';
  private birdeyeApi = 'https://public-api.birdeye.so/public/price';

  constructor(runtime: IAgentRuntime) {
    super(runtime);
  }

  get capabilityDescription(): string {
    return 'Token price oracle service with multiple data providers and caching';
  }

  async stop(): Promise<void> {
    this.cache = {};
  }

  async getTokenPrice(mintAddress: string): Promise<TokenPrice | null> {
    try {
      // Check cache first
      const cached = this.cache[mintAddress];
      if (cached && Date.now() - cached.timestamp < this.cacheTimeout) {
        return cached.data;
      }

      // Try Jupiter first
      const jupiterPrice = await this.fetchJupiterPrice(mintAddress);
      if (jupiterPrice) {
        this.cache[mintAddress] = {
          data: jupiterPrice,
          timestamp: Date.now(),
        };
        return jupiterPrice;
      }

      // Fallback to Birdeye
      const birdeyePrice = await this.fetchBirdeyePrice(mintAddress);
      if (birdeyePrice) {
        this.cache[mintAddress] = {
          data: birdeyePrice,
          timestamp: Date.now(),
        };
        return birdeyePrice;
      }

      return null;
    } catch (error) {
      logger.error(`Error fetching price for ${mintAddress}:`, error);
      return null;
    }
  }

  async getMultipleTokenPrices(mintAddresses: string[]): Promise<Map<string, TokenPrice>> {
    const prices = new Map<string, TokenPrice>();

    // Batch request to Jupiter
    try {
      const response = await axios.get(this.jupiterPriceApi, {
        params: {
          ids: mintAddresses.join(','),
        },
      });

      if (response.data && response.data.data) {
        Object.entries(response.data.data).forEach(([mint, data]: [string, any]) => {
          if (data && data.price !== undefined && data.price !== null) {
            const tokenPrice: TokenPrice = {
              mint,
              symbol: data.mintSymbol || 'UNKNOWN',
              price: data.price,
              priceChange24h: data.priceChange24h || 0,
              volume24h: data.volume24h || 0,
              marketCap: data.marketCap || 0,
              lastUpdated: new Date(),
            };
            prices.set(mint, tokenPrice);
            this.cache[mint] = {
              data: tokenPrice,
              timestamp: Date.now(),
            };
          }
        });
      }
    } catch (error) {
      logger.error('Error fetching batch prices from Jupiter:', error);
    }

    // For any missing prices, try individual requests
    for (const mint of mintAddresses) {
      if (!prices.has(mint)) {
        const price = await this.getTokenPrice(mint);
        if (price) {
          prices.set(mint, price);
        }
      }
    }

    return prices;
  }

  private async fetchJupiterPrice(mintAddress: string): Promise<TokenPrice | null> {
    try {
      const response = await axios.get(this.jupiterPriceApi, {
        params: { ids: mintAddress },
        timeout: 5000,
      });

      const data = response.data?.data?.[mintAddress];
      if (!data || !data.price) {
        return null;
      }

      return {
        mint: mintAddress,
        symbol: data.mintSymbol || 'UNKNOWN',
        price: data.price,
        priceChange24h: data.priceChange24h || 0,
        volume24h: data.volume24h || 0,
        marketCap: data.marketCap || 0,
        lastUpdated: new Date(),
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logger.debug(`Jupiter price fetch failed for ${mintAddress}:`, errorMessage);
      return null;
    }
  }

  private async fetchBirdeyePrice(mintAddress: string): Promise<TokenPrice | null> {
    try {
      const birdeyeApiKey = this.runtime.getSetting('BIRDEYE_API_KEY');
      if (!birdeyeApiKey) {
        logger.debug('Birdeye API key not configured');
        return null;
      }

      const response = await axios.get(`${this.birdeyeApi}`, {
        params: { address: mintAddress },
        headers: {
          'X-API-KEY': birdeyeApiKey,
        },
        timeout: 5000,
      });

      const data = response.data?.data;
      if (!data || data.value === undefined || data.value === null) {
        return null;
      }

      return {
        mint: mintAddress,
        symbol: data.symbol || 'UNKNOWN',
        price: data.value,
        priceChange24h: data.priceChange24h || 0,
        volume24h: data.v24hUSD || 0,
        marketCap: data.mc || 0,
        lastUpdated: new Date(),
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logger.debug(`Birdeye price fetch failed for ${mintAddress}:`, errorMessage);
      return null;
    }
  }

  async calculateSwapValue(
    inputMint: string,
    outputMint: string,
    inputAmount: number
  ): Promise<{ inputValue: number; outputValue: number; exchangeRate: number } | null> {
    const [inputPrice, outputPrice] = await Promise.all([
      this.getTokenPrice(inputMint),
      this.getTokenPrice(outputMint),
    ]);

    if (!inputPrice || !outputPrice) {
      return null;
    }

    const inputValue = inputAmount * inputPrice.price;
    const exchangeRate = inputPrice.price / outputPrice.price;
    const outputValue = inputValue;

    return {
      inputValue,
      outputValue,
      exchangeRate,
    };
  }

  async getSolPrice(): Promise<TokenPrice | null> {
    const solMint = 'So11111111111111111111111111111111111111112';
    return this.getTokenPrice(solMint);
  }

  async getHistoricalPrice(mintAddress: string, timestamp: number): Promise<number | null> {
    try {
      const birdeyeApiKey = this.runtime.getSetting('BIRDEYE_API_KEY');
      if (!birdeyeApiKey) {
        logger.debug('Birdeye API key not configured for historical data');
        return null;
      }

      const response = await axios.get(`${this.birdeyeApi}/history`, {
        params: {
          address: mintAddress,
          unixTime: timestamp,
        },
        headers: {
          'X-API-KEY': birdeyeApiKey,
        },
        timeout: 5000,
      });

      const data = response.data?.data?.items?.[0];
      return data?.value || null;
    } catch (error) {
      logger.error(`Failed to fetch historical price for ${mintAddress}:`, error);
      return null;
    }
  }

  async isStableToken(mintAddress: string): Promise<boolean> {
    const stableMints = [
      // Mainnet stable tokens
      'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v', // USDC mainnet
      'Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB', // USDT mainnet
      'Dn4noZ5jgGfkntzcQSUZ8czkreiZ1ForXYoV2H8Dm7S1', // UXD mainnet
      'A9mUU4qviSctJVPJdBJWkb28deg915LYJKrzQ19ji3FM', // USTv2 mainnet

      // Devnet stable tokens
      'Gh9ZwEmdLJ8DscKNTkTqPbNwLNNBjuSzaG9Vp2KGtKJr', // USDC devnet
      '4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU', // USDC devnet (alternative)

      // Testnet stable tokens
      'CpMah17kQEL2wqyMKt3mZBdTnZbkbfx4nqmQMFDP5vwp', // USDC testnet
    ];

    if (stableMints.includes(mintAddress)) {
      return true;
    }

    // Check if price is close to $1 with low volatility
    const price = await this.getTokenPrice(mintAddress);
    if (price) {
      const isNearDollar = price.price >= 0.95 && price.price <= 1.05;
      const hasLowVolatility = Math.abs(price.priceChange24h) < 5; // Less than 5% daily change
      return isNearDollar && hasLowVolatility;
    }

    return false;
  }

  async getTopMovers(limit: number = 10): Promise<TokenPrice[]> {
    // This would require a more comprehensive API or database
    // For now, return cached tokens sorted by price change
    const cached = Object.values(this.cache)
      .filter((item) => Date.now() - item.timestamp < this.cacheTimeout)
      .map((item) => item.data)
      .sort((a, b) => Math.abs(b.priceChange24h) - Math.abs(a.priceChange24h))
      .slice(0, limit);

    return cached;
  }

  static async start(runtime: IAgentRuntime): Promise<PriceOracleService> {
    logger.info('Starting PriceOracleService...');
    return new PriceOracleService(runtime);
  }
}
