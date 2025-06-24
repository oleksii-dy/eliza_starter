import { Service, ServiceType, IAgentRuntime } from '../types/index';
import {
  UnifiedPluginConfiguration,
  PluginDependency,
  ConfigurationValidationResult,
  ConfigurationError,
  ConfigurationWarning,
} from '../types/plugin';
import { WalletCapability } from '../types/universal-wallet';
import { elizaLogger } from '../logger';

/**
 * Manages plugin dependencies, load order, and capability validation
 */
export class PluginDependencyManager extends Service {
  static override readonly serviceType = ServiceType.PLUGIN_MANAGER;
  static serviceName = 'plugin-dependency-manager';

  public readonly capabilityDescription =
    'Manages plugin dependencies, load order, and cross-plugin capability validation';

  private dependencyGraph: Map<string, PluginDependency[]> = new Map();
  private loadOrder: string[] = [];
  private pluginConfigurations: Record<string, UnifiedPluginConfiguration> = {};
  private capabilities: Map<string, WalletCapability[]> = new Map();

  constructor(runtime?: IAgentRuntime) {
    super(runtime);
  }

  static async start(runtime: IAgentRuntime): Promise<PluginDependencyManager> {
    const manager = new PluginDependencyManager(runtime);
    elizaLogger.info('Plugin Dependency Manager started');
    return manager;
  }

  async stop(): Promise<void> {
    this.dependencyGraph.clear();
    this.loadOrder = [];
    this.pluginConfigurations = {};
    this.capabilities.clear();
    elizaLogger.info('Plugin Dependency Manager stopped');
  }

  /**
   * Register a plugin with its dependencies and capabilities
   */
  registerPlugin(
    pluginName: string,
    dependencies: PluginDependency[],
    capabilities: WalletCapability[],
    configuration: UnifiedPluginConfiguration
  ): void {
    this.dependencyGraph.set(pluginName, dependencies);
    this.capabilities.set(pluginName, capabilities);
    this.pluginConfigurations[pluginName] = configuration;

    elizaLogger.info(`Registered plugin: ${pluginName} with ${dependencies.length} dependencies`);
  }

  /**
   * Calculate optimal plugin load order based on dependencies
   */
  calculateLoadOrder(): string[] {
    const visited = new Set<string>();
    const visiting = new Set<string>();
    const loadOrder: string[] = [];

    const visit = (pluginName: string) => {
      if (visiting.has(pluginName)) {
        throw new Error(`Circular dependency detected involving plugin: ${pluginName}`);
      }

      if (visited.has(pluginName)) {
        return;
      }

      visiting.add(pluginName);

      const dependencies = this.dependencyGraph.get(pluginName) || [];
      for (const dep of dependencies) {
        if (this.dependencyGraph.has(dep.pluginName)) {
          visit(dep.pluginName);
        } else if (dep.required) {
          throw new Error(
            `Required dependency not found: ${dep.pluginName} for plugin: ${pluginName}`
          );
        }
      }

      visiting.delete(pluginName);
      visited.add(pluginName);
      loadOrder.push(pluginName);
    };

    // Visit all registered plugins
    for (const pluginName of this.dependencyGraph.keys()) {
      if (!visited.has(pluginName)) {
        visit(pluginName);
      }
    }

    this.loadOrder = loadOrder;
    elizaLogger.info(`Calculated load order: ${loadOrder.join(' -> ')}`);
    return loadOrder;
  }

