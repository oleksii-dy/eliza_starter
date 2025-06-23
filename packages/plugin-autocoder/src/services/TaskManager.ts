import { Service, elizaLogger } from '@elizaos/core';
import type { IAgentRuntime, UUID } from '@elizaos/core';
import type { ContainerOrchestrator } from './ContainerOrchestrator.js';
import type { CommunicationBridge } from './CommunicationBridge.js';

interface AutoCodingTask {
  id: UUID;
  title: string;
  description: string;
  requirements: string[];
  acceptanceCriteria: string[];
  priority: 'low' | 'medium' | 'high' | 'critical';
  status: 'pending' | 'assigned' | 'in_progress' | 'review' | 'completed' | 'failed' | 'cancelled';
  assignedAgents: UUID[];
  assignedContainers: string[];
  context: TaskContext;
  timeline: TaskEvent[];
  result?: TaskResult;
  createdAt: Date;
  updatedAt: Date;
  deadline?: Date;
}

interface TaskContext {
  repositoryPath: string;
  branchName: string;
  baseBranch: string;
  files: string[];
  dependencies: string[];
  testSuites: string[];
  environment: Record<string, string>;
  constraints: TaskConstraints;
}

interface TaskConstraints {
  maxDuration: number; // milliseconds
  maxResources: {
    memory: number; // bytes
    cpu: number; // CPU shares
  };
  allowedOperations: string[];
  securityLevel: 'low' | 'medium' | 'high';
}

interface TaskEvent {
  timestamp: Date;
  type: 'created' | 'assigned' | 'started' | 'progress' | 'completed' | 'failed' | 'cancelled';
  agentId?: UUID;
  message: string;
  data?: any;
}

interface TaskResult {
  success: boolean;
  output: any;
  files: TaskFile[];
  tests: TestResult[];
  codeReview: CodeReviewResult;
  logs: string[];
  metrics: TaskMetrics;
  pullRequest?: PullRequestInfo;
}

interface TaskFile {
  path: string;
  action: 'created' | 'modified' | 'deleted';
  content?: string;
  diff?: string;
  size: number;
}

interface TestResult {
  suite: string;
  passed: number;
  failed: number;
  skipped: number;
  coverage: number;
  duration: number;
  failures: TestFailure[];
}

interface TestFailure {
  test: string;
  error: string;
  stack?: string;
}

interface CodeReviewResult {
  overall: 'approved' | 'needs_changes' | 'rejected';
  issues: CodeIssue[];
  suggestions: CodeSuggestion[];
  metrics: {
    complexity: number;
    maintainability: number;
    security: number;
  };
}

interface CodeIssue {
  severity: 'error' | 'warning' | 'info';
  type: 'syntax' | 'logic' | 'security' | 'performance' | 'style';
  file: string;
  line: number;
  message: string;
  suggestion?: string;
}

interface CodeSuggestion {
  file: string;
  line: number;
  type: 'improvement' | 'optimization' | 'refactor';
  description: string;
  example?: string;
}

interface TaskMetrics {
  duration: number;
  linesOfCode: number;
  filesModified: number;
  testCoverage: number;
  codeQuality: number;
  resourceUsage: {
    maxMemory: number;
    maxCpu: number;
    networkIO: number;
    diskIO: number;
  };
}

interface PullRequestInfo {
  id: string;
  url: string;
  title: string;
  description: string;
  status: 'open' | 'merged' | 'closed';
  reviewers: string[];
}

export class TaskManager extends Service {
  static serviceName = 'task-manager';
  static serviceType = 'orchestration' as const;

  private tasks: Map<UUID, AutoCodingTask> = new Map();
  private orchestrator!: ContainerOrchestrator;
  private communicationBridge!: CommunicationBridge;
  private activeTaskQueue: AutoCodingTask[] = [];
  private processingQueue = false;

  capabilityDescription = 'Manages auto-coding tasks, assignments, and lifecycle';

  constructor(runtime?: IAgentRuntime) {
    super(runtime);
  }

  static async start(runtime: IAgentRuntime): Promise<TaskManager> {
    const service = new TaskManager(runtime);
    await service.initialize();
    elizaLogger.info('TaskManager started successfully');
    return service;
  }

  private async initialize(): Promise<void> {
    try {
      // Get required services
      this.orchestrator = this.runtime.getService(
        'container-orchestrator'
      ) as ContainerOrchestrator;
      this.communicationBridge = this.runtime.getService(
        'communication-bridge'
      ) as CommunicationBridge;

      if (!this.orchestrator) {
        throw new Error('ContainerOrchestrator service not available');
      }

      if (!this.communicationBridge) {
        throw new Error('CommunicationBridge service not available');
      }

      // Start task queue processing
      this.startTaskQueueProcessor();

      elizaLogger.info('TaskManager initialized successfully');
    } catch (error) {
      elizaLogger.error('Failed to initialize TaskManager:', error);
      throw error;
    }
  }

