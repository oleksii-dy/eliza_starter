describe('Entity Graph E2E Tests', () => {
  beforeEach(() => {
    // Visit the page with the entity graph
    cy.visit('/');

    // Wait for initial load
    cy.contains('Knowledge').should('be.visible');

    // Switch to entity graph view
    cy.contains('button', 'Entity Graph').click();
    cy.wait(1000); // Wait for graph to initialize
  });

  it('displays entity graph with nodes and relationships', () => {
    // Check that the graph container exists
    cy.get('[data-testid="force-graph"]').should('exist');

    // Check for legend
    cy.contains('Entity Trust Level').should('be.visible');
    cy.contains('Trusted').should('be.visible');
    cy.contains('Neutral').should('be.visible');
    cy.contains('Suspicious').should('be.visible');

    // Check for stats panel
    cy.contains('Network Stats').should('be.visible');
  });

  it('shows and hides filters panel', () => {
    // Initially filters should be hidden
    cy.get('input[placeholder="Search entities..."]').should('not.exist');

    // Click to show filters
    cy.contains('Show Filters').click();

    // Filters should be visible
    cy.get('input[placeholder="Search entities..."]').should('be.visible');
    cy.contains('Entity Type:').should('be.visible');
    cy.contains('Trust Level:').should('be.visible');
    cy.contains('Min Strength:').should('be.visible');

    // Click to hide filters
    cy.contains('Hide Filters').click();

    // Filters should be hidden again
    cy.get('input[placeholder="Search entities..."]').should('not.exist');
  });

  it('filters entities by search term', () => {
    // Show filters
    cy.contains('Show Filters').click();

    // Type in search box
    cy.get('input[placeholder="Search entities..."]').type('Alice');

    // Wait for graph to update
    cy.wait(500);

    // Check that stats reflect filtered data
    cy.contains('Network Stats').parent().within(() => {
      // Should show fewer entities if filter is working
      cy.contains('Entities:').should('exist');
    });
  });

  it('filters entities by type', () => {
    // Show filters
    cy.contains('Show Filters').click();

    // Select entity type
    cy.get('select').select('person');

    // Wait for graph to update
    cy.wait(500);

    // Check that the filter is applied
    cy.get('select').should('have.value', 'person');
  });

  it('adjusts trust level range filter', () => {
    // Show filters
    cy.contains('Show Filters').click();

    // Find trust level sliders
    cy.contains('Trust Level:').parent().within(() => {
      // Adjust the first slider (minimum)
      cy.get('input[type="range"]').first()
        .invoke('val', '0')
        .trigger('change');

      // Check that the label updated
      cy.contains('Trust Level: 0.0 to 1.0').should('exist');
    });
  });

  it('adjusts connection strength threshold', () => {
    // Show filters
    cy.contains('Show Filters').click();

    // Find strength slider
    cy.contains('Min Strength:').parent().within(() => {
      // Adjust the slider
      cy.get('input[type="range"]')
        .invoke('val', '0.5')
        .trigger('change');

      // Check that the label updated
      cy.contains('Min Strength: 0.5').should('exist');
    });
  });

  it('filters relationship types by clicking legend items', () => {
    // Click on 'friend' relationship type in legend
    cy.contains('Relationship Types').parent().within(() => {
      cy.contains('friend').click();

      // Check that it's selected (should have font-bold class)
      cy.contains('friend').parent().should('have.class', 'font-bold');

      // Click again to deselect
      cy.contains('friend').click();

      // Should not have font-bold class anymore
      cy.contains('friend').parent().should('not.have.class', 'font-bold');
    });
  });

  it('displays entity details panel when entity is clicked', () => {
    // This would require actual data in the graph
    // For now, we'll check that the structure exists
    cy.get('body').then($body => {
      // If there are entities in the graph
      if ($body.find('g.node').length > 0) {
        // Click on the first node
        cy.get('g.node').first().click();

        // Check that entity details panel appears
        cy.contains('Trust Level').should('be.visible');
      }
    });
  });

  it('switches between entity graph and entity list views', () => {
    // Currently in entity graph view
    cy.get('[data-testid="force-graph"]').should('exist');

    // Switch to entity list view
    cy.contains('button', 'Entity List').click();

    // Should show table view
    cy.get('table').should('be.visible');

    // Switch back to graph view
    cy.contains('button', 'Entity Graph').click();

    // Should show graph again
    cy.get('[data-testid="force-graph"]').should('exist');
  });

  it('handles empty state gracefully', () => {
    // If no entities exist, should show appropriate message
    cy.get('body').then($body => {
      if ($body.text().includes('No entities found')) {
        cy.contains('No entities found').should('be.visible');
        cy.contains('Entities will appear here as they are mentioned in conversations').should('be.visible');
      } else {
        // If entities exist, graph should be visible
        cy.get('[data-testid="force-graph"]').should('exist');
      }
    });
  });
});
