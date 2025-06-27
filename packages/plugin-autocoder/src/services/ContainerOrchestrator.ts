import { Service, elizaLogger } from '@elizaos/core';
import type { IAgentRuntime, UUID } from '@elizaos/core';
import type {
  IDockerService,
  ContainerCreateRequest,
  ContainerStatus,
  SubAgentConfig,
  TaskContext,
  ContainerEvent,
  NetworkConfig,
  SecurityConfig,
} from '../types/container.js';

interface OrchestrationRequest {
  taskId: UUID;
  agentRole: 'coder' | 'reviewer' | 'tester';
  requirements: string[];
  environment?: Record<string, string>;
  priority?: 'low' | 'medium' | 'high' | 'critical';
  timeoutMs?: number;
  resources?: {
    memory?: number;
    cpu?: number;
  };
}

interface ManagedContainer {
  containerId: string;
  agentConfig: SubAgentConfig;
  status: ContainerStatus;
  createdAt: Date;
  lastHealthCheck: Date;
  taskContext: TaskContext;
}

export class ContainerOrchestrator extends Service {
  static _serviceName = 'container-orchestrator';
  static serviceType = 'orchestration' as const;

  private dockerService: IDockerService | null = null;
  private managedContainers: Map<string, ManagedContainer> = new Map();
  private containersByTask: Map<UUID, string[]> = new Map();
  private nextPort = 8000; // Starting port for sub-agent communication
  private healthCheckInterval: NodeJS.Timeout | null = null;

  capabilityDescription = 'Orchestrates containerized sub-agents for auto-coding tasks';

  constructor(_runtime?: IAgentRuntime) {
    super(_runtime);
  }

  static async start(_runtime: IAgentRuntime): Promise<ContainerOrchestrator> {
    const service = new ContainerOrchestrator(_runtime);
    await service.initialize();
    elizaLogger.info('ContainerOrchestrator started successfully');
    return service;
  }

  private async initialize(): Promise<void> {
    try {
      // Get Docker service with retry logic
      let attempts = 0;
      const maxAttempts = 50; // Increase attempts

      while (attempts < maxAttempts) {
        this.dockerService = this.runtime?.getService('docker') as IDockerService | null;
        if (this.dockerService) {
          elizaLogger.debug(`Docker service found on attempt ${attempts + 1}`);
          break;
        }

        attempts++;
        if (attempts < maxAttempts) {
          elizaLogger.debug(
            `Docker service not ready, waiting... (attempt ${attempts}/${maxAttempts})`
          );
          await new Promise((resolve) => setTimeout(resolve, 200)); // Wait 200ms
        }
      }

      if (!this.dockerService) {
        elizaLogger.warn(
          'Docker service not available after retries - container features will be disabled'
        );
        // Don't throw error, just warn and continue without Docker
        return;
      }

      // Test Docker connection
      const isDockerAvailable = await this.dockerService.ping();
      if (!isDockerAvailable) {
        elizaLogger.warn(
          'Docker daemon is not running or accessible - container features will be disabled'
        );
        // Don't throw error, just warn and continue
        return;
      }

      // Setup event listeners
      (this.dockerService as any).addEventListener(this.handleContainerEvent.bind(this));

      // Start health check monitoring
      this.startHealthCheckMonitoring();

      // Cleanup any orphaned containers from previous runs
      await this.cleanupOrphanedContainers();

      elizaLogger.info('Container orchestration initialized');
    } catch (_error) {
      elizaLogger.error('Failed to initialize ContainerOrchestrator:', _error);
      throw _error;
    }
  }

