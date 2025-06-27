/**
 * RPG Test App - Hyperfy Application
 *
 * Integrates RPG testing system into Hyperfy world as a proper app
 */

import type { World } from '../../types/index.js'
import { RPGTestingSystem } from '../systems/RPGTestingSystem.js'

export interface RPGTestAppConfig {
  enableTesting: boolean
  autoStart: boolean
  showUI: boolean
  testMode: 'development' | 'staging' | 'production'
}

export class RPGTestApp {
  private world: World
  private testingSystem: RPGTestingSystem
  private config: RPGTestAppConfig
  private initialized: boolean = false

  constructor(world: World, config: Partial<RPGTestAppConfig> = {}) {
    this.world = world
    this.config = {
      enableTesting: true,
      autoStart: process.env.NODE_ENV === 'development',
      showUI: true,
      testMode: 'development',
      ...config,
    }

    this.testingSystem = new RPGTestingSystem(world)
  }

  /**
   * Initialize the RPG test app
   */
  async init(): Promise<void> {
    if (this.initialized) {
      return
    }

    console.log('[RPGTestApp] Initializing RPG Test Application...')

    try {
      // Register the testing system with the world
      ;(this.world as any).register('rpgTesting', () => this.testingSystem)

      // Initialize the testing system
      await this.testingSystem.init({
        enableTesting: this.config.enableTesting,
      } as any)

      // Start the system
      this.testingSystem.start()

      // Auto-enable test mode if configured
      if (this.config.autoStart) {
        this.testingSystem.enableTestMode()
      }

      // Set up app-level event handlers
      this.setupEventHandlers()

      this.initialized = true
      console.log('[RPGTestApp] Successfully initialized')

      // Announce to world that RPG testing is available
      this.world.events.emit('rpg-test-app-ready', {
        config: this.config,
        system: this.testingSystem,
      })
    } catch (error: any) {
      console.error('[RPGTestApp] Failed to initialize:', error)
      throw error
    }
  }

  /**
   * Set up event handlers for cross-system communication
   */
  private setupEventHandlers(): void {
    // Listen for world events that might affect testing
    this.world.events.on('world-ready', () => {
      console.log('[RPGTestApp] World ready - RPG testing available')
    })

    this.world.events.on('player-joined', (playerId: string) => {
      console.log(`[RPGTestApp] Player ${playerId} joined - test mode available`)
    })

    // Listen for external test requests
    this.world.events.on('run-rpg-test', async (data: { scenarioId: string; playerId?: string }) => {
      console.log(`[RPGTestApp] External test request: ${data.scenarioId}`)
      await this.runTestScenario(data.scenarioId)
    })

    // Listen for test mode toggle requests
    this.world.events.on('toggle-rpg-test-mode', () => {
      this.toggleTestMode()
    })
  }

  /**
   * Run a specific test scenario
   */
  async runTestScenario(scenarioId: string): Promise<any> {
    if (!this.initialized) {
      throw new Error('RPG Test App not initialized')
    }

    switch (scenarioId) {
      case 'banking':
        return await this.testingSystem.runBankingTest()
      case 'combat':
        return await this.testingSystem.runCombatTest()
      case 'movement':
        return await this.testingSystem.runMovementTest()
      case 'all':
        return await this.testingSystem.runAllTests()
      default:
        throw new Error(`Unknown test scenario: ${scenarioId}`)
    }
  }

  /**
   * Toggle test mode on/off
   */
  toggleTestMode(): void {
    if (this.testingSystem) {
      this.testingSystem.enableTestMode()
    }
  }

  /**
   * Get test system for direct access
   */
  getTestingSystem(): RPGTestingSystem {
    return this.testingSystem
  }

  /**
   * Get current configuration
   */
  getConfig(): RPGTestAppConfig {
    return { ...this.config }
  }

  /**
   * Update configuration
   */
  updateConfig(newConfig: Partial<RPGTestAppConfig>): void {
    this.config = { ...this.config, ...newConfig }
    console.log('[RPGTestApp] Configuration updated:', this.config)
  }

  /**
   * Destroy the app and clean up resources
   */
  destroy(): void {
    if (this.testingSystem) {
      this.testingSystem.destroy()
    }

    this.initialized = false
    console.log('[RPGTestApp] Destroyed')
  }
}

/**
 * Factory function to create and initialize RPG Test App
 */
export async function createRPGTestApp(world: World, config?: Partial<RPGTestAppConfig>): Promise<RPGTestApp> {
  const app = new RPGTestApp(world, config)
  await app.init()
  return app
}

/**
 * Global app instance for easy access
 */
let globalRPGTestApp: RPGTestApp | null = null

/**
 * Initialize global RPG test app
 */
export async function initializeGlobalRPGTestApp(
  world: World,
  config?: Partial<RPGTestAppConfig>
): Promise<RPGTestApp> {
  if (globalRPGTestApp) {
    console.warn('[RPGTestApp] Global app already initialized')
    return globalRPGTestApp
  }

  globalRPGTestApp = await createRPGTestApp(world, config)

  // Make it globally accessible for debugging
  if (typeof window !== 'undefined') {
    ;(window as any).rpgTestApp = globalRPGTestApp
    console.log('[RPGTestApp] Global app available as window.rpgTestApp')
  }

  return globalRPGTestApp
}

/**
 * Get the global RPG test app instance
 */
export function getGlobalRPGTestApp(): RPGTestApp | null {
  return globalRPGTestApp
}
