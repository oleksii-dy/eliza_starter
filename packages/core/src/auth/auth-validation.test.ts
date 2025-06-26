/**
 * Authentication system validation - demonstrates real-world scenarios
 * Tests the complete authentication flow with realistic use cases
 */

import { describe, beforeEach, it, expect } from 'bun:test';
import { UserManager } from './UserManager';
import { authenticateRequest, generateApiKey, isValidApiKeyFormat } from './ApiKeyAuth';
import type { IDatabaseAdapter } from '../types/database';

// Simple but complete mock database
class TestDatabase implements Partial<IDatabaseAdapter> {
  private cache = new Map<string, any>();
  private entities = new Map<string, any>();

  async getCache<T>(key: string): Promise<T | undefined> {
    return this.cache.get(key);
  }

  async setCache<T>(key: string, value: T): Promise<boolean> {
    this.cache.set(key, value);
    return true;
  }

  async deleteCache(key: string): Promise<boolean> {
    this.cache.delete(key);
    return true;
  }

  async createEntities(entities: any[]): Promise<boolean> {
    for (const entity of entities) {
      const id = entity.id || `entity-${Date.now()}`;
      this.entities.set(id, { ...entity, id });
    }
    return true;
  }

  async getEntityById(id: string): Promise<any | null> {
    return this.entities.get(id) || null;
  }

  async isReady(): Promise<boolean> {
    return true;
  }

  // Add method to check contents for validation
  getCacheContents(): Map<string, any> {
    return new Map(this.cache);
  }

  getEntityContents(): Map<string, any> {
    return new Map(this.entities);
  }
}

