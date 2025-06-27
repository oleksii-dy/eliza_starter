/**
 * E2B Sandbox Manager for Multi-Agent Development Teams
 */

import type { IAgentRuntime } from '@elizaos/core';
import { Service } from '@elizaos/core';
import { logger } from '@elizaos/core';

export interface AgentConfig {
  character: string;
  role: string;
  workspace: string;
  plugins: string[];
}

export interface SandboxEnvironment {
  id: string;
  template: string;
  agents: AgentConfig[];
  roomId?: string;
  status: 'creating' | 'running' | 'stopped' | 'error';
  createdAt: Date;
}

export interface ProjectFile {
  path: string;
  content: string;
  type: 'file' | 'directory';
}

export class SandboxManager extends Service {
  static serviceName = 'sandbox-manager';
  capabilityDescription = 'Manages E2B sandboxes for multi-agent development teams';

  private sandboxes: Map<string, SandboxEnvironment> = new Map();
  private e2bApiKey: string;

  constructor(runtime: IAgentRuntime) {
    super();
    this.e2bApiKey = runtime.getSetting('E2B_API_KEY') as string;
    if (!this.e2bApiKey) {
      logger.warn('E2B_API_KEY not found. Sandbox functionality will be limited.');
    }
  }

  static async start(runtime: IAgentRuntime): Promise<SandboxManager> {
    logger.info('Starting Sandbox Manager Service...');
    return new SandboxManager(runtime);
  }

  async stop(): Promise<void> {
    // Clean up all running sandboxes
    for (const [id, sandbox] of this.sandboxes) {
      if (sandbox.status === 'running') {
        await this.destroySandbox(id);
      }
    }
    logger.info('Sandbox Manager Service stopped');
  }

