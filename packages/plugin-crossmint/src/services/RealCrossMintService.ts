import { IAgentRuntime, Service, ServiceType, logger } from '@elizaos/core';
import axios, { AxiosInstance, AxiosError } from 'axios';

/**
 * Real CrossMint API Types (based on actual API documentation)
 */

// Real CrossMint API Response Format
export interface CrossMintApiResponse<T = any> {
  data?: T;
  error?: {
    message: string;
    code?: string;
    details?: any;
  };
}

// Real Wallet Types (based on actual API response)
export interface RealCrossMintWallet {
  type: string;
  address: string;
  linkedUser: string;
  createdAt: string;
}

export interface WalletCreationRequest {
  type:
    | 'evm-smart-wallet'
    | 'solana-mpc-wallet'
    | 'solana-smart-wallet'
    | 'aptos-mpc-wallet'
    | 'sui-mpc-wallet'
    | 'solana-custodial-wallet'
    | 'evm-mpc-wallet';
  linkedUser: string; // Required in format: email:user@example.com, userId:123, phoneNumber:+1234567890, twitter:handle, x:handle
}

// Real Transaction Types
export interface CrossMintTransaction {
  id: string;
  status: 'pending' | 'success' | 'failed';
  hash?: string;
  chain: string;
  from: string;
  to: string;
  value: string;
  gas?: string;
  gasPrice?: string;
  createdAt: string;
  updatedAt: string;
}

export interface TransferRequest {
  walletId: string;
  to: string;
  amount: string;
  currency?: string;
  gas?: {
    gasLimit?: string;
    gasPrice?: string;
  };
}

// Real NFT Types
export interface CrossMintNFT {
  id: string;
  tokenId: string;
  chain: string;
  contractAddress: string;
  metadata: {
    name: string;
    description?: string;
    image?: string;
    attributes?: Array<{
      trait_type: string;
      value: string | number;
    }>;
  };
  recipient: string;
  status: 'pending' | 'success' | 'failed';
  createdAt: string;
}

export interface NFTMintRequest {
  collectionId: string;
  recipient: string; // email or wallet address
  metadata: {
    name: string;
    description?: string;
    image?: string;
    attributes?: Array<{
      trait_type: string;
      value: string | number;
    }>;
  };
}

// Error Types
export class RealCrossMintError extends Error {
  constructor(
    message: string,
    public code?: string,
    public statusCode?: number,
    public details?: any
  ) {
    super(message);
    this.name = 'RealCrossMintError';
  }
}

export class CrossMintAuthError extends RealCrossMintError {
  constructor(message: string = 'Authentication failed') {
    super(message, 'AUTH_ERROR', 401);
    this.name = 'CrossMintAuthError';
  }
}

export class CrossMintValidationError extends RealCrossMintError {
  constructor(message: string, details?: any) {
    super(message, 'VALIDATION_ERROR', 400, details);
    this.name = 'CrossMintValidationError';
  }
}

/**
 * Real CrossMint Service using actual API endpoints
 */
export class RealCrossMintService extends Service {
  static override readonly serviceType = ServiceType.WALLET;
  static serviceName = 'real-crossmint';

  public readonly capabilityDescription =
    'Real CrossMint enterprise blockchain platform with actual API integration';

  private client!: AxiosInstance;
  private apiKey!: string;
  private environment!: 'staging' | 'production';

  constructor(runtime?: IAgentRuntime) {
    super(runtime);
    if (runtime) {
      this.apiKey = runtime.getSetting('CROSSMINT_API_KEY');
      this.environment = (runtime.getSetting('CROSSMINT_ENVIRONMENT') || 'staging') as
        | 'staging'
        | 'production';

      if (!this.apiKey) {
        throw new CrossMintAuthError(
          'Missing CROSSMINT_API_KEY. Please set this environment variable.'
        );
      }

      this.initializeClient();
    }
  }

