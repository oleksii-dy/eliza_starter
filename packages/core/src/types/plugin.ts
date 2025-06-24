import type { Character } from './agent';
import type { Action, Evaluator, Provider } from './components';
import type { IDatabaseAdapter } from './database';
import type { EventHandler, EventPayloadMap } from './events';
import type { IAgentRuntime } from './runtime';
import type { Service } from './service';
import type { TestSuite } from './testing';
import type { PluginScenario } from './scenario';

export type Route = {
  type: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'STATIC';
  path: string;
  filePath?: string;
  public?: boolean;
  name?: string extends { public: true } ? string : string | undefined;
  handler?: (req: any, res: any, runtime: IAgentRuntime) => Promise<void>;
  isMultipart?: boolean; // Indicates if the route expects multipart/form-data (file uploads)
};

/**
 * Component dependency for validation
 */
export interface ComponentDependency {
  type: 'action' | 'provider' | 'evaluator' | 'service';
  name: string;
  optional?: boolean;
  pluginName?: string; // For cross-plugin dependencies
  required?: boolean; // Whether this dependency is required
  components?: string[]; // Specific components required from the plugin
}

/**
 * Enhanced component configuration with dependencies
 */
export interface EnhancedComponentConfig extends ComponentConfig {
  /** Whether component is enabled by default */
  defaultEnabled: boolean;

  /** Mark as legacy component (from non-configurable arrays) */
  legacy?: boolean;

  /** Component dependencies */
  dependencies?: ComponentDependency[];
}

/**
 * Unified component definition for new configurable system
 */
export interface ComponentDefinition {
  type: 'action' | 'provider' | 'evaluator' | 'service';
  name?: string; // Optional override of component.name
  component: Action | Provider | Evaluator | typeof Service;
  config?: EnhancedComponentConfig;
}

/**
 * Plugin for extending agent functionality
 */

export type PluginEvents = {
  [K in keyof EventPayloadMap]?: EventHandler<K>[];
} & {
  [key: string]: ((params: any) => Promise<any>)[];
};

export interface Plugin {
  name: string;
  description: string;

  // Initialize plugin with runtime services
  init?: (config: Record<string, string>, runtime: IAgentRuntime) => Promise<void>;

  // Configuration
  config?: {
    defaultEnabled?: boolean;
    category?: string;
    permissions?: string[];
    [key: string]: any;
  };

  services?: (typeof Service)[];

  // Entity component definitions
  componentTypes?: {
    name: string;
    schema: Record<string, unknown>;
    validator?: (data: any) => boolean;
  }[];

  // Legacy plugin features (always enabled for backwards compatibility)
  actions?: Action[];
  providers?: Provider[];
  evaluators?: Evaluator[];

  // New configurable components (can be enabled/disabled)
  components?: ComponentDefinition[];

  adapter?: IDatabaseAdapter;
  models?: {
    [key: string]: (...args: any[]) => Promise<any>;
  };
  events?: PluginEvents;
  routes?: Route[];
  tests?: TestSuite[];
  scenarios?: PluginScenario[];

  dependencies?: string[];

  testDependencies?: string[];

  priority?: number;

  schema?: any;
}

export interface ProjectAgent {
  character: Character;
  init?: (runtime: IAgentRuntime) => Promise<void>;
  plugins?: Plugin[];
  tests?: TestSuite | TestSuite[];
}

export interface Project {
  agents: ProjectAgent[];
}
/**
 * Configuration for a plugin component (action, provider, or evaluator)
 */
export interface ComponentConfig {
  /** Whether the component is enabled */
  enabled?: boolean;

  /** Required environment variables or settings */
  requiredSettings?: string[];

  /** Category for grouping in UI */
  category?: string;

  /** Required permissions to use this component */
  permissions?: string[];

  /** Mark as experimental/beta feature */
  experimental?: boolean;

  /** Additional settings */
  settings?: Record<string, any>;

  /** Reason why disabled */
  disabledReason?: string;
}

/**
 * Enhanced action interface with configuration
 */
export interface ConfigurableAction extends Action {
  /** Configuration for this action */
  config?: ComponentConfig;
}

/**
 * Enhanced provider interface with configuration
 */
export interface ConfigurableProvider extends Provider {
  /** Configuration for this provider */
  config?: ComponentConfig;
}

/**
 * Enhanced evaluator interface with configuration
 */
export interface ConfigurableEvaluator extends Evaluator {
  /** Configuration for this evaluator */
  config?: ComponentConfig;
}

/**
 * Enhanced service interface with configuration
 */
export interface ConfigurableService {
  /** The service class (extends Service) */
  service: typeof Service;
  /** Configuration for this service */
  config?: ComponentConfig;
}

/**
 * Enhanced plugin interface with configurable components
 * Backwards compatible with existing Plugin interface
 */
export interface ConfigurablePlugin extends Plugin {
  /** Configurable actions (can be enabled/disabled) */
  configurableActions?: ConfigurableAction[];

  /** Configurable providers (can be enabled/disabled) */
  configurableProviders?: ConfigurableProvider[];

  /** Configurable evaluators (can be enabled/disabled) */
  configurableEvaluators?: ConfigurableEvaluator[];

