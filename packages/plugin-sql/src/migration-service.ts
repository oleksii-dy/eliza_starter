import { logger, type Plugin } from '@elizaos/core';
import { runPluginMigrations } from './custom-migrator';
import type { DrizzleDatabase } from './types';
import { MigrationLockManager } from './migration-lock-manager';

export class DatabaseMigrationService {
  private db: DrizzleDatabase | null = null;
  private registeredSchemas = new Map<string, any>();
  private lockManager: MigrationLockManager | null = null;

  constructor() {
    // No longer extending Service, so no need to call super
  }

  async initializeWithDatabase(db: DrizzleDatabase): Promise<void> {
    this.db = db;
    this.lockManager = new MigrationLockManager(db);
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

  async runAllPluginMigrations(): Promise<void> {
    if (!this.db) {
      throw new Error('Database not initialized in DatabaseMigrationService');
    }

    if (!this.lockManager) {
      throw new Error('Lock manager not initialized in DatabaseMigrationService');
    }

    logger.info(`Running migrations for ${this.registeredSchemas.size} plugins...`);

    // Acquire global migration lock with timeout
    const lockAcquired = await this.lockManager.waitForLock('global_migration', 30000); // 30 second timeout
    
    if (!lockAcquired) {
      throw new Error('Could not acquire migration lock - another migration process may be running');
    }

    try {
      for (const [pluginName, schema] of this.registeredSchemas) {
        logger.info(`Starting migration for plugin: ${pluginName}`);
        
        // Calculate schema checksum for change detection
        const schemaChecksum = MigrationLockManager.calculateSchemaChecksum(schema);
        const version = `v1_${schemaChecksum.substring(0, 8)}`; // Use first 8 chars of checksum as version
        
        // Check if this migration has already been executed
        const alreadyExecuted = await this.lockManager.isMigrationExecuted(pluginName, version);
        
        if (alreadyExecuted) {
          logger.info(`Migration already executed for plugin: ${pluginName} (${version})`);
          continue;
        }
        
        const startTime = Date.now();
        
        try {
          await runPluginMigrations(this.db!, pluginName, schema);
          
          const duration = Date.now() - startTime;
          
          // Record successful migration
          await this.lockManager.recordMigration(
            pluginName,
            version,
            'public', // TODO: Get actual schema name from plugin
            duration,
            schemaChecksum
          );
          
          logger.info(`Completed migration for plugin: ${pluginName} in ${duration}ms`);
        } catch (error) {
          const duration = Date.now() - startTime;
          const errorMessage = error instanceof Error ? error.message : String(error);
          
          // Record failed migration
          await this.lockManager.recordFailedMigration(
            pluginName,
            version,
            'public',
            errorMessage,
            duration
          );
          
          // Re-throw to stop migration process
          throw error;
        }
      }

      logger.info('All plugin migrations completed.');
    } finally {
      // Always release the lock
      await this.lockManager.releaseLock('global_migration');
    }
  }
}
