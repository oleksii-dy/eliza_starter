import type { Address, Hex, Chain, TransactionRequest as ViemTransactionRequest } from 'viem';
import type {
  WalletInstance,
  TransactionRequest,
  SmartWalletParams,
  DefiPosition,
  NFTHolding,
  GasEstimation,
  TransactionHistory,
} from '../interfaces/IWalletService';

// Additional types we'll define locally
export interface WalletAsset {
  address: Address;
  symbol: string;
  balance: string;
  decimals: number;
  quantity: number;
  assetAddress: Address;
}

export interface TokenBalance {
  token: {
    address: Address;
    symbol: string;
    decimals: number;
  };
  balance: bigint;
  formattedBalance: string;
  valueUsd?: number;
}

export interface TransactionReceipt {
  transactionHash: Hex;
  blockNumber: number;
  from: Address;
  to: Address | null;
  gasUsed: bigint;
  effectiveGasPrice: bigint;
  status: 'success' | 'failed';
}

export type TransactionStatus = 'pending' | 'confirmed' | 'failed';
import type { DeFiPosition } from '../../defi/defi-service';
import type {
  NFTMetadata,
  NFTCollection,
  NFTActivity,
  NFTListingParams,
} from '../../nft/nft-service';
import type { BridgeRoute, BridgeQuote, BridgeParams } from '../../bridges/bridge-aggregator';

// Branded types for extra safety
export type EVMAddress = Address & { readonly __brand: 'EVMAddress' };
export type TransactionHash = Hex & { readonly __brand: 'TransactionHash' };
export type ChainId = number & { readonly __brand: 'ChainId' };
export type TokenAmount = bigint & { readonly __brand: 'TokenAmount' };
export type GasPrice = bigint & { readonly __brand: 'GasPrice' };
export type Nonce = number & { readonly __brand: 'Nonce' };

// Type guard utilities
export function isAddress(value: unknown): value is Address {
  return typeof value === 'string' && /^0x[a-fA-F0-9]{40}$/.test(value);
}

export function isEVMAddress(value: unknown): value is EVMAddress {
  return isAddress(value);
}

export function asEVMAddress(value: string): EVMAddress {
  if (!isAddress(value)) {
    throw new Error(`Invalid EVM address: ${value}`);
  }
  return value as EVMAddress;
}

export function isHex(value: unknown): value is Hex {
  return typeof value === 'string' && /^0x[a-fA-F0-9]*$/.test(value);
}

export function isTransactionHash(value: unknown): value is TransactionHash {
  return typeof value === 'string' && /^0x[a-fA-F0-9]{64}$/.test(value);
}

export function asTransactionHash(value: string): TransactionHash {
  if (!isTransactionHash(value)) {
    throw new Error(`Invalid transaction hash: ${value}`);
  }
  return value as TransactionHash;
}

export function isChainId(value: unknown): value is ChainId {
  return typeof value === 'number' && value > 0 && Number.isInteger(value);
}

export function asChainId(value: number): ChainId {
  if (!isChainId(value)) {
    throw new Error(`Invalid chain ID: ${value}`);
  }
  return value as ChainId;
}

export function isBigInt(value: unknown): value is bigint {
  return typeof value === 'bigint';
}

export function isTokenAmount(value: unknown): value is TokenAmount {
  return isBigInt(value) && value >= 0n;
}

export function asTokenAmount(value: bigint | string | number): TokenAmount {
  const amount = typeof value === 'bigint' ? value : BigInt(value);
  if (amount < 0n) {
    throw new Error(`Token amount cannot be negative: ${amount}`);
  }
  return amount as TokenAmount;
}

// Complex type guards
export function isWalletInstance(value: unknown): value is WalletInstance {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const wallet = value as Record<string, unknown>;

  return (
    typeof wallet.id === 'string' &&
    isAddress(wallet.address) &&
    typeof wallet.type === 'string' &&
    typeof wallet.createdAt === 'number' &&
    typeof wallet.lastUsedAt === 'number' &&
    typeof wallet.isActive === 'boolean' &&
    typeof wallet.chain === 'number'
  );
}

