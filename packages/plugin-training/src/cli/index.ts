#!/usr/bin/env node

import { Command } from 'commander';
import { addExampleCommand } from './commands/add-example.js';
import { createDatasetCommand } from './commands/create-dataset.js';
import { trainModelCommand } from './commands/train-model.js';
import { testModelCommand } from './commands/test-model.js';
import { listExamplesCommand } from './commands/list-examples.js';
import { extractSimpleCommand } from './commands/extract-simple.js';
import { simulateTrainingCommand } from './commands/simulate-training.js';
import { trainWithMonitoringCommand, monitorExistingCommand, listJobsCommand } from './commands/train-with-monitoring.js';
import { testFineTunedCommand } from './commands/test-fine-tuned.js';
import { customReasoningCommands } from './commands/custom-reasoning.js';
// import { extractFromDbCommand } from './commands/extract-from-db.js'; // Temporarily disabled

const program = new Command();

program
  .name('eliza-training')
  .description('Together.ai training tools and custom reasoning for ElizaOS')
  .version('1.0.0');

// Traditional training commands
addExampleCommand(program);
createDatasetCommand(program);
trainModelCommand(program);
testModelCommand(program);
listExamplesCommand(program);
extractSimpleCommand(program);
simulateTrainingCommand(program);

// Live monitoring commands
trainWithMonitoringCommand(program);
monitorExistingCommand(program);
listJobsCommand(program);

// Model testing
testFineTunedCommand(program);

// Custom reasoning commands
customReasoningCommands(program);

// extractFromDbCommand(program); // Temporarily disabled

program.parse();