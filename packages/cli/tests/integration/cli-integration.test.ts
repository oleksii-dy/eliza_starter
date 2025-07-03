import { describe, it, expect, beforeAll, afterAll } from 'bun:test';
import { TestSetup } from '../setup/test-setup';
import { CliTestRunner, createCliTestRunner } from '../utils/cli-test-runner';
import { DocumentationParser } from '../utils/documentation-parser';
import { logger } from '@elizaos/core';
import { mkdtemp, rm } from 'fs/promises';
import { join } from 'path';
import { tmpdir } from 'os';

describe('CLI Integration Tests', () => {
  let testSetup: TestSetup;
  let cliRunner: CliTestRunner;
  let docParser: DocumentationParser;
  let tempDir: string;

  beforeAll(async () => {
    // Create temporary directory for test projects
    tempDir = await mkdtemp(join(tmpdir(), 'eliza-cli-test-'));
    logger.info(`Created temp directory: ${tempDir}`);

    // Setup test environment
    testSetup = new TestSetup();
    await testSetup.setup();

    // Initialize test utilities
    cliRunner = createCliTestRunner({
      workingDirectory: tempDir,
    });
    docParser = new DocumentationParser();
    await docParser.parseDocumentation();
  });

  afterAll(async () => {
    // Cleanup
    await testSetup.teardown();
    
    if (tempDir) {
      await rm(tempDir, { recursive: true, force: true });
      logger.info(`Cleaned up temp directory: ${tempDir}`);
    }
  });

  describe('Project Creation', () => {
    it('should create a new project with valid configuration', async () => {
      if (!testSetup.isBuilt()) {
        expect().skip();
        return;
      }

      const projectName = 'test-project';
      const result = await cliRunner.runCommand({
        command: `create ${projectName} --no-interactive`,
        description: 'Create test project',
        expectedExitCode: 0,
        timeout: 60000, // 1 minute for project creation
      });

      expect(result.success).toBe(true);
      expect(result.stdout).toContain('created successfully');
    });

    it('should handle project creation with custom template', async () => {
      if (!testSetup.isBuilt()) {
        expect().skip();
        return;
      }

      const projectName = 'test-project-custom';
      const result = await cliRunner.runCommand({
        command: `create ${projectName} --template basic --no-interactive`,
        description: 'Create test project with template',
        expectedExitCode: 0,
        timeout: 60000,
      });

      expect(result.success).toBe(true);
    });
  });

  describe('Plugin Management', () => {
    it('should list available plugins', async () => {
      if (!testSetup.isBuilt()) {
        expect().skip();
        return;
      }

      const result = await cliRunner.runCommand({
        command: 'plugins list',
        description: 'List available plugins',
        expectedExitCode: 0,
        expectedOutputPatterns: ['Available plugins:', 'plugin-'],
      });

      expect(result.success).toBe(true);
    });

    it('should show plugin information', async () => {
      if (!testSetup.isBuilt()) {
        expect().skip();
        return;
      }

      const result = await cliRunner.runCommand({
        command: 'plugins info bootstrap',
        description: 'Show plugin information',
        expectedExitCode: 0,
        expectedOutputPatterns: ['Plugin:', 'bootstrap'],
      });

      expect(result.success).toBe(true);
    });
  });

  describe('Testing Commands', () => {
    it('should run component tests', async () => {
      if (!testSetup.isBuilt()) {
        expect().skip();
        return;
      }

      const result = await cliRunner.runCommand({
        command: 'test --type component',
        description: 'Run component tests',
        expectedExitCode: 0,
        timeout: 120000, // 2 minutes for tests
      });

      expect(result.success).toBe(true);
    });

    it('should handle test filtering', async () => {
      if (!testSetup.isBuilt()) {
        expect().skip();
        return;
      }

      const result = await cliRunner.runCommand({
        command: 'test --name "basic"',
        description: 'Run filtered tests',
        expectedExitCode: 0,
        timeout: 60000,
      });

      expect(result.success).toBe(true);
    });
  });

  describe('Agent Runtime', () => {
    it('should validate agent configuration', async () => {
      if (!testSetup.isBuilt()) {
        expect().skip();
        return;
      }

      const result = await cliRunner.runCommand({
        command: 'start --validate-only',
        description: 'Validate agent configuration',
        expectedExitCode: 0,
      });

      expect(result.success).toBe(true);
    });

    it('should handle missing configuration gracefully', async () => {
      if (!testSetup.isBuilt()) {
        expect().skip();
        return;
      }

      const result = await cliRunner.runCommand({
        command: 'start --config nonexistent.json',
        description: 'Handle missing configuration',
        expectedExitCode: 1,
        shouldNotContain: ['TypeError', 'ReferenceError', 'Cannot read property'],
      });

      expect(result.success).toBe(true);
      expect(result.stderr).toContain('Configuration file not found');
    });
  });

  describe('Environment Management', () => {
    it('should handle environment variable validation', async () => {
      if (!testSetup.isBuilt()) {
        expect().skip();
        return;
      }

      const result = await cliRunner.runCommand({
        command: 'start --check-env',
        description: 'Check environment variables',
        expectedExitCode: 0,
      });

      expect(result.success).toBe(true);
    });
  });

  describe('Error Scenarios', () => {
    it('should handle insufficient permissions gracefully', async () => {
      if (!testSetup.isBuilt()) {
        expect().skip();
        return;
      }

      const result = await cliRunner.runCommand({
        command: 'create /root/test-project --no-interactive',
        description: 'Handle permission errors',
        expectedExitCode: 1,
        shouldNotContain: ['TypeError', 'ReferenceError', 'Cannot read property'],
      });

      expect(result.success).toBe(true);
    });

    it('should handle network errors gracefully', async () => {
      if (!testSetup.isBuilt()) {
        expect().skip();
        return;
      }

      const result = await cliRunner.runCommand({
        command: 'plugins update --registry https://nonexistent.registry.com',
        description: 'Handle network errors',
        expectedExitCode: 1,
        shouldNotContain: ['TypeError', 'ReferenceError', 'Cannot read property'],
      });

      expect(result.success).toBe(true);
    });

    it('should handle corrupted project files gracefully', async () => {
      if (!testSetup.isBuilt()) {
        expect().skip();
        return;
      }

      const result = await cliRunner.runCommand({
        command: 'start --config package.json',
        description: 'Handle corrupted configuration',
        expectedExitCode: 1,
        shouldNotContain: ['TypeError', 'ReferenceError', 'Cannot read property'],
      });

      expect(result.success).toBe(true);
    });
  });

  describe('Performance', () => {
    it('should complete basic operations within reasonable time', async () => {
      if (!testSetup.isBuilt()) {
        expect().skip();
        return;
      }

      const commands = [
        { command: '--version', maxTime: 2000 },
        { command: '--help', maxTime: 3000 },
        { command: 'plugins list', maxTime: 10000 },
      ];

      for (const cmd of commands) {
        const result = await cliRunner.runCommand({
          command: cmd.command,
          description: `Performance test: ${cmd.command}`,
          expectedExitCode: 0,
          timeout: cmd.maxTime,
        });

        expect(result.success).toBe(true);
        expect(result.duration).toBeLessThan(cmd.maxTime);
      }
    });
  });

  describe('Documentation Consistency', () => {
    it('should have all CLI commands documented', () => {
      const commands = docParser.getCommands();
      expect(commands.length).toBeGreaterThan(0);

      // Check that core commands are documented
      const coreCommands = ['create', 'test', 'start', 'plugins'];
      for (const commandName of coreCommands) {
        const validation = docParser.validateCommand(commandName);
        expect(validation.exists).toBe(true);
        expect(validation.documented).toBe(true);
      }
    });

    it('should have consistent help text across commands', async () => {
      if (!testSetup.isBuilt()) {
        expect().skip();
        return;
      }

      const commands = ['create', 'test', 'start', 'plugins'];
      const helpTexts = [];

      for (const command of commands) {
        const result = await cliRunner.runCommand({
          command: `${command} --help`,
          description: `Get help for ${command}`,
          expectedExitCode: 0,
        });

        expect(result.success).toBe(true);
        expect(result.stdout).toContain('Usage:');
        expect(result.stdout).toContain(command);
        helpTexts.push(result.stdout);
      }

      // All help texts should follow similar patterns
      for (const helpText of helpTexts) {
        expect(helpText).toContain('Usage:');
        expect(helpText).toContain('Options:');
      }
    });
  });
});