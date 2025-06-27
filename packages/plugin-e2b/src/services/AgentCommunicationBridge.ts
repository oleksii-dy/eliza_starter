import { Service, elizaLogger, type IAgentRuntime, type UUID } from '@elizaos/core';
import { EventEmitter } from 'events';

/**
 * Agent connection metadata
 */
interface AgentConnection {
  agentId: UUID;
  name: string;
  status: 'connected' | 'disconnected' | 'busy';
  capabilities: string[];
  lastSeen: Date;
  metadata?: Record<string, any>;
}

/**
 * Message structure for agent communication
 */
interface AgentMessage {
  fromAgentId: UUID;
  toAgentId: UUID;
  messageId: string;
  type: 'request' | 'response' | 'broadcast' | 'status';
  content: any;
  timestamp: Date;
  correlationId?: string;
}

/**
 * Agent Communication Bridge Service
 * Handles real-time communication and coordination between agents
 */
export class AgentCommunicationBridge extends Service {
  static serviceName = 'agent-communication-bridge';
  static serviceType = 'agent-communication-bridge';

  private eventEmitter: EventEmitter;
  private connections: Map<UUID, AgentConnection> = new Map();
  private messageQueue: Map<UUID, AgentMessage[]> = new Map();
  private activeRequests: Map<string, { resolve: Function; reject: Function }> = new Map();

  get capabilityDescription(): string {
    return 'Service for enabling real-time communication and coordination between agents';
  }

  constructor(runtime: IAgentRuntime) {
    super(runtime);
    this.eventEmitter = new EventEmitter();
  }

  static async start(runtime: IAgentRuntime): Promise<AgentCommunicationBridge> {
    const service = new AgentCommunicationBridge(runtime);
    await service.initialize();
    return service;
  }

  async initialize(): Promise<void> {
    elizaLogger.info('Initializing Agent Communication Bridge');

    // Register this agent
    const agentId = this.runtime.agentId;
    const agentName = this.runtime.character?.name || 'Unknown Agent';

    this.connections.set(agentId, {
      agentId,
      name: agentName,
      status: 'connected',
      capabilities: this.getAgentCapabilities(),
      lastSeen: new Date(),
    });

    // Set up heartbeat
    this.startHeartbeat();

    elizaLogger.info('Agent Communication Bridge initialized');
  }

  async stop(): Promise<void> {
    elizaLogger.info('Stopping Agent Communication Bridge');

    // Notify other agents of disconnection
    await this.broadcastStatus('disconnected');

    // Clear all data
    this.connections.clear();
    this.messageQueue.clear();
    this.activeRequests.clear();
    this.eventEmitter.removeAllListeners();

    elizaLogger.info('Agent Communication Bridge stopped');
  }

