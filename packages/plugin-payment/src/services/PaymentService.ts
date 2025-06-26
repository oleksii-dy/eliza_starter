import {
  type IAgentRuntime,
  type UUID,
  Service,
  ServiceType,
  asUUID,
  elizaLogger as logger,
  type TaskWorker,
} from '@elizaos/core';
import { IPaymentService } from '../interfaces/IPaymentService';
import {
  type PaymentRequest,
  type PaymentResult,
  PaymentStatus,
  PaymentMethod,
  type PaymentConfiguration,
  PaymentEventType,
  type PaymentEvent,
  type IWalletAdapter,
  type PaymentTransaction,
  type PaymentSettings,
  type PaymentConfirmation,
  type PaymentCapabilities,
  type PaymentValidation,
} from '../types';
import { v4 as uuidv4 } from 'uuid';
import { EventEmitter } from 'events';
import { eq, and, desc, sql } from 'drizzle-orm';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import {
  paymentTransactions,
  paymentRequests,
  userWallets,
  dailySpending,
  type NewPaymentTransaction,
  type NewPaymentRequest,
} from '../database/schema';
import { decrypt, encrypt } from '../utils/encryption';

/**
 * Main payment service implementation with proper database integration
 */
export class PaymentService extends Service implements IPaymentService {
  static serviceName = 'payment';
  static serviceType = ServiceType.UNKNOWN;

  public readonly serviceName = PaymentService.serviceName;
  public readonly serviceType = PaymentService.serviceType;
  public readonly capabilityDescription = 'Payment processing and wallet management service';

  declare protected runtime: IAgentRuntime;
  private walletAdapters: Map<string, IWalletAdapter> = new Map();
  private eventEmitter: EventEmitter = new EventEmitter();

  // Database instance
  private db!: PostgresJsDatabase<any>;

  // Settings
  private settings: PaymentSettings;

  // Services (will be loaded dynamically)
  private trustService: any;
  private taskService: any;
  private secretFormService: any;

  constructor() {
    super();
    this.settings = this.getDefaultSettings();
  }

  private getDefaultSettings(): PaymentSettings {
    return {
      autoApprovalEnabled: false,
      autoApprovalThreshold: 10,
      defaultCurrency: 'USDC',
      requireConfirmation: true,
      trustThreshold: 70,
      maxDailySpend: 1000,
      preferredNetworks: ['ethereum', 'solana'],
      feeStrategy: 'standard',
    };
  }

  async initialize(runtime: IAgentRuntime): Promise<void> {
    this.runtime = runtime;

    // Get database instance
    const dbService = runtime.getService('database') as any;
    this.db = dbService?.getDatabase?.();

    if (!this.db) {
      logger.error('[PaymentService] No database service available!');
      throw new Error('Database service is required for PaymentService');
    }

    // Load settings from runtime
    this.loadSettings();

    // Initialize wallet adapters
    await this.initializeWalletAdapters();

    // Get optional services
    this.trustService = runtime.getService('trust');
    this.taskService = runtime.getService('task');
    this.secretFormService = runtime.getService('SECRET_FORMS');

    // Start monitoring
    this.startPaymentMonitoring();

    logger.info('[PaymentService] Initialized', {
      adapters: Array.from(this.walletAdapters.keys()),
      trustEnabled: !!this.trustService,
      taskEnabled: !!this.taskService,
      formsEnabled: !!this.secretFormService,
      databaseEnabled: !!this.db,
    });
  }

  private loadSettings(): void {
    const getSetting = (key: string, defaultValue: any) =>
      this.runtime.getSetting(key) || defaultValue;

    this.settings = {
      autoApprovalEnabled: getSetting('PAYMENT_AUTO_APPROVAL_ENABLED', 'false') === 'true',
      autoApprovalThreshold: parseFloat(getSetting('PAYMENT_AUTO_APPROVAL_THRESHOLD', '10')),
      defaultCurrency: getSetting('PAYMENT_DEFAULT_CURRENCY', 'USDC'),
      requireConfirmation: getSetting('PAYMENT_REQUIRE_CONFIRMATION', 'true') !== 'false',
      trustThreshold: parseFloat(getSetting('PAYMENT_TRUST_THRESHOLD', '70')),
      maxDailySpend: parseFloat(getSetting('PAYMENT_MAX_DAILY_SPEND', '1000')),
      preferredNetworks: getSetting('PAYMENT_PREFERRED_NETWORKS', 'ethereum,solana').split(','),
      feeStrategy: getSetting('PAYMENT_FEE_STRATEGY', 'standard') as any,
    };
  }

