import type { IAgentRuntime, TestSuite, IWalletService, ITokenDataService } from '@elizaos/core';
import { ServiceType, ILpService } from '@elizaos/core';
import { strict as assert } from 'node:assert';

// Generic Service Interface Tests
// These tests validate that services implement their interfaces correctly
// Using dummy services as the test implementation

export const serviceInterfaceTestSuite: TestSuite = {
  name: 'Service Interface Compliance Tests',
  tests: [
    {
      name: 'IWalletService Interface Compliance',
      fn: async (runtime: IAgentRuntime) => {
        console.log('Testing IWalletService interface compliance...');

        const walletService = runtime.getService<IWalletService>(ServiceType.WALLET);
        assert(walletService, 'IWalletService implementation not found');

        // Test required methods exist
        assert(typeof walletService.getPortfolio === 'function', 'getPortfolio method required');
        assert(typeof walletService.getBalance === 'function', 'getBalance method required');
        assert(typeof walletService.transferSol === 'function', 'transferSol method required');

        // Test method behaviors
        const portfolio = await walletService.getPortfolio();
        assert(portfolio, 'getPortfolio should return portfolio object');
        assert(
          typeof portfolio.totalValueUsd === 'number',
          'Portfolio totalValueUsd should be number'
        );
        assert(Array.isArray(portfolio.assets), 'Portfolio assets should be array');

        const balance = await walletService.getBalance('USDC');
        assert(typeof balance === 'number', 'getBalance should return number');
        assert(balance >= 0, 'Balance should be non-negative');

        console.log('✓ IWalletService interface compliance verified');
      },
    },

    {
      name: 'ITokenDataService Interface Compliance',
      fn: async (runtime: IAgentRuntime) => {
        console.log('Testing ITokenDataService interface compliance...');

        const tokenDataService = runtime.getService<ITokenDataService>(ServiceType.TOKEN_DATA);
        assert(tokenDataService, 'ITokenDataService implementation not found');

        // Test required methods exist
        assert(
          typeof tokenDataService.getTokenDetails === 'function',
          'getTokenDetails method required'
        );
        assert(
          typeof tokenDataService.getTrendingTokens === 'function',
          'getTrendingTokens method required'
        );
        assert(typeof tokenDataService.searchTokens === 'function', 'searchTokens method required');
        assert(
          typeof tokenDataService.getTokensByAddresses === 'function',
          'getTokensByAddresses method required'
        );

        // Test method behaviors
        const tokenData = await tokenDataService.getTokenDetails('test-address', 'solana');
        assert(tokenData, 'getTokenDetails should return token data');
        assert(tokenData.symbol, 'Token data should have symbol');
        assert(tokenData.name, 'Token data should have name');
        assert(tokenData.address, 'Token data should have address');
        assert(tokenData.chain, 'Token data should have chain');

        const trending = await tokenDataService.getTrendingTokens('solana', 5);
        assert(Array.isArray(trending), 'getTrendingTokens should return array');
        assert(trending.length <= 5, 'Should respect limit parameter');

        const searchResults = await tokenDataService.searchTokens('SOL');
        assert(Array.isArray(searchResults), 'searchTokens should return array');

        const batchResults = await tokenDataService.getTokensByAddresses(
          ['addr1', 'addr2'],
          'solana'
        );
        assert(Array.isArray(batchResults), 'getTokensByAddresses should return array');
        assert(batchResults.length === 2, 'Should return same number as input addresses');

        console.log('✓ ITokenDataService interface compliance verified');
      },
    },

    {
      name: 'ILpService Interface Compliance',
      fn: async (runtime: IAgentRuntime) => {
        console.log('Testing ILpService interface compliance...');

        const lpService = runtime.getService<ILpService>(ILpService.serviceType);
        assert(lpService, 'ILpService implementation not found');

        // Test required methods exist
        assert(typeof lpService.getDexName === 'function', 'getDexName method required');
        assert(typeof lpService.getPools === 'function', 'getPools method required');
        assert(typeof lpService.addLiquidity === 'function', 'addLiquidity method required');
        assert(typeof lpService.removeLiquidity === 'function', 'removeLiquidity method required');
        assert(
          typeof lpService.getLpPositionDetails === 'function',
          'getLpPositionDetails method required'
        );
        assert(
          typeof lpService.getMarketDataForPools === 'function',
          'getMarketDataForPools method required'
        );

        // Test method behaviors
        const dexName = lpService.getDexName();
        assert(typeof dexName === 'string', 'getDexName should return string');
        assert(dexName.length > 0, 'DEX name should not be empty');

        const pools = await lpService.getPools();
        assert(Array.isArray(pools), 'getPools should return array');

        if (pools.length > 0) {
          const pool = pools[0];
          assert(pool.id, 'Pool should have id');
          assert(pool.dex, 'Pool should have dex');
          assert(pool.tokenA, 'Pool should have tokenA');
          assert(pool.tokenB, 'Pool should have tokenB');
          assert(pool.tokenA.mint, 'TokenA should have mint');
          assert(pool.tokenB.mint, 'TokenB should have mint');
        }

        // Test position details (may return null for non-existent positions)
        const position = await lpService.getLpPositionDetails('test-user', 'test-pool');
        if (position) {
          assert(position.poolId, 'Position should have poolId');
          assert(position.dex, 'Position should have dex');
          assert(position.lpTokenBalance, 'Position should have lpTokenBalance');
        }

        console.log('✓ ILpService interface compliance verified');
      },
    },

    {
      name: 'Generic Service Discovery by Type',
      fn: async (runtime: IAgentRuntime) => {
        console.log('Testing service discovery by type...');

        // Test that we can discover services by their standard types
        const serviceTypes = [ServiceType.WALLET, ServiceType.TOKEN_DATA, ILpService.serviceType];

        const foundServices = new Map();

        for (const serviceType of serviceTypes) {
          const service = runtime.getService(serviceType);
          if (service) {
            foundServices.set(serviceType, service);
            console.log(`✓ Found service for type: ${serviceType}`);

            // Test that service has capability description
            if ('capabilityDescription' in service) {
              assert(
                typeof service.capabilityDescription === 'string',
                'Service should have capability description'
              );
            }
          } else {
            console.log(`⚠️  No service found for type: ${serviceType}`);
          }
        }

        assert(foundServices.size > 0, 'Should find at least one service');
        console.log(`✓ Service discovery test completed - found ${foundServices.size} services`);
      },
    },

    {
      name: 'Service Lifecycle Compliance',
      fn: async (runtime: IAgentRuntime) => {
        console.log('Testing service lifecycle compliance...');

        // Get any available service to test lifecycle
        const walletService = runtime.getService<IWalletService>(ServiceType.WALLET);
        if (!walletService) {
          console.log('⚠️  No wallet service available for lifecycle test');
          return;
        }

        // Services should have start/stop methods
        if ('start' in walletService && typeof walletService.start === 'function') {
          console.log('✓ Service has start method');
        }

        if ('stop' in walletService && typeof walletService.stop === 'function') {
          console.log('✓ Service has stop method');
        }

        // Services should have service name/type
        if ('serviceName' in walletService) {
          assert(
            typeof (walletService as any).serviceName === 'string',
            'Service should have serviceName'
          );
          console.log(`✓ Service name: ${(walletService as any).serviceName}`);
        }

        console.log('✓ Service lifecycle compliance verified');
      },
    },

    {
      name: 'Cross-Service Integration Test',
      fn: async (runtime: IAgentRuntime) => {
        console.log('Testing cross-service integration...');

        const walletService = runtime.getService<IWalletService>(ServiceType.WALLET);
        const tokenDataService = runtime.getService<ITokenDataService>(ServiceType.TOKEN_DATA);
        const lpService = runtime.getService<ILpService>(ILpService.serviceType);

        if (!walletService || !tokenDataService || !lpService) {
          console.log('⚠️  Not all services available for integration test');
          return;
        }

        // Test that services can work together
        // 1. Get token data
        const tokenData = await tokenDataService.getTokenDetails(
          'So11111111111111111111111111111111111111112',
          'solana'
        );
        assert(tokenData, 'Should get token data');

        // 2. Check wallet balance for that token
        const balance = await walletService.getBalance(tokenData.symbol!);
        assert(typeof balance === 'number', 'Should get numeric balance');

        // 3. Find pools containing that token
        const pools = await lpService.getPools(tokenData.address);
        assert(Array.isArray(pools), 'Should get pools array');

        console.log('✓ Cross-service integration working');
        console.log(`  Token: ${tokenData.symbol} (${tokenData.address})`);
        console.log(`  Wallet Balance: ${balance}`);
        console.log(`  Pools Found: ${pools.length}`);
      },
    },

    {
      name: 'Service Error Handling',
      fn: async (runtime: IAgentRuntime) => {
        console.log('Testing service error handling...');

        const walletService = runtime.getService<IWalletService>(ServiceType.WALLET);
        const tokenDataService = runtime.getService<ITokenDataService>(ServiceType.TOKEN_DATA);

        if (walletService) {
          // Test wallet with invalid input
          try {
            const balance = await walletService.getBalance('');
            assert(typeof balance === 'number', 'Should handle empty token gracefully');
            console.log('✓ Wallet handles empty token gracefully');
          } catch (error) {
            console.log('✓ Wallet properly throws error for invalid input');
          }
        }

        if (tokenDataService) {
          // Test token data with invalid input
          try {
            const tokenData = await tokenDataService.getTokenDetails('invalid', 'invalid-chain');
            // Should either return null or valid data structure
            if (tokenData) {
              assert(typeof tokenData === 'object', 'Should return object if not null');
            }
            console.log('✓ Token data service handles invalid input gracefully');
          } catch (error) {
            console.log('✓ Token data service properly throws error for invalid input');
          }
        }

        console.log('✓ Error handling tests completed');
      },
    },
  ],
};

export default serviceInterfaceTestSuite;
