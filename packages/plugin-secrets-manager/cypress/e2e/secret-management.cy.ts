import { defineConfig } from 'cypress';

describe('Secret Management System E2E Tests', () => {
  const testUserId = Cypress.env('TEST_USER_ID') || 'test-user-123';
  const testAgentId = Cypress.env('TEST_AGENT_ID') || 'test-agent-456';
  const testRoomId = Cypress.env('TEST_ROOM_ID') || 'test-room-789';
  const ngrokDomain = Cypress.env('NGROK_DOMAIN') || 'test-domain.ngrok-free.app';

  beforeEach(() => {
    // Clear any previous state
    cy.clearAllSessionStorage();
    cy.clearAllCookies();
    cy.clearAllLocalStorage();
  });

  describe('NgrokService Integration', () => {
    it('should start ngrok tunnel successfully', () => {
      cy.request('POST', '/api/ngrok/start', {
        port: 3000,
        agentId: testAgentId
      }).then((response) => {
        expect(response.status).to.eq(200);
        expect(response.body).to.have.property('url');
        expect(response.body.url).to.include('ngrok');
      });
    });

    it('should verify tunnel status', () => {
      cy.request('GET', '/api/ngrok/status', {
        agentId: testAgentId
      }).then((response) => {
        expect(response.status).to.eq(200);
        expect(response.body).to.have.property('active');
        expect(response.body).to.have.property('url');
      });
    });

    it('should stop ngrok tunnel gracefully', () => {
      cy.request('POST', '/api/ngrok/stop', {
        agentId: testAgentId
      }).then((response) => {
        expect(response.status).to.eq(200);
        expect(response.body).to.have.property('message');
      });
    });
  });

  describe('Secret Form Service', () => {
    let portalUrl: string;
    let sessionId: string;

    it('should create secure portal with ngrok tunnel', () => {
      const secretRequest = {
        secrets: [
          {
            key: 'OPENAI_API_KEY',
            config: {
              type: 'credential',
              description: 'OpenAI API key for AI model access',
              required: true,
              encrypted: true
            }
          }
        ],
        title: 'OpenAI Configuration',
        description: 'Please provide your OpenAI API key securely',
        mode: 'requester',
        expiresIn: 300000, // 5 minutes
        maxSubmissions: 1,
        requireVerification: false
      };

      cy.request('POST', '/api/secrets/form/create', {
        agentId: testAgentId,
        request: secretRequest,
        context: {
          level: 'user',
          userId: testUserId,
          agentId: testAgentId
        }
      }).then((response) => {
        expect(response.status).to.eq(200);
        expect(response.body).to.have.property('url');
        expect(response.body).to.have.property('sessionId');
        expect(response.body.url).to.include(ngrokDomain);

        portalUrl = response.body.url;
        sessionId = response.body.sessionId;
      });
    });

    it('should access secure portal via ngrok URL', () => {
      cy.visit(portalUrl);

      // Verify portal loads correctly
      cy.get('h1').should('contain', 'OpenAI Configuration');
      cy.get('form').should('exist');
      cy.get('input[name="OPENAI_API_KEY"]').should('exist');
      cy.get('button[type="submit"]').should('contain', 'Submit Securely');
    });

    it('should submit secrets through secure form', () => {
      cy.visit(portalUrl);

      // Fill out the form
      cy.get('input[name="OPENAI_API_KEY"]').type('sk-test-key-123456789');

      // Submit the form
      cy.get('button[type="submit"]').click();

      // Verify success message
      cy.get('.success-message').should('contain', 'Information submitted successfully');
      cy.url().should('include', '/success');
    });
  });

  describe('OAuth Verification Flow', () => {
    it('should create OAuth challenge for Google', () => {
      cy.request('POST', '/api/secrets/oauth/challenge', {
        userId: testUserId,
        provider: 'google'
      }).then((response) => {
        expect(response.status).to.eq(200);
        expect(response.body).to.have.property('challengeId');
        expect(response.body).to.have.property('authUrl');
        expect(response.body.authUrl).to.include('accounts.google.com');
      });
    });

    it('should create OAuth challenge for GitHub', () => {
      cy.request('POST', '/api/secrets/oauth/challenge', {
        userId: testUserId,
        provider: 'github'
      }).then((response) => {
        expect(response.status).to.eq(200);
        expect(response.body).to.have.property('challengeId');
        expect(response.body).to.have.property('authUrl');
        expect(response.body.authUrl).to.include('github.com');
      });
    });

    it('should handle OAuth callback with valid state', () => {
      // Note: This would require mocking OAuth provider responses in a real test
      const mockCallback = {
        provider: 'google',
        code: 'mock-auth-code',
        state: 'mock-state-value'
      };

      cy.request({
        method: 'GET',
        url: `/oauth/callback/google?code=${mockCallback.code}&state=${mockCallback.state}`,
        failOnStatusCode: false
      }).then((response) => {
        // In a real scenario, this would redirect to success page
        expect(response.status).to.be.oneOf([200, 302]);
      });
    });
  });

  describe('Channel Callback Service', () => {
    let requestId: string;

    it('should create secret request via channel callback', () => {
      const secretRequest = {
        userId: testUserId,
        secretKeys: ['DISCORD_TOKEN', 'GITHUB_TOKEN'],
        context: {
          level: 'user',
          userId: testUserId,
          agentId: testAgentId
        },
        channel: {
          type: 'memory',
          roomId: testRoomId,
          userId: testUserId
        },
        options: {
          title: 'Multi-Service Configuration',
          description: 'Please provide Discord and GitHub tokens',
          requireVerification: true,
          verificationMethods: ['oauth'],
          expiresIn: 600000 // 10 minutes
        }
      };

      cy.request('POST', '/api/secrets/request', {
        agentId: testAgentId,
        request: secretRequest
      }).then((response) => {
        expect(response.status).to.eq(200);
        expect(response.body).to.have.property('requestId');
        expect(response.body).to.have.property('status', 'pending');

        requestId = response.body.requestId;
      });
    });

    it('should handle user acceptance of secret request', () => {
      cy.request('POST', `/api/secrets/request/${requestId}/response`, {
        userId: testUserId,
        action: 'accept'
      }).then((response) => {
        expect(response.status).to.eq(200);
        expect(response.body).to.have.property('success', true);
        expect(response.body).to.have.property('portalUrl');
        expect(response.body.portalUrl).to.include(ngrokDomain);
      });
    });

    it('should track request analytics', () => {
      cy.request('GET', `/api/secrets/analytics/requests?agentId=${testAgentId}`).then((response) => {
        expect(response.status).to.eq(200);
        expect(response.body).to.have.property('total');
        expect(response.body).to.have.property('pending');
        expect(response.body).to.have.property('completed');
        expect(response.body.total).to.be.greaterThan(0);
      });
    });
  });

  describe('Request Tracking Service', () => {
    it('should create batch request for multiple users', () => {
      const batchRequest = {
        userIds: [testUserId, 'user-2', 'user-3'],
        secretKeys: ['API_KEY', 'SECRET_TOKEN'],
        context: {
          level: 'world',
          agentId: testAgentId
        },
        channel: {
          type: 'memory',
          roomId: testRoomId
        },
        options: {
          batchMode: 'parallel',
          title: 'Batch Configuration Setup',
          description: 'Configure API keys for multiple users'
        }
      };

      cy.request('POST', '/api/secrets/batch-request', {
        agentId: testAgentId,
        request: batchRequest
      }).then((response) => {
        expect(response.status).to.eq(200);
        expect(response.body).to.have.property('batchId');
        expect(response.body).to.have.property('requestIds');
        expect(response.body.requestIds).to.have.length(3);
      });
    });

    it('should provide plugin dependency insights', () => {
      cy.request('GET', `/api/secrets/insights/dependencies?agentId=${testAgentId}`).then((response) => {
        expect(response.status).to.eq(200);
        expect(response.body).to.have.property('missingSecrets');
        expect(response.body).to.have.property('pluginRequirements');
        expect(response.body).to.have.property('recommendations');
      });
    });

    it('should generate comprehensive analytics report', () => {
      cy.request('GET', `/api/secrets/analytics/comprehensive?agentId=${testAgentId}`).then((response) => {
        expect(response.status).to.eq(200);
        expect(response.body).to.have.property('summary');
        expect(response.body).to.have.property('trends');
        expect(response.body).to.have.property('userBehavior');
        expect(response.body).to.have.property('securityMetrics');
      });
    });
  });

  describe('Agent Action Integration', () => {
    it('should trigger secret request via agent message', () => {
      const agentMessage = {
        entityId: testUserId,
        agentId: testAgentId,
        roomId: testRoomId,
        content: {
          text: 'I need to set up my OpenAI API key',
          source: 'user'
        }
      };

      cy.request('POST', '/api/agents/message', {
        agentId: testAgentId,
        message: agentMessage
      }).then((response) => {
        expect(response.status).to.eq(200);
        // The agent should recognize this as a secret request and create a secure portal
      });
    });

    it('should handle complex multi-service request', () => {
      const complexMessage = {
        entityId: testUserId,
        agentId: testAgentId,
        roomId: testRoomId,
        content: {
          text: 'The bot needs my Discord token, GitHub token, and database configuration to work properly',
          source: 'user'
        }
      };

      cy.request('POST', '/api/agents/message', {
        agentId: testAgentId,
        message: complexMessage
      }).then((response) => {
        expect(response.status).to.eq(200);
        // Should trigger verification due to multiple sensitive tokens
      });
    });
  });

  describe('Security and Error Handling', () => {
    it('should reject invalid session access', () => {
      const invalidUrl = `https://${ngrokDomain}/secrets/invalid-session-id`;

      cy.request({
        url: invalidUrl,
        failOnStatusCode: false
      }).then((response) => {
        expect(response.status).to.eq(404);
      });
    });

    it('should handle expired requests gracefully', () => {
      // Create a request with very short expiry
      const shortRequest = {
        secrets: [{ key: 'TEST_KEY', config: { type: 'secret' } }],
        title: 'Short Test',
        mode: 'requester',
        expiresIn: 1000 // 1 second
      };

      cy.request('POST', '/api/secrets/form/create', {
        agentId: testAgentId,
        request: shortRequest,
        context: { level: 'user', userId: testUserId }
      }).then((response) => {
        const portalUrl = response.body.url;

        // Wait for expiry
        cy.wait(2000);

        // Try to access expired portal
        cy.request({
          url: portalUrl,
          failOnStatusCode: false
        }).then((expiredResponse) => {
          expect(expiredResponse.status).to.eq(410); // Gone
        });
      });
    });

    it('should enforce rate limits on tunnel creation', () => {
      // Rapid tunnel creation attempts
      const requests = Array.from({ length: 5 }, (_, i) =>
        cy.request({
          method: 'POST',
          url: '/api/ngrok/start',
          body: { port: 3000 + i, agentId: testAgentId },
          failOnStatusCode: false
        })
      );

      // Some should be rate limited
      cy.wrap(requests).then((responses: any[]) => {
        const rateLimited = responses.some(r => r.status === 429);
        expect(rateLimited).to.be.true;
      });
    });

    it('should validate CSRF protection on forms', () => {
      // Try to submit form without CSRF token
      cy.request({
        method: 'POST',
        url: '/api/secrets/form/submit',
        body: { data: 'test' },
        failOnStatusCode: false
      }).then((response) => {
        expect(response.status).to.eq(403); // Forbidden
      });
    });
  });

  describe('Performance and Load Testing', () => {
    it('should handle concurrent portal creation', () => {
      const concurrentRequests = Array.from({ length: 10 }, (_, i) => ({
        secrets: [{ key: `TEST_KEY_${i}`, config: { type: 'secret' } }],
        title: `Concurrent Test ${i}`,
        mode: 'requester'
      }));

      const promises = concurrentRequests.map(request =>
        cy.request('POST', '/api/secrets/form/create', {
          agentId: testAgentId,
          request,
          context: { level: 'user', userId: `user-${Math.random()}` }
        })
      );

      cy.wrap(Promise.all(promises)).then((responses: any[]) => {
        responses.forEach(response => {
          expect(response.status).to.eq(200);
          expect(response.body).to.have.property('url');
        });
      });
    });

    it('should maintain performance under load', () => {
      const startTime = Date.now();

      cy.request('POST', '/api/secrets/form/create', {
        agentId: testAgentId,
        request: {
          secrets: [{ key: 'PERF_TEST', config: { type: 'secret' } }],
          title: 'Performance Test',
          mode: 'requester'
        },
        context: { level: 'user', userId: testUserId }
      }).then((response) => {
        const endTime = Date.now();
        const duration = endTime - startTime;

        expect(response.status).to.eq(200);
        expect(duration).to.be.lessThan(5000); // Should complete within 5 seconds
      });
    });
  });

  describe('Integration Cleanup', () => {
    it('should cleanup test resources', () => {
      // Stop any running tunnels
      cy.request({
        method: 'POST',
        url: '/api/ngrok/stop',
        body: { agentId: testAgentId },
        failOnStatusCode: false
      });

      // Clear test data
      cy.request({
        method: 'DELETE',
        url: `/api/secrets/test-cleanup?agentId=${testAgentId}`,
        failOnStatusCode: false
      });
    });
  });
});
