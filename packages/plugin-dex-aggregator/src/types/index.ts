import { z } from 'zod';

// DEX Aggregator Types
export enum DEXProtocol {
  ONE_INCH = '1inch',
  JUPITER = 'jupiter',
  PARASWAP = 'paraswap',
  ZEROX = '0x',
  COWSWAP = 'cowswap',
  UNISWAP = 'uniswap',
  SUSHISWAP = 'sushiswap',
  KYBER = 'kyber',
  BALANCER = 'balancer'
}

// Swap Types
export enum SwapType {
  EXACT_INPUT = 'exactInput',
  EXACT_OUTPUT = 'exactOutput'
}

// Order Type
export enum OrderType {
  MARKET = 'market',
  LIMIT = 'limit',
  TWAP = 'twap'
}

// Chain Configuration
export interface ChainConfig {
  id: number;
  name: string;
  nativeCurrency: {
    name: string;
    symbol: string;
    decimals: number;
  };
  rpcUrls: string[];
  blockExplorerUrls: string[];
  dexAggregators: DEXProtocol[];
}

// Token Information
export interface TokenInfo {
  address: string;
  symbol: string;
  name: string;
  decimals: number;
  chainId: number;
  logoURI?: string;
  coingeckoId?: string;
  priceUSD?: number;
  tags?: string[];
  isVerified?: boolean;
}

// Swap Quote Request
export interface SwapQuoteRequest {
  fromToken: string;
  toToken: string;
  amount: string;
  chainId: number;
  userAddress: string;
  slippage?: number;
  protocols?: DEXProtocol[];
  swapType?: SwapType;
  maxHops?: number;
  gasPrice?: string;
  deadline?: number;
}

// DEX Route Information
export interface DEXRoute {
  protocol: DEXProtocol;
  name: string;
  percentage: number;
  fromTokenAmount: string;
  toTokenAmount: string;
  estimatedGas: string;
  pools: Array<{
    address: string;
    fee: number;
    tokens: TokenInfo[];
    reserves?: string[];
  }>;
}

// Swap Quote Response
export interface SwapQuote {
  fromToken: TokenInfo;
  toToken: TokenInfo;
  fromAmount: string;
  toAmount: string;
  estimatedGas: string;
  gasPrice: string;
  protocols: DEXRoute[];
  estimatedTime: number; // in seconds
  priceImpact: string; // percentage
  slippage: number;
  fees: {
    gas: string;
    protocol: string;
    total: string;
  };
  requestId: string;
  validUntil: number; // timestamp
  chainId: number;
}

// Swap Execution Request
export interface SwapExecuteRequest {
  quote: SwapQuote;
  userAddress: string;
  slippage?: number;
  deadline?: number;
  recipient?: string;
  referrer?: string;
  gasPrice?: string;
  gasLimit?: string;
}

// Swap Transaction Result
export interface SwapTransactionResult {
  txHash: string;
  chainId: number;
  success: boolean;
  fromToken: TokenInfo;
  toToken: TokenInfo;
  fromAmount: string;
  toAmount: string;
  actualToAmount?: string;
  gasUsed?: string;
  gasPrice: string;
  timestamp: number;
  blockNumber?: number;
  protocols: DEXRoute[];
}

// Price Information
export interface PriceInfo {
  token: TokenInfo;
  priceUSD: number;
  priceChange24h: number;
  volume24h: number;
  marketCap: number;
  source: string;
  lastUpdated: number;
}

// Token Balance
export interface TokenBalance {
  token: TokenInfo;
  balance: string;
  balanceUSD: number;
  allowance?: string;
}

// Portfolio Summary
export interface Portfolio {
  chainId: number;
  totalValueUSD: number;
  tokens: TokenBalance[];
  lastUpdated: number;
}

// Supported Chains
export const MAINNET_CHAINS = {
  ETHEREUM: 1,
  POLYGON: 137,
  ARBITRUM: 42161,
  OPTIMISM: 10,
  BASE: 8453,
  BSC: 56,
  AVALANCHE: 43114,
  FANTOM: 250
} as const;

