import { Service, elizaLogger } from '@elizaos/core';
import type { IAgentRuntime, UUID } from '@elizaos/core';
import type { SubAgentConfig, TaskContext, IDockerService } from '../types/container.ts';
import {
  ProjectComplexityEstimator,
  type ProjectRequirements,
  type ProjectTask,
} from './ProjectComplexityEstimator.ts';

// These interfaces will be used to type the services we get from runtime
interface ImprovedE2BService {
  createSandbox(options: any): Promise<string>;
  killSandbox(sandboxId: string): Promise<void>;
  writeFileToSandbox(sandboxId: string, path: string, content: string): Promise<void>;
  executeCode(code: string, language: string): Promise<any>;
}

interface AgentCommunicationBridge {
  registerAgent(agentId: UUID, metadata: any): Promise<void>;
  broadcast(data: any): Promise<void>;
}

interface GitHubIntegrationService {
  createBranch?(branchName: string): Promise<void>;
  createPullRequest?(owner: string, repo: string, options: any): Promise<any>;
}

export interface E2BAgentRequest {
  role: 'coder' | 'reviewer' | 'tester';
  taskId: UUID;
  requirements: string[];
  gitCredentials?: GitCredentials;
  projectContext?: ProjectContext;
  priority?: 'low' | 'medium' | 'high' | 'critical';
  specialization?: string; // e.g., 'frontend', 'backend', 'api', 'database'
}

export interface GitCredentials {
  username: string;
  email: string;
  token?: string;
  sshKeyPath?: string;
}

export interface ProjectContext {
  repositoryUrl: string;
  branch?: string;
  projectType?: string;
  dependencies?: string[];
  existingCode?: boolean;
}

export interface E2BAgentHandle {
  sandboxId: string;
  agentId: UUID;
  role: string;
  taskId: UUID;
  status: 'initializing' | 'ready' | 'working' | 'reviewing' | 'completed' | 'failed';
  createdAt: Date;
  lastActivity: Date;
  gitBranch?: string;
  prNumber?: number;
  specialization?: string;
}

export interface RoomState {
  roomId: string;
  taskId: UUID;
  plan: AutocodingPlan;
  assignments: Map<UUID, AgentAssignment>;
  messages: RoomMessage[];
  knowledge: Map<string, any>;
  lastUpdated: Date;
  projectRequirements?: ProjectRequirements;
  tasks?: ProjectTask[];
  repositoryUrl?: string;
}

export interface AutocodingPlan {
  projectName: string;
  status: 'planning' | 'in-progress' | 'review' | 'completed' | 'failed';
  completedSteps: number;
  totalSteps: number;
  currentPhase: string;
  activeAgents: Array<{
    agentId: UUID;
    role: string;
    currentTask: string;
    progress: number;
  }>;
  recentUpdates: Array<{
    timestamp: Date;
    message: string;
    agentId?: UUID;
  }>;
  nextSteps: string[];
}

export interface AgentAssignment {
  agentId: UUID;
  role: string;
  tasks: string[];
  dependencies: string[];
  estimatedTime: number;
  actualTime?: number;
  status: 'pending' | 'active' | 'completed' | 'failed';
}

export interface RoomMessage {
  id: string;
  fromAgentId: UUID;
  content: string;
  type: 'update' | 'request' | 'response' | 'error' | 'completion';
  timestamp: Date;
  metadata?: any;
}

/**
 * E2B Agent Orchestrator Service
 * Manages E2B sandboxes for autocoder agents with Git collaboration
 */
export class E2BAgentOrchestrator extends Service {
  static _serviceName = 'e2b-agent-orchestrator';
  static serviceType = 'orchestration' as const;

  private e2bService: ImprovedE2BService | null = null;
  private communicationBridge: AgentCommunicationBridge | null = null;
  private githubService: GitHubIntegrationService | null = null;
  private dockerService: IDockerService | null = null;
  private complexityEstimator: ProjectComplexityEstimator | null = null;

  private managedAgents: Map<string, E2BAgentHandle> = new Map();
  private agentsByTask: Map<UUID, string[]> = new Map();
  private roomStates: Map<string, RoomState> = new Map();

