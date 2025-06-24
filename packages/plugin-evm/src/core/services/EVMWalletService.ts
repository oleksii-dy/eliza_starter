import {
  IAgentRuntime,
  Service,
  ServiceType,
  logger,
  asUUID,
  WalletPortfolio,
  WalletAsset,
  ModelType,
  Memory,
  State,
  UUID,
} from '@elizaos/core';
import {
  type IWalletService,
  type WalletInstance,
  type WalletCreationParams,
  type WalletImportParams,
  type SmartWalletParams,
  type SessionParams,
  type SessionPermission,
  type SessionKey,
  type TransactionRequest,
  type SimulationResult,
  type GasEstimation,
  type BatchTransactionParams,
  type HistoryParams,
  type TransactionHistory,
  type DefiPosition,
  type NFTHolding,
  type WalletFilter,
} from '../interfaces/IWalletService';
import {
  createPublicClient,
  createWalletClient,
  http,
  type Account,
  type Chain,
  type Hash,
  type Address,
  type PublicClient,
  type WalletClient,
  type Hex,
  parseEther,
  formatEther,
  encodeFunctionData,
  decodeFunctionResult,
  getContract,
  isAddress,
  getAddress,
  type PrivateKeyAccount,
  formatUnits,
} from 'viem';
import {
  privateKeyToAccount,
  generatePrivateKey,
  english,
  generateMnemonic,
  mnemonicToAccount,
} from 'viem/accounts';
import { createWalletDatabaseService, type WalletDatabaseService } from '../database/service';
import { createChainConfigService, type ChainConfigService } from '../chains/config';
import { createEncryptionService, type EncryptionService } from '../security/encryption';
import { createTransactionSimulator } from '../../core/simulation/simulator';
import { createSmartWalletFactory } from '../../wallet/smart-wallet-factory';
import { createSessionManager } from '../../wallet/session-manager';
import { createENSResolver } from '../../utils/ens-resolver';
import { createABIFetcher } from '../../contracts/abi-fetcher';
import { createMulticallService } from '../../utils/multicall';
import { TokenService, createTokenService } from '../../tokens/token-service';
import { createDeFiService } from '../../defi/defi-service';
import { createNFTService } from '../../nft/nft-service';
import { mainnet, polygon, arbitrum, optimism, base, bsc, avalanche } from 'viem/chains';
import { SmartWalletFactory } from '../../wallet/smart-wallet-factory';
import { BridgeAggregator } from '../../bridges/bridge-aggregator';
import type { TokenBalance } from '../database/schema';
import { getPriceService } from '../../oracles/price-service';

export class EVMWalletService extends Service implements IWalletService {
  static serviceName = 'wallet' as const;
  serviceType = ServiceType.WALLET;
  capabilityDescription =
    'Provides standardized access to wallet balances and portfolios.' as const;

  private dbService: any;
  private chainService: any;
  private encryptionService: any;
  private transactionSimulator: any;
  private smartWalletFactory!: SmartWalletFactory;
  private sessionManager: any;
  private ensResolver: any;
  private mevProtection: any;
  private multicall: any;
  private tokenService!: ReturnType<typeof createTokenService>;
  private defiService!: ReturnType<typeof createDeFiService>;
  private nftService!: ReturnType<typeof createNFTService>;
  private bridgeAggregator!: BridgeAggregator;

  private wallets: Map<string, WalletInstance>;
  private publicClients: Map<number, PublicClient>;
  private walletClients: Map<number, WalletClient>;
  private activeWalletId: UUID | null = null;
  private accounts: Map<string, PrivateKeyAccount>;

  constructor(runtime: IAgentRuntime) {
    super(runtime);
    this.wallets = new Map();
    this.publicClients = new Map();
    this.walletClients = new Map();
    this.accounts = new Map();
    // Move service initialization to the initialize method
    // to avoid accessing runtime before it's ready

    // Initialize common chains
    this.initializeChains();
  }

