'use strict';
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
exports.EVMWalletAdapter = void 0;
const core_1 = require('@elizaos/core');
const ethers_1 = require('ethers');
const viem_1 = require('viem');
const types_1 = require('../types');
/**
 * Wallet adapter for EVM chains integration using ethers.js
 */
const EVMWalletAdapter = /** @class */ (function () {
  function EVMWalletAdapter(runtime) {
    this.name = 'evm';
    this.supportedMethods = [
      types_1.PaymentMethod.USDC_ETH,
      types_1.PaymentMethod.ETH,
      types_1.PaymentMethod.MATIC,
      types_1.PaymentMethod.ARB,
      types_1.PaymentMethod.OP,
      types_1.PaymentMethod.BASE,
    ];
    this.providers = new Map();
    this.wallets = new Map();
    this.walletService = null;
    this.runtime = runtime;
  }
  EVMWalletAdapter.prototype.initialize = function () {
    return __awaiter(this, void 0, void 0, function () {
      let service;
      return __generator(this, function (_a) {
        try {
          // Initialize providers for each supported chain
          this.initializeProviders();
          service = this.runtime.getService('wallet');
          if (service) {
            this.walletService = service;
            core_1.elizaLogger.info('[EVMWalletAdapter] Initialized with real EVM providers and EVM wallet service');
          }
          else {
            core_1.elizaLogger.warn('[EVMWalletAdapter] EVM wallet service not found - adapter will have limited functionality');
          }
        }
        catch (error) {
          core_1.elizaLogger.error('[EVMWalletAdapter] Failed to initialize', error);
          throw error;
        }
        return [2];
      });
    });
  };
  EVMWalletAdapter.prototype.initializeProviders = function () {
    // Use public RPC endpoints or configured ones
    const rpcUrls = {
      1: this.runtime.getSetting('ETH_RPC_URL') || 'https://eth.llamarpc.com',
      137: this.runtime.getSetting('POLYGON_RPC_URL') || 'https://polygon-rpc.com',
      42161: this.runtime.getSetting('ARBITRUM_RPC_URL') || 'https://arb1.arbitrum.io/rpc',
      10: this.runtime.getSetting('OPTIMISM_RPC_URL') || 'https://mainnet.optimism.io',
      8453: this.runtime.getSetting('BASE_RPC_URL') || 'https://mainnet.base.org',
    };
    for (let _i = 0, _a = Object.entries(rpcUrls); _i < _a.length; _i++) {
      const _b = _a[_i], chainId = _b[0], url = _b[1];
      this.providers.set(Number(chainId), new ethers_1.JsonRpcProvider(url));
    }
  };
  EVMWalletAdapter.prototype.getBalance = function (address, method) {
    return __awaiter(this, void 0, void 0, function () {
      var provider, balance, tokenAddress, tokenContract, balance, error_1;
      return __generator(this, function (_a) {
        switch (_a.label) {
          case 0:
            if (!this.walletService) {
              core_1.elizaLogger.warn('[EVMWalletAdapter] No wallet service available for balance check');
              return [2 /*return*/, BigInt(0)];
            }
            _a.label = 1;
          case 1:
            _a.trys.push([1, 6, , 7]);
            // Validate address
            if (!(0, viem_1.isAddress)(address)) {
              throw new Error('Invalid Ethereum address');
            }
            provider = this.getProvider(method);
            if (!this.isNativeToken(method)) {return [3 /*break*/, 3];}
            return [4 /*yield*/, provider.getBalance(address)];
          case 2:
            balance = _a.sent();
            return [2 /*return*/, BigInt(balance.toString())];
          case 3:
            tokenAddress = this.getTokenAddress(method);
            if (!tokenAddress) {
              throw new Error('No token address for '.concat(method));
            }
            tokenContract = new ethers_1.Contract(tokenAddress, ['function balanceOf(address) view returns (uint256)'], provider);
            return [4 /*yield*/, tokenContract.balanceOf(address)];
          case 4:
            balance = _a.sent();
            return [2 /*return*/, BigInt(balance.toString())];
          case 5: return [3 /*break*/, 7];
          case 6:
            error_1 = _a.sent();
            core_1.elizaLogger.error('[EVMWalletAdapter] Error getting balance', { error: error_1, address, method });
            return [2 /*return*/, BigInt(0)];
          case 7: return [2];
        }
      });
    });
  };
  EVMWalletAdapter.prototype.sendTransaction = function (fromAddress, toAddress, amount, method, privateKey) {
    return __awaiter(this, void 0, void 0, function () {
      let wallet, _a, provider, connectedWallet, tx, _b, _c, tokenAddress, tokenContract, _d, _e, _f, receipt, error_2;
      let _g, _h;
      return __generator(this, function (_j) {
        switch (_j.label) {
          case 0:
            if (!this.walletService) {
              throw new Error('EVM wallet service not available');
            }
            _j.label = 1;
          case 1:
            _j.trys.push([1, 13, , 14]);
            // Validate addresses
            if (!(0, viem_1.isAddress)(fromAddress) || !(0, viem_1.isAddress)(toAddress)) {
              throw new Error('Invalid Ethereum address');
            }
            wallet = void 0;
            if (!privateKey) {return [3 /*break*/, 2];}
            wallet = new ethers_1.Wallet(privateKey);
            return [3 /*break*/, 5];
          case 2:
            _a = this.wallets.get(fromAddress);
            if (_a) {return [3 /*break*/, 4];}
            return [4 /*yield*/, this.loadWallet(fromAddress)];
          case 3:
            _a = (_j.sent());
            _j.label = 4;
          case 4:
            wallet = _a;
            _j.label = 5;
          case 5:
            provider = this.getProvider(method);
            connectedWallet = wallet.connect(provider);
            tx = void 0;
            if (!this.isNativeToken(method)) {return [3 /*break*/, 8];}
            _c = (_b = connectedWallet).sendTransaction;
            _g = {
              to: toAddress,
              value: amount.toString()
            };
            return [4 /*yield*/, this.estimateGas(method, false)];
          case 6: return [4 /*yield*/, _c.apply(_b, [(_g.gasLimit = _j.sent(),
          _g)])];
          case 7:
            // Send native token
            tx = _j.sent();
            return [3 /*break*/, 11];
          case 8:
            tokenAddress = this.getTokenAddress(method);
            if (!tokenAddress) {
              throw new Error('No token address for '.concat(method));
            }
            tokenContract = new ethers_1.Contract(tokenAddress, ['function transfer(address to, uint256 amount) returns (bool)'], connectedWallet);
            _e = (_d = tokenContract).transfer;
            _f = [toAddress, amount.toString()];
            _h = {};
            return [4 /*yield*/, this.estimateGas(method, true)];
          case 9: return [4 /*yield*/, _e.apply(_d, _f.concat([(_h.gasLimit = _j.sent(),
          _h)]))];
          case 10:
            tx = _j.sent();
            _j.label = 11;
          case 11: return [4 /*yield*/, tx.wait(1)];
          case 12:
            receipt = _j.sent();
            return [2 /*return*/, {
              hash: tx.hash,
              status: (receipt === null || receipt === void 0 ? void 0 : receipt.status) === 1 ? types_1.PaymentStatus.COMPLETED : types_1.PaymentStatus.FAILED,
              confirmations: (receipt === null || receipt === void 0 ? void 0 : receipt.confirmations) || 0,
            }];
          case 13:
            error_2 = _j.sent();
            core_1.elizaLogger.error('[EVMWalletAdapter] Error sending transaction', { error: error_2, method });
            throw error_2;
          case 14: return [2];
        }
      });
    });
  };
  EVMWalletAdapter.prototype.getTransaction = function (hash) {
    return __awaiter(this, void 0, void 0, function () {
      let _i, _a, provider, receipt, _b, error_3;
      return __generator(this, function (_c) {
        switch (_c.label) {
          case 0:
            if (!this.walletService) {
              return [2 /*return*/, {
                hash,
                status: types_1.PaymentStatus.PROCESSING,
                confirmations: 0,
              }];
            }
            _c.label = 1;
          case 1:
            _c.trys.push([1, 8, , 9]);
            _i = 0, _a = this.providers.values();
            _c.label = 2;
          case 2:
            if (!(_i < _a.length)) {return [3 /*break*/, 7];}
            provider = _a[_i];
            _c.label = 3;
          case 3:
            _c.trys.push([3, 5, , 6]);
            return [4 /*yield*/, provider.getTransactionReceipt(hash)];
          case 4:
            receipt = _c.sent();
            if (receipt) {
              return [2 /*return*/, {
                hash,
                status: receipt.status === 1 ? types_1.PaymentStatus.COMPLETED : types_1.PaymentStatus.FAILED,
                confirmations: receipt.confirmations || 0,
                blockNumber: receipt.blockNumber,
              }];
            }
            return [3 /*break*/, 6];
          case 5:
            _b = _c.sent();
            return [3 /*break*/, 6];
          case 6:
            _i++;
            return [3 /*break*/, 2];
          case 7:
            // Transaction not found or still pending
            return [2 /*return*/, {
              hash,
              status: types_1.PaymentStatus.PROCESSING,
              confirmations: 0,
            }];
          case 8:
            error_3 = _c.sent();
            core_1.elizaLogger.error('[EVMWalletAdapter] Error getting transaction', { error: error_3, hash });
            return [2 /*return*/, {
              hash,
              status: types_1.PaymentStatus.PROCESSING,
              confirmations: 0,
            }];
          case 9: return [2];
        }
      });
    });
  };
  EVMWalletAdapter.prototype.createWallet = function () {
    return __awaiter(this, void 0, void 0, function () {
      let hdWallet, wallet, error_4;
      return __generator(this, function (_a) {
        switch (_a.label) {
          case 0:
            _a.trys.push([0, 2, , 3]);
            hdWallet = ethers_1.Wallet.createRandom();
            wallet = new ethers_1.Wallet(hdWallet.privateKey);
            // Store encrypted wallet
            return [4 /*yield*/, this.storeWallet(wallet)];
          case 1:
            // Store encrypted wallet
            _a.sent();
            return [2 /*return*/, {
              address: wallet.address,
              privateKey: wallet.privateKey,
            }];
          case 2:
            error_4 = _a.sent();
            core_1.elizaLogger.error('[EVMWalletAdapter] Error creating wallet', { error: error_4 });
            throw error_4;
          case 3: return [2];
        }
      });
    });
  };
  EVMWalletAdapter.prototype.validateAddress = function (address, method) {
    if (!this.supportedMethods.includes(method)) {
      return false;
    }
    return (0, viem_1.isAddress)(address);
  };
  // Helper methods
  EVMWalletAdapter.prototype.getProvider = function (method) {
    const chainId = this.getChainId(method);
    const provider = this.providers.get(chainId);
    if (!provider) {
      throw new Error('No provider for chain '.concat(chainId));
    }
    return provider;
  };
  EVMWalletAdapter.prototype.storeWallet = function (wallet) {
    return __awaiter(this, void 0, void 0, function () {
      return __generator(this, function (_a) {
        // In production, store encrypted in database
        this.wallets.set(wallet.address, wallet);
        // TODO: Store encrypted private key in database
        core_1.elizaLogger.info('[EVMWalletAdapter] Wallet stored', { address: wallet.address });
        return [2];
      });
    });
  };
  EVMWalletAdapter.prototype.loadWallet = function (address) {
    return __awaiter(this, void 0, void 0, function () {
      let wallet;
      return __generator(this, function (_a) {
        wallet = this.wallets.get(address);
        if (!wallet) {
          throw new Error('Wallet not found for address '.concat(address));
        }
        return [2 /*return*/, wallet];
      });
    });
  };
  EVMWalletAdapter.prototype.estimateGas = function (method, isERC20) {
    return __awaiter(this, void 0, void 0, function () {
      return __generator(this, (_a) => {
        // Basic gas estimates
        if (isERC20) {
          return [2 /*return*/, BigInt(100000)]; // ERC20 transfer
        }
        else {
          return [2 /*return*/, BigInt(21000)]; // Native transfer
        }
        return [2];
      });
    });
  };
  EVMWalletAdapter.prototype.getChainId = function (method) {
    let _a;
    const chainMap = (_a = {},
    _a[types_1.PaymentMethod.USDC_ETH] = 1, // Ethereum mainnet
    _a[types_1.PaymentMethod.ETH] = 1,
    _a[types_1.PaymentMethod.MATIC] = 137, // Polygon
    _a[types_1.PaymentMethod.ARB] = 42161, // Arbitrum
    _a[types_1.PaymentMethod.OP] = 10, // Optimism
    _a[types_1.PaymentMethod.BASE] = 8453, // Base
    _a[types_1.PaymentMethod.USDC_SOL] = 0, // Not EVM
    _a[types_1.PaymentMethod.SOL] = 0, // Not EVM
    _a[types_1.PaymentMethod.BTC] = 0, // Not EVM
    _a[types_1.PaymentMethod.OTHER] = 1,
    _a);
    return chainMap[method] || 1;
  };
  EVMWalletAdapter.prototype.isNativeToken = function (method) {
    return [
      types_1.PaymentMethod.ETH,
      types_1.PaymentMethod.MATIC,
      types_1.PaymentMethod.ARB,
      types_1.PaymentMethod.OP,
      types_1.PaymentMethod.BASE,
    ].includes(method);
  };
  EVMWalletAdapter.prototype.getCurrencySymbol = function (method) {
    let _a;
    const symbolMap = (_a = {},
    _a[types_1.PaymentMethod.ETH] = 'ETH',
    _a[types_1.PaymentMethod.MATIC] = 'MATIC',
    _a[types_1.PaymentMethod.ARB] = 'ETH', // Arbitrum uses ETH
    _a[types_1.PaymentMethod.OP] = 'ETH', // Optimism uses ETH
    _a[types_1.PaymentMethod.BASE] = 'ETH', // Base uses ETH
    _a[types_1.PaymentMethod.USDC_ETH] = 'USDC',
    _a[types_1.PaymentMethod.USDC_SOL] = 'USDC',
    _a[types_1.PaymentMethod.SOL] = 'SOL',
    _a[types_1.PaymentMethod.BTC] = 'BTC',
    _a[types_1.PaymentMethod.OTHER] = 'UNKNOWN',
    _a);
    return symbolMap[method] || 'UNKNOWN';
  };
  EVMWalletAdapter.prototype.getDecimals = function (method) {
    if (this.isNativeToken(method)) {
      return 18;
    }
    // USDC has 6 decimals
    if (method === types_1.PaymentMethod.USDC_ETH) {
      return 6;
    }
    return 18;
  };
  EVMWalletAdapter.prototype.getTokenAddress = function (method) {
    let _a;
    // USDC addresses on different chains
    const tokenMap = (_a = {},
    _a[types_1.PaymentMethod.USDC_ETH] = '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48', // USDC on Ethereum
    _a[types_1.PaymentMethod.USDC_SOL] = '', // Not EVM
    _a[types_1.PaymentMethod.ETH] = '', // Native
    _a[types_1.PaymentMethod.SOL] = '', // Not EVM
    _a[types_1.PaymentMethod.BTC] = '', // Not EVM
    _a[types_1.PaymentMethod.MATIC] = '', // Native
    _a[types_1.PaymentMethod.ARB] = '', // Native
    _a[types_1.PaymentMethod.OP] = '', // Native
    _a[types_1.PaymentMethod.BASE] = '', // Native
    _a[types_1.PaymentMethod.OTHER] = '',
    _a);
    return tokenMap[method] || null;
  };
  EVMWalletAdapter.prototype.encodeERC20Transfer = function (to, amount) {
    // ERC20 transfer function signature: transfer(address,uint256)
    const functionSelector = '0xa9059cbb';
    // Pad address to 32 bytes
    const paddedAddress = to.slice(2).padStart(64, '0');
    // Convert amount to hex and pad to 32 bytes
    const paddedAmount = amount.toString(16).padStart(64, '0');
    return functionSelector + paddedAddress + paddedAmount;
  };
  return EVMWalletAdapter;
}());
exports.EVMWalletAdapter = EVMWalletAdapter;
