/// <reference types="cypress" />

// ***********************************************************
// This example support/e2e.ts is processed and
// loaded automatically before your test files.
//
// This is a great place to put global configuration and
// behavior that modifies Cypress.
//
// You can change the location of this file or turn off
// automatically serving support files with the
// 'supportFile' configuration option.
//
// You can read more here:
// https://on.cypress.io/configuration
// ***********************************************************

// Import commands.js using ES2015 syntax:
import './commands';

// Prevent uncaught exceptions from failing tests
Cypress.on('uncaught:exception', (err, runnable) => {
  // Return false if the error is a known issue we want to ignore
  if (
    err.message.includes('ResizeObserver loop limit exceeded') ||
    err.message.includes(
      'ResizeObserver loop completed with undelivered notifications',
    ) ||
    err.message.includes('Cannot read properties of null') ||
    err.message.includes('NetworkError')
  ) {
    return false;
  }
  // Let other errors fail the test
  return true;
});

// Add custom console log command for debugging
Cypress.Commands.add('logMessage', (message: string) => {
  cy.task('log', message);
});

// Configure default timeouts
Cypress.config('defaultCommandTimeout', 10000);
Cypress.config('requestTimeout', 10000);
Cypress.config('responseTimeout', 10000);

// Global before each hook
beforeEach(() => {
  // Clear all cookies and local storage before each test
  cy.clearCookies();
  cy.clearLocalStorage();

  // Set a consistent viewport
  cy.viewport(1280, 720);

  // Intercept API calls to backend
  cy.intercept('GET', '/api/v1/**', (req) => {
    req.headers['Accept'] = 'application/json';
  }).as('apiCall');

  // Intercept auth endpoints
  cy.intercept('POST', '/api/v1/auth/login', {
    statusCode: 200,
    body: {
      success: true,
      data: {
        authUrl:
          'http://test.workos.com/sso/authorize?client_id=test&redirect_uri=http://localhost:3000/auth/callback',
        state: 'test_state_123',
      },
    },
  }).as('login');

  cy.intercept('POST', '/api/v1/auth/logout', {
    statusCode: 200,
    body: { success: true, data: { message: 'Logged out successfully' } },
  }).as('logout');
});

// Global after each hook
afterEach(() => {
  // Take a screenshot on failure
  if ((Cypress.currentTest as any).state === 'failed') {
    cy.screenshot(`${Cypress.currentTest.title}-failed`);
  }
});
