import { Service, elizaLogger, type IAgentRuntime, EventType } from '@elizaos/core';
import { Sandbox } from '@e2b/code-interpreter';
import type {
  E2BServiceType,
  E2BSandboxOptions,
  E2BExecutionResult,
  E2BSandboxHandle,
} from '../types.js';
import { loadE2BConfig, type E2BConfig } from '../config/E2BConfig.js';

/**
 * Improved E2B Service with production-ready features:
 * - Resource management and pooling
 * - Security validation and limits
 * - Proper error handling and recovery
 * - ElizaOS event integration
 * - Configuration management
 * - Concurrent execution controls
 */
export class ImprovedE2BService extends Service implements E2BServiceType {
  static serviceName = 'e2b';
  static readonly serviceType = 'e2b' as const;

  private e2bConfig: E2BConfig;
  private sandboxPool: Map<string, { sandbox: Sandbox; handle: E2BSandboxHandle; inUse: boolean }> =
    new Map();
  private activeSandboxes: Map<string, { sandbox: Sandbox; handle: E2BSandboxHandle }> = new Map();
  private executionQueue: Map<string, Promise<E2BExecutionResult>> = new Map();
  private resourceLock = new Set<string>(); // Simple lock mechanism
  private cleanupTimer?: NodeJS.Timeout;
  private healthCheckTimer?: NodeJS.Timeout;
  private metrics = {
    executionsTotal: 0,
    executionsSuccess: 0,
    executionsFailed: 0,
    currentExecutions: 0,
    sandboxesCreated: 0,
    sandboxesDestroyed: 0,
  };

  capabilityDescription =
    'Provides secure, resource-managed code execution in isolated E2B sandboxes with production-ready controls';

  constructor(runtime?: IAgentRuntime) {
    super(runtime);
    this.e2bConfig = loadE2BConfig(runtime);
    elizaLogger.info('ImprovedE2BService initialized', {
      config: this.getConfigSummary(),
    });
  }

  static async start(runtime: IAgentRuntime): Promise<ImprovedE2BService> {
    const service = new ImprovedE2BService(runtime);
    await service.initialize();
    elizaLogger.info('ImprovedE2BService started successfully');
    return service;
  }

  private async initialize(): Promise<void> {
    try {
      elizaLogger.info('Initializing improved E2B service', {
        environment: this.e2bConfig.environment,
        poolSize: this.e2bConfig.resources.sandboxPoolSize,
      });

      // Validate configuration
      await this.validateConfiguration();

      // Pre-warm sandbox pool if API key is available
      if (this.e2bConfig.apiKey) {
        await this.initializeSandboxPool();
      } else {
        elizaLogger.warn('E2B_API_KEY not provided, service will operate in limited mode');
      }

      // Start background tasks
      this.startCleanupTimer();
      this.startHealthMonitoring();

      // Emit service started event
      if (this.e2bConfig.integration.enableEventEmission && this.runtime) {
        await this.runtime.emitEvent(EventType.ACTION_STARTED, {
          serviceName: 'e2b',
          serviceType: 'code-execution',
          capabilities: this.capabilityDescription,
        });
      }
    } catch (error) {
      elizaLogger.error('Failed to initialize improved E2B service', {
        error: error.message,
        config: this.getConfigSummary(),
      });
      throw error;
    }
  }

  private async validateConfiguration(): Promise<void> {
    // Validate API key format if provided
    if (this.e2bConfig.apiKey && !this.e2bConfig.apiKey.startsWith('e2b_')) {
      elizaLogger.warn('E2B API key does not follow expected format');
    }

    // Test connectivity if in production
    if (this.e2bConfig.environment === 'production' && this.e2bConfig.apiKey) {
      try {
        const testSandbox = await Sandbox.create({
          apiKey: this.e2bConfig.apiKey,
          timeoutMs: 10000,
        });
        await testSandbox.kill();
        elizaLogger.info('E2B connectivity validated');
      } catch (error) {
        throw new Error(`E2B connectivity validation failed: ${error.message}`);
      }
    }
  }

