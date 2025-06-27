import { elizaLogger, type IAgentRuntime } from '@elizaos/core';
import type { TelemetryService } from './telemetry-service.js';
import type { ErrorLogService } from './error-log-service.js';
import { EventEmitter } from 'events';

export interface SwarmOrchestratorOptions {
  maxAgents: number;
  communicationPort: number;
  telemetryService: TelemetryService;
  errorLogService: ErrorLogService;
  debug?: boolean;
}

export interface SwarmAgent {
  id: string;
  role: AgentRole;
  status: 'initializing' | 'active' | 'busy' | 'idle' | 'error' | 'terminated';
  runtime?: IAgentRuntime;
  capabilities: string[];
  currentTask?: SwarmTask;
  performance: {
    tasksCompleted: number;
    tasksSuccessful: number;
    averageResponseTime: number;
    lastActivity: string;
  };
  createdAt: string;
  lastHeartbeat: string;
}

export interface SwarmTask {
  id: string;
  type: 'research' | 'planning' | 'coding' | 'testing' | 'review' | 'deployment';
  priority: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  assignedAgentId?: string;
  status: 'pending' | 'in-progress' | 'completed' | 'failed' | 'cancelled';
  dependencies: string[];
  artifacts: SwarmArtifact[];
  metadata: Record<string, any>;
  createdAt: string;
  updatedAt: string;
  completedAt?: string;
}

export interface SwarmArtifact {
  id: string;
  type: 'code' | 'documentation' | 'plan' | 'research' | 'test' | 'config';
  path: string;
  content: string;
  version: number;
  agentId: string;
  taskId: string;
  createdAt: string;
}

export type AgentRole = 
  | 'coordinator'     // Overall project coordination
  | 'researcher'      // Web search and analysis
  | 'architect'       // System design and planning
  | 'coder'          // Implementation and coding
  | 'reviewer'       // Code review and quality
  | 'tester'         // Testing and validation
  | 'deployer'       // Deployment and ops
  | 'specialist';    // Domain-specific expertise

export interface SwarmStatus {
  activeAgents: number;
  totalTasks: number;
  completedTasks: number;
  currentPhase: string;
  progress: number;
}

export class SwarmOrchestrator extends EventEmitter {
  private options: SwarmOrchestratorOptions;
  private agents: Map<string, SwarmAgent> = new Map();
  private tasks: Map<string, SwarmTask> = new Map();
  private artifacts: Map<string, SwarmArtifact> = new Map();
  private telemetryService: TelemetryService;
  private errorLogService: ErrorLogService;
  private isInitialized = false;
  private heartbeatInterval?: NodeJS.Timeout;

  constructor(options: SwarmOrchestratorOptions) {
    super();
    this.options = options;
    this.telemetryService = options.telemetryService;
    this.errorLogService = options.errorLogService;
  }

  async initialize(): Promise<void> {
    try {
      elizaLogger.info('Initializing Swarm Orchestrator...');

      // Start heartbeat monitoring
      this.startHeartbeatMonitoring();

      // Log initialization
      await this.telemetryService.logEvent('swarm_orchestrator_initialized', {
        maxAgents: this.options.maxAgents,
        communicationPort: this.options.communicationPort,
      }, 'swarm');

      this.isInitialized = true;
      elizaLogger.info('✅ Swarm Orchestrator initialized');
    } catch (error) {
      await this.errorLogService.logError('Failed to initialize Swarm Orchestrator', error as Error, {}, 'swarm');
      throw error;
    }
  }

  async spawnAgent(role: AgentRole, capabilities: string[] = []): Promise<string> {
    if (this.agents.size >= this.options.maxAgents) {
      throw new Error(`Maximum number of agents (${this.options.maxAgents}) already spawned`);
    }

    const agentId = `agent-${role}-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`;
    
    try {
      const agent: SwarmAgent = {
        id: agentId,
        role,
        status: 'initializing',
        capabilities: [...capabilities, ...this.getDefaultCapabilities(role)],
        performance: {
          tasksCompleted: 0,
          tasksSuccessful: 0,
          averageResponseTime: 0,
          lastActivity: new Date().toISOString(),
        },
        createdAt: new Date().toISOString(),
        lastHeartbeat: new Date().toISOString(),
      };

      // Initialize the agent runtime
      agent.runtime = await this.initializeAgentRuntime(role, agentId);
      agent.status = 'active';

      this.agents.set(agentId, agent);

      await this.telemetryService.logEvent('agent_spawned', {
        agentId,
        role,
        capabilities,
        totalAgents: this.agents.size,
      }, 'swarm');

      this.emit('agentSpawned', agent);
      elizaLogger.info(`✅ Spawned ${role} agent: ${agentId}`);

      return agentId;
    } catch (error) {
      await this.errorLogService.logError('Failed to spawn agent', error as Error, { role, agentId }, 'swarm');
      throw error;
    }
  }

