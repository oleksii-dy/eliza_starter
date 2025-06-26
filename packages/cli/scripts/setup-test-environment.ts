#!/usr/bin/env bun

/**
 * Setup Test Environment for Scenario Testing
 * Configures required API keys and environment variables
 */

import { writeFile, readFile } from 'fs/promises';
import { existsSync } from 'fs';
import { join } from 'path';

interface EnvironmentConfig {
  required: Array<{
    key: string;
    description: string;
    defaultValue?: string;
    sensitive?: boolean;
  }>;
  optional: Array<{
    key: string;
    description: string;
    defaultValue: string;
  }>;
}

const ENVIRONMENT_CONFIG: EnvironmentConfig = {
  required: [
    {
      key: 'ANTHROPIC_API_KEY',
      description: 'Anthropic Claude API key for LLM operations',
      defaultValue: 'test-key-anthropic',
      sensitive: true
    },
    {
      key: 'OPENAI_API_KEY', 
      description: 'OpenAI API key for embedding and backup LLM',
      defaultValue: 'test-key-openai',
      sensitive: true
    }
  ],
  optional: [
    {
      key: 'MODEL_PROVIDER',
      description: 'Primary model provider (anthropic/openai)',
      defaultValue: 'anthropic'
    },
    {
      key: 'LARGE_MODEL',
      description: 'Large model for complex operations',
      defaultValue: 'claude-3-5-sonnet-20241022'
    },
    {
      key: 'SMALL_MODEL',
      description: 'Small model for simple operations',
      defaultValue: 'claude-3-haiku-20240307'
    },
    {
      key: 'ANTHROPIC_LARGE_MODEL',
      description: 'Anthropic large model override',
      defaultValue: 'claude-3-5-sonnet-20241022'
    },
    {
      key: 'ANTHROPIC_SMALL_MODEL',
      description: 'Anthropic small model override', 
      defaultValue: 'claude-3-haiku-20240307'
    },
    {
      key: 'EMBEDDING_MODEL',
      description: 'Embedding model for vector operations',
      defaultValue: 'text-embedding-ada-002'
    },
    {
      key: 'DATABASE_URL',
      description: 'Database URL for production plugin tests',
      defaultValue: 'postgresql://test:test@localhost:5432/test_db'
    },
    {
      key: 'DATABASE_API_KEY',
      description: 'Database API key for production plugin tests',
      defaultValue: 'test-database-api-key-12345'
    },
    {
      key: 'GITHUB_TOKEN',
      description: 'GitHub token for GitHub integration tests',
      defaultValue: 'ghp_test_token_for_scenarios'
    },
    {
      key: 'CACHE_SIZE',
      description: 'Cache size for production plugin tests',
      defaultValue: '1000'
    },
    {
      key: 'LOG_LEVEL',
      description: 'Logging level for tests',
      defaultValue: 'info'
    }
  ]
};

class EnvironmentSetup {
  private envPath: string;
  private testEnvPath: string;

  constructor() {
    this.envPath = join(process.cwd(), '.env');
    this.testEnvPath = join(process.cwd(), '.env.test');
  }

  async setupEnvironment(): Promise<void> {
    console.log('🔧 Setting up test environment for scenario testing...\n');
    
    // Check existing environment
    const currentEnv = await this.getCurrentEnvironment();
    const missingRequired = await this.checkRequiredVariables(currentEnv);
    
    if (missingRequired.length === 0) {
      console.log('✅ All required environment variables are already configured');
      await this.createTestEnvironmentFile(currentEnv);
      return;
    }

    console.log('⚠️  Missing required environment variables:');
    missingRequired.forEach(key => {
      const config = ENVIRONMENT_CONFIG.required.find(r => r.key === key);
      console.log(`   • ${key}: ${config?.description || 'Unknown'}`);
    });

    console.log('\n🎯 Creating test environment configuration...');
    
    // Create comprehensive test environment
    const testEnv = await this.buildTestEnvironment(currentEnv);
    await this.writeEnvironmentFile(testEnv);
    
    console.log('✅ Test environment configured successfully!');
    console.log('\n📝 Environment setup summary:');
    this.logEnvironmentSummary(testEnv);
  }

