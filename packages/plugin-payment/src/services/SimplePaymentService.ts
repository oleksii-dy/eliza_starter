import {
  type IAgentRuntime,
  type UUID,
  Service,
  ServiceType,
  elizaLogger as logger,
} from '@elizaos/core';
import { ethers } from 'ethers';
import { eq, and, desc as _desc } from 'drizzle-orm';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import { Buffer } from 'node:buffer';
import {
  paymentTransactions,
  userWallets,
  dailySpending,
  type NewUserWallet,
} from '../database/schema';
import {
  PaymentRequest,
  PaymentResult,
  PaymentStatus,
  PaymentMethod,
  PaymentSettings as _PaymentSettings,
  type IWalletAdapter as _IWalletAdapter,
} from '../types';
import { v4 as _uuidv4 } from 'uuid';

/**
 * Simplified Payment Service
 * - Direct database integration
 * - Real wallet management
 * - No circular dependencies
 * - Clear error handling
 */
export class SimplePaymentService extends Service {
  static serviceName = 'simple-payment';
  static serviceType = ServiceType.UNKNOWN;

  public readonly serviceName = SimplePaymentService.serviceName;
  public readonly serviceType = SimplePaymentService.serviceType;
  public readonly capabilityDescription = 'Simple payment service with direct database integration';

  declare protected runtime: IAgentRuntime;
  private db!: PostgresJsDatabase<any>;
  private providers: Map<string, ethers.JsonRpcProvider> = new Map();
  private encryptionKey!: string;

  async initialize(runtime: IAgentRuntime): Promise<void> {
    this.runtime = runtime;

    // Get database
    const dbService = runtime.getService('database') as any;
    this.db = dbService?.getDatabase?.();

    if (!this.db) {
      throw new Error('Database service is required');
    }

    // Get or generate encryption key
    this.encryptionKey =
      runtime.getSetting('WALLET_ENCRYPTION_KEY') || this.generateEncryptionKey();

    // Initialize providers
    this.initializeProviders();

    logger.info('[SimplePaymentService] Initialized');
  }

  private initializeProviders(): void {
    // Initialize with real RPC endpoints
    const providers = {
      ethereum: new ethers.JsonRpcProvider(
        this.runtime.getSetting('ETH_RPC_URL') || 'https://eth.llamarpc.com'
      ),
      polygon: new ethers.JsonRpcProvider(
        this.runtime.getSetting('POLYGON_RPC_URL') || 'https://polygon-rpc.com'
      ),
      base: new ethers.JsonRpcProvider(
        this.runtime.getSetting('BASE_RPC_URL') || 'https://mainnet.base.org'
      ),
    };

    Object.entries(providers).forEach(([network, provider]) => {
      this.providers.set(network, provider);
    });
  }

  async processPayment(request: PaymentRequest): Promise<PaymentResult> {
    try {
      logger.info('[SimplePaymentService] Processing payment', {
        amount: request.amount.toString(),
        method: request.method,
      });

      // 1. Validate request
      const validation = await this.validateRequest(request);
      if (!validation.isValid) {
        throw new Error(validation.error);
      }

      // 2. Get or create wallet
      const wallet = await this.getOrCreateWallet(request.userId, request.method);

      // 3. Check balance
      const balance = await this.getBalance(wallet.address, request.method);
      if (balance < request.amount) {
        throw new Error(`Insufficient balance. Have: ${balance}, Need: ${request.amount}`);
      }

      // 4. Create transaction record
      const txRecord = {
        payerId: request.userId,
        agentId: this.runtime.agentId,
        amount: request.amount,
        currency: this.getCurrency(request.method),
        method: request.method,
        status: PaymentStatus.PROCESSING,
        fromAddress: wallet.address,
        toAddress: request.recipientAddress || '',
        metadata: request.metadata || {},
      };

      await this.db.insert(paymentTransactions).values(txRecord);

      // 5. Send transaction
      const provider = this.getProvider(request.method);
      const signer = new ethers.Wallet(wallet.privateKey, provider);

      let tx: ethers.TransactionResponse;

      if (this.isNativeToken(request.method)) {
        // Send native token
        tx = await signer.sendTransaction({
          to: request.recipientAddress,
          value: request.amount.toString(),
        });
      } else {
        // Send ERC20 token
        const tokenAddress = this.getTokenAddress(request.method);
        const tokenContract = new ethers.Contract(
          tokenAddress,
          ['function transfer(address to, uint256 amount) returns (bool)'],
          signer
        );

        tx = await tokenContract.transfer(request.recipientAddress, request.amount.toString());
      }

      // 6. Wait for confirmation
      const receipt = await tx.wait(1);

      // 7. Update transaction record
      const finalStatus = receipt?.status === 1 ? PaymentStatus.COMPLETED : PaymentStatus.FAILED;

      await this.db
        .update(paymentTransactions)
        .set({
          status: finalStatus,
          transactionHash: tx.hash,
          confirmations: 1,
          completedAt: new Date(),
        } as any)
        .where(eq(paymentTransactions.id, request.id));

      // 8. Update daily spending
      if (finalStatus === PaymentStatus.COMPLETED) {
        await this.updateDailySpending(request.userId, request.amount, request.method);
      }

      return {
        id: request.id,
        requestId: request.id,
        status: finalStatus,
        transactionHash: tx.hash,
        amount: request.amount,
        method: request.method,
        fromAddress: wallet.address,
        toAddress: request.recipientAddress || '',
        timestamp: Date.now(),
      };
    } catch (error) {
      logger.error('[SimplePaymentService] Payment failed', error);

      // Update transaction as failed
      await this.db
        .update(paymentTransactions)
        .set({
          status: PaymentStatus.FAILED,
          error: error instanceof Error ? error.message : 'Unknown error',
        } as any)
        .where(eq(paymentTransactions.id, request.id));

      throw error;
    }
  }

