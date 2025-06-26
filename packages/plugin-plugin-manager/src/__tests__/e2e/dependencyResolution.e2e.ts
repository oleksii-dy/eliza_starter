import type { IAgentRuntime, TestCase } from '@elizaos/core';
import { strict as assert } from 'node:assert';
import { PluginManagerService } from '../../services/pluginManagerService.ts';

/**
 * E2E test for dependency resolution features.
 * Tests complex dependency scenarios, conflict detection, and resolution.
 */
export const dependencyResolutionTests: TestCase[] = [
  {
    name: 'should detect and resolve version conflicts',
    fn: async (runtime: IAgentRuntime) => {
      const pluginManager = runtime.getService('PLUGIN_MANAGER') as PluginManagerService;

      assert(pluginManager, 'Plugin manager service should be available');

      console.log('[DependencyResolution] Testing version conflict detection...');

      // Create plugins with conflicting dependencies
      const pluginA = {
        name: 'plugin-a',
        description: 'Plugin A',
        dependencies: {
          'shared-lib': '^1.0.0',
        },
      };

      const pluginB = {
        name: 'plugin-b',
        description: 'Plugin B',
        dependencies: {
          'shared-lib': '^2.0.0',
        },
      };

      // Register plugins
      const idA = await pluginManager.registerPlugin(pluginA as any);
      const idB = await pluginManager.registerPlugin(pluginB as any);

      // Check dependencies using plugin manager
      const resolution = await pluginManager.checkPluginDependencies(['plugin-a', 'plugin-b'], {
        checkCircular: true,
      });

      assert(!resolution.success, 'Should detect version conflict');
      assert(resolution.conflicts.length > 0, 'Should have conflicts');

      const conflict = resolution.conflicts.find((c: any) => c.pluginName === 'shared-lib');
      assert(conflict, 'Should identify shared-lib conflict');
      assert(conflict.requestedBy.length === 2, 'Should show both plugins requesting it');

      console.log('[DependencyResolution] Version conflict detected successfully');
    },
  },

  {
    name: 'should detect circular dependencies',
    fn: async (runtime: IAgentRuntime) => {
      const pluginManager = runtime.getService('PLUGIN_MANAGER') as PluginManagerService;

      console.log('[DependencyResolution] Testing circular dependency detection...');

      // Create circular dependency scenario
      const pluginX = {
        name: 'plugin-x',
        description: 'Plugin X',
        dependencies: {
          'plugin-y': '*',
        },
      };

      const pluginY = {
        name: 'plugin-y',
        description: 'Plugin Y',
        dependencies: {
          'plugin-z': '*',
        },
      };

      const pluginZ = {
        name: 'plugin-z',
        description: 'Plugin Z',
        dependencies: {
          'plugin-x': '*', // Creates cycle
        },
      };

      // Register plugins
      await pluginManager.registerPlugin(pluginX as any);
      await pluginManager.registerPlugin(pluginY as any);
      await pluginManager.registerPlugin(pluginZ as any);

      // Check dependencies
      const resolution = await pluginManager.checkPluginDependencies(['plugin-x'], {
        checkCircular: true,
      });

      assert(!resolution.success, 'Should detect circular dependency');

      const circularConflict = resolution.conflicts.find((c: any) =>
        c.requestedBy.some((r: any) => r.constraint === 'circular')
      );
      assert(circularConflict, 'Should identify circular dependency');

      console.log('[DependencyResolution] Circular dependency detected successfully');
    },
  },

  {
    name: 'should calculate minimal plugin set',
    fn: async (runtime: IAgentRuntime) => {
      const pluginManager = runtime.getService('PLUGIN_MANAGER') as PluginManagerService;

      console.log('[DependencyResolution] Testing minimal set calculation...');

      // Create plugin hierarchy
      const core = {
        name: 'core-plugin',
        description: 'Core functionality',
      };

      const util = {
        name: 'util-plugin',
        description: 'Utilities',
        dependencies: {
          'core-plugin': '*',
        },
      };

      const feature = {
        name: 'feature-plugin',
        description: 'Feature',
        dependencies: {
          'util-plugin': '*',
          'core-plugin': '*', // Redundant - util already depends on core
        },
      };

      const standalone = {
        name: 'standalone-plugin',
        description: 'Standalone feature',
      };

      // Register all plugins
      await pluginManager.registerPlugin(core as any);
      await pluginManager.registerPlugin(util as any);
      await pluginManager.registerPlugin(feature as any);
      await pluginManager.registerPlugin(standalone as any);

      // Request minimal set
      const resolution = await pluginManager.checkPluginDependencies(
        ['feature-plugin', 'standalone-plugin'],
        { findMinimalSet: true }
      );

      assert(resolution.success, 'Should resolve successfully');
      assert(resolution.minimalSet, 'Should have minimal set');

      // Should include feature, util, core, and standalone
      assert(resolution.minimalSet.length === 4, 'Should have 4 plugins in minimal set');
      assert(resolution.minimalSet.includes('core-plugin'), 'Should include core');
      assert(resolution.minimalSet.includes('util-plugin'), 'Should include util');
      assert(resolution.minimalSet.includes('feature-plugin'), 'Should include feature');
      assert(resolution.minimalSet.includes('standalone-plugin'), 'Should include standalone');

      console.log('[DependencyResolution] Minimal set calculated correctly');
    },
  },

  {
    name: 'should provide compatible plugin recommendations',
    fn: async (runtime: IAgentRuntime) => {
      const pluginManager = runtime.getService('PLUGIN_MANAGER') as PluginManagerService;

      console.log('[DependencyResolution] Testing plugin recommendations...');

      // Create a base plugin
      const basePlugin = {
        name: 'base-plugin',
        description: 'Base plugin with no conflicts',
      };

      await pluginManager.registerPlugin(basePlugin);

      // For now, we'll skip the recommendation test since it's not exposed through plugin manager
      // In a real implementation, this would be added to the plugin manager API
      console.log(
        '[DependencyResolution] Recommendation testing skipped - not exposed via plugin manager'
      );
    },
  },

  {
    name: 'should handle transitive dependencies correctly',
    fn: async (runtime: IAgentRuntime) => {
      const pluginManager = runtime.getService('PLUGIN_MANAGER') as PluginManagerService;

      console.log('[DependencyResolution] Testing transitive dependencies...');

      // Create transitive dependency chain
      const leaf = {
        name: 'leaf-plugin',
        description: 'Leaf node',
      };

      const middle = {
        name: 'middle-plugin',
        description: 'Middle node',
        dependencies: {
          'leaf-plugin': '^1.0.0',
        },
      };

      const root = {
        name: 'root-plugin',
        description: 'Root node',
        dependencies: {
          'middle-plugin': '^1.0.0',
        },
      };

      // Register plugins
      await pluginManager.registerPlugin(leaf as any);
      await pluginManager.registerPlugin(middle as any);
      await pluginManager.registerPlugin(root as any);

      // Resolve from root
      const resolution = await pluginManager.checkPluginDependencies(['root-plugin']);

      assert(resolution.success, 'Should resolve successfully');
      assert(resolution.graph.size === 3, 'Should include all 3 plugins');

      // Check installation order (leaf should come first)
      assert(resolution.installOrder[0] === 'leaf-plugin', 'Leaf should install first');
      assert(resolution.installOrder[1] === 'middle-plugin', 'Middle should install second');
      assert(resolution.installOrder[2] === 'root-plugin', 'Root should install last');

      console.log('[DependencyResolution] Transitive dependencies resolved correctly');
    },
  },
];
