/// <reference types="cypress" />

// World-specific commands for Hyperfy

// Wait for world to fully load
Cypress.Commands.add('waitForWorldLoad', () => {
  cy.log('Waiting for world to load...');
  
  // First ensure React app is mounted
  cy.get('#root', { timeout: 10000 }).should('exist');
  
  // Then wait for App to be rendered
  cy.get('.App', { timeout: 10000 }).should('exist');
  
  // Then wait for viewport
  cy.get('.App__viewport', { timeout: 10000 }).should('exist');
  
  // Wait for Three.js
  cy.waitForThreeJS();
  
  // Wait for world object
  cy.window().then((win) => {
    cy.waitUntil(() => {
      return (win as any).world && (win as any).world.frame >= 0;
    }, {
      timeout: 30000,
      interval: 500,
      errorMsg: 'World failed to load within 30 seconds'
    });
  });
  
  // Optional: Wait for WebSocket connection (not required for all tests)
  cy.window().then((win) => {
    const world = (win as any).world;
    if (world && world.network && Cypress.env('REQUIRE_NETWORK')) {
      cy.waitUntil(() => {
        return world.network.connected === true;
      }, {
        timeout: 10000,
        interval: 100,
        errorMsg: 'Failed to connect to world server',
        customMessage: 'Network connection is optional for this test'
      });
    }
  });
  
  cy.log('World loaded successfully');
});

// Connect to a specific world
Cypress.Commands.add('connectToWorld', (wsUrl?: string) => {
  const url = wsUrl || Cypress.env('WS_URL') || 'ws://localhost:4000/ws';
  
  cy.log(`Connecting to world at ${url}`);
  
  cy.window().then((win) => {
    const world = (win as any).world;
    if (world && world.network) {
      world.network.connect(url);
    }
  });
  
  cy.waitForWorldLoad();
});

// Get world instance
Cypress.Commands.add('getWorld', () => {
  return cy.window().then((win) => {
    const world = (win as any).world;
    if (!world) {
      throw new Error('World not found on window object');
    }
    return world;
  });
}); 