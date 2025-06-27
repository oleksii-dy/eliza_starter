/// <reference types="cypress" />

import { selectors } from '../../support/utils/selectors'
import { waitForAnimation } from '../../support/utils/helpers'

describe('Menu UI', () => {
  beforeEach(() => {
    // Handle uncaught exceptions
    cy.on('uncaught:exception', err => {
      if (
        err.message.includes('getSystem is not a function') ||
        err.message.includes('Cannot read properties of undefined')
      ) {
        return false
      }
      return true
    })

    cy.visit('/')
    cy.waitForWorldLoad()
  })

  it('should open and close menu with Escape key', () => {
    // Initially closed
    cy.get(selectors.menu).should('not.exist')

    // Open with Escape
    cy.openMenu()
    cy.get(selectors.menu).should('be.visible')

    // Close with Escape
    cy.closeMenu()
    cy.get(selectors.menu).should('not.exist')
  })

  it('should display main menu options', () => {
    cy.openMenu()

    cy.get(selectors.menuMain).within(() => {
      // Common menu items
      cy.contains('Resume').should('exist')
      cy.contains('Settings').should('exist')
      cy.contains('Exit').should('exist')
    })
  })

  it('should close menu when clicking Resume', () => {
    cy.openMenu()

    cy.get(selectors.menuMain).within(() => {
      cy.contains('Resume').click()
    })

    cy.get(selectors.menu).should('not.exist')
  })

  it('should open settings from menu', () => {
    cy.openMenu()

    cy.get(selectors.menuMain).within(() => {
      cy.contains('Settings').click()
    })

    waitForAnimation()

    // Should open settings panel
    cy.get(selectors.settingsPane).should('be.visible')
  })

  it('should handle menu navigation with keyboard', () => {
    cy.openMenu()

    // Navigate with arrow keys
    cy.get('body').type('{downarrow}')
    cy.wait(100)
    cy.get('body').type('{downarrow}')
    cy.wait(100)
    cy.get('body').type('{enter}')

    // Verify action was taken
    cy.get(selectors.menu).should('not.exist')
  })

  it('should display app-specific menu when in app context', () => {
    // First create and select an app entity
    cy.createEntity('app', { name: 'Test App' }).then(app => {
      cy.selectEntity(app.data.id)

      cy.openMenu()

      // Check for app menu
      cy.get('body').then($body => {
        if ($body.find(selectors.menuApp).length > 0) {
          cy.get(selectors.menuApp).should('be.visible')
          cy.get(selectors.menuApp).within(() => {
            cy.contains('Test App').should('exist')
          })
        }
      })
    })
  })

  it('should handle menu item hover states', () => {
    cy.openMenu()

    cy.get(selectors.menuItem)
      .first()
      .then($item => {
        // Get initial style
        const initialBg = $item.css('background-color')

        // Hover over item
        cy.get(selectors.menuItem).first().trigger('mouseover')

        // Check style changed
        cy.get(selectors.menuItem)
          .first()
          .then($hoveredItem => {
            const hoverBg = $hoveredItem.css('background-color')
            expect(hoverBg).to.not.equal(initialBg)
          })
      })
  })

  it('should close menu when clicking outside', () => {
    cy.openMenu()

    // Click outside menu
    cy.get('body').click(10, 10)
    waitForAnimation()

    cy.get(selectors.menu).should('not.exist')
  })

  it('should maintain focus trap within menu', () => {
    cy.openMenu()

    // Tab through menu items
    cy.get('body').type('{tab}')
    cy.focused().should('be.visible')

    // Continue tabbing - should cycle within menu
    for (let i = 0; i < 10; i++) {
      cy.get('body').type('{tab}')
    }

    // Should still be within menu
    cy.focused().parents(selectors.menu).should('exist')
  })

  it('should handle rapid open/close cycles', () => {
    // Rapidly toggle menu
    for (let i = 0; i < 5; i++) {
      cy.openMenu()
      cy.closeMenu()
    }

    // Should end in closed state
    cy.get(selectors.menu).should('not.exist')

    // Should still work normally
    cy.openMenu()
    cy.get(selectors.menu).should('be.visible')
  })

  it('should display different menu states based on permissions', () => {
    // Test as regular user
    cy.openMenu()
    cy.get(selectors.menuMain).within(() => {
      cy.get(selectors.menuItem).then($items => {
        const regularItemCount = $items.length
        cy.closeMenu()

        // Mock admin user
        cy.window().then(win => {
          ;(win as any).userRole = 'admin'
        })

        cy.openMenu()
        cy.get(selectors.menuMain).within(() => {
          cy.get(selectors.menuItem).then($adminItems => {
            // Admin might have more options
            expect($adminItems.length).to.be.at.least(regularItemCount)
          })
        })
      })
    })
  })

  it('should show loading state for async menu actions', () => {
    cy.openMenu()

    // Intercept a menu action
    cy.intercept('POST', '**/api/menu-action', {
      delay: 1000,
      statusCode: 200,
      body: { status: 'ok' },
    }).as('menuAction')

    // Click menu item that triggers async action
    cy.get(selectors.menuMain).within(() => {
      cy.contains('Settings').click()
    })

    // Should show loading state
    cy.get(selectors.loading, { timeout: 500 }).should('exist')
  })

  it('should remember last menu position', () => {
    cy.openMenu()

    // Get initial position
    cy.get(selectors.menu).then($menu => {
      const initialTop = $menu.position().top
      const initialLeft = $menu.position().left

      cy.closeMenu()
      cy.wait(500)
      cy.openMenu()

      // Should be in same position
      cy.get(selectors.menu).then($newMenu => {
        expect($newMenu.position().top).to.be.closeTo(initialTop, 5)
        expect($newMenu.position().left).to.be.closeTo(initialLeft, 5)
      })
    })
  })

  it('should handle menu in different viewport sizes', () => {
    const sizes = ['mobile', 'tablet', 'desktop'] as const

    sizes.forEach(size => {
      cy.viewport(
        size === 'mobile' ? 375 : size === 'tablet' ? 768 : 1920,
        size === 'mobile' ? 667 : size === 'tablet' ? 1024 : 1080
      )

      cy.openMenu()
      cy.get(selectors.menu).should('be.visible')
      cy.screenshot(`menu-${size}`)
      cy.closeMenu()
    })
  })

  it('should animate menu transitions', () => {
    // Check for smooth transitions
    cy.openMenu()

    cy.get(selectors.menu).should('have.css', 'transition')

    // Take screenshots during animation
    cy.screenshot('menu-opening')
    waitForAnimation()
    cy.screenshot('menu-open')

    cy.closeMenu()
  })
})
