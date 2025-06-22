import { Service, logger } from '@elizaos/core';
import type { IAgentRuntime } from '@elizaos/core';
import { sql } from 'drizzle-orm';
import { getTableConfig } from 'drizzle-orm/pg-core';

export interface IDatabaseService extends Service {
  /**
   * Initialize schema for a plugin dynamically
   */
  initializePluginSchema(pluginName: string, schema: any): Promise<void>;

  /**
   * Run plugin-specific table creation based on Drizzle schema
   */
  runPluginMigrations(pluginName: string, schema: any): Promise<void>;

  /**
   * Get the database instance
   */
  getDatabase(): any;
}

export class DatabaseService extends Service implements IDatabaseService {
  static serviceName = 'database';

  private db: any;

  get capabilityDescription(): string {
    return 'Database service for dynamic schema management';
  }

  constructor(runtime: IAgentRuntime, db: any) {
    super(runtime);
    this.db = db;
  }

  async initializePluginSchema(pluginName: string, schema: any): Promise<void> {
    logger.info(`[DatabaseService] Initializing schema for plugin: ${pluginName}`);

    try {
      if (!schema) {
        logger.warn(`[DatabaseService] No schema provided for ${pluginName}`);
        return;
      }

      // Create tables from the schema object
      await this.createTablesFromSchema(schema);

      logger.info(`[DatabaseService] Schema initialized for ${pluginName}`);
    } catch (error) {
      logger.error(`[DatabaseService] Failed to initialize schema for ${pluginName}:`, error);
      throw error;
    }
  }

  async runPluginMigrations(pluginName: string, schema: any): Promise<void> {
    logger.info(`[DatabaseService] Running migrations for plugin: ${pluginName}`);
    // This is now the same as initializePluginSchema
    await this.initializePluginSchema(pluginName, schema);
  }

  getDatabase(): any {
    return this.db;
  }

  async stop(): Promise<void> {
    // Cleanup if needed
  }

  private async createTablesFromSchema(schema: any): Promise<void> {
    logger.info('[DatabaseService] Creating tables from schema...');
    logger.debug('[DatabaseService] Schema keys:', Object.keys(schema));

    // Iterate through all exports in the schema
    for (const [key, value] of Object.entries(schema)) {
      // Skip non-table exports
      if (!value || typeof value !== 'object') {
        logger.debug(`[DatabaseService] Skipping non-object export: ${key}`);
        continue;
      }

      // Check if this is a lazy proxy
      const lazyProxy = value as any;
      if (lazyProxy._isLazyProxy && lazyProxy._createTableFn) {
        logger.debug(`[DatabaseService] Found lazy proxy for: ${key}`);
        // Force the lazy proxy to create the actual table
        const actualTable = lazyProxy._createTableFn();
        const tableConfig = getTableConfig(actualTable as any);
        if (tableConfig && tableConfig.name) {
          logger.debug(`[DatabaseService] Found table from lazy proxy: ${tableConfig.name}`);
          await this.createTable(tableConfig);
        }
      } else {
        // Check if this is a Drizzle table by looking for table config
        try {
          const tableConfig = getTableConfig(value as any);
          if (tableConfig && tableConfig.name) {
            logger.debug(`[DatabaseService] Found table: ${tableConfig.name}`);
            await this.createTable(tableConfig);
          } else {
            logger.debug(`[DatabaseService] No table config for: ${key}`);
          }
        } catch (e) {
          // Not a table, skip
          logger.debug(`[DatabaseService] Not a table: ${key}`);
          continue;
        }
      }
    }

    logger.info('[DatabaseService] Tables created successfully');
  }

