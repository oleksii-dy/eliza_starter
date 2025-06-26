/// <reference types="cypress" />

// UI-specific commands for Hyperfy

// Sidebar commands
Cypress.Commands.add('openSidebar', () => {
  cy.log('Opening sidebar');
  
  // Check if sidebar is already open
  cy.get('body').then(($body) => {
    if ($body.find('.Sidebar').length === 0 || !$body.find('.Sidebar').is(':visible')) {
      // Click the menu button or press Tab
      cy.get('body').type('{tab}');
      cy.wait(500);
    }
  });
  
  cy.get('.Sidebar').should('be.visible');
});

Cypress.Commands.add('closeSidebar', () => {
  cy.log('Closing sidebar');
  
  cy.get('body').then(($body) => {
    if ($body.find('.Sidebar').is(':visible')) {
      // Press Escape or click outside
      cy.get('body').type('{esc}');
      cy.wait(500);
    }
  });
  
  cy.get('.Sidebar').should('not.exist');
});

Cypress.Commands.add('selectSidebarTab', (tab: string) => {
  cy.openSidebar();
  
  const tabMap: Record<string, string> = {
    'apps': '[data-tab="apps"]',
    'inspect': '[data-tab="inspect"]',
    'avatar': '[data-tab="avatar"]',
    'settings': '[data-tab="settings"]',
    'code': '[data-tab="code"]',
    'script': '[data-tab="script"]'
  };
  
  const selector = tabMap[tab.toLowerCase()] || `[data-tab="${tab}"]`;
  
  cy.get(selector).click();
  cy.wait(500);
});

// Menu commands
Cypress.Commands.add('openMenu', () => {
  cy.log('Opening menu');
  
  // Press Escape to open menu
  cy.get('body').type('{esc}');
  cy.wait(500);
  
  cy.get('.Menu').should('be.visible');
});

Cypress.Commands.add('closeMenu', () => {
  cy.log('Closing menu');
  
  cy.get('body').then(($body) => {
    if ($body.find('.Menu').is(':visible')) {
      cy.get('body').type('{esc}');
      cy.wait(500);
    }
  });
  
  cy.get('.Menu').should('not.exist');
});

// Helper to interact with CoreUI components
export const interactWithCoreUI = (action: string) => {
  cy.get('.CoreUI').should('exist');
  
  switch (action) {
    case 'toggleChat':
      cy.get('[data-ui="chat-toggle"]').click();
      break;
    case 'openInventory':
      cy.get('[data-ui="inventory"]').click();
      break;
    case 'openMap':
      cy.get('[data-ui="map"]').click();
      break;
    default:
      cy.log(`Unknown CoreUI action: ${action}`);
  }
}; 