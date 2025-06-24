import { elizaLogger } from '../logger.js';
import type {
  ComponentConfig,
  PluginConfiguration,
  ComponentConfigState,
} from '../types/plugin.js';
import type { WalletCapability } from '../types/universal-wallet.js';

/**
 * Plugin categories for intelligent defaults
 */
export enum PluginCategory {
  // High-level, user-friendly plugins - enable most functionality
  HIGH_LEVEL = 'high-level',

  // Infrastructure plugins - enable services, disable risky actions
  INFRASTRUCTURE = 'infrastructure',

  // Wallet/Financial plugins - disable risky actions by default
  FINANCIAL = 'financial',

  // Utility plugins - enable most functionality
  UTILITY = 'utility',

  // Development/Testing plugins - enable all functionality
  DEVELOPMENT = 'development',

  // Core system plugins - enable all functionality
  CORE = 'core',
}

/**
 * Risk levels for actions
 */
export enum RiskLevel {
  SAFE = 'safe', // Read-only, informational
  LOW = 'low', // Minor actions, reversible
  MEDIUM = 'medium', // Significant actions, some risk
  HIGH = 'high', // Major actions, financial risk
  CRITICAL = 'critical', // Dangerous actions, security risk
}

/**
 * Component types with default behaviors
 */
export interface ComponentTypeDefaults {
  services: boolean; // Always enabled for functionality
  providers: boolean; // Usually enabled for context
  evaluators: boolean; // Usually enabled for processing
  actions: boolean; // Depends on risk level and plugin category
}

/**
 * Plugin risk profile and defaults
 */
export interface PluginDefaults {
  category: PluginCategory;
  riskLevel: RiskLevel;
  serviceDefaults: boolean;
  providerDefaults: boolean;
  evaluatorDefaults: boolean;
  actionDefaults: boolean;
  customDefaults?: Record<string, ComponentConfig>;
}

/**
 * Manager for intelligent plugin component defaults
 */
export class PluginDefaultsManager {
  private static instance: PluginDefaultsManager;
  private logger = elizaLogger;

  // Plugin classification mapping
  private pluginClassification = new Map<string, PluginDefaults>();

  constructor() {
    this.initializeDefaultClassifications();
  }

  static getInstance(): PluginDefaultsManager {
    if (!PluginDefaultsManager.instance) {
      PluginDefaultsManager.instance = new PluginDefaultsManager();
    }
    return PluginDefaultsManager.instance;
  }

