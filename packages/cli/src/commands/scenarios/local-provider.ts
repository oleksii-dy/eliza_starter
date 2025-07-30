import { EnvironmentProvider, ExecutionResult } from './providers';
import { Scenario } from './schema';
import fs from 'fs-extra';
import path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';
import { logger } from '@elizaos/core';

const execAsync = promisify(exec);

export class LocalEnvironmentProvider implements EnvironmentProvider {
  private tempDir: string | null = null;

  async setup(scenario: Scenario): Promise<void> {
    // 1. Create a temporary directory
    this.tempDir = await fs.mkdtemp(path.join('/tmp', 'scenario-'));
    logger.info(`Created temporary directory: ${this.tempDir}`);

    // 2. Populate the directory with files from `virtual_fs`
    if (scenario.setup?.virtual_fs) {
      for (const [filePath, content] of Object.entries(scenario.setup.virtual_fs)) {
        const fullPath = path.join(this.tempDir, filePath);
        await fs.ensureDir(path.dirname(fullPath));
        await fs.writeFile(fullPath, content);
        logger.info(`Created file: ${fullPath}`);
      }
    }
  }

  async run(scenario: Scenario): Promise<ExecutionResult> {
    if (!this.tempDir) {
      throw new Error('Environment not set up. Call setup() before run().');
    }

    const command = scenario.run[0].input;
    logger.info(`Executing command in ${this.tempDir}: ${command}`);

    try {
      const { stdout, stderr } = await execAsync(command, { cwd: this.tempDir });
      return {
        exitCode: 0,
        stdout,
        stderr,
      };
    } catch (error: any) {
      return {
        exitCode: error.code || 1,
        stdout: error.stdout || '',
        stderr: error.stderr || '',
      };
    }
  }

  async teardown(): Promise<void> {
    if (this.tempDir) {
      await fs.remove(this.tempDir);
      logger.info(`Cleaned up temporary directory: ${this.tempDir}`);
      this.tempDir = null;
    }
  }
} 