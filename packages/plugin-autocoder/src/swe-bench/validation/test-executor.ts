import { elizaLogger } from '@elizaos/core';
import * as fs from 'fs/promises';
import * as path from 'path';
import type { TestResults, TestFailure } from '../types';
import { DEFAULT_VALIDATION_CONFIG, type ValidationConfig } from '../config/validation-config';

/**
 * Enhanced test executor with reliable execution and comprehensive result parsing
 */
export class TestExecutor {
  private config: ValidationConfig;

  constructor(config: ValidationConfig = DEFAULT_VALIDATION_CONFIG) {
    this.config = config;
  }

  /**
   * Execute tests with enhanced reliability and comprehensive parsing
   */
  async executeTests(repoPath: string, testPatch?: string): Promise<TestResults> {
    elizaLogger.info('[TEST-EXECUTOR] Starting enhanced test execution');

    try {
      // Apply test patch if provided
      if (testPatch) {
        const patchApplied = await this.applyTestPatch(repoPath, testPatch);
        if (!patchApplied) {
          return this.createFailureResults('Failed to apply test patch');
        }
      }

      // Detect test framework and configuration
      const framework = await this.detectTestFramework(repoPath);
      elizaLogger.info(`[TEST-EXECUTOR] Detected framework: ${framework}`);

      // Execute tests based on framework
      const testResult = await this.runTestsByFramework(repoPath, framework);

      // Enhance results with validation metadata
      const enhancedResults = this.enhanceResults(testResult, framework);

      // Validate results against configuration
      this.validateResults(enhancedResults);

      return enhancedResults;
    } catch (error) {
      elizaLogger.error('[TEST-EXECUTOR] Test execution failed:', error);
      return this.createFailureResults(
        error instanceof Error ? error.message : String(error) || 'Unknown test execution error'
      );
    }
  }

  /**
   * Apply test patch temporarily for validation
   */
  private async applyTestPatch(repoPath: string, testPatch: string): Promise<boolean> {
    try {
      const patchFile = path.join(repoPath, '.swe-bench-test-executor.patch');
      await fs.writeFile(patchFile, testPatch, 'utf-8');

      const applyResult = await Bun.spawn(['git', 'apply', '--check', patchFile], {
        cwd: repoPath,
        stdout: 'pipe',
        stderr: 'pipe',
      });

      if (applyResult.exitCode === 0) {
        // Actually apply the patch
        await Bun.spawn(['git', 'apply', patchFile], {
          cwd: repoPath,
          stdout: 'pipe',
          stderr: 'pipe',
        });

        await fs.unlink(patchFile);
        return true;
      } else {
        const stderr = await new Response(applyResult.stderr).text();
        elizaLogger.warn(`[TEST-EXECUTOR] Test patch check failed: ${stderr}`);
        await fs.unlink(patchFile).catch(() => {});
        return false;
      }
    } catch (error) {
      elizaLogger.error('[TEST-EXECUTOR] Failed to apply test patch:', error);
      return false;
    }
  }

