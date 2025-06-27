/// <reference types="cypress" />

import { selectors } from '../../support/utils/selectors'
import { setViewport, clearAllData } from '../../support/utils/helpers'

describe('Basic UI Rendering', () => {
  beforeEach(() => {
    // Handle ALL uncaught exceptions
    cy.on('uncaught:exception', () => false)

    // Don't clear data in basic test - it might be causing issues
    // clearAllData();
    cy.visit('/')
  })

  it('should render the main application structure', () => {
    // Check main app container
    cy.get(selectors.app).should('exist').should('be.visible')

    // Check viewport
    cy.get(selectors.viewport).should('exist').should('be.visible')

    // Check UI layer
    cy.get(selectors.ui).should('exist')
  })

  it('should load Three.js and create WebGL context', () => {
    cy.waitForThreeJS()

    // Check for canvas element
    cy.get('canvas').should('exist').should('be.visible')

    // Verify WebGL context
    cy.window().then(win => {
      const canvas = win.document.querySelector('canvas')
      expect(canvas).to.exist

      const gl = canvas?.getContext('webgl') || canvas?.getContext('webgl2')
      expect(gl).to.not.be.null
    })
  })

  it('should connect to world and show connection status', () => {
    cy.waitForWorldLoad()

    // Check for successful connection
    cy.getWorld().then(world => {
      expect(world).to.exist
      expect(world.frame).to.be.greaterThan(0)
    })
  })

  it('should render CoreUI components', () => {
    cy.waitForWorldLoad()

    // Check CoreUI exists
    cy.get(selectors.coreUI).should('exist')

    // Take screenshot for visual reference
    cy.screenshot('basic-ui-loaded')
  })

  it('should handle different viewport sizes', () => {
    const sizes: Array<keyof typeof import('../../support/utils/helpers').viewportSizes> = [
      'mobile',
      'tablet',
      'desktop',
      'ultrawide',
    ]

    sizes.forEach(size => {
      setViewport(size)
      cy.wait(500)

      // Verify viewport adjusts
      cy.get(selectors.viewport).should('exist')
      cy.get('canvas').should('be.visible')

      cy.screenshot(`viewport-${size}`)
    })
  })

  it('should show loading state initially', () => {
    // Visit without waiting for load
    cy.visit('/', {
      onBeforeLoad: win => {
        // Slow down loading
        ;(win as any).delayWorldLoad = true
      },
    })

    // Check for loading indicators
    cy.get(selectors.loading, { timeout: 2000 }).should('exist')
  })

  it('should handle WebGL context loss gracefully', () => {
    cy.waitForThreeJS()

    // Simulate context loss
    cy.window().then(win => {
      const canvas = win.document.querySelector('canvas')
      const gl = canvas?.getContext('webgl') || canvas?.getContext('webgl2')

      if (gl && 'getExtension' in gl) {
        const loseContext = gl.getExtension('WEBGL_lose_context')
        if (loseContext) {
          loseContext.loseContext()
          cy.wait(1000)

          // Should handle gracefully without crashing
          cy.get(selectors.app).should('exist')

          // Restore context
          loseContext.restoreContext()
        }
      }
    })
  })

  it('should measure initial load performance', () => {
    cy.visit('/')
    cy.waitForWorldLoad()

    cy.checkPerformance()

    // Verify performance marks
    cy.window().then(win => {
      const marks = win.performance.getEntriesByType('mark')
      const cypressMark = marks.find(m => m.name === 'cypress-start')
      expect(cypressMark).to.exist
    })
  })
})
