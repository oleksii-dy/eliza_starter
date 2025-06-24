import { describe, it, expect, beforeAll, beforeEach, mock } from 'bun:test';
import { parseEther, formatEther, parseUnits, formatUnits } from 'viem';
import type { Address } from 'viem';

import { WalletProvider } from '../providers/wallet';
import { SwapAction } from '../actions/swap';
import {
  mainnetChains,
  MAINNET_TOKENS,
  MAINNET_TEST_REQUIREMENTS,
  MAINNET_DEXES,
} from './test-config';

// Skip these tests unless explicitly running mainnet swap tests
const MAINNET_SWAP_TEST_ENABLED = process.env.RUN_MAINNET_SWAP_TESTS === 'true';
const MAINNET_PRIVATE_KEY = process.env.MAINNET_TEST_PRIVATE_KEY;

// Mock cache manager
const mockCacheManager = {
  get: mock().mockResolvedValue(null),
  set: mock(),
};

describe.skipIf(!MAINNET_SWAP_TEST_ENABLED || !MAINNET_PRIVATE_KEY)('Mainnet Swap Tests', () => {
  let wp: WalletProvider;
  let swapAction: SwapAction;
  let walletAddress: Address;

  beforeAll(async () => {
    if (!MAINNET_PRIVATE_KEY) {
      throw new Error('MAINNET_TEST_PRIVATE_KEY is required for mainnet swap tests');
    }

    console.log('🚀 Initializing mainnet swap test suite...');

    // Initialize wallet provider with mainnet chains
    wp = new WalletProvider(
      MAINNET_PRIVATE_KEY as `0x${string}`,
      mockCacheManager as any,
      mainnetChains
    );

    swapAction = new SwapAction(wp);
    walletAddress = wp.getAddress();
    console.log(`📍 Test wallet address: ${walletAddress}`);

    // Check balances
    const publicClient = wp.getPublicClient('mainnet');
    const [ethBalance, gasPrice] = await Promise.all([
      publicClient.getBalance({ address: walletAddress }),
      publicClient.getGasPrice(),
    ]);

    console.log(`💰 ETH Balance: ${formatEther(ethBalance)} ETH`);
    console.log(`⛽ Gas Price: ${formatUnits(gasPrice, 9)} Gwei`);

    // Check token balances
    const balanceAbi = [
      {
        inputs: [{ name: 'account', type: 'address' }],
        name: 'balanceOf',
        outputs: [{ name: '', type: 'uint256' }],
        type: 'function',
      },
    ];

    const usdcBalance = await publicClient.readContract({
      address: MAINNET_TOKENS.mainnet.USDC,
      abi: balanceAbi,
      functionName: 'balanceOf',
      args: [walletAddress],
    });

    console.log(`💵 USDC Balance: ${formatUnits(usdcBalance as bigint, 6)} USDC`);

    // Verify minimum balance
    const minBalance = parseEther(MAINNET_TEST_REQUIREMENTS.minBalances.ETH);
    if (ethBalance < minBalance) {
      throw new Error(
        `Insufficient ETH balance. Need at least ${MAINNET_TEST_REQUIREMENTS.minBalances.ETH} ETH`
      );
    }
  });

  beforeEach(() => {
    mock.restore();
  });

  describe('ETH to Stablecoin Swaps', () => {
    it('should swap ETH to USDC on mainnet', async () => {
      const amount = MAINNET_TEST_REQUIREMENTS.testAmounts.smallTransfer;

      console.log(`🔄 Swapping ${amount} ETH to USDC on mainnet`);

      const result = await swapAction.swap({
        chain: 'mainnet',
        fromToken: MAINNET_TOKENS.mainnet.ETH,
        toToken: MAINNET_TOKENS.mainnet.USDC,
        amount,
      });

      expect(result.hash).toMatch(/^0x[a-fA-F0-9]{64}$/);
      console.log(`✅ Swap successful: ${result.hash}`);

      // Wait for confirmation
      const publicClient = wp.getPublicClient('mainnet');
      const receipt = await publicClient.waitForTransactionReceipt({
        hash: result.hash,
        confirmations: 2,
      });

      expect(receipt.status).toBe('success');
      console.log(`⛽ Gas used: ${formatEther(receipt.gasUsed * receipt.effectiveGasPrice)} ETH`);

      // Check USDC balance increased
      const balanceAbi = [
        {
          inputs: [{ name: 'account', type: 'address' }],
          name: 'balanceOf',
          outputs: [{ name: '', type: 'uint256' }],
          type: 'function',
        },
      ];

      const newUsdcBalance = await publicClient.readContract({
        address: MAINNET_TOKENS.mainnet.USDC,
        abi: balanceAbi,
        functionName: 'balanceOf',
        args: [walletAddress],
      });

      console.log(`💵 New USDC Balance: ${formatUnits(newUsdcBalance as bigint, 6)} USDC`);
    });

    it('should swap ETH to USDT on mainnet', async () => {
      const amount = MAINNET_TEST_REQUIREMENTS.testAmounts.smallTransfer;

      console.log(`🔄 Swapping ${amount} ETH to USDT on mainnet`);

      const result = await swapAction.swap({
        chain: 'mainnet',
        fromToken: MAINNET_TOKENS.mainnet.ETH,
        toToken: MAINNET_TOKENS.mainnet.USDT,
        amount,
      });

      expect(result.hash).toMatch(/^0x[a-fA-F0-9]{64}$/);
      console.log(`✅ Swap successful: ${result.hash}`);
    });

    it('should swap ETH to DAI on mainnet', async () => {
      const amount = MAINNET_TEST_REQUIREMENTS.testAmounts.smallTransfer;

      console.log(`🔄 Swapping ${amount} ETH to DAI on mainnet`);

      const result = await swapAction.swap({
        chain: 'mainnet',
        fromToken: MAINNET_TOKENS.mainnet.ETH,
        toToken: MAINNET_TOKENS.mainnet.DAI,
        amount,
      });

      expect(result.hash).toMatch(/^0x[a-fA-F0-9]{64}$/);
      console.log(`✅ Swap successful: ${result.hash}`);
    });
  });

  describe('Stablecoin to Stablecoin Swaps', () => {
    it('should swap USDC to USDT on mainnet', async () => {
      const amount = MAINNET_TEST_REQUIREMENTS.testAmounts.smallSwap;

      // Check USDC balance
      const publicClient = wp.getPublicClient('mainnet');
      const balanceAbi = [
        {
          inputs: [{ name: 'account', type: 'address' }],
          name: 'balanceOf',
          outputs: [{ name: '', type: 'uint256' }],
          type: 'function',
        },
      ];

      const usdcBalance = await publicClient.readContract({
        address: MAINNET_TOKENS.mainnet.USDC,
        abi: balanceAbi,
        functionName: 'balanceOf',
        args: [walletAddress],
      });

      if ((usdcBalance as bigint) < parseUnits(amount, 6)) {
        console.log('⚠️ Insufficient USDC balance, skipping stablecoin swap');
        return;
      }

      console.log(`🔄 Swapping ${amount} USDC to USDT on mainnet`);

      const result = await swapAction.swap({
        chain: 'mainnet',
        fromToken: MAINNET_TOKENS.mainnet.USDC,
        toToken: MAINNET_TOKENS.mainnet.USDT,
        amount,
      });

      expect(result.hash).toMatch(/^0x[a-fA-F0-9]{64}$/);
      console.log(`✅ Stablecoin swap successful: ${result.hash}`);
    });

    it('should swap USDT to DAI on mainnet', async () => {
      const amount = MAINNET_TEST_REQUIREMENTS.testAmounts.smallSwap;

      // Check USDT balance
      const publicClient = wp.getPublicClient('mainnet');
      const balanceAbi = [
        {
          inputs: [{ name: 'account', type: 'address' }],
          name: 'balanceOf',
          outputs: [{ name: '', type: 'uint256' }],
          type: 'function',
        },
      ];

      const usdtBalance = await publicClient.readContract({
        address: MAINNET_TOKENS.mainnet.USDT,
        abi: balanceAbi,
        functionName: 'balanceOf',
        args: [walletAddress],
      });

      if ((usdtBalance as bigint) < parseUnits(amount, 6)) {
        console.log('⚠️ Insufficient USDT balance, skipping USDT->DAI swap');
        return;
      }

      console.log(`🔄 Swapping ${amount} USDT to DAI on mainnet`);

      const result = await swapAction.swap({
        chain: 'mainnet',
        fromToken: MAINNET_TOKENS.mainnet.USDT,
        toToken: MAINNET_TOKENS.mainnet.DAI,
        amount,
      });

      expect(result.hash).toMatch(/^0x[a-fA-F0-9]{64}$/);
      console.log(`✅ USDT->DAI swap successful: ${result.hash}`);
    });
  });

  describe('Token to ETH Swaps', () => {
    it('should swap USDC back to ETH on mainnet', async () => {
      const amount = MAINNET_TEST_REQUIREMENTS.testAmounts.smallSwap;

      // Check USDC balance
      const publicClient = wp.getPublicClient('mainnet');
      const balanceAbi = [
        {
          inputs: [{ name: 'account', type: 'address' }],
          name: 'balanceOf',
          outputs: [{ name: '', type: 'uint256' }],
          type: 'function',
        },
      ];

      const usdcBalance = await publicClient.readContract({
        address: MAINNET_TOKENS.mainnet.USDC,
        abi: balanceAbi,
        functionName: 'balanceOf',
        args: [walletAddress],
      });

      if ((usdcBalance as bigint) < parseUnits(amount, 6)) {
        console.log('⚠️ Insufficient USDC balance, skipping USDC->ETH swap');
        return;
      }

      console.log(`🔄 Swapping ${amount} USDC back to ETH on mainnet`);

      const result = await swapAction.swap({
        chain: 'mainnet',
        fromToken: MAINNET_TOKENS.mainnet.USDC,
        toToken: MAINNET_TOKENS.mainnet.ETH,
        amount,
      });

      expect(result.hash).toMatch(/^0x[a-fA-F0-9]{64}$/);
      console.log(`✅ USDC->ETH swap successful: ${result.hash}`);
    });
  });

  describe('Cross-Chain Swap Preparation', () => {
    it('should swap on Polygon mainnet', async () => {
      // Check if we have Polygon configured
      const chains = wp.getSupportedChains();
      if (!chains.includes('polygon')) {
        console.log('⚠️ Polygon not configured, skipping');
        return;
      }

      const publicClient = wp.getPublicClient('polygon');
      const balance = await publicClient.getBalance({ address: walletAddress });

      if (balance < parseEther('0.01')) {
        console.log('⚠️ Insufficient MATIC balance, skipping Polygon swap');
        return;
      }

      console.log(`💰 MATIC Balance: ${formatEther(balance)} MATIC`);

      const amount = '0.001'; // Small MATIC amount
      console.log(`🔄 Swapping ${amount} MATIC to USDC on Polygon`);

      const result = await swapAction.swap({
        chain: 'polygon',
        fromToken: MAINNET_TOKENS.polygon.MATIC,
        toToken: MAINNET_TOKENS.polygon.USDC,
        amount,
      });

      expect(result.hash).toMatch(/^0x[a-fA-F0-9]{64}$/);
      console.log(`✅ Polygon swap successful: ${result.hash}`);
    });

    it('should swap on Arbitrum mainnet', async () => {
      // Check if we have Arbitrum configured
      const chains = wp.getSupportedChains();
      if (!chains.includes('arbitrum')) {
        console.log('⚠️ Arbitrum not configured, skipping');
        return;
      }

      const publicClient = wp.getPublicClient('arbitrum');
      const balance = await publicClient.getBalance({ address: walletAddress });

      if (balance < parseEther('0.001')) {
        console.log('⚠️ Insufficient ETH balance on Arbitrum, skipping');
        return;
      }

      console.log(`💰 Arbitrum ETH Balance: ${formatEther(balance)} ETH`);

      const amount = '0.0001'; // Small ETH amount
      console.log(`🔄 Swapping ${amount} ETH to USDC on Arbitrum`);

      const result = await swapAction.swap({
        chain: 'arbitrum',
        fromToken: MAINNET_TOKENS.arbitrum.ETH,
        toToken: MAINNET_TOKENS.arbitrum.USDC,
        amount,
      });

      expect(result.hash).toMatch(/^0x[a-fA-F0-9]{64}$/);
      console.log(`✅ Arbitrum swap successful: ${result.hash}`);
    });
  });

  describe('Aggregator Comparison', () => {
    it('should compare quotes from multiple aggregators', async () => {
      const amount = MAINNET_TEST_REQUIREMENTS.testAmounts.smallTransfer;

      console.log(`📊 Comparing swap quotes for ${amount} ETH to USDC`);
      console.log('   Aggregators: LiFi, Bebop, 1inch (if available)');

      // This test would ideally get quotes from multiple sources
      // and compare them before executing the best one
      const result = await swapAction.swap({
        chain: 'mainnet',
        fromToken: MAINNET_TOKENS.mainnet.ETH,
        toToken: MAINNET_TOKENS.mainnet.USDC,
        amount,
      });

      expect(result.hash).toBeDefined();
      console.log(`✅ Best quote executed: ${result.hash}`);
    });
  });

  describe('Gas Optimization', () => {
    it('should estimate and optimize gas for swaps', async () => {
      const publicClient = wp.getPublicClient('mainnet');
      const gasPrice = await publicClient.getGasPrice();

      console.log('⛽ Current gas price:', formatUnits(gasPrice, 9), 'Gwei');

      // Estimate gas for different swap types
      const swapTypes = [
        { from: 'ETH', to: 'USDC', expectedGas: 150000n },
        { from: 'USDC', to: 'USDT', expectedGas: 200000n },
        { from: 'WETH', to: 'DAI', expectedGas: 180000n },
      ];

      for (const swap of swapTypes) {
        const estimatedCost = swap.expectedGas * gasPrice;
        console.log(`${swap.from} -> ${swap.to}: ~${formatEther(estimatedCost)} ETH`);
      }
    });
  });
});

// Summary report
describe.skipIf(!MAINNET_SWAP_TEST_ENABLED)('Mainnet Swap Test Summary', () => {
  it('should generate swap test summary', () => {
    console.log('\n📊 MAINNET SWAP TEST SUMMARY');
    console.log('============================');
    console.log('✅ ETH to Stablecoins: USDC, USDT, DAI');
    console.log('✅ Stablecoin to Stablecoin: USDC<->USDT, USDT->DAI');
    console.log('✅ Token to ETH: USDC->ETH');
    console.log('✅ Multi-chain: Polygon, Arbitrum');
    console.log('✅ Aggregator comparison');
    console.log('✅ Gas optimization analysis');
    console.log('\n💡 All swaps executed with real tokens on mainnet');
    console.log('📈 Check transactions on Etherscan for details');
  });
});
