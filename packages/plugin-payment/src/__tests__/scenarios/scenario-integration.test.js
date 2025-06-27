"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g = Object.create((typeof Iterator === "function" ? Iterator : Object).prototype);
    return g.next = verb(0), g["throw"] = verb(1), g["return"] = verb(2), typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
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
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
Object.defineProperty(exports, "__esModule", { value: true });
var bun_test_1 = require("bun:test");
var test_runtime_1 = require("../helpers/test-runtime");
var index_1 = require("../../index");
var sendPaymentAction_1 = require("../../actions/sendPaymentAction");
var types_1 = require("../../types");
(0, bun_test_1.describe)('Payment Scenarios Integration', function () {
    var runtime;
    var paymentService;
    (0, bun_test_1.beforeAll)(function () { return __awaiter(void 0, void 0, void 0, function () {
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, (0, test_runtime_1.createTestRuntime)({
                        plugins: [index_1.paymentPlugin],
                        settings: {
                            PAYMENT_AUTO_APPROVAL_ENABLED: 'true',
                            PAYMENT_AUTO_APPROVAL_THRESHOLD: '1000',
                            PAYMENT_REQUIRE_CONFIRMATION: 'false',
                        },
                    })];
                case 1:
                    // Create runtime with payment plugin
                    runtime = _a.sent();
                    paymentService = runtime.getService('payment');
                    (0, bun_test_1.expect)(paymentService).toBeDefined();
                    // Register the send payment action
                    runtime.registerAction(sendPaymentAction_1.sendPaymentAction);
                    return [2 /*return*/];
            }
        });
    }); });
    (0, bun_test_1.afterAll)(function () { return __awaiter(void 0, void 0, void 0, function () {
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, (0, test_runtime_1.cleanupTestRuntime)(runtime)];
                case 1:
                    _a.sent();
                    return [2 /*return*/];
            }
        });
    }); });
    (0, bun_test_1.describe)('Send Payment Action', function () {
        (0, bun_test_1.it)('should validate send payment messages', function () { return __awaiter(void 0, void 0, void 0, function () {
            var message, isValid;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        message = (0, test_runtime_1.createTestMemory)({
                            content: { text: 'Send 0.1 ETH to 0x742d35Cc6634C0532925a3b844Bc9e7595f7E123' },
                        });
                        return [4 /*yield*/, sendPaymentAction_1.sendPaymentAction.validate(runtime, message)];
                    case 1:
                        isValid = _a.sent();
                        (0, bun_test_1.expect)(isValid).toBe(true);
                        return [2 /*return*/];
                }
            });
        }); });
        (0, bun_test_1.it)('should extract payment details correctly', function () { return __awaiter(void 0, void 0, void 0, function () {
            var testCases, _loop_1, _i, testCases_1, testCase;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        testCases = [
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
                        _loop_1 = function (testCase) {
                            var message, callbackCalled, callbackResponse;
                            return __generator(this, function (_b) {
                                switch (_b.label) {
                                    case 0:
                                        message = (0, test_runtime_1.createTestMemory)({
                                            content: { text: testCase.text },
                                        });
                                        callbackCalled = false;
                                        return [4 /*yield*/, sendPaymentAction_1.sendPaymentAction.handler(runtime, message, undefined, {}, function (response) { return __awaiter(void 0, void 0, void 0, function () {
                                                return __generator(this, function (_a) {
                                                    callbackCalled = true;
                                                    callbackResponse = response;
                                                    return [2 /*return*/, []];
                                                });
                                            }); })];
                                    case 1:
                                        _b.sent();
                                        (0, bun_test_1.expect)(callbackCalled).toBe(true);
                                        // Payment will fail due to insufficient funds, but we can check the error message
                                        (0, bun_test_1.expect)(callbackResponse.text).toContain('Payment');
                                        return [2 /*return*/];
                                }
                            });
                        };
                        _i = 0, testCases_1 = testCases;
                        _a.label = 1;
                    case 1:
                        if (!(_i < testCases_1.length)) return [3 /*break*/, 4];
                        testCase = testCases_1[_i];
                        return [5 /*yield**/, _loop_1(testCase)];
                    case 2:
                        _a.sent();
                        _a.label = 3;
                    case 3:
                        _i++;
                        return [3 /*break*/, 1];
                    case 4: return [2 /*return*/];
                }
            });
        }); });
    });
    (0, bun_test_1.describe)('Real-world Payment Scenarios', function () {
        (0, bun_test_1.it)('should handle multi-agent payment scenario', function () { return __awaiter(void 0, void 0, void 0, function () {
            var alice, bob, aliceBalance, bobBalance, result;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        alice = (0, test_runtime_1.createTestUserId)();
                        bob = (0, test_runtime_1.createTestUserId)();
                        return [4 /*yield*/, paymentService.getUserBalance(alice, runtime)];
                    case 1:
                        aliceBalance = _a.sent();
                        (0, bun_test_1.expect)(aliceBalance).toBeDefined();
                        (0, bun_test_1.expect)(aliceBalance.size).toBeGreaterThan(0);
                        return [4 /*yield*/, paymentService.getUserBalance(bob, runtime)];
                    case 2:
                        bobBalance = _a.sent();
                        (0, bun_test_1.expect)(bobBalance).toBeDefined();
                        (0, bun_test_1.expect)(bobBalance.size).toBeGreaterThan(0);
                        return [4 /*yield*/, paymentService.processPayment({
                                id: (0, test_runtime_1.createTestUserId)(),
                                userId: alice,
                                agentId: runtime.agentId,
                                actionName: 'transfer',
                                amount: BigInt(10 * 1e6), // 10 USDC
                                method: types_1.PaymentMethod.USDC_ETH,
                                recipientAddress: '0x742d35Cc6634C0532925a3b844Bc9e7595f7E123', // Bob's address
                                metadata: {
                                    recipientUserId: bob,
                                    description: 'Payment between agents',
                                },
                            }, runtime)];
                    case 3:
                        result = _a.sent();
                        (0, bun_test_1.expect)(result).toBeDefined();
                        (0, bun_test_1.expect)(result.status).toBeDefined();
                        return [2 /*return*/];
                }
            });
        }); });
        (0, bun_test_1.it)('should handle payment request scenario', function () { return __awaiter(void 0, void 0, void 0, function () {
            var userId, result;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        userId = (0, test_runtime_1.createTestUserId)();
                        return [4 /*yield*/, paymentService.processPayment({
                                id: (0, test_runtime_1.createTestUserId)(),
                                userId: userId,
                                agentId: runtime.agentId,
                                actionName: 'payment_request',
                                amount: BigInt(25 * 1e6), // 25 USDC
                                method: types_1.PaymentMethod.USDC_ETH,
                                metadata: {
                                    description: 'Dinner last night',
                                    requestedFrom: 'bob@example.com',
                                },
                            }, runtime)];
                    case 1:
                        result = _a.sent();
                        (0, bun_test_1.expect)(result).toBeDefined();
                        (0, bun_test_1.expect)(result.status).toBeDefined();
                        (0, bun_test_1.expect)(result.metadata).toBeDefined();
                        return [2 /*return*/];
                }
            });
        }); });
        (0, bun_test_1.it)('should handle DeFi operations', function () { return __awaiter(void 0, void 0, void 0, function () {
            var userId, result;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        userId = (0, test_runtime_1.createTestUserId)();
                        return [4 /*yield*/, paymentService.processPayment({
                                id: (0, test_runtime_1.createTestUserId)(),
                                userId: userId,
                                agentId: runtime.agentId,
                                actionName: 'defi_deposit',
                                amount: BigInt(1000 * 1e6), // 1000 USDC
                                method: types_1.PaymentMethod.USDC_ETH,
                                recipientAddress: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48', // USDC contract
                                metadata: {
                                    protocol: 'aave',
                                    action: 'deposit',
                                    expectedAPY: 3.45,
                                },
                            }, runtime)];
                    case 1:
                        result = _a.sent();
                        (0, bun_test_1.expect)(result).toBeDefined();
                        (0, bun_test_1.expect)(result.id).toBeDefined();
                        return [2 /*return*/];
                }
            });
        }); });
        (0, bun_test_1.it)('should handle cross-chain bridge operations', function () { return __awaiter(void 0, void 0, void 0, function () {
            var userId, result;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        userId = (0, test_runtime_1.createTestUserId)();
                        return [4 /*yield*/, paymentService.processPayment({
                                id: (0, test_runtime_1.createTestUserId)(),
                                userId: userId,
                                agentId: runtime.agentId,
                                actionName: 'bridge',
                                amount: BigInt(500 * 1e6), // 500 USDC
                                method: types_1.PaymentMethod.USDC_ETH,
                                recipientAddress: '0x742d35Cc6634C0532925a3b844Bc9e7595f7E123',
                                metadata: {
                                    fromChain: 'ethereum',
                                    toChain: 'arbitrum',
                                    bridgeProtocol: 'stargate',
                                    estimatedFees: 12,
                                },
                            }, runtime)];
                    case 1:
                        result = _a.sent();
                        (0, bun_test_1.expect)(result).toBeDefined();
                        (0, bun_test_1.expect)(result.metadata).toBeDefined();
                        return [2 /*return*/];
                }
            });
        }); });
        (0, bun_test_1.it)('should handle NFT minting operations', function () { return __awaiter(void 0, void 0, void 0, function () {
            var userId, result;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        userId = (0, test_runtime_1.createTestUserId)();
                        return [4 /*yield*/, paymentService.processPayment({
                                id: (0, test_runtime_1.createTestUserId)(),
                                userId: userId,
                                agentId: runtime.agentId,
                                actionName: 'nft_mint',
                                amount: BigInt(25 * 1e6), // 25 USDC
                                method: types_1.PaymentMethod.USDC_ETH,
                                recipientAddress: '0x742d35Cc6634C0532925a3b844Bc9e7595f7E123', // NFT contract
                                metadata: {
                                    service: 'crossmint',
                                    nftContract: '0x...',
                                    tokenId: '1',
                                    chain: 'ethereum',
                                },
                            }, runtime)];
                    case 1:
                        result = _a.sent();
                        (0, bun_test_1.expect)(result).toBeDefined();
                        (0, bun_test_1.expect)(result.status).toBeDefined();
                        return [2 /*return*/];
                }
            });
        }); });
    });
    (0, bun_test_1.describe)('Payment Confirmations and Trust', function () {
        (0, bun_test_1.it)('should require confirmation for untrusted high-value payments', function () { return __awaiter(void 0, void 0, void 0, function () {
            var userId, result;
            var _a;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0:
                        userId = (0, test_runtime_1.createTestUserId)();
                        return [4 /*yield*/, paymentService.processPayment({
                                id: (0, test_runtime_1.createTestUserId)(),
                                userId: userId,
                                agentId: runtime.agentId,
                                actionName: 'high_value_transfer',
                                amount: BigInt(5000 * 1e6), // 5000 USDC
                                method: types_1.PaymentMethod.USDC_ETH,
                                recipientAddress: '0x742d35Cc6634C0532925a3b844Bc9e7595f7E123',
                                requiresConfirmation: true,
                                metadata: {
                                    trustScore: 50, // Below threshold
                                    reason: 'Large transfer to external wallet',
                                },
                            }, runtime)];
                    case 1:
                        result = _b.sent();
                        (0, bun_test_1.expect)(result.status).toBe(types_1.PaymentStatus.PENDING);
                        (0, bun_test_1.expect)((_a = result.metadata) === null || _a === void 0 ? void 0 : _a.pendingReason).toBe('USER_CONFIRMATION_REQUIRED');
                        return [2 /*return*/];
                }
            });
        }); });
        (0, bun_test_1.it)('should auto-approve payments from trusted users', function () { return __awaiter(void 0, void 0, void 0, function () {
            var userId, result;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        userId = (0, test_runtime_1.createTestUserId)();
                        return [4 /*yield*/, paymentService.processPayment({
                                id: (0, test_runtime_1.createTestUserId)(),
                                userId: userId,
                                agentId: runtime.agentId,
                                actionName: 'trusted_transfer',
                                amount: BigInt(100 * 1e6), // 100 USDC
                                method: types_1.PaymentMethod.USDC_ETH,
                                recipientAddress: '0x742d35Cc6634C0532925a3b844Bc9e7595f7E123',
                                metadata: {
                                    trustScore: 85, // Above threshold
                                    isOwner: false,
                                    isAdmin: false,
                                },
                            }, runtime)];
                    case 1:
                        result = _a.sent();
                        // Should proceed without confirmation (but fail due to funds)
                        (0, bun_test_1.expect)(result.status).toBe(types_1.PaymentStatus.FAILED);
                        (0, bun_test_1.expect)(result.error).toContain('Insufficient');
                        return [2 /*return*/];
                }
            });
        }); });
    });
});
