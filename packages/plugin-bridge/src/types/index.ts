import { z } from 'zod';

// Bridge Protocol Types
export type BridgeProtocol = 'wormhole' | 'hop' | 'synapse' | 'across' | 'cbridge' | 'stargate' | 'multichain' | 'lifi';

// Chain configuration
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
  iconUrls?: string[];
}

// Token information
export interface TokenInfo {
  address: string;
  symbol: string;
  name: string;
  decimals: number;
  chainId: number;
  logoURI?: string;
  coingeckoId?: string;
}

// Bridge route information
export interface BridgeRoute {
  id: string;
  protocol: string;
  fromChain: ChainConfig;
  toChain: ChainConfig;
  fromToken: TokenInfo;
  toToken: TokenInfo;
  fromAmount: string;
  toAmount: string;
  estimatedGas: string;
  fees: {
    protocol: string;
    gas: string;
    total: string;
  };
  estimatedTime: number; // in seconds
  steps: BridgeStep[];
  tags?: string[];
}

// Individual bridge step
export interface BridgeStep {
  type: 'bridge' | 'swap' | 'wrap' | 'unwrap';
  protocol: string;
  fromChain: number;
  toChain: number;
  fromToken: TokenInfo;
  toToken: TokenInfo;
  fromAmount: string;
  toAmount: string;
  data?: any;
}

// Bridge quote request
export interface BridgeQuoteRequest {
  fromChain: number;
  toChain: number;
  fromToken: string;
  toToken: string;
  fromAmount: string;
  userAddress: string;
  slippage?: number;
  protocols?: string[];
}

// Bridge quote response
export interface BridgeQuote {
  routes: BridgeRoute[];
  fromChain: ChainConfig;
  toChain: ChainConfig;
  fromToken: TokenInfo;
  toToken: TokenInfo;
  fromAmount: string;
  userAddress: string;
  estimatedTime: number;
  requestId: string;
}

// Bridge execution parameters
export interface BridgeExecuteParams {
  route: BridgeRoute;
  userAddress: string;
  slippage?: number;
  recipient?: string;
  referrer?: string;
}

// Bridge transaction result
export interface BridgeTransactionResult {
  txHash: string;
  chainId: number;
  success: boolean;
  gasUsed?: string;
  blockNumber?: number;
  timestamp?: number;
  bridgeId?: string;
  route: BridgeRoute;
}

// Bridge status tracking
export interface BridgeStatus {
  txHash: string;
  fromChain: number;
  toChain: number;
  status: 'pending' | 'confirmed' | 'success' | 'failed' | 'refunded';
  fromTxHash?: string;
  toTxHash?: string;
  bridgeId?: string;
  estimatedCompletion?: number;
  steps: Array<{
    status: 'pending' | 'confirmed' | 'success' | 'failed';
    txHash?: string;
    timestamp?: number;
  }>;
}

// Bridge configuration
export interface BridgeConfig {
  supportedChains: ChainConfig[];
  supportedProtocols: string[];
  defaultSlippage: number;
  maxSlippage: number;
  rpcUrls: {
    [chainId: number]: string;
  };
  [key: string]: any; // Make it compatible with Metadata
}

// Validation schemas
export const BridgeQuoteRequestSchema = z.object({
  fromChain: z.number().positive(),
  toChain: z.number().positive(),
  fromToken: z.string(),
  toToken: z.string(),
  fromAmount: z.string(),
  userAddress: z.string().regex(/^0x[a-fA-F0-9]{40}$/),
  slippage: z.number().min(0).max(50).optional(),
  protocols: z.array(z.string()).optional(),
});

