import { elizaLogger } from '@elizaos/core';
import type { TelemetryService } from './telemetry-service.js';
import type { ErrorLogService } from './error-log-service.js';

export interface SecretsManagerOptions {
  telemetryService: TelemetryService;
  errorLogService: ErrorLogService;
  debug?: boolean;
}

export interface SecretDefinition {
  key: string;
  description: string;
  required: boolean;
  requiredFor: string[];
  howToGet: string;
  validationPattern?: RegExp;
  isSet: boolean;
  lastChecked?: Date;
}

export interface SecretsAnalysis {
  requiredSecrets: string[];
  optionalSecrets: string[];
  missingRequired: string[];
  confidence: number;
  reasoning: string;
}

export class SecretsManager {
  private options: SecretsManagerOptions;
  private telemetryService: TelemetryService;
  private errorLogService: ErrorLogService;
  
  private secretDefinitions: Map<string, SecretDefinition> = new Map();
  private lastAnalysis: SecretsAnalysis | null = null;

  constructor(options: SecretsManagerOptions) {
    this.options = options;
    this.telemetryService = options.telemetryService;
    this.errorLogService = options.errorLogService;
    
    this.initializeSecretDefinitions();
  }

  async initialize(): Promise<void> {
    try {
      elizaLogger.info('Initializing Secrets Manager...');

      // Check current environment for existing secrets
      await this.checkExistingSecrets();

      await this.telemetryService.logEvent('secrets_manager_initialized', {
        totalSecrets: this.secretDefinitions.size,
        setSecrets: Array.from(this.secretDefinitions.values()).filter(s => s.isSet).length,
        timestamp: new Date().toISOString(),
      });

      elizaLogger.info('✅ Secrets Manager initialized');
    } catch (error) {
      await this.errorLogService.logError('Failed to initialize Secrets Manager', error);
      throw error;
    }
  }

  private initializeSecretDefinitions(): void {
    const secrets: Omit<SecretDefinition, 'isSet' | 'lastChecked'>[] = [
      {
        key: 'GITHUB_TOKEN',
        description: 'GitHub Personal Access Token for repository operations',
        required: false,
        requiredFor: ['github-operations', 'repository-coordination', 'pull-requests'],
        howToGet: 'Go to GitHub Settings > Developer settings > Personal access tokens > Generate new token. Needs repo, workflow, and user permissions.',
        validationPattern: /^gh[ps]_[A-Za-z0-9_]{36,}$/,
      },
      {
        key: 'OPENAI_API_KEY',
        description: 'OpenAI API key for LLM operations',
        required: false,
        requiredFor: ['code-generation', 'research', 'planning'],
        howToGet: 'Visit https://platform.openai.com/api-keys and create a new API key.',
        validationPattern: /^sk-[A-Za-z0-9]{48}$/,
      },
      {
        key: 'ANTHROPIC_API_KEY',
        description: 'Anthropic API key for Claude LLM operations',
        required: false,
        requiredFor: ['code-generation', 'research', 'planning'],
        howToGet: 'Visit https://console.anthropic.com/ and create an API key.',
        validationPattern: /^sk-ant-[A-Za-z0-9\-_]{95}$/,
      },
      {
        key: 'E2B_API_KEY',
        description: 'E2B API key for sandboxed agent execution',
        required: false,
        requiredFor: ['swarm-agents', 'sandboxed-execution', 'isolated-development'],
        howToGet: 'Sign up at https://e2b.dev and get your API key from the dashboard.',
      },
      {
        key: 'POSTGRES_URL',
        description: 'PostgreSQL database connection string',
        required: false,
        requiredFor: ['persistent-storage', 'memory-management', 'project-state'],
        howToGet: 'Set up a PostgreSQL database (local or cloud) and provide the connection string.',
        validationPattern: /^postgresql:\/\/[^:]+:[^@]+@[^:]+:\d+\/[^?]+/,
      },
      {
        key: 'DISCORD_TOKEN',
        description: 'Discord bot token for Discord integration',
        required: false,
        requiredFor: ['discord-integration', 'bot-operations'],
        howToGet: 'Create a Discord application at https://discord.com/developers/applications and get the bot token.',
      },
      {
        key: 'TELEGRAM_BOT_TOKEN',
        description: 'Telegram bot token for Telegram integration',
        required: false,
        requiredFor: ['telegram-integration', 'bot-operations'],
        howToGet: 'Talk to @BotFather on Telegram to create a new bot and get the token.',
      },
      {
        key: 'TWITTER_API_KEY',
        description: 'Twitter API key for social media integration',
        required: false,
        requiredFor: ['twitter-integration', 'social-media'],
        howToGet: 'Apply for Twitter API access at https://developer.twitter.com/',
      },
      {
        key: 'SUPABASE_URL',
        description: 'Supabase project URL for database operations',
        required: false,
        requiredFor: ['supabase-integration', 'database-operations'],
        howToGet: 'Create a project at https://supabase.com and copy the project URL.',
      },
      {
        key: 'SUPABASE_ANON_KEY',
        description: 'Supabase anonymous key for database access',
        required: false,
        requiredFor: ['supabase-integration', 'database-operations'],
        howToGet: 'Find in your Supabase project settings under API keys.',
      },
    ];

    for (const secret of secrets) {
      this.secretDefinitions.set(secret.key, {
        ...secret,
        isSet: false,
        lastChecked: undefined,
      });
    }
  }

