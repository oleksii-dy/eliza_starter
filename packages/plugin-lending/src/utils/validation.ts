import { isAddress } from 'viem';
import BigNumber from 'bignumber.js';
import {
  LendingSupplyRequestSchema,
  LendingWithdrawRequestSchema,
  LendingBorrowRequestSchema,
  LendingRepayRequestSchema,
  type LendingSupplyRequest,
  type LendingWithdrawRequest,
  type LendingBorrowRequest,
  type LendingRepayRequest,
  LendingProtocol,
  InterestRateMode,
  MAINNET_CHAINS,
  LendingError,
  UnsupportedProtocolError,
  InsufficientCollateralError
} from '../types/index.js';

// Validate Ethereum address
export function validateAddress(address: string): boolean {
  return isAddress(address);
}

// Validate chain ID
export function validateChainId(chainId: number): boolean {
  return Object.values(MAINNET_CHAINS).includes(chainId);
}

// Validate token address (including native tokens)
export function validateTokenAddress(address: string): boolean {
  if (address === '0x0000000000000000000000000000000000000000' ||
      address.toLowerCase() === '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee') {
    return true; // Native token representations
  }
  return validateAddress(address);
}

// Validate amount (must be positive)
export function validateAmount(amount: string): boolean {
  if (amount === 'max' || amount === 'all') {
    return true;
  }
  
  try {
    const value = new BigNumber(amount);
    return value.isPositive() && value.isFinite();
  } catch {
    return false;
  }
}

// Validate lending protocol
export function validateProtocol(protocol: LendingProtocol): boolean {
  return Object.values(LendingProtocol).includes(protocol);
}

// Validate interest rate mode
export function validateInterestRateMode(mode: InterestRateMode): boolean {
  return Object.values(InterestRateMode).includes(mode);
}

// Validate health factor
export function validateHealthFactor(healthFactor: string, minimumHealthFactor: number = 1.0): boolean {
  try {
    const hf = parseFloat(healthFactor);
    return hf >= minimumHealthFactor;
  } catch {
    return false;
  }
}

// Validate supply request
export function validateLendingSupplyRequest(request: LendingSupplyRequest): LendingSupplyRequest {
  try {
    const validated = LendingSupplyRequestSchema.parse(request);
    
    if (!validateChainId(validated.chainId)) {
      throw new Error(`Unsupported chain ID: ${validated.chainId}`);
    }
    
    if (!validateTokenAddress(validated.asset)) {
      throw new Error(`Invalid token address: ${validated.asset}`);
    }
    
    if (!validateAmount(validated.amount)) {
      throw new Error(`Invalid amount: ${validated.amount}`);
    }
    
    return validated;
  } catch (error) {
    throw new LendingError(
      `Invalid supply request: ${error.message}`,
      'VALIDATION_ERROR',
      error
    );
  }
}

// Validate withdraw request
export function validateLendingWithdrawRequest(request: LendingWithdrawRequest): LendingWithdrawRequest {
  try {
    const validated = LendingWithdrawRequestSchema.parse(request);
    
    if (!validateChainId(validated.chainId)) {
      throw new Error(`Unsupported chain ID: ${validated.chainId}`);
    }
    
    if (!validateTokenAddress(validated.asset)) {
      throw new Error(`Invalid token address: ${validated.asset}`);
    }
    
    if (!validateAmount(validated.amount)) {
      throw new Error(`Invalid amount: ${validated.amount}`);
    }
    
    return validated;
  } catch (error) {
    throw new LendingError(
      `Invalid withdraw request: ${error.message}`,
      'VALIDATION_ERROR',
      error
    );
  }
}

// Validate borrow request
export function validateLendingBorrowRequest(request: LendingBorrowRequest): LendingBorrowRequest {
  try {
    const validated = LendingBorrowRequestSchema.parse(request);
    
    if (!validateChainId(validated.chainId)) {
      throw new Error(`Unsupported chain ID: ${validated.chainId}`);
    }
    
    if (!validateTokenAddress(validated.asset)) {
      throw new Error(`Invalid token address: ${validated.asset}`);
    }
    
    if (!validateAmount(validated.amount)) {
      throw new Error(`Invalid amount: ${validated.amount}`);
    }
    
    if (!validateInterestRateMode(validated.interestRateMode)) {
      throw new Error(`Invalid interest rate mode: ${validated.interestRateMode}`);
    }
    
    return validated;
  } catch (error) {
    throw new LendingError(
      `Invalid borrow request: ${error.message}`,
      'VALIDATION_ERROR',
      error
    );
  }
}