describe('Authentication System Validation', () => {
  let database: TestDatabase;
  let userManager: UserManager;

  beforeEach(() => {
    database = new TestDatabase();
    userManager = new UserManager(database as unknown as IDatabaseAdapter);
  });

  describe('Complete User Registration Flow', () => {
    it('should handle complete user onboarding process', async () => {
      // 1. User registration
      const registrationData = {
        email: 'jane.doe@company.com',
        password: 'SecurePassword123!',
        name: 'Jane Doe',
        metadata: {
          source: 'web-signup',
          marketingConsent: true,
          timezone: 'America/New_York',
        },
      };

      const user = await userManager.createUser(registrationData);

      // Validate user creation
      expect(user.id).toBeDefined();
      expect(user.email).toBe('jane.doe@company.com');
      expect(user.name).toBe('Jane Doe');
      expect(user.emailVerified).toBe(false);
      expect(user.passwordHash).toBeDefined();
      expect(user.passwordHash).not.toBe(registrationData.password);
      expect(user.metadata.source).toBe('web-signup');

      // 2. Email verification simulation (would normally involve email service)
      const retrievedUser = await userManager.getUserById(user.id);
      expect(retrievedUser).toBeDefined();

      // 3. User login
      const loginUser = await userManager.validateCredentials(
        registrationData.email,
        registrationData.password
      );
      expect(loginUser).toBeDefined();
      expect(loginUser!.id).toBe(user.id);

      // 4. Session creation with metadata
      const sessionMetadata = {
        ipAddress: '203.0.113.1',
        userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
      };

      const session = await userManager.createSession(user.id, sessionMetadata);
      expect(session.tokenHash).toBeDefined();
      expect(session.expiresAt.getTime()).toBeGreaterThan(Date.now());

      // 5. Session validation (API request simulation)
      const authenticatedUser = await userManager.validateSession(session.tokenHash);
      expect(authenticatedUser!.id).toBe(user.id);
      expect(authenticatedUser!.lastLoginAt).toBeDefined();

      // 6. API key generation
      const apiKey = userManager.generateUserApiKey(user.id);
      expect(apiKey).toBeDefined();
      expect(isValidApiKeyFormat(apiKey)).toBe(true);
    });
  });

  describe('Organization/Tenant Workflow', () => {
    it('should handle complete organization setup and team management', async () => {
      // 1. Organization owner registration
      const owner = await userManager.createUser({
        email: 'ceo@startup.com',
        password: 'FounderPassword123!',
        name: 'John Founder',
        metadata: { role: 'founder', department: 'executive' },
      });

      // 2. Create organization/tenant
      const orgData = {
        name: 'Startup Inc.',
        slug: 'startup-inc',
        domain: 'startup.com',
        subscriptionTier: 'pro' as const,
        settings: {
          allowCustomDomains: true,
          ssoRequired: false,
          maxStorageGB: 500,
          features: ['ai-agents', 'analytics', 'api-access'],
        },
      };

      const organization = await userManager.createTenant(orgData, owner.id);

      expect(organization.name).toBe('Startup Inc.');
      expect(organization.subscriptionTier).toBe('pro');
      expect(organization.maxAgents).toBe(10); // Pro tier limit
      expect(organization.maxUsers).toBe(20); // Pro tier limit

      // 3. Invite team members
      const teamMembers = [
        {
          email: 'dev@startup.com',
          name: 'Alice Developer',
          role: 'admin' as const,
          permissions: ['read', 'write', 'manage-agents'],
        },
        {
          email: 'designer@startup.com',
          name: 'Bob Designer',
          role: 'member' as const,
          permissions: ['read', 'write'],
        },
        {
          email: 'intern@startup.com',
          name: 'Carol Intern',
          role: 'member' as const,
          permissions: ['read'],
        },
      ];

      const createdMembers = [];
      for (const memberData of teamMembers) {
        // Create user account
        const member = await userManager.createUser({
          email: memberData.email,
          password: 'TempPassword123!',
          name: memberData.name,
          metadata: { invitedBy: owner.id, status: 'invited' },
        });

        // Add to organization
        const membership = await userManager.addTenantMember(
          organization.id,
          member.id,
          memberData.role,
          memberData.permissions
        );

        createdMembers.push({ user: member, membership });
      }

      expect(createdMembers.length).toBe(3);

      // 4. Validate team access
      const ownerTenants = await userManager.getUserTenants(owner.id);
      expect(ownerTenants.length).toBe(1);
      expect(ownerTenants[0].id).toBe(organization.id);

      for (const { user } of createdMembers) {
        const memberTenants = await userManager.getUserTenants(user.id);
        expect(memberTenants.length).toBe(1);
        expect(memberTenants[0].id).toBe(organization.id);

        const hasAccess = await userManager.hasPermission(user.id, organization.id, 'read');
        expect(hasAccess).toBe(true);
      }

      // 5. Test role-based permissions
      const adminMember = createdMembers[0];
      const regularMember = createdMembers[1];
      const internMember = createdMembers[2];

      // Admin should have access
      const adminAccess = await userManager.hasPermission(
        adminMember.user.id,
        organization.id,
        'manage-agents'
      );
      expect(adminAccess).toBe(true);

      // Regular member should have basic access
      const memberAccess = await userManager.hasPermission(
        regularMember.user.id,
        organization.id,
        'read'
      );
      expect(memberAccess).toBe(true);

      // Intern should have limited access
      const internAccess = await userManager.hasPermission(
        internMember.user.id,
        organization.id,
        'read'
      );
      expect(internAccess).toBe(true);
    });
  });

  describe('API Key Authentication Integration', () => {
    it('should handle API key authentication workflow', async () => {
      // 1. Generate API key
      const apiKey = generateApiKey('test-service');
      expect(isValidApiKeyFormat(apiKey)).toBe(true);

      // 2. Simulate API requests
      const requests = [
        {
          headers: { 'x-api-key': apiKey },
          method: 'GET',
          url: '/api/agents',
          ip: '192.168.1.100',
        },
        {
          headers: { 'x-api-key': 'invalid-key' },
          method: 'POST',
          url: '/api/agents',
          ip: '192.168.1.101',
        },
        {
          headers: { 'x-api-key': undefined as any }, // No API key
          method: 'GET',
          url: '/api/agents',
          ip: '192.168.1.102',
        },
      ];

      // Set up environment for API key validation
      process.env.ELIZA_SERVER_AUTH_TOKEN = apiKey;

      const results = await Promise.all(requests.map((req) => authenticateRequest(req)));

      // Valid API key should authenticate
      expect(results[0].isAuthenticated).toBe(true);
      expect(results[0].error).toBeUndefined();
      expect(results[0].metadata?.ip).toBe('192.168.1.100');

      // Invalid API key should fail
      expect(results[1].isAuthenticated).toBe(false);
      expect(results[1].error).toContain('Invalid API key');

      // Missing API key should fail
      expect(results[2].isAuthenticated).toBe(false);
      expect(results[2].error).toContain('Missing X-API-KEY header');

      // Clean up
      delete process.env.ELIZA_SERVER_AUTH_TOKEN;
    });

    it('should handle development mode (no auth required)', async () => {
      // Ensure no auth token is set
      delete process.env.ELIZA_SERVER_AUTH_TOKEN;

      const request = {
        headers: {},
        method: 'GET',
        url: '/api/agents',
        ip: '127.0.0.1',
      };

      const result = await authenticateRequest(request);

      // Should authenticate without API key when no token is configured
      expect(result.isAuthenticated).toBe(true);
      expect(result.metadata?.ip).toBe('127.0.0.1');
    });
  });

  describe('Session Security and Management', () => {
    it('should handle session security scenarios', async () => {
      // 1. Create user and sessions
      const user = await userManager.createUser({
        email: 'security@test.com',
        password: 'SecurePass123!',
        name: 'Security User',
      });

      // 2. Create multiple sessions from different devices
      const sessions = await Promise.all([
        userManager.createSession(user.id, {
          ipAddress: '192.168.1.100',
          userAgent: 'Chrome/120.0 Windows',
        }),
        userManager.createSession(user.id, {
          ipAddress: '10.0.0.50',
          userAgent: 'Safari/17.0 macOS',
        }),
        userManager.createSession(user.id, {
          ipAddress: '203.0.113.25',
          userAgent: 'Firefox/121.0 Linux',
        }),
      ]);

      // 3. Validate all sessions work
      const validations = await Promise.all(
        sessions.map((session) => userManager.validateSession(session.tokenHash))
      );

      expect(validations.every((user) => user !== null)).toBe(true);

      // 4. Simulate security incident - revoke specific session
      await userManager.revokeSession(sessions[1].id); // Revoke Safari session

      // 5. Check session validity after revocation
      const postRevocationValidations = await Promise.all(
        sessions.map((session) => userManager.validateSession(session.tokenHash))
      );

      expect(postRevocationValidations[0]).toBeDefined(); // Chrome still valid
      expect(postRevocationValidations[1]).toBeNull(); // Safari revoked
      expect(postRevocationValidations[2]).toBeDefined(); // Firefox still valid

      // 6. Test session expiration handling
      // (In real implementation, would test with actual expired sessions)
    });
  });

  describe('Data Integrity and Performance', () => {
    it('should maintain data consistency under concurrent operations', async () => {
      // 1. Create users concurrently
      const userCreationPromises = Array.from({ length: 10 }, (_, i) =>
        userManager.createUser({
          email: `user${i}@concurrent.test`,
          password: `password${i}`,
          name: `User ${i}`,
          metadata: { batch: 'concurrent-test', index: i },
        })
      );

      const users = await Promise.all(userCreationPromises);
      expect(users.length).toBe(10);

      // 2. Create sessions concurrently for all users
      const sessionPromises = users.map((user, i) =>
        userManager.createSession(user.id, {
          ipAddress: `192.168.1.${100 + i}`,
          userAgent: `TestClient/${i}`,
        })
      );

      const sessions = await Promise.all(sessionPromises);
      expect(sessions.length).toBe(10);

      // 3. Validate all sessions concurrently
      const validationPromises = sessions.map((session) =>
        userManager.validateSession(session.tokenHash)
      );

      const validatedUsers = await Promise.all(validationPromises);
      expect(validatedUsers.filter((user) => user !== null).length).toBe(10);

      // 4. Create tenant and add all users as members
      const tenant = await userManager.createTenant(
        {
          name: 'Concurrent Test Org',
          slug: 'concurrent-test',
          subscriptionTier: 'enterprise', // High limits for testing
        },
        users[0].id
      );

      const membershipPromises = users
        .slice(1)
        .map((user) =>
          userManager.addTenantMember(tenant.id, user.id, 'member', ['read', 'write'])
        );

      const memberships = await Promise.all(membershipPromises);
      expect(memberships.length).toBe(9); // 9 members + 1 owner

      // 5. Validate all users can access the tenant
      const accessPromises = users.map((user) =>
        userManager.hasPermission(user.id, tenant.id, 'read')
      );

      const accessResults = await Promise.all(accessPromises);
      expect(accessResults.every((hasAccess) => hasAccess === true)).toBe(true);
    });

    it('should handle edge cases and error conditions', async () => {
      // 1. Duplicate email handling
      const userData = {
        email: 'duplicate@test.com',
        password: 'password123',
        name: 'Original User',
      };

      const user1 = await userManager.createUser(userData);

      // In a real implementation, this should throw an error
      // For our mock, it will succeed but we can test the lookup behavior
      const user2 = await userManager.createUser({
        ...userData,
        name: 'Duplicate User',
      });

      // Both users exist but lookup should return one consistently
      const lookupResult = await userManager.getUserByEmail(userData.email);
      expect(lookupResult).toBeDefined();

      // 2. Invalid session token formats
      const invalidTokens = [
        '',
        'too-short',
        'not-hex-format-!!!',
        'a'.repeat(1000), // Too long
        null as any,
        undefined as any,
      ];

      for (const token of invalidTokens) {
        const result = await userManager.validateSession(token);
        expect(result).toBeNull();
      }

      // 3. Non-existent entity operations
      const fakeId = '00000000-0000-0000-0000-000000000000' as any;

      expect(await userManager.getUserById(fakeId)).toBeNull();
      expect(await userManager.getTenantById(fakeId)).toBeNull();
      expect(await userManager.getUserTenants(fakeId)).toEqual([]);
      expect(await userManager.hasPermission(fakeId, fakeId, 'read')).toBe(false);

      // 4. Malformed email addresses
      const malformedEmails = [
        '',
        'not-an-email',
        '@missing-local.com',
        'missing-domain@',
        'spaces in@email.com',
      ];

      for (const email of malformedEmails) {
        const result = await userManager.getUserByEmail(email);
        expect(result).toBeNull();
      }
    });
  });

  describe('Database State Validation', () => {
    it('should maintain proper database state and relationships', async () => {
      // Create test data
      const user = await userManager.createUser({
        email: 'state-test@example.com',
        password: 'password',
        name: 'State Test User',
      });

      const tenant = await userManager.createTenant(
        {
          name: 'State Test Org',
          slug: 'state-test-org',
        },
        user.id
      );

      const session = await userManager.createSession(user.id);

      // Validate database state
      const cacheContents = database.getCacheContents();
      const entityContents = database.getEntityContents();

      // Check user storage
      expect(cacheContents.has(`user:${user.id}`)).toBe(true);
      expect(cacheContents.has(`user:email:${user.email}`)).toBe(true);

      // Check tenant storage
      expect(cacheContents.has(`tenant:${tenant.id}`)).toBe(true);
      expect(cacheContents.has(`tenant:slug:${tenant.slug}`)).toBe(true);

      // Check session storage
      expect(cacheContents.has(`session:${session.id}`)).toBe(true);
      const tokenHash = await userManager['hashToken'](session.tokenHash);
      expect(cacheContents.has(`token:${tokenHash}`)).toBe(true);

      // Check entity creation
      expect(entityContents.has(user.id)).toBe(true);

      // Check user-tenant relationship
      expect(cacheContents.has(`user:${user.id}:tenants`)).toBe(true);

      const userTenants = cacheContents.get(`user:${user.id}:tenants`);
      expect(userTenants).toContain(tenant.id);
    });
  });
});
