import { type Plugin, type IAgentRuntime, ServiceType, logger } from '@elizaos/core';
import { PaymentService } from './services/PaymentService';
import { PriceOracleService } from './services/PriceOracleService';
import { UniversalPaymentService } from './services/UniversalPaymentService';
import { researchAction } from './actions/researchAction';

// Import scenarios
import { scenarios } from './scenarios';

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

/**
 * Payment plugin for ElizaOS
 * Provides payment processing capabilities with multiple wallet integrations
 */
export const paymentPlugin: Plugin = {
  name: 'payment',
  description: 'Payment processing plugin with multi-chain wallet support and price oracle',

  services: [PaymentService, PriceOracleService, UniversalPaymentService],

  actions: [researchAction],

  providers: [],

  scenarios: scenarios,

  async init(config: Record<string, string>, runtime: IAgentRuntime): Promise<void> {
    logger.info('[Payment Plugin] Initializing...');

    // Register actions
    runtime.registerAction(researchAction);

    logger.info('[Payment Plugin] Initialization complete');
  },
};

export default paymentPlugin;
