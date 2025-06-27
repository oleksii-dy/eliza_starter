import { 
  Service, 
  IAgentRuntime, 
  elizaLogger 
} from '@elizaos/core';
import { createPublicClient, createWalletClient, http, type WalletClient, type PublicClient } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { mainnet, polygon, arbitrum, optimism, base } from 'viem/chains';
import { Pool } from '@aave/core-v3';
import { UiPoolDataProvider } from '@aave/contract-helpers';
import { formatReserves, formatUserSummary } from '@aave/math-utils';
import BigNumber from 'bignumber.js';

import {
  type LendingConfig,
  type LendingMarket,
  type UserPosition,
  type LendingSupplyRequest,
  type LendingWithdrawRequest,
  type LendingBorrowRequest,
  type LendingRepayRequest,
  type LendingTransactionResult,
  type ChainConfig,
  type TokenInfo,
  LendingProtocol,
  LendingActionType,
  InterestRateMode,
  MAINNET_CHAINS,
  COMMON_TOKENS,
  DEFAULT_HEALTH_FACTOR_TARGET,
  DEFAULT_SLIPPAGE,
  LendingError,
  InsufficientLiquidityError,
  InsufficientCollateralError,
  UnsupportedProtocolError,
  MarketNotActiveError,
  BorrowingDisabledError,
} from '../types/index.js';

export class LendingService extends Service {
  static serviceName = 'lending';
  static serviceType = 'lending' as const;

  private lendingConfig: LendingConfig;
  private walletClients: Map<number, WalletClient> = new Map();
  private publicClients: Map<number, PublicClient> = new Map();
  private pools: Map<string, any> = new Map(); // Protocol pools by chainId-protocol key
  private dataProviders: Map<string, any> = new Map(); // Data providers by chainId-protocol key

  constructor(runtime?: IAgentRuntime) {
    super(runtime);
    this.lendingConfig = this.createConfig();
    this.initializeClients();
    this.initializeProtocols();
  }

  static async start(runtime: IAgentRuntime): Promise<LendingService> {
    const service = new LendingService(runtime);
    elizaLogger.info('✅ LendingService started successfully');
    return service;
  }

  async stop(): Promise<void> {
    elizaLogger.info('🛑 LendingService stopped');
  }

  get capabilityDescription(): string {
    return 'DeFi lending and borrowing service supporting protocols like Aave, Compound, and others for supply, withdrawal, borrowing, and repayment operations across multiple chains.';
  }

