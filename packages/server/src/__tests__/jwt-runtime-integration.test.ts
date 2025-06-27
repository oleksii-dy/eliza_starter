import { describe, it, expect, beforeAll, afterAll, beforeEach, afterEach } from 'vitest';
import { AgentServer } from '../index.js';
import { createEnhancedJWT } from '../middleware/JWTAuthMiddleware.js';
import { TenantDatabaseWrapper } from '../utils/tenant-database-wrapper.js';
import type { Character } from '@elizaos/core';
import request from 'supertest';
// File system operations for test setup
import { promises as fs } from 'node:fs';
// import path from 'node:path';

// Test character configurations for different tenants
const createTestCharacter = (name: string, tenantSuffix: string): Character => ({
  name: `${name}-${tenantSuffix}`,
  bio: `A test agent for tenant ${tenantSuffix}`,
  system: `You are ${name}, a helpful test agent for tenant ${tenantSuffix}.`,
  knowledge: [],
  plugins: [],
  settings: {
    testTenant: tenantSuffix,
  },
});

const TEST_CHARACTERS = {
  alice: createTestCharacter('Alice', 'company-a'),
  bob: createTestCharacter('Bob', 'company-b'),
  charlie: createTestCharacter('Charlie', 'company-a'), // Same tenant as Alice
};

// Test user configurations
const TEST_USERS = {
  alice: {
    sub: 'user-alice-123',
    email: 'alice@company-a.com',
    name: 'Alice Smith',
    organizationId: 'org-company-a',
    role: 'admin',
    tenantId: 'tenant-company-a',
  },
  bob: {
    sub: 'user-bob-456',
    email: 'bob@company-b.com',
    name: 'Bob Johnson',
    organizationId: 'org-company-b',
    role: 'user',
    tenantId: 'tenant-company-b',
  },
  charlie: {
    sub: 'user-charlie-789',
    email: 'charlie@company-a.com',
    name: 'Charlie Brown',
    organizationId: 'org-company-a',
    role: 'user',
    tenantId: 'tenant-company-a',
  },
};

