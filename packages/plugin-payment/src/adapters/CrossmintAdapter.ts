import { type IAgentRuntime, elizaLogger as logger } from '@elizaos/core';
import { IWalletAdapter, PaymentMethod, PaymentStatus, TransactionResult } from '../types';

// Define proper types for Crossmint services
interface CrossmintWallet {
  address: string;
  type: string;
  linkedUser?: string;
  createdAt: string;
}

interface CrossmintTransaction {
  id: string;
  hash?: string;
  status: string;
  chain: string;
  gas?: string;
  gasPrice?: string;
  createdAt: string;
}

interface CrossmintTransferParams {
  walletId: string;
  to: string;
  amount: string;
  currency: string;
}

interface RealCrossMintService {
  listWallets(): Promise<CrossmintWallet[]>;
  createWallet(params: { type: string; linkedUser: string }): Promise<CrossmintWallet>;
  createTransfer(params: CrossmintTransferParams): Promise<CrossmintTransaction>;
  getTransaction(hash: string): Promise<CrossmintTransaction>;
}

interface UniversalTokenBalance {
  address: string;
  symbol: string;
  name: string;
  decimals: number;
  balance: string;
  balanceFormatted: string;
  valueUsd: number;
  priceUsd?: number;
  chain: string;
  isNative: boolean;
}

interface UniversalTransferParams {
  from?: string;
  to: string;
  amount: string;
  chain?: string;
  tokenAddress?: string;
}

interface UniversalTransactionResult {
  hash: string;
  status: string;
  chain?: string;
  gasUsed?: string;
  gasPrice?: string;
  confirmations?: number;
  timestamp?: number;
  blockNumber?: number;
  error?: string;
}

interface WalletCreationParams {
  type?: string;
  name?: string;
  metadata?: Record<string, any>;
}

interface WalletInstance {
  id: string;
  address: string;
  type: string;
  name?: string;
  chain?: string;
  metadata?: Record<string, any>;
  isActive: boolean;
  createdAt: number;
}

interface CrossMintUniversalWalletService {
  getBalances(owner?: string): Promise<UniversalTokenBalance[]>;
  transfer(params: UniversalTransferParams): Promise<UniversalTransactionResult>;
  getTransaction(hash: string, chain?: string): Promise<UniversalTransactionResult>;
  createWallet(params: WalletCreationParams): Promise<WalletInstance>;
}

// Custom error class for Crossmint-specific errors
export class CrossmintAdapterError extends Error {
  constructor(
    message: string,
    public code: string = 'CROSSMINT_ERROR',
    public details?: any
  ) {
    super(message);
    this.name = 'CrossmintAdapterError';
  }
}

/**
 * Wallet adapter for Crossmint integration
 * Supports MPC wallets and cross-chain operations
 */
export class CrossmintAdapter implements IWalletAdapter {
  public readonly name = 'crossmint';
  public readonly supportedMethods: PaymentMethod[] = [
    PaymentMethod.USDC_ETH,
    PaymentMethod.ETH,
    PaymentMethod.MATIC,
    PaymentMethod.ARB,
    PaymentMethod.OP,
    PaymentMethod.BASE,
    PaymentMethod.USDC_SOL,
    PaymentMethod.SOL,
  ];

  private runtime: IAgentRuntime;
  private crossmintService: RealCrossMintService | null = null;
  private walletService: CrossMintUniversalWalletService | null = null;
  private initialized = false;

  constructor(runtime: IAgentRuntime) {
    this.runtime = runtime;
  }

  async initialize(): Promise<void> {
    try {
      // Validate required configuration
      this.validateConfiguration();

      // Get Crossmint services with proper type checking
      const crossmintService = this.runtime.getService('real-crossmint');
      const walletService = this.runtime.getService('crossmint-universal-wallet');

      if (crossmintService && this.isRealCrossMintService(crossmintService)) {
        this.crossmintService = crossmintService;
      }

      if (walletService && this.isCrossMintUniversalWalletService(walletService)) {
        this.walletService = walletService;
      }

      if (!this.crossmintService && !this.walletService) {
        throw new CrossmintAdapterError(
          'No Crossmint services found. Ensure @elizaos/plugin-crossmint is loaded.',
          'SERVICE_NOT_FOUND'
        );
      }

      this.initialized = true;
      logger.info('[CrossmintAdapter] Initialized successfully', {
        hasCrossmintService: !!this.crossmintService,
        hasWalletService: !!this.walletService,
      });
    } catch (error) {
      logger.error('[CrossmintAdapter] Failed to initialize', error);
      throw error;
    }
  }

