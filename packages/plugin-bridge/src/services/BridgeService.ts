import {
  type IAgentRuntime,
  Service,
  ServiceType,
  elizaLogger,
} from '@elizaos/core';
import { createPublicClient, createWalletClient, http, type PublicClient, type WalletClient } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { mainnet, polygon, arbitrum, optimism, base } from 'viem/chains';
import * as LiFiSDK from '@lifi/sdk';

// LiFi SDK types
interface RoutesRequest {
  fromChainId: number;
  toChainId: number;
  fromTokenAddress: string;
  toTokenAddress: string;
  fromAmount: string;
  fromAddress: string;
  toAddress: string;
  options?: RouteOptions;
}

interface RouteOptions {
  slippage: number;
  maxPriceImpact: number;
  allowSwitchChain: boolean;
}

interface Route {
  id: string;
  fromChainId: number;
  toChainId: number;
  fromToken: any;
  toToken: any;
  fromAmount: string;
  toAmount: string;
  gasCostUSD?: string;
  steps: any[];
  tags?: string[];
}

import {
  type BridgeConfig,
  type BridgeQuote,
  type BridgeQuoteRequest,
  type BridgeRoute,
  type BridgeExecuteParams,
  type BridgeTransactionResult,
  type BridgeStatus,
  type ChainConfig,
  type TokenInfo,
  BridgeError,
  InsufficientBalanceError,
  UnsupportedChainError,
  BridgeNotFoundError,
  MAINNET_CHAINS,
  DEFAULT_SLIPPAGE,
  MAX_SLIPPAGE,
} from '../types/index';

export class BridgeService extends Service {
  static serviceName = 'bridge';
  static serviceType = 'bridge' as const;
  
  private bridgeConfig: BridgeConfig;
  private lifi: any;
  private walletClients: Map<number, WalletClient> = new Map();
  private publicClients: Map<number, PublicClient> = new Map();
  
  constructor(runtime?: IAgentRuntime) {
    super(runtime);
    this.bridgeConfig = this.createConfig();
    this.initializeLiFi();
    this.initializeClients();
  }

  static async start(runtime: IAgentRuntime): Promise<BridgeService> {
    const service = new BridgeService(runtime);
    elizaLogger.info('✅ BridgeService started successfully');
    return service;
  }
  

  async stop(): Promise<void> {
    elizaLogger.info('🛑 BridgeService stopped');
  }

  get capabilityDescription(): string {
    return 'Cross-chain bridge aggregation and execution service supporting major DeFi protocols including LiFi, Wormhole, Hop, Synapse, and more.';
  }

  private createConfig(): BridgeConfig {
    const supportedChains: ChainConfig[] = [
      {
        id: MAINNET_CHAINS.ETHEREUM,
        name: 'Ethereum',
        nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
        rpcUrls: [this.runtime.getSetting('EVM_PROVIDER_URL') || 'https://eth.llamarpc.com'],
        blockExplorerUrls: ['https://etherscan.io'],
      },
      {
        id: MAINNET_CHAINS.POLYGON,
        name: 'Polygon',
        nativeCurrency: { name: 'MATIC', symbol: 'MATIC', decimals: 18 },
        rpcUrls: ['https://polygon-rpc.com'],
        blockExplorerUrls: ['https://polygonscan.com'],
      },
      {
        id: MAINNET_CHAINS.ARBITRUM,
        name: 'Arbitrum One',
        nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
        rpcUrls: ['https://arb1.arbitrum.io/rpc'],
        blockExplorerUrls: ['https://arbiscan.io'],
      },
      {
        id: MAINNET_CHAINS.OPTIMISM,
        name: 'Optimism',
        nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
        rpcUrls: ['https://mainnet.optimism.io'],
        blockExplorerUrls: ['https://optimistic.etherscan.io'],
      },
      {
        id: MAINNET_CHAINS.BASE,
        name: 'Base',
        nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
        rpcUrls: ['https://mainnet.base.org'],
        blockExplorerUrls: ['https://basescan.org'],
      },
    ];

    return {
      supportedChains,
      supportedProtocols: ['lifi', 'wormhole', 'hop', 'synapse', 'across'],
      defaultSlippage: DEFAULT_SLIPPAGE,
      maxSlippage: MAX_SLIPPAGE,
      defaultGasMultiplier: 1.2,
      apiKeys: {},
      rpcUrls: {
        [MAINNET_CHAINS.ETHEREUM]: this.runtime.getSetting('EVM_PROVIDER_URL') || 'https://eth.llamarpc.com',
        [MAINNET_CHAINS.POLYGON]: 'https://polygon-rpc.com',
        [MAINNET_CHAINS.ARBITRUM]: 'https://arb1.arbitrum.io/rpc',
        [MAINNET_CHAINS.OPTIMISM]: 'https://mainnet.optimism.io',
        [MAINNET_CHAINS.BASE]: 'https://mainnet.base.org',
      },
    };
  }

