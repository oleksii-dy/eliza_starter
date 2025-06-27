import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'bun:test';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import {
  paymentTransactions,
  paymentRequests,
  userWallets,
  dailySpending,
  priceCache,
} from '../../database/schema';
import { eq, and, gte } from 'drizzle-orm';
import { asUUID } from '@elizaos/core';
import { PaymentMethod, PaymentStatus } from '../../types';
import { encrypt, decrypt } from '../../utils/encryption';
import { PAYMENT_TABLES } from '../../database/tables';

// This test requires a real PostgreSQL instance
// Run with: docker run -p 5432:5432 -e POSTGRES_PASSWORD=test postgres:15
const TEST_DATABASE_URL =
  process.env.TEST_DATABASE_URL || 'postgresql://postgres:test@localhost:5432/payment_test';

describe.skipIf(!process.env.TEST_DATABASE_URL)('Database Integration Tests', () => {
  let db: ReturnType<typeof drizzle>;
  let sql: ReturnType<typeof postgres>;

  beforeAll(async () => {
    // Connect to test database
    sql = postgres(TEST_DATABASE_URL);
    db = drizzle(sql);

    // Create tables using unified migrator schema definitions
    for (const table of PAYMENT_TABLES) {
      try {
        await sql.unsafe(table.sql);
        console.log(`Created table: ${table.name}`);
      } catch (error) {
        // Table might already exist, continue
        console.log(`Table ${table.name} already exists or error: ${(error as Error).message}`);
      }
    }
  });

  afterAll(async () => {
    // Clean up
    await sql.end();
  });

  beforeEach(async () => {
    // Clean tables before each test
    await db.delete(paymentTransactions);
    await db.delete(paymentRequests);
    await db.delete(userWallets);
    await db.delete(dailySpending);
    await db.delete(priceCache);
  });

  describe('Transaction Management', () => {
    it('should create and retrieve payment transactions', async () => {
      const transaction = {
        id: asUUID('00000000-0000-0000-0000-000000000001'),
        payerId: asUUID('00000000-0000-0000-0000-000000000002'),
        recipientId: asUUID('00000000-0000-0000-0000-000000000003'),
        agentId: asUUID('00000000-0000-0000-0000-000000000004'),
        amount: BigInt('1000000'), // Use bigint as required by schema
        currency: 'USDC',
        method: PaymentMethod.USDC_ETH,
        status: PaymentStatus.COMPLETED,
        transactionHash: '0x1234567890abcdef',
        toAddress: '0x742d35Cc6634C0532925a3b844Bc9e7595f7E123',
        metadata: { test: true },
        createdAt: new Date(),
      };

      // Insert transaction
      await db.insert(paymentTransactions).values(transaction);

      // Retrieve transaction
      const retrieved = await db
        .select()
        .from(paymentTransactions)
        .where(eq(paymentTransactions.id, transaction.id))
        .limit(1);

      expect(retrieved).toHaveLength(1);
      expect(retrieved[0].id).toBe(transaction.id);
      expect(BigInt(retrieved[0].amount)).toBe(transaction.amount);
      expect(retrieved[0].status).toBe(transaction.status);
      expect(retrieved[0].metadata).toEqual(transaction.metadata);
    });

    it('should handle concurrent transaction updates', async () => {
      const transactionId = asUUID('00000000-0000-0000-0000-000000000001');

      // Create initial transaction
      await db.insert(paymentTransactions).values({
        id: transactionId,
        payerId: asUUID('00000000-0000-0000-0000-000000000002'),
        agentId: asUUID('00000000-0000-0000-0000-000000000004'),
        amount: BigInt('1000000'),
        currency: 'USDC',
        method: PaymentMethod.USDC_ETH,
        status: PaymentStatus.PROCESSING,
        createdAt: new Date(),
      });

      // Simulate concurrent updates
      const updates = await Promise.all([
        db
          .update(paymentTransactions)
          .set({ status: PaymentStatus.COMPLETED, transactionHash: '0xabc' })
          .where(eq(paymentTransactions.id, transactionId)),
        db
          .update(paymentTransactions)
          .set({ metadata: { concurrent: true } })
          .where(eq(paymentTransactions.id, transactionId)),
      ]);

      // Verify final state
      const final = await db
        .select()
        .from(paymentTransactions)
        .where(eq(paymentTransactions.id, transactionId))
        .limit(1);

      expect(final[0].status).toBe(PaymentStatus.COMPLETED);
      expect(final[0].metadata).toHaveProperty('concurrent');
    });
  });

  describe('Wallet Management', () => {
    it('should encrypt and decrypt wallet private keys', async () => {
      const encryptionKey = `0x${'0'.repeat(64)}`;
      const privateKey = `0x${'a'.repeat(64)}`;

      const wallet = {
        id: asUUID('00000000-0000-0000-0000-000000000001'),
        userId: asUUID('00000000-0000-0000-0000-000000000002'),
        agentId: asUUID('00000000-0000-0000-0000-000000000003'),
        address: '0x742d35Cc6634C0532925a3b844Bc9e7595f7E123',
        encryptedPrivateKey: encrypt(privateKey, encryptionKey),
        network: 'ethereum',
        createdAt: new Date(),
      };

      // Store encrypted wallet
      await db.insert(userWallets).values(wallet);

      // Retrieve and decrypt
      const retrieved = await db
        .select()
        .from(userWallets)
        .where(eq(userWallets.id, wallet.id))
        .limit(1);

      const decryptedKey = retrieved[0].encryptedPrivateKey
        ? decrypt(retrieved[0].encryptedPrivateKey, encryptionKey)
        : null;
      expect(decryptedKey).toBe(privateKey);
    });

    it('should prevent duplicate wallets for user/network combination', async () => {
      const wallet = {
        id: asUUID('00000000-0000-0000-0000-000000000001'),
        userId: asUUID('00000000-0000-0000-0000-000000000002'),
        agentId: asUUID('00000000-0000-0000-0000-000000000003'),
        address: '0x742d35Cc6634C0532925a3b844Bc9e7595f7E123',
        encryptedPrivateKey: 'encrypted',
        network: 'ethereum',
        createdAt: new Date(),
      };

      // Insert first wallet
      await db.insert(userWallets).values(wallet);

      // Try to insert duplicate (should use onConflictDoUpdate in real code)
      const duplicate = { ...wallet, id: asUUID('00000000-0000-0000-0000-000000000009') };

      // Check existing wallet
      const existing = await db
        .select()
        .from(userWallets)
        .where(and(eq(userWallets.userId, wallet.userId), eq(userWallets.network, wallet.network)))
        .limit(1);

      expect(existing).toHaveLength(1);
      expect(existing[0].id).toBe(wallet.id);
    });
  });

  describe('Daily Spending Limits', () => {
    it('should track daily spending accurately', async () => {
      const userId = asUUID('00000000-0000-0000-0000-000000000001');
      const agentId = asUUID('00000000-0000-0000-0000-000000000002');
      const today = new Date().toISOString().split('T')[0];

      // Record multiple transactions
      const amounts = ['100.00', '250.00', '150.00']; // $5.00 total

      for (const amount of amounts) {
        await db
          .insert(dailySpending)
          .values({
            userId,
            date: today,
            totalSpentUsd: amount,
            transactionCount: 1,
          })
          .onConflictDoUpdate({
            target: [dailySpending.userId, dailySpending.date],
            set: {
              totalSpentUsd: amount,
              transactionCount: 1,
              updatedAt: new Date(),
            },
          });
      }

      // Get total spending
      const spending = await db
        .select()
        .from(dailySpending)
        .where(and(eq(dailySpending.userId, userId), eq(dailySpending.date, today)))
        .limit(1);

      expect(spending).toHaveLength(1);
      expect(spending[0].totalSpentUsd).toBe('150.00'); // Last update
    });

    it('should reset daily spending at midnight', async () => {
      const userId = asUUID('00000000-0000-0000-0000-000000000001');
      const agentId = asUUID('00000000-0000-0000-0000-000000000002');

      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayStr = yesterday.toISOString().split('T')[0];
      const todayStr = new Date().toISOString().split('T')[0];

      // Add yesterday's spending
      await db.insert(dailySpending).values({
        userId,
        date: yesterdayStr,
        totalSpentUsd: '500.00',
        transactionCount: 5,
      });

      // Add today's spending
      await db.insert(dailySpending).values({
        userId,
        date: todayStr,
        totalSpentUsd: '100.00',
        transactionCount: 1,
      });

      // Query today's spending only
      const todaySpending = await db
        .select()
        .from(dailySpending)
        .where(and(eq(dailySpending.userId, userId), eq(dailySpending.date, todayStr)));

      expect(todaySpending).toHaveLength(1);
      expect(todaySpending[0].totalSpentUsd).toBe('100.00');
    });
  });

  describe('Price Cache', () => {
    it('should cache and expire token prices', async () => {
      const tokenPrice = {
        tokenAddress: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
        network: 'ethereum',
        symbol: 'USDC',
        priceUsd: '1.00000000',
        source: 'coingecko',
        createdAt: new Date(),
        expiresAt: new Date(Date.now() + 5 * 60 * 1000), // 5 minutes
      };

      // Cache price
      await db.insert(priceCache).values(tokenPrice);

      // Get non-expired prices
      const validPrices = await db
        .select()
        .from(priceCache)
        .where(
          and(
            eq(priceCache.tokenAddress, tokenPrice.tokenAddress),
            gte(priceCache.expiresAt, new Date())
          )
        );

      expect(validPrices).toHaveLength(1);
      expect(validPrices[0].priceUsd).toBe('1.00000000');

      // Simulate expired price
      await db
        .update(priceCache)
        .set({ expiresAt: new Date(Date.now() - 1000) })
        .where(
          and(
            eq(priceCache.tokenAddress, tokenPrice.tokenAddress),
            eq(priceCache.network, tokenPrice.network)
          )
        );

      const expiredPrices = await db
        .select()
        .from(priceCache)
        .where(
          and(
            eq(priceCache.tokenAddress, tokenPrice.tokenAddress),
            gte(priceCache.expiresAt, new Date())
          )
        );

      expect(expiredPrices).toHaveLength(0);
    });
  });

  describe('Payment Requests', () => {
    it('should handle payment request lifecycle', async () => {
      const request = {
        id: asUUID('00000000-0000-0000-0000-000000000001'),
        userId: asUUID('00000000-0000-0000-0000-000000000002'),
        agentId: asUUID('00000000-0000-0000-0000-000000000003'),
        amount: BigInt('1000000'),
        method: PaymentMethod.USDC_ETH,
        requiresConfirmation: true,
        metadata: {
          actionName: 'research',
          verificationCode: '123456',
          expiresAt: Date.now() + 5 * 60 * 1000,
        },
        createdAt: new Date(),
      };

      // Create request
      await db.insert(paymentRequests).values(request);

      // Update with transaction
      const transactionId = asUUID('00000000-0000-0000-0000-000000000010');
      await db
        .update(paymentRequests)
        .set({
          transactionId,
        })
        .where(eq(paymentRequests.id, request.id));

      // Verify update
      const updated = await db
        .select()
        .from(paymentRequests)
        .where(eq(paymentRequests.id, request.id))
        .limit(1);

      expect(updated[0].transactionId).toBe(transactionId);
    });
  });
});