export const TESTNET_CHAINS = {
  ETHEREUM_GOERLI: 5,
  ETHEREUM_SEPOLIA: 11155111,
  POLYGON_MUMBAI: 80001,
  ARBITRUM_GOERLI: 421613,
  OPTIMISM_GOERLI: 420,
  BASE_GOERLI: 84531
} as const;

// Common Tokens
export const COMMON_TOKENS: { [chainId: number]: { [symbol: string]: string } } = {
  [MAINNET_CHAINS.ETHEREUM]: {
    ETH: '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE',
    WETH: '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2',
    USDC: '0xA0b86a33E6441436C3f91B584b2E06a24AB31F6b',
    USDT: '0xdAC17F958D2ee523a2206206994597C13D831ec7',
    DAI: '0x6B175474E89094C44Da98b954EedeAC495271d0F',
    WBTC: '0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599',
    UNI: '0x1f9840a85d5aF5bf1D1762F925BDADdC4201F984',
    LINK: '0x514910771AF9Ca656af840dff83E8264EcF986CA'
  },
  [MAINNET_CHAINS.POLYGON]: {
    MATIC: '0x0000000000000000000000000000000000001010',
    WMATIC: '0x0d500B1d8E8eF31E21C99d1Db9A6444d3ADf1270',
    USDC: '0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174',
    USDT: '0xc2132D05D31c914a87C6611C10748AEb04B58e8F',
    DAI: '0x8f3Cf7ad23Cd3CaDbD9735AFf958023239c6A063',
    WETH: '0x7ceB23fD6bC0adD59E62ac25578270cFf1b9f619'
  },
  [MAINNET_CHAINS.ARBITRUM]: {
    ETH: '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE',
    WETH: '0x82aF49447D8a07e3bd95BD0d56f35241523fBab1',
    USDC: '0xFF970A61A04b1cA14834A43f5dE4533eBDDB5CC8',
    USDT: '0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9',
    DAI: '0xDA10009cBd5D07dd0CeCc66161FC93D7c9000da1'
  }
};

// Validation Schemas
export const SwapQuoteRequestSchema = z.object({
  fromToken: z.string().regex(/^0x[a-fA-F0-9]{40}$/),
  toToken: z.string().regex(/^0x[a-fA-F0-9]{40}$/),
  amount: z.string(),
  chainId: z.number().positive(),
  userAddress: z.string().regex(/^0x[a-fA-F0-9]{40}$/),
  slippage: z.number().min(0).max(50).optional(),
  protocols: z.array(z.nativeEnum(DEXProtocol)).optional(),
  swapType: z.nativeEnum(SwapType).optional(),
  maxHops: z.number().min(1).max(10).optional(),
  gasPrice: z.string().optional(),
  deadline: z.number().optional()
});

export const SwapExecuteRequestSchema = z.object({
  quote: z.any(), // Complex object validation
  userAddress: z.string().regex(/^0x[a-fA-F0-9]{40}$/),
  slippage: z.number().min(0).max(50).optional(),
  deadline: z.number().optional(),
  recipient: z.string().regex(/^0x[a-fA-F0-9]{40}$/).optional(),
  referrer: z.string().optional(),
  gasPrice: z.string().optional(),
  gasLimit: z.string().optional()
});

// Error Classes
export class DEXError extends Error {
  constructor(
    message: string,
    public code: string,
    public details?: any
  ) {
    super(message);
    this.name = 'DEXError';
  }
}

export class InsufficientBalanceError extends DEXError {
  constructor(required: string, available: string) {
    super(
      `Insufficient balance: required ${required}, available ${available}`,
      'INSUFFICIENT_BALANCE',
      { required, available }
    );
  }
}

export class UnsupportedChainError extends DEXError {
  constructor(chainId: number) {
    super(
      `Unsupported chain: ${chainId}`,
      'UNSUPPORTED_CHAIN',
      { chainId }
    );
  }
}

export class UnsupportedTokenError extends DEXError {
  constructor(token: string, chainId: number) {
    super(
      `Unsupported token: ${token} on chain ${chainId}`,
      'UNSUPPORTED_TOKEN',
      { token, chainId }
    );
  }
}

