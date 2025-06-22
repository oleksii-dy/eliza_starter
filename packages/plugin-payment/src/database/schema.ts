import {
  pgTable,
  uuid,
  text,
  timestamp,
  bigint,
  integer,
  jsonb,
  boolean,
  decimal,
  index,
  unique,
} from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';

/**
 * Payment transactions table
 * Stores all payment transactions processed by the system
 */
export const paymentTransactions = pgTable(
  'payment_transactions',
  {
    id: uuid('id')
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    payerId: uuid('payer_id').notNull(),
    recipientId: uuid('recipient_id'),
    agentId: uuid('agent_id').notNull(),

    // Payment details
    amount: bigint('amount', { mode: 'bigint' }).notNull(),
    currency: text('currency').notNull(),
    method: text('method').notNull(), // USDC_ETH, ETH, SOL, etc.

    // Transaction details
    status: text('status').notNull(), // pending, processing, completed, failed, cancelled
    transactionHash: text('transaction_hash'),
    fromAddress: text('from_address'),
    toAddress: text('to_address'),

    // Tracking
    confirmations: integer('confirmations').default(0),
    gasUsed: bigint('gas_used', { mode: 'bigint' }),
    gasPriceWei: bigint('gas_price_wei', { mode: 'bigint' }),

    // Metadata
    actionName: text('action_name'),
    metadata: jsonb('metadata').default('{}'),
    error: text('error'),

    // Timestamps
    createdAt: timestamp('created_at').defaultNow().notNull(),
    completedAt: timestamp('completed_at'),
    expiresAt: timestamp('expires_at'),
  },
  (table) => {
    return {
      payerIdx: index('idx_payment_transactions_payer').on(table.payerId),
      statusIdx: index('idx_payment_transactions_status').on(table.status),
      hashIdx: index('idx_payment_transactions_hash').on(table.transactionHash),
      createdAtIdx: index('idx_payment_transactions_created').on(table.createdAt),
    };
  }
);

/**
 * Payment requests table
 * Stores pending payment requests awaiting confirmation
 */
export const paymentRequests = pgTable('payment_requests', {
  id: uuid('id')
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  transactionId: uuid('transaction_id').references(() => paymentTransactions.id),

  userId: uuid('user_id').notNull(),
  agentId: uuid('agent_id').notNull(),

  amount: bigint('amount', { mode: 'bigint' }).notNull(),
  method: text('method').notNull(),
  recipientAddress: text('recipient_address'),

  requiresConfirmation: boolean('requires_confirmation').default(true),
  trustRequired: boolean('trust_required').default(false),
  minimumTrustLevel: integer('minimum_trust_level'),

  metadata: jsonb('metadata').default('{}'),

  createdAt: timestamp('created_at').defaultNow().notNull(),
  expiresAt: timestamp('expires_at'),
});

/**
 * User wallets table
 * Stores user wallet information for the payment system
 */
