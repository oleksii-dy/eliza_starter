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
const bun_test_1 = require('bun:test');
const core_1 = require('@elizaos/core');
const CrossmintAdapter_1 = require('../../adapters/CrossmintAdapter');
const types_1 = require('../../types');
// Mock Crossmint services
const MockRealCrossMintService = /** @class */ (function () {
  function MockRealCrossMintService() {
    this.wallets = new Map();
    this.transactions = new Map();
  }
  MockRealCrossMintService.prototype.listWallets = function () {
    return __awaiter(this, void 0, void 0, function () {
      return __generator(this, function (_a) {
        return [2 /*return*/, Array.from(this.wallets.values())];
      });
    });
  };
  MockRealCrossMintService.prototype.createWallet = function (params) {
    return __awaiter(this, void 0, void 0, function () {
      let wallet;
      return __generator(this, function (_a) {
        wallet = {
          address: '0x'.concat(Math.random().toString(16).substring(2).padEnd(40, '0')),
          type: params.type,
          linkedUser: params.linkedUser,
          createdAt: new Date().toISOString(),
        };
        this.wallets.set(wallet.address, wallet);
        return [2 /*return*/, wallet];
      });
    });
  };
  MockRealCrossMintService.prototype.createTransfer = function (params) {
    return __awaiter(this, void 0, void 0, function () {
      let transaction;
      return __generator(this, function (_a) {
        transaction = __assign({ id: 'tx_'.concat(Date.now()), hash: '0x'.concat(Math.random().toString(16).substring(2).padEnd(64, '0')), status: 'pending', chain: 'ethereum', gas: '21000', gasPrice: '20000000000', createdAt: new Date().toISOString() }, params);
        this.transactions.set(transaction.hash, transaction);
        // Simulate async processing
        setTimeout(() => {
          transaction.status = 'success';
        }, 1000);
        return [2 /*return*/, transaction];
      });
    });
  };
  MockRealCrossMintService.prototype.getTransaction = function (hash) {
    return __awaiter(this, void 0, void 0, function () {
      let tx;
      return __generator(this, function (_a) {
        tx = this.transactions.get(hash);
        if (!tx) {
          throw new Error('Transaction not found');
        }
        return [2 /*return*/, tx];
      });
    });
  };
  return MockRealCrossMintService;
}());
const MockCrossMintUniversalWalletService = /** @class */ (function () {
  function MockCrossMintUniversalWalletService(crossmintService) {
    this.balances = new Map();
    this.crossmintService = crossmintService;
  }
  MockCrossMintUniversalWalletService.prototype.getBalances = function (owner) {
    return __awaiter(this, void 0, void 0, function () {
      let defaultBalances;
      return __generator(this, function (_a) {
        defaultBalances = [
          {
            address: 'native',
            symbol: 'ETH',
            name: 'Ethereum',
            decimals: 18,
            balance: '1.5',
            balanceFormatted: '1.500000',
            valueUsd: 3750,
            priceUsd: 2500,
            chain: 'ethereum',
            isNative: true,
          },
          {
            address: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
            symbol: 'USDC',
            name: 'USD Coin',
            decimals: 6,
            balance: '1000',
            balanceFormatted: '1000.000000',
            valueUsd: 1000,
            priceUsd: 1,
            chain: 'ethereum',
            isNative: false,
          },
        ];
        return [2 /*return*/, this.balances.get(owner || 'default') || defaultBalances];
      });
    });
  };
  MockCrossMintUniversalWalletService.prototype.transfer = function (params) {
    return __awaiter(this, void 0, void 0, function () {
      let tx;
      return __generator(this, function (_a) {
        switch (_a.label) {
          case 0:
            // Validate transfer params
            if (!params.to || !params.amount) {
              throw new Error('Invalid transfer parameters');
            }
            return [4 /*yield*/, this.crossmintService.createTransfer({
              walletId: params.from || 'default',
              to: params.to,
              amount: params.amount,
              currency: params.tokenAddress ? 'USDC' : 'ETH',
            })];
          case 1:
            tx = _a.sent();
            return [2 /*return*/, {
              hash: tx.hash,
              status: tx.status === 'success' ? 'confirmed' : 'pending',
              chain: params.chain || 'ethereum',
              gasUsed: tx.gas,
              gasPrice: tx.gasPrice,
              confirmations: tx.status === 'success' ? 1 : 0,
              timestamp: new Date().getTime(),
            }];
        }
      });
    });
  };
  MockCrossMintUniversalWalletService.prototype.getTransaction = function (hash, chain) {
    return __awaiter(this, void 0, void 0, function () {
      let tx;
      return __generator(this, function (_a) {
        switch (_a.label) {
          case 0: return [4 /*yield*/, this.crossmintService.getTransaction(hash)];
          case 1:
            tx = _a.sent();
            return [2 /*return*/, {
              hash: tx.hash,
              status: tx.status === 'success' ? 'confirmed' : 'pending',
              chain: tx.chain || chain || 'ethereum',
              gasUsed: tx.gas,
              gasPrice: tx.gasPrice,
              confirmations: tx.status === 'success' ? 1 : 0,
              timestamp: new Date(tx.createdAt).getTime(),
            }];
        }
      });
    });
  };
  MockCrossMintUniversalWalletService.prototype.createWallet = function (params) {
    return __awaiter(this, void 0, void 0, function () {
      let wallet;
      let _a;
      return __generator(this, function (_b) {
        switch (_b.label) {
          case 0: return [4 /*yield*/, this.crossmintService.createWallet({
            type: params.type === 'mpc' ? 'evm-mpc-wallet' : 'evm-smart-wallet',
            linkedUser: ((_a = params.metadata) === null || _a === void 0 ? void 0 : _a.userId) || 'default-user',
          })];
          case 1:
            wallet = _b.sent();
            return [2 /*return*/, {
              id: 'wallet-'.concat(wallet.address),
              address: wallet.address,
              type: wallet.type.includes('mpc') ? 'mpc' : 'smart',
              name: params.name,
              chain: 'ethereum',
              metadata: { linkedUser: wallet.linkedUser },
              isActive: true,
              createdAt: new Date(wallet.createdAt).getTime(),
            }];
        }
      });
    });
  };
  return MockCrossMintUniversalWalletService;
}());
(0, bun_test_1.describe)('CrossmintAdapter Integration Tests', () => {
  let runtime;
  let adapter;
  let mockCrossmintService;
  let mockWalletService;
  (0, bun_test_1.beforeEach)(() => {
    // Create mock services
    mockCrossmintService = new MockRealCrossMintService();
    mockWalletService = new MockCrossMintUniversalWalletService(mockCrossmintService);
    // Mock runtime
    runtime = {
      agentId: (0, core_1.asUUID)('00000000-0000-0000-0000-000000000123'),
      getSetting: (0, bun_test_1.mock)((key) => {
        const settings = {
          CROSSMINT_API_KEY: 'test-api-key',
          CROSSMINT_PROJECT_ID: 'test-project-id',
          CROSSMINT_ENVIRONMENT: 'sandbox',
        };
        return settings[key];
      }),
      getService: (0, bun_test_1.mock)((name) => {
        if (name === 'real-crossmint') {
          return mockCrossmintService;
        }
        if (name === 'crossmint-universal-wallet') {
          return mockWalletService;
        }
        return null;
      }),
    };
    adapter = new CrossmintAdapter_1.CrossmintAdapter(runtime);
  });
  (0, bun_test_1.afterEach)(() => {
    bun_test_1.mock.restore();
  });
  (0, bun_test_1.describe)('Initialization', () => {
    (0, bun_test_1.it)('should initialize successfully with required services', () => { return __awaiter(void 0, void 0, void 0, function () {
      return __generator(this, (_a) => {
        switch (_a.label) {
          case 0: return [4 /*yield*/, (0, bun_test_1.expect)(adapter.initialize()).resolves.toBeUndefined()];
          case 1:
            _a.sent();
            return [2];
        }
      });
    }); });
    (0, bun_test_1.it)('should throw error if required configuration is missing', () => { return __awaiter(void 0, void 0, void 0, function () {
      return __generator(this, (_a) => {
        switch (_a.label) {
          case 0:
            runtime.getSetting = (0, bun_test_1.mock)(() => { return undefined; });
            return [4 /*yield*/, (0, bun_test_1.expect)(adapter.initialize()).rejects.toThrow(CrossmintAdapter_1.CrossmintAdapterError)];
          case 1:
            _a.sent();
            return [4 /*yield*/, (0, bun_test_1.expect)(adapter.initialize()).rejects.toThrow('Missing required settings')];
          case 2:
            _a.sent();
            return [2];
        }
      });
    }); });
    (0, bun_test_1.it)('should throw error if services are not available', () => { return __awaiter(void 0, void 0, void 0, function () {
      return __generator(this, (_a) => {
        switch (_a.label) {
          case 0:
            runtime.getService = (0, bun_test_1.mock)(() => { return null; });
            return [4 /*yield*/, (0, bun_test_1.expect)(adapter.initialize()).rejects.toThrow(CrossmintAdapter_1.CrossmintAdapterError)];
          case 1:
            _a.sent();
            return [4 /*yield*/, (0, bun_test_1.expect)(adapter.initialize()).rejects.toThrow('No Crossmint services found')];
          case 2:
            _a.sent();
            return [2];
        }
      });
    }); });
    (0, bun_test_1.it)('should validate service interfaces correctly', () => { return __awaiter(void 0, void 0, void 0, function () {
      let incompleteService;
      return __generator(this, (_a) => {
        switch (_a.label) {
          case 0:
            incompleteService = { listWallets() { } };
            runtime.getService = (0, bun_test_1.mock)((name) => {
              if (name === 'real-crossmint') {
                return incompleteService;
              }
              return null;
            });
            return [4 /*yield*/, (0, bun_test_1.expect)(adapter.initialize()).rejects.toThrow('No Crossmint services found')];
          case 1:
            _a.sent();
            return [2];
        }
      });
    }); });
  });
  (0, bun_test_1.describe)('Balance Operations', () => {
    (0, bun_test_1.beforeEach)(() => { return __awaiter(void 0, void 0, void 0, function () {
      return __generator(this, (_a) => {
        switch (_a.label) {
          case 0: return [4 /*yield*/, adapter.initialize()];
          case 1:
            _a.sent();
            return [2];
        }
      });
    }); });
    (0, bun_test_1.it)('should get ETH balance correctly', () => { return __awaiter(void 0, void 0, void 0, function () {
      let address, balance;
      return __generator(this, (_a) => {
        switch (_a.label) {
          case 0:
            address = '0x742d35Cc6634C0532925a3b844Bc9e7595f2bD3e';
            return [4 /*yield*/, adapter.getBalance(address, types_1.PaymentMethod.ETH)];
          case 1:
            balance = _a.sent();
            (0, bun_test_1.expect)(balance).toBe(BigInt('1500000000000000000')); // 1.5 ETH
            return [2];
        }
      });
    }); });
    (0, bun_test_1.it)('should get USDC balance correctly', () => { return __awaiter(void 0, void 0, void 0, function () {
      let address, balance;
      return __generator(this, (_a) => {
        switch (_a.label) {
          case 0:
            address = '0x742d35Cc6634C0532925a3b844Bc9e7595f2bD3e';
            return [4 /*yield*/, adapter.getBalance(address, types_1.PaymentMethod.USDC_ETH)];
          case 1:
            balance = _a.sent();
            (0, bun_test_1.expect)(balance).toBe(BigInt('1000000000')); // 1000 USDC (6 decimals)
            return [2];
        }
      });
    }); });
    (0, bun_test_1.it)('should throw error for invalid address', () => { return __awaiter(void 0, void 0, void 0, function () {
      let invalidAddress;
      return __generator(this, (_a) => {
        switch (_a.label) {
          case 0:
            invalidAddress = 'invalid-address';
            return [4 /*yield*/, (0, bun_test_1.expect)(adapter.getBalance(invalidAddress, types_1.PaymentMethod.ETH)).rejects.toThrow('Invalid address format')];
          case 1:
            _a.sent();
            return [2];
        }
      });
    }); });
    (0, bun_test_1.it)('should return zero balance for unknown token', () => { return __awaiter(void 0, void 0, void 0, function () {
      let address, balance;
      return __generator(this, (_a) => {
        switch (_a.label) {
          case 0:
            address = '0x742d35Cc6634C0532925a3b844Bc9e7595f2bD3e';
            // Mock empty balances
            mockWalletService.getBalances = (0, bun_test_1.mock)().mockResolvedValue([]);
            return [4 /*yield*/, adapter.getBalance(address, types_1.PaymentMethod.ETH)];
          case 1:
            balance = _a.sent();
            (0, bun_test_1.expect)(balance).toBe(BigInt(0));
            return [2];
        }
      });
    }); });
    (0, bun_test_1.it)('should handle decimal balance parsing correctly', () => { return __awaiter(void 0, void 0, void 0, function () {
      let address, balance;
      return __generator(this, (_a) => {
        switch (_a.label) {
          case 0:
            // Mock balance with many decimals
            mockWalletService.getBalances = (0, bun_test_1.mock)().mockResolvedValue([
              {
                address: 'native',
                symbol: 'ETH',
                name: 'Ethereum',
                decimals: 18,
                balance: '0.123456789012345678',
                balanceFormatted: '0.123456789012345678',
                valueUsd: 308.64,
                priceUsd: 2500,
                chain: 'ethereum',
                isNative: true,
              },
            ]);
            address = '0x742d35Cc6634C0532925a3b844Bc9e7595f2bD3e';
            return [4 /*yield*/, adapter.getBalance(address, types_1.PaymentMethod.ETH)];
          case 1:
            balance = _a.sent();
            (0, bun_test_1.expect)(balance).toBe(BigInt('123456789012345678')); // Correct wei amount
            return [2];
        }
      });
    }); });
  });
  (0, bun_test_1.describe)('Transaction Operations', () => {
    (0, bun_test_1.beforeEach)(() => { return __awaiter(void 0, void 0, void 0, function () {
      return __generator(this, (_a) => {
        switch (_a.label) {
          case 0: return [4 /*yield*/, adapter.initialize()];
          case 1:
            _a.sent();
            return [2];
        }
      });
    }); });
    (0, bun_test_1.it)('should send ETH transaction successfully', () => { return __awaiter(void 0, void 0, void 0, function () {
      let fromAddress, toAddress, amount, result;
      return __generator(this, (_a) => {
        switch (_a.label) {
          case 0:
            fromAddress = '0x742d35Cc6634C0532925a3b844Bc9e7595f2bD3e';
            toAddress = '0x8626f6940E2eb28930eFb4CeF49B2d1F2C9C1199';
            amount = BigInt('1000000000000000000');
            return [4 /*yield*/, adapter.sendTransaction(fromAddress, toAddress, amount, types_1.PaymentMethod.ETH)];
          case 1:
            result = _a.sent();
            (0, bun_test_1.expect)(result).toBeDefined();
            (0, bun_test_1.expect)(result.hash).toMatch(/^0x[a-fA-F0-9]{64}$/);
            (0, bun_test_1.expect)(result.status).toBe(types_1.PaymentStatus.PROCESSING);
            (0, bun_test_1.expect)(result.confirmations).toBe(0);
            return [2];
        }
      });
    }); });
    (0, bun_test_1.it)('should send USDC transaction successfully', () => { return __awaiter(void 0, void 0, void 0, function () {
      let fromAddress, toAddress, amount, result;
      return __generator(this, (_a) => {
        switch (_a.label) {
          case 0:
            fromAddress = '0x742d35Cc6634C0532925a3b844Bc9e7595f2bD3e';
            toAddress = '0x8626f6940E2eb28930eFb4CeF49B2d1F2C9C1199';
            amount = BigInt('1000000');
            return [4 /*yield*/, adapter.sendTransaction(fromAddress, toAddress, amount, types_1.PaymentMethod.USDC_ETH)];
          case 1:
            result = _a.sent();
            (0, bun_test_1.expect)(result).toBeDefined();
            (0, bun_test_1.expect)(result.hash).toMatch(/^0x[a-fA-F0-9]{64}$/);
            (0, bun_test_1.expect)(result.status).toBe(types_1.PaymentStatus.PROCESSING);
            return [2];
        }
      });
    }); });
    (0, bun_test_1.it)('should throw error for invalid recipient address', () => { return __awaiter(void 0, void 0, void 0, function () {
      let fromAddress, invalidToAddress, amount;
      return __generator(this, (_a) => {
        switch (_a.label) {
          case 0:
            fromAddress = '0x742d35Cc6634C0532925a3b844Bc9e7595f2bD3e';
            invalidToAddress = 'invalid-address';
            amount = BigInt('1000000000000000000');
            return [4 /*yield*/, (0, bun_test_1.expect)(adapter.sendTransaction(fromAddress, invalidToAddress, amount, types_1.PaymentMethod.ETH)).rejects.toThrow('Invalid address format')];
          case 1:
            _a.sent();
            return [2];
        }
      });
    }); });
    (0, bun_test_1.it)('should throw error for zero amount', () => { return __awaiter(void 0, void 0, void 0, function () {
      let fromAddress, toAddress, amount;
      return __generator(this, (_a) => {
        switch (_a.label) {
          case 0:
            fromAddress = '0x742d35Cc6634C0532925a3b844Bc9e7595f2bD3e';
            toAddress = '0x8626f6940E2eb28930eFb4CeF49B2d1F2C9C1199';
            amount = BigInt(0);
            return [4 /*yield*/, (0, bun_test_1.expect)(adapter.sendTransaction(fromAddress, toAddress, amount, types_1.PaymentMethod.ETH)).rejects.toThrow('Invalid amount')];
          case 1:
            _a.sent();
            return [2];
        }
      });
    }); });
    (0, bun_test_1.it)('should get transaction status', () => { return __awaiter(void 0, void 0, void 0, function () {
      let fromAddress, toAddress, amount, sendResult, txStatus, confirmedStatus;
      return __generator(this, (_a) => {
        switch (_a.label) {
          case 0:
            fromAddress = '0x742d35Cc6634C0532925a3b844Bc9e7595f2bD3e';
            toAddress = '0x8626f6940E2eb28930eFb4CeF49B2d1F2C9C1199';
            amount = BigInt('1000000000000000000');
            return [4 /*yield*/, adapter.sendTransaction(fromAddress, toAddress, amount, types_1.PaymentMethod.ETH)];
          case 1:
            sendResult = _a.sent();
            return [4 /*yield*/, adapter.getTransaction(sendResult.hash)];
          case 2:
            txStatus = _a.sent();
            (0, bun_test_1.expect)(txStatus).toBeDefined();
            (0, bun_test_1.expect)(txStatus.hash).toBe(sendResult.hash);
            (0, bun_test_1.expect)(txStatus.status).toBe(types_1.PaymentStatus.PROCESSING);
            // Wait for confirmation and check again
            return [4 /*yield*/, new Promise((resolve) => { return setTimeout(resolve, 1100); })];
          case 3:
            // Wait for confirmation and check again
            _a.sent();
            return [4 /*yield*/, adapter.getTransaction(sendResult.hash)];
          case 4:
            confirmedStatus = _a.sent();
            (0, bun_test_1.expect)(confirmedStatus.status).toBe(types_1.PaymentStatus.COMPLETED);
            (0, bun_test_1.expect)(confirmedStatus.confirmations).toBe(1);
            return [2];
        }
      });
    }); });
    (0, bun_test_1.it)('should handle transaction not found gracefully', () => { return __awaiter(void 0, void 0, void 0, function () {
      let unknownHash, result;
      return __generator(this, (_a) => {
        switch (_a.label) {
          case 0:
            unknownHash = '0x'.concat('0'.repeat(64));
            return [4 /*yield*/, adapter.getTransaction(unknownHash)];
          case 1:
            result = _a.sent();
            (0, bun_test_1.expect)(result.hash).toBe(unknownHash);
            (0, bun_test_1.expect)(result.status).toBe(types_1.PaymentStatus.PROCESSING);
            (0, bun_test_1.expect)(result.confirmations).toBe(0);
            return [2];
        }
      });
    }); });
  });
  (0, bun_test_1.describe)('Wallet Operations', () => {
    (0, bun_test_1.beforeEach)(() => { return __awaiter(void 0, void 0, void 0, function () {
      return __generator(this, (_a) => {
        switch (_a.label) {
          case 0: return [4 /*yield*/, adapter.initialize()];
          case 1:
            _a.sent();
            return [2];
        }
      });
    }); });
    (0, bun_test_1.it)('should create MPC wallet successfully', () => { return __awaiter(void 0, void 0, void 0, function () {
      let wallet;
      return __generator(this, (_a) => {
        switch (_a.label) {
          case 0: return [4 /*yield*/, adapter.createWallet()];
          case 1:
            wallet = _a.sent();
            (0, bun_test_1.expect)(wallet).toBeDefined();
            (0, bun_test_1.expect)(wallet.address).toMatch(/^0x[a-fA-F0-9]{40}$/);
            (0, bun_test_1.expect)(wallet.privateKey).toBe(''); // MPC wallets don't expose private keys
            return [2];
        }
      });
    }); });
    (0, bun_test_1.it)('should create wallet with proper metadata', () => { return __awaiter(void 0, void 0, void 0, function () {
      let spy, originalCreateWallet;
      return __generator(this, (_a) => {
        switch (_a.label) {
          case 0:
            originalCreateWallet = mockWalletService.createWallet;
            spy = (0, bun_test_1.mock)(mockWalletService.createWallet.bind(mockWalletService));
            mockWalletService.createWallet = spy;
            return [4 /*yield*/, adapter.createWallet()];
          case 1:
            _a.sent();
            (0, bun_test_1.expect)(spy).toHaveBeenCalledWith(bun_test_1.expect.objectContaining({
              type: 'mpc',
              name: bun_test_1.expect.stringContaining('Payment Wallet'),
              metadata: bun_test_1.expect.objectContaining({
                purpose: 'payments',
                createdBy: 'payment-service',
                createdAt: bun_test_1.expect.any(String),
              }),
            }));
            // Restore original method
            mockWalletService.createWallet = originalCreateWallet;
            return [2];
        }
      });
    }); });
  });
  (0, bun_test_1.describe)('Address Validation', () => {
    (0, bun_test_1.beforeEach)(() => { return __awaiter(void 0, void 0, void 0, function () {
      return __generator(this, (_a) => {
        switch (_a.label) {
          case 0: return [4 /*yield*/, adapter.initialize()];
          case 1:
            _a.sent();
            return [2];
        }
      });
    }); });
    (0, bun_test_1.it)('should validate EVM addresses correctly', () => {
      const validAddresses = [
        '0x742d35Cc6634C0532925a3b844Bc9e7595f2bD3e',
        '0x8626f6940E2eb28930eFb4CeF49B2d1F2C9C1199',
        '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
      ];
      validAddresses.forEach((address) => {
        (0, bun_test_1.expect)(adapter.validateAddress(address, types_1.PaymentMethod.ETH)).toBe(true);
        (0, bun_test_1.expect)(adapter.validateAddress(address, types_1.PaymentMethod.USDC_ETH)).toBe(true);
      });
    });
    (0, bun_test_1.it)('should reject invalid EVM addresses', () => {
      const invalidAddresses = [
        '',
        '0x',
        '0x742d35Cc6634C0532925a3b844Bc9e7595f2bD3', // Too short
        '0x742d35Cc6634C0532925a3b844Bc9e7595f2bD3e1', // Too long
        '742d35Cc6634C0532925a3b844Bc9e7595f2bD3e', // Missing 0x
        '0xZZZZ35Cc6634C0532925a3b844Bc9e7595f2bD3e', // Invalid hex
      ];
      invalidAddresses.forEach((address) => {
        (0, bun_test_1.expect)(adapter.validateAddress(address, types_1.PaymentMethod.ETH)).toBe(false);
      });
    });
    (0, bun_test_1.it)('should validate Solana addresses correctly', () => {
      const validAddress = '7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZjDpNqYV4N';
      (0, bun_test_1.expect)(adapter.validateAddress(validAddress, types_1.PaymentMethod.SOL)).toBe(true);
    });
    (0, bun_test_1.it)('should reject invalid Solana addresses', () => {
      const invalidAddresses = [
        '',
        '0x742d35Cc6634C0532925a3b844Bc9e7595f2bD3e', // EVM address
        'invalid-base58-chars!@#',
        '7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZjD', // Too short (38 chars)
        '7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZjDpNqYV4N7xKXtg2CW87d97', // Too long
      ];
      invalidAddresses.forEach((address) => {
        const isValid = adapter.validateAddress(address, types_1.PaymentMethod.SOL);
        (0, bun_test_1.expect)(isValid).toBe(false);
      });
    });
    (0, bun_test_1.it)('should reject unsupported payment methods', () => {
      const address = '0x742d35Cc6634C0532925a3b844Bc9e7595f2bD3e';
      (0, bun_test_1.expect)(adapter.validateAddress(address, types_1.PaymentMethod.BTC)).toBe(false);
    });
  });
  (0, bun_test_1.describe)('Error Handling', () => {
    (0, bun_test_1.beforeEach)(() => { return __awaiter(void 0, void 0, void 0, function () {
      return __generator(this, (_a) => {
        switch (_a.label) {
          case 0: return [4 /*yield*/, adapter.initialize()];
          case 1:
            _a.sent();
            return [2];
        }
      });
    }); });
    (0, bun_test_1.it)('should throw specific error when adapter not initialized', () => { return __awaiter(void 0, void 0, void 0, function () {
      let uninitializedAdapter;
      return __generator(this, (_a) => {
        switch (_a.label) {
          case 0:
            uninitializedAdapter = new CrossmintAdapter_1.CrossmintAdapter(runtime);
            return [4 /*yield*/, (0, bun_test_1.expect)(uninitializedAdapter.getBalance('0x742d35Cc6634C0532925a3b844Bc9e7595f2bD3e', types_1.PaymentMethod.ETH)).rejects.toThrow('Adapter not initialized')];
          case 1:
            _a.sent();
            return [2];
        }
      });
    }); });
    (0, bun_test_1.it)('should handle service errors gracefully', () => { return __awaiter(void 0, void 0, void 0, function () {
      let fromAddress, toAddress, amount;
      return __generator(this, (_a) => {
        switch (_a.label) {
          case 0:
            // Mock service error
            mockWalletService.transfer = (0, bun_test_1.mock)().mockRejectedValue(new Error('Network error'));
            fromAddress = '0x742d35Cc6634C0532925a3b844Bc9e7595f2bD3e';
            toAddress = '0x8626f6940E2eb28930eFb4CeF49B2d1F2C9C1199';
            amount = BigInt('1000000000000000000');
            return [4 /*yield*/, (0, bun_test_1.expect)(adapter.sendTransaction(fromAddress, toAddress, amount, types_1.PaymentMethod.ETH)).rejects.toThrow(CrossmintAdapter_1.CrossmintAdapterError)];
          case 1:
            _a.sent();
            return [2];
        }
      });
    }); });
    (0, bun_test_1.it)('should preserve error details in CrossmintAdapterError', () => { return __awaiter(void 0, void 0, void 0, function () {
      let originalError, error_1;
      return __generator(this, (_a) => {
        switch (_a.label) {
          case 0:
            originalError = new Error('Original error message');
            mockWalletService.getBalances = (0, bun_test_1.mock)().mockRejectedValue(originalError);
            _a.label = 1;
          case 1:
            _a.trys.push([1, 3, , 4]);
            return [4 /*yield*/, adapter.getBalance('0x742d35Cc6634C0532925a3b844Bc9e7595f2bD3e', types_1.PaymentMethod.ETH)];
          case 2:
            _a.sent();
            return [3 /*break*/, 4];
          case 3:
            error_1 = _a.sent();
            (0, bun_test_1.expect)(error_1).toBeInstanceOf(CrossmintAdapter_1.CrossmintAdapterError);
            (0, bun_test_1.expect)(error_1.code).toBe('BALANCE_ERROR');
            (0, bun_test_1.expect)(error_1.details).toBe(originalError);
            return [3 /*break*/, 4];
          case 4: return [2];
        }
      });
    }); });
  });
  (0, bun_test_1.describe)('Multi-chain Support', () => {
    (0, bun_test_1.beforeEach)(() => { return __awaiter(void 0, void 0, void 0, function () {
      return __generator(this, (_a) => {
        switch (_a.label) {
          case 0: return [4 /*yield*/, adapter.initialize()];
          case 1:
            _a.sent();
            return [2];
        }
      });
    }); });
    (0, bun_test_1.it)('should handle different chains correctly', () => { return __awaiter(void 0, void 0, void 0, function () {
      let address, methods, _i, methods_1, method;
      return __generator(this, (_a) => {
        address = '0x742d35Cc6634C0532925a3b844Bc9e7595f2bD3e';
        methods = [
          types_1.PaymentMethod.ETH,
          types_1.PaymentMethod.MATIC,
          types_1.PaymentMethod.ARB,
          types_1.PaymentMethod.OP,
          types_1.PaymentMethod.BASE,
        ];
        for (_i = 0, methods_1 = methods; _i < methods_1.length; _i++) {
          method = methods_1[_i];
          (0, bun_test_1.expect)(adapter.validateAddress(address, method)).toBe(true);
        }
        return [2];
      });
    }); });
    (0, bun_test_1.it)('should use correct token addresses for different networks', () => { return __awaiter(void 0, void 0, void 0, function () {
      let fromAddress, toAddress, amount, spy, originalTransfer;
      return __generator(this, (_a) => {
        switch (_a.label) {
          case 0:
            // Test mainnet
            runtime.getSetting = (0, bun_test_1.mock)((key) => {
              if (key === 'CROSSMINT_ENVIRONMENT') {
                return 'production';
              }
              return 'test-value';
            });
            fromAddress = '0x742d35Cc6634C0532925a3b844Bc9e7595f2bD3e';
            toAddress = '0x8626f6940E2eb28930eFb4CeF49B2d1F2C9C1199';
            amount = BigInt('1000000');
            originalTransfer = mockWalletService.transfer;
            spy = (0, bun_test_1.mock)(mockWalletService.transfer.bind(mockWalletService));
            mockWalletService.transfer = spy;
            return [4 /*yield*/, adapter.sendTransaction(fromAddress, toAddress, amount, types_1.PaymentMethod.USDC_ETH)];
          case 1:
            _a.sent();
            (0, bun_test_1.expect)(spy).toHaveBeenCalledWith(bun_test_1.expect.objectContaining({
              tokenAddress: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48', // Mainnet USDC
            }));
            // Restore original method
            mockWalletService.transfer = originalTransfer;
            return [2];
        }
      });
    }); });
    (0, bun_test_1.it)('should use testnet addresses in sandbox mode', () => { return __awaiter(void 0, void 0, void 0, function () {
      let fromAddress, toAddress, amount, spy, originalTransfer2;
      return __generator(this, (_a) => {
        switch (_a.label) {
          case 0:
            fromAddress = '0x742d35Cc6634C0532925a3b844Bc9e7595f2bD3e';
            toAddress = '0x8626f6940E2eb28930eFb4CeF49B2d1F2C9C1199';
            amount = BigInt('1000000');
            originalTransfer2 = mockWalletService.transfer;
            spy = (0, bun_test_1.mock)(mockWalletService.transfer.bind(mockWalletService));
            mockWalletService.transfer = spy;
            return [4 /*yield*/, adapter.sendTransaction(fromAddress, toAddress, amount, types_1.PaymentMethod.USDC_ETH)];
          case 1:
            _a.sent();
            (0, bun_test_1.expect)(spy).toHaveBeenCalledWith(bun_test_1.expect.objectContaining({
              tokenAddress: '0x07865c6E87B9F70255377e024ace6630C1Eaa37F', // Goerli USDC
            }));
            // Restore original method
            mockWalletService.transfer = originalTransfer2;
            return [2];
        }
      });
    }); });
  });
});
