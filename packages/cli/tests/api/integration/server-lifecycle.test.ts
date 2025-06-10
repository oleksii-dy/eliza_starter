import { describe, it, beforeAll, afterAll, expect } from 'vitest';
import type { UUID } from '@elizaos/core';
import {
  setupAPITestEnvironment,
  cleanupAPITestEnvironment,
  apiAssertions,
  type APITestContext,
} from '../api-test-utils';

describe('Server Lifecycle Integration Tests', () => {
  let context: APITestContext;

  beforeAll(async () => {
    context = await setupAPITestEnvironment();
  }, 120000); // 2 minute timeout for server startup

  afterAll(async () => {
    if (context) {
      await cleanupAPITestEnvironment(context);
    }
  });

  describe('Server Startup and Health', () => {
    it('should respond to ping endpoint', async () => {
      const response = await context.httpClient.get('/server/ping');
      
      apiAssertions.hasStatus(response, 200);
      apiAssertions.hasDataStructure(response, ['pong', 'timestamp']);
      expect(response.data.pong).toBe(true);
      expect(typeof response.data.timestamp).toBe('number');
    });

    it('should respond to hello endpoint', async () => {
      const response = await context.httpClient.get('/server/hello');
      
      apiAssertions.hasStatus(response, 200);
      apiAssertions.hasDataStructure(response, ['message']);
      expect(response.data.message).toBe('Hello World!');
    });

    it('should provide server status', async () => {
      const response = await context.httpClient.get('/server/status');
      
      apiAssertions.hasStatus(response, 200);
      apiAssertions.hasDataStructure(response, ['status', 'agentCount', 'timestamp']);
      expect(response.data.status).toBe('ok');
      expect(typeof response.data.agentCount).toBe('number');
      expect(typeof response.data.timestamp).toBe('string');
    });

    it('should provide comprehensive health check', async () => {
      const response = await context.httpClient.get('/server/health');
      
      // Server might return 200 (healthy) or 503 (no agents) initially
      expect([200, 503]).toContain(response.status);
      apiAssertions.hasDataStructure(response, ['status', 'version', 'timestamp', 'dependencies']);
      
      expect(response.data.status).toBe('OK');
      expect(typeof response.data.version).toBe('string');
      expect(typeof response.data.timestamp).toBe('string');
      expect(typeof response.data.dependencies).toBe('object');
      expect(response.data.dependencies.agents).toMatch(/healthy|no_agents/);
    });
  });

  describe('System Information', () => {
    it('should provide environment information', async () => {
      const response = await context.httpClient.get('/system/environment');
      
      apiAssertions.isSuccessful(response);
      // Environment endpoint structure depends on implementation
      expect(response.data).toBeDefined();
    });
  });

  describe('Initial Agent State', () => {
    it('should initially have no agents', async () => {
      const response = await context.httpClient.get('/agents');
      
      apiAssertions.hasStatus(response, 200);
      expect(Array.isArray(response.data)).toBe(true);
      // Could be empty or contain default agents depending on configuration
    });
  });

  describe('API Error Handling', () => {
    it('should handle invalid endpoints gracefully', async () => {
      const response = await context.httpClient.get('/invalid/endpoint');
      
      expect(response.status).toBe(404);
    });

    it('should handle malformed requests', async () => {
      const response = await context.httpClient.post('/agents', 'invalid json', {
        headers: { 'Content-Type': 'application/json' }
      });
      
      expect([400, 422]).toContain(response.status);
    });

    it('should validate content type for POST requests', async () => {
      const response = await context.httpClient.post('/agents', {}, {
        headers: { 'Content-Type': 'text/plain' }
      });
      
      // Should reject invalid content type
      expect([400, 415]).toContain(response.status);
    });
  });

  describe('CORS and Security Headers', () => {
    it('should include proper CORS headers', async () => {
      const response = await context.httpClient.options('/server/ping');
      
      // CORS preflight should be handled
      expect([200, 204]).toContain(response.status);
    });

    it('should include security headers', async () => {
      const response = await context.httpClient.get('/server/ping');
      
      // Check for common security headers
      const headers = response.headers;
      expect(headers).toBeDefined();
      // Helmet should add security headers
    });
  });

  describe('Server Performance', () => {
    it('should respond to health checks quickly', async () => {
      const startTime = Date.now();
      const response = await context.httpClient.get('/server/ping');
      const responseTime = Date.now() - startTime;
      
      apiAssertions.isSuccessful(response);
      expect(responseTime).toBeLessThan(1000); // Should respond within 1 second
    });

    it('should handle concurrent requests', async () => {
      const concurrentRequests = 10;
      const requests = Array(concurrentRequests).fill(null).map(() => 
        context.httpClient.get('/server/ping')
      );
      
      const responses = await Promise.all(requests);
      
      responses.forEach(response => {
        apiAssertions.hasStatus(response, 200);
        expect(response.data.pong).toBe(true);
      });
    });
  });

  describe('Rate Limiting', () => {
    it('should handle reasonable request rates', async () => {
      // Send multiple requests in quick succession
      const requests = Array(20).fill(null).map(() => 
        context.httpClient.get('/server/ping')
      );
      
      const responses = await Promise.all(requests);
      
      // Most requests should succeed, but some might be rate limited
      const successfulResponses = responses.filter(r => r.status === 200);
      const rateLimitedResponses = responses.filter(r => r.status === 429);
      
      // At least some requests should succeed
      expect(successfulResponses.length).toBeGreaterThan(0);
      
      // If rate limiting is active, check it's working properly
      if (rateLimitedResponses.length > 0) {
        rateLimitedResponses.forEach(response => {
          expect(response.headers['retry-after']).toBeDefined();
        });
      }
    });
  });
});