  private async checkExistingSecrets(): Promise<void> {
    for (const [key, definition] of this.secretDefinitions) {
      const value = process.env[key];
      definition.isSet = !!value;
      definition.lastChecked = new Date();

      // Validate format if pattern is provided
      if (value && definition.validationPattern) {
        const isValid = definition.validationPattern.test(value);
        if (!isValid && this.options.debug) {
          elizaLogger.warn(`${key} is set but doesn't match expected format`);
        }
      }
    }
  }

  async checkRequiredSecrets(
    userInput: string,
    intent?: { type: string; keywords: string[] }
  ): Promise<string[]> {
    try {
      const analysis = await this.analyzeSecretsRequirements(userInput, intent);
      this.lastAnalysis = analysis;

      await this.telemetryService.logEvent('secrets_analysis', {
        requiredCount: analysis.requiredSecrets.length,
        missingCount: analysis.missingRequired.length,
        confidence: analysis.confidence,
        intent: intent?.type,
        timestamp: new Date().toISOString(),
      });

      return analysis.missingRequired;

    } catch (error) {
      await this.errorLogService.logError('Failed to check required secrets', error, { userInput });
      return [];
    }
  }

  private async analyzeSecretsRequirements(
    userInput: string,
    intent?: { type: string; keywords: string[] }
  ): Promise<SecretsAnalysis> {
    const lowerInput = userInput.toLowerCase();
    const requiredSecrets: string[] = [];
    const optionalSecrets: string[] = [];

    // Analyze based on keywords and intent
    for (const [key, definition] of this.secretDefinitions) {
      let isRequired = false;
      let isOptional = false;

      // Check if any of the secret's required-for categories match the input
      for (const category of definition.requiredFor) {
        if (lowerInput.includes(category.replace('-', ' ')) || 
            lowerInput.includes(category)) {
          isRequired = true;
          break;
        }
      }

      // Check for specific mentions
      if (lowerInput.includes(key.toLowerCase().replace('_', ' ')) ||
          lowerInput.includes(key.toLowerCase())) {
        isRequired = true;
      }

      // Intent-based analysis
      if (intent) {
        switch (intent.type) {
          case 'github':
            if (key === 'GITHUB_TOKEN') isRequired = true;
            break;
          case 'coding':
            if (['OPENAI_API_KEY', 'ANTHROPIC_API_KEY', 'E2B_API_KEY'].includes(key)) {
              isOptional = true;
            }
            break;
          case 'research':
            if (['OPENAI_API_KEY', 'ANTHROPIC_API_KEY'].includes(key)) {
              isOptional = true;
            }
            break;
        }
      }

      // General coding tasks benefit from LLM access
      if (lowerInput.includes('code') || lowerInput.includes('implement') || 
          lowerInput.includes('build') || lowerInput.includes('develop')) {
        if (['OPENAI_API_KEY', 'ANTHROPIC_API_KEY'].includes(key)) {
          isOptional = true;
        }
      }

      // Swarm mode requires additional services
      if (lowerInput.includes('swarm') || lowerInput.includes('agents') ||
          lowerInput.includes('team') || lowerInput.includes('coordinate')) {
        if (['E2B_API_KEY', 'GITHUB_TOKEN'].includes(key)) {
          isRequired = true;
        }
      }

      if (isRequired) {
        requiredSecrets.push(key);
      } else if (isOptional) {
        optionalSecrets.push(key);
      }
    }

    // Filter out secrets that are already set
    const missingRequired = requiredSecrets.filter(key => {
      const definition = this.secretDefinitions.get(key);
      return definition && !definition.isSet;
    });

    // Calculate confidence based on keyword matches
    const keywordMatches = requiredSecrets.length + optionalSecrets.length;
    const confidence = Math.min(keywordMatches * 0.3 + (intent ? 0.4 : 0), 1.0);

    return {
      requiredSecrets,
      optionalSecrets,
      missingRequired,
      confidence,
      reasoning: this.generateAnalysisReasoning(requiredSecrets, optionalSecrets, intent),
    };
  }

