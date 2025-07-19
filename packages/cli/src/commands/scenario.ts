import { Command } from 'commander';
import yaml from 'js-yaml';
import fs from 'fs';
import path from 'path';
import { logger } from '@elizaos/core';
import { ScenarioSchema } from '../scenarios/schema';
import { LocalEnvironmentProvider } from '../scenarios/local-provider';

export const scenario = new Command()
    .name('scenario')
    .description('Manage and execute ElizaOS scenarios.');

scenario.command('run <filePath>')
    .description('Execute a scenario from a YAML file.')
    .option('-l, --live', 'Run scenario in live mode, ignoring mocks.', false)
    .action(async (filePath, options) => {
        await handleRunScenario({ filePath, ...options });
    });


// The core logic for the command
async function handleRunScenario(args: {filePath: string, live: boolean}) {
  logger.info(`Starting scenario run with args: ${JSON.stringify(args)}`);
  const provider = new LocalEnvironmentProvider();
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

    await provider.setup(validatedScenario);
    const result = await provider.run(validatedScenario);

    logger.info('Scenario run finished.');
    logger.info(`Exit Code: ${result.exitCode}`);
    logger.info(`STDOUT: \n${result.stdout}`);
    if (result.stderr) {
        logger.error(`STDERR: \n${result.stderr}`);
    }

  } catch (error) {
    logger.error('An unexpected error occurred during scenario execution:');
    logger.error(error);
    process.exit(1);
  } finally {
    await provider.teardown();
  }
} 