  /**
   * Detect test framework with enhanced detection logic
   */
  private async detectTestFramework(repoPath: string): Promise<string> {
    try {
      const packageJsonPath = path.join(repoPath, 'package.json');
      const hasPackageJson = await fs
        .access(packageJsonPath)
        .then(() => true)
        .catch(() => false);

      if (!hasPackageJson) {
        elizaLogger.warn('[TEST-EXECUTOR] No package.json found');
        return 'unknown';
      }

      const packageJson = JSON.parse(await fs.readFile(packageJsonPath, 'utf-8'));
      const deps = { ...packageJson.dependencies, ...packageJson.devDependencies };

      // Priority order for framework detection
      const frameworks = [
        { name: 'jest', indicators: ['jest', '@types/jest', 'jest-environment-node'] },
        { name: 'vitest', indicators: ['vitest', '@vitest/ui'] },
        { name: 'mocha', indicators: ['mocha', '@types/mocha', 'chai'] },
        { name: 'karma', indicators: ['karma', 'karma-jasmine', 'karma-chrome-launcher'] },
        { name: 'tape', indicators: ['tape', 'tape-catch'] },
        { name: 'jasmine', indicators: ['jasmine', '@types/jasmine'] },
      ];

      for (const framework of frameworks) {
        if (framework.indicators.some((indicator) => deps[indicator])) {
          elizaLogger.info(`[TEST-EXECUTOR] Framework detected: ${framework.name}`);
          return framework.name;
        }
      }

      // Check test script
      const testScript = packageJson.scripts?.test || '';
      for (const framework of frameworks) {
        if (testScript.includes(framework.name)) {
          elizaLogger.info(`[TEST-EXECUTOR] Framework detected from script: ${framework.name}`);
          return framework.name;
        }
      }

      // Check for test files
      const testFiles = await this.findTestFiles(repoPath);
      if (testFiles.length > 0) {
        const firstTestContent = await this.readFirstTestFile(repoPath, testFiles);
        if (firstTestContent) {
          if (firstTestContent.includes('describe(') && firstTestContent.includes('it(')) {
            if (firstTestContent.includes('.toBe(') || firstTestContent.includes('.toEqual(')) {
              return 'jest';
            } else if (firstTestContent.includes('.to.')) {
              return 'mocha';
            }
            return 'mocha'; // default for describe/it pattern
          } else if (firstTestContent.includes('test(')) {
            return 'tape';
          }
        }
      }

      elizaLogger.warn('[TEST-EXECUTOR] Could not detect test framework');
      return 'unknown';
    } catch (error) {
      elizaLogger.error('[TEST-EXECUTOR] Error detecting framework:', error);
      return 'unknown';
    }
  }

  /**
   * Run tests based on detected framework
   */
  private async runTestsByFramework(repoPath: string, framework: string): Promise<TestResults> {
    const startTime = Date.now();

    try {
      let testCommand: string;
      let resultFile: string | null = null;

      switch (framework) {
        case 'jest':
          testCommand =
            'npm test -- --json --outputFile=test-results.json --passWithNoTests --verbose';
          resultFile = 'test-results.json';
          break;
        case 'vitest':
          testCommand = 'npm test -- --reporter=json --outputFile=test-results.json';
          resultFile = 'test-results.json';
          break;
        case 'mocha':
          testCommand = 'npm test -- --reporter json > test-results.json 2>&1';
          resultFile = 'test-results.json';
          break;
        default:
          testCommand = 'npm test';
          break;
      }

      elizaLogger.info(`[TEST-EXECUTOR] Running: ${testCommand}`);

      // Set up environment
      const env = {
        ...process.env,
        NODE_OPTIONS: '--openssl-legacy-provider --no-deprecation',
        CI: 'true',
        NODE_ENV: 'test',
      };

      // Execute test command
      const result = await Bun.spawn(['sh', '-c', `cd ${repoPath} && ${testCommand}`], {
        env,
        stdout: 'pipe',
        stderr: 'pipe',
      });

      const stdout = await new Response(result.stdout).text();
      const stderr = await new Response(result.stderr).text();
      const duration = Date.now() - startTime;

      elizaLogger.info(`[TEST-EXECUTOR] Test execution completed in ${duration}ms`);

      // Parse results
      let testResults: TestResults;

      if (resultFile) {
        testResults = await this.parseJsonResults(repoPath, resultFile, framework);
      } else {
        testResults = this.parseTextOutput(stdout, stderr, framework);
      }

      testResults.duration = duration;
      return testResults;
    } catch (error) {
      const duration = Date.now() - startTime;
      elizaLogger.error('[TEST-EXECUTOR] Test execution error:', error);

      return {
        total: 1,
        passed: 0,
        failed: 1,
        skipped: 0,
        duration,
        failures: [
          {
            test_name: 'Test execution',
            error_message:
              error instanceof Error ? error.message : String(error) || 'Test execution failed',
          },
        ],
        noTestsFound: false,
        frameworkDetected: framework,
        executionReliable: false,
        parsingSuccessful: false,
        validationScore: 0,
      };
    }
  }

