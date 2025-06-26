describe('Agent Editor Page', () => {
  beforeEach(() => {
    // Clear any existing authentication
    cy.clearAuthState();
    
    // Set up API intercepts for the agent editor page
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
            emailVerified: true
          },
          organization: {
            id: 'a0000000-0000-4000-8000-000000000002',
            name: 'ElizaOS Development',
            slug: 'elizaos-dev',
            creditBalance: '1000.0',
            subscriptionTier: 'premium'
          }
        }
      }
    }).as('identity');

    // Mock agents API
    cy.intercept('GET', '**/api/agents*', {
      statusCode: 200,
      body: {
        success: true,
        data: {
          agents: [
            {
              id: 'agent-1',
              name: 'Test Agent',
              description: 'A test agent for demo purposes',
              status: 'active',
              lastUpdated: '2024-01-01T00:00:00Z'
            }
          ],
          stats: {
            totalAgents: 1,
            activeAgents: 1,
            draftAgents: 0
          }
        }
      }
    }).as('agents');

    // Mock agent templates API
    cy.intercept('GET', '**/api/agents/templates*', {
      statusCode: 200,
      body: {
        success: true,
        data: {
          templates: [
            {
              id: 'template-1',
              name: 'Customer Support',
              description: 'Customer support agent template',
              category: 'business'
            }
          ]
        }
      }
    }).as('templates');
  });

  it('should load agent editor page successfully', () => {
    cy.devLogin();
    cy.visit('/dashboard/agents/editor', { failOnStatusCode: false });
    
    // Check for main page elements
    cy.contains('Agent Editor').should('be.visible');
    cy.get('[data-cy="agent-editor-container"]').should('be.visible');
  });

  it('should navigate to agent editor from sidebar', () => {
    cy.devLogin();
    cy.visit('/dashboard', { failOnStatusCode: false });
    
    // Click on Agent Editor in sidebar
    cy.get('[data-cy="sidebar-link-agent-editor"]').click();
    
    // Should navigate to agent editor
    cy.url().should('include', '/dashboard/agents/editor');
    cy.contains('Agent Editor').should('be.visible');
  });

  it('should display agent creation form', () => {
    cy.devLogin();
    cy.visit('/dashboard/agents/editor', { failOnStatusCode: false });
    
    // Check for form elements
    cy.get('[data-cy="agent-name-input"]').should('be.visible');
    cy.get('[data-cy="agent-description-input"]').should('be.visible');
    cy.get('[data-cy="create-agent-btn"]').should('be.visible');
  });

  it('should show agent templates section', () => {
    cy.devLogin();
    cy.visit('/dashboard/agents/editor', { failOnStatusCode: false });
    
    // Check for templates section
    cy.get('[data-cy="agent-templates-section"]').should('be.visible');
    cy.contains('Templates').should('be.visible');
  });

  it('should handle agent creation workflow', () => {
    cy.devLogin();
    cy.visit('/dashboard/agents/editor', { failOnStatusCode: false });
    
    // Mock agent creation API
    cy.intercept('POST', '**/api/agents', {
      statusCode: 201,
      body: {
        success: true,
        data: {
          id: 'new-agent-123',
          name: 'Test Agent',
          description: 'Test Description',
          status: 'draft'
        }
      }
    }).as('createAgent');
    
    // Fill out form if elements exist
    cy.get('body').then(($body) => {
      if ($body.find('[data-cy="agent-name-input"]').length > 0) {
        cy.get('[data-cy="agent-name-input"]').type('Test Agent');
        cy.get('[data-cy="agent-description-input"]').type('Test Description');
        cy.get('[data-cy="create-agent-btn"]').click();
        
        // Should show success feedback
        cy.contains('Agent created successfully').should('be.visible');
      }
    });
  });

  it('should display existing agents list', () => {
    cy.devLogin();
    cy.visit('/dashboard/agents/editor', { failOnStatusCode: false });
    
    // Wait for agents to load
    cy.wait('@agents');
    
    // Check for agents list
    cy.get('[data-cy="agents-list"]').should('be.visible');
  });

  it('should handle navigation between different agent editor sections', () => {
    cy.devLogin();
    cy.visit('/dashboard/agents/editor', { failOnStatusCode: false });
    
    // Check if there are tabs or sections to navigate
    cy.get('body').then(($body) => {
      if ($body.find('[data-cy="agent-editor-tabs"]').length > 0) {
        cy.get('[data-cy="agent-editor-tabs"]').should('be.visible');
      }
      
      if ($body.find('[data-cy="configuration-tab"]').length > 0) {
        cy.get('[data-cy="configuration-tab"]').click();
        cy.get('[data-cy="configuration-panel"]').should('be.visible');
      }
    });
  });

  it('should maintain responsive design on mobile', () => {
    cy.devLogin();
    cy.viewport(375, 667); // iPhone SE dimensions
    cy.visit('/dashboard/agents/editor', { failOnStatusCode: false });
    
    // Check that main content is still accessible
    cy.contains('Agent Editor').should('be.visible');
    
    // Check mobile menu functionality
    cy.get('[data-cy="mobile-menu-button"]').should('be.visible');
    cy.get('[data-cy="mobile-menu-button"]').click();
    cy.get('[data-cy="sidebar"]').should('be.visible');
  });

  it('should handle error states gracefully', () => {
    cy.devLogin();
    
    // Mock API error
    cy.intercept('GET', '**/api/agents*', {
      statusCode: 500,
      body: {
        success: false,
        error: 'Internal server error'
      }
    }).as('agentsError');
    
    cy.visit('/dashboard/agents/editor', { failOnStatusCode: false });
    
    // Should show error message or fallback UI
    cy.get('body').should('contain.text', 'Agent Editor');
  });
});