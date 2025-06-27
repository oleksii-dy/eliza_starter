import {
  type IAgentRuntime,
  Service,
  elizaLogger,
} from '@elizaos/core';

/**
 * Environment-based configuration system for the autocoder plugin
 */

export interface AutocoderConfig {
  // E2B Configuration
  e2b: {
    apiKey: string;
    templateId?: string;
    timeout: number;
    maxSandboxes: number;
  };

  // AI/LLM Configuration
  ai: {
    anthropicApiKey?: string;
    openaiApiKey?: string;
    preferredModel: 'claude' | 'openai' | 'local';
    maxTokens: number;
    temperature: number;
  };

  // Blockchain Configuration
  blockchain: {
    ethereum: {
      rpcUrl: string;
      privateKey?: string;
      networkId: number;
      gasLimit: number;
      gasPrice: string;
    };
    solana: {
      rpcUrl: string;
      keypairPath?: string;
      commitment: 'processed' | 'confirmed' | 'finalized';
      cluster: 'devnet' | 'testnet' | 'mainnet';
    };
    base: {
      rpcUrl: string;
      privateKey?: string;
      networkId: number;
    };
    arbitrum: {
      rpcUrl: string;
      privateKey?: string;
      networkId: number;
    };
    polygon: {
      rpcUrl: string;
      privateKey?: string;
      networkId: number;
    };
  };

  // Contract Configuration
  contracts: {
    defaultNetwork: 'sepolia' | 'devnet' | 'testnet';
    enableVerification: boolean;
    optimizationRuns: number;
    compilerVersion: string;
    timeoutMs: number;
  };

  // Plugin Creation Configuration
  pluginCreation: {
    maxConcurrentJobs: number;
    jobTimeoutMs: number;
    maxOutputSize: number;
    rateLimit: {
      windowMs: number;
      maxJobsPerWindow: number;
    };
    defaultModel: string;
    enableTemplatesFallback: boolean;
  };

  // Benchmark Configuration
  benchmarks: {
    enabled: boolean;
    performanceIterations: number;
    timeoutPerScenario: number;
    maxMemoryUsage: number;
    enableSystemMetrics: boolean;
  };

  // Security Configuration
  security: {
    enableSandboxIsolation: boolean;
    allowedFileExtensions: string[];
    maxFileSize: number;
    sanitizeOutput: boolean;
  };

  // Development Configuration
  development: {
    enableDebugLogging: boolean;
    preserveArtifacts: boolean;
    enableMockServices: boolean;
    artifactsPath: string;
  };
}

/**
 * Configuration validation schema
 */
export interface ConfigValidationSchema {
  [key: string]: {
    required: boolean;
    type: 'string' | 'number' | 'boolean' | 'object';
    default?: any;
    validator?: (value: any) => boolean;
    description: string;
    sensitive?: boolean;
  };
}

export class ConfigurationService extends Service {
  static serviceName = 'autocoder-config';
  static serviceType = 'configuration';

  private config: AutocoderConfig | null = null;
  private validationSchema: ConfigValidationSchema;

  get capabilityDescription(): string {
    return 'Manages environment-based configuration for autocoder plugin';
  }

  constructor(runtime: IAgentRuntime) {
    super(runtime);
    this.validationSchema = this.createValidationSchema();
  }

  static async start(runtime: IAgentRuntime): Promise<ConfigurationService> {
    const service = new ConfigurationService(runtime);
    await service.initialize();
    return service;
  }

  async initialize(): Promise<void> {
    try {
      elizaLogger.info('Initializing Configuration Service');
      
      // Load and validate configuration
      this.config = await this.loadConfiguration();
      
      // Validate required configuration
      await this.validateConfiguration(this.config);
      
      elizaLogger.info('Configuration Service initialized successfully', {
        hasE2BKey: !!this.config.e2b.apiKey,
        hasAnthropicKey: !!this.config.ai.anthropicApiKey,
        hasOpenAIKey: !!this.config.ai.openaiApiKey,
        preferredModel: this.config.ai.preferredModel,
        defaultNetwork: this.config.contracts.defaultNetwork,
        benchmarksEnabled: this.config.benchmarks.enabled,
      });
    } catch (error) {
      elizaLogger.error('Failed to initialize Configuration Service', error);
      throw error;
    }
  }

