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
exports.createPaymentMiddleware = createPaymentMiddleware;
exports.requiresPayment = requiresPayment;
const core_1 = require('@elizaos/core');
const types_1 = require('../types');
const uuid_1 = require('uuid');
/**
 * Middleware to require payment before executing actions
 */
function createPaymentMiddleware(options) {
  const _this = this;
  return function (runtime, message, state, callback, next) { return __awaiter(_this, void 0, void 0, function () {
    let paymentService, recentPayment, paymentRequest, result, error_1;
    let _a, _b, _c, _d;
    return __generator(this, (_e) => {
      switch (_e.label) {
        case 0:
          _e.trys.push([0, 11, , 13]);
          core_1.elizaLogger.info('[PaymentMiddleware] Processing payment requirement', {
            amount: options.amount.toString(),
            method: options.method,
            action: (_a = message.content) === null || _a === void 0 ? void 0 : _a.action,
          });
          paymentService = runtime.getService('payment');
          if (paymentService) {return [3 /*break*/, 2];}
          core_1.elizaLogger.error('[PaymentMiddleware] Payment service not found');
          return [4 /*yield*/, callback({
            text: 'Payment service is not available. Please try again later.',
            error: true,
          })];
        case 1:
          _e.sent();
          return [2];
        case 2: return [4 /*yield*/, shouldSkipPayment(runtime, message, options)];
        case 3:
          // Check if payment should be skipped
          if (_e.sent()) {
            core_1.elizaLogger.info('[PaymentMiddleware] Skipping payment for privileged user');
            return [2 /*return*/, next()];
          }
          return [4 /*yield*/, checkRecentPayment(runtime, message, options)];
        case 4:
          recentPayment = _e.sent();
          if (recentPayment) {
            core_1.elizaLogger.info('[PaymentMiddleware] Using recent payment', { paymentId: recentPayment });
            return [2 /*return*/, next()];
          }
          paymentRequest = {
            id: (0, core_1.asUUID)((0, uuid_1.v4)()),
            userId: message.entityId,
            agentId: runtime.agentId,
            actionName: ((_b = message.content) === null || _b === void 0 ? void 0 : _b.action) || 'unknown',
            amount: options.amount,
            method: options.method || types_1.PaymentMethod.USDC_ETH,
            metadata: __assign(__assign({}, options.metadata), { messageId: message.id, roomId: message.roomId, action: (_c = message.content) === null || _c === void 0 ? void 0 : _c.action }),
            requiresConfirmation: options.requiresConfirmation,
            trustRequired: options.trustRequired,
            minimumTrustLevel: options.minimumTrustLevel,
          };
          return [4 /*yield*/, paymentService.processPayment(paymentRequest, runtime)];
        case 5:
          result = _e.sent();
          if (!(result.status === types_1.PaymentStatus.COMPLETED)) {return [3 /*break*/, 6];}
          core_1.elizaLogger.info('[PaymentMiddleware] Payment completed successfully', {
            paymentId: result.id,
            transactionHash: result.transactionHash,
          });
          // Store payment in state for reference
          if (state) {
            state.paymentId = result.id;
            state.paymentStatus = result.status;
          }
          // Continue with the action
          return [2 /*return*/, next()];
        case 6:
          if (!(result.status === types_1.PaymentStatus.PENDING)) {return [3 /*break*/, 8];}
          core_1.elizaLogger.info('[PaymentMiddleware] Payment pending confirmation', {
            paymentId: result.id,
          });
          return [4 /*yield*/, callback({
            text: 'Payment of '.concat(formatAmount(options.amount, options.method), ' is required to continue. ').concat(((_d = result.metadata) === null || _d === void 0 ? void 0 : _d.authorizationUrl)
              ? 'Please authorize the payment here: '.concat(result.metadata.authorizationUrl)
              : 'Please confirm the payment to proceed.'),
            metadata: {
              paymentId: result.id,
              paymentStatus: result.status,
              requiresAction: true,
            },
          })];
        case 7:
          _e.sent();
          return [3 /*break*/, 10];
        case 8:
          core_1.elizaLogger.error('[PaymentMiddleware] Payment failed', {
            paymentId: result.id,
            error: result.error,
          });
          return [4 /*yield*/, callback({
            text: 'Payment failed: '.concat(result.error || 'Unknown error', '. Please try again.'),
            error: true,
          })];
        case 9:
          _e.sent();
          _e.label = 10;
        case 10: return [3 /*break*/, 13];
        case 11:
          error_1 = _e.sent();
          core_1.elizaLogger.error('[PaymentMiddleware] Error processing payment', error_1);
          return [4 /*yield*/, callback({
            text: 'An error occurred while processing payment. Please try again.',
            error: true,
          })];
        case 12:
          _e.sent();
          return [3 /*break*/, 13];
        case 13: return [2];
      }
    });
  }); };
}
/**
 * Check if payment should be skipped for this user
 */
