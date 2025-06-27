/// <reference types="cypress" />

import { selectors } from '../../support/utils/selectors'
import { waitForAnimation } from '../../support/utils/helpers'

describe('Sidebar UI', () => {
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

  it('should open and close sidebar with keyboard shortcut', () => {
    // Initially closed
    cy.get(selectors.sidebar).should('not.exist')

    // Open with Tab
    cy.openSidebar()
    cy.get(selectors.sidebar).should('be.visible')

    // Close with Escape
    cy.closeSidebar()
    cy.get(selectors.sidebar).should('not.exist')
  })

  it('should display all sidebar tabs', () => {
    cy.openSidebar()

    const tabs = ['apps', 'inspect', 'avatar', 'settings']

    tabs.forEach(tab => {
      cy.get(selectors.sidebarTabs[tab as keyof typeof selectors.sidebarTabs])
        .should('exist')
        .should('be.visible')
    })
  })

  it('should switch between sidebar tabs', () => {
    cy.openSidebar()

    // Test Apps tab
    cy.selectSidebarTab('apps')
    cy.get(selectors.appsPane).should('be.visible')
    cy.get(selectors.appsList).should('exist')

    // Test Inspect tab
    cy.selectSidebarTab('inspect')
    cy.get(selectors.inspectPane).should('be.visible')

    // Test Avatar tab
    cy.selectSidebarTab('avatar')
    cy.get(selectors.avatarPane).should('be.visible')

    // Test Settings tab
    cy.selectSidebarTab('settings')
    cy.get(selectors.settingsPane).should('be.visible')
  })

  it('should persist selected tab when reopening sidebar', () => {
    cy.openSidebar()
    cy.selectSidebarTab('settings')

    cy.closeSidebar()
    waitForAnimation()

    cy.openSidebar()
    cy.get(selectors.settingsPane).should('be.visible')
  })

  it('should show app details in Apps pane', () => {
    cy.openSidebar()
    cy.selectSidebarTab('apps')

    // Check for app list structure
    cy.get(selectors.appsList).within(() => {
      cy.get('.App__item').should('have.length.greaterThan', 0)
    })

    // Click on first app
    cy.get('.App__item').first().click()
    waitForAnimation()

    // Should show app details
    cy.get('.App__details').should('be.visible')
  })

  it('should display entity properties in Inspect pane', () => {
    // Create test entity
    cy.createEntity('npc', {
      name: 'Test NPC',
      position: { x: 10, y: 0, z: 10 },
    }).then(entity => {
      // Select entity
      cy.selectEntity(entity.data.id)

      // Check inspect pane shows entity info
      cy.get(selectors.inspectPane).within(() => {
        cy.contains('Test NPC').should('exist')
        cy.contains('Position').should('exist')
        cy.get(selectors.field).should('have.length.greaterThan', 0)
      })
    })
  })

  it('should allow avatar customization', () => {
    cy.openSidebar()
    cy.selectSidebarTab('avatar')

    cy.get(selectors.avatarPane).within(() => {
      // Check for avatar preview
      cy.get('.AvatarPreview').should('exist')

      // Check for customization options
      cy.contains('Avatar').should('exist')
      cy.get('input[type="file"]').should('exist')
    })
  })

  it('should handle settings in Settings pane', () => {
    cy.openSidebar()
    cy.selectSidebarTab('settings')

    cy.get(selectors.settingsPane).within(() => {
      // Check for common settings
      cy.contains('Settings').should('exist')

      // Look for toggle switches or input fields
      cy.get('input').should('have.length.greaterThan', 0)
    })
  })

  it('should handle code editor tab if available', () => {
    cy.openSidebar()

    // Check if code tab exists
    cy.get('body').then($body => {
      if ($body.find(selectors.sidebarTabs.code).length > 0) {
        cy.selectSidebarTab('code')
        cy.get(selectors.codeEditor).should('be.visible')

        // Check for editor features
        cy.get('.CodeEditor__editor').should('exist')
      }
    })
  })

  it('should handle script editor tab if available', () => {
    cy.openSidebar()

    // Check if script tab exists
    cy.get('body').then($body => {
      if ($body.find(selectors.sidebarTabs.script).length > 0) {
        cy.selectSidebarTab('script')
        cy.get(selectors.scriptEditor).should('be.visible')

        // Check for editor features
        cy.get('.ScriptEditor__editor').should('exist')
      }
    })
  })

  it('should handle sidebar resize', () => {
    cy.openSidebar()

    // Get initial width
    cy.get(selectors.sidebar).then($sidebar => {
      const initialWidth = $sidebar.width()

      // Look for resize handle
      cy.get('.Sidebar__resize').then($resize => {
        if ($resize.length > 0) {
          // Drag to resize
          cy.get('.Sidebar__resize')
            .trigger('mousedown', { button: 0 })
            .trigger('mousemove', { clientX: 400 })
            .trigger('mouseup')

          // Check width changed
          cy.get(selectors.sidebar).then($newSidebar => {
            expect($newSidebar.width()).to.not.equal(initialWidth)
          })
        }
      })
    })
  })

  it('should maintain state during navigation', () => {
    cy.openSidebar()
    cy.selectSidebarTab('avatar')

    // Navigate away and back
    cy.openMenu()
    cy.closeMenu()

    // Sidebar should still be open with same tab
    cy.get(selectors.sidebar).should('be.visible')
    cy.get(selectors.avatarPane).should('be.visible')
  })

  it('should handle rapid tab switching', () => {
    cy.openSidebar()

    // Rapidly switch tabs
    const tabs = ['apps', 'inspect', 'avatar', 'settings']

    tabs.forEach(tab => {
      cy.selectSidebarTab(tab)
    })

    // Should end on last tab
    cy.get(selectors.settingsPane).should('be.visible')
  })

  it('should take screenshots of each sidebar tab', () => {
    cy.openSidebar()

    const tabs = ['apps', 'inspect', 'avatar', 'settings']

    tabs.forEach(tab => {
      cy.selectSidebarTab(tab)
      waitForAnimation()
      cy.screenshot(`sidebar-${tab}`)
    })
  })
})
