import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import { createTestRuntime, cleanupTestRuntime, createTestMemory, createTestUserId } from '../helpers/test-runtime';
import { paymentPlugin } from '../../index';
import { PaymentService } from '../../services/PaymentService';
import { PaymentMethod, PaymentStatus } from '../../types';
import type { IAgentRuntime } from '@elizaos/core';
import { userWallets, paymentRequests } from '../../database/schema';
import { eq } from 'drizzle-orm';

describe('Real Payment Integration', () => {
  let runtime: IAgentRuntime;
  let paymentService: PaymentService;

  beforeAll(async () => {
    // Create runtime with payment plugin
    runtime = await createTestRuntime({
      plugins: [paymentPlugin],
      settings: {
        PAYMENT_AUTO_APPROVAL_ENABLED: 'true',
        PAYMENT_AUTO_APPROVAL_THRESHOLD: '100',
        PAYMENT_REQUIRE_CONFIRMATION: 'true',
      }
    });

    // Get payment service
    paymentService = runtime.getService('payment') as PaymentService;
    expect(paymentService).toBeDefined();
    expect(paymentService).toBeInstanceOf(PaymentService);
  });

  afterAll(async () => {
    await cleanupTestRuntime(runtime);
  });

  describe('Wallet Management', () => {
    it('should create and persist wallets', async () => {
      const userId = createTestUserId();
      
      // Get user balance (should create wallet)
      const balances = await paymentService.getUserBalance(userId, runtime);
      
      // Should have created wallets for supported methods
      expect(balances.size).toBeGreaterThan(0);
      
      // Check database persistence
      const dbService = runtime.getService('database') as any;
      const db = dbService?.getDatabase();
      expect(db).toBeDefined();
      
      const wallets = await db.select()
        .from(userWallets)
        .where(eq(userWallets.userId, userId))
        .limit(10);
      
      expect(wallets.length).toBeGreaterThan(0);
      
      // Verify wallet structure
      const wallet = wallets[0];
      expect(wallet.address).toBeDefined();
      expect(wallet.encryptedPrivateKey).toBeDefined();
      expect(wallet.network).toBeDefined();
    });

    it('should encrypt wallet private keys', async () => {
      const userId = createTestUserId();
      
      // Force wallet creation
      await paymentService.getUserBalance(userId, runtime);
      
      // Get wallet from database
      const dbService = runtime.getService('database') as any;
      const db = dbService?.getDatabase();
      const wallets = await db.select()
        .from(userWallets)
        .where(eq(userWallets.userId, userId))
        .limit(1);
      
      expect(wallets.length).toBe(1);
      const wallet = wallets[0];
      
      // Private key should be encrypted (not plain text)
      expect(wallet.encryptedPrivateKey).toBeDefined();
      expect(wallet.encryptedPrivateKey).not.toContain('0x');
      expect(wallet.encryptedPrivateKey.length).toBeGreaterThan(64); // Base64 encoded
    });
  });

  describe('Payment Processing', () => {
    it('should create pending payment for large amounts', async () => {
      const userId = createTestUserId();
      const paymentRequest = {
        id: createTestUserId(), // Use as payment ID
        userId,
        agentId: runtime.agentId,
        actionName: 'test-payment',
        amount: BigInt(200 * 1e6), // 200 USDC (above auto-approval threshold)
        method: PaymentMethod.USDC_ETH,
        recipientAddress: '0x742d35Cc6634C0532925a3b844Bc9e7595f7E123',
        metadata: { test: true },
      };

      const result = await paymentService.processPayment(paymentRequest, runtime);
      
      // Should be pending due to amount
      expect(result.status).toBe(PaymentStatus.PENDING);
      expect(result.metadata?.pendingReason).toBeDefined();
      
      // Check database for payment request
      const dbService = runtime.getService('database') as any;
      const db = dbService?.getDatabase();
      
      const requests = await db.select()
        .from(paymentRequests)
        .where(eq(paymentRequests.userId, userId))
        .limit(1);
      
      expect(requests.length).toBe(1);
      if (requests.length > 0) {
        expect(requests[0].requiresConfirmation).toBe(true);
      }
    });

    it('should auto-approve small payments', async () => {
      const userId = createTestUserId();
      
      // First create wallet
      await paymentService.getUserBalance(userId, runtime);
      
      const paymentRequest = {
        id: createTestUserId(),
        userId,
        agentId: runtime.agentId,
        actionName: 'test-payment',
        amount: BigInt(5 * 1e6), // 5 USDC (below auto-approval threshold)
        method: PaymentMethod.USDC_ETH,
        recipientAddress: '0x742d35Cc6634C0532925a3b844Bc9e7595f7E123',
        metadata: { test: true },
      };

      const result = await paymentService.processPayment(paymentRequest, runtime);
      
      // Should fail due to insufficient funds, but not be pending
      expect(result.status).toBe(PaymentStatus.FAILED);
      expect(result.error).toContain('Insufficient');
    });
  });

  describe('Payment Confirmation', () => {
    it('should generate unique verification codes', async () => {
      const userId = createTestUserId();
      
      // Update settings to require confirmation
      await paymentService.updateSettings({
        requireConfirmation: true,
        autoApprovalThreshold: 0,
      });
      
      const paymentRequest = {
        id: createTestUserId(),
        userId,
        agentId: runtime.agentId,
        actionName: 'test-payment',
        amount: BigInt(10 * 1e6), // 10 USDC
        method: PaymentMethod.USDC_ETH,
        recipientAddress: '0x742d35Cc6634C0532925a3b844Bc9e7595f7E123',
        requiresConfirmation: true,
        metadata: { test: true },
      };

      const result = await paymentService.processPayment(paymentRequest, runtime);
      
      expect(result.status).toBe(PaymentStatus.PENDING);
      
      // Get payment request from database
      const dbService = runtime.getService('database') as any;
      const db = dbService?.getDatabase();
      const requests = await db.select()
        .from(paymentRequests)
        .where(eq(paymentRequests.userId, userId))
        .limit(1);
      
      expect(requests.length).toBe(1);
      const request = requests[0];
      
      // Should have verification code
      if (request) {
        expect(request.metadata?.verificationCode).toBeDefined();
        expect(request.metadata.verificationCode).toMatch(/^\d{6}$/);
        expect(request.metadata.verificationCode).not.toBe('123456'); // Not hardcoded
      }
      
      // Reset settings
      await paymentService.updateSettings({
        requireConfirmation: false,
        autoApprovalThreshold: 100,
      });
    });
  });

  describe('Daily Spending Limits', () => {
    it('should track and enforce daily spending', async () => {
      const userId = createTestUserId();
      
      // Set low daily limit and reload settings
      runtime.setSetting('PAYMENT_MAX_DAILY_SPEND', '50');
      await paymentService.updateSettings({
        maxDailySpend: 50
      });
      
      // Create wallet first
      await paymentService.getUserBalance(userId, runtime);
      
      const paymentRequest = {
        id: createTestUserId(),
        userId,
        agentId: runtime.agentId,
        actionName: 'test-payment',
        amount: BigInt(60 * 1e6), // 60 USDC (above daily limit)
        method: PaymentMethod.USDC_ETH,
        recipientAddress: '0x742d35Cc6634C0532925a3b844Bc9e7595f7E123',
        metadata: { test: true },
      };

      const result = await paymentService.processPayment(paymentRequest, runtime);
      
      expect(result.status).toBe(PaymentStatus.FAILED);
      expect(result.error).toContain('Daily spending limit');
      
      // Reset limit
      runtime.setSetting('PAYMENT_MAX_DAILY_SPEND', '1000');
      await paymentService.updateSettings({
        maxDailySpend: 1000
      });
    });
  });

  describe('Research Action Integration', () => {
    it('should handle research requests with payment', async () => {
      const { researchAction } = await import('../../actions/researchAction');
      const memory = createTestMemory({
        content: { text: 'Research the latest AI developments' },
        entityId: createTestUserId(),
      });

      // Validate action
      const isValid = await researchAction.validate!(runtime, memory);
      expect(isValid).toBe(true);

      // Execute action
      const callback = vi.fn();
      await researchAction.handler(runtime, memory, undefined, {}, callback);

      expect(callback).toHaveBeenCalled();
      const response = callback.mock.calls[0][0];
      
      // Should mention payment requirement
      const text = response.text?.toLowerCase() || '';
      expect(text).toMatch(/payment|fund|wallet|usdc/);
    });
  });
}); 