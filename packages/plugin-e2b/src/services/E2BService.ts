import { Service, elizaLogger, type IAgentRuntime } from '@elizaos/core';
import { Sandbox } from '@e2b/code-interpreter';
import type { E2BServiceType, E2BSandboxOptions, E2BExecutionResult, E2BSandboxHandle } from '../types.js';

export class E2BService extends Service implements E2BServiceType {
  static serviceName = 'e2b';
  static readonly serviceType = 'e2b' as const;

  private activeSandboxes: Map<string, { sandbox: Sandbox; handle: E2BSandboxHandle }> = new Map();
  private defaultSandbox?: Sandbox;
  private apiKey?: string;

  capabilityDescription = 'Provides secure code execution in isolated E2B sandboxes with full language support';

  constructor(runtime?: IAgentRuntime) {
    super(runtime);
    this.apiKey = runtime?.getSetting('E2B_API_KEY') || process.env.E2B_API_KEY;
  }

  static async start(runtime: IAgentRuntime): Promise<E2BService> {
    const service = new E2BService(runtime);
    await service.initialize();
    elizaLogger.info('E2BService started successfully');
    return service;
  }

  private async initialize(): Promise<void> {
    try {
      // Test E2B connectivity by creating a test sandbox
      if (this.apiKey) {
        elizaLogger.info('Initializing E2B service with API key');
        const testSandbox = await Sandbox.create({
          apiKey: this.apiKey,
          timeoutMs: 30000,
        });

        // Test basic functionality
        const result = await testSandbox.runCode('print("E2B service initialized successfully")');
        elizaLogger.info('E2B connectivity test passed', { result: result.text });

        // Keep this as default sandbox for quick operations
        this.defaultSandbox = testSandbox;

        // Add to active sandboxes
        this.activeSandboxes.set(testSandbox.sandboxId, {
          sandbox: testSandbox,
          handle: {
            sandboxId: testSandbox.sandboxId,
            isActive: true,
            createdAt: new Date(),
            lastActivity: new Date(),
            template: 'base',
          }
        });
      } else {
        elizaLogger.warn('E2B_API_KEY not provided, creating local sandbox');
        // Try to create without API key (local mode)
        const localSandbox = await Sandbox.create({
          timeoutMs: 30000,
        });

        const result = await localSandbox.runCode('print("E2B local service initialized")');
        elizaLogger.info('E2B local connectivity test passed', { result: result.text });

        this.defaultSandbox = localSandbox;

        this.activeSandboxes.set(localSandbox.sandboxId, {
          sandbox: localSandbox,
          handle: {
            sandboxId: localSandbox.sandboxId,
            isActive: true,
            createdAt: new Date(),
            lastActivity: new Date(),
            template: 'base',
          }
        });
      }
    } catch (error) {
      elizaLogger.error('Failed to initialize E2B service', { error: error.message });
      throw error;
    }
  }

  async stop(): Promise<void> {
    elizaLogger.info('Stopping E2B service');

    // Kill all active sandboxes
    const killPromises = Array.from(this.activeSandboxes.entries()).map(async ([sandboxId, { sandbox }]) => {
      try {
        await sandbox.kill();
        elizaLogger.info('Killed sandbox', { sandboxId });
      } catch (error) {
        elizaLogger.error('Failed to kill sandbox', { sandboxId, error: error.message });
      }
    });

    await Promise.allSettled(killPromises);
    this.activeSandboxes.clear();
    this.defaultSandbox = undefined;

    elizaLogger.info('E2B service stopped');
  }

  async executeCode(code: string, language: string = 'python'): Promise<E2BExecutionResult> {
    if (!this.defaultSandbox) {
      throw new Error('No active sandbox available for code execution');
    }

    try {
      elizaLogger.debug('Executing code in E2B sandbox', {
        sandboxId: this.defaultSandbox.sandboxId,
        language,
        codeLength: code.length
      });

      // Update last activity
      const sandboxData = this.activeSandboxes.get(this.defaultSandbox.sandboxId);
      if (sandboxData) {
        sandboxData.handle.lastActivity = new Date();
      }

      const execution = await this.defaultSandbox.runCode(code, {
        language,
        timeoutMs: 30000,
      });

      const result: E2BExecutionResult = {
        text: execution.text,
        results: execution.results.map(r => r.toJSON()),
        logs: execution.logs,
        error: execution.error ? {
          name: execution.error.name,
          value: execution.error.value,
          traceback: execution.error.traceback,
        } : undefined,
        executionCount: execution.executionCount,
      };

      elizaLogger.debug('Code execution completed', {
        sandboxId: this.defaultSandbox.sandboxId,
        hasResult: !!result.text,
        hasError: !!result.error
      });

      return result;
    } catch (error) {
      elizaLogger.error('Code execution failed', { error: error.message });
      throw error;
    }
  }

