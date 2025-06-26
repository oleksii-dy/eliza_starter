/**
 * External Agent Registration API and Security Isolation
 * Allows external agents to register and participate in ElizaOS benchmarks
 * Provides secure sandboxing and resource management for untrusted agents
 */

import { logger } from '@elizaos/core';
import { EventEmitter } from 'events';
import { ProductionCostTracker } from './ProductionCostTracker.js';

export interface ExternalAgent {
  id: string;
  name: string;
  version: string;
  description: string;
  developer: {
    name: string;
    email: string;
    organization?: string;
    verified: boolean;
  };
  capabilities: AgentCapability[];
  securityProfile: SecurityProfile;
  resourceLimits: ResourceLimits;
  status: 'pending' | 'approved' | 'active' | 'suspended' | 'banned';
  registeredAt: number;
  lastActive?: number;
  benchmarkHistory: BenchmarkParticipation[];
  metadata: Record<string, any>;
}

export interface AgentCapability {
  type: 'defi' | 'ecommerce' | 'social' | 'api' | 'reasoning' | 'planning' | 'custom';
  name: string;
  description: string;
  version: string;
  verified: boolean;
  riskLevel: 'low' | 'medium' | 'high';
  requirements: string[];
}

export interface SecurityProfile {
  isolation: 'sandboxed' | 'containerized' | 'process' | 'vm';
  networkAccess: {
    allowedDomains: string[];
    blockedDomains: string[];
    requireHttps: boolean;
    rateLimits: {
      requestsPerSecond: number;
      requestsPerHour: number;
      dataTransferMB: number;
    };
  };
  fileSystem: {
    readAccess: string[];
    writeAccess: string[];
    maxFileSize: number;
    totalStorage: number;
  };
  apiAccess: {
    allowedApis: string[];
    maxConcurrentCalls: number;
    timeoutMs: number;
  };
  monitoring: {
    logLevel: 'none' | 'basic' | 'detailed' | 'full';
    auditTrail: boolean;
    realTimeMonitoring: boolean;
  };
}

export interface ResourceLimits {
  execution: {
    maxCpuUsage: number; // percentage
    maxMemoryMB: number;
    maxExecutionTime: number; // milliseconds
    maxConcurrentTasks: number;
  };
  budget: {
    maxHourlySpend: number; // USD
    maxDailySpend: number; // USD
    maxTotalSpend: number; // USD
    requirePreApproval: boolean;
  };
  benchmarks: {
    maxSimultaneous: number;
    maxPerDay: number;
    maxPerMonth: number;
    cooldownMinutes: number;
  };
}

export interface BenchmarkParticipation {
  benchmarkId: string;
  participatedAt: number;
  score: number;
  rank: number;
  totalParticipants: number;
  costs: number;
  duration: number;
  success: boolean;
  issues?: string[];
}

export interface RegistrationRequest {
  agentInfo: {
    name: string;
    version: string;
    description: string;
    sourceUrl?: string;
    documentation?: string;
  };
  developer: {
    name: string;
    email: string;
    organization?: string;
    githubProfile?: string;
    linkedinProfile?: string;
  };
  capabilities: Omit<AgentCapability, 'verified'>[];
  requestedAccess: {
    benchmarkTypes: string[];
    maxBudget: number;
    requiredApis: string[];
  };
  compliance: {
    agreeToTerms: boolean;
    dataProcessingConsent: boolean;
    riskAcknowledgment: boolean;
    jurisdictionConsent: string[];
  };
  verificationData: {
    sourceCodeHash?: string;
    attestationSignature?: string;
    securityAuditReport?: string;
  };
}

export interface IsolationContainer {
  id: string;
  agentId: string;
  type: 'docker' | 'vm' | 'process' | 'sandbox';
  status: 'creating' | 'running' | 'stopped' | 'failed';
  createdAt: number;
  resources: {
    cpuLimit: number;
    memoryLimit: number;
    networkAccess: boolean;
    fileSystemAccess: string[];
  };
  monitoring: {
    cpuUsage: number;
    memoryUsage: number;
    networkTraffic: {
      inbound: number;
      outbound: number;
    };
    apiCalls: number;
    violations: SecurityViolation[];
  };
}

export interface SecurityViolation {
  type: 'resource_limit' | 'network_access' | 'api_abuse' | 'file_access' | 'malicious_behavior';
  severity: 'low' | 'medium' | 'high' | 'critical';
  timestamp: number;
  description: string;
  details: Record<string, any>;
  action: 'logged' | 'throttled' | 'blocked' | 'suspended';
}

