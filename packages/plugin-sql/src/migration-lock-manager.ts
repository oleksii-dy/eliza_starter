import { logger } from '@elizaos/core';
import { sql } from 'drizzle-orm';
import { eq } from 'drizzle-orm';
import type { DrizzleDatabase } from './types';
import { migrationLockTable, migrationHistoryTable } from './schema';
import { createHash } from 'node:crypto';
import { hostname } from 'node:os';

/**
 * Manages database migration locking to prevent concurrent migrations
 * Uses PostgreSQL advisory locks with a fallback table-based locking mechanism
 */
export class MigrationLockManager {
  private static readonly LOCK_NAMESPACE = 'elizaos_migrations';
  private static readonly LOCK_TIMEOUT_MS = 60000; // 1 minute timeout
  private lockId: number | null = null;
  private processInfo: string;

  constructor(private db: DrizzleDatabase) {
    this.processInfo = `${process.pid}@${hostname()}`;
  }

  /**
   * Generate a numeric lock ID from a string key
   * PostgreSQL advisory locks require a bigint, so we hash the key
   */
  private generateLockId(key: string): number {
    const hash = createHash('sha256').update(key).digest();
    // Use first 8 bytes of hash as a bigint
    return parseInt(hash.toString('hex').substring(0, 15), 16);
  }

  /**
   * Acquire an advisory lock for migrations
   * @param lockKey Unique key for the lock (e.g., 'global_migration')
   * @returns true if lock was acquired, false otherwise
   */
  async acquireLock(lockKey: string = 'global_migration'): Promise<boolean> {
    this.lockId = this.generateLockId(`${MigrationLockManager.LOCK_NAMESPACE}:${lockKey}`);
    
    try {
      // First, ensure migration tables exist
      await this.ensureMigrationTables();

      // Try to acquire PostgreSQL advisory lock (non-blocking)
      const lockResult = await this.db.execute(
        sql`SELECT pg_try_advisory_lock(${this.lockId}) as acquired`
      );

      const acquired = lockResult.rows[0]?.acquired;
      
      if (acquired) {
        logger.info(`[MigrationLockManager] Acquired advisory lock ${this.lockId}`);
        
        // Record lock acquisition in the table for visibility
        try {
          await this.db.insert(migrationLockTable).values({
            lockId: lockKey,
            lockedBy: this.processInfo,
            pid: process.pid,
            hostname: hostname(),
          });
        } catch (error) {
          // If insert fails due to unique constraint, another process may have the lock
          logger.warn(`[MigrationLockManager] Could not record lock in table: ${error}`);
        }
        
        return true;
      } else {
        logger.warn(`[MigrationLockManager] Failed to acquire advisory lock ${this.lockId} - another migration may be in progress`);
        return false;
      }
    } catch (error) {
      logger.error(`[MigrationLockManager] Error acquiring lock: ${error}`);
      
      // Fallback to table-based locking for databases that don't support advisory locks
      return this.acquireTableLock(lockKey);
    }
  }

  /**
   * Release the advisory lock
   */
  async releaseLock(lockKey: string = 'global_migration'): Promise<void> {
    if (this.lockId === null) {
      return;
    }

    try {
      // Release PostgreSQL advisory lock
      await this.db.execute(
        sql`SELECT pg_advisory_unlock(${this.lockId}) as released`
      );
      
      logger.info(`[MigrationLockManager] Released advisory lock ${this.lockId}`);
      
      // Remove lock record from table
      await this.db.delete(migrationLockTable)
        .where(eq(migrationLockTable.lockId, lockKey));
        
      this.lockId = null;
    } catch (error) {
      logger.error(`[MigrationLockManager] Error releasing lock: ${error}`);
    }
  }

  /**
   * Wait for a lock to become available with timeout
   */
  async waitForLock(lockKey: string = 'global_migration', timeoutMs: number = MigrationLockManager.LOCK_TIMEOUT_MS): Promise<boolean> {
    const startTime = Date.now();
    const checkInterval = 1000; // Check every second
    
    while (Date.now() - startTime < timeoutMs) {
      if (await this.acquireLock(lockKey)) {
        return true;
      }
      
      // Check if the current lock holder is still alive
      await this.cleanupStaleLocks();
      
      // Wait before trying again
      await new Promise(resolve => setTimeout(resolve, checkInterval));
    }
    
    logger.error(`[MigrationLockManager] Timeout waiting for migration lock after ${timeoutMs}ms`);
    return false;
  }

  /**
   * Clean up stale locks from processes that may have crashed
   */
  private async cleanupStaleLocks(): Promise<void> {
    try {
      // Remove locks older than the timeout period
      const staleTime = new Date(Date.now() - MigrationLockManager.LOCK_TIMEOUT_MS);
      
      const staleLocks = await this.db.select()
        .from(migrationLockTable)
        .where(sql`${migrationLockTable.lockedAt} < ${staleTime}`);
        
      for (const lock of staleLocks) {
        logger.warn(`[MigrationLockManager] Cleaning up stale lock from ${lock.lockedBy}`);
        await this.db.delete(migrationLockTable)
          .where(eq(migrationLockTable.id, lock.id));
      }
    } catch (error) {
      logger.debug(`[MigrationLockManager] Error cleaning up stale locks: ${error}`);
    }
  }

