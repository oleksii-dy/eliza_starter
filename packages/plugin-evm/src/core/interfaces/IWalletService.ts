import {
  IWalletService as BaseWalletService,
  WalletPortfolio,
  IAgentRuntime,
  Memory,
  State,
  UUID,
} from '@elizaos/core';
import { Address, Hash, Hex } from 'viem';
import { Chain } from 'viem/chains';

// Advanced wallet types
export interface WalletInstance {
  id: UUID;
  address: Address;
  type: 'eoa' | 'safe' | 'aa' | 'multisig';
  name?: string;
  metadata?: Record<string, any>;
  createdAt: number;
  lastUsedAt: number;
  isActive: boolean;
  chain?: number;
  owners?: Address[]; // For multisig/safe wallets
  threshold?: number; // For multisig/safe wallets
}

export interface WalletCreationParams {
  type: 'eoa' | 'safe' | 'aa';
  name?: string;
  chain?: Chain;
  owners?: Address[]; // For multisig
  threshold?: number; // For multisig
  metadata?: Record<string, any>;
}

export interface WalletImportParams {
  privateKey?: Hex;
  mnemonic?: string;
  address?: Address; // For watch-only wallets
  name?: string;
  metadata?: Record<string, any>;
}

export interface SmartWalletParams {
  type: 'safe' | 'aa';
  owners: Address[];
  threshold: number;
  chain: Chain;
  salt?: Hex; // For deterministic deployment
  modules?: Address[]; // Safe modules or AA plugins
}

export interface SessionParams {
  walletId: UUID;
  permissions: SessionPermission[];
  expiresAt: number;
  spendingLimit?: {
    token: Address;
    amount: bigint;
    period: 'daily' | 'weekly' | 'monthly' | 'total';
  }[];
  allowedContracts?: Address[];
  allowedMethods?: string[];
}

export interface SessionPermission {
  action: 'transfer' | 'swap' | 'bridge' | 'defi' | 'nft' | 'custom';
  type?: string; // Action type for generic permission checking
  target?: Address; // Target contract or address
  valueLimit?: string | bigint; // Max transaction value
  gasLimit?: string | bigint; // Max gas limit
  chainId?: number; // Specific chain ID
  restrictions?: Record<string, any>;
}

export interface SessionKey {
  id: UUID;
  publicKey: Hex;
  permissions: SessionPermission[];
  expiresAt: number;
  createdAt: number;
  isActive: boolean;
  usageCount: number;
  lastUsedAt?: number;
}

export interface WalletSession {
  id: UUID;
  walletId: UUID | Address;
  sessionKey: Address;
  permissions: SessionPermission[];
  expiresAt: number;
  createdAt: number;
  lastUsedAt: number;
  isActive: boolean;
  name?: string;
  metadata?: Record<string, any>;
}

export interface TransactionRequest {
  from?: Address;
  to: Address;
  value?: bigint;
  data?: Hex;
  gas?: bigint;
  gasPrice?: bigint;
  maxFeePerGas?: bigint;
  maxPriorityFeePerGas?: bigint;
  nonce?: number;
  chainId?: number;
}

export interface SimulationResult {
  success: boolean;
  gasUsed: bigint;
  gasPrice: bigint;
  error?: string;
  logs?: any[];
  stateChanges?: StateChange[];
  warnings?: string[];
}

export interface StateChange {
  address: Address;
  key: Hex;
  oldValue: Hex;
  newValue: Hex;
}

export interface TransactionHistory {
  hash: Hash;
  from: Address;
  to: Address;
  value: bigint;
  data?: Hex;
  blockNumber: number;
  timestamp: number;
  gasUsed: bigint;
  gasPrice: bigint;
  status: 'success' | 'failed' | 'pending';
  method?: string;
  decodedInput?: any;
  logs?: any[];
}

export interface HistoryParams {
  wallet: Address;
  chains?: Chain[];
  fromBlock?: number;
  toBlock?: number;
  limit?: number;
  offset?: number;
  includeInternal?: boolean;
  includeTokenTransfers?: boolean;
}

export interface DefiPosition {
  protocol: string;
  protocolId: string;
  chain: Chain;
  type: 'lending' | 'borrowing' | 'liquidity' | 'staking' | 'farming' | 'vault';
  positions: {
    tokenAddress: Address;
    tokenSymbol: string;
    amount: bigint;
    valueUSD: number;
    apy?: number;
    rewards?: RewardInfo[];
  }[];
  totalValueUSD: number;
  claimableRewards?: RewardInfo[];
}

export interface RewardInfo {
  tokenAddress: Address;
  tokenSymbol: string;
  amount: bigint;
  valueUSD: number;
}

