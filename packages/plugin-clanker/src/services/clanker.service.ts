import { Service, IAgentRuntime, logger } from '@elizaos/core';
import { Clanker } from 'clanker-sdk/v4';
import { Contract, JsonRpcProvider, parseUnits } from 'ethers';
import {
  createWalletClient,
  createPublicClient,
  http,
  privateKeyToAccount,
  PublicClient,
  WalletClient,
} from 'viem';
import { base } from 'viem/chains';
import {
  TokenDeployParams,
  DeployResult,
  TokenInfo,
  LiquidityParams,
  RemoveLiquidityParams,
  LiquidityResult,
  SwapParams,
  SwapResult,
  ClankerConfig,
  ErrorCode,
} from '../types';
import { ClankerError } from '../utils/errors';
import { retryTransaction } from '../utils/transactions';

export class ClankerService extends Service {
  static serviceType = 'clanker';

  private provider: JsonRpcProvider | null = null;
  private publicClient: PublicClient | null = null;
  private walletClient: WalletClient | null = null;
  private clanker: Clanker | null = null;
  private config: ClankerConfig | null = null;
  private tokenCache: Map<string, TokenInfo> = new Map();
  private cacheTimeout = 60000; // 1 minute cache

  constructor(runtime: IAgentRuntime) {
    super(runtime);
  }

  async initialize(runtime: IAgentRuntime): Promise<void> {
    logger.info('Initializing Clanker service...');

    try {
      // Try to get config from runtime first, then fall back to global
      this.config =
        (runtime.getSetting('clanker') as ClankerConfig) || (global as any).__clankerConfig;
      if (!this.config) {
        throw new Error('Clanker configuration not found');
      }

      // Validate required config
      if (!this.config.PRIVATE_KEY) {
        throw new Error('PRIVATE_KEY is required for Clanker service');
      }

      if (!this.config.BASE_RPC_URL) {
        throw new Error('BASE_RPC_URL is required for Clanker service');
      }

      // Initialize ethers provider for compatibility
      this.provider = new JsonRpcProvider(this.config.BASE_RPC_URL);

      // Initialize viem clients
      const account = privateKeyToAccount(this.config.PRIVATE_KEY as `0x${string}`);

      this.publicClient = createPublicClient({
        chain: base,
        transport: http(this.config.BASE_RPC_URL),
      });

      this.walletClient = createWalletClient({
        account,
        chain: base,
        transport: http(this.config.BASE_RPC_URL),
      });

      // Initialize Clanker SDK
      this.clanker = new Clanker({
        publicClient: this.publicClient,
        wallet: this.walletClient,
      });

      // Test connections
      await this.publicClient.getChainId();
      await this.provider.getNetwork();

      logger.info('Clanker service initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize Clanker service:', error);
      throw new ClankerError(
        ErrorCode.NETWORK_ERROR,
        'Failed to initialize Clanker service',
        error
      );
    }
  }

  async deployToken(params: TokenDeployParams): Promise<DeployResult> {
    logger.info('Deploying token:', params);

    if (!this.clanker || !this.config || !this.walletClient) {
      throw new ClankerError(ErrorCode.PROTOCOL_ERROR, 'Service not initialized');
    }

    try {
      // Validate parameters
      if (!params.name || params.name.length > 50) {
        throw new ClankerError(
          ErrorCode.VALIDATION_ERROR,
          'Invalid token name - must be 1-50 characters'
        );
      }

      if (!params.symbol || params.symbol.length > 10) {
        throw new ClankerError(
          ErrorCode.VALIDATION_ERROR,
          'Invalid token symbol - must be 1-10 characters'
        );
      }

      // Prepare Clanker token configuration
      const tokenConfig: any = {
        name: params.name,
        symbol: params.symbol,
        tokenAdmin: this.walletClient.account?.address || params.tokenAdmin,
        vanity: params.vanity || false,
      };

      // Add optional image if provided
      if (params.image) {
        tokenConfig.image = params.image;
      }

      // Add metadata if provided
      if (params.metadata) {
        tokenConfig.metadata = {
          description: params.metadata.description || '',
          socialMediaUrls: params.metadata.socialMediaUrls || [],
          auditUrls: params.metadata.auditUrls || [],
        };
      }

      // Add context if provided
      if (params.context) {
        tokenConfig.context = {
          interface: params.context.interface || 'Clanker SDK',
          platform: params.context.platform || '',
          messageId: params.context.messageId || '',
          id: params.context.id || '',
        };
      }

      // Add pool configuration if provided
      if (params.pool) {
        tokenConfig.pool = params.pool;
      }

      // Add fee configuration if provided
      if (params.fees) {
        tokenConfig.fees = params.fees;
      }

      // Add rewards configuration if provided
      if (params.rewards) {
        tokenConfig.rewards = params.rewards;
      }

      // Add vault configuration if provided
      if (params.vault) {
        tokenConfig.vault = params.vault;
      }

      // Add dev buy configuration if provided
      if (params.devBuy) {
        tokenConfig.devBuy = params.devBuy;
      }

      // Deploy the token using Clanker SDK
      const deployResult = await retryTransaction(async () => {
        const { txHash, waitForTransaction, error } = await this.clanker!.deploy(tokenConfig);

        // The deploy function attempts to not throw and instead return an error
        // for you to decide how to handle
        if (error) throw error;

        // Wait for transaction to complete - this may also return an error
        const { address, error: waitError } = await waitForTransaction();
        if (waitError) throw waitError;

        return {
          contractAddress: address,
          transactionHash: txHash,
          deploymentCost: parseUnits('0', 18), // Clanker handles fees internally
          tokenId: `clanker_${params.symbol.toLowerCase()}_${Date.now()}`,
        };
      }, this.config.RETRY_ATTEMPTS);

      logger.info('Token deployed successfully:', deployResult);

      // Cache the token info
      this.tokenCache.set(deployResult.contractAddress, {
        address: deployResult.contractAddress,
        name: params.name,
        symbol: params.symbol,
        decimals: 18, // Clanker tokens are 18 decimals by default
        totalSupply: parseUnits('1000000000', 18), // 1B tokens default
        createdAt: Date.now(),
      });

      return deployResult;
    } catch (error) {
      logger.error('Token deployment failed:', error);
      if (error instanceof ClankerError) throw error;

      throw new ClankerError(ErrorCode.PROTOCOL_ERROR, 'Token deployment failed', error);
    }
  }

