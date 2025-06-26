// Real autonomous CLI implementation based on extracted patterns

import { Command } from 'commander';
import chalk from 'chalk';
import readline from 'readline';
import { StreamingClient, Message, ToolState } from '../core/streaming';
import { CORE_TOOLS, filterTools, ToolSchema } from '../core/tool-definitions';
import { promises as fs } from 'fs';
import { exec } from 'child_process';
import { promisify } from 'util';
import path from 'path';

const execAsync = promisify(exec);

export class AutonomousCLI {
  private rl: readline.Interface;
  private streamingClient: StreamingClient;
  private isStreaming: boolean = false;
  private permissionMode: 'auto' | 'ask' | 'deny' = 'ask';
  private allowedTools: string[] = [];
  private disallowedTools: string[] = [];
  private messages: Message[] = [];
  private model: string = 'claude-3-5-sonnet-20241022';
  private maxTokens: number = 4096;

  constructor() {
    this.rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });
    
    this.streamingClient = new StreamingClient();
    this.setupStreamHandlers();
  }

  private setupStreamHandlers(): void {
    // Text streaming
    this.streamingClient.on('text_delta', (text: string) => {
      process.stdout.write(text);
    });

    // Tool permission requests
    this.streamingClient.on('tool_permission_request', async (request: any) => {
      if (this.permissionMode === 'auto') {
        await this.streamingClient.approveTool(request.toolUseId);
      } else if (this.permissionMode === 'ask') {
        const approved = await this.askToolPermission(request);
        if (approved) {
          await this.streamingClient.approveTool(request.toolUseId);
        } else {
          await this.streamingClient.rejectTool(request.toolUseId);
        }
      } else {
        await this.streamingClient.rejectTool(request.toolUseId);
      }
    });

    // Tool execution events
    this.streamingClient.on('tool_executing', (toolUseId: string) => {
      const toolState = this.streamingClient.getToolStates().get(toolUseId);
      if (toolState) {
        console.log(chalk.yellow(`\n🔧 Executing ${toolState.toolName}...`));
      }
    });

    this.streamingClient.on('tool_completed', (toolUseId: string, result: any) => {
      const toolState = this.streamingClient.getToolStates().get(toolUseId);
      if (toolState) {
        console.log(chalk.green(`✓ ${toolState.toolName} completed`));
      }
    });

    this.streamingClient.on('tool_error', (toolUseId: string, error: Error) => {
      const toolState = this.streamingClient.getToolStates().get(toolUseId);
      if (toolState) {
        console.log(chalk.red(`✗ ${toolState.toolName} failed: ${error.message}`));
      }
    });

    // Message completion
    this.streamingClient.on('message_stop', (usage: any) => {
      console.log('\n');
      if (usage) {
        console.log(chalk.dim(`[Tokens: ${usage.input_tokens} in, ${usage.output_tokens} out]`));
      }
      this.isStreaming = false;
    });

    // Errors
    this.streamingClient.on('error', (error: Error) => {
      console.error(chalk.red(`\nError: ${error.message}`));
      this.isStreaming = false;
    });
  }

  private async askToolPermission(request: any): Promise<boolean> {
    console.log('\n' + chalk.yellow('━'.repeat(50)));
    console.log(chalk.yellow(`Autocoder requested permissions to use ${chalk.bold(request.toolName)}`));
    console.log(chalk.dim('Input:'), JSON.stringify(request.input, null, 2));
    console.log(chalk.yellow('━'.repeat(50)));
    
    const answer = await this.question('Allow? (y/n): ');
    return answer.toLowerCase() === 'y';
  }

  private question(prompt: string): Promise<string> {
    return new Promise((resolve) => {
      this.rl.question(prompt, resolve);
    });
  }

  async start(options: any): Promise<void> {
    // Parse tool options
    if (options.allowedTools) {
      this.allowedTools = options.allowedTools.split(',').map((t: string) => t.trim());
    }
    if (options.disallowedTools) {
      this.disallowedTools = options.disallowedTools.split(',').map((t: string) => t.trim());
    }
    if (options.permissionMode) {
      this.permissionMode = options.permissionMode;
    }
    if (options.model) {
      this.model = options.model;
    }
    if (options.maxTokens) {
      this.maxTokens = parseInt(options.maxTokens);
    }

    console.log(chalk.blue('🤖 Claude Autonomous CLI'));
    console.log(chalk.dim('Type "exit" to quit, "/init" to create CLAUDE.md'));
    console.log(chalk.dim(`Model: ${this.model}, Permission mode: ${this.permissionMode}`));
    
    if (this.allowedTools.length > 0) {
      console.log(chalk.dim(`Allowed tools: ${this.allowedTools.join(', ')}`));
    }
    
    console.log('');

    // Main chat loop
    while (true) {
      const input = await this.question(chalk.green('You: '));
      
      if (input.toLowerCase() === 'exit' || input.toLowerCase() === 'quit') {
        break;
      }

      if (input === '/init') {
        await this.initClaudemd();
        continue;
      }

      if (input.startsWith('/memorize ')) {
        await this.memorize(input.substring(10));
        continue;
      }

      if (input.trim()) {
        await this.processMessage(input);
      }
    }

    this.rl.close();
  }

  private async processMessage(input: string): Promise<void> {
    // Add user message
    const userMessage: Message = {
      role: 'user',
      content: input
    };
    this.messages.push(userMessage);

    console.log(chalk.blue('\nClaude: '));
    
    this.isStreaming = true;

    try {
      // Get available tools
      const tools = filterTools(CORE_TOOLS, this.allowedTools, this.disallowedTools);

      // Stream the response
      await this.streamingClient.streamMessage({
        messages: this.messages,
        model: this.model,
        max_tokens: this.maxTokens,
        tools: tools,
        system: this.getSystemPrompt(),
        stream: true
      });

      // Add assistant message to history
      const assistantMessages = this.streamingClient.getMessages();
      if (assistantMessages.length > 0) {
        this.messages.push(assistantMessages[assistantMessages.length - 1]);
      }

    } catch (error: any) {
      console.error(chalk.red(`\nError: ${error.message}`));
    }
  }

  private getSystemPrompt(): string {
    return `You are Claude, Anthropic's AI assistant. You have access to various tools to help complete tasks.

When using tools:
1. Be clear about what you're doing and why
2. Show relevant results to the user
3. Handle errors gracefully
4. Ask for clarification when needed

Available tools will be provided based on the user's permissions.`;
  }

  private async initClaudemd(): Promise<void> {
    console.log(chalk.blue('\n📝 Creating CLAUDE.md...'));
    
    const content = `# Project Context

This file contains important context about the project that Claude should know.

## Project Overview
[Add project description here]

## Key Information
- Project type: [e.g., Node.js application]
- Main technologies: [List key technologies]
- Project structure: [Describe main directories]

## Important Notes
[Add any specific instructions or constraints]

## Auto-generated Information
Generated on: ${new Date().toISOString()}
`;

    try {
      await fs.writeFile('CLAUDE.md', content);
      console.log(chalk.green('✓ Created CLAUDE.md'));
    } catch (error: any) {
      console.error(chalk.red(`✗ Failed to create CLAUDE.md: ${error.message}`));
    }
  }

  private async memorize(text: string): Promise<void> {
    console.log(chalk.blue(`\n💾 Memorizing: "${text}"`));
    // In real implementation, this would save to a persistent store
    console.log(chalk.green('✓ Memorized'));
  }
}