  private async initializeSandboxPool(): Promise<void> {
    elizaLogger.info('Initializing sandbox pool', {
      poolSize: this.e2bConfig.resources.sandboxPoolSize,
    });

    const poolPromises = Array(this.e2bConfig.resources.sandboxPoolSize)
      .fill(0)
      .map(async (_, index) => {
        try {
          const sandbox = await this.createSandboxInstance();
          const handle: E2BSandboxHandle = {
            sandboxId: sandbox.sandboxId,
            isActive: true,
            createdAt: new Date(),
            lastActivity: new Date(),
            template: 'base',
            metadata: { poolIndex: index.toString() },
          };

          this.sandboxPool.set(sandbox.sandboxId, {
            sandbox,
            handle,
            inUse: false,
          });

          this.metrics.sandboxesCreated++;
          elizaLogger.debug('Sandbox added to pool', {
            sandboxId: sandbox.sandboxId,
            poolIndex: index,
          });
        } catch (error) {
          elizaLogger.error('Failed to create sandbox for pool', {
            poolIndex: index,
            error: error.message,
          });
        }
      });

    await Promise.allSettled(poolPromises);
    elizaLogger.info('Sandbox pool initialized', {
      poolSize: this.sandboxPool.size,
      targetSize: this.e2bConfig.resources.sandboxPoolSize,
    });
  }

  private async createSandboxInstance(): Promise<Sandbox> {
    if (!this.e2bConfig.apiKey) {
      throw new Error('E2B API key required for sandbox creation');
    }

    return await Sandbox.create({
      apiKey: this.e2bConfig.apiKey,
      timeoutMs: this.e2bConfig.security.sandboxTimeoutMs,
      envs: {
        ELIZA_EXECUTION: 'true',
        EXECUTION_TIMEOUT: this.e2bConfig.security.maxExecutionTime.toString(),
        MEMORY_LIMIT: this.e2bConfig.resources.memoryLimitMB.toString(),
      },
    });
  }

