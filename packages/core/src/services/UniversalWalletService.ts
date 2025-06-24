import { Service, ServiceType, IAgentRuntime } from '../types/index';
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
  ChainAdapter,
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
} from '../types/universal-wallet';

/**
 * Abstract base class for universal wallet services
 * Provides common functionality and adapter pattern for multi-chain wallets
 */
export abstract class UniversalWalletService extends Service implements IUniversalWalletService {
  static override readonly serviceType = ServiceType.WALLET;

  abstract readonly chainSupport: string[];
  abstract readonly capabilities: WalletCapability[];

  protected adapters: Map<string, ChainAdapter> = new Map();
  protected defaultChain?: string;

  constructor(runtime?: IAgentRuntime) {
    super(runtime);
  }

  public override get capabilityDescription(): string {
    return `Universal wallet service supporting ${this.chainSupport.join(', ')} with capabilities: ${this.capabilities.join(', ')}`;
  }

  // Abstract methods that each implementation must provide
  abstract transfer(params: UniversalTransferParams): Promise<UniversalTransactionResult>;
  abstract sendTransaction(params: UniversalTransactionParams): Promise<UniversalTransactionResult>;

  // Common implementations with adapter delegation
  async getPortfolio(owner?: string): Promise<UniversalPortfolio> {
    const balances = await this.getBalances(owner);
    const totalValue = balances.reduce((sum, balance) => sum + (balance.valueUsd || 0), 0);

    return {
      totalValueUsd: totalValue,
      chains: this.chainSupport,
      assets: balances,
      breakdown: this.calculateBreakdown(balances),
      change24h: await this.calculatePortfolioChange(balances),
    };
  }

  async getBalances(owner?: string): Promise<UniversalTokenBalance[]> {
    const allBalances: UniversalTokenBalance[] = [];

    for (const chainId of this.chainSupport) {
      const adapter = this.getAdapterForChain(chainId);
      if (adapter) {
        try {
          // Get native token balance
          const nativeBalance = await adapter.getBalance(
            owner || (await this.getDefaultAddress()),
            undefined
          );
          allBalances.push(nativeBalance);

          // Get common token balances for this chain
          const tokens = await this.getCommonTokensForChain(chainId);
          for (const tokenAddress of tokens) {
            try {
              const tokenBalance = await adapter.getBalance(
                owner || (await this.getDefaultAddress()),
                tokenAddress
              );
              if (parseFloat(tokenBalance.balance) > 0) {
                allBalances.push(tokenBalance);
              }
            } catch (error) {
              // Skip tokens that fail to fetch
              console.debug(
                `Failed to fetch balance for token ${tokenAddress} on ${chainId}:`,
                error
              );
            }
          }
        } catch (error) {
          console.warn(`Failed to fetch balances for chain ${chainId}:`, error);
        }
      }
    }

    return allBalances;
  }

  async getSupportedChains(): Promise<ChainInfo[]> {
    const chains: ChainInfo[] = [];

    for (const chainId of this.chainSupport) {
      const chainInfo = await this.getChainInfo(chainId);
      if (chainInfo) {
        chains.push(chainInfo);
      }
    }

    return chains;
  }

  isChainSupported(chainId: string): boolean {
    return this.chainSupport.includes(chainId);
  }

  async switchChain(chainId: string): Promise<void> {
    if (!this.isChainSupported(chainId)) {
      throw new Error(`Chain ${chainId} is not supported`);
    }
    this.defaultChain = chainId;
  }

  async estimateGas(params: UniversalTransactionParams): Promise<GasEstimate> {
    const adapter = this.getAdapterForChain(params.chain);
    return await adapter.estimateGas(params);
  }

  async simulateTransaction(params: UniversalTransactionParams): Promise<SimulationResult> {
    const adapter = this.getAdapterForChain(params.chain);
    return await adapter.simulateTransaction(params);
  }

  async getTransaction(hash: string, chain?: string): Promise<UniversalTransactionResult> {
    const chainId = chain || this.defaultChain || this.chainSupport[0];
    const _adapter = this.getAdapterForChain(chainId);

    // This would need to be implemented by each adapter
    throw new Error('getTransaction not implemented by adapter');
  }

  // Optional methods with default implementations
  async swap(params: SwapParams): Promise<UniversalTransactionResult> {
    const adapter = this.getAdapterForChain(params.chain);

    if (adapter.swap) {
      return await adapter.swap(params);
    }

    throw new Error(`Swap not supported on chain ${params.chain}`);
  }

  async bridge(params: BridgeParams): Promise<UniversalTransactionResult> {
    // Default bridge implementation using available bridge protocols
    const fromAdapter = this.getAdapterForChain(params.fromChain);
    const toAdapter = this.getAdapterForChain(params.toChain);

    if (!fromAdapter || !toAdapter) {
      throw new Error(`Bridge not supported between ${params.fromChain} and ${params.toChain}`);
    }

    // This would integrate with bridge protocols like LiFi, Across, etc.
    throw new Error('Bridge functionality requires specific implementation');
  }

  // Payment protocol methods (optional)
  async createPaymentRequest(_params: PaymentRequestParams): Promise<UniversalPaymentRequest> {
    throw new Error('Payment request creation not implemented');
  }

