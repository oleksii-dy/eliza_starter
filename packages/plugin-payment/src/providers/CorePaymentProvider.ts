import {
  type IAgentRuntime,
  type UUID,
  logger,
  stringToUuid,
  asUUID,
  type IPaymentProvider,
  type PaymentRequest,
  type PaymentTransaction,
  type PaymentProfile,
  type PaymentMethod,
  type PaymentRiskLevel,
  type PaymentConfirmation,
  type PaymentSettings as CorePaymentSettings,
  type PaymentAnalytics,
} from '@elizaos/core';
import { PaymentService } from '../services/PaymentService';
import { PriceOracleService } from '../services/PriceOracleService';
import {
  type PaymentRequest as PluginPaymentRequest,
  type PaymentResult,
  type PaymentTransaction as PluginPaymentTransaction,
  type PaymentSettings,
  PaymentStatus,
  PaymentMethod as PluginPaymentMethod,
  type PaymentHistory,
} from '../types';

/**
 * Core Payment Provider that implements the IPaymentProvider interface
 * Bridges between the core payment types and the Payment plugin's PaymentService
 */
export class CorePaymentProvider implements IPaymentProvider {
  constructor(
    private runtime: IAgentRuntime,
    private paymentService: PaymentService,
    private priceOracleService?: PriceOracleService
  ) {}

  /**
   * Process a payment request
   */
  async processPayment(request: PaymentRequest): Promise<PaymentTransaction> {
    try {
      logger.info('[CorePaymentProvider] Processing payment:', {
        amount: request.amount,
        method: request.method,
        entityId: request.entityId,
      });

      // Convert core payment request to plugin format
      const pluginRequest: PluginPaymentRequest = {
        id: request.id || asUUID(`payment-${Date.now()}`),
        userId: request.entityId,
        agentId: this.runtime.agentId,
        actionName: request.description || 'PAYMENT',
        amount: BigInt(request.amount),
        method: this.convertPaymentMethod(request.method),
        recipientAddress: (request as any).recipientAddress,
        metadata: {
          ...request.metadata,
          originalRequest: request,
        },
        requiresConfirmation: (request as any).requiresConfirmation,
        trustRequired: (request as any).trustRequired !== false, // Default to true
      };

      // Process payment using the PaymentService
      const result = await this.paymentService.processPayment(pluginRequest, this.runtime);

      // Convert result to core format
      const coreTransaction: PaymentTransaction = {
        id: result.id,
        recipientId: asUUID((request as any).recipientAddress || ''),
        amount: request.amount, // Keep as string
        currency: this.getCurrencyFromMethod(request.method),
        method: request.method as any,
        status: this.convertPaymentStatus(result.status) as any,
        transactionHash: result.transactionHash,
        createdAt: result.timestamp,
        completedAt: result.status === PaymentStatus.COMPLETED ? result.timestamp : undefined,
        confirmations: 0, // Would get from blockchain
        metadata: {
          ...result.metadata,
          pluginResult: result,
          originalRequest: request,
          payerId: request.entityId, // Store payerId in metadata instead
        },
      } as any;

      return coreTransaction;
    } catch (error) {
      logger.error('[CorePaymentProvider] Error processing payment:', error);
      throw new Error(`Payment processing failed: ${(error as Error).message}`);
    }
  }

