import { describe, expect, it, beforeEach } from 'bun:test';
import { type Plugin } from '@elizaos/core';
import { resolvePluginDependencies } from '../../../../src/commands/start/utils/dependency-resolver';

describe('Plugin Dependency Loading', () => {
  let testPlugins: Map<string, Plugin>;

  beforeEach(() => {
    testPlugins = new Map();
  });

  it('should resolve simple dependencies in correct order', () => {
    // Create test plugins with dependencies
    const pluginA: Plugin = {
      name: 'plugin-a',
      description: 'Plugin A',
      dependencies: ['plugin-b'],
    };

    const pluginB: Plugin = {
      name: 'plugin-b',
      description: 'Plugin B',
    };

    testPlugins.set('plugin-a', pluginA);
    testPlugins.set('plugin-b', pluginB);

    const result = resolvePluginDependencies(testPlugins);

    expect(result).toHaveLength(2);
    expect(result[0].name).toBe('plugin-b'); // Should be loaded first
    expect(result[1].name).toBe('plugin-a'); // Should be loaded second
  });

  it('should handle chain dependencies correctly', () => {
    const pluginA: Plugin = {
      name: 'plugin-a',
      description: 'Plugin A',
      dependencies: ['plugin-b'],
    };

    const pluginB: Plugin = {
      name: 'plugin-b',
      description: 'Plugin B',
      dependencies: ['plugin-c'],
    };

    const pluginC: Plugin = {
      name: 'plugin-c',
      description: 'Plugin C',
    };

    testPlugins.set('plugin-a', pluginA);
    testPlugins.set('plugin-b', pluginB);
    testPlugins.set('plugin-c', pluginC);

    const result = resolvePluginDependencies(testPlugins);

    expect(result).toHaveLength(3);
    expect(result[0].name).toBe('plugin-c'); // Should be loaded first
    expect(result[1].name).toBe('plugin-b'); // Should be loaded second
    expect(result[2].name).toBe('plugin-a'); // Should be loaded third
  });

  it('should deduplicate dependencies', () => {
    const pluginA: Plugin = {
      name: 'plugin-a',
      description: 'Plugin A',
      dependencies: ['plugin-common'],
    };

    const pluginB: Plugin = {
      name: 'plugin-b',
      description: 'Plugin B',
      dependencies: ['plugin-common'],
    };

    const pluginCommon: Plugin = {
      name: 'plugin-common',
      description: 'Common Plugin',
    };

    testPlugins.set('plugin-a', pluginA);
    testPlugins.set('plugin-b', pluginB);
    testPlugins.set('plugin-common', pluginCommon);

    const result = resolvePluginDependencies(testPlugins);

    expect(result).toHaveLength(3);

    // plugin-common should only appear once
    const commonCount = result.filter((p) => p.name === 'plugin-common').length;
    expect(commonCount).toBe(1);

    // plugin-common should be loaded first
    expect(result[0].name).toBe('plugin-common');
  });

  it('should handle test dependencies in test mode', () => {
    const pluginA: Plugin = {
      name: 'plugin-a',
      description: 'Plugin A',
      dependencies: ['plugin-b'],
      testDependencies: ['plugin-test'],
    };

    const pluginB: Plugin = {
      name: 'plugin-b',
      description: 'Plugin B',
    };

    const pluginTest: Plugin = {
      name: 'plugin-test',
      description: 'Test Plugin',
    };

    testPlugins.set('plugin-a', pluginA);
    testPlugins.set('plugin-b', pluginB);
    testPlugins.set('plugin-test', pluginTest);

    // Test without test mode
    const resultNormal = resolvePluginDependencies(testPlugins, false);
    expect(resultNormal).toHaveLength(2);
    expect(resultNormal.find((p) => p.name === 'plugin-test')).toBeUndefined();

    // Test with test mode
    const resultTest = resolvePluginDependencies(testPlugins, true);
    expect(resultTest).toHaveLength(3);
    expect(resultTest.find((p) => p.name === 'plugin-test')).toBeDefined();
  });

  it('should handle missing dependencies gracefully', () => {
    const pluginA: Plugin = {
      name: 'plugin-a',
      description: 'Plugin A',
      dependencies: ['plugin-missing'],
    };

    testPlugins.set('plugin-a', pluginA);

    const result = resolvePluginDependencies(testPlugins);

    expect(result).toHaveLength(1);
    expect(result[0].name).toBe('plugin-a');
  });

  it('should detect circular dependencies', () => {
    const pluginA: Plugin = {
      name: 'plugin-a',
      description: 'Plugin A',
      dependencies: ['plugin-b'],
    };

    const pluginB: Plugin = {
      name: 'plugin-b',
      description: 'Plugin B',
      dependencies: ['plugin-a'], // Creates circular dependency
    };

    testPlugins.set('plugin-a', pluginA);
    testPlugins.set('plugin-b', pluginB);

    const result = resolvePluginDependencies(testPlugins);

    // Should still return plugins but in a safe order
    expect(result).toHaveLength(2);
  });

  it('should handle complex dependency graph', () => {
    const pluginA: Plugin = {
      name: 'plugin-a',
      description: 'Plugin A',
      dependencies: ['plugin-b', 'plugin-c'],
    };

    const pluginB: Plugin = {
      name: 'plugin-b',
      description: 'Plugin B',
      dependencies: ['plugin-d'],
    };

    const pluginC: Plugin = {
      name: 'plugin-c',
      description: 'Plugin C',
      dependencies: ['plugin-d'],
    };

    const pluginD: Plugin = {
      name: 'plugin-d',
      description: 'Plugin D',
    };

    testPlugins.set('plugin-a', pluginA);
    testPlugins.set('plugin-b', pluginB);
    testPlugins.set('plugin-c', pluginC);
    testPlugins.set('plugin-d', pluginD);

    const result = resolvePluginDependencies(testPlugins);

    expect(result).toHaveLength(4);

    // plugin-d should be loaded first
    expect(result[0].name).toBe('plugin-d');

    // plugin-a should be loaded last
    expect(result[3].name).toBe('plugin-a');

    // plugin-b and plugin-c should be loaded before plugin-a
    const pluginAIndex = result.findIndex((p) => p.name === 'plugin-a');
    const pluginBIndex = result.findIndex((p) => p.name === 'plugin-b');
    const pluginCIndex = result.findIndex((p) => p.name === 'plugin-c');

    expect(pluginBIndex).toBeLessThan(pluginAIndex);
    expect(pluginCIndex).toBeLessThan(pluginAIndex);
  });
});
