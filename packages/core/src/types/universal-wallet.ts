import { Service } from './service';
import { UUID } from './primitives';

// Core universal wallet types
export interface UniversalPortfolio {
  totalValueUsd: number;
  chains: string[];
  assets: UniversalTokenBalance[];
  breakdown: {
    tokens: number;
    defi: number;
    nfts: number;
    staked: number;
  };
  change24h?: {
    amount: number;
    percent: number;
  };
}

export interface UniversalTokenBalance {
  address: string;
  symbol: string;
  name: string;
  decimals: number;
  balance: string; // Raw balance
  balanceFormatted: string; // Human readable
  valueUsd?: number;
  priceUsd?: number;
  chain: string;
  logoUri?: string;
  isNative: boolean;
}

export interface UniversalTransferParams {
  to: string;
  amount: string;
  tokenAddress?: string; // undefined for native token
  chain?: string;
  memo?: string;
  priority?: 'slow' | 'standard' | 'fast' | 'instant';
  gasLimit?: string;
  gasPrice?: string;
}

export interface SwapParams {
  fromToken: string;
  toToken: string;
  amount: string;
  chain: string;
  slippage?: number; // percentage
  recipient?: string;
  deadline?: number; // timestamp
}

export interface BridgeParams {
  fromChain: string;
  toChain: string;
  token: string;
  amount: string;
  recipient?: string;
  slippage?: number;
}

export interface UniversalTransactionParams {
  to: string;
  value?: string;
  data?: string;
  chain: string;
  gasLimit?: string;
  gasPrice?: string;
  maxFeePerGas?: string;
  maxPriorityFeePerGas?: string;
  nonce?: number;
}

export interface UniversalTransactionResult {
  hash: string;
  status: 'pending' | 'confirmed' | 'failed';
  chain: string;
  blockNumber?: number;
  gasUsed?: string;
  gasPrice?: string;
  fee?: string;
  confirmations?: number;
  timestamp?: number;
  error?: string;
}

export interface SimulationResult {
  success: boolean;
  gasUsed: string;
  gasPrice: string;
  changes: StateChange[];
  error?: string;
  warnings?: string[];
}

export interface StateChange {
  address: string;
  balanceBefore: string;
  balanceAfter: string;
  token?: string;
  type: 'balance' | 'approval' | 'storage';
}

export interface GasEstimate {
  gasLimit: string;
  gasPrice: string;
  maxFeePerGas?: string;
  maxPriorityFeePerGas?: string;
  estimatedCost: string;
  estimatedCostUsd?: number;
  estimatedTime?: number; // seconds
}

export interface ChainInfo {
  id: string;
  name: string;
  nativeToken: {
    symbol: string;
    name: string;
    decimals: number;
  };
  rpcUrls: string[];
  blockExplorerUrls: string[];
  isTestnet: boolean;
  bridgeSupport: string[]; // supported bridge protocols
}

// Wallet management types
export interface WalletInstance {
  id: UUID;
  address: string;
  type: 'eoa' | 'smart' | 'mpc' | 'multisig';
  name?: string;
  chain: string;
  metadata?: Record<string, any>;
  isActive: boolean;
  createdAt: number;
  lastUsedAt?: number;
}

export interface WalletCreationParams {
  type: 'eoa' | 'smart' | 'mpc';
  chain: string;
  name?: string;
  metadata?: Record<string, any>;
  owners?: string[]; // for multisig
  threshold?: number; // for multisig
}

export interface WalletImportParams {
  privateKey?: string;
  mnemonic?: string;
  address: string; // for watch-only
  chain: string;
  name?: string;
  metadata?: Record<string, any>;
}

export interface WalletFilter {
  type?: WalletInstance['type'];
  chain?: string;
  isActive?: boolean;
}

// Session management types
export interface SessionParams {
  walletId: UUID;
  permissions: SessionPermission[];
  expiresAt: number;
  spendingLimits?: SpendingLimit[];
  allowedContracts?: string[];
  allowedMethods?: string[];
}

export interface SessionPermission {
  action: 'transfer' | 'swap' | 'bridge' | 'defi' | 'nft' | 'custom';
  target?: string;
  valueLimit?: string;
  gasLimit?: string;
  restrictions?: Record<string, any>;
}

export interface SpendingLimit {
  token: string;
  amount: string;
  period: 'hourly' | 'daily' | 'weekly' | 'monthly' | 'total';
  spent?: string;
  resetAt?: number;
}

export interface SessionKey {
  id: UUID;
  publicKey: string;
  permissions: SessionPermission[];
  expiresAt: number;
  createdAt: number;
  isActive: boolean;
  usageCount: number;
  lastUsedAt?: number;
  spendingLimits?: SpendingLimit[];
}

