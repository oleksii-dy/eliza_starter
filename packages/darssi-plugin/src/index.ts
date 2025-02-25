// src/index.ts

// 1️⃣ Load environment variables first
import dotenv from 'dotenv';
dotenv.config();

import { Plugin } from "@elizaos/core";
import chalk from 'chalk';
import Table from 'cli-table3';
import ora from 'ora';
import { FetchChapterContent } from "./actions/FetchChapterContent";
import { ContentAccuracyEvaluator } from "./evaluators/ContentAccuracyEvaluator";
import { ChapterContentProvider } from "./providers/ChapterContentProvider";
import { getDatabase } from "./utils/mongoClient"; // MongoDB initializer
import { logger } from './utils/logger';

// Start the loader
const spinner = ora({
    text: chalk.cyan('Initializing Darssi Plugin...'),
    spinner: 'dots12',
    color: 'cyan'
}).start();

// Initialize MongoDB connection
let dbAdapter;

(async () => {
    try {
        dbAdapter = await getDatabase();
        console.log(chalk.green('[MongoDB] Connected and initialized successfully.'));
        logger.log("[MongoDB] Connected and initialized successfully.");
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        console.error(chalk.red('[MongoDB] Failed to initialize:'), errorMessage);
        logger.error(`[MongoDB] Failed to initialize: ${errorMessage}`);
        process.exit(1);  // Exit if DB connection fails
    }

    // List of actions, providers, and evaluators
    const actions = [FetchChapterContent];
    const providers = [ChapterContentProvider];
    const evaluators = [ContentAccuracyEvaluator];

    // Initial banner
    logger.log("[Darssi Plugin] Plugin initialized and loading actions/providers...");

    // Log loaded actions
    actions.forEach(action => {
        logger.log(`[Darssi Plugin] Loaded Action: ${action.name}`);
        logger.debug(`[Darssi Plugin] Action details: ${JSON.stringify(action, null, 2)}`);
    });

    // Log loaded providers
    providers.forEach(provider => {
        logger.log(`[Darssi Plugin] Loaded Provider: ${provider.constructor.name || 'Unnamed Provider'}`);
    });

    // Log loaded evaluators
    evaluators.forEach(evaluator => {
        logger.log(`[Darssi Plugin] Loaded Evaluator: ${evaluator.constructor.name || 'Unnamed Evaluator'}`);
    });

    // Console banner
    console.log(`\n${chalk.cyan('┌────────────────────────────────────────┐')}`);
    console.log(chalk.cyan('│') + chalk.yellow.bold('          DARSSI PLUGIN                 ') + chalk.cyan(' │'));
    console.log(chalk.cyan('├────────────────────────────────────────┤'));
    console.log(chalk.cyan('│') + chalk.white('  Initializing Darssi Services...        ') + chalk.cyan('│'));
    console.log(chalk.cyan('│') + chalk.white('  Version: 1.0.0                         ') + chalk.cyan('│'));
    console.log(chalk.cyan('└────────────────────────────────────────┘'));

    // Stop the loader
    spinner.succeed(chalk.green('Darssi Plugin initialized successfully!'));

    // Create a table for actions
    const actionTable = new Table({
        head: [
            chalk.cyan('Action'),
            chalk.cyan('H'),
            chalk.cyan('V'),
            chalk.cyan('E'),
            chalk.cyan('Similes')
        ],
        style: {
            head: [],
            border: ['cyan']
        }
    });

    // Add action information to table
    for (const action of actions) {
        actionTable.push([
            chalk.white(action.name),
            typeof action.handler === 'function' ? chalk.green('✓') : chalk.red('✗'),
            typeof action.validate === 'function' ? chalk.green('✓') : chalk.red('✗'),
            action.examples?.length > 0 ? chalk.green('✓') : chalk.red('✗'),
            chalk.gray(action.similes?.join(', ') || 'none')
        ]);
    }

    // Display the action table
    console.log(`\n${actionTable.toString()}`);

    // Plugin status with a table
    const statusTable = new Table({
        style: {
            border: ['cyan']
        }
    });

    statusTable.push(
        [chalk.cyan('Plugin Status')],
        [chalk.white('Name    : ') + chalk.yellow('@elizaos/darssi-plugin')],
        [chalk.white('Actions : ') + chalk.green(actions.length.toString())],
        [chalk.white('Providers : ') + chalk.green(providers.length.toString())],
        [chalk.white('Evaluators : ') + chalk.green(evaluators.length.toString())],
        [chalk.white('Status  : ') + chalk.green('Loaded & Ready')]
    );

    console.log(`\n${statusTable.toString()}\n`);
})();

// Export the plugin object and database adapter
const darssiPlugin: Plugin = {
    name: "@elizaos/darssi-plugin",
    description: "Darssi plugin for course content and quiz assistance.",
    actions: [FetchChapterContent],
    providers: [ChapterContentProvider],
    evaluators: [ContentAccuracyEvaluator]
};

export { darssiPlugin, dbAdapter };
export default darssiPlugin;
