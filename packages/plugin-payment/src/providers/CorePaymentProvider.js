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
exports.CorePaymentProvider = void 0;
const core_1 = require('@elizaos/core');
const types_1 = require('../types');
/**
 * Core Payment Provider that implements the IPaymentProvider interface
 * Bridges between the core payment types and the Payment plugin's PaymentService
 */
const CorePaymentProvider = /** @class */ (function () {
  function CorePaymentProvider(runtime, paymentService, priceOracleService) {
    this.runtime = runtime;
    this.paymentService = paymentService;
    this.priceOracleService = priceOracleService;
  }
  /**
     * Process a payment request
     */
  CorePaymentProvider.prototype.processPayment = function (request) {
    return __awaiter(this, void 0, void 0, function () {
      let pluginRequest, result, coreTransaction, error_1;
      return __generator(this, function (_a) {
        switch (_a.label) {
          case 0:
            _a.trys.push([0, 2, , 3]);
            core_1.logger.info('[CorePaymentProvider] Processing payment:', {
              amount: request.amount,
              method: request.method,
              entityId: request.entityId,
            });
            pluginRequest = {
              id: request.id || (0, core_1.asUUID)('payment-'.concat(Date.now())),
              userId: request.entityId,
              agentId: this.runtime.agentId,
              actionName: request.description || 'PAYMENT',
              amount: BigInt(request.amount),
              method: this.convertPaymentMethod(request.method),
              recipientAddress: request.recipientAddress,
              metadata: __assign(__assign({}, request.metadata), { originalRequest: request }),
              requiresConfirmation: request.requiresConfirmation,
              trustRequired: request.trustRequired !== false, // Default to true
            };
            return [4 /*yield*/, this.paymentService.processPayment(pluginRequest, this.runtime)];
          case 1:
            result = _a.sent();
            coreTransaction = {
              id: result.id,
              recipientId: (0, core_1.asUUID)(request.recipientAddress || ''),
              amount: request.amount, // Keep as string
              currency: this.getCurrencyFromMethod(request.method),
              method: request.method,
              status: this.convertPaymentStatus(result.status),
              transactionHash: result.transactionHash,
              createdAt: result.timestamp,
              completedAt: result.status === types_1.PaymentStatus.COMPLETED ? result.timestamp : undefined,
              confirmations: 0, // Would get from blockchain
              metadata: __assign(__assign({}, result.metadata), { pluginResult: result, originalRequest: request, payerId: request.entityId }),
            };
            return [2 /*return*/, coreTransaction];
          case 2:
            error_1 = _a.sent();
            core_1.logger.error('[CorePaymentProvider] Error processing payment:', error_1);
            throw new Error('Payment processing failed: '.concat(error_1.message));
          case 3: return [2];
        }
      });
    });
  };
  /**
     * Get payment profile for an entity
     */
  CorePaymentProvider.prototype.getPaymentProfile = function (entityId) {
    return __awaiter(this, void 0, void 0, function () {
      let history_1, settings, totalTransactions, totalVolume, successfulTransactions, balances, trustScore, successRate, profile, error_2;
      return __generator(this, function (_a) {
        switch (_a.label) {
          case 0:
            _a.trys.push([0, 3, , 4]);
            core_1.logger.debug('[CorePaymentProvider] Getting payment profile for entity:', entityId);
            return [4 /*yield*/, this.paymentService.getPaymentHistory(entityId, 100, 0, this.runtime)];
          case 1:
            history_1 = _a.sent();
            settings = this.paymentService.getSettings();
            totalTransactions = history_1.length;
            totalVolume = history_1
              .filter((tx) => { return tx.status === types_1.PaymentStatus.COMPLETED; })
              .reduce((sum, tx) => { return sum + Number(tx.amount); }, 0);
            successfulTransactions = history_1.filter((tx) => { return tx.status === types_1.PaymentStatus.COMPLETED; }).length;
            return [4 /*yield*/, this.paymentService.getUserBalance(entityId, this.runtime)];
          case 2:
            balances = _a.sent();
            trustScore = 0.5;
            if (totalTransactions > 0) {
              successRate = successfulTransactions / totalTransactions;
              trustScore = Math.min(0.9, 0.3 + successRate * 0.6); // Scale from 0.3 to 0.9
            }
            profile = {
              entityId,
              preferredMethod: this.getPreferredMethods(balances)[0] || 'usdc_eth',
              verifiedMethods: this.getVerifiedMethods(balances),
              trustScore,
              transactionHistory: {
                totalTransactions,
                successfulTransactions,
                failedTransactions: totalTransactions - successfulTransactions,
                totalVolume,
                averageAmount: totalTransactions > 0 ? totalVolume / totalTransactions : 0,
                lastTransactionAt: history_1.length > 0 ? history_1[0].timestamp : undefined,
              },
              riskLevel: this.calculateRiskLevel(trustScore, totalVolume, successfulTransactions / Math.max(totalTransactions, 1)),
              limits: {
                dailyLimit: settings.maxDailySpend,
                maxTransactionAmount: 10000, // From capabilities
                minTransactionAmount: 0.01,
              },
              settings: {
                autoApprovalThreshold: settings.autoApprovalThreshold,
                preferredCurrency: settings.defaultCurrency,
                requireConfirmation: settings.requireConfirmation,
              },
              metadata: {
                profileCreatedAt: Date.now(),
                lastUpdated: Date.now(),
                settings,
                balances: this.formatBalancesForProfile(balances),
              },
            };
            return [2 /*return*/, profile];
          case 3:
            error_2 = _a.sent();
            core_1.logger.error('[CorePaymentProvider] Error getting payment profile:', error_2);
            // Return basic profile on error
            return [2 /*return*/, {
              entityId,
              preferredMethod: 'usdc_eth',
              verifiedMethods: [],
              riskLevel: 'medium',
              limits: {
                dailyLimit: 1000,
                maxTransactionAmount: 10000,
                minTransactionAmount: 0.01,
              },
              settings: {
                autoApprovalThreshold: 10,
                preferredCurrency: 'USDC',
                requireConfirmation: true,
              },
              metadata: {
                profileCreatedAt: Date.now(),
                lastUpdated: Date.now(),
                error: error_2 instanceof Error ? error_2.message : 'Unknown error',
              },
            }];
          case 4: return [2];
        }
      });
    });
  };
  /**
     * Get payment history for an entity
     */
  CorePaymentProvider.prototype.getPaymentHistory = function (entityId, limit, offset) {
    return __awaiter(this, void 0, void 0, function () {
      let history_3, transactions, _i, history_2, result, coreTransaction, error_3;
      return __generator(this, function (_a) {
        switch (_a.label) {
          case 0:
            _a.trys.push([0, 2, , 3]);
            core_1.logger.debug('[CorePaymentProvider] Getting payment history:', { entityId, limit, offset });
            return [4 /*yield*/, this.paymentService.getPaymentHistory(entityId, limit || 50, offset || 0, this.runtime)];
          case 1:
            history_3 = _a.sent();
            transactions = [];
            for (_i = 0, history_2 = history_3; _i < history_2.length; _i++) {
              result = history_2[_i];
              coreTransaction = {
                id: result.id,
                recipientId: (0, core_1.asUUID)(result.toAddress || ''),
                amount: result.amount.toString(), // Keep as string
                currency: this.getCurrencyFromMethod(result.method),
                method: result.method,
                status: this.convertPaymentStatus(result.status),
                transactionHash: result.transactionHash,
                createdAt: result.timestamp,
                completedAt: result.status === types_1.PaymentStatus.COMPLETED ? result.timestamp : undefined,
                confirmations: 0, // Would get from blockchain
                metadata: __assign(__assign({}, result.metadata), { originalResult: result }),
              };
              transactions.push(coreTransaction);
            }
            return [2 /*return*/, transactions];
          case 2:
            error_3 = _a.sent();
            core_1.logger.error('[CorePaymentProvider] Error getting payment history:', error_3);
            return [2 /*return*/, []]; // Return empty array instead of throwing
          case 3: return [2];
        }
      });
    });
  };
  /**
     * Assess payment risk for an entity and amount
     */
  CorePaymentProvider.prototype.assessPaymentRisk = function (entityId, amount, method) {
    return __awaiter(this, void 0, void 0, function () {
      let amountNum, profile, riskScore, reasonCodes, successRate, dailyRemaining, level, requiresApproval, error_4;
      let _a, _b, _c, _d;
      return __generator(this, function (_e) {
        switch (_e.label) {
          case 0:
            _e.trys.push([0, 2, , 3]);
            core_1.logger.debug('[CorePaymentProvider] Assessing payment risk:', { entityId, amount, method });
            amountNum = parseFloat(amount);
            return [4 /*yield*/, this.getPaymentProfile(entityId)];
          case 1:
            profile = _e.sent();
            riskScore = 0;
            reasonCodes = [];
            // Amount-based risk
            if (amountNum > 10000) {
              riskScore += 0.3;
              reasonCodes.push('LARGE_AMOUNT');
            }
            else if (amountNum > 1000) {
              riskScore += 0.2;
              reasonCodes.push('MEDIUM_AMOUNT');
            }
            else if (amountNum > 100) {
              riskScore += 0.1;
              reasonCodes.push('MODERATE_AMOUNT');
            }
            // Trust-based risk
            if (profile.trustScore < 0.3) {
              riskScore += 0.4;
              reasonCodes.push('LOW_TRUST_SCORE');
            }
            else if (profile.trustScore < 0.6) {
              riskScore += 0.2;
              reasonCodes.push('MEDIUM_TRUST_SCORE');
            }
            successRate = ((_a = profile.transactionHistory) === null || _a === void 0 ? void 0 : _a.totalTransactions) > 0
              ? profile.transactionHistory.successfulTransactions /
                                profile.transactionHistory.totalTransactions
              : 0;
            if (successRate < 0.8) {
              riskScore += 0.2;
              reasonCodes.push('LOW_SUCCESS_RATE');
            }
            if (((_b = profile.transactionHistory) === null || _b === void 0 ? void 0 : _b.totalTransactions) < 5) {
              riskScore += 0.1;
              reasonCodes.push('NEW_USER');
            }
            dailyRemaining = ((_c = profile.limits) === null || _c === void 0 ? void 0 : _c.dailyLimit) - (((_d = profile.metadata) === null || _d === void 0 ? void 0 : _d.dailySpent) || 0);
            if (amountNum > dailyRemaining) {
              riskScore += 0.3;
              reasonCodes.push('EXCEEDS_DAILY_LIMIT');
            }
            // Method-specific risk
            if (method.includes('crypto') && amountNum > 1000) {
              riskScore += 0.1;
              reasonCodes.push('HIGH_VALUE_CRYPTO');
            }
            level = void 0;
            requiresApproval = false;
            if (riskScore >= 0.7) {
              level = 'high';
              requiresApproval = true;
            }
            else if (riskScore >= 0.4) {
              level = 'medium';
              requiresApproval = amountNum > profile.settings.autoApprovalThreshold;
            }
            else {
              level = 'low';
              requiresApproval = false;
            }
            return [2 /*return*/, {
              level,
              score: riskScore,
              requiresApproval,
              reasonCodes,
              metadata: {
                amountUsd: amountNum,
                trustScore: profile.trustScore,
                successRate,
                dailyRemaining,
                assessedAt: Date.now(),
                profile: {
                  totalTransactions: profile.transactionHistory.totalTransactions,
                  averageAmount: profile.transactionHistory.averageAmount,
                  lastTransaction: profile.transactionHistory.lastTransactionAt,
                },
              },
            }];
          case 2:
            error_4 = _e.sent();
            core_1.logger.error('[CorePaymentProvider] Error assessing payment risk:', error_4);
            // Return high risk on error
            return [2 /*return*/, {
              level: 'high',
              score: 1.0,
              requiresApproval: true,
              reasonCodes: ['ASSESSMENT_ERROR'],
              metadata: {
                error: error_4 instanceof Error ? error_4.message : 'Unknown error',
                assessedAt: Date.now(),
              },
            }];
          case 3: return [2];
        }
      });
    });
  };
  /**
     * Check if the entity can make a payment of the specified amount
     */
  CorePaymentProvider.prototype.canMakePayment = function (entityId, amount, method) {
    return __awaiter(this, void 0, void 0, function () {
      let pluginMethod, balances, balance, amountBigInt, error_5;
      return __generator(this, function (_a) {
        switch (_a.label) {
          case 0:
            _a.trys.push([0, 2, , 3]);
            core_1.logger.debug('[CorePaymentProvider] Checking if entity can make payment:', {
              entityId,
              amount,
              method,
            });
            pluginMethod = this.convertPaymentMethod(method);
            return [4 /*yield*/, this.paymentService.getUserBalance(entityId, this.runtime)];
          case 1:
            balances = _a.sent();
            balance = balances.get(pluginMethod) || BigInt(0);
            amountBigInt = BigInt(Math.floor(parseFloat(amount) * 1000000));
            return [2 /*return*/, balance >= amountBigInt];
          case 2:
            error_5 = _a.sent();
            core_1.logger.error('[CorePaymentProvider] Error checking payment capability:', error_5);
            return [2 /*return*/, false];
          case 3: return [2];
        }
      });
    });
  };
  /**
     * Get user balance for all or specific payment methods
     */
  CorePaymentProvider.prototype.getUserBalance = function (entityId, method) {
    return __awaiter(this, void 0, void 0, function () {
      let balances, pluginMethod, balance, error_6;
      return __generator(this, function (_a) {
        switch (_a.label) {
          case 0:
            _a.trys.push([0, 2, , 3]);
            core_1.logger.debug('[CorePaymentProvider] Getting user balance:', { entityId, method });
            return [4 /*yield*/, this.paymentService.getUserBalance(entityId, this.runtime)];
          case 1:
            balances = _a.sent();
            pluginMethod = this.convertPaymentMethod(method);
            balance = balances.get(pluginMethod) || BigInt(0);
            return [2 /*return*/, balance.toString()];
          case 2:
            error_6 = _a.sent();
            core_1.logger.error('[CorePaymentProvider] Error getting user balance:', error_6);
            return [2 /*return*/, '0'];
          case 3: return [2];
        }
      });
    });
  };
  /**
     * Create a payment confirmation
     */
  CorePaymentProvider.prototype.createPaymentConfirmation = function (request) {
    return __awaiter(this, void 0, void 0, function () {
      let confirmationId, expiresAt;
      return __generator(this, (_a) => {
        try {
          core_1.logger.debug('[CorePaymentProvider] Creating payment confirmation:', {
            requestId: request.id,
          });
          confirmationId = (0, core_1.asUUID)('confirmation-'.concat(request.id, '-').concat(Date.now()));
          expiresAt = new Date(Date.now() + 5 * 60 * 1000);
          return [2 /*return*/, {
            confirmationId,
            confirmationUrl: undefined, // Could generate a confirmation URL if needed
            expiresAt,
          }];
        }
        catch (error) {
          core_1.logger.error('[CorePaymentProvider] Error creating payment confirmation:', error);
          throw new Error('Failed to create payment confirmation: '.concat(error.message));
        }
        return [2];
      });
    });
  };
  /**
     * Update payment settings for an entity
     */
  CorePaymentProvider.prototype.updatePaymentSettings = function (entityId, settings) {
    return __awaiter(this, void 0, void 0, function () {
      let pluginSettings, error_7;
      return __generator(this, function (_a) {
        switch (_a.label) {
          case 0:
            _a.trys.push([0, 2, , 3]);
            core_1.logger.info('[CorePaymentProvider] Updating payment settings:', {
              entityId,
              settings,
            });
            pluginSettings = {
              autoApprovalEnabled: settings.autoApprovalEnabled,
              autoApprovalThreshold: settings.autoApprovalThreshold,
              defaultCurrency: settings.preferredCurrency,
              requireConfirmation: settings.requireConfirmation,
              maxDailySpend: settings.dailyLimit,
            };
            return [4 /*yield*/, this.paymentService.updateSettings(pluginSettings)];
          case 1:
            _a.sent();
            core_1.logger.info('[CorePaymentProvider] Payment settings updated successfully');
            return [3 /*break*/, 3];
          case 2:
            error_7 = _a.sent();
            core_1.logger.error('[CorePaymentProvider] Error updating payment settings:', error_7);
            throw new Error('Failed to update payment settings: '.concat(error_7.message));
          case 3: return [2];
        }
      });
    });
  };
  /**
     * Get payment analytics for an entity
     */
  CorePaymentProvider.prototype.getPaymentAnalytics = function (entityId, period) {
    return __awaiter(this, void 0, void 0, function () {
      var now, start, days, months, years, history_4, startTime_1, endTime_1, periodTransactions, totalTransactions, completedTransactions, totalVolume, successRate, averageAmount, methodStats, _i, completedTransactions_1, tx, method, stats, topMethods, hourlyCount, _a, periodTransactions_1, tx, hour, hourlyDistribution, error_8;
      return __generator(this, function (_b) {
        switch (_b.label) {
          case 0:
            _b.trys.push([0, 2, , 3]);
            core_1.logger.debug('[CorePaymentProvider] Getting payment analytics:', {
              entityId,
              period,
            });
            now = new Date();
            start = new Date();
            if (period.endsWith('d')) {
              days = parseInt(period.slice(0, -1), 10);
              start.setDate(now.getDate() - days);
            }
            else if (period.endsWith('m')) {
              months = parseInt(period.slice(0, -1), 10);
              start.setMonth(now.getMonth() - months);
            }
            else if (period.endsWith('y')) {
              years = parseInt(period.slice(0, -1), 10);
              start.setFullYear(now.getFullYear() - years);
            }
            else {
              // Default to 30 days
              start.setDate(now.getDate() - 30);
            }
            return [4 /*yield*/, this.paymentService.getPaymentHistory(entityId, 1000, 0, this.runtime)];
          case 1:
            history_4 = _b.sent();
            startTime_1 = start.getTime();
            endTime_1 = now.getTime();
            periodTransactions = history_4.filter((tx) => { return tx.timestamp >= startTime_1 && tx.timestamp <= endTime_1; });
            totalTransactions = periodTransactions.length;
            completedTransactions = periodTransactions.filter((tx) => { return tx.status === types_1.PaymentStatus.COMPLETED; });
            totalVolume = completedTransactions.reduce((sum, tx) => { return sum + Number(tx.amount); }, 0);
            successRate = totalTransactions > 0 ? completedTransactions.length / totalTransactions : 0;
            averageAmount = completedTransactions.length > 0 ? totalVolume / completedTransactions.length : 0;
            methodStats = new Map();
            for (_i = 0, completedTransactions_1 = completedTransactions; _i < completedTransactions_1.length; _i++) {
              tx = completedTransactions_1[_i];
              method = tx.method;
              stats = methodStats.get(method) || { count: 0, volume: 0 };
              stats.count++;
              stats.volume += Number(tx.amount);
              methodStats.set(method, stats);
            }
            topMethods = Array.from(methodStats.entries())
              .map((_a) => {
                const method = _a[0], stats = _a[1];
                return ({
                  method,
                  count: stats.count,
                  volume: stats.volume,
                });
              })
              .sort((a, b) => { return b.volume - a.volume; })
              .slice(0, 5);
            hourlyCount = new Array(24).fill(0);
            for (_a = 0, periodTransactions_1 = periodTransactions; _a < periodTransactions_1.length; _a++) {
              tx = periodTransactions_1[_a];
              hour = new Date(tx.timestamp).getHours();
              hourlyCount[hour]++;
            }
            hourlyDistribution = hourlyCount.map((count, hour) => { return ({ hour, count }); });
            return [2 /*return*/, {
              totalTransactions,
              totalVolume,
              successRate,
              averageAmount,
              topMethods,
              hourlyDistribution,
            }];
          case 2:
            error_8 = _b.sent();
            core_1.logger.error('[CorePaymentProvider] Error getting payment analytics:', error_8);
            // Return empty analytics on error
            return [2 /*return*/, {
              totalTransactions: 0,
              totalVolume: 0,
              successRate: 0,
              averageAmount: 0,
              topMethods: [],
              hourlyDistribution: Array.from({ length: 24 }, (_, hour) => { return ({ hour, count: 0 }); }),
            }];
          case 3: return [2];
        }
      });
    });
  };
  // === Private Helper Methods ===
  CorePaymentProvider.prototype.convertPaymentMethod = function (coreMethod) {
    const methodMap = {
      usdc_eth: types_1.PaymentMethod.USDC_ETH,
      usdc_sol: types_1.PaymentMethod.USDC_SOL,
      eth: types_1.PaymentMethod.ETH,
      sol: types_1.PaymentMethod.SOL,
      btc: types_1.PaymentMethod.BTC,
      matic: types_1.PaymentMethod.MATIC,
      arb: types_1.PaymentMethod.ARB,
      op: types_1.PaymentMethod.OP,
      base: types_1.PaymentMethod.BASE,
      other: types_1.PaymentMethod.OTHER,
    };
    return methodMap[coreMethod] || types_1.PaymentMethod.OTHER;
  };
  CorePaymentProvider.prototype.getCurrencyFromMethod = function (method) {
    const methodToCurrency = {
      usdc_eth: 'USDC',
      usdc_sol: 'USDC',
      eth: 'ETH',
      sol: 'SOL',
      btc: 'BTC',
      matic: 'MATIC',
      arb: 'ARB',
      op: 'OP',
      base: 'ETH',
      other: 'UNKNOWN',
    };
    return methodToCurrency[method] || 'UNKNOWN';
  };
  CorePaymentProvider.prototype.getPreferredMethods = function (balances) {
    const preferred = [];
    // Prioritize based on balance availability
    for (let _i = 0, balances_1 = balances; _i < balances_1.length; _i++) {
      const _a = balances_1[_i], method = _a[0], balance = _a[1];
      if (balance > BigInt(0)) {
        const coreMethod = this.convertPluginMethodToCore(method);
        preferred.push(coreMethod);
      }
    }
    // Add defaults if none available
    if (preferred.length === 0) {
      preferred.push('usdc_eth', 'eth', 'sol');
    }
    return preferred.slice(0, 3); // Top 3
  };
  CorePaymentProvider.prototype.getVerifiedMethods = function (balances) {
    const verified = [];
    for (let _i = 0, balances_2 = balances; _i < balances_2.length; _i++) {
      const _a = balances_2[_i], method = _a[0], balance = _a[1];
      if (balance > BigInt(0)) {
        const coreMethod = this.convertPluginMethodToCore(method);
        verified.push(coreMethod);
      }
    }
    return verified;
  };
  CorePaymentProvider.prototype.convertPluginMethodToCore = function (method) {
    let _a;
    const methodMap = (_a = {},
    _a[types_1.PaymentMethod.USDC_ETH] = 'usdc_eth',
    _a[types_1.PaymentMethod.USDC_SOL] = 'usdc_sol',
    _a[types_1.PaymentMethod.ETH] = 'eth',
    _a[types_1.PaymentMethod.SOL] = 'sol',
    _a[types_1.PaymentMethod.BTC] = 'btc',
    _a[types_1.PaymentMethod.MATIC] = 'matic',
    _a[types_1.PaymentMethod.ARB] = 'arb',
    _a[types_1.PaymentMethod.OP] = 'op',
    _a[types_1.PaymentMethod.BASE] = 'base',
    _a[types_1.PaymentMethod.OTHER] = 'other',
    _a);
    return methodMap[method] || 'other';
  };
  CorePaymentProvider.prototype.formatBalancesForProfile = function (balances) {
    const formatted = {};
    for (let _i = 0, balances_3 = balances; _i < balances_3.length; _i++) {
      const _a = balances_3[_i], method = _a[0], balance = _a[1];
      const coreMethod = this.convertPluginMethodToCore(method);
      formatted[coreMethod] = balance.toString();
    }
    return formatted;
  };
  CorePaymentProvider.prototype.convertPaymentStatus = function (pluginStatus) {
    switch (pluginStatus) {
      case types_1.PaymentStatus.PENDING:
        return 'pending';
      case types_1.PaymentStatus.PROCESSING:
        return 'processing';
      case types_1.PaymentStatus.COMPLETED:
        return 'completed';
      case types_1.PaymentStatus.FAILED:
        return 'failed';
      case types_1.PaymentStatus.CANCELLED:
        return 'cancelled';
      default:
        return 'pending';
    }
  };
  CorePaymentProvider.prototype.calculateRiskLevel = function (trustScore, totalVolume, successRate) {
    let riskScore = 0;
    // Trust-based risk
    if (trustScore < 0.3) {
      riskScore += 0.4;
    }
    else if (trustScore < 0.6) {
      riskScore += 0.2;
    }
    // Volume-based risk
    if (totalVolume > 100000) {
      riskScore += 0.1;
    }
    else if (totalVolume < 100) {
      riskScore += 0.2;
    }
    // Success rate risk
    if (successRate < 0.8) {
      riskScore += 0.3;
    }
    else if (successRate < 0.9) {
      riskScore += 0.1;
    }
    if (riskScore >= 0.6) {
      return 'high';
    }
    if (riskScore >= 0.3) {
      return 'medium';
    }
    return 'low';
  };
  CorePaymentProvider.prototype.calculateVerificationLevel = function (trustScore, totalTransactions, totalVolume) {
    if (trustScore >= 0.8 && totalTransactions >= 10 && totalVolume >= 1000) {
      return 'premium';
    }
    else if (trustScore >= 0.6 && totalTransactions >= 5) {
      return 'verified';
    }
    else if (trustScore >= 0.4 || totalTransactions >= 1) {
      return 'basic';
    }
    else {
      return 'unverified';
    }
  };
  CorePaymentProvider.prototype.getEntityBalances = function (entityId) {
    return __awaiter(this, void 0, void 0, function () {
      let balances, stringBalances_1, error_9;
      return __generator(this, function (_a) {
        switch (_a.label) {
          case 0:
            _a.trys.push([0, 2, , 3]);
            return [4 /*yield*/, this.paymentService.getUserBalance(entityId, this.runtime)];
          case 1:
            balances = _a.sent();
            stringBalances_1 = {};
            Object.entries(balances).forEach((_a) => {
              const key = _a[0], value = _a[1];
              stringBalances_1[key] = value.toString();
            });
            return [2 /*return*/, stringBalances_1];
          case 2:
            error_9 = _a.sent();
            core_1.logger.warn('[CorePaymentProvider] Could not get entity balances:', error_9);
            return [2 /*return*/, {}];
          case 3: return [2];
        }
      });
    });
  };
  return CorePaymentProvider;
}());
exports.CorePaymentProvider = CorePaymentProvider;
