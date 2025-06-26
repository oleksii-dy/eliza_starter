/// <reference types="cypress" />

// Main Cypress commands for Hyperfy UI testing

// Wait for Three.js to be ready
Cypress.Commands.add('waitForThreeJS', () => {
  cy.window().should('have.property', 'THREE');
  cy.wait(1000); // Give time for scene setup
});

// Check performance metrics
Cypress.Commands.add('checkPerformance', () => {
  cy.window().then((win) => {
    const entries = win.performance.getEntriesByType('measure');
    const marks = win.performance.getEntriesByType('mark');
    
    cy.task('table', {
      measures: entries.map(e => ({ name: e.name, duration: e.duration })),
      marks: marks.map(m => ({ name: m.name, startTime: m.startTime }))
    });
  });
});

// Common utility to wait for element with retry
export const waitForElement = (selector: string, timeout = 10000) => {
  cy.get(selector, { timeout }).should('exist').should('be.visible');
};

// Common utility to click with force if needed
export const safeClick = (selector: string) => {
  cy.get(selector).click({ force: true });
}; 