  /**
   * Initialize default classifications for all known plugins
   */
  private initializeDefaultClassifications(): void {
    // HIGH-LEVEL PLUGINS - Enable most functionality
    this.addPluginDefaults('@elizaos/plugin-autocoder', {
      category: PluginCategory.HIGH_LEVEL,
      riskLevel: RiskLevel.LOW,
      serviceDefaults: true,
      providerDefaults: true,
      evaluatorDefaults: true,
      actionDefaults: true, // User wants full functionality
    });

    this.addPluginDefaults('@elizaos/plugin-goals', {
      category: PluginCategory.HIGH_LEVEL,
      riskLevel: RiskLevel.SAFE,
      serviceDefaults: true,
      providerDefaults: true,
      evaluatorDefaults: true,
      actionDefaults: true,
    });

    this.addPluginDefaults('@elizaos/plugin-todo', {
      category: PluginCategory.HIGH_LEVEL,
      riskLevel: RiskLevel.SAFE,
      serviceDefaults: true,
      providerDefaults: true,
      evaluatorDefaults: true,
      actionDefaults: true,
    });

    this.addPluginDefaults('@elizaos/plugin-research', {
      category: PluginCategory.HIGH_LEVEL,
      riskLevel: RiskLevel.SAFE,
      serviceDefaults: true,
      providerDefaults: true,
      evaluatorDefaults: true,
      actionDefaults: true,
    });

    // FINANCIAL PLUGINS - Disable risky actions by default
    this.addPluginDefaults('@elizaos/plugin-evm', {
      category: PluginCategory.FINANCIAL,
      riskLevel: RiskLevel.HIGH,
      serviceDefaults: true,
      providerDefaults: true,
      evaluatorDefaults: true,
      actionDefaults: false, // Disable transfers, swaps by default
      customDefaults: {
        GET_BALANCE: { enabled: true }, // Safe read operations
        GET_WALLET_ADDRESS: { enabled: true },
        TRANSFER: {
          enabled: false,
          disabledReason: 'Financial action disabled by default for security',
        },
        SWAP: {
          enabled: false,
          disabledReason: 'Financial action disabled by default for security',
        },
        BRIDGE: {
          enabled: false,
          disabledReason: 'Financial action disabled by default for security',
        },
      },
    });

    this.addPluginDefaults('@elizaos/plugin-solana', {
      category: PluginCategory.FINANCIAL,
      riskLevel: RiskLevel.HIGH,
      serviceDefaults: true,
      providerDefaults: true,
      evaluatorDefaults: true,
      actionDefaults: false,
      customDefaults: {
        GET_BALANCE: { enabled: true },
        GET_WALLET_ADDRESS: { enabled: true },
        TRANSFER_TOKEN: {
          enabled: false,
          disabledReason: 'Financial action disabled by default for security',
        },
        SWAP_TOKENS: {
          enabled: false,
          disabledReason: 'Financial action disabled by default for security',
        },
      },
    });

    this.addPluginDefaults('@elizaos/plugin-crossmint', {
      category: PluginCategory.FINANCIAL,
      riskLevel: RiskLevel.HIGH,
      serviceDefaults: true,
      providerDefaults: true,
      evaluatorDefaults: true,
      actionDefaults: false,
      customDefaults: {
        CREATE_WALLET: {
          enabled: false,
          disabledReason: 'Wallet creation disabled by default for security',
        },
        TRANSFER: {
          enabled: false,
          disabledReason: 'Financial action disabled by default for security',
        },
      },
    });

    this.addPluginDefaults('@elizaos/plugin-agentkit', {
      category: PluginCategory.FINANCIAL,
      riskLevel: RiskLevel.CRITICAL,
      serviceDefaults: true,
      providerDefaults: true,
      evaluatorDefaults: true,
      actionDefaults: false, // Very risky - disable all by default
    });

    this.addPluginDefaults('@elizaos/plugin-payment', {
      category: PluginCategory.FINANCIAL,
      riskLevel: RiskLevel.HIGH,
      serviceDefaults: true,
      providerDefaults: true,
      evaluatorDefaults: true,
      actionDefaults: false,
    });

    // INFRASTRUCTURE PLUGINS - Enable services, selective actions
    this.addPluginDefaults('@elizaos/plugin-sql', {
      category: PluginCategory.INFRASTRUCTURE,
      riskLevel: RiskLevel.MEDIUM,
      serviceDefaults: true,
      providerDefaults: true,
      evaluatorDefaults: true,
      actionDefaults: true, // Database operations are usually safe
    });

    this.addPluginDefaults('@elizaos/plugin-secrets-manager', {
      category: PluginCategory.INFRASTRUCTURE,
      riskLevel: RiskLevel.HIGH,
      serviceDefaults: true,
      providerDefaults: true,
      evaluatorDefaults: true,
      actionDefaults: false, // Secrets are sensitive
      customDefaults: {
        GET_SECRET: { enabled: true }, // Read operations OK
        SET_SECRET: {
          enabled: false,
          disabledReason: 'Secret modification disabled by default for security',
        },
        DELETE_SECRET: {
          enabled: false,
          disabledReason: 'Secret deletion disabled by default for security',
        },
      },
    });

    this.addPluginDefaults('@elizaos/plugin-trust', {
      category: PluginCategory.INFRASTRUCTURE,
      riskLevel: RiskLevel.MEDIUM,
      serviceDefaults: true,
      providerDefaults: true,
      evaluatorDefaults: true,
      actionDefaults: true, // Trust operations are generally safe
    });

    // UTILITY PLUGINS - Enable most functionality
    this.addPluginDefaults('@elizaos/plugin-vision', {
      category: PluginCategory.UTILITY,
      riskLevel: RiskLevel.LOW,
      serviceDefaults: true,
      providerDefaults: true,
      evaluatorDefaults: true,
      actionDefaults: true,
    });

    this.addPluginDefaults('@elizaos/plugin-shell', {
      category: PluginCategory.UTILITY,
      riskLevel: RiskLevel.HIGH, // Shell commands can be dangerous
      serviceDefaults: true,
      providerDefaults: true,
      evaluatorDefaults: true,
      actionDefaults: false, // Disable shell execution by default
    });

    this.addPluginDefaults('@elizaos/plugin-mcp', {
      category: PluginCategory.UTILITY,
      riskLevel: RiskLevel.MEDIUM,
      serviceDefaults: true,
      providerDefaults: true,
      evaluatorDefaults: true,
      actionDefaults: true,
    });

    this.addPluginDefaults('@elizaos/plugin-ngrok', {
      category: PluginCategory.UTILITY,
      riskLevel: RiskLevel.MEDIUM,
      serviceDefaults: true,
      providerDefaults: true,
      evaluatorDefaults: true,
      actionDefaults: true,
    });

    this.addPluginDefaults('@elizaos/plugin-stagehand', {
      category: PluginCategory.UTILITY,
      riskLevel: RiskLevel.MEDIUM,
      serviceDefaults: true,
      providerDefaults: true,
      evaluatorDefaults: true,
      actionDefaults: true,
    });

    this.addPluginDefaults('@elizaos/plugin-hyperfy', {
      category: PluginCategory.UTILITY,
      riskLevel: RiskLevel.LOW,
      serviceDefaults: true,
      providerDefaults: true,
      evaluatorDefaults: true,
      actionDefaults: true,
    });

    // DEVELOPMENT PLUGINS - Enable all functionality
    this.addPluginDefaults('@elizaos/plugin-starter', {
      category: PluginCategory.DEVELOPMENT,
      riskLevel: RiskLevel.SAFE,
      serviceDefaults: true,
      providerDefaults: true,
      evaluatorDefaults: true,
      actionDefaults: true,
    });

    this.addPluginDefaults('@elizaos/plugin-training', {
      category: PluginCategory.DEVELOPMENT,
      riskLevel: RiskLevel.LOW,
      serviceDefaults: true,
      providerDefaults: true,
      evaluatorDefaults: true,
      actionDefaults: true,
    });

    // CORE PLUGINS - Enable all functionality
    this.addPluginDefaults('@elizaos/plugin-plugin-manager', {
      category: PluginCategory.CORE,
      riskLevel: RiskLevel.MEDIUM,
      serviceDefaults: true,
      providerDefaults: true,
      evaluatorDefaults: true,
      actionDefaults: true,
    });

    this.addPluginDefaults('@elizaos/plugin-rolodex', {
      category: PluginCategory.CORE,
      riskLevel: RiskLevel.SAFE,
      serviceDefaults: true,
      providerDefaults: true,
      evaluatorDefaults: true,
      actionDefaults: true,
    });

    this.addPluginDefaults('@elizaos/plugin-knowledge', {
      category: PluginCategory.CORE,
      riskLevel: RiskLevel.SAFE,
      serviceDefaults: true,
      providerDefaults: true,
      evaluatorDefaults: true,
      actionDefaults: true,
    });

    this.addPluginDefaults('@elizaos/plugin-tasks', {
      category: PluginCategory.CORE,
      riskLevel: RiskLevel.SAFE,
      serviceDefaults: true,
      providerDefaults: true,
      evaluatorDefaults: true,
      actionDefaults: true,
    });

    this.addPluginDefaults('@elizaos/plugin-message-handling', {
      category: PluginCategory.CORE,
      riskLevel: RiskLevel.SAFE,
      serviceDefaults: true,
      providerDefaults: true,
      evaluatorDefaults: true,
      actionDefaults: true,
    });

    this.addPluginDefaults('@elizaos/plugin-personality', {
      category: PluginCategory.UTILITY,
      riskLevel: RiskLevel.MEDIUM,
      serviceDefaults: true,
      providerDefaults: true,
      evaluatorDefaults: true,
      actionDefaults: false, // Personality changes can be risky
    });

    this.addPluginDefaults('@elizaos/plugin-autonomy', {
      category: PluginCategory.UTILITY,
      riskLevel: RiskLevel.HIGH,
      serviceDefaults: true,
      providerDefaults: true,
      evaluatorDefaults: true,
      actionDefaults: false, // Autonomous actions can be risky
    });

    this.addPluginDefaults('@elizaos/plugin-robot', {
      category: PluginCategory.UTILITY,
      riskLevel: RiskLevel.MEDIUM,
      serviceDefaults: true,
      providerDefaults: true,
      evaluatorDefaults: true,
      actionDefaults: true,
    });

    this.addPluginDefaults('@elizaos/plugin-github', {
      category: PluginCategory.HIGH_LEVEL,
      riskLevel: RiskLevel.MEDIUM,
      serviceDefaults: true,
      providerDefaults: true,
      evaluatorDefaults: true,
      actionDefaults: false, // Code changes can be risky
      customDefaults: {
        GET_REPO_INFO: { enabled: true },
        LIST_ISSUES: { enabled: true },
        GET_ISSUE: { enabled: true },
        CREATE_ISSUE: { enabled: false, disabledReason: 'Issue creation disabled by default' },
        UPDATE_ISSUE: { enabled: false, disabledReason: 'Issue modification disabled by default' },
        CREATE_PR: { enabled: false, disabledReason: 'PR creation disabled by default' },
      },
    });

    this.addPluginDefaults('@elizaos/plugin-planning', {
      category: PluginCategory.HIGH_LEVEL,
      riskLevel: RiskLevel.SAFE,
      serviceDefaults: true,
      providerDefaults: true,
      evaluatorDefaults: true,
      actionDefaults: true,
    });

    this.addPluginDefaults('@elizaos/plugin-dummy-services', {
      category: PluginCategory.DEVELOPMENT,
      riskLevel: RiskLevel.SAFE,
      serviceDefaults: true,
      providerDefaults: true,
      evaluatorDefaults: true,
      actionDefaults: true,
    });

    this.logger.info(
      `Initialized default classifications for ${this.pluginClassification.size} plugins`
    );
  }

