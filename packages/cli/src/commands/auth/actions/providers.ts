/**
 * Provider actions for ElizaOS CLI - AI provider management
 * Manages OpenAI, Groq, and Anthropic API keys
 */

import * as clack from '@clack/prompts';
import { logger } from '@elizaos/core';
// Dynamic import to avoid circular dependencies and package resolution issues
let RealAuthenticationService: any = null;
let TEST_KEYS: any = null;

async function loadAuthService() {
  if (!RealAuthenticationService) {
    try {
      // Try to import the auth service from the plugin
      const authModule = (await import('@elizaos/plugin-elizaos-services')) as any;
      RealAuthenticationService = authModule.RealAuthenticationService;
      TEST_KEYS = authModule.TEST_KEYS;
    } catch (_error) {
      // Fallback implementation for when plugin is not available
      logger.warn('ElizaOS Services plugin not available, using fallback auth service');
      const { FallbackAuthService } = await import('../services/fallback-auth');
      RealAuthenticationService = FallbackAuthService;
      TEST_KEYS = {
        OPENAI_TEST_KEY: 'sk-test-elizaos-openai-key-for-development-only',
        GROQ_TEST_KEY: 'gsk_test-elizaos-groq-key-for-development-only',
        ANTHROPIC_TEST_KEY: 'sk-ant-test-elizaos-anthropic-key-for-development-only',
      };
    }
  }
  return { RealAuthenticationService, TEST_KEYS };
}
import * as fs from 'fs';
import * as path from 'path';
// import * as os from 'os'; // Unused import

/**
 * Get or create the authentication service instance
 */
async function getAuthService() {
  const { RealAuthenticationService: AuthServiceClass } = await loadAuthService();
  return new AuthServiceClass();
}

/**
 * Get status icon for display
 */
function getStatusIcon(status: string): string {
  switch (status) {
    case 'healthy':
      return '✅';
    case 'degraded':
      return '⚠️';
    case 'failed':
      return '❌';
    default:
      return '❓';
  }
}

/**
 * Get key type display
 */
function getKeyTypeDisplay(keyType: string): string {
  switch (keyType) {
    case 'test':
      return '🧪 TEST';
    case 'production':
      return '🚀 PROD';
    case 'invalid':
      return '❌ INVALID';
    default:
      return '❓ UNKNOWN';
  }
}

/**
 * Check AI provider authentication status
 */
export async function providersStatusAction(): Promise<void> {
  clack.intro('🔍 AI Providers Authentication Status');

  const authService = await getAuthService();

  const spinner = clack.spinner();
  spinner.start('Checking AI provider authentication...');

  try {
    const status = await authService.getAuthStatus();
    spinner.stop();

    // Overall status
    const statusIcon = getStatusIcon(status.overall);
    clack.log.message(`${statusIcon} Overall Status: ${status.overall.toUpperCase()}`);
    clack.log.message(`🕒 Last Checked: ${status.lastChecked.toLocaleString()}`);
    clack.log.message(`⚡ Available Capabilities: ${status.capabilities.join(', ')}`);

    console.log(); // Add spacing

    // Provider details
    for (const [provider, result] of Object.entries(status.providers)) {
      const providerResult = result as any; // Type assertion for unknown result
      const icon = providerResult.isValid ? '✅' : '❌';
      const keyType = getKeyTypeDisplay(providerResult.keyType);

      clack.log.message(`${icon} ${provider.toUpperCase()}`);
      clack.log.message(`   Type: ${keyType}`);
      clack.log.message(`   Capabilities: ${providerResult.capabilities?.join(', ') || 'None'}`);

      if (providerResult.errorMessage) {
        clack.log.error(`   Error: ${providerResult.errorMessage}`);
      }

      if (providerResult.rateLimits) {
        clack.log.message(`   Rate Limits: ${providerResult.rateLimits.remaining} remaining`);
      }

      console.log(); // Add spacing between providers
    }

    // Recommendations
    if (status.overall === 'failed') {
      clack.log.warn('No valid API keys configured.');
      clack.log.info('Run "elizaos auth providers setup" to configure API keys.');
    } else if (status.overall === 'degraded') {
      clack.log.warn('Some providers are not configured.');
      clack.log.info('Consider adding more API keys for redundancy.');
    } else {
      clack.log.success('All systems operational!');
    }

    clack.outro('Provider status check complete');
  } catch (error) {
    spinner.stop('✗ Failed to check provider status');
    logger.error('An error occurred:', error);
    clack.outro('Status check failed');
  }
}

