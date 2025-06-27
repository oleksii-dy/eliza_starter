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
exports.createMockRuntime = createMockRuntime;
exports.createTestRuntime = createTestRuntime;
exports.cleanupTestRuntime = cleanupTestRuntime;
exports.createTestMemory = createTestMemory;
exports.createTestUserId = createTestUserId;
const core_1 = require('@elizaos/core');
const test_utils_1 = require('@elizaos/core/test-utils');
function createMockRuntime(overrides) {
  const _this = this;
  if (overrides === void 0) { overrides = {}; }
  // Create stateful mock services
  const mockSettings = {
    autoApprovalEnabled: true,
    autoApprovalThreshold: 10,
    defaultCurrency: 'USDC',
    maxDailySpend: 1000,
    requireConfirmation: false,
  };
  const runtimeSettings = {
    PAYMENT_AUTO_APPROVAL_ENABLED: 'true',
    PAYMENT_AUTO_APPROVAL_THRESHOLD: '10',
    PAYMENT_DEFAULT_CURRENCY: 'USDC',
    PAYMENT_REQUIRE_CONFIRMATION: 'false',
    PAYMENT_TRUST_THRESHOLD: '70',
    PAYMENT_MAX_DAILY_SPEND: '1000',
    WALLET_ENCRYPTION_KEY: '0x'.concat('0'.repeat(64)),
    ETH_RPC_URL: 'https://eth-sepolia.g.alchemy.com/v2/demo',
    POLYGON_RPC_URL: 'https://polygon-mumbai.g.alchemy.com/v2/demo',
    NODE_ENV: 'test',
  };
  return (0, test_utils_1.createMockRuntime)(__assign({ character: {
    name: 'PaymentTestAgent',
    bio: ['AI agent specialized in payment processing and financial operations'],
    system: 'You are a test agent for payment functionality',
    topics: ['payments', 'crypto', 'finance', 'transactions'],
    plugins: ['@elizaos/plugin-payment'],
  }, getSetting(key) {
    return runtimeSettings[key];
  }, setSetting(key, value) {
    runtimeSettings[key] = value;
  }, registerAction() { }, getService(name) {
    const services = {
      payment: {
        processPayment(request) { return __awaiter(_this, void 0, void 0, function () {
          let amount, requiresConfirmation, trustScore, paymentMethod, supportedMethods, isLargeAmount, isTrustedUser;
          let _a;
          return __generator(this, (_b) => {
            amount = BigInt(request.amount);
            requiresConfirmation = request.requiresConfirmation;
            trustScore = ((_a = request.metadata) === null || _a === void 0 ? void 0 : _a.trustScore) || 50;
            paymentMethod = request.method;
            supportedMethods = ['USDC_ETH', 'ETH', 'SOL', 'USDC_SOL'];
            if (!supportedMethods.includes(paymentMethod)) {
              return [2 /*return*/, {
                id: request.id,
                status: 'FAILED',
                error: 'Payment method '.concat(paymentMethod, ' not supported'),
                metadata: {},
              }];
            }
            isLargeAmount = amount > BigInt(50000000);
            isTrustedUser = trustScore >= 70;
            if (requiresConfirmation || (isLargeAmount && !isTrustedUser)) {
              return [2 /*return*/, {
                id: request.id,
                status: 'PENDING',
                metadata: { pendingReason: 'USER_CONFIRMATION_REQUIRED' },
              }];
            }
            else if (isTrustedUser && amount <= BigInt(200000000)) { // 200 USDC
              return [2 /*return*/, {
                id: request.id,
                status: 'FAILED',
                error: 'Insufficient funds or mock payment service',
                metadata: {},
              }];
            }
            else {
              return [2 /*return*/, {
                id: request.id,
                status: 'FAILED',
                error: 'Insufficient funds or mock payment service',
                metadata: {},
              }];
            }
            return [2];
          });
        }); },
        getUserBalance() { return __awaiter(_this, void 0, void 0, function () { return __generator(this, (_a) => {
          return [2 /*return*/, new Map([['USDC', '1000000000']])];
        }); }); },
        getCapabilities() { return __awaiter(_this, void 0, void 0, function () {
          return __generator(this, (_a) => {
            return [2 /*return*/, ({
              supportedMethods: ['USDC_ETH', 'ETH', 'SOL', 'USDC_SOL'],
              features: { autoApproval: true },
              limits: { minAmount: 0.01, maxAmount: 1000, dailyLimit: 1000 },
            })];
          });
        }); },
        getSettings() { return mockSettings; },
        updateSettings(settings) { return __awaiter(_this, void 0, void 0, function () {
          return __generator(this, (_a) => {
            // Update mock settings state
            Object.assign(mockSettings, settings);
            // Also update runtime settings
            if (settings.autoApprovalThreshold !== undefined) {
              runtimeSettings.PAYMENT_AUTO_APPROVAL_THRESHOLD = settings.autoApprovalThreshold.toString();
            }
            if (settings.maxDailySpend !== undefined) {
              runtimeSettings.PAYMENT_MAX_DAILY_SPEND = settings.maxDailySpend.toString();
            }
            if (settings.requireConfirmation !== undefined) {
              runtimeSettings.PAYMENT_REQUIRE_CONFIRMATION = settings.requireConfirmation.toString();
            }
            return [2];
          });
        }); },
      },
      database: {
        getDatabase() { return ({
          select() { return ({
            from() { return ({
              where() { return ({
                limit() { return Promise.resolve([]); },
                orderBy() { return ({
                  limit() { return ({
                    offset() { return Promise.resolve([]); },
                  }); },
                }); },
              }); },
              orderBy() { return ({
                limit() { return ({
                  offset() { return Promise.resolve([]); },
                }); },
              }); },
              limit() { return Promise.resolve([]); },
            }); },
          }); },
          insert() { return ({
            values() { return ({
              then(resolve) { return resolve({ insertedId: 'test-id' }); },
              onConflictDoUpdate() { return ({
                set() { return Promise.resolve({ insertedId: 'test-id' }); },
              }); },
            }); },
          }); },
          update() { return ({
            set() { return ({
              where() { return Promise.resolve({ rowsAffected: 1 }); },
            }); },
          }); },
          delete() { return ({
            where() { return Promise.resolve({ rowsAffected: 1 }); },
          }); },
        }); },
      },
      'crossmint-service': {
        listWallets() { return __awaiter(_this, void 0, void 0, function () {
          return __generator(this, (_a) => {
            return [2 /*return*/, [
              {
                address: '0x742d35Cc6634C0532925a3b844Bc9e7595f2bD3e',
                type: 'evm-mpc-wallet',
                linkedUser: 'test-user',
                createdAt: new Date().toISOString(),
              },
            ]];
          });
        }); },
        createWallet() { return __awaiter(_this, void 0, void 0, function () {
          return __generator(this, (_a) => {
            return [2 /*return*/, ({
              address: '0x'.concat(Math.random().toString(16).substring(2, 42)),
              type: 'evm-mpc-wallet',
              linkedUser: 'test-user',
              createdAt: new Date().toISOString(),
            })];
          });
        }); },
        createTransfer() { return __awaiter(_this, void 0, void 0, function () {
          return __generator(this, (_a) => {
            return [2 /*return*/, ({
              id: 'tx_'.concat(Date.now()),
              hash: '0x'.concat(Math.random().toString(16).substring(2, 66)),
              status: 'pending',
              chain: 'ethereum',
            })];
          });
        }); },
      },
      'crossmint-wallet': {
        getBalances() { return __awaiter(_this, void 0, void 0, function () {
          return __generator(this, (_a) => {
            return [2 /*return*/, [
              {
                address: 'native',
                symbol: 'ETH',
                balance: '1.5',
                valueUsd: 3750,
                priceUsd: 2500,
                chain: 'ethereum',
              },
            ]];
          });
        }); },
        transfer() { return __awaiter(_this, void 0, void 0, function () {
          return __generator(this, (_a) => {
            return [2 /*return*/, ({
              hash: '0x'.concat(Math.random().toString(16).substring(2, 66)),
              status: 'pending',
              chain: 'ethereum',
            })];
          });
        }); },
      },
      priceOracle: {
        convertToUSD() { return __awaiter(_this, void 0, void 0, function () { return __generator(this, (_a) => {
          return [2 /*return*/, 2500];
        }); }); },
        getPrice() { return __awaiter(_this, void 0, void 0, function () { return __generator(this, (_a) => {
          return [2 /*return*/, ({ usd: 2500 })];
        }); }); },
      },
    };
    return services[name];
  } }, overrides));
}
function createTestRuntime() {
  return __awaiter(this, arguments, void 0, function (options) {
    let runtime, _i, _a, plugin, settings;
    if (options === void 0) { options = {}; }
    return __generator(this, (_b) => {
      switch (_b.label) {
        case 0:
          runtime = createMockRuntime({
            character: __assign({ name: 'Test Agent', username: 'testagent', bio: 'A test agent for payment plugin', plugins: [] }, options.character),
            getSetting(key) {
              const defaultSettings = __assign({ PAYMENT_AUTO_APPROVAL_ENABLED: 'true', PAYMENT_AUTO_APPROVAL_THRESHOLD: '10', PAYMENT_DEFAULT_CURRENCY: 'USDC', PAYMENT_REQUIRE_CONFIRMATION: 'false', PAYMENT_TRUST_THRESHOLD: '70', PAYMENT_MAX_DAILY_SPEND: '1000', WALLET_ENCRYPTION_KEY: '0x'.concat('0'.repeat(64)), ETH_RPC_URL: 'https://eth-sepolia.g.alchemy.com/v2/demo', POLYGON_RPC_URL: 'https://polygon-mumbai.g.alchemy.com/v2/demo', NODE_ENV: 'test' }, options.settings);
              return defaultSettings[key];
            },
          });
          if (!options.plugins) {return [3 /*break*/, 4];}
          _i = 0, _a = options.plugins;
          _b.label = 1;
        case 1:
          if (!(_i < _a.length)) {return [3 /*break*/, 4];}
          plugin = _a[_i];
          if (!plugin.init) {return [3 /*break*/, 3];}
          settings = __assign({ PAYMENT_AUTO_APPROVAL_ENABLED: 'true', PAYMENT_AUTO_APPROVAL_THRESHOLD: '10', PAYMENT_DEFAULT_CURRENCY: 'USDC', PAYMENT_REQUIRE_CONFIRMATION: 'false', PAYMENT_TRUST_THRESHOLD: '70', PAYMENT_MAX_DAILY_SPEND: '1000', WALLET_ENCRYPTION_KEY: '0x'.concat('0'.repeat(64)), ETH_RPC_URL: 'https://eth-sepolia.g.alchemy.com/v2/demo', POLYGON_RPC_URL: 'https://polygon-mumbai.g.alchemy.com/v2/demo', NODE_ENV: 'test' }, options.settings);
          return [4 /*yield*/, plugin.init(settings, runtime)];
        case 2:
          _b.sent();
          _b.label = 3;
        case 3:
          _i++;
          return [3 /*break*/, 1];
        case 4: return [2 /*return*/, runtime];
      }
    });
  });
}
function cleanupTestRuntime(runtime) {
  return __awaiter(this, void 0, void 0, function () {
    let services, _i, services_1, _a, _1, service, error_1;
    return __generator(this, (_b) => {
      switch (_b.label) {
        case 0:
          _b.trys.push([0, 5, , 6]);
          services = runtime.services || new Map();
          _i = 0, services_1 = services;
          _b.label = 1;
        case 1:
          if (!(_i < services_1.length)) {return [3 /*break*/, 4];}
          _a = services_1[_i], _1 = _a[0], service = _a[1];
          if (!(service && typeof service.stop === 'function')) {return [3 /*break*/, 3];}
          return [4 /*yield*/, service.stop()];
        case 2:
          _b.sent();
          _b.label = 3;
        case 3:
          _i++;
          return [3 /*break*/, 1];
        case 4: return [3 /*break*/, 6];
        case 5:
          error_1 = _b.sent();
          console.warn('Error during test cleanup:', error_1);
          return [3 /*break*/, 6];
        case 6: return [2];
      }
    });
  });
}
function createTestMemory(overrides) {
  if (overrides === void 0) { overrides = {}; }
  return (0, test_utils_1.createMockMemory)(__assign({ content: __assign({ text: 'Test payment message' }, overrides.content) }, overrides));
}
function createTestUserId() {
  return (0, core_1.asUUID)((0, core_1.stringToUuid)('user-'.concat(Date.now(), '-').concat(Math.random())));
}
