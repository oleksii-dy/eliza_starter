#!/usr/bin/env tsx

import { RealBenchmarkRunner } from './real-benchmark-runner.js';
import chalk from 'chalk';

const paymentScenarios = [
  { id: '60-payment-basic-flow', name: 'Basic Payment Flow Test' },
  { id: '61-payment-trust-exemptions', name: 'Payment Trust Exemptions Test' },
  { id: '62-payment-confirmation-flow', name: 'Payment Confirmation Task Flow Test' },
  { id: '63-payment-insufficient-funds', name: 'Insufficient Funds and Payment Failure Test' },
  { id: '64-payment-multi-currency', name: 'Multi-Currency Payment and Auto-Liquidation Test' },
  { id: '65-payment-multi-agent', name: 'Multi-Agent Payment Collaboration Test' },
];

async function testAllPaymentScenarios() {
  console.log(chalk.blue('🧪 Testing All Payment Scenarios (60-65)'));
  console.log(chalk.yellow('=' .repeat(60)));

  const results: any[] = [];

  for (const scenario of paymentScenarios) {
    console.log(chalk.cyan(`\n📊 Running scenario: ${scenario.id}`));
    console.log(chalk.gray(`   Name: ${scenario.name}`));
    
    const runner = new RealBenchmarkRunner({
      apiKeys: {},
      filter: scenario.name, // Use exact name for filtering
      verbose: false,
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

testAllPaymentScenarios().catch(console.error); 