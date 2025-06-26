#!/usr/bin/env node
// CLI entry point for Claude CLI

import { Command } from 'commander';
import chalk from 'chalk';
import * as readline from 'readline';
import { setupAutonomousCommand } from './cli/autonomous';
import { initializeSession } from './session';

const program = new Command();

program
  .name('claude')
  .description('Claude CLI - Interact with Claude from your terminal')
  .version('1.0.0');

// Chat command (default)
program
  .command('chat', { isDefault: true })
  .description('Start an interactive chat session with Claude')
  .option('-m, --model <model>', 'Model to use', 'claude-3-5-sonnet-20241022')
  .option('--max-tokens <tokens>', 'Maximum tokens in response', '4096')
  .option('--temperature <temp>', 'Temperature for responses', '1')
  .option('--no-stream', 'Disable streaming responses')
  .action(async (options) => {
    // Initialize session
    const session = initializeSession();
    console.log(chalk.blue('🤖 Starting Claude chat session...'));
    console.log(chalk.dim(`Session ID: ${session.getSessionId()}`));
    console.log(chalk.dim('Type "exit" or "quit" to end the session\n'));

    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });

    const askQuestion = (): void => {
      rl.question(chalk.green('You: '), async (input) => {
        if (input.toLowerCase() === 'exit' || input.toLowerCase() === 'quit') {
          const metrics = session.getMetrics();
          console.log(chalk.dim('\nSession Summary:'));
          console.log(chalk.dim(`- Total tokens: ${metrics.inputTokens + metrics.outputTokens}`));
          console.log(chalk.dim(`- Duration: ${Math.round(session.getDuration() / 1000)}s`));
          rl.close();
          return;
        }

        // Simulate response
        console.log(chalk.blue('\nClaude: '), 'This is a simulated response.');
        console.log(chalk.dim(`[Model: ${options.model}]`));
        console.log('');
        
        askQuestion();
      });
    };

    askQuestion();
  });

// Single completion
program
  .command('complete <prompt>')
  .description('Get a single completion from Claude')
  .option('-m, --model <model>', 'Model to use', 'claude-3-5-sonnet-20241022')
  .option('--max-tokens <tokens>', 'Maximum tokens in response', '4096')
  .option('--temperature <temp>', 'Temperature for response', '1')
  .action(async (prompt, options) => {
    // Simple inline implementation for single completion
    console.log(chalk.blue('Claude:'), 'This would process:', prompt);
    console.log(chalk.dim(`[Using model: ${options.model}]`));
  });

// Add the autonomous command
setupAutonomousCommand(program);

// Run if this is the main module
if (require.main === module) {
  program.parse();
} 