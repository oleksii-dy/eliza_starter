import type { IAgentRuntime, TestSuite } from '@elizaos/core';
import { ServiceType } from '@elizaos/core';
import { strict as assert } from 'node:assert';

// Service Discovery and Generic Testing
// This replaces vendor-specific testing with generic service type testing

export const serviceDiscoveryTestSuite: TestSuite = {
  name: 'Service Discovery and Generic Interface Tests',
  tests: [
    {
      name: 'Discover All Available Services',
      fn: async (runtime: IAgentRuntime) => {
        console.log('Discovering all available services...');

        // Standard service types that should be testable
        const standardServiceTypes = [
          ServiceType.WALLET,
          ServiceType.TOKEN_DATA,
          'lp', // ILpService.serviceType
          'swap',
          'token-creation',
          'message',
          'post',
        ];

        const discoveredServices = new Map<string, any>();

        for (const serviceType of standardServiceTypes) {
          const service = runtime.getService(serviceType);
          if (service) {
            discoveredServices.set(serviceType, service);
            console.log(`✓ Found service: ${serviceType}`);

            // Log basic service info
            if ('serviceName' in service) {
              console.log(`  Name: ${(service as any).serviceName}`);
            }
            if ('capabilityDescription' in service) {
              console.log(`  Description: ${service.capabilityDescription}`);
            }
          } else {
            console.log(`⚠️  No service found for type: ${serviceType}`);
          }
        }

        console.log(
          `\nDiscovered ${discoveredServices.size} services out of ${standardServiceTypes.length} standard types`
        );

        // Test that we found at least the dummy services
        assert(
          discoveredServices.size >= 3,
          'Should discover at least 3 services (wallet, token-data, lp)'
        );
      },
    },

    {
      name: 'Test Wallet Service Interface (Any Implementation)',
      fn: async (runtime: IAgentRuntime) => {
        console.log('Testing wallet service interface...');

        const walletService = runtime.getService(ServiceType.WALLET);
        if (!walletService) {
          console.log('⚠️  No wallet service available, skipping wallet tests');
          return;
        }

        const serviceName = (walletService as any).constructor.name;
        console.log(`Testing wallet service implementation: ${serviceName}`);

        // Test portfolio functionality
        try {
          const portfolio = await (walletService as any).getPortfolio();
          assert(portfolio, 'Portfolio should be returned');
          assert(typeof portfolio.totalValueUsd === 'number', 'Total value should be numeric');
          assert(Array.isArray(portfolio.assets), 'Assets should be an array');

          console.log(`✓ Portfolio retrieved: $${portfolio.totalValueUsd} total value`);
          console.log(`✓ Assets count: ${portfolio.assets.length}`);

          // Test balance functionality
          const testBalances = ['USDC', 'SOL', 'ETH'];
          for (const token of testBalances) {
            const balance = await (walletService as any).getBalance(token);
            assert(typeof balance === 'number', `Balance for ${token} should be numeric`);
            console.log(`  ${token} balance: ${balance}`);
          }
        } catch (error) {
          console.error('Wallet service test failed:', error);
          throw error;
        }
      },
    },

    {
      name: 'Test Token Data Service Interface (Any Implementation)',
      fn: async (runtime: IAgentRuntime) => {
        console.log('Testing token data service interface...');

        const tokenDataService = runtime.getService(ServiceType.TOKEN_DATA);
        if (!tokenDataService) {
          console.log('⚠️  No token data service available, skipping token data tests');
          return;
        }

        const serviceName = (tokenDataService as any).constructor.name;
        console.log(`Testing token data service implementation: ${serviceName}`);

        try {
          // Test token details
          const solAddress = 'So11111111111111111111111111111111111111112';
          const tokenData = await (tokenDataService as any).getTokenDetails(solAddress, 'solana');

          if (tokenData) {
            assert(tokenData.symbol, 'Token should have symbol');
            assert(tokenData.name, 'Token should have name');
            console.log(`✓ Token details: ${tokenData.symbol} - ${tokenData.name}`);
          }

          // Test trending tokens
          const trending = await (tokenDataService as any).getTrendingTokens('solana', 3);
          assert(Array.isArray(trending), 'Trending tokens should be array');
          console.log(`✓ Trending tokens: ${trending.length} returned`);

          // Test search
          const searchResults = await (tokenDataService as any).searchTokens('SOL');
          assert(Array.isArray(searchResults), 'Search results should be array');
          console.log(`✓ Search results: ${searchResults.length} tokens found`);
        } catch (error) {
          console.error('Token data service test failed:', error);
          throw error;
        }
      },
    },

    {
      name: 'Test LP Service Interface (Any Implementation)',
      fn: async (runtime: IAgentRuntime) => {
        console.log('Testing LP service interface...');

        const lpService = runtime.getService('lp');
        if (!lpService) {
          console.log('⚠️  No LP service available, skipping LP tests');
          return;
        }

        const serviceName = (lpService as any).constructor.name;
        console.log(`Testing LP service implementation: ${serviceName}`);

        try {
          // Test DEX name
          const dexName = (lpService as any).getDexName();
          assert(typeof dexName === 'string', 'DEX name should be string');
          console.log(`✓ DEX name: ${dexName}`);

          // Test pools
          const pools = await (lpService as any).getPools();
          assert(Array.isArray(pools), 'Pools should be array');
          console.log(`✓ Pools available: ${pools.length}`);

          if (pools.length > 0) {
            const pool = pools[0];
            console.log(`  Sample pool: ${pool.id} (${pool.tokenA.symbol}/${pool.tokenB.symbol})`);
          }

          // Test market data
          if (pools.length > 0) {
            const poolIds = pools.slice(0, 2).map((p) => p.id);
            const marketData = await (lpService as any).getMarketDataForPools(poolIds);
            assert(typeof marketData === 'object', 'Market data should be object');
            console.log(`✓ Market data retrieved for ${Object.keys(marketData).length} pools`);
          }
        } catch (error) {
          console.error('LP service test failed:', error);
          throw error;
        }
      },
    },

    {
      name: 'Test Swap Service Interface (Any Implementation)',
      fn: async (runtime: IAgentRuntime) => {
        console.log('Testing swap service interface...');

        const swapService = runtime.getService('swap');
        if (!swapService) {
          console.log('⚠️  No swap service available, skipping swap tests');
          return;
        }

        const serviceName = (swapService as any).constructor.name;
        console.log(`Testing swap service implementation: ${serviceName}`);

        try {
          // Test quote functionality
          if (typeof (swapService as any).getQuote === 'function') {
            const quoteParams = {
              inputMint: 'SOL',
              outputMint: 'USDC',
              amount: 1000000000, // 1 SOL
            };

            const quote = await (swapService as any).getQuote(quoteParams);
            assert(quote, 'Quote should be returned');
            console.log(`✓ Quote retrieved: ${quote.inAmount} -> ${quote.outAmount}`);
          }

          // Test supported tokens
          if (typeof (swapService as any).getSupportedTokens === 'function') {
            const tokens = await (swapService as any).getSupportedTokens();
            if (tokens) {
              assert(Array.isArray(tokens), 'Supported tokens should be array');
              console.log(`✓ Supported tokens: ${tokens.length}`);
            }
          }
        } catch (error) {
          console.error('Swap service test failed:', error);
          throw error;
        }
      },
    },

    {
      name: 'Test Token Creation Service Interface (Any Implementation)',
      fn: async (runtime: IAgentRuntime) => {
        console.log('Testing token creation service interface...');

        const tokenCreationService = runtime.getService('token-creation');
        if (!tokenCreationService) {
          console.log('⚠️  No token creation service available, skipping token creation tests');
          return;
        }

        const serviceName = (tokenCreationService as any).constructor.name;
        console.log(`Testing token creation service implementation: ${serviceName}`);

        try {
          // Test readiness
          if (typeof (tokenCreationService as any).isReady === 'function') {
            const isReady = await (tokenCreationService as any).isReady();
            console.log(`✓ Service ready status: ${isReady}`);
          }

          // Test deployer address
          if (typeof (tokenCreationService as any).getDeployerAddress === 'function') {
            const deployerAddress = await (tokenCreationService as any).getDeployerAddress();
            if (deployerAddress) {
              console.log(`✓ Deployer address: ${deployerAddress}`);
            }
          }

          // Note: We don't test actual token creation to avoid creating real tokens
          console.log('⚠️  Skipping actual token creation (simulation only)');
        } catch (error) {
          console.error('Token creation service test failed:', error);
          throw error;
        }
      },
    },

    {
      name: 'Test Messaging Service Interface (Any Implementation)',
      fn: async (runtime: IAgentRuntime) => {
        console.log('Testing messaging service interface...');

        const messageService = runtime.getService('message');
        if (!messageService) {
          console.log('⚠️  No message service available, skipping messaging tests');
          return;
        }

        const serviceName = (messageService as any).constructor.name;
        console.log(`Testing message service implementation: ${serviceName}`);

        try {
          // Test channels/rooms
          if (typeof (messageService as any).getChannels === 'function') {
            const channels = await (messageService as any).getChannels();
            assert(Array.isArray(channels), 'Channels should be array');
            console.log(`✓ Channels available: ${channels.length}`);
          }

          // Test send message capability exists
          assert(
            typeof (messageService as any).sendMessage === 'function',
            'sendMessage method should exist'
          );
          console.log('✓ sendMessage method available');

          // Note: We don't test actual message sending to avoid spamming
          console.log('⚠️  Skipping actual message sending (simulation only)');
        } catch (error) {
          console.error('Message service test failed:', error);
          throw error;
        }
      },
    },

    {
      name: 'Test Post Service Interface (Any Implementation)',
      fn: async (runtime: IAgentRuntime) => {
        console.log('Testing post service interface...');

        const postService = runtime.getService('post');
        if (!postService) {
          console.log('⚠️  No post service available, skipping post tests');
          return;
        }

        const serviceName = (postService as any).constructor.name;
        console.log(`Testing post service implementation: ${serviceName}`);

        try {
          // Test post functionality exists
          assert(typeof (postService as any).post === 'function', 'post method should exist');
          console.log('✓ post method available');

          // Test timeline functionality
          if (typeof (postService as any).getTimeline === 'function') {
            const timeline = await (postService as any).getTimeline(5);
            assert(Array.isArray(timeline), 'Timeline should be array');
            console.log(`✓ Timeline retrieved: ${timeline.length} posts`);
          }

          // Note: We don't test actual posting to avoid spam
          console.log('⚠️  Skipping actual posting (simulation only)');
        } catch (error) {
          console.error('Post service test failed:', error);
          throw error;
        }
      },
    },

    {
      name: 'Service Integration and Cross-Communication Test',
      fn: async (runtime: IAgentRuntime) => {
        console.log('Testing service integration...');

        const services = {
          wallet: runtime.getService(ServiceType.WALLET),
          tokenData: runtime.getService(ServiceType.TOKEN_DATA),
          lp: runtime.getService('lp'),
          swap: runtime.getService('swap'),
        };

        const availableServices = Object.entries(services)
          .filter(([_, service]) => service !== undefined)
          .map(([name, _]) => name);

        console.log(`Available services for integration test: ${availableServices.join(', ')}`);

        if (availableServices.length < 2) {
          console.log('⚠️  Need at least 2 services for integration test');
          return;
        }

        // Test that services can work together
        try {
          if (services.wallet && services.tokenData) {
            // Get token info and check wallet balance
            const tokenData = await (services.tokenData as any).getTokenDetails(
              'So11111111111111111111111111111111111111112',
              'solana'
            );

            if (tokenData) {
              const balance = await (services.wallet as any).getBalance(tokenData.symbol);
              console.log(`✓ Integration test: ${tokenData.symbol} balance = ${balance}`);
            }
          }

          if (services.wallet && services.lp) {
            // Get pools and check if wallet has assets for liquidity
            const pools = await (services.lp as any).getPools();
            if (pools.length > 0) {
              const pool = pools[0];
              const balanceA = await (services.wallet as any).getBalance(pool.tokenA.symbol);
              console.log(
                `✓ Integration test: Pool ${pool.id} - ${pool.tokenA.symbol} balance = ${balanceA}`
              );
            }
          }

          console.log('✓ Service integration tests completed successfully');
        } catch (error) {
          console.error('Service integration test failed:', error);
          throw error;
        }
      },
    },
  ],
};

export default serviceDiscoveryTestSuite;
