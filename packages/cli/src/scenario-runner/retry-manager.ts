/* eslint-disable radix */
/**
 * Scenario Retry Manager
 * Handles retry logic, parallel execution, and attempt management
 */

import { logger } from '@elizaos/core';
import { ScenarioFailureAnalyzer, type ScenarioFailureAnalysis } from './failure-analyzer.js';

export interface RetryConfiguration {
  maxAttempts: number;
  retryDelay: number; // Base delay in milliseconds
  exponentialBackoff: boolean;
  retryOnCategories: string[]; // Which failure categories should trigger retries
  parallelism: number; // Number of parallel executions per scenario
}

export interface AttemptResult {
  attemptNumber: number;
  success: boolean;
  duration: number;
  result: any;
  error?: string;
  failureAnalysis?: ScenarioFailureAnalysis;
}

export interface ScenarioExecutionSummary {
  scenarioId: string;
  scenarioName: string;
  totalAttempts: number;
  successfulAttempts: number;
  failedAttempts: number;
  attempts: AttemptResult[];
  finalResult: 'success' | 'failure' | 'partial';
  avgDuration: number;
  successRate: number;
  improvementRecommendations: string[];
  shouldRetryNext: boolean;
}

export class ScenarioRetryManager {
  private failureAnalyzer: ScenarioFailureAnalyzer;

  constructor() {
    this.failureAnalyzer = new ScenarioFailureAnalyzer();
    logger.info('ScenarioRetryManager initialized');
  }

  /**
   * Execute a scenario with retry logic and parallel execution
   */
  async executeScenarioWithRetries(
    scenario: any,
    scenarioRunner: (scenario: any, options: any) => Promise<any>,
    options: any,
    retryConfig: RetryConfiguration
  ): Promise<ScenarioExecutionSummary> {
    logger.info(`\n🔄 Starting scenario execution: ${scenario.name}`);
    logger.info(`   Attempts: ${retryConfig.maxAttempts}, Parallel: ${retryConfig.parallelism}`);

    const attempts: AttemptResult[] = [];
    let successfulAttempts = 0;
    let currentAttempt = 1;

    while (currentAttempt <= retryConfig.maxAttempts) {
      logger.info(`\n📊 Attempt ${currentAttempt}/${retryConfig.maxAttempts}`);

      if (retryConfig.parallelism > 1) {
        // Parallel execution
        const parallelResults = await this.executeParallelAttempts(
          scenario,
          scenarioRunner,
          options,
          retryConfig.parallelism,
          currentAttempt
        );

        attempts.push(...parallelResults);
        successfulAttempts += parallelResults.filter((r) => r.success).length;

        // Check if we have enough successes to stop early
        if (successfulAttempts > 0 && this.shouldStopEarly(parallelResults, retryConfig)) {
          logger.info(`✅ Early termination: ${successfulAttempts} successful parallel executions`);
          break;
        }
      } else {
        // Sequential execution
        const attemptResult = await this.executeSingleAttempt(
          scenario,
          scenarioRunner,
          options,
          currentAttempt
        );

        attempts.push(attemptResult);

        if (attemptResult.success) {
          successfulAttempts++;
          logger.info(`✅ Scenario passed on attempt ${currentAttempt}`);
          break;
        } else {
          // Analyze failure and determine if retry is worthwhile
          const shouldRetry = await this.shouldRetryAfterFailure(
            attemptResult,
            scenario,
            retryConfig,
            currentAttempt
          );

          if (!shouldRetry && currentAttempt < retryConfig.maxAttempts) {
            logger.info('⏹️  Stopping retries: failure unlikely to resolve with retries');
            break;
          }

          // Apply delay before next attempt
          if (currentAttempt < retryConfig.maxAttempts) {
            const delay = this.calculateRetryDelay(retryConfig, currentAttempt);
            logger.info(`⏳ Waiting ${delay}ms before next attempt...`);
            await this.delay(delay);
          }
        }
      }

      currentAttempt++;
    }

    return this.generateExecutionSummary(scenario, attempts, successfulAttempts);
  }

