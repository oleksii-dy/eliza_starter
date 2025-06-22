#!/usr/bin/env tsx

import { spawn } from 'child_process';
import { logger } from '@elizaos/core';
import * as path from 'path';
import * as fs from 'fs';

interface ScenarioResult {
  name: string;
  passed: boolean;
  duration: number;
  error?: string;
}

interface CategoryResults {
  category: string;
  total: number;
  passed: number;
  failed: number;
  scenarios: ScenarioResult[];
}

async function runCommand(
  command: string,
  args: string[]
): Promise<{
  success: boolean;
  output: string;
  error?: string;
}> {
  return new Promise((resolve) => {
    const child = spawn(command, args, {
      cwd: process.cwd(),
      env: { ...process.env },
      shell: true,
    });

    let output = '';
    let error = '';

    child.stdout.on('data', (data) => {
      const text = data.toString();
      output += text;
      process.stdout.write(text);
    });

    child.stderr.on('data', (data) => {
      const text = data.toString();
      error += text;
      process.stderr.write(text);
    });

    child.on('close', (code) => {
      resolve({
        success: code === 0,
        output,
        error: error || undefined,
      });
    });
  });
}

async function testAllScenarios() {
  logger.info('🚀 Starting comprehensive scenario test suite...\n');

  const results: CategoryResults[] = [];
  const startTime = Date.now();

  // Test categories
  const testConfigs = [
    {
      category: 'Plugin Scenarios',
      command: 'bun',
      args: ['elizaos', 'scenario', 'run', '--source', 'plugin', '--verbose'],
    },
    {
      category: 'Standalone Scenarios',
      command: 'bun',
      args: ['elizaos', 'scenario', 'run', '--source', 'standalone', '--verbose'],
    },
    {
      category: 'Core Scenarios',
      command: 'bun',
      args: [
        'elizaos',
        'scenario',
        'run',
        '--filter',
        'truth|research|coding|workflow',
        '--source',
        'standalone',
      ],
    },
    {
      category: 'Payment Scenarios',
      command: 'bun',
      args: ['elizaos', 'scenario', 'run', '--filter', 'payment', '--verbose'],
    },
    {
      category: 'Rolodex Scenarios',
      command: 'bun',
      args: [
        'elizaos',
        'scenario',
        'run',
        '--filter',
        'rolodex|relationship|trust',
        '--source',
        'standalone',
      ],
    },
  ];

  // Ensure scenarios package is built
  logger.info('📦 Building scenarios package...');
  const buildResult = await runCommand('bun', ['--filter', '@elizaos/scenarios', 'build']);
  if (!buildResult.success) {
    logger.error('Failed to build scenarios package');
    process.exit(1);
  }

  // Run each test category
  for (const config of testConfigs) {
    logger.info(`\n🧪 Testing ${config.category}...`);
    logger.info('─'.repeat(50));

    const result = await runCommand(config.command, config.args);

    // Parse results from output
    const scenarioResults: ScenarioResult[] = [];
    const lines = result.output.split('\n');

    let currentScenario: Partial<ScenarioResult> | null = null;
    for (const line of lines) {
      // Parse scenario start
      if (line.includes('Running scenario:') || line.includes('Running standalone scenario:')) {
        const match = line.match(/Running (?:standalone )?scenario: (.+)/);
        if (match) {
          if (currentScenario && currentScenario.name) {
            // Save previous scenario with default values if not completed
            scenarioResults.push({
              name: currentScenario.name,
              passed: false,
              duration: 0,
              error: 'Incomplete scenario',
            });
          }
          currentScenario = { name: match[1].trim() };
        }
      }

      // Parse scenario result
      if (line.includes('✅ PASS') || line.includes('❌ FAIL')) {
        const passed = line.includes('✅');
        const match = line.match(/(✅ PASS|❌ FAIL) (.+)/);
        if (match && currentScenario) {
          currentScenario.passed = passed;
          // Extract duration if available
          const durationMatch = line.match(/Duration: ([\d.]+)s/);
          if (durationMatch) {
            currentScenario.duration = parseFloat(durationMatch[1]) * 1000;
          }

          if (currentScenario.name) {
            scenarioResults.push({
              name: currentScenario.name,
              passed: currentScenario.passed,
              duration: currentScenario.duration || 0,
            });
          }
          currentScenario = null;
        }
      }

      // Parse errors
      if (line.includes('Error:') && currentScenario) {
        currentScenario.error = line.replace(/.*Error:/, '').trim();
      }
    }

    // Save last scenario if exists
    if (currentScenario && currentScenario.name) {
      scenarioResults.push({
        name: currentScenario.name,
        passed: currentScenario.passed || false,
        duration: currentScenario.duration || 0,
        error: currentScenario.error,
      });
    }

    const categoryResult: CategoryResults = {
      category: config.category,
      total: scenarioResults.length,
      passed: scenarioResults.filter((s) => s.passed).length,
      failed: scenarioResults.filter((s) => !s.passed).length,
      scenarios: scenarioResults,
    };

    results.push(categoryResult);
  }

  // Generate summary report
  const totalDuration = Date.now() - startTime;
  const totalScenarios = results.reduce((sum, r) => sum + r.total, 0);
  const totalPassed = results.reduce((sum, r) => sum + r.passed, 0);
  const totalFailed = results.reduce((sum, r) => sum + r.failed, 0);

  logger.info('\n' + '═'.repeat(80));
  logger.info('📊 COMPREHENSIVE SCENARIO TEST REPORT');
  logger.info('═'.repeat(80));

  // Category breakdown
  logger.info('\n📈 Results by Category:');
  logger.info('─'.repeat(50));
  for (const result of results) {
    const passRate = result.total > 0 ? ((result.passed / result.total) * 100).toFixed(1) : '0.0';
    logger.info(`${result.category}: ${result.passed}/${result.total} passed (${passRate}%)`);

    // Show failed scenarios
    if (result.failed > 0) {
      const failed = result.scenarios.filter((s) => !s.passed);
      for (const scenario of failed) {
        logger.error(`  ❌ ${scenario.name}${scenario.error ? `: ${scenario.error}` : ''}`);
      }
    }
  }

  // Overall summary
  logger.info('\n📊 Overall Summary:');
  logger.info('─'.repeat(50));
  logger.info(`Total Scenarios: ${totalScenarios}`);
  logger.info(`Passed: ${totalPassed}`);
  logger.info(`Failed: ${totalFailed}`);
  logger.info(
    `Success Rate: ${totalScenarios > 0 ? ((totalPassed / totalScenarios) * 100).toFixed(1) : '0.0'}%`
  );
  logger.info(`Total Duration: ${(totalDuration / 1000).toFixed(2)}s`);

  // Save detailed report
  const reportPath = path.join(process.cwd(), 'scenario-test-report.json');
  const report = {
    timestamp: new Date().toISOString(),
    duration: totalDuration,
    summary: {
      total: totalScenarios,
      passed: totalPassed,
      failed: totalFailed,
      successRate: totalScenarios > 0 ? (totalPassed / totalScenarios) * 100 : 0,
    },
    categories: results,
  };

  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
  logger.info(`\n📄 Detailed report saved to: ${reportPath}`);

  // Exit with appropriate code
  process.exit(totalFailed > 0 ? 1 : 0);
}

// Run the test suite
testAllScenarios().catch((error) => {
  logger.error('Test suite failed:', error);
  process.exit(1);
});