  /**
   * Validate plugin configuration and dependencies
   */
  validateConfiguration(
    config: Record<string, UnifiedPluginConfiguration>
  ): ConfigurationValidationResult {
    const errors: ConfigurationError[] = [];
    const warnings: ConfigurationWarning[] = [];

    for (const [pluginName, pluginConfig] of Object.entries(config)) {
      // Validate dependencies
      for (const depName of pluginConfig.dependencies) {
        if (!config[depName] || !config[depName].enabled) {
          errors.push({
            pluginName,
            componentType: 'service',
            componentName: 'plugin',
            errorType: 'dependency_missing',
            message: `Required dependency '${depName}' is not enabled`,
            resolution: `Enable plugin '${depName}' or disable '${pluginName}'`,
          });
        }
      }

      // Validate action capabilities
      for (const [actionName, actionConfig] of Object.entries(pluginConfig.components.actions)) {
        if (actionConfig.enabled && actionConfig.requiredCapabilities) {
          const pluginCapabilities = pluginConfig.metadata.capabilities;
          const missingCapabilities = actionConfig.requiredCapabilities.filter(
            (cap) => !pluginCapabilities.includes(cap)
          );

          if (missingCapabilities.length > 0) {
            errors.push({
              pluginName,
              componentType: 'action',
              componentName: actionName,
              errorType: 'capability_missing',
              message: `Action requires capabilities not provided by plugin: ${missingCapabilities.join(', ')}`,
              resolution: `Disable action '${actionName}' or add required capabilities to plugin`,
            });
          }
        }

        // Check for service dependencies
        if (actionConfig.enabled && actionConfig.dependsOnServices) {
          for (const serviceName of actionConfig.dependsOnServices) {
            const serviceConfig = pluginConfig.components.services[serviceName];
            if (!serviceConfig || !serviceConfig.enabled) {
              errors.push({
                pluginName,
                componentType: 'action',
                componentName: actionName,
                errorType: 'dependency_missing',
                message: `Action depends on service '${serviceName}' which is not enabled`,
                resolution: `Enable service '${serviceName}' or disable action '${actionName}'`,
              });
            }
          }
        }
      }

      // Validate service dependencies
      for (const [serviceName, serviceConfig] of Object.entries(pluginConfig.components.services)) {
        if (serviceConfig.enabled && serviceConfig.dependsOn) {
          for (const depServiceName of serviceConfig.dependsOn) {
            // Check within same plugin
            const depService = pluginConfig.components.services[depServiceName];
            if (!depService || !depService.enabled) {
              // Check in dependency plugins
              let found = false;
              for (const depPluginName of pluginConfig.dependencies) {
                const depPlugin = config[depPluginName];
                if (depPlugin?.components.services[depServiceName]?.enabled) {
                  found = true;
                  break;
                }
              }

              if (!found) {
                errors.push({
                  pluginName,
                  componentType: 'service',
                  componentName: serviceName,
                  errorType: 'dependency_missing',
                  message: `Service depends on '${depServiceName}' which is not available`,
                  resolution: `Enable required service or disable '${serviceName}'`,
                });
              }
            }
          }
        }
      }

      // Generate warnings for potential issues
      const enabledActions = Object.entries(pluginConfig.components.actions).filter(
        ([_, config]) => config.enabled
      );

      if (enabledActions.length === 0) {
        warnings.push({
          pluginName,
          message: 'Plugin has no enabled actions - it may not provide any user functionality',
          impact: 'medium',
        });
      }

      // Warn about conflicting plugins
      if (pluginConfig.metadata.keyManagementType === 'self') {
        const conflictingPlugins = Object.entries(config).filter(
          ([name, cfg]) =>
            name !== pluginName &&
            cfg.enabled &&
            cfg.metadata.keyManagementType === 'self' &&
            cfg.metadata.chainSupport?.some((chain) =>
              pluginConfig.metadata.chainSupport?.includes(chain)
            )
        );

        if (conflictingPlugins.length > 0) {
          warnings.push({
            pluginName,
            message: `Multiple plugins managing private keys for same chains: ${conflictingPlugins.map(([name]) => name).join(', ')}`,
            impact: 'high',
          });
        }
      }
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
    };
  }

  /**
   * Check if a plugin can access another plugin's capabilities
   */
  canAccessPlugin(requestingPlugin: string, targetPlugin: string): boolean {
    const requestingConfig = this.pluginConfigurations[requestingPlugin];
    if (!requestingConfig) {
      return false;
    }

    // Check if target plugin is declared as a dependency
    return requestingConfig.dependencies.includes(targetPlugin);
  }

