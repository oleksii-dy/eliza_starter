import { execa } from 'execa';
import { join } from 'path';
import { existsSync, readFileSync } from 'fs';
import { logger } from '@elizaos/core';

export interface CliTestConfig {
  cliPath: string;
  timeout: number;
  workingDirectory: string;
  env?: Record<string, string>;
}

export interface CliTestResult {
  command: string;
  exitCode: number;
  stdout: string;
  stderr: string;
  duration: number;
  success: boolean;
  error?: Error;
}

export interface CommandSpec {
  command: string;
  description: string;
  expectedExitCode: number;
  expectedOutputPatterns?: string[];
  shouldNotContain?: string[];
  timeout?: number;
  env?: Record<string, string>;
  workingDirectory?: string;
  skipIf?: () => boolean;
}

export class CliTestRunner {
  private config: CliTestConfig;
  private results: CliTestResult[] = [];

  constructor(config: CliTestConfig) {
    this.config = config;
  }

  async runCommand(spec: CommandSpec): Promise<CliTestResult> {
    const startTime = Date.now();
    const fullCommand = `${this.config.cliPath} ${spec.command}`;
    
    try {
      logger.debug(`Running CLI command: ${fullCommand}`);
      
      const result = await execa(
        this.config.cliPath,
        spec.command.split(' ').filter(arg => arg.length > 0),
        {
          timeout: spec.timeout || this.config.timeout,
          cwd: spec.workingDirectory || this.config.workingDirectory,
          env: { ...this.config.env, ...spec.env },
          reject: false, // Don't throw on non-zero exit codes
          stripFinalNewline: false,
          input: '\n', // Send newline to interactive prompts to exit them
        }
      );

      const duration = Date.now() - startTime;
      const testResult: CliTestResult = {
        command: fullCommand,
        exitCode: result.exitCode,
        stdout: result.stdout,
        stderr: result.stderr,
        duration,
        success: result.exitCode === spec.expectedExitCode,
      };

      // Validate output patterns
      if (spec.expectedOutputPatterns) {
        const output = result.stdout + result.stderr;
        for (const pattern of spec.expectedOutputPatterns) {
          if (!output.includes(pattern)) {
            testResult.success = false;
            testResult.error = new Error(`Expected output pattern '${pattern}' not found`);
            break;
          }
        }
      }

      // Validate negative patterns
      if (spec.shouldNotContain) {
        const output = result.stdout + result.stderr;
        for (const pattern of spec.shouldNotContain) {
          if (output.includes(pattern)) {
            testResult.success = false;
            testResult.error = new Error(`Output should not contain '${pattern}'`);
            break;
          }
        }
      }

      this.results.push(testResult);
      return testResult;

    } catch (error) {
      const duration = Date.now() - startTime;
      const testResult: CliTestResult = {
        command: fullCommand,
        exitCode: -1,
        stdout: '',
        stderr: error.message,
        duration,
        success: false,
        error: error as Error,
      };

      this.results.push(testResult);
      return testResult;
    }
  }

  async runTestSuite(specs: CommandSpec[]): Promise<{
    passed: number;
    failed: number;
    skipped: number;
    results: CliTestResult[];
  }> {
    let passed = 0;
    let failed = 0;
    let skipped = 0;
    
    for (const spec of specs) {
      if (spec.skipIf && spec.skipIf()) {
        logger.info(`Skipping test: ${spec.description}`);
        skipped++;
        continue;
      }

      const result = await this.runCommand(spec);
      
      if (result.success) {
        logger.info(`✅ ${spec.description}`);
        passed++;
      } else {
        logger.error(`❌ ${spec.description}`);
        logger.error(`Command: ${result.command}`);
        logger.error(`Exit code: ${result.exitCode}`);
        logger.error(`Stdout: ${result.stdout}`);
        logger.error(`Stderr: ${result.stderr}`);
        if (result.error) {
          logger.error(`Error: ${result.error.message}`);
        }
        failed++;
      }
    }

    return {
      passed,
      failed,
      skipped,
      results: this.results,
    };
  }

  getResults(): CliTestResult[] {
    return [...this.results];
  }

  clearResults(): void {
    this.results = [];
  }
}

export function createCliTestRunner(options: Partial<CliTestConfig> = {}): CliTestRunner {
  const projectRoot = process.cwd();
  const cliPath = join(projectRoot, 'dist', 'index.js');
  
  const config: CliTestConfig = {
    cliPath,
    timeout: 30000, // 30 seconds
    workingDirectory: projectRoot,
    ...options,
  };

  return new CliTestRunner(config);
}

export function validateCliExists(cliPath: string): boolean {
  return existsSync(cliPath);
}

export function getPackageVersion(): string {
  const packageJsonPath = join(process.cwd(), 'package.json');
  if (existsSync(packageJsonPath)) {
    const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf-8'));
    return packageJson.version || '0.0.0';
  }
  return '0.0.0';
}