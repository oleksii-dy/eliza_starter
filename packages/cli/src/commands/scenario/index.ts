import { Command } from 'commander';
import path from 'path';
import fs from 'fs/promises';
import { existsSync } from 'fs';
import { logger } from '@elizaos/core';
import { loadProject } from '../../project.js';
import {
  ScenarioRunner,
  type Scenario,
  type ScenarioRunOptions,
} from '../../scenario-runner/index.js';
import { AgentServer } from '@elizaos/server';
import { displayScenarioResults, saveResults } from './display.js';
import { generateScenarioCommand } from './generate.js';

interface ScenarioCommandOptions {
  scenario?: string;
  directory?: string;
  filter?: string;
  benchmark?: boolean;
  verbose?: boolean;
  output?: string;
  format?: 'json' | 'text' | 'html';
  parallel?: boolean;
  maxConcurrency?: string;
}

export const scenarioCommand = new Command('scenario')
  .description('Run scenario tests against agents')
  .option('-s, --scenario <path>', 'Path to specific scenario file')
  .option('-d, --directory <path>', 'Directory containing scenario files')
  .option('-f, --filter <pattern>', 'Filter scenarios by name pattern')
  .option('-b, --benchmark', 'Run in benchmark mode with detailed metrics')
  .option('-v, --verbose', 'Verbose output')
  .option('-o, --output <file>', 'Output file for results')
  .option('--format <type>', 'Output format (json|text|html)', 'text')
  .option('-p, --parallel', 'Run scenarios in parallel')
  .option('--max-concurrency <num>', 'Maximum concurrent scenarios', '3')
  .action(async (options: ScenarioCommandOptions) => {
    console.log('Scenario command action triggered with options:', options);
    try {
      await runScenarioCommand(options);
    } catch (error) {
      logger.error('Scenario command failed:', error);
      console.error('Full error:', error);
      process.exit(1);
    }
  })
  .addCommand(generateScenarioCommand);

async function runScenarioCommand(options: ScenarioCommandOptions): Promise<void> {
  // Load scenarios
  const scenarios = await loadScenarios(options);

  if (scenarios.length === 0) {
    logger.warn('No scenarios found to run');
    return;
  }

  logger.info(`Found ${scenarios.length} scenario(s) to run`);

  // Initialize the server and runtime
  const { server, runtime, cleanup } = await initializeServer();

  try {
    // Create scenario runner
    const runner = new ScenarioRunner(server, runtime);

    // Configure run options
    const runOptions: ScenarioRunOptions = {
      benchmark: options.benchmark,
      verbose: options.verbose,
      outputFormat: options.format,
      parallel: options.parallel,
      maxConcurrency: options.maxConcurrency ? parseInt(options.maxConcurrency, 10) : 3,
    };

    // Run scenarios
    let results;
    try {
      results = await runner.runScenarios(scenarios, runOptions);
    } catch (runError) {
      logger.error('Error running scenarios:', runError);
      throw runError;
    }

    // Display results
    displayScenarioResults(results, runOptions);

    // Save results if output file specified
    if (options.output) {
      await saveResults(results, options.output, options.format || 'json');
      logger.info(`Results saved to ${options.output}`);
    }

    // Summary
    const passed = results.filter((r) => r.passed).length;
    const failed = results.length - passed;

    logger.info(`\nSummary: ${passed} passed, ${failed} failed, ${results.length} total`);

    // Exit with error code if any scenarios failed
    if (failed > 0) {
      process.exit(1);
    }
  } finally {
    await cleanup();
  }
}

async function loadScenarios(options: ScenarioCommandOptions): Promise<Scenario[]> {
  const scenarios: Scenario[] = [];

  if (options.scenario) {
    // Load single scenario file
    const scenario = await loadScenarioFile(options.scenario);
    scenarios.push(scenario);
  } else if (options.directory) {
    // Load all scenarios from directory
    const dirScenarios = await loadScenariosFromDirectory(options.directory);
    scenarios.push(...dirScenarios);
  } else {
    // Look for scenarios in default locations
    const defaultLocations = [
      './scenarios',
      './test/scenarios',
      './tests/scenarios',
      './src/scenarios',
    ];

    for (const location of defaultLocations) {
      if (existsSync(location)) {
        const dirScenarios = await loadScenariosFromDirectory(location);
        scenarios.push(...dirScenarios);
        break;
      }
    }
  }

  // Apply filter if specified
  if (options.filter) {
    const filterRegex = new RegExp(options.filter, 'i');
    return scenarios.filter(
      (scenario) =>
        filterRegex.test(scenario.name) ||
        filterRegex.test(scenario.id) ||
        scenario.tags?.some((tag) => filterRegex.test(tag))
    );
  }

  return scenarios;
}