  /**
   * Execute multiple parallel attempts of a scenario
   */
  private async executeParallelAttempts(
    scenario: any,
    scenarioRunner: (scenario: any, options: any) => Promise<any>,
    options: any,
    parallelism: number,
    baseAttemptNumber: number
  ): Promise<AttemptResult[]> {
    logger.info(`🚀 Executing ${parallelism} parallel attempts...`);

    const promises = Array.from({ length: parallelism }, (_, index) => {
      const attemptNumber = baseAttemptNumber + index;
      const clonedScenario = this.cloneScenario(
        scenario,
        `${scenario.id}-parallel-${attemptNumber}`
      );

      return this.executeSingleAttempt(
        clonedScenario,
        scenarioRunner,
        { ...options, attemptId: attemptNumber },
        attemptNumber
      );
    });

    const results = await Promise.allSettled(promises);

    return results.map((result, index) => {
      if (result.status === 'fulfilled') {
        return result.value;
      } else {
        return {
          attemptNumber: baseAttemptNumber + index,
          success: false,
          duration: 0,
          result: null,
          error: result.reason?.message || 'Parallel execution failed',
        };
      }
    });
  }

  /**
   * Execute a single attempt of a scenario
   */
  private async executeSingleAttempt(
    scenario: any,
    scenarioRunner: (scenario: any, options: any) => Promise<any>,
    options: any,
    attemptNumber: number
  ): Promise<AttemptResult> {
    const startTime = Date.now();
    logger.info(`   🎯 Executing attempt ${attemptNumber}...`);

    try {
      const result = await scenarioRunner(scenario, options);
      const duration = Date.now() - startTime;
      const success = result?.passed || false;

      logger.info(
        `   ${success ? '✅' : '❌'} Attempt ${attemptNumber} ${success ? 'passed' : 'failed'} (${duration}ms)`
      );

      let failureAnalysis: ScenarioFailureAnalysis | undefined;
      if (!success) {
        failureAnalysis = await this.failureAnalyzer.analyzeFailure(
          result,
          scenario,
          result?.transcript || [],
          result?.errors || []
        );
      }

      return {
        attemptNumber,
        success,
        duration,
        result,
        error: success ? undefined : result?.errors?.[0] || 'Unknown failure',
        failureAnalysis,
      };
    } catch (error) {
      const duration = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : String(error);

      logger.error(`   💥 Attempt ${attemptNumber} crashed: ${errorMessage}`);

      const failureAnalysis = await this.failureAnalyzer.analyzeFailure(
        null,
        scenario,
        [],
        [errorMessage]
      );

      return {
        attemptNumber,
        success: false,
        duration,
        result: null,
        error: errorMessage,
        failureAnalysis,
      };
    }
  }

  /**
   * Determine if retries should continue after a failure
   */
  private async shouldRetryAfterFailure(
    attemptResult: AttemptResult,
    _scenario: any,
    retryConfig: RetryConfiguration,
    currentAttempt: number
  ): Promise<boolean> {
    if (!attemptResult.failureAnalysis) {
      return true; // Retry if we can't analyze the failure
    }

    const analysis = attemptResult.failureAnalysis;

    // Check if the failure category is retryable
    if (!retryConfig.retryOnCategories.includes(analysis.failureCategory)) {
      logger.info(
        `   ⏭️  Skipping retry: failure category '${analysis.failureCategory}' not configured for retries`
      );
      return false;
    }

    // Check retry likelihood from analysis
    if (analysis.retryLikelihood === 'low') {
      logger.info('   ⏭️  Skipping retry: analysis indicates low retry likelihood');
      return false;
    }

    // Check if fix complexity is too high for simple retries
    if (analysis.estimatedFixComplexity === 'complex' && currentAttempt > 1) {
      logger.info('   ⏭️  Skipping retry: complex issues require manual intervention');
      return false;
    }

    logger.info(`   🔄 Continuing with retry: ${analysis.retryLikelihood} likelihood of success`);
    return true;
  }

  /**
   * Check if parallel execution should stop early
   */
  private shouldStopEarly(
    parallelResults: AttemptResult[],
    retryConfig: RetryConfiguration
  ): boolean {
    const successCount = parallelResults.filter((r) => r.success).length;
    const totalCount = parallelResults.length;

    // Stop if we have at least one success and majority passed
    if (successCount > 0 && successCount >= totalCount * 0.5) {
      return true;
    }

    // Stop if all attempts failed with the same unretryable issue
    if (successCount === 0) {
      const failureCategories = parallelResults
        .map((r) => r.failureAnalysis?.failureCategory)
        .filter(Boolean);

      const uniqueCategories = new Set(failureCategories);
      if (uniqueCategories.size === 1) {
        const category = Array.from(uniqueCategories)[0];
        if (category && !retryConfig.retryOnCategories.includes(category)) {
          return true;
        }
      }
    }

    return false;
  }