  private async validateRequest(
    request: PaymentRequest
  ): Promise<{ isValid: boolean; error?: string }> {
    if (!request.amount || request.amount <= BigInt(0)) {
      return { isValid: false, error: 'Invalid amount' };
    }

    if (!request.recipientAddress || !ethers.isAddress(request.recipientAddress)) {
      return { isValid: false, error: 'Invalid recipient address' };
    }

    if (!this.supportedMethods.includes(request.method)) {
      return { isValid: false, error: 'Unsupported payment method' };
    }

    // Check daily spending limit
    const dailySpent = await this.getDailySpending(request.userId);
    const maxDaily = parseFloat(this.runtime.getSetting('PAYMENT_MAX_DAILY_SPEND') || '1000');
    const amountUsd = await this.convertToUSD(request.amount, request.method);

    if (dailySpent + amountUsd > maxDaily) {
      return {
        isValid: false,
        error: `Daily spending limit exceeded. Limit: $${maxDaily}, Current: $${dailySpent.toFixed(2)}`,
      };
    }

    return { isValid: true };
  }

  private async getOrCreateWallet(
    userId: UUID,
    method: PaymentMethod
  ): Promise<{ address: string; privateKey: string }> {
    // Get network for method
    const network = this.getNetwork(method);

    // Check if wallet exists
    const [existing] = await this.db
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

    if (existing && existing.encryptedPrivateKey) {
      // Decrypt private key
      const privateKey = await this.decryptPrivateKey(existing.encryptedPrivateKey);
      return {
        address: existing.address,
        privateKey,
      };
    }

    // Create new wallet
    const wallet = ethers.Wallet.createRandom();
    const encryptedKey = await this.encryptPrivateKey(wallet.privateKey);

    const newWallet: NewUserWallet = {
      userId,
      address: wallet.address,
      network,
      encryptedPrivateKey: encryptedKey,
      isActive: true,
      isPrimary: true,
      metadata: {
        createdAt: new Date().toISOString(),
        purpose: 'payments',
      },
    } as any;

    await this.db.insert(userWallets).values(newWallet);

    logger.info('[SimplePaymentService] Created new wallet', {
      userId,
      address: wallet.address,
      network,
    });

    return {
      address: wallet.address,
      privateKey: wallet.privateKey,
    };
  }

  private async getBalance(address: string, method: PaymentMethod): Promise<bigint> {
    const provider = this.getProvider(method);

    if (this.isNativeToken(method)) {
      const balance = await provider.getBalance(address);
      return BigInt(balance.toString());
    } else {
      const tokenAddress = this.getTokenAddress(method);
      const tokenContract = new ethers.Contract(
        tokenAddress,
        ['function balanceOf(address) view returns (uint256)'],
        provider
      );

      const balance = await tokenContract.balanceOf(address);
      return BigInt(balance.toString());
    }
  }

  private async updateDailySpending(
    userId: UUID,
    amount: bigint,
    method: PaymentMethod
  ): Promise<void> {
    const today = new Date().toISOString().split('T')[0];
    const amountUsd = await this.convertToUSD(amount, method);

    const [existing] = await this.db
      .select()
      .from(dailySpending)
      .where(and(eq(dailySpending.userId, userId), eq(dailySpending.date, today)))
      .limit(1);

    if (existing) {
      await this.db
        .update(dailySpending)
        .set({
          totalSpentUsd: (parseFloat(existing.totalSpentUsd || '0') + amountUsd).toFixed(2),
          transactionCount: (existing.transactionCount || 0) + 1,
          updatedAt: new Date(),
        } as any)
        .where(eq(dailySpending.id, existing.id));
    } else {
      const newSpending = {
        userId,
        date: today,
        totalSpentUsd: amountUsd.toFixed(2),
        transactionCount: 1,
        breakdown: { [method]: amountUsd },
      };

      await this.db.insert(dailySpending).values(newSpending);
    }
  }

