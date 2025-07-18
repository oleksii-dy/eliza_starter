/**
 * Schema Provider System for ElizaOS Plugins
 * 
 * This module provides a generalized schema system that allows plugins to define
 * their database schemas without direct dependencies on specific database plugins.
 * 
 * The schema provider pattern enables:
 * - Plugin-independent schema definitions
 * - Dynamic schema discovery and registration
 * - Type-safe schema migrations
 * - Database-agnostic table definitions
 */

/**
 * Column definition for database tables
 */
export interface IColumnDefinition {
  /** Column name */
  name: string;
  /** Column type - can be standard types or database-specific types */
  type: string;
  /** Whether this column is a primary key */
  primaryKey?: boolean;
  /** Whether this column is required */
  notNull?: boolean;
  /** Default value for the column */
  defaultValue?: any;
  /** Whether values must be unique */
  unique?: boolean;
  /** Foreign key reference */
  references?: {
    table: string;
    column: string;
    onDelete?: 'CASCADE' | 'SET NULL' | 'RESTRICT' | 'NO ACTION';
    onUpdate?: 'CASCADE' | 'SET NULL' | 'RESTRICT' | 'NO ACTION';
  };
  /** Custom constraints for this column */
  customConstraints?: string[];
}

/**
 * Index definition for database tables
 */
export interface IIndexDefinition {
  /** Index name */
  name: string;
  /** Columns included in the index */
  columns: string[];
  /** Whether this is a unique index */
  unique?: boolean;
  /** Optional WHERE clause for partial indexes */
  where?: string;
  /** Index method (btree, hash, gin, etc.) */
  using?: string;
}

/**
 * Constraint definition for database tables
 */
export interface IConstraintDefinition {
  /** Constraint name */
  name: string;
  /** Constraint type */
  type: 'check' | 'unique' | 'foreign_key' | 'primary_key';
  /** Columns involved in the constraint */
  columns: string[];
  /** Expression for check constraints */
  expression?: string;
  /** References for foreign key constraints */
  references?: {
    table: string;
    columns: string[];
    onDelete?: string;
    onUpdate?: string;
  };
}

/**
 * Table definition for database schemas
 */
export interface ITableDefinition {
  /** Table name */
  name: string;
  /** Column definitions */
  columns: IColumnDefinition[];
  /** Index definitions */
  indexes?: IIndexDefinition[];
  /** Constraint definitions */
  constraints?: IConstraintDefinition[];
  /** Tables this table depends on (for foreign keys) */
  dependencies?: string[];
  /** Schema version for migrations */
  version?: string;
  /** Table creation options */
  options?: {
    ifNotExists?: boolean;
    temporary?: boolean;
    unlogged?: boolean;
    [key: string]: any; // Allow database-specific options
  };
}

/**
 * Complete schema definition for a plugin
 */
export interface ISchemaDefinition {
  /** Schema version for migration tracking */
  version: string;
  /** Table definitions */
  tables: ITableDefinition[];
  /** Stored procedures (optional) */
  procedures?: {
    name: string;
    sql: string;
    dependencies?: string[];
  }[];
  /** Triggers (optional) */
  triggers?: {
    name: string;
    table: string;
    when: 'BEFORE' | 'AFTER' | 'INSTEAD OF';
    events: ('INSERT' | 'UPDATE' | 'DELETE')[];
    sql: string;
  }[];
  /** Database extensions to install (optional) */
  extensions?: string[];
}

/**
 * Schema provider interface that plugins implement
 */
export interface ISchemaProvider {
  /** Get the plugin name */
  getPluginName(): string;
  /** Get the schema definition */
  getSchemaDefinition(): ISchemaDefinition;
  /** Get migrations for the schema (optional) */
  getMigrations?(): IMigration[];
  /** Validate the schema (optional) */
  validateSchema?(context?: any): { valid: boolean; errors: string[]; warnings: string[] };
  /** Hook called before migration (optional) */
  beforeMigration?(context: { pluginName: string; database: any; [key: string]: any }): Promise<void>;
  /** Hook called after migration (optional) */
  afterMigration?(context: { pluginName: string; database: any; [key: string]: any }): Promise<void>;
}

/**
 * Migration operation types
 */
export interface IMigrationOperation {
  type: 'create_table' | 'drop_table' | 'add_column' | 'drop_column' | 'create_index' | 'drop_index' | 'raw_sql';
  table?: string;
  column?: IColumnDefinition;
  index?: IIndexDefinition;
  sql?: string;
}

/**
 * Migration definition
 */
export interface IMigration {
  version: string;
  description: string;
  up: IMigrationOperation[];
  down: IMigrationOperation[];
  dependencies?: string[];
}

/**
 * Extended schema provider with migration support (deprecated - use ISchemaProvider)
 */
export interface ISchemaProviderWithMigrations extends ISchemaProvider {
  // All methods are now optional in base ISchemaProvider
} 