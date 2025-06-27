import readline from 'readline';
import chalk from 'chalk';
import { elizaLogger } from '@elizaos/core';
import type { AutocoderPMAgent } from './pm-agent.js';
import type { TelemetryService } from './services/telemetry-service.js';
import type { ErrorLogService } from './services/error-log-service.js';

export interface TerminalInterfaceOptions {
  pmAgent: AutocoderPMAgent;
  telemetryService: TelemetryService;
  errorLogService: ErrorLogService;
  debug?: boolean;
}

export interface ConversationMessage {
  role: 'user' | 'agent' | 'system';
  content: string;
  timestamp: Date;
  metadata?: Record<string, any>;
}

export class AutocoderTerminalInterface {
  private rl: readline.Interface | null = null;
  private pmAgent: AutocoderPMAgent;
  private telemetryService: TelemetryService;
  private errorLogService: ErrorLogService;
  private conversationHistory: ConversationMessage[] = [];
  private isProcessing = false;
  private debug: boolean;

  constructor(options: TerminalInterfaceOptions) {
    this.pmAgent = options.pmAgent;
    this.telemetryService = options.telemetryService;
    this.errorLogService = options.errorLogService;
    this.debug = options.debug || false;
  }

  async start(): Promise<void> {
    try {
      // Initialize readline interface
      this.rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout,
        prompt: chalk.cyan('📝 You: '),
        historySize: 100,
      });

      // Display welcome message
      this.displayWelcomeMessage();

      // Set up event handlers
      this.setupEventHandlers();

      // Start the conversation loop
      this.startConversationLoop();

