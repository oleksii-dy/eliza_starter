import { IAgentRuntime, Service, ServiceType, logger, UUID } from '@elizaos/core';
import {
  IUniversalWalletService,
  UniversalPortfolio,
  UniversalTokenBalance,
  UniversalTransferParams,
  SwapParams,
  BridgeParams,
  UniversalTransactionParams,
  UniversalTransactionResult,
  SimulationResult,
  GasEstimate,
  ChainInfo,
  WalletCapability,
  PaymentRequestParams,
  UniversalPaymentRequest,
  PaymentResult,
  PaymentVerification,
  WalletCreationParams,
  WalletImportParams,
  WalletInstance,
  WalletFilter,
  SessionParams,
  SessionKey,
} from '@elizaos/core';
import { RealCrossMintService } from './RealCrossMintService';
import {
  CrossMintError,
} from '../types/crossmint';

/**
 * CrossMint Universal Wallet Service
 * Implements the IUniversalWalletService interface for CrossMint enterprise blockchain platform
 */
export class CrossMintUniversalWalletService extends Service implements IUniversalWalletService {
  static override readonly serviceType = ServiceType.WALLET;
  static serviceName = 'crossmint-universal-wallet';

  readonly chainSupport = ['ethereum', 'polygon', 'arbitrum', 'optimism', 'base', 'bsc', 'solana'];
  readonly capabilities: WalletCapability[] = [
    WalletCapability.TRANSFER,
    WalletCapability.NFT,
    WalletCapability.X402_PAYMENTS,
    WalletCapability.MPC_WALLET,
    WalletCapability.MULTISIG,
    WalletCapability.SESSION_KEYS,
  ];

  public readonly capabilityDescription =
    'CrossMint enterprise blockchain platform with MPC wallets, X.402 payments, NFT infrastructure, and cross-chain support';

  private crossMintService!: RealCrossMintService;

  constructor(runtime?: IAgentRuntime) {
    super(runtime);
    if (runtime) {
      const crossMintService = runtime.getService<RealCrossMintService>('real-crossmint');
      if (!crossMintService) {
        throw new Error('Real CrossMint service not available. Ensure CrossMint plugin is loaded.');
      }
      this.crossMintService = crossMintService;
    }
  }

  // Portfolio management
  async getPortfolio(_owner?: string): Promise<UniversalPortfolio> {
    try {
      // Get all CrossMint wallets for the user
      const wallets = await this.crossMintService.listWallets();
      const assets: UniversalTokenBalance[] = [];
      const totalValueUsd = 0;

      for (const wallet of wallets) {
        // CrossMint doesn't provide a direct balance API endpoint
        // Create placeholder balance entries for each wallet
        const chain = this.getChainFromWalletType(wallet.type);
        const nativeSymbol = this.getNativeSymbol(chain);

        // Note: CrossMint balance information would need to be retrieved via blockchain RPC
        // For now, we provide wallet structure without balance data
        const tokenBalance: UniversalTokenBalance = {
          address: 'native',
          symbol: nativeSymbol,
          name: this.getNativeName(chain),
          decimals: chain === 'solana' ? 9 : 18,
          balance: '0', // Would need blockchain RPC integration for real balances
          balanceFormatted: '0.000000',
          valueUsd: 0, // Would need price feed integration
          priceUsd: undefined,
          chain,
          isNative: true,
        };
        assets.push(tokenBalance);
      }

      return {
        totalValueUsd,
        chains: this.chainSupport,
        assets,
        breakdown: {
          tokens: totalValueUsd,
          defi: 0,
          nfts: 0, // NFT valuation would require additional API calls
          staked: 0,
        },
      };
    } catch (error) {
      logger.error('Error getting CrossMint portfolio:', error);
      throw error;
    }
  }

  async getBalances(_owner?: string): Promise<UniversalTokenBalance[]> {
    const portfolio = await this.getPortfolio(_owner);
    return portfolio.assets;
  }

