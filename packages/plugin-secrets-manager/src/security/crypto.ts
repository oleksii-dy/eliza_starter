import {
  createCipheriv,
  createDecipheriv,
  randomBytes,
  pbkdf2,
  type CipherGCM,
  type DecipherGCM,
} from 'crypto';
import { promisify } from 'util';

const pbkdf2Async = promisify(pbkdf2);

export interface EncryptionConfig {
  iterations?: number;
  keyLength?: number;
  saltLength?: number;
  ivLength?: number;
  algorithm?: string;
}

const DEFAULT_CONFIG: Required<EncryptionConfig> = {
  iterations: 100000, // PBKDF2 iterations
  keyLength: 32, // 256-bit key
  saltLength: 32, // 256-bit salt
  ivLength: 16, // 128-bit IV
  algorithm: 'aes-256-gcm',
};

export class SecureCrypto {
  private config: Required<EncryptionConfig>;

  constructor(config?: EncryptionConfig) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Derives a cryptographic key from a password using PBKDF2
   */
  async deriveKey(password: string, salt: Buffer): Promise<Buffer> {
    return pbkdf2Async(password, salt, this.config.iterations, this.config.keyLength, 'sha256');
  }

  /**
   * Encrypts data using AES-256-GCM
   * Returns base64 encoded string containing salt:iv:authTag:encrypted
   */
  async encrypt(plaintext: string, password: string): Promise<string> {
    // Generate random salt and IV
    const salt = randomBytes(this.config.saltLength);
    const iv = randomBytes(this.config.ivLength);

    // Derive key from password
    const key = await this.deriveKey(password, salt);

    // Create cipher
    const cipher = createCipheriv(this.config.algorithm, key, iv) as CipherGCM;

    // Encrypt data
    const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);

    // Get auth tag for GCM mode
    const authTag = cipher.getAuthTag();

    // Combine all components
    const combined = Buffer.concat([salt, iv, authTag, encrypted]);

    return combined.toString('base64');
  }

  /**
   * Decrypts data encrypted with encrypt()
   */
  async decrypt(encryptedData: string, password: string): Promise<string> {
    // Decode from base64
    const combined = Buffer.from(encryptedData, 'base64');

    // Extract components
    const salt = combined.slice(0, this.config.saltLength);
    const iv = combined.slice(
      this.config.saltLength,
      this.config.saltLength + this.config.ivLength
    );
    const authTag = combined.slice(
      this.config.saltLength + this.config.ivLength,
      this.config.saltLength + this.config.ivLength + 16 // Auth tag is always 16 bytes
    );
    const encrypted = combined.slice(this.config.saltLength + this.config.ivLength + 16);

    // Derive key from password
    const key = await this.deriveKey(password, salt);

    // Create decipher
    const decipher = createDecipheriv(this.config.algorithm, key, iv) as DecipherGCM;
    decipher.setAuthTag(authTag);

    // Decrypt data
    const decrypted = Buffer.concat([decipher.update(encrypted), decipher.final()]);

    return decrypted.toString('utf8');
  }

  /**
   * Generates a cryptographically secure random token
   */
  generateToken(length: number = 32): string {
    return randomBytes(length).toString('hex');
  }

  /**
   * Constant-time string comparison to prevent timing attacks
   */
  constantTimeCompare(a: string, b: string): boolean {
    if (a.length !== b.length) {
      return false;
    }

    let result = 0;
    for (let i = 0; i < a.length; i++) {
      result |= a.charCodeAt(i) ^ b.charCodeAt(i);
    }

    return result === 0;
  }
}

// Singleton instance for the application
export const secureCrypto = new SecureCrypto();
