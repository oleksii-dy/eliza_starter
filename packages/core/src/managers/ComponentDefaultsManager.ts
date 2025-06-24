import { elizaLogger } from '../logger.js';
import type { IAgentRuntime } from '../types/runtime.js';
import type { PluginConfiguration, ComponentConfigState } from '../types/plugin.js';

export interface PluginRiskProfile {
  category: 'HIGH_RISK' | 'MEDIUM_RISK' | 'LOW_RISK' | 'INFRASTRUCTURE';
  level: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' | 'SAFE';
  defaultActionPolicy: 'DISABLED' | 'ENABLED' | 'SELECTIVE';
  defaultProviderPolicy: 'DISABLED' | 'ENABLED';
  defaultServicePolicy: 'DISABLED' | 'ENABLED';
  defaultEvaluatorPolicy: 'DISABLED' | 'ENABLED';
  description: string;
  riskFactors: string[];
}

export interface ComponentRiskAssessment {
  name: string;
  type: 'action' | 'provider' | 'evaluator' | 'service';
  riskLevel: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' | 'SAFE';
  defaultEnabled: boolean;
  reason: string;
  requiredPermissions?: string[];
}

/**
 * Manages intelligent defaults for plugin components based on risk assessment
 * Integrates with ConfigurationManager to set appropriate default configurations
 */
export class ComponentDefaultsManager {
  private runtime: IAgentRuntime;
  private logger = elizaLogger;

  constructor(runtime: IAgentRuntime) {
    this.runtime = runtime;
  }

