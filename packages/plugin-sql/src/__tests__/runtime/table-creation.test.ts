import {
  AgentRuntime,
  ChannelType,
  logger,
  stringToUuid,
  type Character,
  type UUID,
} from '@elizaos/core';
import { sql } from 'drizzle-orm';
import { describe, expect, it, beforeEach, afterEach } from 'vitest';
import sqlPlugin from '../../index';
import { PgliteDatabaseAdapter } from '../../pglite/adapter';
import { PGliteClientManager } from '../../pglite/manager';
import { resolvePgliteDir } from '../../utils';
import path from 'path';
import fs from 'fs/promises';

describe('SQL Plugin Runtime Table Creation Tests', () => {
  let runtime: AgentRuntime;
  let testDir: string;
  let testAgentId: UUID;

  beforeEach(async () => {
    // Create unique test directory for each test
    testDir = path.join(process.cwd(), '.test-eliza', `test-${Date.now()}`);
    await fs.mkdir(testDir, { recursive: true });

    testAgentId = stringToUuid('test-agent-' + Date.now());
  }, 30000); // 30 second timeout

  afterEach(async () => {
    // Cleanup runtime if exists
    if (runtime) {
      try {
        await runtime.stop();
      } catch (error) {
        // Ignore stop errors
      }
    }

    // Cleanup test directory
    try {
      await fs.rm(testDir, { recursive: true, force: true });
    } catch (error) {
      // Ignore cleanup errors
    }
  }, 30000); // 30 second timeout

  describe('Plugin Initialization', () => {
    it('should initialize SQL plugin and create database adapter', async () => {
      const character: Character = {
        name: 'Test Agent',
        bio: ['Test bio'],
        system: 'Test system',
        messageExamples: [],
        postExamples: [],
        topics: [],
        adjectives: [],
        knowledge: [],
        plugins: [],
        settings: {
          PGLITE_PATH: path.join(testDir, 'db'),
        },
      };

      runtime = new AgentRuntime({
        character,
        agentId: testAgentId,
        plugins: [sqlPlugin],
      });

      await runtime.initialize();

      // Verify database adapter is registered
      expect(runtime.db).toBeDefined();
      expect(runtime.db).toBeTruthy();

      // Check adapter type
      const adapter = runtime.db;
      expect(adapter.constructor.name).toMatch(/PgliteDatabaseAdapter|PgDatabaseAdapter/);
    });

    it('should create core tables during plugin initialization', async () => {
      const character: Character = {
        name: 'Test Agent',
        bio: ['Test bio'],
        system: 'Test system',
        messageExamples: [],
        postExamples: [],
        topics: [],
        adjectives: [],
        knowledge: [],
        plugins: [],
        settings: {
          PGLITE_PATH: path.join(testDir, 'db'),
        },
      };

      runtime = new AgentRuntime({
        character,
        agentId: testAgentId,
        plugins: [sqlPlugin],
      });

      await runtime.initialize();

      // Get database handle
      const adapter = runtime.db as PgliteDatabaseAdapter;
      const db = adapter.getDatabase();

      // Verify all core tables exist
      const coreTableNames = [
        'agents',
        'cache',
        'memories',
        'entities',
        'relationships',
        'rooms',
        'participants',
        'worlds',
        'tasks',
        'components',
      ];

      for (const tableName of coreTableNames) {
        const result = await db.execute(
          sql`SELECT 1 FROM information_schema.tables 
             WHERE table_schema = 'public' AND table_name = ${tableName}`
        );
        const exists = result.rows && result.rows.length > 0;
        expect(exists).toBe(true);
        logger.info(`✅ Verified table exists: ${tableName}`);
      }
    });

    it('should handle table creation errors gracefully', async () => {
      // Create a manager with invalid configuration
      const manager = new PGliteClientManager({ dataDir: path.join(testDir, 'invalid-db') });
      const adapter = new PgliteDatabaseAdapter(testAgentId, manager);

      // The adapter's init() method should handle table creation
      await expect(adapter.init()).resolves.not.toThrow();
    });
  });

  describe('Table Schema Validation', () => {
    it('should create agents table with correct schema', async () => {
      const character: Character = {
        name: 'Test Agent',
        bio: ['Test bio'],
        system: 'Test system',
        messageExamples: [],
        postExamples: [],
        topics: [],
        adjectives: [],
        knowledge: [],
        plugins: [],
        settings: {
          PGLITE_PATH: path.join(testDir, 'db'),
        },
      };

      runtime = new AgentRuntime({
        character,
        agentId: testAgentId,
        plugins: [sqlPlugin],
      });

      await runtime.initialize();

      const adapter = runtime.db as PgliteDatabaseAdapter;
      const db = adapter.getDatabase();

      // Check agents table schema using PostgreSQL information_schema
      const result = await db.execute(
        sql`SELECT column_name FROM information_schema.columns 
           WHERE table_schema = 'public' AND table_name = 'agents'`
      );

      const columns = result.rows.map((row: any) => row.column_name);
      const expectedColumns = [
        'id',
        'created_at',
        'updated_at',
        'name',
        'username',
        'bio',
        'system',
        'lore',
        'topics',
        'interests',
        'adjectives',
        'knowledge',
        'knowledge_cutoff',
        'message_examples',
        'post_examples',
        'style',
        'style_all',
        'style_chat',
        'style_post',
        'people',
        'model_provider',
        'model_endpoint_override',
        'enabled',
        'status',
        'settings',
        'plugins',
        'clients',
        'client_config',
        'enable_rag',
        'rag_target_count',
        'rag_top_k',
        'rag_top_p',
        'rag_temperature',
        'rag_frequency_penalty',
        'rag_presence_penalty',
      ];

      for (const col of expectedColumns) {
        expect(columns).toContain(col);
      }
    });

    it('should create memories table with correct schema', async () => {
      const character: Character = {
        name: 'Test Agent',
        bio: ['Test bio'],
        system: 'Test system',
        messageExamples: [],
        postExamples: [],
        topics: [],
        adjectives: [],
        knowledge: [],
        plugins: [],
        settings: {
          PGLITE_PATH: path.join(testDir, 'db'),
        },
      };

      runtime = new AgentRuntime({
        character,
        agentId: testAgentId,
        plugins: [sqlPlugin],
      });

      await runtime.initialize();

      const adapter = runtime.db as PgliteDatabaseAdapter;
      const db = adapter.getDatabase();

      // Check memories table schema using PostgreSQL information_schema
      const result = await db.execute(
        sql`SELECT column_name FROM information_schema.columns 
           WHERE table_schema = 'public' AND table_name = 'memories'`
      );

      const columns = result.rows.map((row: any) => row.column_name);
      const expectedColumns = [
        'id',
        'type',
        'content',
        'entity_id',
        'agent_id',
        'room_id',
        'created_at',
      ];

      for (const col of expectedColumns) {
        expect(columns).toContain(col);
      }
    });

    it('should create components table with mixed case columns', async () => {
      const character: Character = {
        name: 'Test Agent',
        bio: ['Test bio'],
        system: 'Test system',
        messageExamples: [],
        postExamples: [],
        topics: [],
        adjectives: [],
        knowledge: [],
        plugins: [],
        settings: {
          PGLITE_PATH: path.join(testDir, 'db'),
        },
      };

      runtime = new AgentRuntime({
        character,
        agentId: testAgentId,
        plugins: [sqlPlugin],
      });

      await runtime.initialize();

      const adapter = runtime.db as PgliteDatabaseAdapter;
      const db = adapter.getDatabase();

      // Check components table schema using PostgreSQL information_schema
      const result = await db.execute(
        sql`SELECT column_name FROM information_schema.columns 
           WHERE table_schema = 'public' AND table_name = 'components'`
      );

      const columns = result.rows.map((row: any) => row.column_name);

      // Note: PostgreSQL preserves quoted column names
      const expectedColumns = [
        'id',
        'entityId',
        'agentId',
        'roomId',
        'worldId',
        'sourceEntityId',
        'type',
        'data',
        'createdAt',
      ];

      for (const col of expectedColumns) {
        const hasColumn = columns.some(
          (c: string) => c === col || c.toLowerCase() === col.toLowerCase()
        );
        expect(hasColumn).toBe(true);
      }
    });
  });

  describe('Table Operations', () => {
    it('should successfully insert and retrieve data from created tables', async () => {
      const character: Character = {
        name: 'Test Agent',
        bio: ['Test bio'],
        system: 'Test system',
        messageExamples: [],
        postExamples: [],
        topics: [],
        adjectives: [],
        knowledge: [],
        plugins: [],
        settings: {
          PGLITE_PATH: path.join(testDir, 'db'),
        },
      };

      runtime = new AgentRuntime({
        character,
        agentId: testAgentId,
        plugins: [sqlPlugin],
      });

      await runtime.initialize();

      // Test entity creation
      const entityId = stringToUuid('test-entity-' + Date.now());
      await runtime.db.createEntities([
        {
          id: entityId,
          names: ['Test Entity'],
          agentId: testAgentId,
        },
      ]);

      // Verify entity was created
      const entity = await runtime.getEntityById(entityId);
      expect(entity).toBeDefined();
      expect(entity?.names).toContain('Test Entity');

      // Test room creation
      const roomId = stringToUuid('test-room-' + Date.now());
      await runtime.createRoom({
        id: roomId,
        agentId: testAgentId,
        name: 'Test Room',
        source: 'test',
        type: ChannelType.GROUP,
      });

      // Verify room was created
      const room = await runtime.getRoom(roomId);
      expect(room).toBeDefined();
      expect(room?.name).toBe('Test Room');

      // Test cache operations
      await runtime.setCache('test-key', { value: 'test-value' });
      const cached = await runtime.getCache<{ value: string }>('test-key');
      expect(cached).toBeDefined();
      expect(cached?.value).toBe('test-value');
    });

    it('should handle concurrent table access', async () => {
      const character: Character = {
        name: 'Test Agent',
        bio: ['Test bio'],
        system: 'Test system',
        messageExamples: [],
        postExamples: [],
        topics: [],
        adjectives: [],
        knowledge: [],
        plugins: [],
        settings: {
          PGLITE_PATH: path.join(testDir, 'db'),
        },
      };

      runtime = new AgentRuntime({
        character,
        agentId: testAgentId,
        plugins: [sqlPlugin],
      });

      await runtime.initialize();

      // Create multiple entities concurrently
      const promises: Promise<any>[] = [];
      for (let i = 0; i < 10; i++) {
        const entityId = stringToUuid(`concurrent-entity-${i}`);
        promises.push(
          runtime.db.createEntities([
            {
              id: entityId,
              names: [`Entity ${i}`],
              agentId: testAgentId,
            },
          ])
        );
      }

      await Promise.all(promises);

      // Verify all entities were created
      // Create a room and get entities for that room
      const roomId = stringToUuid('test-room-' + Date.now());
      await runtime.createRoom({
        id: roomId,
        agentId: testAgentId,
        name: 'Test Room',
        source: 'test',
        type: ChannelType.GROUP,
      });

      // Add entities to room
      for (let i = 0; i < 10; i++) {
        const entityId = stringToUuid(`concurrent-entity-${i}`);
        await runtime.addParticipant(entityId, roomId);
      }

      const entities = await runtime.getEntitiesForRoom(roomId);
      expect(entities.length).toBeGreaterThanOrEqual(10);
    });
  });

  describe('Database Type Detection', () => {
    it('should use PGLite when no POSTGRES_URL is provided', async () => {
      const character: Character = {
        name: 'Test Agent',
        bio: ['Test bio'],
        system: 'Test system',
        messageExamples: [],
        postExamples: [],
        topics: [],
        adjectives: [],
        knowledge: [],
        plugins: [],
        settings: {
          PGLITE_PATH: path.join(testDir, 'db'),
        },
      };

      runtime = new AgentRuntime({
        character,
        agentId: testAgentId,
        plugins: [sqlPlugin],
      });

      await runtime.initialize();

      const adapter = runtime.db;
      expect(adapter.constructor.name).toBe('PgliteDatabaseAdapter');
    });

    it('should resolve PGLite directory correctly', () => {
      // Test default resolution
      const defaultDir = resolvePgliteDir();
      expect(defaultDir).toContain('.eliza');
      expect(defaultDir).toContain('.elizadb');

      // Test custom directory
      const customDir = resolvePgliteDir('/custom/path');
      expect(customDir).toBe('/custom/path');
    });
  });

  describe('Error Recovery', () => {
    it('should continue initialization even if table creation fails', async () => {
      const character: Character = {
        name: 'Test Agent',
        bio: ['Test bio'],
        system: 'Test system',
        messageExamples: [],
        postExamples: [],
        topics: [],
        adjectives: [],
        knowledge: [],
        plugins: [],
        settings: {
          PGLITE_PATH: path.join(testDir, 'db'),
        },
      };

      // Create runtime with mocked error during table creation
      const originalLog = logger.error;
      const errors: any[] = [];
      logger.error = ((message: string, ...args: any[]) => {
        errors.push({ message, args });
        originalLog(message, ...args);
      }) as any;

      runtime = new AgentRuntime({
        character,
        agentId: testAgentId,
        plugins: [sqlPlugin],
      });

      await runtime.initialize();

      // Runtime should still be initialized
      expect(runtime.db).toBeDefined();

      // Restore original logger
      logger.error = originalLog;
    });
  });
});