  private validateConfiguration(): void {
    const requiredSettings = ['CROSSMINT_API_KEY', 'CROSSMINT_PROJECT_ID'];
    const missingSettings = requiredSettings.filter((setting) => !this.runtime.getSetting(setting));

    if (missingSettings.length > 0) {
      throw new CrossmintAdapterError(
        `Missing required settings: ${missingSettings.join(', ')}`,
        'MISSING_CONFIGURATION'
      );
    }
  }

  private isRealCrossMintService(service: any): service is RealCrossMintService {
    return (
      typeof service.listWallets === 'function' &&
      typeof service.createWallet === 'function' &&
      typeof service.createTransfer === 'function' &&
      typeof service.getTransaction === 'function'
    );
  }

  private isCrossMintUniversalWalletService(
    service: any
  ): service is CrossMintUniversalWalletService {
    return (
      typeof service.getBalances === 'function' &&
      typeof service.transfer === 'function' &&
      typeof service.getTransaction === 'function' &&
      typeof service.createWallet === 'function'
    );
  }

  private ensureInitialized(): void {
    if (!this.initialized) {
      throw new CrossmintAdapterError('Adapter not initialized', 'NOT_INITIALIZED');
    }
  }

  async getBalance(address: string, method: PaymentMethod): Promise<bigint> {
    this.ensureInitialized();

    try {
      if (!this.walletService) {
        throw new CrossmintAdapterError('Wallet service not available', 'SERVICE_UNAVAILABLE');
      }

      // Validate address format
      if (!this.validateAddress(address, method)) {
        throw new CrossmintAdapterError('Invalid address format', 'INVALID_ADDRESS');
      }

      // Get the chain for this payment method
      const chain = this.getChainForMethod(method);

      // Get portfolio/balances through the universal wallet service
      const balances = await this.walletService.getBalances(address);

      // Find the balance for the requested token
      const tokenSymbol = this.getTokenSymbol(method);
      const balance = balances.find(
        (b: UniversalTokenBalance) => b.symbol === tokenSymbol && b.chain === chain
      );

      if (balance) {
        // Parse balance string to BigInt
        try {
          // Handle decimal values by removing the decimal point
          const [whole, fraction = ''] = balance.balance.split('.');
          const decimals = balance.decimals || 18;
          const paddedFraction = fraction.padEnd(decimals, '0').slice(0, decimals);
          const balanceStr = whole + paddedFraction;
          return BigInt(balanceStr);
        } catch (parseError) {
          logger.error('[CrossmintAdapter] Error parsing balance', {
            balance: balance.balance,
            error: parseError,
          });
          return BigInt(0);
        }
      }

      logger.warn('[CrossmintAdapter] Balance not found', {
        address,
        method,
        chain,
        tokenSymbol,
      });
      return BigInt(0);
    } catch (error) {
      logger.error('[CrossmintAdapter] Error getting balance', { error, address, method });

      if (error instanceof CrossmintAdapterError) {
        throw error;
      }

      throw new CrossmintAdapterError('Failed to get balance', 'BALANCE_ERROR', error);
    }
  }

  async sendTransaction(
    fromAddress: string,
    toAddress: string,
    amount: bigint,
    method: PaymentMethod,
    _privateKey?: string
  ): Promise<TransactionResult> {
    this.ensureInitialized();

    try {
      if (!this.walletService) {
        throw new CrossmintAdapterError('Wallet service not available', 'SERVICE_UNAVAILABLE');
      }

      // Validate addresses
      if (!this.validateAddress(fromAddress, method) || !this.validateAddress(toAddress, method)) {
        throw new CrossmintAdapterError('Invalid address format', 'INVALID_ADDRESS');
      }

      // Validate amount
      if (amount <= BigInt(0)) {
        throw new CrossmintAdapterError('Invalid amount', 'INVALID_AMOUNT');
      }

      const chain = this.getChainForMethod(method);
      const tokenAddress = this.isNativeToken(method) ? undefined : this.getTokenAddress(method);

      // Execute transfer through the universal wallet service
      const result = await this.walletService.transfer({
        from: fromAddress,
        to: toAddress,
        amount: amount.toString(),
        chain,
        tokenAddress,
      });

      // Validate result
      if (!result.hash) {
        throw new CrossmintAdapterError('Transaction hash not returned', 'MISSING_HASH');
      }

      return {
        hash: result.hash,
        status: this.mapStatus(result.status),
        confirmations: result.confirmations || 0,
        blockNumber: result.blockNumber,
      };
    } catch (error) {
      logger.error('[CrossmintAdapter] Error sending transaction', {
        error,
        method,
        fromAddress,
        toAddress,
        amount: amount.toString(),
      });

      if (error instanceof CrossmintAdapterError) {
        throw error;
      }

      throw new CrossmintAdapterError('Failed to send transaction', 'TRANSACTION_ERROR', error);
    }
  }

