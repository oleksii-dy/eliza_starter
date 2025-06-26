// CLI command handling for Claude CLI

import { Command } from 'commander';
import chalk from 'chalk';
import * as readline from 'readline';
import { CLIOptions, Message } from '../types';
import { AnthropicClient, validateApiKey } from '../auth';
import { initializeSession, getSession } from '../session';
import { MarkdownRenderer } from '../utils/markdown';

export function createProgram(): Command {
  const program = new Command();

  program
    .name('claude-cli')
    .description('CLI interface for Anthropic Claude AI')
    .version('1.0.0')
    .option('-k, --api-key <key>', 'Anthropic API key')
    .option('-m, --model <model>', 'Model to use', 'claude-3-sonnet-20240229')
    .option('-t, --temperature <temp>', 'Temperature (0-1)', parseFloat, 0.7)
    .option('-M, --max-tokens <tokens>', 'Max tokens', parseInt, 1000)
    .option('-s, --stream', 'Enable streaming output')
    .option('-v, --verbose', 'Enable verbose output')
    .option('-d, --debug', 'Enable debug mode')
    .option('--non-interactive', 'Run in non-interactive mode');

  // Chat command
  program
    .command('chat')
    .description('Start an interactive chat session')
    .action(async (options) => {
      const opts = program.opts<CLIOptions>();
      await handleChatCommand(opts);
    });

  // Complete command
  program
    .command('complete <prompt...>')
    .description('Get a single completion')
    .action(async (prompt: string[], options) => {
      const opts = program.opts<CLIOptions>();
      const promptText = prompt.join(' ');
      await handleCompleteCommand(promptText, opts);
    });

  // Auth command
  program
    .command('auth')
    .description('Authenticate with Claude')
    .action(async () => {
      await handleAuthCommand();
    });

  return program;
}

async function handleChatCommand(options: CLIOptions): Promise<void> {
  console.log(chalk.blue('🤖 Starting Claude CLI chat session...'));
  console.log(chalk.gray('Type "exit" or "quit" to end the session'));
  console.log();

  const session = initializeSession();
  const client = createClient(options);
  const messages: Message[] = [];
  const renderer = new MarkdownRenderer();

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
    prompt: chalk.green('You: ')
  });

  rl.prompt();

  rl.on('line', async (input) => {
    const trimmed = input.trim();
    
    if (trimmed === 'exit' || trimmed === 'quit') {
      console.log(chalk.yellow('\nEnding chat session...'));
      displaySessionMetrics();
      rl.close();
      return;
    }

    if (!trimmed) {
      rl.prompt();
      return;
    }

    messages.push({ role: 'user', content: trimmed });

    try {
      console.log(chalk.blue('\nClaude: '));
      
      if (options.stream) {
        await streamResponse(client, messages, options);
      } else {
        const response = await getResponse(client, messages, options);
        console.log(renderer.render(response));
      }
      
      console.log();
    } catch (error) {
      console.error(chalk.red(`\nError: ${error instanceof Error ? error.message : 'Unknown error'}`));
    }

    rl.prompt();
  });

  rl.on('close', () => {
    session.saveSession();
    process.exit(0);
  });
}

async function handleCompleteCommand(prompt: string, options: CLIOptions): Promise<void> {
  const session = initializeSession();
  const client = createClient(options);
  const renderer = new MarkdownRenderer();

  try {
    if (options.verbose) {
      console.log(chalk.gray(`Model: ${options.model}`));
      console.log(chalk.gray(`Temperature: ${options.temperature}`));
      console.log(chalk.gray(`Max tokens: ${options.maxTokens}`));
    }

    console.log(chalk.blue('\nClaude:'));
    
    const messages: Message[] = [{ role: 'user', content: prompt }];
    
    if (options.stream) {
      await streamResponse(client, messages, options);
    } else {
      const response = await getResponse(client, messages, options);
      console.log(renderer.render(response));
    }
    
    console.log();
    displaySessionMetrics();
    session.saveSession();
  } catch (error) {
    console.error(chalk.red(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`));
    process.exit(1);
  }
}

async function handleAuthCommand(): Promise<void> {
  console.log(chalk.blue('🔐 Claude CLI Authentication'));
  console.log();
  console.log('To use Claude CLI, you need an Anthropic API key.');
  console.log('Get your API key from: https://console.anthropic.com/');
  console.log();
  console.log('Set your API key using one of these methods:');
  console.log('1. Export environment variable: export ANTHROPIC_API_KEY=sk-...');
  console.log('2. Pass it as a flag: claude-cli --api-key sk-... chat');
  console.log();
}

function createClient(options: CLIOptions): AnthropicClient {
  const apiKey = options.apiKey || process.env.ANTHROPIC_API_KEY || '';
  
  if (!apiKey) {
    console.error(chalk.red('Error: No API key provided'));
    console.error('Run "claude-cli auth" for help');
    process.exit(1);
  }

  if (!validateApiKey(apiKey)) {
    console.error(chalk.red('Error: Invalid API key format'));
    process.exit(1);
  }

  return new AnthropicClient({ apiKey });
}

async function getResponse(
  client: AnthropicClient,
  messages: Message[],
  options: CLIOptions
): Promise<string> {
  const response = await client.createMessage({
    model: options.model || 'claude-3-sonnet-20240229',
    messages: messages,
    max_tokens: options.maxTokens || 1000,
    temperature: options.temperature || 0.7,
  });

  const session = getSession();
  if (response.usage) {
    session.addTokenUsage(response.usage);
  }

  const assistantMessage = response.content[0]?.text || 'No response';
  messages.push({ role: 'assistant', content: assistantMessage });
  
  return assistantMessage;
}

async function streamResponse(
  client: AnthropicClient,
  messages: Message[],
  options: CLIOptions
): Promise<void> {
  let fullResponse = '';
  
  const stream = client.streamMessage({
    model: options.model || 'claude-3-sonnet-20240229',
    messages: messages,
    max_tokens: options.maxTokens || 1000,
    temperature: options.temperature || 0.7,
  });

  for await (const event of stream) {
    if (event.type === 'content_block_delta' && event.delta?.text) {
      process.stdout.write(event.delta.text);
      fullResponse += event.delta.text;
    } else if (event.type === 'message_stop' && event.usage) {
      const session = getSession();
      session.addTokenUsage(event.usage);
    }
  }

  messages.push({ role: 'assistant', content: fullResponse });
}

function displaySessionMetrics(): void {
  const session = getSession();
  const metrics = session.getMetrics();
  const duration = session.getDuration();

  console.log();
  console.log(chalk.gray('─'.repeat(50)));
  console.log(chalk.bold('Session Metrics:'));
  console.log(`  Duration: ${Math.round(duration / 1000)}s`);
  console.log(`  Input tokens: ${metrics.inputTokens}`);
  console.log(`  Output tokens: ${metrics.outputTokens}`);
  console.log(`  Total tokens: ${metrics.inputTokens + metrics.outputTokens}`);
  console.log(`  Estimated cost: $${metrics.totalCost.toFixed(4)}`);
  console.log(chalk.gray('─'.repeat(50)));
}

export { handleChatCommand, handleCompleteCommand, handleAuthCommand }; 