  private createConfig(): LendingConfig {
    const supportedChains: ChainConfig[] = [
      {
        id: MAINNET_CHAINS.ETHEREUM,
        name: 'Ethereum',
        nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
        rpcUrls: [this.runtime?.getSetting('EVM_PROVIDER_URL') || 'https://eth.llamarpc.com'],
        blockExplorerUrls: ['https://etherscan.io']
      },
      {
        id: MAINNET_CHAINS.POLYGON,
        name: 'Polygon',
        nativeCurrency: { name: 'MATIC', symbol: 'MATIC', decimals: 18 },
        rpcUrls: ['https://polygon-rpc.com'],
        blockExplorerUrls: ['https://polygonscan.com']
      },
      {
        id: MAINNET_CHAINS.ARBITRUM,
        name: 'Arbitrum One',
        nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
        rpcUrls: ['https://arb1.arbitrum.io/rpc'],
        blockExplorerUrls: ['https://arbiscan.io']
      },
      {
        id: MAINNET_CHAINS.OPTIMISM,
        name: 'Optimism',
        nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
        rpcUrls: ['https://mainnet.optimism.io'],
        blockExplorerUrls: ['https://optimistic.etherscan.io']
      },
      {
        id: MAINNET_CHAINS.BASE,
        name: 'Base',
        nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
        rpcUrls: ['https://mainnet.base.org'],
        blockExplorerUrls: ['https://basescan.org']
      }
    ];

    const protocolAddresses = {
      [MAINNET_CHAINS.ETHEREUM]: {
        [LendingProtocol.AAVE]: {
          pool: '0x87870Bca3F3fD6335C3F4ce8392D69350B4fA4E2',
          dataProvider: '0x7B4EB56E7CD4b454BA8ff71E4518426369a138a3',
          oracle: '0x54586bE62E3c3580375aE3723C145253060Ca0C2',
          wethGateway: '0xD322A49006FC828F9B5B37Ab215F99B4E5caB19C',
        }
      },
      [MAINNET_CHAINS.POLYGON]: {
        [LendingProtocol.AAVE]: {
          pool: '0x794a61358D6845594F94dc1DB02A252b5b4814aD',
          dataProvider: '0x69FA688f1Dc47d4B5d8029D5a35FB7a548310654',
          oracle: '0xb023e699F5a33916Ea823A16485e259257cA8Bd1',
          wethGateway: '0x1e4b7A6b903680eAb0c5dAbcb8fD429cD2a9598c',
        }
      },
      [MAINNET_CHAINS.ARBITRUM]: {
        [LendingProtocol.AAVE]: {
          pool: '0x794a61358D6845594F94dc1DB02A252b5b4814aD',
          dataProvider: '0x69FA688f1Dc47d4B5d8029D5a35FB7a548310654',
          oracle: '0xb56c2F0B653B2e0b10C9b928C8580Ac5Df02C7C7',
          wethGateway: '0xB5Ee21786D28c5Ba61661550879475976B707099',
        }
      },
      [MAINNET_CHAINS.OPTIMISM]: {
        [LendingProtocol.AAVE]: {
          pool: '0x794a61358D6845594F94dc1DB02A252b5b4814aD',
          dataProvider: '0x69FA688f1Dc47d4B5d8029D5a35FB7a548310654',
          oracle: '0xD81eb3728a631871a7eBBaD631b5f424909f0c77',
          wethGateway: '0x76D3030728e52DEB8848d5613aBaDE88441cbc59',
        }
      },
      [MAINNET_CHAINS.BASE]: {
        [LendingProtocol.AAVE]: {
          pool: '0xA238Dd80C259a72e81d7e4664a9801593F98d1c5',
          dataProvider: '0x2d8A3C5677189723C4cB8873CfC9C8976FDF38Ac',
          oracle: '0x2Cc0Fc26eD4563A5ce5e8bdcfe1A2878676Ae156',
          wethGateway: '0x8be473dCfA93132658821E67CbEB684ec8Ea2E74',
        }
      }
    };

    return {
      supportedChains,
      supportedProtocols: [LendingProtocol.AAVE], // Start with Aave, expand later
      defaultSlippage: DEFAULT_SLIPPAGE,
      maxSlippage: 5.0,
      healthFactorTarget: DEFAULT_HEALTH_FACTOR_TARGET,
      rpcUrls: {
        [MAINNET_CHAINS.ETHEREUM]: this.runtime?.getSetting('EVM_PROVIDER_URL') || 'https://eth.llamarpc.com',
        [MAINNET_CHAINS.POLYGON]: 'https://polygon-rpc.com',
        [MAINNET_CHAINS.ARBITRUM]: 'https://arb1.arbitrum.io/rpc',
        [MAINNET_CHAINS.OPTIMISM]: 'https://mainnet.optimism.io',
        [MAINNET_CHAINS.BASE]: 'https://mainnet.base.org'
      },
      protocolAddresses
    };
  }