  private initializeChains() {
    const chains = [mainnet, polygon, arbitrum, optimism, base, bsc, avalanche];

    for (const chain of chains) {
      this.publicClients.set(
        chain.id,
        createPublicClient({
          chain,
          transport: http(),
        }) as any,
      );

      this.walletClients.set(
        chain.id,
        createWalletClient({
          chain,
          transport: http(),
        }) as any,
      );
    }
  }

  async initialize(): Promise<void> {
    try {
      // Initialize basic services
      this.dbService = {};
      this.chainService = {};
      this.encryptionService = {};

      // Initialize wallet factory and services
      this.smartWalletFactory = new SmartWalletFactory({
        runtime: this.runtime,
        chainId: 1, // Default to mainnet
      });
      this.bridgeAggregator = new BridgeAggregator();
      this.tokenService = new TokenService(this.runtime);
      this.defiService = createDeFiService();
      this.nftService = createNFTService();

      this.transactionSimulator = {};
      this.sessionManager = {};
      this.ensResolver = {};
      this.mevProtection = {};
      this.multicall = {};

      // Initialize wallets from settings if available
      const defaultPrivateKey = this.runtime.getSetting('EVM_PRIVATE_KEY');
      if (defaultPrivateKey) {
        try {
          const wallet = await this.importWallet({
            privateKey: defaultPrivateKey as `0x${string}`,
            name: 'Default Wallet',
          });
          this.activeWalletId = wallet.id;
        } catch (error) {
          logger.warn('Failed to import default wallet:', error);
        }
      }

      logger.info('EVM Wallet Service initialized');
    } catch (error) {
      logger.error('Failed to initialize EVM Wallet Service:', error);
      throw error;
    }
  }

  private async importDefaultWallet(privateKey: string): Promise<void> {
    try {
      // Check if wallet already exists
      const account = privateKeyToAccount(privateKey as `0x${string}`);
      const existingWallet = await this.dbService.getWalletByAddress(account.address);

      if (existingWallet) {
        this.activeWalletId = existingWallet.id;
        return;
      }

      // Import the wallet
      const wallet = await this.importWallet({
        privateKey: privateKey as `0x${string}`,
        name: 'Default Agent Wallet',
      });

      this.activeWalletId = wallet.id;
      logger.log(`Imported default wallet: ${wallet.address}`);
    } catch (error) {
      logger.error('Failed to import default wallet:', error);
    }
  }

  static async start(runtime: IAgentRuntime): Promise<EVMWalletService> {
    const service = new EVMWalletService(runtime);
    await service.initialize();
    return service;
  }

  async stop(): Promise<void> {
    await this.chainService.cleanup();
    this.walletClients.clear();
    logger.log('EVMWalletService stopped');
  }

  // IWalletService implementation - Multi-wallet management
  async createWallet(params: WalletCreationParams): Promise<WalletInstance> {
    try {
      // Handle EOA wallets
      if (params.type === 'eoa') {
        // Generate new private key
        const privateKey = generatePrivateKey();
        const account = privateKeyToAccount(privateKey);

        const wallet: WalletInstance = {
          id: `wallet-${Date.now()}` as UUID,
          address: account.address,
          type: 'eoa',
          name: params.name || `Wallet ${this.wallets.size + 1}`,
          createdAt: Date.now(),
          lastUsedAt: Date.now(),
          isActive: true,
          chain: params.chain?.id,
          metadata: params.metadata || {},
        };

        // Store wallet and account
        this.wallets.set(wallet.id, wallet);
        this.accounts.set(wallet.id, account);
        this.activeWalletId = wallet.id;

        return wallet;
      }

      // Handle smart wallets
      if (params.type === 'safe' || params.type === 'aa') {
        return await this.smartWalletFactory.deploySmartWallet({
          type: params.type,
          owners: params.owners || [],
          threshold: params.threshold || 1,
          chain: params.chain || mainnet,
        });
      }

      throw new Error(`Unsupported wallet type: ${params.type}`);
    } catch (error) {
      logger.error('Wallet creation failed:', error);
      throw error;
    }
  }

