import type { ConfigurationSource, PluginConfiguration } from '../types/plugin';
import { SimplePluginDefaults } from '../managers/SimplePluginDefaults';
import { elizaLogger } from '../logger';

/**
 * Configuration source that provides intelligent defaults for all plugins
 */
export class DefaultConfigurationSource implements ConfigurationSource {
  name = 'default';
  priority = 1; // Lowest priority - these are fallback defaults

  private defaultsManager = SimplePluginDefaults.getInstance();
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

    // Generate configuration using simple defaults manager
    const config = this.defaultsManager.generatePluginConfiguration(pluginName, components);

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
    actions?: Array<{ name: string }>;
    providers?: Array<{ name: string }>;
    evaluators?: Array<{ name: string }>;
    services?: Array<{ name: string }>;
  } {
    const components: any = {};

    // Handle legacy plugin structure
    if (plugin.actions) {
      components.actions = plugin.actions.map((action: any) => ({
        name: action.name,
      }));
    }

    if (plugin.providers) {
      components.providers = plugin.providers.map((provider: any) => ({
        name: provider.name,
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
      }));
    }

    if (plugin.configurableProviders) {
      components.providers = plugin.configurableProviders.map((provider: any) => ({
        name: provider.name || provider.provider?.name,
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
          });
        } else if (comp.type === 'provider') {
          providers.push({
            name: comp.name || comp.component?.name,
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
   * List all plugins with defaults
   */
  listPluginsWithDefaults() {
    return this.defaultsManager.listPluginsWithDefaults();
  }
}