  /**
   * Plugin risk profiles - categorizes plugins by security and operational risk
   */
  private readonly pluginRiskProfiles = new Map<string, PluginRiskProfile>([
    // HIGH RISK - Financial and Security Critical
    ['@elizaos/plugin-solana', {
      category: 'HIGH_RISK',
      level: 'CRITICAL',
      defaultActionPolicy: 'DISABLED',
      defaultProviderPolicy: 'ENABLED',
      defaultServicePolicy: 'ENABLED',
      defaultEvaluatorPolicy: 'ENABLED',
      description: 'Solana blockchain operations with financial transactions',
      riskFactors: ['Financial transactions', 'Private key access', 'Token transfers', 'DeFi operations']
    }],
    ['@elizaos/plugin-agentkit', {
      category: 'HIGH_RISK',
      level: 'CRITICAL',
      defaultActionPolicy: 'DISABLED',
      defaultProviderPolicy: 'ENABLED',
      defaultServicePolicy: 'ENABLED',
      defaultEvaluatorPolicy: 'ENABLED',
      description: 'Wallet and cryptocurrency operations',
      riskFactors: ['Custodial wallet access', 'Private key management', 'Crypto transactions']
    }],
    ['@elizaos/plugin-evm', {
      category: 'HIGH_RISK',
      level: 'CRITICAL',
      defaultActionPolicy: 'DISABLED',
      defaultProviderPolicy: 'ENABLED',
      defaultServicePolicy: 'ENABLED',
      defaultEvaluatorPolicy: 'ENABLED',
      description: 'Ethereum and EVM blockchain operations',
      riskFactors: ['Smart contract interactions', 'ETH transfers', 'Gas fee management']
    }],
    ['plugin-shell', {
      category: 'HIGH_RISK',
      level: 'CRITICAL',
      defaultActionPolicy: 'DISABLED',
      defaultProviderPolicy: 'ENABLED',
      defaultServicePolicy: 'ENABLED',
      defaultEvaluatorPolicy: 'ENABLED',
      description: 'System shell access and command execution',
      riskFactors: ['System command execution', 'File system access', 'Process control']
    }],
    ['@elizaos/plugin-payment', {
      category: 'HIGH_RISK',
      level: 'HIGH',
      defaultActionPolicy: 'DISABLED',
      defaultProviderPolicy: 'ENABLED',
      defaultServicePolicy: 'ENABLED',
      defaultEvaluatorPolicy: 'ENABLED',
      description: 'Payment processing operations',
      riskFactors: ['Payment transactions', 'Financial data access']
    }],
    ['@elizaos/plugin-crossmint', {
      category: 'HIGH_RISK',
      level: 'HIGH',
      defaultActionPolicy: 'DISABLED',
      defaultProviderPolicy: 'ENABLED',
      defaultServicePolicy: 'ENABLED',
      defaultEvaluatorPolicy: 'ENABLED',
      description: 'NFT minting and blockchain operations',
      riskFactors: ['NFT transactions', 'Blockchain interactions']
    }],

    // MEDIUM RISK - System Access and Automation
    ['@elizaos/plugin-autonomy', {
      category: 'MEDIUM_RISK',
      level: 'MEDIUM',
      defaultActionPolicy: 'SELECTIVE',
      defaultProviderPolicy: 'ENABLED',
      defaultServicePolicy: 'ENABLED',
      defaultEvaluatorPolicy: 'ENABLED',
      description: 'Autonomous agent operations and decision making',
      riskFactors: ['Autonomous operations', 'Decision automation']
    }],
    ['@elizaos/plugin-stagehand', {
      category: 'MEDIUM_RISK',
      level: 'MEDIUM',
      defaultActionPolicy: 'SELECTIVE',
      defaultProviderPolicy: 'ENABLED',
      defaultServicePolicy: 'ENABLED',
      defaultEvaluatorPolicy: 'ENABLED',
      description: 'Browser automation and web interaction',
      riskFactors: ['Web automation', 'Browser control', 'External site interaction']
    }],
    ['@elizaos/plugin-secrets-manager', {
      category: 'MEDIUM_RISK',
      level: 'HIGH',
      defaultActionPolicy: 'DISABLED',
      defaultProviderPolicy: 'ENABLED',
      defaultServicePolicy: 'ENABLED',
      defaultEvaluatorPolicy: 'ENABLED',
      description: 'Secret storage and credential management',
      riskFactors: ['Secret storage', 'Credential management', 'Encryption keys']
    }],
    ['@elizaos/plugin-plugin-manager', {
      category: 'MEDIUM_RISK',
      level: 'MEDIUM',
      defaultActionPolicy: 'SELECTIVE',
      defaultProviderPolicy: 'ENABLED',
      defaultServicePolicy: 'ENABLED',
      defaultEvaluatorPolicy: 'ENABLED',
      description: 'Plugin loading and runtime management',
      riskFactors: ['Plugin loading', 'Runtime modification', 'System access']
    }],
    ['@elizaos/plugin-mcp', {
      category: 'MEDIUM_RISK',
      level: 'MEDIUM',
      defaultActionPolicy: 'SELECTIVE',
      defaultProviderPolicy: 'ENABLED',
      defaultServicePolicy: 'ENABLED',
      defaultEvaluatorPolicy: 'ENABLED',
      description: 'Model Context Protocol operations',
      riskFactors: ['External protocol access', 'Data sharing']
    }],

    // LOW RISK - High-Level Productivity Tools
    ['@elizaos/plugin-autocoder', {
      category: 'LOW_RISK',
      level: 'LOW',
      defaultActionPolicy: 'ENABLED',
      defaultProviderPolicy: 'ENABLED',
      defaultServicePolicy: 'ENABLED',
      defaultEvaluatorPolicy: 'ENABLED',
      description: 'Code generation and development assistance',
      riskFactors: ['Code generation', 'Development tools']
    }],
    ['@elizaos/plugin-github', {
      category: 'LOW_RISK',
      level: 'LOW',
      defaultActionPolicy: 'ENABLED',
      defaultProviderPolicy: 'ENABLED',
      defaultServicePolicy: 'ENABLED',
      defaultEvaluatorPolicy: 'ENABLED',
      description: 'GitHub integration and repository management',
      riskFactors: ['Repository access', 'Code collaboration']
    }],
    ['@elizaos/plugin-research', {
      category: 'LOW_RISK',
      level: 'SAFE',
      defaultActionPolicy: 'ENABLED',
      defaultProviderPolicy: 'ENABLED',
      defaultServicePolicy: 'ENABLED',
      defaultEvaluatorPolicy: 'ENABLED',
      description: 'Research and information gathering',
      riskFactors: ['Information retrieval', 'Data analysis']
    }],
    ['@elizaos/plugin-knowledge', {
      category: 'LOW_RISK',
      level: 'SAFE',
      defaultActionPolicy: 'ENABLED',
      defaultProviderPolicy: 'ENABLED',
      defaultServicePolicy: 'ENABLED',
      defaultEvaluatorPolicy: 'ENABLED',
      description: 'Knowledge management and storage',
      riskFactors: ['Data storage', 'Information management']
    }],
    ['@elizaos/plugin-planning', {
      category: 'LOW_RISK',
      level: 'SAFE',
      defaultActionPolicy: 'ENABLED',
      defaultProviderPolicy: 'ENABLED',
      defaultServicePolicy: 'ENABLED',
      defaultEvaluatorPolicy: 'ENABLED',
      description: 'Task planning and workflow management',
      riskFactors: ['Task coordination', 'Workflow automation']
    }],
    ['@elizaos/plugin-goals', {
      category: 'LOW_RISK',
      level: 'SAFE',
      defaultActionPolicy: 'ENABLED',
      defaultProviderPolicy: 'ENABLED',
      defaultServicePolicy: 'ENABLED',
      defaultEvaluatorPolicy: 'ENABLED',
      description: 'Goal setting and tracking',
      riskFactors: ['Goal management', 'Progress tracking']
    }],
    ['@elizaos/plugin-todo', {
      category: 'LOW_RISK',
      level: 'SAFE',
      defaultActionPolicy: 'ENABLED',
      defaultProviderPolicy: 'ENABLED',
      defaultServicePolicy: 'ENABLED',
      defaultEvaluatorPolicy: 'ENABLED',
      description: 'Task and todo management',
      riskFactors: ['Task management', 'Productivity tools']
    }],
    ['@elizaos/plugin-vision', {
      category: 'LOW_RISK',
      level: 'SAFE',
      defaultActionPolicy: 'ENABLED',
      defaultProviderPolicy: 'ENABLED',
      defaultServicePolicy: 'ENABLED',
      defaultEvaluatorPolicy: 'ENABLED',
      description: 'Image analysis and computer vision',
      riskFactors: ['Image processing', 'Content analysis']
    }],
    ['@elizaos/plugin-robot', {
      category: 'LOW_RISK',
      level: 'LOW',
      defaultActionPolicy: 'ENABLED',
      defaultProviderPolicy: 'ENABLED',
      defaultServicePolicy: 'ENABLED',
      defaultEvaluatorPolicy: 'ENABLED',
      description: 'Robotics control and automation',
      riskFactors: ['Hardware control', 'Physical automation']
    }],

    // INFRASTRUCTURE - Always Enable
    ['@elizaos/plugin-trust', {
      category: 'INFRASTRUCTURE',
      level: 'SAFE',
      defaultActionPolicy: 'ENABLED',
      defaultProviderPolicy: 'ENABLED',
      defaultServicePolicy: 'ENABLED',
      defaultEvaluatorPolicy: 'ENABLED',
      description: 'Trust and security framework',
      riskFactors: []
    }],
    ['@elizaos/plugin-sql', {
      category: 'INFRASTRUCTURE',
      level: 'SAFE',
      defaultActionPolicy: 'ENABLED',
      defaultProviderPolicy: 'ENABLED',
      defaultServicePolicy: 'ENABLED',
      defaultEvaluatorPolicy: 'ENABLED',
      description: 'Database operations and SQL support',
      riskFactors: []
    }],
    ['@elizaos/plugin-tasks', {
      category: 'INFRASTRUCTURE',
      level: 'SAFE',
      defaultActionPolicy: 'ENABLED',
      defaultProviderPolicy: 'ENABLED',
      defaultServicePolicy: 'ENABLED',
      defaultEvaluatorPolicy: 'ENABLED',
      description: 'Task management framework',
      riskFactors: []
    }],
    ['@elizaos/plugin-message-handling', {
      category: 'INFRASTRUCTURE',
      level: 'SAFE',
      defaultActionPolicy: 'ENABLED',
      defaultProviderPolicy: 'ENABLED',
      defaultServicePolicy: 'ENABLED',
      defaultEvaluatorPolicy: 'ENABLED',
      description: 'Core messaging and communication',
      riskFactors: []
    }],
    ['@elizaos/plugin-dummy-services', {
      category: 'INFRASTRUCTURE',
      level: 'SAFE',
      defaultActionPolicy: 'ENABLED',
      defaultProviderPolicy: 'ENABLED',
      defaultServicePolicy: 'ENABLED',
      defaultEvaluatorPolicy: 'ENABLED',
      description: 'Testing and development infrastructure',
      riskFactors: []
    }],
  ]);