  async importWallet(params: WalletImportParams): Promise<WalletInstance> {
    try {
      let account: Account;
      let privateKey: string | undefined;
      let mnemonic: string | undefined;

      if (params.privateKey) {
        privateKey = params.privateKey;
        account = privateKeyToAccount(params.privateKey);
      } else if (params.mnemonic) {
        mnemonic = params.mnemonic;
        account = mnemonicToAccount(params.mnemonic);
        privateKey = account.address; // The account has the private key internally
      } else if (params.address) {
        // Watch-only wallet
        if (!isAddress(params.address)) {
          throw new Error('Invalid address');
        }

        const wallet: Omit<WalletInstance, 'id'> = {
          address: params.address,
          type: 'eoa', // Assume EOA for watch-only
          name: params.name || 'Watch-only Wallet',
          metadata: { ...params.metadata, watchOnly: true },
          createdAt: Date.now(),
          lastUsedAt: Date.now(),
          isActive: true,
        };

        return await this.dbService.createWallet(wallet);
      } else {
        throw new Error('No private key, mnemonic, or address provided');
      }

      const wallet: Omit<WalletInstance, 'id'> = {
        address: account.address,
        type: 'eoa',
        name: params.name,
        metadata: params.metadata,
        createdAt: Date.now(),
        lastUsedAt: Date.now(),
        isActive: true,
      };

      return await this.dbService.createWallet(wallet, privateKey, mnemonic);
    } catch (error) {
      logger.error('Failed to import wallet:', error);
      throw error;
    }
  }

  async listWallets(filter?: WalletFilter): Promise<WalletInstance[]> {
    return await this.dbService.listWallets(filter);
  }

  async getWallet(walletId: UUID): Promise<WalletInstance | null> {
    return await this.dbService.getWallet(walletId);
  }

  async updateWallet(walletId: UUID, updates: Partial<WalletInstance>): Promise<WalletInstance> {
    return await this.dbService.updateWallet(walletId, updates);
  }

  async deleteWallet(walletId: UUID): Promise<boolean> {
    if (this.activeWalletId === walletId) {
      this.activeWalletId = null;
    }
    return await this.dbService.deleteWallet(walletId);
  }

  async setActiveWallet(walletId: UUID): Promise<void> {
    const wallet = await this.dbService.getWallet(walletId);
    if (!wallet) {
      throw new Error('Wallet not found');
    }
    this.activeWalletId = walletId;

    // Update last used timestamp
    await this.dbService.updateWallet(walletId, { lastUsedAt: Date.now() });
  }

  async getActiveWallet(): Promise<WalletInstance | null> {
    if (!this.activeWalletId) {
      // Try to find any active wallet
      const wallets = await this.dbService.listWallets({ isActive: true });
      if (wallets.length > 0) {
        this.activeWalletId = wallets[0].id;
        return wallets[0];
      }
      return null;
    }
    return await this.dbService.getWallet(this.activeWalletId);
  }

  private async getActiveAddress(): Promise<Address> {
    // Get the first wallet address or create a new one
    const firstWallet = Array.from(this.wallets.values())[0];
    if (firstWallet) {
      return firstWallet.address as Address;
    }

    // Create a new wallet if none exists
    const newWallet = await this.createWallet({
      type: 'eoa',
      chain: mainnet,
    });

    return newWallet.address as Address;
  }