  /**
   * Get payment profile for an entity
   */
  async getPaymentProfile(entityId: UUID): Promise<PaymentProfile> {
    try {
      logger.debug('[CorePaymentProvider] Getting payment profile for entity:', entityId);

      // Get payment history from the service
      const history = await this.paymentService.getPaymentHistory(entityId, 100, 0, this.runtime);
      const settings = this.paymentService.getSettings();

      // Calculate profile statistics
      const totalTransactions = history.length;
      const totalVolume = history
        .filter(tx => tx.status === PaymentStatus.COMPLETED)
        .reduce((sum, tx) => sum + Number(tx.amount), 0);
      const successfulTransactions = history.filter(tx => tx.status === PaymentStatus.COMPLETED).length;

      // Get current balances from wallet adapters
      const balances = await this.paymentService.getUserBalance(entityId, this.runtime);

      // Calculate trust and risk assessment
      const trustProvider = this.runtime.getTrustProvider();
      let trustScore = 0.5;

      if (trustProvider) {
        try {
          const trustData = await trustProvider.getTrustScore(entityId);
          trustScore = trustData.overall;
        } catch (error) {
          logger.warn('[CorePaymentProvider] Could not get trust score:', error);
        }
      }

      const profile: PaymentProfile = {
        entityId,
        preferredMethod: this.getPreferredMethods(balances)[0] || 'usdc_eth' as any,
        verifiedMethods: this.getVerifiedMethods(balances),
        trustScore,
        transactionHistory: {
          totalTransactions,
          successfulTransactions,
          failedTransactions: totalTransactions - successfulTransactions,
          totalVolume,
          averageAmount: totalTransactions > 0 ? totalVolume / totalTransactions : 0,
          lastTransactionAt: history.length > 0 ? history[0].timestamp : undefined,
        },
        riskLevel: this.calculateRiskLevel(trustScore, totalVolume, successfulTransactions / Math.max(totalTransactions, 1)) as any,
        limits: {
          dailyLimit: settings.maxDailySpend,
          maxTransactionAmount: 10000, // From capabilities
          minTransactionAmount: 0.01,
        },
        settings: {
          autoApprovalThreshold: settings.autoApprovalThreshold,
          preferredCurrency: settings.defaultCurrency,
          requireConfirmation: settings.requireConfirmation,
        } as any,
        metadata: {
          profileCreatedAt: Date.now(),
          lastUpdated: Date.now(),
          settings,
          balances: this.formatBalancesForProfile(balances),
        },
      } as any;

      return profile;
    } catch (error) {
      logger.error('[CorePaymentProvider] Error getting payment profile:', error);
      
      // Return basic profile on error
      return {
        entityId,
        preferredMethod: 'usdc_eth' as any,
        verifiedMethods: [],
        riskLevel: 'medium' as any,
        limits: {
          dailyLimit: 1000,
          maxTransactionAmount: 10000,
          minTransactionAmount: 0.01,
        },
        settings: {
          autoApprovalThreshold: 10,
          preferredCurrency: 'USDC',
          requireConfirmation: true,
        } as any,
        metadata: {
          profileCreatedAt: Date.now(),
          lastUpdated: Date.now(),
          error: error instanceof Error ? error.message : 'Unknown error',
        },
      } as unknown as PaymentProfile;
    }
  }

  /**
   * Get payment history for an entity
   */
  async getPaymentHistory(
    entityId: UUID,
    limit?: number,
    offset?: number
  ): Promise<PaymentTransaction[]> {
    try {
      logger.debug('[CorePaymentProvider] Getting payment history:', { entityId, limit, offset });

      const history = await this.paymentService.getPaymentHistory(
        entityId,
        limit || 50,
        offset || 0,
        this.runtime
      );

      const transactions: PaymentTransaction[] = [];

      for (const result of history) {
        const coreTransaction: PaymentTransaction = {
          id: result.id,
          recipientId: asUUID(result.toAddress || ''),
          amount: result.amount.toString(), // Keep as string
          currency: this.getCurrencyFromMethod(result.method as PaymentMethod),
          method: result.method as any,
          status: this.convertPaymentStatus(result.status) as any,
          transactionHash: result.transactionHash,
          createdAt: result.timestamp,
          completedAt: result.status === PaymentStatus.COMPLETED ? result.timestamp : undefined,
          confirmations: 0, // Would get from blockchain
          metadata: {
            ...result.metadata,
            originalResult: result,
          },
        } as any;

        transactions.push(coreTransaction);
      }

      return transactions;
    } catch (error) {
      logger.error('[CorePaymentProvider] Error getting payment history:', error);
      return []; // Return empty array instead of throwing
    }
  }