  private initializeLiFi(): void {
    const lifiConfig: any = {
      apiUrl: 'https://li.quest/v1',
      rpcs: this.bridgeConfig.rpcUrls,
      defaultRouteOptions: {
        slippage: this.bridgeConfig.defaultSlippage / 100, // Convert to decimal
        maxPriceImpact: 0.4, // 40% max price impact
        allowSwitchChain: false,
      },
    };

    this.lifi = new (LiFiSDK as any).LiFi(lifiConfig);
  }

  private initializeClients(): void {
    const privateKeyRaw = this.runtime.getSetting('EVM_PRIVATE_KEY') as string;
    if (!privateKeyRaw) {
      throw new BridgeError('EVM_PRIVATE_KEY not configured', 'MISSING_PRIVATE_KEY');
    }

    const privateKey = privateKeyRaw.startsWith('0x') ? privateKeyRaw : `0x${privateKeyRaw}`;
    const account = privateKeyToAccount(privateKey as `0x${string}`);

    // Initialize clients for supported chains
    const chainConfigs = [
      { id: MAINNET_CHAINS.ETHEREUM, chain: mainnet },
      { id: MAINNET_CHAINS.POLYGON, chain: polygon },
      { id: MAINNET_CHAINS.ARBITRUM, chain: arbitrum },
      { id: MAINNET_CHAINS.OPTIMISM, chain: optimism },
      { id: MAINNET_CHAINS.BASE, chain: base },
    ];

    for (const { id, chain } of chainConfigs) {
      const rpcUrl = this.bridgeConfig.rpcUrls[id];
      
      const publicClient = createPublicClient({
        chain,
        transport: http(rpcUrl),
      });

      const walletClient = createWalletClient({
        account,
        chain,
        transport: http(rpcUrl),
      }) as WalletClient;

      this.publicClients.set(id, publicClient);
      this.walletClients.set(id, walletClient);
    }
  }


