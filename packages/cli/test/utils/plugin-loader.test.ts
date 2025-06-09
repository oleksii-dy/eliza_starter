import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { Plugin } from '@elizaos/core';
import {
  getAllDependencies,
  validateDependencyResult,
  loadPluginDependenciesUnified,
} from '../../src/utils/plugin-loader';
import * as loader from '../../src/utils/plugin-loader';

describe('Plugin Dependency Loading System', () => {
  let loadAndPreparePluginSpy: any;

  beforeEach(() => {
    // Spy on loadAndPreparePlugin to avoid actual file system operations
    loadAndPreparePluginSpy = vi
      .spyOn(loader, 'loadAndPreparePlugin')
      // Provide a default mock implementation to avoid calling the original function
      .mockImplementation(async () => null);
  });

  afterEach(() => {
    // Restore the original function after each test
    vi.restoreAllMocks();
  });

  // Mock plugins for testing
  const mockProviderPlugin: Plugin = {
    name: 'test-provider',
    description: 'A test provider plugin',
    providers: [
      {
        name: 'TEST_PROVIDER',
        get: async () => ({ text: 'test data', values: { test: true } }),
      },
    ],
  };

  const mockConsumerPlugin: Plugin = {
    name: 'test-consumer',
    description: 'A test consumer plugin',
    dependencies: ['test-provider'],
    providers: [
      {
        name: 'CONSUMER_PROVIDER',
        get: async () => ({ text: 'consumer data', values: { consumer: true } }),
      },
    ],
  };

  const mockTestDepsPlugin: Plugin = {
    name: 'test-deps-plugin',
    description: 'Plugin with test dependencies',
    dependencies: ['test-provider'],
    testDependencies: ['test-helper'],
  };

  const pluginA: Plugin = { name: 'A', description: 'A' };
  const pluginB: Plugin = { name: 'B', description: 'B', dependencies: ['A'] };
  const pluginC: Plugin = { name: 'C', description: 'C', dependencies: ['B'] };
  const pluginD: Plugin = { name: 'D', description: 'D', dependencies: ['A'] };
  const pluginE: Plugin = { name: 'E', description: 'E', dependencies: ['B', 'D'] };
  const pluginCircularA: Plugin = {
    name: 'CircularA',
    description: 'circ-a',
    dependencies: ['CircularB'],
  };
  const pluginCircularB: Plugin = {
    name: 'CircularB',
    description: 'circ-b',
    dependencies: ['CircularA'],
  };

  describe('loadPluginDependenciesUnified', () => {
    it('should load a single plugin with no dependencies', async () => {
      loadAndPreparePluginSpy.mockResolvedValue(pluginA);
      const result = await loadPluginDependenciesUnified(['A']);
      expect(result.loadOrder).toEqual(['A']);
      expect(result.plugins.get('A')).toEqual(pluginA);
      expect(result.errors).toHaveLength(0);
    });

    it('should load plugins in the correct topological order', async () => {
      loadAndPreparePluginSpy.mockImplementation(async (name) => {
        if (name === 'A') return pluginA;
        if (name === 'B') return pluginB;
        if (name === 'C') return pluginC;
        return null;
      });
      const result = await loadPluginDependenciesUnified(['C']);
      expect(result.loadOrder).toEqual(['A', 'B', 'C']);
      expect(loadAndPreparePluginSpy).toHaveBeenCalledWith('A');
      expect(loadAndPreparePluginSpy).toHaveBeenCalledWith('B');
      expect(loadAndPreparePluginSpy).toHaveBeenCalledWith('C');
    });

    it('should handle shared dependencies (diamond problem)', async () => {
      loadAndPreparePluginSpy.mockImplementation(async (name) => {
        if (name === 'A') return pluginA;
        if (name === 'B') return pluginB;
        if (name === 'D') return pluginD;
        if (name === 'E') return pluginE;
        return null;
      });
      const result = await loadPluginDependenciesUnified(['E']);
      expect(result.loadOrder).toEqual(['A', 'B', 'D', 'E']);
      expect(loadAndPreparePluginSpy).toHaveBeenCalledTimes(4);
    });

    it('should detect a simple circular dependency', async () => {
      loadAndPreparePluginSpy.mockImplementation(async (name) => {
        if (name === 'CircularA') return pluginCircularA;
        if (name === 'CircularB') return pluginCircularB;
        return null;
      });
      const result = await loadPluginDependenciesUnified(['CircularA']);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].error).toContain('Circular dependency detected');
      expect(result.errors[0].plugin).toBe('CircularA');
      expect(result.loadOrder).toEqual([]);
    });

    it('should report an error for a missing plugin', async () => {
      loadAndPreparePluginSpy.mockImplementation(async (name) => {
        if (name === 'B') return pluginB;
        if (name === 'A') {
          // Simulate a load failure for plugin 'A'
          throw new Error('Plugin A not found');
        }
        return null;
      });
      const result = await loadPluginDependenciesUnified(['B']);
      expect(result.errors.some((e) => e.plugin === 'A')).toBe(true);
      expect(result.loadOrder).toEqual([]); // B should not be loaded if A fails
    });

    it('should include test dependencies when requested', async () => {
      loadAndPreparePluginSpy.mockImplementation(async (name) => {
        if (name === 'test-deps-plugin') return mockTestDepsPlugin;
        if (name === 'test-provider') return mockProviderPlugin;
        if (name === 'test-helper') return { name: 'test-helper', description: 'h' };
        return null;
      });
      const result = await loadPluginDependenciesUnified(['test-deps-plugin'], {
        includeTestDependencies: true,
      });
      expect(result.loadOrder).toContain('test-provider');
      expect(result.loadOrder).toContain('test-helper');
      expect(result.loadOrder).toContain('test-deps-plugin');
    });

    it('should exclude test dependencies by default', async () => {
      loadAndPreparePluginSpy.mockImplementation(async (name) => {
        if (name === 'test-deps-plugin') return mockTestDepsPlugin;
        if (name === 'test-provider') return mockProviderPlugin;
        return null;
      });
      const result = await loadPluginDependenciesUnified(['test-deps-plugin']);
      expect(result.loadOrder).toContain('test-provider');
      expect(result.loadOrder).not.toContain('test-helper');
    });
  });

  describe('getAllDependencies', () => {
    it('should extract regular dependencies', () => {
      const deps = getAllDependencies(mockConsumerPlugin, false);
      expect(deps).toEqual(['test-provider']);
    });

    it('should extract both regular and test dependencies when requested', () => {
      const deps = getAllDependencies(mockTestDepsPlugin, true);
      expect(deps).toEqual(['test-provider', 'test-helper']);
    });

    it('should exclude test dependencies by default', () => {
      const deps = getAllDependencies(mockTestDepsPlugin, false);
      expect(deps).toEqual(['test-provider']);
    });

    it('should deduplicate dependencies', () => {
      const pluginWithDuplicates: Plugin = {
        name: 'test',
        description: 'test',
        dependencies: ['dep1', 'dep2'],
        testDependencies: ['dep2', 'dep3'],
      };

      const deps = getAllDependencies(pluginWithDuplicates, true);
      expect(deps).toEqual(['dep1', 'dep2', 'dep3']);
    });

    it('should handle missing dependencies', () => {
      const pluginNoDeps: Plugin = {
        name: 'test',
        description: 'test',
      };

      const deps = getAllDependencies(pluginNoDeps, true);
      expect(deps).toEqual([]);
    });

    it('should handle array dependencies', () => {
      const plugin: Plugin = {
        name: 'test',
        description: 'test',
        dependencies: ['dep1', 'dep2'],
      };

      const deps = getAllDependencies(plugin, false);
      expect(deps).toEqual(['dep1', 'dep2']);
    });

    it('should handle empty arrays', () => {
      const plugin: Plugin = {
        name: 'test',
        description: 'test',
        dependencies: [],
        testDependencies: [],
      };

      const deps = getAllDependencies(plugin, true);
      expect(deps).toEqual([]);
    });
  });

  describe('validateDependencyResult', () => {
    it('should return true for results with no errors', () => {
      const result = {
        plugins: new Map([['test-plugin', mockProviderPlugin]]),
        loadOrder: ['test-plugin'],
        errors: [],
      };

      expect(validateDependencyResult(result)).toBe(true);
    });

    it('should return false for results with errors', () => {
      const result = {
        plugins: new Map(),
        loadOrder: [],
        errors: [{ plugin: 'test', error: 'Failed to load' }],
      };

      expect(validateDependencyResult(result)).toBe(false);
    });

    it('should return false for multiple errors', () => {
      const result = {
        plugins: new Map(),
        loadOrder: [],
        errors: [
          { plugin: 'plugin-a', error: 'Error A' },
          { plugin: 'plugin-b', error: 'Error B' },
        ],
      };

      expect(validateDependencyResult(result)).toBe(false);
    });

    it('should return false even with plugins loaded but errors present in other plugins', () => {
      const result = {
        plugins: new Map([['working-plugin', mockProviderPlugin]]),
        loadOrder: ['working-plugin'],
        errors: [{ plugin: 'broken-plugin', error: 'Failed to load' }],
      };

      expect(validateDependencyResult(result)).toBe(false);
    });
  });

  describe('Plugin Structure Validation', () => {
    it('should have valid plugin objects with required fields', () => {
      expect(mockProviderPlugin.name).toBe('test-provider');
      expect(mockProviderPlugin.description).toBeDefined();
      expect(mockProviderPlugin.providers).toBeDefined();
      expect(mockProviderPlugin.providers).toHaveLength(1);
    });

    it('should have valid consumer plugin with dependencies', () => {
      expect(mockConsumerPlugin.name).toBe('test-consumer');
      expect(mockConsumerPlugin.dependencies).toEqual(['test-provider']);
      expect(mockConsumerPlugin.providers).toBeDefined();
    });

    it('should handle test dependencies correctly', () => {
      expect(mockTestDepsPlugin.dependencies).toEqual(['test-provider']);
      expect(mockTestDepsPlugin.testDependencies).toEqual(['test-helper']);
    });
  });
});