  async stop(): Promise<void> {
    elizaLogger.info('Stopping Configuration Service');
    // Clear sensitive data from memory
    if (this.config) {
      this.config.e2b.apiKey = '';
      this.config.ai.anthropicApiKey = '';
      this.config.ai.openaiApiKey = '';
      // Clear blockchain private keys
      Object.values(this.config.blockchain).forEach((blockchain: any) => {
        if (blockchain.privateKey) {
          blockchain.privateKey = '';
        }
      });
    }
  }

  /**
   * Get the complete configuration
   */
  getConfig(): AutocoderConfig {
    if (!this.config) {
      throw new Error('Configuration not initialized');
    }
    return this.config;
  }

  /**
   * Get configuration for specific service
   */
  getE2BConfig(): AutocoderConfig['e2b'] {
    return this.getConfig().e2b;
  }

  getAIConfig(): AutocoderConfig['ai'] {
    return this.getConfig().ai;
  }

  getBlockchainConfig(blockchain?: string): AutocoderConfig['blockchain'] | any {
    const config = this.getConfig().blockchain;
    if (blockchain) {
      return config[blockchain as keyof typeof config];
    }
    return config;
  }

  getContractsConfig(): AutocoderConfig['contracts'] {
    return this.getConfig().contracts;
  }

  getPluginCreationConfig(): AutocoderConfig['pluginCreation'] {
    return this.getConfig().pluginCreation;
  }

  getBenchmarksConfig(): AutocoderConfig['benchmarks'] {
    return this.getConfig().benchmarks;
  }

  getSecurityConfig(): AutocoderConfig['security'] {
    return this.getConfig().security;
  }

  getDevelopmentConfig(): AutocoderConfig['development'] {
    return this.getConfig().development;
  }

  /**
   * Check if a feature is enabled
   */
  isFeatureEnabled(feature: string): boolean {
    const config = this.getConfig();
    
    switch (feature) {
      case 'benchmarks':
        return config.benchmarks.enabled;
      case 'verification':
        return config.contracts.enableVerification;
      case 'sandbox-isolation':
        return config.security.enableSandboxIsolation;
      case 'debug-logging':
        return config.development.enableDebugLogging;
      case 'mock-services':
        return config.development.enableMockServices;
      case 'templates-fallback':
        return config.pluginCreation.enableTemplatesFallback;
      case 'system-metrics':
        return config.benchmarks.enableSystemMetrics;
      default:
        elizaLogger.warn(`Unknown feature flag: ${feature}`);
        return false;
    }
  }

  /**
   * Get environment-specific defaults
   */
  getEnvironmentDefaults(): Partial<AutocoderConfig> {
    const environment = process.env.NODE_ENV || 'development';
    
    switch (environment) {
      case 'production':
        return {
          contracts: {
            defaultNetwork: 'sepolia',
            enableVerification: true,
            optimizationRuns: 200,
            compilerVersion: 'latest',
            timeoutMs: 300000,
          },
          security: {
            enableSandboxIsolation: true,
            allowedFileExtensions: ['.sol', '.ts', '.js', '.json'],
            maxFileSize: 1024 * 1024, // 1MB
            sanitizeOutput: true,
          },
          development: {
            enableDebugLogging: false,
            preserveArtifacts: false,
            enableMockServices: false,
            artifactsPath: '/tmp/autocoder-artifacts',
          },
        };
      
      case 'test':
        return {
          contracts: {
            defaultNetwork: 'devnet',
            enableVerification: false,
            optimizationRuns: 0,
            compilerVersion: 'latest',
            timeoutMs: 60000,
          },
          security: {
            enableSandboxIsolation: false,
            allowedFileExtensions: ['.sol', '.ts', '.js', '.json', '.test.ts'],
            maxFileSize: 10 * 1024 * 1024, // 10MB
            sanitizeOutput: false,
          },
          development: {
            enableDebugLogging: true,
            preserveArtifacts: true,
            enableMockServices: true,
            artifactsPath: './test-artifacts',
          },
        };
      
      case 'development':
      default:
        return {
          contracts: {
            defaultNetwork: 'sepolia',
            enableVerification: false,
            optimizationRuns: 0,
            compilerVersion: 'latest',
            timeoutMs: 180000,
          },
          security: {
            enableSandboxIsolation: true,
            allowedFileExtensions: ['.sol', '.ts', '.js', '.json', '.md'],
            maxFileSize: 5 * 1024 * 1024, // 5MB
            sanitizeOutput: false,
          },
          development: {
            enableDebugLogging: true,
            preserveArtifacts: true,
            enableMockServices: false,
            artifactsPath: './.autocoder-artifacts',
          },
        };
    }
  }