  /**
   * Get available bridge routes for a token transfer
   */
  async getQuote(request: BridgeQuoteRequest): Promise<BridgeQuote> {
    try {
      const { fromChain, toChain, fromToken, toToken, fromAmount, userAddress, slippage } = request;

      // Validate chains are supported
      if (!this.isChainSupported(fromChain)) {
        throw new UnsupportedChainError(fromChain);
      }
      if (!this.isChainSupported(toChain)) {
        throw new UnsupportedChainError(toChain);
      }

      const routeRequest: RoutesRequest = {
        fromChainId: fromChain,
        toChainId: toChain,
        fromTokenAddress: fromToken,
        toTokenAddress: toToken,
        fromAmount,
        fromAddress: userAddress,
        toAddress: userAddress,
        options: {
          slippage: (slippage || this.bridgeConfig.defaultSlippage) / 100,
          maxPriceImpact: 0.4,
          allowSwitchChain: false,
        } as RouteOptions,
      };

      const routes = await this.lifi.getRoutes(routeRequest);

      if (!routes || routes.length === 0) {
        throw new BridgeNotFoundError(fromChain, toChain);
      }

      // Convert LiFi routes to our format
      const bridgeRoutes: BridgeRoute[] = routes.map((route: Route) => this.convertLiFiRoute(route));

      const fromChainConfig = this.bridgeConfig.supportedChains.find((c: any) => c.id === fromChain)!;
      const toChainConfig = this.bridgeConfig.supportedChains.find((c: any) => c.id === toChain)!;

      // Get token info from LiFi
      const fromTokenInfo = await this.getTokenInfo(fromToken, fromChain);
      const toTokenInfo = await this.getTokenInfo(toToken, toChain);

      return {
        routes: bridgeRoutes,
        fromChain: fromChainConfig,
        toChain: toChainConfig,
        fromToken: fromTokenInfo,
        toToken: toTokenInfo,
        fromAmount,
        userAddress,
        estimatedTime: Math.min(...bridgeRoutes.map(r => r.estimatedTime)),
        requestId: `bridge_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      };
    } catch (error) {
      elizaLogger.error('Failed to get bridge quote:', error);
      if (error instanceof BridgeError) {
        throw error;
      }
      throw new BridgeError('Failed to get bridge quote', 'QUOTE_ERROR', error);
    }
  }

  /**
   * Execute a bridge transaction
   */
  async executeBridge(params: BridgeExecuteParams): Promise<BridgeTransactionResult> {
    try {
      const { route, userAddress, slippage, recipient } = params;
      
      const walletClient = this.walletClients.get(route.fromChain.id);
      if (!walletClient) {
        throw new BridgeError(`No wallet client for chain ${route.fromChain.id}`, 'NO_WALLET_CLIENT');
      }

      // Check balance before executing
      await this.checkBalance(route.fromToken.address, route.fromAmount, route.fromChain.id, userAddress);

      // Create route request for execution
      const routeRequest: RoutesRequest = {
        fromChainId: route.fromChain.id,
        toChainId: route.toChain.id,
        fromTokenAddress: route.fromToken.address,
        toTokenAddress: route.toToken.address,
        fromAmount: route.fromAmount,
        fromAddress: userAddress,
        toAddress: recipient || userAddress,
        options: {
          slippage: (slippage || this.bridgeConfig.defaultSlippage) / 100,
          maxPriceImpact: 0.4,
          allowSwitchChain: false,
        } as RouteOptions,
      };

      // Get fresh route for execution
      const routes = await this.lifi.getRoutes(routeRequest);
      if (!routes || routes.length === 0) {
        throw new BridgeNotFoundError(route.fromChain.id, route.toChain.id);
      }

      const selectedRoute = routes.find((r: any) => r.id === route.id) || routes[0];

      // Execute the route
      const execution = await this.lifi.executeRoute(walletClient, selectedRoute);
      
      elizaLogger.info(`Bridge transaction submitted: ${execution.txHash}`);

      return {
        txHash: execution.txHash,
        chainId: route.fromChain.id,
        success: true,
        route,
        bridgeId: selectedRoute.id,
      };
    } catch (error) {
      elizaLogger.error('Failed to execute bridge:', error);
      if (error instanceof BridgeError) {
        throw error;
      }
      throw new BridgeError('Failed to execute bridge transaction', 'EXECUTION_ERROR', error);
    }
  }

  /**
   * Get bridge transaction status
   */
  async getBridgeStatus(txHash: string, fromChain: number): Promise<BridgeStatus> {
    try {
      const publicClient = this.publicClients.get(fromChain);
      if (!publicClient) {
        throw new BridgeError(`No public client for chain ${fromChain}`, 'NO_PUBLIC_CLIENT');
      }

      // Get transaction receipt
      const receipt = await publicClient.getTransactionReceipt({ hash: txHash as `0x${string}` });
      
      // Get status from LiFi
      const status = await this.lifi.getStatus({
        bridge: 'lifi',
        fromChain: fromChain.toString(),
        toChain: '', // Will be filled from transaction data
        txHash,
      });

      return {
        txHash,
        fromChain,
        toChain: 0, // Will be determined from transaction
        status: receipt.status === 'success' ? 'confirmed' : 'failed',
        fromTxHash: txHash,
        steps: [{
          status: receipt.status === 'success' ? 'success' : 'failed',
          txHash,
          timestamp: Date.now(),
        }],
      };
    } catch (error) {
      elizaLogger.error('Failed to get bridge status:', error);
      throw new BridgeError('Failed to get bridge status', 'STATUS_ERROR', error);
    }
  }

  /**
   * Get supported chains
   */
  getSupportedChains(): ChainConfig[] {
    return this.bridgeConfig.supportedChains;
  }

  /**
   * Check if a chain is supported
   */
  isChainSupported(chainId: number): boolean {
    return this.bridgeConfig.supportedChains.some((chain: any) => chain.id === chainId);
  }

  /**
   * Get wallet address
   */
  getWalletAddress(): string {
    const privateKey = this.runtime.getSetting('EVM_PRIVATE_KEY') as `0x${string}`;
    const account = privateKeyToAccount(privateKey);
    return account.address;
  }

  private convertLiFiRoute(route: Route): BridgeRoute {
    return {
      id: route.id,
      protocol: 'lifi',
      fromChain: this.bridgeConfig.supportedChains.find((c: any) => c.id === route.fromChainId)!,
      toChain: this.bridgeConfig.supportedChains.find((c: any) => c.id === route.toChainId)!,
      fromToken: {
        address: route.fromToken.address,
        symbol: route.fromToken.symbol,
        name: route.fromToken.name,
        decimals: route.fromToken.decimals,
        chainId: route.fromChainId,
        logoURI: route.fromToken.logoURI,
      },
      toToken: {
        address: route.toToken.address,
        symbol: route.toToken.symbol,
        name: route.toToken.name,
        decimals: route.toToken.decimals,
        chainId: route.toChainId,
        logoURI: route.toToken.logoURI,
      },
      fromAmount: route.fromAmount,
      toAmount: route.toAmount,
      estimatedGas: route.gasCostUSD || '0',
      fees: {
        protocol: '0',
        gas: route.gasCostUSD || '0',
        total: route.gasCostUSD || '0',
      },
      estimatedTime: route.steps.reduce((sum: any, step: any) => sum + (step.estimate?.executionDuration || 0), 0),
      steps: route.steps.map((step: any) => ({
        type: step.type as 'bridge' | 'swap' | 'wrap' | 'unwrap',
        protocol: step.tool,
        fromChain: route.fromChainId,
        toChain: route.toChainId,
        fromToken: {
          address: route.fromToken.address,
          symbol: route.fromToken.symbol,
          name: route.fromToken.name,
          decimals: route.fromToken.decimals,
          chainId: route.fromChainId,
        },
        toToken: {
          address: route.toToken.address,
          symbol: route.toToken.symbol,
          name: route.toToken.name,
          decimals: route.toToken.decimals,
          chainId: route.toChainId,
        },
        fromAmount: step.estimate?.fromAmount || route.fromAmount,
        toAmount: step.estimate?.toAmount || route.toAmount,
        data: step,
      })),
      tags: route.tags,
    };
  }

  private async getTokenInfo(tokenAddress: string, chainId: number): Promise<TokenInfo> {
    try {
      const token = await this.lifi.getToken(chainId, tokenAddress);
      return {
        address: token.address,
        symbol: token.symbol,
        name: token.name,
        decimals: token.decimals,
        chainId,
        logoURI: token.logoURI,
        coingeckoId: token.coinKey,
      };
    } catch (error) {
      elizaLogger.warn(`Failed to get token info for ${tokenAddress} on chain ${chainId}:`, error);
      return {
        address: tokenAddress,
        symbol: 'UNKNOWN',
        name: 'Unknown Token',
        decimals: 18,
        chainId,
      };
    }
  }

  private async checkBalance(tokenAddress: string, amount: string, chainId: number, userAddress: string): Promise<void> {
    const publicClient = this.publicClients.get(chainId);
    if (!publicClient) {
      throw new BridgeError(`No public client for chain ${chainId}`, 'NO_PUBLIC_CLIENT');
    }

    let balance: bigint;

    if (tokenAddress === '0x0000000000000000000000000000000000000000' || 
        tokenAddress.toLowerCase() === '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee') {
      // Native token
      balance = await publicClient.getBalance({ address: userAddress as `0x${string}` });
    } else {
      // ERC20 token
      balance = await publicClient.readContract({
        address: tokenAddress as `0x${string}`,
        abi: [
          {
            name: 'balanceOf',
            type: 'function',
            stateMutability: 'view',
            inputs: [{ name: 'account', type: 'address' }],
            outputs: [{ name: '', type: 'uint256' }],
          },
        ],
        functionName: 'balanceOf',
        args: [userAddress as `0x${string}`],
      }) as bigint;
    }

    const requiredAmount = BigInt(amount);
    if (balance < requiredAmount) {
      throw new InsufficientBalanceError(amount, balance.toString());
    }
  }
}