  /**
   * Create a new E2B sandbox with Eliza development environment
   */
  async createSandbox(template: string = 'eliza-dev-team'): Promise<string> {
    const sandboxId = `sandbox-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    logger.info(`Creating E2B sandbox: ${sandboxId}`);

    try {
      // Create E2B sandbox (using E2B SDK)
      const _response = await this.callE2BAPI('POST', '/sandboxes', {
        template_id: template,
        metadata: {
          purpose: 'eliza-multi-agent-dev',
          created_by: 'sandbox-manager',
        },
      });

      const sandbox: SandboxEnvironment = {
        id: sandboxId,
        template,
        agents: [],
        status: 'creating',
        createdAt: new Date(),
      };

      this.sandboxes.set(sandboxId, sandbox);

      // Wait for sandbox to be ready
      await this.waitForSandboxReady(sandboxId);

      // Install Eliza and dependencies
      await this.setupElizaEnvironment(sandboxId);

      sandbox.status = 'running';
      logger.info(`Sandbox ${sandboxId} created and ready`);

      return sandboxId;
    } catch (error) {
      logger.error(`Failed to create sandbox ${sandboxId}:`, error);
      throw new Error(
        `Sandbox creation failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Deploy multiple specialized agents to the sandbox
   */
  async deployAgents(sandboxId: string, agents: AgentConfig[]): Promise<void> {
    const sandbox = this.sandboxes.get(sandboxId);
    if (!sandbox) {
      throw new Error(`Sandbox ${sandboxId} not found`);
    }

    logger.info(`Deploying ${agents.length} agents to sandbox ${sandboxId}`);

    for (const agent of agents) {
      await this.deployAgent(sandboxId, agent);
    }

    sandbox.agents = agents;
    logger.info(`All agents deployed to sandbox ${sandboxId}`);
  }

  /**
   * Deploy a single agent to the sandbox
   */
  private async deployAgent(sandboxId: string, agent: AgentConfig): Promise<void> {
    logger.info(`Deploying ${agent.role} agent to sandbox ${sandboxId}`);

    try {
      // Upload character configuration
      await this.uploadFile(
        sandboxId,
        `/config/${agent.character}`,
        await this.generateCharacterConfig(agent)
      );

      // Create agent startup script
      const startupScript = this.generateAgentStartupScript(agent);
      await this.uploadFile(sandboxId, `/scripts/start-${agent.role}.sh`, startupScript);

      // Start the agent in background
      await this.executeSandboxCommand(sandboxId, `chmod +x /scripts/start-${agent.role}.sh`);
      await this.executeSandboxCommand(sandboxId, `/scripts/start-${agent.role}.sh &`);

      logger.info(`${agent.role} agent deployed and started`);
    } catch (error) {
      logger.error(`Failed to deploy ${agent.role} agent:`, error);
      throw error;
    }
  }

  /**
   * Create a shared room for agent collaboration
   */
  async createRoom(sandboxId: string, name?: string): Promise<string> {
    const sandbox = this.sandboxes.get(sandboxId);
    if (!sandbox) {
      throw new Error(`Sandbox ${sandboxId} not found`);
    }

    const roomId = `room-${sandboxId}-${Date.now()}`;

    // Create room configuration
    const roomConfig = {
      id: roomId,
      name: name || `Dev Team ${sandboxId}`,
      type: 'GROUP',
      sandbox: sandboxId,
      participants: sandbox.agents.map((a) => a.role),
      createdAt: new Date().toISOString(),
    };

    // Upload room configuration to sandbox
    await this.uploadFile(
      sandboxId,
      `/config/room-${roomId}.json`,
      JSON.stringify(roomConfig, null, 2)
    );

    sandbox.roomId = roomId;
    logger.info(`Created room ${roomId} for sandbox ${sandboxId}`);

    return roomId;
  }

  /**
   * Connect sandbox agents to host server via WebSocket
   */
  async connectToHost(sandboxId: string, hostUrl: string, roomId: string): Promise<void> {
    const sandbox = this.sandboxes.get(sandboxId);
    if (!sandbox) {
      throw new Error(`Sandbox ${sandboxId} not found`);
    }

    logger.info(`Connecting sandbox ${sandboxId} to host ${hostUrl}`);

    // Create WebSocket bridge configuration
    const bridgeConfig = {
      hostUrl,
      roomId,
      sandboxId,
      agents: sandbox.agents.map((a) => ({
        role: a.role,
        agentId: `${sandboxId}-${a.role}`,
        character: a.character,
      })),
    };

    await this.uploadFile(
      sandboxId,
      '/config/websocket-bridge.json',
      JSON.stringify(bridgeConfig, null, 2)
    );

    // Start WebSocket bridge for each agent
    for (const agent of sandbox.agents) {
      await this.executeSandboxCommand(
        sandboxId,
        `elizaos bridge --config /config/websocket-bridge.json --agent ${agent.role} &`
      );
    }

    logger.info(`WebSocket bridge established for sandbox ${sandboxId}`);
  }

  /**
   * Sync project files between agents
   */
  async syncFiles(sandboxId: string, files: ProjectFile[]): Promise<void> {
    logger.info(`Syncing ${files.length} files to sandbox ${sandboxId}`);

    for (const file of files) {
      if (file.type === 'directory') {
        await this.executeSandboxCommand(sandboxId, `mkdir -p /workspace/${file.path}`);
      } else {
        await this.uploadFile(sandboxId, `/workspace/${file.path}`, file.content);
      }
    }

    // Notify all agents of file changes
    await this.executeSandboxCommand(
      sandboxId,
      'echo "Files synced at $(date)" >> /workspace/.sync-log'
    );
  }

  /**
   * Execute a command in the sandbox
   */
  async executeSandboxCommand(sandboxId: string, command: string): Promise<string> {
    try {
      const response = await this.callE2BAPI('POST', `/sandboxes/${sandboxId}/exec`, {
        cmd: command,
        timeout: 30000,
      });

      return response.stdout || '';
    } catch (error) {
      logger.error(`Command execution failed in sandbox ${sandboxId}:`, error);
      throw error;
    }
  }

  /**
   * Upload a file to the sandbox
   */
  async uploadFile(sandboxId: string, path: string, content: string): Promise<void> {
    try {
      await this.callE2BAPI('POST', `/sandboxes/${sandboxId}/files`, {
        path,
        content: Buffer.from(content).toString('base64'),
        encoding: 'base64',
      });
    } catch (error) {
      logger.error(`File upload failed for ${path}:`, error);
      throw error;
    }
  }

  /**
   * Destroy a sandbox and clean up resources
   */
  async destroySandbox(sandboxId: string): Promise<void> {
    const sandbox = this.sandboxes.get(sandboxId);
    if (!sandbox) {
      logger.warn(`Sandbox ${sandboxId} not found for destruction`);
      return;
    }

    logger.info(`Destroying sandbox ${sandboxId}`);

    try {
      await this.callE2BAPI('DELETE', `/sandboxes/${sandboxId}`);
      this.sandboxes.delete(sandboxId);
      logger.info(`Sandbox ${sandboxId} destroyed`);
    } catch (error) {
      logger.error(`Failed to destroy sandbox ${sandboxId}:`, error);
      throw error;
    }
  }

  /**
   * Get sandbox status and information
   */
  getSandboxInfo(sandboxId: string): SandboxEnvironment | null {
    return this.sandboxes.get(sandboxId) || null;
  }

  /**
   * List all active sandboxes
   */
  listSandboxes(): SandboxEnvironment[] {
    return Array.from(this.sandboxes.values());
  }

  // Private helper methods

  private async waitForSandboxReady(sandboxId: string, maxAttempts = 30): Promise<void> {
    for (let i = 0; i < maxAttempts; i++) {
      try {
        const response = await this.callE2BAPI('GET', `/sandboxes/${sandboxId}/status`);
        if (response.status === 'running') {
          return;
        }
      } catch (_error) {
        // Continue waiting
      }

      await new Promise((resolve) => setTimeout(resolve, 2000));
    }

    throw new Error(`Sandbox ${sandboxId} failed to become ready within timeout`);
  }

  private async setupElizaEnvironment(sandboxId: string): Promise<void> {
    logger.info(`Setting up Eliza environment in sandbox ${sandboxId}`);

    const setupCommands = [
      'cd /app',
      'npm install',
      'npm run build',
      'npm link',
      'mkdir -p /config /scripts /workspace',
      'chmod 755 /config /scripts /workspace',
    ];

    for (const command of setupCommands) {
      await this.executeSandboxCommand(sandboxId, command);
    }
  }

  private async generateCharacterConfig(agent: AgentConfig): Promise<string> {
    const character = {
      name: `DevBot ${agent.role.charAt(0).toUpperCase() + agent.role.slice(1)}`,
      bio: [
        `I'm a specialized ${agent.role} developer agent.`,
        `I excel at modern ${agent.role} development practices.`,
        'I collaborate with other agents to build amazing projects.',
      ],
      system: `You are an expert ${agent.role} developer. Focus on your specialty while collaborating with the team.`,
      plugins: agent.plugins,
      settings: {
        specialty: agent.role,
        workspace: agent.workspace,
        collaboration: true,
      },
    };

    return JSON.stringify(character, null, 2);
  }

  private generateAgentStartupScript(agent: AgentConfig): string {
    return `#!/bin/bash
cd ${agent.workspace}
export NODE_ENV=development
export AGENT_ROLE=${agent.role}
export WORKSPACE=${agent.workspace}

# Start the agent
elizaos start --character /config/${agent.character} --port $((3000 + RANDOM % 1000)) > /logs/${agent.role}.log 2>&1 &

echo "Started ${agent.role} agent with PID $!"
echo $! > /tmp/${agent.role}.pid
`;
  }

  private async callE2BAPI(method: string, endpoint: string, data?: any): Promise<any> {
    if (!this.e2bApiKey) {
      throw new Error('E2B API key not configured');
    }

    const url = `https://api.e2b.dev${endpoint}`;
    const options: any = {
      method,
      headers: {
        Authorization: `Bearer ${this.e2bApiKey}`,
        'Content-Type': 'application/json',
      },
    };

    if (data && (method === 'POST' || method === 'PUT' || method === 'PATCH')) {
      options.body = JSON.stringify(data);
    }

    const response = await fetch(url, options);

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`E2B API error: ${response.status} ${error}`);
    }

    return response.json();
  }
}
