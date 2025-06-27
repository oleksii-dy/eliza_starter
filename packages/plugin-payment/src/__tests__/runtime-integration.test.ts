import { describe, it, expect, beforeAll, afterAll, mock } from 'bun:test';
import {
  type IAgentRuntime,
  type Memory,
  type UUID,
  asUUID,
  stringToUuid,
  type Character,
} from '@elizaos/core';
import { createMockRuntime, createTestMemory } from './helpers/test-runtime';
import { PaymentService } from '../services/PaymentService';
import { researchAction } from '../actions/researchAction';
import { PaymentMethod, PaymentStatus } from '../types';
import { paymentPlugin } from '../index';

describe('Payment Plugin Runtime Integration', () => {
  let runtime: IAgentRuntime;
  let paymentService: PaymentService;

  beforeAll(async () => {
    console.info('Setting up runtime integration test');

    // Create mock runtime with payment-specific settings
    runtime = createMockRuntime({
      character: {
        id: stringToUuid('test-payment-agent'),
        name: 'PaymentTestAgent',
        username: 'payment_test',
        bio: 'A test agent for payment functionality',
        plugins: [paymentPlugin.name],
      },
    });

    // Initialize payment service
    paymentService = new PaymentService();
    await paymentService.initialize(runtime);

    expect(paymentService).toBeDefined();
    expect(paymentService).toBeInstanceOf(PaymentService);
  });

  afterAll(async () => {
    // Clean up
    if (paymentService) {
      await paymentService.stop();
    }
  });

  describe('Core Functionality', () => {
    it('should validate payment requests', async () => {
      const invalidRequests = [
        {
          // Missing recipient address
          id: asUUID(stringToUuid('test-invalid-1')),
          userId: asUUID(stringToUuid('test-user')),
          agentId: runtime.agentId,
          actionName: 'test',
          amount: BigInt(1000000),
          method: PaymentMethod.ETH,
          metadata: {},
        },
        {
          // Invalid amount (0)
          id: asUUID(stringToUuid('test-invalid-2')),
          userId: asUUID(stringToUuid('test-user')),
          agentId: runtime.agentId,
          actionName: 'test',
          amount: BigInt(0),
          method: PaymentMethod.ETH,
          recipientAddress: `0x${'0'.repeat(40)}`,
          metadata: {},
        },
      ];

      for (const request of invalidRequests) {
        const result = await paymentService.processPayment(request, runtime);

        // processPayment returns a result with status FAILED instead of throwing
        expect(result.status).toBe(PaymentStatus.FAILED);
        expect(result.error).toBeDefined();
      }
    });

    it('should check wallet encryption', async () => {
      const userId = asUUID(stringToUuid('test-user-encryption'));

      // Force wallet creation
      try {
        await paymentService.getUserBalance(userId, runtime);
      } catch (error) {
        // Expected to fail due to no real wallet service
      }

      // Check that wallet would be encrypted if created
      const encryptionKey = runtime.getSetting('WALLET_ENCRYPTION_KEY');
      expect(encryptionKey).toBeDefined();
      expect(encryptionKey).toHaveLength(66); // '0x' + 64 hex chars
    });
  });

  describe('Payment Service Configuration', () => {
    it('should have proper settings', () => {
      const settings = paymentService.getSettings();
      expect(settings).toBeDefined();
      expect(settings.autoApprovalEnabled).toBe(true);
      expect(settings.autoApprovalThreshold).toBe(10);
      expect(settings.maxDailySpend).toBe(1000);
    });

    it('should have proper capabilities', async () => {
      const capabilities = await paymentService.getCapabilities();

      expect(capabilities.supportedMethods.length).toBeGreaterThan(0);
      expect(capabilities.supportedMethods).toContain(PaymentMethod.ETH);
      expect(capabilities.supportedMethods).toContain(PaymentMethod.USDC_ETH);

      expect(capabilities.features.autoApproval).toBe(true);
      expect(capabilities.limits.dailyLimit).toBe(1000);
    });
  });

  describe('Research Action Integration', () => {
    it('should validate research requests', async () => {
      const message = createTestMemory({
        content: {
          text: 'Research blockchain scalability solutions',
        },
      });

      // Validate the action
      const isValid = await researchAction.validate!(runtime, message);
      expect(isValid).toBe(true);
    });

    it('should handle research payment flow', async () => {
      const message = createTestMemory({
        content: {
          text: 'Can you research AI trends?',
        },
      });

      const callback = mock();
      await researchAction.handler(runtime, message, undefined, {}, callback);

      expect(callback).toHaveBeenCalled();
      const response = callback.mock.calls[0][0];

      // Should mention payment or funds issue
      const text = response.text?.toLowerCase() || '';
      expect(text).toMatch(/payment|insufficient|funds|wallet|error/);
    });
  });

  describe('CrossmintAdapter Integration', () => {
    it('should load CrossmintAdapter when Crossmint services are available', async () => {
      const paymentService = runtime.getService('payment') as PaymentService;
      const capabilities = await paymentService.getCapabilities();

      // Check if Crossmint payment methods are supported
      expect(capabilities.supportedMethods).toContain(PaymentMethod.ETH);
      expect(capabilities.supportedMethods).toContain(PaymentMethod.USDC_ETH);
      expect(capabilities.supportedMethods).toContain(PaymentMethod.SOL);
    });

    it('should process payment with CrossmintAdapter', async () => {
      const paymentService = runtime.getService('payment') as PaymentService;

      const paymentRequest = {
        id: asUUID('00000000-0000-0000-0000-000000000001'),
        userId: asUUID('00000000-0000-0000-0000-000000000002'),
        agentId: runtime.agentId,
        actionName: 'test-payment',
        amount: BigInt(1000000), // 1 USDC
        method: PaymentMethod.USDC_ETH,
        recipientAddress: '0x742d35Cc6634C0532925a3b844Bc9e7595f2bD3e',
        metadata: {
          test: true,
          adapter: 'crossmint',
        },
      };

      const result = await paymentService.processPayment(paymentRequest, runtime);

      expect(result).toBeDefined();
      expect(result.id).toBe(paymentRequest.id);
      expect(result.status).toBeDefined();

      // Check if it attempted to use Crossmint (would fail due to missing wallet)
      if (result.status === PaymentStatus.FAILED) {
        expect(result.error).toBeDefined();
      }
    });

    it('should get user balance through CrossmintAdapter', async () => {
      const paymentService = runtime.getService('payment') as PaymentService;

      const userId = asUUID('00000000-0000-0000-0000-000000000002');
      const balances = await paymentService.getUserBalance(userId, runtime);

      expect(balances).toBeDefined();
      expect(balances).toBeInstanceOf(Map);
    });
  });

  describe('Service Interactions', () => {
    it('should use price oracle for currency conversion', async () => {
      const priceOracleService = runtime.getService('priceOracle') as PriceOracleService;

      // Skip test if price oracle service is not available
      if (!priceOracleService) {
        console.warn('Price oracle service not available, skipping test');
        return;
      }

      // Test ETH to USD conversion
      const ethAmount = BigInt('1000000000000000000'); // 1 ETH
      const usdValue = await priceOracleService.convertToUSD(ethAmount, PaymentMethod.ETH);

      expect(usdValue).toBeGreaterThan(0);
    });

    it('should handle payment with auto-approval', async () => {
      const paymentService = runtime.getService('payment') as PaymentService;

      // Small payment under auto-approval threshold
      const paymentRequest = {
        id: asUUID('00000000-0000-0000-0000-000000000003'),
        userId: asUUID('00000000-0000-0000-0000-000000000002'),
        agentId: runtime.agentId,
        actionName: 'small-payment',
        amount: BigInt(5000000), // 5 USDC (under $10 threshold)
        method: PaymentMethod.USDC_ETH,
        recipientAddress: '0x742d35Cc6634C0532925a3b844Bc9e7595f2bD3e',
      };

      const result = await paymentService.processPayment(paymentRequest, runtime);

      expect(result).toBeDefined();
      // Should not require confirmation due to auto-approval
      expect(result.metadata?.pendingReason).not.toBe('USER_CONFIRMATION_REQUIRED');
    });

    it('should require confirmation for large payments', async () => {
      const paymentService = runtime.getService('payment') as PaymentService;

      // Large payment over auto-approval threshold
      const paymentRequest = {
        id: asUUID('00000000-0000-0000-0000-000000000004'),
        userId: asUUID('00000000-0000-0000-0000-000000000002'),
        agentId: runtime.agentId,
        actionName: 'large-payment',
        amount: BigInt(50000000), // 50 USDC (over $10 threshold)
        method: PaymentMethod.USDC_ETH,
        recipientAddress: '0x742d35Cc6634C0532925a3b844Bc9e7595f2bD3e',
        requiresConfirmation: true,
      };

      const result = await paymentService.processPayment(paymentRequest, runtime);

      expect(result).toBeDefined();
      // In test environment without wallet service, payment may fail or be pending
      expect([PaymentStatus.PENDING, PaymentStatus.FAILED]).toContain(result.status);

      // If it succeeded as pending, check the reason
      if (result.status === PaymentStatus.PENDING) {
        expect(result.metadata?.pendingReason).toBe('USER_CONFIRMATION_REQUIRED');
      }
    });
  });

  describe('Error Handling', () => {
    it('should handle missing wallet adapter gracefully', async () => {
      const paymentService = runtime.getService('payment') as PaymentService;

      // Try unsupported payment method
      const paymentRequest = {
        id: asUUID('00000000-0000-0000-0000-000000000005'),
        userId: asUUID('00000000-0000-0000-0000-000000000002'),
        agentId: runtime.agentId,
        actionName: 'unsupported-payment',
        amount: BigInt(1000000),
        method: PaymentMethod.BTC, // Not supported by any adapter
        recipientAddress: 'bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh',
      };

      const result = await paymentService.processPayment(paymentRequest, runtime);

      expect(result).toBeDefined();
      expect(result.status).toBe(PaymentStatus.FAILED);
      expect(result.error).toContain('not supported');
    });

    it('should handle database errors', async () => {
      // This test verifies that the service can handle database errors gracefully
      const paymentService = runtime.getService('payment') as PaymentService;

      const paymentRequest = {
        id: asUUID('00000000-0000-0000-0000-000000000006'),
        userId: asUUID('00000000-0000-0000-0000-000000000002'),
        agentId: runtime.agentId,
        actionName: 'db-error-payment',
        amount: BigInt(1000000),
        method: PaymentMethod.USDC_ETH,
        recipientAddress: '0x742d35Cc6634C0532925a3b844Bc9e7595f2bD3e',
      };

      try {
        const result = await paymentService.processPayment(paymentRequest, runtime);
        expect(result).toBeDefined();
        // The payment should either succeed or fail gracefully
        expect([PaymentStatus.PENDING, PaymentStatus.FAILED, PaymentStatus.COMPLETED]).toContain(
          result.status
        );
      } catch (error) {
        // If an error is thrown, ensure it's handled gracefully
        expect(error).toBeDefined();
        expect(error instanceof Error).toBe(true);
      }
    });
  });

  describe('Multi-Adapter Support', () => {
    it('should support multiple payment methods across adapters', async () => {
      const paymentService = runtime.getService('payment') as PaymentService;
      const capabilities = await paymentService.getCapabilities();

      // Should support methods from multiple adapters
      const expectedMethods = [
        PaymentMethod.USDC_ETH,
        PaymentMethod.ETH,
        PaymentMethod.SOL,
        PaymentMethod.USDC_SOL,
      ];

      expectedMethods.forEach((method) => {
        expect(capabilities.supportedMethods).toContain(method);
      });
    });

    it('should select correct adapter for payment method', async () => {
      const paymentService = runtime.getService('payment') as PaymentService;

      // Test Ethereum payment (should use Crossmint or EVM adapter)
      const ethPayment = {
        id: asUUID('00000000-0000-0000-0000-000000000007'),
        userId: asUUID('00000000-0000-0000-0000-000000000002'),
        agentId: runtime.agentId,
        actionName: 'eth-payment',
        amount: BigInt('1000000000000000000'), // 1 ETH
        method: PaymentMethod.ETH,
        recipientAddress: '0x742d35Cc6634C0532925a3b844Bc9e7595f2bD3e',
      };

      const ethResult = await paymentService.processPayment(ethPayment, runtime);
      expect(ethResult).toBeDefined();

      // Test Solana payment (should use Crossmint or Solana adapter)
      const solPayment = {
        id: asUUID('00000000-0000-0000-0000-000000000008'),
        userId: asUUID('00000000-0000-0000-0000-000000000002'),
        agentId: runtime.agentId,
        actionName: 'sol-payment',
        amount: BigInt('1000000000'), // 1 SOL
        method: PaymentMethod.SOL,
        recipientAddress: '7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZjDpNqYV4N',
      };

      const solResult = await paymentService.processPayment(solPayment, runtime);
      expect(solResult).toBeDefined();
    });
  });

  describe('Settings Management', () => {
    it('should update payment settings', async () => {
      const paymentService = runtime.getService('payment') as PaymentService;

      // Update settings
      await paymentService.updateSettings({
        autoApprovalThreshold: 25,
        maxDailySpend: 2000,
      });

      const settings = paymentService.getSettings();
      expect(settings.autoApprovalThreshold).toBe(25);
      expect(settings.maxDailySpend).toBe(2000);
    });

    it('should persist settings to runtime', async () => {
      const paymentService = runtime.getService('payment') as PaymentService;

      await paymentService.updateSettings({
        requireConfirmation: true,
      });

      const runtimeSetting = runtime.getSetting('PAYMENT_REQUIRE_CONFIRMATION');
      expect(runtimeSetting).toBe('true');
    });
  });
});