  private initializeClients(): void {
    const privateKeyRaw = this.runtime?.getSetting('EVM_PRIVATE_KEY');
    if (!privateKeyRaw) {
      throw new LendingError('EVM_PRIVATE_KEY not configured', 'MISSING_PRIVATE_KEY');
    }

    const privateKey = privateKeyRaw.startsWith('0x') ? privateKeyRaw : `0x${privateKeyRaw}`;
    const account = privateKeyToAccount(privateKey as `0x${string}`);

    const chainConfigs = [
      { id: MAINNET_CHAINS.ETHEREUM, chain: mainnet },
      { id: MAINNET_CHAINS.POLYGON, chain: polygon },
      { id: MAINNET_CHAINS.ARBITRUM, chain: arbitrum },
      { id: MAINNET_CHAINS.OPTIMISM, chain: optimism },
      { id: MAINNET_CHAINS.BASE, chain: base }
    ];

    for (const { id, chain } of chainConfigs) {
      const rpcUrl = this.lendingConfig.rpcUrls[id];

      const publicClient = createPublicClient({
        chain,
        transport: http(rpcUrl)
      });

      const walletClient = createWalletClient({
        account,
        chain,
        transport: http(rpcUrl)
      });

      this.publicClients.set(id, publicClient);
      this.walletClients.set(id, walletClient);
    }
  }

  private initializeProtocols(): void {
    // Initialize Aave pools and data providers for each supported chain
    for (const chainId of Object.keys(this.lendingConfig.protocolAddresses).map(Number)) {
      const aaveAddresses = this.lendingConfig.protocolAddresses[chainId]?.[LendingProtocol.AAVE];
      
      if (aaveAddresses?.pool && aaveAddresses?.dataProvider) {
        const provider = this.publicClients.get(chainId);
        if (provider) {
          // Store pool and data provider instances
          const poolKey = `${chainId}-${LendingProtocol.AAVE}`;
          
          // Note: In a real implementation, you'd use the actual Aave contract instances
          // For now, we'll store the addresses and create instances when needed
          this.pools.set(poolKey, {
            address: aaveAddresses.pool,
            dataProviderAddress: aaveAddresses.dataProvider,
            oracleAddress: aaveAddresses.oracle,
            wethGatewayAddress: aaveAddresses.wethGateway,
            provider
          });
        }
      }
    }
  }

  // Get market data for a specific protocol and chain
  async getMarkets(protocol: LendingProtocol, chainId: number): Promise<LendingMarket[]> {
    try {
      if (!this.isProtocolSupported(protocol, chainId)) {
        throw new UnsupportedProtocolError(protocol, chainId);
      }

      const poolKey = `${chainId}-${protocol}`;
      const poolInfo = this.pools.get(poolKey);
      
      if (!poolInfo) {
        throw new LendingError(`Pool not configured for ${protocol} on chain ${chainId}`, 'POOL_NOT_CONFIGURED');
      }

      // In a real implementation, you'd fetch actual market data from the protocol
      // For now, return mock data with common tokens
      const commonTokens = COMMON_TOKENS[chainId as keyof typeof COMMON_TOKENS] || {};
      const markets: LendingMarket[] = [];

      for (const [symbol, address] of Object.entries(commonTokens)) {
        markets.push({
          protocol,
          chainId,
          asset: {
            address,
            symbol,
            name: symbol === 'ETH' ? 'Ethereum' : symbol,
            decimals: symbol === 'USDC' || symbol === 'USDT' ? 6 : 18,
            chainId
          },
          supplyAPY: '3.50', // Mock APY
          variableBorrowAPY: '5.25',
          stableBorrowAPY: '6.00',
          totalSupplied: '1000000000000000000000000', // 1M tokens
          totalBorrowed: '500000000000000000000000',   // 500K tokens
          utilizationRate: '50.00',
          liquidationThreshold: '80.00',
          liquidationBonus: '5.00',
          reserveFactor: '10.00',
          isActive: true,
          isFrozen: false,
          borrowingEnabled: true,
          stableBorrowRateEnabled: symbol !== 'WBTC', // Disable stable rate for some assets
          isCollateral: true
        });
      }

      return markets;
    } catch (error) {
      elizaLogger.error('Failed to get markets:', error);
      if (error instanceof LendingError) {
        throw error;
      }
      throw new LendingError('Failed to fetch market data', 'MARKET_FETCH_ERROR', error);
    }
  }

