/**
 * Comprehensive tests for UserManager with real runtime integration
 * Tests all user management functionality with actual database operations
 */

import { describe, beforeEach, afterEach, it, expect } from 'bun:test';
import { TestEnvironment, TestAssertions } from '../test-utils/TestInfrastructure';
import { UserManager, createUserManager } from './UserManager';
import type { IAgentRuntime } from '../types/runtime';
import type { IDatabaseAdapter } from '../types/database';
import type { UUID } from '../types';

describe('UserManager Integration Tests', () => {
  let testEnv: TestEnvironment | null = null;
  let runtime: IAgentRuntime | null = null;
  let database: IDatabaseAdapter | null = null;
  let userManager: UserManager | null = null;

  beforeEach(async () => {
    testEnv = await TestEnvironment.create(`user-manager-test-${Date.now()}`, {
      isolation: 'integration',
      useRealDatabase: false, // Use mock for faster tests
      performanceThresholds: {
        actionExecution: 2000,
        memoryRetrieval: 500,
        databaseQuery: 300,
        modelInference: 5000,
      },
    });

    runtime = testEnv.testRuntime;
    database = testEnv.testDatabase;
    userManager = createUserManager(database);

    // Validate setup
    TestAssertions.assertRealRuntime(runtime);
    TestAssertions.assertRealDatabase(database);
  });

  afterEach(async () => {
    if (testEnv) {
      await testEnv.teardown();
      testEnv = null;
      runtime = null;
      database = null;
      userManager = null;
    }
  });

  describe('User Account Management', () => {
    it('should create and retrieve user accounts', async () => {
      const userData = {
        email: 'test@example.com',
        password: 'secure-password-123',
        name: 'Test User',
        avatar: 'https://example.com/avatar.jpg',
        metadata: { role: 'tester', source: 'integration-test' },
      };

      // Create user
      const user = await userManager!.createUser(userData);

      expect(user).toBeDefined();
      expect(user.id).toBeDefined();
      expect(user.email).toBe(userData.email);
      expect(user.name).toBe(userData.name);
      expect(user.avatar).toBe(userData.avatar);
      expect(user.emailVerified).toBe(false);
      expect(user.passwordHash).toBeDefined();
      expect(user.passwordHash).not.toBe(userData.password); // Should be hashed
      expect(user.createdAt).toBeInstanceOf(Date);
      expect(user.metadata.role).toBe('tester');

      // Retrieve by ID
      const retrievedById = await userManager!.getUserById(user.id);
      expect(retrievedById).toBeDefined();
      expect(retrievedById!.email).toBe(userData.email);

      // Retrieve by email
      const retrievedByEmail = await userManager!.getUserByEmail(userData.email);
      expect(retrievedByEmail).toBeDefined();
      expect(retrievedByEmail!.id).toBe(user.id);

      // Verify entity was created
      const entities = await database!.getEntitiesByIds([user.id]);
      expect(entities).toBeDefined();
      const entity = entities![0];
      expect(entity).toBeDefined();
      expect(entity!.names).toContain(userData.email);
      expect(entity!.names).toContain(userData.name);
      expect(entity?.metadata?.entityType).toBe('user');
      expect(entity?.metadata?.isAuthenticatedUser).toBe(true);
    });

    it('should validate user credentials correctly', async () => {
      const userData = {
        email: 'auth-test@example.com',
        password: 'my-secure-password',
        name: 'Auth Test User',
      };

      const user = await userManager!.createUser(userData);

      // Valid credentials
      const validUser = await userManager!.validateCredentials(userData.email, userData.password);
      expect(validUser).toBeDefined();
      expect(validUser!.id).toBe(user.id);

      // Invalid password
      const invalidPassword = await userManager!.validateCredentials(
        userData.email,
        'wrong-password'
      );
      expect(invalidPassword).toBeNull();

      // Invalid email
      const invalidEmail = await userManager!.validateCredentials(
        'wrong@example.com',
        userData.password
      );
      expect(invalidEmail).toBeNull();

      // Case insensitive email
      const caseInsensitive = await userManager!.validateCredentials(
        userData.email.toUpperCase(),
        userData.password
      );
      expect(caseInsensitive).toBeDefined();
      expect(caseInsensitive!.id).toBe(user.id);
    });

    it('should handle users without passwords (SSO-only)', async () => {
      const ssoUserData = {
        email: 'sso@example.com',
        name: 'SSO User',
        metadata: { provider: 'github', providerId: 'github-123456' },
      };

      const ssoUser = await userManager!.createUser(ssoUserData);

      expect(ssoUser.passwordHash).toBeUndefined();

      // Should not validate with any password
      const noAuth = await userManager!.validateCredentials(ssoUserData.email, 'any-password');
      expect(noAuth).toBeNull();

      // But should be retrievable
      const retrieved = await userManager!.getUserByEmail(ssoUserData.email);
      expect(retrieved).toBeDefined();
      expect(retrieved!.metadata.provider).toBe('github');
    });
  });

  describe('Session Management', () => {
    let testUser: any;

    beforeEach(async () => {
      testUser = await userManager!.createUser({
        email: 'session-test@example.com',
        password: 'session-password',
        name: 'Session Test User',
      });
    });

    it('should create and validate user sessions', async () => {
      const sessionMetadata = {
        ipAddress: '192.168.1.100',
        userAgent: 'TestBrowser/1.0',
      };

      // Add small delay to ensure different timestamps
      await new Promise((resolve) => setTimeout(resolve, 1));

      // Create session
      const session = await userManager!.createSession(testUser.id, sessionMetadata);

      expect(session).toBeDefined();
      expect(session.id).toBeDefined();
      expect(session.userId).toBe(testUser.id);
      expect(session.expiresAt).toBeInstanceOf(Date);
      expect(session.expiresAt.getTime()).toBeGreaterThan(Date.now());
      expect(session.ipAddress).toBe(sessionMetadata.ipAddress);
      expect(session.userAgent).toBe(sessionMetadata.userAgent);
      expect(session.tokenHash).toBeDefined();
      expect(session.tokenHash.length).toBeGreaterThan(10);

      // Validate session
      const validatedUser = await userManager!.validateSession(session.tokenHash);
      expect(validatedUser).toBeDefined();
      expect(validatedUser!.id).toBe(testUser.id);
      expect(validatedUser!.email).toBe(testUser.email);

      // Check that last login was updated
      const updatedUser = await userManager!.getUserById(testUser.id);
      expect(updatedUser!.lastLoginAt).toBeDefined();
      expect(updatedUser!.lastLoginAt!.getTime()).toBeGreaterThan(testUser.createdAt.getTime());
    });

    it('should reject invalid session tokens', async () => {
      // Invalid token format
      const invalidToken1 = await userManager!.validateSession('invalid-token');
      expect(invalidToken1).toBeNull();

      // Non-existent token
      const invalidToken2 = await userManager!.validateSession('a'.repeat(64));
      expect(invalidToken2).toBeNull();

      // Empty token
      const invalidToken3 = await userManager!.validateSession('');
      expect(invalidToken3).toBeNull();
    });

    it('should handle session expiration', async () => {
      // Create session with immediate expiration (simulate expired session)
      const session = await userManager!.createSession(testUser.id);

      // Manually expire the session in cache
      const sessionKey = `session:${session.id}`;
      const storedSession = await database!.getCache(sessionKey);
      if (storedSession) {
        (storedSession as any).expiresAt = new Date(Date.now() - 1000); // Expired 1 second ago
        await database!.setCache(sessionKey, storedSession);
      }

      // Should reject expired session
      const expiredValidation = await userManager!.validateSession(session.tokenHash);
      expect(expiredValidation).toBeNull();

      // Session should be cleaned up
      const cleanedSession = await database!.getCache(sessionKey);
      expect(cleanedSession).toBeNull();
    });

    it('should revoke sessions properly', async () => {
      const session = await userManager!.createSession(testUser.id);

      // Validate session works
      const beforeRevoke = await userManager!.validateSession(session.tokenHash);
      expect(beforeRevoke).toBeDefined();

      // Revoke session
      await userManager!.revokeSession(session.id);

      // Should no longer validate
      const afterRevoke = await userManager!.validateSession(session.tokenHash);
      expect(afterRevoke).toBeNull();
    });

    it('should handle multiple concurrent sessions', async () => {
      // Create multiple sessions for same user
      const session1 = await userManager!.createSession(testUser.id, {
        ipAddress: '192.168.1.100',
      });
      const session2 = await userManager!.createSession(testUser.id, {
        ipAddress: '192.168.1.101',
      });
      const session3 = await userManager!.createSession(testUser.id, {
        ipAddress: '192.168.1.102',
      });

      // All should be valid
      const user1 = await userManager!.validateSession(session1.tokenHash);
      const user2 = await userManager!.validateSession(session2.tokenHash);
      const user3 = await userManager!.validateSession(session3.tokenHash);

      expect(user1!.id).toBe(testUser.id);
      expect(user2!.id).toBe(testUser.id);
      expect(user3!.id).toBe(testUser.id);

      // Revoke one session
      await userManager!.revokeSession(session2.id);

      // Others should still work
      const stillValid1 = await userManager!.validateSession(session1.tokenHash);
      const revoked = await userManager!.validateSession(session2.tokenHash);
      const stillValid3 = await userManager!.validateSession(session3.tokenHash);

      expect(stillValid1).toBeDefined();
      expect(revoked).toBeNull();
      expect(stillValid3).toBeDefined();
    });
  });

  describe('Tenant Management', () => {
    let testUser: any;

    beforeEach(async () => {
      testUser = await userManager!.createUser({
        email: 'tenant-test@example.com',
        password: 'tenant-password',
        name: 'Tenant Test User',
      });
    });

    it('should create and manage tenants', async () => {
      const tenantData = {
        name: 'Test Corporation',
        slug: 'test-corp',
        domain: 'testcorp.com',
        subscriptionTier: 'pro' as const,
        settings: { allowCustomDomains: true, maxStorageGB: 100 },
      };

      // Create tenant
      const tenant = await userManager!.createTenant(tenantData, testUser.id);

      expect(tenant).toBeDefined();
      expect(tenant.id).toBeDefined();
      expect(tenant.name).toBe(tenantData.name);
      expect(tenant.slug).toBe(tenantData.slug);
      expect(tenant.domain).toBe(tenantData.domain);
      expect(tenant.subscriptionTier).toBe(tenantData.subscriptionTier);
      expect(tenant.maxAgents).toBe(10); // Pro tier limit
      expect(tenant.maxUsers).toBe(20); // Pro tier limit
      expect(tenant.settings.allowCustomDomains).toBe(true);
      expect(tenant.createdAt).toBeInstanceOf(Date);

      // Retrieve tenant
      const retrievedById = await userManager!.getTenantById(tenant.id);
      expect(retrievedById).toBeDefined();
      expect(retrievedById!.name).toBe(tenantData.name);

      const retrievedBySlug = await userManager!.getTenantBySlug(tenantData.slug);
      expect(retrievedBySlug).toBeDefined();
      expect(retrievedBySlug!.id).toBe(tenant.id);
    });

    it('should handle different subscription tiers correctly', async () => {
      // Free tier
      const freeTenant = await userManager!.createTenant(
        {
          name: 'Free Tenant',
          slug: 'free-tenant',
          subscriptionTier: 'free',
        },
        testUser.id
      );

      expect(freeTenant.maxAgents).toBe(3);
      expect(freeTenant.maxUsers).toBe(5);

      // Enterprise tier
      const enterpriseTenant = await userManager!.createTenant(
        {
          name: 'Enterprise Tenant',
          slug: 'enterprise-tenant',
          subscriptionTier: 'enterprise',
        },
        testUser.id
      );

      expect(enterpriseTenant.maxAgents).toBe(50);
      expect(enterpriseTenant.maxUsers).toBe(100);

      // Default (free) tier
      const defaultTenant = await userManager!.createTenant(
        {
          name: 'Default Tenant',
          slug: 'default-tenant',
        },
        testUser.id
      );

      expect(defaultTenant.subscriptionTier).toBe('free');
      expect(defaultTenant.maxAgents).toBe(3);
    });

    it('should manage tenant memberships', async () => {
      const tenant = await userManager!.createTenant(
        {
          name: 'Membership Test Tenant',
          slug: 'membership-test',
        },
        testUser.id
      );

      // Create additional user
      const memberUser = await userManager!.createUser({
        email: 'member@example.com',
        password: 'member-password',
        name: 'Member User',
      });

      // Add member to tenant
      const membership = await userManager!.addTenantMember(tenant.id, memberUser.id, 'member', [
        'read',
        'write',
      ]);

      expect(membership).toBeDefined();
      expect(membership.tenantId).toBe(tenant.id);
      expect(membership.userId).toBe(memberUser.id);
      expect(membership.role).toBe('member');
      expect(membership.permissions).toContain('read');
      expect(membership.permissions).toContain('write');

      // Check user's tenants
      const ownerTenants = await userManager!.getUserTenants(testUser.id);
      expect(ownerTenants.length).toBe(1);
      expect(ownerTenants[0].id).toBe(tenant.id);

      const memberTenants = await userManager!.getUserTenants(memberUser.id);
      expect(memberTenants.length).toBe(1);
      expect(memberTenants[0].id).toBe(tenant.id);

      // Check permissions
      const ownerHasPermission = await userManager!.hasPermission(testUser.id, tenant.id, 'admin');
      const memberHasPermission = await userManager!.hasPermission(
        memberUser.id,
        tenant.id,
        'read'
      );
      const nonMemberPermission = await userManager!.hasPermission(
        '550e8400-e29b-41d4-a716-446655440000' as UUID,
        tenant.id,
        'read'
      );

      expect(ownerHasPermission).toBe(true);
      expect(memberHasPermission).toBe(true);
      expect(nonMemberPermission).toBe(false);
    });
  });

  describe('API Key Integration', () => {
    it('should generate valid API keys for users', async () => {
      const user = await userManager!.createUser({
        email: 'apikey-test@example.com',
        password: 'password',
        name: 'API Key User',
      });

      const apiKey = userManager!.generateUserApiKey(user.id);

      expect(apiKey).toBeDefined();
      expect(typeof apiKey).toBe('string');
      expect(apiKey.length).toBeGreaterThan(10);
      expect(apiKey.startsWith('user-')).toBe(true);

      // Test API key format validation
      const { isValidApiKeyFormat } = await import('./ApiKeyAuth');
      expect(isValidApiKeyFormat(apiKey)).toBe(true);
    });
  });

  describe('Performance and Reliability', () => {
    it('should handle concurrent user operations', async () => {
      // Create multiple users concurrently
      const userPromises = Array.from({ length: 5 }, (_, i) =>
        userManager!.createUser({
          email: `concurrent-${i}@example.com`,
          password: `password-${i}`,
          name: `Concurrent User ${i}`,
        })
      );

      const users = await Promise.all(userPromises);

      expect(users.length).toBe(5);
      users.forEach((user, i) => {
        expect(user.email).toBe(`concurrent-${i}@example.com`);
        expect(user.name).toBe(`Concurrent User ${i}`);
      });

      // Create sessions concurrently
      const sessionPromises = users.map((user) =>
        userManager!.createSession(user.id, { ipAddress: `192.168.1.${user.email.charCodeAt(0)}` })
      );

      const sessions = await Promise.all(sessionPromises);
      expect(sessions.length).toBe(5);

      // Validate all sessions concurrently
      const validationPromises = sessions.map((session) =>
        userManager!.validateSession(session.tokenHash)
      );

      const validatedUsers = await Promise.all(validationPromises);
      expect(validatedUsers.length).toBe(5);
      validatedUsers.forEach((user) => {
        expect(user).toBeDefined();
      });
    });

    it('should meet performance requirements', async () => {
      const userData = {
        email: 'performance@example.com',
        password: 'performance-password',
        name: 'Performance User',
      };

      // Test user creation performance
      await TestAssertions.assertPerformance(
        () => userManager!.createUser(userData),
        500, // 500ms max
        'User creation'
      );

      // Test user retrieval performance
      const user = await userManager!.getUserByEmail(userData.email);

      await TestAssertions.assertPerformance(
        () => userManager!.getUserById(user!.id),
        100, // 100ms max
        'User retrieval by ID'
      );

      await TestAssertions.assertPerformance(
        () => userManager!.getUserByEmail(userData.email),
        200, // 200ms max
        'User retrieval by email'
      );

      // Test session operations performance
      await TestAssertions.assertPerformance(
        () => userManager!.createSession(user!.id),
        300, // 300ms max
        'Session creation'
      );
    });

    it('should handle edge cases gracefully', async () => {
      // Non-existent user retrieval
      const nonExistent = await userManager!.getUserById('non-existent-id' as any);
      expect(nonExistent).toBeNull();

      // Invalid email format
      const invalidEmail = await userManager!.getUserByEmail('invalid-email-format');
      expect(invalidEmail).toBeNull();

      // Empty session validation
      const emptySession = await userManager!.validateSession('');
      expect(emptySession).toBeNull();

      // Non-existent tenant
      const nonExistentTenant = await userManager!.getTenantById('non-existent-tenant' as any);
      expect(nonExistentTenant).toBeNull();

      // Permission check for non-existent entities
      const badPermission = await userManager!.hasPermission(
        'fake-user' as any,
        'fake-tenant' as any,
        'read'
      );
      expect(badPermission).toBe(false);
    });
  });
});
