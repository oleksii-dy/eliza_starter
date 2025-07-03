#!/usr/bin/env bun

import { logger } from '@elizaos/core';
import { TestSetup } from './setup/test-setup';
import { CliTestRunner, createCliTestRunner } from './utils/cli-test-runner';
import { DocumentationParser } from './utils/documentation-parser';
import { join } from 'path';

interface TestRunnerOptions {
  buildFirst?: boolean;
  verbose?: boolean;
  pattern?: string;
  timeout?: number;
  skipBuild?: boolean;
}

class CliTestExecutor {
  private testSetup: TestSetup;
  private cliRunner: CliTestRunner;
  private docParser: DocumentationParser;
  private options: TestRunnerOptions;

  constructor(options: TestRunnerOptions = {}) {
    this.options = {
      buildFirst: true,
      verbose: false,
      timeout: 30000,
      ...options,
    };
    
    this.testSetup = new TestSetup();
    this.cliRunner = createCliTestRunner({
      timeout: this.options.timeout,
    });
    this.docParser = new DocumentationParser();
  }

  async run(): Promise<void> {
    logger.info('Starting CLI test runner...');
    
    try {
      // Setup
      if (!this.options.skipBuild) {
        await this.testSetup.setup();
      }

      // Parse documentation
      await this.docParser.parseDocumentation();

      // Run tests
      await this.runBasicTests();
      await this.runDocumentationTests();
      await this.runIntegrationTests();

      logger.info('CLI test runner completed successfully');
      
    } catch (error) {
      logger.error('CLI test runner failed:', error);
      process.exit(1);
    } finally {
      await this.testSetup.teardown();
    }
  }

  private async runBasicTests(): Promise<void> {
    logger.info('Running basic CLI tests...');
    
    const basicTests = [
      {
        command: '--version',
        description: 'Version command',
        expectedExitCode: 0,
      },
      {
        command: '--help',
        description: 'Help command',
        expectedExitCode: 0,
        expectedOutputPatterns: ['Usage:', 'Commands:'],
      },
      {
        command: 'create --help',
        description: 'Create command help',
        expectedExitCode: 0,
        expectedOutputPatterns: ['Usage:', 'create'],
      },
      {
        command: 'test --help',
        description: 'Test command help',
        expectedExitCode: 0,
        expectedOutputPatterns: ['Usage:', 'test'],
      },
      {
        command: 'start --help',
        description: 'Start command help',
        expectedExitCode: 0,
        expectedOutputPatterns: ['Usage:', 'start'],
      },
      {
        command: 'plugins --help',
        description: 'Plugins command help',
        expectedExitCode: 0,
        expectedOutputPatterns: ['Usage:', 'plugins'],
      },
    ];

    const results = await this.cliRunner.runTestSuite(basicTests);
    this.logResults('Basic Tests', results);
  }

  private async runDocumentationTests(): Promise<void> {
    logger.info('Running documentation validation tests...');
    
    const commands = this.docParser.getCommands();
    logger.info(`Found ${commands.length} documented commands`);

    // Validate core commands are documented
    const coreCommands = ['create', 'test', 'start', 'plugins'];
    const missingDocs = [];
    
    for (const commandName of coreCommands) {
      const validation = this.docParser.validateCommand(commandName);
      if (!validation.exists || !validation.documented) {
        missingDocs.push(commandName);
      }
    }

    if (missingDocs.length > 0) {
      logger.warn(`Commands missing documentation: ${missingDocs.join(', ')}`);
    } else {
      logger.info('All core commands are documented');
    }
  }

  private async runIntegrationTests(): Promise<void> {
    logger.info('Running integration tests...');
    
    const integrationTests = [
      {
        command: 'nonexistent-command',
        description: 'Invalid command handling',
        expectedExitCode: 1,
        shouldNotContain: ['TypeError', 'ReferenceError', 'Cannot read property'],
      },
      {
        command: 'create --invalid-flag',
        description: 'Invalid flag handling',
        expectedExitCode: 1,
        shouldNotContain: ['TypeError', 'ReferenceError', 'Cannot read property'],
      },
    ];

    const results = await this.cliRunner.runTestSuite(integrationTests);
    this.logResults('Integration Tests', results);
  }

  private logResults(
    suiteName: string,
    results: { passed: number; failed: number; skipped: number }
  ): void {
    const total = results.passed + results.failed + results.skipped;
    
    logger.info(`${suiteName} Results:`);
    logger.info(`  Total: ${total}`);
    logger.info(`  Passed: ${results.passed}`);
    logger.info(`  Failed: ${results.failed}`);
    logger.info(`  Skipped: ${results.skipped}`);
    
    if (results.failed > 0) {
      logger.error(`${results.failed} tests failed in ${suiteName}`);
    }
  }
}

// Command line interface
async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const options: TestRunnerOptions = {};

  // Parse command line arguments
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    
    switch (arg) {
      case '--skip-build':
        options.skipBuild = true;
        break;
      case '--verbose':
        options.verbose = true;
        break;
      case '--timeout':
        options.timeout = parseInt(args[++i] || '30000', 10);
        break;
      case '--pattern':
        options.pattern = args[++i];
        break;
      case '--help':
        console.log(`
CLI Test Runner

Usage: bun run tests/cli-test-runner.ts [options]

Options:
  --skip-build    Skip building the CLI before tests
  --verbose       Enable verbose logging
  --timeout       Set test timeout in milliseconds (default: 30000)
  --pattern       Filter tests by pattern
  --help          Show this help message
        `);
        return;
    }
  }

  const executor = new CliTestExecutor(options);
  await executor.run();
}

// Run if called directly
if (import.meta.main) {
  main().catch((error) => {
    logger.error('Test runner failed:', error);
    process.exit(1);
  });
}

export { CliTestExecutor, TestRunnerOptions };