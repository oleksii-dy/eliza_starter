import { UUID, Memory } from '@elizaos/core';

/**
 * Supported payment methods
 */
export enum PaymentMethod {
  USDC_ETH = 'USDC_ETH',
  USDC_SOL = 'USDC_SOL',
  ETH = 'ETH',
  SOL = 'SOL',
  BTC = 'BTC',
  MATIC = 'MATIC',
  ARB = 'ARB',
  OP = 'OP',
  BASE = 'BASE',
  OTHER = 'OTHER',
}

/**
 * Payment status enum
 */
export enum PaymentStatus {
  PENDING = 'PENDING',
  PROCESSING = 'PROCESSING',
  CONFIRMING = 'CONFIRMING',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
  CANCELLED = 'CANCELLED',
  REFUNDED = 'REFUNDED',
  EXPIRED = 'EXPIRED',
}

/**
 * Payment request structure
 */
export interface PaymentRequest {
  id: UUID;
  userId: UUID;
  agentId: UUID;
  actionName: string;
  amount: bigint;
  method: PaymentMethod;
  recipientAddress?: string;
  metadata?: Record<string, any>;
  expiresAt?: number;
  requiresConfirmation?: boolean;
  trustRequired?: boolean;
  minimumTrustLevel?: number;
}

/**
 * Payment result structure
 */
export interface PaymentResult {
  id: UUID;
  requestId: UUID;
  status: PaymentStatus;
  transactionHash?: string;
  blockNumber?: number;
  confirmations?: number;
  amount: bigint;
  method: PaymentMethod;
  fromAddress: string;
  toAddress: string;
  fee?: bigint;
  timestamp: number;
  error?: string;
  metadata?: Record<string, any>;
}

/**
 * Payment configuration
 */
export interface PaymentConfiguration {
  enabled: boolean;
  preferredMethods: PaymentMethod[];
  minimumConfirmations: Map<PaymentMethod, number>;
  maxTransactionAmount: Map<PaymentMethod, bigint>;
  requireConfirmationAbove: Map<PaymentMethod, bigint>;
  feePercentage: number;
  feeRecipient?: string;
  webhookUrl?: string;
  timeoutSeconds: number;
}

/**
 * Payment middleware options
 */
export interface PaymentMiddlewareOptions {
  amount: bigint;
  method?: PaymentMethod;
  requiresConfirmation?: boolean;
  trustRequired?: boolean;
  minimumTrustLevel?: number;
  skipForOwner?: boolean;
  skipForAdmin?: boolean;
  metadata?: Record<string, any>;
}

/**
 * Payment decorator options
 */
export interface PaymentDecoratorOptions extends PaymentMiddlewareOptions {
  actionName?: string;
}

/**
 * Transaction result structure
 */
export interface TransactionResult {
  hash: string;
  status: PaymentStatus;
  confirmations: number;
  blockNumber?: number;
}

/**
 * Wallet adapter interface for integrating different wallet services
 */
export interface IWalletAdapter {
  name: string;
  supportedMethods: PaymentMethod[];

  initialize?(): Promise<void>;

  getBalance(address: string, method: PaymentMethod): Promise<bigint>;

  sendTransaction(
    fromAddress: string,
    toAddress: string,
    amount: bigint,
    method: PaymentMethod,
    privateKey?: string
  ): Promise<TransactionResult>;

  getTransaction(hash: string): Promise<TransactionResult>;

  createWallet(): Promise<{
    address: string;
    privateKey: string;
  }>;

  validateAddress(address: string, method: PaymentMethod): boolean;
}

/**
 * Payment event types
 */
export enum PaymentEventType {
  PAYMENT_REQUESTED = 'PAYMENT_REQUESTED',
  PAYMENT_PROCESSING = 'PAYMENT_PROCESSING',
  PAYMENT_CONFIRMED = 'PAYMENT_CONFIRMED',
  PAYMENT_COMPLETED = 'PAYMENT_COMPLETED',
  PAYMENT_FAILED = 'PAYMENT_FAILED',
  PAYMENT_CANCELLED = 'PAYMENT_CANCELLED',
  PAYMENT_REFUNDED = 'PAYMENT_REFUNDED',
  BALANCE_UPDATED = 'BALANCE_UPDATED',
}

/**
 * Payment event structure
 */
export interface PaymentEvent {
  type: PaymentEventType;
  paymentId: UUID;
  userId: UUID;
  agentId: UUID;
  timestamp: number;
  data: Record<string, any>;
}

/**
 * Payment form data for secrets manager integration
 */
export interface PaymentFormData {
  paymentId: UUID;
  amount: string;
  method: PaymentMethod;
  recipientName?: string;
  recipientAddress?: string;
  message?: string;
  requiresApproval: boolean;
}

/**
 * Payment transaction record
 */
export interface PaymentTransaction {
  id: UUID;
  payerId: UUID;
  recipientId: UUID;
  amount: number;
  currency: string;
  status: PaymentStatus;
  method: PaymentMethod;
  transactionHash?: string;
  blockNumber?: number;
  confirmations?: number;
  fee?: number;
  createdAt: number;
  completedAt?: number;
  error?: string;
  metadata?: Record<string, any>;
}

/**
 * Payment settings
 */
export interface PaymentSettings {
  autoApprovalEnabled: boolean;
  autoApprovalThreshold: number;
  defaultCurrency: string;
  requireConfirmation: boolean;
  trustThreshold: number;
  maxDailySpend: number;
  preferredNetworks: string[];
  feeStrategy: 'low' | 'standard' | 'fast';
}

/**
 * Payment history
 */
export interface PaymentHistory {
  transactions: PaymentTransaction[];
  total: number;
  offset: number;
  limit: number;
}

/**
 * Payment confirmation
 */
export interface PaymentConfirmation {
  paymentId: UUID;
  approved: boolean;
  approvedBy: UUID;
  approvedAt: number;
  reason?: string;
}

/**
 * Payment capabilities
 */
export interface PaymentCapabilities {
  supportedMethods: PaymentMethod[];
  supportedCurrencies: string[];
  features: {
    autoApproval: boolean;
    trustBasedLimits: boolean;
    secureConfirmation: boolean;
    recurringPayments: boolean;
    batchPayments: boolean;
    escrow: boolean;
  };
  limits: {
    minAmount: number;
    maxAmount: number;
    dailyLimit: number;
  };
}

/**
 * Payment validation result
 */
export interface PaymentValidation {
  isValid: boolean;
  error?: string;
  warnings?: string[];
}
