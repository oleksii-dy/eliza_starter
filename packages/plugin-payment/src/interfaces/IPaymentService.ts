import { IAgentRuntime, UUID } from '@elizaos/core';
import {
  PaymentRequest,
  PaymentResult,
  PaymentStatus,
  PaymentMethod,
  PaymentConfiguration,
} from '../types';

/**
 * Core payment service interface for managing payments across different wallet providers
 */
export interface IPaymentService {
  /**
   * Service name identifier
   */
  readonly serviceName: string;

  /**
   * Initialize the payment service
   */
  initialize(runtime: IAgentRuntime): Promise<void>;

  /**
   * Process a payment request
   * @param request Payment request details
   * @param runtime Agent runtime instance
   * @returns Payment result with transaction details
   */
  processPayment(request: PaymentRequest, runtime: IAgentRuntime): Promise<PaymentResult>;

  /**
   * Check payment status
   * @param paymentId Payment identifier
   * @param runtime Agent runtime instance
   * @returns Current payment status
   */
  checkPaymentStatus(paymentId: UUID, runtime: IAgentRuntime): Promise<PaymentStatus>;

  /**
   * Get user balance across all supported payment methods
   * @param userId User identifier
   * @param runtime Agent runtime instance
   * @returns Balance information for each payment method
   */
  getUserBalance(userId: UUID, runtime: IAgentRuntime): Promise<Map<PaymentMethod, bigint>>;

  /**
   * Transfer funds from custodial wallet to main wallet
   * @param userId User identifier
   * @param amount Amount to transfer
   * @param method Payment method
   * @param runtime Agent runtime instance
   * @returns Transaction result
   */
  transferToMainWallet(
    userId: UUID,
    amount: bigint,
    method: PaymentMethod,
    runtime: IAgentRuntime
  ): Promise<PaymentResult>;

  /**
   * Create payment confirmation task
   * @param request Payment request
   * @param runtime Agent runtime instance
   * @returns Task ID for tracking confirmation
   */
  createPaymentConfirmationTask(request: PaymentRequest, runtime: IAgentRuntime): Promise<UUID>;

  /**
   * Validate if user has sufficient funds
   * @param userId User identifier
   * @param amount Required amount
   * @param method Payment method
   * @param runtime Agent runtime instance
   * @returns True if user has sufficient funds
   */
  hasSufficientFunds(
    userId: UUID,
    amount: bigint,
    method: PaymentMethod,
    runtime: IAgentRuntime
  ): Promise<boolean>;

  /**
   * Get payment configuration
   * @returns Current payment configuration
   */
  getConfiguration(): PaymentConfiguration;

  /**
   * Update payment configuration
   * @param config New configuration
   */
  updateConfiguration(config: Partial<PaymentConfiguration>): void;

  /**
   * Register payment webhook
   * @param paymentId Payment identifier
   * @param callback Callback function
   */
  registerWebhook(paymentId: UUID, callback: (result: PaymentResult) => Promise<void>): void;

  /**
   * Get payment history for a user
   * @param userId User identifier
   * @param limit Maximum number of records
   * @param offset Pagination offset
   * @param runtime Agent runtime instance
   * @returns List of payment results
   */
  getPaymentHistory(
    userId: UUID,
    limit: number,
    offset: number,
    runtime: IAgentRuntime
  ): Promise<PaymentResult[]>;

  /**
   * Liquidate tokens to preferred payment method
   * @param userId User identifier
   * @param fromMethod Source payment method
   * @param toMethod Target payment method
   * @param amount Amount to liquidate
   * @param runtime Agent runtime instance
   * @returns Liquidation result
   */
  liquidateToPreferredMethod(
    userId: UUID,
    fromMethod: PaymentMethod,
    toMethod: PaymentMethod,
    amount: bigint,
    runtime: IAgentRuntime
  ): Promise<PaymentResult>;

  /**
   * Stop the payment service
   */
  stop(): Promise<void>;
}