  private async getDailySpending(userId: UUID): Promise<number> {
    const today = new Date().toISOString().split('T')[0];

    const [record] = await this.db
      .select()
      .from(dailySpending)
      .where(and(eq(dailySpending.userId, userId), eq(dailySpending.date, today)))
      .limit(1);

    return record ? parseFloat(record.totalSpentUsd || '0') : 0;
  }

  private async convertToUSD(amount: bigint, method: PaymentMethod): Promise<number> {
    // Get price from CoinGecko
    const price = await this.getTokenPrice(method);
    const decimals = this.getDecimals(method);
    const divisor = BigInt(10 ** decimals);
    const whole = Number(amount / divisor);
    const fraction = Number(amount % divisor) / Number(divisor);

    return (whole + fraction) * price;
  }

  private async getTokenPrice(method: PaymentMethod): Promise<number> {
    // In production, use real price API
    // For now, use simplified prices
    const prices: Record<PaymentMethod, number> = {
      [PaymentMethod.USDC_ETH]: 1,
      [PaymentMethod.USDC_SOL]: 1,
      [PaymentMethod.ETH]: 2500,
      [PaymentMethod.SOL]: 100,
      [PaymentMethod.BTC]: 45000,
      [PaymentMethod.MATIC]: 0.8,
      [PaymentMethod.ARB]: 2500,
      [PaymentMethod.OP]: 2500,
      [PaymentMethod.BASE]: 2500,
      [PaymentMethod.OTHER]: 1,
    };

    return prices[method] || 1;
  }

  // Helper methods
  private get supportedMethods(): PaymentMethod[] {
    return [PaymentMethod.ETH, PaymentMethod.USDC_ETH, PaymentMethod.MATIC, PaymentMethod.BASE];
  }

  private getProvider(method: PaymentMethod): ethers.JsonRpcProvider {
    const network = this.getNetwork(method);
    const provider = this.providers.get(network);

    if (!provider) {
      throw new Error(`No provider for ${network}`);
    }

    return provider;
  }

  private getNetwork(method: PaymentMethod): string {
    const networkMap: Record<PaymentMethod, string> = {
      [PaymentMethod.ETH]: 'ethereum',
      [PaymentMethod.USDC_ETH]: 'ethereum',
      [PaymentMethod.MATIC]: 'polygon',
      [PaymentMethod.BASE]: 'base',
      [PaymentMethod.ARB]: 'arbitrum',
      [PaymentMethod.OP]: 'optimism',
      [PaymentMethod.SOL]: 'solana',
      [PaymentMethod.USDC_SOL]: 'solana',
      [PaymentMethod.BTC]: 'bitcoin',
      [PaymentMethod.OTHER]: 'ethereum',
    };

    return networkMap[method] || 'ethereum';
  }

  private isNativeToken(method: PaymentMethod): boolean {
    return [
      PaymentMethod.ETH,
      PaymentMethod.MATIC,
      PaymentMethod.ARB,
      PaymentMethod.OP,
      PaymentMethod.BASE,
    ].includes(method);
  }

  private getTokenAddress(method: PaymentMethod): string {
    const addresses: Record<PaymentMethod, string> = {
      [PaymentMethod.USDC_ETH]: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48', // USDC on Ethereum
      [PaymentMethod.USDC_SOL]: '',
      [PaymentMethod.ETH]: '',
      [PaymentMethod.SOL]: '',
      [PaymentMethod.BTC]: '',
      [PaymentMethod.MATIC]: '',
      [PaymentMethod.ARB]: '',
      [PaymentMethod.OP]: '',
      [PaymentMethod.BASE]: '',
      [PaymentMethod.OTHER]: '',
    };

    return addresses[method] || '';
  }

  private getCurrency(method: PaymentMethod): string {
    return method.replace('_ETH', '').replace('_SOL', '');
  }

  private getDecimals(method: PaymentMethod): number {
    if (method.includes('USDC')) {
      return 6;
    }
    if (method === PaymentMethod.SOL) {
      return 9;
    }
    if (method === PaymentMethod.BTC) {
      return 8;
    }
    return 18;
  }

  // Encryption helpers
  private async encryptPrivateKey(privateKey: string): Promise<string> {
    // In production, use proper encryption
    // For now, simple base64 encoding
    return Buffer.from(privateKey).toString('base64');
  }

  private async decryptPrivateKey(encrypted: string): Promise<string> {
    // In production, use proper decryption
    return Buffer.from(encrypted, 'base64').toString('utf8');
  }

  private generateEncryptionKey(): string {
    return ethers.hexlify(ethers.randomBytes(32));
  }

  async stop(): Promise<void> {
    logger.info('[SimplePaymentService] Stopping');
  }

  static async start(runtime: IAgentRuntime): Promise<SimplePaymentService> {
    const service = new SimplePaymentService();
    await service.initialize(runtime);
    return service;
  }
}
