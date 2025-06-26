import {
  Service,
  ServiceType,
  type IAgentRuntime,
  type UUID,
  logger,
  type IUniversalWalletService,
  type UniversalTransferParams,
  type UniversalTransactionParams,
  type UniversalPortfolio,
  type ChainInfo,
  type SwapParams,
  type BridgeParams,
  type PaymentRequestParams,
  type PaymentRequest as _CorePaymentRequest,
  type PaymentResult as CorePaymentResult,
  type PaymentVerification,
  type WalletCapability,
  type UniversalTokenBalance,
  type GasEstimate,
  type UniversalPaymentRequest,
} from '@elizaos/core';

import { PaymentService } from './PaymentService';
import { PriceOracleService } from './PriceOracleService';
import {
  PaymentMethod,
  PaymentStatus,
  type IWalletAdapter as _IWalletAdapter,
} from '../types';

/**
 * Universal Payment Service - Minimal implementation
 * Provides basic wallet functionality through payment adapters
 */
export class UniversalPaymentService extends Service implements IUniversalWalletService {
  static override readonly serviceType = ServiceType.WALLET;
  static serviceName = 'universal-payment';

  public readonly serviceName = 'universal-payment';
  public readonly serviceType = ServiceType.WALLET;
  public readonly capabilityDescription = 'Universal payment service with multi-chain wallet support';

  protected runtime: IAgentRuntime;

  readonly chainSupport = ['ethereum', 'polygon', 'arbitrum', 'optimism', 'base', 'bsc', 'avalanche', 'solana'];
  readonly capabilities: WalletCapability[] = [
        'transfer' as WalletCapability,
        'getBalance' as WalletCapability,
        'getPortfolio' as WalletCapability,
  ];

  private defaultChain: string = 'ethereum';
  private paymentService?: PaymentService;
  private priceOracleService?: PriceOracleService;

  constructor(runtime: IAgentRuntime) {
    super();
    this.runtime = runtime;

    // Get payment services after runtime is set
    this.paymentService = this.runtime.getService<PaymentService>('payment') || undefined;
    this.priceOracleService = this.runtime.getService<PriceOracleService>('priceOracle') || undefined;
  }

  // Core required methods
  async transfer(params: UniversalTransferParams): Promise<any> {
    logger.info('UniversalPaymentService.transfer called', params);
    return {
      hash: `0x${Date.now().toString(16)}`,
      status: 'pending',
      chain: params.chain || this.defaultChain,
      timestamp: Date.now(),
    };
  }

  async sendTransaction(params: UniversalTransactionParams): Promise<any> {
    logger.info('UniversalPaymentService.sendTransaction called', params);
    return {
      hash: `0x${Date.now().toString(16)}`,
      status: 'pending',
      chain: params.chain,
      timestamp: Date.now(),
    };
  }

  async getBalance(assetAddress: string, owner?: string): Promise<any> {
    logger.info('UniversalPaymentService.getBalance called', { assetAddress, owner });
    return {
      address: assetAddress,
      symbol: 'ETH',
      name: 'Ethereum',
      decimals: 18,
      balance: '0',
      balanceFormatted: '0',
      chain: this.defaultChain,
      isNative: true,
    };
  }

  async getBalances(owner?: string): Promise<UniversalTokenBalance[]> {
    logger.info('UniversalPaymentService.getBalances called', { owner });
    const balance: UniversalTokenBalance = {
      address: '0x0000000000000000000000000000000000000000',
      symbol: 'ETH',
      name: 'Ethereum',
      decimals: 18,
      balance: '0',
      balanceFormatted: '0',
      valueUsd: 0,
      priceUsd: 0,
      chain: this.defaultChain,
      isNative: true,
    };
    return [balance];
  }

  async getPortfolio(owner?: string): Promise<UniversalPortfolio> {
    logger.info('UniversalPaymentService.getPortfolio called', { owner });
    return {
      totalValueUsd: 0,
      chains: this.chainSupport,
      assets: [],
      breakdown: {
        tokens: 0,
        defi: 0,
        nfts: 0,
        staked: 0,
      },
      change24h: { amount: 0, percent: 0 },
    };
  }

  async simulateTransaction(params: any): Promise<any> {
    logger.info('UniversalPaymentService.simulateTransaction called', params);
    return {
      success: true,
      gasEstimate: '21000',
      error: null,
    };
  }

  async estimateGas(params: UniversalTransactionParams): Promise<GasEstimate> {
    logger.info('UniversalPaymentService.estimateGas called', params);
    return {
      gasLimit: '21000',
      gasPrice: '20000000000', // 20 gwei
      maxFeePerGas: '30000000000',
      maxPriorityFeePerGas: '1500000000',
      estimatedCost: '0.00063 ETH',
    };
  }

  async getTransaction(hash: string): Promise<any> {
    logger.info('UniversalPaymentService.getTransaction called', { hash });
    return {
      hash,
      status: 'confirmed',
      confirmations: 1,
      blockNumber: 1,
    };
  }

  async waitForTransaction(hash: string, confirmations?: number): Promise<any> {
    logger.info('UniversalPaymentService.waitForTransaction called', { hash, confirmations });
    return await this.getTransaction(hash);
  }

  async signMessage(message: string): Promise<string> {
    logger.info('UniversalPaymentService.signMessage called', { message });
    return `0xsigned_${Date.now()}`;
  }

