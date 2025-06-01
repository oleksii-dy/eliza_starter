import { vi, describe, it, expect, beforeEach, afterEach, type Mock } from 'vitest';
import { env } from '../../src/commands/env';
import { mkdtemp, rm, writeFile, readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { existsSync } from 'node:fs';

// Mock dependencies
const mockLogger = {
  info: vi.fn(),
  debug: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
  success: vi.fn(),
  log: vi.fn(),
  table: vi.fn(),
};

const mockPrompts = vi.fn();
const mockHandleError = vi.fn().mockImplementation((error) => {
  throw error instanceof Error ? error : new Error(String(error));
});

const mockUpdateEnvVariable = vi.fn();
const mockValidateEnvVariable = vi.fn();
const mockResolveEnvFile = vi.fn();

vi.mock('@elizaos/core', () => ({
  logger: mockLogger,
}));

vi.mock('prompts', () => ({
  default: mockPrompts,
}));

vi.mock('../../src/utils', () => ({
  handleError: mockHandleError,
  displayBanner: vi.fn(),
  resolveEnvFile: mockResolveEnvFile,
  UserEnvironment: {
    getInstance: vi.fn().mockReturnValue({
      getInfo: vi.fn().mockResolvedValue({
        paths: {
          elizaDir: '/mock/.eliza',
          envFilePath: '/mock/.env',
        },
      }),
    }),
  },
}));

vi.mock('../../src/utils/env-utils', () => ({
  updateEnvVariable: mockUpdateEnvVariable,
  validateEnvVariable: mockValidateEnvVariable,
  EnvSchema: {
    OPENAI_API_KEY: { required: true, description: 'OpenAI API Key' },
    ANTHROPIC_API_KEY: { required: false, description: 'Anthropic API Key' },
    DATABASE_URL: { required: false, description: 'Database URL' },
  },
}));

describe('env command', () => {
  let tempDir: string;
  let cwdSpy: Mock;

  beforeEach(async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'env-test-'));
    cwdSpy = vi.spyOn(process, 'cwd').mockReturnValue(tempDir);
    
    // Reset all mocks
    vi.clearAllMocks();
    
    // Default mock implementations
    mockResolveEnvFile.mockReturnValue(join(tempDir, '.env'));
    mockValidateEnvVariable.mockReturnValue({ valid: true });
    mockUpdateEnvVariable.mockResolvedValue(undefined);
  });

  afterEach(async () => {
    cwdSpy.mockRestore();
    await rm(tempDir, { recursive: true, force: true });
  });

  describe('set environment variables', () => {
    it('should set a single environment variable', async () => {
      const action = (env as any)._actionHandler;
      
      await action(['OPENAI_API_KEY=test-key'], {});

      expect(mockValidateEnvVariable).toHaveBeenCalledWith('OPENAI_API_KEY', 'test-key');
      expect(mockUpdateEnvVariable).toHaveBeenCalledWith(
        join(tempDir, '.env'),
        'OPENAI_API_KEY',
        'test-key'
      );
      expect(mockLogger.success).toHaveBeenCalledWith(
        expect.stringContaining('Updated OPENAI_API_KEY')
      );
    });

    it('should set multiple environment variables', async () => {
      const action = (env as any)._actionHandler;
      
      await action([
        'OPENAI_API_KEY=test-openai',
        'ANTHROPIC_API_KEY=test-anthropic',
      ], {});

      expect(mockUpdateEnvVariable).toHaveBeenCalledTimes(2);
      expect(mockUpdateEnvVariable).toHaveBeenCalledWith(
        join(tempDir, '.env'),
        'OPENAI_API_KEY',
        'test-openai'
      );
      expect(mockUpdateEnvVariable).toHaveBeenCalledWith(
        join(tempDir, '.env'),
        'ANTHROPIC_API_KEY',
        'test-anthropic'
      );
    });

    it('should handle invalid variable format', async () => {
      const action = (env as any)._actionHandler;
      
      await expect(action(['INVALID_FORMAT'], {})).rejects.toThrow();
      
      expect(mockLogger.error).toHaveBeenCalledWith(
        expect.stringContaining('Invalid format')
      );
    });

    it('should validate environment variable values', async () => {
      mockValidateEnvVariable.mockReturnValue({
        valid: false,
        error: 'Invalid API key format',
      });

      const action = (env as any)._actionHandler;
      
      await expect(action(['OPENAI_API_KEY=invalid'], {})).rejects.toThrow();
      
      expect(mockLogger.error).toHaveBeenCalledWith(
        expect.stringContaining('Invalid API key format')
      );
    });

    it('should use custom env file path', async () => {
      const customEnvPath = join(tempDir, 'custom.env');
      mockResolveEnvFile.mockReturnValue(customEnvPath);

      const action = (env as any)._actionHandler;
      
      await action(['TEST_VAR=value'], { envFile: customEnvPath });

      expect(mockResolveEnvFile).toHaveBeenCalledWith(customEnvPath);
      expect(mockUpdateEnvVariable).toHaveBeenCalledWith(
        customEnvPath,
        'TEST_VAR',
        'value'
      );
    });

    it('should handle empty values', async () => {
      const action = (env as any)._actionHandler;
      
      await action(['EMPTY_VAR='], {});

      expect(mockUpdateEnvVariable).toHaveBeenCalledWith(
        join(tempDir, '.env'),
        'EMPTY_VAR',
        ''
      );
    });

    it('should handle values with equals signs', async () => {
      const action = (env as any)._actionHandler;
      
      await action(['DATABASE_URL=postgres://user:pass@host:5432/db?ssl=true'], {});

      expect(mockUpdateEnvVariable).toHaveBeenCalledWith(
        join(tempDir, '.env'),
        'DATABASE_URL',
        'postgres://user:pass@host:5432/db?ssl=true'
      );
    });
  });

  describe('interactive mode', () => {
    it('should prompt for environment variables when none provided', async () => {
      mockPrompts
        .mockResolvedValueOnce({ variableName: 'OPENAI_API_KEY' })
        .mockResolvedValueOnce({ value: 'test-key-interactive' })
        .mockResolvedValueOnce({ continue: false });

      const action = (env as any)._actionHandler;
      
      await action([], {});

      expect(mockPrompts).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'select',
          name: 'variableName',
          message: 'Select an environment variable to set:',
        })
      );

      expect(mockUpdateEnvVariable).toHaveBeenCalledWith(
        join(tempDir, '.env'),
        'OPENAI_API_KEY',
        'test-key-interactive'
      );
    });

    it('should continue prompting when requested', async () => {
      mockPrompts
        .mockResolvedValueOnce({ variableName: 'OPENAI_API_KEY' })
        .mockResolvedValueOnce({ value: 'key1' })
        .mockResolvedValueOnce({ continue: true })
        .mockResolvedValueOnce({ variableName: 'ANTHROPIC_API_KEY' })
        .mockResolvedValueOnce({ value: 'key2' })
        .mockResolvedValueOnce({ continue: false });

      const action = (env as any)._actionHandler;
      
      await action([], {});

      expect(mockUpdateEnvVariable).toHaveBeenCalledTimes(2);
    });

    it('should mask sensitive values in prompts', async () => {
      mockPrompts
        .mockResolvedValueOnce({ variableName: 'OPENAI_API_KEY' })
        .mockResolvedValueOnce({ value: 'secret-key' })
        .mockResolvedValueOnce({ continue: false });

      const action = (env as any)._actionHandler;
      
      await action([], {});

      // Check that password type is used for sensitive values
      const valuePrompt = mockPrompts.mock.calls.find(
        call => call[0].name === 'value'
      );
      expect(valuePrompt[0].type).toBe('password');
    });

    it('should handle custom variables in interactive mode', async () => {
      mockPrompts
        .mockResolvedValueOnce({ variableName: 'custom' })
        .mockResolvedValueOnce({ customName: 'CUSTOM_VAR' })
        .mockResolvedValueOnce({ value: 'custom-value' })
        .mockResolvedValueOnce({ continue: false });

      const action = (env as any)._actionHandler;
      
      await action([], {});

      expect(mockUpdateEnvVariable).toHaveBeenCalledWith(
        join(tempDir, '.env'),
        'CUSTOM_VAR',
        'custom-value'
      );
    });
  });

  describe('list environment variables', () => {
    it('should list all environment variables with --list flag', async () => {
      const envContent = `
OPENAI_API_KEY=test-key
ANTHROPIC_API_KEY=test-anthropic
# Comment line
CUSTOM_VAR=custom-value
`;
      await writeFile(join(tempDir, '.env'), envContent);

      const action = (env as any)._actionHandler;
      
      await action([], { list: true });

      expect(mockLogger.info).toHaveBeenCalledWith(
        expect.stringContaining('Environment variables')
      );
      expect(mockLogger.table).toHaveBeenCalledWith([
        { Variable: 'OPENAI_API_KEY', Value: 'test-***' },
        { Variable: 'ANTHROPIC_API_KEY', Value: 'test-***' },
        { Variable: 'CUSTOM_VAR', Value: 'custom-value' },
      ]);
    });

    it('should handle empty env file when listing', async () => {
      await writeFile(join(tempDir, '.env'), '');

      const action = (env as any)._actionHandler;
      
      await action([], { list: true });

      expect(mockLogger.info).toHaveBeenCalledWith(
        expect.stringContaining('No environment variables found')
      );
    });

    it('should handle non-existent env file when listing', async () => {
      const action = (env as any)._actionHandler;
      
      await action([], { list: true });

      expect(mockLogger.info).toHaveBeenCalledWith(
        expect.stringContaining('No .env file found')
      );
    });
  });

  describe('validation and error handling', () => {
    it('should validate known environment variables', async () => {
      mockValidateEnvVariable.mockReturnValue({
        valid: false,
        error: 'API key must start with sk-',
      });

      const action = (env as any)._actionHandler;
      
      await expect(action(['OPENAI_API_KEY=invalid-key'], {})).rejects.toThrow();
      
      expect(mockLogger.error).toHaveBeenCalledWith(
        expect.stringContaining('API key must start with sk-')
      );
    });

    it('should allow any value for unknown variables', async () => {
      const action = (env as any)._actionHandler;
      
      await action(['UNKNOWN_VAR=any-value'], {});

      expect(mockValidateEnvVariable).not.toHaveBeenCalled();
      expect(mockUpdateEnvVariable).toHaveBeenCalledWith(
        join(tempDir, '.env'),
        'UNKNOWN_VAR',
        'any-value'
      );
    });

    it('should handle file write errors', async () => {
      mockUpdateEnvVariable.mockRejectedValue(new Error('Permission denied'));

      const action = (env as any)._actionHandler;
      
      await expect(action(['TEST_VAR=value'], {})).rejects.toThrow('Permission denied');
      
      expect(mockHandleError).toHaveBeenCalledWith(
        expect.objectContaining({ message: 'Permission denied' })
      );
    });

    it('should handle interrupt in interactive mode', async () => {
      mockPrompts.mockRejectedValue(new Error('User cancelled'));

      const action = (env as any)._actionHandler;
      
      // Should not throw, just exit gracefully
      await action([], {});

      expect(mockLogger.info).toHaveBeenCalledWith('Environment configuration cancelled');
    });
  });

  describe('special cases', () => {
    it('should handle quotes in values', async () => {
      const action = (env as any)._actionHandler;
      
      await action(['QUOTED_VAR="value with spaces"'], {});

      expect(mockUpdateEnvVariable).toHaveBeenCalledWith(
        join(tempDir, '.env'),
        'QUOTED_VAR',
        '"value with spaces"'
      );
    });

    it('should handle special characters in values', async () => {
      const action = (env as any)._actionHandler;
      
      await action(['SPECIAL_VAR=value!@#$%^&*()'], {});

      expect(mockUpdateEnvVariable).toHaveBeenCalledWith(
        join(tempDir, '.env'),
        'SPECIAL_VAR',
        'value!@#$%^&*()'
      );
    });

    it('should create env file if it does not exist', async () => {
      const envPath = join(tempDir, '.env');
      expect(existsSync(envPath)).toBe(false);

      mockUpdateEnvVariable.mockImplementation(async (path, key, value) => {
        await writeFile(path, `${key}=${value}\n`);
      });

      const action = (env as any)._actionHandler;
      
      await action(['NEW_VAR=value'], {});

      expect(existsSync(envPath)).toBe(true);
      const content = await readFile(envPath, 'utf-8');
      expect(content).toContain('NEW_VAR=value');
    });

    it('should preserve existing variables when adding new ones', async () => {
      const envPath = join(tempDir, '.env');
      await writeFile(envPath, 'EXISTING_VAR=existing\n');

      mockUpdateEnvVariable.mockImplementation(async (path, key, value) => {
        const content = await readFile(path, 'utf-8');
        await writeFile(path, content + `${key}=${value}\n`);
      });

      const action = (env as any)._actionHandler;
      
      await action(['NEW_VAR=new'], {});

      const content = await readFile(envPath, 'utf-8');
      expect(content).toContain('EXISTING_VAR=existing');
      expect(content).toContain('NEW_VAR=new');
    });
  });
});