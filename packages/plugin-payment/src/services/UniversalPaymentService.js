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
exports.UniversalPaymentService = void 0;
const core_1 = require('@elizaos/core');
const types_1 = require('../types');
/**
 * Universal Payment Service - Minimal implementation
 * Provides basic wallet functionality through payment adapters
 */
const UniversalPaymentService = /** @class */ (function (_super) {
  __extends(UniversalPaymentService, _super);
  function UniversalPaymentService(runtime) {
    const _this = _super.call(this) || this;
    _this.serviceName = 'universal-payment';
    _this.serviceType = core_1.ServiceType.WALLET;
    _this.capabilityDescription = 'Universal payment service with multi-chain wallet support';
    _this.chainSupport = [
      'ethereum',
      'polygon',
      'arbitrum',
      'optimism',
      'base',
      'bsc',
      'avalanche',
      'solana',
    ];
    _this.capabilities = [
      'transfer',
      'getBalance',
      'getPortfolio',
    ];
    _this.defaultChain = 'ethereum';
    _this.runtime = runtime;
    // Get payment services after runtime is set
    _this.paymentService = _this.runtime.getService('payment') || undefined;
    _this.priceOracleService =
            _this.runtime.getService('priceOracle') || undefined;
    return _this;
  }
  // Core required methods
  UniversalPaymentService.prototype.transfer = function (params) {
    return __awaiter(this, void 0, void 0, function () {
      return __generator(this, function (_a) {
        core_1.logger.info('UniversalPaymentService.transfer called', params);
        return [2 /*return*/, {
          hash: '0x'.concat(Date.now().toString(16)),
          status: 'pending',
          chain: params.chain || this.defaultChain,
          timestamp: Date.now(),
        }];
      });
    });
  };
  UniversalPaymentService.prototype.sendTransaction = function (params) {
    return __awaiter(this, void 0, void 0, function () {
      return __generator(this, (_a) => {
        core_1.logger.info('UniversalPaymentService.sendTransaction called', params);
        return [2 /*return*/, {
          hash: '0x'.concat(Date.now().toString(16)),
          status: 'pending',
          chain: params.chain,
          timestamp: Date.now(),
        }];
      });
    });
  };
  UniversalPaymentService.prototype.getBalance = function (assetAddress, owner) {
    return __awaiter(this, void 0, void 0, function () {
      return __generator(this, function (_a) {
        core_1.logger.info('UniversalPaymentService.getBalance called', { assetAddress, owner });
        return [2 /*return*/, {
          address: assetAddress,
          symbol: 'ETH',
          name: 'Ethereum',
          decimals: 18,
          balance: '0',
          balanceFormatted: '0',
          chain: this.defaultChain,
          isNative: true,
        }];
      });
    });
  };
  UniversalPaymentService.prototype.getBalances = function (owner) {
    return __awaiter(this, void 0, void 0, function () {
      let balance;
      return __generator(this, function (_a) {
        core_1.logger.info('UniversalPaymentService.getBalances called', { owner });
        balance = {
          address: '0x0000000000000000000000000000000000000000',
          symbol: 'ETH',
          name: 'Ethereum',
          decimals: 18,
          balance: '0',
          balanceFormatted: '0',
          valueUsd: 0,
          priceUsd: 0,
          chain: this.defaultChain,
          isNative: true,
        };
        return [2 /*return*/, [balance]];
      });
    });
  };
  UniversalPaymentService.prototype.getPortfolio = function (owner) {
    return __awaiter(this, void 0, void 0, function () {
      return __generator(this, function (_a) {
        core_1.logger.info('UniversalPaymentService.getPortfolio called', { owner });
        return [2 /*return*/, {
          totalValueUsd: 0,
          chains: this.chainSupport,
          assets: [],
          breakdown: {
            tokens: 0,
            defi: 0,
            nfts: 0,
            staked: 0,
          },
          change24h: { amount: 0, percent: 0 },
        }];
      });
    });
  };
  UniversalPaymentService.prototype.simulateTransaction = function (params) {
    return __awaiter(this, void 0, void 0, function () {
      return __generator(this, (_a) => {
        core_1.logger.info('UniversalPaymentService.simulateTransaction called', params);
        return [2 /*return*/, {
          success: true,
          gasEstimate: '21000',
          error: null,
        }];
      });
    });
  };
  UniversalPaymentService.prototype.estimateGas = function (params) {
    return __awaiter(this, void 0, void 0, function () {
      return __generator(this, (_a) => {
        core_1.logger.info('UniversalPaymentService.estimateGas called', params);
        return [2 /*return*/, {
          gasLimit: '21000',
          gasPrice: '20000000000', // 20 gwei
          maxFeePerGas: '30000000000',
          maxPriorityFeePerGas: '1500000000',
          estimatedCost: '0.00063 ETH',
        }];
      });
    });
  };
  UniversalPaymentService.prototype.getTransaction = function (hash) {
    return __awaiter(this, void 0, void 0, function () {
      return __generator(this, (_a) => {
        core_1.logger.info('UniversalPaymentService.getTransaction called', { hash });
        return [2 /*return*/, {
          hash,
          status: 'confirmed',
          confirmations: 1,
          blockNumber: 1,
        }];
      });
    });
  };
  UniversalPaymentService.prototype.waitForTransaction = function (hash, confirmations) {
    return __awaiter(this, void 0, void 0, function () {
      return __generator(this, function (_a) {
        switch (_a.label) {
          case 0:
            core_1.logger.info('UniversalPaymentService.waitForTransaction called', { hash, confirmations });
            return [4 /*yield*/, this.getTransaction(hash)];
          case 1: return [2 /*return*/, _a.sent()];
        }
      });
    });
  };
  UniversalPaymentService.prototype.signMessage = function (message) {
    return __awaiter(this, void 0, void 0, function () {
      return __generator(this, (_a) => {
        core_1.logger.info('UniversalPaymentService.signMessage called', { message });
        return [2 /*return*/, '0xsigned_'.concat(Date.now())];
      });
    });
  };
  // X.402 Payment Protocol Support (stubs)
  UniversalPaymentService.prototype.createPaymentRequest = function (params) {
    return __awaiter(this, void 0, void 0, function () {
      let request;
      return __generator(this, (_a) => {
        core_1.logger.info('UniversalPaymentService.createPaymentRequest called', params);
        request = {
          id: 'payment-'.concat(Date.now()),
          amount: params.amount,
          currency: params.currency,
          network: params.network,
          recipient: params.recipient,
          memo: params.memo,
          expiresAt: params.expiresAt,
          createdAt: Date.now(),
          status: 'pending',
          paymentUrl: 'payment://'.concat(params.network, '/').concat(params.recipient),
        };
        return [2 /*return*/, request];
      });
    });
  };
  UniversalPaymentService.prototype.processPayment = function (request) {
    return __awaiter(this, void 0, void 0, function () {
      let paymentRequest, result, error_1;
      let _a;
      return __generator(this, function (_b) {
        switch (_b.label) {
          case 0:
            core_1.logger.info('UniversalPaymentService.processPayment called', request);
            if (!this.paymentService) {
              return [2 /*return*/, {
                success: false,
                paymentId: request.id,
                transactionHash: undefined,
                protocol: 'standard',
                amount: request.amount,
                currency: request.currency,
                network: request.network,
                fee: '0',
                confirmations: 0,
                error: 'Payment service not available',
              }];
            }
            _b.label = 1;
          case 1:
            _b.trys.push([1, 3, , 4]);
            paymentRequest = {
              id: request.id,
              userId: request.userId ||
                                '00000000-0000-0000-0000-'.concat(Date.now().toString().padStart(12, '0')),
              agentId: this.runtime.agentId,
              actionName: 'universal-payment',
              amount: BigInt(request.amount),
              method: this.getPaymentMethod(request.currency, request.network),
              recipientAddress: request.recipient,
              metadata: {
                memo: request.memo,
                originalRequest: request,
              },
            };
            return [4 /*yield*/, this.paymentService.processPayment(paymentRequest, this.runtime)];
          case 2:
            result = _b.sent();
            return [2 /*return*/, {
              success: result.status === types_1.PaymentStatus.COMPLETED,
              paymentId: request.id,
              transactionHash: result.transactionHash,
              protocol: 'standard',
              amount: request.amount,
              currency: request.currency,
              network: request.network,
              fee: ((_a = result.fee) === null || _a === void 0 ? void 0 : _a.toString()) || '0',
              confirmations: result.confirmations || 0,
              error: result.error,
            }];
          case 3:
            error_1 = _b.sent();
            core_1.logger.error('UniversalPaymentService.processPayment error', error_1);
            return [2 /*return*/, {
              success: false,
              paymentId: request.id,
              transactionHash: undefined,
              protocol: 'standard',
              amount: request.amount,
              currency: request.currency,
              network: request.network,
              fee: '0',
              confirmations: 0,
              error: error_1 instanceof Error ? error_1.message : 'Unknown error',
            }];
          case 4: return [2];
        }
      });
    });
  };
  UniversalPaymentService.prototype.getPaymentMethod = function (currency, network) {
    const mapping = {
      'USDC-ethereum': types_1.PaymentMethod.USDC_ETH,
      'USDC-solana': types_1.PaymentMethod.USDC_SOL,
      'ETH-ethereum': types_1.PaymentMethod.ETH,
      'SOL-solana': types_1.PaymentMethod.SOL,
      'MATIC-polygon': types_1.PaymentMethod.MATIC,
      'ETH-arbitrum': types_1.PaymentMethod.ARB,
      'ETH-optimism': types_1.PaymentMethod.OP,
      'ETH-base': types_1.PaymentMethod.BASE,
    };
    const key = ''.concat(currency, '-').concat(network);
    return mapping[key] || types_1.PaymentMethod.OTHER;
  };
  UniversalPaymentService.prototype.verifyPayment = function (paymentId) {
    return __awaiter(this, void 0, void 0, function () {
      let status_1, error_2;
      return __generator(this, function (_a) {
        switch (_a.label) {
          case 0:
            core_1.logger.info('UniversalPaymentService.verifyPayment called', { paymentId });
            if (!this.paymentService) {
              return [2 /*return*/, {
                valid: false,
                paymentId,
                amount: '0',
                currency: 'unknown',
                network: 'unknown',
                confirmations: 0,
                error: 'Payment service not available',
              }];
            }
            _a.label = 1;
          case 1:
            _a.trys.push([1, 3, , 4]);
            return [4 /*yield*/, this.paymentService.checkPaymentStatus(paymentId, this.runtime)];
          case 2:
            status_1 = _a.sent();
            // For now, return a basic verification
            // In production, this would query the actual transaction details
            return [2 /*return*/, {
              valid: status_1 === types_1.PaymentStatus.COMPLETED,
              paymentId,
              amount: '0', // Would need to query transaction details
              currency: 'USDC',
              network: 'ethereum',
              confirmations: status_1 === types_1.PaymentStatus.COMPLETED ? 12 : 0,
              error: status_1 === types_1.PaymentStatus.FAILED ? 'Payment failed' : undefined,
            }];
          case 3:
            error_2 = _a.sent();
            core_1.logger.error('UniversalPaymentService.verifyPayment error', error_2);
            return [2 /*return*/, {
              valid: false,
              paymentId,
              amount: '0',
              currency: 'unknown',
              network: 'unknown',
              confirmations: 0,
              error: error_2 instanceof Error ? error_2.message : 'Unknown error',
            }];
          case 4: return [2];
        }
      });
    });
  };
  UniversalPaymentService.prototype.swap = function (params) {
    return __awaiter(this, void 0, void 0, function () {
      return __generator(this, (_a) => {
        core_1.logger.info('UniversalPaymentService.swap called', params);
        throw new Error('Swap not implemented');
      });
    });
  };
  UniversalPaymentService.prototype.bridge = function (params) {
    return __awaiter(this, void 0, void 0, function () {
      return __generator(this, (_a) => {
        core_1.logger.info('UniversalPaymentService.bridge called', params);
        throw new Error('Bridge not implemented');
      });
    });
  };
  UniversalPaymentService.prototype.getSupportedChains = function () {
    return __awaiter(this, void 0, void 0, function () {
      return __generator(this, (_a) => {
        return [2 /*return*/, [
          {
            id: 'ethereum',
            name: 'Ethereum',
            nativeToken: { symbol: 'ETH', name: 'Ethereum', decimals: 18 },
            rpcUrls: ['https://eth.public-rpc.com'],
            blockExplorerUrls: ['https://etherscan.io'],
            isTestnet: false,
            bridgeSupport: [],
          },
        ]];
      });
    });
  };
  UniversalPaymentService.prototype.switchChain = function (chainId) {
    return __awaiter(this, void 0, void 0, function () {
      return __generator(this, function (_a) {
        core_1.logger.info('UniversalPaymentService.switchChain called', { chainId });
        if (this.chainSupport.includes(chainId)) {
          this.defaultChain = chainId;
        }
        else {
          throw new Error('Chain '.concat(chainId, ' not supported'));
        }
        return [2];
      });
    });
  };
  UniversalPaymentService.prototype.isChainSupported = function (chainId) {
    core_1.logger.info('UniversalPaymentService.isChainSupported called', { chainId });
    return this.chainSupport.includes(chainId);
  };
  // Service lifecycle
  UniversalPaymentService.start = function (runtime) {
    return __awaiter(this, void 0, void 0, function () {
      return __generator(this, (_a) => {
        core_1.logger.info('Starting UniversalPaymentService...');
        return [2 /*return*/, new UniversalPaymentService(runtime)];
      });
    });
  };
  UniversalPaymentService.prototype.stop = function () {
    return __awaiter(this, void 0, void 0, function () {
      return __generator(this, (_a) => {
        core_1.logger.info('Stopping UniversalPaymentService...');
        return [2];
      });
    });
  };
  UniversalPaymentService.serviceType = core_1.ServiceType.WALLET;
  UniversalPaymentService.serviceName = 'universal-payment';
  return UniversalPaymentService;
}(core_1.Service));
exports.UniversalPaymentService = UniversalPaymentService;
