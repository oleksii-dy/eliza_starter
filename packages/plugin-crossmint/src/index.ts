import {
  type Plugin,
  type IAgentRuntime,
  logger,
} from '@elizaos/core';

// Services
import { RealCrossMintService } from './services/RealCrossMintService';
import { CrossMintUniversalWalletService } from './services/CrossMintUniversalWalletService';

// Actions
import {
  createX402PaymentAction,
  transferAction,
  createWalletAction,
  mintNFTAction,
  checkPaymentStatusAction,
} from './actions';

// Providers
import {
  crossmintWalletProvider,
  crossmintPortfolioProvider,
  crossmintPaymentsProvider,
} from './providers';

// Types
export * from './types/crossmint';

/**
 * CrossMint Plugin for ElizaOS
 *
 * Provides enterprise blockchain infrastructure with:
 * - MPC (Multi-Party Computation) wallets
 * - X.402 payment protocol support
 * - Cross-chain transfers and operations
 * - NFT minting and management
 * - Enterprise-grade security and compliance
 */
export const crossmintPlugin: Plugin = {
  name: '@elizaos/plugin-crossmint',
  description: 'Enterprise blockchain platform with MPC wallets, X.402 payments, and cross-chain infrastructure',

  // Plugin configuration
  config: {
    CROSSMINT_API_KEY: {
      description: 'CrossMint API Key',
      required: true,
      type: 'string',
    },
    CROSSMINT_PROJECT_ID: {
      description: 'CrossMint Project ID',
      required: true,
      type: 'string',
    },
    CROSSMINT_ENVIRONMENT: {
      description: 'CrossMint Environment (sandbox or production)',
      required: false,
      default: 'sandbox',
      type: 'string',
    },
    CROSSMINT_BASE_URL: {
      description: 'Custom CrossMint API Base URL',
      required: false,
      type: 'string',
    },
    CROSSMINT_WEBHOOK_SECRET: {
      description: 'CrossMint Webhook Secret for verification',
      required: false,
      type: 'string',
    },
    CROSSMINT_RETRY_ATTEMPTS: {
      description: 'Number of retry attempts for API calls',
      required: false,
      default: '3',
      type: 'string',
    },
    CROSSMINT_RETRY_DELAY: {
      description: 'Delay between retry attempts in milliseconds',
      required: false,
      default: '1000',
      type: 'string',
    },
    CROSSMINT_TIMEOUT: {
      description: 'API request timeout in milliseconds',
      required: false,
      default: '30000',
      type: 'string',
    },
    CROSSMINT_ENABLE_WEBHOOKS: {
      description: 'Enable webhook handling',
      required: false,
      default: 'false',
      type: 'string',
    },
    CROSSMINT_WEBHOOK_ENDPOINT: {
      description: 'Webhook endpoint URL',
      required: false,
      type: 'string',
    },
  },

  // Services
  services: [RealCrossMintService, CrossMintUniversalWalletService],

  // Actions
  actions: [
    createX402PaymentAction,
    transferAction,
    createWalletAction,
    mintNFTAction,
    checkPaymentStatusAction,
  ],

  // Providers
  providers: [
    crossmintWalletProvider,
    crossmintPortfolioProvider,
    crossmintPaymentsProvider,
  ],

  // Plugin initialization
  async init(config: Record<string, string>, runtime: IAgentRuntime) {
    logger.info('Initializing CrossMint plugin...');

    // Validate required configuration
    const requiredSettings = ['CROSSMINT_API_KEY', 'CROSSMINT_PROJECT_ID'];
    const missingSettings = requiredSettings.filter(
      setting => !runtime.getSetting(setting)
    );

    if (missingSettings.length > 0) {
      logger.warn(
        `CrossMint plugin missing required settings: ${missingSettings.join(', ')}. ` +
        'The plugin will be available but may not function correctly until these are configured.'
      );
      return;
    }

    const environment = runtime.getSetting('CROSSMINT_ENVIRONMENT') || 'sandbox';
    logger.info(`CrossMint plugin initialized in ${environment} mode`);

    // Log available capabilities
    logger.info('CrossMint capabilities:');
    logger.info('  - MPC (Multi-Party Computation) wallets');
    logger.info('  - X.402 payment protocol support');
    logger.info('  - Cross-chain transfers (Ethereum, Polygon, Arbitrum, Optimism, Base, BSC, Solana)');
    logger.info('  - NFT minting and management');
    logger.info('  - Enterprise blockchain infrastructure');
    logger.info('  - Real-time payment verification');
    logger.info('  - Webhook integration support');

    logger.info('CrossMint plugin initialization complete');
  },
};

// Export plugin as default
export default crossmintPlugin;
