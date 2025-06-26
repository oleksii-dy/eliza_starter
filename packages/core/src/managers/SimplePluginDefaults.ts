import { elizaLogger } from '../logger';
import type { PluginConfiguration, ComponentConfigState } from '../types/plugin';

/**
 * Simple component defaults - no complex risk analysis, just direct enabled/disabled decisions
 */
export interface SimpleComponentDefaults {
  enabled: boolean;
  reason?: string;
}

/**
 * Simple plugin component defaults manager
 * Makes direct decisions for each component without complex risk analysis
 */
export class SimplePluginDefaults {
  private static instance: SimplePluginDefaults;
  private logger = elizaLogger;

  // Direct component defaults for each plugin
  private componentDefaults = new Map<
    string,
    {
      services?: Record<string, SimpleComponentDefaults>;
      providers?: Record<string, SimpleComponentDefaults>;
      evaluators?: Record<string, SimpleComponentDefaults>;
      actions?: Record<string, SimpleComponentDefaults>;
    }
  >();

  constructor() {
    this.initializeDefaults();
  }

  static getInstance(): SimplePluginDefaults {
    if (!SimplePluginDefaults.instance) {
      SimplePluginDefaults.instance = new SimplePluginDefaults();
    }
    return SimplePluginDefaults.instance;
  }