  private async initializeWalletAdapters(): Promise<void> {
    try {
      // Try to load EVM adapter
      const { EVMWalletAdapter } = await import('../adapters/EVMWalletAdapter');
      const evmAdapter = new EVMWalletAdapter(this.runtime);
      await evmAdapter.initialize();
      this.walletAdapters.set('evm', evmAdapter);
    } catch (error) {
      logger.warn('[PaymentService] Failed to initialize EVM adapter', error);
    }

    try {
      // Try to load Solana adapter
      const { SolanaWalletAdapter } = await import('../adapters/SolanaWalletAdapter');
      const solanaAdapter = new SolanaWalletAdapter(this.runtime);
      await solanaAdapter.initialize();
      this.walletAdapters.set('solana', solanaAdapter);
    } catch (error) {
      logger.warn('[PaymentService] Failed to initialize Solana adapter', error);
    }

    try {
      // Try to load AgentKit adapter
      const { AgentKitWalletAdapter } = await import('../adapters/AgentKitWalletAdapter');
      const agentKitAdapter = new AgentKitWalletAdapter(this.runtime);
      await agentKitAdapter.initialize();
      this.walletAdapters.set('agentkit', agentKitAdapter);
    } catch (error) {
      logger.warn('[PaymentService] Failed to initialize AgentKit adapter', error);
    }

    try {
      // Try to load Crossmint adapter
      const { CrossmintAdapter } = await import('../adapters/CrossmintAdapter');
      const crossmintAdapter = new CrossmintAdapter(this.runtime);
      await crossmintAdapter.initialize();
      this.walletAdapters.set('crossmint', crossmintAdapter);
    } catch (error) {
      logger.warn('[PaymentService] Failed to initialize Crossmint adapter', error);
    }

    if (this.walletAdapters.size === 0) {
      logger.error('[PaymentService] No wallet adapters initialized');
    }
  }

  private startPaymentMonitoring(): void {
    // Monitor pending transactions
    setInterval(() => {
      this.checkPendingTransactions();
    }, 30000); // Every 30 seconds

    // Clean up expired payments
    setInterval(() => {
      this.cleanupExpiredPayments();
    }, 300000); // Every 5 minutes
  }

  private async checkPendingTransactions(): Promise<void> {
    try {
      // Get all processing transactions
      const processingTxs = await this.db
        .select()
        .from(paymentTransactions)
        .where(eq(paymentTransactions.status, PaymentStatus.PROCESSING));

      for (const tx of processingTxs) {
        if (tx.transactionHash) {
          try {
            const adapter = this.getAdapterForMethod(tx.method as PaymentMethod);
            if (adapter) {
              const status = await adapter.getTransaction(tx.transactionHash);
              if (status.status === PaymentStatus.COMPLETED) {
                // Update transaction status in database
                await this.db
                  .update(paymentTransactions)
                  .set({
                    status: PaymentStatus.COMPLETED,
                    confirmations: status.confirmations,
                    completedAt: new Date(),
                  } as any)
                  .where(eq(paymentTransactions.id, tx.id));

                this.emitPaymentEvent(PaymentEventType.PAYMENT_COMPLETED, tx as any);
              }
            }
          } catch (error) {
            logger.error('[PaymentService] Error checking transaction', { id: tx.id, error });
          }
        }
      }
    } catch (error) {
      logger.error('[PaymentService] Error in checkPendingTransactions', error);
    }
  }

