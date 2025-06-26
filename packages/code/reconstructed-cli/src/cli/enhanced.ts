// Enhanced CLI with tool calling and autonomous features

import chalk from 'chalk';
import * as readline from 'readline';
import { CLIOptions, Message } from '../types';
import { AnthropicClient } from '../auth';
import { getSession } from '../session';
import { MarkdownRenderer } from '../utils/markdown';
import { getAutonomousAgent } from '../autonomous';
import { getToolSystem, BUILT_IN_TOOLS } from '../tools';
import { SYSTEM_PROMPTS, getToolStateIndicator, PERMISSION_PROMPTS } from '../prompts';

export async function handleEnhancedChat(options: CLIOptions): Promise<void> {
  console.log(chalk.blue('🤖 Starting Enhanced Claude CLI with autonomous features...'));
  console.log(chalk.gray('Type "exit" or "quit" to end the session'));
  console.log(chalk.gray('Type "/init" to create CLAUDE.md'));
  console.log(chalk.gray('Type "/memorize <text>" to add to memory'));
  console.log();

  const { initializeSession } = await import('../session');
  const session = initializeSession();
  const agent = getAutonomousAgent();
  const toolSystem = getToolSystem();
  const renderer = new MarkdownRenderer();
  
  // Load CLAUDE.md instructions
  const instructions = await agent.loadInstructions();
  if (instructions) {
    console.log(chalk.dim('Loaded project and user instructions'));
  }

  const messages: Message[] = [];
  let currentMode: 'responding' | 'thinking' | 'tool-use' | 'tool-input' | 'requesting' = 'responding';

  // Set up tool event handlers
  toolSystem.on('tool:state:change', (state) => {
    currentMode = state.state as any;
    const indicator = getToolStateIndicator(currentMode);
    if (indicator) {
      process.stdout.write(`\r${chalk.gray(indicator)}`);
    }
  });

  toolSystem.on('tool:permission:request', async (context) => {
    console.log();
    console.log(chalk.yellow(context.message));
    console.log(chalk.gray(`Tool: ${context.tool}`));
    console.log(chalk.gray(`Input: ${JSON.stringify(context.input, null, 2)}`));
    
    // In real implementation, prompt user for permission
    // For now, auto-deny
    console.log(chalk.red('Permission denied (auto-response in demo)'));
  });

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
    prompt: chalk.green('You: ')
  });

  rl.prompt();

  rl.on('line', async (input) => {
    const trimmed = input.trim();
    
    if (trimmed === 'exit' || trimmed === 'quit') {
      console.log(chalk.yellow('\nEnding enhanced chat session...'));
      displayMetrics();
      rl.close();
      return;
    }

    // Handle special commands
    if (trimmed.startsWith('/')) {
      await handleCommand(trimmed);
      rl.prompt();
      return;
    }

    if (!trimmed) {
      rl.prompt();
      return;
    }

    messages.push({ role: 'user', content: trimmed });

    try {
      console.log(chalk.blue('\nClaude: '));
      
      // Create system prompt with loaded instructions
      const systemPrompt = [
        SYSTEM_PROMPTS.agent('Claude CLI'),
        instructions ? `\nProject context:\n${instructions}` : ''
      ].filter(Boolean).join('\n');

      // Process with enhanced features
      await processWithTools(messages, { ...options, systemPrompt });
      
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

  async function handleCommand(command: string) {
    const [cmd, ...args] = command.slice(1).split(' ');
    
    switch (cmd) {
      case 'init':
        console.log(chalk.blue('Initializing CLAUDE.md...'));
        await agent.initializeProject();
        console.log(chalk.green('✅ CLAUDE.md created'));
        break;
        
      case 'memorize':
        const content = args.join(' ');
        if (content) {
          await agent.memorize(content);
          console.log(chalk.green('✅ Memorized'));
        } else {
          console.log(chalk.red('Usage: /memorize <content>'));
        }
        break;
        
      case 'tools':
        console.log(chalk.blue('Available tools:'));
        Object.keys(BUILT_IN_TOOLS).forEach(tool => {
          console.log(`  - ${tool}`);
        });
        break;
        
      default:
        console.log(chalk.red(`Unknown command: ${cmd}`));
    }
  }

  async function processWithTools(messages: Message[], options: any) {
    // In a real implementation, this would:
    // 1. Send messages to Claude with tool definitions
    // 2. Handle tool use requests
    // 3. Execute tools with permission checks
    // 4. Return results to Claude
    
    // For demo, just show the concept
    console.log(chalk.dim('Processing with enhanced autonomous features...'));
    
    // Simulate tool usage
    if (messages[messages.length - 1].content.toLowerCase().includes('read')) {
      const toolUseId = toolSystem.generateToolUseId();
      const toolState = {
        toolUseID: toolUseId,
        name: 'read_file',
        state: 'requesting' as const,
        input: { path: 'example.txt' },
        startTime: new Date()
      };
      
      toolSystem.setToolState(toolUseId, toolState);
      
      // Check permission
      const hasPermission = await toolSystem.checkPermission({
        tool: 'read_file',
        description: 'Read contents of a file',
        input: toolState.input
      });
      
      if (!hasPermission) {
        console.log(toolSystem.renderToolUseRejectedMessage());
      }
    }
    
    // Normal response
    console.log(renderer.render('I understand your request. With full autonomous features, I would be able to execute tools and complete complex tasks.'));
  }

  function displayMetrics() {
    const metrics = session.getMetrics();
    const toolStates = toolSystem.getToolStates();
    
    console.log();
    console.log(chalk.gray('─'.repeat(50)));
    console.log(chalk.bold('Session Metrics:'));
    console.log(`  Total tokens: ${metrics.inputTokens + metrics.outputTokens}`);
    console.log(`  Tools executed: ${toolStates.resolvedToolUseIDs.size}`);
    console.log(`  Tools errored: ${toolStates.erroredToolUseIDs.size}`);
    console.log(chalk.gray('─'.repeat(50)));
  }
} 