  async terminateAgent(agentId: string): Promise<void> {
    const agent = this.agents.get(agentId);
    if (!agent) {
      throw new Error(`Agent ${agentId} not found`);
    }

    try {
      // Cancel any current tasks
      if (agent.currentTask) {
        await this.cancelTask(agent.currentTask.id);
      }

      // Clean up runtime
      if (agent.runtime) {
        // Gracefully shutdown the runtime
        try {
          // The runtime should have a cleanup method
          await (agent.runtime as any).cleanup?.();
        } catch (cleanupError) {
          elizaLogger.warn(`Error cleaning up runtime for agent ${agentId}:`, cleanupError);
        }
      }

      agent.status = 'terminated';
      this.agents.delete(agentId);

      await this.telemetryService.logEvent('agent_terminated', {
        agentId,
        role: agent.role,
        performance: agent.performance,
        totalAgents: this.agents.size,
      }, 'swarm');

      this.emit('agentTerminated', agentId);
      elizaLogger.info(`🛑 Terminated agent: ${agentId}`);
    } catch (error) {
      await this.errorLogService.logError('Failed to terminate agent', error as Error, { agentId }, 'swarm');
      throw error;
    }
  }

  async terminateAllAgents(): Promise<void> {
    const agentIds = Array.from(this.agents.keys());
    
    await Promise.all(agentIds.map(agentId => 
      this.terminateAgent(agentId).catch(error => 
        elizaLogger.warn(`Error terminating agent ${agentId}:`, error)
      )
    ));

    elizaLogger.info('🛑 All agents terminated');
  }

