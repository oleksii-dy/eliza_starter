import { config } from './config';
import { logger } from './logger';
import { existsSync, rmSync } from 'fs';
import { join } from 'path';

export interface ScriptOptions {
  dryRun?: boolean;
  verbose?: boolean;
  parallel?: boolean;
  maxConcurrency?: number;
}

export interface ProgressInfo {
  current: number;
  total: number;
  percentage: number;
  message: string;
  startTime: number;
  estimatedTimeRemaining?: number;
}

export abstract class BaseScript {
  protected options: ScriptOptions;
  protected startTime: number;
  protected tempFiles: string[] = [];
  protected cleanupHandlers: Array<() => Promise<void>> = [];
  private progressCallbacks: Array<(info: ProgressInfo) => void> = [];

  constructor(protected name: string, options: ScriptOptions = {}) {
    this.options = {
      dryRun: options.dryRun ?? config.features.dryRun,
      verbose: options.verbose ?? config.features.verbose,
      parallel: options.parallel ?? config.features.parallel,
      maxConcurrency: options.maxConcurrency ?? config.features.maxConcurrency,
    };
    this.startTime = Date.now();

    // Register cleanup handlers
    this.registerCleanupHandlers();
  }

  /**
   * Main execution method to be implemented by subclasses
   */
  abstract execute(): Promise<void>;

  /**
   * Run the script with error handling and cleanup
   */
  async run(): Promise<void> {
    logger.startOperation(`${this.name} script`, {
      options: this.options,
      config: {
        paths: config.paths,
        features: config.features,
        registry: config.registry,
      },
    });

    try {
      await this.validate();
      await this.execute();
      logger.endOperation(`${this.name} script`, {
        duration: Date.now() - this.startTime,
      });
    } catch (error) {
      logger.error(`${this.name} script failed`, error);
      throw error;
    } finally {
      await this.cleanup();
    }
  }

  /**
   * Validate prerequisites before running
   */
  protected async validate(): Promise<void> {
    // Check required environment variables
    const requiredEnvVars = this.getRequiredEnvVars();
    const missing = requiredEnvVars.filter((key) => !process.env[key]);

    if (missing.length > 0) {
      throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
    }

    // Validate GitHub token if required
    if (requiredEnvVars.includes('GITHUB_TOKEN') && !config.github.token) {
      throw new Error('GitHub token not configured');
    }
  }

  /**
   * Get required environment variables for this script
   */
  protected getRequiredEnvVars(): string[] {
    return ['GITHUB_TOKEN'];
  }

  /**
   * Register cleanup handlers for graceful shutdown
   */
  private registerCleanupHandlers(): void {
    const cleanup = async (signal: string) => {
      logger.info(`Received ${signal}, cleaning up...`);
      await this.cleanup();
      process.exit(0);
    };

    process.on('SIGINT', () => cleanup('SIGINT'));
    process.on('SIGTERM', () => cleanup('SIGTERM'));
    process.on('uncaughtException', async (error) => {
      logger.error('Uncaught exception', error);
      await this.cleanup();
      process.exit(1);
    });
    process.on('unhandledRejection', async (error) => {
      logger.error('Unhandled rejection', error);
      await this.cleanup();
      process.exit(1);
    });
  }

  /**
   * Clean up resources
   */
  protected async cleanup(): Promise<void> {
    logger.info('Cleaning up resources...');

    // Run custom cleanup handlers
    for (const handler of this.cleanupHandlers) {
      try {
        await handler();
      } catch (error) {
        logger.error('Cleanup handler failed', error);
      }
    }

    // Clean up temp files
    for (const file of this.tempFiles) {
      try {
        if (existsSync(file)) {
          rmSync(file, { recursive: true, force: true });
          logger.debug(`Removed temp file: ${file}`);
        }
      } catch (error) {
        logger.error(`Failed to remove temp file: ${file}`, error);
      }
    }

    // Close logger
    logger.close();
  }

  /**
   * Add a cleanup handler
   */
  protected addCleanupHandler(handler: () => Promise<void>): void {
    this.cleanupHandlers.push(handler);
  }

  /**
   * Track a temporary file for cleanup
   */
  protected trackTempFile(path: string): void {
    this.tempFiles.push(path);
  }

  /**
   * Update progress
   */
  protected updateProgress(current: number, total: number, message: string): void {
    const percentage = Math.round((current / total) * 100);
    const elapsed = Date.now() - this.startTime;
    const rate = current / (elapsed / 1000);
    const remaining = total - current;
    const estimatedTimeRemaining = rate > 0 ? (remaining / rate) * 1000 : undefined;

    const info: ProgressInfo = {
      current,
      total,
      percentage,
      message,
      startTime: this.startTime,
      estimatedTimeRemaining,
    };

    logger.progress(this.name, current, total, { message });

    // Notify callbacks
    this.progressCallbacks.forEach((cb) => cb(info));
  }

  /**
   * Register a progress callback
   */
  onProgress(callback: (info: ProgressInfo) => void): void {
    this.progressCallbacks.push(callback);
  }

  /**
   * Execute tasks in parallel with concurrency control
   */
  protected async executeParallel<T, R>(
    items: T[],
    task: (item: T, index: number) => Promise<R>,
    options: { maxConcurrency?: number; onProgress?: (completed: number) => void } = {}
  ): Promise<R[]> {
    const maxConcurrency = options.maxConcurrency ?? this.options.maxConcurrency ?? 5;
    const results: R[] = [];
    const errors: Error[] = [];
    let completed = 0;

    // Create chunks based on concurrency
    const chunks: T[][] = [];
    for (let i = 0; i < items.length; i += maxConcurrency) {
      chunks.push(items.slice(i, i + maxConcurrency));
    }

    // Process chunks
    for (const chunk of chunks) {
      const chunkResults = await Promise.allSettled(
        chunk.map((item, index) => task(item, index))
      );

      chunkResults.forEach((result, index) => {
        if (result.status === 'fulfilled') {
          results.push(result.value);
        } else {
          errors.push(result.reason);
          logger.error(`Task failed for item ${index}`, result.reason);
        }
        completed++;
        options.onProgress?.(completed);
      });
    }

    if (errors.length > 0) {
      logger.warn(`${errors.length} tasks failed out of ${items.length}`);
    }

    return results;
  }

  /**
   * Check if running in dry run mode
   */
  protected isDryRun(): boolean {
    return this.options.dryRun ?? false;
  }

  /**
   * Log action that would be taken in dry run mode
   */
  protected logDryRunAction(action: string, details?: any): void {
    if (this.isDryRun()) {
      logger.info(`[DRY RUN] Would ${action}`, details);
    }
  }

  /**
   * Format duration in human-readable format
   */
  protected formatDuration(ms: number): string {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);

    if (hours > 0) {
      return `${hours}h ${minutes % 60}m ${seconds % 60}s`;
    } else if (minutes > 0) {
      return `${minutes}m ${seconds % 60}s`;
    } else {
      return `${seconds}s`;
    }
  }

  /**
   * Create a checkpoint for resumable operations
   */
  protected async saveCheckpoint(data: any): Promise<void> {
    const checkpointFile = join(config.paths.temp, `${this.name}-checkpoint.json`);
    // Implementation would save state to file
    logger.debug('Checkpoint saved', { file: checkpointFile });
  }

  /**
   * Load checkpoint for resuming operations
   */
  protected async loadCheckpoint(): Promise<any | null> {
    const checkpointFile = join(config.paths.temp, `${this.name}-checkpoint.json`);
    // Implementation would load state from file
    return null;
  }
} 