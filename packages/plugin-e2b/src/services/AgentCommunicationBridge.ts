import { Service, elizaLogger, type IAgentRuntime, type Memory, type UUID } from '@elizaos/core';
import { EventEmitter } from 'events';

export interface AgentMessage {
  id: string;
  timestamp: number;
  fromAgentId: UUID;
  toAgentId: UUID;
  messageType: 'task_assignment' | 'status_update' | 'result_report' | 'error_report' | 'coordination' | 'feedback';
  content: {
    text?: string;
    data?: any;
    metadata?: any;
  };
  workflowId?: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  requiresResponse?: boolean;
}

export interface AgentConnection {
  agentId: UUID;
  runtime: IAgentRuntime;
  sandboxId?: string;
  role: 'orchestrator' | 'coder' | 'reviewer' | 'observer';
  status: 'connected' | 'busy' | 'idle' | 'offline';
  capabilities: string[];
  lastSeen: Date;
}

export interface WorkflowCoordination {
  workflowId: string;
  orchestratorId: UUID;
  participantIds: UUID[];
  currentPhase: string;
  status: 'initializing' | 'active' | 'paused' | 'completed' | 'failed';
  metadata: any;
  createdAt: Date;
  updatedAt: Date;
}

export class AgentCommunicationBridge extends Service {
  static serviceName = 'agent-communication-bridge';

  private eventEmitter: EventEmitter;
  private connections: Map<UUID, AgentConnection> = new Map();
  private messageQueue: Map<UUID, AgentMessage[]> = new Map();
  private workflows: Map<string, WorkflowCoordination> = new Map();
  private messageHandlers: Map<string, (message: AgentMessage) => Promise<void>> = new Map();

  constructor(runtime: IAgentRuntime) {
    super(runtime);
    this.eventEmitter = new EventEmitter();
    this.setupEventHandlers();
  }

  get capabilityDescription(): string {
    return 'Provides agent-to-agent communication and coordination capabilities for multi-agent workflows';
  }

  static async start(runtime: IAgentRuntime): Promise<AgentCommunicationBridge> {
    const service = new AgentCommunicationBridge(runtime);
    await service.initialize();
    return service;
  }

  async initialize(): Promise<void> {
    elizaLogger.info('Initializing Agent Communication Bridge');

    // Register this agent in the bridge
    await this.registerAgent(this.runtime.agentId, this.runtime, {
      role: 'orchestrator',
      capabilities: ['coordination', 'workflow_management', 'github_integration']
    });

    elizaLogger.info('Agent Communication Bridge initialized successfully');
  }

  async stop(): Promise<void> {
    elizaLogger.info('Stopping Agent Communication Bridge');

    // Notify all connected agents about shutdown
    for (const [agentId, _connection] of this.connections) {
      try {
        await this.sendMessage({
          fromAgentId: this.runtime.agentId,
          toAgentId: agentId,
          messageType: 'coordination',
          content: {
            text: 'Communication bridge shutting down',
            data: { event: 'bridge_shutdown' }
          },
          priority: 'high'
        });
      } catch (error) {
        elizaLogger.warn('Failed to notify agent of shutdown', { agentId, error: error.message });
      }
    }

    this.connections.clear();
    this.messageQueue.clear();
    this.workflows.clear();
    this.eventEmitter.removeAllListeners();

    elizaLogger.info('Agent Communication Bridge stopped');
  }

  private setupEventHandlers(): void {
    this.eventEmitter.on('agent_connected', (agentId: UUID) => {
      elizaLogger.info('Agent connected to bridge', { agentId });
    });

    this.eventEmitter.on('agent_disconnected', (agentId: UUID) => {
      elizaLogger.info('Agent disconnected from bridge', { agentId });
    });

    this.eventEmitter.on('message_received', (message: AgentMessage) => {
      elizaLogger.debug('Message received on bridge', {
        from: message.fromAgentId,
        to: message.toAgentId,
        type: message.messageType
      });
    });

    this.eventEmitter.on('workflow_status_changed', (workflowId: string, status: string) => {
      elizaLogger.info('Workflow status changed', { workflowId, status });
    });
  }

  /**
   * Register an agent with the communication bridge
   */
  async registerAgent(
    agentId: UUID,
    runtime: IAgentRuntime,
    options: {
      role: 'orchestrator' | 'coder' | 'reviewer' | 'observer';
      capabilities: string[];
      sandboxId?: string;
    }
  ): Promise<void> {
    elizaLogger.info('Registering agent with communication bridge', { agentId, role: options.role });

    const connection: AgentConnection = {
      agentId,
      runtime,
      sandboxId: options.sandboxId,
      role: options.role,
      status: 'connected',
      capabilities: options.capabilities,
      lastSeen: new Date()
    };

    this.connections.set(agentId, connection);

    // Initialize message queue for this agent
    if (!this.messageQueue.has(agentId)) {
      this.messageQueue.set(agentId, []);
    }

    this.eventEmitter.emit('agent_connected', agentId);

    // Send welcome message
    if (agentId !== this.runtime.agentId) {
      await this.sendMessage({
        fromAgentId: this.runtime.agentId,
        toAgentId: agentId,
        messageType: 'coordination',
        content: {
          text: 'Welcome to the communication bridge',
          data: {
            event: 'agent_registered',
            bridgeCapabilities: ['message_routing', 'workflow_coordination', 'status_tracking'],
            connectedAgents: Array.from(this.connections.keys()).length
          }
        },
        priority: 'medium'
      });
    }
  }

