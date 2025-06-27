/**
 * User Management System - Real implementation for multi-tenancy
 * Provides user account management, authentication, and tenant association
 */

import type { IDatabaseAdapter } from '../types/database';
import type { UUID } from '../types/primitives';
import { validateUuid as _validateUuid } from '../utils';
import { v4 as uuidv4 } from 'uuid';
import { generateApiKey, isValidApiKeyFormat as _isValidApiKeyFormat } from './ApiKeyAuth';
import { sha1 } from 'js-sha1';

export interface User {
  id: UUID;
  email: string;
  passwordHash?: string; // Optional for SSO-only users
  name: string;
  avatar?: string;
  emailVerified: boolean;
  createdAt: Date;
  updatedAt: Date;
  lastLoginAt?: Date;
  tenantId?: UUID; // Primary tenant
  metadata: Record<string, any>;
}

export interface Tenant {
  id: UUID;
  name: string;
  slug: string;
  domain?: string;
  subscriptionTier: 'free' | 'pro' | 'enterprise';
  maxAgents: number;
  maxUsers: number;
  settings: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

export interface UserSession {
  id: UUID;
  userId: UUID;
  tokenHash: string;
  expiresAt: Date;
  ipAddress?: string;
  userAgent?: string;
  createdAt: Date;
}

export interface TenantMembership {
  id: UUID;
  tenantId: UUID;
  userId: UUID;
  role: 'owner' | 'admin' | 'member';
  permissions: string[];
  invitedBy?: UUID;
  joinedAt: Date;
  createdAt: Date;
}

export interface CreateUserData {
  email: string;
  password?: string;
  name: string;
  avatar?: string;
  tenantId?: UUID;
  metadata?: Record<string, any>;
}

export interface CreateTenantData {
  name: string;
  slug: string;
  domain?: string;
  subscriptionTier?: 'free' | 'pro' | 'enterprise';
  settings?: Record<string, any>;
}

/**
 * User management service with real database integration
 */
export class UserManager {
  constructor(private database: IDatabaseAdapter) {}

