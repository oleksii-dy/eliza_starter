'use strict';
const __createBinding = (this && this.__createBinding) || (Object.create ? (function (o, m, k, k2) {
  if (k2 === undefined) {k2 = k;}
  let desc = Object.getOwnPropertyDescriptor(m, k);
  if (!desc || ('get' in desc ? !m.__esModule : desc.writable || desc.configurable)) {
    desc = { enumerable: true, get() { return m[k]; } };
  }
  Object.defineProperty(o, k2, desc);
}) : (function (o, m, k, k2) {
  if (k2 === undefined) {k2 = k;}
  o[k2] = m[k];
}));
const __exportStar = (this && this.__exportStar) || function (m, exports) {
  for (const p in m) {if (p !== 'default' && !Object.prototype.hasOwnProperty.call(exports, p)) {__createBinding(exports, m, p);}}
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
exports.paymentPlugin = exports.sendPaymentAction = exports.researchAction = exports.requiresPayment = exports.createPaymentMiddleware = exports.CrossmintAdapter = exports.AgentKitWalletAdapter = exports.SolanaWalletAdapter = exports.EVMWalletAdapter = exports.paymentWebhooks = exports.priceCache = exports.dailySpending = exports.paymentSettingsTable = exports.userWallets = exports.paymentRequests = exports.paymentTransactions = exports.UniversalPaymentService = exports.PriceOracleService = exports.PaymentService = void 0;
const core_1 = require('@elizaos/core');
const PaymentService_1 = require('./services/PaymentService');
const PriceOracleService_1 = require('./services/PriceOracleService');
const UniversalPaymentService_1 = require('./services/UniversalPaymentService');
const researchAction_1 = require('./actions/researchAction');
const sendPaymentAction_1 = require('./actions/sendPaymentAction');
// Import scenarios
const scenarios_1 = require('./scenarios');
// Import table schemas for registration
const tables_1 = require('./database/tables');
// Export types
__exportStar(require('./types'), exports);
__exportStar(require('./interfaces/IPaymentService'), exports);
// Export services
const PaymentService_2 = require('./services/PaymentService');
Object.defineProperty(exports, 'PaymentService', { enumerable: true, get() { return PaymentService_2.PaymentService; } });
const PriceOracleService_2 = require('./services/PriceOracleService');
Object.defineProperty(exports, 'PriceOracleService', { enumerable: true, get() { return PriceOracleService_2.PriceOracleService; } });
const UniversalPaymentService_2 = require('./services/UniversalPaymentService');
Object.defineProperty(exports, 'UniversalPaymentService', { enumerable: true, get() { return UniversalPaymentService_2.UniversalPaymentService; } });
// Export database schema (selectively to avoid conflicts)
const schema_1 = require('./database/schema');
Object.defineProperty(exports, 'paymentTransactions', { enumerable: true, get() { return schema_1.paymentTransactions; } });
Object.defineProperty(exports, 'paymentRequests', { enumerable: true, get() { return schema_1.paymentRequests; } });
Object.defineProperty(exports, 'userWallets', { enumerable: true, get() { return schema_1.userWallets; } });
Object.defineProperty(exports, 'paymentSettingsTable', { enumerable: true, get() { return schema_1.paymentSettings; } });
Object.defineProperty(exports, 'dailySpending', { enumerable: true, get() { return schema_1.dailySpending; } });
Object.defineProperty(exports, 'priceCache', { enumerable: true, get() { return schema_1.priceCache; } });
Object.defineProperty(exports, 'paymentWebhooks', { enumerable: true, get() { return schema_1.paymentWebhooks; } });
// Export adapters
const EVMWalletAdapter_1 = require('./adapters/EVMWalletAdapter');
Object.defineProperty(exports, 'EVMWalletAdapter', { enumerable: true, get() { return EVMWalletAdapter_1.EVMWalletAdapter; } });
const SolanaWalletAdapter_1 = require('./adapters/SolanaWalletAdapter');
Object.defineProperty(exports, 'SolanaWalletAdapter', { enumerable: true, get() { return SolanaWalletAdapter_1.SolanaWalletAdapter; } });
const AgentKitWalletAdapter_1 = require('./adapters/AgentKitWalletAdapter');
Object.defineProperty(exports, 'AgentKitWalletAdapter', { enumerable: true, get() { return AgentKitWalletAdapter_1.AgentKitWalletAdapter; } });
const CrossmintAdapter_1 = require('./adapters/CrossmintAdapter');
Object.defineProperty(exports, 'CrossmintAdapter', { enumerable: true, get() { return CrossmintAdapter_1.CrossmintAdapter; } });
// Export middleware
const paymentMiddleware_1 = require('./middleware/paymentMiddleware');
Object.defineProperty(exports, 'createPaymentMiddleware', { enumerable: true, get() { return paymentMiddleware_1.createPaymentMiddleware; } });
Object.defineProperty(exports, 'requiresPayment', { enumerable: true, get() { return paymentMiddleware_1.requiresPayment; } });
// Export actions
const researchAction_2 = require('./actions/researchAction');
Object.defineProperty(exports, 'researchAction', { enumerable: true, get() { return researchAction_2.researchAction; } });
const sendPaymentAction_2 = require('./actions/sendPaymentAction');
Object.defineProperty(exports, 'sendPaymentAction', { enumerable: true, get() { return sendPaymentAction_2.sendPaymentAction; } });
/**
 * Payment plugin for ElizaOS
 * Provides payment processing capabilities with multiple wallet integrations
 */
exports.paymentPlugin = {
  name: 'payment',
  description: 'Payment processing plugin with multi-chain wallet support and price oracle',
  services: [PaymentService_1.PaymentService, PriceOracleService_1.PriceOracleService, UniversalPaymentService_1.UniversalPaymentService],
  actions: [
    // Payment-related actions disabled by default for security
    researchAction_1.researchAction,
    sendPaymentAction_1.sendPaymentAction,
  ],
  evaluators: [],
  providers: [],
  scenarios: scenarios_1.default,
  init(config, runtime) {
    return __awaiter(this, void 0, void 0, function () {
      let schemaRegistry, error_1;
      return __generator(this, (_a) => {
        switch (_a.label) {
          case 0:
            core_1.logger.info('[Payment Plugin] Initializing...');
            _a.label = 1;
          case 1:
            _a.trys.push([1, 3, , 4]);
            return [4 /*yield*/, Promise.resolve().then(() => { return require('@elizaos/plugin-sql'); })];
          case 2:
            schemaRegistry = (_a.sent()).schemaRegistry;
            schemaRegistry.registerTables(tables_1.PAYMENT_TABLES);
            core_1.logger.info('[Payment Plugin] Registered payment database tables');
            return [3 /*break*/, 4];
          case 3:
            error_1 = _a.sent();
            core_1.logger.error('[Payment Plugin] Failed to register payment tables:', error_1);
            throw error_1;
          case 4:
            // Register actions
            runtime.registerAction(researchAction_1.researchAction);
            runtime.registerAction(sendPaymentAction_1.sendPaymentAction);
            core_1.logger.info('[Payment Plugin] Initialization complete');
            return [2];
        }
      });
    });
  },
};
exports.default = exports.paymentPlugin;