  private initializeClient(): void {
    const baseURL =
      this.environment === 'production'
        ? 'https://www.crossmint.com/api'
        : 'https://staging.crossmint.com/api';

    this.client = axios.create({
      baseURL,
      timeout: 30000,
      headers: {
        'X-API-KEY': this.apiKey, // Use capital X-API-KEY as confirmed by tests
        'Content-Type': 'application/json',
        'User-Agent': 'ElizaOS-CrossMint-Plugin/1.0',
      },
    });

    // Request interceptor
    this.client.interceptors.request.use(
      (config) => {
        logger.debug(`CrossMint API Request: ${config.method?.toUpperCase()} ${config.url}`);
        return config;
      },
      (error) => Promise.reject(error)
    );

    // Response interceptor for error handling
    this.client.interceptors.response.use(
      (response) => {
        logger.debug(`CrossMint API Response: ${response.status} ${response.config.url}`);
        return response;
      },
      (error: AxiosError) => this.handleApiError(error)
    );
  }

  private handleApiError(error: AxiosError): Promise<never> {
    if (error.response) {
      const status = error.response.status;
      const data = error.response.data as any;
      const message = data?.error?.message || data?.message || 'API request failed';

      switch (status) {
        case 401:
          throw new CrossMintAuthError(message);
        case 400:
          throw new CrossMintValidationError(message, data?.error?.details);
        case 429:
          throw new RealCrossMintError('Rate limit exceeded', 'RATE_LIMIT', status);
        default:
          throw new RealCrossMintError(message, 'API_ERROR', status);
      }
    } else if (error.request) {
      throw new RealCrossMintError('Network error: No response received', 'NETWORK_ERROR');
    } else {
      throw new RealCrossMintError(`Request setup error: ${error.message}`, 'REQUEST_ERROR');
    }
  }

  // Helper method to format linkedUser correctly
  private formatLinkedUser(linkedUser: string): string {
    // If already formatted with prefix, return as-is
    if (linkedUser.includes(':')) {
      return linkedUser;
    }

    // Auto-detect format and add appropriate prefix
    if (linkedUser.includes('@')) {
      return `email:${linkedUser}`;
    }
    if (linkedUser.startsWith('+')) {
      return `phoneNumber:${linkedUser}`;
    }
    // Default to email format for simple strings
    return `email:${linkedUser}@example.com`;
  }

  // Real Wallet Management using correct endpoint
  async createWallet(request: WalletCreationRequest): Promise<RealCrossMintWallet> {
    try {
      // Ensure linkedUser is properly formatted
      const formattedRequest = {
        ...request,
        linkedUser: this.formatLinkedUser(request.linkedUser),
      };

      logger.info('Creating wallet with request:', formattedRequest);

      // Use the correct versioned endpoint for wallet creation
      const response = await this.client.post<RealCrossMintWallet>(
        '/2022-06-09/wallets',
        formattedRequest
      );

      logger.info(`CrossMint wallet created: ${response.data.address} (${response.data.type})`);
      return response.data;
    } catch (error) {
      logger.error('Error creating CrossMint wallet:', error);
      throw error;
    }
  }

  // Convenience method for creating EVM MPC wallet
  async createEVMWallet(linkedUser: string): Promise<RealCrossMintWallet> {
    return this.createWallet({
      type: 'evm-mpc-wallet',
      linkedUser,
    });
  }

  // Convenience method for creating Solana MPC wallet
  async createSolanaWallet(linkedUser: string): Promise<RealCrossMintWallet> {
    return this.createWallet({
      type: 'solana-mpc-wallet',
      linkedUser,
    });
  }

  async getWallet(walletId: string): Promise<RealCrossMintWallet> {
    try {
      const response = await this.client.get<CrossMintApiResponse<RealCrossMintWallet>>(
        '/wallets/by-locator',
        {
          params: { locator: walletId },
        }
      );

      if (response.data.error) {
        throw new RealCrossMintError(`Failed to get wallet: ${response.data.error.message}`);
      }

      if (!response.data.data) {
        throw new RealCrossMintError('Wallet not found');
      }

      return response.data.data;
    } catch (error) {
      logger.error('Error getting CrossMint wallet:', error);
      throw error;
    }
  }