  private async cleanupExpiredPayments(): Promise<void> {
    try {
      const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);

      // Get expired pending payments
      const expiredPayments = await this.db
        .select()
        .from(paymentRequests)
        .where(
          and(
            eq(paymentRequests.requiresConfirmation, true),
            sql`${paymentRequests.createdAt} < ${oneHourAgo}`
          )
        );

      for (const payment of expiredPayments) {
        await this.cancelPayment(payment.id as UUID);
      }
    } catch (error) {
      logger.error('[PaymentService] Error in cleanupExpiredPayments', error);
    }
  }

  async processPayment(request: PaymentRequest, _runtime: IAgentRuntime): Promise<PaymentResult> {
    try {
      logger.info('[PaymentService] Processing payment', {
        amount: request.amount.toString(),
        method: request.method,
        userId: request.userId,
      });

      // Basic validation first (amount, method support)
      if (!request.amount || request.amount <= BigInt(0)) {
        return this.createFailedResult(request, 'Invalid payment amount');
      }

      const adapter = this.getAdapterForMethod(request.method);
      if (!adapter) {
        return this.createFailedResult(request, `Payment method ${request.method} not supported`);
      }

      // Check if confirmation is required BEFORE checking balance
      if (this.shouldRequireConfirmation(request)) {
        return await this.createPendingPayment(request, 'USER_CONFIRMATION_REQUIRED');
      }

      // Check trust requirements BEFORE checking balance
      if (this.trustService && request.trustRequired) {
        const trustScore = await this.getTrustScore(request.userId);
        if (trustScore < this.settings.trustThreshold) {
          return await this.createPendingPayment(request, 'TRUST_VERIFICATION_REQUIRED');
        }
      }

      // Now validate the full request including balance
      const validation = await this.validatePaymentRequest(request);
      if (!validation.isValid) {
        return this.createFailedResult(request, validation.error || 'Invalid payment request');
      }

      // Process payment immediately
      return await this.executePayment(request);
    } catch (error) {
      logger.error('[PaymentService] Payment processing failed', error);
      return this.createFailedResult(
        request,
        error instanceof Error ? error.message : 'Unknown error'
      );
    }
  }

  private async validatePaymentRequest(request: PaymentRequest): Promise<PaymentValidation> {
    // Check amount
    if (!request.amount || request.amount <= BigInt(0)) {
      return { isValid: false, error: 'Invalid payment amount' };
    }

    // Check method support
    const adapter = this.getAdapterForMethod(request.method);
    if (!adapter) {
      return { isValid: false, error: `Payment method ${request.method} not supported` };
    }

    // Check daily limit BEFORE checking balance
    const dailySpent = await this.getDailySpending(request.userId);
    const amountUsd = await this.convertToUSD(request.amount, request.method);

    if (dailySpent + amountUsd > this.settings.maxDailySpend) {
      return {
        isValid: false,
        error: `Daily spending limit exceeded. Limit: $${this.settings.maxDailySpend}, Current: $${dailySpent}`,
      };
    }

    // Check balance last
    const hasBalance = await this.checkBalance(request);
    if (!hasBalance) {
      return { isValid: false, error: 'Insufficient funds' };
    }

    return { isValid: true };
  }

  private shouldRequireConfirmation(request: PaymentRequest): boolean {
    if (request.requiresConfirmation) {return true;}
    if (!this.settings.requireConfirmation) {return false;}

    const amountNum = Number(request.amount) / 1e6; // Assume 6 decimals
    if (this.settings.autoApprovalEnabled && amountNum <= this.settings.autoApprovalThreshold) {
      return false;
    }

    return true;
  }

  private async createPendingPayment(
    request: PaymentRequest,
    reason: string
  ): Promise<PaymentResult> {
    const transactionId = request.id;

    try {
      // Create transaction record in database
      const newTransaction = {
        payerId: request.userId,
        agentId: this.runtime.agentId,
        amount: request.amount,
        currency: this.getPaymentCurrency(request.method),
        method: request.method,
        status: PaymentStatus.PENDING,
        toAddress: request.recipientAddress,
        metadata: { ...request.metadata, pendingReason: reason },
      };

      await this.db.insert(paymentTransactions).values(newTransaction);

      // Generate verification code for confirmations
      let verificationCode: string | undefined;
      if (reason === 'USER_CONFIRMATION_REQUIRED' || reason === 'TRUST_VERIFICATION_REQUIRED') {
        verificationCode = Math.floor(100000 + Math.random() * 900000).toString();
      }

      // Also create payment request record
      const newRequest = {
        transactionId: asUUID(transactionId),
        userId: request.userId,
        agentId: this.runtime.agentId,
        amount: request.amount,
        method: request.method,
        recipientAddress: request.recipientAddress,
        requiresConfirmation: request.requiresConfirmation || true,
        trustRequired: request.trustRequired || false,
        minimumTrustLevel: request.minimumTrustLevel,
        metadata: {
          ...request.metadata,
          ...(verificationCode ? {
            verificationCode,
            verificationCodeExpiry: Date.now() + 300000, // 5 minutes
          } : {})
        },
        expiresAt: request.expiresAt ? new Date(request.expiresAt) : undefined,
      };

      await this.db.insert(paymentRequests).values(newRequest);

      // Create confirmation task if task service is available
      if (this.taskService && reason === 'USER_CONFIRMATION_REQUIRED') {
        await this.createConfirmationTask(request, transactionId);
      }

      // Create secure form if form service is available
      if (this.secretFormService && reason === 'TRUST_VERIFICATION_REQUIRED') {
        await this.createVerificationForm(request, transactionId);
      }

      const transaction = await this.db
        .select()
        .from(paymentTransactions)
        .where(eq(paymentTransactions.id, transactionId))
        .limit(1);

      if (transaction[0]) {
        this.emitPaymentEvent(PaymentEventType.PAYMENT_REQUESTED, transaction[0] as any);
      }

      return {
        id: transactionId,
        requestId: request.id,
        status: PaymentStatus.PENDING,
        amount: request.amount,
        method: request.method,
        fromAddress: '',
        toAddress: request.recipientAddress || '',
        timestamp: Date.now(),
        metadata: { pendingReason: reason },
      };
    } catch (error) {
      logger.error('[PaymentService] Error creating pending payment', error);
      throw error;
    }
  }

  private async executePayment(request: PaymentRequest): Promise<PaymentResult> {
    const adapter = this.getAdapterForMethod(request.method);
    if (!adapter) {
      return this.createFailedResult(request, 'No adapter available');
    }

    const transactionId = request.id;

    try {
      // Create transaction record in database
      const newTransaction = {
        payerId: request.userId,
        agentId: this.runtime.agentId,
        amount: request.amount,
        currency: this.getPaymentCurrency(request.method),
        method: request.method,
        status: PaymentStatus.PROCESSING,
        toAddress: request.recipientAddress,
        metadata: request.metadata,
      };

      await this.db.insert(paymentTransactions).values(newTransaction);

      // Get user wallet
      const userWallet = await this.getUserWallet(request.userId, request.method);

      // Send transaction
      const txResult = await adapter.sendTransaction(
        userWallet.address,
        request.recipientAddress || '',
        request.amount,
        request.method,
        userWallet.privateKey
      );

      // Update transaction in database
      await this.db
        .update(paymentTransactions)
        .set({
          status: txResult.status,
          transactionHash: txResult.hash,
          fromAddress: userWallet.address,
          toAddress: request.recipientAddress || '',
          completedAt: txResult.status === PaymentStatus.COMPLETED ? new Date() : undefined,
        } as any)
        .where(eq(paymentTransactions.id, transactionId));

      // Update daily spending if completed
      if (txResult.status === PaymentStatus.COMPLETED) {
        await this.updateDailySpending(request.userId, request.amount, request.method);
      }

      // Get updated transaction for event
      const [updatedTx] = await this.db
        .select()
        .from(paymentTransactions)
        .where(eq(paymentTransactions.id, transactionId))
        .limit(1);

      if (updatedTx) {
        this.emitPaymentEvent(PaymentEventType.PAYMENT_PROCESSING, updatedTx as any);
      }

      return {
        id: transactionId,
        requestId: request.id,
        status: txResult.status,
        transactionHash: txResult.hash,
        amount: request.amount,
        method: request.method,
        fromAddress: userWallet.address,
        toAddress: request.recipientAddress || '',
        timestamp: Date.now(),
      };
    } catch (error) {
      // Update transaction as failed
      await this.db
        .update(paymentTransactions)
        .set({
          status: PaymentStatus.FAILED,
          error: error instanceof Error ? error.message : 'Unknown error',
        } as any)
        .where(eq(paymentTransactions.id, transactionId));

      const [failedTx] = await this.db
        .select()
        .from(paymentTransactions)
        .where(eq(paymentTransactions.id, transactionId))
        .limit(1);

      if (failedTx) {
        this.emitPaymentEvent(PaymentEventType.PAYMENT_FAILED, failedTx as any);
      }

      return this.createFailedResult(request, error instanceof Error ? error.message : 'Unknown error');
    }
  }

  private createFailedResult(request: PaymentRequest, error: string): PaymentResult {
    return {
      id: request.id,
      requestId: request.id,
      status: PaymentStatus.FAILED,
      amount: request.amount,
      method: request.method,
      fromAddress: '',
      toAddress: request.recipientAddress || '',
      timestamp: Date.now(),
      error,
    };
  }

  async checkPaymentStatus(paymentId: UUID, _runtime: IAgentRuntime): Promise<PaymentStatus> {
    try {
      const [transaction] = await this.db
        .select()
        .from(paymentTransactions)
        .where(eq(paymentTransactions.id, paymentId))
        .limit(1);

      if (!transaction) {
        throw new Error('Payment not found');
      }

      // Update status if processing
      if (transaction.status === PaymentStatus.PROCESSING && transaction.transactionHash) {
        const adapter = this.getAdapterForMethod(transaction.method as PaymentMethod);
        if (adapter) {
          try {
            const status = await adapter.getTransaction(transaction.transactionHash);

            // Update in database if status changed
            if (status.status !== transaction.status) {
              await this.db
                .update(paymentTransactions)
                .set({
                  status: status.status,
                  confirmations: status.confirmations,
                } as any)
                .where(eq(paymentTransactions.id, paymentId));

              return status.status;
            }
          } catch (error) {
            logger.error('[PaymentService] Error checking status', { paymentId, error });
          }
        }
      }

      return transaction.status as PaymentStatus;
    } catch (error) {
      logger.error('[PaymentService] Error getting payment status', error);
      throw error;
    }
  }

  async getUserBalance(userId: UUID, _runtime: IAgentRuntime): Promise<Map<PaymentMethod, bigint>> {
    const balances = new Map<PaymentMethod, bigint>();

    for (const adapter of this.walletAdapters.values()) {
      for (const method of adapter.supportedMethods) {
        try {
          const wallet = await this.getUserWallet(userId, method);
          const balance = await adapter.getBalance(wallet.address, method);
          balances.set(method, balance);
        } catch (error) {
          logger.warn(`[PaymentService] Failed to get balance for ${method}`, error);
          balances.set(method, BigInt(0));
        }
      }
    }

    return balances;
  }

  async transferToMainWallet(
    userId: UUID,
    amount: bigint,
    method: PaymentMethod,
    runtime: IAgentRuntime
  ): Promise<PaymentResult> {
    const mainWallet = runtime.getSetting(`${method}_MAIN_WALLET`) || '';
    if (!mainWallet) {
      throw new Error(`Main wallet not configured for ${method}`);
    }

    const request: PaymentRequest = {
      id: asUUID(uuidv4()),
      userId,
      agentId: runtime.agentId,
      actionName: 'TRANSFER_TO_MAIN',
      amount,
      method,
      recipientAddress: mainWallet,
      metadata: { type: 'self_transfer' },
    };

    return this.executePayment(request);
  }

  async createPaymentConfirmationTask(
    request: PaymentRequest,
    runtime: IAgentRuntime
  ): Promise<UUID> {
    const taskId = asUUID(uuidv4());

    if (this.taskService) {
      await this.taskService.createTask({
        id: taskId,
        name: 'PAYMENT_CONFIRMATION',
        description: `Approve payment of ${request.amount} to ${request.recipientAddress}`,
        roomId: request.metadata?.roomId,
        entityId: request.userId,
        tags: ['AWAITING_CHOICE', 'PAYMENT'],
        metadata: {
          paymentId: request.id,
          amount: request.amount.toString(),
          method: request.method,
          recipient: request.recipientAddress,
          options: [
            { name: 'APPROVE', description: 'Approve this payment' },
            { name: 'REJECT', description: 'Reject this payment' },
          ],
        },
      });

      // Register task worker
      const worker: TaskWorker = {
        name: 'PAYMENT_CONFIRMATION',
        execute: async (runtime, { option }, task) => {
          if (option === 'APPROVE') {
            await this.confirmPayment(request.id, {
              paymentId: request.id,
              approved: true,
              approvedBy: request.userId,
              approvedAt: Date.now(),
            });
            await this.taskService.deleteTask(task.id);
          } else {
            await this.cancelPayment(request.id);
            await this.taskService.deleteTask(task.id);
          }
        },
      };

      runtime.registerTaskWorker(worker);
    }

    return taskId;
  }

  async hasSufficientFunds(
    userId: UUID,
    amount: bigint,
    method: PaymentMethod,
    _runtime: IAgentRuntime
  ): Promise<boolean> {
    try {
      const adapter = this.getAdapterForMethod(method);
      if (!adapter) {return false;}

      const wallet = await this.getUserWallet(userId, method);
      const balance = await adapter.getBalance(wallet.address, method);

      return balance >= amount;
    } catch (error) {
      logger.error('[PaymentService] Error checking balance', error);
      return false;
    }
  }

  getConfiguration(): PaymentConfiguration {
    const confirmations = new Map<PaymentMethod, number>();
    confirmations.set(PaymentMethod.USDC_ETH, 12);
    confirmations.set(PaymentMethod.USDC_SOL, 32);
    confirmations.set(PaymentMethod.ETH, 12);
    confirmations.set(PaymentMethod.SOL, 32);

    const maxAmounts = new Map<PaymentMethod, bigint>();
    maxAmounts.set(PaymentMethod.USDC_ETH, BigInt(this.settings.maxDailySpend * 1e6));
    maxAmounts.set(PaymentMethod.USDC_SOL, BigInt(this.settings.maxDailySpend * 1e6));
    maxAmounts.set(PaymentMethod.ETH, BigInt(10 * 1e18));
    maxAmounts.set(PaymentMethod.SOL, BigInt(1000 * 1e9));

    const thresholds = new Map<PaymentMethod, bigint>();
    thresholds.set(PaymentMethod.USDC_ETH, BigInt(this.settings.autoApprovalThreshold * 1e6));
    thresholds.set(PaymentMethod.USDC_SOL, BigInt(this.settings.autoApprovalThreshold * 1e6));

    return {
      enabled: true,
      preferredMethods: [PaymentMethod.USDC_ETH, PaymentMethod.ETH, PaymentMethod.SOL],
      minimumConfirmations: confirmations,
      maxTransactionAmount: maxAmounts,
      requireConfirmationAbove: thresholds,
      feePercentage: 0.01,
      timeoutSeconds: 300,
    };
  }

  updateConfiguration(config: Partial<PaymentConfiguration>): void {
    // Update settings based on config
    logger.info('[PaymentService] Configuration updated', config);
  }

  registerWebhook(paymentId: UUID, callback: (result: PaymentResult) => Promise<void>): void {
    // Store webhook for payment completion
    this.eventEmitter.once(`payment:${paymentId}:completed`, callback);
  }

  async getPaymentHistory(
    userId: UUID,
    limit: number,
    offset: number,
    _runtime: IAgentRuntime
  ): Promise<PaymentResult[]> {
    try {
      const transactions = await this.db
        .select()
        .from(paymentTransactions)
        .where(eq(paymentTransactions.payerId, userId))
        .orderBy(desc(paymentTransactions.createdAt))
        .limit(limit)
        .offset(offset);

      return transactions.map((tx: any) => ({
        id: tx.id,
        requestId: tx.id,
        status: tx.status,
        transactionHash: tx.transactionHash,
        amount: tx.amount ? BigInt(tx.amount) : BigInt(0),
        method: tx.method,
        fromAddress: tx.fromAddress || '',
        toAddress: tx.toAddress || '',
        timestamp: tx.createdAt ? tx.createdAt.getTime() : Date.now(),
      }));
    } catch (error) {
      logger.error('[PaymentService] Error getting payment history', error);
      return [];
    }
  }

  async liquidateToPreferredMethod(
    _userId: UUID,
    _fromMethod: PaymentMethod,
    _toMethod: PaymentMethod,
    _amount: bigint,
    _runtime: IAgentRuntime
  ): Promise<PaymentResult> {
    // This would integrate with DEX services
    throw new Error('Liquidation not yet implemented');
  }

  // Additional methods
  async cancelPayment(paymentId: UUID): Promise<boolean> {
    try {
      const [transaction] = await this.db
        .select()
        .from(paymentTransactions)
        .where(eq(paymentTransactions.id, paymentId))
        .limit(1);

      if (!transaction || transaction.status !== PaymentStatus.PENDING) {
        return false;
      }

      // Update status to cancelled
      await this.db
        .update(paymentTransactions)
        .set({
          status: PaymentStatus.CANCELLED,
          completedAt: new Date(),
        } as any)
        .where(eq(paymentTransactions.id, paymentId));

      // Delete pending payment request
      await this.db
        .delete(paymentRequests)
        .where(eq(paymentRequests.transactionId, paymentId));

      this.emitPaymentEvent(PaymentEventType.PAYMENT_CANCELLED, transaction as any);

      return true;
    } catch (error) {
      logger.error('[PaymentService] Error cancelling payment', error);
      return false;
    }
  }

  async confirmPayment(paymentId: UUID, confirmation: PaymentConfirmation): Promise<PaymentResult> {
    try {
      const [pendingRequest] = await this.db
        .select()
        .from(paymentRequests)
        .where(eq(paymentRequests.transactionId, paymentId))
        .limit(1);

      if (!pendingRequest) {
        throw new Error('Payment request not found');
      }

      if (!confirmation.approved) {
        await this.cancelPayment(paymentId);

        const request: PaymentRequest = {
          id: paymentId,
          userId: pendingRequest.userId as UUID,
          agentId: pendingRequest.agentId as UUID,
          actionName: 'PAYMENT',
          amount: BigInt(pendingRequest.amount),
          method: pendingRequest.method as PaymentMethod,
          recipientAddress: pendingRequest.recipientAddress || undefined,
          metadata: pendingRequest.metadata as any,
        };

        return this.createFailedResult(request, 'Payment rejected');
      }

      // Delete pending request
      await this.db
        .delete(paymentRequests)
        .where(eq(paymentRequests.transactionId, paymentId));

      // Reconstruct the original request
      const request: PaymentRequest = {
        id: paymentId,
        userId: pendingRequest.userId as UUID,
        agentId: pendingRequest.agentId as UUID,
        actionName: 'PAYMENT',
        amount: BigInt(pendingRequest.amount),
        method: pendingRequest.method as PaymentMethod,
        recipientAddress: pendingRequest.recipientAddress || undefined,
        metadata: pendingRequest.metadata as any,
      };

      return await this.executePayment(request);
    } catch (error) {
      logger.error('[PaymentService] Error confirming payment', error);
      throw error;
    }
  }

  async updateSettings(settings: Partial<PaymentSettings>): Promise<void> {
    this.settings = { ...this.settings, ...settings };

    // Persist to runtime
    for (const [key, value] of Object.entries(settings)) {
      const settingKey = `PAYMENT_${key.replace(/([A-Z])/g, '_$1').toUpperCase()}`;
      await this.runtime.setSetting(settingKey, String(value));
    }

    logger.info('[PaymentService] Settings updated', settings);
  }

  getSettings(): PaymentSettings {
    return { ...this.settings };
  }

  async getCapabilities(): Promise<PaymentCapabilities> {
    const supportedMethods: PaymentMethod[] = [];
    const supportedCurrencies: string[] = [];

    for (const adapter of this.walletAdapters.values()) {
      supportedMethods.push(...adapter.supportedMethods);

      for (const method of adapter.supportedMethods) {
        supportedCurrencies.push(this.getPaymentCurrency(method));
      }
    }

    return {
      supportedMethods: [...new Set(supportedMethods)],
      supportedCurrencies: [...new Set(supportedCurrencies)],
      features: {
        autoApproval: this.settings.autoApprovalEnabled,
        trustBasedLimits: !!this.trustService,
        secureConfirmation: !!this.secretFormService,
        recurringPayments: false,
        batchPayments: false,
        escrow: false,
      },
      limits: {
        minAmount: 0.01,
        maxAmount: this.settings.maxDailySpend,
        dailyLimit: this.settings.maxDailySpend,
      },
    };
  }

  // Helper methods
  private getAdapterForMethod(method: PaymentMethod): IWalletAdapter | null {
    for (const adapter of this.walletAdapters.values()) {
      if (adapter.supportedMethods.includes(method)) {
        return adapter;
      }
    }
    return null;
  }

  private async getUserWallet(
    userId: UUID,
    method: PaymentMethod
  ): Promise<{ address: string; privateKey: string }> {
    const adapter = this.getAdapterForMethod(method);
    if (!adapter) {
      throw new Error(`No adapter for ${method}`);
    }

    // Check if user already has a wallet for this method
    const network = this.getNetworkForMethod(method);

    const [existingWallet] = await this.db
      .select()
      .from(userWallets)
      .where(
        and(
          eq(userWallets.userId, userId),
          eq(userWallets.network, network),
          eq(userWallets.isActive, true)
        )
      )
      .limit(1);

    if (existingWallet && existingWallet.encryptedPrivateKey) {
      // Decrypt and return existing wallet
      const encryptionKey = this.runtime.getSetting('WALLET_ENCRYPTION_KEY');
      if (!encryptionKey) {
        throw new Error('Wallet encryption key not configured');
      }

      const privateKey = decrypt(existingWallet.encryptedPrivateKey, encryptionKey);

      return {
        address: existingWallet.address,
        privateKey,
      };
    }

    // Create new wallet if none exists
    const newWallet = await adapter.createWallet();

    // Store in database
    const encryptionKey = this.runtime.getSetting('WALLET_ENCRYPTION_KEY');
    if (!encryptionKey) {
      throw new Error('Wallet encryption key not configured');
    }

    const encryptedPrivateKey = encrypt(newWallet.privateKey, encryptionKey);

    const walletId = asUUID(uuidv4());
    await this.db.insert(userWallets).values({
      userId,
      address: newWallet.address,
      network,
      encryptedPrivateKey,
      isActive: true,
      metadata: {
        createdBy: 'payment-service',
        method,
      },
    } as any);

    logger.info('[PaymentService] Created new wallet for user', {
      userId,
      address: newWallet.address,
      network,
    });

    return newWallet;
  }

  private getNetworkForMethod(method: PaymentMethod): string {
    const methodToNetwork: Record<PaymentMethod, string> = {
      [PaymentMethod.USDC_ETH]: 'ethereum',
      [PaymentMethod.USDC_SOL]: 'solana',
      [PaymentMethod.ETH]: 'ethereum',
      [PaymentMethod.SOL]: 'solana',
      [PaymentMethod.BTC]: 'bitcoin',
      [PaymentMethod.MATIC]: 'polygon',
      [PaymentMethod.ARB]: 'arbitrum',
      [PaymentMethod.OP]: 'optimism',
      [PaymentMethod.BASE]: 'base',
      [PaymentMethod.OTHER]: 'unknown',
    };

    return methodToNetwork[method] || 'unknown';
  }

  private getPaymentCurrency(method: PaymentMethod): string {
    const methodToCurrency: Record<PaymentMethod, string> = {
      [PaymentMethod.USDC_ETH]: 'USDC',
      [PaymentMethod.USDC_SOL]: 'USDC',
      [PaymentMethod.ETH]: 'ETH',
      [PaymentMethod.SOL]: 'SOL',
      [PaymentMethod.BTC]: 'BTC',
      [PaymentMethod.MATIC]: 'MATIC',
      [PaymentMethod.ARB]: 'ARB',
      [PaymentMethod.OP]: 'OP',
      [PaymentMethod.BASE]: 'ETH',
      [PaymentMethod.OTHER]: 'UNKNOWN',
    };

    return methodToCurrency[method] || 'UNKNOWN';
  }

  private async getTrustScore(userId: UUID): Promise<number> {
    if (!this.trustService) {return 0;}

    try {
      return await this.trustService.getTrustScore(userId);
    } catch (error) {
      logger.warn('[PaymentService] Failed to get trust score', error);
      return 0;
    }
  }

  private async convertToUSD(amount: bigint, method: PaymentMethod): Promise<number> {
    // Use price oracle service if available
    const priceOracle = this.runtime.getService('payment-price-oracle') as any;
    if (priceOracle) {
      try {
        return await priceOracle.convertToUSD(amount, method);
      } catch (error) {
        logger.warn('[PaymentService] Price oracle failed, using fallback', error);
      }
    }

    // Fallback to simple conversion
    const currency = this.getPaymentCurrency(method);
    const prices: Record<string, number> = {
      USDC: 1,
      ETH: 2500,
      SOL: 100,
      BTC: 50000,
    };

    const price = prices[currency] || 1;
    const decimals = method.includes('ETH') ? 18 : method.includes('SOL') ? 9 : 6;

    return (Number(amount) / Math.pow(10, decimals)) * price;
  }

  private async getDailySpending(userId: UUID): Promise<number> {
    try {
      const now = new Date();
      const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());

      const [record] = await this.db
        .select()
        .from(dailySpending)
        .where(
          and(
            eq(dailySpending.userId, userId),
            sql`DATE(${dailySpending.date}) = DATE(${startOfDay})`
          )
        )
        .limit(1);

      return record ? (record.totalSpentUsd ? parseFloat(record.totalSpentUsd) : 0) : 0;
    } catch (error) {
      logger.error('[PaymentService] Error getting daily spending', error);
      return 0;
    }
  }

  private async checkBalance(request: PaymentRequest): Promise<boolean> {
    try {
      const adapter = this.getAdapterForMethod(request.method);
      if (!adapter) {return false;}

      const wallet = await this.getUserWallet(request.userId, request.method);
      const balance = await adapter.getBalance(wallet.address, request.method);

      return balance >= request.amount;
    } catch (error) {
      logger.error('[PaymentService] Error checking balance', error);
      return false;
    }
  }

  private addToHistory(_userId: UUID, _transaction: PaymentTransaction): void {
    // Remove this method since it references non-existent property
    // History is now stored in database, not in memory
  }

  private emitPaymentEvent(type: PaymentEventType, transaction: any): void {
    const event: PaymentEvent = {
      type,
      paymentId: transaction.id,
      userId: transaction.payerId,
      agentId: this.runtime.agentId,
      timestamp: Date.now(),
      data: { transaction },
    };

    this.eventEmitter.emit(type, event);
    this.eventEmitter.emit(`payment:${transaction.id}:${type}`, transaction);

    // Log event
    logger.info(`[PaymentService] Event: ${type}`, {
      paymentId: transaction.id,
      status: transaction.status,
    });
  }

  private async createConfirmationTask(
    request: PaymentRequest,
    _transactionId: UUID
  ): Promise<void> {
    // Implementation handled in createPaymentConfirmationTask
    await this.createPaymentConfirmationTask(request, this.runtime);
  }

  private async createVerificationForm(
    request: PaymentRequest,
    transactionId: UUID
  ): Promise<void> {
    if (!this.secretFormService) {return;}

    try {
      // Generate a secure verification code
      const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();

      // Get current metadata first
      const currentRequest = await this.db
        .select()
        .from(paymentRequests)
        .where(eq(paymentRequests.transactionId, transactionId))
        .limit(1);

      const currentMetadata = (currentRequest[0]?.metadata as any) || {};

      // Store verification code in payment request metadata
      await this.db
        .update(paymentRequests)
        .set({
          metadata: {
            ...currentMetadata,
            verificationCode,
            verificationCodeExpiry: Date.now() + 300000, // 5 minutes
          }
        } as any)
        .where(eq(paymentRequests.transactionId, transactionId));

      const formResult = await this.secretFormService.createSecretForm(
        {
          title: 'Payment Authorization Required',
          description: `Please authorize payment of ${request.amount} ${this.getPaymentCurrency(request.method)}. Check your secure channel for the verification code.`,
          secrets: [
            {
              key: 'authorization_code',
              config: {
                type: 'text',
                description: 'Enter your 6-digit authorization code',
                required: true,
                pattern: '^[0-9]{6}$',
              },
            },
          ],
          mode: 'inline',
          maxSubmissions: 3, // Allow 3 attempts
          expiresIn: 300000, // 5 minutes
        },
        { entityId: request.userId },
        async (submission: any) => {
          // Retrieve stored verification code
          const [pendingRequest] = await this.db
            .select()
            .from(paymentRequests)
            .where(eq(paymentRequests.transactionId, transactionId))
            .limit(1);

          if (!pendingRequest) {
            throw new Error('Payment request not found');
          }

          const metadata = pendingRequest.metadata as any;
          const storedCode = metadata?.verificationCode;
          const expiry = metadata?.verificationCodeExpiry;

          // Verify the code
          if (
            storedCode &&
            submission.data.authorization_code === storedCode &&
            expiry && Date.now() < expiry
          ) {
            await this.confirmPayment(transactionId, {
              paymentId: transactionId,
              approved: true,
              approvedBy: request.userId,
              approvedAt: Date.now(),
            });
          } else {
            throw new Error('Invalid or expired verification code');
          }
        }
      );

      // Send verification code through secure channel (email, SMS, etc.)
      // This would integrate with notification service
      logger.info('[PaymentService] Verification form created', {
        paymentId: transactionId,
        formUrl: formResult.url,
        // Don't log the actual code for security
      });

      // TODO: Implement notification service integration to send code
      logger.warn('[PaymentService] Verification code generated but notification service not implemented', {
        paymentId: transactionId,
        // For testing only - remove in production
        testCode: process.env.NODE_ENV === 'test' ? verificationCode : undefined,
      });
    } catch (error) {
      logger.error('[PaymentService] Failed to create verification form', error);
    }
  }

  async stop(): Promise<void> {
    logger.info('[PaymentService] Stopping payment service');

    // Clear intervals
    this.eventEmitter.removeAllListeners();

    // No more caches to clear since we're using database
  }

  static async start(runtime: IAgentRuntime): Promise<PaymentService> {
    const service = new PaymentService();
    await service.initialize(runtime);
    return service;
  }

  private async updateDailySpending(userId: UUID, amount: bigint, method: PaymentMethod): Promise<void> {
    try {
      const amountUsd = await this.convertToUSD(amount, method);

      const now = new Date();
      const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());

      // Get or create daily spending record
      const [spending] = await this.db
        .select()
        .from(dailySpending)
        .where(
          and(
            eq(dailySpending.userId, userId),
            sql`DATE(${dailySpending.date}) = DATE(${startOfDay})`
          )
        )
        .limit(1);

      if (!spending) {
        const newSpending = {
          id: asUUID(uuidv4()),
          userId,
          date: startOfDay.toISOString(),
          totalSpentUsd: amountUsd.toString(),
          transactionCount: 1,
        };
        await this.db.insert(dailySpending).values(newSpending);
      } else {
        // Update spending totals
        const currentTotal = spending.totalSpentUsd ? parseFloat(spending.totalSpentUsd) : 0;
        const currentCount = spending.transactionCount || 0;

        await this.db
          .update(dailySpending)
          .set({
            totalSpentUsd: (currentTotal + amountUsd).toString(),
            transactionCount: currentCount + 1,
          } as any)
          .where(eq(dailySpending.id, spending.id));
      }
    } catch (error) {
      logger.error('[PaymentService] Error updating daily spending', error);
    }
  }
}