  /**
   * Calculate retry delay with optional exponential backoff
   */
  private calculateRetryDelay(retryConfig: RetryConfiguration, attemptNumber: number): number {
    if (!retryConfig.exponentialBackoff) {
      return retryConfig.retryDelay;
    }

    // Exponential backoff: delay * (2 ^ attemptNumber) with some jitter
    const exponentialDelay = retryConfig.retryDelay * Math.pow(2, attemptNumber - 1);
    const jitter = Math.random() * 0.1 * exponentialDelay; // 10% jitter
    return Math.min(exponentialDelay + jitter, 30000); // Cap at 30 seconds
  }

  /**
   * Clone a scenario for parallel execution
   */
  private cloneScenario(scenario: any, newId: string): any {
    const cloned = JSON.parse(JSON.stringify(scenario));
    cloned.id = newId;

    // Update character IDs to avoid conflicts
    if (cloned.characters) {
      cloned.characters = cloned.characters.map((char: any, index: number) => ({
        ...char,
        id: `${char.id}-clone-${index}`,
      }));
    }

    return cloned;
  }

  /**
   * Generate comprehensive execution summary
   */
  private generateExecutionSummary(
    scenario: any,
    attempts: AttemptResult[],
    successfulAttempts: number
  ): ScenarioExecutionSummary {
    const totalAttempts = attempts.length;
    const failedAttempts = totalAttempts - successfulAttempts;
    const avgDuration = attempts.reduce((sum, a) => sum + a.duration, 0) / totalAttempts;
    const successRate = (successfulAttempts / totalAttempts) * 100;

    // Determine final result
    let finalResult: 'success' | 'failure' | 'partial';
    if (successfulAttempts === totalAttempts) {
      finalResult = 'success';
    } else if (successfulAttempts === 0) {
      finalResult = 'failure';
    } else {
      finalResult = 'partial';
    }

    // Collect improvement recommendations from failed attempts
    const allRecommendations = attempts
      .filter((a) => a.failureAnalysis)
      .flatMap((a) => a.failureAnalysis!.improvementRecommendations)
      .filter((r) => r.priority === 'high')
      .map((r) => r.action);

    const uniqueRecommendations = [...new Set(allRecommendations)];

    // Determine if retries should be attempted next time
    const shouldRetryNext =
      finalResult === 'failure' &&
      attempts.some((a) => a.failureAnalysis?.retryLikelihood === 'high');

    const summary: ScenarioExecutionSummary = {
      scenarioId: scenario.id,
      scenarioName: scenario.name,
      totalAttempts,
      successfulAttempts,
      failedAttempts,
      attempts,
      finalResult,
      avgDuration,
      successRate,
      improvementRecommendations: uniqueRecommendations,
      shouldRetryNext,
    };

    this.logExecutionSummary(summary);
    return summary;
  }

  /**
   * Log execution summary
   */
  private logExecutionSummary(summary: ScenarioExecutionSummary): void {
    logger.info(`\n📊 EXECUTION SUMMARY: ${summary.scenarioName}`);
    logger.info('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    logger.info(`🎯 Final Result: ${summary.finalResult.toUpperCase()}`);
    logger.info(
      `📈 Success Rate: ${summary.successRate.toFixed(1)}% (${summary.successfulAttempts}/${summary.totalAttempts})`
    );
    logger.info(`⏱️  Average Duration: ${summary.avgDuration.toFixed(0)}ms`);

    if (summary.improvementRecommendations.length > 0) {
      logger.info('💡 Key Improvements:');
      summary.improvementRecommendations.slice(0, 3).forEach((rec, i) => {
        logger.info(`   ${i + 1}. ${rec}`);
      });
    }

    if (summary.shouldRetryNext) {
      logger.info('🔄 Recommendation: Retry this scenario in the next run');
    }

    logger.info('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  }

  /**
   * Utility method for delays
   */
  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Get default retry configuration
   */
  static getDefaultRetryConfig(): RetryConfiguration {
    return {
      maxAttempts: 3,
      retryDelay: 2000, // 2 seconds
      exponentialBackoff: true,
      retryOnCategories: ['timeout', 'api', 'verification', 'unknown'],
      parallelism: 1,
    };
  }

  /**
   * Create retry configuration from CLI options
   */
  static createRetryConfigFromOptions(options: any): RetryConfiguration {
    const defaults = ScenarioRetryManager.getDefaultRetryConfig();

    return {
      maxAttempts: parseInt(options.attempts) || defaults.maxAttempts,
      retryDelay: parseInt(options.retryDelay) || defaults.retryDelay,
      exponentialBackoff: options.exponentialBackoff !== false,
      retryOnCategories: options.retryCategories?.split(',') || defaults.retryOnCategories,
      parallelism: parseInt(options.parallel) || defaults.parallelism,
    };
  }
}
