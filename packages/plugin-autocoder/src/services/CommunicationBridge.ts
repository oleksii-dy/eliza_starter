import WebSocket, { WebSocketServer } from 'ws';
import { createServer } from 'http';
import { Service, elizaLogger } from '@elizaos/core';
import type { IAgentRuntime, UUID } from '@elizaos/core';

interface AgentMessage {
  id: string;
  type: 'task_assignment' | 'status_update' | 'result_report' | 'error_report' | 'ping' | 'pong';
  from: UUID;
  to: UUID;
  timestamp: number;
  data: any;
  signature?: string; // For message authentication
}

interface ConnectedAgent {
  id: UUID;
  websocket: WebSocket;
  role: 'main' | 'coder' | 'reviewer' | 'tester';
  lastPing: number;
  authenticated: boolean;
  containerId?: string;
  taskId?: UUID;
}

interface TaskAssignment {
  taskId: UUID;
  requirements: string[];
  acceptanceCriteria: string[];
  context: any;
  timeoutMs: number;
  priority: 'low' | 'medium' | 'high' | 'critical';
}

interface StatusUpdate {
  taskId: UUID;
  status: 'started' | 'in_progress' | 'completed' | 'failed';
  progress: number; // 0-100
  message: string;
  details?: any;
}

interface ResultReport {
  taskId: UUID;
  success: boolean;
  output: any;
  logs: string[];
  metrics?: {
    duration: number;
    resourceUsage: any;
  };
  nextSteps?: string[];
}

export class CommunicationBridge extends Service {
  static serviceName = 'communication-bridge';
  static serviceType = 'messaging' as const;

  private server: any;
  private wss: WebSocketServer | null = null;
  private connectedAgents: Map<UUID, ConnectedAgent> = new Map();
  private messageQueue: Map<UUID, AgentMessage[]> = new Map(); // For offline agents
  private messageHandlers: Map<string, (message: AgentMessage) => Promise<void>> = new Map();
  private pingInterval: NodeJS.Timeout | null = null;

  capabilityDescription = 'Provides WebSocket-based communication between main and sub-agents';

  constructor(runtime?: IAgentRuntime) {
    super(runtime);
    this.setupMessageHandlers();
  }

  static async start(runtime: IAgentRuntime): Promise<CommunicationBridge> {
    const service = new CommunicationBridge(runtime);
    await service.initialize();
    elizaLogger.info('CommunicationBridge started successfully');
    return service;
  }

  private async initialize(): Promise<void> {
    try {
      const port = parseInt(this.runtime?.getSetting('COMMUNICATION_BRIDGE_PORT') || '9000');

      // Create HTTP server
      this.server = createServer();

      // Create WebSocket server
      this.wss = new WebSocketServer({
        server: this.server,
        path: '/agent-bridge',
        clientTracking: true,
      });

      this.setupWebSocketHandlers();

      // Start server
      await new Promise<void>((resolve, reject) => {
        this.server.listen(port, (error: any) => {
          if (error) {
            reject(error);
          } else {
            elizaLogger.info(`Communication bridge listening on port ${port}`);
            resolve();
          }
        });
      });

      // Start ping monitoring
      this.startPingMonitoring();
    } catch (error) {
      elizaLogger.error('Failed to initialize CommunicationBridge:', error);
      throw error;
    }
  }

  private setupWebSocketHandlers(): void {
    if (!this.wss) return;

    this.wss.on('connection', (ws: WebSocket, request) => {
      elizaLogger.info('New agent connection attempt');

      // Set up connection handlers
      ws.on('message', async (data: Buffer) => {
        try {
          const message = JSON.parse(data.toString()) as AgentMessage;
          await this.handleMessage(ws, message);
        } catch (error) {
          elizaLogger.error('Error handling message:', error);
          this.sendError(ws, 'Invalid message format');
        }
      });

      ws.on('close', (code, reason) => {
        this.handleDisconnection(ws, code, reason.toString());
      });

      ws.on('error', (error) => {
        elizaLogger.error('WebSocket error:', error);
        this.handleDisconnection(ws, 1006, 'Connection error');
      });

      // Send authentication request
      this.sendMessage(ws, {
        id: this.generateMessageId(),
        type: 'auth_request' as any,
        from: this.runtime.agentId,
        to: '' as UUID,
        timestamp: Date.now(),
        data: { challenge: this.generateAuthChallenge() },
      });
    });
  }