  /**
   * Add plugin defaults
   */
  private addPluginDefaults(pluginName: string, defaults: PluginDefaults): void {
    this.pluginClassification.set(pluginName, defaults);

    // Also support short names
    const shortName = pluginName.replace('@elizaos/', '');
    this.pluginClassification.set(shortName, defaults);
  }

  /**
   * Get defaults for a plugin
   */
  getPluginDefaults(pluginName: string): PluginDefaults | null {
    return this.pluginClassification.get(pluginName) || null;
  }

  /**
   * Generate default configuration for a plugin
   */
  generateDefaultConfiguration(
    pluginName: string,
    components: {
      actions?: Array<{ name: string; riskLevel?: RiskLevel }>;
      providers?: Array<{ name: string; dynamic?: boolean }>;
      evaluators?: Array<{ name: string }>;
      services?: Array<{ name: string }>;
    }
  ): PluginConfiguration {
    const defaults = this.getPluginDefaults(pluginName);

    if (!defaults) {
      // Unknown plugin - use safe defaults
      this.logger.warn(`No defaults found for plugin ${pluginName}, using safe defaults`);
      return this.generateSafeDefaults(pluginName, components);
    }

    const config: PluginConfiguration = {
      pluginName,
      enabled: true, // Plugin itself is enabled
      actions: {},
      providers: {},
      evaluators: {},
      services: {},
      settings: {},
      lastModified: new Date(),
    };

    // Generate action configurations
    if (components.actions) {
      for (const action of components.actions) {
        const customDefault = defaults.customDefaults?.[action.name];
        const actionRisk = action.riskLevel || RiskLevel.MEDIUM;

        let enabled = defaults.actionDefaults;
        let disabledReason: string | undefined;

        // Override based on custom defaults
        if (customDefault) {
          enabled = customDefault.enabled ?? enabled;
          disabledReason = customDefault.disabledReason;
        } else {
          // Apply risk-based logic
          if (defaults.category === PluginCategory.FINANCIAL) {
            enabled = actionRisk === RiskLevel.SAFE;
            if (!enabled && !disabledReason) {
              disabledReason = 'Financial action disabled by default for security';
            }
          } else if (actionRisk === RiskLevel.CRITICAL) {
            enabled = false;
            disabledReason = 'Critical action disabled by default for security';
          }
        }

        config.actions[action.name] = {
          enabled,
          overrideLevel: 'default',
          overrideReason: disabledReason,
          settings: {},
          lastModified: new Date(),
        };
      }
    }

    // Generate provider configurations
    if (components.providers) {
      for (const provider of components.providers) {
        config.providers[provider.name] = {
          enabled: defaults.providerDefaults,
          overrideLevel: 'default',
          settings: {},
          lastModified: new Date(),
        };
      }
    }

    // Generate evaluator configurations
    if (components.evaluators) {
      if (!config.evaluators) {
        config.evaluators = {};
      }
      for (const evaluator of components.evaluators) {
        config.evaluators[evaluator.name] = {
          enabled: defaults.evaluatorDefaults,
          overrideLevel: 'default',
          settings: {},
          lastModified: new Date(),
        };
      }
    }

    // Generate service configurations
    if (components.services) {
      if (!config.services) {
        config.services = {};
      }
      for (const service of components.services) {
        config.services[service.name] = {
          enabled: defaults.serviceDefaults,
          overrideLevel: 'default',
          settings: {},
          lastModified: new Date(),
        };
      }
    }

    return config;
  }

