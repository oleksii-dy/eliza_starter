import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from 'crypto';
import { IAgentRuntime } from '@elizaos/core';

export class EncryptionService {
  private readonly algorithm = 'aes-256-gcm';
  private readonly saltLength = 32;
  private readonly ivLength = 16;
  private readonly tagLength = 16;
  private readonly keyLength = 32;
  private readonly scryptCost = 16384;
  private readonly scryptBlockSize = 8;
  private readonly scryptParallelization = 1;

  constructor(private runtime: IAgentRuntime) {}

  /**
   * Get or derive the master encryption key from runtime settings
   */
  private getMasterKey(): Buffer {
    // Try to get encryption key from runtime settings
    let masterSecret = this.runtime.getSetting('EVM_ENCRYPTION_KEY');

    if (!masterSecret) {
      // Fall back to a combination of agent ID and a system secret
      const agentId = this.runtime.agentId;
      const systemSecret = this.runtime.getSetting('SYSTEM_SECRET') || 'default-secret-change-me';
      masterSecret = `${agentId}-${systemSecret}`;

      // Log warning about using default encryption
      // Note: Using derived encryption key. Set EVM_ENCRYPTION_KEY for better security.
    }

    // Always derive a key from the master secret for consistency
    const salt = Buffer.from('eliza-evm-wallet-encryption-v1', 'utf8');
    return scryptSync(masterSecret, salt, this.keyLength, {
      N: this.scryptCost,
      r: this.scryptBlockSize,
      p: this.scryptParallelization,
      maxmem: 128 * 1024 * 1024, // 128MB
    });
  }

