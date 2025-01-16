import { ChainMap, TokenType } from '@hyperlane-xyz/sdk';
import { Address } from '@hyperlane-xyz/utils';

// Token transfer options
export interface TokenTransferOptions {
  sourceChain: string;
  destinationChain: string;
  tokenAddress: string;
  recipientAddress: string;
  amount: string;
}

// Token configuration for each chain
export interface TokenConfig {
  type: TokenType;
  token: string;
  name: string;
  symbol: string;
  decimals: number;
}

// Chain-specific token deployment config
export interface ChainTokenConfig {
  chainId: number;
  domainId: number;
  tokenConfig: TokenConfig;
  // Token router addresses
  routerAddress: Address;
  mailboxAddress: Address;
  interchainGasPaymasterAddress: Address;
  validatorAddress: Address;
}

// Complete token configuration map
export interface TokenConfigMap extends ChainMap<ChainTokenConfig> {}

// Response from token transfer
export interface TransferResponse {
  transactionHash: string;
  transferId?: string;
  amount: string;
  token: string;
  sourceChain: string;
  destinationChain: string;
  recipient: string;
  explorerUrl?: string;
}

// Error response
export interface ErrorResponse {
  error: string;
  details?: unknown;
}

// Callback response
export interface CallbackResponse {
  text: string;
  content: TransferResponse | ErrorResponse;
}

// Required runtime settings
export interface RequiredSettings {
  ETHEREUM_TOKEN_ADDRESS: string;
  POLYGON_TOKEN_ADDRESS: string;
  ETHEREUM_ROUTER_ADDRESS: string;
  POLYGON_ROUTER_ADDRESS: string;
  ETHEREUM_RPC_URL: string;
  POLYGON_RPC_URL: string;
  HYPERLANE_PRIVATE_KEY: string;
}