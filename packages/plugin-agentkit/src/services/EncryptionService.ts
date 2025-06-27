import { randomBytes, createCipheriv, createDecipheriv, pbkdf2Sync } from 'crypto';
import { elizaLogger } from '@elizaos/core';

/**
 * Production-grade encryption service for sensitive data
 * Uses AES-256-GCM with PBKDF2 key derivation
 */
export class EncryptionService {
  private static readonly ALGORITHM = 'aes-256-gcm';
  private static readonly KEY_LENGTH = 32; // 256 bits
  private static readonly IV_LENGTH = 16; // 128 bits
  private static readonly TAG_LENGTH = 16; // 128 bits
  private static readonly SALT_LENGTH = 32; // 256 bits
  private static readonly PBKDF2_ITERATIONS = 100000;

  private masterKey: Buffer | null = null;

  constructor(private passphrase?: string) {
    if (passphrase) {
      this.setPassphrase(passphrase);
    }
  }

  /**
   * Set the master passphrase for encryption/decryption
   */
  setPassphrase(passphrase: string): void {
    if (!passphrase || passphrase.length < 12) {
      throw new Error('Passphrase must be at least 12 characters long');
    }

    // Use a fixed salt for key derivation from the passphrase
    // In production, you might want to use a per-installation salt
    const fixedSalt = Buffer.from('eliza-agentkit-encryption-salt-v1', 'utf-8');

    this.masterKey = pbkdf2Sync(
      passphrase,
      fixedSalt,
      EncryptionService.PBKDF2_ITERATIONS,
      EncryptionService.KEY_LENGTH,
      'sha256'
    );

    elizaLogger.info('[EncryptionService] Master key derived from passphrase');
  }

  /**
   * Generate a random encryption key
   */
  static generateKey(): string {
    return randomBytes(EncryptionService.KEY_LENGTH).toString('hex');
  }

  /**
   * Encrypt sensitive data (like private keys)
   */
  encrypt(plaintext: string, keyHex?: string): string {
    try {
      let key: Buffer;

      if (keyHex) {
        // Use provided key
        key = Buffer.from(keyHex, 'hex');
        if (key.length !== EncryptionService.KEY_LENGTH) {
          throw new Error(`Invalid key length: expected ${EncryptionService.KEY_LENGTH} bytes`);
        }
      } else if (this.masterKey) {
        // Use master key
        key = this.masterKey;
      } else {
        throw new Error('No encryption key available. Set passphrase or provide key.');
      }

      // Generate random IV and salt for this encryption
      const iv = randomBytes(EncryptionService.IV_LENGTH);
      const salt = randomBytes(EncryptionService.SALT_LENGTH);

      // Derive encryption key from master key + salt
      const derivedKey = pbkdf2Sync(
        key,
        salt,
        10000, // Fewer iterations for performance
        EncryptionService.KEY_LENGTH,
        'sha256'
      );

      // Create cipher
      const cipher = createCipheriv(EncryptionService.ALGORITHM, derivedKey, iv);

      // Encrypt
      let encrypted = cipher.update(plaintext, 'utf8', 'hex');
      encrypted += cipher.final('hex');

      // Get authentication tag
      const tag = cipher.getAuthTag();

      // Combine salt + iv + tag + encrypted data
      const combined = Buffer.concat([salt, iv, tag, Buffer.from(encrypted, 'hex')]);

      return combined.toString('base64');
    } catch (error) {
      elizaLogger.error('[EncryptionService] Encryption failed:', error);
      throw new Error('Failed to encrypt data');
    }
  }

