import { vi, describe, it, expect, beforeEach, afterEach, type Mock } from 'vitest';
import { update } from '../../src/commands/update';
import { mkdtemp, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

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
const mockGetVersion = vi.fn();
const mockCheckForUpdate = vi.fn();
const mockHandleError = vi.fn().mockImplementation((error) => {
  throw error instanceof Error ? error : new Error(String(error));
});

vi.mock('@elizaos/core', () => ({
  logger: mockLogger,
}));

vi.mock('execa', () => ({
  execa: mockExeca,
}));

vi.mock('../../src/utils', () => ({
  getVersion: mockGetVersion,
  checkForUpdate: mockCheckForUpdate,
  handleError: mockHandleError,
  displayBanner: vi.fn(),
}));

describe('update command', () => {
  let tempDir: string;
  let cwdSpy: Mock;
  let processExitSpy: Mock;

  beforeEach(async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'update-test-'));
    cwdSpy = vi.spyOn(process, 'cwd').mockReturnValue(tempDir);
    processExitSpy = vi.spyOn(process, 'exit' as any).mockImplementation(() => {
      throw new Error('process.exit called');
    });
    
    // Reset all mocks
    vi.clearAllMocks();
    
    // Default mock implementations
    mockGetVersion.mockReturnValue('1.0.0');
    mockCheckForUpdate.mockResolvedValue({
      hasUpdate: false,
      currentVersion: '1.0.0',
      latestVersion: '1.0.0',
    });
    
    mockExeca.mockResolvedValue({
      stdout: '',
      stderr: '',
      exitCode: 0,
    });
    
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({
        'dist-tags': { latest: '1.0.0' },
      }),
    });
  });

  afterEach(async () => {
    cwdSpy.mockRestore();
    processExitSpy.mockRestore();
    await rm(tempDir, { recursive: true, force: true });
  });

  describe('version checking', () => {
    it('should check for updates and display current version', async () => {
      const action = (update as any)._actionHandler;
      
      await action({});

      expect(mockGetVersion).toHaveBeenCalled();
      expect(mockCheckForUpdate).toHaveBeenCalled();
      expect(mockLogger.info).toHaveBeenCalledWith(
        expect.stringContaining('Current version: 1.0.0')
      );
    });

    it('should detect when update is available', async () => {
      mockCheckForUpdate.mockResolvedValue({
        hasUpdate: true,
        currentVersion: '1.0.0',
        latestVersion: '1.1.0',
      });

      const action = (update as any)._actionHandler;
      
      await action({});

      expect(mockLogger.info).toHaveBeenCalledWith(
        expect.stringContaining('New version available: 1.1.0')
      );
      expect(mockLogger.info).toHaveBeenCalledWith(
        expect.stringContaining('Run update with: elizaos update --yes')
      );
    });

    it('should show when already on latest version', async () => {
      mockCheckForUpdate.mockResolvedValue({
        hasUpdate: false,
        currentVersion: '1.0.0',
        latestVersion: '1.0.0',
      });

      const action = (update as any)._actionHandler;
      
      await action({});

      expect(mockLogger.success).toHaveBeenCalledWith(
        expect.stringContaining('You are already on the latest version')
      );
    });

    it('should check specific version from npm', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({
          'dist-tags': { latest: '1.2.0' },
          versions: {
            '1.0.0': {},
            '1.1.0': {},
            '1.2.0': {},
          },
        }),
      });

      const action = (update as any)._actionHandler;
      
      await action({ check: true });

      expect(mockFetch).toHaveBeenCalledWith(
        'https://registry.npmjs.org/@elizaos/cli'
      );
      expect(mockLogger.info).toHaveBeenCalledWith(
        expect.stringContaining('Latest version: 1.2.0')
      );
    });

    it('should handle npm registry errors', async () => {
      mockFetch.mockRejectedValue(new Error('Network error'));

      const action = (update as any)._actionHandler;
      
      await expect(action({ check: true })).rejects.toThrow();

      expect(mockLogger.error).toHaveBeenCalledWith(
        expect.stringContaining('Failed to check for updates')
      );
    });
  });

  describe('update process', () => {
    it('should update when confirmed with --yes', async () => {
      mockCheckForUpdate.mockResolvedValue({
        hasUpdate: true,
        currentVersion: '1.0.0',
        latestVersion: '1.1.0',
      });

      const spinner = mockLogger.spinner();
      
      const action = (update as any)._actionHandler;
      
      await action({ yes: true });

      expect(spinner.start).toHaveBeenCalledWith('Updating ElizaOS CLI...');
      expect(mockExeca).toHaveBeenCalledWith(
        'npm',
        ['install', '-g', '@elizaos/cli@latest'],
        expect.objectContaining({ stdio: 'inherit' })
      );
      expect(spinner.succeed).toHaveBeenCalledWith(
        'ElizaOS CLI updated successfully to version 1.1.0'
      );
    });

    it('should update to specific version', async () => {
      const action = (update as any)._actionHandler;
      
      await action({ yes: true, version: '1.2.0' });

      expect(mockExeca).toHaveBeenCalledWith(
        'npm',
        ['install', '-g', '@elizaos/cli@1.2.0'],
        expect.objectContaining({ stdio: 'inherit' })
      );
    });

    it('should force update with --force flag', async () => {
      mockCheckForUpdate.mockResolvedValue({
        hasUpdate: false,
        currentVersion: '1.0.0',
        latestVersion: '1.0.0',
      });

      const action = (update as any)._actionHandler;
      
      await action({ yes: true, force: true });

      expect(mockExeca).toHaveBeenCalledWith(
        'npm',
        ['install', '-g', '@elizaos/cli@latest'],
        expect.any(Object)
      );
      expect(mockLogger.info).toHaveBeenCalledWith(
        expect.stringContaining('Forcing update')
      );
    });

    it('should handle update failures', async () => {
      mockCheckForUpdate.mockResolvedValue({
        hasUpdate: true,
        currentVersion: '1.0.0',
        latestVersion: '1.1.0',
      });
      
      mockExeca.mockRejectedValue(new Error('Install failed'));
      
      const spinner = mockLogger.spinner();
      const action = (update as any)._actionHandler;
      
      await expect(action({ yes: true })).rejects.toThrow('Install failed');

      expect(spinner.fail).toHaveBeenCalledWith(
        'Failed to update ElizaOS CLI'
      );
    });

    it('should detect package manager (npm)', async () => {
      mockCheckForUpdate.mockResolvedValue({
        hasUpdate: true,
        currentVersion: '1.0.0',
        latestVersion: '1.1.0',
      });

      // Mock npm check
      mockExeca.mockImplementation((cmd) => {
        if (cmd === 'npm' && cmd.includes('--version')) {
          return Promise.resolve({ stdout: '8.0.0' });
        }
        return Promise.resolve({ stdout: '' });
      });

      const action = (update as any)._actionHandler;
      
      await action({ yes: true });

      expect(mockExeca).toHaveBeenCalledWith(
        'npm',
        expect.arrayContaining(['install', '-g', '@elizaos/cli@latest']),
        expect.any(Object)
      );
    });

    it('should detect package manager (yarn)', async () => {
      mockCheckForUpdate.mockResolvedValue({
        hasUpdate: true,
        currentVersion: '1.0.0',
        latestVersion: '1.1.0',
      });

      // Mock yarn check
      mockExeca.mockImplementation((cmd, args) => {
        if (cmd === 'yarn' && args?.includes('--version')) {
          return Promise.resolve({ stdout: '1.22.0' });
        }
        if (cmd === 'npm') {
          return Promise.reject(new Error('npm not found'));
        }
        return Promise.resolve({ stdout: '' });
      });

      const action = (update as any)._actionHandler;
      
      await action({ yes: true });

      expect(mockExeca).toHaveBeenCalledWith(
        'yarn',
        expect.arrayContaining(['global', 'add', '@elizaos/cli@latest']),
        expect.any(Object)
      );
    });

    it('should detect package manager (pnpm)', async () => {
      mockCheckForUpdate.mockResolvedValue({
        hasUpdate: true,
        currentVersion: '1.0.0',
        latestVersion: '1.1.0',
      });

      // Mock pnpm check
      mockExeca.mockImplementation((cmd, args) => {
        if (cmd === 'pnpm' && args?.includes('--version')) {
          return Promise.resolve({ stdout: '7.0.0' });
        }
        if (cmd === 'npm' || cmd === 'yarn') {
          return Promise.reject(new Error('not found'));
        }
        return Promise.resolve({ stdout: '' });
      });

      const action = (update as any)._actionHandler;
      
      await action({ yes: true });

      expect(mockExeca).toHaveBeenCalledWith(
        'pnpm',
        expect.arrayContaining(['add', '-g', '@elizaos/cli@latest']),
        expect.any(Object)
      );
    });

    it('should show changelog for new version', async () => {
      mockCheckForUpdate.mockResolvedValue({
        hasUpdate: true,
        currentVersion: '1.0.0',
        latestVersion: '1.1.0',
        changelog: [
          '- Added new feature X',
          '- Fixed bug Y',
          '- Improved performance',
        ],
      });

      const action = (update as any)._actionHandler;
      
      await action({});

      expect(mockLogger.info).toHaveBeenCalledWith(
        expect.stringContaining('Changelog:')
      );
      expect(mockLogger.info).toHaveBeenCalledWith(
        expect.stringContaining('Added new feature X')
      );
    });
  });

  describe('dry run mode', () => {
    it('should simulate update without executing', async () => {
      mockCheckForUpdate.mockResolvedValue({
        hasUpdate: true,
        currentVersion: '1.0.0',
        latestVersion: '1.1.0',
      });

      const action = (update as any)._actionHandler;
      
      await action({ dryRun: true });

      expect(mockLogger.info).toHaveBeenCalledWith(
        expect.stringContaining('DRY RUN')
      );
      expect(mockLogger.info).toHaveBeenCalledWith(
        expect.stringContaining('Would run: npm install -g @elizaos/cli@latest')
      );
      expect(mockExeca).not.toHaveBeenCalled();
    });
  });

  describe('rollback functionality', () => {
    it('should rollback to previous version', async () => {
      const action = (update as any)._actionHandler;
      
      await action({ rollback: '1.0.0', yes: true });

      expect(mockLogger.info).toHaveBeenCalledWith(
        expect.stringContaining('Rolling back to version 1.0.0')
      );
      expect(mockExeca).toHaveBeenCalledWith(
        'npm',
        ['install', '-g', '@elizaos/cli@1.0.0'],
        expect.any(Object)
      );
    });

    it('should validate rollback version exists', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({
          versions: {
            '1.0.0': {},
            '1.1.0': {},
          },
        }),
      });

      const action = (update as any)._actionHandler;
      
      await expect(action({ rollback: '0.9.0', yes: true })).rejects.toThrow();

      expect(mockLogger.error).toHaveBeenCalledWith(
        expect.stringContaining('Version 0.9.0 not found')
      );
    });
  });

  describe('error handling', () => {
    it('should handle permission errors', async () => {
      mockCheckForUpdate.mockResolvedValue({
        hasUpdate: true,
        currentVersion: '1.0.0',
        latestVersion: '1.1.0',
      });
      
      mockExeca.mockRejectedValue(new Error('EACCES: permission denied'));

      const action = (update as any)._actionHandler;
      
      await expect(action({ yes: true })).rejects.toThrow();

      expect(mockLogger.error).toHaveBeenCalledWith(
        expect.stringContaining('Permission denied')
      );
      expect(mockLogger.info).toHaveBeenCalledWith(
        expect.stringContaining('Try running with sudo')
      );
    });

    it('should handle network timeouts', async () => {
      mockFetch.mockImplementation(() => 
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Timeout')), 100)
        )
      );

      const action = (update as any)._actionHandler;
      
      await expect(action({ check: true })).rejects.toThrow();

      expect(mockLogger.error).toHaveBeenCalledWith(
        expect.stringContaining('Failed to check for updates')
      );
    });

    it('should handle missing package manager', async () => {
      mockCheckForUpdate.mockResolvedValue({
        hasUpdate: true,
        currentVersion: '1.0.0',
        latestVersion: '1.1.0',
      });
      
      mockExeca.mockRejectedValue(new Error('Command not found'));

      const action = (update as any)._actionHandler;
      
      await expect(action({ yes: true })).rejects.toThrow();

      expect(mockLogger.error).toHaveBeenCalledWith(
        expect.stringContaining('Package manager not found')
      );
    });
  });
});