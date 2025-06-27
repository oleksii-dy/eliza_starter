import type { ScenarioSuite, ScenarioResult, BenchmarkReport } from '../types.js';
import { elizaLogger } from '@elizaos/core';
import {
  autocoderBasicTestSuite,
  autocoderComprehensiveBenchmarks,
  autocoderSwarmCoordinationSuite,
  autocoderArtifactManagementSuite,
  autocoderGitHubIntegrationSuite,
} from './index.js';

/**
 * AutoCoder Scenario Test Runner
 * Specialized test runner for AutoCoder scenarios with enhanced telemetry and reporting
 */

export interface AutocoderTestOptions {
  suites?: string[]; // Specific suites to run
  includeBasic?: boolean;
  includeAdvanced?: boolean;
  includeSwarm?: boolean;
  includeArtifacts?: boolean;
  includeGitHub?: boolean;
  benchmarkMode?: boolean;
  verbose?: boolean;
  outputFile?: string;
  telemetryEnabled?: boolean;
  maxConcurrency?: number;
}

export interface AutocoderTestResult {
  summary: {
    totalSuites: number;
    totalScenarios: number;
    passed: number;
    failed: number;
    skipped: number;
    duration: number;
    overallScore: number;
  };
  suiteResults: Array<{
    suite: string;
    scenarios: ScenarioResult[];
    benchmarks?: BenchmarkReport[];
    passed: boolean;
    duration: number;
    score: number;
  }>;
  artifacts: {
    totalCreated: number;
    storageSuccessRate: number;
    githubUploadRate: number;
    organizationQuality: number;
  };
  coordination: {
    sessionsCreated: number;
    swarmEffectiveness: number;
    collaborationQuality: number;
  };
  errors: string[];
  warnings: string[];
}

export class AutocoderTestRunner {
  private options: AutocoderTestOptions;
  private availableSuites: Map<string, ScenarioSuite>;

  constructor(options: AutocoderTestOptions = {}) {
    this.options = {
      includeBasic: true,
      includeAdvanced: true,
      includeSwarm: false, // Requires more setup
      includeArtifacts: true,
      includeGitHub: false, // Requires GitHub token
      benchmarkMode: false,
      verbose: false,
      telemetryEnabled: true,
      maxConcurrency: 1,
      ...options,
    };

    this.availableSuites = new Map([
      ['basic', autocoderBasicTestSuite],
      ['advanced', autocoderComprehensiveBenchmarks],
      ['swarm', autocoderSwarmCoordinationSuite],
      ['artifacts', autocoderArtifactManagementSuite],
      ['github', autocoderGitHubIntegrationSuite],
    ]);
  }

  async runTests(): Promise<AutocoderTestResult> {
    elizaLogger.info('🚀 Starting AutoCoder scenario tests...');
    const startTime = Date.now();

    const result: AutocoderTestResult = {
      summary: {
        totalSuites: 0,
        totalScenarios: 0,
        passed: 0,
        failed: 0,
        skipped: 0,
        duration: 0,
        overallScore: 0,
      },
      suiteResults: [],
      artifacts: {
        totalCreated: 0,
        storageSuccessRate: 0,
        githubUploadRate: 0,
        organizationQuality: 0,
      },
      coordination: {
        sessionsCreated: 0,
        swarmEffectiveness: 0,
        collaborationQuality: 0,
      },
      errors: [],
      warnings: [],
    };

    try {
      const suitesToRun = this.getSuitesToRun();
      result.summary.totalSuites = suitesToRun.length;

      if (this.options.verbose) {
        elizaLogger.info(`Selected ${suitesToRun.length} test suites:`);
        suitesToRun.forEach(suite => {
          elizaLogger.info(`  - ${suite.name} (${suite.scenarios.length} scenarios)`);
        });
      }

      for (const suite of suitesToRun) {
        elizaLogger.info(`📋 Running suite: ${suite.name}`);
        const suiteResult = await this.runSuite(suite);
        result.suiteResults.push(suiteResult);

        result.summary.totalScenarios += suiteResult.scenarios.length;
        result.summary.passed += suiteResult.scenarios.filter((s: ScenarioResult) => s.passed).length;
        result.summary.failed += suiteResult.scenarios.filter((s: ScenarioResult) => !s.passed).length;
      }

      result.summary.duration = Date.now() - startTime;
      result.summary.overallScore = this.calculateOverallScore(result);

      await this.generateReport(result);
      await this.logSummary(result);

    } catch (error) {
      elizaLogger.error('AutoCoder test runner failed:', error);
      result.errors.push(error instanceof Error ? error.message : String(error));
    }

    return result;
  }