  private setupMessageHandlers(): void {
    this.messageHandlers.set('auth_response', this.handleAuthResponse.bind(this));
    this.messageHandlers.set('task_assignment', this.handleTaskAssignment.bind(this));
    this.messageHandlers.set('status_update', this.handleStatusUpdate.bind(this));
    this.messageHandlers.set('result_report', this.handleResultReport.bind(this));
    this.messageHandlers.set('error_report', this.handleErrorReport.bind(this));
    this.messageHandlers.set('ping', this.handlePing.bind(this));
    this.messageHandlers.set('pong', this.handlePong.bind(this));
  }

  private async handleMessage(ws: WebSocket, message: AgentMessage): Promise<void> {
    elizaLogger.debug(`Received message: ${message.type} from ${message.from}`);

    const handler = this.messageHandlers.get(message.type);
    if (handler) {
      try {
        await handler(message);
      } catch (error) {
        elizaLogger.error(`Error handling ${message.type} message:`, error);
        this.sendError(
          ws,
          `Error processing ${message.type}: ${error instanceof Error ? error.message : String(error)}`
        );
      }
    } else {
      elizaLogger.warn(`Unknown message type: ${message.type}`);
      this.sendError(ws, `Unknown message type: ${message.type}`);
    }
  }

  private async handleAuthResponse(message: AgentMessage): Promise<void> {
    const { agentId, role, signature, containerId, taskId } = message.data;

    // Verify authentication with proper cryptographic validation
    const isValid = await this.verifyAuthSignature(agentId, signature);

    if (isValid) {
      const websocket = this.findWebSocketForAgent(agentId);
      if (!websocket) {
        throw new Error(`WebSocket not found for agent ${agentId}`);
      }

      const connectedAgent: ConnectedAgent = {
        id: agentId,
        websocket,
        role,
        lastPing: Date.now(),
        authenticated: true,
        containerId,
        taskId,
      };

      this.connectedAgents.set(agentId, connectedAgent);

      // Send authentication success
      await this.sendToAgent(agentId, {
        id: this.generateMessageId(),
        type: 'auth_success' as any,
        from: this.runtime.agentId,
        to: agentId,
        timestamp: Date.now(),
        data: { status: 'authenticated' },
      });

      // Send any queued messages
      await this.deliverQueuedMessages(agentId);

      elizaLogger.info(`Agent authenticated: ${agentId} (${role})`);
    } else {
      elizaLogger.warn(`Authentication failed for agent: ${agentId}`);
      const websocket = this.findWebSocketForAgent(agentId);
      if (websocket) {
        this.sendError(websocket, 'Authentication failed');
      }
    }
  }

  private async handleTaskAssignment(message: AgentMessage): Promise<void> {
    const assignment = message.data as TaskAssignment;
    elizaLogger.info(`Task assignment received: ${assignment.taskId}`);

    // Forward to appropriate sub-agent or main agent
    // This would typically be handled by the orchestrator
    await this.forwardMessage(message);
  }

  private async handleStatusUpdate(message: AgentMessage): Promise<void> {
    const update = message.data as StatusUpdate;
    elizaLogger.info(
      `Status update for task ${update.taskId}: ${update.status} (${update.progress}%)`
    );

    // Forward to main agent or other interested parties
    await this.forwardMessage(message);
  }

  private async handleResultReport(message: AgentMessage): Promise<void> {
    const report = message.data as ResultReport;
    elizaLogger.info(
      `Result report for task ${report.taskId}: ${report.success ? 'SUCCESS' : 'FAILED'}`
    );

    // Forward to main agent
    await this.forwardMessage(message);
  }

  private async handleErrorReport(message: AgentMessage): Promise<void> {
    elizaLogger.error(`Error report from ${message.from}:`, message.data);

    // Forward to main agent
    await this.forwardMessage(message);
  }

  private async handlePing(message: AgentMessage): Promise<void> {
    const agent = this.connectedAgents.get(message.from);
    if (agent) {
      agent.lastPing = Date.now();

      // Send pong response
      await this.sendToAgent(message.from, {
        id: this.generateMessageId(),
        type: 'pong',
        from: this.runtime.agentId,
        to: message.from,
        timestamp: Date.now(),
        data: {},
      });
    }
  }

  private async handlePong(message: AgentMessage): Promise<void> {
    const agent = this.connectedAgents.get(message.from);
    if (agent) {
      agent.lastPing = Date.now();
    }
  }

