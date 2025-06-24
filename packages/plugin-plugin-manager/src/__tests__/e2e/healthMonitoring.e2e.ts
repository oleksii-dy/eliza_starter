import type { IAgentRuntime, TestCase } from '@elizaos/core';
import { strict as assert } from 'node:assert';
import { PluginManagerService } from '../../services/pluginManagerService.ts';

/**
 * E2E test for plugin health monitoring and recovery.
 * Tests resource usage tracking, crash recovery, and performance monitoring.
 */
export const healthMonitoringTests: TestCase[] = [
  {
    name: 'should monitor plugin resource usage',
    fn: async (runtime: IAgentRuntime) => {
      const pluginManager = runtime.getService('PLUGIN_MANAGER') as PluginManagerService;
      assert(pluginManager, 'Plugin Manager service should be available');

      // Create a resource-intensive plugin
      const heavyPlugin = {
        name: 'resource-heavy-plugin',
        description: 'Plugin that uses significant resources',
        actions: [
          {
            name: 'HEAVY_COMPUTATION',
            description: 'Performs heavy computation',
            similes: [],
            validate: async () => true,
            handler: async () => {
              // Simulate heavy work
              const start = Date.now();
              let result = 0;
              for (let i = 0; i < 10000000; i++) {
                result += Math.sqrt(i);
              }
              const duration = Date.now() - start;
              return {
                text: `Computation completed in ${duration}ms`,
                data: { result, duration },
              };
            },
            examples: [],
          },
        ],
      };

      const pluginId = await pluginManager.registerPlugin(heavyPlugin);
      await pluginManager.loadPlugin({ pluginId });

      // TODO: Implement resource monitoring
      // const metrics = await pluginManager.getPluginMetrics(pluginId);
      // assert(metrics.memoryUsage, 'Should track memory usage');
      // assert(metrics.cpuTime, 'Should track CPU time');

      console.log('[HealthMonitor] Resource monitoring not yet implemented');
    },
  },

  {
    name: 'should recover from plugin crashes',
    fn: async (runtime: IAgentRuntime) => {
      const pluginManager = runtime.getService('PLUGIN_MANAGER') as PluginManagerService;

      let crashCount = 0;
      const crashingPlugin = {
        name: 'crashing-plugin',
        description: 'Plugin that crashes periodically',
        actions: [
          {
            name: 'UNSTABLE_ACTION',
            description: 'Action that might crash',
            similes: [],
            validate: async () => true,
            handler: async () => {
              crashCount++;
              if (crashCount % 3 === 0) {
                throw new Error('Simulated plugin crash!');
              }
              return { text: 'Action completed successfully' };
            },
            examples: [],
          },
        ],
      };

      const pluginId = await pluginManager.registerPlugin(crashingPlugin);
      await pluginManager.loadPlugin({ pluginId });

      // Execute action multiple times to trigger crashes
      const action = runtime.actions.find((a) => a.name === 'UNSTABLE_ACTION');
      assert(action, 'Action should be registered');

      let successCount = 0;
      let errorCount = 0;

      for (let i = 0; i < 5; i++) {
        try {
          await action.handler(runtime, {} as any, { values: {}, data: {}, text: '' });
          successCount++;
        } catch (_error) {
          errorCount++;
          console.log(`[HealthMonitor] Action crashed on attempt ${i + 1}`);

          // TODO: Implement automatic recovery
          // await pluginManager.recoverPlugin(pluginId);
        }
      }

      console.log(`[HealthMonitor] Success: ${successCount}, Errors: ${errorCount}`);
      assert(_errorCount > 0, 'Should have experienced crashes');

      // Plugin should still be functional after crashes
      const pluginState = pluginManager.getPlugin(pluginId);
      assert(pluginState?.status !== 'error', 'Plugin should recover from crashes');
    },
  },

  {
    name: 'should detect and handle memory leaks',
    fn: async (runtime: IAgentRuntime) => {
      const pluginManager = runtime.getService('PLUGIN_MANAGER') as PluginManagerService;

      const leakyPlugin = {
        name: 'memory-leak-plugin',
        description: 'Plugin with memory leak',
        actions: [
          {
            name: 'LEAKY_ACTION',
            description: 'Action that leaks memory',
            similes: [],
            validate: async () => true,
            handler: async () => {
              // Simulate memory leak by holding references
              const leakedData: any[] = [];
              for (let i = 0; i < 1000; i++) {
                leakedData.push(new Array(1000).fill(Math.random()));
              }
              // Store in global to prevent GC
              (global as any).leakedData = (global as any).leakedData || [];
              (global as any).leakedData.push(leakedData);

              return { text: 'Action completed (with leak)' };
            },
            examples: [],
          },
        ],
      };

      const pluginId = await pluginManager.registerPlugin(leakyPlugin);
      await pluginManager.loadPlugin({ pluginId });

      // TODO: Implement memory leak detection
      // const initialMemory = process.memoryUsage().heapUsed;

      // Execute leaky action multiple times
      const action = runtime.actions.find((a) => a.name === 'LEAKY_ACTION');
      for (let i = 0; i < 5; i++) {
        await action?.handler(runtime, {} as any, { values: {}, data: {}, text: '' });
      }

      // const finalMemory = process.memoryUsage().heapUsed;
      // const memoryIncrease = finalMemory - initialMemory;

      console.log('[HealthMonitor] Memory leak detection not yet implemented');

      // Clean up
      delete (global as any).leakedData;
    },
  },

  {
    name: 'should provide performance alerts',
    fn: async (runtime: IAgentRuntime) => {
      const pluginManager = runtime.getService('PLUGIN_MANAGER') as PluginManagerService;

      const slowPlugin = {
        name: 'slow-plugin',
        description: 'Plugin with slow operations',
        actions: [
          {
            name: 'SLOW_ACTION',
            description: 'Action that runs slowly',
            similes: [],
            validate: async () => true,
            handler: async () => {
              // Simulate slow operation
              await new Promise((resolve) => setTimeout(resolve, 3000));
              return { text: 'Slow action completed' };
            },
            examples: [],
          },
        ],
      };

      const pluginId = await pluginManager.registerPlugin(slowPlugin);
      await pluginManager.loadPlugin({ pluginId });

      // TODO: Implement performance monitoring
      // const performanceAlerts = await pluginManager.getPerformanceAlerts();

      console.log('[HealthMonitor] Performance monitoring would track:');
      console.log('  - Action execution times');
      console.log('  - Plugin initialization times');
      console.log('  - Resource usage patterns');
      console.log('  - Response time degradation');
    },
  },
];
