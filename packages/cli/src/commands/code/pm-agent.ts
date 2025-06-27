import { elizaLogger, type IAgentRuntime } from '@elizaos/core';
import type { ConversationMessage } from './terminal-interface.js';
import type { TelemetryService } from './services/telemetry-service.js';
import type { ErrorLogService } from './services/error-log-service.js';
import { SwarmOrchestrator } from './services/swarm-orchestrator.js';
import { GitHubCoordinator } from './services/github-coordinator.js';
import { SecretsManager } from './services/secrets-manager.js';

export interface PMAgentOptions {
  maxSwarmAgents: number;
  singleAgentMode: boolean;
  githubToken?: string;
  communicationPort: number;
  telemetryService: TelemetryService;
  errorLogService: ErrorLogService;
  debug?: boolean;
  agentRuntime?: IAgentRuntime;
}

export interface PMAgentResponse {
  content: string;
  metadata?: {
    swarmStatus?: SwarmStatus;
    gitUpdates?: string[];
    nextSteps?: string[];
    projectContext?: ProjectContext;
    secretsRequired?: string[];
  };
}

export interface SwarmStatus {
  activeAgents: number;
  currentPhase: string;
  progress: number;
  agentRoles: string[];
  lastUpdate: string;
}

export interface ProjectContext {
  name?: string;
  type?: string;
  repository?: string;
  branch?: string;
  status: 'planning' | 'in-progress' | 'review' | 'completed' | 'paused';
  description?: string;
}

export interface PMAgentStatus {
  mode: 'single' | 'swarm';
  activeAgents: number;
  currentProject?: string;
  githubConnected: boolean;
  recentActivity: Array<{
    message: string;
    timestamp: string;
  }>;
}

export class AutocoderPMAgent {
  private options: PMAgentOptions;
  private swarmOrchestrator: SwarmOrchestrator;
  private githubCoordinator: GitHubCoordinator;
  private secretsManager: SecretsManager;
  private telemetryService: TelemetryService;
  private errorLogService: ErrorLogService;
  private agentRuntime?: IAgentRuntime;
  
  private swarmMode = false;
  private currentProject: ProjectContext | null = null;
  private conversationContext: ConversationMessage[] = [];
  private recentActivity: Array<{ message: string; timestamp: string }> = [];
  
  constructor(options: PMAgentOptions) {
    this.options = options;
    this.telemetryService = options.telemetryService;
    this.errorLogService = options.errorLogService;
    this.agentRuntime = options.agentRuntime;
    this.swarmMode = !options.singleAgentMode;

    this.swarmOrchestrator = new SwarmOrchestrator({
      maxAgents: options.maxSwarmAgents,
      communicationPort: options.communicationPort,
      telemetryService: options.telemetryService,
      errorLogService: options.errorLogService,
      debug: options.debug,
    });

    this.githubCoordinator = new GitHubCoordinator({
      token: options.githubToken,
      telemetryService: options.telemetryService,
      errorLogService: options.errorLogService,
      debug: options.debug,
    });

    this.secretsManager = new SecretsManager({
      telemetryService: options.telemetryService,
      errorLogService: options.errorLogService,
      debug: options.debug,
    });
  }

  async initialize(): Promise<void> {
    try {
      elizaLogger.info('Initializing PM Agent...');

      // Initialize all components
      await Promise.all([
        this.swarmOrchestrator.initialize(),
        this.githubCoordinator.initialize(),
        this.secretsManager.initialize(),
      ]);

      // Log initialization
      await this.addActivity('PM Agent initialized successfully');
      await this.telemetryService.logEvent('pm_agent_initialized', {
        swarmMode: this.swarmMode,
        maxAgents: this.options.maxSwarmAgents,
        githubConnected: await this.githubCoordinator.isConnected(),
        timestamp: new Date().toISOString(),
      });

      elizaLogger.info('✅ PM Agent initialized successfully');
    } catch (error) {
      await this.errorLogService.logError('Failed to initialize PM Agent', error);
      throw error;
    }
  }

