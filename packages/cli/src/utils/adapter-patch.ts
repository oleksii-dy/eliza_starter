/**
 * Adapter patch to fix entity creation bug
 * This module intercepts adapter creation and wraps it with our patched version
 */

import { logger } from '@elizaos/core';
import { PatchedPgAdapter } from './patched-pg-adapter.js';

// Store original functions
let originalCreateAdapter: any;
let patchApplied = false;

/**
 * Apply the adapter patch to fix entity creation
 */
export function applyAdapterPatch() {
  if (patchApplied) {
    logger.info('[AdapterPatch] Patch already applied');
    return;
  }

  logger.info('[AdapterPatch] Applying database adapter patch for entity creation bug');
  
  // Try to patch the adaptive adapter
  try {
    // Import the SQL plugin dynamically
    import('@elizaos/plugin-sql').then(sqlPlugin => {
      // Look for the adaptive adapter or connection registry
      const connectionRegistry = (sqlPlugin as any).connectionRegistry;
      
      if (connectionRegistry && connectionRegistry.registerAdapter) {
        const originalRegister = connectionRegistry.registerAdapter.bind(connectionRegistry);
        
        connectionRegistry.registerAdapter = function(agentId: string, adapter: any) {
          logger.info('[AdapterPatch] Intercepting adapter registration');
          
          // Check if this is a PostgreSQL adapter
          if (adapter && adapter.constructor.name === 'PgAdapter') {
            logger.info('[AdapterPatch] Wrapping PgAdapter with patched version');
            const patchedAdapter = new PatchedPgAdapter(adapter);
            return originalRegister(agentId, patchedAdapter);
          }
          
          // For other adapters, use the original
          return originalRegister(agentId, adapter);
        };
        
        logger.info('[AdapterPatch] Successfully patched connection registry');
        patchApplied = true;
      }
    }).catch(err => {
      logger.warn('[AdapterPatch] Could not load plugin-sql:', err);
    });
    
  } catch (error) {
    logger.error('[AdapterPatch] Failed to apply adapter patch:', error);
  }
}

/**
 * Alternative approach: Patch the runtime's database adapter after initialization
 */
export function patchRuntimeAdapter(runtime: any) {
  try {
    const adapter = runtime.databaseAdapter || runtime.adapter;
    
    if (adapter && adapter.constructor.name === 'PgAdapter') {
      logger.info('[AdapterPatch] Patching runtime adapter');
      const patchedAdapter = new PatchedPgAdapter(adapter);
      
      // Replace the adapter on the runtime
      if (runtime.databaseAdapter) {
        runtime.databaseAdapter = patchedAdapter;
      }
      if (runtime.adapter) {
        runtime.adapter = patchedAdapter;
      }
      
      // Also update any internal references
      if (runtime._adapter) {
        runtime._adapter = patchedAdapter;
      }
      
      logger.info('[AdapterPatch] Successfully patched runtime adapter');
      return true;
    }
    
    return false;
  } catch (error) {
    logger.error('[AdapterPatch] Failed to patch runtime adapter:', error);
    return false;
  }
} 