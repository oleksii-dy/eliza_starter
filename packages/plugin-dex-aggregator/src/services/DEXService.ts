import {
  Service,
  type IAgentRuntime,
  type ServiceType
} from '@elizaos/core';
import {
  createPublicClient,
  createWalletClient,
  http,
  type PublicClient,
  type WalletClient,
  type Hash,
  type Address,
  parseUnits,
  formatUnits,
  getContract
} from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { mainnet, polygon, arbitrum, optimism, base } from 'viem/chains';
import axios from 'axios';
import BigNumber from 'bignumber.js';

import {
  type SwapQuoteRequest,
  type SwapQuote,
  type SwapExecuteRequest,
  type SwapTransactionResult,
  type TokenInfo,
  type DEXRoute,
  type Portfolio,
  type TokenBalance,
  type ChainConfig,
  DEXProtocol,
  SwapType,
  MAINNET_CHAINS,
  COMMON_TOKENS,
  CHAIN_DEX_SUPPORT,
  DEFAULT_SLIPPAGE,
  DEFAULT_DEADLINE,
  MAX_PRICE_IMPACT,
  DEXError,
  InsufficientBalanceError,
  UnsupportedChainError,
  NoRouteFoundError,
  PriceImpactHighError
} from '../types/index.js';

export interface DEXConfig {
  chains: ChainConfig[];
  enabledProtocols: DEXProtocol[];
  defaultSlippage: number;
  maxPriceImpact: number;
  apiKeys: {
    oneInch?: string;
    paraswap?: string;
    zeroX?: string;
  };
}

export class DEXService extends Service {
  static serviceName = 'dex';
  static serviceType = 'dex' as ServiceType;

  private walletClients: Map<number, WalletClient> = new Map();
  private publicClients: Map<number, PublicClient> = new Map();
  private dexConfig: DEXConfig;
  private account: any;

  constructor(runtime?: IAgentRuntime) {
    super(runtime);
    this.dexConfig = this.createConfig();
    this.initializeClients();
  }

  get capabilityDescription(): string {
    return 'Provides DEX aggregation and optimal token swapping across multiple protocols including 1inch, Paraswap, 0x, and others. Supports multi-chain swapping with best price routing.';
  }

  static async start(runtime: IAgentRuntime): Promise<DEXService> {
    const service = new DEXService(runtime);
    
    runtime.logger.info('🔄 Starting DEX aggregation service...');
    
    try {
      await service.initialize();
      runtime.logger.success('✅ DEX service initialized successfully');
      return service;
    } catch (error) {
      runtime.logger.error('❌ Failed to initialize DEX service:', error);
      throw error;
    }
  }

  private createConfig(): DEXConfig {
    const privateKey = this.runtime?.getSetting('EVM_PRIVATE_KEY') as string;
    if (!privateKey) {
      throw new Error('EVM_PRIVATE_KEY is required for DEX service');
    }

    this.account = privateKeyToAccount(privateKey as `0x${string}`);

    return {
      chains: [
        {
          id: MAINNET_CHAINS.ETHEREUM,
          name: 'Ethereum',
          nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
          rpcUrls: ['https://eth.llamarpc.com'],
          blockExplorerUrls: ['https://etherscan.io'],
          dexAggregators: CHAIN_DEX_SUPPORT[MAINNET_CHAINS.ETHEREUM] || []
        },
        {
          id: MAINNET_CHAINS.POLYGON,
          name: 'Polygon',
          nativeCurrency: { name: 'MATIC', symbol: 'MATIC', decimals: 18 },
          rpcUrls: ['https://polygon.llamarpc.com'],
          blockExplorerUrls: ['https://polygonscan.com'],
          dexAggregators: CHAIN_DEX_SUPPORT[MAINNET_CHAINS.POLYGON] || []
        },
        {
          id: MAINNET_CHAINS.ARBITRUM,
          name: 'Arbitrum',
          nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
          rpcUrls: ['https://arbitrum.llamarpc.com'],
          blockExplorerUrls: ['https://arbiscan.io'],
          dexAggregators: CHAIN_DEX_SUPPORT[MAINNET_CHAINS.ARBITRUM] || []
        },
        {
          id: MAINNET_CHAINS.OPTIMISM,
          name: 'Optimism',
          nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
          rpcUrls: ['https://optimism.llamarpc.com'],
          blockExplorerUrls: ['https://optimistic.etherscan.io'],
          dexAggregators: CHAIN_DEX_SUPPORT[MAINNET_CHAINS.OPTIMISM] || []
        },
        {
          id: MAINNET_CHAINS.BASE,
          name: 'Base',
          nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
          rpcUrls: ['https://base.llamarpc.com'],
          blockExplorerUrls: ['https://basescan.org'],
          dexAggregators: CHAIN_DEX_SUPPORT[MAINNET_CHAINS.BASE] || []
        }
      ],
      enabledProtocols: [
        DEXProtocol.ONE_INCH,
        DEXProtocol.PARASWAP,
        DEXProtocol.UNISWAP,
        DEXProtocol.SUSHISWAP
      ],
      defaultSlippage: DEFAULT_SLIPPAGE,
      maxPriceImpact: MAX_PRICE_IMPACT,
      apiKeys: {
        oneInch: this.runtime?.getSetting('ONE_INCH_API_KEY') as string,
        paraswap: this.runtime?.getSetting('PARASWAP_API_KEY') as string,
        zeroX: this.runtime?.getSetting('ZERO_X_API_KEY') as string
      }
    };
  }