export interface NFTHolding {
  contractAddress: Address;
  tokenId: string;
  name?: string;
  description?: string;
  imageUrl?: string;
  animationUrl?: string;
  attributes?: Record<string, any>;
  chain: Chain;
  owner: Address;
  collection?: {
    name: string;
    slug: string;
    imageUrl?: string;
    floorPrice?: number;
  };
}

export interface WalletFilter {
  type?: WalletInstance['type'];
  chain?: number;
  isActive?: boolean;
  owner?: Address; // For filtering multisig wallets by owner
}

export interface GasEstimation {
  gasLimit: bigint;
  baseFee: bigint;
  priorityFee: bigint;
  maxFee: bigint;
  estimatedCost: bigint;
  estimatedCostUSD: number;
}

export interface BatchTransactionParams {
  transactions: TransactionRequest[];
  atomicity?: 'all-or-nothing' | 'independent';
}

// Extended wallet service interface
export interface IWalletService extends BaseWalletService {
  // Multi-wallet management
  createWallet(params: WalletCreationParams): Promise<WalletInstance>;
  importWallet(params: WalletImportParams): Promise<WalletInstance>;
  listWallets(filter?: WalletFilter): Promise<WalletInstance[]>;
  getWallet(walletId: UUID): Promise<WalletInstance | null>;
  updateWallet(walletId: UUID, updates: Partial<WalletInstance>): Promise<WalletInstance>;
  deleteWallet(walletId: UUID): Promise<boolean>;
  setActiveWallet(walletId: UUID): Promise<void>;
  getActiveWallet(): Promise<WalletInstance | null>;

  // Smart wallet support
  deploySmartWallet(params: SmartWalletParams): Promise<WalletInstance>;
  addOwner(walletAddress: Address, newOwner: Address): Promise<Hash>;
  removeOwner(walletAddress: Address, owner: Address): Promise<Hash>;
  changeThreshold(walletAddress: Address, newThreshold: number): Promise<Hash>;
  isSmartWallet(address: Address): Promise<boolean>;
  getSmartWalletInfo(address: Address): Promise<{
    type: 'safe' | 'aa' | 'unknown';
    owners?: Address[];
    threshold?: number;
    modules?: Address[];
    version?: string;
  }>;

  // Session management
  createSession(params: SessionParams): Promise<SessionKey>;
  getSession(sessionId: UUID): Promise<SessionKey | null>;
  listSessions(walletId?: UUID): Promise<SessionKey[]>;
  validateSession(sessionId: UUID, action: SessionPermission): Promise<boolean>;
  updateSession(sessionId: UUID, updates: Partial<SessionKey>): Promise<SessionKey>;
  revokeSession(sessionId: UUID): Promise<void>;
  revokeAllSessions(walletId?: UUID): Promise<void>;

  // Advanced transaction features
  simulateTransaction(
    tx: TransactionRequest,
    options?: {
      includeTrace?: boolean;
      includeLogs?: boolean;
      forkBlock?: number;
    }
  ): Promise<SimulationResult>;

  estimateGasWithBuffer(tx: TransactionRequest, bufferPercent?: number): Promise<GasEstimation>;

  sendTransaction(
    tx: TransactionRequest,
    options?: {
      waitForConfirmation?: boolean;
      confirmations?: number;
      sessionId?: UUID;
    }
  ): Promise<Hash>;

  sendBatchTransaction(params: BatchTransactionParams): Promise<Hash[]>;

  getTransactionHistory(params: HistoryParams): Promise<TransactionHistory[]>;

  getTransactionReceipt(hash: Hash, chain?: Chain): Promise<any>;

  // DeFi and NFT positions
  getDefiPositions(wallet: Address, chains?: Chain[]): Promise<DefiPosition[]>;
  getNFTHoldings(wallet: Address, chains?: Chain[]): Promise<NFTHolding[]>;

  // Enhanced portfolio features
  getPortfolioValue(
    wallet: Address,
    chains?: Chain[]
  ): Promise<{
    totalValueUSD: number;
    breakdown: {
      tokens: number;
      defi: number;
      nfts: number;
    };
    change24h: {
      amount: number;
      percent: number;
    };
  }>;

  // Gas and network optimization
  getOptimalGasPrice(chain: Chain): Promise<{
    slow: bigint;
    standard: bigint;
    fast: bigint;
    instant: bigint;
  }>;

  estimateTransactionTime(gasPrice: bigint, chain: Chain): Promise<number>;

  // Utility methods
  isContract(address: Address, chain?: Chain): Promise<boolean>;
  getENSName(address: Address): Promise<string | null>;
  resolveENS(name: string): Promise<Address | null>;
}

// Export convenience types
export type { WalletPortfolio, IAgentRuntime, Memory, State, UUID } from '@elizaos/core';
