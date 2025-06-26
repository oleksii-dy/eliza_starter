import { Connection, PublicKey, Transaction, TransactionInstruction } from '@solana/web3.js';
import { IAgentRuntime, logger, Service } from '@elizaos/core';
import { SecureKeyManager } from './SecureKeyManager';
import { RateLimiter } from '../utils/rateLimiter';
import { getAssociatedTokenAddress } from '@solana/spl-token';

interface LendingPosition {
  protocol: 'kamino' | 'marginfi';
  supplyAmount: number;
  borrowAmount: number;
  supplyApy: number;
  borrowApy: number;
  healthFactor: number;
  liquidationThreshold: number;
}

interface LendingMarket {
  protocol: 'kamino' | 'marginfi';
  marketAddress: PublicKey;
  tokenMint: PublicKey;
  supplyApy: number;
  borrowApy: number;
  totalSupply: number;
  totalBorrow: number;
  utilizationRate: number;
}

export class LendingService extends Service {
  static serviceName = 'lending';
  static serviceType = 'lending-service';
  capabilityDescription = 'Lending and borrowing operations on Solana DeFi protocols';

  private connection: Connection;
  protected runtime: IAgentRuntime;
  private keyManager: SecureKeyManager | null = null;
  private rateLimiter: RateLimiter;

  // Protocol program IDs
  private readonly KAMINO_PROGRAM_ID = new PublicKey('KLend2g3cP87fffoy8q1mQqGKjrxjC8boSyAYavgmjD');
  private readonly MARGINFI_PROGRAM_ID = new PublicKey(
    'MFv2hWf31Z9kbCa1snEPYctwafyhdvnV7FZnsebVacA'
  );

  constructor(runtime: IAgentRuntime) {
    super();
    this.runtime = runtime;
    this.connection = new Connection(
      runtime.getSetting('SOLANA_RPC_URL') || 'https://api.mainnet-beta.solana.com'
    );
    this.rateLimiter = new RateLimiter({
      maxRequests: 20,
      windowMs: 60000,
    });
  }

  static async start(runtime: IAgentRuntime): Promise<LendingService> {
    const service = new LendingService(runtime);
    await service.initialize();
    return service;
  }

  async initialize(): Promise<void> {
    // Don't get key manager during initialization
    // It will be retrieved lazily when needed
    logger.info('LendingService initialized');
  }

  private getKeyManager(): SecureKeyManager {
    if (!this.keyManager) {
      this.keyManager = this.runtime.getService('secure-key-manager') as SecureKeyManager;
      if (!this.keyManager) {
        throw new Error('SecureKeyManager service not available');
      }
    }
    return this.keyManager;
  }

  async stop(): Promise<void> {
    // No cleanup needed
  }

  /**
   * Deposit tokens into a lending protocol
   */
  async deposit(
    protocol: 'kamino' | 'marginfi',
    tokenMint: PublicKey,
    amount: number
  ): Promise<string> {
    await this.rateLimiter.checkLimit('lending-deposit');

    const walletKeypair = await this.getKeyManager().getAgentKeypair();

    logger.info(`Depositing ${amount} tokens to ${protocol}`, {
      tokenMint: tokenMint.toString(),
      protocol,
    });

    try {
      // Get user token account
      const userTokenAccount = await getAssociatedTokenAddress(tokenMint, walletKeypair.publicKey);

      // Create deposit transaction based on protocol
      const transaction = new Transaction();

      if (protocol === 'kamino') {
        const instructions = await this.createKaminoDepositInstructions(
          tokenMint,
          amount,
          walletKeypair.publicKey,
          userTokenAccount
        );
        transaction.add(...instructions);
      } else {
        const instructions = await this.createMarginFiDepositInstructions(
          tokenMint,
          amount,
          walletKeypair.publicKey,
          userTokenAccount
        );
        transaction.add(...instructions);
      }

      const signature = await this.connection.sendTransaction(transaction, [walletKeypair], {
        skipPreflight: false,
      });

      await this.connection.confirmTransaction(signature, 'confirmed');

      logger.info('Deposit successful', {
        protocol,
        amount,
        signature,
      });

      return signature;
    } catch (error) {
      logger.error('Deposit failed', { error, protocol, amount });
      throw error;
    }
  }

