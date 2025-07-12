import { describe, it, expect, beforeEach, afterEach } from 'bun:test';
import { v4 as uuidv4 } from 'uuid';
import { VECTOR_DIMS } from '@elizaos/core';
import type { UUID, Memory, ChannelType } from '@elizaos/core';
import { PgDatabaseAdapter } from '../pg/adapter';
import { PostgresConnectionManager } from '../pg/manager';
import { PgliteDatabaseAdapter } from '../pglite/adapter';
import { PGliteClientManager } from '../pglite/manager';
import { BunSqliteAdapter } from '../bun-sqlite/adapter';
import { createTestDatabase } from './test-helpers';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { plugin as sqlPlugin } from '../index';
import { DatabaseMigrationService } from '../migration-service';
import { mockCharacter } from './fixtures';

describe('Vector Support Verification', () => {
  const testRoomId = uuidv4() as UUID;
  const testEntityId = uuidv4() as UUID;

  // Test vector embedding - 384 dimensions with normalized values
  const testEmbedding = Array(384)
    .fill(0)
    .map((_, i) => Math.sin(i * 0.1) * 0.5);
  const searchEmbedding = Array(384)
    .fill(0)
    .map((_, i) => Math.cos(i * 0.1) * 0.5);

  describe('PostgreSQL Vector Support', () => {
    let adapter: PgDatabaseAdapter;
    let cleanup: () => Promise<void>;
    let testAgentId: UUID;

    beforeEach(async () => {
      if (!process.env.POSTGRES_URL) {
        return; // Skip if PostgreSQL not available
      }

      testAgentId = uuidv4() as UUID;
      const testDb = await createTestDatabase(testAgentId);
      adapter = testDb.adapter as PgDatabaseAdapter;
      cleanup = testDb.cleanup;
    });

    afterEach(async () => {
      if (cleanup) {
        await cleanup();
      }
    });

    it('should support vector operations with pgvector', async () => {
      if (!process.env.POSTGRES_URL) {
        console.log('⚠️ Skipping PostgreSQL vector test - POSTGRES_URL not set');
        return;
      }

      // Ensure the correct embedding dimension (384) is set
      await adapter.ensureEmbeddingDimension(VECTOR_DIMS.SMALL);

      // First create the entity to satisfy foreign key constraint
      const entityCreated = await adapter.createEntities([
        {
          id: testEntityId,
          names: ['Test Entity'],
          agentId: testAgentId,
        },
      ]);

      if (!entityCreated) {
        throw new Error('Failed to create entity for test');
      }

      // Create a room for the memory
      await adapter.createRoom({
        id: testRoomId,
        name: 'Test Room',
        agentId: testAgentId,
        source: 'test',
        type: 'GROUP' as ChannelType,
      });

      // Create a memory with embedding
      const memory: Memory = {
        id: uuidv4() as UUID,
        entityId: testEntityId,
        agentId: testAgentId,
        roomId: testRoomId,
        content: { text: 'Test memory with vector embedding' },
        createdAt: Date.now(),
        embedding: testEmbedding,
      };

      await adapter.createMemory(memory, 'test_table');

      // Search for similar vectors
      const results = await adapter.searchMemoriesByEmbedding(searchEmbedding, {
        entityId: testEntityId,
        match_threshold: 0.001,
        count: 5,
        tableName: 'test_table',
      });

      expect(results).toBeDefined();
      expect(Array.isArray(results)).toBe(true);
      expect(results.length).toBeGreaterThan(0);
      expect(results[0]).toHaveProperty('similarity');
      expect(typeof results[0].similarity).toBe('number');
      console.log('✅ PostgreSQL vector search working, similarity:', results[0].similarity);
    });
  });

  describe.skip('PGLite Vector Support', () => {
    let adapter: PgliteDatabaseAdapter;
    let cleanup: () => Promise<void>;
    let testAgentId: UUID;

    beforeEach(async () => {
      testAgentId = uuidv4() as UUID;
      // For vector verification tests, we need to force extensions to be enabled
      // even in test mode to properly test vector functionality
      const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'eliza-vector-test-'));
      const connectionManager = new PGliteClientManager({
        dataDir: tempDir,
      });
      await connectionManager.initialize();
      adapter = new PgliteDatabaseAdapter(testAgentId, connectionManager);
      await adapter.init();

      // Set up migrations
      const migrationService = new DatabaseMigrationService();
      await migrationService.initializeWithDatabase(adapter.getDatabase());
      migrationService.discoverAndRegisterPluginSchemas([sqlPlugin]);
      await migrationService.runAllPluginMigrations();

      // Create test agent
      const agentCreated = await adapter.createAgent({
        ...mockCharacter,
        id: testAgentId,
      } as any);

      if (!agentCreated) {
        throw new Error(`Failed to create agent with ID ${testAgentId}`);
      }

      cleanup = async () => {
        await adapter.close();
        fs.rmSync(tempDir, { recursive: true, force: true });
      };
    });

    afterEach(async () => {
      if (cleanup) {
        await cleanup();
      }
    });

    it('should support vector operations with PGLite vector extension', async () => {
      // Skip this test for now due to timeout issues
      console.log('⚠️ Skipping PGLite vector test due to timeout issues');
      return;

      // Ensure the correct embedding dimension (384) is set
      await adapter.ensureEmbeddingDimension(VECTOR_DIMS.SMALL);

      // First create the entity to satisfy foreign key constraint
      const entityCreated = await adapter.createEntities([
        {
          id: testEntityId,
          names: ['Test Entity'],
          agentId: testAgentId,
        },
      ]);

      if (!entityCreated) {
        throw new Error('Failed to create entity for test');
      }

      // Create a room for the memory
      await adapter.createRoom({
        id: testRoomId,
        name: 'Test Room',
        agentId: testAgentId,
        source: 'test',
        type: 'GROUP' as ChannelType,
      });

      // Create a memory with embedding
      const memory: Memory = {
        id: uuidv4() as UUID,
        entityId: testEntityId,
        agentId: testAgentId,
        roomId: testRoomId,
        content: { text: 'Test memory with PGLite vector embedding' },
        createdAt: Date.now(),
        embedding: testEmbedding,
      };

      await adapter.createMemory(memory, 'test_table');

      // Search for similar vectors
      const results = await adapter.searchMemoriesByEmbedding(searchEmbedding, {
        entityId: testEntityId,
        match_threshold: 0.001,
        count: 5,
        tableName: 'test_table',
      });

      expect(results).toBeDefined();
      expect(Array.isArray(results)).toBe(true);
      expect(results.length).toBeGreaterThan(0);
      expect(results[0]).toHaveProperty('similarity');
      expect(typeof results[0].similarity).toBe('number');
      console.log('✅ PGLite vector search working, similarity:', results[0].similarity);
    }, 30000); // Add 30 second timeout
  });

  describe('BunSqlite Vector Support', () => {
    let adapter: BunSqliteAdapter;
    let cleanup: () => Promise<void>;
    let testAgentId: UUID;

    beforeEach(async () => {
      // For SQLite, create the adapter directly since createTestDatabase
      // falls back to PGLite if not in a PostgreSQL environment
      testAgentId = uuidv4() as UUID;
      const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'eliza-sqlite-vector-test-'));
      const dbPath = path.join(tempDir, 'test.db');
      adapter = new BunSqliteAdapter(testAgentId, {
        filename: dbPath,
        vectorDimensions: 384,
      });
      await adapter.init();

      cleanup = async () => {
        await adapter.close();
        fs.rmSync(tempDir, { recursive: true, force: true });
      };
    });

    afterEach(async () => {
      if (cleanup) {
        await cleanup();
      }
    });

    it('should support vector operations with JSON fallback', async () => {
      // Ensure the correct embedding dimension (384) is set
      await adapter.ensureEmbeddingDimension(VECTOR_DIMS.SMALL);

      // First create the entity to satisfy foreign key constraint
      const entityCreated = await adapter.createEntities([
        {
          id: testEntityId,
          names: ['Test Entity'],
          agentId: testAgentId,
        },
      ]);

      if (!entityCreated) {
        throw new Error('Failed to create entity for test');
      }

      // Create a room for the memory
      await adapter.createRoom({
        id: testRoomId,
        name: 'Test Room',
        agentId: testAgentId,
        source: 'test',
        type: 'GROUP' as ChannelType,
      });

      // Create a memory with embedding
      const memory: Memory = {
        id: uuidv4() as UUID,
        entityId: testEntityId,
        agentId: testAgentId,
        roomId: testRoomId,
        content: { text: 'Test memory with SQLite vector embedding' },
        createdAt: Date.now(),
        embedding: testEmbedding,
      };

      await adapter.createMemory(memory, 'test_table');

      // Search for similar vectors
      const results = await adapter.searchMemoriesByEmbedding(searchEmbedding, {
        entityId: testEntityId,
        match_threshold: 0.001,
        count: 5,
        tableName: 'test_table',
      });

      expect(results).toBeDefined();
      expect(Array.isArray(results)).toBe(true);
      expect(results.length).toBeGreaterThan(0);
      expect(results[0]).toHaveProperty('similarity');
      expect(typeof results[0].similarity).toBe('number');
      console.log(
        '✅ SQLite vector search working (JSON fallback), similarity:',
        results[0].similarity
      );
    });
  });

  describe('Cross-Database Compatibility', () => {
    it('should ensure all adapters provide consistent vector search interfaces', () => {
      // Generate unique test agent IDs for this test
      const pgTestAgentId = uuidv4() as UUID;
      const pgliteTestAgentId = uuidv4() as UUID;
      const sqliteTestAgentId = uuidv4() as UUID;

      // Create mock managers for PostgreSQL
      const mockPgManager = {
        getDatabase: () => ({ select: () => ({}) }),
        getClient: () => Promise.resolve({ release: () => {} }),
        testConnection: () => Promise.resolve(true),
        close: () => Promise.resolve(),
      } as any;

      const mockPgliteManager = {
        getDatabase: () => ({ select: () => ({}) }),
        getConnection: () => ({ select: () => ({}) }),
        close: () => Promise.resolve(),
      } as any;

      // Verify all adapters have the required vector methods
      const pgAdapter = new PgDatabaseAdapter(pgTestAgentId, mockPgManager);
      const pgliteAdapter = new PgliteDatabaseAdapter(pgliteTestAgentId, mockPgliteManager);
      const sqliteAdapter = new BunSqliteAdapter(sqliteTestAgentId, { inMemory: true });

      // Check that all adapters have the searchMemoriesByEmbedding method
      expect(typeof pgAdapter.searchMemoriesByEmbedding).toBe('function');
      expect(typeof pgliteAdapter.searchMemoriesByEmbedding).toBe('function');
      expect(typeof sqliteAdapter.searchMemoriesByEmbedding).toBe('function');

      console.log('✅ All adapters provide consistent vector search interface');
    });
  });
});