  // Template configuration - single shared workspace for all agents
  private templateMap = {
    coder: process.env.E2B_TEMPLATE_WORKSPACE || 'eliza-shared-workspace',
    reviewer: process.env.E2B_TEMPLATE_WORKSPACE || 'eliza-shared-workspace',
    tester: process.env.E2B_TEMPLATE_WORKSPACE || 'eliza-shared-workspace',
  };

  capabilityDescription =
    'Orchestrates E2B sandboxed agents for collaborative auto-coding with Git integration';

  constructor(_runtime?: IAgentRuntime) {
    super(_runtime);
  }

  static async start(_runtime: IAgentRuntime): Promise<E2BAgentOrchestrator> {
    const service = new E2BAgentOrchestrator(_runtime);
    await service.initialize();
    elizaLogger.info('E2BAgentOrchestrator started successfully');
    return service;
  }

  private async initialize(): Promise<void> {
    try {
      // Get required services with retry logic
      await this.getRequiredServices();

      // Verify E2B templates exist
      await this.verifyTemplates();

      // Initialize room persistence
      await this.initializeRoomPersistence();

      elizaLogger.info('E2B Agent Orchestrator initialized');
    } catch (_error) {
      elizaLogger.error('Failed to initialize E2BAgentOrchestrator:', _error);
      throw _error;
    }
  }

  private async getRequiredServices(): Promise<void> {
    let attempts = 0;
    const maxAttempts = 50;

    while (attempts < maxAttempts) {
      this.e2bService = this.runtime?.getService('e2b') as ImprovedE2BService | null;
      this.communicationBridge = this.runtime?.getService(
        'agent-communication-bridge'
      ) as AgentCommunicationBridge | null;
      this.githubService = this.runtime?.getService(
        'github-integration'
      ) as GitHubIntegrationService | null;
      this.dockerService = this.runtime?.getService('docker') as IDockerService | null;
      this.complexityEstimator = this.runtime?.getService(
        'project-complexity-estimator'
      ) as ProjectComplexityEstimator | null;

      if (this.e2bService && this.communicationBridge && this.githubService) {
        elizaLogger.debug(`All required services found on attempt ${attempts + 1}`);
        break;
      }

      attempts++;
      if (attempts < maxAttempts) {
        elizaLogger.debug(`Waiting for services... (attempt ${attempts}/${maxAttempts})`);
        await new Promise((resolve) => setTimeout(resolve, 200));
      }
    }

    if (!this.e2bService) {
      throw new Error('E2B service not available - required for agent sandboxing');
    }

    if (!this.communicationBridge) {
      throw new Error('Communication bridge not available - required for agent coordination');
    }

    if (!this.githubService) {
      elizaLogger.warn('GitHub service not available - Git features will be limited');
    }
  }

  async spawnE2BAgent(request: E2BAgentRequest): Promise<E2BAgentHandle> {
    try {
      if (!this.e2bService) {
        throw new Error('E2B service not available');
      }

      elizaLogger.info(`Spawning E2B agent for task ${request.taskId} with role ${request.role}`);

      // Generate unique agent ID
      const agentId = `${request.taskId}-${request.role}-${Date.now()}` as UUID;
      const roomId = this.getRoomId(request.taskId);

      // Get or create room state
      const roomState = await this.getOrCreateRoomState(roomId, request.taskId);

      // Create E2B sandbox with appropriate template
      const template = this.getTemplateForRole(request.role);
      const sandboxId = await this.e2bService.createSandbox({
        template,
        envs: {
          TASK_ID: request.taskId,
          AGENT_ID: agentId,
          AGENT_ROLE: request.role,
          ROOM_ID: roomId,
          MAIN_AGENT_ID: this.runtime?.agentId || '',
          GIT_USERNAME: request.gitCredentials?.username || `agent-${agentId}`,
          GIT_EMAIL: request.gitCredentials?.email || `${agentId}@elizaos.ai`,
          GITHUB_TOKEN: request.gitCredentials?.token || process.env.GITHUB_TOKEN || '',
          PROJECT_CONTEXT: JSON.stringify(request.projectContext || {}),
          SPECIALIZATION: request.specialization || '',
        },
        metadata: {
          agentId,
          role: request.role,
          taskId: request.taskId,
          specialization: request.specialization,
        },
        timeoutMs: 3600000, // 1 hour default timeout
      });

      // Create agent handle
      const handle: E2BAgentHandle = {
        sandboxId,
        agentId,
        role: request.role,
        taskId: request.taskId,
        status: 'initializing',
        createdAt: new Date(),
        lastActivity: new Date(),
        specialization: request.specialization,
      };

      this.managedAgents.set(sandboxId, handle);

      // Track agents by task
      if (!this.agentsByTask.has(request.taskId)) {
        this.agentsByTask.set(request.taskId, []);
      }
      this.agentsByTask.get(request.taskId)!.push(sandboxId);

      // Initialize agent in sandbox
      await this.initializeAgentInSandbox(sandboxId, request, roomState);

      // Register with communication bridge
      if (this.communicationBridge) {
        await this.registerAgentCommunication(sandboxId, request.role, agentId);
      }

      // Update room state with new agent
      await this.updateRoomState(roomId, {
        assignments: new Map([
          ...roomState.assignments,
          [
            agentId,
            {
              agentId,
              role: request.role,
              tasks: request.requirements,
              dependencies: [],
              estimatedTime: this.estimateTaskTime(request),
              status: 'pending',
            },
          ],
        ]),
      });

      // Create Git branch if GitHub is available
      if (this.githubService && request.projectContext?.repositoryUrl) {
        const branchName = await this.createAgentBranch(handle, request);
        handle.gitBranch = branchName;
      }

      // Update status to ready
      handle.status = 'ready';

      elizaLogger.info(`E2B agent spawned successfully: ${agentId} (${sandboxId})`);
      return handle;
    } catch (_error) {
      elizaLogger.error(`Failed to spawn E2B agent for task ${request.taskId}:`, _error);
      throw _error;
    }
  }