  /**
   * Borrow tokens from a lending protocol
   */
  async borrow(
    protocol: 'kamino' | 'marginfi',
    tokenMint: PublicKey,
    amount: number
  ): Promise<string> {
    await this.rateLimiter.checkLimit('lending-borrow');

    const walletKeypair = await this.getKeyManager().getAgentKeypair();

    logger.info(`Borrowing ${amount} tokens from ${protocol}`, {
      tokenMint: tokenMint.toString(),
      protocol,
    });

    try {
      // Check health factor before borrowing
      const position = await this.getUserPosition(protocol, walletKeypair.publicKey);
      if (position && position.healthFactor < 1.2) {
        throw new Error('Health factor too low to borrow');
      }

      // Get user token account
      const userTokenAccount = await getAssociatedTokenAddress(tokenMint, walletKeypair.publicKey);

      // Create borrow transaction
      const transaction = new Transaction();

      if (protocol === 'kamino') {
        const instructions = await this.createKaminoBorrowInstructions(
          tokenMint,
          amount,
          walletKeypair.publicKey,
          userTokenAccount
        );
        transaction.add(...instructions);
      } else {
        const instructions = await this.createMarginFiBorrowInstructions(
          tokenMint,
          amount,
          walletKeypair.publicKey,
          userTokenAccount
        );
        transaction.add(...instructions);
      }

      const signature = await this.connection.sendTransaction(transaction, [walletKeypair], {
        skipPreflight: false,
      });

      await this.connection.confirmTransaction(signature, 'confirmed');

      logger.info('Borrow successful', {
        protocol,
        amount,
        signature,
      });

      return signature;
    } catch (error) {
      logger.error('Borrow failed', { error, protocol, amount });
      throw error;
    }
  }

  /**
   * Repay borrowed tokens
   */
  async repay(
    protocol: 'kamino' | 'marginfi',
    tokenMint: PublicKey,
    amount: number
  ): Promise<string> {
    await this.rateLimiter.checkLimit('lending-repay');

    const walletKeypair = await this.getKeyManager().getAgentKeypair();

    logger.info(`Repaying ${amount} tokens to ${protocol}`, {
      tokenMint: tokenMint.toString(),
      protocol,
    });

    try {
      // Get user token account
      const userTokenAccount = await getAssociatedTokenAddress(tokenMint, walletKeypair.publicKey);

      // Create repay transaction
      const transaction = new Transaction();

      if (protocol === 'kamino') {
        const instructions = await this.createKaminoRepayInstructions(
          tokenMint,
          amount,
          walletKeypair.publicKey,
          userTokenAccount
        );
        transaction.add(...instructions);
      } else {
        const instructions = await this.createMarginFiRepayInstructions(
          tokenMint,
          amount,
          walletKeypair.publicKey,
          userTokenAccount
        );
        transaction.add(...instructions);
      }

      const signature = await this.connection.sendTransaction(transaction, [walletKeypair], {
        skipPreflight: false,
      });

      await this.connection.confirmTransaction(signature, 'confirmed');

      logger.info('Repay successful', {
        protocol,
        amount,
        signature,
      });

      return signature;
    } catch (error) {
      logger.error('Repay failed', { error, protocol, amount });
      throw error;
    }
  }

  /**
   * Withdraw deposited tokens
   */
  async withdraw(
    protocol: 'kamino' | 'marginfi',
    tokenMint: PublicKey,
    amount: number
  ): Promise<string> {
    await this.rateLimiter.checkLimit('lending-withdraw');

    const walletKeypair = await this.getKeyManager().getAgentKeypair();

    logger.info(`Withdrawing ${amount} tokens from ${protocol}`, {
      tokenMint: tokenMint.toString(),
      protocol,
    });

    try {
      // Check health factor before withdrawing
      const position = await this.getUserPosition(protocol, walletKeypair.publicKey);
      if (position && position.borrowAmount > 0 && position.healthFactor < 1.5) {
        throw new Error('Health factor too low to withdraw');
      }

      // Get user token account
      const userTokenAccount = await getAssociatedTokenAddress(tokenMint, walletKeypair.publicKey);

      // Create withdraw transaction
      const transaction = new Transaction();

      if (protocol === 'kamino') {
        const instructions = await this.createKaminoWithdrawInstructions(
          tokenMint,
          amount,
          walletKeypair.publicKey,
          userTokenAccount
        );
        transaction.add(...instructions);
      } else {
        const instructions = await this.createMarginFiWithdrawInstructions(
          tokenMint,
          amount,
          walletKeypair.publicKey,
          userTokenAccount
        );
        transaction.add(...instructions);
      }

      const signature = await this.connection.sendTransaction(transaction, [walletKeypair], {
        skipPreflight: false,
      });

      await this.connection.confirmTransaction(signature, 'confirmed');

      logger.info('Withdraw successful', {
        protocol,
        amount,
        signature,
      });

      return signature;
    } catch (error) {
      logger.error('Withdraw failed', { error, protocol, amount });
      throw error;
    }
  }

