/**
 * Database migration utility to add vector columns to memories table
 * This fixes the issue where indexes are created before columns exist
 */

import { logger } from '@elizaos/core';

export interface MigrationOptions {
  manager: any; // Database manager instance
  tableName?: string; // Default: 'memories'
}

/**
 * Adds vector columns of different dimensions to the memories table
 * These dimensions correspond to different embedding models:
 * - 384: Small models
 * - 512: Medium models
 * - 768: BERT-style models
 * - 1024: Large models
 * - 1536: OpenAI ada-002
 * - 3072: OpenAI text-embedding-3-large
 */
export async function addVectorColumnsToMemories(options: MigrationOptions): Promise<void> {
  const { manager, tableName = 'memories' } = options;
  
  if (!manager || !manager.query) {
    throw new Error('Database manager with query method is required');
  }
  
  logger.info(`[DatabaseMigration] Starting vector column migration for ${tableName} table`);
  
  // Vector dimensions to add
  const dimensions = [384, 512, 768, 1024, 1536, 3072];
  
  try {
    // First, check if the table exists
    const tableExistsQuery = `
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = $1
      )
    `;
    
    const tableExistsResult = await manager.query(tableExistsQuery, [tableName]);
    const tableExists = tableExistsResult?.[0]?.exists;
    
    if (!tableExists) {
      logger.warn(`[DatabaseMigration] Table ${tableName} does not exist. Skipping migration.`);
      return;
    }
    
    // Check which columns already exist
    const columnExistsQuery = `
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_schema = 'public' 
      AND table_name = $1 
      AND column_name LIKE 'dim_%'
    `;
    
    const existingColumnsResult = await manager.query(columnExistsQuery, [tableName]);
    const existingColumns = new Set(existingColumnsResult.map((row: any) => row.column_name));
    
    // Add missing vector columns
    for (const dim of dimensions) {
      const columnName = `dim_${dim}`;
      
      if (existingColumns.has(columnName)) {
        logger.info(`[DatabaseMigration] Column ${columnName} already exists, skipping`);
        continue;
      }
      
      try {
        const addColumnQuery = `
          ALTER TABLE ${tableName} 
          ADD COLUMN IF NOT EXISTS ${columnName} vector(${dim})
        `;
        
        logger.info(`[DatabaseMigration] Adding column ${columnName} to ${tableName} table`);
        await manager.query(addColumnQuery);
        logger.info(`[DatabaseMigration] Successfully added column ${columnName}`);
        
      } catch (error: any) {
        // If the error is about vector type not existing, provide helpful message
        if (error.message?.includes('type "vector" does not exist')) {
          logger.error(`[DatabaseMigration] pgvector extension is not installed. Please run: CREATE EXTENSION IF NOT EXISTS vector;`);
          throw new Error('pgvector extension is required but not installed');
        }
        
        logger.error(`[DatabaseMigration] Failed to add column ${columnName}:`, error.message);
        throw error;
      }
    }
    
    logger.info(`[DatabaseMigration] Vector column migration completed successfully`);
    
  } catch (error: any) {
    logger.error('[DatabaseMigration] Migration failed:', error);
    throw error;
  }
}

/**
 * Runs all necessary database migrations
 */
export async function runDatabaseMigrations(manager: any): Promise<void> {
  logger.info('[DatabaseMigration] Running database migrations');
  
  try {
    // Add vector columns to memories table
    await addVectorColumnsToMemories({ manager });
    
    // Add other migrations here as needed
    
    logger.info('[DatabaseMigration] All migrations completed successfully');
  } catch (error) {
    logger.error('[DatabaseMigration] Database migrations failed:', error);
    throw error;
  }
} 