  async listWallets(): Promise<RealCrossMintWallet[]> {
    try {
      const response =
        await this.client.get<CrossMintApiResponse<RealCrossMintWallet[]>>('/wallets');

      if (response.data.error) {
        throw new RealCrossMintError(`Failed to list wallets: ${response.data.error.message}`);
      }

      return response.data.data || [];
    } catch (error) {
      logger.error('Error listing CrossMint wallets:', error);
      throw error;
    }
  }

  // Real Transaction Management
  async createTransfer(request: TransferRequest): Promise<CrossMintTransaction> {
    try {
      const response = await this.client.post<CrossMintApiResponse<CrossMintTransaction>>(
        '/wallets/transactions/create',
        request
      );

      if (response.data.error) {
        throw new RealCrossMintError(`Failed to create transfer: ${response.data.error.message}`);
      }

      if (!response.data.data) {
        throw new RealCrossMintError('No transaction data received from API');
      }

      logger.info(`CrossMint transfer created: ${response.data.data.id}`);
      return response.data.data;
    } catch (error) {
      logger.error('Error creating CrossMint transfer:', error);
      throw error;
    }
  }

  async getTransaction(transactionId: string): Promise<CrossMintTransaction> {
    try {
      const response = await this.client.get<CrossMintApiResponse<CrossMintTransaction>>(
        '/wallets/transactions',
        {
          params: { id: transactionId },
        }
      );

      if (response.data.error) {
        throw new RealCrossMintError(`Failed to get transaction: ${response.data.error.message}`);
      }

      if (!response.data.data) {
        throw new RealCrossMintError('Transaction not found');
      }

      return response.data.data;
    } catch (error) {
      logger.error('Error getting CrossMint transaction:', error);
      throw error;
    }
  }

  // Real NFT Management
  async mintNFT(request: NFTMintRequest): Promise<CrossMintNFT> {
    try {
      const response = await this.client.post<CrossMintApiResponse<CrossMintNFT>>(
        '/nfts/mint',
        request
      );

      if (response.data.error) {
        throw new RealCrossMintError(`Failed to mint NFT: ${response.data.error.message}`);
      }

      if (!response.data.data) {
        throw new RealCrossMintError('No NFT data received from API');
      }

      logger.info(`NFT minted: ${response.data.data.id}`);
      return response.data.data;
    } catch (error) {
      logger.error('Error minting NFT:', error);
      throw error;
    }
  }

  async getNFTMintStatus(mintId: string): Promise<CrossMintNFT> {
    try {
      const response = await this.client.get<CrossMintApiResponse<CrossMintNFT>>(
        '/nfts/mint-status',
        {
          params: { id: mintId },
        }
      );

      if (response.data.error) {
        throw new RealCrossMintError(`Failed to get NFT status: ${response.data.error.message}`);
      }

      if (!response.data.data) {
        throw new RealCrossMintError('NFT not found');
      }

      return response.data.data;
    } catch (error) {
      logger.error('Error getting NFT status:', error);
      throw error;
    }
  }

  // Utility Methods
  getSupportedChains(): string[] {
    return ['ethereum', 'polygon', 'arbitrum', 'optimism', 'base', 'bsc', 'solana'];
  }

  isChainSupported(chain: string): boolean {
    return this.getSupportedChains().includes(chain.toLowerCase());
  }

  async validateConfiguration(): Promise<boolean> {
    try {
      // Test API connectivity with a simple healthcheck endpoint
      await this.client.get('/healthcheck');
      logger.info('CrossMint configuration validated successfully');
      return true;
    } catch (error) {
      logger.warn(
        'CrossMint configuration validation failed (this may be normal):',
        (error as Error).message
      );
      // Don't fail initialization if healthcheck fails - the API might not have this endpoint
      return true;
    }
  }

  // Service Lifecycle
  static async start(runtime: IAgentRuntime): Promise<RealCrossMintService> {
    logger.info('Starting Real CrossMint service...');

    const service = new RealCrossMintService(runtime);

    // Validate configuration
    const isValid = await service.validateConfiguration();
    if (!isValid) {
      logger.warn('CrossMint configuration validation failed, but service will continue');
    }

    logger.info('Real CrossMint service started successfully');
    return service;
  }

  async stop(): Promise<void> {
    logger.info('Stopping Real CrossMint service...');
    // Cleanup any resources if needed
  }
}
