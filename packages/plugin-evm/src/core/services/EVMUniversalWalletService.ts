import {
  type IAgentRuntime,
  type IUniversalWalletService,
  type UniversalPortfolio,
  type UniversalTokenBalance,
  type UniversalTransferParams,
  type SwapParams,
  type BridgeParams,
  type UniversalTransactionParams,
  type UniversalTransactionResult,
  type SimulationResult,
  type GasEstimate,
  type ChainInfo,
  type ChainAdapter,
  type PaymentRequestParams as _PaymentRequestParams,
  type UniversalPaymentRequest as _UniversalPaymentRequest,
  type PaymentResult as _PaymentResult,
  type PaymentVerification as _PaymentVerification,
  type WalletCreationParams,
  type WalletImportParams,
  type WalletInstance,
  type WalletFilter,
  type SessionParams,
  type SessionKey,
  type UUID as _UUID,
  type TokenBalance as _TokenBalance,
  logger,
  Service,
  ServiceType,
  WalletCapability,
  stringToUuid as _stringToUuid,
} from '@elizaos/core';
import {
  createPublicClient,
  createWalletClient,
  http,
  type Address,
  type Hash,
  type PublicClient,
  type WalletClient,
  parseEther as _parseEther,
  formatEther,
  formatUnits,
  parseUnits as _parseUnits,
  getContract,
  isAddress as _isAddress,
  type Hex,
} from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import {
  mainnet,
  polygon,
  arbitrum,
  optimism,
  base,
  bsc,
  avalanche,
  type Chain,
} from 'viem/chains';
import { EVMWalletService } from './EVMWalletService';
import { createTokenService } from '../../tokens/token-service';
import { BridgeAggregatorService } from '../../cross-chain/bridge-aggregator';

// ERC20 ABI for token transfers
const ERC20_ABI = [
  {
    name: 'transfer',
    type: 'function',
    inputs: [
      { name: 'to', type: 'address' },
      { name: 'amount', type: 'uint256' },
    ],
    outputs: [{ name: '', type: 'bool' }],
    stateMutability: 'nonpayable',
  },
  {
    name: 'balanceOf',
    type: 'function',
    inputs: [{ name: 'account', type: 'address' }],
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
  },
  {
    name: 'decimals',
    type: 'function',
    inputs: [],
    outputs: [{ name: '', type: 'uint8' }],
    stateMutability: 'view',
  },
  {
    name: 'symbol',
    type: 'function',
    inputs: [],
    outputs: [{ name: '', type: 'string' }],
    stateMutability: 'view',
  },
  {
    name: 'name',
    type: 'function',
    inputs: [],
    outputs: [{ name: '', type: 'string' }],
    stateMutability: 'view',
  },
] as const;

/**
 * EVM Chain Adapter implementing the universal chain adapter interface
 */
export class EVMChainAdapter implements ChainAdapter {
  readonly capabilities: WalletCapability[] = [
    WalletCapability.TRANSFER,
    WalletCapability.SWAP,
    WalletCapability.BRIDGE,
    WalletCapability.DEFI,
    WalletCapability.NFT,
    WalletCapability.MULTISIG,
    WalletCapability.GAS_ABSTRACTION,
    WalletCapability.BATCH_TRANSACTIONS,
  ];

  constructor(
    readonly chainId: string,
    readonly name: string,
    readonly nativeToken: string,
    private chain: Chain,
    private publicClient: PublicClient,
    private walletClient: WalletClient,
    private runtime: IAgentRuntime,
    private tokenService?: ReturnType<typeof createTokenService>,
    private bridgeAggregator?: BridgeAggregatorService
  ) {}

  private getWalletAccount() {
    // Try to get the account from the wallet client first
    if (this.walletClient.account) {
      return this.walletClient.account;
    }

    // If no account on wallet client, try to derive from private key
    const privateKey = this.runtime.getSetting('EVM_PRIVATE_KEY');
    if (privateKey) {
      return privateKeyToAccount(privateKey as Hex);
    }

    throw new Error('No wallet account available for signing transactions');
  }

