// In-memory database for testing
// In production, this would be replaced with a real database

export interface User {
  id: string;
  email: string;
  name: string;
  password: string; // hashed
  avatar?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface ApiKey {
  id: string;
  userId: string;
  name: string;
  key: string;
  lastUsed?: Date;
  createdAt: Date;
  expiresAt?: Date;
}

export interface Organization {
  id: string;
  name: string;
  slug: string;
  ownerId: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Subscription {
  id: string;
  userId: string;
  status: 'active' | 'canceled' | 'past_due' | 'trialing';
  plan: 'basic' | 'pro' | 'premium' | 'enterprise';
  currentPeriodEnd: Date;
  cancelAtPeriodEnd: boolean;
}

// In-memory storage
const users = new Map<string, User>();
const apiKeys = new Map<string, ApiKey>();
const organizations = new Map<string, Organization>();
const subscriptions = new Map<string, Subscription>();

// Seed test user
import { hashPassword } from './auth';

// Initialize test data
(async () => {
  const hashedPassword = await hashPassword('TestPassword123!');
  const testUser: User = {
    id: 'test-user-id',
    email: 'test@elizaos.ai',
    name: 'Test User',
    password: hashedPassword,
    createdAt: new Date(),
    updatedAt: new Date()
  };
  users.set(testUser.id, testUser);
})();

// User operations
export const db = {
  users: {
    create: async (data: Omit<User, 'id' | 'createdAt' | 'updatedAt'>): Promise<User> => {
      const user: User = {
        ...data,
        id: crypto.randomUUID(),
        createdAt: new Date(),
        updatedAt: new Date()
      };
      users.set(user.id, user);
      return user;
    },
    findByEmail: async (email: string): Promise<User | null> => {
      for (const user of Array.from(users.values())) {
        if (user.email === email) return user;
      }
      return null;
    },
    findById: async (id: string): Promise<User | null> => {
      return users.get(id) || null;
    },
    update: async (id: string, data: Partial<User>): Promise<User | null> => {
      const user = users.get(id);
      if (!user) return null;
      const updated = { ...user, ...data, updatedAt: new Date() };
      users.set(id, updated);
      return updated;
    }
  },
  
  apiKeys: {
    create: async (data: Omit<ApiKey, 'id' | 'createdAt'>): Promise<ApiKey> => {
      const apiKey: ApiKey = {
        ...data,
        id: crypto.randomUUID(),
        createdAt: new Date()
      };
      apiKeys.set(apiKey.id, apiKey);
      return apiKey;
    },
    findByKey: async (key: string): Promise<ApiKey | null> => {
      for (const apiKey of Array.from(apiKeys.values())) {
        if (apiKey.key === key) return apiKey;
      }
      return null;
    },
    findByUserId: async (userId: string): Promise<ApiKey[]> => {
      const userKeys: ApiKey[] = [];
      for (const apiKey of Array.from(apiKeys.values())) {
        if (apiKey.userId === userId) userKeys.push(apiKey);
      }
      return userKeys;
    },
    delete: async (id: string): Promise<boolean> => {
      return apiKeys.delete(id);
    },
    updateLastUsed: async (id: string): Promise<void> => {
      const apiKey = apiKeys.get(id);
      if (apiKey) {
        apiKey.lastUsed = new Date();
        apiKeys.set(id, apiKey);
      }
    }
  },
  
  organizations: {
    create: async (data: Omit<Organization, 'id' | 'slug' | 'createdAt' | 'updatedAt'>): Promise<Organization> => {
      const org: Organization = {
        ...data,
        id: crypto.randomUUID(),
        slug: data.name.toLowerCase().replace(/\s+/g, '-'),
        createdAt: new Date(),
        updatedAt: new Date()
      };
      organizations.set(org.id, org);
      return org;
    },
    findByOwnerId: async (ownerId: string): Promise<Organization[]> => {
      const userOrgs: Organization[] = [];
      for (const org of Array.from(organizations.values())) {
        if (org.ownerId === ownerId) userOrgs.push(org);
      }
      return userOrgs;
    }
  },
  
  subscriptions: {
    findByUserId: async (userId: string): Promise<Subscription | null> => {
      for (const sub of Array.from(subscriptions.values())) {
        if (sub.userId === userId) return sub;
      }
      return null;
    },
    create: async (data: Omit<Subscription, 'id'>): Promise<Subscription> => {
      const sub: Subscription = {
        ...data,
        id: crypto.randomUUID()
      };
      subscriptions.set(sub.id, sub);
      return sub;
    }
  }
}; 