/**
 * Interactive AI provider API key setup
 */
export async function providersSetupAction(): Promise<void> {
  clack.intro('🚀 AI Provider API Key Setup');

  const authService = await getAuthService();

  // Check current status
  let currentStatus;
  try {
    currentStatus = await authService.getAuthStatus();
  } catch (error) {
    logger.warn('Could not check current status:', error);
  }

  const providers = [
    {
      name: 'OpenAI',
      key: 'openai',
      envVar: 'OPENAI_API_KEY',
      description: 'Required for text generation, embeddings, and image description',
      getUrl: 'https://platform.openai.com/account/api-keys',
      current: currentStatus?.providers?.openai,
    },
    {
      name: 'Groq',
      key: 'groq',
      envVar: 'GROQ_API_KEY',
      description: 'Optional for fast text generation with Llama models',
      getUrl: 'https://console.groq.com/keys',
      current: currentStatus?.providers?.groq,
    },
    {
      name: 'Anthropic',
      key: 'anthropic',
      envVar: 'ANTHROPIC_API_KEY',
      description: 'Optional for Claude text generation and image description',
      getUrl: 'https://console.anthropic.com/account/keys',
      current: currentStatus?.providers?.anthropic,
    },
  ];

  clack.log.message('Current Provider Status:');
  for (const provider of providers) {
    const status = provider.current;
    const icon = status?.isValid ? '✅' : '❌';
    const keyType = status ? getKeyTypeDisplay(status.keyType) : '❌ NOT CONFIGURED';
    clack.log.message(`${icon} ${provider.name}: ${keyType}`);
  }

  console.log();

  const setupChoice = await clack.select({
    message: 'What would you like to do?',
    options: [
      { value: 'setup', label: 'Set up API keys interactively' },
      { value: 'info', label: 'Show setup information' },
      { value: 'test', label: 'Use test keys for development' },
      { value: 'cancel', label: 'Cancel' },
    ],
  });

  if (clack.isCancel(setupChoice) || setupChoice === 'cancel') {
    clack.outro('Setup cancelled');
    return;
  }

  if (setupChoice === 'info') {
    clack.log.message('📋 API Key Setup Information:');
    console.log();

    for (const provider of providers) {
      clack.log.message(`${provider.name}:`);
      clack.log.message(`  Environment Variable: ${provider.envVar}`);
      clack.log.message(`  Description: ${provider.description}`);
      clack.log.message(`  Get API Key: ${provider.getUrl}`);
      console.log();
    }

    clack.log.message('💡 Setup Instructions:');
    clack.log.message('1. Get API keys from the URLs above');
    clack.log.message('2. Add them to your .env file:');
    clack.log.message('   OPENAI_API_KEY=sk-...');
    clack.log.message('   GROQ_API_KEY=gsk_...');
    clack.log.message('   ANTHROPIC_API_KEY=sk-ant-...');
    clack.log.message('3. Run "elizaos auth providers status" to verify');

    clack.outro('Setup information displayed');
    return;
  }

  if (setupChoice === 'test') {
    const { TEST_KEYS: testKeys } = await loadAuthService();
    clack.log.message('🧪 Test Keys for Development:');
    console.log();

    clack.log.message('These keys are safe for development and testing:');
    console.log();

    for (const [name, key] of Object.entries(testKeys)) {
      const provider = name.replace('_TEST_KEY', '').toLowerCase();
      clack.log.message(`${provider.toUpperCase()}:`);
      clack.log.message(`  Key: ${key}`);
      clack.log.message(`  Usage: export ${name.replace('_TEST_KEY', '_API_KEY')}="${key}"`);
      console.log();
    }

    clack.log.message('💡 Test keys provide simulated responses without real API costs.');
    clack.log.message('💡 Use them for development, testing, and CI/CD pipelines.');

    const useTestKeys = await clack.confirm({
      message: 'Would you like to add these test keys to your .env file?',
      initialValue: true,
    });

    if (!clack.isCancel(useTestKeys) && useTestKeys) {
      try {
        await writeTestKeysToEnv();
        clack.log.success('Test keys added to .env file');
      } catch (error) {
        clack.log.error(
          `Failed to write test keys: ${error instanceof Error ? error.message : 'Unknown error'}`
        );
      }
    }

    clack.outro('Test keys setup complete');
    return;
  }

  if (setupChoice === 'setup') {
    clack.log.message('Interactive API key setup:');
    console.log();

    const envUpdates: { [key: string]: string } = {};

    for (const provider of providers) {
      const shouldSetup = await clack.confirm({
        message: `Set up ${provider.name} API key?`,
        initialValue: !provider.current?.isValid,
      });

      if (clack.isCancel(shouldSetup) || !shouldSetup) {
        continue;
      }

      const apiKey = await clack.password({
        message: `Enter ${provider.name} API key:`,
        validate: (value) => {
          if (!value || value.trim() === '') {
            return 'API key is required';
          }
          // Basic format validation
          if (provider.key === 'openai' && !value.startsWith('sk-')) {
            return 'OpenAI API keys should start with "sk-"';
          }
          if (provider.key === 'groq' && !value.startsWith('gsk_')) {
            return 'Groq API keys should start with "gsk_"';
          }
          if (provider.key === 'anthropic' && !value.startsWith('sk-ant-')) {
            return 'Anthropic API keys should start with "sk-ant-"';
          }
        },
      });

      if (clack.isCancel(apiKey)) {
        continue;
      }

      // Validate the key
      const spinner = clack.spinner();
      spinner.start(`Validating ${provider.name} API key...`);

      try {
        const result = await authService.validateApiKey(provider.key, apiKey);
        spinner.stop();

        if (result.isValid) {
          clack.log.success(`✅ ${provider.name} API key is valid`);
          clack.log.message(`   Type: ${getKeyTypeDisplay(result.keyType)}`);
          clack.log.message(`   Capabilities: ${result.capabilities.join(', ')}`);

          envUpdates[provider.envVar] = apiKey;
        } else {
          clack.log.error(`❌ ${provider.name} API key is invalid`);
          clack.log.error(`   Error: ${result.errorMessage}`);

          const retry = await clack.confirm({
            message: 'Would you like to try a different key?',
            initialValue: true,
          });

          if (!clack.isCancel(retry) && retry) {
            // Restart this provider setup
            continue;
          }
        }
      } catch (error) {
        spinner.stop('✗ Validation failed');
        clack.log.error(
          `Failed to validate ${provider.name} key: ${error instanceof Error ? error.message : 'Unknown error'}`
        );
      }
    }

    // Update .env file
    if (Object.keys(envUpdates).length > 0) {
      const updateEnv = await clack.confirm({
        message: 'Update .env file with new API keys?',
        initialValue: true,
      });

      if (!clack.isCancel(updateEnv) && updateEnv) {
        try {
          await updateEnvFile(envUpdates);
          clack.log.success('✅ .env file updated successfully');
        } catch (error) {
          clack.log.error(
            `Failed to update .env file: ${error instanceof Error ? error.message : 'Unknown error'}`
          );
        }
      }
    }

    clack.outro('API key setup complete');
  }
}