  async assignTask(task: Omit<SwarmTask, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {
    const taskId = `task-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`;
    
    const swarmTask: SwarmTask = {
      ...task,
      id: taskId,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    this.tasks.set(taskId, swarmTask);

    // Find best agent for this task
    const bestAgent = this.findBestAgentForTask(swarmTask);
    
    if (bestAgent) {
      await this.assignTaskToAgent(taskId, bestAgent.id);
    }

    await this.telemetryService.logEvent('task_assigned', {
      taskId,
      type: task.type,
      priority: task.priority,
      assignedTo: bestAgent?.id,
    }, 'swarm');

    this.emit('taskAssigned', swarmTask);
    return taskId;
  }

  private async assignTaskToAgent(taskId: string, agentId: string): Promise<void> {
    const task = this.tasks.get(taskId);
    const agent = this.agents.get(agentId);

    if (!task || !agent) {
      throw new Error('Task or agent not found');
    }

    if (agent.status !== 'active' && agent.status !== 'idle') {
      throw new Error(`Agent ${agentId} is not available (status: ${agent.status})`);
    }

    task.assignedAgentId = agentId;
    task.status = 'in-progress';
    task.updatedAt = new Date().toISOString();

    agent.currentTask = task;
    agent.status = 'busy';
    agent.lastHeartbeat = new Date().toISOString();

    // Start task execution
    this.executeTaskOnAgent(task, agent).catch(error => {
      this.errorLogService.logError('Task execution failed', error as Error, { taskId, agentId }, 'swarm');
    });
  }

  private async executeTaskOnAgent(task: SwarmTask, agent: SwarmAgent): Promise<void> {
    const startTime = Date.now();

    try {
      if (!agent.runtime) {
        throw new Error('Agent runtime not available');
      }

      // Execute the task based on its type
      const result = await this.executeTaskByType(task, agent);

      // Update task status
      task.status = 'completed';
      task.completedAt = new Date().toISOString();
      task.updatedAt = new Date().toISOString();

      // Update agent performance
      const responseTime = Date.now() - startTime;
      agent.performance.tasksCompleted++;
      agent.performance.tasksSuccessful++;
      agent.performance.averageResponseTime = 
        (agent.performance.averageResponseTime * (agent.performance.tasksCompleted - 1) + responseTime) / agent.performance.tasksCompleted;
      agent.performance.lastActivity = new Date().toISOString();

      // Clear current task and set to idle
      agent.currentTask = undefined;
      agent.status = 'idle';

      await this.telemetryService.logEvent('task_completed', {
        taskId: task.id,
        agentId: agent.id,
        responseTime,
        result: result ? 'success' : 'partial',
      }, 'swarm');

      this.emit('taskCompleted', task, agent);

    } catch (error) {
      // Handle task failure
      task.status = 'failed';
      task.updatedAt = new Date().toISOString();

      agent.performance.tasksCompleted++;
      agent.performance.lastActivity = new Date().toISOString();

      agent.currentTask = undefined;
      agent.status = 'error';

      await this.errorLogService.logError('Task execution failed', error as Error, {
        taskId: task.id,
        agentId: agent.id,
        taskType: task.type,
      }, 'swarm');

      this.emit('taskFailed', task, agent, error);
    }
  }

  private async executeTaskByType(task: SwarmTask, agent: SwarmAgent): Promise<any> {
    // This would delegate to specific task handlers based on type
    switch (task.type) {
      case 'research':
        return await this.executeResearchTask(task, agent);
      case 'planning':
        return await this.executePlanningTask(task, agent);
      case 'coding':
        return await this.executeCodingTask(task, agent);
      case 'testing':
        return await this.executeTestingTask(task, agent);
      case 'review':
        return await this.executeReviewTask(task, agent);
      case 'deployment':
        return await this.executeDeploymentTask(task, agent);
      default:
        throw new Error(`Unknown task type: ${task.type}`);
    }
  }

  private async executeResearchTask(task: SwarmTask, agent: SwarmAgent): Promise<any> {
    // TODO: Implement research task execution
    // This would use web search, documentation analysis, etc.
    elizaLogger.info(`Agent ${agent.id} executing research task: ${task.description}`);
    return { type: 'research', completed: true };
  }

  private async executePlanningTask(task: SwarmTask, agent: SwarmAgent): Promise<any> {
    // TODO: Implement planning task execution
    elizaLogger.info(`Agent ${agent.id} executing planning task: ${task.description}`);
    return { type: 'planning', completed: true };
  }

  private async executeCodingTask(task: SwarmTask, agent: SwarmAgent): Promise<any> {
    // TODO: Implement coding task execution
    elizaLogger.info(`Agent ${agent.id} executing coding task: ${task.description}`);
    return { type: 'coding', completed: true };
  }

  private async executeTestingTask(task: SwarmTask, agent: SwarmAgent): Promise<any> {
    // TODO: Implement testing task execution
    elizaLogger.info(`Agent ${agent.id} executing testing task: ${task.description}`);
    return { type: 'testing', completed: true };
  }

  private async executeReviewTask(task: SwarmTask, agent: SwarmAgent): Promise<any> {
    // TODO: Implement review task execution
    elizaLogger.info(`Agent ${agent.id} executing review task: ${task.description}`);
    return { type: 'review', completed: true };
  }

  private async executeDeploymentTask(task: SwarmTask, agent: SwarmAgent): Promise<any> {
    // TODO: Implement deployment task execution
    elizaLogger.info(`Agent ${agent.id} executing deployment task: ${task.description}`);
    return { type: 'deployment', completed: true };
  }

  private findBestAgentForTask(task: SwarmTask): SwarmAgent | null {
    const availableAgents = Array.from(this.agents.values())
      .filter(agent => agent.status === 'active' || agent.status === 'idle');

    if (availableAgents.length === 0) return null;

    // Score agents based on role match, capabilities, and performance
    const scoredAgents = availableAgents.map(agent => {
      let score = 0;

      // Role match
      if (this.isRoleMatchForTask(agent.role, task.type)) {
        score += 50;
      }

      // Capability match
      const capabilityMatches = agent.capabilities.filter(cap => 
        task.description.toLowerCase().includes(cap.toLowerCase())
      ).length;
      score += capabilityMatches * 10;

      // Performance factor
      if (agent.performance.tasksCompleted > 0) {
        const successRate = agent.performance.tasksSuccessful / agent.performance.tasksCompleted;
        score += successRate * 20;
      }

      // Availability bonus
      if (agent.status === 'idle') {
        score += 15;
      }

      return { agent, score };
    });

    // Return the highest scoring agent
    scoredAgents.sort((a, b) => b.score - a.score);
    return scoredAgents[0]?.agent || null;
  }

  private isRoleMatchForTask(role: AgentRole, taskType: SwarmTask['type']): boolean {
    const roleTaskMapping: Record<AgentRole, SwarmTask['type'][]> = {
      coordinator: ['planning'],
      researcher: ['research'],
      architect: ['planning'],
      coder: ['coding'],
      reviewer: ['review'],
      tester: ['testing'],
      deployer: ['deployment'],
      specialist: ['research', 'coding', 'testing'], // Can handle multiple types
    };

    return roleTaskMapping[role]?.includes(taskType) || false;
  }

  private getDefaultCapabilities(role: AgentRole): string[] {
    const capabilities: Record<AgentRole, string[]> = {
      coordinator: ['project-management', 'task-coordination', 'communication'],
      researcher: ['web-search', 'documentation-analysis', 'information-gathering'],
      architect: ['system-design', 'architecture-planning', 'technology-selection'],
      coder: ['programming', 'implementation', 'debugging'],
      reviewer: ['code-review', 'quality-assurance', 'security-analysis'],
      tester: ['test-writing', 'validation', 'qa-testing'],
      deployer: ['deployment', 'devops', 'infrastructure'],
      specialist: ['domain-expertise', 'specialized-knowledge'],
    };

    return capabilities[role] || [];
  }

  private async initializeAgentRuntime(role: AgentRole, agentId: string): Promise<IAgentRuntime> {
    // TODO: Initialize a proper agent runtime
    // This is a placeholder - would need to create actual agent characters
    // and initialize them with the ElizaOS runtime
    
    // For now, return a mock runtime
    return {
      agentId,
      character: {
        name: `${role}-${agentId}`,
        bio: [`I am a ${role} agent specialized in ${role} tasks.`],
        plugins: ['@elizaos/plugin-sql', '@elizaos/plugin-github'],
      },
      // Add other required runtime methods as mocks
    } as any;
  }

  private startHeartbeatMonitoring(): void {
    this.heartbeatInterval = setInterval(async () => {
      const now = Date.now();
      const staleThreshold = 5 * 60 * 1000; // 5 minutes

      for (const [agentId, agent] of this.agents) {
        const lastHeartbeat = new Date(agent.lastHeartbeat).getTime();
        
        if (now - lastHeartbeat > staleThreshold) {
          elizaLogger.warn(`Agent ${agentId} heartbeat stale, marking as error`);
          agent.status = 'error';
          
          await this.errorLogService.logWarning('Agent heartbeat stale', {
            agentId,
            lastHeartbeat: agent.lastHeartbeat,
          }, 'swarm');
        }
      }
    }, 60000); // Check every minute
  }

  async cancelTask(taskId: string): Promise<void> {
    const task = this.tasks.get(taskId);
    if (!task) {
      throw new Error(`Task ${taskId} not found`);
    }

    task.status = 'cancelled';
    task.updatedAt = new Date().toISOString();

    // If assigned to an agent, clear the assignment
    if (task.assignedAgentId) {
      const agent = this.agents.get(task.assignedAgentId);
      if (agent && agent.currentTask?.id === taskId) {
        agent.currentTask = undefined;
        agent.status = 'idle';
      }
    }

    this.emit('taskCancelled', task);
  }

  async getStatus(): Promise<SwarmStatus> {
    const totalTasks = this.tasks.size;
    const completedTasks = Array.from(this.tasks.values()).filter(task => task.status === 'completed').length;
    
    return {
      activeAgents: this.agents.size,
      totalTasks,
      completedTasks,
      currentPhase: this.determineCurrentPhase(),
      progress: totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0,
    };
  }

  private determineCurrentPhase(): string {
    const activeTasks = Array.from(this.tasks.values()).filter(task => task.status === 'in-progress');
    
    if (activeTasks.length === 0) return 'idle';
    
    const taskTypes = activeTasks.map(task => task.type);
    const mostCommonType = taskTypes.reduce((a, b, i, arr) =>
      arr.filter(v => v === a).length >= arr.filter(v => v === b).length ? a : b
    );
    
    return mostCommonType;
  }

  async getAgentStatus(): Promise<Array<{ id: string; status: string; role: string }>> {
    return Array.from(this.agents.values()).map(agent => ({
      id: agent.id,
      status: agent.status,
      role: agent.role,
    }));
  }

  async shutdown(): Promise<void> {
    try {
      elizaLogger.info('Shutting down Swarm Orchestrator...');

      // Stop heartbeat monitoring
      if (this.heartbeatInterval) {
        clearInterval(this.heartbeatInterval);
      }

      // Terminate all agents
      await this.terminateAllAgents();

      // Cancel all pending tasks
      const pendingTasks = Array.from(this.tasks.values()).filter(task => 
        task.status === 'pending' || task.status === 'in-progress'
      );

      await Promise.all(pendingTasks.map(task => this.cancelTask(task.id)));

      await this.telemetryService.logEvent('swarm_orchestrator_shutdown', {
        totalAgents: this.agents.size,
        totalTasks: this.tasks.size,
      }, 'swarm');

      elizaLogger.info('✅ Swarm Orchestrator shutdown completed');
    } catch (error) {
      await this.errorLogService.logError('Error during Swarm Orchestrator shutdown', error as Error, {}, 'swarm');
      throw error;
    }
  }
}