  // Smart wallet support
  async deploySmartWallet(params: SmartWalletParams): Promise<WalletInstance> {
    // Find the owner wallet from the internal map
    const ownerWallet = this.wallets.get(params.owners[0]);

    if (!ownerWallet) {
      throw new Error('Owner wallet not found');
    }

    // Check if we have an account for this owner
    const account = this.accounts.get(params.owners[0]);
    if (!account) {
      throw new Error('Owner account not found');
    }

    const result = await this.smartWalletFactory.deploySmartWallet(params);

    const walletInstance: WalletInstance = {
      id: result.address as UUID, // Use address as ID for smart wallets
      address: result.address,
      type: 'safe',
      name: `${params.type} Wallet`,
      metadata: {
        type: params.type,
        ...result.metadata, // Include metadata from the result which already has deploymentTx
        ...(params as any).metadata,
      },
      createdAt: Date.now(),
      lastUsedAt: Date.now(),
      isActive: true,
      chain: params.chain.id,
      owners: params.owners,
      threshold: params.threshold,
    };

    this.wallets.set(result.address, walletInstance);

    return walletInstance;
  }

  async addOwner(walletAddress: Address, newOwner: Address): Promise<Hash> {
    // TODO: Implement smart wallet owner management
    throw new Error('addOwner not implemented yet');
  }

  async removeOwner(walletAddress: Address, owner: Address): Promise<Hash> {
    // TODO: Implement smart wallet owner management
    throw new Error('removeOwner not implemented yet');
  }

  async changeThreshold(walletAddress: Address, newThreshold: number): Promise<Hash> {
    // TODO: Implement smart wallet threshold management
    throw new Error('changeThreshold not implemented yet');
  }

  async isSmartWallet(address: Address): Promise<boolean> {
    // Check if address is a contract
    const isContract = await this.chainService.isContractDeployed(1, address as `0x${string}`);
    if (!isContract) {
      return false;
    }
    // TODO: Add specific smart wallet detection logic
    return true;
  }

  async getSmartWalletInfo(address: Address): Promise<{
    type: 'safe' | 'aa' | 'unknown';
    owners?: Address[];
    threshold?: number;
    modules?: Address[];
    version?: string;
  }> {
    // TODO: Implement smart wallet info retrieval
    return {
      type: 'unknown',
    };
  }

  // Session management
  async createSession(params: SessionParams): Promise<SessionKey> {
    const wallet = await this.getWallet(params.walletId);
    if (!wallet) {
      throw new Error('Wallet not found');
    }

    const sessionConfig = {
      walletAddress: wallet.address,
      permissions: params.permissions,
      expiresAt: params.expiresAt,
      spendingLimits: params.spendingLimit,
      allowedContracts: params.allowedContracts,
      allowedMethods: params.allowedMethods,
    } as any;

    const session = await this.sessionManager.createSession(sessionConfig);

    // Convert WalletSession to SessionKey
    const sessionKey: SessionKey = {
      id: session.id,
      publicKey: session.sessionKey as Hex,
      permissions: params.permissions,
      expiresAt: session.expiresAt,
      createdAt: session.createdAt,
      isActive: session.isActive,
      usageCount: 0,
      lastUsedAt: session.lastUsedAt,
    };

    return sessionKey;
  }

  async getSession(sessionId: UUID): Promise<SessionKey | null> {
    // Get from database instead
    return await this.dbService.getSession(sessionId);
  }

  async listSessions(walletId?: UUID): Promise<SessionKey[]> {
    // Get from database instead
    return await this.dbService.listSessions(walletId);
  }

  async validateSession(sessionId: UUID, action: SessionPermission): Promise<boolean> {
    const validation = await this.sessionManager.validateSession(sessionId, action.action);
    return validation.isValid;
  }

  async updateSession(sessionId: UUID, updates: Partial<SessionKey>): Promise<SessionKey> {
    // Update in database instead
    return await this.dbService.updateSession(sessionId, updates);
  }

  async revokeSession(sessionId: UUID): Promise<void> {
    return await this.sessionManager.revokeSession(sessionId);
  }

  async revokeAllSessions(walletId?: UUID): Promise<void> {
    if (walletId) {
      const sessions = await this.listSessions(walletId);
      for (const session of sessions) {
        await this.revokeSession(session.id);
      }
    }
  }