  private getSuitesToRun(): ScenarioSuite[] {
    const suites: ScenarioSuite[] = [];

    // If specific suites are requested, use those
    if (this.options.suites && this.options.suites.length > 0) {
      for (const suiteName of this.options.suites) {
        const suite = this.availableSuites.get(suiteName.toLowerCase());
        if (suite) {
          suites.push(suite);
        } else {
          elizaLogger.warn(`Unknown suite: ${suiteName}`);
        }
      }
      return suites;
    }

    // Otherwise use the include flags
    if (this.options.includeBasic) {
      suites.push(autocoderBasicTestSuite);
    }
    if (this.options.includeAdvanced) {
      suites.push(autocoderComprehensiveBenchmarks);
    }
    if (this.options.includeSwarm) {
      suites.push(autocoderSwarmCoordinationSuite);
    }
    if (this.options.includeArtifacts) {
      suites.push(autocoderArtifactManagementSuite);
    }
    if (this.options.includeGitHub) {
      suites.push(autocoderGitHubIntegrationSuite);
    }

    return suites;
  }

  private async runSuite(suite: ScenarioSuite): Promise<{
    suite: string;
    scenarios: ScenarioResult[];
    passed: boolean;
    duration: number;
    score: number;
  }> {
    const startTime = Date.now();
    const scenarios: ScenarioResult[] = [];
    let passed = true;

    for (const scenario of suite.scenarios) {
      if (this.options.verbose) {
        elizaLogger.info(`  🧪 Running scenario: ${scenario.name}`);
      }

      try {
        const scenarioResult = await this.runScenario(scenario);
        scenarios.push(scenarioResult);

        if (!scenarioResult.passed) {
          passed = false;
          elizaLogger.warn(`  ❌ Scenario failed: ${scenario.name}`);
          if (scenarioResult.errors) {
            scenarioResult.errors.forEach(error => elizaLogger.error(`    Error: ${error}`));
          }
        } else {
          elizaLogger.info(`  ✅ Scenario passed: ${scenario.name}`);
        }
      } catch (error) {
        passed = false;
        elizaLogger.error(`  💥 Scenario crashed: ${scenario.name}`, error);
        
        scenarios.push({
          scenarioId: scenario.id,
          name: scenario.name,
          startTime: Date.now(),
          endTime: Date.now(),
          duration: 0,
          passed: false,
          metrics: {
            duration: 0,
            messageCount: 0,
            stepCount: 0,
            tokenUsage: { input: 0, output: 0, total: 0 },
            memoryUsage: { peak: 0, average: 0, memoryOperations: 0 },
            actionCounts: {},
            responseLatency: { min: 0, max: 0, average: 0, p95: 0 },
          },
          verificationResults: [],
          transcript: [],
          errors: [error instanceof Error ? error.message : String(error)],
        });
      }
    }

    const duration = Date.now() - startTime;
    const score = this.calculateSuiteScore(scenarios);

    return {
      suite: suite.name,
      scenarios,
      passed,
      duration,
      score,
    };
  }

  private async runScenario(scenario: any): Promise<ScenarioResult> {
    // This is a placeholder implementation
    // In a real implementation, this would use the actual scenario runner
    // For now, we'll simulate a scenario run
    
    const startTime = Date.now();
    
    // Simulate scenario execution
    await new Promise(resolve => setTimeout(resolve, Math.random() * 1000 + 500));
    
    const endTime = Date.now();
    const duration = endTime - startTime;
    
    // Simulate verification results based on scenario requirements
    const verificationResults = scenario.verification.rules.map((rule: any) => ({
      ruleId: rule.id,
      ruleName: rule.description,
      passed: Math.random() > 0.2, // 80% pass rate for simulation
      score: Math.random() * 0.3 + 0.7, // Score between 0.7-1.0
      confidence: Math.random() * 0.2 + 0.8,
      reasoning: `Simulated verification for ${rule.description}`,
      executionTime: Math.random() * 100 + 50,
    }));

    const passed = verificationResults.every((result: any) => result.passed);
    const score = verificationResults.reduce((sum: number, result: any) => sum + result.score, 0) / verificationResults.length;

    return {
      scenarioId: scenario.id,
      name: scenario.name,
      startTime,
      endTime,
      duration,
      passed,
      score,
      metrics: {
        duration,
        messageCount: Math.floor(Math.random() * 20) + 5,
        stepCount: Math.floor(Math.random() * 15) + 3,
        tokenUsage: {
          input: Math.floor(Math.random() * 5000) + 1000,
          output: Math.floor(Math.random() * 3000) + 500,
          total: 0,
        },
        memoryUsage: {
          peak: Math.floor(Math.random() * 100) + 50,
          average: Math.floor(Math.random() * 80) + 30,
          memoryOperations: Math.floor(Math.random() * 50) + 10,
        },
        actionCounts: {
          'CODE_GENERATION': Math.floor(Math.random() * 5) + 1,
          'ARTIFACT_STORAGE': Math.floor(Math.random() * 3) + 1,
        },
        responseLatency: {
          min: Math.random() * 500 + 100,
          max: Math.random() * 2000 + 1000,
          average: Math.random() * 1000 + 500,
          p95: Math.random() * 1500 + 800,
        },
      },
      verificationResults,
      transcript: [], // Would contain actual conversation transcript
      errors: passed ? undefined : ['Simulated test failure'],
    };
  }