  async processUserMessage(
    input: string,
    conversationHistory: ConversationMessage[]
  ): Promise<PMAgentResponse> {
    try {
      // Update conversation context
      this.conversationContext = conversationHistory;

      // Log the interaction
      await this.telemetryService.logEvent('user_message_processing', {
        messageLength: input.length,
        conversationLength: conversationHistory.length,
        swarmMode: this.swarmMode,
        timestamp: new Date().toISOString(),
      });

      // Analyze the user's intent
      const intent = await this.analyzeUserIntent(input);
      
      // Check if secrets are required
      const secretsRequired = await this.secretsManager.checkRequiredSecrets(input, intent);
      if (secretsRequired.length > 0) {
        return await this.handleSecretsRequest(secretsRequired);
      }

      // Process based on intent
      let response: PMAgentResponse;

      switch (intent.type) {
        case 'research':
          response = await this.handleResearchRequest(input, intent);
          break;
        case 'planning':
          response = await this.handlePlanningRequest(input, intent);
          break;
        case 'coding':
          response = await this.handleCodingRequest(input, intent);
          break;
        case 'github':
          response = await this.handleGitHubRequest(input, intent);
          break;
        case 'status':
          response = await this.handleStatusRequest(input, intent);
          break;
        case 'help':
          response = await this.handleHelpRequest(input, intent);
          break;
        default:
          response = await this.handleGeneralRequest(input, intent);
          break;
      }

      // Log successful processing
      await this.addActivity(`Processed ${intent.type} request`);
      await this.telemetryService.logEvent('message_processed', {
        intent: intent.type,
        responseLength: response.content.length,
        timestamp: new Date().toISOString(),
      });

      return response;

    } catch (error) {
      await this.errorLogService.logError('Error processing user message', error, { input });
      
      return {
        content: `I apologize, but I encountered an error processing your request. ${
          this.options.debug ? `Error: ${error instanceof Error ? error.message : String(error)}` : 'Please try rephrasing your request.'
        }`,
      };
    }
  }

  private async analyzeUserIntent(input: string): Promise<{
    type: 'research' | 'planning' | 'coding' | 'github' | 'status' | 'help' | 'general';
    confidence: number;
    keywords: string[];
    suggestedAction?: string;
  }> {
    // Simple intent analysis - in production this would use the LLM
    const researchKeywords = ['research', 'analyze', 'investigate', 'search', 'find', 'explore'];
    const planningKeywords = ['plan', 'design', 'architecture', 'roadmap', 'strategy', 'approach'];
    const codingKeywords = ['code', 'implement', 'build', 'create', 'develop', 'write', 'fix'];
    const githubKeywords = ['github', 'git', 'repository', 'repo', 'commit', 'branch', 'pr', 'pull request'];
    const statusKeywords = ['status', 'progress', 'current', 'what', 'how'];
    const helpKeywords = ['help', 'how', 'what can you', 'commands', 'guide'];

    const lowerInput = input.toLowerCase();
    
    if (researchKeywords.some(k => lowerInput.includes(k))) {
      return { type: 'research', confidence: 0.8, keywords: researchKeywords.filter(k => lowerInput.includes(k)) };
    }
    if (planningKeywords.some(k => lowerInput.includes(k))) {
      return { type: 'planning', confidence: 0.8, keywords: planningKeywords.filter(k => lowerInput.includes(k)) };
    }
    if (codingKeywords.some(k => lowerInput.includes(k))) {
      return { type: 'coding', confidence: 0.8, keywords: codingKeywords.filter(k => lowerInput.includes(k)) };
    }
    if (githubKeywords.some(k => lowerInput.includes(k))) {
      return { type: 'github', confidence: 0.8, keywords: githubKeywords.filter(k => lowerInput.includes(k)) };
    }
    if (statusKeywords.some(k => lowerInput.includes(k))) {
      return { type: 'status', confidence: 0.7, keywords: statusKeywords.filter(k => lowerInput.includes(k)) };
    }
    if (helpKeywords.some(k => lowerInput.includes(k))) {
      return { type: 'help', confidence: 0.9, keywords: helpKeywords.filter(k => lowerInput.includes(k)) };
    }

    return { type: 'general', confidence: 0.5, keywords: [] };
  }