  async getTransaction(hash: string): Promise<TransactionResult> {
    this.ensureInitialized();

    try {
      if (!this.walletService) {
        logger.warn('[CrossmintAdapter] Wallet service not available for transaction lookup');
        return {
          hash,
          status: PaymentStatus.PROCESSING,
          confirmations: 0,
        };
      }

      // Validate hash format
      if (!hash || (hash.startsWith('0x') && !/^0x[a-fA-F0-9]{64}$/.test(hash))) {
        throw new CrossmintAdapterError('Invalid transaction hash', 'INVALID_HASH');
      }

      // Get transaction through the universal wallet service
      const tx = await this.walletService.getTransaction(hash);

      return {
        hash: tx.hash,
        status: this.mapStatus(tx.status),
        confirmations: tx.confirmations || 0,
        blockNumber: tx.blockNumber,
      };
    } catch (error) {
      logger.error('[CrossmintAdapter] Error getting transaction', { error, hash });

      // Don't throw for transaction lookups - return processing status
      return {
        hash,
        status: PaymentStatus.PROCESSING,
        confirmations: 0,
      };
    }
  }

  async createWallet(): Promise<{ address: string; privateKey: string }> {
    this.ensureInitialized();

    try {
      if (!this.walletService) {
        throw new CrossmintAdapterError('Wallet service not available', 'SERVICE_UNAVAILABLE');
      }

      // Create MPC wallet through Crossmint
      const wallet = await this.walletService.createWallet({
        type: 'mpc', // Use MPC wallets for security
        name: `Payment Wallet ${Date.now()}`,
        metadata: {
          purpose: 'payments',
          createdBy: 'payment-service',
          createdAt: new Date().toISOString(),
        },
      });

      // Validate wallet creation
      if (!wallet.address) {
        throw new CrossmintAdapterError('Wallet address not returned', 'WALLET_CREATION_FAILED');
      }

      logger.info('[CrossmintAdapter] Created MPC wallet', {
        address: wallet.address,
        type: wallet.type,
      });

      return {
        address: wallet.address,
        privateKey: '', // MPC wallets don't expose private keys
      };
    } catch (error) {
      logger.error('[CrossmintAdapter] Error creating wallet', { error });

      if (error instanceof CrossmintAdapterError) {
        throw error;
      }

      throw new CrossmintAdapterError('Failed to create wallet', 'WALLET_CREATION_ERROR', error);
    }
  }

  validateAddress(address: string, method: PaymentMethod): boolean {
    if (!address || !this.supportedMethods.includes(method)) {
      return false;
    }

    const chain = this.getChainForMethod(method);

    // Solana address validation
    if (chain === 'solana') {
      // Reject if it looks like an EVM address
      if (address.startsWith('0x')) {
        return false;
      }

      // Solana addresses should be 44 characters (32 bytes base58 encoded)
      // Some addresses might be 43 characters due to leading zero compression
      if (address.length !== 43 && address.length !== 44) {
        return false;
      }

      try {
        // Basic Solana address validation (32 bytes base58)
        const decoded = this.base58Decode(address);
        return decoded.length === 32;
      } catch {
        return false;
      }
    }

    // EVM address validation
    try {
      // Check if it's a valid hex address
      if (!/^0x[a-fA-F0-9]{40}$/.test(address)) {
        return false;
      }

      // TODO: Add checksum validation for EVM addresses
      return true;
    } catch {
      return false;
    }
  }

  // Helper methods
  private getChainForMethod(method: PaymentMethod): string {
    const chainMap: Record<PaymentMethod, string> = {
      [PaymentMethod.USDC_ETH]: 'ethereum',
      [PaymentMethod.ETH]: 'ethereum',
      [PaymentMethod.MATIC]: 'polygon',
      [PaymentMethod.ARB]: 'arbitrum',
      [PaymentMethod.OP]: 'optimism',
      [PaymentMethod.BASE]: 'base',
      [PaymentMethod.USDC_SOL]: 'solana',
      [PaymentMethod.SOL]: 'solana',
      [PaymentMethod.BTC]: 'bitcoin', // Not supported by Crossmint
      [PaymentMethod.OTHER]: 'ethereum',
    };

    return chainMap[method] || 'ethereum';
  }

