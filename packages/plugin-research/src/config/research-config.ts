import { IAgentRuntime, logger } from '@elizaos/core';
import { ResearchConfig, ResearchDepth, ResearchDomain } from '../types';

/**
 * Loads and validates research configuration from runtime settings
 */
export function loadResearchConfig(runtime: IAgentRuntime): ResearchConfig {
  logger.info('[ResearchConfig] Loading configuration from runtime settings');

  // Validate required AI model access
  if (!runtime.useModel) {
    throw new Error('[ResearchConfig] AI model access is required for research operations. Ensure the runtime is properly initialized with AI model access.');
  }

  const config: ResearchConfig = {
    maxSearchResults: parseInt(runtime.getSetting('RESEARCH_MAX_RESULTS') || '50'),
    maxDepth: parseInt(runtime.getSetting('RESEARCH_MAX_DEPTH') || '5'),
    timeout: parseInt(runtime.getSetting('RESEARCH_TIMEOUT') || '600000'), // 10 minutes
    enableCitations: runtime.getSetting('RESEARCH_ENABLE_CITATIONS') !== 'false',
    enableImages: runtime.getSetting('RESEARCH_ENABLE_IMAGES') === 'true',
    searchProviders: (runtime.getSetting('RESEARCH_SEARCH_PROVIDERS') || 'web,academic').split(',').map((s: string) => s.trim()),
    language: runtime.getSetting('RESEARCH_LANGUAGE') || 'en',
    researchDepth: parseResearchDepth(runtime.getSetting('RESEARCH_DEPTH') || 'deep'),
    domain: parseResearchDomain(runtime.getSetting('RESEARCH_DOMAIN') || 'general'),
    evaluationEnabled: runtime.getSetting('RESEARCH_EVALUATION_ENABLED') !== 'false',
    cacheEnabled: runtime.getSetting('RESEARCH_CACHE_ENABLED') !== 'false',
    parallelSearches: parseInt(runtime.getSetting('RESEARCH_PARALLEL_SEARCHES') || '10'),
    retryAttempts: parseInt(runtime.getSetting('RESEARCH_RETRY_ATTEMPTS') || '3'),
    qualityThreshold: parseFloat(runtime.getSetting('RESEARCH_QUALITY_THRESHOLD') || '0.7'),
  };

  // Validate configuration
  validateResearchConfig(config);

  logger.info('[ResearchConfig] Configuration loaded:', {
    maxSearchResults: config.maxSearchResults,
    researchDepth: config.researchDepth,
    domain: config.domain,
    searchProviders: config.searchProviders,
    evaluationEnabled: config.evaluationEnabled
  });

  return config;
}

function parseResearchDepth(value: string): ResearchDepth {
  const normalized = value.toLowerCase().trim();
  switch (normalized) {
    case 'surface':
      return ResearchDepth.SURFACE;
    case 'moderate':
      return ResearchDepth.MODERATE;
    case 'deep':
      return ResearchDepth.DEEP;
    case 'phd':
    case 'phd_level':
      return ResearchDepth.PHD_LEVEL;
    default:
      logger.warn(`[ResearchConfig] Unknown research depth: ${value}, defaulting to DEEP`);
      return ResearchDepth.DEEP;
  }
}

function parseResearchDomain(value: string): ResearchDomain {
  const normalized = value.toLowerCase().replace(/[^a-z]/g, '_');

  // Try to match to enum values
  for (const [key, enumValue] of Object.entries(ResearchDomain)) {
    if (key.toLowerCase() === normalized || enumValue.toLowerCase() === normalized) {
      return enumValue as ResearchDomain;
    }
  }

  logger.warn(`[ResearchConfig] Unknown research domain: ${value}, defaulting to GENERAL`);
  return ResearchDomain.GENERAL;
}

