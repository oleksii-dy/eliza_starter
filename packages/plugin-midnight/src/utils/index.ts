import { logger } from '@elizaos/core';
import type { ZKProof, CircuitWitness } from '../types/index';

/**
 * Utility functions for Midnight Network operations
 */

/**
 * Format address for display (show first 8 and last 8 characters)
 */
export function formatAddress(address: string): string {
  if (address.length <= 16) {
    return address;
  }
  return `${address.slice(0, 8)}...${address.slice(-8)}`;
}

/**
 * Format balance for display (convert from micro-units to human readable)
 */
export function formatBalance(balance: bigint, decimals: number = 6): string {
  const divisor = BigInt(10 ** decimals);
  const whole = balance / divisor;
  const fraction = balance % divisor;

  if (fraction === BigInt(0)) {
    return whole.toString();
  }

  const fractionStr = fraction.toString().padStart(decimals, '0');
  const trimmedFraction = fractionStr.replace(/0+$/, '');

  return `${whole}.${trimmedFraction}`;
}

/**
 * Parse balance from string to micro-units
 */
export function parseBalance(balanceStr: string, decimals: number = 6): bigint {
  const parts = balanceStr.split('.');
  const whole = BigInt(parts[0] || 0);

  if (parts.length === 1) {
    return whole * BigInt(10 ** decimals);
  }

  const fractionStr = parts[1].padEnd(decimals, '0').slice(0, decimals);
  const fraction = BigInt(fractionStr);

  return whole * BigInt(10 ** decimals) + fraction;
}

/**
 * Validate Midnight Network address format
 */
export function isValidAddress(address: string): boolean {
  // Basic validation for hex address
  return /^0x[a-fA-F0-9]{40}$/.test(address);
}

/**
 * Validate ZK proof structure
 */
export function isValidZKProof(proof: ZKProof): boolean {
  return !!(
    proof.proof &&
    proof.circuitId &&
    proof.verificationKey &&
    Array.isArray((proof as any).publicInputs)
  );
}

/**
 * Generate deterministic ID from components
 */
export function generateId(prefix: string, ...components: string[]): string {
  const combined = components.join('_');
  const hash = simpleHash(combined);
  return `${prefix}_${hash}`;
}

/**
 * Simple hash function for generating IDs
 */
function simpleHash(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return Math.abs(hash).toString(16);
}

/**
 * Retry function with exponential backoff
 */
export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  baseDelay: number = 1000
): Promise<T> {
  let lastError: Error | undefined;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));

      if (attempt === maxRetries) {
        break;
      }

      const delay = baseDelay * Math.pow(2, attempt);
      logger.warn(`Attempt ${attempt + 1} failed, retrying in ${delay}ms:`, lastError.message);
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }

  throw new Error(lastError?.message || 'Operation failed after retries');
}

/**
 * Validate witness data for ZK proof generation
 */
export function validateWitness(witness: CircuitWitness, requiredFields: string[]): boolean {
  return requiredFields.every((field) => Object.prototype.hasOwnProperty.call(witness, field));
}

/**
 * Safe JSON stringify that handles BigInt
 */
export function safeStringify(obj: any): string {
  return JSON.stringify(obj, (key, value) => {
    if (typeof value === 'bigint') {
      return value.toString();
    }
    return value;
  });
}

/**
 * Safe JSON parse that reconstructs BigInt
 */
export function safeParse(str: string, bigIntFields: string[] = []): any {
  const obj = JSON.parse(str);

  for (const field of bigIntFields) {
    if (obj[field] && typeof obj[field] === 'string') {
      obj[field] = BigInt(obj[field]);
    }
  }

  return obj;
}

/**
 * Calculate time ago string
 */
export function timeAgo(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSeconds = Math.floor(diffMs / 1000);
  const diffMinutes = Math.floor(diffSeconds / 60);
  const diffHours = Math.floor(diffMinutes / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffSeconds < 60) {
    return `${diffSeconds}s ago`;
  } else if (diffMinutes < 60) {
    return `${diffMinutes}m ago`;
  } else if (diffHours < 24) {
    return `${diffHours}h ago`;
  } else {
    return `${diffDays}d ago`;
  }
}

/**
 * Truncate text with ellipsis
 */
export function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) {
    return text;
  }
  return `${text.slice(0, maxLength - 3)}...`;
}

/**
 * Validate environment configuration
 */
export function validateMidnightConfig(): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  const requiredVars = [
    'MIDNIGHT_NETWORK_URL',
    'MIDNIGHT_INDEXER_URL',
    'MIDNIGHT_WALLET_MNEMONIC',
    'MIDNIGHT_PROOF_SERVER_URL',
  ];

  for (const varName of requiredVars) {
    if (!process.env[varName]) {
      errors.push(`Missing required environment variable: ${varName}`);
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Generate random hex string
 */
export function randomHex(length: number): string {
  const chars = '0123456789abcdef';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars[Math.floor(Math.random() * chars.length)];
  }
  return result;
}

/**
 * Create mock contract address
 */
export function createMockAddress(): string {
  return `0x${randomHex(40)}`;
}

/**
 * Create mock transaction hash
 */
export function createMockTxHash(): string {
  return `0x${randomHex(64)}`;
}

/**
 * Debounce function
 */
export function debounce<T extends(...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout;

  return (...args: Parameters<T>) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func.apply(null, args), wait);
  };
}

/**
 * Throttle function
 */
export function throttle<T extends(...args: any[]) => any>(
  func: T,
  limit: number
): (...args: Parameters<T>) => void {
  let inThrottle: boolean;

  return (...args: Parameters<T>) => {
    if (!inThrottle) {
      func.apply(null, args);
      inThrottle = true;
      setTimeout(() => {
        inThrottle = false;
      }, limit);
    }
  };
}
