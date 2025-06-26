#!/usr/bin/env bun

/**
 * Individual Scenario Test Runner with Success Rate Tracking
 * Runs each scenario multiple times to measure 80%+ success rates
 */

import { execSync } from 'child_process';
import { existsSync } from 'fs';
import { writeFile, readFile } from 'fs/promises';
import { join } from 'path';

interface ScenarioConfig {
  id: string;
  name: string;
  description: string;
  scriptPath: string;
  targetSuccessRate: number;
  maxRetries: number;
  timeout: number;
}

interface TestRun {
  runNumber: number;
  timestamp: number;
  duration: number;
  success: boolean;
  error?: string;
  details?: any;
}

interface ScenarioResults {
  scenario: ScenarioConfig;
  runs: TestRun[];
  successRate: number;
  averageDuration: number;
  passed: boolean;
  errors: string[];
}

const SCENARIOS: ScenarioConfig[] = [
  {
    id: 'github-todo-workflow',
    name: 'GitHub Todo Workflow Integration',
    description: 'Tests GitHub plugin integration with Todo management',
    scriptPath: 'scripts/tests/test-github-todo-scenario.ts',
    targetSuccessRate: 0.8,
    maxRetries: 10,
    timeout: 180000 // 3 minutes
  },
  {
    id: 'production-plugin-config', 
    name: 'Production Plugin Configuration',
    description: 'Tests production-ready plugin configuration system',
    scriptPath: 'scripts/tests/test-production-plugin-scenario.ts',
    targetSuccessRate: 0.8,
    maxRetries: 10,
    timeout: 240000 // 4 minutes
  },
  {
    id: 'autocoder-plugin',
    name: 'Autocoder Plugin Functionality',
    description: 'Tests autocoder plugin for code generation',
    scriptPath: 'scripts/test-autocoder.ts',
    targetSuccessRate: 0.8,
    maxRetries: 10,
    timeout: 300000 // 5 minutes
  }
];

class ScenarioTestRunner {
  private results: Map<string, ScenarioResults> = new Map();
  private reportPath: string;

  constructor() {
    this.reportPath = join(process.cwd(), 'scenario-success-rates.json');
  }

  async runAllScenarios(): Promise<void> {
    console.log('🎯 Starting Individual Scenario Testing with Success Rate Tracking\n');
    console.log(`Target Success Rate: 80% or higher`);
    console.log(`Test runs per scenario: Up to 10 attempts`);
    console.log('=' .repeat(70));

    for (const scenario of SCENARIOS) {
      console.log(`\n🧪 Testing Scenario: ${scenario.name}`);
      console.log(`   Description: ${scenario.description}`);
      console.log(`   Target: ${(scenario.targetSuccessRate * 100).toFixed(0)}% success rate`);
      
      const results = await this.testScenario(scenario);
      this.results.set(scenario.id, results);
      
      this.logScenarioResults(results);
    }

    await this.generateFinalReport();
  }

