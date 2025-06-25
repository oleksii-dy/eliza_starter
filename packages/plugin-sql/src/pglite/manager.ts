import { PGlite, type PGliteOptions } from '@electric-sql/pglite';
import { fuzzystrmatch } from '@electric-sql/pglite/contrib/fuzzystrmatch';
import { vector } from '@electric-sql/pglite/vector';
import type { IDatabaseClientManager } from '../types';
import path from 'node:path';
import { logger } from '@elizaos/core';

/**
 * Class representing a database client manager for PGlite.
 * @implements { IDatabaseClientManager }
 */
export class PGliteClientManager implements IDatabaseClientManager<PGlite> {
  private client: PGlite;
  private shuttingDown = false;

  /**
   * Constructor for creating a new instance of PGlite with the provided options.
   * Initializes the PGlite client with additional extensions.
   * @param {PGliteOptions} options - The options to configure the PGlite client.
   */
  constructor(options: PGliteOptions) {
    // Debug logging for path normalization
    if (options.dataDir) {
      logger.debug(`[PGLiteClientManager] Original dataDir: ${options.dataDir}`);
      logger.debug(`[PGLiteClientManager] Platform: ${process.platform}`);
      logger.debug(
        `[PGLiteClientManager] Path separators - original: ${options.dataDir.includes('\\') ? 'backslash' : 'forward'}`
      );
    }

    // Normalize the dataDir path if it exists to handle Windows paths correctly
    const normalizedOptions = options.dataDir
      ? { ...options, dataDir: path.normalize(options.dataDir) }
      : options;

    if (options.dataDir && normalizedOptions.dataDir) {
      logger.debug(`[PGLiteClientManager] Normalized dataDir: ${normalizedOptions.dataDir}`);
      logger.debug(
        `[PGLiteClientManager] Path changed: ${options.dataDir !== normalizedOptions.dataDir}`
      );
    }

    try {
      this.client = new PGlite({
        ...normalizedOptions,
        extensions: {
          vector,
          fuzzystrmatch,
        },
      });
      logger.debug(`[PGLiteClientManager] PGLite client created successfully`);
    } catch (error) {
      logger.error(`[PGLiteClientManager] Failed to create PGLite client:`, error);
      throw error;
    }

    this.setupShutdownHandlers();
  }

  public getConnection(): PGlite {
    return this.client;
  }

  public isShuttingDown(): boolean {
    return this.shuttingDown;
  }

  public async initialize(): Promise<void> {
    // Kept for backward compatibility
  }

  public async close(): Promise<void> {
    this.shuttingDown = true;
  }

  private setupShutdownHandlers() {
    // Implementation of setupShutdownHandlers method
  }
}