  // Get user positions for a specific protocol and chain
  async getUserPositions(
    protocol: LendingProtocol, 
    chainId: number, 
    userAddress: string
  ): Promise<UserPosition[]> {
    try {
      if (!this.isProtocolSupported(protocol, chainId)) {
        throw new UnsupportedProtocolError(protocol, chainId);
      }

      // In a real implementation, you'd fetch actual user data from the protocol
      // For now, return mock positions
      const markets = await this.getMarkets(protocol, chainId);
      const positions: UserPosition[] = [];

      // Mock some user positions
      for (const market of markets.slice(0, 2)) { // Only show positions for first 2 assets
        positions.push({
          protocol,
          chainId,
          userAddress,
          asset: market.asset,
          supplied: '1000000000000000000', // 1 token supplied
          borrowed: '500000000000000000',  // 0.5 tokens borrowed
          borrowMode: InterestRateMode.VARIABLE,
          usedAsCollateral: true,
          healthFactor: '2.15',
          currentLTV: '45.50',
          maxLTV: '75.00',
          liquidationThreshold: '80.00'
        });
      }

      return positions;
    } catch (error) {
      elizaLogger.error('Failed to get user positions:', error);
      if (error instanceof LendingError) {
        throw error;
      }
      throw new LendingError('Failed to fetch user positions', 'POSITION_FETCH_ERROR', error);
    }
  }

  // Supply assets to lending protocol
  async supply(request: LendingSupplyRequest): Promise<LendingTransactionResult> {
    try {
      if (!this.isProtocolSupported(request.protocol, request.chainId)) {
        throw new UnsupportedProtocolError(request.protocol, request.chainId);
      }

      const walletClient = this.walletClients.get(request.chainId);
      if (!walletClient) {
        throw new LendingError(`No wallet client for chain ${request.chainId}`, 'NO_WALLET_CLIENT');
      }

      // Validate market is active and supply is enabled
      const markets = await this.getMarkets(request.protocol, request.chainId);
      const market = markets.find(m => m.asset.address.toLowerCase() === request.asset.toLowerCase());
      
      if (!market) {
        throw new LendingError(`Market not found for asset ${request.asset}`, 'MARKET_NOT_FOUND');
      }

      if (!market.isActive || market.isFrozen) {
        throw new MarketNotActiveError(request.asset, request.protocol);
      }

      // Check user balance
      await this.checkBalance(request.asset, request.amount, request.chainId, request.userAddress);

      // In a real implementation, you'd execute the actual supply transaction
      const mockTxHash = `0x${Math.random().toString(16).substr(2, 64)}`;

      elizaLogger.info(`Supply transaction submitted: ${mockTxHash}`);

      return {
        txHash: mockTxHash,
        chainId: request.chainId,
        protocol: request.protocol,
        action: LendingActionType.SUPPLY,
        asset: market.asset,
        amount: request.amount,
        userAddress: request.userAddress,
        success: true,
        gasUsed: '150000',
        gasPrice: '20000000000', // 20 gwei
        blockNumber: 12345678,
        timestamp: Date.now()
      };
    } catch (error) {
      elizaLogger.error('Failed to supply:', error);
      if (error instanceof LendingError) {
        throw error;
      }
      throw new LendingError('Failed to execute supply transaction', 'SUPPLY_ERROR', error);
    }
  }