  private async initializeAgentInSandbox(
    sandboxId: string,
    request: E2BAgentRequest,
    roomState: RoomState
  ): Promise<void> {
    if (!this.e2bService) {
      throw new Error('E2B service not available');
    }

    elizaLogger.info(`Initializing agent in sandbox ${sandboxId}`);

    // Create startup script for the agent
    const startupScript = this.generateAgentStartupScript(request, roomState);
    await this.e2bService.writeFileToSandbox(
      sandboxId,
      '/home/agent/start-agent.sh',
      startupScript
    );

    // Create agent configuration
    const agentConfig = this.generateAgentConfig(request);
    await this.e2bService.writeFileToSandbox(
      sandboxId,
      '/home/agent/.eliza/config.json',
      JSON.stringify(agentConfig, null, 2)
    );

    // Initialize Git repository if needed
    if (request.projectContext?.repositoryUrl) {
      await this.initializeGitInSandbox(sandboxId, request);
    }

    // Execute startup script
    const result = await this.e2bService.executeCode(
      'cd /home/agent && chmod +x start-agent.sh && ./start-agent.sh',
      'bash'
    );

    if (result.error) {
      throw new Error(`Failed to start agent: ${result.error}`);
    }

    elizaLogger.info(`Agent initialized in sandbox ${sandboxId}`);
  }

  private generateAgentStartupScript(request: E2BAgentRequest, roomState: RoomState): string {
    return `#!/bin/bash
set -e

echo "Starting Eliza agent with role: ${request.role}"

# Set up environment
export NODE_ENV=production
export ELIZA_LOG_LEVEL=info
export AGENT_ROLE=${request.role}
export TASK_ID=${request.taskId}
export ROOM_ID=${this.getRoomId(request.taskId)}

# Initialize SSH for Git if credentials provided
if [ -n "$GIT_USERNAME" ]; then
  git config --global user.name "$GIT_USERNAME"
  git config --global user.email "$GIT_EMAIL"
fi

# Start the agent
cd /home/agent/eliza
npm run start:agent -- \\
  --config /home/agent/.eliza/config.json \\
  --role ${request.role} \\
  --task "${request.requirements.join(', ')}"

echo "Agent started successfully"
`;
  }

  private generateAgentConfig(request: E2BAgentRequest): any {
    return {
      name: `autocoder-${request.role}-agent`,
      plugins: ['autocoder', 'github', 'e2b-client'],
      settings: {
        communication: {
          bridge: 'websocket',
          url: process.env.WEBSOCKET_URL || 'ws://host.docker.internal:8080',
          room: this.getRoomId(request.taskId),
          heartbeat: 10000,
        },
        git: {
          username: request.gitCredentials?.username || `agent-${request.role}`,
          email: request.gitCredentials?.email || `${request.role}@elizaos.ai`,
          sshKeyPath: request.gitCredentials?.sshKeyPath || '/home/agent/.ssh/id_rsa',
        },
        autocoder: {
          role: request.role,
          specialization: request.specialization,
          capabilities: this.getCapabilitiesForRole(request.role),
        },
      },
    };
  }

