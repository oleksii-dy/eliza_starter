import { logger, type UUID } from '@elizaos/core';
import type { PgliteDatabaseAdapter } from './pglite/adapter';
import type { PgDatabaseAdapter } from './pg/adapter';
import { PostgresConnectionManager } from './pg/manager';
import { PGliteClientManager } from './pglite/manager';
import path from 'path';
import fs from 'fs';

/**
 * Global registry for database connections to ensure all parts of the system
 * use the same database instance. This prevents the issue where tables are
 * created in one instance but not visible in another.
 */
class DatabaseConnectionRegistry {
  // PGLite manager is now a singleton, no need to track instances
  private postgresManagers = new Map<string, PostgresConnectionManager>();
  private adapters = new Map<UUID, PgliteDatabaseAdapter | PgDatabaseAdapter>();
  private migrationLocks = new Map<string, Promise<void>>();
  private pgliteManagers = new Map<string, PGliteClientManager>();

  /**
   * Get or create a PGLite manager for the given path
   */
  getPGLiteManager(dataDir: string): PGliteClientManager {
    // For unified database approach, use a single connection
    // In test mode, use test database; otherwise use production database
    const isTest =
      process.env.NODE_ENV === 'test' ||
      process.env.VITEST === 'true' ||
      process.env.JEST_WORKER_ID !== undefined;

    // Normalize the path to handle trailing slashes and dots
    let normalizedDir = dataDir || 'default';

    // Only use unified database paths for non-test scenarios or when explicitly requested
    if (!normalizedDir.startsWith(':memory:') && !isTest) {
      // Force unified database location for production
      normalizedDir = 'production-db';
    }

    // Normalize file paths to handle trailing slashes and dots
    if (
      !normalizedDir.startsWith(':memory:') &&
      normalizedDir !== 'default' &&
      normalizedDir !== 'production-db'
    ) {
      normalizedDir = path.resolve(normalizedDir);
    }

    const key = normalizedDir;

    if (!this.pgliteManagers.has(key)) {
      logger.info(`[ConnectionRegistry] Creating new PGLite manager for: ${key}`);
      const actualDataDir = normalizedDir.startsWith(':memory:')
        ? dataDir
        : normalizedDir === 'default' || normalizedDir === 'production-db'
          ? `.eliza-temp/databases/${normalizedDir}`
          : normalizedDir.startsWith('/')
            ? normalizedDir // Use absolute paths as-is
            : `.eliza-temp/databases/${normalizedDir}`;

      // Ensure directory exists
      if (!normalizedDir.startsWith(':memory:')) {
        const dirPath = path.dirname(actualDataDir);
        if (!fs.existsSync(dirPath)) {
          fs.mkdirSync(dirPath, { recursive: true });
        }
      }

      const manager = new PGliteClientManager({ dataDir: actualDataDir });
      this.pgliteManagers.set(key, manager);
    }

    return this.pgliteManagers.get(key)!;
  }

  /**
   * Get or create a PostgreSQL manager for the given URL
   */
  getPostgresManager(url: string): PostgresConnectionManager {
    const key = url;

    if (!this.postgresManagers.has(key)) {
      logger.info(`[ConnectionRegistry] Creating new PostgreSQL manager for: ${url}`);
      const manager = new PostgresConnectionManager(url);
      this.postgresManagers.set(key, manager);
    }

    return this.postgresManagers.get(key)!;
  }

  /**
   * Register an adapter instance
   */
  registerAdapter(agentId: UUID, adapter: PgliteDatabaseAdapter | PgDatabaseAdapter): void {
    logger.info(`[ConnectionRegistry] Registering adapter for agent: ${agentId}`);
    this.adapters.set(agentId, adapter);
  }

  /**
   * Get an existing adapter instance
   */
  getAdapter(agentId: UUID): PgliteDatabaseAdapter | PgDatabaseAdapter | null {
    return this.adapters.get(agentId) || null;
  }

