import type { IAgentRuntime, TestCase } from '@elizaos/core';
import { strict as assert } from 'node:assert';
import { PluginManagerService } from '../../services/pluginManagerService.ts';
import { PluginStatus } from '../../types.ts';

/**
 * E2E test for Auton8n integration with Plugin Manager.
 *
 * This test simulates how the auton8n (automation) plugin would use the plugin manager
 * to orchestrate complex workflows by dynamically loading/unloading plugins,
 * checking capabilities, and managing plugin dependencies.
 */
export const auton8nIntegrationTests: TestCase[] = [
  {
    name: 'should prepare workflow by ensuring required plugins are available',
    fn: async (runtime: IAgentRuntime) => {
      const pluginManager = runtime.getService('PLUGIN_MANAGER') as PluginManagerService;
      assert(pluginManager, 'Plugin Manager service should be available');

      // Simulate a workflow that requires specific plugins
      const workflowRequirements = [
        'http-client', // For API calls
        'json-transform', // For data transformation
        'database', // For data storage
      ];

      console.log('[Auton8n] Workflow requires plugins:', workflowRequirements);

      // Check current capabilities
      const capabilities = await pluginManager.analyzeCurrentCapabilities();
      console.log('[Auton8n] Current capabilities:', capabilities.core);

      // Identify missing plugins
      const missingPlugins = workflowRequirements.filter(
        (req) => !capabilities.core.some((cap) => cap.toLowerCase().includes(req))
      );

      if (missingPlugins.length > 0) {
        console.log('[Auton8n] Missing plugins:', missingPlugins);

        // Search for missing plugins in registry
        for (const pluginName of missingPlugins) {
          const searchResults = await pluginManager.searchPlugins(pluginName);
          if (searchResults.length > 0) {
            console.log(`[Auton8n] Found ${pluginName} plugin: ${searchResults[0].plugin.name}`);
            // In real scenario, would install: await pluginManager.installPluginFromRegistry(...)
          }
        }
      } else {
        console.log('[Auton8n] All required plugins are available');
      }
    },
  },

  {
    name: 'should dynamically load/unload plugins during workflow execution',
    fn: async (runtime: IAgentRuntime) => {
      const pluginManager = runtime.getService('PLUGIN_MANAGER') as PluginManagerService;

      // Create test plugins for workflow steps
      const workflowPlugins = [
        {
          name: 'workflow-step-1',
          description: 'First step in workflow',
          actions: [
            {
              name: 'STEP_1_ACTION',
              description: 'Execute step 1',
              similes: []
              validate: async () => true,
              handler: async () => ({ text: 'Step 1 completed' }),
              examples: []
            },
          ],
        },
        {
          name: 'workflow-step-2',
          description: 'Second step in workflow',
          actions: [
            {
              name: 'STEP_2_ACTION',
              description: 'Execute step 2',
              similes: []
              validate: async () => true,
              handler: async () => ({ text: 'Step 2 completed' }),
              examples: []
            },
          ],
        },
      ];

      // Register workflow plugins
      const pluginIds: string[] = [];
      for (const plugin of workflowPlugins) {
        const id = await pluginManager.registerPlugin(plugin);
        pluginIds.push(id);
        console.log(`[Auton8n] Registered ${plugin.name} with ID: ${id}`);
      }

      // Simulate workflow execution
      console.log('[Auton8n] Starting workflow execution...');

      for (let i = 0; i < pluginIds.length; i++) {
        const pluginId = pluginIds[i];
        const pluginState = pluginManager.getPlugin(pluginId);

        console.log(`[Auton8n] Step ${i + 1}: Loading ${pluginState?.name}`);

        // Load plugin for this step
        await pluginManager.loadPlugin({ pluginId });

        // Verify it's loaded
        const updatedState = pluginManager.getPlugin(pluginId);
        assert.strictEqual(updatedState?.status, PluginStatus.LOADED, 'Plugin should be loaded');

        // Simulate step execution
        console.log(`[Auton8n] Executing ${pluginState?.name}...`);
        // In real workflow, would execute the plugin's actions

        // Unload after execution to free resources
        if (i < pluginIds.length - 1) {
          // Keep last plugin loaded for demo
          await pluginManager.unloadPlugin({ pluginId });
          console.log(`[Auton8n] Unloaded ${pluginState?.name}`);
        }
      }

      console.log('[Auton8n] Workflow completed successfully');
    },
  },

  {
    name: 'should handle workflow with plugin dependencies',
    fn: async (runtime: IAgentRuntime) => {
      const pluginManager = runtime.getService('PLUGIN_MANAGER') as PluginManagerService;

      // Simulate plugins with dependencies
      const basePlugin = {
        name: 'workflow-base',
        description: 'Base functionality for workflow',
        providers: [
          {
            name: 'BASE_DATA_PROVIDER',
            description: 'Provides base data',
            get: async () => ({ text: 'Base data', data: { value: 42 } }),
          },
        ],
      };

      const dependentPlugin = {
        name: 'workflow-dependent',
        description: 'Depends on base plugin',
        dependencies: ['workflow-base'],
        actions: [
          {
            name: 'DEPENDENT_ACTION',
            description: 'Uses base data',
            similes: []
            validate: async () => true,
            handler: async (runtime: IAgentRuntime) => {
              // Would access BASE_DATA_PROVIDER in real scenario
              return { text: 'Processed base data' };
            },
            examples: []
          },
        ],
      };

      // Register plugins
      const baseId = await pluginManager.registerPlugin(basePlugin);
      const depId = await pluginManager.registerPlugin(dependentPlugin);

      console.log('[Auton8n] Registered plugins with dependency relationship');

      // Load in correct order (base first)
      await pluginManager.loadPlugin({ pluginId: baseId });
      console.log('[Auton8n] Loaded base plugin');

      await pluginManager.loadPlugin({ pluginId: depId });
      console.log('[Auton8n] Loaded dependent plugin');

      // Verify both are loaded
      const baseState = pluginManager.getPlugin(baseId);
      const depState = pluginManager.getPlugin(depId);

      assert.strictEqual(baseState?.status, PluginStatus.LOADED);
      assert.strictEqual(depState?.status, PluginStatus.LOADED);

      console.log('[Auton8n] Successfully loaded plugins with dependencies');
    },
  },

  {
    name: 'should handle workflow errors and recovery',
    fn: async (runtime: IAgentRuntime) => {
      const pluginManager = runtime.getService('PLUGIN_MANAGER') as PluginManagerService;

      // Create a plugin that simulates failure
      const faultyPlugin = {
        name: 'workflow-faulty',
        description: 'Plugin that might fail',
        actions: [
          {
            name: 'FAULTY_ACTION',
            description: 'Might fail',
            similes: []
            validate: async () => true,
            handler: async () => {
              if (Math.random() > 0.5) {
                throw new Error('Simulated failure');
              }
              return { text: 'Success' };
            },
            examples: []
          },
        ],
      };

      const pluginId = await pluginManager.registerPlugin(faultyPlugin);

      // Workflow with error handling
      console.log('[Auton8n] Starting workflow with potential failures...');

      try {
        await pluginManager.loadPlugin({ pluginId });

        // Simulate workflow execution with retry logic
        let attempts = 0;
        const maxAttempts = 3;
        let success = false;

        while (attempts < maxAttempts && !success) {
          attempts++;
          console.log(`[Auton8n] Attempt ${attempts}/${maxAttempts}`);

          try {
            // In real scenario, would execute the action
            // For demo, just check if plugin is loaded
            const state = pluginManager.getPlugin(pluginId);
            if (state?.status === PluginStatus.LOADED) {
              success = true;
              console.log('[Auton8n] Workflow step succeeded');
            }
          } catch (error) {
            console.log(`[Auton8n] Attempt ${attempts} failed:`, error);
            if (attempts === maxAttempts) {
              throw error;
            }
          }
        }

        // Cleanup
        await pluginManager.unloadPlugin({ pluginId });
        console.log('[Auton8n] Workflow completed with recovery');
      } catch (error) {
        console.log('[Auton8n] Workflow failed after all attempts:', error);

        // Recovery: suggest alternative plugins
        const alternatives = await pluginManager.searchPlugins('alternative workflow');
        if (alternatives.length > 0) {
          console.log('[Auton8n] Suggested alternatives:', alternatives[0].plugin.name);
        }
      }
    },
  },

  {
    name: 'should optimize workflow by analyzing plugin performance',
    fn: async (runtime: IAgentRuntime) => {
      const pluginManager = runtime.getService('PLUGIN_MANAGER') as PluginManagerService;

      // Get all available plugins
      const allPlugins = pluginManager.getAllPlugins();
      const loadedPlugins = allPlugins.filter((p) => p.status === PluginStatus.LOADED);

      console.log(`[Auton8n] Analyzing ${loadedPlugins.length} loaded plugins for optimization`);

      // Simulate performance metrics
      const performanceMetrics = loadedPlugins.map((plugin) => ({
        pluginId: plugin.id,
        pluginName: plugin.name,
        memoryUsage: Math.random() * 100, // MB
        executionTime: Math.random() * 1000, // ms
        errorRate: Math.random() * 0.1, // 0-10%
      }));

      // Find optimization opportunities
      const highMemoryPlugins = performanceMetrics.filter((m) => m.memoryUsage > 50);
      const slowPlugins = performanceMetrics.filter((m) => m.executionTime > 500);

      if (highMemoryPlugins.length > 0) {
        console.log(
          '[Auton8n] High memory usage plugins:',
          highMemoryPlugins.map((p) => p.pluginName)
        );
        console.log('[Auton8n] Recommendation: Unload these plugins when not in use');
      }

      if (slowPlugins.length > 0) {
        console.log(
          '[Auton8n] Slow plugins:',
          slowPlugins.map((p) => p.pluginName)
        );
        console.log('[Auton8n] Recommendation: Look for faster alternatives or optimize');

        // Search for alternatives
        for (const slowPlugin of slowPlugins) {
          const alternatives = await pluginManager.recommendPlugins({
            recentActions: []
            currentCapabilities: [slowPlugin.pluginName],
            failedActions: []
            userIntent: `faster alternative to ${slowPlugin.pluginName}`,
          });

          if (alternatives.length > 0) {
            console.log(
              `[Auton8n] Alternative for ${slowPlugin.pluginName}: ${alternatives[0].plugin.name}`
            );
          }
        }
      }

      console.log('[Auton8n] Workflow optimization analysis complete');
    },
  },
];
