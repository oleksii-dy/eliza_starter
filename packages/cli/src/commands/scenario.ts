import { Command } from 'commander';
import fs from 'fs';
import path from 'path';
import yaml from 'js-yaml';
import { logger } from '@elizaos/core';
import { AgentServer } from '@elizaos/server';

import { ScenarioSchema } from '../scenarios/schema';
import { MockEngine } from '../scenarios/mock-engine';
import { EvaluationEngine } from '../scenarios/EvaluationEngine';
import { handleError } from '../utils/handle-error';
import { loadProject } from '../project';
import { startAgent } from './start/actions/agent-start';
import { resolvePgliteDir } from '../utils/resolve-utils';

export const scenario = new Command('scenario')
    .description('Run and manage testing scenarios.');

scenario.command('run <filePath> [projectPath]')
    .description('Execute a scenario from a YAML file against a project.')
    .option('-l, --live', 'Run scenario in live mode, ignoring mocks.', false)
    .action(async (filePath, projectPath, options) => {
        let mockEngine: MockEngine | undefined;

        try {
            const { runtime, scenario } = await setupScenario(filePath, projectPath, options);

            mockEngine = new MockEngine(runtime);
            if (scenario.setup?.mocks && !options.live) {
                mockEngine.applyMocks(scenario.setup.mocks);
            }

            if (scenario.setup?.commands) {
                const e2b = runtime.getService('e2b') as any;
                if (e2b) {
                    for (const command of scenario.setup.commands) {
                        await e2b.executeCode(command, 'bash');
                    }
                }
            }

            await handleRunScenario({ filePath, live: options.live }, runtime, scenario);
        } catch (error) {
            handleError(error);
        } finally {
            if (mockEngine) {
                mockEngine.restore();
            }
        }
    });

async function setupScenario(filePath: string, projectPath: string | undefined, _options: { live: boolean }) {
    const fullPath = path.resolve(filePath);
    if (!fs.existsSync(fullPath)) {
        logger.error(`Scenario file not found: ${fullPath}`);
        process.exit(1);
    }

    const fileContents = fs.readFileSync(fullPath, 'utf8');
    const data = yaml.load(fileContents);

    const validationResult = ScenarioSchema.safeParse(data);

    if (!validationResult.success) {
        logger.error(`Scenario file validation failed: ${filePath}`);
        console.error(validationResult.error.format());
        process.exit(1);
    }

    const scenario = validationResult.data;
    const runtime = await initializeScenarioRuntime(projectPath, scenario.plugins);

    return { runtime, scenario };
}

async function handleRunScenario(_args: {filePath: string, live: boolean}, runtime: any, scenario: any) {
    const sandbox = runtime.getService('e2b') as any;
    if (!sandbox) {
        throw new Error('E2B service is not available in the current runtime.');
    }

    for (const [index, runStep] of scenario.run.entries()) {
        logger.info(`Running step ${index + 1}: ${runStep.input}`);
        const result = await sandbox.executeCode(runStep.input, 'bash');
        
        const stdout = result.logs.stdout.join('\n');
        const stderr = result.logs.stderr.join('\n');
        const exitCode = result.error ? 1 : 0;

        if (runStep.evaluations) {
            const evaluationEngine = new EvaluationEngine(runStep.evaluations);
            const evalResult = { stdout, stderr, exitCode };
            const success = await evaluationEngine.run(runtime, evalResult);

            if (success) {
                logger.info(`✅ Step ${index + 1} evaluations passed.`);
            } else {
                logger.error(`❌ Step ${index + 1} evaluations failed.`);
                process.exit(1);
            }
        }
    }

    logger.info('🎉 Scenario run completed successfully.');
    process.exit(0);
}

async function initializeScenarioRuntime(projectPath: string | undefined, plugins: string[] | undefined) {
    const project = await loadProject(projectPath || process.cwd());
    const mainAgent = project.agents[0];

    if (!mainAgent?.character) {
        throw new Error('No character found in the project. Cannot initialize runtime for scenario.');
    }
    
    const server = new AgentServer();
    const dbDir = await resolvePgliteDir(undefined, undefined, project.dir);
    await server.initialize({ dataDir: dbDir });

    const runtime = await startAgent(
      mainAgent.character,
      server,
      async () => {},
      plugins,
      { isTestMode: true },
    );
    return runtime;
}