  async getTokenInfo(address: string): Promise<TokenInfo> {
    logger.info('Getting token info for:', address);

    if (!this.provider || !this.config) {
      throw new ClankerError(ErrorCode.PROTOCOL_ERROR, 'Service not initialized');
    }

    // Check cache first
    const cached = this.getCachedTokenInfo(address);
    if (cached && Date.now() - (cached.createdAt || 0) < this.cacheTimeout) {
      return cached;
    }

    try {
      // Query token contract directly
      const tokenAbi = [
        'function name() view returns (string)',
        'function symbol() view returns (string)',
        'function decimals() view returns (uint8)',
        'function totalSupply() view returns (uint256)',
        'function balanceOf(address) view returns (uint256)',
      ];

      const token = new Contract(address, tokenAbi, this.provider);

      const [name, symbol, decimals, totalSupply] = await Promise.all([
        token.name(),
        token.symbol(),
        token.decimals(),
        token.totalSupply(),
      ]);

      // For market data, we would need to integrate with a price API
      // or DEX API since Clanker SDK doesn't provide this directly
      const tokenInfo: TokenInfo = {
        address,
        name,
        symbol,
        decimals,
        totalSupply,
        price: 0, // Would need price oracle integration
        priceUsd: 0, // Would need price oracle integration
        volume24h: parseUnits('0', decimals), // Would need DEX API integration
        holders: 0, // Would need indexer integration
        liquidity: parseUnits('0', decimals), // Would need DEX API integration
        marketCap: 0n, // Would need price oracle integration
        createdAt: Date.now(),
      };

      // Update cache
      this.tokenCache.set(address, tokenInfo);

      return tokenInfo;
    } catch (error) {
      logger.error('Failed to get token info:', error);
      throw new ClankerError(
        ErrorCode.NETWORK_ERROR,
        'Failed to retrieve token information',
        error
      );
    }
  }

  async addLiquidity(params: LiquidityParams): Promise<LiquidityResult> {
    logger.info('Adding liquidity:', params);

    throw new ClankerError(
      ErrorCode.PROTOCOL_ERROR,
      'Liquidity operations not supported by Clanker SDK. Use Uniswap v4 directly or other DEX integration.'
    );
  }

  async removeLiquidity(params: RemoveLiquidityParams): Promise<LiquidityResult> {
    logger.info('Removing liquidity:', params);

    throw new ClankerError(
      ErrorCode.PROTOCOL_ERROR,
      'Liquidity operations not supported by Clanker SDK. Use Uniswap v4 directly or other DEX integration.'
    );
  }

  async swapTokens(params: SwapParams): Promise<SwapResult> {
    logger.info('Swapping tokens:', params);

    throw new ClankerError(
      ErrorCode.PROTOCOL_ERROR,
      'Token swapping not supported by Clanker SDK. Use Uniswap v4 directly or other DEX integration.'
    );
  }

  getCachedTokenInfo(address: string): TokenInfo | null {
    return this.tokenCache.get(address) || null;
  }

  async stop(): Promise<void> {
    logger.info('Stopping Clanker service...');
    this.tokenCache.clear();
    this.provider = null;
    this.publicClient = null;
    this.walletClient = null;
    this.clanker = null;
    this.config = null;
  }
}
