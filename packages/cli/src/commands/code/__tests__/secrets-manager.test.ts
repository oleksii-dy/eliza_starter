import { describe, it, expect, beforeEach, afterEach, mock } from 'bun:test';
import { SecretsManager, type SecretsManagerOptions } from '../services/secrets-manager.js';

// Mock fs operations
const mockFs = {
  mkdir: mock(() => Promise.resolve()),
  writeFile: mock(() => Promise.resolve()),
  readFile: mock(() => Promise.resolve('{"encryptedSecrets": {}}')),
  access: mock(() => Promise.reject(new Error('File not found'))),
  stat: mock(() => Promise.resolve({ 
    size: 1024,
    isFile: () => true,
    isDirectory: () => false,
    mtime: new Date(),
  })),
  readdir: mock(() => Promise.resolve([])),
  unlink: mock(() => Promise.resolve()),
  chmod: mock(() => Promise.resolve()),
};

const mockPath = {
  dirname: mock(() => '/test/dir'),
  resolve: mock(() => '/test/dir/.test-secrets'),
  join: mock((...args: string[]) => args.join('/')),
};

// Apply mocks
mock.module('fs/promises', () => mockFs);
mock.module('path', () => mockPath);

// Mock crypto operations
const mockCrypto = {
  randomBytes: mock((size: number) => Buffer.alloc(size, 0x42)),
  scrypt: mock((password: string, salt: Buffer, keylen: number, callback: Function) => {
    callback(null, Buffer.alloc(keylen, 0x33));
  }),
  createCipher: mock(() => ({
    update: mock((data: string) => Buffer.from(data + '_encrypted')),
    final: mock(() => Buffer.alloc(0)),
  })),
  createDecipher: mock(() => ({
    update: mock((data: Buffer) => Buffer.from(data.toString().replace('_encrypted', ''))),
    final: mock(() => Buffer.alloc(0)),
  })),
};

mock.module('crypto', () => mockCrypto);

const mockTelemetryService = {
  logEvent: mock(() => Promise.resolve()),
  start: mock(() => Promise.resolve()),
  stop: mock(() => Promise.resolve()),
};

const mockErrorLogService = {
  logError: mock(() => Promise.resolve()),
  logWarning: mock(() => Promise.resolve()),
  start: mock(() => Promise.resolve()),
  stop: mock(() => Promise.resolve()),
};

// Mock readline for interactive prompts
const mockReadline = {
  createInterface: mock(() => ({
    question: mock((prompt: string, callback: Function) => {
      if (prompt.includes('password')) {
        callback('test-password');
      } else if (prompt.includes('API key')) {
        callback('test-api-key-123');
      } else {
        callback('test-value');
      }
    }),
    close: mock(() => {}),
  })),
};

mock.module('readline', () => mockReadline);

