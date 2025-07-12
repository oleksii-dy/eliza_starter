import { sql } from 'drizzle-orm';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import type { PgliteDatabase } from 'drizzle-orm/pglite';
import type { BunSQLiteDatabase } from 'drizzle-orm/bun-sqlite';
import { logger } from '@elizaos/core';

// Create a type that includes the execute method that all our adapters provide
interface DrizzleDBWithExecute {
  execute(query: any): Promise<{ rows: any[] }>;
  transaction<T>(fn: (tx: any) => Promise<T>): Promise<T>;
  select(): any;
  update(table: any): any;
  delete(table: any): any;
  insert(table: any): any;
}

type DrizzleDB = (NodePgDatabase | PgliteDatabase | BunSQLiteDatabase) & DrizzleDBWithExecute;

/**
 * Extract clean error message from Drizzle wrapped errors
 * Drizzle wraps PostgreSQL errors and only shows the SQL query in the error message,
 * hiding the actual error in the cause property.
 */
function extractErrorMessage(error: unknown): string {
  if (error instanceof Error && 'cause' in error && error.cause) {
    return (error.cause as Error).message;
  } else if (error instanceof Error) {
    return error.message;
  }
  return 'Unknown error';
}

/**
 * Extract detailed error information including stack trace for logging
 * Returns both the clean message and stack trace for comprehensive debugging
 */
function extractErrorDetails(error: unknown): { message: string; stack?: string } {
  if (error instanceof Error && 'cause' in error && error.cause) {
    const cause = error.cause as Error;
    return {
      message: cause.message,
      stack: cause.stack || error.stack,
    };
  } else if (error instanceof Error) {
    return {
      message: error.message,
      stack: error.stack,
    };
  }
  return { message: 'Unknown error' };
}

/**
 * Convert camelCase to snake_case
 */
function toSnakeCase(str: string): string {
  return str
    .replace(/([A-Z])/g, '_$1')
    .toLowerCase()
    .replace(/^_/, ''); // Remove leading underscore if present
}

interface ColumnDefinition {
  name: string;
  type: string;
  primaryKey?: boolean;
  notNull?: boolean;
  defaultValue?: string;
  unique?: boolean;
  foreignKey?: {
    referencedTable: string;
    referencedColumn: string;
    onDelete?: string;
  };
}

interface IndexDefinition {
  name: string;
  columns: string[];
  unique?: boolean;
}

interface ForeignKeyDefinition {
  name: string;
  columns: string[];
  referencedTable: string;
  referencedColumns: string[];
  onDelete?: string;
}

interface TableDefinition {
  name: string;
  columns: ColumnDefinition[];
  indexes: IndexDefinition[];
  foreignKeys: ForeignKeyDefinition[];
  checkConstraints: { name: string; expression: string }[];
  dependencies: string[]; // Tables this table depends on
  compositePrimaryKey?: { name: string; columns: string[] }; // Add composite primary key support
  extraConfigBuilder?: (table: any) => any; // Store reference to builder for later use
  tableRef?: any; // Store reference to original table for SQL generation
}

// No hardcoded composite primary keys - all metadata should come from schema definitions

export class DrizzleSchemaIntrospector {
  parseTableDefinition(table: any, exportKey?: string): TableDefinition {
    const tableName = this.getTableName(table, exportKey);

    logger.debug(`[INTROSPECTOR] Parsing table definition for: ${tableName}`);

    const columns = this.parseColumns(table);
    const indexes = this.parseIndexes(table);
    const foreignKeys = this.parseForeignKeys(table);
    const checkConstraints = this.parseCheckConstraints(table);

    // Pass foreign key information to columns for SQLite inline foreign keys
    for (const fk of foreignKeys) {
      if (fk.columns.length === 1) {
        const colName = fk.columns[0];
        const col = columns.find((c) => c.name === colName);
        if (col) {
          col.foreignKey = {
            referencedTable: fk.referencedTable,
            referencedColumn: fk.referencedColumns[0],
            onDelete: fk.onDelete,
          };
        }
      }
    }

    // Get composite primary key from table metadata
    const compositePrimaryKey = this.parseCompositePrimaryKey(table);

    // Store reference to extraConfigBuilder if it exists
    let extraConfigBuilder: ((table: any) => any) | undefined;
    const tableConfig = table._;
    if (tableConfig?.extraConfigBuilder) {
      extraConfigBuilder = tableConfig.extraConfigBuilder;
    } else {
      // Check symbols for extraConfigBuilder
      const symbols = Object.getOwnPropertySymbols(table);
      const extraConfigSymbol = symbols.find((s) => s.toString().includes('ExtraConfigBuilder'));
      if (extraConfigSymbol) {
        extraConfigBuilder = table[extraConfigSymbol];
      }
    }

    // IMPORTANT: We cannot extract constraints from Drizzle's extraConfigBuilder
    // because calling it causes JSON parse errors in Drizzle's internal code.
    // This is a known limitation - Drizzle's constraint builders are not designed
    // to be called outside of Drizzle's table creation context.

    // For proper constraint support, users should either:
    // 1. Use Drizzle's native migration system
    // 2. Define constraints using our custom schema format
    // 3. Add constraints manually after table creation

    return {
      name: tableName,
      columns,
      indexes,
      foreignKeys,
      checkConstraints,
      compositePrimaryKey,
      dependencies: [...new Set(foreignKeys.map((fk) => fk.referencedTable))],
      extraConfigBuilder,
      tableRef: table,
    };
  }

  private getTableName(table: any, exportKey?: string): string {
    // logger.debug(`[INTROSPECTOR] Getting table name for table:`, {
    //   hasTableConfig: !!(table && table._),
    //   tableName: table && table._ && table._.name,
    //   exportKey,
    //   tableKeys: table ? Object.keys(table) : [],
    //   hasSymbols: table ? Object.getOwnPropertySymbols(table).length > 0 : false,
    // });

    if (!table) {
      logger.debug(`[INTROSPECTOR] No table provided, using fallback: unknown_table`);
      return 'unknown_table';
    }

    // Method 0: For custom schema format, use the export key directly
    if (table.columns && !table._ && exportKey) {
      // This is a custom schema format, use the export key as the table name
      const tableName = exportKey.toLowerCase();
      logger.debug(`[INTROSPECTOR] Found table name via custom schema format: ${tableName}`);
      return tableName;
    }

    // Method 1: Direct access via table._.name
    if (table._ && table._.name) {
      // logger.debug(`[INTROSPECTOR] Found table name via table._.name: ${table._.name}`);
      return table._.name;
    }

    // Method 2: Symbol-based table name access
    const symbols = Object.getOwnPropertySymbols(table);
    for (const symbol of symbols) {
      if (symbol.description && symbol.description.includes('drizzle:Name')) {
        const tableName = table[symbol];
        if (typeof tableName === 'string') {
          // logger.debug(`[INTROSPECTOR] Found table name via symbol: ${tableName}`);
          return tableName;
        }
      }
    }

    // Method 3: Use OriginalName symbol as fallback
    for (const symbol of symbols) {
      if (symbol.description && symbol.description.includes('drizzle:OriginalName')) {
        const tableName = table[symbol];
        if (typeof tableName === 'string') {
          // logger.debug(`[INTROSPECTOR] Found table name via OriginalName symbol: ${tableName}`);
          return tableName;
        }
      }
    }

    // Method 4: Use the export key as fallback
    if (exportKey && exportKey.toLowerCase().includes('table')) {
      // Convert camelCase export key to snake_case table name
      const tableName = exportKey
        .replace(/Table$/, '') // Remove 'Table' suffix
        .replace(/([A-Z])/g, '_$1') // Add underscores before capitals
        .toLowerCase()
        .replace(/^_/, ''); // Remove leading underscore
      // logger.debug(`[INTROSPECTOR] Using export key fallback: ${tableName} (from ${exportKey})`);
      return tableName;
    }

    // logger.debug(
    //   `[INTROSPECTOR] Using fallback table name: unknown_table (from ${exportKey || 'no-key'})`
    // );
    return 'unknown_table';
  }

  private parseColumns(table: any): ColumnDefinition[] {
    const columns: ColumnDefinition[] = [];
    const tableConfig = table._;

    // Check for custom schema format first (like test plugin schema)
    if (table.columns && !tableConfig) {
      logger.debug(`[INTROSPECTOR] Parsing custom schema format columns`);
      return this.parseCustomSchemaColumns(table);
    }

    if (!tableConfig || !tableConfig.columns) {
      return this.parseColumnsFallback(table);
    }

    for (const [columnName, column] of Object.entries(tableConfig.columns)) {
      const colDef = column as any;
      const snakeCaseName = toSnakeCase(columnName);
      const columnType = this.getSQLType(colDef, columnName);

      columns.push({
        name: snakeCaseName,
        type: columnType,
        primaryKey: colDef.primary,
        notNull: colDef.notNull,
        defaultValue: this.formatDefaultValue(colDef.default),
        unique: colDef.unique,
        foreignKey: colDef.foreignKey,
      });
    }
    return columns;
  }

  private parseCustomSchemaColumns(table: any): ColumnDefinition[] {
    const columns: ColumnDefinition[] = [];

    if (!table.columns || typeof table.columns !== 'object') {
      return columns;
    }

    logger.debug(
      `[INTROSPECTOR] Parsing custom schema columns for table with ${Object.keys(table.columns).length} columns`
    );

    for (const [columnName, columnDef] of Object.entries(table.columns)) {
      const colDef = columnDef as any;
      const snakeCaseName = toSnakeCase(columnName);

      // Map custom schema types to SQL types
      const sqlType = this.mapCustomSchemaType(colDef.type, colDef, columnName);

      logger.debug(
        `[INTROSPECTOR] Processing column ${columnName} -> ${snakeCaseName}: type=${colDef.type} -> ${sqlType}`
      );

      // Parse default value
      let defaultValue: string | undefined;
      if (colDef.default !== undefined) {
        if (colDef.default === 'gen_random_uuid()') {
          defaultValue = 'gen_random_uuid()';
        } else if (colDef.default === 'NOW()') {
          defaultValue = 'NOW()';
        } else if (colDef.default === true) {
          defaultValue = 'true';
        } else if (colDef.default === false) {
          defaultValue = 'false';
        } else if (typeof colDef.default === 'string') {
          defaultValue = `'${colDef.default}'`;
        } else if (typeof colDef.default === 'number') {
          defaultValue = colDef.default.toString();
        } else if (colDef.default === '{}') {
          defaultValue = "'{}'";
        } else {
          defaultValue = String(colDef.default);
        }
      }

      columns.push({
        name: snakeCaseName,
        type: sqlType,
        primaryKey: colDef.primaryKey || false,
        notNull: colDef.notNull || false,
        defaultValue,
        unique: colDef.unique || false,
        foreignKey: undefined, // Will be handled separately
      });
    }

    logger.debug(
      `[INTROSPECTOR] Parsed ${columns.length} custom schema columns: ${columns.map((c) => c.name).join(', ')}`
    );
    return columns;
  }

