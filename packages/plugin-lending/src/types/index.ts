import { z } from 'zod';

// Lending Protocol Types
export enum LendingProtocol {
  AAVE = 'aave',
  COMPOUND = 'compound',
  MORPHO = 'morpho',
  SPARK = 'spark',
  EULER = 'euler'
}

// Lending Action Types
export enum LendingActionType {
  SUPPLY = 'supply',
  WITHDRAW = 'withdraw',
  BORROW = 'borrow',
  REPAY = 'repay',
  ENABLE_COLLATERAL = 'enable_collateral',
  DISABLE_COLLATERAL = 'disable_collateral'
}

// Interest Rate Modes
export enum InterestRateMode {
  NONE = 0,
  STABLE = 1,
  VARIABLE = 2
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
}

// Lending Market Data
export interface LendingMarket {
  protocol: LendingProtocol;
  chainId: number;
  asset: TokenInfo;
  aToken?: TokenInfo; // Interest bearing token (Aave)
  variableDebtToken?: TokenInfo;
  stableDebtToken?: TokenInfo;
  supplyAPY: string;
  variableBorrowAPY: string;
  stableBorrowAPY?: string;
  totalSupplied: string;
  totalBorrowed: string;
  utilizationRate: string;
  liquidationThreshold: string;
  liquidationBonus: string;
  reserveFactor: string;
  isActive: boolean;
  isFrozen: boolean;
  borrowingEnabled: boolean;
  stableBorrowRateEnabled: boolean;
  isCollateral: boolean;
}

// User Position Data
export interface UserPosition {
  protocol: LendingProtocol;
  chainId: number;
  userAddress: string;
  asset: TokenInfo;
  supplied: string;
  borrowed: string;
  borrowMode: InterestRateMode;
  usedAsCollateral: boolean;
  healthFactor: string;
  currentLTV: string;
  maxLTV: string;
  liquidationThreshold: string;
}

// Lending Configuration
export interface LendingConfig {
  supportedChains: ChainConfig[];
  supportedProtocols: LendingProtocol[];
  defaultSlippage: number;
  maxSlippage: number;
  healthFactorTarget: number;
  rpcUrls: { [chainId: number]: string };
  protocolAddresses: {
    [chainId: number]: {
      [protocol in LendingProtocol]?: {
        pool?: string;
        dataProvider?: string;
        oracle?: string;
        rewards?: string;
        wethGateway?: string;
      };
    };
  };
  [key: string]: any; // Make it compatible with Metadata
}

// Request/Response Schemas
export const LendingSupplyRequestSchema = z.object({
  protocol: z.nativeEnum(LendingProtocol),
  chainId: z.number().positive(),
  asset: z.string().regex(/^0x[a-fA-F0-9]{40}$/),
  amount: z.string(),
  userAddress: z.string().regex(/^0x[a-fA-F0-9]{40}$/),
  enableCollateral: z.boolean().optional().default(true),
  onBehalfOf: z.string().regex(/^0x[a-fA-F0-9]{40}$/).optional(),
});

export const LendingWithdrawRequestSchema = z.object({
  protocol: z.nativeEnum(LendingProtocol),
  chainId: z.number().positive(),
  asset: z.string().regex(/^0x[a-fA-F0-9]{40}$/),
  amount: z.string(), // Use 'max' for maximum withdrawal
  userAddress: z.string().regex(/^0x[a-fA-F0-9]{40}$/),
  to: z.string().regex(/^0x[a-fA-F0-9]{40}$/).optional(),
});

export const LendingBorrowRequestSchema = z.object({
  protocol: z.nativeEnum(LendingProtocol),
  chainId: z.number().positive(),
  asset: z.string().regex(/^0x[a-fA-F0-9]{40}$/),
  amount: z.string(),
  interestRateMode: z.nativeEnum(InterestRateMode),
  userAddress: z.string().regex(/^0x[a-fA-F0-9]{40}$/),
  onBehalfOf: z.string().regex(/^0x[a-fA-F0-9]{40}$/).optional(),
});

export const LendingRepayRequestSchema = z.object({
  protocol: z.nativeEnum(LendingProtocol),
  chainId: z.number().positive(),
  asset: z.string().regex(/^0x[a-fA-F0-9]{40}$/),
  amount: z.string(), // Use 'max' for full repayment
  interestRateMode: z.nativeEnum(InterestRateMode),
  userAddress: z.string().regex(/^0x[a-fA-F0-9]{40}$/),
  onBehalfOf: z.string().regex(/^0x[a-fA-F0-9]{40}$/).optional(),
});

export type LendingSupplyRequest = z.infer<typeof LendingSupplyRequestSchema>;
export type LendingWithdrawRequest = z.infer<typeof LendingWithdrawRequestSchema>;
export type LendingBorrowRequest = z.infer<typeof LendingBorrowRequestSchema>;
export type LendingRepayRequest = z.infer<typeof LendingRepayRequestSchema>;

