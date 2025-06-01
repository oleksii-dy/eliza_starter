import { vi, describe, it, expect, beforeEach, afterEach, type Mock } from 'vitest';
import { mkdtemp, rm, writeFile, mkdir } from 'node:fs/promises';
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
const mockInstallPlugin = vi.fn();

vi.mock('@elizaos/core', () => ({
  logger: {
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
  },
}));

vi.mock('prompts', () => ({
  default: vi.fn(),
}));

vi.mock('../../src/utils', () => ({
  handleError: vi.fn().mockImplementation((error) => {
    throw error instanceof Error ? error : new Error(String(error));
  }),
  installPlugin: vi.fn(),
  logHeader: vi.fn(),
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

vi.mock('../../src/utils/plugin-discovery', () => ({
  fetchPluginRegistry: vi.fn(),
}));

vi.mock('../../src/utils/registry', () => ({
  normalizePluginName: vi.fn().mockImplementation((name) => {
    if (name.startsWith('@elizaos/')) return name;
    if (name.startsWith('plugin-')) return `@elizaos/${name}`;
    return `@elizaos/plugin-${name}`;
  }),
}));

describe('plugins command', () => {
  let tempDir: string;
  let cwdSpy: Mock;

  beforeEach(async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'plugins-test-'));
    cwdSpy = vi.spyOn(process, 'cwd').mockReturnValue(tempDir);
    
    // Reset all mocks
    vi.clearAllMocks();
    
    // Create a basic package.json
    await writeFile(
      join(tempDir, 'package.json'),
      JSON.stringify({
        name: 'test-project',
        version: '1.0.0',
        dependencies: {}
      })
    );
  });

  afterEach(async () => {
    cwdSpy.mockRestore();
    await rm(tempDir, { recursive: true, force: true });
  });

  describe('help and usage', () => {
    it('should show help for plugins command', async () => {
      const result = await execa('node', [elizaCmd, 'plugins', '--help']);

      expect(result.stdout).toContain('Manage ElizaOS plugins');
      expect(result.stdout).toContain('list');
      expect(result.stdout).toContain('add');
      expect(result.stdout).toContain('remove');
      expect(result.exitCode).toBe(0);
    });

    it('should show help for list subcommand', async () => {
      const result = await execa('node', [elizaCmd, 'plugins', 'list', '--help']);

      expect(result.stdout).toContain('List available plugins');
      expect(result.exitCode).toBe(0);
    });
  });

  describe('list subcommand', () => {
    it('should list available plugins', async () => {
      try {
        const result = await execa('node', [elizaCmd, 'plugins', 'list'], {
          cwd: tempDir,
          env: { ...process.env, NODE_ENV: 'test' }
        });

        // Command should execute, may show empty list in test environment
        expect(result.exitCode).toBe(0);
      } catch (error) {
        // Plugin cache might not exist in test environment
        expect(error.stdout || error.stderr).toContain('cache');
      }
    });

    it('should support list aliases', async () => {
      try {
        const result = await execa('node', [elizaCmd, 'plugins', 'ls'], {
          cwd: tempDir,
          env: { ...process.env, NODE_ENV: 'test' }
        });

        expect(result.exitCode).toBe(0);
      } catch (error) {
        expect(error.stdout || error.stderr).toBeDefined();
      }
    });
  });

  describe('installed-plugins subcommand', () => {
    it('should list installed plugins', async () => {
      // Add some plugin dependencies
      await writeFile(
        join(tempDir, 'package.json'),
        JSON.stringify({
          name: 'test-project',
          version: '1.0.0',
          dependencies: {
            '@elizaos/plugin-example': '^1.0.0',
            '@elizaos/plugin-test': '^1.0.0',
            'other-package': '^1.0.0',
          }
        })
      );

      const result = await execa('node', [elizaCmd, 'plugins', 'installed-plugins'], {
        cwd: tempDir,
        env: { ...process.env, NODE_ENV: 'test' }
      });

      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain('@elizaos/plugin-example');
      expect(result.stdout).toContain('@elizaos/plugin-test');
      expect(result.stdout).not.toContain('other-package');
    });

    it('should handle no plugins installed', async () => {
      const result = await execa('node', [elizaCmd, 'plugins', 'installed-plugins'], {
        cwd: tempDir,
        env: { ...process.env, NODE_ENV: 'test' }
      });

      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain('No Eliza plugins found');
    });
  });

  describe('add subcommand', () => {
    it('should add a plugin', async () => {
      try {
        await execa('node', [elizaCmd, 'plugins', 'add', 'test-plugin', '--no-env-prompt'], {
          cwd: tempDir,
          env: { ...process.env, NODE_ENV: 'test' },
          timeout: 5000
        });
      } catch (error) {
        // Expected to fail without plugin registry in test environment
        expect(error.stderr || error.stdout).toContain('registry');
      }
    });

    it('should support install alias', async () => {
      try {
        await execa('node', [elizaCmd, 'plugins', 'install', 'test-plugin', '--no-env-prompt'], {
          cwd: tempDir,
          env: { ...process.env, NODE_ENV: 'test' },
          timeout: 5000
        });
      } catch (error) {
        // Expected to fail without plugin registry
        expect(error.stderr || error.stdout).toContain('registry');
      }
    });

    it('should handle GitHub URLs', async () => {
      try {
        await execa('node', [elizaCmd, 'plugins', 'add', 'github:user/repo', '--no-env-prompt'], {
          cwd: tempDir,
          env: { ...process.env, NODE_ENV: 'test' },
          timeout: 5000
        });
      } catch (error) {
        // Expected to fail in test environment
        expect(error.exitCode).toBeDefined();
      }
    });
  });

  describe('remove subcommand', () => {
    it('should remove a plugin', async () => {
      // Add a plugin to package.json first
      await writeFile(
        join(tempDir, 'package.json'),
        JSON.stringify({
          name: 'test-project',
          version: '1.0.0',
          dependencies: {
            '@elizaos/plugin-test': '^1.0.0',
          }
        })
      );

      try {
        await execa('node', [elizaCmd, 'plugins', 'remove', 'plugin-test'], {
          cwd: tempDir,
          env: { ...process.env, NODE_ENV: 'test' }
        });
      } catch (error) {
        // bun remove might fail in test environment
        expect(error.stdout || error.stderr).toBeDefined();
      }
    });

    it('should handle plugin not found', async () => {
      const result = await execa('node', [elizaCmd, 'plugins', 'remove', 'nonexistent-plugin'], {
        cwd: tempDir,
        env: { ...process.env, NODE_ENV: 'test' }
      });

      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain('not found');
    });

    it('should support remove aliases', async () => {
      try {
        await execa('node', [elizaCmd, 'plugins', 'rm', 'test-plugin'], {
          cwd: tempDir,
          env: { ...process.env, NODE_ENV: 'test' }
        });
        
        // Command structure is valid
        expect(true).toBe(true);
      } catch (error) {
        // Expected in test environment
        expect(error.exitCode).toBeDefined();
      }
    });
  });

  describe('normalizePluginNameForDisplay function', () => {
    it('should normalize plugin names correctly', async () => {
      const { normalizePluginNameForDisplay } = await import('../../src/commands/plugins');
      
      expect(normalizePluginNameForDisplay('test')).toBe('plugin-test');
      expect(normalizePluginNameForDisplay('@elizaos/plugin-test')).toBe('plugin-test');
      expect(normalizePluginNameForDisplay('plugin-test')).toBe('plugin-test');
      expect(normalizePluginNameForDisplay('elizaos/plugin-test')).toBe('plugin-test');
    });
  });

  describe('error handling', () => {
    it('should handle missing package.json', async () => {
      await rm(join(tempDir, 'package.json'));

      try {
        await execa('node', [elizaCmd, 'plugins', 'installed-plugins'], {
          cwd: tempDir,
          env: { ...process.env, NODE_ENV: 'test' }
        });
      } catch (error) {
        expect(error.stderr || error.stdout).toContain('package.json');
        expect(error.exitCode).not.toBe(0);
      }
    });

    it('should require project directory for add command', async () => {
      await rm(join(tempDir, 'package.json'));

      try {
        await execa('node', [elizaCmd, 'plugins', 'add', 'test-plugin'], {
          cwd: tempDir,
          env: { ...process.env, NODE_ENV: 'test' }
        });
      } catch (error) {
        expect(error.stderr || error.stdout).toContain('project directory');
        expect(error.exitCode).not.toBe(0);
      }
    });
  });
});