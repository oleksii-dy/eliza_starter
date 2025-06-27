#!/usr/bin/env bun

/**
 * Fixed Payment Scenarios Test Runner
 * Properly initializes all required services and configurations
 */

import { RealBenchmarkRunner } from './real-benchmark-runner.js';
import chalk from 'chalk';
import { randomBytes } from 'crypto';

// Ensure all required environment variables are set for plugins
function setupTestEnvironment() {
  console.log(chalk.yellow('🔧 Setting up test environment...'));

  // Database setup (required for payment plugin)
  if (!process.env.POSTGRES_URL) {
    // Use test database URL
    process.env.POSTGRES_URL = 'postgresql://test:test@localhost:5432/elizaos_test';
    console.log(chalk.yellow('   Set POSTGRES_URL for test database'));
  }

  // Secret salt (required for encryption)
  if (!process.env.SECRET_SALT) {
    process.env.SECRET_SALT = randomBytes(32).toString('hex');
    console.log(chalk.yellow('   Generated SECRET_SALT'));
  }

  // Solana configuration
  if (!process.env.SOL_ADDRESS) {
    // Use devnet test wallet
    process.env.SOL_ADDRESS = '11111111111111111111111111111111';
    console.log(chalk.yellow('   Set SOL_ADDRESS for test wallet'));
  }

  if (!process.env.SOLANA_RPC_URL) {
    process.env.SOLANA_RPC_URL = 'https://api.devnet.solana.com';
    console.log(chalk.yellow('   Set SOLANA_RPC_URL to devnet'));
  }

  if (!process.env.SLIPPAGE) {
    process.env.SLIPPAGE = '5';
    console.log(chalk.yellow('   Set SLIPPAGE to 5%'));
  }

  // EVM configuration
  if (!process.env.EVM_PRIVATE_KEY) {
    // Use test private key (DO NOT USE IN PRODUCTION)
    process.env.EVM_PRIVATE_KEY = '0x' + randomBytes(32).toString('hex');
    console.log(chalk.yellow('   Generated test EVM_PRIVATE_KEY'));
  }

  if (!process.env.EVM_RPC_URL) {
    process.env.EVM_RPC_URL = 'https://eth-sepolia.g.alchemy.com/v2/demo';
    console.log(chalk.yellow('   Set EVM_RPC_URL to Sepolia testnet'));
  }

  // Trust plugin configuration
  if (!process.env.TRUST_SCORE_DATABASE) {
    process.env.TRUST_SCORE_DATABASE = ':memory:';
    console.log(chalk.yellow('   Set TRUST_SCORE_DATABASE to in-memory'));
  }

  // Set test environment flag
  process.env.NODE_ENV = 'test';
  process.env.ELIZA_ENV = 'test';

  console.log(chalk.green('✅ Test environment configured'));
}

// Payment scenarios to test
const paymentScenarios = [
  { id: '60-payment-basic-flow', name: 'Basic Payment Flow Test' },
  { id: '61-payment-trust-exemptions', name: 'Payment Trust Exemptions Test' },
  { id: '62-payment-confirmation-flow', name: 'Payment Confirmation Task Flow Test' },
  { id: '63-payment-insufficient-funds', name: 'Insufficient Funds and Payment Failure Test' },
  { id: '64-payment-multi-currency', name: 'Multi-Currency Payment and Auto-Liquidation Test' },
  { id: '65-payment-multi-agent', name: 'Multi-Agent Payment Collaboration Test' },
];