  /** Configurable services (can be enabled/disabled) */
  configurableServices?: ConfigurableService[];

  /** Plugin-level configuration */
  config?: {
    /** Whether plugin is enabled by default */
    defaultEnabled?: boolean;

    /** Plugin category */
    category?: string;

    /** Required permissions for entire plugin */
    permissions?: string[];

    /** Plugin metadata */
    metadata?: Record<string, any>;
  };
}

/**
 * Configuration state for a component
 */
export interface ComponentConfigState {
  /** Whether component is enabled */
  enabled: boolean;

  /** Source of the configuration override */
  overrideLevel: 'default' | 'plugin' | 'database' | 'gui' | 'runtime';

  /** Reason for override */
  overrideReason?: string;

  /** Additional settings */
  settings?: Record<string, any>;

  /** Timestamp of last configuration change */
  lastModified?: Date;
}

/**
 * Plugin configuration state
 */
export interface PluginConfiguration {
  /** Plugin name */
  pluginName: string;

  /** Whether entire plugin is enabled */
  enabled: boolean;

  /** Action configurations */
  actions: Record<string, ComponentConfigState>;

  /** Provider configurations */
  providers: Record<string, ComponentConfigState>;

  /** Evaluator configurations */
  evaluators?: Record<string, ComponentConfigState>;

  /** Service configurations */
  services?: Record<string, ComponentConfigState>;

  /** Plugin-level settings */
  settings: Record<string, any>;

  /** Last modified timestamp */
  lastModified: Date;
}

/**
 * Configuration source interface
 */
export interface ConfigurationSource {
  /** Source name */
  name: string;

  /** Priority (higher = takes precedence) */
  priority: number;

  /** Load configurations from this source */
  load(): Promise<Record<string, PluginConfiguration>>;

  /** Save configurations to this source */
  save(config: Record<string, PluginConfiguration>): Promise<void>;

  /** Get configuration for specific plugin */
  getPluginConfig?(pluginName: string): Promise<PluginConfiguration | null>;

  /** Update configuration for specific plugin */
  updatePluginConfig?(pluginName: string, config: Partial<PluginConfiguration>): Promise<void>;
}

/**
 * Configuration change event
 */
export interface ConfigurationChangeEvent {
  /** Type of change */
  type: 'plugin' | 'action' | 'provider' | 'evaluator';

  /** Plugin name */
  pluginName: string;

  /** Component name (for action/provider/evaluator changes) */
  componentName?: string;

  /** Previous configuration */
  previousConfig?: ComponentConfigState | PluginConfiguration;

  /** New configuration */
  newConfig: ComponentConfigState | PluginConfiguration;

  /** Source of the change */
  source: string;

  /** Timestamp */
  timestamp: Date;
}

/**
 * Configuration manager interface
 */
export interface IConfigurationManager {
  /** Get effective configuration for a component */
  getComponentConfig(
    pluginName: string,
    componentName: string,
    type: 'action' | 'provider' | 'evaluator' | 'service'
  ): ComponentConfigState;

  /** Set configuration override */
  setOverride(
    source: 'gui' | 'database' | 'plugin-manager' | 'runtime',
    pluginName: string,
    config: Partial<PluginConfiguration>
  ): Promise<void>;

  /** Check if component is enabled */
  isComponentEnabled(
    pluginName: string,
    componentName: string,
    type: 'action' | 'provider' | 'evaluator' | 'service'
  ): boolean;

  /** Get full plugin configuration */
  getPluginConfiguration(pluginName: string): PluginConfiguration | null;

  /** List all plugin configurations */
  listConfigurations(): PluginConfiguration[];

  /** Subscribe to configuration changes */
  onConfigurationChange(callback: (event: ConfigurationChangeEvent) => void): () => void;

  /** Register configuration source */
  registerSource(source: ConfigurationSource): void;

  /** Reload configurations from all sources */
  reload(): Promise<void>;
}

import { WalletCapability } from './universal-wallet';
export { WalletCapability };

/**
 * Plugin component configuration for enabling/disabling actions and providers
 */
export interface PluginComponentConfig {
  actions: {
    [actionName: string]: ActionConfig;
  };
  providers: {
    [providerName: string]: ProviderConfig;
  };
  services: {
    [serviceName: string]: ServiceConfig;
  };
}

/**
 * Configuration for individual actions
 */
export interface ActionConfig {
  enabled: boolean;
  defaultEnabled: boolean;
  requiredCapabilities: WalletCapability[];
  userConfigurable: boolean;
  requiresPrivateKey?: boolean;
  dependsOnServices?: string[];
  description?: string;
  category?: 'transfer' | 'swap' | 'bridge' | 'defi' | 'nft' | 'governance' | 'staking' | 'other';
}

/**
 * Configuration for individual providers
 */
export interface ProviderConfig {
  enabled: boolean;
  defaultEnabled: boolean;
  dynamic: boolean;
  userConfigurable: boolean;
  private?: boolean;
  position?: number;
  description?: string;
  category?: 'balance' | 'wallet' | 'transaction' | 'market' | 'other';
}