  // Advanced transaction features
  async simulateTransaction(
    tx: TransactionRequest,
    options?: {
      includeTrace?: boolean;
      includeLogs?: boolean;
      forkBlock?: number;
    },
  ): Promise<SimulationResult> {
    return await this.transactionSimulator.simulate(tx, options);
  }

  async estimateGasWithBuffer(
    tx: TransactionRequest,
    bufferPercent: number = 10,
  ): Promise<GasEstimation> {
    const wallet = await this.getActiveWallet();
    if (!wallet) {
      throw new Error('No active wallet');
    }

    const chainId = tx.chainId || wallet.chain || 1;
    const client = this.chainService.getPublicClient(chainId);

    // Estimate gas
    const gasLimit = await client.estimateGas({
      account: tx.from || wallet.address,
      to: tx.to,
      value: tx.value,
      data: tx.data,
    });

    // Get gas price
    const gasPrice = await this.chainService.getGasPrice(chainId);

    // Apply buffer
    const bufferedGasLimit = (gasLimit * BigInt(100 + bufferPercent)) / 100n;

    // Calculate costs
    let estimatedCost: bigint;
    if (gasPrice.maxFeePerGas) {
      estimatedCost = bufferedGasLimit * gasPrice.maxFeePerGas;
    } else {
      estimatedCost = bufferedGasLimit * gasPrice.gasPrice!;
    }

    // Get USD price using price oracle
    const priceService = getPriceService();
    const nativeTokenPrice = await priceService.getNativeTokenPriceUSD(chainId);
    const estimatedCostETH = Number(formatEther(estimatedCost));
    const estimatedCostUSD = estimatedCostETH * nativeTokenPrice;

    return {
      gasLimit: bufferedGasLimit,
      baseFee:
        gasPrice.maxFeePerGas && gasPrice.maxPriorityFeePerGas
          ? BigInt(gasPrice.maxFeePerGas) - BigInt(gasPrice.maxPriorityFeePerGas)
          : 0n,
      priorityFee: gasPrice.maxPriorityFeePerGas || 0n,
      maxFee: gasPrice.maxFeePerGas || gasPrice.gasPrice!,
      estimatedCost,
      estimatedCostUSD,
    };
  }

  async sendTransaction(
    tx: TransactionRequest,
    options?: {
      waitForConfirmation?: boolean;
      confirmations?: number;
      sessionId?: UUID;
    },
  ): Promise<Hash> {
    const wallet = await this.getActiveWallet();
    if (!wallet) {
      throw new Error('No active wallet');
    }

    // Validate session if provided
    if (options?.sessionId) {
      const session = await this.getSession(options.sessionId);
      if (!session || !session.isActive) {
        throw new Error('Session validation failed');
      }
      // TODO: Add more sophisticated session validation
    }

    // Get wallet client
    const chainId = tx.chainId || wallet.chain || 1;
    const walletClient = await this.getWalletClient(wallet.id, chainId);

    // Prepare transaction
    const preparedTx: any = {
      to: tx.to,
      value: tx.value,
      data: tx.data,
      gas: tx.gas,
      nonce: tx.nonce,
    };

    // Add gas parameters based on what's provided
    if (tx.gasPrice) {
      preparedTx.gasPrice = tx.gasPrice;
    } else if (tx.maxFeePerGas) {
      preparedTx.maxFeePerGas = tx.maxFeePerGas;
      preparedTx.maxPriorityFeePerGas = tx.maxPriorityFeePerGas;
    }

    // Send transaction
    const hash = await walletClient.sendTransaction(preparedTx);

    // Save to history
    await this.dbService.saveTransaction(
      {
        hash,
        from: wallet.address,
        to: tx.to,
        value: tx.value || 0n,
        data: tx.data,
        blockNumber: 0, // Will be updated when confirmed
        timestamp: Date.now(),
        gasUsed: 0n, // Will be updated when confirmed
        gasPrice: tx.gasPrice || tx.maxFeePerGas || 0n,
        status: 'pending',
        chainId,
      },
      wallet.id,
      options?.sessionId,
    );

    // Wait for confirmation if requested
    if (options?.waitForConfirmation) {
      await this.chainService.waitForTransaction(chainId, hash, options.confirmations);
    }

    return hash;
  }