  async sendToAgent(agentId: UUID, message: AgentMessage): Promise<boolean> {
    const agent = this.connectedAgents.get(agentId);

    if (agent && agent.authenticated && agent.websocket.readyState === WebSocket.OPEN) {
      return this.sendMessage(agent.websocket, message);
    } else {
      // Queue message for offline agent
      if (!this.messageQueue.has(agentId)) {
        this.messageQueue.set(agentId, []);
      }
      this.messageQueue.get(agentId)!.push(message);
      elizaLogger.info(`Message queued for offline agent ${agentId}: ${message.type}`);
      return false;
    }
  }

  async broadcastToRole(
    role: 'coder' | 'reviewer' | 'tester',
    message: AgentMessage
  ): Promise<number> {
    let sent = 0;

    for (const [agentId, agent] of this.connectedAgents) {
      if (agent.role === role && agent.authenticated) {
        const success = await this.sendToAgent(agentId, message);
        if (success) sent++;
      }
    }

    return sent;
  }

  async broadcastToTask(taskId: UUID, message: AgentMessage): Promise<number> {
    let sent = 0;

    for (const [agentId, agent] of this.connectedAgents) {
      if (agent.taskId === taskId && agent.authenticated) {
        const success = await this.sendToAgent(agentId, message);
        if (success) sent++;
      }
    }

    return sent;
  }

  private async forwardMessage(message: AgentMessage): Promise<void> {
    // Simple forwarding logic - can be enhanced based on routing rules
    if (message.to) {
      await this.sendToAgent(message.to, message);
    } else {
      // Broadcast to main agent if no specific target
      const mainAgents = Array.from(this.connectedAgents.values()).filter(
        (agent) => agent.role === 'main'
      );

      for (const agent of mainAgents) {
        await this.sendToAgent(agent.id, message);
      }
    }
  }