  /**
   * Parse JSON test results from supported frameworks
   */
  private async parseJsonResults(
    repoPath: string,
    resultFile: string,
    framework: string
  ): Promise<TestResults> {
    try {
      const resultsPath = path.join(repoPath, resultFile);
      const resultsData = await fs.readFile(resultsPath, 'utf-8');
      const jsonResults = JSON.parse(resultsData);

      let results: TestResults = {
        total: 0,
        passed: 0,
        failed: 0,
        skipped: 0,
        duration: 0,
        failures: []
        noTestsFound: false,
        frameworkDetected: framework,
        executionReliable: true,
        parsingSuccessful: true,
        validationScore: 95,
      };

      switch (framework) {
        case 'jest':
          results.total = jsonResults.numTotalTests || 0;
          results.passed = jsonResults.numPassedTests || 0;
          results.failed = jsonResults.numFailedTests || 0;
          results.skipped = jsonResults.numPendingTests || 0;

          if (jsonResults.testResults) {
            for (const testFile of jsonResults.testResults) {
              if (testFile.assertionResults) {
                for (const assertion of testFile.assertionResults) {
                  if (assertion.status === 'failed') {
                    results.failures!.push({
                      test_name: assertion.fullName || assertion.title || 'Unknown test',
                      error_message: assertion.failureMessages?.join('\n') || 'Test failed',
                    });
                  }
                }
              }
            }
          }
          break;

        case 'mocha':
          if (jsonResults.stats) {
            results.total = jsonResults.stats.tests || 0;
            results.passed = jsonResults.stats.passes || 0;
            results.failed = jsonResults.stats.failures || 0;
            results.skipped = jsonResults.stats.pending || 0;
          }

          if (jsonResults.failures && Array.isArray(jsonResults.failures)) {
            for (const failure of jsonResults.failures) {
              results.failures!.push({
                test_name: failure.fullTitle || failure.title || 'Unknown test',
                error_message: failure.err?.message || failure.err?.stack || 'Test failed',
              });
            }
          }
          break;

        case 'vitest':
          // Vitest JSON format handling
          if (jsonResults.numTotalTestSuites !== undefined) {
            results.total = jsonResults.numTotalTests || 0;
            results.passed = jsonResults.numPassedTests || 0;
            results.failed = jsonResults.numFailedTests || 0;
            results.skipped = jsonResults.numPendingTests || 0;
          }
          break;
      }

      // Clean up results file
      await fs.unlink(resultsPath).catch(() => {});

      return results;
    } catch (error) {
      elizaLogger.warn(
        `[TEST-EXECUTOR] Failed to parse JSON results: ${error instanceof Error ? error.message : String(error)}`
      );
      return {
        total: 0,
        passed: 0,
        failed: 0,
        skipped: 0,
        duration: 0,
        failures: []
        noTestsFound: true,
        frameworkDetected: framework,
        executionReliable: false,
        parsingSuccessful: false,
        validationScore: 10,
      };
    }
  }

  /**
   * Parse text output when JSON results are not available
   */
  private parseTextOutput(stdout: string, stderr: string, framework: string): TestResults {
    const combinedOutput = stdout + '\n' + stderr;

    let results: TestResults = {
      total: 0,
      passed: 0,
      failed: 0,
      skipped: 0,
      duration: 0,
      failures: []
      noTestsFound: false,
      frameworkDetected: framework,
      executionReliable: true,
      parsingSuccessful: true,
      validationScore: 70,
    };

    // Try various parsing patterns
    const patterns = [
      // Jest patterns
      /Tests:\s+(\d+)\s+failed,\s+(\d+)\s+passed/i,
      /(\d+)\s+passing/i,
      /(\d+)\s+failing/i,
      // Mocha patterns
      /(\d+)\s+passing/i,
      /(\d+)\s+failing/i,
      // Generic patterns
      /(\d+)\s+tests?\s+passed/i,
      /(\d+)\s+tests?\s+failed/i,
    ];

    let passMatch =
      combinedOutput.match(/(\d+)\s+passing/i) ||
      combinedOutput.match(/(\d+)\s+passed/i) ||
      combinedOutput.match(/Tests:\s+(\d+)\s+passed/i);

    let failMatch =
      combinedOutput.match(/(\d+)\s+failing/i) ||
      combinedOutput.match(/(\d+)\s+failed/i) ||
      combinedOutput.match(/Tests:\s+(\d+)\s+failed/i);

    if (passMatch) results.passed = parseInt(passMatch[1]);
    if (failMatch) results.failed = parseInt(failMatch[1]);
    results.total = results.passed + results.failed;

    // Check for no tests found
    if (results.total === 0) {
      if (
        combinedOutput.includes('No tests found') ||
        combinedOutput.includes('0 tests') ||
        combinedOutput.length < 50
      ) {
        results.noTestsFound = true;
        results.validationScore = 0;
        elizaLogger.warn('[TEST-EXECUTOR] No tests found in output');
      } else {
        // Assume parsing failed
        results.parsingSuccessful = false;
        results.validationScore = 20;
        elizaLogger.warn('[TEST-EXECUTOR] Could not parse test output');
      }
    }

    // Extract failure information if available
    if (results.failed > 0 || stderr.includes('Error') || stderr.includes('failed')) {
      const errorLines = stderr
        .split('\n')
        .filter((line) => line.includes('Error') || line.includes('fail') || line.includes('✗'));

      for (const errorLine of errorLines.slice(0, 5)) {
        // Limit to 5 errors
        if (errorLine.trim()) {
          results.failures!.push({
            test_name: 'Parsed from output',
            error_message: errorLine.trim(),
          });
        }
      }
    }

    return results;
  }