  private getTokenSymbol(method: PaymentMethod): string {
    const symbolMap: Record<PaymentMethod, string> = {
      [PaymentMethod.USDC_ETH]: 'USDC',
      [PaymentMethod.ETH]: 'ETH',
      [PaymentMethod.MATIC]: 'MATIC',
      [PaymentMethod.ARB]: 'ETH', // Arbitrum uses ETH
      [PaymentMethod.OP]: 'ETH', // Optimism uses ETH
      [PaymentMethod.BASE]: 'ETH', // Base uses ETH
      [PaymentMethod.USDC_SOL]: 'USDC',
      [PaymentMethod.SOL]: 'SOL',
      [PaymentMethod.BTC]: 'BTC',
      [PaymentMethod.OTHER]: 'UNKNOWN',
    };

    return symbolMap[method] || 'UNKNOWN';
  }

  private isNativeToken(method: PaymentMethod): boolean {
    return [
      PaymentMethod.ETH,
      PaymentMethod.MATIC,
      PaymentMethod.ARB,
      PaymentMethod.OP,
      PaymentMethod.BASE,
      PaymentMethod.SOL,
    ].includes(method);
  }

  private getTokenAddress(method: PaymentMethod): string | undefined {
    // Get network-specific token addresses
    const network = this.runtime.getSetting('CROSSMINT_ENVIRONMENT') || 'production';

    if (network === 'production') {
      // Mainnet USDC addresses
      const tokenMap: Record<PaymentMethod, string | undefined> = {
        [PaymentMethod.USDC_ETH]: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48', // USDC on Ethereum
        [PaymentMethod.USDC_SOL]: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v', // USDC on Solana
        [PaymentMethod.ETH]: undefined, // Native
        [PaymentMethod.SOL]: undefined, // Native
        [PaymentMethod.BTC]: undefined, // Not supported
        [PaymentMethod.MATIC]: undefined, // Native
        [PaymentMethod.ARB]: undefined, // Native
        [PaymentMethod.OP]: undefined, // Native
        [PaymentMethod.BASE]: undefined, // Native
        [PaymentMethod.OTHER]: undefined,
      };
      return tokenMap[method];
    } else {
      // Testnet USDC addresses
      const tokenMap: Record<PaymentMethod, string | undefined> = {
        [PaymentMethod.USDC_ETH]: '0x07865c6E87B9F70255377e024ace6630C1Eaa37F', // USDC on Goerli
        [PaymentMethod.USDC_SOL]: '4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU', // USDC on Solana Devnet
        [PaymentMethod.ETH]: undefined, // Native
        [PaymentMethod.SOL]: undefined, // Native
        [PaymentMethod.BTC]: undefined, // Not supported
        [PaymentMethod.MATIC]: undefined, // Native
        [PaymentMethod.ARB]: undefined, // Native
        [PaymentMethod.OP]: undefined, // Native
        [PaymentMethod.BASE]: undefined, // Native
        [PaymentMethod.OTHER]: undefined,
      };
      return tokenMap[method];
    }
  }

  private mapStatus(status: string): PaymentStatus {
    const statusMap: Record<string, PaymentStatus> = {
      confirmed: PaymentStatus.COMPLETED,
      completed: PaymentStatus.COMPLETED,
      success: PaymentStatus.COMPLETED,
      failed: PaymentStatus.FAILED,
      error: PaymentStatus.FAILED,
      cancelled: PaymentStatus.FAILED,
      rejected: PaymentStatus.FAILED,
      pending: PaymentStatus.PROCESSING,
      processing: PaymentStatus.PROCESSING,
      submitted: PaymentStatus.PROCESSING,
    };

    return statusMap[status.toLowerCase()] || PaymentStatus.PROCESSING;
  }

  private base58Decode(str: string): Uint8Array {
    const ALPHABET = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';
    const ALPHABET_MAP: { [key: string]: number } = {};
    for (let i = 0; i < ALPHABET.length; i++) {
      ALPHABET_MAP[ALPHABET[i]] = i;
    }

    // Convert base58 string to a large integer
    let num = BigInt(0);
    const base = BigInt(58);

    for (let i = 0; i < str.length; i++) {
      const char = str[i];
      if (!(char in ALPHABET_MAP)) {
        throw new Error('Invalid base58 character');
      }
      num = num * base + BigInt(ALPHABET_MAP[char]);
    }

    // Convert the integer to bytes
    const bytes: number[] = [];
    while (num > 0) {
      bytes.unshift(Number(num % BigInt(256)));
      num = num / BigInt(256);
    }

    // Handle leading zeros (1s in base58)
    for (let i = 0; i < str.length && str[i] === '1'; i++) {
      bytes.unshift(0);
    }

    return new Uint8Array(bytes);
  }
}
