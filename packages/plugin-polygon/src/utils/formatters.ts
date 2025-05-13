/**
 * Utility functions for formatting values in the Polygon plugin
 */

/**
 * Formats a bigint value into a decimal string with the specified number of decimals
 * Similar to ethers.js formatUnits but without the dependency
 * 
 * @param value - The BigInt value to format
 * @param decimals - Number of decimal places (e.g., 18 for ETH/MATIC)
 * @returns Formatted string with appropriate decimal places
 */
export function formatUnits(value: bigint, decimals: number): string {
  if (decimals < 0) throw new Error('Decimals cannot be negative');
  
  // Handle zero value case
  if (value === BigInt(0)) return '0';
  
  // Convert to string and pad with leading zeros if needed
  let valueStr = value.toString();
  
  // Add leading zeros if the string is shorter than decimals
  while (valueStr.length <= decimals) {
    valueStr = '0' + valueStr;
  }
  
  // Insert decimal point
  const integerPart = valueStr.slice(0, valueStr.length - decimals) || '0';
  const fractionalPart = valueStr.slice(valueStr.length - decimals);
  
  // Remove trailing zeros after decimal point
  const trimmedFractionalPart = fractionalPart.replace(/0+$/, '');
  
  // If fractional part is empty after trimming, just return integer part
  if (trimmedFractionalPart === '') {
    return integerPart;
  }
  
  return `${integerPart}.${trimmedFractionalPart}`;
}

/**
 * Parses a string into a bigint with the specified number of decimals
 * Similar to ethers.js parseUnits but without the dependency
 * 
 * @param value - The string value to parse (e.g., "1.5")
 * @param decimals - Number of decimal places (e.g., 18 for ETH/MATIC)
 * @returns BigInt value with proper scaling
 */
export function parseUnits(value: string, decimals: number): bigint {
  if (decimals < 0) throw new Error('Decimals cannot be negative');
  
  // Handle empty, zero, or invalid values
  if (!value || value === '.' || value === '') return BigInt(0);
  
  // Remove thousand separators and other formatting
  value = value.replace(/,/g, '');
  
  // Split into integer and fractional parts
  const parts = value.split('.');
  if (parts.length > 2) {
    throw new Error(`Invalid decimal value: ${value}`);
  }
  
  let integerPart = parts[0] || '0';
  let fractionalPart = parts[1] || '';
  
  // Validate that all characters are numeric
  if (!/^-?\d+$/.test(integerPart)) {
    throw new Error(`Invalid integer part: ${integerPart}`);
  }
  
  if (fractionalPart && !/^\d+$/.test(fractionalPart)) {
    throw new Error(`Invalid fractional part: ${fractionalPart}`);
  }
  
  // Handle negative values
  const isNegative = integerPart.startsWith('-');
  if (isNegative) {
    integerPart = integerPart.substring(1);
  }
  
  // Trim leading zeros in integer part (except if it's just zero)
  integerPart = integerPart === '0' ? '0' : integerPart.replace(/^0+/, '');
  
  // Truncate or pad the fractional part to match decimals
  if (fractionalPart.length > decimals) {
    fractionalPart = fractionalPart.substring(0, decimals);
  } else {
    while (fractionalPart.length < decimals) {
      fractionalPart += '0';
    }
  }
  
  // Combine parts without decimal point
  const combined = integerPart + fractionalPart;
  
  // Remove leading zeros for BigInt parsing (except if the result is just zero)
  const normalized = combined.replace(/^0+/, '') || '0';
  
  // Apply negative sign if needed
  return isNegative ? -BigInt(normalized) : BigInt(normalized);
}

/**
 * Formats a token balance with symbol and proper units
 * 
 * @param balance - The BigInt token balance
 * @param decimals - Number of decimal places
 * @param symbol - Token symbol to append (e.g., "MATIC")
 * @returns Formatted balance string with symbol
 */
export function formatTokenBalance(balance: bigint, decimals: number, symbol: string): string {
  const formatted = formatUnits(balance, decimals);
  return `${formatted} ${symbol}`;
}

/**
 * Parse address string to normalized format with 0x prefix
 * 
 * @param address - Address string, with or without 0x prefix
 * @returns Normalized address with 0x prefix
 */
export function normalizeAddress(address: string): `0x${string}` {
  if (!address) throw new Error('Address cannot be empty');
  
  // Add 0x prefix if missing
  if (!address.startsWith('0x')) {
    return `0x${address}` as `0x${string}`;
  }
  
  return address as `0x${string}`;
}

/**
 * Format gas price to Gwei units
 * 
 * @param wei - Gas price in wei
 * @returns Formatted gas price in Gwei
 */
export function formatGasToGwei(wei: bigint): string {
  return formatUnits(wei, 9);
} 