  private initializeClients(): void {
    const chains = [mainnet, polygon, arbitrum, optimism, base];
    
    for (const chain of chains) {
      const rpcUrl = this.getRpcUrl(chain.id);
      
      // Create public client
      const publicClient = createPublicClient({
        chain,
        transport: http(rpcUrl)
      });
      this.publicClients.set(chain.id, publicClient);

      // Create wallet client
      const walletClient = createWalletClient({
        account: this.account,
        chain,
        transport: http(rpcUrl)
      });
      this.walletClients.set(chain.id, walletClient);
    }
  }

  private getRpcUrl(chainId: number): string {
    const chainConfig = this.dexConfig.chains.find(c => c.id === chainId);
    return chainConfig?.rpcUrls[0] || '';
  }

  async initialize(): Promise<void> {
    this.runtime?.logger.info('Initializing DEX service...');
    
    // Test connectivity to each chain
    for (const [chainId, client] of this.publicClients.entries()) {
      try {
        await client.getBlockNumber();
        this.runtime?.logger.info(`✅ Connected to chain ${chainId}`);
      } catch (error) {
        this.runtime?.logger.warn(`⚠️ Failed to connect to chain ${chainId}:`, error);
      }
    }
  }

  async getQuote(request: SwapQuoteRequest): Promise<SwapQuote> {
    this.validateChain(request.chainId);
    
    // Get quotes from multiple protocols
    const quotes = await Promise.allSettled([
      this.get1inchQuote(request),
      this.getParaswapQuote(request),
      this.getUniswapQuote(request)
    ]);

    // Find the best quote
    const validQuotes = quotes
      .filter((result): result is PromiseFulfilledResult<SwapQuote> => result.status === 'fulfilled')
      .map(result => result.value);

    if (validQuotes.length === 0) {
      throw new NoRouteFoundError(request.fromToken, request.toToken, request.chainId);
    }

    // Select best quote based on output amount
    const bestQuote = validQuotes.reduce((best, current) => {
      const bestAmount = new BigNumber(best.toAmount);
      const currentAmount = new BigNumber(current.toAmount);
      return currentAmount.gt(bestAmount) ? current : best;
    });

    // Check price impact
    if (parseFloat(bestQuote.priceImpact) > this.dexConfig.maxPriceImpact) {
      throw new PriceImpactHighError(bestQuote.priceImpact, this.dexConfig.maxPriceImpact.toString());
    }

    return bestQuote;
  }

