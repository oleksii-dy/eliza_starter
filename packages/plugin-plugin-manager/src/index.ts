import { type Plugin, type IAgentRuntime, elizaLogger } from '@elizaos/core';
// Services
import { PluginManagerService } from './services/pluginManagerService.ts';
import { PlatformRegistryService } from './services/PlatformRegistryService.ts';
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
// Platform Registry Actions
import { platformRegistryActions } from './actions/platform-registry-actions.ts';
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
 * - Enhanced platform registry supporting plugins, MCPs, and workflows
 * - AI-powered platform registry interaction and management
 * - Build workflow integration with plugin-autocoder
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
 * - Platform registry with plugins, MCPs, and workflows
 * - Natural language registry interaction
 * - Automated build and deployment workflows
 */
export const pluginManagerPlugin: Plugin = {
  name: 'plugin-manager',
  description:
    'Manages the full lifecycle of plugins with health monitoring, dependency resolution, trust-based access control, and enhanced platform registry supporting plugins, MCPs, and workflows.',

  services: [
    PluginManagerService, // Main service that uses internal managers for all functionality
    PlatformRegistryService, // Enhanced registry supporting plugins, MCPs, and workflows
  ],

  // Enhanced dependencies including trust system
  dependencies: [], // Made optional - these will be loaded if available but not required

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
    // Platform Registry actions
    ...platformRegistryActions,
  ],

  providers: [], // All providers have been migrated to actions

  tests: [pluginManagerScenariosSuite, fullLifecycleE2ETest],

  async init(config: Record<string, string>, runtime: IAgentRuntime): Promise<void> {
    elizaLogger.info('\n┌════════════════════════════════════════┐');
    elizaLogger.info('│        PLUGIN MANAGER PLUGIN          │');
    elizaLogger.info('├────────────────────────────────────────┤');
    elizaLogger.info('│  Initializing Plugin Manager...        │');
    elizaLogger.info('│  ✓ Enhanced with Trust Integration     │');
    elizaLogger.info('│  ✓ Platform Registry (Plugins/MCPs)    │');
    elizaLogger.info('│  ✓ AI-Powered Registry Actions         │');
    elizaLogger.info('│  ✓ AutoCoder Build Integration         │');
    elizaLogger.info('└════════════════════════════════════════┘');

    // Register all actions first - trust enhancement will be applied later when services are available
    const allActions = [
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
      // Include platform registry actions
      ...platformRegistryActions,
    ];

    for (const action of allActions) {
      runtime.registerAction(action);
    }

    elizaLogger.info(`✔ Registered ${allActions.length} plugin manager actions`);

    // Schedule a delayed check for trust services after runtime initialization
    // This allows services to be fully initialized before we try to access them
    setTimeout(async () => {
      try {
        // Debug: log all available services for troubleshooting
        const availableServices: string[] = Array.from((runtime as any).services?.keys() || []);
        elizaLogger.info(`Available services: ${availableServices.join(', ')}`);

        // Try multiple service name variations
        const trustService =
          runtime.getService('trust-engine') ||
          runtime.getService('TrustEngineService') ||
          runtime.getService('trust');
        const securityService =
          runtime.getService('security-module') || runtime.getService('SecurityModuleService');
        const permissionService =
          runtime.getService('contextual-permissions') ||
          runtime.getService('PermissionManagerService');

        elizaLogger.info(`Trust service found: ${!!trustService}`);
        elizaLogger.info(`Security service found: ${!!securityService}`);
        elizaLogger.info(`Permission service found: ${!!permissionService}`);

        if (trustService && securityService && permissionService) {
          elizaLogger.info('✔ Trust services are now available - access control is enabled');

          // Configure high-risk operation protection if available
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
              elizaLogger.info(
                '✔ Configured high-risk operation protection for plugin management'
              );
            }
          } catch (error) {
            elizaLogger.warn('⚠️ Failed to configure security module protection:', error);
          }
        } else {
          elizaLogger.info('ℹ️ Trust services not available - using basic access control');
          elizaLogger.info(
            'ℹ️ Plugin management actions will use validation without trust scoring'
          );
        }
      } catch (error) {
        elizaLogger.warn('⚠️ Error checking for trust services:', error);
      }
    }, 1000); // Wait 1 second for services to be fully initialized
  },
};

// Export services and types for external use
export { PluginManagerService } from './services/pluginManagerService.ts';
export { PlatformRegistryService } from './services/PlatformRegistryService.ts';
export * from './types.ts';
export * from './types/registry.ts';

// Export E2E tests for elizaos test runner
export { e2e } from './__tests__/e2e/index.ts';

// Export default plugin
export default pluginManagerPlugin;
