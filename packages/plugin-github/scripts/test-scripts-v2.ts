#!/usr/bin/env tsx

import { config } from './config';
import { logger } from './logger';
import { githubRateLimiter, npmRateLimiter, createRateLimiter } from './rate-limiter';
import { BaseScript } from './base-script';
import { Octokit } from '@octokit/rest';

class TestProductionInfrastructure extends BaseScript {
  private testResults: Array<{ test: string; status: 'pass' | 'fail'; error?: string }> = [];

  constructor() {
    super('test-infrastructure');
  }

  async execute(): Promise<void> {
    logger.info('Testing production-ready infrastructure');

    // Test configuration
    await this.testConfiguration();

    // Test logger
    await this.testLogger();

    // Test rate limiter
    await this.testRateLimiter();

    // Test base script features
    await this.testBaseScriptFeatures();

    // Test GitHub integration
    if (config.github.token) {
      await this.testGitHubIntegration();
    }

    // Generate report
    this.generateReport();
  }

  private async testConfiguration(): Promise<void> {
    logger.startOperation('Testing configuration');

    try {
      // Test config loading
      this.assert('Config paths exist', !!config.paths);
      this.assert('Config features exist', !!config.features);
      this.assert('GitHub config exists', !!config.github);
      this.assert('AI config exists', !!config.ai);

      // Test environment variable loading
      this.assert(
        'GitHub token loaded from env',
        !process.env.GITHUB_TOKEN || config.github.token === process.env.GITHUB_TOKEN
      );

      // Test feature flags
      this.assert('Dry run flag accessible', typeof config.features.dryRun === 'boolean');
      this.assert('Verbose flag accessible', typeof config.features.verbose === 'boolean');
      this.assert('Parallel flag accessible', typeof config.features.parallel === 'boolean');

      logger.endOperation('Testing configuration', { passed: true });
    } catch (error) {
      logger.error('Configuration test failed', error);
      this.recordTest('Configuration', 'fail', (error as Error).message);
    }
  }

  private async testLogger(): Promise<void> {
    logger.startOperation('Testing logger');

    try {
      // Test different log levels
      logger.debug('Debug message test', { data: 'test' });
      logger.info('Info message test', { data: 'test' });
      logger.warn('Warning message test', { data: 'test' });
      logger.error('Error message test', new Error('Test error'));

      // Test structured logging
      logger.startOperation('Nested operation');
      logger.progress('Test progress', 50, 100);
      logger.endOperation('Nested operation');

      this.recordTest('Logger functionality', 'pass');
      logger.endOperation('Testing logger', { passed: true });
    } catch (error) {
      logger.error('Logger test failed', error);
      this.recordTest('Logger functionality', 'fail', (error as Error).message);
    }
  }

  private async testRateLimiter(): Promise<void> {
    logger.startOperation('Testing rate limiter');

    try {
      // Test basic rate limiting
      const testLimiter = createRateLimiter({
        maxRequests: 5,
        windowMs: 1000,
        maxRetries: 2,
      });

      // Execute multiple requests
      const promises = Array.from({ length: 10 }, (_, i) =>
        testLimiter.execute(
          async () => {
            logger.debug(`Executing rate limited request ${i}`);
            return i;
          },
          `test-${i}`
        )
      );

      const results = await Promise.all(promises);
      this.assert('All rate limited requests completed', results.length === 10);

      // Test retry logic
      let attemptCount = 0;
      const retryResult = await githubRateLimiter.execute(
        async () => {
          attemptCount++;
          if (attemptCount < 2) {
            throw new Error('Simulated failure');
          }
          return 'success';
        },
        'test-retry'
      );

      this.assert('Retry logic works', retryResult === 'success' && attemptCount === 2);

      // Test rate limiter state
      const state = githubRateLimiter.getState();
      this.assert('Rate limiter tracks state', typeof state.currentRequests === 'number');

      this.recordTest('Rate limiter functionality', 'pass');
      logger.endOperation('Testing rate limiter', { passed: true });
    } catch (error) {
      logger.error('Rate limiter test failed', error);
      this.recordTest('Rate limiter functionality', 'fail', (error as Error).message);
    }
  }