export class ExternalAgentAPI extends EventEmitter {
  private registeredAgents: Map<string, ExternalAgent> = new Map();
  private isolationContainers: Map<string, IsolationContainer> = new Map();
  private securityMonitor: SecurityMonitor;
  private benchmarkQueue: BenchmarkQueue;
  // private _apiServer: any; // Express server instance

  constructor(_costTracker: ProductionCostTracker) {
    super();
    // costTracker initialization handled elsewhere
    this.securityMonitor = new SecurityMonitor();
    this.benchmarkQueue = new BenchmarkQueue();
    this.initializeAPI();
  }

  /**
   * Initialize the external agent API server
   */
  private initializeAPI(): void {
    // API routes will be mounted on the main ElizaOS server
    this.setupAPIRoutes();
    logger.info('External Agent API initialized');
  }

  /**
   * Register a new external agent
   */
  async registerAgent(request: RegistrationRequest): Promise<string> {
    // Validate registration request
    this.validateRegistrationRequest(request);

    // Generate agent ID
    const agentId = `ext-${Date.now()}-${Math.random().toString(36).substr(2, 8)}`;

    // Create agent profile with default security settings
    const agent: ExternalAgent = {
      id: agentId,
      name: request.agentInfo.name,
      version: request.agentInfo.version,
      description: request.agentInfo.description,
      developer: {
        ...request.developer,
        verified: false, // Requires manual verification
      },
      capabilities: request.capabilities.map((cap) => ({
        ...cap,
        verified: false, // Requires testing
      })),
      securityProfile: this.createDefaultSecurityProfile(request),
      resourceLimits: this.createDefaultResourceLimits(request),
      status: 'pending',
      registeredAt: Date.now(),
      benchmarkHistory: [],
      metadata: {
        sourceUrl: request.agentInfo.sourceUrl,
        documentation: request.agentInfo.documentation,
        compliance: request.compliance,
        verification: request.verificationData,
      },
    };

    this.registeredAgents.set(agentId, agent);

    // Start approval process
    await this.initiateApprovalProcess(agent);

    logger.info(`External agent registered: ${agentId} (${agent.name})`);
    this.emit('agent_registered', { agentId, agent });

    return agentId;
  }

  /**
   * Approve an external agent for benchmark participation
   */
  async approveAgent(
    agentId: string,
    approvalData: {
      approvedBy: string;
      securityReview: boolean;
      capabilityTesting: boolean;
      notes?: string;
    }
  ): Promise<void> {
    const agent = this.registeredAgents.get(agentId);
    if (!agent) {
      throw new Error(`Agent ${agentId} not found`);
    }

    if (agent.status !== 'pending') {
      throw new Error(`Agent ${agentId} is not pending approval (status: ${agent.status})`);
    }

    // Update agent status
    agent.status = 'approved';
    agent.metadata.approval = {
      ...approvalData,
      approvedAt: Date.now(),
    };

    // Mark verified capabilities
    if (approvalData.capabilityTesting) {
      agent.capabilities.forEach((cap) => {
        cap.verified = true;
      });
    }

    logger.info(`External agent approved: ${agentId}`);
    this.emit('agent_approved', { agentId, agent });
  }

  /**
   * Create an isolated execution environment for an external agent
   */
  async createIsolationContainer(agentId: string): Promise<string> {
    const agent = this.registeredAgents.get(agentId);
    if (!agent) {
      throw new Error(`Agent ${agentId} not found`);
    }

    if (agent.status !== 'approved' && agent.status !== 'active') {
      throw new Error(`Agent ${agentId} is not approved for execution`);
    }

    const containerId = `container-${agentId}-${Date.now()}`;

    const container: IsolationContainer = {
      id: containerId,
      agentId,
      type: this.determineContainerType(agent.securityProfile.isolation),
      status: 'creating',
      createdAt: Date.now(),
      resources: {
        cpuLimit: agent.resourceLimits.execution.maxCpuUsage,
        memoryLimit: agent.resourceLimits.execution.maxMemoryMB,
        networkAccess: agent.securityProfile.networkAccess.allowedDomains.length > 0,
        fileSystemAccess: agent.securityProfile.fileSystem.readAccess,
      },
      monitoring: {
        cpuUsage: 0,
        memoryUsage: 0,
        networkTraffic: { inbound: 0, outbound: 0 },
        apiCalls: 0,
        violations: [],
      },
    };

    this.isolationContainers.set(containerId, container);

    try {
      // Create the actual container based on type
      await this.provisionContainer(container, agent);
      container.status = 'running';

      // Start monitoring
      this.securityMonitor.startMonitoring(container, agent);

      logger.info(`Isolation container created: ${containerId} for agent ${agentId}`);
      return containerId;
    } catch (error) {
      container.status = 'failed';
      logger.error(`Failed to create container for agent ${agentId}:`, error);
      throw error;
    }
  }

