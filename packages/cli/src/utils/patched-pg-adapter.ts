/**
 * Patched PostgreSQL adapter to fix entity creation bug
 * This wraps the original adapter and fixes the JSON stringification issue
 */

import { logger } from '@elizaos/core';
import type { Entity, UUID } from '@elizaos/core';

export class PatchedPgAdapter {
  private originalAdapter: any;

  constructor(originalAdapter: any) {
    this.originalAdapter = originalAdapter;
    
    // Create a proxy that delegates all property access to the original adapter
    return new Proxy(this, {
      get(target, prop, receiver) {
        // If the property exists on the patched adapter, use it
        if (prop === 'createEntities') {
          return target.createEntities.bind(target);
        }
        
        // For all other properties/methods, delegate to the original adapter
        const value = originalAdapter[prop];
        
        // If it's a function, bind it to the original adapter
        if (typeof value === 'function') {
          return value.bind(originalAdapter);
        }
        
        return value;
      },
      
      set(target, prop, value) {
        // Set properties on the original adapter
        originalAdapter[prop] = value;
        return true;
      },
      
      has(target, prop) {
        // Check if property exists on either the patched or original adapter
        return prop in target || prop in originalAdapter;
      }
    });
  }

  /**
   * Patched createEntities method that fixes JSON stringification
   */
  async createEntities(entities: Entity[]): Promise<boolean> {
    logger.info('[PatchedPgAdapter] Intercepting createEntities to fix JSON stringification bug');
    
    try {
      // Get the database connection from the original adapter
      const db = this.originalAdapter.db || this.originalAdapter.getDatabase?.();
      
      if (!db) {
        logger.error('[PatchedPgAdapter] No database connection available');
        return false;
      }

      // Try to use the manager's query method directly
      const manager = this.originalAdapter.manager || this.originalAdapter.getManager?.();
      
      if (manager && manager.query) {
        // Use raw SQL with proper parameter handling
        for (const entity of entities) {
          logger.info(`[PatchedPgAdapter] Creating entity with ID: ${entity.id}`);
          logger.info(`[PatchedPgAdapter] Entity data:`, {
            id: entity.id,
            agentId: entity.agentId,
            names: entity.names,
            metadata: entity.metadata
          });
          
          const query = `
            INSERT INTO entities (id, agent_id, names, metadata, created_at, updated_at)
            VALUES ($1, $2, $3::jsonb, $4::jsonb, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
            ON CONFLICT (id) DO UPDATE SET
              names = EXCLUDED.names,
              metadata = EXCLUDED.metadata,
              updated_at = CURRENT_TIMESTAMP
            RETURNING id
          `;
          
          // For PostgreSQL, JSON/JSONB columns need to be stringified
          // but not double-stringified like the bug was doing
          const params = [
            entity.id,
            entity.agentId,
            JSON.stringify(entity.names),      // Properly stringify for JSONB
            JSON.stringify(entity.metadata || {}) // Properly stringify for JSONB
          ];
          
          try {
            logger.info(`[PatchedPgAdapter] Executing query with params:`, params);
            const result = await manager.query(query, params);
            logger.info(`[PatchedPgAdapter] Query result:`, result);
            
            if (result && result.length > 0) {
              logger.info(`[PatchedPgAdapter] Successfully created/updated entity ${entity.id}`);
            } else {
              logger.warn(`[PatchedPgAdapter] No rows returned for entity ${entity.id}`);
            }
          } catch (e: any) {
            logger.error(`[PatchedPgAdapter] Failed to create entity ${entity.id}:`, e.message);
            logger.error(`[PatchedPgAdapter] Full error:`, e);
            throw e;
          }
        }
        
        // Verify the entities were created
        logger.info('[PatchedPgAdapter] Verifying entities were created...');
        for (const entity of entities) {
          const checkResult = await manager.query(
            'SELECT id, agent_id, names FROM entities WHERE id = $1',
            [entity.id]
          );
          if (checkResult && checkResult.length > 0) {
            logger.info(`[PatchedPgAdapter] Verified entity ${entity.id} exists:`, checkResult[0]);
          } else {
            logger.error(`[PatchedPgAdapter] Entity ${entity.id} NOT FOUND after creation!`);
            return false;
          }
        }
        
        return true;
      }
      
      // If we can't access the manager, fall back to the original method
      // but log a warning
      logger.warn('[PatchedPgAdapter] Could not apply patch, falling back to original method');
      return await this.originalAdapter.createEntities(entities);
      
    } catch (error) {
      logger.error('[PatchedPgAdapter] Error in patched createEntities:', error);
      throw error;
    }
  }
} 