  private initializeDefaults(): void {
    // AUTOCODER - Enable everything (high-level productivity)
    this.setPluginDefaults('@elizaos/plugin-autocoder', {
      services: {
        AutoCodeService: { enabled: true },
        N8nWorkflowService: { enabled: true },
        DockerService: { enabled: true },
        PluginCreationService: { enabled: true },
        MCPCreationService: { enabled: true },
        ResearchService: { enabled: true },
      },
      providers: {
        // All providers enabled by default
      },
      evaluators: {
        // All evaluators enabled by default
      },
      actions: {
        RUN_SWE_BENCH: { enabled: true },
        GET_SWE_BENCH_STATS: { enabled: true },
        RUN_DISTRIBUTED_SWE_BENCH: { enabled: true },
        CREATE_MCP: { enabled: true },
        N8N_WORKFLOW: { enabled: true },
        CHECK_N8N_WORKFLOW_STATUS: { enabled: true },
        ECHO: { enabled: true },
      },
    });

    // SOLANA - Enable services/providers, disable risky financial actions
    this.setPluginDefaults('@elizaos/plugin-solana', {
      services: {
        WalletBalanceService: { enabled: true },
        TransactionService: { enabled: true },
        PriceOracleService: { enabled: true },
        TokenService: { enabled: true },
        RpcService: { enabled: true },
        CustodialWalletService: { enabled: true },
        JupiterDexService: { enabled: true },
        SecureKeyManager: { enabled: true },
        NftService: { enabled: true },
        LendingService: { enabled: true },
        WebSocketService: { enabled: true },
        Token22Service: { enabled: true },
        MultiSigService: { enabled: true },
        TransactionHistoryService: { enabled: true },
        SolanaUniversalWalletService: { enabled: true },
      },
      providers: {
        walletProvider: { enabled: true },
      },
      actions: {
        SWAP_SOLANA: { enabled: false, reason: 'Financial transaction - disabled for security' },
        TRANSFER_SOLANA: {
          enabled: false,
          reason: 'Financial transaction - disabled for security',
        },
        STAKE_SOL: { enabled: false, reason: 'Financial transaction - disabled for security' },
        MINT_NFT: { enabled: false, reason: 'Financial transaction - disabled for security' },
        TRANSFER_NFT: { enabled: false, reason: 'Financial transaction - disabled for security' },
        LIST_NFT: { enabled: true },
        VIEW_NFTS: { enabled: true },
      },
    });

    // AGENTKIT - Enable services, disable all financial actions
    this.setPluginDefaults('@elizaos/plugin-agentkit', {
      services: {
        AgentKitService: { enabled: true },
        CustodialWalletService: { enabled: true },
      },
      providers: {
        walletProvider: { enabled: true },
      },
      actions: {
        // All actions disabled by default - too risky for financial operations
      },
    });

    // EVM - Enable services/providers, disable financial actions
    this.setPluginDefaults('@elizaos/plugin-evm', {
      services: {
        // All services enabled by default
      },
      providers: {
        // All providers enabled by default
      },
      actions: {
        // Disable all financial actions by default
      },
    });

    // SHELL - Enable service, disable dangerous shell actions
    this.setPluginDefaults('plugin-shell', {
      services: {
        ShellService: { enabled: true },
      },
      providers: {
        shellProvider: { enabled: true },
      },
      actions: {
        RUN_SHELL_COMMAND: { enabled: false, reason: 'Shell execution disabled for security' },
        CLEAR_SHELL_HISTORY: { enabled: true },
        KILL_AUTONOMOUS: { enabled: false, reason: 'Process control disabled for security' },
      },
    });

    // PLUGIN MANAGER - Enable services, disable risky plugin operations
    this.setPluginDefaults('@elizaos/plugin-plugin-manager', {
      services: {
        PluginManagerService: { enabled: true },
      },
      actions: {
        LOAD_PLUGIN: { enabled: false, reason: 'Plugin loading disabled for security' },
        UNLOAD_PLUGIN: { enabled: false, reason: 'Plugin unloading disabled for security' },
        START_PLUGIN_CONFIGURATION: { enabled: true },
        INSTALL_PLUGIN_FROM_REGISTRY: {
          enabled: false,
          reason: 'Plugin installation disabled for security',
        },
        SEARCH_PLUGIN: { enabled: true },
        CLONE_PLUGIN: { enabled: false, reason: 'Plugin cloning disabled for security' },
        PUBLISH_PLUGIN: { enabled: false, reason: 'Plugin publishing disabled for security' },
        RECOVER_PLUGIN: { enabled: true },
        CHECK_DEPENDENCIES: { enabled: true },
        UPDATE_PLUGIN: { enabled: false, reason: 'Plugin updates disabled for security' },
        MANAGE_PLUGIN_BRANCH: {
          enabled: false,
          reason: 'Plugin modification disabled for security',
        },
        VIEW_PLUGIN_DETAILS: { enabled: true },
        CHECK_PLUGIN_CONFIGURATION: { enabled: true },
        CHECK_PLUGIN_HEALTH: { enabled: true },
        GET_PLUGIN_STATE: { enabled: true },
        LIST_REGISTRY_PLUGINS: { enabled: true },
      },
    });

    // GOALS - Enable everything (productivity tool)
    this.setPluginDefaults('@elizaos/plugin-goals', {
      services: {
        // All services enabled by default
      },
      providers: {
        // All providers enabled by default
      },
      actions: {
        // All actions enabled by default
      },
    });

    // TODO - Enable everything (productivity tool)
    this.setPluginDefaults('@elizaos/plugin-todo', {
      services: {
        // All services enabled by default
      },
      providers: {
        // All providers enabled by default
      },
      actions: {
        // All actions enabled by default
      },
    });

    // RESEARCH - Enable everything (information gathering)
    this.setPluginDefaults('@elizaos/plugin-research', {
      services: {
        // All services enabled by default
      },
      providers: {
        // All providers enabled by default
      },
      actions: {
        // All actions enabled by default
      },
    });

    // VISION - Enable everything (analysis tool)
    this.setPluginDefaults('@elizaos/plugin-vision', {
      services: {
        // All services enabled by default
      },
      providers: {
        // All providers enabled by default
      },
      actions: {
        // All actions enabled by default
      },
    });

    // ROBOT - Enable everything (control tool)
    this.setPluginDefaults('@elizaos/plugin-robot', {
      services: {
        // All services enabled by default
      },
      providers: {
        // All providers enabled by default
      },
      actions: {
        // All actions enabled by default
      },
    });

    // GITHUB - Enable services/providers, selective actions
    this.setPluginDefaults('@elizaos/plugin-github', {
      services: {
        // All services enabled by default
      },
      providers: {
        // All providers enabled by default
      },
      actions: {
        GET_REPO_INFO: { enabled: true },
        LIST_ISSUES: { enabled: true },
        GET_ISSUE: { enabled: true },
        CREATE_ISSUE: { enabled: false, reason: 'Repository modification disabled for security' },
        UPDATE_ISSUE: { enabled: false, reason: 'Repository modification disabled for security' },
        CREATE_PR: { enabled: false, reason: 'Repository modification disabled for security' },
        MERGE_PR: { enabled: false, reason: 'Repository modification disabled for security' },
        PUSH_CODE: { enabled: false, reason: 'Repository modification disabled for security' },
      },
    });

    // STAGEHAND - Enable everything (automation tool)
    this.setPluginDefaults('@elizaos/plugin-stagehand', {
      services: {
        // All services enabled by default
      },
      providers: {
        // All providers enabled by default
      },
      actions: {
        // All actions enabled by default
      },
    });

    // AUTONOMY - Enable services, disable autonomous actions
    this.setPluginDefaults('@elizaos/plugin-autonomy', {
      services: {
        // All services enabled by default
      },
      providers: {
        // All providers enabled by default
      },
      actions: {
        // Disable autonomous actions by default for safety
      },
    });

    // TRUST - Enable everything (security framework)
    this.setPluginDefaults('@elizaos/plugin-trust', {
      services: {
        // All services enabled by default
      },
      providers: {
        // All providers enabled by default
      },
      actions: {
        // All actions enabled by default
      },
    });

    // SECRETS MANAGER - Enable services/providers, disable secret modification
    this.setPluginDefaults('@elizaos/plugin-secrets-manager', {
      services: {
        // All services enabled by default
      },
      providers: {
        // All providers enabled by default
      },
      actions: {
        GET_SECRET: { enabled: true },
        SET_SECRET: { enabled: false, reason: 'Secret modification disabled for security' },
        DELETE_SECRET: { enabled: false, reason: 'Secret modification disabled for security' },
      },
    });

    // KNOWLEDGE - Enable everything (information storage)
    this.setPluginDefaults('@elizaos/plugin-knowledge', {
      services: {
        // All services enabled by default
      },
      providers: {
        // All providers enabled by default
      },
      actions: {
        // All actions enabled by default
      },
    });

    // PLANNING - Enable everything (task coordination)
    this.setPluginDefaults('@elizaos/plugin-planning', {
      services: {
        // All services enabled by default
      },
      providers: {
        // All providers enabled by default
      },
      actions: {
        // All actions enabled by default
      },
    });

    // TASKS - Enable everything (core functionality)
    this.setPluginDefaults('@elizaos/plugin-tasks', {
      services: {
        // All services enabled by default
      },
      providers: {
        // All providers enabled by default
      },
      actions: {
        // All actions enabled by default
      },
    });

    // SQL - Enable everything (database functionality)
    this.setPluginDefaults('@elizaos/plugin-sql', {
      services: {
        // All services enabled by default
      },
      providers: {
        // All providers enabled by default
      },
      actions: {
        // All actions enabled by default
      },
    });

    // MESSAGE HANDLING - Enable everything (core functionality)
    this.setPluginDefaults('@elizaos/plugin-message-handling', {
      services: {
        // All services enabled by default
      },
      providers: {
        // All providers enabled by default
      },
      actions: {
        // All actions enabled by default
      },
    });

    // DUMMY SERVICES - Enable everything (testing)
    this.setPluginDefaults('@elizaos/plugin-dummy-services', {
      services: {
        // All services enabled by default
      },
      providers: {
        // All providers enabled by default
      },
      actions: {
        // All actions enabled by default
      },
    });

    // PAYMENT - Enable services, disable payment actions
    this.setPluginDefaults('@elizaos/plugin-payment', {
      services: {
        // All services enabled by default
      },
      providers: {
        // All providers enabled by default
      },
      actions: {
        // All payment actions disabled by default
      },
    });

    // CROSSMINT - Enable services, disable NFT transactions
    this.setPluginDefaults('@elizaos/plugin-crossmint', {
      services: {
        // All services enabled by default
      },
      providers: {
        // All providers enabled by default
      },
      actions: {
        // All NFT transaction actions disabled by default
      },
    });

    // NGROK - Enable everything (networking tool)
    this.setPluginDefaults('@elizaos/plugin-ngrok', {
      services: {
        // All services enabled by default
      },
      providers: {
        // All providers enabled by default
      },
      actions: {
        // All actions enabled by default
      },
    });

    // HYPERFY - Enable everything (3D/gaming tool)
    this.setPluginDefaults('@elizaos/plugin-hyperfy', {
      services: {
        // All services enabled by default
      },
      providers: {
        // All providers enabled by default
      },
      actions: {
        // All actions enabled by default
      },
    });

    // TRAINING - Enable everything (development tool)
    this.setPluginDefaults('@elizaos/plugin-training', {
      services: {
        // All services enabled by default
      },
      providers: {
        // All providers enabled by default
      },
      actions: {
        // All actions enabled by default
      },
    });

    // STARTER - Enable everything (development tool)
    this.setPluginDefaults('@elizaos/plugin-starter', {
      services: {
        // All services enabled by default
      },
      providers: {
        // All providers enabled by default
      },
      actions: {
        // All actions enabled by default
      },
    });

    // PERSONALITY - Enable services/providers, disable personality changes
    this.setPluginDefaults('@elizaos/plugin-personality', {
      services: {
        // All services enabled by default
      },
      providers: {
        // All providers enabled by default
      },
      actions: {
        // Disable personality modification actions by default
      },
    });

    // ROLODEX - Enable everything (contact management)
    this.setPluginDefaults('@elizaos/plugin-rolodex', {
      services: {
        // All services enabled by default
      },
      providers: {
        // All providers enabled by default
      },
      actions: {
        // All actions enabled by default
      },
    });

    // MCP - Enable everything (protocol tool)
    this.setPluginDefaults('@elizaos/plugin-mcp', {
      services: {
        // All services enabled by default
      },
      providers: {
        // All providers enabled by default
      },
      actions: {
        // All actions enabled by default
      },
    });

    this.logger.info(`Initialized simple defaults for ${this.componentDefaults.size} plugins`);
  }

