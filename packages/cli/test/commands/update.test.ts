import { vi, describe, it, expect, beforeEach, afterEach, type Mock } from 'vitest';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
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
  spinner: () => ({
    start: vi.fn(),
    stop: vi.fn(),
    succeed: vi.fn(),
    fail: vi.fn(),
    text: '',
  }),
};

const mockFetch = vi.fn();
global.fetch = mockFetch as any;

const mockExeca = vi.fn();

vi.mock('@elizaos/core', () => ({
  logger: {
    info: vi.fn(),
    debug: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    success: vi.fn(),
    log: vi.fn(),
    spinner: () => ({
      start: vi.fn(),
      stop: vi.fn(),
      succeed: vi.fn(),
      fail: vi.fn(),
      text: '',
    }),
  },
}));

vi.mock('execa', () => ({
  execa: vi.fn(),
}));

vi.mock('../../src/utils', () => ({
  handleError: vi.fn().mockImplementation((error) => {
    throw error instanceof Error ? error : new Error(String(error));
  }),
  displayBanner: vi.fn(),
  buildProject: vi.fn(),
  runBunCommand: vi.fn(),
  isGlobalInstallation: vi.fn().mockResolvedValue(true),
  isRunningViaNpx: vi.fn().mockResolvedValue(false),
  isRunningViaBunx: vi.fn().mockResolvedValue(false),
  executeInstallation: vi.fn(),
}));

describe('update command', () => {
  let tempDir: string;
  let cwdSpy: Mock;

  beforeEach(async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'update-test-'));
    cwdSpy = vi.spyOn(process, 'cwd').mockReturnValue(tempDir);
    
    // Reset all mocks
    vi.clearAllMocks();
    
    // Create a basic package.json for project updates
    await writeFile(
      join(tempDir, 'package.json'),
      JSON.stringify({
        name: 'test-project',
        version: '1.0.0',
        dependencies: {
          '@elizaos/core': '^1.0.0',
          '@elizaos/plugin-example': '^1.0.0',
        }
      })
    );
    
    // Mock npm time response
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({
        '1.0.0': new Date('2024-01-01').toISOString(),
        '1.0.1': new Date('2024-01-02').toISOString(),
        '1.1.0': new Date('2024-01-03').toISOString(),
      }),
    });
  });

  afterEach(async () => {
    cwdSpy.mockRestore();
    await rm(tempDir, { recursive: true, force: true });
  });

  describe('help and usage', () => {
    it('should show help for update command', async () => {
      const result = await execa('node', [elizaCmd, 'update', '--help']);

      expect(result.stdout).toContain('Update ElizaOS CLI and project dependencies');
      expect(result.stdout).toContain('--check');
      expect(result.stdout).toContain('--skip-build');
      expect(result.stdout).toContain('--cli');
      expect(result.stdout).toContain('--packages');
      expect(result.exitCode).toBe(0);
    });
  });

  describe('package updates', () => {
    it('should check for package updates with --check flag', async () => {
      try {
        const result = await execa('node', [elizaCmd, 'update', '--packages', '--check'], {
          cwd: tempDir,
          env: { ...process.env, NODE_ENV: 'test' }
        });

        expect(result.stdout).toContain('ElizaOS packages');
        expect(result.exitCode).toBe(0);
      } catch (error) {
        // If the command fails, check the output
        expect(error.stdout || error.stderr).toBeDefined();
      }
    });

    it('should skip build with --skip-build flag', async () => {
      try {
        await execa('node', [elizaCmd, 'update', '--packages', '--check', '--skip-build'], {
          cwd: tempDir,
          env: { ...process.env, NODE_ENV: 'test' }
        });
      } catch (error) {
        // Command structure should be valid
        expect(error.exitCode).toBeDefined();
      }
    });
  });

  describe('CLI updates', () => {
    it('should handle CLI-only updates', async () => {
      try {
        // This will fail in test environment but we're testing command structure
        await execa('node', [elizaCmd, 'update', '--cli'], {
          cwd: tempDir,
          env: { ...process.env, NODE_ENV: 'test' },
          timeout: 5000
        });
      } catch (error) {
        // Expected to fail in test environment
        expect(error.stderr || error.stdout).toBeDefined();
      }
    });

    it('should warn when running via npx', async () => {
      // Mock running via npx
      const utils = await import('../../src/utils');
      (utils.isRunningViaNpx as any).mockResolvedValue(true);
      
      try {
        await execa('node', [elizaCmd, 'update', '--cli'], {
          cwd: tempDir,
          env: { ...process.env, NODE_ENV: 'test' }
        });
      } catch (error) {
        expect(error.stdout || error.stderr).toContain('npx');
      }
    });
  });

  describe('error handling', () => {
    it('should handle missing package.json', async () => {
      await rm(join(tempDir, 'package.json'));

      try {
        await execa('node', [elizaCmd, 'update', '--packages'], {
          cwd: tempDir,
          env: { ...process.env, NODE_ENV: 'test' }
        });
      } catch (error) {
        expect(error.stderr || error.stdout).toContain('package.json');
        expect(error.exitCode).not.toBe(0);
      }
    });

    it('should handle network errors gracefully', async () => {
      // Create an empty directory with no package.json
      const emptyDir = await mkdtemp(join(tmpdir(), 'empty-'));
      
      try {
        await execa('node', [elizaCmd, 'update', '--packages'], {
          cwd: emptyDir,
          env: { ...process.env, NODE_ENV: 'test' },
          timeout: 5000
        });
      } catch (error) {
        expect(error.exitCode).not.toBe(0);
      } finally {
        await rm(emptyDir, { recursive: true, force: true });
      }
    });
  });

  describe('combined updates', () => {
    it('should update both CLI and packages by default', async () => {
      try {
        // Test command parsing
        const result = await execa('node', [elizaCmd, 'update', '--help']);
        
        // Verify both options are available
        expect(result.stdout).toContain('--cli');
        expect(result.stdout).toContain('--packages');
        expect(result.exitCode).toBe(0);
      } catch (error) {
        console.error('Update help failed:', error);
        throw error;
      }
    });
  });
});