  async processPayment(_request: UniversalPaymentRequest): Promise<PaymentResult> {
    throw new Error('Payment processing not implemented');
  }

  async verifyPayment(_paymentId: string): Promise<PaymentVerification> {
    throw new Error('Payment verification not implemented');
  }

  // Wallet management methods (optional)
  async createWallet(_params: WalletCreationParams): Promise<WalletInstance> {
    throw new Error('Wallet creation not implemented');
  }

  async importWallet(_params: WalletImportParams): Promise<WalletInstance> {
    throw new Error('Wallet import not implemented');
  }

  async getWallets(_filter?: WalletFilter): Promise<WalletInstance[]> {
    throw new Error('Wallet listing not implemented');
  }

  async deleteWallet(_walletId: string): Promise<boolean> {
    throw new Error('Wallet deletion not implemented');
  }

  // Session management methods (optional)
  async createSession(_params: SessionParams): Promise<SessionKey> {
    throw new Error('Session creation not implemented');
  }

  async validateSession(_sessionId: string, _operation: string): Promise<boolean> {
    throw new Error('Session validation not implemented');
  }

  async revokeSession(_sessionId: string): Promise<void> {
    throw new Error('Session revocation not implemented');
  }

  async listSessions(_walletId?: string): Promise<SessionKey[]> {
    throw new Error('Session listing not implemented');
  }

  // Protected utility methods
  protected getAdapterForChain(chainId: string): ChainAdapter {
    const adapter = this.adapters.get(chainId);
    if (!adapter) {
      throw new Error(`No adapter found for chain: ${chainId}`);
    }
    return adapter;
  }

  protected registerAdapter(chainId: string, adapter: ChainAdapter): void {
    this.adapters.set(chainId, adapter);
  }

  protected calculateBreakdown(balances: UniversalTokenBalance[]) {
    const breakdown = {
      tokens: 0,
      defi: 0,
      nfts: 0,
      staked: 0,
    };

    for (const balance of balances) {
      // Simple categorization - could be enhanced with token metadata
      if (balance.isNative || balance.symbol.includes('USD')) {
        breakdown.tokens += balance.valueUsd || 0;
      } else {
        breakdown.tokens += balance.valueUsd || 0;
      }
    }

    return breakdown;
  }

  protected async calculatePortfolioChange(
    _balances: UniversalTokenBalance[]
  ): Promise<{ amount: number; percent: number }> {
    // This would require historical price data
    // For now, return zero change
    return { amount: 0, percent: 0 };
  }

  protected async getDefaultAddress(): Promise<string> {
    // This should be implemented by each wallet service
    throw new Error('getDefaultAddress must be implemented by wallet service');
  }

  protected async getCommonTokensForChain(chainId: string): Promise<string[]> {
    // Return common token addresses for each chain
    const commonTokens: Record<string, string[]> = {
      ethereum: [
        '0xA0b86a33E6441c5C0fD9A8E3e7e7C4C7bbB8A9a5', // USDC
        '0xdAc17F2588E5d7D4fBb8b3e6C2B1c8F7e4A5B6C7', // USDT
        '0xA0b86a33E6441c5C0fD9A8E3e7e7C4C7bbB8A9a5', // USDC
      ],
      polygon: [
        '0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174', // USDC
        '0xc2132D05D31c914a87C6611C10748AEb04B58e8F', // USDT
      ],
      base: [
        '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913', // USDC
      ],
      solana: [
        'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v', // USDC
        'Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB', // USDT
      ],
    };

    return commonTokens[chainId] || [];
  }

  protected async getChainInfo(chainId: string): Promise<ChainInfo | null> {
    // Return chain information for supported chains
    const chainInfo: Record<string, ChainInfo> = {
      ethereum: {
        id: 'ethereum',
        name: 'Ethereum',
        nativeToken: { symbol: 'ETH', name: 'Ethereum', decimals: 18 },
        rpcUrls: ['https://eth.public-rpc.com'],
        blockExplorerUrls: ['https://etherscan.io'],
        isTestnet: false,
        bridgeSupport: ['lifi', 'across', 'hop'],
      },
      polygon: {
        id: 'polygon',
        name: 'Polygon',
        nativeToken: { symbol: 'MATIC', name: 'Polygon', decimals: 18 },
        rpcUrls: ['https://polygon-rpc.com'],
        blockExplorerUrls: ['https://polygonscan.com'],
        isTestnet: false,
        bridgeSupport: ['lifi', 'across'],
      },
      base: {
        id: 'base',
        name: 'Base',
        nativeToken: { symbol: 'ETH', name: 'Ethereum', decimals: 18 },
        rpcUrls: ['https://mainnet.base.org'],
        blockExplorerUrls: ['https://basescan.org'],
        isTestnet: false,
        bridgeSupport: ['lifi', 'across'],
      },
      solana: {
        id: 'solana',
        name: 'Solana',
        nativeToken: { symbol: 'SOL', name: 'Solana', decimals: 9 },
        rpcUrls: ['https://api.mainnet-beta.solana.com'],
        blockExplorerUrls: ['https://solscan.io'],
        isTestnet: false,
        bridgeSupport: ['wormhole', 'allbridge'],
      },
    };

    return chainInfo[chainId] || null;
  }
}