  /**
   * Assess payment risk for an entity and amount
   */
  async assessPaymentRisk(
    entityId: UUID,
    amount: string,
    method: PaymentMethod
  ): Promise<PaymentRiskLevel> {
    try {
      logger.debug('[CorePaymentProvider] Assessing payment risk:', { entityId, amount, method });

      const amountNum = parseFloat(amount);
      const profile = await this.getPaymentProfile(entityId);

      // Base risk assessment
      let riskScore = 0;
      const reasonCodes: string[] = [];

      // Amount-based risk
      if (amountNum > 10000) {
        riskScore += 0.3;
        reasonCodes.push('LARGE_AMOUNT');
      } else if (amountNum > 1000) {
        riskScore += 0.2;
        reasonCodes.push('MEDIUM_AMOUNT');
      } else if (amountNum > 100) {
        riskScore += 0.1;
        reasonCodes.push('MODERATE_AMOUNT');
      }

      // Trust-based risk
      if ((profile as any).trustScore < 0.3) {
        riskScore += 0.4;
        reasonCodes.push('LOW_TRUST_SCORE');
      } else if ((profile as any).trustScore < 0.6) {
        riskScore += 0.2;
        reasonCodes.push('MEDIUM_TRUST_SCORE');
      }

      // Transaction history risk
      const successRate = (profile as any).transactionHistory?.totalTransactions > 0 
        ? (profile as any).transactionHistory.successfulTransactions / (profile as any).transactionHistory.totalTransactions
        : 0;

      if (successRate < 0.8) {
        riskScore += 0.2;
        reasonCodes.push('LOW_SUCCESS_RATE');
      }
      
      if ((profile as any).transactionHistory?.totalTransactions < 5) {
        riskScore += 0.1;
        reasonCodes.push('NEW_USER');
      }

      // Daily spending limit risk
      const dailyRemaining = (profile as any).limits?.dailyLimit - ((profile as any).metadata?.dailySpent || 0);
      if (amountNum > dailyRemaining) {
        riskScore += 0.3;
        reasonCodes.push('EXCEEDS_DAILY_LIMIT');
      }

      // Method-specific risk  
      if (method.includes('crypto') && amountNum > 1000) {
        riskScore += 0.1;
        reasonCodes.push('HIGH_VALUE_CRYPTO');
      }

      // Determine risk level and approval requirement
      let level: 'low' | 'medium' | 'high';
      let requiresApproval = false;

      if (riskScore >= 0.7) {
        level = 'high';
        requiresApproval = true;
      } else if (riskScore >= 0.4) {
        level = 'medium';
        requiresApproval = amountNum > (profile as any).settings.autoApprovalThreshold;
      } else {
        level = 'low';
        requiresApproval = false;
      }

      return {
        level,
        score: riskScore,
        requiresApproval,
        reasonCodes,
        metadata: {
          amountUsd: amountNum,
          trustScore: (profile as any).trustScore,
          successRate,
          dailyRemaining,
          assessedAt: Date.now(),
          profile: {
            totalTransactions: (profile as any).transactionHistory.totalTransactions,
            averageAmount: (profile as any).transactionHistory.averageAmount,
            lastTransaction: (profile as any).transactionHistory.lastTransactionAt,
          },
        },
      } as any;
    } catch (error) {
      logger.error('[CorePaymentProvider] Error assessing payment risk:', error);
      
      // Return high risk on error
      return {
        level: 'high',
        score: 1.0,
        requiresApproval: true,
        reasonCodes: ['ASSESSMENT_ERROR'],
        metadata: {
          error: error instanceof Error ? error.message : 'Unknown error',
          assessedAt: Date.now(),
        },
      } as any;
    }
  }

  /**
   * Check if the entity can make a payment of the specified amount
   */
  async canMakePayment(
    entityId: UUID,
    amount: string,
    method: PaymentMethod
  ): Promise<boolean> {
    try {
      logger.debug('[CorePaymentProvider] Checking if entity can make payment:', { 
        entityId, 
        amount, 
        method 
      });

      const pluginMethod = this.convertPaymentMethod(method);
      const balances = await this.paymentService.getUserBalance(entityId, this.runtime);
      const balance = balances.get(pluginMethod) || BigInt(0);
      const amountBigInt = BigInt(Math.floor(parseFloat(amount) * 1000000)); // Convert to smallest unit

      return balance >= amountBigInt;
    } catch (error) {
      logger.error('[CorePaymentProvider] Error checking payment capability:', error);
      return false;
    }
  }

