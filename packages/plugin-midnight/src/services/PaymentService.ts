import { Service, IAgentRuntime, logger, UUID, asUUID } from '@elizaos/core';
import { Observable, BehaviorSubject } from 'rxjs';
import { map, shareReplay } from 'rxjs/operators';
import pino from 'pino';
import {
  type PaymentRequest,
  type PaymentTransaction,
  type MidnightActionResult,
  MidnightNetworkError,
} from '../types/index.js';
import { MidnightNetworkService } from './MidnightNetworkService.js';

/**
 * Service for secure payments between agents using Midnight Network
 */
export class PaymentService extends Service {
  static serviceType = 'payment';
  serviceType = 'payment';
  capabilityDescription =
    'Secure payment service using Midnight Network with zero-knowledge privacy';

  private midnightService?: MidnightNetworkService;
  private logger: pino.Logger;

  // Reactive state management
  private paymentRequests$ = new BehaviorSubject<PaymentRequest[]>([]);
  private transactions$ = new BehaviorSubject<PaymentTransaction[]>([]);

  private paymentContracts = new Map<UUID, string>(); // paymentId -> contractAddress
  private escrowContracts = new Map<UUID, string>(); // transactionId -> escrowAddress

  constructor(runtime: IAgentRuntime) {
    super(runtime);
    this.logger = pino({ name: 'PaymentService' });
  }

  static async start(runtime: IAgentRuntime): Promise<PaymentService> {
    const service = new PaymentService(runtime);
    await service.initialize();
    return service;
  }

  async initialize(): Promise<void> {
    try {
      logger.info('Initializing Payment Service...');

      // Get midnight network service
      const midnightService = this.runtime.getService<MidnightNetworkService>('midnight-network');
      if (!midnightService) {
        throw new MidnightNetworkError(
          'Midnight Network Service not available',
          'SERVICE_NOT_FOUND'
        );
      }
      this.midnightService = midnightService;

      // Load existing payment state
      await this.loadExistingState();

      // Start payment monitoring
      await this.startPaymentMonitoring();

      logger.info('Payment Service initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize Payment Service:', error);
      throw error;
    }
  }

  private async loadExistingState(): Promise<void> {
    try {
      // Load payment requests from private state
      const requests = (await this.midnightService?.getPrivateState('payment_requests')) || [];
      this.paymentRequests$.next(requests);

      // Load transactions
      const transactions =
        (await this.midnightService?.getPrivateState('payment_transactions')) || [];
      this.transactions$.next(transactions);

      this.logger.info('Loaded existing payment state', {
        requestCount: requests.length,
        transactionCount: transactions.length,
      });
    } catch (error) {
      this.logger.error('Failed to load existing payment state:', error);
    }
  }

  private async startPaymentMonitoring(): Promise<void> {
    // Monitor payment contracts for state changes
    this.paymentRequests$.subscribe((requests) => {
      requests.forEach((request) => {
        if (request.contractAddress) {
          this.subscribeToPaymentContract(request.id);
        }
      });
    });
  }

  private async subscribeToPaymentContract(paymentId: UUID): Promise<void> {
    const contractAddress = this.paymentContracts.get(paymentId);
    if (!contractAddress || !this.midnightService) {
      return;
    }

    try {
      this.midnightService.subscribeToContract(contractAddress).subscribe({
        next: (contractState) => {
          this.handlePaymentContractChange(paymentId, contractState);
        },
        error: (error) => {
          this.logger.error('Payment contract subscription error:', error);
        },
      });
    } catch (error) {
      this.logger.error('Failed to subscribe to payment contract:', error);
    }
  }

  private async handlePaymentContractChange(paymentId: UUID, _contractState: any): Promise<void> {
    this.logger.debug('Payment contract state changed', { paymentId });

    // Handle payment status updates, escrow releases, etc.
    // This would parse the contract state to determine payment progress
  }

