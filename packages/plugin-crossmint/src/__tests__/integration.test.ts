import { describe, it, expect, beforeAll, vi } from 'vitest';
import { type IAgentRuntime, type UUID, asUUID } from '@elizaos/core';
import { RealCrossMintService } from '../services/RealCrossMintService';
import { CrossMintUniversalWalletService } from '../services/CrossMintUniversalWalletService';

// Create a mock runtime helper function
function createMockRuntime(overrides: Partial<IAgentRuntime> = {}): IAgentRuntime {
  return {
    agentId: asUUID('12345678-1234-1234-1234-123456789012'),
    character: {
      name: 'TestAgent',
      bio: ['Test bio'],
      system: 'Test system prompt',
      messageExamples: [],
      postExamples: [],
      topics: [],
      knowledge: [],
      plugins: [],
    },
    getSetting: vi.fn((key: string) => {
      const settings: Record<string, string> = {
        CROSSMINT_API_KEY: 'test-api-key',
        CROSSMINT_ENVIRONMENT: 'staging',
        ...overrides.settings,
      };
      return settings[key];
    }),
    getService: vi.fn((name: string) => {
      const services: Record<string, any> = {
        'real-crossmint': {
          listWallets: vi.fn().mockResolvedValue([]),
          getSupportedChains: vi.fn().mockReturnValue(['ethereum', 'polygon', 'solana']),
          isChainSupported: vi.fn().mockReturnValue(true),
          validateConfiguration: vi.fn().mockResolvedValue(true),
          getWallet: vi.fn().mockRejectedValue(new Error('Wallet not found')),
        },
        ...overrides.services,
      };
      return services[name];
    }),
    logger: {
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
      debug: vi.fn(),
    },
    ...overrides,
  } as unknown as IAgentRuntime;
}

/**
 * Integration Tests for CrossMint Plugin
 * Tests the core service functionality without requiring full runtime setup
 */
