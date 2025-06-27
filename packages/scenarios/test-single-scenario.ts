#!/usr/bin/env tsx

import { ConsolidatedScenarioTestRunner } from './src/test-runner.js';
import chalk from 'chalk';

async function testSingleScenario() {
  console.log(chalk.cyan('🧪 Testing research knowledge integration scenario'));
  
  const runner = new ConsolidatedScenarioTestRunner();

  try {
    // Filter to only run the research knowledge integration scenario
    const result = await runner.runAllScenarios({
      verbose: true,
      continueOnError: false,
      maxConcurrency: 1,
      filter: 'Research',
      category: 'integration',
    });
    
    console.log(chalk.green('\n✅ Test completed!'));
    console.log('Results:', {
      totalScenarios: result.totalScenarios,
      passed: result.passed,
      failed: result.failed,
      duration: result.duration,
      passRate: result.summary.passRate,
    });

    if (result.failed > 0) {
      console.log(chalk.red('\nFailed scenarios:'));
      result.results.forEach((scenarioResult) => {
        if (scenarioResult.status === 'failed') {
          console.log(chalk.red(`- ${scenarioResult.scenario}`));
          if (scenarioResult.errors) {
            scenarioResult.errors.forEach((error) => {
              console.log(chalk.red(`  Error: ${error}`));
            });
          }
        }
      });
    }

  } catch (error) {
    console.error(chalk.red('❌ Test failed:'), error);
    process.exit(1);
  }
}

testSingleScenario();