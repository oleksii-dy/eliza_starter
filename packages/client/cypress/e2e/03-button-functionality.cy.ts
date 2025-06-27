describe('Button Functionality and Screenshots', () => {
  beforeEach(() => {
    cy.visit('/');
    // Wait for app to be ready (inline implementation)
    cy.get('#root', { timeout: 30000 }).should('exist');
    cy.document().its('readyState').should('equal', 'complete');
    cy.wait(1000);
  });

  it('captures homepage screenshot and tests all buttons', () => {
    // Take initial screenshot of homepage
    cy.screenshot('success-01-homepage', { capture: 'fullPage' });

    // Test connection status (if clickable)
    cy.get('[data-testid="connection-status"]').should('exist');
    cy.screenshot('success-02-connection-status', { capture: 'fullPage' });

    // Test sidebar toggle button
    cy.get('body').then(($body) => {
      if ($body.find('[data-testid="sidebar-toggle"]').length > 0) {
        cy.get('[data-testid="sidebar-toggle"]').should('be.visible').click();
        cy.wait(500); // Wait for animation
        cy.screenshot('success-03-sidebar-collapsed', { capture: 'fullPage' });

        // Toggle back
        cy.get('[data-testid="sidebar-toggle"]').click();
        cy.wait(500);
        cy.screenshot('success-04-sidebar-expanded', { capture: 'fullPage' });
      }
    });

    // Test add agent button
    cy.get('[data-testid="add-agent-button"]').should('exist').and('be.visible');
    cy.screenshot('success-05-add-agent-button', { capture: 'fullPage' });

    // Click add agent button (should show prompt)
    cy.get('[data-testid="add-agent-button"]').click();
    cy.screenshot('success-06-add-agent-clicked', { capture: 'fullPage' });

    // Test agent cards interaction
    cy.get('[data-testid="agent-card"]').should('exist');
    cy.get('[data-testid="agent-card"]').first().should('be.visible');
    cy.screenshot('success-07-agent-cards', { capture: 'fullPage' });

    // Click on first agent card
    cy.get('[data-testid="agent-card"]').first().click();
    cy.wait(1000);
    cy.screenshot('success-08-agent-selected', { capture: 'fullPage' });
  });

  it('tests mobile responsiveness and mobile buttons', () => {
    // Switch to mobile viewport
    cy.viewport('iphone-x');
    cy.wait(1000);
    cy.screenshot('success-09-mobile-view', { capture: 'fullPage' });

    // Test mobile menu button
    cy.get('[data-testid="mobile-menu-button"]').should('be.visible');
    cy.screenshot('success-10-mobile-menu-button', { capture: 'fullPage' });

    // Click mobile menu button
    cy.get('[data-testid="mobile-menu-button"]').click({ force: true });
    cy.wait(500);
    cy.screenshot('success-11-mobile-menu-open', { capture: 'fullPage' });

    // Test agent cards in mobile
    cy.get('[data-testid="agent-card"]').should('exist');
    cy.get('[data-testid="agent-card"]').first().click();
    cy.wait(500);
    cy.screenshot('success-12-mobile-agent-selected', { capture: 'fullPage' });

    // Return to desktop view
    cy.viewport(1280, 720);
    cy.wait(1000);
    cy.screenshot('success-13-back-to-desktop', { capture: 'fullPage' });
  });

  it('tests chat input functionality', () => {
    // Select an agent first
    cy.get('[data-testid="agent-card"]').first().click();
    cy.wait(500);

    // Test chat input
    cy.get('#chatInput').should('exist').and('be.visible');
    cy.screenshot('success-14-chat-input', { capture: 'fullPage' });

    // Type in chat input
    cy.get('#chatInput').type('Hello, this is a test message');
    cy.screenshot('success-15-chat-input-with-text', { capture: 'fullPage' });

    // Press Enter to send message
    cy.get('#chatInput').type('{enter}');
    cy.wait(500);
    cy.screenshot('success-16-message-sent', { capture: 'fullPage' });
  });

  it('tests all interactive elements', () => {
    // Test all buttons exist and are interactive
    const elements = ['connection-status', 'add-agent-button', 'mobile-menu-button'];

    elements.forEach((elementId, index) => {
      cy.get(`[data-testid="${elementId}"]`).should('exist');
      if (elementId !== 'connection-status' && elementId !== 'mobile-menu-button') {
        cy.get(`[data-testid="${elementId}"]`).should('be.visible');
      }
      cy.screenshot(`success-17-element-${index + 1}-${elementId}`, { capture: 'fullPage' });
    });

    // Test sidebar toggle if exists
    cy.get('body').then(($body) => {
      if ($body.find('[data-testid="sidebar-toggle"]').length > 0) {
        cy.get('[data-testid="sidebar-toggle"]').should('be.visible');
        cy.screenshot('success-18-sidebar-toggle-button', { capture: 'fullPage' });
      }
    });

    // Test all agent cards
    cy.get('[data-testid="agent-card"]').should('have.length.at.least', 1);
    cy.get('[data-testid="agent-card"]').each(($el, index) => {
      cy.wrap($el).should('be.visible');
      cy.screenshot(`success-19-agent-card-${index + 1}`, { capture: 'fullPage' });
    });
  });

  it('verifies page layout and all components', () => {
    // Test main layout components
    cy.get('#root').should('exist');
    cy.screenshot('success-20-root-element', { capture: 'fullPage' });

    cy.get('[data-testid="app-sidebar"]').should('exist');
    cy.screenshot('success-21-app-sidebar', { capture: 'fullPage' });

    // Verify gradient background and styling
    cy.get('body').should('have.css', 'background-image');
    cy.screenshot('success-22-styled-page', { capture: 'fullPage' });

    // Test header content
    cy.get('h1').should('contain.text', 'ElizaOS');
    cy.screenshot('success-23-header-content', { capture: 'fullPage' });

    // Test all text content is visible
    cy.contains('Multi-Agent AI Framework').should('be.visible');
    cy.screenshot('success-24-subtitle', { capture: 'fullPage' });

    // Test feature cards
    cy.contains('AI Agents').should('be.visible');
    cy.contains('Chat Interface').should('be.visible');
    cy.contains('Customization').should('be.visible');
    cy.screenshot('success-25-feature-cards', { capture: 'fullPage' });
  });

  it('tests error handling and edge cases', () => {
    // Test clicking elements rapidly
    cy.get('[data-testid="add-agent-button"]').click();
    cy.wait(100);
    cy.get('[data-testid="add-agent-button"]').click();
    cy.screenshot('success-26-rapid-clicks', { capture: 'fullPage' });

    // Test typing in chat without agent selected
    cy.get('#chatInput').clear().type('Test message without agent selected{enter}');
    cy.wait(500);
    cy.screenshot('success-27-chat-without-agent', { capture: 'fullPage' });

    // Test viewport changes
    cy.viewport(400, 600);
    cy.wait(500);
    cy.screenshot('success-28-narrow-viewport', { capture: 'fullPage' });

    cy.viewport(1920, 1080);
    cy.wait(500);
    cy.screenshot('success-29-wide-viewport', { capture: 'fullPage' });

    // Reset to default
    cy.viewport(1280, 720);
    cy.screenshot('success-30-default-viewport', { capture: 'fullPage' });
  });
});
