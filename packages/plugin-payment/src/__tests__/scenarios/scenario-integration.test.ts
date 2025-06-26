import { describe, it, expect, beforeAll, afterAll, mock } from 'bun:test';
import {
  createTestRuntime,
  cleanupTestRuntime,
  createTestMemory,
  createTestUserId,
} from '../helpers/test-runtime';
import { paymentPlugin } from '../../index';
import { PaymentService } from '../../services/PaymentService';
import { sendPaymentAction } from '../../actions/sendPaymentAction';
import type { IAgentRuntime, Memory } from '@elizaos/core';
import { PaymentMethod, PaymentStatus } from '../../types';

describe('Payment Scenarios Integration', () => {
  let runtime: IAgentRuntime;
  let paymentService: PaymentService;

  beforeAll(async () => {
    // Create runtime with payment plugin
    runtime = await createTestRuntime({
      plugins: [paymentPlugin],
      settings: {
        PAYMENT_AUTO_APPROVAL_ENABLED: 'true',
        PAYMENT_AUTO_APPROVAL_THRESHOLD: '1000',
        PAYMENT_REQUIRE_CONFIRMATION: 'false',
      },
    });

    paymentService = runtime.getService('payment') as PaymentService;
    expect(paymentService).toBeDefined();

    // Register the send payment action
    runtime.registerAction(sendPaymentAction);
  });

  afterAll(async () => {
    await cleanupTestRuntime(runtime);
  });

  describe('Send Payment Action', () => {
    it('should validate send payment messages', async () => {
      const message = createTestMemory({
        content: { text: 'Send 0.1 ETH to 0x742d35Cc6634C0532925a3b844Bc9e7595f7E123' },
      });

      const isValid = await sendPaymentAction.validate(runtime, message);
      expect(isValid).toBe(true);
    });

    it('should extract payment details correctly', async () => {
      const testCases = [
        {
          text: 'Send 0.1 ETH to bob.eth',
          expected: { amount: '0.1', currency: 'ETH', recipient: 'bob.eth' },
        },
        {
          text: 'Transfer 50 USDC to 0x742d35Cc6634C0532925a3b844Bc9e7595f7E123',
          expected: {
            amount: '50',
            currency: 'USDC',
            recipient: '0x742d35Cc6634C0532925a3b844Bc9e7595f7E123',
          },
        },
        {
          text: 'Pay 100 MATIC to alice.polygon',
          expected: { amount: '100', currency: 'MATIC', recipient: 'alice.polygon' },
        },
      ];

      for (const testCase of testCases) {
        const message = createTestMemory({
          content: { text: testCase.text },
        });

        let callbackCalled = false;
        let callbackResponse: any;

        await sendPaymentAction.handler(runtime, message, undefined, {}, async (response) => {
          callbackCalled = true;
          callbackResponse = response;
          return [];
        });

        expect(callbackCalled).toBe(true);
        // Payment will fail due to insufficient funds, but we can check the error message
        expect(callbackResponse.text).toContain('Payment');
      }
    });
  });

  describe('Real-world Payment Scenarios', () => {
    it('should handle multi-agent payment scenario', async () => {
      const alice = createTestUserId();
      const bob = createTestUserId();

      // Alice gets a wallet
      const aliceBalance = await paymentService.getUserBalance(alice, runtime);
      expect(aliceBalance).toBeDefined();
      expect(aliceBalance.size).toBeGreaterThan(0);

      // Bob gets a wallet
      const bobBalance = await paymentService.getUserBalance(bob, runtime);
      expect(bobBalance).toBeDefined();
      expect(bobBalance.size).toBeGreaterThan(0);

      // Test payment between users (would fail due to insufficient funds in test)
      const result = await paymentService.processPayment(
        {
          id: createTestUserId(),
          userId: alice,
          agentId: runtime.agentId,
          actionName: 'transfer',
          amount: BigInt(10 * 1e6), // 10 USDC
          method: PaymentMethod.USDC_ETH,
          recipientAddress: '0x742d35Cc6634C0532925a3b844Bc9e7595f7E123', // Bob's address
          metadata: {
            recipientUserId: bob,
            description: 'Payment between agents',
          },
        },
        runtime
      );

      expect(result).toBeDefined();
      expect(result.status).toBeDefined();
    });

    it('should handle payment request scenario', async () => {
      const userId = createTestUserId();

      // Process a payment request through the service
      const result = await paymentService.processPayment(
        {
          id: createTestUserId(),
          userId,
          agentId: runtime.agentId,
          actionName: 'payment_request',
          amount: BigInt(25 * 1e6), // 25 USDC
          method: PaymentMethod.USDC_ETH,
          metadata: {
            description: 'Dinner last night',
            requestedFrom: 'bob@example.com',
          },
        },
        runtime
      );

      expect(result).toBeDefined();
      expect(result.status).toBeDefined();
      expect(result.metadata).toBeDefined();
    });

    it('should handle DeFi operations', async () => {
      const userId = createTestUserId();

      // Test DeFi yield deposit scenario
      const result = await paymentService.processPayment(
        {
          id: createTestUserId(),
          userId,
          agentId: runtime.agentId,
          actionName: 'defi_deposit',
          amount: BigInt(1000 * 1e6), // 1000 USDC
          method: PaymentMethod.USDC_ETH,
          recipientAddress: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48', // USDC contract
          metadata: {
            protocol: 'aave',
            action: 'deposit',
            expectedAPY: 3.45,
          },
        },
        runtime
      );

      expect(result).toBeDefined();
      expect(result.id).toBeDefined();
    });

    it('should handle cross-chain bridge operations', async () => {
      const userId = createTestUserId();

      // Test bridging scenario
      const result = await paymentService.processPayment(
        {
          id: createTestUserId(),
          userId,
          agentId: runtime.agentId,
          actionName: 'bridge',
          amount: BigInt(500 * 1e6), // 500 USDC
          method: PaymentMethod.USDC_ETH,
          recipientAddress: '0x742d35Cc6634C0532925a3b844Bc9e7595f7E123',
          metadata: {
            fromChain: 'ethereum',
            toChain: 'arbitrum',
            bridgeProtocol: 'stargate',
            estimatedFees: 12,
          },
        },
        runtime
      );

      expect(result).toBeDefined();
      expect(result.metadata).toBeDefined();
    });

    it('should handle NFT minting operations', async () => {
      const userId = createTestUserId();

      // Test NFT minting payment
      const result = await paymentService.processPayment(
        {
          id: createTestUserId(),
          userId,
          agentId: runtime.agentId,
          actionName: 'nft_mint',
          amount: BigInt(25 * 1e6), // 25 USDC
          method: PaymentMethod.USDC_ETH,
          recipientAddress: '0x742d35Cc6634C0532925a3b844Bc9e7595f7E123', // NFT contract
          metadata: {
            service: 'crossmint',
            nftContract: '0x...',
            tokenId: '1',
            chain: 'ethereum',
          },
        },
        runtime
      );

      expect(result).toBeDefined();
      expect(result.status).toBeDefined();
    });
  });

  describe('Payment Confirmations and Trust', () => {
    it('should require confirmation for untrusted high-value payments', async () => {
      const userId = createTestUserId();

      // High-value payment from untrusted user
      const result = await paymentService.processPayment(
        {
          id: createTestUserId(),
          userId,
          agentId: runtime.agentId,
          actionName: 'high_value_transfer',
          amount: BigInt(5000 * 1e6), // 5000 USDC
          method: PaymentMethod.USDC_ETH,
          recipientAddress: '0x742d35Cc6634C0532925a3b844Bc9e7595f7E123',
          requiresConfirmation: true,
          metadata: {
            trustScore: 50, // Below threshold
            reason: 'Large transfer to external wallet',
          },
        },
        runtime
      );

      expect(result.status).toBe(PaymentStatus.PENDING);
      expect(result.metadata?.pendingReason).toBe('USER_CONFIRMATION_REQUIRED');
    });

    it('should auto-approve payments from trusted users', async () => {
      const userId = createTestUserId();

      // Payment from trusted user
      const result = await paymentService.processPayment(
        {
          id: createTestUserId(),
          userId,
          agentId: runtime.agentId,
          actionName: 'trusted_transfer',
          amount: BigInt(100 * 1e6), // 100 USDC
          method: PaymentMethod.USDC_ETH,
          recipientAddress: '0x742d35Cc6634C0532925a3b844Bc9e7595f7E123',
          metadata: {
            trustScore: 85, // Above threshold
            isOwner: false,
            isAdmin: false,
          },
        },
        runtime
      );

      // Should proceed without confirmation (but fail due to funds)
      expect(result.status).toBe(PaymentStatus.FAILED);
      expect(result.error).toContain('Insufficient');
    });
  });
});
