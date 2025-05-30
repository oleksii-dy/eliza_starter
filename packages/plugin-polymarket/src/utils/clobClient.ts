import { type IAgentRuntime, logger } from '@elizaos/core';
import { ClobClient } from '@polymarket/clob-client';
import { ethers } from 'ethers';

// Import types that we know are available
import type {
  MarketsResponse,
  Market,
  OrderBook,
  TokenPrice,
  MarketFilters,
  SimplifiedMarketsResponse,
  SimplifiedMarket,
  OrderArgs,
  SignedOrder,
  OrderResponse,
  OrderType,
} from '../types';
import { OrderSide } from '../types';

// Re-export the ClobClient type for other modules
export type { ClobClient } from '@polymarket/clob-client';

// Define the ApiKeyCreds interface to match the official client
export interface ApiKeyCreds {
  key: string;
  secret: string;
  passphrase: string;
}

/**
 * Initialize CLOB client with wallet-based authentication
 * @param runtime - The agent runtime containing configuration
 * @returns Configured CLOB client instance
 */
export async function initializeClobClient(runtime: IAgentRuntime): Promise<ClobClient> {
  const clobApiUrl = runtime.getSetting('CLOB_API_URL') || 'https://clob.polymarket.com';

  // Get private key from environment - prefer WALLET_PRIVATE_KEY, fallback to PRIVATE_KEY, then POLYMARKET_PRIVATE_KEY
  const privateKey =
    runtime.getSetting('WALLET_PRIVATE_KEY') ||
    runtime.getSetting('PRIVATE_KEY') ||
    runtime.getSetting('POLYMARKET_PRIVATE_KEY');

  if (!privateKey) {
    throw new Error(
      'No private key found. Please set WALLET_PRIVATE_KEY, PRIVATE_KEY, or POLYMARKET_PRIVATE_KEY in your environment'
    );
  }

  logger.info(`[initializeClobClient] Initializing CLOB client with URL: ${clobApiUrl}`);

  try {
    // Create ethers wallet
    const wallet = new ethers.Wallet(privateKey);

    // Add the _signTypedData method that ClobClient expects (maps to signTypedData)
    const enhancedWallet = {
      ...wallet,
      _signTypedData: async (domain: any, types: any, value: any) => {
        return await wallet.signTypedData(domain, types, value);
      },
      getAddress: async () => {
        return wallet.address;
      },
    };

    logger.info(`[initializeClobClient] Wallet address: ${wallet.address}`);
    logger.info(`[initializeClobClient] Chain ID: 137`);

    // Initialize ClobClient directly with EOA wallet - no API credentials needed
    const client = new ClobClient(
      clobApiUrl,
      137, // Polygon chain ID
      enhancedWallet as any
    );

    logger.info(
      `[initializeClobClient] CLOB client initialized successfully with direct EOA wallet`
    );
    return client;
  } catch (error) {
    logger.error(`[initializeClobClient] Failed to initialize CLOB client:`, error);
    throw new Error(
      `Failed to initialize CLOB client: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}

/**
 * Initialize CLOB client with API credentials for L2 authenticated operations
 * @param runtime - The agent runtime containing configuration
 * @returns Configured CLOB client instance with API credentials
 */
export async function initializeClobClientWithCreds(runtime: IAgentRuntime): Promise<ClobClient> {
  const clobApiUrl = runtime.getSetting('CLOB_API_URL') || 'https://clob.polymarket.com';

  // Get private key from environment
  const privateKey =
    runtime.getSetting('WALLET_PRIVATE_KEY') ||
    runtime.getSetting('PRIVATE_KEY') ||
    runtime.getSetting('POLYMARKET_PRIVATE_KEY');

  if (!privateKey) {
    throw new Error(
      'No private key found. Please set WALLET_PRIVATE_KEY, PRIVATE_KEY, or POLYMARKET_PRIVATE_KEY in your environment'
    );
  }

  // Get API credentials from runtime settings
  const apiKey = runtime.getSetting('CLOB_API_KEY');
  const apiSecret = runtime.getSetting('CLOB_API_SECRET') || runtime.getSetting('CLOB_SECRET');
  const apiPassphrase =
    runtime.getSetting('CLOB_API_PASSPHRASE') || runtime.getSetting('CLOB_PASS_PHRASE');

  logger.info(`[initializeClobClientWithCreds] Checking credentials:`, {
    hasApiKey: !!apiKey,
    hasApiSecret: !!apiSecret,
    hasApiPassphrase: !!apiPassphrase,
    apiKeyPreview: apiKey ? `${apiKey.substring(0, 8)}...` : 'missing',
    secretPreview: apiSecret ? `${apiSecret.substring(0, 8)}...` : 'missing',
    passphrasePreview: apiPassphrase ? `${apiPassphrase.substring(0, 8)}...` : 'missing',
  });

  if (!apiKey || !apiSecret || !apiPassphrase) {
    const missing = [];
    if (!apiKey) missing.push('CLOB_API_KEY');
    if (!apiSecret) missing.push('CLOB_API_SECRET or CLOB_SECRET');
    if (!apiPassphrase) missing.push('CLOB_API_PASSPHRASE or CLOB_PASS_PHRASE');

    throw new Error(
      `Missing required API credentials: ${missing.join(', ')}. Please set these environment variables first.`
    );
  }

  logger.info(`[initializeClobClientWithCreds] Initializing CLOB client with API credentials`);
  logger.info(`[initializeClobClientWithCreds] URL: ${clobApiUrl}`);
  logger.info(`[initializeClobClientWithCreds] API Key: ${apiKey.substring(0, 8)}...`);

  try {
    // Create ethers wallet
    const wallet = new ethers.Wallet(privateKey);

    // Add the _signTypedData method that ClobClient expects
    const enhancedWallet = {
      ...wallet,
      _signTypedData: async (domain: any, types: any, value: any) => {
        return await wallet.signTypedData(domain, types, value);
      },
      getAddress: async () => {
        return wallet.address;
      },
    };

    // Prepare API credentials in the format expected by ClobClient
    const creds: ApiKeyCreds = {
      key: apiKey,
      secret: apiSecret,
      passphrase: apiPassphrase,
    };

    logger.info(`[initializeClobClientWithCreds] Wallet address: ${wallet.address}`);
    logger.info(`[initializeClobClientWithCreds] Chain ID: 137`);

    // Initialize ClobClient with both wallet and API credentials
    const client = new ClobClient(
      clobApiUrl,
      137, // Polygon chain ID
      enhancedWallet as any,
      creds // API credentials for L2 authentication
    );

    logger.info(
      `[initializeClobClientWithCreds] CLOB client initialized successfully with API credentials`
    );
    return client;
  } catch (error) {
    logger.error(`[initializeClobClientWithCreds] Failed to initialize CLOB client:`, error);
    throw new Error(
      `Failed to initialize CLOB client with credentials: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}