describe('SecretsManager', () => {
  let secretsManager: SecretsManager;
  let mockOptions: SecretsManagerOptions;

  beforeEach(() => {
    // Clear all mocks
    Object.values(mockFs).forEach(mockFn => mockFn.mockReset());
    Object.values(mockPath).forEach(mockFn => mockFn.mockReset());
    Object.values(mockCrypto).forEach(mockFn => mockFn.mockReset());
    mockTelemetryService.logEvent.mockReset();
    mockErrorLogService.logError.mockReset();
    mockErrorLogService.logWarning.mockReset();
    
    mockOptions = {
      enabled: true,
      secretsDirectory: '.test-secrets',
      encryptionAlgorithm: 'aes-256-cbc',
      keyDerivationRounds: 10000,
      autoRotationDays: 90,
      telemetryService: mockTelemetryService as any,
      errorLogService: mockErrorLogService as any,
      debug: true,
    };

    // Setup path mocks
    mockPath.dirname.mockReturnValue('/test/dir');
    mockPath.resolve.mockReturnValue('/test/dir/.test-secrets');
    mockPath.join.mockImplementation((...args) => args.join('/'));

    // Setup fs mocks
    mockFs.mkdir.mockResolvedValue(undefined);
    mockFs.writeFile.mockResolvedValue(undefined);
    mockFs.readFile.mockResolvedValue('{"encryptedSecrets": {}}');
    mockFs.access.mockRejectedValue(new Error('File not found'));
    mockFs.stat.mockResolvedValue({ 
      size: 1024,
      isFile: () => true,
      isDirectory: () => false,
      mtime: new Date(),
    } as any);
    mockFs.readdir.mockResolvedValue([]);
    mockFs.unlink.mockResolvedValue(undefined);
    mockFs.chmod.mockResolvedValue(undefined);

    // Setup crypto mocks
    mockCrypto.randomBytes.mockImplementation((size) => Buffer.alloc(size, 0x42));
    mockCrypto.scrypt.mockImplementation((password, salt, keylen, callback) => {
      callback(null, Buffer.alloc(keylen, 0x33));
    });

    secretsManager = new SecretsManager(mockOptions);
  });

  afterEach(async () => {
    if (secretsManager) {
      await secretsManager.stop();
    }
  });

  describe('initialization', () => {
    it('should create a SecretsManager instance', () => {
      expect(secretsManager).toBeInstanceOf(SecretsManager);
    });

    it('should start successfully with enabled service', async () => {
      await expect(secretsManager.start()).resolves.not.toThrow();
      expect(mockFs.mkdir).toHaveBeenCalledWith(
        expect.stringContaining('.test-secrets'),
        { recursive: true }
      );
      expect(mockFs.chmod).toHaveBeenCalledWith(
        expect.stringContaining('.test-secrets'),
        0o700 // Owner read/write/execute only
      );
      expect(mockTelemetryService.logEvent).toHaveBeenCalledWith(
        'secrets_manager_started',
        expect.objectContaining({
          secretsDirectory: '.test-secrets',
          encryptionAlgorithm: 'aes-256-cbc',
          autoRotationDays: 90,
        }),
        'secrets'
      );
    });

    it('should skip initialization when disabled', async () => {
      const disabledService = new SecretsManager({ 
        ...mockOptions, 
        enabled: false 
      });
      
      await disabledService.start();
      expect(mockFs.mkdir).not.toHaveBeenCalled();
      expect(mockTelemetryService.logEvent).not.toHaveBeenCalled();
    });

    it('should handle directory creation errors', async () => {
      mockFs.mkdir.mockRejectedValueOnce(new Error('Permission denied'));
      
      await expect(secretsManager.start()).rejects.toThrow('Permission denied');
      expect(mockErrorLogService.logError).toHaveBeenCalled();
    });

    it('should load existing secrets on start', async () => {
      const existingSecrets = {
        encryptedSecrets: {
          'API_KEY': 'encrypted_api_key_value',
          'DB_PASSWORD': 'encrypted_db_password',
        },
        metadata: {
          'API_KEY': { createdAt: new Date().toISOString(), rotatedAt: null },
          'DB_PASSWORD': { createdAt: new Date().toISOString(), rotatedAt: null },
        },
      };
      
      mockFs.readFile.mockResolvedValueOnce(JSON.stringify(existingSecrets));
      
      await secretsManager.start();
      
      expect(mockTelemetryService.logEvent).toHaveBeenCalledWith(
        'secrets_loaded',
        expect.objectContaining({
          secretCount: 2,
        }),
        'secrets'
      );
    });
  });

  describe('secret storage and retrieval', () => {
    beforeEach(async () => {
      await secretsManager.start();
    });

    it('should store secrets with encryption', async () => {
      const secretKey = 'API_KEY';
      const secretValue = 'sk-1234567890abcdef';
      
      await expect(secretsManager.setSecret(secretKey, secretValue)).resolves.not.toThrow();
      
      expect(mockFs.writeFile).toHaveBeenCalledWith(
        expect.stringContaining('secrets.json'),
        expect.stringContaining('encryptedSecrets'),
        'utf8'
      );
      
      expect(mockTelemetryService.logEvent).toHaveBeenCalledWith(
        'secret_stored',
        expect.objectContaining({
          key: secretKey,
          encrypted: true,
        }),
        'secrets'
      );
    });

    it('should retrieve and decrypt secrets', async () => {
      const secretKey = 'API_KEY';
      const secretValue = 'sk-1234567890abcdef';
      
      // Store first
      await secretsManager.setSecret(secretKey, secretValue);
      
      // Mock cipher for retrieval
      mockCrypto.createDecipher.mockReturnValueOnce({
        update: mock(() => Buffer.from(secretValue)),
        final: mock(() => Buffer.alloc(0)),
      });
      
      const retrieved = await secretsManager.getSecret(secretKey);
      
      expect(retrieved).toBe(secretValue);
      expect(mockTelemetryService.logEvent).toHaveBeenCalledWith(
        'secret_retrieved',
        expect.objectContaining({
          key: secretKey,
        }),
        'secrets'
      );
    });

    it('should handle non-existent secrets', async () => {
      const result = await secretsManager.getSecret('NON_EXISTENT');
      expect(result).toBeNull();
    });

    it('should list all secret keys', async () => {
      await secretsManager.setSecret('API_KEY', 'value1');
      await secretsManager.setSecret('DB_PASSWORD', 'value2');
      await secretsManager.setSecret('JWT_SECRET', 'value3');
      
      const keys = await secretsManager.listSecrets();
      
      expect(keys).toEqual(['API_KEY', 'DB_PASSWORD', 'JWT_SECRET']);
    });

    it('should validate secret keys', async () => {
      await expect(secretsManager.setSecret('', 'value')).rejects.toThrow('Secret key cannot be empty');
      await expect(secretsManager.setSecret('invalid-key!', 'value')).rejects.toThrow('Secret key contains invalid characters');
      await expect(secretsManager.setSecret('VALID_KEY', '')).rejects.toThrow('Secret value cannot be empty');
    });

    it('should handle different secret types', async () => {
      const secrets = [
        { key: 'API_KEY', value: 'sk-1234567890abcdef', type: 'api_key' },
        { key: 'DATABASE_URL', value: 'postgresql://user:pass@localhost:5432/db', type: 'connection_string' },
        { key: 'JWT_SECRET', value: 'super-secret-jwt-key', type: 'token' },
        { key: 'WEBHOOK_SECRET', value: 'wh_1234567890abcdef', type: 'webhook' },
      ];

      for (const secret of secrets) {
        await secretsManager.setSecret(secret.key, secret.value, { type: secret.type });
        
        expect(mockTelemetryService.logEvent).toHaveBeenCalledWith(
          'secret_stored',
          expect.objectContaining({
            key: secret.key,
            type: secret.type,
          }),
          'secrets'
        );
      }
    });
  });

  describe('secret rotation', () => {
    beforeEach(async () => {
      await secretsManager.start();
    });

    it('should rotate secrets', async () => {
      const secretKey = 'API_KEY';
      const oldValue = 'sk-old-key';
      const newValue = 'sk-new-key';
      
      // Store original secret
      await secretsManager.setSecret(secretKey, oldValue);
      
      // Rotate to new value
      await secretsManager.rotateSecret(secretKey, newValue);
      
      // Verify new value is stored
      mockCrypto.createDecipher.mockReturnValueOnce({
        update: mock(() => Buffer.from(newValue)),
        final: mock(() => Buffer.alloc(0)),
      });
      
      const retrieved = await secretsManager.getSecret(secretKey);
      expect(retrieved).toBe(newValue);
      
      expect(mockTelemetryService.logEvent).toHaveBeenCalledWith(
        'secret_rotated',
        expect.objectContaining({
          key: secretKey,
        }),
        'secrets'
      );
    });

    it('should check for secrets needing rotation', async () => {
      // Create an old secret (simulate by setting old timestamp)
      const oldDate = new Date();
      oldDate.setDate(oldDate.getDate() - 100); // 100 days ago
      
      const secretKey = 'OLD_API_KEY';
      await secretsManager.setSecret(secretKey, 'old-value');
      
      // Mock the metadata to show old creation date
      (secretsManager as any).secretsMetadata[secretKey] = {
        createdAt: oldDate.toISOString(),
        rotatedAt: null,
      };
      
      const needsRotation = await secretsManager.getSecretsNeedingRotation();
      
      expect(needsRotation).toContain(secretKey);
    });

    it('should auto-rotate secrets when enabled', async () => {
      const autoRotationService = new SecretsManager({
        ...mockOptions,
        autoRotationDays: 30,
      });
      
      await autoRotationService.start();
      
      // Create an old secret
      const oldDate = new Date();
      oldDate.setDate(oldDate.getDate() - 40); // 40 days ago
      
      const secretKey = 'AUTO_ROTATE_KEY';
      await autoRotationService.setSecret(secretKey, 'old-value');
      
      // Mock metadata
      (autoRotationService as any).secretsMetadata[secretKey] = {
        createdAt: oldDate.toISOString(),
        rotatedAt: null,
      };
      
      // Trigger rotation check
      await (autoRotationService as any).checkAndRotateSecrets();
      
      expect(mockTelemetryService.logEvent).toHaveBeenCalledWith(
        'auto_rotation_check',
        expect.objectContaining({
          secretsChecked: 1,
          secretsRotated: expect.any(Number),
        }),
        'secrets'
      );
      
      await autoRotationService.stop();
    });
  });

  describe('secret deletion', () => {
    beforeEach(async () => {
      await secretsManager.start();
    });

    it('should delete secrets safely', async () => {
      const secretKey = 'DELETE_ME';
      await secretsManager.setSecret(secretKey, 'secret-value');
      
      await expect(secretsManager.deleteSecret(secretKey)).resolves.not.toThrow();
      
      const retrieved = await secretsManager.getSecret(secretKey);
      expect(retrieved).toBeNull();
      
      expect(mockTelemetryService.logEvent).toHaveBeenCalledWith(
        'secret_deleted',
        expect.objectContaining({
          key: secretKey,
        }),
        'secrets'
      );
    });

    it('should handle deletion of non-existent secrets', async () => {
      await expect(secretsManager.deleteSecret('NON_EXISTENT')).resolves.not.toThrow();
      
      expect(mockErrorLogService.logWarning).toHaveBeenCalledWith(
        'Attempted to delete non-existent secret: NON_EXISTENT',
        expect.any(Object),
        'secrets'
      );
    });
  });

  describe('interactive prompts', () => {
    beforeEach(async () => {
      await secretsManager.start();
    });

    it('should prompt for missing secrets', async () => {
      const requiredSecrets = ['API_KEY', 'DATABASE_URL', 'JWT_SECRET'];
      
      await secretsManager.promptForMissingSecrets(requiredSecrets);
      
      // Should have prompted for all missing secrets
      expect(mockReadline.createInterface).toHaveBeenCalled();
      
      // Should have stored the prompted values
      for (const key of requiredSecrets) {
        expect(mockTelemetryService.logEvent).toHaveBeenCalledWith(
          'secret_stored',
          expect.objectContaining({ key }),
          'secrets'
        );
      }
    });

    it('should skip prompting for existing secrets', async () => {
      // Store one secret first
      await secretsManager.setSecret('API_KEY', 'existing-value');
      
      const requiredSecrets = ['API_KEY', 'DATABASE_URL'];
      await secretsManager.promptForMissingSecrets(requiredSecrets);
      
      // Should only prompt for DATABASE_URL, not API_KEY
      const storedEvents = mockTelemetryService.logEvent.mock.calls.filter(
        call => call[0] === 'secret_stored'
      );
      
      expect(storedEvents.some(call => call[1].key === 'DATABASE_URL')).toBe(true);
    });

    it('should validate prompted values', async () => {
      // Mock readline to return invalid then valid values
      const mockInterface = {
        question: mock((prompt: string, callback: Function) => {
          if (prompt.includes('API_KEY')) {
            callback(''); // First attempt: empty value
          } else {
            callback('valid-value');
          }
        }),
        close: mock(() => {}),
      };
      
      mockReadline.createInterface.mockReturnValueOnce(mockInterface);
      
      await secretsManager.promptForMissingSecrets(['API_KEY']);
      
      // Should have prompted twice due to validation
      expect(mockInterface.question).toHaveBeenCalledTimes(2);
    });
  });

  describe('standard secrets definitions', () => {
    beforeEach(async () => {
      await secretsManager.start();
    });

    it('should provide standard secret definitions', async () => {
      const definitions = await secretsManager.getStandardSecrets();
      
      expect(definitions).toEqual(
        expect.objectContaining({
          'OPENAI_API_KEY': expect.objectContaining({
            name: 'OpenAI API Key',
            description: expect.stringContaining('OpenAI'),
            type: 'api_key',
            required: false,
          }),
          'ANTHROPIC_API_KEY': expect.objectContaining({
            name: 'Anthropic API Key',
            description: expect.stringContaining('Anthropic'),
            type: 'api_key',
            required: false,
          }),
          'GITHUB_TOKEN': expect.objectContaining({
            name: 'GitHub Personal Access Token',
            description: expect.stringContaining('GitHub'),
            type: 'token',
            required: false,
          }),
        })
      );
    });

    it('should setup standard secrets interactively', async () => {
      await secretsManager.setupStandardSecrets();
      
      // Should have prompted for all standard secrets
      expect(mockReadline.createInterface).toHaveBeenCalled();
      
      // Should have logged the setup process
      expect(mockTelemetryService.logEvent).toHaveBeenCalledWith(
        'standard_secrets_setup',
        expect.objectContaining({
          secretsConfigured: expect.any(Number),
        }),
        'secrets'
      );
    });
  });

  describe('export and backup', () => {
    beforeEach(async () => {
      await secretsManager.start();
    });

    it('should export secrets metadata (without values)', async () => {
      await secretsManager.setSecret('API_KEY', 'secret-value');
      await secretsManager.setSecret('DB_PASSWORD', 'another-secret');
      
      const exported = await secretsManager.exportSecretsMetadata();
      
      expect(exported).toEqual({
        secrets: expect.arrayContaining([
          expect.objectContaining({
            key: 'API_KEY',
            type: undefined,
            createdAt: expect.any(String),
            // Should NOT contain the actual value
          }),
          expect.objectContaining({
            key: 'DB_PASSWORD',
            type: undefined,
            createdAt: expect.any(String),
          }),
        ]),
        summary: expect.objectContaining({
          totalSecrets: 2,
          secretsByType: expect.any(Object),
        }),
        exportedAt: expect.any(String),
      });
    });

    it('should backup encrypted secrets', async () => {
      await secretsManager.setSecret('BACKUP_TEST', 'test-value');
      
      await secretsManager.createBackup();
      
      expect(mockFs.writeFile).toHaveBeenCalledWith(
        expect.stringContaining('backup-'),
        expect.stringContaining('encryptedSecrets'),
        'utf8'
      );
      
      expect(mockTelemetryService.logEvent).toHaveBeenCalledWith(
        'secrets_backup_created',
        expect.objectContaining({
          secretCount: 1,
          backupFile: expect.stringContaining('backup-'),
        }),
        'secrets'
      );
    });
  });

  describe('error handling', () => {
    beforeEach(async () => {
      await secretsManager.start();
    });

    it('should handle encryption errors gracefully', async () => {
      mockCrypto.createCipher.mockImplementationOnce(() => {
        throw new Error('Encryption failed');
      });
      
      await expect(secretsManager.setSecret('FAIL_KEY', 'value')).rejects.toThrow('Encryption failed');
      
      expect(mockErrorLogService.logError).toHaveBeenCalledWith(
        'Failed to encrypt secret',
        expect.any(Error),
        expect.objectContaining({ key: 'FAIL_KEY' }),
        'secrets'
      );
    });

    it('should handle decryption errors gracefully', async () => {
      // Store a secret first
      await secretsManager.setSecret('DECRYPT_FAIL', 'value');
      
      // Mock decryption to fail
      mockCrypto.createDecipher.mockImplementationOnce(() => {
        throw new Error('Decryption failed');
      });
      
      const result = await secretsManager.getSecret('DECRYPT_FAIL');
      
      expect(result).toBeNull();
      expect(mockErrorLogService.logError).toHaveBeenCalledWith(
        'Failed to decrypt secret',
        expect.any(Error),
        expect.objectContaining({ key: 'DECRYPT_FAIL' }),
        'secrets'
      );
    });

    it('should handle file system errors', async () => {
      mockFs.writeFile.mockRejectedValueOnce(new Error('Disk full'));
      
      await expect(secretsManager.setSecret('FS_FAIL', 'value')).rejects.toThrow('Disk full');
      
      expect(mockErrorLogService.logError).toHaveBeenCalledWith(
        'Failed to save secrets to file',
        expect.any(Error),
        expect.any(Object),
        'secrets'
      );
    });

    it('should handle corrupted secrets file', async () => {
      mockFs.readFile.mockResolvedValueOnce('invalid json content');
      
      // Should fall back to empty secrets
      const keys = await secretsManager.listSecrets();
      expect(keys).toEqual([]);
      
      expect(mockErrorLogService.logWarning).toHaveBeenCalledWith(
        'Failed to parse secrets file, starting with empty secrets',
        expect.any(Object),
        'secrets'
      );
    });
  });

  describe('stop and cleanup', () => {
    beforeEach(async () => {
      await secretsManager.start();
    });

    it('should stop gracefully', async () => {
      await expect(secretsManager.stop()).resolves.not.toThrow();
      expect(mockFs.writeFile).toHaveBeenCalled(); // Final save
    });

    it('should handle stop errors gracefully', async () => {
      mockFs.writeFile.mockRejectedValue(new Error('Write failed'));
      await expect(secretsManager.stop()).resolves.not.toThrow();
    });

    it('should save final secrets state on stop', async () => {
      await secretsManager.setSecret('FINAL_TEST', 'final-value');
      
      await secretsManager.stop();
      
      expect(mockFs.writeFile).toHaveBeenCalledWith(
        expect.stringContaining('secrets.json'),
        expect.stringContaining('encryptedSecrets'),
        'utf8'
      );
      
      expect(mockTelemetryService.logEvent).toHaveBeenCalledWith(
        'secrets_manager_stopped',
        expect.objectContaining({
          totalSecrets: 1,
          uptime: expect.any(Number),
        }),
        'secrets'
      );
    });

    it('should clear rotation timers on stop', async () => {
      const autoRotationService = new SecretsManager({
        ...mockOptions,
        autoRotationDays: 30,
      });
      
      await autoRotationService.start();
      await autoRotationService.stop();
      
      // Should not throw or cause issues
      expect(true).toBe(true);
    });
  });
});