import { type IAgentRuntime, Service, ServiceType, elizaLogger as logger } from '@elizaos/core';
import { PaymentMethod } from '../types';
import { priceCache, type NewPriceCache, type PriceCache as _PriceCache } from '../database/schema';
import { eq, and, gt } from 'drizzle-orm';

export interface TokenPrice {
  address: string;
  network: string;
  symbol: string;
  priceUsd: number;
  priceChange24h?: number;
  volume24h?: number;
  marketCap?: number;
  source: string;
  timestamp: Date;
}

export interface IPriceOracleService {
  getTokenPrice(address: string, network: string): Promise<TokenPrice | null>;
  getTokenPriceByMethod(method: PaymentMethod): Promise<TokenPrice | null>;
  convertToUSD(amount: bigint, method: PaymentMethod): Promise<number>;
  getCachedPrice(address: string, network: string): Promise<TokenPrice | null>;
  updatePriceCache(price: TokenPrice): Promise<void>;
}

/**
 * Price Oracle Service for the payment plugin
 * Aggregates prices from multiple sources and caches them
 */
export class PriceOracleService extends Service implements IPriceOracleService {
  static serviceName = 'payment-price-oracle';
  static serviceType = ServiceType.UNKNOWN;

  public readonly serviceName = PriceOracleService.serviceName;
  public readonly serviceType = PriceOracleService.serviceType;
  public readonly capabilityDescription = 'Token price oracle for payment calculations';

  declare protected runtime: IAgentRuntime;
  private db: any; // Drizzle database instance
  private cacheTimeout = 60000; // 1 minute

  // External price services
  private solanaOracleService: any;
  private evmOracleService: any;

  constructor() {
    super();
  }

  async initialize(runtime: IAgentRuntime): Promise<void> {
    this.runtime = runtime;

    // Get database service
    const dbService = runtime.getService('database') as any;
    this.db = dbService?.getDatabase?.();

    // Get external price oracle services if available
    this.solanaOracleService = runtime.getService('price-oracle'); // From Solana plugin
    this.evmOracleService = runtime.getService('evm-price-oracle'); // From EVM plugin

    logger.info('[PriceOracleService] Initialized', {
      hasDb: !!this.db,
      hasSolanaOracle: !!this.solanaOracleService,
      hasEvmOracle: !!this.evmOracleService,
    });
  }

  /**
   * Get token price from various sources
   */
  async getTokenPrice(address: string, network: string): Promise<TokenPrice | null> {
    try {
      // Check cache first
      const cached = await this.getCachedPrice(address, network);
      if (cached) {
        return cached;
      }

      // Try external oracles based on network
      let price: TokenPrice | null = null;

      // Try real APIs first
      try {
        price = await this.getRealTimePrice(address, network);
      } catch (error) {
        logger.warn('[PriceOracleService] Real-time price fetch failed, trying fallbacks', error);
      }

      if (!price && network === 'solana' && this.solanaOracleService) {
        price = await this.getSolanaPriceFromOracle(address);
      } else if (
        !price &&
        ['ethereum', 'polygon', 'arbitrum', 'optimism', 'base'].includes(network)
      ) {
        price = await this.getEVMPriceFromOracle(address, network);
      }

      // Fallback to hardcoded prices for common tokens
      if (!price) {
        price = this.getHardcodedPrice(address, network);
      }

      // Cache the price
      if (price) {
        await this.updatePriceCache(price);
      }

      return price;
    } catch (error) {
      logger.error('[PriceOracleService] Error getting token price', { error, address, network });
      return null;
    }
  }

  /**
   * Get token price by payment method
   */
  async getTokenPriceByMethod(method: PaymentMethod): Promise<TokenPrice | null> {
    const { address, network } = this.getTokenInfoForMethod(method);
    return this.getTokenPrice(address, network);
  }

  /**
   * Convert token amount to USD
   */
  async convertToUSD(amount: bigint, method: PaymentMethod): Promise<number> {
    const price = await this.getTokenPriceByMethod(method);
    if (!price) {
      logger.warn(`[PriceOracleService] No price found for ${method}, using fallback`);
      return this.getFallbackUSDValue(amount, method);
    }

    const decimals = this.getDecimalsForMethod(method);
    const divisor = BigInt(10 ** decimals);
    const whole = Number(amount / divisor);
    const fraction = Number(amount % divisor) / Number(divisor);

    return (whole + fraction) * price.priceUsd;
  }

