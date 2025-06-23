import { PGlite, type PGliteOptions } from '@electric-sql/pglite';
import { fuzzystrmatch } from '@electric-sql/pglite/contrib/fuzzystrmatch';
import { vector } from '@electric-sql/pglite/vector';
import { logger } from '@elizaos/core';
import type { IDatabaseClientManager } from '../types';

/**
 * Class representing a database client manager for PGlite.
 * Creates PGLite instance immediately on construction (like the old version).
 * @implements { IDatabaseClientManager }
 */
export class PGliteClientManager implements IDatabaseClientManager<PGlite> {
  private client: PGlite;
  private shuttingDown = false;
  private vectorReady = false;
  private closed = false;

  /**
   * Constructor for creating a new instance of PGlite with the provided options.
   * Initializes the PGlite client with additional extensions.
   * Supports both string (dataDir) and PGliteOptions for compatibility.
   * @param {string | PGliteOptions} options - The data directory or options to configure the PGlite client.
   */
  constructor(options: string | PGliteOptions) {
    // Support both string (for tests) and PGliteOptions (for production)
    const pgliteOptions: PGliteOptions =
      typeof options === 'string' ? { dataDir: options } : options;

    this.client = new PGlite({
      ...pgliteOptions,
      extensions: {
        vector,
        fuzzystrmatch,
      },
    });

    this.setupShutdownHandlers();
    this.initializeVectorExtension();
  }

  /**
   * Initialize vector extension and mark it as ready
   */
  private async initializeVectorExtension(): Promise<void> {
    try {
      // Give the extension a moment to initialize
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Try to verify vector extension is loaded
      await this.client.exec('SELECT 1');
      this.vectorReady = true;
      logger.debug('[PGliteClientManager] Vector extension initialized');
    } catch (error) {
      logger.warn('[PGliteClientManager] Vector extension initialization warning:', error);
      this.vectorReady = true; // Mark as ready anyway to not block
    }
  }

  /**
   * Check if vector extension is ready
   */
  public isVectorReady(): boolean {
    return this.vectorReady;
  }

  /**
   * Wait for vector extension to be ready
   */
  public async waitForVectorReady(maxWaitMs = 5000): Promise<void> {
    const startTime = Date.now();
    while (!this.vectorReady && Date.now() - startTime < maxWaitMs) {
      await new Promise((resolve) => setTimeout(resolve, 50));
    }
    if (!this.vectorReady) {
      logger.warn('[PGliteClientManager] Vector extension not ready after timeout');
    }
  }

  public getConnection(): PGlite {
    if (this.closed) {
      throw new Error('PGLite client not initialized');
    }
    return this.client;
  }

  public isShuttingDown(): boolean {
    return this.shuttingDown;
  }

  public async initialize(): Promise<void> {
    // Kept for backward compatibility
    // In the old version, this was empty because initialization happened in constructor
  }

  public async close(): Promise<void> {
    if (this.shuttingDown || this.closed) {
      return;
    }

    this.shuttingDown = true;

    try {
      // Check if client exists and is not already closed
      if (this.client && !this.closed) {
        await this.client.close();
        this.closed = true;
        logger.debug('[PGliteClientManager] PGLite connection closed');
      }
    } catch (error) {
      // Check if it's the "PGLite is closed" error and ignore it
      const errorMessage = error instanceof Error ? error.message : String(error);
      if (errorMessage.includes('PGLite is closed')) {
        this.closed = true;
        logger.debug('[PGliteClientManager] PGLite was already closed');
      } else {
        logger.error('[PGliteClientManager] Error closing PGLite:', error);
      }
    }
  }

  private setupShutdownHandlers() {
    // Graceful shutdown handlers
    const shutdown = async () => {
      if (!this.shuttingDown) {
        await this.close();
      }
    };

    process.on('SIGTERM', shutdown);
    process.on('SIGINT', shutdown);
    process.on('SIGUSR2', shutdown); // nodemon restart
  }
}
