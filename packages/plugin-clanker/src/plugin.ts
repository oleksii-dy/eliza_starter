import type { Plugin } from '@elizaos/core';
import { logger } from '@elizaos/core';
import { z } from 'zod';
import { ClankerConfigSchema } from './types';

// Import services
import { ClankerService, WalletService } from './services';

// Import actions
import {
  tokenDeployAction,
  tokenInfoAction,
  liquidityManagementAction,
  tokenSwapAction,
  balanceCheckAction,
} from './actions';

// Import providers
import { tokenContextProvider, marketDataProvider } from './providers';

// Import evaluators
import { tradeSuccessEvaluator } from './evaluators';

export const clankerPlugin: Plugin = {
  name: 'plugin-clanker',
  description: 'Clanker protocol integration for token deployment and trading on Base L2',
  
  config: {
    CLANKER_API_KEY: process.env.CLANKER_API_KEY,
    BASE_RPC_URL: process.env.BASE_RPC_URL,
    WALLET_PRIVATE_KEY: process.env.WALLET_PRIVATE_KEY,
    CLANKER_API_URL: process.env.CLANKER_API_URL,
    DEFAULT_SLIPPAGE: process.env.DEFAULT_SLIPPAGE ? parseFloat(process.env.DEFAULT_SLIPPAGE) : undefined,
    MAX_GAS_PRICE: process.env.MAX_GAS_PRICE,
    RETRY_ATTEMPTS: process.env.RETRY_ATTEMPTS ? parseInt(process.env.RETRY_ATTEMPTS) : undefined,
    NETWORK: process.env.CLANKER_NETWORK as 'base' | 'base-sepolia' | undefined,
  },

  async init(config: Record<string, any>) {
    logger.info('Initializing Clanker plugin...');
    
    try {
      // Validate configuration
      const validatedConfig = await ClankerConfigSchema.parseAsync(config);
      
      // Set configuration in runtime
      // Note: In a real implementation, you'd store this in the runtime
      // For now, we'll validate and ensure required values are present
      
      if (!validatedConfig.BASE_RPC_URL) {
        throw new Error('BASE_RPC_URL is required for Clanker plugin');
      }
      
      if (!validatedConfig.WALLET_PRIVATE_KEY) {
        throw new Error('WALLET_PRIVATE_KEY is required for Clanker plugin');
      }
      
      // Store config for services to access
      (global as any).__clankerConfig = validatedConfig;
      
      logger.info('Clanker plugin initialized successfully');
      logger.info(`Network: ${validatedConfig.NETWORK}`);
      logger.info(`RPC URL: ${validatedConfig.BASE_RPC_URL}`);
      logger.info(`Default slippage: ${validatedConfig.DEFAULT_SLIPPAGE * 100}%`);
    } catch (error) {
      if (error instanceof z.ZodError) {
        const errors = error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join(', ');
        throw new Error(`Invalid Clanker plugin configuration: ${errors}`);
      }
      throw error;
    }
  },

  // Services that manage state and external integrations
  services: [ClankerService, WalletService],

  // Actions that handle user commands
  actions: [
    tokenDeployAction,
    tokenInfoAction,
    liquidityManagementAction,
    tokenSwapAction,
    balanceCheckAction,
  ],

  // Providers that supply context
  providers: [tokenContextProvider, marketDataProvider],

  // Evaluators for post-interaction processing
  evaluators: [tradeSuccessEvaluator],

  // API routes (if needed)
  routes: [
    {
      name: 'clanker-status',
      path: '/api/clanker/status',
      type: 'GET',
      handler: async (_req: any, res: any) => {
        try {
          const config = (global as any).__clankerConfig;
          res.json({
            status: 'active',
            network: config?.NETWORK || 'unknown',
            configured: !!config,
          });
        } catch (error) {
          res.status(500).json({
            status: 'error',
            error: String(error),
          });
        }
      },
    },
  ],

  // Event handlers
  events: {
    TRANSACTION_CONFIRMED: [
      async (params) => {
        logger.info('Transaction confirmed:', params);
        // Handle transaction confirmation events
      },
    ],
    TRANSACTION_FAILED: [
      async (params) => {
        logger.error('Transaction failed:', params);
        // Handle transaction failure events
      },
    ],
  },
};

export default clankerPlugin;