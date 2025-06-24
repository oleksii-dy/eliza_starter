import type { ConfigurationSource, PluginConfiguration } from '../types/plugin.js';
import { PluginDefaultsManager, RiskLevel } from '../managers/PluginDefaultsManager.js';
import { elizaLogger } from '../logger.js';

/**
 * Configuration source that provides intelligent defaults for all plugins
 */
export class DefaultConfigurationSource implements ConfigurationSource {
  name = 'default';
  priority = 1; // Lowest priority - these are fallback defaults

  private defaultsManager = PluginDefaultsManager.getInstance();
  private logger = elizaLogger;

  async load(): Promise<Record<string, PluginConfiguration>> {
    this.logger.debug('Loading default plugin configurations');

    // Return empty for now - defaults are generated on-demand
    // This allows the system to work with plugins not yet classified
    return {};
  }

  async save(_configurations: Record<string, PluginConfiguration>): Promise<void> {
    // Defaults are not saved - they're computed
    this.logger.debug('Default configuration source does not save configurations');
  }

  async updatePluginConfig(_pluginName: string, _config: PluginConfiguration): Promise<void> {
    // Defaults are not updated through this source
    this.logger.debug('Default configuration source does not update configurations');
  }

  /**
   * Generate default configuration for a plugin with its components
   */
  generateDefaultForPlugin(
    pluginName: string,
    plugin: any // Plugin or ConfigurablePlugin
  ): PluginConfiguration {
    this.logger.debug(`Generating default configuration for plugin: ${pluginName}`);

    // Extract component information from plugin
    const components = this.extractComponentsFromPlugin(plugin);

    // Generate configuration using defaults manager
    const config = this.defaultsManager.generateDefaultConfiguration(pluginName, components);

    this.logger.info(
      `Generated default configuration for ${pluginName}: ` +
        `${Object.keys(config.actions).length} actions, ` +
        `${Object.keys(config.providers).length} providers, ` +
        `${Object.keys(config.evaluators || {}).length} evaluators, ` +
        `${Object.keys(config.services || {}).length} services`
    );

    return config;
  }

  /**
   * Extract component information from plugin definition
   */
  private extractComponentsFromPlugin(plugin: any): {
    actions?: Array<{ name: string; riskLevel?: RiskLevel }>;
    providers?: Array<{ name: string; dynamic?: boolean }>;
    evaluators?: Array<{ name: string }>;
    services?: Array<{ name: string }>;
  } {
    const components: any = {};

    // Handle legacy plugin structure
    if (plugin.actions) {
      components.actions = plugin.actions.map((action: any) => ({
        name: action.name,
        riskLevel: this.inferActionRiskLevel(action),
      }));
    }

    if (plugin.providers) {
      components.providers = plugin.providers.map((provider: any) => ({
        name: provider.name,
        dynamic: provider.dynamic || false,
      }));
    }

    if (plugin.evaluators) {
      components.evaluators = plugin.evaluators.map((evaluator: any) => ({
        name: evaluator.name,
      }));
    }

    if (plugin.services) {
      components.services = plugin.services.map((service: any) => ({
        name: service.serviceName || service.name || 'UnknownService',
      }));
    }

    // Handle configurable plugin structure
    if (plugin.configurableActions) {
      components.actions = plugin.configurableActions.map((action: any) => ({
        name: action.name || action.action?.name,
        riskLevel: this.inferActionRiskLevel(action.action || action),
      }));
    }

    if (plugin.configurableProviders) {
      components.providers = plugin.configurableProviders.map((provider: any) => ({
        name: provider.name || provider.provider?.name,
        dynamic: provider.provider?.dynamic || false,
      }));
    }

    if (plugin.configurableEvaluators) {
      components.evaluators = plugin.configurableEvaluators.map((evaluator: any) => ({
        name: evaluator.name || evaluator.evaluator?.name,
      }));
    }

    if (plugin.configurableServices) {
      components.services = plugin.configurableServices.map((service: any) => ({
        name: service.service?.serviceName || service.service?.name || 'UnknownService',
      }));
    }

    // Handle unified component structure
    if (plugin.components) {
      const actions: any[] = [];
      const providers: any[] = [];
      const evaluators: any[] = [];
      const services: any[] = [];

      for (const comp of plugin.components) {
        if (comp.type === 'action') {
          actions.push({
            name: comp.name || comp.component?.name,
            riskLevel: this.inferActionRiskLevel(comp.component),
          });
        } else if (comp.type === 'provider') {
          providers.push({
            name: comp.name || comp.component?.name,
            dynamic: comp.component?.dynamic || false,
          });
        } else if (comp.type === 'evaluator') {
          evaluators.push({
            name: comp.name || comp.component?.name,
          });
        } else if (comp.type === 'service') {
          services.push({
            name: comp.name || comp.component?.serviceName || comp.component?.name,
          });
        }
      }

      if (actions.length) {
        components.actions = actions;
      }
      if (providers.length) {
        components.providers = providers;
      }
      if (evaluators.length) {
        components.evaluators = evaluators;
      }
      if (services.length) {
        components.services = services;
      }
    }

    return components;
  }

