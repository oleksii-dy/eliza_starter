import {
  type Plugin,
  type IAgentRuntime,
  type Action,
  type Provider,
  type Memory,
  type State,
  type HandlerCallback,
} from '@elizaos/core';

import { GameOrchestratorService } from './services/gameOrchestratorService';
import { AgentFactoryService } from './services/agentFactoryService';
import { ExecutionService } from './services/executionService';

// Actions
const enableAutoModeAction: Action = {
  name: 'ENABLE_AUTO_MODE',
  similes: ['START_AUTO_MODE', 'BEGIN_AUTONOMOUS', 'ACTIVATE_AUTO'],
  description: 'Enable autonomous coding mode where agents work continuously',
  
  validate: async (runtime: IAgentRuntime, message: Memory) => {
    const orchestrator = runtime.getService<GameOrchestratorService>('gameOrchestrator');
    return !!orchestrator;
  },

  handler: async (
    runtime: IAgentRuntime,
    message: Memory,
    state: State,
    options: any,
    callback: HandlerCallback
  ) => {
    try {
      const orchestrator = runtime.getService<GameOrchestratorService>('gameOrchestrator');
      if (!orchestrator) {
        throw new Error('Game orchestrator service not available');
      }

      await orchestrator.enableAutoMode();

      await callback({
        text: '🤖 Autonomous mode activated! Agents will now work continuously on coding projects.',
        thought: 'Successfully enabled autonomous mode for the coding game',
        metadata: { gameMode: 'auto' }
      });

      return { success: true, mode: 'auto' };
    } catch (error) {
      runtime.logger.error('Failed to enable auto mode:', error);
      await callback({
        text: '❌ Failed to enable autonomous mode. Please check the logs.',
        thought: 'Error occurred while enabling auto mode'
      });
      return { success: false, error: error.message };
    }
  },

  examples: [
    [
      {
        name: 'User',
        content: { text: 'Enable autonomous mode' }
      },
      {
        name: 'Agent',
        content: { 
          text: '🤖 Autonomous mode activated! Agents will now work continuously on coding projects.',
          thought: 'Successfully enabled autonomous mode for the coding game'
        }
      }
    ]
  ]
};

const disableAutoModeAction: Action = {
  name: 'DISABLE_AUTO_MODE',
  similes: ['STOP_AUTO_MODE', 'END_AUTONOMOUS', 'DEACTIVATE_AUTO'],
  description: 'Disable autonomous mode and return to manual control',
  
  validate: async (runtime: IAgentRuntime, message: Memory) => {
    const orchestrator = runtime.getService<GameOrchestratorService>('gameOrchestrator');
    return !!orchestrator;
  },

  handler: async (
    runtime: IAgentRuntime,
    message: Memory,
    state: State,
    options: any,
    callback: HandlerCallback
  ) => {
    try {
      const orchestrator = runtime.getService<GameOrchestratorService>('gameOrchestrator');
      if (!orchestrator) {
        throw new Error('Game orchestrator service not available');
      }

      await orchestrator.disableAutoMode();

      await callback({
        text: '✋ Manual mode activated. Agents will await your instructions.',
        thought: 'Successfully disabled autonomous mode',
        metadata: { gameMode: 'manual' }
      });

      return { success: true, mode: 'manual' };
    } catch (error) {
      runtime.logger.error('Failed to disable auto mode:', error);
      await callback({
        text: '❌ Failed to disable autonomous mode. Please check the logs.',
        thought: 'Error occurred while disabling auto mode'
      });
      return { success: false, error: error.message };
    }
  },

  examples: [
    [
      {
        name: 'User',
        content: { text: 'Disable autonomous mode' }
      },
      {
        name: 'Agent',
        content: { 
          text: '✋ Manual mode activated. Agents will await your instructions.',
          thought: 'Successfully disabled autonomous mode'
        }
      }
    ]
  ]
};

