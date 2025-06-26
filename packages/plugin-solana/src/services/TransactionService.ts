import {
  Connection,
  Transaction,
  TransactionInstruction,
  VersionedTransaction,
  SimulatedTransactionResponse,
  SendOptions,
  Keypair,
  PublicKey,
  TransactionSignature,
  Commitment,
  ComputeBudgetProgram,
  TransactionMessage,
  MessageV0,
  RecentPrioritizationFees,
  SystemProgram,
  AddressLookupTableAccount,
  LAMPORTS_PER_SOL,
} from '@solana/web3.js';
import { IAgentRuntime, logger, Service } from '@elizaos/core';
import { SecureKeyManager } from './SecureKeyManager';
import { RateLimiter } from '../utils/rateLimiter';
import bs58 from 'bs58';

interface TransactionOptions {
  priorityFee?: number;
  maxRetries?: number;
  skipPreflight?: boolean;
  preflightCommitment?: 'processed' | 'confirmed' | 'finalized';
  useMevProtection?: boolean;
  simulateFirst?: boolean;
}

interface SimulationResult {
  success: boolean;
  error?: string;
  logs?: string[];
  unitsConsumed?: number;
  returnData?: any;
}

interface PriorityFeeEstimate {
  min: number;
  median: number;
  max: number;
  recommended: number;
}

export interface TransactionConfig {
  instructions: TransactionInstruction[];
  signers: Keypair[];
  feePayer?: PublicKey;
  simulate?: boolean;
  maxRetries?: number;
  commitment?: Commitment;
  priorityFee?: number; // in microLamports
  computeUnits?: number;
}

export interface TransactionResult {
  success: boolean;
  signature?: string;
  error?: string;
  simulation?: SimulatedTransactionResponse;
  slot?: number;
  confirmations?: number;
}

export interface TransactionError {
  code: string;
  message: string;
  logs?: string[];
}

export class TransactionService extends Service {
  static serviceName = 'transaction-service';
  static serviceType = 'transaction-service';
  private connection: Connection;
  private maxRetries: number = 3;
  private retryDelay: number = 1000;
  private defaultPriorityFee: number = 1000; // 1000 microLamports
  private keyManager: SecureKeyManager;
  private rateLimiter: RateLimiter;

  // MEV protection endpoints
  private readonly JITO_TIP_ACCOUNTS = [
    '96gYZGLnJYVFmbjzopPSU6QiEV5fGqZNyN9nmNhvrZU5',
    'HFqU5x63VTqvQss8hp11i4wVV8bD44PvwucfZ2bU7gRe',
    'Cw8CFyM9FkoMi7K7Crf6HNQqf4uEMzpKw6QNghXLvLkY',
    'ADaUMid9yfUytqMBgopwjb2DTLSokTSzL1zt6iGPaS49',
    'DfXygSm4jCyNCybVYYK6DwvWqjKee8pbDmJGcLWNDXjh',
    'ADuUkR4vqLUMWXxW9gh6D6L8pMSawimctcNZ5pGwDcEt',
    'DttWaMuVvTiduZRnguLF7jNxTgiMBZ1hyAumKUiL2KRL',
    'ALeaCzuJpZpoCgTxMjJbNjREVqSwuvYFRZUfc151AKHU',
  ];

  constructor(runtime: IAgentRuntime) {
    super(runtime);
    const rpcUrl = runtime.getSetting('SOLANA_RPC_URL') || 'https://api.mainnet-beta.solana.com';
    this.connection = new Connection(rpcUrl, 'confirmed');
    this.keyManager = new SecureKeyManager(runtime);
    this.rateLimiter = new RateLimiter({ maxRequests: 20, windowMs: 60000 });

    logger.info('TransactionService initialized');
  }

  static async start(runtime: IAgentRuntime): Promise<TransactionService> {
    return new TransactionService(runtime);
  }

  get capabilityDescription(): string {
    return 'Advanced Solana transaction building, simulation, and submission with retry logic and priority fees';
  }

  async stop(): Promise<void> {
    // No cleanup needed for this service
    logger.info('TransactionService stopped');
  }