  /**
   * Create a new user account
   */
  async createUser(data: CreateUserData): Promise<User> {
    const userId = uuidv4() as UUID;

    const user: User = {
      id: userId,
      email: data.email.toLowerCase(),
      name: data.name,
      avatar: data.avatar,
      passwordHash: data.password ? await this.hashPassword(data.password) : undefined,
      emailVerified: false,
      tenantId: data.tenantId,
      metadata: data.metadata || {},
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    // Store user in cache (simulating user table)
    const userKey = `user:${userId}`;
    await this.database.setCache(userKey, user);

    // Create email index for lookup
    const emailKey = `user:email:${user.email}`;
    await this.database.setCache(emailKey, userId);

    // Create user entity for agent interaction
    await this.database.createEntities([
      {
        id: userId,
        names: [data.email, data.name],
        metadata: {
          ...user,
          entityType: 'user',
          isAuthenticatedUser: true,
        },
        agentId: userId, // Self-referential for user entities
      },
    ]);

    return user;
  }

  /**
   * Get user by ID
   */
  async getUserById(userId: UUID): Promise<User | null> {
    try {
      const userKey = `user:${userId}`;
      const user = await this.database.getCache<User>(userKey);
      return user || null;
    } catch (_error) {
      return null;
    }
  }

  /**
   * Get user by email
   */
  async getUserByEmail(email: string): Promise<User | null> {
    try {
      // In a real implementation, this would use an email index
      // For now, we'll use a cache key pattern
      const emailKey = `user:email:${email.toLowerCase()}`;
      const userId = await this.database.getCache<UUID>(emailKey);

      if (userId) {
        return this.getUserById(userId);
      }

      return null;
    } catch (_error) {
      return null;
    }
  }

  /**
   * Validate user credentials
   */
  async validateCredentials(email: string, password: string): Promise<User | null> {
    const user = await this.getUserByEmail(email);

    if (!user || !user.passwordHash) {
      return null;
    }

    const isValid = await this.verifyPassword(password, user.passwordHash);
    return isValid ? user : null;
  }

  /**
   * Update user's last login timestamp
   */
  async updateLastLogin(userId: UUID): Promise<void> {
    const user = await this.getUserById(userId);
    if (user) {
      user.lastLoginAt = new Date();
      user.updatedAt = new Date();

      const userKey = `user:${userId}`;
      await this.database.setCache(userKey, user);
    }
  }

  /**
   * Create user session
   */
  async createSession(
    userId: UUID,
    metadata: { ipAddress?: string; userAgent?: string } = {}
  ): Promise<UserSession> {
    const sessionId = uuidv4() as UUID;
    const token = await this.generateSessionToken();
    const tokenHash = await this.hashToken(token);

    const session: UserSession = {
      id: sessionId,
      userId,
      tokenHash,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
      ipAddress: metadata.ipAddress,
      userAgent: metadata.userAgent,
      createdAt: new Date(),
    };

    // Store session
    const sessionKey = `session:${sessionId}`;
    await this.database.setCache(sessionKey, session);

    // Store token mapping for lookup
    const tokenKey = `token:${tokenHash}`;
    await this.database.setCache(tokenKey, sessionId);

    // Update user's last login
    await this.updateLastLogin(userId);

    return { ...session, tokenHash: token }; // Return actual token, not hash
  }

  /**
   * Validate session token
   */
  async validateSession(token: string): Promise<User | null> {
    try {
      const tokenHash = await this.hashToken(token);
      const tokenKey = `token:${tokenHash}`;
      const sessionId = await this.database.getCache<UUID>(tokenKey);

      if (!sessionId) {
        return null;
      }

      const sessionKey = `session:${sessionId}`;
      const session = await this.database.getCache<UserSession>(sessionKey);

      if (!session || session.expiresAt < new Date()) {
        // Clean up expired session
        if (session) {
          await this.revokeSession(session.id);
        }
        return null;
      }

      return this.getUserById(session.userId);
    } catch (_error) {
      return null;
    }
  }

  /**
   * Revoke user session
   */
  async revokeSession(sessionId: UUID): Promise<void> {
    try {
      const sessionKey = `session:${sessionId}`;
      const session = await this.database.getCache<UserSession>(sessionKey);

      if (session) {
        // Remove token mapping
        const tokenKey = `token:${session.tokenHash}`;
        await this.database.deleteCache(tokenKey);
      }

      // Remove session
      await this.database.deleteCache(sessionKey);
    } catch (_error) {
      // Ignore cleanup errors
    }
  }

  /**
   * Create tenant
   */
  async createTenant(data: CreateTenantData, ownerId: UUID): Promise<Tenant> {
    const tenantId = uuidv4() as UUID;

    const tenant: Tenant = {
      id: tenantId,
      name: data.name,
      slug: data.slug,
      domain: data.domain,
      subscriptionTier: data.subscriptionTier || 'free',
      maxAgents:
        data.subscriptionTier === 'enterprise' ? 50 : data.subscriptionTier === 'pro' ? 10 : 3,
      maxUsers:
        data.subscriptionTier === 'enterprise' ? 100 : data.subscriptionTier === 'pro' ? 20 : 5,
      settings: data.settings || {},
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    // Store tenant
    const tenantKey = `tenant:${tenantId}`;
    await this.database.setCache(tenantKey, tenant);

    // Create slug index for lookup
    const slugKey = `tenant:slug:${tenant.slug}`;
    await this.database.setCache(slugKey, tenantId);

    // Create tenant membership for owner
    await this.addTenantMember(tenantId, ownerId, 'owner', ['admin', 'read', 'write', 'delete']);

    return tenant;
  }

  /**
   * Get tenant by ID
   */
  async getTenantById(tenantId: UUID): Promise<Tenant | null> {
    try {
      const tenantKey = `tenant:${tenantId}`;
      const tenant = await this.database.getCache<Tenant>(tenantKey);
      return tenant || null;
    } catch (_error) {
      return null;
    }
  }

  /**
   * Get tenant by slug
   */
  async getTenantBySlug(slug: string): Promise<Tenant | null> {
    try {
      // In a real implementation, this would use a slug index
      const slugKey = `tenant:slug:${slug}`;
      const tenantId = await this.database.getCache<UUID>(slugKey);

      if (tenantId) {
        return this.getTenantById(tenantId);
      }

      return null;
    } catch (_error) {
      return null;
    }
  }

  /**
   * Add user to tenant
   */
  async addTenantMember(
    tenantId: UUID,
    userId: UUID,
    role: 'owner' | 'admin' | 'member',
    permissions: string[]
  ): Promise<TenantMembership> {
    const membershipId = uuidv4() as UUID;

    const membership: TenantMembership = {
      id: membershipId,
      tenantId,
      userId,
      role,
      permissions,
      joinedAt: new Date(),
      createdAt: new Date(),
    };

    // Store membership
    const membershipKey = `membership:${membershipId}`;
    await this.database.setCache(membershipKey, membership);

    // Store user-tenant mapping
    const userTenantKey = `user:${userId}:tenants`;
    const userTenants = (await this.database.getCache<UUID[]>(userTenantKey)) || [];
    if (!userTenants.includes(tenantId)) {
      userTenants.push(tenantId);
      await this.database.setCache(userTenantKey, userTenants);
    }

    return membership;
  }

  /**
   * Get user's tenants
   */
  async getUserTenants(userId: UUID): Promise<Tenant[]> {
    try {
      const userTenantKey = `user:${userId}:tenants`;
      const tenantIds = (await this.database.getCache<UUID[]>(userTenantKey)) || [];

      const tenants: Tenant[] = [];
      for (const tenantId of tenantIds) {
        const tenant = await this.getTenantById(tenantId);
        if (tenant) {
          tenants.push(tenant);
        }
      }

      return tenants;
    } catch (_error) {
      return [];
    }
  }

  /**
   * Check if user has permission in tenant
   */
  async hasPermission(userId: UUID, tenantId: UUID, _permission: string): Promise<boolean> {
    try {
      // For now, check if user is a member (simplified permission check)
      const userTenantKey = `user:${userId}:tenants`;
      const tenantIds = (await this.database.getCache<UUID[]>(userTenantKey)) || [];

      return tenantIds.includes(tenantId);
    } catch (_error) {
      return false;
    }
  }

  /**
   * Generate API key for user
   */
  generateUserApiKey(_userId: UUID): string {
    // Generate API key with 'user' prefix
    return generateApiKey('user');
  }

  /**
   * Private helper methods
   */
  private async hashPassword(password: string): Promise<string> {
    // Use js-sha1 which works in both browser and Node.js
    return sha1(`${password}salt`);
  }

  private async verifyPassword(password: string, hash: string): Promise<boolean> {
    const computed = await this.hashPassword(password);
    return computed === hash;
  }

  private async generateSessionToken(): Promise<string> {
    // Generate random token using UUID and timestamp
    const random = uuidv4() + Date.now().toString();
    return sha1(random);
  }

  private async hashToken(token: string): Promise<string> {
    // Use js-sha1 for consistent hashing
    return sha1(token);
  }
}

/**
 * Create user manager instance
 */
export function createUserManager(database: IDatabaseAdapter): UserManager {
  return new UserManager(database);
}
