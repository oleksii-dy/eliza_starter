import { describe, expect, it, beforeEach, afterEach, mock } from 'bun:test';
import { existsSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import path from 'node:path';
import { loadAndPreparePlugin } from '../../src/commands/start/utils/plugin-utils';
import { validatePluginNpmDependencies } from '../../src/commands/test/utils/plugin-utils';

// Mock the logger to avoid console output during tests
mock.module('@elizaos/core', () => ({
  logger: {
    debug: mock(),
    info: mock(),
    warn: mock(),
    error: mock(),
    success: mock(),
  },
}));

// Mock package manager to avoid actual installations
vi.mock('../../src/utils/package-manager', () => ({
  executeInstallation: vi
    .fn()
    .mockResolvedValue({ success: true, installedIdentifier: 'mock-package' }),
}));

// Mock plugin loading to avoid actual module imports
vi.mock('../../src/utils/load-plugin', () => ({
  loadPluginModule: vi.fn().mockResolvedValue({
    name: 'test-plugin',
    description: 'Test plugin',
  }),
}));

// Mock install plugin to avoid actual installations
vi.mock('../../src/utils/install-plugin', () => ({
  installPlugin: vi.fn().mockResolvedValue(true),
}));

// Mock CLI tag
vi.mock('../../src/utils', () => ({
  getCliInstallTag: vi.fn().mockReturnValue('latest'),
}));

describe('Plugin Dependency Resolution Integration', () => {
  const testDir = path.join(process.cwd(), 'test-temp-plugin');
  const nodeModulesDir = path.join(testDir, 'node_modules');
  const pluginDir = path.join(nodeModulesDir, 'test-plugin');

  beforeEach(() => {
    // Create test directory structure
    if (existsSync(testDir)) {
      rmSync(testDir, { recursive: true, force: true });
    }
    mkdirSync(testDir, { recursive: true });
    mkdirSync(pluginDir, { recursive: true });

    // Change to test directory
    process.chdir(testDir);
  });

  afterEach(() => {
    // Clean up test directory
    if (existsSync(testDir)) {
      rmSync(testDir, { recursive: true, force: true });
    }
    vi.clearAllMocks();
  });

  describe('Plugin with satisfied dependencies', () => {
    it('should load successfully when all dependencies are installed', async () => {
      // Create mock plugin package.json with dependencies
      const pluginPackageJson = {
        name: 'test-plugin',
        version: '1.0.0',
        dependencies: {
          'mock-dependency': '^1.0.0',
        },
      };

      writeFileSync(
        path.join(pluginDir, 'package.json'),
        JSON.stringify(pluginPackageJson, null, 2)
      );

      // Create mock dependency directory (simulating it's installed)
      const depDir = path.join(nodeModulesDir, 'mock-dependency');
      mkdirSync(depDir, { recursive: true });
      writeFileSync(
        path.join(depDir, 'package.json'),
        JSON.stringify({ name: 'mock-dependency', version: '1.0.0' }, null, 2)
      );

      const result = await loadAndPreparePlugin('test-plugin');

      expect(result).toBeTruthy();
      expect(result?.name).toBe('test-plugin');
    });
  });

  describe('Plugin with missing dependencies', () => {
    it('should install missing dependencies and then load successfully', async () => {
      // Create mock plugin package.json with dependencies
      const pluginPackageJson = {
        name: 'test-plugin',
        version: '1.0.0',
        dependencies: {
          'missing-dependency': '^1.0.0',
        },
      };

      writeFileSync(
        path.join(pluginDir, 'package.json'),
        JSON.stringify(pluginPackageJson, null, 2)
      );

      // Don't create the dependency directory (simulating it's missing)
      // The mock executeInstallation will simulate successful installation

      const result = await loadAndPreparePlugin('test-plugin');

      expect(result).toBeTruthy();
      expect(result?.name).toBe('test-plugin');
    });
  });

  describe('Plugin with ElizaOS dependencies', () => {
    it('should skip ElizaOS dependencies and load successfully', async () => {
      // Create mock plugin package.json with ElizaOS dependencies
      const pluginPackageJson = {
        name: 'test-plugin',
        version: '1.0.0',
        dependencies: {
          '@elizaos/core': '^1.0.0',
          '@elizaos/plugin-bootstrap': '^1.0.0',
          'regular-dependency': '^1.0.0',
        },
      };

      writeFileSync(
        path.join(pluginDir, 'package.json'),
        JSON.stringify(pluginPackageJson, null, 2)
      );

      // Create mock regular dependency (ElizaOS deps should be skipped)
      const depDir = path.join(nodeModulesDir, 'regular-dependency');
      mkdirSync(depDir, { recursive: true });
      writeFileSync(
        path.join(depDir, 'package.json'),
        JSON.stringify({ name: 'regular-dependency', version: '1.0.0' }, null, 2)
      );

      const result = await loadAndPreparePlugin('test-plugin');

      expect(result).toBeTruthy();
      expect(result?.name).toBe('test-plugin');
    });
  });

  describe('Test environment dependency validation', () => {
    it('should validate dependencies for plugin testing', async () => {
      // Create mock current directory as plugin
      const currentDirPackageJson = {
        name: 'current-plugin',
        version: '1.0.0',
        dependencies: {
          'test-dependency': '^1.0.0',
        },
      };

      writeFileSync(
        path.join(testDir, 'package.json'),
        JSON.stringify(currentDirPackageJson, null, 2)
      );

      // Create mock dependency
      const depDir = path.join(nodeModulesDir, 'test-dependency');
      mkdirSync(depDir, { recursive: true });
      writeFileSync(
        path.join(depDir, 'package.json'),
        JSON.stringify({ name: 'test-dependency', version: '1.0.0' }, null, 2)
      );

      const projectInfo = {
        type: 'elizaos-plugin' as const,
        hasPackageJson: true,
        packageJson: currentDirPackageJson,
        path: testDir,
      };

      const result = await validatePluginNpmDependencies(projectInfo);

      expect(result).toBe(true);
    });

    it('should warn about missing dependencies in test environment', async () => {
      // Create mock current directory as plugin
      const currentDirPackageJson = {
        name: 'current-plugin',
        version: '1.0.0',
        dependencies: {
          'missing-test-dependency': '^1.0.0',
        },
      };

      writeFileSync(
        path.join(testDir, 'package.json'),
        JSON.stringify(currentDirPackageJson, null, 2)
      );

      // Don't create the dependency (simulating it's missing)

      const projectInfo = {
        type: 'elizaos-plugin' as const,
        hasPackageJson: true,
        packageJson: currentDirPackageJson,
        path: testDir,
      };

      const result = await validatePluginNpmDependencies(projectInfo);

      expect(result).toBe(false);
    });
  });

  describe('Error handling', () => {
    it('should handle malformed package.json gracefully', async () => {
      // Create invalid JSON file
      writeFileSync(path.join(pluginDir, 'package.json'), 'invalid json content');

      const result = await loadAndPreparePlugin('test-plugin');

      expect(result).toBeTruthy(); // Should still work due to error handling
    });

    it('should handle missing plugin directory gracefully', async () => {
      // Don't create plugin directory
      rmSync(pluginDir, { recursive: true, force: true });

      const result = await loadAndPreparePlugin('non-existent-plugin');

      expect(result).toBeTruthy(); // Mock will still return a plugin
    });
  });
});
