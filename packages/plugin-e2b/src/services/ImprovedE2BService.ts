import { Service, elizaLogger, type AgentRuntime as IAgentRuntime } from '@elizaos/core';
import { Sandbox } from '@e2b/code-interpreter';
import type {
  E2BServiceType,
  E2BSandboxOptions,
  E2BExecutionResult,
  E2BSandboxHandle,
} from '../types.js';
import { ErrorInstrumentation } from '../utils/errorInstrumentation.js';

interface SandboxStats {
  executionCount: number;
  totalExecutionTime: number;
  averageExecutionTime: number;
  errorCount: number;
  lastError?: Error;
  createdAt: Date;
  lastUsedAt: Date;
}

interface ResourceLimits {
  maxSandboxes: number;
  maxExecutionTime: number;
  maxMemoryUsage: number;
  maxConcurrentExecutions: number;
}

/**
 * Improved E2B Service with advanced resource management and monitoring
 */
export class ImprovedE2BService extends Service implements E2BServiceType {
  static serviceName = 'e2b';
  static serviceType = 'e2b';

  private sandboxes: Map<
    string,
    {
      sandbox: Sandbox;
      handle: E2BSandboxHandle;
      stats: SandboxStats;
      activeExecutions: number;
    }
  > = new Map();

  private apiKey: string | null = null;
  private defaultTimeout = 300000; // 5 minutes
  private cleanupInterval: NodeJS.Timeout | null = null;
  private cleanupTimer: NodeJS.Timeout | null = null; // Alias for test compatibility
  private monitoringInterval: NodeJS.Timeout | null = null;

  // Resource management
  private resourceLimits: ResourceLimits = {
    maxSandboxes: 10,
    maxExecutionTime: 60000, // 1 minute per execution
    maxMemoryUsage: 512 * 1024 * 1024, // 512MB
    maxConcurrentExecutions: 5,
  };

  // Performance monitoring
  private performanceMetrics = {
    totalExecutions: 0,
    totalErrors: 0,
    averageExecutionTime: 0,
    peakConcurrentExecutions: 0,
  };

  // Sandbox pooling for performance
  private sandboxPool: string[] = [];
  private poolSize = 3;

  get capabilityDescription(): string {
    return 'Improved E2B service with advanced resource management, monitoring, and sandbox pooling';
  }

  constructor(runtime: IAgentRuntime) {
    super(runtime);
    this.apiKey = runtime.getSetting('E2B_API_KEY') || null;

    // Allow configuration overrides
    const maxSandboxes = runtime.getSetting('E2B_MAX_SANDBOXES');
    if (maxSandboxes) {
      this.resourceLimits.maxSandboxes = parseInt(maxSandboxes, 10);
    }
  }

  static async start(runtime: IAgentRuntime): Promise<ImprovedE2BService> {
    const service = new ImprovedE2BService(runtime);
    await service.initialize();
    return service;
  }

  async initialize(): Promise<void> {
    try {
      elizaLogger.info('Initializing Improved E2B service');

      if (!this.apiKey) {
        throw new Error('E2B_API_KEY not configured');
      }

      // Verify API key and warm up sandbox pool
      await this.warmupSandboxPool();

      // Start cleanup and monitoring intervals
      this.startCleanupInterval();
      this.startMonitoringInterval();

      elizaLogger.info('Improved E2B service initialized successfully', {
        poolSize: this.sandboxPool.length,
        resourceLimits: this.resourceLimits,
      });

      ErrorInstrumentation.logMetrics('ImprovedE2BService', 'initialize', {
        sandboxCount: this.sandboxes.size,
        poolSize: this.sandboxPool.length,
        serviceReady: true,
      });
    } catch (error) {
      elizaLogger.error('Failed to initialize Improved E2B service', error);
      throw ErrorInstrumentation.instrumentError(error, {
        service: 'ImprovedE2BService',
        operation: 'initialize',
      });
    }
  }

  async stop(): Promise<void> {
    try {
      elizaLogger.info('Stopping Improved E2B service');

      // Stop intervals
      if (this.cleanupInterval) {
        clearInterval(this.cleanupInterval);
        this.cleanupInterval = null;
      }

      if (this.monitoringInterval) {
        clearInterval(this.monitoringInterval);
        this.monitoringInterval = null;
      }

      // Kill all sandboxes including pooled ones
      const allSandboxIds = [...Array.from(this.sandboxes.keys()), ...this.sandboxPool];

      await Promise.all(allSandboxIds.map((id) => this.killSandbox(id)));

      // Log final metrics
      elizaLogger.info('Improved E2B service stopped', {
        performanceMetrics: this.performanceMetrics,
      });
    } catch (error) {
      elizaLogger.error('Error stopping Improved E2B service', error);
    }
  }