  /**
   * Get user's lending position
   */
  async getUserPosition(
    protocol: 'kamino' | 'marginfi',
    userPubkey: PublicKey
  ): Promise<LendingPosition | null> {
    await this.rateLimiter.checkLimit('lending-position');

    try {
      // In production, this would fetch actual position data from protocol
      // For now, return mock data
      return {
        protocol,
        supplyAmount: 1000,
        borrowAmount: 500,
        supplyApy: 5.2,
        borrowApy: 8.5,
        healthFactor: 1.8,
        liquidationThreshold: 0.8,
      };
    } catch (error) {
      logger.error('Failed to get user position', { error, protocol });
      return null;
    }
  }

  /**
   * Get lending markets
   */
  async getMarkets(protocol: 'kamino' | 'marginfi'): Promise<LendingMarket[]> {
    await this.rateLimiter.checkLimit('lending-markets');

    try {
      // In production, this would fetch actual market data
      // For now, return mock data
      return [
        {
          protocol,
          marketAddress: PublicKey.default,
          tokenMint: new PublicKey('So11111111111111111111111111111111111111112'), // SOL
          supplyApy: 4.5,
          borrowApy: 7.2,
          totalSupply: 1000000,
          totalBorrow: 600000,
          utilizationRate: 0.6,
        },
        {
          protocol,
          marketAddress: PublicKey.default,
          tokenMint: new PublicKey('EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v'), // USDC
          supplyApy: 3.2,
          borrowApy: 5.8,
          totalSupply: 5000000,
          totalBorrow: 3000000,
          utilizationRate: 0.6,
        },
      ];
    } catch (error) {
      logger.error('Failed to get markets', { error, protocol });
      return [];
    }
  }

  /**
   * Get best lending rates across protocols
   */
  async getBestRates(tokenMint: PublicKey): Promise<{
    bestSupply: { protocol: string; apy: number };
    bestBorrow: { protocol: string; apy: number };
  }> {
    const kaminoMarkets = await this.getMarkets('kamino');
    const marginfiMarkets = await this.getMarkets('marginfi');

    const allMarkets = [...kaminoMarkets, ...marginfiMarkets];
    const tokenMarkets = allMarkets.filter((m) => m.tokenMint.equals(tokenMint));

    let bestSupply = { protocol: '', apy: 0 };
    let bestBorrow = { protocol: '', apy: Number.MAX_VALUE };

    for (const market of tokenMarkets) {
      if (market.supplyApy > bestSupply.apy) {
        bestSupply = { protocol: market.protocol, apy: market.supplyApy };
      }
      if (market.borrowApy < bestBorrow.apy) {
        bestBorrow = { protocol: market.protocol, apy: market.borrowApy };
      }
    }

    return { bestSupply, bestBorrow };
  }

  // Private helper methods for creating protocol-specific instructions

  private async createKaminoDepositInstructions(
    tokenMint: PublicKey,
    amount: number,
    userPubkey: PublicKey,
    userTokenAccount: PublicKey
  ): Promise<TransactionInstruction[]> {
    // In production, use Kamino SDK
    return [];
  }

  private async createKaminoBorrowInstructions(
    tokenMint: PublicKey,
    amount: number,
    userPubkey: PublicKey,
    userTokenAccount: PublicKey
  ): Promise<TransactionInstruction[]> {
    // In production, use Kamino SDK
    return [];
  }

  private async createKaminoRepayInstructions(
    tokenMint: PublicKey,
    amount: number,
    userPubkey: PublicKey,
    userTokenAccount: PublicKey
  ): Promise<TransactionInstruction[]> {
    // In production, use Kamino SDK
    return [];
  }

  private async createKaminoWithdrawInstructions(
    tokenMint: PublicKey,
    amount: number,
    userPubkey: PublicKey,
    userTokenAccount: PublicKey
  ): Promise<TransactionInstruction[]> {
    // In production, use Kamino SDK
    return [];
  }

  private async createMarginFiDepositInstructions(
    tokenMint: PublicKey,
    amount: number,
    userPubkey: PublicKey,
    userTokenAccount: PublicKey
  ): Promise<TransactionInstruction[]> {
    // In production, use MarginFi SDK
    return [];
  }

  private async createMarginFiBorrowInstructions(
    tokenMint: PublicKey,
    amount: number,
    userPubkey: PublicKey,
    userTokenAccount: PublicKey
  ): Promise<TransactionInstruction[]> {
    // In production, use MarginFi SDK
    return [];
  }

  private async createMarginFiRepayInstructions(
    tokenMint: PublicKey,
    amount: number,
    userPubkey: PublicKey,
    userTokenAccount: PublicKey
  ): Promise<TransactionInstruction[]> {
    // In production, use MarginFi SDK
    return [];
  }

  private async createMarginFiWithdrawInstructions(
    tokenMint: PublicKey,
    amount: number,
    userPubkey: PublicKey,
    userTokenAccount: PublicKey
  ): Promise<TransactionInstruction[]> {
    // In production, use MarginFi SDK
    return [];
  }
}
