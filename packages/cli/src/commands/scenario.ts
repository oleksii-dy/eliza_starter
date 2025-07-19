import { Command } from 'commander';
import yaml from 'js-yaml';
import fs from 'fs';
import path from 'path';
import { logger, IAgentRuntime } from '@elizaos/core';
import { ScenarioSchema } from '../scenarios/schema';
import { LocalEnvironmentProvider } from '../scenarios/local-provider';
import { E2BEnvironmentProvider } from '../scenarios/e2b-provider';
import { EnvironmentProvider } from '../scenarios/providers';
import { loadProject } from '../project';
import { AgentServer } from '@elizaos/server';
import { startAgent } from './start/actions/agent-start';
import { configureDatabaseSettings } from '../utils/get-config';
import { resolvePgliteDir } from '../utils/resolve-utils';
import { MockEngine } from '../scenarios/mock-engine';

export const scenario = new Command()
    .name('scenario')
    .description('Manage and execute ElizaOS scenarios.');

/**
 * Initializes an AgentRuntime for a given project.
 * This is a temporary, one-off runtime for the scenario.
 * @param projectPath The path to the project to load.
 * @returns A promise that resolves to the initialized IAgentRuntime.
 */
async function initializeScenarioRuntime(projectPath: string): Promise<IAgentRuntime> {
    const project = await loadProject(projectPath);
    const mainAgent = project.agents[0];

    if (!mainAgent?.character) {
        throw new Error('No character found in the project. Cannot initialize runtime for scenario.');
    }

    const server = new AgentServer();
    const postgresUrl = await configureDatabaseSettings();
    const pgliteDataDir = postgresUrl ? undefined : await resolvePgliteDir(undefined, undefined, project.dir);

    await server.initialize({
        dataDir: pgliteDataDir,
        postgresUrl: postgresUrl || undefined,
    });

    return startAgent(
        mainAgent.character,
        server,
        undefined,
        mainAgent.plugins,
        { isTestMode: true }
    );
}


scenario.command('run <filePath> [projectPath]')
    .description('Execute a scenario from a YAML file against a project.')
    .option('-l, --live', 'Run scenario in live mode, ignoring mocks.', false)
    .action(async (filePath, projectPath, options) => {
        let mockEngine: MockEngine | undefined;
        try {
            const targetProjectDir = path.resolve(projectPath || process.cwd());
            const runtime = await initializeScenarioRuntime(targetProjectDir);
            
            mockEngine = new MockEngine(runtime);

            await handleRunScenario({ filePath, ...options }, runtime, mockEngine);
            
            process.exit(0);
        } catch (error) {
            logger.error('An unexpected error occurred during scenario execution:');
            logger.error(error);
            process.exit(1);
        } finally {
            mockEngine?.restoreMocks();
        }
    });

async function handleRunScenario(args: {filePath: string, live: boolean}, runtime: IAgentRuntime, mockEngine: MockEngine) {
  logger.info(`Starting scenario run with args: ${JSON.stringify(args)}`);
  
  let provider: EnvironmentProvider;
  
  try {
    const fullPath = path.resolve(args.filePath);
    logger.info(`Attempting to read scenario file from: ${fullPath}`);
    if (!fs.existsSync(fullPath)) {
      logger.error(`Error: File not found at '${fullPath}'`);
      process.exit(1);
    }

    const fileContents = fs.readFileSync(fullPath, 'utf8');
    const data = yaml.load(fileContents);

    const validationResult = ScenarioSchema.safeParse(data);

    if (!validationResult.success) {
      logger.error('Scenario file validation failed:');
      console.error(validationResult.error.format());
      process.exit(1);
    }
    
    const validatedScenario = validationResult.data;

    if (validatedScenario.setup?.mocks && !args.live) {
        mockEngine.applyMocks(validatedScenario.setup.mocks);
    }

    if (validatedScenario.environment.type === 'e2b') {
        provider = new E2BEnvironmentProvider(runtime);
    } else {
        provider = new LocalEnvironmentProvider();
    }

    await provider.setup(validatedScenario);

    let combinedStdout = '';
    for (const step of validatedScenario.run) {
        const result = await provider.run({ ...validatedScenario, run: [step] });
        combinedStdout += result.stdout;

        if (result.stderr) {
            logger.error(`STDERR: \n${result.stderr}`);
        }

        if (step.evaluations) {
            for (const evaluation of step.evaluations) {
                if (evaluation.type === 'stdout_contains') {
                    if (!result.stdout.includes(evaluation.value)) {
                        logger.error(`Evaluation failed: stdout does not contain "${evaluation.value}"`);
                        process.exit(1);
                    }
                }
            }
        }
    }

    logger.info('All scenario evaluations passed.');

    await provider.teardown();
  } catch (error) {
    logger.error('An unexpected error occurred during scenario execution:');
    logger.error(error);
    throw error; // Rethrow to be caught by the main try/catch
  }
}
