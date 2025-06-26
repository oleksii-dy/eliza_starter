/// <reference types="cypress" />
/// <reference types="@cypress/react" />
/// <reference types="@testing-library/cypress" />

import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { WalletBalanceDisplay } from '../../../frontend/WalletBalance';
import '../../../frontend/index.css';

describe('WalletBalanceDisplay Component', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: {
          retry: false,
          refetchOnWindowFocus: false,
        },
      },
    });
  });

  const mountComponent = (props: any = {}) => {
    return cy.mount(
      <QueryClientProvider client={queryClient}>
        <WalletBalanceDisplay {...props} />
      </QueryClientProvider>
    );
  };

  describe('Component Rendering', () => {
    it('should show message when no wallet address provided', () => {
      mountComponent();
      cy.contains('No wallet address provided').should('be.visible');
    });

    it('should show loading state initially', () => {
      cy.intercept('GET', '**/api/wallet/balance/*', {
        delay: 1000,
        statusCode: 200,
        body: {
          network: 'mainnet-beta',
          address: 'test-address',
          balance: {
            sol: { balance: '1000000000', uiAmount: 1, decimals: 9 },
            tokens: [],
          },
        },
      }).as('getBalance');

      mountComponent({ walletAddress: 'test-address' });
      cy.contains('Loading wallet balance...').should('be.visible');
    });

    it('should display wallet balance correctly', () => {
      const mockBalance = {
        network: 'mainnet-beta',
        address: 'GDDMwNyyx8uB6zrqwBFHjLLG3TBYk2F8Az4yrQC5RzMp',
        balance: {
          sol: {
            balance: '5000000000',
            uiAmount: 5,
            decimals: 9,
          },
          tokens: [
            {
              address: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
              symbol: 'USDC',
              name: 'USD Coin',
              decimals: 6,
              balance: '1000000',
              uiAmount: 1,
            },
          ],
          totalValueUSD: 255.5,
        },
      };

      cy.intercept('GET', '**/api/wallet/balance/*', {
        statusCode: 200,
        body: mockBalance,
      }).as('getBalance');

      mountComponent({ walletAddress: mockBalance.address });

      cy.wait('@getBalance');

      // Check header
      cy.contains('Wallet Balance').should('be.visible');

      // Check network
      cy.contains('Network:').should('be.visible');
      cy.contains('mainnet-beta').should('be.visible');

      // Check address (truncated)
      cy.contains('Address:').should('be.visible');
      cy.contains('GDDMwNyy...C5RzMp').should('be.visible');

      // Check SOL balance
      cy.contains('SOL Balance').should('be.visible');
      cy.contains('5.0000 SOL').should('be.visible');
      cy.contains('5000000000 lamports').should('be.visible');

      // Check token balances
      cy.contains('Token Balances').should('be.visible');
      cy.contains('USDC').should('be.visible');
      cy.contains('1.0000').should('be.visible');

      // Check total value
      cy.contains('Total Value').should('be.visible');
      cy.contains('$255.50').should('be.visible');
    });

    it('should handle error state', () => {
      cy.intercept('GET', '**/api/wallet/balance/*', {
        statusCode: 500,
        body: { error: 'Internal server error' },
      }).as('getBalanceError');

      mountComponent({ walletAddress: 'invalid-address' });

      cy.wait('@getBalanceError');
      cy.contains('Error loading wallet balance').should('be.visible');
    });
  });

  describe('Agent Balance', () => {
    it('should fetch agent balance when agentId provided', () => {
      const mockAgentBalance = {
        network: 'testnet',
        agentId: 'test-agent-123',
        address: '11111111111111111111111111111111',
        balance: {
          sol: {
            balance: '100000000',
            uiAmount: 0.1,
            decimals: 9,
          },
          tokens: [],
        },
      };

      cy.intercept('GET', '**/api/agent/balance', {
        statusCode: 200,
        body: mockAgentBalance,
      }).as('getAgentBalance');

      mountComponent({ agentId: 'test-agent-123' });

      cy.wait('@getAgentBalance');

      cy.contains('testnet').should('be.visible');
      cy.contains('0.1000 SOL').should('be.visible');
    });
  });

  describe('Refresh Functionality', () => {
    it('should refresh balance when refresh button clicked', () => {
      let callCount = 0;

      cy.intercept('GET', '**/api/wallet/balance/*', (req) => {
        callCount++;
        req.reply({
          statusCode: 200,
          body: {
            network: 'mainnet-beta',
            address: 'test-address',
            balance: {
              sol: {
                balance: String(callCount * 1000000000),
                uiAmount: callCount,
                decimals: 9,
              },
              tokens: [],
            },
          },
        });
      }).as('getBalance');

      mountComponent({ walletAddress: 'test-address' });

      cy.wait('@getBalance');
      cy.contains('1.0000 SOL').should('be.visible');

      cy.contains('Refresh').click();

      cy.wait('@getBalance');
      cy.contains('2.0000 SOL').should('be.visible');
    });

    it('should auto-refresh every 30 seconds', () => {
      cy.clock();

      let callCount = 0;
      cy.intercept('GET', '**/api/wallet/balance/*', (req) => {
        callCount++;
        req.reply({
          statusCode: 200,
          body: {
            network: 'mainnet-beta',
            address: 'test-address',
            balance: {
              sol: {
                balance: String(callCount * 1000000000),
                uiAmount: callCount,
                decimals: 9,
              },
              tokens: [],
            },
          },
        });
      }).as('getBalance');

      mountComponent({ walletAddress: 'test-address' });

      cy.wait('@getBalance');
      cy.contains('1.0000 SOL').should('be.visible');

      // Advance time by 30 seconds
      cy.tick(30000);

      cy.wait('@getBalance');
      cy.contains('2.0000 SOL').should('be.visible');
    });
  });

  describe('Empty States', () => {
    it('should handle wallet with no tokens', () => {
      cy.intercept('GET', '**/api/wallet/balance/*', {
        statusCode: 200,
        body: {
          network: 'mainnet-beta',
          address: 'test-address',
          balance: {
            sol: {
              balance: '0',
              uiAmount: 0,
              decimals: 9,
            },
            tokens: [],
          },
        },
      }).as('getBalance');

      mountComponent({ walletAddress: 'test-address' });

      cy.wait('@getBalance');

      cy.contains('0.0000 SOL').should('be.visible');
      cy.contains('Token Balances').should('not.exist');
    });

    it('should handle wallet with multiple tokens', () => {
      const mockTokens = [
        {
          address: 'token1',
          symbol: 'TOKEN1',
          name: 'Test Token 1',
          decimals: 9,
          balance: '1000000000',
          uiAmount: 1,
        },
        {
          address: 'token2',
          symbol: 'TOKEN2',
          name: 'Test Token 2',
          decimals: 6,
          balance: '2000000',
          uiAmount: 2,
        },
        {
          address: 'token3',
          symbol: 'TOKEN3',
          name: 'Test Token 3',
          decimals: 8,
          balance: '300000000',
          uiAmount: 3,
        },
      ];

      cy.intercept('GET', '**/api/wallet/balance/*', {
        statusCode: 200,
        body: {
          network: 'mainnet-beta',
          address: 'test-address',
          balance: {
            sol: {
              balance: '1000000000',
              uiAmount: 1,
              decimals: 9,
            },
            tokens: mockTokens,
          },
        },
      }).as('getBalance');

      mountComponent({ walletAddress: 'test-address' });

      cy.wait('@getBalance');

      // Check all tokens are displayed
      mockTokens.forEach((token) => {
        cy.contains(token.symbol).should('be.visible');
        cy.contains(`${token.uiAmount}.0000`).should('be.visible');
      });
    });
  });

  describe('Network Handling', () => {
    it('should display different networks correctly', () => {
      const networks = ['mainnet-beta', 'testnet', 'devnet'];

      networks.forEach((network) => {
        cy.intercept('GET', '**/api/wallet/balance/*', {
          statusCode: 200,
          body: {
            network,
            address: 'test-address',
            balance: {
              sol: {
                balance: '1000000000',
                uiAmount: 1,
                decimals: 9,
              },
              tokens: [],
            },
          },
        }).as(`getBalance${network}`);

        mountComponent({ walletAddress: 'test-address' });

        cy.wait(`@getBalance${network}`);
        cy.contains(network).should('be.visible');

        // Clean up for next iteration
        cy.get('body').then(() => {
          queryClient.clear();
        });
      });
    });
  });

  describe('API Base Configuration', () => {
    it('should use custom apiBase when provided', () => {
      const customApiBase = 'https://custom.api.com';

      cy.intercept('GET', `${customApiBase}/api/wallet/balance/*`, {
        statusCode: 200,
        body: {
          network: 'mainnet-beta',
          address: 'test-address',
          balance: {
            sol: {
              balance: '1000000000',
              uiAmount: 1,
              decimals: 9,
            },
            tokens: [],
          },
        },
      }).as('getBalanceCustom');

      mountComponent({
        walletAddress: 'test-address',
        apiBase: customApiBase,
      });

      cy.wait('@getBalanceCustom');
      cy.contains('1.0000 SOL').should('be.visible');
    });
  });
});