  /**
   * Get user balance for all or specific payment methods
   */
  async getUserBalance(
    entityId: UUID,
    method: PaymentMethod
  ): Promise<string> {
    try {
      logger.debug('[CorePaymentProvider] Getting user balance:', { entityId, method });

      const balances = await this.paymentService.getUserBalance(entityId, this.runtime);
      
      const pluginMethod = this.convertPaymentMethod(method);
      const balance = balances.get(pluginMethod) || BigInt(0);
      return balance.toString();
    } catch (error) {
      logger.error('[CorePaymentProvider] Error getting user balance:', error);
      return '0';
    }
  }

  /**
   * Create a payment confirmation
   */
  async createPaymentConfirmation(
    request: PaymentRequest
  ): Promise<PaymentConfirmation> {
    try {
      logger.debug('[CorePaymentProvider] Creating payment confirmation:', { 
        requestId: request.id 
      });

      const confirmationId = asUUID(`confirmation-${request.id}-${Date.now()}`);
      const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes

      return {
        confirmationId,
        confirmationUrl: undefined, // Could generate a confirmation URL if needed
        expiresAt,
      } as any;
    } catch (error) {
      logger.error('[CorePaymentProvider] Error creating payment confirmation:', error);
      throw new Error(`Failed to create payment confirmation: ${(error as Error).message}`);
    }
  }

  /**
   * Update payment settings for an entity
   */
  async updatePaymentSettings(
    entityId: UUID,
    settings: Partial<CorePaymentSettings>
  ): Promise<void> {
    try {
      logger.info('[CorePaymentProvider] Updating payment settings:', { 
        entityId, 
        settings 
      });

      // Map to plugin settings format
      const pluginSettings: Partial<PaymentSettings> = {
        autoApprovalEnabled: (settings as any).autoApprovalEnabled,
        autoApprovalThreshold: (settings as any).autoApprovalThreshold,
        defaultCurrency: (settings as any).preferredCurrency,
        requireConfirmation: (settings as any).requireConfirmation,
        maxDailySpend: (settings as any).dailyLimit,
      };

      await this.paymentService.updateSettings(pluginSettings);

      logger.info('[CorePaymentProvider] Payment settings updated successfully');
    } catch (error) {
      logger.error('[CorePaymentProvider] Error updating payment settings:', error);
      throw new Error(`Failed to update payment settings: ${(error as Error).message}`);
    }
  }