  async createSandbox(opts: E2BSandboxOptions = {}): Promise<string> {
    try {
      elizaLogger.info('Creating new E2B sandbox', { opts });

      const createOpts: any = {
        timeoutMs: opts.timeoutMs || 300000,
        metadata: opts.metadata,
        envs: opts.envs,
      };

      if (this.apiKey) {
        createOpts.apiKey = this.apiKey;
      }

      const sandbox = await Sandbox.create(createOpts);

      const handle: E2BSandboxHandle = {
        sandboxId: sandbox.sandboxId,
        isActive: true,
        createdAt: new Date(),
        lastActivity: new Date(),
        metadata: opts.metadata,
        template: opts.template || 'base',
      };

      this.activeSandboxes.set(sandbox.sandboxId, { sandbox, handle });

      elizaLogger.info('E2B sandbox created', { sandboxId: sandbox.sandboxId });
      return sandbox.sandboxId;
    } catch (error) {
      elizaLogger.error('Failed to create E2B sandbox', { error: error.message });
      throw error;
    }
  }

  async killSandbox(sandboxId: string): Promise<void> {
    const sandboxData = this.activeSandboxes.get(sandboxId);

    if (!sandboxData) {
      elizaLogger.warn('Attempted to kill non-existent sandbox', { sandboxId });
      return;
    }

    try {
      elizaLogger.info('Killing E2B sandbox', { sandboxId });

      await sandboxData.sandbox.kill();
      sandboxData.handle.isActive = false;
      this.activeSandboxes.delete(sandboxId);

      // If this was the default sandbox, try to create a new one
      if (this.defaultSandbox?.sandboxId === sandboxId) {
        this.defaultSandbox = undefined;
        try {
          await this.createDefaultSandbox();
        } catch (error) {
          elizaLogger.error('Failed to create replacement default sandbox', { error: error.message });
        }
      }

      elizaLogger.info('E2B sandbox killed', { sandboxId });
    } catch (error) {
      elizaLogger.error('Failed to kill E2B sandbox', { sandboxId, error: error.message });
      throw error;
    }
  }

  private async createDefaultSandbox(): Promise<void> {
    const sandboxId = await this.createSandbox();
    const sandboxData = this.activeSandboxes.get(sandboxId);
    if (sandboxData) {
      this.defaultSandbox = sandboxData.sandbox;
    }
  }

  getSandbox(sandboxId: string): E2BSandboxHandle | null {
    const sandboxData = this.activeSandboxes.get(sandboxId);
    return sandboxData?.handle || null;
  }

  listSandboxes(): E2BSandboxHandle[] {
    return Array.from(this.activeSandboxes.values()).map(data => data.handle);
  }

  // Additional utility methods
  async writeFileToSandbox(sandboxId: string, path: string, content: string): Promise<void> {
    const sandboxData = this.activeSandboxes.get(sandboxId);

    if (!sandboxData) {
      throw new Error(`Sandbox ${sandboxId} not found`);
    }

    try {
      await sandboxData.sandbox.files.write(path, content);
      sandboxData.handle.lastActivity = new Date();
      elizaLogger.debug('File written to sandbox', { sandboxId, path, size: content.length });
    } catch (error) {
      elizaLogger.error('Failed to write file to sandbox', { sandboxId, path, error: error.message });
      throw error;
    }
  }

  async readFileFromSandbox(sandboxId: string, path: string): Promise<string> {
    const sandboxData = this.activeSandboxes.get(sandboxId);

    if (!sandboxData) {
      throw new Error(`Sandbox ${sandboxId} not found`);
    }

    try {
      const content = await sandboxData.sandbox.files.read(path);
      sandboxData.handle.lastActivity = new Date();
      elizaLogger.debug('File read from sandbox', { sandboxId, path, size: content.length });
      return content;
    } catch (error) {
      elizaLogger.error('Failed to read file from sandbox', { sandboxId, path, error: error.message });
      throw error;
    }
  }

  async isHealthy(): Promise<boolean> {
    try {
      if (!this.defaultSandbox) {
        return false;
      }

      const result = await this.defaultSandbox.runCode('print("health_check")', {
        timeoutMs: 5000,
      });

      return result.text?.includes('health_check') || false;
    } catch {
      return false;
    }
  }
}