  /**
   * Load configuration from environment variables and defaults
   */
  private async loadConfiguration(): Promise<AutocoderConfig> {
    const envDefaults = this.getEnvironmentDefaults();
    
    const config: AutocoderConfig = {
      // E2B Configuration
      e2b: {
        apiKey: this.getEnvValue('E2B_API_KEY', '') || '',
        templateId: this.getEnvValue('E2B_TEMPLATE_ID', 'nextjs-developer'),
        timeout: this.getEnvNumber('E2B_TIMEOUT_MS', 300000),
        maxSandboxes: this.getEnvNumber('E2B_MAX_SANDBOXES', 5),
      },

      // AI Configuration
      ai: {
        anthropicApiKey: this.getEnvValue('ANTHROPIC_API_KEY', ''),
        openaiApiKey: this.getEnvValue('OPENAI_API_KEY', ''),
        preferredModel: this.getEnvValue('AUTOCODER_PREFERRED_MODEL', 'claude') as any,
        maxTokens: this.getEnvNumber('AUTOCODER_MAX_TOKENS', 8000),
        temperature: this.getEnvNumber('AUTOCODER_TEMPERATURE', 0.3),
      },

      // Blockchain Configuration
      blockchain: {
        ethereum: {
          rpcUrl: this.getEnvValue('ETHEREUM_RPC_URL', 'https://rpc.sepolia.org'),
          privateKey: this.getEnvValue('ETHEREUM_PRIVATE_KEY', ''),
          networkId: this.getEnvNumber('ETHEREUM_NETWORK_ID', 11155111), // Sepolia
          gasLimit: this.getEnvNumber('ETHEREUM_GAS_LIMIT', 8000000),
          gasPrice: this.getEnvValue('ETHEREUM_GAS_PRICE', '20000000000'), // 20 gwei
        },
        solana: {
          rpcUrl: this.getEnvValue('SOLANA_RPC_URL', 'https://api.devnet.solana.com'),
          keypairPath: this.getEnvValue('SOLANA_KEYPAIR_PATH', ''),
          commitment: this.getEnvValue('SOLANA_COMMITMENT', 'confirmed') as any,
          cluster: this.getEnvValue('SOLANA_CLUSTER', 'devnet') as any,
        },
        base: {
          rpcUrl: this.getEnvValue('BASE_RPC_URL', 'https://sepolia.base.org'),
          privateKey: this.getEnvValue('BASE_PRIVATE_KEY', ''),
          networkId: this.getEnvNumber('BASE_NETWORK_ID', 84532), // Base Sepolia
        },
        arbitrum: {
          rpcUrl: this.getEnvValue('ARBITRUM_RPC_URL', 'https://sepolia-rollup.arbitrum.io/rpc'),
          privateKey: this.getEnvValue('ARBITRUM_PRIVATE_KEY', ''),
          networkId: this.getEnvNumber('ARBITRUM_NETWORK_ID', 421614), // Arbitrum Sepolia
        },
        polygon: {
          rpcUrl: this.getEnvValue('POLYGON_RPC_URL', 'https://rpc-amoy.polygon.technology'),
          privateKey: this.getEnvValue('POLYGON_PRIVATE_KEY', ''),
          networkId: this.getEnvNumber('POLYGON_NETWORK_ID', 80002), // Polygon Amoy
        },
      },

      // Merge environment-specific defaults
      contracts: {
        defaultNetwork: this.getEnvValue('AUTOCODER_DEFAULT_NETWORK', envDefaults.contracts?.defaultNetwork || 'sepolia') as any,
        enableVerification: this.getEnvBoolean('AUTOCODER_ENABLE_VERIFICATION', envDefaults.contracts?.enableVerification || false),
        optimizationRuns: this.getEnvNumber('AUTOCODER_OPTIMIZATION_RUNS', envDefaults.contracts?.optimizationRuns || 200),
        compilerVersion: this.getEnvValue('AUTOCODER_COMPILER_VERSION', envDefaults.contracts?.compilerVersion || 'latest'),
        timeoutMs: this.getEnvNumber('AUTOCODER_CONTRACT_TIMEOUT_MS', envDefaults.contracts?.timeoutMs || 300000),
      },

      // Plugin Creation Configuration
      pluginCreation: {
        maxConcurrentJobs: this.getEnvNumber('AUTOCODER_MAX_CONCURRENT_JOBS', 5),
        jobTimeoutMs: this.getEnvNumber('AUTOCODER_JOB_TIMEOUT_MS', 30 * 60 * 1000),
        maxOutputSize: this.getEnvNumber('AUTOCODER_MAX_OUTPUT_SIZE', 1024 * 1024),
        rateLimit: {
          windowMs: this.getEnvNumber('AUTOCODER_RATE_LIMIT_WINDOW_MS', 60 * 60 * 1000),
          maxJobsPerWindow: this.getEnvNumber('AUTOCODER_MAX_JOBS_PER_WINDOW', 10),
        },
        defaultModel: this.getEnvValue('AUTOCODER_PLUGIN_MODEL', 'claude-3-5-sonnet-20241022'),
        enableTemplatesFallback: this.getEnvBoolean('AUTOCODER_ENABLE_TEMPLATES_FALLBACK', true),
      },

      // Benchmark Configuration
      benchmarks: {
        enabled: this.getEnvBoolean('AUTOCODER_BENCHMARKS_ENABLED', true),
        performanceIterations: this.getEnvNumber('AUTOCODER_BENCHMARK_ITERATIONS', 5),
        timeoutPerScenario: this.getEnvNumber('AUTOCODER_BENCHMARK_TIMEOUT', 10 * 60 * 1000),
        maxMemoryUsage: this.getEnvNumber('AUTOCODER_BENCHMARK_MAX_MEMORY', 2 * 1024 * 1024 * 1024), // 2GB
        enableSystemMetrics: this.getEnvBoolean('AUTOCODER_ENABLE_SYSTEM_METRICS', true),
      },

      // Security Configuration
      security: {
        enableSandboxIsolation: this.getEnvBoolean('AUTOCODER_ENABLE_SANDBOX_ISOLATION', envDefaults.security?.enableSandboxIsolation || true),
        allowedFileExtensions: this.getEnvArray('AUTOCODER_ALLOWED_FILE_EXTENSIONS', envDefaults.security?.allowedFileExtensions || ['.sol', '.ts', '.js', '.json']),
        maxFileSize: this.getEnvNumber('AUTOCODER_MAX_FILE_SIZE', envDefaults.security?.maxFileSize || 1024 * 1024),
        sanitizeOutput: this.getEnvBoolean('AUTOCODER_SANITIZE_OUTPUT', envDefaults.security?.sanitizeOutput || true),
      },

      // Development Configuration
      development: {
        enableDebugLogging: this.getEnvBoolean('AUTOCODER_DEBUG_LOGGING', envDefaults.development?.enableDebugLogging || false),
        preserveArtifacts: this.getEnvBoolean('AUTOCODER_PRESERVE_ARTIFACTS', envDefaults.development?.preserveArtifacts || false),
        enableMockServices: this.getEnvBoolean('AUTOCODER_ENABLE_MOCK_SERVICES', envDefaults.development?.enableMockServices || false),
        artifactsPath: this.getEnvValue('AUTOCODER_ARTIFACTS_PATH', envDefaults.development?.artifactsPath || './autocoder-artifacts'),
      },
    };

    return config;
  }

