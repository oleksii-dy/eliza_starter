/// <reference types="cypress" />

// TypeScript declarations
declare global {
  namespace Cypress {
    interface Chainable {
      /**
       * Login as test user with valid session
       */
      loginAsTestUser(): Chainable<void>;

      /**
       * Login with specific user object
       */
      loginAs(user: any): Chainable<void>;

      /**
       * Mock authentication state
       */
      mockAuth(): Chainable<void>;

      /**
       * Visit page as authenticated user
       */
      visitAuthenticated(url: string): Chainable<void>;

      /**
       * Clear all authentication state
       */
      clearAuthState(): Chainable<void>;

      /**
       * Wait for page to be fully loaded
       */
      waitForPageLoad(): Chainable<void>;

      /**
       * Mock API success response
       */
      mockApiSuccess(
        method: string,
        endpoint: string,
        response: any,
      ): Chainable<void>;

      /**
       * Mock API error response
       */
      mockApiError(
        method: string,
        endpoint: string,
        error: string,
        statusCode?: number,
      ): Chainable<void>;

      /**
       * Fill login form
       */
      fillLoginForm(email: string, password: string): Chainable<void>;

      /**
       * Fill signup form
       */
      fillSignupForm(user: any): Chainable<void>;

      /**
       * Enable test mode
       */
      enableTestMode(): Chainable<void>;

      /**
       * Clean up test data
       */
      cleanupTestData(): Chainable<void>;

      /**
       * Use dev login to authenticate
       */
      devLogin(): Chainable<void>;
    }
  }
}

// Authentication Commands
Cypress.Commands.add('loginAsTestUser', () => {
  const testUser = {
    id: 'test-user-123',
    email: 'test@elizaos.ai',
    firstName: 'Test',
    lastName: 'User',
    organizationId: 'test-org-123',
    role: 'owner',
  };

  // Mock authentication state
  cy.window().then((win) => {
    win.localStorage.setItem('auth-token', 'test-auth-token');
    win.localStorage.setItem('user', JSON.stringify(testUser));
  });

  // Mock identity endpoint
  cy.intercept('GET', '**/api/auth/identity', {
    statusCode: 200,
    body: {
      user: testUser,
      organization: {
        id: 'test-org-123',
        name: 'Test Organization',
        slug: 'test-org',
        subscriptionTier: 'pro',
        creditBalance: '100.00',
      },
      permissions: {
        canCreateAgents: true,
        canEditAgents: true,
        canDeleteAgents: true,
        canManageUsers: true,
        canAccessBilling: true,
      },
    },
  }).as('getIdentity');
});

Cypress.Commands.add('loginAs', (user: any) => {
  cy.window().then((win) => {
    win.localStorage.setItem('auth-token', `${user.email}-token`);
    win.localStorage.setItem('user', JSON.stringify(user));
  });

  cy.intercept('GET', '**/api/auth/identity', {
    statusCode: 200,
    body: {
      user: user,
      organization: {
        id: user.organizationId,
        name: `${user.name} Organization`,
        slug: user.organizationId,
        subscriptionTier: 'free',
        creditBalance: '100.00',
      },
    },
  }).as('getIdentity');
});

Cypress.Commands.add('mockAuth', () => {
  const mockUser = {
    id: 'mock-user-123',
    email: 'mock@elizaos.ai',
    firstName: 'Mock',
    lastName: 'User',
    organizationId: 'mock-org-123',
    role: 'owner',
  };

  cy.window().then((win) => {
    win.localStorage.setItem('auth-token', 'mock-auth-token');
    win.localStorage.setItem('user', JSON.stringify(mockUser));
  });

  // Mock identity check
  cy.intercept('GET', '**/api/auth/identity', {
    statusCode: 200,
    body: {
      user: mockUser,
      organization: {
        id: 'mock-org-123',
        name: 'Mock Organization',
        slug: 'mock-org',
        subscriptionTier: 'pro',
        creditBalance: '250.00',
      },
      permissions: {
        canCreateAgents: true,
        canEditAgents: true,
        canDeleteAgents: true,
        canManageUsers: true,
        canAccessBilling: true,
      },
    },
  }).as('getIdentity');

  // Mock agents endpoint
  cy.intercept('GET', '**/api/agents', {
    statusCode: 200,
    body: {
      success: true,
      data: {
        agents: [],
        stats: {
          totalAgents: 0,
          activeAgents: 0,
          draftAgents: 0,
          totalInteractions: 0,
          totalCost: 0,
        },
      },
    },
  }).as('getAgents');
});

Cypress.Commands.add('visitAuthenticated', (url: string) => {
  cy.mockAuth();
  cy.visit(url);
  cy.wait('@getIdentity');
});