  private mapCustomSchemaType(type: string, colDef: any, columnName: string): string {
    switch (type) {
      case 'uuid':
        return 'UUID';
      case 'text':
        return 'TEXT';
      case 'integer':
        return 'INTEGER';
      case 'real':
        return 'REAL';
      case 'numeric':
        if (colDef.precision && colDef.scale) {
          return `NUMERIC(${colDef.precision}, ${colDef.scale})`;
        }
        return 'NUMERIC';
      case 'boolean':
        return 'BOOLEAN';
      case 'jsonb':
        return 'JSONB';
      case 'text[]':
        return 'TEXT[]';
      case 'vector':
        if (colDef.dimensions) {
          return `vector(${colDef.dimensions})`;
        }
        return 'vector(1536)'; // Default dimension
      case 'timestamp':
        return 'TIMESTAMP WITH TIME ZONE';
      default:
        return 'TEXT';
    }
  }

  private parseColumnsFallback(table: any): ColumnDefinition[] {
    const columns: ColumnDefinition[] = [];
    const tableName = this.getTableName(table, '');
    // Parse columns directly from table object properties
    for (const [key, value] of Object.entries(table)) {
      if (key === '_' || key === 'enableRLS' || typeof value !== 'object' || !value) continue;

      const col = value as any;
      // Check if this looks like a Drizzle column
      if (col && (col.columnType || col.config || col.dataType)) {
        const config = col.config || col;
        const columnName = config.name || key;

        // logger.debug(`[INTROSPECTOR] Processing column ${columnName}:`, {
        //   type: col.columnType,
        //   primaryKey: config.primaryKey || config.primary,
        //   notNull: config.notNull,
        //   hasDefault: !!config.default || !!config.defaultValue,
        //   defaultValue: config.default || config.defaultValue,
        //   hasReferences: !!config.references,
        // });

        const snakeCaseName = toSnakeCase(columnName);
        columns.push({
          name: snakeCaseName,
          type: this.mapDrizzleColumnType(col.columnType || 'unknown', config, columnName),
          primaryKey: config.primaryKey || config.primary || false,
          notNull: config.notNull !== false,
          defaultValue: this.formatDefaultValue(config.default || config.defaultValue),
          unique: config.unique || false,
          foreignKey: col.foreignKey,
        });
      }
    }

    return columns;
  }

  private parseForeignKeys(table: any): ForeignKeyDefinition[] {
    const foreignKeys: ForeignKeyDefinition[] = [];
    const tableName = this.getTableName(table, '');

    logger.debug(`[INTROSPECTOR] Parsing foreign keys for table: ${tableName}`);

    // Handle custom schema format
    if (table.columns && !table._ && table.foreignKeys) {
      logger.debug(`[INTROSPECTOR] Parsing custom schema format foreign keys`);
      return this.parseCustomSchemaForeignKeys(table);
    }

    // Check for inline foreign keys symbol
    const symbols = Object.getOwnPropertySymbols(table);
    const fkSymbol = symbols.find((s) => s.description?.includes('drizzle:PgInlineForeignKeys'));

    if (fkSymbol && Array.isArray(table[fkSymbol])) {
      const inlineForeignKeys = table[fkSymbol];
      logger.debug(`[INTROSPECTOR] Found ${inlineForeignKeys.length} inline foreign keys`);

      for (const fk of inlineForeignKeys) {
        if (fk && fk.reference && typeof fk.reference === 'function') {
          try {
            const refResult = fk.reference();

            // Extract referenced table from the reference result
            let referencedTable: string | null = null;
            if (refResult.foreignTable) {
              if (typeof refResult.foreignTable === 'string') {
                referencedTable = refResult.foreignTable;
              } else if (typeof refResult.foreignTable === 'object') {
                referencedTable = this.getTableName(refResult.foreignTable, '');
              }
            } else if (refResult.table) {
              referencedTable = this.getTableName(refResult.table, '');
            }

            // The reference result should have a name property which is the column name
            let columnName: string | null = null;
            if (refResult.name) {
              columnName = refResult.name;
            } else if (refResult.columns && refResult.columns.length > 0) {
              // Try to get from columns array
              const col = refResult.columns[0];
              columnName = typeof col === 'string' ? col : col.name;
            }

            // Get referenced columns
            let referencedColumns = ['id']; // Default
            if (refResult.foreignColumns && refResult.foreignColumns.length > 0) {
              referencedColumns = refResult.foreignColumns.map((col: any) =>
                typeof col === 'string' ? col : col.name
              );
            }

            if (referencedTable && columnName) {
              const foreignKey: ForeignKeyDefinition = {
                name: `${tableName}_${toSnakeCase(columnName)}_fkey`,
                columns: [toSnakeCase(columnName)],
                referencedTable: referencedTable,
                referencedColumns: referencedColumns,
                onDelete: fk.onDelete || 'no action',
              };

              foreignKeys.push(foreignKey);
              logger.debug(`[INTROSPECTOR] Added inline foreign key: ${foreignKey.name}`);
            }
          } catch (error) {
            logger.debug(`[INTROSPECTOR] Error processing inline foreign key:`, error);
          }
        }
      }
    }

    // Check column-level foreign keys
    for (const [colName, column] of Object.entries(table)) {
      if (colName === '_' || colName === 'enableRLS' || typeof column !== 'object' || !column)
        continue;

      const col = column as any;

      // Check if column has a reference (check both col.references and col.config.references)
      if ((col && col.references) || (col && col.config && col.config.references)) {
        const refFunc = col.references || col.config.references;
        const config = col.config || col;
        const columnName = config.name || colName;

        logger.debug(`[INTROSPECTOR] Found column ${columnName} with reference`);

        // Extract reference information
        try {
          const refResult = refFunc();
          logger.debug(`[INTROSPECTOR] Reference result for ${columnName}:`, {
            hasTable: !!refResult.table,
            tableName: refResult.table ? this.getTableName(refResult.table, '') : 'unknown',
          });

          const referencedTable = refResult.table ? this.getTableName(refResult.table, '') : null;
          if (referencedTable) {
            const fk: ForeignKeyDefinition = {
              name: `${tableName}_${toSnakeCase(columnName)}_fkey`,
              columns: [toSnakeCase(columnName)],
              referencedTable: referencedTable,
              referencedColumns: ['id'], // Default to id
              onDelete: config.onDelete || 'no action',
            };

            foreignKeys.push(fk);
            logger.debug(`[INTROSPECTOR] Added foreign key: ${fk.name}`);
          }
        } catch (error) {
          logger.debug(`[INTROSPECTOR] Error processing reference for ${columnName}:`, error);
        }
      }
    }

    logger.debug(`[INTROSPECTOR] Found ${foreignKeys.length} foreign keys for ${tableName}`);
    return foreignKeys;
  }

  private extractReferencedTableName(reference: any): string | null {
    logger.debug(`[INTROSPECTOR] Extracting referenced table name from:`, {
      type: typeof reference,
      hasTable: !!(reference && reference.table),
      tableType: reference && reference.table ? typeof reference.table : undefined,
      referenceKeys: reference ? Object.keys(reference) : [],
    });

    if (!reference) return null;

    // Method 1: Direct table name access
    if (reference.table && reference.table._ && reference.table._.name) {
      logger.debug(`[INTROSPECTOR] Found table name via table._.name: ${reference.table._.name}`);
      return reference.table._.name;
    }

    // Method 2: Symbol-based table name access
    if (reference.table) {
      const symbols = Object.getOwnPropertySymbols(reference.table);
      for (const symbol of symbols) {
        if (symbol.description && symbol.description.includes('drizzle:Name')) {
          const tableName = reference.table[symbol];
          if (typeof tableName === 'string') {
            logger.debug(`[INTROSPECTOR] Found table name via symbol: ${tableName}`);
            return tableName;
          }
        }
      }
    }

    // Method 3: Handle reference function result objects
    // When we call a reference function, it returns an object with foreignTable property
    if (reference.foreignTable && typeof reference.foreignTable === 'string') {
      logger.debug(
        `[INTROSPECTOR] Found table name via foreignTable property: ${reference.foreignTable}`
      );
      return reference.foreignTable;
    }

    // Method 4: Extract from name property (common in reference results)
    if (reference.name && typeof reference.name === 'string') {
      logger.debug(`[INTROSPECTOR] Found table name via name property: ${reference.name}`);
      return reference.name;
    }

    // Method 5: Check if the reference itself is a function and try to extract table info
    if (typeof reference === 'function') {
      try {
        // Try to call the reference function to get the actual table reference
        const referencedColumn = reference();
        if (referencedColumn && referencedColumn.table) {
          return this.extractReferencedTableName({ table: referencedColumn.table });
        }
      } catch (error) {
        logger.debug(`[INTROSPECTOR] Error calling reference function:`, error);
      }
    }

    // Method 6: Check for table property with different structures
    if (reference.table) {
      // Try to get table name from constructor or other properties
      const table = reference.table;

      // Check if it's a table-like object with a name property
      if (table.tableName) {
        logger.debug(`[INTROSPECTOR] Found table name via tableName: ${table.tableName}`);
        return table.tableName;
      }

      if (table.dbName) {
        logger.debug(`[INTROSPECTOR] Found table name via dbName: ${table.dbName}`);
        return table.dbName;
      }

      // Check constructor name for hints
      if (table.constructor && table.constructor.name !== 'Object') {
        logger.debug(
          `[INTROSPECTOR] Found potential table name via constructor: ${table.constructor.name}`
        );
        return table.constructor.name;
      }
    }

    logger.debug(`[INTROSPECTOR] Could not extract table name from reference`);
    return null;
  }

  private parseIndexes(table: any): IndexDefinition[] {
    const indexes: IndexDefinition[] = [];
    let tableConfig = table._;

    const tableName = this.getTableName(table, '');

    // Handle custom schema format
    if (table.columns && !tableConfig && table.indexes) {
      logger.debug(`[INTROSPECTOR] Parsing custom schema format indexes`);
      return this.parseCustomSchemaIndexes(table);
    }

    // If no direct _ property, check symbols for table config
    if (!tableConfig) {
      const symbols = Object.getOwnPropertySymbols(table);
      for (const sym of symbols) {
        if (sym.toString().includes('TableConfig')) {
          tableConfig = table[sym];
          logger.debug(`[INTROSPECTOR] Found table config via symbol`);
          break;
        }
      }
    }

    logger.debug(`[INTROSPECTOR] Parsing indexes. Has tableConfig:`, !!tableConfig);

    // Check for indexes in the standard location
    if (tableConfig && tableConfig.indexes) {
      logger.debug(
        `[INTROSPECTOR] Found indexes in table config:`,
        Object.keys(tableConfig.indexes)
      );
      for (const [indexName, index] of Object.entries(tableConfig.indexes)) {
        const idx = index as any;
        indexes.push({ name: indexName, columns: idx.columns || [], unique: idx.unique || false });
      }
    }

    // For now, we'll defer constraint extraction to SQL generation time
    // to avoid JSON parse errors during introspection

    logger.debug(`[INTROSPECTOR] Found ${indexes.length} indexes/constraints:`, indexes);
    return indexes;
  }

