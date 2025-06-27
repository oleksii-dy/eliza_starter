import { Service, elizaLogger, type IAgentRuntime } from '@elizaos/core';
import { Sandbox } from '@e2b/code-interpreter';
import type {
  E2BServiceType,
  E2BSandboxOptions,
  E2BExecutionResult,
  E2BSandboxHandle,
} from '../types.js';
import { ErrorInstrumentation } from '../utils/errorInstrumentation.js';

/**
 * Production E2B Service for secure code execution
 */
export class E2BService extends Service implements E2BServiceType {
  static serviceName = 'e2b';
  static serviceType = 'e2b';

  private sandboxes: Map<
    string,
    {
      sandbox: Sandbox;
      handle: E2BSandboxHandle;
    }
  > = new Map();

  private apiKey: string | null = null;
  private defaultTimeout = 300000; // 5 minutes
  private maxSandboxes = 10;
  private cleanupInterval: NodeJS.Timeout | null = null;

  get capabilityDescription(): string {
    return 'E2B service for secure cloud-based code execution with sandbox isolation';
  }

  constructor(runtime: IAgentRuntime) {
    super(runtime);
    this.apiKey = runtime.getSetting('E2B_API_KEY') || null;
  }

  static async start(runtime: IAgentRuntime): Promise<E2BService> {
    const service = new E2BService(runtime);
    await service.initialize();
    return service;
  }

  async initialize(): Promise<void> {
    try {
      elizaLogger.info('Initializing E2B service');

      if (!this.apiKey) {
        throw new Error('E2B_API_KEY not configured');
      }

      // Verify API key by creating a test sandbox
      const testSandboxId = await this.createSandbox({
        timeoutMs: 60000,
        metadata: { purpose: 'initialization-test' },
      });

      // Clean up test sandbox
      await this.killSandbox(testSandboxId);

      // Start cleanup interval for inactive sandboxes
      this.startCleanupInterval();

      elizaLogger.info('E2B service initialized successfully');

      ErrorInstrumentation.logMetrics('E2BService', 'initialize', {
        sandboxCount: this.sandboxes.size,
        serviceReady: true,
      });
    } catch (error) {
      elizaLogger.error('Failed to initialize E2B service', error);
      throw ErrorInstrumentation.instrumentError(error, {
        service: 'E2BService',
        operation: 'initialize',
      });
    }
  }

  async stop(): Promise<void> {
    try {
      elizaLogger.info('Stopping E2B service');

      // Stop cleanup interval
      if (this.cleanupInterval) {
        clearInterval(this.cleanupInterval);
        this.cleanupInterval = null;
      }

      // Kill all active sandboxes
      const sandboxIds = Array.from(this.sandboxes.keys());
      await Promise.all(sandboxIds.map((id) => this.killSandbox(id)));

      elizaLogger.info('E2B service stopped');
    } catch (error) {
      elizaLogger.error('Error stopping E2B service', error);
    }
  }

  async executeCode(code: string, language = 'python'): Promise<E2BExecutionResult> {
    try {
      elizaLogger.debug('Executing code', { language, codeLength: code.length });

      // Get or create a default sandbox
      let sandboxId = this.getDefaultSandboxId();
      if (!sandboxId) {
        sandboxId = await this.createSandbox({
          metadata: { purpose: 'code-execution', language },
        });
      }

      const sandboxData = this.sandboxes.get(sandboxId);
      if (!sandboxData) {
        throw new Error('Sandbox not found');
      }

      const startTime = Date.now();

      // Execute code in sandbox
      const result = await sandboxData.sandbox.runCode(code);

      const executionTime = Date.now() - startTime;

      // Update last activity
      sandboxData.handle.lastActivity = new Date();

      ErrorInstrumentation.logMetrics('E2BService', 'executeCode', {
        language,
        codeLength: code.length,
        executionTime,
        hasError: !!result.error,
        sandboxId,
      });

      return {
        text: result.text,
        results: result.results || [],
        logs: {
          stdout: result.logs?.stdout || [],
          stderr: result.logs?.stderr || [],
        },
        error: result.error,
        executionCount: result.executionCount || 1,
        executionTime,
        sandboxId,
        language,
      };
    } catch (error) {
      elizaLogger.error('Failed to execute code', error);
      throw ErrorInstrumentation.instrumentError(error, {
        service: 'E2BService',
        operation: 'executeCode',
        metadata: { language, codeLength: code.length },
      });
    }
  }

