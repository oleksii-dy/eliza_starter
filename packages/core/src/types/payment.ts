import type { UUID } from './primitives';
import type { TrustScore } from './trust';
import type { IdentityProfile } from './identity';

/**
 * Payment methods supported by the system
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
 * Payment status throughout the lifecycle
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
 * Payment transaction record
 */
export interface PaymentTransaction {
  id: UUID;
  entityId: UUID; // Who made the payment
  agentId: UUID; // Which agent processed it
  amount: string; // Amount in token units (as string for precision)
  usdAmount: string; // USD equivalent at time of payment
  method: PaymentMethod;
  status: PaymentStatus;
  transactionHash?: string; // Blockchain transaction hash
  blockNumber?: number; // Block confirmation
  confirmations?: number; // Number of confirmations
  gasUsed?: string; // Gas used for transaction
  gasFee?: string; // Gas fee paid
  purpose: string; // What the payment was for
  actionName?: string; // Action that triggered payment
  metadata?: Record<string, any>; // Additional context
  createdAt: number;
  updatedAt: number;
  completedAt?: number;
  expiresAt?: number;
}

/**
 * Payment request/requirement
 */
export interface PaymentRequest {
  id: UUID;
  entityId: UUID;
  agentId: UUID;
  amount: string; // Amount required
  method: PaymentMethod;
  purpose: string; // What payment is for
  description?: string; // Human-readable description
  actionName?: string; // Action requiring payment
  expiresAt: number; // When request expires
  autoApprove?: boolean; // Whether to auto-approve if conditions met
  trustRequirements?: PaymentTrustRequirements;
  metadata?: Record<string, any>;
  status: 'pending' | 'approved' | 'denied' | 'expired';
  createdAt: number;
}

/**
 * Trust requirements for payment decisions
 */
export interface PaymentTrustRequirements {
  minimumTrustScore?: number; // Minimum overall trust score
  paymentHistory?: number; // Minimum successful payments
  accountAge?: number; // Minimum account age in days
  verifiedIdentity?: boolean; // Require verified identity
  maxDailyAmount?: string; // Maximum daily spending
  exemptRoles?: string[]; // Roles exempt from requirements
}

/**
 * User payment profile and history
 */
export interface PaymentProfile {
  entityId: UUID;
  totalSpent: string; // Total amount spent (USD)
  totalTransactions: number; // Number of transactions
  successfulTransactions: number; // Number of successful transactions
  failedTransactions: number; // Number of failed transactions
  averageTransactionSize: string; // Average transaction size (USD)
  lastPaymentAt?: number; // Last payment timestamp
  firstPaymentAt?: number; // First payment timestamp
  preferredMethod?: PaymentMethod; // Preferred payment method
  dailySpendingLimit: string; // Daily spending limit (USD)
  dailySpentToday: string; // Amount spent today (USD)
  monthlySpentThisMonth: string; // Amount spent this month (USD)
  paymentTrustScore?: number; // Payment-specific trust score
  identityProfile?: IdentityProfile; // Associated identity
  overallTrustScore?: TrustScore; // General trust score
  riskLevel: PaymentRiskLevel; // Risk assessment
  settings: PaymentSettings; // User preferences
  wallets: PaymentWallet[]; // Associated wallets
  createdAt: number;
  updatedAt: number;
}

/**
 * Payment risk assessment levels
 */
export enum PaymentRiskLevel {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  PROHIBITED = 'PROHIBITED',
}

/**
 * User payment settings and preferences
 */
export interface PaymentSettings {
  autoApproveUnder: string; // Auto-approve payments under this amount (USD)
  requireConfirmationOver: string; // Require confirmation over this amount (USD)
  preferredMethods: PaymentMethod[]; // Preferred payment methods in order
  enableDailyLimits: boolean; // Whether daily limits are enforced
  enableNotifications: boolean; // Whether to send payment notifications
  requireVerification: boolean; // Whether to require identity verification
  allowSubscriptions: boolean; // Whether to allow recurring payments
  metadata?: Record<string, any>; // Additional settings
}

/**
 * Wallet information for payments
 */
export interface PaymentWallet {
  id: UUID;
  entityId: UUID;
  address: string; // Wallet address
  chain: string; // Blockchain network
  method: PaymentMethod; // Associated payment method
  balance?: string; // Current balance (if tracked)
  balanceUSD?: string; // Balance in USD
  isActive: boolean; // Whether wallet is active
  isVerified: boolean; // Whether wallet ownership is verified
  lastUsed?: number; // Last usage timestamp
  createdAt: number;
  metadata?: Record<string, any>;
}

/**
 * Payment confirmation flow
 */