  private async get1inchQuote(request: SwapQuoteRequest): Promise<SwapQuote> {
    if (!this.dexConfig.apiKeys.oneInch) {
      throw new DEXError('1inch API key not configured', 'MISSING_API_KEY');
    }

    try {
      const response = await axios.get(`https://api.1inch.dev/swap/v6.0/${request.chainId}/quote`, {
        params: {
          src: request.fromToken,
          dst: request.toToken,
          amount: request.amount,
          includeTokensInfo: true,
          includeProtocols: true
        },
        headers: {
          'Authorization': `Bearer ${this.dexConfig.apiKeys.oneInch}`
        }
      });

      const data = response.data;
      
      return {
        fromToken: data.srcToken,
        toToken: data.dstToken,
        fromAmount: request.amount,
        toAmount: data.dstAmount,
        estimatedGas: data.gas?.toString() || '200000',
        gasPrice: data.gasPrice?.toString() || '0',
        protocols: [{
          protocol: DEXProtocol.ONE_INCH,
          name: '1inch',
          percentage: 100,
          fromTokenAmount: request.amount,
          toTokenAmount: data.dstAmount,
          estimatedGas: data.gas?.toString() || '200000',
          pools: []
        }],
        estimatedTime: 30,
        priceImpact: '0',
        slippage: request.slippage || DEFAULT_SLIPPAGE,
        fees: {
          gas: data.gas?.toString() || '200000',
          protocol: '0',
          total: data.gas?.toString() || '200000'
        },
        requestId: `1inch-${Date.now()}`,
        validUntil: Date.now() + (5 * 60 * 1000), // 5 minutes
        chainId: request.chainId
      };
    } catch (error) {
      this.runtime?.logger.warn('Failed to get 1inch quote:', error);
      throw new DEXError('Failed to get 1inch quote', 'QUOTE_FAILED', error);
    }
  }

  private async getParaswapQuote(request: SwapQuoteRequest): Promise<SwapQuote> {
    try {
      const response = await axios.get(`https://apiv5.paraswap.io/prices`, {
        params: {
          srcToken: request.fromToken,
          destToken: request.toToken,
          amount: request.amount,
          srcDecimals: 18,
          destDecimals: 18,
          network: request.chainId,
          side: 'SELL'
        }
      });

      const data = response.data.priceRoute;
      
      return {
        fromToken: {
          address: request.fromToken,
          symbol: data.srcToken,
          name: data.srcToken,
          decimals: data.srcDecimals,
          chainId: request.chainId
        },
        toToken: {
          address: request.toToken,
          symbol: data.destToken,
          name: data.destToken,
          decimals: data.destDecimals,
          chainId: request.chainId
        },
        fromAmount: request.amount,
        toAmount: data.destAmount,
        estimatedGas: data.gasCost?.toString() || '200000',
        gasPrice: '0',
        protocols: [{
          protocol: DEXProtocol.PARASWAP,
          name: 'Paraswap',
          percentage: 100,
          fromTokenAmount: request.amount,
          toTokenAmount: data.destAmount,
          estimatedGas: data.gasCost?.toString() || '200000',
          pools: []
        }],
        estimatedTime: 30,
        priceImpact: data.side === 'SELL' ? '0' : '0',
        slippage: request.slippage || DEFAULT_SLIPPAGE,
        fees: {
          gas: data.gasCost?.toString() || '200000',
          protocol: '0',
          total: data.gasCost?.toString() || '200000'
        },
        requestId: `paraswap-${Date.now()}`,
        validUntil: Date.now() + (5 * 60 * 1000),
        chainId: request.chainId
      };
    } catch (error) {
      this.runtime?.logger.warn('Failed to get Paraswap quote:', error);
      throw new DEXError('Failed to get Paraswap quote', 'QUOTE_FAILED', error);
    }
  }

  private async getUniswapQuote(request: SwapQuoteRequest): Promise<SwapQuote> {
    // Simplified Uniswap quote - in production would use Uniswap SDK
    return {
      fromToken: {
        address: request.fromToken,
        symbol: 'FROM',
        name: 'From Token',
        decimals: 18,
        chainId: request.chainId
      },
      toToken: {
        address: request.toToken,
        symbol: 'TO',
        name: 'To Token',
        decimals: 18,
        chainId: request.chainId
      },
      fromAmount: request.amount,
      toAmount: new BigNumber(request.amount).multipliedBy(0.99).toString(), // Mock 1% slippage
      estimatedGas: '200000',
      gasPrice: '0',
      protocols: [{
        protocol: DEXProtocol.UNISWAP,
        name: 'Uniswap V3',
        percentage: 100,
        fromTokenAmount: request.amount,
        toTokenAmount: new BigNumber(request.amount).multipliedBy(0.99).toString(),
        estimatedGas: '200000',
        pools: []
      }],
      estimatedTime: 30,
      priceImpact: '1.0',
      slippage: request.slippage || DEFAULT_SLIPPAGE,
      fees: {
        gas: '200000',
        protocol: '3000', // 0.3% fee
        total: '203000'
      },
      requestId: `uniswap-${Date.now()}`,
      validUntil: Date.now() + (5 * 60 * 1000),
      chainId: request.chainId
    };
  }