  async createTask(request: {
    title: string;
    description: string;
    requirements: string[];
    acceptanceCriteria?: string[];
    priority?: 'low' | 'medium' | 'high' | 'critical';
    context: Partial<TaskContext>;
    deadline?: Date;
  }): Promise<UUID> {
    try {
      const taskId = `task_${Date.now()}_${Math.random().toString(36).substr(2, 9)}` as UUID;

      const task: AutoCodingTask = {
        id: taskId,
        title: request.title,
        description: request.description,
        requirements: request.requirements,
        acceptanceCriteria:
          request.acceptanceCriteria ||
          this.generateDefaultAcceptanceCriteria(request.requirements),
        priority: request.priority || 'medium',
        status: 'pending',
        assignedAgents: []
        assignedContainers: []
        context: this.completeTaskContext(request.context),
        timeline: [
          {
            timestamp: new Date(),
            type: 'created',
            message: 'Task created',
            data: { createdBy: this.runtime.agentId },
          },
        ],
        createdAt: new Date(),
        updatedAt: new Date(),
        deadline: request.deadline,
      };

      this.tasks.set(taskId, task);
      this.queueTask(task);

      elizaLogger.info(`Task created: ${taskId} - ${task.title}`);
      return taskId;
    } catch (error) {
      elizaLogger.error('Failed to create task:', error);
      throw error;
    }
  }

  async assignTask(taskId: UUID): Promise<void> {
    const task = this.tasks.get(taskId);
    if (!task) {
      throw new Error(`Task not found: ${taskId}`);
    }

    if (task.status !== 'pending') {
      throw new Error(`Task ${taskId} is not in pending status (current: ${task.status})`);
    }

    try {
      elizaLogger.info(`Assigning task: ${taskId}`);

      // Determine required agents based on task complexity
      const requiredRoles = this.analyzeRequiredRoles(task);
      const containerRequests: any[] = [];

      for (const role of requiredRoles) {
        const request = {
          taskId,
          agentRole: role,
          requirements: task.requirements,
          environment: task.context.environment,
          priority: task.priority,
          timeoutMs: task.context.constraints.maxDuration,
        };

        containerRequests.push(request);
      }

      // Spawn containers for sub-agents
      const containerIds: string[] = [];
      for (const request of containerRequests) {
        try {
          const containerId = await this.orchestrator.spawnSubAgent(request);
          containerIds.push(containerId);
          elizaLogger.info(
            `Sub-agent spawned for task ${taskId}: ${request.agentRole} (${containerId})`
          );
        } catch (error) {
          elizaLogger.error(
            `Failed to spawn ${request.agentRole} agent for task ${taskId}:`,
            error
          );
          // Cleanup already spawned containers
          for (const existingContainer of containerIds) {
            await this.orchestrator.terminateSubAgent(existingContainer, false);
          }
          throw error;
        }
      }

      // Update task status
      task.status = 'assigned';
      task.assignedContainers = containerIds;
      task.updatedAt = new Date();
      task.timeline.push({
        timestamp: new Date(),
        type: 'assigned',
        message: `Task assigned to ${containerIds.length} sub-agents`,
        data: { containers: containerIds, roles: requiredRoles },
      });

      // Send task assignments to sub-agents
      await this.sendTaskAssignments(task);

      elizaLogger.info(`Task assigned successfully: ${taskId}`);
    } catch (error) {
      task.status = 'failed';
      task.timeline.push({
        timestamp: new Date(),
        type: 'failed',
        message: `Assignment failed: ${error instanceof Error ? error.message : String(error)}`,
        data: { error: error instanceof Error ? error.message : String(error) },
      });
      elizaLogger.error(`Failed to assign task ${taskId}:`, error);
      throw error;
    }
  }

  async updateTaskStatus(
    taskId: UUID,
    status: AutoCodingTask['status'],
    data?: any
  ): Promise<void> {
    const task = this.tasks.get(taskId);
    if (!task) {
      throw new Error(`Task not found: ${taskId}`);
    }

    const previousStatus = task.status;
    task.status = status;
    task.updatedAt = new Date();
    task.timeline.push({
      timestamp: new Date(),
      type: status as any,
      message: `Status changed from ${previousStatus} to ${status}`,
      data,
    });

    elizaLogger.info(`Task ${taskId} status updated: ${previousStatus} -> ${status}`);

    // Handle status-specific logic
    switch (status) {
      case 'in_progress':
        await this.handleTaskStarted(task);
        break;
      case 'review':
        await this.handleTaskReview(task);
        break;
      case 'completed':
        await this.handleTaskCompleted(task);
        break;
      case 'failed':
        await this.handleTaskFailed(task);
        break;
      case 'cancelled':
        await this.handleTaskCancelled(task);
        break;
    }
  }