const createProjectAction: Action = {
  name: 'CREATE_PROJECT',
  similes: ['NEW_PROJECT', 'START_PROJECT', 'BEGIN_PROJECT'],
  description: 'Create a new coding project with specified requirements',
  
  validate: async (runtime: IAgentRuntime, message: Memory) => {
    const orchestrator = runtime.getService<GameOrchestratorService>('gameOrchestrator');
    return !!orchestrator;
  },

  handler: async (
    runtime: IAgentRuntime,
    message: Memory,
    state: State,
    options: any,
    callback: HandlerCallback
  ) => {
    try {
      const orchestrator = runtime.getService<GameOrchestratorService>('gameOrchestrator');
      if (!orchestrator) {
        throw new Error('Game orchestrator service not available');
      }

      // Extract project details from message or options
      const projectName = options?.projectName || extractProjectName(message.content.text);
      const description = options?.description || extractDescription(message.content.text);
      const requirements = options?.requirements || extractRequirements(message.content.text);

      const project = await orchestrator.createProject({
        name: projectName,
        description,
        requirements
      });

      // Spawn a coder agent for the project
      const agent = await orchestrator.spawnCoderAgent(project);

      await callback({
        text: `🚀 Created project "${project.name}" and assigned to ${agent.name}. The agent will begin working on: ${description}`,
        thought: `Successfully created project ${project.name} with coder agent ${agent.name}`,
        metadata: { 
          projectId: project.id,
          agentId: agent.id,
          projectName: project.name
        }
      });

      return { 
        success: true, 
        project: project,
        agent: agent
      };
    } catch (error) {
      runtime.logger.error('Failed to create project:', error);
      await callback({
        text: '❌ Failed to create project. Please provide a clear project name and description.',
        thought: 'Error occurred while creating project'
      });
      return { success: false, error: error.message };
    }
  },

  examples: [
    [
      {
        name: 'User',
        content: { text: 'Create a todo list plugin with add, remove, and mark complete functionality' }
      },
      {
        name: 'Agent',
        content: { 
          text: '🚀 Created project "Todo List Plugin" and assigned to Coder-TodoList. The agent will begin working on: A todo list plugin with add, remove, and mark complete functionality',
          thought: 'Successfully created project Todo List Plugin with coder agent'
        }
      }
    ]
  ]
};

const pauseGameAction: Action = {
  name: 'PAUSE_GAME',
  similes: ['STOP_GAME', 'EMERGENCY_STOP', 'HALT_ALL'],
  description: 'Pause all game activities and stop all agents',
  
  validate: async (runtime: IAgentRuntime, message: Memory) => {
    const orchestrator = runtime.getService<GameOrchestratorService>('gameOrchestrator');
    return !!orchestrator;
  },

  handler: async (
    runtime: IAgentRuntime,
    message: Memory,
    state: State,
    options: any,
    callback: HandlerCallback
  ) => {
    try {
      const orchestrator = runtime.getService<GameOrchestratorService>('gameOrchestrator');
      if (!orchestrator) {
        throw new Error('Game orchestrator service not available');
      }

      await orchestrator.pauseGame();

      await callback({
        text: '⏸️ Game paused. All agents have been stopped.',
        thought: 'Successfully paused the coding game',
        metadata: { gameMode: 'paused' }
      });

      return { success: true, mode: 'paused' };
    } catch (error) {
      runtime.logger.error('Failed to pause game:', error);
      await callback({
        text: '❌ Failed to pause game. Please check the logs.',
        thought: 'Error occurred while pausing game'
      });
      return { success: false, error: error.message };
    }
  },

  examples: [
    [
      {
        name: 'User',
        content: { text: 'Emergency stop' }
      },
      {
        name: 'Agent',
        content: { 
          text: '⏸️ Game paused. All agents have been stopped.',
          thought: 'Successfully paused the coding game'
        }
      }
    ]
  ]
};

// Providers
const gameStateProvider: Provider = {
  name: 'GAME_STATE',
  description: 'Provides current game state information',
  
  get: async (runtime: IAgentRuntime, message: Memory, state: State) => {
    try {
      const orchestrator = runtime.getService<GameOrchestratorService>('gameOrchestrator');
      if (!orchestrator) {
        return { text: '', values: {} };
      }

      const gameState = await orchestrator.getGameState();
      const activeProjects = await orchestrator.getActiveProjects();
      const agents = await orchestrator.getCoderAgents();

      const stateText = `
[GAME STATE]
Mode: ${gameState.mode}
Active Projects: ${activeProjects.length}
Active Agents: ${agents.length}
Execution Environment: ${gameState.executionEnvironment}
Last Activity: ${new Date(gameState.lastActivity).toLocaleString()}
[/GAME STATE]`;

      return {
        text: stateText,
        values: {
          gameMode: gameState.mode,
          activeProjects: activeProjects.length,
          activeAgents: agents.length,
          executionEnvironment: gameState.executionEnvironment,
          isInitialized: gameState.isInitialized
        },
        data: {
          gameState,
          projects: activeProjects,
          agents
        }
      };
    } catch (error) {
      runtime.logger.error('Failed to get game state:', error);
      return { 
        text: '[GAME STATE] Service unavailable [/GAME STATE]',
        values: { gameAvailable: false }
      };
    }
  }
};

