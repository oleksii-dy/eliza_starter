import {
  Connection,
  PublicKey,
  ParsedTransactionWithMeta,
  TransactionSignature,
  GetVersionedTransactionConfig,
  Finality,
  ConfirmedSignatureInfo,
} from '@solana/web3.js';
import { IAgentRuntime, logger, Service } from '@elizaos/core';
import { RateLimiter } from '../utils/rateLimiter';

interface TransactionFilter {
  address?: PublicKey;
  type?: 'transfer' | 'swap' | 'stake' | 'nft' | 'defi';
  startTime?: number;
  endTime?: number;
  minAmount?: number;
  maxAmount?: number;
  status?: 'success' | 'failed';
}

interface TransactionSummary {
  signature: string;
  blockTime: number | null;
  slot: number;
  type: string;
  status: 'success' | 'failed';
  fee: number;
  from?: string;
  to?: string;
  amount?: number;
  token?: string;
  memo?: string;
}

interface TransactionStats {
  totalTransactions: number;
  successfulTransactions: number;
  failedTransactions: number;
  totalFees: number;
  totalVolume: number;
  transactionsByType: Record<string, number>;
  averageTransactionFee: number;
}

export class TransactionHistoryService extends Service {
  static serviceName = 'transaction-history';
  static serviceType = 'transaction-history-service';
  capabilityDescription = 'Transaction history tracking and analysis for Solana wallets';

  private connection: Connection;
  protected runtime: IAgentRuntime;
  private rateLimiter: RateLimiter;
  private transactionCache: Map<string, TransactionSummary> = new Map();
  private cacheTimeout: number = 5 * 60 * 1000; // 5 minutes

  constructor(runtime: IAgentRuntime) {
    super();
    this.runtime = runtime;
    this.connection = new Connection(
      runtime.getSetting('SOLANA_RPC_URL') || 'https://api.mainnet-beta.solana.com'
    );
    this.rateLimiter = new RateLimiter({
      maxRequests: 5,
      windowMs: 60000,
    });
  }

  static async start(runtime: IAgentRuntime): Promise<TransactionHistoryService> {
    const service = new TransactionHistoryService(runtime);
    await service.initialize();
    return service;
  }

  async initialize(): Promise<void> {
    // No initialization needed
  }

  async stop(): Promise<void> {
    this.transactionCache.clear();
  }

  /**
   * Get transaction history for an address
   */
  async getTransactionHistory(
    address: PublicKey,
    options: {
      limit?: number;
      before?: string;
      filter?: TransactionFilter;
    } = {}
  ): Promise<TransactionSummary[]> {
    await this.rateLimiter.checkLimit('history-fetch');

    const { limit = 100, before, filter } = options;

    try {
      // Get signatures
      const signatures = await this.connection.getSignaturesForAddress(address, {
        limit,
        before,
      });

      const transactions: TransactionSummary[] = [];

      // Fetch transaction details in batches
      const batchSize = 10;
      for (let i = 0; i < signatures.length; i += batchSize) {
        const batch = signatures.slice(i, i + batchSize);
        const batchPromises = batch.map((sig) => this.getTransactionDetails(sig.signature));

        const batchResults = await Promise.allSettled(batchPromises);

        for (const result of batchResults) {
          if (result.status === 'fulfilled' && result.value) {
            const tx = result.value;

            // Apply filters
            if (this.matchesFilter(tx, filter)) {
              transactions.push(tx);
            }
          }
        }
      }

      logger.info('Transaction history fetched', {
        address: address.toString(),
        count: transactions.length,
      });

      return transactions;
    } catch (error) {
      logger.error('Failed to get transaction history', { error });
      throw error;
    }
  }

  /**
   * Get detailed transaction information
   */
  async getTransactionDetails(signature: string): Promise<TransactionSummary | null> {
    await this.rateLimiter.checkLimit('tx-details');

    // Check cache
    const cached = this.transactionCache.get(signature);
    if (cached) {
      return cached;
    }

    try {
      const config: GetVersionedTransactionConfig = {
        maxSupportedTransactionVersion: 0,
      };

      const tx = await this.connection.getParsedTransaction(signature, config);

      if (!tx) {
        return null;
      }

      const summary = this.parseTransaction(signature, tx);

      // Cache the result
      this.transactionCache.set(signature, summary);
      setTimeout(() => {
        this.transactionCache.delete(signature);
      }, this.cacheTimeout);

      return summary;
    } catch (error) {
      logger.error('Failed to get transaction details', { error, signature });
      return null;
    }
  }