  /**
   * Get cached price from database
   */
  async getCachedPrice(address: string, network: string): Promise<TokenPrice | null> {
    if (!this.db) {
      return null;
    }

    try {
      const now = new Date();
      const result = await this.db
        .select()
        .from(priceCache)
        .where(
          and(
            eq(priceCache.tokenAddress, address),
            eq(priceCache.network, network),
            gt(priceCache.expiresAt, now)
          )
        )
        .limit(1);

      if (result.length === 0) {
        return null;
      }

      const cached = result[0];
      return {
        address: cached.tokenAddress,
        network: cached.network,
        symbol: cached.symbol,
        priceUsd: parseFloat(cached.priceUsd),
        priceChange24h: cached.priceChange24h ? parseFloat(cached.priceChange24h) : undefined,
        volume24h: cached.volume24h ? parseFloat(cached.volume24h) : undefined,
        marketCap: cached.marketCap ? parseFloat(cached.marketCap) : undefined,
        source: cached.source,
        timestamp: cached.createdAt,
      };
    } catch (error) {
      logger.error('[PriceOracleService] Error getting cached price', error);
      return null;
    }
  }

  /**
   * Update price cache in database
   */
  async updatePriceCache(price: TokenPrice): Promise<void> {
    if (!this.db) {
      return;
    }

    try {
      const expiresAt = new Date(Date.now() + this.cacheTimeout);

      const newPrice: NewPriceCache = {
        tokenAddress: price.address,
        network: price.network,
        symbol: price.symbol,
        priceUsd: price.priceUsd.toFixed(8),
        priceChange24h: price.priceChange24h?.toFixed(2),
        volume24h: price.volume24h?.toFixed(2),
        marketCap: price.marketCap?.toFixed(2),
        source: price.source,
        expiresAt,
      } as any;

      await this.db
        .insert(priceCache)
        .values(newPrice)
        .onConflictDoUpdate({
          target: [priceCache.tokenAddress, priceCache.network],
          set: newPrice,
        });
    } catch (error) {
      logger.error('[PriceOracleService] Error updating price cache', error);
    }
  }

  /**
   * Get price from Solana oracle service
   */
  private async getSolanaPriceFromOracle(address: string): Promise<TokenPrice | null> {
    if (!this.solanaOracleService) {
      return null;
    }

    try {
      const solanaPrice = await this.solanaOracleService.getTokenPrice(address);
      if (!solanaPrice) {
        return null;
      }

      return {
        address,
        network: 'solana',
        symbol: solanaPrice.symbol,
        priceUsd: solanaPrice.price,
        priceChange24h: solanaPrice.priceChange24h,
        volume24h: solanaPrice.volume24h,
        marketCap: solanaPrice.marketCap,
        source: 'solana-oracle',
        timestamp: new Date(),
      };
    } catch (error) {
      logger.error('[PriceOracleService] Error getting Solana price', error);
      return null;
    }
  }

  /**
   * Get price from EVM oracle service
   */
  private async getEVMPriceFromOracle(
    _address: string,
    _network: string
  ): Promise<TokenPrice | null> {
    // If EVM plugin provides a price oracle, use it
    // For now, return null to use fallback
    return null;
  }

  /**
   * Get hardcoded prices for common tokens
   */
  private getHardcodedPrice(address: string, network: string): TokenPrice | null {
    const now = new Date();

    // Common token prices (fallback)
    const prices: Record<string, { symbol: string; price: number }> = {
      // Ethereum
      '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48': { symbol: 'USDC', price: 1.0 },
      '0xdAC17F958D2ee523a2206206994597C13D831ec7': { symbol: 'USDT', price: 1.0 },
      '0x6B175474E89094C44Da98b954EedeAC495271d0F': { symbol: 'DAI', price: 1.0 },

      // Solana
      EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v: { symbol: 'USDC', price: 1.0 },
      So11111111111111111111111111111111111111112: { symbol: 'SOL', price: 100.0 },

      // Base
      '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913': { symbol: 'USDC', price: 1.0 },

      // Native tokens
      'native-eth': { symbol: 'ETH', price: 2500.0 },
      'native-matic': { symbol: 'MATIC', price: 0.8 },
    };

    const key = address === 'native' ? `native-${network}` : address;
    const priceInfo = prices[key];

    if (!priceInfo) {
      return null;
    }

    return {
      address,
      network,
      symbol: priceInfo.symbol,
      priceUsd: priceInfo.price,
      source: 'hardcoded',
      timestamp: now,
    };
  }