  private setPluginDefaults(
    pluginName: string,
    defaults: {
      services?: Record<string, SimpleComponentDefaults>;
      providers?: Record<string, SimpleComponentDefaults>;
      evaluators?: Record<string, SimpleComponentDefaults>;
      actions?: Record<string, SimpleComponentDefaults>;
    }
  ): void {
    this.componentDefaults.set(pluginName, defaults);

    // Also support short names
    const shortName = pluginName.replace('@elizaos/', '');
    this.componentDefaults.set(shortName, defaults);
  }

  /**
   * Get component default for a specific plugin and component
   */
  getComponentDefault(
    pluginName: string,
    componentName: string,
    componentType: 'action' | 'provider' | 'evaluator' | 'service'
  ): SimpleComponentDefaults {
    const pluginDefaults = this.componentDefaults.get(pluginName);

    if (!pluginDefaults) {
      // Unknown plugin - default to enabled for backwards compatibility
      return { enabled: true };
    }

    const typeDefaults = pluginDefaults[`${componentType}s` as keyof typeof pluginDefaults];
    if (!typeDefaults) {
      // No specific defaults for this component type - default to enabled
      return { enabled: true };
    }

    const componentDefault = typeDefaults[componentName];
    if (!componentDefault) {
      // No specific default for this component - default to enabled
      return { enabled: true };
    }

    return componentDefault;
  }