  /**
   * Parse transaction into summary
   */
  private parseTransaction(signature: string, tx: ParsedTransactionWithMeta): TransactionSummary {
    const status = tx.meta?.err ? 'failed' : 'success';
    const fee = tx.meta?.fee || 0;
    const slot = tx.slot;
    const blockTime = tx.blockTime || null;

    // Detect transaction type
    const type = this.detectTransactionType(tx);

    // Extract transfer details if applicable
    let from: string | undefined;
    let to: string | undefined;
    let amount: number | undefined;
    let token: string | undefined;

    if (type === 'transfer') {
      const transferInfo = this.extractTransferInfo(tx);
      if (transferInfo) {
        from = transferInfo.from;
        to = transferInfo.to;
        amount = transferInfo.amount;
        token = transferInfo.token;
      }
    }

    // Extract memo if present
    const memo = this.extractMemo(tx);

    return {
      signature,
      blockTime,
      slot,
      type,
      status,
      fee,
      from,
      to,
      amount,
      token,
      memo,
    };
  }

  /**
   * Detect transaction type
   */
  private detectTransactionType(tx: ParsedTransactionWithMeta): string {
    const instructions = tx.transaction.message.instructions;

    for (const ix of instructions) {
      if ('parsed' in ix) {
        const parsed = ix.parsed;

        // SPL Token transfers
        if (parsed.type === 'transfer' || parsed.type === 'transferChecked') {
          return 'transfer';
        }

        // Native SOL transfers
        if (parsed.type === 'systemTransfer') {
          return 'transfer';
        }

        // Staking
        if (parsed.type === 'delegate' || parsed.type === 'stakeAuthorize') {
          return 'stake';
        }
      } else if ('programId' in ix) {
        const programId = ix.programId.toString();

        // Jupiter swap
        if (programId === 'JUP6LkbZbjS1jKKwapdHNy74zcZ3tLUZoi5QNyVTaV4') {
          return 'swap';
        }

        // NFT programs
        if (
          programId === 'metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s' || // Metaplex
          programId === 'CJsLwbP1iu5DuUikHEJnLfANgKy6stB2uFgvBBHoyxwz' // Candy Machine
        ) {
          return 'nft';
        }

        // DeFi protocols
        if (
          programId.includes('Kamino') ||
          programId.includes('MarginFi') ||
          programId.includes('Drift')
        ) {
          return 'defi';
        }
      }
    }

    return 'unknown';
  }

  /**
   * Extract transfer information
   */
  private extractTransferInfo(tx: ParsedTransactionWithMeta): {
    from: string;
    to: string;
    amount: number;
    token: string;
  } | null {
    const instructions = tx.transaction.message.instructions;

    for (const ix of instructions) {
      if ('parsed' in ix && ix.parsed.info) {
        const info = ix.parsed.info;

        // SPL Token transfer
        if (ix.parsed.type === 'transfer' || ix.parsed.type === 'transferChecked') {
          return {
            from: info.source || info.authority,
            to: info.destination,
            amount: Number(info.amount || info.tokenAmount?.uiAmount || 0),
            token: info.mint || 'unknown',
          };
        }

        // Native SOL transfer
        if (ix.parsed.type === 'systemTransfer') {
          return {
            from: info.source,
            to: info.destination,
            amount: info.lamports / 1e9,
            token: 'SOL',
          };
        }
      }
    }

    return null;
  }

  /**
   * Extract memo from transaction
   */
  private extractMemo(tx: ParsedTransactionWithMeta): string | undefined {
    const instructions = tx.transaction.message.instructions;

    for (const ix of instructions) {
      if ('parsed' in ix && ix.parsed.type === 'spl-memo') {
        return ix.parsed.info;
      }
    }

    return undefined;
  }

