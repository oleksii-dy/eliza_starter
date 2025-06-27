'use strict';
Object.defineProperty(exports, '__esModule', { value: true });
exports.PAYMENT_TABLES = void 0;
/**
 * Payment plugin table definitions for the unified migration system
 */
exports.PAYMENT_TABLES = [
  {
    name: 'payment_transactions',
    pluginName: '@elizaos/plugin-payment',
    sql: "CREATE TABLE IF NOT EXISTS \"payment_transactions\" (\n      \"id\" UUID PRIMARY KEY DEFAULT gen_random_uuid(),\n      \"payer_id\" UUID NOT NULL,\n      \"recipient_id\" UUID,\n      \"agent_id\" UUID NOT NULL,\n      \"amount\" BIGINT NOT NULL,\n      \"currency\" TEXT NOT NULL,\n      \"method\" TEXT NOT NULL,\n      \"status\" TEXT NOT NULL,\n      \"transaction_hash\" TEXT,\n      \"from_address\" TEXT,\n      \"to_address\" TEXT,\n      \"confirmations\" INTEGER DEFAULT 0,\n      \"gas_used\" BIGINT,\n      \"gas_price_wei\" BIGINT,\n      \"action_name\" TEXT,\n      \"metadata\" JSONB DEFAULT '{}',\n      \"error\" TEXT,\n      \"created_at\" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,\n      \"completed_at\" TIMESTAMP,\n      \"expires_at\" TIMESTAMP\n    )",
    fallbackSql: "CREATE TABLE IF NOT EXISTS payment_transactions (\n      id TEXT PRIMARY KEY,\n      payer_id TEXT NOT NULL,\n      recipient_id TEXT,\n      agent_id TEXT NOT NULL,\n      amount TEXT NOT NULL,\n      currency TEXT NOT NULL,\n      method TEXT NOT NULL,\n      status TEXT NOT NULL,\n      transaction_hash TEXT,\n      from_address TEXT,\n      to_address TEXT,\n      confirmations INTEGER DEFAULT 0,\n      gas_used TEXT,\n      gas_price_wei TEXT,\n      action_name TEXT,\n      metadata TEXT DEFAULT '{}',\n      error TEXT,\n      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,\n      completed_at TIMESTAMP,\n      expires_at TIMESTAMP\n    )",
  },
  {
    name: 'payment_requests',
    pluginName: '@elizaos/plugin-payment',
    dependencies: ['payment_transactions'],
    sql: "CREATE TABLE IF NOT EXISTS \"payment_requests\" (\n      \"id\" UUID PRIMARY KEY DEFAULT gen_random_uuid(),\n      \"transaction_id\" UUID REFERENCES payment_transactions(id),\n      \"user_id\" UUID NOT NULL,\n      \"agent_id\" UUID NOT NULL,\n      \"amount\" BIGINT NOT NULL,\n      \"method\" TEXT NOT NULL,\n      \"recipient_address\" TEXT,\n      \"requires_confirmation\" BOOLEAN DEFAULT true,\n      \"trust_required\" BOOLEAN DEFAULT false,\n      \"minimum_trust_level\" INTEGER,\n      \"metadata\" JSONB DEFAULT '{}',\n      \"created_at\" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,\n      \"expires_at\" TIMESTAMP\n    )",
    fallbackSql: "CREATE TABLE IF NOT EXISTS payment_requests (\n      id TEXT PRIMARY KEY,\n      transaction_id TEXT REFERENCES payment_transactions(id),\n      user_id TEXT NOT NULL,\n      agent_id TEXT NOT NULL,\n      amount TEXT NOT NULL,\n      method TEXT NOT NULL,\n      recipient_address TEXT,\n      requires_confirmation BOOLEAN DEFAULT true,\n      trust_required BOOLEAN DEFAULT false,\n      minimum_trust_level INTEGER,\n      metadata TEXT DEFAULT '{}',\n      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,\n      expires_at TIMESTAMP\n    )",
  },
  {
    name: 'user_wallets',
    pluginName: '@elizaos/plugin-payment',
    sql: "CREATE TABLE IF NOT EXISTS \"user_wallets\" (\n      \"id\" UUID PRIMARY KEY DEFAULT gen_random_uuid(),\n      \"user_id\" UUID NOT NULL,\n      \"address\" TEXT NOT NULL,\n      \"network\" TEXT NOT NULL,\n      \"chain_id\" INTEGER,\n      \"encrypted_private_key\" TEXT,\n      \"is_active\" BOOLEAN DEFAULT true,\n      \"is_primary\" BOOLEAN DEFAULT false,\n      \"metadata\" JSONB DEFAULT '{}',\n      \"created_at\" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,\n      \"updated_at\" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,\n      UNIQUE(user_id, network, address)\n    )",
    fallbackSql: "CREATE TABLE IF NOT EXISTS user_wallets (\n      id TEXT PRIMARY KEY,\n      user_id TEXT NOT NULL,\n      address TEXT NOT NULL,\n      network TEXT NOT NULL,\n      chain_id INTEGER,\n      encrypted_private_key TEXT,\n      is_active BOOLEAN DEFAULT true,\n      is_primary BOOLEAN DEFAULT false,\n      metadata TEXT DEFAULT '{}',\n      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,\n      updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,\n      UNIQUE(user_id, network, address)\n    )",
  },
  {
    name: 'payment_settings',
    pluginName: '@elizaos/plugin-payment',
    sql: "CREATE TABLE IF NOT EXISTS \"payment_settings\" (\n      \"id\" UUID PRIMARY KEY DEFAULT gen_random_uuid(),\n      \"agent_id\" UUID NOT NULL UNIQUE,\n      \"auto_approval_enabled\" BOOLEAN DEFAULT false,\n      \"auto_approval_threshold\" DECIMAL(10,2) DEFAULT 10.00,\n      \"default_currency\" TEXT DEFAULT 'USDC',\n      \"require_confirmation\" BOOLEAN DEFAULT true,\n      \"trust_threshold\" INTEGER DEFAULT 70,\n      \"max_daily_spend\" DECIMAL(10,2) DEFAULT 1000.00,\n      \"preferred_networks\" JSONB DEFAULT '[\"ethereum\", \"solana\"]',\n      \"fee_strategy\" TEXT DEFAULT 'standard',\n      \"created_at\" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,\n      \"updated_at\" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP\n    )",
    fallbackSql: "CREATE TABLE IF NOT EXISTS payment_settings (\n      id TEXT PRIMARY KEY,\n      agent_id TEXT NOT NULL UNIQUE,\n      auto_approval_enabled BOOLEAN DEFAULT false,\n      auto_approval_threshold TEXT DEFAULT '10.00',\n      default_currency TEXT DEFAULT 'USDC',\n      require_confirmation BOOLEAN DEFAULT true,\n      trust_threshold INTEGER DEFAULT 70,\n      max_daily_spend TEXT DEFAULT '1000.00',\n      preferred_networks TEXT DEFAULT '[\"ethereum\", \"solana\"]',\n      fee_strategy TEXT DEFAULT 'standard',\n      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,\n      updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP\n    )",
  },
  {
    name: 'daily_spending',
    pluginName: '@elizaos/plugin-payment',
    sql: "CREATE TABLE IF NOT EXISTS \"daily_spending\" (\n      \"id\" UUID PRIMARY KEY DEFAULT gen_random_uuid(),\n      \"user_id\" UUID NOT NULL,\n      \"date\" TEXT NOT NULL,\n      \"total_spent_usd\" DECIMAL(10,2) DEFAULT 0.00,\n      \"transaction_count\" INTEGER DEFAULT 0,\n      \"breakdown\" JSONB DEFAULT '{}',\n      \"updated_at\" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,\n      UNIQUE(user_id, date)\n    )",
    fallbackSql: "CREATE TABLE IF NOT EXISTS daily_spending (\n      id TEXT PRIMARY KEY,\n      user_id TEXT NOT NULL,\n      date TEXT NOT NULL,\n      total_spent_usd TEXT DEFAULT '0.00',\n      transaction_count INTEGER DEFAULT 0,\n      breakdown TEXT DEFAULT '{}',\n      updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,\n      UNIQUE(user_id, date)\n    )",
  },
  {
    name: 'price_cache',
    pluginName: '@elizaos/plugin-payment',
    sql: 'CREATE TABLE IF NOT EXISTS "price_cache" (\n      "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),\n      "token_address" TEXT NOT NULL,\n      "network" TEXT NOT NULL,\n      "symbol" TEXT NOT NULL,\n      "price_usd" DECIMAL(20,8) NOT NULL,\n      "price_change_24h" DECIMAL(10,2),\n      "volume_24h" DECIMAL(20,2),\n      "market_cap" DECIMAL(20,2),\n      "source" TEXT NOT NULL,\n      "created_at" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,\n      "expires_at" TIMESTAMP NOT NULL,\n      UNIQUE(token_address, network)\n    )',
    fallbackSql: 'CREATE TABLE IF NOT EXISTS price_cache (\n      id TEXT PRIMARY KEY,\n      token_address TEXT NOT NULL,\n      network TEXT NOT NULL,\n      symbol TEXT NOT NULL,\n      price_usd TEXT NOT NULL,\n      price_change_24h TEXT,\n      volume_24h TEXT,\n      market_cap TEXT,\n      source TEXT NOT NULL,\n      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,\n      expires_at TIMESTAMP NOT NULL,\n      UNIQUE(token_address, network)\n    )',
  },
  {
    name: 'payment_webhooks',
    pluginName: '@elizaos/plugin-payment',
    dependencies: ['payment_transactions'],
    sql: "CREATE TABLE IF NOT EXISTS \"payment_webhooks\" (\n      \"id\" UUID PRIMARY KEY DEFAULT gen_random_uuid(),\n      \"payment_id\" UUID NOT NULL REFERENCES payment_transactions(id),\n      \"url\" TEXT NOT NULL,\n      \"events\" JSONB DEFAULT '[\"completed\", \"failed\"]',\n      \"retry_count\" INTEGER DEFAULT 0,\n      \"max_retries\" INTEGER DEFAULT 3,\n      \"last_attempt_at\" TIMESTAMP,\n      \"next_retry_at\" TIMESTAMP,\n      \"status\" TEXT DEFAULT 'pending',\n      \"created_at\" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP\n    )",
    fallbackSql: "CREATE TABLE IF NOT EXISTS payment_webhooks (\n      id TEXT PRIMARY KEY,\n      payment_id TEXT NOT NULL REFERENCES payment_transactions(id),\n      url TEXT NOT NULL,\n      events TEXT DEFAULT '[\"completed\", \"failed\"]',\n      retry_count INTEGER DEFAULT 0,\n      max_retries INTEGER DEFAULT 3,\n      last_attempt_at TIMESTAMP,\n      next_retry_at TIMESTAMP,\n      status TEXT DEFAULT 'pending',\n      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP\n    )",
  },
];