// Validate repay request
export function validateLendingRepayRequest(request: LendingRepayRequest): LendingRepayRequest {
  try {
    const validated = LendingRepayRequestSchema.parse(request);
    
    if (!validateChainId(validated.chainId)) {
      throw new Error(`Unsupported chain ID: ${validated.chainId}`);
    }
    
    if (!validateTokenAddress(validated.asset)) {
      throw new Error(`Invalid token address: ${validated.asset}`);
    }
    
    if (!validateAmount(validated.amount)) {
      throw new Error(`Invalid amount: ${validated.amount}`);
    }
    
    if (!validateInterestRateMode(validated.interestRateMode)) {
      throw new Error(`Invalid interest rate mode: ${validated.interestRateMode}`);
    }
    
    return validated;
  } catch (error) {
    throw new LendingError(
      `Invalid repay request: ${error.message}`,
      'VALIDATION_ERROR',
      error
    );
  }
}

// Validate protocol support on chain
export function validateProtocolChainSupport(protocol: LendingProtocol, chainId: number): void {
  // Define supported protocol-chain combinations
  const supportedCombinations: { [protocol in LendingProtocol]?: number[] } = {
    [LendingProtocol.AAVE]: [
      MAINNET_CHAINS.ETHEREUM,
      MAINNET_CHAINS.POLYGON,
      MAINNET_CHAINS.ARBITRUM,
      MAINNET_CHAINS.OPTIMISM,
      MAINNET_CHAINS.BASE
    ],
    [LendingProtocol.COMPOUND]: [
      MAINNET_CHAINS.ETHEREUM,
      MAINNET_CHAINS.POLYGON
    ],
    [LendingProtocol.MORPHO]: [
      MAINNET_CHAINS.ETHEREUM
    ],
    [LendingProtocol.SPARK]: [
      MAINNET_CHAINS.ETHEREUM
    ],
    [LendingProtocol.EULER]: [
      MAINNET_CHAINS.ETHEREUM
    ]
  };

  const supportedChains = supportedCombinations[protocol];
  if (!supportedChains || !supportedChains.includes(chainId)) {
    throw new UnsupportedProtocolError(protocol, chainId);
  }
}

// Validate transaction amount limits
export function validateAmountLimits(
  amount: string,
  decimals: number,
  minAmount?: string,
  maxAmount?: string
): void {
  if (amount === 'max' || amount === 'all') {
    return; // Skip validation for max amounts
  }

  const amountBN = new BigNumber(amount);
  
  if (minAmount) {
    const minAmountBN = new BigNumber(minAmount);
    if (amountBN.lt(minAmountBN)) {
      throw new LendingError(
        `Amount too small. Minimum: ${minAmount}`,
        'AMOUNT_TOO_SMALL',
        { amount, minAmount }
      );
    }
  }
  
  if (maxAmount) {
    const maxAmountBN = new BigNumber(maxAmount);
    if (amountBN.gt(maxAmountBN)) {
      throw new LendingError(
        `Amount too large. Maximum: ${maxAmount}`,
        'AMOUNT_TOO_LARGE',
        { amount, maxAmount }
      );
    }
  }

  // Check for reasonable maximum (prevent overflow)
  const maxReasonableAmount = new BigNumber(10).pow(decimals + 12); // 10^12 tokens max
  if (amountBN.gt(maxReasonableAmount)) {
    throw new LendingError(
      'Amount unreasonably large',
      'AMOUNT_UNREASONABLE',
      { amount }
    );
  }
}

// Validate health factor for operations
export function validateHealthFactorForOperation(
  currentHealthFactor: string,
  targetHealthFactor: string,
  operation: 'withdraw' | 'borrow'
): void {
  const current = parseFloat(currentHealthFactor);
  const target = parseFloat(targetHealthFactor);
  
  // Minimum health factor thresholds
  const minHealthFactor = 1.01; // Just above liquidation
  const safeHealthFactor = 1.5;  // Recommended minimum
  
  if (target < minHealthFactor) {
    throw new InsufficientCollateralError(
      targetHealthFactor,
      minHealthFactor.toString()
    );
  }
  
  if (target < safeHealthFactor && operation === 'borrow') {
    // Warning for risky borrow operations, but don't block
    console.warn(`Warning: Health factor ${target.toFixed(2)} is below safe threshold of ${safeHealthFactor}`);
  }
}