export function isTransactionRequest(value: unknown): value is TransactionRequest {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const tx = value as Record<string, unknown>;

  return (
    isAddress(tx.to) &&
    (tx.from === undefined || isAddress(tx.from)) &&
    (tx.value === undefined || isBigInt(tx.value)) &&
    (tx.data === undefined || isHex(tx.data)) &&
    (tx.gasLimit === undefined || isBigInt(tx.gasLimit)) &&
    (tx.gasPrice === undefined || isBigInt(tx.gasPrice))
  );
}

export function isSmartWalletParams(value: unknown): value is SmartWalletParams {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const params = value as Record<string, unknown>;

  return (
    typeof params.type === 'string' &&
    (params.type === 'safe' || params.type === 'aa') &&
    typeof params.chain === 'number' &&
    (params.owners === undefined ||
      (Array.isArray(params.owners) && params.owners.every(isAddress))) &&
    (params.threshold === undefined ||
      (typeof params.threshold === 'number' && params.threshold > 0))
  );
}

export function isWalletAsset(value: unknown): value is WalletAsset {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const asset = value as Record<string, unknown>;

  return (
    isAddress(asset.address) &&
    typeof asset.symbol === 'string' &&
    typeof asset.balance === 'string' &&
    typeof asset.decimals === 'number' &&
    typeof asset.quantity === 'number' &&
    isAddress(asset.assetAddress)
  );
}

export function isTokenBalance(value: unknown): value is TokenBalance {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const balance = value as Record<string, unknown>;

  return (
    typeof balance.token === 'object' &&
    balance.token !== null &&
    isAddress((balance.token as any).address) &&
    isBigInt(balance.balance) &&
    typeof balance.formattedBalance === 'string'
  );
}

export function isTransactionReceipt(value: unknown): value is TransactionReceipt {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const receipt = value as Record<string, unknown>;

  return (
    isTransactionHash(receipt.transactionHash) &&
    typeof receipt.blockNumber === 'number' &&
    isAddress(receipt.from) &&
    (receipt.to === null || isAddress(receipt.to)) &&
    isBigInt(receipt.gasUsed) &&
    isBigInt(receipt.effectiveGasPrice) &&
    typeof receipt.status === 'string'
  );
}

export function isGasEstimation(value: unknown): value is GasEstimation {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const estimate = value as Record<string, unknown>;

  return (
    isBigInt(estimate.gasLimit) &&
    isBigInt(estimate.gasPrice) &&
    (estimate.maxFeePerGas === undefined || isBigInt(estimate.maxFeePerGas)) &&
    (estimate.maxPriorityFeePerGas === undefined || isBigInt(estimate.maxPriorityFeePerGas))
  );
}

export function isDeFiPosition(value: unknown): value is DeFiPosition {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const position = value as Record<string, unknown>;

  return (
    typeof position.protocol === 'string' &&
    typeof position.protocolId === 'string' &&
    typeof position.chainId === 'number' &&
    typeof position.type === 'string' &&
    Array.isArray(position.tokens) &&
    typeof position.totalValueUsd === 'number'
  );
}

export function isNFTHolding(value: unknown): value is NFTHolding {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const nft = value as Record<string, unknown>;

  return (
    isAddress(nft.contractAddress) &&
    typeof nft.tokenId === 'string' &&
    typeof nft.tokenType === 'string' &&
    (nft.tokenType === 'ERC721' || nft.tokenType === 'ERC1155') &&
    typeof nft.chainId === 'number' &&
    isAddress(nft.owner)
  );
}

export function isNFTMetadata(value: unknown): value is NFTMetadata {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const metadata = value as Record<string, unknown>;

  // NFT metadata is flexible, just check it's an object
  return true;
}

export function isNFTCollection(value: unknown): value is NFTCollection {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const collection = value as Record<string, unknown>;

  return (
    isAddress(collection.address) &&
    typeof collection.name === 'string' &&
    typeof collection.chainId === 'number'
  );
}

export function isBridgeRoute(value: unknown): value is BridgeRoute {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const route = value as Record<string, unknown>;

  return (
    typeof route.protocol === 'string' &&
    typeof route.fromChain === 'number' &&
    typeof route.toChain === 'number' &&
    isAddress(route.fromToken) &&
    isAddress(route.toToken) &&
    typeof route.estimatedTime === 'number' &&
    isBigInt(route.estimatedGas) &&
    isBigInt(route.estimatedFee)
  );
}