  /**
   * Fallback table-based locking for databases without advisory lock support
   */
  private async acquireTableLock(lockKey: string): Promise<boolean> {
    try {
      await this.db.insert(migrationLockTable).values({
        lockId: lockKey,
        lockedBy: this.processInfo,
        pid: process.pid,
        hostname: hostname(),
      });
      
      logger.info(`[MigrationLockManager] Acquired table-based lock for ${lockKey}`);
      return true;
    } catch (error: any) {
      if (error.code === '23505') { // Unique constraint violation
        logger.warn(`[MigrationLockManager] Table lock already held by another process`);
        return false;
      }
      throw error;
    }
  }

  /**
   * Check if a migration has already been executed
   */
  async isMigrationExecuted(pluginName: string, version: string): Promise<boolean> {
    try {
      const result = await this.db.select()
        .from(migrationHistoryTable)
        .where(
          sql`${migrationHistoryTable.pluginName} = ${pluginName} 
              AND ${migrationHistoryTable.version} = ${version} 
              AND ${migrationHistoryTable.success} = true`
        )
        .limit(1);
        
      return result.length > 0;
    } catch (error) {
      // Table might not exist yet
      logger.debug(`[MigrationLockManager] Error checking migration history: ${error}`);
      return false;
    }
  }

  /**
   * Record a successful migration
   */
  async recordMigration(
    pluginName: string, 
    version: string, 
    schemaName: string,
    durationMs: number,
    checksum?: string
  ): Promise<void> {
    try {
      await this.db.insert(migrationHistoryTable).values({
        pluginName,
        version,
        schemaName,
        success: true,
        durationMs,
        checksum,
      });
      
      logger.info(`[MigrationLockManager] Recorded successful migration: ${pluginName} v${version}`);
    } catch (error) {
      logger.error(`[MigrationLockManager] Error recording migration: ${error}`);
      throw error;
    }
  }

  /**
   * Record a failed migration
   */
  async recordFailedMigration(
    pluginName: string,
    version: string,
    schemaName: string,
    errorMessage: string,
    durationMs: number
  ): Promise<void> {
    try {
      await this.db.insert(migrationHistoryTable).values({
        pluginName,
        version,
        schemaName,
        success: false,
        errorMessage: errorMessage.substring(0, 1000), // Truncate to fit column
        durationMs,
      });
      
      logger.error(`[MigrationLockManager] Recorded failed migration: ${pluginName} v${version}`);
    } catch (error) {
      logger.error(`[MigrationLockManager] Error recording failed migration: ${error}`);
    }
  }

  /**
   * Ensure migration tracking tables exist
   */
  private async ensureMigrationTables(): Promise<void> {
    try {
      // Check if tables exist by querying information_schema
      const tablesExist = await this.db.execute(
        sql`SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_schema = 'public' 
          AND table_name = 'migration_history'
        ) as history_exists,
        EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_schema = 'public' 
          AND table_name = 'migration_lock'
        ) as lock_exists`
      );

      const { history_exists, lock_exists } = tablesExist.rows[0] || {};

      if (!history_exists) {
        logger.info('[MigrationLockManager] Creating migration_history table');
        await this.createMigrationHistoryTable();
      }

      if (!lock_exists) {
        logger.info('[MigrationLockManager] Creating migration_lock table');
        await this.createMigrationLockTable();
      }
    } catch (error) {
      logger.debug(`[MigrationLockManager] Error checking/creating migration tables: ${error}`);
    }
  }

  /**
   * Create the migration history table
   */
  private async createMigrationHistoryTable(): Promise<void> {
    await this.db.execute(sql`
      CREATE TABLE IF NOT EXISTS migration_history (
        id SERIAL PRIMARY KEY,
        plugin_name VARCHAR(255) NOT NULL,
        version VARCHAR(255) NOT NULL,
        schema_name VARCHAR(255) NOT NULL,
        executed_at TIMESTAMP DEFAULT NOW() NOT NULL,
        success BOOLEAN DEFAULT true NOT NULL,
        error_message VARCHAR(1000),
        checksum VARCHAR(64),
        duration_ms INTEGER,
        CONSTRAINT unique_plugin_version UNIQUE (plugin_name, version)
      )
    `);

    await this.db.execute(sql`
      CREATE INDEX IF NOT EXISTS idx_migration_history_plugin 
      ON migration_history(plugin_name)
    `);
  }

  /**
   * Create the migration lock table
   */
  private async createMigrationLockTable(): Promise<void> {
    await this.db.execute(sql`
      CREATE TABLE IF NOT EXISTS migration_lock (
        id SERIAL PRIMARY KEY,
        lock_id VARCHAR(255) NOT NULL UNIQUE,
        locked_by VARCHAR(255) NOT NULL,
        locked_at TIMESTAMP DEFAULT NOW() NOT NULL,
        pid INTEGER,
        hostname VARCHAR(255)
      )
    `);
  }

  /**
   * Calculate checksum for a schema object
   */
  static calculateSchemaChecksum(schema: any): string {
    // Create a deterministic string representation of the schema
    const schemaString = JSON.stringify(schema, Object.keys(schema).sort());
    return createHash('sha256').update(schemaString).digest('hex');
  }
}