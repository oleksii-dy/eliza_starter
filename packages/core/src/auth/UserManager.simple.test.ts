/**
 * Simplified UserManager tests with direct database mock
 * Tests core functionality without complex test infrastructure
 */

import { describe, beforeEach, it, expect } from 'bun:test';
import { UserManager } from './UserManager';
import type { IDatabaseAdapter } from '../types/database';

// Simple mock database for testing
class MockDatabaseAdapter implements Partial<IDatabaseAdapter> {
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
      const id = entity.id || `entity-${Date.now()}-${Math.random().toString(36).substring(7)}`;
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
}

describe('UserManager Core Functionality', () => {
  let userManager: UserManager;
  let mockDatabase: MockDatabaseAdapter;

  beforeEach(() => {
    mockDatabase = new MockDatabaseAdapter();
    userManager = new UserManager(mockDatabase as unknown as IDatabaseAdapter);
  });

  describe('User Creation and Retrieval', () => {
    it('should create a user successfully', async () => {
      const userData = {
        email: 'test@example.com',
        password: 'secure-password',
        name: 'Test User',
        metadata: { role: 'tester' },
      };

      const user = await userManager.createUser(userData);

      expect(user).toBeDefined();
      expect(user.id).toBeDefined();
      expect(user.email).toBe('test@example.com');
      expect(user.name).toBe('Test User');
      expect(user.emailVerified).toBe(false);
      expect(user.passwordHash).toBeDefined();
      expect(user.passwordHash).not.toBe(userData.password);
      expect(user.createdAt).toBeInstanceOf(Date);
      expect(user.metadata.role).toBe('tester');
    });

    it('should retrieve user by ID', async () => {
      const userData = {
        email: 'retrieve@example.com',
        password: 'password123',
        name: 'Retrieve User',
      };

      const createdUser = await userManager.createUser(userData);
      const retrievedUser = await userManager.getUserById(createdUser.id);

      expect(retrievedUser).toBeDefined();
      expect(retrievedUser!.id).toBe(createdUser.id);
      expect(retrievedUser!.email).toBe(userData.email);
      expect(retrievedUser!.name).toBe(userData.name);
    });

    it('should handle non-existent user gracefully', async () => {
      const nonExistentUser = await userManager.getUserById('non-existent-id' as any);
      expect(nonExistentUser).toBeNull();
    });

    it('should create SSO-only user without password', async () => {
      const ssoUserData = {
        email: 'sso@example.com',
        name: 'SSO User',
        metadata: { provider: 'github', providerId: '123456' },
      };

      const ssoUser = await userManager.createUser(ssoUserData);

      expect(ssoUser.passwordHash).toBeUndefined();
      expect(ssoUser.metadata.provider).toBe('github');
    });
  });

  describe('Authentication', () => {
    let testUser: any;

    beforeEach(async () => {
      testUser = await userManager.createUser({
        email: 'auth@example.com',
        password: 'test-password',
        name: 'Auth User',
      });
    });

    it('should validate correct credentials', async () => {
      const validatedUser = await userManager.validateCredentials(
        'auth@example.com',
        'test-password'
      );

      expect(validatedUser).toBeDefined();
      expect(validatedUser!.id).toBe(testUser.id);
      expect(validatedUser!.email).toBe('auth@example.com');
    });

    it('should reject incorrect password', async () => {
      const invalidUser = await userManager.validateCredentials(
        'auth@example.com',
        'wrong-password'
      );
      expect(invalidUser).toBeNull();
    });

    it('should reject non-existent email', async () => {
      const invalidUser = await userManager.validateCredentials(
        'nonexistent@example.com',
        'test-password'
      );
      expect(invalidUser).toBeNull();
    });

    it('should handle case insensitive email lookup', async () => {
      const validatedUser = await userManager.validateCredentials(
        'AUTH@EXAMPLE.COM',
        'test-password'
      );
      expect(validatedUser).toBeDefined();
      expect(validatedUser!.id).toBe(testUser.id);
    });
  });

  describe('Session Management', () => {
    let testUser: any;

    beforeEach(async () => {
      testUser = await userManager.createUser({
        email: 'session@example.com',
        password: 'session-password',
        name: 'Session User',
      });
    });

    it('should create a valid session', async () => {
      const session = await userManager.createSession(testUser.id, {
        ipAddress: '192.168.1.1',
        userAgent: 'TestBrowser/1.0',
      });

      expect(session).toBeDefined();
      expect(session.id).toBeDefined();
      expect(session.userId).toBe(testUser.id);
      expect(session.tokenHash).toBeDefined();
      expect(session.expiresAt).toBeInstanceOf(Date);
      expect(session.expiresAt.getTime()).toBeGreaterThan(Date.now());
      expect(session.ipAddress).toBe('192.168.1.1');
      expect(session.userAgent).toBe('TestBrowser/1.0');
    });

    it('should validate session token', async () => {
      const session = await userManager.createSession(testUser.id);
      const validatedUser = await userManager.validateSession(session.tokenHash);

      expect(validatedUser).toBeDefined();
      expect(validatedUser!.id).toBe(testUser.id);
      expect(validatedUser!.email).toBe(testUser.email);
    });

    it('should reject invalid session token', async () => {
      const invalidUser = await userManager.validateSession('invalid-token');
      expect(invalidUser).toBeNull();
    });

    it('should revoke session', async () => {
      const session = await userManager.createSession(testUser.id);

      // Validate session works
      const beforeRevoke = await userManager.validateSession(session.tokenHash);
      expect(beforeRevoke).toBeDefined();

      // Revoke session
      await userManager.revokeSession(session.id);

      // Should no longer validate
      const afterRevoke = await userManager.validateSession(session.tokenHash);
      expect(afterRevoke).toBeNull();
    });

    it('should handle multiple sessions for same user', async () => {
      const session1 = await userManager.createSession(testUser.id);
      const session2 = await userManager.createSession(testUser.id);

      const user1 = await userManager.validateSession(session1.tokenHash);
      const user2 = await userManager.validateSession(session2.tokenHash);

      expect(user1!.id).toBe(testUser.id);
      expect(user2!.id).toBe(testUser.id);

      // Revoke one, other should still work
      await userManager.revokeSession(session1.id);

      const afterRevoke1 = await userManager.validateSession(session1.tokenHash);
      const afterRevoke2 = await userManager.validateSession(session2.tokenHash);

      expect(afterRevoke1).toBeNull();
      expect(afterRevoke2).toBeDefined();
    });
  });

  describe('Tenant Management', () => {
    let testUser: any;

    beforeEach(async () => {
      testUser = await userManager.createUser({
        email: 'tenant@example.com',
        password: 'tenant-password',
        name: 'Tenant User',
      });
    });

    it('should create tenant with correct defaults', async () => {
      const tenantData = {
        name: 'Test Company',
        slug: 'test-company',
        domain: 'test.com',
      };

      const tenant = await userManager.createTenant(tenantData, testUser.id);

      expect(tenant).toBeDefined();
      expect(tenant.id).toBeDefined();
      expect(tenant.name).toBe('Test Company');
      expect(tenant.slug).toBe('test-company');
      expect(tenant.domain).toBe('test.com');
      expect(tenant.subscriptionTier).toBe('free');
      expect(tenant.maxAgents).toBe(3);
      expect(tenant.maxUsers).toBe(5);
      expect(tenant.createdAt).toBeInstanceOf(Date);
    });

    it('should handle different subscription tiers', async () => {
      const proTenant = await userManager.createTenant(
        {
          name: 'Pro Company',
          slug: 'pro-company',
          subscriptionTier: 'pro',
        },
        testUser.id
      );

      expect(proTenant.subscriptionTier).toBe('pro');
      expect(proTenant.maxAgents).toBe(10);
      expect(proTenant.maxUsers).toBe(20);

      const enterpriseTenant = await userManager.createTenant(
        {
          name: 'Enterprise Company',
          slug: 'enterprise-company',
          subscriptionTier: 'enterprise',
        },
        testUser.id
      );

      expect(enterpriseTenant.subscriptionTier).toBe('enterprise');
      expect(enterpriseTenant.maxAgents).toBe(50);
      expect(enterpriseTenant.maxUsers).toBe(100);
    });

    it('should retrieve tenant by ID', async () => {
      const tenant = await userManager.createTenant(
        {
          name: 'Retrieve Test',
          slug: 'retrieve-test',
        },
        testUser.id
      );

      const retrieved = await userManager.getTenantById(tenant.id);

      expect(retrieved).toBeDefined();
      expect(retrieved!.id).toBe(tenant.id);
      expect(retrieved!.name).toBe('Retrieve Test');
    });

    it('should manage tenant memberships', async () => {
      const tenant = await userManager.createTenant(
        {
          name: 'Membership Test',
          slug: 'membership-test',
        },
        testUser.id
      );

      // Create another user
      const memberUser = await userManager.createUser({
        email: 'member@example.com',
        password: 'member-password',
        name: 'Member User',
      });

      // Add member to tenant
      const membership = await userManager.addTenantMember(tenant.id, memberUser.id, 'member', [
        'read',
        'write',
      ]);

      expect(membership).toBeDefined();
      expect(membership.tenantId).toBe(tenant.id);
      expect(membership.userId).toBe(memberUser.id);
      expect(membership.role).toBe('member');
      expect(membership.permissions).toContain('read');
      expect(membership.permissions).toContain('write');

      // Check user tenants
      const ownerTenants = await userManager.getUserTenants(testUser.id);
      const memberTenants = await userManager.getUserTenants(memberUser.id);

      expect(ownerTenants.length).toBe(1);
      expect(memberTenants.length).toBe(1);
      expect(ownerTenants[0].id).toBe(tenant.id);
      expect(memberTenants[0].id).toBe(tenant.id);

      // Check permissions
      const hasPermission = await userManager.hasPermission(memberUser.id, tenant.id, 'read');
      expect(hasPermission).toBe(true);

      const noPermission = await userManager.hasPermission('fake-user' as any, tenant.id, 'read');
      expect(noPermission).toBe(false);
    });
  });

  describe('API Key Generation', () => {
    it('should generate valid API keys', async () => {
      const user = await userManager.createUser({
        email: 'apikey@example.com',
        password: 'password',
        name: 'API Key User',
      });

      const apiKey = userManager.generateUserApiKey(user.id);

      expect(apiKey).toBeDefined();
      expect(typeof apiKey).toBe('string');
      expect(apiKey.length).toBeGreaterThan(10);
      expect(apiKey.startsWith('user-')).toBe(true);
    });
  });
});