  /**
   * Create a payment request
   */
  async createPaymentRequest(
    toAgent: UUID,
    amount: bigint,
    currency: string,
    description?: string,
    deadline?: Date
  ): Promise<MidnightActionResult> {
    if (!this.midnightService) {
      throw new MidnightNetworkError('Midnight Network Service not available', 'SERVICE_NOT_FOUND');
    }

    try {
      this.logger.info('Creating payment request', { toAgent, amount, currency, description });

      // Deploy payment escrow contract
      const deployment = await this.midnightService.deployContract(
        {} as any, // Mock contract - would be actual payment escrow contract
        [this.runtime.agentId, toAgent, amount.toString(), currency],
        'payment'
      );

      const paymentId = asUUID(`payment_${Date.now()}`);
      const request: PaymentRequest = {
        id: paymentId,
        fromAgent: this.runtime.agentId,
        toAgent,
        amount,
        currency,
        description,
        deadline,
        status: 'pending',
        contractAddress: deployment.address,
        createdAt: new Date(),
      };

      // Store contract mapping
      this.paymentContracts.set(paymentId, deployment.address);

      // Update state
      const currentRequests = this.paymentRequests$.value;
      this.paymentRequests$.next([...currentRequests, request]);

      // Persist to private state
      await this.midnightService.setPrivateState('payment_requests', this.paymentRequests$.value);

      // Start monitoring this payment
      await this.subscribeToPaymentContract(paymentId);

      this.logger.info('Payment request created successfully', {
        paymentId,
        contractAddress: deployment.address,
      });

      return {
        success: true,
        data: {
          paymentId,
          contractAddress: deployment.address,
        },
        message: `Payment request for ${amount} ${currency} created successfully`,
      };
    } catch (error) {
      this.logger.error('Failed to create payment request:', error);
      return {
        success: false,
        data: { error: error instanceof Error ? error.message : 'Unknown error' },
        message: 'Failed to create payment request',
      };
    }
  }

  /**
   * Send payment to another agent
   */
  async sendPayment(
    toAgent: UUID,
    amount: bigint,
    currency: string,
    paymentRequestId?: UUID
  ): Promise<MidnightActionResult> {
    if (!this.midnightService) {
      throw new MidnightNetworkError('Midnight Network Service not available', 'SERVICE_NOT_FOUND');
    }

    try {
      this.logger.info('Sending payment', { toAgent, amount, currency, paymentRequestId });

      // Get wallet info to check balance
      const walletInfo = await this.midnightService.getWalletInfo();
      if (walletInfo.balance < amount) {
        return {
          success: false,
          data: { error: 'Insufficient balance' },
          message: 'Insufficient balance for payment',
        };
      }

      // Generate ZK proof for payment privacy using real circuit
      const { proofGenerator } = await import('../utils/proofGenerator.js');

      // Generate nonce for this payment
      const nonce = new Uint8Array(32);
      // eslint-disable-next-line no-undef
      crypto.getRandomValues(nonce);

      const paymentProof = await proofGenerator.generatePaymentProof(
        this.runtime.agentId,
        toAgent,
        amount,
        currency,
        nonce
      );

      // Create escrow contract for secure payment
      const escrowDeployment = await this.midnightService.deployContract(
        {} as any, // Mock escrow contract
        [this.runtime.agentId, toAgent, amount.toString(), currency],
        'escrow'
      );

      const transactionId = asUUID(`tx_${Date.now()}`);
      const transaction: PaymentTransaction = {
        id: transactionId,
        paymentRequestId,
        fromAgent: this.runtime.agentId,
        toAgent,
        amount,
        currency,
        transactionHash: `0x${Math.random().toString(16).substr(2, 64)}`, // Mock hash
        status: 'pending',
        timestamp: new Date(),
        proof: paymentProof,
      };

      // Store escrow mapping
      this.escrowContracts.set(transactionId, escrowDeployment.address);

      // Update state
      const currentTransactions = this.transactions$.value;
      this.transactions$.next([...currentTransactions, transaction]);

      // Update payment request status if applicable
      if (paymentRequestId) {
        await this.updatePaymentRequestStatus(paymentRequestId, 'accepted');
      }

      // Persist to private state
      await this.midnightService.setPrivateState('payment_transactions', this.transactions$.value);

      // Simulate payment confirmation after delay
      setTimeout(async () => {
        transaction.status = 'confirmed';
        this.transactions$.next(this.transactions$.value);
        await this.midnightService?.setPrivateState(
          'payment_transactions',
          this.transactions$.value
        );

        if (paymentRequestId) {
          await this.updatePaymentRequestStatus(paymentRequestId, 'completed');
        }

        this.logger.info('Payment confirmed', { transactionId });
      }, 5000);

      this.logger.info('Payment sent successfully', {
        transactionId,
        escrowAddress: escrowDeployment.address,
      });

      return {
        success: true,
        data: {
          transactionHash: transaction.transactionHash,
          paymentId: paymentRequestId,
          proof: paymentProof,
        },
        message: `Payment of ${amount} ${currency} sent successfully`,
      };
    } catch (error) {
      this.logger.error('Failed to send payment:', error);
      return {
        success: false,
        data: { error: error instanceof Error ? error.message : 'Unknown error' },
        message: 'Failed to send payment',
      };
    }
  }