const activeProjectsProvider: Provider = {
  name: 'ACTIVE_PROJECTS',
  description: 'Provides information about currently active coding projects',
  
  get: async (runtime: IAgentRuntime, message: Memory, state: State) => {
    try {
      const orchestrator = runtime.getService<GameOrchestratorService>('gameOrchestrator');
      if (!orchestrator) {
        return { text: '', values: {} };
      }

      const projects = await orchestrator.getActiveProjects();
      
      if (projects.length === 0) {
        return {
          text: '[ACTIVE PROJECTS] No active projects [/ACTIVE PROJECTS]',
          values: { activeProjectCount: 0 }
        };
      }

      const projectsText = projects.map(p => 
        `- ${p.name} (${p.status}) - ${p.progress}% complete`
      ).join('\n');

      return {
        text: `[ACTIVE PROJECTS]\n${projectsText}\n[/ACTIVE PROJECTS]`,
        values: {
          activeProjectCount: projects.length,
          projectStatuses: projects.map(p => ({ id: p.id, status: p.status, progress: p.progress }))
        },
        data: { projects }
      };
    } catch (error) {
      runtime.logger.error('Failed to get active projects:', error);
      return { 
        text: '[ACTIVE PROJECTS] Service unavailable [/ACTIVE PROJECTS]',
        values: { activeProjectCount: 0 }
      };
    }
  }
};

// Helper functions
function extractProjectName(text: string): string {
  const patterns = [
    /create (?:a |an )?(.+?) (?:plugin|project|app)/i,
    /build (?:a |an )?(.+?) (?:plugin|project|app)/i,
    /make (?:a |an )?(.+?) (?:plugin|project|app)/i,
    /project (?:called |named )?(.+?)(?:\s|$)/i
  ];
  
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) {
      return match[1].trim();
    }
  }
  
  // Default fallback
  return `Project ${Date.now()}`;
}

function extractDescription(text: string): string {
  const cleanText = text.replace(/create|build|make|project/gi, '').trim();
  return cleanText || 'Auto-generated project description';
}

function extractRequirements(text: string): string[] {
  const keywords = ['with', 'that', 'including', 'featuring'];
  const requirements: string[] = [];
  
  for (const keyword of keywords) {
    const index = text.toLowerCase().indexOf(keyword);
    if (index !== -1) {
      const afterKeyword = text.substring(index + keyword.length).trim();
      const parts = afterKeyword.split(/\s+and\s+|\s*,\s*|\s*\+\s*/);
      requirements.push(...parts.filter(p => p.length > 2));
      break;
    }
  }
  
  return requirements.length > 0 ? requirements : ['Basic functionality', 'User interface', 'Error handling'];
}

export const autonomousCodingGamePlugin: Plugin = {
  name: '@elizaos/plugin-autonomous-coding-game',
  description: 'Enables autonomous coding game mode where AI agents collaborate to build software projects',
  
  actions: [
    enableAutoModeAction,
    disableAutoModeAction,
    createProjectAction,
    pauseGameAction
  ],

  providers: [
    gameStateProvider,
    activeProjectsProvider
  ],

  services: [
    GameOrchestratorService,
    AgentFactoryService,
    ExecutionService
  ],

  init: async (config: Record<string, string>, runtime: IAgentRuntime) => {
    runtime.logger.info('[AutonomousCodingGame] Plugin initializing...');
    
    // Verify required services are available
    const requiredServices = ['gameOrchestrator', 'agentFactory', 'execution'];
    for (const serviceName of requiredServices) {
      const service = runtime.getService(serviceName);
      if (!service) {
        runtime.logger.warn(`[AutonomousCodingGame] Service ${serviceName} not available`);
      }
    }

    runtime.logger.info('[AutonomousCodingGame] Plugin initialized successfully');
  }
};

export default autonomousCodingGamePlugin;