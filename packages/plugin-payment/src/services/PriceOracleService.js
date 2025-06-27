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
exports.PriceOracleService = void 0;
const core_1 = require('@elizaos/core');
const types_1 = require('../types');
const schema_1 = require('../database/schema');
const drizzle_orm_1 = require('drizzle-orm');
/**
 * Price Oracle Service for the payment plugin
 * Aggregates prices from multiple sources and caches them
 */
const PriceOracleService = /** @class */ (function (_super) {
  __extends(PriceOracleService, _super);
  function PriceOracleService() {
    const _this = _super.call(this) || this;
    _this.serviceName = PriceOracleService.serviceName;
    _this.serviceType = PriceOracleService.serviceType;
    _this.capabilityDescription = 'Token price oracle for payment calculations';
    _this.cacheTimeout = 60000; // 1 minute
    return _this;
  }
  PriceOracleService.prototype.initialize = function (runtime) {
    return __awaiter(this, void 0, void 0, function () {
      let dbService;
      let _a;
      return __generator(this, function (_b) {
        this.runtime = runtime;
        dbService = runtime.getService('database');
        this.db = (_a = dbService === null || dbService === void 0 ? void 0 : dbService.getDatabase) === null || _a === void 0 ? void 0 : _a.call(dbService);
        // Get external price oracle services if available
        this.solanaOracleService = runtime.getService('price-oracle'); // From Solana plugin
        this.evmOracleService = runtime.getService('evm-price-oracle'); // From EVM plugin
        core_1.elizaLogger.info('[PriceOracleService] Initialized', {
          hasDb: !!this.db,
          hasSolanaOracle: !!this.solanaOracleService,
          hasEvmOracle: !!this.evmOracleService,
        });
        return [2];
      });
    });
  };
  /**
     * Get token price from various sources
     */
  PriceOracleService.prototype.getTokenPrice = function (address, network) {
    return __awaiter(this, void 0, void 0, function () {
      let cached, price, error_1, error_2;
      return __generator(this, function (_a) {
        switch (_a.label) {
          case 0:
            _a.trys.push([0, 12, , 13]);
            return [4 /*yield*/, this.getCachedPrice(address, network)];
          case 1:
            cached = _a.sent();
            if (cached) {
              return [2 /*return*/, cached];
            }
            price = null;
            _a.label = 2;
          case 2:
            _a.trys.push([2, 4, , 5]);
            return [4 /*yield*/, this.getRealTimePrice(address, network)];
          case 3:
            price = _a.sent();
            return [3 /*break*/, 5];
          case 4:
            error_1 = _a.sent();
            core_1.elizaLogger.warn('[PriceOracleService] Real-time price fetch failed, trying fallbacks', error_1);
            return [3 /*break*/, 5];
          case 5:
            if (!(!price && network === 'solana' && this.solanaOracleService)) {return [3 /*break*/, 7];}
            return [4 /*yield*/, this.getSolanaPriceFromOracle(address)];
          case 6:
            price = _a.sent();
            return [3 /*break*/, 9];
          case 7:
            if (!(!price &&
                            ['ethereum', 'polygon', 'arbitrum', 'optimism', 'base'].includes(network))) {return [3 /*break*/, 9];}
            return [4 /*yield*/, this.getEVMPriceFromOracle(address, network)];
          case 8:
            price = _a.sent();
            _a.label = 9;
          case 9:
            // Fallback to hardcoded prices for common tokens
            if (!price) {
              price = this.getHardcodedPrice(address, network);
            }
            if (!price) {return [3 /*break*/, 11];}
            return [4 /*yield*/, this.updatePriceCache(price)];
          case 10:
            _a.sent();
            _a.label = 11;
          case 11: return [2 /*return*/, price];
          case 12:
            error_2 = _a.sent();
            core_1.elizaLogger.error('[PriceOracleService] Error getting token price', { error: error_2, address, network });
            return [2 /*return*/, null];
          case 13: return [2];
        }
      });
    });
  };
  /**
     * Get token price by payment method
     */
  PriceOracleService.prototype.getTokenPriceByMethod = function (method) {
    return __awaiter(this, void 0, void 0, function () {
      let _a, address, network;
      return __generator(this, function (_b) {
        _a = this.getTokenInfoForMethod(method), address = _a.address, network = _a.network;
        return [2 /*return*/, this.getTokenPrice(address, network)];
      });
    });
  };
  /**
     * Convert token amount to USD
     */
  PriceOracleService.prototype.convertToUSD = function (amount, method) {
    return __awaiter(this, void 0, void 0, function () {
      let price, decimals, divisor, whole, fraction;
      return __generator(this, function (_a) {
        switch (_a.label) {
          case 0: return [4 /*yield*/, this.getTokenPriceByMethod(method)];
          case 1:
            price = _a.sent();
            if (!price) {
              core_1.elizaLogger.warn('[PriceOracleService] No price found for '.concat(method, ', using fallback'));
              return [2 /*return*/, this.getFallbackUSDValue(amount, method)];
            }
            decimals = this.getDecimalsForMethod(method);
            divisor = BigInt(Math.pow(10, decimals));
            whole = Number(amount / divisor);
            fraction = Number(amount % divisor) / Number(divisor);
            return [2 /*return*/, (whole + fraction) * price.priceUsd];
        }
      });
    });
  };
  /**
     * Get cached price from database
     */
  PriceOracleService.prototype.getCachedPrice = function (address, network) {
    return __awaiter(this, void 0, void 0, function () {
      let now, result, cached, error_3;
      return __generator(this, function (_a) {
        switch (_a.label) {
          case 0:
            if (!this.db) {
              return [2 /*return*/, null];
            }
            _a.label = 1;
          case 1:
            _a.trys.push([1, 3, , 4]);
            now = new Date();
            return [4 /*yield*/, this.db
              .select()
              .from(schema_1.priceCache)
              .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.priceCache.tokenAddress, address), (0, drizzle_orm_1.eq)(schema_1.priceCache.network, network), (0, drizzle_orm_1.gt)(schema_1.priceCache.expiresAt, now)))
              .limit(1)];
          case 2:
            result = _a.sent();
            if (result.length === 0) {
              return [2 /*return*/, null];
            }
            cached = result[0];
            return [2 /*return*/, {
              address: cached.tokenAddress,
              network: cached.network,
              symbol: cached.symbol,
              priceUsd: parseFloat(cached.priceUsd),
              priceChange24h: cached.priceChange24h ? parseFloat(cached.priceChange24h) : undefined,
              volume24h: cached.volume24h ? parseFloat(cached.volume24h) : undefined,
              marketCap: cached.marketCap ? parseFloat(cached.marketCap) : undefined,
              source: cached.source,
              timestamp: cached.createdAt,
            }];
          case 3:
            error_3 = _a.sent();
            core_1.elizaLogger.error('[PriceOracleService] Error getting cached price', error_3);
            return [2 /*return*/, null];
          case 4: return [2];
        }
      });
    });
  };
  /**
     * Update price cache in database
     */
  PriceOracleService.prototype.updatePriceCache = function (price) {
    return __awaiter(this, void 0, void 0, function () {
      let expiresAt, newPrice, error_4;
      let _a, _b, _c;
      return __generator(this, function (_d) {
        switch (_d.label) {
          case 0:
            if (!this.db) {
              return [2];
            }
            _d.label = 1;
          case 1:
            _d.trys.push([1, 3, , 4]);
            expiresAt = new Date(Date.now() + this.cacheTimeout);
            newPrice = {
              tokenAddress: price.address,
              network: price.network,
              symbol: price.symbol,
              priceUsd: price.priceUsd.toFixed(8),
              priceChange24h: (_a = price.priceChange24h) === null || _a === void 0 ? void 0 : _a.toFixed(2),
              volume24h: (_b = price.volume24h) === null || _b === void 0 ? void 0 : _b.toFixed(2),
              marketCap: (_c = price.marketCap) === null || _c === void 0 ? void 0 : _c.toFixed(2),
              source: price.source,
              expiresAt,
            };
            return [4 /*yield*/, this.db
              .insert(schema_1.priceCache)
              .values(newPrice)
              .onConflictDoUpdate({
                target: [schema_1.priceCache.tokenAddress, schema_1.priceCache.network],
                set: newPrice,
              })];
          case 2:
            _d.sent();
            return [3 /*break*/, 4];
          case 3:
            error_4 = _d.sent();
            core_1.elizaLogger.error('[PriceOracleService] Error updating price cache', error_4);
            return [3 /*break*/, 4];
          case 4: return [2];
        }
      });
    });
  };
  /**
     * Get price from Solana oracle service
     */
  PriceOracleService.prototype.getSolanaPriceFromOracle = function (address) {
    return __awaiter(this, void 0, void 0, function () {
      let solanaPrice, error_5;
      return __generator(this, function (_a) {
        switch (_a.label) {
          case 0:
            if (!this.solanaOracleService) {
              return [2 /*return*/, null];
            }
            _a.label = 1;
          case 1:
            _a.trys.push([1, 3, , 4]);
            return [4 /*yield*/, this.solanaOracleService.getTokenPrice(address)];
          case 2:
            solanaPrice = _a.sent();
            if (!solanaPrice) {
              return [2 /*return*/, null];
            }
            return [2 /*return*/, {
              address,
              network: 'solana',
              symbol: solanaPrice.symbol,
              priceUsd: solanaPrice.price,
              priceChange24h: solanaPrice.priceChange24h,
              volume24h: solanaPrice.volume24h,
              marketCap: solanaPrice.marketCap,
              source: 'solana-oracle',
              timestamp: new Date(),
            }];
          case 3:
            error_5 = _a.sent();
            core_1.elizaLogger.error('[PriceOracleService] Error getting Solana price', error_5);
            return [2 /*return*/, null];
          case 4: return [2];
        }
      });
    });
  };
  /**
     * Get price from EVM oracle service
     */
  PriceOracleService.prototype.getEVMPriceFromOracle = function (_address, _network) {
    return __awaiter(this, void 0, void 0, function () {
      return __generator(this, (_a) => {
        // If EVM plugin provides a price oracle, use it
        // For now, return null to use fallback
        return [2 /*return*/, null];
      });
    });
  };
  /**
     * Get hardcoded prices for common tokens
     */
  PriceOracleService.prototype.getHardcodedPrice = function (address, network) {
    const now = new Date();
    // Common token prices (fallback)
    const prices = {
      // Ethereum
      '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48': { symbol: 'USDC', price: 1.0 },
      '0xdAC17F958D2ee523a2206206994597C13D831ec7': { symbol: 'USDT', price: 1.0 },
      '0x6B175474E89094C44Da98b954EedeAC495271d0F': { symbol: 'DAI', price: 1.0 },
      // Solana
      EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v: { symbol: 'USDC', price: 1.0 },
      So11111111111111111111111111111111111111112: { symbol: 'SOL', price: 100.0 },
      // Base
      '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913': { symbol: 'USDC', price: 1.0 },
      // Native tokens
      'native-eth': { symbol: 'ETH', price: 2500.0 },
      'native-matic': { symbol: 'MATIC', price: 0.8 },
    };
    const key = address === 'native' ? 'native-'.concat(network) : address;
    const priceInfo = prices[key];
    if (!priceInfo) {
      return null;
    }
    return {
      address,
      network,
      symbol: priceInfo.symbol,
      priceUsd: priceInfo.price,
      source: 'hardcoded',
      timestamp: now,
    };
  };
  /**
     * Get token info for payment method
     */
  PriceOracleService.prototype.getTokenInfoForMethod = function (method) {
    let _a;
    const methodMap = (_a = {},
    _a[types_1.PaymentMethod.USDC_ETH] = {
      address: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
      network: 'ethereum',
    },
    _a[types_1.PaymentMethod.USDC_SOL] = {
      address: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
      network: 'solana',
    },
    _a[types_1.PaymentMethod.ETH] = { address: 'native', network: 'ethereum' },
    _a[types_1.PaymentMethod.SOL] = {
      address: 'So11111111111111111111111111111111111111112',
      network: 'solana',
    },
    _a[types_1.PaymentMethod.MATIC] = { address: 'native', network: 'polygon' },
    _a[types_1.PaymentMethod.ARB] = { address: 'native', network: 'arbitrum' },
    _a[types_1.PaymentMethod.OP] = { address: 'native', network: 'optimism' },
    _a[types_1.PaymentMethod.BASE] = { address: 'native', network: 'base' },
    _a[types_1.PaymentMethod.BTC] = { address: 'btc', network: 'bitcoin' },
    _a[types_1.PaymentMethod.OTHER] = { address: 'unknown', network: 'unknown' },
    _a);
    return methodMap[method] || { address: 'unknown', network: 'unknown' };
  };
  /**
     * Get decimals for payment method
     */
  PriceOracleService.prototype.getDecimalsForMethod = function (method) {
    let _a;
    const decimalsMap = (_a = {},
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
    return decimalsMap[method] || 18;
  };
  /**
     * Get fallback USD value using hardcoded prices
     */
  PriceOracleService.prototype.getFallbackUSDValue = function (amount, method) {
    let _a;
    const fallbackPrices = (_a = {},
    _a[types_1.PaymentMethod.USDC_ETH] = 1,
    _a[types_1.PaymentMethod.USDC_SOL] = 1,
    _a[types_1.PaymentMethod.ETH] = 2500,
    _a[types_1.PaymentMethod.SOL] = 100,
    _a[types_1.PaymentMethod.BTC] = 45000,
    _a[types_1.PaymentMethod.MATIC] = 0.8,
    _a[types_1.PaymentMethod.ARB] = 2500, // ETH on Arbitrum
    _a[types_1.PaymentMethod.OP] = 2500, // ETH on Optimism
    _a[types_1.PaymentMethod.BASE] = 2500, // ETH on Base
    _a[types_1.PaymentMethod.OTHER] = 1,
    _a);
    const price = fallbackPrices[method] || 1;
    const decimals = this.getDecimalsForMethod(method);
    const divisor = BigInt(Math.pow(10, decimals));
    const whole = Number(amount / divisor);
    const fraction = Number(amount % divisor) / Number(divisor);
    return (whole + fraction) * price;
  };
  /**
     * Get real-time price from CoinGecko API
     */
  PriceOracleService.prototype.getRealTimePrice = function (address, network) {
    return __awaiter(this, void 0, void 0, function () {
      let platformMap, platform, nativeTokenIds, apiUrl, coinId, response, data, priceData, symbol, infoResponse, infoData, _a, error_6;
      let _b;
      return __generator(this, function (_c) {
        switch (_c.label) {
          case 0:
            _c.trys.push([0, 9, , 10]);
            platformMap = {
              ethereum: 'ethereum',
              polygon: 'polygon-pos',
              arbitrum: 'arbitrum-one',
              optimism: 'optimistic-ethereum',
              base: 'base',
              solana: 'solana',
              bsc: 'binance-smart-chain',
            };
            platform = platformMap[network];
            if (!platform) {
              return [2 /*return*/, null];
            }
            nativeTokenIds = {
              'native-ethereum': 'ethereum',
              'native-polygon': 'matic-network',
              'native-arbitrum': 'ethereum', // ARB uses ETH
              'native-optimism': 'ethereum', // OP uses ETH
              'native-base': 'ethereum', // BASE uses ETH
              'native-solana': 'solana',
              'native-bsc': 'binancecoin',
            };
            apiUrl = void 0;
            coinId = null;
            if (address === 'native') {
              coinId = nativeTokenIds['native-'.concat(network)];
              if (!coinId) {
                return [2 /*return*/, null];
              }
              apiUrl = 'https://api.coingecko.com/api/v3/simple/price?ids='.concat(coinId, '&vs_currencies=usd&include_market_cap=true&include_24hr_vol=true&include_24hr_change=true');
            }
            else {
              // Token contract address
              apiUrl = 'https://api.coingecko.com/api/v3/simple/token_price/'.concat(platform, '?contract_addresses=').concat(address, '&vs_currencies=usd&include_market_cap=true&include_24hr_vol=true&include_24hr_change=true');
            }
            return [4 /*yield*/, fetch(apiUrl, {
              headers: __assign({ Accept: 'application/json' }, (this.runtime.getSetting('COINGECKO_API_KEY')
                ? {
                  'x-cg-pro-api-key': this.runtime.getSetting('COINGECKO_API_KEY'),
                }
                : {})),
            })];
          case 1:
            response = _c.sent();
            if (!response.ok) {
              throw new Error('CoinGecko API error: '.concat(response.status));
            }
            return [4 /*yield*/, response.json()];
          case 2:
            data = (_c.sent());
            priceData = void 0;
            if (coinId) {
              // Native token response format
              priceData = data[coinId];
            }
            else {
              // Token contract response format
              priceData = data[address.toLowerCase()];
            }
            if (!priceData) {
              return [2 /*return*/, null];
            }
            symbol = coinId ? coinId.toUpperCase() : 'UNKNOWN';
            if (!(!coinId && address !== 'native')) {return [3 /*break*/, 8];}
            _c.label = 3;
          case 3:
            _c.trys.push([3, 7, , 8]);
            return [4 /*yield*/, fetch('https://api.coingecko.com/api/v3/coins/'.concat(platform, '/contract/').concat(address), {
              headers: __assign({ Accept: 'application/json' }, (this.runtime.getSetting('COINGECKO_API_KEY')
                ? {
                  'x-cg-pro-api-key': this.runtime.getSetting('COINGECKO_API_KEY'),
                }
                : {})),
            })];
          case 4:
            infoResponse = _c.sent();
            if (!infoResponse.ok) {return [3 /*break*/, 6];}
            return [4 /*yield*/, infoResponse.json()];
          case 5:
            infoData = (_c.sent());
            symbol = ((_b = infoData.symbol) === null || _b === void 0 ? void 0 : _b.toUpperCase()) || symbol;
            _c.label = 6;
          case 6: return [3 /*break*/, 8];
          case 7:
            _a = _c.sent();
            return [3 /*break*/, 8];
          case 8: return [2 /*return*/, {
            address,
            network,
            symbol,
            priceUsd: priceData.usd || 0,
            priceChange24h: priceData.usd_24h_change || 0,
            volume24h: priceData.usd_24h_vol || 0,
            marketCap: priceData.usd_market_cap || 0,
            source: 'coingecko',
            timestamp: new Date(),
          }];
          case 9:
            error_6 = _c.sent();
            core_1.elizaLogger.error('[PriceOracleService] Error fetching real-time price', {
              error: error_6,
              address,
              network,
            });
            return [2 /*return*/, null];
          case 10: return [2];
        }
      });
    });
  };
  /**
     * Fetch prices from CoinGecko API
     */
  PriceOracleService.prototype.fetchCoinGeckoPrices = function () {
    return __awaiter(this, void 0, void 0, function () {
      let coinIds, url, response, data, now, error_7;
      let _a, _b, _c, _d, _e;
      return __generator(this, function (_f) {
        switch (_f.label) {
          case 0:
            if (!this.runtime.getSetting('COINGECKO_API_KEY')) {
              core_1.elizaLogger.warn('[PriceOracleService] No CoinGecko API key configured');
              return [2];
            }
            _f.label = 1;
          case 1:
            _f.trys.push([1, 15, , 16]);
            coinIds = [
              'ethereum',
              'matic-network',
              'bitcoin',
              'solana',
              'usd-coin',
              'arbitrum',
              'optimism',
            ];
            url = 'https://api.coingecko.com/api/v3/simple/price?ids='.concat(coinIds.join(','), '&vs_currencies=usd');
            return [4 /*yield*/, fetch(url, {
              headers: {
                'x-cg-demo-api-key': this.runtime.getSetting('COINGECKO_API_KEY'),
              },
            })];
          case 2:
            response = _f.sent();
            if (!response.ok) {
              throw new Error('CoinGecko API error: '.concat(response.status));
            }
            return [4 /*yield*/, response.json()];
          case 3:
            data = (_f.sent());
            now = new Date();
            if (!((_a = data.ethereum) === null || _a === void 0 ? void 0 : _a.usd)) {return [3 /*break*/, 5];}
            return [4 /*yield*/, this.updatePriceCache({
              address: 'native',
              network: 'ethereum',
              symbol: 'ETH',
              priceUsd: data.ethereum.usd,
              source: 'coingecko',
              timestamp: now,
            })];
          case 4:
            _f.sent();
            _f.label = 5;
          case 5:
            if (!((_b = data['matic-network']) === null || _b === void 0 ? void 0 : _b.usd)) {return [3 /*break*/, 7];}
            return [4 /*yield*/, this.updatePriceCache({
              address: 'native',
              network: 'polygon',
              symbol: 'MATIC',
              priceUsd: data['matic-network'].usd,
              source: 'coingecko',
              timestamp: now,
            })];
          case 6:
            _f.sent();
            _f.label = 7;
          case 7:
            if (!((_c = data.bitcoin) === null || _c === void 0 ? void 0 : _c.usd)) {return [3 /*break*/, 9];}
            return [4 /*yield*/, this.updatePriceCache({
              address: 'btc',
              network: 'bitcoin',
              symbol: 'BTC',
              priceUsd: data.bitcoin.usd,
              source: 'coingecko',
              timestamp: now,
            })];
          case 8:
            _f.sent();
            _f.label = 9;
          case 9:
            if (!((_d = data.solana) === null || _d === void 0 ? void 0 : _d.usd)) {return [3 /*break*/, 11];}
            return [4 /*yield*/, this.updatePriceCache({
              address: 'So11111111111111111111111111111111111111112',
              network: 'solana',
              symbol: 'SOL',
              priceUsd: data.solana.usd,
              source: 'coingecko',
              timestamp: now,
            })];
          case 10:
            _f.sent();
            _f.label = 11;
          case 11:
            if (!((_e = data['usd-coin']) === null || _e === void 0 ? void 0 : _e.usd)) {return [3 /*break*/, 14];}
            // Update USDC on Ethereum
            return [4 /*yield*/, this.updatePriceCache({
              address: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
              network: 'ethereum',
              symbol: 'USDC',
              priceUsd: data['usd-coin'].usd,
              source: 'coingecko',
              timestamp: now,
            })];
          case 12:
            // Update USDC on Ethereum
            _f.sent();
            // Update USDC on Solana
            return [4 /*yield*/, this.updatePriceCache({
              address: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
              network: 'solana',
              symbol: 'USDC',
              priceUsd: data['usd-coin'].usd,
              source: 'coingecko',
              timestamp: now,
            })];
          case 13:
            // Update USDC on Solana
            _f.sent();
            _f.label = 14;
          case 14:
            core_1.elizaLogger.info('[PriceOracleService] Updated prices from CoinGecko');
            return [3 /*break*/, 16];
          case 15:
            error_7 = _f.sent();
            core_1.elizaLogger.error('[PriceOracleService] Failed to fetch CoinGecko prices', error_7);
            return [3 /*break*/, 16];
          case 16: return [2];
        }
      });
    });
  };
  PriceOracleService.prototype.stop = function () {
    return __awaiter(this, void 0, void 0, function () {
      return __generator(this, (_a) => {
        core_1.elizaLogger.info('[PriceOracleService] Stopping price oracle service');
        return [2];
      });
    });
  };
  PriceOracleService.start = function (runtime) {
    return __awaiter(this, void 0, void 0, function () {
      let service;
      return __generator(this, (_a) => {
        switch (_a.label) {
          case 0:
            service = new PriceOracleService();
            return [4 /*yield*/, service.initialize(runtime)];
          case 1:
            _a.sent();
            return [2 /*return*/, service];
        }
      });
    });
  };
  PriceOracleService.serviceName = 'payment-price-oracle';
  PriceOracleService.serviceType = core_1.ServiceType.UNKNOWN;
  return PriceOracleService;
}(core_1.Service));
exports.PriceOracleService = PriceOracleService;