// Transaction Results
export interface LendingTransactionResult {
  txHash: string;
  chainId: number;
  protocol: LendingProtocol;
  action: LendingActionType;
  asset: TokenInfo;
  amount: string;
  userAddress: string;
  success: boolean;
  gasUsed?: string;
  gasPrice?: string;
  blockNumber?: number;
  timestamp?: number;
}

// Error Classes
export class LendingError extends Error {
  constructor(
    message: string,
    public code: string,
    public details?: any
  ) {
    super(message);
    this.name = 'LendingError';
  }
}

export class InsufficientLiquidityError extends LendingError {
  constructor(requested: string, available: string) {
    super(
      `Insufficient liquidity: requested ${requested}, available ${available}`,
      'INSUFFICIENT_LIQUIDITY',
      { requested, available }
    );
  }
}

export class InsufficientCollateralError extends LendingError {
  constructor(healthFactor: string, minimumHealthFactor: string) {
    super(
      `Insufficient collateral: health factor ${healthFactor} below minimum ${minimumHealthFactor}`,
      'INSUFFICIENT_COLLATERAL',
      { healthFactor, minimumHealthFactor }
    );
  }
}

export class UnsupportedProtocolError extends LendingError {
  constructor(protocol: string, chainId: number) {
    super(
      `Protocol ${protocol} not supported on chain ${chainId}`,
      'UNSUPPORTED_PROTOCOL',
      { protocol, chainId }
    );
  }
}

export class MarketNotActiveError extends LendingError {
  constructor(asset: string, protocol: string) {
    super(
      `Market for ${asset} is not active on ${protocol}`,
      'MARKET_NOT_ACTIVE',
      { asset, protocol }
    );
  }
}

export class BorrowingDisabledError extends LendingError {
  constructor(asset: string, protocol: string) {
    super(
      `Borrowing disabled for ${asset} on ${protocol}`,
      'BORROWING_DISABLED',
      { asset, protocol }
    );
  }
}

// Protocol Constants
export const MAINNET_CHAINS = {
  ETHEREUM: 1,
  POLYGON: 137,
  ARBITRUM: 42161,
  OPTIMISM: 10,
  BASE: 8453,
  AVALANCHE: 43114,
} as const;

export const TESTNET_CHAINS = {
  ETHEREUM_SEPOLIA: 11155111,
  POLYGON_MUMBAI: 80001,
  ARBITRUM_SEPOLIA: 421614,
  OPTIMISM_SEPOLIA: 11155420,
  BASE_SEPOLIA: 84532,
} as const;

// Common token addresses
export const COMMON_TOKENS = {
  [MAINNET_CHAINS.ETHEREUM]: {
    ETH: '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE',
    WETH: '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2',
    USDC: '0xA0b86a33E6441436C3f91B584b2E06a24AB31F6b',
    USDT: '0xdAC17F958D2ee523a2206206994597C13D831ec7',
    DAI: '0x6B175474E89094C44Da98b954EedeAC495271d0F',
    WBTC: '0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599',
  },
  [MAINNET_CHAINS.POLYGON]: {
    MATIC: '0x0000000000000000000000000000000000001010',
    WMATIC: '0x0d500B1d8E8eF31E21C99d1Db9A6444d3ADf1270',
    USDC: '0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174',
    USDT: '0xc2132D05D31c914a87C6611C10748AEb04B58e8F',
    DAI: '0x8f3Cf7ad23Cd3CaDbD9735AFf958023239c6A063',
    WETH: '0x7ceB23fD6bC0adD59E62ac25578270cFf1b9f619',
  },
} as const;

// Default configurations
export const DEFAULT_HEALTH_FACTOR_TARGET = 2.0;
export const DEFAULT_SLIPPAGE = 0.5;
export const MAX_SLIPPAGE = 5.0;
export const MIN_HEALTH_FACTOR = 1.01;

// Type guards
export function isLendingSupplyRequest(obj: any): obj is LendingSupplyRequest {
  try {
    LendingSupplyRequestSchema.parse(obj);
    return true;
  } catch {
    return false;
  }
}

export function isLendingWithdrawRequest(obj: any): obj is LendingWithdrawRequest {
  try {
    LendingWithdrawRequestSchema.parse(obj);
    return true;
  } catch {
    return false;
  }
}

export function isLendingBorrowRequest(obj: any): obj is LendingBorrowRequest {
  try {
    LendingBorrowRequestSchema.parse(obj);
    return true;
  } catch {
    return false;
  }
}

export function isLendingRepayRequest(obj: any): obj is LendingRepayRequest {
  try {
    LendingRepayRequestSchema.parse(obj);
    return true;
  } catch {
    return false;
  }
}