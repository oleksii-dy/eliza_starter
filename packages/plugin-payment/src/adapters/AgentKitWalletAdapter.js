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
exports.AgentKitWalletAdapter = void 0;
const core_1 = require('@elizaos/core');
const viem_1 = require('viem');
const types_1 = require('../types');
/**
 * Wallet adapter for AgentKit CDP integration
 * Supports both direct AgentKit wallets and custodial wallets
 */
const AgentKitWalletAdapter = /** @class */ (function () {
  function AgentKitWalletAdapter(runtime) {
    this.name = 'agentkit';
    this.supportedMethods = [
      types_1.PaymentMethod.USDC_ETH,
      types_1.PaymentMethod.ETH,
      types_1.PaymentMethod.BASE,
    ];
    this.agentKitService = null;
    this.custodialService = null;
    this.runtime = runtime;
  }
  AgentKitWalletAdapter.prototype.initialize = function () {
    return __awaiter(this, void 0, void 0, function () {
      return __generator(this, function (_a) {
        try {
          // Get AgentKit service
          this.agentKitService = this.runtime.getService('agentkit');
          // Get custodial wallet service
          this.custodialService = this.runtime.getService('custodial-wallet');
          if (!this.agentKitService && !this.custodialService) {
            core_1.elizaLogger.warn('[AgentKitWalletAdapter] No AgentKit or custodial wallet service found');
          }
          else {
            core_1.elizaLogger.info('[AgentKitWalletAdapter] Initialized with services');
          }
        }
        catch (error) {
          core_1.elizaLogger.error('[AgentKitWalletAdapter] Failed to initialize', error);
          throw error;
        }
        return [2];
      });
    });
  };
  AgentKitWalletAdapter.prototype.getBalance = function (address, method) {
    return __awaiter(this, void 0, void 0, function () {
      var wallets, wallet, balance, error_1, agentKit, wallet, provider, balance, error_2;
      return __generator(this, function (_a) {
        switch (_a.label) {
          case 0:
            _a.trys.push([0, 9, , 10]);
            // Validate address
            if (!(0, viem_1.isAddress)(address)) {
              throw new Error('Invalid Ethereum address');
            }
            if (!this.custodialService) {return [3 /*break*/, 6];}
            _a.label = 1;
          case 1:
            _a.trys.push([1, 5, , 6]);
            return [4 /*yield*/, this.custodialService.listWallets(this.runtime.agentId)];
          case 2:
            wallets = _a.sent();
            wallet = wallets.find((w) => { return w.address === address; });
            if (!wallet) {return [3 /*break*/, 4];}
            return [4 /*yield*/, this.custodialService.getBalance(wallet.id)];
          case 3:
            balance = _a.sent();
            if (method === types_1.PaymentMethod.ETH || method === types_1.PaymentMethod.BASE) {
              // Balance is in ETH
              return [2 /*return*/, BigInt(Math.floor(balance * 1e18))];
            }
            else if (method === types_1.PaymentMethod.USDC_ETH) {
              // For USDC, we'd need to check token balance
              // This is a simplified version
              core_1.elizaLogger.warn('[AgentKitWalletAdapter] USDC balance check not fully implemented');
              return [2 /*return*/, BigInt(0)];
            }
            _a.label = 4;
          case 4: return [3 /*break*/, 6];
          case 5:
            error_1 = _a.sent();
            core_1.elizaLogger.error('[AgentKitWalletAdapter] Error getting custodial balance', error_1);
            return [3 /*break*/, 6];
          case 6:
            if (!(this.agentKitService && this.agentKitService.isReady())) {return [3 /*break*/, 8];}
            agentKit = this.agentKitService.getAgentKit();
            if (!agentKit) {return [3 /*break*/, 8];}
            wallet = agentKit.wallet;
            if (!(wallet && wallet.address === address)) {return [3 /*break*/, 8];}
            provider = agentKit.walletProvider;
            if (!(provider && typeof provider.getBalance === 'function')) {return [3 /*break*/, 8];}
            return [4 /*yield*/, provider.getBalance()];
          case 7:
            balance = _a.sent();
            return [2 /*return*/, BigInt(balance)];
          case 8: return [2 /*return*/, BigInt(0)];
          case 9:
            error_2 = _a.sent();
            core_1.elizaLogger.error('[AgentKitWalletAdapter] Error getting balance', { error: error_2, address, method });
            return [2 /*return*/, BigInt(0)];
          case 10: return [2];
        }
      });
    });
  };
  AgentKitWalletAdapter.prototype.sendTransaction = function (fromAddress, toAddress, amount, method, _privateKey) {
    return __awaiter(this, void 0, void 0, function () {
      var wallets, sourceWallet, result, agentKit, wallet, txHash, tx, usdcAddress, data, tx, error_3;
      return __generator(this, function (_a) {
        switch (_a.label) {
          case 0:
            _a.trys.push([0, 10, , 11]);
            // Validate addresses
            if (!(0, viem_1.isAddress)(fromAddress) || !(0, viem_1.isAddress)(toAddress)) {
              throw new Error('Invalid Ethereum address');
            }
            if (!this.custodialService) {return [3 /*break*/, 3];}
            return [4 /*yield*/, this.custodialService.listWallets(this.runtime.agentId)];
          case 1:
            wallets = _a.sent();
            sourceWallet = wallets.find((w) => { return w.address === fromAddress; });
            if (!sourceWallet) {return [3 /*break*/, 3];}
            return [4 /*yield*/, this.custodialService.executeTransaction({
              walletId: sourceWallet.id,
              toAddress,
              amountWei: amount,
              initiatedBy: this.runtime.agentId,
              purpose: 'payment',
              trustLevel: 100, // High trust for payment service
            })];
          case 2:
            result = _a.sent();
            return [2 /*return*/, {
              hash: result.txHash,
              status: types_1.PaymentStatus.PROCESSING,
              confirmations: 0,
            }];
          case 3:
            if (!(this.agentKitService && this.agentKitService.isReady())) {return [3 /*break*/, 9];}
            agentKit = this.agentKitService.getAgentKit();
            if (!agentKit) {return [3 /*break*/, 9];}
            wallet = agentKit.wallet;
            if (!(wallet && wallet.address === fromAddress)) {return [3 /*break*/, 9];}
            txHash = void 0;
            if (!(method === types_1.PaymentMethod.ETH || method === types_1.PaymentMethod.BASE)) {return [3 /*break*/, 5];}
            return [4 /*yield*/, wallet.sendTransaction({
              to: toAddress,
              value: amount.toString(),
            })];
          case 4:
            tx = _a.sent();
            txHash = tx.hash;
            return [3 /*break*/, 8];
          case 5:
            if (!(method === types_1.PaymentMethod.USDC_ETH)) {return [3 /*break*/, 7];}
            usdcAddress = this.getUSDCAddress(method);
            data = this.encodeERC20Transfer(toAddress, amount);
            return [4 /*yield*/, wallet.sendTransaction({
              to: usdcAddress,
              data,
              value: '0',
            })];
          case 6:
            tx = _a.sent();
            txHash = tx.hash;
            return [3 /*break*/, 8];
          case 7: throw new Error('Unsupported payment method: '.concat(method));
          case 8: return [2 /*return*/, {
            hash: txHash,
            status: types_1.PaymentStatus.PROCESSING,
            confirmations: 0,
          }];
          case 9: throw new Error('No suitable wallet service available for transaction');
          case 10:
            error_3 = _a.sent();
            core_1.elizaLogger.error('[AgentKitWalletAdapter] Error sending transaction', { error: error_3, method });
            throw error_3;
          case 11: return [2];
        }
      });
    });
  };
  AgentKitWalletAdapter.prototype.getTransaction = function (hash) {
    return __awaiter(this, void 0, void 0, function () {
      let history_1, tx, status_1, error_4, agentKit, provider, receipt, status_2, error_5;
      return __generator(this, function (_a) {
        switch (_a.label) {
          case 0:
            _a.trys.push([0, 7, , 8]);
            if (!this.custodialService) {return [3 /*break*/, 4];}
            _a.label = 1;
          case 1:
            _a.trys.push([1, 3, , 4]);
            return [4 /*yield*/, this.custodialService.getTransactionHistory(this.runtime.agentId, 10)];
          case 2:
            history_1 = _a.sent();
            tx = history_1.find((t) => { return t.transactionHash === hash; });
            if (tx) {
              switch (tx.status) {
                case 'completed':
                  status_1 = types_1.PaymentStatus.COMPLETED;
                  break;
                case 'failed':
                  status_1 = types_1.PaymentStatus.FAILED;
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
            }
            return [3 /*break*/, 4];
          case 3:
            error_4 = _a.sent();
            core_1.elizaLogger.error('[AgentKitWalletAdapter] Error getting custodial transaction', error_4);
            return [3 /*break*/, 4];
          case 4:
            if (!(this.agentKitService && this.agentKitService.isReady())) {return [3 /*break*/, 6];}
            agentKit = this.agentKitService.getAgentKit();
            if (!agentKit) {return [3 /*break*/, 6];}
            provider = agentKit.walletProvider;
            if (!(provider && typeof provider.getTransactionReceipt === 'function')) {return [3 /*break*/, 6];}
            return [4 /*yield*/, provider.getTransactionReceipt(hash)];
          case 5:
            receipt = _a.sent();
            if (receipt) {
              status_2 = receipt.status === 1 ? types_1.PaymentStatus.COMPLETED : types_1.PaymentStatus.FAILED;
              return [2 /*return*/, {
                hash,
                status: status_2,
                confirmations: receipt.confirmations || 0,
                blockNumber: receipt.blockNumber,
              }];
            }
            _a.label = 6;
          case 6: return [2 /*return*/, {
            hash,
            status: types_1.PaymentStatus.PROCESSING,
            confirmations: 0,
          }];
          case 7:
            error_5 = _a.sent();
            core_1.elizaLogger.error('[AgentKitWalletAdapter] Error getting transaction', { error: error_5, hash });
            return [2 /*return*/, {
              hash,
              status: types_1.PaymentStatus.PROCESSING,
              confirmations: 0,
            }];
          case 8: return [2];
        }
      });
    });
  };
  AgentKitWalletAdapter.prototype.createWallet = function () {
    return __awaiter(this, void 0, void 0, function () {
      var wallet, agentKit, wallet, error_6;
      return __generator(this, function (_a) {
        switch (_a.label) {
          case 0:
            _a.trys.push([0, 3, , 4]);
            if (!this.custodialService) {return [3 /*break*/, 2];}
            return [4 /*yield*/, this.custodialService.createWallet({
              name: 'Payment Wallet',
              type: 'user',
              owner: this.runtime.agentId,
              metadata: {
                purpose: 'payments',
                createdBy: 'payment-service',
              },
            })];
          case 1:
            wallet = _a.sent();
            return [2 /*return*/, {
              address: wallet.address,
              privateKey: '', // Private key is managed by custodial service
            }];
          case 2:
            // Try AgentKit service
            if (this.agentKitService && this.agentKitService.isReady()) {
              agentKit = this.agentKitService.getAgentKit();
              if (agentKit) {
                wallet = agentKit.wallet;
                if (wallet) {
                  return [2 /*return*/, {
                    address: wallet.address,
                    privateKey: '', // Private key is managed by AgentKit
                  }];
                }
              }
            }
            // Fallback to generating a random address
            core_1.elizaLogger.warn('[AgentKitWalletAdapter] No service available for wallet creation');
            return [2 /*return*/, {
              address: '0x'.concat(Array.from({ length: 40 }, () => {
                return Math.floor(Math.random() * 16).toString(16);
              }).join('')),
              privateKey: '0x'.concat(Array.from({ length: 64 }, () => {
                return Math.floor(Math.random() * 16).toString(16);
              }).join('')),
            }];
          case 3:
            error_6 = _a.sent();
            core_1.elizaLogger.error('[AgentKitWalletAdapter] Error creating wallet', { error: error_6 });
            throw error_6;
          case 4: return [2];
        }
      });
    });
  };
  AgentKitWalletAdapter.prototype.validateAddress = function (address, method) {
    if (!this.supportedMethods.includes(method)) {
      return false;
    }
    return (0, viem_1.isAddress)(address);
  };
  // Helper methods
  AgentKitWalletAdapter.prototype.getUSDCAddress = function (_method) {
    // USDC addresses on different networks
    const network = this.runtime.getSetting('CDP_NETWORK_ID') || 'base-sepolia';
    switch (network) {
      case 'base-mainnet':
        return '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913'; // USDC on Base
      case 'base-sepolia':
        return '0x036CbD53842c5426634e7929541eC2318f3dCF7e'; // USDC on Base Sepolia
      case 'ethereum-mainnet':
        return '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48'; // USDC on Ethereum
      default:
        return '0x036CbD53842c5426634e7929541eC2318f3dCF7e'; // Default to Base Sepolia
    }
  };
  AgentKitWalletAdapter.prototype.encodeERC20Transfer = function (to, amount) {
    // ERC20 transfer function signature: transfer(address,uint256)
    const functionSelector = '0xa9059cbb';
    // Pad address to 32 bytes
    const paddedAddress = to.slice(2).padStart(64, '0');
    // Convert amount to hex and pad to 32 bytes
    const paddedAmount = amount.toString(16).padStart(64, '0');
    return functionSelector + paddedAddress + paddedAmount;
  };
  return AgentKitWalletAdapter;
}());
exports.AgentKitWalletAdapter = AgentKitWalletAdapter;
