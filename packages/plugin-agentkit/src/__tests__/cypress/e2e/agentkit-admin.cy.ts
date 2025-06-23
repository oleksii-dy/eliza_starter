describe('AgentKit Admin Panel', () => {
    const agentId = Cypress.env('AGENT_IDS')?.split(',')[0] || 'test-agent';

    beforeEach(() => {
        // Intercept API calls
        cy.intercept('GET', '/api/agentkit/config', {
            statusCode: 200,
            body: {
                serviceReady: true,
                network: 'base-mainnet',
                hasApiKey: true,
                hasPrivateKey: true,
            },
        }).as('getConfig');

        cy.intercept('GET', '/api/agentkit/wallet', {
            statusCode: 200,
            body: {
                address: '0x1234567890123456789012345678901234567890',
                balance: {
                    ETH: '1.5',
                    USDC: '1000',
                },
                network: 'base-mainnet',
            },
        }).as('getWallet');

        cy.intercept('GET', '/api/agentkit/actions', {
            statusCode: 200,
            body: [
                {
                    name: 'GET_BALANCE',
                    description: 'Get wallet balance',
                },
                {
                    name: 'TRANSFER',
                    description: 'Transfer tokens',
                },
                {
                    name: 'SWAP',
                    description: 'Swap tokens',
                },
            ],
        }).as('getActions');
    });

    it('should render the admin panel', () => {
        cy.visit(`/api/agents/${agentId}/plugins/agentkit/admin`);

        // Wait for the panel to load
        cy.contains('AgentKit Admin Panel').should('be.visible');
        
        // Check for loading state
        cy.contains('Loading AgentKit admin panel...').should('be.visible');
        
        // Wait for API calls
        cy.wait(['@getConfig', '@getWallet', '@getActions']);
        
        // Verify wallet section
        cy.contains('Wallet Information').should('be.visible');
        cy.contains('0x1234567890123456789012345678901234567890').should('be.visible');
        cy.contains('ETH: 1.5').should('be.visible');
        cy.contains('USDC: 1000').should('be.visible');
        
        // Verify actions section
        cy.contains('Available Actions').should('be.visible');
        cy.contains('GET_BALANCE').should('be.visible');
        cy.contains('TRANSFER').should('be.visible');
        cy.contains('SWAP').should('be.visible');
    });

    it('should handle action execution', () => {
        cy.visit(`/api/agents/${agentId}/plugins/agentkit/admin`);
        
        cy.wait(['@getConfig', '@getWallet', '@getActions']);
        
        // Click on transfer action
        cy.contains('TRANSFER').parent().parent().click();
        
        // Modal should appear
        cy.contains('Configure TRANSFER').should('be.visible');
        
        // Fill in transfer details
        cy.get('input[placeholder="0x..."]').type('0x742d35Cc6634C0532925a3b844Bc9e7595f6FD70');
        cy.get('input[placeholder="0.0"]').type('0.1');
        cy.get('select').select('ETH');
        
        // Intercept execute call
        cy.intercept('POST', '/api/agentkit/execute', {
            statusCode: 200,
            body: {
                success: true,
                result: {
                    transactionHash: '0xabc123...',
                },
                action: 'TRANSFER',
                timestamp: new Date().toISOString(),
            },
        }).as('executeAction');
        
        // Execute action
        cy.contains('button', 'Execute').last().click();
        
        // Wait for execution
        cy.wait('@executeAction');
        
        // Modal should close
        cy.contains('Configure TRANSFER').should('not.exist');
    });

    it('should handle errors gracefully', () => {
        // Simulate service unavailable
        cy.intercept('GET', '/api/agentkit/wallet', {
            statusCode: 503,
            body: {
                error: 'AgentKit service not available',
            },
        }).as('getWalletError');

        cy.visit(`/api/agents/${agentId}/plugins/agentkit/admin`);
        
        cy.wait('@getWalletError');
        
        // Error message should be displayed
        cy.contains('Failed to load wallet information').should('be.visible');
    });

    it('should refresh wallet info after action', () => {
        cy.visit(`/api/agents/${agentId}/plugins/agentkit/admin`);
        
        cy.wait(['@getConfig', '@getWallet', '@getActions']);
        
        // Intercept second wallet call with updated balance
        cy.intercept('GET', '/api/agentkit/wallet', {
            statusCode: 200,
            body: {
                address: '0x1234567890123456789012345678901234567890',
                balance: {
                    ETH: '1.4', // Updated balance
                    USDC: '1000',
                },
                network: 'base-mainnet',
            },
        }).as('getWalletUpdated');
        
        // Execute a simple action
        cy.contains('GET_BALANCE').parent().contains('Execute').click();
        
        // Wait for wallet refresh
        cy.wait('@getWalletUpdated');
        
        // Check updated balance
        cy.contains('ETH: 1.4').should('be.visible');
    });

    it('should handle action validation errors', () => {
        cy.visit(`/api/agents/${agentId}/plugins/agentkit/admin`);
        
        cy.wait(['@getConfig', '@getWallet', '@getActions']);
        
        // Intercept execute call with validation error
        cy.intercept('POST', '/api/agentkit/execute', {
            statusCode: 400,
            body: {
                error: 'Action validation failed',
                message: 'Insufficient balance',
            },
        }).as('executeError');
        
        // Try to execute an action
        cy.contains('TRANSFER').parent().contains('Execute').click();
        
        cy.wait('@executeError');
        
        // Error should be displayed
        cy.contains('Insufficient balance').should('be.visible');
    });

    it('should display action status indicators', () => {
        cy.visit(`/api/agents/${agentId}/plugins/agentkit/admin`);
        
        cy.wait(['@getConfig', '@getWallet', '@getActions']);
        
        // Intercept with slow response
        cy.intercept('POST', '/api/agentkit/execute', {
            delay: 2000,
            statusCode: 200,
            body: {
                success: true,
                result: {},
                action: 'GET_BALANCE',
                timestamp: new Date().toISOString(),
            },
        }).as('slowExecute');
        
        // Execute action
        cy.contains('GET_BALANCE').parent().contains('Execute').click();
        
        // Should show executing state
        cy.contains('Executing...').should('be.visible');
        
        // Wait for completion
        cy.wait('@slowExecute');
        
        // Should show Execute again
        cy.contains('GET_BALANCE').parent().contains('Execute').should('be.visible');
    });

    it('should handle multiple actions in sequence', () => {
        cy.visit(`/api/agents/${agentId}/plugins/agentkit/admin`);
        
        cy.wait(['@getConfig', '@getWallet', '@getActions']);
        
        let executionCount = 0;
        
        // Intercept all executions
        cy.intercept('POST', '/api/agentkit/execute', (req) => {
            executionCount++;
            req.reply({
                statusCode: 200,
                body: {
                    success: true,
                    result: { count: executionCount },
                    action: req.body.action,
                    timestamp: new Date().toISOString(),
                },
            });
        }).as('multiExecute');
        
        // Execute multiple actions
        cy.contains('GET_BALANCE').parent().contains('Execute').click();
        cy.wait('@multiExecute');
        
        cy.contains('SWAP').parent().contains('Execute').click();
        cy.wait('@multiExecute');
        
        // Verify both executed
        cy.get('@multiExecute.all').should('have.length', 2);
    });
}); 