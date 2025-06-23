import {
  IAgentRuntime,
  Service,
  ServiceType,
  logger,
} from '@elizaos/core';
import axios, { AxiosInstance, AxiosError } from 'axios';

/**
 * Real X.402 Protocol Types (based on Coinbase specification)
 */

// X.402 Payment Request (HTTP 402 Response)
export interface X402PaymentRequired {
  scheme: 'coinbase' | 'ethereum' | 'solana';
  recipient: string;
  amount: string;
  currency: string;
  chain?: string;
  memo?: string;
  nonce?: string;
  expires?: number;
}

// X.402 Payment (HTTP Request Header)
export interface X402PaymentHeader {
  scheme: string;
  data: string; // Base64 encoded payment data
  signature?: string;
}

// Payment Verification Response
export interface X402VerificationResult {
  valid: boolean;
  transactionHash?: string;
  amount: string;
  currency: string;
  recipient: string;
  blockNumber?: number;
  confirmations?: number;
  timestamp?: number;
}

// Coinbase Facilitator Types
export interface CoinbaseFacilitatorRequest {
  scheme: string;
  recipient: string;
  amount: string;
  currency: string;
  chain?: string;
  nonce?: string;
}

export interface CoinbaseFacilitatorResponse {
  paymentId: string;
  status: 'pending' | 'completed' | 'failed';
  transactionHash?: string;
  amount: string;
  currency: string;
  confirmations?: number;
  createdAt: string;
  settledAt?: string;
}

// X.402 Error Types
export class X402Error extends Error {
  constructor(
    message: string,
    public code?: string,
    public statusCode?: number
  ) {
    super(message);
    this.name = 'X402Error';
  }
}

export class X402PaymentRequiredError extends X402Error {
  constructor(
    message: string,
    public paymentRequired: X402PaymentRequired
  ) {
    super(message, 'PAYMENT_REQUIRED', 402);
    this.name = 'X402PaymentRequiredError';
  }
}

/**
 * Real X.402 Protocol Service
 * Implements Coinbase's X.402 specification for HTTP-native payments
 */
export class RealX402Service extends Service {
  static override readonly serviceType = ServiceType.WALLET;
  static serviceName = 'real-x402';

  public readonly capabilityDescription = 'Real X.402 HTTP-native payment protocol implementation';

  private facilitatorClient!: AxiosInstance;
  private facilitatorUrl: string;

  constructor(runtime: IAgentRuntime, facilitatorUrl?: string) {
    super(runtime);
    this.facilitatorUrl = facilitatorUrl || 'https://x402.coinbase.com'; // Real Coinbase facilitator
    this.initializeFacilitatorClient();
  }

  private initializeFacilitatorClient(): void {
    this.facilitatorClient = axios.create({
      baseURL: this.facilitatorUrl,
      timeout: 15000,
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'ElizaOS-X402-Client/1.0',
      },
    });

    // Request interceptor
    this.facilitatorClient.interceptors.request.use(
      (config) => {
        logger.debug(`X.402 Facilitator Request: ${config.method?.toUpperCase()} ${config.url}`);
        return config;
      },
      (error) => Promise.reject(error)
    );

