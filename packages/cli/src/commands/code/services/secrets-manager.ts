import fs from 'fs/promises';
import path from 'path';
import crypto from 'crypto';
import { elizaLogger } from '@elizaos/core';
import type { TelemetryService } from './telemetry-service.js';
import type { ErrorLogService } from './error-log-service.js';

export interface SecretsManagerOptions {
  telemetryService: TelemetryService;
  errorLogService: ErrorLogService;
  debug?: boolean;
  encryptionKey?: string;
}

export interface SecretDefinition {
  name: string;
  description: string;
  required: boolean;
  howToGet: string;
  requiredFor: string[];
  validation?: (value: string) => boolean;
  isUrl?: boolean;
  isSensitive?: boolean;
}

export interface SecretStatus {
  name: string;
  isConfigured: boolean;
  isValid: boolean;
  source: 'environment' | 'file' | 'prompt' | 'not-configured';
  lastValidated?: string;
}

export class SecretsManager {
  private options: SecretsManagerOptions;
  private telemetryService: TelemetryService;
  private errorLogService: ErrorLogService;
  private secrets: Map<string, string> = new Map();
  private secretDefinitions: Map<string, SecretDefinition> = new Map();
  private encryptionKey: string;

  constructor(options: SecretsManagerOptions) {
    this.options = options;
    this.telemetryService = options.telemetryService;
    this.errorLogService = options.errorLogService;
    
    // Generate or use provided encryption key
    this.encryptionKey = options.encryptionKey || this.generateEncryptionKey();
  }

  async initialize(): Promise<void> {
    try {
      elizaLogger.info('Initializing Secrets Manager...');

      // Define standard secrets
      this.defineStandardSecrets();

      // Load secrets from various sources
      await this.loadSecretsFromEnvironment();
      await this.loadSecretsFromFile();

      // Validate loaded secrets
      await this.validateSecrets();

      await this.telemetryService.logEvent('secrets_manager_initialized', {
        totalSecrets: this.secretDefinitions.size,
        configuredSecrets: this.secrets.size,
      }, 'code-interface');

      elizaLogger.info('✅ Secrets Manager initialized');
    } catch (error) {
      await this.errorLogService.logError('Failed to initialize Secrets Manager', error as Error, {}, 'code-interface');
      throw error;
    }
  }

  private defineStandardSecrets(): void {
    const definitions: SecretDefinition[] = [
      {
        name: 'GITHUB_TOKEN',
        description: 'GitHub Personal Access Token for repository operations',
        required: true,
        howToGet: 'Go to GitHub Settings > Developer settings > Personal access tokens > Generate new token',
        requiredFor: ['GitHub integration', 'Repository coordination', 'Artifact storage'],
        validation: (value) => value.startsWith('ghp_') || value.startsWith('github_pat_'),
        isSensitive: true,
      },
      {
        name: 'OPENAI_API_KEY',
        description: 'OpenAI API key for LLM capabilities',
        required: false,
        howToGet: 'Visit https://platform.openai.com/api-keys to create an API key',
        requiredFor: ['AI agent capabilities', 'Code generation', 'Natural language processing'],
        validation: (value) => value.startsWith('sk-'),
        isSensitive: true,
      },
      {
        name: 'ANTHROPIC_API_KEY',
        description: 'Anthropic API key for Claude models',
        required: false,
        howToGet: 'Visit https://console.anthropic.com/ to get an API key',
        requiredFor: ['Claude AI models', 'Advanced reasoning'],
        validation: (value) => value.startsWith('sk-ant-'),
        isSensitive: true,
      },
      {
        name: 'SERPER_API_KEY',
        description: 'Serper API key for web search capabilities',
        required: false,
        howToGet: 'Visit https://serper.dev/ to get an API key',
        requiredFor: ['Web search', 'Research capabilities'],
        isSensitive: true,
      },
      {
        name: 'POSTGRES_URL',
        description: 'PostgreSQL database connection URL',
        required: false,
        howToGet: 'Set up a PostgreSQL database and format as: postgresql://user:pass@host:port/db',
        requiredFor: ['Persistent storage', 'Agent memory'],
        validation: (value) => value.startsWith('postgresql://') || value.startsWith('postgres://'),
        isUrl: true,
        isSensitive: true,
      },
      {
        name: 'DEPLOYMENT_KEY',
        description: 'SSH key for deployment operations',
        required: false,
        howToGet: 'Generate SSH key pair and add public key to deployment targets',
        requiredFor: ['Automated deployment', 'Server access'],
        isSensitive: true,
      },
    ];

    definitions.forEach(def => {
      this.secretDefinitions.set(def.name, def);
    });
  }