/**
 * Test AI provider API functionality
 */
export async function providersTestAction(options: { provider?: string }): Promise<void> {
  clack.intro('🧪 AI Provider Functionality Test');

  const authService = await getAuthService();

  let providersToTest: string[];

  if (options.provider) {
    if (!['openai', 'groq', 'anthropic'].includes(options.provider)) {
      clack.log.error(`Invalid provider: ${options.provider}`);
      clack.log.message('Valid providers: openai, groq, anthropic');
      clack.outro('Test cancelled');
      return;
    }
    providersToTest = [options.provider];
  } else {
    providersToTest = ['openai', 'groq', 'anthropic'];
  }

  const results: { [provider: string]: any } = {};

  for (const provider of providersToTest) {
    const spinner = clack.spinner();
    spinner.start(`Testing ${provider}...`);

    try {
      const result = await authService.testApiFunctionality(provider);
      spinner.stop();

      results[provider] = result;

      if (result.success) {
        clack.log.success(`✅ ${provider}: ${result.response?.substring(0, 50) || 'SUCCESS'}...`);
        clack.log.message(`   Latency: ${result.latency}ms, Tokens: ${result.tokenUsage || 'N/A'}`);
      } else {
        clack.log.error(`❌ ${provider}: ${result.error}`);
      }
    } catch (error) {
      spinner.stop('✗ Test failed');
      clack.log.error(
        `💥 ${provider}: Test crashed - ${error instanceof Error ? error.message : error}`
      );
      results[provider] = { success: false, error: 'Test crashed' };
    }

    console.log(); // Add spacing
  }

  // Summary
  const successful = Object.values(results).filter((r) => r.success).length;
  const total = Object.keys(results).length;

  clack.log.message(`📊 Test Results: ${successful}/${total} providers working`);

  if (successful === total) {
    clack.outro('🎉 All API tests passed!');
  } else if (successful > 0) {
    clack.outro('⚠️  Some APIs are not working. Check your configuration.');
  } else {
    clack.outro('❌ No APIs are working. Please check your API keys.');
  }
}