  async getBalance(address: string, tokenAddress?: string): Promise<UniversalTokenBalance> {
    try {
      const addr = address as Address;

      if (!tokenAddress || tokenAddress === 'native') {
        // Native token balance
        const balance = await this.publicClient.getBalance({ address: addr });
        const decimals = this.chain.nativeCurrency?.decimals || 18;
        const symbol = this.chain.nativeCurrency?.symbol || 'ETH';
        const name = this.chain.nativeCurrency?.name || 'Ethereum';

        return {
          address: 'native',
          symbol,
          name,
          decimals,
          balance: balance.toString(),
          balanceFormatted: formatEther(balance),
          valueUsd: undefined, // Would need price service
          priceUsd: undefined,
          chain: this.chainId,
          isNative: true,
        };
      } else {
        // ERC20 token balance
        const tokenAddr = tokenAddress as Address;
        const contract = getContract({
          address: tokenAddr,
          abi: ERC20_ABI,
          client: this.publicClient,
        });

        const [balance, decimals, symbol, name] = await Promise.all([
          contract.read.balanceOf([addr]),
          contract.read.decimals(),
          contract.read.symbol(),
          contract.read.name(),
        ]);

        return {
          address: tokenAddress,
          symbol,
          name,
          decimals,
          balance: balance.toString(),
          balanceFormatted: formatUnits(balance, decimals),
          valueUsd: undefined,
          priceUsd: undefined,
          chain: this.chainId,
          isNative: false,
        };
      }
    } catch (error) {
      logger.error('Failed to get balance:', error);
      throw error;
    }
  }

  async transfer(params: UniversalTransferParams): Promise<UniversalTransactionResult> {
    try {
      const to = params.to as Address;
      const amount = BigInt(params.amount);
      const account = this.getWalletAccount();

      let hash: Hash;

      if (!params.tokenAddress || params.tokenAddress === 'native') {
        // Native token transfer
        hash = await this.walletClient.sendTransaction({
          account,
          to,
          value: amount,
          chain: this.chain,
          gas: params.gasLimit ? BigInt(params.gasLimit) : undefined,
          gasPrice: params.gasPrice ? BigInt(params.gasPrice) : undefined,
        });
      } else {
        // ERC20 token transfer
        const tokenAddr = params.tokenAddress as Address;
        const contract = getContract({
          address: tokenAddr,
          abi: ERC20_ABI,
          client: this.walletClient,
        });

        hash = await contract.write.transfer([to, amount], {
          account,
          chain: this.chain,
          gas: params.gasLimit ? BigInt(params.gasLimit) : undefined,
          gasPrice: params.gasPrice ? BigInt(params.gasPrice) : undefined,
        });
      }

      // Wait for transaction confirmation
      const receipt = await this.publicClient.waitForTransactionReceipt({ hash });

      return {
        hash,
        status: receipt.status === 'success' ? 'confirmed' : 'failed',
        chain: this.chainId,
        blockNumber: Number(receipt.blockNumber),
        gasUsed: receipt.gasUsed.toString(),
        gasPrice: receipt.effectiveGasPrice.toString(),
        fee: (receipt.gasUsed * receipt.effectiveGasPrice).toString(),
        confirmations: 1,
        timestamp: Date.now(),
      };
    } catch (error) {
      logger.error('Transfer failed:', error);
      return {
        hash: '',
        status: 'failed',
        chain: this.chainId,
        error: error instanceof Error ? error.message : 'Transfer failed',
      };
    }
  }

  async sendTransaction(params: UniversalTransactionParams): Promise<UniversalTransactionResult> {
    try {
      const account = this.getWalletAccount();
      const hash = await this.walletClient.sendTransaction({
        account,
        to: params.to as Address,
        value: params.value ? BigInt(params.value) : undefined,
        data: params.data as Hex,
        chain: this.chain,
        gas: params.gasLimit ? BigInt(params.gasLimit) : undefined,
        maxFeePerGas: params.maxFeePerGas ? BigInt(params.maxFeePerGas) : undefined,
        maxPriorityFeePerGas: params.maxPriorityFeePerGas
          ? BigInt(params.maxPriorityFeePerGas)
          : undefined,
        nonce: params.nonce,
      });

      const receipt = await this.publicClient.waitForTransactionReceipt({ hash });

      return {
        hash,
        status: receipt.status === 'success' ? 'confirmed' : 'failed',
        chain: this.chainId,
        blockNumber: Number(receipt.blockNumber),
        gasUsed: receipt.gasUsed.toString(),
        gasPrice: receipt.effectiveGasPrice.toString(),
        fee: (receipt.gasUsed * receipt.effectiveGasPrice).toString(),
        confirmations: 1,
        timestamp: Date.now(),
      };
    } catch (error) {
      logger.error('Transaction failed:', error);
      return {
        hash: '',
        status: 'failed',
        chain: this.chainId,
        error: error instanceof Error ? error.message : 'Transaction failed',
      };
    }
  }