  async sendBatchTransaction(params: BatchTransactionParams): Promise<Hash[]> {
    const wallet = await this.getActiveWallet();
    if (!wallet) {
      throw new Error('No active wallet');
    }

    // Check if wallet supports batching
    const isSmartWallet = await this.isSmartWallet(wallet.address);
    if (!isSmartWallet && params.atomicity === 'all-or-nothing') {
      throw new Error('Atomic batch transactions require a smart wallet');
    }

    if (isSmartWallet) {
      // TODO: Implement smart wallet batching
      const hashes: Hash[] = [];
      for (const tx of params.transactions) {
        try {
          const hash = await this.sendTransaction(tx);
          hashes.push(hash);
        } catch (error) {
          if (params.atomicity === 'all-or-nothing') {
            throw error;
          }
          logger.error('Batch transaction failed:', error);
        }
      }
      return hashes;
    } else {
      // Send transactions sequentially
      const hashes: Hash[] = [];
      for (const tx of params.transactions) {
        try {
          const hash = await this.sendTransaction(tx);
          hashes.push(hash);
        } catch (error) {
          if (params.atomicity === 'all-or-nothing') {
            throw error;
          }
          logger.error('Batch transaction failed:', error);
        }
      }
      return hashes;
    }
  }

  async getTransactionHistory(params: HistoryParams): Promise<TransactionHistory[]> {
    return await this.dbService.getTransactionHistory(
      params.wallet,
      params.chains,
      params.limit,
      params.offset,
    );
  }

  async getTransactionReceipt(hash: Hash, chain?: Chain): Promise<any> {
    const chainId = chain?.id || 1;
    const client = this.chainService.getPublicClient(chainId);
    return await client.getTransactionReceipt({ hash });
  }

  // DeFi and NFT positions
  async getDefiPositions(wallet: Address, chains?: Chain[]): Promise<DefiPosition[]> {
    const walletAddress = wallet.toString().toLowerCase();
    const chainIds = chains?.map((c) => c.id) || [1, 137, 42161, 10, 8453];

    // Fetch positions from all chains
    const positionPromises = chainIds.map(async (chainId) => {
      try {
        const chain = this.getChainById(chainId);
        if (!chain) {
          return [];
        }

        // Pass chainIds as array instead of single chainId
        const positions = await this.defiService.getPositions(walletAddress as Address, [chainId]);

        return positions.map((pos) => ({
          protocol: pos.protocol,
          protocolId: pos.protocolId,
          chain,
          type: pos.type,
          positions:
            pos.tokens?.map((token) => ({
              tokenAddress: token.address,
              tokenSymbol: token.symbol,
              amount: BigInt(token.amount),
              valueUSD: token.valueUsd || 0,
              apy: undefined,
            })) || [],
          totalValueUSD: pos.totalValueUsd || 0,
          claimableRewards: pos.rewards?.map((reward) => ({
            tokenAddress: reward.token,
            tokenSymbol: reward.symbol,
            amount: BigInt(reward.amount),
            valueUSD: reward.valueUsd,
          })),
        }));
      } catch (error) {
        logger.warn(`Failed to fetch DeFi positions for chain ${chainId}:`, error);
        return [];
      }
    });

    const results = await Promise.all(positionPromises);
    return results.flat();
  }