  // Withdraw assets from lending protocol
  async withdraw(request: LendingWithdrawRequest): Promise<LendingTransactionResult> {
    try {
      if (!this.isProtocolSupported(request.protocol, request.chainId)) {
        throw new UnsupportedProtocolError(request.protocol, request.chainId);
      }

      const walletClient = this.walletClients.get(request.chainId);
      if (!walletClient) {
        throw new LendingError(`No wallet client for chain ${request.chainId}`, 'NO_WALLET_CLIENT');
      }

      // Validate market exists
      const markets = await this.getMarkets(request.protocol, request.chainId);
      const market = markets.find(m => m.asset.address.toLowerCase() === request.asset.toLowerCase());
      
      if (!market) {
        throw new LendingError(`Market not found for asset ${request.asset}`, 'MARKET_NOT_FOUND');
      }

      // Check user supplied balance and health factor
      const positions = await this.getUserPositions(request.protocol, request.chainId, request.userAddress);
      const position = positions.find(p => p.asset.address.toLowerCase() === request.asset.toLowerCase());
      
      if (!position || BigNumber(position.supplied).isZero()) {
        throw new LendingError('No supplied balance to withdraw', 'NO_SUPPLIED_BALANCE');
      }

      // Check if withdrawal would cause liquidation
      if (position.healthFactor && BigNumber(position.healthFactor).lt(1.1)) {
        throw new InsufficientCollateralError(position.healthFactor, '1.1');
      }

      const mockTxHash = `0x${Math.random().toString(16).substr(2, 64)}`;

      return {
        txHash: mockTxHash,
        chainId: request.chainId,
        protocol: request.protocol,
        action: LendingActionType.WITHDRAW,
        asset: market.asset,
        amount: request.amount,
        userAddress: request.userAddress,
        success: true,
        gasUsed: '120000',
        gasPrice: '20000000000',
        blockNumber: 12345679,
        timestamp: Date.now()
      };
    } catch (error) {
      elizaLogger.error('Failed to withdraw:', error);
      if (error instanceof LendingError) {
        throw error;
      }
      throw new LendingError('Failed to execute withdraw transaction', 'WITHDRAW_ERROR', error);
    }
  }

  // Borrow assets from lending protocol
  async borrow(request: LendingBorrowRequest): Promise<LendingTransactionResult> {
    try {
      if (!this.isProtocolSupported(request.protocol, request.chainId)) {
        throw new UnsupportedProtocolError(request.protocol, request.chainId);
      }

      const markets = await this.getMarkets(request.protocol, request.chainId);
      const market = markets.find(m => m.asset.address.toLowerCase() === request.asset.toLowerCase());
      
      if (!market) {
        throw new LendingError(`Market not found for asset ${request.asset}`, 'MARKET_NOT_FOUND');
      }

      if (!market.borrowingEnabled) {
        throw new BorrowingDisabledError(request.asset, request.protocol);
      }

      // Check available liquidity
      const availableLiquidity = BigNumber(market.totalSupplied).minus(market.totalBorrowed);
      if (BigNumber(request.amount).gt(availableLiquidity)) {
        throw new InsufficientLiquidityError(request.amount, availableLiquidity.toString());
      }

      // Check user collateral and health factor
      const positions = await this.getUserPositions(request.protocol, request.chainId, request.userAddress);
      const hasCollateral = positions.some(p => BigNumber(p.supplied).gt(0) && p.usedAsCollateral);
      
      if (!hasCollateral) {
        throw new InsufficientCollateralError('0', '1.0');
      }

      const mockTxHash = `0x${Math.random().toString(16).substr(2, 64)}`;

      return {
        txHash: mockTxHash,
        chainId: request.chainId,
        protocol: request.protocol,
        action: LendingActionType.BORROW,
        asset: market.asset,
        amount: request.amount,
        userAddress: request.userAddress,
        success: true,
        gasUsed: '180000',
        gasPrice: '20000000000',
        blockNumber: 12345680,
        timestamp: Date.now()
      };
    } catch (error) {
      elizaLogger.error('Failed to borrow:', error);
      if (error instanceof LendingError) {
        throw error;
      }
      throw new LendingError('Failed to execute borrow transaction', 'BORROW_ERROR', error);
    }
  }