  private parseCustomSchemaIndexes(table: any): IndexDefinition[] {
    const indexes: IndexDefinition[] = [];

    if (!table.indexes || !Array.isArray(table.indexes)) {
      return indexes;
    }

    for (const indexDef of table.indexes) {
      if (indexDef.columns && Array.isArray(indexDef.columns)) {
        const indexName =
          indexDef.name ||
          `idx_${table.columns ? Object.keys(table.columns)[0] : 'unknown'}_${indexDef.columns.join('_')}`;
        indexes.push({
          name: indexName,
          columns: indexDef.columns.map((col: string) => toSnakeCase(col)),
          unique: indexDef.unique || false,
        });
      }
    }

    return indexes;
  }

  /**
   * Extract extra configs from a table without calling builder functions
   */
  private extractExtraConfigs(table: any, tableConfig: any): any[] {
    const extraConfigs: any[] = [];
    const tableName = this.getTableName(table, '');

    // Method 1: Check for already-built extra config result in table config
    if (tableConfig?.extra) {
      // Extra config might be stored as an already-built result
      extraConfigs.push(tableConfig.extra);
    }

    // Method 2: Look for ExtraConfigResult symbol
    const symbols = Object.getOwnPropertySymbols(table);
    const extraConfigResultSymbol = symbols.find(
      (s) =>
        s.toString().includes('ExtraConfigResult') ||
        (s.toString().includes('ExtraConfig') && !s.toString().includes('Builder'))
    );

    if (extraConfigResultSymbol) {
      const extraConfigResult = table[extraConfigResultSymbol];
      if (extraConfigResult) {
        extraConfigs.push(extraConfigResult);
      }
    }

    // Method 3: Check for pre-built constraints in table structure
    // Some Drizzle versions store built constraints directly
    if (table._constraints) {
      extraConfigs.push({ constraints: table._constraints });
    }

    // Method 4: Look for constraint definitions in column metadata
    if (tableConfig?.columns) {
      const columnConstraints: any[] = [];
      for (const [colName, colDef] of Object.entries(tableConfig.columns)) {
        const col = colDef as any;
        // Check for unique constraints defined on columns
        if (col.unique && !col.primaryKey) {
          // This will be handled as a column-level unique constraint
          // but we can also create an index for it
          columnConstraints.push({
            type: 'unique',
            name: `${this.getTableName(table, '')}_${toSnakeCase(colName)}_unique`,
            columns: [toSnakeCase(colName)],
          });
        }
      }
      if (columnConstraints.length > 0) {
        extraConfigs.push({ columnConstraints });
      }
    }

    // Method 5: For now, we cannot safely call extraConfigBuilder during introspection
    // because it causes JSON parse errors when the builder tries to access column properties.
    // The proper solution is to handle constraints during SQL generation phase.
    // For immediate functionality, we'll parse constraint definitions from the table definition
    // if they're available in a different format.

    logger.debug(`[INTROSPECTOR] Extracted ${extraConfigs.length} extra configs for ${tableName}`);
    return extraConfigs;
  }

  /**
   * Create a mock table object with proper column structure for constraint builders
   */
  private createMockTableForBuilder(table: any, tableConfig: any): any {
    const mockTable: any = {};

    // Copy table properties
    mockTable._ = tableConfig;

    // Create column proxies
    if (tableConfig?.columns) {
      for (const [colName, colDef] of Object.entries(tableConfig.columns)) {
        const col = colDef as any;
        // Create a mock column object that constraint builders can reference
        mockTable[colName] = {
          name: toSnakeCase(colName),
          dataType: col.dataType,
          notNull: col.notNull,
          primaryKey: col.primaryKey,
          unique: col.unique,
          // Add reference to the column definition
          _: col,
          // Add methods that constraint builders might call
          getName: () => toSnakeCase(colName),
          toString: () => toSnakeCase(colName),
        };
      }
    }

    // Add any other properties that might be needed
    Object.keys(table).forEach((key) => {
      if (!mockTable[key]) {
        mockTable[key] = table[key];
      }
    });

    return mockTable;
  }

  /**
   * Extract indexes and unique constraints from extra config objects
   */
  private extractIndexesFromExtraConfig(extraConfig: any, tableName: string): IndexDefinition[] {
    const indexes: IndexDefinition[] = [];

    if (!extraConfig) return indexes;

    logger.debug(`[INTROSPECTOR] Extracting indexes from extraConfig for ${tableName}:`, {
      type: typeof extraConfig,
      isArray: Array.isArray(extraConfig),
      keys: extraConfig && typeof extraConfig === 'object' ? Object.keys(extraConfig) : 'N/A',
      hasUnderscore: extraConfig && extraConfig._ ? true : false,
      underscoreType: extraConfig && extraConfig._ ? extraConfig._.type : 'N/A',
    });

    // Handle array of constraint objects
    if (Array.isArray(extraConfig)) {
      logger.debug(`[INTROSPECTOR] Processing array of ${extraConfig.length} constraints`);
      for (const item of extraConfig) {
        indexes.push(...this.extractIndexesFromExtraConfig(item, tableName));
      }
      return indexes;
    }

    // Handle constraint collections
    if (extraConfig.constraints) {
      for (const constraint of extraConfig.constraints) {
        const extracted = this.extractIndexFromConstraint(constraint, tableName);
        if (extracted) {
          indexes.push(extracted);
        }
      }
    }

    // Handle column constraints
    if (extraConfig.columnConstraints) {
      for (const constraint of extraConfig.columnConstraints) {
        if (constraint.type === 'unique') {
          indexes.push({
            name: constraint.name,
            columns: constraint.columns,
            unique: true,
          });
        } else if (constraint.type === 'index') {
          indexes.push({
            name: constraint.name,
            columns: constraint.columns,
            unique: false,
          });
        }
      }
    }

    // Handle direct constraint objects
    const constraintIndex = this.extractIndexFromConstraint(extraConfig, tableName);
    if (constraintIndex) {
      indexes.push(constraintIndex);
    }

    // Handle objects with multiple constraints
    if (typeof extraConfig === 'object' && !Array.isArray(extraConfig)) {
      for (const [key, value] of Object.entries(extraConfig)) {
        if (value && typeof value === 'object') {
          // Check for constraint-like objects
          const constraint = value as any;

          // Handle unique constraints
          if (
            constraint._ &&
            (constraint._.type === 'UniqueConstraintBuilder' ||
              constraint._.unique === true ||
              key.includes('unique'))
          ) {
            const columns = this.extractColumnsFromConstraint(constraint);
            if (columns.length > 0) {
              indexes.push({
                name: constraint._.name || key || `${tableName}_${columns.join('_')}_unique`,
                columns,
                unique: true,
              });
            }
          }

          // Handle index constraints
          if (
            constraint._ &&
            (constraint._.type === 'IndexBuilder' || key.includes('idx') || key.includes('index'))
          ) {
            const columns = this.extractColumnsFromConstraint(constraint);
            if (columns.length > 0) {
              indexes.push({
                name: constraint._.name || key || `idx_${tableName}_${columns.join('_')}`,
                columns,
                unique: false,
              });
            }
          }

          // Handle objects with columns property directly
          if (constraint.columns && constraint.name) {
            const columns = this.normalizeColumns(constraint.columns);
            if (columns.length > 0) {
              indexes.push({
                name: constraint.name,
                columns,
                unique: constraint.unique || false,
              });
            }
          }
        }
      }
    }

    return indexes;
  }

  /**
   * Extract index definition from a single constraint object
   */
  private extractIndexFromConstraint(constraint: any, tableName: string): IndexDefinition | null {
    if (!constraint) return null;

    // Handle constraint with _ property (Drizzle internal structure)
    if (constraint._) {
      const meta = constraint._;
      if (meta.type === 'UniqueConstraintBuilder' || meta.unique === true) {
        const columns = this.extractColumnsFromConstraint(constraint);
        if (columns.length > 0) {
          return {
            name: meta.name || `${tableName}_${columns.join('_')}_unique`,
            columns,
            unique: true,
          };
        }
      } else if (meta.type === 'IndexBuilder') {
        const columns = this.extractColumnsFromConstraint(constraint);
        if (columns.length > 0) {
          return {
            name: meta.name || `idx_${tableName}_${columns.join('_')}`,
            columns,
            unique: false,
          };
        }
      }
    }

    // Handle constraint with direct properties
    if (constraint.columns && (constraint.unique !== undefined || constraint.type)) {
      const columns = this.normalizeColumns(constraint.columns);
      if (columns.length > 0) {
        const isUnique = constraint.unique === true || constraint.type === 'unique';
        return {
          name:
            constraint.name ||
            (isUnique
              ? `${tableName}_${columns.join('_')}_unique`
              : `idx_${tableName}_${columns.join('_')}`),
          columns,
          unique: isUnique,
        };
      }
    }

    return null;
  }

  /**
   * Extract column names from a constraint object
   */
  private extractColumnsFromConstraint(constraint: any): string[] {
    const columns: string[] = [];

    // Check _ property for columns
    if (constraint._ && constraint._.columns) {
      return this.normalizeColumns(constraint._.columns);
    }

    // Check direct columns property
    if (constraint.columns) {
      return this.normalizeColumns(constraint.columns);
    }

    // Check for column references in the constraint
    if (constraint.config && constraint.config.columns) {
      return this.normalizeColumns(constraint.config.columns);
    }

    return columns;
  }

  /**
   * Normalize column array to string names
   */
  private normalizeColumns(columns: any): string[] {
    if (!columns || !Array.isArray(columns)) return [];

    return columns
      .map((col: any) => {
        // Handle column objects
        if (col && typeof col === 'object') {
          if (col.name) return toSnakeCase(col.name);
          if (col._ && col._.name) return toSnakeCase(col._.name);
          // Try to extract column name from toString
          const str = col.toString();
          if (str && !str.includes('[object')) return toSnakeCase(str);
        }
        // Handle string column names
        if (typeof col === 'string') {
          return toSnakeCase(col);
        }
        return '';
      })
      .filter((name) => name !== '');
  }

