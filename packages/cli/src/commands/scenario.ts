import { Command } from 'commander';
import fs from 'fs';
import yaml from 'js-yaml';
import { AgentServer } from '@elizaos/server';
import { plugin as sqlPlugin } from '@elizaos/plugin-sql';
import { exec } from 'child_process';

import { ScenarioSchema, type Scenario } from '../scenarios/schema';
import { MockEngine } from '../scenarios/mock-engine';
import { EvaluationEngine } from '../scenarios/EvaluationEngine';
import { Reporter } from '../scenarios/Reporter';
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
        const reporter = new Reporter();

        try {
            const { runtime, scenario } = await setupScenario(filePath, projectPath, options);

            reporter.startScenario(scenario);

            mockEngine = new MockEngine(runtime);
            if (scenario.setup?.mocks && !options.live) {
                mockEngine.applyMocks(scenario.setup.mocks);
            }

            if (scenario.setup?.commands) {
                for (const command of scenario.setup.commands) {
                    await new Promise<void>((resolve) => {
                        exec(command, () => resolve());
                    });
                }
            }

            await handleRunScenario({ filePath, live: options.live }, runtime, scenario, reporter);

            const passed = reporter.endScenario(scenario.judgment || { pass: { all: true }, fail: {} });
            process.exit(passed ? 0 : 1);

        } catch (error) {
            handleError(error);
        } finally {
            if (mockEngine) {
                mockEngine.restore();
            }
        }
    });

async function handleRunScenario(_args: {filePath: string, live: boolean}, runtime: any, scenario: any, reporter: Reporter) {
    for (const [index, runStep] of scenario.run.entries()) {
        reporter.startStep(index, runStep.input);
        
        const result = await new Promise<{ stdout: string, stderr: string, exitCode: number }>((resolve) => {
            exec(runStep.input, (error, stdout, stderr) => {
                resolve({ stdout, stderr, exitCode: error ? error.code || 1 : 0 });
            });
        });

        if (runStep.evaluations) {
            const evaluationEngine = new EvaluationEngine(runStep.evaluations);
            const evalResult = await evaluationEngine.run(runtime, result);
            reporter.endStep(index, evalResult);
        }
    }
}

async function setupScenario(filePath: string, projectPath: string | undefined, _options: { live: boolean }) {
    const scenarioFile = fs.readFileSync(filePath, 'utf8');
    const scenario = yaml.load(scenarioFile) as Scenario;

    // Validate scenario against schema
    ScenarioSchema.parse(scenario);

    // Load project and start agent
    const project = await loadProject(projectPath || process.cwd());
    const server = new AgentServer();
    const dbDir = await resolvePgliteDir();
    await server.initialize({ dataDir: dbDir });
    const runtime = await startAgent(
        project.agents[0].character,
        server,
        async () => {},
        [sqlPlugin, ...(scenario.plugins || [])],
        { isTestMode: true },
    );

    return { runtime, scenario };
}
