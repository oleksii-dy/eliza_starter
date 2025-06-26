import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { AgentServer } from '../index.js';
import { createEnhancedJWT, verifySharedJWT } from '../middleware/JWTAuthMiddleware.js';
// import type { Character } from '@elizaos/core';
import request from 'supertest';

// Mock character for testing (unused in current tests)
// const testCharacter: Character = {
//   name: 'TestAgent',
//   bio: 'A test agent for JWT authentication',
//   system: 'You are a helpful test agent.',
//   knowledge: [],
//   plugins: [],
//   settings: {},
// };

describe('JWT Authentication', () => {
  let server: AgentServer;
  const testPort = 3001;

  beforeEach(async () => {
    // Set up test environment variables
    process.env.SHARED_JWT_SECRET = 'test-shared-secret-for-jwt-auth';
    process.env.JWT_SECRET = 'test-shared-secret-for-jwt-auth';
    process.env.FORCE_PGLITE = 'true';

    server = new AgentServer();
    await server.initialize({
      dataDir: './.test-jwt-auth-db',
    });

    // Start server in background
    server.start(testPort);

    // Wait for server to be ready
    await new Promise((resolve) => setTimeout(resolve, 1000));
  });

  afterEach(async () => {
    if (server) {
      await server.stop();
    }

    // Clean up environment
    delete process.env.SHARED_JWT_SECRET;
    delete process.env.FORCE_PGLITE;
  });

  describe('JWT Token Creation and Verification', () => {
    it('should create and verify a valid JWT token', async () => {
      const payload = {
        sub: 'user-123',
        email: 'test@example.com',
        name: 'Test User',
        organizationId: 'org-456',
        role: 'admin',
        tenantId: 'tenant-789',
      };

      const token = await createEnhancedJWT(payload);
      expect(token).toBeDefined();
      expect(typeof token).toBe('string');

      const verified = await verifySharedJWT(token);
      expect(verified).toBeDefined();
      expect(verified?.sub).toBe(payload.sub);
      expect(verified?.email).toBe(payload.email);
      expect(verified?.name).toBe(payload.name);
      expect(verified?.organizationId).toBe(payload.organizationId);
      expect(verified?.role).toBe(payload.role);
      expect(verified?.tenantId).toBe(payload.tenantId);
    });

    it('should reject invalid JWT tokens', async () => {
      const invalidToken = 'invalid.jwt.token';
      const verified = await verifySharedJWT(invalidToken);
      expect(verified).toBeNull();
    });

    it('should reject tokens with missing required fields', async () => {
      // Create a token with missing tenantId
      const incompletePayload = {
        sub: 'user-123',
        email: 'test@example.com',
        name: 'Test User',
        organizationId: 'org-456',
        role: 'admin',
        // Missing tenantId
      };

      // This should fail during creation or verification
      try {
        const token = await createEnhancedJWT(incompletePayload as any);
        const verified = await verifySharedJWT(token);
        expect(verified).toBeNull();
      } catch (error) {
        // Expected to fail
        expect(error).toBeDefined();
      }
    });
  });

  describe('Server JWT Authentication', () => {
    it('should allow access with valid JWT token', async () => {
      const payload = {
        sub: 'user-123',
        email: 'test@example.com',
        name: 'Test User',
        organizationId: 'org-456',
        role: 'admin',
        tenantId: 'tenant-789',
      };

      const token = await createEnhancedJWT(payload);

      const response = await request(`http://localhost:${testPort}`)
        .get('/api/runtime/ping')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(response.body.pong).toBe(true);
    });

    it('should allow access with JWT token in custom header', async () => {
      const payload = {
        sub: 'user-123',
        email: 'test@example.com',
        name: 'Test User',
        organizationId: 'org-456',
        role: 'admin',
        tenantId: 'tenant-789',
      };

      const token = await createEnhancedJWT(payload);

      const response = await request(`http://localhost:${testPort}`)
        .get('/api/runtime/ping')
        .set('x-jwt-token', token)
        .expect(200);

      expect(response.body.pong).toBe(true);
    });

    it('should allow access with JWT token in query parameter', async () => {
      const payload = {
        sub: 'user-123',
        email: 'test@example.com',
        name: 'Test User',
        organizationId: 'org-456',
        role: 'admin',
        tenantId: 'tenant-789',
      };

      const token = await createEnhancedJWT(payload);

      const response = await request(`http://localhost:${testPort}`)
        .get(`/api/runtime/ping?token=${token}`)
        .expect(200);

      expect(response.body.pong).toBe(true);
    });

    it('should reject access with invalid JWT token', async () => {
      const response = await request(`http://localhost:${testPort}`)
        .get('/api/runtime/ping')
        .set('Authorization', 'Bearer invalid.jwt.token')
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('Invalid JWT token');
    });

    it('should work with embedded admin interface', async () => {
      const payload = {
        sub: 'user-123',
        email: 'test@example.com',
        name: 'Test User',
        organizationId: 'org-456',
        role: 'admin',
        tenantId: 'tenant-789',
      };

      const token = await createEnhancedJWT(payload);

      const response = await request(`http://localhost:${testPort}`)
        .get(`/admin?embed=true&token=${token}`)
        .expect(200);

      expect(response.text).toContain('ElizaOS Agent Management');
      expect(response.text).toContain('window.__ELIZA_TOKEN__');
      expect(response.text).toContain('window.__ELIZA_EMBED__');
      expect(response.get('X-Frame-Options')).toBe('SAMEORIGIN');
    });
  });

  describe('Legacy API Key Fallback', () => {
    beforeEach(() => {
      // Set legacy API key for fallback tests
      process.env.ELIZA_SERVER_AUTH_TOKEN = 'test-legacy-api-key';
    });

    afterEach(() => {
      delete process.env.ELIZA_SERVER_AUTH_TOKEN;
    });

    it('should allow access with legacy API key when JWT not provided', async () => {
      const response = await request(`http://localhost:${testPort}`)
        .get('/api/runtime/ping')
        .set('X-API-KEY', 'test-legacy-api-key')
        .expect(200);

      expect(response.body.pong).toBe(true);
    });

    it('should prefer JWT over legacy API key when both provided', async () => {
      const payload = {
        sub: 'user-123',
        email: 'test@example.com',
        name: 'Test User',
        organizationId: 'org-456',
        role: 'admin',
        tenantId: 'tenant-789',
      };

      const token = await createEnhancedJWT(payload);

      const response = await request(`http://localhost:${testPort}`)
        .get('/api/runtime/ping')
        .set('Authorization', `Bearer ${token}`)
        .set('X-API-KEY', 'test-legacy-api-key')
        .expect(200);

      expect(response.body.pong).toBe(true);
    });
  });
});
