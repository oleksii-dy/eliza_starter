import { EventEmitter } from 'events';
import { IAgentRuntime, logger } from '@elizaos/core';
import { v4 as uuidv4 } from 'uuid';
import * as fs from 'fs/promises';
import * as path from 'path';

export enum JobPriority {
  CRITICAL = 0,
  HIGH = 1,
  NORMAL = 2,
  LOW = 3,
}

export enum JobStatus {
  PENDING = 'pending',
  RUNNING = 'running',
  COMPLETED = 'completed',
  FAILED = 'failed',
  CANCELLED = 'cancelled',
  SCHEDULED = 'scheduled',
  RETRYING = 'retrying',
}

export interface JobOptions {
  priority?: JobPriority;
  delay?: number;
  timeout?: number;
  retries?: number;
  retryDelay?: number;
  retryBackoff?: 'fixed' | 'exponential' | 'linear';
  removeOnComplete?: boolean;
  removeOnFail?: boolean;
  metadata?: Record<string, any>;
}

export interface Job<T = any> {
  id: string;
  name: string;
  data: T;
  status: JobStatus;
  priority: JobPriority;
  attempts: number;
  maxRetries: number;
  createdAt: Date;
  processedAt?: Date;
  completedAt?: Date;
  failedAt?: Date;
  scheduledFor?: Date;
  nextRetryAt?: Date;
  result?: any;
  error?: Error;
  progress?: number;
  logs: string[];
  options: Required<JobOptions>;
  workerId?: string;
}

export type JobHandler<T = any> = (job: Job<T>) => Promise<any>;

export interface WorkerOptions {
  concurrency?: number;
  pollInterval?: number;
  shutdownTimeout?: number;
  heartbeatInterval?: number;
}

export interface QueueMetrics {
  pending: number;
  running: number;
  completed: number;
  failed: number;
  scheduled: number;
  throughput: number;
  averageProcessingTime: number;
  errorRate: number;
}

export class JobQueue<T = any> extends EventEmitter {
  private jobs = new Map<string, Job<T>>();
  private handlers = new Map<string, JobHandler<T>>();
  private workers = new Map<string, Worker<T>>();
  private metrics = {
    processed: 0,
    failed: 0,
    totalProcessingTime: 0,
  };
  private persistencePath?: string;
  private persistTimer?: NodeJS.Timer;

  constructor(
    private readonly name: string,
    private readonly runtime: IAgentRuntime,
    options?: {
      persistencePath?: string;
      persistInterval?: number;
    }
  ) {
    super();

    if (options?.persistencePath) {
      this.persistencePath = options.persistencePath;
      this.startPersistence(options.persistInterval || 5000);
      this.loadJobs().catch((err) => logger?.error('Failed to load persisted jobs:', err));
    }
  }

  /**
   * Register a job handler
   */
  registerHandler(jobName: string, handler: JobHandler<T>): void {
    this.handlers.set(jobName, handler);
    this.emit('handlerRegistered', jobName);
  }

  /**
   * Add a job to the queue
   */
  async addJob(name: string, data: T, options: JobOptions = {}): Promise<Job<T>> {
    const job: Job<T> = {
      id: uuidv4(),
      name,
      data,
      status: options.delay ? JobStatus.SCHEDULED : JobStatus.PENDING,
      priority: options.priority ?? JobPriority.NORMAL,
      attempts: 0,
      maxRetries: options.retries ?? 3,
      createdAt: new Date(),
      scheduledFor: options.delay ? new Date(Date.now() + options.delay) : undefined,
      logs: [],
      options: {
        priority: options.priority ?? JobPriority.NORMAL,
        delay: options.delay ?? 0,
        timeout: options.timeout ?? 30000,
        retries: options.retries ?? 3,
        retryDelay: options.retryDelay ?? 1000,
        retryBackoff: options.retryBackoff ?? 'exponential',
        removeOnComplete: options.removeOnComplete ?? false,
        removeOnFail: options.removeOnFail ?? false,
        metadata: options.metadata ?? {},
      },
    };

    this.jobs.set(job.id, job);
    this.emit('jobAdded', job);

    if (job.status === JobStatus.PENDING) {
      this.notifyWorkers();
    }

    return job;
  }