  async executeCode(code: string, language: string = 'python'): Promise<E2BExecutionResult> {
    // Validate input
    this.validateCodeInput(code, language);

    // Check rate limiting
    await this.checkRateLimit();

    // Get execution ID for tracking
    const executionId = `exec-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    try {
      this.metrics.executionsTotal++;
      this.metrics.currentExecutions++;

      // Emit execution started event
      if (this.e2bConfig.integration.enableEventEmission && this.runtime) {
        await this.runtime.emitEvent(EventType.ACTION_STARTED, {
          actionName: 'EXECUTE_CODE',
          executionId,
          language,
          codeSize: code.length,
        });
      }

      elizaLogger.info('Starting code execution', {
        executionId,
        language,
        codeSize: code.length,
      });

      // Get sandbox from pool or create new one
      const sandbox = await this.acquireSandbox();

      try {
        // Execute code with timeout
        const result = await this.executeCodeInSandbox(sandbox, code, language, executionId);

        this.metrics.executionsSuccess++;

        // Emit execution completed event
        if (this.e2bConfig.integration.enableEventEmission && this.runtime) {
          await this.runtime.emitEvent(EventType.ACTION_COMPLETED, {
            actionName: 'EXECUTE_CODE',
            executionId,
            success: true,
            executionTime: Date.now() - parseInt(executionId.split('-')[1], 10),
          });
        }

        // Store execution result in memory if enabled
        if (this.e2bConfig.integration.enableMemoryFormation && this.runtime) {
          await this.storeExecutionMemory(code, result, language, executionId);
        }

        return result;
      } finally {
        // Return sandbox to pool
        this.releaseSandbox(sandbox.sandboxId);
      }
    } catch (error) {
      this.metrics.executionsFailed++;

      // Emit execution failed event
      if (this.e2bConfig.integration.enableEventEmission && this.runtime) {
        await this.runtime.emitEvent(EventType.ACTION_COMPLETED, {
          actionName: 'EXECUTE_CODE',
          executionId,
          error: error.message,
        });
      }

      elizaLogger.error('Code execution failed', {
        executionId,
        error: error.message,
      });

      throw error;
    } finally {
      this.metrics.currentExecutions--;
    }
  }

  private validateCodeInput(code: string, language: string): void {
    // Check code size
    if (code.length > this.e2bConfig.security.maxCodeSize) {
      throw new Error(
        `Code size exceeds maximum limit of ${this.e2bConfig.security.maxCodeSize} characters`
      );
    }

    // Check language is allowed
    if (!this.e2bConfig.security.allowedLanguages.includes(language.toLowerCase())) {
      throw new Error(
        `Language '${language}' is not allowed. Allowed languages: ${this.e2bConfig.security.allowedLanguages.join(', ')}`
      );
    }

    // Basic security checks
    const dangerousPatterns = [
      /import\s+os/i,
      /import\s+subprocess/i,
      /exec\s*\(/i,
      /eval\s*\(/i,
      /__import__/i,
      /open\s*\(/i,
      /file\s*\(/i,
    ];

    for (const pattern of dangerousPatterns) {
      if (pattern.test(code)) {
        elizaLogger.warn('Potentially dangerous code pattern detected', {
          pattern: pattern.toString(),
          codePreview: code.substring(0, 100),
        });
        // In production, you might want to throw an error here
        // throw new Error(`Dangerous code pattern detected: ${pattern.toString()}`);
      }
    }
  }

  private async checkRateLimit(): Promise<void> {
    // Simple rate limiting implementation
    // In production, you'd want to use Redis or similar for distributed rate limiting
    const _currentTime = Date.now();
    const _windowMs = 60000; // 1 minute
    const _maxRequests = this.e2bConfig.security.rateLimitPerMinute;

    // This is a simplified implementation - in production you'd track per user/IP
    if (this.metrics.currentExecutions >= this.e2bConfig.security.maxConcurrentExecutions) {
      throw new Error(
        `Maximum concurrent executions (${this.e2bConfig.security.maxConcurrentExecutions}) exceeded`
      );
    }
  }

  private async acquireSandbox(): Promise<Sandbox> {
    // Try to get a sandbox from the pool first
    for (const [sandboxId, poolEntry] of this.sandboxPool) {
      if (!poolEntry.inUse && !this.resourceLock.has(sandboxId)) {
        this.resourceLock.add(sandboxId);
        poolEntry.inUse = true;
        poolEntry.handle.lastActivity = new Date();

        elizaLogger.debug('Acquired sandbox from pool', { sandboxId });
        return poolEntry.sandbox;
      }
    }

    // If no pooled sandbox available, create a new one if under limit
    if (this.activeSandboxes.size < this.e2bConfig.resources.maxActiveSandboxes) {
      const sandbox = await this.createSandboxInstance();
      const handle: E2BSandboxHandle = {
        sandboxId: sandbox.sandboxId,
        isActive: true,
        createdAt: new Date(),
        lastActivity: new Date(),
        template: 'base',
        metadata: { temporary: 'true' },
      };

      this.activeSandboxes.set(sandbox.sandboxId, { sandbox, handle });
      this.resourceLock.add(sandbox.sandboxId);
      this.metrics.sandboxesCreated++;

      elizaLogger.debug('Created new temporary sandbox', { sandboxId: sandbox.sandboxId });
      return sandbox;
    }

    throw new Error('Maximum sandbox limit reached and no pooled sandboxes available');
  }

  private releaseSandbox(sandboxId: string): void {
    this.resourceLock.delete(sandboxId);

    // Mark pool sandbox as not in use
    const poolEntry = this.sandboxPool.get(sandboxId);
    if (poolEntry) {
      poolEntry.inUse = false;
      poolEntry.handle.lastActivity = new Date();
      elizaLogger.debug('Released sandbox to pool', { sandboxId });
      return;
    }

    // For temporary sandboxes, we'll clean them up in the background
    const tempSandbox = this.activeSandboxes.get(sandboxId);
    if (tempSandbox) {
      elizaLogger.debug('Marked temporary sandbox for cleanup', { sandboxId });
    }
  }

  private async executeCodeInSandbox(
    sandbox: Sandbox,
    code: string,
    language: string,
    executionId: string
  ): Promise<E2BExecutionResult> {
    const startTime = Date.now();

    try {
      // Set up execution timeout
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => {
          reject(
            new Error(`Code execution timeout after ${this.e2bConfig.security.maxExecutionTime}ms`)
          );
        }, this.e2bConfig.security.maxExecutionTime);
      });

      // Execute code with timeout
      const executionPromise = sandbox.runCode(code, {
        language,
        timeoutMs: this.e2bConfig.security.maxExecutionTime,
      });

      const execution = await Promise.race([executionPromise, timeoutPromise]);

      const result: E2BExecutionResult = {
        text: execution.text,
        results: execution.results.map((r) => r.toJSON()),
        logs: execution.logs,
        error: execution.error
          ? {
              name: execution.error.name,
              value: execution.error.value,
              traceback: execution.error.traceback,
            }
          : undefined,
        executionCount: execution.executionCount,
        executionTime: Date.now() - startTime,
        sandboxId: sandbox.sandboxId,
        language,
      };

      elizaLogger.debug('Code execution completed', {
        executionId,
        sandboxId: sandbox.sandboxId,
        executionTime: result.executionTime,
        hasResult: !!result.text,
        hasError: !!result.error,
      });

      return result;
    } catch (error) {
      const executionTime = Date.now() - startTime;
      elizaLogger.error('Code execution failed in sandbox', {
        executionId,
        sandboxId: sandbox.sandboxId,
        executionTime,
        error: error.message,
      });

      throw error;
    }
  }

  private async storeExecutionMemory(
    code: string,
    result: E2BExecutionResult,
    language: string,
    executionId: string
  ): Promise<void> {
    if (!this.runtime) {
      return;
    }

    try {
      const memoryContent = {
        text: `Code execution in ${language}:\n\`\`\`${language}\n${code}\n\`\`\`\n\nResult: ${result.text || 'No output'}`,
        source: 'e2b-execution',
        metadata: {
          executionId,
          language,
          sandboxId: result.sandboxId,
          executionTime: result.executionTime,
          hasError: !!result.error,
          timestamp: new Date().toISOString(),
        },
      };

