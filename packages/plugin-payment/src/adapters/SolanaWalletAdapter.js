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
exports.SolanaWalletAdapter = void 0;
const core_1 = require('@elizaos/core');
const web3_js_1 = require('@solana/web3.js');
const node_buffer_1 = require('node:buffer');
const types_1 = require('../types');
/**
 * Wallet adapter for Solana integration
 */
const SolanaWalletAdapter = /** @class */ (function () {
  function SolanaWalletAdapter(runtime) {
    this.name = 'solana';
    this.supportedMethods = [types_1.PaymentMethod.USDC_SOL, types_1.PaymentMethod.SOL];
    this.walletService = null;
    this.runtime = runtime;
  }
  SolanaWalletAdapter.prototype.initialize = function () {
    return __awaiter(this, void 0, void 0, function () {
      let service;
      return __generator(this, function (_a) {
        try {
          service = this.runtime.getService('custodial-wallet') ||
                        this.runtime.getService('solana-custodial-wallet');
          if (service) {
            this.walletService = service;
            core_1.elizaLogger.info('[SolanaWalletAdapter] Initialized with Solana wallet service');
          }
          else {
            core_1.elizaLogger.warn('[SolanaWalletAdapter] Solana wallet service not found - adapter will have limited functionality');
          }
        }
        catch (error) {
          core_1.elizaLogger.error('[SolanaWalletAdapter] Failed to initialize', error);
          throw error;
        }
        return [2];
      });
    });
  };
  SolanaWalletAdapter.prototype.getBalance = function (address, method) {
    return __awaiter(this, void 0, void 0, function () {
      let balance, error_1;
      return __generator(this, function (_a) {
        switch (_a.label) {
          case 0:
            if (!this.walletService) {
              core_1.elizaLogger.warn('[SolanaWalletAdapter] No wallet service available for balance check');
              return [2 /*return*/, BigInt(0)];
            }
            _a.label = 1;
          case 1:
            _a.trys.push([1, 5, , 6]);
            // Validate address
            new web3_js_1.PublicKey(address);
            if (!(method === types_1.PaymentMethod.SOL)) {return [3 /*break*/, 3];}
            return [4 /*yield*/, this.walletService.getBalance(address)];
          case 2:
            balance = _a.sent();
            // Convert SOL to lamports
            return [2 /*return*/, BigInt(Math.floor(balance * 1e9))];
          case 3:
            if (method === types_1.PaymentMethod.USDC_SOL) {
              // For USDC, we need to check token accounts
              // This is a simplified version - in production, you'd need to query token accounts
              core_1.elizaLogger.warn('[SolanaWalletAdapter] USDC balance check not fully implemented');
              return [2 /*return*/, BigInt(0)];
            }
            _a.label = 4;
          case 4: return [2 /*return*/, BigInt(0)];
          case 5:
            error_1 = _a.sent();
            core_1.elizaLogger.error('[SolanaWalletAdapter] Error getting balance', { error: error_1, address, method });
            return [2 /*return*/, BigInt(0)];
          case 6: return [2];
        }
      });
    });
  };
  SolanaWalletAdapter.prototype.sendTransaction = function (fromAddress, toAddress, amount, method, _privateKey) {
    return __awaiter(this, void 0, void 0, function () {
      var wallets, sourceWallet, signature, result, usdcMint, result, error_2;
      return __generator(this, function (_a) {
        switch (_a.label) {
          case 0:
            if (!this.walletService) {
              throw new Error('Solana wallet service not available');
            }
            _a.label = 1;
          case 1:
            _a.trys.push([1, 8, , 9]);
            // Validate addresses
            new web3_js_1.PublicKey(fromAddress);
            new web3_js_1.PublicKey(toAddress);
            return [4 /*yield*/, this.walletService.listWallets(this.runtime.agentId)];
          case 2:
            wallets = _a.sent();
            sourceWallet = wallets.find((w) => { return w.publicKey === fromAddress; });
            if (!sourceWallet) {
              throw new Error('Source wallet not found in custodial service');
            }
            signature = void 0;
            if (!(method === types_1.PaymentMethod.SOL)) {return [3 /*break*/, 4];}
            return [4 /*yield*/, this.walletService.executeTransaction({
              walletId: sourceWallet.id,
              toAddress,
              amountWei: amount, // In lamports
              initiatedBy: this.runtime.agentId,
              purpose: 'payment',
              trustLevel: 100, // High trust for payment service
            })];
          case 3:
            result = _a.sent();
            signature = result.txHash;
            return [3 /*break*/, 7];
          case 4:
            if (!(method === types_1.PaymentMethod.USDC_SOL)) {return [3 /*break*/, 6];}
            usdcMint = this.getUSDCMint();
            return [4 /*yield*/, this.walletService.executeTransaction({
              walletId: sourceWallet.id,
              toAddress,
              amountWei: amount,
              tokenAddress: usdcMint,
              initiatedBy: this.runtime.agentId,
              purpose: 'payment',
              trustLevel: 100,
            })];
          case 5:
            result = _a.sent();
            signature = result.txHash;
            return [3 /*break*/, 7];
          case 6: throw new Error('Unsupported payment method: '.concat(method));
          case 7:
            if (!signature) {
              throw new Error('Transaction failed - no signature returned');
            }
            return [2 /*return*/, {
              hash: signature,
              status: types_1.PaymentStatus.PROCESSING,
              confirmations: 0,
            }];
          case 8:
            error_2 = _a.sent();
            core_1.elizaLogger.error('[SolanaWalletAdapter] Error sending transaction', { error: error_2, method });
            throw error_2;
          case 9: return [2];
        }
      });
    });
  };
  SolanaWalletAdapter.prototype.getTransaction = function (hash) {
    return __awaiter(this, void 0, void 0, function () {
      let history_1, tx, status_1, error_3;
      return __generator(this, function (_a) {
        switch (_a.label) {
          case 0:
            if (!this.walletService) {
              return [2 /*return*/, {
                hash,
                status: types_1.PaymentStatus.PROCESSING,
                confirmations: 0,
              }];
            }
            _a.label = 1;
          case 1:
            _a.trys.push([1, 3, , 4]);
            return [4 /*yield*/, this.walletService.getTransactionHistory(this.runtime.agentId, 10)];
          case 2:
            history_1 = _a.sent();
            tx = history_1.find((t) => { return t.transactionHash === hash; });
            if (!tx) {
              return [2 /*return*/, {
                hash,
                status: types_1.PaymentStatus.PROCESSING,
                confirmations: 0,
              }];
            }
            switch (tx.status) {
              case 'completed':
                status_1 = types_1.PaymentStatus.COMPLETED;
                break;
              case 'failed':
                status_1 = types_1.PaymentStatus.FAILED;
                break;
              case 'submitted':
              case 'pending':
                status_1 = types_1.PaymentStatus.PROCESSING;
                break;
              default:
                status_1 = types_1.PaymentStatus.PROCESSING;
            }
            return [2 /*return*/, {
              hash,
              status: status_1,
              confirmations: tx.confirmations || 0,
              blockNumber: tx.blockNumber,
            }];
          case 3:
            error_3 = _a.sent();
            core_1.elizaLogger.error('[SolanaWalletAdapter] Error getting transaction', { error: error_3, hash });
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
  SolanaWalletAdapter.prototype.createWallet = function () {
    return __awaiter(this, void 0, void 0, function () {
      let keypair, entityId, wallet, error_4;
      return __generator(this, function (_a) {
        switch (_a.label) {
          case 0:
            if (!this.walletService) {
              keypair = Array.from({ length: 64 }, () => { return Math.floor(Math.random() * 256); });
              // This is a simplified version - real implementation would use proper keypair generation
              return [2 /*return*/, {
                address: new web3_js_1.PublicKey(keypair.slice(32)).toString(),
                privateKey: node_buffer_1.Buffer.from(keypair).toString('base64'),
              }];
            }
            _a.label = 1;
          case 1:
            _a.trys.push([1, 3, , 4]);
            entityId = 'payment-'.concat(Date.now());
            return [4 /*yield*/, this.walletService.createWallet(entityId, 'USER', this.runtime.agentId, {
              name: 'Payment Wallet',
              // purpose: 'payments',
            })];
          case 2:
            wallet = _a.sent();
            if (!wallet) {
              throw new Error('Failed to create wallet');
            }
            // Note: Private key is managed by custodial service
            return [2 /*return*/, {
              address: wallet.publicKey,
              privateKey: '', // Private key is managed securely by the service
            }];
          case 3:
            error_4 = _a.sent();
            core_1.elizaLogger.error('[SolanaWalletAdapter] Error creating wallet', { error: error_4 });
            throw error_4;
          case 4: return [2];
        }
      });
    });
  };
  SolanaWalletAdapter.prototype.validateAddress = function (address, method) {
    if (!this.supportedMethods.includes(method)) {
      return false;
    }
    try {
      new web3_js_1.PublicKey(address);
      return true;
    }
    catch (_a) {
      return false;
    }
  };
  // Helper methods
  SolanaWalletAdapter.prototype.getUSDCMint = function () {
    // USDC mint address on Solana mainnet
    const network = this.runtime.getSetting('SOLANA_NETWORK') || 'mainnet-beta';
    if (network === 'mainnet-beta') {
      return 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v';
    }
    else if (network === 'devnet') {
      // USDC Dev on devnet
      return '4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU';
    }
    // Default to mainnet USDC
    return 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v';
  };
  return SolanaWalletAdapter;
}());
exports.SolanaWalletAdapter = SolanaWalletAdapter;