  async spawnSubAgent(_request: OrchestrationRequest): Promise<string> {
    if (!this.dockerService) {
      throw new Error('Docker service not available - container features are disabled');
    }

    try {
      elizaLogger.info(
        `Spawning sub-agent for task ${_request.taskId} with role ${_request.agentRole}`
      );

      // Generate unique agent ID and ports
      const agentId = `${_request.taskId}-${_request.agentRole}-${Date.now()}` as UUID;
      const communicationPort = this.getNextAvailablePort();
      const healthPort = this.getNextAvailablePort();

      // Create task context
      const taskContext: TaskContext = {
        taskId: _request.taskId,
        description: `${_request.agentRole} agent for task ${_request.taskId}`,
        requirements: _request.requirements,
        acceptanceCriteria: this.generateAcceptanceCriteria(_request),
        timeoutMs: _request.timeoutMs || 3600000, // 1 hour default
        priority: _request.priority || 'medium',
        assignedAt: new Date(),
        deadline: _request.timeoutMs ? new Date(Date.now() + _request.timeoutMs) : undefined,
      };

      // Create sub-agent configuration
      const agentConfig: SubAgentConfig = {
        agentId,
        containerId: '', // Will be set after container creation
        agentName: `${_request.agentRole}-agent-${_request.taskId.slice(0, 8)}`,
        role: _request.agentRole,
        capabilities: this.getCapabilitiesForRole(_request.agentRole),
        communicationPort,
        healthPort,
        environment: {
          ...this.getBaseEnvironment(),
          ..._request.environment,
          TASK_ID: _request.taskId,
          AGENT_ROLE: _request.agentRole,
          PRIORITY: _request.priority || 'medium',
        },
        taskContext,
      };

      // Determine container image based on role (build if necessary)
      const image = await this.getImageForRole(_request.agentRole);

      // Create container request
      const containerRequest: ContainerCreateRequest = {
        name: agentConfig.agentName,
        image,
        agentConfig,
        networkConfig: this.getNetworkConfig(),
        securityConfig: this.getSecurityConfig(_request.agentRole),
      };

      // Create and start container
      const containerId = await this.dockerService.createContainer(containerRequest);
      agentConfig.containerId = containerId;

      await this.dockerService.startContainer(containerId);

      // Wait for container to be ready
      await this.waitForContainerReady(containerId, 60000); // 60 second timeout

      // Register managed container
      const managedContainer: ManagedContainer = {
        containerId,
        agentConfig,
        status: await this.dockerService.getContainerStatus(containerId),
        createdAt: new Date(),
        lastHealthCheck: new Date(),
        taskContext,
      };

      this.managedContainers.set(containerId, managedContainer);

      // Track containers by task
      if (!this.containersByTask.has(_request.taskId)) {
        this.containersByTask.set(_request.taskId, []);
      }
      this.containersByTask.get(_request.taskId)!.push(containerId);

      elizaLogger.info(`Sub-agent spawned successfully: ${agentId} (${containerId})`);
      return containerId;
    } catch (_error) {
      elizaLogger.error(`Failed to spawn sub-agent for task ${_request.taskId}:`, _error);
      throw _error;
    }
  }

  async terminateSubAgent(_containerId: string, graceful: boolean = true): Promise<void> {
    try {
      if (!this.dockerService) {
        throw new Error('Docker service not initialized');
      }

      const managedContainer = this.managedContainers.get(_containerId);
      if (!managedContainer) {
        elizaLogger.warn(`Container ${_containerId} not found in managed containers`);
        return;
      }

      elizaLogger.info(`Terminating sub-agent: ${managedContainer.agentConfig.agentName}`);

      if (graceful) {
        // Send shutdown signal and wait
        try {
          await this.dockerService.executeInContainer(_containerId, {
            command: ['kill', '-TERM', '1'],
          });

          // Wait for graceful shutdown
          await this.waitForContainerStop(_containerId, 30000);
        } catch (_error) {
          elizaLogger.warn(`Graceful shutdown failed for ${_containerId}, forcing stop:`, _error);
          await this.dockerService.stopContainer(_containerId, 10);
        }
      } else {
        await this.dockerService.stopContainer(_containerId, 5);
      }

      // Remove container
      await this.dockerService.removeContainer(_containerId, true);

      // Clean up tracking
      this.managedContainers.delete(_containerId);

      // Remove from task tracking
      const taskId = managedContainer.taskContext.taskId;
      const taskContainers = this.containersByTask.get(taskId);
      if (taskContainers) {
        const index = taskContainers.indexOf(_containerId);
        if (index > -1) {
          taskContainers.splice(index, 1);
          if (taskContainers.length === 0) {
            this.containersByTask.delete(taskId);
          }
        }
      }

      elizaLogger.info(`Sub-agent terminated: ${_containerId}`);
    } catch (_error) {
      elizaLogger.error(`Failed to terminate sub-agent ${_containerId}:`, _error);
      throw _error;
    }
  }