  async estimateGas(params: UniversalTransactionParams): Promise<GasEstimate> {
    try {
      const gasLimit = await this.publicClient.estimateGas({
        to: params.to as Address,
        value: params.value ? BigInt(params.value) : undefined,
        data: params.data as Hex,
      });

      const gasPrice = await this.publicClient.getGasPrice();

      return {
        gasLimit: gasLimit.toString(),
        gasPrice: gasPrice.toString(),
        estimatedCost: (gasLimit * gasPrice).toString(),
        estimatedCostUsd: undefined, // Would need price oracle
        estimatedTime: 15, // Estimate based on chain
      };
    } catch (error) {
      logger.error('Gas estimation failed:', error);
      throw error;
    }
  }

  async simulateTransaction(params: UniversalTransactionParams): Promise<SimulationResult> {
    try {
      // Use viem's simulation capabilities
      const result = await this.publicClient.call({
        to: params.to as Address,
        value: params.value ? BigInt(params.value) : undefined,
        data: params.data as Hex,
      });

      return {
        success: !!result.data,
        gasUsed: '21000', // Default estimation
        gasPrice: (await this.publicClient.getGasPrice()).toString(),
        changes: [], // Would need more sophisticated state tracking
      };
    } catch (error) {
      return {
        success: false,
        gasUsed: '0',
        gasPrice: '0',
        changes: [],
        error: error instanceof Error ? error.message : 'Simulation failed',
      };
    }
  }

  async swap(params: SwapParams): Promise<UniversalTransactionResult> {
    if (!this.tokenService) {
      throw new Error('Token service not available for swaps');
    }

    try {
      // Get wallet address from account
      const account = this.getWalletAccount();
      const _walletAddress = account.address;

      // Use the SwapAction to execute the swap
      const { SwapAction } = await import('../../actions/swap');
      const { initWalletProvider } = await import('../../providers/wallet');

      const walletProvider = await initWalletProvider(this.runtime);
      const swapAction = new SwapAction(walletProvider);

      // Execute the swap directly
      const swapResult = await swapAction.swap({
        chain: params.chain as any,
        fromToken: params.fromToken as Address,
        toToken: params.toToken as Address,
        amount: params.amount,
      });

      // Return the swap result
      return {
        hash: swapResult.hash,
        status: 'confirmed',
        chain: params.chain,
      };
    } catch (error) {
      logger.error('Swap failed:', error);
      return {
        hash: '',
        status: 'failed',
        chain: params.chain,
        error: error instanceof Error ? error.message : 'Swap failed',
      };
    }
  }
}

/**
 * EVM Universal Wallet Service
 * Implements the IUniversalWalletService interface for EVM-compatible chains
 */
export class EVMUniversalWalletService extends Service implements IUniversalWalletService {
  static readonly serviceName = 'universal-wallet-evm';
  static readonly serviceType = ServiceType.WALLET;

  readonly chainSupport = [
    'ethereum',
    'polygon',
    'arbitrum',
    'optimism',
    'base',
    'bsc',
    'avalanche',
  ];
  readonly capabilities: WalletCapability[] = [
    WalletCapability.TRANSFER,
    WalletCapability.SWAP,
    WalletCapability.BRIDGE,
    WalletCapability.DEFI,
    WalletCapability.NFT,
    WalletCapability.MULTISIG,
    WalletCapability.SESSION_KEYS,
    WalletCapability.GAS_ABSTRACTION,
    WalletCapability.BATCH_TRANSACTIONS,
  ];

  private evmWalletService?: EVMWalletService;
  private tokenService?: ReturnType<typeof createTokenService>;
  private bridgeAggregator?: BridgeAggregatorService;
  private chains: Map<string, Chain> = new Map();
  protected adapters: Map<string, ChainAdapter> = new Map();
  protected defaultChain?: string;