  /**
   * High-risk actions that should be disabled by default
   */
  private readonly highRiskActionPatterns = new Set([
    // Financial operations
    'TRANSFER_', 'SWAP_', 'STAKE_', 'UNSTAKE_', 'MINT_', 'BURN_',
    'SEND_', 'PAY_', 'WITHDRAW_', 'DEPOSIT_',
    
    // System operations
    'RUN_SHELL', 'EXECUTE_', 'KILL_', 'DELETE_', 'REMOVE_',
    'INSTALL_', 'UNINSTALL_', 'LOAD_PLUGIN', 'UNLOAD_PLUGIN',
    
    // Security operations
    'SET_SECRET', 'DELETE_SECRET', 'ENCRYPT_', 'DECRYPT_',
    'AUTHENTICATE_', 'AUTHORIZE_',
    
    // External access
    'WRITE_FILE', 'DELETE_FILE', 'MODIFY_', 'UPDATE_SYSTEM'
  ]);

  /**
   * Generate intelligent defaults for a plugin's components
   */
  generatePluginDefaults(pluginName: string, components: any[]): PluginConfiguration {
    const profile = this.getPluginRiskProfile(pluginName);
    
    this.logger.info(`Generating defaults for plugin ${pluginName} (${profile.category}, ${profile.level})`);

    const config: PluginConfiguration = {
      pluginName,
      enabled: true,
      actions: {},
      providers: {},
      evaluators: {},
      services: {},
      settings: {
        riskProfile: profile,
        generatedAt: new Date().toISOString(),
        version: '1.0.0'
      },
      lastModified: new Date(),
    };

    // Process components based on type and risk assessment
    for (const component of components) {
      const assessment = this.assessComponentRisk(component, profile);
      const componentConfig = this.createComponentConfig(assessment);

      switch (component.type) {
        case 'action':
          config.actions[assessment.name] = componentConfig;
          break;
        case 'provider':
          config.providers[assessment.name] = componentConfig;
          break;
        case 'evaluator':
          config.evaluators![assessment.name] = componentConfig;
          break;
        case 'service':
          config.services![assessment.name] = componentConfig;
          break;
      }

      this.logger.debug(
        `Component ${assessment.name} (${component.type}): ${assessment.defaultEnabled ? 'ENABLED' : 'DISABLED'} - ${assessment.reason}`
      );
    }

    return config;
  }

