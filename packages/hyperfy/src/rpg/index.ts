// Simplified RPG plugin export for testing construction system
export * from './systems/ConstructionSystem'
export * from './types'

import type { World } from '../types'

// Plugin definition
export const HyperfyRPGPlugin = {
  name: 'hyperfy-rpg',
  description: 'RuneScape-style RPG mechanics for Hyperfy',
  systems: [],
  
  /**
   * Initialize the RPG plugin with the given world
   */
  async init(world: World, config?: any): Promise<void> {
    console.log('[HyperfyRPGPlugin] Initializing RPG plugin...', {
      worldType: config?.worldType || 'unknown',
      isServer: config?.isServer || false,
      systems: config?.systems || []
    })
    
    // Plugin initialization logic can be added here
    // For now, just log that it's initialized
    console.log('[HyperfyRPGPlugin] RPG plugin initialized successfully')
  }
}