  private async testScenario(scenario: ScenarioConfig): Promise<ScenarioResults> {
    const runs: TestRun[] = [];
    const errors: string[] = [];
    
    // Create individual test script if it doesn't exist
    await this.ensureTestScript(scenario);

    for (let runNumber = 1; runNumber <= scenario.maxRetries; runNumber++) {
      console.log(`   Run ${runNumber}/${scenario.maxRetries}...`);
      
      const run = await this.executeScenarioRun(scenario, runNumber);
      runs.push(run);

      if (run.error) {
        errors.push(`Run ${runNumber}: ${run.error}`);
      }

      // Calculate current success rate
      const successfulRuns = runs.filter(r => r.success).length;
      const currentSuccessRate = successfulRuns / runs.length;
      
      console.log(`      Result: ${run.success ? '✅ SUCCESS' : '❌ FAILED'} (${run.duration}ms)`);
      console.log(`      Current Success Rate: ${(currentSuccessRate * 100).toFixed(1)}%`);

      // Stop early if we've reached target success rate with enough runs
      if (runs.length >= 5 && currentSuccessRate >= scenario.targetSuccessRate) {
        console.log(`   🎉 Target success rate achieved early with ${runs.length} runs!`);
        break;
      }

      // Brief pause between runs
      if (runNumber < scenario.maxRetries) {
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    }

    const successfulRuns = runs.filter(r => r.success).length;
    const successRate = successfulRuns / runs.length;
    const averageDuration = runs.reduce((sum, r) => sum + r.duration, 0) / runs.length;
    const passed = successRate >= scenario.targetSuccessRate;

    return {
      scenario,
      runs,
      successRate,
      averageDuration,
      passed,
      errors
    };
  }

  private async executeScenarioRun(scenario: ScenarioConfig, runNumber: number): Promise<TestRun> {
    const startTime = Date.now();
    
    try {
      // Run the scenario test script
      const command = `bun run ${scenario.scriptPath}`;
      
      execSync(command, {
        stdio: 'pipe', // Capture output instead of inheriting
        timeout: scenario.timeout,
        cwd: process.cwd()
      });

      const duration = Date.now() - startTime;
      
      return {
        runNumber,
        timestamp: startTime,
        duration,
        success: true
      };
    } catch (error: any) {
      const duration = Date.now() - startTime;
      
      let errorMessage = 'Unknown error';
      if (error.message) {
        errorMessage = error.message;
      } else if (error.stdout) {
        errorMessage = error.stdout.toString();
      } else if (error.stderr) {
        errorMessage = error.stderr.toString();
      }

      return {
        runNumber,
        timestamp: startTime,
        duration,
        success: false,
        error: errorMessage.substring(0, 200) // Truncate long error messages
      };
    }
  }

  private async ensureTestScript(scenario: ScenarioConfig): Promise<void> {
    const scriptPath = join(process.cwd(), scenario.scriptPath);
    
    if (!existsSync(scriptPath)) {
      console.log(`   📝 Creating test script: ${scenario.scriptPath}`);
      
      let scriptContent = '';
      
      switch (scenario.id) {
        case 'github-todo-workflow':
          scriptContent = await this.generateGitHubTodoTestScript();
          break;
        case 'production-plugin-config':
          scriptContent = await this.generateProductionPluginTestScript();
          break;
        case 'autocoder-plugin':
          // Use existing autocoder test script - don't overwrite
          console.log(`   ℹ️  Using existing autocoder test script`);
          return;
        default:
          scriptContent = await this.generateGenericTestScript(scenario);
      }

      // Ensure directory exists
      const scriptDir = join(process.cwd(), 'scripts/tests');
      execSync(`mkdir -p "${scriptDir}"`, { stdio: 'inherit' });
      
      await writeFile(scriptPath, scriptContent);
      console.log(`   ✅ Created test script: ${scenario.scriptPath}`);
    }
  }

  private async generateGitHubTodoTestScript(): Promise<string> {
    return `#!/usr/bin/env bun

/**
 * Individual GitHub Todo Workflow Scenario Test
 */

import { executeRealScenario } from '../src/scenario-runner/real-scenario-execution.js';
import { githubTodoWorkflowScenario } from '../scenarios/plugin-tests/02-github-todo-workflow.js';

async function testGitHubTodoWorkflow() {
  console.log('🔄 Testing GitHub Todo Workflow Scenario...');
  
  try {
    const result = await executeRealScenario(githubTodoWorkflowScenario, {
      verbose: false,
      timeout: 120000,
      maxSteps: 15
    });

    console.log(\`📊 Result: \${result.passed ? 'PASSED' : 'FAILED'}\`);
    console.log(\`⏱️  Duration: \${result.duration}ms\`);
    console.log(\`📈 Score: \${result.score.toFixed(3)}\`);

    if (result.passed) {
      console.log('✅ GitHub Todo Workflow test passed');
      process.exit(0);
    } else {
      console.log('❌ GitHub Todo Workflow test failed');
      console.log('Errors:', result.errors);
      process.exit(1);
    }
  } catch (error) {
    console.error('💥 GitHub Todo Workflow test error:', error);
    process.exit(1);
  }
}

testGitHubTodoWorkflow();
`;
  }

  private async generateProductionPluginTestScript(): Promise<string> {
    return `#!/usr/bin/env bun

/**
 * Individual Production Plugin Configuration Scenario Test
 */

import { executeRealScenario } from '../src/scenario-runner/real-scenario-execution.js';
import { productionPluginConfigurationScenario } from '../scenarios/plugin-configuration-production-test.js';

async function testProductionPluginConfig() {
  console.log('🔄 Testing Production Plugin Configuration Scenario...');
  
  try {
    const result = await executeRealScenario(productionPluginConfigurationScenario, {
      verbose: false,
      timeout: 180000,
      maxSteps: 15
    });

    console.log(\`📊 Result: \${result.passed ? 'PASSED' : 'FAILED'}\`);
    console.log(\`⏱️  Duration: \${result.duration}ms\`);
    console.log(\`📈 Score: \${result.score.toFixed(3)}\`);

    if (result.passed) {
      console.log('✅ Production Plugin Configuration test passed');
      process.exit(0);
    } else {
      console.log('❌ Production Plugin Configuration test failed');
      console.log('Errors:', result.errors);
      process.exit(1);
    }
  } catch (error) {
    console.error('💥 Production Plugin Configuration test error:', error);
    process.exit(1);
  }
}

testProductionPluginConfig();
`;
  }

  private async generateGenericTestScript(scenario: ScenarioConfig): Promise<string> {
    return `#!/usr/bin/env bun

/**
 * Individual ${scenario.name} Scenario Test
 */

async function test${scenario.id.replace(/-/g, '')}() {
  console.log('🔄 Testing ${scenario.name}...');
  
  try {
    // TODO: Implement specific test logic for ${scenario.name}
    console.log('⚠️  Generic test placeholder - implement specific test logic');
    
    // Simulate test result
    const success = Math.random() > 0.3; // 70% success rate for testing
    
    if (success) {
      console.log('✅ ${scenario.name} test passed');
      process.exit(0);
    } else {
      console.log('❌ ${scenario.name} test failed');
      process.exit(1);
    }
  } catch (error) {
    console.error('💥 ${scenario.name} test error:', error);
    process.exit(1);
  }
}

test${scenario.id.replace(/-/g, '')}();
`;
  }

  private logScenarioResults(results: ScenarioResults): void {
    const { scenario, successRate, runs, passed, averageDuration } = results;
    
    console.log(`\n📊 Results for ${scenario.name}:`);
    console.log(`   Success Rate: ${(successRate * 100).toFixed(1)}% (${runs.filter(r => r.success).length}/${runs.length} runs)`);
    console.log(`   Average Duration: ${averageDuration.toFixed(0)}ms`);
    console.log(`   Status: ${passed ? '🎉 PASSED' : '❌ FAILED'} (target: ${(scenario.targetSuccessRate * 100).toFixed(0)}%)`);
    
    if (results.errors.length > 0) {
      console.log(`   Recent Errors:`);
      results.errors.slice(-3).forEach(error => {
        console.log(`     • ${error}`);
      });
    }
  }

  private async generateFinalReport(): Promise<void> {
    console.log('\n' + '='.repeat(70));
    console.log('📈 FINAL SUCCESS RATE REPORT');
    console.log('='.repeat(70));

    const report = {
      timestamp: new Date().toISOString(),
      targetSuccessRate: 0.8,
      scenarios: Array.from(this.results.values()).map(result => ({
        id: result.scenario.id,
        name: result.scenario.name,
        successRate: result.successRate,
        passed: result.passed,
        runs: result.runs.length,
        averageDuration: result.averageDuration,
        errors: result.errors.length
      })),
      summary: {
        totalScenarios: this.results.size,
        passedScenarios: Array.from(this.results.values()).filter(r => r.passed).length,
        overallSuccessRate: 0
      }
    };

    // Calculate overall success rate
    const allRuns = Array.from(this.results.values()).flatMap(r => r.runs);
    const successfulRuns = allRuns.filter(r => r.success).length;
    report.summary.overallSuccessRate = successfulRuns / allRuns.length;

    // Log summary
    for (const result of this.results.values()) {
      const status = result.passed ? '✅ PASSED' : '❌ FAILED';
      console.log(`${status} ${result.scenario.name}: ${(result.successRate * 100).toFixed(1)}%`);
    }

    console.log(`\n📊 Overall Statistics:`);
    console.log(`   Scenarios Passing Target: ${report.summary.passedScenarios}/${report.summary.totalScenarios}`);
    console.log(`   Overall Success Rate: ${(report.summary.overallSuccessRate * 100).toFixed(1)}%`);
    console.log(`   Total Test Runs: ${allRuns.length}`);

    // Save detailed report
    await writeFile(this.reportPath, JSON.stringify(report, null, 2));
    console.log(`\n💾 Detailed report saved to: ${this.reportPath}`);

    // Exit with appropriate code
    const allPassed = report.summary.passedScenarios === report.summary.totalScenarios;
    if (allPassed) {
      console.log('\n🎉 All scenarios achieved 80%+ success rate!');
      process.exit(0);
    } else {
      console.log('\n⚠️  Some scenarios did not meet the 80% success rate target');
      process.exit(1);
    }
  }
}

// Main execution
async function main() {
  const runner = new ScenarioTestRunner();
  await runner.runAllScenarios();
}

main().catch(error => {
  console.error('💥 Individual scenario testing failed:', error);
  process.exit(1);
});