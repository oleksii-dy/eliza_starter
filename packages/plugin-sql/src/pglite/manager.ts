import { PGlite, type PGliteOptions } from '@electric-sql/pglite';
import { fuzzystrmatch } from '@electric-sql/pglite/contrib/fuzzystrmatch';
import { vector } from '@electric-sql/pglite/vector';
import { logger } from '@elizaos/core';
import type { IDatabaseClientManager } from '../types';

/**
 * Class representing a database client manager for PGlite.
 * This manager is responsible for creating and managing PGlite instances with
 * the required extensions (vector, fuzzystrmatch) for ElizaOS functionality.
 *
 * Note: PGLite extensions must be loaded at initialization time and cannot be
 * added later via CREATE EXTENSION SQL commands.
 *
 * @implements { IDatabaseClientManager }
 */
export class PGliteClientManager implements IDatabaseClientManager<PGlite> {
  private client: PGlite | null = null;
  private shuttingDown = false;
  private readonly shutdownTimeout = 2000; // Increased timeout for proper cleanup
  private queryCount = 0;
  private totalQueryTime = 0;
  private startTime = Date.now();
  private readonly options: PGliteOptions;

  // Enhanced instance management for WebAssembly stability
  private static instanceRegistry = new Map<
    string,
    {
      instance: PGlite;
      refCount: number;
      lastUsed: number;
      dataDir: string;
    }
  >();
  private static lastInstanceCreationTime = 0;
  private static readonly MIN_CREATION_INTERVAL = 2000; // 2 seconds between instances
  private static readonly CLEANUP_DELAY = 3000; // 3 seconds delay before cleanup
  private static shutdownPromises = new Map<string, Promise<void>>();

  /**
   * Constructor for creating a new instance of PGlite with the provided options.
   * Initializes the PGlite client with additional extensions.
   * @param {PGliteOptions} options - The options to configure the PGlite client.
   */
  constructor(options: PGliteOptions) {
    this.options = {
      ...options,
      extensions: {
        vector,
        fuzzystrmatch,
      },
      relaxedDurability: true,
    };

    logger.debug('PGLiteClientManager: Creating with options:', {
      dataDir: this.options.dataDir,
      hasVectorExtension: !!this.options.extensions?.vector,
      hasFuzzystrmatchExtension: !!this.options.extensions?.fuzzystrmatch,
    });

    this.setupShutdownHandlers();
    this.setupPerformanceMonitoring();
  }

  public getConnection(): PGlite {
    if (!this.client) {
      throw new Error('PGLite client not initialized. Call initialize() first.');
    }
    return this.client;
  }

  public isShuttingDown(): boolean {
    return this.shuttingDown;
  }

  /**
   * Get a unique key for this instance based on its configuration
   */
  private getInstanceKey(): string {
    const dataDir = this.options.dataDir || ':memory:';
    return `pglite_${dataDir}`;
  }

  /**
   * Wait for any ongoing WebAssembly cleanup to complete
   */
  private async waitForWebAssemblyCleanup(): Promise<void> {
    // First check if there's a graceful shutdown in progress
    const { PGliteGracefulShutdown } = await import('./graceful-shutdown');
    if (PGliteGracefulShutdown.getIsShuttingDown()) {
      logger.info('PGLiteClientManager: Waiting for graceful shutdown to complete...');
      await PGliteGracefulShutdown.waitForShutdown();
      // Add extra delay after shutdown completes
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }

    const now = Date.now();
    const timeSinceLastCreation = now - PGliteClientManager.lastInstanceCreationTime;

    if (timeSinceLastCreation < PGliteClientManager.MIN_CREATION_INTERVAL) {
      const waitTime = PGliteClientManager.MIN_CREATION_INTERVAL - timeSinceLastCreation;
      logger.info(`PGLiteClientManager: Waiting ${waitTime}ms for WebAssembly cleanup`);
      await new Promise((resolve) => setTimeout(resolve, waitTime));
    }
  }

