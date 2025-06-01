import { vi, describe, it, expect, beforeEach, afterEach, type Mock } from 'vitest';
import { mkdtemp, rm, writeFile, readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { existsSync } from 'node:fs';
import { execa } from 'execa';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const elizaCmd = path.join(__dirname, '../../dist/index.js');

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

vi.mock('@elizaos/core', () => ({
  logger: {
    info: vi.fn(),
    debug: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    success: vi.fn(),
    log: vi.fn(),
    table: vi.fn(),
  },
}));

vi.mock('prompts', () => ({
  default: vi.fn(),
}));

vi.mock('../../src/utils', () => ({
  handleError: vi.fn().mockImplementation((error) => {
    throw error instanceof Error ? error : new Error(String(error));
  }),
  displayBanner: vi.fn(),
  resolveEnvFile: vi.fn(),
  resolvePgliteDir: vi.fn().mockReturnValue('/mock/.eliza/db'),
  UserEnvironment: {
    getInstance: vi.fn().mockReturnValue({
      getInfo: vi.fn().mockResolvedValue({
        paths: {
          elizaDir: '/mock/.eliza',
          envFilePath: '/mock/.env',
        },
      }),
    }),
    getInstanceInfo: vi.fn().mockResolvedValue({
      paths: {
        elizaDir: '/mock/.eliza',
        envFilePath: '/mock/.env',
      },
      os: {
        platform: 'linux',
        release: '5.10.0',
        arch: 'x64',
      },
      cli: {
        version: '1.0.0',
      },
      packageManager: {
        name: 'npm',
        version: '8.0.0',
      },
    }),
  },
}));

beforeEach(async () => {
  // Get the mocked modules after mocking
  const { logger } = await import('@elizaos/core');
  const prompts = await import('prompts');
  
  Object.assign(mockLogger, logger);
  Object.assign(mockPrompts, prompts.default);
});

describe('env command', () => {
  let tempDir: string;
  let cwdSpy: Mock;

  beforeEach(async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'env-test-'));
    cwdSpy = vi.spyOn(process, 'cwd').mockReturnValue(tempDir);
    
    // Reset all mocks
    vi.clearAllMocks();
  });

  afterEach(async () => {
    cwdSpy.mockRestore();
    await rm(tempDir, { recursive: true, force: true });
  });

  describe('list environment variables', () => {
    it('should list all environment variables', async () => {
      const envPath = join(tempDir, '.env');
      const envContent = `OPENAI_API_KEY=test-key
ANTHROPIC_API_KEY=test-anthropic
# Comment line
CUSTOM_VAR=custom-value
`;
      await writeFile(envPath, envContent);

      const result = await execa('node', [elizaCmd, 'env', 'list', '--local'], {
        cwd: tempDir,
        env: { ...process.env, NODE_ENV: 'test' }
      });

      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain('environment variables');
      expect(result.stdout).toContain('OPENAI_API_KEY');
      expect(result.stdout).toContain('ANTHROPIC_API_KEY');
      expect(result.stdout).toContain('CUSTOM_VAR');
    });

    it('should handle empty env file when listing', async () => {
      await writeFile(join(tempDir, '.env'), '');

      const result = await execa('node', [elizaCmd, 'env', 'list', '--local'], {
        cwd: tempDir,
        env: { ...process.env, NODE_ENV: 'test' }
      });

      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain('No local environment variables');
    });

    it('should handle non-existent env file when listing', async () => {
      const result = await execa('node', [elizaCmd, 'env', 'list', '--local'], {
        cwd: tempDir,
        env: { ...process.env, NODE_ENV: 'test' }
      });

      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain('No local .env file found');
    });

    it('should list system information', async () => {
      const result = await execa('node', [elizaCmd, 'env', 'list', '--system'], {
        cwd: tempDir,
        env: { ...process.env, NODE_ENV: 'test' }
      });

      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain('System Information');
      expect(result.stdout).toContain('Platform');
      expect(result.stdout).toContain('CLI Version');
    });
  });

  describe('help and usage', () => {
    it('should show help for env command', async () => {
      const result = await execa('node', [elizaCmd, 'env', '--help']);

      expect(result.stdout).toContain('Manage environment variables');
      expect(result.stdout).toContain('list');
      expect(result.stdout).toContain('edit-local');
      expect(result.stdout).toContain('reset');
      expect(result.stdout).toContain('interactive');
      expect(result.exitCode).toBe(0);
    });

    it('should show subcommand help', async () => {
      const result = await execa('node', [elizaCmd, 'env', 'list', '--help']);

      expect(result.stdout).toContain('List all environment variables');
      expect(result.stdout).toContain('--system');
      expect(result.stdout).toContain('--local');
      expect(result.exitCode).toBe(0);
    });
  });

  describe('reset functionality', () => {
    it('should have reset subcommand', async () => {
      const envPath = join(tempDir, '.env');
      await writeFile(envPath, 'OPENAI_API_KEY=test-key\nCUSTOM_VAR=value\n');

      const result = await execa('node', [elizaCmd, 'env', 'reset', '--help'], {
        cwd: tempDir,
        env: { ...process.env, NODE_ENV: 'test' }
      });

      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain('Reset environment variables');
    });
  });

  describe('interactive mode', () => {
    it('should have interactive subcommand', async () => {
      const result = await execa('node', [elizaCmd, 'env', 'interactive', '--help'], {
        cwd: tempDir,
        env: { ...process.env, NODE_ENV: 'test' }
      });

      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain('Interactive environment variable management');
    });
  });

  describe('edit-local functionality', () => {
    it('should have edit-local subcommand', async () => {
      const result = await execa('node', [elizaCmd, 'env', 'edit-local', '--help'], {
        cwd: tempDir,
        env: { ...process.env, NODE_ENV: 'test' }
      });

      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain('Edit local environment variables');
    });
  });
});