export class SlippageExceededError extends DEXError {
  constructor(expected: string, actual: string) {
    super(
      `Slippage exceeded: expected ${expected}, got ${actual}`,
      'SLIPPAGE_EXCEEDED',
      { expected, actual }
    );
  }
}

export class PriceImpactHighError extends DEXError {
  constructor(priceImpact: string, threshold: string) {
    super(
      `Price impact too high: ${priceImpact}% exceeds threshold of ${threshold}%`,
      'PRICE_IMPACT_HIGH',
      { priceImpact, threshold }
    );
  }
}

export class NoRouteFoundError extends DEXError {
  constructor(fromToken: string, toToken: string, chainId: number) {
    super(
      `No route found from ${fromToken} to ${toToken} on chain ${chainId}`,
      'NO_ROUTE_FOUND',
      { fromToken, toToken, chainId }
    );
  }
}

export class InsufficientLiquidityError extends DEXError {
  constructor(amount: string, token: string) {
    super(
      `Insufficient liquidity for ${amount} ${token}`,
      'INSUFFICIENT_LIQUIDITY',
      { amount, token }
    );
  }
}

// Constants
export const DEFAULT_SLIPPAGE = 0.5; // 0.5%
export const MAX_SLIPPAGE = 50; // 50%
export const DEFAULT_DEADLINE = 20 * 60; // 20 minutes
export const MAX_PRICE_IMPACT = 15; // 15%
export const DEFAULT_GAS_MULTIPLIER = 1.2;

// Supported DEX Protocols per Chain
export const CHAIN_DEX_SUPPORT: { [chainId: number]: DEXProtocol[] } = {
  [MAINNET_CHAINS.ETHEREUM]: [
    DEXProtocol.ONE_INCH,
    DEXProtocol.PARASWAP,
    DEXProtocol.ZEROX,
    DEXProtocol.COWSWAP,
    DEXProtocol.UNISWAP,
    DEXProtocol.SUSHISWAP,
    DEXProtocol.KYBER,
    DEXProtocol.BALANCER
  ],
  [MAINNET_CHAINS.POLYGON]: [
    DEXProtocol.ONE_INCH,
    DEXProtocol.PARASWAP,
    DEXProtocol.ZEROX,
    DEXProtocol.UNISWAP,
    DEXProtocol.SUSHISWAP,
    DEXProtocol.KYBER
  ],
  [MAINNET_CHAINS.ARBITRUM]: [
    DEXProtocol.ONE_INCH,
    DEXProtocol.PARASWAP,
    DEXProtocol.UNISWAP,
    DEXProtocol.SUSHISWAP,
    DEXProtocol.BALANCER
  ],
  [MAINNET_CHAINS.OPTIMISM]: [
    DEXProtocol.ONE_INCH,
    DEXProtocol.PARASWAP,
    DEXProtocol.UNISWAP,
    DEXProtocol.SUSHISWAP
  ],
  [MAINNET_CHAINS.BASE]: [
    DEXProtocol.ONE_INCH,
    DEXProtocol.UNISWAP,
    DEXProtocol.SUSHISWAP
  ]
};

// Type Guards
export function isSwapQuoteRequest(obj: any): obj is SwapQuoteRequest {
  try {
    SwapQuoteRequestSchema.parse(obj);
    return true;
  } catch {
    return false;
  }
}

export function isSwapExecuteRequest(obj: any): obj is SwapExecuteRequest {
  try {
    SwapExecuteRequestSchema.parse(obj);
    return true;
  } catch {
    return false;
  }
}

export function isTokenInfo(obj: any): obj is TokenInfo {
  return obj &&
    typeof obj.address === 'string' &&
    typeof obj.symbol === 'string' &&
    typeof obj.decimals === 'number' &&
    typeof obj.chainId === 'number';
}

export function isSwapQuote(obj: any): obj is SwapQuote {
  return obj &&
    isTokenInfo(obj.fromToken) &&
    isTokenInfo(obj.toToken) &&
    typeof obj.fromAmount === 'string' &&
    typeof obj.toAmount === 'string' &&
    Array.isArray(obj.protocols);
}