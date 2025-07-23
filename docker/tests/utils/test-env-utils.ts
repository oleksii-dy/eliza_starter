import dotenv from 'dotenv';
import { existsSync } from 'fs';
import { readFile, writeFile } from 'fs/promises';
import path from 'path';

export interface TestEnvironment {
  originalEnv: Record<string, string | undefined>;
  testEnvFile?: string;
  hasRequiredKeys: boolean;
  availableProviders: string[];
}

/**
 * Required environment variables for LLM testing
 */
export const REQUIRED_LLM_KEYS = [
  'OPENAI_API_KEY',
  'ANTHROPIC_API_KEY',
  'OLLAMA_API_ENDPOINT',
  'GOOGLE_GENERATIVE_AI_API_KEY'
] as const;

/**
 * Optional environment variables for platform testing
 */
export const OPTIONAL_PLATFORM_KEYS = [
  'DISCORD_API_TOKEN',
  'TELEGRAM_BOT_TOKEN',
  'TWITTER_API_KEY',
  'TWITTER_API_SECRET_KEY',
  'TWITTER_ACCESS_TOKEN',
  'TWITTER_ACCESS_TOKEN_SECRET'
] as const;

/**
 * Docker-specific test environment variables
 */
export const DOCKER_TEST_KEYS = [
  'DOCKER_HOST',
  'DOCKER_API_VERSION',
  'COMPOSE_PROJECT_NAME',
  'COMPOSE_FILE'
] as const;

/**
 * Set up test environment following ElizaOS patterns
 */
export async function setupTestEnvironment(): Promise<TestEnvironment> {
  // Save original environment
  const originalEnv: Record<string, string | undefined> = {};
  const allKeys = [...REQUIRED_LLM_KEYS, ...OPTIONAL_PLATFORM_KEYS, ...DOCKER_TEST_KEYS];
  
  allKeys.forEach(key => {
    originalEnv[key] = process.env[key];
  });

  // Try loading test environment files in order of preference
  const testEnvFile = await loadTestEnvironment();
  
  // Check which providers are available
  const availableProviders = detectAvailableProviders();
  
  // Determine if we have at least one LLM provider
  const hasRequiredKeys = availableProviders.length > 0;

  return {
    originalEnv,
    testEnvFile,
    hasRequiredKeys,
    availableProviders
  };
}

/**
 * Restore environment after testing
 */
export function restoreTestEnvironment(testEnv: TestEnvironment): void {
  Object.entries(testEnv.originalEnv).forEach(([key, value]) => {
    if (value === undefined) {
      delete process.env[key];
    } else {
      process.env[key] = value;
    }
  });
}

/**
 * Load test environment files following ElizaOS priority order
 */
async function loadTestEnvironment(): Promise<string | undefined> {
  const possibleEnvFiles = [
    '.env.test',           // Test-specific (highest priority)
    '.env.docker.test',    // Docker test-specific
    '.env',                // Development fallback
    'docker/.env.local',   // Docker development
    '.env.example'         // Template fallback
  ];

  for (const envFile of possibleEnvFiles) {
    if (existsSync(envFile)) {
      console.log(`📄 Loading test environment from: ${envFile}`);
      dotenv.config({ path: envFile });
      return envFile;
    }
  }

  console.log('⚠️ No environment files found - using system environment only');
  return undefined;
}

/**
 * Detect which AI providers are available
 */
export function detectAvailableProviders(): string[] {
  const providers: string[] = [];

  if (process.env.OPENAI_API_KEY) {
    providers.push('openai');
  }

  if (process.env.ANTHROPIC_API_KEY) {
    providers.push('anthropic');
  }

  if (process.env.OLLAMA_API_ENDPOINT) {
    providers.push('ollama');
  }

  if (process.env.GOOGLE_GENERATIVE_AI_API_KEY) {
    providers.push('google');
  }

  return providers;
}

/**
 * Check if specific provider is available
 */
export function isProviderAvailable(provider: string): boolean {
  const providers = detectAvailableProviders();
  return providers.includes(provider.toLowerCase());
}

/**
 * Create test environment file for Docker tests
 */
