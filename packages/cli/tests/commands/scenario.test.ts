import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { Command } from 'commander';
import { scenarioCommand } from '../../src/commands/scenario/index.js';
import type { Scenario } from '../../src/scenario-runner/types.js';
import * as fs from 'fs/promises';
import * as path from 'path';

// Mock the dependencies
vi.mock('../../src/project.js', () => ({
  loadProject: vi.fn().mockResolvedValue({
    agents: [{
      character: {
        id: 'test-character',
        name: 'Test Agent',
        bio: ['Test bio'],
        system: 'Test system',
      },
      plugins: [],
    }],
  }),
}));

vi.mock('@elizaos/server', () => ({
  AgentServer: vi.fn().mockImplementation(() => ({
    agents: new Map(),
    database: {},
    initialize: vi.fn(),
    registerAgent: vi.fn(),
    unregisterAgent: vi.fn(),
    stop: vi.fn(),
  })),
}));

vi.mock('@elizaos/core', () => ({
  AgentRuntime: vi.fn().mockImplementation(() => ({
    agentId: 'test-agent-id',
    character: { name: 'Test Agent' },
    initialize: vi.fn(),
    ensureWorldExists: vi.fn(),
    ensureRoomExists: vi.fn(),
    createMemory: vi.fn(),
    emitEvent: vi.fn(),
    useModel: vi.fn().mockResolvedValue('PASS'),
  })),
  createUniqueUuid: vi.fn(() => 'test-uuid'),
  asUUID: vi.fn((id) => id),
  ChannelType: {
    DM: 'dm',
    GROUP: 'group',
  },
  ModelType: {
    TEXT_LARGE: 'text-large',
    TEXT_SMALL: 'text-small',
  },
  logger: {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
    success: vi.fn(),
  },
}));

