'use strict';
const __makeTemplateObject = (this && this.__makeTemplateObject) || function (cooked, raw) {
  if (Object.defineProperty) { Object.defineProperty(cooked, 'raw', { value: raw }); } else { cooked.raw = raw; }
  return cooked;
};
Object.defineProperty(exports, '__esModule', { value: true });
exports.paymentWebhooks = exports.priceCache = exports.dailySpending = exports.paymentSettings = exports.userWallets = exports.paymentRequests = exports.paymentTransactions = void 0;
const pg_core_1 = require('drizzle-orm/pg-core');
const drizzle_orm_1 = require('drizzle-orm');
/**
 * Payment transactions table
 * Stores all payment transactions processed by the system
 */
exports.paymentTransactions = (0, pg_core_1.pgTable)('payment_transactions', {
  id: (0, pg_core_1.uuid)('id')
    .primaryKey()
    .default((0, drizzle_orm_1.sql)(templateObject_1 || (templateObject_1 = __makeTemplateObject(['gen_random_uuid()'], ['gen_random_uuid()'])))),
  payerId: (0, pg_core_1.uuid)('payer_id').notNull(),
  recipientId: (0, pg_core_1.uuid)('recipient_id'),
  agentId: (0, pg_core_1.uuid)('agent_id').notNull(),
  // Payment details
  amount: (0, pg_core_1.bigint)('amount', { mode: 'bigint' }).notNull(),
  currency: (0, pg_core_1.text)('currency').notNull(),
  method: (0, pg_core_1.text)('method').notNull(), // USDC_ETH, ETH, SOL, etc.
  // Transaction details
  status: (0, pg_core_1.text)('status').notNull(), // pending, processing, completed, failed, cancelled
  transactionHash: (0, pg_core_1.text)('transaction_hash'),
  fromAddress: (0, pg_core_1.text)('from_address'),
  toAddress: (0, pg_core_1.text)('to_address'),
  // Tracking
  confirmations: (0, pg_core_1.integer)('confirmations').default(0),
  gasUsed: (0, pg_core_1.bigint)('gas_used', { mode: 'bigint' }),
  gasPriceWei: (0, pg_core_1.bigint)('gas_price_wei', { mode: 'bigint' }),
  // Metadata
  actionName: (0, pg_core_1.text)('action_name'),
  metadata: (0, pg_core_1.jsonb)('metadata').default('{}'),
  error: (0, pg_core_1.text)('error'),
  // Timestamps
  createdAt: (0, pg_core_1.timestamp)('created_at').defaultNow().notNull(),
  completedAt: (0, pg_core_1.timestamp)('completed_at'),
  expiresAt: (0, pg_core_1.timestamp)('expires_at'),
}, (table) => {
  return {
    payerIdx: (0, pg_core_1.index)('idx_payment_transactions_payer').on(table.payerId),
    statusIdx: (0, pg_core_1.index)('idx_payment_transactions_status').on(table.status),
    hashIdx: (0, pg_core_1.index)('idx_payment_transactions_hash').on(table.transactionHash),
    createdAtIdx: (0, pg_core_1.index)('idx_payment_transactions_created').on(table.createdAt),
  };
});
/**
 * Payment requests table
 * Stores pending payment requests awaiting confirmation
 */
exports.paymentRequests = (0, pg_core_1.pgTable)('payment_requests', {
  id: (0, pg_core_1.uuid)('id')
    .primaryKey()
    .default((0, drizzle_orm_1.sql)(templateObject_2 || (templateObject_2 = __makeTemplateObject(['gen_random_uuid()'], ['gen_random_uuid()'])))),
  transactionId: (0, pg_core_1.uuid)('transaction_id').references(() => { return exports.paymentTransactions.id; }),
  userId: (0, pg_core_1.uuid)('user_id').notNull(),
  agentId: (0, pg_core_1.uuid)('agent_id').notNull(),
  amount: (0, pg_core_1.bigint)('amount', { mode: 'bigint' }).notNull(),
  method: (0, pg_core_1.text)('method').notNull(),
  recipientAddress: (0, pg_core_1.text)('recipient_address'),
  requiresConfirmation: (0, pg_core_1.boolean)('requires_confirmation').default(true),
  trustRequired: (0, pg_core_1.boolean)('trust_required').default(false),
  minimumTrustLevel: (0, pg_core_1.integer)('minimum_trust_level'),
  metadata: (0, pg_core_1.jsonb)('metadata').default('{}'),
  createdAt: (0, pg_core_1.timestamp)('created_at').defaultNow().notNull(),
  expiresAt: (0, pg_core_1.timestamp)('expires_at'),
});
/**
 * User wallets table
 * Stores user wallet information for the payment system
 */