async function testAllPaymentScenarios() {
  console.log(chalk.blue('🚀 Testing All Payment Scenarios with Full Plugin Support'));
  console.log(chalk.blue('=' .repeat(60)));

  // Setup test environment
  setupTestEnvironment();

  const results: any[] = [];

  // First, restore original plugin configurations in all scenarios
  console.log(chalk.cyan('\n📝 Restoring original plugin configurations...'));
  await restoreOriginalScenarios();

  for (const scenario of paymentScenarios) {
    console.log(chalk.cyan(`\n📊 Running scenario: ${scenario.id}`));
    console.log(chalk.gray(`   Name: ${scenario.name}`));
    
    const runner = new RealBenchmarkRunner({
      apiKeys: {
        // Add any API keys if available
        OPENAI_API_KEY: process.env.OPENAI_API_KEY || '',
        ANTHROPIC_API_KEY: process.env.ANTHROPIC_API_KEY || '',
      },
      filter: scenario.name, // Use exact name for filtering
      verbose: true, // Enable verbose logging to debug issues
      timeoutMs: 180000,
    });

    try {
      const scenarioResults = await runner.runBenchmarks();
      
      if (scenarioResults.length === 0) {
        console.log(chalk.red(`❌ ${scenario.id} - No scenario found with filter`));
        results.push({
          scenarioName: scenario.id,
          status: 'error',
          errors: ['Scenario not found'],
        });
        continue;
      }
      
      results.push(...scenarioResults);
      
      const passed = scenarioResults.every(r => r.status === 'passed');
      if (passed) {
        console.log(chalk.green(`✅ ${scenario.id} PASSED in ${scenarioResults[0].duration}ms`));
      } else {
        console.log(chalk.red(`❌ ${scenario.id} FAILED`));
        scenarioResults.forEach(r => {
          if (r.errors?.length > 0) {
            console.log(chalk.red(`   Errors: ${r.errors.join(', ')}`));
          }
        });
      }
    } catch (error) {
      console.error(chalk.red(`❌ ${scenario.id} ERROR:`), error);
      results.push({
        scenarioName: scenario.id,
        status: 'error',
        errors: [error instanceof Error ? error.message : String(error)],
      });
    }
  }

  // Summary
  console.log(chalk.blue('\n📈 PAYMENT SCENARIOS SUMMARY:'));
  console.log(chalk.blue('=' .repeat(60)));
  
  const passed = results.filter(r => r.status === 'passed').length;
  const total = results.length;
  
  results.forEach((result) => {
    const icon = result.status === 'passed' ? '✅' : '❌';
    const color = result.status === 'passed' ? chalk.green : chalk.red;
    console.log(color(`${icon} ${result.scenarioName}: ${result.status}`));
    if (result.errors?.length > 0) {
      console.log(chalk.gray(`   Errors: ${result.errors.join(', ')}`));
    }
  });
  
  console.log(chalk.blue(`\n📊 Total Pass Rate: ${((passed / total) * 100).toFixed(1)}% (${passed}/${total})`));

  // Detailed metrics for passed scenarios
  const passedScenarios = results.filter(r => r.status === 'passed');
  if (passedScenarios.length > 0) {
    console.log(chalk.green('\n✅ Passed Scenarios Metrics:'));
    passedScenarios.forEach(result => {
      console.log(chalk.gray(`   ${result.scenarioName}:`));
      console.log(chalk.gray(`      Duration: ${result.duration}ms`));
      console.log(chalk.gray(`      API Calls: ${result.metrics?.realApiCallsMade || 0}`));
      console.log(chalk.gray(`      Response Quality: ${result.metrics?.responseQuality || 0}`));
    });
  }

  process.exit(passed === total ? 0 : 1);
}

async function restoreOriginalScenarios() {
  const fs = await import('fs/promises');
  const path = await import('path');
  
  // Restore scenario 63 to use all plugins
  const scenario63Path = path.join(process.cwd(), 'src/plugin-scenarios/63-payment-insufficient-funds.ts');
  const scenario63Content = await fs.readFile(scenario63Path, 'utf-8');
  
  if (scenario63Content.includes('// @elizaos/plugin-payment')) {
    console.log(chalk.yellow('   Restoring scenario 63 plugins...'));
    const restored = scenario63Content
      .replace(/\/\/ '@elizaos\/plugin-payment',/g, "'@elizaos/plugin-payment',")
      .replace(/\/\/ '@elizaos\/plugin-evm',/g, "'@elizaos/plugin-evm',")
      .replace(/\/\/ '@elizaos\/plugin-solana',/g, "'@elizaos/plugin-solana',")
      .replace(/script: {[\s\S]*?}(?=,\s*},)/g, 'script: { steps: [] }');
      
    await fs.writeFile(scenario63Path, restored);
  }

  // Restore other scenarios similarly
  const scenarioFiles = [
    '60-payment-basic-flow.ts',
    '61-payment-trust-exemptions.ts', 
    '62-payment-confirmation-flow.ts',
    '64-payment-multi-currency.ts',
    '65-payment-multi-agent.ts'
  ];

  for (const file of scenarioFiles) {
    const filePath = path.join(process.cwd(), 'src/plugin-scenarios', file);
    const content = await fs.readFile(filePath, 'utf-8');
    
    if (content.includes('// @elizaos/plugin-payment') || content.includes('// Temporarily disable')) {
      console.log(chalk.yellow(`   Restoring ${file} plugins...`));
      const restored = content
        .replace(/\/\/ '@elizaos\/plugin-payment',/g, "'@elizaos/plugin-payment',")
        .replace(/\/\/ '@elizaos\/plugin-evm',/g, "'@elizaos/plugin-evm',")
        .replace(/\/\/ '@elizaos\/plugin-solana',/g, "'@elizaos/plugin-solana',")
        .replace(/\/\/ Temporarily disable.*\n/g, '')
        .replace(/\/\/ Disable plugins.*\n/g, '');
      
      // Remove scripted steps if they were added
      if (file !== '65-payment-multi-agent.ts') { // Keep scripts in multi-agent
        const finalRestored = restored.replace(/script: {[\s\S]*?}(?=,\s*},)/g, 'script: { steps: [] }');
        await fs.writeFile(filePath, finalRestored);
      } else {
        await fs.writeFile(filePath, restored);
      }
    }
  }
  
  console.log(chalk.green('✅ All scenarios restored to original plugin configuration'));
}

testAllPaymentScenarios().catch(console.error); 