  private async handleResearchRequest(input: string, intent: any): Promise<PMAgentResponse> {
    await this.addActivity('Conducting research');

    // TODO: Implement web search and research capabilities
    return {
      content: `I'll help you research this topic. Let me analyze what you're looking for and gather relevant information.

Based on your request: "${input}"

🔍 Research Plan:
1. Identify key topics and technologies
2. Search for current best practices and documentation
3. Analyze relevant code examples and patterns
4. Compile findings into a comprehensive report

${this.swarmMode ? '👥 I can also spawn specialized research agents to investigate different aspects simultaneously.' : ''}

What specific aspects would you like me to focus on during my research?`,
      metadata: {
        nextSteps: [
          'Define specific research areas',
          'Conduct web searches',
          'Analyze documentation',
          'Compile research report',
        ],
      },
    };
  }

  private async handlePlanningRequest(input: string, intent: any): Promise<PMAgentResponse> {
    await this.addActivity('Creating project plan');

    return {
      content: `I'll help you create a comprehensive plan for your project.

Based on your request: "${input}"

📋 Planning Approach:
1. **Requirements Analysis** - Break down what you want to build
2. **Technology Stack** - Choose appropriate tools and frameworks
3. **Architecture Design** - Plan the system structure
4. **Implementation Phases** - Create step-by-step roadmap
5. **Testing Strategy** - Ensure quality and reliability
6. **Deployment Plan** - Get your project live

${this.swarmMode ? `
👥 **Swarm Mode Available**: I can coordinate multiple specialist agents:
- Architecture Agent: System design and technical decisions
- Research Agent: Technology evaluation and best practices
- Implementation Agent: Code structure and development approach
- QA Agent: Testing strategy and quality assurance
` : ''}

Would you like me to start with a detailed requirements analysis, or do you have specific aspects of the plan you'd like to focus on first?`,
      metadata: {
        nextSteps: [
          'Gather detailed requirements',
          'Select technology stack',
          'Design system architecture',
          'Create implementation timeline',
        ],
      },
    };
  }