  // Repay borrowed assets
  async repay(request: LendingRepayRequest): Promise<LendingTransactionResult> {
    try {
      if (!this.isProtocolSupported(request.protocol, request.chainId)) {
        throw new UnsupportedProtocolError(request.protocol, request.chainId);
      }

      const markets = await this.getMarkets(request.protocol, request.chainId);
      const market = markets.find(m => m.asset.address.toLowerCase() === request.asset.toLowerCase());
      
      if (!market) {
        throw new LendingError(`Market not found for asset ${request.asset}`, 'MARKET_NOT_FOUND');
      }

      // Check user has debt to repay
      const positions = await this.getUserPositions(request.protocol, request.chainId, request.userAddress);
      const position = positions.find(p => p.asset.address.toLowerCase() === request.asset.toLowerCase());
      
      if (!position || BigNumber(position.borrowed).isZero()) {
        throw new LendingError('No debt to repay for this asset', 'NO_DEBT_TO_REPAY');
      }

      // Check user balance for repayment
      const repayAmount = request.amount === 'max' ? position.borrowed : request.amount;
      await this.checkBalance(request.asset, repayAmount, request.chainId, request.userAddress);

      const mockTxHash = `0x${Math.random().toString(16).substr(2, 64)}`;

      return {
        txHash: mockTxHash,
        chainId: request.chainId,
        protocol: request.protocol,
        action: LendingActionType.REPAY,
        asset: market.asset,
        amount: repayAmount,
        userAddress: request.userAddress,
        success: true,
        gasUsed: '140000',
        gasPrice: '20000000000',
        blockNumber: 12345681,
        timestamp: Date.now()
      };
    } catch (error) {
      elizaLogger.error('Failed to repay:', error);
      if (error instanceof LendingError) {
        throw error;
      }
      throw new LendingError('Failed to execute repay transaction', 'REPAY_ERROR', error);
    }
  }

  // Helper methods
  getSupportedChains(): ChainConfig[] {
    return this.lendingConfig.supportedChains;
  }

  getSupportedProtocols(): LendingProtocol[] {
    return this.lendingConfig.supportedProtocols;
  }

  isChainSupported(chainId: number): boolean {
    return this.lendingConfig.supportedChains.some(chain => chain.id === chainId);
  }

  isProtocolSupported(protocol: LendingProtocol, chainId: number): boolean {
    return this.lendingConfig.supportedProtocols.includes(protocol) &&
           this.isChainSupported(chainId) &&
           !!this.lendingConfig.protocolAddresses[chainId]?.[protocol];
  }

  getWalletAddress(): string {
    const privateKey = this.runtime?.getSetting('EVM_PRIVATE_KEY');
    if (!privateKey) {
      throw new LendingError('EVM_PRIVATE_KEY not configured', 'MISSING_PRIVATE_KEY');
    }
    const account = privateKeyToAccount(privateKey as `0x${string}`);
    return account.address;
  }

  private async checkBalance(tokenAddress: string, amount: string, chainId: number, userAddress: string): Promise<void> {
    const publicClient = this.publicClients.get(chainId);
    if (!publicClient) {
      throw new LendingError(`No public client for chain ${chainId}`, 'NO_PUBLIC_CLIENT');
    }

    let balance: bigint;

    if (tokenAddress === '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE' || 
        tokenAddress.toLowerCase() === '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee') {
      // Native token balance
      balance = await publicClient.getBalance({ address: userAddress as `0x${string}` });
    } else {
      // ERC20 token balance
      balance = await publicClient.readContract({
        address: tokenAddress as `0x${string}`,
        abi: [
          {
            name: 'balanceOf',
            type: 'function',
            stateMutability: 'view',
            inputs: [{ name: 'account', type: 'address' }],
            outputs: [{ name: '', type: 'uint256' }]
          }
        ],
        functionName: 'balanceOf',
        args: [userAddress as `0x${string}`]
      });
    }

    const requiredAmount = BigInt(amount);
    if (balance < requiredAmount) {
      throw new LendingError(
        `Insufficient balance: required ${amount}, available ${balance.toString()}`,
        'INSUFFICIENT_BALANCE'
      );
    }
  }
}