import {
  type IAgentRuntime,
  Service,
  logger,
  IWalletService,
  WalletPortfolio,
  WalletAsset,
  ServiceType,
} from '@elizaos/core';
import { CACHE_REFRESH_INTERVAL_MS, EVM_WALLET_DATA_CACHE_KEY } from './constants';
import { type WalletProvider, initWalletProvider } from './providers/wallet';
import type { SupportedChain } from './types';
import { parseEther, formatEther } from 'viem';
import { WalletBalanceService } from './services/WalletBalanceService';

export interface EVMWalletData {
  address: string;
  chains: {
    chainName: string;
    name: string;
    balance: string;
    symbol: string;
    chainId: number;
  }[];
  timestamp: number;
}

export class EVMService extends IWalletService {
  static serviceType = ServiceType.WALLET;

  private walletProvider: WalletProvider | null = null;
  private refreshInterval: NodeJS.Timeout | null = null;
  private lastRefreshTimestamp = 0;
  private walletBalanceService: WalletBalanceService;

  constructor(protected runtime: IAgentRuntime) {
    super();
    this.walletBalanceService = new WalletBalanceService(runtime);
  }

  static async start(runtime: IAgentRuntime): Promise<EVMService> {
    logger.log('Initializing EVMService');

    const evmService = new EVMService(runtime);

    // Initialize wallet provider
    evmService.walletProvider = await initWalletProvider(runtime);

    // Fetch data immediately on initialization
    await evmService.refreshWalletData();

    // Set up refresh interval
    if (evmService.refreshInterval) {
      clearInterval(evmService.refreshInterval);
    }

    evmService.refreshInterval = setInterval(
      () => evmService.refreshWalletData(),
      CACHE_REFRESH_INTERVAL_MS,
    );

    logger.log('EVM service initialized');
    return evmService;
  }

  static async stop(runtime: IAgentRuntime) {
    const service = runtime.getService(ServiceType.WALLET);
    if (!service) {
      logger.error('EVMService not found');
      return;
    }
    await service.stop();
  }

  async stop(): Promise<void> {
    if (this.refreshInterval) {
      clearInterval(this.refreshInterval);
      this.refreshInterval = null;
    }
    logger.log('EVM service shutdown');
  }

  async refreshWalletData(): Promise<void> {
    try {
      if (!this.walletProvider) {
        this.walletProvider = await initWalletProvider(this.runtime);
      }

      const address = this.walletProvider.getAddress();
      const balances = await this.walletProvider.getWalletBalances();

      // Format balances for all chains
      const chainDetails = Object.entries(balances)
        .map(([chainName, balance]) => {
          try {
            const chainConfig = this.walletProvider!.getChainConfigs(chainName as any);
            return {
              chainName,
              balance,
              symbol: chainConfig.nativeCurrency.symbol,
              chainId: chainConfig.id,
              name: chainConfig.name,
            };
          } catch (error) {
            logger.error(`Error formatting chain ${chainName}:`, error);
            return null;
          }
        })
        .filter(Boolean);

      const walletData: EVMWalletData = {
        address,
        chains: chainDetails as EVMWalletData['chains'],
        timestamp: Date.now(),
      };

      // Cache the wallet data
      await this.runtime.setCache(EVM_WALLET_DATA_CACHE_KEY, walletData);
      this.lastRefreshTimestamp = walletData.timestamp;

      logger.log(
        'EVM wallet data refreshed for chains:',
        chainDetails.map((c) => c?.chainName).join(', '),
      );
    } catch (error) {
      logger.error('Error refreshing EVM wallet data:', error);
    }
  }

  async getCachedData(): Promise<EVMWalletData | undefined> {
    try {
      const cachedData = await this.runtime.getCache<EVMWalletData>(EVM_WALLET_DATA_CACHE_KEY);

      const now = Date.now();
      // If data is stale or doesn't exist, refresh it
      if (!cachedData || now - cachedData.timestamp > CACHE_REFRESH_INTERVAL_MS) {
        logger.log('EVM wallet data is stale, refreshing...');
        await this.refreshWalletData();
        const refreshedData = await this.runtime.getCache<EVMWalletData>(EVM_WALLET_DATA_CACHE_KEY);
        return refreshedData || undefined;
      }

      return cachedData;
    } catch (error) {
      logger.error('Error getting cached EVM wallet data:', error);
      return undefined;
    }
  }

  async forceUpdate(): Promise<EVMWalletData | undefined> {
    await this.refreshWalletData();
    return this.getCachedData();
  }

  // IWalletService implementation
  async getPortfolio(owner?: string): Promise<WalletPortfolio> {
    const cachedData = await this.getCachedData();
    if (!cachedData) {
      return { totalValueUsd: 0, assets: [] };
    }

    // For EVM, we currently only track native tokens per chain
    // A full implementation would include ERC20 tokens
    const assets: WalletAsset[] = cachedData.chains.map((chain) => ({
      address: '0x0000000000000000000000000000000000000000', // Native token address
      symbol: chain.symbol,
      balance: chain.balance,
      decimals: 18, // Most EVM chains use 18 decimals for native tokens
      quantity: parseFloat(chain.balance),
      assetAddress: '0x0000000000000000000000000000000000000000',
    }));

    // TODO: Calculate USD values when price data is available
    const totalValueUsd = 0;

    return {
      totalValueUsd,
      assets,
    };
  }

  async getBalance(assetAddress: string, owner?: string): Promise<number> {
    const cachedData = await this.getCachedData();
    if (!cachedData) {
      return 0;
    }

    // If asking for native token balance (0x0 address), sum all chains
    if (
      assetAddress === '0x0000000000000000000000000000000000000000' ||
      assetAddress.toLowerCase() === 'eth'
    ) {
      return cachedData.chains.reduce((sum, chain) => {
        if (chain.symbol.toUpperCase() === 'ETH') {
          return sum + parseFloat(chain.balance);
        }
        return sum;
      }, 0);
    }

    // For other assets, would need to implement ERC20 balance checking
    // This is a simplified implementation
    return 0;
  }

  async transferSol(from: any, to: any, lamports: number): Promise<string> {
    // This is specific to Solana, but we need to implement it for interface compliance
    // For EVM, we would convert this to an ETH transfer
    throw new Error('transferSol is not supported for EVM. Use transfer action instead.');
  }

  // EVM-specific helper methods
  getWalletProvider(): WalletProvider | null {
    return this.walletProvider;
  }

  async getAddress(): Promise<string> {
    if (!this.walletProvider) {
      this.walletProvider = await initWalletProvider(this.runtime);
    }
    return this.walletProvider.getAddress();
  }

  // Add getter for WalletBalanceService
  getWalletBalanceService(): WalletBalanceService {
    return this.walletBalanceService;
  }
}
