/**
 * Mock Sandbox Manager for Testing
 * Simulates E2B sandbox functionality without requiring actual API calls
 */

import type { IAgentRuntime } from '@elizaos/core';
import { logger, Service } from '@elizaos/core';
import type { AgentConfig, SandboxEnvironment, ProjectFile } from './SandboxManager.js';

export class MockSandboxManager extends Service {
  static serviceName = 'sandbox-manager';
  capabilityDescription = 'Mock sandbox manager for testing multi-agent development teams';

  private sandboxes: Map<string, SandboxEnvironment> = new Map();
  private mockDelay = 200; // Simulate API delays (reduced for tests)

  constructor(runtime?: IAgentRuntime) {
    super();
  }

  static async start(runtime: IAgentRuntime): Promise<MockSandboxManager> {
    logger.info('Starting Mock Sandbox Manager Service...');
    return new MockSandboxManager(runtime);
  }

  async stop(): Promise<void> {
    logger.info('Mock Sandbox Manager Service stopped');
  }

  /**
   * Create a mock sandbox (simulates E2B creation)
   */
  async createSandbox(template: string = 'eliza-dev-team'): Promise<string> {
    const sandboxId = `mock-sandbox-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    logger.info(`Creating mock sandbox: ${sandboxId}`);

    // Simulate async creation delay
    await new Promise((resolve) => setTimeout(resolve, this.mockDelay));

    const sandbox: SandboxEnvironment = {
      id: sandboxId,
      template,
      agents: [],
      status: 'running',
      createdAt: new Date(),
    };

    this.sandboxes.set(sandboxId, sandbox);

    logger.info(`Mock sandbox ${sandboxId} created successfully`);
    return sandboxId;
  }

  /**
   * Deploy agents to mock sandbox
   */
  async deployAgents(sandboxId: string, agents: AgentConfig[]): Promise<void> {
    const sandbox = this.sandboxes.get(sandboxId);
    if (!sandbox) {
      throw new Error(`Sandbox ${sandboxId} not found`);
    }

    logger.info(`Deploying ${agents.length} agents to mock sandbox ${sandboxId}`);

    // Simulate deployment delay
    await new Promise((resolve) => setTimeout(resolve, this.mockDelay));

    for (const agent of agents) {
      logger.info(`Mock deployed ${agent.role} agent`);
    }

    sandbox.agents = agents;
    logger.info(`All agents deployed to mock sandbox ${sandboxId}`);
  }

  /**
   * Create a mock shared room
   */
  async createRoom(sandboxId: string, name?: string): Promise<string> {
    const sandbox = this.sandboxes.get(sandboxId);
    if (!sandbox) {
      throw new Error(`Sandbox ${sandboxId} not found`);
    }

    const roomId = `mock-room-${sandboxId}-${Date.now()}`;
    sandbox.roomId = roomId;

    logger.info(`Created mock room ${roomId} for sandbox ${sandboxId}`);
    return roomId;
  }

  /**
   * Mock WebSocket connection to host
   */
  async connectToHost(sandboxId: string, hostUrl: string, roomId: string): Promise<void> {
    const sandbox = this.sandboxes.get(sandboxId);
    if (!sandbox) {
      throw new Error(`Sandbox ${sandboxId} not found`);
    }

    logger.info(`Mock connecting sandbox ${sandboxId} to host ${hostUrl} in room ${roomId}`);

    // Simulate connection delay
    await new Promise((resolve) => setTimeout(resolve, 500));

    logger.info(`Mock WebSocket bridge established for sandbox ${sandboxId}`);
  }

  /**
   * Mock file synchronization
   */
  async syncFiles(sandboxId: string, files: ProjectFile[]): Promise<void> {
    logger.info(`Mock syncing ${files.length} files to sandbox ${sandboxId}`);

    for (const file of files) {
      logger.debug(`Mock synced file: ${file.path}`);
    }
  }

  /**
   * Mock command execution
   */
  async executeSandboxCommand(sandboxId: string, command: string): Promise<string> {
    logger.info(`Mock executing command in ${sandboxId}: ${command}`);

    // Simulate common commands
    if (command.includes('mkdir')) {
      return 'Directories created successfully';
    } else if (command.includes('npm install')) {
      return 'Dependencies installed successfully';
    } else if (command.includes('git')) {
      return 'Git command executed successfully';
    }

    return `Mock command executed: ${command}`;
  }

  /**
   * Mock file upload
   */
  async uploadFile(sandboxId: string, path: string, content: string): Promise<void> {
    logger.debug(`Mock uploaded file to ${sandboxId}: ${path}`);
  }

  /**
   * Mock sandbox destruction
   */
  async destroySandbox(sandboxId: string): Promise<void> {
    const sandbox = this.sandboxes.get(sandboxId);
    if (!sandbox) {
      logger.warn(`Sandbox ${sandboxId} not found for destruction`);
      return;
    }

    logger.info(`Destroying mock sandbox ${sandboxId}`);
    this.sandboxes.delete(sandboxId);
  }

  /**
   * Get sandbox information
   */
  getSandboxInfo(sandboxId: string): SandboxEnvironment | null {
    return this.sandboxes.get(sandboxId) || null;
  }

  /**
   * List all mock sandboxes
   */
  listSandboxes(): SandboxEnvironment[] {
    return Array.from(this.sandboxes.values());
  }

  /**
   * Mock team collaboration simulation
   */
  async simulateTeamCollaboration(sandboxId: string): Promise<string[]> {
    const sandbox = this.sandboxes.get(sandboxId);
    if (!sandbox) {
      throw new Error(`Sandbox ${sandboxId} not found`);
    }

    logger.info(`Simulating team collaboration in sandbox ${sandboxId}`);

    const updates: string[] = [];

    // Simulate DevOps agent work
    await new Promise((resolve) => setTimeout(resolve, 300));
    updates.push(
      '🔧 DevOps Agent: Project structure created with frontend/ and backend/ directories'
    );
    updates.push('🔧 DevOps Agent: Configured Vite for React frontend and Express.js backend');
    updates.push('🔧 DevOps Agent: Added package.json files and build scripts');

    // Simulate Backend agent work
    await new Promise((resolve) => setTimeout(resolve, 300));
    updates.push('⚙️ Backend Agent: Created SQLite database schema for todos');
    updates.push(
      '⚙️ Backend Agent: Implemented REST API endpoints (GET/POST/PUT/DELETE /api/todos)'
    );
    updates.push('⚙️ Backend Agent: Added input validation and error handling');

    // Simulate Frontend agent work
    await new Promise((resolve) => setTimeout(resolve, 300));
    updates.push(
      '🎨 Frontend Agent: Created React component structure (TodoApp, TodoList, TodoItem)'
    );
    updates.push('🎨 Frontend Agent: Implemented responsive UI with Tailwind CSS');
    updates.push('🎨 Frontend Agent: Added todo CRUD functionality and status filtering');

    // Final integration
    await new Promise((resolve) => setTimeout(resolve, 200));
    updates.push('✅ Team: Frontend and backend successfully integrated');
    updates.push('✅ Team: Todo list application is complete and ready for demo');
    updates.push('🚀 Team: Application available at http://localhost:3000');

    return updates;
  }
}
