import BigNumber from 'bignumber.js';
import { MAINNET_CHAINS, TESTNET_CHAINS } from '../types/index.js';

/**
 * Validates that an amount is a positive number or valid special value
 */
export function validateAmount(amount: string): boolean {
  try {
    // Check for special values
    if (amount === 'max' || amount === 'all') {
      return true;
    }

    // Check if it's a valid number
    const bn = new BigNumber(amount);
    return bn.isFinite() && bn.gte(0);
  } catch {
    return false;
  }
}

/**
 * Validates that a chain ID is supported
 */
export function validateChainId(chainId: number): boolean {
  const supportedChains = [
    ...Object.values(MAINNET_CHAINS),
    ...Object.values(TESTNET_CHAINS)
  ];
  
  return supportedChains.includes(chainId);
}

/**
 * Validates that a token address is a valid Ethereum address format
 */
export function validateTokenAddress(address: string): boolean {
  if (!address || typeof address !== 'string') {
    return false;
  }

  // Native token representations
  if (address === '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE' || 
      address === '0x0000000000000000000000000000000000000000') {
    return true;
  }

  // Standard ERC20 address format
  const addressRegex = /^0x[a-fA-F0-9]{40}$/;
  return addressRegex.test(address);
}

/**
 * Validates that slippage is within acceptable range
 */
export function validateSlippage(slippage: number): boolean {
  return slippage >= 0 && slippage <= 50; // 0% to 50%
}

/**
 * Validates that gas price is a valid positive number
 */
export function validateGasPrice(gasPrice: string): boolean {
  try {
    const bn = new BigNumber(gasPrice);
    return bn.isFinite() && bn.gt(0);
  } catch {
    return false;
  }
}

/**
 * Validates that deadline is in the future
 */
export function validateDeadline(deadline: number): boolean {
  return deadline > Date.now() / 1000; // deadline should be in seconds, future timestamp
}

/**
 * Validates user address format
 */
export function validateUserAddress(address: string): boolean {
  return validateTokenAddress(address); // Same validation as token address
}

/**
 * Validates that price impact is within acceptable range
 */
export function validatePriceImpact(priceImpact: string, maxAllowed: number = 15): boolean {
  try {
    const impact = parseFloat(priceImpact);
    return impact >= 0 && impact <= maxAllowed;
  } catch {
    return false;
  }
}

/**
 * Validates that a percentage value is valid
 */
export function validatePercentage(percentage: number): boolean {
  return percentage >= 0 && percentage <= 100;
}

/**
 * Validates that an amount in wei is valid for the given token decimals
 */
export function validateAmountWithDecimals(amount: string, decimals: number): boolean {
  try {
    const bn = new BigNumber(amount);
    
    // Must be a positive integer
    if (!bn.isFinite() || bn.lt(0) || !bn.isInteger()) {
      return false;
    }

    // Check if amount exceeds maximum possible value for the decimals
    const maxValue = new BigNumber(10).pow(decimals + 18); // Reasonable upper bound
    return bn.lte(maxValue);
  } catch {
    return false;
  }
}

/**
 * Validates swap quote request completeness
 */
export function validateSwapQuoteRequest(request: any): boolean {
  if (!request || typeof request !== 'object') {
    return false;
  }

  const required = ['fromToken', 'toToken', 'amount', 'chainId', 'userAddress'];
  
  for (const field of required) {
    if (!(field in request)) {
      return false;
    }
  }

  return validateTokenAddress(request.fromToken) &&
         validateTokenAddress(request.toToken) &&
         validateAmount(request.amount) &&
         validateChainId(request.chainId) &&
         validateUserAddress(request.userAddress) &&
         (request.slippage === undefined || validateSlippage(request.slippage));
}

/**
 * Validates swap execution request
 */
export function validateSwapExecuteRequest(request: any): boolean {
  if (!request || typeof request !== 'object') {
    return false;
  }

  if (!request.quote || !request.userAddress) {
    return false;
  }

  return validateUserAddress(request.userAddress) &&
         (request.slippage === undefined || validateSlippage(request.slippage)) &&
         (request.deadline === undefined || validateDeadline(request.deadline)) &&
         (request.recipient === undefined || validateUserAddress(request.recipient));
}

/**
 * Validates that a token symbol is reasonable
 */
export function validateTokenSymbol(symbol: string): boolean {
  if (!symbol || typeof symbol !== 'string') {
    return false;
  }

  // Token symbols are typically 2-10 characters, alphanumeric
  const symbolRegex = /^[A-Z0-9]{1,10}$/;
  return symbolRegex.test(symbol.toUpperCase());
}

/**
 * Validates that token decimals are reasonable
 */
export function validateTokenDecimals(decimals: number): boolean {
  return Number.isInteger(decimals) && decimals >= 0 && decimals <= 30;
}

/**
 * Validates that a transaction hash is valid format
 */
export function validateTransactionHash(hash: string): boolean {
  if (!hash || typeof hash !== 'string') {
    return false;
  }

  const hashRegex = /^0x[a-fA-F0-9]{64}$/;
  return hashRegex.test(hash);
}

/**
 * Sanitizes and validates user input for token symbol
 */
export function sanitizeTokenSymbol(symbol: string): string | null {
  if (!symbol || typeof symbol !== 'string') {
    return null;
  }

  const cleaned = symbol.trim().toUpperCase();
  return validateTokenSymbol(cleaned) ? cleaned : null;
}

/**
 * Sanitizes and validates user input for amount
 */
export function sanitizeAmount(amount: string): string | null {
  if (!amount || typeof amount !== 'string') {
    return null;
  }

  const cleaned = amount.trim().toLowerCase();
  
  // Handle special values
  if (cleaned === 'max' || cleaned === 'all') {
    return cleaned;
  }

  // Handle percentage values
  if (cleaned.endsWith('%')) {
    const percentValue = cleaned.slice(0, -1);
    if (validateAmount(percentValue)) {
      const percent = parseFloat(percentValue);
      if (percent >= 0 && percent <= 100) {
        return cleaned;
      }
    }
    return null;
  }

  // Handle numeric values
  return validateAmount(cleaned) ? cleaned : null;
}

/**
 * Validates that a chain name is recognized
 */
export function validateChainName(chainName: string): boolean {
  if (!chainName || typeof chainName !== 'string') {
    return false;
  }

  const knownChains = [
    'ethereum', 'eth', 'mainnet',
    'polygon', 'matic',
    'arbitrum', 'arb',
    'optimism', 'op',
    'base',
    'binance', 'bsc', 'bnb',
    'avalanche', 'avax',
    'fantom', 'ftm'
  ];

  return knownChains.includes(chainName.toLowerCase());
}