import { describe, it, expect, beforeEach, mock } from 'bun:test';
import { EncryptionService } from '../../../services/EncryptionService';

describe('EncryptionService', () => {
  let service: EncryptionService;

  beforeEach(() => {
    mock.restore();
  });

  describe('constructor and setPassphrase', () => {
    it('should create service without passphrase', () => {
      service = new EncryptionService();
      expect(service).toBeDefined();
      expect(service.getMetadata()).toMatchObject({
        hasMasterKey: false,
      });
    });

    it('should create service with passphrase', () => {
      service = new EncryptionService('mysecurepassphrase123');
      expect(service).toBeDefined();
      expect(service.getMetadata()).toMatchObject({
        hasMasterKey: true,
      });
    });

    it('should set passphrase after construction', () => {
      service = new EncryptionService();
      service.setPassphrase('mysecurepassphrase123');
      expect(service.getMetadata()).toMatchObject({
        hasMasterKey: true,
      });
    });

    it('should reject short passphrases', () => {
      service = new EncryptionService();
      expect(() => service.setPassphrase('short')).toThrow(
        'Passphrase must be at least 12 characters long'
      );
    });

    it('should reject empty passphrases', () => {
      service = new EncryptionService();
      expect(() => service.setPassphrase('')).toThrow(
        'Passphrase must be at least 12 characters long'
      );
    });
  });

  describe('encrypt and decrypt', () => {
    beforeEach(() => {
      service = new EncryptionService('mysecurepassphrase123');
    });

    it('should encrypt and decrypt data with master key', () => {
      const plaintext = 'This is sensitive data';
      const encrypted = service.encrypt(plaintext);

      expect(encrypted).toBeDefined();
      expect(encrypted).not.toBe(plaintext);
      expect(encrypted.length).toBeGreaterThan(0);

      const decrypted = service.decrypt(encrypted);
      expect(decrypted).toBe(plaintext);
    });

    it('should encrypt and decrypt with provided key', () => {
      const plaintext = 'This is sensitive data';
      const key = EncryptionService.generateKey();

      const encrypted = service.encrypt(plaintext, key);
      expect(encrypted).toBeDefined();

      const decrypted = service.decrypt(encrypted, key);
      expect(decrypted).toBe(plaintext);
    });

    it('should produce different ciphertexts for same plaintext', () => {
      const plaintext = 'This is sensitive data';
      const encrypted1 = service.encrypt(plaintext);
      const encrypted2 = service.encrypt(plaintext);

      expect(encrypted1).not.toBe(encrypted2);

      // But both should decrypt to same plaintext
      expect(service.decrypt(encrypted1)).toBe(plaintext);
      expect(service.decrypt(encrypted2)).toBe(plaintext);
    });

    it('should handle empty strings', () => {
      const plaintext = '';
      const encrypted = service.encrypt(plaintext);
      const decrypted = service.decrypt(encrypted);
      expect(decrypted).toBe(plaintext);
    });

    it('should handle long strings', () => {
      const plaintext = 'a'.repeat(10000);
      const encrypted = service.encrypt(plaintext);
      const decrypted = service.decrypt(encrypted);
      expect(decrypted).toBe(plaintext);
    });

    it('should handle special characters', () => {
      const plaintext = '🔐 Special chars: !@#$%^&*()_+-={}[]|\\:";\'<>?,./';
      const encrypted = service.encrypt(plaintext);
      const decrypted = service.decrypt(encrypted);
      expect(decrypted).toBe(plaintext);
    });

    it('should throw error when encrypting without key', () => {
      const serviceNoKey = new EncryptionService();
      expect(() => serviceNoKey.encrypt('test')).toThrow('Failed to encrypt data');
    });

    it('should throw error when decrypting without key', () => {
      const serviceNoKey = new EncryptionService();
      expect(() => serviceNoKey.decrypt('test')).toThrow('Failed to decrypt data');
    });

    it('should throw error with invalid key length', () => {
      expect(() => service.encrypt('test', 'shortkey')).toThrow('Failed to encrypt data');
      expect(() => service.decrypt('test', 'shortkey')).toThrow('Failed to decrypt data');
    });

    it('should throw error when decrypting invalid data', () => {
      expect(() => service.decrypt('invalid-base64')).toThrow();
      expect(() => service.decrypt('dGVzdA==')).toThrow('Failed to decrypt data');
    });

    it('should not decrypt with wrong key', () => {
      const plaintext = 'Secret message';
      const key1 = EncryptionService.generateKey();
      const key2 = EncryptionService.generateKey();

      const encrypted = service.encrypt(plaintext, key1);
      expect(() => service.decrypt(encrypted, key2)).toThrow('Failed to decrypt data');
    });

    it('should not decrypt with wrong passphrase', () => {
      const plaintext = 'Secret message';
      const encrypted = service.encrypt(plaintext);

      const service2 = new EncryptionService('differentpassphrase123');
      expect(() => service2.decrypt(encrypted)).toThrow('Failed to decrypt data');
    });
  });

  describe('static methods', () => {
    it('should generate random keys', () => {
      const key1 = EncryptionService.generateKey();
      const key2 = EncryptionService.generateKey();

      expect(key1).toBeDefined();
      expect(key2).toBeDefined();
      expect(key1).not.toBe(key2);
      expect(key1.length).toBe(64); // 32 bytes in hex
    });

    it('should hash and verify data', () => {
      const data = 'password123';
      const hash = EncryptionService.hash(data);

      expect(hash).toBeDefined();
      expect(hash).toContain(':');
      expect(EncryptionService.verifyHash(data, hash)).toBe(true);
      expect(EncryptionService.verifyHash('wrongpassword', hash)).toBe(false);
    });

    it('should hash with provided salt', () => {
      const data = 'password123';
      const salt = 'abcdef1234567890';
      const hash1 = EncryptionService.hash(data, salt);
      const hash2 = EncryptionService.hash(data, salt);

      // Same salt should produce same hash
      expect(hash1).toBe(hash2);
    });

    it('should handle invalid hash format in verifyHash', () => {
      expect(EncryptionService.verifyHash('data', 'invalidhash')).toBe(false);
      expect(EncryptionService.verifyHash('data', '')).toBe(false);
    });

    it('should generate secure tokens', () => {
      const token1 = EncryptionService.generateSecureToken();
      const token2 = EncryptionService.generateSecureToken();

      expect(token1).toBeDefined();
      expect(token2).toBeDefined();
      expect(token1).not.toBe(token2);
      expect(token1.length).toBe(64); // 32 bytes in hex
    });

    it('should generate tokens of specified length', () => {
      const token = EncryptionService.generateSecureToken(16);
      expect(token.length).toBe(32); // 16 bytes in hex
    });

    it('should perform constant time comparison', () => {
      expect(EncryptionService.constantTimeCompare('abc', 'abc')).toBe(true);
      expect(EncryptionService.constantTimeCompare('abc', 'abd')).toBe(false);
      expect(EncryptionService.constantTimeCompare('abc', 'abcd')).toBe(false);
      expect(EncryptionService.constantTimeCompare('', '')).toBe(true);
    });

    it('should securely clear buffers', () => {
      const buffer = Buffer.from('sensitive data');
      const originalData = buffer.toString();

      EncryptionService.secureClear(buffer);

      expect(buffer.toString()).not.toBe(originalData);
      expect(buffer.every((byte) => byte === 0)).toBe(true);
    });

    it('should handle null buffer in secureClear', () => {
      expect(() => EncryptionService.secureClear(null as any)).not.toThrow();
    });

    it('should handle empty buffer in secureClear', () => {
      const buffer = Buffer.alloc(0);
      expect(() => EncryptionService.secureClear(buffer)).not.toThrow();
    });
  });

  describe('getMetadata', () => {
    it('should return encryption metadata', () => {
      service = new EncryptionService();
      const metadata = service.getMetadata();

      expect(metadata).toMatchObject({
        algorithm: 'aes-256-gcm',
        keyLength: 32,
        ivLength: 16,
        tagLength: 16,
        saltLength: 32,
        pbkdf2Iterations: 100000,
        hasMasterKey: false,
      });
    });

    it('should show hasMasterKey as true when passphrase is set', () => {
      service = new EncryptionService('mysecurepassphrase123');
      const metadata = service.getMetadata();

      expect(metadata).toMatchObject({
        hasMasterKey: true,
      });
    });
  });
});
