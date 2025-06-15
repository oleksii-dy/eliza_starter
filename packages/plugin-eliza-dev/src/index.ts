import {
  type Plugin,
  type IAgentRuntime,
  logger
} from '@elizaos/core';

// Import services
import { GitHubIntegrationService, SPARCWorkflowService } from './services/index.js';

// Import actions
import {
  captureFeatureAction,
  implementFeatureAction,
  reviewPRAction,
  evalPromptAction,
  shipReportAction
} from './actions/index.js';

// Import providers
import {
  githubContextProvider,
  sparcPhaseProvider,
  implementationStatusProvider,
  qualityMetricsProvider
} from './providers/index.js';

// Import evaluators
import { sparcComplianceEvaluator } from './evaluators/index.js';

// Export types for external use
export * from './types/index.js';

/**
 * ElizaDev Plugin - Kora-style compounding engineering workflow with SPARC methodology
 * 
 * This plugin provides:
 * - /capture_feature: Turn ideas into GitHub issues with SPARC specifications
 * - /implement_feature: TDD implementation with quality gates
 * - /review_pr: Multi-agent code review
 * - /eval_prompt: Prompt optimization
 * - /ship_report: Release documentation
 */
export const elizaDevPlugin: Plugin = {
  name: 'eliza-dev',
  description: 'Kora-style compounding engineering workflow with SPARC methodology for automated development',
  
  /**
   * Plugin initialization - validate configuration and setup services
   */
  async init(config: Record<string, string>, runtime: IAgentRuntime) {
    logger.info('[ElizaDev] Initializing plugin...');

    // Validate required GitHub configuration
    const requiredGitHubSettings = ['GITHUB_TOKEN', 'GITHUB_OWNER', 'GITHUB_REPO'];
    for (const setting of requiredGitHubSettings) {
      if (!config[setting] && !runtime.getSetting(setting)) {
        throw new Error(`Missing required configuration: ${setting}`);
      }
    }

    // Validate GitHub token format
    const githubToken = config.GITHUB_TOKEN || runtime.getSetting('GITHUB_TOKEN');
    if (githubToken && !githubToken.startsWith('ghp_') && !githubToken.startsWith('github_pat_')) {
      logger.warn('[ElizaDev] GitHub token format may be invalid. Expected ghp_ or github_pat_ prefix.');
    }

    // Set environment variables from config
    const configMappings = {
      'GITHUB_TOKEN': 'GITHUB_TOKEN',
      'GITHUB_OWNER': 'GITHUB_OWNER', 
      'GITHUB_REPO': 'GITHUB_REPO',
      'GITHUB_WEBHOOK_SECRET': 'GITHUB_WEBHOOK_SECRET',
      'SPARC_DEFAULT_COVERAGE': 'SPARC_DEFAULT_COVERAGE',
      'SPARC_QUALITY_THRESHOLD': 'SPARC_QUALITY_THRESHOLD',
      'SPARC_MAX_RETRIES': 'SPARC_MAX_RETRIES'
    };

    for (const [configKey, envKey] of Object.entries(configMappings)) {
      const value = config[configKey] || runtime.getSetting(envKey);
      if (value) {
        process.env[envKey] = value;
      }
    }

    logger.info('[ElizaDev] Configuration validated successfully');
    logger.info(`[ElizaDev] Configured for repository: ${runtime.getSetting('GITHUB_OWNER')}/${runtime.getSetting('GITHUB_REPO')}`);
  },

  // Register services
  services: [GitHubIntegrationService, SPARCWorkflowService],
  
  // Register actions (commands)
  actions: [
    captureFeatureAction,
    implementFeatureAction,
    reviewPRAction,
    evalPromptAction,
    shipReportAction
  ],
  
  // Register providers (context)
  providers: [
    githubContextProvider,
    sparcPhaseProvider,
    implementationStatusProvider,
    qualityMetricsProvider
  ],
  
  // Register evaluators (quality assessment)
  evaluators: [sparcComplianceEvaluator],
  
  // Plugin configuration schema
  config: {
    // GitHub Integration
    GITHUB_TOKEN: process.env.GITHUB_TOKEN,
    GITHUB_OWNER: process.env.GITHUB_OWNER,
    GITHUB_REPO: process.env.GITHUB_REPO,
    GITHUB_WEBHOOK_SECRET: process.env.GITHUB_WEBHOOK_SECRET,
    
    // SPARC Configuration
    SPARC_DEFAULT_COVERAGE: process.env.SPARC_DEFAULT_COVERAGE || '95',
    SPARC_QUALITY_THRESHOLD: process.env.SPARC_QUALITY_THRESHOLD || '0.9',
    SPARC_MAX_RETRIES: process.env.SPARC_MAX_RETRIES || '3',
    
    // Agent Configuration
    AGENT_MAX_CONCURRENT: process.env.AGENT_MAX_CONCURRENT || '5',
    AGENT_TIMEOUT: process.env.AGENT_TIMEOUT || '300000'
  },

  // Plugin dependencies
  dependencies: ['@elizaos/plugin-bootstrap'],
  
  // Plugin priority (higher loads first)
  priority: 100
};

// Default export for convenience
export default elizaDevPlugin;

/**
 * Plugin validation helper
 */
export function validateElizaDevConfig(): {
  valid: boolean;
  errors: string[];
  warnings: string[];
} {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Check required environment variables
  const required = ['GITHUB_TOKEN', 'GITHUB_OWNER', 'GITHUB_REPO'];
  for (const env of required) {
    if (!process.env[env]) {
      errors.push(`Missing required environment variable: ${env}`);
    }
  }

  // Check optional but recommended
  const recommended = ['GITHUB_WEBHOOK_SECRET'];
  for (const env of recommended) {
    if (!process.env[env]) {
      warnings.push(`Missing recommended environment variable: ${env}`);
    }
  }

  // Validate numeric configurations
  const numericConfigs = [
    { key: 'SPARC_DEFAULT_COVERAGE', min: 50, max: 100 },
    { key: 'SPARC_QUALITY_THRESHOLD', min: 0.5, max: 1.0 },
    { key: 'SPARC_MAX_RETRIES', min: 1, max: 10 }
  ];

  for (const config of numericConfigs) {
    const value = process.env[config.key];
    if (value) {
      const num = parseFloat(value);
      if (isNaN(num) || num < config.min || num > config.max) {
        errors.push(`Invalid ${config.key}: must be between ${config.min} and ${config.max}`);
      }
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings
  };
}

/**
 * Plugin health check
 */
export async function checkElizaDevHealth(runtime: IAgentRuntime): Promise<{
  healthy: boolean;
  services: Record<string, boolean>;
  details: string[];
}> {
  const services: Record<string, boolean> = {};
  const details: string[] = [];

  try {
    // Check GitHub service
    const githubService = runtime.getService('GITHUB_INTEGRATION');
    services.github = !!githubService;
    if (!githubService) {
      details.push('GitHub integration service not available');
    } else {
      details.push('GitHub integration service active');
    }

    // Check SPARC service
    const sparcService = runtime.getService('SPARC_WORKFLOW');
    services.sparc = !!sparcService;
    if (!sparcService) {
      details.push('SPARC workflow service not available');
    } else {
      details.push('SPARC workflow service active');
    }

    const allServicesHealthy = Object.values(services).every(Boolean);
    
    return {
      healthy: allServicesHealthy,
      services,
      details
    };
  } catch (error) {
    return {
      healthy: false,
      services,
      details: [`Health check failed: ${error instanceof Error ? error.message : 'Unknown error'}`]
    };
  }
}