function shouldSkipPayment(runtime, message, options) {
  return __awaiter(this, void 0, void 0, function () {
    let trustService, userRole, error_2;
    let _a, _b;
    return __generator(this, (_c) => {
      switch (_c.label) {
        case 0:
          // Skip for agent's own actions
          if (message.entityId === runtime.agentId) {
            return [2 /*return*/, true];
          }
          if (!(options.skipForOwner || options.skipForAdmin)) {return [3 /*break*/, 5];}
          _c.label = 1;
        case 1:
          _c.trys.push([1, 4, , 5]);
          trustService = runtime.getService('trust');
          if (!trustService) {return [3 /*break*/, 3];}
          return [4 /*yield*/, ((_b = (_a = trustService).getUserRole) === null || _b === void 0 ? void 0 : _b.call(_a, message.entityId))];
        case 2:
          userRole = _c.sent();
          if (options.skipForOwner && userRole === 'owner') {
            return [2 /*return*/, true];
          }
          if (options.skipForAdmin && (userRole === 'admin' || userRole === 'owner')) {
            return [2 /*return*/, true];
          }
          _c.label = 3;
        case 3: return [3 /*break*/, 5];
        case 4:
          error_2 = _c.sent();
          core_1.elizaLogger.warn('[PaymentMiddleware] Error checking user role', error_2);
          return [3 /*break*/, 5];
        case 5: return [2 /*return*/, false];
      }
    });
  });
}
/**
 * Check if user has a recent payment for this action
 */
function checkRecentPayment(runtime, message, options) {
  return __awaiter(this, void 0, void 0, function () {
    let paymentService, history_2, recentCutoff, _i, history_1, payment, error_3;
    let _a, _b, _c;
    return __generator(this, (_d) => {
      switch (_d.label) {
        case 0:
          _d.trys.push([0, 2, , 3]);
          paymentService = runtime.getService('payment');
          if (!paymentService) {
            return [2 /*return*/, null];
          }
          return [4 /*yield*/, paymentService.getPaymentHistory(message.entityId, 10, // Last 10 payments
            0, runtime)];
        case 1:
          history_2 = _d.sent();
          recentCutoff = Date.now() - (((_a = options.metadata) === null || _a === void 0 ? void 0 : _a.validityPeriod) || 3600000);
          for (_i = 0, history_1 = history_2; _i < history_1.length; _i++) {
            payment = history_1[_i];
            if (payment.status === types_1.PaymentStatus.COMPLETED &&
                            payment.timestamp > recentCutoff &&
                            ((_b = payment.metadata) === null || _b === void 0 ? void 0 : _b.action) === ((_c = message.content) === null || _c === void 0 ? void 0 : _c.action) &&
                            payment.amount === options.amount &&
                            payment.method === options.method) {
              return [2 /*return*/, payment.id];
            }
          }
          return [3 /*break*/, 3];
        case 2:
          error_3 = _d.sent();
          core_1.elizaLogger.warn('[PaymentMiddleware] Error checking recent payments', error_3);
          return [3 /*break*/, 3];
        case 3: return [2 /*return*/, null];
      }
    });
  });
}
/**
 * Format amount for display
 */
function formatAmount(amount, method) {
  let _a;
  const methodDecimals = (_a = {},
  _a[types_1.PaymentMethod.USDC_ETH] = 6,
  _a[types_1.PaymentMethod.USDC_SOL] = 6,
  _a[types_1.PaymentMethod.ETH] = 18,
  _a[types_1.PaymentMethod.SOL] = 9,
  _a[types_1.PaymentMethod.BTC] = 8,
  _a[types_1.PaymentMethod.MATIC] = 18,
  _a[types_1.PaymentMethod.ARB] = 18,
  _a[types_1.PaymentMethod.OP] = 18,
  _a[types_1.PaymentMethod.BASE] = 18,
  _a[types_1.PaymentMethod.OTHER] = 18,
  _a);
  const decimals = method ? methodDecimals[method] : 6;
  const divisor = BigInt(Math.pow(10, decimals));
  const whole = amount / divisor;
  const fraction = amount % divisor;
  const currency = method ? method.replace('_ETH', '').replace('_SOL', '') : 'USDC';
  if (fraction === BigInt(0)) {
    return ''.concat(whole, ' ').concat(currency);
  }
  const fractionStr = fraction.toString().padStart(decimals, '0').replace(/0+$/, '');
  return ''.concat(whole, '.').concat(fractionStr, ' ').concat(currency);
}
/**
 * Decorator for actions that require payment
 */
function requiresPayment(options) {
  return function (target, propertyKey, descriptor) {
    const originalMethod = descriptor.value;
    descriptor.value = function (runtime, message, state) {
      const args = [];
      for (let _i = 3; _i < arguments.length; _i++) {
        args[_i - 3] = arguments[_i];
      }
      return __awaiter(this, void 0, void 0, function () {
        let middleware;
        const _this = this;
        return __generator(this, (_a) => {
          middleware = createPaymentMiddleware(options);
          return [2 /*return*/, new Promise((resolve, reject) => {
            middleware(runtime, message, state, (response) => { return __awaiter(_this, void 0, void 0, function () {
              let _a;
              return __generator(this, (_b) => {
                // If payment failed, return the error response
                if (response.error) {
                  resolve(response);
                  return [2 /*return*/, []];
                }
                // If payment requires action, return the pending response
                if ((_a = response.metadata) === null || _a === void 0 ? void 0 : _a.requiresAction) {
                  resolve(response);
                  return [2 /*return*/, []];
                }
                return [2 /*return*/, []];
              });
            }); }, () => { return __awaiter(_this, void 0, void 0, function () {
              let result, error_4;
              return __generator(this, function (_a) {
                switch (_a.label) {
                  case 0:
                    _a.trys.push([0, 2, , 3]);
                    return [4 /*yield*/, originalMethod.apply(this, __spreadArray([runtime, message, state], args, true))];
                  case 1:
                    result = _a.sent();
                    resolve(result);
                    return [3 /*break*/, 3];
                  case 2:
                    error_4 = _a.sent();
                    reject(error_4);
                    return [3 /*break*/, 3];
                  case 3: return [2];
                }
              });
            }); });
          })];
        });
      });
    };
    return descriptor;
  };
}
