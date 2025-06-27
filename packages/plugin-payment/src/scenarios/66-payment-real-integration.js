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
exports.paymentConfirmationScenario = void 0;
// Real payment integration scenario
var paymentRealIntegrationScenario = {
    id: 'payment-real-integration-001',
    name: 'Payment Real Integration Test',
    description: 'Tests real blockchain payment integration including wallet connections, gas estimation, and transaction monitoring',
    category: 'payment',
    tags: ['payment', 'blockchain', 'integration', 'wallet', 'transaction'],
    // Add examples array for compatibility with test framework
    examples: [
        [
            {
                user: 'customer',
                content: 'I want to connect my MetaMask wallet to make a payment.',
            },
            {
                user: 'agent',
                content: "I'll help you connect your MetaMask wallet. Please approve the connection request in your wallet. Once connected, you can make secure blockchain payments.",
            },
        ],
        [
            {
                user: 'customer',
                content: 'How much will the gas fees be for this transaction?',
            },
            {
                user: 'agent',
                content: 'Current gas fees on Ethereum are approximately 25 gwei, which would cost about $3.50 for a USDC transfer. Would you like to proceed or wait for lower fees?',
            },
        ],
    ],
    // Add evaluator function for test compatibility
    evaluator: function (response) {
        var hasBlockchainMention = response.toLowerCase().includes('blockchain') ||
            response.toLowerCase().includes('wallet') ||
            response.toLowerCase().includes('metamask') ||
            response.toLowerCase().includes('transaction') ||
            response.toLowerCase().includes('gas');
        var hasIntegrationMention = response.toLowerCase().includes('connect') ||
            response.toLowerCase().includes('approve') ||
            response.toLowerCase().includes('fees') ||
            response.toLowerCase().includes('gwei');
        return hasBlockchainMention || hasIntegrationMention;
    },
    actors: [
        {
            id: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
            name: 'Payment Agent',
            role: 'subject',
            bio: 'An AI agent with real payment capabilities and wallet management',
            system: "You are an AI agent with payment integration. You can:\n- Check wallet balances\n- Process payments\n- Create and manage wallets\n- Provide research services that require payment\n\nResearch services cost 1 USDC. Always inform users of costs before processing payments.",
            plugins: ['@elizaos/plugin-payment'],
            script: { steps: [] },
        },
        {
            id: 'b2c3d4e5-f6a7-8901-bcde-f23456789012',
            name: 'Test User',
            role: 'assistant',
            script: {
                steps: [
                    {
                        type: 'message',
                        content: 'Can you check my wallet balance?',
                    },
                    {
                        type: 'wait',
                        waitTime: 3000,
                    },
                    {
                        type: 'message',
                        content: 'Research the latest developments in quantum computing',
                    },
                    {
                        type: 'wait',
                        waitTime: 5000,
                    },
                ],
            },
        },
    ],
    setup: {
        roomType: 'dm',
        roomName: 'Payment Integration Test',
        context: 'Testing real payment integration with wallet management',
        beforeRun: function (context) { return __awaiter(void 0, void 0, void 0, function () {
            var runtime, paymentService, dbService;
            return __generator(this, function (_a) {
                runtime = context.runtime;
                paymentService = runtime.getService('payment');
                if (!paymentService) {
                    throw new Error('Payment service not initialized');
                }
                dbService = runtime.getService('database');
                if (!dbService || !dbService.getDatabase) {
                    throw new Error('Database service not available');
                }
                return [2 /*return*/, { paymentService: paymentService, dbService: dbService }];
            });
        }); },
    },
    execution: {
        maxDuration: 30000,
        maxSteps: 10,
        stopConditions: [
            {
                type: 'message_count',
                value: 4,
                description: 'Stop after 4 messages exchanged',
            },
        ],
    },
    verification: {
        rules: [
            {
                id: 'wallet-created',
                type: 'custom',
                description: 'Wallet created and persisted',
                config: {
                    validate: function (context) { return __awaiter(void 0, void 0, void 0, function () {
                        var runtime, state, paymentService, dbService, userId, balances, db, wallets, wallet;
                        return __generator(this, function (_a) {
                            switch (_a.label) {
                                case 0:
                                    runtime = context.runtime, state = context.state;
                                    paymentService = state.paymentService, dbService = state.dbService;
                                    userId = 'b2c3d4e5-f6a7-8901-bcde-f23456789012';
                                    return [4 /*yield*/, paymentService.getUserBalance(userId, runtime)];
                                case 1:
                                    balances = _a.sent();
                                    if (balances.size === 0) {
                                        return [2 /*return*/, { success: false, reason: 'No wallets created' }];
                                    }
                                    db = dbService.getDatabase();
                                    return [4 /*yield*/, db.select().from('userWallets').where({ userId: userId }).limit(10)];
                                case 2:
                                    wallets = _a.sent();
                                    if (!wallets || wallets.length === 0) {
                                        return [2 /*return*/, { success: false, reason: 'Wallet not persisted in database' }];
                                    }
                                    wallet = wallets[0];
                                    if (!wallet.encryptedPrivateKey || wallet.encryptedPrivateKey.includes('0x')) {
                                        return [2 /*return*/, { success: false, reason: 'Wallet not properly encrypted' }];
                                    }
                                    return [2 /*return*/, { success: true }];
                            }
                        });
                    }); },
                },
                weight: 5,
            },
            {
                id: 'balance-reported',
                type: 'llm',
                description: 'Agent reports wallet balance',
                config: {
                    criteria: 'The agent should report the wallet balance when requested',
                    expectedValue: 'Balance information provided',
                },
                weight: 3,
            },
            {
                id: 'payment-context',
                type: 'llm',
                description: 'Payment context in research response',
                config: {
                    criteria: 'The agent should mention payment requirement or insufficient funds for research',
                    expectedValue: 'Payment context mentioned',
                },
                weight: 2,
            },
        ],
        expectedOutcomes: [
            {
                actorId: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
                outcome: 'Successfully managed wallet and handled payment requests',
                verification: {
                    id: 'integration-complete',
                    type: 'llm',
                    description: 'Real integration completed',
                    config: {
                        criteria: 'The agent successfully created wallets, reported balances, and handled payment requirements',
                    },
                },
            },
        ],
    },
    cleanup: function (context) { return __awaiter(void 0, void 0, void 0, function () {
        var state, dbService, db, error_1;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    state = context.state;
                    dbService = state.dbService;
                    db = dbService.getDatabase();
                    _a.label = 1;
                case 1:
                    _a.trys.push([1, 4, , 5]);
                    // Clean up test data
                    return [4 /*yield*/, db.delete('userWallets').where({ userId: 'b2c3d4e5-f6a7-8901-bcde-f23456789012' })];
                case 2:
                    // Clean up test data
                    _a.sent();
                    return [4 /*yield*/, db
                            .delete('paymentTransactions')
                            .where({ payerId: 'b2c3d4e5-f6a7-8901-bcde-f23456789012' })];
                case 3:
                    _a.sent();
                    return [3 /*break*/, 5];
                case 4:
                    error_1 = _a.sent();
                    return [3 /*break*/, 5];
                case 5: return [2 /*return*/];
            }
        });
    }); },
};
// Payment confirmation scenario
var paymentConfirmationScenario = {
    id: 'payment-confirmation-real-001',
    name: 'Payment Confirmation Test',
    description: 'Test payment confirmation with real verification codes',
    category: 'payment',
    tags: ['payment', 'confirmation', 'verification', 'security'],
    actors: [
        {
            id: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
            name: 'Payment Agent',
            role: 'subject',
            bio: 'An AI agent with secure payment confirmation',
            system: "You are an AI agent with payment integration. \nYou can process payments but require confirmation for security.\nAlways generate unique verification codes for payment confirmations.",
            plugins: ['@elizaos/plugin-payment'],
            script: { steps: [] },
        },
        {
            id: 'b2c3d4e5-f6a7-8901-bcde-f23456789012',
            name: 'Test User',
            role: 'assistant',
            script: {
                steps: [
                    {
                        type: 'message',
                        content: 'Send 5 USDC to 0x742d35Cc6634C0532925a3b844Bc9e7595f7E123',
                    },
                    {
                        type: 'wait',
                        waitTime: 5000,
                    },
                ],
            },
        },
    ],
    setup: {
        roomType: 'dm',
        roomName: 'Payment Confirmation Test',
        context: 'Testing payment confirmation flow',
        beforeRun: function (context) { return __awaiter(void 0, void 0, void 0, function () {
            var runtime, paymentService;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        runtime = context.runtime;
                        paymentService = runtime.getService('payment');
                        // Update settings to require confirmation
                        return [4 /*yield*/, paymentService.updateSettings({
                                requireConfirmation: true,
                                autoApprovalThreshold: 0.01,
                            })];
                    case 1:
                        // Update settings to require confirmation
                        _a.sent();
                        return [2 /*return*/, { paymentService: paymentService }];
                }
            });
        }); },
    },
    execution: {
        maxDuration: 20000,
        maxSteps: 5,
        stopConditions: [
            {
                type: 'message_count',
                value: 2,
                description: 'Stop after initial exchange',
            },
        ],
    },
    verification: {
        rules: [
            {
                id: 'confirmation-required',
                type: 'llm',
                description: 'Agent requires confirmation',
                config: {
                    criteria: 'The agent should mention that confirmation or verification is required',
                    expectedValue: 'Confirmation requirement mentioned',
                },
                weight: 3,
            },
            {
                id: 'verification-code-generated',
                type: 'custom',
                description: 'Unique verification code generated',
                config: {
                    validate: function (context) { return __awaiter(void 0, void 0, void 0, function () {
                        var runtime, dbService, db, pendingPayments, payment, metadata;
                        return __generator(this, function (_a) {
                            switch (_a.label) {
                                case 0:
                                    runtime = context.runtime;
                                    dbService = runtime.getService('database');
                                    db = dbService.getDatabase();
                                    return [4 /*yield*/, db
                                            .select()
                                            .from('paymentRequests')
                                            .where({
                                            userId: 'b2c3d4e5-f6a7-8901-bcde-f23456789012',
                                            requiresConfirmation: true,
                                        })
                                            .limit(1)];
                                case 1:
                                    pendingPayments = _a.sent();
                                    if (!pendingPayments || pendingPayments.length === 0) {
                                        return [2 /*return*/, { success: false, reason: 'No pending payment found' }];
                                    }
                                    payment = pendingPayments[0];
                                    metadata = payment.metadata;
                                    if (!(metadata === null || metadata === void 0 ? void 0 : metadata.verificationCode) || metadata.verificationCode === '123456') {
                                        return [2 /*return*/, { success: false, reason: 'No unique verification code' }];
                                    }
                                    if (!/^\d{6}$/.test(metadata.verificationCode)) {
                                        return [2 /*return*/, { success: false, reason: 'Invalid code format' }];
                                    }
                                    return [2 /*return*/, { success: true }];
                            }
                        });
                    }); },
                },
                weight: 5,
            },
        ],
        expectedOutcomes: [
            {
                actorId: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
                outcome: 'Successfully created pending payment with verification',
                verification: {
                    id: 'confirmation-flow-complete',
                    type: 'llm',
                    description: 'Confirmation flow executed',
                    config: {
                        criteria: 'The agent created a pending payment and requested confirmation with proper security',
                    },
                },
            },
        ],
    },
    cleanup: function (context) { return __awaiter(void 0, void 0, void 0, function () {
        var state, paymentService;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    state = context.state;
                    paymentService = state.paymentService;
                    // Reset settings
                    return [4 /*yield*/, paymentService.updateSettings({
                            requireConfirmation: false,
                            autoApprovalThreshold: 10,
                        })];
                case 1:
                    // Reset settings
                    _a.sent();
                    return [2 /*return*/];
            }
        });
    }); },
};
exports.paymentConfirmationScenario = paymentConfirmationScenario;
exports.default = paymentRealIntegrationScenario;
