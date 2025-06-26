import type { IAgentRuntime } from '@elizaos/core';

/**
 * Centralized configuration management for E2B plugin
 * Replaces hard-coded values with environment-aware configuration
 */

export interface E2BSecurityConfig {
  maxCodeSize: number;
  maxExecutionTime: number;
  maxConcurrentExecutions: number;
  allowedLanguages: string[];
  rateLimitPerMinute: number;
  sandboxTimeoutMs: number;
}

export interface E2BResourceConfig {
  sandboxPoolSize: number;
  maxActiveSandboxes: number;
  idleSandboxTimeout: number;
  cleanupIntervalMs: number;
  memoryLimitMB: number;
  cpuLimitPercent: number;
}

export interface E2BIntegrationConfig {
  enableMemoryFormation: boolean;
  enableEventEmission: boolean;
  enableErrorPropagation: boolean;
  enableMetricsCollection: boolean;
  embeddingEnabled: boolean;
}

export interface E2BConfig {
  apiKey?: string;
  baseUrl?: string;
  environment: 'development' | 'production' | 'test';
  security: E2BSecurityConfig;
  resources: E2BResourceConfig;
  integration: E2BIntegrationConfig;
}

/**
 * Default configuration values based on environment
 */
const DEFAULT_CONFIG: Record<string, Partial<E2BConfig>> = {
  development: {
    environment: 'development',
    security: {
      maxCodeSize: 10000, // 10KB
      maxExecutionTime: 30000, // 30 seconds
      maxConcurrentExecutions: 3,
      allowedLanguages: ['python', 'javascript', 'typescript', 'bash'],
      rateLimitPerMinute: 30,
      sandboxTimeoutMs: 60000
    },
    resources: {
      sandboxPoolSize: 2,
      maxActiveSandboxes: 5,
      idleSandboxTimeout: 300000, // 5 minutes
      cleanupIntervalMs: 60000, // 1 minute
      memoryLimitMB: 512,
      cpuLimitPercent: 50
    },
    integration: {
      enableMemoryFormation: true,
      enableEventEmission: true,
      enableErrorPropagation: true,
      enableMetricsCollection: false,
      embeddingEnabled: true
    }
  },

  production: {
    environment: 'production',
    security: {
      maxCodeSize: 50000, // 50KB
      maxExecutionTime: 60000, // 1 minute
      maxConcurrentExecutions: 10,
      allowedLanguages: ['python', 'javascript'],
      rateLimitPerMinute: 60,
      sandboxTimeoutMs: 120000
    },
    resources: {
      sandboxPoolSize: 5,
      maxActiveSandboxes: 20,
      idleSandboxTimeout: 600000, // 10 minutes
      cleanupIntervalMs: 30000, // 30 seconds
      memoryLimitMB: 1024,
      cpuLimitPercent: 80
    },
    integration: {
      enableMemoryFormation: true,
      enableEventEmission: true,
      enableErrorPropagation: true,
      enableMetricsCollection: true,
      embeddingEnabled: true
    }
  },

  test: {
    environment: 'test',
    security: {
      maxCodeSize: 1000, // 1KB
      maxExecutionTime: 10000, // 10 seconds
      maxConcurrentExecutions: 2,
      allowedLanguages: ['python'],
      rateLimitPerMinute: 10,
      sandboxTimeoutMs: 15000
    },
    resources: {
      sandboxPoolSize: 1,
      maxActiveSandboxes: 2,
      idleSandboxTimeout: 60000, // 1 minute
      cleanupIntervalMs: 10000, // 10 seconds
      memoryLimitMB: 256,
      cpuLimitPercent: 25
    },
    integration: {
      enableMemoryFormation: false,
      enableEventEmission: false,
      enableErrorPropagation: true,
      enableMetricsCollection: false,
      embeddingEnabled: false
    }
  }
};

/**
 * Load E2B configuration from runtime and environment
 */
