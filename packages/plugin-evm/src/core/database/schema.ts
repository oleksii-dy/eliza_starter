import { 
    pgTable, 
    varchar, 
    boolean, 
    timestamp, 
    uuid, 
    jsonb, 
    integer, 
    text,
    bigint,
    index,
    primaryKey,
    uniqueIndex
} from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';

// Wallets table
export const wallets = pgTable('evm_wallets', {
    id: uuid('id').primaryKey().defaultRandom(),
    agentId: uuid('agent_id').notNull(),
    address: varchar('address', { length: 42 }).notNull(),
    type: varchar('type', { length: 20 }).notNull(), // 'eoa' | 'safe' | 'aa' | 'multisig'
    name: varchar('name', { length: 255 }),
    chainId: integer('chain_id'),
    isActive: boolean('is_active').default(true).notNull(),
    metadata: jsonb('metadata'),
    encryptedPrivateKey: text('encrypted_private_key'), // For EOA wallets
    encryptedMnemonic: text('encrypted_mnemonic'), // For HD wallets
    derivationPath: varchar('derivation_path', { length: 255 }), // For HD wallets
    owners: jsonb('owners').$type<string[]>(), // For multisig wallets
    threshold: integer('threshold'), // For multisig wallets
    createdAt: timestamp('created_at').defaultNow().notNull(),
    lastUsedAt: timestamp('last_used_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull()
}, (table) => {
    return {
        agentIdIdx: index('evm_wallets_agent_id_idx').on(table.agentId),
        addressIdx: index('evm_wallets_address_idx').on(table.address),
        typeIdx: index('evm_wallets_type_idx').on(table.type),
        agentAddressUnique: uniqueIndex('evm_wallets_agent_address_unique').on(table.agentId, table.address)
    };
});

// Sessions table
export const sessions = pgTable('evm_sessions', {
    id: uuid('id').primaryKey().defaultRandom(),
    walletId: uuid('wallet_id').notNull().references(() => wallets.id, { onDelete: 'cascade' }),
    publicKey: varchar('public_key', { length: 130 }).notNull(),
    encryptedPrivateKey: text('encrypted_private_key').notNull(),
    permissions: jsonb('permissions').notNull().$type<any[]>(),
    spendingLimits: jsonb('spending_limits').$type<any[]>(),
    allowedContracts: jsonb('allowed_contracts').$type<string[]>(),
    allowedMethods: jsonb('allowed_methods').$type<string[]>(),
    expiresAt: timestamp('expires_at').notNull(),
    isActive: boolean('is_active').default(true).notNull(),
    usageCount: integer('usage_count').default(0).notNull(),
    lastUsedAt: timestamp('last_used_at'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    revokedAt: timestamp('revoked_at')
}, (table) => {
    return {
        walletIdIdx: index('evm_sessions_wallet_id_idx').on(table.walletId),
        publicKeyIdx: index('evm_sessions_public_key_idx').on(table.publicKey),
        expiresAtIdx: index('evm_sessions_expires_at_idx').on(table.expiresAt),
        isActiveIdx: index('evm_sessions_is_active_idx').on(table.isActive)
    };
});

// Transaction history table
export const transactionHistory = pgTable('evm_transaction_history', {
    id: uuid('id').primaryKey().defaultRandom(),
    walletId: uuid('wallet_id').notNull().references(() => wallets.id, { onDelete: 'cascade' }),
    chainId: integer('chain_id').notNull(),
    hash: varchar('hash', { length: 66 }).notNull(),
    from: varchar('from_address', { length: 42 }).notNull(),
    to: varchar('to_address', { length: 42 }).notNull(),
    value: bigint('value', { mode: 'bigint' }).notNull(),
    data: text('data'),
    blockNumber: bigint('block_number', { mode: 'number' }).notNull(),
    timestamp: timestamp('timestamp').notNull(),
    gasUsed: bigint('gas_used', { mode: 'bigint' }).notNull(),
    gasPrice: bigint('gas_price', { mode: 'bigint' }).notNull(),
    status: varchar('status', { length: 20 }).notNull(), // 'success' | 'failed' | 'pending'
    method: varchar('method', { length: 255 }),
    decodedInput: jsonb('decoded_input'),
    logs: jsonb('logs'),
    sessionId: uuid('session_id').references(() => sessions.id, { onDelete: 'set null' }),
    nonce: integer('nonce'),
    createdAt: timestamp('created_at').defaultNow().notNull()
}, (table) => {
    return {
        walletIdIdx: index('evm_tx_history_wallet_id_idx').on(table.walletId),
        chainIdIdx: index('evm_tx_history_chain_id_idx').on(table.chainId),
        hashIdx: uniqueIndex('evm_tx_history_hash_idx').on(table.hash, table.chainId),
        fromIdx: index('evm_tx_history_from_idx').on(table.from),
        toIdx: index('evm_tx_history_to_idx').on(table.to),
        timestampIdx: index('evm_tx_history_timestamp_idx').on(table.timestamp),
        blockNumberIdx: index('evm_tx_history_block_number_idx').on(table.blockNumber)
    };
});

// Token balances cache table
export const tokenBalances = pgTable('evm_token_balances', {
    id: uuid('id').primaryKey().defaultRandom(),
    walletId: uuid('wallet_id').notNull().references(() => wallets.id, { onDelete: 'cascade' }),
    chainId: integer('chain_id').notNull(),
    tokenAddress: varchar('token_address', { length: 42 }).notNull(),
    tokenSymbol: varchar('token_symbol', { length: 20 }).notNull(),
    tokenName: varchar('token_name', { length: 255 }),
    tokenDecimals: integer('token_decimals').notNull(),
    balance: bigint('balance', { mode: 'bigint' }).notNull(),
    valueUSD: bigint('value_usd', { mode: 'number' }),
    lastUpdated: timestamp('last_updated').defaultNow().notNull(),
    metadata: jsonb('metadata')
}, (table) => {
    return {
        walletChainIdx: index('evm_token_balances_wallet_chain_idx').on(table.walletId, table.chainId),
        tokenAddressIdx: index('evm_token_balances_token_address_idx').on(table.tokenAddress),
        walletTokenUnique: uniqueIndex('evm_token_balances_unique').on(
            table.walletId, 
            table.chainId, 
            table.tokenAddress
        )
    };
});

// DeFi positions table
export const defiPositions = pgTable('evm_defi_positions', {
    id: uuid('id').primaryKey().defaultRandom(),
    walletId: uuid('wallet_id').notNull().references(() => wallets.id, { onDelete: 'cascade' }),
    chainId: integer('chain_id').notNull(),
    protocol: varchar('protocol', { length: 100 }).notNull(),
    protocolId: varchar('protocol_id', { length: 100 }).notNull(),
    positionType: varchar('position_type', { length: 50 }).notNull(),
    positionData: jsonb('position_data').notNull(),
    totalValueUSD: bigint('total_value_usd', { mode: 'number' }),
    claimableRewards: jsonb('claimable_rewards'),
    lastUpdated: timestamp('last_updated').defaultNow().notNull(),
    metadata: jsonb('metadata')
}, (table) => {
    return {
        walletChainIdx: index('evm_defi_positions_wallet_chain_idx').on(table.walletId, table.chainId),
        protocolIdx: index('evm_defi_positions_protocol_idx').on(table.protocol),
        walletProtocolUnique: uniqueIndex('evm_defi_positions_unique').on(
            table.walletId,
            table.chainId,
            table.protocol,
            table.protocolId
        )
    };
});

// NFT holdings table
export const nftHoldings = pgTable('evm_nft_holdings', {
    id: uuid('id').primaryKey().defaultRandom(),
    walletId: uuid('wallet_id').notNull().references(() => wallets.id, { onDelete: 'cascade' }),
    chainId: integer('chain_id').notNull(),
    contractAddress: varchar('contract_address', { length: 42 }).notNull(),
    tokenId: varchar('token_id', { length: 100 }).notNull(),
    tokenType: varchar('token_type', { length: 20 }).notNull(), // 'ERC721' | 'ERC1155'
    balance: bigint('balance', { mode: 'number' }).default(1).notNull(), // For ERC1155
    name: text('name'),
    description: text('description'),
    imageUrl: text('image_url'),
    animationUrl: text('animation_url'),
    attributes: jsonb('attributes'),
    collection: jsonb('collection'),
    lastUpdated: timestamp('last_updated').defaultNow().notNull(),
    metadata: jsonb('metadata')
}, (table) => {
    return {
        walletChainIdx: index('evm_nft_holdings_wallet_chain_idx').on(table.walletId, table.chainId),
        contractIdx: index('evm_nft_holdings_contract_idx').on(table.contractAddress),
        walletNftUnique: uniqueIndex('evm_nft_holdings_unique').on(
            table.walletId,
            table.chainId,
            table.contractAddress,
            table.tokenId
        )
    };
});

// Gas price cache table
export const gasPriceCache = pgTable('evm_gas_price_cache', {
    id: uuid('id').primaryKey().defaultRandom(),
    chainId: integer('chain_id').notNull(),
    slow: bigint('slow', { mode: 'bigint' }).notNull(),
    standard: bigint('standard', { mode: 'bigint' }).notNull(),
    fast: bigint('fast', { mode: 'bigint' }).notNull(),
    instant: bigint('instant', { mode: 'bigint' }).notNull(),
    baseFee: bigint('base_fee', { mode: 'bigint' }),
    priorityFee: bigint('priority_fee', { mode: 'bigint' }),
    lastBlock: bigint('last_block', { mode: 'number' }).notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull()
}, (table) => {
    return {
        chainIdIdx: uniqueIndex('evm_gas_price_chain_id_idx').on(table.chainId)
    };
});

// Contract ABI cache table
export const contractAbiCache = pgTable('evm_contract_abi_cache', {
    id: uuid('id').primaryKey().defaultRandom(),
    address: varchar('address', { length: 42 }).notNull(),
    chainId: integer('chain_id').notNull(),
    abi: jsonb('abi').notNull(),
    contractName: varchar('contract_name', { length: 255 }),
    isVerified: boolean('is_verified').default(false).notNull(),
    implementation: varchar('implementation', { length: 42 }), // For proxy contracts
    source: varchar('source', { length: 50 }), // 'etherscan' | 'sourcify' | '4byte'
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull()
}, (table) => {
    return {
        addressChainUnique: uniqueIndex('evm_abi_cache_unique').on(table.address, table.chainId)
    };
});

// ENS resolution cache
export const ensCache = pgTable('evm_ens_cache', {
    id: uuid('id').primaryKey().defaultRandom(),
    name: varchar('name', { length: 255 }).notNull(),
    address: varchar('address', { length: 42 }),
    resolver: varchar('resolver', { length: 42 }),
    contentHash: text('content_hash'),
    avatar: text('avatar'),
    description: text('description'),
    twitter: varchar('twitter', { length: 255 }),
    github: varchar('github', { length: 255 }),
    discord: varchar('discord', { length: 255 }),
    email: varchar('email', { length: 255 }),
    url: text('url'),
    metadata: jsonb('metadata'),
    expiresAt: timestamp('expires_at'),
    updatedAt: timestamp('updated_at').defaultNow().notNull()
}, (table) => {
    return {
        nameIdx: uniqueIndex('evm_ens_cache_name_idx').on(table.name),
        addressIdx: index('evm_ens_cache_address_idx').on(table.address)
    };
});

// Type exports for use in application
export type Wallet = typeof wallets.$inferSelect;
export type NewWallet = typeof wallets.$inferInsert;
export type Session = typeof sessions.$inferSelect;
export type NewSession = typeof sessions.$inferInsert;
export type TransactionHistory = typeof transactionHistory.$inferSelect;
export type NewTransactionHistory = typeof transactionHistory.$inferInsert;
export type TokenBalance = typeof tokenBalances.$inferSelect;
export type DefiPosition = typeof defiPositions.$inferSelect;
export type NFTHolding = typeof nftHoldings.$inferSelect;
export type GasPriceCache = typeof gasPriceCache.$inferSelect;
export type ContractAbiCache = typeof contractAbiCache.$inferSelect;
export type EnsCache = typeof ensCache.$inferSelect; 