  constructor(runtime: IAgentRuntime) {
    super(runtime);

    // Initialize chain mappings
    this.initializeChains();

    // Get other services
    this.evmWalletService = runtime.getService<EVMWalletService>('wallet') || undefined;
    this.tokenService = createTokenService(runtime);
    this.bridgeAggregator = new BridgeAggregatorService(runtime);

    // Create and register chain adapters
    this.initializeAdapters();

    this.defaultChain = 'ethereum';
  }

  private initializeChains() {
    this.chains.set('ethereum', mainnet);
    this.chains.set('polygon', polygon);
    this.chains.set('arbitrum', arbitrum);
    this.chains.set('optimism', optimism);
    this.chains.set('base', base);
    this.chains.set('bsc', bsc);
    this.chains.set('avalanche', avalanche);
  }

  private initializeAdapters() {
    for (const [chainId, chain] of this.chains) {
      try {
        const publicClient = createPublicClient({
          chain,
          transport: http(this.getRpcUrl(chainId)),
        });

        // Create wallet client with default account if available
        const privateKey = this.runtime?.getSetting('EVM_PRIVATE_KEY');
        let walletClient: WalletClient;

        if (privateKey) {
          const account = privateKeyToAccount(privateKey as Hex);
          walletClient = createWalletClient({
            account,
            chain,
            transport: http(this.getRpcUrl(chainId)),
          });
        } else {
          // Create a wallet client without account - transactions will need to provide account
          walletClient = createWalletClient({
            chain,
            transport: http(this.getRpcUrl(chainId)),
          });
        }

        const adapter = new EVMChainAdapter(
          chainId,
          chain.name,
          chain.nativeCurrency?.symbol || 'ETH',
          chain,
          publicClient,
          walletClient,
          this.runtime!,
          this.tokenService,
          this.bridgeAggregator
        );

        this.registerAdapter(chainId, adapter);
      } catch (error) {
        logger.warn(`Failed to initialize adapter for ${chainId}:`, error);
      }
    }
  }

  private getRpcUrl(chainId: string): string {
    // Try to get custom RPC URL first
    const customRpc = this.runtime?.getSetting(`${chainId.toUpperCase()}_RPC_URL`);
    if (customRpc) {
      return customRpc;
    }

    // Default RPC URLs
    const defaultRpcs: Record<string, string> = {
      ethereum: 'https://eth.public-rpc.com',
      polygon: 'https://polygon-rpc.com',
      arbitrum: 'https://arb1.arbitrum.io/rpc',
      optimism: 'https://mainnet.optimism.io',
      base: 'https://mainnet.base.org',
      bsc: 'https://bsc-dataseed.binance.org',
      avalanche: 'https://api.avax.network/ext/bc/C/rpc',
    };

    return defaultRpcs[chainId] || 'https://eth.public-rpc.com';
  }

  // Core required methods
  transfer(params: UniversalTransferParams): Promise<UniversalTransactionResult> {
    const chain = params.chain || 'ethereum';
    if (!this.isChainSupported(chain)) {
      throw new Error(`Unsupported chain: ${chain}`);
    }

    const adapter = this.getAdapterForChain(chain);
    return adapter.transfer(params);
  }

  sendTransaction(params: UniversalTransactionParams): Promise<UniversalTransactionResult> {
    if (!this.isChainSupported(params.chain)) {
      throw new Error(`Unsupported chain: ${params.chain}`);
    }

    const adapter = this.getAdapterForChain(params.chain);
    return adapter.sendTransaction(params);
  }

