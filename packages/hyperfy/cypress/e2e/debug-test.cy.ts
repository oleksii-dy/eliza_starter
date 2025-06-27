/// <reference types="cypress" />

describe('Debug Test - App Structure', () => {
  it('should show what elements exist on the page', () => {
    // Handle all errors
    cy.on('uncaught:exception', () => false)

    // Visit without any pre-setup
    cy.visit('/', {
      onBeforeLoad: win => {
        // Log what's happening
        console.log('Page is loading...')
      },
    })

    // Wait for page to load
    cy.wait(5000)

    // Log what elements exist
    cy.get('body').then($body => {
      console.log('Body HTML:', $body.html().substring(0, 500))

      // Check for common root elements
      const elements = ['#root', '.App', '.app', '#app', 'canvas', '.viewport', '.container', 'main']

      elements.forEach(selector => {
        const count = $body.find(selector).length
        if (count > 0) {
          cy.log(`Found ${count} elements matching: ${selector}`)
        }
      })
    })

    // Take screenshot
    cy.screenshot('debug-page-structure')

    // Check window object
    cy.window().then(win => {
      cy.log('Window has world:', !!(win as any).world)
      cy.log('Window has THREE:', !!(win as any).THREE)

      // Log world object if it exists
      if ((win as any).world) {
        const world = (win as any).world
        cy.log('World frame:', world.frame)
        cy.log('World has entities:', !!world.entities)
        cy.log('World has systems:', !!world.systems)
      }
    })
  })
})