  /**
   * Extract constraints from extraConfigBuilder at SQL generation time
   */
  private extractConstraintsFromBuilder(
    extraConfigBuilder: (table: any) => any,
    tableRef: any,
    tableName: string
  ): { indexes: IndexDefinition[]; checks: { name: string; expression: string }[] } {
    const indexes: IndexDefinition[] = [];
    const checks: { name: string; expression: string }[] = [];

    try {
      // Create a proxy table that wraps the original table but provides
      // the column access pattern that constraint builders expect
      const proxyTable = new Proxy(tableRef, {
        get(target, prop) {
          // If accessing a column property, return a column descriptor
          // that constraint builders can work with
          if (typeof prop === 'string' && target._ && target._.columns && target._.columns[prop]) {
            const column = target._.columns[prop];
            return {
              name: prop,
              // Return the column itself so .on() can work
              ...column,
              // Override toString to return column name
              toString: () => toSnakeCase(prop),
            };
          }
          return target[prop];
        },
      });

      // Try to call the builder with the proxy table
      const extraConfigResult = extraConfigBuilder(proxyTable);

      if (extraConfigResult) {
        logger.info(`[SQL GENERATION] Successfully extracted constraints for ${tableName}`);

        // Process the result to extract constraints
        const configs = Array.isArray(extraConfigResult) ? extraConfigResult : [extraConfigResult];

        for (const config of configs) {
          if (!config) continue;

          // Extract constraint metadata
          let constraintName = '';
          let constraintType = '';
          let constraintColumns: string[] = [];
          let constraintExpression = '';

          // Check for Drizzle constraint objects with _ property containing config
          if (config._ && config._.config) {
            const meta = config._.config;
            constraintName = meta.name || '';

            // Extract columns from the constraint
            if (meta.columns && Array.isArray(meta.columns)) {
              constraintColumns = meta.columns
                .map((col: any) => {
                  if (typeof col === 'string') return toSnakeCase(col);
                  if (col && col.name) return toSnakeCase(col.name);
                  if (col && col.toString) return toSnakeCase(col.toString());
                  return '';
                })
                .filter(Boolean);
            }

            // Determine constraint type
            if (config.constructor && config.constructor.name) {
              const ctorName = config.constructor.name;
              if (ctorName.includes('Unique')) {
                constraintType = 'unique';
              } else if (ctorName.includes('Index')) {
                constraintType = 'index';
              } else if (ctorName.includes('Check')) {
                constraintType = 'check';
                // For check constraints, extract the SQL expression
                if (meta.value && typeof meta.value === 'object') {
                  // Extract SQL from the SQL object
                  if (meta.value.queryChunks) {
                    constraintExpression = meta.value.queryChunks
                      .map((chunk: any) => (typeof chunk === 'string' ? chunk : chunk.value || ''))
                      .join('');
                  } else if (meta.value.strings) {
                    // Handle SQL template literal format
                    constraintExpression = meta.value.strings[0] || '';
                  }
                }
              }
            }
          }

          // Add the constraint based on its type
          if (constraintType === 'unique' && constraintColumns.length > 0) {
            indexes.push({
              name: constraintName || `${tableName}_${constraintColumns.join('_')}_unique`,
              columns: constraintColumns,
              unique: true,
            });
            logger.debug(`[SQL GENERATION] Added unique constraint: ${constraintName}`);
          } else if (constraintType === 'index' && constraintColumns.length > 0) {
            indexes.push({
              name: constraintName || `idx_${tableName}_${constraintColumns.join('_')}`,
              columns: constraintColumns,
              unique: false,
            });
            logger.debug(`[SQL GENERATION] Added index: ${constraintName}`);
          } else if (constraintType === 'check' && constraintExpression) {
            checks.push({
              name: constraintName || `check_${tableName}_${checks.length + 1}`,
              expression: constraintExpression,
            });
            logger.debug(`[SQL GENERATION] Added check constraint: ${constraintName}`);
          }

          // Also check direct properties for constraint definitions
          if (config.config) {
            // Handle unique/index with config.columns
            if (config.config.columns && Array.isArray(config.config.columns)) {
              const columns = config.config.columns
                .map((c: any) =>
                  typeof c === 'string' ? toSnakeCase(c) : toSnakeCase(c.name || '')
                )
                .filter(Boolean);

              if (columns.length > 0) {
                const isUnique =
                  config.config.unique === true ||
                  config.name?.includes('unique') ||
                  config.config.name?.includes('unique');

                indexes.push({
                  name:
                    config.config.name ||
                    config.name ||
                    (isUnique
                      ? `${tableName}_${columns.join('_')}_unique`
                      : `idx_${tableName}_${columns.join('_')}`),
                  columns,
                  unique: isUnique,
                });
              }
            }

            // Handle check with config.expression
            if (config.config.expression) {
              checks.push({
                name:
                  config.config.name || config.name || `check_${tableName}_${checks.length + 1}`,
                expression: config.config.expression,
              });
            }
          }
        }
      }
    } catch (error) {
      // If extraction fails, log the error details
      const errorMessage = error instanceof Error ? error.message : String(error);
      logger.info(
        `[SQL GENERATION] Could not extract constraints for ${tableName}: ${errorMessage}`
      );

      // For JSON parse errors, this indicates the constraint builders need column proxies
      if (errorMessage.includes('JSON')) {
        logger.debug(
          `[SQL GENERATION] JSON parse error suggests constraint builders need proper column proxies`
        );
      }
    }

    logger.debug(
      `[SQL GENERATION] Extracted ${indexes.length} indexes and ${checks.length} check constraints for ${tableName}`
    );
    return { indexes, checks };
  }