  async terminateTaskContainers(_taskId: UUID): Promise<void> {
    const containerIds = this.containersByTask.get(_taskId) || [];
    elizaLogger.info(`Terminating ${containerIds.length} containers for task ${_taskId}`);

    const terminationPromises = containerIds.map((containerId) =>
      this.terminateSubAgent(containerId, true).catch((error) => {
        elizaLogger.error(`Failed to terminate container ${containerId}:`, error);
      })
    );

    await Promise.all(terminationPromises);
    elizaLogger.info(`All containers terminated for task ${_taskId}`);
  }

  async getContainerStatus(_containerId: string): Promise<ContainerStatus | null> {
    try {
      if (!this.dockerService) {
        return null;
      }

      const managedContainer = this.managedContainers.get(_containerId);
      if (!managedContainer) {
        return null;
      }

      const status = await this.dockerService.getContainerStatus(_containerId);

      // Update managed container status
      managedContainer.status = status;

      return status;
    } catch (_error) {
      elizaLogger.error(`Failed to get status for container ${_containerId}:`, _error);
      return null;
    }
  }

  async listManagedContainers(): Promise<ManagedContainer[]> {
    return Array.from(this.managedContainers.values());
  }

  async getTaskContainers(_taskId: UUID): Promise<ManagedContainer[]> {
    const containerIds = this.containersByTask.get(_taskId) || [];
    return containerIds
      .map((id) => this.managedContainers.get(id))
      .filter((container): container is ManagedContainer => container !== undefined);
  }

  async executeInSubAgent(_containerId: string, command: string[]): Promise<any> {
    if (!this.dockerService) {
      throw new Error('Docker service not initialized');
    }

    const managedContainer = this.managedContainers.get(_containerId);
    if (!managedContainer) {
      throw new Error(`Container ${_containerId} not found`);
    }

    return await this.dockerService.executeInContainer(_containerId, {
      command,
      attachStdout: true,
      attachStderr: true,
      workingDir: '/workspace',
    });
  }

  private getNextAvailablePort(): number {
    return this.nextPort++;
  }

  private generateAcceptanceCriteria(_request: OrchestrationRequest): string[] {
    const baseCriteria = [
      'Code compiles without errors',
      'All existing tests pass',
      'New functionality is properly tested',
      'Code follows project style guidelines',
    ];

    const roleCriteria: Record<string, string[]> = {
      coder: [
        'Implementation matches requirements',
        'Code is well-documented',
        'Error handling is implemented',
      ],
      reviewer: [
        'Code review feedback is comprehensive',
        'Security considerations are addressed',
        'Performance implications are assessed',
      ],
      tester: [
        'Test coverage is adequate',
        'Edge cases are tested',
        'Integration tests are included',
      ],
    };

    return [...baseCriteria, ...(roleCriteria[_request.agentRole] || [])];
  }

  private getCapabilitiesForRole(role: 'coder' | 'reviewer' | 'tester'): string[] {
    const capabilities: Record<string, string[]> = {
      coder: [
        'code-generation',
        'file-editing',
        'git-operations',
        'package-management',
        'debugging',
      ],
      reviewer: [
        'code-analysis',
        'security-audit',
        'performance-analysis',
        'documentation-review',
        'test-assessment',
      ],
      tester: [
        'test-generation',
        'test-execution',
        'coverage-analysis',
        'integration-testing',
        'e2e-testing',
      ],
    };

    return capabilities[role] || [];
  }

  private async getImageForRole(_role: 'coder' | 'reviewer' | 'tester'): Promise<string> {
    if (!this.dockerService) {
      throw new Error('Docker service not initialized');
    }

    const images = {
      coder: 'elizaos/autocoder-agent:latest',
      reviewer: 'elizaos/review-agent:latest',
      tester: 'elizaos/test-agent:latest',
    };

    const imageName = images[_role];

    try {
      // Check if image exists locally
      const dockerImages = await this.dockerService.listImages();
      const imageExists = dockerImages.some(
        (img) => img.RepoTags && img.RepoTags.includes(imageName)
      );

      if (!imageExists) {
        elizaLogger.warn(`Image ${imageName} not found locally, attempting to build...`);
        await this.buildMissingImage(_role, imageName);
      }

      return imageName;
    } catch (_error) {
      elizaLogger.error(`Failed to check/build image for role ${_role}:`, _error);
      throw new Error(`Required Docker image not available: ${imageName}`);
    }
  }

