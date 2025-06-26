import type { IAgentRuntime, TestCase } from '@elizaos/core';
import { strict as assert } from 'node:assert';
import { PluginManagerService } from '../../services/pluginManagerService.ts';

/**
 * E2E test for Autocoder integration with Plugin Manager.
 *
 * This test simulates how the autocoder plugin would use the plugin manager
 * to analyze agent capabilities, find suitable plugins, clone them for modification,
 * and suggest enhancements.
 */
export const autocoderIntegrationTests: TestCase[] = [
  {
    name: 'should analyze agent capabilities and suggest plugin enhancements',
    fn: async (runtime: IAgentRuntime) => {
      const pluginManager = runtime.getService('PLUGIN_MANAGER') as PluginManagerService;
      assert(pluginManager, 'Plugin Manager service should be available');

      // Simulate autocoder analyzing current capabilities
      const capabilities = await pluginManager.analyzeCurrentCapabilities();
      assert(capabilities, 'Should return capability profile');
      assert(Array.isArray(capabilities.core), 'Should have core capabilities array');

      // Simulate task history that shows missing capabilities
      const taskHistory = [
        {
          action: 'generate-image',
          timestamp: new Date(),
          success: false,
          error: 'No image generation capability',
        },
        {
          action: 'edit-image',
          timestamp: new Date(),
          success: false,
          error: 'No image editing capability',
        },
      ];

      // Get enhancement suggestions
      const enhancements = await pluginManager.suggestCapabilityEnhancements(taskHistory);
      assert(Array.isArray(enhancements), 'Should return enhancement suggestions');

      console.log('[Autocoder] Current capabilities:', capabilities.core.length);
      console.log('[Autocoder] Suggested enhancements:', enhancements);
    },
  },

  {
    name: 'should search for plugins based on task requirements',
    fn: async (runtime: IAgentRuntime) => {
      const pluginManager = runtime.getService('PLUGIN_MANAGER') as PluginManagerService;

      // Simulate autocoder searching for specific functionality
      const searchQuery = 'database operations';
      const searchResults = await pluginManager.searchPlugins(searchQuery, {
        recentActions: ['store-data', 'query-data'],
        currentCapabilities: [],
        failedActions: ['database-write'],
        userIntent: 'Need to store and query user data',
      });

      assert(Array.isArray(searchResults), 'Should return search results');

      if (searchResults.length > 0) {
        console.log('[Autocoder] Found plugins for database operations:');
        searchResults.forEach((result) => {
          console.log(
            `  - ${result.plugin.name}: ${result.plugin.description} (Score: ${result.score})`
          );
        });
      }
    },
  },

  {
    name: 'should clone a plugin for modification',
    fn: async (runtime: IAgentRuntime) => {
      const pluginManager = runtime.getService('PLUGIN_MANAGER') as PluginManagerService;

      // Get available plugins
      const registry = await pluginManager.getAvailablePluginsFromRegistry();
      const pluginNames = Object.keys(registry);

      if (pluginNames.length > 0) {
        // Pick first plugin for demo
        const targetPlugin = registry[pluginNames[0]];
        const clonePath = `./autocoder-workspace/${targetPlugin.name}`;

        console.log(`[Autocoder] Attempting to clone ${targetPlugin.name} for modification...`);

        try {
          const cloneResult = await pluginManager.cloneRepository(
            targetPlugin.repository || targetPlugin.git?.repo || '',
            clonePath
          );

          if (cloneResult.success) {
            console.log(`[Autocoder] Successfully cloned to: ${cloneResult.path}`);
            // In real autocoder, would now:
            // 1. Analyze the plugin code
            // 2. Make modifications based on requirements
            // 3. Test the modifications
            // 4. Create a PR or publish
          } else {
            console.log(`[Autocoder] Clone failed: ${cloneResult.error}`);
          }
        } catch (_error) {
          console.log('[Autocoder] Clone operation skipped (no repo URL)');
        }
      }
    },
  },

  {
    name: 'should recommend plugins for complex workflows',
    fn: async (runtime: IAgentRuntime) => {
      const pluginManager = runtime.getService('PLUGIN_MANAGER') as PluginManagerService;

      // Simulate a complex workflow requirement
      const workflowContext = {
        recentActions: ['fetch-api-data', 'transform-json', 'store-results'],
        currentCapabilities: ['basic-text', 'basic-math'],
        failedActions: ['http-request', 'database-write'],
        userIntent: 'Build an API data pipeline',
      };

      const recommendations = await pluginManager.recommendPlugins(workflowContext);

      assert(Array.isArray(recommendations), 'Should return plugin recommendations');

      console.log('[Autocoder] Recommended plugins for API data pipeline:');
      recommendations.forEach((rec, index) => {
        console.log(`  ${index + 1}. ${rec.plugin.name}`);
        if (rec.matchReasons?.length > 0) {
          console.log(`     Reasons: ${rec.matchReasons.join(', ')}`);
        }
      });

      // Simulate autocoder deciding which plugins to install
      if (recommendations.length > 0) {
        const topRecommendation = recommendations[0];
        console.log(`[Autocoder] Would install: ${topRecommendation.plugin.name}`);
      }
    },
  },

  {
    name: 'should handle plugin development workflow',
    fn: async (runtime: IAgentRuntime) => {
      const pluginManager = runtime.getService('PLUGIN_MANAGER') as PluginManagerService;

      // Simulate creating a new plugin from scratch
      const newPlugin = {
        name: 'autocoder-generated-plugin',
        description: 'Plugin generated by autocoder for custom functionality',
        actions: [
          {
            name: 'CUSTOM_ACTION',
            description: 'Custom action created by autocoder',
            similes: ['custom', 'autocoded'],
            validate: async () => true,
            handler: async () => ({ text: 'Autocoder-generated response' }),
            examples: [],
          },
        ],
      };

      console.log('[Autocoder] Registering generated plugin...');
      const pluginId = await pluginManager.registerPlugin(newPlugin);
      assert(pluginId, 'Should successfully register the plugin');

      // Check plugin status
      const pluginState = pluginManager.getPlugin(pluginId);
      assert(pluginState, 'Should find the registered plugin');
      assert.strictEqual(pluginState.status, 'ready', 'Plugin should be ready to load');

      console.log(`[Autocoder] Plugin registered with ID: ${pluginId}`);
      console.log(`[Autocoder] Plugin status: ${pluginState.status}`);

      // In real autocoder workflow would:
      // 1. Generate comprehensive plugin code
      // 2. Add tests
      // 3. Build and validate
      // 4. Publish to registry
    },
  },
];
