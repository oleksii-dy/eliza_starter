import { type Plugin, type IAgentRuntime, logger } from '@elizaos/core';
import { PaymentService } from './services/PaymentService';
import { PriceOracleService } from './services/PriceOracleService';
import { UniversalPaymentService } from './services/UniversalPaymentService';
import { researchAction } from './actions/researchAction';
import { sendPaymentAction } from './actions/sendPaymentAction';

// Import scenarios
import scenarios from './scenarios';

// Import table schemas for registration
import { PAYMENT_TABLES } from './database/tables';

// Export types
export * from './types';
export * from './interfaces/IPaymentService';

// Export services
export { PaymentService } from './services/PaymentService';
export {
  PriceOracleService,
  type TokenPrice,
  type IPriceOracleService,
} from './services/PriceOracleService';
export { UniversalPaymentService } from './services/UniversalPaymentService';

// Export database schema (selectively to avoid conflicts)
export {
  paymentTransactions,
  paymentRequests,
  userWallets,
  paymentSettings as paymentSettingsTable,
  dailySpending,
  priceCache,
  paymentWebhooks,
  type PaymentTransaction as DbPaymentTransaction,
  type PaymentRequest as DbPaymentRequest,
  type PaymentSettings as DbPaymentSettings,
  type UserWallet,
  type DailySpending,
  type PriceCache,
  type PaymentWebhook,
} from './database/schema';

// Export adapters
export { EVMWalletAdapter } from './adapters/EVMWalletAdapter';
export { SolanaWalletAdapter } from './adapters/SolanaWalletAdapter';
export { AgentKitWalletAdapter } from './adapters/AgentKitWalletAdapter';
export { CrossmintAdapter } from './adapters/CrossmintAdapter';

// Export middleware
export { createPaymentMiddleware, requiresPayment } from './middleware/paymentMiddleware';

// Export actions
export { researchAction } from './actions/researchAction';
export { sendPaymentAction } from './actions/sendPaymentAction';

/**
 * Payment plugin for ElizaOS
 * Provides payment processing capabilities with multiple wallet integrations
 */
export const paymentPlugin: Plugin = {
  name: 'payment',
  description: 'Payment processing plugin with multi-chain wallet support and price oracle',

  services: [PaymentService, PriceOracleService, UniversalPaymentService],

  actions: [
    // Payment-related actions disabled by default for security
    researchAction,
    sendPaymentAction,
  ],

  evaluators: [],

  providers: [],

  scenarios,

  async init(config: Record<string, string>, runtime: IAgentRuntime): Promise<void> {
    logger.info('[Payment Plugin] Initializing...');

    // Register payment tables with the unified migrator
    try {
      const { schemaRegistry } = await import('@elizaos/plugin-sql');
      schemaRegistry.registerTables(PAYMENT_TABLES);
      logger.info('[Payment Plugin] Registered payment database tables');
    } catch (error) {
      logger.error('[Payment Plugin] Failed to register payment tables:', error);
      throw error;
    }

    // Register actions
    runtime.registerAction(researchAction);
    runtime.registerAction(sendPaymentAction);

    logger.info('[Payment Plugin] Initialization complete');
  },
};

export default paymentPlugin;
