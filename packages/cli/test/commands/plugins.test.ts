import { vi, describe, it, expect, beforeEach, afterEach, type Mock } from 'vitest';
import { plugins } from '../../src/commands/plugins';
import { mkdtemp, rm, writeFile, mkdir } from 'node:fs/promises';
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
  table: vi.fn(),
  spinner: () => ({
    start: vi.fn(),
    stop: vi.fn(),
    succeed: vi.fn(),
    fail: vi.fn(),
    text: '',
  }),
};

const mockPrompts = vi.fn();
const mockHandleError = vi.fn().mockImplementation((error) => {
  throw error instanceof Error ? error : new Error(String(error));
});

const mockInstallPlugin = vi.fn();
const mockGetPluginInfo = vi.fn();
const mockRunBunCommand = vi.fn();
const mockGetLocalPackages = vi.fn();

vi.mock('@elizaos/core', () => ({
  logger: mockLogger,
}));

vi.mock('prompts', () => ({
  default: mockPrompts,
}));

vi.mock('../../src/utils', () => ({
  handleError: mockHandleError,
  installPlugin: mockInstallPlugin,
  getPluginInfo: mockGetPluginInfo,
  runBunCommand: mockRunBunCommand,
  getLocalPackages: mockGetLocalPackages,
  UserEnvironment: {
    getInstance: vi.fn().mockReturnValue({
      getInfo: vi.fn().mockResolvedValue({
        paths: {
          elizaDir: '/mock/.eliza',
          pluginsDir: '/mock/.eliza/plugins',
        },
      }),
    }),
  },
}));

vi.mock('node:fs', () => ({
  existsSync: vi.fn(),
  readFileSync: vi.fn(),
}));

