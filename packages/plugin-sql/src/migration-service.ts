import { logger, type Plugin } from '@elizaos/core';
import { runPluginMigrations } from './custom-migrator';
import type { DrizzleDatabase } from './types';

// Constants for advisory locking
const MIGRATION_LOCK_ID = 7654321; // Unique ID for migration advisory lock
const MIGRATION_LOCK_TIMEOUT = 60000; // 60 seconds timeout for acquiring lock

export class DatabaseMigrationService {
  private db: DrizzleDatabase | null = null;
  private registeredSchemas = new Map<string, any>();
  private migrationStatus: 'idle' | 'running' | 'completed' | 'failed' = 'idle';
  private migrationError: Error | null = null;

  constructor() {
    // No longer extending Service, so no need to call super
  }

  async initializeWithDatabase(db: DrizzleDatabase): Promise<void> {
    this.db = db;
    logger.info('DatabaseMigrationService initialized with database');
  }

  discoverAndRegisterPluginSchemas(plugins: Plugin[]): void {
    for (const plugin of plugins) {
      if (plugin.schema) {
        this.registeredSchemas.set(plugin.name, plugin.schema);
        logger.info(`Registered schema for plugin: ${plugin.name}`);
      }
    }
    logger.info(
      `Discovered ${this.registeredSchemas.size} plugin schemas out of ${plugins.length} plugins`
    );
  }

  /**
   * Gets the current migration status
   */
  getMigrationStatus(): { status: string; error?: string } {
    return {
      status: this.migrationStatus,
      error: this.migrationError?.message,
    };
  }

  /**
   * Checks if migrations are currently running
   */
  isMigrationInProgress(): boolean {
    return this.migrationStatus === 'running';
  }

  /**
   * Attempts to acquire a PostgreSQL advisory lock
   * Returns true if lock was acquired, false otherwise
   */
  private async acquireAdvisoryLock(): Promise<boolean> {
    if (!this.db) {
      return false;
    }

    try {
      // Try to access the raw database connection
      const rawDb = this.db as any;

      // For PostgreSQL connections, we need to get the raw client
      if (rawDb.session && rawDb.session.client) {
        // Direct Drizzle NodePgDatabase access
        const result = await rawDb.session.client.query(
          'SELECT pg_try_advisory_lock($1) AS acquired',
          [MIGRATION_LOCK_ID]
        );
        return result.rows[0].acquired;
      } else if (rawDb.client) {
        // Direct client access
        const result = await rawDb.client.query('SELECT pg_try_advisory_lock($1) AS acquired', [
          MIGRATION_LOCK_ID,
        ]);
        return result.rows[0].acquired;
      } else {
        // Try executing through Drizzle's execute method
        const result = await this.db.execute(
          `SELECT pg_try_advisory_lock(${MIGRATION_LOCK_ID}) AS acquired`
        );
        return result[0]?.acquired === true;
      }
    } catch (error) {
      logger.debug('Advisory lock not supported or failed, proceeding without lock:', error);
      // If advisory locking is not supported (e.g., PGLite), proceed without lock
      return true;
    }
  }

  /**
   * Waits for advisory lock to be acquired (blocking)
   */
  private async waitForAdvisoryLock(): Promise<void> {
    if (!this.db) {
      return;
    }

    try {
      const rawDb = this.db as any;

      if (rawDb.session && rawDb.session.client) {
        await rawDb.session.client.query('SELECT pg_advisory_lock($1)', [MIGRATION_LOCK_ID]);
      } else if (rawDb.client) {
        await rawDb.client.query('SELECT pg_advisory_lock($1)', [MIGRATION_LOCK_ID]);
      } else {
        await this.db.execute(`SELECT pg_advisory_lock(${MIGRATION_LOCK_ID})`);
      }
    } catch (error) {
      logger.debug('Advisory lock wait not supported, proceeding:', error);
    }
  }

  /**
   * Releases the PostgreSQL advisory lock
   */
  private async releaseAdvisoryLock(): Promise<void> {
    if (!this.db) {
      return;
    }

    try {
      const rawDb = this.db as any;

      if (rawDb.session && rawDb.session.client) {
        await rawDb.session.client.query('SELECT pg_advisory_unlock($1)', [MIGRATION_LOCK_ID]);
      } else if (rawDb.client) {
        await rawDb.client.query('SELECT pg_advisory_unlock($1)', [MIGRATION_LOCK_ID]);
      } else {
        await this.db.execute(`SELECT pg_advisory_unlock(${MIGRATION_LOCK_ID})`);
      }
    } catch (error) {
      logger.debug('Advisory lock release not supported or failed:', error);
    }
  }

  async runAllPluginMigrations(): Promise<void> {
    if (!this.db) {
      throw new Error('Database not initialized in DatabaseMigrationService');
    }

    if (this.migrationStatus === 'running') {
      logger.warn('Migrations already in progress, skipping duplicate request');
      return;
    }

    if (this.migrationStatus === 'completed') {
      logger.info('Migrations already completed, skipping');
      return;
    }

    this.migrationStatus = 'running';
    this.migrationError = null;

    try {
      logger.info('Attempting to acquire migration advisory lock...');

      // Try to acquire the lock immediately
      const lockAcquired = await this.acquireAdvisoryLock();

      if (!lockAcquired) {
        logger.info('Migration lock not immediately available, waiting for lock...');

        // Wait for the lock to become available (with timeout)
        const lockPromise = this.waitForAdvisoryLock();
        const timeoutPromise = new Promise((_, reject) => {
          setTimeout(() => reject(new Error('Migration lock timeout')), MIGRATION_LOCK_TIMEOUT);
        });

        await Promise.race([lockPromise, timeoutPromise]);
        logger.info('Migration advisory lock acquired after waiting');
      } else {
        logger.info('Migration advisory lock acquired immediately');
      }

      logger.info(`Running migrations for ${this.registeredSchemas.size} plugins...`);

      for (const [pluginName, schema] of this.registeredSchemas) {
        logger.info(`Starting migration for plugin: ${pluginName}`);

        await runPluginMigrations(this.db!, pluginName, schema);

        logger.info(`Completed migration for plugin: ${pluginName}`);
      }

      this.migrationStatus = 'completed';
      logger.info('All plugin migrations completed successfully.');
    } catch (error) {
      this.migrationStatus = 'failed';
      this.migrationError = error as Error;
      logger.error('Migration failed:', error);
      throw error;
    } finally {
      // Always release the lock
      try {
        await this.releaseAdvisoryLock();
        logger.debug('Migration advisory lock released');
      } catch (lockError) {
        logger.warn('Failed to release migration advisory lock:', lockError);
      }
    }
  }
}