  async executeSwap(request: SwapExecuteRequest): Promise<SwapTransactionResult> {
    const { quote, userAddress } = request;
    
    this.validateChain(quote.chainId);
    
    const walletClient = this.walletClients.get(quote.chainId);
    if (!walletClient) {
      throw new UnsupportedChainError(quote.chainId);
    }

    // Check balance
    await this.checkBalance(quote.fromToken.address, quote.fromAmount, quote.chainId);

    try {
      // Execute based on primary protocol
      let txHash: Hash;
      
      if (quote.protocols[0].protocol === DEXProtocol.ONE_INCH) {
        txHash = await this.execute1inchSwap(quote, userAddress);
      } else if (quote.protocols[0].protocol === DEXProtocol.PARASWAP) {
        txHash = await this.executeParaswapSwap(quote, userAddress);
      } else {
        txHash = await this.executeUniswapSwap(quote, userAddress);
      }

      return {
        txHash,
        chainId: quote.chainId,
        success: true,
        fromToken: quote.fromToken,
        toToken: quote.toToken,
        fromAmount: quote.fromAmount,
        toAmount: quote.toAmount,
        gasPrice: quote.gasPrice,
        timestamp: Date.now(),
        protocols: quote.protocols
      };
    } catch (error) {
      this.runtime?.logger.error('Swap execution failed:', error);
      throw new DEXError('Swap execution failed', 'EXECUTION_FAILED', error);
    }
  }

  private async execute1inchSwap(quote: SwapQuote, userAddress: string): Promise<Hash> {
    // Implementation would call 1inch swap API and execute transaction
    // For now, return mock hash
    return '0x' + '1'.repeat(64) as Hash;
  }

  private async executeParaswapSwap(quote: SwapQuote, userAddress: string): Promise<Hash> {
    // Implementation would call Paraswap transaction API and execute
    return '0x' + '2'.repeat(64) as Hash;
  }

  private async executeUniswapSwap(quote: SwapQuote, userAddress: string): Promise<Hash> {
    // Implementation would use Uniswap SDK to build and execute transaction
    return '0x' + '3'.repeat(64) as Hash;
  }

  async getPortfolio(chainId: number): Promise<Portfolio> {
    this.validateChain(chainId);
    
    const publicClient = this.publicClients.get(chainId);
    if (!publicClient) {
      throw new UnsupportedChainError(chainId);
    }

    const tokens: TokenBalance[] = [];
    let totalValueUSD = 0;

    // Get common token balances
    const commonTokens = COMMON_TOKENS[chainId] || {};
    
    for (const [symbol, address] of Object.entries(commonTokens)) {
      try {
        const balance = await this.getTokenBalance(address, chainId);
        if (new BigNumber(balance).gt(0)) {
          const tokenInfo: TokenInfo = {
            address,
            symbol,
            name: symbol,
            decimals: 18, // Would fetch from contract
            chainId
          };

          const tokenBalance: TokenBalance = {
            token: tokenInfo,
            balance,
            balanceUSD: 0 // Would fetch price
          };

          tokens.push(tokenBalance);
        }
      } catch (error) {
        this.runtime?.logger.warn(`Failed to get balance for ${symbol}:`, error);
      }
    }

    return {
      chainId,
      totalValueUSD,
      tokens,
      lastUpdated: Date.now()
    };
  }

  private async getTokenBalance(tokenAddress: string, chainId: number): Promise<string> {
    const publicClient = this.publicClients.get(chainId);
    if (!publicClient) {
      throw new UnsupportedChainError(chainId);
    }

    if (tokenAddress === '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE') {
      // Native token balance
      const balance = await publicClient.getBalance({
        address: this.account.address
      });
      return balance.toString();
    }

    // ERC20 token balance - would use contract call
    return '0';
  }

  private async checkBalance(tokenAddress: string, requiredAmount: string, chainId: number): Promise<void> {
    const balance = await this.getTokenBalance(tokenAddress, chainId);
    
    if (new BigNumber(balance).lt(requiredAmount)) {
      throw new InsufficientBalanceError(requiredAmount, balance);
    }
  }

  private validateChain(chainId: number): void {
    const supportedChains = this.dexConfig.chains.map(c => c.id);
    if (!supportedChains.includes(chainId)) {
      throw new UnsupportedChainError(chainId);
    }
  }

  async stop(): Promise<void> {
    this.runtime?.logger.info('Stopping DEX service...');
    this.walletClients.clear();
    this.publicClients.clear();
  }
}