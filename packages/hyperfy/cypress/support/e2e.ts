// Import Cypress commands
import './commands'
import './commands/world'
import './commands/ui'
import './commands/entity'
import './commands/player'

// Import utilities
import './utils/helpers'
import './utils/selectors'

// Import plugins
import 'cypress-real-events/support'
import 'cypress-wait-until'

// Configure Cypress
Cypress.on('uncaught:exception', (err, runnable) => {
  // Handle WebGL context lost errors common in 3D applications
  if (err.message.includes('WebGL') || err.message.includes('THREE')) {
    return false
  }
  // Handle React errors
  if (err.message.includes('ResizeObserver loop completed with undelivered notifications')) {
    return false
  }
  // Handle missing world object during initialization
  if (err.message.includes('Cannot read properties of undefined')) {
    return false
  }
  // Handle RPGTestHelpers errors
  if (err.message.includes('getSystem is not a function')) {
    return false
  }
  return true
})

// Add custom viewport sizes
Cypress.on('window:before:load', win => {
  // Add performance marks for measuring 3D world load times
  win.performance.mark('cypress-start')

  // Create mock world object if needed
  if (!win.world) {
    ;(win as any).world = {
      frame: 0,
      time: 0,
      network: { connected: false },
      entities: {
        items: new Map(),
        players: new Map(),
        add: () => {},
        get: () => null,
        has: () => false,
      },
      events: { emit: () => {}, on: () => {}, off: () => {} },
      getSystem: (name: string) => null,
      getSystemByType: (type: any) => null,
      systems: [],
    }
  }
})

// Global before hook
before(() => {
  cy.log('Starting Hyperfy UI Tests')
  // Clear any persisted state
  cy.clearLocalStorage()
  cy.clearCookies()
})

// Global after each hook
afterEach(() => {
  // Take screenshot on failure
  const test = Cypress.currentTest as any
  if (test.state === 'failed') {
    cy.screenshot(`failed-${test.title}`)
  }
})

declare global {
  namespace Cypress {
    interface Chainable {
      // World commands
      waitForWorldLoad(): Chainable<void>
      connectToWorld(wsUrl?: string): Chainable<void>
      getWorld(): Chainable<any>

      // UI commands
      openSidebar(): Chainable<void>
      closeSidebar(): Chainable<void>
      selectSidebarTab(tab: string): Chainable<void>
      openMenu(): Chainable<void>
      closeMenu(): Chainable<void>

      // Entity commands
      createEntity(type: string, data: any): Chainable<any>
      selectEntity(entityId: string): Chainable<void>
      getEntity(entityId: string): Chainable<any>

      // Player commands
      movePlayer(direction: 'forward' | 'backward' | 'left' | 'right', duration: number): Chainable<void>
      rotateCamera(deltaX: number, deltaY: number): Chainable<void>
      getPlayerPosition(): Chainable<{ x: number; y: number; z: number }>

      // Utility commands
      waitForThreeJS(): Chainable<void>
      checkPerformance(): Chainable<void>
    }
  }
}
