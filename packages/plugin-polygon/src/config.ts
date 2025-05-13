/**
 * Configuration constants for the Polygon plugin
 * Contains network RPC URLs and other fixed configuration values
 */

// RPC URLs for Ethereum (L1) and Polygon (L2)
// Using Infura endpoints as defaults
export const DEFAULT_RPC_URLS = {
  ETHEREUM_RPC_URL: "https://mainnet.infura.io/v3/acc75dee85124d4db03ba3b3a9a9e3ab",
  POLYGON_RPC_URL: "https://polygon-mainnet.infura.io/v3/acc75dee85124d4db03ba3b3a9a9e3ab"
};

// Contract addresses
export const CONTRACT_ADDRESSES = {
  // Ethereum (L1) contracts
  STAKE_MANAGER_ADDRESS_L1: '0x5e3Ef299fDDf15eAa0432E6e66473ace8c13D908',
  ROOT_CHAIN_MANAGER_ADDRESS_L1: '0xA0c68C638235ee32657e8f720a23ceC1bFc77C77',
  
  // Add other contract addresses as needed
};

// Default cache expiry times (milliseconds)
export const CACHE_EXPIRY = {
  BLOCK_NUMBER: 12000, // 12 seconds
  BALANCE: 30000,      // 30 seconds
  TRANSACTION: 0,      // Never expires (immutable)
  BLOCK: 60000,        // 1 minute
  DEFAULT: 60000       // Default 1 minute
}; 