  /**
   * Execute a benchmark with an external agent
   */
  async executeBenchmark(
    agentId: string,
    benchmarkId: string,
    parameters: Record<string, any>
  ): Promise<string> {
    const agent = this.registeredAgents.get(agentId);
    if (!agent) {
      throw new Error(`Agent ${agentId} not found`);
    }

    // Security and resource checks
    await this.validateBenchmarkExecution(agent, benchmarkId, parameters);

    // Create isolation container
    const containerId = await this.createIsolationContainer(agentId);

    // Queue benchmark execution
    const executionId = await this.benchmarkQueue.queueExecution({
      agentId,
      benchmarkId,
      containerId,
      parameters,
      maxDuration: agent.resourceLimits.execution.maxExecutionTime,
      maxBudget: Math.min(parameters.budget || 0, agent.resourceLimits.budget.maxHourlySpend),
    });

    logger.info(`Benchmark execution queued: ${executionId} for agent ${agentId}`);
    return executionId;
  }

  /**
   * Get agent information
   */
  getAgent(agentId: string): ExternalAgent | undefined {
    return this.registeredAgents.get(agentId);
  }

  /**
   * List all registered agents
   */
  listAgents(filters?: {
    status?: ExternalAgent['status'];
    capability?: string;
    developer?: string;
  }): ExternalAgent[] {
    let agents = Array.from(this.registeredAgents.values());

    if (filters) {
      if (filters.status) {
        agents = agents.filter((agent) => agent.status === filters.status);
      }
      if (filters.capability) {
        agents = agents.filter((agent) =>
          agent.capabilities.some((cap) => cap.type === filters.capability)
        );
      }
      if (filters.developer) {
        agents = agents.filter((agent) =>
          agent.developer.name.toLowerCase().includes(filters.developer!.toLowerCase())
        );
      }
    }

    return agents;
  }

  /**
   * Suspend an agent for violations
   */
  async suspendAgent(agentId: string, reason: string, duration?: number): Promise<void> {
    const agent = this.registeredAgents.get(agentId);
    if (!agent) {
      throw new Error(`Agent ${agentId} not found`);
    }

    agent.status = 'suspended';
    agent.metadata.suspension = {
      reason,
      suspendedAt: Date.now(),
      duration,
      suspendedBy: 'system',
    };

    // Stop all containers for this agent
    await this.stopAgentContainers(agentId);

    logger.warn(`Agent suspended: ${agentId} - ${reason}`);
    this.emit('agent_suspended', { agentId, reason });
  }

  /**
   * Setup API routes
   */
  private setupAPIRoutes(): void {
    // These routes would be mounted on the main server
    const routes = [
      {
        path: '/api/external-agents/register',
        method: 'POST',
        handler: this.handleRegistration.bind(this),
      },
      {
        path: '/api/external-agents/:agentId',
        method: 'GET',
        handler: this.handleGetAgent.bind(this),
      },
      {
        path: '/api/external-agents',
        method: 'GET',
        handler: this.handleListAgents.bind(this),
      },
      {
        path: '/api/external-agents/:agentId/benchmarks',
        method: 'POST',
        handler: this.handleBenchmarkExecution.bind(this),
      },
      {
        path: '/api/external-agents/:agentId/status',
        method: 'PATCH',
        handler: this.handleStatusUpdate.bind(this),
      },
    ];

    // Store routes for mounting by main server
    (this as any).routes = routes;
  }

  private async handleRegistration(req: any, res: any): Promise<void> {
    try {
      const agentId = await this.registerAgent(req.body);
      res.json({ success: true, agentId });
    } catch (error) {
      res.status(400).json({
        success: false,
        error: error instanceof Error ? error.message : 'Registration failed',
      });
    }
  }