  /**
   * Extract column names from SQL-like constraint object
   */
  private extractColumnsFromSQL(constraint: any): string[] | null {
    // Try to get columns from various possible locations
    if (constraint.config?.columns) {
      return constraint.config.columns
        .map((c: any) => (typeof c === 'string' ? c : c.name || ''))
        .filter(Boolean);
    }

    if (constraint.columns) {
      return constraint.columns
        .map((c: any) => (typeof c === 'string' ? c : c.name || ''))
        .filter(Boolean);
    }

    // Try to extract from SQL string if available
    if (constraint.getSQL && typeof constraint.getSQL === 'function') {
      try {
        const sql = constraint.getSQL();
        // Basic extraction from SQL - this is a simplified approach
        const match = sql.match(/\((.*?)\)/);
        if (match) {
          return match[1].split(',').map((c: string) => c.trim().replace(/"/g, ''));
        }
      } catch (e) {
        // Ignore
      }
    }

    return null;
  }

  /**
   * Extract expression from SQL-like constraint object
   */
  private extractExpressionFromSQL(constraint: any): string | null {
    if (constraint.config?.expression) {
      return constraint.config.expression;
    }

    if (constraint.expression) {
      return constraint.expression;
    }

    // Try to extract from SQL string if available
    if (constraint.getSQL && typeof constraint.getSQL === 'function') {
      try {
        const sql = constraint.getSQL();
        // Extract expression from CHECK constraint SQL
        const match = sql.match(/CHECK\s*\((.*)\)/i);
        if (match) {
          return match[1];
        }
      } catch (e) {
        // Ignore
      }
    }

    return null;
  }

  /**
   * Extract check constraints from extra config objects
   */
  private extractCheckConstraintsFromExtraConfig(
    extraConfig: any
  ): { name: string; expression: string }[] {
    const checkConstraints: { name: string; expression: string }[] = [];

    if (!extraConfig) return checkConstraints;

    // Handle array of constraint objects
    if (Array.isArray(extraConfig)) {
      for (const item of extraConfig) {
        checkConstraints.push(...this.extractCheckConstraintsFromExtraConfig(item));
      }
      return checkConstraints;
    }

    // Handle constraint collections
    if (extraConfig.constraints) {
      for (const constraint of extraConfig.constraints) {
        const extracted = this.extractCheckFromConstraint(constraint);
        if (extracted) {
          checkConstraints.push(extracted);
        }
      }
    }

    // Handle direct check constraint objects
    const checkConstraint = this.extractCheckFromConstraint(extraConfig);
    if (checkConstraint) {
      checkConstraints.push(checkConstraint);
    }

    // Handle objects with multiple constraints
    if (typeof extraConfig === 'object' && !Array.isArray(extraConfig)) {
      for (const [key, value] of Object.entries(extraConfig)) {
        if (value && typeof value === 'object') {
          const constraint = value as any;

          // Handle check constraints
          if (
            constraint._ &&
            (constraint._.type === 'CheckBuilder' || key.includes('check') || key.includes('chk'))
          ) {
            const expression = this.extractExpressionFromConstraint(constraint);
            if (expression) {
              checkConstraints.push({
                name: constraint._.name || key || `check_${checkConstraints.length + 1}`,
                expression,
              });
            }
          }

          // Handle objects with expression property directly
          if (constraint.expression && constraint.name) {
            checkConstraints.push({
              name: constraint.name,
              expression: constraint.expression,
            });
          }
        }
      }
    }

    return checkConstraints;
  }

  /**
   * Extract check constraint from a single constraint object
   */
  private extractCheckFromConstraint(constraint: any): { name: string; expression: string } | null {
    if (!constraint) return null;

    // Handle constraint with _ property (Drizzle internal structure)
    if (constraint._) {
      const meta = constraint._;
      if (meta.type === 'CheckBuilder') {
        const expression = this.extractExpressionFromConstraint(constraint);
        if (expression) {
          return {
            name: meta.name || `check_constraint`,
            expression,
          };
        }
      }
    }

    // Handle constraint with direct properties
    if (constraint.expression && (constraint.type === 'check' || constraint.name)) {
      return {
        name: constraint.name || `check_constraint`,
        expression: constraint.expression,
      };
    }

    return null;
  }

  /**
   * Extract SQL expression from a check constraint object
   */
  private extractExpressionFromConstraint(constraint: any): string | null {
    // Check _ property for expression
    if (constraint._ && constraint._.expression) {
      return constraint._.expression;
    }

    // Check direct expression property
    if (constraint.expression) {
      return constraint.expression;
    }

    // Check for SQL expression in config
    if (constraint.config && constraint.config.expression) {
      return constraint.config.expression;
    }

    // Check for condition property (alternative naming)
    if (constraint.condition) {
      return constraint.condition;
    }

    return null;
  }

  private parseCheckConstraints(table: any): { name: string; expression: string }[] {
    const checkConstraints: { name: string; expression: string }[] = [];
    let tableConfig = table._;

    // Handle custom schema format
    if (table.columns && !tableConfig && table.checks) {
      logger.debug(`[INTROSPECTOR] Parsing custom schema format check constraints`);
      return this.parseCustomSchemaChecks(table);
    }

    // If no direct _ property, check symbols for table config
    if (!tableConfig) {
      const symbols = Object.getOwnPropertySymbols(table);
      for (const sym of symbols) {
        if (sym.toString().includes('TableConfig')) {
          tableConfig = table[sym];
          break;
        }
      }
    }

    logger.debug(`[INTROSPECTOR] Parsing check constraints. Has tableConfig:`, !!tableConfig);

    // For now, we'll defer constraint extraction to SQL generation time
    // to avoid JSON parse errors during introspection

    logger.debug(
      `[INTROSPECTOR] Found ${checkConstraints.length} check constraints:`,
      checkConstraints
    );
    return checkConstraints;
  }

  private parseCustomSchemaChecks(table: any): { name: string; expression: string }[] {
    const checkConstraints: { name: string; expression: string }[] = [];

    if (!table.checks || !Array.isArray(table.checks)) {
      return checkConstraints;
    }

    for (const checkDef of table.checks) {
      if (checkDef.name && checkDef.condition) {
        checkConstraints.push({
          name: checkDef.name,
          expression: checkDef.condition,
        });
      }
    }

    return checkConstraints;
  }

  private parseCustomSchemaForeignKeys(table: any): ForeignKeyDefinition[] {
    const foreignKeys: ForeignKeyDefinition[] = [];
    const tableName = this.getTableName(table, '');

    if (!table.foreignKeys || !Array.isArray(table.foreignKeys)) {
      return foreignKeys;
    }

    for (const fkDef of table.foreignKeys) {
      if (fkDef.columns && fkDef.references) {
        const fkName = fkDef.name || `${tableName}_${fkDef.columns.join('_')}_fkey`;
        foreignKeys.push({
          name: fkName,
          columns: fkDef.columns.map((col: string) => toSnakeCase(col)),
          referencedTable: fkDef.references.table,
          referencedColumns: fkDef.references.columns.map((col: string) => toSnakeCase(col)),
          onDelete: fkDef.onDelete || 'no action',
        });
      }
    }

    return foreignKeys;
  }

  private parseCompositePrimaryKey(table: any): { name: string; columns: string[] } | undefined {
    let tableConfig = table._;
    const tableName = this.getTableName(table, '');

    // If no direct _ property, check symbols
    if (!tableConfig) {
      const symbols = Object.getOwnPropertySymbols(table);
      for (const sym of symbols) {
        // Look for the TableConfig symbol which contains extraConfigBuilder
        if (sym.toString().includes('TableConfig')) {
          tableConfig = table[sym];
          break;
        }
      }
    }

    // If still no table config, check for ExtraConfigBuilder symbol directly
    let extraConfigBuilder = tableConfig?.extraConfigBuilder;
    if (!extraConfigBuilder) {
      const symbols = Object.getOwnPropertySymbols(table);
      const extraConfigSymbol = symbols.find((s) => s.toString().includes('ExtraConfigBuilder'));
      if (extraConfigSymbol) {
        extraConfigBuilder = table[extraConfigSymbol];
      }
    }

    if (extraConfigBuilder) {
      try {
        const extraConfig =
          typeof extraConfigBuilder === 'function' ? extraConfigBuilder(table) : extraConfigBuilder;

        // Handle both array and object extraConfig
        if (Array.isArray(extraConfig)) {
          for (const item of extraConfig) {
            if (item && item._ && item._.name && item._.type === 'PrimaryKeyBuilder') {
              // Extract column names from the primary key definition
              const columnNames =
                item._.columns?.map((col: any) => toSnakeCase(col.name || col)) || [];
              logger.debug(
                `[INTROSPECTOR] Found composite primary key: ${item._.name}, columns: ${columnNames}`
              );
              return {
                name: item._.name,
                columns: columnNames,
              };
            }
          }
        } else if (extraConfig && typeof extraConfig === 'object') {
          // Handle object form of extraConfig (e.g., { pk: primaryKey(...) })
          for (const [key, value] of Object.entries(extraConfig)) {
            // Check if this is a primary key definition (with _ property)
            if (value && typeof value === 'object' && (value as any)._) {
              const config = (value as any)._;

              if (config.columns) {
                // Extract column names from the primary key definition
                const columnNames = config.columns.map((col: any) => {
                  // Handle column objects that have a name property
                  if (col && typeof col === 'object' && col.name) {
                    return toSnakeCase(col.name);
                  }
                  // Handle string column names
                  if (typeof col === 'string') {
                    return toSnakeCase(col);
                  }
                  // Fallback
                  return toSnakeCase(col?.toString() || 'unknown');
                });

                logger.debug(
                  `[INTROSPECTOR] Found composite primary key: ${config.name}, columns: ${columnNames}`
                );
                return {
                  name: config.name || `${tableName}_pkey`,
                  columns: columnNames,
                };
              }
            }
            // Check if this is a PrimaryKeyBuilder (direct columns property)
            else if (
              value &&
              value.constructor &&
              value.constructor.name === 'PrimaryKeyBuilder' &&
              (value as any).columns
            ) {
              const columns = (value as any).columns;
              const name = (value as any).name;

              // Extract column names from the primary key definition
              const columnNames = columns.map((col: any) => {
                // Handle column objects that have a name property
                if (col && typeof col === 'object' && col.name) {
                  return toSnakeCase(col.name);
                }
                // Handle string column names
                if (typeof col === 'string') {
                  return toSnakeCase(col);
                }
                // Fallback
                return toSnakeCase(col?.toString() || 'unknown');
              });

              logger.debug(
                `[INTROSPECTOR] Found PrimaryKeyBuilder composite primary key: ${name || `${tableName}_pkey`}, columns: ${columnNames}`
              );
              return {
                name: name || `${tableName}_pkey`,
                columns: columnNames,
              };
            }
          }
        }
      } catch (error) {
        logger.debug(`[INTROSPECTOR] Could not parse composite primary key:`, error);
      }
    }

    return undefined;
  }

  private getSQLType(column: any, columnName: string): string {
    const dataType = column.dataType || column._?.dataType;

    return this.getSQLTypeFromDataType(dataType, columnName);
  }

  private mapDrizzleColumnType(columnType: string, config: any, columnName: string): string {
    // Check if this is a vector column by name pattern
    if (columnName && columnName.match(/^(dim_?|embedding_?)\d+$/)) {
      const dimensions = columnName.replace(/^(dim_?|embedding_?)/, '');
      return `vector(${dimensions})`;
    }

    if (
      columnType === 'PgVector' ||
      config.sqlName === 'vector' ||
      config.customTypeParams?.dimensions
    ) {
      const dimensions = config.dimensions || config.customTypeParams?.dimensions || 384;
      return `vector(${dimensions})`;
    }

    // Handle numberTimestamp specifically
    if (config.sqlName?.includes('numberTimestamp') || columnType === 'numberTimestamp') {
      return 'TIMESTAMP WITH TIME ZONE';
    }

    // Handle SQLite column types
    if (columnType === 'SQLiteText') {
      return 'TEXT';
    }
    if (columnType === 'SQLiteInteger') {
      // Check if this is a boolean column in SQLite
      if (config.mode === 'boolean') {
        return 'INTEGER';
      }
      return 'INTEGER';
    }
    if (columnType === 'SQLiteBoolean') {
      // SQLite uses INTEGER for booleans
      return 'INTEGER';
    }
    if (columnType === 'SQLiteReal') {
      return 'REAL';
    }
    if (columnType === 'SQLiteBlob') {
      return 'BLOB';
    }

    // Handle integer mode for boolean in SQLite schema
    if (config.mode === 'boolean') {
      return 'INTEGER';
    }

    // PostgreSQL column types
    switch (columnType) {
      case 'PgUUID':
        return 'UUID';
      case 'PgVarchar':
        return config.length ? `VARCHAR(${config.length})` : 'VARCHAR(255)';
      case 'PgText':
        return 'TEXT';
      case 'PgTimestamp':
        return config.withTimezone ? 'TIMESTAMP WITH TIME ZONE' : 'TIMESTAMP';
      case 'PgInteger':
        return 'INTEGER';
      case 'PgBigint':
        return 'BIGINT';
      case 'PgBoolean':
        return 'BOOLEAN';
      case 'PgJsonb':
        return 'JSONB';
      case 'PgSerial':
        return 'SERIAL';
      case 'PgArray':
        return 'TEXT[]';
      case 'PgCustomColumn':
        // Check if it's a vector column
        if (columnName && columnName.match(/^(dim_?|embedding_?)\d+$/)) {
          const dimensions = columnName.replace(/^(dim_?|embedding_?)/, '');
          return `vector(${dimensions})`;
        }
        return 'TEXT';
      default:
        return 'TEXT';
    }
  }

  private getSQLTypeFromDataType(dataType: string, columnName: string): string {
    // Check if this is a vector column by name pattern (dim384, dim_384, embedding384, embedding_384, etc.)
    if (columnName && columnName.match(/^(dim_?|embedding_?)\d+$/)) {
      const dimensions = columnName.replace(/^(dim_?|embedding_?)/, '');
      return `vector(${dimensions})`;
    }

    // Debug logging
    if (columnName && columnName.includes('embedding')) {
      logger.debug(
        `[INTROSPECTOR] getSQLTypeFromDataType for ${columnName}: dataType = ${dataType}`
      );
    }

    // Try mapDrizzleColumnType if we have a specific column type
    if (dataType && dataType !== 'string') {
      return this.mapDrizzleColumnType(dataType, {}, columnName);
    }

    switch (dataType) {
      case 'uuid':
        return 'UUID';
      case 'text':
        return 'TEXT';
      case 'timestamp':
        return 'TIMESTAMP';
      case 'timestamptz':
        return 'TIMESTAMP WITH TIME ZONE';
      case 'boolean':
        return 'BOOLEAN';
      case 'jsonb':
        return 'JSONB';
      default:
        return 'TEXT';
    }
  }

  private formatDefaultValue(defaultValue: any): string | undefined {
    if (!defaultValue && defaultValue !== false && defaultValue !== 0) {
      return undefined;
    }

    // Check if this looks like a SQLite datetime default
    if (
      typeof defaultValue === 'string' &&
      (defaultValue.includes("datetime('now')") || defaultValue === "(datetime('now'))")
    ) {
      return "datetime('now')";
    }

    // Try to handle object-based defaults
    if (typeof defaultValue === 'object' && defaultValue !== null) {
      // logger.debug(`[INTROSPECTOR] Default value object:`, JSON.stringify(defaultValue));

      // Handle empty arrays/objects
      if (Array.isArray(defaultValue) && defaultValue.length === 0) {
        return "'[]'";
      }
      if (Object.keys(defaultValue).length === 0) {
        return "'{}'";
      }

      // Check for specific patterns
      if (defaultValue._sql && typeof defaultValue._sql === 'string') {
        // logger.debug(`[INTROSPECTOR] Has _sql property: ${defaultValue._sql}`);
        if (defaultValue._sql.includes("'{}'::text[]")) {
          return "'{}'";
        }
        if (defaultValue._sql.includes("'{}'::jsonb")) {
          return "'{}'";
        }
      }
      // Handle SQL constructor objects (like now())
      if (defaultValue.constructor && defaultValue.constructor.name === 'SQL') {
        // logger.debug(`[INTROSPECTOR] SQL object detected, checking for known patterns`);

        // Check if it has queryChunks (Drizzle ORM SQL object structure)
        if (defaultValue.queryChunks && Array.isArray(defaultValue.queryChunks)) {
          // Extract the SQL string from queryChunks
          for (const chunk of defaultValue.queryChunks) {
            if (chunk && chunk.value && Array.isArray(chunk.value)) {
              const sqlValue = chunk.value[0];
              if (typeof sqlValue === 'string') {
                // logger.debug(`[INTROSPECTOR] Found SQL value in queryChunks: ${sqlValue}`);
                if (sqlValue === 'gen_random_uuid()' || sqlValue === 'GEN_RANDOM_UUID()') {
                  return 'gen_random_uuid()';
                }
                if (sqlValue === 'now()' || sqlValue === 'NOW()') {
                  return 'now()';
                }
                if (sqlValue.includes("datetime('now')")) {
                  return "datetime('now')";
                }
                // Return the extracted SQL value
                return sqlValue;
              }
            }
          }
        }

        // Fallback to toString() method
        const sqlStr = defaultValue.toString();
        if (sqlStr.includes('now()') || sqlStr.includes('NOW()')) {
          return 'now()';
        }
        if (sqlStr.includes("datetime('now')")) {
          return "datetime('now')";
        }
        if (sqlStr.includes('gen_random_uuid()') || sqlStr.includes('GEN_RANDOM_UUID()')) {
          return 'gen_random_uuid()';
        }
        // Fallback for SQL objects
        return 'now()';
      }
    }

    if (typeof defaultValue === 'string') {
      // logger.debug(`[INTROSPECTOR] String default: '${defaultValue}'`);
      return `'${defaultValue}'`;
    }
    if (typeof defaultValue === 'number' || typeof defaultValue === 'boolean') {
      // logger.debug(`[INTROSPECTOR] Primitive default: ${defaultValue}`);
      return defaultValue.toString();
    }

    logger.debug(`[INTROSPECTOR] Could not format default value, returning undefined`);
    return undefined;
  }

  private convertToSQLiteType(pgType: string): string {
    // Remove any size/precision specifications and normalize
    const normalizedType = pgType.split('(')[0].toUpperCase();

    // Handle vector types
    if (normalizedType.includes('VECTOR')) {
      return 'TEXT';
    }

    switch (normalizedType) {
      case 'UUID':
        return 'TEXT';
      case 'SERIAL':
      case 'BIGSERIAL':
      case 'INTEGER':
      case 'BIGINT':
      case 'SMALLINT':
        return 'INTEGER';
      case 'VARCHAR':
      case 'TEXT':
      case 'CHAR':
        return 'TEXT';
      case 'BOOLEAN':
        return 'INTEGER';
      case 'REAL':
      case 'DOUBLE PRECISION':
      case 'DECIMAL':
      case 'NUMERIC':
        return 'REAL';
      case 'TIMESTAMP':
      case 'TIMESTAMP WITHOUT TIME ZONE':
      case 'TIMESTAMP WITH TIME ZONE':
      case 'DATE':
      case 'TIME':
        return 'TEXT';
      case 'JSON':
      case 'JSONB':
        return 'TEXT';
      default:
        return 'TEXT';
    }
  }

  // Create table SQL - includes foreign keys for SQLite
  generateCreateTableSQL(tableDef: TableDefinition, schemaName: string): string {
    // Detect if we're using SQLite based on schema name
    const isSQLite = schemaName === 'main';

    // Check if table has Drizzle extraConfigBuilder constraints
    let additionalIndexes: IndexDefinition[] = [];
    let additionalChecks: { name: string; expression: string }[] = [];
    let hasExtraConfigBuilder = false;

    if (tableDef.extraConfigBuilder && tableDef.tableRef) {
      hasExtraConfigBuilder = true;
      logger.warn(
        `[SQL GENERATION] Table ${tableDef.name} has Drizzle constraint builders that cannot be extracted. ` +
          `Constraints defined via Drizzle's unique(), index(), check() etc. will not be created. ` +
          `Please use ALTER TABLE statements or our custom schema format for constraints.`
      );
    }

    // Merge additional constraints with existing ones
    const allIndexes = [...tableDef.indexes, ...additionalIndexes];
    const allCheckConstraints = [...tableDef.checkConstraints, ...additionalChecks];

    const columnDefs = tableDef.columns
      .map((col) => {
        // Convert PostgreSQL types to SQLite types when needed
        const columnType = isSQLite ? this.convertToSQLiteType(col.type) : col.type;
        let def = `"${col.name}" ${columnType}`;

        // Handle default values
        if (col.defaultValue) {
          if (isSQLite) {
            // Convert PostgreSQL defaults to SQLite
            if (
              col.defaultValue === 'gen_random_uuid()' ||
              col.defaultValue.includes('uuid_generate')
            ) {
              // SQLite doesn't have UUID generation, skip it
            } else if (
              col.defaultValue === 'now()' ||
              col.defaultValue === 'NOW()' ||
              col.defaultValue.includes('CURRENT_TIMESTAMP')
            ) {
              def += ' DEFAULT CURRENT_TIMESTAMP';
            } else if (col.defaultValue === 'true') {
              def += ' DEFAULT 1';
            } else if (col.defaultValue === 'false') {
              def += ' DEFAULT 0';
            } else if (col.defaultValue.includes('::')) {
              // Remove PostgreSQL type casts
              const cleanDefault = col.defaultValue.split('::')[0];
              def += ` DEFAULT ${cleanDefault}`;
            } else {
              def += ` DEFAULT ${col.defaultValue}`;
            }
          } else {
            def += ` DEFAULT ${col.defaultValue}`;
          }
        }

        // Only add PRIMARY KEY for single column primary keys if no composite primary key exists
        if (col.primaryKey && !tableDef.compositePrimaryKey) def += ' PRIMARY KEY';
        if (col.notNull && !col.primaryKey) def += ' NOT NULL';
        if (col.unique) def += ' UNIQUE';

        // SQLite: Add inline foreign key references
        if (isSQLite && col.foreignKey) {
          const fk = tableDef.foreignKeys.find((f) => f.columns[0] === col.name);
          if (fk) {
            def += ` REFERENCES "${fk.referencedTable}"("${fk.referencedColumns[0]}")`;
            if (fk.onDelete) def += ` ON DELETE ${fk.onDelete}`;
          }
        }

        return def;
      })
      .join(',\n    ');

    // Add composite primary key if exists
    const compositePK = tableDef.compositePrimaryKey
      ? `,\n    PRIMARY KEY (${tableDef.compositePrimaryKey.columns.map((c) => `"${c}"`).join(', ')})`
      : '';

    // Add check constraints
    const checkConstraints = allCheckConstraints
      .map(
        (constraint) => `,\n    CONSTRAINT "${constraint.name}" CHECK (${constraint.expression})`
      )
      .join('');

    // Add unique constraints that weren't already added as column constraints
    const uniqueConstraints = allIndexes
      .filter((idx) => {
        if (!idx.unique) return false;
        // For single column constraints, check if it wasn't already added at column level
        if (idx.columns.length === 1) {
          const colName = idx.columns[0];
          const col = tableDef.columns.find((c) => c.name === colName);
          return col && !col.unique; // Include if column isn't already marked unique
        }
        // Always include multi-column unique constraints
        return true;
      })
      .map((idx) => {
        const constraintName = idx.name || `${tableDef.name}_${idx.columns.join('_')}_unique`;
        return `,\n    CONSTRAINT "${constraintName}" UNIQUE (${idx.columns.map((c) => `"${c}"`).join(', ')})`;
      })
      .join('');

    // Handle foreign keys
    let foreignKeyConstraints = '';
    if (!isSQLite) {
      // PostgreSQL: DO NOT add foreign keys during table creation
      // They will be added in phase 2 via ALTER TABLE to avoid dependency issues
      foreignKeyConstraints = '';
    }

    const allConstraints = `${columnDefs}${compositePK}${checkConstraints}${uniqueConstraints}${foreignKeyConstraints}`;

    // Log unique constraints for debugging
    if (uniqueConstraints || additionalIndexes.some((idx) => idx.unique)) {
      logger.debug(
        `[INTROSPECTOR] Table ${tableDef.name} has ${allIndexes.filter((idx) => idx.unique).length} unique constraints`
      );
    }

    // For SQLite, don't include schema prefix
    const tableName = isSQLite ? `"${tableDef.name}"` : `"${schemaName}"."${tableDef.name}"`;
    return `CREATE TABLE IF NOT EXISTS ${tableName} (\n    ${allConstraints}\n)`;
  }

  // Generate foreign key constraint SQL
  generateForeignKeySQL(tableDef: TableDefinition, schemaName: string): string[] {
    // SQLite doesn't support ALTER TABLE ADD CONSTRAINT for foreign keys
    if (schemaName === 'main') {
      return []; // SQLite foreign keys must be defined during table creation
    }

    return tableDef.foreignKeys.map(
      (fk) =>
        `ALTER TABLE "${schemaName}"."${tableDef.name}" ` +
        `ADD CONSTRAINT "${fk.name}" ` +
        `FOREIGN KEY ("${fk.columns.join('", "')}") ` +
        `REFERENCES "${schemaName}"."${fk.referencedTable}" ("${fk.referencedColumns.join('", "')}")` +
        (fk.onDelete ? ` ON DELETE ${fk.onDelete.toUpperCase()}` : '')
    );
  }
}

export class PluginNamespaceManager {
  constructor(private db: DrizzleDB) {}

  async getPluginSchema(pluginName: string): Promise<string> {
    // Keep it simple - always use public/main schema
    try {
      // Check if this is SQLite by looking for sqlite_master
      await this.db.execute(sql.raw(`SELECT name FROM sqlite_master WHERE type='table' LIMIT 1`));
      logger.debug('[CUSTOM MIGRATOR] SQLite detected, using main schema');
      return 'main';
    } catch (e) {
      // Not SQLite, it's PostgreSQL or PGLite - use public schema
      logger.debug('[CUSTOM MIGRATOR] PostgreSQL/PGLite detected, using public schema');
      return 'public';
    }
  }

  async ensureNamespace(schemaName: string): Promise<void> {
    if (schemaName === 'public' || schemaName === 'main') return;

    try {
      // Try PostgreSQL-style schema creation
      await this.db.execute(sql.raw(`CREATE SCHEMA IF NOT EXISTS "${schemaName}"`));
    } catch (error) {
      // SQLite doesn't support schemas, so we can safely ignore this
      logger.debug('[CUSTOM MIGRATOR] Schema creation not supported, continuing without schema');
    }
  }

  async introspectExistingTables(schemaName: string): Promise<string[]> {
    // SQLite doesn't have information_schema, use sqlite_master instead
    if (schemaName === 'main') {
      const res = await this.db.execute(
        sql.raw(
          `SELECT name as table_name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'`
        )
      );
      return res?.rows ? (res.rows as any[]).map((row) => row.table_name) : [];
    }

    // PostgreSQL/PGLite
    const res = await this.db.execute(
      sql.raw(
        `SELECT table_name FROM information_schema.tables WHERE table_schema = '${schemaName}'`
      )
    );
    return res?.rows ? (res.rows as any[]).map((row) => row.table_name) : [];
  }

  async foreignKeyExists(
    schemaName: string,
    tableName: string,
    constraintName: string
  ): Promise<boolean> {
    // SQLite doesn't support querying for foreign key constraints this way
    if (schemaName === 'main') {
      // SQLite foreign keys are part of table definition, not separately queryable
      return false;
    }

    try {
      const res = await this.db.execute(
        sql.raw(
          `SELECT constraint_name 
           FROM information_schema.table_constraints 
           WHERE table_schema = '${schemaName}' 
           AND table_name = '${tableName}' 
           AND constraint_name = '${constraintName}' 
           AND constraint_type = 'FOREIGN KEY'`
        )
      );
      return res.rows.length > 0;
    } catch (error) {
      // If the query fails, assume the constraint doesn't exist
      return false;
    }
  }

  async checkConstraintExists(
    schemaName: string,
    tableName: string,
    constraintName: string
  ): Promise<boolean> {
    // SQLite doesn't support querying for check constraints this way
    if (schemaName === 'main') {
      return false;
    }

    try {
      const res = await this.db.execute(
        sql.raw(
          `SELECT constraint_name 
           FROM information_schema.table_constraints 
           WHERE table_schema = '${schemaName}' 
           AND table_name = '${tableName}' 
           AND constraint_name = '${constraintName}' 
           AND constraint_type = 'CHECK'`
        )
      );
      return res.rows.length > 0;
    } catch (error) {
      // If the query fails, assume the constraint doesn't exist
      return false;
    }
  }

  async uniqueConstraintExists(
    schemaName: string,
    tableName: string,
    constraintName: string
  ): Promise<boolean> {
    // SQLite doesn't support querying for unique constraints this way
    if (schemaName === 'main') {
      return false;
    }

    try {
      const res = await this.db.execute(
        sql.raw(
          `SELECT constraint_name 
           FROM information_schema.table_constraints 
           WHERE table_schema = '${schemaName}' 
           AND table_name = '${tableName}' 
           AND constraint_name = '${constraintName}' 
           AND constraint_type = 'UNIQUE'`
        )
      );
      return res.rows.length > 0;
    } catch (error) {
      // If the query fails, assume the constraint doesn't exist
      return false;
    }
  }

  async createTable(tableDef: TableDefinition, schemaName: string): Promise<void> {
    const introspector = new DrizzleSchemaIntrospector();

    const createTableSQL = introspector.generateCreateTableSQL(tableDef, schemaName);

    // Debug log for users table
    if (tableDef.name === 'users') {
      logger.debug(`[CUSTOM MIGRATOR] Creating users table with SQL:`);
      logger.debug(createTableSQL);
      logger.debug(`[CUSTOM MIGRATOR] Users table columns (${tableDef.columns.length}):`);
      tableDef.columns.forEach((col) => {
        logger.debug(
          `  - ${col.name}: ${col.type} ${col.defaultValue ? `DEFAULT ${col.defaultValue}` : ''}`
        );
      });
    }

    // Debug log for agents table
    if (tableDef.name === 'agents') {
      logger.debug(
        `[CUSTOM MIGRATOR] Creating agents table with SQL (length: ${createTableSQL.length}):`
      );
      logger.debug(createTableSQL);

      // Log column definitions
      logger.debug(`[CUSTOM MIGRATOR] Agents table columns:`);
      tableDef.columns.forEach((col) => {
        logger.debug(
          `  - ${col.name}: ${col.type} ${col.defaultValue ? `DEFAULT ${col.defaultValue}` : ''}`
        );
      });
    }

    await this.db.execute(sql.raw(createTableSQL));
    logger.info(`Created table: ${tableDef.name}`);
  }

  async verifyTableSchema(tableDef: TableDefinition, schemaName: string): Promise<boolean> {
    try {
      // Get the actual columns from the database
      const isSQLite = schemaName === 'main';

      if (isSQLite) {
        // SQLite query
        const result = await this.db.execute(sql.raw(`PRAGMA table_info(${tableDef.name})`));
        const actualColumns = result.rows.map((row: any) => row.name);

        // Check if all expected columns exist
        const expectedColumns = tableDef.columns.map((col) => col.name);
        return expectedColumns.every((col) => actualColumns.includes(col));
      } else {
        // PostgreSQL query
        const result = await this.db.execute(
          sql.raw(`
          SELECT column_name 
          FROM information_schema.columns 
          WHERE table_name = '${tableDef.name}' AND table_schema = '${schemaName}'
        `)
        );

        const actualColumns = result.rows.map((row: any) => row.column_name);

        // Check if all expected columns exist
        const expectedColumns = tableDef.columns.map((col) => col.name);
        const hasAllColumns = expectedColumns.every((col) => actualColumns.includes(col));

        logger.debug(`[CUSTOM MIGRATOR] Schema verification for ${tableDef.name}:`);
        logger.debug(
          `  Expected columns (${expectedColumns.length}): ${expectedColumns.join(', ')}`
        );
        logger.debug(`  Actual columns (${actualColumns.length}): ${actualColumns.join(', ')}`);
        logger.debug(`  Schema correct: ${hasAllColumns}`);

        return hasAllColumns;
      }
    } catch (error) {
      logger.debug(`[CUSTOM MIGRATOR] Error verifying schema for ${tableDef.name}:`, error);
      return false;
    }
  }

  async dropTable(tableName: string, schemaName: string): Promise<void> {
    const isSQLite = schemaName === 'main';

    if (isSQLite) {
      await this.db.execute(sql.raw(`DROP TABLE IF EXISTS "${tableName}"`));
    } else {
      await this.db.execute(sql.raw(`DROP TABLE IF EXISTS "${schemaName}"."${tableName}" CASCADE`));
    }

    logger.info(`Dropped table: ${tableName}`);
  }

  async addConstraints(tableDef: TableDefinition, schemaName: string): Promise<void> {
    // SQLite doesn't support ALTER TABLE ADD CONSTRAINT
    if (schemaName === 'main') {
      if (tableDef.foreignKeys.length > 0 || tableDef.checkConstraints.length > 0) {
        logger.debug(
          `[CUSTOM MIGRATOR] Skipping constraint additions for SQLite table ${tableDef.name} (constraints must be defined during table creation)`
        );
      }
      return;
    }

    // If table has Drizzle's extraConfigBuilder, log a warning
    if (tableDef.extraConfigBuilder) {
      logger.warn(
        `[CUSTOM MIGRATOR] Table ${tableDef.name} uses Drizzle's constraint builders (unique(), index(), check()). ` +
          `Due to a limitation in Drizzle's API, these constraints cannot be automatically extracted and created. ` +
          `To add these constraints, please either:\n` +
          `1. Use Drizzle's native migration system (drizzle-kit)\n` +
          `2. Manually run ALTER TABLE statements after migration\n` +
          `3. Use our custom schema format instead of Drizzle's constraint builders`
      );
    }

    // Add foreign key constraints
    if (tableDef.foreignKeys.length > 0) {
      const introspector = new DrizzleSchemaIntrospector();
      const constraintSQLs = introspector.generateForeignKeySQL(tableDef, schemaName);
      for (let i = 0; i < tableDef.foreignKeys.length; i++) {
        const fk = tableDef.foreignKeys[i];
        const constraintSQL = constraintSQLs[i];

        try {
          // Check if foreign key already exists
          const exists = await this.foreignKeyExists(schemaName, tableDef.name, fk.name);
          if (exists) {
            logger.debug(
              `[CUSTOM MIGRATOR] Foreign key constraint ${fk.name} already exists, skipping`
            );
            continue;
          }

          // Debug log the constraint SQL
          logger.debug(`[CUSTOM MIGRATOR] Attempting to add foreign key constraint: ${fk.name}`);
          logger.debug(`[CUSTOM MIGRATOR] Foreign key definition:`, {
            name: fk.name,
            columns: fk.columns,
            referencedTable: fk.referencedTable,
            referencedColumns: fk.referencedColumns,
            onDelete: fk.onDelete,
          });
          logger.debug(`[CUSTOM MIGRATOR] Generated SQL: ${constraintSQL}`);

          await this.db.execute(sql.raw(constraintSQL));
          logger.debug(`[CUSTOM MIGRATOR] Successfully added foreign key constraint: ${fk.name}`);
        } catch (error: any) {
          // Log the error but continue processing other constraints
          const errorMessage = extractErrorMessage(error);
          if (errorMessage.includes('already exists')) {
            logger.debug(`[CUSTOM MIGRATOR] Foreign key constraint already exists: ${fk.name}`);
          } else if (errorMessage.includes('cannot be implemented')) {
            // Check if the referenced table exists
            try {
              const refTableExists = await this.introspectExistingTables(schemaName);
              if (!refTableExists.includes(fk.referencedTable)) {
                logger.error(
                  `[CUSTOM MIGRATOR] Cannot add foreign key constraint ${fk.name}: Referenced table ${fk.referencedTable} does not exist`
                );
              } else {
                logger.warn(
                  `[CUSTOM MIGRATOR] Foreign key constraint ${fk.name} cannot be implemented: ${errorMessage}`
                );
              }
            } catch (checkError) {
              logger.warn(
                `[CUSTOM MIGRATOR] Could not add foreign key constraint: ${errorMessage}`
              );
            }
          } else {
            logger.warn(`[CUSTOM MIGRATOR] Could not add foreign key constraint: ${errorMessage}`);
            logger.debug(`[CUSTOM MIGRATOR] Failed constraint SQL: ${constraintSQL}`);
          }
        }
      }
    }

    // Add check constraints
    if (tableDef.checkConstraints.length > 0) {
      for (const checkConstraint of tableDef.checkConstraints) {
        try {
          // Check if check constraint already exists
          const exists = await this.checkConstraintExists(
            schemaName,
            tableDef.name,
            checkConstraint.name
          );
          if (exists) {
            logger.debug(
              `[CUSTOM MIGRATOR] Check constraint ${checkConstraint.name} already exists, skipping`
            );
            continue;
          }

          const checkSQL = `ALTER TABLE "${schemaName}"."${tableDef.name}" ADD CONSTRAINT "${checkConstraint.name}" CHECK (${checkConstraint.expression})`;
          await this.db.execute(sql.raw(checkSQL));
          logger.debug(
            `[CUSTOM MIGRATOR] Successfully added check constraint: ${checkConstraint.name}`
          );
        } catch (error: any) {
          const errorMessage = extractErrorMessage(error);
          if (errorMessage.includes('already exists')) {
            logger.debug(
              `[CUSTOM MIGRATOR] Check constraint already exists: ${checkConstraint.name}`
            );
          } else {
            logger.warn(
              `[CUSTOM MIGRATOR] Could not add check constraint ${checkConstraint.name} (may already exist): ${errorMessage}`
            );
          }
        }
      }
    }
  }
}

export class ExtensionManager {
  constructor(private db: DrizzleDB) {}

  async installRequiredExtensions(requiredExtensions: string[]): Promise<void> {
    // First, check if we're running on SQLite by attempting to query sqlite_master
    let isSQLite = false;
    try {
      await this.db.execute(sql.raw(`SELECT name FROM sqlite_master WHERE type='table' LIMIT 1`));
      isSQLite = true;
    } catch (e) {
      // Not SQLite, continue with PostgreSQL extension installation
    }

    if (isSQLite) {
      logger.debug('[CUSTOM MIGRATOR] SQLite detected, skipping PostgreSQL extension installation');
      return;
    }

    for (const extension of requiredExtensions) {
      try {
        await this.db.execute(sql.raw(`CREATE EXTENSION IF NOT EXISTS "${extension}"`));
        logger.debug(`[CUSTOM MIGRATOR] Successfully installed extension: ${extension}`);
      } catch (error) {
        const errorDetails = extractErrorDetails(error);
        logger.warn(`Could not install extension ${extension}: ${errorDetails.message}`);
        if (errorDetails.stack) {
          logger.debug(
            `[CUSTOM MIGRATOR] Extension installation stack trace: ${errorDetails.stack}`
          );
        }
      }
    }
  }
}

/**
 * Detect if a plugin uses PostgreSQL-specific features that are incompatible with SQLite
 */
function isPostgreSQLSpecificPlugin(pluginName: string, schema: any): boolean {
  // Skip PostgreSQL detection for test plugins - they're designed to be cross-database compatible
  if (pluginName.includes('test-') || pluginName.includes('-test')) {
    return false;
  }

  // Known PostgreSQL-specific plugins
  const postgresOnlyPlugins = ['trust', 'plugin-trust', '@elizaos/plugin-trust'];

  if (postgresOnlyPlugins.some((name) => pluginName.includes(name))) {
    return true;
  }

  // Check if schema contains PostgreSQL-specific features
  if (!schema || typeof schema !== 'object') {
    return false;
  }

  try {
    // Convert schema to string to check for PostgreSQL-specific imports and functions
    const schemaString = JSON.stringify(schema, null, 2);

    // Check for PostgreSQL-specific features
    const pgFeatures = [
      'pgTable',
      'gen_random_uuid',
      'drizzle-orm/pg-core',
      'pg-core',
      'PgText',
      'PgUUID',
      'PgTimestamp',
      'PgInteger',
      'PgJsonb',
    ];

    for (const feature of pgFeatures) {
      if (schemaString.includes(feature)) {
        logger.debug(
          `[CUSTOM MIGRATOR] Detected PostgreSQL-specific feature: ${feature} in plugin ${pluginName}`
        );
        return true;
      }
    }

    // Check for table objects that use pgTable constructor name
    for (const [key, value] of Object.entries(schema)) {
      if (value && typeof value === 'object' && (value as any).constructor) {
        const constructorName = (value as any).constructor.name;
        if (
          constructorName &&
          (constructorName.includes('Pg') || constructorName.includes('PostgreSQL'))
        ) {
          logger.debug(
            `[CUSTOM MIGRATOR] Detected PostgreSQL-specific constructor: ${constructorName} in plugin ${pluginName}`
          );
          return true;
        }
      }

      // Check for pgTable in table metadata
      if (value && typeof value === 'object' && (value as any)._) {
        const tableConfig = (value as any)._;
        if (tableConfig.columns) {
          for (const [colName, column] of Object.entries(tableConfig.columns)) {
            const col = column as any;
            if (col.columnType && col.columnType.includes('Pg')) {
              logger.debug(
                `[CUSTOM MIGRATOR] Detected PostgreSQL-specific column type: ${col.columnType} in plugin ${pluginName}`
              );
              return true;
            }
          }
        }
      }
    }
  } catch (error) {
    logger.debug(
      `[CUSTOM MIGRATOR] Error checking for PostgreSQL features in plugin ${pluginName}:`,
      error
    );
  }

  return false;
}

// Topological sort for dependency ordering
function topologicalSort(tables: Map<string, TableDefinition>): string[] {
  const sorted: string[] = [];
  const visited = new Set<string>();
  const visiting = new Set<string>();

  function visit(tableName: string) {
    if (visiting.has(tableName)) {
      logger.warn(`Circular dependency detected involving table: ${tableName}`);
      return;
    }

    if (visited.has(tableName)) {
      return;
    }

    visiting.add(tableName);

    const table = tables.get(tableName);
    if (table) {
      // Visit dependencies first
      for (const dep of table.dependencies) {
        if (tables.has(dep)) {
          visit(dep);
        }
      }
    }

    visiting.delete(tableName);
    visited.add(tableName);
    sorted.push(tableName);
  }

  // Visit all tables
  for (const tableName of tables.keys()) {
    visit(tableName);
  }

  return sorted;
}

export async function runPluginMigrations(
  db: DrizzleDB,
  pluginName: string,
  schema: any
): Promise<void> {
  logger.debug(`[CUSTOM MIGRATOR] Starting migration for plugin: ${pluginName}`);

  // Test database connection first
  try {
    await db.execute(sql.raw('SELECT 1'));
    logger.debug('[CUSTOM MIGRATOR] Database connection verified');
  } catch (error) {
    const errorDetails = extractErrorDetails(error);
    logger.error(`[CUSTOM MIGRATOR] Database connection failed: ${errorDetails.message}`);
    if (errorDetails.stack) {
      logger.error(`[CUSTOM MIGRATOR] Stack trace: ${errorDetails.stack}`);
    }
    throw new Error(`Database connection failed: ${errorDetails.message}`);
  }

  // Early detection of SQLite to handle PostgreSQL-specific schemas
  let isSQLite = false;
  try {
    await db.execute(sql.raw(`SELECT name FROM sqlite_master WHERE type='table' LIMIT 1`));
    isSQLite = true;
  } catch (e) {
    // Not SQLite, continue with PostgreSQL logic
  }

  // Special handling for PostgreSQL-specific plugins on SQLite
  if (isSQLite && isPostgreSQLSpecificPlugin(pluginName, schema)) {
    logger.warn(
      `[CUSTOM MIGRATOR] Plugin ${pluginName} uses PostgreSQL-specific features that are not compatible with SQLite. Skipping migration.`
    );
    logger.info(
      `[CUSTOM MIGRATOR] To use ${pluginName}, please use a PostgreSQL or PGLite adapter instead of SQLite.`
    );
    return;
  }

  const namespaceManager = new PluginNamespaceManager(db);
  const introspector = new DrizzleSchemaIntrospector();
  const extensionManager = new ExtensionManager(db);

  await extensionManager.installRequiredExtensions(['vector', 'fuzzystrmatch']);
  const schemaName = await namespaceManager.getPluginSchema(pluginName);
  await namespaceManager.ensureNamespace(schemaName);
  const existingTables = await namespaceManager.introspectExistingTables(schemaName);

  // Discover all tables - both actual Drizzle table objects and custom schema format
  const tableEntries = Object.entries(schema).filter(([key, v]) => {
    // Skip container objects like 'tables' that contain other objects
    if (key === 'tables' && typeof v === 'object' && v !== null) {
      // Check if this is a container object by seeing if its values are also objects
      const values = Object.values(v);
      if (values.length > 0 && values.every((val) => typeof val === 'object' && val !== null)) {
        return false; // This is a container, skip it
      }
    }

    // Check for actual Drizzle table objects
    const isDrizzleTable =
      v &&
      (((v as any)._ && typeof (v as any)._.name === 'string') ||
        (typeof v === 'object' &&
          v !== null &&
          ('tableName' in v ||
            'dbName' in v ||
            // Only match if it ends with 'Table' (like todosTable, goalsTable)
            (key.toLowerCase().endsWith('table') && !key.toLowerCase().includes('tables')))));

    // Check for custom schema format (like test plugin schema)
    const isCustomSchema =
      v &&
      typeof v === 'object' &&
      v !== null &&
      'columns' in v &&
      typeof (v as any).columns === 'object' &&
      (v as any).columns !== null;

    return isDrizzleTable || isCustomSchema;
  });

  // Parse all table definitions
  const tableDefinitions = new Map<string, TableDefinition>();
  for (const [exportKey, table] of tableEntries) {
    const tableDef = introspector.parseTableDefinition(table, exportKey);
    tableDefinitions.set(tableDef.name, tableDef);
  }

  // Sort tables by dependencies (topological sort)
  const sortedTableNames = topologicalSort(tableDefinitions);
  // logger.debug(`[CUSTOM MIGRATOR] Table creation order:`, sortedTableNames);

  // logger.info(
  //   `Migrating ${tableDefinitions.size} tables for ${pluginName} to schema ${schemaName}`
  // );

  try {
    // Phase 1: Create all tables without foreign key constraints
    logger.debug(`[CUSTOM MIGRATOR] Phase 1: Creating tables...`);

    for (const tableName of sortedTableNames) {
      const tableDef = tableDefinitions.get(tableName);
      if (!tableDef) continue;

      const tableExists = existingTables.includes(tableDef.name);
      logger.debug(`[CUSTOM MIGRATOR] Table ${tableDef.name} exists: ${tableExists}`);

      if (!tableExists) {
        logger.debug(`[CUSTOM MIGRATOR] Creating table: ${tableDef.name}`);

        try {
          await namespaceManager.createTable(tableDef, schemaName);
        } catch (error) {
          const errorDetails = extractErrorDetails(error);
          logger.error(
            `[CUSTOM MIGRATOR] Failed to create table ${tableDef.name}: ${errorDetails.message}`
          );
          if (errorDetails.stack) {
            logger.error(`[CUSTOM MIGRATOR] Table creation stack trace: ${errorDetails.stack}`);
          }
          throw new Error(`Failed to create table ${tableDef.name}: ${errorDetails.message}`);
        }
      } else {
        // Check if the table has the expected columns
        const hasCorrectSchema = await namespaceManager.verifyTableSchema(tableDef, schemaName);
        if (!hasCorrectSchema) {
          logger.debug(
            `[CUSTOM MIGRATOR] Table ${tableDef.name} exists but has incorrect schema, recreating`
          );
          await namespaceManager.dropTable(tableDef.name, schemaName);
          await namespaceManager.createTable(tableDef, schemaName);
        } else {
          logger.debug(
            `[CUSTOM MIGRATOR] Table ${tableDef.name} already exists with correct schema, skipping creation`
          );
        }
      }
    }

    // Phase 2: Add constraints (foreign keys, check constraints, etc.)
    logger.debug(`[CUSTOM MIGRATOR] Phase 2: Adding constraints...`);
    for (const tableName of sortedTableNames) {
      const tableDef = tableDefinitions.get(tableName);
      if (!tableDef) continue;

      // Add constraints if table has foreign keys OR check constraints
      if (tableDef.foreignKeys.length > 0 || tableDef.checkConstraints.length > 0) {
        logger.debug(`[CUSTOM MIGRATOR] Adding constraints for table: ${tableDef.name}`, {
          foreignKeys: tableDef.foreignKeys.length,
          checkConstraints: tableDef.checkConstraints.length,
        });
        await namespaceManager.addConstraints(tableDef, schemaName);
      }
    }

    logger.debug(`[CUSTOM MIGRATOR] Completed migration for plugin: ${pluginName}`);
  } catch (error) {
    const errorDetails = extractErrorDetails(error);
    logger.error(
      `[CUSTOM MIGRATOR] Migration failed for plugin ${pluginName}: ${errorDetails.message}`
    );
    if (errorDetails.stack) {
      logger.error(`[CUSTOM MIGRATOR] Migration stack trace: ${errorDetails.stack}`);
    }
    throw new Error(`Migration failed for plugin ${pluginName}: ${errorDetails.message}`);
  }
}