  private async buildMissingImage(
    _role: 'coder' | 'reviewer' | 'tester',
    imageName: string
  ): Promise<void> {
    if (!this.dockerService) {
      throw new Error('Docker service not initialized');
    }

    try {
      elizaLogger.info(`Building missing Docker image: ${imageName}`);

      // Get the path to the Dockerfile
      const dockerfilePath = this.getDockerfilePathForRole(_role);

      // Build the image
      await this.dockerService.buildImage({
        name: imageName.split(':')[0],
        tag: imageName.split(':')[1] || 'latest',
        dockerfile: dockerfilePath,
        buildContext: '../../', // Build from project root
        buildArgs: {
          BUILD_DATE: new Date().toISOString(),
          VCS_REF: process.env.GIT_COMMIT || 'unknown',
        },
        labels: {
          'eliza.agent.role': _role,
          'eliza.image.type': 'sub-agent',
          'eliza.build.automated': 'true',
        },
      });

      elizaLogger.info(`Successfully built image: ${imageName}`);
    } catch (_error) {
      elizaLogger.error(`Failed to build image ${imageName}:`, _error);
      throw new Error(
        `Unable to build required Docker image: ${imageName}. Please run the build script manually.`
      );
    }
  }

  private getDockerfilePathForRole(role: 'coder' | 'reviewer' | 'tester'): string {
    const dockerfiles = {
      coder: 'packages/plugin-autocoder/docker/Dockerfile.autocoder-agent',
      reviewer: 'packages/plugin-autocoder/docker/Dockerfile.review-agent',
      tester: 'packages/plugin-autocoder/docker/Dockerfile.test-agent',
    };

    return dockerfiles[role];
  }

  private getBaseEnvironment(): Record<string, string> {
    return {
      NODE_ENV: 'production',
      ELIZA_LOG_LEVEL: 'info',
      WORKSPACE_PATH: '/workspace',
      AGENT_TYPE: 'sub-agent',
      COMMUNICATION_PROTOCOL: 'websocket',
    };
  }

  private getNetworkConfig(): NetworkConfig {
    return {
      name: 'eliza-network',
      isolated: false,
    };
  }

  private getSecurityConfig(role: 'coder' | 'reviewer' | 'tester'): SecurityConfig {
    const baseSecurity: SecurityConfig = {
      readOnlyRootfs: false, // Agents need to write files
      noNewPrivileges: true,
      capDrop: ['ALL'],
      capAdd: [], // Add specific capabilities as needed
      securityOpts: ['no-new-privileges:true'],
    };

    // Role-specific security adjustments
    if (role === 'coder') {
      // Coders need more file system access
      baseSecurity.capAdd = ['DAC_OVERRIDE'];
    }

    return baseSecurity;
  }

  private async waitForContainerReady(_containerId: string, timeoutMs: number): Promise<void> {
    if (!this.dockerService) {
      throw new Error('Docker service not initialized');
    }

    const startTime = Date.now();

    while (Date.now() - startTime < timeoutMs) {
      try {
        const status = await this.dockerService.getContainerStatus(_containerId);

        if (status.state === 'running' && status.health === 'healthy') {
          return;
        }

        if (status.state === 'error' || status.state === 'exited') {
          throw new Error(`Container failed to start: ${status.error || 'Unknown error'}`);
        }

        // Wait before next check
        await new Promise((resolve) => setTimeout(resolve, 2000));
      } catch (_error) {
        if (Date.now() - startTime >= timeoutMs) {
          throw new Error(
            `Container failed to become ready within ${timeoutMs}ms: ${_error instanceof Error ? _error.message : String(_error)}`
          );
        }
        await new Promise((resolve) => setTimeout(resolve, 1000));
      }
    }

    throw new Error(`Container did not become ready within ${timeoutMs}ms`);
  }

  private async waitForContainerStop(_containerId: string, timeoutMs: number): Promise<void> {
    if (!this.dockerService) {
      throw new Error('Docker service not initialized');
    }

    const startTime = Date.now();

    while (Date.now() - startTime < timeoutMs) {
      try {
        const status = await this.dockerService.getContainerStatus(_containerId);

        if (status.state === 'stopped' || status.state === 'exited') {
          return;
        }

        await new Promise((resolve) => setTimeout(resolve, 1000));
      } catch (_error) {
        // If we can't get status, container might be stopped
        return;
      }
    }

    throw new Error(`Container did not stop within ${timeoutMs}ms`);
  }