describe('plugins command', () => {
  let tempDir: string;
  let cwdSpy: Mock;

  beforeEach(async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'plugins-test-'));
    cwdSpy = vi.spyOn(process, 'cwd').mockReturnValue(tempDir);
    
    // Reset all mocks
    vi.clearAllMocks();
    
    // Default mock implementations
    mockInstallPlugin.mockResolvedValue({
      success: true,
      plugin: { name: '@elizaos/plugin-test', version: '1.0.0' },
    });
    
    mockGetPluginInfo.mockResolvedValue({
      name: '@elizaos/plugin-test',
      version: '1.0.0',
      description: 'Test plugin',
    });
    
    mockRunBunCommand.mockResolvedValue({
      success: true,
      stdout: '',
      stderr: '',
    });
    
    mockGetLocalPackages.mockResolvedValue([]);
  });

  afterEach(async () => {
    cwdSpy.mockRestore();
    await rm(tempDir, { recursive: true, force: true });
  });

  describe('install subcommand', () => {
    it('should install a plugin by name', async () => {
      const installCommand = plugins.commands.find(cmd => cmd.name() === 'install');
      const action = (installCommand as any)._actionHandler;
      
      await action('plugin-test', {});

      expect(mockInstallPlugin).toHaveBeenCalledWith(
        'plugin-test',
        expect.objectContaining({
          elizaDir: '/mock/.eliza',
          pluginsDir: '/mock/.eliza/plugins',
        })
      );
      expect(mockLogger.success).toHaveBeenCalledWith(
        expect.stringContaining('Plugin @elizaos/plugin-test installed successfully')
      );
    });

    it('should install multiple plugins', async () => {
      const installCommand = plugins.commands.find(cmd => cmd.name() === 'install');
      const action = (installCommand as any)._actionHandler;
      
      mockInstallPlugin
        .mockResolvedValueOnce({
          success: true,
          plugin: { name: '@elizaos/plugin-test1', version: '1.0.0' },
        })
        .mockResolvedValueOnce({
          success: true,
          plugin: { name: '@elizaos/plugin-test2', version: '1.0.0' },
        });
      
      await action('plugin-test1,plugin-test2', {});

      expect(mockInstallPlugin).toHaveBeenCalledTimes(2);
      expect(mockLogger.success).toHaveBeenCalledWith(
        expect.stringContaining('2 plugins installed successfully')
      );
    });

    it('should handle plugin name normalization', async () => {
      const { normalizePluginNameForDisplay } = await import('../../src/commands/plugins');
      
      expect(normalizePluginNameForDisplay('test')).toBe('@elizaos/plugin-test');
      expect(normalizePluginNameForDisplay('@elizaos/plugin-test')).toBe('@elizaos/plugin-test');
      expect(normalizePluginNameForDisplay('plugin-test')).toBe('@elizaos/plugin-test');
    });

    it('should handle installation errors', async () => {
      mockInstallPlugin.mockResolvedValue({
        success: false,
        error: 'Plugin not found in registry',
      });

      const installCommand = plugins.commands.find(cmd => cmd.name() === 'install');
      const action = (installCommand as any)._actionHandler;
      
      await action('nonexistent-plugin', {});

      expect(mockLogger.error).toHaveBeenCalledWith(
        expect.stringContaining('Failed to install @elizaos/plugin-nonexistent-plugin')
      );
    });

    it('should install from local path', async () => {
      const localPluginPath = join(tempDir, 'local-plugin');
      await mkdir(localPluginPath);
      await writeFile(
        join(localPluginPath, 'package.json'),
        JSON.stringify({ name: '@elizaos/plugin-local', version: '1.0.0' })
      );

      const installCommand = plugins.commands.find(cmd => cmd.name() === 'install');
      const action = (installCommand as any)._actionHandler;
      
      await action(localPluginPath, {});

      expect(mockInstallPlugin).toHaveBeenCalledWith(
        localPluginPath,
        expect.any(Object)
      );
    });

    it('should handle force reinstall', async () => {
      const installCommand = plugins.commands.find(cmd => cmd.name() === 'install');
      const action = (installCommand as any)._actionHandler;
      
      await action('plugin-test', { force: true });

      expect(mockInstallPlugin).toHaveBeenCalledWith(
        'plugin-test',
        expect.objectContaining({ force: true })
      );
    });
  });

  describe('list subcommand', () => {
    it('should list installed plugins', async () => {
      const mockFs = await import('node:fs');
      (mockFs.existsSync as any).mockReturnValue(true);
      (mockFs.readFileSync as any).mockReturnValue(JSON.stringify({
        dependencies: {
          '@elizaos/plugin-test1': '^1.0.0',
          '@elizaos/plugin-test2': '^2.0.0',
          'other-package': '^1.0.0',
        },
      }));

      const listCommand = plugins.commands.find(cmd => cmd.name() === 'list');
      const action = (listCommand as any)._actionHandler;
      
      await action({});

      expect(mockLogger.info).toHaveBeenCalledWith('Installed plugins:');
      expect(mockLogger.table).toHaveBeenCalledWith([
        { Name: '@elizaos/plugin-test1', Version: '^1.0.0' },
        { Name: '@elizaos/plugin-test2', Version: '^2.0.0' },
      ]);
    });

    it('should show message when no plugins installed', async () => {
      const mockFs = await import('node:fs');
      (mockFs.existsSync as any).mockReturnValue(true);
      (mockFs.readFileSync as any).mockReturnValue(JSON.stringify({
        dependencies: {
          'other-package': '^1.0.0',
        },
      }));

      const listCommand = plugins.commands.find(cmd => cmd.name() === 'list');
      const action = (listCommand as any)._actionHandler;
      
      await action({});

      expect(mockLogger.info).toHaveBeenCalledWith('No plugins installed');
    });

    it('should handle missing package.json', async () => {
      const mockFs = await import('node:fs');
      (mockFs.existsSync as any).mockReturnValue(false);

      const listCommand = plugins.commands.find(cmd => cmd.name() === 'list');
      const action = (listCommand as any)._actionHandler;
      
      await action({});

      expect(mockLogger.error).toHaveBeenCalledWith(
        expect.stringContaining('No package.json found')
      );
    });
  });

  describe('remove subcommand', () => {
    it('should remove a plugin', async () => {
      mockRunBunCommand.mockResolvedValue({
        success: true,
        stdout: 'Removed @elizaos/plugin-test',
        stderr: '',
      });

      const removeCommand = plugins.commands.find(cmd => cmd.name() === 'remove');
      const action = (removeCommand as any)._actionHandler;
      
      await action('plugin-test', {});

      expect(mockRunBunCommand).toHaveBeenCalledWith(
        ['remove', '@elizaos/plugin-test'],
        tempDir
      );
      expect(mockLogger.success).toHaveBeenCalledWith(
        expect.stringContaining('Plugin @elizaos/plugin-test removed successfully')
      );
    });

    it('should remove multiple plugins', async () => {
      const removeCommand = plugins.commands.find(cmd => cmd.name() === 'remove');
      const action = (removeCommand as any)._actionHandler;
      
      await action('plugin-test1,plugin-test2', {});

      expect(mockRunBunCommand).toHaveBeenCalledTimes(2);
      expect(mockLogger.success).toHaveBeenCalledWith(
        expect.stringContaining('2 plugins removed successfully')
      );
    });

    it('should handle removal errors', async () => {
      mockRunBunCommand.mockResolvedValue({
        success: false,
        stdout: '',
        stderr: 'Plugin not found',
      });

      const removeCommand = plugins.commands.find(cmd => cmd.name() === 'remove');
      const action = (removeCommand as any)._actionHandler;
      
      await action('nonexistent-plugin', {});

      expect(mockLogger.error).toHaveBeenCalledWith(
        expect.stringContaining('Failed to remove @elizaos/plugin-nonexistent-plugin')
      );
    });

    it('should prompt for confirmation in interactive mode', async () => {
      mockPrompts.mockResolvedValue({ confirm: true });

      const removeCommand = plugins.commands.find(cmd => cmd.name() === 'remove');
      const action = (removeCommand as any)._actionHandler;
      
      await action('plugin-test', {});

      expect(mockPrompts).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'confirm',
          message: expect.stringContaining('Are you sure you want to remove'),
        })
      );
    });

    it('should skip removal when not confirmed', async () => {
      mockPrompts.mockResolvedValue({ confirm: false });

      const removeCommand = plugins.commands.find(cmd => cmd.name() === 'remove');
      const action = (removeCommand as any)._actionHandler;
      
      await action('plugin-test', {});

      expect(mockRunBunCommand).not.toHaveBeenCalled();
      expect(mockLogger.info).toHaveBeenCalledWith('Removal cancelled');
    });
  });

  describe('update subcommand', () => {
    it('should update a plugin', async () => {
      mockRunBunCommand.mockResolvedValue({
        success: true,
        stdout: 'Updated @elizaos/plugin-test to 1.1.0',
        stderr: '',
      });

      const updateCommand = plugins.commands.find(cmd => cmd.name() === 'update');
      const action = (updateCommand as any)._actionHandler;
      
      await action('plugin-test', {});

      expect(mockRunBunCommand).toHaveBeenCalledWith(
        ['update', '@elizaos/plugin-test'],
        tempDir
      );
      expect(mockLogger.success).toHaveBeenCalledWith(
        expect.stringContaining('Plugin @elizaos/plugin-test updated successfully')
      );
    });

    it('should update all plugins when no name specified', async () => {
      const mockFs = await import('node:fs');
      (mockFs.existsSync as any).mockReturnValue(true);
      (mockFs.readFileSync as any).mockReturnValue(JSON.stringify({
        dependencies: {
          '@elizaos/plugin-test1': '^1.0.0',
          '@elizaos/plugin-test2': '^2.0.0',
        },
      }));

      const updateCommand = plugins.commands.find(cmd => cmd.name() === 'update');
      const action = (updateCommand as any)._actionHandler;
      
      await action(undefined, {});

      expect(mockRunBunCommand).toHaveBeenCalledWith(
        ['update', '@elizaos/plugin-test1', '@elizaos/plugin-test2'],
        tempDir
      );
      expect(mockLogger.success).toHaveBeenCalledWith(
        expect.stringContaining('All plugins updated successfully')
      );
    });

    it('should handle update errors', async () => {
      mockRunBunCommand.mockResolvedValue({
        success: false,
        stdout: '',
        stderr: 'Update failed: network error',
      });

      const updateCommand = plugins.commands.find(cmd => cmd.name() === 'update');
      const action = (updateCommand as any)._actionHandler;
      
      await action('plugin-test', {});

      expect(mockLogger.error).toHaveBeenCalledWith(
        expect.stringContaining('Failed to update')
      );
    });
  });

  describe('interactive mode', () => {
    it('should prompt for action when no subcommand provided', async () => {
      mockPrompts.mockResolvedValue({ action: 'install' });

      const action = (plugins as any)._actionHandler;
      
      // Should redirect to install subcommand
      await expect(action(undefined, {})).rejects.toThrow();
    });
  });

  describe('search functionality', () => {
    it('should search for plugins', async () => {
      const mockFetch = vi.fn();
      global.fetch = mockFetch as any;
      
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({
          objects: [
            { package: { name: '@elizaos/plugin-test1' } },
            { package: { name: '@elizaos/plugin-test2' } },
          ],
        }),
      });

      const searchCommand = plugins.commands.find(cmd => cmd.name() === 'search');
      const action = (searchCommand as any)._actionHandler;
      
      await action('test', {});

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('registry.npmjs.org/-/v1/search')
      );
      expect(mockLogger.info).toHaveBeenCalledWith('Found plugins:');
      expect(mockLogger.log).toHaveBeenCalledWith('- @elizaos/plugin-test1');
      expect(mockLogger.log).toHaveBeenCalledWith('- @elizaos/plugin-test2');
    });

    it('should handle search with no results', async () => {
      const mockFetch = vi.fn();
      global.fetch = mockFetch as any;
      
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({ objects: [] }),
      });

      const searchCommand = plugins.commands.find(cmd => cmd.name() === 'search');
      const action = (searchCommand as any)._actionHandler;
      
      await action('nonexistent', {});

      expect(mockLogger.info).toHaveBeenCalledWith(
        expect.stringContaining('No plugins found matching')
      );
    });
  });

  describe('plugin info', () => {
    it('should display plugin information', async () => {
      mockGetPluginInfo.mockResolvedValue({
        name: '@elizaos/plugin-test',
        version: '1.0.0',
        description: 'A test plugin for ElizaOS',
        author: 'ElizaOS Team',
        repository: 'https://github.com/elizaos/plugin-test',
      });

      const infoCommand = plugins.commands.find(cmd => cmd.name() === 'info');
      const action = (infoCommand as any)._actionHandler;
      
      await action('plugin-test', {});

      expect(mockGetPluginInfo).toHaveBeenCalledWith('@elizaos/plugin-test');
      expect(mockLogger.info).toHaveBeenCalledWith(
        expect.stringContaining('Plugin Information:')
      );
      expect(mockLogger.log).toHaveBeenCalledWith(
        expect.stringContaining('Name: @elizaos/plugin-test')
      );
    });

    it('should handle plugin not found', async () => {
      mockGetPluginInfo.mockRejectedValue(new Error('Plugin not found'));

      const infoCommand = plugins.commands.find(cmd => cmd.name() === 'info');
      const action = (infoCommand as any)._actionHandler;
      
      await expect(action('nonexistent', {})).rejects.toThrow();

      expect(mockLogger.error).toHaveBeenCalledWith(
        expect.stringContaining('Failed to get plugin info')
      );
    });
  });
});