  /**
   * Get token info for payment method
   */
  private getTokenInfoForMethod(method: PaymentMethod): { address: string; network: string } {
    const methodMap: Record<PaymentMethod, { address: string; network: string }> = {
      [PaymentMethod.USDC_ETH]: {
        address: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
        network: 'ethereum',
      },
      [PaymentMethod.USDC_SOL]: {
        address: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
        network: 'solana',
      },
      [PaymentMethod.ETH]: { address: 'native', network: 'ethereum' },
      [PaymentMethod.SOL]: {
        address: 'So11111111111111111111111111111111111111112',
        network: 'solana',
      },
      [PaymentMethod.MATIC]: { address: 'native', network: 'polygon' },
      [PaymentMethod.ARB]: { address: 'native', network: 'arbitrum' },
      [PaymentMethod.OP]: { address: 'native', network: 'optimism' },
      [PaymentMethod.BASE]: { address: 'native', network: 'base' },
      [PaymentMethod.BTC]: { address: 'btc', network: 'bitcoin' },
      [PaymentMethod.OTHER]: { address: 'unknown', network: 'unknown' },
    };

    return methodMap[method] || { address: 'unknown', network: 'unknown' };
  }

  /**
   * Get decimals for payment method
   */
  private getDecimalsForMethod(method: PaymentMethod): number {
    const decimalsMap: Record<PaymentMethod, number> = {
      [PaymentMethod.USDC_ETH]: 6,
      [PaymentMethod.USDC_SOL]: 6,
      [PaymentMethod.ETH]: 18,
      [PaymentMethod.SOL]: 9,
      [PaymentMethod.BTC]: 8,
      [PaymentMethod.MATIC]: 18,
      [PaymentMethod.ARB]: 18,
      [PaymentMethod.OP]: 18,
      [PaymentMethod.BASE]: 18,
      [PaymentMethod.OTHER]: 18,
    };

    return decimalsMap[method] || 18;
  }

  /**
   * Get fallback USD value using hardcoded prices
   */
  private getFallbackUSDValue(amount: bigint, method: PaymentMethod): number {
    const fallbackPrices: Record<PaymentMethod, number> = {
      [PaymentMethod.USDC_ETH]: 1,
      [PaymentMethod.USDC_SOL]: 1,
      [PaymentMethod.ETH]: 2500,
      [PaymentMethod.SOL]: 100,
      [PaymentMethod.BTC]: 45000,
      [PaymentMethod.MATIC]: 0.8,
      [PaymentMethod.ARB]: 2500, // ETH on Arbitrum
      [PaymentMethod.OP]: 2500, // ETH on Optimism
      [PaymentMethod.BASE]: 2500, // ETH on Base
      [PaymentMethod.OTHER]: 1,
    };

    const price = fallbackPrices[method] || 1;
    const decimals = this.getDecimalsForMethod(method);
    const divisor = BigInt(10 ** decimals);
    const whole = Number(amount / divisor);
    const fraction = Number(amount % divisor) / Number(divisor);

    return (whole + fraction) * price;
  }

  /**
   * Get real-time price from CoinGecko API
   */
  private async getRealTimePrice(address: string, network: string): Promise<TokenPrice | null> {
    try {
      // Map network to CoinGecko platform ID
      const platformMap: Record<string, string> = {
        ethereum: 'ethereum',
        polygon: 'polygon-pos',
        arbitrum: 'arbitrum-one',
        optimism: 'optimistic-ethereum',
        base: 'base',
        solana: 'solana',
        bsc: 'binance-smart-chain',
      };

      const platform = platformMap[network];
      if (!platform) {
        return null;
      }

      // Special handling for native tokens
      const nativeTokenIds: Record<string, string> = {
        'native-ethereum': 'ethereum',
        'native-polygon': 'matic-network',
        'native-arbitrum': 'ethereum', // ARB uses ETH
        'native-optimism': 'ethereum', // OP uses ETH
        'native-base': 'ethereum', // BASE uses ETH
        'native-solana': 'solana',
        'native-bsc': 'binancecoin',
      };

      let apiUrl: string;
      let coinId: string | null = null;

      if (address === 'native') {
        coinId = nativeTokenIds[`native-${network}`];
        if (!coinId) {
          return null;
        }
        apiUrl = `https://api.coingecko.com/api/v3/simple/price?ids=${coinId}&vs_currencies=usd&include_market_cap=true&include_24hr_vol=true&include_24hr_change=true`;
      } else {
        // Token contract address
        apiUrl = `https://api.coingecko.com/api/v3/simple/token_price/${platform}?contract_addresses=${address}&vs_currencies=usd&include_market_cap=true&include_24hr_vol=true&include_24hr_change=true`;
      }

      const response = await fetch(apiUrl, {
        headers: {
          Accept: 'application/json',
          // Add API key if available
          ...(this.runtime.getSetting('COINGECKO_API_KEY')
            ? {
              'x-cg-pro-api-key': this.runtime.getSetting('COINGECKO_API_KEY'),
            }
            : {}),
        },
      });

      if (!response.ok) {
        throw new Error(`CoinGecko API error: ${response.status}`);
      }

      const data = (await response.json()) as Record<
        string,
        { usd: number; usd_24h_change?: number; usd_24h_vol?: number; usd_market_cap?: number }
      >;

      // Extract price data
      let priceData: any;
      if (coinId) {
        // Native token response format
        priceData = data[coinId];
      } else {
        // Token contract response format
        priceData = data[address.toLowerCase()];
      }

      if (!priceData) {
        return null;
      }

      // Get symbol from token info if not native
      let symbol = coinId ? coinId.toUpperCase() : 'UNKNOWN';

      // Try to get more token info
      if (!coinId && address !== 'native') {
        try {
          const infoResponse = await fetch(
            `https://api.coingecko.com/api/v3/coins/${platform}/contract/${address}`,
            {
              headers: {
                Accept: 'application/json',
                ...(this.runtime.getSetting('COINGECKO_API_KEY')
                  ? {
                    'x-cg-pro-api-key': this.runtime.getSetting('COINGECKO_API_KEY'),
                  }
                  : {}),
              },
            }
          );

          if (infoResponse.ok) {
            const infoData = (await infoResponse.json()) as { symbol?: string };
            symbol = infoData.symbol?.toUpperCase() || symbol;
          }
        } catch {
          // Ignore errors getting additional info
        }
      }

      return {
        address,
        network,
        symbol,
        priceUsd: priceData.usd || 0,
        priceChange24h: priceData.usd_24h_change || 0,
        volume24h: priceData.usd_24h_vol || 0,
        marketCap: priceData.usd_market_cap || 0,
        source: 'coingecko',
        timestamp: new Date(),
      };
    } catch (error) {
      logger.error('[PriceOracleService] Error fetching real-time price', {
        error,
        address,
        network,
      });
      return null;
    }
  }