  // Transaction operations
  async transfer(params: UniversalTransferParams): Promise<UniversalTransactionResult> {
    try {
      // Find or create wallet for the chain
      const wallets = await this.crossMintService.listWallets();
      const wallet = wallets.find((w) => this.getChainFromWalletType(w.type) === params.chain);

      if (!wallet) {
        throw new CrossMintError(`No wallet found for chain: ${params.chain}`);
      }

      const transferParams = {
        walletId: wallet.address,
        to: params.to,
        amount: params.amount,
        currency: params.tokenAddress || this.getNativeSymbol(params.chain || 'ethereum'),
      };

      const transaction = await this.crossMintService.createTransfer(transferParams);

      return {
        hash: transaction.hash || transaction.id,
        status: this.mapTransactionStatus(transaction.status),
        chain: transaction.chain,
        gasUsed: transaction.gas,
        gasPrice: transaction.gasPrice,
        confirmations: transaction.status === 'success' ? 1 : 0,
        timestamp: new Date(transaction.createdAt).getTime(),
      };
    } catch (error) {
      logger.error('Error executing CrossMint transfer:', error);
      return {
        hash: '',
        status: 'failed',
        chain: params.chain || 'ethereum',
        error: error instanceof Error ? error.message : 'Transfer failed',
      };
    }
  }

  async sendTransaction(params: UniversalTransactionParams): Promise<UniversalTransactionResult> {
    // CrossMint doesn't support raw transaction sending, so we'll treat this as a transfer
    if (params.to && params.value) {
      return await this.transfer({
        to: params.to,
        amount: params.value,
        chain: params.chain,
      });
    }

    throw new CrossMintError(
      'Raw transaction sending not supported by CrossMint. Use transfer() for token transfers.'
    );
  }

  async swap(_params: SwapParams): Promise<UniversalTransactionResult> {
    throw new CrossMintError('Swap operations not yet implemented for CrossMint');
  }

  async bridge(_params: BridgeParams): Promise<UniversalTransactionResult> {
    throw new CrossMintError('Bridge operations not yet implemented for CrossMint');
  }

  // Transaction utilities
  async simulateTransaction(params: UniversalTransactionParams): Promise<SimulationResult> {
    // CrossMint doesn't provide simulation APIs, but we can do basic validation
    const chain = params.chain || 'ethereum';
    const isChainSupported = this.isChainSupported(chain);

    if (!isChainSupported) {
      return {
        success: false,
        gasUsed: '0',
        gasPrice: '0',
        changes: [],
        warnings: [`Unsupported chain: ${chain}`],
        error: `Chain ${chain} is not supported by CrossMint`,
      };
    }

    // Basic parameter validation
    if (!params.to) {
      return {
        success: false,
        gasUsed: '0',
        gasPrice: '0',
        changes: [],
        warnings: [],
        error: 'Missing recipient address',
      };
    }

    // Estimate gas based on transaction type and chain
    const estimatedGas = this.estimateGasForChain(chain, params);

    return {
      success: true,
      gasUsed: estimatedGas.toString(),
      gasPrice: '0', // CrossMint abstracts away gas pricing
      changes: [],
      warnings: ['Simulation is estimated - CrossMint handles gas internally'],
    };
  }

  async estimateGas(params: UniversalTransactionParams): Promise<GasEstimate> {
    const chain = params.chain || 'ethereum';
    const estimatedGas = this.estimateGasForChain(chain, params);

    return {
      gasLimit: estimatedGas.toString(),
      gasPrice: '0', // CrossMint abstracts gas pricing
      estimatedCost: '0', // CrossMint covers gas costs
      estimatedCostUsd: 0,
      estimatedTime: this.getEstimatedConfirmationTime(chain),
    };
  }

  private estimateGasForChain(chain: string, params: UniversalTransactionParams): number {
    // Provide realistic gas estimates based on chain and transaction type
    switch (chain) {
      case 'ethereum':
        return params.data ? 100000 : 21000; // Contract call vs simple transfer
      case 'polygon':
      case 'arbitrum':
      case 'optimism':
      case 'base':
        return params.data ? 80000 : 21000;
      case 'bsc':
        return params.data ? 60000 : 21000;
      case 'solana':
        return 5000; // Solana uses different gas model
      default:
        return 21000;
    }
  }

  private getEstimatedConfirmationTime(chain: string): number {
    // Estimated confirmation times in seconds
    switch (chain) {
      case 'ethereum':
        return 60; // ~1 minute
      case 'polygon':
        return 10;
      case 'arbitrum':
      case 'optimism':
        return 5;
      case 'base':
        return 5;
      case 'bsc':
        return 10;
      case 'solana':
        return 2;
      default:
        return 30;
    }
  }

  async getTransaction(hash: string, _chain?: string): Promise<UniversalTransactionResult> {
    try {
      const transaction = await this.crossMintService.getTransaction(hash);

      return {
        hash: transaction.hash || transaction.id,
        status: this.mapTransactionStatus(transaction.status),
        chain: transaction.chain,
        gasUsed: transaction.gas,
        gasPrice: transaction.gasPrice,
        confirmations: transaction.status === 'success' ? 1 : 0,
        timestamp: new Date(transaction.createdAt).getTime(),
      };
    } catch (error) {
      logger.error('Error getting CrossMint transaction:', error);
      throw error;
    }
  }

