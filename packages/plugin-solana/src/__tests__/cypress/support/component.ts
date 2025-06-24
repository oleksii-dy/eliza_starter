// ***********************************************************
// This example support/component.ts is processed and
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
import React from 'react';

// Alternatively you can use CommonJS syntax:
// require('./commands')

// Import Testing Library Cypress commands
import '@testing-library/cypress/add-commands';

// Import styles
import '../../../frontend/index.css';

// Mount command
Cypress.Commands.add('mount', (component: React.ReactNode, options?: any) => {
  // Wrap component in any necessary providers here
  return cy.mount(component, options);
});

// Add custom commands to the global Cypress object
declare global {
   
  namespace Cypress {
    interface Chainable {
      /**
       * Custom command to mount React components
       * @example cy.mount(<Component />)
       */
      mount(component: React.ReactNode, options?: any): Chainable<any>;
    }
  }
} 