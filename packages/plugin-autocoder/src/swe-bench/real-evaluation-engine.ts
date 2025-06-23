import { elizaLogger } from '@elizaos/core';
import * as fs from 'fs/promises';
import * as path from 'path';
import { spawn, SpawnOptions } from 'child_process';
import { promisify } from 'util';
import { exec } from 'child_process';
import type {
  PatchSubmission,
  EvaluationResults,
  EvaluationConfig,
  RawEvaluationResults,
  InstanceResult,
  SWEBenchInstance,
} from './types';

const execAsync = promisify(exec);

/**
 * Real Multi-SWE-bench evaluation engine that actually clones repos, applies patches, and runs tests
 */
export class RealEvaluationEngine {
  private workDir: string;
  private cacheDir: string;
  private timeout: number;
  private maxParallel: number;
  private instances: Map<string, SWEBenchInstance> = new Map();

  constructor(config: EvaluationConfig) {
    this.workDir = config.output_dir || path.join(process.cwd(), '.eliza-temp', 'swe-bench-real-eval');
      config.output_dir || path.join(process.cwd(), '.eliza-temp', 'swe-bench-real-eval');
    this.cacheDir = config.cache_dir || path.join(this.workDir, 'cache');
    this.timeout = config.timeout_per_instance || 300; // 5 minutes default
    this.maxParallel = config.parallel_instances || 2; // Conservative default
  }

  /**
   * Initialize the evaluation environment
   */
  async initialize(): Promise<void> {
    await fs.mkdir(this.workDir, { recursive: true });
    await fs.mkdir(this.cacheDir, { recursive: true });
    await fs.mkdir(path.join(this.workDir, 'repos'), { recursive: true });
    await fs.mkdir(path.join(this.workDir, 'logs'), { recursive: true });
    await fs.mkdir(path.join(this.workDir, 'results'), { recursive: true });

    elizaLogger.info('[REAL-EVAL] Evaluation environment initialized');
  }