      await this.telemetryService.logEvent('terminal_interface_started', {
        timestamp: new Date().toISOString(),
      });

    } catch (error) {
      await this.errorLogService.logError('Failed to start terminal interface', error);
      throw error;
    }
  }

  private displayWelcomeMessage(): void {
    const logo = `
╔══════════════════════════════════════════════════════════════════════════════╗
║                             🤖 ElizaOS Code                                  ║
║                        Advanced AI Autocoder Interface                       ║
╠══════════════════════════════════════════════════════════════════════════════╣
║                                                                              ║
║  I'm your Project Manager Agent. I can help you:                            ║
║                                                                              ║
║  🔍 Research and analyze codebases                                          ║
║  🌐 Search the web for technical information                                ║
║  📋 Create detailed project plans                                           ║
║  💻 Write code locally or coordinate with swarm agents                      ║
║  🐙 Manage GitHub repositories and collaboration                            ║
║  🧪 Run tests and validate implementations                                  ║
║                                                                              ║
║  Available commands:                                                         ║
║  • /help     - Show this help message                                       ║
║  • /status   - Show current project status                                  ║
║  • /swarm    - Toggle swarm mode (multi-agent collaboration)               ║
║  • /clear    - Clear conversation history                                   ║
║  • /debug    - Toggle debug mode                                            ║
║  • /logs     - Show recent error logs                                       ║
║  • /quit     - Exit the interface                                           ║
║                                                                              ║
║  Just tell me what you want to build, and I'll help you make it happen!     ║
║                                                                              ║
╚══════════════════════════════════════════════════════════════════════════════╝
`;

    console.log(chalk.cyan(logo));
    console.log(chalk.yellow('\n💡 Tip: Start by describing what you want to build or asking for help!\n'));
  }

  private setupEventHandlers(): void {
    if (!this.rl) return;

    this.rl.on('line', async (input: string) => {
      await this.handleUserInput(input.trim());
    });

    this.rl.on('close', () => {
      console.log(chalk.yellow('\n👋 Thanks for using ElizaOS Code! Goodbye!'));
      process.exit(0);
    });

    this.rl.on('SIGINT', () => {
      if (this.isProcessing) {
        console.log(chalk.yellow('\n⚠️  Processing... Press Ctrl+C again to force quit.'));
        return;
      }
      this.rl?.close();
    });
  }

  private startConversationLoop(): void {
    if (!this.rl) return;
    this.rl.prompt();
  }

  private async handleUserInput(input: string): Promise<void> {
    if (!input) {
      this.rl?.prompt();
      return;
    }

    try {
      this.isProcessing = true;

      // Log user message
      const userMessage: ConversationMessage = {
        role: 'user',
        content: input,
        timestamp: new Date(),
      };
      this.conversationHistory.push(userMessage);

      await this.telemetryService.logEvent('user_input', {
        input: input.length > 100 ? input.substring(0, 100) + '...' : input,
        timestamp: new Date().toISOString(),
      });

      // Handle commands
      if (input.startsWith('/')) {
        await this.handleCommand(input);
        this.isProcessing = false;
        this.rl?.prompt();
        return;
      }

      // Show thinking indicator
      console.log(chalk.gray('🤔 PM Agent is thinking...'));

      // Process with PM Agent
      const response = await this.pmAgent.processUserMessage(input, this.conversationHistory);

      // Log agent response
      const agentMessage: ConversationMessage = {
        role: 'agent',
        content: response.content,
        timestamp: new Date(),
        metadata: response.metadata,
      };
      this.conversationHistory.push(agentMessage);

      // Display response
      this.displayAgentResponse(response);

      await this.telemetryService.logEvent('agent_response', {
        responseLength: response.content.length,
        hasMetadata: !!response.metadata,
        timestamp: new Date().toISOString(),
      });

    } catch (error) {
      await this.errorLogService.logError('Error processing user input', error, { input });
      
      console.log(chalk.red('\n❌ Sorry, I encountered an error processing your request.'));
      console.log(chalk.red(`Error: ${error instanceof Error ? error.message : String(error)}`));
      
      if (this.debug && error instanceof Error) {
        console.log(chalk.gray(`\nDebug: ${error.stack}`));
      }
    } finally {
      this.isProcessing = false;
      this.rl?.prompt();
    }
  }

  private async handleCommand(command: string): Promise<void> {
    const cmd = command.toLowerCase();

    switch (cmd) {
      case '/help':
        this.displayWelcomeMessage();
        break;

      case '/status':
        await this.displayStatus();
        break;

      case '/swarm':
        await this.toggleSwarmMode();
        break;

      case '/clear':
        this.clearConversation();
        break;

      case '/debug':
        this.toggleDebugMode();
        break;

      case '/logs':
        await this.displayRecentLogs();
        break;

      case '/quit':
      case '/exit':
        console.log(chalk.yellow('\n👋 Goodbye!'));
        process.exit(0);
        break;

      default:
        console.log(chalk.red(`\n❌ Unknown command: ${command}`));
        console.log(chalk.gray('Type /help for available commands.'));
        break;
    }
  }

  private displayAgentResponse(response: { content: string; metadata?: Record<string, any> }): void {
    console.log('\n' + chalk.green('🤖 PM Agent:'));
    console.log(chalk.white(response.content));

    if (response.metadata?.swarmStatus) {
      console.log(chalk.blue('\n📊 Swarm Status:'));
      const status = response.metadata.swarmStatus;
      console.log(chalk.gray(`  Active Agents: ${status.activeAgents || 0}`));
      console.log(chalk.gray(`  Current Phase: ${status.currentPhase || 'Unknown'}`));
      console.log(chalk.gray(`  Progress: ${status.progress || 0}%`));
    }

    if (response.metadata?.gitUpdates && response.metadata.gitUpdates.length > 0) {
      console.log(chalk.blue('\n🐙 Git Updates:'));
      response.metadata.gitUpdates.forEach((update: any) => {
        console.log(chalk.gray(`  • ${update.message || update}`));
      });
    }

    if (response.metadata?.nextSteps && response.metadata.nextSteps.length > 0) {
      console.log(chalk.yellow('\n📋 Next Steps:'));
      response.metadata.nextSteps.forEach((step: string, index: number) => {
        console.log(chalk.gray(`  ${index + 1}. ${step}`));
      });
    }

    console.log(); // Add spacing
  }

  private async displayStatus(): Promise<void> {
    try {
      const status = await this.pmAgent.getStatus();
      
      console.log(chalk.blue('\n📊 Current Status:'));
      console.log(chalk.gray(`  Mode: ${status.mode}`));
      console.log(chalk.gray(`  Active Agents: ${status.activeAgents}`));
      console.log(chalk.gray(`  Current Project: ${status.currentProject || 'None'}`));
      console.log(chalk.gray(`  GitHub Connected: ${status.githubConnected ? 'Yes' : 'No'}`));
      console.log(chalk.gray(`  Conversation Messages: ${this.conversationHistory.length}`));
      
      if (status.recentActivity && status.recentActivity.length > 0) {
        console.log(chalk.blue('\n📝 Recent Activity:'));
        status.recentActivity.slice(-3).forEach((activity: any) => {
          console.log(chalk.gray(`  • ${activity.message} (${activity.timestamp})`));
        });
      }
      
    } catch (error) {
      await this.errorLogService.logError('Error getting status', error);
      console.log(chalk.red('\n❌ Error getting status'));
    }
  }

  private async toggleSwarmMode(): Promise<void> {
    try {
      const newMode = await this.pmAgent.toggleSwarmMode();
      console.log(chalk.green(`\n✅ Swarm mode ${newMode ? 'enabled' : 'disabled'}`));
      
      if (newMode) {
        console.log(chalk.gray('  Multi-agent collaboration is now active'));
        console.log(chalk.gray('  I can now spawn and coordinate up to 4 additional agents'));
      } else {
        console.log(chalk.gray('  Operating in single-agent mode'));
        console.log(chalk.gray('  All coding tasks will be handled directly by me'));
      }
      
    } catch (error) {
      await this.errorLogService.logError('Error toggling swarm mode', error);
      console.log(chalk.red('\n❌ Error toggling swarm mode'));
    }
  }

  private clearConversation(): void {
    this.conversationHistory = [];
    console.clear();
    console.log(chalk.green('\n✅ Conversation history cleared'));
    this.displayWelcomeMessage();
  }

  private toggleDebugMode(): void {
    this.debug = !this.debug;
    console.log(chalk.green(`\n✅ Debug mode ${this.debug ? 'enabled' : 'disabled'}`));
    
    if (this.debug) {
      console.log(chalk.gray('  Detailed error information will be shown'));
    } else {
      console.log(chalk.gray('  Error information will be simplified'));
    }
  }

  private async displayRecentLogs(): Promise<void> {
    try {
      const logs = await this.errorLogService.getRecentLogs(10);
      
      if (logs.length === 0) {
        console.log(chalk.green('\n✅ No recent errors logged'));
        return;
      }

      console.log(chalk.blue('\n📋 Recent Error Logs:'));
      logs.forEach((log, index) => {
        console.log(chalk.gray(`  ${index + 1}. [${log.timestamp}] ${log.message}`));
        if (this.debug && log.error) {
          console.log(chalk.gray(`     ${log.error}`));
        }
      });
      
    } catch (error) {
      console.log(chalk.red('\n❌ Error retrieving logs'));
    }
  }

  async stop(): Promise<void> {
    try {
      await this.telemetryService.logEvent('terminal_interface_stopped', {
        conversationLength: this.conversationHistory.length,
        timestamp: new Date().toISOString(),
      });

      if (this.rl) {
        this.rl.close();
        this.rl = null;
      }

      elizaLogger.info('Terminal interface stopped');
    } catch (error) {
      await this.errorLogService.logError('Error stopping terminal interface', error);
      throw error;
    }
  }
}