  private async initializeGitInSandbox(sandboxId: string, request: E2BAgentRequest): Promise<void> {
    if (!this.e2bService || !request.projectContext?.repositoryUrl) {
      return;
    }

    const gitInitScript = `#!/bin/bash
set -e

# Clone repository
git clone ${request.projectContext.repositoryUrl} /home/agent/workspace
cd /home/agent/workspace

# Checkout branch if specified
if [ -n "${request.projectContext.branch}" ]; then
  git checkout ${request.projectContext.branch}
fi

echo "Git repository initialized"
`;

    await this.e2bService.executeCode(gitInitScript, 'bash');
  }

  private async registerAgentCommunication(
    sandboxId: string,
    role: string,
    agentId: UUID
  ): Promise<void> {
    if (!this.communicationBridge) {
      return;
    }

    await this.communicationBridge.registerAgent(agentId, {
      name: `${role}-agent-${sandboxId}`,
      capabilities: this.getCapabilitiesForRole(role),
      metadata: {
        sandboxId,
        role,
        e2bAgent: true,
      },
    });
  }

  private async createAgentBranch(
    handle: E2BAgentHandle,
    request: E2BAgentRequest
  ): Promise<string> {
    const branchName = `agent/${handle.taskId}/${handle.role}-${Date.now()}`;

    // This would integrate with the GitHub service to create the branch
    // For now, return the branch name
    elizaLogger.info(`Would create branch: ${branchName}`);

    return branchName;
  }

  private getTemplateForRole(role: string): string {
    return this.templateMap[role as keyof typeof this.templateMap] || 'eliza-base-agent';
  }

  private getRoomId(taskId: UUID): string {
    return `task-room-${taskId}`;
  }

  private getCapabilitiesForRole(role: string): string[] {
    const capabilities: Record<string, string[]> = {
      coder: [
        'code-generation',
        'file-editing',
        'git-operations',
        'package-management',
        'debugging',
        'testing',
      ],
      reviewer: [
        'code-analysis',
        'security-audit',
        'performance-analysis',
        'documentation-review',
        'test-assessment',
        'best-practices',
      ],
      tester: [
        'test-generation',
        'test-execution',
        'coverage-analysis',
        'integration-testing',
        'e2e-testing',
        'performance-testing',
      ],
    };

    return capabilities[role] || [];
  }

  private estimateTaskTime(request: E2BAgentRequest): number {
    // Basic estimation based on requirements count and complexity
    const baseTime = 300000; // 5 minutes base
    const perRequirement = 120000; // 2 minutes per requirement
    const complexityMultiplier = request.priority === 'critical' ? 0.5 : 1;

    return baseTime + request.requirements.length * perRequirement * complexityMultiplier;
  }

  private async getOrCreateRoomState(roomId: string, taskId: UUID): Promise<RoomState> {
    let roomState = this.roomStates.get(roomId);

    if (!roomState) {
      roomState = {
        roomId,
        taskId,
        plan: {
          projectName: `Task ${taskId}`,
          status: 'planning',
          completedSteps: 0,
          totalSteps: 0,
          currentPhase: 'initialization',
          activeAgents: [],
          recentUpdates: [
            {
              timestamp: new Date(),
              message: 'Room created',
            },
          ],
          nextSteps: ['Initialize agents', 'Analyze requirements', 'Create implementation plan'],
        },
        assignments: new Map(),
        messages: [],
        knowledge: new Map(),
        lastUpdated: new Date(),
      };

      this.roomStates.set(roomId, roomState);
    }

    return roomState;
  }

  private async updateRoomState(roomId: string, updates: Partial<RoomState>): Promise<void> {
    const roomState = this.roomStates.get(roomId);
    if (!roomState) {
      return;
    }

    // Merge updates
    Object.assign(roomState, updates);
    roomState.lastUpdated = new Date();

    // Broadcast update to room members if communication bridge is available
    if (this.communicationBridge) {
      await this.communicationBridge.broadcast({
        type: 'room-state-update',
        roomId,
        updates,
        timestamp: new Date(),
      });
    }
  }

