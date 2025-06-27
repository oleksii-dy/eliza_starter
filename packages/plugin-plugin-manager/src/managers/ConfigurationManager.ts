import { elizaLogger } from '@elizaos/core';
import type { IAgentRuntime } from '@elizaos/core';
import * as fs from 'fs/promises';
import * as path from 'path';
import { z } from 'zod';
import type { ValidationResult } from '../services/interfaces.ts';
import type { PluginEnvironmentVariable } from '../types.ts';

// Configuration schemas
const _EnvVarSchema = z.object({
  name: z.string().regex(/^[A-Z][A-Z0-9_]*$/),
  value: z.string(),
  sensitive: z.boolean().optional(),
});

const _ConfigurationSchema = z.record(z.string(), z.any());

export class ConfigurationManager {
  private runtime: IAgentRuntime;
  private configCache = new Map<string, Record<string, any>>();
  private configPath: string = '';

  constructor(runtime: IAgentRuntime) {
    this.runtime = runtime;
  }

  async initialize(): Promise<void> {
    this.configPath = path.join(process.cwd(), '.plugin-configs');
    await fs.mkdir(this.configPath, { recursive: true });
    // Only log in non-test environments
    if (process.env.NODE_ENV !== 'test' && !process.env.VITEST) {
      elizaLogger.info('[ConfigurationManager] Initialized');
    }
  }

  async validateConfiguration(
    pluginName: string,
    config: Record<string, any>
  ): Promise<ValidationResult> {
    const errors: string[] = [];
    const warnings: string[] = [];
    const suggestions: string[] = [];

    // Handle null/undefined config
    if (!config || typeof config !== 'object' || Array.isArray(config)) {
      return {
        valid: false,
        errors: ['Configuration must be a valid object'],
        warnings: [],
        suggestions: ['Provide configuration as an object with key-value pairs'],
      };
    }

    // Get required configuration
    const required = await this.getRequiredConfiguration(pluginName);

    // Validate required fields if any
    if (required && required.length > 0) {
      for (const envVar of required) {
        if (envVar.required && !config[envVar.name]) {
          errors.push(`Missing required environment variable: ${envVar.name}`);
        }
      }
    }

    // Always check for suspicious content, regardless of required fields
    for (const [key, value] of Object.entries(config)) {
      if (typeof value === 'string') {
        let hasSuspiciousContent = false;

        // Check for template injection
        if (value.includes('${') || value.includes('{{')) {
          warnings.push(`${key}: Value contains template syntax which may be a security risk`);
          hasSuspiciousContent = true;
        }

        // Check for script tags
        if (value.toLowerCase().includes('<script')) {
          warnings.push(`${key}: Value contains potential script tags`);
          hasSuspiciousContent = true;
        }

        // Check for JS protocols
        if (value.toLowerCase().includes('javascript:')) {
          warnings.push(`${key}: Value contains javascript: protocol`);
          hasSuspiciousContent = true;
        }

        // Check for path traversal
        if (value.includes('../') || value.includes('..\\')) {
          warnings.push(`${key}: Value contains path traversal patterns`);
          hasSuspiciousContent = true;
        }

        // Check for event handlers
        if (/on\w+\s*=/.test(value)) {
          warnings.push(`${key}: Value contains potential event handlers`);
          hasSuspiciousContent = true;
        }

        // Add general suspicious content warning only once per key
        if (hasSuspiciousContent) {
          warnings.push(`${key}: Suspicious content detected - please review`);
        }
      }
    }

    // Add suggestions
    if (errors.length > 0) {
      suggestions.push('Please provide all required environment variables');
    }
    if (warnings.length > 0) {
      suggestions.push('Review and sanitize configuration values before use');
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
      suggestions,
    };
  }

  async getRequiredConfiguration(pluginName: string): Promise<PluginEnvironmentVariable[]> {
    // Try to load from plugin's configuration schema
    const configSchemaPath = path.join(process.cwd(), 'plugins', pluginName, 'config-schema.json');

    try {
      const schemaContent = await fs.readFile(configSchemaPath, 'utf-8');
      const schema = JSON.parse(schemaContent);
      return schema.variables || [];
    } catch {
      // If no schema file, return empty array
      return [];
    }
  }

