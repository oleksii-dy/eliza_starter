/**
 * Extended Scenario Runner with support for file system, Git, and API operations
 * Provides comprehensive testing capabilities for bulk plugin update operations
 */

import fs from 'fs/promises';
import path from 'path';
import { execSync, spawn } from 'child_process';
import { tmpdir } from 'os';
import { v4 as uuidv4 } from 'uuid';

import {
  ExtendedScenario,
  ExtendedScenarioStep,
  FileSystemStep,
  GitStep,
  ApiStep,
  CommandStep,
  BulkOperationStep,
  ValidationStep,
  ValidationCheck,
} from '../types/scenario-extensions.js';

export class ExtendedScenarioRunner {
  private sandboxPath?: string;
  private cleanupTasks: (() => Promise<void>)[] = [];
  private stepResults: Map<string, any> = new Map();

  constructor(private scenario: ExtendedScenario) {}

  async run(): Promise<ScenarioResult> {
    const startTime = Date.now();
    let success = true;
    const errors: string[] = [];
    const stepResults: StepResult[] = [];

    try {
      // Setup sandbox environment
      await this.setupSandbox();

      // Execute steps
      for (const step of this.scenario.steps) {
        try {
          const result = await this.executeStep(step);
          stepResults.push(result);
          
          if (!result.success) {
            success = false;
            errors.push(`Step ${step.type}: ${result.error}`);
            
            // Check failure strategy
            if (this.scenario.metadata?.parallel !== true) {
              break; // Stop on first failure for sequential execution
            }
          }
        } catch (error) {
          success = false;
          const errorMsg = `Step ${step.type} failed: ${error instanceof Error ? error.message : String(error)}`;
          errors.push(errorMsg);
          stepResults.push({
            step: step.type,
            success: false,
            error: errorMsg,
            duration: 0,
          });
          break;
        }
      }

      // Run verification
      if (success && this.scenario.verification?.rules) {
        const verificationResult = await this.runVerification();
        if (!verificationResult.success) {
          success = false;
          errors.push(...verificationResult.errors);
        }
      }

      // Run cleanup steps
      if (this.scenario.cleanup) {
        for (const cleanupStep of this.scenario.cleanup) {
          try {
            await this.executeStep(cleanupStep);
          } catch (error) {
            console.warn(`Cleanup step failed: ${error}`);
          }
        }
      }

    } catch (error) {
      success = false;
      errors.push(`Scenario failed: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      // Always run cleanup tasks
      await this.cleanup();
    }

    return {
      scenarioId: this.scenario.id,
      success,
      errors,
      stepResults,
      duration: Date.now() - startTime,
      sandboxPath: this.sandboxPath,
    };
  }

  private async setupSandbox(): Promise<void> {
    if (!this.scenario.setup.sandbox?.enabled) {
      return;
    }

    const tempId = `eliza-test-${uuidv4().substring(0, 8)}`;
    this.sandboxPath = path.join(
      this.scenario.setup.sandbox.tempDirectory || tmpdir(),
      tempId
    );

    await fs.mkdir(this.sandboxPath, { recursive: true });
    
    // Setup git config if needed
    if (this.scenario.setup.sandbox.gitConfig) {
      const { name, email } = this.scenario.setup.sandbox.gitConfig;
      process.env.GIT_CONFIG_GLOBAL = path.join(this.sandboxPath, '.gitconfig');
      execSync(`git config --global user.name "${name}"`, { cwd: this.sandboxPath });
      execSync(`git config --global user.email "${email}"`, { cwd: this.sandboxPath });
    }

    console.log(`Sandbox created: ${this.sandboxPath}`);
  }

  private async executeStep(step: ExtendedScenarioStep): Promise<StepResult> {
    const startTime = Date.now();
    
    try {
      let result: any;
      
      switch (step.type) {
        case 'file_operation':
          result = await this.executeFileOperation(step as FileSystemStep);
          break;
        case 'git_operation':
          result = await this.executeGitOperation(step as GitStep);
          break;
        case 'api_call':
          result = await this.executeApiCall(step as ApiStep);
          break;
        case 'command':
          result = await this.executeCommand(step as CommandStep);
          break;
        case 'bulk_operation':
          result = await this.executeBulkOperation(step as BulkOperationStep);
          break;
        case 'validation':
          result = await this.executeValidation(step as ValidationStep);
          break;
        default:
          throw new Error(`Unknown step type: ${(step as any).type}`);
      }

      this.stepResults.set(step.type, result);

      return {
        step: step.type,
        success: true,
        result,
        duration: Date.now() - startTime,
      };
    } catch (error) {
      return {
        step: step.type,
        success: false,
        error: error instanceof Error ? error.message : String(error),
        duration: Date.now() - startTime,
      };
    }
  }

  private async executeFileOperation(step: FileSystemStep): Promise<any> {
    const targetPath = this.resolvePath(step.path);
    
    // Validate path is within allowed operations
    if (this.scenario.setup.filesystem?.restrictToTemp && !targetPath.startsWith(this.sandboxPath || '')) {
      throw new Error(`File operation outside sandbox: ${targetPath}`);
    }

    switch (step.operation) {
      case 'read':
        const content = await fs.readFile(targetPath, step.encoding || 'utf8');
        if (step.expectedContent && content !== step.expectedContent) {
          throw new Error(`Content mismatch. Expected: ${step.expectedContent}, Got: ${content}`);
        }
        if (step.validateJson) {
          JSON.parse(content); // Will throw if invalid JSON
        }
        return { content, path: targetPath };

      case 'write':
        if (step.backup) {
          try {
            await fs.copyFile(targetPath, `${targetPath}.backup`);
          } catch (error) {
            // Ignore if file doesn't exist
          }
        }
        await fs.writeFile(targetPath, step.content || '', step.encoding || 'utf8');
        return { path: targetPath, content: step.content };

      case 'create':
        await fs.mkdir(path.dirname(targetPath), { recursive: true });
        await fs.writeFile(targetPath, step.content || '', step.encoding || 'utf8');
        return { path: targetPath };

      case 'delete':
        await fs.unlink(targetPath);
        return { path: targetPath };

      case 'exists':
        const exists = await fs.access(targetPath).then(() => true).catch(() => false);
        return { exists, path: targetPath };

      case 'mkdir':
        await fs.mkdir(targetPath, { recursive: true });
        return { path: targetPath };

      default:
        throw new Error(`Unknown file operation: ${step.operation}`);
    }
  }

  private async executeGitOperation(step: GitStep): Promise<any> {
    const workDir = this.resolvePath(step.workingDirectory);
    
    switch (step.operation) {
      case 'clone':
        if (!step.repository) throw new Error('Repository URL required for clone');
        execSync(`git clone ${step.repository} .`, { cwd: workDir, stdio: 'pipe' });
        return { repository: step.repository, path: workDir };

      case 'branch':
        if (!step.branch) throw new Error('Branch name required');
        execSync(`git checkout -b ${step.branch}`, { cwd: workDir, stdio: 'pipe' });
        return { branch: step.branch };

      case 'commit':
        if (!step.commitMessage) throw new Error('Commit message required');
        execSync('git add .', { cwd: workDir, stdio: 'pipe' });
        execSync(`git commit -m "${step.commitMessage}"`, { cwd: workDir, stdio: 'pipe' });
        return { message: step.commitMessage };

      case 'status':
        const status = execSync('git status --porcelain', { cwd: workDir, encoding: 'utf8' });
        return { status: status.trim(), clean: status.trim() === '' };

      default:
        throw new Error(`Unknown git operation: ${step.operation}`);
    }
  }

  private async executeApiCall(step: ApiStep): Promise<any> {
    if (step.mock?.enabled) {
      // Return mock response
      if (step.mock.delay) {
        await new Promise(resolve => setTimeout(resolve, step.mock!.delay));
      }
      return { 
        status: step.expectedStatus, 
        data: step.mock.response,
        mocked: true 
      };
    }

    // Real API call (implementation would use fetch or axios)
    throw new Error('Real API calls not implemented yet - use mock mode');
  }

  private async executeCommand(step: CommandStep): Promise<any> {
    return new Promise((resolve, reject) => {
      const child = spawn(step.command, step.args, {
        cwd: step.workingDirectory ? this.resolvePath(step.workingDirectory) : this.sandboxPath,
        env: { ...process.env, ...step.environment },
        stdio: 'pipe',
      });

      let stdout = '';
      let stderr = '';

      child.stdout?.on('data', (data) => {
        stdout += data.toString();
      });

      child.stderr?.on('data', (data) => {
        stderr += data.toString();
      });

      const timeout = step.timeout ? setTimeout(() => {
        child.kill();
        reject(new Error(`Command timed out after ${step.timeout}ms`));
      }, step.timeout) : null;

      child.on('close', (code) => {
        if (timeout) clearTimeout(timeout);
        
        if (code !== step.expectedExitCode) {
          reject(new Error(`Expected exit code ${step.expectedExitCode}, got ${code}. stderr: ${stderr}`));
          return;
        }

        if (step.expectedOutput) {
          const match = step.expectedOutput instanceof RegExp 
            ? step.expectedOutput.test(stdout)
            : stdout.includes(step.expectedOutput);
          if (!match) {
            reject(new Error(`Output didn't match expected pattern. Got: ${stdout}`));
            return;
          }
        }

        resolve({ exitCode: code, stdout, stderr });
      });

      child.on('error', (error) => {
        if (timeout) clearTimeout(timeout);
        reject(error);
      });
    });
  }

  private async executeBulkOperation(step: BulkOperationStep): Promise<any> {
    const results: any[] = [];
    const errors: string[] = [];
    const batchSize = step.batchSize || step.targets.length;
    
    for (let i = 0; i < step.targets.length; i += batchSize) {
      const batch = step.targets.slice(i, i + batchSize);
      
      if (step.parallelism && step.parallelism > 1) {
        // Parallel execution
        const promises = batch.map(async (target) => {
          try {
            // This would call the actual bulk operation
            return { target, success: true };
          } catch (error) {
            errors.push(`${target}: ${error}`);
            return { target, success: false, error };
          }
        });
        
        const batchResults = await Promise.all(promises);
        results.push(...batchResults);
      } else {
        // Sequential execution
        for (const target of batch) {
          try {
            results.push({ target, success: true });
          } catch (error) {
            errors.push(`${target}: ${error}`);
            results.push({ target, success: false, error });
            
            if (step.failureStrategy === 'stop_on_first') {
              break;
            }
          }
        }
      }
    }

    return { results, errors, successCount: results.filter(r => r.success).length };
  }

  private async executeValidation(step: ValidationStep): Promise<any> {
    const results: any[] = [];
    
    for (const check of step.checks) {
      try {
        const result = await this.runValidationCheck(check);
        results.push({ check: check.name, success: result, result });
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        results.push({ check: check.name, success: false, error: errorMessage });
        if (step.failOnAny) {
          throw new Error(`Validation failed: ${check.name} - ${errorMessage}`);
        }
      }
    }

    return { results, allPassed: results.every(r => r.success) };
  }

  private async runValidationCheck(check: ValidationCheck): Promise<boolean> {
    switch (check.type) {
      case 'file_exists':
        if (!check.target) throw new Error('Target path required for file_exists check');
        return fs.access(this.resolvePath(check.target)).then(() => true).catch(() => false);

      case 'file_content':
        if (!check.target) throw new Error('Target path required for file_content check');
        const content = await fs.readFile(this.resolvePath(check.target), 'utf8');
        return check.expected ? content.includes(check.expected) : true;

      case 'package_json':
        if (!check.target) throw new Error('Target path required for package_json check');
        const packageContent = await fs.readFile(this.resolvePath(check.target), 'utf8');
        const packageJson = JSON.parse(packageContent);
        return check.validator ? check.validator(packageJson) : true;

      case 'custom':
        if (!check.validator) throw new Error('Validator function required for custom check');
        return check.validator(check.expected);

      default:
        throw new Error(`Unknown validation check type: ${check.type}`);
    }
  }

  private async runVerification(): Promise<{ success: boolean; errors: string[] }> {
    const errors: string[] = [];
    
    for (const rule of this.scenario.verification.rules) {
      try {
        const result = await this.runValidationCheck(rule);
        if (!result) {
          errors.push(`Verification failed: ${rule.name}`);
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        errors.push(`Verification error: ${rule.name} - ${errorMessage}`);
      }
    }

    return { success: errors.length === 0, errors };
  }

  private resolvePath(filePath: string): string {
    if (path.isAbsolute(filePath)) {
      return filePath;
    }
    return path.join(this.sandboxPath || process.cwd(), filePath);
  }

  private async cleanup(): Promise<void> {
    // Run registered cleanup tasks
    for (const task of this.cleanupTasks) {
      try {
        await task();
      } catch (error) {
        console.warn(`Cleanup task failed:`, error);
      }
    }

    // Clean up sandbox
    if (this.sandboxPath && this.scenario.setup.sandbox?.cleanupStrategy !== 'never') {
      const shouldCleanup = this.scenario.setup.sandbox?.cleanupStrategy === 'always' ||
                           (this.scenario.setup.sandbox?.cleanupStrategy === 'on_success');
      
      if (shouldCleanup) {
        try {
          await fs.rm(this.sandboxPath, { recursive: true, force: true });
          console.log(`Sandbox cleaned up: ${this.sandboxPath}`);
        } catch (error) {
          console.warn(`Failed to clean up sandbox: ${error}`);
        }
      }
    }
  }
}

export interface ScenarioResult {
  scenarioId: string;
  success: boolean;
  errors: string[];
  stepResults: StepResult[];
  duration: number;
  sandboxPath?: string;
}

export interface StepResult {
  step: string;
  success: boolean;
  result?: any;
  error?: string;
  duration: number;
}