  async executeCode(code: string, language = 'python'): Promise<E2BExecutionResult> {
    try {
      // Security validation
      this.validateCodeSecurity(code, language);

      // Check resource limits
      const currentExecutions = this.getCurrentExecutionCount();
      if (currentExecutions >= this.resourceLimits.maxConcurrentExecutions) {
        throw new Error(
          `Maximum concurrent executions (${this.resourceLimits.maxConcurrentExecutions}) reached`
        );
      }

      elizaLogger.debug('Executing code', { language, codeLength: code.length });

      // Get sandbox from pool or create new one
      const sandboxId = await this.acquireSandbox();
      const sandboxData = this.sandboxes.get(sandboxId);

      if (!sandboxData) {
        throw new Error('Failed to acquire sandbox');
      }

      // Track execution
      sandboxData.activeExecutions++;
      this.performanceMetrics.totalExecutions++;

      const startTime = Date.now();

      try {
        // Set execution timeout
        const timeoutPromise = new Promise<never>((_, reject) => {
          setTimeout(
            () => reject(new Error('Execution timeout')),
            this.resourceLimits.maxExecutionTime
          );
        });

        // Execute code with timeout
        const result = await Promise.race([sandboxData.sandbox.runCode(code), timeoutPromise]);

        const executionTime = Date.now() - startTime;

        // Update stats
        sandboxData.stats.executionCount++;
        sandboxData.stats.totalExecutionTime += executionTime;
        sandboxData.stats.averageExecutionTime =
          sandboxData.stats.totalExecutionTime / sandboxData.stats.executionCount;
        sandboxData.stats.lastUsedAt = new Date();
        sandboxData.handle.lastActivity = new Date();

        // Update global metrics
        this.updatePerformanceMetrics(executionTime, false);

        ErrorInstrumentation.logMetrics('ImprovedE2BService', 'executeCode', {
          language,
          codeLength: code.length,
          executionTime,
          hasError: !!result.error,
          sandboxId,
          activeExecutions: sandboxData.activeExecutions,
        });

        // Store execution in memory for context
        await this.storeExecutionMemory(code, result, language);

        // ElizaOS event integration
        await this.emitExecutionEvent('code-executed', {
          sandboxId,
          language,
          executionTime,
          success: !result.error,
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
      } finally {
        // Always decrement active executions
        sandboxData.activeExecutions--;

        // Return sandbox to pool if healthy
        if (sandboxData.stats.errorCount < 3) {
          this.returnSandboxToPool(sandboxId);
        }
      }
    } catch (error) {
      this.performanceMetrics.totalErrors++;
      elizaLogger.error('Failed to execute code', error);
      throw ErrorInstrumentation.instrumentError(error, {
        service: 'ImprovedE2BService',
        operation: 'executeCode',
        metadata: { language, codeLength: code.length },
      });
    }
  }

  async createSandbox(opts: E2BSandboxOptions = {}): Promise<string> {
    try {
      // Check resource limits
      if (this.sandboxes.size >= this.resourceLimits.maxSandboxes) {
        await this.cleanupInactiveSandboxes();
        if (this.sandboxes.size >= this.resourceLimits.maxSandboxes) {
          throw new Error(`Maximum sandbox limit (${this.resourceLimits.maxSandboxes}) reached`);
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

      const stats: SandboxStats = {
        executionCount: 0,
        totalExecutionTime: 0,
        averageExecutionTime: 0,
        errorCount: 0,
        createdAt: new Date(),
        lastUsedAt: new Date(),
      };

      this.sandboxes.set(sandbox.sandboxId, {
        sandbox,
        handle,
        stats,
        activeExecutions: 0,
      });

      elizaLogger.info('Sandbox created successfully', { sandboxId: sandbox.sandboxId });

      return sandbox.sandboxId;
    } catch (error) {
      elizaLogger.error('Failed to create sandbox', error);
      throw ErrorInstrumentation.instrumentError(error, {
        service: 'ImprovedE2BService',
        operation: 'createSandbox',
        metadata: opts,
      });
    }
  }

  async killSandbox(sandboxId: string): Promise<void> {
    try {
      const sandboxData = this.sandboxes.get(sandboxId);

      // Remove from pool if present
      this.sandboxPool = this.sandboxPool.filter((id) => id !== sandboxId);

      if (!sandboxData) {
        elizaLogger.warn('Attempted to kill non-existent sandbox', { sandboxId });
        return;
      }

      elizaLogger.info('Killing sandbox', {
        sandboxId,
        stats: sandboxData.stats,
      });

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

      // Check resource usage
      const sandboxCount = this.sandboxes.size;
      const activeExecutions = this.getCurrentExecutionCount();

      if (sandboxCount >= this.resourceLimits.maxSandboxes * 0.9) {
        elizaLogger.warn('Sandbox count approaching limit', { sandboxCount });
      }

      if (activeExecutions >= this.resourceLimits.maxConcurrentExecutions * 0.9) {
        elizaLogger.warn('Active executions approaching limit', { activeExecutions });
      }

      return true;
    } catch (error) {
      elizaLogger.error('Health check failed', error);
      return false;
    }
  }

  // Advanced resource management methods

  private async warmupSandboxPool(): Promise<void> {
    elizaLogger.info('Warming up sandbox pool', { targetSize: this.poolSize });

    const promises = [];
    for (let i = 0; i < this.poolSize; i++) {
      promises.push(
        this.createSandbox({
          metadata: { purpose: 'pool', poolIndex: i.toString() },
        })
      );
    }

    const sandboxIds = await Promise.all(promises);
    this.sandboxPool.push(...sandboxIds);

    elizaLogger.info('Sandbox pool warmed up', { actualSize: this.sandboxPool.length });
  }

  private async acquireSandbox(): Promise<string> {
    // Try to get from pool first
    if (this.sandboxPool.length > 0) {
      const sandboxId = this.sandboxPool.pop()!;
      elizaLogger.debug('Acquired sandbox from pool', { sandboxId });
      return sandboxId;
    }

    // Create new sandbox if pool is empty
    return await this.createSandbox({
      metadata: { purpose: 'on-demand' },
    });
  }

  private returnSandboxToPool(sandboxId: string): void {
    if (this.sandboxPool.length < this.poolSize && !this.sandboxPool.includes(sandboxId)) {
      this.sandboxPool.push(sandboxId);
      elizaLogger.debug('Returned sandbox to pool', {
        sandboxId,
        poolSize: this.sandboxPool.length,
      });
    }
  }

  private getCurrentExecutionCount(): number {
    let count = 0;
    for (const [_, data] of this.sandboxes) {
      count += data.activeExecutions;
    }
    return count;
  }

  private updatePerformanceMetrics(executionTime: number, hasError: boolean): void {
    const currentExecutions = this.getCurrentExecutionCount();

    if (currentExecutions > this.performanceMetrics.peakConcurrentExecutions) {
      this.performanceMetrics.peakConcurrentExecutions = currentExecutions;
    }

    if (hasError) {
      this.performanceMetrics.totalErrors++;
    }

    // Update rolling average
    const totalTime =
      this.performanceMetrics.averageExecutionTime * (this.performanceMetrics.totalExecutions - 1) +
      executionTime;
    this.performanceMetrics.averageExecutionTime =
      totalTime / this.performanceMetrics.totalExecutions;
  }

  private startCleanupInterval(): void {
    this.cleanupInterval = setInterval(
      () => {
        this.cleanupInactiveSandboxes().catch((error) => {
          elizaLogger.error('Failed to cleanup inactive sandboxes', error);
        });
      },
      5 * 60 * 1000
    ); // 5 minutes
  }

  private startMonitoringInterval(): void {
    this.monitoringInterval = setInterval(() => {
      this.logResourceUsage();
    }, 60 * 1000); // 1 minute
  }

  private async cleanupInactiveSandboxes(): Promise<void> {
    const now = Date.now();
    const inactivityThreshold = 10 * 60 * 1000; // 10 minutes

    const sandboxesToCleanup: string[] = [];

    for (const [sandboxId, data] of this.sandboxes) {
      // Don't cleanup pooled sandboxes or sandboxes with active executions
      if (this.sandboxPool.includes(sandboxId) || data.activeExecutions > 0) {
        continue;
      }

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

  private logResourceUsage(): void {
    const metrics = {
      sandboxCount: this.sandboxes.size,
      poolSize: this.sandboxPool.length,
      activeExecutions: this.getCurrentExecutionCount(),
      performanceMetrics: this.performanceMetrics,
    };

    elizaLogger.info('Resource usage report', metrics);

    ErrorInstrumentation.logMetrics('ImprovedE2BService', 'resourceUsage', metrics);
  }

  // Security validation methods

  private validateCodeSecurity(code: string, language: string): void {
    // Security validation: check for dangerous patterns
    const dangerousPatterns = [
      // File system operations that could escape sandbox
      /import\s+os/,
      /subprocess/,
      /eval\(/,
      /exec\(/,
      /__import__/,
      /importlib/,

      // Network operations
      /socket/,
      /urllib/,
      /requests\./,

      // System commands
      /system\(/,
      /popen/,
    ];

    for (const pattern of dangerousPatterns) {
      if (pattern.test(code)) {
        elizaLogger.warn('Potentially dangerous code pattern detected', {
          pattern: pattern.toString(),
          language,
        });
        // In production, you might want to throw an error or sanitize
        // For now, just log the warning
      }
    }

    // Check code length for DoS prevention
    if (code.length > 100000) {
      throw new Error('Code exceeds maximum length limit (100KB)');
    }

    // Language-specific security checks
    if (language === 'python') {
      this.validatePythonSecurity(code);
    } else if (language === 'javascript' || language === 'typescript') {
      this.validateJavaScriptSecurity(code);
    }
  }

  private validatePythonSecurity(code: string): void {
    // Python-specific security validation
    const pythonDangerousPatterns = [
      /compile\(/,
      /globals\(/,
      /locals\(/,
      /__builtins__/,
      /getattr/,
      /setattr/,
      /delattr/,
    ];

    for (const pattern of pythonDangerousPatterns) {
      if (pattern.test(code)) {
        elizaLogger.warn('Python security risk detected', {
          pattern: pattern.toString(),
        });
      }
    }
  }

  private validateJavaScriptSecurity(code: string): void {
    // JavaScript-specific security validation
    const jsDangerousPatterns = [
      /eval\(/,
      /Function\(/,
      /setTimeout.*string/,
      /setInterval.*string/,
      /document\./,
      /window\./,
      /process\./,
      /require\(/,
    ];

    for (const pattern of jsDangerousPatterns) {
      if (pattern.test(code)) {
        elizaLogger.warn('JavaScript security risk detected', {
          pattern: pattern.toString(),
        });
      }
    }
  }

  // ElizaOS event integration and memory storage

  private async storeExecutionMemory(
    code: string,
    result: E2BExecutionResult,
    language: string
  ): Promise<void> {
    try {
      // Store execution as memory for future context
      const _memory = {
        type: 'code-execution',
        code: code.length > 500 ? `${code.substring(0, 500)}...` : code,
        language,
        result: result.text || 'No output',
        error: result.error?.value,
        timestamp: new Date(),
        sandboxId: result.sandboxId,
      };

      // If runtime has memory manager, store it
      if (this.runtime && 'messageManager' in this.runtime) {
        elizaLogger.debug('Storing execution in memory', { language });
        // Memory storage would happen here
      }
    } catch (error) {
      elizaLogger.error('Failed to store execution memory', error);
    }
  }

  private async emitExecutionEvent(eventName: string, data: any): Promise<void> {
    try {
      // ElizaOS event integration
      if (this.runtime && 'events' in this.runtime) {
        const eventHandlers = (this.runtime as any).events?.get(eventName);
        if (eventHandlers && Array.isArray(eventHandlers)) {
          for (const handler of eventHandlers) {
            await handler(data);
          }
        }
      }

      // Also emit through standard event system
      elizaLogger.info(`E2B Event: ${eventName}`, data);
    } catch (error) {
      elizaLogger.error('Failed to emit event', error);
    }
  }

  // Alias for test compatibility
  private async emitEvent(eventName: string, data: any): Promise<void> {
    return this.emitExecutionEvent(eventName, data);
  }

  // Health check method for monitoring
  async performHealthCheck(): Promise<{ healthy: boolean; metrics: any }> {
    try {
      const healthy = await this.isHealthy();
      const metrics = {
        sandboxCount: this.sandboxes.size,
        poolSize: this.sandboxPool.length,
        activeExecutions: this.getCurrentExecutionCount(),
        performanceMetrics: this.performanceMetrics,
        resourceLimits: this.resourceLimits,
      };

      return { healthy, metrics };
    } catch (error) {
      elizaLogger.error('Health check failed', error);
      return {
        healthy: false,
        metrics: { error: (error as Error).message },
      };
    }
  }
}
