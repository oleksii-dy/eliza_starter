import { describe, it, expect, beforeEach, afterEach } from 'bun:test';
import { AgentRuntime } from '@elizaos/core';
import { plugin as sqlPlugin } from '../../index';
import { PGliteClientManager } from '../../pglite/manager';
import { connectionRegistry } from '../../connection-registry';
import { TestDbManager } from '../test-db-utils';
import type { UUID } from '@elizaos/core';

// Simple character for testing
const testCharacter = {
  name: 'StartupTestAgent',
  bio: ['Test agent for startup cycle verification'],
  system: 'You are a test agent.',
  messageExamples: [],
  postExamples: [],
  topics: [],
  knowledge: [],,
  plugins: ['@elizaos/plugin-sql'],
};

describe('Startup Cycle Integration Test', () => {
  let dbManager: TestDbManager;

  beforeEach(async () => {
    // Create test database manager
    dbManager = new TestDbManager();

    // Force cleanup all existing instances
    await PGliteClientManager.forceCleanupAll();
    connectionRegistry.clearAll();
  });

  afterEach(async () => {
    // Force cleanup all instances
    await PGliteClientManager.forceCleanupAll();
    connectionRegistry.clearAll();

    // Clean up test databases
    await dbManager.cleanupAll();
  });

  it('should handle full startup->shutdown->startup cycle without corruption', async () => {
    // Create test database directory
    const testDataDir = await dbManager.createTestDb('startup-cycle');

    console.log('🧪 Testing startup cycle with data dir:', testDataDir);

    // ========== FIRST STARTUP ==========
    console.log('📦 First startup - creating runtime...');
    const runtime1 = new AgentRuntime({
      ...testCharacter,
      id: 'test-agent-startup-1' as UUID,
    });

    // Set PGLite path via settings
    runtime1.settings = { SQLITE_DATA_DIR: testDataDir };

    // Initialize SQL plugin
    console.log('🔌 Initializing SQL plugin...');
    await sqlPlugin.init({}, runtime1);

    // Verify adapter is working
    const adapter1 = runtime1.databaseAdapter;
    expect(adapter1).toBeDefined();
    expect(await adapter1.isReady()).toBe(true);

    // Create test data
    console.log('💾 Creating test data...');
    const testEntityId = 'startup-test-entity' as UUID;
    await adapter1.createEntities([
      {
        id: testEntityId,
        names: ['Startup Test Entity'],
        metadata: {
          startup: 1,
          timestamp: Date.now(),
          message: 'First startup session',
        },
        agentId: runtime1.agentId,
      },
    ]);

    // Verify data was created
    const entities1 = await adapter1.getEntitiesByIds([testEntityId]);
    expect(entities1).toHaveLength(1);
    expect(entities1[0].metadata.startup).toBe(1);
    console.log('✅ First startup data created successfully');

    // ========== SHUTDOWN ==========
    console.log('🛑 Shutting down first runtime...');
    await adapter1.close();

    // Clear registry (simulates process shutdown)
    connectionRegistry.clearAll();

    // CRITICAL: Don't force cleanup global instance - simulate normal shutdown
    // This is where the corruption might occur
    console.log('⏱️  Simulating brief shutdown period...');
    await new Promise((resolve) => setTimeout(resolve, 1000));

    // ========== SECOND STARTUP ==========
    console.log('📦 Second startup - creating new runtime...');
    const runtime2 = new AgentRuntime({
      ...testCharacter,
      id: 'test-agent-startup-2' as UUID,
    });

    // Set same PGLite path
    runtime2.settings = { SQLITE_DATA_DIR: testDataDir };

    // This is where the WebAssembly abort might occur
    console.log('🔌 Re-initializing SQL plugin...');
    await sqlPlugin.init({}, runtime2);

    // Verify adapter is working after restart
    const adapter2 = runtime2.databaseAdapter;
    expect(adapter2).toBeDefined();
    expect(await adapter2.isReady()).toBe(true);

    // Verify data persisted through shutdown/startup cycle
    console.log('🔍 Verifying data persistence...');
    const entities2 = await adapter2.getEntitiesByIds([testEntityId]);
    expect(entities2).toHaveLength(1);
    expect(entities2[0].metadata.startup).toBe(1);
    expect(entities2[0].metadata.message).toBe('First startup session');

    // Create additional data in second session
    const testEntityId2 = 'startup-test-entity-2' as UUID;
    await adapter2.createEntities([
      {
        id: testEntityId2,
        names: ['Second Session Entity'],
        metadata: {
          startup: 2,
          timestamp: Date.now(),
          message: 'Second startup session',
        },
        agentId: runtime2.agentId,
      },
    ]);

    // Verify both entities exist
    const allEntities = await adapter2.getEntitiesByIds([testEntityId, testEntityId2]);
    expect(allEntities).toHaveLength(2);

    console.log('✅ Second startup successful - data persistence verified');

    // Clean shutdown
    await adapter2.close();

    console.log('🎉 Startup cycle test completed successfully!');
  }, 60000); // 60 second timeout for this test

  it('should handle immediate restart without corruption', async () => {
    console.log('🧪 Testing immediate restart cycle...');

    // Create test database directory
    const testDataDir = await dbManager.createTestDb('immediate-restart');

    // First startup
    const runtime1 = new AgentRuntime({
      ...testCharacter,
      id: 'test-agent-immediate' as UUID,
    });
    runtime1.settings = { SQLITE_DATA_DIR: testDataDir };

    await sqlPlugin.init({}, runtime1);
    const adapter1 = runtime1.databaseAdapter;

    // Create data
    const entityId = 'immediate-test-entity' as UUID;
    await adapter1.createEntities([
      {
        id: entityId,
        names: ['Immediate Test'],
        metadata: { session: 1 },
        agentId: runtime1.agentId,
      },
    ]);

    // Immediate shutdown and restart (worst case scenario)
    await adapter1.close();
    connectionRegistry.clearAll();

    // NO WAIT - immediate restart
    console.log('⚡ Immediate restart (no delay)...');

    const runtime2 = new AgentRuntime({
      ...testCharacter,
      id: 'test-agent-immediate-2' as UUID,
    });
    runtime2.settings = { SQLITE_DATA_DIR: testDataDir };

    // This should handle any WebAssembly conflicts gracefully
    await sqlPlugin.init({}, runtime2);
    const adapter2 = runtime2.databaseAdapter;

    // Verify data survived immediate restart
    const entities = await adapter2.getEntitiesByIds([entityId]);
    expect(entities).toHaveLength(1);
    expect(entities[0].metadata.session).toBe(1);

    await adapter2.close();
    console.log('✅ Immediate restart test passed');
  }, 30000);

  it('should create database on first startup and access it on second startup', async () => {
    console.log('🧪 Testing database creation and access cycle...');

    // Create test database directory
    const testDataDir = await dbManager.createTestDb('db-creation-access');

    // First startup - should create database
    const runtime1 = new AgentRuntime({
      ...testCharacter,
      id: 'test-agent-creation' as UUID,
    });
    runtime1.settings = { SQLITE_DATA_DIR: testDataDir };

    await sqlPlugin.init({}, runtime1);
    const adapter1 = runtime1.databaseAdapter;

    // Database should now exist (or be in memory)
    expect(await adapter1.isReady()).toBe(true);

    // Create some meaningful data
    const roomId = 'test-room' as UUID;
    const entityId = 'test-user' as UUID;

    // Create entity
    await adapter1.createEntities([
      {
        id: entityId,
        names: ['Test User'],
        metadata: { role: 'user' },
        agentId: runtime1.agentId,
      },
    ]);

    // Create room
    await adapter1.createRoom({
      id: roomId,
      name: 'Test Room',
      agentId: runtime1.agentId,
      source: 'test',
      type: 'DM' as any,
    });

    // Create memory
    await adapter1.createMemory(
      {
        id: 'test-memory' as UUID,
        entityId: entityId,
        agentId: runtime1.agentId,
        roomId: roomId,
        content: {
          text: 'Hello from first session',
          source: 'test',
        },
        createdAt: Date.now(),
      },
      'messages'
    );

    // Shutdown
    await adapter1.close();
    connectionRegistry.clearAll();

    console.log('🔄 Restarting to access existing database...');

    // Second startup - should access existing database
    const runtime2 = new AgentRuntime({
      ...testCharacter,
      id: 'test-agent-access' as UUID,
    });
    runtime2.settings = { SQLITE_DATA_DIR: testDataDir };

    await sqlPlugin.init({}, runtime2);
    const adapter2 = runtime2.databaseAdapter;

    // Should be able to access all existing data
    const entities = await adapter2.getEntitiesByIds([entityId]);
    expect(entities).toHaveLength(1);
    expect(entities[0].names).toContain('Test User');

    const room = await adapter2.getRoom(roomId);
    expect(room).toBeDefined();
    expect(room.name).toBe('Test Room');

    const memories = await adapter2.getMemories({
      roomId: roomId,
      count: 10,
    });
    expect(memories).toHaveLength(1);
    expect(memories[0].content.text).toBe('Hello from first session');

    // Add new data in second session
    await adapter2.createMemory(
      {
        id: 'test-memory-2' as UUID,
        entityId: entityId,
        agentId: runtime2.agentId,
        roomId: roomId,
        content: {
          text: 'Hello from second session',
          source: 'test',
        },
        createdAt: Date.now(),
      },
      'messages'
    );

    // Verify both memories exist
    const allMemories = await adapter2.getMemories({
      roomId: roomId,
      count: 10,
    });
    expect(allMemories).toHaveLength(2);

    await adapter2.close();
    console.log('✅ Database persistence test passed');
  }, 45000);
});