  private generateAnalysisReasoning(
    requiredSecrets: string[],
    optionalSecrets: string[],
    intent?: { type: string; keywords: string[] }
  ): string {
    const reasons: string[] = [];

    if (intent) {
      reasons.push(`Detected intent: ${intent.type}`);
    }

    if (requiredSecrets.length > 0) {
      reasons.push(`Required for core functionality: ${requiredSecrets.join(', ')}`);
    }

    if (optionalSecrets.length > 0) {
      reasons.push(`Would enhance capabilities: ${optionalSecrets.join(', ')}`);
    }

    if (reasons.length === 0) {
      reasons.push('No specific secrets required for this request');
    }

    return reasons.join('. ');
  }

  getSecretsInfo(secretKeys: string[]): Record<string, SecretDefinition> {
    const info: Record<string, SecretDefinition> = {};
    
    for (const key of secretKeys) {
      const definition = this.secretDefinitions.get(key);
      if (definition) {
        info[key] = { ...definition };
      }
    }

    return info;
  }

  getAllSecrets(): SecretDefinition[] {
    return Array.from(this.secretDefinitions.values());
  }

  getSecretsStatus(): {
    total: number;
    set: number;
    missing: number;
    byCategory: Record<string, { total: number; set: number }>;
  } {
    const allSecrets = Array.from(this.secretDefinitions.values());
    const setSecrets = allSecrets.filter(s => s.isSet);
    
    // Group by category (first word of requiredFor)
    const byCategory: Record<string, { total: number; set: number }> = {};
    
    for (const secret of allSecrets) {
      for (const category of secret.requiredFor) {
        const mainCategory = category.split('-')[0];
        if (!byCategory[mainCategory]) {
          byCategory[mainCategory] = { total: 0, set: 0 };
        }
        byCategory[mainCategory].total++;
        if (secret.isSet) {
          byCategory[mainCategory].set++;
        }
      }
    }

    return {
      total: allSecrets.length,
      set: setSecrets.length,
      missing: allSecrets.length - setSecrets.length,
      byCategory,
    };
  }

  async validateSecret(key: string, value: string): Promise<{
    isValid: boolean;
    error?: string;
    warnings?: string[];
  }> {
    const definition = this.secretDefinitions.get(key);
    if (!definition) {
      return {
        isValid: false,
        error: `Unknown secret: ${key}`,
      };
    }

    const warnings: string[] = [];

    // Check format
    if (definition.validationPattern && !definition.validationPattern.test(value)) {
      return {
        isValid: false,
        error: `Invalid format for ${key}. Expected pattern not matched.`,
      };
    }

    // Check length (basic validation)
    if (value.length < 10) {
      warnings.push(`${key} seems unusually short. Please verify it's correct.`);
    }

    // TODO: Add actual API validation for specific services
    // For example, making a test call to GitHub API with the token

    return {
      isValid: true,
      warnings: warnings.length > 0 ? warnings : undefined,
    };
  }

  async setSecret(key: string, value: string): Promise<void> {
    try {
      const validation = await this.validateSecret(key, value);
      if (!validation.isValid) {
        throw new Error(validation.error);
      }

      // Set in environment
      process.env[key] = value;

      // Update tracking
      const definition = this.secretDefinitions.get(key);
      if (definition) {
        definition.isSet = true;
        definition.lastChecked = new Date();
      }

      await this.telemetryService.logEvent('secret_set', {
        key,
        hasWarnings: !!validation.warnings,
        timestamp: new Date().toISOString(),
      });

      elizaLogger.info(`✅ Secret ${key} set successfully`);

      if (validation.warnings) {
        for (const warning of validation.warnings) {
          elizaLogger.warn(warning);
        }
      }

    } catch (error) {
      await this.errorLogService.logError('Failed to set secret', error, { key });
      throw error;
    }
  }

  generateSecretsSetupGuide(missingSecrets: string[]): string {
    if (missingSecrets.length === 0) {
      return '✅ All required secrets are configured!';
    }

    const guide = [`🔑 **Setup Guide for Required Secrets**\n`];

    for (const key of missingSecrets) {
      const definition = this.secretDefinitions.get(key);
      if (!definition) continue;

      guide.push(`**${key}**:`);
      guide.push(`  Description: ${definition.description}`);
      guide.push(`  How to get: ${definition.howToGet}`);
      guide.push(`  Required for: ${definition.requiredFor.join(', ')}`);
      guide.push('');
    }

    guide.push('**Setup Options:**');
    guide.push('1. Add to your `.env` file in the project root');
    guide.push('2. Set as environment variables in your shell');
    guide.push('3. Pass as command line arguments (for some secrets)');
    guide.push('');
    guide.push('💡 **Tip**: Once configured, restart the CLI to pick up the new values.');

    return guide.join('\n');
  }

  async shutdown(): Promise<void> {
    try {
      elizaLogger.info('Shutting down Secrets Manager...');

      await this.telemetryService.logEvent('secrets_manager_shutdown', {
        timestamp: new Date().toISOString(),
      });

      elizaLogger.info('✅ Secrets Manager shutdown completed');

    } catch (error) {
      await this.errorLogService.logError('Error during Secrets Manager shutdown', error);
      throw error;
    }
  }
}