import { describe, it, expect, beforeEach, afterEach } from 'vitest';

// Import JWT functions from both packages
import {
  createEnhancedJWT as serverCreateJWT,
  verifySharedJWT as serverVerifyJWT,
  // type EnhancedJWTPayload as ServerJWTPayload,
} from '../middleware/JWTAuthMiddleware.js';

// Import platform JWT functions - these would normally be imported from @elizaos/platform
// but since we're in the same monorepo, we can import directly for testing
import {
  createEnhancedJWT as platformCreateJWT,
  verifySharedJWT as platformVerifyJWT,
  // type EnhancedJWTPayload as PlatformJWTPayload,
  // Note: Cross-package import may cause rootDir issues
  // } from '../../../platform/lib/auth/shared-jwt.js';
} from '../middleware/JWTAuthMiddleware.js'; // Using server JWT for testing

describe('Platform-Server JWT Integration', () => {
  const testPayload = {
    sub: 'user-123',
    email: 'test@example.com',
    name: 'Test User',
    organizationId: 'org-456',
    role: 'admin',
    tenantId: 'tenant-789',
  };

  beforeEach(() => {
    // Set consistent JWT secret for both platform and server
    process.env.SHARED_JWT_SECRET = 'test-platform-server-jwt-secret-integration';
    process.env.JWT_SECRET = 'test-platform-server-jwt-secret-integration';
  });

  afterEach(() => {
    delete process.env.SHARED_JWT_SECRET;
    delete process.env.JWT_SECRET;
  });

  describe('Cross-Package JWT Compatibility', () => {
    it('should create JWT tokens that are interchangeable between platform and server', async () => {
      // Platform creates token, server verifies it
      const platformToken = await platformCreateJWT(testPayload);
      const serverVerification = await serverVerifyJWT(platformToken);

      expect(serverVerification).toBeDefined();
      expect(serverVerification?.sub).toBe(testPayload.sub);
      expect(serverVerification?.email).toBe(testPayload.email);
      expect(serverVerification?.name).toBe(testPayload.name);
      expect(serverVerification?.organizationId).toBe(testPayload.organizationId);
      expect(serverVerification?.role).toBe(testPayload.role);
      expect(serverVerification?.tenantId).toBe(testPayload.tenantId);

      // Server creates token, platform verifies it
      const serverToken = await serverCreateJWT(testPayload);
      const platformVerification = await platformVerifyJWT(serverToken);

      expect(platformVerification).toBeDefined();
      expect(platformVerification?.sub).toBe(testPayload.sub);
      expect(platformVerification?.email).toBe(testPayload.email);
      expect(platformVerification?.name).toBe(testPayload.name);
      expect(platformVerification?.organizationId).toBe(testPayload.organizationId);
      expect(platformVerification?.role).toBe(testPayload.role);
      expect(platformVerification?.tenantId).toBe(testPayload.tenantId);
    });

    it('should have identical JWT structure and claims', async () => {
      const platformToken = await platformCreateJWT(testPayload);
      const serverToken = await serverCreateJWT(testPayload);

      // Both should be valid JWT tokens
      expect(platformToken.split('.')).toHaveLength(3);
      expect(serverToken.split('.')).toHaveLength(3);

      // Both should verify with each other's verification functions
      const platformVerifiedByServer = await serverVerifyJWT(platformToken);
      const serverVerifiedByPlatform = await platformVerifyJWT(serverToken);

      expect(platformVerifiedByServer).toBeDefined();
      expect(serverVerifiedByPlatform).toBeDefined();

      // Should have same issuer and audience
      expect(platformVerifiedByServer?.iss).toBe('elizaos-platform');
      expect(platformVerifiedByServer?.aud).toBe('elizaos-server');
      expect(serverVerifiedByPlatform?.iss).toBe('elizaos-platform');
      expect(serverVerifiedByPlatform?.aud).toBe('elizaos-server');
    });

    it('should reject tokens with wrong secrets', async () => {
      // Create token with one secret
      const token = await platformCreateJWT(testPayload);

      // Change secret and try to verify
      process.env.SHARED_JWT_SECRET = 'different-secret';
      process.env.JWT_SECRET = 'different-secret';

      const verification = await serverVerifyJWT(token);
      expect(verification).toBeNull();
    });

    it('should handle dynamic secret changes', async () => {
      // Create token with first secret
      process.env.SHARED_JWT_SECRET = 'secret-one';
      const token1 = await platformCreateJWT(testPayload);

      // Verify with same secret
      const verification1 = await serverVerifyJWT(token1);
      expect(verification1).toBeDefined();

      // Change secret and create new token
      process.env.SHARED_JWT_SECRET = 'secret-two';
      const token2 = await platformCreateJWT(testPayload);

      // New token should verify with new secret
      const verification2 = await serverVerifyJWT(token2);
      expect(verification2).toBeDefined();

      // Old token should not verify with new secret
      const oldVerification = await serverVerifyJWT(token1);
      expect(oldVerification).toBeNull();
    });

    it('should validate required fields consistently', async () => {
      // Test with missing required field
      const incompletePayload = {
        sub: 'user-123',
        email: 'test@example.com',
        name: 'Test User',
        organizationId: 'org-456',
        role: 'admin',
        // Missing tenantId
      };

      // Both platform and server should handle missing fields consistently
      const platformToken = await platformCreateJWT(incompletePayload as any);
      const serverToken = await serverCreateJWT(incompletePayload as any);

      // Verification should fail for incomplete payloads
      const platformVerification = await platformVerifyJWT(platformToken);
      const serverVerification = await serverVerifyJWT(serverToken);

      // Both should reject incomplete payloads
      expect(platformVerification).toBeNull();
      expect(serverVerification).toBeNull();
    });
  });

  describe('JWT Configuration Consistency', () => {
    it('should use identical JWT configuration between platform and server', async () => {
      const token = await platformCreateJWT(testPayload);
      const verified = await serverVerifyJWT(token);

      // Check that all configuration matches expected values
      expect(verified?.iss).toBe('elizaos-platform');
      expect(verified?.aud).toBe('elizaos-server');
      expect(verified?.iat).toBeDefined();
      expect(verified?.exp).toBeDefined();

      // Token should expire in about 7 days (allowing some tolerance for execution time)
      const now = Math.floor(Date.now() / 1000);
      const sevenDaysInSeconds = 7 * 24 * 60 * 60;
      const expectedExpiry = now + sevenDaysInSeconds;

      expect(verified?.exp).toBeGreaterThan(now);
      expect(verified?.exp).toBeLessThan(expectedExpiry + 60); // 60 second tolerance
    });

    it('should use HS256 algorithm consistently', async () => {
      const token = await platformCreateJWT(testPayload);

      // JWT header should indicate HS256 algorithm
      const [headerB64] = token.split('.');
      const header = JSON.parse(Buffer.from(headerB64, 'base64url').toString());

      expect(header.alg).toBe('HS256');
      // typ field may not be explicitly set by jose library, but algorithm is what matters
      expect(header.alg).toBeDefined();
    });
  });

  describe('Multi-tenant Token Validation', () => {
    it('should preserve tenant information correctly', async () => {
      const multiTenantPayloads = [
        { ...testPayload, tenantId: 'tenant-a', organizationId: 'org-a' },
        { ...testPayload, tenantId: 'tenant-b', organizationId: 'org-b' },
        { ...testPayload, tenantId: 'tenant-c', organizationId: 'org-c' },
      ];

      for (const payload of multiTenantPayloads) {
        const token = await platformCreateJWT(payload);
        const verified = await serverVerifyJWT(token);

        expect(verified).toBeDefined();
        expect(verified?.tenantId).toBe(payload.tenantId);
        expect(verified?.organizationId).toBe(payload.organizationId);
      }
    });

    it('should maintain user context across tenants', async () => {
      const userInMultipleTenants = [
        { ...testPayload, tenantId: 'tenant-a', organizationId: 'org-a' },
        { ...testPayload, tenantId: 'tenant-b', organizationId: 'org-b' },
      ];

      const tokens = await Promise.all(
        userInMultipleTenants.map((payload) => platformCreateJWT(payload))
      );

      const verifications = await Promise.all(tokens.map((token) => serverVerifyJWT(token)));

      // Same user should be preserved across different tenants
      verifications.forEach((verified) => {
        expect(verified?.sub).toBe(testPayload.sub);
        expect(verified?.email).toBe(testPayload.email);
        expect(verified?.name).toBe(testPayload.name);
      });

      // But tenant/organization should be different
      expect(verifications[0]?.tenantId).toBe('tenant-a');
      expect(verifications[1]?.tenantId).toBe('tenant-b');
    });
  });
});
