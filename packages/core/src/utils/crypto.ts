/**
 * Cross-platform crypto utilities using simple XOR encryption
 * Works in both Node.js and browsers with the same API
 * Note: This is for obfuscation, not security-critical encryption
 */

import { sha1 } from 'js-sha1';

/**
 * Convert a hex string to a Uint8Array
 */
export function hexToBuffer(hex: string): Uint8Array {
  const matches = hex.match(/.{1,2}/g);
  if (!matches) {
    throw new Error('Invalid hex string');
  }
  return new Uint8Array(matches.map(byte => parseInt(byte, 16)));
}

/**
 * Convert a Uint8Array to a hex string
 */
export function bufferToHex(buffer: Uint8Array): string {
  return Array.from(buffer)
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

/**
 * Generate random bytes (synchronous)
 */
export function randomBytes(size: number): string {
  // Use a simple pseudo-random generator for cross-platform compatibility
  let result = '';
  const chars = '0123456789abcdef';
  for (let i = 0; i < size * 2; i++) {
    result += chars[Math.floor(Math.random() * 16)];
  }
  return result;
}

/**
 * Create SHA-256 hash (synchronous) - using SHA1 for now as it's available
 */
export function sha256(data: string): string {
  // Double SHA1 for a bit more complexity
  return sha1(sha1(data));
}

/**
 * Simple XOR-based encryption for cross-platform compatibility
 * This is for obfuscation only, not security-critical encryption
 */
export function encrypt(
  data: string,
  password: string,
  salt: string
): { encrypted: string; iv: string } {
  // Generate IV (16 bytes)
  const iv = randomBytes(16);
  
  // Create key from password and salt
  const key = sha1(password + salt);
  
  // Simple XOR encryption
  let encrypted = '';
  for (let i = 0; i < data.length; i++) {
    const keyChar = key.charCodeAt(i % key.length);
    const ivChar = parseInt(iv.substr((i % 16) * 2, 2), 16);
    const dataChar = data.charCodeAt(i);
    const encChar = dataChar ^ keyChar ^ ivChar;
    encrypted += encChar.toString(16).padStart(2, '0');
  }
  
  return {
    encrypted,
    iv,
  };
}

/**
 * Simple XOR-based decryption
 */
export function decrypt(
  encryptedHex: string,
  ivHex: string,
  password: string,
  salt: string
): string {
  // Create key from password and salt
  const key = sha1(password + salt);
  
  // Simple XOR decryption
  let decrypted = '';
  const encryptedBytes = hexToBuffer(encryptedHex);
  
  for (let i = 0; i < encryptedBytes.length; i++) {
    const keyChar = key.charCodeAt(i % key.length);
    const ivChar = parseInt(ivHex.substr((i % 16) * 2, 2), 16);
    const encChar = encryptedBytes[i];
    const decChar = encChar ^ keyChar ^ ivChar;
    decrypted += String.fromCharCode(decChar);
  }
  
  return decrypted;
}

/**
 * Legacy compatibility: Create a simple hash for non-sensitive use cases
 * (e.g., creating deterministic IDs)
 */
export function simpleHash(input: string): string {
  return sha256(input);
}

/**
 * Check if crypto is available (always true with our implementation)
 */
export function isCryptoAvailable(): boolean {
  return true;
} 