  /**
   * Simulate a transaction before sending
   */
  async simulateTransaction(
    transaction: Transaction | VersionedTransaction,
    signers?: Keypair[]
  ): Promise<SimulationResult> {
    await this.rateLimiter.checkLimit('tx-simulate');

    try {
      let response;

      if (transaction instanceof Transaction) {
        // Legacy transaction
        if (signers && signers.length > 0) {
          transaction.sign(...signers);
        }

        response = await this.connection.simulateTransaction(transaction, signers);
      } else {
        // Versioned transaction
        response = await this.connection.simulateTransaction(transaction);
      }

      const success = response.value.err === null;

      logger.info('Transaction simulation result', {
        success,
        unitsConsumed: response.value.unitsConsumed,
        logsLength: response.value.logs?.length || 0,
      });

      return {
        success,
        error: response.value.err ? JSON.stringify(response.value.err) : undefined,
        logs: response.value.logs || [],
        unitsConsumed: response.value.unitsConsumed || 0,
        returnData: response.value.returnData,
      };
    } catch (error) {
      logger.error('Transaction simulation failed', { error });
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Get priority fee estimates
   */
  async estimatePriorityFee(transaction?: Transaction): Promise<PriorityFeeEstimate> {
    await this.rateLimiter.checkLimit('priority-fee');

    try {
      const recentFees = await this.connection.getRecentPrioritizationFees();

      const fees = recentFees
        .map((f) => f.prioritizationFee)
        .filter((f) => f > 0)
        .sort((a, b) => a - b);

      if (fees.length === 0) {
        // No fees found, return defaults
        return {
          min: 1000,
          median: 5000,
          max: 50000,
          recommended: 10000,
        };
      }

      const min = Math.min(...fees);
      const max = Math.max(...fees);
      const median = fees[Math.floor(fees.length / 2)];

      // Recommend slightly above median for better inclusion
      const recommended = Math.ceil(median * 1.2);

      logger.info('Priority fee estimates', {
        min,
        median,
        max,
        recommended,
      });

      return { min, median, max, recommended };
    } catch (error) {
      logger.error('Failed to estimate priority fees', { error });
      // Return default values
      return {
        min: 1000,
        median: 5000,
        max: 50000,
        recommended: 10000,
      };
    }
  }

  /**
   * Add priority fee to transaction
   */
  addPriorityFee(
    transaction: Transaction,
    microLamports: number,
    computeUnits?: number
  ): Transaction {
    // Add compute budget instructions
    const modifyComputeUnits = ComputeBudgetProgram.setComputeUnitLimit({
      units: computeUnits || 200000,
    });

    const addPriorityFee = ComputeBudgetProgram.setComputeUnitPrice({
      microLamports,
    });

    // Add instructions at the beginning
    transaction.instructions.unshift(modifyComputeUnits, addPriorityFee);

    return transaction;
  }

  /**
   * Send transaction with MEV protection via Jito
   */
  async sendTransactionWithMevProtection(
    transaction: Transaction,
    signers: Keypair[],
    tipAmount: number = 10000 // 0.00001 SOL default tip
  ): Promise<string> {
    await this.rateLimiter.checkLimit('tx-send-mev');

    try {
      // Add tip to random Jito account
      const tipAccount =
        this.JITO_TIP_ACCOUNTS[Math.floor(Math.random() * this.JITO_TIP_ACCOUNTS.length)];

      const tipInstruction = SystemProgram.transfer({
        fromPubkey: signers[0].publicKey,
        toPubkey: new PublicKey(tipAccount),
        lamports: tipAmount,
      });

      transaction.add(tipInstruction);

      // Send to Jito RPC endpoint
      const jitoEndpoint = this.runtime.getSetting('JITO_RPC_ENDPOINT');
      if (!jitoEndpoint) {
        logger.warn('Jito RPC endpoint not configured, falling back to regular send');
        return await this.sendTransaction(transaction, signers);
      }

      const jitoConnection = new Connection(jitoEndpoint);

      const signature = await jitoConnection.sendTransaction(transaction, signers, {
        skipPreflight: true,
        maxRetries: 0,
      });

      logger.info('Transaction sent with MEV protection', {
        signature,
        tipAmount,
        tipAccount,
      });

      return signature;
    } catch (error) {
      logger.error('Failed to send with MEV protection', { error });
      throw error;
    }
  }

  /**
   * Send transaction with automatic retries and priority fees
   */
  async sendTransaction(
    transaction: Transaction,
    signers: Keypair[],
    options: TransactionOptions = {}
  ): Promise<string> {
    await this.rateLimiter.checkLimit('tx-send');

    const {
      priorityFee,
      maxRetries = 3,
      skipPreflight = false,
      preflightCommitment = 'confirmed',
      useMevProtection = false,
      simulateFirst = true,
    } = options;

    try {
      // Simulate first if requested
      if (simulateFirst) {
        const simulation = await this.simulateTransaction(transaction, signers);
        if (!simulation.success) {
          throw new Error(`Transaction simulation failed: ${simulation.error}`);
        }
      }

      // Add priority fee if specified
      if (priorityFee && priorityFee > 0) {
        this.addPriorityFee(transaction, priorityFee);
      } else {
        // Auto-estimate and add priority fee
        const estimate = await this.estimatePriorityFee(transaction);
        this.addPriorityFee(transaction, estimate.recommended);
      }

      // Use MEV protection if requested
      if (useMevProtection) {
        return await this.sendTransactionWithMevProtection(transaction, signers);
      }

      // Send regular transaction
      const signature = await this.connection.sendTransaction(transaction, signers, {
        skipPreflight,
        preflightCommitment,
        maxRetries,
      });

      logger.info('Transaction sent', {
        signature,
        priorityFee,
        maxRetries,
      });

      return signature;
    } catch (error) {
      logger.error('Failed to send transaction', { error });
      throw error;
    }
  }

  /**
   * Create versioned transaction with lookup tables
   */
  async createVersionedTransaction(
    instructions: TransactionInstruction[],
    payer: PublicKey,
    lookupTables?: PublicKey[]
  ): Promise<VersionedTransaction> {
    await this.rateLimiter.checkLimit('tx-create');

    try {
      // Get lookup table accounts if provided
      let lookupTableAccounts: AddressLookupTableAccount[] = [];

      if (lookupTables && lookupTables.length > 0) {
        const accountInfos = await this.connection.getMultipleAccountsInfo(lookupTables);

        lookupTableAccounts = accountInfos
          .map((info, index) => {
            if (!info) {
              return null;
            }
            return new AddressLookupTableAccount({
              key: lookupTables[index],
              state: AddressLookupTableAccount.deserialize(info.data),
            });
          })
          .filter((account): account is AddressLookupTableAccount => account !== null);
      }

      // Get latest blockhash
      const { blockhash } = await this.connection.getLatestBlockhash();

      // Create message
      const message = new TransactionMessage({
        payerKey: payer,
        recentBlockhash: blockhash,
        instructions,
      }).compileToV0Message(lookupTableAccounts);

      // Create versioned transaction
      const transaction = new VersionedTransaction(message);

      logger.info('Created versioned transaction', {
        instructionCount: instructions.length,
        lookupTableCount: lookupTableAccounts.length,
      });

      return transaction;
    } catch (error) {
      logger.error('Failed to create versioned transaction', { error });
      throw error;
    }
  }

  /**
   * Wait for transaction confirmation with timeout
   */
  async confirmTransaction(
    signature: string,
    commitment: 'processed' | 'confirmed' | 'finalized' = 'confirmed',
    timeout: number = 30000
  ): Promise<boolean> {
    await this.rateLimiter.checkLimit('tx-confirm');

    try {
      const start = Date.now();

      while (Date.now() - start < timeout) {
        const status = await this.connection.getSignatureStatus(signature);

        if (status.value?.confirmationStatus === commitment) {
          logger.info('Transaction confirmed', {
            signature,
            commitment,
            timeElapsed: Date.now() - start,
          });
          return true;
        }

        if (status.value?.err) {
          logger.error('Transaction failed', {
            signature,
            error: status.value.err,
          });
          return false;
        }

        // Wait before checking again
        await new Promise((resolve) => setTimeout(resolve, 1000));
      }

      logger.warn('Transaction confirmation timeout', {
        signature,
        timeout,
      });
      return false;
    } catch (error) {
      logger.error('Failed to confirm transaction', { error, signature });
      return false;
    }
  }

  /**
   * Get transaction details
   */
  async getTransactionDetails(signature: string): Promise<any> {
    await this.rateLimiter.checkLimit('tx-details');

    try {
      const transaction = await this.connection.getTransaction(signature, {
        maxSupportedTransactionVersion: 0,
      });

      if (!transaction) {
        return null;
      }

      return {
        signature,
        slot: transaction.slot,
        blockTime: transaction.blockTime,
        fee: transaction.meta?.fee,
        err: transaction.meta?.err,
        logs: transaction.meta?.logMessages,
        preBalances: transaction.meta?.preBalances,
        postBalances: transaction.meta?.postBalances,
      };
    } catch (error) {
      logger.error('Failed to get transaction details', { error, signature });
      return null;
    }
  }

  /**
   * Bundle multiple transactions
   */
  async bundleTransactions(transactions: Transaction[], signers: Keypair[]): Promise<string[]> {
    await this.rateLimiter.checkLimit('tx-bundle');

    const signatures: string[] = [];

    try {
      // Send transactions in sequence
      for (const transaction of transactions) {
        const signature = await this.sendTransaction(transaction, signers, {
          simulateFirst: true,
          priorityFee: 10000,
        });

        signatures.push(signature);

        // Wait for confirmation before sending next
        await this.confirmTransaction(signature);
      }

      logger.info('Transaction bundle sent', {
        count: transactions.length,
        signatures,
      });

      return signatures;
    } catch (error) {
      logger.error('Failed to bundle transactions', {
        error,
        successCount: signatures.length,
      });
      throw error;
    }
  }

  /**
   * Execute a transaction with the provided configuration
   */
  async executeTransaction(config: TransactionConfig): Promise<TransactionResult> {
    await this.rateLimiter.checkLimit('tx-execute');

    try {
      // Create transaction
      const transaction = new Transaction();

      // Add instructions
      for (const instruction of config.instructions) {
        transaction.add(instruction);
      }

      // Set fee payer
      if (config.feePayer) {
        transaction.feePayer = config.feePayer;
      } else if (config.signers.length > 0) {
        transaction.feePayer = config.signers[0].publicKey;
      }

      // Get recent blockhash
      const { blockhash } = await this.connection.getLatestBlockhash();
      transaction.recentBlockhash = blockhash;

      // If simulate only
      if (config.simulate) {
        const simulation = await this.simulateTransaction(transaction, config.signers);
        return {
          success: simulation.success,
          error: simulation.error,
          simulation: {
            err: simulation.success ? null : simulation.error,
            logs: simulation.logs,
            unitsConsumed: simulation.unitsConsumed,
            returnData: simulation.returnData,
          } as SimulatedTransactionResponse,
        };
      }

      // Add priority fee if specified
      if (config.priorityFee && config.priorityFee > 0) {
        this.addPriorityFee(transaction, config.priorityFee, config.computeUnits);
      }

      // Send transaction with retries
      let lastError: Error | null = null;
      const maxRetries = config.maxRetries || this.maxRetries;

      for (let attempt = 0; attempt < maxRetries; attempt++) {
        try {
          const signature = await this.connection.sendTransaction(transaction, config.signers, {
            skipPreflight: false,
            preflightCommitment: config.commitment || 'confirmed',
          });

          // Wait for confirmation
          const confirmed = await this.confirmTransaction(
            signature,
            (config.commitment || 'confirmed') as 'processed' | 'confirmed' | 'finalized'
          );

          if (confirmed) {
            return {
              success: true,
              signature,
            };
          }

          lastError = new Error('Transaction failed to confirm');
        } catch (error) {
          lastError = error as Error;
          logger.warn(`Transaction attempt ${attempt + 1} failed`, { error });

          if (attempt < maxRetries - 1) {
            await new Promise((resolve) => setTimeout(resolve, this.retryDelay));
          }
        }
      }

      // All retries failed
      return {
        success: false,
        error: lastError?.message || 'Transaction failed after all retries',
      };
    } catch (error) {
      logger.error('Transaction execution failed', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Create a SOL transfer transaction
   */
  async createTransferTransaction(
    from: Keypair,
    to: PublicKey,
    amount: number // in SOL
  ): Promise<Transaction> {
    if (amount <= 0) {
      throw new Error('Transfer amount must be greater than 0');
    }

    const transaction = new Transaction();

    // Get recent blockhash
    const { blockhash } = await this.connection.getLatestBlockhash();
    transaction.recentBlockhash = blockhash;
    transaction.feePayer = from.publicKey;

    // Create transfer instruction
    const transferInstruction = SystemProgram.transfer({
      fromPubkey: from.publicKey,
      toPubkey: to,
      lamports: Math.floor(amount * LAMPORTS_PER_SOL),
    });

    transaction.add(transferInstruction);

    logger.info('Created transfer transaction', {
      from: from.publicKey.toString(),
      to: to.toString(),
      amount,
    });

    return transaction;
  }

  /**
   * Build and send a transaction (alias for executeTransaction for backward compatibility)
   */
  async buildAndSendTransaction(config: TransactionConfig): Promise<TransactionResult> {
    return this.executeTransaction(config);
  }
}