  /**
   * Get payment analytics for an entity
   */
  async getPaymentAnalytics(
    entityId: UUID,
    period: string
  ): Promise<PaymentAnalytics> {
    try {
      logger.debug('[CorePaymentProvider] Getting payment analytics:', { 
        entityId, 
        period 
      });

      // Parse period string (e.g., "7d", "30d", "1y")
      const now = new Date();
      const start = new Date();
      
      if (period.endsWith('d')) {
        const days = parseInt(period.slice(0, -1));
        start.setDate(now.getDate() - days);
      } else if (period.endsWith('m')) {
        const months = parseInt(period.slice(0, -1));
        start.setMonth(now.getMonth() - months);
      } else if (period.endsWith('y')) {
        const years = parseInt(period.slice(0, -1));
        start.setFullYear(now.getFullYear() - years);
      } else {
        // Default to 30 days
        start.setDate(now.getDate() - 30);
      }

      const history = await this.paymentService.getPaymentHistory(
        entityId, 
        1000, 
        0, 
        this.runtime
      );

      // Filter by period
      const startTime = start.getTime();
      const endTime = now.getTime();
      const periodTransactions = history.filter(tx => 
        tx.timestamp >= startTime && tx.timestamp <= endTime
      );

      // Calculate metrics
      const totalTransactions = periodTransactions.length;
      const completedTransactions = periodTransactions.filter(
        tx => tx.status === PaymentStatus.COMPLETED
      );
      const totalVolume = completedTransactions.reduce(
        (sum, tx) => sum + Number(tx.amount), 
        0
      );
      const successRate = totalTransactions > 0 
        ? completedTransactions.length / totalTransactions 
        : 0;
      const averageAmount = completedTransactions.length > 0 
        ? totalVolume / completedTransactions.length 
        : 0;

      // Calculate top methods
      const methodStats = new Map<string, { count: number; volume: number }>();
      for (const tx of completedTransactions) {
        const method = tx.method as string;
        const stats = methodStats.get(method) || { count: 0, volume: 0 };
        stats.count++;
        stats.volume += Number(tx.amount);
        methodStats.set(method, stats);
      }

      const topMethods = Array.from(methodStats.entries())
        .map(([method, stats]) => ({
          method: method as PaymentMethod,
          count: stats.count,
          volume: stats.volume,
        }))
        .sort((a, b) => b.volume - a.volume)
        .slice(0, 5);

      // Calculate hourly distribution
      const hourlyCount = new Array(24).fill(0);
      for (const tx of periodTransactions) {
        const hour = new Date(tx.timestamp).getHours();
        hourlyCount[hour]++;
      }

      const hourlyDistribution = hourlyCount.map((count, hour) => ({ hour, count }));

      return {
        totalTransactions,
        totalVolume,
        successRate,
        averageAmount,
        topMethods,
        hourlyDistribution,
      } as any;
    } catch (error) {
      logger.error('[CorePaymentProvider] Error getting payment analytics:', error);
      
      // Return empty analytics on error
      return {
        totalTransactions: 0,
        totalVolume: 0,
        successRate: 0,
        averageAmount: 0,
        topMethods: [],
        hourlyDistribution: Array.from({ length: 24 }, (_, hour) => ({ hour, count: 0 })),
      } as any;
    }
  }

  // === Private Helper Methods ===

  private convertPaymentMethod(coreMethod: PaymentMethod): PluginPaymentMethod {
    const methodMap: any = {
      'usdc_eth': PluginPaymentMethod.USDC_ETH,
      'usdc_sol': PluginPaymentMethod.USDC_SOL,
      'eth': PluginPaymentMethod.ETH,
      'sol': PluginPaymentMethod.SOL,
      'btc': PluginPaymentMethod.BTC,
      'matic': PluginPaymentMethod.MATIC,
      'arb': PluginPaymentMethod.ARB,
      'op': PluginPaymentMethod.OP,
      'base': PluginPaymentMethod.BASE,
      'other': PluginPaymentMethod.OTHER,
    };

    return methodMap[coreMethod] || PluginPaymentMethod.OTHER;
  }

  private getCurrencyFromMethod(method: PaymentMethod): string {
    const methodToCurrency: any = {
      'usdc_eth': 'USDC',
      'usdc_sol': 'USDC',
      'eth': 'ETH',
      'sol': 'SOL',
      'btc': 'BTC',
      'matic': 'MATIC',
      'arb': 'ARB',
      'op': 'OP',
      'base': 'ETH',
      'other': 'UNKNOWN',
    };

    return methodToCurrency[method] || 'UNKNOWN';
  }

  private getPreferredMethods(balances: Map<PluginPaymentMethod, bigint>): PaymentMethod[] {
    const preferred: PaymentMethod[] = [];
    
    // Prioritize based on balance availability
    for (const [method, balance] of balances) {
      if (balance > BigInt(0)) {
        const coreMethod = this.convertPluginMethodToCore(method);
        preferred.push(coreMethod);
      }
    }
    
    // Add defaults if none available
    if (preferred.length === 0) {
      preferred.push('usdc_eth' as any, 'eth' as any, 'sol' as any);
    }
    
    return preferred.slice(0, 3); // Top 3
  }

