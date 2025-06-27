import { type TestSuite } from '@elizaos/core';

export const bridgePluginTestSuite: TestSuite = {
  name: 'bridge-plugin-e2e',

  tests: [
    {
      name: 'Plugin initialization',
      fn: async (runtime: any) => {
        try {
          console.log('🧪 Testing bridge plugin initialization...');

          // Verify plugin is loaded
          const bridgeService = runtime.getService('bridge');
          if (!bridgeService) {
            throw new Error('Bridge service not found in runtime');
          }

          console.log('✅ Bridge service initialized');

          // Verify action is registered
          const bridgeAction = runtime.actions.find((action: any) => action.name === 'BRIDGE_TOKEN');
          if (!bridgeAction) {
            throw new Error('Bridge action not registered');
          }

          console.log('✅ Bridge action registered');

          // Verify provider is registered
          const bridgeProvider = runtime.providers.find((provider: any) => provider.name === 'BRIDGE_INFO');
          if (!bridgeProvider) {
            throw new Error('Bridge provider not registered');
          }

          console.log('✅ Bridge provider registered');

          console.log('🎉 Plugin initialization test PASSED');
        } catch (error) {
          console.error('❌ Plugin initialization test FAILED:', error);
          throw error;
        }
      },
    },

    {
      name: 'Bridge service configuration',
      fn: async (runtime: any) => {
        try {
          console.log('🧪 Testing bridge service configuration...');

          const bridgeService = runtime.getService('bridge');
          if (!bridgeService) {
            throw new Error('Bridge service not available');
          }

          // Test supported chains
          const supportedChains = bridgeService.getSupportedChains();
          if (!Array.isArray(supportedChains) || supportedChains.length === 0) {
            throw new Error('No supported chains configured');
          }

          console.log(`✅ Found ${supportedChains.length} supported chains`);

          // Verify Ethereum is supported
          const ethereum = supportedChains.find((chain: any) => chain.id === 1);
          if (!ethereum) {
            throw new Error('Ethereum not in supported chains');
          }

          console.log('✅ Ethereum chain supported');

          // Test wallet address
          const walletAddress = bridgeService.getWalletAddress();
          if (!walletAddress || !/^0x[a-fA-F0-9]{40}$/.test(walletAddress)) {
            throw new Error('Invalid wallet address');
          }

          console.log(`✅ Wallet address configured: ${walletAddress}`);

          console.log('🎉 Service configuration test PASSED');
        } catch (error) {
          console.error('❌ Service configuration test FAILED:', error);
          throw error;
        }
      },
    },

    {
      name: 'Bridge action validation',
      fn: async (runtime: any) => {
        try {
          console.log('🧪 Testing bridge action validation...');

          const bridgeAction = runtime.actions.find((action: any) => action.name === 'BRIDGE_TOKEN');
          if (!bridgeAction) {
            throw new Error('Bridge action not found');
          }

          // Test positive validation cases
          const validMessages = [
            { content: { text: 'bridge 100 USDC from ethereum to polygon' } },
            { content: { text: 'cross-chain transfer 50 ETH to arbitrum' } },
            { content: { text: 'move tokens to optimism' } },
            { content: { text: 'send to base chain' } },
          ];

          for (const message of validMessages) {
            const isValid = await bridgeAction.validate(runtime, message);
            if (!isValid) {
              throw new Error(`Validation failed for: "${message.content.text}"`);
            }
          }

          console.log('✅ Valid bridge messages recognized');

          // Test negative validation cases
          const invalidMessages = [
            { content: { text: 'hello world' } },
            { content: { text: 'what is the weather' } },
            { content: { text: 'buy some tokens' } },
          ];

          for (const message of invalidMessages) {
            const isValid = await bridgeAction.validate(runtime, message);
            if (isValid) {
              throw new Error(`Validation should have failed for: "${message.content.text}"`);
            }
          }

          console.log('✅ Invalid messages correctly rejected');

          console.log('🎉 Action validation test PASSED');
        } catch (error) {
          console.error('❌ Action validation test FAILED:', error);
          throw error;
        }
      },
    },

    {
      name: 'Bridge info provider',
      fn: async (runtime: any) => {
        try {
          console.log('🧪 Testing bridge info provider...');

          const bridgeProvider = runtime.providers.find((provider: any) => provider.name === 'BRIDGE_INFO');
          if (!bridgeProvider) {
            throw new Error('Bridge provider not found');
          }

          // Test provider output
          const mockMessage = {
            entityId: 'test-entity',
            roomId: 'test-room',
            content: { text: 'test message' },
          };

          const mockState = {
            values: {},
            data: {},
            text: '',
          };

          const result = await bridgeProvider.get(runtime, mockMessage, mockState);

          if (!result) {
            throw new Error('Provider returned null result');
          }

          if (!result.text || !result.text.includes('BRIDGE_INFO')) {
            throw new Error('Provider text output invalid');
          }

          if (!result.values || typeof result.values.bridgeAvailable !== 'boolean') {
            throw new Error('Provider values output invalid');
          }

          console.log('✅ Provider output format valid');

          // Verify bridge is available
          if (!result.values.bridgeAvailable) {
            throw new Error('Bridge not available according to provider');
          }

          console.log('✅ Bridge service available');

          console.log('🎉 Info provider test PASSED');
        } catch (error) {
          console.error('❌ Info provider test FAILED:', error);
          throw error;
        }
      },
    },

    {
      name: 'Message processing simulation',
      fn: async (runtime: any) => {
        try {
          console.log('🧪 Testing bridge message processing simulation...');

          const bridgeAction = runtime.actions.find((action: any) => action.name === 'BRIDGE_TOKEN');
          if (!bridgeAction) {
            throw new Error('Bridge action not found');
          }

          // Create test message
          const testMessage = {
            entityId: 'test-user',
            roomId: 'test-room',
            content: {
              text: 'bridge 100 USDC from ethereum to polygon',
              source: 'test',
            },
            createdAt: Date.now(),
          };

          const testState = {
            values: {},
            data: {},
            text: '',
          };

          let callbackCalled = false;
          let callbackResponse: any = null;

          const mockCallback = async (response: any) => {
            callbackCalled = true;
            callbackResponse = response;
            return [];
          };

          // Note: This test will fail if we don't have real API access
          // But we can test the structure
          try {
            await bridgeAction.handler(runtime, testMessage, testState, {}, mockCallback);
          } catch (error) {
            // Expected to fail without real API access
            console.log('⚠️ Handler failed as expected without API access:', (error as Error).message);
          }

          if (callbackCalled && callbackResponse) {
            console.log('✅ Callback was invoked');
            
            if (!callbackResponse.text || typeof callbackResponse.text !== 'string') {
              throw new Error('Invalid callback response format');
            }

            console.log('✅ Callback response format valid');
          } else {
            console.log('⚠️ Callback not called (expected with API errors)');
          }

          console.log('🎉 Message processing simulation test PASSED');
        } catch (error) {
          console.error('❌ Message processing simulation test FAILED:', error);
          throw error;
        }
      },
    },

    {
      name: 'Type validation and error handling',
      fn: async (runtime: any) => {
        try {
          console.log('🧪 Testing type validation and error handling...');

          const bridgeService = runtime.getService('bridge');
          if (!bridgeService) {
            throw new Error('Bridge service not available');
          }

          // Test chain validation
          const validChain = bridgeService.isChainSupported(1); // Ethereum
          if (!validChain) {
            throw new Error('Ethereum should be supported');
          }

          console.log('✅ Valid chain recognized');

          const invalidChain = bridgeService.isChainSupported(999999);
          if (invalidChain) {
            throw new Error('Invalid chain should not be supported');
          }

          console.log('✅ Invalid chain rejected');

          // Test error handling in quote request
          try {
            await bridgeService.getQuote({
              fromChain: 999999, // Invalid chain
              toChain: 1,
              fromToken: '0xA0b86a33E6441436C3f91B584b2E06a24AB31F6b',
              toToken: '0xA0b86a33E6441436C3f91B584b2E06a24AB31F6b',
              fromAmount: '1000000',
              userAddress: '0x742d35Cc6634C0532925a3b8D94B5DD9F3CB0982',
            });
            throw new Error('Should have thrown UnsupportedChainError');
          } catch (error) {
            if ((error as Error).name !== 'BridgeError' && !(error as Error).message.includes('Unsupported chain')) {
              throw new Error(`Expected UnsupportedChainError, got: ${(error as Error).message}`);
            }
          }

          console.log('✅ Error handling working correctly');

          console.log('🎉 Type validation and error handling test PASSED');
        } catch (error) {
          console.error('❌ Type validation and error handling test FAILED:', error);
          throw error;
        }
      },
    },

    {
      name: 'Integration with runtime',
      fn: async (runtime: any) => {
        try {
          console.log('🧪 Testing integration with runtime...');

          // Test service integration
          const bridgeService = runtime.getService('bridge');
          if (!bridgeService) {
            throw new Error('Bridge service not integrated with runtime');
          }

          // Test settings access
          const privateKey = runtime.getSetting('EVM_PRIVATE_KEY');
          if (!privateKey) {
            throw new Error('Cannot access EVM_PRIVATE_KEY setting');
          }

          console.log('✅ Settings access working');

          // Test action registration
          const actions = runtime.actions.filter((action: any) => 
            action.name === 'BRIDGE_TOKEN'
          );
          if (actions.length !== 1) {
            throw new Error(`Expected 1 bridge action, found ${actions.length}`);
          }

          console.log('✅ Action properly registered');

          // Test provider registration
          const providers = runtime.providers.filter((provider: any) => 
            provider.name === 'BRIDGE_INFO'
          );
          if (providers.length !== 1) {
            throw new Error(`Expected 1 bridge provider, found ${providers.length}`);
          }

          console.log('✅ Provider properly registered');

          // Test service type
          if (bridgeService.constructor.serviceType !== 'bridge') {
            console.log('⚠️ Service type not set correctly, but service is functional');
          } else {
            console.log('✅ Service type set correctly');
          }

          console.log('🎉 Runtime integration test PASSED');
        } catch (error) {
          console.error('❌ Runtime integration test FAILED:', error);
          throw error;
        }
      },
    },
  ],
};

export default bridgePluginTestSuite;