  private async createTable(tableConfig: any): Promise<void> {
    const tableName = tableConfig.name;
    logger.debug(`[DatabaseService] Creating table: ${tableName}`);

    try {
      // Build CREATE TABLE IF NOT EXISTS statement
      const createTableSQL = this.buildCreateTableSQL(tableConfig);

      // Execute the SQL
      await this.executeSQL(createTableSQL);

      // Create indexes if any
      if (tableConfig.indexes && tableConfig.indexes.length > 0) {
        for (const index of tableConfig.indexes) {
          const indexSQL = this.buildCreateIndexSQL(tableName, index);
          if (indexSQL) {
            await this.executeSQL(indexSQL);
          }
        }
      }

      logger.debug(`[DatabaseService] Table ${tableName} created successfully`);
    } catch (error) {
      logger.warn(
        `[DatabaseService] Failed to create table ${tableName}: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
    }
  }

  private buildCreateTableSQL(tableConfig: any): string {
    const tableName = tableConfig.name;
    const columns = tableConfig.columns;

    const columnDefinitions: string[] = [];
    const primaryKeys: string[] = [];
    const uniqueConstraints: string[] = [];

    // Process each column
    // Columns is an array, not an object
    for (const column of columns) {
      const columnName = column.name;
      const columnDef = this.buildColumnDefinition(columnName, column);
      if (columnDef) {
        columnDefinitions.push(columnDef);

        // Check for primary key
        if (column.primary) {
          primaryKeys.push(`"${columnName}"`);
        }

        // Check for unique constraint
        if (column.isUnique) {
          uniqueConstraints.push(`"${columnName}"`);
        }
      }
    }

    // Build the CREATE TABLE statement
    let sql = `CREATE TABLE IF NOT EXISTS ${tableName} (\n`;
    sql += columnDefinitions.join(',\n');

    // Add primary key constraint
    if (primaryKeys.length > 0) {
      sql += `,\n  PRIMARY KEY (${primaryKeys.join(', ')})`;
    }

    // Add unique constraints
    for (const uniqueCol of uniqueConstraints) {
      sql += `,\n  UNIQUE(${uniqueCol})`;
    }

    sql += '\n)';

    return sql;
  }

  private buildColumnDefinition(columnName: string, column: any): string {
    // Quote column names to handle reserved keywords
    let def = `  "${columnName}"`;

    // Determine column type
    const dataType = column.dataType;
    const columnType = column.columnType || dataType;

    // Map common Drizzle types to SQL types
    let sqlType = '';

    if (columnType === 'PgUUID' || columnType === 'uuid') {
      sqlType = 'UUID';
    } else if (columnType === 'PgText' || columnType === 'text' || columnType === 'string') {
      sqlType = 'TEXT';
    } else if (columnType === 'PgInteger' || columnType === 'integer' || columnType === 'number') {
      sqlType = 'INTEGER';
    } else if (columnType === 'PgBoolean' || columnType === 'boolean') {
      sqlType = 'BOOLEAN';
    } else if (columnType === 'PgTimestamp' || columnType === 'timestamp') {
      sqlType = 'TIMESTAMP';
    } else if (columnType === 'PgJsonb' || columnType === 'json') {
      sqlType = 'JSONB';
    } else if (columnType === 'PgReal' || columnType === 'real') {
      sqlType = 'REAL';
    } else if (columnType === 'PgNumeric' || columnType === 'numeric') {
      sqlType = 'NUMERIC';
    } else if (columnType?.includes('vector')) {
      // Handle vector types
      const dimensions = column.dimensions || 1536;
      sqlType = `REAL[${dimensions}]`;
    } else {
      // Default to TEXT for unknown types
      sqlType = 'TEXT';
    }

    def += ` ${sqlType}`;

    // Add constraints
    if (column.notNull) {
      def += ' NOT NULL';
    }

    if (column.hasDefault) {
      if (column.defaultFn) {
        // Handle function defaults
        const defaultFnName = column.defaultFn?.toString() || '';
        if (defaultFnName.includes('gen_random_uuid') || defaultFnName.includes('uuid')) {
          def += ' DEFAULT gen_random_uuid()';
        } else if (defaultFnName.includes('now') || defaultFnName.includes('timestamp')) {
          def += ' DEFAULT CURRENT_TIMESTAMP';
        }
      } else if (column.default !== undefined) {
        // Check if it's a SQL object (from Drizzle)
        if (column.default && typeof column.default === 'object' && column.default.queryChunks) {
          // It's a Drizzle SQL object, extract the SQL string
          const sqlChunks = column.default.queryChunks;
          if (sqlChunks && sqlChunks.length > 0 && sqlChunks[0].value) {
            const sqlValue = sqlChunks[0].value[0];
            def += ` DEFAULT ${sqlValue}`;
          }
        } else if (typeof column.default === 'string') {
          def += ` DEFAULT '${column.default}'`;
        } else if (typeof column.default === 'boolean') {
          def += ` DEFAULT ${column.default}`;
        } else if (typeof column.default === 'number') {
          def += ` DEFAULT ${column.default}`;
        } else if (column.default === null) {
          def += ' DEFAULT NULL';
        } else if (Array.isArray(column.default)) {
          // For array defaults, serialize as JSON
          def += ` DEFAULT '${JSON.stringify(column.default)}'::jsonb`;
        } else if (typeof column.default === 'object') {
          // For object defaults, serialize as JSON
          def += ` DEFAULT '${JSON.stringify(column.default)}'::jsonb`;
        }
      }
    }

    return def;
  }

  private buildCreateIndexSQL(tableName: string, index: any): string | null {
    if (!index.config || !index.config.columns || index.config.columns.length === 0) {
      return null;
    }

    // Extract column names from the index configuration
    const columnNames = index.config.columns.map((col: any) => {
      // Handle both string column names and column objects
      if (typeof col === 'string') {
        return col;
      } else if (col.name) {
        return col.name;
      } else {
        // For SQL expressions or complex columns, convert to string
        return String(col);
      }
    });

    const indexName = index.config.name || `idx_${tableName}_${columnNames.join('_')}`;
    const unique = index.config.unique ? 'UNIQUE ' : '';
    // Quote column names in index
    const columns = columnNames.map((col) => `"${col}"`).join(', ');

    return `CREATE ${unique}INDEX IF NOT EXISTS ${indexName} ON ${tableName} (${columns})`;
  }

  private async executeSQL(query: string): Promise<void> {
    // Log full SQL for debugging
    if (query.length > 500) {
      logger.debug(`[DatabaseService] Executing SQL (truncated): ${query.substring(0, 500)}...`);
    } else {
      logger.debug(`[DatabaseService] Executing SQL: ${query}`);
    }

    try {
      if (this.db.execute) {
        // For Drizzle instances
        logger.debug('[DatabaseService] Using Drizzle execute method');
        await this.db.execute(sql.raw(query));
      } else if (this.db.exec) {
        // For PGLite instances
        logger.debug('[DatabaseService] Using PGLite exec method');
        await this.db.exec(query);
      } else if (this.db.query) {
        // For other database instances
        logger.debug('[DatabaseService] Using query method');
        await this.db.query(query);
      } else {
        logger.error('[DatabaseService] Database instance does not support SQL execution');
        throw new Error('Database instance does not support SQL execution');
      }
      logger.debug('[DatabaseService] SQL executed successfully');
    } catch (error) {
      // Log but don't throw - table might already exist
      logger.debug(
        `[DatabaseService] SQL execution failed (may be expected): ${
          error instanceof Error ? error.message : String(error)
        }`
      );
    }
  }
}