  /**
   * Validate the loaded configuration
   */
  private async validateConfiguration(config: AutocoderConfig): Promise<void> {
    const errors: string[] = [];

    // Validate E2B API key
    if (!config.e2b.apiKey) {
      errors.push('E2B_API_KEY is required for sandbox functionality');
    }

    // Validate AI configuration
    if (!config.ai.anthropicApiKey && !config.ai.openaiApiKey) {
      elizaLogger.warn('No AI API keys configured - plugin creation will use templates only');
    }

    // Validate blockchain configuration if private keys are provided
    Object.entries(config.blockchain).forEach(([blockchain, blockchainConfig]: [string, any]) => {
      if (blockchainConfig.privateKey && !this.isValidPrivateKey(blockchainConfig.privateKey, blockchain)) {
        errors.push(`Invalid private key format for ${blockchain}`);
      }
      
      if (!blockchainConfig.rpcUrl) {
        errors.push(`RPC URL is required for ${blockchain}`);
      }
    });

    // Validate file size limits
    if (config.security.maxFileSize > 100 * 1024 * 1024) { // 100MB
      elizaLogger.warn('Maximum file size is very large - consider reducing for security');
    }

    // Validate timeout values
    if (config.contracts.timeoutMs < 60000) { // 1 minute
      elizaLogger.warn('Contract timeout is very short - consider increasing');
    }

    if (errors.length > 0) {
      throw new Error(`Configuration validation failed:\n${errors.join('\n')}`);
    }

    elizaLogger.info('Configuration validation passed');
  }

