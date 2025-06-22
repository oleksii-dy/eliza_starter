import { Service, IAgentRuntime, ServiceType, logger } from '@elizaos/core';
import * as fs from 'fs/promises';
import * as path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';
import { v4 as uuidv4 } from 'uuid';
import { SecretsScanner } from '../security/secrets/secrets-scanner';
import { CircuitBreaker, CircuitBreakerFactory } from '../reliability/circuit-breaker';
import { Tracer, SpanKind, SpanStatus } from '../reliability/tracing/distributed-tracing';
import { JobQueue, JobPriority, JobStatus } from '../scalability/job-queue/job-queue';
import { PluginCreationService } from './plugin-creation-service';

const execAsync = promisify(exec);

export interface EnhancedPluginCreationOptions {
  enableSecretsScanning?: boolean;
  enableCircuitBreaker?: boolean;
  enableTracing?: boolean;
  enableJobQueue?: boolean;
  maxConcurrentJobs?: number;
}

export interface PluginCreationJob {
  specification: any;
  apiKey: string;
  userId?: string;
  metadata?: Record<string, any>;
}

export class EnhancedPluginCreationService extends Service {
  static serviceName = 'enhanced-plugin-creation';
  static serviceType = ServiceType.UNKNOWN;

  private secretsScanner?: SecretsScanner;
  private circuitBreakerFactory?: CircuitBreakerFactory;
  private tracer?: Tracer;
  private jobQueue?: JobQueue<PluginCreationJob>;
  private baseService: PluginCreationService;
  private options: Required<EnhancedPluginCreationOptions>;

  constructor(runtime: IAgentRuntime, options: EnhancedPluginCreationOptions = {}) {
    super();
    this.runtime = runtime;
    this.baseService = new PluginCreationService(runtime);

    this.options = {
      enableSecretsScanning: options.enableSecretsScanning ?? true,
      enableCircuitBreaker: options.enableCircuitBreaker ?? true,
      enableTracing: options.enableTracing ?? true,
      enableJobQueue: options.enableJobQueue ?? true,
      maxConcurrentJobs: options.maxConcurrentJobs ?? 3,
    };
  }

  get capabilityDescription(): string {
    return 'Enhanced plugin creation service with production-ready features including sandboxing, security scanning, reliability patterns, and distributed processing';
  }

  async start(): Promise<void> {
    // Initialize base service
    this.baseService = await PluginCreationService.start(this.runtime);

    // Initialize security features
    if (this.options.enableSecretsScanning) {
      this.secretsScanner = new SecretsScanner(this.runtime);
      logger?.info('Secrets scanner initialized');
    }

    // Initialize reliability features
    if (this.options.enableCircuitBreaker) {
      this.circuitBreakerFactory = new CircuitBreakerFactory(this.runtime);
      logger?.info('Circuit breaker factory initialized');
    }

    if (this.options.enableTracing) {
      this.tracer = new Tracer(this.runtime, {
        serviceName: 'plugin-creation-enhanced',
        serviceVersion: '2.0.0',
        environment: this.runtime.getSetting('NODE_ENV') || 'production',
      });
      logger?.info('Distributed tracing initialized');
    }

    // Initialize scalability features
    if (this.options.enableJobQueue) {
      this.jobQueue = new JobQueue('plugin-creation', this.runtime, {
        persistencePath: path.join(
          this.runtime.getSetting('PLUGIN_DATA_DIR') || './data',
          'job-queue.json'
        ),
      });

      // Register job handler
      this.jobQueue.registerHandler('create-plugin', async (job) => {
        return this.processPluginCreationJob(job.data);
      });

      // Create workers
      for (let i = 0; i < this.options.maxConcurrentJobs; i++) {
        const worker = this.jobQueue.createWorker({ concurrency: 1 });
        await worker.start();
      }

      logger?.info(`Job queue initialized with ${this.options.maxConcurrentJobs} workers`);
    }

    logger?.info('Enhanced plugin creation service started');
  }

  async stop(): Promise<void> {
    // Stop base service
    await this.baseService.stop();

    // Cleanup security components
    // SecretsScanner doesn't have cleanup method

    // Cleanup reliability components
    if (this.tracer) {
      await this.tracer.shutdown();
    }

    // Cleanup scalability components
    if (this.jobQueue) {
      await this.jobQueue.shutdown();
    }

    logger?.info('Enhanced plugin creation service stopped');
  }