function validateResearchConfig(config: ResearchConfig): void {
  const errors: string[] = [];

  if (config.maxSearchResults < 1 || config.maxSearchResults > 200) {
    errors.push('maxSearchResults must be between 1 and 200');
  }

  if (config.maxDepth < 1 || config.maxDepth > 10) {
    errors.push('maxDepth must be between 1 and 10');
  }

  if (config.timeout < 30000 || config.timeout > 1800000) { // 30 seconds to 30 minutes
    errors.push('timeout must be between 30000ms (30 seconds) and 1800000ms (30 minutes)');
  }

  if (config.parallelSearches < 1 || config.parallelSearches > 50) {
    errors.push('parallelSearches must be between 1 and 50');
  }

  if (config.retryAttempts < 0 || config.retryAttempts > 10) {
    errors.push('retryAttempts must be between 0 and 10');
  }

  if (config.qualityThreshold < 0 || config.qualityThreshold > 1) {
    errors.push('qualityThreshold must be between 0 and 1');
  }

  if (!config.searchProviders || config.searchProviders.length === 0) {
    errors.push('At least one search provider must be configured');
  }

  if (errors.length > 0) {
    throw new Error(`[ResearchConfig] Invalid configuration: ${errors.join(', ')}`);
  }
}

/**
 * Validates that required environment variables are available for configured search providers
 */
export function validateSearchProviderConfig(config: ResearchConfig, runtime: IAgentRuntime): void {
  logger.info('[ResearchConfig] Validating search provider configuration');

  const missingKeys: string[] = [];

  for (const provider of config.searchProviders) {
    switch (provider.toLowerCase()) {
      case 'tavily':
        if (!runtime.getSetting('TAVILY_API_KEY')) {
          missingKeys.push('TAVILY_API_KEY');
        }
        break;
      case 'serper':
        if (!runtime.getSetting('SERPER_API_KEY')) {
          missingKeys.push('SERPER_API_KEY');
        }
        break;
      case 'exa':
        if (!runtime.getSetting('EXA_API_KEY')) {
          missingKeys.push('EXA_API_KEY');
        }
        break;
      case 'serpapi':
        if (!runtime.getSetting('SERPAPI_API_KEY')) {
          missingKeys.push('SERPAPI_API_KEY');
        }
        break;
      case 'web':
        // Check if at least one web search provider is available
        const webProviders = ['TAVILY_API_KEY', 'SERPER_API_KEY', 'EXA_API_KEY', 'SERPAPI_API_KEY'];
        const hasWebProvider = webProviders.some(key => runtime.getSetting(key));
        if (!hasWebProvider) {
          missingKeys.push(`At least one of: ${webProviders.join(', ')}`);
        }
        break;
      case 'academic':
        // Academic search doesn't require API keys (uses public APIs)
        break;
      case 'github':
        // GitHub search requires the GitHub plugin to be loaded
        break;
      case 'npm':
      case 'pypi':
        // These don't require API keys
        break;
      default:
        logger.warn(`[ResearchConfig] Unknown search provider: ${provider}`);
    }
  }

  if (missingKeys.length > 0) {
    throw new Error(`[ResearchConfig] Missing required API keys for configured search providers: ${missingKeys.join(', ')}`);
  }

  logger.info('[ResearchConfig] All search provider requirements validated');
}

/**
 * Get configuration summary for logging and debugging
 */
export function getConfigSummary(config: ResearchConfig): string {
  return `Research Configuration:
- Max Results: ${config.maxSearchResults}
- Max Depth: ${config.maxDepth}
- Timeout: ${config.timeout}ms
- Research Depth: ${config.researchDepth}
- Domain: ${config.domain}
- Search Providers: ${config.searchProviders.join(', ')}
- Evaluation: ${config.evaluationEnabled ? 'enabled' : 'disabled'}
- Cache: ${config.cacheEnabled ? 'enabled' : 'disabled'}
- Quality Threshold: ${config.qualityThreshold}`;
}
