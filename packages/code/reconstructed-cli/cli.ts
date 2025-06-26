#!/usr/bin/env node
// CLI entry point for the Claude CLI application

import { parseArguments, executeCommand } from './cli/index.js';
import { initializeSession } from './session/index.js';
import { AnthropicClient } from './auth/index.js';
import chalk from 'chalk';
import dotenv from 'dotenv';
import { Command } from 'commander';

// Load environment variables
dotenv.config();

// Initialize session
const session = initializeSession();

// Create the main CLI program
const program = new Command();

program
  .name('claude-cli')
  .description('CLI interface for Anthropic Claude AI')
  .version('1.0.0')
  .option('-d, --debug', 'Enable debug mode')
  .option('-v, --verbose', 'Enable verbose output')
  .option('--api-key <key>', 'Anthropic API key')
  .option('--model <model>', 'Model to use (opus, sonnet, haiku)', 'sonnet');

// Add commands
program
  .command('chat')
  .description('Start an interactive chat session')
  .action(async (options) => {
    console.log(chalk.blue('Starting chat session...'));
    // Implementation would go here
  });

program
  .command('complete <prompt>')
  .description('Get a single completion')
  .action(async (prompt, options) => {
    try {
      const client = new AnthropicClient({
        apiKey: options.apiKey || process.env.ANTHROPIC_API_KEY
      });
      
      console.log(chalk.blue('Processing...'));
      // Implementation would go here
      
    } catch (error) {
      console.error(chalk.red('Error:'), error.message);
      process.exit(1);
    }
  });

program
  .command('auth')
  .description('Authenticate with Claude')
  .action(async () => {
    console.log(chalk.blue('Starting authentication flow...'));
    // OAuth flow would go here
  });

// Parse command line arguments
async function main() {
  try {
    await program.parseAsync(process.argv);
  } catch (error) {
    console.error(chalk.red('Error:'), error.message);
    process.exit(1);
  }
}

// Run the CLI
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

export { program, main }; 