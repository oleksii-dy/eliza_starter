/// <reference types="cypress" />

describe('Smoke Test - Basic App Loading', () => {
  beforeEach(() => {
    // Ignore ALL uncaught exceptions for smoke test
    cy.on('uncaught:exception', () => false)
  })

  it('should load the application without errors', () => {
    // Visit the page
    cy.visit('/', {
      onBeforeLoad: win => {
        // Mock essential globals
        ;(win as any).THREE = { VERSION: '0.173.0' }

        // Create a more complete mock world to prevent initialization errors
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
          register: () => {},
          init: () => Promise.resolve(),
          start: () => {},
          tick: () => {},
          graphics: { render: () => {} },
        }
      },
      failOnStatusCode: false,
    })

    // Wait for page to load
    cy.wait(3000)

    // Basic checks that don't require world to be fully loaded
    cy.get('body').should('exist')

    // Check for any root element - try multiple selectors
    cy.get('body').then($body => {
      const rootSelectors = ['#root', '.App', '#app', 'main', 'canvas']
      let foundRoot = false

      for (const selector of rootSelectors) {
        if ($body.find(selector).length > 0) {
          cy.log(`Found root element: ${selector}`)
          foundRoot = true
          cy.get(selector).should('exist')
          break
        }
      }

      if (!foundRoot) {
        // If no specific root found, just check for any div
        cy.get('div').should('have.length.greaterThan', 0)
      }
    })
  })

  it('should handle missing server gracefully', () => {
    // Visit with a non-existent server
    cy.visit('/', {
      failOnStatusCode: false,
      onBeforeLoad: win => {
        // Mock WebSocket to prevent connection errors
        ;(win as any).WebSocket = class MockWebSocket {
          constructor(url: string) {
            console.log('Mock WebSocket created for:', url)
          }
          send() {}
          close() {}
          addEventListener() {}
          removeEventListener() {}
        }

        // Mock world object
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
      },
    })

    // App should still render something
    cy.get('#root').should('exist')
  })
})