/**
 * Configuration for individual services
 */
export interface ServiceConfig {
  enabled: boolean;
  autoStart: boolean;
  required: boolean;
  dependsOn?: string[];
  providesCapabilities?: WalletCapability[];
  description?: string;
}

/**
 * Complete plugin configuration with metadata
 */
export interface UnifiedPluginConfiguration {
  pluginName: string;
  version: string;
  enabled: boolean;
  dependencies: string[];
  components: PluginComponentConfig;
  metadata: {
    displayName: string;
    description: string;
    category: 'blockchain' | 'defi' | 'enterprise' | 'platform' | 'other';
    chainSupport?: string[];
    capabilities: WalletCapability[];
    requiresPrivateKey?: boolean;
    keyManagementType?: 'self' | 'shared' | 'external';
  };
}

/**
 * Runtime configuration state for all plugins
 */
export interface PluginConfigurationState {
  [pluginName: string]: PluginConfiguration;
}

/**
 * Configuration validation result
 */
export interface ConfigurationValidationResult {
  valid: boolean;
  errors: ConfigurationError[];
  warnings: ConfigurationWarning[];
}

/**
 * Configuration validation error
 */
export interface ConfigurationError {
  pluginName: string;
  componentType: 'action' | 'provider' | 'service';
  componentName: string;
  errorType: 'dependency_missing' | 'capability_missing' | 'conflict' | 'invalid_config';
  message: string;
  resolution?: string;
}

/**
 * Configuration validation warning
 */
export interface ConfigurationWarning {
  pluginName: string;
  message: string;
  impact: 'low' | 'medium' | 'high';
}

/**
 * Plugin component enable/disable request
 */
export interface ComponentToggleRequest {
  pluginName: string;
  componentType: 'action' | 'provider' | 'service';
  componentName: string;
  enabled: boolean;
  validateOnly?: boolean;
}

/**
 * Plugin dependency declaration
 */
export interface PluginDependency {
  pluginName: string;
  version?: string;
  required: boolean;
  provides?: 'private_keys' | 'shared_services' | 'capabilities';
}

/**
 * Default configuration templates for common plugin types
 */
export const DEFAULT_BLOCKCHAIN_PLUGIN_CONFIG: Partial<PluginConfiguration> = {
  enabled: true,
  // TODO: Fix type mismatch - components and metadata don't exist in PluginConfiguration
  // components: {
  //   actions: {},
  //   providers: {},
  //   services: {},
  // },
  // metadata: {
  //   displayName: 'Blockchain Plugin',
  //   description: 'Default blockchain plugin configuration',
  //   category: 'blockchain',
  //   capabilities: [WalletCapability.TRANSFER],
  //   requiresPrivateKey: true,
  //   keyManagementType: 'self',
  // },
  actions: {},
  providers: {},
  services: {},
  settings: {},
};

/**
 * Action configuration presets
 */
export const ACTION_CONFIG_PRESETS = {
  TRANSFER: {
    defaultEnabled: false,
    userConfigurable: true,
    requiredCapabilities: [WalletCapability.TRANSFER],
    requiresPrivateKey: true,
    category: 'transfer' as const,
  },
  BALANCE_READ: {
    defaultEnabled: true,
    userConfigurable: true,
    requiredCapabilities: [],
    requiresPrivateKey: false,
    category: 'other' as const,
  },
  SWAP: {
    defaultEnabled: false,
    userConfigurable: true,
    requiredCapabilities: [WalletCapability.SWAP],
    requiresPrivateKey: true,
    category: 'swap' as const,
  },
  BRIDGE: {
    defaultEnabled: false,
    userConfigurable: true,
    requiredCapabilities: [WalletCapability.BRIDGE],
    requiresPrivateKey: true,
    category: 'bridge' as const,
  },
  NFT: {
    defaultEnabled: false,
    userConfigurable: true,
    requiredCapabilities: [WalletCapability.NFT],
    requiresPrivateKey: true,
    category: 'nft' as const,
  },
  GOVERNANCE: {
    defaultEnabled: false,
    userConfigurable: true,
    requiredCapabilities: [WalletCapability.GOVERNANCE],
    requiresPrivateKey: true,
    category: 'governance' as const,
  },
  STAKING: {
    defaultEnabled: false,
    userConfigurable: true,
    requiredCapabilities: [WalletCapability.STAKING],
    requiresPrivateKey: true,
    category: 'staking' as const,
  },
} as const;

/**
 * Provider configuration presets
 */
export const PROVIDER_CONFIG_PRESETS = {
  BALANCE: {
    defaultEnabled: true,
    userConfigurable: true,
    dynamic: false,
    category: 'balance' as const,
  },
  WALLET_INFO: {
    defaultEnabled: true,
    userConfigurable: true,
    dynamic: false,
    category: 'wallet' as const,
  },
  MARKET_DATA: {
    defaultEnabled: false,
    userConfigurable: true,
    dynamic: true,
    category: 'market' as const,
  },
  TRANSACTION_HISTORY: {
    defaultEnabled: false,
    userConfigurable: true,
    dynamic: true,
    category: 'transaction' as const,
  },
} as const;
