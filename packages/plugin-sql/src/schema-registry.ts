import { logger } from '@elizaos/core';
import { sql } from 'drizzle-orm';
import type { DatabaseType } from './schema/factory';

/**
 * Represents a table schema that can be registered by plugins
 */
export interface TableSchema {
  name: string;
  pluginName: string;
  sql: string;
  dependencies?: string[]; // Other tables this table depends on
  fallbackSql?: string; // Alternative SQL for when certain extensions (like vector) are not available
}

/**
 * Registry for managing table schemas from multiple plugins.
 * This allows plugins to register their table definitions in a structured way
 * and ensures proper creation order based on dependencies.
 */
class SchemaRegistry {
  private tables = new Map<string, TableSchema>();
  private createdTables = new Set<string>();
  private vectorAvailable: boolean | null = null;

  /**
   * Register a table schema from a plugin
   */
  registerTable(schema: TableSchema): void {
    logger.info(
      `[SchemaRegistry] Registering table '${schema.name}' from plugin '${schema.pluginName}'`
    );

    if (this.tables.has(schema.name)) {
      const existing = this.tables.get(schema.name)!;
      if (existing.pluginName !== schema.pluginName) {
        throw new Error(
          `Table name conflict: '${schema.name}' is already registered by plugin '${existing.pluginName}', ` +
            `cannot register from plugin '${schema.pluginName}'`
        );
      }
      logger.debug(`[SchemaRegistry] Table '${schema.name}' already registered, skipping`);
      return;
    }

    this.tables.set(schema.name, schema);
  }

  /**
   * Register multiple tables from a plugin
   */
  registerTables(tables: TableSchema[]): void {
    for (const table of tables) {
      this.registerTable(table);
    }
  }

  /**
   * Get all registered tables in dependency order
   */
  getTablesInOrder(): TableSchema[] {
    const tables = Array.from(this.tables.values());
    const ordered: TableSchema[] = [];
    const visited = new Set<string>();
    const visiting = new Set<string>();

    const visit = (tableName: string) => {
      if (visiting.has(tableName)) {
        throw new Error(`Circular dependency detected involving table: ${tableName}`);
      }

      if (visited.has(tableName)) {
        return;
      }

      const table = this.tables.get(tableName);
      if (!table) {
        // Table might be external (like from another plugin), skip
        return;
      }

      visiting.add(tableName);

      // Visit dependencies first
      if (table.dependencies) {
        for (const dep of table.dependencies) {
          visit(dep);
        }
      }

      visiting.delete(tableName);
      visited.add(tableName);
      ordered.push(table);
    };

    // Visit all tables
    for (const table of tables) {
      visit(table.name);
    }

    return ordered;
  }

  /**
   * Check if vector extension is available
   */
  private async checkVectorAvailability(db: any): Promise<boolean> {
    if (this.vectorAvailable !== null) {
      return this.vectorAvailable;
    }

    try {
      // Try to create a temporary table with vector column
      await db.execute(sql.raw('CREATE TEMPORARY TABLE test_vector_check (id INT, vec vector(3))'));
      await db.execute(sql.raw('DROP TABLE test_vector_check'));
      this.vectorAvailable = true;
      logger.info('[SchemaRegistry] Vector extension is available');
      return true;
    } catch (error) {
      this.vectorAvailable = false;
      logger.warn('[SchemaRegistry] Vector extension is not available');
      return false;
    }
  }

