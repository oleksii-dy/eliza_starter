import { z } from 'zod';
import * as fs from 'fs/promises';
import * as path from 'path';
import { elizaLogger } from '@elizaos/core';

// Configuration schema with validation
const PluginManagerConfigSchema = z.object({
  // Installation settings
  installation: z.object({
    maxConcurrentInstalls: z.number().min(1).max(10).default(3),
    installTimeout: z.number().min(60000).max(600000).default(300000), // 5 minutes
    retryAttempts: z.number().min(0).max(5).default(3),
    tempDirectory: z.string().default('.plugin-temp'),
  }),

  // Registry settings
  registry: z.object({
    npmRegistry: z.string().url().default('https://registry.npmjs.org'),
    searchCacheTTL: z.number().min(60000).default(300000), // 5 minutes
    metadataCacheTTL: z.number().min(300000).default(3600000), // 1 hour
    maxCacheSize: z.number().min(100).max(10000).default(1000),
    allowedRegistries: z.array(z.string()).default(['npm']),
  }),

  // Security settings
  security: z.object({
    allowUnscopedPackages: z.boolean().default(true),
    trustedScopes: z.array(z.string()).default(['@elizaos']),
    sandboxExecution: z.boolean().default(false),
    maxMemoryMB: z.number().min(128).max(4096).default(512),
    maxCpuPercent: z.number().min(10).max(100).default(50),
  }),

  // Performance settings
  performance: z.object({
    enableMetrics: z.boolean().default(true),
    metricsRetentionDays: z.number().min(1).max(30).default(7),
    slowOperationThresholdMs: z.number().min(100).default(1000),
  }),

  // Rate limiting
  rateLimiting: z.object({
    npmSearchLimit: z.number().min(10).max(100).default(30),
    npmMetadataLimit: z.number().min(10).max(200).default(60),
    githubApiLimit: z.number().min(10).max(100).default(60),
    windowMs: z.number().min(60000).default(60000), // 1 minute
  }),

  // Circuit breaker settings
  circuitBreaker: z.object({
    enabled: z.boolean().default(true),
    failureThreshold: z.number().min(3).max(10).default(5),
    resetTimeoutMs: z.number().min(30000).default(60000),
    halfOpenMaxAttempts: z.number().min(1).max(5).default(3),
  }),

  // Logging settings
  logging: z.object({
    level: z.enum(['debug', 'info', 'warn', 'error']).default('info'),
    correlationIdEnabled: z.boolean().default(true),
    auditLogEnabled: z.boolean().default(true),
    auditLogPath: z.string().default('./logs/plugin-manager-audit.log'),
  }),
});

export type PluginManagerConfig = z.infer<typeof PluginManagerConfigSchema>;

export class ConfigurationManager {
  private static instance: ConfigurationManager;
  private config: PluginManagerConfig;
  private configPath: string;
  private watcherInterval?: NodeJS.Timeout;

  private constructor() {
    this.configPath = path.join(process.cwd(), 'plugin-manager.config.json');
    this.config = this.loadDefaultConfig();
  }

  static getInstance(): ConfigurationManager {
    if (!ConfigurationManager.instance) {
      ConfigurationManager.instance = new ConfigurationManager();
    }
    return ConfigurationManager.instance;
  }

  async initialize(): Promise<void> {
    try {
      // Try to load config from file
      await this.loadFromFile();

      // Start watching for changes
      this.startWatcher();

      elizaLogger.info('[ConfigurationManager] Initialized with custom configuration');
    } catch (_error) {
      elizaLogger.warn('[ConfigurationManager] Using default configuration', _error);
    }
  }

  async loadFromFile(): Promise<void> {
    try {
      const content = await fs.readFile(this.configPath, 'utf-8');
      const rawConfig = JSON.parse(content);

      // Validate and merge with defaults
      this.config = PluginManagerConfigSchema.parse(rawConfig);
    } catch (_error) {
      if ((_error as any).code !== 'ENOENT') {
        throw _error;
      }
    }
  }

  async saveToFile(): Promise<void> {
    const dir = path.dirname(this.configPath);
    await fs.mkdir(dir, { recursive: true });

    await fs.writeFile(this.configPath, JSON.stringify(this.config, null, 2), 'utf-8');
  }

