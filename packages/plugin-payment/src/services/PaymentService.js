'use strict';
const __extends = (this && this.__extends) || (function () {
  let extendStatics = function (d, b) {
    extendStatics = Object.setPrototypeOf ||
            ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
            function (d, b) { for (const p in b) {if (Object.prototype.hasOwnProperty.call(b, p)) {d[p] = b[p];}} };
    return extendStatics(d, b);
  };
  return function (d, b) {
    if (typeof b !== 'function' && b !== null)
    {throw new TypeError(`Class extends value ${String(b)} is not a constructor or null`);}
    extendStatics(d, b);
    function __() { this.constructor = d; }
    d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
  };
})();
const __makeTemplateObject = (this && this.__makeTemplateObject) || function (cooked, raw) {
  if (Object.defineProperty) { Object.defineProperty(cooked, 'raw', { value: raw }); } else { cooked.raw = raw; }
  return cooked;
};
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
const __spreadArray = (this && this.__spreadArray) || function (to, from, pack) {
  if (pack || arguments.length === 2) {for (var i = 0, l = from.length, ar; i < l; i++) {
    if (ar || !(i in from)) {
      if (!ar) {ar = Array.prototype.slice.call(from, 0, i);}
      ar[i] = from[i];
    }
  }}
  return to.concat(ar || Array.prototype.slice.call(from));
};
Object.defineProperty(exports, '__esModule', { value: true });
exports.PaymentService = void 0;
const core_1 = require('@elizaos/core');
const types_1 = require('../types');
const uuid_1 = require('uuid');
const events_1 = require('events');
const drizzle_orm_1 = require('drizzle-orm');
const schema_1 = require('../database/schema');
const encryption_1 = require('../utils/encryption');
/**
 * Main payment service implementation with proper database integration
 */