  /**
   * Decrypt sensitive data
   */
  decrypt(encryptedData: string, keyHex?: string): string {
    try {
      let key: Buffer;

      if (keyHex) {
        // Use provided key
        key = Buffer.from(keyHex, 'hex');
        if (key.length !== EncryptionService.KEY_LENGTH) {
          throw new Error(`Invalid key length: expected ${EncryptionService.KEY_LENGTH} bytes`);
        }
      } else if (this.masterKey) {
        // Use master key
        key = this.masterKey;
      } else {
        throw new Error('No decryption key available. Set passphrase or provide key.');
      }

      // Parse combined data
      const combined = Buffer.from(encryptedData, 'base64');

      if (
        combined.length <
        EncryptionService.SALT_LENGTH + EncryptionService.IV_LENGTH + EncryptionService.TAG_LENGTH
      ) {
        throw new Error('Invalid encrypted data format');
      }

      const salt = combined.subarray(0, EncryptionService.SALT_LENGTH);
      const iv = combined.subarray(
        EncryptionService.SALT_LENGTH,
        EncryptionService.SALT_LENGTH + EncryptionService.IV_LENGTH
      );
      const tag = combined.subarray(
        EncryptionService.SALT_LENGTH + EncryptionService.IV_LENGTH,
        EncryptionService.SALT_LENGTH + EncryptionService.IV_LENGTH + EncryptionService.TAG_LENGTH
      );
      const encrypted = combined.subarray(
        EncryptionService.SALT_LENGTH + EncryptionService.IV_LENGTH + EncryptionService.TAG_LENGTH
      );

      // Derive decryption key from master key + salt
      const derivedKey = pbkdf2Sync(key, salt, 10000, EncryptionService.KEY_LENGTH, 'sha256');

      // Create decipher
      const decipher = createDecipheriv(EncryptionService.ALGORITHM, derivedKey, iv);
      decipher.setAuthTag(tag);

      // Decrypt
      let decrypted = decipher.update(encrypted, undefined, 'utf8');
      decrypted += decipher.final('utf8');

      return decrypted;
    } catch (error) {
      elizaLogger.error('[EncryptionService] Decryption failed:', error);
      throw new Error('Failed to decrypt data');
    }
  }

  /**
   * Securely hash a value (for verification, not encryption)
   */
  static hash(data: string, salt?: string): string {
    const saltBuffer = salt ? Buffer.from(salt, 'hex') : randomBytes(16);
    const hash = pbkdf2Sync(data, saltBuffer, 50000, 32, 'sha256');
    return `${saltBuffer.toString('hex')}:${hash.toString('hex')}`;
  }

  /**
   * Verify a hashed value
   */
  static verifyHash(data: string, hashedValue: string): boolean {
    try {
      const [salt, hash] = hashedValue.split(':');
      const dataHash = pbkdf2Sync(data, Buffer.from(salt, 'hex'), 50000, 32, 'sha256');
      return hash === dataHash.toString('hex');
    } catch {
      return false;
    }
  }

  /**
   * Generate a secure random string for passwords/tokens
   */
  static generateSecureToken(length = 32): string {
    return randomBytes(length).toString('hex');
  }

  /**
   * Constant-time comparison to prevent timing attacks
   */
  static constantTimeCompare(a: string, b: string): boolean {
    if (a.length !== b.length) {
      return false;
    }

    let result = 0;
    for (let i = 0; i < a.length; i++) {
      result |= a.charCodeAt(i) ^ b.charCodeAt(i);
    }

    return result === 0;
  }

  /**
   * Securely clear sensitive data from memory
   */
  static secureClear(buffer: Buffer): void {
    if (buffer && buffer.length > 0) {
      buffer.fill(0);
    }
  }

  /**
   * Get encryption metadata for debugging (without exposing keys)
   */
  getMetadata(): object {
    return {
      algorithm: EncryptionService.ALGORITHM,
      keyLength: EncryptionService.KEY_LENGTH,
      ivLength: EncryptionService.IV_LENGTH,
      tagLength: EncryptionService.TAG_LENGTH,
      saltLength: EncryptionService.SALT_LENGTH,
      pbkdf2Iterations: EncryptionService.PBKDF2_ITERATIONS,
      hasMasterKey: !!this.masterKey,
    };
  }
}