  /**
   * Fetch prices from CoinGecko API
   */
  private async fetchCoinGeckoPrices(): Promise<void> {
    if (!this.runtime.getSetting('COINGECKO_API_KEY')) {
      logger.warn('[PriceOracleService] No CoinGecko API key configured');
      return;
    }

    try {
      const coinIds = [
        'ethereum',
        'matic-network',
        'bitcoin',
        'solana',
        'usd-coin',
        'arbitrum',
        'optimism',
      ];

      const url = `https://api.coingecko.com/api/v3/simple/price?ids=${coinIds.join(',')}&vs_currencies=usd`;

      const response = await fetch(url, {
        headers: {
          'x-cg-demo-api-key': this.runtime.getSetting('COINGECKO_API_KEY'),
        },
      });

      if (!response.ok) {
        throw new Error(`CoinGecko API error: ${response.status}`);
      }

      const data = (await response.json()) as Record<string, { usd: number }>;

      // Update cache with fresh prices
      const now = new Date();

      if (data.ethereum?.usd) {
        await this.updatePriceCache({
          address: 'native',
          network: 'ethereum',
          symbol: 'ETH',
          priceUsd: data.ethereum.usd,
          source: 'coingecko',
          timestamp: now,
        });
      }

      if (data['matic-network']?.usd) {
        await this.updatePriceCache({
          address: 'native',
          network: 'polygon',
          symbol: 'MATIC',
          priceUsd: data['matic-network'].usd,
          source: 'coingecko',
          timestamp: now,
        });
      }

      if (data.bitcoin?.usd) {
        await this.updatePriceCache({
          address: 'btc',
          network: 'bitcoin',
          symbol: 'BTC',
          priceUsd: data.bitcoin.usd,
          source: 'coingecko',
          timestamp: now,
        });
      }

      if (data.solana?.usd) {
        await this.updatePriceCache({
          address: 'So11111111111111111111111111111111111111112',
          network: 'solana',
          symbol: 'SOL',
          priceUsd: data.solana.usd,
          source: 'coingecko',
          timestamp: now,
        });
      }

      if (data['usd-coin']?.usd) {
        // Update USDC on Ethereum
        await this.updatePriceCache({
          address: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
          network: 'ethereum',
          symbol: 'USDC',
          priceUsd: data['usd-coin'].usd,
          source: 'coingecko',
          timestamp: now,
        });

        // Update USDC on Solana
        await this.updatePriceCache({
          address: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
          network: 'solana',
          symbol: 'USDC',
          priceUsd: data['usd-coin'].usd,
          source: 'coingecko',
          timestamp: now,
        });
      }

      logger.info('[PriceOracleService] Updated prices from CoinGecko');
    } catch (error) {
      logger.error('[PriceOracleService] Failed to fetch CoinGecko prices', error);
    }
  }

  async stop(): Promise<void> {
    logger.info('[PriceOracleService] Stopping price oracle service');
  }

  static async start(runtime: IAgentRuntime): Promise<PriceOracleService> {
    const service = new PriceOracleService();
    await service.initialize(runtime);
    return service;
  }
}