exports.userWallets = (0, pg_core_1.pgTable)('user_wallets', {
  id: (0, pg_core_1.uuid)('id')
    .primaryKey()
    .default((0, drizzle_orm_1.sql)(templateObject_3 || (templateObject_3 = __makeTemplateObject(['gen_random_uuid()'], ['gen_random_uuid()'])))),
  userId: (0, pg_core_1.uuid)('user_id').notNull(),
  address: (0, pg_core_1.text)('address').notNull(),
  network: (0, pg_core_1.text)('network').notNull(), // evm, solana, agentkit
  chainId: (0, pg_core_1.integer)('chain_id'),
  // Encrypted private key (if custodial)
  encryptedPrivateKey: (0, pg_core_1.text)('encrypted_private_key'),
  isActive: (0, pg_core_1.boolean)('is_active').default(true),
  isPrimary: (0, pg_core_1.boolean)('is_primary').default(false),
  metadata: (0, pg_core_1.jsonb)('metadata').default('{}'),
  createdAt: (0, pg_core_1.timestamp)('created_at').defaultNow().notNull(),
  updatedAt: (0, pg_core_1.timestamp)('updated_at').defaultNow().notNull(),
}, (table) => {
  return {
    userNetworkUnique: (0, pg_core_1.unique)('user_network_unique').on(table.userId, table.network, table.address),
    userIdx: (0, pg_core_1.index)('idx_user_wallets_user').on(table.userId),
    addressIdx: (0, pg_core_1.index)('idx_user_wallets_address').on(table.address),
  };
});
/**
 * Payment settings table
 * Stores per-agent payment configuration
 */
exports.paymentSettings = (0, pg_core_1.pgTable)('payment_settings', {
  id: (0, pg_core_1.uuid)('id')
    .primaryKey()
    .default((0, drizzle_orm_1.sql)(templateObject_4 || (templateObject_4 = __makeTemplateObject(['gen_random_uuid()'], ['gen_random_uuid()'])))),
  agentId: (0, pg_core_1.uuid)('agent_id').notNull().unique(),
  autoApprovalEnabled: (0, pg_core_1.boolean)('auto_approval_enabled').default(false),
  autoApprovalThreshold: (0, pg_core_1.decimal)('auto_approval_threshold', { precision: 10, scale: 2 }).default('10.00'),
  defaultCurrency: (0, pg_core_1.text)('default_currency').default('USDC'),
  requireConfirmation: (0, pg_core_1.boolean)('require_confirmation').default(true),
  trustThreshold: (0, pg_core_1.integer)('trust_threshold').default(70),
  maxDailySpend: (0, pg_core_1.decimal)('max_daily_spend', { precision: 10, scale: 2 }).default('1000.00'),
  preferredNetworks: (0, pg_core_1.jsonb)('preferred_networks').default('["ethereum", "solana"]'),
  feeStrategy: (0, pg_core_1.text)('fee_strategy').default('standard'),
  createdAt: (0, pg_core_1.timestamp)('created_at').defaultNow().notNull(),
  updatedAt: (0, pg_core_1.timestamp)('updated_at').defaultNow().notNull(),
});
/**
 * Daily spending table
 * Tracks daily spending per user for limit enforcement
 */
