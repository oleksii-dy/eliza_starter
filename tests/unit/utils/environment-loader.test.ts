import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { EnvironmentLoader } from '../../../src/utils/environment-loader';
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';

// Mock dependencies
vi.mock('../../../src/utils/user-environment', () => ({
  UserEnvironment: {
    getInstance: vi.fn(),
  },
}));

vi.mock('../../../src/utils/env-prompt', () => ({
  readEnvFile: vi.fn().mockResolvedValue({}),
}));

vi.mock('dotenv', () => ({
  default: {
    config: vi.fn().mockReturnValue({ parsed: {} }),
  },
}));

vi.mock('@elizaos/core', () => ({
  logger: {
    debug: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
  },
}));

describe('EnvironmentLoader', () => {
  let tempDir: string;
  let originalEnv: NodeJS.ProcessEnv;
  let mockUserEnvironment: any;

  beforeEach(() => {
    // Create temporary directory for test .env files
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'eliza-env-test-'));
    
    // Save original environment
    originalEnv = { ...process.env };
    
    // Clear process.env for clean tests
    for (const key in process.env) {
      if (key.startsWith('TEST_') || key.includes('API_KEY') || key === 'LOG_LEVEL') {
        delete process.env[key];
      }
    }

    // Mock UserEnvironment
    mockUserEnvironment = {
      getPathInfo: vi.fn().mockResolvedValue({
        envFilePath: path.join(tempDir, '.env'),
        monorepoRoot: tempDir,
      }),
    };

    const { UserEnvironment } = require('../../../src/utils/user-environment');
    UserEnvironment.getInstance = vi.fn().mockReturnValue(mockUserEnvironment);

    // Reset singleton instance
    (EnvironmentLoader as any).instance = undefined;
  });

  afterEach(() => {
    // Restore original environment
    process.env = originalEnv;
    
    // Clean up temp directory
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }

    vi.clearAllMocks();
  });

  describe('Singleton Pattern', () => {
    it('should return the same instance', () => {
      const instance1 = EnvironmentLoader.getInstance();
      const instance2 = EnvironmentLoader.getInstance();
      expect(instance1).toBe(instance2);
    });
  });

  describe('Environment Loading', () => {
    it('should load environment variables from .env file', async () => {
      // Create test .env file
      const envPath = path.join(tempDir, '.env');
      fs.writeFileSync(envPath, 'TEST_VAR=test_value\nOPENAI_API_KEY=sk-test123\n');

      // Mock dotenv to actually read the file
      const dotenv = require('dotenv');
      dotenv.config = vi.fn((options) => {
        const content = fs.readFileSync(options.path, 'utf8');
        const lines = content.split('\n');
        for (const line of lines) {
          if (line && !line.startsWith('#')) {
            const [key, value] = line.split('=');
            if (key && value) {
              process.env[key] = value;
            }
          }
        }
        return { parsed: { TEST_VAR: 'test_value', OPENAI_API_KEY: 'sk-test123' } };
      });

      const loader = EnvironmentLoader.getInstance();
      await loader.load();

      expect(loader.get('TEST_VAR')).toBe('test_value');
      expect(loader.get('OPENAI_API_KEY')).toBe('sk-test123');
      expect(loader.isLoaded()).toBe(true);
    });

    it('should prioritize process.env over .env file', async () => {
      // Set environment variable
      process.env.TEST_VAR = 'process_value';
      
      // Create .env file with different value
      const envPath = path.join(tempDir, '.env');
      fs.writeFileSync(envPath, 'TEST_VAR=file_value\n');

      const loader = EnvironmentLoader.getInstance();
      await loader.load();

      expect(loader.get('TEST_VAR')).toBe('process_value');
    });

    it('should handle missing .env file gracefully', async () => {
      const loader = EnvironmentLoader.getInstance();
      await expect(loader.load()).resolves.not.toThrow();
      expect(loader.isLoaded()).toBe(true);
    });

    it('should not reload if already loaded unless forced', async () => {
      const loader = EnvironmentLoader.getInstance();
      await loader.load();
      
      const dotenv = require('dotenv');
      const configSpy = vi.spyOn(dotenv, 'config');
      
      // Second load should not call dotenv.config again
      await loader.load();
      expect(configSpy).toHaveBeenCalledTimes(0);
      
      // Force reload should call dotenv.config
      await loader.load({ force: true });
      expect(configSpy).toHaveBeenCalledTimes(1);
    });
  });

  describe('Environment Variable Access', () => {
    beforeEach(async () => {
      process.env.TEST_STRING = 'test_value';
      process.env.TEST_BOOLEAN_TRUE = 'true';
      process.env.TEST_BOOLEAN_FALSE = 'false';
      process.env.TEST_NUMBER = '42';
      process.env.TEST_EMPTY = '';
      
      const loader = EnvironmentLoader.getInstance();
      await loader.load();
    });

    describe('get()', () => {
      it('should return environment variable value', () => {
        const loader = EnvironmentLoader.getInstance();
        expect(loader.get('TEST_STRING')).toBe('test_value');
      });

      it('should return undefined for non-existent variable', () => {
        const loader = EnvironmentLoader.getInstance();
        expect(loader.get('NON_EXISTENT')).toBeUndefined();
      });

      it('should fallback to process.env if not loaded', () => {
        const loader = new (EnvironmentLoader as any)();
        expect(loader.get('TEST_STRING')).toBe('test_value');
      });
    });

    describe('getRequired()', () => {
      it('should return value for existing variable', () => {
        const loader = EnvironmentLoader.getInstance();
        expect(loader.getRequired('TEST_STRING')).toBe('test_value');
      });

      it('should throw for missing variable', () => {
        const loader = EnvironmentLoader.getInstance();
        expect(() => loader.getRequired('NON_EXISTENT')).toThrow();
      });

      it('should throw for empty variable', () => {
        const loader = EnvironmentLoader.getInstance();
        expect(() => loader.getRequired('TEST_EMPTY')).toThrow();
      });
    });

    describe('getBoolean()', () => {
      it('should return true for truthy values', () => {
        const loader = EnvironmentLoader.getInstance();
        process.env.TEST_TRUE_1 = 'true';
        process.env.TEST_TRUE_2 = 'TRUE';
        process.env.TEST_TRUE_3 = '1';
        process.env.TEST_TRUE_4 = 'yes';
        
        expect(loader.getBoolean('TEST_TRUE_1')).toBe(true);
        expect(loader.getBoolean('TEST_TRUE_2')).toBe(true);
        expect(loader.getBoolean('TEST_TRUE_3')).toBe(true);
        expect(loader.getBoolean('TEST_TRUE_4')).toBe(true);
      });

      it('should return false for falsy values', () => {
        const loader = EnvironmentLoader.getInstance();
        process.env.TEST_FALSE_1 = 'false';
        process.env.TEST_FALSE_2 = '0';
        process.env.TEST_FALSE_3 = 'no';
        
        expect(loader.getBoolean('TEST_FALSE_1')).toBe(false);
        expect(loader.getBoolean('TEST_FALSE_2')).toBe(false);
        expect(loader.getBoolean('TEST_FALSE_3')).toBe(false);
      });

      it('should return default value for missing variable', () => {
        const loader = EnvironmentLoader.getInstance();
        expect(loader.getBoolean('NON_EXISTENT')).toBe(false);
        expect(loader.getBoolean('NON_EXISTENT', true)).toBe(true);
      });
    });

    describe('getNumber()', () => {
      it('should return numeric value', () => {
        const loader = EnvironmentLoader.getInstance();
        expect(loader.getNumber('TEST_NUMBER')).toBe(42);
      });

      it('should return default for invalid number', () => {
        const loader = EnvironmentLoader.getInstance();
        process.env.TEST_INVALID_NUMBER = 'not_a_number';
        expect(loader.getNumber('TEST_INVALID_NUMBER')).toBe(0);
        expect(loader.getNumber('TEST_INVALID_NUMBER', 100)).toBe(100);
      });

      it('should return default for missing variable', () => {
        const loader = EnvironmentLoader.getInstance();
        expect(loader.getNumber('NON_EXISTENT')).toBe(0);
        expect(loader.getNumber('NON_EXISTENT', 42)).toBe(42);
      });
    });
  });

  describe('Character Scoped Variables', () => {
    beforeEach(async () => {
      process.env['CHARACTER.alice.API_KEY'] = 'alice_key';
      process.env['CHARACTER.alice.SECRET'] = 'alice_secret';
      process.env['CHARACTER.bob.API_KEY'] = 'bob_key';
      process.env['REGULAR_VAR'] = 'regular_value';
      
      const loader = EnvironmentLoader.getInstance();
      await loader.load();
    });

    it('should return character-scoped variables', () => {
      const loader = EnvironmentLoader.getInstance();
      
      const aliceVars = loader.getCharacterScoped('alice');
      expect(aliceVars).toEqual({
        API_KEY: 'alice_key',
        SECRET: 'alice_secret',
      });

      const bobVars = loader.getCharacterScoped('bob');
      expect(bobVars).toEqual({
        API_KEY: 'bob_key',
      });
    });

    it('should return empty object for non-existent character', () => {
      const loader = EnvironmentLoader.getInstance();
      const charlieVars = loader.getCharacterScoped('charlie');
      expect(charlieVars).toEqual({});
    });
  });

  describe('Validation', () => {
    describe('Model Provider Validation', () => {
      it('should pass validation with valid model provider', async () => {
        process.env.OPENAI_API_KEY = 'sk-test123';
        
        const loader = EnvironmentLoader.getInstance();
        await loader.load();
        
        const result = await loader.validate();
        expect(result.success).toBe(true);
        expect(result.hasModelProvider).toBe(true);
        expect(result.errors).toHaveLength(0);
      });

      it('should fail validation without model provider', async () => {
        const loader = EnvironmentLoader.getInstance();
        await loader.load();
        
        const result = await loader.validate();
        expect(result.success).toBe(false);
        expect(result.hasModelProvider).toBe(false);
        expect(result.errors).toContain(
          expect.stringContaining('At least one model provider must be configured')
        );
      });

      it('should ignore dummy keys as model providers', async () => {
        process.env.OPENAI_API_KEY = 'dummy_key';
        
        const loader = EnvironmentLoader.getInstance();
        await loader.load();
        
        const result = await loader.validate();
        expect(result.success).toBe(false);
        expect(result.hasModelProvider).toBe(false);
      });
    });

    describe('Service Validation', () => {
      it('should validate Discord configuration', async () => {
        process.env.OPENAI_API_KEY = 'sk-test123';
        
        // Valid Discord config
        process.env.DISCORD_API_TOKEN = 'token123';
        process.env.DISCORD_APPLICATION_ID = 'app123';
        
        const loader = EnvironmentLoader.getInstance();
        await loader.load();
        
        const result = await loader.validate();
        expect(result.success).toBe(true);
        expect(result.errors).toHaveLength(0);
      });

      it('should fail Discord validation with missing application ID', async () => {
        process.env.OPENAI_API_KEY = 'sk-test123';
        process.env.DISCORD_API_TOKEN = 'token123';
        // Missing DISCORD_APPLICATION_ID
        
        const loader = EnvironmentLoader.getInstance();
        await loader.load();
        
        const result = await loader.validate();
        expect(result.success).toBe(false);
        expect(result.errors).toContain(
          'DISCORD_APPLICATION_ID is required when DISCORD_API_TOKEN is provided'
        );
      });

      it('should validate Twitter configuration', async () => {
        process.env.OPENAI_API_KEY = 'sk-test123';
        
        // Partial Twitter config (should fail)
        process.env.TWITTER_API_KEY = 'key123';
        process.env.TWITTER_API_SECRET = 'secret123';
        // Missing TWITTER_ACCESS_TOKEN and TWITTER_ACCESS_TOKEN_SECRET
        
        const loader = EnvironmentLoader.getInstance();
        await loader.load();
        
        const result = await loader.validate();
        expect(result.success).toBe(false);
        expect(result.errors).toContain(
          expect.stringContaining('Twitter integration requires all credentials')
        );
      });

      it('should pass Twitter validation with all credentials', async () => {
        process.env.OPENAI_API_KEY = 'sk-test123';
        process.env.TWITTER_API_KEY = 'key123';
        process.env.TWITTER_API_SECRET = 'secret123';
        process.env.TWITTER_ACCESS_TOKEN = 'token123';
        process.env.TWITTER_ACCESS_TOKEN_SECRET = 'token_secret123';
        
        const loader = EnvironmentLoader.getInstance();
        await loader.load();
        
        const result = await loader.validate();
        expect(result.success).toBe(true);
        expect(result.errors).toHaveLength(0);
      });
    });

    describe('Warning Generation', () => {
      it('should warn about legacy environment variables', async () => {
        process.env.OPENAI_API_KEY = 'sk-test123';
        process.env.CLAUDE_API_KEY = 'claude-key';
        process.env.WALLET_PRIVATE_KEY = 'wallet-key';
        
        const loader = EnvironmentLoader.getInstance();
        await loader.load();
        
        const result = await loader.validate();
        expect(result.warnings).toContain(
          expect.stringContaining('CLAUDE_API_KEY is deprecated')
        );
        expect(result.warnings).toContain(
          expect.stringContaining('WALLET_PRIVATE_KEY is deprecated')
        );
      });

      it('should warn about conflicting database URLs', async () => {
        process.env.OPENAI_API_KEY = 'sk-test123';
        process.env.POSTGRES_URL = 'postgres://localhost:5432/db1';
        process.env.DATABASE_URL = 'postgres://localhost:5432/db2';
        
        const loader = EnvironmentLoader.getInstance();
        await loader.load();
        
        const result = await loader.validate();
        expect(result.warnings).toContain(
          expect.stringContaining('Both POSTGRES_URL and DATABASE_URL are set')
        );
      });
    });
  });

  describe('Security and Filtering', () => {
    beforeEach(async () => {
      process.env.OPENAI_API_KEY = 'sk-sensitive123';
      process.env.DISCORD_API_TOKEN = 'sensitive_token';
      process.env.LOG_LEVEL = 'info';
      process.env.PUBLIC_VAR = 'public_value';
      
      const loader = EnvironmentLoader.getInstance();
      await loader.load();
    });

    it('should filter sensitive variables by default', () => {
      const loader = EnvironmentLoader.getInstance();
      const filtered = loader.getAll(false);
      
      expect(filtered.OPENAI_API_KEY).toBe('[REDACTED]');
      expect(filtered.DISCORD_API_TOKEN).toBe('[REDACTED]');
      expect(filtered.LOG_LEVEL).toBe('info');
      expect(filtered.PUBLIC_VAR).toBe('public_value');
    });

    it('should include sensitive variables when requested', () => {
      const loader = EnvironmentLoader.getInstance();
      const unfiltered = loader.getAll(true);
      
      expect(unfiltered.OPENAI_API_KEY).toBe('sk-sensitive123');
      expect(unfiltered.DISCORD_API_TOKEN).toBe('sensitive_token');
      expect(unfiltered.LOG_LEVEL).toBe('info');
      expect(unfiltered.PUBLIC_VAR).toBe('public_value');
    });
  });

  describe('Error Handling', () => {
    it('should handle dotenv loading errors gracefully', async () => {
      const dotenv = require('dotenv');
      dotenv.config = vi.fn().mockReturnValue({
        error: new Error('Permission denied'),
      });

      const loader = EnvironmentLoader.getInstance();
      await expect(loader.load()).resolves.not.toThrow();
      expect(loader.isLoaded()).toBe(true);
    });

    it('should handle UserEnvironment errors', async () => {
      mockUserEnvironment.getPathInfo.mockRejectedValue(new Error('Path error'));
      
      const loader = EnvironmentLoader.getInstance();
      await expect(loader.load()).rejects.toThrow('Environment loading failed');
    });

    it('should handle validation errors', async () => {
      const loader = EnvironmentLoader.getInstance();
      await loader.load();
      
      // Mock schema parsing error
      const originalSafeParse = require('zod').z.object().safeParse;
      vi.spyOn(require('zod').z.object(), 'safeParse').mockReturnValue({
        success: false,
        error: {
          issues: [{ path: ['TEST_VAR'], message: 'Invalid format' }],
        },
      });
      
      const result = await loader.validate();
      expect(result.success).toBe(false);
      expect(result.errors).toContain(expect.stringContaining('Invalid format'));
    });
  });

  describe('Utility Methods', () => {
    it('should return environment file path', async () => {
      const loader = EnvironmentLoader.getInstance();
      await loader.load();
      
      expect(loader.getEnvFilePath()).toBe(path.join(tempDir, '.env'));
    });

    it('should track loaded state', () => {
      const loader = EnvironmentLoader.getInstance();
      expect(loader.isLoaded()).toBe(false);
    });
  });
});