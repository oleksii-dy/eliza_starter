import { logger } from '@elizaos/core';
import { execa } from 'execa';
import { existsSync } from 'fs';
import { join } from 'path';

export class TestSetup {
  private projectRoot: string;
  private cliPath: string;
  private built = false;

  constructor(projectRoot?: string) {
    this.projectRoot = projectRoot || process.cwd();
    this.cliPath = join(this.projectRoot, 'dist', 'index.js');
  }

  async setup(): Promise<void> {
    logger.info('Setting up CLI test environment...');

    // Check if CLI is already built
    if (existsSync(this.cliPath)) {
      logger.info('CLI already built, skipping build step');
      this.built = true;
      return;
    }

    // Build the CLI
    await this.buildCli();
    
    // Verify build
    await this.verifyBuild();
    
    logger.info('CLI test environment setup complete');
  }

  async buildCli(): Promise<void> {
    logger.info('Building CLI...');
    
    try {
      const result = await execa('bun', ['run', 'build'], {
        cwd: this.projectRoot,
        stdio: 'pipe',
      });

      if (result.exitCode !== 0) {
        throw new Error(`Build failed with exit code ${result.exitCode}: ${result.stderr}`);
      }

      logger.info('CLI build successful');
      this.built = true;
      
    } catch (error) {
      logger.error('Failed to build CLI:', error);
      throw error;
    }
  }

  async verifyBuild(): Promise<void> {
    if (!existsSync(this.cliPath)) {
      throw new Error(`CLI executable not found at ${this.cliPath}`);
    }

    // Test that CLI can run
    try {
      const result = await execa('bun', [this.cliPath, '--version'], {
        cwd: this.projectRoot,
        timeout: 10000,
      });

      if (result.exitCode !== 0) {
        throw new Error(`CLI verification failed with exit code ${result.exitCode}`);
      }

      logger.info('CLI verification successful');
      
    } catch (error) {
      logger.error('CLI verification failed:', error);
      throw error;
    }
  }

  async teardown(): Promise<void> {
    logger.info('Tearing down CLI test environment...');
    // Add any cleanup logic here if needed
    logger.info('CLI test environment teardown complete');
  }

  isBuilt(): boolean {
    return this.built && existsSync(this.cliPath);
  }

  getCliPath(): string {
    return this.cliPath;
  }

  getProjectRoot(): string {
    return this.projectRoot;
  }
}

// Global test setup for Bun
export async function globalSetup(): Promise<void> {
  const testSetup = new TestSetup();
  await testSetup.setup();
}

// Global test teardown for Bun
export async function globalTeardown(): Promise<void> {
  const testSetup = new TestSetup();
  await testSetup.teardown();
}