  /**
   * Get capabilities provided by a plugin
   */
  getPluginCapabilities(pluginName: string): WalletCapability[] {
    return this.capabilities.get(pluginName) || [];
  }

  /**
   * Find which plugin provides a specific capability
   */
  findCapabilityProvider(capability: WalletCapability): string[] {
    const providers: string[] = [];
    for (const [pluginName, capabilities] of this.capabilities) {
      if (capabilities.includes(capability) && this.pluginConfigurations[pluginName]?.enabled) {
        providers.push(pluginName);
      }
    }
    return providers;
  }

  /**
   * Get recommended plugin configuration based on user preferences
   */
  getRecommendedConfiguration(preferences: {
    priorityChains?: string[];
    riskTolerance?: 'low' | 'medium' | 'high';
    features?: WalletCapability[];
  }): Record<string, UnifiedPluginConfiguration> {
    const recommended: Record<string, UnifiedPluginConfiguration> = {};

    // Start with all registered plugins
    for (const [pluginName, config] of Object.entries(this.pluginConfigurations)) {
      recommended[pluginName] = JSON.parse(JSON.stringify(config)); // Deep copy

      // Adjust based on chain priorities
      if (preferences.priorityChains && config.metadata.chainSupport) {
        const hasHighPriorityChain = config.metadata.chainSupport.some((chain) =>
          preferences.priorityChains!.includes(chain)
        );

        if (hasHighPriorityChain) {
          // Enable basic functionality for priority chains
          for (const [actionName, actionConfig] of Object.entries(config.components.actions)) {
            if (actionConfig.category === 'transfer' || !actionConfig.category) {
              recommended[pluginName].components.actions[actionName].enabled = true;
            }
          }
        }
      }

      // Adjust based on requested features
      if (preferences.features) {
        for (const feature of preferences.features) {
          if (config.metadata.capabilities.includes(feature)) {
            // Find and enable actions that provide this capability
            for (const [actionName, actionConfig] of Object.entries(config.components.actions)) {
              if (actionConfig.requiredCapabilities.includes(feature)) {
                recommended[pluginName].components.actions[actionName].enabled = true;
              }
            }
          }
        }
      }

      // Adjust based on risk tolerance
      if (preferences.riskTolerance === 'low') {
        // Disable high-risk actions
        for (const [actionName, actionConfig] of Object.entries(config.components.actions)) {
          if (actionConfig.category === 'defi' || actionConfig.category === 'governance') {
            recommended[pluginName].components.actions[actionName].enabled = false;
          }
        }
      } else if (preferences.riskTolerance === 'high') {
        // Enable advanced features
        for (const [actionName, actionConfig] of Object.entries(config.components.actions)) {
          if (actionConfig.userConfigurable) {
            recommended[pluginName].components.actions[actionName].enabled = true;
          }
        }
      }
    }

    return recommended;
  }

  /**
   * Get current load order
   */
  getLoadOrder(): string[] {
    return [...this.loadOrder];
  }

  /**
   * Get dependency graph for visualization
   */
  getDependencyGraph(): Map<string, PluginDependency[]> {
    return new Map(this.dependencyGraph);
  }

  /**
   * Check if all dependencies are satisfied for a plugin
   */
  areDependenciesSatisfied(pluginName: string): boolean {
    const dependencies = this.dependencyGraph.get(pluginName) || [];

    for (const dep of dependencies) {
      const depConfig = this.pluginConfigurations[dep.pluginName];
      if (dep.required && (!depConfig || !depConfig.enabled)) {
        return false;
      }
    }

    return true;
  }

  /**
   * Get plugins that depend on a given plugin
   */
  getDependentPlugins(pluginName: string): string[] {
    const dependents: string[] = [];

    for (const [name, dependencies] of this.dependencyGraph) {
      if (dependencies.some((dep) => dep.pluginName === pluginName)) {
        dependents.push(name);
      }
    }

    return dependents;
  }
}