  private handleContainerEvent(event: ContainerEvent): void {
    const managedContainer = this.managedContainers.get(event.containerId);
    if (!managedContainer) {
      return; // Not our container
    }

    elizaLogger.info(
      `Container event for ${managedContainer.agentConfig.agentName}: ${event.type}`
    );

    switch (event.type) {
      case 'die':
      case 'destroy':
        // Container died unexpectedly
        if (managedContainer.status.state === 'running') {
          elizaLogger.warn(`Unexpected container termination: ${event.containerId}`);
          this.handleUnexpectedTermination(event.containerId);
        }
        break;

      case 'health_status':
        if (event.data?.health_status === 'unhealthy') {
          elizaLogger.warn(`Container health check failed: ${event.containerId}`);
          this.handleUnhealthyContainer(event.containerId);
        }
        break;
    }
  }

  private async handleUnexpectedTermination(_containerId: string): Promise<void> {
    const managedContainer = this.managedContainers.get(_containerId);
    if (!managedContainer) {
      return;
    }

    elizaLogger.warn(
      `Handling unexpected termination for ${managedContainer.agentConfig.agentName}`
    );

    // Update status
    managedContainer.status.state = 'error';
    managedContainer.status.error = 'Unexpected termination';

    // TODO: Implement restart logic if needed
    // For now, just log and clean up
    this.managedContainers.delete(_containerId);
  }

  private async handleUnhealthyContainer(_containerId: string): Promise<void> {
    const managedContainer = this.managedContainers.get(_containerId);
    if (!managedContainer) {
      return;
    }

    elizaLogger.warn(`Handling unhealthy container: ${managedContainer.agentConfig.agentName}`);

    // TODO: Implement recovery logic
    // Could restart container, notify task manager, etc.
  }

  private startHealthCheckMonitoring(): void {
    this.healthCheckInterval = setInterval(async () => {
      if (!this.dockerService) {
        return;
      }

      for (const [containerId, managedContainer] of Array.from(this.managedContainers.entries())) {
        try {
          const status = await this.dockerService.getContainerStatus(containerId);
          managedContainer.status = status;
          managedContainer.lastHealthCheck = new Date();

          // Check if container has been running too long (task timeout)
          if (
            managedContainer.taskContext.deadline &&
            new Date() > managedContainer.taskContext.deadline
          ) {
            elizaLogger.warn(`Task timeout exceeded for container ${containerId}, terminating`);
            await this.terminateSubAgent(containerId, false);
          }
        } catch (_error) {
          elizaLogger.error(`Health check failed for container ${containerId}:`, _error);
        }
      }
    }, 30000); // Check every 30 seconds
  }

  private async cleanupOrphanedContainers(): Promise<void> {
    if (!this.dockerService) {
      return;
    }

    try {
      const containers = await this.dockerService.listContainers({
        label: 'eliza.container.type=sub-agent',
      });

      elizaLogger.info(`Found ${containers.length} existing sub-agent containers`);

      for (const container of containers) {
        if (container.state !== 'running') {
          elizaLogger.info(`Cleaning up orphaned container: ${container.id}`);
          await this.dockerService.removeContainer(container.id, true);
        }
      }
    } catch (_error) {
      elizaLogger.warn('Failed to cleanup orphaned containers:', _error);
    }
  }

  async stop(): Promise<void> {
    try {
      // Stop health check monitoring
      if (this.healthCheckInterval) {
        clearInterval(this.healthCheckInterval);
        this.healthCheckInterval = null;
      }

      // Terminate all managed containers
      const containerIds = Array.from(this.managedContainers.keys());
      elizaLogger.info(`Stopping ${containerIds.length} managed containers`);

      const terminationPromises = containerIds.map((containerId) =>
        this.terminateSubAgent(containerId, false).catch((error) => {
          elizaLogger.error(`Failed to terminate container ${containerId} during shutdown:`, error);
        })
      );

      await Promise.all(terminationPromises);

      this.managedContainers.clear();
      this.containersByTask.clear();

      elizaLogger.info('ContainerOrchestrator stopped');
    } catch (_error) {
      elizaLogger.error('Error stopping ContainerOrchestrator:', _error);
      throw _error;
    }
  }
}