  /**
   * Remove an adapter instance from the registry
   */
  removeAdapter(agentId: UUID): void {
    logger.debug(`[ConnectionRegistry] Removing adapter for agent: ${agentId}`);
    this.adapters.delete(agentId);
  }

  /**
   * Execute a migration with a lock to prevent concurrent migrations
   */
  async withMigrationLock<T>(connectionKey: string, migrationFn: () => Promise<T>): Promise<T> {
    const lockKey = `migration:${connectionKey}`;

    // If a migration is already in progress, wait for it
    if (this.migrationLocks.has(lockKey)) {
      logger.info(
        `[ConnectionRegistry] Migration already in progress for ${connectionKey}, waiting...`
      );
      await this.migrationLocks.get(lockKey);
      logger.info(`[ConnectionRegistry] Previous migration completed for ${connectionKey}`);
      // Return early - the migration is already done
      return Promise.resolve() as Promise<T>;
    }

    // Create a new migration promise
    const migrationPromise = this.executeMigration(migrationFn);
    this.migrationLocks.set(
      lockKey,
      migrationPromise.then(() => {}).catch(() => {})
    );

    try {
      const result = await migrationPromise;
      return result;
    } finally {
      // Clean up the lock after migration completes
      this.migrationLocks.delete(lockKey);
    }
  }

  private async executeMigration<T>(migrationFn: () => Promise<T>): Promise<T> {
    return await migrationFn();
  }

  /**
   * Check if a migration is currently in progress
   */
  isMigrationInProgress(connectionKey: string): boolean {
    const lockKey = `migration:${connectionKey}`;
    return this.migrationLocks.has(lockKey);
  }

  /**
   * Get all adapters currently in the registry
   */
  getAllAdapters(): (PgliteDatabaseAdapter | PgDatabaseAdapter)[] {
    return Array.from(this.adapters.values());
  }

  /**
   * Clean up all connections
   */
  async cleanup(): Promise<void> {
    logger.info('[ConnectionRegistry] Cleaning up all connections...');

    // Close all adapters
    for (const [agentId, adapter] of this.adapters) {
      try {
        await adapter.close();
        logger.debug(`[ConnectionRegistry] Closed adapter for agent: ${agentId}`);
      } catch (error) {
        logger.error(`[ConnectionRegistry] Error closing adapter for ${agentId}:`, error);
      }
    }

    // Close all PGLite managers
    for (const [key, manager] of this.pgliteManagers) {
      try {
        await manager.close();
        logger.debug(`[ConnectionRegistry] Closed PGLite manager: ${key}`);
      } catch (error) {
        logger.error(`[ConnectionRegistry] Error closing PGLite manager ${key}:`, error);
      }
    }

    // Close all PostgreSQL managers
    for (const [key, manager] of this.postgresManagers) {
      try {
        await manager.close();
        logger.debug(`[ConnectionRegistry] Closed PostgreSQL manager: ${key}`);
      } catch (error) {
        logger.error(`[ConnectionRegistry] Error closing PostgreSQL manager ${key}:`, error);
      }
    }

    // Clear all maps
    this.adapters.clear();
    this.postgresManagers.clear();
    this.migrationLocks.clear();
    this.pgliteManagers.clear();
  }

  /**
   * Clear all connections synchronously (for tests)
   */
  clearAll(): void {
    // Close PGLite managers synchronously
    for (const [key, manager] of this.pgliteManagers) {
      try {
        // Force synchronous close for tests
        manager.close().catch((error) => {
          logger.debug(`[ConnectionRegistry] Error during clearAll PGLite close: ${key}`, error);
        });
      } catch (error) {
        // Ignore errors during test cleanup
      }
    }

    // Clear all maps without async cleanup
    this.adapters.clear();
    this.postgresManagers.clear();
    this.migrationLocks.clear();
    this.pgliteManagers.clear();
  }
}

// Global singleton instance
export const connectionRegistry = new DatabaseConnectionRegistry();