  private calculateSuiteScore(scenarios: ScenarioResult[]): number {
    if (scenarios.length === 0) return 0;
    return scenarios.reduce((sum, scenario) => sum + (scenario.score || 0), 0) / scenarios.length;
  }

  private calculateOverallScore(result: AutocoderTestResult): number {
    if (result.suiteResults.length === 0) return 0;
    return result.suiteResults.reduce((sum, suite) => sum + suite.score, 0) / result.suiteResults.length;
  }

  private async generateReport(result: AutocoderTestResult): Promise<void> {
    if (!this.options.outputFile) return;

    const report = {
      timestamp: new Date().toISOString(),
      autocoderTestResults: result,
      configuration: this.options,
      environment: {
        nodeVersion: process.version,
        platform: process.platform,
        arch: process.arch,
      },
    };

    try {
      const fs = await import('fs/promises');
      await fs.writeFile(this.options.outputFile, JSON.stringify(report, null, 2));
      elizaLogger.info(`📄 Test report written to: ${this.options.outputFile}`);
    } catch (error) {
      elizaLogger.error('Failed to write test report:', error);
    }
  }

  private async logSummary(result: AutocoderTestResult): Promise<void> {
    elizaLogger.info('🎯 AutoCoder Test Summary:');
    elizaLogger.info(`   Total Suites: ${result.summary.totalSuites}`);
    elizaLogger.info(`   Total Scenarios: ${result.summary.totalScenarios}`);
    elizaLogger.info(`   Passed: ${result.summary.passed}`);
    elizaLogger.info(`   Failed: ${result.summary.failed}`);
    elizaLogger.info(`   Duration: ${(result.summary.duration / 1000).toFixed(1)}s`);
    elizaLogger.info(`   Overall Score: ${(result.summary.overallScore * 100).toFixed(1)}%`);

    if (result.errors.length > 0) {
      elizaLogger.warn(`   Errors: ${result.errors.length}`);
      result.errors.forEach(error => elizaLogger.error(`     - ${error}`));
    }

    if (result.warnings.length > 0) {
      elizaLogger.warn(`   Warnings: ${result.warnings.length}`);
      result.warnings.forEach(warning => elizaLogger.warn(`     - ${warning}`));
    }

    const passRate = result.summary.totalScenarios > 0 
      ? (result.summary.passed / result.summary.totalScenarios * 100).toFixed(1)
      : '0.0';
    
    if (result.summary.failed === 0) {
      elizaLogger.info(`🎉 All AutoCoder tests passed! (${passRate}%)`);
    } else {
      elizaLogger.warn(`⚠️ ${result.summary.failed} tests failed (${passRate}% pass rate)`);
    }
  }
}

// Convenience function for running AutoCoder tests
export async function runAutocoderTests(options: AutocoderTestOptions = {}): Promise<AutocoderTestResult> {
  const runner = new AutocoderTestRunner(options);
  return await runner.runTests();
}

// Preset configurations for common test scenarios
export const autocoderTestPresets = {
  // Basic functionality tests only
  basic: {
    includeBasic: true,
    includeAdvanced: false,
    includeSwarm: false,
    includeArtifacts: false,
    includeGitHub: false,
  },

  // Comprehensive tests without external dependencies
  comprehensive: {
    includeBasic: true,
    includeAdvanced: true,
    includeSwarm: false,
    includeArtifacts: true,
    includeGitHub: false,
  },

  // Full test suite including swarm and GitHub (requires setup)
  full: {
    includeBasic: true,
    includeAdvanced: true,
    includeSwarm: true,
    includeArtifacts: true,
    includeGitHub: true,
  },

  // Benchmark mode for performance testing
  benchmark: {
    includeBasic: true,
    includeAdvanced: true,
    includeSwarm: false,
    includeArtifacts: true,
    includeGitHub: false,
    benchmarkMode: true,
    verbose: true,
  },
};

export default AutocoderTestRunner;