import {
  Service,
  type IAgentRuntime,
  type UUID,
  type Memory,
  type Character,
  ChannelType
} from '@elizaos/core';
import type { GameState, Project, GameMode, ExecutionEnvironment } from '../types/gameTypes';
import { AgentFactoryService } from './agentFactoryService';
import { ExecutionService } from './executionService';

export class GameOrchestratorService extends Service {
  static serviceName = 'gameOrchestrator';
  static serviceType = 'GAME_ORCHESTRATION';
  
  capabilityDescription = 'Orchestrates the autonomous coding game, manages agents and projects using real ElizaOS runtime';
  
  private gameState: GameState;
  private isRunning: boolean = false;
  private autonomyInterval?: NodeJS.Timeout;
  private mainWorldId?: UUID;
  private orchestratorRoomId?: UUID;

  constructor(runtime?: IAgentRuntime) {
    super(runtime);
    
    this.gameState = {
      mode: 'manual',
      coderAgents: [],
      activeProjects: [],
      executionEnvironment: 'local-sandbox',
      communicationRooms: [],
      completedTasks: [],
      activeGoals: [],
      isInitialized: false,
      lastActivity: Date.now()
    };
  }

  static async start(runtime: IAgentRuntime): Promise<GameOrchestratorService> {
    const service = new GameOrchestratorService(runtime);
    await service.initialize();
    return service;
  }

  private async initialize(): Promise<void> {
    try {
      // Create main game world
      await this.createGameWorld();
      
      // Create orchestrator communication room
      await this.createOrchestratorRoom();

      this.gameState.isInitialized = true;
      this.isRunning = true;

      this.runtime.logger.info('[GameOrchestratorService] Service initialized with real ElizaOS integration');
    } catch (error) {
      this.runtime.logger.error('[GameOrchestratorService] Initialization failed:', error);
      throw error;
    }
  }

  private async createGameWorld(): Promise<void> {
    try {
      // Check if game world already exists
      const existingWorlds = await this.runtime.getAllWorlds();
      let gameWorld = existingWorlds.find(w => w.name === 'Autonomous Coding Game');
      
      if (!gameWorld) {
        this.mainWorldId = await this.runtime.createWorld({
          name: 'Autonomous Coding Game',
          agentId: this.runtime.agentId,
          serverId: 'game-server',
          metadata: {
            type: 'coding-game',
            description: 'Main world for autonomous coding activities',
            createdAt: Date.now()
          }
        });
      } else {
        this.mainWorldId = gameWorld.id;
      }

      this.runtime.logger.info(`[GameOrchestratorService] Game world ready: ${this.mainWorldId}`);
    } catch (error) {
      this.runtime.logger.error('[GameOrchestratorService] Failed to create game world:', error);
      throw error;
    }
  }

  private async createOrchestratorRoom(): Promise<void> {
    try {
      if (!this.mainWorldId) {
        throw new Error('Main world not created');
      }

      this.orchestratorRoomId = await this.runtime.createRoom({
        name: 'Game Control Center',
        agentId: this.runtime.agentId,
        source: 'game',
        type: ChannelType.GROUP,
        worldId: this.mainWorldId,
        metadata: {
          type: 'orchestrator',
          description: 'Central command room for game orchestration'
        }
      });

      // Add the orchestrator (this agent) as a participant
      await this.runtime.addParticipant(this.runtime.agentId, this.orchestratorRoomId);

      this.runtime.logger.info(`[GameOrchestratorService] Orchestrator room created: ${this.orchestratorRoomId}`);
    } catch (error) {
      this.runtime.logger.error('[GameOrchestratorService] Failed to create orchestrator room:', error);
      throw error;
    }
  }

  async enableAutoMode(): Promise<void> {
    if (this.gameState.mode === 'auto') {
      this.runtime.logger.warn('[GameOrchestratorService] Auto mode already enabled');
      return;
    }

    this.gameState.mode = 'auto';
    this.gameState.lastActivity = Date.now();

    // Start autonomy loop
    this.startAutonomyLoop();

    // Store state change in memory
    await this.storeGameEvent('auto_mode_enabled', {
      mode: 'auto',
      timestamp: Date.now()
    });

    this.runtime.logger.info('[GameOrchestratorService] Auto mode enabled');
  }

  async disableAutoMode(): Promise<void> {
    if (this.gameState.mode !== 'auto') {
      this.runtime.logger.warn('[GameOrchestratorService] Auto mode not currently enabled');
      return;
    }

    this.gameState.mode = 'manual';
    this.gameState.lastActivity = Date.now();

    // Stop autonomy loop
    this.stopAutonomyLoop();

    // Store state change in memory
    await this.storeGameEvent('auto_mode_disabled', {
      mode: 'manual',
      timestamp: Date.now()
    });

    this.runtime.logger.info('[GameOrchestratorService] Auto mode disabled');
  }