  /**
   * Add multiple jobs
   */
  async addBulkJobs(
    jobs: Array<{ name: string; data: T; options?: JobOptions }>
  ): Promise<Job<T>[]> {
    const addedJobs: Job<T>[] = [];

    for (const jobDef of jobs) {
      const job = await this.addJob(jobDef.name, jobDef.data, jobDef.options);
      addedJobs.push(job);
    }

    return addedJobs;
  }

  /**
   * Get a job by ID
   */
  getJob(jobId: string): Job<T> | undefined {
    return this.jobs.get(jobId);
  }

  /**
   * Get all jobs
   */
  getAllJobs(): Job<T>[] {
    return Array.from(this.jobs.values());
  }

  /**
   * Get jobs by status
   */
  getJobsByStatus(status: JobStatus): Job<T>[] {
    return Array.from(this.jobs.values()).filter((job) => job.status === status);
  }

  /**
   * Cancel a job
   */
  async cancelJob(jobId: string): Promise<boolean> {
    const job = this.jobs.get(jobId);
    if (!job) {
      return false;
    }

    if (job.status === JobStatus.RUNNING) {
      // Notify worker to stop
      this.emit('jobCancelled', job);
    }

    job.status = JobStatus.CANCELLED;
    job.logs.push(`[${new Date().toISOString()}] Job cancelled`);

    return true;
  }

  /**
   * Retry a failed job
   */
  async retryJob(jobId: string): Promise<Job<T> | null> {
    const job = this.jobs.get(jobId);
    if (!job || job.status !== JobStatus.FAILED) {
      return null;
    }

    job.status = JobStatus.PENDING;
    job.attempts = 0;
    job.error = undefined;
    job.failedAt = undefined;
    job.logs.push(`[${new Date().toISOString()}] Job manually retried`);

    this.notifyWorkers();
    return job;
  }

  /**
   * Update job progress
   */
  updateJobProgress(jobId: string, progress: number): void {
    const job = this.jobs.get(jobId);
    if (job && job.status === JobStatus.RUNNING) {
      job.progress = Math.max(0, Math.min(100, progress));
      this.emit('jobProgress', job);
    }
  }

  /**
   * Create a worker
   */
  createWorker(options: WorkerOptions = {}): Worker<T> {
    const worker = new Worker(this, this.runtime, options);
    this.workers.set(worker.id, worker);

    worker.on('stopped', () => {
      this.workers.delete(worker.id);
    });

    return worker;
  }

  /**
   * Get queue metrics
   */
  getMetrics(): QueueMetrics {
    const jobs = Array.from(this.jobs.values());
    const now = Date.now();
    const oneMinuteAgo = now - 60000;

    const recentCompleted = jobs.filter(
      (j) =>
        j.status === JobStatus.COMPLETED && j.completedAt && j.completedAt.getTime() > oneMinuteAgo
    );

    const throughput = recentCompleted.length;
    const errorRate = this.metrics.processed > 0 ? this.metrics.failed / this.metrics.processed : 0;

    return {
      pending: jobs.filter((j) => j.status === JobStatus.PENDING).length,
      running: jobs.filter((j) => j.status === JobStatus.RUNNING).length,
      completed: jobs.filter((j) => j.status === JobStatus.COMPLETED).length,
      failed: jobs.filter((j) => j.status === JobStatus.FAILED).length,
      scheduled: jobs.filter((j) => j.status === JobStatus.SCHEDULED).length,
      throughput,
      averageProcessingTime:
        this.metrics.processed > 0 ? this.metrics.totalProcessingTime / this.metrics.processed : 0,
      errorRate,
    };
  }

  /**
   * Clean old jobs
   */
  async clean(olderThan: number, status?: JobStatus): Promise<number> {
    const cutoff = Date.now() - olderThan;
    let removed = 0;

    for (const [jobId, job] of this.jobs) {
      const jobTime = (job.completedAt || job.failedAt || job.createdAt).getTime();

      if (jobTime < cutoff && (!status || job.status === status)) {
        this.jobs.delete(jobId);
        removed++;
      }
    }

    this.emit('cleaned', removed);
    return removed;
  }

  /**
   * Process next job (internal)
   */
  async processNextJob(workerId: string): Promise<Job<T> | null> {
    // Check scheduled jobs
    await this.promoteScheduledJobs();

    // Get next pending job by priority
    const pendingJobs = this.getJobsByStatus(JobStatus.PENDING).sort((a, b) => {
      if (a.priority !== b.priority) {
        return a.priority - b.priority;
      }
      return a.createdAt.getTime() - b.createdAt.getTime();
    });

    if (pendingJobs.length === 0) {
      return null;
    }

    const job = pendingJobs[0];
    job.status = JobStatus.RUNNING;
    job.workerId = workerId;
    job.processedAt = new Date();
    job.attempts++;

    return job;
  }