  async createSandbox(opts: E2BSandboxOptions = {}): Promise<string> {
    try {
      // Check sandbox limit
      if (this.sandboxes.size >= this.maxSandboxes) {
        await this.cleanupInactiveSandboxes();
        if (this.sandboxes.size >= this.maxSandboxes) {
          throw new Error(`Maximum sandbox limit (${this.maxSandboxes}) reached`);
        }
      }

      elizaLogger.info('Creating new sandbox', opts);

      const sandboxOptions: any = {
        apiKey: this.apiKey,
        timeout: opts.timeoutMs || this.defaultTimeout,
      };

      if (opts.template) {
        sandboxOptions.template = opts.template;
      }

      if (opts.envs) {
        sandboxOptions.envs = opts.envs;
      }

      const sandbox = await Sandbox.create(sandboxOptions);

      const handle: E2BSandboxHandle = {
        sandboxId: sandbox.sandboxId,
        isActive: true,
        createdAt: new Date(),
        lastActivity: new Date(),
        metadata: opts.metadata,
        template: opts.template || 'base',
      };

      this.sandboxes.set(sandbox.sandboxId, { sandbox, handle });

      elizaLogger.info('Sandbox created successfully', { sandboxId: sandbox.sandboxId });

      return sandbox.sandboxId;
    } catch (error) {
      elizaLogger.error('Failed to create sandbox', error);
      throw ErrorInstrumentation.instrumentError(error, {
        service: 'E2BService',
        operation: 'createSandbox',
        metadata: opts,
      });
    }
  }

  async killSandbox(sandboxId: string): Promise<void> {
    try {
      const sandboxData = this.sandboxes.get(sandboxId);
      if (!sandboxData) {
        elizaLogger.warn('Attempted to kill non-existent sandbox', { sandboxId });
        return;
      }

      elizaLogger.info('Killing sandbox', { sandboxId });

      await sandboxData.sandbox.kill();
      sandboxData.handle.isActive = false;
      this.sandboxes.delete(sandboxId);

      elizaLogger.info('Sandbox killed successfully', { sandboxId });
    } catch (error) {
      elizaLogger.error('Failed to kill sandbox', error);
      this.sandboxes.delete(sandboxId); // Remove from map even if kill fails
    }
  }

  getSandbox(sandboxId: string): E2BSandboxHandle | null {
    const sandboxData = this.sandboxes.get(sandboxId);
    return sandboxData?.handle || null;
  }

  listSandboxes(): E2BSandboxHandle[] {
    return Array.from(this.sandboxes.values()).map((data) => data.handle);
  }

  async writeFileToSandbox(sandboxId: string, path: string, content: string): Promise<void> {
    try {
      const sandboxData = this.sandboxes.get(sandboxId);
      if (!sandboxData) {
        throw new Error(`Sandbox ${sandboxId} not found`);
      }

      // Use code execution to write file
      const code = `
with open("${path}", "w") as f:
    f.write("""${content}""")
`;
      await sandboxData.sandbox.runCode(code);
      sandboxData.handle.lastActivity = new Date();

      elizaLogger.debug('File written to sandbox', { sandboxId, path, size: content.length });
    } catch (error) {
      elizaLogger.error('Failed to write file to sandbox', error);
      throw error;
    }
  }

  async readFileFromSandbox(sandboxId: string, path: string): Promise<string> {
    try {
      const sandboxData = this.sandboxes.get(sandboxId);
      if (!sandboxData) {
        throw new Error(`Sandbox ${sandboxId} not found`);
      }

      // Use code execution to read file
      const code = `
with open("${path}", "r") as f:
    content = f.read()
print(content)
`;
      const result = await sandboxData.sandbox.runCode(code);
      const content = result.logs?.stdout?.join('\n') || '';
      sandboxData.handle.lastActivity = new Date();

      elizaLogger.debug('File read from sandbox', { sandboxId, path, size: content.length });
      return content;
    } catch (error) {
      elizaLogger.error('Failed to read file from sandbox', error);
      throw error;
    }
  }

  async isHealthy(): Promise<boolean> {
    try {
      // Check if we have API key
      if (!this.apiKey) {
        return false;
      }

      // Check if we can list sandboxes
      this.listSandboxes();
      return true;
    } catch (error) {
      elizaLogger.error('Health check failed', error);
      return false;
    }
  }

  private getDefaultSandboxId(): string | null {
    const activeSandboxes = this.listSandboxes().filter((s) => s.isActive);
    return activeSandboxes.length > 0 ? activeSandboxes[0].sandboxId : null;
  }

  private startCleanupInterval(): void {
    // Clean up inactive sandboxes every 5 minutes
    this.cleanupInterval = setInterval(
      () => {
        this.cleanupInactiveSandboxes().catch((error) => {
          elizaLogger.error('Failed to cleanup inactive sandboxes', error);
        });
      },
      5 * 60 * 1000
    );
  }

  private async cleanupInactiveSandboxes(): Promise<void> {
    const now = Date.now();
    const inactivityThreshold = 10 * 60 * 1000; // 10 minutes

    const sandboxesToCleanup: string[] = [];

    for (const [sandboxId, data] of this.sandboxes) {
      const lastActivityTime = data.handle.lastActivity.getTime();
      if (now - lastActivityTime > inactivityThreshold) {
        sandboxesToCleanup.push(sandboxId);
      }
    }

    if (sandboxesToCleanup.length > 0) {
      elizaLogger.info('Cleaning up inactive sandboxes', { count: sandboxesToCleanup.length });
      await Promise.all(sandboxesToCleanup.map((id) => this.killSandbox(id)));
    }
  }
}