// Improved dev login command
Cypress.Commands.add('devLogin', () => {
  // Set authentication cookie AND localStorage for full compatibility
  cy.setCookie('auth-token', 'dev-auth-token-123');
  
  // Set authentication state directly without API calls to speed up tests
  cy.window().then((win) => {
    win.localStorage.setItem('auth-token', 'dev-auth-token-123');
    win.localStorage.setItem('user', JSON.stringify({
      id: 'a0000000-0000-4000-8000-000000000001',
      email: 'dev@elizaos.ai',
      firstName: 'Developer',
      lastName: 'User',
      organizationId: 'a0000000-0000-4000-8000-000000000002',
      role: 'owner',
      emailVerified: true,
    }));
  });

  // Mock all auth-related API calls to avoid network delays
  // Mock the exact endpoint that layout.tsx calls
  cy.intercept('GET', 'http://localhost:3333/api/auth/identity', {
    statusCode: 200,
    body: {
      id: 'a0000000-0000-4000-8000-000000000001',
      email: 'dev@elizaos.ai',
      firstName: 'Developer',
      lastName: 'User',
      organizationId: 'a0000000-0000-4000-8000-000000000002',
      role: 'owner',
      emailVerified: true,
      deleted_at: null, // Important for layout logic
    },
  }).as('identityLayout');

  // Also mock the newer API pattern
  cy.intercept('GET', '**/api/auth/identity', {
    statusCode: 200,
    body: {
      success: true,
      data: {
        user: {
          id: 'a0000000-0000-4000-8000-000000000001',
          email: 'dev@elizaos.ai',
          firstName: 'Developer',
          lastName: 'User',
          organizationId: 'a0000000-0000-4000-8000-000000000002',
          role: 'owner',
          emailVerified: true,
        },
        organization: {
          id: 'a0000000-0000-4000-8000-000000000002',
          name: 'ElizaOS Development',
          slug: 'elizaos-dev',
          creditBalance: '1000.0',
          subscriptionTier: 'premium',
        },
      },
    },
  }).as('identity');

  cy.intercept('GET', '/api/auth/session', {
    statusCode: 200,
    body: {
      success: true,
      data: {
        userId: 'a0000000-0000-4000-8000-000000000001',
        email: 'dev@elizaos.ai',
        organizationId: 'a0000000-0000-4000-8000-000000000002'
      }
    }
  }).as('session');

  cy.intercept('GET', '/api/v1/organizations/config', {
    statusCode: 200,
    body: {
      requiredPlugins: ['@elizaos/plugin-sql', '@elizaos/plugin-openai']
    }
  }).as('orgConfig');

  cy.intercept('POST', '/api/api-keys', {
    statusCode: 200,
    body: {
      success: true,
      data: {
        key: 'test-api-key-123'
      }
    }
  }).as('apiKey');
});

// API Mocking Commands
Cypress.Commands.add(
  'mockApiSuccess',
  (method: string, endpoint: string, response: any) => {
    cy.intercept(method as any, `**/api/${endpoint}`, {
      statusCode: 200,
      body: {
        success: true,
        data: response,
      },
    });
  },
);

Cypress.Commands.add(
  'mockApiError',
  (method: string, endpoint: string, error: string, statusCode = 400) => {
    cy.intercept(method as any, `**/api/${endpoint}`, {
      statusCode,
      body: {
        success: false,
        error,
      },
    });
  },
);

// Utility Commands
Cypress.Commands.add('clearAuthState', () => {
  cy.clearCookies();
  cy.clearLocalStorage();
  cy.window().then((win) => {
    win.sessionStorage.clear();
  });
  // Explicitly clear auth-token cookie
  cy.clearCookie('auth-token');
});

Cypress.Commands.add('waitForPageLoad', () => {
  cy.get('body').should('be.visible');
  // Wait for any loading indicators to disappear
  cy.get('[data-cy="loading"]').should('not.exist');
});

// Form Commands
Cypress.Commands.add('fillLoginForm', (email: string, password: string) => {
  cy.get('[data-cy="email-input"]').clear().type(email);
  cy.get('[data-cy="password-input"]').clear().type(password);
});

Cypress.Commands.add('fillSignupForm', (user: any) => {
  cy.get('[data-cy="first-name-input"]').clear().type(user.firstName);
  cy.get('[data-cy="last-name-input"]').clear().type(user.lastName);
  cy.get('[data-cy="email-input"]').clear().type(user.email);
  cy.get('[data-cy="organization-input"]').clear().type(user.organizationName);
  cy.get('[data-cy="password-input"]').clear().type(user.password);
});

// Testing Mode Commands
Cypress.Commands.add('enableTestMode', () => {
  cy.window().then((win) => {
    (win as any).__TESTING_MODE__ = true;
  });
});

// Data Cleanup Commands
Cypress.Commands.add('cleanupTestData', () => {
  // This would call your backend cleanup endpoint
  cy.request({
    method: 'POST',
    url: '/api/test/cleanup',
    failOnStatusCode: false,
    headers: {
      'X-Test-Mode': 'true',
    },
  });
});

// Export to make TypeScript happy
export {};