  /**
   * Enhance results with validation metadata
   */
  private enhanceResults(results: TestResults, framework: string): TestResults {
    // Calculate validation score based on multiple factors
    let validationScore = results.validationScore || 0;

    if (results.noTestsFound) {
      validationScore = 0;
    } else if (!results.parsingSuccessful) {
      validationScore = Math.max(validationScore, 20);
    } else if (results.total === 0) {
      validationScore = 10;
    } else {
      // Base score on test execution success
      const passRate = results.total > 0 ? results.passed / results.total : 0;
      validationScore = Math.min(90, 60 + passRate * 30);

      // Bonus for reliable execution
      if (results.executionReliable) {
        validationScore += 10;
      }
    }

    return {
      ...results,
      validationScore,
      frameworkDetected: framework,
    };
  }

  /**
   * Validate results against configuration
   */
  private validateResults(results: TestResults): void {
    if (results.noTestsFound && !this.config.validation.allowNoTestsAsSuccess) {
      elizaLogger.warn('[TEST-EXECUTOR] No tests found - validation will fail');
    }

    if (results.total < this.config.validation.minTestCount) {
      elizaLogger.warn(
        `[TEST-EXECUTOR] Insufficient tests: ${results.total} < ${this.config.validation.minTestCount}`
      );
    }

    if (
      results.validationScore !== undefined &&
      results.validationScore < this.config.thresholds.minScore
    ) {
      elizaLogger.warn(
        `[TEST-EXECUTOR] Low validation score: ${results.validationScore} < ${this.config.thresholds.minScore}`
      );
    }
  }

  /**
   * Create failure results for error scenarios
   */
  private createFailureResults(errorMessage: string): TestResults {
    return {
      total: 1,
      passed: 0,
      failed: 1,
      skipped: 0,
      duration: 0,
      failures: [
        {
          test_name: 'Test execution',
          error_message: errorMessage,
        },
      ],
      noTestsFound: false,
      frameworkDetected: 'unknown',
      executionReliable: false,
      parsingSuccessful: false,
      validationScore: 0,
    };
  }

  /**
   * Find test files in repository
   */
  private async findTestFiles(repoPath: string): Promise<string[]> {
    const files: string[] = [];

    async function search(dir: string, depth: number = 0) {
      if (depth > 3) return; // Limit search depth

      try {
        const entries = await fs.readdir(dir, { withFileTypes: true });

        for (const entry of entries) {
          if (entry.name.startsWith('.') || entry.name === 'node_modules') continue;

          const fullPath = path.join(dir, entry.name);

          if (entry.isDirectory()) {
            await search(fullPath, depth + 1);
          } else if (entry.isFile() && /\.(test|spec)\.(js|ts|jsx|tsx)$/.test(entry.name)) {
            files.push(path.relative(repoPath, fullPath));
          }
        }
      } catch (error) {
        // Ignore directory access errors
      }
    }

    await search(repoPath);
    return files;
  }

  /**
   * Read first test file content for framework detection
   */
  private async readFirstTestFile(repoPath: string, testFiles: string[]): Promise<string | null> {
    if (testFiles.length === 0) return null;

    try {
      const firstTestPath = path.join(repoPath, testFiles[0]);
      const content = await fs.readFile(firstTestPath, 'utf-8');
      return content.substring(0, 2000); // First 2000 chars
    } catch (error) {
      return null;
    }
  }
}
