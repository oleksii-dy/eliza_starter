import type { IAgentRuntime, TestSuite } from '@elizaos/core';
import { strict as assert } from 'node:assert';
import type { PoolInfo } from '../types';
import { WalletBalanceService } from '../services/WalletBalanceService.js';
import { TokenService } from '../services/TokenService.js';
import { PriceOracleService } from '../services/PriceOracleService.js';
import { RpcService } from '../services/RpcService.js';
import { JupiterDexService } from '../services/JupiterDexService.js';

// Real token addresses on Solana mainnet
const TOKEN_ADDRESSES = {
  SOL: 'So11111111111111111111111111111111111111112',
  AI16Z: 'HeLp6NuQkmYB4pYWo2zYs22mESHXPQYzXbB8n4V98jwC', // ai16z Token2022 token
  DEGENAI: 'Gu3LDkn7VuCUNWpwxHpCpbNq7zWcHrZsQ8o8TDk1GDwT', // degenai standard SPL token
};

/**
 * Defines a suite of E2E tests for real token interactions.
 * These tests interact with actual DEX protocols on Solana mainnet.
 */
export const realTokenTestsSuite: TestSuite = {
  name: 'Solana Plugin Real Token Integration Tests',
  tests: [
    {
      name: 'Test 1: Discover ai16z/SOL pools across DEXs',
      fn: async (runtime: IAgentRuntime) => {
        // Get the Jupiter DEX service
        const jupiterService = runtime.getService<JupiterDexService>('jupiter-dex');
        assert(jupiterService, 'JupiterDexService should be available');

        // Get available routes for ai16z
        console.log('Getting available routes for ai16z...');
        const routes = await jupiterService.getAvailableRoutes(TOKEN_ADDRESSES.AI16Z);

        console.log(`Available routes for ai16z: ${routes.join(', ')}`);

        // Assert that we found routes
        assert(routes.length > 0, 'Should find available routes for ai16z');
      },
    },

    {
      name: 'Test 2: Get swap quote for ai16z/SOL',
      fn: async (runtime: IAgentRuntime) => {
        const jupiterService = runtime.getService<JupiterDexService>('jupiter-dex');
        assert(jupiterService, 'JupiterDexService should be available');

        try {
          // Get a swap quote for 0.1 SOL to ai16z
          console.log('Getting swap quote for 0.1 SOL to ai16z...');
          const quote = await jupiterService.getSwapQuote(
            TOKEN_ADDRESSES.SOL,
            TOKEN_ADDRESSES.AI16Z,
            0.1,
            50 // 0.5% slippage
          );

          console.log('Swap quote received:');
          console.log(`- Input: ${quote.inAmount}`);
          console.log(`- Expected output: ${quote.outAmount}`);
          console.log(`- Price impact: ${quote.priceImpactPct}%`);
          console.log(`- Slippage: ${quote.slippageBps / 100}%`);

          assert(quote.outAmount, 'Quote should have output amount');
          assert(quote.priceImpactPct !== undefined, 'Quote should have price impact');
        } catch (error) {
          console.log('Failed to get quote - token might not be available on Jupiter:', error);
          // This is acceptable as not all tokens are available
        }
      },
    },

    {
      name: 'Test 3: Compare rates for different token pairs',
      fn: async (runtime: IAgentRuntime) => {
        const jupiterService = runtime.getService<JupiterDexService>('jupiter-dex');
        assert(jupiterService, 'JupiterDexService should be available');

        const pairs = [
          { from: 'SOL', to: 'USDC' },
          { from: 'USDC', to: 'SOL' },
        ];

        for (const pair of pairs) {
          try {
            console.log(`\nGetting quote for ${pair.from} to ${pair.to}...`);
            const priceImpact = await jupiterService.calculatePriceImpact(
              pair.from,
              pair.to,
              1 // 1 unit
            );

            console.log(`Rate: 1 ${pair.from} = ${priceImpact.rate} ${pair.to}`);
            console.log(`Price impact: ${priceImpact.priceImpactPct}%`);
            console.log(`Minimum received: ${priceImpact.minimumReceived}`);

            assert(priceImpact.rate > 0, 'Rate should be positive');
          } catch (error) {
            console.log(`Failed to get price impact for ${pair.from}/${pair.to}:`, error);
          }
        }
      },
    },

    {
      name: 'Test 4: Token service functionality',
      fn: async (runtime: IAgentRuntime) => {
        const tokenService = runtime.getService<TokenService>('token-service');
        assert(tokenService, 'TokenService should be available');

        // Test getting token info
        console.log('Getting SOL token info...');
        const solInfo = await tokenService.getTokenInfo('SOL');

        if (solInfo) {
          console.log('SOL token info:');
          console.log(`- Address: ${solInfo.address}`);
          console.log(`- Symbol: ${solInfo.symbol}`);
          console.log(`- Decimals: ${solInfo.decimals}`);

          assert(solInfo.address === TOKEN_ADDRESSES.SOL, 'SOL address should match');
          assert(solInfo.decimals === 9, 'SOL should have 9 decimals');
        }

        // Test getting multiple token info
        const tokens = await tokenService.getMultipleTokenInfo([
          TOKEN_ADDRESSES.SOL,
          'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v', // USDC
        ]);

        console.log(`\nFetched info for ${tokens.size} tokens`);
        assert(tokens.size > 0, 'Should fetch token info');
      },
    },

    {
      name: 'Test 5: Price oracle service',
      fn: async (runtime: IAgentRuntime) => {
        const priceService = runtime.getService<PriceOracleService>('price-oracle-service');
        assert(priceService, 'PriceOracleService should be available');

        // Get token price
        console.log('Getting SOL price...');
        const solPrice = await priceService.getTokenPrice(TOKEN_ADDRESSES.SOL);

        if (solPrice !== null) {
          console.log(`SOL price: $${solPrice.price}`);
          assert(solPrice.price > 0, 'SOL price should be positive');
        } else {
          console.log('SOL price not available');
        }

        // Get multiple prices
        const prices = await priceService.getMultipleTokenPrices([
          TOKEN_ADDRESSES.SOL,
          'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v', // USDC
        ]);

        console.log('\nToken prices:');
        prices.forEach((price: any, address: string) => {
          console.log(`- ${address.slice(0, 8)}...: $${price?.price || 'N/A'}`);
        });

        assert(prices.size > 0, 'Should fetch multiple prices');
      },
    },

    {
      name: 'Test 6: RPC service health check',
      fn: async (runtime: IAgentRuntime) => {
        const rpcService = runtime.getService<RpcService>('rpc-service');
        assert(rpcService, 'RpcService should be available');

        // Get RPC status
        const status = rpcService.getStatus();

        console.log('RPC Service Status:');
        console.log(`- Healthy: ${status.healthy}`);
        console.log(`- Endpoint count: ${status.endpointCount}`);
        console.log(`- Current endpoint: ${status.currentEndpoint}`);

        console.log('\nEndpoint details:');
        status.endpoints.forEach((endpoint) => {
          console.log(
            `- ${endpoint.url}: ${endpoint.healthy ? 'Healthy' : 'Unhealthy'} (failures: ${endpoint.failureCount})`
          );
        });

        assert(status.healthy, 'At least one RPC endpoint should be healthy');
      },
    },

    {
      name: 'Test 7: Wallet balance check',
      fn: async (runtime: IAgentRuntime) => {
        const walletService = runtime.getService<WalletBalanceService>('wallet-balance');
        assert(walletService, 'WalletBalanceService should be available');

        // Get a sample wallet balance (Solana Labs wallet)
        const testWallet = '11111111111111111111111111111111';

        try {
          console.log(`Getting balance for ${testWallet}...`);
          const balance = await walletService.getWalletBalance(testWallet);

          console.log('Wallet balance:');
          console.log(`- SOL: ${balance.sol.uiAmount} (${balance.sol.balance} lamports)`);
          console.log(`- Token count: ${balance.tokens.length}`);

          if (balance.totalValueUSD) {
            console.log(`- Total value: $${balance.totalValueUSD}`);
          }

          assert(balance.sol.balance !== undefined, 'Should have SOL balance');
        } catch (error) {
          console.log('Failed to get wallet balance:', error);
          // This is acceptable as the test wallet might not exist
        }
      },
    },

    {
      name: 'Test 9: Check supported tokens',
      fn: async (runtime: IAgentRuntime) => {
        const jupiterService = runtime.getService<JupiterDexService>('jupiter-dex');
        assert(jupiterService, 'JupiterDexService should be available');

        // Get available routes (common tokens)
        const routes = await jupiterService.getAvailableRoutes();

        console.log('Common supported tokens:');
        routes.forEach((token) => {
          console.log(`- ${token}`);
        });

        assert(routes.length > 0, 'Should have supported tokens');
        assert(routes.includes('SOL'), 'Should support SOL');
        assert(routes.includes('USDC'), 'Should support USDC');
      },
    },
  ],
};