describe('Scenario Command Integration', () => {
  let program: Command;

  beforeEach(() => {
    program = new Command();
    program.addCommand(scenarioCommand);
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Command Structure', () => {
    it('should have scenario command with correct options', () => {
      const scenario = program.commands.find(cmd => cmd.name() === 'scenario');
      
      expect(scenario).toBeDefined();
      expect(scenario?.options).toContainEqual(
        expect.objectContaining({ long: '--scenario' })
      );
      expect(scenario?.options).toContainEqual(
        expect.objectContaining({ long: '--directory' })
      );
      expect(scenario?.options).toContainEqual(
        expect.objectContaining({ long: '--filter' })
      );
      expect(scenario?.options).toContainEqual(
        expect.objectContaining({ long: '--benchmark' })
      );
      expect(scenario?.options).toContainEqual(
        expect.objectContaining({ long: '--verbose' })
      );
      expect(scenario?.options).toContainEqual(
        expect.objectContaining({ long: '--output' })
      );
      expect(scenario?.options).toContainEqual(
        expect.objectContaining({ long: '--format' })
      );
      expect(scenario?.options).toContainEqual(
        expect.objectContaining({ long: '--parallel' })
      );
      expect(scenario?.options).toContainEqual(
        expect.objectContaining({ long: '--max-concurrency' })
      );
    });

    it('should have generate subcommand', () => {
      const scenario = program.commands.find(cmd => cmd.name() === 'scenario');
      const generate = scenario?.commands.find(cmd => cmd.name() === 'generate');
      
      expect(generate).toBeDefined();
      expect(generate?.description()).toContain('Generate a new scenario using AI');
    });
  });

  describe('Scenario Execution', () => {
    it('should execute scenario with proper setup', async () => {
      const testScenario: Scenario = {
        id: 'test-scenario',
        name: 'Test Scenario',
        description: 'Integration test scenario',
        actors: [
          {
            id: 'subject' as any,
            name: 'Subject Agent',
            role: 'subject',
            script: {
              steps: [
                { type: 'message', content: 'Hello from integration test' },
              ],
            },
          },
        ],
        setup: {
          roomType: 'dm',
        },
        execution: {
          maxDuration: 5000,
        },
        verification: {
          rules: [
            {
              id: 'test-rule',
              type: 'llm',
              description: 'Test verification',
              config: {},
            },
          ],
        },
      };

      // Create a temporary scenario file
      const tempDir = path.join(process.cwd(), '.test-scenarios');
      await fs.mkdir(tempDir, { recursive: true });
      const scenarioPath = path.join(tempDir, 'test-scenario.json');
      await fs.writeFile(scenarioPath, JSON.stringify(testScenario));

      // Mock console output
      const consoleLog = vi.spyOn(console, 'log').mockImplementation(() => {});
      const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});

      try {
        // Execute the command - catch to prevent test failure on expected exit
        await program.parseAsync(['node', 'test', 'scenario', '--scenario', scenarioPath]);
      } catch (error) {
        // Expected to exit with code, check that scenario was processed
      }

      // Clean up
      await fs.rm(tempDir, { recursive: true, force: true });
      consoleLog.mockRestore();
      consoleError.mockRestore();

      // Verify the command attempted to run scenarios
      const { logger } = await import('@elizaos/core');
      expect(logger.info).toHaveBeenCalledWith(expect.stringContaining('Found'));
    });
  });

  describe('Generate Subcommand', () => {
    it('should parse generate command options', () => {
      const scenario = program.commands.find(cmd => cmd.name() === 'scenario');
      const generate = scenario?.commands.find(cmd => cmd.name() === 'generate');
      
      expect(generate?.options).toContainEqual(
        expect.objectContaining({ long: '--plugins' })
      );
      expect(generate?.options).toContainEqual(
        expect.objectContaining({ long: '--complexity' })
      );
      expect(generate?.options).toContainEqual(
        expect.objectContaining({ long: '--test-type' })
      );
      expect(generate?.options).toContainEqual(
        expect.objectContaining({ long: '--duration' })
      );
      expect(generate?.options).toContainEqual(
        expect.objectContaining({ long: '--actors' })
      );
      expect(generate?.options).toContainEqual(
        expect.objectContaining({ long: '--output' })
      );
      expect(generate?.options).toContainEqual(
        expect.objectContaining({ long: '--enhance' })
      );
    });
  });

  describe('Error Handling', () => {
    it('should handle missing scenario files gracefully', async () => {
      const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
      const processExit = vi.spyOn(process, 'exit').mockImplementation(() => {
        throw new Error('Process exit');
      });

      try {
        await program.parseAsync(['node', 'test', 'scenario', '--scenario', '/non/existent/file.json']);
      } catch (error) {
        // Expected
      }

      expect(consoleError).toHaveBeenCalled();
      
      consoleError.mockRestore();
      processExit.mockRestore();
    });

    it('should handle empty scenarios directory', async () => {
      const tempDir = path.join(process.cwd(), '.empty-scenarios');
      await fs.mkdir(tempDir, { recursive: true });

      const consoleLog = vi.spyOn(console, 'log').mockImplementation(() => {});

      try {
        await program.parseAsync(['node', 'test', 'scenario', '--directory', tempDir]);
      } catch {
        // Expected
      }

      await fs.rm(tempDir, { recursive: true, force: true });
      consoleLog.mockRestore();

      const { logger } = await import('@elizaos/core');
      expect(logger.warn).toHaveBeenCalledWith('No scenarios found to run');
    });
  });

  describe('Output Formats', () => {
    it('should support different output formats', async () => {
      const testScenario: Scenario = {
        id: 'format-test',
        name: 'Format Test',
        description: 'Test output formats',
        actors: [
          {
            id: 'subject' as any,
            name: 'Subject',
            role: 'subject',
            script: { steps: [] },
          },
        ],
        setup: {},
        execution: {},
        verification: {
          rules: [
            {
              id: 'test',
              type: 'llm',
              description: 'Test',
              config: {},
            },
          ],
        },
      };

      const tempDir = path.join(process.cwd(), '.format-test');
      await fs.mkdir(tempDir, { recursive: true });
      const scenarioPath = path.join(tempDir, 'test.json');
      await fs.writeFile(scenarioPath, JSON.stringify(testScenario));

      // Test JSON format
      const jsonOutput = path.join(tempDir, 'results.json');
      try {
        await program.parseAsync([
          'node', 'test', 'scenario',
          '--scenario', scenarioPath,
          '--format', 'json',
          '--output', jsonOutput
        ]);
      } catch {
        // Expected
      }

      // Test HTML format
      const htmlOutput = path.join(tempDir, 'results.html');
      try {
        await program.parseAsync([
          'node', 'test', 'scenario',
          '--scenario', scenarioPath,
          '--format', 'html',
          '--output', htmlOutput
        ]);
      } catch {
        // Expected
      }

      // Clean up
      await fs.rm(tempDir, { recursive: true, force: true });
    });
  });
}); 