  /**
   * Mark job as completed (internal)
   */
  completeJob(jobId: string, result: any): void {
    const job = this.jobs.get(jobId);
    if (!job) return;

    job.status = JobStatus.COMPLETED;
    job.result = result;
    job.completedAt = new Date();
    job.progress = 100;

    const processingTime = job.completedAt.getTime() - job.processedAt!.getTime();
    this.metrics.processed++;
    this.metrics.totalProcessingTime += processingTime;

    this.emit('jobCompleted', job);

    if (job.options.removeOnComplete) {
      this.jobs.delete(jobId);
    }
  }

  /**
   * Mark job as failed (internal)
   */
  failJob(jobId: string, error: Error): void {
    const job = this.jobs.get(jobId);
    if (!job) return;

    job.error = error;
    job.failedAt = new Date();
    this.metrics.failed++;

    if (job.attempts < job.maxRetries) {
      // Schedule retry
      job.status = JobStatus.RETRYING;
      const delay = this.calculateRetryDelay(job);
      job.nextRetryAt = new Date(Date.now() + delay);
      job.logs.push(
        `[${new Date().toISOString()}] Retry scheduled for ${job.nextRetryAt.toISOString()}`
      );
    } else {
      job.status = JobStatus.FAILED;
      this.emit('jobFailed', job);

      if (job.options.removeOnFail) {
        this.jobs.delete(jobId);
      }
    }
  }

  /**
   * Calculate retry delay
   */
  private calculateRetryDelay(job: Job<T>): number {
    const baseDelay = job.options.retryDelay;
    const attempt = job.attempts;

    switch (job.options.retryBackoff) {
      case 'exponential':
        return baseDelay * Math.pow(2, attempt - 1);
      case 'linear':
        return baseDelay * attempt;
      case 'fixed':
      default:
        return baseDelay;
    }
  }

  /**
   * Promote scheduled jobs to pending
   */
  private async promoteScheduledJobs(): Promise<void> {
    const now = new Date();

    for (const job of this.jobs.values()) {
      if (job.status === JobStatus.SCHEDULED && job.scheduledFor && job.scheduledFor <= now) {
        job.status = JobStatus.PENDING;
        job.scheduledFor = undefined;
        this.emit('jobPromoted', job);
      }

      if (job.status === JobStatus.RETRYING && job.nextRetryAt && job.nextRetryAt <= now) {
        job.status = JobStatus.PENDING;
        job.nextRetryAt = undefined;
        this.emit('jobRetrying', job);
      }
    }
  }

  /**
   * Notify workers of new jobs
   */
  private notifyWorkers(): void {
    this.emit('jobsAvailable');
  }

  /**
   * Get handler for job
   */
  getHandler(jobName: string): JobHandler<T> | undefined {
    return this.handlers.get(jobName);
  }

  /**
   * Start persistence
   */
  private startPersistence(interval: number): void {
    this.persistTimer = setInterval(() => {
      this.saveJobs().catch((err) => logger?.error('Failed to persist jobs:', err));
    }, interval);
  }

  /**
   * Save jobs to disk
   */
  private async saveJobs(): Promise<void> {
    if (!this.persistencePath) return;

    const data = {
      name: this.name,
      jobs: Array.from(this.jobs.entries()).map(([id, job]) => ({
        id,
        job: {
          ...job,
          createdAt: job.createdAt.toISOString(),
          processedAt: job.processedAt?.toISOString(),
          completedAt: job.completedAt?.toISOString(),
          failedAt: job.failedAt?.toISOString(),
          scheduledFor: job.scheduledFor?.toISOString(),
          nextRetryAt: job.nextRetryAt?.toISOString(),
        },
      })),
      metrics: this.metrics,
    };

    await fs.mkdir(path.dirname(this.persistencePath), { recursive: true });
    await fs.writeFile(this.persistencePath, JSON.stringify(data, null, 2));
  }