  /**
   * Get risk profile for a plugin
   */
  private getPluginRiskProfile(pluginName: string): PluginRiskProfile {
    const profile = this.pluginRiskProfiles.get(pluginName);
    
    if (profile) {
      return profile;
    }

    // Default profile for unknown plugins
    return {
      category: 'MEDIUM_RISK',
      level: 'MEDIUM',
      defaultActionPolicy: 'SELECTIVE',
      defaultProviderPolicy: 'ENABLED',
      defaultServicePolicy: 'ENABLED',
      defaultEvaluatorPolicy: 'ENABLED',
      description: 'Unknown plugin - apply moderate security defaults',
      riskFactors: ['Unknown functionality', 'Unassessed risk']
    };
  }

  /**
   * Assess risk for individual component
   */
  private assessComponentRisk(component: any, profile: PluginRiskProfile): ComponentRiskAssessment {
    const componentName = component.name || component.component?.name || 'unknown';
    const componentType = component.type;

    let defaultEnabled = true;
    let riskLevel: ComponentRiskAssessment['riskLevel'] = 'SAFE';
    let reason = 'Standard component with minimal risk';

    // Apply plugin-level policy
    switch (componentType) {
      case 'action':
        defaultEnabled = this.shouldEnableAction(componentName, profile);
        riskLevel = this.getActionRiskLevel(componentName, profile);
        reason = this.getActionRiskReason(componentName, profile);
        break;
      case 'provider':
        defaultEnabled = profile.defaultProviderPolicy === 'ENABLED';
        riskLevel = profile.level === 'CRITICAL' ? 'HIGH' : 'LOW';
        reason = 'Providers generally safe for information access';
        break;
      case 'service':
        defaultEnabled = profile.defaultServicePolicy === 'ENABLED';
        riskLevel = 'SAFE';
        reason = 'Services provide infrastructure functionality';
        break;
      case 'evaluator':
        defaultEnabled = profile.defaultEvaluatorPolicy === 'ENABLED';
        riskLevel = 'SAFE';
        reason = 'Evaluators analyze without side effects';
        break;
    }

    return {
      name: componentName,
      type: componentType,
      riskLevel,
      defaultEnabled,
      reason,
      requiredPermissions: this.getRequiredPermissions(componentName, componentType, profile)
    };
  }

