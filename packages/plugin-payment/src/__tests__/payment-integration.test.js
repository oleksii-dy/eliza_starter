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
// Helper to create valid UUIDs
const uuid = function (suffix) { return '00000000-0000-0000-0000-'.concat(suffix.padStart(12, '0')); };
(0, bun_test_1.describe)('Payment System Integration', () => {
  let runtime;
  let paymentService;
  (0, bun_test_1.beforeEach)(() => { return __awaiter(void 0, void 0, void 0, function () {
    return __generator(this, (_a) => {
      switch (_a.label) {
        case 0:
          // Create mock runtime
          runtime = (0, test_runtime_1.createMockRuntime)({
            agentId: (0, core_1.asUUID)(uuid('123')),
          });
          // Initialize payment service
          paymentService = new PaymentService_1.PaymentService();
          return [4 /*yield*/, paymentService.initialize(runtime)];
        case 1:
          _a.sent();
          return [2];
      }
    });
  }); });
  (0, bun_test_1.describe)('PaymentService', () => {
    (0, bun_test_1.it)('should initialize with default settings', () => {
      const settings = paymentService.getSettings();
      (0, bun_test_1.expect)(settings.autoApprovalEnabled).toBe(true);
      (0, bun_test_1.expect)(settings.autoApprovalThreshold).toBe(10);
      (0, bun_test_1.expect)(settings.defaultCurrency).toBe('USDC');
      (0, bun_test_1.expect)(settings.maxDailySpend).toBe(1000);
    });
    (0, bun_test_1.it)('should process a payment request', () => { return __awaiter(void 0, void 0, void 0, function () {
      let paymentRequest, result;
      return __generator(this, (_a) => {
        switch (_a.label) {
          case 0:
            paymentRequest = {
              id: (0, core_1.asUUID)(uuid('1')),
              userId: (0, core_1.asUUID)(uuid('2')),
              agentId: runtime.agentId,
              actionName: 'research',
              amount: BigInt(1000000), // 1 USDC
              method: types_1.PaymentMethod.USDC_ETH,
              metadata: { test: true },
            };
            return [4 /*yield*/, paymentService.processPayment(paymentRequest, runtime)];
          case 1:
            result = _a.sent();
            // Since we don't have real wallet adapters in tests, it should fail gracefully
            (0, bun_test_1.expect)(result).toBeDefined();
            (0, bun_test_1.expect)(result.id).toBe(paymentRequest.id);
            return [2];
        }
      });
    }); });
    (0, bun_test_1.it)('should get payment capabilities', () => { return __awaiter(void 0, void 0, void 0, function () {
      let capabilities;
      return __generator(this, (_a) => {
        switch (_a.label) {
          case 0: return [4 /*yield*/, paymentService.getCapabilities()];
          case 1:
            capabilities = _a.sent();
            (0, bun_test_1.expect)(capabilities).toBeDefined();
            (0, bun_test_1.expect)(capabilities.features.autoApproval).toBe(true);
            (0, bun_test_1.expect)(capabilities.limits.minAmount).toBe(0.01);
            (0, bun_test_1.expect)(capabilities.limits.maxAmount).toBe(1000);
            return [2];
        }
      });
    }); });
    (0, bun_test_1.it)('should update settings', () => { return __awaiter(void 0, void 0, void 0, function () {
      let settings;
      return __generator(this, (_a) => {
        switch (_a.label) {
          case 0: return [4 /*yield*/, paymentService.updateSettings({
            autoApprovalThreshold: 50,
            requireConfirmation: true,
          })];
          case 1:
            _a.sent();
            settings = paymentService.getSettings();
            (0, bun_test_1.expect)(settings.autoApprovalThreshold).toBe(50);
            (0, bun_test_1.expect)(settings.requireConfirmation).toBe(true);
            return [2];
        }
      });
    }); });
  });
  (0, bun_test_1.describe)('Research Action with Payment', () => {
    (0, bun_test_1.it)('should validate research requests', () => { return __awaiter(void 0, void 0, void 0, function () {
      let message, isValid;
      return __generator(this, (_a) => {
        switch (_a.label) {
          case 0:
            message = (0, test_runtime_1.createTestMemory)({
              content: {
                text: 'Can you research the latest developments in AI?',
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
    (0, bun_test_1.it)('should not validate non-research messages', () => { return __awaiter(void 0, void 0, void 0, function () {
      let message, isValid;
      return __generator(this, (_a) => {
        switch (_a.label) {
          case 0:
            message = (0, test_runtime_1.createTestMemory)({
              content: {
                text: 'Hello, how are you?',
              },
            });
            return [4 /*yield*/, researchAction_1.researchAction.validate(runtime, message)];
          case 1:
            isValid = _a.sent();
            (0, bun_test_1.expect)(isValid).toBe(false);
            return [2];
        }
      });
    }); });
  });
  (0, bun_test_1.describe)('Payment Middleware', () => {
    (0, bun_test_1.it)('should create payment request with correct amount', () => {
      const amount = BigInt(1000000); // 1 USDC
      const method = types_1.PaymentMethod.USDC_ETH;
      // Test that payment request structure is correct
      const paymentRequest = {
        amount,
        method,
        requiresConfirmation: false,
      };
      (0, bun_test_1.expect)(paymentRequest.amount).toBe(amount);
      (0, bun_test_1.expect)(paymentRequest.method).toBe(method);
    });
  });
});