  /**
   * Apply filter to transaction
   */
  private matchesFilter(tx: TransactionSummary, filter?: TransactionFilter): boolean {
    if (!filter) {
      return true;
    }

    if (filter.type && tx.type !== filter.type) {
      return false;
    }

    if (filter.status && tx.status !== filter.status) {
      return false;
    }

    if (filter.startTime && tx.blockTime && tx.blockTime < filter.startTime) {
      return false;
    }

    if (filter.endTime && tx.blockTime && tx.blockTime > filter.endTime) {
      return false;
    }

    if (filter.minAmount && tx.amount && tx.amount < filter.minAmount) {
      return false;
    }

    if (filter.maxAmount && tx.amount && tx.amount > filter.maxAmount) {
      return false;
    }

    return true;
  }

  /**
   * Get transaction statistics
   */
  async getTransactionStats(
    address: PublicKey,
    timeRange?: { start: number; end: number }
  ): Promise<TransactionStats> {
    await this.rateLimiter.checkLimit('stats');

    try {
      // Get all transactions in time range
      const filter: TransactionFilter = {};
      if (timeRange) {
        filter.startTime = timeRange.start;
        filter.endTime = timeRange.end;
      }

      const transactions = await this.getTransactionHistory(address, {
        limit: 1000,
        filter,
      });

      // Calculate statistics
      const stats: TransactionStats = {
        totalTransactions: transactions.length,
        successfulTransactions: 0,
        failedTransactions: 0,
        totalFees: 0,
        totalVolume: 0,
        transactionsByType: {},
        averageTransactionFee: 0,
      };

      for (const tx of transactions) {
        if (tx.status === 'success') {
          stats.successfulTransactions++;
        } else {
          stats.failedTransactions++;
        }

        stats.totalFees += tx.fee;

        if (tx.amount) {
          stats.totalVolume += tx.amount;
        }

        stats.transactionsByType[tx.type] = (stats.transactionsByType[tx.type] || 0) + 1;
      }

      stats.averageTransactionFee =
        stats.totalTransactions > 0 ? stats.totalFees / stats.totalTransactions : 0;

      logger.info('Transaction statistics calculated', {
        address: address.toString(),
        stats,
      });

      return stats;
    } catch (error) {
      logger.error('Failed to get transaction stats', { error });
      throw error;
    }
  }

  /**
   * Export transaction history to CSV
   */
  async exportTransactionHistory(
    address: PublicKey,
    format: 'csv' | 'json' = 'csv'
  ): Promise<string> {
    await this.rateLimiter.checkLimit('export');

    try {
      const transactions = await this.getTransactionHistory(address, {
        limit: 10000,
      });

      if (format === 'json') {
        return JSON.stringify(transactions, null, 2);
      }

      // Convert to CSV
      const headers = [
        'Signature',
        'Date',
        'Type',
        'Status',
        'From',
        'To',
        'Amount',
        'Token',
        'Fee',
        'Memo',
      ];

      const rows = transactions.map((tx) => [
        tx.signature,
        tx.blockTime ? new Date(tx.blockTime * 1000).toISOString() : '',
        tx.type,
        tx.status,
        tx.from || '',
        tx.to || '',
        tx.amount?.toString() || '',
        tx.token || '',
        (tx.fee / 1e9).toString(),
        tx.memo || '',
      ]);

      const csv = [
        headers.join(','),
        ...rows.map((row) => row.map((cell) => `"${cell}"`).join(',')),
      ].join('\n');

      logger.info('Transaction history exported', {
        address: address.toString(),
        format,
        count: transactions.length,
      });

      return csv;
    } catch (error) {
      logger.error('Failed to export transaction history', { error });
      throw error;
    }
  }

  /**
   * Watch for new transactions
   */
  async watchTransactions(
    address: PublicKey,
    callback: (tx: TransactionSummary) => void
  ): Promise<() => void> {
    let isWatching = true;
    let lastSignature: string | undefined;

    const poll = async () => {
      if (!isWatching) {
        return;
      }

      try {
        const signatures = await this.connection.getSignaturesForAddress(address, {
          limit: 10,
          before: lastSignature,
        });

        if (signatures.length > 0) {
          lastSignature = signatures[0].signature;

          for (const sig of signatures.reverse()) {
            const tx = await this.getTransactionDetails(sig.signature);
            if (tx) {
              callback(tx);
            }
          }
        }
      } catch (error) {
        logger.error('Error watching transactions', { error });
      }

      if (isWatching) {
        setTimeout(poll, 5000); // Poll every 5 seconds
      }
    };

    // Start polling
    poll();

    // Return stop function
    return () => {
      isWatching = false;
    };
  }
}
