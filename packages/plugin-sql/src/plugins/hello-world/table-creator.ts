import { sql } from 'drizzle-orm';
import { logger } from '@elizaos/core';

// Track which tables have been created
const createdTables = new Set<string>();

/**
 * Ensures a table exists before performing operations
 * This implements the actual dynamic table creation
 */
export async function ensureTableExists(
  db: any,
  tableName: string,
  createTableSQL: string
): Promise<void> {
  // Skip if already created in this session
  if (createdTables.has(tableName)) {
    return;
  }

  try {
    // Check if table exists
    const result = await db.execute(sql`
      SELECT 1 FROM information_schema.tables 
      WHERE table_schema = 'public' AND table_name = ${tableName}
      LIMIT 1
    `);
    
    if (result.rows && result.rows.length > 0) {
      createdTables.add(tableName);
      logger.debug(`Table ${tableName} already exists`);
      return;
    }
  } catch (error) {
    logger.debug(`Table ${tableName} check failed, will create:`, error);
  }

  // Create the table
  try {
    logger.info(`Creating table ${tableName} dynamically...`);
    await db.execute(sql.raw(createTableSQL));
    createdTables.add(tableName);
    logger.info(`✅ Successfully created table ${tableName}`);
  } catch (error) {
    logger.error(`Failed to create table ${tableName}:`, error);
    throw error;
  }
}

// SQL for creating hello_world table
export const HELLO_WORLD_TABLE_SQL = `
  CREATE TABLE IF NOT EXISTS hello_world (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    message VARCHAR(255) NOT NULL,
    author VARCHAR(100) DEFAULT 'anonymous',
    agent_id UUID NOT NULL,
    created_at TIMESTAMP DEFAULT NOW() NOT NULL
  )
`;

// SQL for creating greetings table
export const GREETINGS_TABLE_SQL = `
  CREATE TABLE IF NOT EXISTS greetings (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    greeting VARCHAR(100) NOT NULL,
    language VARCHAR(20) NOT NULL DEFAULT 'en',
    is_active VARCHAR(10) NOT NULL DEFAULT 'true',
    agent_id UUID NOT NULL,
    created_at TIMESTAMP DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP DEFAULT NOW() NOT NULL
  )
`;

/**
 * Wrapper for database operations that ensures table exists
 */
export async function withTable<T>(
  db: any,
  tableName: string,
  tableSQL: string,
  operation: () => Promise<T>
): Promise<T> {
  await ensureTableExists(db, tableName, tableSQL);
  return operation();
} 