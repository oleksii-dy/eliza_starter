import { isAddress } from 'viem';
import {
  type BridgeQuoteRequest,
  type BridgeExecuteParams,
  BridgeQuoteRequestSchema,
  BridgeExecuteParamsSchema,
  UnsupportedChainError,
  UnsupportedTokenError,
  BridgeError,
  MAINNET_CHAINS,
  MAX_SLIPPAGE,
} from '../types/index.js';

/**
 * Validate Ethereum address
 */
export function validateAddress(address: string): boolean {
  return isAddress(address);
}

/**
 * Validate chain ID is supported
 */
export function validateChainId(chainId: number): boolean {
  return Object.values(MAINNET_CHAINS).includes(chainId as 1 | 10 | 137 | 42161 | 8453 | 56 | 43114 | 250);
}

/**
 * Validate token address format
 */
export function validateTokenAddress(address: string): boolean {
  // Native token representations
  if (address === '0x0000000000000000000000000000000000000000' ||
      address.toLowerCase() === '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee') {
    return true;
  }
  
  return validateAddress(address);
}

/**
 * Validate amount string (must be positive integer in wei/smallest unit)
 */
export function validateAmount(amount: string): boolean {
  try {
    const value = BigInt(amount);
    return value > 0n;
  } catch {
    return false;
  }
}

/**
 * Validate slippage percentage (0-50%)
 */
export function validateSlippage(slippage: number): boolean {
  return slippage >= 0 && slippage <= MAX_SLIPPAGE;
}

/**
 * Validate bridge quote request
 */
export function validateBridgeQuoteRequest(request: any): BridgeQuoteRequest {
  try {
    const validated = BridgeQuoteRequestSchema.parse(request);
    
    // Additional validations
    if (!validateChainId(validated.fromChain)) {
      throw new UnsupportedChainError(validated.fromChain);
    }
    
    if (!validateChainId(validated.toChain)) {
      throw new UnsupportedChainError(validated.toChain);
    }
    
    if (validated.fromChain === validated.toChain) {
      throw new BridgeError('Source and destination chains cannot be the same', 'SAME_CHAIN');
    }
    
    if (!validateTokenAddress(validated.fromToken)) {
      throw new UnsupportedTokenError(validated.fromToken, validated.fromChain);
    }
    
    if (!validateTokenAddress(validated.toToken)) {
      throw new UnsupportedTokenError(validated.toToken, validated.toChain);
    }
    
    if (!validateAmount(validated.fromAmount)) {
      throw new BridgeError('Invalid amount', 'INVALID_AMOUNT');
    }
    
    if (validated.slippage && !validateSlippage(validated.slippage)) {
      throw new BridgeError(`Invalid slippage. Must be between 0 and ${MAX_SLIPPAGE}%`, 'INVALID_SLIPPAGE');
    }
    
    return validated;
  } catch (error) {
    if (error instanceof BridgeError) {
      throw error;
    }
    throw new BridgeError('Invalid bridge quote request', 'VALIDATION_ERROR', error);
  }
}

/**
 * Validate bridge execute parameters
 */
export function validateBridgeExecuteParams(params: any): BridgeExecuteParams {
  try {
    const validated = BridgeExecuteParamsSchema.parse(params);
    
    // Additional validations
    if (!validateAddress(validated.userAddress)) {
      throw new BridgeError('Invalid user address', 'INVALID_ADDRESS');
    }
    
    if (validated.recipient && !validateAddress(validated.recipient)) {
      throw new BridgeError('Invalid recipient address', 'INVALID_RECIPIENT');
    }
    
    if (validated.slippage && !validateSlippage(validated.slippage)) {
      throw new BridgeError(`Invalid slippage. Must be between 0 and ${MAX_SLIPPAGE}%`, 'INVALID_SLIPPAGE');
    }
    
    return validated;
  } catch (error) {
    if (error instanceof BridgeError) {
      throw error;
    }
    throw new BridgeError('Invalid bridge execute parameters', 'VALIDATION_ERROR', error);
  }
}

/**
 * Validate transaction hash format
 */
export function validateTxHash(hash: string): boolean {
  return /^0x[a-fA-F0-9]{64}$/.test(hash);
}

/**
 * Validate bridge route has required fields
 */
export function validateBridgeRoute(route: any): boolean {
  return (
    route &&
    typeof route.id === 'string' &&
    typeof route.protocol === 'string' &&
    route.fromChain &&
    route.toChain &&
    route.fromToken &&
    route.toToken &&
    typeof route.fromAmount === 'string' &&
    typeof route.toAmount === 'string' &&
    Array.isArray(route.steps)
  );
}

/**
 * Sanitize user input for parsing
 */
export function sanitizeInput(input: string): string {
  // Remove extra whitespace and normalize
  return input.trim().replace(/\s+/g, ' ').toLowerCase();
}

/**
 * Validate bridge protocol name
 */
export function validateProtocol(protocol: string): boolean {
  const supportedProtocols = [
    'lifi', 'wormhole', 'hop', 'synapse', 'across', 
    'cbridge', 'stargate', 'multichain'
  ];
  return supportedProtocols.includes(protocol.toLowerCase());
}

/**
 * Validate gas limit
 */
export function validateGasLimit(gasLimit: string): boolean {
  try {
    const gas = BigInt(gasLimit);
    return gas > 0n && gas <= BigInt(10000000); // Reasonable gas limit range
  } catch {
    return false;
  }
}

/**
 * Validate gas price
 */
export function validateGasPrice(gasPrice: string): boolean {
  try {
    const price = BigInt(gasPrice);
    return price > 0n && price <= BigInt(1000000000000); // Reasonable gas price range
  } catch {
    return false;
  }
}

/**
 * Check if amount exceeds reasonable limits
 */
export function validateReasonableAmount(amount: string, decimals: number): boolean {
  try {
    const value = BigInt(amount);
    const maxAmount = BigInt(10 ** (decimals + 9)); // Very large but reasonable limit
    return value <= maxAmount;
  } catch {
    return false;
  }
}

/**
 * Validate minimum amount requirements
 */
export function validateMinimumAmount(amount: string, minimumWei: string): boolean {
  try {
    const value = BigInt(amount);
    const minimum = BigInt(minimumWei);
    return value >= minimum;
  } catch {
    return false;
  }
}

/**
 * Comprehensive bridge request validation
 */
export function validateCompleteBridgeRequest(request: any): {
  isValid: boolean;
  errors: string[];
  warnings: string[];
} {
  const errors: string[] = [];
  const warnings: string[] = [];

  try {
    validateBridgeQuoteRequest(request);
  } catch (error) {
    if (error instanceof BridgeError) {
      errors.push(error.message);
    } else {
      errors.push('Unknown validation error');
    }
  }

  // Additional checks for warnings
  if (request.slippage && request.slippage > 5) {
    warnings.push('High slippage tolerance may result in significant price impact');
  }

  if (request.fromAmount) {
    try {
      const amount = BigInt(request.fromAmount);
      if (amount > BigInt(10 ** 30)) { // Very large amount
        warnings.push('Large transaction amount detected');
      }
    } catch {
      // Amount validation already handled above
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  };
}