      // Generate embedding if enabled
      let embedding;
      if (this.e2bConfig.integration.embeddingEnabled) {
        try {
          embedding = await this.runtime.useModel('TEXT_EMBEDDING', {
            text: `${code}\n${result.text || ''}`,
          });
        } catch (embeddingError) {
          elizaLogger.warn('Failed to generate embedding for execution memory', {
            executionId,
            error: embeddingError.message,
          });
        }
      }

      // Store memory - create a default roomId for service-level executions
      const roomId = this.runtime.agentId; // Use agentId as default roomId for service executions
      await this.runtime.createMemory(
        {
          entityId: this.runtime.agentId,
          roomId,
          content: memoryContent,
          embedding,
        },
        'executions'
      );

      elizaLogger.debug('Execution memory stored', { executionId });
    } catch (error) {
      elizaLogger.error('Failed to store execution memory', {
        executionId,
        error: error.message,
      });
    }
  }

  async createSandbox(opts: E2BSandboxOptions = {}): Promise<string> {
    const sandbox = await this.createSandboxInstance();

    const handle: E2BSandboxHandle = {
      sandboxId: sandbox.sandboxId,
      isActive: true,
      createdAt: new Date(),
      lastActivity: new Date(),
      metadata: opts.metadata,
      template: opts.template || 'base',
    };

    this.activeSandboxes.set(sandbox.sandboxId, { sandbox, handle });
    this.metrics.sandboxesCreated++;

    elizaLogger.info('Sandbox created', { sandboxId: sandbox.sandboxId });
    return sandbox.sandboxId;
  }

  async killSandbox(sandboxId: string): Promise<void> {
    const sandboxData = this.activeSandboxes.get(sandboxId) || this.sandboxPool.get(sandboxId);

    if (!sandboxData) {
      elizaLogger.warn('Attempted to kill non-existent sandbox', { sandboxId });
      return;
    }

    try {
      await sandboxData.sandbox.kill();
      this.activeSandboxes.delete(sandboxId);
      this.sandboxPool.delete(sandboxId);
      this.resourceLock.delete(sandboxId);
      this.metrics.sandboxesDestroyed++;

      elizaLogger.info('Sandbox killed', { sandboxId });
    } catch (error) {
      elizaLogger.error('Failed to kill sandbox', { sandboxId, error: error.message });
      throw error;
    }
  }

  getSandbox(sandboxId: string): E2BSandboxHandle | null {
    const sandboxData = this.activeSandboxes.get(sandboxId) || this.sandboxPool.get(sandboxId);
    return sandboxData?.handle || null;
  }

  listSandboxes(): E2BSandboxHandle[] {
    const allSandboxes = [
      ...Array.from(this.activeSandboxes.values()),
      ...Array.from(this.sandboxPool.values()),
    ];
    return allSandboxes.map((data) => data.handle);
  }

  async isHealthy(): Promise<boolean> {
    try {
      if (this.sandboxPool.size === 0 && !this.e2bConfig.apiKey) {
        return false;
      }

      // Try to get a sandbox for health check
      if (this.sandboxPool.size > 0) {
        const [_sandboxId, poolEntry] = Array.from(this.sandboxPool.entries())[0];
        if (!poolEntry.inUse) {
          const result = await poolEntry.sandbox.runCode('print("health_check")', {
            timeoutMs: 5000,
          });
          return result.text?.includes('health_check') || false;
        }
      }

      return true; // Service is running, even if all sandboxes busy
    } catch {
      return false;
    }
  }

  getMetrics(): typeof this.metrics {
    return { ...this.metrics };
  }

  private startCleanupTimer(): void {
    this.cleanupTimer = setInterval(
      () => this.performCleanup(),
      this.e2bConfig.resources.cleanupIntervalMs
    );
  }

  private startHealthMonitoring(): void {
    if (this.e2bConfig.integration.enableMetricsCollection) {
      this.healthCheckTimer = setInterval(
        () => this.performHealthCheck(),
        60000 // Check every minute
      );
    }
  }

  private async performCleanup(): Promise<void> {
    const now = Date.now();
    const idleTimeout = this.e2bConfig.resources.idleSandboxTimeout;

    // Clean up idle temporary sandboxes
    for (const [sandboxId, sandboxData] of this.activeSandboxes) {
      const idleTime = now - sandboxData.handle.lastActivity.getTime();
      if (idleTime > idleTimeout && sandboxData.handle.metadata?.temporary) {
        try {
          await this.killSandbox(sandboxId);
          elizaLogger.debug('Cleaned up idle temporary sandbox', { sandboxId, idleTime });
        } catch (error) {
          elizaLogger.error('Failed to cleanup idle sandbox', { sandboxId, error: error.message });
        }
      }
    }

    // Log metrics
    if (this.e2bConfig.integration.enableMetricsCollection) {
      elizaLogger.debug('E2B service metrics', this.metrics);
    }
  }

  private async performHealthCheck(): Promise<void> {
    try {
      const isHealthy = await this.isHealthy();
      if (!isHealthy) {
        elizaLogger.warn('E2B service health check failed');

        if (this.e2bConfig.integration.enableEventEmission && this.runtime) {
          await this.runtime.emitEvent(EventType.ACTION_COMPLETED, {
            serviceName: 'e2b',
            reason: 'health_check_failed',
          });
        }
      }
    } catch (error) {
      elizaLogger.error('Health check error', { error: error.message });
    }
  }

  private getConfigSummary(): Record<string, any> {
    return {
      environment: this.e2bConfig.environment,
      hasApiKey: !!this.e2bConfig.apiKey,
      security: {
        maxCodeSize: this.e2bConfig.security.maxCodeSize,
        maxExecutionTime: this.e2bConfig.security.maxExecutionTime,
        allowedLanguages: this.e2bConfig.security.allowedLanguages.length,
      },
      resources: {
        sandboxPoolSize: this.e2bConfig.resources.sandboxPoolSize,
        maxActiveSandboxes: this.e2bConfig.resources.maxActiveSandboxes,
      },
      integration: this.e2bConfig.integration,
    };
  }

  async stop(): Promise<void> {
    elizaLogger.info('Stopping improved E2B service');

    // Clear timers
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
    }
    if (this.healthCheckTimer) {
      clearInterval(this.healthCheckTimer);
    }

    // Kill all sandboxes
    const killPromises = [];

    for (const [sandboxId] of this.activeSandboxes) {
      killPromises.push(this.killSandbox(sandboxId));
    }

    for (const [sandboxId] of this.sandboxPool) {
      killPromises.push(this.killSandbox(sandboxId));
    }

    await Promise.allSettled(killPromises);

    // Clear collections
    this.activeSandboxes.clear();
    this.sandboxPool.clear();
    this.resourceLock.clear();
    this.executionQueue.clear();

    // Emit service stopped event
    if (this.e2bConfig.integration.enableEventEmission && this.runtime) {
      await this.runtime.emitEvent(EventType.ACTION_COMPLETED, {
        serviceName: 'e2b',
        metrics: this.metrics,
      });
    }

    elizaLogger.info('Improved E2B service stopped', { finalMetrics: this.metrics });
  }
}