  async completeTask(taskId: UUID, result: TaskResult): Promise<void> {
    const task = this.tasks.get(taskId);
    if (!task) {
      throw new Error(`Task not found: ${taskId}`);
    }

    task.result = result;
    task.status = result.success ? 'completed' : 'failed';
    task.updatedAt = new Date();
    task.timeline.push({
      timestamp: new Date(),
      type: result.success ? 'completed' : 'failed',
      message: result.success ? 'Task completed successfully' : 'Task failed',
      data: { result },
    });

    // Cleanup containers
    await this.cleanupTaskContainers(task);

    elizaLogger.info(`Task ${taskId} ${result.success ? 'completed' : 'failed'}`);
  }

  async cancelTask(taskId: UUID, reason: string): Promise<void> {
    const task = this.tasks.get(taskId);
    if (!task) {
      throw new Error(`Task not found: ${taskId}`);
    }

    if (task.status === 'completed' || task.status === 'cancelled') {
      throw new Error(`Cannot cancel task in ${task.status} status`);
    }

    task.status = 'cancelled';
    task.updatedAt = new Date();
    task.timeline.push({
      timestamp: new Date(),
      type: 'cancelled',
      message: `Task cancelled: ${reason}`,
      data: { reason },
    });

    // Cleanup containers
    await this.cleanupTaskContainers(task);

    elizaLogger.info(`Task ${taskId} cancelled: ${reason}`);
  }

  async getTask(taskId: UUID): Promise<AutoCodingTask | null> {
    return this.tasks.get(taskId) || null;
  }

