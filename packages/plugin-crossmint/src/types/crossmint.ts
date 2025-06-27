// UUID type is not used in this file

// CrossMint API Configuration
export interface CrossMintConfig {
  apiKey: string;
  environment: 'sandbox' | 'production';
  projectId: string;
  baseUrl?: string;
  webhookSecret?: string;
  [key: string]: unknown; // Index signature for compatibility with Metadata
}

// X.402 Payment Protocol Types
export interface X402PaymentRequest {
  id: string;
  amount: string;
  currency: string;
  description?: string;
  metadata?: Record<string, any>;
  expiresAt?: number;
  redirectUrl?: string;
  webhookUrl?: string;
  network: string;
  tokenAddress?: string;
}

export interface X402PaymentResponse {
  id: string;
  status: 'pending' | 'completed' | 'failed' | 'expired';
  paymentLink: string;
  walletAddress: string;
  network: string;
  amount: string;
  currency: string;
  transactionHash?: string;
  blockNumber?: number;
  confirmations?: number;
  createdAt: string;
  updatedAt: string;
  expiresAt?: string;
  metadata?: Record<string, any>;
}

// CrossMint Wallet Types
export interface CrossMintWallet {
  id: string;
  type: 'custodial' | 'mpc';
  address: string;
  network: string;
  userId?: string;
  metadata?: Record<string, any>;
  createdAt: string;
  status: 'active' | 'inactive' | 'suspended';
}

export interface CrossMintWalletCreationParams {
  type: 'custodial' | 'mpc';
  network: string;
  userId?: string;
  metadata?: Record<string, any>;
}

// CrossMint Transaction Types
export interface CrossMintTransaction {
  id: string;
  walletId: string;
  type: 'transfer' | 'mint' | 'burn' | 'payment';
  status: 'pending' | 'confirmed' | 'failed';
  from: string;
  to: string;
  amount: string;
  currency: string;
  network: string;
  transactionHash?: string;
  blockNumber?: number;
  gasUsed?: string;
  gasPrice?: string;
  fee?: string;
  metadata?: Record<string, any>;
  createdAt: string;
  updatedAt: string;
}

export interface CrossMintTransferParams {
  walletId: string;
  to: string;
  amount: string;
  currency: string;
  network: string;
  metadata?: Record<string, any>;
}

// CrossMint NFT Types
export interface CrossMintNFT {
  id: string;
  tokenId: string;
  contractAddress: string;
  network: string;
  name: string;
  description?: string;
  image?: string;
  attributes?: Array<{
    trait_type: string;
    value: string | number;
  }>;
  owner: string;
  metadata?: Record<string, any>;
}

export interface CrossMintNFTMintParams {
  contractAddress: string;
  network: string;
  recipient: string;
  metadata: {
    name: string;
    description?: string;
    image?: string;
    attributes?: Array<{
      trait_type: string;
      value: string | number;
    }>;
  };
}

// CrossMint Collection Types
export interface CrossMintCollection {
  id: string;
  contractAddress: string;
  network: string;
  name: string;
  description?: string;
  symbol: string;
  totalSupply?: number;
  maxSupply?: number;
  mintPrice?: string;
  currency?: string;
  metadata?: Record<string, any>;
  createdAt: string;
}

// CrossMint Webhook Types
export interface CrossMintWebhookEvent {
  id: string;
  type:
    | 'payment.completed'
    | 'payment.failed'
    | 'transaction.confirmed'
    | 'wallet.created'
    | 'nft.minted';
  data: any;
  timestamp: string;
  signature?: string;
}

// CrossMint API Response Types
export interface CrossMintApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: any;
  };
  metadata?: {
    pagination?: {
      page: number;
      limit: number;
      total: number;
      hasMore: boolean;
    };
  };
}

// CrossMint Error Types
export class CrossMintError extends Error {
  constructor(
    message: string,
    public code?: string,
    public statusCode?: number,
    public details?: any
  ) {
    super(message);
    this.name = 'CrossMintError';
  }
}

export class CrossMintAuthError extends CrossMintError {
  constructor(message: string = 'Authentication failed') {
    super(message, 'AUTH_ERROR', 401);
    this.name = 'CrossMintAuthError';
  }
}

export class CrossMintValidationError extends CrossMintError {
  constructor(message: string, details?: any) {
    super(message, 'VALIDATION_ERROR', 400, details);
    this.name = 'CrossMintValidationError';
  }
}

export class CrossMintNetworkError extends CrossMintError {
  constructor(message: string, statusCode?: number) {
    super(message, 'NETWORK_ERROR', statusCode || 500);
    this.name = 'CrossMintNetworkError';
  }
}

// CrossMint Service Configuration
export interface CrossMintServiceConfig extends CrossMintConfig {
  retryAttempts?: number;
  retryDelay?: number;
  timeout?: number;
  enableWebhooks?: boolean;
  webhookEndpoint?: string;
  [key: string]: unknown; // Index signature for compatibility with Metadata
}

// Supported Networks and Currencies
export const CROSSMINT_NETWORKS = {
  ETHEREUM: 'ethereum',
  POLYGON: 'polygon',
  ARBITRUM: 'arbitrum',
  OPTIMISM: 'optimism',
  BASE: 'base',
  BSC: 'bsc',
  SOLANA: 'solana',
} as const;

export const CROSSMINT_CURRENCIES = {
  ETH: 'ETH',
  MATIC: 'MATIC',
  USDC: 'USDC',
  USDT: 'USDT',
  SOL: 'SOL',
  BNB: 'BNB',
} as const;

export type CrossMintNetwork = (typeof CROSSMINT_NETWORKS)[keyof typeof CROSSMINT_NETWORKS];
export type CrossMintCurrency = (typeof CROSSMINT_CURRENCIES)[keyof typeof CROSSMINT_CURRENCIES];
