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
exports.CrossmintAdapter = exports.CrossmintAdapterError = void 0;
const core_1 = require('@elizaos/core');
const types_1 = require('../types');
// Custom error class for Crossmint-specific errors
const CrossmintAdapterError = /** @class */ (function (_super) {
  __extends(CrossmintAdapterError, _super);
  function CrossmintAdapterError(message, code, details) {
    if (code === void 0) { code = 'CROSSMINT_ERROR'; }
    const _this = _super.call(this, message) || this;
    _this.code = code;
    _this.details = details;
    _this.name = 'CrossmintAdapterError';
    return _this;
  }
  return CrossmintAdapterError;
}(Error));
exports.CrossmintAdapterError = CrossmintAdapterError;
/**
 * Wallet adapter for Crossmint integration
 * Supports MPC wallets and cross-chain operations
 */
const CrossmintAdapter = /** @class */ (function () {
  function CrossmintAdapter(runtime) {
    this.name = 'crossmint';
    this.supportedMethods = [
      types_1.PaymentMethod.USDC_ETH,
      types_1.PaymentMethod.ETH,
      types_1.PaymentMethod.MATIC,
      types_1.PaymentMethod.ARB,
      types_1.PaymentMethod.OP,
      types_1.PaymentMethod.BASE,
      types_1.PaymentMethod.USDC_SOL,
      types_1.PaymentMethod.SOL,
    ];
    this.crossmintService = null;
    this.walletService = null;
    this.initialized = false;
    this.runtime = runtime;
  }
  CrossmintAdapter.prototype.initialize = function () {
    return __awaiter(this, void 0, void 0, function () {
      let crossmintService, walletService;
      return __generator(this, function (_a) {
        try {
          // Validate required configuration
          this.validateConfiguration();
          crossmintService = this.runtime.getService('real-crossmint');
          walletService = this.runtime.getService('crossmint-universal-wallet');
          if (crossmintService && this.isRealCrossMintService(crossmintService)) {
            this.crossmintService = crossmintService;
          }
          if (walletService && this.isCrossMintUniversalWalletService(walletService)) {
            this.walletService = walletService;
          }
          if (!this.crossmintService && !this.walletService) {
            throw new CrossmintAdapterError('No Crossmint services found. Ensure @elizaos/plugin-crossmint is loaded.', 'SERVICE_NOT_FOUND');
          }
          this.initialized = true;
          core_1.elizaLogger.info('[CrossmintAdapter] Initialized successfully', {
            hasCrossmintService: !!this.crossmintService,
            hasWalletService: !!this.walletService,
          });
        }
        catch (error) {
          core_1.elizaLogger.error('[CrossmintAdapter] Failed to initialize', error);
          throw error;
        }
        return [2];
      });
    });
  };
  CrossmintAdapter.prototype.validateConfiguration = function () {
    const _this = this;
    const requiredSettings = ['CROSSMINT_API_KEY', 'CROSSMINT_PROJECT_ID'];
    const missingSettings = requiredSettings.filter((setting) => { return !_this.runtime.getSetting(setting); });
    if (missingSettings.length > 0) {
      throw new CrossmintAdapterError('Missing required settings: '.concat(missingSettings.join(', ')), 'MISSING_CONFIGURATION');
    }
  };
  CrossmintAdapter.prototype.isRealCrossMintService = function (service) {
    return (typeof service.listWallets === 'function' &&
            typeof service.createWallet === 'function' &&
            typeof service.createTransfer === 'function' &&
            typeof service.getTransaction === 'function');
  };
  CrossmintAdapter.prototype.isCrossMintUniversalWalletService = function (service) {
    return (typeof service.getBalances === 'function' &&
            typeof service.transfer === 'function' &&
            typeof service.getTransaction === 'function' &&
            typeof service.createWallet === 'function');
  };
  CrossmintAdapter.prototype.ensureInitialized = function () {
    if (!this.initialized) {
      throw new CrossmintAdapterError('Adapter not initialized', 'NOT_INITIALIZED');
    }
  };
  CrossmintAdapter.prototype.getBalance = function (address, method) {
    return __awaiter(this, void 0, void 0, function () {
      let chain_1, balances, tokenSymbol_1, balance, _a, whole, _b, fraction, decimals, paddedFraction, balanceStr, error_1;
      return __generator(this, function (_c) {
        switch (_c.label) {
          case 0:
            this.ensureInitialized();
            _c.label = 1;
          case 1:
            _c.trys.push([1, 3, , 4]);
            if (!this.walletService) {
              throw new CrossmintAdapterError('Wallet service not available', 'SERVICE_UNAVAILABLE');
            }
            // Validate address format
            if (!this.validateAddress(address, method)) {
              throw new CrossmintAdapterError('Invalid address format', 'INVALID_ADDRESS');
            }
            chain_1 = this.getChainForMethod(method);
            return [4 /*yield*/, this.walletService.getBalances(address)];
          case 2:
            balances = _c.sent();
            tokenSymbol_1 = this.getTokenSymbol(method);
            balance = balances.find((b) => { return b.symbol === tokenSymbol_1 && b.chain === chain_1; });
            if (balance) {
              // Parse balance string to BigInt
              try {
                _a = balance.balance.split('.'), whole = _a[0], _b = _a[1], fraction = _b === void 0 ? '' : _b;
                decimals = balance.decimals || 18;
                paddedFraction = fraction.padEnd(decimals, '0').slice(0, decimals);
                balanceStr = whole + paddedFraction;
                return [2 /*return*/, BigInt(balanceStr)];
              }
              catch (parseError) {
                core_1.elizaLogger.error('[CrossmintAdapter] Error parsing balance', {
                  balance: balance.balance,
                  error: parseError,
                });
                return [2 /*return*/, BigInt(0)];
              }
            }
            core_1.elizaLogger.warn('[CrossmintAdapter] Balance not found', {
              address,
              method,
              chain: chain_1,
              tokenSymbol: tokenSymbol_1,
            });
            return [2 /*return*/, BigInt(0)];
          case 3:
            error_1 = _c.sent();
            core_1.elizaLogger.error('[CrossmintAdapter] Error getting balance', { error: error_1, address, method });
            if (error_1 instanceof CrossmintAdapterError) {
              throw error_1;
            }
            throw new CrossmintAdapterError('Failed to get balance', 'BALANCE_ERROR', error_1);
          case 4: return [2];
        }
      });
    });
  };
  CrossmintAdapter.prototype.sendTransaction = function (fromAddress, toAddress, amount, method, _privateKey) {
    return __awaiter(this, void 0, void 0, function () {
      let chain, tokenAddress, result, error_2;
      return __generator(this, function (_a) {
        switch (_a.label) {
          case 0:
            this.ensureInitialized();
            _a.label = 1;
          case 1:
            _a.trys.push([1, 3, , 4]);
            if (!this.walletService) {
              throw new CrossmintAdapterError('Wallet service not available', 'SERVICE_UNAVAILABLE');
            }
            // Validate addresses
            if (!this.validateAddress(fromAddress, method) || !this.validateAddress(toAddress, method)) {
              throw new CrossmintAdapterError('Invalid address format', 'INVALID_ADDRESS');
            }
            // Validate amount
            if (amount <= BigInt(0)) {
              throw new CrossmintAdapterError('Invalid amount', 'INVALID_AMOUNT');
            }
            chain = this.getChainForMethod(method);
            tokenAddress = this.isNativeToken(method) ? undefined : this.getTokenAddress(method);
            return [4 /*yield*/, this.walletService.transfer({
              from: fromAddress,
              to: toAddress,
              amount: amount.toString(),
              chain,
              tokenAddress,
            })];
          case 2:
            result = _a.sent();
            // Validate result
            if (!result.hash) {
              throw new CrossmintAdapterError('Transaction hash not returned', 'MISSING_HASH');
            }
            return [2 /*return*/, {
              hash: result.hash,
              status: this.mapStatus(result.status),
              confirmations: result.confirmations || 0,
              blockNumber: result.blockNumber,
            }];
          case 3:
            error_2 = _a.sent();
            core_1.elizaLogger.error('[CrossmintAdapter] Error sending transaction', {
              error: error_2,
              method,
              fromAddress,
              toAddress,
              amount: amount.toString(),
            });
            if (error_2 instanceof CrossmintAdapterError) {
              throw error_2;
            }
            throw new CrossmintAdapterError('Failed to send transaction', 'TRANSACTION_ERROR', error_2);
          case 4: return [2];
        }
      });
    });
  };
  CrossmintAdapter.prototype.getTransaction = function (hash) {
    return __awaiter(this, void 0, void 0, function () {
      let tx, error_3;
      return __generator(this, function (_a) {
        switch (_a.label) {
          case 0:
            this.ensureInitialized();
            _a.label = 1;
          case 1:
            _a.trys.push([1, 3, , 4]);
            if (!this.walletService) {
              core_1.elizaLogger.warn('[CrossmintAdapter] Wallet service not available for transaction lookup');
              return [2 /*return*/, {
                hash,
                status: types_1.PaymentStatus.PROCESSING,
                confirmations: 0,
              }];
            }
            // Validate hash format
            if (!hash || (hash.startsWith('0x') && !/^0x[a-fA-F0-9]{64}$/.test(hash))) {
              throw new CrossmintAdapterError('Invalid transaction hash', 'INVALID_HASH');
            }
            return [4 /*yield*/, this.walletService.getTransaction(hash)];
          case 2:
            tx = _a.sent();
            return [2 /*return*/, {
              hash: tx.hash,
              status: this.mapStatus(tx.status),
              confirmations: tx.confirmations || 0,
              blockNumber: tx.blockNumber,
            }];
          case 3:
            error_3 = _a.sent();
            core_1.elizaLogger.error('[CrossmintAdapter] Error getting transaction', { error: error_3, hash });
            // Don't throw for transaction lookups - return processing status
            return [2 /*return*/, {
              hash,
              status: types_1.PaymentStatus.PROCESSING,
              confirmations: 0,
            }];
          case 4: return [2];
        }
      });
    });
  };
  CrossmintAdapter.prototype.createWallet = function () {
    return __awaiter(this, void 0, void 0, function () {
      let wallet, error_4;
      return __generator(this, function (_a) {
        switch (_a.label) {
          case 0:
            this.ensureInitialized();
            _a.label = 1;
          case 1:
            _a.trys.push([1, 3, , 4]);
            if (!this.walletService) {
              throw new CrossmintAdapterError('Wallet service not available', 'SERVICE_UNAVAILABLE');
            }
            return [4 /*yield*/, this.walletService.createWallet({
              type: 'mpc', // Use MPC wallets for security
              name: 'Payment Wallet '.concat(Date.now()),
              metadata: {
                purpose: 'payments',
                createdBy: 'payment-service',
                createdAt: new Date().toISOString(),
              },
            })];
          case 2:
            wallet = _a.sent();
            // Validate wallet creation
            if (!wallet.address) {
              throw new CrossmintAdapterError('Wallet address not returned', 'WALLET_CREATION_FAILED');
            }
            core_1.elizaLogger.info('[CrossmintAdapter] Created MPC wallet', {
              address: wallet.address,
              type: wallet.type,
            });
            return [2 /*return*/, {
              address: wallet.address,
              privateKey: '', // MPC wallets don't expose private keys
            }];
          case 3:
            error_4 = _a.sent();
            core_1.elizaLogger.error('[CrossmintAdapter] Error creating wallet', { error: error_4 });
            if (error_4 instanceof CrossmintAdapterError) {
              throw error_4;
            }
            throw new CrossmintAdapterError('Failed to create wallet', 'WALLET_CREATION_ERROR', error_4);
          case 4: return [2];
        }
      });
    });
  };
  CrossmintAdapter.prototype.validateAddress = function (address, method) {
    if (!address || !this.supportedMethods.includes(method)) {
      return false;
    }
    const chain = this.getChainForMethod(method);
    // Solana address validation
    if (chain === 'solana') {
      // Reject if it looks like an EVM address
      if (address.startsWith('0x')) {
        return false;
      }
      // Solana addresses should be 44 characters (32 bytes base58 encoded)
      // Some addresses might be 43 characters due to leading zero compression
      if (address.length !== 43 && address.length !== 44) {
        return false;
      }
      try {
        // Basic Solana address validation (32 bytes base58)
        const decoded = this.base58Decode(address);
        return decoded.length === 32;
      }
      catch (_a) {
        return false;
      }
    }
    // EVM address validation
    try {
      // Check if it's a valid hex address
      if (!/^0x[a-fA-F0-9]{40}$/.test(address)) {
        return false;
      }
      // TODO: Add checksum validation for EVM addresses
      return true;
    }
    catch (_b) {
      return false;
    }
  };
  // Helper methods
  CrossmintAdapter.prototype.getChainForMethod = function (method) {
    let _a;
    const chainMap = (_a = {},
    _a[types_1.PaymentMethod.USDC_ETH] = 'ethereum',
    _a[types_1.PaymentMethod.ETH] = 'ethereum',
    _a[types_1.PaymentMethod.MATIC] = 'polygon',
    _a[types_1.PaymentMethod.ARB] = 'arbitrum',
    _a[types_1.PaymentMethod.OP] = 'optimism',
    _a[types_1.PaymentMethod.BASE] = 'base',
    _a[types_1.PaymentMethod.USDC_SOL] = 'solana',
    _a[types_1.PaymentMethod.SOL] = 'solana',
    _a[types_1.PaymentMethod.BTC] = 'bitcoin', // Not supported by Crossmint
    _a[types_1.PaymentMethod.OTHER] = 'ethereum',
    _a);
    return chainMap[method] || 'ethereum';
  };
  CrossmintAdapter.prototype.getTokenSymbol = function (method) {
    let _a;
    const symbolMap = (_a = {},
    _a[types_1.PaymentMethod.USDC_ETH] = 'USDC',
    _a[types_1.PaymentMethod.ETH] = 'ETH',
    _a[types_1.PaymentMethod.MATIC] = 'MATIC',
    _a[types_1.PaymentMethod.ARB] = 'ETH', // Arbitrum uses ETH
    _a[types_1.PaymentMethod.OP] = 'ETH', // Optimism uses ETH
    _a[types_1.PaymentMethod.BASE] = 'ETH', // Base uses ETH
    _a[types_1.PaymentMethod.USDC_SOL] = 'USDC',
    _a[types_1.PaymentMethod.SOL] = 'SOL',
    _a[types_1.PaymentMethod.BTC] = 'BTC',
    _a[types_1.PaymentMethod.OTHER] = 'UNKNOWN',
    _a);
    return symbolMap[method] || 'UNKNOWN';
  };
  CrossmintAdapter.prototype.isNativeToken = function (method) {
    return [
      types_1.PaymentMethod.ETH,
      types_1.PaymentMethod.MATIC,
      types_1.PaymentMethod.ARB,
      types_1.PaymentMethod.OP,
      types_1.PaymentMethod.BASE,
      types_1.PaymentMethod.SOL,
    ].includes(method);
  };
  CrossmintAdapter.prototype.getTokenAddress = function (method) {
    let _a, _b;
    // Get network-specific token addresses
    const network = this.runtime.getSetting('CROSSMINT_ENVIRONMENT') || 'production';
    if (network === 'production') {
      // Mainnet USDC addresses
      var tokenMap = (_a = {},
      _a[types_1.PaymentMethod.USDC_ETH] = '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48', // USDC on Ethereum
      _a[types_1.PaymentMethod.USDC_SOL] = 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v', // USDC on Solana
      _a[types_1.PaymentMethod.ETH] = undefined, // Native
      _a[types_1.PaymentMethod.SOL] = undefined, // Native
      _a[types_1.PaymentMethod.BTC] = undefined, // Not supported
      _a[types_1.PaymentMethod.MATIC] = undefined, // Native
      _a[types_1.PaymentMethod.ARB] = undefined, // Native
      _a[types_1.PaymentMethod.OP] = undefined, // Native
      _a[types_1.PaymentMethod.BASE] = undefined, // Native
      _a[types_1.PaymentMethod.OTHER] = undefined,
      _a);
      return tokenMap[method];
    }
    else {
      // Testnet USDC addresses
      var tokenMap = (_b = {},
      _b[types_1.PaymentMethod.USDC_ETH] = '0x07865c6E87B9F70255377e024ace6630C1Eaa37F', // USDC on Goerli
      _b[types_1.PaymentMethod.USDC_SOL] = '4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU', // USDC on Solana Devnet
      _b[types_1.PaymentMethod.ETH] = undefined, // Native
      _b[types_1.PaymentMethod.SOL] = undefined, // Native
      _b[types_1.PaymentMethod.BTC] = undefined, // Not supported
      _b[types_1.PaymentMethod.MATIC] = undefined, // Native
      _b[types_1.PaymentMethod.ARB] = undefined, // Native
      _b[types_1.PaymentMethod.OP] = undefined, // Native
      _b[types_1.PaymentMethod.BASE] = undefined, // Native
      _b[types_1.PaymentMethod.OTHER] = undefined,
      _b);
      return tokenMap[method];
    }
  };
  CrossmintAdapter.prototype.mapStatus = function (status) {
    const statusMap = {
      confirmed: types_1.PaymentStatus.COMPLETED,
      completed: types_1.PaymentStatus.COMPLETED,
      success: types_1.PaymentStatus.COMPLETED,
      failed: types_1.PaymentStatus.FAILED,
      error: types_1.PaymentStatus.FAILED,
      cancelled: types_1.PaymentStatus.FAILED,
      rejected: types_1.PaymentStatus.FAILED,
      pending: types_1.PaymentStatus.PROCESSING,
      processing: types_1.PaymentStatus.PROCESSING,
      submitted: types_1.PaymentStatus.PROCESSING,
    };
    return statusMap[status.toLowerCase()] || types_1.PaymentStatus.PROCESSING;
  };
  CrossmintAdapter.prototype.base58Decode = function (str) {
    const ALPHABET = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';
    const ALPHABET_MAP = {};
    for (var i = 0; i < ALPHABET.length; i++) {
      ALPHABET_MAP[ALPHABET[i]] = i;
    }
    // Convert base58 string to a large integer
    let num = BigInt(0);
    const base = BigInt(58);
    for (var i = 0; i < str.length; i++) {
      const char = str[i];
      if (!(char in ALPHABET_MAP)) {
        throw new Error('Invalid base58 character');
      }
      num = num * base + BigInt(ALPHABET_MAP[char]);
    }
    // Convert the integer to bytes
    const bytes = [];
    while (num > 0) {
      bytes.unshift(Number(num % BigInt(256)));
      num = num / BigInt(256);
    }
    // Handle leading zeros (1s in base58)
    for (var i = 0; i < str.length && str[i] === '1'; i++) {
      bytes.unshift(0);
    }
    return new Uint8Array(bytes);
  };
  return CrossmintAdapter;
}());
exports.CrossmintAdapter = CrossmintAdapter;
