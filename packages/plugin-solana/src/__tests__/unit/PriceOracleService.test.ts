import { describe, expect, it, mock, beforeEach, afterEach } from 'bun:test';

// Mock dependencies
mock.module('axios', () => ({
  default: {
    get: mock(),
  },
}));

mock.module('@elizaos/core', () => ({
  Service: class Service {
    constructor(protected runtime: any) {}
  },
  logger: {
    info: mock(),
    error: mock(),
    warn: mock(),
    debug: mock(),
  },
}));

import { PriceOracleService } from '../../services/PriceOracleService';
import { logger } from '@elizaos/core';
import axios from 'axios';

describe('PriceOracleService', () => {
  let service: PriceOracleService;
  let mockRuntime: any;
  let mockAxios: any;

  beforeEach(() => {
    mock.restore();
    mockAxios = axios as any;

    mockRuntime = {
      getSetting: mock((key: string) => {
        const settings: Record<string, string> = {
          BIRDEYE_API_KEY: 'test-birdeye-key',
          SOLANA_NETWORK: 'devnet',
        };
        return settings[key];
      }),
    };

    service = new PriceOracleService(mockRuntime);
  });

  afterEach(() => {
    mock.restore();
  });

  describe('constructor', () => {
    it('should initialize successfully', () => {
      expect(service).toBeInstanceOf(PriceOracleService);
    });

    it('should set correct capability description', () => {
      expect(service.capabilityDescription).toBe(
        'Token price oracle service with multiple data providers and caching'
      );
    });
  });

  describe('getTokenPrice', () => {
    const testMint = 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v'; // USDC

    it('should fetch price from Jupiter API successfully', async () => {
      const mockJupiterResponse = {
        data: {
          data: {
            [testMint]: {
              price: 1.001,
              mintSymbol: 'USDC',
            },
          },
        },
      };

      mockAxios.get.mockResolvedValueOnce(mockJupiterResponse);

      const price = await service.getTokenPrice(testMint);

      expect(price).toBeDefined();
      expect(price?.mint).toBe(testMint);
      expect(price?.price).toBe(1.001);
      expect(price?.symbol).toBe('USDC');
      expect(mockAxios.get).toHaveBeenCalledWith(
        expect.stringContaining('jup.ag'),
        expect.objectContaining({
          params: { ids: testMint },
          timeout: 5000,
        })
      );
    });

    it('should fallback to Birdeye API when Jupiter fails', async () => {
      const mockBirdeyeResponse = {
        data: {
          data: {
            value: 1.002,
            symbol: 'USDC',
            priceChange24h: 0.2,
            v24hUSD: 2000000,
            mc: 51000000000,
          },
        },
      };

      mockAxios.get
        .mockRejectedValueOnce(new Error('Jupiter API Error'))
        .mockResolvedValueOnce(mockBirdeyeResponse);

      const price = await service.getTokenPrice(testMint);

      expect(price).toBeDefined();
      expect(price?.price).toBe(1.002);
      expect(price?.priceChange24h).toBe(0.2);
      expect(mockAxios.get).toHaveBeenCalledWith(
        expect.stringContaining('jup.ag'),
        expect.objectContaining({
          params: { ids: testMint },
          timeout: 5000,
        })
      );
      expect(mockAxios.get).toHaveBeenCalledWith(
        expect.stringContaining('birdeye.so'),
        expect.objectContaining({
          params: { address: testMint },
          headers: { 'X-API-KEY': 'test-birdeye-key' },
          timeout: 5000,
        })
      );
    });

    it('should return cached price when available and fresh', async () => {
      const mockJupiterResponse = {
        data: {
          data: {
            [testMint]: {
              price: 1.001,
              mintSymbol: 'USDC',
            },
          },
        },
      };

      mockAxios.get.mockResolvedValue(mockJupiterResponse);

      // First call should fetch from API
      const firstPrice = await service.getTokenPrice(testMint);
      const initialCallCount = mockAxios.get.mock.calls.length;

      // Second call should use cache
      const cachedPrice = await service.getTokenPrice(testMint);
      const finalCallCount = mockAxios.get.mock.calls.length;

      expect(firstPrice).toEqual(cachedPrice);
      expect(firstPrice?.mint).toBe(testMint);
      // Cache should prevent additional calls
      expect(finalCallCount).toBe(initialCallCount);
    });

    it('should refresh expired cache', async () => {
      const testService = new PriceOracleService(mockRuntime);
      // Set cache timeout to 0 for testing
      (testService as any).cacheTimeout = 0;

      mockAxios.get.mockResolvedValue({
        data: {
          data: {
            [testMint]: { price: 1.001, mintSymbol: 'TEST' },
          },
        },
      });

      // First call
      await testService.getTokenPrice(testMint);

      // Second call should refetch due to expired cache
      await testService.getTokenPrice(testMint);

      expect(mockAxios.get).toHaveBeenCalledWith(
        expect.stringContaining('price.jup.ag'),
        expect.any(Object)
      );
    });

    it('should return null when both APIs fail', async () => {
      mockAxios.get
        .mockRejectedValueOnce(new Error('Jupiter API Error'))
        .mockRejectedValueOnce(new Error('Birdeye API Error'));

      const price = await service.getTokenPrice(testMint);

      expect(price).toBeNull();
      // Jupiter and Birdeye failures are logged as debug, not error
      expect(logger.debug).toHaveBeenCalled();
    });

    it('should handle invalid mint address', async () => {
      const invalidMint = 'invalid-mint-address';

      mockAxios.get.mockResolvedValueOnce({ data: {} });

      const price = await service.getTokenPrice(invalidMint);

      expect(price).toBeNull();
    });
  });

  describe('getMultipleTokenPrices', () => {
    const testMints = [
      'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v', // USDC
      'So11111111111111111111111111111111111111112', // SOL
    ];

    it('should fetch multiple token prices', async () => {
      const mockResponse = {
        data: {
          data: {
            [testMints[0]]: { price: 1.001, mintSymbol: 'USDC' },
            [testMints[1]]: { price: 100.5, mintSymbol: 'SOL' },
          },
        },
      };

      mockAxios.get.mockResolvedValueOnce(mockResponse);

      const prices = await service.getMultipleTokenPrices(testMints);

      expect(prices.size).toBe(2);
      expect(prices.get(testMints[0])?.mint).toBe(testMints[0]);
      expect(prices.get(testMints[1])?.mint).toBe(testMints[1]);
      expect(prices.get(testMints[0])?.price).toBe(1.001);
      expect(prices.get(testMints[1])?.price).toBe(100.5);
    });

    it('should handle partial failures', async () => {
      const mockResponse = {
        data: {
          data: {
            [testMints[0]]: { price: 1.001, mintSymbol: 'USDC' },
            // testMints[1] missing from response
          },
        },
      };

      mockAxios.get.mockResolvedValueOnce(mockResponse);

      const prices = await service.getMultipleTokenPrices(testMints);

      expect(prices.size).toBe(1);
      expect(prices.get(testMints[0])?.mint).toBe(testMints[0]);
    });

    it('should return empty array when all fail', async () => {
      mockAxios.get.mockRejectedValue(new Error('API Error'));

      const prices = await service.getMultipleTokenPrices(testMints);

      expect(prices).toEqual(new Map());
    });
  });

  describe('getSolPrice', () => {
    it('should fetch SOL price specifically', async () => {
      const mockResponse = {
        data: {
          data: {
            So11111111111111111111111111111111111111112: {
              price: 100.5,
              mintSymbol: 'SOL',
              priceChange24h: 5.2,
              volume24h: 500000000,
              marketCap: 45000000000,
            },
          },
        },
      };

      mockAxios.get.mockResolvedValueOnce(mockResponse);

      const price = await service.getSolPrice();

      expect(price).toBeDefined();
      expect(price?.symbol).toBe('SOL');
      expect(price?.price).toBe(100.5);
      expect(price?.priceChange24h).toBe(5.2);
    });

    it('should handle SOL price fetch failure', async () => {
      mockAxios.get.mockRejectedValue(new Error('API Error'));

      const price = await service.getSolPrice();

      expect(price).toBeNull();
    });
  });

  describe('getHistoricalPrice', () => {
    const testMint = 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v';
    const testTimestamp = Date.now() - 24 * 60 * 60 * 1000; // 24 hours ago

    it('should fetch historical price data', async () => {
      const mockResponse = {
        data: {
          data: {
            items: [
              {
                unixTime: testTimestamp,
                value: 1.002,
              },
            ],
          },
        },
      };

      mockAxios.get.mockResolvedValueOnce(mockResponse);

      const historicalPrice = await service.getHistoricalPrice(testMint, testTimestamp);

      expect(historicalPrice).toBe(1.002);
      expect(mockAxios.get).toHaveBeenCalledWith(
        expect.stringContaining('birdeye.so'),
        expect.objectContaining({
          params: expect.objectContaining({
            address: testMint,
            unixTime: testTimestamp,
          }),
        })
      );
    });

    it('should handle historical price fetch failure', async () => {
      mockAxios.get.mockRejectedValue(new Error('API Error'));

      const historicalPrice = await service.getHistoricalPrice(testMint, testTimestamp);

      expect(historicalPrice).toBeNull();
      expect(logger.error).toHaveBeenCalledWith(
        expect.stringContaining('Failed to fetch historical price'),
        expect.any(Error)
      );
    });
  });

  describe('isStableToken', () => {
    it('should identify USDC as stable', async () => {
      const usdcMint = 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v';

      mockAxios.get.mockResolvedValueOnce({
        data: { [usdcMint]: { price: 1.001, symbol: 'USDC' } },
      });

      const isStable = await service.isStableToken(usdcMint);

      expect(isStable).toBe(true);
    });

    it('should identify SOL as non-stable', async () => {
      const solMint = 'So11111111111111111111111111111111111111112';

      mockAxios.get.mockResolvedValueOnce({
        data: { [solMint]: { price: 100.5, symbol: 'SOL' } },
      });

      const isStable = await service.isStableToken(solMint);

      expect(isStable).toBe(false);
    });

    it('should handle unknown tokens', async () => {
      const unknownMint = 'UnknownToken111111111111111111111111111111';

      mockAxios.get.mockResolvedValueOnce({ data: {} });

      const isStable = await service.isStableToken(unknownMint);

      expect(isStable).toBe(false);
    });
  });

  describe('cache management', () => {
    it('should clear cache on stop', async () => {
      const testMint = 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v';

      mockAxios.get.mockResolvedValueOnce({
        data: { [testMint]: { price: 1.001 } },
      });

      // Populate cache
      await service.getTokenPrice(testMint);

      // Stop service
      await service.stop();

      // Cache should be cleared
      expect((service as any).cache).toEqual({});
    });
  });

  describe('network-specific behavior', () => {
    it('should work with devnet', () => {
      mockRuntime.getSetting = mock((key: string) => {
        if (key === 'SOLANA_NETWORK') {
          return 'devnet';
        }
        return '';
      });

      const devnetService = new PriceOracleService(mockRuntime);
      expect(devnetService).toBeInstanceOf(PriceOracleService);
    });

    it('should work with mainnet', () => {
      mockRuntime.getSetting = mock((key: string) => {
        if (key === 'SOLANA_NETWORK') {
          return 'mainnet-beta';
        }
        return '';
      });

      const mainnetService = new PriceOracleService(mockRuntime);
      expect(mainnetService).toBeInstanceOf(PriceOracleService);
    });
  });

  describe('API key handling', () => {
    it('should use Birdeye API key when available', async () => {
      const testMint = 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v';

      mockAxios.get.mockRejectedValueOnce(new Error('Jupiter Error')).mockResolvedValueOnce({
        data: { data: { value: 1.001 } },
      });

      await service.getTokenPrice(testMint);

      expect(mockAxios.get).toHaveBeenCalledWith(
        expect.stringContaining('birdeye.so'),
        expect.objectContaining({
          headers: expect.objectContaining({
            'X-API-KEY': 'test-birdeye-key',
          }),
        })
      );
    });

    it('should work without API key', async () => {
      mockRuntime.getSetting = mock(() => '');

      const serviceWithoutKey = new PriceOracleService(mockRuntime);
      const testMint = 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v';

      mockAxios.get.mockResolvedValueOnce({
        data: { [testMint]: { price: 1.001 } },
      });

      const price = await serviceWithoutKey.getTokenPrice(testMint);

      expect(price).toBeDefined();
    });
  });
});