  /**
   * Encrypt sensitive data
   */
  encrypt(plaintext: string): string {
    try {
      // Generate random salt and IV
      const salt = randomBytes(this.saltLength);
      const iv = randomBytes(this.ivLength);

      // Get master key and derive encryption key with salt
      const masterKey = this.getMasterKey();
      const key = scryptSync(masterKey, salt, this.keyLength, {
        N: this.scryptCost,
        r: this.scryptBlockSize,
        p: this.scryptParallelization,
        maxmem: 128 * 1024 * 1024,
      });

      // Create cipher
      const cipher = createCipheriv(this.algorithm, key, iv);

      // Encrypt data
      const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);

      // Get authentication tag
      const tag = cipher.getAuthTag();

      // Combine salt, iv, tag, and encrypted data
      const combined = Buffer.concat([salt, iv, tag, encrypted]);

      // Return base64 encoded
      return combined.toString('base64');
    } catch (error) {
      throw new Error(`Encryption failed: ${error instanceof Error ? error.message : error}`);
    }
  }

  /**
   * Decrypt sensitive data
   */
  decrypt(encryptedData: string): string {
    try {
      // Decode from base64
      const combined = Buffer.from(encryptedData, 'base64');

      // Extract components
      const salt = combined.slice(0, this.saltLength);
      const iv = combined.slice(this.saltLength, this.saltLength + this.ivLength);
      const tag = combined.slice(
        this.saltLength + this.ivLength,
        this.saltLength + this.ivLength + this.tagLength
      );
      const encrypted = combined.slice(this.saltLength + this.ivLength + this.tagLength);

      // Get master key and derive decryption key with salt
      const masterKey = this.getMasterKey();
      const key = scryptSync(masterKey, salt, this.keyLength, {
        N: this.scryptCost,
        r: this.scryptBlockSize,
        p: this.scryptParallelization,
        maxmem: 128 * 1024 * 1024,
      });

      // Create decipher
      const decipher = createDecipheriv(this.algorithm, key, iv);
      decipher.setAuthTag(tag);

      // Decrypt data
      const decrypted = Buffer.concat([decipher.update(encrypted), decipher.final()]);

      return decrypted.toString('utf8');
    } catch (error) {
      throw new Error(`Decryption failed: ${error instanceof Error ? error.message : error}`);
    }
  }

  /**
   * Generate a secure random session key
   */
  generateSessionKey(): string {
    return randomBytes(32).toString('hex');
  }

  /**
   * Hash sensitive data for comparison without storing plaintext
   */
  hash(data: string): string {
    const salt = randomBytes(this.saltLength);
    const hash = scryptSync(
      data,
      salt,
      64, // 64 bytes for hash
      {
        N: this.scryptCost,
        r: this.scryptBlockSize,
        p: this.scryptParallelization,
        maxmem: 128 * 1024 * 1024,
      }
    );

    // Combine salt and hash
    const combined = Buffer.concat([salt, hash]);
    return combined.toString('base64');
  }

  /**
   * Verify hashed data
   */
  verifyHash(data: string, hashedData: string): boolean {
    try {
      const combined = Buffer.from(hashedData, 'base64');
      const salt = combined.slice(0, this.saltLength);
      const originalHash = combined.slice(this.saltLength);

      const hash = scryptSync(data, salt, 64, {
        N: this.scryptCost,
        r: this.scryptBlockSize,
        p: this.scryptParallelization,
        maxmem: 128 * 1024 * 1024,
      });

      return hash.equals(originalHash);
    } catch {
      return false;
    }
  }

  /**
   * Encrypt data with a specific key (for session keys)
   */
  encryptWithKey(plaintext: string, key: string): string {
    const keyBuffer = Buffer.from(key, 'hex');
    if (keyBuffer.length !== this.keyLength) {
      throw new Error('Invalid key length');
    }

    const iv = randomBytes(this.ivLength);
    const cipher = createCipheriv(this.algorithm, keyBuffer, iv);

    const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);

    const tag = cipher.getAuthTag();

    // Combine iv, tag, and encrypted data (no salt needed as key is provided)
    const combined = Buffer.concat([iv, tag, encrypted]);
    return combined.toString('base64');
  }

  /**
   * Decrypt data with a specific key (for session keys)
   */
  decryptWithKey(encryptedData: string, key: string): string {
    const keyBuffer = Buffer.from(key, 'hex');
    if (keyBuffer.length !== this.keyLength) {
      throw new Error('Invalid key length');
    }

    const combined = Buffer.from(encryptedData, 'base64');

    const iv = combined.slice(0, this.ivLength);
    const tag = combined.slice(this.ivLength, this.ivLength + this.tagLength);
    const encrypted = combined.slice(this.ivLength + this.tagLength);

    const decipher = createDecipheriv(this.algorithm, keyBuffer, iv);
    decipher.setAuthTag(tag);

    const decrypted = Buffer.concat([decipher.update(encrypted), decipher.final()]);

    return decrypted.toString('utf8');
  }

  /**
   * Generate a deterministic key from a seed (for HD wallets)
   */
  deriveKey(seed: string, path: string): Buffer {
    const combinedSeed = `${seed}-${path}`;
    const salt = Buffer.from(`eliza-wallet-${path}`, 'utf8');

    return scryptSync(combinedSeed, salt, this.keyLength, {
      N: this.scryptCost,
      r: this.scryptBlockSize,
      p: this.scryptParallelization,
      maxmem: 128 * 1024 * 1024,
    });
  }

  /**
   * Secure memory cleanup (best effort in Node.js)
   */
  secureClear(buffer: Buffer): void {
    // Fill with random data
    randomBytes(buffer.length).copy(buffer);
    // Then fill with zeros
    buffer.fill(0);
  }
}

// Export a factory function
export function createEncryptionService(runtime: IAgentRuntime): EncryptionService {
  return new EncryptionService(runtime);
}

// Export standalone encrypt/decrypt functions for convenience
export function encrypt(data: string, key: string): string {
  const tempService = new EncryptionService({
    getSetting: (name: string) => (name === 'ENCRYPTION_KEY' ? key : undefined),
  } as any);
  return tempService.encryptWithKey(data, key);
}

export function decrypt(encryptedData: string, key: string): string {
  const tempService = new EncryptionService({
    getSetting: (name: string) => (name === 'ENCRYPTION_KEY' ? key : undefined),
  } as any);
  return tempService.decryptWithKey(encryptedData, key);
}