  // Multi-chain support
  async getSupportedChains(): Promise<ChainInfo[]> {
    return this.chainSupport.map((chainId) => ({
      id: chainId,
      name: this.getChainName(chainId),
      nativeToken: {
        symbol: this.getNativeSymbol(chainId),
        name: this.getNativeName(chainId),
        decimals: chainId === 'solana' ? 9 : 18,
      },
      rpcUrls: this.getRpcUrls(chainId),
      blockExplorerUrls: this.getBlockExplorerUrls(chainId),
      isTestnet: false, // CrossMint manages testnet vs mainnet via environment
      bridgeSupport: this.getBridgeSupport(chainId),
    }));
  }

  private getRpcUrls(chainId: string): string[] {
    // CrossMint handles RPC internally, but provide public endpoints for reference
    switch (chainId) {
      case 'ethereum':
        return ['https://eth.public-rpc.com'];
      case 'polygon':
        return ['https://polygon-rpc.com'];
      case 'arbitrum':
        return ['https://arb1.arbitrum.io/rpc'];
      case 'optimism':
        return ['https://mainnet.optimism.io'];
      case 'base':
        return ['https://mainnet.base.org'];
      case 'bsc':
        return ['https://bsc-dataseed1.binance.org'];
      case 'solana':
        return ['https://api.mainnet-beta.solana.com'];
      default:
        return [];
    }
  }

  private getBlockExplorerUrls(chainId: string): string[] {
    switch (chainId) {
      case 'ethereum':
        return ['https://etherscan.io'];
      case 'polygon':
        return ['https://polygonscan.com'];
      case 'arbitrum':
        return ['https://arbiscan.io'];
      case 'optimism':
        return ['https://optimistic.etherscan.io'];
      case 'base':
        return ['https://basescan.org'];
      case 'bsc':
        return ['https://bscscan.com'];
      case 'solana':
        return ['https://explorer.solana.com'];
      default:
        return [];
    }
  }

  private getBridgeSupport(chainId: string): string[] {
    // CrossMint supports cross-chain operations for these chains
    const allChains = this.chainSupport;
    return allChains.filter((chain) => chain !== chainId);
  }

  async switchChain(chainId: string): Promise<void> {
    if (!this.isChainSupported(chainId)) {
      throw new CrossMintError(`Unsupported chain: ${chainId}`);
    }
    // CrossMint handles chain switching internally
  }

  isChainSupported(chainId: string): boolean {
    return this.chainSupport.includes(chainId);
  }

  // Payment protocol support (X.402)
  async createPaymentRequest(_params: PaymentRequestParams): Promise<UniversalPaymentRequest> {
    // Payment requests are not supported by the basic CrossMint service
    // This would need to be implemented via X402Service or another payment provider
    throw new Error(
      'Payment requests not supported by CrossMint service. Use HybridCrossMintUniversalWalletService for X402 payment protocol support.'
    );
  }

  async processPayment(_request: UniversalPaymentRequest): Promise<PaymentResult> {
    // Payment processing is not supported by the basic CrossMint service
    throw new Error(
      'Payment processing not supported by CrossMint service. Use HybridCrossMintUniversalWalletService for X402 payment protocol support.'
    );
  }

  async verifyPayment(_paymentId: string): Promise<PaymentVerification> {
    // Payment verification is not supported by the basic CrossMint service
    throw new Error(
      'Payment verification not supported by CrossMint service. Use HybridCrossMintUniversalWalletService for X402 payment protocol support.'
    );
  }

  // Wallet management
  async createWallet(params: WalletCreationParams): Promise<WalletInstance> {
    try {
      const crossMintWallet = await this.crossMintService.createWallet({
        type: params.type === 'mpc' ? 'evm-mpc-wallet' : 'evm-smart-wallet',
        linkedUser: params.metadata?.userId || 'default-user',
      });

      return {
        id: `wallet-${crossMintWallet.address}` as UUID,
        address: crossMintWallet.address,
        type: crossMintWallet.type.includes('mpc') ? 'mpc' : 'smart',
        name: params.name,
        chain: this.getChainFromWalletType(crossMintWallet.type),
        metadata: { linkedUser: crossMintWallet.linkedUser },
        isActive: true,
        createdAt: new Date(crossMintWallet.createdAt).getTime(),
      };
    } catch (error) {
      logger.error('Error creating CrossMint wallet:', error);
      throw error;
    }
  }