  /**
   * Generate safe defaults for unknown plugins
   */
  private generateSafeDefaults(pluginName: string, components: any): PluginConfiguration {
    const config: PluginConfiguration = {
      pluginName,
      enabled: true,
      actions: {},
      providers: {},
      evaluators: {},
      services: {},
      settings: {},
      lastModified: new Date(),
    };

    // Conservative defaults for unknown plugins
    if (components.actions) {
      for (const action of components.actions) {
        config.actions[action.name] = {
          enabled: false, // Disable unknown actions by default
          overrideLevel: 'default',
          overrideReason: 'Unknown plugin action disabled by default for security',
          settings: {},
          lastModified: new Date(),
        };
      }
    }

    if (components.providers) {
      for (const provider of components.providers) {
        config.providers[provider.name] = {
          enabled: true, // Providers are generally safe
          overrideLevel: 'default',
          settings: {},
          lastModified: new Date(),
        };
      }
    }

    if (components.evaluators) {
      if (!config.evaluators) {
        config.evaluators = {};
      }
      for (const evaluator of components.evaluators) {
        config.evaluators[evaluator.name] = {
          enabled: true, // Evaluators are generally safe
          overrideLevel: 'default',
          settings: {},
          lastModified: new Date(),
        };
      }
    }

    if (components.services) {
      if (!config.services) {
        config.services = {};
      }
      for (const service of components.services) {
        config.services[service.name] = {
          enabled: true, // Services are generally needed
          overrideLevel: 'default',
          settings: {},
          lastModified: new Date(),
        };
      }
    }

    return config;
  }