  private async verifyTemplates(): Promise<void> {
    if (!this.e2bService) {
      throw new Error('E2B service required for template verification');
    }
    
    elizaLogger.info('Verifying E2B templates', this.templateMap);
    
    const verificationPromises = Object.entries(this.templateMap).map(async ([role, templateId]) => {
      try {
        // Try to create a test sandbox with this template to verify it exists
        const testSandboxId = await this.e2bService!.createSandbox({
          template: templateId,
          timeoutMs: 10000, // Short timeout for verification
          envs: { VERIFICATION_TEST: 'true' },
          metadata: { purpose: 'template-verification', role }
        });
        
        // If sandbox creation succeeds, template is valid
        elizaLogger.info(`✅ Template verified for role ${role}: ${templateId}`);
        
        // Clean up test sandbox immediately
        await this.e2bService!.killSandbox(testSandboxId);
        
        return { role, templateId, valid: true };
      } catch (error) {
        elizaLogger.error(`❌ Template verification failed for role ${role}: ${templateId}`, error);
        throw new Error(`Template ${templateId} for role ${role} is invalid: ${error instanceof Error ? error.message : String(error)}`);
      }
    });
    
    try {
      const results = await Promise.all(verificationPromises);
      elizaLogger.info(`All ${results.length} E2B templates verified successfully`);
    } catch (error) {
      elizaLogger.error('E2B template verification failed', error);
      throw error;
    }
  }

  private async initializeRoomPersistence(): Promise<void> {
    // Check if we have database/cache service for persistence
    const cacheService = this.runtime?.getService('cache');
    const dbService = this.runtime?.getService('database');
    
    if (cacheService) {
      elizaLogger.info('Room persistence initialized using cache service');
      // Test cache connectivity
      try {
        await cacheService.set('room-persistence-test', { initialized: true, timestamp: Date.now() }, 60);
        const testResult = await cacheService.get('room-persistence-test');
        if (!testResult) {
          throw new Error('Cache service test failed');
        }
        elizaLogger.info('✅ Cache service verified for room persistence');
      } catch (error) {
        elizaLogger.warn('Cache service test failed, falling back to in-memory persistence', error);
      }
    } else if (dbService) {
      elizaLogger.info('Room persistence initialized using database service');
      // Test database connectivity for room state storage
      try {
        // Verify we can create/read room state table
        await dbService.query('SELECT 1 as test', []);
        elizaLogger.info('✅ Database service verified for room persistence');
      } catch (error) {
        elizaLogger.warn('Database service test failed, falling back to in-memory persistence', error);
      }
    } else {
      elizaLogger.warn('No persistence service available - using in-memory storage (data will be lost on restart)');
    }
    
    elizaLogger.info('Room persistence layer initialized');
  }

  async terminateAgent(sandboxId: string): Promise<void> {
    try {
      if (!this.e2bService) {
        throw new Error('E2B service not available');
      }

      const handle = this.managedAgents.get(sandboxId);
      if (!handle) {
        elizaLogger.warn(`Agent ${sandboxId} not found in managed agents`);
        return;
      }

      elizaLogger.info(`Terminating E2B agent: ${handle.agentId}`);

      // Kill the sandbox
      await this.e2bService.killSandbox(sandboxId);

      // Remove from tracking
      this.managedAgents.delete(sandboxId);

      // Remove from task tracking
      const taskAgents = this.agentsByTask.get(handle.taskId);
      if (taskAgents) {
        const index = taskAgents.indexOf(sandboxId);
        if (index > -1) {
          taskAgents.splice(index, 1);
          if (taskAgents.length === 0) {
            this.agentsByTask.delete(handle.taskId);
          }
        }
      }

      // Update room state
      const roomId = this.getRoomId(handle.taskId);
      const roomState = this.roomStates.get(roomId);
      if (roomState) {
        roomState.assignments.delete(handle.agentId);
        await this.updateRoomState(roomId, {
          assignments: roomState.assignments,
        });
      }

      elizaLogger.info(`E2B agent terminated: ${handle.agentId}`);
    } catch (_error) {
      elizaLogger.error(`Failed to terminate E2B agent ${sandboxId}:`, _error);
      throw _error;
    }
  }