describe('CrossMint Plugin Integration Tests', () => {
  const testApiKey = process.env.CROSSMINT_API_KEY || 'test-key';
  const skipRealApiTests = !process.env.CROSSMINT_API_KEY;

  describe('RealCrossMintService', () => {
    let service: RealCrossMintService;
    let mockRuntime: any;

    beforeAll(() => {
      mockRuntime = createMockRuntime({
        getSetting: (key: string) => {
          const settings: Record<string, string> = {
            CROSSMINT_API_KEY: testApiKey,
            CROSSMINT_ENVIRONMENT: 'staging',
          };
          return settings[key];
        },
      });

      service = new RealCrossMintService(mockRuntime);
    });

    it('should initialize with valid configuration', () => {
      expect(service).toBeDefined();
      expect(service.capabilityDescription).toContain('CrossMint');
    });

    it('should have correct supported chains', () => {
      const chains = service.getSupportedChains();

      expect(chains).toContain('ethereum');
      expect(chains).toContain('polygon');
      expect(chains).toContain('solana');
      expect(chains.length).toBeGreaterThan(0);
    });

    it('should validate chain support correctly', () => {
      expect(service.isChainSupported('ethereum')).toBe(true);
      expect(service.isChainSupported('solana')).toBe(true);
      expect(service.isChainSupported('invalid-chain')).toBe(false);
    });

    it.skipIf(skipRealApiTests)(
      'should validate API configuration with real API call',
      async () => {
        const isValid = await service.validateConfiguration();
        expect(typeof isValid).toBe('boolean');
      }
    );

    it.skipIf(skipRealApiTests)('should handle API errors gracefully', async () => {
      // Try to get a non-existent wallet
      await expect(service.getWallet('non-existent-wallet-id')).rejects.toThrow();
    });
  });

  describe('CrossMintUniversalWalletService', () => {
    let service: CrossMintUniversalWalletService;
    let mockRuntime: any;

    beforeAll(() => {
      // Create a mock CrossMint service
      const mockCrossMintService = {
        listWallets: vi.fn().mockResolvedValue([
          {
            id: 'test-wallet-1',
            address: '0x1234567890123456789012345678901234567890',
            type: 'evm-mpc-wallet',
            linkedUser: 'test@example.com',
            createdAt: new Date().toISOString(),
          },
        ]),
        getSupportedChains: vi.fn().mockReturnValue(['ethereum', 'polygon', 'solana']),
        isChainSupported: vi
          .fn()
          .mockImplementation((chain: string) => ['ethereum', 'polygon', 'solana'].includes(chain)),
      };

      mockRuntime = createMockRuntime({
        getSetting: (key: string) => {
          const settings: Record<string, string> = {
            CROSSMINT_API_KEY: testApiKey,
            CROSSMINT_ENVIRONMENT: 'staging',
          };
          return settings[key];
        },
        getService: (name: string) => {
          if (name === 'real-crossmint') {
            return mockCrossMintService;
          }
          return null;
        },
      });

      service = new CrossMintUniversalWalletService(mockRuntime);
    });

    it('should initialize with correct properties', () => {
      expect(service).toBeDefined();
      expect(service.chainSupport).toBeDefined();
      expect(service.capabilities).toBeDefined();
      expect(service.capabilityDescription).toContain('CrossMint');
    });

    it('should support required chains', () => {
      expect(service.chainSupport).toContain('ethereum');
      expect(service.chainSupport).toContain('polygon');
      expect(service.chainSupport).toContain('solana');
    });

    it('should validate chain support correctly', () => {
      expect(service.isChainSupported('ethereum')).toBe(true);
      expect(service.isChainSupported('polygon')).toBe(true);
      expect(service.isChainSupported('solana')).toBe(true);
      expect(service.isChainSupported('invalid-chain')).toBe(false);
    });

    it('should get portfolio information', async () => {
      const portfolio = await service.getPortfolio();

      expect(portfolio).toBeDefined();
      expect(portfolio.totalValueUsd).toBeDefined();
      expect(portfolio.chains).toBeDefined();
      expect(portfolio.assets).toBeDefined();
      expect(portfolio.breakdown).toBeDefined();
      expect(Array.isArray(portfolio.assets)).toBe(true);
    });

    it('should get supported chains with complete information', async () => {
      const chains = await service.getSupportedChains();

      expect(Array.isArray(chains)).toBe(true);
      expect(chains.length).toBeGreaterThan(0);

      const ethereumChain = chains.find((c) => c.id === 'ethereum');
      expect(ethereumChain).toBeDefined();
      expect(ethereumChain?.name).toBe('Ethereum');
      expect(ethereumChain?.nativeToken.symbol).toBe('ETH');
      expect(ethereumChain?.rpcUrls).toBeDefined();
      expect(ethereumChain?.blockExplorerUrls).toBeDefined();
    });

    it('should estimate gas correctly for different chains', async () => {
      const ethEstimate = await service.estimateGas({
        to: '0x1234567890123456789012345678901234567890',
        value: '1000000000000000000',
        chain: 'ethereum',
      });

      expect(ethEstimate).toBeDefined();
      expect(ethEstimate.gasLimit).toBeDefined();
      expect(ethEstimate.estimatedTime).toBeDefined();
      expect(parseInt(ethEstimate.estimatedTime as any)).toBeGreaterThan(0);

      const solEstimate = await service.estimateGas({
        to: 'So11111111111111111111111111111111111111112',
        value: '1000000000',
        chain: 'solana',
      });

      expect(solEstimate).toBeDefined();
      expect(parseInt(solEstimate.gasLimit)).toBeLessThan(parseInt(ethEstimate.gasLimit));
    });

    it('should simulate transactions correctly', async () => {
      const simulation = await service.simulateTransaction({
        to: '0x1234567890123456789012345678901234567890',
        value: '1000000000000000000',
        chain: 'ethereum',
      });

      expect(simulation).toBeDefined();
      expect(simulation.success).toBe(true);
      expect(simulation.gasUsed).toBeDefined();
      expect(simulation.changes).toBeDefined();
      expect(Array.isArray(simulation.changes)).toBe(true);
    });

    it('should handle unsupported chains in simulation', async () => {
      const simulation = await service.simulateTransaction({
        to: '0x1234567890123456789012345678901234567890',
        value: '1000000000000000000',
        chain: 'unsupported-chain',
      });

      expect(simulation).toBeDefined();
      expect(simulation.success).toBe(false);
      expect(simulation.error).toContain('not supported');
    });

    it('should handle missing recipient in simulation', async () => {
      const simulation = await service.simulateTransaction({
        value: '1000000000000000000',
        chain: 'ethereum',
      });

      expect(simulation).toBeDefined();
      expect(simulation.success).toBe(false);
      expect(simulation.error).toContain('Missing recipient');
    });

    it('should throw error for unsupported operations', async () => {
      await expect(
        service.swap({
          fromToken: 'ETH',
          toToken: 'USDC',
          amount: '1',
          chain: 'ethereum',
        })
      ).rejects.toThrow('not yet implemented');

      await expect(
        service.bridge({
          fromChain: 'ethereum',
          toChain: 'polygon',
          amount: '1',
          token: 'USDC',
        })
      ).rejects.toThrow('not yet implemented');
    });
  });

  describe('Service Lifecycle', () => {
    it('should start CrossMintUniversalWalletService correctly', async () => {
      const mockRuntime = createMockRuntime({
        getSetting: () => testApiKey,
        getService: () => ({ listWallets: () => [] }),
      });

      const service = await CrossMintUniversalWalletService.start(mockRuntime);

      expect(service).toBeDefined();
      expect(service).toBeInstanceOf(CrossMintUniversalWalletService);

      await service.stop();
    });
  });
});