  private async loadSecretsFromEnvironment(): Promise<void> {
    for (const [name, definition] of this.secretDefinitions) {
      const value = process.env[name];
      if (value) {
        this.secrets.set(name, value);
        elizaLogger.debug(`Loaded secret ${name} from environment`);
      }
    }
  }

  private async loadSecretsFromFile(): Promise<void> {
    const secretsFilePath = path.join(process.cwd(), '.elizaos-secrets.enc');
    
    try {
      const exists = await fs.access(secretsFilePath).then(() => true).catch(() => false);
      if (!exists) return;

      const encryptedData = await fs.readFile(secretsFilePath, 'utf8');
      const decryptedData = this.decrypt(encryptedData);
      const secrets = JSON.parse(decryptedData);

      for (const [name, value] of Object.entries(secrets)) {
        if (!this.secrets.has(name) && this.secretDefinitions.has(name)) {
          this.secrets.set(name, value as string);
          elizaLogger.debug(`Loaded secret ${name} from encrypted file`);
        }
      }
    } catch (error) {
      elizaLogger.warn('Failed to load secrets from file:', error);
    }
  }

  private async validateSecrets(): Promise<void> {
    for (const [name, value] of this.secrets) {
      const definition = this.secretDefinitions.get(name);
      if (definition?.validation && !definition.validation(value)) {
        elizaLogger.warn(`Secret ${name} failed validation`);
        this.secrets.delete(name);
      }
    }
  }

  async checkRequiredSecrets(input: string, intent?: any): Promise<string[]> {
    const requiredSecrets: string[] = [];
    const lowerInput = input.toLowerCase();

    // Check for GitHub-related operations
    if (lowerInput.includes('github') || lowerInput.includes('repository') || lowerInput.includes('git')) {
      if (!this.secrets.has('GITHUB_TOKEN')) {
        requiredSecrets.push('GITHUB_TOKEN');
      }
    }

    // Check for AI/LLM operations
    if (lowerInput.includes('generate') || lowerInput.includes('ai') || lowerInput.includes('code')) {
      if (!this.secrets.has('OPENAI_API_KEY') && !this.secrets.has('ANTHROPIC_API_KEY')) {
        requiredSecrets.push('OPENAI_API_KEY');
      }
    }

    // Check for web search operations
    if (lowerInput.includes('search') || lowerInput.includes('research') || lowerInput.includes('web')) {
      if (!this.secrets.has('SERPER_API_KEY')) {
        requiredSecrets.push('SERPER_API_KEY');
      }
    }

    // Check for deployment operations
    if (lowerInput.includes('deploy') || lowerInput.includes('production') || lowerInput.includes('server')) {
      if (!this.secrets.has('DEPLOYMENT_KEY')) {
        requiredSecrets.push('DEPLOYMENT_KEY');
      }
    }

    return requiredSecrets;
  }

  async getSecret(name: string): Promise<string | null> {
    return this.secrets.get(name) || null;
  }

  async setSecret(name: string, value: string, persistent = true): Promise<void> {
    const definition = this.secretDefinitions.get(name);
    
    if (definition?.validation && !definition.validation(value)) {
      throw new Error(`Secret ${name} failed validation`);
    }

    this.secrets.set(name, value);

    if (persistent) {
      await this.saveSecretsToFile();
    }

    await this.telemetryService.logEvent('secret_configured', {
      name,
      hasValidation: !!definition?.validation,
      isPersistent: persistent,
    }, 'code-interface');

    elizaLogger.info(`Secret ${name} configured successfully`);
  }

  async getSecretsInfo(secretNames: string[]): Promise<Record<string, SecretDefinition>> {
    const info: Record<string, SecretDefinition> = {};
    
    for (const name of secretNames) {
      const definition = this.secretDefinitions.get(name);
      if (definition) {
        info[name] = definition;
      }
    }

    return info;
  }

  async getSecretStatus(name: string): Promise<SecretStatus> {
    const definition = this.secretDefinitions.get(name);
    const value = this.secrets.get(name);
    
    let source: SecretStatus['source'] = 'not-configured';
    if (value) {
      if (process.env[name]) {
        source = 'environment';
      } else {
        source = 'file';
      }
    }

    const isValid = value ? (definition?.validation ? definition.validation(value) : true) : false;

    return {
      name,
      isConfigured: !!value,
      isValid,
      source,
      lastValidated: isValid ? new Date().toISOString() : undefined,
    };
  }