  /**
   * Create validation schema for configuration
   */
  private createValidationSchema(): ConfigValidationSchema {
    return {
      'e2b.apiKey': {
        required: true,
        type: 'string',
        description: 'E2B API key for sandbox functionality',
        sensitive: true,
      },
      'ai.anthropicApiKey': {
        required: false,
        type: 'string',
        description: 'Anthropic API key for Claude models',
        sensitive: true,
      },
      'ai.openaiApiKey': {
        required: false,
        type: 'string',
        description: 'OpenAI API key for GPT models',
        sensitive: true,
      },
      'contracts.defaultNetwork': {
        required: true,
        type: 'string',
        default: 'sepolia',
        description: 'Default blockchain network for contract deployment',
        validator: (value: string) => ['sepolia', 'devnet', 'testnet', 'mainnet'].includes(value),
      },
      'benchmarks.enabled': {
        required: false,
        type: 'boolean',
        default: true,
        description: 'Enable or disable benchmark functionality',
      },
    };
  }

  /**
   * Helper methods for environment variable parsing
   */
  private getEnvValue(key: string, defaultValue: string): string {
    return this.runtime.getSetting(key) || process.env[key] || defaultValue;
  }

  private getEnvNumber(key: string, defaultValue: number): number {
    const value = this.getEnvValue(key, '');
    const parsed = parseInt(value, 10);
    return isNaN(parsed) ? defaultValue : parsed;
  }

  private getEnvBoolean(key: string, defaultValue: boolean): boolean {
    const value = this.getEnvValue(key, '').toLowerCase();
    if (value === 'true' || value === '1') return true;
    if (value === 'false' || value === '0') return false;
    return defaultValue;
  }

  private getEnvArray(key: string, defaultValue: string[]): string[] {
    const value = this.getEnvValue(key, '');
    if (!value) return defaultValue;
    return value.split(',').map(s => s.trim()).filter(s => s.length > 0);
  }

  /**
   * Validate private key format for different blockchains
   */
  private isValidPrivateKey(privateKey: string, blockchain: string): boolean {
    if (!privateKey) return false;
    
    switch (blockchain) {
      case 'ethereum':
      case 'base':
      case 'arbitrum':
      case 'polygon':
        // EVM private key validation (64 hex characters)
        return /^(0x)?[a-fA-F0-9]{64}$/.test(privateKey);
      
      case 'solana':
        // Solana private key validation (base58 or base64)
        return privateKey.length >= 32 && privateKey.length <= 128;
      
      default:
        return false;
    }
  }

  /**
   * Get configuration summary for logging (without sensitive data)
   */
  getConfigSummary(): Record<string, any> {
    const config = this.getConfig();
    
    return {
      environment: process.env.NODE_ENV || 'development',
      e2b: {
        hasApiKey: !!config.e2b.apiKey,
        templateId: config.e2b.templateId,
        timeout: config.e2b.timeout,
        maxSandboxes: config.e2b.maxSandboxes,
      },
      ai: {
        hasAnthropicKey: !!config.ai.anthropicApiKey,
        hasOpenAIKey: !!config.ai.openaiApiKey,
        preferredModel: config.ai.preferredModel,
        maxTokens: config.ai.maxTokens,
        temperature: config.ai.temperature,
      },
      contracts: config.contracts,
      benchmarks: config.benchmarks,
      security: {
        ...config.security,
        enableSandboxIsolation: config.security.enableSandboxIsolation,
      },
      development: config.development,
    };
  }
}