  async getAllDefiPositions(
    wallet: WalletInstance | string,
    chainIds?: number[],
  ): Promise<DefiPosition[]> {
    const walletAddress = typeof wallet === 'string' ? wallet : wallet.address;
    const chains = (chainIds?.map((id) => this.getChainById(id)).filter(Boolean) as Chain[]) || [];
    return this.getDefiPositions(walletAddress as Address, chains);
  }

  async getNFTHoldings(wallet: Address, chains?: Chain[]): Promise<NFTHolding[]> {
    const walletAddress = wallet;
    const chainIds = chains?.map((c) => c.id) || Array.from(this.publicClients.keys());

    const holdings = await this.nftService.getNFTHoldings(walletAddress as Address, chainIds);

    // Map NFT service holdings to IWalletService NFTHolding interface
    return holdings.map((holding) => ({
      contractAddress: holding.contractAddress,
      tokenId: holding.tokenId,
      name: holding.name,
      description: holding.description,
      imageUrl: holding.imageUrl,
      animationUrl: holding.animationUrl,
      attributes: holding.attributes,
      chain: this.getChainById(holding.chain as any) || mainnet,
      owner: walletAddress,
      collection: holding.collection
        ? {
          name: holding.collection.name,
          slug: holding.collection.slug || '',
          imageUrl: holding.collection.imageUrl,
          floorPrice: holding.collection.floorPrice,
        }
        : undefined,
    }));
  }

  private getChainById(chainId: number): Chain | undefined {
    const chainMapping: Record<number, Chain> = {
      1: mainnet,
      137: polygon,
      42161: arbitrum,
      10: optimism,
      8453: base,
      56: bsc,
      43114: avalanche,
    };

    return chainMapping[chainId];
  }

  async getWalletChain(address: string): Promise<Chain | undefined> {
    const wallet = this.wallets.get(address);
    if (!wallet?.metadata?.chainId) {
      return mainnet; // Default to mainnet
    }

    return this.getChainById(wallet.metadata.chainId);
  }

  // Enhanced portfolio features
  async getPortfolioValue(
    wallet: Address,
    chains?: Chain[],
  ): Promise<{
    totalValueUSD: number;
    breakdown: {
      tokens: number;
      defi: number;
      nfts: number;
    };
    change24h: {
      amount: number;
      percent: number;
    };
  }> {
    // Get token balances
    // TODO: Implement getTotalValue method in TokenService
    const tokenValue = 0;

    // Get DeFi positions
    const defiPositions = await this.getAllDefiPositions(
      wallet,
      chains?.map((c) => c.id),
    );
    const defiValue = defiPositions.reduce((sum, pos) => sum + pos.totalValueUSD, 0);

    // Get NFT values
    const nftHoldings = await this.getNFTHoldings(wallet, chains);
    const nftValue = nftHoldings.reduce((sum, nft) => sum + (nft.collection?.floorPrice || 0), 0);

    const totalValueUSD = tokenValue + defiValue + nftValue;

    // TODO: Implement 24h change tracking
    return {
      totalValueUSD,
      breakdown: {
        tokens: tokenValue,
        defi: defiValue,
        nfts: nftValue,
      },
      change24h: {
        amount: 0,
        percent: 0,
      },
    };
  }

  // Gas and network optimization
  async getOptimalGasPrice(chain: Chain): Promise<{
    slow: bigint;
    standard: bigint;
    fast: bigint;
    instant: bigint;
  }> {
    const client = this.chainService.getPublicClient(chain.id);
    const gasPrice = await client.getGasPrice();

    // Calculate different speed options
    return {
      slow: (gasPrice * 80n) / 100n, // 80% of current
      standard: gasPrice, // Current gas price
      fast: (gasPrice * 120n) / 100n, // 120% of current
      instant: (gasPrice * 150n) / 100n, // 150% of current
    };
  }