/**
 * Show available test keys for development
 */
export async function providersKeysAction(): Promise<void> {
  clack.intro('🧪 Development Test Keys');

  const { TEST_KEYS: testKeys } = await loadAuthService();

  clack.log.message('Available test keys for development and testing:');
  console.log();

  for (const [name, key] of Object.entries(testKeys)) {
    const provider = name.replace('_TEST_KEY', '').toLowerCase();
    clack.log.message(`${provider.toUpperCase()}:`);
    clack.log.message(`  Key: ${key}`);
    clack.log.message(`  Usage: export ${name.replace('_TEST_KEY', '_API_KEY')}="${key}"`);
    console.log();
  }

  clack.log.message('💡 Benefits of test keys:');
  clack.log.message('  • No API costs - completely simulated responses');
  clack.log.message('  • Safe for CI/CD pipelines and development');
  clack.log.message('  • Realistic behavior simulation');
  clack.log.message('  • Easy identification in logs');

  const copyToEnv = await clack.confirm({
    message: 'Would you like to add these test keys to your .env file?',
    initialValue: false,
  });

  if (!clack.isCancel(copyToEnv) && copyToEnv) {
    try {
      await writeTestKeysToEnv();
      clack.log.success('✅ Test keys added to .env file');
    } catch (error) {
      clack.log.error(
        `Failed to write test keys: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  clack.outro('Test keys information displayed');
}

/**
 * Write test keys to .env file
 */
async function writeTestKeysToEnv(): Promise<void> {
  const { TEST_KEYS: testKeys } = await loadAuthService();
  const envPath = path.join(process.cwd(), '.env');
  // Prepare environment content for potential use
  // const envContent = Object.entries(testKeys)
  //   .map(([name, key]) => {
  //     const envVar = name.replace('_TEST_KEY', '_API_KEY');
  //     return `${envVar}="${key}"`;
  //   })
  //   .join('\n');

  // Check if .env exists
  let existingContent = '';
  if (fs.existsSync(envPath)) {
    existingContent = fs.readFileSync(envPath, 'utf-8');
  }

  // Add test keys if they don't already exist
  const linesToAdd: string[] = [];
  for (const [name, key] of Object.entries(testKeys)) {
    const envVar = name.replace('_TEST_KEY', '_API_KEY');
    if (!existingContent.includes(envVar)) {
      linesToAdd.push(`${envVar}="${key}"`);
    }
  }

  if (linesToAdd.length > 0) {
    const newContent = `${existingContent + (existingContent ? '\n' : '') + linesToAdd.join('\n')}\n`;
    fs.writeFileSync(envPath, newContent, 'utf-8');
  }
}

/**
 * Update .env file with new API keys
 */
async function updateEnvFile(updates: { [key: string]: string }): Promise<void> {
  const envPath = path.join(process.cwd(), '.env');

  let existingContent = '';
  if (fs.existsSync(envPath)) {
    existingContent = fs.readFileSync(envPath, 'utf-8');
  }

  let newContent = existingContent;

  for (const [key, value] of Object.entries(updates)) {
    const envLine = `${key}="${value}"`;
    const regex = new RegExp(`^${key}=.*$`, 'm');

    if (regex.test(newContent)) {
      // Update existing key
      newContent = newContent.replace(regex, envLine);
    } else {
      // Add new key
      newContent += `${(newContent && !newContent.endsWith('\n') ? '\n' : '') + envLine}\n`;
    }
  }

  fs.writeFileSync(envPath, newContent, 'utf-8');
}
