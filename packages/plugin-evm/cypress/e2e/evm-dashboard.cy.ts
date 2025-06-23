describe('EVM Dashboard', () => {
  beforeEach(() => {
    // Mock the ELIZA_CONFIG
    cy.visit('/', {
      onBeforeLoad(win) {
        win.ELIZA_CONFIG = {
          agentId: 'test-agent-123',
          apiBase: 'http://localhost:3000',
        };
      },
    });
  });

  describe('Wallet Balance Display', () => {
    it('should display wallet balance section', () => {
      // Mock the balance API response
      cy.intercept('GET', '**/api/agent/balance', {
        statusCode: 200,
        body: {
          network: 'Ethereum',
          address: '0x742d35Cc6634C0532925a3b844Bc454e4438fAaE',
          balance: {
            eth: {
              balance: '1000000000000000000',
              uiAmount: 1.0,
            },
            tokens: [
              {
                address: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
                symbol: 'USDC',
                name: 'USD Coin',
                decimals: 6,
                balance: '1000000',
                uiAmount: 1.0,
              },
            ],
            totalValueUSD: 3000,
          },
        },
      }).as('getBalance');

      cy.wait('@getBalance');

      // Check wallet balance display
      cy.contains('Wallet Balance').should('be.visible');
      cy.contains('Ethereum').should('be.visible');
      cy.contains('0x742d35Cc...4438fAaE').should('be.visible');
      cy.contains('1.0000 ETH').should('be.visible');
      cy.contains('1000000000000000000 wei').should('be.visible');

      // Check token balances
      cy.contains('Token Balances').should('be.visible');
      cy.contains('USDC').should('be.visible');
      cy.contains('USD Coin').should('be.visible');

      // Check total value
      cy.contains('Total Value').should('be.visible');
      cy.contains('$3000.00').should('be.visible');
    });

    it('should refresh balance on button click', () => {
      cy.intercept('GET', '**/api/agent/balance', {
        statusCode: 200,
        body: {
          network: 'Ethereum',
          address: '0x742d35Cc6634C0532925a3b844Bc454e4438fAaE',
          balance: {
            eth: {
              balance: '2000000000000000000',
              uiAmount: 2.0,
            },
            tokens: [],
          },
        },
      }).as('getBalance');

      cy.wait('@getBalance');

      // Click refresh button
      cy.get('button').contains('Refresh').first().click();
      cy.wait('@getBalance');
    });

    it('should handle balance loading state', () => {
      cy.intercept('GET', '**/api/agent/balance', {
        delay: 1000,
        statusCode: 200,
        body: {
          network: 'Ethereum',
          address: '0x742d35Cc6634C0532925a3b844Bc454e4438fAaE',
          balance: {
            eth: {
              balance: '0',
              uiAmount: 0,
            },
            tokens: [],
          },
        },
      }).as('getBalance');

      cy.contains('Loading wallet balance...').should('be.visible');
      cy.wait('@getBalance');
      cy.contains('Loading wallet balance...').should('not.exist');
    });

    it('should handle balance error state', () => {
      cy.intercept('GET', '**/api/agent/balance', {
        statusCode: 500,
        body: { error: 'Internal server error' },
      }).as('getBalance');

      cy.wait('@getBalance');
      cy.contains('Error loading wallet balance').should('be.visible');
    });
  });

  describe('Recent Actions Display', () => {
    it('should display recent actions section', () => {
      // Mock the recent actions API response
      cy.intercept('GET', '**/api/agent/recent-actions', {
        statusCode: 200,
        body: [
          {
            id: 'action-1',
            type: 'transfer',
            timestamp: Date.now() - 60000, // 1 minute ago
            status: 'success',
            details: {
              to: '0x742d35Cc6634C0532925a3b844Bc454e4438fAaE',
              amount: '0.5',
              token: 'ETH',
              hash: '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef',
            },
          },
          {
            id: 'action-2',
            type: 'swap',
            timestamp: Date.now() - 3600000, // 1 hour ago
            status: 'pending',
            details: {
              amount: '100',
              token: 'USDC',
              to: 'USDT',
            },
          },
          {
            id: 'action-3',
            type: 'bridge',
            timestamp: Date.now() - 86400000, // 1 day ago
            status: 'failed',
            details: {
              fromChain: 'Ethereum',
              toChain: 'Polygon',
              amount: '1',
              token: 'ETH',
            },
          },
        ],
      }).as('getRecentActions');

      cy.wait('@getRecentActions');

      // Check recent actions display
      cy.contains('Recent Actions').should('be.visible');

      // Check transfer action
      cy.contains('Transfer').should('be.visible');
      cy.contains('success').should('be.visible');
      cy.contains('To 0x742d35Cc...4438fAaE • 0.5 ETH').should('be.visible');
      cy.contains('1m ago').should('be.visible');

      // Check swap action
      cy.contains('Swap').should('be.visible');
      cy.contains('pending').should('be.visible');
      cy.contains('100 USDC → USDT').should('be.visible');
      cy.contains('1h ago').should('be.visible');

      // Check bridge action
      cy.contains('Bridge').should('be.visible');
      cy.contains('failed').should('be.visible');
      cy.contains('Ethereum → Polygon • 1 ETH').should('be.visible');
    });

    it('should display empty state when no actions', () => {
      cy.intercept('GET', '**/api/agent/recent-actions', {
        statusCode: 200,
        body: [],
      }).as('getRecentActions');

      cy.wait('@getRecentActions');
      cy.contains('No recent actions').should('be.visible');
    });

    it('should refresh actions on button click', () => {
      cy.intercept('GET', '**/api/agent/recent-actions', {
        statusCode: 200,
        body: [
          {
            id: 'action-new',
            type: 'governance',
            timestamp: Date.now(),
            status: 'success',
            details: {
              to: '0x742d35Cc6634C0532925a3b844Bc454e4438fAaE',
            },
          },
        ],
      }).as('getRecentActions');

      cy.wait('@getRecentActions');

      // Click refresh button
      cy.get('button').contains('Refresh').last().click();
      cy.wait('@getRecentActions');
    });

    it('should handle action icons correctly', () => {
      cy.intercept('GET', '**/api/agent/recent-actions', {
        statusCode: 200,
        body: [
          { id: '1', type: 'transfer', timestamp: Date.now(), status: 'success', details: {} },
          { id: '2', type: 'swap', timestamp: Date.now(), status: 'success', details: {} },
          { id: '3', type: 'bridge', timestamp: Date.now(), status: 'success', details: {} },
          { id: '4', type: 'governance', timestamp: Date.now(), status: 'success', details: {} },
        ],
      }).as('getRecentActions');

      cy.wait('@getRecentActions');

      // Check for action icons
      cy.contains('→').should('be.visible'); // transfer
      cy.contains('⇄').should('be.visible'); // swap
      cy.contains('⇌').should('be.visible'); // bridge
      cy.contains('🗳').should('be.visible'); // governance
    });
  });

  describe('Dashboard Layout', () => {
    it('should display both wallet balance and recent actions', () => {
      cy.intercept('GET', '**/api/agent/balance', {
        statusCode: 200,
        body: {
          network: 'Ethereum',
          address: '0x742d35Cc6634C0532925a3b844Bc454e4438fAaE',
          balance: { eth: { balance: '0', uiAmount: 0 }, tokens: [] },
        },
      }).as('getBalance');

      cy.intercept('GET', '**/api/agent/recent-actions', {
        statusCode: 200,
        body: [],
      }).as('getRecentActions');

      cy.wait(['@getBalance', '@getRecentActions']);

      cy.contains('EVM Plugin Dashboard').should('be.visible');
      cy.contains('Agent ID: test-agent-123').should('be.visible');
      cy.contains('Wallet Balance').should('be.visible');
      cy.contains('Recent Actions').should('be.visible');
    });

    it('should be responsive', () => {
      // Test mobile viewport
      cy.viewport('iphone-x');
      cy.contains('Wallet Balance').should('be.visible');
      cy.contains('Recent Actions').should('be.visible');

      // Test tablet viewport
      cy.viewport('ipad-2');
      cy.contains('Wallet Balance').should('be.visible');
      cy.contains('Recent Actions').should('be.visible');

      // Test desktop viewport
      cy.viewport(1920, 1080);
      cy.contains('Wallet Balance').should('be.visible');
      cy.contains('Recent Actions').should('be.visible');
    });
  });
}); 