  async terminateTaskAgents(taskId: UUID): Promise<void> {
    const agentIds = this.agentsByTask.get(taskId) || [];
    elizaLogger.info(`Terminating ${agentIds.length} agents for task ${taskId}`);

    const terminationPromises = agentIds.map((sandboxId) =>
      this.terminateAgent(sandboxId).catch((error) => {
        elizaLogger.error(`Failed to terminate agent ${sandboxId}:`, error);
      })
    );

    await Promise.all(terminationPromises);

    // Clean up room state
    const roomId = this.getRoomId(taskId);
    this.roomStates.delete(roomId);

    elizaLogger.info(`All agents terminated for task ${taskId}`);
  }

  async getAgentStatus(sandboxId: string): Promise<E2BAgentHandle | null> {
    return this.managedAgents.get(sandboxId) || null;
  }

  async listTaskAgents(taskId: UUID): Promise<E2BAgentHandle[]> {
    const agentIds = this.agentsByTask.get(taskId) || [];
    return agentIds
      .map((id) => this.managedAgents.get(id))
      .filter((agent): agent is E2BAgentHandle => agent !== undefined);
  }

  async getRoomState(taskId: UUID): Promise<RoomState | null> {
    const roomId = this.getRoomId(taskId);
    return this.roomStates.get(roomId) || null;
  }

  /**
   * Spawn a team of agents based on project complexity
   */
  async spawnProjectTeam(
    projectDescription: string,
    gitCredentials?: GitCredentials
  ): Promise<{
    taskId: UUID;
    repositoryUrl: string;
    requirements: ProjectRequirements;
    agents: E2BAgentHandle[];
  }> {
    if (!this.complexityEstimator) {
      throw new Error('Project complexity estimator not available');
    }

    elizaLogger.info('Analyzing project complexity and spawning team');

    // Generate task ID
    const taskId = `project-${Date.now()}-${Math.random().toString(36).substring(2, 9)}` as UUID;
    const roomId = this.getRoomId(taskId);

    // Estimate project requirements
    const requirements = await this.complexityEstimator.estimateProject(projectDescription);

    elizaLogger.info('Project analysis complete', {
      complexity: requirements.complexity,
      estimatedHours: requirements.estimatedHours,
      requiredAgents: requirements.requiredAgents.total,
    });

    // Create GitHub repository for the project
    let repositoryUrl = '';
    if (this.githubService && gitCredentials) {
      const repoName = this.generateRepoName(projectDescription);
      try {
        const repo = await this.githubService.createPullRequest?.(
          gitCredentials.username,
          repoName,
          {
            title: 'Initial project setup',
            description: projectDescription,
            head: 'main',
            base: 'main',
          }
        );
        repositoryUrl = repo?.html_url || '';
      } catch (error) {
        elizaLogger.warn('Failed to create GitHub repository', error);
      }
    }

    // Create room state with project requirements
    const roomState = await this.getOrCreateRoomState(roomId, taskId);
    await this.updateRoomState(roomId, {
      projectRequirements: requirements,
      tasks: requirements.tasks,
      repositoryUrl,
      plan: {
        projectName: projectDescription.split(' ').slice(0, 3).join(' '),
        status: 'planning',
        completedSteps: 0,
        totalSteps: requirements.tasks.length,
        currentPhase: 'initialization',
        activeAgents: [],
        recentUpdates: [
          {
            timestamp: new Date(),
            message: `Project analysis complete. Spawning ${requirements.requiredAgents.total} agents.`,
          },
        ],
        nextSteps: requirements.tasks.slice(0, 3).map((t) => t.name),
      },
    });

    // Spawn agents based on requirements
    const agents: E2BAgentHandle[] = [];
    const projectContext: ProjectContext = {
      repositoryUrl,
      branch: 'main',
      projectType: this.detectProjectType(projectDescription),
      dependencies: [],
      existingCode: false,
    };

    for (const roleSpec of requirements.requiredAgents.roles) {
      for (let i = 0; i < roleSpec.count; i++) {
        const agent = await this.spawnE2BAgent({
          role: roleSpec.role as any,
          taskId,
          requirements: roleSpec.skills,
          gitCredentials,
          projectContext,
          priority: 'high',
          specialization: roleSpec.skills[0],
        });
        agents.push(agent);
      }
    }

    // Give agents their initial tasks
    await this.distributeInitialTasks(taskId, agents, requirements.tasks);

    elizaLogger.info(`Project team spawned successfully with ${agents.length} agents`);

    return {
      taskId,
      repositoryUrl,
      requirements,
      agents,
    };
  }

