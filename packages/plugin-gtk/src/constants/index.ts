import { z } from 'zod';

// Service name constant 
export const GTK_SERVICE_NAME = 'gtk';

// Configuration schema
export const configSchema = z.object({
  API_KEY: z.string().min(1, 'API key is required'),
  MNEMONIC: z.string().min(1, 'Mnemonic is required'),
  NETWORK: z.enum(['mainnet', 'testnet']).default('mainnet'),
});

// Default values
export const DEFAULT_COLLATERAL_TYPE = 'uusdc';
export const DEFAULT_TARGET_TOKEN = 'btc';
export const DEFAULT_LEVERAGE = 2;
export const DEFAULT_COLLATERAL_AMOUNT = 0.01;