export async function createDockerTestEnv(targetDir = '.'): Promise<string> {
  const testEnvPath = path.join(targetDir, '.env.docker.test');
  
  const testEnvContent = `# Docker Test Environment
# Created automatically for Docker testing

# Test Database Configuration
TEST_DATABASE_CLIENT=pglite
NODE_ENV=test
LOG_LEVEL=error

# Docker Configuration
DOCKER_BUILDKIT=1
COMPOSE_PROJECT_NAME=eliza-test

# LLM Configuration for Testing
# Add your API keys below for full testing, or leave empty for basic tests
OPENAI_API_KEY=${process.env.OPENAI_API_KEY || ''}
ANTHROPIC_API_KEY=${process.env.ANTHROPIC_API_KEY || ''}
OLLAMA_API_ENDPOINT=${process.env.OLLAMA_API_ENDPOINT || 'http://localhost:11434/api'}

# Platform Integration (Optional)
DISCORD_API_TOKEN=${process.env.DISCORD_API_TOKEN || ''}
TELEGRAM_BOT_TOKEN=${process.env.TELEGRAM_BOT_TOKEN || ''}

# Test-specific settings
ELIZA_TEST_MODE=true
SKIP_DATABASE_SETUP=true
DISABLE_TELEMETRY=true
`;

  await writeFile(testEnvPath, testEnvContent);
  console.log(`✅ Created Docker test environment: ${testEnvPath}`);
  
  return testEnvPath;
}

/**
 * Validate environment for specific test types
 */
export function validateEnvironmentForTest(testType: 'basic' | 'llm' | 'integration'): {
  canRun: boolean;
  missingRequirements: string[];
  warnings: string[];
} {
  const missingRequirements: string[] = [];
  const warnings: string[] = [];

  switch (testType) {
    case 'basic':
      // Basic tests don't require external services
      break;

    case 'llm':
      const availableProviders = detectAvailableProviders();
      if (availableProviders.length === 0) {
        missingRequirements.push('At least one LLM provider (OpenAI, Anthropic, Ollama, Google)');
        warnings.push('LLM tests will be skipped - add API keys to test LLM functionality');
      }
      break;

    case 'integration':
      // Check Docker availability was already tested in main utils
      const availableLLM = detectAvailableProviders();
      if (availableLLM.length === 0) {
        warnings.push('No LLM providers available - integration tests will use mocked responses');
      }
      break;
  }

  return {
    canRun: missingRequirements.length === 0,
    missingRequirements,
    warnings
  };
}

/**
 * Skip test with helpful message if requirements not met
 */
export function skipTestIfRequirementsMissing(
  testType: 'basic' | 'llm' | 'integration',
  testName: string
): boolean {
  const validation = validateEnvironmentForTest(testType);
  
  if (!validation.canRun) {
    console.log(`⏭️ Skipping ${testName}: ${validation.missingRequirements.join(', ')}`);
    return true;
  }

  if (validation.warnings.length > 0) {
    validation.warnings.forEach(warning => {
      console.log(`⚠️ ${warning}`);
    });
  }

  return false;
}

/**
 * Get test-safe API key (masked for logging)
 */
export function getMaskedApiKey(key: string): string {
  const value = process.env[key];
  if (!value) return 'not set';
  
  // Show first few and last few characters
  if (value.length > 8) {
    return `${value.substring(0, 4)}...${value.substring(value.length - 4)}`;
  }
  
  return '***';
}

/**
 * Log environment status for debugging
 */
export function logEnvironmentStatus(verbose = false): void {
  if (!verbose) return;

  console.log('\n🔍 Environment Status:');
  console.log('===================');
  
  console.log('\n📋 LLM Providers:');
  REQUIRED_LLM_KEYS.forEach(key => {
    const status = process.env[key] ? '✅' : '❌';
    const value = verbose ? getMaskedApiKey(key) : process.env[key] ? 'set' : 'not set';
    console.log(`  ${status} ${key}: ${value}`);
  });

  console.log('\n🔌 Platform Integrations:');
  OPTIONAL_PLATFORM_KEYS.forEach(key => {
    const status = process.env[key] ? '✅' : '⚪';
    const value = process.env[key] ? 'set' : 'not set';
    console.log(`  ${status} ${key}: ${value}`);
  });

  const availableProviders = detectAvailableProviders();
  console.log(`\n🎯 Available Providers: ${availableProviders.length > 0 ? availableProviders.join(', ') : 'none'}`);
} 