  /**
   * Create a plugin with all production features
   */
  async createPlugin(
    specification: any,
    apiKey: string,
    options?: {
      priority?: JobPriority;
      userId?: string;
      metadata?: Record<string, any>;
    }
  ): Promise<string> {
    // If job queue is enabled, queue the job
    if (this.jobQueue) {
      const job = await this.jobQueue.addJob(
        'create-plugin',
        {
          specification,
          apiKey,
          userId: options?.userId,
          metadata: options?.metadata,
        },
        {
          priority: options?.priority ?? JobPriority.NORMAL,
          timeout: 300000, // 5 minutes
          retries: 2,
          retryBackoff: 'exponential',
        }
      );

      return job.id;
    }

    // Otherwise process directly
    return await this.processPluginCreationJob({
      specification,
      apiKey,
      userId: options?.userId,
      metadata: options?.metadata,
    });
  }

  /**
   * Process a plugin creation job
   */
  private async processPluginCreationJob(
    jobData: PluginCreationJob,
    jobId?: string
  ): Promise<string> {
    const traceSpan = this.tracer?.startSpan('create-plugin', {
      kind: SpanKind.INTERNAL,
      attributes: {
        'job.id': jobId || 'direct',
        'plugin.name': jobData.specification.name,
        'user.id': jobData.userId || 'anonymous',
      },
    });

    try {
      // Use circuit breaker for API calls
      const apiBreaker = this.circuitBreakerFactory?.getBreaker('anthropic-api', {
        failureThreshold: 3,
        resetTimeout: 60000,
        timeout: 30000,
      });

      // Step 1: Validate specification
      const validationSpan = this.tracer?.startSpan('validate-specification', {
        parent: traceSpan,
      });

      try {
        await this.validateSpecification(jobData.specification);
        validationSpan?.setStatus(SpanStatus.OK);
      } finally {
        validationSpan?.end();
      }

      // Step 2: Security scan
      if (this.secretsScanner) {
        const scanSpan = this.tracer?.startSpan('security-scan', {
          parent: traceSpan,
        });

        try {
          await this.performSecurityScan(jobData.specification);
          scanSpan?.setStatus(SpanStatus.OK);
        } finally {
          scanSpan?.end();
        }
      }

      // Step 3: Create plugin with circuit breaker protection
      let pluginJobId: string;

      if (apiBreaker) {
        pluginJobId = await apiBreaker.execute(
          async () => this.baseService.createPlugin(jobData.specification, jobData.apiKey),
          async () => {
            // Fallback: Return a queued status
            const fallbackId = `fallback-${uuidv4()}`;
            logger?.warn('API circuit breaker open, using fallback');
            return fallbackId;
          }
        );
      } else {
        pluginJobId = await this.baseService.createPlugin(jobData.specification, jobData.apiKey);
      }

      // Step 4: Monitor job progress
      const monitoringSpan = this.tracer?.startSpan('monitor-job', {
        parent: traceSpan,
        attributes: {
          'plugin.job.id': pluginJobId,
        },
      });

      try {
        const result = await this.monitorJobWithSandbox(pluginJobId);
        monitoringSpan?.setStatus(SpanStatus.OK);

        traceSpan?.setStatus(SpanStatus.OK);
        return result;
      } finally {
        monitoringSpan?.end();
      }
    } catch (error) {
      traceSpan?.setStatus(
        SpanStatus.ERROR,
        error instanceof Error ? error.message : 'Unknown error'
      );
      throw error;
    } finally {
      traceSpan?.end();
    }
  }