  /**
   * Infer risk level from action properties
   */
  private inferActionRiskLevel(action: any): RiskLevel {
    if (!action) {
      return RiskLevel.MEDIUM;
    }

    const actionName = action.name?.toLowerCase() || '';
    const description = action.description?.toLowerCase() || '';
    const similes = action.similes?.join(' ').toLowerCase() || '';
    const combined = `${actionName} ${description} ${similes}`;

    // Critical risk patterns
    if (
      this.containsAny(combined, [
        'delete',
        'remove',
        'destroy',
        'kill',
        'terminate',
        'shutdown',
        'execute',
        'shell',
        'command',
        'sudo',
        'admin',
        'root',
      ])
    ) {
      return RiskLevel.CRITICAL;
    }

    // High risk patterns
    if (
      this.containsAny(combined, [
        'transfer',
        'send',
        'pay',
        'swap',
        'bridge',
        'mint',
        'burn',
        'stake',
        'unstake',
        'approve',
        'spend',
        'withdraw',
        'deposit',
        'create',
        'deploy',
        'modify',
        'update',
        'change',
        'set',
        'write',
        'post',
        'publish',
        'commit',
        'push',
      ])
    ) {
      return RiskLevel.HIGH;
    }

    // Medium risk patterns
    if (
      this.containsAny(combined, [
        'connect',
        'join',
        'subscribe',
        'enable',
        'disable',
        'configure',
        'schedule',
        'trigger',
        'activate',
        'deactivate',
      ])
    ) {
      return RiskLevel.MEDIUM;
    }

    // Low risk patterns
    if (
      this.containsAny(combined, [
        'start',
        'stop',
        'pause',
        'resume',
        'restart',
        'refresh',
        'validate',
        'verify',
        'check',
        'test',
      ])
    ) {
      return RiskLevel.LOW;
    }

    // Safe patterns (read-only)
    if (
      this.containsAny(combined, [
        'get',
        'fetch',
        'read',
        'load',
        'show',
        'display',
        'view',
        'list',
        'search',
        'find',
        'query',
        'describe',
        'analyze',
        'status',
        'info',
        'details',
        'balance',
        'history',
        'log',
      ])
    ) {
      return RiskLevel.SAFE;
    }

    // Default to medium risk for unknown actions
    return RiskLevel.MEDIUM;
  }

  /**
   * Check if text contains any of the given patterns
   */
  private containsAny(text: string, patterns: string[]): boolean {
    return patterns.some((pattern) => text.includes(pattern));
  }

  /**
   * Get risk assessment for a plugin
   */
  getPluginRiskAssessment(pluginName: string) {
    return this.defaultsManager.getPluginRiskAssessment(pluginName);
  }

  /**
   * Update plugin classification
   */
  updatePluginClassification(pluginName: string, defaults: any) {
    this.defaultsManager.updatePluginClassification(pluginName, defaults);
  }

  /**
   * List all classified plugins
   */
  listClassifiedPlugins() {
    return this.defaultsManager.listClassifiedPlugins();
  }
}
