import {
  IAgentRuntime,
  Service,
  ServiceType,
  logger,
} from '@elizaos/core';
import axios, { AxiosInstance, AxiosError } from 'axios';
import {
  CrossMintConfig,
  CrossMintServiceConfig,
  CrossMintApiResponse,
  CrossMintWallet,
  CrossMintWalletCreationParams,
  CrossMintTransaction,
  CrossMintTransferParams,
  CrossMintNFT,
  CrossMintNFTMintParams,
  CrossMintCollection,
  X402PaymentRequest,
  X402PaymentResponse,
  CrossMintError,
  CrossMintAuthError,
  CrossMintValidationError,
  CrossMintNetworkError,
  CROSSMINT_NETWORKS,
} from '../types/crossmint';

/**
 * CrossMint Enterprise Blockchain Service
 * Provides enterprise-grade blockchain infrastructure with MPC wallets and X.402 payment protocol
 */
export class CrossMintService extends Service {
  static override readonly serviceType = ServiceType.WALLET;
  static serviceName = 'crossmint';

  public readonly capabilityDescription = 'Enterprise blockchain platform with MPC wallets, X.402 payments, and cross-chain infrastructure';

  private client!: AxiosInstance;
  config!: CrossMintServiceConfig;

  constructor(runtime?: IAgentRuntime) {
    super(runtime);
    if (runtime) {
      const apiKey = runtime.getSetting('CROSSMINT_API_KEY');
      const environment = runtime.getSetting('CROSSMINT_ENVIRONMENT') || 'sandbox';
      const projectId = runtime.getSetting('CROSSMINT_PROJECT_ID');
      
      if (!apiKey || !projectId) {
        throw new CrossMintError('Missing required CrossMint configuration: CROSSMINT_API_KEY and CROSSMINT_PROJECT_ID');
      }

      this.config = {
        apiKey,
        environment: environment as 'sandbox' | 'production',
        projectId,
        retryAttempts: 3,
        retryDelay: 1000,
        timeout: 30000,
        enableWebhooks: false,
      };

      this.initializeClient();
    }
  }