  /**
   * Accept a payment request
   */
  async acceptPaymentRequest(paymentRequestId: UUID): Promise<MidnightActionResult> {
    try {
      this.logger.info('Accepting payment request', { paymentRequestId });

      const request = this.paymentRequests$.value.find((r) => r.id === paymentRequestId);
      if (!request) {
        return {
          success: false,
          data: { error: 'Payment request not found' },
          message: 'Payment request not found',
        };
      }

      if (request.toAgent !== this.runtime.agentId) {
        return {
          success: false,
          data: { error: 'Not authorized to accept this payment request' },
          message: 'Not authorized to accept this payment request',
        };
      }

      // Send payment automatically
      return await this.sendPayment(
        request.fromAgent,
        request.amount,
        request.currency,
        paymentRequestId
      );
    } catch (error) {
      this.logger.error('Failed to accept payment request:', error);
      return {
        success: false,
        data: { error: error instanceof Error ? error.message : 'Unknown error' },
        message: 'Failed to accept payment request',
      };
    }
  }

  /**
   * Reject a payment request
   */
  async rejectPaymentRequest(paymentRequestId: UUID): Promise<MidnightActionResult> {
    try {
      this.logger.info('Rejecting payment request', { paymentRequestId });

      await this.updatePaymentRequestStatus(paymentRequestId, 'rejected');

      return {
        success: true,
        message: 'Payment request rejected',
      };
    } catch (error) {
      this.logger.error('Failed to reject payment request:', error);
      return {
        success: false,
        data: { error: error instanceof Error ? error.message : 'Unknown error' },
        message: 'Failed to reject payment request',
      };
    }
  }

  private async updatePaymentRequestStatus(
    paymentRequestId: UUID,
    status: PaymentRequest['status']
  ): Promise<void> {
    const requests = this.paymentRequests$.value;
    const updatedRequests = requests.map((request) =>
      request.id === paymentRequestId ? { ...request, status } : request
    );

    this.paymentRequests$.next(updatedRequests);

    if (this.midnightService) {
      await this.midnightService.setPrivateState('payment_requests', updatedRequests);
    }
  }

  /**
   * Get payment requests for the current agent
   */
  getPaymentRequests(): Observable<PaymentRequest[]> {
    return this.paymentRequests$.asObservable();
  }

  /**
   * Get pending payment requests
   */
  getPendingPaymentRequests(): Observable<PaymentRequest[]> {
    return this.paymentRequests$.pipe(
      map((requests) =>
        requests.filter((r) => r.status === 'pending' && r.toAgent === this.runtime.agentId)
      ),
      shareReplay(1)
    );
  }

  /**
   * Get payment transactions
   */
  getTransactions(): Observable<PaymentTransaction[]> {
    return this.transactions$.asObservable();
  }

  /**
   * Get recent transactions (for provider)
   */
  getRecentTransactions(limit: number = 10): PaymentTransaction[] {
    return this.transactions$.value
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
      .slice(0, limit);
  }

  /**
   * Get wallet balance
   */
  async getBalance(): Promise<{ balance: bigint; currency: string }> {
    if (!this.midnightService) {
      throw new MidnightNetworkError('Midnight Network Service not available', 'SERVICE_NOT_FOUND');
    }

    const walletInfo = await this.midnightService.getWalletInfo();
    return {
      balance: walletInfo.balance,
      currency: 'MIDNIGHT', // Default currency
    };
  }

  /**
   * Verify a payment proof
   */
  async verifyPaymentProof(transaction: PaymentTransaction): Promise<boolean> {
    if (!this.midnightService) {
      return false;
    }

    try {
      return await this.midnightService.verifyProof(transaction.proof);
    } catch (error) {
      this.logger.error('Failed to verify payment proof:', error);
      return false;
    }
  }

  async stop(): Promise<void> {
    this.logger.info('Stopping Payment Service...');
    this.logger.info('Payment Service stopped');
  }
}