exports.dailySpending = (0, pg_core_1.pgTable)('daily_spending', {
  id: (0, pg_core_1.uuid)('id')
    .primaryKey()
    .default((0, drizzle_orm_1.sql)(templateObject_5 || (templateObject_5 = __makeTemplateObject(['gen_random_uuid()'], ['gen_random_uuid()'])))),
  userId: (0, pg_core_1.uuid)('user_id').notNull(),
  date: (0, pg_core_1.text)('date').notNull(), // YYYY-MM-DD format
  totalSpentUsd: (0, pg_core_1.decimal)('total_spent_usd', { precision: 10, scale: 2 }).default('0.00'),
  transactionCount: (0, pg_core_1.integer)('transaction_count').default(0),
  breakdown: (0, pg_core_1.jsonb)('breakdown').default('{}'), // { method: amount }
  updatedAt: (0, pg_core_1.timestamp)('updated_at').defaultNow().notNull(),
}, (table) => {
  return {
    userDateUnique: (0, pg_core_1.unique)('user_date_unique').on(table.userId, table.date),
    userIdx: (0, pg_core_1.index)('idx_daily_spending_user').on(table.userId),
    dateIdx: (0, pg_core_1.index)('idx_daily_spending_date').on(table.date),
  };
});
/**
 * Price cache table
 * Caches token prices for conversion calculations
 */
exports.priceCache = (0, pg_core_1.pgTable)('price_cache', {
  id: (0, pg_core_1.uuid)('id')
    .primaryKey()
    .default((0, drizzle_orm_1.sql)(templateObject_6 || (templateObject_6 = __makeTemplateObject(['gen_random_uuid()'], ['gen_random_uuid()'])))),
  tokenAddress: (0, pg_core_1.text)('token_address').notNull(),
  network: (0, pg_core_1.text)('network').notNull(),
  symbol: (0, pg_core_1.text)('symbol').notNull(),
  priceUsd: (0, pg_core_1.decimal)('price_usd', { precision: 20, scale: 8 }).notNull(),
  priceChange24h: (0, pg_core_1.decimal)('price_change_24h', { precision: 10, scale: 2 }),
  volume24h: (0, pg_core_1.decimal)('volume_24h', { precision: 20, scale: 2 }),
  marketCap: (0, pg_core_1.decimal)('market_cap', { precision: 20, scale: 2 }),
  source: (0, pg_core_1.text)('source').notNull(), // jupiter, coingecko, chainlink, etc.
  createdAt: (0, pg_core_1.timestamp)('created_at').defaultNow().notNull(),
  expiresAt: (0, pg_core_1.timestamp)('expires_at').notNull(),
}, (table) => {
  return {
    tokenNetworkUnique: (0, pg_core_1.unique)('token_network_unique').on(table.tokenAddress, table.network),
    expiresIdx: (0, pg_core_1.index)('idx_price_cache_expires').on(table.expiresAt),
  };
});
/**
 * Payment webhooks table
 * Stores webhook configurations for payment notifications
 */
exports.paymentWebhooks = (0, pg_core_1.pgTable)('payment_webhooks', {
  id: (0, pg_core_1.uuid)('id')
    .primaryKey()
    .default((0, drizzle_orm_1.sql)(templateObject_7 || (templateObject_7 = __makeTemplateObject(['gen_random_uuid()'], ['gen_random_uuid()'])))),
  paymentId: (0, pg_core_1.uuid)('payment_id')
    .notNull()
    .references(() => { return exports.paymentTransactions.id; }),
  url: (0, pg_core_1.text)('url').notNull(),
  events: (0, pg_core_1.jsonb)('events').default('["completed", "failed"]'),
  retryCount: (0, pg_core_1.integer)('retry_count').default(0),
  maxRetries: (0, pg_core_1.integer)('max_retries').default(3),
  lastAttemptAt: (0, pg_core_1.timestamp)('last_attempt_at'),
  nextRetryAt: (0, pg_core_1.timestamp)('next_retry_at'),
  status: (0, pg_core_1.text)('status').default('pending'), // pending, success, failed
  createdAt: (0, pg_core_1.timestamp)('created_at').defaultNow().notNull(),
});
let templateObject_1, templateObject_2, templateObject_3, templateObject_4, templateObject_5, templateObject_6, templateObject_7;