  private async getCurrentEnvironment(): Promise<Record<string, string>> {
    const env: Record<string, string> = {};
    
    // Load from process.env
    Object.keys(process.env).forEach(key => {
      if (process.env[key]) {
        env[key] = process.env[key]!;
      }
    });

    // Load from .env file if exists
    try {
      if (existsSync(this.envPath)) {
        const envContent = await readFile(this.envPath, 'utf-8');
        const envLines = envContent.split('\n');
        
        for (const line of envLines) {
          const trimmed = line.trim();
          if (trimmed && !trimmed.startsWith('#')) {
            const [key, ...valueParts] = trimmed.split('=');
            if (key && valueParts.length > 0) {
              env[key.trim()] = valueParts.join('=').trim().replace(/^["'](.*)["']$/, '$1');
            }
          }
        }
      }
    } catch (error) {
      console.log('   ℹ️  Could not read existing .env file, creating new one');
    }

    return env;
  }

  private async checkRequiredVariables(currentEnv: Record<string, string>): Promise<string[]> {
    const missing: string[] = [];
    
    for (const req of ENVIRONMENT_CONFIG.required) {
      const value = currentEnv[req.key];
      if (!value || value === 'undefined' || value === 'null' || value.trim() === '') {
        missing.push(req.key);
      }
    }
    
    return missing;
  }

  private async buildTestEnvironment(currentEnv: Record<string, string>): Promise<Record<string, string>> {
    const testEnv: Record<string, string> = { ...currentEnv };
    
    // Set required variables with defaults if missing
    for (const req of ENVIRONMENT_CONFIG.required) {
      if (!testEnv[req.key] || testEnv[req.key] === 'undefined') {
        testEnv[req.key] = req.defaultValue || 'test-value';
        console.log(`   ✅ Set ${req.key} to test default`);
      }
    }
    
    // Set optional variables with defaults if missing
    for (const opt of ENVIRONMENT_CONFIG.optional) {
      if (!testEnv[opt.key] || testEnv[opt.key] === 'undefined') {
        testEnv[opt.key] = opt.defaultValue;
        console.log(`   ✅ Set ${opt.key} to ${opt.defaultValue}`);
      }
    }
    
    return testEnv;
  }

  private async writeEnvironmentFile(env: Record<string, string>): Promise<void> {
    const envLines: string[] = [
      '# ElizaOS CLI Test Environment Configuration',
      '# Generated automatically for scenario testing',
      `# Created: ${new Date().toISOString()}`,
      '',
      '# Required API Keys',
    ];

    // Add required variables
    for (const req of ENVIRONMENT_CONFIG.required) {
      envLines.push(`# ${req.description}`);
      const value = env[req.key] || req.defaultValue || '';
      envLines.push(`${req.key}=${value}`);
      envLines.push('');
    }

    envLines.push('# Optional Configuration');
    
    // Add optional variables
    for (const opt of ENVIRONMENT_CONFIG.optional) {
      envLines.push(`# ${opt.description}`);
      const value = env[opt.key] || opt.defaultValue;
      envLines.push(`${opt.key}=${value}`);
      envLines.push('');
    }

    // Write to .env.test first (safer)
    await writeFile(this.testEnvPath, envLines.join('\n'));
    console.log(`   📝 Written test environment to: ${this.testEnvPath}`);
    
    // Also update .env if user confirms or if it doesn't exist
    const envExists = existsSync(this.envPath);
    if (!envExists) {
      await writeFile(this.envPath, envLines.join('\n'));
      console.log(`   📝 Created main environment file: ${this.envPath}`);
    } else {
      console.log(`   ℹ️  Existing .env file preserved, test config in .env.test`);
    }
  }

  private async createTestEnvironmentFile(env: Record<string, string>): Promise<void> {
    // Create .env.test with current configuration for testing
    const testConfig = { ...env };
    
    // Ensure test defaults for missing values
    for (const req of ENVIRONMENT_CONFIG.required) {
      if (!testConfig[req.key]) {
        testConfig[req.key] = req.defaultValue || 'test-value';
      }
    }
    
    for (const opt of ENVIRONMENT_CONFIG.optional) {
      if (!testConfig[opt.key]) {
        testConfig[opt.key] = opt.defaultValue;
      }
    }
    
    await this.writeEnvironmentFile(testConfig);
  }

  private logEnvironmentSummary(env: Record<string, string>): void {
    console.log('\n📊 Required Variables:');
    for (const req of ENVIRONMENT_CONFIG.required) {
      const value = env[req.key];
      const status = value && value !== 'test-value' ? '✅ SET' : '⚠️  TEST DEFAULT';
      const displayValue = req.sensitive ? '***' : (value || 'not set');
      console.log(`   ${req.key}: ${status} (${req.sensitive ? 'hidden' : displayValue})`);
    }

    console.log('\n📊 Optional Variables:');
    ENVIRONMENT_CONFIG.optional.slice(0, 5).forEach(opt => {
      const value = env[opt.key];
      console.log(`   ${opt.key}: ${value || opt.defaultValue}`);
    });
    
    if (ENVIRONMENT_CONFIG.optional.length > 5) {
      console.log(`   ... and ${ENVIRONMENT_CONFIG.optional.length - 5} more`);
    }

    console.log('\n🚀 Environment is ready for scenario testing!');
    console.log('💡 Use real API keys for actual testing (replace test-key-* values)');
  }

  async validateEnvironment(): Promise<boolean> {
    console.log('🔍 Validating test environment...');
    
    const currentEnv = await this.getCurrentEnvironment();
    const missingRequired = await this.checkRequiredVariables(currentEnv);
    
    if (missingRequired.length === 0) {
      console.log('✅ Environment validation passed');
      return true;
    } else {
      console.log('❌ Environment validation failed');
      console.log('Missing:', missingRequired.join(', '));
      return false;
    }
  }
}

// Main execution
async function main() {
  const args = process.argv.slice(2);
  const command = args[0] || 'setup';
  
  const setup = new EnvironmentSetup();
  
  switch (command) {
    case 'setup':
      await setup.setupEnvironment();
      break;
    case 'validate':
      const valid = await setup.validateEnvironment();
      process.exit(valid ? 0 : 1);
      break;
    default:
      console.log('Usage: bun run scripts/setup-test-environment.ts [setup|validate]');
      console.log('  setup   - Setup test environment configuration');
      console.log('  validate - Validate current environment');
      break;
  }
}

main().catch(error => {
  console.error('💥 Environment setup failed:', error);
  process.exit(1);
});