export function loadE2BConfig(runtime?: IAgentRuntime): E2BConfig {
  // Determine environment
  const nodeEnv = process.env.NODE_ENV || 'development';
  const environment = (nodeEnv === 'production' || nodeEnv === 'test') ? nodeEnv : 'development';

  // Get base configuration for environment
  const baseConfig = DEFAULT_CONFIG[environment] as E2BConfig;

  // Override with runtime settings if available
  const config: E2BConfig = {
    ...baseConfig,
    apiKey: runtime?.getSetting('E2B_API_KEY') || process.env.E2B_API_KEY,
    baseUrl: runtime?.getSetting('E2B_BASE_URL') || process.env.E2B_BASE_URL,

    security: {
      ...baseConfig.security,
      maxCodeSize: getNumberSetting(runtime, 'E2B_MAX_CODE_SIZE', baseConfig.security.maxCodeSize),
      maxExecutionTime: getNumberSetting(runtime, 'E2B_MAX_EXECUTION_TIME', baseConfig.security.maxExecutionTime),
      maxConcurrentExecutions: getNumberSetting(runtime, 'E2B_MAX_CONCURRENT_EXECUTIONS', baseConfig.security.maxConcurrentExecutions),
      rateLimitPerMinute: getNumberSetting(runtime, 'E2B_RATE_LIMIT_PER_MINUTE', baseConfig.security.rateLimitPerMinute),
      sandboxTimeoutMs: getNumberSetting(runtime, 'E2B_SANDBOX_TIMEOUT', baseConfig.security.sandboxTimeoutMs),
      allowedLanguages: getArraySetting(runtime, 'E2B_ALLOWED_LANGUAGES', baseConfig.security.allowedLanguages)
    },

    resources: {
      ...baseConfig.resources,
      sandboxPoolSize: getNumberSetting(runtime, 'E2B_SANDBOX_POOL_SIZE', baseConfig.resources.sandboxPoolSize),
      maxActiveSandboxes: getNumberSetting(runtime, 'E2B_MAX_ACTIVE_SANDBOXES', baseConfig.resources.maxActiveSandboxes),
      idleSandboxTimeout: getNumberSetting(runtime, 'E2B_IDLE_SANDBOX_TIMEOUT', baseConfig.resources.idleSandboxTimeout),
      cleanupIntervalMs: getNumberSetting(runtime, 'E2B_CLEANUP_INTERVAL', baseConfig.resources.cleanupIntervalMs),
      memoryLimitMB: getNumberSetting(runtime, 'E2B_MEMORY_LIMIT_MB', baseConfig.resources.memoryLimitMB),
      cpuLimitPercent: getNumberSetting(runtime, 'E2B_CPU_LIMIT_PERCENT', baseConfig.resources.cpuLimitPercent)
    },

    integration: {
      ...baseConfig.integration,
      enableMemoryFormation: getBooleanSetting(runtime, 'E2B_ENABLE_MEMORY_FORMATION', baseConfig.integration.enableMemoryFormation),
      enableEventEmission: getBooleanSetting(runtime, 'E2B_ENABLE_EVENT_EMISSION', baseConfig.integration.enableEventEmission),
      enableErrorPropagation: getBooleanSetting(runtime, 'E2B_ENABLE_ERROR_PROPAGATION', baseConfig.integration.enableErrorPropagation),
      enableMetricsCollection: getBooleanSetting(runtime, 'E2B_ENABLE_METRICS', baseConfig.integration.enableMetricsCollection),
      embeddingEnabled: getBooleanSetting(runtime, 'E2B_ENABLE_EMBEDDINGS', baseConfig.integration.embeddingEnabled)
    }
  };

  // Validation
  validateConfig(config);

  return config;
}

/**
 * Validate configuration values
 */
function validateConfig(config: E2BConfig): void {
  // Security validation
  if (config.security.maxCodeSize <= 0) {
    throw new Error('E2B_MAX_CODE_SIZE must be positive');
  }
  if (config.security.maxExecutionTime <= 0) {
    throw new Error('E2B_MAX_EXECUTION_TIME must be positive');
  }
  if (config.security.maxConcurrentExecutions <= 0) {
    throw new Error('E2B_MAX_CONCURRENT_EXECUTIONS must be positive');
  }

  // Resource validation
  if (config.resources.sandboxPoolSize <= 0) {
    throw new Error('E2B_SANDBOX_POOL_SIZE must be positive');
  }
  if (config.resources.maxActiveSandboxes < config.resources.sandboxPoolSize) {
    throw new Error('E2B_MAX_ACTIVE_SANDBOXES must be >= E2B_SANDBOX_POOL_SIZE');
  }

  // Environment-specific validation
  if (config.environment === 'production' && !config.apiKey) {
    throw new Error('E2B_API_KEY is required in production environment');
  }
}

/**
 * Helper functions for setting retrieval
 */
function getNumberSetting(runtime: IAgentRuntime | undefined, key: string, defaultValue: number): number {
  const value = runtime?.getSetting(key) || process.env[key];
  if (value === null || value === undefined) {return defaultValue;}

  const parsed = parseInt(value.toString(), 10);
  return isNaN(parsed) ? defaultValue : parsed;
}

function getBooleanSetting(runtime: IAgentRuntime | undefined, key: string, defaultValue: boolean): boolean {
  const value = runtime?.getSetting(key) || process.env[key];
  if (value === null || value === undefined) {return defaultValue;}

  const str = value.toString().toLowerCase();
  return str === 'true' || str === '1' || str === 'yes';
}

function getArraySetting(runtime: IAgentRuntime | undefined, key: string, defaultValue: string[]): string[] {
  const value = runtime?.getSetting(key) || process.env[key];
  if (value === null || value === undefined) {return defaultValue;}

  if (typeof value === 'string') {
    return value.split(',').map(s => s.trim()).filter(s => s.length > 0);
  }

  return Array.isArray(value) ? value : defaultValue;
}

/**
 * Get configuration summary for logging (without sensitive data)
 */
export function getConfigSummary(config: E2BConfig): Record<string, any> {
  return {
    environment: config.environment,
    hasApiKey: !!config.apiKey,
    security: {
      maxCodeSize: config.security.maxCodeSize,
      maxExecutionTime: config.security.maxExecutionTime,
      allowedLanguages: config.security.allowedLanguages.length
    },
    resources: {
      sandboxPoolSize: config.resources.sandboxPoolSize,
      maxActiveSandboxes: config.resources.maxActiveSandboxes
    },
    integration: config.integration
  };
}