  /**
   * Execute table creation for all registered tables
   */
  async createTables(db: any, dbType: DatabaseType): Promise<void> {
    logger.info('[SchemaRegistry] Creating all registered tables...');

    // Debug: Log current state
    logger.debug(
      `[SchemaRegistry] Current state: ${this.tables.size} tables registered, ${this.createdTables.size} already created`
    );
    logger.debug(
      `[SchemaRegistry] Registered table names: ${Array.from(this.tables.keys()).join(', ')}`
    );

    // Check vector availability first
    const vectorAvailable = await this.checkVectorAvailability(db);

    const orderedTables = this.getTablesInOrder();
    logger.info(
      `[SchemaRegistry] Found ${orderedTables.length} tables to create in dependency order`
    );

    // Ensure we have tables to create
    if (orderedTables.length === 0) {
      logger.error('[SchemaRegistry] No tables to create! Tables registered:', this.tables.size);
      logger.error(
        '[SchemaRegistry] This is likely a bug - tables should have been registered before createTables is called'
      );
      throw new Error('No tables registered for creation');
    }

    for (const table of orderedTables) {
      if (this.createdTables.has(table.name)) {
        logger.debug(`[SchemaRegistry] Table '${table.name}' already created, skipping`);
        continue;
      }

      try {
        logger.info(
          `[SchemaRegistry] Creating table '${table.name}' from plugin '${table.pluginName}'`
        );

        // Determine which SQL to use
        let sqlToExecute = table.sql;

        // For core tables that have fallback SQL, always use fallback for PGLite
        if (table.fallbackSql && dbType === 'pglite') {
          logger.info(
            `[SchemaRegistry] Using fallback SQL for table '${table.name}' (PGLite database type)`
          );
          sqlToExecute = table.fallbackSql;
        }
        // For vector-related tables without vector support
        else if (table.fallbackSql && !vectorAvailable && table.name === 'embeddings') {
          logger.info(
            `[SchemaRegistry] Using fallback SQL for table '${table.name}' (vector extension not available)`
          );
          sqlToExecute = table.fallbackSql;
        }

        // Apply schema qualification to table names
        const qualifiedTableName = this.getQualifiedTableName(table.name);
        if (qualifiedTableName !== table.name) {
          // Replace table name in SQL with qualified name
          const tableNameRegex = new RegExp(
            `(CREATE TABLE IF NOT EXISTS\\s+)["']?${table.name}["']?`,
            'i'
          );
          sqlToExecute = sqlToExecute.replace(tableNameRegex, `$1${qualifiedTableName}`);
          logger.debug(`[SchemaRegistry] Using qualified table name: ${qualifiedTableName}`);
        }

        // Log the SQL for debugging
        logger.debug(`[SchemaRegistry] Executing SQL for table '${table.name}':`, sqlToExecute);

        // Execute the table creation SQL
        await db.execute(sql.raw(sqlToExecute));

        // Verify the table was actually created
        try {
          // Use qualified table name for verification
          const verifyQuery =
            dbType === 'pglite'
              ? `SELECT 1 FROM ${qualifiedTableName} WHERE 1=0`
              : `SELECT 1 FROM "${qualifiedTableName}" WHERE 1=0`;
          await db.execute(sql.raw(verifyQuery));
          logger.info(`[SchemaRegistry] Successfully created and verified table '${table.name}'`);
          this.createdTables.add(table.name);
        } catch (verifyError) {
          // If verification fails, the table wasn't created
          logger.error(
            `[SchemaRegistry] Table '${table.name}' creation appeared to succeed but verification failed:`,
            verifyError
          );
          throw new Error(`Table '${table.name}' was not created successfully`);
        }
      } catch (error) {
        logger.error(`[SchemaRegistry] Failed to create table '${table.name}':`, error);
        // Log the actual SQL that failed
        logger.error(
          `[SchemaRegistry] Failed SQL:`,
          table.fallbackSql && dbType === 'pglite' ? table.fallbackSql : table.sql
        );
        throw error;
      }
    }

    logger.info('[SchemaRegistry] All tables created successfully');
  }

  /**
   * Get current schema based on environment
   */
  private getCurrentSchema(): string {
    // Use test schema when running tests
    const isTest =
      process.env.NODE_ENV === 'test' ||
      process.env.VITEST === 'true' ||
      process.env.JEST_WORKER_ID !== undefined;

    return isTest ? 'test' : 'public';
  }

  /**
   * Get table name with schema prefix
   */
  private getQualifiedTableName(tableName: string, schema?: string): string {
    const currentSchema = schema || this.getCurrentSchema();

    // For test schema in PGLite, use table prefix
    if (currentSchema === 'test' && process.env.DATABASE_TYPE === 'pglite') {
      return `test_${tableName}`;
    }

    // For PostgreSQL, use schema qualification
    if (process.env.DATABASE_TYPE === 'postgres' && currentSchema !== 'public') {
      return `${currentSchema}.${tableName}`;
    }

    // Default: just table name
    return tableName;
  }

  /**
   * Check if a table has been created
   */
  isTableCreated(tableName: string): boolean {
    return this.createdTables.has(tableName);
  }

  /**
   * Mark a table as created (useful for external tables)
   */
  markTableAsCreated(tableName: string): void {
    this.createdTables.add(tableName);
  }

  /**
   * Get all registered table names
   */
  getTableNames(): string[] {
    return Array.from(this.tables.keys());
  }

  /**
   * Clear all registrations (useful for tests)
   */
  clear(): void {
    logger.warn(
      '[SchemaRegistry] CLEARING ALL TABLE REGISTRATIONS - this should only happen in tests!'
    );
    logger.debug('[SchemaRegistry] Stack trace:', new Error().stack);
    this.tables.clear();
    this.createdTables.clear();
    this.vectorAvailable = null;
  }

  /**
   * Reset created tables tracking (useful between test runs)
   */
  resetCreatedTables(): void {
    logger.debug('[SchemaRegistry] Resetting created tables tracking');
    this.createdTables.clear();
    this.vectorAvailable = null;
  }

  /**
   * Get number of registered tables
   */
  getTableCount(): number {
    return this.tables.size;
  }

  /**
   * Get table schema by name
   */
  getTable(name: string): TableSchema | undefined {
    return this.tables.get(name);
  }
}

// Global singleton instance
export const schemaRegistry = new SchemaRegistry();

// Debug: Log when the singleton is created
logger.info('[SchemaRegistry] Global singleton instance created');