export function isBridgeQuote(value: unknown): value is BridgeQuote {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const quote = value as Record<string, unknown>;

  return (
    isBridgeRoute(quote.route) &&
    isBigInt(quote.amountOut) &&
    isBigInt(quote.bridgeFee) &&
    isBigInt(quote.gasFee) &&
    isBigInt(quote.totalFee) &&
    typeof quote.estimatedTime === 'number' &&
    typeof quote.priceImpact === 'number'
  );
}

// Validation helpers
export function validateAddress(address: string, name: string = 'address'): Address {
  if (!isAddress(address)) {
    throw new Error(`Invalid ${name}: ${address}`);
  }
  return address;
}

export function validateChainId(chainId: number, name: string = 'chainId'): ChainId {
  if (!isChainId(chainId)) {
    throw new Error(`Invalid ${name}: ${chainId}`);
  }
  return asChainId(chainId);
}

export function validateAmount(
  amount: bigint | string | number,
  name: string = 'amount',
): TokenAmount {
  try {
    return asTokenAmount(amount);
  } catch (error) {
    throw new Error(`Invalid ${name}: ${amount}`);
  }
}

// Array type guards
export function isAddressArray(value: unknown): value is Address[] {
  return Array.isArray(value) && value.every(isAddress);
}

export function isWalletInstanceArray(value: unknown): value is WalletInstance[] {
  return Array.isArray(value) && value.every(isWalletInstance);
}

export function isDeFiPositionArray(value: unknown): value is DeFiPosition[] {
  return Array.isArray(value) && value.every(isDeFiPosition);
}

export function isNFTHoldingArray(value: unknown): value is NFTHolding[] {
  return Array.isArray(value) && value.every(isNFTHolding);
}

// Runtime validation
export function assertAddress(value: unknown, name: string = 'value'): asserts value is Address {
  if (!isAddress(value)) {
    throw new Error(`${name} must be a valid address, got: ${value}`);
  }
}

export function assertTransactionHash(
  value: unknown,
  name: string = 'value',
): asserts value is TransactionHash {
  if (!isTransactionHash(value)) {
    throw new Error(`${name} must be a valid transaction hash, got: ${value}`);
  }
}

export function assertChainId(value: unknown, name: string = 'value'): asserts value is ChainId {
  if (!isChainId(value)) {
    throw new Error(`${name} must be a valid chain ID, got: ${value}`);
  }
}

export function assertBigInt(value: unknown, name: string = 'value'): asserts value is bigint {
  if (!isBigInt(value)) {
    throw new Error(`${name} must be a bigint, got: ${typeof value}`);
  }
}

// Safe parsing functions
export function parseAddressSafe(value: unknown): Address | null {
  return isAddress(value) ? value : null;
}

export function parseChainIdSafe(value: unknown): ChainId | null {
  return isChainId(value) ? asChainId(value) : null;
}

export function parseAmountSafe(value: unknown): TokenAmount | null {
  try {
    if (typeof value === 'string' || typeof value === 'number' || isBigInt(value)) {
      return asTokenAmount(value);
    }
  } catch {}
  return null;
}

// Narrowing helpers
export function isDefinedAddress(value: Address | undefined): value is Address {
  return value !== undefined;
}

export function isNotNull<T>(value: T | null): value is T {
  return value !== null;
}

export function isNotUndefined<T>(value: T | undefined): value is T {
  return value !== undefined;
}

export function isDefined<T>(value: T | null | undefined): value is T {
  return value !== null && value !== undefined;
}

// Export all types
export type {
  Address,
  Hex,
  Chain,
  WalletInstance,
  TransactionRequest,
  SmartWalletParams,
  GasEstimation,
  DefiPosition,
  NFTHolding,
  DeFiPosition,
  NFTMetadata,
  NFTCollection,
  NFTActivity,
  NFTListingParams,
  BridgeRoute,
  BridgeQuote,
  BridgeParams,
};