  async getAllSecretsStatus(): Promise<SecretStatus[]> {
    const statuses: SecretStatus[] = [];
    
    for (const [name] of this.secretDefinitions) {
      const status = await this.getSecretStatus(name);
      statuses.push(status);
    }

    return statuses;
  }

  async promptForSecret(name: string): Promise<string> {
    const definition = this.secretDefinitions.get(name);
    if (!definition) {
      throw new Error(`Unknown secret: ${name}`);
    }

    // This would integrate with the terminal interface to prompt the user
    // For now, return a placeholder
    throw new Error('Interactive secret prompting not yet implemented');
  }

  private async saveSecretsToFile(): Promise<void> {
    try {
      const secretsObject: Record<string, string> = {};
      
      for (const [name, value] of this.secrets) {
        secretsObject[name] = value;
      }

      const encryptedData = this.encrypt(JSON.stringify(secretsObject));
      const secretsFilePath = path.join(process.cwd(), '.elizaos-secrets.enc');
      
      await fs.writeFile(secretsFilePath, encryptedData, 'utf8');
      elizaLogger.debug('Secrets saved to encrypted file');
    } catch (error) {
      await this.errorLogService.logError('Failed to save secrets to file', error as Error, {}, 'code-interface');
    }
  }

  private generateEncryptionKey(): string {
    // Generate a key based on machine-specific info for basic obfuscation
    // In production, this should use more sophisticated key derivation
    const machineInfo = process.platform + process.arch + (process.env.USER || process.env.USERNAME || 'default');
    return crypto.createHash('sha256').update(machineInfo).digest('hex').substring(0, 32);
  }

  private encrypt(text: string): string {
    try {
      const iv = crypto.randomBytes(16);
      const cipher = crypto.createCipher('aes-256-cbc', this.encryptionKey);
      let encrypted = cipher.update(text, 'utf8', 'hex');
      encrypted += cipher.final('hex');
      return iv.toString('hex') + ':' + encrypted;
    } catch (error) {
      elizaLogger.warn('Encryption failed, storing in plain text');
      return text;
    }
  }

  private decrypt(encryptedText: string): string {
    try {
      const parts = encryptedText.split(':');
      if (parts.length !== 2) {
        // Assume plain text
        return encryptedText;
      }

      const decipher = crypto.createDecipher('aes-256-cbc', this.encryptionKey);
      let decrypted = decipher.update(parts[1], 'hex', 'utf8');
      decrypted += decipher.final('utf8');
      return decrypted;
    } catch (error) {
      elizaLogger.warn('Decryption failed, assuming plain text');
      return encryptedText;
    }
  }

  async rotateSecret(name: string, newValue: string): Promise<void> {
    const oldValue = this.secrets.get(name);
    
    try {
      await this.setSecret(name, newValue);
      
      await this.telemetryService.logEvent('secret_rotated', {
        name,
        hadPreviousValue: !!oldValue,
      }, 'code-interface');

      elizaLogger.info(`Secret ${name} rotated successfully`);
    } catch (error) {
      await this.errorLogService.logError('Failed to rotate secret', error as Error, { name }, 'code-interface');
      throw error;
    }
  }

  async deleteSecret(name: string): Promise<void> {
    const existed = this.secrets.has(name);
    this.secrets.delete(name);
    
    if (existed) {
      await this.saveSecretsToFile();
      await this.telemetryService.logEvent('secret_deleted', { name }, 'code-interface');
      elizaLogger.info(`Secret ${name} deleted`);
    }
  }

  async exportSecrets(includeValues = false): Promise<any> {
    const export_data: any = {
      definitions: Object.fromEntries(this.secretDefinitions),
      statuses: await this.getAllSecretsStatus(),
      exportedAt: new Date().toISOString(),
    };

    if (includeValues) {
      export_data.values = Object.fromEntries(this.secrets);
    }

    return export_data;
  }

  async shutdown(): Promise<void> {
    try {
      elizaLogger.info('Shutting down Secrets Manager...');

      // Save any pending secrets
      await this.saveSecretsToFile();

      // Clear sensitive data from memory
      this.secrets.clear();

      await this.telemetryService.logEvent('secrets_manager_shutdown', {
        totalDefinitions: this.secretDefinitions.size,
      }, 'code-interface');

      elizaLogger.info('✅ Secrets Manager shutdown completed');
    } catch (error) {
      await this.errorLogService.logError('Error during Secrets Manager shutdown', error as Error, {}, 'code-interface');
    }
  }
}