const PaymentService = /** @class */ (function (_super) {
  __extends(PaymentService, _super);
  function PaymentService() {
    const _this = _super.call(this) || this;
    _this.serviceName = PaymentService.serviceName;
    _this.serviceType = PaymentService.serviceType;
    _this.capabilityDescription = 'Payment processing and wallet management service';
    _this.walletAdapters = new Map();
    _this.eventEmitter = new events_1.EventEmitter();
    _this.settings = _this.getDefaultSettings();
    return _this;
  }
  PaymentService.prototype.getDefaultSettings = function () {
    return {
      autoApprovalEnabled: false,
      autoApprovalThreshold: 10,
      defaultCurrency: 'USDC',
      requireConfirmation: true,
      trustThreshold: 70,
      maxDailySpend: 1000,
      preferredNetworks: ['ethereum', 'solana'],
      feeStrategy: 'standard',
    };
  };
  PaymentService.prototype.initialize = function (runtime) {
    return __awaiter(this, void 0, void 0, function () {
      let dbService;
      let _a;
      return __generator(this, function (_b) {
        switch (_b.label) {
          case 0:
            this.runtime = runtime;
            dbService = runtime.getService('database');
            this.db = (_a = dbService === null || dbService === void 0 ? void 0 : dbService.getDatabase) === null || _a === void 0 ? void 0 : _a.call(dbService);
            if (!this.db) {
              core_1.elizaLogger.error('[PaymentService] No database service available!');
              throw new Error('Database service is required for PaymentService');
            }
            // Load settings from runtime
            this.loadSettings();
            // Initialize wallet adapters
            return [4 /*yield*/, this.initializeWalletAdapters()];
          case 1:
            // Initialize wallet adapters
            _b.sent();
            // Get optional services
            this.trustService = runtime.getService('trust');
            this.taskService = runtime.getService('task');
            this.secretFormService = runtime.getService('SECRET_FORMS');
            // Start monitoring
            this.startPaymentMonitoring();
            core_1.elizaLogger.info('[PaymentService] Initialized', {
              adapters: Array.from(this.walletAdapters.keys()),
              trustEnabled: !!this.trustService,
              taskEnabled: !!this.taskService,
              formsEnabled: !!this.secretFormService,
              databaseEnabled: !!this.db,
            });
            return [2];
        }
      });
    });
  };
  PaymentService.prototype.loadSettings = function () {
    const _this = this;
    const getSetting = function (key, defaultValue) {
      return _this.runtime.getSetting(key) || defaultValue;
    };
    this.settings = {
      autoApprovalEnabled: getSetting('PAYMENT_AUTO_APPROVAL_ENABLED', 'false') === 'true',
      autoApprovalThreshold: parseFloat(getSetting('PAYMENT_AUTO_APPROVAL_THRESHOLD', '10')),
      defaultCurrency: getSetting('PAYMENT_DEFAULT_CURRENCY', 'USDC'),
      requireConfirmation: getSetting('PAYMENT_REQUIRE_CONFIRMATION', 'true') !== 'false',
      trustThreshold: parseFloat(getSetting('PAYMENT_TRUST_THRESHOLD', '70')),
      maxDailySpend: parseFloat(getSetting('PAYMENT_MAX_DAILY_SPEND', '1000')),
      preferredNetworks: getSetting('PAYMENT_PREFERRED_NETWORKS', 'ethereum,solana').split(','),
      feeStrategy: getSetting('PAYMENT_FEE_STRATEGY', 'standard'),
    };
  };
  PaymentService.prototype.initializeWalletAdapters = function () {
    return __awaiter(this, void 0, void 0, function () {
      let EVMWalletAdapter, evmAdapter, error_1, SolanaWalletAdapter, solanaAdapter, error_2, AgentKitWalletAdapter, agentKitAdapter, error_3, CrossmintAdapter, crossmintAdapter, error_4;
      return __generator(this, function (_a) {
        switch (_a.label) {
          case 0:
            _a.trys.push([0, 3, , 4]);
            return [4 /*yield*/, Promise.resolve().then(() => { return require('../adapters/EVMWalletAdapter'); })];
          case 1:
            EVMWalletAdapter = (_a.sent()).EVMWalletAdapter;
            evmAdapter = new EVMWalletAdapter(this.runtime);
            return [4 /*yield*/, evmAdapter.initialize()];
          case 2:
            _a.sent();
            this.walletAdapters.set('evm', evmAdapter);
            return [3 /*break*/, 4];
          case 3:
            error_1 = _a.sent();
            core_1.elizaLogger.warn('[PaymentService] Failed to initialize EVM adapter', error_1);
            return [3 /*break*/, 4];
          case 4:
            _a.trys.push([4, 7, , 8]);
            return [4 /*yield*/, Promise.resolve().then(() => { return require('../adapters/SolanaWalletAdapter'); })];
          case 5:
            SolanaWalletAdapter = (_a.sent()).SolanaWalletAdapter;
            solanaAdapter = new SolanaWalletAdapter(this.runtime);
            return [4 /*yield*/, solanaAdapter.initialize()];
          case 6:
            _a.sent();
            this.walletAdapters.set('solana', solanaAdapter);
            return [3 /*break*/, 8];
          case 7:
            error_2 = _a.sent();
            core_1.elizaLogger.warn('[PaymentService] Failed to initialize Solana adapter', error_2);
            return [3 /*break*/, 8];
          case 8:
            _a.trys.push([8, 11, , 12]);
            return [4 /*yield*/, Promise.resolve().then(() => { return require('../adapters/AgentKitWalletAdapter'); })];
          case 9:
            AgentKitWalletAdapter = (_a.sent()).AgentKitWalletAdapter;
            agentKitAdapter = new AgentKitWalletAdapter(this.runtime);
            return [4 /*yield*/, agentKitAdapter.initialize()];
          case 10:
            _a.sent();
            this.walletAdapters.set('agentkit', agentKitAdapter);
            return [3 /*break*/, 12];
          case 11:
            error_3 = _a.sent();
            core_1.elizaLogger.warn('[PaymentService] Failed to initialize AgentKit adapter', error_3);
            return [3 /*break*/, 12];
          case 12:
            _a.trys.push([12, 15, , 16]);
            return [4 /*yield*/, Promise.resolve().then(() => { return require('../adapters/CrossmintAdapter'); })];
          case 13:
            CrossmintAdapter = (_a.sent()).CrossmintAdapter;
            crossmintAdapter = new CrossmintAdapter(this.runtime);
            return [4 /*yield*/, crossmintAdapter.initialize()];
          case 14:
            _a.sent();
            this.walletAdapters.set('crossmint', crossmintAdapter);
            return [3 /*break*/, 16];
          case 15:
            error_4 = _a.sent();
            core_1.elizaLogger.warn('[PaymentService] Failed to initialize Crossmint adapter', error_4);
            return [3 /*break*/, 16];
          case 16:
            if (this.walletAdapters.size === 0) {
              core_1.elizaLogger.error('[PaymentService] No wallet adapters initialized');
            }
            return [2];
        }
      });
    });
  };
  PaymentService.prototype.startPaymentMonitoring = function () {
    const _this = this;
    // Monitor pending transactions
    setInterval(() => {
      _this.checkPendingTransactions();
    }, 30000); // Every 30 seconds
    // Clean up expired payments
    setInterval(() => {
      _this.cleanupExpiredPayments();
    }, 300000); // Every 5 minutes
  };
  PaymentService.prototype.checkPendingTransactions = function () {
    return __awaiter(this, void 0, void 0, function () {
      let processingTxs, _i, processingTxs_1, tx, adapter, status_1, error_5, error_6;
      return __generator(this, function (_a) {
        switch (_a.label) {
          case 0:
            _a.trys.push([0, 10, , 11]);
            return [4 /*yield*/, this.db
              .select()
              .from(schema_1.paymentTransactions)
              .where((0, drizzle_orm_1.eq)(schema_1.paymentTransactions.status, types_1.PaymentStatus.PROCESSING))];
          case 1:
            processingTxs = _a.sent();
            _i = 0, processingTxs_1 = processingTxs;
            _a.label = 2;
          case 2:
            if (!(_i < processingTxs_1.length)) {return [3 /*break*/, 9];}
            tx = processingTxs_1[_i];
            if (!tx.transactionHash) {return [3 /*break*/, 8];}
            _a.label = 3;
          case 3:
            _a.trys.push([3, 7, , 8]);
            adapter = this.getAdapterForMethod(tx.method);
            if (!adapter) {return [3 /*break*/, 6];}
            return [4 /*yield*/, adapter.getTransaction(tx.transactionHash)];
          case 4:
            status_1 = _a.sent();
            if (!(status_1.status === types_1.PaymentStatus.COMPLETED)) {return [3 /*break*/, 6];}
            // Update transaction status in database
            return [4 /*yield*/, this.db
              .update(schema_1.paymentTransactions)
              .set({
                status: types_1.PaymentStatus.COMPLETED,
                confirmations: status_1.confirmations,
                completedAt: new Date(),
              })
              .where((0, drizzle_orm_1.eq)(schema_1.paymentTransactions.id, tx.id))];
          case 5:
            // Update transaction status in database
            _a.sent();
            this.emitPaymentEvent(types_1.PaymentEventType.PAYMENT_COMPLETED, tx);
            _a.label = 6;
          case 6: return [3 /*break*/, 8];
          case 7:
            error_5 = _a.sent();
            core_1.elizaLogger.error('[PaymentService] Error checking transaction', { id: tx.id, error: error_5 });
            return [3 /*break*/, 8];
          case 8:
            _i++;
            return [3 /*break*/, 2];
          case 9: return [3 /*break*/, 11];
          case 10:
            error_6 = _a.sent();
            core_1.elizaLogger.error('[PaymentService] Error in checkPendingTransactions', error_6);
            return [3 /*break*/, 11];
          case 11: return [2];
        }
      });
    });
  };
  PaymentService.prototype.cleanupExpiredPayments = function () {
    return __awaiter(this, void 0, void 0, function () {
      let oneHourAgo, expiredPayments, _i, expiredPayments_1, payment, error_7;
      return __generator(this, function (_a) {
        switch (_a.label) {
          case 0:
            _a.trys.push([0, 6, , 7]);
            oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
            return [4 /*yield*/, this.db
              .select()
              .from(schema_1.paymentRequests)
              .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.paymentRequests.requiresConfirmation, true), (0, drizzle_orm_1.sql)(templateObject_1 || (templateObject_1 = __makeTemplateObject(['', ' < ', ''], ['', ' < ', ''])), schema_1.paymentRequests.createdAt, oneHourAgo)))];
          case 1:
            expiredPayments = _a.sent();
            _i = 0, expiredPayments_1 = expiredPayments;
            _a.label = 2;
          case 2:
            if (!(_i < expiredPayments_1.length)) {return [3 /*break*/, 5];}
            payment = expiredPayments_1[_i];
            return [4 /*yield*/, this.cancelPayment(payment.id)];
          case 3:
            _a.sent();
            _a.label = 4;
          case 4:
            _i++;
            return [3 /*break*/, 2];
          case 5: return [3 /*break*/, 7];
          case 6:
            error_7 = _a.sent();
            core_1.elizaLogger.error('[PaymentService] Error in cleanupExpiredPayments', error_7);
            return [3 /*break*/, 7];
          case 7: return [2];
        }
      });
    });
  };
  PaymentService.prototype.processPayment = function (request, _runtime) {
    return __awaiter(this, void 0, void 0, function () {
      let adapter, trustScore, validation, error_8;
      return __generator(this, function (_a) {
        switch (_a.label) {
          case 0:
            _a.trys.push([0, 8, , 9]);
            core_1.elizaLogger.info('[PaymentService] Processing payment', {
              amount: request.amount.toString(),
              method: request.method,
              userId: request.userId,
            });
            // Basic validation first (amount, method support)
            if (!request.amount || request.amount <= BigInt(0)) {
              return [2 /*return*/, this.createFailedResult(request, 'Invalid payment amount')];
            }
            adapter = this.getAdapterForMethod(request.method);
            if (!adapter) {
              return [2 /*return*/, this.createFailedResult(request, 'Payment method '.concat(request.method, ' not supported'))];
            }
            if (!this.shouldRequireConfirmation(request)) {return [3 /*break*/, 2];}
            return [4 /*yield*/, this.createPendingPayment(request, 'USER_CONFIRMATION_REQUIRED')];
          case 1: return [2 /*return*/, _a.sent()];
          case 2:
            if (!(this.trustService && request.trustRequired)) {return [3 /*break*/, 5];}
            return [4 /*yield*/, this.getTrustScore(request.userId)];
          case 3:
            trustScore = _a.sent();
            if (!(trustScore < this.settings.trustThreshold)) {return [3 /*break*/, 5];}
            return [4 /*yield*/, this.createPendingPayment(request, 'TRUST_VERIFICATION_REQUIRED')];
          case 4: return [2 /*return*/, _a.sent()];
          case 5: return [4 /*yield*/, this.validatePaymentRequest(request)];
          case 6:
            validation = _a.sent();
            if (!validation.isValid) {
              return [2 /*return*/, this.createFailedResult(request, validation.error || 'Invalid payment request')];
            }
            return [4 /*yield*/, this.executePayment(request)];
          case 7:
            // Process payment immediately
            return [2 /*return*/, _a.sent()];
          case 8:
            error_8 = _a.sent();
            core_1.elizaLogger.error('[PaymentService] Payment processing failed', error_8);
            return [2 /*return*/, this.createFailedResult(request, error_8 instanceof Error ? error_8.message : 'Unknown error')];
          case 9: return [2];
        }
      });
    });
  };
  PaymentService.prototype.validatePaymentRequest = function (request) {
    return __awaiter(this, void 0, void 0, function () {
      let adapter, dailySpent, amountUsd, hasBalance;
      return __generator(this, function (_a) {
        switch (_a.label) {
          case 0:
            // Check amount
            if (!request.amount || request.amount <= BigInt(0)) {
              return [2 /*return*/, { isValid: false, error: 'Invalid payment amount' }];
            }
            adapter = this.getAdapterForMethod(request.method);
            if (!adapter) {
              return [2 /*return*/, { isValid: false, error: 'Payment method '.concat(request.method, ' not supported') }];
            }
            return [4 /*yield*/, this.getDailySpending(request.userId)];
          case 1:
            dailySpent = _a.sent();
            return [4 /*yield*/, this.convertToUSD(request.amount, request.method)];
          case 2:
            amountUsd = _a.sent();
            if (dailySpent + amountUsd > this.settings.maxDailySpend) {
              return [2 /*return*/, {
                isValid: false,
                error: 'Daily spending limit exceeded. Limit: $'.concat(this.settings.maxDailySpend, ', Current: $').concat(dailySpent),
              }];
            }
            return [4 /*yield*/, this.checkBalance(request)];
          case 3:
            hasBalance = _a.sent();
            if (!hasBalance) {
              return [2 /*return*/, { isValid: false, error: 'Insufficient funds' }];
            }
            return [2 /*return*/, { isValid: true }];
        }
      });
    });
  };
  PaymentService.prototype.shouldRequireConfirmation = function (request) {
    if (request.requiresConfirmation) {
      return true;
    }
    if (!this.settings.requireConfirmation) {
      return false;
    }
    const amountNum = Number(request.amount) / 1e6; // Assume 6 decimals
    if (this.settings.autoApprovalEnabled && amountNum <= this.settings.autoApprovalThreshold) {
      return false;
    }
    return true;
  };
  PaymentService.prototype.createPendingPayment = function (request, reason) {
    return __awaiter(this, void 0, void 0, function () {
      let transactionId, newTransaction, verificationCode, newRequest, transaction, error_9;
      return __generator(this, function (_a) {
        switch (_a.label) {
          case 0:
            transactionId = request.id;
            _a.label = 1;
          case 1:
            _a.trys.push([1, 9, , 10]);
            newTransaction = {
              payerId: request.userId,
              agentId: this.runtime.agentId,
              amount: request.amount,
              currency: this.getPaymentCurrency(request.method),
              method: request.method,
              status: types_1.PaymentStatus.PENDING,
              toAddress: request.recipientAddress,
              metadata: __assign(__assign({}, request.metadata), { pendingReason: reason }),
            };
            return [4 /*yield*/, this.db.insert(schema_1.paymentTransactions).values(newTransaction)];
          case 2:
            _a.sent();
            verificationCode = void 0;
            if (reason === 'USER_CONFIRMATION_REQUIRED' || reason === 'TRUST_VERIFICATION_REQUIRED') {
              verificationCode = Math.floor(100000 + Math.random() * 900000).toString();
            }
            newRequest = {
              transactionId: (0, core_1.asUUID)(transactionId),
              userId: request.userId,
              agentId: this.runtime.agentId,
              amount: request.amount,
              method: request.method,
              recipientAddress: request.recipientAddress,
              requiresConfirmation: request.requiresConfirmation || true,
              trustRequired: request.trustRequired || false,
              minimumTrustLevel: request.minimumTrustLevel,
              metadata: __assign(__assign({}, request.metadata), (verificationCode
                ? {
                  verificationCode,
                  verificationCodeExpiry: Date.now() + 300000, // 5 minutes
                }
                : {})),
              expiresAt: request.expiresAt ? new Date(request.expiresAt) : undefined,
            };
            return [4 /*yield*/, this.db.insert(schema_1.paymentRequests).values(newRequest)];
          case 3:
            _a.sent();
            if (!(this.taskService && reason === 'USER_CONFIRMATION_REQUIRED')) {return [3 /*break*/, 5];}
            return [4 /*yield*/, this.createConfirmationTask(request, transactionId)];
          case 4:
            _a.sent();
            _a.label = 5;
          case 5:
            if (!(this.secretFormService && reason === 'TRUST_VERIFICATION_REQUIRED')) {return [3 /*break*/, 7];}
            return [4 /*yield*/, this.createVerificationForm(request, transactionId)];
          case 6:
            _a.sent();
            _a.label = 7;
          case 7: return [4 /*yield*/, this.db
            .select()
            .from(schema_1.paymentTransactions)
            .where((0, drizzle_orm_1.eq)(schema_1.paymentTransactions.id, transactionId))
            .limit(1)];
          case 8:
            transaction = _a.sent();
            if (transaction[0]) {
              this.emitPaymentEvent(types_1.PaymentEventType.PAYMENT_REQUESTED, transaction[0]);
            }
            return [2 /*return*/, {
              id: transactionId,
              requestId: request.id,
              status: types_1.PaymentStatus.PENDING,
              amount: request.amount,
              method: request.method,
              fromAddress: '',
              toAddress: request.recipientAddress || '',
              timestamp: Date.now(),
              metadata: { pendingReason: reason },
            }];
          case 9:
            error_9 = _a.sent();
            core_1.elizaLogger.error('[PaymentService] Error creating pending payment', error_9);
            throw error_9;
          case 10: return [2];
        }
      });
    });
  };
  PaymentService.prototype.executePayment = function (request) {
    return __awaiter(this, void 0, void 0, function () {
      let adapter, transactionId, newTransaction, userWallet, txResult, updatedTx, error_10, failedTx;
      return __generator(this, function (_a) {
        switch (_a.label) {
          case 0:
            adapter = this.getAdapterForMethod(request.method);
            if (!adapter) {
              return [2 /*return*/, this.createFailedResult(request, 'No adapter available')];
            }
            transactionId = request.id;
            _a.label = 1;
          case 1:
            _a.trys.push([1, 9, , 12]);
            newTransaction = {
              payerId: request.userId,
              agentId: this.runtime.agentId,
              amount: request.amount,
              currency: this.getPaymentCurrency(request.method),
              method: request.method,
              status: types_1.PaymentStatus.PROCESSING,
              toAddress: request.recipientAddress,
              metadata: request.metadata,
            };
            return [4 /*yield*/, this.db.insert(schema_1.paymentTransactions).values(newTransaction)];
          case 2:
            _a.sent();
            return [4 /*yield*/, this.getUserWallet(request.userId, request.method)];
          case 3:
            userWallet = _a.sent();
            return [4 /*yield*/, adapter.sendTransaction(userWallet.address, request.recipientAddress || '', request.amount, request.method, userWallet.privateKey)];
          case 4:
            txResult = _a.sent();
            // Update transaction in database
            return [4 /*yield*/, this.db
              .update(schema_1.paymentTransactions)
              .set({
                status: txResult.status,
                transactionHash: txResult.hash,
                fromAddress: userWallet.address,
                toAddress: request.recipientAddress || '',
                completedAt: txResult.status === types_1.PaymentStatus.COMPLETED ? new Date() : undefined,
              })
              .where((0, drizzle_orm_1.eq)(schema_1.paymentTransactions.id, transactionId))];
          case 5:
            // Update transaction in database
            _a.sent();
            if (!(txResult.status === types_1.PaymentStatus.COMPLETED)) {return [3 /*break*/, 7];}
            return [4 /*yield*/, this.updateDailySpending(request.userId, request.amount, request.method)];
          case 6:
            _a.sent();
            _a.label = 7;
          case 7: return [4 /*yield*/, this.db
            .select()
            .from(schema_1.paymentTransactions)
            .where((0, drizzle_orm_1.eq)(schema_1.paymentTransactions.id, transactionId))
            .limit(1)];
          case 8:
            updatedTx = (_a.sent())[0];
            if (updatedTx) {
              this.emitPaymentEvent(types_1.PaymentEventType.PAYMENT_PROCESSING, updatedTx);
            }
            return [2 /*return*/, {
              id: transactionId,
              requestId: request.id,
              status: txResult.status,
              transactionHash: txResult.hash,
              amount: request.amount,
              method: request.method,
              fromAddress: userWallet.address,
              toAddress: request.recipientAddress || '',
              timestamp: Date.now(),
            }];
          case 9:
            error_10 = _a.sent();
            // Update transaction as failed
            return [4 /*yield*/, this.db
              .update(schema_1.paymentTransactions)
              .set({
                status: types_1.PaymentStatus.FAILED,
                error: error_10 instanceof Error ? error_10.message : 'Unknown error',
              })
              .where((0, drizzle_orm_1.eq)(schema_1.paymentTransactions.id, transactionId))];
          case 10:
            // Update transaction as failed
            _a.sent();
            return [4 /*yield*/, this.db
              .select()
              .from(schema_1.paymentTransactions)
              .where((0, drizzle_orm_1.eq)(schema_1.paymentTransactions.id, transactionId))
              .limit(1)];
          case 11:
            failedTx = (_a.sent())[0];
            if (failedTx) {
              this.emitPaymentEvent(types_1.PaymentEventType.PAYMENT_FAILED, failedTx);
            }
            return [2 /*return*/, this.createFailedResult(request, error_10 instanceof Error ? error_10.message : 'Unknown error')];
          case 12: return [2];
        }
      });
    });
  };
  PaymentService.prototype.createFailedResult = function (request, error) {
    return {
      id: request.id,
      requestId: request.id,
      status: types_1.PaymentStatus.FAILED,
      amount: request.amount,
      method: request.method,
      fromAddress: '',
      toAddress: request.recipientAddress || '',
      timestamp: Date.now(),
      error,
    };
  };
  PaymentService.prototype.checkPaymentStatus = function (paymentId, _runtime) {
    return __awaiter(this, void 0, void 0, function () {
      let transaction, adapter, status_2, error_11, error_12;
      return __generator(this, function (_a) {
        switch (_a.label) {
          case 0:
            _a.trys.push([0, 8, , 9]);
            return [4 /*yield*/, this.db
              .select()
              .from(schema_1.paymentTransactions)
              .where((0, drizzle_orm_1.eq)(schema_1.paymentTransactions.id, paymentId))
              .limit(1)];
          case 1:
            transaction = (_a.sent())[0];
            if (!transaction) {
              throw new Error('Payment not found');
            }
            if (!(transaction.status === types_1.PaymentStatus.PROCESSING && transaction.transactionHash)) {return [3 /*break*/, 7];}
            adapter = this.getAdapterForMethod(transaction.method);
            if (!adapter) {return [3 /*break*/, 7];}
            _a.label = 2;
          case 2:
            _a.trys.push([2, 6, , 7]);
            return [4 /*yield*/, adapter.getTransaction(transaction.transactionHash)];
          case 3:
            status_2 = _a.sent();
            if (!(status_2.status !== transaction.status)) {return [3 /*break*/, 5];}
            return [4 /*yield*/, this.db
              .update(schema_1.paymentTransactions)
              .set({
                status: status_2.status,
                confirmations: status_2.confirmations,
              })
              .where((0, drizzle_orm_1.eq)(schema_1.paymentTransactions.id, paymentId))];
          case 4:
            _a.sent();
            return [2 /*return*/, status_2.status];
          case 5: return [3 /*break*/, 7];
          case 6:
            error_11 = _a.sent();
            core_1.elizaLogger.error('[PaymentService] Error checking status', { paymentId, error: error_11 });
            return [3 /*break*/, 7];
          case 7: return [2 /*return*/, transaction.status];
          case 8:
            error_12 = _a.sent();
            core_1.elizaLogger.error('[PaymentService] Error getting payment status', error_12);
            throw error_12;
          case 9: return [2];
        }
      });
    });
  };
  PaymentService.prototype.getUserBalance = function (userId, _runtime) {
    return __awaiter(this, void 0, void 0, function () {
      let balances, _i, _a, adapter, _b, _c, method, wallet, balance, error_13;
      return __generator(this, function (_d) {
        switch (_d.label) {
          case 0:
            balances = new Map();
            _i = 0, _a = this.walletAdapters.values();
            _d.label = 1;
          case 1:
            if (!(_i < _a.length)) {return [3 /*break*/, 9];}
            adapter = _a[_i];
            _b = 0, _c = adapter.supportedMethods;
            _d.label = 2;
          case 2:
            if (!(_b < _c.length)) {return [3 /*break*/, 8];}
            method = _c[_b];
            _d.label = 3;
          case 3:
            _d.trys.push([3, 6, , 7]);
            return [4 /*yield*/, this.getUserWallet(userId, method)];
          case 4:
            wallet = _d.sent();
            return [4 /*yield*/, adapter.getBalance(wallet.address, method)];
          case 5:
            balance = _d.sent();
            balances.set(method, balance);
            return [3 /*break*/, 7];
          case 6:
            error_13 = _d.sent();
            core_1.elizaLogger.warn('[PaymentService] Failed to get balance for '.concat(method), error_13);
            balances.set(method, BigInt(0));
            return [3 /*break*/, 7];
          case 7:
            _b++;
            return [3 /*break*/, 2];
          case 8:
            _i++;
            return [3 /*break*/, 1];
          case 9: return [2 /*return*/, balances];
        }
      });
    });
  };
  PaymentService.prototype.transferToMainWallet = function (userId, amount, method, runtime) {
    return __awaiter(this, void 0, void 0, function () {
      let mainWallet, request;
      return __generator(this, function (_a) {
        mainWallet = runtime.getSetting(''.concat(method, '_MAIN_WALLET')) || '';
        if (!mainWallet) {
          throw new Error('Main wallet not configured for '.concat(method));
        }
        request = {
          id: (0, core_1.asUUID)((0, uuid_1.v4)()),
          userId,
          agentId: runtime.agentId,
          actionName: 'TRANSFER_TO_MAIN',
          amount,
          method,
          recipientAddress: mainWallet,
          metadata: { type: 'self_transfer' },
        };
        return [2 /*return*/, this.executePayment(request)];
      });
    });
  };
  PaymentService.prototype.createPaymentConfirmationTask = function (request, runtime) {
    return __awaiter(this, void 0, void 0, function () {
      let taskId, worker;
      const _this = this;
      let _a;
      return __generator(this, function (_b) {
        switch (_b.label) {
          case 0:
            taskId = (0, core_1.asUUID)((0, uuid_1.v4)());
            if (!this.taskService) {return [3 /*break*/, 2];}
            return [4 /*yield*/, this.taskService.createTask({
              id: taskId,
              name: 'PAYMENT_CONFIRMATION',
              description: 'Approve payment of '.concat(request.amount, ' to ').concat(request.recipientAddress),
              roomId: (_a = request.metadata) === null || _a === void 0 ? void 0 : _a.roomId,
              entityId: request.userId,
              tags: ['AWAITING_CHOICE', 'PAYMENT'],
              metadata: {
                paymentId: request.id,
                amount: request.amount.toString(),
                method: request.method,
                recipient: request.recipientAddress,
                options: [
                  { name: 'APPROVE', description: 'Approve this payment' },
                  { name: 'REJECT', description: 'Reject this payment' },
                ],
              },
            })];
          case 1:
            _b.sent();
            worker = {
              name: 'PAYMENT_CONFIRMATION',
              execute(runtime_1, _a, task_1) { return __awaiter(_this, [runtime_1, _a, task_1], void 0, function (runtime, _b, task) {
                const option = _b.option;
                return __generator(this, function (_c) {
                  switch (_c.label) {
                    case 0:
                      if (!(option === 'APPROVE')) {return [3 /*break*/, 3];}
                      return [4 /*yield*/, this.confirmPayment(request.id, {
                        paymentId: request.id,
                        approved: true,
                        approvedBy: request.userId,
                        approvedAt: Date.now(),
                      })];
                    case 1:
                      _c.sent();
                      return [4 /*yield*/, this.taskService.deleteTask(task.id)];
                    case 2:
                      _c.sent();
                      return [3 /*break*/, 6];
                    case 3: return [4 /*yield*/, this.cancelPayment(request.id)];
                    case 4:
                      _c.sent();
                      return [4 /*yield*/, this.taskService.deleteTask(task.id)];
                    case 5:
                      _c.sent();
                      _c.label = 6;
                    case 6: return [2];
                  }
                });
              }); },
            };
            runtime.registerTaskWorker(worker);
            _b.label = 2;
          case 2: return [2 /*return*/, taskId];
        }
      });
    });
  };
  PaymentService.prototype.hasSufficientFunds = function (userId, amount, method, _runtime) {
    return __awaiter(this, void 0, void 0, function () {
      let adapter, wallet, balance, error_14;
      return __generator(this, function (_a) {
        switch (_a.label) {
          case 0:
            _a.trys.push([0, 3, , 4]);
            adapter = this.getAdapterForMethod(method);
            if (!adapter) {
              return [2 /*return*/, false];
            }
            return [4 /*yield*/, this.getUserWallet(userId, method)];
          case 1:
            wallet = _a.sent();
            return [4 /*yield*/, adapter.getBalance(wallet.address, method)];
          case 2:
            balance = _a.sent();
            return [2 /*return*/, balance >= amount];
          case 3:
            error_14 = _a.sent();
            core_1.elizaLogger.error('[PaymentService] Error checking balance', error_14);
            return [2 /*return*/, false];
          case 4: return [2];
        }
      });
    });
  };
  PaymentService.prototype.getConfiguration = function () {
    const confirmations = new Map();
    confirmations.set(types_1.PaymentMethod.USDC_ETH, 12);
    confirmations.set(types_1.PaymentMethod.USDC_SOL, 32);
    confirmations.set(types_1.PaymentMethod.ETH, 12);
    confirmations.set(types_1.PaymentMethod.SOL, 32);
    const maxAmounts = new Map();
    maxAmounts.set(types_1.PaymentMethod.USDC_ETH, BigInt(this.settings.maxDailySpend * 1e6));
    maxAmounts.set(types_1.PaymentMethod.USDC_SOL, BigInt(this.settings.maxDailySpend * 1e6));
    maxAmounts.set(types_1.PaymentMethod.ETH, BigInt(10 * 1e18));
    maxAmounts.set(types_1.PaymentMethod.SOL, BigInt(1000 * 1e9));
    const thresholds = new Map();
    thresholds.set(types_1.PaymentMethod.USDC_ETH, BigInt(this.settings.autoApprovalThreshold * 1e6));
    thresholds.set(types_1.PaymentMethod.USDC_SOL, BigInt(this.settings.autoApprovalThreshold * 1e6));
    return {
      enabled: true,
      preferredMethods: [types_1.PaymentMethod.USDC_ETH, types_1.PaymentMethod.ETH, types_1.PaymentMethod.SOL],
      minimumConfirmations: confirmations,
      maxTransactionAmount: maxAmounts,
      requireConfirmationAbove: thresholds,
      feePercentage: 0.01,
      timeoutSeconds: 300,
    };
  };
  PaymentService.prototype.updateConfiguration = function (config) {
    // Update settings based on config
    core_1.elizaLogger.info('[PaymentService] Configuration updated', config);
  };
  PaymentService.prototype.registerWebhook = function (paymentId, callback) {
    // Store webhook for payment completion
    this.eventEmitter.once('payment:'.concat(paymentId, ':completed'), callback);
  };
  PaymentService.prototype.getPaymentHistory = function (userId, limit, offset, _runtime) {
    return __awaiter(this, void 0, void 0, function () {
      let transactions, error_15;
      return __generator(this, function (_a) {
        switch (_a.label) {
          case 0:
            _a.trys.push([0, 2, , 3]);
            return [4 /*yield*/, this.db
              .select()
              .from(schema_1.paymentTransactions)
              .where((0, drizzle_orm_1.eq)(schema_1.paymentTransactions.payerId, userId))
              .orderBy((0, drizzle_orm_1.desc)(schema_1.paymentTransactions.createdAt))
              .limit(limit)
              .offset(offset)];
          case 1:
            transactions = _a.sent();
            return [2 /*return*/, transactions.map((tx) => { return ({
              id: tx.id,
              requestId: tx.id,
              status: tx.status,
              transactionHash: tx.transactionHash,
              amount: tx.amount ? BigInt(tx.amount) : BigInt(0),
              method: tx.method,
              fromAddress: tx.fromAddress || '',
              toAddress: tx.toAddress || '',
              timestamp: tx.createdAt ? tx.createdAt.getTime() : Date.now(),
            }); })];
          case 2:
            error_15 = _a.sent();
            core_1.elizaLogger.error('[PaymentService] Error getting payment history', error_15);
            return [2 /*return*/, []];
          case 3: return [2];
        }
      });
    });
  };
  PaymentService.prototype.liquidateToPreferredMethod = function (_userId, _fromMethod, _toMethod, _amount, _runtime) {
    return __awaiter(this, void 0, void 0, function () {
      return __generator(this, (_a) => {
        // This would integrate with DEX services
        throw new Error('Liquidation not yet implemented');
      });
    });
  };
  // Additional methods
  PaymentService.prototype.cancelPayment = function (paymentId) {
    return __awaiter(this, void 0, void 0, function () {
      let transaction, error_16;
      return __generator(this, function (_a) {
        switch (_a.label) {
          case 0:
            _a.trys.push([0, 4, , 5]);
            return [4 /*yield*/, this.db
              .select()
              .from(schema_1.paymentTransactions)
              .where((0, drizzle_orm_1.eq)(schema_1.paymentTransactions.id, paymentId))
              .limit(1)];
          case 1:
            transaction = (_a.sent())[0];
            if (!transaction || transaction.status !== types_1.PaymentStatus.PENDING) {
              return [2 /*return*/, false];
            }
            // Update status to cancelled
            return [4 /*yield*/, this.db
              .update(schema_1.paymentTransactions)
              .set({
                status: types_1.PaymentStatus.CANCELLED,
                completedAt: new Date(),
              })
              .where((0, drizzle_orm_1.eq)(schema_1.paymentTransactions.id, paymentId))];
          case 2:
            // Update status to cancelled
            _a.sent();
            // Delete pending payment request
            return [4 /*yield*/, this.db.delete(schema_1.paymentRequests).where((0, drizzle_orm_1.eq)(schema_1.paymentRequests.transactionId, paymentId))];
          case 3:
            // Delete pending payment request
            _a.sent();
            this.emitPaymentEvent(types_1.PaymentEventType.PAYMENT_CANCELLED, transaction);
            return [2 /*return*/, true];
          case 4:
            error_16 = _a.sent();
            core_1.elizaLogger.error('[PaymentService] Error cancelling payment', error_16);
            return [2 /*return*/, false];
          case 5: return [2];
        }
      });
    });
  };
  PaymentService.prototype.confirmPayment = function (paymentId, confirmation) {
    return __awaiter(this, void 0, void 0, function () {
      let pendingRequest, request_1, request, error_17;
      return __generator(this, function (_a) {
        switch (_a.label) {
          case 0:
            _a.trys.push([0, 6, , 7]);
            return [4 /*yield*/, this.db
              .select()
              .from(schema_1.paymentRequests)
              .where((0, drizzle_orm_1.eq)(schema_1.paymentRequests.transactionId, paymentId))
              .limit(1)];
          case 1:
            pendingRequest = (_a.sent())[0];
            if (!pendingRequest) {
              throw new Error('Payment request not found');
            }
            if (confirmation.approved) {return [3 /*break*/, 3];}
            return [4 /*yield*/, this.cancelPayment(paymentId)];
          case 2:
            _a.sent();
            request_1 = {
              id: paymentId,
              userId: pendingRequest.userId,
              agentId: pendingRequest.agentId,
              actionName: 'PAYMENT',
              amount: BigInt(pendingRequest.amount),
              method: pendingRequest.method,
              recipientAddress: pendingRequest.recipientAddress || undefined,
              metadata: pendingRequest.metadata,
            };
            return [2 /*return*/, this.createFailedResult(request_1, 'Payment rejected')];
          case 3:
            // Delete pending request
            return [4 /*yield*/, this.db.delete(schema_1.paymentRequests).where((0, drizzle_orm_1.eq)(schema_1.paymentRequests.transactionId, paymentId))];
          case 4:
            // Delete pending request
            _a.sent();
            request = {
              id: paymentId,
              userId: pendingRequest.userId,
              agentId: pendingRequest.agentId,
              actionName: 'PAYMENT',
              amount: BigInt(pendingRequest.amount),
              method: pendingRequest.method,
              recipientAddress: pendingRequest.recipientAddress || undefined,
              metadata: pendingRequest.metadata,
            };
            return [4 /*yield*/, this.executePayment(request)];
          case 5: return [2 /*return*/, _a.sent()];
          case 6:
            error_17 = _a.sent();
            core_1.elizaLogger.error('[PaymentService] Error confirming payment', error_17);
            throw error_17;
          case 7: return [2];
        }
      });
    });
  };
  PaymentService.prototype.updateSettings = function (settings) {
    return __awaiter(this, void 0, void 0, function () {
      let _i, _a, _b, key, value, settingKey;
      return __generator(this, function (_c) {
        switch (_c.label) {
          case 0:
            this.settings = __assign(__assign({}, this.settings), settings);
            _i = 0, _a = Object.entries(settings);
            _c.label = 1;
          case 1:
            if (!(_i < _a.length)) {return [3 /*break*/, 4];}
            _b = _a[_i], key = _b[0], value = _b[1];
            settingKey = 'PAYMENT_'.concat(key.replace(/([A-Z])/g, '_$1').toUpperCase());
            return [4 /*yield*/, this.runtime.setSetting(settingKey, String(value))];
          case 2:
            _c.sent();
            _c.label = 3;
          case 3:
            _i++;
            return [3 /*break*/, 1];
          case 4:
            core_1.elizaLogger.info('[PaymentService] Settings updated', settings);
            return [2];
        }
      });
    });
  };
  PaymentService.prototype.getSettings = function () {
    return __assign({}, this.settings);
  };
  PaymentService.prototype.getCapabilities = function () {
    return __awaiter(this, void 0, void 0, function () {
      let supportedMethods, supportedCurrencies, _i, _a, adapter, _b, _c, method;
      return __generator(this, function (_d) {
        supportedMethods = [];
        supportedCurrencies = [];
        for (_i = 0, _a = this.walletAdapters.values(); _i < _a.length; _i++) {
          adapter = _a[_i];
          supportedMethods.push.apply(supportedMethods, adapter.supportedMethods);
          for (_b = 0, _c = adapter.supportedMethods; _b < _c.length; _b++) {
            method = _c[_b];
            supportedCurrencies.push(this.getPaymentCurrency(method));
          }
        }
        return [2 /*return*/, {
          supportedMethods: __spreadArray([], new Set(supportedMethods), true),
          supportedCurrencies: __spreadArray([], new Set(supportedCurrencies), true),
          features: {
            autoApproval: this.settings.autoApprovalEnabled,
            trustBasedLimits: !!this.trustService,
            secureConfirmation: !!this.secretFormService,
            recurringPayments: false,
            batchPayments: false,
            escrow: false,
          },
          limits: {
            minAmount: 0.01,
            maxAmount: this.settings.maxDailySpend,
            dailyLimit: this.settings.maxDailySpend,
          },
        }];
      });
    });
  };
  // Helper methods
  PaymentService.prototype.getAdapterForMethod = function (method) {
    for (let _i = 0, _a = this.walletAdapters.values(); _i < _a.length; _i++) {
      const adapter = _a[_i];
      if (adapter.supportedMethods.includes(method)) {
        return adapter;
      }
    }
    return null;
  };
  PaymentService.prototype.getUserWallet = function (userId, method) {
    return __awaiter(this, void 0, void 0, function () {
      let adapter, network, existingWallet, encryptionKey_1, privateKey, newWallet, encryptionKey, encryptedPrivateKey;
      return __generator(this, function (_a) {
        switch (_a.label) {
          case 0:
            adapter = this.getAdapterForMethod(method);
            if (!adapter) {
              throw new Error('No adapter for '.concat(method));
            }
            network = this.getNetworkForMethod(method);
            return [4 /*yield*/, this.db
              .select()
              .from(schema_1.userWallets)
              .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.userWallets.userId, userId), (0, drizzle_orm_1.eq)(schema_1.userWallets.network, network), (0, drizzle_orm_1.eq)(schema_1.userWallets.isActive, true)))
              .limit(1)];
          case 1:
            existingWallet = (_a.sent())[0];
            if (existingWallet && existingWallet.encryptedPrivateKey) {
              encryptionKey_1 = this.runtime.getSetting('WALLET_ENCRYPTION_KEY');
              if (!encryptionKey_1) {
                throw new Error('Wallet encryption key not configured');
              }
              privateKey = (0, encryption_1.decrypt)(existingWallet.encryptedPrivateKey, encryptionKey_1);
              return [2 /*return*/, {
                address: existingWallet.address,
                privateKey,
              }];
            }
            return [4 /*yield*/, adapter.createWallet()];
          case 2:
            newWallet = _a.sent();
            encryptionKey = this.runtime.getSetting('WALLET_ENCRYPTION_KEY');
            if (!encryptionKey) {
              throw new Error('Wallet encryption key not configured');
            }
            encryptedPrivateKey = (0, encryption_1.encrypt)(newWallet.privateKey, encryptionKey);
            return [4 /*yield*/, this.db.insert(schema_1.userWallets).values({
              userId,
              address: newWallet.address,
              network,
              encryptedPrivateKey,
              isActive: true,
              metadata: {
                createdBy: 'payment-service',
                method,
              },
            })];
          case 3:
            _a.sent();
            core_1.elizaLogger.info('[PaymentService] Created new wallet for user', {
              userId,
              address: newWallet.address,
              network,
            });
            return [2 /*return*/, newWallet];
        }
      });
    });
  };
  PaymentService.prototype.getNetworkForMethod = function (method) {
    let _a;
    const methodToNetwork = (_a = {},
    _a[types_1.PaymentMethod.USDC_ETH] = 'ethereum',
    _a[types_1.PaymentMethod.USDC_SOL] = 'solana',
    _a[types_1.PaymentMethod.ETH] = 'ethereum',
    _a[types_1.PaymentMethod.SOL] = 'solana',
    _a[types_1.PaymentMethod.BTC] = 'bitcoin',
    _a[types_1.PaymentMethod.MATIC] = 'polygon',
    _a[types_1.PaymentMethod.ARB] = 'arbitrum',
    _a[types_1.PaymentMethod.OP] = 'optimism',
    _a[types_1.PaymentMethod.BASE] = 'base',
    _a[types_1.PaymentMethod.OTHER] = 'unknown',
    _a);
    return methodToNetwork[method] || 'unknown';
  };
  PaymentService.prototype.getPaymentCurrency = function (method) {
    let _a;
    const methodToCurrency = (_a = {},
    _a[types_1.PaymentMethod.USDC_ETH] = 'USDC',
    _a[types_1.PaymentMethod.USDC_SOL] = 'USDC',
    _a[types_1.PaymentMethod.ETH] = 'ETH',
    _a[types_1.PaymentMethod.SOL] = 'SOL',
    _a[types_1.PaymentMethod.BTC] = 'BTC',
    _a[types_1.PaymentMethod.MATIC] = 'MATIC',
    _a[types_1.PaymentMethod.ARB] = 'ARB',
    _a[types_1.PaymentMethod.OP] = 'OP',
    _a[types_1.PaymentMethod.BASE] = 'ETH',
    _a[types_1.PaymentMethod.OTHER] = 'UNKNOWN',
    _a);
    return methodToCurrency[method] || 'UNKNOWN';
  };
  PaymentService.prototype.getTrustScore = function (userId) {
    return __awaiter(this, void 0, void 0, function () {
      let error_18;
      return __generator(this, function (_a) {
        switch (_a.label) {
          case 0:
            if (!this.trustService) {
              return [2 /*return*/, 0];
            }
            _a.label = 1;
          case 1:
            _a.trys.push([1, 3, , 4]);
            return [4 /*yield*/, this.trustService.getTrustScore(userId)];
          case 2: return [2 /*return*/, _a.sent()];
          case 3:
            error_18 = _a.sent();
            core_1.elizaLogger.warn('[PaymentService] Failed to get trust score', error_18);
            return [2 /*return*/, 0];
          case 4: return [2];
        }
      });
    });
  };
  PaymentService.prototype.convertToUSD = function (amount, method) {
    return __awaiter(this, void 0, void 0, function () {
      let priceOracle, error_19, currency, prices, price, decimals;
      return __generator(this, function (_a) {
        switch (_a.label) {
          case 0:
            priceOracle = this.runtime.getService('payment-price-oracle');
            if (!priceOracle) {return [3 /*break*/, 4];}
            _a.label = 1;
          case 1:
            _a.trys.push([1, 3, , 4]);
            return [4 /*yield*/, priceOracle.convertToUSD(amount, method)];
          case 2: return [2 /*return*/, _a.sent()];
          case 3:
            error_19 = _a.sent();
            core_1.elizaLogger.warn('[PaymentService] Price oracle failed, using fallback', error_19);
            return [3 /*break*/, 4];
          case 4:
            currency = this.getPaymentCurrency(method);
            prices = {
              USDC: 1,
              ETH: 2500,
              SOL: 100,
              BTC: 50000,
            };
            price = prices[currency] || 1;
            decimals = method.includes('ETH') ? 18 : method.includes('SOL') ? 9 : 6;
            return [2 /*return*/, (Number(amount) / Math.pow(10, decimals)) * price];
        }
      });
    });
  };
  PaymentService.prototype.getDailySpending = function (userId) {
    return __awaiter(this, void 0, void 0, function () {
      let now, startOfDay, record, error_20;
      return __generator(this, function (_a) {
        switch (_a.label) {
          case 0:
            _a.trys.push([0, 2, , 3]);
            now = new Date();
            startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
            return [4 /*yield*/, this.db
              .select()
              .from(schema_1.dailySpending)
              .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.dailySpending.userId, userId), (0, drizzle_orm_1.sql)(templateObject_2 || (templateObject_2 = __makeTemplateObject(['DATE(', ') = DATE(', ')'], ['DATE(', ') = DATE(', ')'])), schema_1.dailySpending.date, startOfDay)))
              .limit(1)];
          case 1:
            record = (_a.sent())[0];
            return [2 /*return*/, record ? (record.totalSpentUsd ? parseFloat(record.totalSpentUsd) : 0) : 0];
          case 2:
            error_20 = _a.sent();
            core_1.elizaLogger.error('[PaymentService] Error getting daily spending', error_20);
            return [2 /*return*/, 0];
          case 3: return [2];
        }
      });
    });
  };
  PaymentService.prototype.checkBalance = function (request) {
    return __awaiter(this, void 0, void 0, function () {
      let adapter, wallet, balance, error_21;
      return __generator(this, function (_a) {
        switch (_a.label) {
          case 0:
            _a.trys.push([0, 3, , 4]);
            adapter = this.getAdapterForMethod(request.method);
            if (!adapter) {
              return [2 /*return*/, false];
            }
            return [4 /*yield*/, this.getUserWallet(request.userId, request.method)];
          case 1:
            wallet = _a.sent();
            return [4 /*yield*/, adapter.getBalance(wallet.address, request.method)];
          case 2:
            balance = _a.sent();
            return [2 /*return*/, balance >= request.amount];
          case 3:
            error_21 = _a.sent();
            core_1.elizaLogger.error('[PaymentService] Error checking balance', error_21);
            return [2 /*return*/, false];
          case 4: return [2];
        }
      });
    });
  };
  PaymentService.prototype.addToHistory = function (_userId, _transaction) {
    // Remove this method since it references non-existent property
    // History is now stored in database, not in memory
  };
  PaymentService.prototype.emitPaymentEvent = function (type, transaction) {
    const event = {
      type,
      paymentId: transaction.id,
      userId: transaction.payerId,
      agentId: this.runtime.agentId,
      timestamp: Date.now(),
      data: { transaction },
    };
    this.eventEmitter.emit(type, event);
    this.eventEmitter.emit('payment:'.concat(transaction.id, ':').concat(type), transaction);
    // Log event
    core_1.elizaLogger.info('[PaymentService] Event: '.concat(type), {
      paymentId: transaction.id,
      status: transaction.status,
    });
  };
  PaymentService.prototype.createConfirmationTask = function (request, _transactionId) {
    return __awaiter(this, void 0, void 0, function () {
      return __generator(this, function (_a) {
        switch (_a.label) {
          case 0:
            // Implementation handled in createPaymentConfirmationTask
            return [4 /*yield*/, this.createPaymentConfirmationTask(request, this.runtime)];
          case 1:
            // Implementation handled in createPaymentConfirmationTask
            _a.sent();
            return [2];
        }
      });
    });
  };
  PaymentService.prototype.createVerificationForm = function (request, transactionId) {
    return __awaiter(this, void 0, void 0, function () {
      let verificationCode, currentRequest, currentMetadata, formResult, error_22;
      const _this = this;
      let _a;
      return __generator(this, function (_b) {
        switch (_b.label) {
          case 0:
            if (!this.secretFormService) {
              return [2];
            }
            _b.label = 1;
          case 1:
            _b.trys.push([1, 5, , 6]);
            verificationCode = Math.floor(100000 + Math.random() * 900000).toString();
            return [4 /*yield*/, this.db
              .select()
              .from(schema_1.paymentRequests)
              .where((0, drizzle_orm_1.eq)(schema_1.paymentRequests.transactionId, transactionId))
              .limit(1)];
          case 2:
            currentRequest = _b.sent();
            currentMetadata = ((_a = currentRequest[0]) === null || _a === void 0 ? void 0 : _a.metadata) || {};
            // Store verification code in payment request metadata
            return [4 /*yield*/, this.db
              .update(schema_1.paymentRequests)
              .set({
                metadata: __assign(__assign({}, currentMetadata), { verificationCode, verificationCodeExpiry: Date.now() + 300000 }),
              })
              .where((0, drizzle_orm_1.eq)(schema_1.paymentRequests.transactionId, transactionId))];
          case 3:
            // Store verification code in payment request metadata
            _b.sent();
            return [4 /*yield*/, this.secretFormService.createSecretForm({
              title: 'Payment Authorization Required',
              description: 'Please authorize payment of '.concat(request.amount, ' ').concat(this.getPaymentCurrency(request.method), '. Check your secure channel for the verification code.'),
              secrets: [
                {
                  key: 'authorization_code',
                  config: {
                    type: 'text',
                    description: 'Enter your 6-digit authorization code',
                    required: true,
                    pattern: '^[0-9]{6}$',
                  },
                },
              ],
              mode: 'inline',
              maxSubmissions: 3, // Allow 3 attempts
              expiresIn: 300000, // 5 minutes
            }, { entityId: request.userId }, (submission) => { return __awaiter(_this, void 0, void 0, function () {
              let pendingRequest, metadata, storedCode, expiry;
              return __generator(this, function (_a) {
                switch (_a.label) {
                  case 0: return [4 /*yield*/, this.db
                    .select()
                    .from(schema_1.paymentRequests)
                    .where((0, drizzle_orm_1.eq)(schema_1.paymentRequests.transactionId, transactionId))
                    .limit(1)];
                  case 1:
                    pendingRequest = (_a.sent())[0];
                    if (!pendingRequest) {
                      throw new Error('Payment request not found');
                    }
                    metadata = pendingRequest.metadata;
                    storedCode = metadata === null || metadata === void 0 ? void 0 : metadata.verificationCode;
                    expiry = metadata === null || metadata === void 0 ? void 0 : metadata.verificationCodeExpiry;
                    if (!(storedCode &&
                                                submission.data.authorization_code === storedCode &&
                                                expiry &&
                                                Date.now() < expiry)) {return [3 /*break*/, 3];}
                    return [4 /*yield*/, this.confirmPayment(transactionId, {
                      paymentId: transactionId,
                      approved: true,
                      approvedBy: request.userId,
                      approvedAt: Date.now(),
                    })];
                  case 2:
                    _a.sent();
                    return [3 /*break*/, 4];
                  case 3: throw new Error('Invalid or expired verification code');
                  case 4: return [2];
                }
              });
            }); })];
          case 4:
            formResult = _b.sent();
            // Send verification code through secure channel (email, SMS, etc.)
            // This would integrate with notification service
            core_1.elizaLogger.info('[PaymentService] Verification form created', {
              paymentId: transactionId,
              formUrl: formResult.url,
              // Don't log the actual code for security
            });
            // TODO: Implement notification service integration to send code
            core_1.elizaLogger.warn('[PaymentService] Verification code generated but notification service not implemented', {
              paymentId: transactionId,
              // For testing only - remove in production
              testCode: process.env.NODE_ENV === 'test' ? verificationCode : undefined,
            });
            return [3 /*break*/, 6];
          case 5:
            error_22 = _b.sent();
            core_1.elizaLogger.error('[PaymentService] Failed to create verification form', error_22);
            return [3 /*break*/, 6];
          case 6: return [2];
        }
      });
    });
  };
  PaymentService.prototype.stop = function () {
    return __awaiter(this, void 0, void 0, function () {
      return __generator(this, function (_a) {
        core_1.elizaLogger.info('[PaymentService] Stopping payment service');
        // Clear intervals
        this.eventEmitter.removeAllListeners();
        return [2];
      });
    });
  };
  PaymentService.start = function (runtime) {
    return __awaiter(this, void 0, void 0, function () {
      let service;
      return __generator(this, (_a) => {
        switch (_a.label) {
          case 0:
            service = new PaymentService();
            return [4 /*yield*/, service.initialize(runtime)];
          case 1:
            _a.sent();
            return [2 /*return*/, service];
        }
      });
    });
  };
  PaymentService.prototype.updateDailySpending = function (userId, amount, method) {
    return __awaiter(this, void 0, void 0, function () {
      let amountUsd, now, startOfDay, spending, newSpending, currentTotal, currentCount, error_23;
      return __generator(this, function (_a) {
        switch (_a.label) {
          case 0:
            _a.trys.push([0, 7, , 8]);
            return [4 /*yield*/, this.convertToUSD(amount, method)];
          case 1:
            amountUsd = _a.sent();
            now = new Date();
            startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
            return [4 /*yield*/, this.db
              .select()
              .from(schema_1.dailySpending)
              .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.dailySpending.userId, userId), (0, drizzle_orm_1.sql)(templateObject_3 || (templateObject_3 = __makeTemplateObject(['DATE(', ') = DATE(', ')'], ['DATE(', ') = DATE(', ')'])), schema_1.dailySpending.date, startOfDay)))
              .limit(1)];
          case 2:
            spending = (_a.sent())[0];
            if (spending) {return [3 /*break*/, 4];}
            newSpending = {
              id: (0, core_1.asUUID)((0, uuid_1.v4)()),
              userId,
              date: startOfDay.toISOString(),
              totalSpentUsd: amountUsd.toString(),
              transactionCount: 1,
            };
            return [4 /*yield*/, this.db.insert(schema_1.dailySpending).values(newSpending)];
          case 3:
            _a.sent();
            return [3 /*break*/, 6];
          case 4:
            currentTotal = spending.totalSpentUsd ? parseFloat(spending.totalSpentUsd) : 0;
            currentCount = spending.transactionCount || 0;
            return [4 /*yield*/, this.db
              .update(schema_1.dailySpending)
              .set({
                totalSpentUsd: (currentTotal + amountUsd).toString(),
                transactionCount: currentCount + 1,
              })
              .where((0, drizzle_orm_1.eq)(schema_1.dailySpending.id, spending.id))];
          case 5:
            _a.sent();
            _a.label = 6;
          case 6: return [3 /*break*/, 8];
          case 7:
            error_23 = _a.sent();
            core_1.elizaLogger.error('[PaymentService] Error updating daily spending', error_23);
            return [3 /*break*/, 8];
          case 8: return [2];
        }
      });
    });
  };
  PaymentService.serviceName = 'payment';
  PaymentService.serviceType = core_1.ServiceType.UNKNOWN;
  return PaymentService;
}(core_1.Service));
exports.PaymentService = PaymentService;
let templateObject_1, templateObject_2, templateObject_3;
