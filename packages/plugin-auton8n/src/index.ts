import { Plugin } from '@elizaos/core';
import {
  createPluginAction,
  checkPluginCreationStatusAction,
  cancelPluginCreationAction,
  createPluginFromDescriptionAction,
} from './actions/plugin-creation-actions';
import {
  pluginRegistryProvider,
  pluginCreationStatusProvider,
  pluginCreationCapabilitiesProvider,
  pluginExistsProvider,
} from './providers/plugin-creation-providers';
import { PluginCreationService } from './services/plugin-creation-service';
import { EnhancedPluginCreationService } from './services/plugin-creation-service-v2';
import { pluginVerificationAction } from './actions/plugin-verification-action';
import {
  n8nScenariosSuite,
  n8nPersistenceSuite,
  n8nActionsSuite,
  n8nPluginCreationSuite,
} from './e2e/runtime-tests/index';

// Export security components
export * from './security/secrets/secrets-scanner';

// Export reliability components
export * from './reliability/circuit-breaker';
export * from './reliability/tracing/distributed-tracing';

// Export scalability components
export * from './scalability/job-queue/job-queue';

// Export services
export { PluginCreationService, EnhancedPluginCreationService };

const plugin: Plugin = {
  name: '@elizaos/plugin-auton8n',
  description: 'AI-powered plugin creation with N8n workflow integration',
  actions: [
    createPluginAction,
    checkPluginCreationStatusAction,
    cancelPluginCreationAction,
    createPluginFromDescriptionAction,
    pluginVerificationAction,
  ],
  providers: [
    pluginRegistryProvider,
    pluginCreationStatusProvider,
    pluginCreationCapabilitiesProvider,
    pluginExistsProvider,
  ],
  // Use enhanced service if enabled, otherwise basic service
  services: [
    process.env.USE_ENHANCED_SERVICE === 'true'
      ? EnhancedPluginCreationService
      : PluginCreationService,
  ],
  testDependencies: ['@elizaos/plugin-message-handilng'],
  tests: [n8nScenariosSuite, n8nPersistenceSuite, n8nActionsSuite, n8nPluginCreationSuite],
};

export default plugin;
