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
import { RealCrossMintService, RealCrossMintError } from './RealCrossMintService';
import { RealX402Service, X402Error } from './RealX402Service';

/**
 * Hybrid CrossMint + X.402 Universal Wallet Service
 * Combines real CrossMint API for wallet operations with real X.402 protocol for payments
 */
export class HybridCrossMintUniversalWalletService
  extends Service
  implements IUniversalWalletService
{
  static override readonly serviceType = ServiceType.WALLET;
  static serviceName = 'hybrid-crossmint-universal-wallet';

  readonly chainSupport = ['ethereum', 'polygon', 'arbitrum', 'optimism', 'base', 'bsc', 'solana'];
  readonly capabilities: WalletCapability[] = [
    WalletCapability.TRANSFER,
    WalletCapability.NFT,
    WalletCapability.X402_PAYMENTS,
    WalletCapability.MPC_WALLET,
    WalletCapability.MULTISIG,
  ];

  public readonly capabilityDescription =
    'Hybrid CrossMint + X.402 service with real API integrations';

  private crossMintService!: RealCrossMintService;
  private x402Service!: RealX402Service;

  constructor(runtime?: IAgentRuntime) {
    super(runtime);
    if (runtime) {
      const crossMintService = runtime.getService<RealCrossMintService>('real-crossmint');
      const x402Service = runtime.getService<RealX402Service>('real-x402');

      if (!crossMintService) {
        throw new RealCrossMintError('Real CrossMint service not available. Ensure it is loaded.');
      }

      if (!x402Service) {
        throw new X402Error('Real X.402 service not available. Ensure it is loaded.');
      }

      this.crossMintService = crossMintService;
      this.x402Service = x402Service;
    }
  }

  // Portfolio management (Real CrossMint API)
  async getPortfolio(_owner?: string): Promise<UniversalPortfolio> {
    try {
      const wallets = await this.crossMintService.listWallets();
      const assets: UniversalTokenBalance[] = [];
      const totalValueUsd = 0;

      // For each wallet, we would need to call real balance APIs
      // Note: This is a limitation - CrossMint may not have direct balance APIs
      for (const wallet of wallets) {
        const balance: UniversalTokenBalance = {
          address: 'native',
          symbol: this.getNativeSymbol(this.getChainFromWalletType(wallet.type)),
          name: this.getNativeName(this.getChainFromWalletType(wallet.type)),
          decimals: this.getChainFromWalletType(wallet.type) === 'solana' ? 9 : 18,
          balance: '0', // Real balance would require additional API calls
          balanceFormatted: '0.0',
          valueUsd: 0,
          priceUsd: undefined,
          chain: this.getChainFromWalletType(wallet.type),
          isNative: true,
        };
        assets.push(balance);
      }

      return {
        totalValueUsd,
        chains: this.chainSupport,
        assets,
        breakdown: {
          tokens: totalValueUsd,
          defi: 0,
          nfts: 0,
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

  // Transaction operations (Real CrossMint API)
  async transfer(params: UniversalTransferParams): Promise<UniversalTransactionResult> {
    try {
      const wallets = await this.crossMintService.listWallets();
      const wallet = wallets.find((w) => this.getChainFromWalletType(w.type) === params.chain);

      if (!wallet) {
        throw new RealCrossMintError(`No wallet found for chain: ${params.chain}`);
      }

      const transaction = await this.crossMintService.createTransfer({
        walletId: wallet.address,
        to: params.to,
        amount: params.amount,
        currency: params.tokenAddress || this.getNativeSymbol(params.chain || 'ethereum'),
      });

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
    if (params.to && params.value) {
      return await this.transfer({
        to: params.to,
        amount: params.value,
        chain: params.chain,
      });
    }

    throw new RealCrossMintError('Raw transaction sending requires to/value parameters');
  }

  async swap(_params: SwapParams): Promise<UniversalTransactionResult> {
    throw new RealCrossMintError('Swap operations not supported by CrossMint API');
  }

  async bridge(_params: BridgeParams): Promise<UniversalTransactionResult> {
    throw new RealCrossMintError('Bridge operations not supported by CrossMint API');
  }

  // Transaction utilities
  async simulateTransaction(_params: UniversalTransactionParams): Promise<SimulationResult> {
    return {
      success: true,
      gasUsed: '21000',
      gasPrice: '0',
      changes: [],
      warnings: ['Simulation not available for CrossMint transactions'],
    };
  }

  async estimateGas(_params: UniversalTransactionParams): Promise<GasEstimate> {
    return {
      gasLimit: '21000',
      gasPrice: '0',
      estimatedCost: '0',
      estimatedCostUsd: 0,
      estimatedTime: 30,
    };
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
      rpcUrls: [],
      blockExplorerUrls: [],
      isTestnet: false,
      bridgeSupport: [],
    }));
  }

  async switchChain(chainId: string): Promise<void> {
    if (!this.isChainSupported(chainId)) {
      throw new RealCrossMintError(`Unsupported chain: ${chainId}`);
    }
  }

  isChainSupported(chainId: string): boolean {
    return this.chainSupport.includes(chainId);
  }

  // X.402 Payment protocol support (Real X.402 implementation)
  async createPaymentRequest(params: PaymentRequestParams): Promise<UniversalPaymentRequest> {
    try {
      const paymentRequired = await this.x402Service.createPaymentRequest({
        scheme: 'coinbase',
        recipient: params.recipient || 'default-recipient',
        amount: params.amount,
        currency: params.currency || 'USDC',
        chain: params.network || 'ethereum',
      });

      return {
        id: (paymentRequired.nonce || `payment-${Date.now()}`) as UUID,
        amount: paymentRequired.amount,
        currency: paymentRequired.currency,
        network: params.network || 'ethereum',
        status: 'pending',
        paymentUrl: `x402://pay?amount=${paymentRequired.amount}&currency=${paymentRequired.currency}`,
        expiresAt: paymentRequired.expires,
        createdAt: Date.now(),
      };
    } catch (error) {
      logger.error('Error creating X.402 payment request:', error);
      throw error;
    }
  }

  async processPayment(_request: UniversalPaymentRequest): Promise<PaymentResult> {
    try {
      // This would require wallet integration for actual payment processing
      throw new X402Error('Payment processing requires wallet integration');
    } catch (error) {
      logger.error('Error processing X.402 payment:', error);
      throw error;
    }
  }

  async verifyPayment(paymentId: string): Promise<PaymentVerification> {
    try {
      const status = await this.x402Service.getPaymentStatus(paymentId);

      return {
        valid: status.status === 'completed',
        paymentId: status.paymentId as UUID,
        transactionHash: status.transactionHash,
        amount: status.amount,
        currency: status.currency,
        network: 'ethereum', // Default network since CoinbaseFacilitatorResponse doesn't include network
        confirmations: status.confirmations || 0,
        settlementTime: status.settledAt
          ? new Date(status.settledAt).getTime() - new Date(status.createdAt).getTime()
          : undefined,
        x402Compliant: true,
      };
    } catch (error) {
      logger.error('Error verifying X.402 payment:', error);
      throw error;
    }
  }

  // Wallet management (Real CrossMint API)
  async createWallet(params: WalletCreationParams): Promise<WalletInstance> {
    try {
      const wallet = await this.crossMintService.createWallet({
        type: params.type === 'mpc' ? 'evm-mpc-wallet' : 'evm-smart-wallet',
        linkedUser: params.metadata?.userId || 'default-user',
      });

      return {
        id: `wallet-${Date.now()}` as UUID,
        address: wallet.address,
        type: wallet.type.includes('mpc') ? 'mpc' : 'smart',
        name: params.name,
        chain: this.getChainFromWalletType(wallet.type),
        metadata: { linkedUser: wallet.linkedUser },
        isActive: true,
        createdAt: new Date(wallet.createdAt).getTime(),
      };
    } catch (error) {
      logger.error('Error creating CrossMint wallet:', error);
      throw error;
    }
  }

  async importWallet(_params: WalletImportParams): Promise<WalletInstance> {
    throw new RealCrossMintError(
      'Wallet import not supported by CrossMint (MPC wallets are generated)'
    );
  }

  async getWallets(filter?: WalletFilter): Promise<WalletInstance[]> {
    try {
      const wallets = await this.crossMintService.listWallets();

      return wallets
        .filter((wallet) => {
          if (filter?.chain && this.getChainFromWalletType(wallet.type) !== filter.chain)
          {return false;}
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
    throw new RealCrossMintError('Wallet deletion not supported by CrossMint (security policy)');
  }

  // Session management (not implemented)
  async createSession(_params: SessionParams): Promise<SessionKey> {
    throw new RealCrossMintError('Session management not implemented');
  }

  async validateSession(_sessionId: string, _operation: string): Promise<boolean> {
    return false;
  }

  async revokeSession(_sessionId: string): Promise<void> {
    throw new RealCrossMintError('Session management not implemented');
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
    switch (type) {
      case 'smart-wallet':
        return 'mpc';
      case 'custodial':
        return 'smart';
      default:
        return 'eoa';
    }
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

  private getNativeSymbol(chain: string): string {
    switch (chain) {
      case 'ethereum':
        return 'ETH';
      case 'polygon':
        return 'MATIC';
      case 'arbitrum':
      case 'optimism':
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

  // Service lifecycle
  static async start(runtime: IAgentRuntime): Promise<HybridCrossMintUniversalWalletService> {
    logger.info('Starting Hybrid CrossMint + X.402 Universal Wallet Service...');

    const service = new HybridCrossMintUniversalWalletService(runtime);

    logger.info('Hybrid CrossMint + X.402 Universal Wallet Service started successfully');
    return service;
  }

  async stop(): Promise<void> {
    logger.info('Stopping Hybrid CrossMint + X.402 Universal Wallet Service...');
  }
}
