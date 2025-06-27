/**
 * Hyperfy RPG Test Integration
 *
 * Initializes RPG testing system within Hyperfy server/client
 */

import type { World } from '../../types/index.js'
import { initializeGlobalRPGTestApp, RPGTestAppConfig } from '../apps/RPGTestApp.js'

/**
 * Initialize RPG testing in Hyperfy world
 */
export async function initializeRPGTesting(
  world: World,
  options: {
    enableInProduction?: boolean
    autoStart?: boolean
    showUI?: boolean
  } = {}
): Promise<void> {
  console.log('[HyperfyRPGTest] Initializing RPG testing integration...')

  try {
    // Determine if we should enable testing
    const isProduction = process.env.NODE_ENV === 'production'
    const shouldEnable = !isProduction || options.enableInProduction === true

    if (!shouldEnable) {
      console.log('[HyperfyRPGTest] Skipping RPG testing - production mode')
      return
    }

    // Configure RPG test app
    const config: Partial<RPGTestAppConfig> = {
      enableTesting: true,
      autoStart: options.autoStart ?? true,
      showUI: options.showUI ?? true,
      testMode: isProduction ? 'production' : 'development',
    }

    // Initialize the global RPG test app
    const testApp = await initializeGlobalRPGTestApp(world, config)

    // Register with world events
    world.events.on('world-started', () => {
      console.log('[HyperfyRPGTest] World started - RPG testing ready')

      // Auto-run basic validation if configured
      if (config.autoStart) {
        setTimeout(() => {
          console.log('[HyperfyRPGTest] Running initial test validation...')
          testApp.runTestScenario('all').catch(console.error)
        }, 5000) // Wait 5 seconds for world to settle
      }
    })

    // Register console commands for easy testing
    if (typeof window !== 'undefined') {
      ;(window as any).runRPGTest = (scenarioId: string = 'all') => {
        return testApp.runTestScenario(scenarioId)
      }
      ;(window as any).clearRPGTests = () => {
        const system = testApp.getTestingSystem()
        system.clearTestEntities()
      }

      console.log('[HyperfyRPGTest] Console commands available:')
      console.log('  - runRPGTest("banking") - Run banking test')
      console.log('  - runRPGTest("combat") - Run combat test')
      console.log('  - runRPGTest("movement") - Run movement test')
      console.log('  - runRPGTest("all") - Run all tests')
      console.log('  - clearRPGTests() - Clear test entities')
    }

    console.log('[HyperfyRPGTest] Successfully initialized RPG testing')
  } catch (error: any) {
    console.error('[HyperfyRPGTest] Failed to initialize RPG testing:', error)
    throw error
  }
}

/**
 * Add RPG testing to existing Hyperfy world
 */
export function addRPGTestingToWorld(world: World): void {
  // Hook into world initialization
  const originalInit = world.init?.bind(world)

  if (originalInit) {
    world.init = async function (options: any) {
      // Call original init first
      await originalInit(options)

      // Then initialize RPG testing
      await initializeRPGTesting(world, {
        enableInProduction: options.enableRPGTesting,
        autoStart: options.autoStartRPGTests,
        showUI: options.showRPGTestUI,
      })
    }
  }
}

/**
 * Server-side RPG test initialization
 */
export function initializeServerRPGTesting(world: World): void {
  console.log('[HyperfyRPGTest] Initializing server-side RPG testing...')

  // Server-side testing doesn't need UI but can validate data
  initializeRPGTesting(world, {
    enableInProduction: false,
    autoStart: false,
    showUI: false,
  }).catch(console.error)

  // Add server commands for testing
  world.events.on('server-command', (data: any) => {
    const { command, args } = data
    if (command === 'rpg-test') {
      const scenarioId = args[0] || 'all'
      console.log(`[HyperfyRPGTest] Running server test: ${scenarioId}`)

      world.events.emit('run-rpg-test', { scenarioId })
    }
  })
}

/**
 * Client-side RPG test initialization
 */
export function initializeClientRPGTesting(world: World): void {
  console.log('[HyperfyRPGTest] Initializing client-side RPG testing...')

  // Client-side gets full UI and visual testing
  initializeRPGTesting(world, {
    enableInProduction: false,
    autoStart: true,
    showUI: true,
  }).catch(console.error)

  // Add keyboard shortcuts for testing
  if (typeof window !== 'undefined') {
    window.addEventListener('keydown', event => {
      // Ctrl+Shift+T to toggle test mode
      if (event.ctrlKey && event.shiftKey && event.key === 'T') {
        event.preventDefault()
        world.events.emit('toggle-rpg-test-mode')
        console.log('[HyperfyRPGTest] Test mode toggled via keyboard shortcut')
      }

      // Ctrl+Shift+R to run all tests
      if (event.ctrlKey && event.shiftKey && event.key === 'R') {
        event.preventDefault()
        world.events.emit('run-rpg-test', { scenarioId: 'all' })
        console.log('[HyperfyRPGTest] Running all tests via keyboard shortcut')
      }
    })

    console.log('[HyperfyRPGTest] Keyboard shortcuts enabled:')
    console.log('  - Ctrl+Shift+T: Toggle test mode')
    console.log('  - Ctrl+Shift+R: Run all tests')
  }
}
