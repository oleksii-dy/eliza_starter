import {
  type IAgentRuntime,
  type Plugin,
  elizaLogger,
} from '@elizaos/core';

// Service exports
export { BridgeService } from './services/BridgeService.js';

// Action exports  
export { bridgeAction } from './actions/bridge.js';

// Provider exports
export { bridgeInfoProvider } from './providers/bridge-info.js';

// Type exports
export * from './types/index.js';

// Utility exports
export * from './utils/formatters.js';
export * from './utils/validation.js';

// Import components for plugin
import { BridgeService } from './services/BridgeService.js';
import { bridgeAction } from './actions/bridge.js';
import { bridgeInfoProvider } from './providers/bridge-info.js';
import { bridgePluginTestSuite } from './__tests__/e2e/bridge-tests.js';

export const bridgePlugin: Plugin = {
  name: 'bridge',
  description: 'Cross-chain bridge aggregation plugin supporting multiple protocols including LiFi, Wormhole, Hop, and Synapse for seamless token transfers across EVM chains',
  
  actions: [bridgeAction],
  providers: [bridgeInfoProvider],
  services: [BridgeService],
  tests: [bridgePluginTestSuite],
  
  init: async (config: Record<string, string>, runtime: IAgentRuntime): Promise<void> => {
    elizaLogger.info('🌉 Initializing Bridge Plugin...');

    // Validate required configuration
    const privateKey = runtime.getSetting('EVM_PRIVATE_KEY');
    if (!privateKey) {
      elizaLogger.error('❌ EVM_PRIVATE_KEY is required for bridge plugin');
      throw new Error('Bridge plugin requires EVM_PRIVATE_KEY configuration');
    }

    const supportedChains = runtime.getSetting('EVM_CHAINS') || 'mainnet,arbitrum,polygon,base,optimism';
    const providerUrl = runtime.getSetting('EVM_PROVIDER_URL') || 'https://eth.llamarpc.com';

    elizaLogger.info('✅ Bridge plugin configuration validated');
    elizaLogger.info(`📊 Supported chains: ${supportedChains}`);
    elizaLogger.info(`🔗 Provider URL: ${providerUrl}`);

    // Register action
    runtime.registerAction(bridgeAction);
    elizaLogger.info('✅ Bridge action registered');

    // Register provider
    runtime.registerProvider(bridgeInfoProvider);
    elizaLogger.info('✅ Bridge info provider registered');

    elizaLogger.info('🎉 Bridge Plugin initialized successfully');
  },
};

export default bridgePlugin;