  private async handleGetAgent(req: any, res: any): Promise<void> {
    const agent = this.getAgent(req.params.agentId);
    if (!agent) {
      res.status(404).json({ success: false, error: 'Agent not found' });
      return;
    }
    res.json({ success: true, agent });
  }

  private async handleListAgents(req: any, res: any): Promise<void> {
    const agents = this.listAgents(req.query);
    res.json({ success: true, agents });
  }

  private async handleBenchmarkExecution(req: any, res: any): Promise<void> {
    try {
      const executionId = await this.executeBenchmark(
        req.params.agentId,
        req.body.benchmarkId,
        req.body.parameters
      );
      res.json({ success: true, executionId });
    } catch (error) {
      res.status(400).json({
        success: false,
        error: error instanceof Error ? error.message : 'Execution failed',
      });
    }
  }

  private async handleStatusUpdate(req: any, res: any): Promise<void> {
    try {
      const { action, reason, duration } = req.body;

      if (action === 'suspend') {
        await this.suspendAgent(req.params.agentId, reason, duration);
      } else if (action === 'approve') {
        await this.approveAgent(req.params.agentId, req.body.approvalData);
      }

      res.json({ success: true });
    } catch (error) {
      res.status(400).json({
        success: false,
        error: error instanceof Error ? error.message : 'Status update failed',
      });
    }
  }

  // Helper methods
  private validateRegistrationRequest(request: RegistrationRequest): void {
    if (!request.agentInfo?.name || !request.agentInfo?.version) {
      throw new Error('Agent name and version are required');
    }
    if (!request.developer?.name || !request.developer?.email) {
      throw new Error('Developer name and email are required');
    }
    if (!request.compliance?.agreeToTerms) {
      throw new Error('Must agree to terms of service');
    }
  }

  private createDefaultSecurityProfile(request: RegistrationRequest): SecurityProfile {
    return {
      isolation: 'sandboxed',
      networkAccess: {
        allowedDomains: ['api.openai.com', 'api.anthropic.com'], // Basic AI APIs
        blockedDomains: [],
        requireHttps: true,
        rateLimits: {
          requestsPerSecond: 10,
          requestsPerHour: 1000,
          dataTransferMB: 100,
        },
      },
      fileSystem: {
        readAccess: ['/tmp', '/var/tmp'],
        writeAccess: ['/tmp'],
        maxFileSize: 10 * 1024 * 1024, // 10MB
        totalStorage: 100 * 1024 * 1024, // 100MB
      },
      apiAccess: {
        allowedApis: request.requestedAccess.requiredApis,
        maxConcurrentCalls: 5,
        timeoutMs: 30000,
      },
      monitoring: {
        logLevel: 'detailed',
        auditTrail: true,
        realTimeMonitoring: true,
      },
    };
  }

  private createDefaultResourceLimits(request: RegistrationRequest): ResourceLimits {
    return {
      execution: {
        maxCpuUsage: 50, // 50%
        maxMemoryMB: 512,
        maxExecutionTime: 300000, // 5 minutes
        maxConcurrentTasks: 2,
      },
      budget: {
        maxHourlySpend: Math.min(request.requestedAccess.maxBudget, 100),
        maxDailySpend: Math.min(request.requestedAccess.maxBudget * 8, 500),
        maxTotalSpend: Math.min(request.requestedAccess.maxBudget * 24, 1000),
        requirePreApproval: request.requestedAccess.maxBudget > 500,
      },
      benchmarks: {
        maxSimultaneous: 1,
        maxPerDay: 10,
        maxPerMonth: 100,
        cooldownMinutes: 15,
      },
    };
  }

  private async initiateApprovalProcess(agent: ExternalAgent): Promise<void> {
    // In a real implementation, this would trigger:
    // 1. Security review
    // 2. Capability testing
    // 3. Manual approval workflow
    logger.info(`Initiated approval process for agent ${agent.id}`);
  }

  private determineContainerType(
    isolation: SecurityProfile['isolation']
  ): IsolationContainer['type'] {
    const mapping = {
      sandboxed: 'sandbox' as const,
      containerized: 'docker' as const,
      process: 'process' as const,
      vm: 'vm' as const,
    };
    return mapping[isolation] || 'sandbox';
  }

  private async provisionContainer(
    container: IsolationContainer,
    _agent: ExternalAgent
  ): Promise<void> {
    // Implementation would depend on container type
    // For now, simulate container creation
    logger.info(`Provisioning ${container.type} container ${container.id}`);
    await new Promise((resolve) => setTimeout(resolve, 1000)); // Simulate creation time
  }

