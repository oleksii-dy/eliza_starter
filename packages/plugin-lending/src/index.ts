import {
  type Plugin,
  elizaLogger
} from '@elizaos/core';

// Core services
import { LendingService } from './services/LendingService.js';

// Actions
import { lendingAction } from './actions/lending.js';

// Providers
import { lendingInfoProvider } from './providers/lending-info.js';

// Test suites
import lendingTestSuite from './__tests__/e2e/lending-tests.js';

// Types (for external use)
export * from './types/index.js';

// Export service for external access
export { LendingService } from './services/LendingService.js';

// Export utilities
export * from './utils/formatters.js';
export * from './utils/validation.js';

/**
 * DeFi Lending Plugin for ElizaOS
 * 
 * Provides comprehensive DeFi lending and borrowing capabilities across multiple protocols:
 * - Aave (Primary) - Multi-chain support with optimized rates
 * - Compound - Classic DeFi lending protocol
 * - Morpho - Optimized lending with improved capital efficiency
 * - Spark - MakerDAO's native lending protocol
 * - Euler - Risk-adjusted lending with advanced features
 * 
 * Features:
 * - Supply/deposit assets to earn yield
 * - Withdraw supplied assets with health factor checks
 * - Borrow assets against collateral
 * - Repay borrowed assets to maintain health
 * - Cross-chain operations (Ethereum, Polygon, Arbitrum, Optimism, Base)
 * - Natural language processing for lending commands
 * - Comprehensive health factor and risk management
 * - Real-time market data and user position tracking
 * 
 * Supported Operations:
 * - "Supply 100 USDC to Aave" - Deposit assets for yield
 * - "Borrow 50 DAI variable rate" - Borrow against collateral
 * - "Withdraw 0.5 ETH from lending" - Withdraw supplied assets
 * - "Repay all USDT debt" - Repay borrowed amounts
 * 
 * Configuration:
 * - EVM_PRIVATE_KEY: Ethereum private key for wallet operations
 * - AAVE_ENABLED: Enable/disable Aave protocol (default: true)
 * - COMPOUND_ENABLED: Enable/disable Compound protocol (default: true)
 * - MORPHO_ENABLED: Enable/disable Morpho protocol (default: false)
 * - SPARK_ENABLED: Enable/disable Spark protocol (default: false)
 * - EULER_ENABLED: Enable/disable Euler protocol (default: false)
 */
export const lendingPlugin: Plugin = {
  name: 'plugin-lending',
  description: 'DeFi lending and borrowing operations across multiple protocols (Aave, Compound, Morpho, Spark, Euler)',
  
  // Initialize the plugin with configuration validation
  init: async (config: Record<string, string>, runtime) => {
    elizaLogger.info('🏦 Initializing DeFi Lending Plugin...');

    // Validate required configuration
    const privateKey = runtime.getSetting('EVM_PRIVATE_KEY') || config.EVM_PRIVATE_KEY;
    if (!privateKey || !privateKey.startsWith('0x')) {
      elizaLogger.warn('⚠️ EVM_PRIVATE_KEY not configured or invalid format. Lending operations will be limited.');
    } else {
      elizaLogger.info('✅ EVM wallet configured for lending operations');
    }

    // Log protocol configurations
    const protocolConfigs = [
      { name: 'Aave', key: 'AAVE_ENABLED', default: true },
      { name: 'Compound', key: 'COMPOUND_ENABLED', default: true },
      { name: 'Morpho', key: 'MORPHO_ENABLED', default: false },
      { name: 'Spark', key: 'SPARK_ENABLED', default: false },
      { name: 'Euler', key: 'EULER_ENABLED', default: false }
    ];

    const enabledProtocols: string[] = [];
    protocolConfigs.forEach(protocol => {
      const isEnabled = runtime.getSetting(protocol.key) !== 'false' && 
                       (runtime.getSetting(protocol.key) === 'true' || protocol.default);
      if (isEnabled) {
        enabledProtocols.push(protocol.name);
      }
    });

    elizaLogger.info(`🔧 Enabled lending protocols: ${enabledProtocols.join(', ')}`);
    elizaLogger.info('🌐 Supported chains: Ethereum, Polygon, Arbitrum, Optimism, Base');
    elizaLogger.info('💰 Operations: Supply, Withdraw, Borrow, Repay');
    elizaLogger.info('🛡️ Features: Health factor monitoring, risk management, multi-protocol support');
    elizaLogger.info('✅ DeFi Lending Plugin initialized successfully');
  },

  // Services provide long-running functionality
  services: [LendingService],

  // Actions define what the agent can do
  actions: [lendingAction],

  // Providers supply context information
  providers: [lendingInfoProvider],

  // Test suites for comprehensive validation
  tests: [lendingTestSuite],

  // Plugin configuration schema
  config: {
    EVM_PRIVATE_KEY: {
      type: 'string',
      description: 'Ethereum private key for wallet operations (required)',
      required: true,
      secret: true
    },
    AAVE_ENABLED: {
      type: 'boolean',
      description: 'Enable Aave protocol support',
      default: true
    },
    COMPOUND_ENABLED: {
      type: 'boolean', 
      description: 'Enable Compound protocol support',
      default: true
    },
    MORPHO_ENABLED: {
      type: 'boolean',
      description: 'Enable Morpho protocol support',
      default: false
    },
    SPARK_ENABLED: {
      type: 'boolean',
      description: 'Enable Spark protocol support', 
      default: false
    },
    EULER_ENABLED: {
      type: 'boolean',
      description: 'Enable Euler protocol support',
      default: false
    }
  }
};

// Default export for easy importing
export default lendingPlugin;