  private async handleCodingRequest(input: string, intent: any): Promise<PMAgentResponse> {
    await this.addActivity('Processing coding request with AutoCoder agent');

    if (!this.agentRuntime) {
      return {
        content: `❌ AutoCoder agent runtime not available. Please ensure the ElizaOS AutoCoder plugin is properly loaded.`,
      };
    }

    try {
      // Create a memory for the coding request
      const { asUUID } = await import('@elizaos/core');
      const roomId = asUUID('coding-session-' + Date.now());
      const entityId = asUUID('user-entity');

      const message = {
        id: asUUID('message-' + Date.now()),
        entityId: entityId,
        agentId: this.agentRuntime.agentId,
        roomId: roomId,
        content: {
          text: input,
          source: 'eliza-code-terminal',
        },
        createdAt: Date.now(),
      };

      // Process the message with the AutoCoder agent
      elizaLogger.info('Processing coding request with AutoCoder agent...');
      
      // Create the state for this request
      const state = await this.agentRuntime.composeState(message);
      
      // Process actions to get the agent's response
      let agentResponse = '';
      const responses: any[] = [];
      
      await this.agentRuntime.processActions(
        message,
        responses,
        state,
        async (content, files) => {
          agentResponse += content.text || '';
          
          // Store the response as a memory
          const responseMemory = {
            id: asUUID('response-' + Date.now()),
            entityId: this.agentRuntime!.agentId,
            agentId: this.agentRuntime!.agentId,
            roomId: roomId,
            content: content,
            createdAt: Date.now(),
          };
          
          responses.push(responseMemory);
          return responses;
        }
      );

      // If we don't have a response, use the agent to generate one
      if (!agentResponse && this.agentRuntime.useModel) {
        elizaLogger.info('No actions triggered, using direct model generation...');
        
        const prompt = `You are AutoCoder, an expert software developer. The user has made this coding request:

"${input}"

Please provide a comprehensive response that includes:
1. Analysis of the request
2. Implementation approach
3. Code examples if applicable
4. Next steps

Be technical, practical, and provide actionable guidance.`;

        agentResponse = await this.agentRuntime.useModel('TEXT_LARGE', {
          prompt,
          temperature: 0.4,
          max_tokens: 2000,
        });
      }

      // Format the response
      const finalResponse = agentResponse || `I understand you want help with: "${input}"

I'm ready to assist with your coding needs. I can help with:

🔧 **Implementation Tasks**:
- Writing production-ready code
- Creating comprehensive tests  
- Setting up project structure
- Code review and optimization

📋 **Planning & Architecture**:
- System design and architecture
- Technology stack selection
- Project roadmap creation
- Best practices guidance

🐙 **GitHub Integration**:
- Repository management
- Branch and PR workflows
- Collaborative development

Please provide more specific details about what you'd like me to build, and I'll create a detailed implementation plan.`;

      await this.addActivity('Completed coding request processing');

      return {
        content: finalResponse,
        metadata: {
          agentProcessed: true,
          responseGenerated: !!agentResponse,
          actionsTriggered: responses.length > 0,
          nextSteps: [
            'Provide more specific requirements',
            'Begin implementation',
            'Set up development environment',
          ],
        },
      };

    } catch (error) {
      elizaLogger.error('Error processing coding request:', error);
      await this.errorLogService.logError('Error in handleCodingRequest', error, { input });
      
      return {
        content: `I encountered an error processing your coding request. ${
          this.options.debug ? `Error: ${error instanceof Error ? error.message : String(error)}` : 'Please try rephrasing your request.'
        }

I'm still here to help with your coding needs. You can:
- Try rephrasing your request
- Provide more specific details
- Ask for help with a different aspect

What would you like to work on?`,
      };
    }
  }

  private async handleGitHubRequest(input: string, intent: any): Promise<PMAgentResponse> {
    await this.addActivity('Processing GitHub request');

    const isConnected = await this.githubCoordinator.isConnected();
    
    if (!isConnected) {
      return {
        content: `🐙 **GitHub Integration Setup Required**

To use GitHub features, I need access to your GitHub account.

🔑 **Setup Options**:
1. **Environment Variable**: Set GITHUB_TOKEN in your environment
2. **Command Line**: Use --github-token flag when starting
3. **Interactive Setup**: I can guide you through getting a personal access token

📋 **Required Permissions**:
- Repository access (read/write)
- Pull request management
- Branch management
- Commit access

Would you like me to guide you through setting up GitHub access?`,
        metadata: {
          secretsRequired: ['GITHUB_TOKEN'],
          nextSteps: [
            'Set up GitHub token',
            'Verify repository access',
            'Configure collaboration settings',
          ],
        },
      };
    }

    return {
      content: `🐙 **GitHub Integration Active**

I can help you with GitHub operations:

📊 **Available Actions**:
- Create and manage repositories
- Handle branches and pull requests
- Coordinate multi-agent collaboration
- Manage code reviews and merges
- Set up automated workflows

${this.swarmMode ? `
👥 **Swarm Coordination Features**:
- Each agent gets dedicated branches
- Automated PR creation and review
- Coordinated merge strategies
- Conflict resolution management
` : ''}

Based on your request: "${input}"

What specific GitHub operation would you like me to help with?`,
      metadata: {
        gitUpdates: ['GitHub integration ready'],
        nextSteps: [
          'Specify repository or operation',
          'Configure collaboration workflow',
          'Begin GitHub coordination',
        ],
      },
    };
  }