  async listTasks(filter?: {
    status?: AutoCodingTask['status'];
    priority?: AutoCodingTask['priority'];
    assignedTo?: UUID;
  }): Promise<AutoCodingTask[]> {
    let tasks = Array.from(this.tasks.values());

    if (filter) {
      if (filter.status) {
        tasks = tasks.filter((task) => task.status === filter.status);
      }
      if (filter.priority) {
        tasks = tasks.filter((task) => task.priority === filter.priority);
      }
      if (filter.assignedTo) {
        tasks = tasks.filter((task) => task.assignedAgents.includes(filter.assignedTo!));
      }
    }

    return tasks.sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());
  }

  private analyzeRequiredRoles(task: AutoCodingTask): ('coder' | 'reviewer' | 'tester')[] {
    const roles: ('coder' | 'reviewer' | 'tester')[] = ['coder']; // Always need a coder

    // Analyze requirements to determine additional roles
    const requirementsText = task.requirements.join(' ').toLowerCase();

    // Check if we need testing
    if (
      requirementsText.includes('test') ||
      requirementsText.includes('coverage') ||
      task.context.testSuites.length > 0
    ) {
      roles.push('tester');
    }

    // Always include reviewer for code quality
    roles.push('reviewer');

    return roles;
  }

  private async sendTaskAssignments(task: AutoCodingTask): Promise<void> {
    const assignmentMessage = {
      id: `assignment_${Date.now()}`,
      type: 'task_assignment' as const,
      from: this.runtime.agentId,
      to: '' as UUID, // Will be set for each container
      timestamp: Date.now(),
      data: {
        taskId: task.id,
        title: task.title,
        description: task.description,
        requirements: task.requirements,
        acceptanceCriteria: task.acceptanceCriteria,
        context: task.context,
        deadline: task.deadline?.getTime(),
      },
    };

    // Send to all task containers
    await this.communicationBridge.broadcastToTask(task.id, assignmentMessage);

    task.status = 'in_progress';
    task.timeline.push({
      timestamp: new Date(),
      type: 'started',
      message: 'Task assignments sent to sub-agents',
    });
  }

  private async handleTaskStarted(task: AutoCodingTask): Promise<void> {
    elizaLogger.info(`Task started: ${task.id}`);
    // Could implement task monitoring, timeouts, etc.
  }

  private async handleTaskReview(task: AutoCodingTask): Promise<void> {
    elizaLogger.info(`Task entered review: ${task.id}`);
    // Could trigger additional review processes
  }

  private async handleTaskCompleted(task: AutoCodingTask): Promise<void> {
    elizaLogger.info(`Task completed: ${task.id}`);
    await this.cleanupTaskContainers(task);
  }

  private async handleTaskFailed(task: AutoCodingTask): Promise<void> {
    elizaLogger.warn(`Task failed: ${task.id}`);
    await this.cleanupTaskContainers(task);
  }

  private async handleTaskCancelled(task: AutoCodingTask): Promise<void> {
    elizaLogger.info(`Task cancelled: ${task.id}`);
    await this.cleanupTaskContainers(task);
  }

  private async cleanupTaskContainers(task: AutoCodingTask): Promise<void> {
    if (task.assignedContainers.length > 0) {
      elizaLogger.info(
        `Cleaning up ${task.assignedContainers.length} containers for task ${task.id}`
      );

      for (const containerId of task.assignedContainers) {
        try {
          await this.orchestrator.terminateSubAgent(containerId, true);
        } catch (error) {
          elizaLogger.error(`Failed to cleanup container ${containerId}:`, error);
        }
      }

      task.assignedContainers = [];
    }
  }

  private queueTask(task: AutoCodingTask): void {
    // Insert task in priority order
    const insertIndex = this.activeTaskQueue.findIndex(
      (queuedTask) => this.comparePriority(task.priority, queuedTask.priority) > 0
    );

    if (insertIndex === -1) {
      this.activeTaskQueue.push(task);
    } else {
      this.activeTaskQueue.splice(insertIndex, 0, task);
    }

    elizaLogger.info(
      `Task queued: ${task.id} (position: ${insertIndex === -1 ? this.activeTaskQueue.length : insertIndex + 1})`
    );
  }

  private comparePriority(a: AutoCodingTask['priority'], b: AutoCodingTask['priority']): number {
    const priorities = { critical: 4, high: 3, medium: 2, low: 1 };
    return priorities[a] - priorities[b];
  }

  private startTaskQueueProcessor(): void {
    setInterval(async () => {
      if (!this.processingQueue && this.activeTaskQueue.length > 0) {
        this.processingQueue = true;

        try {
          const task = this.activeTaskQueue.shift();
          if (task && task.status === 'pending') {
            await this.assignTask(task.id);
          }
        } catch (error) {
          elizaLogger.error('Error processing task queue:', error);
        } finally {
          this.processingQueue = false;
        }
      }
    }, 5000); // Process queue every 5 seconds
  }

  private generateDefaultAcceptanceCriteria(requirements: string[]): string[] {
    return [
      'Code compiles without errors',
      'All existing tests pass',
      'New functionality is properly tested',
      'Code follows project style guidelines',
      'Documentation is updated as needed',
      'No security vulnerabilities introduced',
      'Performance impact is acceptable',
    ];
  }

  private completeTaskContext(partial: Partial<TaskContext>): TaskContext {
    return {
      repositoryPath: partial.repositoryPath || '/workspace',
      branchName: partial.branchName || `task-${Date.now()}`,
      baseBranch: partial.baseBranch || 'main',
      files: partial.files || []
      dependencies: partial.dependencies || []
      testSuites: partial.testSuites || ['test', 'spec'],
      environment: partial.environment || {},
      constraints: {
        maxDuration: 3600000, // 1 hour
        maxResources: {
          memory: 2 * 1024 * 1024 * 1024, // 2GB
          cpu: 2048, // 2 CPU shares
        },
        allowedOperations: ['read', 'write', 'execute', 'network'],
        securityLevel: 'medium',
        ...partial.constraints,
      },
    };
  }

  async getTaskMetrics(): Promise<{
    total: number;
    byStatus: Record<string, number>;
    byPriority: Record<string, number>;
    averageDuration: number;
    successRate: number;
  }> {
    const tasks = Array.from(this.tasks.values());
    const total = tasks.length;

    const byStatus: Record<string, number> = {};
    const byPriority: Record<string, number> = {};

    let totalDuration = 0;
    let completedTasks = 0;
    let successfulTasks = 0;

    for (const task of tasks) {
      byStatus[task.status] = (byStatus[task.status] || 0) + 1;
      byPriority[task.priority] = (byPriority[task.priority] || 0) + 1;

      if (task.status === 'completed' || task.status === 'failed') {
        completedTasks++;
        totalDuration += task.updatedAt.getTime() - task.createdAt.getTime();

        if (task.status === 'completed' && task.result?.success) {
          successfulTasks++;
        }
      }
    }

    return {
      total,
      byStatus,
      byPriority,
      averageDuration: completedTasks > 0 ? totalDuration / completedTasks : 0,
      successRate: completedTasks > 0 ? successfulTasks / completedTasks : 0,
    };
  }

  async stop(): Promise<void> {
    try {
      // Cancel all pending tasks
      const pendingTasks = Array.from(this.tasks.values()).filter(
        (task) =>
          task.status === 'pending' || task.status === 'assigned' || task.status === 'in_progress'
      );

      for (const task of pendingTasks) {
        await this.cancelTask(task.id, 'Service shutdown');
      }

      this.tasks.clear();
      this.activeTaskQueue = [];

      elizaLogger.info('TaskManager stopped');
    } catch (error) {
      elizaLogger.error('Error stopping TaskManager:', error);
      throw error;
    }
  }
}