  async saveConfiguration(pluginName: string, config: Record<string, any>): Promise<void> {
    // Validate before saving
    const validation = await this.validateConfiguration(pluginName, config);
    if (!validation.valid) {
      throw new Error(`Invalid configuration: ${validation.errors?.join(', ')}`);
    }

    // Encrypt sensitive values
    const secureConfig = await this.encryptSensitiveValues(pluginName, config);

    // Save to file
    const configFile = path.join(this.configPath, `${pluginName}.json`);
    await fs.writeFile(
      configFile,
      JSON.stringify(secureConfig, null, 2),
      { mode: 0o600 } // Read/write for owner only
    );

    // Update cache
    this.configCache.set(pluginName, config);

    // Also save to runtime settings if available
    if (this.runtime) {
      for (const [key, value] of Object.entries(config)) {
        // Store in runtime settings for access via getSetting
        (this.runtime as any).settings = {
          ...(this.runtime as any).settings,
          [`${pluginName}_${key}`]: value,
        };
      }
    }
  }

  async loadConfiguration(pluginName: string): Promise<Record<string, any>> {
    // Check cache first
    const cached = this.configCache.get(pluginName);
    if (cached) {
      return cached;
    }

    try {
      const configFile = path.join(this.configPath, `${pluginName}.json`);
      const content = await fs.readFile(configFile, 'utf-8');
      const secureConfig = JSON.parse(content);

      // Decrypt sensitive values
      const config: Record<string, any> = {};
      for (const [key, value] of Object.entries(secureConfig)) {
        if (
          typeof value === 'object' &&
          value !== null &&
          'encrypted' in value &&
          value.encrypted
        ) {
          // Decrypt the value
          config[key] = Buffer.from((value as any).value, 'base64').toString();
        } else {
          config[key] = value;
        }
      }

      this.configCache.set(pluginName, config);
      return config;
    } catch {
      return {};
    }
  }

  // Helper methods
  private validateVariable(
    varDef: PluginEnvironmentVariable,
    value: any
  ): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    // Pattern validation
    if (varDef.validation?.pattern && typeof value === 'string') {
      const pattern = new RegExp(varDef.validation.pattern);
      if (!pattern.test(value)) {
        errors.push(`${varDef.name} does not match required pattern`);
      }
    }

    // Length validation
    if (varDef.validation?.minLength !== undefined && typeof value === 'string') {
      if (value.length < varDef.validation.minLength) {
        errors.push(`${varDef.name} must be at least ${varDef.validation.minLength} characters`);
      }
    }

    if (varDef.validation?.maxLength !== undefined && typeof value === 'string') {
      if (value.length > varDef.validation.maxLength) {
        errors.push(`${varDef.name} must be at most ${varDef.validation.maxLength} characters`);
      }
    }

    // Enum validation
    if (varDef.validation?.enum && varDef.validation.enum.length > 0) {
      if (!varDef.validation.enum.includes(String(value))) {
        errors.push(`${varDef.name} must be one of: ${varDef.validation.enum.join(', ')}`);
      }
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  private async encryptSensitiveValues(
    pluginName: string,
    config: Record<string, any>
  ): Promise<Record<string, any>> {
    const requiredVars = await this.getRequiredConfiguration(pluginName);
    const sensitiveVars = new Set(requiredVars.filter((v) => v.sensitive).map((v) => v.name));

    const secureConfig: Record<string, any> = {};

    for (const [key, value] of Object.entries(config)) {
      if (sensitiveVars.has(key) && typeof value === 'string') {
        // Throw _error for sensitive data without proper encryption
        throw new Error(
          `Cannot store sensitive configuration "${key}" without proper encryption. ` +
            'Please implement a secure encryption service or use environment variables for sensitive data.'
        );
      } else {
        secureConfig[key] = value;
      }
    }

    return secureConfig;
  }

  // Public API methods for compatibility
  async getConfig(pluginId: string): Promise<any> {
    return this.loadConfiguration(pluginId);
  }

  async setConfig(pluginId: string, config: any): Promise<void> {
    await this.saveConfiguration(pluginId, config);
  }

  async validateConfig(pluginId: string, config: any): Promise<boolean> {
    const result = await this.validateConfiguration(pluginId, config);
    return result.valid;
  }

  async getRequiredEnvVars(pluginId: string): Promise<string[]> {
    const required = await this.getRequiredConfiguration(pluginId);
    return required.map((env) => env.name);
  }

  async checkEnvVars(pluginId: string): Promise<string[]> {
    const required = await this.getRequiredConfiguration(pluginId);
    const config = await this.loadConfiguration(pluginId);
    const missing: string[] = [];

    for (const envVar of required) {
      if (envVar.required && !config[envVar.name]) {
        missing.push(envVar.name);
      }
    }

    return missing;
  }

  // Clean up
  clearCache(): void {
    this.configCache.clear();
  }

  async cleanup(): Promise<void> {
    this.clearCache();
    // Only log in non-test environments
    if (process.env.NODE_ENV !== 'test' && !process.env.VITEST) {
      elizaLogger.info('[ConfigurationManager] Cleaned up');
    }
  }
}