// X.402 Payment Protocol types
export interface PaymentRequestParams {
  amount: string;
  currency: string;
  network: string;
  recipient?: string;
  memo?: string;
  expiresAt?: number;
  protocol?: 'x402' | 'standard';
}

export interface UniversalPaymentRequest {
  id: UUID;
  amount: string;
  currency: string;
  network: string;
  recipient?: string;
  memo?: string;
  expiresAt?: number;
  createdAt: number;
  status: 'pending' | 'paid' | 'expired' | 'cancelled';
  x402Data?: {
    scheme: string;
    network: string;
    payload: string;
  };
  paymentUrl?: string;
}

export interface PaymentResult {
  success: boolean;
  paymentId: UUID;
  transactionHash?: string;
  protocol: 'x402' | 'standard';
  amount: string;
  currency: string;
  network: string;
  fee?: string;
  settlementTime?: number;
  confirmations?: number;
  error?: string;
}

export interface PaymentVerification {
  valid: boolean;
  paymentId: UUID;
  transactionHash?: string;
  amount: string;
  currency: string;
  network: string;
  confirmations: number;
  settlementTime?: number;
  x402Compliant?: boolean;
  error?: string;
}

// Wallet capabilities
export enum WalletCapability {
  TRANSFER = 'transfer',
  SWAP = 'swap',
  BRIDGE = 'bridge',
  STAKING = 'staking',
  LENDING = 'lending',
  NFT = 'nft',
  GOVERNANCE = 'governance',
  DEFI = 'defi',
  MULTISIG = 'multisig',
  SESSION_KEYS = 'session_keys',
  GAS_ABSTRACTION = 'gas_abstraction',
  BATCH_TRANSACTIONS = 'batch_transactions',
  X402_PAYMENTS = 'x402_payments',
  MPC_WALLET = 'mpc_wallet',
}

// Chain adapter interface
export interface ChainAdapter {
  readonly chainId: string;
  readonly name: string;
  readonly nativeToken: string;
  readonly capabilities: WalletCapability[];

  // Core operations
  getBalance(address: string, tokenAddress?: string): Promise<UniversalTokenBalance>;
  transfer(params: UniversalTransferParams): Promise<UniversalTransactionResult>;
  sendTransaction(params: UniversalTransactionParams): Promise<UniversalTransactionResult>;

  // Advanced operations
  estimateGas(params: UniversalTransactionParams): Promise<GasEstimate>;
  simulateTransaction(params: UniversalTransactionParams): Promise<SimulationResult>;

  // Optional operations
  swap?(params: SwapParams): Promise<UniversalTransactionResult>;
  stake?(params: any): Promise<UniversalTransactionResult>;
  unstake?(params: any): Promise<UniversalTransactionResult>;
}

// Universal wallet service interface
export interface IUniversalWalletService extends Service {
  // Core identification
  readonly chainSupport: string[];
  readonly capabilities: WalletCapability[];

  // Portfolio management
  getPortfolio(owner?: string): Promise<UniversalPortfolio>;
  getBalances(owner?: string): Promise<UniversalTokenBalance[]>;

  // Transaction operations
  transfer(params: UniversalTransferParams): Promise<UniversalTransactionResult>;
  swap(params: SwapParams): Promise<UniversalTransactionResult>;
  bridge(params: BridgeParams): Promise<UniversalTransactionResult>;
  sendTransaction(params: UniversalTransactionParams): Promise<UniversalTransactionResult>;

  // Transaction utilities
  simulateTransaction(params: UniversalTransactionParams): Promise<SimulationResult>;
  estimateGas(params: UniversalTransactionParams): Promise<GasEstimate>;
  getTransaction(hash: string, chain?: string): Promise<UniversalTransactionResult>;

  // Multi-chain support
  getSupportedChains(): Promise<ChainInfo[]>;
  switchChain(chainId: string): Promise<void>;
  isChainSupported(chainId: string): boolean;

  // Payment protocol support (X.402)
  createPaymentRequest?(params: PaymentRequestParams): Promise<UniversalPaymentRequest>;
  processPayment?(request: UniversalPaymentRequest): Promise<PaymentResult>;
  verifyPayment?(paymentId: string): Promise<PaymentVerification>;

  // Wallet management
  createWallet?(params: WalletCreationParams): Promise<WalletInstance>;
  importWallet?(params: WalletImportParams): Promise<WalletInstance>;
  getWallets?(filter?: WalletFilter): Promise<WalletInstance[]>;
  deleteWallet?(walletId: UUID): Promise<boolean>;

  // Security & sessions
  createSession?(params: SessionParams): Promise<SessionKey>;
  validateSession?(sessionId: string, operation: string): Promise<boolean>;
  revokeSession?(sessionId: string): Promise<void>;
  listSessions?(walletId?: UUID): Promise<SessionKey[]>;
}

// Re-export core types that are used by universal wallet
export type { Service, ServiceType } from './service';
export type { UUID } from './primitives';