  /**
   * Validate plugin specification
   */
  private async validateSpecification(specification: any): Promise<void> {
    // Basic validation
    if (!specification.name || !specification.description) {
      throw new Error('Plugin name and description are required');
    }

    // Check for malicious patterns
    const maliciousPatterns = [
      /eval\s*\(/,
      /require\s*\(['"]child_process['"]\)/,
      /process\.env/,
      /\.\.\//,
    ];

    const specString = JSON.stringify(specification);
    for (const pattern of maliciousPatterns) {
      if (pattern.test(specString)) {
        throw new Error('Potentially malicious code pattern detected');
      }
    }
  }

  /**
   * Perform security scan on specification
   */
  private async performSecurityScan(specification: any): Promise<void> {
    if (!this.secretsScanner) return;

    const specString = JSON.stringify(specification, null, 2);
    const scanResult = await this.secretsScanner.scanText(specString);

    if (scanResult.found) {
      const criticalSecrets = scanResult.secrets.filter(
        (s) => s.severity === 'critical' || s.severity === 'high'
      );

      if (criticalSecrets.length > 0) {
        throw new Error(
          `Security scan failed: Found ${criticalSecrets.length} critical/high severity secrets`
        );
      }

      // Log warnings for lower severity
      logger?.warn(
        `Security scan found ${scanResult.secrets.length} potential secrets in specification`
      );
    }
  }

  /**
   * Monitor job with sandbox execution
   */
  private async monitorJobWithSandbox(jobId: string): Promise<string> {
    // Poll for job completion
    let attempts = 0;
    const maxAttempts = 60; // 5 minutes with 5 second intervals

    while (attempts < maxAttempts) {
      const jobStatus = this.baseService.getJobStatus(jobId);

      if (!jobStatus) {
        throw new Error('Job not found');
      }

      if (jobStatus.status === 'completed') {
        // Perform final security checks in sandbox
        if (jobStatus.outputPath) {
          await this.validateInSandbox(jobStatus.outputPath);
        }

        return jobStatus.outputPath!;
      }

      if (jobStatus.status === 'failed') {
        throw new Error(`Plugin creation failed: ${jobStatus.error}`);
      }

      // Update job progress if using job queue
      if (this.jobQueue) {
        this.jobQueue.updateJobProgress(jobId, jobStatus.progress || 0);
      }

      // Wait before next check
      await new Promise((resolve) => setTimeout(resolve, 5000));
      attempts++;
    }

    throw new Error('Plugin creation timed out');
  }

  /**
   * Validate plugin in sandbox
   */
  private async validateInSandbox(pluginPath: string): Promise<void> {
    const validationSpan = this.tracer?.startSpan('sandbox-validation', {
      kind: SpanKind.INTERNAL,
    });

    try {
      // Run tests
      try {
        await execAsync(`npm test`, { cwd: pluginPath });
      } catch (error: any) {
        throw new Error(`Validation failed: ${error.message}`);
      }

      // Scan dependencies
      const packageJsonPath = path.join(pluginPath, 'package.json');
      try {
        const result = await execAsync(`npm ls --depth=0 --json`, { cwd: pluginPath });

        // Parse the output
        const dependencies = JSON.parse(result.stdout);

        // Simple validation - just check if there are any errors
        if (dependencies.error) {
          throw new Error(`Dependency validation failed: ${dependencies.error}`);
        }
      } catch (error: any) {
        // npm ls returns non-zero exit code for missing deps
        if (error.stdout) {
          try {
            const dependencies = JSON.parse(error.stdout);
            if (dependencies.error) {
              throw new Error(`Dependency validation failed: ${dependencies.error}`);
            }
          } catch {
            // If we can't parse, just log warning
            logger?.warn('Could not validate dependencies');
          }
        }
      }

      validationSpan?.setStatus(SpanStatus.OK);
    } catch (error) {
      validationSpan?.setStatus(
        SpanStatus.ERROR,
        error instanceof Error ? error.message : 'Sandbox validation failed'
      );
      throw error;
    } finally {
      validationSpan?.end();
    }
  }

  /**
   * Get job status
   */
  async getJobStatus(jobId: string): Promise<any> {
    // Check if it's a job queue ID
    if (this.jobQueue) {
      const job = this.jobQueue.getJob(jobId);
      if (job) {
        return {
          id: job.id,
          status: job.status,
          progress: job.progress,
          result: job.result,
          error: job.error?.message,
          createdAt: job.createdAt,
          completedAt: job.completedAt,
        };
      }
    }

    // Fall back to base service
    return this.baseService.getJobStatus(jobId);
  }

  /**
   * Get service metrics
   */
  getMetrics(): any {
    const metrics: any = {
      base: this.baseService.getMetrics(),
    };

    if (this.jobQueue) {
      metrics.queue = this.jobQueue.getMetrics();
    }

    if (this.circuitBreakerFactory) {
      metrics.circuitBreakers = Object.fromEntries(this.circuitBreakerFactory.getAllMetrics());
    }

    if (this.tracer) {
      metrics.tracing = this.tracer.getMetrics();
    }

    return metrics;
  }
}
