// Support file for Cypress component testing
import './commands';

// Import any global styles needed for component tests
// import '../../src/client/styles/global.css';

// Configure component testing
import { mount } from '@cypress/react';

declare global {
  namespace Cypress {
    interface Chainable {
      mount: typeof mount;
    }
  }
}

Cypress.Commands.add('mount', mount); 