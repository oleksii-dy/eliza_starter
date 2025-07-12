import { PGlite, type PGliteOptions } from '@electric-sql/pglite';
import { fuzzystrmatch } from '@electric-sql/pglite/contrib/fuzzystrmatch';
import { vector } from '@electric-sql/pglite/vector';
import type { IDatabaseClientManager } from '../types';

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
   * @param {PGliteOptions & { forceExtensions?: boolean }} options - The options to configure the PGlite client.
   */
  constructor(options: PGliteOptions) {
    this.client = new PGlite({
      ...options,
      extensions: {
        vector,
        fuzzystrmatch,
      },
    });
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
    if (this.shuttingDown) {
      return; // Already shutting down or closed
    }
    this.shuttingDown = true;
    try {
      await this.client.close();
    } catch (error) {
      // Ignore errors if already closed
      const errorMessage = error instanceof Error ? error.message : String(error);
      if (!errorMessage.includes('PGlite is closed')) {
        throw error;
      }
    }
  }

  private setupShutdownHandlers() {
    // Implementation of setupShutdownHandlers method
  }
}