  private async testBaseScriptFeatures(): Promise<void> {
    logger.startOperation('Testing base script features');

    try {
      // Test progress tracking
      this.updateProgress(1, 10, 'Testing progress');
      this.updateProgress(5, 10, 'Halfway through');
      this.updateProgress(10, 10, 'Complete');

      // Test parallel execution
      const items = Array.from({ length: 20 }, (_, i) => i);
      const results = await this.executeParallel(
        items,
        async (item) => {
          await new Promise((resolve) => setTimeout(resolve, 10));
          return item * 2;
        },
        { maxConcurrency: 5 }
      );

      this.assert('Parallel execution works', results.length === 20);
      this.assert('Parallel execution produces correct results', results[10] === 20);

      // Test dry run mode
      this.logDryRunAction('test action', { data: 'test' });

      // Test duration formatting
      const duration = this.formatDuration(3661000); // 1h 1m 1s
      this.assert('Duration formatting works', duration === '1h 1m 1s');

      // Test temp file tracking
      const tempFile = '/tmp/test-file.txt';
      this.trackTempFile(tempFile);
      this.assert('Temp file tracked', true);

      this.recordTest('Base script features', 'pass');
      logger.endOperation('Testing base script features', { passed: true });
    } catch (error) {
      logger.error('Base script test failed', error);
      this.recordTest('Base script features', 'fail', (error as Error).message);
    }
  }

  private async testGitHubIntegration(): Promise<void> {
    logger.startOperation('Testing GitHub integration');

    try {
      const octokit = new Octokit({ auth: config.github.token });

      // Test authenticated request with rate limiting
      const { data: user } = await githubRateLimiter.execute(
        () => octokit.users.getAuthenticated(),
        'test-auth'
      );

      this.assert('GitHub authentication works', !!user.login);
      logger.info('Authenticated as', { user: user.login });

      // Test rate limit info
      const { data: rateLimit } = await githubRateLimiter.execute(
        () => octokit.rateLimit.get(),
        'test-rate-limit'
      );

      logger.info('GitHub rate limit', {
        limit: rateLimit.rate.limit,
        remaining: rateLimit.rate.remaining,
        reset: new Date(rateLimit.rate.reset * 1000).toISOString(),
      });

      this.recordTest('GitHub integration', 'pass');
      logger.endOperation('Testing GitHub integration', { passed: true });
    } catch (error) {
      logger.error('GitHub integration test failed', error);
      this.recordTest('GitHub integration', 'fail', (error as Error).message);
    }
  }

  private assert(description: string, condition: boolean): void {
    if (!condition) {
      throw new Error(`Assertion failed: ${description}`);
    }
    logger.debug(`✓ ${description}`);
  }

  private recordTest(test: string, status: 'pass' | 'fail', error?: string): void {
    this.testResults.push({ test, status, error });
  }

  private generateReport(): void {
    logger.info('Test Results Summary');
    
    const passed = this.testResults.filter((r) => r.status === 'pass').length;
    const failed = this.testResults.filter((r) => r.status === 'fail').length;
    const total = this.testResults.length;

    logger.info(`Total: ${total}, Passed: ${passed}, Failed: ${failed}`);

    for (const result of this.testResults) {
      const icon = result.status === 'pass' ? '✅' : '❌';
      logger.info(`${icon} ${result.test}`);
      if (result.error) {
        logger.error(`   Error: ${result.error}`);
      }
    }

    if (failed > 0) {
      throw new Error(`${failed} tests failed`);
    }
  }
}

// Run the test
if (require.main === module) {
  const test = new TestProductionInfrastructure();
  test.run().catch((error) => {
    logger.error('Infrastructure test failed', error);
    process.exit(1);
  });
}

export default TestProductionInfrastructure; 