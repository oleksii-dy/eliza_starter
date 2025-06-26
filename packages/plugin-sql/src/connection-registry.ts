import { logger, type UUID } from '@elizaos/core';
import type { PgAdapter } from './pg/adapter';
import { PgManager } from './pg/manager';

/**
 * Global registry for database connections to ensure all parts of the system
 * use the same database instance. This prevents the issue where tables are
 * created in one instance but not visible in another.
 */
class DatabaseConnectionRegistry {
  private postgresManagers = new Map<string, PgManager>();
  private adapters = new Map<UUID, PgAdapter>();
  private migrationLocks = new Map<string, Promise<void>>();

  /**
   * Get or create a PostgreSQL manager for the given URL
   */
  getPostgresManager(url: string): PgManager {
    const key = url;

    if (!this.postgresManagers.has(key)) {
      logger.info(`[ConnectionRegistry] Creating new PostgreSQL manager for: ${url}`);
      const manager = new PgManager({ connectionString: url });
      this.postgresManagers.set(key, manager);
    }

    return this.postgresManagers.get(key)!;
  }

  /**
   * Register an adapter instance
   */
  registerAdapter(agentId: UUID, adapter: PgAdapter): void {
    logger.info(`[ConnectionRegistry] Registering adapter for agent: ${agentId}`);
    this.adapters.set(agentId, adapter);
  }

  /**
   * Get an existing adapter instance
   */
  getAdapter(agentId: UUID): PgAdapter | null {
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
  getAllAdapters(): PgAdapter[] {
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
  }

  /**
   * Clear all connections synchronously (for tests)
   */
  clearAll(): void {
    // Clear all maps without async cleanup
    this.adapters.clear();
    this.postgresManagers.clear();
    this.migrationLocks.clear();
  }
}

// Global singleton instance
export const connectionRegistry = new DatabaseConnectionRegistry();
