import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { startAgent } from '../../src/commands/start/actions/agent-start';
import type { Character } from '@elizaos/core';

describe('Database Migration during Agent Start', () => {
  let server: any;
  let runtime: any;

  beforeAll(async () => {
    // Dynamically import AgentServer
    const { default: AgentServer } = (await import('@elizaos/server')) as any;
    
    // Create a test server instance
    server = new AgentServer();
    await server.initialize();
  });

  afterAll(async () => {
    // Clean up
    if (runtime) {
      await runtime.close();
    }
    if (server) {
      await server.stop();
    }
  });

  it('should create vector columns during agent start', async () => {
    // Create a minimal test character
    const character: Character = {
      name: 'MigrationTestAgent',
      bio: ['Test agent for migration'],
      system: 'You are a test agent',
      messageExamples: [],
      postExamples: [],
      topics: [],
      knowledge: [],
      plugins: ['sql']
    };

    // Import SQL plugin
    const sqlPlugin = await import('@elizaos/plugin-sql');

    // Start the agent - this should trigger our migration
    runtime = await startAgent(
      character,
      server,
      undefined,
      [sqlPlugin.plugin],
      { isTestMode: true }
    );

    expect(runtime).toBeDefined();
    expect(runtime.agentId).toBeDefined();

    // Get the database adapter
    const adapter = (runtime as any).databaseAdapter || (runtime as any).adapter;
    expect(adapter).toBeDefined();

    // If we have a database adapter with query capability, check the columns
    if (adapter && adapter.manager && adapter.manager.query) {
      const result = await adapter.manager.query(`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'memories' 
        AND column_name LIKE 'dim_%'
        ORDER BY column_name
      `);

      // We should have all 6 vector columns
      const expectedColumns = ['dim_384', 'dim_512', 'dim_768', 'dim_1024', 'dim_1536', 'dim_3072'];
      const foundColumns = result.map((r: any) => r.column_name);

      expect(foundColumns).toHaveLength(6);
      expect(foundColumns).toEqual(expect.arrayContaining(expectedColumns));
    }
  }, 30000); // 30 second timeout for this test
}); 