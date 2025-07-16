import { logger, type Plugin } from '@elizaos/core';
import { runPluginMigrations } from './custom-migrator';
import type { DrizzleDatabase } from './types';

// Constants for advisory locking
const MIGRATION_LOCK_ID = 7654321; // Unique ID for migration advisory lock
const MIGRATION_LOCK_TIMEOUT = 60000; // 60 seconds timeout for acquiring lock

// Migration service state
interface MigrationServiceState {
  db: DrizzleDatabase | null;
  registeredSchemas: Map<string, any>;
  migrationStatus: 'idle' | 'running' | 'completed' | 'failed';
  migrationError: Error | null;
}

// Create initial state
function createMigrationServiceState(): MigrationServiceState {
  return {
    db: null,
    registeredSchemas: new Map(),
    migrationStatus: 'idle',
    migrationError: null,
  };
}

export interface DatabaseMigrationService {
  initializeWithDatabase(db: DrizzleDatabase): Promise<void>;
  discoverAndRegisterPluginSchemas(plugins: Plugin[]): void;
  getMigrationStatus(): { status: string; error?: string };
  isMigrationInProgress(): boolean;
  runAllPluginMigrations(): Promise<void>;
}

export function createDatabaseMigrationService(): DatabaseMigrationService {
  const state = createMigrationServiceState();

  async function initializeWithDatabase(db: DrizzleDatabase): Promise<void> {
    state.db = db;
    logger.info('DatabaseMigrationService initialized with database');
  }

  function discoverAndRegisterPluginSchemas(plugins: Plugin[]): void {
    for (const plugin of plugins) {
      if (plugin.schema) {
        state.registeredSchemas.set(plugin.name, plugin.schema);
        logger.info(`Registered schema for plugin: ${plugin.name}`);
      }
    }
    logger.info(
      `Discovered ${state.registeredSchemas.size} plugin schemas out of ${plugins.length} plugins`
    );
  }

  /**
   * Gets the current migration status
   */
  function getMigrationStatus(): { status: string; error?: string } {
    return {
      status: state.migrationStatus,
      error: state.migrationError?.message,
    };
  }

  /**
   * Checks if migrations are currently running
   */
  function isMigrationInProgress(): boolean {
    return state.migrationStatus === 'running';
  }

  /**
   * Attempts to acquire a PostgreSQL advisory lock
   * Returns true if lock was acquired, false otherwise
   */
  async function acquireAdvisoryLock(): Promise<boolean> {
    if (!state.db) {
      return false;
    }

    try {
      // Try to access the raw database connection
      const rawDb = state.db as any;

      // For PostgreSQL connections, we need to get the raw client
      if (rawDb.session && rawDb.session.client) {
        // Direct Drizzle NodePgDatabase access
        const result = await rawDb.session.client.query(
          'SELECT pg_try_advisory_lock($1) AS acquired',
          [MIGRATION_LOCK_ID]
        );
        const acquired = result.rows[0].acquired;
        return acquired === true || acquired === 't';
      } else if (rawDb.client) {
        // Direct client access
        const result = await rawDb.client.query('SELECT pg_try_advisory_lock($1) AS acquired', [
          MIGRATION_LOCK_ID,
        ]);
        const acquired = result.rows[0].acquired;
        return acquired === true || acquired === 't';
      } else {
        // Try executing through Drizzle's execute method
        const result = await state.db.execute(
          'SELECT pg_try_advisory_lock($1) AS acquired',
          [MIGRATION_LOCK_ID]
        );
        // Handle different result formats and PostgreSQL string boolean values
        const acquired = result.rows?.[0]?.acquired ?? result[0]?.acquired;
        return acquired === true || acquired === 't';
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
  async function waitForAdvisoryLock(): Promise<void> {
    if (!state.db) {
      return;
    }

    try {
      const rawDb = state.db as any;

      if (rawDb.session && rawDb.session.client) {
        await rawDb.session.client.query('SELECT pg_advisory_lock($1)', [MIGRATION_LOCK_ID]);
      } else if (rawDb.client) {
        await rawDb.client.query('SELECT pg_advisory_lock($1)', [MIGRATION_LOCK_ID]);
      } else {
        await state.db.execute('SELECT pg_advisory_lock($1)', [MIGRATION_LOCK_ID]);
      }
    } catch (error) {
      logger.debug('Advisory lock wait not supported, proceeding:', error);
    }
  }

  /**
   * Releases the PostgreSQL advisory lock
   */
  async function releaseAdvisoryLock(): Promise<void> {
    if (!state.db) {
      return;
    }

    try {
      const rawDb = state.db as any;

      if (rawDb.session && rawDb.session.client) {
        await rawDb.session.client.query('SELECT pg_advisory_unlock($1)', [MIGRATION_LOCK_ID]);
      } else if (rawDb.client) {
        await rawDb.client.query('SELECT pg_advisory_unlock($1)', [MIGRATION_LOCK_ID]);
      } else {
        await state.db.execute('SELECT pg_advisory_unlock($1)', [MIGRATION_LOCK_ID]);
      }
    } catch (error) {
      logger.debug('Advisory lock release not supported or failed:', error);
    }
  }

  async function runAllPluginMigrations(): Promise<void> {
    if (!state.db) {
      throw new Error('Database not initialized in DatabaseMigrationService');
    }

    if (state.migrationStatus === 'running') {
      logger.warn('Migrations already in progress, skipping duplicate request');
      return;
    }

    if (state.migrationStatus === 'completed') {
      logger.info('Migrations already completed, skipping');
      return;
    }

    state.migrationStatus = 'running';
    state.migrationError = null;

    try {
      logger.info('Attempting to acquire migration advisory lock...');

      // Try to acquire the lock immediately
      const lockAcquired = await acquireAdvisoryLock();

      if (!lockAcquired) {
        logger.info('Migration lock not immediately available, waiting for lock...');

        // Wait for the lock to become available (with timeout)
        const lockPromise = waitForAdvisoryLock();
        let timeoutId: NodeJS.Timeout;
        const timeoutPromise = new Promise<never>((_, reject) => {
          timeoutId = setTimeout(() => reject(new Error('Migration lock timeout')), MIGRATION_LOCK_TIMEOUT);
        });

        try {
          await Promise.race([lockPromise, timeoutPromise]);
        } finally {
          // Clean up the timeout to prevent memory leaks
          if (timeoutId) {
            clearTimeout(timeoutId);
          }
        }
        logger.info('Migration advisory lock acquired after waiting');
      } else {
        logger.info('Migration advisory lock acquired immediately');
      }

      logger.info(`Running migrations for ${state.registeredSchemas.size} plugins...`);

      for (const [pluginName, schema] of state.registeredSchemas) {
        logger.info(`Starting migration for plugin: ${pluginName}`);

        await runPluginMigrations(state.db!, pluginName, schema);

        logger.info(`Completed migration for plugin: ${pluginName}`);
      }

      state.migrationStatus = 'completed';
      logger.info('All plugin migrations completed successfully.');
    } catch (error) {
      state.migrationStatus = 'failed';
      state.migrationError = error as Error;
      logger.error('Migration failed:', error);
      throw error;
    } finally {
      // Always release the lock
      try {
        await releaseAdvisoryLock();
        logger.debug('Migration advisory lock released');
      } catch (lockError) {
        logger.warn('Failed to release migration advisory lock:', lockError);
      }
    }
  }

  return {
    initializeWithDatabase,
    discoverAndRegisterPluginSchemas,
    getMigrationStatus,
    isMigrationInProgress,
    runAllPluginMigrations,
  };
}

// Export the legacy class name for backward compatibility
export const DatabaseMigrationService = createDatabaseMigrationService;