export const userWallets = pgTable(
  'user_wallets',
  {
    id: uuid('id')
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    userId: uuid('user_id').notNull(),

    address: text('address').notNull(),
    network: text('network').notNull(), // evm, solana, agentkit
    chainId: integer('chain_id'),

    // Encrypted private key (if custodial)
    encryptedPrivateKey: text('encrypted_private_key'),

    isActive: boolean('is_active').default(true),
    isPrimary: boolean('is_primary').default(false),

    metadata: jsonb('metadata').default('{}'),

    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (table) => {
    return {
      userNetworkUnique: unique('user_network_unique').on(
        table.userId,
        table.network,
        table.address
      ),
      userIdx: index('idx_user_wallets_user').on(table.userId),
      addressIdx: index('idx_user_wallets_address').on(table.address),
    };
  }
);

/**
 * Payment settings table
 * Stores per-agent payment configuration
 */
export const paymentSettings = pgTable('payment_settings', {
  id: uuid('id')
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  agentId: uuid('agent_id').notNull().unique(),

  autoApprovalEnabled: boolean('auto_approval_enabled').default(false),
  autoApprovalThreshold: decimal('auto_approval_threshold', { precision: 10, scale: 2 }).default(
    '10.00'
  ),

  defaultCurrency: text('default_currency').default('USDC'),
  requireConfirmation: boolean('require_confirmation').default(true),

  trustThreshold: integer('trust_threshold').default(70),
  maxDailySpend: decimal('max_daily_spend', { precision: 10, scale: 2 }).default('1000.00'),

  preferredNetworks: jsonb('preferred_networks').default('["ethereum", "solana"]'),
  feeStrategy: text('fee_strategy').default('standard'),

  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

/**
 * Daily spending table
 * Tracks daily spending per user for limit enforcement
 */
export const dailySpending = pgTable(
  'daily_spending',
  {
    id: uuid('id')
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    userId: uuid('user_id').notNull(),
    date: text('date').notNull(), // YYYY-MM-DD format

    totalSpentUsd: decimal('total_spent_usd', { precision: 10, scale: 2 }).default('0.00'),
    transactionCount: integer('transaction_count').default(0),

    breakdown: jsonb('breakdown').default('{}'), // { method: amount }

    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (table) => {
    return {
      userDateUnique: unique('user_date_unique').on(table.userId, table.date),
      userIdx: index('idx_daily_spending_user').on(table.userId),
      dateIdx: index('idx_daily_spending_date').on(table.date),
    };
  }
);

/**
 * Price cache table
 * Caches token prices for conversion calculations
 */
export const priceCache = pgTable(
  'price_cache',
  {
    id: uuid('id')
      .primaryKey()
      .default(sql`gen_random_uuid()`),

    tokenAddress: text('token_address').notNull(),
    network: text('network').notNull(),
    symbol: text('symbol').notNull(),

    priceUsd: decimal('price_usd', { precision: 20, scale: 8 }).notNull(),
    priceChange24h: decimal('price_change_24h', { precision: 10, scale: 2 }),

    volume24h: decimal('volume_24h', { precision: 20, scale: 2 }),
    marketCap: decimal('market_cap', { precision: 20, scale: 2 }),

    source: text('source').notNull(), // jupiter, coingecko, chainlink, etc.

    createdAt: timestamp('created_at').defaultNow().notNull(),
    expiresAt: timestamp('expires_at').notNull(),
  },
  (table) => {
    return {
      tokenNetworkUnique: unique('token_network_unique').on(table.tokenAddress, table.network),
      expiresIdx: index('idx_price_cache_expires').on(table.expiresAt),
    };
  }
);

/**
 * Payment webhooks table
 * Stores webhook configurations for payment notifications
 */
export const paymentWebhooks = pgTable('payment_webhooks', {
  id: uuid('id')
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  paymentId: uuid('payment_id')
    .notNull()
    .references(() => paymentTransactions.id),

  url: text('url').notNull(),
  events: jsonb('events').default('["completed", "failed"]'),

  retryCount: integer('retry_count').default(0),
  maxRetries: integer('max_retries').default(3),

  lastAttemptAt: timestamp('last_attempt_at'),
  nextRetryAt: timestamp('next_retry_at'),

  status: text('status').default('pending'), // pending, success, failed

  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// TypeScript types
export type PaymentTransaction = typeof paymentTransactions.$inferSelect;
export type NewPaymentTransaction = typeof paymentTransactions.$inferInsert;

export type PaymentRequest = typeof paymentRequests.$inferSelect;
export type NewPaymentRequest = typeof paymentRequests.$inferInsert;

export type UserWallet = typeof userWallets.$inferSelect;
export type NewUserWallet = typeof userWallets.$inferInsert;

export type PaymentSettings = typeof paymentSettings.$inferSelect;
export type NewPaymentSettings = typeof paymentSettings.$inferInsert;

export type DailySpending = typeof dailySpending.$inferSelect;
export type NewDailySpending = typeof dailySpending.$inferInsert;

export type PriceCache = typeof priceCache.$inferSelect;
export type NewPriceCache = typeof priceCache.$inferInsert;

export type PaymentWebhook = typeof paymentWebhooks.$inferSelect;
export type NewPaymentWebhook = typeof paymentWebhooks.$inferInsert;