async function loadScenarioFile(filePath: string): Promise<Scenario> {
  try {
    const fullPath = path.resolve(filePath);

    if (!existsSync(fullPath)) {
      throw new Error(`Scenario file not found: ${fullPath}`);
    }

    const content = await fs.readFile(fullPath, 'utf-8');

    if (filePath.endsWith('.json')) {
      return JSON.parse(content) as Scenario;
    } else if (filePath.endsWith('.ts') || filePath.endsWith('.js')) {
      // Dynamic import for TypeScript/JavaScript scenario files
      const module = await import(fullPath);
      return module.default || module.scenario;
    } else {
      throw new Error(`Unsupported scenario file format: ${filePath}`);
    }
  } catch (error) {
    throw new Error(
      `Failed to load scenario from ${filePath}: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}

async function loadScenariosFromDirectory(dirPath: string): Promise<Scenario[]> {
  const scenarios: Scenario[] = [];

  try {
    const files = await fs.readdir(dirPath);

    for (const file of files) {
      const filePath = path.join(dirPath, file);
      const stats = await fs.stat(filePath);

      if (
        stats.isFile() &&
        (file.endsWith('.json') || file.endsWith('.ts') || file.endsWith('.js'))
      ) {
        try {
          const scenario = await loadScenarioFile(filePath);
          scenarios.push(scenario);
        } catch (error) {
          logger.warn(`Failed to load scenario from ${filePath}:`, error);
        }
      } else if (stats.isDirectory()) {
        // Recursively load from subdirectories
        const subScenarios = await loadScenariosFromDirectory(filePath);
        scenarios.push(...subScenarios);
      }
    }
  } catch (error) {
    logger.warn(`Failed to read scenarios from directory ${dirPath}:`, error);
  }

  return scenarios;
}

async function initializeServer(): Promise<{
  server: AgentServer;
  runtime: import('@elizaos/core').IAgentRuntime;
  cleanup: () => Promise<void>;
}> {
  // Load project configuration
  const project = await loadProject(process.cwd());

  if (!project.agents || project.agents.length === 0) {
    throw new Error('No agents found in project');
  }

  // Use the first agent's character for testing
  const agent = project.agents[0];
  if (!agent.character) {
    throw new Error('No character configuration found in first agent');
  }

  // Initialize server with test configuration
  const server = new AgentServer();

  // Initialize the server with the database
  await server.initialize({
    dataDir: path.join(process.cwd(), '.scenario-test-db'), // Use temporary SQLite file
  });

  // Create a runtime for the agent
  const { AgentRuntime } = await import('@elizaos/core');
  const sqlModule = await import('@elizaos/plugin-sql');
  const sqlPlugin = sqlModule.plugin;

  // Import the rolodex plugin for entity and relationship management
  const rolodexModule = await import('@elizaos/plugin-rolodex');
  const rolodexPlugin = (rolodexModule as any).default || rolodexModule;

  // Ensure database is available
  if (!(server as any).database) {
    throw new Error('Server database not initialized');
  }

  // Create a mock model provider plugin for testing
  const { ModelType } = await import('@elizaos/core');
  
  // Note: mockModelPlugin is defined for potential future use in testing scenarios
  // It can be added to plugins if mock responses are needed
  const _mockModelPlugin = {
    name: 'mock-model-provider',
    description: 'Mock model provider for testing',
    models: {
      [ModelType.TEXT_LARGE]: async (_params: any) => {
        // Simple mock responses for common prompts
        const prompt = _params.prompt || '';
        if (prompt.includes('DM') && prompt.includes('GROUP')) {
          return 'GROUP';
        }
        if (prompt.includes('PASSED') && prompt.includes('FAILED')) {
          return 'PASSED: The test criteria were met successfully.';
        }
        return 'This is a mock response for testing purposes.';
      },
      [ModelType.TEXT_SMALL]: async (_params: any) => {
        return 'Mock small model response.';
      },
    },
  };

  // Include the SQL plugin, rolodex plugin, and mock model plugin with the agent's plugins
  const agentWithPlugins = {
    ...agent,
    plugins: [...(agent.plugins || []), sqlPlugin, rolodexPlugin],
  };

  const runtime = new AgentRuntime({
    character: agent.character,
    plugins: agentWithPlugins.plugins,
  });

  // Initialize the runtime
  await runtime.initialize();

  // Register the agent with the server
  await server.registerAgent(runtime);

  // Verify the agent was registered
  logger.info(`Registered agent: ${runtime.agentId}`);
  logger.info(`Server has ${(server as any).agents?.size || 0} agents`);

  const cleanup = async () => {
    try {
      await server.stop();
    } catch (error) {
      logger.warn('Error stopping server:', error);
    }
  };

  return { server, runtime, cleanup };
}

// Export individual functions for testing
export {
  runScenarioCommand,
  loadScenarios,
  loadScenarioFile,
  loadScenariosFromDirectory,
  initializeServer,
};