  // X.402 Payment Protocol Support (stubs)
  async createPaymentRequest(params: PaymentRequestParams): Promise<UniversalPaymentRequest> {
    logger.info('UniversalPaymentService.createPaymentRequest called', params);
    const request: UniversalPaymentRequest = {
      id: `payment-${Date.now()}` as UUID,
      amount: params.amount,
      currency: params.currency,
      network: params.network,
      recipient: params.recipient,
      memo: params.memo,
      expiresAt: params.expiresAt,
      createdAt: Date.now(),
      status: 'pending',
      paymentUrl: `payment://${params.network}/${params.recipient}`,
    };
    return request;
  }

  async processPayment(request: UniversalPaymentRequest): Promise<CorePaymentResult> {
    logger.info('UniversalPaymentService.processPayment called', request);

    if (!this.paymentService) {
      return {
        success: false,
        paymentId: request.id,
        transactionHash: undefined,
        protocol: 'standard',
        amount: request.amount,
        currency: request.currency,
        network: request.network,
        fee: '0',
        confirmations: 0,
        error: 'Payment service not available',
      };
    }

    try {
      // Convert to PaymentService request format
      const paymentRequest = {
        id: request.id,
        userId: (request as any).userId || (`00000000-0000-0000-0000-${Date.now().toString().padStart(12, '0')}` as UUID),
        agentId: this.runtime.agentId,
        actionName: 'universal-payment',
        amount: BigInt(request.amount),
        method: this.getPaymentMethod(request.currency, request.network),
        recipientAddress: request.recipient,
        metadata: {
          memo: request.memo,
          originalRequest: request,
        },
      };

      const result = await this.paymentService.processPayment(paymentRequest, this.runtime);

      return {
        success: result.status === PaymentStatus.COMPLETED,
        paymentId: request.id,
        transactionHash: result.transactionHash,
        protocol: 'standard',
        amount: request.amount,
        currency: request.currency,
        network: request.network,
        fee: result.fee?.toString() || '0',
        confirmations: result.confirmations || 0,
        error: result.error,
      };
    } catch (error) {
      logger.error('UniversalPaymentService.processPayment error', error);
      return {
        success: false,
        paymentId: request.id,
        transactionHash: undefined,
        protocol: 'standard',
        amount: request.amount,
        currency: request.currency,
        network: request.network,
        fee: '0',
        confirmations: 0,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  private getPaymentMethod(currency: string, network: string): PaymentMethod {
    const mapping: Record<string, PaymentMethod> = {
      'USDC-ethereum': PaymentMethod.USDC_ETH,
      'USDC-solana': PaymentMethod.USDC_SOL,
      'ETH-ethereum': PaymentMethod.ETH,
      'SOL-solana': PaymentMethod.SOL,
      'MATIC-polygon': PaymentMethod.MATIC,
      'ETH-arbitrum': PaymentMethod.ARB,
      'ETH-optimism': PaymentMethod.OP,
      'ETH-base': PaymentMethod.BASE,
    };

    const key = `${currency}-${network}`;
    return mapping[key] || PaymentMethod.OTHER;
  }

  async verifyPayment(paymentId: string): Promise<PaymentVerification> {
    logger.info('UniversalPaymentService.verifyPayment called', { paymentId });

    if (!this.paymentService) {
      return {
        valid: false,
        paymentId: paymentId as UUID,
        amount: '0',
        currency: 'unknown',
        network: 'unknown',
        confirmations: 0,
        error: 'Payment service not available',
      };
    }

    try {
      const status = await this.paymentService.checkPaymentStatus(paymentId as UUID, this.runtime);

      // For now, return a basic verification
      // In production, this would query the actual transaction details
      return {
        valid: status === PaymentStatus.COMPLETED,
        paymentId: paymentId as UUID,
        amount: '0', // Would need to query transaction details
        currency: 'USDC',
        network: 'ethereum',
        confirmations: status === PaymentStatus.COMPLETED ? 12 : 0,
        error: status === PaymentStatus.FAILED ? 'Payment failed' : undefined,
      };
    } catch (error) {
      logger.error('UniversalPaymentService.verifyPayment error', error);
      return {
        valid: false,
        paymentId: paymentId as UUID,
        amount: '0',
        currency: 'unknown',
        network: 'unknown',
        confirmations: 0,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  async swap(params: SwapParams): Promise<any> {
    logger.info('UniversalPaymentService.swap called', params);
    throw new Error('Swap not implemented');
  }

  async bridge(params: BridgeParams): Promise<any> {
    logger.info('UniversalPaymentService.bridge called', params);
    throw new Error('Bridge not implemented');
  }

  async getSupportedChains(): Promise<ChainInfo[]> {
    return [
      {
        id: 'ethereum',
        name: 'Ethereum',
        nativeToken: { symbol: 'ETH', name: 'Ethereum', decimals: 18 },
        rpcUrls: ['https://eth.public-rpc.com'],
        blockExplorerUrls: ['https://etherscan.io'],
        isTestnet: false,
        bridgeSupport: [],
      },
    ];
  }

  async switchChain(chainId: string): Promise<void> {
    logger.info('UniversalPaymentService.switchChain called', { chainId });
    if (this.chainSupport.includes(chainId)) {
      this.defaultChain = chainId;
    } else {
      throw new Error(`Chain ${chainId} not supported`);
    }
  }

  isChainSupported(chainId: string): boolean {
    logger.info('UniversalPaymentService.isChainSupported called', { chainId });
    return this.chainSupport.includes(chainId);
  }

  // Service lifecycle
  static async start(runtime: IAgentRuntime): Promise<UniversalPaymentService> {
    logger.info('Starting UniversalPaymentService...');
    return new UniversalPaymentService(runtime);
  }

  async stop(): Promise<void> {
    logger.info('Stopping UniversalPaymentService...');
  }
}
