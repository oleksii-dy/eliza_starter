import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  enhancedAuthMiddleware,
  createEnhancedJWT,
  verifySharedJWT,
  getTenantId,
  isLegacyAuth,
} from '../middleware/JWTAuthMiddleware.js';
import type { Request, Response, NextFunction } from 'express';

// Mock Express request/response
const createMockRequest = (
  headers: Record<string, string> = {},
  query: Record<string, string> = {}
): Partial<Request> => ({
  headers,
  query,
  ip: '127.0.0.1',
  method: 'GET',
});

const createMockResponse = (): Partial<Response> => {
  const res: any = {};
  res.status = vi.fn().mockReturnValue(res);
  res.json = vi.fn().mockReturnValue(res);
  res.send = vi.fn().mockReturnValue(res);
  return res;
};

const createMockNext = (): NextFunction => vi.fn();

describe('JWT Middleware Integration Tests', () => {
  let mockReq: any;
  let mockRes: any;
  let mockNext: NextFunction;

  beforeEach(() => {
    // Set test environment
    process.env.SHARED_JWT_SECRET = 'test-integration-secret-for-middleware';
    process.env.JWT_SECRET = 'test-integration-secret-for-middleware';

    mockReq = createMockRequest();
    mockRes = createMockResponse();
    mockNext = createMockNext();
  });

  afterEach(() => {
    delete process.env.SHARED_JWT_SECRET;
    delete process.env.JWT_SECRET;
    delete process.env.ELIZA_SERVER_AUTH_TOKEN;
  });

  describe('JWT Token Creation and Verification', () => {
    it('should create and verify enhanced JWT tokens', async () => {
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
      expect(token.split('.')).toHaveLength(3); // JWT has 3 parts

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

    it('should include proper JWT claims', async () => {
      const payload = {
        sub: 'user-test',
        email: 'claims@test.com',
        name: 'Claims Test',
        organizationId: 'org-test',
        role: 'user',
        tenantId: 'tenant-test',
      };

      const token = await createEnhancedJWT(payload);
      const verified = await verifySharedJWT(token);

      expect(verified?.iss).toBe('elizaos-platform');
      expect(verified?.aud).toBe('elizaos-server');
      expect(verified?.iat).toBeDefined();
      expect(verified?.exp).toBeDefined();
      expect(verified?.exp! > verified?.iat!).toBe(true);
    });
  });

  describe('Enhanced Authentication Middleware', () => {
    it('should authenticate valid JWT in Authorization header', async () => {
      const payload = {
        sub: 'user-auth-test',
        email: 'auth@test.com',
        name: 'Auth Test',
        organizationId: 'org-auth',
        role: 'admin',
        tenantId: 'tenant-auth',
      };

      const token = await createEnhancedJWT(payload);
      mockReq.headers.authorization = `Bearer ${token}`;

      // Handle async middleware directly
      await enhancedAuthMiddleware(mockReq, mockRes, mockNext);

      expect(mockNext).toHaveBeenCalled();
      expect(mockReq.user).toBeDefined();
      expect(mockReq.user.email).toBe(payload.email);
      expect(mockReq.tenantId).toBe(payload.tenantId);
      expect(mockReq.isLegacyAuth).toBe(false);
    });

    it('should authenticate JWT in custom header', async () => {
      const payload = {
        sub: 'user-header-test',
        email: 'header@test.com',
        name: 'Header Test',
        organizationId: 'org-header',
        role: 'user',
        tenantId: 'tenant-header',
      };

      const token = await createEnhancedJWT(payload);
      mockReq.headers['x-jwt-token'] = token;

      await enhancedAuthMiddleware(mockReq, mockRes, mockNext);

      expect(mockNext).toHaveBeenCalled();
      expect(mockReq.user.email).toBe(payload.email);
      expect(mockReq.tenantId).toBe(payload.tenantId);
    });

    it('should authenticate JWT in query parameter', async () => {
      const payload = {
        sub: 'user-query-test',
        email: 'query@test.com',
        name: 'Query Test',
        organizationId: 'org-query',
        role: 'user',
        tenantId: 'tenant-query',
      };

      const token = await createEnhancedJWT(payload);
      mockReq.query.token = token;

      await enhancedAuthMiddleware(mockReq, mockRes, mockNext);

      expect(mockNext).toHaveBeenCalled();
      expect(mockReq.user.email).toBe(payload.email);
      expect(mockReq.tenantId).toBe(payload.tenantId);
    });

    it('should reject invalid JWT tokens', async () => {
      mockReq.headers.authorization = 'Bearer invalid.jwt.token';

      await enhancedAuthMiddleware(mockReq, mockRes, mockNext);

      expect(mockNext).not.toHaveBeenCalled();
      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: 'Invalid JWT token',
        })
      );
    });

    it('should handle missing tokens gracefully when no legacy auth', async () => {
      // No authorization header, no legacy token
      await enhancedAuthMiddleware(mockReq, mockRes, mockNext);

      expect(mockNext).toHaveBeenCalled(); // Should proceed with legacy behavior when no token configured
      expect(mockReq.isLegacyAuth).toBe(true);
    });

    it('should allow OPTIONS requests without authentication', async () => {
      mockReq.method = 'OPTIONS';

      await enhancedAuthMiddleware(mockReq, mockRes, mockNext);

      expect(mockNext).toHaveBeenCalled();
      expect(mockRes.status).not.toHaveBeenCalled();
    });
  });

  describe('Legacy API Key Fallback', () => {
    beforeEach(() => {
      process.env.ELIZA_SERVER_AUTH_TOKEN = 'test-legacy-key';
    });

    it('should authenticate with legacy API key when no JWT provided', async () => {
      mockReq.headers['x-api-key'] = 'test-legacy-key';

      await enhancedAuthMiddleware(mockReq, mockRes, mockNext);

      expect(mockNext).toHaveBeenCalled();
      expect(mockReq.isLegacyAuth).toBe(true);
      expect(mockReq.user).toBeUndefined();
      expect(mockReq.tenantId).toBeUndefined();
    });

    it('should reject invalid legacy API keys', async () => {
      mockReq.headers['x-api-key'] = 'invalid-key';

      await enhancedAuthMiddleware(mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should prefer JWT over legacy API key when both provided', async () => {
      const payload = {
        sub: 'user-precedence-test',
        email: 'precedence@test.com',
        name: 'Precedence Test',
        organizationId: 'org-precedence',
        role: 'admin',
        tenantId: 'tenant-precedence',
      };

      const token = await createEnhancedJWT(payload);
      mockReq.headers.authorization = `Bearer ${token}`;
      mockReq.headers['x-api-key'] = 'test-legacy-key';

      await enhancedAuthMiddleware(mockReq, mockRes, mockNext);

      expect(mockNext).toHaveBeenCalled();
      expect(mockReq.user.email).toBe(payload.email);
      expect(mockReq.isLegacyAuth).toBe(false);
    });
  });

  describe('Helper Functions', () => {
    it('should extract tenant ID from JWT authenticated request', () => {
      mockReq.tenantId = 'tenant-helper-test';

      const tenantId = getTenantId(mockReq);
      expect(tenantId).toBe('tenant-helper-test');
    });

    it('should return null tenant ID for legacy requests', () => {
      // No tenantId set (legacy auth)
      const tenantId = getTenantId(mockReq);
      expect(tenantId).toBeNull();
    });

    it('should detect legacy authentication', () => {
      mockReq.isLegacyAuth = true;
      expect(isLegacyAuth(mockReq)).toBe(true);

      mockReq.isLegacyAuth = false;
      expect(isLegacyAuth(mockReq)).toBe(false);

      delete mockReq.isLegacyAuth;
      expect(isLegacyAuth(mockReq)).toBe(false);
    });
  });

  describe('Error Handling', () => {
    it('should handle malformed Authorization headers', async () => {
      mockReq.headers.authorization = 'Malformed header';

      await enhancedAuthMiddleware(mockReq, mockRes, mockNext);

      // Should proceed with legacy auth when no server token configured
      expect(mockNext).toHaveBeenCalled();
      expect(mockReq.isLegacyAuth).toBe(true);
      expect(mockReq.user).toBeUndefined();
    });

    it('should handle Bearer token without actual token', async () => {
      mockReq.headers.authorization = 'Bearer ';

      await enhancedAuthMiddleware(mockReq, mockRes, mockNext);

      // Should proceed with legacy auth when no server token configured
      expect(mockNext).toHaveBeenCalled();
      expect(mockReq.isLegacyAuth).toBe(true);
      expect(mockReq.user).toBeUndefined();
    });

    it('should handle JWT verification errors gracefully', async () => {
      // Create a token with wrong secret, then change secret
      process.env.SHARED_JWT_SECRET = 'wrong-secret';
      const payload = {
        sub: 'user-error-test',
        email: 'error@test.com',
        name: 'Error Test',
        organizationId: 'org-error',
        role: 'user',
        tenantId: 'tenant-error',
      };

      const token = await createEnhancedJWT(payload);

      // Change secret to make verification fail
      process.env.SHARED_JWT_SECRET = 'different-secret';
      process.env.JWT_SECRET = 'different-secret';

      mockReq.headers.authorization = `Bearer ${token}`;

      await enhancedAuthMiddleware(mockReq, mockRes, mockNext);

      expect(mockNext).not.toHaveBeenCalled();
      expect(mockRes.status).toHaveBeenCalledWith(401);
    });
  });
});