  async importWallet(_params: WalletImportParams): Promise<WalletInstance> {
    throw new CrossMintError(
      'Wallet import not supported by CrossMint (MPC wallets are generated, not imported)'
    );
  }

  async getWallets(filter?: WalletFilter): Promise<WalletInstance[]> {
    try {
      const wallets = await this.crossMintService.listWallets();

      return wallets
        .filter((wallet) => {
          const walletChain = this.getChainFromWalletType(wallet.type);
          if (filter?.chain && walletChain !== filter.chain) {return false;}
          if (filter?.isActive !== undefined && filter.isActive !== true) {return false;}
          if (filter?.type && this.mapWalletType(wallet.type) !== filter.type) {return false;}
          return true;
        })
        .map((wallet) => ({
          id: `wallet-${wallet.address}` as UUID,
          address: wallet.address,
          type: this.mapWalletType(wallet.type),
          chain: this.getChainFromWalletType(wallet.type),
          metadata: { linkedUser: wallet.linkedUser },
          isActive: true,
          createdAt: new Date(wallet.createdAt).getTime(),
        }));
    } catch (error) {
      logger.error('Error getting CrossMint wallets:', error);
      throw error;
    }
  }

  async deleteWallet(_walletId: UUID): Promise<boolean> {
    throw new CrossMintError('Wallet deletion not supported by CrossMint (security policy)');
  }

  // Session management (not implemented for CrossMint)
  async createSession(_params: SessionParams): Promise<SessionKey> {
    throw new CrossMintError('Session management not implemented for CrossMint');
  }

  async validateSession(_sessionId: string, _operation: string): Promise<boolean> {
    return false;
  }

  async revokeSession(_sessionId: string): Promise<void> {
    throw new CrossMintError('Session management not implemented for CrossMint');
  }

  async listSessions(_walletId?: string): Promise<SessionKey[]> {
    return [];
  }

  // Helper methods
  private mapTransactionStatus(status: string): 'pending' | 'confirmed' | 'failed' {
    switch (status) {
      case 'success':
        return 'confirmed';
      case 'failed':
        return 'failed';
      default:
        return 'pending';
    }
  }

  private mapWalletType(type: string): WalletInstance['type'] {
    if (type.includes('mpc')) {
      return 'mpc';
    } else if (type.includes('smart')) {
      return 'smart';
    } else if (type.includes('custodial')) {
      return 'smart';
    } else {
      return 'eoa';
    }
  }

  private mapPaymentStatus(status: string): 'pending' | 'paid' | 'expired' | 'cancelled' {
    switch (status) {
      case 'completed':
        return 'paid';
      case 'expired':
        return 'expired';
      case 'failed':
        return 'cancelled';
      default:
        return 'pending';
    }
  }

  private getNativeSymbol(chain: string): string {
    switch (chain) {
      case 'ethereum':
        return 'ETH';
      case 'polygon':
        return 'MATIC';
      case 'arbitrum':
      case 'optimism':
        return 'ETH';
      case 'base':
        return 'ETH';
      case 'bsc':
        return 'BNB';
      case 'solana':
        return 'SOL';
      default:
        return 'ETH';
    }
  }

  private getNativeName(chain: string): string {
    switch (chain) {
      case 'ethereum':
        return 'Ethereum';
      case 'polygon':
        return 'Polygon';
      case 'arbitrum':
        return 'Arbitrum';
      case 'optimism':
        return 'Optimism';
      case 'base':
        return 'Base';
      case 'bsc':
        return 'BNB Smart Chain';
      case 'solana':
        return 'Solana';
      default:
        return 'Ethereum';
    }
  }

  private getChainName(chainId: string): string {
    return this.getNativeName(chainId);
  }

  // Helper to derive chain from wallet type
  private getChainFromWalletType(walletType: string): string {
    if (walletType.includes('solana')) {
      return 'solana';
    } else if (walletType.includes('evm')) {
      return 'ethereum';
    } else if (walletType.includes('aptos')) {
      return 'aptos';
    } else if (walletType.includes('sui')) {
      return 'sui';
    } else {
      return 'ethereum'; // Default to ethereum
    }
  }

  // Service lifecycle
  static async start(runtime: IAgentRuntime): Promise<CrossMintUniversalWalletService> {
    logger.info('Starting CrossMint Universal Wallet Service...');

    const service = new CrossMintUniversalWalletService(runtime);

    logger.info('CrossMint Universal Wallet Service started successfully');
    return service;
  }

  async stop(): Promise<void> {
    logger.info('Stopping CrossMint Universal Wallet Service...');
    // Cleanup any resources if needed
  }
}