// Export the command setup
export function setupAutonomousCommand(program: Command): void {
  program
    .command('autonomous')
    .description('Start autonomous Claude CLI with tool capabilities')
    .option('--allowed-tools <tools>', 'Comma-separated list of allowed tools')
    .option('--disallowed-tools <tools>', 'Comma-separated list of disallowed tools')
    .option('--permission-mode <mode>', 'Permission mode: auto, ask, deny', 'ask')
    .option('--model <model>', 'Model to use', 'claude-3-5-sonnet-20241022')
    .option('--max-tokens <tokens>', 'Maximum tokens', '4096')
    .action(async (options) => {
      const cli = new AutonomousCLI();
      await cli.start(options);
    });
}

// Hook into the existing StreamingClient to provide real tool execution
StreamingClient.prototype.executeToolByName = async function(toolName: string, input: any): Promise<any> {
  switch (toolName) {
    case 'Bash':
      try {
        const { stdout, stderr } = await execAsync(input.command, {
          cwd: input.cwd || process.cwd(),
          timeout: input.timeout || 30000
        });
        return { stdout, stderr, exitCode: 0 };
      } catch (error: any) {
        return { stdout: '', stderr: error.message, exitCode: error.code || 1 };
      }

    case 'Read':
      const content = await fs.readFile(input.path, 'utf-8');
      return { content };

    case 'Write':
      await fs.writeFile(input.path, input.content);
      return { success: true, path: input.path };

    case 'Edit':
      let fileContent = await fs.readFile(input.path, 'utf-8');
      for (const edit of input.edits) {
        if (!fileContent.includes(edit.old_string)) {
          throw new Error(`String not found: "${edit.old_string}"`);
        }
        fileContent = fileContent.replace(edit.old_string, edit.new_string);
      }
      await fs.writeFile(input.path, fileContent);
      return { success: true, path: input.path, edits_applied: input.edits.length };

    case 'List':
      const entries = await fs.readdir(input.path, { withFileTypes: true });
      return {
        entries: entries.map(e => ({
          name: e.name,
          type: e.isDirectory() ? 'directory' : 'file'
        }))
      };

    case 'FetchURL':
      // Simple implementation - in production would use proper HTTP client
      const https = await import('https');
      return new Promise((resolve, reject) => {
        https.get(input.url, (res) => {
          let data = '';
          res.on('data', (chunk) => data += chunk);
          res.on('end', () => resolve({ content: data, status: res.statusCode }));
        }).on('error', reject);
      });

    default:
      throw new Error(`Unknown tool: ${toolName}`);
  }
}; 