import { WalletCapability } from './universal-wallet';

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
export interface PluginConfiguration {
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
 * Configuration change event
 */
export interface ConfigurationChangeEvent {
  type: 'component_toggled' | 'plugin_enabled' | 'plugin_disabled' | 'dependency_changed';
  pluginName: string;
  componentName?: string;
  previousState: any;
  newState: any;
  timestamp: number;
}

/**
 * Default configuration templates for common plugin types
 */
export const DEFAULT_BLOCKCHAIN_PLUGIN_CONFIG: Partial<PluginConfiguration> = {
  enabled: true,
  components: {
    actions: {},
    providers: {},
    services: {},
  },
  metadata: {
    displayName: 'Blockchain Plugin',
    description: 'Default blockchain plugin configuration',
    category: 'blockchain',
    capabilities: [WalletCapability.TRANSFER],
    requiresPrivateKey: true,
    keyManagementType: 'self',
  },
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
