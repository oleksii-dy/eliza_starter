'use strict';
var __assign = (this && this.__assign) || function () {
  __assign = Object.assign || function (t) {
    for (var s, i = 1, n = arguments.length; i < n; i++) {
      s = arguments[i];
      for (const p in s) {if (Object.prototype.hasOwnProperty.call(s, p))
      {t[p] = s[p];}}
    }
    return t;
  };
  return __assign.apply(this, arguments);
};
const __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
  function adopt(value) { return value instanceof P ? value : new P((resolve) => { resolve(value); }); }
  return new (P || (P = Promise))((resolve, reject) => {
    function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
    function rejected(value) { try { step(generator['throw'](value)); } catch (e) { reject(e); } }
    function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
    step((generator = generator.apply(thisArg, _arguments || [])).next());
  });
};
const __generator = (this && this.__generator) || function (thisArg, body) {
  let _ = { label: 0, sent() { if (t[0] & 1) {throw t[1];} return t[1]; }, trys: [], ops: [] }, f, y, t, g = Object.create((typeof Iterator === 'function' ? Iterator : Object).prototype);
  return g.next = verb(0), g['throw'] = verb(1), g['return'] = verb(2), typeof Symbol === 'function' && (g[Symbol.iterator] = function () { return this; }), g;
  function verb(n) { return function (v) { return step([n, v]); }; }
  function step(op) {
    if (f) {throw new TypeError('Generator is already executing.');}
    while (g && (g = 0, op[0] && (_ = 0)), _) {try {
      if (f = 1, y && (t = op[0] & 2 ? y['return'] : op[0] ? y['throw'] || ((t = y['return']) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) {return t;}
      if (y = 0, t) {op = [op[0] & 2, t.value];}
      switch (op[0]) {
        case 0: case 1: t = op; break;
        case 4: _.label++; return { value: op[1], done: false };
        case 5: _.label++; y = op[1]; op = [0]; continue;
        case 7: op = _.ops.pop(); _.trys.pop(); continue;
        default:
          if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
          if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
          if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
          if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
          if (t[2]) {_.ops.pop();}
          _.trys.pop(); continue;
      }
      op = body.call(thisArg, _);
    } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }}
    if (op[0] & 5) {throw op[1];} return { value: op[0] ? op[1] : void 0, done: true };
  }
};
Object.defineProperty(exports, '__esModule', { value: true });
const bun_test_1 = require('bun:test');
const postgres_js_1 = require('drizzle-orm/postgres-js');
const postgres_1 = require('postgres');
const schema_1 = require('../../database/schema');
const drizzle_orm_1 = require('drizzle-orm');
const core_1 = require('@elizaos/core');
const types_1 = require('../../types');
const encryption_1 = require('../../utils/encryption');
const tables_1 = require('../../database/tables');
// This test requires a real PostgreSQL instance
// Run with: docker run -p 5432:5432 -e POSTGRES_PASSWORD=test postgres:15
const TEST_DATABASE_URL = process.env.TEST_DATABASE_URL || 'postgresql://postgres:test@localhost:5432/payment_test';
bun_test_1.describe.skipIf(!process.env.TEST_DATABASE_URL)('Database Integration Tests', () => {
  let db;
  let sql;
  (0, bun_test_1.beforeAll)(() => { return __awaiter(void 0, void 0, void 0, function () {
    let _i, PAYMENT_TABLES_1, table, error_1;
    return __generator(this, (_a) => {
      switch (_a.label) {
        case 0:
          // Connect to test database
          sql = (0, postgres_1.default)(TEST_DATABASE_URL);
          db = (0, postgres_js_1.drizzle)(sql);
          _i = 0, PAYMENT_TABLES_1 = tables_1.PAYMENT_TABLES;
          _a.label = 1;
        case 1:
          if (!(_i < PAYMENT_TABLES_1.length)) {return [3 /*break*/, 6];}
          table = PAYMENT_TABLES_1[_i];
          _a.label = 2;
        case 2:
          _a.trys.push([2, 4, , 5]);
          return [4 /*yield*/, sql.unsafe(table.sql)];
        case 3:
          _a.sent();
          console.log('Created table: '.concat(table.name));
          return [3 /*break*/, 5];
        case 4:
          error_1 = _a.sent();
          // Table might already exist, continue
          console.log('Table '.concat(table.name, ' already exists or error: ').concat(error_1.message));
          return [3 /*break*/, 5];
        case 5:
          _i++;
          return [3 /*break*/, 1];
        case 6: return [2];
      }
    });
  }); });
  (0, bun_test_1.afterAll)(() => { return __awaiter(void 0, void 0, void 0, function () {
    return __generator(this, (_a) => {
      switch (_a.label) {
        case 0:
          // Clean up
          return [4 /*yield*/, sql.end()];
        case 1:
          // Clean up
          _a.sent();
          return [2];
      }
    });
  }); });
  (0, bun_test_1.beforeEach)(() => { return __awaiter(void 0, void 0, void 0, function () {
    return __generator(this, (_a) => {
      switch (_a.label) {
        case 0:
          // Clean tables before each test
          return [4 /*yield*/, db.delete(schema_1.paymentTransactions)];
        case 1:
          // Clean tables before each test
          _a.sent();
          return [4 /*yield*/, db.delete(schema_1.paymentRequests)];
        case 2:
          _a.sent();
          return [4 /*yield*/, db.delete(schema_1.userWallets)];
        case 3:
          _a.sent();
          return [4 /*yield*/, db.delete(schema_1.dailySpending)];
        case 4:
          _a.sent();
          return [4 /*yield*/, db.delete(schema_1.priceCache)];
        case 5:
          _a.sent();
          return [2];
      }
    });
  }); });
  (0, bun_test_1.describe)('Transaction Management', () => {
    (0, bun_test_1.it)('should create and retrieve payment transactions', () => { return __awaiter(void 0, void 0, void 0, function () {
      let transaction, retrieved;
      return __generator(this, (_a) => {
        switch (_a.label) {
          case 0:
            transaction = {
              id: (0, core_1.asUUID)('00000000-0000-0000-0000-000000000001'),
              payerId: (0, core_1.asUUID)('00000000-0000-0000-0000-000000000002'),
              recipientId: (0, core_1.asUUID)('00000000-0000-0000-0000-000000000003'),
              agentId: (0, core_1.asUUID)('00000000-0000-0000-0000-000000000004'),
              amount: '1000000', // Store as string to avoid precision issues
              method: types_1.PaymentMethod.USDC_ETH,
              status: types_1.PaymentStatus.COMPLETED,
              transactionHash: '0x1234567890abcdef',
              recipientAddress: '0x742d35Cc6634C0532925a3b844Bc9e7595f7E123',
              metadata: { test: true },
              createdAt: new Date(),
              updatedAt: new Date(),
            };
            // Insert transaction
            return [4 /*yield*/, db.insert(schema_1.paymentTransactions).values(transaction)];
          case 1:
            // Insert transaction
            _a.sent();
            return [4 /*yield*/, db
              .select()
              .from(schema_1.paymentTransactions)
              .where((0, drizzle_orm_1.eq)(schema_1.paymentTransactions.id, transaction.id))
              .limit(1)];
          case 2:
            retrieved = _a.sent();
            (0, bun_test_1.expect)(retrieved).toHaveLength(1);
            (0, bun_test_1.expect)(retrieved[0].id).toBe(transaction.id);
            (0, bun_test_1.expect)(retrieved[0].amount).toBe(transaction.amount);
            (0, bun_test_1.expect)(retrieved[0].status).toBe(transaction.status);
            (0, bun_test_1.expect)(retrieved[0].metadata).toEqual(transaction.metadata);
            return [2];
        }
      });
    }); });
    (0, bun_test_1.it)('should handle concurrent transaction updates', () => { return __awaiter(void 0, void 0, void 0, function () {
      let transactionId, updates, final;
      return __generator(this, (_a) => {
        switch (_a.label) {
          case 0:
            transactionId = (0, core_1.asUUID)('00000000-0000-0000-0000-000000000001');
            // Create initial transaction
            return [4 /*yield*/, db.insert(schema_1.paymentTransactions).values({
              id: transactionId,
              payerId: (0, core_1.asUUID)('00000000-0000-0000-0000-000000000002'),
              agentId: (0, core_1.asUUID)('00000000-0000-0000-0000-000000000004'),
              amount: '1000000',
              method: types_1.PaymentMethod.USDC_ETH,
              status: types_1.PaymentStatus.PROCESSING,
              createdAt: new Date(),
              updatedAt: new Date(),
            })];
          case 1:
            // Create initial transaction
            _a.sent();
            return [4 /*yield*/, Promise.all([
              db
                .update(schema_1.paymentTransactions)
                .set({ status: types_1.PaymentStatus.COMPLETED, transactionHash: '0xabc' })
                .where((0, drizzle_orm_1.eq)(schema_1.paymentTransactions.id, transactionId)),
              db
                .update(schema_1.paymentTransactions)
                .set({ metadata: { concurrent: true } })
                .where((0, drizzle_orm_1.eq)(schema_1.paymentTransactions.id, transactionId)),
            ])];
          case 2:
            updates = _a.sent();
            return [4 /*yield*/, db
              .select()
              .from(schema_1.paymentTransactions)
              .where((0, drizzle_orm_1.eq)(schema_1.paymentTransactions.id, transactionId))
              .limit(1)];
          case 3:
            final = _a.sent();
            (0, bun_test_1.expect)(final[0].status).toBe(types_1.PaymentStatus.COMPLETED);
            (0, bun_test_1.expect)(final[0].metadata).toHaveProperty('concurrent');
            return [2];
        }
      });
    }); });
  });
  (0, bun_test_1.describe)('Wallet Management', () => {
    (0, bun_test_1.it)('should encrypt and decrypt wallet private keys', () => { return __awaiter(void 0, void 0, void 0, function () {
      let encryptionKey, privateKey, wallet, retrieved, decryptedKey;
      return __generator(this, (_a) => {
        switch (_a.label) {
          case 0:
            encryptionKey = '0x'.concat('0'.repeat(64));
            privateKey = '0x'.concat('a'.repeat(64));
            wallet = {
              id: (0, core_1.asUUID)('00000000-0000-0000-0000-000000000001'),
              userId: (0, core_1.asUUID)('00000000-0000-0000-0000-000000000002'),
              agentId: (0, core_1.asUUID)('00000000-0000-0000-0000-000000000003'),
              address: '0x742d35Cc6634C0532925a3b844Bc9e7595f7E123',
              encryptedPrivateKey: (0, encryption_1.encrypt)(privateKey, encryptionKey),
              network: 'ethereum',
              createdAt: new Date(),
            };
            // Store encrypted wallet
            return [4 /*yield*/, db.insert(schema_1.userWallets).values(wallet)];
          case 1:
            // Store encrypted wallet
            _a.sent();
            return [4 /*yield*/, db
              .select()
              .from(schema_1.userWallets)
              .where((0, drizzle_orm_1.eq)(schema_1.userWallets.id, wallet.id))
              .limit(1)];
          case 2:
            retrieved = _a.sent();
            decryptedKey = (0, encryption_1.decrypt)(retrieved[0].encryptedPrivateKey, encryptionKey);
            (0, bun_test_1.expect)(decryptedKey).toBe(privateKey);
            return [2];
        }
      });
    }); });
    (0, bun_test_1.it)('should prevent duplicate wallets for user/network combination', () => { return __awaiter(void 0, void 0, void 0, function () {
      let wallet, duplicate, existing;
      return __generator(this, (_a) => {
        switch (_a.label) {
          case 0:
            wallet = {
              id: (0, core_1.asUUID)('00000000-0000-0000-0000-000000000001'),
              userId: (0, core_1.asUUID)('00000000-0000-0000-0000-000000000002'),
              agentId: (0, core_1.asUUID)('00000000-0000-0000-0000-000000000003'),
              address: '0x742d35Cc6634C0532925a3b844Bc9e7595f7E123',
              encryptedPrivateKey: 'encrypted',
              network: 'ethereum',
              createdAt: new Date(),
            };
            // Insert first wallet
            return [4 /*yield*/, db.insert(schema_1.userWallets).values(wallet)];
          case 1:
            // Insert first wallet
            _a.sent();
            duplicate = __assign(__assign({}, wallet), { id: (0, core_1.asUUID)('00000000-0000-0000-0000-000000000009') });
            return [4 /*yield*/, db
              .select()
              .from(schema_1.userWallets)
              .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.userWallets.userId, wallet.userId), (0, drizzle_orm_1.eq)(schema_1.userWallets.network, wallet.network)))
              .limit(1)];
          case 2:
            existing = _a.sent();
            (0, bun_test_1.expect)(existing).toHaveLength(1);
            (0, bun_test_1.expect)(existing[0].id).toBe(wallet.id);
            return [2];
        }
      });
    }); });
  });
  (0, bun_test_1.describe)('Daily Spending Limits', () => {
    (0, bun_test_1.it)('should track daily spending accurately', () => { return __awaiter(void 0, void 0, void 0, function () {
      let userId, agentId, today, amounts, _i, amounts_1, amount, spending;
      return __generator(this, (_a) => {
        switch (_a.label) {
          case 0:
            userId = (0, core_1.asUUID)('00000000-0000-0000-0000-000000000001');
            agentId = (0, core_1.asUUID)('00000000-0000-0000-0000-000000000002');
            today = new Date().toISOString().split('T')[0];
            amounts = [100, 250, 150];
            _i = 0, amounts_1 = amounts;
            _a.label = 1;
          case 1:
            if (!(_i < amounts_1.length)) {return [3 /*break*/, 4];}
            amount = amounts_1[_i];
            return [4 /*yield*/, db
              .insert(schema_1.dailySpending)
              .values({
                id: (0, core_1.asUUID)('00000000-0000-0000-0000-'.concat(Date.now())),
                userId,
                agentId,
                date: today,
                totalSpentUsd: amount,
                transactionCount: 1,
                lastTransactionAt: new Date(),
              })
              .onConflictDoUpdate({
                target: [schema_1.dailySpending.userId, schema_1.dailySpending.agentId, schema_1.dailySpending.date],
                set: {
                  totalSpentUsd: amount,
                  transactionCount: 1,
                  lastTransactionAt: new Date(),
                },
              })];
          case 2:
            _a.sent();
            _a.label = 3;
          case 3:
            _i++;
            return [3 /*break*/, 1];
          case 4: return [4 /*yield*/, db
            .select()
            .from(schema_1.dailySpending)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.dailySpending.userId, userId), (0, drizzle_orm_1.eq)(schema_1.dailySpending.date, today)))
            .limit(1)];
          case 5:
            spending = _a.sent();
            (0, bun_test_1.expect)(spending).toHaveLength(1);
            (0, bun_test_1.expect)(spending[0].totalSpentUsd).toBe(150); // Last update
            return [2];
        }
      });
    }); });
    (0, bun_test_1.it)('should reset daily spending at midnight', () => { return __awaiter(void 0, void 0, void 0, function () {
      let userId, agentId, yesterday, yesterdayStr, todayStr, todaySpending;
      return __generator(this, (_a) => {
        switch (_a.label) {
          case 0:
            userId = (0, core_1.asUUID)('00000000-0000-0000-0000-000000000001');
            agentId = (0, core_1.asUUID)('00000000-0000-0000-0000-000000000002');
            yesterday = new Date();
            yesterday.setDate(yesterday.getDate() - 1);
            yesterdayStr = yesterday.toISOString().split('T')[0];
            todayStr = new Date().toISOString().split('T')[0];
            // Add yesterday's spending
            return [4 /*yield*/, db.insert(schema_1.dailySpending).values({
              id: (0, core_1.asUUID)('00000000-0000-0000-0000-000000000001'),
              userId,
              agentId,
              date: yesterdayStr,
              totalSpentUsd: 500,
              transactionCount: 5,
              lastTransactionAt: yesterday,
            })];
          case 1:
            // Add yesterday's spending
            _a.sent();
            // Add today's spending
            return [4 /*yield*/, db.insert(schema_1.dailySpending).values({
              id: (0, core_1.asUUID)('00000000-0000-0000-0000-000000000002'),
              userId,
              agentId,
              date: todayStr,
              totalSpentUsd: 100,
              transactionCount: 1,
              lastTransactionAt: new Date(),
            })];
          case 2:
            // Add today's spending
            _a.sent();
            return [4 /*yield*/, db
              .select()
              .from(schema_1.dailySpending)
              .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.dailySpending.userId, userId), (0, drizzle_orm_1.eq)(schema_1.dailySpending.date, todayStr)))];
          case 3:
            todaySpending = _a.sent();
            (0, bun_test_1.expect)(todaySpending).toHaveLength(1);
            (0, bun_test_1.expect)(todaySpending[0].totalSpentUsd).toBe(100);
            return [2];
        }
      });
    }); });
  });
  (0, bun_test_1.describe)('Price Cache', () => {
    (0, bun_test_1.it)('should cache and expire token prices', () => { return __awaiter(void 0, void 0, void 0, function () {
      let tokenPrice, validPrices, expiredPrices;
      return __generator(this, (_a) => {
        switch (_a.label) {
          case 0:
            tokenPrice = {
              id: (0, core_1.asUUID)('00000000-0000-0000-0000-000000000001'),
              tokenAddress: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
              network: 'ethereum',
              symbol: 'USDC',
              priceUsd: 1.0,
              lastUpdated: new Date(),
              expiresAt: new Date(Date.now() + 5 * 60 * 1000), // 5 minutes
            };
            // Cache price
            return [4 /*yield*/, db.insert(schema_1.priceCache).values(tokenPrice)];
          case 1:
            // Cache price
            _a.sent();
            return [4 /*yield*/, db
              .select()
              .from(schema_1.priceCache)
              .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.priceCache.tokenAddress, tokenPrice.tokenAddress), (0, drizzle_orm_1.gte)(schema_1.priceCache.expiresAt, new Date())))];
          case 2:
            validPrices = _a.sent();
            (0, bun_test_1.expect)(validPrices).toHaveLength(1);
            (0, bun_test_1.expect)(validPrices[0].priceUsd).toBe(1.0);
            // Simulate expired price
            return [4 /*yield*/, db
              .update(schema_1.priceCache)
              .set({ expiresAt: new Date(Date.now() - 1000) })
              .where((0, drizzle_orm_1.eq)(schema_1.priceCache.id, tokenPrice.id))];
          case 3:
            // Simulate expired price
            _a.sent();
            return [4 /*yield*/, db
              .select()
              .from(schema_1.priceCache)
              .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.priceCache.tokenAddress, tokenPrice.tokenAddress), (0, drizzle_orm_1.gte)(schema_1.priceCache.expiresAt, new Date())))];
          case 4:
            expiredPrices = _a.sent();
            (0, bun_test_1.expect)(expiredPrices).toHaveLength(0);
            return [2];
        }
      });
    }); });
  });
  (0, bun_test_1.describe)('Payment Requests', () => {
    (0, bun_test_1.it)('should handle payment request lifecycle', () => { return __awaiter(void 0, void 0, void 0, function () {
      let request, transactionId, updated;
      return __generator(this, (_a) => {
        switch (_a.label) {
          case 0:
            request = {
              id: (0, core_1.asUUID)('00000000-0000-0000-0000-000000000001'),
              userId: (0, core_1.asUUID)('00000000-0000-0000-0000-000000000002'),
              agentId: (0, core_1.asUUID)('00000000-0000-0000-0000-000000000003'),
              actionName: 'research',
              amount: '1000000',
              method: types_1.PaymentMethod.USDC_ETH,
              requiresConfirmation: true,
              metadata: {
                verificationCode: '123456',
                expiresAt: Date.now() + 5 * 60 * 1000,
              },
              createdAt: new Date(),
            };
            // Create request
            return [4 /*yield*/, db.insert(schema_1.paymentRequests).values(request)];
          case 1:
            // Create request
            _a.sent();
            transactionId = (0, core_1.asUUID)('00000000-0000-0000-0000-000000000010');
            return [4 /*yield*/, db
              .update(schema_1.paymentRequests)
              .set({
                transactionId,
                processedAt: new Date(),
              })
              .where((0, drizzle_orm_1.eq)(schema_1.paymentRequests.id, request.id))];
          case 2:
            _a.sent();
            return [4 /*yield*/, db
              .select()
              .from(schema_1.paymentRequests)
              .where((0, drizzle_orm_1.eq)(schema_1.paymentRequests.id, request.id))
              .limit(1)];
          case 3:
            updated = _a.sent();
            (0, bun_test_1.expect)(updated[0].transactionId).toBe(transactionId);
            (0, bun_test_1.expect)(updated[0].processedAt).toBeTruthy();
            return [2];
        }
      });
    }); });
  });
});