  private getVerifiedMethods(balances: Map<PluginPaymentMethod, bigint>): PaymentMethod[] {
    const verified: PaymentMethod[] = [];
    
    for (const [method, balance] of balances) {
      if (balance > BigInt(0)) {
        const coreMethod = this.convertPluginMethodToCore(method);
        verified.push(coreMethod);
      }
    }
    
    return verified;
  }

  private convertPluginMethodToCore(method: PluginPaymentMethod): PaymentMethod {
    const methodMap: any = {
      [PluginPaymentMethod.USDC_ETH]: 'usdc_eth',
      [PluginPaymentMethod.USDC_SOL]: 'usdc_sol',
      [PluginPaymentMethod.ETH]: 'eth',
      [PluginPaymentMethod.SOL]: 'sol',
      [PluginPaymentMethod.BTC]: 'btc',
      [PluginPaymentMethod.MATIC]: 'matic',
      [PluginPaymentMethod.ARB]: 'arb',
      [PluginPaymentMethod.OP]: 'op',
      [PluginPaymentMethod.BASE]: 'base',
      [PluginPaymentMethod.OTHER]: 'other',
    };

    return methodMap[method] || 'other' as any;
  }

  private formatBalancesForProfile(balances: Map<PluginPaymentMethod, bigint>): Record<string, string> {
    const formatted: Record<string, string> = {};
    
    for (const [method, balance] of balances) {
      const coreMethod = this.convertPluginMethodToCore(method);
      formatted[coreMethod] = balance.toString();
    }
    
    return formatted;
  }

  private convertPaymentStatus(pluginStatus: PaymentStatus): 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled' {
    switch (pluginStatus) {
      case PaymentStatus.PENDING:
        return 'pending';
      case PaymentStatus.PROCESSING:
        return 'processing';
      case PaymentStatus.COMPLETED:
        return 'completed';
      case PaymentStatus.FAILED:
        return 'failed';
      case PaymentStatus.CANCELLED:
        return 'cancelled';
      default:
        return 'pending';
    }
  }

  private calculateRiskLevel(
    trustScore: number,
    totalVolume: number,
    successRate: number
  ): 'low' | 'medium' | 'high' {
    let riskScore = 0;

    // Trust-based risk
    if (trustScore < 0.3) riskScore += 0.4;
    else if (trustScore < 0.6) riskScore += 0.2;

    // Volume-based risk
    if (totalVolume > 100000) riskScore += 0.1;
    else if (totalVolume < 100) riskScore += 0.2;

    // Success rate risk
    if (successRate < 0.8) riskScore += 0.3;
    else if (successRate < 0.9) riskScore += 0.1;

    if (riskScore >= 0.6) return 'high';
    if (riskScore >= 0.3) return 'medium';
    return 'low';
  }

  private calculateVerificationLevel(
    trustScore: number,
    totalTransactions: number,
    totalVolume: number
  ): 'unverified' | 'basic' | 'verified' | 'premium' {
    if (trustScore >= 0.8 && totalTransactions >= 10 && totalVolume >= 1000) {
      return 'premium';
    } else if (trustScore >= 0.6 && totalTransactions >= 5) {
      return 'verified';
    } else if (trustScore >= 0.4 || totalTransactions >= 1) {
      return 'basic';
    } else {
      return 'unverified';
    }
  }

  private async getEntityBalances(entityId: UUID): Promise<Record<string, string>> {
    try {
      // Get wallet addresses from payment service or identity manager
      const identityManager = this.runtime.getIdentityManager();
      if (identityManager) {
        const profile = await identityManager.getIdentityProfile(entityId);
        if (profile && (profile as any).platformIdentities) {
          const balances: Record<string, string> = {};
          
          // Extract wallet addresses from platform identities
          Object.entries((profile as any).platformIdentities).forEach(([platform, identity]: [string, any]) => {
            if (identity.metadata?.walletAddress) {
              balances[platform] = identity.metadata.walletAddress;
            }
          });

          return balances;
        }
      }

      // Fallback to empty balances
      return {};
    } catch (error) {
      logger.warn('[CorePaymentProvider] Could not get entity balances:', error);
      return {};
    }
  }
}