  /**
   * Load jobs from disk
   */
  private async loadJobs(): Promise<void> {
    if (!this.persistencePath) return;

    try {
      const data = JSON.parse(await fs.readFile(this.persistencePath, 'utf-8'));

      for (const { id, job } of data.jobs) {
        const restoredJob: Job<T> = {
          ...job,
          createdAt: new Date(job.createdAt),
          processedAt: job.processedAt ? new Date(job.processedAt) : undefined,
          completedAt: job.completedAt ? new Date(job.completedAt) : undefined,
          failedAt: job.failedAt ? new Date(job.failedAt) : undefined,
          scheduledFor: job.scheduledFor ? new Date(job.scheduledFor) : undefined,
          nextRetryAt: job.nextRetryAt ? new Date(job.nextRetryAt) : undefined,
        };

        // Reset running jobs to pending
        if (restoredJob.status === JobStatus.RUNNING) {
          restoredJob.status = JobStatus.PENDING;
          restoredJob.workerId = undefined;
        }

        this.jobs.set(id, restoredJob);
      }

      this.metrics = data.metrics;
    } catch (error) {
      if ((error as any).code !== 'ENOENT') {
        throw error;
      }
    }
  }

  /**
   * Shutdown queue
   */
  async shutdown(): Promise<void> {
    if (this.persistTimer) {
      clearInterval(this.persistTimer);
    }

    // Stop all workers
    await Promise.all(Array.from(this.workers.values()).map((worker) => worker.stop()));

    // Final save
    await this.saveJobs();

    this.removeAllListeners();
  }
}

/**
 * Job queue worker
 */
export class Worker<T = any> extends EventEmitter {
  readonly id = uuidv4();
  private running = false;
  private processing = 0;
  private pollTimer?: NodeJS.Timer;
  private heartbeatTimer?: NodeJS.Timer;
  private readonly options: Required<WorkerOptions>;

  constructor(
    private readonly queue: JobQueue<T>,
    private readonly runtime: IAgentRuntime,
    options: WorkerOptions = {}
  ) {
    super();

    this.options = {
      concurrency: options.concurrency ?? 1,
      pollInterval: options.pollInterval ?? 1000,
      shutdownTimeout: options.shutdownTimeout ?? 30000,
      heartbeatInterval: options.heartbeatInterval ?? 5000,
    };
  }

  /**
   * Start worker
   */
  async start(): Promise<void> {
    if (this.running) return;

    this.running = true;
    this.emit('started');

    // Start polling
    this.poll();
    this.pollTimer = setInterval(() => this.poll(), this.options.pollInterval);

    // Start heartbeat
    this.heartbeatTimer = setInterval(() => {
      this.emit('heartbeat', {
        workerId: this.id,
        processing: this.processing,
        uptime: process.uptime(),
      });
    }, this.options.heartbeatInterval);

    // Listen for job availability
    this.queue.on('jobsAvailable', () => {
      if (this.processing < this.options.concurrency) {
        this.poll();
      }
    });
  }

  /**
   * Stop worker
   */
  async stop(): Promise<void> {
    if (!this.running) return;

    this.running = false;

    if (this.pollTimer) {
      clearInterval(this.pollTimer);
    }

    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
    }

    // Wait for current jobs to complete
    const timeout = Date.now() + this.options.shutdownTimeout;
    while (this.processing > 0 && Date.now() < timeout) {
      await new Promise((resolve) => setTimeout(resolve, 100));
    }

    this.emit('stopped');
  }

  /**
   * Poll for jobs
   */
  private async poll(): Promise<void> {
    if (!this.running || this.processing >= this.options.concurrency) {
      return;
    }

    const job = await this.queue.processNextJob(this.id);
    if (!job) {
      return;
    }

    this.processing++;
    this.processJob(job).finally(() => {
      this.processing--;
    });
  }

  /**
   * Process a job
   */
  private async processJob(job: Job<T>): Promise<void> {
    const handler = this.queue.getHandler(job.name);
    if (!handler) {
      this.queue.failJob(job.id, new Error(`No handler registered for job type: ${job.name}`));
      return;
    }

    const timeout = new Promise<never>((_, reject) =>
      setTimeout(
        () => reject(new Error(`Job timed out after ${job.options.timeout}ms`)),
        job.options.timeout
      )
    );

    try {
      const result = await Promise.race([handler(job), timeout]);
      this.queue.completeJob(job.id, result);
    } catch (error) {
      this.queue.failJob(job.id, error as Error);
    }
  }
}