// Validate user input for reasonable values
export function validateUserInput(input: string): string {
  // Sanitize input
  const sanitized = input.trim().toLowerCase();
  
  // Check for common input patterns
  if (sanitized.length === 0) {
    throw new LendingError('Empty input provided', 'INVALID_INPUT');
  }
  
  if (sanitized.length > 1000) {
    throw new LendingError('Input too long', 'INVALID_INPUT');
  }
  
  // Remove potential script injection attempts
  const cleanInput = sanitized.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
  
  return cleanInput;
}

// Validate market conditions for operation
export function validateMarketConditions(
  isActive: boolean,
  isFrozen: boolean,
  borrowingEnabled: boolean,
  operation: 'supply' | 'withdraw' | 'borrow' | 'repay'
): void {
  if (!isActive) {
    throw new LendingError(
      'Market is not active',
      'MARKET_NOT_ACTIVE'
    );
  }
  
  if (isFrozen && (operation === 'supply' || operation === 'borrow')) {
    throw new LendingError(
      'Market is frozen - only withdrawals and repayments allowed',
      'MARKET_FROZEN'
    );
  }
  
  if (!borrowingEnabled && operation === 'borrow') {
    throw new LendingError(
      'Borrowing is disabled for this asset',
      'BORROWING_DISABLED'
    );
  }
}

// Comprehensive validation for lending operations
export function validateCompleteLendingOperation(
  request: LendingSupplyRequest | LendingWithdrawRequest | LendingBorrowRequest | LendingRepayRequest,
  operationType: 'supply' | 'withdraw' | 'borrow' | 'repay'
): any {
  const errors: string[] = [];
  const warnings: string[] = [];
  
  try {
    // Basic request validation
    switch (operationType) {
      case 'supply':
        validateLendingSupplyRequest(request as LendingSupplyRequest);
        break;
      case 'withdraw':
        validateLendingWithdrawRequest(request as LendingWithdrawRequest);
        break;
      case 'borrow':
        validateLendingBorrowRequest(request as LendingBorrowRequest);
        break;
      case 'repay':
        validateLendingRepayRequest(request as LendingRepayRequest);
        break;
    }
    
    // Protocol-chain validation
    validateProtocolChainSupport(request.protocol, request.chainId);
    
  } catch (error) {
    if (error instanceof LendingError) {
      errors.push(error.message);
    } else {
      errors.push('Validation error occurred');
    }
  }
  
  // Add warnings for specific conditions
  if (request.amount !== 'max' && request.amount !== 'all') {
    const amountBN = new BigNumber(request.amount);
    if (amountBN.lt(1000)) { // Very small amounts (in wei)
      warnings.push('Very small amount detected - ensure this is intended');
    }
  }
  
  return {
    isValid: errors.length === 0,
    errors,
    warnings
  };
}

// Helper function to parse and validate amount strings
export function parseAndValidateAmount(amountStr: string, decimals: number): string {
  if (amountStr === 'max' || amountStr === 'all') {
    return amountStr;
  }
  
  try {
    // Handle different input formats
    const cleanAmount = amountStr.replace(/[,_]/g, ''); // Remove separators
    const amount = parseFloat(cleanAmount);
    
    if (isNaN(amount) || amount <= 0) {
      throw new Error('Invalid amount format');
    }
    
    // Convert to wei/smallest unit
    const amountInSmallestUnit = new BigNumber(amount)
      .multipliedBy(new BigNumber(10).pow(decimals))
      .toFixed(0);
    
    return amountInSmallestUnit;
  } catch (error) {
    throw new LendingError(
      `Failed to parse amount "${amountStr}": ${error.message}`,
      'AMOUNT_PARSE_ERROR'
    );
  }
}

// Validate slippage tolerance
export function validateSlippage(slippage: number): boolean {
  return slippage >= 0 && slippage <= 50; // 0% to 50%
}

// Validate gas price
export function validateGasPrice(gasPrice: string): boolean {
  try {
    const price = BigInt(gasPrice);
    return price > 0n && price <= BigInt(1000000000000); // Max 1000 Gwei
  } catch {
    return false;
  }
}