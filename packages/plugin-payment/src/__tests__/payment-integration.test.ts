import { describe, it, expect, beforeEach, vi } from 'vitest';
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
      select: vi.fn().mockReturnThis(),
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      insert: vi.fn().mockReturnThis(),
      values: vi.fn().mockReturnThis(),
      update: vi.fn().mockReturnThis(),
      set: vi.fn().mockReturnThis(),
      execute: vi.fn().mockResolvedValue([]),
    };

    // Mock database service with getDatabase method
    const mockDbService = {
      getDatabase: vi.fn().mockReturnValue(mockDb),
      get: vi.fn(),
      set: vi.fn(),
      delete: vi.fn(),
      query: vi.fn().mockResolvedValue([]),
    };

    // Mock runtime
    runtime = {
      agentId: asUUID(uuid('123')),
      getSetting: vi.fn((key: string) => {
        const settings: Record<string, string> = {
          PAYMENT_AUTO_APPROVAL_ENABLED: 'true',
          PAYMENT_AUTO_APPROVAL_THRESHOLD: '10',
          PAYMENT_DEFAULT_CURRENCY: 'USDC',
          PAYMENT_REQUIRE_CONFIRMATION: 'false',
          PAYMENT_TRUST_THRESHOLD: '70',
          PAYMENT_MAX_DAILY_SPEND: '1000',
        };
        return settings[key];
      }),
      getService: vi.fn((name: string) => {
        if (name === 'payment') return paymentService;
        if (name === 'database') return mockDbService;
        return null;
      }),
      setSetting: vi.fn(),
      emit: vi.fn(),
      registerTaskWorker: vi.fn(),
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

    it('should have correct action metadata', () => {
      expect(researchAction.name).toBe('RESEARCH');
      expect(researchAction.similes).toContain('SEARCH');
      expect(researchAction.similes).toContain('INVESTIGATE');
      expect(researchAction.description).toContain('payment');
    });
  });

  describe('Payment Middleware', () => {
    it('should create payment request with correct amount', () => {
      const amount = BigInt(1000000); // 1 USDC
      const method = PaymentMethod.USDC_ETH;

      // Format amount for display
      const formatted = formatAmount(amount, method);
      expect(formatted).toBe('1 USDC');
    });

    it('should handle different payment methods', () => {
      const amounts = [
        { amount: BigInt(1000000), method: PaymentMethod.USDC_ETH, expected: '1 USDC' },
        { amount: BigInt(1000000000000000000), method: PaymentMethod.ETH, expected: '1 ETH' },
        { amount: BigInt(1000000000), method: PaymentMethod.SOL, expected: '1 SOL' },
      ];

      amounts.forEach(({ amount, method, expected }) => {
        const formatted = formatAmount(amount, method);
        expect(formatted).toBe(expected);
      });
    });
  });
});

// Helper function to format amounts
function formatAmount(amount: bigint, method: PaymentMethod): string {
  const methodDecimals: Record<PaymentMethod, number> = {
    [PaymentMethod.USDC_ETH]: 6,
    [PaymentMethod.USDC_SOL]: 6,
    [PaymentMethod.ETH]: 18,
    [PaymentMethod.SOL]: 9,
    [PaymentMethod.BTC]: 8,
    [PaymentMethod.MATIC]: 18,
    [PaymentMethod.ARB]: 18,
    [PaymentMethod.OP]: 18,
    [PaymentMethod.BASE]: 18,
    [PaymentMethod.OTHER]: 18,
  };

  const decimals = methodDecimals[method];
  const divisor = BigInt(10 ** decimals);
  const whole = amount / divisor;
  const fraction = amount % divisor;

  const currency = method.replace('_ETH', '').replace('_SOL', '');

  if (fraction === BigInt(0)) {
    return `${whole} ${currency}`;
  }

  const fractionStr = fraction.toString().padStart(decimals, '0').replace(/0+$/, '');
  return `${whole}.${fractionStr} ${currency}`;
}
