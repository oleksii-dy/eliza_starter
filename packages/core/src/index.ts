// Export specific types to avoid conflicts
export * from './types/agent';
export * from './types/components';
export * from './types/database';
export * from './types/environment';
export * from './types/events';
export * from './types/http';
export * from './types/identity';
export * from './types/knowledge';
export * from './types/lp';
export * from './types/memory';
export * from './types/messaging';
export * from './types/model';
export * from './types/payment';
export * from './types/planning';
export * from './types/primitives';
export * from './types/runtime';
export * from './types/scenario';
export { Service, ServiceType, getTypedService } from './types/service';
export type { ServiceTypeName, ServiceTypeRegistry, TypedService } from './types/service';
export * from './types/settings';
export * from './types/state';
export * from './types/task';
export * from './types/tee';
export * from './types/testing';
export * from './types/token';
export * from './types/trust';
export * from './types/tunnel';
export * from './types/universal-wallet';
export * from './types/wallet';
export type {
  ComponentDependency,
  ComponentValidationContext,
  ValidationResult,
} from './types/validation';
export type {
  Plugin,
  ConfigurablePlugin,
  PluginConfiguration,
  ComponentConfig,
  Project,
  ProjectAgent,
} from './types/plugin';

// Export utils first to avoid circular dependency issues
export * from './utils';

// Export build utilities for plugin development
export * from './build/plugin-config';

// Export standard configurations for package development
// Note: configs export removed to fix TypeScript build issues

// Export schemas
export * from './schemas/character';

// Then all other exports
export * from './actions';
export * from './database';
export * from './entities';
export * from './errors';
export * from './logger';
export * from './managers';
export * from './prompts';
export * from './roles';
export * from './runtime';
export * from './settings';
export * from './services';
export * from './sentry/instrument';