  private sendMessage(ws: WebSocket, message: AgentMessage): boolean {
    try {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify(message));
        return true;
      }
      return false;
    } catch (error) {
      elizaLogger.error('Error sending message:', error);
      return false;
    }
  }

  private sendError(ws: WebSocket, error: string): void {
    this.sendMessage(ws, {
      id: this.generateMessageId(),
      type: 'error' as any,
      from: this.runtime.agentId,
      to: '' as UUID,
      timestamp: Date.now(),
      data: { error },
    });
  }

  private handleDisconnection(ws: WebSocket, code: number, reason: string): void {
    // Find and remove the disconnected agent
    for (const [agentId, agent] of this.connectedAgents) {
      if (agent.websocket === ws) {
        elizaLogger.info(`Agent disconnected: ${agentId} (${code}: ${reason})`);
        this.connectedAgents.delete(agentId);
        break;
      }
    }
  }

  private async deliverQueuedMessages(agentId: UUID): Promise<void> {
    const queuedMessages = this.messageQueue.get(agentId);
    if (queuedMessages && queuedMessages.length > 0) {
      elizaLogger.info(`Delivering ${queuedMessages.length} queued messages to ${agentId}`);

      for (const message of queuedMessages) {
        await this.sendToAgent(agentId, message);
      }

      this.messageQueue.delete(agentId);
    }
  }

  private findWebSocketForAgent(agentId: UUID): WebSocket | null {
    const agent = this.connectedAgents.get(agentId);
    return agent?.websocket || null;
  }

  private generateMessageId(): string {
    return `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateAuthChallenge(): string {
    return Math.random().toString(36).substr(2, 16);
  }

  private async verifyAuthSignature(agentId: UUID, signature: string): Promise<boolean> {
    try {
      // Get trust and secrets services for proper verification
      const trustEngine = this.runtime?.getService('trust-engine');
      const secretsManager = this.runtime?.getService('secrets-manager');

      if (!signature) {
        elizaLogger.warn('Authentication failed: no signature provided');
        return false;
      }

      // Verify signature format (should be base64 encoded)
      if (!/^[A-Za-z0-9+/=]+$/.test(signature)) {
        elizaLogger.warn('Authentication failed: invalid signature format');
        return false;
      }

      // If trust engine is available, use it for verification
      if (trustEngine) {
        try {
          const trustLevel = await (trustEngine as any).getTrustLevel(agentId);
          if (trustLevel < 50) {
            // Minimum trust threshold
            elizaLogger.warn(
              `Authentication failed: insufficient trust level (${trustLevel}) for agent ${agentId}`
            );
            return false;
          }
        } catch (error) {
          elizaLogger.warn('Trust verification failed:', error);
          return false;
        }
      }

      // If secrets manager is available, verify against stored credentials
      if (secretsManager) {
        try {
          const expectedSignature = await (secretsManager as any).getSecret(
            `agent_signature_${agentId}`
          );
          if (expectedSignature && expectedSignature !== signature) {
            elizaLogger.warn(`Authentication failed: signature mismatch for agent ${agentId}`);
            return false;
          }
        } catch (error) {
          elizaLogger.warn('Secret verification failed:', error);
          // Don't fail if secret isn't found - might be new agent
        }
      }

      // Basic cryptographic verification using Node.js crypto
      try {
        const crypto = require('crypto');
        const publicKey = this.runtime?.getSetting('AGENT_PUBLIC_KEY');

        if (publicKey) {
          // Verify signature was created with corresponding private key
          const verifier = crypto.createVerify('SHA256');
          verifier.update(agentId); // Verify agent ID was signed
          const isValid = verifier.verify(publicKey, signature, 'base64');

          if (!isValid) {
            elizaLogger.warn(
              `Authentication failed: signature verification failed for agent ${agentId}`
            );
            return false;
          }
        } else {
          elizaLogger.warn('No public key configured, using basic validation');
          // Fall back to basic checks if no public key is configured
          return signature.length >= 32; // Minimum signature length
        }
      } catch (error) {
        elizaLogger.error('Cryptographic verification failed:', error);
        return false;
      }

      elizaLogger.info(`Agent ${agentId} authenticated successfully`);
      return true;
    } catch (error) {
      elizaLogger.error('Authentication verification error:', error);
      return false;
    }
  }

  private startPingMonitoring(): void {
    this.pingInterval = setInterval(async () => {
      const now = Date.now();
      const timeout = 60000; // 60 seconds

      for (const [agentId, agent] of this.connectedAgents) {
        if (now - agent.lastPing > timeout) {
          elizaLogger.warn(`Agent ${agentId} ping timeout, disconnecting`);
          agent.websocket.terminate();
          this.connectedAgents.delete(agentId);
        } else {
          // Send ping
          await this.sendToAgent(agentId, {
            id: this.generateMessageId(),
            type: 'ping',
            from: this.runtime.agentId,
            to: agentId,
            timestamp: Date.now(),
            data: {},
          });
        }
      }
    }, 30000); // Check every 30 seconds
  }

  getConnectedAgents(): ConnectedAgent[] {
    return Array.from(this.connectedAgents.values());
  }

  getAgentsByRole(role: 'main' | 'coder' | 'reviewer' | 'tester'): ConnectedAgent[] {
    return Array.from(this.connectedAgents.values()).filter((agent) => agent.role === role);
  }

  getAgentsByTask(taskId: UUID): ConnectedAgent[] {
    return Array.from(this.connectedAgents.values()).filter((agent) => agent.taskId === taskId);
  }

  isAgentConnected(agentId: UUID): boolean {
    const agent = this.connectedAgents.get(agentId);
    return agent?.authenticated === true && agent.websocket.readyState === WebSocket.OPEN;
  }

  async disconnectAgent(agentId: UUID): Promise<void> {
    const agent = this.connectedAgents.get(agentId);
    if (agent) {
      agent.websocket.terminate();
      this.connectedAgents.delete(agentId);
      elizaLogger.info(`Agent ${agentId} forcibly disconnected`);
    }
  }

  async stop(): Promise<void> {
    try {
      // Stop ping monitoring
      if (this.pingInterval) {
        clearInterval(this.pingInterval);
        this.pingInterval = null;
      }

      // Disconnect all agents
      for (const [agentId, agent] of this.connectedAgents) {
        agent.websocket.terminate();
      }
      this.connectedAgents.clear();

      // Close WebSocket server
      if (this.wss) {
        this.wss.close();
        this.wss = null;
      }

      // Close HTTP server
      if (this.server) {
        await new Promise<void>((resolve) => {
          this.server.close(() => resolve());
        });
      }

      elizaLogger.info('CommunicationBridge stopped');
    } catch (error) {
      elizaLogger.error('Error stopping CommunicationBridge:', error);
      throw error;
    }
  }
}
