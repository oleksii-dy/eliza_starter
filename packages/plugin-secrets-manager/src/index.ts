import type { Plugin } from '@elizaos/core';
import { generateEnvVarAction } from './actions/generateEnvVar';
import { manageSecretAction } from './actions/manageSecret';
import { setEnvVarAction } from './actions/setEnvVar';
import { EnhancedSecretManager } from './enhanced-service';
import { envStatusProvider } from './providers/envStatus';
import { secretsInfoProvider } from './providers/secretsInfo';
import { uxGuidanceProvider } from './providers/uxGuidanceProvider';
import { ActionChainService } from './services/action-chain-service';
import { SecretFormService } from './services/secret-form-service';
// TEMPORARILY DISABLED: Depends on removed services
// import { requestSecretFormAction } from './actions/requestSecretForm';
import { requestSecretFormAction } from './actions/requestSecretForm';
import { runWorkflowAction } from './actions/runWorkflow';
import { updateSettingsAction } from './actions/settings';
import { e2eTestSuites } from './e2e';
import { settingsProvider } from './providers/settings';

/**
 * Secrets and Environment Variable Management Plugin
 *
 * This plugin provides comprehensive secret and environment variable management for autonomous agents:
 * - Multi-level secret management (global, world, user) with encryption and access control
 * - Automatic detection of required environment variables from plugins
 * - Auto-generation of variables that can be created programmatically (keys, secrets, etc.)
 * - User interaction for variables that require manual input (API keys, etc.)
 * - Validation of environment variables to ensure they work correctly
 * - Persistent storage in character secrets with runtime integration
 * - Component-based user secret storage for multi-tenancy
 * - Permission-based access control for world and user secrets
 */
export const envPlugin: Plugin = {
  name: 'plugin-env',
  description:
    'Secret and environment variable management with multi-level support, auto-generation and validation capabilities',

  services: [EnhancedSecretManager, SecretFormService, ActionChainService],

  dependencies: [],

  providers: [envStatusProvider, secretsInfoProvider, uxGuidanceProvider, settingsProvider],

  actions: [
    setEnvVarAction,
    generateEnvVarAction,
    manageSecretAction,
    requestSecretFormAction,
    runWorkflowAction,
    updateSettingsAction,
  ],

  tests: e2eTestSuites,

  init: async (config, runtime) => {
    // Initialize the enhanced secret manager service
    // The service will automatically scan for required environment variables,
    // load them from character secrets into runtime settings,
    // and prepare multi-level secret storage
  },
};

export default envPlugin;

// Export types for use by other plugins
export type {
  EncryptedSecret,
  EnvVarConfig,
  EnvVarMetadata,
  EnvVarUpdate,
  GenerationScript,
  GenerationScriptMetadata,
  SecretAccessLog,
  SecretConfig,
  SecretContext,
  SecretMetadata,
  SecretPermission,
  ValidationResult,
} from './types';

export type {
  FormField,
  FormFieldType,
  FormSchema,
  FormSession,
  FormSubmission,
  SecretFormRequest,
  ValidationRule,
} from './types/form';

// Export utility functions
export { canGenerateEnvVar, generateScript, getGenerationDescription } from './generation';

export { validateEnvVar, validationStrategies } from './validation';

// Export services for direct access if needed
export { EnhancedSecretManager } from './enhanced-service';
export { EnvManagerService } from './service';

// Export migration utilities
export { runMigration, SecretMigrationHelper } from './migration';