  private async handleStatusRequest(input: string, intent: any): Promise<PMAgentResponse> {
    const status = await this.getStatus();
    
    return {
      content: `📊 **Current Status Report**

🤖 **Agent Configuration**:
- Mode: ${status.mode === 'swarm' ? 'Multi-agent swarm' : 'Single agent'}
- Max Agents: ${this.options.maxSwarmAgents}
- Active Agents: ${status.activeAgents}

🐙 **GitHub Integration**: ${status.githubConnected ? '✅ Connected' : '❌ Not connected'}

📋 **Current Project**: ${status.currentProject || 'None active'}

💬 **Conversation**: ${this.conversationContext.length} messages in history

📈 **Recent Activity**:
${status.recentActivity.slice(-5).map(a => `• ${a.message} (${a.timestamp})`).join('\n')}

${this.currentProject ? `
🎯 **Active Project Details**:
- Name: ${this.currentProject.name || 'Unnamed'}
- Type: ${this.currentProject.type || 'General'}
- Status: ${this.currentProject.status}
- Repository: ${this.currentProject.repository || 'Not set'}
` : ''}

How can I help you move forward?`,
      metadata: {
        swarmStatus: this.swarmMode ? {
          activeAgents: status.activeAgents,
          currentPhase: this.currentProject?.status || 'idle',
          progress: 0,
          agentRoles: [],
          lastUpdate: new Date().toISOString(),
        } : undefined,
      },
    };
  }

  private async handleHelpRequest(input: string, intent: any): Promise<PMAgentResponse> {
    return {
      content: `🤖 **ElizaOS Code - PM Agent Help**

I'm your Project Manager Agent, designed to help you build software projects either independently or by coordinating teams of specialized agents.

🔥 **Core Capabilities**:

📚 **Research & Analysis**
- Web search for technical information
- Codebase analysis and documentation review
- Technology stack evaluation
- Best practices research

📋 **Project Planning**
- Requirements analysis and breakdown
- Architecture design and planning
- Implementation roadmap creation
- Resource allocation and timeline planning

💻 **Code Implementation**
- ${this.swarmMode ? 'Multi-agent collaborative coding' : 'Direct code implementation'}
- File creation and editing
- Test generation and validation
- Documentation creation

🐙 **GitHub Coordination**
- Repository management
- Branch and PR coordination
- ${this.swarmMode ? 'Multi-agent Git workflows' : 'Individual Git operations'}
- Code review and merge management

🔍 **Quality Assurance**
- Code review and analysis
- Test strategy development
- Performance optimization
- Security best practices

${this.swarmMode ? `
👥 **Swarm Mode Features**:
- Coordinate 1-4 specialized agents
- Role-based task distribution
- Parallel development streams
- Automated integration and testing
- Conflict resolution and coordination
` : `
🎯 **Single Agent Mode**:
- Direct, focused interaction
- Immediate code implementation
- Streamlined workflow
- Personal assistance approach
`}

💡 **Getting Started**:
1. Tell me what you want to build
2. I'll create a plan and coordinate the work
3. All progress is tracked and visible
4. I handle all the coordination complexity

What would you like to build today?`,
      metadata: {
        nextSteps: [
          'Describe your project idea',
          'Let me create a comprehensive plan',
          'Watch as I coordinate the implementation',
        ],
      },
    };
  }