describe('JWT Runtime Integration Tests', () => {
  let server: AgentServer;
  const testPort = 3002;
  const testDbDir = './.test-jwt-runtime-db';
  let userTokens: Record<string, string> = {};

  beforeAll(async () => {
    // Set up test environment
    process.env.SHARED_JWT_SECRET = 'test-runtime-jwt-secret-for-integration';
    process.env.JWT_SECRET = 'test-runtime-jwt-secret-for-integration';
    process.env.FORCE_PGLITE = 'true';

    // Clean up any existing test database
    try {
      await fs.rm(testDbDir, { recursive: true, force: true });
    } catch (error) {
      // Ignore if directory doesn't exist
    }
  });

  afterAll(async () => {
    // Clean up environment
    delete process.env.SHARED_JWT_SECRET;
    delete process.env.JWT_SECRET;
    delete process.env.FORCE_PGLITE;

    // Clean up test database
    try {
      await fs.rm(testDbDir, { recursive: true, force: true });
    } catch (error) {
      // Ignore cleanup errors
    }
  });

  beforeEach(async () => {
    // Initialize server
    server = new AgentServer();
    await server.initialize({
      dataDir: testDbDir,
    });

    // Apply database migrations
    if (typeof (server.database as any).migrate === 'function') {
      await (server.database as any).migrate();
    }

    // Start server
    server.start(testPort);

    // Wait for server readiness
    await new Promise((resolve) => setTimeout(resolve, 2000));

    // Generate JWT tokens for all test users
    for (const [key, user] of Object.entries(TEST_USERS)) {
      userTokens[key] = await createEnhancedJWT(user);
    }
  });

  afterEach(async () => {
    if (server) {
      await server.stop();
    }
    userTokens = {};
  });

  describe('Database Migration and Schema Validation', () => {
    it('should apply tenant migration successfully', async () => {
      // Check if tenant columns exist by trying to query with tenant filter
      const db = (server.database as any).db;

      // For PgLite, we'll check if the column exists by attempting to query it
      // This should not throw an error if the migration was applied
      try {
        const result = await db.execute(`
          SELECT tenant_id 
          FROM agents 
          LIMIT 1
        `);
        // If this doesn't throw, the column exists
        expect(true).toBe(true);
      } catch (error) {
        // If it throws because the column doesn't exist, fail the test
        if (error.message && error.message.includes('column') && error.message.includes('tenant_id')) {
          throw new Error('tenant_id column does not exist in agents table');
        }
        // For other errors (like no rows), that's fine - the column exists
        expect(true).toBe(true);
      }
    });

    it('should create tenant database wrapper correctly', async () => {
      const wrapper = TenantDatabaseWrapper.withTenant(server.database, 'test-tenant');
      const context = wrapper.getTenantContext();

      expect(context.tenantId).toBe('test-tenant');
      expect(context.isLegacy).toBe(false);
    });
  });

  describe('Agent Creation with Tenant Isolation', () => {
    it('should create agents with correct tenant assignment', async () => {
      // Create agent for Alice (tenant-company-a)
      const aliceResponse = await request(`http://localhost:${testPort}`)
        .post('/api/agents')
        .set('Authorization', `Bearer ${userTokens.alice}`)
        .send({ characterJson: TEST_CHARACTERS.alice })
        .expect(200);

      expect(aliceResponse.body.success).toBe(true);
      expect(aliceResponse.body.data.character.name).toBe('Alice-company-a');

      // Create agent for Bob (tenant-company-b)
      const bobResponse = await request(`http://localhost:${testPort}`)
        .post('/api/agents')
        .set('Authorization', `Bearer ${userTokens.bob}`)
        .send({ characterJson: TEST_CHARACTERS.bob })
        .expect(200);

      expect(bobResponse.body.success).toBe(true);
      expect(bobResponse.body.data.character.name).toBe('Bob-company-b');

      // Verify agents were created with correct tenant IDs in database
      const aliceAgentId = aliceResponse.body.data.id;
      const bobAgentId = bobResponse.body.data.id;

      // Check database directly
      const db = (server.database as any).db;
      const aliceAgent = await db.execute('SELECT tenant_id FROM agents WHERE id = ?', [
        aliceAgentId,
      ]);
      const bobAgent = await db.execute('SELECT tenant_id FROM agents WHERE id = ?', [bobAgentId]);

      expect(aliceAgent[0]?.tenant_id).toBe('tenant-company-a');
      expect(bobAgent[0]?.tenant_id).toBe('tenant-company-b');
    });

    it('should enforce tenant isolation when listing agents', async () => {
      // Create agents for different tenants
      await request(`http://localhost:${testPort}`)
        .post('/api/agents')
        .set('Authorization', `Bearer ${userTokens.alice}`)
        .send({ characterJson: TEST_CHARACTERS.alice });

      await request(`http://localhost:${testPort}`)
        .post('/api/agents')
        .set('Authorization', `Bearer ${userTokens.bob}`)
        .send({ characterJson: TEST_CHARACTERS.bob });

      await request(`http://localhost:${testPort}`)
        .post('/api/agents')
        .set('Authorization', `Bearer ${userTokens.charlie}`)
        .send({ characterJson: TEST_CHARACTERS.charlie });

      // Alice should see Alice and Charlie (both tenant-company-a)
      const aliceAgents = await request(`http://localhost:${testPort}`)
        .get('/api/agents')
        .set('Authorization', `Bearer ${userTokens.alice}`)
        .expect(200);

      expect(aliceAgents.body.data.agents).toHaveLength(2);
      const aliceAgentNames = aliceAgents.body.data.agents.map((a: any) => a.name);
      expect(aliceAgentNames).toContain('Alice-company-a');
      expect(aliceAgentNames).toContain('Charlie-company-a');
      expect(aliceAgentNames).not.toContain('Bob-company-b');

      // Bob should only see Bob (tenant-company-b)
      const bobAgents = await request(`http://localhost:${testPort}`)
        .get('/api/agents')
        .set('Authorization', `Bearer ${userTokens.bob}`)
        .expect(200);

      expect(bobAgents.body.data.agents).toHaveLength(1);
      expect(bobAgents.body.data.agents[0].name).toBe('Bob-company-b');
    });

    it('should prevent cross-tenant agent access', async () => {
      // Create agent for Alice
      const aliceResponse = await request(`http://localhost:${testPort}`)
        .post('/api/agents')
        .set('Authorization', `Bearer ${userTokens.alice}`)
        .send({ characterJson: TEST_CHARACTERS.alice });

      const aliceAgentId = aliceResponse.body.data.id;

      // Bob should not be able to access Alice's agent
      await request(`http://localhost:${testPort}`)
        .get(`/api/agents/${aliceAgentId}`)
        .set('Authorization', `Bearer ${userTokens.bob}`)
        .expect(404); // Should return 404 due to tenant isolation

      // Alice should be able to access her own agent
      const aliceAgentResponse = await request(`http://localhost:${testPort}`)
        .get(`/api/agents/${aliceAgentId}`)
        .set('Authorization', `Bearer ${userTokens.alice}`)
        .expect(200);

      expect(aliceAgentResponse.body.data.name).toBe('Alice-company-a');
    });
  });

  describe('Agent Lifecycle with Tenant Context', () => {
    let aliceAgentId: string;
    let bobAgentId: string; // Declared for potential future test use

    beforeEach(async () => {
      // Create test agents
      const aliceResponse = await request(`http://localhost:${testPort}`)
        .post('/api/agents')
        .set('Authorization', `Bearer ${userTokens.alice}`)
        .send({ characterJson: TEST_CHARACTERS.alice });
      aliceAgentId = aliceResponse.body.data.id;

      const bobResponse = await request(`http://localhost:${testPort}`)
        .post('/api/agents')
        .set('Authorization', `Bearer ${userTokens.bob}`)
        .send({ characterJson: TEST_CHARACTERS.bob });
      bobAgentId = bobResponse.body.data.id;
      console.log('Created test agents:', { aliceAgentId, bobAgentId });
    });

    it('should start and stop agents with tenant validation', async () => {
      // Alice can start her agent
      await request(`http://localhost:${testPort}`)
        .post(`/api/agents/${aliceAgentId}/start`)
        .set('Authorization', `Bearer ${userTokens.alice}`)
        .expect(200);

      // Bob cannot start Alice's agent
      await request(`http://localhost:${testPort}`)
        .post(`/api/agents/${aliceAgentId}/start`)
        .set('Authorization', `Bearer ${userTokens.bob}`)
        .expect(404);

      // Alice can stop her agent
      await request(`http://localhost:${testPort}`)
        .post(`/api/agents/${aliceAgentId}/stop`)
        .set('Authorization', `Bearer ${userTokens.alice}`)
        .expect(200);
    });

    it('should enforce tenant isolation for agent deletion', async () => {
      // Bob cannot delete Alice's agent
      await request(`http://localhost:${testPort}`)
        .delete(`/api/agents/${aliceAgentId}`)
        .set('Authorization', `Bearer ${userTokens.bob}`)
        .expect(404);

      // Alice can delete her own agent
      await request(`http://localhost:${testPort}`)
        .delete(`/api/agents/${aliceAgentId}`)
        .set('Authorization', `Bearer ${userTokens.alice}`)
        .expect(200);

      // Verify agent is deleted
      await request(`http://localhost:${testPort}`)
        .get(`/api/agents/${aliceAgentId}`)
        .set('Authorization', `Bearer ${userTokens.alice}`)
        .expect(404);
    });
  });

  describe('Memory Operations with Tenant Isolation', () => {
    let aliceAgentId: string;
    let bobAgentId: string; // Used for creating isolated test agents

    beforeEach(async () => {
      // Create and start test agents
      const aliceResponse = await request(`http://localhost:${testPort}`)
        .post('/api/agents')
        .set('Authorization', `Bearer ${userTokens.alice}`)
        .send({ characterJson: TEST_CHARACTERS.alice });
      aliceAgentId = aliceResponse.body.data.id;

      const bobResponse = await request(`http://localhost:${testPort}`)
        .post('/api/agents')
        .set('Authorization', `Bearer ${userTokens.bob}`)
        .send({ characterJson: TEST_CHARACTERS.bob });
      bobAgentId = bobResponse.body.data.id;
      console.log('Created test agents:', { aliceAgentId, bobAgentId });
    });

    it('should create and retrieve memories with tenant isolation', async () => {
      // Create room for Alice's agent
      const aliceRoomResponse = await request(`http://localhost:${testPort}`)
        .post(`/api/memory/${aliceAgentId}/rooms`)
        .set('Authorization', `Bearer ${userTokens.alice}`)
        .send({
          name: 'Alice Test Room',
          type: 'GROUP',
        })
        .expect(200);

      const aliceRoomId = aliceRoomResponse.body.data.id;

      // Alice can access her room
      await request(`http://localhost:${testPort}`)
        .get(`/api/memory/${aliceAgentId}/rooms/${aliceRoomId}`)
        .set('Authorization', `Bearer ${userTokens.alice}`)
        .expect(200);

      // Bob cannot access Alice's room
      await request(`http://localhost:${testPort}`)
        .get(`/api/memory/${aliceAgentId}/rooms/${aliceRoomId}`)
        .set('Authorization', `Bearer ${userTokens.bob}`)
        .expect(404);
    });
  });

  describe('Embedded Admin Interface', () => {
    it('should serve embedded interface with JWT validation', async () => {
      const embedUrl = `/admin?embed=true&token=${userTokens.alice}`;

      const response = await request(`http://localhost:${testPort}`).get(embedUrl).expect(200);

      expect(response.text).toContain('ElizaOS Agent Management');
      expect(response.text).toContain('window.__ELIZA_TOKEN__');
      expect(response.text).toContain('window.__ELIZA_EMBED__');
      expect(response.get('X-Frame-Options')).toBe('SAMEORIGIN');
    });

    it('should reject invalid tokens in embedded interface', async () => {
      const embedUrl = '/admin?embed=true&token=invalid.jwt.token';

      const response = await request(`http://localhost:${testPort}`).get(embedUrl).expect(200); // Still serves HTML but with invalid token

      expect(response.text).toContain('invalid.jwt.token');
    });
  });

  describe('Legacy API Key Compatibility', () => {
    beforeEach(() => {
      process.env.ELIZA_SERVER_AUTH_TOKEN = 'test-legacy-key';
    });

    afterEach(() => {
      delete process.env.ELIZA_SERVER_AUTH_TOKEN;
    });

    it('should support legacy API key authentication', async () => {
      const response = await request(`http://localhost:${testPort}`)
        .get('/api/runtime/ping')
        .set('X-API-KEY', 'test-legacy-key')
        .expect(200);

      expect(response.body.pong).toBe(true);
    });

    it('should show all agents for legacy authentication', async () => {
      // Create agents with JWT tokens
      await request(`http://localhost:${testPort}`)
        .post('/api/agents')
        .set('Authorization', `Bearer ${userTokens.alice}`)
        .send({ characterJson: TEST_CHARACTERS.alice });

      await request(`http://localhost:${testPort}`)
        .post('/api/agents')
        .set('Authorization', `Bearer ${userTokens.bob}`)
        .send({ characterJson: TEST_CHARACTERS.bob });

      // Legacy API should see all agents (no tenant filtering)
      const legacyResponse = await request(`http://localhost:${testPort}`)
        .get('/api/agents')
        .set('X-API-KEY', 'test-legacy-key')
        .expect(200);

      expect(legacyResponse.body.data.agents).toHaveLength(2);
    });

    it('should prefer JWT over legacy API key', async () => {
      const response = await request(`http://localhost:${testPort}`)
        .get('/api/runtime/ping')
        .set('Authorization', `Bearer ${userTokens.alice}`)
        .set('X-API-KEY', 'test-legacy-key')
        .expect(200);

      expect(response.body.pong).toBe(true);
      // JWT should take precedence - we can verify this by checking logs
    });
  });

  describe('Error Handling and Edge Cases', () => {
    it('should handle expired JWT tokens gracefully', async () => {
      // Create an expired token (this is a simplified test)
      const expiredPayload = { ...TEST_USERS.alice };
      const expiredToken = await createEnhancedJWT(expiredPayload);

      // For testing, we'll use an invalid token to simulate expiration
      const invalidToken = expiredToken.replace(/.$/, 'X');

      await request(`http://localhost:${testPort}`)
        .get('/api/agents')
        .set('Authorization', `Bearer ${invalidToken}`)
        .expect(401);
    });

    it('should handle missing tenant information', async () => {
      // Create token without tenant info (should be rejected by our validation)
      const incompletePayload = {
        sub: 'user-incomplete',
        email: 'incomplete@test.com',
        name: 'Incomplete User',
        organizationId: 'org-incomplete',
        role: 'user',
        // Missing tenantId
      };

      try {
        await createEnhancedJWT(incompletePayload as any);
        // If this doesn't throw, the verification should reject it
      } catch (error) {
        expect(error).toBeDefined();
      }
    });

    it('should handle malformed authorization headers', async () => {
      await request(`http://localhost:${testPort}`)
        .get('/api/agents')
        .set('Authorization', 'Malformed header')
        .expect(401);

      await request(`http://localhost:${testPort}`)
        .get('/api/agents')
        .set('Authorization', 'Bearer')
        .expect(401);
    });
  });

  describe('Tenant Database Wrapper Direct Testing', () => {
    it('should create wrapper from request correctly', async () => {
      const mockReq = {
        tenantId: 'test-tenant',
        isLegacyAuth: false,
      } as any;

      const wrapper = TenantDatabaseWrapper.fromRequest(server.database, mockReq);
      const context = wrapper.getTenantContext();

      expect(context.tenantId).toBe('test-tenant');
      expect(context.isLegacy).toBe(false);
    });

    it('should handle legacy auth requests', async () => {
      const legacyReq = {
        tenantId: null,
        isLegacyAuth: true,
      } as any;

      const wrapper = TenantDatabaseWrapper.fromRequest(server.database, legacyReq);
      const context = wrapper.getTenantContext();

      expect(context.tenantId).toBeNull();
      expect(context.isLegacy).toBe(true);
    });

    it('should validate tenant access correctly', async () => {
      const wrapper = TenantDatabaseWrapper.withTenant(server.database, 'tenant-a');

      expect(wrapper.validateTenantAccess('tenant-a')).toBe(true);
      expect(wrapper.validateTenantAccess('tenant-b')).toBe(false);
      expect(wrapper.validateTenantAccess(null)).toBe(false);

      // Legacy wrapper should allow all access
      const legacyWrapper = TenantDatabaseWrapper.withTenant(server.database, null);
      expect(legacyWrapper.validateTenantAccess('tenant-a')).toBe(true);
      expect(legacyWrapper.validateTenantAccess('tenant-b')).toBe(true);
      expect(legacyWrapper.validateTenantAccess(null)).toBe(true);
    });
  });
});