  /**
   * Create a new PGLite instance with retry logic for WebAssembly errors
   */
  private async createPGliteInstance(): Promise<PGlite> {
    const maxRetries = 3;
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        await this.waitForWebAssemblyCleanup();

        logger.info(
          `PGLiteClientManager: Creating new PGLite instance (attempt ${attempt}/${maxRetries})`
        );
        const instance = new PGlite(this.options);
        PGliteClientManager.lastInstanceCreationTime = Date.now();

        // Wait for instance to be ready before returning
        await instance.waitReady;
        logger.info('PGLiteClientManager: New PGLite instance ready');

        return instance;
      } catch (error) {
        lastError = error as Error;
        logger.warn(`PGLiteClientManager: Failed to create instance on attempt ${attempt}:`, error);

        if (attempt < maxRetries) {
          // Progressive backoff: 2s, 4s, 6s
          const backoffTime = 2000 * attempt;
          logger.info(`PGLiteClientManager: Retrying in ${backoffTime}ms...`);
          await new Promise((resolve) => setTimeout(resolve, backoffTime));
        }
      }
    }

    throw new Error(
      `PGLite initialization failed after ${maxRetries} attempts. ` +
        `Last error: ${lastError?.message}. ` +
        'This may be caused by WebAssembly resource conflicts. ' +
        'Try waiting longer between restarts or clearing the data directory.'
    );
  }

  /**
   * Get or create a shared instance for the same data directory
   */
  private async getOrCreateSharedInstance(): Promise<PGlite> {
    const instanceKey = this.getInstanceKey();
    const existing = PGliteClientManager.instanceRegistry.get(instanceKey);

    if (existing) {
      // Check if there's an ongoing shutdown for this instance
      const shutdownPromise = PGliteClientManager.shutdownPromises.get(instanceKey);
      if (shutdownPromise) {
        logger.info(`PGLiteClientManager: Waiting for instance cleanup to complete...`);
        await shutdownPromise;
        // After cleanup, proceed to create new instance
      } else {
        // Reuse existing instance
        existing.refCount++;
        existing.lastUsed = Date.now();
        logger.info(
          `PGLiteClientManager: Reusing existing instance (ref count: ${existing.refCount})`
        );
        return existing.instance;
      }
    }

    // Create new instance
    const instance = await this.createPGliteInstance();

    PGliteClientManager.instanceRegistry.set(instanceKey, {
      instance,
      refCount: 1,
      lastUsed: Date.now(),
      dataDir: this.options.dataDir || ':memory:',
    });

    logger.info(`PGLiteClientManager: Created new shared instance for ${instanceKey}`);
    return instance;
  }

  public async initialize(): Promise<void> {
    try {
      // Get or create the shared instance
      this.client = await this.getOrCreateSharedInstance();

      logger.info('PGLiteClientManager: PGLite instance is ready');

      // Try to create the vector extension (it might be loaded but not created)
      let vectorExtensionWorking = false;

      try {
        // First try to create the extension
        await this.client.exec('CREATE EXTENSION IF NOT EXISTS vector');
        logger.info('PGLiteClientManager: Vector extension created successfully');
        vectorExtensionWorking = true;
      } catch (createError) {
        logger.debug(
          'PGLiteClientManager: CREATE EXTENSION vector failed, testing if already available'
        );

        // Test if the vector type is available even without explicit creation
        try {
          await this.client.exec(
            'CREATE TEMPORARY TABLE test_extension_check (id int, vec vector(3))'
          );
          await this.client.exec('DROP TABLE test_extension_check');
          logger.info('PGLiteClientManager: Vector extension verified working (already loaded)');
          vectorExtensionWorking = true;
        } catch (testError) {
          logger.warn('PGLiteClientManager: Vector extension not working:', testError);
        }
      }

      if (!vectorExtensionWorking) {
        logger.warn(
          'PGLiteClientManager: Vector extension is not available in this PGLite instance'
        );
        logger.warn('PGLiteClientManager: Semantic search features will be disabled');
      }
    } catch (error) {
      logger.error('PGLiteClientManager: Failed to initialize PGLite', error);

      // Check if it's a WebAssembly abort error
      if (error instanceof Error && error.message.includes('Aborted()')) {
        throw new Error(
          'PGLite initialization failed due to WebAssembly error. ' +
            'This may be caused by memory limits or concurrent instance creation. ' +
            'Try running tests sequentially or with increased memory.'
        );
      }

      throw error;
    }
  }

  public async close(): Promise<void> {
    if (this.shuttingDown) {
      // Already shutting down or closed, just return
      return;
    }
    
    this.logPerformanceStats();

    const instanceKey = this.getInstanceKey();
    const existing = PGliteClientManager.instanceRegistry.get(instanceKey);

    if (!existing) {
      logger.debug('PGLiteClientManager: No shared instance to close');
      this.shuttingDown = true;
      this.client = null;
      return;
    }

    existing.refCount--;
    logger.info(`PGLiteClientManager: Decreasing ref count (now: ${existing.refCount})`);

    // Don't actually close if there are other references
    if (existing.refCount > 0) {
      logger.info('PGLiteClientManager: Other references exist, not closing instance');
      return;
    }
    
    // Only set shutting down when we're actually going to close
    this.shuttingDown = true;

    // Schedule cleanup with delay to allow WebAssembly to properly release resources
    const shutdownPromise = this.scheduleInstanceCleanup(instanceKey, existing.instance);
    PGliteClientManager.shutdownPromises.set(instanceKey, shutdownPromise);

    try {
      await shutdownPromise;
    } finally {
      PGliteClientManager.shutdownPromises.delete(instanceKey);
      this.client = null;
    }
  }

  /**
   * Schedule instance cleanup with proper delay for WebAssembly resource release
   */
  private async scheduleInstanceCleanup(instanceKey: string, instance: PGlite): Promise<void> {
    logger.info(
      `PGLiteClientManager: Scheduling cleanup for ${instanceKey} in ${PGliteClientManager.CLEANUP_DELAY}ms`
    );

    // Remove from registry immediately to prevent reuse
    PGliteClientManager.instanceRegistry.delete(instanceKey);

    // Wait for cleanup delay to allow proper WebAssembly resource release
    await new Promise((resolve) => setTimeout(resolve, PGliteClientManager.CLEANUP_DELAY));

    try {
      await instance.close();
      logger.info(`PGLiteClientManager: Successfully closed instance ${instanceKey}`);
    } catch (error) {
      logger.debug(`PGLite close error for ${instanceKey} (may be already closed):`, error);
    }
  }

  /**
   * Force cleanup of all instances (for testing)
   */
  public static async forceCleanupAll(): Promise<void> {
    logger.info('PGLiteClientManager: Force cleaning up all instances...');

    const cleanupPromises: Promise<void>[] = [];

    for (const [key, entry] of PGliteClientManager.instanceRegistry.entries()) {
      const promise = (async () => {
        try {
          await entry.instance.close();
          logger.debug(`Force closed instance: ${key}`);
        } catch (error) {
          logger.debug(`Force close error for ${key}:`, error);
        }
      })();
      cleanupPromises.push(promise);
    }

    await Promise.allSettled(cleanupPromises);
    PGliteClientManager.instanceRegistry.clear();
    PGliteClientManager.shutdownPromises.clear();

    // Additional delay to ensure WebAssembly cleanup
    await new Promise((resolve) => setTimeout(resolve, PGliteClientManager.CLEANUP_DELAY));
    logger.info('PGLiteClientManager: Force cleanup completed');
  }

  /**
   * Get performance statistics for monitoring
   */
  public getPerformanceStats() {
    const uptime = Date.now() - this.startTime;
    return {
      queryCount: this.queryCount,
      totalQueryTime: this.totalQueryTime,
      averageQueryTime: this.queryCount > 0 ? this.totalQueryTime / this.queryCount : 0,
      uptimeMs: uptime,
      queriesPerSecond: this.queryCount > 0 ? (this.queryCount / uptime) * 1000 : 0,
      activeInstances: PGliteClientManager.instanceRegistry.size,
    };
  }

  /**
   * Log current performance statistics
   */
  public logPerformanceStats(): void {
    const stats = this.getPerformanceStats();
    logger.info('PGlite Performance Stats:', {
      queries: stats.queryCount,
      avgQueryTime: `${Math.round(stats.averageQueryTime)}ms`,
      qps: Math.round(stats.queriesPerSecond * 100) / 100,
      uptime: `${Math.round(stats.uptimeMs / 1000)}s`,
      activeInstances: stats.activeInstances,
    });
  }

  /**
   * Track query performance
   */
  public trackQuery(startTime: number): void {
    this.queryCount++;
    this.totalQueryTime += Date.now() - startTime;
  }

  private setupShutdownHandlers() {
    // Graceful shutdown handlers
    const shutdown = async () => {
      if (!this.shuttingDown) {
        logger.info('PGlite: Graceful shutdown initiated');
        await this.close();
      }
    };

    process.on('SIGTERM', shutdown);
    process.on('SIGINT', shutdown);
    process.on('SIGUSR2', shutdown); // nodemon restart
  }

  private setupPerformanceMonitoring() {
    // Log performance stats every 60 seconds
    setInterval(() => {
      if (!this.shuttingDown && this.queryCount > 0) {
        this.logPerformanceStats();
      }
    }, 60000);
  }
}