export const BridgeExecuteParamsSchema = z.object({
  route: z.object({
    id: z.string(),
    protocol: z.string(),
    fromChain: z.any(),
    toChain: z.any(),
    fromToken: z.any(),
    toToken: z.any(),
    fromAmount: z.string(),
    toAmount: z.string(),
    estimatedGas: z.string(),
    fees: z.any(),
    estimatedTime: z.number(),
    steps: z.array(z.any()),
    tags: z.array(z.string()).optional(),
  }),
  userAddress: z.string().regex(/^0x[a-fA-F0-9]{40}$/),
  slippage: z.number().min(0).max(50).optional(),
  recipient: z.string().regex(/^0x[a-fA-F0-9]{40}$/).optional(),
  referrer: z.string().optional(),
});

// Error types
export class BridgeError extends Error {
  constructor(
    message: string,
    public code: string,
    public details?: any
  ) {
    super(message);
    this.name = 'BridgeError';
  }
}

export class InsufficientBalanceError extends BridgeError {
  constructor(required: string, available: string) {
    super(
      `Insufficient balance: required ${required}, available ${available}`,
      'INSUFFICIENT_BALANCE',
      { required, available }
    );
  }
}

export class UnsupportedChainError extends BridgeError {
  constructor(chainId: number) {
    super(
      `Unsupported chain: ${chainId}`,
      'UNSUPPORTED_CHAIN',
      { chainId }
    );
  }
}

export class UnsupportedTokenError extends BridgeError {
  constructor(token: string, chainId: number) {
    super(
      `Unsupported token: ${token} on chain ${chainId}`,
      'UNSUPPORTED_TOKEN',
      { token, chainId }
    );
  }
}

export class BridgeNotFoundError extends BridgeError {
  constructor(fromChain: number, toChain: number) {
    super(
      `No bridge found from chain ${fromChain} to chain ${toChain}`,
      'BRIDGE_NOT_FOUND',
      { fromChain, toChain }
    );
  }
}

export class SlippageExceededError extends BridgeError {
  constructor(expected: string, actual: string) {
    super(
      `Slippage exceeded: expected ${expected}, got ${actual}`,
      'SLIPPAGE_EXCEEDED',
      { expected, actual }
    );
  }
}

// Utility type guards
export function isBridgeRoute(obj: any): obj is BridgeRoute {
  return obj && 
    typeof obj.id === 'string' &&
    typeof obj.protocol === 'string' &&
    obj.fromChain &&
    obj.toChain &&
    obj.fromToken &&
    obj.toToken &&
    typeof obj.fromAmount === 'string' &&
    typeof obj.toAmount === 'string';
}

export function isBridgeQuoteRequest(obj: any): obj is BridgeQuoteRequest {
  try {
    BridgeQuoteRequestSchema.parse(obj);
    return true;
  } catch {
    return false;
  }
}

export function isBridgeExecuteParams(obj: any): obj is BridgeExecuteParams {
  try {
    BridgeExecuteParamsSchema.parse(obj);
    return true;
  } catch {
    return false;
  }
}

// Constants
export const SUPPORTED_BRIDGE_PROTOCOLS: BridgeProtocol[] = [
  'wormhole',
  'hop',
  'synapse',
  'across',
  'cbridge',
  'stargate',
  'multichain',
  'lifi'
];

export const MAINNET_CHAINS = {
  ETHEREUM: 1,
  POLYGON: 137,
  ARBITRUM: 42161,
  OPTIMISM: 10,
  BASE: 8453,
  BSC: 56,
  AVALANCHE: 43114,
  FANTOM: 250,
} as const;

export const TESTNET_CHAINS = {
  ETHEREUM_GOERLI: 5,
  ETHEREUM_SEPOLIA: 11155111,
  POLYGON_MUMBAI: 80001,
  ARBITRUM_GOERLI: 421613,
  OPTIMISM_GOERLI: 420,
  BASE_GOERLI: 84531,
} as const;

export const DEFAULT_SLIPPAGE = 0.5; // 0.5%
export const MAX_SLIPPAGE = 50; // 50%
export const DEFAULT_GAS_MULTIPLIER = 1.2;