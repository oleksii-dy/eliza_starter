'use strict';
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
const core_1 = require('@elizaos/core');
const test_runtime_1 = require('./helpers/test-runtime');
const PaymentService_1 = require('../services/PaymentService');
const researchAction_1 = require('../actions/researchAction');
const types_1 = require('../types');
const index_1 = require('../index');
(0, bun_test_1.describe)('Payment Plugin Runtime Integration', () => {
  let runtime;
  let paymentService;
  (0, bun_test_1.beforeAll)(() => { return __awaiter(void 0, void 0, void 0, function () {
    return __generator(this, (_a) => {
      switch (_a.label) {
        case 0:
          console.info('Setting up runtime integration test');
          // Create mock runtime with payment-specific settings
          runtime = (0, test_runtime_1.createMockRuntime)({
            character: {
              id: (0, core_1.stringToUuid)('test-payment-agent'),
              name: 'PaymentTestAgent',
              username: 'payment_test',
              bio: 'A test agent for payment functionality',
              plugins: [index_1.paymentPlugin.name],
            },
          });
          // Initialize payment service
          paymentService = new PaymentService_1.PaymentService();
          return [4 /*yield*/, paymentService.initialize(runtime)];
        case 1:
          _a.sent();
          (0, bun_test_1.expect)(paymentService).toBeDefined();
          (0, bun_test_1.expect)(paymentService).toBeInstanceOf(PaymentService_1.PaymentService);
          return [2];
      }
    });
  }); });
  (0, bun_test_1.afterAll)(() => { return __awaiter(void 0, void 0, void 0, function () {
    return __generator(this, (_a) => {
      switch (_a.label) {
        case 0:
          if (!paymentService) {return [3 /*break*/, 2];}
          return [4 /*yield*/, paymentService.stop()];
        case 1:
          _a.sent();
          _a.label = 2;
        case 2: return [2];
      }
    });
  }); });
  (0, bun_test_1.describe)('Core Functionality', () => {
    (0, bun_test_1.it)('should validate payment requests', () => { return __awaiter(void 0, void 0, void 0, function () {
      let invalidRequests, _i, invalidRequests_1, request, result;
      return __generator(this, (_a) => {
        switch (_a.label) {
          case 0:
            invalidRequests = [
              {
                // Missing recipient address
                id: (0, core_1.asUUID)((0, core_1.stringToUuid)('test-invalid-1')),
                userId: (0, core_1.asUUID)((0, core_1.stringToUuid)('test-user')),
                agentId: runtime.agentId,
                actionName: 'test',
                amount: BigInt(1000000),
                method: types_1.PaymentMethod.ETH,
                metadata: {},
              },
              {
                // Invalid amount (0)
                id: (0, core_1.asUUID)((0, core_1.stringToUuid)('test-invalid-2')),
                userId: (0, core_1.asUUID)((0, core_1.stringToUuid)('test-user')),
                agentId: runtime.agentId,
                actionName: 'test',
                amount: BigInt(0),
                method: types_1.PaymentMethod.ETH,
                recipientAddress: '0x'.concat('0'.repeat(40)),
                metadata: {},
              },
            ];
            _i = 0, invalidRequests_1 = invalidRequests;
            _a.label = 1;
          case 1:
            if (!(_i < invalidRequests_1.length)) {return [3 /*break*/, 4];}
            request = invalidRequests_1[_i];
            return [4 /*yield*/, paymentService.processPayment(request, runtime)];
          case 2:
            result = _a.sent();
            // processPayment returns a result with status FAILED instead of throwing
            (0, bun_test_1.expect)(result.status).toBe(types_1.PaymentStatus.FAILED);
            (0, bun_test_1.expect)(result.error).toBeDefined();
            _a.label = 3;
          case 3:
            _i++;
            return [3 /*break*/, 1];
          case 4: return [2];
        }
      });
    }); });
    (0, bun_test_1.it)('should check wallet encryption', () => { return __awaiter(void 0, void 0, void 0, function () {
      let userId, error_1, encryptionKey;
      return __generator(this, (_a) => {
        switch (_a.label) {
          case 0:
            userId = (0, core_1.asUUID)((0, core_1.stringToUuid)('test-user-encryption'));
            _a.label = 1;
          case 1:
            _a.trys.push([1, 3, , 4]);
            return [4 /*yield*/, paymentService.getUserBalance(userId, runtime)];
          case 2:
            _a.sent();
            return [3 /*break*/, 4];
          case 3:
            error_1 = _a.sent();
            return [3 /*break*/, 4];
          case 4:
            encryptionKey = runtime.getSetting('WALLET_ENCRYPTION_KEY');
            (0, bun_test_1.expect)(encryptionKey).toBeDefined();
            (0, bun_test_1.expect)(encryptionKey).toHaveLength(66); // '0x' + 64 hex chars
            return [2];
        }
      });
    }); });
  });
  (0, bun_test_1.describe)('Payment Service Configuration', () => {
    (0, bun_test_1.it)('should have proper settings', () => {
      const settings = paymentService.getSettings();
      (0, bun_test_1.expect)(settings).toBeDefined();
      (0, bun_test_1.expect)(settings.autoApprovalEnabled).toBe(true);
      (0, bun_test_1.expect)(settings.autoApprovalThreshold).toBe(10);
      (0, bun_test_1.expect)(settings.maxDailySpend).toBe(1000);
    });
    (0, bun_test_1.it)('should have proper capabilities', () => { return __awaiter(void 0, void 0, void 0, function () {
      let capabilities;
      return __generator(this, (_a) => {
        switch (_a.label) {
          case 0: return [4 /*yield*/, paymentService.getCapabilities()];
          case 1:
            capabilities = _a.sent();
            (0, bun_test_1.expect)(capabilities.supportedMethods.length).toBeGreaterThan(0);
            (0, bun_test_1.expect)(capabilities.supportedMethods).toContain(types_1.PaymentMethod.ETH);
            (0, bun_test_1.expect)(capabilities.supportedMethods).toContain(types_1.PaymentMethod.USDC_ETH);
            (0, bun_test_1.expect)(capabilities.features.autoApproval).toBe(true);
            (0, bun_test_1.expect)(capabilities.limits.dailyLimit).toBe(1000);
            return [2];
        }
      });
    }); });
  });
  (0, bun_test_1.describe)('Research Action Integration', () => {
    (0, bun_test_1.it)('should validate research requests', () => { return __awaiter(void 0, void 0, void 0, function () {
      let message, isValid;
      return __generator(this, (_a) => {
        switch (_a.label) {
          case 0:
            message = (0, test_runtime_1.createTestMemory)({
              content: {
                text: 'Research blockchain scalability solutions',
              },
            });
            return [4 /*yield*/, researchAction_1.researchAction.validate(runtime, message)];
          case 1:
            isValid = _a.sent();
            (0, bun_test_1.expect)(isValid).toBe(true);
            return [2];
        }
      });
    }); });
    (0, bun_test_1.it)('should handle research payment flow', () => { return __awaiter(void 0, void 0, void 0, function () {
      let message, callback, response, text;
      let _a;
      return __generator(this, (_b) => {
        switch (_b.label) {
          case 0:
            message = (0, test_runtime_1.createTestMemory)({
              content: {
                text: 'Can you research AI trends?',
              },
            });
            callback = (0, bun_test_1.mock)();
            return [4 /*yield*/, researchAction_1.researchAction.handler(runtime, message, undefined, {}, callback)];
          case 1:
            _b.sent();
            (0, bun_test_1.expect)(callback).toHaveBeenCalled();
            response = callback.mock.calls[0][0];
            text = ((_a = response.text) === null || _a === void 0 ? void 0 : _a.toLowerCase()) || '';
            (0, bun_test_1.expect)(text).toMatch(/payment|insufficient|funds|wallet|error/);
            return [2];
        }
      });
    }); });
  });
  (0, bun_test_1.describe)('CrossmintAdapter Integration', () => {
    (0, bun_test_1.it)('should load CrossmintAdapter when Crossmint services are available', () => { return __awaiter(void 0, void 0, void 0, function () {
      let paymentService, capabilities;
      return __generator(this, (_a) => {
        switch (_a.label) {
          case 0:
            paymentService = runtime.getService('payment');
            return [4 /*yield*/, paymentService.getCapabilities()];
          case 1:
            capabilities = _a.sent();
            // Check if Crossmint payment methods are supported
            (0, bun_test_1.expect)(capabilities.supportedMethods).toContain(types_1.PaymentMethod.ETH);
            (0, bun_test_1.expect)(capabilities.supportedMethods).toContain(types_1.PaymentMethod.USDC_ETH);
            (0, bun_test_1.expect)(capabilities.supportedMethods).toContain(types_1.PaymentMethod.SOL);
            return [2];
        }
      });
    }); });
    (0, bun_test_1.it)('should process payment with CrossmintAdapter', () => { return __awaiter(void 0, void 0, void 0, function () {
      let paymentService, paymentRequest, result;
      return __generator(this, (_a) => {
        switch (_a.label) {
          case 0:
            paymentService = runtime.getService('payment');
            paymentRequest = {
              id: (0, core_1.asUUID)('00000000-0000-0000-0000-000000000001'),
              userId: (0, core_1.asUUID)('00000000-0000-0000-0000-000000000002'),
              agentId: runtime.agentId,
              actionName: 'test-payment',
              amount: BigInt(1000000), // 1 USDC
              method: types_1.PaymentMethod.USDC_ETH,
              recipientAddress: '0x742d35Cc6634C0532925a3b844Bc9e7595f2bD3e',
              metadata: {
                test: true,
                adapter: 'crossmint',
              },
            };
            return [4 /*yield*/, paymentService.processPayment(paymentRequest, runtime)];
          case 1:
            result = _a.sent();
            (0, bun_test_1.expect)(result).toBeDefined();
            (0, bun_test_1.expect)(result.id).toBe(paymentRequest.id);
            (0, bun_test_1.expect)(result.status).toBeDefined();
            // Check if it attempted to use Crossmint (would fail due to missing wallet)
            if (result.status === types_1.PaymentStatus.FAILED) {
              (0, bun_test_1.expect)(result.error).toBeDefined();
            }
            return [2];
        }
      });
    }); });
    (0, bun_test_1.it)('should get user balance through CrossmintAdapter', () => { return __awaiter(void 0, void 0, void 0, function () {
      let paymentService, userId, balances;
      return __generator(this, (_a) => {
        switch (_a.label) {
          case 0:
            paymentService = runtime.getService('payment');
            userId = (0, core_1.asUUID)('00000000-0000-0000-0000-000000000002');
            return [4 /*yield*/, paymentService.getUserBalance(userId, runtime)];
          case 1:
            balances = _a.sent();
            (0, bun_test_1.expect)(balances).toBeDefined();
            (0, bun_test_1.expect)(balances).toBeInstanceOf(Map);
            return [2];
        }
      });
    }); });
  });
  (0, bun_test_1.describe)('Service Interactions', () => {
    (0, bun_test_1.it)('should use price oracle for currency conversion', () => { return __awaiter(void 0, void 0, void 0, function () {
      let priceOracleService, ethAmount, usdValue;
      return __generator(this, (_a) => {
        switch (_a.label) {
          case 0:
            priceOracleService = runtime.getService('priceOracle');
            // Skip test if price oracle service is not available
            if (!priceOracleService) {
              console.warn('Price oracle service not available, skipping test');
              return [2];
            }
            ethAmount = BigInt('1000000000000000000');
            return [4 /*yield*/, priceOracleService.convertToUSD(ethAmount, types_1.PaymentMethod.ETH)];
          case 1:
            usdValue = _a.sent();
            (0, bun_test_1.expect)(usdValue).toBeGreaterThan(0);
            return [2];
        }
      });
    }); });
    (0, bun_test_1.it)('should handle payment with auto-approval', () => { return __awaiter(void 0, void 0, void 0, function () {
      let paymentService, paymentRequest, result;
      let _a;
      return __generator(this, (_b) => {
        switch (_b.label) {
          case 0:
            paymentService = runtime.getService('payment');
            paymentRequest = {
              id: (0, core_1.asUUID)('00000000-0000-0000-0000-000000000003'),
              userId: (0, core_1.asUUID)('00000000-0000-0000-0000-000000000002'),
              agentId: runtime.agentId,
              actionName: 'small-payment',
              amount: BigInt(5000000), // 5 USDC (under $10 threshold)
              method: types_1.PaymentMethod.USDC_ETH,
              recipientAddress: '0x742d35Cc6634C0532925a3b844Bc9e7595f2bD3e',
            };
            return [4 /*yield*/, paymentService.processPayment(paymentRequest, runtime)];
          case 1:
            result = _b.sent();
            (0, bun_test_1.expect)(result).toBeDefined();
            // Should not require confirmation due to auto-approval
            (0, bun_test_1.expect)((_a = result.metadata) === null || _a === void 0 ? void 0 : _a.pendingReason).not.toBe('USER_CONFIRMATION_REQUIRED');
            return [2];
        }
      });
    }); });
    (0, bun_test_1.it)('should require confirmation for large payments', () => { return __awaiter(void 0, void 0, void 0, function () {
      let paymentService, paymentRequest, result;
      let _a;
      return __generator(this, (_b) => {
        switch (_b.label) {
          case 0:
            paymentService = runtime.getService('payment');
            paymentRequest = {
              id: (0, core_1.asUUID)('00000000-0000-0000-0000-000000000004'),
              userId: (0, core_1.asUUID)('00000000-0000-0000-0000-000000000002'),
              agentId: runtime.agentId,
              actionName: 'large-payment',
              amount: BigInt(50000000), // 50 USDC (over $10 threshold)
              method: types_1.PaymentMethod.USDC_ETH,
              recipientAddress: '0x742d35Cc6634C0532925a3b844Bc9e7595f2bD3e',
              requiresConfirmation: true,
            };
            return [4 /*yield*/, paymentService.processPayment(paymentRequest, runtime)];
          case 1:
            result = _b.sent();
            (0, bun_test_1.expect)(result).toBeDefined();
            // In test environment without wallet service, payment may fail or be pending
            (0, bun_test_1.expect)([types_1.PaymentStatus.PENDING, types_1.PaymentStatus.FAILED]).toContain(result.status);
            // If it succeeded as pending, check the reason
            if (result.status === types_1.PaymentStatus.PENDING) {
              (0, bun_test_1.expect)((_a = result.metadata) === null || _a === void 0 ? void 0 : _a.pendingReason).toBe('USER_CONFIRMATION_REQUIRED');
            }
            return [2];
        }
      });
    }); });
  });
  (0, bun_test_1.describe)('Error Handling', () => {
    (0, bun_test_1.it)('should handle missing wallet adapter gracefully', () => { return __awaiter(void 0, void 0, void 0, function () {
      let paymentService, paymentRequest, result;
      return __generator(this, (_a) => {
        switch (_a.label) {
          case 0:
            paymentService = runtime.getService('payment');
            paymentRequest = {
              id: (0, core_1.asUUID)('00000000-0000-0000-0000-000000000005'),
              userId: (0, core_1.asUUID)('00000000-0000-0000-0000-000000000002'),
              agentId: runtime.agentId,
              actionName: 'unsupported-payment',
              amount: BigInt(1000000),
              method: types_1.PaymentMethod.BTC, // Not supported by any adapter
              recipientAddress: 'bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh',
            };
            return [4 /*yield*/, paymentService.processPayment(paymentRequest, runtime)];
          case 1:
            result = _a.sent();
            (0, bun_test_1.expect)(result).toBeDefined();
            (0, bun_test_1.expect)(result.status).toBe(types_1.PaymentStatus.FAILED);
            (0, bun_test_1.expect)(result.error).toContain('not supported');
            return [2];
        }
      });
    }); });
    (0, bun_test_1.it)('should handle database errors', () => { return __awaiter(void 0, void 0, void 0, function () {
      let paymentService, paymentRequest, result, error_2;
      return __generator(this, (_a) => {
        switch (_a.label) {
          case 0:
            paymentService = runtime.getService('payment');
            paymentRequest = {
              id: (0, core_1.asUUID)('00000000-0000-0000-0000-000000000006'),
              userId: (0, core_1.asUUID)('00000000-0000-0000-0000-000000000002'),
              agentId: runtime.agentId,
              actionName: 'db-error-payment',
              amount: BigInt(1000000),
              method: types_1.PaymentMethod.USDC_ETH,
              recipientAddress: '0x742d35Cc6634C0532925a3b844Bc9e7595f2bD3e',
            };
            _a.label = 1;
          case 1:
            _a.trys.push([1, 3, , 4]);
            return [4 /*yield*/, paymentService.processPayment(paymentRequest, runtime)];
          case 2:
            result = _a.sent();
            (0, bun_test_1.expect)(result).toBeDefined();
            // The payment should either succeed or fail gracefully
            (0, bun_test_1.expect)([types_1.PaymentStatus.PENDING, types_1.PaymentStatus.FAILED, types_1.PaymentStatus.COMPLETED]).toContain(result.status);
            return [3 /*break*/, 4];
          case 3:
            error_2 = _a.sent();
            // If an error is thrown, ensure it's handled gracefully
            (0, bun_test_1.expect)(error_2).toBeDefined();
            (0, bun_test_1.expect)(error_2 instanceof Error).toBe(true);
            return [3 /*break*/, 4];
          case 4: return [2];
        }
      });
    }); });
  });
  (0, bun_test_1.describe)('Multi-Adapter Support', () => {
    (0, bun_test_1.it)('should support multiple payment methods across adapters', () => { return __awaiter(void 0, void 0, void 0, function () {
      let paymentService, capabilities, expectedMethods;
      return __generator(this, (_a) => {
        switch (_a.label) {
          case 0:
            paymentService = runtime.getService('payment');
            return [4 /*yield*/, paymentService.getCapabilities()];
          case 1:
            capabilities = _a.sent();
            expectedMethods = [
              types_1.PaymentMethod.USDC_ETH,
              types_1.PaymentMethod.ETH,
              types_1.PaymentMethod.SOL,
              types_1.PaymentMethod.USDC_SOL,
            ];
            expectedMethods.forEach((method) => {
              (0, bun_test_1.expect)(capabilities.supportedMethods).toContain(method);
            });
            return [2];
        }
      });
    }); });
    (0, bun_test_1.it)('should select correct adapter for payment method', () => { return __awaiter(void 0, void 0, void 0, function () {
      let paymentService, ethPayment, ethResult, solPayment, solResult;
      return __generator(this, (_a) => {
        switch (_a.label) {
          case 0:
            paymentService = runtime.getService('payment');
            ethPayment = {
              id: (0, core_1.asUUID)('00000000-0000-0000-0000-000000000007'),
              userId: (0, core_1.asUUID)('00000000-0000-0000-0000-000000000002'),
              agentId: runtime.agentId,
              actionName: 'eth-payment',
              amount: BigInt('1000000000000000000'), // 1 ETH
              method: types_1.PaymentMethod.ETH,
              recipientAddress: '0x742d35Cc6634C0532925a3b844Bc9e7595f2bD3e',
            };
            return [4 /*yield*/, paymentService.processPayment(ethPayment, runtime)];
          case 1:
            ethResult = _a.sent();
            (0, bun_test_1.expect)(ethResult).toBeDefined();
            solPayment = {
              id: (0, core_1.asUUID)('00000000-0000-0000-0000-000000000008'),
              userId: (0, core_1.asUUID)('00000000-0000-0000-0000-000000000002'),
              agentId: runtime.agentId,
              actionName: 'sol-payment',
              amount: BigInt('1000000000'), // 1 SOL
              method: types_1.PaymentMethod.SOL,
              recipientAddress: '7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZjDpNqYV4N',
            };
            return [4 /*yield*/, paymentService.processPayment(solPayment, runtime)];
          case 2:
            solResult = _a.sent();
            (0, bun_test_1.expect)(solResult).toBeDefined();
            return [2];
        }
      });
    }); });
  });
  (0, bun_test_1.describe)('Settings Management', () => {
    (0, bun_test_1.it)('should update payment settings', () => { return __awaiter(void 0, void 0, void 0, function () {
      let paymentService, settings;
      return __generator(this, (_a) => {
        switch (_a.label) {
          case 0:
            paymentService = runtime.getService('payment');
            // Update settings
            return [4 /*yield*/, paymentService.updateSettings({
              autoApprovalThreshold: 25,
              maxDailySpend: 2000,
            })];
          case 1:
            // Update settings
            _a.sent();
            settings = paymentService.getSettings();
            (0, bun_test_1.expect)(settings.autoApprovalThreshold).toBe(25);
            (0, bun_test_1.expect)(settings.maxDailySpend).toBe(2000);
            return [2];
        }
      });
    }); });
    (0, bun_test_1.it)('should persist settings to runtime', () => { return __awaiter(void 0, void 0, void 0, function () {
      let paymentService, runtimeSetting;
      return __generator(this, (_a) => {
        switch (_a.label) {
          case 0:
            paymentService = runtime.getService('payment');
            return [4 /*yield*/, paymentService.updateSettings({
              requireConfirmation: true,
            })];
          case 1:
            _a.sent();
            runtimeSetting = runtime.getSetting('PAYMENT_REQUIRE_CONFIRMATION');
            (0, bun_test_1.expect)(runtimeSetting).toBe('true');
            return [2];
        }
      });
    }); });
  });
});