  /**
   * Send a message to another agent
   */
  async sendMessage(messageData: Omit<AgentMessage, 'id' | 'timestamp'>): Promise<string> {
    const message: AgentMessage = {
      id: `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      timestamp: Date.now(),
      ...messageData
    };

    elizaLogger.debug('Sending message through bridge', {
      messageId: message.id,
      from: message.fromAgentId,
      to: message.toAgentId,
      type: message.messageType
    });

    // Check if target agent is connected
    const targetConnection = this.connections.get(message.toAgentId);
    if (!targetConnection) {
      elizaLogger.warn('Target agent not connected, queuing message', {
        targetAgentId: message.toAgentId,
        messageId: message.id
      });

      // Queue message for when agent connects
      const queue = this.messageQueue.get(message.toAgentId) || [];
      queue.push(message);
      this.messageQueue.set(message.toAgentId, queue);

      return message.id;
    }

    try {
      // Update target agent's last seen time
      targetConnection.lastSeen = new Date();

      // Handle message based on type
      await this.processMessage(message, targetConnection);

      this.eventEmitter.emit('message_received', message);
      return message.id;

    } catch (error) {
      elizaLogger.error('Failed to send message', {
        messageId: message.id,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Process a message for the target agent
   */
  private async processMessage(message: AgentMessage, targetConnection: AgentConnection): Promise<void> {
    // Create a memory object for the target agent
    const memory: Memory = {
      id: message.id as UUID,
      entityId: message.fromAgentId,
      agentId: targetConnection.agentId,
      content: {
        text: message.content.text || '',
        source: 'agent_bridge',
        metadata: {
          messageType: message.messageType,
          priority: message.priority,
          workflowId: message.workflowId,
          bridgeData: message.content.data
        }
      },
      roomId: targetConnection.agentId, // Use agent ID as room ID for direct messages
      createdAt: message.timestamp
    };

    // Store the message in the target agent's memory
    await targetConnection.runtime.createMemory(memory, 'agent_messages');

    // If this is a task assignment, create a more formal task
    if (message.messageType === 'task_assignment' && message.content.data) {
      try {
        await targetConnection.runtime.createTask({
          name: message.content.data.taskName || 'Agent Communication Task',
          description: message.content.text || 'Task assigned via agent communication bridge',
          roomId: targetConnection.agentId,
          tags: ['agent_bridge', message.messageType, ...(message.content.data.tags || [])],
          metadata: {
            fromAgentId: message.fromAgentId,
            workflowId: message.workflowId,
            priority: message.priority,
            originalMessage: message
          }
        });
      } catch (error) {
        elizaLogger.warn('Failed to create task for message', {
          messageId: message.id,
          error: error.message
        });
      }
    }

    // Execute registered message handlers
    const handlerKey = `${message.messageType}_${targetConnection.agentId}`;
    const handler = this.messageHandlers.get(handlerKey);
    if (handler) {
      try {
        await handler(message);
      } catch (error) {
        elizaLogger.error('Message handler failed', {
          handlerKey,
          messageId: message.id,
          error: error.message
        });
      }
    }
  }

  /**
   * Broadcast a message to all connected agents
   */
  async broadcastMessage(messageData: Omit<AgentMessage, 'id' | 'timestamp' | 'toAgentId'>): Promise<string[]> {
    const messageIds: string[] = [];

    for (const [agentId, _connection] of this.connections) {
      // Don't send to self
      if (agentId === messageData.fromAgentId) {continue;}

      try {
        const messageId = await this.sendMessage({
          ...messageData,
          toAgentId: agentId
        });
        messageIds.push(messageId);
      } catch (error) {
        elizaLogger.error('Failed to broadcast to agent', {
          targetAgentId: agentId,
          error: error.message
        });
      }
    }

    return messageIds;
  }

  /**
   * Create and manage a workflow coordination
   */
  async createWorkflow(
    workflowId: string,
    orchestratorId: UUID,
    participantIds: UUID[],
    metadata: any = {}
  ): Promise<WorkflowCoordination> {
    elizaLogger.info('Creating workflow coordination', {
      workflowId,
      orchestratorId,
      participantCount: participantIds.length
    });

    const workflow: WorkflowCoordination = {
      workflowId,
      orchestratorId,
      participantIds,
      currentPhase: 'initializing',
      status: 'initializing',
      metadata,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    this.workflows.set(workflowId, workflow);

    // Notify all participants about the new workflow
    for (const participantId of participantIds) {
      try {
        await this.sendMessage({
          fromAgentId: orchestratorId,
          toAgentId: participantId,
          messageType: 'coordination',
          content: {
            text: 'You have been added to a new workflow',
            data: {
              event: 'workflow_created',
              workflowId,
              role: 'participant',
              metadata
            }
          },
          workflowId,
          priority: 'high'
        });
      } catch (error) {
        elizaLogger.error('Failed to notify participant of workflow', {
          workflowId,
          participantId,
          error: error.message
        });
      }
    }

    this.eventEmitter.emit('workflow_status_changed', workflowId, 'initializing');
    return workflow;
  }

  /**
   * Update workflow status and notify participants
   */
  async updateWorkflowStatus(
    workflowId: string,
    status: WorkflowCoordination['status'],
    phase?: string,
    metadata?: any
  ): Promise<void> {
    const workflow = this.workflows.get(workflowId);
    if (!workflow) {
      throw new Error(`Workflow ${workflowId} not found`);
    }

    elizaLogger.info('Updating workflow status', { workflowId, status, phase });

    workflow.status = status;
    if (phase) {workflow.currentPhase = phase;}
    if (metadata) {workflow.metadata = { ...workflow.metadata, ...metadata };}
    workflow.updatedAt = new Date();

    // Notify all participants of status change
    const allParticipants = [workflow.orchestratorId, ...workflow.participantIds];

    for (const participantId of allParticipants) {
      try {
        await this.sendMessage({
          fromAgentId: this.runtime.agentId,
          toAgentId: participantId,
          messageType: 'coordination',
          content: {
            text: `Workflow status updated: ${status}`,
            data: {
              event: 'workflow_status_updated',
              workflowId,
              status,
              phase: workflow.currentPhase,
              metadata: workflow.metadata
            }
          },
          workflowId,
          priority: 'medium'
        });
      } catch (error) {
        elizaLogger.error('Failed to notify participant of status update', {
          workflowId,
          participantId,
          error: error.message
        });
      }
    }

    this.eventEmitter.emit('workflow_status_changed', workflowId, status);
  }

  /**
   * Register a message handler for specific message types
   */
  registerMessageHandler(
    messageType: string,
    agentId: UUID,
    handler: (message: AgentMessage) => Promise<void>
  ): void {
    const handlerKey = `${messageType}_${agentId}`;
    this.messageHandlers.set(handlerKey, handler);

    elizaLogger.debug('Registered message handler', {
      messageType,
      agentId,
      handlerKey
    });
  }

  /**
   * Get connected agents with optional filtering
   */
  getConnectedAgents(filter?: {
    role?: 'orchestrator' | 'coder' | 'reviewer' | 'observer';
    capabilities?: string[];
    status?: 'connected' | 'busy' | 'idle' | 'offline';
  }): AgentConnection[] {
    let agents = Array.from(this.connections.values());

    if (filter) {
      if (filter.role) {
        agents = agents.filter(agent => agent.role === filter.role);
      }
      if (filter.capabilities) {
        agents = agents.filter(agent =>
          filter.capabilities!.some(cap => agent.capabilities.includes(cap))
        );
      }
      if (filter.status) {
        agents = agents.filter(agent => agent.status === filter.status);
      }
    }

    return agents;
  }

  /**
   * Get workflow status
   */
  getWorkflow(workflowId: string): WorkflowCoordination | undefined {
    return this.workflows.get(workflowId);
  }

  /**
   * Get all active workflows
   */
  getActiveWorkflows(): WorkflowCoordination[] {
    return Array.from(this.workflows.values()).filter(
      workflow => workflow.status === 'active' || workflow.status === 'initializing'
    );
  }

  /**
   * Disconnect an agent
   */
  async disconnectAgent(agentId: UUID): Promise<void> {
    const connection = this.connections.get(agentId);
    if (!connection) {return;}

    elizaLogger.info('Disconnecting agent from bridge', { agentId });

    // Update status to offline
    connection.status = 'offline';

    // Send disconnect notification to other agents
    await this.broadcastMessage({
      fromAgentId: this.runtime.agentId,
      messageType: 'coordination',
      content: {
        text: 'Agent disconnected',
        data: {
          event: 'agent_disconnected',
          disconnectedAgentId: agentId
        }
      },
      priority: 'low'
    });

    // Remove from connections
    this.connections.delete(agentId);

    this.eventEmitter.emit('agent_disconnected', agentId);
  }

  /**
   * Get bridge statistics
   */
  getStatistics(): {
    connectedAgents: number;
    activeWorkflows: number;
    queuedMessages: number;
    totalMessagesSent: number;
    } {
    const queuedMessages = Array.from(this.messageQueue.values())
      .reduce((total, queue) => total + queue.length, 0);

    return {
      connectedAgents: this.connections.size,
      activeWorkflows: this.getActiveWorkflows().length,
      queuedMessages,
      totalMessagesSent: 0 // Would need to track this separately
    };
  }
}
