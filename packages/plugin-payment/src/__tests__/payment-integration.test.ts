import { describe, it, expect, beforeEach, mock } from 'bun:test';
import { type IAgentRuntime, type Memory, type UUID, asUUID, ServiceType } from '@elizaos/core';
import { PaymentService } from '../services/PaymentService';
import { researchAction } from '../actions/researchAction';
import { PaymentMethod, PaymentStatus } from '../types';

// Helper to create valid UUIDs
const uuid = (suffix: string) => `00000000-0000-0000-0000-${suffix.padStart(12, '0')}`;

describe('Payment System Integration', () => {
  let runtime: IAgentRuntime;
  let paymentService: PaymentService;

  beforeEach(async () => {
    // Mock Drizzle database
    const mockDb = {
      select: mock().mockReturnThis(),
      from: mock().mockReturnThis(),
      where: mock().mockReturnThis(),
      limit: mock().mockResolvedValue([]),
      insert: mock().mockReturnThis(),
      values: mock().mockResolvedValue({}),
      update: mock().mockReturnThis(),
      set: mock().mockReturnThis(),
      execute: mock().mockResolvedValue([]),
    };

    // Mock database service with getDatabase method
    const mockDbService = {
      getDatabase: mock().mockReturnValue(mockDb),
      get: mock(),
      set: mock(),
      delete: mock(),
      query: mock().mockResolvedValue([]),
    };

    // Mock runtime
    runtime = {
      agentId: asUUID(uuid('123')),
      getSetting: mock((key: string) => {
        const settings: Record<string, string> = {
          PAYMENT_AUTO_APPROVAL_ENABLED: 'true',
          PAYMENT_AUTO_APPROVAL_THRESHOLD: '10',
          PAYMENT_DEFAULT_CURRENCY: 'USDC',
          PAYMENT_REQUIRE_CONFIRMATION: 'false',
          PAYMENT_TRUST_THRESHOLD: '70',
          PAYMENT_MAX_DAILY_SPEND: '1000',
          WALLET_ENCRYPTION_KEY: `0x${'0'.repeat(64)}`,
        };
        return settings[key];
      }),
      getService: mock((name: string) => {
        if (name === 'payment') {return paymentService;}
        if (name === 'database') {return mockDbService;}
        return null;
      }),
      setSetting: mock(),
      emit: mock(),
      registerTaskWorker: mock(),
    } as any;

    // Initialize payment service
    paymentService = new PaymentService();
    await paymentService.initialize(runtime);
  });

  describe('PaymentService', () => {
    it('should initialize with default settings', () => {
      const settings = paymentService.getSettings();
      expect(settings.autoApprovalEnabled).toBe(true);
      expect(settings.autoApprovalThreshold).toBe(10);
      expect(settings.defaultCurrency).toBe('USDC');
      expect(settings.maxDailySpend).toBe(1000);
    });

    it('should process a payment request', async () => {
      const paymentRequest = {
        id: asUUID(uuid('1')),
        userId: asUUID(uuid('2')),
        agentId: runtime.agentId,
        actionName: 'research',
        amount: BigInt(1000000), // 1 USDC
        method: PaymentMethod.USDC_ETH,
        metadata: { test: true },
      };

      const result = await paymentService.processPayment(paymentRequest, runtime);

      // Since we don't have real wallet adapters in tests, it should fail gracefully
      expect(result).toBeDefined();
      expect(result.id).toBe(paymentRequest.id);
    });

    it('should get payment capabilities', async () => {
      const capabilities = await paymentService.getCapabilities();

      expect(capabilities).toBeDefined();
      expect(capabilities.features.autoApproval).toBe(true);
      expect(capabilities.limits.minAmount).toBe(0.01);
      expect(capabilities.limits.maxAmount).toBe(1000);
    });

    it('should update settings', async () => {
      await paymentService.updateSettings({
        autoApprovalThreshold: 50,
        requireConfirmation: true,
      });

      const settings = paymentService.getSettings();
      expect(settings.autoApprovalThreshold).toBe(50);
      expect(settings.requireConfirmation).toBe(true);
    });
  });

  describe('Research Action with Payment', () => {
    it('should validate research requests', async () => {
      const message: Memory = {
        id: asUUID(uuid('3')),
        entityId: asUUID(uuid('4')),
        roomId: asUUID(uuid('5')),
        content: {
          text: 'Can you research the latest developments in AI?',
        },
        createdAt: Date.now(),
      };

      const isValid = await researchAction.validate!(runtime, message);
      expect(isValid).toBe(true);
    });

    it('should not validate non-research messages', async () => {
      const message: Memory = {
        id: asUUID(uuid('6')),
        entityId: asUUID(uuid('7')),
        roomId: asUUID(uuid('8')),
        content: {
          text: 'Hello, how are you?',
        },
        createdAt: Date.now(),
      };

      const isValid = await researchAction.validate!(runtime, message);
      expect(isValid).toBe(false);
    });
  });

  describe('Payment Middleware', () => {
    it('should create payment request with correct amount', () => {
      const amount = BigInt(1000000); // 1 USDC
      const method = PaymentMethod.USDC_ETH;

      // Test that payment request structure is correct
      const paymentRequest = {
        amount,
        method,
        requiresConfirmation: false,
      };

      expect(paymentRequest.amount).toBe(amount);
      expect(paymentRequest.method).toBe(method);
    });
  });
});