  async getBalances(owner?: string): Promise<UniversalTokenBalance[]> {
    const allBalances: UniversalTokenBalance[] = [];

    for (const chainId of this.chainSupport) {
      const adapter = this.adapters.get(chainId);
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
            } catch (_error) {
              // Skip tokens that fail to fetch
              // Skip tokens that fail to fetch balances
            }
          }
        } catch (error) {
          logger.warn(`Failed to fetch balances for chain ${chainId}:`, error);
        }
      }
    }

    return allBalances;
  }

  async getBalance(assetAddress: string, owner?: string): Promise<UniversalTokenBalance> {
    const walletAddress = owner || (await this.getDefaultAddress());
    const chain = this.defaultChain || 'ethereum';
    const adapter = this.getAdapterForChain(chain);

    return adapter.getBalance(walletAddress, assetAddress === 'native' ? undefined : assetAddress);
  }

  // Enhanced implementations using EVM services
  async getPortfolio(owner?: string): Promise<UniversalPortfolio> {
    try {
      const walletAddress = owner || (await this.getDefaultAddress());

      if (this.evmWalletService) {
        // Use enhanced EVM wallet service
        const portfolio = await this.evmWalletService.getPortfolioValue(walletAddress as Address);

        // Get balances from all supported chains
        const allBalances: UniversalTokenBalance[] = [];
        for (const chainId of this.chainSupport) {
          try {
            const adapter = this.getAdapterForChain(chainId);

            // Get native balance
            const nativeBalance = await adapter.getBalance(walletAddress);
            allBalances.push(nativeBalance);

            // Get common token balances (would need token list)
            // This is a simplified implementation
          } catch (error) {
            logger.warn(`Failed to get balances for ${chainId}:`, error);
          }
        }

        return {
          totalValueUsd: portfolio.totalValueUSD,
          chains: this.chainSupport,
          assets: allBalances,
          breakdown: {
            tokens: portfolio.breakdown.tokens,
            defi: portfolio.breakdown.defi,
            nfts: portfolio.breakdown.nfts,
            staked: (portfolio.breakdown as any).staked || 0,
          },
          change24h: portfolio.change24h,
        };
      } else {
        // Fallback to basic implementation
        const balances = await this.getBalances(owner);
        const totalValue = balances.reduce((sum, balance) => sum + (balance.valueUsd || 0), 0);

        return {
          totalValueUsd: totalValue,
          chains: this.chainSupport,
          assets: balances,
          breakdown: {
            tokens: totalValue,
            defi: 0,
            nfts: 0,
            staked: 0,
          },
          change24h: { amount: 0, percent: 0 },
        };
      }
    } catch (error) {
      logger.error('Failed to get portfolio:', error);
      throw error;
    }
  }

  swap(params: SwapParams): Promise<UniversalTransactionResult> {
    if (!this.isChainSupported(params.chain)) {
      throw new Error(`Unsupported chain: ${params.chain}`);
    }

    const adapter = this.getAdapterForChain(params.chain);
    if (!adapter.swap) {
      throw new Error(`Swap not supported on ${params.chain}`);
    }

    return adapter.swap(params);
  }

  bridge(_params: BridgeParams): Promise<UniversalTransactionResult> {
    // TODO: Implement bridge functionality
    throw new Error('Bridge functionality not yet implemented');
  }

  estimateGas(params: UniversalTransactionParams): Promise<GasEstimate> {
    const adapter = this.getAdapterForChain(params.chain);
    return adapter.estimateGas(params);
  }

  simulateTransaction(params: UniversalTransactionParams): Promise<SimulationResult> {
    const adapter = this.getAdapterForChain(params.chain);
    return adapter.simulateTransaction(params);
  }

  async getTransaction(hash: string, chain?: string): Promise<UniversalTransactionResult> {
    try {
      const chainId = chain || this.defaultChain || 'ethereum';
      const chainConfig = this.chains.get(chainId);
      if (!chainConfig) {
        throw new Error(`Unsupported chain: ${chainId}`);
      }

      const publicClient = createPublicClient({
        chain: chainConfig,
        transport: http(this.getRpcUrl(chainId)),
      });

      const receipt = await publicClient.getTransactionReceipt({ hash: hash as Hash });
      const transaction = await publicClient.getTransaction({ hash: hash as Hash });

      return {
        hash,
        status: receipt.status === 'success' ? 'confirmed' : 'failed',
        chain: chainId,
        blockNumber: Number(receipt.blockNumber),
        gasUsed: receipt.gasUsed.toString(),
        gasPrice: transaction.gasPrice?.toString() || '0',
        fee: (receipt.gasUsed * (transaction.gasPrice || 0n)).toString(),
        confirmations: 1, // Would need to calculate based on current block
        timestamp: Date.now(), // Would need to get block timestamp
      };
    } catch (error) {
      logger.error('Failed to get transaction:', error);
      throw error;
    }
  }

  protected async getDefaultAddress(): Promise<string> {
    if (this.evmWalletService) {
      const activeWallet = await this.evmWalletService.getActiveWallet();
      if (activeWallet) {
        return activeWallet.address;
      }
    }

    // Try to get from private key
    const privateKey = this.runtime?.getSetting('EVM_PRIVATE_KEY');
    if (privateKey) {
      try {
        const account = privateKeyToAccount(privateKey as Hex);
        return account.address;
      } catch (_error) {
        throw new Error('Could not derive address from private key');
      }
    }

    throw new Error('No EVM wallet configured');
  }

  // Wallet management methods (optional implementation)
  createWallet(_params: WalletCreationParams): Promise<WalletInstance> {
    throw new Error('Wallet creation not implemented');
  }

  importWallet(_params: WalletImportParams): Promise<WalletInstance> {
    throw new Error('Wallet import not implemented');
  }

  getWallets(_filter?: WalletFilter): Promise<WalletInstance[]> {
    return Promise.resolve([]);
  }

  deleteWallet(_walletId: string): Promise<boolean> {
    throw new Error('Wallet deletion not implemented');
  }

  // Session management methods (optional implementation)
  createSession(_params: SessionParams): Promise<SessionKey> {
    throw new Error('Session creation not implemented');
  }

  validateSession(_sessionId: string, _operation: string): Promise<boolean> {
    return Promise.resolve(false);
  }

  revokeSession(_sessionId: string): Promise<void> {
    throw new Error('Session revocation not implemented');
  }

  listSessions(_walletId?: string): Promise<SessionKey[]> {
    return Promise.resolve([]);
  }

  // Service lifecycle
  static async start(runtime: IAgentRuntime): Promise<EVMUniversalWalletService> {
    logger.info('Starting EVMUniversalWalletService...');

    const service = new EVMUniversalWalletService(runtime);

    // Validate wallet configuration
    try {
      await service.getDefaultAddress();
      logger.info('EVM universal wallet service initialized successfully');
    } catch (error) {
      logger.warn('EVM wallet not properly configured:', error);
    }

    return service;
  }

  stop(): Promise<void> {
    logger.info('Stopping EVMUniversalWalletService...');
    // Cleanup any resources if needed
    return Promise.resolve();
  }

  // Additional required methods from IUniversalWalletService
  getSupportedChains(): Promise<ChainInfo[]> {
    const chains = this.chainSupport.map((chainId) => {
      const chain = this.chains.get(chainId);
      return {
        id: chainId,
        name: chain?.name || chainId,
        nativeToken: {
          symbol: chain?.nativeCurrency?.symbol || 'ETH',
          name: chain?.nativeCurrency?.name || 'Ethereum',
          decimals: chain?.nativeCurrency?.decimals || 18,
        },
        rpcUrls: [this.getRpcUrl(chainId)],
        blockExplorerUrls: [], // TODO: Add explorer URLs
        isTestnet: false, // TODO: Determine based on chainId
        bridgeSupport: ['lifi', 'across', 'wormhole'],
      };
    });
    return Promise.resolve(chains);
  }

  switchChain(chainId: string): Promise<void> {
    if (!this.isChainSupported(chainId)) {
      throw new Error(`Unsupported chain: ${chainId}`);
    }
    this.defaultChain = chainId;
    return Promise.resolve();
  }

  isChainSupported(chainId: string): boolean {
    return this.chainSupport.includes(chainId);
  }

  // Missing methods from base class
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

  public get capabilityDescription(): string {
    return `Universal wallet service supporting ${this.chainSupport.join(', ')} with capabilities: ${this.capabilities.join(', ')}`;
  }

  protected getCommonTokensForChain(chainId: string): Promise<string[]> {
    // Return common token addresses for each chain
    const commonTokens: Record<string, string[]> = {
      ethereum: [
        '0xA0b86a33E6441c5C0fD9A8E3e7e7C4C7bbB8A9a5', // USDC
        '0xdAc17F2588E5d7D4fBb8b3e6C2B1c8F7e4A5B6C7', // USDT
      ],
      polygon: [
        '0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174', // USDC
        '0xc2132D05D31c914a87C6611C10748AEb04B58e8F', // USDT
      ],
      base: [
        '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913', // USDC
      ],
    };

    return Promise.resolve(commonTokens[chainId] || []);
  }
}

export default EVMUniversalWalletService;