  /**
   * Send a message to another agent
   */
  async sendMessage(
    toAgentId: UUID,
    content: any,
    type: AgentMessage['type'] = 'request'
  ): Promise<any> {
    const messageId = `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    const message: AgentMessage = {
      fromAgentId: this.runtime.agentId,
      toAgentId,
      messageId,
      type,
      content,
      timestamp: new Date(),
    };

    elizaLogger.debug('Sending message to agent', { toAgentId, messageId, type });

    // Queue message for target agent
    if (!this.messageQueue.has(toAgentId)) {
      this.messageQueue.set(toAgentId, []);
    }
    this.messageQueue.get(toAgentId)!.push(message);

    // Emit event
    this.eventEmitter.emit(`message:${toAgentId}`, message);

    // If it's a request, wait for response
    if (type === 'request') {
      return new Promise((resolve, reject) => {
        this.activeRequests.set(messageId, { resolve, reject });

        // Timeout after 30 seconds
        setTimeout(() => {
          if (this.activeRequests.has(messageId)) {
            this.activeRequests.delete(messageId);
            reject(new Error('Request timeout'));
          }
        }, 30000);
      });
    }

    return { success: true, messageId };
  }

  /**
   * Broadcast a message to all connected agents
   */
  async broadcast(content: any): Promise<void> {
    const connectedAgents = Array.from(this.connections.values()).filter(
      (agent) => agent.agentId !== this.runtime.agentId && agent.status === 'connected'
    );

    elizaLogger.debug('Broadcasting to agents', { count: connectedAgents.length });

    await Promise.all(
      connectedAgents.map((agent) => this.sendMessage(agent.agentId, content, 'broadcast'))
    );
  }

  /**
   * Get messages for the current agent
   */
  async getMessages(): Promise<AgentMessage[]> {
    const agentId = this.runtime.agentId;
    const messages = this.messageQueue.get(agentId) || [];

    // Clear queue after retrieval
    if (messages.length > 0) {
      this.messageQueue.set(agentId, []);
    }

    return messages;
  }

  /**
   * Handle incoming message response
   */
  async handleResponse(correlationId: string, response: any): Promise<void> {
    const request = this.activeRequests.get(correlationId);
    if (request) {
      request.resolve(response);
      this.activeRequests.delete(correlationId);
    }
  }

  /**
   * Register an agent connection
   */
  async registerAgent(agentId: UUID, metadata: Partial<AgentConnection>): Promise<void> {
    const connection: AgentConnection = {
      agentId,
      name: metadata.name || 'Unknown Agent',
      status: 'connected',
      capabilities: metadata.capabilities || [],
      lastSeen: new Date(),
      metadata: metadata.metadata,
    };

    this.connections.set(agentId, connection);
    elizaLogger.info('Agent registered', { agentId, name: connection.name });
  }

  /**
   * Get all connected agents
   */
  getConnectedAgents(): AgentConnection[] {
    return Array.from(this.connections.values()).filter((agent) => agent.status === 'connected');
  }

  /**
   * Get specific agent info
   */
  getAgentInfo(agentId: UUID): AgentConnection | null {
    return this.connections.get(agentId) || null;
  }

  /**
   * Coordinate workflow between agents
   */
  async coordinateWorkflow(workflow: {
    name: string;
    steps: Array<{
      agentId: UUID;
      action: string;
      params: any;
      dependsOn?: string[];
    }>;
  }): Promise<Map<string, any>> {
    elizaLogger.info('Coordinating workflow', {
      name: workflow.name,
      steps: workflow.steps.length,
    });

    const results = new Map<string, any>();
    const completed = new Set<string>();

    for (const step of workflow.steps) {
      // Wait for dependencies
      if (step.dependsOn) {
        await Promise.all(
          step.dependsOn.map((dep) => {
            if (!completed.has(dep)) {
              throw new Error(`Dependency ${dep} not completed`);
            }
          })
        );
      }

      // Execute step
      const result = await this.sendMessage(step.agentId, {
        action: step.action,
        params: step.params,
        context: { workflow: workflow.name, step: step.action },
      });

      results.set(step.action, result);
      completed.add(step.action);
    }

    return results;
  }

  /**
   * Get agent capabilities based on available actions
   */
  private getAgentCapabilities(): string[] {
    const capabilities: string[] = [];

    if (this.runtime.actions) {
      capabilities.push(...this.runtime.actions.map((action) => action.name));
    }

    return capabilities;
  }

  /**
   * Start heartbeat to maintain connection status
   */
  private startHeartbeat(): void {
    setInterval(() => {
      // Update own status
      const self = this.connections.get(this.runtime.agentId);
      if (self) {
        self.lastSeen = new Date();
      }

      // Check other agents' status
      const now = Date.now();
      for (const [agentId, connection] of this.connections) {
        if (agentId !== this.runtime.agentId) {
          const lastSeenTime = connection.lastSeen.getTime();
          if (now - lastSeenTime > 60000 && connection.status === 'connected') {
            // Mark as disconnected if not seen for 1 minute
            connection.status = 'disconnected';
            elizaLogger.warn('Agent disconnected due to timeout', {
              agentId,
              name: connection.name,
            });
          }
        }
      }
    }, 10000); // Every 10 seconds
  }

  /**
   * Broadcast agent status
   */
  private async broadcastStatus(status: AgentConnection['status']): Promise<void> {
    await this.broadcast({
      type: 'status-update',
      agentId: this.runtime.agentId,
      status,
      timestamp: new Date(),
    });
  }
}

export type { AgentConnection, AgentMessage };