  private async handleGeneralRequest(input: string, intent: any): Promise<PMAgentResponse> {
    return {
      content: `I understand you'd like help with: "${input}"

Let me break this down and determine the best approach:

🤔 **Analysis**:
Based on your message, this seems like a ${intent.confidence > 0.7 ? 'clear' : 'general'} request that I can help with.

🎯 **Recommended Approach**:
1. **Clarify Requirements**: Let's define exactly what you need
2. **Choose Strategy**: Decide between research, planning, or implementation
3. **Execute Plan**: ${this.swarmMode ? 'Coordinate agents or work directly' : 'Work through the solution step by step'}

${this.swarmMode ? `
👥 **Swarm Coordination Available**: If this is a complex project, I can spawn specialized agents to handle different aspects simultaneously.
` : ''}

To give you the best help, could you tell me:
- What's the main goal or problem you're trying to solve?
- Do you have any specific requirements or constraints?
- Are you looking for research, planning, or immediate implementation?

I'm here to help make your project successful!`,
      metadata: {
        nextSteps: [
          'Clarify specific requirements',
          'Define project scope',
          'Choose implementation approach',
        ],
      },
    };
  }

  private async handleSecretsRequest(secretsRequired: string[]): Promise<PMAgentResponse> {
    const secretsInfo = await this.secretsManager.getSecretsInfo(secretsRequired);
    
    return {
      content: `🔑 **Required Secrets Setup**

To proceed with your request, I need access to the following credentials:

${secretsRequired.map(secret => `
📋 **${secret}**:
${secretsInfo[secret] ? `
- Description: ${secretsInfo[secret].description}
- How to get: ${secretsInfo[secret].howToGet}
- Required for: ${secretsInfo[secret].requiredFor.join(', ')}
` : '- Setup required for this feature'}
`).join('\n')}

🛠️ **Setup Options**:
1. **Environment Variables**: Add to your .env file
2. **Command Line**: Pass as startup flags
3. **Interactive Setup**: I can guide you through the process

Once these are configured, I'll be able to help you with the full range of capabilities including GitHub integration, deployment, and advanced automation features.

Would you like me to guide you through setting up any of these credentials?`,
      metadata: {
        secretsRequired,
        nextSteps: [
          'Set up required credentials',
          'Verify access permissions',
          'Resume with full capabilities',
        ],
      },
    };
  }

  async getStatus(): Promise<PMAgentStatus> {
    const swarmStatus = await this.swarmOrchestrator.getStatus();
    const githubConnected = await this.githubCoordinator.isConnected();

    return {
      mode: this.swarmMode ? 'swarm' : 'single',
      activeAgents: swarmStatus.activeAgents,
      currentProject: this.currentProject?.name,
      githubConnected,
      recentActivity: this.recentActivity,
    };
  }

  async toggleSwarmMode(): Promise<boolean> {
    this.swarmMode = !this.swarmMode;
    
    await this.addActivity(`Switched to ${this.swarmMode ? 'swarm' : 'single'} mode`);
    await this.telemetryService.logEvent('swarm_mode_toggled', {
      newMode: this.swarmMode ? 'swarm' : 'single',
      timestamp: new Date().toISOString(),
    });

    if (!this.swarmMode) {
      // Terminate all active agents when switching to single mode
      await this.swarmOrchestrator.terminateAllAgents();
    }

    return this.swarmMode;
  }

  private async addActivity(message: string): Promise<void> {
    const activity = {
      message,
      timestamp: new Date().toLocaleString(),
    };
    
    this.recentActivity.push(activity);
    
    // Keep only last 20 activities
    if (this.recentActivity.length > 20) {
      this.recentActivity = this.recentActivity.slice(-20);
    }
  }

  async shutdown(): Promise<void> {
    try {
      elizaLogger.info('Shutting down PM Agent...');

      await Promise.all([
        this.swarmOrchestrator.shutdown(),
        this.githubCoordinator.shutdown(),
        this.secretsManager.shutdown(),
      ]);

      await this.addActivity('PM Agent shutdown completed');
      await this.telemetryService.logEvent('pm_agent_shutdown', {
        timestamp: new Date().toISOString(),
      });

      elizaLogger.info('✅ PM Agent shutdown completed');
    } catch (error) {
      await this.errorLogService.logError('Error during PM Agent shutdown', error);
      throw error;
    }
  }
}