  private async validateBenchmarkExecution(
    _agent: ExternalAgent,
    _benchmarkId: string,
    _parameters: Record<string, any>
  ): Promise<void> {
    // Check agent status
    if (_agent.status !== 'approved' && _agent.status !== 'active') {
      throw new Error(`Agent ${_agent.id} is not approved for benchmark execution`);
    }

    // Check resource limits
    const currentBudget = _parameters.budget || 0;
    if (currentBudget > _agent.resourceLimits.budget.maxHourlySpend) {
      throw new Error('Requested budget exceeds hourly limit');
    }

    // Check concurrent execution limits
    const activeContainers = Array.from(this.isolationContainers.values()).filter(
      (c) => c.agentId === _agent.id && c.status === 'running'
    );

    if (activeContainers.length >= _agent.resourceLimits.execution.maxConcurrentTasks) {
      throw new Error('Agent has reached maximum concurrent execution limit');
    }
  }

  private async stopAgentContainers(agentId: string): Promise<void> {
    const agentContainers = Array.from(this.isolationContainers.values()).filter(
      (c) => c.agentId === agentId && c.status === 'running'
    );

    for (const container of agentContainers) {
      container.status = 'stopped';
      this.securityMonitor.stopMonitoring(container.id);
    }

    logger.info(`Stopped ${agentContainers.length} containers for agent ${agentId}`);
  }
}

/**
 * Security monitoring for external agents
 */
class SecurityMonitor {
  private monitoredContainers: Map<string, NodeJS.Timeout> = new Map();

  startMonitoring(container: IsolationContainer, agent: ExternalAgent): void {
    const interval = setInterval(() => {
      this.checkViolations(container, agent);
    }, 5000); // Check every 5 seconds

    this.monitoredContainers.set(container.id, interval);
    logger.info(`Started monitoring container ${container.id}`);
  }

  stopMonitoring(containerId: string): void {
    const interval = this.monitoredContainers.get(containerId);
    if (interval) {
      clearInterval(interval);
      this.monitoredContainers.delete(containerId);
      logger.info(`Stopped monitoring container ${containerId}`);
    }
  }

  private checkViolations(container: IsolationContainer, _agent: ExternalAgent): void {
    // Simulate monitoring checks
    // In real implementation, this would check actual resource usage

    // Check CPU usage
    if (container.monitoring.cpuUsage > container.resources.cpuLimit) {
      this.recordViolation(container, {
        type: 'resource_limit',
        severity: 'medium',
        description: `CPU usage ${container.monitoring.cpuUsage}% exceeds limit ${container.resources.cpuLimit}%`,
        action: 'throttled',
      });
    }

    // Check memory usage
    if (container.monitoring.memoryUsage > container.resources.memoryLimit) {
      this.recordViolation(container, {
        type: 'resource_limit',
        severity: 'high',
        description: `Memory usage ${container.monitoring.memoryUsage}MB exceeds limit ${container.resources.memoryLimit}MB`,
        action: 'blocked',
      });
    }
  }

  private recordViolation(
    container: IsolationContainer,
    violation: Omit<SecurityViolation, 'timestamp' | 'details'>
  ): void {
    const fullViolation: SecurityViolation = {
      ...violation,
      timestamp: Date.now(),
      details: { containerId: container.id, agentId: container.agentId },
    };

    container.monitoring.violations.push(fullViolation);
    logger.warn(`Security violation recorded for container ${container.id}:`, violation);
  }
}

/**
 * Benchmark execution queue
 */
class BenchmarkQueue {
  private queue: Array<{
    id: string;
    agentId: string;
    benchmarkId: string;
    containerId: string;
    parameters: Record<string, any>;
    maxDuration: number;
    maxBudget: number;
    queuedAt: number;
  }> = [];

  async queueExecution(execution: {
    agentId: string;
    benchmarkId: string;
    containerId: string;
    parameters: Record<string, any>;
    maxDuration: number;
    maxBudget: number;
  }): Promise<string> {
    const executionId = `exec-${Date.now()}-${Math.random().toString(36).substr(2, 8)}`;

    this.queue.push({
      id: executionId,
      ...execution,
      queuedAt: Date.now(),
    });

    logger.info(`Queued benchmark execution: ${executionId}`);
    return executionId;
  }
}

// Global instance for benchmark use
export const externalAgentAPI = new ExternalAgentAPI(new ProductionCostTracker());
