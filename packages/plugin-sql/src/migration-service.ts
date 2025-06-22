import { sql } from 'drizzle-orm';
import { logger } from '@elizaos/core';

// Type definition to avoid import issues
interface Plugin {
  name: string;
  description?: string;
  schema?: any;
}

export interface MigrationHistory {
  id: string;
  pluginName: string;
  version: string;
  executedAt: Date;
  success: boolean;
  error?: string;
}

export class DatabaseMigrationService {
  private db: any;
  private registeredSchemas: Map<string, any> = new Map();
  private migrationHistory: Map<string, MigrationHistory[]> = new Map();

  async initializeWithDatabase(db: any): Promise<void> {
    this.db = db;
    await this.ensureMigrationTable();
  }

  private async ensureMigrationTable(): Promise<void> {
    try {
      await this.db.execute(sql`
        CREATE TABLE IF NOT EXISTS migration_history (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          plugin_name VARCHAR(255) NOT NULL,
          version VARCHAR(50) NOT NULL,
          executed_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
          success BOOLEAN NOT NULL DEFAULT true,
          error TEXT,
          UNIQUE(plugin_name, version)
        )
      `);
    } catch (error) {
      logger.error('Failed to create migration history table:', error);
      throw error;
    }
  }

  discoverAndRegisterPluginSchemas(plugins: Plugin[]): void {
    for (const plugin of plugins) {
      if (plugin.schema) {
        this.registeredSchemas.set(plugin.name, plugin.schema);
        logger.debug(`Registered schema for plugin: ${plugin.name}`);
      }
    }
  }

  async runAllPluginMigrations(): Promise<void> {
    for (const [pluginName, schema] of this.registeredSchemas.entries()) {
      try {
        await this.runPluginMigration(pluginName, schema);
      } catch (error) {
        logger.error(`Failed to run migrations for plugin ${pluginName}:`, error);
      }
    }
  }

  private async runPluginMigration(pluginName: string, schema: any): Promise<void> {
    logger.info(`Running migrations for plugin: ${pluginName}`);
    // Implementation would depend on the specific migration strategy
    // For now, this is a placeholder
  }

  async getMigrationHistory(pluginName?: string): Promise<MigrationHistory[]> {
    if (pluginName) {
      return this.migrationHistory.get(pluginName) || [];
    }
    
    const allHistory: MigrationHistory[] = [];
    for (const history of this.migrationHistory.values()) {
      allHistory.push(...history);
    }
    return allHistory;
  }
} 