  private initializeClient(): void {
    const baseUrl = this.config.baseUrl || 
      (this.config.environment === 'production' 
        ? 'https://api.crossmint.io/api/v1'
        : 'https://staging.crossmint.io/api/v1');

    this.client = axios.create({
      baseURL: baseUrl,
      timeout: this.config.timeout,
      headers: {
        'Authorization': `Bearer ${this.config.apiKey}`,
        'Content-Type': 'application/json',
        'X-Project-ID': this.config.projectId,
        'User-Agent': 'ElizaOS-CrossMint-Plugin/1.0',
      },
    });

    // Add request interceptor for retry logic
    this.client.interceptors.request.use(
      (config) => {
        logger.debug(`CrossMint API Request: ${config.method?.toUpperCase()} ${config.url}`);
        return config;
      },
      (error) => Promise.reject(error)
    );

    // Add response interceptor for error handling
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
          throw new CrossMintNetworkError('Rate limit exceeded', status);
        default:
          throw new CrossMintNetworkError(message, status);
      }
    } else if (error.request) {
      throw new CrossMintNetworkError('Network error: No response received');
    } else {
      throw new CrossMintError('Request setup error: ' + error.message);
    }
  }

  private async withRetry<T>(operation: () => Promise<T>): Promise<T> {
    let lastError: Error;

    for (let attempt = 1; attempt <= this.config.retryAttempts!; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error as Error;
        
        // Don't retry on certain errors
        if (error instanceof CrossMintAuthError || error instanceof CrossMintValidationError) {
          throw error;
        }

        if (attempt === this.config.retryAttempts) {
          throw lastError;
        }

        const delay = this.config.retryDelay! * Math.pow(2, attempt - 1);
        logger.warn(`CrossMint API request failed (attempt ${attempt}), retrying in ${delay}ms:`, error);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }

    throw lastError!;
  }

  // Wallet Management
  async createWallet(params: CrossMintWalletCreationParams): Promise<CrossMintWallet> {
    return this.withRetry(async () => {
      const response = await this.client.post<CrossMintApiResponse<CrossMintWallet>>('/wallets', params);
      
      if (!response.data.success || !response.data.data) {
        throw new CrossMintError('Failed to create wallet: ' + response.data.error?.message);
      }

      logger.info(`CrossMint wallet created: ${response.data.data.id} on ${params.network}`);
      return response.data.data;
    });
  }

  async getWallet(walletId: string): Promise<CrossMintWallet> {
    return this.withRetry(async () => {
      const response = await this.client.get<CrossMintApiResponse<CrossMintWallet>>(`/wallets/${walletId}`);
      
      if (!response.data.success || !response.data.data) {
        throw new CrossMintError('Failed to get wallet: ' + response.data.error?.message);
      }

      return response.data.data;
    });
  }

  async listWallets(userId?: string): Promise<CrossMintWallet[]> {
    return this.withRetry(async () => {
      const params = userId ? { userId } : {};
      const response = await this.client.get<CrossMintApiResponse<CrossMintWallet[]>>('/wallets', { params });
      
      if (!response.data.success || !response.data.data) {
        throw new CrossMintError('Failed to list wallets: ' + response.data.error?.message);
      }

      return response.data.data;
    });
  }

  // Transaction Management
  async transfer(params: CrossMintTransferParams): Promise<CrossMintTransaction> {
    return this.withRetry(async () => {
      const response = await this.client.post<CrossMintApiResponse<CrossMintTransaction>>('/transfers', params);
      
      if (!response.data.success || !response.data.data) {
        throw new CrossMintError('Failed to transfer: ' + response.data.error?.message);
      }

      logger.info(`CrossMint transfer initiated: ${response.data.data.id}`);
      return response.data.data;
    });
  }

  async getTransaction(transactionId: string): Promise<CrossMintTransaction> {
    return this.withRetry(async () => {
      const response = await this.client.get<CrossMintApiResponse<CrossMintTransaction>>(`/transactions/${transactionId}`);
      
      if (!response.data.success || !response.data.data) {
        throw new CrossMintError('Failed to get transaction: ' + response.data.error?.message);
      }

      return response.data.data;
    });
  }

  async listTransactions(walletId?: string): Promise<CrossMintTransaction[]> {
    return this.withRetry(async () => {
      const params = walletId ? { walletId } : {};
      const response = await this.client.get<CrossMintApiResponse<CrossMintTransaction[]>>('/transactions', { params });
      
      if (!response.data.success || !response.data.data) {
        throw new CrossMintError('Failed to list transactions: ' + response.data.error?.message);
      }

      return response.data.data;
    });
  }

  // X.402 Payment Protocol
  async createPaymentRequest(request: X402PaymentRequest): Promise<X402PaymentResponse> {
    return this.withRetry(async () => {
      const response = await this.client.post<CrossMintApiResponse<X402PaymentResponse>>('/payments/x402', request);
      
      if (!response.data.success || !response.data.data) {
        throw new CrossMintError('Failed to create X.402 payment: ' + response.data.error?.message);
      }

      logger.info(`X.402 payment request created: ${response.data.data.id}`);
      return response.data.data;
    });
  }

  async getPaymentStatus(paymentId: string): Promise<X402PaymentResponse> {
    return this.withRetry(async () => {
      const response = await this.client.get<CrossMintApiResponse<X402PaymentResponse>>(`/payments/x402/${paymentId}`);
      
      if (!response.data.success || !response.data.data) {
        throw new CrossMintError('Failed to get payment status: ' + response.data.error?.message);
      }

      return response.data.data;
    });
  }

  async listPayments(): Promise<X402PaymentResponse[]> {
    return this.withRetry(async () => {
      const response = await this.client.get<CrossMintApiResponse<X402PaymentResponse[]>>('/payments/x402');
      
      if (!response.data.success || !response.data.data) {
        throw new CrossMintError('Failed to list payments: ' + response.data.error?.message);
      }

      return response.data.data;
    });
  }

  // NFT Management
  async mintNFT(params: CrossMintNFTMintParams): Promise<CrossMintNFT> {
    return this.withRetry(async () => {
      const response = await this.client.post<CrossMintApiResponse<CrossMintNFT>>('/nfts/mint', params);
      
      if (!response.data.success || !response.data.data) {
        throw new CrossMintError('Failed to mint NFT: ' + response.data.error?.message);
      }

      logger.info(`NFT minted: ${response.data.data.id} on ${params.network}`);
      return response.data.data;
    });
  }

  async getNFT(nftId: string): Promise<CrossMintNFT> {
    return this.withRetry(async () => {
      const response = await this.client.get<CrossMintApiResponse<CrossMintNFT>>(`/nfts/${nftId}`);
      
      if (!response.data.success || !response.data.data) {
        throw new CrossMintError('Failed to get NFT: ' + response.data.error?.message);
      }

      return response.data.data;
    });
  }

  async listNFTs(owner?: string, contractAddress?: string): Promise<CrossMintNFT[]> {
    return this.withRetry(async () => {
      const params: any = {};
      if (owner) params.owner = owner;
      if (contractAddress) params.contractAddress = contractAddress;
      
      const response = await this.client.get<CrossMintApiResponse<CrossMintNFT[]>>('/nfts', { params });
      
      if (!response.data.success || !response.data.data) {
        throw new CrossMintError('Failed to list NFTs: ' + response.data.error?.message);
      }

      return response.data.data;
    });
  }

  // Collection Management
  async createCollection(params: Omit<CrossMintCollection, 'id' | 'createdAt'>): Promise<CrossMintCollection> {
    return this.withRetry(async () => {
      const response = await this.client.post<CrossMintApiResponse<CrossMintCollection>>('/collections', params);
      
      if (!response.data.success || !response.data.data) {
        throw new CrossMintError('Failed to create collection: ' + response.data.error?.message);
      }

      logger.info(`Collection created: ${response.data.data.id} on ${params.network}`);
      return response.data.data;
    });
  }

  async getCollection(collectionId: string): Promise<CrossMintCollection> {
    return this.withRetry(async () => {
      const response = await this.client.get<CrossMintApiResponse<CrossMintCollection>>(`/collections/${collectionId}`);
      
      if (!response.data.success || !response.data.data) {
        throw new CrossMintError('Failed to get collection: ' + response.data.error?.message);
      }

      return response.data.data;
    });
  }

  async listCollections(): Promise<CrossMintCollection[]> {
    return this.withRetry(async () => {
      const response = await this.client.get<CrossMintApiResponse<CrossMintCollection[]>>('/collections');
      
      if (!response.data.success || !response.data.data) {
        throw new CrossMintError('Failed to list collections: ' + response.data.error?.message);
      }

      return response.data.data;
    });
  }

  // Utility Methods
  getSupportedNetworks(): string[] {
    return Object.values(CROSSMINT_NETWORKS);
  }

  isNetworkSupported(network: string): boolean {
    return Object.values(CROSSMINT_NETWORKS).includes(network as any);
  }

  async validateConfiguration(): Promise<boolean> {
    try {
      // Test API connectivity by listing wallets
      await this.listWallets();
      logger.info('CrossMint configuration validated successfully');
      return true;
    } catch (error) {
      logger.error('CrossMint configuration validation failed:', error);
      return false;
    }
  }

  // Service Lifecycle
  static async start(runtime: IAgentRuntime): Promise<CrossMintService> {
    logger.info('Starting CrossMint service...');
    
    const service = new CrossMintService(runtime);
    
    // Validate configuration
    const isValid = await service.validateConfiguration();
    if (!isValid) {
      logger.warn('CrossMint configuration validation failed, but service will continue');
    }

    logger.info('CrossMint service started successfully');
    return service;
  }

  async stop(): Promise<void> {
    logger.info('Stopping CrossMint service...');
    // Cleanup any resources if needed
  }
}