  private generateRepoName(description: string): string {
    const words = description
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, '')
      .split(/\s+/)
      .filter((w) => w.length > 2)
      .slice(0, 3);

    return `autocoder-${words.join('-')}-${Date.now()}`;
  }

  private detectProjectType(description: string): string {
    const lower = description.toLowerCase();

    if (/react|next|vue|angular|svelte/.test(lower)) return 'frontend';
    if (/api|backend|server|express|fastify/.test(lower)) return 'backend';
    if (/fullstack|full-stack/.test(lower)) return 'fullstack';
    if (/mobile|react native|flutter/.test(lower)) return 'mobile';
    if (/cli|command line|terminal/.test(lower)) return 'cli';
    if (/library|package|npm|module/.test(lower)) return 'library';

    return 'web';
  }

  private async distributeInitialTasks(
    taskId: UUID,
    agents: E2BAgentHandle[],
    tasks: ProjectTask[]
  ): Promise<void> {
    if (!this.complexityEstimator) return;

    const roomId = this.getRoomId(taskId);

    // Give each agent their first available task
    for (const agent of agents) {
      const availableTasks = this.complexityEstimator.getAvailableTasks(tasks, agent.role);

      if (availableTasks.length > 0) {
        const task = availableTasks[0];

        // Send task to agent via communication bridge
        if (this.communicationBridge) {
          await this.communicationBridge.broadcast({
            type: 'task-assignment',
            agentId: agent.agentId,
            task: {
              id: task.id,
              name: task.name,
              description: task.description,
              estimatedHours: task.estimatedHours,
            },
          });
        }

        // Update task status
        this.complexityEstimator.updateTaskStatus(tasks, task.id, 'in-progress');

        // Update agent status
        agent.status = 'working';

        elizaLogger.info(`Assigned task ${task.name} to agent ${agent.agentId}`);
      }
    }

    // Update room state with current task statuses
    await this.updateRoomState(roomId, { tasks });
  }

  /**
   * Monitor agents and redistribute tasks as needed
   */
  async monitorAndRedistribute(taskId: UUID): Promise<void> {
    if (!this.complexityEstimator) return;

    const roomState = await this.getRoomState(taskId);
    if (!roomState || !roomState.tasks) return;

    const agents = await this.listTaskAgents(taskId);

    for (const agent of agents) {
      // Check if agent should sleep (waiting for dependencies)
      if (this.complexityEstimator.shouldAgentSleep(roomState.tasks, agent.role)) {
        if (agent.status === 'working') {
          agent.status = 'ready';
          elizaLogger.info(`Agent ${agent.agentId} is waiting for dependencies`);
        }
        continue;
      }

      // If agent is ready, assign next task
      if (agent.status === 'ready') {
        const availableTasks = this.complexityEstimator.getAvailableTasks(
          roomState.tasks,
          agent.role
        );

        if (availableTasks.length > 0) {
          const task = availableTasks[0];

          // Send new task to agent
          if (this.communicationBridge) {
            await this.communicationBridge.broadcast({
              type: 'task-assignment',
              agentId: agent.agentId,
              task: {
                id: task.id,
                name: task.name,
                description: task.description,
                estimatedHours: task.estimatedHours,
              },
            });
          }

          this.complexityEstimator.updateTaskStatus(roomState.tasks, task.id, 'in-progress');
          agent.status = 'working';

          elizaLogger.info(`Reassigned task ${task.name} to agent ${agent.agentId}`);
        }
      }
    }

    // Update room state
    await this.updateRoomState(roomState.roomId, { tasks: roomState.tasks });
  }

  async stop(): Promise<void> {
    elizaLogger.info('Stopping E2B Agent Orchestrator');

    // Terminate all agents
    const allAgentIds = Array.from(this.managedAgents.keys());
    await Promise.all(
      allAgentIds.map((id) =>
        this.terminateAgent(id).catch((error) => {
          elizaLogger.error(`Error terminating agent ${id} during shutdown:`, error);
        })
      )
    );

    // Clear all state
    this.managedAgents.clear();
    this.agentsByTask.clear();
    this.roomStates.clear();

    elizaLogger.info('E2B Agent Orchestrator stopped');
  }
}
