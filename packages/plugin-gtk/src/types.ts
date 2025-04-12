import { z } from 'zod';
import { 
  TradeDirectionEnum, 
  CollateralTokenType, 
  TargetTokenType 
} from '@sifchain/gtk-api';
import {
  DEFAULT_COLLATERAL_TYPE,
  DEFAULT_TARGET_TOKEN,
  DEFAULT_LEVERAGE,
  DEFAULT_COLLATERAL_AMOUNT
} from './constants';



// Configuration schema
export const configSchema = z.object({
    API_KEY: z.string().min(1, 'API key is required'),
    MNEMONIC: z.string().min(1, 'Mnemonic is required'),
    NETWORK: z.enum(['mainnet', 'testnet']).default('mainnet'),
  });
  

// Define schema for place order parameters
export const PlaceOrderSchema = z.object({
  tokenType: z.string().default(DEFAULT_COLLATERAL_TYPE).describe('The type of collateral token to use'),
  tokenAmount: z.number().default(DEFAULT_COLLATERAL_AMOUNT).describe('The amount of collateral to use'),
  targetTokenType: z.string().default(DEFAULT_TARGET_TOKEN).describe('The target token type'),
  tradeDirection: z.enum(['LONG', 'SHORT']).default('LONG').describe('The direction of the trade'),
  leverage: z.number().default(DEFAULT_LEVERAGE).describe('The leverage to use'),
  stopLoss: z.number().optional().nullable().describe('Stop loss price level'),
  takeProfit: z.number().optional().nullable().describe('Take profit price level'),
  limitPrice: z.number().optional().nullable().describe('Limit price for the order')
});

export type PlaceOrderContent = z.infer<typeof PlaceOrderSchema>;

// Define schema for interest rate parameters
export const InterestRateSchema = z.object({
  targetTokenType: z.string().default(DEFAULT_TARGET_TOKEN).describe('The token type to get interest rate for')
});

export type InterestRateContent = z.infer<typeof InterestRateSchema>;

// Define schema for cancel order parameters
export const CancelOrderSchema = z.object({
  tradeId: z.number().describe('The ID of the trade/order to cancel')
});

export type CancelOrderContent = z.infer<typeof CancelOrderSchema>;

// Define schema for close order parameters
export const CloseOrderSchema = z.object({
  tradeId: z.number().describe('The ID of the trade/order to close')
});

export type CloseOrderContent = z.infer<typeof CloseOrderSchema>;

// Define schema for PnL parameters
export const PnlSchema = z.object({
  pnlType: z.enum(['OVERALL', 'REALIZED', 'UNREALIZED']).default('OVERALL').describe('The type of PnL to retrieve')
});

export type PnlContent = z.infer<typeof PnlSchema>;

// Define schema for top match parameters
export const TopMatchSchema = z.object({
  collateralType: z.string().default(DEFAULT_COLLATERAL_TYPE).describe('The type of collateral to match'),
  collateralAmount: z.number().default(10).describe('The amount of collateral to match')
});

export type TopMatchContent = z.infer<typeof TopMatchSchema>;

// Define schema for get trade parameters
export const GetTradeSchema = z.object({
  tradeId: z.number().describe('The ID of the trade to retrieve details for')
});

export type GetTradeContent = z.infer<typeof GetTradeSchema>;

// Define schema for get trades parameters
export const GetTradesSchema = z.object({
  tradeDirection: z.enum(['LONG', 'SHORT']).optional().describe('Filter by trade direction'),
  status: z.enum(['ACTIVE', 'COMPLETED', 'CANCELLED', 'LIQUIDATED']).optional().describe('Filter by trade status')
});

export type GetTradesContent = z.infer<typeof GetTradesSchema>;

// Valid token types
export const validTokenTypes = [
  "btc", "atom", "eth", "icp", "trx", "sol", "near", "link", "doge", 
  "avax", "matic", "fil", "sui", "wld", "apt", "xrp", "crv", "op", 
  "ada", "arb", "bch", "etc", "sei", "bnb"
] as const;

export type ValidTokenType = typeof validTokenTypes[number]; 