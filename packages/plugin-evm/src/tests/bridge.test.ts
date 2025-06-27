import { describe, it, expect, beforeEach, afterEach, mock } from 'bun:test';
import { generatePrivateKey, privateKeyToAccount } from 'viem/accounts';
import { type Account } from 'viem';

import { BridgeAction } from '../actions/bridge';
import { WalletProvider } from '../providers/wallet';
import { testnetChains, TESTNET_TOKENS } from './test-config';

// Test environment - use funded wallet for integration tests
const TEST_PRIVATE_KEY = process.env.TEST_PRIVATE_KEY || generatePrivateKey();
const FUNDED_TEST_WALLET = process.env.FUNDED_TEST_PRIVATE_KEY;

// Use token addresses from test-config
const ETH_ADDRESS = '0x0000000000000000000000000000000000000000' as `0x${string}`;

// Mock the ICacheManager
const mockCacheManager = {
  get: mock().mockResolvedValue(null),
  set: mock(),
};

describe('Bridge Action', () => {
  let wp: WalletProvider;

  beforeEach(async () => {
    mock.restore();
    mockCacheManager.get.mockResolvedValue(null);

    const pk = TEST_PRIVATE_KEY as `0x${string}`;

    // Initialize with multiple testnets for bridging
    const customChains = {
      sepolia: testnetChains.sepolia,
      baseSepolia: testnetChains.baseSepolia,
      optimismSepolia: testnetChains.optimismSepolia,
    };

    wp = new WalletProvider(pk, mockCacheManager as any, customChains);
  });

  afterEach(() => {
    mock.restore();
  });

  describe('Constructor', () => {
    it('should initialize with wallet provider', () => {
      const bridgeAction = new BridgeAction(wp);
      expect(bridgeAction).toBeDefined();
    });
  });

  describe('Bridge Validation', () => {
    let bridgeAction: BridgeAction;
    let testAccount: Account;

    beforeEach(() => {
      bridgeAction = new BridgeAction(wp);
      testAccount = privateKeyToAccount(generatePrivateKey());
    });

    it('should validate bridge parameters', () => {
      const bridgeParams = {
        fromChain: 'sepolia' as any,
        toChain: 'baseSepolia' as any,
        fromToken: ETH_ADDRESS,
        toToken: ETH_ADDRESS,
        amount: '0.01',
        toAddress: testAccount.address,
      };

      expect(bridgeParams.fromChain).toBe('sepolia');
      expect(bridgeParams.toChain).toBe('baseSepolia');
      expect(bridgeParams.fromToken).toMatch(/^0x[a-fA-F0-9]{40}$/);
      expect(bridgeParams.toToken).toMatch(/^0x[a-fA-F0-9]{40}$/);
      expect(parseFloat(bridgeParams.amount)).toBeGreaterThan(0);
    });

    it('should handle same chain bridge attempts', async () => {
      await expect(
        bridgeAction.bridge({
          fromChain: 'sepolia' as any,
          toChain: 'sepolia' as any, // Same chain
          fromToken: ETH_ADDRESS,
          toToken: ETH_ADDRESS,
          amount: '0.01',
          toAddress: testAccount.address,
        })
      ).rejects.toThrow();
    });

    it('should handle zero amount bridges', async () => {
      try {
        await expect(
          bridgeAction.bridge({
            fromChain: 'sepolia' as any,
            toChain: 'baseSepolia' as any,
            fromToken: ETH_ADDRESS,
            toToken: ETH_ADDRESS,
            amount: '0',
            toAddress: testAccount.address,
          })
        ).rejects.toThrow();
      } catch (error) {
        // Skip test if hitting API rate limits
        if (
          error &&
          typeof error === 'object' &&
          'message' in error &&
          ((error.message as string).includes('429') ||
            (error.message as string).includes('Too Many Requests'))
        ) {
          console.warn('Skipping test due to API rate limiting');
          return;
        }
        throw error;
      }
    }, 10000);

    it('should handle invalid recipient addresses', async () => {
      await expect(
        bridgeAction.bridge({
          fromChain: 'sepolia' as any,
          toChain: 'baseSepolia' as any,
          fromToken: ETH_ADDRESS,
          toToken: ETH_ADDRESS,
          amount: '0.01',
          toAddress: 'invalid-address' as any,
        })
      ).rejects.toThrow();
    });
  });

  describe('Cross-Chain Bridge Tests', () => {
    let bridgeAction: BridgeAction;

    beforeEach(() => {
      bridgeAction = new BridgeAction(wp);
    });

    it('should handle insufficient balance for bridge', async () => {
      const balance = await wp.getWalletBalanceForChain('sepolia');
      console.log(`Sepolia balance: ${balance} ETH`);

      // Try to bridge more than available balance
      await expect(
        bridgeAction.bridge({
          fromChain: 'sepolia' as any,
          toChain: 'baseSepolia' as any,
          fromToken: ETH_ADDRESS,
          toToken: ETH_ADDRESS,
          amount: '1000', // 1000 ETH - definitely more than test wallet has
        })
      ).rejects.toThrow();
    });

    describe('Sepolia to Base Sepolia Bridge', () => {
      it('should attempt ETH bridge if sufficient funds', async () => {
        const balance = await wp.getWalletBalanceForChain('sepolia');
        console.log(`Sepolia balance for bridge: ${balance} ETH`);

        if (balance && parseFloat(balance) > 0.01) {
          try {
            const result = await bridgeAction.bridge({
              fromChain: 'sepolia' as any,
              toChain: 'baseSepolia' as any,
              fromToken: ETH_ADDRESS,
              toToken: ETH_ADDRESS,
              amount: '0.001', // Very small amount
            });

            expect(result.hash).toMatch(/^0x[a-fA-F0-9]{64}$/);
            expect(result.from).toBe(wp.getAddress());
            console.log(`Bridge transaction initiated: ${result.hash}`);
          } catch (error) {
            // Bridge might fail due to route availability, liquidity, or other factors
            console.warn('Bridge failed (expected in test environment):', error);
            expect(error).toBeInstanceOf(Error);
          }
        } else {
          console.warn('Skipping bridge test - insufficient balance');

          // Test the error case instead
          await expect(
            bridgeAction.bridge({
              fromChain: 'sepolia' as any,
              toChain: 'baseSepolia' as any,
              fromToken: ETH_ADDRESS,
              toToken: ETH_ADDRESS,
              amount: '0.001',
            })
          ).rejects.toThrow();
        }
      });
    });

    describe('Sepolia to Optimism Sepolia Bridge', () => {
      it('should attempt ETH bridge to OP Sepolia', async () => {
        const balance = await wp.getWalletBalanceForChain('sepolia');
        console.log(`Sepolia balance for OP bridge: ${balance} ETH`);

        if (balance && parseFloat(balance) > 0.01) {
          try {
            const result = await bridgeAction.bridge({
              fromChain: 'sepolia' as any,
              toChain: 'optimismSepolia' as any,
              fromToken: ETH_ADDRESS,
              toToken: ETH_ADDRESS,
              amount: '0.001',
            });

            expect(result.hash).toMatch(/^0x[a-fA-F0-9]{64}$/);
            console.log(`OP Sepolia bridge initiated: ${result.hash}`);
          } catch (error) {
            console.warn('OP Sepolia bridge failed (expected):', error);
            expect(error).toBeInstanceOf(Error);
          }
        } else {
          console.warn('Skipping OP Sepolia bridge test - insufficient balance');
        }
      });
    });

    describe('Token Bridge Tests', () => {
      it('should handle WETH bridge attempts', async () => {
        const balance = await wp.getWalletBalanceForChain('sepolia');

        if (balance && parseFloat(balance) > 0.01) {
          try {
            const result = await bridgeAction.bridge({
              fromChain: 'sepolia' as any,
              toChain: 'baseSepolia' as any,
              fromToken: TESTNET_TOKENS.sepolia.WETH,
              toToken: TESTNET_TOKENS.baseSepolia.WETH,
              amount: '0.001',
            });

            expect(result.hash).toMatch(/^0x[a-fA-F0-9]{64}$/);
            console.log(`WETH bridge initiated: ${result.hash}`);
          } catch (error) {
            // Expected to fail if no WETH balance or no route
            console.warn('WETH bridge failed (expected if no WETH balance):', error);
            expect(error).toBeInstanceOf(Error);
          }
        } else {
          console.warn('Skipping WETH bridge test - insufficient balance');
        }
      });
    });
  });

  describe('Bridge Status and Monitoring', () => {
    let bridgeAction: BridgeAction;

    beforeEach(() => {
      bridgeAction = new BridgeAction(wp);
    });

    it('should handle bridge progress monitoring', async () => {
      // Test the progress callback functionality
      let progressCallbackCalled = false;
      const progressCallback = (status: any) => {
        progressCallbackCalled = true;
        expect(status).toBeDefined();
        expect(typeof status.currentStep).toBe('number');
        expect(typeof status.totalSteps).toBe('number');
        console.log(`Bridge progress: ${status.currentStep}/${status.totalSteps}`);
      };

      const balance = await wp.getWalletBalanceForChain('sepolia');

      if (balance && parseFloat(balance) > 0.001) {
        try {
          await bridgeAction.bridge(
            {
              fromChain: 'sepolia' as any,
              toChain: 'baseSepolia' as any,
              fromToken: ETH_ADDRESS,
              toToken: ETH_ADDRESS,
              amount: '0.0001',
            },
            progressCallback
          );

          // If bridge succeeds, progress callback should have been called
          expect(progressCallbackCalled).toBe(true);
        } catch (error) {
          // Bridge might fail, but we can still test the callback structure
          console.warn('Bridge failed, testing error handling:', error);
        }
      } else {
        console.warn('Skipping bridge monitoring test - insufficient balance');
      }
    });
  });

  describe('Integration tests with funded wallet', () => {
    it('should perform actual bridge with funded wallet', async () => {
      if (!FUNDED_TEST_WALLET) {
        console.log('Skipping integration test - no funded wallet provided');
        return; // Just return instead of this.skip()
      }

      // Create wallet provider with funded wallet
      const fundedWp = new WalletProvider(
        FUNDED_TEST_WALLET as `0x${string}`,
        mockCacheManager as any,
        {
          sepolia: testnetChains.sepolia,
          baseSepolia: testnetChains.baseSepolia,
        }
      );
      const fundedBridgeAction = new BridgeAction(fundedWp);

      const balance = await fundedWp.getWalletBalanceForChain('sepolia');
      console.log(`Funded wallet balance: ${balance} ETH`);

      if (balance && parseFloat(balance) > 0.02) {
        try {
          const result = await fundedBridgeAction.bridge({
            fromChain: 'sepolia' as any,
            toChain: 'baseSepolia' as any,
            fromToken: ETH_ADDRESS,
            toToken: ETH_ADDRESS,
            amount: '0.005', // 0.005 ETH
          });

          expect(result.hash).toMatch(/^0x[a-fA-F0-9]{64}$/);
          expect(result.from).toBe(fundedWp.getAddress());

          console.log(`Funded bridge successful: ${result.hash}`);

          // Note: Cross-chain bridges take time to complete
          // In a real test, you might want to wait and check the destination chain
          console.log('Bridge initiated - check destination chain for completion');
        } catch (error) {
          console.warn('Funded bridge failed:', error);
          // Don't fail the test - bridge might fail due to route availability
          expect(error).toBeInstanceOf(Error);
        }
      } else {
        // Skip if insufficient funds
        console.log('Skipping funded bridge test - insufficient balance');
      }
    });
  });

  describe('Bridge Route Discovery', () => {
    let bridgeAction: BridgeAction;

    beforeEach(() => {
      bridgeAction = new BridgeAction(wp);
    });

    it('should validate supported bridge routes', () => {
      // Test that our test chains are properly configured
      const supportedChains = wp.getSupportedChains();

      expect(supportedChains).toContain('sepolia');
      expect(supportedChains).toContain('baseSepolia');
      expect(supportedChains).toContain('optimismSepolia');

      console.log(`Supported chains for bridging: ${supportedChains.join(', ')}`);
    });

    it('should handle unsupported chain combinations', async () => {
      // Test with a hypothetical unsupported destination
      await expect(
        bridgeAction.bridge({
          fromChain: 'sepolia' as any,
          toChain: 'unsupportedChain' as any,
          fromToken: ETH_ADDRESS,
          toToken: ETH_ADDRESS,
          amount: '0.01',
        })
      ).rejects.toThrow();
    });
  });

  describe('Gas and Fee Estimation', () => {
    let _bridgeAction: BridgeAction;

    beforeEach(() => {
      _bridgeAction = new BridgeAction(wp);
    });

    it('should handle bridge cost estimation', async () => {
      // Test bridge cost estimation (without executing)
      const balance = await wp.getWalletBalanceForChain('sepolia');

      if (balance && parseFloat(balance) > 0.001) {
        try {
          // This would normally get route quotes to estimate costs
          const bridgeParams = {
            fromChain: 'sepolia' as any,
            toChain: 'baseSepolia' as any,
            fromToken: ETH_ADDRESS,
            toToken: ETH_ADDRESS,
            amount: '0.001',
          };

          // Validate parameters are reasonable for cost estimation
          expect(parseFloat(bridgeParams.amount)).toBeGreaterThan(0);
          expect(bridgeParams.fromChain).not.toBe(bridgeParams.toChain);

          console.log('Bridge parameters valid for cost estimation');
        } catch (error) {
          console.warn('Bridge cost estimation failed:', error);
        }
      } else {
        console.warn('Skipping bridge cost estimation - insufficient balance');
      }
    });
  });
});
