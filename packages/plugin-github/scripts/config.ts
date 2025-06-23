import * as dotenv from 'dotenv';
import * as fs from 'fs';
import * as path from 'path';
import { z } from 'zod';

// Load environment variables
dotenv.config();

// Configuration schema
const ConfigSchema = z.object({
  github: z.object({
    token: z.string().min(1).optional(),
    rateLimit: z.object({
      maxRequests: z.number().default(100),
      windowMs: z.number().default(60000),
      retryAfterMs: z.number().default(5000),
    }),
  }),
  ai: z.object({
    provider: z.enum(['openai', 'anthropic', 'none']).default('none'),
    openaiKey: z.string().optional(),
    anthropicKey: z.string().optional(),
    model: z.string().default('gpt-4'),
  }),
  paths: z.object({
    pluginData: z.string().default('./plugin-data'),
    enhancedData: z.string().default('./enhanced-plugin-data'),
    fixes: z.string().default('./plugin-fixes'),
    temp: z.string().default('./temp'),
    logs: z.string().default('./logs'),
  }),
  features: z.object({
    dryRun: z.boolean().default(false),
    parallel: z.boolean().default(true),
    maxConcurrency: z.number().default(5),
    createPRs: z.boolean().default(false),
    verbose: z.boolean().default(false),
  }),
  registry: z.object({
    url: z.string().default('https://raw.githubusercontent.com/elizaos-plugins/registry/main/index.json'),
    generatedUrl: z.string().default('https://raw.githubusercontent.com/elizaos-plugins/registry/main/generated-registry.json'),
  }),
});

export type Config = z.infer<typeof ConfigSchema>;

class ConfigManager {
  private config: Config;
  private configPath: string;

  constructor() {
    this.configPath = path.join(process.cwd(), 'scripts', 'config.json');
    this.config = this.loadConfig();
  }

  private loadConfig(): Config {
    // Start with environment variables
    const envConfig = {
      github: {
        token: process.env.GITHUB_TOKEN,
        rateLimit: {
          maxRequests: parseInt(process.env.GITHUB_RATE_LIMIT_MAX || '100'),
          windowMs: parseInt(process.env.GITHUB_RATE_LIMIT_WINDOW || '60000'),
          retryAfterMs: parseInt(process.env.GITHUB_RATE_LIMIT_RETRY || '5000'),
        },
      },
      ai: {
        provider: (process.env.AI_PROVIDER || 'none') as 'openai' | 'anthropic' | 'none',
        openaiKey: process.env.OPENAI_API_KEY,
        anthropicKey: process.env.ANTHROPIC_API_KEY,
        model: process.env.AI_MODEL || 'gpt-4',
      },
      paths: {
        pluginData: process.env.PLUGIN_DATA_DIR || './plugin-data',
        enhancedData: process.env.ENHANCED_DATA_DIR || './enhanced-plugin-data',
        fixes: process.env.FIXES_DIR || './plugin-fixes',
        temp: process.env.TEMP_DIR || './temp',
        logs: process.env.LOGS_DIR || './logs',
      },
      features: {
        dryRun: process.env.DRY_RUN === 'true',
        parallel: process.env.PARALLEL !== 'false',
        maxConcurrency: parseInt(process.env.MAX_CONCURRENCY || '5'),
        createPRs: process.env.CREATE_PRS === 'true',
        verbose: process.env.VERBOSE === 'true',
      },
      registry: {
        url: process.env.REGISTRY_URL || 'https://raw.githubusercontent.com/elizaos-plugins/registry/main/index.json',
        generatedUrl: process.env.GENERATED_REGISTRY_URL || 'https://raw.githubusercontent.com/elizaos-plugins/registry/main/generated-registry.json',
      },
    };

    // Load from config file if exists
    let fileConfig = {};
    if (fs.existsSync(this.configPath)) {
      try {
        fileConfig = JSON.parse(fs.readFileSync(this.configPath, 'utf-8'));
      } catch (error) {
        console.warn('⚠️  Failed to load config file:', error);
      }
    }

    // Merge configs (env vars take precedence)
    const merged = this.deepMerge(fileConfig, envConfig);

    // Validate and return
    try {
      return ConfigSchema.parse(merged);
    } catch (error) {
      if (error instanceof z.ZodError) {
        console.error('❌ Configuration validation failed:');
        error.errors.forEach(err => {
          console.error(`   - ${err.path.join('.')}: ${err.message}`);
        });
        process.exit(1);
      }
      throw error;
    }
  }

  private deepMerge(target: any, source: any): any {
    const output = { ...target };
    
    if (this.isObject(target) && this.isObject(source)) {
      Object.keys(source).forEach(key => {
        if (this.isObject(source[key])) {
          if (!(key in target)) {
            Object.assign(output, { [key]: source[key] });
          } else {
            output[key] = this.deepMerge(target[key], source[key]);
          }
        } else if (source[key] !== undefined) {
          Object.assign(output, { [key]: source[key] });
        }
      });
    }
    
    return output;
  }

  private isObject(item: any): boolean {
    return item && typeof item === 'object' && !Array.isArray(item);
  }

  get(): Config {
    return this.config;
  }

  update(updates: Partial<Config>): void {
    this.config = ConfigSchema.parse(this.deepMerge(this.config, updates));
    this.save();
  }

  save(): void {
    fs.writeFileSync(this.configPath, JSON.stringify(this.config, null, 2));
  }

  validate(): void {
    // Additional validation
    if (this.config.features.createPRs && !this.config.github.token) {
      throw new Error('GitHub token is required when createPRs is enabled');
    }

    if (this.config.ai.provider !== 'none') {
      if (this.config.ai.provider === 'openai' && !this.config.ai.openaiKey) {
        throw new Error('OpenAI API key is required when AI provider is set to openai');
      }
      if (this.config.ai.provider === 'anthropic' && !this.config.ai.anthropicKey) {
        throw new Error('Anthropic API key is required when AI provider is set to anthropic');
      }
    }
  }

  ensureDirectories(): void {
    Object.values(this.config.paths).forEach(dir => {
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
    });
  }
}

export const configManager = new ConfigManager();
export const config = configManager.get(); 