import { PGlite, type PGliteOptions } from '@electric-sql/pglite';
import { fuzzystrmatch } from '@electric-sql/pglite/contrib/fuzzystrmatch';
import { vector } from '@electric-sql/pglite/vector';
import { logger } from '@elizaos/core';
import type { IDatabaseClientManager } from '../types';

/**
 * Class representing a database client manager for PGlite.
 * This manager is responsible for creating and managing PGLite instances with
 * the required extensions (vector, fuzzystrmatch) for ElizaOS functionality.
 *
 * Note: PGLite extensions must be loaded at initialization time and cannot be
 * added later via CREATE EXTENSION SQL commands.
 *
 * @implements { IDatabaseClientManager }
 */
export class PGliteClientManager implements IDatabaseClientManager<PGlite> {
  private client: PGlite;
  private shuttingDown = false;
  private readonly shutdownTimeout = 500;
  private queryCount = 0;
  private totalQueryTime = 0;
  private startTime = Date.now();

  // Global PGLite instance for test environments to avoid concurrent initialization issues
  private static globalTestInstance: PGlite | null = null;
  private static globalTestInstanceRefCount = 0;
  private static lastInstanceCreationTime = 0;
  private static readonly MIN_CREATION_INTERVAL = 1000; // 1 second between instances

  /**
   * Constructor for creating a new instance of PGlite with the provided options.
   * Initializes the PGLite client with additional extensions.
   * @param {PGliteOptions} options - The options to configure the PGLite client.
   */
  constructor(options: PGliteOptions) {
    // Always include extensions regardless of environment or dataDir
    const pgliteOptions: PGliteOptions = {
      ...options,
      extensions: {
        vector,
        fuzzystrmatch,
      },
      relaxedDurability: true,
    };

    logger.debug('PGLiteClientManager: Creating with options:', {
      dataDir: pgliteOptions.dataDir,
      hasVectorExtension: !!pgliteOptions.extensions?.vector,
      hasFuzzystrmatchExtension: !!pgliteOptions.extensions?.fuzzystrmatch,
    });

    // Use singleton pattern for test environments with in-memory databases
    if (process.env.NODE_ENV === 'test' && options.dataDir === ':memory:') {
      if (!PGliteClientManager.globalTestInstance) {
        // Add delay between instance creations to avoid WebAssembly issues
        const now = Date.now();
        const timeSinceLastCreation = now - PGliteClientManager.lastInstanceCreationTime;
        if (timeSinceLastCreation < PGliteClientManager.MIN_CREATION_INTERVAL) {
          const waitTime = PGliteClientManager.MIN_CREATION_INTERVAL - timeSinceLastCreation;
          logger.info(`PGLiteClientManager: Waiting ${waitTime}ms before creating new instance`);
          // Note: This is synchronous, which is not ideal but necessary for constructor
          const end = Date.now() + waitTime;
          while (Date.now() < end) {
            // Busy wait
          }
        }

        logger.info('PGLiteClientManager: Creating new test instance with extensions');
        PGliteClientManager.globalTestInstance = new PGlite(pgliteOptions);
        PGliteClientManager.lastInstanceCreationTime = Date.now();
      }
      PGliteClientManager.globalTestInstanceRefCount++;
      this.client = PGliteClientManager.globalTestInstance;
      logger.info(
        `PGLiteClientManager: Reusing test instance (ref count: ${PGliteClientManager.globalTestInstanceRefCount})`
      );
    } else {
      // Normal production behavior - also include extensions
      logger.info('PGLiteClientManager: Creating new PGLite instance with extensions');
      logger.debug('PGLiteClientManager: Final options being passed to PGLite:', pgliteOptions);
      this.client = new PGlite(pgliteOptions);
    }

    this.setupShutdownHandlers();
    this.setupPerformanceMonitoring();
  }

  public getConnection(): PGlite {
    return this.client;
  }

  public isShuttingDown(): boolean {
    return this.shuttingDown;
  }

  public async initialize(): Promise<void> {
    try {
      // Wait for PGLite to be ready
      await this.client.waitReady;
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
    this.shuttingDown = true;
    this.logPerformanceStats();

    // Handle singleton test instance
    if (process.env.NODE_ENV === 'test' && this.client === PGliteClientManager.globalTestInstance) {
      PGliteClientManager.globalTestInstanceRefCount--;
      logger.info(
        `PGLiteClientManager: Decreasing ref count (now: ${PGliteClientManager.globalTestInstanceRefCount})`
      );

      // Don't actually close if there are other references
      if (PGliteClientManager.globalTestInstanceRefCount > 0) {
        return;
      }

      // Close and clear the global instance when ref count reaches 0
      try {
        await this.client.close();
        PGliteClientManager.globalTestInstance = null;
        logger.info('PGLiteClientManager: Closed global test instance');
      } catch (error) {
        logger.debug('PGLite close error (may be already closed):', error);
      }
    } else {
      // Normal close for non-test instances
      try {
        await this.client.close();
      } catch (error) {
        logger.debug('PGLite close error (may be already closed):', error);
      }
    }
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
