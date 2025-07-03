import { pgTable, serial, integer, varchar, timestamp, boolean, index, unique } from 'drizzle-orm/pg-core';

/**
 * Migration history table to track completed migrations and prevent concurrent execution
 */
export const migrationHistoryTable = pgTable(
  'migration_history',
  {
    id: serial('id').primaryKey(),
    
    // Plugin name that owns this migration
    pluginName: varchar('plugin_name', { length: 255 }).notNull(),
    
    // Version or identifier of the migration
    version: varchar('version', { length: 255 }).notNull(),
    
    // Schema name where the migration was applied
    schemaName: varchar('schema_name', { length: 255 }).notNull(),
    
    // Timestamp when the migration was executed
    executedAt: timestamp('executed_at').defaultNow().notNull(),
    
    // Success status
    success: boolean('success').default(true).notNull(),
    
    // Error message if migration failed
    errorMessage: varchar('error_message', { length: 1000 }),
    
    // Checksum of the migration to detect changes
    checksum: varchar('checksum', { length: 64 }),
    
    // Duration of the migration in milliseconds
    durationMs: integer('duration_ms'),
  },
  (table) => ({
    // Index for quick lookups by plugin
    pluginNameIdx: index('idx_migration_history_plugin').on(table.pluginName),
    
    // Ensure each migration version is only executed once per plugin
    uniquePluginVersion: unique('unique_plugin_version').on(table.pluginName, table.version),
  })
);

/**
 * Migration lock table to prevent concurrent migrations
 * Uses PostgreSQL advisory locks but also maintains a record for visibility
 */
export const migrationLockTable = pgTable(
  'migration_lock',
  {
    id: serial('id').primaryKey(),
    
    // Lock identifier (used for advisory lock)
    lockId: varchar('lock_id', { length: 255 }).notNull().unique(),
    
    // Process that holds the lock
    lockedBy: varchar('locked_by', { length: 255 }).notNull(),
    
    // When the lock was acquired
    lockedAt: timestamp('locked_at').defaultNow().notNull(),
    
    // Process ID for cleanup
    pid: integer('pid'),
    
    // Host information
    hostname: varchar('hostname', { length: 255 }),
  }
);