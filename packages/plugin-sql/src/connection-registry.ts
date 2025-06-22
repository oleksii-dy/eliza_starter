import { logger, type UUID } from '@elizaos/core';
import { PGliteClientManager } from './pglite/manager';
import { PostgresConnectionManager } from './pg/manager';
import type { PgliteDatabaseAdapter } from './pglite/adapter';
import type { PgDatabaseAdapter } from './pg/adapter';

/**
 * Global registry for database connections to ensure all parts of the system
 * use the same database instance. This prevents the issue where tables are
 * created in one instance but not visible in another.
 */
class DatabaseConnectionRegistry {
  private pgLiteManagers = new Map<string, PGliteClientManager>();
  private postgresManagers = new Map<string, PostgresConnectionManager>();
  private adapters = new Map<UUID, PgliteDatabaseAdapter | PgDatabaseAdapter>();

  /**
   * Get or create a PGLite manager for the given path
   */
  getPGLiteManager(dataDir: string): PGliteClientManager {
    const key = dataDir || 'default';

    if (!this.pgLiteManagers.has(key)) {
      logger.info(`[ConnectionRegistry] Creating new PGLite manager for: ${key}`);
      const manager = new PGliteClientManager({ dataDir });
      this.pgLiteManagers.set(key, manager);
    }

    return this.pgLiteManagers.get(key)!;
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

    // Close all managers
    for (const [key, manager] of this.pgLiteManagers) {
      try {
        await manager.close();
        logger.debug(`[ConnectionRegistry] Closed PGLite manager: ${key}`);
      } catch (error) {
        logger.error(`[ConnectionRegistry] Error closing PGLite manager ${key}:`, error);
      }
    }

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
    this.pgLiteManagers.clear();
    this.postgresManagers.clear();
  }
}

// Global singleton instance
export const connectionRegistry = new DatabaseConnectionRegistry();