  async estimateTransactionTime(gasPrice: bigint, chain: Chain): Promise<number> {
    // Simplified estimation based on gas price
    const currentGasPrice = await this.chainService.getPublicClient(chain.id).getGasPrice();

    if (gasPrice >= (currentGasPrice * 150n) / 100n) {
      return 15; // 15 seconds for instant
    } else if (gasPrice >= (currentGasPrice * 120n) / 100n) {
      return 30; // 30 seconds for fast
    } else if (gasPrice >= currentGasPrice) {
      return 60; // 1 minute for standard
    } else {
      return 300; // 5 minutes for slow
    }
  }

  // Utility methods
  async isContract(address: Address, chain?: Chain): Promise<boolean> {
    const chainId = chain?.id || 1;
    return await this.chainService.isContractDeployed(chainId, address as `0x${string}`);
  }

  async getENSName(address: Address): Promise<string | null> {
    return await this.ensResolver.resolveName(address);
  }

  async resolveENS(name: string): Promise<Address | null> {
    return await this.ensResolver.resolveAddress(name);
  }

  // IWalletService base methods
  async getPortfolio(owner?: string): Promise<WalletPortfolio> {
    const wallet = await this.getActiveWallet();
    if (!wallet) {
      throw new Error('No active wallet');
    }

    const address = owner || wallet.address;
    const chainId = wallet.chain || 1;

    // Get token balances from database
    const tokens = await this.dbService.getTokenBalances(address, chainId);

    // Map database TokenBalance to WalletAsset
    const assets: WalletAsset[] = tokens.map((token: any) => ({
      address: token.tokenAddress,
      symbol: token.tokenSymbol,
      balance: token.balance.toString(),
      decimals: token.tokenDecimals,
      quantity: Number(formatUnits(token.balance, token.tokenDecimals)),
      assetAddress: token.tokenAddress,
    }));

    const portfolio = await this.getPortfolioValue(address as Address);

    return {
      totalValueUsd: portfolio.totalValueUSD,
      assets,
    };
  }

  async getBalance(assetAddress: string, owner?: string): Promise<number> {
    const address = owner || (await this.getActiveAddress());
    if (!isAddress(address)) {
      throw new Error('Invalid address');
    }

    // Check if asking for native token
    if (
      assetAddress === '0x0000000000000000000000000000000000000000' ||
      assetAddress.toLowerCase() === 'eth'
    ) {
      const wallet = await this.getActiveWallet();
      const chainId = wallet?.chain || 1;
      const client = this.chainService.getPublicClient(chainId);
      const balance = await client.getBalance({ address: address as Address });
      return Number(formatEther(balance));
    }

    // Get ERC20 balance
    const wallet = await this.getActiveWallet();
    const chainId = wallet?.chain || 1;
    const tokenBalance = await this.tokenService.getTokenBalance(
      assetAddress as Address,
      address as Address,
      chainId,
    );
    return Number(formatEther(tokenBalance.balance));
  }

  async transferSol(from: any, to: any, lamports: number): Promise<string> {
    throw new Error('transferSol is not supported for EVM. Use sendTransaction instead.');
  }

  // Private helper methods
  private async getWalletClient(walletId: UUID, chainId: number): Promise<WalletClient> {
    const wallet = await this.getWallet(walletId);
    if (!wallet) {
      throw new Error('Wallet not found');
    }

    const privateKey = await this.dbService.getWalletPrivateKey(walletId);
    if (!privateKey) {
      throw new Error('Wallet private key not available');
    }

    const chain = this.getChainById(chainId);
    if (!chain) {
      throw new Error(`Unsupported chain: ${chainId}`);
    }

    const key = chainId;
    if (!this.walletClients.has(key)) {
      const account = privateKeyToAccount(privateKey as `0x${string}`);
      const client = createWalletClient({
        account,
        chain,
        transport: http(),
      });
      this.walletClients.set(key, client as any);
    }

    return this.walletClients.get(key)!;
  }
}

// Export factory function
export async function createEVMWalletService(runtime: IAgentRuntime): Promise<EVMWalletService> {
  return await EVMWalletService.start(runtime);
}