  async pauseGame(): Promise<void> {
    const previousMode = this.gameState.mode;
    this.gameState.mode = 'paused';
    this.gameState.lastActivity = Date.now();

    // Stop autonomy loop if running
    this.stopAutonomyLoop();

    // Store state change in memory
    await this.storeGameEvent('game_paused', {
      previousMode,
      mode: 'paused',
      timestamp: Date.now()
    });

    this.runtime.logger.info(`[GameOrchestratorService] Game paused (was in ${previousMode} mode)`);
  }

  async createProject(projectData: {
    name: string;
    description: string;
    requirements: string[];
  }): Promise<Project> {
    if (!this.mainWorldId) {
      throw new Error('Game world not initialized');
    }

    const project: Project = {
      id: `project_${Date.now()}`,
      name: projectData.name,
      description: projectData.description,
      requirements: projectData.requirements,
      status: 'planning',
      artifacts: [],
      createdAt: Date.now(),
      updatedAt: Date.now(),
      progress: 0
    };

    // Create project room in the game world
    const projectRoomId = await this.runtime.createRoom({
      name: `${project.name} Workspace`,
      agentId: this.runtime.agentId,
      source: 'game',
      type: ChannelType.GROUP,
      worldId: this.mainWorldId,
      metadata: {
        type: 'project',
        projectId: project.id,
        projectName: project.name,
        description: project.description
      }
    });

    project.roomId = projectRoomId;

    // Add project to active projects
    this.gameState.activeProjects.push(project);
    this.gameState.lastActivity = Date.now();

    // Store project creation in memory
    await this.storeGameEvent('project_created', {
      projectId: project.id,
      projectName: project.name,
      description: project.description,
      requirements: project.requirements,
      roomId: projectRoomId
    });

    this.runtime.logger.info(`[GameOrchestratorService] Created project: ${project.name}`);

    return project;
  }

  async spawnCoderAgent(project: Project): Promise<any> {
    try {
      const agentFactory = this.runtime.getService<AgentFactoryService>('agentFactory');
      if (!agentFactory) {
        throw new Error('AgentFactory service not available');
      }

      // Create the coder agent using the factory service
      const agent = await agentFactory.createCoderAgent(project);
      
      this.gameState.coderAgents.push(agent);
      this.gameState.lastActivity = Date.now();

      // Add agent to project room
      if (project.roomId) {
        await this.runtime.addParticipant(agent.id, project.roomId);
      }

      // Assign project to agent
      project.assignedAgent = agent.id;
      project.status = 'coding';
      project.updatedAt = Date.now();

      // Store agent spawn event
      await this.storeGameEvent('agent_spawned', {
        agentId: agent.id,
        agentName: agent.name,
        projectId: project.id,
        projectName: project.name,
        roomId: project.roomId
      });

      this.runtime.logger.info(`[GameOrchestratorService] Spawned coder agent: ${agent.name} for project: ${project.name}`);

      return agent;
    } catch (error) {
      this.runtime.logger.error(`[GameOrchestratorService] Failed to spawn coder agent for project ${project.name}:`, error);
      throw error;
    }
  }

  async updateProjectStatus(projectId: string, status: Project['status'], progress?: number): Promise<void> {
    const project = this.gameState.activeProjects.find(p => p.id === projectId);
    if (!project) {
      this.runtime.logger.warn(`[GameOrchestratorService] Project not found: ${projectId}`);
      return;
    }

    const oldStatus = project.status;
    project.status = status;
    project.updatedAt = Date.now();
    
    if (progress !== undefined) {
      project.progress = Math.max(0, Math.min(100, progress));
    }

    this.gameState.lastActivity = Date.now();

    // Store status update in memory
    await this.storeGameEvent('project_status_updated', {
      projectId,
      projectName: project.name,
      oldStatus,
      newStatus: status,
      progress: project.progress,
      timestamp: Date.now()
    });

    this.runtime.logger.info(`[GameOrchestratorService] Project ${project.name} status: ${oldStatus} -> ${status} (${project.progress}%)`);

    // Handle completion
    if (status === 'complete') {
      await this.handleProjectCompletion(project);
    }
  }

  private async handleProjectCompletion(project: Project): Promise<void> {
    try {
      // Mark project as completed task
      await this.runtime.createTask({
        name: `Complete project: ${project.name}`,
        description: project.description,
        roomId: project.roomId,
        worldId: this.mainWorldId,
        tags: ['project-completion', 'success'],
        metadata: {
          projectId: project.id,
          completionTime: Date.now(),
          artifacts: project.artifacts,
          requirements: project.requirements
        }
      });

      // Store completion event
      await this.storeGameEvent('project_completed', {
        projectId: project.id,
        projectName: project.name,
        completionTime: Date.now(),
        artifacts: project.artifacts,
        finalProgress: project.progress
      });

      this.runtime.logger.info(`[GameOrchestratorService] Project completed: ${project.name}`);

    } catch (error) {
      this.runtime.logger.error(`[GameOrchestratorService] Error handling project completion for ${project.name}:`, error);
    }
  }