export interface PaymentConfirmation {
  id: UUID;
  paymentRequestId: UUID;
  entityId: UUID;
  method: PaymentConfirmationMethod;
  status: 'pending' | 'confirmed' | 'denied' | 'expired';
  challengeData?: Record<string, any>; // Method-specific challenge data
  response?: Record<string, any>; // User response
  expiresAt: number;
  createdAt: number;
  completedAt?: number;
}

/**
 * Methods for confirming payments
 */
export enum PaymentConfirmationMethod {
  FORM = 'FORM', // Web form confirmation
  TASK = 'TASK', // Task-based confirmation
  OAUTH = 'OAUTH', // OAuth identity confirmation
  SIGNATURE = 'SIGNATURE', // Cryptographic signature
  AUTO = 'AUTO', // Automatic based on trust
}

/**
 * Payment analytics and insights
 */
export interface PaymentAnalytics {
  entityId: UUID;
  period: string; // 'day', 'week', 'month', 'year'
  totalVolume: string; // Total payment volume (USD)
  transactionCount: number; // Number of transactions
  averageTransaction: string; // Average transaction size
  successRate: number; // Success rate percentage
  topMethods: Array<{ method: PaymentMethod; count: number; volume: string }>;
  spendingTrend: Array<{ date: string; amount: string }>;
  riskEvents: number; // Number of risk events
  trustScoreChange: number; // Change in trust score
  generatedAt: number;
}

/**
 * Core payment provider interface
 */
export interface IPaymentProvider {
  /**
   * Process a payment request
   */
  processPayment(request: PaymentRequest): Promise<PaymentTransaction>;

  /**
   * Check if user can make a payment
   */
  canMakePayment(entityId: UUID, amount: string, method: PaymentMethod): Promise<boolean>;

  /**
   * Get payment profile for user
   */
  getPaymentProfile(entityId: UUID): Promise<PaymentProfile>;

  /**
   * Get payment history for user
   */
  getPaymentHistory(entityId: UUID, limit?: number, offset?: number): Promise<PaymentTransaction[]>;

  /**
   * Check user's balance for a payment method
   */
  getUserBalance(entityId: UUID, method: PaymentMethod): Promise<string>;

  /**
   * Create payment confirmation flow
   */
  createPaymentConfirmation(request: PaymentRequest): Promise<PaymentConfirmation>;

  /**
   * Update payment settings for user
   */
  updatePaymentSettings(entityId: UUID, settings: Partial<PaymentSettings>): Promise<void>;

  /**
   * Get payment analytics for user
   */
  getPaymentAnalytics(entityId: UUID, period: string): Promise<PaymentAnalytics>;

  /**
   * Assess payment risk for user and transaction
   */
  assessPaymentRisk(entityId: UUID, amount: string, method: PaymentMethod): Promise<PaymentRiskLevel>;
}

/**
 * Payment event types for tracking
 */
export enum PaymentEventType {
  PAYMENT_INITIATED = 'PAYMENT_INITIATED',
  PAYMENT_CONFIRMED = 'PAYMENT_CONFIRMED',
  PAYMENT_COMPLETED = 'PAYMENT_COMPLETED',
  PAYMENT_FAILED = 'PAYMENT_FAILED',
  PAYMENT_CANCELLED = 'PAYMENT_CANCELLED',
  PAYMENT_REFUNDED = 'PAYMENT_REFUNDED',
  DAILY_LIMIT_REACHED = 'DAILY_LIMIT_REACHED',
  RISK_EVENT_DETECTED = 'RISK_EVENT_DETECTED',
  WALLET_CONNECTED = 'WALLET_CONNECTED',
  IDENTITY_VERIFIED = 'IDENTITY_VERIFIED',
}

/**
 * Payment event for audit trail
 */
export interface PaymentEvent {
  id: UUID;
  type: PaymentEventType;
  entityId: UUID;
  agentId: UUID;
  transactionId?: UUID;
  amount?: string;
  method?: PaymentMethod;
  metadata?: Record<string, any>;
  timestamp: number;
}

/**
 * Subscription payment configuration
 */
export interface PaymentSubscription {
  id: UUID;
  entityId: UUID;
  agentId: UUID;
  amount: string; // Amount per billing cycle
  method: PaymentMethod;
  interval: 'daily' | 'weekly' | 'monthly' | 'yearly';
  purpose: string; // What subscription is for
  isActive: boolean;
  lastChargedAt?: number;
  nextChargeAt: number;
  failedAttempts: number;
  maxFailedAttempts: number;
  createdAt: number;
  cancelledAt?: number;
  metadata?: Record<string, any>;
}