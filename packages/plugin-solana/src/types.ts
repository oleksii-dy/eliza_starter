import type { PublicKey } from '@solana/web3.js';
import { type IAgentRuntime, type Memory, type State } from '@elizaos/core';

/**
 * Interface representing an item with specific properties.
 * @typedef {Object} Item
 * @property {string} name - The name of the item.
 * @property {string} address - The address of the item.
 * @property {string} symbol - The symbol of the item.
 * @property {number} decimals - The number of decimals for the item.
 * @property {string} balance - The balance of the item.
 * @property {string} uiAmount - The UI amount of the item.
 * @property {string} priceUsd - The price of the item in USD.
 * @property {string} valueUsd - The value of the item in USD.
 * @property {string} [valueSol] - Optional value of the item in SOL.
 */
export interface Item {
  name: string;
  address: string;
  symbol: string;
  decimals: number;
  balance: string;
  uiAmount: string;
  priceUsd: string;
  valueUsd: string;
  valueSol?: string;
}

/**
 * Defines the interface for storing price information for various cryptocurrencies.
 *
 * @interface Prices
 * @property {Object} solana - Price information for Solana cryptocurrency.
 * @property {string} solana.usd - Price of Solana in USD.
 * @property {Object} bitcoin - Price information for Bitcoin cryptocurrency.
 * @property {string} bitcoin.usd - Price of Bitcoin in USD.
 * @property {Object} ethereum - Price information for Ethereum cryptocurrency.
 * @property {string} ethereum.usd - Price of Ethereum in USD.
 */
export interface Prices {
  solana: { usd: string };
  bitcoin: { usd: string };
  ethereum: { usd: string };
}

/**
 * Interface representing a wallet portfolio.
 * @typedef {Object} WalletPortfolio
 * @property {string} totalUsd - The total value in USD.
 * @property {string} [totalSol] - The total value in SOL (optional).
 * @property {Array<Item>} items - An array of items in the wallet portfolio.
 * @property {Prices} [prices] - Optional prices of the items.
 * @property {number} [lastUpdated] - Timestamp of when the portfolio was last updated (optional).
 */
export interface WalletPortfolio {
  totalUsd: string;
  totalSol?: string;
  items: Array<Item>;
  prices?: Prices;
  lastUpdated?: number;
}

/**
 * Represents the structure of a Token Account Info object.
 * @typedef {object} TokenAccountInfo
 * @property {PublicKey} pubkey - The public key associated with the token account.
 * @property {object} account - Information about the token account.
 * @property {number} account.lamports - The amount of lamports in the account.
 * @property {object} account.data - Data associated with the account.
 * @property {object} account.data.parsed - Parsed information.
 * @property {object} account.data.parsed.info - Detailed information.
 * @property {string} account.data.parsed.info.mint - The mint associated with the token.
 * @property {string} account.data.parsed.info.owner - The owner of the token.
 * @property {object} account.data.parsed.info.tokenAmount - Token amount details.
 * @property {string} account.data.parsed.info.tokenAmount.amount - The amount of the token.
 * @property {number} account.data.parsed.info.tokenAmount.decimals - The decimals of the token.
 * @property {number} account.data.parsed.info.tokenAmount.uiAmount - The UI amount of the token.
 * @property {string} account.data.parsed.type - The type of parsed data.
 * @property {string} account.data.program - The program associated with the account.
 * @property {number} account.data.space - The space available in the account.
 * @property {string} account.owner - The owner of the account.
 * @property {boolean} account.executable - Indicates if the account is executable.
 * @property {number} account.rentEpoch - The rent epoch of the account.
 */
export interface TokenAccountInfo {
  pubkey: PublicKey;
  account: {
    lamports: number;
    data: {
      parsed: {
        info: {
          mint: string;
          owner: string;
          tokenAmount: {
            amount: string;
            decimals: number;
            uiAmount: number;
          };
        };
        type: string;
      };
      program: string;
      space: number;
    };
    owner: string;
    executable: boolean;
    rentEpoch: number;
  };
}

// Action Result Types for proper action chaining
export interface SolanaActionResult {
  success: boolean;
  data?: {
    transactionId?: string;
    amount?: string;
    tokenAddress?: string;
    recipient?: string;
    sender?: string;
    error?: string;
    [key: string]: any;
  };
  message: string;
}

// Token Balance Interface
export interface TokenBalance {
  address: string;
  symbol: string;
  name: string;
  decimals: number;
  balance: string;
  uiAmount: number;
  priceUsd?: string;
  valueUsd?: string;
  logoURI?: string;
}

export interface SwapTransactionRequest {
  inputToken: string;
  outputToken: string;
  amount: number;
  slippageBps?: number;
  walletPublicKey: string;
}

export interface TransactionResponse {
  transactionId: string;
  status: 'pending' | 'confirmed' | 'failed';
  message: string;
  timestamp: number;
  details?: any;
}

export interface TransferTransactionRequest {
  tokenAddress: string;
  recipientAddress: string;
  amount: number;
  walletPublicKey: string;
}

// Custodial Wallet Types
export enum EntityType {
  USER = 'user',
  ROOM = 'room',
  WORLD = 'world',
  AGENT = 'agent',
  POOL = 'pool',
  CONTRACT = 'contract',
}

export interface WalletEntity {
  id: string;
  type: EntityType;
  publicKey: string;
  encryptedPrivateKey: string;
  owner: string;
  delegates: string[];
  metadata: {
    name?: string;
    description?: string;
    tags?: string[];
    permissions?: string[];
    createdAt: string;
    updatedAt: string;
    version: number;
  };
  status: 'active' | 'suspended' | 'archived';
  restrictions?: {
    maxTransactionAmount?: number;
    allowedTokens?: string[];
    dailyLimit?: number;
    requireApproval?: boolean;
  };
}

export interface WalletPermission {
  entityId: string;
  userId: string;
  permissions: ('read' | 'transfer' | 'trade' | 'admin')[];
  grantedAt: string;
  grantedBy: string;
  expiresAt?: string;
}

export interface ICustodialWalletService {
  createWallet(
    entityId: string,
    entityType: EntityType,
    owner: string,
    metadata?: any
  ): Promise<WalletEntity>;
  getWallet(entityId: string): Promise<WalletEntity | null>;
  getWalletsByOwner(owner: string): Promise<WalletEntity[]>;
  getKeypair(entityId: string, requesterId: string): Promise<any>;
  getPublicKey(entityId: string): Promise<any>;
  transferOwnership(entityId: string, currentOwner: string, newOwner: string): Promise<void>;
  grantPermission(
    entityId: string,
    userId: string,
    permissions: string[],
    grantedBy: string
  ): Promise<void>;
  revokePermission(entityId: string, userId: string, revokedBy: string): Promise<void>;
  hasPermission(entityId: string, userId: string, permission: string): Promise<boolean>;
  suspendWallet(entityId: string, suspendedBy: string, reason?: string): Promise<void>;
  reactivateWallet(entityId: string, reactivatedBy: string): Promise<void>;
  deleteWallet(entityId: string, deletedBy: string): Promise<void>;
  getBalance(entityId: string): Promise<number>;
  listWallets(userId: string): Promise<WalletEntity[]>;
}

// Pool/DeFi related types
export interface PoolInfo {
  id: string;
  name: string;
  tokenA: {
    mint: string;
    symbol: string;
    decimals: number;
  };
  tokenB: {
    mint: string;
    symbol: string;
    decimals: number;
  };
  liquidity: number;
  apr?: number;
  tvl?: number;
  fee?: number;
  protocol: string;
  dex?: string;
}