  private startAutonomyLoop(): void {
    if (this.autonomyInterval) {
      clearInterval(this.autonomyInterval);
    }

    const interval = parseInt(this.runtime.getSetting('autonomyInterval') as string) || 30000;
    
    this.autonomyInterval = setInterval(async () => {
      if (this.gameState.mode === 'auto' && this.isRunning) {
        await this.processAutonomyStep();
      }
    }, interval);

    this.runtime.logger.info(`[GameOrchestratorService] Autonomy loop started with ${interval}ms interval`);
  }

  private stopAutonomyLoop(): void {
    if (this.autonomyInterval) {
      clearInterval(this.autonomyInterval);
      this.autonomyInterval = undefined;
      this.runtime.logger.info('[GameOrchestratorService] Autonomy loop stopped');
    }
  }

  private async processAutonomyStep(): Promise<void> {
    try {
      // Check if we need to create new projects
      const activeProjectsCount = this.gameState.activeProjects.filter(p => p.status !== 'complete').length;
      const maxProjects = parseInt(this.runtime.getSetting('maxActiveProjects') as string) || 3;

      if (activeProjectsCount < maxProjects) {
        await this.generateAutonomousProject();
      }

      // Monitor agent progress and intervene if needed
      await this.monitorAgentProgress();

      this.gameState.lastActivity = Date.now();
    } catch (error) {
      this.runtime.logger.error('[GameOrchestratorService] Error in autonomy step:', error);
    }
  }

  private async generateAutonomousProject(): Promise<void> {
    // Enhanced project generation using LLM
    const projectIdeas = [
      {
        name: 'AI Assistant Plugin',
        description: 'A plugin that provides AI assistance for common tasks',
        requirements: ['Natural language processing', 'Context awareness', 'Response generation']
      },
      {
        name: 'Data Visualization Widget', 
        description: 'Interactive charts and graphs for data analysis',
        requirements: ['Chart rendering', 'Data input handling', 'Export functionality']
      },
      {
        name: 'File Organizer Tool',
        description: 'Automatically organize files based on content and metadata',
        requirements: ['File scanning', 'Content analysis', 'Folder organization']
      }
    ];

    const randomProject = projectIdeas[Math.floor(Math.random() * projectIdeas.length)];
    
    try {
      const project = await this.createProject(randomProject);
      await this.spawnCoderAgent(project);
      
      this.runtime.logger.info(`[GameOrchestratorService] Generated autonomous project: ${project.name}`);
    } catch (error) {
      this.runtime.logger.error('[GameOrchestratorService] Failed to generate autonomous project:', error);
    }
  }

  private async monitorAgentProgress(): Promise<void> {
    // Check for stuck agents or projects that need intervention
    const stuckThreshold = 600000; // 10 minutes
    const now = Date.now();

    for (const project of this.gameState.activeProjects) {
      if (project.status !== 'complete' && project.updatedAt < now - stuckThreshold) {
        this.runtime.logger.warn(`[GameOrchestratorService] Project appears stuck: ${project.name}`);
        
        // Store intervention event
        await this.storeGameEvent('project_intervention_needed', {
          projectId: project.id,
          projectName: project.name,
          lastUpdate: project.updatedAt,
          stuckDuration: now - project.updatedAt
        });
      }
    }
  }

  private async storeGameEvent(eventType: string, data: any): Promise<void> {
    try {
      if (!this.orchestratorRoomId) {
        return;
      }

      await this.runtime.createMemory({
        entityId: this.runtime.agentId,
        roomId: this.orchestratorRoomId,
        content: {
          text: `Game event: ${eventType}`,
          source: 'game-orchestrator',
          metadata: data
        },
        metadata: {
          type: 'game_event',
          eventType,
          timestamp: Date.now()
        }
      }, 'events');
    } catch (error) {
      this.runtime.logger.error('[GameOrchestratorService] Failed to store game event:', error);
    }
  }

  // Getters
  async getGameState(): Promise<GameState> {
    return { ...this.gameState };
  }

  async getActiveProjects(): Promise<Project[]> {
    return [...this.gameState.activeProjects];
  }

  async getCoderAgents(): Promise<any[]> {
    return [...this.gameState.coderAgents];
  }

  async stop(): Promise<void> {
    this.isRunning = false;
    this.stopAutonomyLoop();
    
    // Store shutdown event
    await this.storeGameEvent('service_stopped', {
      finalMode: this.gameState.mode,
      activeProjects: this.gameState.activeProjects.length,
      activeAgents: this.gameState.coderAgents.length,
      timestamp: Date.now()
    });

    this.runtime.logger.info('[GameOrchestratorService] Service stopped');
  }
}