  /**
   * Generate simple plugin configuration
   */
  generatePluginConfiguration(
    pluginName: string,
    components: {
      actions?: Array<{ name: string }>;
      providers?: Array<{ name: string }>;
      evaluators?: Array<{ name: string }>;
      services?: Array<{ name: string }>;
    }
  ): PluginConfiguration {
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

    // Generate action configurations
    if (components.actions) {
      for (const action of components.actions) {
        const defaults = this.getComponentDefault(pluginName, action.name, 'action');
        config.actions[action.name] = this.createComponentConfigState(defaults);
      }
    }

    // Generate provider configurations
    if (components.providers) {
      for (const provider of components.providers) {
        const defaults = this.getComponentDefault(pluginName, provider.name, 'provider');
        config.providers[provider.name] = this.createComponentConfigState(defaults);
      }
    }

    // Generate evaluator configurations
    if (components.evaluators) {
      if (!config.evaluators) {
        config.evaluators = {};
      }
      for (const evaluator of components.evaluators) {
        const defaults = this.getComponentDefault(pluginName, evaluator.name, 'evaluator');
        config.evaluators[evaluator.name] = this.createComponentConfigState(defaults);
      }
    }

    // Generate service configurations
    if (components.services) {
      if (!config.services) {
        config.services = {};
      }
      for (const service of components.services) {
        const defaults = this.getComponentDefault(pluginName, service.name, 'service');
        config.services[service.name] = this.createComponentConfigState(defaults);
      }
    }

    return config;
  }

  private createComponentConfigState(defaults: SimpleComponentDefaults): ComponentConfigState {
    return {
      enabled: defaults.enabled,
      overrideLevel: 'default',
      overrideReason: defaults.reason,
      settings: {},
      lastModified: new Date(),
    };
  }

  /**
   * List all plugins with defaults
   */
  listPluginsWithDefaults(): string[] {
    return Array.from(this.componentDefaults.keys());
  }
}