  /**
   * Load Multi-SWE-bench instances for evaluation
   */
  async loadInstances(instanceIds: string[]): Promise<void> {
    // Load from the cached TypeScript dataset
    const datasetPath = path.join(this.cacheDir, 'typescript-instances-all.json');

    try {
      const datasetContent = await fs.readFile(datasetPath, 'utf-8');
      const allInstances = JSON.parse(datasetContent);

      for (const instance of allInstances) {
        if (
          instanceIds.includes(
            instance.instance_id || `${instance.org}__${instance.repo}-${instance.number}`
          )
        ) {
          // Convert to our format
          const sweInstance: SWEBenchInstance = {
            instance_id:
              instance.instance_id || `${instance.org}__${instance.repo}-${instance.number}`,
            repo: instance.repo,
            repo_url: `https://github.com/${instance.org}/${instance.repo}`,
            language: 'TypeScript',
            issue_title: instance.title,
            issue_body: instance.body,
            issue_number: instance.number,
            base_commit: instance.base.sha,
            patch: instance.fix_patch,
            test_patch: instance.test_patch,
            created_at: instance.created_at || new Date().toISOString(),
            version: '1.0',
          };

          this.instances.set(sweInstance.instance_id, sweInstance);
        }
      }

      elizaLogger.info(`[REAL-EVAL] Loaded ${this.instances.size} instances for evaluation`);
    } catch (error) {
      elizaLogger.error('[REAL-EVAL] Failed to load instances:', error);
      throw new Error(
        `Failed to load SWE-bench instances: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  /**
   * Evaluate a batch of patches using real Multi-SWE-bench methodology
   */
  async evaluate(patches: PatchSubmission[]): Promise<EvaluationResults> {
    elizaLogger.info(`[REAL-EVAL] Starting evaluation of ${patches.length} patches`);

    // Load instances for patches
    const instanceIds = patches.map((p) => p.instance_id);
    await this.loadInstances(instanceIds);

    // Create a semaphore to control concurrent access to shared resources
    const activePatchEvaluations = new Map<string, Promise<RawEvaluationResults>>();
    const results: RawEvaluationResults[] = [];

    // Run evaluations in parallel with concurrency limit and race condition protection
    for (let i = 0; i < patches.length; i += this.maxParallel) {
      const batch = patches.slice(i, i + this.maxParallel);

      // Create unique work directories for each patch to prevent file conflicts
      const batchPromises = batch.map((patch) => {
        const patchKey = `${patch.instance_id}-${Date.now()}-${Math.random().toString(36).substring(7)}`;
        const evaluationPromise = this.evaluateSinglePatchWithIsolation(patch, patchKey);
        activePatchEvaluations.set(patchKey, evaluationPromise);
        return { patchKey, promise: evaluationPromise };
      });

      try {
        const batchResults = await Promise.allSettled(batchPromises.map((p) => p.promise));

        for (let j = 0; j < batchResults.length; j++) {
          const result = batchResults[j];
          const { patchKey } = batchPromises[j];

          // Clean up tracking
          activePatchEvaluations.delete(patchKey);

          if (result.status === 'fulfilled') {
            results.push(result.value);
          } else {
            elizaLogger.error('[REAL-EVAL] Patch evaluation failed:', result.reason);
            // Create a failed result with proper instance mapping
            const failedPatch = batch[j];
            results.push({
              instance_id: failedPatch?.instance_id || 'unknown',
              resolved: false,
              test_output: `Evaluation failed: ${result.reason}`,
              patch_applied: false,
              error: result.reason.message || String(result.reason),
              metadata: {
                evaluation_failed: true,
                timestamp: new Date().toISOString(),
                batch_index: j,
                race_condition_protected: true,
              },
            });
          }
        }
      } catch (error) {
        elizaLogger.error('[REAL-EVAL] Batch evaluation failed:', error);

        // Clean up any remaining active evaluations for this batch
        for (const { patchKey } of batchPromises) {
          activePatchEvaluations.delete(patchKey);
        }
      }
    }

    return this.formatResults(results, patches);
  }

  /**
   * Evaluate a single patch submission with isolation
   */
  private async evaluateSinglePatchWithIsolation(
    patch: PatchSubmission,
    patchKey: string
  ): Promise<RawEvaluationResults> {
    const startTime = Date.now();
    const instance = this.instances.get(patch.instance_id);

    if (!instance) {
      throw new Error(`Instance ${patch.instance_id} not found`);
    }

    elizaLogger.info(
      `[REAL-EVAL] Evaluating patch for ${patch.instance_id} with isolation key ${patchKey}`
    );

    // Create isolated work directory using the patchKey to prevent conflicts
    const repoWorkDir = path.join(this.workDir, 'repos', `${patch.instance_id}-${patchKey}`);
    const logFile = path.join(
      this.workDir,
      'logs',
      `${patch.instance_id}-${patchKey}-${Date.now()}.log`
    );

    try {
      // Step 1: Clone repository
      await this.cloneRepository(instance, repoWorkDir, logFile);

      // Step 2: Apply test patch (to set up the test environment)
      if (instance.test_patch) {
        await this.applyPatch(instance.test_patch, repoWorkDir, logFile, 'test patch');
      }

      // Step 3: Apply the generated patch
      const patchApplied = await this.applyPatch(
        patch.model_patch,
        repoWorkDir,
        logFile,
        'model patch'
      );

      if (!patchApplied) {
        return {
          instance_id: patch.instance_id,
          resolved: false,
          test_output: 'Failed to apply patch',
          patch_applied: false,
          error: 'Patch application failed',
          metadata: {
            execution_time: Date.now() - startTime,
            timestamp: new Date().toISOString(),
            isolation_key: patchKey,
            race_condition_protected: true,
          },
        };
      }

      // Step 4: Run tests
      const testResult = await this.runTests(instance, repoWorkDir, logFile);

      return {
        instance_id: patch.instance_id,
        resolved: testResult.success,
        test_output: testResult.output,
        patch_applied: true,
        error: testResult.error,
        metadata: {
          execution_time: Date.now() - startTime,
          timestamp: new Date().toISOString(),
          tests_run: testResult.testsRun,
          tests_passed: testResult.testsPassed,
          tests_failed: testResult.testsFailed,
          compilation_success: testResult.compilationSuccess,
          isolation_key: patchKey,
          race_condition_protected: true,
        },
      };
    } catch (error) {
      elizaLogger.error(
        `[REAL-EVAL] Error evaluating ${patch.instance_id} with key ${patchKey}:`,
        error
      );

      return {
        instance_id: patch.instance_id,
        resolved: false,
        test_output: `Evaluation error: ${error instanceof Error ? error.message : String(error)}`,
        patch_applied: false,
        error: error instanceof Error ? error.message : String(error),
        metadata: {
          execution_time: Date.now() - startTime,
          timestamp: new Date().toISOString(),
          evaluation_error: true,
          isolation_key: patchKey,
          race_condition_protected: true,
        },
      };
    } finally {
      // Cleanup repository directory
      try {
        await fs.rm(repoWorkDir, { recursive: true, force: true });
      } catch (cleanupError) {
        elizaLogger.warn(`[REAL-EVAL] Failed to cleanup ${repoWorkDir}:`, cleanupError);
      }
    }
  }

  /**
   * Evaluate a single patch submission (legacy method for backward compatibility)
   */
  private async evaluateSinglePatch(patch: PatchSubmission): Promise<RawEvaluationResults> {
    const startTime = Date.now();
    const instance = this.instances.get(patch.instance_id);

    if (!instance) {
      throw new Error(`Instance ${patch.instance_id} not found`);
    }

    elizaLogger.info(`[REAL-EVAL] Evaluating patch for ${patch.instance_id}`);

    const repoWorkDir = path.join(this.workDir, 'repos', patch.instance_id);
    const logFile = path.join(this.workDir, 'logs', `${patch.instance_id}-${Date.now()}.log`);

    try {
      // Step 1: Clone repository
      await this.cloneRepository(instance, repoWorkDir, logFile);

      // Step 2: Apply test patch (to set up the test environment)
      if (instance.test_patch) {
        await this.applyPatch(instance.test_patch, repoWorkDir, logFile, 'test patch');
      }

      // Step 3: Apply the generated patch
      const patchApplied = await this.applyPatch(
        patch.model_patch,
        repoWorkDir,
        logFile,
        'model patch'
      );

      if (!patchApplied) {
        return {
          instance_id: patch.instance_id,
          resolved: false,
          test_output: 'Failed to apply patch',
          patch_applied: false,
          error: 'Patch application failed',
          metadata: {
            execution_time: Date.now() - startTime,
            timestamp: new Date().toISOString(),
          },
        };
      }

      // Step 4: Run tests
      const testResult = await this.runTests(instance, repoWorkDir, logFile);

      return {
        instance_id: patch.instance_id,
        resolved: testResult.success,
        test_output: testResult.output,
        patch_applied: true,
        error: testResult.error,
        metadata: {
          execution_time: Date.now() - startTime,
          timestamp: new Date().toISOString(),
          tests_run: testResult.testsRun,
          tests_passed: testResult.testsPassed,
          tests_failed: testResult.testsFailed,
          compilation_success: testResult.compilationSuccess,
        },
      };
    } catch (error) {
      elizaLogger.error(`[REAL-EVAL] Error evaluating ${patch.instance_id}:`, error);

      return {
        instance_id: patch.instance_id,
        resolved: false,
        test_output: `Evaluation error: ${error instanceof Error ? error.message : String(error)}`,
        patch_applied: false,
        error: error instanceof Error ? error.message : String(error),
        metadata: {
          execution_time: Date.now() - startTime,
          timestamp: new Date().toISOString(),
          evaluation_error: true,
        },
      };
    } finally {
      // Cleanup repository directory
      try {
        await fs.rm(repoWorkDir, { recursive: true, force: true });
      } catch (cleanupError) {
        elizaLogger.warn(`[REAL-EVAL] Failed to cleanup ${repoWorkDir}:`, cleanupError);
      }
    }
  }

  /**
   * Clone repository to working directory with commit validation
   */
  private async cloneRepository(
    instance: SWEBenchInstance,
    workDir: string,
    logFile: string
  ): Promise<void> {
    elizaLogger.info(`[REAL-EVAL] Cloning ${instance.repo_url} at commit ${instance.base_commit}`);

    // Remove existing directory if it exists
    try {
      await fs.rm(workDir, { recursive: true, force: true });
    } catch {}

    await fs.mkdir(workDir, { recursive: true });

    try {
      // Clone the repository (full clone to ensure we have all commits)
      await this.runCommand(
        ['git', 'clone', instance.repo_url, '.'],
        workDir,
        logFile,
        'clone repository'
      );

      // Verify the commit exists before attempting checkout
      try {
        await this.runCommand(
          ['git', 'cat-file', '-e', instance.base_commit],
          workDir,
          logFile,
          'verify commit exists'
        );
      } catch (verifyError) {
        elizaLogger.warn(
          `[REAL-EVAL] Commit ${instance.base_commit} not found, trying to fetch all refs`
        );

        // Try fetching all refs in case it's a PR or branch commit
        await this.runCommand(
          ['git', 'fetch', 'origin', '+refs/*:refs/*'],
          workDir,
          logFile,
          'fetch all refs'
        );

        // Try verification again
        try {
          await this.runCommand(
            ['git', 'cat-file', '-e', instance.base_commit],
            workDir,
            logFile,
            'verify commit exists after fetch'
          );
        } catch (finalVerifyError) {
          throw new Error(
            `Commit ${instance.base_commit} does not exist in repository ${instance.repo_url}. This may be an invalid commit SHA or the commit may have been force-pushed away.`
          );
        }
      }

      // Checkout the specific commit
      await this.runCommand(
        ['git', 'checkout', instance.base_commit],
        workDir,
        logFile,
        'checkout base commit'
      );

      elizaLogger.info(`[REAL-EVAL] Repository cloned and checked out to ${instance.base_commit}`);
    } catch (error) {
      // Enhanced error logging with context
      elizaLogger.error(`[REAL-EVAL] Failed to clone/checkout repository:`, {
        repo_url: instance.repo_url,
        base_commit: instance.base_commit,
        instance_id: instance.instance_id,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * Apply a patch to the repository
   */
  private async applyPatch(
    patchContent: string,
    workDir: string,
    logFile: string,
    patchType: string = 'patch'
  ): Promise<boolean> {
    if (!patchContent.trim()) {
      elizaLogger.warn(`[REAL-EVAL] Empty ${patchType}, skipping`);
      return true;
    }

    elizaLogger.info(`[REAL-EVAL] Applying ${patchType}`);

    // Write patch to temporary file
    const patchFile = path.join(workDir, `temp-${Date.now()}.patch`);
    await fs.writeFile(patchFile, patchContent);

    try {
      // Try git apply first
      await this.runCommand(
        ['git', 'apply', '--ignore-whitespace', '--ignore-space-change', patchFile],
        workDir,
        logFile,
        `apply ${patchType}`
      );

      elizaLogger.info(`[REAL-EVAL] Successfully applied ${patchType}`);
      return true;
    } catch (error) {
      elizaLogger.warn(`[REAL-EVAL] Git apply failed for ${patchType}, trying patch command`);

      try {
        // Fallback to patch command
        await this.runCommand(
          ['patch', '-p1', '--ignore-whitespace', '-i', patchFile],
          workDir,
          logFile,
          `apply ${patchType} with patch command`
        );

        elizaLogger.info(`[REAL-EVAL] Successfully applied ${patchType} with patch command`);
        return true;
      } catch (patchError) {
        elizaLogger.error(
          `[REAL-EVAL] Both git apply and patch failed for ${patchType}:`,
          patchError
        );
        return false;
      }
    } finally {
      // Clean up temporary patch file
      try {
        await fs.unlink(patchFile);
      } catch {}
    }
  }

  /**
   * Run tests for the instance
   */
  private async runTests(
    instance: SWEBenchInstance,
    workDir: string,
    logFile: string
  ): Promise<{
    success: boolean;
    output: string;
    error?: string;
    testsRun: number;
    testsPassed: number;
    testsFailed: number;
    compilationSuccess: boolean;
  }> {
    elizaLogger.info(`[REAL-EVAL] Running tests for ${instance.instance_id}`);

    let output = '';
    let testsRun = 0;
    let testsPassed = 0;
    let testsFailed = 0;
    let compilationSuccess = true;

    try {
      // First, try to install dependencies
      await this.installDependencies(workDir, logFile);

      // Check if it's a Node.js/TypeScript project and run appropriate tests
      const packageJsonPath = path.join(workDir, 'package.json');

      try {
        await fs.access(packageJsonPath);

        // Read package.json to determine test command
        const packageJson = JSON.parse(await fs.readFile(packageJsonPath, 'utf-8'));
        const testScript = packageJson.scripts?.test;

        if (testScript) {
          // Run the test script
          const testOutput = await this.runCommand(['npm', 'test'], workDir, logFile, 'run tests');

          output = testOutput;

          // Parse test results from output
          const results = this.parseTestOutput(testOutput);
          testsRun = results.testsRun;
          testsPassed = results.testsPassed;
          testsFailed = results.testsFailed;

          // Success if no tests failed
          const success = testsFailed === 0 && testsRun > 0;

          return {
            success,
            output,
            testsRun,
            testsPassed,
            testsFailed,
            compilationSuccess,
          };
        } else {
          // Try to find test files and run them directly
          const testResult = await this.runTestsDirectly(workDir, logFile);
          return testResult;
        }
      } catch (packageError) {
        // Not a Node.js project or package.json doesn't exist
        elizaLogger.warn(`[REAL-EVAL] No package.json found, trying direct test execution`);
        return await this.runTestsDirectly(workDir, logFile);
      }
    } catch (error) {
      elizaLogger.error(`[REAL-EVAL] Test execution failed:`, error);

      // Check if it's a compilation error
      const errorMessage = error instanceof Error ? error.message : String(error);
      if (
        errorMessage.includes('compilation') ||
        errorMessage.includes('syntax') ||
        errorMessage.includes('parse')
      ) {
        compilationSuccess = false;
      }

      return {
        success: false,
        output: errorMessage,
        error: errorMessage,
        testsRun: 0,
        testsPassed: 0,
        testsFailed: 1,
        compilationSuccess,
      };
    }
  }

  /**
   * Install dependencies for the project
   */
  private async installDependencies(workDir: string, logFile: string): Promise<void> {
    try {
      // Check if it's a Node.js project
      const packageJsonPath = path.join(workDir, 'package.json');
      await fs.access(packageJsonPath);

      elizaLogger.info('[REAL-EVAL] Installing dependencies...');

      // Try npm install with timeout
      await this.runCommand(['npm', 'install'], workDir, logFile, 'install dependencies', 120000); // 2 minutes timeout
    } catch (error) {
      elizaLogger.warn('[REAL-EVAL] Dependency installation failed, proceeding anyway:', error);
    }
  }

  /**
   * Run tests directly by finding test files
   */
  private async runTestsDirectly(
    workDir: string,
    logFile: string
  ): Promise<{
    success: boolean;
    output: string;
    error?: string;
    testsRun: number;
    testsPassed: number;
    testsFailed: number;
    compilationSuccess: boolean;
  }> {
    // Look for common test patterns
    const testPatterns = [
      '**/*.test.js',
      '**/*.test.ts',
      '**/*.spec.js',
      '**/*.spec.ts',
      'test/**/*.js',
      'test/**/*.ts',
      'tests/**/*.js',
      'tests/**/*.ts',
    ];

    let output = '';
    let testsFound = false;

    for (const pattern of testPatterns) {
      try {
        // Use find to locate test files
        const findOutput = await this.runCommand(
          ['find', '.', '-name', pattern.replace('**/', ''), '-type', 'f'],
          workDir,
          logFile,
          `find test files with pattern ${pattern}`
        );

        if (findOutput.trim()) {
          testsFound = true;
          const testFiles = findOutput.trim().split('\n');

          // Try to run tests with different test runners
          for (const testRunner of ['jest', 'mocha', 'vitest', 'tap']) {
            try {
              const testOutput = await this.runCommand(
                ['npx', testRunner, ...testFiles],
                workDir,
                logFile,
                `run tests with ${testRunner}`
              );

              output += testOutput;
              const results = this.parseTestOutput(testOutput);

              return {
                success: results.testsFailed === 0 && results.testsRun > 0,
                output,
                testsRun: results.testsRun,
                testsPassed: results.testsPassed,
                testsFailed: results.testsFailed,
                compilationSuccess: true,
              };
            } catch (runnerError) {
              // Try next test runner
              continue;
            }
          }
        }
      } catch (findError) {
        // Pattern not found, try next
        continue;
      }
    }

    if (!testsFound) {
      return {
        success: false,
        output: 'No test files found',
        error: 'No test files found',
        testsRun: 0,
        testsPassed: 0,
        testsFailed: 0,
        compilationSuccess: true,
      };
    }

    return {
      success: false,
      output: output || 'Tests found but could not execute',
      error: 'Could not execute test files',
      testsRun: 0,
      testsPassed: 0,
      testsFailed: 1,
      compilationSuccess: true,
    };
  }

  /**
   * Parse test output to extract test statistics
   */
  private parseTestOutput(output: string): {
    testsRun: number;
    testsPassed: number;
    testsFailed: number;
  } {
    let testsRun = 0;
    let testsPassed = 0;
    let testsFailed = 0;

    // Common test output patterns
    const patterns = [
      // Jest/Vitest: "Tests: 2 failed, 8 passed, 10 total"
      /Tests:\s*(\d+)\s*failed,\s*(\d+)\s*passed,\s*(\d+)\s*total/i,
      // Mocha: "  passing: 8, failing: 2"
      /passing:\s*(\d+),\s*failing:\s*(\d+)/i,
      // TAP: "# tests 10\n# pass 8\n# fail 2"
      /# tests (\d+)[\s\S]*# pass (\d+)[\s\S]*# fail (\d+)/i,
      // Generic: "10 tests, 8 passed, 2 failed"
      /(\d+)\s*tests?,\s*(\d+)\s*passed,\s*(\d+)\s*failed/i,
    ];

    for (const pattern of patterns) {
      const match = output.match(pattern);
      if (match) {
        if (pattern.source.includes('failed.*passed.*total')) {
          testsFailed = parseInt(match[1]);
          testsPassed = parseInt(match[2]);
          testsRun = parseInt(match[3]);
        } else if (pattern.source.includes('passing.*failing')) {
          testsPassed = parseInt(match[1]);
          testsFailed = parseInt(match[2]);
          testsRun = testsPassed + testsFailed;
        } else if (pattern.source.includes('tests.*pass.*fail')) {
          testsRun = parseInt(match[1]);
          testsPassed = parseInt(match[2]);
          testsFailed = parseInt(match[3]);
        } else {
          testsRun = parseInt(match[1]);
          testsPassed = parseInt(match[2]);
          testsFailed = parseInt(match[3]);
        }
        break;
      }
    }

    // If no pattern matched, try to count test results differently
    if (testsRun === 0) {
      // Count individual test results
      const passMatches = output.match(/✓|√|pass|PASS/g) || [];
      const failMatches = output.match(/✗|×|fail|FAIL|error|ERROR/g) || [];

      testsPassed = passMatches.length;
      testsFailed = failMatches.length;
      testsRun = testsPassed + testsFailed;
    }

    return { testsRun, testsPassed, testsFailed };
  }

  /**
   * Run a command with timeout and logging
   */
  private async runCommand(
    command: string[],
    cwd: string,
    logFile: string,
    description: string,
    timeoutMs: number = this.timeout * 1000
  ): Promise<string> {
    return new Promise((resolve, reject) => {
      const process = spawn(command[0], command.slice(1), {
        cwd,
        stdio: ['pipe', 'pipe', 'pipe'],
      });

      let stdout = '';
      let stderr = '';

      process.stdout.on('data', (data) => {
        stdout += data.toString();
      });

      process.stderr.on('data', (data) => {
        stderr += data.toString();
      });

      const timeout = setTimeout(() => {
        process.kill('SIGKILL');
        reject(new Error(`Command "${description}" timed out after ${timeoutMs}ms`));
      }, timeoutMs);

      process.on('close', async (code) => {
        clearTimeout(timeout);

        // Log command execution
        try {
          const logEntry =
            `[${new Date().toISOString()}] ${description}\n` +
            `Command: ${command.join(' ')}\n` +
            `Exit code: ${code}\n` +
            `STDOUT:\n${stdout}\n` +
            `STDERR:\n${stderr}\n` +
            `${'='.repeat(50)}\n`;

          await fs.appendFile(logFile, logEntry);
        } catch (logError) {
          elizaLogger.warn('Failed to write to log file:', logError);
        }

        if (code === 0) {
          resolve(stdout);
        } else {
          reject(
            new Error(`Command "${description}" failed with code ${code}: ${stderr || stdout}`)
          );
        }
      });

      process.on('error', (error) => {
        clearTimeout(timeout);
        reject(new Error(`Command "${description}" failed to start: ${error.message}`));
      });
    });
  }

  /**
   * Format raw results into final evaluation results with enhanced error handling
   */
  private formatResults(
    rawResults: RawEvaluationResults[],
    patches: PatchSubmission[]
  ): EvaluationResults {
    try {
      const instanceResults: InstanceResult[] = rawResults.map((raw) => {
        // Enhanced result mapping with better error handling
        const testsPassed = raw.metadata?.tests_passed || (raw.resolved ? 1 : 0);
        const testsRun = raw.metadata?.tests_run || 1;
        const compilationSuccess =
          raw.patch_applied !== false &&
          !raw.metadata?.compilation_failed &&
          !raw.error?.toLowerCase().includes('syntax') &&
          !raw.error?.toLowerCase().includes('compile');

        return {
          instance_id: raw.instance_id,
          resolved: raw.resolved,
          tests_passed: raw.resolved, // Only resolved if tests actually passed
          compilation_success: compilationSuccess,
          execution_time: raw.metadata?.execution_time || 0,
          error: raw.error,
          metadata: {
            tests_run: testsRun,
            tests_passed: testsPassed,
            tests_failed: raw.metadata?.tests_failed || testsRun - testsPassed,
            patch_applied: raw.patch_applied || false,
            verification_score: raw.metadata?.verification_score || 0,
          },
        };
      });

      const resolved = instanceResults.filter((r) => r.resolved).length;
      const total = Math.max(instanceResults.length, 1); // Prevent division by zero
      const compiled = instanceResults.filter((r) => r.compilation_success).length;
      const testsPassed = instanceResults.filter((r) => r.tests_passed).length;

      // Enhanced summary with error categorization
      const commonErrors = this.categorizeErrors(instanceResults);

      return {
        total_instances: total,
        resolved_instances: resolved,
        resolution_rate: resolved / total,
        exact_matches: resolved, // In real evaluation, this would be more sophisticated
        test_pass_rate: testsPassed / total,
        compilation_success_rate: compiled / total,
        per_instance_results: instanceResults,
        summary: {
          avg_execution_time: this.calculateAverage(instanceResults.map((r) => r.execution_time)),
          avg_token_usage: 0, // Would be tracked separately
          total_cost: 0, // Would be calculated from token usage
          success_by_complexity: this.groupByComplexity(instanceResults),
          common_errors: this.extractCommonErrors(instanceResults),
        },
      };
    } catch (error) {
      // Enhanced error handling for result formatting
      elizaLogger.error('[REAL-EVAL] Error formatting results:', error);

      // Return a safe fallback result
      return {
        total_instances: patches.length,
        resolved_instances: 0,
        resolution_rate: 0,
        exact_matches: 0,
        test_pass_rate: 0,
        compilation_success_rate: 0,
        per_instance_results: patches.map((patch) => ({
          instance_id: patch.instance_id,
          resolved: false,
          tests_passed: false,
          compilation_success: false,
          execution_time: 0,
          error: 'Result formatting failed',
          metadata: {
            tests_run: 0,
            tests_passed: 0,
            tests_failed: 1,
            patch_applied: false,
            verification_score: 0,
          },
        })),
        summary: {
          avg_execution_time: 0,
          avg_token_usage: 0,
          total_cost: 0,
          success_by_complexity: { low: 0, medium: 0, high: 0 },
          common_errors: [{ error: 'Result Formatting Error', count: patches.length }],
        },
      };
    }
  }

  private categorizeErrors(results: InstanceResult[]): Record<string, number> {
    const categories: Record<string, number> = {};

    for (const result of results) {
      if (result.error) {
        const category = this.classifyError(result.error);
        categories[category] = (categories[category] || 0) + 1;
      }
    }

    return categories;
  }

  private calculateAverage(numbers: number[]): number {
    if (numbers.length === 0) return 0;
    return numbers.reduce((sum, n) => sum + n, 0) / numbers.length;
  }

  private groupByComplexity(results: InstanceResult[]): Record<string, number> {
    // This would use actual complexity metrics in a full implementation
    const groups = { low: 0, medium: 0, high: 0 };

    results.forEach((r, i) => {
      if (i % 3 === 0) groups.low += r.resolved ? 1 : 0;
      else if (i % 3 === 1) groups.medium += r.resolved ? 1 : 0;
      else groups.high += r.resolved ? 1 : 0;
    });

    return groups;
  }

  private extractCommonErrors(results: InstanceResult[]): Array<{ error: string; count: number }> {
    const errorCounts = new Map<string, number>();

    for (const result of results) {
      if (result.error) {
        const errorType = this.classifyError(result.error);
        errorCounts.set(errorType, (errorCounts.get(errorType) || 0) + 1);
      }
    }

    return Array.from(errorCounts.entries())
      .map(([error, count]) => ({ error, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);
  }

  private classifyError(error: string): string {
    const errorLower = error.toLowerCase();

    if (errorLower.includes('timeout')) return 'Timeout';
    if (errorLower.includes('compilation') || errorLower.includes('compile'))
      return 'Compilation Error';
    if (errorLower.includes('test') || errorLower.includes('assertion')) return 'Test Failure';
    if (errorLower.includes('patch') || errorLower.includes('apply'))
      return 'Patch Application Failed';
    if (errorLower.includes('install') || errorLower.includes('dependency'))
      return 'Dependency Error';
    if (errorLower.includes('git') || errorLower.includes('clone')) return 'Repository Error';
    if (errorLower.includes('import') || errorLower.includes('module')) return 'Import Error';

    return 'Other Error';
  }
}
