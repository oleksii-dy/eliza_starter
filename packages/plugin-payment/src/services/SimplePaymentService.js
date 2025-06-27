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
exports.SimplePaymentService = void 0;
const core_1 = require('@elizaos/core');
const ethers_1 = require('ethers');
const drizzle_orm_1 = require('drizzle-orm');
const node_buffer_1 = require('node:buffer');
const schema_1 = require('../database/schema');
const types_1 = require('../types');
/**
 * Simplified Payment Service
 * - Direct database integration
 * - Real wallet management
 * - No circular dependencies
 * - Clear error handling
 */
const SimplePaymentService = /** @class */ (function (_super) {
  __extends(SimplePaymentService, _super);
  function SimplePaymentService() {
    const _this = _super !== null && _super.apply(this, arguments) || this;
    _this.serviceName = SimplePaymentService.serviceName;
    _this.serviceType = SimplePaymentService.serviceType;
    _this.capabilityDescription = 'Simple payment service with direct database integration';
    _this.providers = new Map();
    return _this;
  }
  SimplePaymentService.prototype.initialize = function (runtime) {
    return __awaiter(this, void 0, void 0, function () {
      let dbService;
      let _a;
      return __generator(this, function (_b) {
        this.runtime = runtime;
        dbService = runtime.getService('database');
        this.db = (_a = dbService === null || dbService === void 0 ? void 0 : dbService.getDatabase) === null || _a === void 0 ? void 0 : _a.call(dbService);
        if (!this.db) {
          throw new Error('Database service is required');
        }
        // Get or generate encryption key
        this.encryptionKey =
                    runtime.getSetting('WALLET_ENCRYPTION_KEY') || this.generateEncryptionKey();
        // Initialize providers
        this.initializeProviders();
        core_1.elizaLogger.info('[SimplePaymentService] Initialized');
        return [2];
      });
    });
  };
  SimplePaymentService.prototype.initializeProviders = function () {
    const _this = this;
    // Initialize with real RPC endpoints
    const providers = {
      ethereum: new ethers_1.ethers.JsonRpcProvider(this.runtime.getSetting('ETH_RPC_URL') || 'https://eth.llamarpc.com'),
      polygon: new ethers_1.ethers.JsonRpcProvider(this.runtime.getSetting('POLYGON_RPC_URL') || 'https://polygon-rpc.com'),
      base: new ethers_1.ethers.JsonRpcProvider(this.runtime.getSetting('BASE_RPC_URL') || 'https://mainnet.base.org'),
    };
    Object.entries(providers).forEach((_a) => {
      const network = _a[0], provider = _a[1];
      _this.providers.set(network, provider);
    });
  };
  SimplePaymentService.prototype.processPayment = function (request) {
    return __awaiter(this, void 0, void 0, function () {
      let validation, wallet, balance, txRecord, provider, signer, tx, tokenAddress, tokenContract, receipt, finalStatus, error_1;
      return __generator(this, function (_a) {
        switch (_a.label) {
          case 0:
            _a.trys.push([0, 13, , 15]);
            core_1.elizaLogger.info('[SimplePaymentService] Processing payment', {
              amount: request.amount.toString(),
              method: request.method,
            });
            return [4 /*yield*/, this.validateRequest(request)];
          case 1:
            validation = _a.sent();
            if (!validation.isValid) {
              throw new Error(validation.error);
            }
            return [4 /*yield*/, this.getOrCreateWallet(request.userId, request.method)];
          case 2:
            wallet = _a.sent();
            return [4 /*yield*/, this.getBalance(wallet.address, request.method)];
          case 3:
            balance = _a.sent();
            if (balance < request.amount) {
              throw new Error('Insufficient balance. Have: '.concat(balance, ', Need: ').concat(request.amount));
            }
            txRecord = {
              payerId: request.userId,
              agentId: this.runtime.agentId,
              amount: request.amount,
              currency: this.getCurrency(request.method),
              method: request.method,
              status: types_1.PaymentStatus.PROCESSING,
              fromAddress: wallet.address,
              toAddress: request.recipientAddress || '',
              metadata: request.metadata || {},
            };
            return [4 /*yield*/, this.db.insert(schema_1.paymentTransactions).values(txRecord)];
          case 4:
            _a.sent();
            provider = this.getProvider(request.method);
            signer = new ethers_1.ethers.Wallet(wallet.privateKey, provider);
            tx = void 0;
            if (!this.isNativeToken(request.method)) {return [3 /*break*/, 6];}
            return [4 /*yield*/, signer.sendTransaction({
              to: request.recipientAddress,
              value: request.amount.toString(),
            })];
          case 5:
            // Send native token
            tx = _a.sent();
            return [3 /*break*/, 8];
          case 6:
            tokenAddress = this.getTokenAddress(request.method);
            tokenContract = new ethers_1.ethers.Contract(tokenAddress, ['function transfer(address to, uint256 amount) returns (bool)'], signer);
            return [4 /*yield*/, tokenContract.transfer(request.recipientAddress, request.amount.toString())];
          case 7:
            tx = _a.sent();
            _a.label = 8;
          case 8: return [4 /*yield*/, tx.wait(1)];
          case 9:
            receipt = _a.sent();
            finalStatus = (receipt === null || receipt === void 0 ? void 0 : receipt.status) === 1 ? types_1.PaymentStatus.COMPLETED : types_1.PaymentStatus.FAILED;
            return [4 /*yield*/, this.db
              .update(schema_1.paymentTransactions)
              .set({
                status: finalStatus,
                transactionHash: tx.hash,
                confirmations: 1,
                completedAt: new Date(),
              })
              .where((0, drizzle_orm_1.eq)(schema_1.paymentTransactions.id, request.id))];
          case 10:
            _a.sent();
            if (!(finalStatus === types_1.PaymentStatus.COMPLETED)) {return [3 /*break*/, 12];}
            return [4 /*yield*/, this.updateDailySpending(request.userId, request.amount, request.method)];
          case 11:
            _a.sent();
            _a.label = 12;
          case 12: return [2 /*return*/, {
            id: request.id,
            requestId: request.id,
            status: finalStatus,
            transactionHash: tx.hash,
            amount: request.amount,
            method: request.method,
            fromAddress: wallet.address,
            toAddress: request.recipientAddress || '',
            timestamp: Date.now(),
          }];
          case 13:
            error_1 = _a.sent();
            core_1.elizaLogger.error('[SimplePaymentService] Payment failed', error_1);
            // Update transaction as failed
            return [4 /*yield*/, this.db
              .update(schema_1.paymentTransactions)
              .set({
                status: types_1.PaymentStatus.FAILED,
                error: error_1 instanceof Error ? error_1.message : 'Unknown error',
              })
              .where((0, drizzle_orm_1.eq)(schema_1.paymentTransactions.id, request.id))];
          case 14:
            // Update transaction as failed
            _a.sent();
            throw error_1;
          case 15: return [2];
        }
      });
    });
  };
  SimplePaymentService.prototype.validateRequest = function (request) {
    return __awaiter(this, void 0, void 0, function () {
      let dailySpent, maxDaily, amountUsd;
      return __generator(this, function (_a) {
        switch (_a.label) {
          case 0:
            if (!request.amount || request.amount <= BigInt(0)) {
              return [2 /*return*/, { isValid: false, error: 'Invalid amount' }];
            }
            if (!request.recipientAddress || !ethers_1.ethers.isAddress(request.recipientAddress)) {
              return [2 /*return*/, { isValid: false, error: 'Invalid recipient address' }];
            }
            if (!this.supportedMethods.includes(request.method)) {
              return [2 /*return*/, { isValid: false, error: 'Unsupported payment method' }];
            }
            return [4 /*yield*/, this.getDailySpending(request.userId)];
          case 1:
            dailySpent = _a.sent();
            maxDaily = parseFloat(this.runtime.getSetting('PAYMENT_MAX_DAILY_SPEND') || '1000');
            return [4 /*yield*/, this.convertToUSD(request.amount, request.method)];
          case 2:
            amountUsd = _a.sent();
            if (dailySpent + amountUsd > maxDaily) {
              return [2 /*return*/, {
                isValid: false,
                error: 'Daily spending limit exceeded. Limit: $'.concat(maxDaily, ', Current: $').concat(dailySpent.toFixed(2)),
              }];
            }
            return [2 /*return*/, { isValid: true }];
        }
      });
    });
  };
  SimplePaymentService.prototype.getOrCreateWallet = function (userId, method) {
    return __awaiter(this, void 0, void 0, function () {
      let network, existing, privateKey, wallet, encryptedKey, newWallet;
      return __generator(this, function (_a) {
        switch (_a.label) {
          case 0:
            network = this.getNetwork(method);
            return [4 /*yield*/, this.db
              .select()
              .from(schema_1.userWallets)
              .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.userWallets.userId, userId), (0, drizzle_orm_1.eq)(schema_1.userWallets.network, network), (0, drizzle_orm_1.eq)(schema_1.userWallets.isActive, true)))
              .limit(1)];
          case 1:
            existing = (_a.sent())[0];
            if (!(existing && existing.encryptedPrivateKey)) {return [3 /*break*/, 3];}
            return [4 /*yield*/, this.decryptPrivateKey(existing.encryptedPrivateKey)];
          case 2:
            privateKey = _a.sent();
            return [2 /*return*/, {
              address: existing.address,
              privateKey,
            }];
          case 3:
            wallet = ethers_1.ethers.Wallet.createRandom();
            return [4 /*yield*/, this.encryptPrivateKey(wallet.privateKey)];
          case 4:
            encryptedKey = _a.sent();
            newWallet = {
              userId,
              address: wallet.address,
              network,
              encryptedPrivateKey: encryptedKey,
              isActive: true,
              isPrimary: true,
              metadata: {
                createdAt: new Date().toISOString(),
                purpose: 'payments',
              },
            };
            return [4 /*yield*/, this.db.insert(schema_1.userWallets).values(newWallet)];
          case 5:
            _a.sent();
            core_1.elizaLogger.info('[SimplePaymentService] Created new wallet', {
              userId,
              address: wallet.address,
              network,
            });
            return [2 /*return*/, {
              address: wallet.address,
              privateKey: wallet.privateKey,
            }];
        }
      });
    });
  };
  SimplePaymentService.prototype.getBalance = function (address, method) {
    return __awaiter(this, void 0, void 0, function () {
      var provider, balance, tokenAddress, tokenContract, balance;
      return __generator(this, function (_a) {
        switch (_a.label) {
          case 0:
            provider = this.getProvider(method);
            if (!this.isNativeToken(method)) {return [3 /*break*/, 2];}
            return [4 /*yield*/, provider.getBalance(address)];
          case 1:
            balance = _a.sent();
            return [2 /*return*/, BigInt(balance.toString())];
          case 2:
            tokenAddress = this.getTokenAddress(method);
            tokenContract = new ethers_1.ethers.Contract(tokenAddress, ['function balanceOf(address) view returns (uint256)'], provider);
            return [4 /*yield*/, tokenContract.balanceOf(address)];
          case 3:
            balance = _a.sent();
            return [2 /*return*/, BigInt(balance.toString())];
        }
      });
    });
  };
  SimplePaymentService.prototype.updateDailySpending = function (userId, amount, method) {
    return __awaiter(this, void 0, void 0, function () {
      let today, amountUsd, existing, newSpending;
      let _a;
      return __generator(this, function (_b) {
        switch (_b.label) {
          case 0:
            today = new Date().toISOString().split('T')[0];
            return [4 /*yield*/, this.convertToUSD(amount, method)];
          case 1:
            amountUsd = _b.sent();
            return [4 /*yield*/, this.db
              .select()
              .from(schema_1.dailySpending)
              .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.dailySpending.userId, userId), (0, drizzle_orm_1.eq)(schema_1.dailySpending.date, today)))
              .limit(1)];
          case 2:
            existing = (_b.sent())[0];
            if (!existing) {return [3 /*break*/, 4];}
            return [4 /*yield*/, this.db
              .update(schema_1.dailySpending)
              .set({
                totalSpentUsd: (parseFloat(existing.totalSpentUsd || '0') + amountUsd).toFixed(2),
                transactionCount: (existing.transactionCount || 0) + 1,
                updatedAt: new Date(),
              })
              .where((0, drizzle_orm_1.eq)(schema_1.dailySpending.id, existing.id))];
          case 3:
            _b.sent();
            return [3 /*break*/, 6];
          case 4:
            newSpending = {
              userId,
              date: today,
              totalSpentUsd: amountUsd.toFixed(2),
              transactionCount: 1,
              breakdown: (_a = {}, _a[method] = amountUsd, _a),
            };
            return [4 /*yield*/, this.db.insert(schema_1.dailySpending).values(newSpending)];
          case 5:
            _b.sent();
            _b.label = 6;
          case 6: return [2];
        }
      });
    });
  };
  SimplePaymentService.prototype.getDailySpending = function (userId) {
    return __awaiter(this, void 0, void 0, function () {
      let today, record;
      return __generator(this, function (_a) {
        switch (_a.label) {
          case 0:
            today = new Date().toISOString().split('T')[0];
            return [4 /*yield*/, this.db
              .select()
              .from(schema_1.dailySpending)
              .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.dailySpending.userId, userId), (0, drizzle_orm_1.eq)(schema_1.dailySpending.date, today)))
              .limit(1)];
          case 1:
            record = (_a.sent())[0];
            return [2 /*return*/, record ? parseFloat(record.totalSpentUsd || '0') : 0];
        }
      });
    });
  };
  SimplePaymentService.prototype.convertToUSD = function (amount, method) {
    return __awaiter(this, void 0, void 0, function () {
      let price, decimals, divisor, whole, fraction;
      return __generator(this, function (_a) {
        switch (_a.label) {
          case 0: return [4 /*yield*/, this.getTokenPrice(method)];
          case 1:
            price = _a.sent();
            decimals = this.getDecimals(method);
            divisor = BigInt(Math.pow(10, decimals));
            whole = Number(amount / divisor);
            fraction = Number(amount % divisor) / Number(divisor);
            return [2 /*return*/, (whole + fraction) * price];
        }
      });
    });
  };
  SimplePaymentService.prototype.getTokenPrice = function (method) {
    return __awaiter(this, void 0, void 0, function () {
      let prices;
      let _a;
      return __generator(this, (_b) => {
        prices = (_a = {},
        _a[types_1.PaymentMethod.USDC_ETH] = 1,
        _a[types_1.PaymentMethod.USDC_SOL] = 1,
        _a[types_1.PaymentMethod.ETH] = 2500,
        _a[types_1.PaymentMethod.SOL] = 100,
        _a[types_1.PaymentMethod.BTC] = 45000,
        _a[types_1.PaymentMethod.MATIC] = 0.8,
        _a[types_1.PaymentMethod.ARB] = 2500,
        _a[types_1.PaymentMethod.OP] = 2500,
        _a[types_1.PaymentMethod.BASE] = 2500,
        _a[types_1.PaymentMethod.OTHER] = 1,
        _a);
        return [2 /*return*/, prices[method] || 1];
      });
    });
  };
  Object.defineProperty(SimplePaymentService.prototype, 'supportedMethods', {
    // Helper methods
    get() {
      return [types_1.PaymentMethod.ETH, types_1.PaymentMethod.USDC_ETH, types_1.PaymentMethod.MATIC, types_1.PaymentMethod.BASE];
    },
    enumerable: false,
    configurable: true
  });
  SimplePaymentService.prototype.getProvider = function (method) {
    const network = this.getNetwork(method);
    const provider = this.providers.get(network);
    if (!provider) {
      throw new Error('No provider for '.concat(network));
    }
    return provider;
  };
  SimplePaymentService.prototype.getNetwork = function (method) {
    let _a;
    const networkMap = (_a = {},
    _a[types_1.PaymentMethod.ETH] = 'ethereum',
    _a[types_1.PaymentMethod.USDC_ETH] = 'ethereum',
    _a[types_1.PaymentMethod.MATIC] = 'polygon',
    _a[types_1.PaymentMethod.BASE] = 'base',
    _a[types_1.PaymentMethod.ARB] = 'arbitrum',
    _a[types_1.PaymentMethod.OP] = 'optimism',
    _a[types_1.PaymentMethod.SOL] = 'solana',
    _a[types_1.PaymentMethod.USDC_SOL] = 'solana',
    _a[types_1.PaymentMethod.BTC] = 'bitcoin',
    _a[types_1.PaymentMethod.OTHER] = 'ethereum',
    _a);
    return networkMap[method] || 'ethereum';
  };
  SimplePaymentService.prototype.isNativeToken = function (method) {
    return [
      types_1.PaymentMethod.ETH,
      types_1.PaymentMethod.MATIC,
      types_1.PaymentMethod.ARB,
      types_1.PaymentMethod.OP,
      types_1.PaymentMethod.BASE,
    ].includes(method);
  };
  SimplePaymentService.prototype.getTokenAddress = function (method) {
    let _a;
    const addresses = (_a = {},
    _a[types_1.PaymentMethod.USDC_ETH] = '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48', // USDC on Ethereum
    _a[types_1.PaymentMethod.USDC_SOL] = '',
    _a[types_1.PaymentMethod.ETH] = '',
    _a[types_1.PaymentMethod.SOL] = '',
    _a[types_1.PaymentMethod.BTC] = '',
    _a[types_1.PaymentMethod.MATIC] = '',
    _a[types_1.PaymentMethod.ARB] = '',
    _a[types_1.PaymentMethod.OP] = '',
    _a[types_1.PaymentMethod.BASE] = '',
    _a[types_1.PaymentMethod.OTHER] = '',
    _a);
    return addresses[method] || '';
  };
  SimplePaymentService.prototype.getCurrency = function (method) {
    return method.replace('_ETH', '').replace('_SOL', '');
  };
  SimplePaymentService.prototype.getDecimals = function (method) {
    if (method.includes('USDC')) {
      return 6;
    }
    if (method === types_1.PaymentMethod.SOL) {
      return 9;
    }
    if (method === types_1.PaymentMethod.BTC) {
      return 8;
    }
    return 18;
  };
  // Encryption helpers
  SimplePaymentService.prototype.encryptPrivateKey = function (privateKey) {
    return __awaiter(this, void 0, void 0, function () {
      return __generator(this, (_a) => {
        // In production, use proper encryption
        // For now, simple base64 encoding
        return [2 /*return*/, node_buffer_1.Buffer.from(privateKey).toString('base64')];
      });
    });
  };
  SimplePaymentService.prototype.decryptPrivateKey = function (encrypted) {
    return __awaiter(this, void 0, void 0, function () {
      return __generator(this, (_a) => {
        // In production, use proper decryption
        return [2 /*return*/, node_buffer_1.Buffer.from(encrypted, 'base64').toString('utf8')];
      });
    });
  };
  SimplePaymentService.prototype.generateEncryptionKey = function () {
    return ethers_1.ethers.hexlify(ethers_1.ethers.randomBytes(32));
  };
  SimplePaymentService.prototype.stop = function () {
    return __awaiter(this, void 0, void 0, function () {
      return __generator(this, (_a) => {
        core_1.elizaLogger.info('[SimplePaymentService] Stopping');
        return [2];
      });
    });
  };
  SimplePaymentService.start = function (runtime) {
    return __awaiter(this, void 0, void 0, function () {
      let service;
      return __generator(this, (_a) => {
        switch (_a.label) {
          case 0:
            service = new SimplePaymentService();
            return [4 /*yield*/, service.initialize(runtime)];
          case 1:
            _a.sent();
            return [2 /*return*/, service];
        }
      });
    });
  };
  SimplePaymentService.serviceName = 'simple-payment';
  SimplePaymentService.serviceType = core_1.ServiceType.UNKNOWN;
  return SimplePaymentService;
}(core_1.Service));
exports.SimplePaymentService = SimplePaymentService;