  /**
   * Determine if an action should be enabled by default
   */
  private shouldEnableAction(actionName: string, profile: PluginRiskProfile): boolean {
    // Infrastructure plugins - always enable
    if (profile.category === 'INFRASTRUCTURE') {
      return true;
    }

    // High-risk plugins - selective enabling
    if (profile.category === 'HIGH_RISK') {
      return !this.isHighRiskAction(actionName);
    }

    // Medium-risk plugins - selective based on policy
    if (profile.category === 'MEDIUM_RISK' && profile.defaultActionPolicy === 'SELECTIVE') {
      return !this.isHighRiskAction(actionName);
    }

    // Low-risk plugins or explicit enable policy
    return profile.defaultActionPolicy === 'ENABLED';
  }

  /**
   * Check if action matches high-risk patterns
   */
  private isHighRiskAction(actionName: string): boolean {
    const upperName = actionName.toUpperCase();
    return Array.from(this.highRiskActionPatterns).some(pattern => 
      upperName.includes(pattern) || upperName.startsWith(pattern)
    );
  }

  /**
   * Get risk level for action
   */
  private getActionRiskLevel(actionName: string, profile: PluginRiskProfile): ComponentRiskAssessment['riskLevel'] {
    if (this.isHighRiskAction(actionName)) {
      return profile.category === 'HIGH_RISK' ? 'CRITICAL' : 'HIGH';
    }
    
    switch (profile.level) {
      case 'CRITICAL': return 'HIGH';
      case 'HIGH': return 'MEDIUM';
      case 'MEDIUM': return 'LOW';
      default: return 'SAFE';
    }
  }

  /**
   * Get human-readable reason for action risk assessment
   */
  private getActionRiskReason(actionName: string, profile: PluginRiskProfile): string {
    if (this.isHighRiskAction(actionName)) {
      return `High-risk action pattern detected in ${profile.category} plugin`;
    }

    switch (profile.category) {
      case 'HIGH_RISK':
        return 'Standard action in high-risk plugin - enabled with caution';
      case 'MEDIUM_RISK':
        return 'Standard action in medium-risk plugin';
      case 'LOW_RISK':
        return 'Low-risk action in productivity plugin';
      case 'INFRASTRUCTURE':
        return 'Infrastructure action - always enabled';
      default:
        return 'Unknown risk assessment';
    }
  }

  /**
   * Get required permissions for component
   */
  private getRequiredPermissions(
    componentName: string,
    componentType: string,
    profile: PluginRiskProfile
  ): string[] | undefined {
    const permissions: string[] = [];

    if (componentType === 'action' && this.isHighRiskAction(componentName)) {
      permissions.push('admin');
    }

    if (profile.category === 'HIGH_RISK') {
      permissions.push('trusted_user');
    }

    return permissions.length > 0 ? permissions : undefined;
  }

  /**
   * Create component configuration state
   */
  private createComponentConfig(assessment: ComponentRiskAssessment): ComponentConfigState {
    return {
      enabled: assessment.defaultEnabled,
      overrideLevel: 'default',
      overrideReason: assessment.reason,
      settings: {
        riskLevel: assessment.riskLevel,
        requiredPermissions: assessment.requiredPermissions,
        autoGenerated: true
      },
      lastModified: new Date(),
    };
  }

  /**
   * Apply defaults to runtime configuration manager
   */
  async applyPluginDefaults(pluginName: string, components: any[]): Promise<void> {
    const configurationManager = (this.runtime as any).configurationManager;
    
    if (!configurationManager) {
      this.logger.warn('ConfigurationManager not available, cannot apply defaults');
      return;
    }

    const defaults = this.generatePluginDefaults(pluginName, components);
    
    // Set defaults using 'default' source with lowest priority
    await configurationManager.setOverride('default', pluginName, defaults);
    
    this.logger.info(`Applied intelligent defaults for plugin ${pluginName}`);
  }

  /**
   * Get summary of defaults applied
   */
  getDefaultsSummary(pluginName: string): string {
    const profile = this.getPluginRiskProfile(pluginName);
    
    return `Plugin: ${pluginName}
Category: ${profile.category} (${profile.level})
Description: ${profile.description}
Risk Factors: ${profile.riskFactors.join(', ')}
Action Policy: ${profile.defaultActionPolicy}
Provider Policy: ${profile.defaultProviderPolicy}
Service Policy: ${profile.defaultServicePolicy}
Evaluator Policy: ${profile.defaultEvaluatorPolicy}`;
  }
}