  /**
   * Get risk assessment for a plugin
   */
  getPluginRiskAssessment(pluginName: string): {
    category: PluginCategory;
    riskLevel: RiskLevel;
    recommendations: string[];
  } {
    const defaults = this.getPluginDefaults(pluginName);

    if (!defaults) {
      return {
        category: PluginCategory.UTILITY,
        riskLevel: RiskLevel.MEDIUM,
        recommendations: [
          'Unknown plugin - review carefully before enabling actions',
          'Consider enabling only providers and evaluators initially',
          'Test in development environment first',
        ],
      };
    }

    const recommendations: string[] = [];

    switch (defaults.category) {
      case PluginCategory.FINANCIAL:
        recommendations.push(
          'Financial plugin - review wallet permissions carefully',
          'Only enable transfer actions if you trust the AI with funds',
          'Consider starting with read-only operations'
        );
        break;
      case PluginCategory.HIGH_LEVEL:
        recommendations.push(
          'High-level plugin - generally safe to enable most features',
          'Good for productivity and automation tasks'
        );
        break;
      case PluginCategory.INFRASTRUCTURE:
        recommendations.push(
          'Infrastructure plugin - services usually safe to enable',
          'Be cautious with administrative actions'
        );
        break;
      case PluginCategory.DEVELOPMENT:
        recommendations.push(
          'Development plugin - safe to enable all features',
          'Designed for testing and development workflows'
        );
        break;
      case PluginCategory.UTILITY:
        recommendations.push(
          'Utility plugin - most features safe to enable',
          'Review any system-level actions carefully'
        );
        break;
      case PluginCategory.CORE:
        recommendations.push(
          'Core plugin - essential for system operation',
          'Generally safe to enable all features'
        );
        break;
    }

    if (defaults.riskLevel === RiskLevel.HIGH || defaults.riskLevel === RiskLevel.CRITICAL) {
      recommendations.unshift('⚠️ High-risk plugin - enable with caution');
    }

    return {
      category: defaults.category,
      riskLevel: defaults.riskLevel,
      recommendations,
    };
  }

  /**
   * Update plugin classification
   */
  updatePluginClassification(pluginName: string, defaults: Partial<PluginDefaults>): void {
    const existing = this.getPluginDefaults(pluginName) || {
      category: PluginCategory.UTILITY,
      riskLevel: RiskLevel.MEDIUM,
      serviceDefaults: true,
      providerDefaults: true,
      evaluatorDefaults: true,
      actionDefaults: false,
    };

    const updated = { ...existing, ...defaults };
    this.pluginClassification.set(pluginName, updated);

    this.logger.info(`Updated classification for plugin ${pluginName}`);
  }

  /**
   * List all classified plugins
   */
  listClassifiedPlugins(): Array<{ name: string; defaults: PluginDefaults }> {
    return Array.from(this.pluginClassification.entries()).map(([name, defaults]) => ({
      name,
      defaults,
    }));
  }
}