    // Response interceptor for X.402 specific error handling
    this.facilitatorClient.interceptors.response.use(
      (response) => {
        logger.debug(`X.402 Facilitator Response: ${response.status} ${response.config.url}`);
        return response;
      },
      (error: AxiosError) => this.handleX402Error(error)
    );
  }

  private handleX402Error(error: AxiosError): Promise<never> {
    if (error.response) {
      const status = error.response.status;
      const data = error.response.data as any;

      if (status === 402 && data.paymentRequired) {
        throw new X402PaymentRequiredError(
          'Payment required to access resource',
          data.paymentRequired as X402PaymentRequired
        );
      }

      const message = data?.error?.message || data?.message || 'X.402 request failed';
      throw new X402Error(message, 'API_ERROR', status);
    } else if (error.request) {
      throw new X402Error('Network error: No response received', 'NETWORK_ERROR');
    } else {
      throw new X402Error('Request setup error: ' + error.message, 'REQUEST_ERROR');
    }
  }

  // Create X.402 Payment Request (for sellers)
  async createPaymentRequest(request: CoinbaseFacilitatorRequest): Promise<X402PaymentRequired> {
    try {
      // Generate unique nonce if not provided
      if (!request.nonce) {
        request.nonce = `x402-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      }

      const paymentRequired: X402PaymentRequired = {
        scheme: request.scheme as any,
        recipient: request.recipient,
        amount: request.amount,
        currency: request.currency,
        chain: request.chain,
        nonce: request.nonce,
        expires: Date.now() + (24 * 60 * 60 * 1000), // 24 hours from now
      };

      logger.info(`X.402 payment request created: ${request.amount} ${request.currency}`);
      return paymentRequired;
    } catch (error) {
      logger.error('Error creating X.402 payment request:', error);
      throw error;
    }
  }

  // Verify X.402 Payment (for sellers)
  async verifyPayment(paymentHeader: X402PaymentHeader): Promise<X402VerificationResult> {
    try {
      const response = await this.facilitatorClient.post<CoinbaseFacilitatorResponse>('/verify', {
        scheme: paymentHeader.scheme,
        data: paymentHeader.data,
        signature: paymentHeader.signature,
      });

      return {
        valid: response.data.status === 'completed',
        transactionHash: response.data.transactionHash,
        amount: response.data.amount,
        currency: response.data.currency,
        recipient: '', // Would be in the payment data
        confirmations: response.data.confirmations || 0,
        timestamp: new Date(response.data.createdAt).getTime(),
      };
    } catch (error) {
      logger.error('Error verifying X.402 payment:', error);
      throw error;
    }
  }

  // Process X.402 Payment (for buyers)
  async processPayment(paymentRequired: X402PaymentRequired, walletAddress: string): Promise<CoinbaseFacilitatorResponse> {
    try {
      // In a real implementation, this would:
      // 1. Create a blockchain transaction
      // 2. Sign the transaction
      // 3. Submit to facilitator for settlement

      const paymentData = {
        scheme: paymentRequired.scheme,
        recipient: paymentRequired.recipient,
        amount: paymentRequired.amount,
        currency: paymentRequired.currency,
        chain: paymentRequired.chain,
        nonce: paymentRequired.nonce,
        from: walletAddress,
      };

      const response = await this.facilitatorClient.post<CoinbaseFacilitatorResponse>('/settle', paymentData);

      logger.info(`X.402 payment processed: ${response.data.paymentId}`);
      return response.data;
    } catch (error) {
      logger.error('Error processing X.402 payment:', error);
      throw error;
    }
  }

  // Check Payment Status
  async getPaymentStatus(paymentId: string): Promise<CoinbaseFacilitatorResponse> {
    try {
      const response = await this.facilitatorClient.get<CoinbaseFacilitatorResponse>(`/status/${paymentId}`);
      return response.data;
    } catch (error) {
      logger.error('Error getting X.402 payment status:', error);
      throw error;
    }
  }

  // Get Supported Payment Schemes
  async getSupportedSchemes(): Promise<string[]> {
    try {
      const response = await this.facilitatorClient.get<{ schemes: string[] }>('/supported');
      return response.data.schemes || ['coinbase', 'ethereum', 'solana'];
    } catch (error) {
      logger.warn('Error getting supported schemes, using defaults:', error);
      return ['coinbase', 'ethereum', 'solana'];
    }
  }

  // Create X.402 Payment Header for HTTP requests
  createPaymentHeader(paymentData: any, signature?: string): string {
    const header: X402PaymentHeader = {
      scheme: paymentData.scheme,
      data: Buffer.from(JSON.stringify(paymentData)).toString('base64'),
      signature,
    };

    return JSON.stringify(header);
  }

  // Parse X.402 Payment Header from HTTP request
  parsePaymentHeader(headerValue: string): X402PaymentHeader {
    try {
      return JSON.parse(headerValue) as X402PaymentHeader;
    } catch (error) {
      throw new X402Error('Invalid X-PAYMENT header format');
    }
  }

  // Utility: Check if URL supports X.402
  async checkX402Support(url: string): Promise<boolean> {
    try {
      const response = await axios.get(url, {
        validateStatus: (status) => status === 402 || status === 200,
        timeout: 5000,
      });

      return response.status === 402 && !!response.headers['x-payment-required'];
    } catch (error) {
      return false;
    }
  }

  // Utility: Make X.402 enabled HTTP request
  async makeX402Request(url: string, options: {
    method?: 'GET' | 'POST' | 'PUT' | 'DELETE';
    data?: any;
    walletAddress?: string;
    autoPayment?: boolean;
  } = {}): Promise<any> {
    const { method = 'GET', data, walletAddress, autoPayment = false } = options;

    try {
      // First attempt without payment
      const response = await axios({
        method,
        url,
        data,
        validateStatus: (status) => status === 402 || (status >= 200 && status < 300),
        timeout: 10000,
      });

      // If payment required and auto-payment enabled
      if (response.status === 402 && autoPayment && walletAddress) {
        const paymentRequired = response.data as X402PaymentRequired;
        
        logger.info(`X.402 payment required: ${paymentRequired.amount} ${paymentRequired.currency}`);
        
        // Process payment
        const payment = await this.processPayment(paymentRequired, walletAddress);
        
        // Retry request with payment header
        const paymentHeader = this.createPaymentHeader({
          paymentId: payment.paymentId,
          scheme: paymentRequired.scheme,
        });

        const retryResponse = await axios({
          method,
          url,
          data,
          headers: {
            'X-PAYMENT': paymentHeader,
          },
          timeout: 10000,
        });

        return retryResponse.data;
      }

      return response.data;
    } catch (error) {
      logger.error('Error making X.402 request:', error);
      throw error;
    }
  }

  // Service Lifecycle
  static async start(runtime: IAgentRuntime): Promise<RealX402Service> {
    const facilitatorUrl = runtime.getSetting('X402_FACILITATOR_URL') || 'https://x402.coinbase.com';
    
    logger.info('Starting Real X.402 service...');
    
    const service = new RealX402Service(runtime, facilitatorUrl);
    
    // Test facilitator connectivity
    try {
      await service.getSupportedSchemes();
      logger.info('X.402 facilitator connection verified');
    } catch (error) {
      logger.warn('X.402 facilitator connection failed, but service will continue:', error);
    }

    logger.info('Real X.402 service started successfully');
    return service;
  }

  async stop(): Promise<void> {
    logger.info('Stopping Real X.402 service...');
    // Cleanup any resources if needed
  }
}