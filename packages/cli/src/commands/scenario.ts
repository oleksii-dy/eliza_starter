import { Command } from 'commander';
import yaml from 'js-yaml';
import fs from 'fs';
import path from 'path';
import { logger } from '@elizaos/core';
import { ScenarioSchema, type Scenario } from '../scenarios/schema'; // Import our new schema

export const scenario = new Command()
    .name('scenario')
    .description('Manage and execute ElizaOS scenarios.');

scenario.command('run <filePath>')
    .description('Execute a scenario from a YAML file.')
    .option('-l, --live', 'Run scenario in live mode, ignoring mocks.', false)
    .action((filePath, options) => {
        handleRunScenario({ filePath, ...options });
    });


// The core logic for the command
function handleRunScenario(args: {filePath: string, live: boolean}) {
  logger.info(`Starting scenario run with args: ${JSON.stringify(args)}`);
  try {
    const fullPath = path.resolve(args.filePath);
    logger.info(`Attempting to read scenario file from: ${fullPath}`);
    if (!fs.existsSync(fullPath)) {
      logger.error(`Error: File not found at '${fullPath}'`);
      process.exit(1);
    }
    const fileContents = fs.readFileSync(fullPath, 'utf8');
    const rawScenario = yaml.load(fileContents);

    const validationResult = ScenarioSchema.safeParse(rawScenario);

    if (!validationResult.success) {
      logger.error('Scenario file validation failed:');
      console.error(JSON.stringify(validationResult.error.format(), null, 2));
      process.exit(1);
    }
    
    // The data is now guaranteed to be of type 'Scenario'
    const scenario: Scenario = validationResult.data;

    console.log('--- Validated Scenario Object ---');
    console.log(JSON.stringify(scenario, null, 2));
    console.log('-------------------------------');
    
    logger.info('Scenario file parsed and validated successfully.');
  } catch (error) {
    logger.error('An error occurred during scenario execution:', error);
    process.exit(1);
  }
} 