  get(): PluginManagerConfig {
    return { ...this.config };
  }

  async update(updates: Partial<PluginManagerConfig>): Promise<void> {
    // Deep merge updates
    this.config = PluginManagerConfigSchema.parse({
      ...this.config,
      ...updates,
    });

    await this.saveToFile();
    elizaLogger.info('[ConfigurationManager] Configuration updated');
  }

  getInstallation(): PluginManagerConfig['installation'] {
    return { ...this.config.installation };
  }

  getRegistry(): PluginManagerConfig['registry'] {
    return { ...this.config.registry };
  }

  getSecurity(): PluginManagerConfig['security'] {
    return { ...this.config.security };
  }

  getPerformance(): PluginManagerConfig['performance'] {
    return { ...this.config.performance };
  }

  getRateLimiting(): PluginManagerConfig['rateLimiting'] {
    return { ...this.config.rateLimiting };
  }

  getCircuitBreaker(): PluginManagerConfig['circuitBreaker'] {
    return { ...this.config.circuitBreaker };
  }

  getLogging(): PluginManagerConfig['logging'] {
    return { ...this.config.logging };
  }

  async validate(config: any): Promise<{ valid: boolean; errors?: string[] }> {
    try {
      PluginManagerConfigSchema.parse(config);
      return { valid: true };
    } catch (_error) {
      if (_error instanceof z.ZodError) {
        return {
          valid: false,
          errors: _error.errors.map((e) => `${e.path.join('.')}: ${e.message}`),
        };
      }
      return { valid: false, errors: [String(_error)] };
    }
  }

  private loadDefaultConfig(): PluginManagerConfig {
    return PluginManagerConfigSchema.parse({});
  }

  private startWatcher(): void {
    // Watch for config file changes every 30 seconds
    this.watcherInterval = setInterval(async () => {
      try {
        const stats = await fs.stat(this.configPath);
        const content = await fs.readFile(this.configPath, 'utf-8');
        const newConfig = JSON.parse(content);

        // Check if config has changed
        if (JSON.stringify(newConfig) !== JSON.stringify(this.config)) {
          this.config = PluginManagerConfigSchema.parse(newConfig);
          elizaLogger.info('[ConfigurationManager] Configuration reloaded from file');
        }
      } catch (_error) {
        // Ignore errors - file might not exist
      }
    }, 30000);
  }

  stop(): void {
    if (this.watcherInterval) {
      clearInterval(this.watcherInterval);
      this.watcherInterval = undefined;
    }
  }

  // Environment variable overrides
  loadFromEnvironment(): void {
    const env = process.env;
    const overrides: any = {};

    // Map environment variables to config paths
    const envMappings = {
      PLUGIN_MANAGER_MAX_INSTALLS: 'installation.maxConcurrentInstalls',
      PLUGIN_MANAGER_INSTALL_TIMEOUT: 'installation.installTimeout',
      PLUGIN_MANAGER_NPM_REGISTRY: 'registry.npmRegistry',
      PLUGIN_MANAGER_SANDBOX: 'security.sandboxExecution',
      PLUGIN_MANAGER_LOG_LEVEL: 'logging.level',
    };

    for (const [envVar, configPath] of Object.entries(envMappings)) {
      if (env[envVar]) {
        const pathParts = configPath.split('.');
        let current = overrides;

        for (let i = 0; i < pathParts.length - 1; i++) {
          if (!current[pathParts[i]]) {
            current[pathParts[i]] = {};
          }
          current = current[pathParts[i]];
        }

        const lastPart = pathParts[pathParts.length - 1];
        const value = env[envVar];

        // Convert to appropriate type
        if (value === 'true') {
          current[lastPart] = true;
        } else if (value === 'false') {
          current[lastPart] = false;
        } else if (!isNaN(Number(value))) {
          current[lastPart] = Number(value);
        } else {
          current[lastPart] = value;
        }
      }
    }

    if (Object.keys(overrides).length > 0) {
      this.config = PluginManagerConfigSchema.parse({
        ...this.config,
        ...overrides,
      });
      elizaLogger.info('[ConfigurationManager] Applied environment variable overrides');
    }
  }
}
