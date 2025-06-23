import { type Plugin, type IAgentRuntime, elizaLogger } from '@elizaos/core';
// Services
import { PluginManagerService } from './services/pluginManagerService.ts';
// Actions
import { loadPluginAction } from './actions/loadPlugin.ts';
import { unloadPluginAction } from './actions/unloadPlugin.ts';
import { startPluginConfigurationAction } from './actions/startPluginConfiguration.ts';
import { installPluginFromRegistryAction } from './actions/installPluginFromRegistry.ts';
import { searchPluginAction } from './actions/searchPluginAction.ts';
import { clonePluginAction } from './actions/clonePluginAction.ts';
import { publishPluginAction } from './actions/publishPluginAction.ts';
import { recoverPluginAction } from './actions/recoverPluginAction.ts';
import { checkDependenciesAction } from './actions/checkDependenciesAction.ts';
import { updatePluginAction } from './actions/updatePluginAction.ts';
import { managePluginBranchAction } from './actions/managePluginBranchAction.ts';
import { viewPluginDetailsAction } from './actions/viewPluginDetails.ts';
// New information actions (replacing providers)
import { checkPluginConfigurationAction } from './actions/checkPluginConfigurationAction.ts';
import { checkPluginHealthAction } from './actions/checkPluginHealthAction.ts';
import { getPluginStateAction } from './actions/getPluginStateAction.ts';
import { listRegistryPluginsAction } from './actions/listRegistryPluginsAction.ts';
// Trust Integration
import { wrapPluginManagerActionsWithTrust } from './trust/pluginManagerTrustIntegration.ts';
// Tests
import { pluginManagerScenariosSuite } from './__tests__/e2e/pluginManagerScenarios.e2e.ts';
import { fullLifecycleE2ETest } from './__tests__/e2e/fullLifecycle.e2e.ts';
import './types.ts'; // Ensure module augmentation is loaded

/**
 * Plugin Manager Plugin for ElizaOS
 *
 * Provides comprehensive plugin management capabilities including:
 * - Dynamic loading and unloading of plugins at runtime
 * - Plugin registry integration for discovering and installing plugins
 * - Secure configuration management with encrypted storage
 * - Interactive dialog system for collecting environment variables
 * - Proactive configuration suggestions and status monitoring
 * - Trust-based access control for critical plugin operations
 *
 * Features:
 * - Registry-based plugin discovery and installation
 * - Dynamic plugin loading/unloading without restart
 * - Secure environment variable management with AES-256-CBC encryption
 * - Interactive user dialogs for plugin configuration
 * - Package.json convention for declaring required variables
 * - Validation and secure storage mechanisms
 * - Agent behavior integration for proactive configuration
 * - Role-based access control for plugin operations
 * - Complete testing and validation pipeline
 */
export const pluginManagerPlugin: Plugin = {
  name: 'plugin-manager',
  description:
    'Manages the full lifecycle of plugins with health monitoring, dependency resolution, trust-based access control, and advanced features.',

  services: [
    PluginManagerService, // Main service that uses internal managers for all functionality
  ],

  // Enhanced dependencies including trust system
  dependencies: [] // Made optional - these will be loaded if available but not required

  actions: [
    loadPluginAction,
    unloadPluginAction,
    startPluginConfigurationAction,
    installPluginFromRegistryAction,
    searchPluginAction,
    clonePluginAction,
    publishPluginAction,
    recoverPluginAction, // Phase 1: Recovery action
    checkDependenciesAction, // Phase 2: Dependency checking
    updatePluginAction, // Phase 3: Version updates
    managePluginBranchAction, // Phase 3: Branch management
    viewPluginDetailsAction,
    // Information actions (replacing providers)
    checkPluginConfigurationAction,
    checkPluginHealthAction,
    getPluginStateAction,
    listRegistryPluginsAction,
  ],

  providers: [] // All providers have been migrated to actions

  tests: [pluginManagerScenariosSuite, fullLifecycleE2ETest],

  async init(config: Record<string, string>, runtime: IAgentRuntime): Promise<void> {
    elizaLogger.info('\n┌════════════════════════════════════════┐');
    elizaLogger.info('│        PLUGIN MANAGER PLUGIN          │');
    elizaLogger.info('├────────────────────────────────────────┤');
    elizaLogger.info('│  Initializing Plugin Manager...        │');
    elizaLogger.info('│  Enhanced with Trust Integration       │');
    elizaLogger.info('└════════════════════════════════════════┘');

    // Check if trust system is available
    const trustService = runtime.getService('trust-engine');
    const roleService = runtime.getService('role-manager');

    if (trustService && roleService) {
      elizaLogger.info('✔ Trust and role services available - applying access control');

      // Apply trust-based access control to all actions
      const trustWrappedActions = wrapPluginManagerActionsWithTrust([
        loadPluginAction,
        unloadPluginAction,
        startPluginConfigurationAction,
        installPluginFromRegistryAction,
        searchPluginAction,
        clonePluginAction,
        publishPluginAction,
        recoverPluginAction,
        checkDependenciesAction,
        updatePluginAction,
        managePluginBranchAction,
        viewPluginDetailsAction,
        checkPluginConfigurationAction,
        checkPluginHealthAction,
        getPluginStateAction,
        listRegistryPluginsAction,
      ]);

      // Register trust-enhanced actions
      for (const action of trustWrappedActions) {
        runtime.registerAction(action);
      }

      elizaLogger.info(
        `✔ Registered ${trustWrappedActions.length} trust-enhanced plugin manager actions`
      );

      // Set up admin role validation for critical operations
      try {
        const securityModule = runtime.getService('security-module') as any;
        if (securityModule && securityModule.configureHighRiskOperations) {
          await securityModule.configureHighRiskOperations([
            'LOAD_PLUGIN',
            'UNLOAD_PLUGIN',
            'PUBLISH_PLUGIN',
            'INSTALL_PLUGIN_FROM_REGISTRY',
            'UPDATE_PLUGIN',
            'RECOVER_PLUGIN',
          ]);
          elizaLogger.info('✔ Configured high-risk operation protection for plugin management');
        }
      } catch (error) {
        elizaLogger.warn('⚠️ Failed to configure security module protection:', error);
      }
    } else {
      elizaLogger.warn(
        '⚠️ Trust/role services not available - actions will run without access control'
      );
      elizaLogger.warn(
        '⚠️ This poses significant security risks for plugin loading and management'
      );

      // Register actions without trust enhancement (fallback mode)
      for (const action of [
        loadPluginAction,
        unloadPluginAction,
        startPluginConfigurationAction,
        installPluginFromRegistryAction,
        searchPluginAction,
        clonePluginAction,
        publishPluginAction,
        recoverPluginAction,
        checkDependenciesAction,
        updatePluginAction,
        managePluginBranchAction,
        viewPluginDetailsAction,
        checkPluginConfigurationAction,
        checkPluginHealthAction,
        getPluginStateAction,
        listRegistryPluginsAction,
      ]) {
        runtime.registerAction(action);
      }
    }
  },
};

// Export services and types for external use
export { PluginManagerService } from './services/pluginManagerService.ts';
export * from './types.ts';

// Export E2E tests for elizaos test runner
export { e2e } from './__tests__/e2e/index.ts';

// Export default plugin
export default pluginManagerPlugin;
