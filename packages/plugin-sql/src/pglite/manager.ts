import type { PGlite, PGliteOptions } from '@electric-sql/pglite';
import { fuzzystrmatch } from '@electric-sql/pglite/contrib/fuzzystrmatch';
import { vector } from '@electric-sql/pglite/vector';
import { logger } from '@elizaos/core';
import type { IDatabaseClientManager } from '../types';

// Global singleton instance - only ONE PGLite instance should exist
let globalPGLiteInstance: PGlite | null = null;
let globalInstancePromise: Promise<PGlite> | null = null;
let globalInstanceRefCount = 0;

// Global singleton manager instance
let globalManagerInstance: PGliteClientManager | null = null;

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

  /**
   * Get the singleton instance of PGliteClientManager
   * @param {PGliteOptions} options - The options to configure the PGlite client (used only on first call)
   * @returns {PGliteClientManager} The singleton manager instance
   */
  public static getInstance(options?: PGliteOptions): PGliteClientManager {
    if (!globalManagerInstance) {
      if (!options) {
        throw new Error('PGliteClientManager: Options required for first initialization');
      }
      logger.info('PGliteClientManager: Creating global singleton manager instance');
      globalManagerInstance = new PGliteClientManager(options);
    } else if (options) {
      logger.warn('PGliteClientManager: Manager already initialized, ignoring new options');
    }
    return globalManagerInstance;
  }

  /**
   * Private constructor to enforce singleton pattern
   * @param {PGliteOptions} options - The options to configure the PGlite client.
   */
  private constructor(options: PGliteOptions) {
    // Only include extensions if they're available
    const extensions: any = {};

    try {
      // Try to load vector extension
      if (vector) {
        extensions.vector = vector;
        logger.debug('PGLiteClientManager: Vector extension loaded');
      }
    } catch (error) {
      logger.warn('PGLiteClientManager: Vector extension not available:', error);
    }

    try {
      // Try to load fuzzystrmatch extension
      if (fuzzystrmatch) {
        extensions.fuzzystrmatch = fuzzystrmatch;
        logger.debug('PGLiteClientManager: Fuzzystrmatch extension loaded');
      }
    } catch (error) {
      logger.warn('PGLiteClientManager: Fuzzystrmatch extension not available:', error);
    }

    this.options = {
      ...options,
      extensions: Object.keys(extensions).length > 0 ? extensions : undefined,
      relaxedDurability: true,
    };

    logger.debug('PGLiteClientManager: Creating manager with options:', {
      dataDir: this.options.dataDir,
      hasVectorExtension: !!extensions.vector,
      hasFuzzystrmatchExtension: !!extensions.fuzzystrmatch,
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
   * Create or get the global PGLite instance
   */
  private async getOrCreateGlobalInstance(): Promise<PGlite> {
    // If we already have a global instance, reuse it
    if (globalPGLiteInstance) {
      globalInstanceRefCount++;
      logger.info(
        `PGLiteClientManager: Reusing global PGLite instance (ref count: ${globalInstanceRefCount})`
      );
      return globalPGLiteInstance;
    }

    // If instance creation is in progress, wait for it
    if (globalInstancePromise) {
      logger.info('PGLiteClientManager: Waiting for global instance creation in progress...');
      const instance = await globalInstancePromise;
      globalInstanceRefCount++;
      return instance;
    }

    // Check if we have a stale WebAssembly module before creating new instance
    if (typeof global !== 'undefined' && (global as any).Module) {
      logger.warn('PGLiteClientManager: Detected existing WebAssembly module, cleaning up...');
      await PGliteClientManager.forceCleanupGlobal();
      // Add a delay after cleanup
      await new Promise((resolve) => setTimeout(resolve, 500));
    }

    // Create the global instance
    logger.info('PGLiteClientManager: Creating global PGLite instance...');

    // Try multiple times with increasing delays to handle WebAssembly module conflicts
    const maxAttempts = 2;
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        globalInstancePromise = (async () => {
          logger.info(
            `PGLiteClientManager: Initializing global PGLite instance (attempt ${attempt}/${maxAttempts})...`
          );
          logger.info('PGLiteClientManager: Options:', JSON.stringify(this.options, null, 2));

          // Try to import PGLite dynamically to catch any module loading issues
          const { PGlite: PGLiteClass } = await import('@electric-sql/pglite');
          logger.info('PGLiteClientManager: PGLite module loaded successfully');

          // Check if we're in a browser or Node environment
          const isNode =
            typeof process !== 'undefined' && process.versions && process.versions.node;
          logger.info(
            `PGLiteClientManager: Environment - Node: ${isNode}, Node version: ${process.version}`
          );

          // For debugging: try with minimal options first
          // Force in-memory database to avoid file system issues
          const debugOptions = {
            dataDir: ':memory:',
            // Don't include extensions initially to isolate the issue
          };
          logger.info(
            'PGLiteClientManager: Creating instance with debug options:',
            JSON.stringify(debugOptions, null, 2)
          );

          // Check for Node.js v23 compatibility issues
          const nodeVersion = process.version;
          if (nodeVersion.startsWith('v23')) {
            logger.warn(
              'PGLiteClientManager: Node.js v23 detected - known WebAssembly compatibility issues with PGLite'
            );
            logger.warn('PGLiteClientManager: Recommended solutions:');
            logger.warn('1. Use PostgreSQL instead: DATABASE_PROVIDER=postgres');
            logger.warn('2. Downgrade to Node.js v22 or earlier');
            logger.warn('3. Use a different runtime like Bun');
          }

          const instance = new PGLiteClass(debugOptions);

          // Wait for instance to be ready
          await instance.waitReady;
          logger.info('PGLiteClientManager: Global PGLite instance is ready');

          globalPGLiteInstance = instance;
          globalInstanceRefCount = 1;

          return instance;
        })();

        const result = await globalInstancePromise;
        return result; // Success - return the instance
      } catch (error) {
        logger.error(
          `PGLiteClientManager: Failed to create global instance (attempt ${attempt}/${maxAttempts}):`,
          error
        );
        logger.error('PGLiteClientManager: Error stack:', (error as Error).stack);
        lastError = error as Error;

        // Check if it's a WebAssembly error
        if (error instanceof Error) {
          if (
            error.message.includes('WebAssembly') ||
            error.message.includes('wasm') ||
            error.message.includes('Aborted')
          ) {
            logger.error('PGLiteClientManager: WebAssembly abort error detected');

            const nodeVersion = process.version;
            if (nodeVersion.startsWith('v23')) {
              logger.error('================== COMPATIBILITY ISSUE ==================');
              logger.error('PGLite is not compatible with Node.js v23 on your system');
              logger.error("This is a known issue with PGLite's WebAssembly module");
              logger.error('');
              logger.error('SOLUTIONS:');
              logger.error('1. Use PostgreSQL instead:');
              logger.error(
                '   DATABASE_PROVIDER=postgres DATABASE_URL=postgresql://... bun run start'
              );
              logger.error('');
              logger.error('2. Downgrade to Node.js v22 or earlier:');
              logger.error('   nvm install 22 && nvm use 22');
              logger.error('');
              logger.error('3. Use Bun runtime instead of Node.js');
              logger.error('========================================================');
            }

            // If this is not the last attempt, wait and retry
            if (attempt < maxAttempts) {
              const waitTime = attempt * 1000; // 1s, 2s
              logger.info(`PGLiteClientManager: Waiting ${waitTime}ms before retry...`);
              await new Promise((resolve) => setTimeout(resolve, waitTime));
            }
          } else {
            // If it's not a WebAssembly error, don't retry
            throw error;
          }
        }
      } finally {
        globalInstancePromise = null;
      }
    }

    // If we get here, all attempts failed
    throw (
      lastError || new Error('PGLiteClientManager: Failed to create instance after all attempts')
    );
  }

  public async initialize(): Promise<void> {
    // Get the global singleton instance
    this.client = await this.getOrCreateGlobalInstance();

    logger.info('PGLiteClientManager: Connected to global PGLite instance');
  }

  public async close(): Promise<void> {
    if (this.shuttingDown) {
      return;
    }

    this.logPerformanceStats();
    this.shuttingDown = true;

    // Decrease reference count
    if (globalInstanceRefCount > 0) {
      globalInstanceRefCount--;
      logger.info(
        `PGLiteClientManager: Decreased global instance ref count to ${globalInstanceRefCount}`
      );
    }

    // Don't actually close the global instance unless ref count is 0
    if (globalInstanceRefCount > 0) {
      logger.info('PGLiteClientManager: Other references exist, keeping global instance alive');
      this.client = null;
      return;
    }

    // Only close if this is the last reference AND we're doing a forced cleanup
    logger.info('PGLiteClientManager: Reference count is 0, but not closing unless forced cleanup');
    this.client = null;
  }

  /**
   * Force cleanup of all global instances (for testing)
   */
  public static async forceCleanupAll(): Promise<void> {
    return this.forceCleanupGlobal();
  }

  /**
   * Force cleanup of the global instance (only called during app shutdown)
   */
  public static async forceCleanupGlobal(): Promise<void> {
    logger.info('PGLiteClientManager: Force cleaning up global instance...');

    if (globalPGLiteInstance) {
      try {
        await globalPGLiteInstance.close();
        logger.info('PGLiteClientManager: Global instance force closed');
      } catch (error) {
        logger.warn('PGLiteClientManager: Error force closing global instance:', error);
      }
    }

    globalPGLiteInstance = null;
    globalInstancePromise = null;
    globalInstanceRefCount = 0;
    globalManagerInstance = null;

    // Try to force WebAssembly module cleanup
    if (typeof global !== 'undefined' && (global as any).Module) {
      logger.info(
        'PGLiteClientManager: Attempting to clear WebAssembly module from global scope...'
      );
      try {
        // Clear any PGLite-related WebAssembly modules
        const globalAny = global as any;
        if (globalAny.Module) {
          delete globalAny.Module;
        }
        if (globalAny.PGlite) {
          delete globalAny.PGlite;
        }
        // Clear require cache for PGLite module
        const pgLiteModulePath = require.resolve('@electric-sql/pglite');
        if (require.cache[pgLiteModulePath]) {
          delete require.cache[pgLiteModulePath];
        }
      } catch (error) {
        logger.debug('PGLiteClientManager: Error clearing module cache:', error);
      }
    }

    // Force garbage collection if available
    if (global.gc) {
      logger.info('PGLiteClientManager: Running garbage collection...');
      global.gc();
    }

    // Wait for WebAssembly cleanup
    await new Promise((resolve) => setTimeout(resolve, 3000));
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
      globalInstanceActive: !!globalPGLiteInstance,
      globalRefCount: globalInstanceRefCount,
    };
  }

  /**
   * Log current performance statistics
   */
  public logPerformanceStats(): void {
    const stats = this.getPerformanceStats();
    logger.info('PGLite Performance Stats:', {
      queries: stats.queryCount,
      avgQueryTime: `${Math.round(stats.averageQueryTime)}ms`,
      qps: Math.round(stats.queriesPerSecond * 100) / 100,
      uptime: `${Math.round(stats.uptimeMs / 1000)}s`,
      globalActive: stats.globalInstanceActive,
      globalRefs: stats.globalRefCount,
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
        logger.info('PGLite: Graceful shutdown initiated');
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
